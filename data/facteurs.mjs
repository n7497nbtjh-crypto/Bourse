// Faits de contexte sur les entreprises suivies, tirés de Wikidata (licence CC0) :
// pays, siège, année de création, effectif, places de cotation, actionnaires déclarés, entreprise d'État.
// Sortie : cf/site/data/facteurs.json (lu par cf/site/m/analyse.js). Rien n'est déduit ni inventé :
// une donnée absente de Wikidata reste absente, et la fiche dit qu'elle manque.
// Usage : node data/facteurs.mjs [fichier de sortie]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = process.argv[2] || path.join(ROOT, "cf/site/data/facteurs.json");
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse; " + (process.env.CONTACT || "") + ")";
const EP = "https://query.wikidata.org/sparql";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sparql(q, essai = 0) {
  try {
    const r = await fetch(EP, { method: "POST", headers: { "User-Agent": UA, Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" }, body: "query=" + encodeURIComponent(q) });
    if (r.status === 429 || r.status >= 500) { const w = +(r.headers.get("retry-after") || 0) * 1000 || 5000 * (essai + 1); if (essai < 4) { await sleep(w); return sparql(q, essai + 1); } }
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
    return (await r.json()).results.bindings;
  } catch (e) { if (essai < 3) { await sleep(4000 * (essai + 1)); return sparql(q, essai + 1); } console.error("échec", String(e).slice(0, 300)); return []; }
}
const v = (b, k) => b[k] ? b[k].value : null;
const qid = u => u ? u.replace("http://www.wikidata.org/entity/", "") : null;
const lit = s => '"' + String(s).replace(/["\\]/g, "") + '"';

const U = JSON.parse(fs.readFileSync(path.join(ROOT, "cf/site/data/univers.json"), "utf8")).companies;
const CIK = {};
for (const c of U) { try { const j = JSON.parse(fs.readFileSync(path.join(ROOT, "cf/site/data/societes", c.id + ".json"), "utf8")); if (j.cik) CIK[c.id] = String(j.cik).padStart(10, "0"); } catch (e) { } }

// 1. Trouver l'élément Wikidata : par ISIN (P946), sinon par numéro SEC (P5531)
const byIsin = {}, byCik = {};
U.forEach(c => { if (c.isin) (byIsin[c.isin] = byIsin[c.isin] || []).push(c.id); else if (CIK[c.id]) byCik[CIK[c.id]] = c.id; });
const ITEM = {}; // id → Qxxx
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
for (const part of chunks(Object.keys(byIsin), 150)) {
  const b = await sparql(`SELECT ?k ?item WHERE { VALUES ?k { ${part.map(lit).join(" ")} } ?item wdt:P946 ?k . }`);
  b.forEach(x => (byIsin[v(x, "k")] || []).forEach(id => { if (!ITEM[id]) ITEM[id] = qid(v(x, "item")); }));
  await sleep(1200);
}
const cikVals = Object.keys(byCik);
for (const part of chunks(cikVals, 150)) {
  const vals = part.flatMap(k => [lit(k), lit(String(+k))]);
  const b = await sparql(`SELECT ?k ?item WHERE { VALUES ?k { ${vals.join(" ")} } ?item wdt:P5531 ?k . }`);
  b.forEach(x => { const k = String(v(x, "k")).padStart(10, "0"), id = byCik[k]; if (id && !ITEM[id]) ITEM[id] = qid(v(x, "item")); });
  await sleep(1200);
}
console.log("éléments trouvés", Object.keys(ITEM).length, "sur", U.length);

// 2. Faits par élément
const items = [...new Set(Object.values(ITEM))], F = {};
const add = (q, k, val) => { const o = F[q] = F[q] || {}; if (val == null) return; if (Array.isArray(o[k])) { if (!o[k].includes(val)) o[k].push(val); } else o[k] = val; };
for (const part of chunks(items, 120)) {
  const VAL = `VALUES ?item { ${part.map(q => "wd:" + q).join(" ")} }`;
  // pays, siège, création
  let b = await sparql(`SELECT ?item ?cc ?hqLabel ?hqcc ?hk ?inc WHERE { ${VAL}
    OPTIONAL { ?item wdt:P17 ?co . ?co wdt:P297 ?cc . }
    OPTIONAL { ?item wdt:P159 ?hq . OPTIONAL { ?hq wdt:P17 ?hqc . ?hqc wdt:P297 ?hqcc . } OPTIONAL { ?hq wdt:P131* wd:Q8646 . BIND(true AS ?hk) } }
    OPTIONAL { ?item wdt:P571 ?inc . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`);
  b.forEach(x => { const q = qid(v(x, "item")); F[q] = F[q] || {}; if (v(x, "cc")) add(q, "pays", v(x, "cc")); if (v(x, "hqLabel") && !/^Q\d+$/.test(v(x, "hqLabel"))) add(q, "siege", v(x, "hqLabel")); if (v(x, "hqcc")) add(q, "paysSiege", v(x, "hqcc")); if (v(x, "hk")) add(q, "siegeHK", true);
    const y = (v(x, "inc") || "").match(/^-?(\d{3,4})/); if (y && (!F[q].creation || +y[1] < F[q].creation)) F[q].creation = +y[1]; });
  await sleep(1200);
  // effectif (valeur de meilleur rang, avec sa date)
  b = await sparql(`SELECT ?item ?n ?d WHERE { ${VAL} ?item p:P1128 ?st . ?st ps:P1128 ?n . ?st wikibase:rank ?r . FILTER(?r != wikibase:DeprecatedRank) OPTIONAL { ?st pq:P585 ?d . } }`);
  b.forEach(x => { const q = qid(v(x, "item")), d = (v(x, "d") || "").slice(0, 4), n = Math.round(+v(x, "n")); if (!(n > 0)) return; const o = F[q] = F[q] || {}; if (!o.effectif || (d && (!o.effectifAn || d > o.effectifAn))) { o.effectif = n; o.effectifAn = d || null; } });
  await sleep(1200);
  // places de cotation en cours
  b = await sparql(`SELECT ?item ?ex ?exLabel WHERE { ${VAL} ?item p:P414 ?st . ?st ps:P414 ?ex . FILTER NOT EXISTS { ?st pq:P582 ?fin } ?st wikibase:rank ?r . FILTER(?r != wikibase:DeprecatedRank)
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`);
  b.forEach(x => { const q = qid(v(x, "item")), o = F[q] = F[q] || {}; o.bourses = o.bourses || []; const l = v(x, "exLabel"); if (l && !/^Q\d+$/.test(l) && !o.bourses.includes(l)) o.bourses.push(l); });
  await sleep(1200);
  // actionnaires déclarés (« détenu par », P127), en cours, avec la part si elle est donnée
  b = await sparql(`SELECT ?item ?o ?oLabel ?part ?t ?d WHERE { ${VAL} ?item p:P127 ?st . ?st ps:P127 ?o . FILTER NOT EXISTS { ?st pq:P582 ?fin } ?st wikibase:rank ?r . FILTER(?r != wikibase:DeprecatedRank)
    OPTIONAL { ?st pq:P1107 ?part . } OPTIONAL { ?st pq:P585 ?d . }
    OPTIONAL { ?o wdt:P31 ?t0 . VALUES (?t0 ?t) { (wd:Q5 "personne") (wd:Q8436 "famille") (wd:Q13417114 "famille") (wd:Q6256 "etat") (wd:Q3624078 "etat") (wd:Q7188 "etat") (wd:Q327333 "etat") (wd:Q192350 "etat") (wd:Q270791 "etat") (wd:Q2659904 "etat") (wd:Q4830453 "entreprise") (wd:Q891723 "entreprise") (wd:Q6881511 "entreprise") (wd:Q157031 "fondation") } }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`);
  b.forEach(x => { const q = qid(v(x, "item")), o = F[q] = F[q] || {}; o.actionnaires = o.actionnaires || []; const wd = qid(v(x, "o")), nom = v(x, "oLabel"); if (!nom || /^Q\d+$/.test(nom)) return;
    let a = o.actionnaires.find(z => z.wd === wd); if (!a) { a = { nom, wd }; o.actionnaires.push(a); }
    const p = v(x, "part"); if (p != null && isFinite(+p)) { const pp = +p > 1 ? +p / 100 : +p; if (pp > 0 && pp <= 1) a.part = Math.round(pp * 1000) / 1000; }
    const t = v(x, "t"); if (t && (!a.type || t === "etat")) a.type = t; const d = (v(x, "d") || "").slice(0, 4); if (d) a.an = d; });
  await sleep(1200);
  // forme : entreprise d'État (P31 ou P1454 = entreprise publique / d'État)
  b = await sparql(`SELECT ?item WHERE { ${VAL} { ?item wdt:P31 ?x } UNION { ?item wdt:P1454 ?x } VALUES ?x { wd:Q270791 } }`);
  b.forEach(x => { const q = qid(v(x, "item")); (F[q] = F[q] || {}).etat = true; });
  await sleep(1200);
  console.log("lot", part.length, "faits", Object.keys(F).length);
}

// 3. Sortie par identifiant du site (champs vides retirés)
const out = {};
for (const [id, q] of Object.entries(ITEM)) {
  const f = F[q] || {}, o = { wd: q };
  if (f.pays) o.pays = [].concat(f.pays)[0];
  if (f.paysSiege) o.paysSiege = [].concat(f.paysSiege)[0];
  if (f.siegeHK) o.siegeHK = true;
  if (f.siege) o.siege = [].concat(f.siege)[0];
  if (f.creation) o.creation = f.creation;
  if (f.effectif) { o.effectif = f.effectif; if (f.effectifAn) o.effectifAn = +f.effectifAn; }
  if (f.bourses && f.bourses.length) o.bourses = f.bourses.slice(0, 8);
  if (f.actionnaires && f.actionnaires.length) o.actionnaires = f.actionnaires.sort((a, b) => (b.part || 0) - (a.part || 0)).slice(0, 6);
  if (f.etat) o.etat = true;
  out[id] = o;
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "Wikidata (licence CC0), https://www.wikidata.org", n: Object.keys(out).length, societes: out }));
console.log("écrit", OUT, Object.keys(out).length);
