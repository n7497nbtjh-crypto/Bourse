// Contrôle des codes ISIN (clé de contrôle) et des identifiants de la liste des entreprises.
import U from "../data/univers.mjs";
import { isinOk } from "../data/isin.mjs";
export { isinOk };
let bad = 0; const ids = new Set();
for (const c of U) {
  if (c.isin && !isinOk(c.isin)) { bad++; console.log("ISIN invalide :", c.name, c.isin); }
  if (!c.isin && !c.sec) { bad++; console.log("ni ISIN ni code SEC :", c.name); }
  if (!c.tv || !c.desc || !c.domain || !c.region) { bad++; console.log("champ manquant :", c.name); }
  if (ids.has(c.id)) { bad++; console.log("identifiant en double :", c.id); } ids.add(c.id);
}
console.log(U.length, "entreprises,", bad ? bad + " écart(s)" : "0 écart"); process.exit(bad ? 1 : 0);
