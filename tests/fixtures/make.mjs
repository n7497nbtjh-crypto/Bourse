// Fabrique des réponses d'exemple (chiffres inventés) au format des vraies API, pour tester la collecte sans réseau.
const LEI = "969500EXEMPLE0000001";
const fact = (concept, period, value, unit = "iso4217:EUR", extra = {}) => ({ value: String(value), decimals: -6, dimensions: { concept, entity: "lei:" + LEI, period, unit, ...extra } });
const Y = y => `${y}-01-01T00:00:00/${y + 1}-01-01T00:00:00`, I = y => `${y + 1}-01-01T00:00:00`;
export function report(y, base) {
  const facts = {}; let n = 0; const add = f => { facts["f" + (++n)] = f; };
  for (const [yy, k] of [[y, 1], [y - 1, 0.95]]) {
    add(fact("ifrs-full:Revenue", Y(yy), Math.round(base * k * 1e6)));
    add(fact("ifrs-full:ProfitLossFromOperatingActivities", Y(yy), Math.round(base * k * 0.2e6)));
    add(fact("ifrs-full:ProfitLossAttributableToOwnersOfParent", Y(yy), Math.round(base * k * 0.14e6)));
    add(fact("ifrs-full:BasicEarningsLossPerShare", Y(yy), (base * k * 0.14 / 500).toFixed(2), "iso4217:EUR/xbrli:shares"));
    add(fact("ifrs-full:DividendsRecognisedAsDistributionsToOwnersPerShare", Y(yy), "1.20", "iso4217:EUR/xbrli:shares"));
    add(fact("ifrs-full:EquityAttributableToOwnersOfParent", I(yy), Math.round(base * k * 0.8e6)));
    add(fact("ifrs-full:CashAndCashEquivalents", I(yy), Math.round(base * 0.1e6)));
    add(fact("ifrs-full:NoncurrentPortionOfNoncurrentBorrowings", I(yy), Math.round(base * 0.25e6)));
    add(fact("ifrs-full:CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings", I(yy), Math.round(base * 0.05e6)));
    add(fact("ifrs-full:CashFlowsFromUsedInOperatingActivities", Y(yy), Math.round(base * k * 0.22e6)));
    add(fact("ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", Y(yy), Math.round(base * k * 0.06e6)));
    add(fact("ifrs-full:DepreciationAndAmortisationExpense", Y(yy), Math.round(base * k * 0.05e6)));
  }
  // Pièges : un chiffre ventilé par secteur et un chiffre semestriel, qui doivent être ignorés
  add(fact("ifrs-full:Revenue", Y(y), 1, "iso4217:EUR", { "ifrs-full:SegmentsAxis": "ex:Europe" }));
  add(fact("ifrs-full:Revenue", `${y}-01-01T00:00:00/${y}-07-01T00:00:00`, 2));
  return { documentInfo: { documentType: "https://xbrl.org/2021/xbrl-json" }, facts };
}
export const gleif = { data: [{ type: "lei-records", id: LEI, attributes: { lei: LEI, entity: { legalName: { name: "SOCIETE EXEMPLE SA" } } } }] };
export const filings = { data: [2025, 2024, 2023].flatMap(y => [
  { type: "filing", id: "a" + y, attributes: { period_end: `${y}-12-31`, json_url: `/${LEI}/${y}-12-31/ESEF/FR/0/exemple-${y}.json`, report_url: `/${LEI}/${y}-12-31/ESEF/FR/0/exemple-${y}.xhtml`, processed: `${y + 1}-03-20 10:00:00` } },
  { type: "filing", id: "b" + y, attributes: { period_end: `${y}-12-31`, json_url: `/${LEI}/${y}-12-31/ESEF/FR/1/ancien-${y}.json`, processed: `${y + 1}-03-01 10:00:00` } },
]) };
export const reports = { 2025: report(2025, 20000), 2024: report(2024, 19000), 2023: report(2023, 18000) };
