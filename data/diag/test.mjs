// Diagnostic : feuille Google des cours (combien de lignes, où elle s'arrête, quels onglets)
import { writeFileSync, readFileSync } from "node:fs";
import { COURS_CSV, parseCours } from "../cours_config.mjs";
const log = [], L = (...a) => { const s = a.join(" "); log.push(s); console.log(s); };
try {
  const t = await (await fetch(COURS_CSV)).text();
  const lines = t.split(/\r?\n/);
  L("lignes du CSV publié", lines.length, "taille", t.length);
  L("en-tête", lines[0]);
  for (const i of [1, 2, 3, 500, 1000, 1100, 1140, 1150, 1160, 1170, 1180, 1199, 1200, 1201, 1300, 2000, 2300, lines.length - 2, lines.length - 1]) if (lines[i] != null) L("ligne", i, lines[i].slice(0, 160));
  const items = parseCours(t); L("cours lus", Object.keys(items).length);
  const gf = readFileSync("cf/site/data/gf.csv", "utf8").split(/\r?\n/); L("gf.csv lignes", gf.length);
  const ids = lines.map(l => l.split(",")[0]);
  const firstMissing = gf.slice(1).map(l => l.split(",")[0]).findIndex(id => id && !ids.includes(id)); L("premier id de gf.csv absent de la feuille : rang", firstMissing, gf[firstMissing + 1]);
  // vides : lignes présentes sans cours
  const empty = lines.filter(l => /^[cei]:/.test(l) && !items[l.split(",")[0]]).length; L("lignes sans cours", empty, "exemples", lines.filter(l => /^[cei]:/.test(l) && !items[l.split(",")[0]]).slice(0, 8).join(" || ").slice(0, 600));
  const ph = await (await fetch(COURS_CSV.replace(/pub\?output=csv.*/, "pubhtml"))).text();
  L("onglets", JSON.stringify([...ph.matchAll(/gid=(\d+)[^>]*>([^<]{1,40})</g)].map(m => [m[1], m[2]]).slice(0, 10)), "taille pubhtml", ph.length);
} catch (e) { L("erreur", e.message); }
writeFileSync("data/diag/out.json", JSON.stringify({ cours: log }, null, 1));
