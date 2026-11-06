// Rapport de la semaine, version 8 (6/11 soir, maquette docs/maquettes/rapport-semaine-v6.html validée par Romain).
// Ajoute au rapport calculé par faitsSynthese (cf/src/synthese.mjs) :
//   rivales     chaque entreprise face à ses rivales sur la même semaine, leurs nouvelles, et un verdict calculé (jamais écrit par l'IA)
//   monde       les sujets de la semaine choisis par l'IA du site parmi les titres de médias reconnus (cf/site/data/actu/monde.json),
//               avec nos chiffres (secteurs, indices) et les valeurs du lecteur concernées
//   radio       la radiographie : l'argent du lecteur, ETF ouverts ligne par ligne, rangé selon ces sujets (et les États-Unis)
//   dca         les achats programmés du portefeuille : l'achat de la semaine, le prochain, le prix moyen relevé
// Tout est calculé à partir des données du site ; l'IA ne fait que choisir et résumer des titres de presse, et chaque sujet cite ses titres.
import { variationSemaine, lundiDe, SECTEURS } from "./synthese.mjs";
import { iaJSON } from "./iasite.mjs";
import { CONSIGNES } from "./consignes.mjs";

const r1 = v => Math.round(v * 10) / 10, r0 = v => Math.round(v);
const addJ = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const med = a => { const p = a.slice().sort((x, y) => x - y), m = p.length >> 1; return p.length ? (p.length % 2 ? p[m] : (p[m - 1] + p[m]) / 2) : null; };
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const INDICE_PAYS = { US: ["sp500", "S&P 500"], FR: ["cac40", "CAC 40"], DE: ["dax", "DAX"], GB: ["ftse100", "FTSE 100"], JP: ["nikkei", "Nikkei 225"] };
const PAYS = { US: "États-Unis", FR: "France", DE: "Allemagne", GB: "Royaume-Uni", JP: "Japon", CN: "Chine", CH: "Suisse", NL: "Pays-Bas", IT: "Italie", ES: "Espagne", CA: "Canada", TW: "Taïwan", KR: "Corée du Sud", IN: "Inde" };
// Nouvelles des rivales retenues : ce qui change l'entreprise, pas ses opérations courantes (rachats d'actions, droits de vote)
const RIV_CAT = new Set(["resultats", "rapport", "operation", "contrat", "dirigeants", "dividende", "opa"]);
const FAIT = /\b(sign|accord|agreement|contrat|contract|acqui|rach[eè]te|lance|launch|vend|sells?|stake|participation|nomm|appoint|usine|plant|merger|fusion)/i;
const OPIN = /\?|recommand|conseil|aktie|should you|buy|sell |kaufen|could|top \d|meilleures? actions|stock (is|to)|why .* stock/i;

/* ---------- Rivales ---------- */
export async function rivalesDe(d, n, lundi, auj) {
  const out = {}, lignes = (n.lignes || []).filter(l => l.k.startsWith("c:")).slice(0, 14);
  const parCo = {};
  for (const l of lignes) {
    const ids = ((d.conc || {})[l.k.slice(2)] || []).filter(id => d.names["c:" + id]).slice(0, 5);
    if (!ids.length) continue;
    const liste = ids.map(id => { const k = "c:" + id, v = variationSemaine(d.cs, k, lundi, auj, d.px[k], d.sem); return { k, nom: d.names[k], v: v ? v.pct : null }; });
    const vs = liste.map(x => x.v).filter(v => v != null);
    parCo[l.k] = ids;
    out[l.k] = { liste, med: vs.length ? r1(med(vs)) : null, min: vs.length ? Math.min(...vs) : null, max: vs.length ? Math.max(...vs) : null, nouvelles: [] };
    const own = l.variation_semaine_pct, res = (n.annonces || []).some(a => a.k === l.k && a.origine !== "presse" && a.categorie === "resultats");
    out[l.k].verdict = res ? "resultats" : own == null || vs.length < 2 ? null : own - out[l.k].med > 2 ? "mieux" : own - out[l.k].med < -2 ? "moins" : "suit";
  }
  // Nouvelles des rivales : un seul fichier pour toutes les entreprises (data/actu_semaine.mjs, construit avec le site).
  // Avant : un fichier par rivale, et Cloudflare limite les lectures par appel (le rapport perdait ensuite l'IA et la radiographie).
  const S = (d.actuSem && d.actuSem.items) || {};
  const dans = x => { const j = String(x || "").slice(0, 10); return j >= lundi && j <= addJ(lundi, 6); };
  for (const [k, ids] of Object.entries(parCo)) {
    const off = [], pr = [];
    for (const id of ids) for (const a of S[id] || []) {
      if (!a || !dans(a.d) || !/^https:\/\//.test(a.u || "")) continue;
      if (a.p) { if (FAIT.test(a.t || "") && !OPIN.test(a.t || "")) pr.push({ k: "c:" + id, nom: d.names["c:" + id], date: a.d, categorie: "presse", titre: a.t, chiffres: [], source: a.u, site: a.s || null, origine: "presse" }); }
      else if (RIV_CAT.has(a.c)) off.push({ k: "c:" + id, nom: d.names["c:" + id], date: a.d, categorie: a.c, titre: a.t || "", chiffres: Array.isArray(a.f) ? a.f : [], source: a.u, origine: "officiel" });
    }
    off.sort((a, b) => (b.chiffres.length - a.chiffres.length) || ((b.categorie === "resultats") - (a.categorie === "resultats")) || b.date.localeCompare(a.date));
    const vus = new Set(), choix = [];
    for (const a of [...off, ...pr]) { if (vus.has(a.k) || choix.length >= 2) continue; vus.add(a.k); choix.push(a); }
    out[k].nouvelles = choix;
  }
  return out;
}

/* ---------- Variations de tout l'univers (secteurs, grandes entreprises) ---------- */
function univers(d, lundi, auj) {
  const parSec = {};
  for (const [k, m] of Object.entries(d.meta || {})) {
    if (!m || !m.sector || !d.names[k]) continue;
    const v = variationSemaine(d.cs, k, lundi, auj, d.px[k], d.sem); if (!v) continue;
    const p = d.px[k], cap = p && p.cap > 0 ? (p.cur === "EUR" || !p.cur ? p.cap : d.fx && d.fx[p.cur] > 0 ? p.cap * d.fx[p.cur] : 0) : 0; // capitalisation en euros, pour classer les plus grandes
    (parSec[m.sector] = parSec[m.sector] || []).push({ k, nom: d.names[k], v: v.pct, cap, region: m.region });
  }
  return parSec;
}

/* ---------- Le monde de la semaine ---------- */
export async function mondeDe(env, d, n, lundi, auj) {
  const fin = addJ(lundi, 6), items = ((d.monde && d.monde.items) || []).filter(x => x && x.d && x.d.slice(0, 10) >= addJ(lundi, -2) && x.d.slice(0, 10) <= fin && x.t && x.u);
  if (items.length < 4) return null;
  const T = items.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 140);
  const parSec = univers(d, lundi, auj), secteurs = {};
  for (const [s, L] of Object.entries(parSec)) secteurs[s] = { nom: SECTEURS[s] || s, mediane_pct: r1(med(L.map(x => x.v))), n: L.length };
  const faits = { semaine_du: lundi, au: fin, indices: (n.indices || []).map(i => ({ id: i.id, nom: i.nom, variation_pct: i.pct })), secteurs,
    titres: T.map((x, i) => ({ i, date: x.d.slice(0, 10), media: x.s, titre: x.t })) };
  const valide = o => {
    if (!o || !Array.isArray(o.sujets)) return null;
    const S = o.sujets.slice(0, 3).map(s => ({
      titre: String(s.titre || "").replace(/—/g, ",").slice(0, 100), theme: String(s.theme || "").slice(0, 50), fait: String(s.fait || "").replace(/—/g, ",").slice(0, 360),
      titres: [...new Set((Array.isArray(s.titres) ? s.titres : []).map(Number).filter(i => Number.isInteger(i) && T[i]))].slice(0, 3),
      secteurs: (Array.isArray(s.secteurs) ? s.secteurs : []).filter(x => x in secteurs).slice(0, 3),
      pays: (Array.isArray(s.pays) ? s.pays : []).map(x => String(x).toUpperCase()).filter(x => /^[A-Z]{2}$/.test(x)).slice(0, 3) }))
      .filter(s => s.titre.length > 8 && s.fait.length > 30 && s.titres.length >= 1);
    return S.length ? { sujets: S } : null;
  };
  const r = await iaJSON(env, "monde|" + lundi + "|" + auj, CONSIGNES.semaine_monde, faits, 900, valide).catch(() => null);
  if (!r) return null;
  // Nos chiffres pour chaque sujet : médiane du secteur, ses plus grandes entreprises, l'indice du pays ; les valeurs du lecteur concernées
  const ctx = (d.contexte && d.contexte.sujets) || [];
  const sujets = r.sujets.map(s => {
    const chiffres = [];
    for (const sk of s.secteurs) { const L = parSec[sk] || []; if (!L.length) continue;
      chiffres.push({ lab: `${SECTEURS[sk] || sk} : médiane de ${L.length} entreprises`, v: r1(med(L.map(x => x.v))) });
      L.filter(x => x.cap > 0).sort((a, b) => b.cap - a.cap).slice(0, s.secteurs.length > 1 ? 2 : 3).forEach(x => chiffres.push({ lab: x.nom, k: x.k, v: x.v })); } // sans capitalisation connue : la médiane seule
    for (const p of s.pays) { const ix = INDICE_PAYS[p], v = ix && variationSemaine(d.cs, "i:" + ix[0], lundi, auj, d.px["i:" + ix[0]], d.sem); if (v) chiffres.push({ lab: ix[1], v: v.pct }); }
    const touche = (n.lignes || []).filter(l => { const m = d.meta[l.k]; return m && (s.secteurs.includes(m.sector) || s.pays.includes(m.region)); })
      .map(l => ({ k: l.k, nom: l.nom, v: l.variation_semaine_pct, eur: l.portefeuille && l.portefeuille.var_eur != null ? r0(l.portefeuille.var_eur) : null }));
    // dossier de fond du site (contexte.json) : au moins deux termes différents de son dossier dans le titre et le fait du sujet
    // (les mots des dossiers sont larges : « taux » seul rattachait la Banque d'Angleterre au dossier de la BCE)
    const txt = fold(s.titre + " " + s.fait);
    const fond = ctx.find(c => { try { return c.mots && new Set((txt.match(new RegExp(c.mots, "g")) || [])).size >= 2; } catch (e) { return false; } });
    return { ...s, titres: s.titres.map(i => ({ t: T[i].t, s: T[i].s, u: T[i].u, d: T[i].d.slice(0, 10) })), chiffres: chiffres.slice(0, 5), touche: touche.slice(0, 6),
      fond: fond ? { id: fond.id, titre: fond.titre, maj: fond.maj } : null };
  });
  return { sujets, modele: r.modele || null };
}

/* ---------- Radiographie : l'argent du lecteur, ETF ouverts, face aux sujets de la semaine ---------- */
export async function radioDe(d, n, monde) {
  const L = (n.lignes || []).filter(l => l.portefeuille && l.portefeuille.valeur_eur > 0), tot = L.reduce((a, l) => a + l.portefeuille.valeur_eur, 0);
  if (!tot) return null;
  const parIsin = d.parIsin || {}, compo = {};
  // Les entreprises américaines n'ont pas d'ISIN dans les données du site : reconnues par leur nom, comme dans la radiographie du navigateur (pf3ByName)
  const strip = x => fold(x).replace(/\.com\b/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|sa|se|nv|ag|asa|ab|spa|the|holdings?|group|groupe|class [a-z]|cl [a-z]|adr|reg|shs|ord|common st(ock)?)\b/g, " ").replace(/\s+/g, " ").trim();
  const parNom = new Map(); for (const [k, nom] of Object.entries(d.names || {})) if (k.startsWith("c:")) { const t = strip(nom); if (t && !parNom.has(t)) parNom.set(t, k); }
  const parNomDe = nom => { const t = strip(nom); if (!t) return null; if (parNom.has(t)) return parNom.get(t); const w = t.split(" "); for (let i = w.length - 1; i >= 1; i--) { const x = w.slice(0, i).join(" "); if (x.length >= 4 && parNom.has(x)) return parNom.get(x); } return null; };
  const coDe = (isin, nom) => parIsin[isin] || (nom ? parNomDe(nom) : null);
  for (const l of L) if (l.k.startsWith("e:")) { const px = d.etf[l.k] && d.etf[l.k].proxy; if (px && d.charger) { const j = await d.charger(`/data/etf/${px}.json`); if (j) compo[l.k] = j; } }
  const seau = (lab, testCo, pays, sujet) => {
    let eur = 0; const direct = [], viaEtf = [], ex = new Map();
    for (const l of L) {
      const v = l.portefeuille.valeur_eur;
      if (l.k.startsWith("c:")) { const m = d.meta[l.k]; if (m && testCo(m)) { eur += v; direct.push(l.nom); } continue; }
      const j = compo[l.k]; if (!j) continue;
      let part = 0;
      if (pays) part = ((j.countries || []).find(c => c[0] === pays) || [0, 0])[1] / 100;
      else { const noms = {}; (j.top || []).forEach(h => { if (h.isin) noms[h.isin] = h.name; });
        for (const [isin, w, nom] of j.isins || []) { const k = coDe(isin, nom || noms[isin]), m = k && d.meta[k]; if (m && testCo(m)) { part += w / 100; ex.set(k, (ex.get(k) || 0) + w); } } }
      if (part > 0) { eur += v * part; viaEtf.push({ nom: l.nom, eur: r0(v * part), au: j.asOf || null }); }
    }
    const exemples = [...ex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => d.names[k]);
    return eur >= 1 ? { lab, eur: r0(eur), pct: r1(eur / tot * 100), direct, via_etf: viaEtf, exemples, sujet } : null;
  };
  const out = [];
  for (const [i, s] of ((monde && monde.sujets) || []).entries()) {
    if (s.secteurs.length) out.push(seau(s.secteurs.map(x => SECTEURS[x] || x).join(", "), m => s.secteurs.includes(m.sector), null, i));
    else if (s.pays.length) out.push(seau(PAYS[s.pays[0]] || s.pays[0], m => m.region === s.pays[0], s.pays[0], i));
  }
  if (!out.some(x => x && /États-Unis/.test(x.lab))) out.push(seau("États-Unis", m => m.region === "US", "US", null));
  const etfs = Object.values(compo);
  return { total_eur: r0(tot), seaux: out.filter(Boolean).slice(0, 4), source: etfs.length ? { nom: "Composition officielle des indices (formulaires N-PORT de la SEC)", au: etfs.map(j => j.asOf).filter(Boolean).sort()[0] || null } : null };
}

/* ---------- Achats programmés ---------- */
export function dcaDe(d, pf, lundi, auj) {
  const P = pf && pf.cfg && Array.isArray(pf.cfg.prog) ? pf.cfg.prog : []; if (!P.length) return null;
  const fin = addJ(lundi, 6), dates = (d.cs && d.cs.dates) || [];
  const prixAu = (k, j) => { const s = d.cs && d.cs.items && d.cs.items[k]; if (!s) return null; let r = null; for (let i = 0; i < dates.length; i++) if (dates[i] <= j && s[i] != null) r = s[i]; return r; };
  const out = [];
  for (const pr of P.slice(0, 6)) {
    if (!pr || !d.names[pr.k] || !(+pr.q > 0) || !(pr.jour >= 1 && pr.jour <= 28)) continue;
    let date = null; for (let j = lundi; j <= fin && j <= auj; j = addJ(j, 1)) if (+j.slice(8) === +pr.jour && j >= (pr.depuis || "")) date = j;
    const ym = auj.slice(0, 7), nxt = (() => { let y = +ym.slice(0, 4), m = +ym.slice(5); const ce = `${ym}-${String(pr.jour).padStart(2, "0")}`; if (ce > auj) return ce; m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, "0")}-${String(pr.jour).padStart(2, "0")}`; })();
    const line = (pf.l || []).find(l => l.k === pr.k), ops = line && Array.isArray(line.o) ? line.o.filter(o => Array.isArray(o) && o[1] === "a" && o[6] === "p" && o[2] > 0 && o[3] > 0) : [];
    const qT = ops.reduce((a, o) => a + o[2], 0), pm = qT ? ops.reduce((a, o) => a + o[2] * o[3], 0) / qT : null;
    const px = d.px[pr.k], cur = (px && px.cur) || null;
    const x = { k: pr.k, nom: d.names[pr.k], q: +pr.q, jour: pr.jour, depuis: pr.depuis || null, prochain: nxt, devise: cur, cours: px && px.p > 0 ? px.p : null, n_achats: ops.length, prix_moyen: pm != null ? Math.round(pm * 100) / 100 : null };
    if (date) { const p = prixAu(pr.k, date), pa = prixAu(pr.k, addJ(date, -7)); x.date = date; x.prix = p; x.prix_avant = pa;
      if (p && pa) { x.montant = Math.round(p * x.q * 100) / 100; x.montant_avant = Math.round(pa * x.q * 100) / 100; } }
    out.push(x);
  }
  return out.length ? out : null;
}

/* ---------- Tout ensemble ---------- */
export async function enrichir8(env, d, n, pf, semaine, auj) {
  const lundi = lundiDe(semaine);
  try { n.rivales = await rivalesDe(d, n, lundi, auj); } catch (e) { n.rivales = {}; }
  try { n.monde = await mondeDe(env, d, n, lundi, auj); } catch (e) { n.monde = null; }
  try { n.radio = await radioDe(d, n, n.monde); } catch (e) { n.radio = null; }
  try { n.dca = dcaDe(d, pf, lundi, auj); } catch (e) { n.dca = null; }
  return n;
}

/* ---------- Les faits donnés à l'IA pour chaque entreprise (6/11 soir : « une interprétation plus pertinente ») ---------- */
export async function faitsEntreprise(d, n, l, A) {
  const R = (n.rivales || {})[l.k] || null;
  const C = d.actuSem && d.actuSem.comptes && d.actuSem.comptes[l.k.slice(2)]; // [an, devise, ventes, ventes an-1, bénéfice] (data/actu_semaine.mjs)
  const comptes = C ? { exercice: C[0], devise: C[1], ventes_millions: C[2], croissance_ventes_pct: C[3] > 0 ? r1((C[2] / C[3] - 1) * 100) : null, benefice_net_millions: C[4] } : null;
  const monde = ((n.monde && n.monde.sujets) || []).filter(s => s.touche.some(t => t.k === l.k)).map(s => ({ sujet: s.titre, fait: s.fait }));
  return {
    entreprise: l.nom, secteur: (SECTEURS[(d.meta[l.k] || {}).sector] || null), variation_semaine_pct: l.variation_semaine_pct,
    indice: l.indice ? { nom: l.indice.nom, variation_pct: l.indice.pct } : null,
    verdict_calcule: R ? ({ suit: "suit son secteur", mieux: "mieux que ses rivales", moins: "moins bien que ses rivales", resultats: "résultats publiés" })[R.verdict] || null : null,
    rivales: R ? R.liste.filter(x => x.v != null).map(x => ({ nom: x.nom, variation_semaine_pct: x.v })) : [],
    nouvelles_des_rivales: R ? R.nouvelles.map(a => ({ entreprise: a.nom, type: a.origine === "presse" ? "titre de presse" : a.categorie, titre: a.titre, chiffres: a.chiffres })) : [],
    annonces: A.filter(a => a.origine !== "presse").map(a => ({ type: a.categorie_label || a.type || "", titre: a.titre || "", date: a.date, chiffres: a.chiffres || [], lecture: a.lecture || [] })).slice(0, 6),
    operations_courantes: A.filter(a => a.origine !== "presse" && (a.categorie === "rachat" || a.categorie === "capital")).length,
    presse: A.filter(a => a.origine === "presse").map(a => ({ titre: a.titre || "", media: a.site || "", date: a.date })).slice(0, 5),
    derniers_comptes_annuels: comptes, sujets_du_monde_qui_la_touchent: monde,
  };
}
