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
assert.ok(convertirEP({ ...c, sector: "finance" }, { profil: { currency: "USD" }, inc, bs, cf }, AUJ).raison);
const saut = inc.map((x, i) => i === 3 ? { ...x, revenue: 20000 } : x);
assert.match(convertirEP(c, { profil: { currency: "CHF" }, inc: saut, bs, cf }, AUJ).raison, /saut/);
const benef = inc.map((x, i) => i === 4 ? { ...x, netIncome: 99999 } : x);
assert.match(convertirEP(c, { profil: { currency: "CHF" }, inc: benef, bs, cf }, AUJ).raison, /bénéfice/);
assert.match(convertirEP(c, { profil: { currency: "CHF" }, inc, bs: bs.slice(0, 2), cf }, AUJ).raison, /clos le/);
assert.ok(convertirEP(c, { profil: {}, inc, bs, cf }, AUJ).raison);
assert.match(convertirEP({ ...c, tv: "HKEX:700" }, { profil: { currency: "CNY" }, inc, bs, cf }, AUJ).raison, /cotation/, "Tencent : comptes en CNY, cotation à Hong Kong");
console.log("t_eulerpool : OK");
