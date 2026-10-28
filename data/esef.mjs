// Lecture des rapports financiers annuels au format ESEF (xBRL-JSON).
// Les sociétés cotées en Europe publient leurs comptes dans ce format depuis 2021, avec des étiquettes
// standard (taxonomie IFRS). On ne garde que les chiffres du groupe, sans ventilation (pas de « dimensions »).

// Pour chaque indicateur : les étiquettes IFRS acceptées, dans l'ordre de préférence.
export const CONCEPTS = {
  ca: ["ifrs-full:Revenue", "ifrs-full:RevenueFromContractsWithCustomers", "ifrs-full:RevenueFromSaleOfGoods"],
  ebit: ["ifrs-full:ProfitLossFromOperatingActivities"],
  net: ["ifrs-full:ProfitLossAttributableToOwnersOfParent", "ifrs-full:ProfitLoss"],
  eps: ["ifrs-full:BasicEarningsLossPerShare", "ifrs-full:BasicEarningsLossPerShareFromContinuingOperations"],
  dps: ["ifrs-full:DividendsRecognisedAsDistributionsToOwnersPerShare"],
  divPaid: ["ifrs-full:DividendsPaidToEquityHoldersOfParentClassifiedAsFinancingActivities", "ifrs-full:DividendsPaidClassifiedAsFinancingActivities", "ifrs-full:DividendsPaid"],
  equity: ["ifrs-full:EquityAttributableToOwnersOfParent", "ifrs-full:Equity"],
  cash: ["ifrs-full:CashAndCashEquivalents"],
  cfo: ["ifrs-full:CashFlowsFromUsedInOperatingActivities"],
  capexPpe: ["ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", "ifrs-full:PurchaseOfPropertyPlantAndEquipment"],
  capexInt: ["ifrs-full:PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities", "ifrs-full:PurchaseOfIntangibleAssets"],
  da: ["ifrs-full:DepreciationAndAmortisationExpense", "ifrs-full:DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss", "ifrs-full:AdjustmentsForDepreciationAndAmortisationExpense", "ifrs-full:AdjustmentsForDepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss"],
  debtTotal: ["ifrs-full:Borrowings"],
  debtLong: ["ifrs-full:NoncurrentPortionOfNoncurrentBorrowings", "ifrs-full:LongtermBorrowings"],
  debtShortAll: ["ifrs-full:CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings"],
  debtShort: ["ifrs-full:ShorttermBorrowings"],
  debtCurLong: ["ifrs-full:CurrentPortionOfNoncurrentBorrowings"],
  debtInstrNC: ["ifrs-full:NoncurrentDebtInstrumentsIssued"],
  debtInstrC: ["ifrs-full:CurrentDebtInstrumentsIssued"],
  debtFinNC: ["ifrs-full:NoncurrentFinancialLiabilities"],
  debtFinC: ["ifrs-full:CurrentFinancialLiabilities"],
};
const MONEY_PER_SHARE = new Set(["eps", "dps"]);

// Étiquettes propres à une entreprise (« extensions ») : reconnues par leur nom, dans l'ordre de préférence.
// Établi d'après le diagnostic de la collecte du 28/10/2026 (data/diagnostic.json).
export const EXT = {
  ca: [/^(RevenuesFromContinuingActivities|NetBankingIncome|ProduitNetBancaire|NetBankingRevenue)$/i],
  ebit: [/^ProfitLossFromOperatingActivities/, /^(RecurringOperatingIncome|ResultatOperationnelCourant|CurrentOperatingIncome|OperatingIncomeBeforeNonRecurringItems|OperatingProfitBeforeOtherIncomeAndExpenses|ProfitLossFromOrdinaryOperatingActivities|MargeOperationnelle)$/i,
    /^ResultatDexploitation/i, /^(ProfitLossFromOrdinaryActivities|ResultatOperationnel|NetOperatingResult|CurrentOperatingIncome)/i],
  ebitdaExt: [/ebitda/i, /^MargeOperationnelleAvantAmortissements$/i],
  daExt: [/(depreciat|amortis|amortiz|amortissement)/i],
  debtExt: [/(InterestBearingFinancialLiab|FinancialLiabilitiesIncludingDebtsExcludingObligations|^BorrowingsExcluding)/i],
};
const DA_EXCLUDE = /(RightOfUse|OfTangibleAssets|OfIntangibleAssets|CapitalizedDevelopment|Investment|Financed|Acquisition|Associates|Cost|Revenue|Other$|OnDisposal|Deferred|Reversal$)/i;
const BASE_DIMS = new Set(["concept", "entity", "period", "unit", "language", "noteId"]);

// "2024-01-01T00:00:00/2025-01-01T00:00:00" -> { start, end } ; la fin est exclusive (minuit).
function parsePeriod(p) {
  const toDate = s => new Date(s.length <= 10 ? s + "T00:00:00Z" : s.replace(/Z?$/, "Z"));
  if (p.includes("/")) { const [a, b] = p.split("/"); return { start: toDate(a), end: toDate(b) }; }
  return { start: null, end: toDate(p) };
}
// Exercice : l'année de la veille de la date de fin (une fin au 1er janvier 2025 minuit = exercice 2024).
const fiscalYear = end => new Date(end.getTime() - 1000).getUTCFullYear();

export function extract(doc) {
  const facts = doc && doc.facts ? Object.values(doc.facts) : [];
  const byConcept = {};
  for (const f of facts) {
    const d = f.dimensions || {};
    if (!d.concept || !d.period) continue;
    if (Object.keys(d).some(k => !BASE_DIMS.has(k))) continue; // chiffre ventilé (par secteur, etc.) : ignoré
    const v = Number(f.value);
    if (!isFinite(v)) continue;
    (byConcept[d.concept] = byConcept[d.concept] || []).push({ v, unit: d.unit || "", ...parsePeriod(d.period) });
  }
  const years = {};
  let currency = null, fyEnd = null;
  const put = (key, y, v) => { (years[y] = years[y] || {}); if (years[y][key] == null) years[y][key] = v; };
  for (const [key, concepts] of Object.entries(CONCEPTS)) {
    for (const c of concepts) {
      for (const f of byConcept[c] || []) {
        if (f.start) { // durée : on ne garde que les exercices d'environ un an
          const days = (f.end - f.start) / 864e5;
          if (days < 330 || days > 400) continue;
        }
        const y = fiscalYear(f.end);
        if (key === "ca" && /^iso4217:/.test(f.unit)) { currency = currency || f.unit.slice(8, 11); }
        if (key === "ca" || key === "net") { const e = new Date(f.end.getTime() - 1000).toISOString().slice(5, 10); fyEnd = fyEnd || e; }
        put(key, y, MONEY_PER_SHARE.has(key) ? f.v : f.v / 1e6);
      }
    }
  }
  // Étiquettes propres à l'entreprise, quand l'étiquette standard manque
  const ext = Object.keys(byConcept).filter(c => !c.startsWith("ifrs-full:"));
  const local = c => c.split(":")[1] || c;
  const okDuration = f => !f.start || ((f.end - f.start) / 864e5 >= 330 && (f.end - f.start) / 864e5 <= 400);
  const byYear = (concept, wantInstant) => {
    const m = {};
    for (const f of byConcept[concept]) { if (!!f.start === wantInstant || !okDuration(f)) continue; const y = fiscalYear(f.end); if (m[y] == null) m[y] = f.v / 1e6; }
    return m;
  };
  const fillFirst = (key, patterns, instant = false) => {
    for (const re of patterns) {
      const hits = ext.filter(c => re.test(local(c)));
      for (const c of hits) for (const [y, v] of Object.entries(byYear(c, instant))) { years[y] = years[y] || {}; if (years[y][key] == null) { years[y][key] = v; years[y][key + "Ext"] = true; } }
    }
  };
  fillFirst("ca", EXT.ca); fillFirst("ebit", EXT.ebit); fillFirst("ebitdaExt", EXT.ebitdaExt);
  // Amortissements : plus grand total trouvé parmi les étiquettes d'amortissement (hors sous-totaux)
  for (const c of ext.filter(c => EXT.daExt[0].test(local(c)) && !DA_EXCLUDE.test(local(c))))
    for (const [y, v] of Object.entries(byYear(c, false))) { years[y] = years[y] || {}; if (years[y].da == null && (years[y].daExtMax == null || Math.abs(v) > years[y].daExtMax)) years[y].daExtMax = Math.abs(v); }
  // Dette propre à l'entreprise : somme des parts long et court terme
  for (const c of ext.filter(c => EXT.debtExt[0].test(local(c))))
    for (const [y, v] of Object.entries(byYear(c, true))) { years[y] = years[y] || {}; years[y].debtExtSum = (years[y].debtExtSum || 0) + v; }

  // Calculs dérivés
  for (const r of Object.values(years)) {
    if (r.da == null && r.daExtMax != null) r.da = r.daExtMax;
    if (r.cfo != null && (r.capexPpe != null || r.capexInt != null)) r.fcf = r.cfo - Math.abs(r.capexPpe || 0) - Math.abs(r.capexInt || 0);
    // Dette financière : total publié, sinon part à long terme + part à court terme
    const short = r.debtShortAll != null ? r.debtShortAll : (r.debtShort != null || r.debtCurLong != null) ? (r.debtShort || 0) + (r.debtCurLong || 0) : null;
    let debt = r.debtTotal != null ? r.debtTotal : (r.debtLong != null || short != null) ? (r.debtLong || 0) + (short || 0) : null;
    if (debt == null && (r.debtInstrNC != null || r.debtInstrC != null)) debt = (r.debtInstrNC || 0) + (r.debtInstrC || 0);
    if (debt == null && r.debtExtSum != null) debt = r.debtExtSum;
    if (debt == null && (r.debtFinNC != null || r.debtFinC != null)) debt = (r.debtFinNC || 0) + (r.debtFinC || 0);
    if (debt != null) { r.debt = debt; if (r.cash != null) r.netDebt = debt - r.cash; }
    if (r.ebit != null && r.da != null) r.ebitda = r.ebit + Math.abs(r.da);
    else if (r.ebitdaExt != null) r.ebitda = r.ebitdaExt;
    if (r.divPaid != null) r.divPaid = Math.abs(r.divPaid);
    // Dividende par action estimé quand il n'est pas publié : dividendes versés ÷ nombre d'actions (résultat net ÷ BNPA)
    if (r.dps == null && r.divPaid != null && r.eps && r.net) { const shares = r.net / r.eps; if (shares > 0) r.dpsEst = r.divPaid / shares; }
    for (const k of ["capexPpe", "capexInt", "debtTotal", "debtLong", "debtShortAll", "debtShort", "debtCurLong", "debtInstrNC", "debtInstrC", "debtFinNC", "debtFinC", "debtExtSum", "daExtMax", "ebitdaExt", "ebitdaExtExt", "da"]) delete r[k];
  }
  return { currency: currency || "EUR", fyEnd, years };
}

// Fusionne plusieurs rapports : le plus récent l'emporte pour une même année.
export function merge(reports) {
  const out = { currency: null, fyEnd: null, years: {} };
  for (const r of reports) { // du plus récent au plus ancien
    out.currency = out.currency || r.currency; out.fyEnd = out.fyEnd || r.fyEnd;
    for (const [y, vals] of Object.entries(r.years)) {
      out.years[y] = out.years[y] || {};
      for (const [k, v] of Object.entries(vals)) if (out.years[y][k] == null) out.years[y][k] = v;
    }
  }
  return out;
}

// Mise en forme pour le site : années triées, une série par indicateur.
export const KEYS = ["caExt", "ebitExt", "ca", "ebit", "net", "eps", "dps", "dpsEst", "divPaid", "equity", "cash", "debt", "netDebt", "ebitda", "cfo", "fcf"];
export function toSeries(merged, maxYears = 5) {
  const ys = Object.keys(merged.years).map(Number).filter(y => merged.years[y].ca != null || merged.years[y].net != null).sort().slice(-maxYears);
  const fin = {};
  for (const k of KEYS) { const s = ys.map(y => merged.years[y][k] ?? null); if (s.some(v => v != null)) fin[k] = s.map(v => v == null ? null : typeof v === "boolean" ? v : Math.round(v * 100) / 100); }
  return { years: ys, currency: merged.currency, fyEnd: merged.fyEnd, fin };
}
