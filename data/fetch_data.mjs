// Collecte des comptes annuels des entreprises suivies, à partir de sources gratuites et ouvertes :
//  1. GLEIF (api.gleif.org) : retrouve l'identifiant LEI de la société à partir de son code ISIN. Données en libre accès.
//  2. filings.xbrl.org (XBRL International) : liste les rapports annuels ESEF déposés par la société
//     et fournit chaque rapport au format xBRL-JSON. Accès gratuit.
//  3. data/esef.mjs : extrait les chiffres clés de chaque rapport.
// Résultat : cf/site/data/societes.json (liste) et cf/site/data/societes/<id>.json (une fiche par société).
//
// Lancé chaque semaine par GitHub Actions (.github/workflows/donnees.yml), ou à la main :
//   node data/fetch_data.mjs            toutes les sociétés
//   node data/fetch_data.mjs lvmh       une seule société
//   node data/fetch_data.mjs --actu     seulement les dépôts récents à la SEC (actualité, agenda estimé)
// Les comptes d'une société déjà collectés depuis moins de FRESH_DAYS jours (7 par défaut) ne sont pas relus.
// Variable facultative CONTACT : adresse ou lien de contact ajouté à l'en-tête User-Agent,
// comme le demande filings.xbrl.org pour un usage régulier.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import U, { SECTEURS } from "./univers.mjs";
import { extract, merge, toSeries, extractSegments, bestSegments } from "./esef.mjs";
import { extractSec, cikMap, factsUrl, subsUrl, recentFilings, estimatedAgenda } from "./sec.mjs";
import { amfAnnualFilings, amfDoc } from "./amf.mjs";

const OUT = new URL("../cf/site/data/", import.meta.url);
export const UA = "Repere/0.3 site-pedagogique " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse");
const sleep = ms => process.env.NO_SLEEP ? Promise.resolve() : new Promise(r => setTimeout(r, ms));

export async function getJSON(fetchFn, url, accept = "application/json") {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let r;
    try { r = await fetchFn(url, { headers: { "user-agent": UA, accept } }); }
    catch (e) { if (attempt < 4) { await sleep(2000 * attempt); continue; } throw e; }
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (attempt < 4) await sleep((r.status === 429 ? 5000 : 2000) * attempt);
    else throw new Error(`${r.status} sur ${url}`);
  }
}

// ISIN -> LEI (GLEIF)
export async function leiFromIsin(fetchFn, isin, name) {
  let j = await getJSON(fetchFn, `https://api.gleif.org/api/v1/lei-records?filter[isin]=${isin}`, "application/vnd.api+json");
  if ((!j || !j.data || !j.data.length) && name) { // repli : recherche par nom légal dans le pays de l'ISIN
    j = await getJSON(fetchFn, `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(name)}&filter[entity.legalAddress.country]=${isin.slice(0, 2)}&filter[entity.status]=ACTIVE`, "application/vnd.api+json");
  }
  const rec = j && j.data && j.data[0];
  return rec ? { lei: rec.id, legalName: rec.attributes && rec.attributes.entity && rec.attributes.entity.legalName && rec.attributes.entity.legalName.name } : null;
}

// LEI -> rapports ESEF (filings.xbrl.org), un par exercice, du plus récent au plus ancien
export async function filingsFor(fetchFn, lei, max = 3) {
  const filter = encodeURIComponent(JSON.stringify([{ name: "entity.identifier", op: "eq", val: lei }]));
  let j = await getJSON(fetchFn, `https://filings.xbrl.org/api/filings?filter=${filter}&sort=-period_end&page[size]=20`, "application/vnd.api+json");
  if (!j || !j.data || !j.data.length) { // autre chemin : passer par la fiche de l'entité
    const e = await getJSON(fetchFn, `https://filings.xbrl.org/api/entities?filter[identifier]=${lei}`, "application/vnd.api+json");
    const ent = e && e.data && e.data[0];
    const rel = ent && ent.relationships && ent.relationships.filings && ent.relationships.filings.links && ent.relationships.filings.links.related;
    if (!rel) return [];
    j = await getJSON(fetchFn, rel.startsWith("http") ? rel : "https://filings.xbrl.org" + rel, "application/vnd.api+json");
  }
  if (DIAGNOSTIC.__raw) DIAGNOSTIC.__raw[lei] = ((j && j.data) || []).map(f => [f.attributes && f.attributes.period_end, !!(f.attributes && f.attributes.json_url), f.attributes && f.attributes.error_count, f.attributes && f.attributes.processed]);
  const byPeriod = new Map();
  for (const f of (j && j.data) || []) {
    const a = f.attributes || {};
    if (!a.json_url || !a.period_end) continue;
    const prev = byPeriod.get(a.period_end);
    if (!prev || String(a.processed || "") > String(prev.processed || "")) byPeriod.set(a.period_end, a);
  }
  return [...byPeriod.values()].sort((a, b) => String(b.period_end).localeCompare(String(a.period_end))).slice(0, max)
    .map(a => ({ period_end: a.period_end, json: abs(a.json_url), report: a.report_url ? abs(a.report_url) : null, published: a.date_added || a.processed || null }));
}
const abs = u => u.startsWith("http") ? u : "https://filings.xbrl.org" + (u.startsWith("/") ? "" : "/") + u;

// Diagnostic : étiquettes du dernier rapport qui ressemblent aux chiffres recherchés (pour améliorer la lecture)
const DIAG = /operat|ebit|recurring|debt|borrow|financialliab|depreciat|amortis|revenue|sales|turnover|dividend|netdebt|leaseliab/i;
export function candidates(doc) {
  const out = {};
  for (const f of Object.values((doc && doc.facts) || {})) {
    const d = f.dimensions || {};
    if (!d.concept || Object.keys(d).some(k => !["concept", "entity", "period", "unit", "language", "noteId"].includes(k))) continue;
    if (!DIAG.test(d.concept.split(":")[1] || "")) continue;
    const v = Number(f.value); if (!isFinite(v)) continue;
    const key = d.concept + " @ " + d.period;
    if (!(key in out)) out[key] = Math.abs(v) >= 1e5 ? Math.round(v / 1e6) : v;
  }
  return out;
}
export const DIAGNOSTIC = {};

let CIK = null;
export async function collectSec(fetchFn, c) {
  if (!c.cik) CIK = CIK || await cikMap(getJSON, fetchFn);
  const cik = c.cik || CIK[c.sec];
  if (!cik) throw new Error("numéro SEC introuvable pour " + c.sec);
  const doc = await getJSON(fetchFn, factsUrl(cik));
  if (!doc) throw new Error("aucun compte à la SEC pour " + c.sec);
  const s = toSeries(extractSec(doc));
  if (!s.years.length) throw new Error("aucun exercice annuel lisible");
  if (!nameMatches(c.legal || c.name, doc.entityName)) VERIF.push(`${c.name} : le code ${c.sec} renvoie à « ${doc.entityName} »`);
  return { v: VERSION, devise2: true,
    id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, region: c.region, domain: c.domain, desc: c.desc, cik, legalName: doc.entityName || c.name,
    sector: c.sector, ...s,
    sources: [{ periodEnd: s.years[s.years.length - 1] + "", report: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`, json: factsUrl(cik) }],
    updated: new Date().toISOString().slice(0, 10),
  };
}

// Le nom légal trouvé par l'ISIN doit ressembler au nom de l'entreprise : sinon l'ISIN est peut-être faux
const words = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !["the", "group", "groupe", "holding", "societe", "company", "spa", "plc"].includes(w));
export function nameMatches(name, legal) { const a = new Set(words(name)); return !legal || words(legal).some(w => a.has(w)) || words(name).some(w => String(legal).toLowerCase().replace(/[^a-z0-9]/g, "").includes(w)); }
export const VERIF = [];
export const VERSION = 3; // à augmenter quand la lecture des comptes change : force une nouvelle lecture


// Dernier exercice dont les comptes devraient être publiés : clos depuis plus de quatre mois (fyEnd = "MM-JJ")
export function expectedYear(fyEnd = "12-31", now = new Date()) {
  const [m, d] = String(fyEnd || "12-31").split("-").map(Number);
  for (let y = now.getUTCFullYear(); y > now.getUTCFullYear() - 3; y--) if (Date.UTC(y, (m || 12) - 1, d || 31) + 122 * 864e5 <= now.getTime()) return y;
  return now.getUTCFullYear() - 2;
}
// Dernier exercice complet présent dans un rapport (chiffre d'affaires ou résultat sur environ un an)
const newestYear = r => Math.max(-Infinity, ...Object.entries(r.years).filter(([, v]) => v.ca != null || v.net != null).map(([y]) => +y));

export async function collectOne(fetchFn, c) {
  if (c.sec) return collectSec(fetchFn, c);
  const fr = /^FR/.test(c.isin || "");
  let id = c.lei ? { lei: c.lei, legalName: c.name } : await leiFromIsin(fetchFn, c.isin, c.legal || c.name);
  if (!id && !fr) throw new Error("LEI introuvable pour " + c.isin);
  if (id && !nameMatches(c.legal || c.name, id.legalName)) VERIF.push(`${c.name} : l'ISIN ${c.isin} renvoie à « ${id.legalName} »`);
  const fl = id ? await filingsFor(fetchFn, id.lei, 8) : [];
  // Rapports annuels seulement : un rapport n'est gardé que s'il apporte un exercice complet de plus
  // (les rapports trimestriels ou semestriels déposés par certaines sociétés, au Danemark notamment, sont écartés).
  const reports = [], segs = [], used = [], seen = new Set(), spare = [];
  let first = true;
  for (const f of fl) {
    if (used.length >= 3) break;
    const doc = await getJSON(fetchFn, f.json);
    await sleep(300);
    if (!doc) continue;
    const ex = extract(doc), ny = newestYear(ex);
    if (spare.length < 3) spare.push([ex, doc, f]);
    if (!isFinite(ny) || seen.has(ny)) continue;
    seen.add(ny); reports.push(ex); segs.push(extractSegments(doc)); used.push({ periodEnd: f.period_end, report: f.report, json: f.json, ny });
    if (first) { DIAGNOSTIC[c.id] = { periods: fl.map(x => x.period_end), concepts: candidates(doc) }; first = false; }
  }
  // Aucun exercice complet reconnu (étiquettes inhabituelles) : on garde les rapports tels quels, comme avant
  if (!reports.length) for (const [ex, doc, f] of spare) { reports.push(ex); segs.push(extractSegments(doc)); used.push({ periodEnd: f.period_end, report: f.report, json: f.json, ny: -Infinity }); }
  // Sociétés françaises : dernier rapport annuel déposé à l'AMF quand filings.xbrl.org ne l'a pas (encore) indexé
  const have = reports.length ? Math.max(...used.map(u => u.ny)) : -Infinity;
  const amfTried = fr && have < expectedYear(reports[0] && reports[0].fyEnd);
  if (amfTried) {
    try {
      const af = await amfAnnualFilings(getJSON, fetchFn, c.isin, `${new Date().getUTCFullYear() - 2}-01-01`);
      // seuls les dépôts postérieurs à la clôture de l'exercice suivant celui déjà lu peuvent apporter du nouveau (évite de retélécharger des paquets de 20 à 90 Mo)
      const fy = (reports[0] && reports[0].fyEnd) || "12-31", after = isFinite(have) ? `${have + 1}-${fy}` : "";
      for (const f of af.filter(x => x.date > after).slice(0, 2)) {
        const doc = await amfDoc(fetchFn, UA, f); await sleep(300);
        if (!doc) continue;
        const ex = extract(doc), ny = newestYear(ex);
        if (!isFinite(ny) || ny <= have) continue;
        reports.unshift(ex); segs.unshift(extractSegments(doc));
        used.unshift({ periodEnd: `${ny}-${ex.fyEnd || "12-31"}`, report: f.url, json: null, ny, amf: true });
        if (!id && f.lei) id = { lei: f.lei, legalName: c.name };
        break;
      }
    } catch (e) { console.log("AMF", c.name, e.message); }
  }
  if (!reports.length) throw new Error(id ? "aucun rapport ESEF pour " + id.lei : "LEI introuvable pour " + c.isin);
  const merged = merge(reports), s = toSeries(merged);
  const caByYear = Object.fromEntries(Object.entries(merged.years).map(([y, r]) => [y, r.ca]));
  return { v: VERSION, devise2: true, segments: bestSegments(segs, caByYear),
    id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, lei: id ? id.lei : null, legalName: (id && id.legalName) || c.name,
    sector: c.sector, ...s,
    sources: used.map(u => ({ periodEnd: u.periodEnd, report: u.report, json: u.json, ...(u.amf ? { source: "AMF" } : {}) })), ...(amfTried ? { amfTried: true } : {}),
    updated: new Date().toISOString().slice(0, 10),
  };
}

// Résumé pour la liste (dernier exercice disponible)
export function summary(c) {
  const L = c.years.length - 1, f = c.fin, at = (k, i = L) => f[k] && i >= 0 ? f[k][i] : null;
  return {
    id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector, currency: c.currency,
    year: c.years[L] ?? null, ca: at("ca"), caPrev: at("ca", L - 1), ebit: at("ebit"), net: at("net"), netPrev: at("net", L - 1), equity: at("equity"),
    netDebt: at("netDebt"), ebitda: at("ebitda"), fcf: at("fcf"), divPaid: at("divPaid"), dps: at("dps") ?? at("dpsEst"), eps: at("eps"),
  };
}

// Dépôts récents à la SEC pour toutes les sociétés concernées -> actualité et agenda estimé
async function collectActuSec(fetchFn, list) {
  const items = [], events = [];
  try { CIK = CIK || await cikMap(getJSON, fetchFn); } catch (e) { console.log("liste SEC", e.message); CIK = {}; }
  await pool(list.filter(c => c.sec), 5, async c => {
    try {
      const cik = c.cik || CIK[c.sec]; if (!cik) return;
      const sub = await getJSON(fetchFn, subsUrl(cik));
      recentFilings(sub, cik, 8).forEach(f => items.push({ id: c.id, ...f }));
    } catch (e) { console.log("actu SEC", c.name, e.message); }
    await sleep(600); // SEC : 10 requêtes par seconde au plus ; 5 lectures en parallèle avec une pause restent en dessous (évite les refus 429)
  });
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  writeFileSync(new URL("actu-sec.json", OUT), JSON.stringify({ updated: new Date().toISOString(), source: "SEC EDGAR", items: items.slice(0, 600) }));
  console.log(items.length, "dépôts SEC");
}

// Exécute fn sur chaque élément, n à la fois
export async function pool(items, n, fn) {
  let k = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) { const it = items[k++]; await fn(it); } }));
}

async function main() {
  const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
  if (process.argv.includes("--actu")) return collectActuSec(fetch, U);
  const FRESH = +(process.env.FRESH_DAYS ?? 7) * 864e5;
  DIAGNOSTIC.__raw = {};
  mkdirSync(new URL("societes/", OUT), { recursive: true });
  const prevIndex = existsSync(new URL("societes.json", OUT)) ? JSON.parse(readFileSync(new URL("societes.json", OUT))) : { companies: [] };
  const prev = Object.fromEntries((prevIndex.companies || []).map(c => [c.id, c]));
  const errors = [], slots = new Array(U.length);
  let done = 0;
  const one = async (c, i) => {
    if (only && c.id !== only) { if (prev[c.id]) slots[i] = prev[c.id]; return; }
    const file = new URL(`societes/${c.id}.json`, OUT);
    if (!only && existsSync(file)) { // comptes récents : on garde (les comptes ne changent qu'une fois par an)
      const old = JSON.parse(readFileSync(file));
      const deviseDouteuse = !old.devise2 && old.currency === "EUR" && /^(SE|DK|NO|GB|CH|PL|CZ|HU|IS)/.test(old.isin || c.isin || ""); // comptes non européens lus à tort en euros
      // Relecture étalée sur une semaine (selon l'identifiant) pour ne pas tout relire le même jour ;
      // comptes en retard d'un exercice (rapport attendu mais absent) : nouvel essai chaque jour pour la France (rapports AMF), tous les trois jours ailleurs.
      const spread = (FRESH ? [...c.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 7, 0) * 864e5 : 0);
      const lastY = (old.years || [])[(old.years || []).length - 1];
      const late = !old.cik && lastY != null && lastY < expectedYear(old.fyEnd) && Date.now() - new Date(old.updated) > (/^FR/.test(c.isin || "") ? (old.amfTried ? 20 : 0) : 70) * 3600e3; // France : premier essai AMF immédiat
      if (old.v === VERSION && !deviseDouteuse && !late && old.updated && Date.now() - new Date(old.updated) < FRESH + spread) { const m = { ...old, region: c.region, domain: c.domain, desc: c.desc, name: c.name, sector: c.sector }; writeFileSync(file, JSON.stringify(m)); slots[i] = summary(m); return; }
    }
    try {
      const full = await collectOne(fetch, c);
      writeFileSync(file, JSON.stringify(full));
      slots[i] = summary(full);
      if (++done % 25 === 0) console.log(done, "sociétés lues");
    } catch (e) {
      errors.push(`${c.name} : ${e.message}`);
      console.log("ÉCHEC", c.name, e.message);
      if (prev[c.id] && !prev[c.id].missing) slots[i] = prev[c.id]; // on garde la version précédente
      else slots[i] = { id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector, missing: true };
    }
  };
  // Plusieurs lectures en même temps : 3 pour filings.xbrl.org, 5 pour la SEC (qui accepte 10 requêtes par seconde)
  const idx = U.map((c, i) => [c, i]);
  if (!only && !CIK && idx.some(([c]) => c.sec && !c.cik)) { try { CIK = await cikMap(getJSON, fetch); } catch (e) { console.log("liste SEC", e.message); } }
  await Promise.all([pool(idx.filter(([c]) => !c.sec), 3, ([c, i]) => one(c, i)), pool(idx.filter(([c]) => c.sec), 5, async ([c, i]) => { await one(c, i); await sleep(400); })]);
  const list = slots.filter(Boolean);
  DIAGNOSTIC.__verif = VERIF;
  writeFileSync(new URL("./diagnostic.json", import.meta.url), JSON.stringify(DIAGNOSTIC, null, 1));
  writeFileSync(new URL("societes.json", OUT), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), sectors: SECTEURS, companies: list, errors, verif: VERIF }));
  console.log(`${list.filter(c => !c.missing).length} sociétés avec comptes sur ${list.length}, ${errors.length} échec(s)`);
  if (VERIF.length) console.log("À vérifier :\n" + VERIF.join("\n"));
  if (!only) await collectActuSec(fetch, U);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
