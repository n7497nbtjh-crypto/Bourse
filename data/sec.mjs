// Comptes annuels des sociétés américaines, lus à la SEC (EDGAR, « companyfacts »).
// Données publiques, gratuites, sans clé. La SEC demande un en-tête User-Agent avec un contact
// et au plus 10 requêtes par seconde.
//   https://www.sec.gov/files/company_tickers.json          code de l'action -> numéro CIK
//   https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json   tous les chiffres déclarés
// On ne garde que les rapports annuels (10-K), exercices d'environ un an.

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
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  da: ["DepreciationDepletionAndAmortization", "DepreciationAmortizationAndAccretionNet", "DepreciationAndAmortization"],
  debtTotal: ["LongTermDebt", "DebtLongtermAndShorttermCombinedAmount"],
  debtNC: ["LongTermDebtNoncurrent"],
  debtC: ["LongTermDebtCurrent"],
  debtShort: ["ShortTermBorrowings", "CommercialPaper"],
};
const PER_SHARE = new Set(["eps", "dps"]);
const INSTANT = new Set(["equity", "cash", "debtTotal", "debtNC", "debtC", "debtShort"]);

const day = s => new Date(s + "T00:00:00Z");
const fy = end => day(end).getUTCFullYear() - (day(end).getUTCMonth() === 0 && day(end).getUTCDate() < 15 ? 1 : 0);

// companyfacts -> { currency, fyEnd, years: { 2024: { ca, net, ... } } }
export function extractSec(doc) {
  const g = (doc && doc.facts && doc.facts["us-gaap"]) || {};
  const annual = rows => rows.filter(r => /^10-K/.test(r.form || ""));
  // Fins d'exercice : dates de fin des chiffres annuels de chiffre d'affaires ou de résultat
  const ends = new Set();
  for (const k of ["ca", "net"]) for (const c of US_CONCEPTS[k]) for (const r of annual(((g[c] || {}).units || {}).USD || [])) {
    if (r.start && (day(r.end) - day(r.start)) / 864e5 >= 330 && (day(r.end) - day(r.start)) / 864e5 <= 400) ends.add(r.end);
  }
  const years = {};
  let fyEnd = null;
  for (const [key, concepts] of Object.entries(US_CONCEPTS)) {
    for (const c of concepts) {
      const u = (g[c] || {}).units || {};
      const rows = annual(u.USD || u["USD/shares"] || []);
      const best = {}; // une valeur par fin d'exercice : la déclaration la plus récente
      for (const r of rows) {
        if (!ends.has(r.end)) continue;
        if (INSTANT.has(key)) { if (r.start) continue; }
        else { if (!r.start) continue; const d = (day(r.end) - day(r.start)) / 864e5; if (d < 330 || d > 400) continue; }
        if (!best[r.end] || String(r.filed) > String(best[r.end].filed)) best[r.end] = r;
      }
      for (const [end, r] of Object.entries(best)) {
        const y = fy(end); years[y] = years[y] || {};
        if (years[y][key] == null) years[y][key] = PER_SHARE.has(key) ? r.val : r.val / 1e6;
        if (key === "ca" || key === "net") { const last = [...ends].sort().pop(); fyEnd = last ? last.slice(5, 10) : fyEnd; }
      }
    }
  }
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
  return { currency: "USD", fyEnd, years };
}

export async function cikMap(getJSON, fetchFn) {
  const j = await getJSON(fetchFn, "https://www.sec.gov/files/company_tickers.json");
  const m = {};
  for (const v of Object.values(j || {})) m[String(v.ticker).toUpperCase()] = String(v.cik_str).padStart(10, "0");
  return m;
}
export const factsUrl = cik => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
