// Vérifie la lecture des rapports ESEF et la collecte complète, avec des réponses d'exemple (sans réseau).
import { extract, merge, toSeries } from "../data/esef.mjs";
import { collectOne, summary } from "../data/fetch_data.mjs";
import * as X from "./fixtures/make.mjs";
let bad = 0;
const near = (a, b, m) => { const ok = a != null && Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)); if (!ok) bad++; console.log(ok ? "ok " : "ÉCART", m, a, "attendu", b); };
const r = extract(X.reports[2025]);
near(r.years[2025].ca, 20000, "chiffre d'affaires 2025 en M€ (ventilations et semestre ignorés)");
near(r.years[2024].ca, 19000, "année précédente lue dans le même rapport");
near(r.years[2025].debt, 6000, "dette = long terme + court terme");
near(r.years[2025].netDebt, 4000, "dette nette = dette − trésorerie");
near(r.years[2025].fcf, 20000 * 0.22 - 20000 * 0.06, "flux de trésorerie disponible");
near(r.years[2025].ebitda, 20000 * 0.25, "EBITDA estimé");
near(r.years[2025].dps, 1.2, "dividende par action (non divisé par un million)");
if (r.currency !== "EUR" || r.fyEnd !== "12-31") { bad++; console.log("ÉCART devise ou clôture", r.currency, r.fyEnd); } else console.log("ok  devise et date de clôture");
const m = toSeries(merge([extract(X.reports[2025]), extract(X.reports[2024]), extract(X.reports[2023])]));
if (m.years.join() !== "2022,2023,2024,2025") { bad++; console.log("ÉCART années", m.years); } else console.log("ok  4 exercices fusionnés");
near(m.fin.ca[2], 19000, "le rapport le plus récent l'emporte (2024)");
// Collecte complète avec un faux réseau
const fake = async url => {
  const j = url.includes("gleif") ? X.gleif : url.includes("/api/filings") ? X.filings : url.match(/exemple-(\d{4})\.json$/) ? X.reports[url.match(/exemple-(\d{4})/)[1]] : null;
  if (url.includes("ancien-")) throw new Error("le rapport remplacé ne doit pas être téléchargé");
  return { ok: !!j, status: j ? 200 : 404, json: async () => j };
};
const c = await collectOne(fake, { id: "exemple", name: "Société Exemple", ticker: "EX", tv: "EURONEXT:EX", isin: "FR0000000000", sector: "industrie" });
if (c.lei !== "969500EXEMPLE0000001" || c.sources.length !== 3 || !c.sources[0].report.startsWith("https://filings.xbrl.org/")) { bad++; console.log("ÉCART collecte", c.lei, c.sources); } else console.log("ok  collecte : LEI, 3 rapports, liens complets");
near(summary(c).ca, 20000, "résumé pour la liste");
// Étiquettes propres à une entreprise (exemple inspiré de LVMH et Safran)
const ext = { facts: {
  a: { value: "86000000000", dimensions: { concept: "ifrs-full:Revenue", period: "2024-01-01T00:00:00/2025-01-01T00:00:00", unit: "iso4217:EUR" } },
  b: { value: "19500000000", dimensions: { concept: "LVM:ProfitLossFromOperatingActivitiesAfterShareOfProfitLossOfAssociatesAndJointVentures", period: "2024-01-01T00:00:00/2025-01-01T00:00:00", unit: "iso4217:EUR" } },
  c: { value: "2446000000", dimensions: { concept: "saf:NonCurrentInterestBearingFinancialLiablities", period: "2025-01-01T00:00:00", unit: "iso4217:EUR" } },
  d: { value: "2605000000", dimensions: { concept: "saf:CurrentInterestBearingFinancialLiablities", period: "2025-01-01T00:00:00", unit: "iso4217:EUR" } },
  e: { value: "1000000000", dimensions: { concept: "ifrs-full:CashAndCashEquivalents", period: "2025-01-01T00:00:00", unit: "iso4217:EUR" } },
  f: { value: "7000000000", dimensions: { concept: "LVM:AdjustmentsForProvisionsAndAdjustmentsForDepreciationAndAmortisationExpense", period: "2024-01-01T00:00:00/2025-01-01T00:00:00", unit: "iso4217:EUR" } },
  g: { value: "900000000", dimensions: { concept: "LVM:AdjustmentsForDepreciationRightOfUseAssets", period: "2024-01-01T00:00:00/2025-01-01T00:00:00", unit: "iso4217:EUR" } },
} };
const e = extract(ext).years[2024];
near(e.ebit, 19500, "résultat d'exploitation lu sur une étiquette propre");
near(e.debt, 5051, "dette : parts long et court terme propres à l'entreprise");
near(e.netDebt, 4051, "dette nette correspondante");
near(e.ebitda, 26500, "EBITDA : amortissements totaux, sous-totaux ignorés");
console.log(bad ? `${bad} écart(s)` : "0 écart"); process.exit(bad ? 1 : 0);
