// Contrôle d'un lot d'entreprises : node tests/t_lot.mjs data/lots/xxx.mjs
import { isinOk } from "../data/isin.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const SECT = ["conso", "industrie", "energie", "sante", "tech", "finance", "telecom", "materiaux", "services", "immo"];
const { default: L } = await import(pathToFileURL(resolve(process.argv[2])).href);
let bad = 0; const ids = new Set();
for (const c of L) {
  const e = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id || "")) e.push("id");
  if (ids.has(c.id)) e.push("doublon"); ids.add(c.id);
  if (c.isin && !isinOk(c.isin)) e.push("ISIN invalide " + c.isin);
  if (!c.isin && !c.sec) e.push("ni isin ni sec");
  if (!["FR", "EU", "US", "MONDE"].includes(c.region)) e.push("region");
  if (!SECT.includes(c.sector)) e.push("secteur");
  if (!/^[A-Z_]+:[A-Z0-9._]+$/.test(c.tv || "")) e.push("tv");
  for (const k of ["name", "ticker", "domain", "desc"]) if (!c[k]) e.push(k);
  if (!c.fiche || !c.fiche.fait || !c.fiche.argent || !c.fiche.depend) e.push("fiche");
  if (e.length) { bad++; console.log(c.id, ":", e.join(", ")); }
}
console.log(`${L.length} entreprises, ${bad} en erreur`);
