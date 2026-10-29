// Noms proches entre un lot et le reste de la liste (repérage de doublons) : node data/diag/auto1/gen/proches.mjs data/lots/auto2.mjs
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const U = (await import(pathToFileURL(resolve("data/univers.mjs")).href)).default;
const L = (await import(pathToFileURL(resolve(process.argv[2])).href)).default, ids = new Set(L.map(c => c.id));
const n = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
for (const c of L) { const k = n(c.name).slice(0, 5); const sim = U.filter(x => !ids.has(x.id) && n(x.name).includes(k)); if (sim.length) console.log(c.name, "<->", sim.map(x => x.name + " (" + x.tv + ")").join(", ")); }
