// Composition des ETF, à partir des déclarations mensuelles des fonds américains à la SEC (formulaire N-PORT, public, gratuit).
// Les ETF européens ne publient pas leur composition dans une base ouverte : on lit celle d'un fonds américain
// qui suit le même indice (le « proxy », indiqué dans data/etf.mjs), ce qui donne la composition de l'indice.
//   https://www.sec.gov/files/company_tickers_mf.json               code -> identifiant de série du fonds
//   https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=<série>&type=NPORT-P&output=atom   ses déclarations
//   https://www.sec.gov/Archives/edgar/data/<cik>/<dossier>/primary_doc.xml     la déclaration (lignes du portefeuille)
// Résultat : cf/site/data/etf/<proxy>.json
import { mkdirSync, writeFileSync } from "node:fs";
import { UA } from "./fetch_data.mjs";

const OUT = new URL("../cf/site/data/etf/", import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(fetchFn, url, type = "text") {
  for (let a = 1; a <= 3; a++) {
    const r = await fetchFn(url, { headers: { "user-agent": UA } });
    if (r.ok) return type === "json" ? r.json() : r.text();
    if (r.status === 404) return null;
    await sleep(1500 * a);
    if (a === 3) throw new Error(r.status + " sur " + url);
  }
}
const tag = (xml, name) => { const m = xml.match(new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`)); return m ? m[1].trim() : null; };
const attr = (xml, name, a) => { const m = xml.match(new RegExp(`<(?:\\w+:)?${name}[^>]*\\b${a}="([^"]*)"`)); return m ? m[1] : null; };
const unesc = s => String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");

// Lignes du portefeuille d'une déclaration N-PORT
export function parseNport(xml) {
  const asOf = tag(xml, "repPdDate") || tag(xml, "repPdEnd");
  const net = Number(tag(xml, "netAssets")) || null;
  const lines = [];
  for (const m of xml.matchAll(/<(?:\w+:)?invstOrSec>([\s\S]*?)<\/(?:\w+:)?invstOrSec>/g)) {
    const b = m[1];
    const pct = Number(tag(b, "pctVal"));
    if (!isFinite(pct)) continue;
    lines.push({ name: unesc(tag(b, "name") || tag(b, "title")), isin: attr(b, "isin", "value"), cusip: tag(b, "cusip"), pct, country: tag(b, "invCountry"), cat: tag(b, "assetCat"), usd: Number(tag(b, "valUSD")) || null });
  }
  return { asOf, net, lines };
}
// Résumé : 15 premières lignes, répartition par pays, nombre de lignes
export function summarize(p) {
  const stocks = p.lines.filter(l => l.pct > 0);
  const top = [...stocks].sort((a, b) => b.pct - a.pct).slice(0, 15).map(l => ({ name: l.name, isin: l.isin, pct: Math.round(l.pct * 100) / 100, country: l.country }));
  const countries = {};
  for (const l of stocks) countries[l.country || "?"] = (countries[l.country || "?"] || 0) + l.pct;
  const byCountry = Object.entries(countries).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v * 10) / 10]);
  return { asOf: p.asOf, lines: stocks.length, top, countries: byCountry.slice(0, 12), isins: stocks.filter(l => l.isin).map(l => [l.isin, Math.round(l.pct * 1000) / 1000]) };
}
export async function seriesOf(fetchFn) {
  const j = await get(fetchFn, "https://www.sec.gov/files/company_tickers_mf.json", "json");
  const f = j.fields, m = {};
  for (const row of j.data) { const o = Object.fromEntries(f.map((k, i) => [k, row[i]])); m[String(o.symbol).toUpperCase()] = { cik: String(o.cik), series: o.seriesId }; }
  return m;
}
export async function latestNport(fetchFn, s) {
  const atom = await get(fetchFn, `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${s.series}&type=NPORT-P&dateb=&owner=include&count=5&output=atom`);
  const href = atom && (atom.match(/<filing-href>([^<]+)<\/filing-href>/) || [])[1];
  if (!href) return null;
  const dir = href.replace(/[^/]+$/, "");
  const xml = await get(fetchFn, dir + "primary_doc.xml");
  return xml ? { url: href, ...summarize(parseNport(xml)) } : null;
}
async function main() {
  const { PROXIES = [] } = await import("./etf.mjs").catch(() => ({}));
  mkdirSync(OUT, { recursive: true });
  const map = await seriesOf(fetch);
  const done = [], fails = [];
  for (const p of PROXIES) {
    try {
      const s = map[p.toUpperCase()];
      if (!s) throw new Error("série introuvable");
      const r = await latestNport(fetch, s);
      if (!r) throw new Error("aucune déclaration N-PORT");
      writeFileSync(new URL(`${p}.json`, OUT), JSON.stringify({ proxy: p, source: "SEC, formulaire N-PORT", ...r }));
      done.push(p); console.log("ok", p, r.asOf, r.lines, "lignes");
    } catch (e) { fails.push(`${p} : ${e.message}`); console.log("ÉCHEC", p, e.message); }
    await sleep(400);
  }
  writeFileSync(new URL("index.json", OUT), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), done, fails }));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
