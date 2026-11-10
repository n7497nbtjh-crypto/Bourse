// Trimestres des sociétés américaines : lus dans companyfacts (SEC), écrits dans cf/site/data/trim/<id>.json.
// 24 derniers trimestres (6 ans, 4/11/2026) : la fiche compare chaque trimestre de l'année en cours aux mêmes trimestres des années précédentes.
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
// 10/11 (Romain : « dès qu'un résultat sort, il doit être sur la fiche ») : toute société qui vient de déposer un rapport
// trimestriel ou annuel à la SEC (data actu-sec.json, relu chaque jour) passe en tête, quel que soit son jour de relecture.
{ let rec = []; try { rec = JSON.parse(readFileSync(new URL("../cf/site/data/actu-sec.json", import.meta.url))).items || []; } catch (e) { }
  const neuf = new Set(rec.filter(r => /^(10-Q|10-K|20-F|40-F)/.test(r.form || "")).filter(r => { const f = new URL(r.id + ".json", OUT);
    if (!existsSync(f)) return true; try { const j = JSON.parse(readFileSync(f)), q = j.q || [], last = q.reduce((m, x) => x.filed > m ? x.filed : m, ""); return String(r.date).slice(0, 10) > last; } catch (e) { return true; } }).map(r => r.id));
  const prio = cos.filter(c => neuf.has(c.id)); if (prio.length) { const ids = new Set(prio.map(c => c.id)); due.splice(0, due.length, ...prio, ...due.filter(c => !ids.has(c.id))); due.length = Math.min(due.length, Math.max(max, prio.length)); }
  console.log(`${prio.length} sociétés avec un rapport tout juste déposé, lues en priorité`); }
console.log(`${cos.length} sociétés à la SEC, ${due.length} à lire aujourd'hui`);
let n = 0, ok = 0, err = 0;
const one = async c => { try { const doc = await getJSON(fetch, factsUrl(c.cik)); const t = doc && extractSecTrim(doc, 24); if (t && t.q.length) { writeFileSync(new URL(c.id + ".json", OUT), JSON.stringify({ id: c.id, updated: today, source: factsUrl(c.cik), ...t })); ok++; } } catch (e) { err++; if (err <= 5) console.log("ÉCHEC", c.name, e.message); } if (++n % 50 === 0) console.log(n, "lues"); };
const L = due.slice(); await Promise.all(Array.from({ length: 5 }, async () => { while (L.length) await one(L.shift()); }));
const index = readdirSync(OUT).filter(f => f.endsWith(".json") && f !== "index.json").map(f => f.slice(0, -5));
writeFileSync(new URL("index.json", OUT), JSON.stringify({ updated: today, ids: index }));
console.log(`${ok} fichiers écrits, ${err} échecs, ${index.length} sociétés avec trimestres`);
