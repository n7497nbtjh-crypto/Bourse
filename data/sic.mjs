// Code d'activité SIC de la SEC (formulaire des sociétés cotées aux États-Unis) pour chaque fiche qui a un numéro CIK.
// Sert à trouver des rivales du même métier quand data/concurrents.json n'en a pas assez (data/rivales_auto.mjs).
// node data/sic.mjs  → data/sic.json { id: [sic, libellé] } ; ne redemande que les sociétés absentes.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { UA } from "./fetch_data.mjs";
const OUT = process.env.SORTIE ? new URL("file://" + process.env.SORTIE.replace(/^(?!\/)/, process.cwd() + "/") + "/sic.json") : new URL("./sic.json", import.meta.url), DIR = new URL("../cf/site/data/societes/", import.meta.url);
const S = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const ids = readdirSync(DIR).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
let n = 0;
for (const id of ids) {
  if (S[id]) continue;
  let cik; try { cik = JSON.parse(readFileSync(new URL(id + ".json", DIR), "utf8")).cik; } catch (e) { continue; }
  if (!cik) continue;
  try { const r = await fetch(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`, { headers: { "user-agent": UA } });
    if (r.ok) { const j = await r.json(); if (j.sic) { S[id] = [j.sic, j.sicDescription || ""]; n++; } } } catch (e) { }
  await new Promise(r => setTimeout(r, 130)); // moins de 10 demandes par seconde, comme le demande la SEC
  if (n % 100 === 99) writeFileSync(OUT, JSON.stringify(S));
}
writeFileSync(OUT, JSON.stringify(S)); console.log(n, "codes ajoutés,", Object.keys(S).length, "au total");
