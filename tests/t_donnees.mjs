// Chantier « calculs et données » : lecture des deux taxonomies d'un dépôt SEC, dettes locatives,
// dividende publié ou estimé, croissance sur exercices consécutifs, taux de change, médianes,
// indicateurs ajoutés. Les formules sont recoupées avec les comptes réellement collectés de
// LVMH, Apple et Microsoft.   node tests/t_donnees.mjs
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { extract, toSeries } from "../data/esef.mjs";
import { extractSec } from "../data/sec.mjs";
import { summary } from "../data/fetch_data.mjs";

let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log("ÉCHEC", m); } };
const near = (a, b, tol, m) => { n++; const good = a != null && Math.abs(a - b) <= tol; if (!good) { bad++; console.log("ÉCART", m, a, "attendu", b); } };

/* ---------- 1. Résumé : exercice précédent réel, dettes locatives, dividende estimé ---------- */
const fiche = {
  id: "x", name: "X", sector: "conso", currency: "EUR", years: [2021, 2024, 2025], fyEnd: "12-31", updated: "2026-10-29",
  sources: [{ periodEnd: "2025-12-31" }],
  tags: { net: [null, null, "part du groupe"], debt: [null, null, "emprunts, total publié, moins la trésorerie"], norme: ["IFRS", "IFRS", "IFRS"] },
  fin: { ca: [100, 200, 220], net: [10, 20, 22], dps: [null, null, null], dpsEst: [1, 2, 2.2], netDebt: [5, 6, 7], leases: [null, null, 3], netDebtBaux: [null, null, 10], ebitda: [20, 30, 33], capex: [8, 9, 10] },
};
const s = summary(fiche);
ok(s.year === 2025 && s.yearPrev === 2024, "exercice et exercice précédent réellement présents");
ok(s.dps === 2.2 && s.dpsE === 1, "dividende estimé : la valeur reste, la nature est dite (dpsE)");
ok(s.clos === "2025-12-31" && s.maj === "2026-10-29", "date de clôture et date de lecture (provenance)");
ok(s.leases === 3 && s.netDebtBaux === 10 && s.capex === 10, "dettes locatives, dette nette avec baux, investissements");
ok(s.norme === "IFRS", "référentiel comptable du dernier exercice");
const s2 = summary({ ...fiche, fin: { ca: [100, 200, 220], net: [10, 20, 22], dps: [null, null, 1.5], dpsEst: [1, 2, 2.2] } });
ok(s2.dps === 1.5 && s2.dpsE === undefined, "dividende publié : aucune marque d'estimation");

/* ---------- 2. Lecture des deux taxonomies d'un dépôt SEC (cause des comptes périmés) ---------- */
// Société passée des normes américaines aux IFRS : les anciens exercices restent sous « us-gaap »,
// les nouveaux sont sous « ifrs-full ». L'ancienne lecture ne gardait qu'une seule taxonomie, la plus
// fournie, donc les vieux exercices (Honda 2014, Itaú 2010, Toyota 2020, Sony 2021).
const row = (end, val, form = "20-F", start = null) => ({ start: start || undefined, end, val, form, filed: end, fy: 0 });
const an = (y, v) => row(`${y}-12-31`, v, "20-F", `${y}-01-01`);
const doc = {
  entityName: "Essai",
  facts: {
    "us-gaap": {
      Revenues: { units: { USD: [an(2012, 1000e6), an(2013, 1100e6), an(2014, 1200e6)] } },
      NetIncomeLoss: { units: { USD: [an(2012, 100e6), an(2013, 110e6), an(2014, 120e6)] } },
      OperatingIncomeLoss: { units: { USD: [an(2014, 150e6)] } },
      StockholdersEquity: { units: { USD: [row("2014-12-31", 900e6)] } },
    },
    "ifrs-full": {
      Revenue: { units: { USD: [an(2024, 2000e6), an(2025, 2100e6)] } },
      ProfitLossAttributableToOwnersOfParent: { units: { USD: [an(2024, 200e6), an(2025, 210e6)] } },
      ProfitLossFromOperatingActivities: { units: { USD: [an(2025, 300e6)] } },
      EquityAttributableToOwnersOfParent: { units: { USD: [row("2025-12-31", 1500e6)] } },
      Borrowings: { units: { USD: [row("2025-12-31", 400e6)] } },
      CashAndCashEquivalents: { units: { USD: [row("2025-12-31", 100e6)] } },
      LeaseLiabilities: { units: { USD: [row("2025-12-31", 50e6)] } },
      IncomeTaxExpenseContinuingOperations: { units: { USD: [an(2025, 60e6)] } },
      ProfitLossBeforeTax: { units: { USD: [an(2025, 270e6)] } },
    },
  },
};
const e = extractSec(doc), se = toSeries(e);
ok(se.years[se.years.length - 1] === 2025, "le dernier exercice vient de la taxonomie IFRS : " + JSON.stringify(se.years));
ok(se.years.includes(2014), "les anciens exercices en normes américaines sont conservés");
ok(e.tags.norme[2014] === "US GAAP" && e.tags.norme[2025] === "IFRS", "référentiel indiqué exercice par exercice");
near(se.fin.ca[se.years.length - 1], 2100, 1e-6, "chiffre d'affaires 2025 en millions");
near(se.fin.netDebt[se.years.length - 1], 300, 1e-6, "dette nette 2025 = 400 − 100");
near(se.fin.netDebtBaux[se.years.length - 1], 350, 1e-6, "dette nette avec dettes locatives = 400 + 50 − 100");
near(se.fin.tax[se.years.length - 1], 60, 1e-6, "charge d'impôt collectée");
near(se.fin.pretax[se.years.length - 1], 270, 1e-6, "résultat avant impôt collecté");
ok(/hors dettes locatives/.test(e.tags.debt[2025] || ""), "définition de la dette nette expliquée");
ok(e.tags.net[2025] === "part du groupe", "résultat net : part du groupe signalée");
const un = extractSec({ facts: { "us-gaap": doc.facts["us-gaap"] } });
ok(toSeries(un).years.join() === "2012,2013,2014", "société en normes américaines seules : inchangée");

// Changement de devise de présentation : la devise qui couvre l'exercice le plus récent l'emporte
const dev = extractSec({ facts: { "ifrs-full": {
  Revenue: { units: { ARS: [an(2018, 500e6), an(2019, 600e6), an(2020, 700e6)], USD: [an(2024, 20e6), an(2025, 22e6)] } },
  ProfitLoss: { units: { ARS: [an(2020, 70e6)], USD: [an(2024, 2e6), an(2025, 2.2e6)] } },
} } });
ok(dev.currency === "USD", "devise : celle des derniers exercices (" + dev.currency + ")");
ok(toSeries(dev).years.join() === "2024,2025", "exercices lus dans la nouvelle devise");

/* ---------- 3. ESEF : dettes locatives et étiquette du résultat ---------- */
const f = (concept, period, value, unit = "iso4217:EUR") => ({ value, dimensions: { concept, period, unit } });
const d2024 = "2024-01-01T00:00:00/2025-01-01T00:00:00";
const esef = extract({
  facts: {
    a: f("ifrs-full:Revenue", d2024, 1000e6), b: f("ifrs-full:ProfitLoss", d2024, 100e6),
    c: f("ifrs-full:Borrowings", "2024-12-31T00:00:00", 500e6), d: f("ifrs-full:CashAndCashEquivalents", "2024-12-31T00:00:00", 200e6),
    g: f("ifrs-full:NoncurrentLeaseLiabilities", "2024-12-31T00:00:00", 120e6), h: f("ifrs-full:CurrentLeaseLiabilities", "2024-12-31T00:00:00", 30e6),
    i: f("ifrs-full:CashFlowsFromUsedInOperatingActivities", d2024, 150e6), j: f("ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", d2024, -40e6),
    k: f("ifrs-full:PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities", d2024, -10e6),
  },
});
near(esef.years[2024].netDebt, 300, 1e-6, "ESEF : dette nette = 500 − 200");
near(esef.years[2024].netDebtBaux, 450, 1e-6, "ESEF : avec dettes locatives = 500 + 150 − 200");
near(esef.years[2024].leases, 150, 1e-6, "ESEF : dettes locatives = 120 + 30");
near(esef.years[2024].capex, 50, 1e-6, "ESEF : investissements conservés (40 + 10)");
near(esef.years[2024].fcf, 100, 1e-6, "ESEF : argent disponible = 150 − 50");
ok(/minoritaires/.test(esef.tags.net[2024] || ""), "ESEF : repli sur le résultat total signalé");

/* ---------- 4. Module du navigateur ---------- */
const PX = JSON.parse(readFileSync(new URL("../cf/site/data/cours.json", import.meta.url), "utf8")).items;
const FXR = JSON.parse(readFileSync(new URL("../cf/site/data/fx.json", import.meta.url), "utf8")).eur;
const ctx = {
  console, R: { companies: [] }, MED: {}, MEDI: {}, MEDPE: {}, PX,
  FX: FXR, FXE: { EUR: 1, USD: 0.92, GBP: 1.17, JPY: 0.0061, XYZ: 3 },
  median: a => { const l = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!l.length) return null; const k = Math.floor(l.length / 2); return l.length % 2 ? l[k] : (l[k - 1] + l[k]) / 2; },
  INDI: {}, PROV_IND: {}, PROV_ALIAS: {}, CUR: { EUR: "€", USD: "$" }, CURSYM: "€",
  F1: { format: x => String(Math.round(x * 10) / 10) }, pct: x => Math.round(x * 1000) / 10 + " %",
  isBank: c => c.sector === "finance", pxOf: c => PX["c:" + c.id] || null,
  caEur: c => c.ca > 0 ? c.ca * (ctx.FXE[c.currency] ?? 0) : 0,
  // valo() et medInd() appartiennent à m/provenance.js : on en donne une version équivalente
  toEur: (v, cur) => v == null || !cur ? null : v * (ctx.FX[cur] || ctx.FXE[cur] || (cur === "EUR" ? 1 : NaN)),
  provComptesPerimes: c => c && c.clos ? Math.floor((Date.now() - new Date(c.clos + "T12:00:00Z")) / (30.44 * 864e5)) > 15 : !!(c && c.year != null && c.year <= new Date().getUTCFullYear() - 2),
};
ctx.valo = c => {
  const p = ctx.pxOf(c); if (!p) return null;
  const vieux = ctx.provComptesPerimes(c);
  const capE = p.cap ? ctx.toEur(p.cap, p.cur) : null, netE = c.net != null ? ctx.toEur(c.net * 1e6, c.currency) : null;
  let pe = capE && netE > 0 ? capE / netE : null, yld = null;
  if (c.divPaid > 0.5 && capE) yld = ctx.toEur(c.divPaid * 1e6, c.currency) / capE;
  if (vieux) { pe = null; yld = null; }
  return { p, capE, pe, yld, vieux };
};
ctx.medInd = (sector, k) => ctx.median(ctx.R.companies.filter(c => c.sector === sector && !c.missing && !ctx.provComptesPerimes(c)).map(ctx.INDI[k][1]));
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../cf/site/m/donnees.js", import.meta.url), "utf8"), ctx, { filename: "donnees.js" });
const D = ctx;

// 4.1 comptes anciens : une seule règle
ok(D.donVieux({ clos: "2025-03-31", year: 2025 }) === true, "exercice clos en mars 2025 : périmé");
ok(D.donVieux({ clos: "2025-12-31", year: 2025 }) === false, "exercice clos fin 2025 : à jour");
ok(D.donVieux({ year: 2014 }) === true, "sans date de clôture, 2014 est périmé");
ok(D.donVieux({ missing: true }) === false, "entreprise sans comptes : pas « périmée »");
ok(D.donRetenue({ year: 2025, clos: "2025-12-31" }) === true && D.donRetenue({ missing: true }) === false, "filtre donRetenue");

// 4.2 dividende : nature explicite
ok(D.donDps({ dps: 14.31, dpsE: 1 }).estime === true, "dividende estimé reconnu (dpsE)");
ok(D.donDps({ dps: 2 }).estime === false, "dividende publié reconnu");
ok(D.donDps({ dps: null, dpsEst: 3 }).estime === true, "fiche détaillée : dpsEst est une estimation");
ok(D.donDps(null).v === null && D.donDpsNote({ dps: 1, dpsE: 1 }) === " (estimé)", "libellé pour les listes");

// 4.3 croissance seulement entre exercices consécutifs
near(D.donCroissance({ ca: 220, caPrev: 200, year: 2025, yearPrev: 2024 }).g1, 0.1, 1e-9, "croissance sur un an");
const g2 = D.donCroissance({ ca: 220, caPrev: 100, year: 2024, yearPrev: 2021 });
ok(g2.g1 === null && g2.ans === 3, "exercices non consécutifs : pas de « sur un an », 3 ans annoncés");
near(g2.multi, 1.2, 1e-9, "variation sur 3 ans conservée");
const g3 = D.donCroissance({ ca: 220, caPrev: 200 });
ok(g3.g1 != null && g3.verif === false, "période inconnue : chiffre gardé mais non vérifié");
ok(D.ratios({ ca: 220, caPrev: 100, year: 2024, yearPrev: 2021 }).g1 === null, "ratios() applique la règle");

// 4.4 taux de change : ceux de la BCE
ok(D.donFxSync() === true, "taux BCE appliqués");
near(ctx.FXE.USD, FXR.USD, 1e-12, "taux du dollar remplacé par celui de la BCE");
ok(ctx.FXE.EUR === 1, "l'euro reste à 1");
ok(ctx.FXE.XYZ === 3, "devise absente de la BCE : ancien taux conservé");
ok(ctx.FXE.CZK != null && ctx.FXE.TRY != null, "devises ajoutées (couronne tchèque, livre turque)");

// 4.5 LVMH, Apple, Microsoft : chaque formule recoupée avec les comptes collectés
for (const [id, sector] of [["lvmh", "conso"], ["apple", "tech"], ["microsoft", "tech"]]) {
  const file = new URL(`../cf/site/data/societes/${id}.json`, import.meta.url);
  if (!existsSync(file)) { console.log("note :", id, "sans fichier de comptes, non testé"); continue; }
  const c = JSON.parse(readFileSync(file, "utf8")), L = c.years.length - 1, a = k => c.fin[k] ? c.fin[k][L] : null;
  const fg = D.figuresOf(c), r = D.ratios(fg);
  ok(fg.year === c.years[L] && fg.yearPrev === c.years[L - 1], id + " : exercices lus");
  near(r.g1, a("ca") / c.fin.ca[L - 1] - 1, 1e-12, id + " : croissance des ventes");
  if (a("ebit") != null) near(r.marge, a("ebit") / a("ca"), 1e-12, id + " : marge d'exploitation");
  near(r.roe, a("net") / a("equity"), 1e-12, id + " : rentabilité des capitaux propres");
  if (a("ebitda") != null) near(r.lev, a("netDebt") / a("ebitda"), 1e-12, id + " : dette en années de résultat");
  near(r.payout, a("divPaid") / a("net"), 1e-12, id + " : part du bénéfice versée");
  if (a("debt") != null && a("cash") != null) near(a("debt") - a("cash"), a("netDebt"), 1, id + " : dette nette = dettes − trésorerie (comptes)");
  if (a("fcf") != null && a("capex") != null) near(a("cfo") - a("capex"), a("fcf"), 1, id + " : argent disponible = flux d'exploitation − investissements");
  const sm = { id, sector, currency: c.currency, year: c.years[L], yearPrev: c.years[L - 1], clos: `${c.years[L]}-${c.fyEnd || "12-31"}`,
    ca: a("ca"), caPrev: c.fin.ca[L - 1], ebit: a("ebit"), net: a("net"), equity: a("equity"), netDebt: a("netDebt"), ebitda: a("ebitda"),
    fcf: a("fcf"), divPaid: a("divPaid"), dps: a("dps") ?? a("dpsEst"), eps: a("eps"), ...(a("dps") == null && a("dpsEst") != null ? { dpsE: 1 } : {}) };
  const v = D.valo(sm);
  if (!v) { console.log("note : pas de cours pour", id); continue; }
  const fx = FXR[c.currency] || 1;
  near(D.donPb(sm), v.capE / (a("equity") * 1e6 * fx), 1e-6, id + " : cours ÷ valeur comptable");
  console.log(`  ${id} ${c.years[L]} : PER ${v.pe == null ? "–" : v.pe.toFixed(1)}, cours/valeur comptable ${(D.donPb(sm) || 0).toFixed(1)}, dividende ${D.donDps(sm).v} ${D.donDps(sm).estime ? "(estimé)" : "(publié)"}`);
}

// 4.6 croissance moyenne : seulement sur exercices consécutifs
const suite = { years: [2021, 2022, 2023, 2024, 2025], currency: "EUR", fin: { ca: [100, 110, 120, 130, 146.41], net: [10, 11, 12, 13, 14] } };
const fs1 = D.figuresOf(suite);
near(fs1.cagr3.v, Math.pow(146.41 / 110, 1 / 3) - 1, 1e-12, "croissance moyenne sur 3 ans");
ok(fs1.cagr3.de === 2022 && fs1.cagr3.a === 2025, "période de la croissance moyenne");
ok(fs1.cagr5 === null, "pas de moyenne sur 5 ans avec seulement 5 exercices (4 intervalles)");
const trou = { years: [2020, 2022, 2023, 2024, 2025], currency: "EUR", fin: { ca: [100, 110, 120, 130, 146.41], net: [10, 11, 12, 13, 14] } };
ok(D.figuresOf(trou).cagr3 != null && D.figuresOf(trou).cagr === null, "exercice manquant : pas de moyenne sur toute la période");

// 4.7 médianes : effectif, exercices et entreprises écartées
ctx.R.companies = [
  { id: "a", sector: "conso", currency: "EUR", year: 2025, yearPrev: 2024, clos: "2025-12-31", ca: 100, caPrev: 90, ebit: 10, net: 8, equity: 50 },
  { id: "b", sector: "conso", currency: "EUR", year: 2025, yearPrev: 2024, clos: "2025-12-31", ca: 200, caPrev: 150, ebit: 40, net: 30, equity: 100 },
  { id: "c", sector: "conso", currency: "EUR", year: 2025, yearPrev: 2024, clos: "2025-12-31", ca: 300, caPrev: 300, ebit: 90, net: 60, equity: 200 },
  { id: "vieux", sector: "conso", currency: "EUR", year: 2014, yearPrev: 2013, clos: "2014-12-31", ca: 10, caPrev: 100, ebit: 0.1, net: 0.1, equity: 1 },
  { id: "sans", sector: "conso", missing: true },
];
const m = D.donMed("conso");
ok(m.n === 3 && m.nPerime === 1, "médiane : 3 retenues, 1 écartée pour comptes anciens (" + JSON.stringify(m) + ")");
ok(String(m.annees) === "2025,2025", "médiane : exercices couverts");
ctx.INDI.marge = ["Marge", c => { const x = D.ratios(c).marge; return x == null ? null : x * 100; }];
near(D.donMedInd("conso", "marge"), 20, 1e-9, "médiane des marges sans l'entreprise périmée");

// 4.8 PER médian : sans les comptes anciens
D.computePE();
ok(ctx.MEDPE && typeof ctx.MEDPE === "object", "médiane de PER recalculée");

// 4.9 indicateurs déclarés dans le registre de provenance
ok(ctx.PROV_IND.pb && ctx.PROV_IND.roic && ctx.PROV_IND.cagr3, "indicateurs ajoutés au registre de provenance");
ok(typeof ctx.INDI.cours_valeur_comptable?.[1] === "function" && typeof ctx.INDI.roic?.[1] === "function", "indicateurs ajoutés à la liste commune");

// 4.10 ROIC après impôt : calculé seulement si l'impôt a été lu
ok(D.donRoic({ sector: "tech", year: 2025, clos: "2025-12-31", ebit: 100, equity: 500, netDebt: 100, tax: null, pretax: 90 }) === null, "sans charge d'impôt : pas de ROIC");
near(D.donRoic({ sector: "tech", year: 2025, clos: "2025-12-31", ebit: 100, equity: 500, netDebt: 100, tax: 22.5, pretax: 90 }), 100 * (1 - 0.25) / 600, 1e-12, "ROIC après impôt effectif de 25 %");
ok(D.donRoic({ sector: "finance", year: 2025, clos: "2025-12-31", ebit: 100, equity: 500, netDebt: 100, tax: 25, pretax: 100 }) === null, "banques : pas de ROIC");

console.log(bad ? `${bad} écart sur ${n} vérifications` : `donnees : tout est bon (${n} vérifications)`);
process.exit(bad ? 1 : 0);
