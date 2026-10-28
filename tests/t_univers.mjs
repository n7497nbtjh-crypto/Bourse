// Contrôle des codes ISIN (clé de contrôle) et des identifiants de la liste des entreprises.
import U from "../data/univers.mjs";
export function isinOk(isin) {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;
  const digits = isin.slice(0, 11).split("").map(ch => /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch).join("");
  let sum = 0, dbl = true;
  for (let i = digits.length - 1; i >= 0; i--) { let d = +digits[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } sum += d; dbl = !dbl; }
  return (10 - (sum % 10)) % 10 === +isin[11];
}
let bad = 0; const ids = new Set();
for (const c of U) {
  if (c.isin && !isinOk(c.isin)) { bad++; console.log("ISIN invalide :", c.name, c.isin); }
  if (!c.isin && !c.sec) { bad++; console.log("ni ISIN ni code SEC :", c.name); }
  if (!c.tv || !c.desc || !c.domain || !c.region) { bad++; console.log("champ manquant :", c.name); }
  if (ids.has(c.id)) { bad++; console.log("identifiant en double :", c.id); } ids.add(c.id);
}
console.log(U.length, "entreprises,", bad ? bad + " écart(s)" : "0 écart"); process.exit(bad ? 1 : 0);
