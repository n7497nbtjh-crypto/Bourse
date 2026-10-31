// Test de l'import EODHD (data/eodhd.mjs) sans clé ni réseau : la fixture tests/fixtures/eodhd_sample.json doit donner
// une fiche au format v4 du site (5 années, devise, millions, dette nette, trimestres) et passer les règles de t_coherence.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { convertir, tickerEodhd } from "../data/eodhd.mjs";
const fx = JSON.parse(readFileSync("tests/fixtures/eodhd_sample.json", "utf8"));
const c = { id: "samsung-electronics", name: "Samsung Electronics", ticker: "005930", tv: "KRX:005930", isin: "KR7005930003", sector: "tech", region: "MONDE", domain: "samsung.com", desc: "" };
assert.equal(tickerEodhd(c), "005930.KO");
assert.equal(tickerEodhd({ tv: "EURONEXT:ASML", isin: "NL0010273215" }), "ASML.AS");
assert.equal(tickerEodhd({ tv: "EURONEXT:MC", isin: "FR0000121014" }), "MC.PA");
assert.equal(tickerEodhd({ tv: "HKEX:700", isin: "KYG875721634" }), "0700.HK");
assert.equal(tickerEodhd({ tv: "NYSE:BRK.B" }), "BRK-B.US");
assert.equal(tickerEodhd({ tv: "INCONNU:X" }), null);
const r = convertir(c, fx);
assert.ok(r && r.societe && r.trim, "conversion");
const s = r.societe, f = s.fin;
assert.deepEqual(s.years, [2021, 2022, 2023, 2024, 2025]);
assert.equal(s.currency, "KRW"); assert.equal(s.fyEnd, "12-31"); assert.equal(s.v, 4);
for (const k of ["ca", "ebit", "net", "eps", "divPaid", "equity", "cash", "debt", "netDebt", "cfo", "capex", "fcf", "tax"]) assert.equal(f[k].length, 5, k);
assert.equal(f.ca[4], 311000000); // 311 000 milliards de wons = 311 000 000 millions
assert.equal(f.eps[4], 5300);
assert.equal(f.netDebt[0], Math.round((f.debt[0] - f.cash[0]) * 10) / 10);
assert.ok(f.capex.every(v => v > 0) && f.divPaid.every(v => v > 0), "capex et dividendes en valeur absolue");
assert.equal(s.sources.length, 5); assert.equal(s.sources[0].source, "EODHD"); assert.equal(s.sources[0].periodEnd, "2025-12-31");
assert.equal(s.norme, "EODHD");
assert.equal(r.trim.q.length, 4); assert.equal(r.trim.q[3].end, "2025-12-31"); assert.equal(r.trim.q[3].ca, 72000000); assert.equal(r.trim.currency, "KRW");
// sans ventes : rien
assert.equal(convertir(c, { General: { CurrencyCode: "KRW" }, Financials: {} }), null);
console.log("eodhd : tout est bon (conversion, tickers, trimestres)");
