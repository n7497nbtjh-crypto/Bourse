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
console.log(fails ? fails + " échec(s)" : "sec : tout est bon"); process.exit(fails ? 1 : 0);
