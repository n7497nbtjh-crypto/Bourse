// Cours quotidiens de toutes les entreprises et de tous les ETF suivis, depuis Marketstack (abonnement Basic de Romain, 29/10/2026).
// Remplace le widget TradingView (huit places absentes du widget gratuit) et les courbes à quatre points : une seule courbe,
// dessinée par Lightweight Charts à partir de ces fichiers.
//
// Usage : MARKETSTACK_KEY=… node data/marketstack.mjs [--remap] [--max N]
//   - la clé vient du secret GitHub MARKETSTACK_KEY (Romain la saisit lui-même ; jamais dans le dépôt) ;
//   - --max N : nombre maximal de requêtes pour cette exécution (défaut 1500 ; l'abonnement Basic en donne 10 000 par mois) ;
//   - --remap : refait la correspondance entre nos symboles et ceux de Marketstack.
//
// Fichiers produits :
//   data/marketstack_map.json              : notre clé (c:id ou e:id) → symbole Marketstack (ex. MC.XPAR), ou null si introuvable
//   data/marketstack_tickers/<MIC>.json    : liste des symboles d'une place (cache, un mois)
//   cf/site/data/cours/<c|e>-<id>.json     : { s, from, d: [dates], c: [clôtures ajustées] } sur un an glissant, lu par la fiche
//
// Budget : correspondance ≈ 80 requêtes (une fois) ; historique initial ≈ 25 requêtes par lot de 100 symboles ;
// mise à jour quotidienne ≈ 1 requête par lot de 100 symboles (≈ 40 par jour).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";

const KEY = process.env.MARKETSTACK_KEY;
const args = process.argv.slice(2), REMAP = args.includes("--remap"), MAX = +(args[args.indexOf("--max") + 1] || 0) || 1500;
if (!KEY) { console.log("::warning::MARKETSTACK_KEY absent : cours Marketstack non collectés"); process.exit(0); }

const ROOT = new URL("../", import.meta.url);
const P = p => new URL(p, ROOT);
const OUT = P("cf/site/data/cours/"); if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const TKDIR = P("data/marketstack_tickers/"); if (!existsSync(TKDIR)) mkdirSync(TKDIR, { recursive: true });
const MAPF = P("data/marketstack_map.json");
const today = new Date().toISOString().slice(0, 10);
const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// Places : préfixe TradingView (nos symboles) → MIC Marketstack. Euronext dépend du pays de l'ISIN.
const MIC = { XETR: "XETR", BME: "XMAD", MIL: "XMIL", OMXHEX: "XHEL", NASDAQ: "XNAS", NYSE: "XNYS", LSE: "XLON", OMXCOP: "XCSE", OMXSTO: "XSTO", OSL: "XOSL", VIE: "XWBO", SIX: "XSWX", TSE: "XTKS", TWSE: "XTAI", NSE: "XNSE", HKEX: "XHKG", ASX: "XASX", TSX: "XTSE", BMFBOVESPA: "BVMF", BMV: "XMEX", TASE: "XTAE", GPW: "XWAR", ATHEX: "XATH", KRX: "XKRX", SZSE: "XSHE", SSE: "XSHG", SGX: "XSES", TADAWUL: "XSAU", AMEX: "XASE", NYSEARCA: "ARCX", CBOE: "BATS" };
const EURONEXT = { FR: "XPAR", NL: "XAMS", BE: "XBRU", PT: "XLIS", LU: "XPAR" };
const micsDe = (tv, isin) => { const [ex] = String(tv || "").split(":"); if (ex === "EURONEXT") { const p = EURONEXT[(isin || "").slice(0, 2)]; return p ? [p === "XDUB" ? "XPAR" : p, "XPAR", "XAMS", "XBRU", "XLIS"].filter((x, i, a) => a.indexOf(x) === i) : ["XPAR", "XAMS", "XBRU", "XLIS"]; } return MIC[ex] ? [MIC[ex]] : []; };
const norm = t => String(t || "").toUpperCase().replace(/[._ ]/g, "-");

let nreq = 0;
async function api(path, params) {
  if (nreq >= MAX) throw new Error("budget de requêtes atteint (" + MAX + ")");
  const u = new URL("https://api.marketstack.com/v2" + path); u.searchParams.set("access_key", KEY); for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  for (let t = 0; t < 8; t++) {
    nreq++;
    const r = await fetch(u);
    if (r.status === 429) { const w = Math.min(60, 8 * (t + 1)); if (t >= 2) console.log(`Marketstack : cadence trop élevée, pause de ${w} s`); await new Promise(z => setTimeout(z, w * 1000)); continue; }
    if (!r.ok) { const txt = await r.text().catch(() => ""); throw new Error(`Marketstack ${r.status} sur ${path} : ${txt.slice(0, 200)}`); }
    const j = await r.json(); await new Promise(z => setTimeout(z, 1100)); return j; // environ une requête par seconde : la cadence admise par l'abonnement
  }
  throw new Error("Marketstack : trop de réponses 429 sur " + path);
}

// ---------- 1. Les titres à suivre ----------
const { default: U } = await import("./univers.mjs");
const { default: E } = await import("./etf.mjs");
const titres = [
  ...U.filter(c => c.tv).map(c => ({ k: "c:" + c.id, tv: c.tv, isin: c.isin || "", ticker: c.ticker || String(c.tv).split(":")[1] })),
  ...E.filter(e => e.tv).map(e => ({ k: "e:" + e.id, tv: e.tv, isin: e.isin || "", ticker: e.ticker || String(e.tv).split(":")[1] })),
];
console.log(titres.length, "titres avec un symbole (entreprises et ETF)");

// ---------- 2. Correspondance de symboles, par place ----------
const BASES = new Map();
function baseIdx(mic, S) { // symbole sans suffixe de place → symboles Marketstack
  if (BASES.has(mic)) return BASES.get(mic);
  const m = new Map(); for (const sym of Object.keys(S)) { if (S[sym].eod === false) continue; const b = norm(sym.replace(/\.[A-Z0-9]{1,5}$/, "")); if (!m.has(b)) m.set(b, []); m.get(b).push(sym); }
  BASES.set(mic, m); return m;
}
let map = {}; try { map = JSON.parse(readFileSync(MAPF, "utf8")); } catch (e) { }
async function tickersDe(mic) {
  const f = new URL(mic + ".json", TKDIR);
  if (existsSync(f)) { const j = JSON.parse(readFileSync(f, "utf8")); if (jours(j.date, today) < 31) return j.symbols; }
  const symbols = {}; let offset = 0, total = Infinity;
  while (offset < total) {
    const j = await api(`/exchanges/${mic}/tickers`, { limit: 1000, offset });
    total = j.pagination ? j.pagination.total : 0;
    const l = (j.data && (j.data.tickers || j.data)) || []; const arr = Array.isArray(l) ? l : [];
    for (const t of arr) { const sym = t.symbol || t.ticker; if (!sym) continue; symbols[sym] = { n: t.name || "", eod: t.has_eod !== false }; }
    if (!arr.length) break; offset += 1000;
    if (offset > 80000) break; // garde-fou (Londres, Nasdaq, NYSE : plus de 20 000 symboles)
  }
  writeFileSync(f, JSON.stringify({ date: today, mic, symbols }));
  console.log(mic, ":", Object.keys(symbols).length, "symboles");
  return symbols;
}
const aFaire = titres.filter(t => REMAP || !map[t.k]); // les titres sans correspondance sont réessayés (listes des places en cache un mois)
if (aFaire.length) {
  console.log(aFaire.length, "symboles à faire correspondre");
  const parMic = new Map();
  for (const t of aFaire) for (const mic of micsDe(t.tv, t.isin)) { if (!parMic.has(mic)) parMic.set(mic, null); }
  for (const mic of parMic.keys()) { try { parMic.set(mic, await tickersDe(mic)); } catch (e) { console.log("::warning::" + mic + " : " + e.message); parMic.set(mic, {}); } }
  let ok = 0;
  for (const t of aFaire) {
    let found = null;
    for (const mic of micsDe(t.tv, t.isin)) {
      const S = parMic.get(mic) || {}, want = norm(t.ticker), B = baseIdx(mic, S);
      // Marketstack suffixe les symboles hors États-Unis, de façon variable : "MC.XPAR", "BNP.PA", "SAP.DE" ; aux États-Unis, "AAPL" tout court
      const l = B.get(want) || B.get(want.replace(/-/g, "")) || [];
      found = l.find(x => x.endsWith("." + mic)) || l.find(x => /\.[A-Z]{1,3}$/.test(x)) || l[0] || null;
      if (found) break;
    }
    map[t.k] = found; if (found) ok++;
  }
  console.log(ok, "correspondances trouvées sur", aFaire.length, "(", nreq, "requêtes )");
  writeFileSync(MAPF, JSON.stringify(map, null, 0));
}
const suivis = titres.filter(t => map[t.k]);
console.log(suivis.length, "titres avec un symbole Marketstack ;", titres.length - suivis.length, "sans");

// ---------- 3. Historique (un an glissant) et mise à jour ----------
const fichier = k => new URL(k.replace(":", "-") + ".json", OUT);
const lire = k => { const f = fichier(k); try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { return null; } };
const depuis = new Date(Date.now() - 370 * 864e5).toISOString().slice(0, 10);
const aCompleter = [], aMettreAJour = [];
for (const t of suivis) { const h = lire(t.k); const der = h && h.d && h.d.at(-1); if (!der || jours(der, today) > 7) aCompleter.push(t); else if (der < today) aMettreAJour.push(t); }
console.log(aCompleter.length, "à reconstituer sur un an,", aMettreAJour.length, "à mettre à jour");
const parSym = new Map(suivis.map(t => [map[t.k], t]));
const ecrire = (t, rows) => { // rows : [{date, close, adj_close}] du plus ancien au plus récent
  const h = lire(t.k) || { s: map[t.k], d: [], c: [] };
  const idx = new Map(h.d.map((d, i) => [d, i]));
  for (const r of rows) { const d = String(r.date).slice(0, 10); let v = r.adj_close != null ? +r.adj_close : +r.close; if (!(v > 0)) continue; if (r.price_currency) h.cur = String(r.price_currency).toUpperCase(); // Londres : souvent en pence (GBX) ; le site ramène l'échelle sur le cours du jour
    if (idx.has(d)) h.c[idx.get(d)] = v; else { idx.set(d, h.d.length); h.d.push(d); h.c.push(v); } }
  const ord = h.d.map((d, i) => [d, h.c[i]]).sort((a, b) => a[0].localeCompare(b[0])).filter(x => x[0] >= depuis);
  h.d = ord.map(x => x[0]); h.c = ord.map(x => +x[1].toFixed(4)); h.s = map[t.k]; h.updated = today;
  writeFileSync(fichier(t.k), JSON.stringify(h));
};
const lots = (l, n) => { const out = []; for (let i = 0; i < l.length; i += n) out.push(l.slice(i, i + n)); return out; };
let ecrits = 0;
try {
  for (const lot of lots(aCompleter, 25)) {
    const syms = lot.map(t => map[t.k]).join(","), acc = new Map(); let offset = 0, total = Infinity;
    while (offset < total) {
      const j = await api("/eod", { symbols: syms, date_from: depuis, date_to: today, limit: 1000, offset, sort: "ASC" });
      total = j.pagination ? j.pagination.total : 0; const rows = j.data || [];
      for (const r of rows) { const t = parSym.get(r.symbol); if (!t) continue; if (!acc.has(t.k)) acc.set(t.k, []); acc.get(t.k).push(r); }
      if (!rows.length) break; offset += 1000;
    }
    for (const [k, rows] of acc) { ecrire(parSym.get(map[k]) || suivis.find(t => t.k === k), rows); ecrits++; }
    console.log("historique :", acc.size, "titres écrits (", nreq, "requêtes )");
  }
  for (const lot of lots(aMettreAJour, 100)) {
    const j = await api("/eod/latest", { symbols: lot.map(t => map[t.k]).join(",") });
    for (const r of j.data || []) { const t = parSym.get(r.symbol); if (t) { ecrire(t, [r]); ecrits++; } }
  }
} catch (e) { console.log("::warning::Marketstack : " + e.message); }
console.log(ecrits, "fichiers de cours écrits ;", nreq, "requêtes utilisées");
// Index léger : quels titres ont une courbe (le site évite ainsi une requête inutile)
const idx = {}; for (const f of readdirSync(OUT)) if (f.endsWith(".json") && f !== "index.json") { try { const j = JSON.parse(readFileSync(new URL(f, OUT), "utf8")); idx[f.slice(0, -5)] = j.d.at(-1); } catch (e) { } }
writeFileSync(new URL("index.json", OUT), JSON.stringify({ updated: today, source: "Marketstack, cours de clôture ajustés", n: Object.keys(idx).length, items: idx }));
