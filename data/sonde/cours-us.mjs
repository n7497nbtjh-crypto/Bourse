// Sonde (5/11/2026) : (1) que publient les copies 3 et 4 de la feuille de cours ? (2) le service de cours de Nasdaq
// (api.nasdaq.com, déjà lu pour le calendrier des dividendes) donne-t-il le dernier cours des actions américaines ?
import { writeFileSync, mkdirSync } from "node:fs";
import { COURS_CSVS } from "../cours_config.mjs";
const OUT = process.argv[2] || "data/sonde/out/cours-us"; mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [i, u] of COURS_CSVS.entries()) { try { const r = await fetch(u); const t = await r.text(); writeFileSync(`${OUT}/feuille${i + 1}.csv`, `${r.status}\n${t.slice(0, 20000)}`); console.log("feuille", i + 1, r.status, t.length); } catch (e) { console.log("feuille", i + 1, e.message); } }
const H = { "user-agent": "Mozilla/5.0 (compatible; ENKLAIR-bot/1.0; +https://enklair.com/methode)", accept: "application/json, text/plain, */*" };
for (const t of ["SM", "KTB", "AAPL"]) for (const u of [`https://api.nasdaq.com/api/quote/${t}/info?assetclass=stocks`, `https://api.nasdaq.com/api/quote/${t}/summary?assetclass=stocks`]) {
  try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); const x = await r.text(); writeFileSync(`${OUT}/${t}-${u.includes("info") ? "info" : "summary"}.json`, `${r.status}\n${x.slice(0, 20000)}`); console.log(t, r.status, x.length); } catch (e) { console.log(t, e.message); }
  await sleep(800);
}
try { const r = await fetch("https://api.nasdaq.com/robots.txt"); writeFileSync(`${OUT}/robots.txt`, `${r.status}\n` + await r.text()); } catch (e) { }
