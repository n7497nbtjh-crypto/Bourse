// Sonde (5/11) : symboles du S&P 500 et du Nasdaq-100 (tableaux Wikipédia en anglais). Écrit us_indices.json.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2] || process.env.SORTIE || "out"; mkdirSync(OUT, { recursive: true });
const UA = { "user-agent": "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)" };
const res = {};
for (const [k, page] of [["sp500", "List of S&P 500 companies"], ["ndx", "Nasdaq-100"]]) {
  const r = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=${encodeURIComponent(page)}`, { headers: UA });
  const wt = (await r.json()).parse.wikitext["*"]; writeFileSync(`${OUT}/${k}.wikitext`, wt);
  const s = new Set(); for (const m of wt.matchAll(/\{\{\s*(?:NYSE|NASDAQ|Nasdaq|nyse|nasdaq|Cboe|BZX)[^|}]*\|\s*([A-Z.\-]+)\s*\}\}/g)) s.add(m[1]);
  res[k] = [...s]; console.log(k, s.size, "symboles");
}
writeFileSync(`${OUT}/us_indices.json`, JSON.stringify(res));
