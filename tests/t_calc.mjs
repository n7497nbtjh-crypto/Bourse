// Vérifie les calculs sur des cas simples dont on connaît la réponse.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const C = require("../cf/site/calc.js");
let bad = 0;
const near = (a, b, tol, msg) => { const ok = Math.abs(a - b) <= tol; if (!ok) bad++; console.log(ok ? "ok " : "ÉCART", msg, a, "attendu", b); };
// 1. 10 % par an sur 2 ans
near(C.annualize(Array(24).fill(Math.pow(1.1, 1 / 12) - 1)), 0.10, 1e-9, "rendement annualisé");
// 2. TRI : -100 puis +121 deux ans après = 10 %
near(C.xirr([{ t: 0, v: -100 }, { t: 2, v: 121 }]), 0.10, 1e-6, "TRI simple");
// 3. Perte maximale : 100 -> 50 -> 100 = -50 %, récupérée en 1 mois
const dd = C.drawdown([100, 80, 50, 100]); near(dd.max, -0.5, 1e-9, "perte maximale"); near(dd.recovery, 1, 0, "temps de récupération");
// 4. Intérêts composés : 1000 € à 5 % pendant 10 ans sans versement
near(C.compound({ initial: 1000, monthly: 0, years: 10, rate: 0.05 }).final, 1000 * 1.05 ** 10, 1e-6, "intérêts composés");
// 5. Simulation : prix qui monte de 1 % par mois, sans frais ni versement => rendement = 1,01^12 - 1
const months = Array.from({ length: 25 }, (_, i) => `20${10 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, "0")}`);
const prices = months.map((_, i) => 100 * 1.01 ** i);
const r = C.backtest(months, [{ prices, divs: [], w: 1 }], { start: 0, initial: 1000, monthly: 0, rebalance: "aucun", reinvest: true, fee: 0 });
near(r.twr, 1.01 ** 12 - 1, 1e-9, "simulation : rendement des placements");
near(r.tri, 1.01 ** 12 - 1, 1e-6, "simulation : TRI = rendement sans versement");
near(r.final, 1000 * 1.01 ** 24, 1e-6, "simulation : valeur finale");
// 6. Versements réguliers à prix fixe : gain nul, TRI nul
const flat = months.map(() => 50);
const r2 = C.backtest(months, [{ prices: flat, divs: [], w: 1 }], { start: 0, initial: 500, monthly: 100, rebalance: "annuel", reinvest: true, fee: 0 });
near(r2.gain, 0, 1e-6, "prix fixe : gain nul"); near(r2.tri, 0, 1e-6, "prix fixe : TRI nul");
// 7. Frais : 1 € par ordre, 25 ordres => 25 €
const r3 = C.backtest(months, [{ prices: flat, divs: [], w: 1 }], { start: 0, initial: 500, monthly: 100, rebalance: "aucun", reinvest: true, fee: 1 });
near(r3.fees, 25, 1e-9, "frais par ordre"); near(r3.gain, -25, 1e-6, "les frais réduisent le gain");
// 8. Dividende de 5 € à prix fixe 50, encaissé : gain = 5 × nombre de titres
const r4 = C.backtest(months, [{ prices: flat, divs: [{ m: months[6], dps: 5 }], w: 1 }], { start: 0, initial: 1000, monthly: 0, rebalance: "aucun", reinvest: false, fee: 0 });
near(r4.gain, 100, 1e-6, "dividende encaissé");
// 9. PEA > 5 ans : impôt = 18,6 % du gain ; rendement nul => aucun impôt
const p = C.peaCto({ initial: 1000, monthly: 0, years: 6, growth: 0.1, yieldD: 0, rates: { pfu: 0.314, ps: 0.186 } });
near(p.pea.tax, (p.pea.gross - 1000) * 0.186, 1e-6, "PEA : prélèvements sociaux");
near(p.cto.tax, (p.cto.gross - 1000) * 0.314, 1e-6, "CTO : prélèvement forfaitaire");
// 10. Une fois / étalé à prix fixe : identique
const l = C.lumpVsDca(flat, 0, 20, 1200, 12); near(l.lump - l.dca, 0, 1e-9, "une fois = étalé à prix fixe");
console.log(bad ? `${bad} écart(s)` : "0 écart");
process.exit(bad ? 1 : 0);
