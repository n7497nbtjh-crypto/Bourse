// Diagnostic : fiches EDGAR (code SIC, site, formulaires) des sociétés cotées à New York non encore lues (suite de data/diag/auto1/sec_subs.json)
import { writeFileSync, readFileSync } from "node:fs";
const DIR = "data/diag/auto1/";
const UA = "bilan-univers/1.0 (site pedagogique; " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse") + ")";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = [], L = (...a) => { const s = `[${Math.round((Date.now() - T0) / 1000)}s] ` + a.join(" "); log.push(s); console.log(s); };
const S = JSON.parse(readFileSync(DIR + "sec_base.json")), subs = JSON.parse(readFileSync(DIR + "sec_subs.json"));
const U = (await import("../univers.mjs")).default, have = new Set(U.map(c => c.sec).filter(Boolean)), haveCik = new Set(U.map(c => c.cik && +c.cik).filter(Boolean));
const f = S.tickers.fields, rows = S.tickers.data.map(r => Object.fromEntries(f.map((k, i) => [k, r[i]])));
const byCik = {}; for (const r of rows) (byCik[r.cik] || (byCik[r.cik] = [])).push(r);
for (const r of rows) if (have.has(r.ticker)) haveCik.add(r.cik);
const todo = Object.keys(byCik).map(Number).filter(c => !haveCik.has(c) && !subs[c] && byCik[c].some(r => ["NYSE", "Nasdaq"].includes(r.exchange)));
L("fiches à lire", todo.length);
let qi = 0, n = 0;
await Promise.all([0, 1].map(async () => {
  while (qi < todo.length && Date.now() - T0 < 13.5 * 60e3) {
    const c = todo[qi++];
    try {
      const r = await fetch(`https://data.sec.gov/submissions/CIK${String(c).padStart(10, "0")}.json`, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(30e3) });
      if (r.status === 429) { L("429"); await sleep(10e3); qi--; continue; }
      if (r.ok) {
        const j = await r.json(), rec = j.filings && j.filings.recent || {};
        const forms = {}; (rec.form || []).forEach((fm, i) => { if (/^(10-K|20-F|40-F|10-Q|6-K)$/.test(fm) && !forms[fm]) forms[fm] = rec.filingDate[i]; });
        subs[c] = { n: j.name, sic: j.sic, sd: j.sicDescription, w: j.website, t: j.tickers, x: j.exchanges, et: j.entityType, cat: j.category, st: j.stateOfIncorporation, ad: j.addresses && j.addresses.business && j.addresses.business.stateOrCountry, fm: forms, fy: j.fiscalYearEnd };
        if (++n % 300 === 0) { L("fiches", n); writeFileSync(DIR + "sec_subs.json", JSON.stringify(subs)); }
      }
    } catch (e) { }
    await sleep(260);
  }
}));
writeFileSync(DIR + "sec_subs.json", JSON.stringify(subs)); L("fini", n, "nouvelles fiches, total", Object.keys(subs).length);
writeFileSync("data/diag/out.json", JSON.stringify({ sec: log }, null, 1));
