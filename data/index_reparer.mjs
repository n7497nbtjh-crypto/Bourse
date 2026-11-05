// Remet dans cf/site/data/societes.json les sociétés de l'univers qui en manquent (5/11).
// Pourquoi : un robot lancé avant l'ajout d'un lot écrit la liste avec l'ancien univers ; au « git pull -X theirs », sa version
// de societes.json l'emporte et les sociétés du nouveau lot disparaissent de la liste (leurs fiches restent). Lancé par les
// robots juste après le pull, avec l'univers à jour. Remet aussi les comptes d'une société marquée sans comptes dont la fiche en a. Affiche le nombre de sociétés remises.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = new URL("../cf/site/data/", import.meta.url);
const { default: U } = await import("./univers.mjs"), { summary } = await import("./fetch_data.mjs");
const f = new URL("societes.json", OUT), idx = JSON.parse(readFileSync(f, "utf8")), vus = new Set(idx.companies.map(c => c.id));
let n = 0;
// Société marquée « comptes absents » alors que sa fiche a des comptes (fiche écrite par un autre robot pendant la collecte)
idx.companies.forEach((e, i) => { if (!e.missing) return; const fiche = new URL(`societes/${e.id}.json`, OUT); if (!existsSync(fiche)) return;
  const j = JSON.parse(readFileSync(fiche, "utf8")); if ((j.years || []).length) { idx.companies[i] = summary(j); n++; } });
for (const c of U) {
  if (vus.has(c.id)) continue;
  const fiche = new URL(`societes/${c.id}.json`, OUT);
  idx.companies.push(existsSync(fiche) ? summary(JSON.parse(readFileSync(fiche, "utf8")))
    : { id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector, missing: true });
  n++;
}
if (n) writeFileSync(f, JSON.stringify(idx));
console.log(n, "société(s) remise(s) dans societes.json");
