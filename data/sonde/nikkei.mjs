// Sonde (5/11) : Nikkei 225 (tableau Wikipédia en anglais : nom, code, secteur) + ISIN, site et description (Wikidata).
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2] || process.env.SORTIE || "out"; mkdirSync(OUT, { recursive: true });
const UA = { "user-agent": "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)" }, pause = ms => new Promise(r => setTimeout(r, ms));
const j = async u => { let st = 0; for (let i = 0; i < 6; i++) { try { const r = await fetch(u, { headers: UA }); st = r.status; if (r.ok) return r.json(); } catch (e) { st = e.message; } await pause(4000 * (i + 1)); } console.log("échec", st, u.slice(0, 100)); return {}; };
const p = await j("https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=Nikkei%20225");
const wt = p.parse.wikitext["*"]; writeFileSync(`${OUT}/nikkei.wikitext`, wt);
// lignes du type « | [[Mazda]] || 7261 || ... » ou modèles {{TYO|7261}}
const rows = []; let sec = "";
for (const l of wt.split("\n")) {
  const h = l.match(/^===?\s*([^=]+?)\s*===?\s*$/); if (h) sec = h[1];
  const lien = l.match(/\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/), code = l.match(/\{\{\s*(?:TYO|TSE|tyo2?)\s*\|\s*(\d{4}[A-Z]?)\s*\}\}/) || l.match(/\|\|\s*(\d{4})\s*(\|\||$)/);
  if (lien && code) rows.push({ titre: lien[1].trim(), nom: l.replace(/^\*\s*/, "").replace(/\(\{\{.*$/, "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").trim(), code: code[1], secteur: sec });
}
console.log(rows.length, "lignes avec un code");
const items = {};
for (let i = 0; i < rows.length; i += 20) {
  const q = await j(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(rows.slice(i, i + 20).map(r => r.titre).join("|"))}`);
  const red = Object.fromEntries((q.query && q.query.redirects || []).map(x => [x.from, x.to])), norm = Object.fromEntries((q.query && q.query.normalized || []).map(x => [x.from, x.to]));
  for (const pg of Object.values(q.query && q.query.pages || {})) if (pg.pageprops) items[pg.title] = pg.pageprops.wikibase_item;
  for (const r of rows.slice(i, i + 20)) { const t1 = norm[r.titre] || r.titre; r.q = items[red[t1] || t1] || null; }
  await pause(1500);
}
const ids = rows.map(r => r.q).filter(Boolean), ent = {};
for (let i = 0; i < ids.length; i += 25) { const w = await j(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels|descriptions&languages=fr|en&ids=${ids.slice(i, i + 25).join("|")}`); Object.assign(ent, w.entities || {}); await pause(2500); }
const val = (e, pr) => ((e.claims || {})[pr] || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
for (const r of rows) { const e = ent[r.q] || {}; r.isin = val(e, "P946"); r.site = val(e, "P856")[0] || null; r.label = (e.labels && (e.labels.fr || e.labels.en) || {}).value || null; r.descr = (e.descriptions && (e.descriptions.fr || e.descriptions.en) || {}).value || null; }
writeFileSync(`${OUT}/nikkei.json`, JSON.stringify(rows, null, 1));
console.log(rows.filter(r => r.isin.length).length, "avec ISIN");
