// Comptes annuels des sociétés américaines, lus à la SEC (EDGAR, « companyfacts »).
// Données publiques, gratuites, sans clé. La SEC demande un en-tête User-Agent avec un contact
// et au plus 10 requêtes par seconde.
//   https://www.sec.gov/files/company_tickers.json          code de l'action -> numéro CIK
//   https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json   tous les chiffres déclarés
// On ne garde que les rapports annuels : 10-K (sociétés américaines), 20-F et 40-F (sociétés étrangères cotées aux États-Unis).
// Les sociétés étrangères publient souvent en normes IFRS (taxonomie « ifrs-full ») et dans leur devise.

export const US_CONCEPTS = {
  ca: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "RevenuesNetOfInterestExpense", "RevenueFromContractWithCustomerIncludingAssessedTax", "RegulatedAndUnregulatedOperatingRevenue", "OperatingLeaseLeaseIncome", "RealEstateRevenueNet", "InterestAndDividendIncomeOperating"],
  // Banques : pas de chiffre d'affaires ; on reconstitue des « revenus » = marge d'intérêt nette + commissions et autres produits (produit net bancaire)
  caBanqueA: ["InterestIncomeExpenseNet"], caBanqueB: ["NoninterestIncome"],
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
  leaseOp: ["OperatingLeaseLiability"],
  leaseFinNC: ["FinanceLeaseLiabilityNoncurrent"],
  leaseFinC: ["FinanceLeaseLiabilityCurrent"],
  tax: ["IncomeTaxExpenseBenefit"],
  pretax: ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"],
};
// Mêmes indicateurs pour les sociétés en normes IFRS
export const IFRS_CONCEPTS = {
  ca: ["Revenue", "RevenueFromContractsWithCustomers", "RevenueFromRenderingOfServices", "RentalIncomeFromInvestmentProperty", "RevenueFromSaleOfGoods"],
  caBanqueA: ["InterestIncome", "RevenueFromInterest"], caBanqueB: ["FeeAndCommissionIncome"],
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
  leaseOp: ["LeaseLiabilities"],
  leaseFinNC: ["NoncurrentLeaseLiabilities"],
  leaseFinC: ["CurrentLeaseLiabilities"],
  tax: ["IncomeTaxExpenseContinuingOperations"],
  pretax: ["ProfitLossBeforeTax"],
};
const PER_SHARE = new Set(["eps", "dps"]);
const INSTANT = new Set(["equity", "cash", "debtTotal", "debtNC", "debtC", "debtShort", "leaseOp", "leaseFinNC", "leaseFinC"]);

const day = s => new Date(s + "T00:00:00Z");
const fy = end => day(end).getUTCFullYear() - (day(end).getUTCMonth() === 0 && day(end).getUTCDate() < 15 ? 1 : 0);

// Lecture d'une seule taxonomie (us-gaap ou ifrs-full) d'un fichier companyfacts.
function extractNs(g, CONC, ifrs) {
  const annual = rows => rows.filter(r => /^(10-K|20-F|40-F)/.test(r.form || ""));
  const len = r => (day(r.end) - day(r.start)) / 864e5;
  // Devise de publication : celle qui couvre l'exercice le plus récent. Une société peut changer de
  // devise de présentation (YPF, passée du peso au dollar) : l'ancienne reste la plus nombreuse, mais
  // ne contient plus les derniers exercices. À exercice égal, la devise la plus fréquente l'emporte.
  const stat = {};
  for (const k of ["ca", "net"]) for (const c of CONC[k]) for (const [u, rows] of Object.entries((g[c] || {}).units || {})) {
    if (!/^[A-Z]{3}$/.test(u)) continue;
    const l = annual(rows).filter(r => r.start && len(r) >= 330 && len(r) <= 400);
    const s = stat[u] = stat[u] || { n: 0, fin: "" };
    s.n += l.length;
    for (const r of l) if (String(r.end) > s.fin) s.fin = String(r.end);
  }
  const devises = Object.entries(stat).filter(([, s]) => s.n > 0).sort((a, b) => (a[1].fin < b[1].fin ? 1 : a[1].fin > b[1].fin ? -1 : 0) || b[1].n - a[1].n);
  let cur = devises.length ? devises[0][0] : "USD";
  // Une seule déclaration dans la devise la plus récente : prudence, on garde la devise habituelle
  if (devises.length > 1 && devises[0][1].n < 2) { const plus = devises.slice().sort((a, b) => b[1].n - a[1].n)[0]; if (plus[1].n >= 2) cur = plus[0]; }
  // Fins d'exercice : dates de fin des chiffres annuels de chiffre d'affaires ou de résultat
  const ends = new Set();
  for (const k of ["ca", "net", "caBanqueA"]) for (const c of CONC[k] || []) for (const r of annual(((g[c] || {}).units || {})[cur] || [])) {
    if (r.start && len(r) >= 330 && len(r) <= 400) ends.add(r.end);
  }
  const years = {};
  const tags = { net: {}, debt: {}, norme: {} }; // étiquettes retenues, par exercice (provenance)
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
        if (years[y][key] == null) {
          years[y][key] = PER_SHARE.has(key) ? r.val : r.val / 1e6;
          if (key === "net") tags.net[y] = /AttributableToOwnersOfParent|AvailableToCommonStockholders/.test(c) ? "part du groupe"
            : c === "ProfitLoss" ? "résultat total, intérêts minoritaires compris" : "résultat net publié";
        }
      }
    }
  }
  const last = [...ends].sort().pop(); if (last) fyEnd = last.slice(5, 10);
  for (const [y, r] of Object.entries(years)) {
    if (r.ca == null && r.caBanqueA != null && r.caBanqueB != null) { r.ca = r.caBanqueA + r.caBanqueB; r.caBanque = true; } // revenus d'une banque
    delete r.caBanqueA; delete r.caBanqueB;
    if (r.capex != null) r.capex = Math.abs(r.capex);
    if (r.cfo != null && r.capex != null) r.fcf = r.cfo - r.capex;
    let debt = r.debtTotal != null ? r.debtTotal : (r.debtNC != null || r.debtC != null) ? (r.debtNC || 0) + (r.debtC || 0) : null;
    let def = r.debtTotal != null ? "dette financière, total publié" : debt != null ? "dette à long terme + part à moins d'un an" : null;
    if (r.debtShort != null) { debt = (debt || 0) + r.debtShort; def = (def ? def + " + " : "") + "emprunts à court terme"; }
    // Dettes locatives : contrats de location-financement et, pour les normes américaines, locations simples
    const lease = r.leaseOp != null || r.leaseFinNC != null || r.leaseFinC != null ? (r.leaseOp || 0) + (r.leaseFinNC || 0) + (r.leaseFinC || 0) : null;
    if (lease != null) r.leases = lease;
    if (debt != null) {
      r.debt = debt;
      if (r.cash != null) {
        r.netDebt = debt - r.cash;
        if (lease != null) r.netDebtBaux = debt + lease - r.cash;
      }
      tags.debt[y] = def + (lease != null ? ", hors dettes locatives (fournies à part)" : "") + ", moins la trésorerie";
    }
    if (r.ebit != null && r.da != null) r.ebitda = r.ebit + Math.abs(r.da);
    if (r.divPaid != null) r.divPaid = Math.abs(r.divPaid);
    if (r.tax != null) r.tax = Math.abs(r.tax);
    if (r.dps == null && r.divPaid && r.eps && r.net) { const sh = r.net / r.eps; if (sh > 0) r.dpsEst = r.divPaid / sh; }
    for (const k of ["debtTotal", "debtNC", "debtC", "debtShort", "da", "leaseOp", "leaseFinNC", "leaseFinC"]) delete r[k];
    tags.norme[y] = ifrs ? "IFRS" : "US GAAP";
  }
  return { currency: cur, fyEnd, years, ifrs, tags, norme: ifrs ? "IFRS" : "US GAAP" };
}

// companfacts -> { currency, fyEnd, years: { 2024: { ca, net, ... } } }
// Une société qui a changé de référentiel (Toyota, Honda, Sony, Itaú… passées des normes américaines aux IFRS)
// garde ses anciens exercices sous « us-gaap » et les nouveaux sous « ifrs-full ». On lit donc les DEUX taxonomies
// et on garde, pour chaque exercice, celle qui couvre les exercices les plus récents.
export function extractSec(doc) {
  const facts = (doc && doc.facts) || {};
  const parts = [];
  if (facts["us-gaap"]) parts.push(extractNs(facts["us-gaap"], US_CONCEPTS, false));
  if (facts["ifrs-full"]) parts.push(extractNs(facts["ifrs-full"], IFRS_CONCEPTS, true));
  if (!parts.length) return { currency: "USD", fyEnd: null, years: {}, ifrs: false, tags: { net: {}, debt: {}, norme: {} }, norme: null };
  const dernier = p => Math.max(-Infinity, ...Object.entries(p.years).filter(([, r]) => r.ca != null || r.net != null).map(([y]) => +y));
  parts.sort((a, b) => dernier(b) - dernier(a)); // la taxonomie la plus à jour d'abord : elle a la priorité
  if (parts.length === 1) return parts[0];
  const out = { currency: parts[0].currency, fyEnd: parts[0].fyEnd, years: {}, ifrs: parts[0].ifrs, tags: { net: {}, debt: {}, norme: {} }, norme: parts[0].norme };
  for (const p of parts) { // la taxonomie la plus à jour renseigne d'abord : un exercice garde le référentiel qui l'a publié
    for (const [y, r] of Object.entries(p.years)) {
      out.years[y] = out.years[y] || {};
      for (const [k, v] of Object.entries(r)) if (out.years[y][k] == null) out.years[y][k] = v;
    }
    for (const t of ["net", "debt", "norme"]) for (const [y, v] of Object.entries(p.tags[t] || {})) if (out.tags[t][y] == null) out.tags[t][y] = v;
  }
  return out;
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

/* ---------- Trimestres (30/10/2026) : les chiffres des rapports 10-Q, et le quatrième trimestre déduit du 10-K ----------
   companyfacts contient chaque déclaration avec sa période. Un trimestre « simple » dure 80 à 100 jours ; les 10-Q donnent
   aussi des cumuls (6 et 9 mois). Le 4e trimestre n'est jamais publié seul : exercice (10-K) moins cumul 9 mois.
   Sortie : { currency, q: [{ end, ca, net, eps, filed, form }] } sur les 8 derniers trimestres, plus ttm (12 mois glissants). */
export function extractSecTrim(doc, maxQ = 8) {
  const facts = (doc && doc.facts) || {}, g = facts["us-gaap"] || facts["ifrs-full"] || null; if (!g) return null;
  const CONC = facts["us-gaap"] ? US_CONCEPTS : IFRS_CONCEPTS, len = r => (day(r.end) - day(r.start)) / 864e5;
  const rowsOf = (key, cur) => { const out = []; for (const c of CONC[key] || []) { const u = (g[c] || {}).units || {}; for (const r of (u[cur] || u[cur + "/shares"] || [])) if (r.start && r.end) out.push(r); } return out; };
  // devise : celle des trimestres de ventes les plus récents
  const stat = {};
  for (const c of CONC.ca || []) for (const [u, rows] of Object.entries((g[c] || {}).units || {})) if (/^[A-Z]{3}$/.test(u)) for (const r of rows) if (r.start && len(r) >= 80 && len(r) <= 100) { stat[u] = stat[u] || { n: 0, fin: "" }; stat[u].n++; if (r.end > stat[u].fin) stat[u].fin = r.end; }
  const cur = Object.entries(stat).sort((a, b) => (a[1].fin < b[1].fin ? 1 : a[1].fin > b[1].fin ? -1 : 0) || b[1].n - a[1].n).map(([u]) => u)[0] || "USD";
  const serie = key => { // par date de fin : trimestre simple, sinon déduit (exercice − 9 mois, ou cumul − cumul précédent)
    const R = rowsOf(key, cur), byEnd = {};
    const keep = (end, v, r) => { if (!byEnd[end] || String(r.filed) > String(byEnd[end].filed)) byEnd[end] = { v, filed: r.filed, form: r.form }; };
    for (const r of R) if (len(r) >= 80 && len(r) <= 100) keep(r.end, r.val, r);
    const cum = {}; for (const r of R) { const d = len(r); if (d > 100) (cum[r.start] = cum[r.start] || []).push(r); }
    for (const [start, L] of Object.entries(cum)) { L.sort((a, b) => len(a) - len(b)); for (let i = 0; i < L.length; i++) { const r = L[i]; if (byEnd[r.end]) continue; const prev = i ? L[i - 1] : null; if (prev && len(r) - len(prev) >= 80 && len(r) - len(prev) <= 100) keep(r.end, r.val - prev.val, r); } }
    return byEnd;
  };
  const ca = serie("ca"), net = serie("net"), eps = serie("eps");
  const ends = [...new Set([...Object.keys(ca), ...Object.keys(net)])].sort().slice(-maxQ);
  if (!ends.length) return null;
  const M = v => v == null ? null : Math.round(v / 1e6 * 10) / 10;
  const q = ends.map(end => ({ end, ca: ca[end] ? M(ca[end].v) : null, net: net[end] ? M(net[end].v) : null, eps: eps[end] ? Math.round(eps[end].v * 100) / 100 : null, filed: (ca[end] || net[end]).filed, form: (ca[end] || net[end]).form }));
  const last4 = q.slice(-4), full = last4.length === 4 && last4.every(x => x.ca != null);
  const ttm = full ? { fin: last4[3].end, ca: Math.round(last4.reduce((s, x) => s + x.ca, 0) * 10) / 10, net: last4.every(x => x.net != null) ? Math.round(last4.reduce((s, x) => s + x.net, 0) * 10) / 10 : null } : null;
  return { currency: cur, q, ttm };
}
