// Sonde (5/11) : composition du SBF 120, du DAX et du Nikkei 225 (Wikipédia), ISIN et site (Wikidata). Écrit indices.json.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2] || process.env.SORTIE || "out"; mkdirSync(OUT, { recursive: true });
const UA = { "user-agent": "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)" }, pause = ms => new Promise(r => setTimeout(r, ms));
const j = async u => { let st = 0; for (let i = 0; i < 6; i++) { try { const r = await fetch(u, { headers: UA }); st = r.status; if (r.ok) return r.json(); } catch (e) { st = e.message; } await pause(3000 * (i + 1)); } console.log("échec", st, u.slice(0, 120)); return {}; };
const PAGES = [["fr", "SBF 120", "SBF120"], ["en", "SBF 120", "SBF120"], ["en", "DAX", "DAX"], ["en", "Nikkei 225", "N225"]];
const res = {};
for (const [lg, page, ix] of PAGES) {
  const p = await j(`https://${lg}.wikipedia.org/w/api.php?action=parse&format=json&prop=links|wikitext&page=${encodeURIComponent(page)}`);
  if (!p.parse) continue; const wt = p.parse.wikitext["*"];
  // liens présents dans les lignes de tableau ou de liste
  const liens = [...new Set([...wt.matchAll(/^[|*!].*$/gm)].flatMap(m => [...m[0].matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)].map(x => x[1].trim())))];
  const titres = liens.filter(t => !/^(Fichier|File|Catégorie|Category|Image|Liste|List of)/i.test(t));
  const items = [];
  for (let i = 0; i < titres.length; i += 20) {
    const q = await j(`https://${lg}.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(titres.slice(i, i + 20).join("|"))}`);
    for (const pg of Object.values(q.query.pages || {})) if (pg.pageprops && pg.pageprops.wikibase_item) items.push({ titre: pg.title, q: pg.pageprops.wikibase_item });
    await pause(1200);
  }
  const ent = {};
  for (let i = 0; i < items.length; i += 50) {
    const w = await j(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&languages=fr|en&ids=${items.slice(i, i + 50).map(x => x.q).join("|")}`);
    Object.assign(ent, w.entities || {}); await pause(1200);
  }
  const val = (e, p) => ((e.claims || {})[p] || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
  res[ix + ":" + lg] = items.map(x => { const e = ent[x.q] || {}; return { titre: x.titre, q: x.q, nom: (e.labels && (e.labels.fr || e.labels.en) || {}).value, isin: val(e, "P946"), site: val(e, "P856")[0] || null, instance: val(e, "P31").map(v => v.id) }; })
    .filter(x => x.isin.length);
  console.log(ix, lg, titres.length, "liens,", res[ix + ":" + lg].length, "avec ISIN");
}
writeFileSync(`${OUT}/indices.json`, JSON.stringify(res, null, 1));
