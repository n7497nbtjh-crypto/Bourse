// Lecture des rapports financiers annuels au format ESEF (xBRL-JSON).
// Les sociétés cotées en Europe publient leurs comptes dans ce format depuis 2021, avec des étiquettes
// standard (taxonomie IFRS). On ne garde que les chiffres du groupe, sans ventilation (pas de « dimensions »).

// Pour chaque indicateur : les étiquettes IFRS acceptées, dans l'ordre de préférence.
export const CONCEPTS = {
  ca: ["ifrs-full:Revenue", "ifrs-full:RevenueFromContractsWithCustomers"],
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
  da: ["ifrs-full:DepreciationAndAmortisationExpense", "ifrs-full:DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss"],
  debtTotal: ["ifrs-full:Borrowings"],
  debtLong: ["ifrs-full:NoncurrentPortionOfNoncurrentBorrowings", "ifrs-full:LongtermBorrowings"],
  debtShortAll: ["ifrs-full:CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings"],
  debtShort: ["ifrs-full:ShorttermBorrowings"],
  debtCurLong: ["ifrs-full:CurrentPortionOfNoncurrentBorrowings"],
};
const MONEY_PER_SHARE = new Set(["eps", "dps"]);
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
  // Calculs dérivés
  for (const r of Object.values(years)) {
    if (r.cfo != null && (r.capexPpe != null || r.capexInt != null)) r.fcf = r.cfo - Math.abs(r.capexPpe || 0) - Math.abs(r.capexInt || 0);
    // Dette financière : total publié, sinon part à long terme + part à court terme
    const short = r.debtShortAll != null ? r.debtShortAll : (r.debtShort != null || r.debtCurLong != null) ? (r.debtShort || 0) + (r.debtCurLong || 0) : null;
    const debt = r.debtTotal != null ? r.debtTotal : (r.debtLong != null || short != null) ? (r.debtLong || 0) + (short || 0) : null;
    if (debt != null) { r.debt = debt; if (r.cash != null) r.netDebt = debt - r.cash; }
    if (r.ebit != null && r.da != null) r.ebitda = r.ebit + Math.abs(r.da);
    if (r.divPaid != null) r.divPaid = Math.abs(r.divPaid);
    for (const k of ["capexPpe", "capexInt", "debtTotal", "debtLong", "debtShortAll", "debtShort", "debtCurLong", "da"]) delete r[k];
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
export const KEYS = ["ca", "ebit", "net", "eps", "dps", "divPaid", "equity", "cash", "debt", "netDebt", "ebitda", "cfo", "fcf"];
export function toSeries(merged, maxYears = 5) {
  const ys = Object.keys(merged.years).map(Number).filter(y => merged.years[y].ca != null || merged.years[y].net != null).sort().slice(-maxYears);
  const fin = {};
  for (const k of KEYS) { const s = ys.map(y => merged.years[y][k] ?? null); if (s.some(v => v != null)) fin[k] = s.map(v => v == null ? null : Math.round(v * 100) / 100); }
  return { years: ys, currency: merged.currency, fyEnd: merged.fyEnd, fin };
}
