// Historisation des comptes (5e passage, A8, 31/10/2026) : une copie datée des comptes de chaque société, gardée dans le dépôt,
// seulement quand les chiffres changent (une à deux fois par an par société). Sert au rapport (« ce qui a changé »), aux comparaisons
// et, un jour, aux séries longues. Les cours de clôture, eux, sont déjà historisés chaque jour par data/cours_fetch.mjs
// (data/historique/<AAAA-MM>.json).
//   data/historique/comptes/index.json          { id: { empreinte, date, versions: n } }
//   data/historique/comptes/<AAAA-MM>.json      { "<id>@<date>": { date, years, currency, fyEnd, fin, sources } } (un fichier par mois)
// Usage : node data/historiser.mjs   (robot des données, après la collecte ; sans réseau)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const SRC = "cf/site/data/societes", DIR = "data/historique/comptes", jour = new Date().toISOString().slice(0, 10);
mkdirSync(DIR, { recursive: true });
const idxF = `${DIR}/index.json`, idx = existsSync(idxF) ? JSON.parse(readFileSync(idxF, "utf8")) : {};
const moisF = `${DIR}/${jour.slice(0, 7)}.json`, MOIS = existsSync(moisF) ? JSON.parse(readFileSync(moisF, "utf8")) : {};
let n = 0, total = 0;
for (const f of readdirSync(SRC).filter(f => f.endsWith(".json"))) {
  let s; try { s = JSON.parse(readFileSync(`${SRC}/${f}`, "utf8")); } catch (e) { continue; }
  if (!s.fin || !Array.isArray(s.years) || !s.years.length) continue;
  total++;
  const copie = { date: jour, years: s.years, currency: s.currency, fyEnd: s.fyEnd, fin: s.fin, sources: (s.sources || []).map(x => ({ periodEnd: x.periodEnd, source: x.source || (s.cik ? "SEC" : "ESEF") })) };
  const empreinte = createHash("sha1").update(JSON.stringify({ y: s.years, c: s.currency, f: s.fin })).digest("hex").slice(0, 16);
  if (idx[s.id] && idx[s.id].empreinte === empreinte) continue;
  MOIS[`${s.id}@${jour}`] = copie;
  idx[s.id] = { empreinte, date: jour, versions: ((idx[s.id] && idx[s.id].versions) || 0) + 1 };
  n++;
}
if (n) writeFileSync(moisF, JSON.stringify(MOIS));
writeFileSync(idxF, JSON.stringify(idx));
console.log(`${n} copie(s) datée(s) écrite(s) (${total} sociétés avec comptes, ${Object.keys(idx).length} historisées)`);
