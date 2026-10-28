// Diagnostic : collecte brute pour élargir la liste des entreprises (lot auto1).
// Sources ouvertes : Wikidata (SPARQL), filings.xbrl.org (rapports ESEF/UKSEF), GLEIF (correspondance ISIN-LEI), SEC (EDGAR).
// Résultats bruts dans data/diag/auto1/ ; le tri et le choix des sociétés se font ensuite hors ligne.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";
const DIR = "data/diag/auto1/"; mkdirSync(DIR, { recursive: true });
const UA = "bilan-univers/1.0 (site pedagogique; " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse") + ")";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = [], L = (...a) => { const s = `[${Math.round((Date.now() - T0) / 1000)}s] ` + a.join(" "); log.push(s); console.log(s); };
const save = (f, o) => writeFileSync(DIR + f, JSON.stringify(o));
const load = (f, d) => existsSync(DIR + f) ? JSON.parse(readFileSync(DIR + f)) : d;
async function get(url, opt = {}, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { ...opt, headers: { "user-agent": UA, ...(opt.headers || {}) }, signal: AbortSignal.timeout(opt.timeout || 120e3) });
      if (r.ok) return r;
      if (r.status === 404) return null;
      L("HTTP", r.status, url.slice(0, 100));
    } catch (e) { L("ERR", e.message, url.slice(0, 100)); }
    await sleep(3000 * i);
  }
  return null;
}

// ---------- Wikidata ----------
const Q = {
  x: `SELECT ?item ?v ?t WHERE { ?item p:P414 ?st . ?st ps:P414 ?v . OPTIONAL { ?st pq:P249 ?t } FILTER NOT EXISTS { ?st pq:P582 ?e } }`,
  isin: `SELECT ?item ?v WHERE { ?item wdt:P946 ?v }`,
  cik: `SELECT ?item ?v WHERE { ?item wdt:P5531 ?v }`,
  lei: `SELECT ?item ?v WHERE { ?item wdt:P1278 ?v . ?item wdt:P946 [] }`,
  lei2: `SELECT ?item ?v WHERE { ?item wdt:P1278 ?v . ?item p:P414 [] }`,
};
const qid = u => String(u).replace("http://www.wikidata.org/entity/", "");
async function sparql(q, tries = 3) {
  const r = await get("https://query.wikidata.org/sparql", { method: "POST", timeout: 90e3, headers: { accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" }, body: "query=" + encodeURIComponent(q) }, tries);
  if (!r) return null;
  try { const j = JSON.parse(await r.text()); return j.results.bindings; } catch (e) { L("sparql json", e.message); return null; }
}
const W = {}; let wdBase = null; const wdBaseP = new Promise(r => wdBase = r);
async function wikidata() {
  for (const [k, q] of Object.entries(Q)) {
    const b = await sparql(q);
    if (!b) { L("wikidata", k, "échec"); continue; }
    const kk = k === "lei2" ? "lei" : k;
    for (const r of b) {
      const it = qid(r.item.value), v = r.v.type === "uri" ? qid(r.v.value) : r.v.value, o = W[it] || (W[it] = {});
      if (k === "x") (o.x || (o.x = [])).push([v, r.t ? r.t.value : ""]);
      else (o[kk] || (o[kk] = [])).includes(v) || o[kk].push(v);
    }
    L("wikidata", k, b.length, "lignes"); await sleep(1000);
  }
  save("wd.json", W); wdBase(W);
  // Détails par paquets de 400 éléments
  const items = Object.keys(W), chunks = []; for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400));
  const DQ = ids => `SELECT ?item (SAMPLE(?sl_) AS ?sl) (SAMPLE(?en_) AS ?en) (SAMPLE(?fr_) AS ?fr) (SAMPLE(?dfr_) AS ?dfr) (SAMPLE(?den_) AS ?den)
    (GROUP_CONCAT(DISTINCT STR(?ind_); separator="|") AS ?ind) (GROUP_CONCAT(DISTINCT STR(?web_); separator="|") AS ?web) (GROUP_CONCAT(DISTINCT STR(?inst_); separator="|") AS ?inst)
    (GROUP_CONCAT(DISTINCT STR(?c_); separator="|") AS ?country) (MAX(?emp_) AS ?emp) (SAMPLE(?dead_) AS ?dead) WHERE {
    VALUES ?item { ${ids.map(v => "wd:" + v).join(" ")} }
    OPTIONAL { ?item wikibase:sitelinks ?sl_ } OPTIONAL { ?item rdfs:label ?en_ FILTER(lang(?en_)="en") } OPTIONAL { ?item rdfs:label ?fr_ FILTER(lang(?fr_)="fr") }
    OPTIONAL { ?item schema:description ?dfr_ FILTER(lang(?dfr_)="fr") } OPTIONAL { ?item schema:description ?den_ FILTER(lang(?den_)="en") }
    OPTIONAL { ?item wdt:P452 ?ind_ } OPTIONAL { ?item wdt:P856 ?web_ } OPTIONAL { ?item wdt:P31 ?inst_ } OPTIONAL { ?item wdt:P17 ?c_ }
    OPTIONAL { ?item wdt:P1128 ?emp_ } OPTIONAL { ?item wdt:P576 ?dead_ } } GROUP BY ?item`;
  let k = 0, ok = 0; const ko = [];
  const sp = s => s ? s.split("|").filter(Boolean).map(qid) : [];
  await Promise.all([0, 1].map(async () => {
    while (k < chunks.length && Date.now() - T0 < 13 * 60e3) {
      const c = chunks[k++]; let b = await sparql(DQ(c), 2);
      if (!b) { b = []; for (const h of [c.slice(0, 200), c.slice(200)]) { const bb = await sparql(DQ(h), 2); if (bb) b.push(...bb); else ko.push(...h); } }
      for (const r of b) {
        const o = W[qid(r.item.value)]; if (!o) continue;
        for (const f of ["sl", "en", "fr", "dfr", "den", "emp", "dead"]) if (r[f] && r[f].value !== "") o[f] = r[f].value;
        for (const f of ["ind", "web", "inst", "country"]) if (r[f] && r[f].value) o[f] = f === "web" ? r[f].value.split("|").filter(Boolean) : sp(r[f].value);
      }
      ok++; if (ok % 10 === 0) { L("wikidata détails", ok, "/", chunks.length); save("wd.json", W); }
      await sleep(400);
    }
  }));
  save("wd.json", W); L("wikidata détails fini", ok, "paquets sur", chunks.length, ", éléments sans détail", ko.length);
  const ids = new Set();
  for (const o of Object.values(W)) { for (const f of ["ind", "inst", "country"]) (o[f] || []).forEach(v => ids.add(v)); (o.x || []).forEach(([v]) => ids.add(v)); }
  const lab = {}, arr = [...ids].filter(v => /^Q\d+$/.test(v));
  for (let i = 0; i < arr.length && Date.now() - T0 < 14.5 * 60e3; i += 400) {
    const b = await sparql(`SELECT ?x ?en ?fr WHERE { VALUES ?x { ${arr.slice(i, i + 400).map(v => "wd:" + v).join(" ")} } OPTIONAL { ?x rdfs:label ?en FILTER(lang(?en)="en") } OPTIONAL { ?x rdfs:label ?fr FILTER(lang(?fr)="fr") } }`);
    for (const r of b || []) lab[qid(r.x.value)] = [r.en ? r.en.value : "", r.fr ? r.fr.value : ""];
    save("wdlab.json", lab); await sleep(400);
  }
  L("wikidata libellés", Object.keys(lab).length, "sur", arr.length);
}

// ---------- filings.xbrl.org (suite des pages, avec pauses : le serveur limite le débit) ----------
async function esef() {
  const E = load("esef.json", {});
  for (let page = 10; page <= 29 && Date.now() - T0 < 13.5 * 60e3; page++) {
    const url = `https://filings.xbrl.org/api/filings?include=entity&page[size]=1000&sort=-date_added&page[number]=${page}`;
    let r = null;
    for (let i = 0; i < 5 && !r; i++) {
      r = await fetch(url, { headers: { "user-agent": UA, accept: "application/vnd.api+json" }, signal: AbortSignal.timeout(120e3) }).catch(() => null);
      if (r && !r.ok) { L("esef", r.status, "page", page); r = null; await sleep(45e3); }
    }
    if (!r) continue;
    const j = await r.json(); if (!(j.data || []).length) break;
    const ent = {}; for (const e of j.included || []) ent[e.id] = e.attributes || {};
    for (const f of j.data || []) {
      const a = f.attributes || {}, rel = f.relationships && f.relationships.entity && f.relationships.entity.data, en = rel ? ent[rel.id] || {} : {};
      const lei = en.identifier || (a.fxo_id || "").split("-")[0]; if (!lei) continue;
      const o = E[lei] || (E[lei] = { n: en.name || "", c: a.country || "", p: [] });
      if (!o.p.some(x => x[0] === a.period_end && x[1] === (a.json_url ? 1 : 0))) o.p.push([a.period_end || "", a.json_url ? 1 : 0, a.error_count ?? null]);
    }
    save("esef.json", E); L("esef page", page, Object.keys(E).length, "entités");
    await sleep(12e3);
  }
  L("esef fini", Object.keys(E).length);
}

// ---------- GLEIF : correspondance ISIN -> LEI (fichier quotidien GLEIF/ANNA) ----------
async function gleif(W) {
  try {
    const r = await get("https://mapping.gleif.org/api/v2/isin-lei/latest", { headers: { accept: "application/json" } });
    const j = r && await r.json(); const txt = JSON.stringify(j || {});
    const link = (txt.match(/https?:[^"]*download[^"]*/) || [])[0];
    L("gleif lien", link || txt.slice(0, 300));
    if (!link) return;
    execSync(`curl -sSL -A "${UA}" -o /tmp/isinlei.zip "${link}"`, { timeout: 6 * 60e3 });
    L("gleif zip", execSync("ls -la /tmp/isinlei.zip").toString().trim());
    const want = new Set(); for (const o of Object.values(W)) (o.isin || []).forEach(v => want.add(v));
    const out = {}; let n = 0, head = [];
    const p = spawn("unzip", ["-p", "/tmp/isinlei.zip"]);
    const rl = createInterface({ input: p.stdout });
    for await (const line of rl) {
      if (n++ < 3) head.push(line);
      const [a, b] = line.split(",").map(x => (x || "").trim().replace(/"/g, ""));
      const lei = /^[A-Z0-9]{20}$/.test(a) ? a : b, isin = lei === a ? b : a;
      if (isin && want.has(isin)) out[isin] = lei;
    }
    save("gleif.json", out); L("gleif fini", n, "lignes,", Object.keys(out).length, "ISIN retrouvés, début :", JSON.stringify(head));
  } catch (e) { L("gleif", e.message); }
}

// ---------- SEC : fiches EDGAR (code SIC, site, formulaires) des plus grosses sociétés cotées à New York ----------
async function sec(WP) {
  const H = { headers: { accept: "application/json" } };
  const S = load("sec_base.json", null);
  const U = (await import("../univers.mjs")).default, have = new Set(U.map(c => c.sec).filter(Boolean)), haveCik = new Set(U.map(c => c.cik && +c.cik).filter(Boolean));
  const f = S.tickers.fields, rows = S.tickers.data.map(r => Object.fromEntries(f.map((k, i) => [k, r[i]])));
  const byCik = {}; for (const r of rows) (byCik[r.cik] || (byCik[r.cik] = [])).push(r);
  for (const r of rows) if (have.has(r.ticker)) haveCik.add(r.cik);
  const Wd = await WP; const wdCik = new Set(); for (const o of Object.values(Wd)) (o.cik || []).forEach(v => wdCik.add(+v));
  const cand = Object.keys(byCik).map(Number).filter(c => !haveCik.has(c) && byCik[c].some(r => ["NYSE", "Nasdaq"].includes(r.exchange)))
    .sort((a, b) => (S.frames[b] || 0) - (S.frames[a] || 0));
  const pick = [...new Set([...cand.slice(0, 2200), ...cand.filter(c => wdCik.has(c)).slice(0, 900)])];
  L("sec candidats", cand.length, "fiches à lire", pick.length);
  const subs = {}; let qi = 0;
  await Promise.all([0, 1].map(async () => {
    while (qi < pick.length && Date.now() - T0 < 14.5 * 60e3) {
      const c = pick[qi++];
      const r = await get(`https://data.sec.gov/submissions/CIK${String(c).padStart(10, "0")}.json`, H, 2); await sleep(260);
      if (!r) continue;
      const j = await r.json(), rec = j.filings && j.filings.recent || {};
      const forms = {}; (rec.form || []).forEach((fm, i) => { if (/^(10-K|20-F|40-F|10-Q|6-K)$/.test(fm) && !forms[fm]) forms[fm] = rec.filingDate[i]; });
      subs[c] = { n: j.name, sic: j.sic, sd: j.sicDescription, w: j.website, t: j.tickers, x: j.exchanges, et: j.entityType, cat: j.category, st: j.stateOfIncorporation, ad: j.addresses && j.addresses.business && j.addresses.business.stateOrCountry, fm: forms, fy: j.fiscalYearEnd };
      if (Object.keys(subs).length % 300 === 0) { L("sec fiches", Object.keys(subs).length); save("sec_subs.json", subs); }
    }
  }));
  save("sec_subs.json", subs); L("sec fini", Object.keys(subs).length, "sur", pick.length);
}

const fin = () => writeFileSync("data/diag/out.json", JSON.stringify({ auto1: log }, null, 1));
setTimeout(() => { L("arrêt forcé"); fin(); process.exit(0); }, 15.3 * 60e3).unref();
await Promise.all([wikidata().catch(e => L("wd", e.message)), esef().catch(e => L("esef", e.message)), wdBaseP.then(w => gleif(w)).catch(e => L("gleif", e.message)), sec(wdBaseP).catch(e => L("sec", e.message))]);
fin();
