// Sonde (5/11/2026) : essai réel de data/etf_vl.mjs (tous les émetteurs) depuis GitHub.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { valeursLiquidatives } from "../etf_vl.mjs";
const OUT = process.argv[2] || "data/sonde/out/vl-test"; mkdirSync(OUT, { recursive: true });
const L = JSON.parse(readFileSync(new URL("../../cf/site/data/etf.json", import.meta.url))).list;
const r = await valeursLiquidatives(L, m => console.log(m));
const c = {}; for (const v of Object.values(r)) c[v.src] = (c[v.src] || 0) + 1;
writeFileSync(OUT + "/vl.json", JSON.stringify(r)); console.log(JSON.stringify(c));
