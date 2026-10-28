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
// Variable facultative CONTACT : adresse ou lien de contact ajouté à l'en-tête User-Agent,
// comme le demande filings.xbrl.org pour un usage régulier.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import U, { SECTEURS } from "./univers.mjs";
import { extract, merge, toSeries } from "./esef.mjs";
import { extractSec, cikMap, factsUrl } from "./sec.mjs";

const OUT = new URL("../cf/site/data/", import.meta.url);
const UA = "Repere/0.3 site-pedagogique " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse");
const sleep = ms => process.env.NO_SLEEP ? Promise.resolve() : new Promise(r => setTimeout(r, ms));

export async function getJSON(fetchFn, url, accept = "application/json") {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetchFn(url, { headers: { "user-agent": UA, accept } });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (attempt < 3) await sleep(2000 * attempt);
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
  return {
    id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, region: c.region, domain: c.domain, desc: c.desc, cik, legalName: doc.entityName || c.name,
    sector: c.sector, ...s,
    sources: [{ periodEnd: s.years[s.years.length - 1] + "", report: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`, json: factsUrl(cik) }],
    updated: new Date().toISOString().slice(0, 10),
  };
}

export async function collectOne(fetchFn, c) {
  if (c.sec) return collectSec(fetchFn, c);
  const id = c.lei ? { lei: c.lei, legalName: c.name } : await leiFromIsin(fetchFn, c.isin, c.legal || c.name);
  if (!id) throw new Error("LEI introuvable pour " + c.isin);
  const fl = await filingsFor(fetchFn, id.lei);
  if (!fl.length) throw new Error("aucun rapport ESEF pour " + id.lei);
  const reports = [];
  let first = true;
  for (const f of fl) {
    const doc = await getJSON(fetchFn, f.json);
    if (doc) { reports.push(extract(doc)); if (first) { DIAGNOSTIC[c.id] = { periods: fl.map(x => x.period_end), concepts: candidates(doc) }; first = false; } }
    await sleep(500);
  }
  const s = toSeries(merge(reports));
  return {
    id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, lei: id.lei, legalName: id.legalName || c.name,
    sector: c.sector, ...s,
    sources: fl.map(f => ({ periodEnd: f.period_end, report: f.report, json: f.json })),
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

async function main() {
  const only = process.argv[2];
  DIAGNOSTIC.__raw = {};
  mkdirSync(new URL("societes/", OUT), { recursive: true });
  const prevIndex = existsSync(new URL("societes.json", OUT)) ? JSON.parse(readFileSync(new URL("societes.json", OUT))) : { companies: [] };
  const prev = Object.fromEntries((prevIndex.companies || []).map(c => [c.id, c]));
  const list = [], errors = [];
  for (const c of U) {
    if (only && c.id !== only) { if (prev[c.id]) list.push(prev[c.id]); continue; }
    try {
      const full = await collectOne(fetch, c);
      writeFileSync(new URL(`societes/${c.id}.json`, OUT), JSON.stringify(full));
      list.push(summary(full));
      console.log("ok ", c.name, full.years.join(", "));
    } catch (e) {
      errors.push(`${c.name} : ${e.message}`);
      console.log("ÉCHEC", c.name, e.message);
      if (prev[c.id]) list.push(prev[c.id]); // on garde la version précédente
      else list.push({ id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector, missing: true });
    }
    await sleep(800);
  }
  writeFileSync(new URL("./diagnostic.json", import.meta.url), JSON.stringify(DIAGNOSTIC, null, 1));
  writeFileSync(new URL("societes.json", OUT), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), sectors: SECTEURS, companies: list, errors }));
  console.log(`${list.length - errors.length} sociétés à jour, ${errors.length} échec(s)`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
