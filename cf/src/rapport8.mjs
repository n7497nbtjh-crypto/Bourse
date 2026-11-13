// Rapport de la semaine, version 8 (6/11 soir, maquette docs/maquettes/rapport-semaine-v6.html validée par Romain).
// Ajoute au rapport calculé par faitsSynthese (cf/src/synthese.mjs) :
//   rivales     chaque entreprise face à ses rivales sur la même semaine, leurs nouvelles, et un verdict calculé (jamais écrit par l'IA)
//   monde       les sujets de la semaine choisis par l'IA du site parmi les titres de médias reconnus (cf/site/data/actu/monde.json),
//               avec nos chiffres (secteurs, indices) et les valeurs du lecteur concernées
//   radio       la radiographie : l'argent du lecteur, ETF ouverts ligne par ligne, rangé selon ces sujets (et les États-Unis)
//   dca         les achats programmés du portefeuille : l'achat de la semaine, le prochain, le prix moyen relevé
// Tout est calculé à partir des données du site ; l'IA ne fait que choisir et résumer des titres de presse, et chaque sujet cite ses titres.
import { variationSemaine, lundiDe, SECTEURS } from "./synthese.mjs";
import { iaJSON, frCorrige } from "./iasite.mjs";
import { CONSIGNES } from "./consignes.mjs";
import { fold, mondeDe, r0, r1, med, univers, addJ } from "./monde.mjs";
export { motsTitre, choisirTitres, mondeDe } from "./monde.mjs";


// Suppositions retirées des textes de l'IA (6/11, premiers textes en ligne : « cela pourrait refléter une confiance accrue », « ont pu influencer le secteur »)
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
    // 7/11 soir (Romain : « l'analyse n'apporte aucune plus-value, que des chiffres facilement vérifiables ») : ce que seul le site peut calculer.
    // Réaction de la Bourse le jour de la publication (clôture du jour face à la veille), face à ses rivales le même jour,
    // et croissance des ventes du dernier exercice face à celle de ses rivales (comptes officiels, data/actu_semaine.mjs).
    const pub = (n.annonces || []).filter(a => a.k === l.k && a.origine !== "presse" && a.categorie === "resultats").map(a => a.date).sort()[0];
    const D = (d.cs && d.cs.dates) || [], jour = (k, j) => { const s = d.cs && d.cs.items && d.cs.items[k]; if (!s || !j) return null; const i = D.findIndex(x => x >= j); return i > 0 && s[i] > 0 && s[i - 1] > 0 ? { v: r1((s[i] / s[i - 1] - 1) * 100), date: D[i] } : null; };
    const rj = pub ? jour(l.k, pub) : null;
    if (rj) { const rv = ids.map(id => jour("c:" + id, pub)).filter(Boolean).map(x => x.v); out[l.k].reaction = { date: rj.date, v: rj.v, med: rv.length >= 2 ? r1(med(rv)) : null, n: rv.length }; }
    const CC = d.actuSem && d.actuSem.comptes, cr = id => { const c = CC && CC[id]; return c && c[2] > 0 && c[3] > 0 ? (c[2] / c[3] - 1) * 100 : null; };
    const moi = cr(l.k.slice(2)), autres = ids.map(cr).filter(v => v != null);
    if (moi != null && autres.length >= 2) out[l.k].croissance = { v: r1(moi), med: r1(med(autres)), n: autres.length, exercice: CC[l.k.slice(2)][0] };
    // 7/11 nuit (Romain : « mettre en avant pourquoi les entreprises ont baissé ou augmenté ») : la semaine jour par jour,
    // face à son indice et à la médiane de ses rivales le même jour. Calculé, sans IA.
    const pas = (k, i) => { const s = d.cs && d.cs.items && d.cs.items[k]; return s && s[i] > 0 && s[i - 1] > 0 ? (s[i] / s[i - 1] - 1) * 100 : null; };
    const jours = D.map((j, i) => i).filter(i => i > 0 && D[i] >= lundi && D[i] <= auj).map(i => {
      const v = pas(l.k, i); if (v == null) return null;
      const rv = ids.map(id => pas("c:" + id, i)).filter(x => x != null), ind = l.indice ? pas("i:" + l.indice.id, i) : null;
      return { date: D[i], v: r1(v), ind: ind == null ? null : r1(ind), riv: rv.length >= 2 ? r1(med(rv)) : null };
    }).filter(Boolean);
    if (jours.length >= 2) out[l.k].jours = jours;
    // Marge nette du dernier exercice (bénéfice net gardé sur 100 € de ventes), face à ses rivales
    const mg = id => { const c = CC && CC[id]; return c && c[2] > 0 && c[4] != null && isFinite(c[4]) ? c[4] / c[2] * 100 : null; };
    const mm = mg(l.k.slice(2)), ma = ids.map(mg).filter(v => v != null);
    if (mm != null && ma.length >= 2) out[l.k].marge = { v: r1(mm), med: r1(med(ma)), n: ma.length, exercice: CC[l.k.slice(2)][0] };
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

/* ---------- Le monde de la semaine ---------- */
/* 12/11 (Romain : « les actus sont trop peu pertinentes, tu n'as même pas mis l'actu de Huang ») : les titres envoyés à l'IA étaient les 100 plus récents,
   donc surtout la presse des dernières heures (journaux indiens, géopolitique), et jamais les grands sujets de la semaine.
   Ils sont maintenant choisis par importance : un titre compte d'autant plus que ses mots clés sont repris par beaucoup de médias différents.
   Au plus 7 titres par sujet et 10 par média, pour garder de la variété. Renvoie les titres du plus important au moins important. */


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
  // 7/11 (Romain : « pas ultra pertinent ») : un sujet qui touche moins de 5 % du portefeuille n'a pas sa carte, il est seulement cité
  const tous = out.filter(Boolean), forts = tous.filter(x => x.pct >= 5), faibles = tous.filter(x => x.pct < 5).map(x => ({ lab: x.lab, pct: x.pct }));
  // 7/11 : lignes dont le site ne connaît pas le contenu (ETF sans composition, titre non suivi) : citées, jamais oubliées
  const non_comptes = L.filter(l => !l.k.startsWith("c:") && !compo[l.k]).map(l => ({ k: l.k, nom: l.nom, eur: r0(l.portefeuille.valeur_eur), pct: r1(l.portefeuille.valeur_eur / tot * 100) }));
  return { total_eur: r0(tot), seaux: forts.slice(0, 4), faibles, non_comptes, source: etfs.length ? { nom: "Composition officielle des indices (formulaires N-PORT de la SEC)", au: etfs.map(j => j.asOf).filter(Boolean).sort()[0] || null } : null };
}


/* ---------- 7/11 soir : le rapport s'adapte au portefeuille (Romain : « un peu court pour une personne qui n'a que des ETF ») ----------
   etf8 : profil (etf | actions | mixte), ce qui a fait bouger chaque ETF (entreprises du fonds × poids × montant), les entreprises où est
   vraiment l'argent (en direct + à travers les ETF), les métiers, les doublons, l'effet des devises, les frais des ETF, les dates à venir
   des entreprises tenues à travers les ETF et les dividendes des actions détenues. Tout est calculé : aucune IA, aucune prévision. */
const coMapper = d => {
  const strip = x => fold(x).replace(/\.com\b/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|sa|se|nv|ag|asa|ab|spa|the|holdings?|group|groupe|class [a-z]|cl [a-z]|adr|reg|shs|ord|common st(ock)?)\b/g, " ").replace(/\s+/g, " ").trim();
  const parNom = new Map(); for (const [k, nom] of Object.entries(d.names || {})) if (k.startsWith("c:")) { const t = strip(nom); if (t && !parNom.has(t)) parNom.set(t, k); }
  const parNomDe = nom => { const t = strip(nom); if (!t) return null; if (parNom.has(t)) return parNom.get(t); const w = t.split(" "); for (let i = w.length - 1; i >= 1; i--) { const x = w.slice(0, i).join(" "); if (x.length >= 4 && parNom.has(x)) return parNom.get(x); } return null; };
  return (isin, nom) => (d.parIsin || {})[isin] || (nom ? parNomDe(nom) : null);
};
// Contenu d'un ETF : son propre fonds témoin (N-PORT), sinon celui d'un autre ETF qui suit le même indice (dit dans « source »)
async function compoDe(d, k) {
  const m = d.etf[k] || {}; let px = m.proxy, via = null;
  if (!px && m.index) for (const [k2, m2] of Object.entries(d.etf)) if (m2 && m2.proxy && m2.index === m.index) { px = m2.proxy; via = m.index; break; }
  if (!px || !d.charger) return null;
  const j = await d.charger(`/data/etf/${px}.json`); return j && Array.isArray(j.isins) ? { j, via } : null;
}
const DIV_RE = /\(([\d\s.,]+)\s*(\$|€|£|NOK|SEK|DKK|CHF|CAD|AUD|JPY|GBp|HKD)\)/;
const DEV_SYM = { "$": "USD", "€": "EUR", "£": "GBP" };
export async function transparenceDe(d, n, lundi, auj) {
  const L = (n.lignes || []).filter(l => l.portefeuille && l.portefeuille.valeur_eur > 0), tot = L.reduce((a, l) => a + l.portefeuille.valeur_eur, 0);
  if (!tot) return null;
  const etfL = L.filter(l => l.k.startsWith("e:")), coL = L.filter(l => l.k.startsWith("c:")), partEtf = etfL.reduce((a, l) => a + l.portefeuille.valeur_eur, 0) / tot;
  const profil = partEtf >= 0.8 ? "etf" : partEtf <= 0.2 ? "actions" : "mixte";
  // Taux de change : dernier taux connu avant la semaine et le dernier de la semaine (BCE, data/cours_fetch.mjs → fx-semaine.json)
  const fxS = d.charger ? await d.charger("/data/fx-semaine.json") : null;
  const tauxAu = (cur, j) => { const s = fxS && fxS.taux && fxS.taux[cur], D = (fxS && fxS.dates) || []; let r = null; if (!s) return null; for (let i = 0; i < D.length; i++) if (D[i] <= j && s[i] > 0) r = s[i]; return r; };
  const fxVar = cur => { if (!cur || cur === "EUR") return 0; const a = tauxAu(cur, addJ(lundi, -1)), b = tauxAu(cur, auj); return a && b ? a / b - 1 : 0; }; // + : la devise a pris de la valeur face à l'euro
  const vSem = k => { const v = variationSemaine(d.cs, k, lundi, auj, d.px[k], d.sem); if (!v) return null; const cur = d.px[k] && d.px[k].cur; return { v: v.pct, ve: ((1 + v.pct / 100) * (1 + fxVar(cur)) - 1) * 100 }; };
  const coDe = coMapper(d), expo = new Map(), sect = {}, par_etf = [];
  const ajoute = (k, champ, eur, contrib) => { const x = expo.get(k) || { k, nom: d.names[k], direct: 0, via: 0, contrib: 0, etfs: [] }; x[champ] += eur; if (contrib != null) x.contrib += contrib; expo.set(k, x); return x; };
  for (const l of coL) { const s = vSem(l.k); ajoute(l.k, "direct", l.portefeuille.valeur_eur, l.portefeuille.var_eur != null ? l.portefeuille.var_eur : null); }
  let usEur = coL.filter(l => (d.meta[l.k] || {}).region === "US").reduce((a, l) => a + l.portefeuille.valeur_eur, 0), sansCompo = [];
  for (const l of etfL) {
    const val = l.portefeuille.valeur_eur, c = await compoDe(d, l.k);
    if (!c) { sansCompo.push({ k: l.k, nom: l.nom, eur: r0(val) }); continue; }
    const noms = {}; (c.j.top || []).forEach(h => { if (h.isin) noms[h.isin] = h.name; });
    let couvert = 0; const rows = [];
    for (const [isin, w, nom] of c.j.isins) {
      const k = coDe(isin, nom || noms[isin]); if (!k || !(w > 0)) continue;
      const s = vSem(k), eur = val * w / 100, contrib = s ? eur * s.ve / 100 : null;
      const x = ajoute(k, "via", eur, contrib); if (!x.etfs.includes(l.k)) x.etfs.push(l.k);
      if (s) { couvert += w; rows.push({ k, nom: d.names[k], poids: Math.round(w * 100) / 100, v: r1(s.v), ve: r1(s.ve), eur: r1(contrib) }); }
      const sec = (d.meta[k] || {}).sector; if (sec && contrib != null) sect[sec] = (sect[sec] || 0) + contrib;
    }
    usEur += val * (((c.j.countries || []).find(x => x[0] === "US") || [0, 0])[1] / 100);
    rows.sort((a, b) => a.eur - b.eur);
    const m = d.etf[l.k] || {};
    par_etf.push({ k: l.k, nom: l.nom, eur: r0(val), v: l.variation_semaine_pct, var_eur: l.portefeuille.var_eur, couvert_pct: r0(couvert), n: c.j.lines || c.j.isins.length, index: m.index || null, via_indice: c.via, au: c.j.asOf || null,
      baisse: rows.filter(r => r.eur < 0).slice(0, 3), hausse: rows.filter(r => r.eur > 0).slice(-3).reverse(), ter: m.ter != null ? m.ter : null });
  }
  for (const l of coL) { const sec = (d.meta[l.k] || {}).sector; if (sec && l.portefeuille.var_eur != null) sect[sec] = (sect[sec] || 0) + l.portefeuille.var_eur; }
  const ent = [...expo.values()].map(x => { const s = vSem(x.k); return { k: x.k, nom: x.nom, eur: r0(x.direct + x.via), direct: r0(x.direct), via: r0(x.via), pct: r1((x.direct + x.via) / tot * 100), v: s ? r1(s.ve) : null, v_devise: s ? r1(s.v) : null, contrib: s ? r1(x.contrib) : null, etfs: x.etfs }; })
    .sort((a, b) => b.eur - a.eur);
  const top = ent.slice(0, 10);
  // Doublons : la même entreprise en direct et dans un ETF (au moins 5 € par les ETF) ; deux ETF qui suivent le même indice
  const doublons = ent.filter(x => x.direct > 0 && x.via >= 5).slice(0, 5).map(x => ({ k: x.k, nom: x.nom, direct: x.direct, via: x.via, eur: x.eur, pct: x.pct, etfs: x.etfs.map(k => d.names[k]) }));
  const parIndice = {}; for (const l of etfL) { const ix = (d.etf[l.k] || {}).index; if (ix) (parIndice[ix] = parIndice[ix] || []).push(l); }
  const memes = Object.entries(parIndice).filter(([, a]) => a.length > 1).map(([ix, a]) => ({ index: ix, etfs: a.map(l => ({ k: l.k, nom: l.nom, eur: r0(l.portefeuille.valeur_eur) })), eur: r0(a.reduce((s, l) => s + l.portefeuille.valeur_eur, 0)) }));
  // Devise : la part en dollars (actions américaines en direct et part américaine des ETF)
  const vUsd = fxVar("USD"), dev = usEur >= 50 && fxS ? { us_eur: r0(usEur), us_pct: r1(usEur / tot * 100), usd_pct: Math.round(vUsd * 10000) / 100, effet_eur: r1(usEur * vUsd),
    taux_debut: tauxAu("USD", addJ(lundi, -1)), taux_fin: tauxAu("USD", auj), date_debut: (fxS.dates || []).filter(j => j <= addJ(lundi, -1)).pop() || null, date_fin: (fxS.dates || []).filter(j => j <= auj).pop() || null } : null;
  // Frais courants des ETF, en euros
  const frais = etfL.filter(l => (d.etf[l.k] || {}).ter != null).map(l => ({ k: l.k, nom: l.nom, ter: d.etf[l.k].ter, an: r1(l.portefeuille.valeur_eur * d.etf[l.k].ter / 100) }));
  const fraisAn = frais.reduce((a, f) => a + f.an, 0);
  // Dates à venir des entreprises tenues à travers les ETF (au moins 50 €), 14 jours ; dates habituelles marquées « à confirmer »
  const dejà = new Set((n.a_venir || []).map(e => e.k)), fin = addJ(auj, 14), cibles = new Map(ent.filter(x => x.eur >= 50 && !dejà.has(x.k)).map(x => [x.k.slice(2), x]));
  const hab = d.charger ? await d.charger("/data/agenda-habituel-proche.json") : null; // copie courte (data/agenda_habituel.mjs)
  const evs = [...(d.ev || []).map(e => ({ ...e, estime: !!e.estime })), ...((hab && hab.events) || []).map(e => ({ ...e, estime: true }))]
    .filter(e => e && cibles.has(e.id) && e.date > auj && e.date <= fin && /r[ée]sultat/i.test(e.type || e.label || ""));
  const vusEv = new Set(), a_venir = [];
  for (const e of evs.sort((a, b) => a.estime - b.estime || a.date.localeCompare(b.date))) { if (vusEv.has(e.id)) continue; vusEv.add(e.id); const x = cibles.get(e.id);
    a_venir.push({ k: x.k, nom: x.nom, date: e.date, eur: x.eur, via: x.via, estime: e.estime, label: e.estime ? "Résultats, date habituelle à confirmer" : (e.label || "Résultats") }); }
  a_venir.sort((a, b) => a.date.localeCompare(b.date));
  // Dividendes des actions détenues en direct : détachés cette semaine ou dans les 30 jours (calendriers du site), montant pour la quantité détenue
  const divs = [];
  for (const e of (d.div || [])) {
    const k = "c:" + e.id, l = coL.find(x => x.k === k); if (!l || !e.date || e.date < lundi || e.date > addJ(auj, 30)) continue;
    const m = String(e.label || "").match(DIV_RE), q = l.portefeuille.q;
    let eur = null, mt = null, cur = null;
    if (m) { mt = parseFloat(m[1].replace(/\s/g, "").replace(",", ".")); cur = DEV_SYM[m[2]] || m[2]; const f = cur === "EUR" ? 1 : (d.fx || {})[cur]; if (q > 0 && mt > 0 && f > 0) eur = r1(q * mt * f); }
    const paie = /paiement|versement|pay/i.test(e.label || ""), meme = divs.find(x => x.k === k && x.montant === mt && Math.abs(Date.parse(x.date || x.paiement) - Date.parse(e.date)) < 40 * 864e5);
    if (meme) { if (paie) meme.paiement = e.date; else { meme.date = e.date; meme.passe = e.date <= auj; } continue; } // détachement et paiement du même dividende : une seule ligne
    divs.push({ k, nom: l.nom, date: paie ? null : e.date, paiement: paie ? e.date : null, passe: !paie && e.date <= auj, montant: mt, devise: cur, q: q || null, eur, source: e.source || null });
  }
  divs.sort((a, b) => String(a.date || a.paiement).localeCompare(b.date || b.paiement));
  const SEC = Object.entries(sect).map(([s, e]) => ({ id: s, nom: SECTEURS[s] || s, eur: r0(e) })).filter(x => Math.abs(x.eur) >= 2).sort((a, b) => a.eur - b.eur);
  return { profil, part_etf_pct: r0(partEtf * 100), total_eur: r0(tot), par_etf, sans_compo: sansCompo, entreprises: top, top_eur: r0(top.reduce((a, x) => a + x.eur, 0)), top_pct: r1(top.reduce((a, x) => a + x.eur, 0) / tot * 100),
    metiers: SEC, doublons, memes_indices: memes, devise: dev, frais: frais.length ? { an: r1(fraisAn), semaine: Math.round(fraisAn / 52 * 100) / 100, lignes: frais } : null, a_venir: a_venir.slice(0, 8), dividendes: divs.slice(0, 8),
    source: par_etf.length ? "Positions publiées des fonds (SEC, formulaire N-PORT)" : null };
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
  // 7/11 nuit (Romain : « les dates des prochaines annonces des entreprises suivies, même plus loin que la semaine prochaine ») :
  // pour chaque entreprise suivie sans rendez-vous dans les deux semaines, sa prochaine publication (date annoncée, sinon date habituelle à confirmer)
  try { const deja = new Set((n.a_venir || []).map(e => e.k)), hab = d.charger ? await d.charger("/data/agenda-habituel-proche.json") : null, plus = [];
    for (const l of (n.lignes || []).filter(l => l.k.startsWith("c:") && !deja.has(l.k))) { const id = l.k.slice(2);
      const e = (d.ev || []).filter(x => x && x.id === id && /sultat/i.test(x.type || "") && x.date > auj).sort((a, b) => a.date.localeCompare(b.date))[0];
      if (e) plus.push({ k: l.k, id, nom: l.nom, date: e.date, type: "Résultats", label: e.label || "Publication des résultats", categorie: "resultats", source: e.source || null, lien: "/entreprise/" + id + "/agenda" });
      else { const h = ((hab && hab.events) || []).find(x => x.id === id && x.date > auj); if (h) plus.push({ k: l.k, id, nom: l.nom, date: h.date, type: "Résultats", label: "Résultats, date habituelle à confirmer", categorie: "resultats", estime: true, lien: "/entreprise/" + id + "/agenda" }); } }
    // 8/11 (Romain : « toutes les dates qui concernent le portefeuille ») : aussi dividendes et assemblées des six prochains mois, deux par entreprise au plus
    const vus = new Set([...(n.a_venir || []), ...plus].map(e => e.k + "|" + e.date)), loin = addJ(auj, 183);
    for (const l of (n.lignes || []).filter(l => l.k.startsWith("c:"))) { const id = l.k.slice(2);
      (d.ev || []).filter(x => x && x.id === id && x.date > auj && x.date <= loin && !/sultat/i.test((x.type || "") + (x.label || "")) && !vus.has(l.k + "|" + x.date))
        .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2)
        .forEach(x => { vus.add(l.k + "|" + x.date); plus.push({ k: l.k, id, nom: l.nom, date: x.date, type: x.type || "Annonce", label: x.label || x.type || "Annonce", categorie: /ividende/i.test(x.type || "") ? "dividendes" : "autre", source: x.source || null, lien: "/entreprise/" + id + "/agenda" }); }); }
    n.a_venir = [...(n.a_venir || []), ...plus].sort((a, b) => a.date.localeCompare(b.date)); } catch (e) { }
  try { n.etf8 = await transparenceDe(d, n, lundi, auj); } catch (e) { n.etf8 = null; if (globalThis.process && process.env.R8_DEBUG) console.log("etf8", e); }
  // Les plus grosses entreprises tenues à travers les ETF passent aussi face à leurs rivales (sinon un portefeuille d'ETF n'a pas cette partie)
  try { if (n.etf8 && n.etf8.profil !== "actions") { const deja = new Set((n.lignes || []).map(l => l.k));
    const vues = n.etf8.entreprises.filter(x => !deja.has(x.k) && x.via > 0 && x.v != null).slice(0, 3).map(x => ({ k: x.k, nom: x.nom, variation_semaine_pct: x.v_devise != null ? x.v_devise : x.v, via_eur: x.via }));
    if (vues.length) { Object.assign(n.rivales = n.rivales || {}, await rivalesDe(d, { lignes: vues, annonces: [] }, lundi, auj)); n.etf8.vues = vues; } } } catch (e) { }
  return n;
}

/* ---------- Les faits donnés à l'IA pour chaque entreprise ----------
   7/11 nuit (Romain : « que ça consomme le moins possible ») : le « pourquoi elle a bougé » (rivales, indice, jours, réaction, ventes, marge)
   est calculé par la page sans IA. L'IA ne reçoit plus que l'annonce officielle, les titres de presse et les derniers comptes, pour dire
   ce que l'annonce contient et ce qu'elle change : trois fois moins de texte envoyé, et des faits identiques pour tous les comptes
   (un seul texte par entreprise et par semaine, servi par la table ia_syn). */
export async function faitsEntreprise(d, n, l, A) {
  const C = d.actuSem && d.actuSem.comptes && d.actuSem.comptes[l.k.slice(2)]; // [an, devise, ventes, ventes an-1, bénéfice] (data/actu_semaine.mjs)
  const comptes = C ? { exercice: C[0], devise: C[1], ventes_millions: C[2], croissance_ventes_pct: C[3] > 0 ? r1((C[2] / C[3] - 1) * 100) : null, benefice_net_millions: C[4] } : null;
  return {
    entreprise: l.nom, secteur: (SECTEURS[(d.meta[l.k] || {}).sector] || null),
    annonces: A.filter(a => a.origine !== "presse" && !["rachat", "capital"].includes(a.categorie)).map(a => ({ type: a.categorie_label || a.type || "", titre: a.titre || "", date: a.date, chiffres: a.chiffres || [], lecture: a.lecture || [] })).slice(0, 4),
    presse: A.filter(a => a.origine === "presse").map(a => ({ titre: a.titre || "", media: a.site || "", date: a.date })).slice(0, 3),
    derniers_comptes_annuels: comptes,
  };
}
