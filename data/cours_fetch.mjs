// Le bot garde chaque jour une copie des cours (secours si la feuille ne répond pas) et les taux de change de la BCE.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { COURS_CSVS, parseCours } from "./cours_config.mjs";
import { clotures } from "../cf/src/synthese.mjs";
const OUT = new URL("../cf/site/data/", import.meta.url);
const today = new Date().toISOString().slice(0, 10);
try {
  const items = {};
  for (const u of COURS_CSVS) { try { const r = await fetch(u); Object.assign(items, parseCours(await r.text())); } catch (e) { console.log("::warning::Feuille de cours non lue :", e.message); } }
  console.log(Object.keys(items).length, "cours lus dans la feuille");
  if (Object.keys(items).length > 50) {
    // Les colonnes historiques de la feuille (plus haut/bas sur 52 semaines, cours il y a 1, 3 et 5 ans) tombent parfois toutes
    // en panne (limites de GOOGLEFINANCE). On garde alors la dernière valeur connue, au plus 10 jours, mémorisée dans data/cours_ref.json.
    const REF = new URL("../data/cours_ref.json", import.meta.url), HF = ["h52", "l52", "p1y", "p3y", "p5y"];
    let mem = { items: {} }; try { mem = JSON.parse(readFileSync(REF)); } catch (e) { }
    const frais = Object.values(items).filter(v => v.p1y != null).length;
    if (frais > Object.keys(items).length * 0.5) { // la feuille répond : on met la mémoire à jour
      mem = { date: today, items: Object.fromEntries(Object.entries(items).map(([k, v]) => [k, Object.fromEntries(HF.filter(f => v[f] != null).map(f => [f, v[f]]))])) };
      writeFileSync(REF, JSON.stringify(mem));
    } else if (mem.date && (Date.parse(today) - Date.parse(mem.date)) / 864e5 <= 10) {
      let n = 0; for (const [k, v] of Object.entries(items)) { const r = mem.items[k]; if (!r) continue; for (const f of HF) if (v[f] == null && r[f] != null) { v[f] = r[f]; n++; } }
      console.log(`::warning::Colonnes historiques vides dans la feuille : ${n} valeurs reprises du ${mem.date}`);
    }
    writeFileSync(new URL("cours.json", OUT), JSON.stringify({ updated: today, source: "Google Finance, cours de clôture ou différés", items }));
    // Historique quotidien (un fichier par mois) pour tracer nos propres courbes au fil du temps
    const dir = new URL("../data/historique/", import.meta.url); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const f = new URL(today.slice(0, 7) + ".json", dir), h = existsSync(f) ? JSON.parse(readFileSync(f)) : {};
    h[today] = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.p]));
    writeFileSync(f, JSON.stringify(h));
    // Cours d'il y a une semaine (jour de Bourse le plus proche, 6 à 9 jours avant) : sert au bilan hebdomadaire par e-mail
    const all = {}; for (const m of new Set([today.slice(0, 7), new Date(Date.now() - 12 * 864e5).toISOString().slice(0, 7), new Date(Date.now() - 22 * 864e5).toISOString().slice(0, 7)])) { const g = new URL(m + ".json", dir); if (existsSync(g)) Object.assign(all, JSON.parse(readFileSync(g))); }
    const ref = Object.keys(all).filter(d => d <= new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)).sort().pop();
    if (ref) writeFileSync(new URL("semaine.json", OUT), JSON.stringify({ date: ref, items: all[ref] }));
    // Cours de clôture des derniers jours de Bourse : synthèse de la semaine (variations, mini-graphiques).
    // Le robot passe tôt le matin : la copie du jour J contient la clôture du jour de Bourse précédent.
    const cl = clotures(all);
    if (cl.dates.length) writeFileSync(new URL("cours-semaine.json", OUT), JSON.stringify({ updated: today, source: "Google Finance, cours de clôture relevés chaque matin par le site", ...cl }));
  }
} catch (e) { console.log("::warning::Cours non lus :", e.message); }
try {
  const r = await fetch("https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&format=csvdata");
  const lines = (await r.text()).trim().split(/\r?\n/), head = lines.shift().split(","), ic = head.indexOf("CURRENCY"), iv = head.indexOf("OBS_VALUE");
  const fx = { EUR: 1 }; for (const l of lines) { const c = l.split(","); const v = parseFloat(c[iv]); if (v > 0) fx[c[ic]] = 1 / v; } // 1 unité de devise = x euros
  if (fx.USD) { writeFileSync(new URL("fx.json", OUT), JSON.stringify({ updated: today, source: "BCE", eur: fx })); console.log(Object.keys(fx).length, "taux BCE"); }
} catch (e) { console.log("::warning::Taux BCE non lus :", e.message); }
