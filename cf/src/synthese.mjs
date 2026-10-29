// « Votre semaine en 2 minutes » : les faits de la semaine pour ce qu'une personne suit (favoris et portefeuille).
// Tout est calculé ici à partir des données du site (cours de clôture relevés chaque matin, annonces officielles,
// agenda, ETF). Le modèle de langage ne fait ensuite que rédiger un commentaire à partir de ces faits (espace.mjs).
// Module sans dépendance : utilisé par le Worker (espace.mjs) et par le robot des données (data/cours_fetch.mjs).

const JOUR = 864e5;
export const SYN_VERSION = 2;
const KEY = /^[ce]:[a-z0-9-]{1,60}$/;
const r2 = v => Math.round(v * 100) / 100;
const num = v => typeof v === "number" && isFinite(v) ? v : (typeof v === "string" && v.trim() !== "" && isFinite(+v) ? +v : null);
const NF = (v, d = 1) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const sgnP = (v, d = 1) => { const r = Math.round(v * 10 ** d) / 10 ** d; return (r > 0 ? "+" : r < 0 ? "−" : "") + NF(Math.abs(r), d) + " %"; };
const eurS = v => (v > 0 ? "+" : v < 0 ? "−" : "") + new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.abs(Math.round(v))) + " €";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const dateLongue = ymd => { const d = new Date(ymd + "T12:00:00Z"); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()}${d.getUTCDate() === 1 ? "er" : ""} ${MOIS[d.getUTCMonth()]}`; };

/* ---------- Dates ---------- */
export const addJ = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * JOUR).toISOString().slice(0, 10);
const jsem = ymd => new Date(ymd + "T12:00:00Z").getUTCDay();
const ouvre = ymd => { const w = jsem(ymd); return w >= 1 && w <= 5; };
export const seancePrecedente = ymd => { let d = addJ(ymd, -1); while (!ouvre(d)) d = addJ(d, -1); return d; };
/** Lundi d'une semaine ISO (« 2026-W44 » → « 2026-10-26 »). */
export function lundiDe(semaine) {
  const m = /^(\d{4})-W(\d{2})$/.exec(semaine || ""); if (!m) return null;
  const j4 = Date.UTC(+m[1], 0, 4), w = (new Date(j4).getUTCDay() + 6) % 7;
  return new Date(j4 - w * JOUR + (+m[2] - 1) * 7 * JOUR).toISOString().slice(0, 10);
}

/* ---------- Cours de clôture (fichier cf/site/data/cours-semaine.json, écrit par le robot des données) ---------- */
// hist : { "2026-10-29": { "c:lvmh": 612.4, … } } (copies prises chaque matin, donc clôture de la séance précédente).
export function clotures(hist, n = 15) {
  const parSeance = {};
  for (const d of Object.keys(hist || {}).sort()) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) parSeance[seancePrecedente(d)] = hist[d];
  const dates = Object.keys(parSeance).sort().slice(-n), keys = new Set();
  dates.forEach(d => Object.keys(parSeance[d] || {}).forEach(k => keys.add(k)));
  const items = {};
  for (const k of keys) {
    const s = dates.map(d => { const v = (parSeance[d] || {})[k]; return typeof v === "number" && isFinite(v) && v > 0 ? Math.round(v * 1e4) / 1e4 : null; });
    if (s.some(v => v != null)) items[k] = s;
  }
  return { dates, items };
}

/** Variation sur la semaine ISO commençant le lundi `lundi` : de la dernière clôture avant lundi au dernier cours connu. */
export function variationSemaine(cs, k, lundi, auj, live, semPrec) {
  const fin = addJ(lundi, 6), s = cs && cs.items && cs.items[k], dates = (cs && cs.dates) || [];
  let pts = [], partiel = false;
  if (s) {
    let iRef = -1; for (let i = 0; i < dates.length; i++) if (dates[i] < lundi && s[i] != null) iRef = i;
    const dans = []; for (let i = 0; i < dates.length; i++) if (dates[i] >= lundi && dates[i] <= fin && s[i] != null) dans.push(i);
    if (iRef < 0 && dans.length) { iRef = dans.shift(); partiel = true; }
    if (iRef >= 0) pts = [[dates[iRef], s[iRef]], ...dans.map(i => [dates[i], s[i]])];
  }
  if (!pts.length && semPrec && num(semPrec.items && semPrec.items[k]) > 0) pts = [[semPrec.date || null, semPrec.items[k]]]; // ancien fichier semaine.json
  if (!pts.length) return null;
  if (live && num(live.p) > 0 && auj && auj >= lundi && auj <= fin) { // semaine en cours : on ajoute le cours du moment
    const seance = ouvre(auj) ? auj : seancePrecedente(auj), der = pts[pts.length - 1][0];
    if (!der || der < seance) pts.push([seance, live.p]);
  }
  if (pts.length < 2) return null;
  const a = pts[0][1], b = pts[pts.length - 1][1];
  if (!(a > 0) || !(b > 0)) return null;
  const pct = r2((b / a - 1) * 100);
  if (Math.abs(pct) > 80) return null; // garde-fou : cours mal lu (unité, division d'actions)
  return { pct, serie: pts.map(p => p[1]), dates: pts.map(p => p[0]), du: pts[0][0], au: pts[pts.length - 1][0], partiel };
}

/* ---------- Indices de référence ---------- */
export const INDICES = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", sp500: "S&P 500", nasdaq100: "Nasdaq 100", dax: "DAX", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
export function indiceDe(k, meta) {
  if (!meta) return null;
  if (k.startsWith("c:")) return { FR: "cac40", EU: "stoxx50", US: "sp500" }[meta.region] || null;
  const ix = String(meta.index || "");
  if (/^Nasdaq-?100$/i.test(ix)) return "nasdaq100";
  if (/^S&P 500$/i.test(ix)) return "sp500";
  if (/^Euro Stoxx 50$/i.test(ix)) return "stoxx50";
  if (/^CAC 40$/i.test(ix)) return "cac40";
  if (/^DAX$/i.test(ix)) return "dax";
  if (/^FTSE 100$/i.test(ix)) return "ftse100";
  if (/^Nikkei 225$/i.test(ix)) return "nikkei";
  return null; // pas d'indice équivalent suivi par le site (MSCI World, obligations…) : pas de comparaison plutôt qu'une fausse
}

/* ---------- Réglages du rapport (choisis par la personne, gardés avec son compte : donnees.profil.rapport) ---------- */
// { v: 1, favoris, portefeuille (bool : ce que contient le rapport), secteurs: [clé] (secteurs suivis), indices: [id],
//   detail: "court" | "complet", sujets: { resultats, dividendes, actualite, lecons }, jour: 6 | 0 | 1 (samedi, dimanche, lundi),
//   notif (bool : notification « rapport prêt »), configure (bool : assistant terminé) }
export const SECTEURS = { conso: "Consommation", industrie: "Industrie", energie: "Énergie", sante: "Santé", tech: "Technologie", finance: "Banque et assurance",
  telecom: "Télécoms et médias", materiaux: "Matériaux", services: "Services aux collectivités", immo: "Immobilier" };
export const RAPPORT_SUJETS = ["resultats", "dividendes", "actualite", "lecons"];
export const RAPPORT_JOURS = [6, 0, 1];
export const RAPPORT_MAX_SECTEURS = { gratuit: 2, premium: 6 };
export const RAPPORT_DEFAUT = Object.freeze({ v: 1, favoris: true, portefeuille: true, secteurs: [], indices: ["cac40", "stoxx50", "sp500", "nasdaq100", "dax", "ftse100", "nikkei"],
  detail: "complet", sujets: { resultats: true, dividendes: true, actualite: true, lecons: true }, jour: 6, notif: true, configure: false });
const bool = (v, d) => typeof v === "boolean" ? v : d;
/** Réglages complets et sûrs, quel que soit ce qui est stocké (champs manquants : valeurs par défaut). */
export function normaliseRapport(r, max = RAPPORT_MAX_SECTEURS.premium) {
  const D = RAPPORT_DEFAUT, x = r && typeof r === "object" && !Array.isArray(r) ? r : {};
  const liste = (v, ok, n) => Array.isArray(v) ? [...new Set(v.filter(k => typeof k === "string" && ok(k)))].slice(0, n) : null;
  const s = x.sujets && typeof x.sujets === "object" ? x.sujets : {};
  return { v: 1, favoris: bool(x.favoris, D.favoris), portefeuille: bool(x.portefeuille, D.portefeuille),
    secteurs: liste(x.secteurs, k => k in SECTEURS, max) || [], indices: liste(x.indices, k => k in INDICES, 7) || [...D.indices],
    detail: x.detail === "court" ? "court" : "complet", sujets: Object.fromEntries(RAPPORT_SUJETS.map(k => [k, bool(s[k], true)])),
    jour: RAPPORT_JOURS.includes(x.jour) ? x.jour : D.jour, notif: bool(x.notif, D.notif), configure: bool(x.configure, false) };
}
/** Contrôle strict de ce qu'envoie le navigateur. Renvoie { rapport, coupe } ou { error }. */
export function validerRapport(b, premium) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return { error: "Réglages invalides." };
  for (const k of ["favoris", "portefeuille", "notif", "configure"]) if (b[k] !== undefined && typeof b[k] !== "boolean") return { error: `Réglage « ${k} » invalide.` };
  for (const k of ["secteurs", "indices"]) if (b[k] !== undefined && (!Array.isArray(b[k]) || b[k].length > 20 || b[k].some(x => typeof x !== "string"))) return { error: `Liste « ${k} » invalide.` };
  if (b.secteurs && b.secteurs.some(x => !(x in SECTEURS))) return { error: "Secteur inconnu." };
  if (b.indices && b.indices.some(x => !(x in INDICES))) return { error: "Indice inconnu." };
  if (b.detail !== undefined && !["court", "complet"].includes(b.detail)) return { error: "Niveau de détail invalide (court ou complet)." };
  if (b.jour !== undefined && !RAPPORT_JOURS.includes(b.jour)) return { error: "Jour invalide (samedi, dimanche ou lundi)." };
  if (b.sujets !== undefined && (!b.sujets || typeof b.sujets !== "object" || Array.isArray(b.sujets) || Object.entries(b.sujets).some(([k, v]) => !RAPPORT_SUJETS.includes(k) || typeof v !== "boolean"))) return { error: "Sujets invalides." };
  const max = premium ? RAPPORT_MAX_SECTEURS.premium : RAPPORT_MAX_SECTEURS.gratuit;
  const rapport = normaliseRapport(b, max);
  if (!rapport.favoris && !rapport.portefeuille && !rapport.secteurs.length) return { error: "Choisissez au moins une source : vos favoris, votre portefeuille ou un secteur." };
  return { rapport, coupe: new Set(b.secteurs || []).size > max };
}
/** Ce qui change le contenu du rapport (le jour et la notification n'en font pas partie). */
export const rapportSignature = r => { const x = normaliseRapport(r); return [x.favoris ? "f" : "", x.portefeuille ? "p" : "", x.secteurs.join("+"), x.indices.join("+"), x.detail, RAPPORT_SUJETS.filter(k => x.sujets[k]).join("+")].join("/"); };
// Sujet d'une annonce ou d'un rendez-vous : résultats, dividendes ou actualité (tout le reste)
const sujetDe = code => ["resultats", "ca", "rapport"].includes(code) ? "resultats" : code === "dividende" ? "dividendes" : "actualite";

/* ---------- Annonces : catégorie et importance ---------- */
const CATS = [
  ["opa", "Offre publique", 100, /\bOP[AERS]\b|offre publique|tender offer|retrait obligatoire/i],
  ["ca", "Chiffre d'affaires", 80, /chiffre d'affaires/i],
  ["resultats", "Résultats", 90, /r[ée]sultat|rapport (annuel|trimestriel|semestriel|financier)|10-[QK]|20-F|semestriel|earnings/i],
  ["dividende", "Dividende", 75, /dividende|acompte|d[ée]tachement/i],
  ["operation", "Opération ou accord", 65, /acquisition|cession|fusion|accord|rachat de la soci/i],
  ["dirigeants", "Dirigeants", 60, /dirigeant|directeur g[ée]n[ée]ral|PDG|pr[ée]sident|gouvernance|nomination|conseil d'administration/i],
  ["ag", "Assemblée générale", 45, /assembl[ée]e/i],
  ["capital", "Capital et actions", 20, /nombre d'actions|droits de vote|actions propres|rachat d'actions/i],
];
export function categorie(type, titre) {
  const t = `${type || ""} ${titre || ""}`;
  for (const [code, label, poids, re] of CATS) if (re.test(t)) return { code, label, poids };
  return { code: "communique", label: "Communiqué", poids: 30 };
}
// Catégories de la collecte d'actualités (cf/site/data/actu/c/<id>.json, champ c) ramenées aux nôtres
const CAT_INFO = Object.fromEntries([...CATS.map(([c, l, p]) => [c, { label: l, poids: p }]),
  ["financement", { label: "Financement", poids: 50 }], ["incident", { label: "Incident", poids: 70 }], ["initie", { label: "Transactions des dirigeants", poids: 25 }],
  ["agenda", { label: "Calendrier", poids: 15 }], ["communique", { label: "Communiqué", poids: 30 }], ["presse", { label: "Presse", poids: 22 }]]);
const ACTU_CAT = { resultats: "resultats", rapport: "resultats", dividende: "dividende", operation: "operation", contrat: "operation", dirigeants: "dirigeants", assemblee: "ag",
  emission: "financement", incident: "incident", rachat: "capital", capital: "capital", initie: "initie", agenda: "agenda", autre: "communique" };
const SOURCES = { amf: "AMF", sec: "SEC", nasdaq: "Nasdaq Nordic", oslo: "Oslo Børs", nsm: "FCA" };
export function categorieActu(c, titre) {
  const rx = categorie(null, titre);
  const code = rx.code === "opa" || (rx.code === "ca" && (!c || c === "resultats" || c === "autre")) ? rx.code : ACTU_CAT[c] || rx.code;
  return { code, ...(CAT_INFO[code] || CAT_INFO.communique) };
}
const coupe = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(". ") + 1, c.lastIndexOf(" "))).replace(/[,;:]$/, "") + "…"; };
// Le résumé « en clair » : la lecture calculée de l'annonce, sinon sa première phrase utile, sinon l'explication du type de document.
function resumeAnnonce(a) {
  const gen = String(a.explication || "").trim(), lect = (a.lecture || []).map(String).filter(x => x.trim() && x.trim() !== gen);
  if (lect.length) return coupe(lect.slice(0, 2).join(" "), 260);
  const ex = (a.extraits || []).map(String).find(x => x.trim().length > 30);
  if (ex) return coupe(ex, 240);
  return gen || null;
}

/* ---------- Portefeuille ---------- */
// Accepte la radiographie { l: [{ k, q, pru, m }] } et un journal d'opérations { ops: [{ k|id, q, sens }] }.
export function lignesPf(pf) {
  if (!pf || typeof pf !== "object") return [];
  const out = new Map(), envDef = pf.cfg && typeof pf.cfg.env === "string" ? pf.cfg.env : null;
  if (Array.isArray(pf.l)) for (const l of pf.l) { // format 3 du module portefeuille : une ligne par titre et par compte (env : pea, cto, av)
    if (!l || typeof l.k !== "string" || !KEY.test(l.k)) continue;
    const o = out.get(l.k) || { k: l.k, q: 0, m: 0, cout: 0, env: [] };
    const q = num(l.q), m = num(l.m), pru = num(l.pru), env = typeof l.env === "string" && l.env ? l.env : envDef;
    if (q > 0) { o.q += q; if (pru > 0) o.cout += q * pru; } else if (m > 0) o.m += m;
    if (env && !o.env.includes(env)) o.env.push(env);
    out.set(l.k, o);
  } else if (Array.isArray(pf.ops)) for (const op of pf.ops) {
    if (!op) continue;
    const k = typeof op.k === "string" && KEY.test(op.k) ? op.k : typeof op.id === "string" && /^[a-z0-9-]{1,60}$/.test(op.id) ? (op.etf ? "e:" : "c:") + op.id : null;
    if (!k) continue;
    const q = num(op.q ?? op.qte ?? op.quantite), sens = /vente|vend|sell|cession/i.test(String(op.sens || op.type || "")) ? -1 : 1;
    const o = out.get(k) || { k, q: 0, m: 0, cout: 0, env: [] };
    if (q > 0) o.q += sens * q; else { const m = num(op.m ?? op.montant); if (m > 0) o.m += sens * m; }
    out.set(k, o);
  }
  return [...out.values()].filter(o => o.q > 0 || o.m > 0);
}
const versEur = (v, cur, fx) => v == null ? null : cur === "EUR" || !cur ? v : fx && fx[cur] > 0 ? v * fx[cur] : null;
const PEA_PAYS = new Set("AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK IS LI NO".split(" "));

function alertesPf(lp, d) {
  const tot = lp.reduce((a, l) => a + l.v, 0); if (!(tot > 0)) return [];
  const A = [], big = lp.slice().sort((a, b) => b.v - a.v), P = v => NF(v * 100, 0) + " %";
  const act = big.find(l => l.k.startsWith("c:"));
  if (act && act.v / tot > 0.25) A.push({ code: "ligne", niveau: "vig", valeur: r2(act.v / tot * 100), k: act.k, texte: `Une seule action pèse ${P(act.v / tot)} du portefeuille (${d.names[act.k]}).`, pourquoi: `Si elle baissait de 30 %, le portefeuille perdrait environ ${P(act.v / tot * 0.3)}. Beaucoup d'investisseurs limitent une action seule à 5 ou 10 %.` });
  const top3 = big.slice(0, 3).reduce((a, l) => a + l.v, 0) / tot;
  if (lp.length >= 4 && top3 > 0.7) A.push({ code: "top3", niveau: "vig", valeur: r2(top3 * 100), texte: `Trois lignes concentrent ${P(top3)} de votre argent.`, pourquoi: "Votre résultat dépend surtout d'elles. C'est un choix possible, à faire en connaissance de cause." });
  const etfs = lp.filter(l => l.k.startsWith("e:") && d.etf[l.k] && num(d.etf[l.k].ter) != null), etfV = etfs.reduce((a, l) => a + l.v, 0);
  if (etfV > 0) { const ter = etfs.reduce((a, l) => a + l.v * d.etf[l.k].ter, 0) / etfV;
    if (ter > 0.4) A.push({ code: "frais", niveau: "moyen", valeur: r2(ter), texte: `Vos ETF coûtent en moyenne ${NF(ter, 2)} % par an.`, pourquoi: "Sur 20 ans, 0,3 point de frais en plus peut coûter environ 6 % du capital final. Des ETF équivalents existent souvent à 0,10 ou 0,20 %." }); }
  let elig = 0, connu = 0; const horsPea = [];
  for (const l of lp) {
    let ok = null;
    if (l.k.startsWith("e:")) { const e = d.etf[l.k]; if (e && typeof e.pea === "boolean") ok = e.pea; }
    else { const isin = (d.isin[l.k] || "").slice(0, 2); if (/^[A-Z]{2}$/.test(isin)) ok = PEA_PAYS.has(isin); }
    if (ok == null) continue;
    connu += l.v; if (ok) elig += l.v;
    if (!ok && (l.env || []).includes("pea")) horsPea.push(l);
  }
  if (horsPea.length) A.push({ code: "pea_hors", niveau: "vig", valeur: horsPea.length, texte: `${horsPea.map(l => d.names[l.k]).slice(0, 3).join(", ")} ${horsPea.length > 1 ? "sont rangés" : "est rangé"} dans votre PEA mais ne ${horsPea.length > 1 ? "semblent" : "semble"} pas éligible${horsPea.length > 1 ? "s" : ""}.`, pourquoi: "Un titre non éligible ne peut pas être acheté dans un PEA. Vérifiez la ligne chez votre courtier : erreur de saisie, ou titre logé sur un autre compte." });
  if (connu > 0 && !lp.some(l => (l.env || []).length)) { const part = elig / connu; // comptes non précisés : simple repère
    A.push({ code: "pea", niveau: part >= 0.999 ? "fort" : "info", valeur: r2(part * 100), texte: part >= 0.999 ? "Toutes vos lignes semblent éligibles au PEA." : `${P(part)} de vos lignes semblent éligibles au PEA.`, pourquoi: "Le PEA accepte les actions d'entreprises dont le siège est dans l'Union européenne ou l'Espace économique européen, et les ETF marqués PEA. Repère calculé d'après le pays du code ISIN : vérifiez chez votre courtier." }); }
  return A;
}
// Ce qui a changé depuis la semaine précédente : nouvelle alerte, chiffre qui bouge d'au moins 3 points, alerte levée.
function evolutionAlertes(A, prec) {
  const P = new Map(((prec && prec.portefeuille && prec.portefeuille.alertes) || []).map(a => [a.code, a]));
  if (!prec || !prec.portefeuille) return { alertes: A.map(a => ({ ...a, evol: null })), levees: [] };
  const alertes = A.map(a => { const p = P.get(a.code); return { ...a, evol: !p ? "nouveau" : a.valeur != null && p.valeur != null && Math.abs(a.valeur - p.valeur) >= 3 ? (a.valeur > p.valeur ? "hausse" : "baisse") : "stable", avant: p ? p.valeur : null }; });
  const levees = [...P.values()].filter(p => !A.some(a => a.code === p.code) && p.niveau !== "fort" && p.niveau !== "info").map(p => ({ code: p.code, texte: p.texte }));
  return { alertes, levees };
}

/* ---------- Les faits de la semaine ---------- */
// d : { names, px, cs, sem, ana, ev, etf: { "e:id": { ter, pea, index } }, meta: { "c:id": { region } }, isin, fx, actu: { "c:id": [articles] } }
export function faitsSynthese(d, { favoris = [], pf = null, rapport = null } = {}, semaine, opts = {}) {
  const auj = opts.auj, lundi = lundiDe(semaine), dimanche = addJ(lundi, 6), prec = opts.precedent || null, RG = normaliseRapport(rapport);
  if (!RG.favoris) favoris = []; if (!RG.portefeuille) pf = null;
  const LP = lignesPf(pf).filter(l => d.names[l.k]), pfSet = new Set(LP.map(l => l.k)), favSet = new Set(favoris.filter(k => KEY.test(k)));
  const keys = [...new Set([...favSet, ...pfSet])].filter(k => d.names[k]).slice(0, 260);
  const idx = {};
  for (const id of Object.keys(INDICES)) { const v = variationSemaine(d.cs, "i:" + id, lundi, auj, d.px["i:" + id], d.sem); if (v) idx[id] = { id, nom: INDICES[id], pct: v.pct, serie: v.serie, partiel: v.partiel }; }
  const lignes = keys.map(k => {
    const p = d.px[k], v = variationSemaine(d.cs, k, lundi, auj, p, d.sem), ix = indiceDe(k, k.startsWith("e:") ? d.etf[k] : d.meta[k]);
    const l = { k, nom: d.names[k], type: k.startsWith("e:") ? "etf" : "action", variation_semaine_pct: v ? v.pct : null, cours: p && p.p != null ? p.p : null, devise: (p && p.cur) || null,
      serie: v ? v.serie : null, du: v ? v.du : null, partiel: v ? v.partiel : false, favori: favSet.has(k), en_portefeuille: pfSet.has(k), indice: null, ecart_pts: null };
    if (ix && idx[ix]) { l.indice = { id: ix, nom: INDICES[ix], pct: idx[ix].pct }; if (l.variation_semaine_pct != null) l.ecart_pts = r2(l.variation_semaine_pct - idx[ix].pct); }
    return l;
  }).sort((a, b) => (b.variation_semaine_pct ?? -1e9) - (a.variation_semaine_pct ?? -1e9));
  const L = Object.fromEntries(lignes.map(l => [l.k, l]));
  const mv = lignes.filter(l => l.variation_semaine_pct != null), court = l => l && { k: l.k, nom: l.nom, variation_semaine_pct: l.variation_semaine_pct };

  // Portefeuille : valeur en euros, gain ou perte de la semaine, à composition constante
  let portefeuille = null;
  if (LP.length) {
    const lp = LP.map(l => { const p = d.px[l.k], vEur = p && l.q > 0 ? versEur(p.p * l.q, p.cur, d.fx) : null; return { ...l, v: vEur != null ? vEur : l.m || 0, estime: vEur == null }; }).filter(l => l.v > 0);
    const tot = lp.reduce((a, l) => a + l.v, 0);
    if (tot > 0) {
      let varE = 0, couvert = 0;
      for (const l of lp) { const x = L[l.k], r = x && x.variation_semaine_pct; l.poids = r2(l.v / tot * 100);
        if (r != null) { l.var_eur = l.v - l.v / (1 + r / 100); varE += l.var_eur; couvert += l.v; }
        if (x) x.portefeuille = { valeur_eur: Math.round(l.v), poids_pct: l.poids, var_eur: l.var_eur != null ? r2(l.var_eur) : null, estime: l.estime }; }
      // courbe de la semaine : chaque ligne suivie à quantité constante (valeur d'aujourd'hui × cours du jour / cours d'aujourd'hui)
      const jours = [...new Set(lp.flatMap(l => { const v = variationSemaine(d.cs, l.k, lundi, auj, d.px[l.k], d.sem); return v ? v.dates.filter(Boolean) : []; }))].sort();
      let serie = null;
      if (jours.length >= 2) {
        const parL = lp.map(l => { const v = variationSemaine(d.cs, l.k, lundi, auj, d.px[l.k], d.sem); if (!v) return null; const m = Object.fromEntries(v.dates.map((x, i) => [x, v.serie[i]])); return { l, m, der: v.serie[v.serie.length - 1] }; }).filter(Boolean);
        serie = jours.map(j => Math.round(parL.reduce((a, { l, m, der }) => { let px = m[j]; if (px == null) { const ks = Object.keys(m).filter(x => x <= j).sort(); px = ks.length ? m[ks[ks.length - 1]] : m[Object.keys(m).sort()[0]]; } return a + l.v * px / der; }, 0) + lp.filter(l => !parL.some(x => x.l === l)).reduce((a, l) => a + l.v, 0)));
      }
      const debut = tot - varE, ev = evolutionAlertes(alertesPf(lp, d), prec);
      portefeuille = { valeur_eur: Math.round(tot), var_eur: couvert ? r2(varE) : null, var_pct: couvert && debut > 0 ? r2(varE / debut * 100) : null, couverture_pct: r2(couvert / tot * 100), lignes: lp.length,
        estime: lp.some(l => l.estime), serie, vs: ["cac40", "sp500"].filter(i => idx[i]).map(i => ({ id: i, nom: INDICES[i], pct: idx[i].pct })), alertes: ev.alertes, levees: ev.levees,
        plus_lourde: (() => { const b = lp.slice().sort((a, b) => b.v - a.v)[0]; return b ? { k: b.k, nom: d.names[b.k], poids_pct: b.poids } : null; })() };
    }
  }

  // Annonces officielles et articles de la semaine, classés par importance
  const ids = new Set(keys.filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const off = Object.entries(d.ana || {}).filter(([, a]) => a && ids.has(a.id) && a.date >= lundi && a.date <= dimanche).map(([u, a]) => {
    const cat = categorie(a.type, a.titre), x = L["c:" + a.id], fort = x && x.variation_semaine_pct != null && Math.abs(x.variation_semaine_pct) >= 5;
    return { k: "c:" + a.id, nom: d.names["c:" + a.id], date: a.date, type: a.type || null, titre: a.titre || null, categorie: cat.code, categorie_label: cat.label,
      poids: cat.poids + ((a.chiffres || []).length ? 8 : 0) + (fort ? 12 : 0) + (pfSet.has("c:" + a.id) ? 5 : 0), resume: resumeAnnonce(a),
      chiffres: (a.chiffres || []).slice(0, 4), lecture: (a.lecture || []).slice(0, 3), source: /^https:\/\//.test(u) ? u : (a.url || null), origine: "officiel", lien: "/entreprise/" + a.id + "/actualite" };
  });
  const dansSemaine = x => { const j = String(x || "").slice(0, 10); return j >= lundi && j <= dimanche; }, url = u => typeof u === "string" && /^https:\/\//.test(u) ? u : null;
  const actuO = [], presse = [];
  for (const [k, j] of Object.entries(d.actu || {})) {
    if (!L[k] || !j) continue;
    const x = L[k], fort = x.variation_semaine_pct != null && Math.abs(x.variation_semaine_pct) >= 5, lien = "/entreprise/" + k.slice(2) + "/actualite";
    for (const a of (Array.isArray(j.o) ? j.o : [])) {
      if (!a || !dansSemaine(a.d) || !url(a.u)) continue;
      const titre = a.tf || a.t || null, cat = categorieActu(a.c, titre), f = Array.isArray(a.f) ? a.f.filter(c => Array.isArray(c) && c.length >= 2).slice(0, 4) : [], r = Array.isArray(a.r) ? a.r.map(String).slice(0, 3) : [];
      const enClair = a.x && typeof a.x.c === "string" ? a.x.c : null, change = a.x && typeof a.x.ch === "string" ? a.x.ch : null;
      actuO.push({ k, nom: d.names[k], date: String(a.d).slice(0, 10), type: cat.label, titre, categorie: cat.code, categorie_label: cat.label,
        poids: cat.poids + (num(a.i) || 0) * 6 + (f.length ? 8 : 0) + (fort ? 12 : 0) + (pfSet.has(k) ? 5 : 0) + (a.p ? 4 : 0), resume: enClair ? coupe(enClair, 280) : r.length ? coupe(r.join(" "), 260) : null,
        change: change ? coupe(change, 280) : null, chiffres: f, lecture: r, source: url(a.u), source_nom: SOURCES[a.s] || null, origine: "officiel", lien });
    }
    for (const a of (Array.isArray(j.p) ? j.p : []).filter(a => a && dansSemaine(a.d) && url(a.u)).slice(0, 3)) {
      const cat = categorie(null, a.t), code = cat.code === "communique" ? "presse" : cat.code;
      presse.push({ k, nom: d.names[k], date: String(a.d).slice(0, 10), type: "Article de presse", titre: a.t || null, categorie: code, categorie_label: (CAT_INFO[code] || CAT_INFO.presse).label,
        poids: Math.min(cat.poids, 60) - 15 + (fort ? 8 : 0), resume: null, chiffres: [], lecture: [], source: url(a.u), site: a.s || null, origine: "presse", lien });
    }
    if (Array.isArray(j)) for (const a of j) { // format libre : { titre|title, url, date, source, resume }
      if (!a || !url(a.url) || !dansSemaine(a.date)) continue;
      const cat = categorie(a.type || a.categorie, a.titre || a.title);
      presse.push({ k, nom: d.names[k], date: String(a.date).slice(0, 10), type: a.type || "Article de presse", titre: a.titre || a.title || null, categorie: cat.code, categorie_label: cat.label,
        poids: cat.poids - 10, resume: a.resume ? coupe(a.resume, 240) : null, chiffres: [], lecture: [], source: url(a.url), site: a.source || a.site || null, origine: "presse", lien });
    }
  }
  const urlsO = new Map(actuO.map(a => [a.source, a]));
  for (const a of off) { const o = urlsO.get(a.source); if (o) { if (!o.chiffres.length && a.chiffres.length) o.chiffres = a.chiffres; if (!o.resume) o.resume = a.resume; } }
  const vus = new Set();
  const annonces = [...actuO, ...off.filter(a => !urlsO.has(a.source)), ...presse].sort((a, b) => b.poids - a.poids || String(b.date).localeCompare(a.date))
    .filter(a => { const c = a.source || a.k + "|" + (a.titre || a.type) + "|" + a.date; if (vus.has(c)) return false; vus.add(c); return true; })
    .filter(a => RG.sujets[sujetDe(a.categorie)]).slice(0, RG.detail === "court" ? 3 : 30);

  // Rendez-vous des 14 prochains jours (agenda du site)
  const debutAv = auj && auj > lundi ? auj : lundi, finAv = addJ(debutAv, 14);
  const a_venir = (d.ev || []).filter(e => e && ids.has(e.id) && e.date >= debutAv && e.date <= finAv).sort((a, b) => a.date.localeCompare(b.date))
    .map(e => { const c = categorie(e.type, e.label); return { k: "c:" + e.id, id: e.id, nom: d.names["c:" + e.id], date: e.date, type: e.type || null, label: e.label || e.type || "", categorie: c.code, source: e.source || null, lien: "/entreprise/" + e.id + "/agenda" }; })
    .filter(e => RG.sujets[sujetDe(e.categorie)]).slice(0, RG.detail === "court" ? 3 : 12);

  // Secteurs suivis : variation médiane de la semaine des entreprises du secteur suivies par le site
  const secteurs = RG.secteurs.map(sk => {
    const vs = [];
    for (const [k, m] of Object.entries(d.meta || {})) if (m && m.sector === sk && d.names[k]) { const v = variationSemaine(d.cs, k, lundi, auj, d.px[k], d.sem); if (v) vs.push({ k, nom: d.names[k], variation_semaine_pct: v.pct }); }
    vs.sort((a, b) => b.variation_semaine_pct - a.variation_semaine_pct);
    const p = vs.map(x => x.variation_semaine_pct), mid = p.length >> 1, med = p.length ? (p.length % 2 ? p[mid] : (p[mid - 1] + p[mid]) / 2) : null;
    return { id: sk, nom: SECTEURS[sk], n: vs.length, mediane_pct: med != null ? r2(med) : null, hausses: p.filter(x => x > 0).length, baisses: p.filter(x => x < 0).length,
      premieres: vs.slice(0, 3), dernieres: vs.length > 3 ? vs.slice(Math.max(3, vs.length - 3)).reverse() : [], vos_lignes: lignes.filter(l => d.meta[l.k] && d.meta[l.k].sector === sk).map(court) };
  });

  const f = {
    v: SYN_VERSION, semaine, genere: Date.now(), du: lundi, au: dimanche, lignes,
    moyenne: mv.length ? r2(mv.reduce((a, l) => a + l.variation_semaine_pct, 0) / mv.length) : null,
    meilleure: court(mv[0]) || null, pire: mv.length > 1 ? court(mv[mv.length - 1]) : null,
    hausses: mv.filter(l => l.variation_semaine_pct > 0).length, baisses: mv.filter(l => l.variation_semaine_pct < 0).length,
    partiel: mv.length > 0 && mv.every(l => l.partiel), depuis: mv.length ? mv.map(l => l.du).filter(Boolean).sort()[0] || null : null,
    indices: Object.values(idx).filter(i => RG.indices.includes(i.id)).map(({ id, nom, pct, partiel }) => ({ id, nom, pct, partiel })), portefeuille, annonces, a_venir, secteurs, texte: null,
    reglages: { favoris: RG.favoris, portefeuille: RG.portefeuille, secteurs: RG.secteurs, indices: RG.indices, detail: RG.detail, sujets: RG.sujets, jour: RG.jour },
  };
  f.essentiel = essentielDe(f);
  f.lecture_min = lectureMin(f);
  return f;
}

/* ---------- L'essentiel en trois phrases, calculées ---------- */
export function essentielDe(f) {
  const P = [], mv = f.lignes.filter(l => l.variation_semaine_pct != null), pf = f.portefeuille, cac = (f.indices || []).find(i => i.id === "cac40");
  const quand = f.partiel && f.depuis ? `depuis le ${dateLongue(f.depuis)}` : "cette semaine";
  if (pf && pf.var_eur != null && pf.var_pct != null) {
    const vs = pf.vs && pf.vs.length ? `, contre ${pf.vs.map(i => `${sgnP(i.pct)} pour le ${i.nom}`).join(" et ")}` : "";
    P.push(`Votre portefeuille ${pf.var_eur >= 0 ? "a gagné" : "a perdu"} ${eurS(pf.var_eur).replace(/^[+−]/, "")} (${sgnP(pf.var_pct)}) ${quand}${vs}.`);
  } else if (mv.length) {
    P.push(`${mv.length > 1 ? "Vos " + mv.length + " valeurs suivies ont" : "Votre valeur suivie a"} évolué de ${sgnP(f.moyenne)}${mv.length > 1 ? " en moyenne" : ""} ${quand}${mv.length > 1 ? ` (${f.hausses} en hausse, ${f.baisses} en baisse)` : ""}${cac ? `, contre ${sgnP(cac.pct)} pour le CAC 40` : ""}.`);
  }
  const secs = (f.secteurs || []).filter(s => s.mediane_pct != null && s.n >= 1);
  if (secs.length && (!mv.length || (f.reglages && !f.reglages.favoris && !f.reglages.portefeuille))) {
    const s = secs[0], aut = secs.slice(1, 3);
    P.push(`Le secteur ${s.nom} a évolué de ${sgnP(s.mediane_pct)}${s.n > 1 ? " en médiane" : ""} ${quand} (${s.n} entreprise${s.n > 1 ? "s" : ""} suivie${s.n > 1 ? "s" : ""} par le site)${aut.length ? `, contre ${aut.map(x => `${sgnP(x.mediane_pct)} pour ${x.nom}`).join(" et ")}` : ""}.`);
  }
  const fort = mv.slice().sort((a, b) => Math.abs(b.variation_semaine_pct) - Math.abs(a.variation_semaine_pct))[0];
  if (fort && Math.abs(fort.variation_semaine_pct) >= 0.5) {
    const ann = f.annonces.filter(a => a.k === fort.k && a.origine === "officiel").sort((a, b) => b.poids - a.poids)[0];
    const sens = fort.variation_semaine_pct > 0 ? "la plus forte hausse" : "la plus forte baisse";
    const c0 = ann && ann.chiffres && ann.chiffres[0], chif = c0 ? ` : ${String(c0[0]).charAt(0).toLowerCase() + String(c0[0]).slice(1)} ${c0[1]}` : "";
    P.push(ann ? `${fort.nom} signe ${sens} de votre liste (${sgnP(fort.variation_semaine_pct)}), la semaine de sa publication « ${coupe(ann.titre || ann.type || ann.categorie_label, 90)} »${chif}.`
      : `${fort.nom} signe ${sens} de votre liste (${sgnP(fort.variation_semaine_pct)}). Aucune annonce officielle de la semaine ne l'explique : la cause n'est pas connue.`);
  } else if (f.annonces.length) {
    const a = f.annonces[0]; P.push(`À retenir côté annonces : ${a.nom}, ${String(a.categorie_label || a.type || "communiqué").toLowerCase()} le ${dateLongue(a.date)}.`);
  }
  if (f.a_venir.length) {
    const e = f.a_venir[0], n = f.a_venir.length;
    P.push(`À venir : ${e.nom}, ${String(e.label).replace(/\.$/, "")}, le ${dateLongue(e.date)}${n > 1 ? `, puis ${n - 1} autre${n > 2 ? "s" : ""} rendez-vous d'ici deux semaines` : ""}.`);
  } else if (mv.length || f.annonces.length) P.push("Aucune date de résultats, de dividende ou d'assemblée n'est annoncée pour vos valeurs dans les deux prochaines semaines.");
  return P.slice(0, 3);
}
// Temps de lecture estimé de la synthèse (environ 200 mots par minute, chaque chiffre compte pour un mot)
export function lectureMin(f) {
  const t = [...(f.essentiel || []), ...f.annonces.slice(0, 8).map(a => (a.resume || "") + " " + (a.titre || "")), ...f.a_venir.map(e => e.label), f.texte || ""].join(" ");
  const mots = t.split(/\s+/).filter(Boolean).length + f.lignes.length * 4 + ((f.portefeuille && f.portefeuille.alertes.length) || 0) * 25;
  return Math.max(1, Math.min(5, Math.ceil(mots / 200)));
}

/* ---------- Résumé court (notification, page d'accueil, e-mail) ---------- */
export function resumeCourt(c) {
  if (!c) return null;
  const e = (c.essentiel && c.essentiel.length ? c.essentiel : essentielDe({ lignes: [], annonces: [], a_venir: [], ...c })) || [];
  const resume = coupe(e.slice(0, 2).join(" "), 220) || "Les variations, les annonces et les dates à venir de ce que vous suivez.";
  return { titre: "Votre semaine en 2 minutes", resume, lien: "/espace", semaine: c.semaine };
}
