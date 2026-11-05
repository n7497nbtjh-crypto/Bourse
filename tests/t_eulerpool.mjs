// Test de la conversion Eulerpool (data/eulerpool.mjs) sans réseau : prévisions écartées, contrôles, format du site.
import assert from "node:assert/strict";
import { convertirEP } from "../data/eulerpool.mjs";
const c = { id: "nestle", isin: "CH0038863350", sector: "conso", tv: "SIX:NESN" }, AUJ = "2026-11-05";
const inc = [2021, 2022, 2023, 2024, 2025, 2026, 2027].map((y, i) => ({ period: `${y}-12-31`, revenue: 87000 + i * 1000, ebit: 14000, netIncome: 9000, pretaxIncome: 11000, provisionforIncomeTaxes: 2000, diluted_eps: 3.5 }));
const bs = [2021, 2022, 2023, 2024, 2025].map(y => ({ period: `${y}-12-31`, cashShortTermInvestments: 6000, shortTermDebt: 11000, longTermDebt: 46000, equity: 62000 }));
const cf = [2024].map(y => ({ period: `${y}-12-31`, netOperatingCashFlow: 16675, capex: -5963, fcf: 10712, cashDividendsPaid: -7816 }));
let r = convertirEP(c, { profil: { currency: "CHF" }, inc, bs, cf }, AUJ);
assert.ok(r.comptes, r.raison);
assert.deepEqual(r.comptes.years, [2021, 2022, 2023, 2024, 2025], "les exercices 2026-2027 (prévisions, sans bilan) sont écartés");
assert.equal(r.comptes.currency, "CHF"); assert.equal(r.comptes.fyEnd, "12-31");
assert.equal(r.comptes.fin.debt.at(-1), 57000); assert.equal(r.comptes.fin.netDebt.at(-1), 51000);
assert.equal(r.comptes.fin.divPaid[3], 7816); assert.equal(r.comptes.fin.divPaid[4], null);
assert.equal(r.comptes.fin.equity, undefined, "fonds propres jamais repris");
assert.equal(r.comptes.sources[0].periodEnd, "2025-12-31"); assert.equal(r.comptes.sources[0].source, "Eulerpool");
// Refus
const fi = convertirEP({ ...c, sector: "finance" }, { profil: { currency: "CHF" }, inc, bs, cf }, AUJ).comptes;
assert.ok(fi && fi.fin.net && !fi.fin.ca && !fi.fin.debt, "banque : bénéfice seulement");
const saut = inc.map((x, i) => i === 1 ? { ...x, revenue: 20000 } : x);
assert.deepEqual(convertirEP(c, { profil: { currency: "CHF" }, inc: saut, bs, cf }, AUJ).comptes.years, [2023, 2024, 2025], "chiffre aberrant en 2022 : on garde les années propres après");
const benef = inc.map((x, i) => i === 4 ? { ...x, netIncome: 99999 } : x);
assert.ok(convertirEP(c, { profil: { currency: "CHF" }, inc: benef, bs, cf }, AUJ).raison, "dernière année incohérente : refus");
const benef0 = inc.map((x, i) => i === 0 ? { ...x, netIncome: 99999 } : x);
assert.deepEqual(convertirEP(c, { profil: { currency: "CHF" }, inc: benef0, bs, cf }, AUJ).comptes.years, [2022, 2023, 2024, 2025]);
assert.match(convertirEP(c, { profil: { currency: "CHF" }, inc, bs: bs.slice(0, 2), cf }, AUJ).raison, /clos le/);
assert.ok(convertirEP(c, { profil: {}, inc, bs, cf }, AUJ).raison);
assert.match(convertirEP({ ...c, tv: "HKEX:700" }, { profil: { currency: "CNY" }, inc, bs, cf }, AUJ).raison, /cotation/, "Tencent : comptes en CNY, cotation à Hong Kong");
// Dividendes : versement d'avril 2026 rattaché à l'exercice 2025, rien d'inventé quand Eulerpool n'a aucun versement
const dv = [{ period: "2025-04-22", dividend: 3.05 }, { period: "2026-04-20", dividend: 3.1 }];
const avecDiv = convertirEP(c, { profil: { currency: "CHF" }, inc, bs, cf, dv }, AUJ).comptes.fin.dps;
assert.equal(avecDiv.at(-1), 3.1); assert.equal(avecDiv.at(-2), 3.05); assert.equal(avecDiv[0], 0);
assert.equal(convertirEP(c, { profil: { currency: "CHF" }, inc, bs, cf, dv: [] }, AUJ).comptes.fin.dps, undefined);
const jp = convertirEP(c, { profil: { currency: "CHF" }, inc: inc.map(x => ({ ...x, period: x.period.replace("12-31", "03-31") })), bs: bs.map(x => ({ ...x, period: x.period.replace("12-31", "03-31") })), cf, dv: [{ period: "2024-09-27", dividend: 0.4 }, { period: "2025-03-28", dividend: 1.7 }, { period: "2025-09-29", dividend: 0.5 }] }, AUJ).comptes.fin.dps;
assert.equal(jp.at(-1), 2.1, "Japon : acompte de septembre + solde de mars");
const kr = ["2024-03-28", "2024-06-27", "2024-09-26", "2024-12-26", "2025-03-28", "2025-06-27", "2025-09-26", "2025-12-26", "2026-03-27"].map((p, i) => ({ period: p, dividend: 0.1 + i / 100 }));
const krD = convertirEP(c, { profil: { currency: "CHF" }, inc, bs, cf, dv: kr }, AUJ).comptes.fin.dps.at(-1);
assert.equal(Math.round(krD * 100) / 100, 0.62, "trimestriel : mars à décembre 2025, pas mars 2026");
console.log("t_eulerpool : OK");
