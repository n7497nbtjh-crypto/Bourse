// Calculs du module « provenance » (cf/site/m/provenance.js), sans navigateur.
// Usage : node tests/t_provenance.mjs
// 1. Ratios ajoutés (ROCE avant impôt, valeur d'entreprise ÷ EBITDA, rendement du flux de trésorerie disponible) recalculés
//    à la main à partir des comptes publiés (fichiers cf/site/data/societes/<id>.json) pour LVMH, Apple et Sanofi.
// 2. Cohérence des chiffres dérivés par la collecte : dette nette = dette − trésorerie, flux disponible ≤ flux d'exploitation.
// 3. Dates : jours ouvrés, ancienneté des comptes. 4. « Vérifier une offre » : les trois issues sur la vraie liste de l'AMF.
import { readFileSync } from "node:fs";
import vm from "node:vm";
const D = p => JSON.parse(readFileSync(new URL("../cf/site/data/" + p, import.meta.url), "utf8"));
let ok = 0, ko = 0;
const t = (c, m) => { if (c) ok++; else { ko++; console.log("ÉCHEC", m); } };
const near = (a, b, m, tol = 1e-9) => t(a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m} : ${a} au lieu de ${b}`);

const S = D("societes.json"), C = D("cours.json"), FX = D("fx.json").eur, LN = D("listes-noires.json");
const RBY = Object.fromEntries(S.companies.map(c => [c.id, c]));
const noop = () => { };
const ctx = {
  TODAY: "2026-10-29", PXUP: C.updated, PX: C.items, FX, FULL: {}, RBY, ETFBY: {}, ETF: { list: [] }, R: S, INDI: {}, TERMS: {}, ALL: {},
  isBank: c => c.sector === "finance", okn: x => x != null && isFinite(x),
  toEur: (v, cur) => v == null || !cur ? null : v * (FX[cur] || (cur === "EUR" ? 1 : NaN)),
  pxOf: c => C.items["c:" + c.id] || null, esc: s => String(s), norm: s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
  dLabel: s => s, pct: x => (x * 100).toFixed(1) + " %", F1: { format: x => x.toFixed(1) }, F0: { format: x => x.toFixed(0) }, F2: { format: x => x.toFixed(2) },
  document: { head: { insertAdjacentHTML: noop }, addEventListener: noop, querySelectorAll: () => [] }, addEventListener: noop, window: {}, pop: { classList: { add: noop, remove: noop } },
  matchMedia: () => ({ matches: false }), setTimeout, clearTimeout, fetch: () => Promise.reject(new Error("hors ligne")), console, Promise, Math, Date, Number, String, Object, JSON, Set, isFinite, isNaN,
};
// valo() d'index.html (capitalisation en euros, PER, rendement), reprise telle quelle
vm.createContext(ctx);
const idx = readFileSync(new URL("../cf/site/index.html", import.meta.url), "utf8");
const valoSrc = idx.slice(idx.indexOf("function valo(c)"), idx.indexOf("let MEDPE"));
vm.runInContext(valoSrc, ctx);
vm.runInContext(readFileSync(new URL("../cf/site/m/provenance.js", import.meta.url), "utf8"), ctx);
const P = Object.assign(ctx, vm.runInContext("({ PROV_IND, PROV_NAT, provKey })", ctx));

// 1. Ratios : formule refaite à la main sur les comptes complets
for (const id of ["lvmh", "apple", "sanofi"]) {
  const s = RBY[id], c = D(`societes/${id}.json`), f = c.fin, L = c.years.length - 1;
  // le résumé de la liste reprend bien le dernier exercice des comptes complets
  for (const k of ["ca", "ebit", "net", "equity", "netDebt", "ebitda"]) near(s[k], f[k][L], `${id} : ${k} du résumé = comptes complets`);
  // chiffres dérivés par la collecte
  near(f.netDebt[L], f.debt[L] - f.cash[L], `${id} : dette nette = dette financière − trésorerie`, 1e-6);
  if (f.fcf && f.fcf[L] != null) t(f.fcf[L] <= f.cfo[L], `${id} : flux disponible ≤ flux d'exploitation`);
  // ROCE avant impôt
  near(P.provRoce(s), f.ebit[L] / (f.equity[L] + f.netDebt[L]), `${id} : ROCE`);
  // Valeur d'entreprise ÷ EBITDA : (capitalisation en euros + dette nette en euros) ÷ EBITDA en euros
  const px = C.items["c:" + id], fx = s.currency === "EUR" ? 1 : FX[s.currency], capE = px.cap * (px.cur === "EUR" ? 1 : FX[px.cur]);
  const v = P.valo(s);
  near(v.capE, capE, `${id} : capitalisation en euros`, 1e-9);
  near(P.provEvEbitda(s), (capE + f.netDebt[L] * 1e6 * fx) / (f.ebitda[L] * 1e6 * fx), `${id} : valeur d'entreprise ÷ EBITDA`);
  if (s.fcf != null) near(P.provRdtFcf(s), s.fcf * 1e6 * fx / capE, `${id} : rendement du flux de trésorerie disponible`);
  // taux de distribution (déjà affiché par le site) : dividendes versés ÷ résultat net
  near(s.divPaid / s.net, f.divPaid[L] / f.net[L], `${id} : taux de distribution`);
}
// Ordres de grandeur attendus (comptes publiés, cours du fichier) : rien d'aberrant
const lv = RBY.lvmh; t(P.provRoce(lv) > 0.15 && P.provRoce(lv) < 0.3, "LVMH : ROCE entre 15 et 30 %");
t(P.provEvEbitda(lv) > 5 && P.provEvEbitda(lv) < 20, "LVMH : VE/EBITDA entre 5 et 20");
const ap = RBY.apple; t(P.provRoce(ap) > 0.5, "Apple : ROCE très élevé (capitaux propres faibles)");
// Cas limites : banque, capitaux propres négatifs, EBITDA négatif → non calculé
t(P.provRoce({ ...lv, sector: "finance" }) === null, "banque : pas de ROCE");
t(P.provRoce({ ...lv, equity: -5 }) === null, "capitaux propres négatifs : pas de ROCE");
t(P.provEvEbitda({ ...lv, ebitda: -10 }) === null, "EBITDA négatif : pas de VE/EBITDA");
t(P.provEvEbitda({ ...lv, netDebt: null }) === null, "dette nette inconnue : pas de VE/EBITDA");

// Comptes périmés : ni PER, ni rendement, ni VE/EBITDA avec le cours d'aujourd'hui
const vieux = S.companies.find(c => c.year && c.year <= 2020 && C.items["c:" + c.id] && c.net > 0);
if (vieux) { const v = P.valo(vieux); t(v && v.vieux && v.pe === null && v.yld === null && P.provEvEbitda(vieux) === null, `comptes de ${vieux.year} (${vieux.id}) : PER et rendement non calculés`); }
t(P.valo(lv).vieux === false && P.valo(lv).pe > 0, "comptes récents : PER calculé");
t(P.provComptesPerimes({ year: 2025, clos: "2025-01-03" }) === true, "exercice 2025 clos en janvier 2025 : périmé (date de clôture connue)");

// 2. Registre : chaque indicateur a nom, formule, unité, nature, source
for (const [k, I] of Object.entries(P.PROV_IND)) t(I.nom && I.formule && I.unite && P.PROV_NAT[I.nature] && I.src, `registre complet : ${k}`);
for (const k of ["croissance", "marge", "marge_nette", "rentabilite", "dette", "per", "rendement", "distribution", "variation_1an", "capitalisation", "taille", "roce", "ev_ebitda", "rendement_fcf"]) t(P.provKey(k), `clé INDI reconnue : ${k}`);

// 3. Dates
t(P.provJoursOuvres("2026-10-29", "2026-10-29") === 0, "même jour : 0 jour ouvré");
t(P.provJoursOuvres("2026-10-23", "2026-10-26") === 1, "vendredi → lundi : 1 jour ouvré");
t(P.provJoursOuvres("2026-10-23", "2026-10-29") === 4, "vendredi → jeudi suivant : 4 jours ouvrés");
t(P.provComptesAge({ sources: [{ periodEnd: "2025-03-31" }], years: [2024] }).vieux === true, "comptes clos il y a 19 mois : anciens");
t(P.provComptesAge({ sources: [{ periodEnd: "2025-12-31" }], years: [2025] }).vieux === false, "comptes clos il y a 10 mois : récents");
t(P.provClos({ sources: [{ periodEnd: "2025" }], years: [2025], fyEnd: "09-27" }) === "2025-09-27", "date de clôture SEC : année + jour de clôture");

// 4. « Vérifier une offre »
const IDX = P.provLnIndex(LN.items);
const dom = IDX.find(i => i.dom && !i.n.includes("@") && i.n.length > 8);
t(P.provLnCherche(dom.n, IDX).issue === "trouve", `nom exact trouvé (${dom.n})`);
t(P.provLnCherche("https://www." + dom.dom + "/connexion?x=1", IDX).issue === "trouve", "adresse complète du site trouvée");
const mail = IDX.find(i => i.n.includes("@") && i.dom);
t(P.provLnCherche("jean.dupont@" + mail.dom, IDX).issue === "trouve", `adresse e-mail du même domaine trouvée (${mail.dom})`);
for (const q of ["ab", "inv", "crypto", "Trading", "invest gestion", "forex"]) t(P.provLnCherche(q, IDX).issue === "insuffisant", `recherche insuffisante : « ${q} »`);
t(P.provLnCherche("zzqx-societe-inexistante.fr", IDX).issue === "aucun", "aucune correspondance");
t(P.provLnCherche("Usurpation", IDX).issue !== "trouve" || P.provLnCherche("Usurpation", IDX).hits.every(h => /usurpation/i.test(h.n + h.s)), "la catégorie n'est plus prise pour un nom");
console.log(`${ok} vérifications, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
