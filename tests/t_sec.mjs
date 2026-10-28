import { extractSec } from "../data/sec.mjs";
import { toSeries } from "../data/esef.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const d = (start, end, val, form = "10-K", filed = "2025-11-01") => ({ start, end, val, form, filed });
const i = (end, val, filed = "2025-11-01") => ({ end, val, form: "10-K", filed });
const doc = { entityName: "Exemple Inc", facts: { "us-gaap": {
  Revenues: { units: { USD: [d("2023-09-25", "2024-09-28", 100e9, "10-K", "2024-11-01"), d("2024-09-29", "2025-09-27", 110e9), d("2025-06-29", "2025-09-27", 30e9, "10-Q")] } },
  OperatingIncomeLoss: { units: { USD: [d("2024-09-29", "2025-09-27", 33e9)] } },
  NetIncomeLoss: { units: { USD: [d("2023-09-25", "2024-09-28", 20e9, "10-K", "2024-11-01"), d("2023-09-25", "2024-09-28", 21e9, "10-K", "2025-11-01"), d("2024-09-29", "2025-09-27", 25e9)] } },
  EarningsPerShareBasic: { units: { "USD/shares": [d("2024-09-29", "2025-09-27", 5)] } },
  StockholdersEquity: { units: { USD: [i("2025-09-27", 60e9)] } },
  CashAndCashEquivalentsAtCarryingValue: { units: { USD: [i("2025-09-27", 30e9)] } },
  LongTermDebtNoncurrent: { units: { USD: [i("2025-09-27", 80e9)] } },
  LongTermDebtCurrent: { units: { USD: [i("2025-09-27", 10e9)] } },
  NetCashProvidedByUsedInOperatingActivities: { units: { USD: [d("2024-09-29", "2025-09-27", 40e9)] } },
  PaymentsToAcquirePropertyPlantAndEquipment: { units: { USD: [d("2024-09-29", "2025-09-27", 10e9)] } },
  PaymentsOfDividendsCommonStock: { units: { USD: [d("2024-09-29", "2025-09-27", 5e9)] } },
} } };
const s = toSeries(extractSec(doc));
ok(s.years.join() === "2024,2025", "années " + s.years);
ok(s.fin.ca[1] === 110000, "CA annuel, pas trimestriel");
ok(s.fin.net[0] === 21000, "déclaration la plus récente retenue");
ok(s.fin.debt[1] === 90000 && s.fin.netDebt[1] === 60000, "dette nette");
ok(s.fin.fcf[1] === 30000, "flux libre");
ok(Math.abs(s.fin.dpsEst[1] - 1) < 1e-9, "dividende estimé " + s.fin.dpsEst);
ok(s.currency === "USD" && s.fyEnd === "09-27", "devise et fin d'exercice " + s.fyEnd);
// Société étrangère en IFRS (20-F, euros)
import { recentFilings, estimatedAgenda } from "../data/sec.mjs";
const D = (start, end, val) => ({ start, end, val, form: "20-F", filed: "2026-03-01" });
const ifrsDoc = { facts: { "ifrs-full": {
  Revenue: { units: { EUR: [D("2025-01-01", "2025-12-31", 50e9)] } },
  ProfitLossAttributableToOwnersOfParent: { units: { EUR: [D("2025-01-01", "2025-12-31", 5e9)] } },
  BasicEarningsLossPerShare: { units: { "EUR/shares": [D("2025-01-01", "2025-12-31", 2.5)] } },
  EquityAttributableToOwnersOfParent: { units: { EUR: [{ end: "2025-12-31", val: 40e9, form: "20-F", filed: "2026-03-01" }] } },
}, "us-gaap": {} } };
const s2 = toSeries(extractSec(ifrsDoc));
ok(s2.currency === "EUR" && s2.fin.ca[0] === 50000 && s2.fin.eps[0] === 2.5 && s2.fin.equity[0] === 40000, "IFRS 20-F en euros " + JSON.stringify(s2));
const sub = { filings: { recent: { form: ["8-K", "8-K", "10-Q", "4"], items: ["2.02,9.01", "9.01", "", ""], filingDate: ["2026-10-20", "2026-10-10", "2026-08-01", "2026-07-01"], acceptanceDateTime: ["2026-10-20T16:05:00.000Z", "", "", ""], accessionNumber: ["0000320193-26-000100", "x", "0000320193-26-000090", "y"], primaryDocument: ["a.htm", "b.htm", "c.htm", "d.xml"] } } };
const rf = recentFilings(sub, "0000320193");
ok(rf.length === 2 && rf[0].kind === "resultats" && rf[0].url.includes("/320193/000032019326000100/a.htm") && rf[1].kind === "rapport-trimestriel", "dépôts récents " + JSON.stringify(rf));
const ag = estimatedAgenda({ filings: { recent: { form: ["10-Q", "10-K"], filingDate: ["2025-11-05", "2025-02-01"] } } }, "2026-10-28");
ok(ag.length === 1 && ag[0].date === "2026-11-05" && ag[0].estimated, "agenda estimé " + JSON.stringify(ag));
console.log(fails ? fails + " échec(s)" : "sec : tout est bon"); process.exit(fails ? 1 : 0);
