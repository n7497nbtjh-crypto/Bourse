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
// Rapport iXBRL déposé à l'AMF (data/amf.mjs) : contextes, échelle, signe, formats « point » et « virgule », ventilations ignorées
const { ixbrlToJson, ixValue, unzip } = await import("../data/amf.mjs");
const ix = `<xbrli:context id="d"><xbrli:entity><xbrli:identifier scheme="s">L</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context>
<xbrli:context id="s"><xbrli:entity><xbrli:identifier scheme="s">L</xbrli:identifier><xbrli:segment><xbrldi:explicitMember dimension="ifrs-full:SegmentsAxis">x:AMember</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context>
<xbrli:context id="i"><xbrli:entity><xbrli:identifier scheme="s">L</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:instant>2025-12-31</xbrli:instant></xbrli:period></xbrli:context>
<xbrli:unit id="u"><xbrli:measure>iso4217:EUR</xbrli:measure></xbrli:unit>
<ix:nonFraction name="ifrs-full:Revenue" contextRef="d" unitRef="u" scale="6" format="ixt:num-dot-decimal">80,807</ix:nonFraction>
<ix:nonFraction name="ifrs-full:Revenue" contextRef="s" unitRef="u" scale="6" format="ixt:num-dot-decimal">40,000</ix:nonFraction>
<ix:nonFraction name="ifrs-full:ProfitLossAttributableToOwnersOfParent" contextRef="d" unitRef="u" scale="6" format="ixt:num-comma-decimal"><span>10.878,5</span></ix:nonFraction>
<ix:nonFraction name="ifrs-full:CashAndCashEquivalents" contextRef="i" unitRef="u" scale="6" sign="-" format="ixt:num-dot-decimal">1 000</ix:nonFraction>`;
const ixr = extract(ixbrlToJson([ix])).years[2025] || {};
near(ixr.ca, 80807, "iXBRL : chiffre d'affaires du groupe (ventilation ignorée)");
near(ixr.net, 10878.5, "iXBRL : format à virgule décimale");
near(ixr.cash, -1000, "iXBRL : signe négatif et date de bilan");
near(ixValue("-", "ixt:fixed-zero"), 0, "iXBRL : tiret = zéro");
if (Object.keys(unzip(Buffer.from("pas un zip"))).length) { bad++; console.log("ÉCART zip invalide"); } else console.log("ok  fichier qui n'est pas un zip : ignoré");
const { expectedYear } = await import("../data/fetch_data.mjs");
const ey = [expectedYear("12-31", new Date("2026-03-15T00:00:00Z")), expectedYear("12-31", new Date("2026-05-15T00:00:00Z")), expectedYear("03-31", new Date("2026-10-29T00:00:00Z"))].join();
if (ey !== "2024,2025,2026") { bad++; console.log("ÉCART exercice attendu", ey); } else console.log("ok  exercice attendu selon la date de clôture");
console.log(bad ? `${bad} écart(s)` : "0 écart"); process.exit(bad ? 1 : 0);
