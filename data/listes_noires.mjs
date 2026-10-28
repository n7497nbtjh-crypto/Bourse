// Listes noires de l'AMF (sites et sociétés non autorisés à proposer des placements en France), jeu de données ouvert
// publié chaque jour sur data.gouv.fr. Le bot en garde une copie légère pour la page « Vérifier un site ou une offre ».
import { writeFileSync } from "node:fs";
const DS = "https://www.data.gouv.fr/api/1/datasets/listes-noires-des-entites-non-autorisees-a-proposer-des-produits-ou-services-financiers-en-france/";
const OUT = new URL("../cf/site/data/listes-noires.json", import.meta.url);
function parseCsv(txt) {
  const first = txt.split(/\r?\n/, 1)[0], sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
  const rows = [], re = new RegExp(`("([^"]|"")*"|[^${sep}\\n\\r]*)(${sep}|\\r?\\n|$)`, "g"); let row = [], m;
  while ((m = re.exec(txt)) && m[0] !== "") { let v = m[1]; if (v.startsWith('"')) v = v.slice(1, -1).replace(/""/g, '"'); row.push(v.trim()); if (m[3] !== sep) { rows.push(row); row = []; } }
  return rows;
}
export async function main() {
  const ds = await (await fetch(DS)).json();
  const res = (ds.resources || []).filter(r => /csv/i.test(r.format || r.mime || r.url)).sort((a, b) => String(b.last_modified).localeCompare(String(a.last_modified)))[0];
  if (!res) throw new Error("aucune ressource CSV");
  const rows = parseCsv(await (await fetch(res.url)).text()), head = rows.shift().map(h => h.toLowerCase());
  const col = re => head.findIndex(h => re.test(h));
  const iNom = col(/nom|entit|soci|denomination/), iSite = col(/site|url|internet|web|contact/), iCat = col(/cat|liste|produit|type/), iDate = col(/date/);
  const items = rows.filter(r => r.length > 1).map(r => ({ n: r[iNom] || "", s: iSite >= 0 ? r[iSite] || "" : "", c: iCat >= 0 ? r[iCat] || "" : "", d: iDate >= 0 ? r[iDate] || "" : "", t: r.join(" ").slice(0, 400) }));
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: res.url, colonnes: head, items }));
  console.log(items.length, "entrées sur les listes noires de l'AMF");
  return { n: items.length, head, sample: items.slice(0, 3) };
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log("::warning::Listes noires non lues :", e.message); });
