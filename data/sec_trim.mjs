// Trimestres des sociétés américaines : lus dans companyfacts (SEC), écrits dans cf/site/data/trim/<id>.json.
// Chaque société est relue au plus une fois par semaine (étalée par identifiant), ou si --tout.   node data/sec_trim.mjs [--tout] [--max N]
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { extractSecTrim, factsUrl } from "./sec.mjs";
import { getJSON } from "./fetch_data.mjs";
const OUT = new URL("../cf/site/data/trim/", import.meta.url), SOC = new URL("../cf/site/data/societes/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const tout = process.argv.includes("--tout"), mi = process.argv.indexOf("--max"), max = mi > 0 ? +process.argv[mi + 1] : 400;
const today = new Date().toISOString().slice(0, 10), dow = new Date().getUTCDay();
const cos = readdirSync(SOC).filter(f => f.endsWith(".json")).map(f => { try { const s = JSON.parse(readFileSync(new URL(f, SOC))); return s.cik ? { id: s.id, cik: s.cik, name: s.name } : null; } catch (e) { return null; } }).filter(Boolean);
const due = cos.filter(c => { if (tout) return true; const h = [...c.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 7, 0); if (h !== dow) return false; const f = new URL(c.id + ".json", OUT); if (!existsSync(f)) return true; try { return JSON.parse(readFileSync(f)).updated !== today; } catch (e) { return true; } }).slice(0, max);
console.log(`${cos.length} sociétés à la SEC, ${due.length} à lire aujourd'hui`);
let n = 0, ok = 0, err = 0;
const one = async c => { try { const doc = await getJSON(fetch, factsUrl(c.cik)); const t = doc && extractSecTrim(doc); if (t && t.q.length) { writeFileSync(new URL(c.id + ".json", OUT), JSON.stringify({ id: c.id, updated: today, source: factsUrl(c.cik), ...t })); ok++; } } catch (e) { err++; if (err <= 5) console.log("ÉCHEC", c.name, e.message); } if (++n % 50 === 0) console.log(n, "lues"); };
const L = due.slice(); await Promise.all(Array.from({ length: 5 }, async () => { while (L.length) await one(L.shift()); }));
const index = readdirSync(OUT).filter(f => f.endsWith(".json") && f !== "index.json").map(f => f.slice(0, -5));
writeFileSync(new URL("index.json", OUT), JSON.stringify({ updated: today, ids: index }));
console.log(`${ok} fichiers écrits, ${err} échecs, ${index.length} sociétés avec trimestres`);
