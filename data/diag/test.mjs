// Diagnostic : collecte brute pour élargir la liste des entreprises (lot auto1).
// Sources ouvertes : Wikidata (SPARQL), filings.xbrl.org (rapports ESEF/UKSEF), GLEIF (correspondance ISIN-LEI), SEC (EDGAR).
// Résultats bruts dans data/diag/auto1/ ; le tri et le choix des sociétés se font ensuite hors ligne.
import { writeFileSync, mkdirSync, createWriteStream, readFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";
const DIR = "data/diag/auto1/"; mkdirSync(DIR, { recursive: true });
const UA = "bilan-univers/1.0 (site pedagogique; " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse") + ")";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = [], L = (...a) => { const s = `[${Math.round((Date.now() - T0) / 1000)}s] ` + a.join(" "); log.push(s); console.log(s); };
const save = (f, o) => writeFileSync(DIR + f, JSON.stringify(o));
async function get(url, opt = {}, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { ...opt, headers: { "user-agent": UA, ...(opt.headers || {}) }, signal: AbortSignal.timeout(opt.timeout || 120e3) });
      if (r.ok) return r;
      if (r.status === 404) return null;
      L("HTTP", r.status, url.slice(0, 120));
    } catch (e) { L("ERR", e.message, url.slice(0, 120)); }
    await sleep(3000 * i);
  }
  return null;
}

// ---------- Wikidata ----------
const SET = `{ SELECT DISTINCT ?item WHERE { { ?item p:P414 [] } UNION { ?item wdt:P946 [] } UNION { ?item wdt:P5531 [] } } }`;
const Q = {
  x: `SELECT ?item ?v ?t WHERE { ?item p:P414 ?st . ?st ps:P414 ?v . OPTIONAL { ?st pq:P249 ?t } FILTER NOT EXISTS { ?st pq:P582 ?e } }`,
  isin: `SELECT ?item ?v WHERE { ?item wdt:P946 ?v }`,
  lei: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P1278 ?v }`,
  cik: `SELECT ?item ?v WHERE { ?item wdt:P5531 ?v }`,
  ind: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P452 ?v }`,
  web: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P856 ?v }`,
  inst: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P31 ?v }`,
  country: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P17 ?v }`,
  emp: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P1128 ?v }`,
  dead: `SELECT ?item ?v WHERE { ${SET} ?item wdt:P576 ?v }`,
  sl: `SELECT ?item ?v WHERE { ${SET} ?item wikibase:sitelinks ?v }`,
  en: `SELECT ?item ?v WHERE { ${SET} ?item rdfs:label ?v FILTER(lang(?v)="en") }`,
  fr: `SELECT ?item ?v WHERE { ${SET} ?item rdfs:label ?v FILTER(lang(?v)="fr") }`,
  dfr: `SELECT ?item ?v WHERE { ${SET} ?item schema:description ?v FILTER(lang(?v)="fr") }`,
  den: `SELECT ?item ?v WHERE { ${SET} ?item schema:description ?v FILTER(lang(?v)="en") }`,
};
const qid = u => String(u).replace("http://www.wikidata.org/entity/", "");
async function sparql(q) {
  const r = await get("https://query.wikidata.org/sparql", { method: "POST", timeout: 180e3, headers: { accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" }, body: "query=" + encodeURIComponent(q) }, 3);
  if (!r) return null;
  const j = await r.json(); return j.results.bindings;
}
async function wikidata() {
  const W = {}, err = {};
  for (const [k, q] of Object.entries(Q)) {
    try {
      const b = await sparql(q);
      if (!b) { err[k] = "échec"; L("wikidata", k, "échec"); continue; }
      for (const r of b) {
        const it = qid(r.item.value), v = r.v.type === "uri" ? qid(r.v.value) : r.v.value;
        const o = W[it] || (W[it] = {});
        if (k === "x") (o.x || (o.x = [])).push([v, r.t ? r.t.value : ""]);
        else if (["sl", "en", "fr", "dfr", "den", "emp", "dead"].includes(k)) o[k] = o[k] === undefined || k !== "emp" ? v : Math.max(+o[k], +v);
        else (o[k] || (o[k] = [])).includes(v) || o[k].push(v);
      }
      L("wikidata", k, b.length, "lignes");
    } catch (e) { err[k] = e.message; L("wikidata", k, e.message); }
    await sleep(1500);
  }
  // Libellés des bourses, secteurs, types et pays rencontrés
  const ids = new Set();
  for (const o of Object.values(W)) { for (const k of ["ind", "inst", "country"]) (o[k] || []).forEach(v => ids.add(v)); (o.x || []).forEach(([v]) => ids.add(v)); }
  const lab = {}, arr = [...ids].filter(v => /^Q\d+$/.test(v));
  for (let i = 0; i < arr.length; i += 400) {
    const b = await sparql(`SELECT ?x ?en ?fr WHERE { VALUES ?x { ${arr.slice(i, i + 400).map(v => "wd:" + v).join(" ")} } OPTIONAL { ?x rdfs:label ?en FILTER(lang(?en)="en") } OPTIONAL { ?x rdfs:label ?fr FILTER(lang(?fr)="fr") } }`);
    for (const r of b || []) lab[qid(r.x.value)] = [r.en ? r.en.value : "", r.fr ? r.fr.value : ""];
    await sleep(800);
  }
  save("wd.json", W); save("wdlab.json", lab);
  L("wikidata fini", Object.keys(W).length, "éléments,", Object.keys(lab).length, "libellés", JSON.stringify(err));
  return W;
}

// ---------- filings.xbrl.org ----------
async function esef() {
  const E = {}; let url = "https://filings.xbrl.org/api/filings?include=entity&page[size]=1000&sort=-date_added", pages = 0, total = null, first = null;
  while (url && pages < 80 && Date.now() - T0 < 11 * 60e3) {
    const r = await get(url, { headers: { accept: "application/vnd.api+json" }, timeout: 120e3 });
    if (!r) break;
    const j = await r.json(); pages++;
    if (!first) first = { meta: j.meta, links: j.links, sample: (j.data || [])[0], inc: (j.included || [])[0] };
    total = j.meta && (j.meta.count ?? j.meta.total);
    const ent = {}; for (const e of j.included || []) ent[e.id] = e.attributes || {};
    for (const f of j.data || []) {
      const a = f.attributes || {}, rel = f.relationships && f.relationships.entity && f.relationships.entity.data, en = rel ? ent[rel.id] || {} : {};
      const lei = en.identifier || (a.fxo_id || "").split("-")[0]; if (!lei) continue;
      const o = E[lei] || (E[lei] = { n: en.name || "", c: a.country || "", p: [] });
      o.p.push([a.period_end || "", a.json_url ? 1 : 0, a.error_count ?? null]);
    }
    url = j.links && j.links.next; if (url && !url.startsWith("http")) url = "https://filings.xbrl.org" + url;
    if (pages % 5 === 0) L("esef page", pages, Object.keys(E).length, "entités");
  }
  save("esef.json", E); save("esef_meta.json", { pages, total, first });
  L("esef fini", pages, "pages,", Object.keys(E).length, "entités, total annoncé", total);
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
    const out = {}; let n = 0;
    const p = spawn("unzip", ["-p", "/tmp/isinlei.zip"]);
    const rl = createInterface({ input: p.stdout });
    for await (const line of rl) { n++; const [a, b] = line.split(","); const lei = /^[A-Z0-9]{20}$/.test(a) ? a : b, isin = lei === a ? b : a; if (isin && want.has(isin.trim())) out[isin.trim()] = lei.trim(); }
    save("gleif.json", out); L("gleif fini", n, "lignes,", Object.keys(out).length, "ISIN retrouvés");
  } catch (e) { L("gleif", e.message); }
}

// ---------- SEC ----------
async function sec(WP) {
  const H = { headers: { accept: "application/json" } };
  const S = {};
  const tx = await get("https://www.sec.gov/files/company_tickers_exchange.json", H); S.tickers = tx ? await tx.json() : null;
  L("sec tickers", S.tickers ? S.tickers.data.length : "échec");
  S.frames = {};
  for (const c of ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "RevenuesNetOfInterestExpense", "InterestAndDividendIncomeOperating"]) for (const y of ["CY2024", "CY2025"]) {
    await sleep(200);
    const r = await get(`https://data.sec.gov/api/xbrl/frames/us-gaap/${c}/USD/${y}.json`, H); if (!r) continue;
    const j = await r.json(); for (const d of j.data || []) { const k = String(d.cik); S.frames[k] = Math.max(S.frames[k] || 0, d.val || 0); }
    L("sec frame", c, y, (j.data || []).length);
  }
  save("sec_base.json", S);
  // Fiches EDGAR (code SIC, site, formulaires) des plus grosses sociétés cotées à New York
  const U = (await import("../univers.mjs")).default, have = new Set(U.map(c => c.sec).filter(Boolean)), haveCik = new Set(U.map(c => c.cik && +c.cik).filter(Boolean));
  const f = S.tickers.fields, rows = S.tickers.data.map(r => Object.fromEntries(f.map((k, i) => [k, r[i]])));
  const byCik = {}; for (const r of rows) (byCik[r.cik] || (byCik[r.cik] = [])).push(r);
  for (const r of rows) if (have.has(r.ticker)) haveCik.add(r.cik);
  const W = await WP; const wdCik = new Set(); for (const o of Object.values(W)) (o.cik || []).forEach(v => wdCik.add(+v));
  const cand = Object.keys(byCik).map(Number).filter(c => !haveCik.has(c) && byCik[c].some(r => ["NYSE", "Nasdaq"].includes(r.exchange)))
    .sort((a, b) => (S.frames[b] || 0) - (S.frames[a] || 0));
  const pick = [...new Set([...cand.slice(0, 2200), ...cand.filter(c => wdCik.has(c)).slice(0, 800)])];
  L("sec candidats", cand.length, "fiches à lire", pick.length);
  const subs = {};
  for (const c of pick) {
    if (Date.now() - T0 > 13 * 60e3) { L("sec arrêt temps"); break; }
    const r = await get(`https://data.sec.gov/submissions/CIK${String(c).padStart(10, "0")}.json`, H, 2); await sleep(140);
    if (!r) continue;
    const j = await r.json(), rec = j.filings && j.filings.recent || {};
    const forms = {}; (rec.form || []).forEach((fm, i) => { if (/^(10-K|20-F|40-F|10-Q|6-K)$/.test(fm) && !forms[fm]) forms[fm] = rec.filingDate[i]; });
    subs[c] = { n: j.name, sic: j.sic, sd: j.sicDescription, w: j.website, t: j.tickers, x: j.exchanges, et: j.entityType, cat: j.category, st: j.stateOfIncorporation, ad: j.addresses && j.addresses.business && j.addresses.business.stateOrCountry, fm: forms, fy: j.fiscalYearEnd };
    if (Object.keys(subs).length % 300 === 0) L("sec fiches", Object.keys(subs).length);
  }
  save("sec_subs.json", subs); L("sec fini", Object.keys(subs).length);
}

const fin = () => writeFileSync("data/diag/out.json", JSON.stringify({ auto1: log }, null, 1));
setTimeout(() => { L("arrêt forcé"); fin(); process.exit(0); }, 15.5 * 60e3).unref();
const WP = wikidata().catch(e => (L("wd", e.message), {}));
await Promise.all([esef().catch(e => L("esef", e.message)), WP.then(W => gleif(W)).catch(e => L("gleif", e.message)), sec(WP).catch(e => L("sec", e.message))]);
fin();
