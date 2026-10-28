// Comptes annuels des sociétés américaines, lus à la SEC (EDGAR, « companyfacts »).
// Données publiques, gratuites, sans clé. La SEC demande un en-tête User-Agent avec un contact
// et au plus 10 requêtes par seconde.
//   https://www.sec.gov/files/company_tickers.json          code de l'action -> numéro CIK
//   https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json   tous les chiffres déclarés
// On ne garde que les rapports annuels : 10-K (sociétés américaines), 20-F et 40-F (sociétés étrangères cotées aux États-Unis).
// Les sociétés étrangères publient souvent en normes IFRS (taxonomie « ifrs-full ») et dans leur devise.

export const US_CONCEPTS = {
  ca: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "RevenuesNetOfInterestExpense"],
  ebit: ["OperatingIncomeLoss"],
  net: ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic", "ProfitLoss"],
  eps: ["EarningsPerShareBasic"],
  dps: ["CommonStockDividendsPerShareDeclared", "CommonStockDividendsPerShareCashPaid"],
  divPaid: ["PaymentsOfDividendsCommonStock", "PaymentsOfDividends"],
  equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  cfo: ["NetCashProvidedByUsedInOperatingActivities"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PaymentsToAcquireOilAndGasPropertyAndEquipment", "PaymentsForCapitalImprovements", "PaymentsToAcquireOtherPropertyPlantAndEquipment", "PaymentsToAcquireAndDevelopRealEstate"],
  da: ["DepreciationDepletionAndAmortization", "DepreciationAmortizationAndAccretionNet", "DepreciationAndAmortization"],
  debtTotal: ["LongTermDebt", "DebtLongtermAndShorttermCombinedAmount"],
  debtNC: ["LongTermDebtNoncurrent"],
  debtC: ["LongTermDebtCurrent"],
  debtShort: ["ShortTermBorrowings", "CommercialPaper"],
};
// Mêmes indicateurs pour les sociétés en normes IFRS
export const IFRS_CONCEPTS = {
  ca: ["Revenue", "RevenueFromContractsWithCustomers"],
  ebit: ["ProfitLossFromOperatingActivities"],
  net: ["ProfitLossAttributableToOwnersOfParent", "ProfitLoss"],
  eps: ["BasicEarningsLossPerShare"],
  dps: ["DividendsRecognisedAsDistributionsToOwnersPerShare"],
  divPaid: ["DividendsPaidClassifiedAsFinancingActivities", "DividendsPaidToEquityHoldersOfParentClassifiedAsFinancingActivities", "DividendsPaid"],
  equity: ["EquityAttributableToOwnersOfParent", "Equity"],
  cash: ["CashAndCashEquivalents"],
  cfo: ["CashFlowsFromUsedInOperatingActivities"],
  capex: ["PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", "PurchaseOfPropertyPlantAndEquipment", "PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets", "PurchaseOfPropertyPlantAndEquipmentAndIntangibleAssets"],
  da: ["DepreciationAndAmortisationExpense", "DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss"],
  debtTotal: ["Borrowings"],
  debtNC: ["NoncurrentPortionOfNoncurrentBorrowings", "LongtermBorrowings"],
  debtC: ["CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings"],
  debtShort: ["ShorttermBorrowings"],
};
const PER_SHARE = new Set(["eps", "dps"]);
const INSTANT = new Set(["equity", "cash", "debtTotal", "debtNC", "debtC", "debtShort"]);

const day = s => new Date(s + "T00:00:00Z");
const fy = end => day(end).getUTCFullYear() - (day(end).getUTCMonth() === 0 && day(end).getUTCDate() < 15 ? 1 : 0);

// companyfacts -> { currency, fyEnd, years: { 2024: { ca, net, ... } } }
export function extractSec(doc) {
  const facts = (doc && doc.facts) || {};
  const ifrs = !facts["us-gaap"] || Object.keys(facts["ifrs-full"] || {}).length > Object.keys(facts["us-gaap"] || {}).length;
  const g = (ifrs ? facts["ifrs-full"] : facts["us-gaap"]) || {};
  const CONC = ifrs ? IFRS_CONCEPTS : US_CONCEPTS;
  const annual = rows => rows.filter(r => /^(10-K|20-F|40-F)/.test(r.form || ""));
  const len = r => (day(r.end) - day(r.start)) / 864e5;
  // Devise de publication : celle des chiffres d'affaires ou résultats annuels les plus nombreux
  const count = {};
  for (const k of ["ca", "net"]) for (const c of CONC[k]) for (const [u, rows] of Object.entries((g[c] || {}).units || {})) if (/^[A-Z]{3}$/.test(u)) count[u] = (count[u] || 0) + annual(rows).length;
  const cur = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
  // Fins d'exercice : dates de fin des chiffres annuels de chiffre d'affaires ou de résultat
  const ends = new Set();
  for (const k of ["ca", "net"]) for (const c of CONC[k]) for (const r of annual(((g[c] || {}).units || {})[cur] || [])) {
    if (r.start && len(r) >= 330 && len(r) <= 400) ends.add(r.end);
  }
  const years = {};
  let fyEnd = null;
  for (const [key, concepts] of Object.entries(CONC)) {
    for (const c of concepts) {
      const u = (g[c] || {}).units || {};
      const rows = annual(PER_SHARE.has(key) ? (u[cur + "/shares"] || []) : (u[cur] || []));
      const best = {}; // une valeur par fin d'exercice : la déclaration la plus récente
      for (const r of rows) {
        if (!ends.has(r.end)) continue;
        if (INSTANT.has(key)) { if (r.start) continue; }
        else { if (!r.start) continue; const d = len(r); if (d < 330 || d > 400) continue; }
        if (!best[r.end] || String(r.filed) > String(best[r.end].filed)) best[r.end] = r;
      }
      for (const [end, r] of Object.entries(best)) {
        const y = fy(end); years[y] = years[y] || {};
        if (years[y][key] == null) years[y][key] = PER_SHARE.has(key) ? r.val : r.val / 1e6;
      }
    }
  }
  const last = [...ends].sort().pop(); if (last) fyEnd = last.slice(5, 10);
  for (const r of Object.values(years)) {
    if (r.cfo != null && r.capex != null) r.fcf = r.cfo - Math.abs(r.capex);
    let debt = r.debtTotal != null ? r.debtTotal : (r.debtNC != null || r.debtC != null) ? (r.debtNC || 0) + (r.debtC || 0) : null;
    if (r.debtShort != null) debt = (debt || 0) + r.debtShort;
    if (debt != null) { r.debt = debt; if (r.cash != null) r.netDebt = debt - r.cash; }
    if (r.ebit != null && r.da != null) r.ebitda = r.ebit + Math.abs(r.da);
    if (r.divPaid != null) r.divPaid = Math.abs(r.divPaid);
    if (r.dps == null && r.divPaid && r.eps && r.net) { const sh = r.net / r.eps; if (sh > 0) r.dpsEst = r.divPaid / sh; }
    for (const k of ["capex", "debtTotal", "debtNC", "debtC", "debtShort", "da"]) delete r[k];
  }
  return { currency: cur, fyEnd, years, ifrs };
}

export async function cikMap(getJSON, fetchFn) {
  const j = await getJSON(fetchFn, "https://www.sec.gov/files/company_tickers.json");
  const m = {};
  for (const v of Object.values(j || {})) m[String(v.ticker).toUpperCase()] = String(v.cik_str).padStart(10, "0");
  return m;
}
export const factsUrl = cik => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

// Dépôts récents d'une société (rapports, communiqués de résultats…) : data.sec.gov/submissions
export const subsUrl = cik => `https://data.sec.gov/submissions/CIK${cik}.json`;
const ITEMS = { "2.02": "resultats", "5.02": "dirigeants", "1.01": "accord", "2.01": "acquisition", "5.07": "assemblee", "8.01": "autre", "7.01": "autre", "1.05": "incident" };
export function recentFilings(sub, cik, max = 12) {
  const r = (sub && sub.filings && sub.filings.recent) || {};
  const out = [];
  for (let i = 0; i < (r.form || []).length && out.length < max; i++) {
    const form = r.form[i];
    if (!/^(8-K|10-K|10-Q|20-F|40-F|6-K|DEF 14A)$/.test(form)) continue;
    const items = String(r.items?.[i] || "").split(",").map(x => x.trim()).filter(Boolean);
    const kind = form === "10-K" || form === "20-F" || form === "40-F" ? "rapport-annuel" : form === "10-Q" ? "rapport-trimestriel" : form === "DEF 14A" ? "assemblee"
      : form === "6-K" ? "communique" : (items.map(x => ITEMS[x]).find(k => k && k !== "autre") || "autre");
    if (form === "8-K" && kind === "autre" && !items.some(x => x === "8.01" || x === "7.01")) continue; // 8-K purement techniques
    const acc = String(r.accessionNumber[i] || "").replace(/-/g, "");
    out.push({ date: r.acceptanceDateTime?.[i] || r.filingDate[i], form, kind, items,
      url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${r.primaryDocument[i]}` });
  }
  return out;
}
// Prochaines publications estimées : même période que l'an dernier (rapports 10-K, 10-Q, 20-F)
export function estimatedAgenda(sub, today = new Date().toISOString().slice(0, 10)) {
  const r = (sub && sub.filings && sub.filings.recent) || {}, out = [];
  const lastYear = new Date(today); lastYear.setUTCFullYear(lastYear.getUTCFullYear() - 1);
  const ly = lastYear.toISOString().slice(0, 10);
  for (let i = 0; i < (r.form || []).length; i++) {
    const f = r.form[i], d = r.filingDate[i];
    if (!/^(10-K|10-Q|20-F|40-F)$/.test(f) || d < ly) continue;
    const next = new Date(d); next.setUTCFullYear(next.getUTCFullYear() + 1);
    const n = next.toISOString().slice(0, 10);
    if (n >= today) out.push({ date: n, type: "Résultats", label: (f === "10-Q" ? "Résultats trimestriels" : "Résultats annuels") + " (date estimée d'après l'an dernier)", estimated: true });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
}
