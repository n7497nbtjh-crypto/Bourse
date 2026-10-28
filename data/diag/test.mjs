// Diagnostic : collecte brute pour élargir la liste des entreprises (lot auto1), étape 3.
// Sources ouvertes : GLEIF (correspondance ISIN-LEI), listes officielles des bourses (Euronext, Nasdaq Nordic), OpenFIGI (ISIN -> cotations).
// Résultats bruts dans data/diag/auto1/ ; le tri et le choix des sociétés se font ensuite hors ligne.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";
const DIR = "data/diag/auto1/"; mkdirSync(DIR, { recursive: true });
const UA = "bilan-univers/1.0 (site pedagogique; " + (process.env.CONTACT || "github.com/n7497nbtjh-crypto/bourse") + ")";
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = [], L = (...a) => { const s = `[${Math.round((Date.now() - T0) / 1000)}s] ` + a.join(" "); log.push(s); console.log(s); };
const save = (f, o) => writeFileSync(DIR + f, JSON.stringify(o));
const load = (f, d) => existsSync(DIR + f) ? JSON.parse(readFileSync(DIR + f)) : d;
const EU = new Set("AT BE BG CH CY CZ DE DK EE ES FI FR GB GG GR HR HU IE IM IS IT JE LI LT LU LV MT NL NO PL PT RO SE SI SK FO GI".split(" "));

// ---------- GLEIF : correspondance ISIN <-> LEI (fichier quotidien GLEIF/ANNA) ----------
async function gleif(W, E) {
  try {
    let link = null;
    for (const acc of ["*/*", "application/vnd.api+json", "application/json"]) {
      const r = await fetch("https://mapping.gleif.org/api/v2/isin-lei/latest", { headers: { "user-agent": UA, accept: acc } }).catch(() => null);
      const txt = r ? await r.text() : ""; L("gleif", acc, r && r.status, txt.slice(0, 300));
      link = (txt.match(/https?:[^"]*download[^"]*/) || [])[0]; if (link) break;
    }
    if (!link) return {};
    execSync(`curl -sSL -A "${UA}" -o /tmp/isinlei.zip "${link.replace(/\\\//g, "/")}"`, { timeout: 6 * 60e3 });
    L("gleif zip", execSync("ls -la /tmp/isinlei.zip").toString().trim());
    const want = new Set(); for (const o of Object.values(W)) (o.isin || []).forEach(v => want.add(v));
    const leis = new Set(Object.entries(E).filter(([, o]) => o.c !== "UA").map(([l]) => l));
    const isinLei = {}, leiIsin = {}; let n = 0; const head = [];
    const p = spawn("unzip", ["-p", "/tmp/isinlei.zip"]);
    const rl = createInterface({ input: p.stdout });
    for await (const line of rl) {
      if (n++ < 3) head.push(line);
      const [a, b] = line.split(",").map(x => (x || "").trim().replace(/"/g, ""));
      const lei = /^[A-Z0-9]{18}[0-9]{2}$/.test(a) ? a : b, isin = lei === a ? b : a;
      if (!isin) continue;
      if (want.has(isin)) isinLei[isin] = lei;
      if (leis.has(lei) && !/^(XS|EU|QZ)/.test(isin)) { const l = leiIsin[lei] || (leiIsin[lei] = []); if (l.length < 40) l.push(isin); }
    }
    save("gleif.json", { isinLei, leiIsin }); L("gleif fini", n, "lignes,", Object.keys(isinLei).length, "ISIN Wikidata,", Object.keys(leiIsin).length, "LEI ESEF ; début :", JSON.stringify(head));
    return { isinLei, leiIsin };
  } catch (e) { L("gleif", e.message); return {}; }
}

// ---------- Listes officielles des bourses (ISIN -> symbole) ----------
async function listes() {
  const tries = [
    ["euronext_get", "https://live.euronext.com/pd_es/data/stocks/download?mics=dm_all_stock&initialLetter=&fe_type=csv&fe_decimal_separator=.&fe_date_format=d%2Fm%2FY", null],
    ["euronext_post", "https://live.euronext.com/pd_es/data/stocks/download?mics=dm_all_stock", "args%5BinitialLetter%5D=&args%5Bfe_type%5D=csv&args%5Bfe_decimal_separator%5D=.&args%5Bfe_date_format%5D=d%2Fm%2FY"],
  ];
  for (const m of ["STO", "CPH", "HEL", "ICE"]) for (const cat of ["MAIN_MARKET", "FIRST_NORTH"]) tries.push(["nordic_" + m + "_" + cat, `https://api.nasdaq.com/api/nordic/screener/shares?category=${cat}&tableonly=false&market=${m}`, null]);
  for (const [k, url, body] of tries) {
    try {
      const r = await fetch(url, { method: body ? "POST" : "GET", body: body || undefined, headers: { "user-agent": BROWSER, accept: "*/*", ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, signal: AbortSignal.timeout(90e3) });
      const t = await r.text(); L("liste", k, r.status, t.length, JSON.stringify(t.slice(0, 200)));
      if (r.ok && t.length > 2000) writeFileSync(DIR + "liste_" + k + (t.trim().startsWith("{") ? ".json" : ".csv"), t);
    } catch (e) { L("liste", k, e.message); }
    await sleep(1500);
  }
}

// ---------- OpenFIGI : ISIN -> cotations (bourse, symbole, type de titre) ----------
async function figi(isins) {
  const F = load("figi.json", {}), todo = isins.filter(i => !(i in F));
  L("figi à lire", todo.length, "déjà", Object.keys(F).length);
  for (let i = 0; i < todo.length && Date.now() - T0 < 14.3 * 60e3; i += 10) {
    const part = todo.slice(i, i + 10);
    const r = await fetch("https://api.openfigi.com/v3/mapping", { method: "POST", headers: { "user-agent": UA, "content-type": "application/json" }, body: JSON.stringify(part.map(v => ({ idType: "ID_ISIN", idValue: v }))), signal: AbortSignal.timeout(60e3) }).catch(() => null);
    if (!r || r.status === 429) { L("figi", r ? 429 : "err", r && r.headers.get("ratelimit-reset")); await sleep(20e3); i -= 10; continue; }
    if (!r.ok) { L("figi", r.status, (await r.text()).slice(0, 200)); await sleep(5e3); continue; }
    const j = await r.json();
    j.forEach((res, k) => { F[part[k]] = (res.data || []).filter(d => d.marketSector === "Equity").map(d => [d.exchCode, d.ticker, d.securityType, d.name, d.securityType2]); });
    if ((i / 10) % 25 === 0) { save("figi.json", F); L("figi", Object.keys(F).length); }
    await sleep(2500);
  }
  save("figi.json", F); L("figi fini", Object.keys(F).length);
}

const fin = () => writeFileSync("data/diag/out.json", JSON.stringify({ auto1: log }, null, 1));
setTimeout(() => { L("arrêt forcé"); fin(); process.exit(0); }, 15.3 * 60e3).unref();
const W = load("wd.json", {}), E = load("esef.json", {});
const U = (await import("../univers.mjs")).default, hi = new Set(U.map(c => c.isin).filter(Boolean));
// ISIN européens de Wikidata absents de la liste : d'abord ceux qui ont des rapports ESEF, puis par notoriété
const sl = o => +(o.sl || 0), esefL = new Set(Object.keys(E));
const wdEu = Object.values(W).filter(o => o.isin && !o.dead && o.web && !o.isin.some(i => hi.has(i)) && o.isin.some(i => EU.has(i.slice(0, 2))))
  .sort((a, b) => ((b.lei || []).some(l => esefL.has(l)) - (a.lei || []).some(l => esefL.has(l))) || sl(b) - sl(a));
const [G] = await Promise.all([gleif(W, E), listes()]);
const prio = [], seen = new Set(), add = i => { if (i && !seen.has(i) && !hi.has(i)) { seen.add(i); prio.push(i); } };
wdEu.filter(o => (o.lei || []).some(l => esefL.has(l)) || o.isin.some(i => G.isinLei && esefL.has(G.isinLei[i]))).forEach(o => o.isin.filter(i => EU.has(i.slice(0, 2))).slice(0, 2).forEach(add));
for (const [lei, l] of Object.entries((G && G.leiIsin) || {})) { const c = (E[lei] || {}).c; const s = l.filter(i => /^[A-Z]{2}/.test(i)).sort((a, b) => (b.slice(0, 2) === c) - (a.slice(0, 2) === c)); if (s.length <= 6) s.slice(0, 3).forEach(add); }
wdEu.forEach(o => o.isin.filter(i => EU.has(i.slice(0, 2))).slice(0, 1).forEach(add));
L("figi priorités", prio.length);
await figi(prio);
fin();
