// Sonde (5/11/2026) : valeur liquidative des ETF Xtrackers (service etf.deutsche-am.com/api, cité dans la page etf.dws.com).
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2] || "data/sonde/out/xtrackers"; mkdirSync(OUT, { recursive: true });
const H = { "user-agent": "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)", accept: "application/json, */*" };
const ess = async (n, u) => { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(40000) }); const t = await r.text(); writeFileSync(`${OUT}/${n}.txt`, `${r.status} ${u}\n${t.slice(0, 200000)}`); console.log(n, r.status, t.length); } catch (e) { console.log(n, e.message); } await new Promise(r => setTimeout(r, 1500)); };
await ess("robots", "https://etf.deutsche-am.com/robots.txt");
for (const p of ["pdp/fr-fr/etf/IE00BJ0KDR00", "pdp/fr-fr/product/IE00BJ0KDR00", "pdp/fr-fr/etf/IE00BJ0KDR00/keyfacts", "pdp/fr-fr/etf/IE00BJ0KDR00/navs", "product/fr-fr/IE00BJ0KDR00", "pdp/de-de/etf/IE00BJ0KDR00"]) await ess(p.replace(/\W+/g, "_"), "https://etf.deutsche-am.com/api/" + p);
