// Faits d'identité des entreprises suivies, lus dans Wikidata (licence CC0) : date de création, siège, effectif,
// dirigeants, marques et produits connus, principales filiales, site officiel, article Wikipédia.
// Correspondance par identifiant officiel uniquement (ISIN P946, LEI P1278, numéro SEC CIK P5531) : jamais par le nom.
// Usage : node data/wikidata.mjs            → écrit cf/site/data/wikidata.json
//         SORTIE=dossier node data/wikidata.mjs → écrit dossier/wikidata.json (sonde)
// Lancé une fois par mois par .github/workflows/wikidata.yml.
import { writeFileSync, mkdirSync } from "node:fs";
import U from "./univers.mjs";

const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const OUT = process.env.SORTIE ? process.env.SORTIE + "/wikidata.json" : "cf/site/data/wikidata.json";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 6, body = null) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, body ? { method: "POST", body, headers: { "user-agent": UA, accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" } } : { headers: { "user-agent": UA, accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) { const ra = +r.headers.get("retry-after") || 0; console.log("attente", r.status, url.slice(0, 80)); await sleep(Math.max(ra * 1000, 6000 * (i + 1))); continue; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) { if (i === tries - 1) throw e; await sleep(3000 * (i + 1)); }
  }
  throw new Error("trop de refus : " + url.slice(0, 120));
}
const sparql = q => get("https://query.wikidata.org/sparql", 4, "format=json&query=" + encodeURIComponent(q)); // POST : les longues listes ne tiennent pas dans une adresse

// 1. Identifiant officiel -> élément Wikidata
const cikOf = c => c.cik ? String(c.cik).replace(/\D/g, "").padStart(10, "0") : null;
const keys = [];
for (const c of U) {
  if (c.isin) keys.push(["P946", c.isin, c.id]);
  if (c.lei) keys.push(["P1278", c.lei, c.id]);
  const k = cikOf(c); if (k) { keys.push(["P5531", k, c.id]); keys.push(["P5531", String(+k), c.id]); }
}
const Q = {}; // id -> { qid: votes }
for (const prop of ["P946", "P1278", "P5531"]) {
  const l = keys.filter(k => k[0] === prop);
  for (let i = 0; i < l.length; i += 250) {
    const part = l.slice(i, i + 250), vals = part.map(k => JSON.stringify(k[1])).join(" ");
    const j = await sparql(`SELECT ?v ?item WHERE { VALUES ?v { ${vals} } ?item wdt:${prop} ?v . }`);
    for (const b of j.results.bindings) {
      const qid = b.item.value.split("/").pop();
      for (const k of part.filter(k => k[1] === b.v.value)) { const o = Q[k[2]] = Q[k[2]] || {}; o[qid] = (o[qid] || 0) + 1; }
    }
    await sleep(1200);
  }
  console.log(prop, "→", Object.keys(Q).length, "entreprises trouvées");
}
// Sociétés américaines sans ISIN ni CIK dans la liste : code de cotation au NYSE ou au Nasdaq (P414 avec qualificatif P249)
{ const l = U.filter(c => !Q[c.id] && c.region === "US" && (c.sec || c.ticker)).map(c => [String(c.sec || c.ticker).toUpperCase(), c.id]);
  for (let i = 0; i < l.length; i += 150) {
    const part = l.slice(i, i + 150), vals = part.map(k => JSON.stringify(k[0])).join(" ");
    const j = await sparql(`SELECT ?t ?item WHERE { VALUES ?t { ${vals} } VALUES ?bourse { wd:Q13677 wd:Q82059 } ?item p:P414 ?st . ?st ps:P414 ?bourse ; pq:P249 ?t . FILTER NOT EXISTS { ?st pq:P582 [] } }`);
    for (const b of j.results.bindings) { const qid = b.item.value.split("/").pop(); for (const k of part.filter(k => k[0] === b.t.value)) { const o = Q[k[1]] = Q[k[1]] || {}; o[qid] = (o[qid] || 0) + 1; } }
    await sleep(1200);
  }
  console.log("codes NYSE/Nasdaq →", Object.keys(Q).length); }
const QID = {};
for (const [id, votes] of Object.entries(Q)) {
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (best.length > 1 && best[0][1] === best[1][1]) continue; // deux éléments à égalité : ambigu, on s'abstient
  QID[id] = best[0][0];
}
console.log(Object.keys(QID).length, "entreprises reliées à Wikidata sur", U.length);

// 2. Les déclarations utiles de chaque élément
const ents = {};
const ids = [...new Set(Object.values(QID))];
for (let i = 0; i < ids.length; i += 25) {
  const j = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&maxlag=5&props=claims|sitelinks&sitefilter=frwiki|enwiki&ids=${ids.slice(i, i + 25).join("|")}`);
  if (j.error) { console.log("erreur API", j.error.code); await sleep(8000); i -= 25; continue; }
  Object.assign(ents, j.entities || {});
  await sleep(900);
}
const best = (cl, p) => { // déclarations au meilleur rang, sans les valeurs terminées (date de fin)
  const l = (cl[p] || []).filter(s => s.rank !== "deprecated" && s.mainsnak.snaktype === "value");
  const cur = l.filter(s => !(s.qualifiers && s.qualifiers.P582));
  const pref = cur.filter(s => s.rank === "preferred");
  return pref.length ? pref : cur;
};
const qv = s => s.mainsnak.datavalue.value.id;
const year = t => { const m = String(t || "").match(/^([+-]\d+)-(\d\d)/); return m ? +m[1] : null; };
const raw = {}, need = new Set();
for (const [id, q] of Object.entries(QID)) {
  const e = ents[q]; if (!e || !e.claims) continue;
  const cl = e.claims, o = { q };
  const inc = best(cl, "P571")[0]; if (inc) { const y = year(inc.mainsnak.datavalue.value.time); if (y && y > 1500 && y <= new Date().getFullYear()) o.fonde = y; }
  const hq = best(cl, "P159")[0]; if (hq) { o.siege = qv(hq); need.add(o.siege); }
  const ctry = best(cl, "P17")[0]; if (ctry) { o.pays = qv(ctry); need.add(o.pays); }
  const emp = (cl.P1128 || []).filter(s => s.rank !== "deprecated" && s.mainsnak.snaktype === "value").map(s => [Math.round(+s.mainsnak.datavalue.value.amount), s.qualifiers && s.qualifiers.P585 ? s.qualifiers.P585[0].datavalue?.value?.time : null, s.rank])
    .filter(x => x[0] > 0).sort((a, b) => String(b[1] || "").localeCompare(String(a[1] || "")) || (b[2] === "preferred") - (a[2] === "preferred"));
  if (emp.length) o.effectif = [emp[0][0], year(emp[0][1])];
  for (const [p, k, n] of [["P169", "pdg", 2], ["P488", "president", 2], ["P112", "fondateurs", 4], ["P1716", "marques", 12], ["P1056", "produits", 12], ["P355", "filiales", 10]]) {
    const l = best(cl, p).map(qv).filter(Boolean).slice(0, n); if (l.length) { o[k] = l; l.forEach(x => need.add(x)); }
    if (p === "P355") o.nfiliales = best(cl, p).length;
  }
  const site = best(cl, "P856")[0]; if (site) o.site = site.mainsnak.datavalue.value;
  const sl = e.sitelinks || {}; if (sl.frwiki) o.wiki = "fr:" + sl.frwiki.title; else if (sl.enwiki) o.wiki = "en:" + sl.enwiki.title;
  raw[id] = o;
}
// 3. Les libellés, en français de préférence
const lab = {}, nl = [...need];
for (let i = 0; i < nl.length; i += 50) {
  const j = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&maxlag=5&props=labels&languages=fr|en&ids=${nl.slice(i, i + 50).join("|")}`);
  if (j.error) { console.log("erreur API", j.error.code); await sleep(8000); i -= 50; continue; }
  for (const [k, v] of Object.entries(j.entities || {})) { const L = v.labels || {}; const t = (L.fr || L.en || {}).value; if (t && !/^Q\d+$/.test(t)) lab[k] = t; }
  await sleep(400);
}
const L = q => lab[q] || null, LL = a => a ? [...new Set(a.map(L).filter(Boolean))] : undefined;
const items = {};
for (const [id, o] of Object.entries(raw)) {
  const name = (U.find(c => c.id === id) || {}).name || "";
  const sg = L(o.siege), x = { q: o.q, fonde: o.fonde, siege: sg && !/^(siège|si[eè]ge social|headquarters|tour |building)/i.test(sg) ? sg : undefined, pays: L(o.pays), effectif: o.effectif, pdg: LL(o.pdg), president: LL(o.president), fondateurs: LL(o.fondateurs),
    marques: LL(o.marques)?.filter(m => m.toLowerCase() !== name.toLowerCase()), produits: LL(o.produits), filiales: LL(o.filiales), nfiliales: o.nfiliales || undefined, site: o.site, wiki: o.wiki };
  for (const k of Object.keys(x)) if (x[k] == null || (Array.isArray(x[k]) && !x[k].length)) delete x[k];
  items[id] = x;
}
mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "Wikidata (CC0), https://www.wikidata.org", items }));
console.log(Object.keys(items).length, "fiches écrites dans", OUT);
