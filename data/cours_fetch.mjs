// Le bot garde chaque jour une copie des cours (secours si la feuille ne répond pas) et les taux de change de la BCE.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { COURS_CSV, parseCours } from "./cours_config.mjs";
const OUT = new URL("../cf/site/data/", import.meta.url);
const today = new Date().toISOString().slice(0, 10);
try {
  const r = await fetch(COURS_CSV); const items = parseCours(await r.text());
  console.log(Object.keys(items).length, "cours lus dans la feuille");
  if (Object.keys(items).length > 50) {
    writeFileSync(new URL("cours.json", OUT), JSON.stringify({ updated: today, source: "Google Finance, cours de clôture ou différés", items }));
    // Historique quotidien (un fichier par mois) pour tracer nos propres courbes au fil du temps
    const dir = new URL("../data/historique/", import.meta.url); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const f = new URL(today.slice(0, 7) + ".json", dir), h = existsSync(f) ? JSON.parse(readFileSync(f)) : {};
    h[today] = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.p]));
    writeFileSync(f, JSON.stringify(h));
  }
} catch (e) { console.log("::warning::Cours non lus :", e.message); }
try {
  const r = await fetch("https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&format=csvdata");
  const lines = (await r.text()).trim().split(/\r?\n/), head = lines.shift().split(","), ic = head.indexOf("CURRENCY"), iv = head.indexOf("OBS_VALUE");
  const fx = { EUR: 1 }; for (const l of lines) { const c = l.split(","); const v = parseFloat(c[iv]); if (v > 0) fx[c[ic]] = 1 / v; } // 1 unité de devise = x euros
  if (fx.USD) { writeFileSync(new URL("fx.json", OUT), JSON.stringify({ updated: today, source: "BCE", eur: fx })); console.log(Object.keys(fx).length, "taux BCE"); }
} catch (e) { console.log("::warning::Taux BCE non lus :", e.message); }
