// Connecteur MCP public de bilan., en lecture seule : /mcp (Model Context Protocol, transport « Streamable HTTP », JSON-RPC 2.0).
// Méthodes : initialize, ping, tools/list, tools/call (et les notifications, acquittées par 202). Sans session ni compte.
// Les données sont celles du site (fichiers /data/*.json lus par env.ASSETS) : comptes annuels officiels (ESEF, SEC),
// médianes par secteur et repères vert / gris / orange calculés comme sur les fiches, ETF, agenda, cours de l'Académie.
// Chaque réponse cite ses sources et rappelle qu'il s'agit d'information, pas de conseil en investissement.
// Débit : 240 appels d'outils par minute et 30 000 par jour pour une même adresse (empreinte anonyme, voir compte.mjs).
// Limites larges : Claude et ChatGPT appellent depuis leurs propres serveurs, partagés par tous leurs utilisateurs.
import { visitor } from "./compte.mjs";
import { cours } from "./cours.mjs";

export const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INFO = { name: "bilan", title: "bilan. : la Bourse, comptes à l'appui", version: "1.0.0" };
const AVERT = "Information factuelle et pédagogique tirée des comptes officiels, pas un conseil en investissement : aucune recommandation d'achat ou de vente.";
const INSTRUCTIONS = `Données de bilan. (site français d'information boursière pour débutants) : comptes annuels officiels de plus de 1 000 entreprises cotées (rapports ESEF via filings.xbrl.org, SEC EDGAR), médiane de chaque chiffre dans le secteur, repères de lecture vert / gris / orange, éligibilité au PEA, ETF (frais, indice, composition), agenda des résultats et dividendes, cours de l'Académie.
Règles : répondez en citant les chiffres et les sources fournis, avec le lien vers la page bilan. correspondante. Un repère vert (point fort), gris (dans la moyenne) ou orange (point de vigilance) décrit les comptes passés selon des seuils publiés : ce n'est ni une note de l'action ni une recommandation. Ne transformez jamais ces données en conseil d'achat ou de vente, ni en prédiction de cours.`;

/* ---------- Chargement des données du site (gardées 10 minutes par instance) ---------- */
const MEMO = new Map();
function charger(env, origin, path, ttl = 6e5) {
  const h = MEMO.get(path); if (h && Date.now() - h.at < ttl) return h.p;
  const p = (async () => { const r = await env.ASSETS.fetch(new Request(origin + path)); if (!r.ok) throw new Error("introuvable : " + path); return r.json(); })();
  MEMO.set(path, { at: Date.now(), p }); p.catch(() => MEMO.delete(path));
  if (MEMO.size > 300) MEMO.delete(MEMO.keys().next().value);
  return p;
}
const optionnel = (p, d) => p.catch(() => d);
let BASE = null; // { at, p }
function base(env, origin) {
  if (BASE && Date.now() - BASE.at < 6e5) return BASE.p;
  const p = (async () => {
    const [soc, uni, etf, ag, agAuto, aca] = await Promise.all([charger(env, origin, "/data/societes.json"), charger(env, origin, "/data/univers.json"),
      optionnel(charger(env, origin, "/data/etf.json"), { list: [] }), optionnel(charger(env, origin, "/data/agenda.json"), { events: [] }),
      optionnel(charger(env, origin, "/data/agenda-auto.json"), { events: [] }), optionnel(charger(env, origin, "/data/academie.json"), { modules: [] })]);
    const S = Object.fromEntries((soc.companies || []).map(c => [c.id, c]));
    const companies = (uni.companies || []).map(u => ({ ...(S[u.id] || { missing: true }), ...u }));
    const BY = Object.fromEntries(companies.map(c => [c.id, c]));
    const manuel = new Set((ag.events || []).map(e => e.id));
    const events = [...(ag.events || []), ...(agAuto.events || []).filter(e => !manuel.has(e.id)).map(e => ({ ...e, estimee: true }))].filter(e => e && BY[e.id] && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    return { companies, BY, sectors: soc.sectors || {}, regions: uni.regions || {}, updated: soc.updated, MED: medianes(companies), etfs: etf.list || [], etfMaj: etf.updated, events, aca };
  })();
  BASE = { at: Date.now(), p }; p.catch(() => { BASE = null; });
  return p;
}
let PRIX = null;
function prix(env, origin, ctx) { // cours différés (même source que le site), puis le dernier relevé publié si la feuille ne répond pas
  if (PRIX && Date.now() - PRIX.at < 6e5) return PRIX.p;
  const p = (async () => {
    let items = null, updated = null, source = "Google Finance, cours différés";
    try { const r = await cours(new Request(origin + "/api/cours"), ctx); if (r.ok) { const j = await r.json(); items = j.items; updated = j.updated; } } catch (e) { }
    if (!items) { const j = await optionnel(charger(env, origin, "/data/cours.json"), {}); items = j.items || {}; updated = j.updated || null; source = j.source || "Google Finance, cours de clôture"; }
    const fx = await optionnel(charger(env, origin, "/data/fx.json"), {});
    return { items: items || {}, updated, source, fx: fx.eur || null };
  })();
  PRIX = { at: Date.now(), p }; p.catch(() => { PRIX = null; });
  return p;
}

/* ---------- Calculs : les mêmes que sur les fiches du site (index.html : ratios, computeMedians, lecture, valo) ---------- */
const okn = x => x != null && isFinite(x);
const NOT_BANK = new Set(["visa", "mastercard"]);
const isBank = c => c.sector === "finance" && !NOT_BANK.has(c.id);
const median = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
export function ratios(s) {
  return {
    g1: okn(s.ca) && s.caPrev > 0 ? s.ca / s.caPrev - 1 : null,
    marge: s.ca > 0 && okn(s.ebit) ? s.ebit / s.ca : null,
    nm: s.ca > 0 && okn(s.net) ? s.net / s.ca : null,
    ng: okn(s.net) && s.netPrev > 0 ? s.net / s.netPrev - 1 : null,
    roe: s.equity > 0 && okn(s.net) ? s.net / s.equity : null,
    lev: s.ebitda > 0 && okn(s.netDebt) ? s.netDebt / s.ebitda : null,
    gear: s.equity > 0 && okn(s.netDebt) ? s.netDebt / s.equity : null,
    conv: s.net > 0 && okn(s.fcf) ? s.fcf / s.net : null,
    payout: okn(s.divPaid) && s.net > 0 ? s.divPaid / s.net : null,
  };
}
const MKEYS = ["g1", "marge", "nm", "roe", "lev", "gear", "conv", "payout"];
export function medianes(companies) { // médiane des entreprises suivies, par secteur (toutes régions)
  const by = {};
  companies.filter(c => !c.missing).forEach(c => { const r = ratios(c); if (isBank(c)) { r.lev = r.gear = r.conv = r.marge = null; } (by[c.sector] = by[c.sector] || []).push(r); });
  return Object.fromEntries(Object.entries(by).map(([k, l]) => [k, { n: l.length, ...Object.fromEntries(MKEYS.map(m => [m, median(l.map(x => x[m]))])) }]));
}
const FXE = { EUR: 1, USD: 0.92, GBP: 1.17, SEK: 0.087, DKK: 0.134, NOK: 0.085, CHF: 1.05, JPY: 0.0061, PLN: 0.23, CAD: 0.67, INR: 0.011, BRL: 0.17, TWD: 0.029, CNY: 0.13, HKD: 0.12, AUD: 0.6, MXN: 0.05, KRW: 0.00068 };
function valo(c, P) {
  const p = P.items["c:" + c.id]; if (!p) return null;
  const toEur = (v, cur) => v == null || !cur ? null : v * ((P.fx && P.fx[cur]) || FXE[cur] || (cur === "EUR" ? 1 : NaN));
  let capE = p.cap ? toEur(p.cap, p.cur) : null; const netE = c.net != null ? toEur(c.net * 1e6, c.currency) : null;
  let pe = capE && netE > 0 ? capE / netE : null, sain = true;
  if (pe == null && c.eps > 0 && p.cur === c.currency) pe = p.p / c.eps;
  const peE = c.eps > 0 && p.p > 0 ? p.p / c.eps : null;
  if (peE != null && peE >= 3 && peE <= 150 && (pe == null || pe < 3 || pe > 150)) { pe = peE; sain = false; if (c.net > 0) capE = toEur(p.p * c.net * 1e6 / c.eps, p.cur); }
  let yld = null;
  if (sain && c.divPaid > 0.5 && capE) yld = toEur(c.divPaid * 1e6, c.currency) / capE;
  if ((yld == null || yld > 0.15) && c.dps > 0 && (p.cur === c.currency || !sain)) yld = c.dps / p.p;
  if (yld != null && (yld > 0.25 || yld < 0)) yld = null;
  if (pe != null && (pe > 500 || pe < 2)) pe = null;
  if (capE != null && !isFinite(capE)) capE = null;
  return { p, capE, pe, yld };
}
const MEDPE_MEMO = new WeakMap();
function medPE(B, P) {
  let m = MEDPE_MEMO.get(P); if (m && m.B === B) return m.v;
  const by = {}; B.companies.forEach(c => { if (c.missing) return; const v = valo(c, P); if (v && v.pe) (by[c.sector] = by[c.sector] || []).push(v.pe); });
  const v = Object.fromEntries(Object.entries(by).map(([k, l]) => [k, l.length >= 5 ? { m: median(l), n: l.length } : null]));
  MEDPE_MEMO.set(P, { B, v }); return v;
}
const EEA = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "SE", "DK", "NO", "IS", "LI", "PL", "CZ", "GR", "HU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "BG", "RO"]);
const PEA_REGLE = "Le PEA accepte les actions de sociétés dont le siège est dans l'Union européenne ou l'Espace économique européen (soumises à l'impôt sur les sociétés), et les fonds investis au moins à 75 % dans ces actions (article L221-31 du Code monétaire et financier).";
const PEA_SRC = { titre: "Service-public.fr, plan d'épargne en actions (PEA)", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385" };
function peaSociete(c) {
  if (c.isin) { const pays = c.isin.slice(0, 2), ok = EEA.has(pays);
    return { eligible: ok, raison: ok ? `Oui : son code ISIN (${c.isin}) indique une société de l'Espace économique européen (${pays}).` : `Non : son code ISIN (${c.isin}) indique une société hors de l'Espace économique européen (${pays}). Il faut un compte-titres ; un ETF éligible au PEA peut la contenir indirectement.` }; }
  if (c.region === "FR") return { eligible: true, raison: "Oui : société française." };
  return { eligible: null, raison: "Non déterminé : l'ISIN de cette société n'est pas dans nos données. Les deux premières lettres de l'ISIN donnent le pays de la société ; une société dont le siège est aux États-Unis ou hors d'Europe n'est pas éligible." };
}

/* ---------- Formats ---------- */
const nf = d => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const F0 = nf(0), F1 = nf(1), F2 = nf(2);
const CUR = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF" };
const pct = (v, d = 1, sign = true) => v == null || !isFinite(v) ? "–" : (sign && v > 0 ? "+" : "") + nf(d).format(v * 100) + " %";
const big = (m, cur = "EUR") => m == null || !isFinite(m) ? "–" : (Math.abs(m) >= 1000 ? F1.format(m / 1000) + " Md" : F0.format(m) + " M") + (CUR[cur] || " " + cur);
const capFmt = v => v == null ? "–" : v >= 1e12 ? F1.format(v / 1e12) + " billions d'€" : v >= 1e9 ? F1.format(v / 1e9) + " Md€" : F0.format(v / 1e6) + " M€";
const pxFmt = (v, cur) => v == null ? "–" : nf(v >= 1000 ? 0 : 2).format(v) + " " + (CUR[cur] || cur || "");
const r4 = v => v == null || !isFinite(v) ? null : Math.round(v * 1e4) / 1e4;
const r2 = v => v == null || !isFinite(v) ? null : Math.round(v * 100) / 100;
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const jourParis = (t = Date.now()) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
const MOISL = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dLabel = iso => { const [y, m, d] = iso.slice(0, 10).split("-"); return (+d) + " " + MOISL[+m - 1] + " " + y; };

/* ---------- Repères de lecture (les seuils affichés sur les fiches) ---------- */
const COULEUR = { fort: ["vert", "Point fort"], moyen: ["gris", "Dans la moyenne"], vig: ["orange", "Point de vigilance"], na: ["sans objet", "Ne s'applique pas"] };
const RULES = {
  croissance: "Plus de 5 % sur un an : point fort. De 0 à 5 % : dans la moyenne. En baisse : point de vigilance.",
  marge: "Comparée aux entreprises du même secteur : nettement au-dessus, point fort ; nettement en dessous, point de vigilance. Sans comparaison possible : plus de 15 % point fort, moins de 7 % point de vigilance.",
  net: "Bénéfice en hausse : point fort. En baisse de moins de 30 % : dans la moyenne. Perte, ou bénéfice divisé par plus de 1,4 : point de vigilance.",
  roe: "Plus de 15 % : point fort. De 8 à 15 % : dans la moyenne. Moins de 8 % : point de vigilance.",
  lev: "Moins de 1,5 an : point fort. De 1,5 à 3 ans : dans la moyenne. Plus de 3 ans : point de vigilance. Plus de trésorerie que de dettes : point fort.",
  gear: "Moins de 50 % : point fort. De 50 à 100 % : dans la moyenne. Plus de 100 % : point de vigilance.",
  fcf: "Plus de 80 € d'argent disponible pour 100 € de bénéfice : point fort. Positif mais moins : dans la moyenne. Négatif : point de vigilance.",
  payout: "Moins de 60 % du bénéfice : point fort, il reste une marge si les bénéfices baissent. De 60 à 90 % : dans la moyenne. Plus de 90 % : point de vigilance.",
};
function reperes(c, MED) { // une ligne par question, comme le bloc « Les chiffres clés » des fiches
  const m = ratios(c), med = MED[c.sector] || {}, cur = c.currency, bank = isBank(c), medOk = med.n >= 3, out = [];
  const B = v => big(v, cur), S = CUR[cur] || cur || "€", ans = v => F1.format(v) + (v >= 2 ? " ans" : " an");
  const ligne = (cle, libelle, valeur, valeur_texte, lv, mediane, mediane_texte, regle, explication) => out.push({ cle, libelle, valeur, valeur_texte, verdict: COULEUR[lv][0], verdict_texte: COULEUR[lv][1],
    mediane_secteur: medOk && mediane != null ? mediane : null, mediane_texte: medOk && mediane != null ? mediane_texte : null, regle, explication });
  if (m.g1 != null) ligne("croissance", bank ? "Croissance des revenus" : "Croissance des ventes", r4(m.g1), pct(m.g1), m.g1 >= 0.05 ? "fort" : m.g1 >= 0 ? "moyen" : "vig", r4(med.g1), pct(med.g1), RULES.croissance,
    `${bank ? "Revenus passés" : "Ventes passées"} de ${B(c.caPrev)} à ${B(c.ca)} en un an.`);
  if (m.marge != null && !bank) {
    const mm = medOk ? med.marge : null;
    let lv = mm != null ? (m.marge >= mm + Math.max(0.03, Math.abs(mm) * 0.25) ? "fort" : m.marge <= mm - Math.max(0.03, Math.abs(mm) * 0.3) ? "vig" : "moyen") : (m.marge >= 0.15 ? "fort" : m.marge >= 0.07 ? "moyen" : "vig");
    if (m.marge < 0) lv = "vig";
    ligne("marge", "Marge d'exploitation", r4(m.marge), pct(m.marge, 1, false), lv, r4(mm), pct(mm, 1, false), RULES.marge,
      m.marge >= 0 ? `Sur 100 ${S} de ventes, il reste ${F1.format(m.marge * 100)} ${S} une fois payés les coûts de l'activité.` : `L'activité perd ${F1.format(-m.marge * 100)} ${S} pour 100 ${S} de ventes.`);
  }
  if (c.net != null) {
    let lv, t;
    if (c.net < 0) { lv = "vig"; t = `Perte de ${B(-c.net)} sur l'exercice ${c.year}.`; }
    else if (c.netPrev != null && c.netPrev < 0) { lv = "fort"; t = `Bénéfice de ${B(c.net)}, après une perte l'année précédente.`; }
    else { lv = m.ng == null ? "moyen" : m.ng >= 0 ? "fort" : m.ng > -0.3 ? "moyen" : "vig"; t = `Bénéfice de ${B(c.net)} sur l'exercice ${c.year}${m.ng != null ? `, ${m.ng >= 0 ? "en hausse" : "en baisse"} de ${pct(Math.abs(m.ng), 0, false)} sur un an` : ""}.`; }
    ligne("benefice", "Bénéfice net", c.net, B(c.net), lv, r4(med.nm), med.nm != null ? pct(med.nm, 1, false) + " des ventes (marge nette)" : null, RULES.net, t + (m.nm != null && c.net > 0 ? ` Marge nette : ${pct(m.nm, 1, false)}.` : ""));
  }
  if (m.roe != null) ligne("rentabilite", "Rentabilité des capitaux propres", r4(m.roe), pct(m.roe, 1, false), m.roe >= 0.15 ? "fort" : m.roe >= 0.08 ? "moyen" : "vig", r4(med.roe), pct(med.roe, 1, false), RULES.roe,
    `Pour 100 ${S} qui appartiennent aux actionnaires, l'entreprise a gagné ${F1.format(m.roe * 100)} ${S} en un an.`);
  else if (c.equity != null && c.equity <= 0) ligne("rentabilite", "Rentabilité des capitaux propres", null, "–", "na", null, null, RULES.roe, "Capitaux propres négatifs : ce ratio ne se calcule pas.");
  if (bank) ligne("dette", "Endettement", null, "–", "na", null, null, RULES.lev, "Pour une banque ou un assureur, emprunter et prêter est le métier lui-même : ce repère ne s'applique pas.");
  else if (c.netDebt != null) {
    if (c.netDebt < 0) ligne("dette", "Endettement", r2(c.netDebt), "Pas de dette nette", "fort", r2(med.lev), med.lev != null ? ans(med.lev) + " de résultat" : null, RULES.lev, `${B(-c.netDebt)} de trésorerie de plus que ses dettes financières.`);
    else if (m.lev != null) ligne("dette", "Endettement (dette nette / EBITDA)", r2(m.lev), ans(m.lev), m.lev <= 1.5 ? "fort" : m.lev <= 3 ? "moyen" : "vig", r2(med.lev), med.lev != null ? ans(med.lev) : null, RULES.lev,
      `Dette nette de ${B(c.netDebt)}, soit ${F1.format(m.lev)} année${m.lev >= 2 ? "s" : ""} de l'argent dégagé par l'activité avant investissements (EBITDA).`);
    else if (m.gear != null) ligne("dette", "Endettement (dette nette / capitaux propres)", r4(m.gear), pct(m.gear, 0, false), m.gear <= 0.5 ? "fort" : m.gear <= 1 ? "moyen" : "vig", r4(med.gear), pct(med.gear, 0, false), RULES.gear,
      `Dette nette de ${B(c.netDebt)}, soit ${pct(m.gear, 0, false)} de ce qui appartient aux actionnaires.`);
  }
  if (!bank && c.fcf != null) ligne("tresorerie", "Trésorerie disponible (free cash-flow)", c.fcf, B(c.fcf), c.fcf < 0 ? "vig" : m.conv != null && m.conv >= 0.8 ? "fort" : "moyen", r4(med.conv), med.conv != null ? F0.format(med.conv * 100) + ` ${S} pour 100 ${S} de bénéfice` : null, RULES.fcf,
    c.fcf >= 0 ? `Après ses investissements, il lui reste ${B(c.fcf)}${m.conv != null ? `, soit ${F0.format(m.conv * 100)} ${S} pour 100 ${S} de bénéfice` : ""}.` : `Ses investissements ont coûté plus que l'argent encaissé grâce à l'activité : il manque ${B(-c.fcf)}.`);
  if (c.divPaid != null) {
    if (c.divPaid < 0.5) ligne("dividende", "Dividende", 0, "Aucun", "na", r4(med.payout), pct(med.payout, 0, false) + " du bénéfice", RULES.payout, "Pas de dividende versé sur l'exercice.");
    else if (!(c.net > 0)) ligne("dividende", "Dividende", c.divPaid, B(c.divPaid), "vig", r4(med.payout), pct(med.payout, 0, false) + " du bénéfice", RULES.payout, `${B(c.divPaid)} versés alors que l'entreprise est en perte : le dividende est payé avec sa trésorerie ou sa dette.`);
    else ligne("dividende", "Part du bénéfice versée en dividende", r4(m.payout), pct(m.payout, 0, false), m.payout <= 0.6 ? "fort" : m.payout <= 0.9 ? "moyen" : "vig", r4(med.payout), pct(med.payout, 0, false), RULES.payout,
      `Sur 100 ${S} de bénéfice, ${F0.format(m.payout * 100)} ${S} ont été versés aux actionnaires${c.dps > 0 ? ` (${F2.format(c.dps)} ${S} par action)` : ""}.`);
  }
  return out;
}

/* ---------- Recherche ---------- */
function scoreSociete(c, q, qn) {
  if (c.id === q || c.id === qn.replace(/ /g, "-")) return 100;
  if (c.isin && c.isin.toLowerCase() === q) return 99;
  if (norm(c.ticker) === qn) return 95;
  const n = norm(c.name);
  if (n === qn) return 98;
  if (n.startsWith(qn + " ") || n.startsWith(qn)) return 80 - Math.min(20, n.length - qn.length) / 2;
  if (new RegExp("\\b" + qn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(n)) return 70;
  const toks = qn.split(" ").filter(t => t.length > 2);
  if (toks.length) { const d = norm(c.desc + " " + (c.fiche ? c.fiche.fait : "")), hit = toks.filter(t => n.includes(t) || d.includes(t)).length; if (hit === toks.length) return 30 + hit; }
  return 0;
}
function chercherSocietes(B, requete, n = 10, f = {}) {
  const q = String(requete || "").trim().toLowerCase(), qn = norm(requete);
  if (!qn) return [];
  return B.companies.filter(c => (!f.region || c.region === f.region) && (!f.secteur || c.sector === f.secteur))
    .map(c => [c, scoreSociete(c, q, qn)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, n).map(x => x[0]);
}
function trouverSociete(B, q) { const l = chercherSocietes(B, q, 1); return l.length && scoreSociete(l[0], String(q).trim().toLowerCase(), norm(q)) >= 70 ? l[0] : null; }
function chercherEtf(B, requete, n = 10) {
  const q = String(requete || "").trim().toLowerCase(), qn = norm(requete); if (!qn) return [];
  const toks = qn.split(" ").filter(Boolean);
  return B.etfs.map(e => { const t = norm([e.name, e.index, e.issuer, e.ticker, e.categorie].join(" "));
    const s = e.id === q ? 100 : e.isin.toLowerCase() === q ? 99 : norm(e.ticker) === qn ? 95 : norm(e.name) === qn ? 90 : toks.every(x => t.includes(x)) ? 50 + toks.length : 0; return [e, s]; })
    .filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || (a[0].ter ?? 9) - (b[0].ter ?? 9)).slice(0, n).map(x => x[0]);
}
const lien = (origin, p) => origin + p;
const resumeSociete = (B, c, origin) => ({ id: c.id, nom: c.name, ticker: c.ticker, isin: c.isin || null, secteur: B.sectors[c.sector] || c.sector, region: B.regions[c.region] || c.region, activite: c.desc || null, comptes_disponibles: !c.missing, lien: lien(origin, "/entreprise/" + c.id) });

/* ---------- Outils ---------- */
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const TXT = { type: "string" };
export const TOOLS = [
  { name: "rechercher_entreprise", title: "Rechercher une entreprise",
    description: "Trouve une entreprise cotée suivie par bilan. (plus de 1 000 en France, en Europe, aux États-Unis et dans le monde) par son nom, son ticker, son code ISIN ou un mot de son activité. Renvoie l'identifiant à passer aux autres outils, le secteur, la région et le lien vers sa fiche. Signale aussi les ETF dont le nom correspond.",
    inputSchema: { type: "object", properties: { requete: { ...TXT, description: "Nom, ticker, ISIN ou mot-clé, par exemple « LVMH », « MC », « FR0000121014 » ou « semi-conducteurs »" }, region: { type: "string", enum: ["FR", "EU", "US", "MONDE"], description: "Facultatif : FR France, EU Europe, US États-Unis, MONDE reste du monde" }, limite: { type: "integer", minimum: 1, maximum: 25, description: "Nombre de résultats (10 par défaut)" } }, required: ["requete"] } },
  { name: "fiche_entreprise", title: "Fiche d'une entreprise",
    description: "Les chiffres clés d'une entreprise tirés de ses derniers comptes annuels officiels (chiffre d'affaires, croissance, marge, bénéfice, rentabilité, dette, trésorerie, dividende), chacun avec la médiane des entreprises du même secteur et un repère vert (point fort), gris (dans la moyenne) ou orange (point de vigilance) selon des seuils publiés ; l'historique sur plusieurs années, le cours différé avec le PER et le rendement, l'éligibilité au PEA, les prochaines dates et les sources (rapport ESEF ou SEC).",
    inputSchema: { type: "object", properties: { entreprise: { ...TXT, description: "Identifiant (par exemple « lvmh »), nom, ticker ou ISIN" } }, required: ["entreprise"] } },
  { name: "comparer_entreprises", title: "Comparer des entreprises",
    description: "Compare de 2 à 6 entreprises côte à côte sur les mêmes chiffres de leurs derniers comptes annuels (ventes, croissance, marge, bénéfice, rentabilité, dette, dividende, PER), avec la médiane du secteur et le repère vert, gris ou orange de chacune.",
    inputSchema: { type: "object", properties: { entreprises: { type: "array", items: TXT, minItems: 2, maxItems: 6, description: "Identifiants, noms, tickers ou ISIN" } }, required: ["entreprises"] } },
  { name: "eligibilite_pea", title: "Éligibilité au PEA",
    description: "Indique si une action ou un ETF peut être logé dans un PEA (plan d'épargne en actions), avec la règle qui s'applique et sa source légale.",
    inputSchema: { type: "object", properties: { titre: { ...TXT, description: "Nom, ticker ou ISIN d'une entreprise ou d'un ETF" } }, required: ["titre"] } },
  { name: "etf", title: "ETF : frais, indice et composition",
    description: "Les ETF (fonds indiciels) les plus utilisés en France : frais courants annuels, indice suivi, émetteur, éligibilité au PEA, distribution ou capitalisation, mode de réplication, et composition (principales lignes, pays) quand elle est disponible. Sans paramètre précis, liste les ETF correspondant aux filtres, du moins cher au plus cher.",
    inputSchema: { type: "object", properties: { requete: { ...TXT, description: "Nom, ISIN, ticker ou indice, par exemple « MSCI World », « S&P 500 », « FR001400U5Q4 »" }, pea: { type: "boolean", description: "Seulement les ETF éligibles au PEA" }, categorie: { type: "string", enum: ["actions-monde", "actions-usa", "actions-europe", "actions-france", "actions-emergents", "actions-asie", "theme", "dividendes", "facteurs", "immobilier", "obligations", "monetaire", "matieres"] }, limite: { type: "integer", minimum: 1, maximum: 30 } } } },
  { name: "calendrier", title: "Calendrier financier",
    description: "Les prochaines dates officielles des entreprises suivies : publications de résultats, détachements de dividende, assemblées générales, avec la source de chaque date. Filtrable par entreprise et par type.",
    inputSchema: { type: "object", properties: { entreprise: { ...TXT, description: "Facultatif : identifiant, nom, ticker ou ISIN" }, type: { type: "string", enum: ["resultats", "dividende", "assemblee"] }, jours: { type: "integer", minimum: 1, maximum: 366, description: "Horizon en jours (60 par défaut)" }, limite: { type: "integer", minimum: 1, maximum: 100 } } } },
  { name: "lecon", title: "Leçon de l'Académie",
    description: "Cherche dans l'Académie de bilan. (cours gratuits de culture financière : épargne, PEA, ETF, lecture des comptes, valorisation, frais, fiscalité, psychologie de l'investisseur) la leçon qui répond à un sujet, et renvoie son contenu, un exemple chiffré, ce qu'il faut retenir et ses sources.",
    inputSchema: { type: "object", properties: { sujet: { ...TXT, description: "Le sujet, par exemple « intérêts composés », « PER », « fiscalité du PEA »" } }, required: ["sujet"] } },
  { name: "search", title: "Recherche (compatibilité ChatGPT)",
    description: "Recherche générale dans bilan. : entreprises, ETF et leçons de l'Académie. Renvoie des identifiants à lire avec l'outil fetch.",
    inputSchema: { type: "object", properties: { query: { ...TXT, description: "Ce que vous cherchez" } }, required: ["query"] } },
  { name: "fetch", title: "Lire un document (compatibilité ChatGPT)",
    description: "Lit le document complet correspondant à un identifiant renvoyé par search (« entreprise:lvmh », « etf:amundi-msci-world-pea », « lecon:bases/interets-composes »).",
    inputSchema: { type: "object", properties: { id: { ...TXT, description: "Identifiant renvoyé par search" } }, required: ["id"] } },
].map(t => ({ ...t, annotations: { title: t.title, ...RO } }));

class Erreur extends Error { }
const sourcesSite = (origin, p, extra = []) => [...extra, { titre: "bilan.", url: lien(origin, p) }];
const pied = sources => `\n\nSources : ${sources.map(s => `${s.titre} (${s.url})`).join(" ; ")}.\n${AVERT}`;

async function ficheSociete(env, origin, ctx, B, c) {
  const P = await optionnel(prix(env, origin, ctx), { items: {}, fx: null });
  const det = await optionnel(charger(env, origin, `/data/societes/${c.id}.json`, 18e5), null);
  const out = { ...resumeSociete(B, c, origin), devise_des_comptes: c.currency || null, exercice: c.year || null, fin_d_exercice: det && det.fyEnd || null };
  if (c.fiche) out.presentation = { ce_qu_elle_fait: c.fiche.fait || null, comment_elle_gagne_de_l_argent: c.fiche.argent || null, de_quoi_elle_depend: c.fiche.depend || null };
  const sources = [];
  if (c.missing) { out.comptes = null; out.note_comptes = "Les comptes de cette entreprise ne sont pas encore lus par bilan."; }
  else {
    const med = B.MED[c.sector] || {};
    out.secteur_compare = { nom: B.sectors[c.sector] || c.sector, entreprises: med.n || 0, note: (med.n || 0) >= 3 ? "Médianes calculées sur les entreprises du même secteur suivies par bilan., toutes régions." : "Trop peu d'entreprises du secteur pour une médiane fiable." };
    out.chiffres_cles = { chiffre_affaires: c.ca, chiffre_affaires_precedent: c.caPrev, resultat_exploitation: c.ebit, benefice_net: c.net, benefice_net_precedent: c.netPrev, capitaux_propres: c.equity, dette_nette: c.netDebt, ebitda: c.ebitda, tresorerie_disponible: c.fcf, dividendes_verses: c.divPaid, dividende_par_action: c.dps, benefice_par_action: c.eps, unite: `millions de ${c.currency || "€"} (par action : ${c.currency || "€"})` };
    out.reperes = reperes(c, B.MED);
    if (det && Array.isArray(det.years) && det.fin) {
      const a = k => det.fin[k] || [];
      out.historique = det.years.map((y, i) => ({ annee: y, chiffre_affaires: a("ca")[i] ?? null, resultat_exploitation: a("ebit")[i] ?? null, benefice_net: a("net")[i] ?? null, marge_exploitation: a("ca")[i] > 0 && a("ebit")[i] != null ? r4(a("ebit")[i] / a("ca")[i]) : null, dette_nette: a("netDebt")[i] ?? null, dividende_par_action: a("dps")[i] ?? null }));
      for (const s of (det.sources || []).slice(0, 3)) if (s && s.report) sources.push({ titre: `${/sec\.gov/.test(s.report) ? "Rapport annuel déposé à la SEC (EDGAR)" : "Rapport financier annuel ESEF (filings.xbrl.org)"}${s.periodEnd ? ", exercice clos " + s.periodEnd : ""}`, url: s.report });
    }
  }
  const v = !c.missing ? valo(c, P) : null, pxl = P.items["c:" + c.id];
  if (pxl) {
    const mp = medPE(B, P)[c.sector];
    out.bourse = { cours: pxl.p, devise: pxl.cur, variation_du_jour_pct: pxl.chg ?? null, plus_haut_52_semaines: pxl.h52 ?? null, plus_bas_52_semaines: pxl.l52 ?? null, capitalisation_eur: v && v.capE ? Math.round(v.capE) : null,
      per: v && v.pe ? r2(v.pe) : null, per_median_secteur: mp ? r2(mp.m) : null,
      per_position: v && v.pe && mp ? (v.pe > mp.m * 1.3 ? "plus cher que la plupart des entreprises du secteur" : v.pe < mp.m * 0.75 ? "moins cher que la plupart des entreprises du secteur" : "dans la moyenne du secteur") : null,
      rendement_dividende: v && v.yld != null ? r4(v.yld) : null, source: P.source, releve: P.updated,
      note: "Le PER n'est ni bon ni mauvais en soi : un PER élevé traduit une croissance attendue plus forte, un PER bas une croissance attendue plus faible ou un risque perçu. Moins cher ne veut pas dire « bonne affaire »." };
  }
  out.pea = peaSociete(c);
  const today = jourParis();
  out.prochaines_dates = B.events.filter(e => e.id === c.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map(e => ({ date: e.date, type: e.type || null, libelle: e.label || null, estimee: !!e.estimee, source: e.source || null }));
  out.sources = sourcesSite(origin, "/entreprise/" + c.id + (c.missing ? "" : "/comptes"), sources);
  out.avertissement = AVERT;
  // Texte lisible pour le modèle
  const L = [`${c.name} (${c.ticker}${c.isin ? ", ISIN " + c.isin : ""}) · ${out.secteur} · ${out.region}`];
  if (c.desc) L.push(c.desc);
  if (out.presentation && out.presentation.ce_qu_elle_fait) L.push(`Ce qu'elle fait : ${out.presentation.ce_qu_elle_fait} ${out.presentation.comment_elle_gagne_de_l_argent || ""}`.trim());
  if (c.missing) L.push(out.note_comptes);
  else {
    L.push(`\nDerniers comptes annuels : exercice ${c.year}, en ${c.currency}. Comparaison avec ${out.secteur_compare.entreprises} entreprises du secteur « ${out.secteur_compare.nom} ».`);
    for (const r of out.reperes) L.push(`- ${r.libelle} : ${r.valeur_texte} · repère ${r.verdict} (${r.verdict_texte})${r.mediane_texte ? ` · médiane du secteur : ${r.mediane_texte}` : ""}. ${r.explication}`);
    if (out.historique) L.push(`\nHistorique (${c.currency}, millions) : ` + out.historique.map(h => `${h.annee} : ventes ${h.chiffre_affaires != null ? F0.format(h.chiffre_affaires) : "–"}, bénéfice ${h.benefice_net != null ? F0.format(h.benefice_net) : "–"}${h.marge_exploitation != null ? `, marge ${pct(h.marge_exploitation, 1, false)}` : ""}`).join(" ; ") + ".");
  }
  if (out.bourse) L.push(`\nCours : ${pxFmt(out.bourse.cours, out.bourse.devise)}${out.bourse.variation_du_jour_pct != null ? ` (${out.bourse.variation_du_jour_pct > 0 ? "+" : ""}${F2.format(out.bourse.variation_du_jour_pct)} % sur la séance)` : ""}, ${P.source}${P.updated ? ", relevé du " + dLabel(String(P.updated)) : ""}.${out.bourse.capitalisation_eur ? ` Valeur en Bourse : ${capFmt(out.bourse.capitalisation_eur)}.` : ""}${out.bourse.per ? ` PER : ${F1.format(out.bourse.per)}${out.bourse.per_median_secteur ? ` (médiane du secteur : ${F1.format(out.bourse.per_median_secteur)}, ${out.bourse.per_position})` : ""}.` : ""}${out.bourse.rendement_dividende != null ? ` Rendement du dividende : ${pct(out.bourse.rendement_dividende, 1, false)}.` : ""}`);
  L.push(`\nPEA : ${out.pea.raison}`);
  if (out.prochaines_dates.length) L.push("Prochaines dates : " + out.prochaines_dates.map(e => `${dLabel(e.date)}, ${e.libelle || e.type}${e.estimee ? " (date estimée)" : ""}`).join(" ; ") + ".");
  L.push(`\nRègle de lecture des repères : vert = point fort, gris = dans la moyenne, orange = point de vigilance, selon des seuils publiés sur ${lien(origin, "/methode")}. Ce sont des repères de lecture des comptes passés, pas une note de l'action.`);
  return { texte: L.join("\n") + pied(out.sources), donnees: out };
}

async function outil(name, a, env, origin, ctx) {
  const B = await base(env, origin);
  const str = (v, champ, max = 200) => { if (typeof v !== "string" || !v.trim()) throw new Erreur(`Paramètre « ${champ} » manquant.`); return v.trim().slice(0, max); };
  const entier = (v, d, min, max) => Number.isInteger(v) ? Math.max(min, Math.min(max, v)) : d;
  const exiger = q => { const c = trouverSociete(B, q); if (c) return c; const s = chercherSocietes(B, q, 5); throw new Erreur(`Entreprise introuvable : « ${q} ».${s.length ? " Vouliez-vous dire : " + s.map(x => `${x.name} (${x.id})`).join(", ") + " ?" : " Utilisez rechercher_entreprise."}`); };

  if (name === "rechercher_entreprise") {
    const q = str(a.requete, "requete"), n = entier(a.limite, 10, 1, 25), region = ["FR", "EU", "US", "MONDE"].includes(a.region) ? a.region : null;
    const l = chercherSocietes(B, q, n, { region }).map(c => resumeSociete(B, c, origin)), e = chercherEtf(B, q, 5).map(x => ({ id: x.id, nom: x.name, isin: x.isin, indice: x.index, lien: lien(origin, "/etf/" + x.id) }));
    const src = sourcesSite(origin, "/entreprises");
    const texte = (l.length ? `${l.length} entreprise(s) pour « ${q} » :\n` + l.map(c => `- ${c.nom} (id : ${c.id}, ${c.ticker}${c.isin ? ", " + c.isin : ""}) · ${c.secteur} · ${c.region}${c.activite ? " · " + c.activite : ""} · ${c.lien}`).join("\n") : `Aucune entreprise suivie ne correspond à « ${q} ».`)
      + (e.length ? `\nETF correspondants :\n` + e.map(x => `- ${x.nom} (id : ${x.id}, ${x.isin}) · ${x.lien}`).join("\n") : "") + pied(src);
    return { texte, donnees: { entreprises: l, etf: e, sources: src, avertissement: AVERT } };
  }
  if (name === "fiche_entreprise") return ficheSociete(env, origin, ctx, B, exiger(str(a.entreprise, "entreprise")));
  if (name === "comparer_entreprises") {
    if (!Array.isArray(a.entreprises) || a.entreprises.length < 2) throw new Erreur("Donnez au moins deux entreprises dans « entreprises ».");
    const cs = [...new Map(a.entreprises.slice(0, 6).map(q => exiger(str(q, "entreprises"))).map(c => [c.id, c])).values()];
    if (cs.length < 2) throw new Erreur("Donnez au moins deux entreprises différentes.");
    const P = await optionnel(prix(env, origin, ctx), { items: {}, fx: null }), MP = medPE(B, P);
    const lignes = cs.map(c => { const v = c.missing ? null : valo(c, P), mp = MP[c.sector];
      return { ...resumeSociete(B, c, origin), exercice: c.year || null, devise: c.currency || null, chiffre_affaires: c.ca ?? null, reperes: c.missing ? [] : reperes(c, B.MED), per: v && v.pe ? r2(v.pe) : null, per_median_secteur: mp ? r2(mp.m) : null, rendement_dividende: v && v.yld != null ? r4(v.yld) : null, pea: peaSociete(c).eligible }; });
    const cles = ["croissance", "marge", "benefice", "rentabilite", "dette", "tresorerie", "dividende"], lib = { croissance: "Croissance des ventes", marge: "Marge d'exploitation", benefice: "Bénéfice net", rentabilite: "Rentabilité des capitaux propres", dette: "Endettement", tresorerie: "Trésorerie disponible", dividende: "Dividende" };
    const cell = (l, k) => { const r = l.reperes.find(x => x.cle === k); return r ? `${r.valeur_texte} (${r.verdict}${r.mediane_texte ? ", secteur " + r.mediane_texte : ""})` : "–"; };
    const T = [`| | ${lignes.map(l => l.nom).join(" | ")} |`, `|---|${lignes.map(() => "---").join("|")}|`, `| Secteur | ${lignes.map(l => l.secteur).join(" | ")} |`, `| Exercice | ${lignes.map(l => l.exercice ? l.exercice + " (" + l.devise + ")" : "comptes non lus").join(" | ")} |`,
      `| Chiffre d'affaires | ${lignes.map(l => l.chiffre_affaires != null ? big(l.chiffre_affaires, l.devise) : "–").join(" | ")} |`, ...cles.map(k => `| ${lib[k]} | ${lignes.map(l => cell(l, k)).join(" | ")} |`),
      `| PER | ${lignes.map(l => l.per ? F1.format(l.per) + (l.per_median_secteur ? ` (secteur ${F1.format(l.per_median_secteur)})` : "") : "–").join(" | ")} |`, `| Rendement du dividende | ${lignes.map(l => l.rendement_dividende != null ? pct(l.rendement_dividende, 1, false) : "–").join(" | ")} |`,
      `| PEA | ${lignes.map(l => l.pea === true ? "oui" : l.pea === false ? "non" : "non déterminé").join(" | ")} |`];
    const src = sourcesSite(origin, "/comparer?ids=" + cs.map(c => c.id).join(","));
    return { texte: `Comparaison de ${cs.map(c => c.name).join(", ")} (derniers comptes annuels ; entre parenthèses : repère vert, gris ou orange et médiane du secteur de chaque entreprise). Les montants sont dans la devise des comptes de chaque entreprise.\n\n${T.join("\n")}` + pied(src), donnees: { entreprises: lignes, sources: src, avertissement: AVERT } };
  }
  if (name === "eligibilite_pea") {
    const q = str(a.titre, "titre"), qq = q.toLowerCase(), e = B.etfs.find(x => x.id === qq || x.isin.toLowerCase() === qq || norm(x.ticker) === norm(q)) || null, c = e ? null : trouverSociete(B, q);
    let d;
    if (e) d = { type: "etf", nom: e.name, isin: e.isin, eligible: !!e.pea, raison: e.pea ? `Oui : ${e.name} est un ETF éligible au PEA${e.replication === "synthétique" ? " (il reproduit son indice par un mécanisme d'échange, ce qui permet de suivre un indice non européen)" : ""}.` : `Non : ${e.name} n'est pas éligible au PEA ; il s'achète sur un compte-titres ou, parfois, en assurance-vie.`, lien: lien(origin, "/etf/" + e.id) };
    else if (c) d = { type: "action", nom: c.name, isin: c.isin || null, ...peaSociete(c), lien: lien(origin, "/entreprise/" + c.id) };
    else if (/^[A-Z]{2}[A-Z0-9]{9}\d$/i.test(q)) { const pays = q.slice(0, 2).toUpperCase(), ok = EEA.has(pays);
      d = { type: "inconnu", nom: null, isin: q.toUpperCase(), eligible: null, raison: `Ce code ISIN n'est pas suivi par bilan. Il commence par ${pays} : ${ok ? "si c'est l'action d'une société de ce pays, elle relève en principe du PEA" : "si c'est l'action d'une société de ce pays, elle n'est pas éligible au PEA"}. Pour un fonds, le pays de l'ISIN ne suffit pas : vérifiez la mention « éligible PEA » dans son document d'informations clés.` }; }
    else throw new Erreur(`Titre introuvable : « ${q} ». Essayez son code ISIN, ou rechercher_entreprise et etf.`);
    const src = [PEA_SRC, { titre: "bilan., PEA ou compte-titres", url: lien(origin, "/pea-cto") }];
    return { texte: `${d.nom || d.isin} : ${d.raison}\n\nLa règle : ${PEA_REGLE}` + pied(src), donnees: { ...d, regle: PEA_REGLE, sources: src, avertissement: AVERT } };
  }
  if (name === "etf") {
    const n = entier(a.limite, 10, 1, 30), cats = new Set(B.etfs.map(e => e.categorie));
    let l = a.requete ? chercherEtf(B, str(a.requete, "requete"), 60) : [...B.etfs].sort((x, y) => (x.ter ?? 9) - (y.ter ?? 9));
    if (a.pea === true) l = l.filter(e => e.pea); if (a.categorie && cats.has(a.categorie)) l = l.filter(e => e.categorie === a.categorie);
    if (!l.length) throw new Erreur("Aucun ETF suivi ne correspond. Essayez un indice (« MSCI World », « S&P 500 », « CAC 40 ») ou retirez un filtre.");
    const q = String(a.requete || "").trim().toLowerCase(), precis = a.requete && (l.length === 1 || l[0].id === q || l[0].isin.toLowerCase() === q || norm(l[0].ticker) === norm(q) || norm(l[0].name) === norm(q));
    const fmtE = e => ({ id: e.id, nom: e.name, isin: e.isin, ticker: e.ticker, emetteur: e.issuer, indice: e.index, categorie: e.categorie, frais_courants_pct: e.ter ?? null, pea: !!e.pea, distribution: e.distribution || null, replication: e.replication || null, devise: e.devise || null, encours_millions_eur: e.encours ?? null, lien: lien(origin, "/etf/" + e.id) });
    if (precis) {
      const e = l[0], d = fmtE(e), src = [{ titre: `bilan., ${e.name}`, url: d.lien }];
      if (e.fiche) d.presentation = { ce_que_c_est: e.fiche.quoi || null, ce_qu_il_contient: e.fiche.contenu || null, ce_qui_le_fait_varier: e.fiche.varie || null };
      const comp = e.proxy ? await optionnel(charger(env, origin, `/data/etf/${e.proxy}.json`, 36e5), null) : null;
      if (comp) {
        d.composition = { note: `Composition du fonds ${comp.proxy}, coté aux États-Unis et qui suit le même indice, déclarée à la SEC (formulaire N-PORT) au ${comp.asOf}. Celle de ${e.name} en est très proche sans être identique.`, au: comp.asOf, nombre_de_lignes: comp.lines ?? null,
          principales_lignes: (comp.top || []).slice(0, 10).map(x => ({ nom: x.name, isin: x.isin || null, poids_pct: x.pct, pays: x.country || null })), pays: (comp.countries || []).slice(0, 10).map(([p, w]) => ({ pays: p, poids_pct: w })) };
        src.unshift({ titre: comp.source || "SEC, formulaire N-PORT", url: comp.url });
      }
      d.sources = src; d.avertissement = AVERT;
      const T = [`${e.name} (ISIN ${e.isin}, ${e.ticker}) · émetteur ${e.issuer} · indice ${e.index}`, `Frais courants : ${e.ter != null ? F2.format(e.ter) + " % par an" : "non renseignés"} · PEA : ${e.pea ? "éligible" : "non éligible"} · ${e.distribution || ""}${e.replication ? " · réplication " + e.replication : ""}${e.encours ? ` · encours d'environ ${F0.format(e.encours)} M€` : ""}`];
      if (d.presentation) T.push([d.presentation.ce_que_c_est, d.presentation.ce_qu_il_contient, d.presentation.ce_qui_le_fait_varier].filter(Boolean).join(" "));
      if (d.composition) T.push(`\n${d.composition.note}\nPrincipales lignes : ${d.composition.principales_lignes.map(x => `${x.nom} ${F2.format(x.poids_pct)} %`).join(", ")}.\nPays : ${d.composition.pays.map(x => `${x.pays} ${F1.format(x.poids_pct)} %`).join(", ")}.`);
      return { texte: T.join("\n") + pied(src), donnees: d };
    }
    const sel = l.slice(0, n).map(fmtE), src = sourcesSite(origin, "/etf");
    return { texte: `${sel.length} ETF${a.pea ? " éligibles au PEA" : ""}${a.requete ? ` pour « ${a.requete} »` : ""}, du moins cher au plus cher (frais courants annuels) :\n` + sel.map(e => `- ${e.nom} (id : ${e.id}, ${e.isin}) · ${e.indice} · ${e.frais_courants_pct != null ? F2.format(e.frais_courants_pct) + " %" : "frais non renseignés"} · PEA ${e.pea ? "oui" : "non"} · ${e.distribution || ""} · ${e.lien}`).join("\n") + pied(src), donnees: { etf: sel, sources: src, avertissement: AVERT } };
  }
  if (name === "calendrier") {
    const jours = entier(a.jours, 60, 1, 366), n = entier(a.limite, 30, 1, 100), today = jourParis(), fin = jourParis(Date.now() + jours * 864e5);
    const c = a.entreprise ? exiger(str(a.entreprise, "entreprise")) : null, TY = { resultats: /r[ée]sultat/i, dividende: /dividende/i, assemblee: /assembl/i }[a.type];
    const l = B.events.filter(e => e.date >= today && e.date <= fin && (!c || e.id === c.id) && (!TY || TY.test(e.type + " " + (e.label || "")))).sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id)).slice(0, n)
      .map(e => ({ date: e.date, entreprise: B.BY[e.id].name, id: e.id, type: e.type || null, libelle: e.label || null, estimee: !!e.estimee, source: e.source || null, lien: lien(origin, "/entreprise/" + e.id + "/agenda") }));
    const src = sourcesSite(origin, c ? "/entreprise/" + c.id + "/agenda" : "/agenda");
    return { texte: (l.length ? `${l.length} date(s) d'ici le ${dLabel(fin)}${c ? " pour " + c.name : ""} :\n` + l.map(e => `- ${dLabel(e.date)} · ${e.entreprise} · ${e.libelle || e.type}${e.estimee ? " (date estimée)" : ""}${e.source ? " · source : " + e.source : ""}`).join("\n") : `Aucune date connue d'ici le ${dLabel(fin)}${c ? " pour " + c.name : ""}.`) + "\nLes dates sont relevées sur les calendriers financiers officiels des entreprises ; elles peuvent changer." + pied(src), donnees: { dates: l, sources: src, avertissement: AVERT } };
  }
  if (name === "lecon") {
    const l = chercherLecons(B, str(a.sujet, "sujet"), 5);
    if (!l.length) throw new Erreur(`Aucune leçon de l'Académie ne correspond à « ${a.sujet} ». Essayez un mot plus simple (« PEA », « ETF », « dividende », « inflation »).`);
    return lecon(B, l[0], origin, l.slice(1));
  }
  if (name === "search") {
    const q = str(a.query, "query");
    const res = [...chercherSocietes(B, q, 6).map(c => ({ id: "entreprise:" + c.id, title: `${c.name} (${c.ticker}) · ${B.sectors[c.sector] || c.sector}`, url: lien(origin, "/entreprise/" + c.id) })),
      ...chercherEtf(B, q, 4).map(e => ({ id: "etf:" + e.id, title: `ETF ${e.name}`, url: lien(origin, "/etf/" + e.id) })),
      ...chercherLecons(B, q, 4).map(({ m, l }) => ({ id: `lecon:${m.id}/${l.id}`, title: `Leçon : ${l.titre}`, url: lien(origin, `/academie/${m.id}/${l.id}`) }))];
    return { texte: JSON.stringify({ results: res }), donnees: { results: res } };
  }
  if (name === "fetch") {
    const id = str(a.id, "id"), [k, v] = [id.split(":")[0], id.slice(id.indexOf(":") + 1)];
    let r;
    if (k === "entreprise") { const c = B.BY[v]; if (!c) throw new Erreur("Document introuvable : " + id); r = await ficheSociete(env, origin, ctx, B, c); r.titre = c.name; r.url = lien(origin, "/entreprise/" + c.id); }
    else if (k === "etf") { if (!B.etfs.find(e => e.id === v)) throw new Erreur("Document introuvable : " + id); r = await outil("etf", { requete: v }, env, origin, ctx); r.titre = "ETF " + B.etfs.find(e => e.id === v).name; r.url = lien(origin, "/etf/" + v); }
    else if (k === "lecon") { const [mid, lid] = v.split("/"), m = (B.aca.modules || []).find(x => x.id === mid), l = m && m.lecons.find(x => x.id === lid); if (!l) throw new Erreur("Document introuvable : " + id); r = lecon(B, { m, l }, origin, []); r.titre = l.titre; r.url = lien(origin, `/academie/${m.id}/${l.id}`); }
    else throw new Erreur("Identifiant inconnu : " + id);
    const doc = { id, title: r.titre, text: r.texte, url: r.url, metadata: { source: "bilan.", avertissement: AVERT } };
    return { texte: JSON.stringify(doc), donnees: doc };
  }
  throw new Erreur("inconnu");
}
function chercherLecons(B, sujet, n) {
  const toks = norm(sujet).split(" ").filter(t => t.length > 1 && !["le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "au", "aux", "que", "quoi", "est", "ce", "comment", "pourquoi", "mon", "ma", "mes"].includes(t));
  if (!toks.length) return [];
  const out = [];
  for (const m of B.aca.modules || []) for (const l of m.lecons || []) {
    const ti = norm(l.titre), re = norm(l.resume), co = norm((l.paragraphes || []).join(" ") + " " + (l.a_retenir || []).join(" "));
    let s = 0; for (const t of toks) { if (ti.includes(t)) s += 6; if (re.includes(t)) s += 3; if (co.includes(t)) s += 1; }
    if (ti.includes(toks.join(" "))) s += 8;
    if (s > 0) out.push({ m, l, s });
  }
  return out.sort((a, b) => b.s - a.s).slice(0, n);
}
function lecon(B, { m, l }, origin, autres) {
  const url = lien(origin, `/academie/${m.id}/${l.id}`), src = [...(l.sources || []).map(s => ({ titre: s.label, url: s.url })), { titre: "bilan., l'Académie", url }];
  const d = { module: m.titre, titre: l.titre, duree_min: l.duree_min || null, premium: !!l.premium, resume: l.resume || null, a_retenir: l.a_retenir || [], lien: url, sources: src, avertissement: AVERT };
  if (!l.premium) Object.assign(d, { contenu: l.paragraphes || [], exemple: l.exemple || null, erreur_frequente: l.erreur_frequente || null });
  d.autres_lecons = autres.map(x => ({ titre: x.l.titre, lien: lien(origin, `/academie/${x.m.id}/${x.l.id}`) }));
  const T = [`Leçon « ${l.titre} » (module « ${m.titre} »${l.duree_min ? `, ${l.duree_min} min` : ""})`, l.resume || ""];
  if (!l.premium) { T.push(...(l.paragraphes || [])); if (l.exemple) T.push("Exemple : " + l.exemple); if (l.erreur_frequente) T.push("Erreur fréquente : " + l.erreur_frequente); }
  else T.push(`Le texte complet de cette leçon est réservé aux membres Premium de bilan. : ${url}`);
  if ((l.a_retenir || []).length) T.push("À retenir :\n" + l.a_retenir.map(x => "- " + x).join("\n"));
  if (d.autres_lecons.length) T.push("Autres leçons proches : " + d.autres_lecons.map(x => `${x.titre} (${x.lien})`).join(" ; "));
  return { texte: T.filter(Boolean).join("\n\n") + pied(src), donnees: d };
}

/* ---------- Débit ---------- */
const MINUTE = new Map(), PAR_MINUTE = 240, PAR_JOUR = 30000;
async function debit(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "local", now = Date.now(), w = MINUTE.get(ip);
  if (!w || now - w.t > 6e4) MINUTE.set(ip, { t: now, n: 1 }); else if (++w.n > PAR_MINUTE) return "Trop de requêtes en une minute. Réessayez dans un instant.";
  if (MINUTE.size > 5000) MINUTE.clear();
  if (!env.DB) return null;
  try {
    const jour = new Date().toISOString().slice(0, 10), who = "mcp:" + await visitor(request, env);
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS usage (who TEXT NOT NULL, jour TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (who, jour, kind))`).run();
    const r = await env.DB.prepare(`INSERT INTO usage (who, jour, kind, n) VALUES (?, ?, 'mcp', 1) ON CONFLICT (who, jour, kind) DO UPDATE SET n = n + 1 RETURNING n`).bind(who, jour).first();
    if (r && r.n > PAR_JOUR) return "Limite du jour atteinte pour cette connexion. Elle revient demain.";
  } catch (e) { } // compteur indisponible : on laisse passer
  return null;
}

/* ---------- Protocole ---------- */
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, DELETE, OPTIONS", "access-control-allow-headers": "content-type, accept, authorization, mcp-protocol-version, mcp-session-id, last-event-id", "access-control-expose-headers": "mcp-session-id, mcp-protocol-version", "access-control-max-age": "86400" };
const rep = (body, status = 200, h = {}) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { ...(body == null ? {} : { "content-type": "application/json; charset=utf-8" }), "cache-control": "no-store", ...CORS, ...h } });
const err = (id, code, message, data) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });

async function traiter(msg, request, env, origin, ctx) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") return err(msg && msg.id, -32600, "Requête JSON-RPC invalide.");
  if (msg.method === undefined) return null; // réponse du client à une requête : rien à faire
  if (typeof msg.method !== "string") return err(msg.id, -32600, "Requête JSON-RPC invalide.");
  const notification = !("id" in msg);
  if (notification) return null; // notifications/initialized, notifications/cancelled… : acquittées
  const id = msg.id, p = msg.params && typeof msg.params === "object" ? msg.params : {};
  if (msg.method === "initialize") {
    const v = VERSIONS.includes(p.protocolVersion) ? p.protocolVersion : VERSIONS[0];
    return { jsonrpc: "2.0", id, result: { protocolVersion: v, capabilities: { tools: { listChanged: false } },
      serverInfo: { ...INFO, ...(v >= "2025-11-25" ? { websiteUrl: origin + "/connecteur", icons: [{ src: origin + "/icons/icon-192.png", mimeType: "image/png", sizes: ["192x192"] }, { src: origin + "/icons/favicon.svg", mimeType: "image/svg+xml", sizes: ["any"] }] } : {}) },
      instructions: INSTRUCTIONS } };
  }
  if (msg.method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (msg.method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  if (msg.method === "tools/call") {
    const t = TOOLS.find(x => x.name === p.name);
    if (!t) return err(id, -32602, `Outil inconnu : ${p.name}`);
    const lim = await debit(request, env);
    if (lim) return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: lim }], isError: true } };
    try {
      const r = await outil(t.name, p.arguments && typeof p.arguments === "object" ? p.arguments : {}, env, origin, ctx);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: r.texte }], structuredContent: r.donnees, isError: false } };
    } catch (e) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: e instanceof Erreur ? e.message : "Données momentanément indisponibles. Réessayez dans un instant." }], isError: true } };
    }
  }
  if (["resources/list", "resources/templates/list", "prompts/list"].includes(msg.method)) return err(id, -32601, "Ce serveur ne propose que des outils.");
  return err(id, -32601, `Méthode inconnue : ${msg.method}`);
}

export async function mcp(request, env, ctx) {
  const url = new URL(request.url), origin = (env.SITE_URL && /^https:\/\//.test(env.SITE_URL) ? env.SITE_URL : url.origin).replace(/\/+$/, "");
  const m = request.method;
  if (m === "OPTIONS") return rep(null, 204);
  if (m === "GET") {
    const acc = request.headers.get("accept") || "";
    if (/text\/html/.test(acc) && !/text\/event-stream/.test(acc)) return new Response(null, { status: 302, headers: { location: "/connecteur", ...CORS } });
    return rep(null, 405, { allow: "POST, OPTIONS" });
  }
  if (m === "DELETE") return rep(null, 405, { allow: "POST, OPTIONS" });
  if (m !== "POST") return rep(null, 405, { allow: "POST, OPTIONS" });
  const pv = request.headers.get("mcp-protocol-version");
  if (pv && !VERSIONS.includes(pv)) return rep(err(null, -32600, `Version du protocole non prise en charge : ${pv}. Versions acceptées : ${VERSIONS.join(", ")}.`), 400);
  const t = await request.text();
  if (t.length > 65536) return rep(err(null, -32600, "Requête trop volumineuse."), 413);
  let body; try { body = JSON.parse(t); } catch (e) { return rep(err(null, -32700, "JSON illisible."), 400); }
  const lot = Array.isArray(body);
  if (lot && (!body.length || body.length > 20)) return rep(err(null, -32600, "Lot de requêtes vide ou trop grand."), 400);
  const res = (await Promise.all((lot ? body : [body]).map(x => traiter(x, request, env, origin, ctx)))).filter(Boolean);
  if (!res.length) return rep(null, 202);
  return rep(lot ? res : res[0]);
}
