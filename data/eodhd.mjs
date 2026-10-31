// Import des comptes annuels et trimestriels depuis EODHD (fondamentaux monde), 5e passage (A7, 31/10/2026).
// Sert aux entreprises dont les comptes ne sont pas en données ouvertes (Samsung, Hyundai, TCS, Aramco, ICBC, sociétés allemandes…).
// Préparé SANS la clé : la clé se met dans le secret GitHub EODHD_KEY (par Romain, jamais par l'agent).
//   node data/eodhd.mjs --test              convertit la fixture tests/fixtures/eodhd_sample.json (aucun réseau)
//   node data/eodhd.mjs --max 50            complète jusqu'à 50 fiches sans comptes (les plus grosses d'abord) ; EODHD_KEY requis
//   node data/eodhd.mjs --id samsung-electronics
// Écrit cf/site/data/societes/<id>.json (format v4 du site, mêmes champs que data/esef.mjs et data/sec.mjs) avec
// sources: [{ periodEnd, source: "EODHD", report: <page EODHD> }] et cf/site/data/trim/<id>.json (même format que data/sec_trim.mjs).
// Règles : une donnée EODHD est toujours marquée « source : EODHD » (pas « document officiel ») ; jamais de chiffre estimé.
// Quota : un appel « fundamentals » coûte 10 appels EODHD ; le plan Tout-en-un en donne 100 000 par jour.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const TEST = process.argv.includes("--test"), MAX = +arg("--max", 50), ID = arg("--id", null), KEY = process.env.EODHD_KEY || "";
// Place de cotation TradingView (univers-min.json, champ tv) → suffixe EODHD
export const PLACES = { NYSE: "US", NASDAQ: "US", AMEX: "US", EURONEXT: "PA", XETR: "XETRA", FWB: "F", LSE: "LSE", OMXSTO: "ST", OMXCOP: "CO", OMXHEX: "HE", OSL: "OL", MIL: "MI", SIX: "SW", BME: "MC", VIE: "VI", GPW: "WAR", ATHEX: "AT", TSE: "TSE", HKEX: "HK", KRX: "KO", TSX: "TO", NSE: "NSE", BSE: "BSE", ASX: "AU", BMFBOVESPA: "SA", BMV: "MX", TWSE: "TW", TASE: "TA", SZSE: "SHE", SSE: "SHG", SGX: "SG", TADAWUL: "SR" };
const EURONEXT_PAYS = { NL: "AS", BE: "BR", PT: "LS", IE: "IR", FR: "PA" };
export function tickerEodhd(c) { // "KRX:005930" → "005930.KO" ; Euronext selon le pays de l'ISIN
  const [place, code] = String(c.tv || "").split(":"); if (!place || !code) return null;
  let suf = PLACES[place]; if (!suf) return null;
  if (place === "EURONEXT") suf = EURONEXT_PAYS[(c.isin || "").slice(0, 2)] || "PA";
  if (place === "HKEX") return code.padStart(4, "0") + ".HK";
  return code.replace(/\./g, "-") + "." + suf;
}
const num = v => { const x = typeof v === "string" ? parseFloat(v) : v; return typeof x === "number" && isFinite(x) ? x : null; };
const M = v => (v == null ? null : Math.round(v / 1e6 * 10) / 10); // EODHD donne des unités ; le site stocke des millions (1 décimale)
export function convertir(c, e) { // e : réponse « fundamentals » d'EODHD → { societe, trim } au format du site
  const G = e.General || {}, F = e.Financials || {}, IS = (F.Income_Statement || {}).yearly || {}, BS = (F.Balance_Sheet || {}).yearly || {}, CF = (F.Cash_Flow || {}).yearly || {};
  const currency = G.CurrencyCode || (F.Income_Statement || {}).currency_symbol || null;
  const dates = Object.keys(IS).filter(d => IS[d] && num(IS[d].totalRevenue) != null).sort().slice(-5);
  if (!dates.length || !currency) return null;
  const years = dates.map(d => +d.slice(0, 4)), fyEnd = dates[dates.length - 1].slice(5, 10);
  const col = (src, k) => dates.map(d => M(num(src[d] && src[d][k])));
  const ca = col(IS, "totalRevenue"), ebit = col(IS, "operatingIncome"), net = col(IS, "netIncome"), tax = col(IS, "incomeTaxExpense");
  const equity = col(BS, "totalStockholderEquity"), cash = col(BS, "cashAndShortTermInvestments").map((v, i) => v ?? col(BS, "cash")[i]), debt = col(BS, "shortLongTermDebtTotal");
  const cfo = col(CF, "totalCashFromOperatingActivities"), capex = col(CF, "capitalExpenditures").map(v => v == null ? null : Math.abs(v)), fcf = col(CF, "freeCashFlow").map((v, i) => v ?? (cfo[i] != null && capex[i] != null ? Math.round((cfo[i] - capex[i]) * 10) / 10 : null));
  const divPaid = col(CF, "dividendsPaid").map(v => v == null ? null : Math.abs(v));
  const eps = dates.map(d => { const v = num(IS[d] && IS[d].epsDiluted); return v == null ? null : Math.round(v * 100) / 100; });
  const netDebt = debt.map((d, i) => d != null && cash[i] != null ? Math.round((d - cash[i]) * 10) / 10 : null);
  const societe = { v: 4, id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, sector: c.sector,
    years, currency, fyEnd, fin: { ca, ebit, net, eps, divPaid, equity, cash, debt, netDebt, cfo, capex, fcf, tax },
    tags: { net: years.map(() => "résultat net publié par EODHD"), debt: years.map(() => "dette totale moins trésorerie et placements (EODHD)"), norme: years.map(() => G.InternationalDomain ? "comptes publiés" : "comptes publiés") },
    norme: "EODHD", sources: dates.map(d => ({ periodEnd: d, source: "EODHD", report: `https://eodhd.com/financial-summary/${tickerEodhd(c)}`, json: null })).reverse(), updated: new Date().toISOString().slice(0, 10) };
  const Q = (F.Income_Statement || {}).quarterly || {};
  const q = Object.keys(Q).filter(d => Q[d] && num(Q[d].totalRevenue) != null).sort().slice(-8).map(d => ({ end: d, ca: M(num(Q[d].totalRevenue)), net: M(num(Q[d].netIncome)), eps: num(Q[d].epsDiluted) == null ? null : Math.round(num(Q[d].epsDiluted) * 100) / 100, filed: Q[d].filing_date || null, form: "EODHD" }));
  const trim = q.length ? { id: c.id, updated: societe.updated, source: `https://eodhd.com/financial-summary/${tickerEodhd(c)}`, currency, q } : null;
  return { societe, trim };
}
function ecrire(r) {
  mkdirSync("cf/site/data/societes", { recursive: true }); mkdirSync("cf/site/data/trim", { recursive: true });
  writeFileSync(`cf/site/data/societes/${r.societe.id}.json`, JSON.stringify(r.societe));
  if (r.trim) writeFileSync(`cf/site/data/trim/${r.societe.id}.json`, JSON.stringify(r.trim));
}
async function lire(c) {
  const t = tickerEodhd(c); if (!t) throw new Error("place de cotation inconnue : " + c.tv);
  const r = await fetch(`https://eodhd.com/api/fundamentals/${encodeURIComponent(t)}?api_token=${KEY}&fmt=json`, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`EODHD ${r.status} pour ${t}`);
  return r.json();
}
if (process.argv[1] && /[\/\\]eodhd\.mjs$/.test(process.argv[1])) {
  const U = JSON.parse(readFileSync("cf/site/data/univers-min.json", "utf8")).companies;
  if (TEST) {
    const fx = JSON.parse(readFileSync("tests/fixtures/eodhd_sample.json", "utf8")), c = U.find(x => x.id === fx.__id) || { id: fx.__id, name: fx.__id, tv: "KRX:005930", isin: "KR7005930003", sector: "tech", region: "MONDE" };
    const r = convertir(c, fx); if (!r) { console.error("conversion vide"); process.exit(1); }
    console.log(JSON.stringify({ years: r.societe.years, currency: r.societe.currency, ca: r.societe.fin.ca, trim: r.trim ? r.trim.q.length : 0 }));
  } else if (!KEY) { console.log("EODHD_KEY absent : rien à faire (la clé se met dans le secret GitHub EODHD_KEY)."); }
  else {
    const sansComptes = U.filter(c => ID ? c.id === ID : (c.missing || !existsSync(`cf/site/data/societes/${c.id}.json`))).filter(c => tickerEodhd(c)).slice(0, MAX);
    let n = 0; for (const c of sansComptes) {
      try { const r = convertir(c, await lire(c)); if (r) { ecrire(r); n++; console.log(`${c.id} : ${r.societe.years.join(", ")} (${r.societe.currency})${r.trim ? ", " + r.trim.q.length + " trimestres" : ""}`); } else console.log(`${c.id} : pas de comptes chez EODHD`); }
      catch (e) { console.error(c.id, String(e).slice(0, 120)); }
      await new Promise(r => setTimeout(r, 400));
    }
    console.log(`${n} fiche(s) écrite(s) sur ${sansComptes.length}`);
  }
}
