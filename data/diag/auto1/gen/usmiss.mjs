// Sociétés américaines notables (Wikidata, cotées NYSE/Nasdaq) absentes de la liste, avec la raison du rejet par le générateur
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const D = "data/diag/auto1/";
const W = JSON.parse(readFileSync(D + "wd.json")), SS = JSON.parse(readFileSync(D + "sec_subs.json")), SB = JSON.parse(readFileSync(D + "sec_base.json"));
const U = (await import(pathToFileURL(resolve("data/univers.mjs")).href)).default;
const secT = new Set(U.map(c => c.sec).filter(Boolean)), tv = new Set(U.map(c => c.tv));
const f = SB.tickers.fields, rows = SB.tickers.data.map(r => Object.fromEntries(f.map((k, i) => [k, r[i]])));
const byT = {}; for (const r of rows) byT[r.ticker] = r;
const out = [];
for (const [q, o] of Object.entries(W)) {
  const xs = (o.x || []).filter(([x]) => x === "Q13677" || x === "Q82059"); if (!xs.length) continue;
  const t = String(xs[0][1] || "").toUpperCase().replace(/\./g, "-"); if (!t) continue;
  const r = byT[t]; if (!r) continue; // plus coté (ou symbole changé)
  if (secT.has(t) || tv.has((xs[0][0] === "Q13677" ? "NYSE:" : "NASDAQ:") + t.replace(/-/g, "."))) continue;
  const s = SS[r.cik];
  out.push([+o.sl || 0, o.en || o.fr, t, r.exchange, s ? s.sic + " " + (s.sd || "") : "fiche SEC non lue", (SB.frames[r.cik] || 0) / 1e9]);
}
out.sort((a, b) => b[0] - a[0]);
console.log(out.length); console.log(out.slice(0, +(process.argv[2] || 80)).map(x => x.map(v => typeof v === "number" ? Math.round(v * 10) / 10 : v).join(" | ")).join("\n"));
