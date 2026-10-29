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
  capexPpe: ["ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", "ifrs-full:PurchaseOfPropertyPlantAndEquipment", "ifrs-full:PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets"],
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
  // Dettes locatives (IFRS 16) : exclues de « Borrowings » par la plupart des sociétés, alors que
  // leur propre définition de la dette nette les inclut. Collectées à part pour pouvoir le dire.
  leaseNC: ["ifrs-full:NoncurrentLeaseLiabilities"],
  leaseC: ["ifrs-full:CurrentLeaseLiabilities"],
  leaseAll: ["ifrs-full:LeaseLiabilities"],
  // Impôt et résultat avant impôt : pour un taux d'imposition effectif, donc un ROIC, plus tard.
  tax: ["ifrs-full:IncomeTaxExpenseContinuingOperations"],
  pretax: ["ifrs-full:ProfitLossBeforeTax"],
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
  let currency = null, fyEnd = null, anyCur = null;
  // Étiquettes réellement retenues, par exercice : permet de dire au lecteur ce que recouvre le chiffre.
  const tags = { net: {}, debt: {}, norme: {} };
  const put = (key, y, v) => { (years[y] = years[y] || {}); if (years[y][key] == null) { years[y][key] = v; return true; } return false; };
  for (const [key, concepts] of Object.entries(CONCEPTS)) {
    for (const c of concepts) {
      for (const f of byConcept[c] || []) {
        if (f.start) { // durée : on ne garde que les exercices d'environ un an
          const days = (f.end - f.start) / 864e5;
          if (days < 330 || days > 400) continue;
        }
        const y = fiscalYear(f.end);
        if (key === "ca" && /^iso4217:/.test(f.unit)) { currency = currency || f.unit.slice(8, 11); }
        if ((key === "net" || key === "equity") && /^iso4217:/.test(f.unit)) anyCur = anyCur || f.unit.slice(8, 11); // banques et assureurs : pas de « chiffre d'affaires »
        if (key === "ca" || key === "net") { const e = new Date(f.end.getTime() - 1000).toISOString().slice(5, 10); fyEnd = fyEnd || e; }
        const neuf = put(key, y, MONEY_PER_SHARE.has(key) ? f.v : f.v / 1e6);
        if (neuf && key === "net") tags.net[y] = c === "ifrs-full:ProfitLossAttributableToOwnersOfParent" ? "part du groupe" : "résultat total, intérêts minoritaires compris";
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
  for (const [y, r] of Object.entries(years)) {
    if (r.da == null && r.daExtMax != null) r.da = r.daExtMax;
    if (r.capexPpe != null || r.capexInt != null) r.capex = Math.abs(r.capexPpe || 0) + Math.abs(r.capexInt || 0);
    if (r.cfo != null && r.capex != null) r.fcf = r.cfo - r.capex;
    // Dette financière : total publié, sinon part à long terme + part à court terme
    const short = r.debtShortAll != null ? r.debtShortAll : (r.debtShort != null || r.debtCurLong != null) ? (r.debtShort || 0) + (r.debtCurLong || 0) : null;
    let debt = r.debtTotal != null ? r.debtTotal : null, def = debt != null ? "emprunts, total publié" : null;
    if (debt == null && (r.debtLong != null || short != null)) { debt = (r.debtLong || 0) + (short || 0); def = "emprunts à long terme + part à moins d'un an"; }
    if (debt == null && (r.debtInstrNC != null || r.debtInstrC != null)) { debt = (r.debtInstrNC || 0) + (r.debtInstrC || 0); def = "titres de créance émis"; }
    if (debt == null && r.debtExtSum != null) { debt = r.debtExtSum; def = "étiquette propre à l'entreprise"; }
    if (debt == null && (r.debtFinNC != null || r.debtFinC != null)) { debt = (r.debtFinNC || 0) + (r.debtFinC || 0); def = "passifs financiers, à défaut d'étiquette d'emprunts"; }
    // Dettes locatives (IFRS 16), collectées à part : jamais comprises dans « emprunts »
    const lease = r.leaseAll != null ? r.leaseAll : (r.leaseNC != null || r.leaseC != null) ? (r.leaseNC || 0) + (r.leaseC || 0) : null;
    if (lease != null) r.leases = lease;
    if (debt != null) {
      r.debt = debt;
      if (r.cash != null) {
        r.netDebt = debt - r.cash;
        if (lease != null) r.netDebtBaux = debt + lease - r.cash; // définition la plus proche de celle des entreprises
      }
      tags.debt[y] = def + (lease != null ? ", hors dettes locatives (fournies à part)" : "") + ", moins la trésorerie";
    }
    tags.norme[y] = "IFRS";
    if (r.ebit != null && r.da != null) r.ebitda = r.ebit + Math.abs(r.da);
    else if (r.ebitdaExt != null) r.ebitda = r.ebitdaExt;
    if (r.divPaid != null) r.divPaid = Math.abs(r.divPaid);
    if (r.tax != null) r.tax = Math.abs(r.tax);
    // Dividende par action estimé quand il n'est pas publié : dividendes versés ÷ nombre d'actions (résultat net ÷ BNPA)
    if (r.dps == null && r.divPaid != null && r.eps && r.net) { const shares = r.net / r.eps; if (shares > 0) r.dpsEst = r.divPaid / shares; }
    for (const k of ["capexPpe", "capexInt", "debtTotal", "debtLong", "debtShortAll", "debtShort", "debtCurLong", "debtInstrNC", "debtInstrC", "debtFinNC", "debtFinC", "debtExtSum", "daExtMax", "ebitdaExt", "ebitdaExtExt", "da", "leaseNC", "leaseC", "leaseAll"]) delete r[k];
  }
  return { currency: currency || anyCur || "EUR", fyEnd, years, tags, norme: "IFRS" };
}

// Fusionne plusieurs rapports : le plus récent l'emporte pour une même année.
export function merge(reports) {
  const out = { currency: null, fyEnd: null, years: {}, tags: {}, norme: null };
  for (const r of reports) { // du plus récent au plus ancien
    out.currency = out.currency || r.currency; out.fyEnd = out.fyEnd || r.fyEnd; out.norme = out.norme || r.norme || null;
    for (const [y, vals] of Object.entries(r.years)) {
      out.years[y] = out.years[y] || {};
      for (const [k, v] of Object.entries(vals)) if (out.years[y][k] == null) out.years[y][k] = v;
    }
    for (const [t, m] of Object.entries(r.tags || {})) { out.tags[t] = out.tags[t] || {}; for (const [y, v] of Object.entries(m)) if (out.tags[t][y] == null) out.tags[t][y] = v; }
  }
  return out;
}

// Mise en forme pour le site : années triées, une série par indicateur.
// « leases », « capex », « netDebtBaux », « tax », « pretax » : ajoutés le 29/10/2026 (version 4 de la collecte),
// pour la dette nette dettes locatives comprises et les indicateurs à venir. Les anciens champs sont inchangés.
export const KEYS = ["caExt", "ebitExt", "ca", "ebit", "net", "eps", "dps", "dpsEst", "divPaid", "equity", "cash", "debt", "netDebt", "netDebtBaux", "leases", "ebitda", "cfo", "capex", "fcf", "tax", "pretax"];
export const TAGS = ["net", "debt", "norme"]; // étiquette retenue, par exercice (provenance)
export function toSeries(merged, maxYears = 5) {
  const ys = Object.keys(merged.years).map(Number).filter(y => merged.years[y].ca != null || merged.years[y].net != null).sort().slice(-maxYears);
  const fin = {};
  for (const k of KEYS) { const s = ys.map(y => merged.years[y][k] ?? null); if (s.some(v => v != null)) fin[k] = s.map(v => v == null ? null : typeof v === "boolean" ? v : Math.round(v * 100) / 100); }
  const tags = {};
  for (const t of TAGS) { const s = ys.map(y => (merged.tags && merged.tags[t] && merged.tags[t][y]) ?? null); if (s.some(v => v != null)) tags[t] = s; }
  const out = { years: ys, currency: merged.currency, fyEnd: merged.fyEnd, fin };
  if (Object.keys(tags).length) out.tags = tags;
  if (merged.norme) out.norme = merged.norme;
  return out;
}

// Ventilation du chiffre d'affaires (et du résultat d'exploitation) par activité, zone ou produit.
// Les chiffres ventilés portent une dimension en plus : un axe (SegmentsAxis, GeographicalAreasAxis…) et un membre
// propre à l'entreprise (ex. « mc:FashionAndLeatherGoodsMember »). On garde le dernier exercice.
const AXIS_OK = /segment|geograph|product|region|activit|business|market|divis|area|countr|brand/i;
const SEG_CONCEPTS = { ca: ["ifrs-full:Revenue", "ifrs-full:RevenueFromContractsWithCustomers"], ebit: ["ifrs-full:ProfitLossFromOperatingActivities"] };
const NOISE = /total|consolidat|eliminat|intersegment|intragroup|unallocat|reconcil|adjust|^allother/i;
export function humanize(member) {
  let s = String(member).split(":").pop().replace(/Member$/, "").replace(/Segments?$/, "");
  s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function axisKind(axis) {
  const a = axis.split(":").pop();
  if (/geograph|region|area|countr/i.test(a)) return "geo";
  if (/product|brand|service/i.test(a)) return "produits";
  return "activites";
}
export function extractSegments(doc) {
  const facts = doc && doc.facts ? Object.values(doc.facts) : [];
  const by = {}; // axe -> exercice -> membre -> { ca, ebit }
  for (const f of facts) {
    const d = f.dimensions || {};
    if (!d.concept || !d.period || !d.period.includes("/")) continue;
    const key = Object.entries(SEG_CONCEPTS).find(([, cs]) => cs.includes(d.concept));
    if (!key) continue;
    const extra = Object.keys(d).filter(k => !BASE_DIMS.has(k));
    // Un seul axe de ventilation ; l'axe « éléments de consolidation » est toléré s'il vaut « secteurs opérationnels »
    const axes = extra.filter(k => !/ConsolidationItemsAxis/.test(k));
    if (axes.length !== 1) continue;
    const cons = extra.find(k => /ConsolidationItemsAxis/.test(k));
    if (cons && !/OperatingSegments|ReportableSegments/.test(d[cons])) continue;
    const axis = axes[0];
    if (!AXIS_OK.test(axis.split(":").pop())) continue;
    const member = d[axis];
    if (NOISE.test(member.split(":").pop())) continue;
    const { start, end } = parsePeriod(d.period);
    const days = (end - start) / 864e5; if (days < 330 || days > 400) continue;
    const v = Number(f.value); if (!isFinite(v)) continue;
    const y = fiscalYear(end);
    const A = (by[axis] = by[axis] || {}), Y = (A[y] = A[y] || {}), M = (Y[member] = Y[member] || {});
    if (M[key[0]] == null) M[key[0]] = v / 1e6;
  }
  return by;
}
// Fusionne les ventilations de plusieurs rapports et garde, par type d'axe, le meilleur axe du dernier exercice
export function bestSegments(list, total) {
  const all = {};
  for (const by of list) for (const [axis, years] of Object.entries(by)) for (const [y, mem] of Object.entries(years)) {
    const A = (all[axis] = all[axis] || {}); A[y] = A[y] || {};
    for (const [m, v] of Object.entries(mem)) A[y][m] = A[y][m] || v;
  }
  const out = {};
  for (const [axis, years] of Object.entries(all)) {
    const ys = Object.keys(years).map(Number).sort(), y = ys[ys.length - 1];
    const items = Object.entries(years[y]).filter(([, v]) => v.ca != null && v.ca > 0).map(([m, v]) => ({ m, name: humanize(m), ca: Math.round(v.ca), ebit: v.ebit != null ? Math.round(v.ebit) : null, prev: years[y - 1]?.[m]?.ca != null ? Math.round(years[y - 1][m].ca) : null }));
    if (items.length < 2 || items.length > 25) continue;
    const sum = items.reduce((a, i) => a + i.ca, 0), tot = total && total[y];
    if (tot && (sum > tot * 1.2 || sum < tot * 0.5)) continue; // ne correspond pas au chiffre d'affaires du groupe
    const kind = axisKind(axis), score = items.length + (tot ? 10 - Math.abs(1 - sum / tot) * 10 : 0);
    if (!out[kind] || out[kind].score < score) out[kind] = { axis, year: y, items: items.sort((a, b) => b.ca - a.ca), score };
  }
  for (const k of Object.keys(out)) delete out[k].score;
  return out;
}
