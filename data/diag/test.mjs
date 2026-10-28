// Diagnostic : collecte brute pour élargir la liste des entreprises (lot auto1), étape 4 (suite OpenFIGI, durée de lecture des comptes).
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

// ---------- Durée de lecture des comptes (mêmes fonctions que le bot) sur un échantillon ----------
const SAMPLE = {"e":[{"id":"norwegian-air-shuttle","name":"Norwegian Air Shuttle","isin":"NO0010196140","lei":"549300IEUH2FEM2Y6B51"},{"id":"finnair","name":"Finnair","isin":"FI4000567029","lei":"213800SB6EOB8SSK9W63"},{"id":"volvo-cars","name":"Volvo Cars","isin":"SE0021628898","lei":"5299000EAMGGBEYP7J33"},{"id":"piaggio","name":"Piaggio","isin":"IT0003073266","lei":"8156000256C2431C2E92"},{"id":"opera-software","name":"Opera Software","isin":"NO0010040611","lei":"391200EWTTF186UWWH07"},{"id":"fincantieri","name":"Fincantieri","isin":"IT0005599938","lei":"8156005BDF49128B6239"},{"id":"bang-and-olufsen","name":"Bang & Olufsen","isin":"DK0010218429","lei":"52990018KGR3ILFDNJ20"},{"id":"marimekko","name":"Marimekko","isin":"FI0009007660","lei":"74370053IOY42B9YJ350"},{"id":"cvc-capital-partners","name":"CVC Capital Partners","isin":"JE00BRX98089","lei":"213800E8UQS1KA32YD39"},{"id":"outokumpu","name":"Outokumpu","isin":"FI0009002422","lei":"5493009YRUJJDCFF0R80"},{"id":"sanoma","name":"Sanoma","isin":"FI0009007694","lei":"743700XJC24THUPK0S03"},{"id":"konecranes","name":"Konecranes","isin":"FI0009005870","lei":"549300EF0CDEQZBMA096"},{"id":"aker-solutions","name":"Aker Solutions","isin":"NO0010716582","lei":"5967007LIEEXZXG42836"},{"id":"yit","name":"YIT","isin":"FI0009800643","lei":"529900M13GM4VSTE6W80"},{"id":"starbreeze-studios","name":"Starbreeze Studios","isin":"SE0005992831","lei":"213800T68IVZFR868L42"},{"id":"postnl","name":"PostNL","isin":"NL0009739416","lei":"724500Q41FHN0P1GPC53"},{"id":"nordic-semiconductor","name":"Nordic Semiconductor","isin":"NO0003055501","lei":"5967007LIEEXZXJGFK95"},{"id":"avio","name":"Avio","isin":"IT0005119810","lei":"8156008F25C4B0E7C860"},{"id":"barco","name":"Barco","isin":"BE0974362940","lei":"549300N17QCD827TII61"},{"id":"bpost","name":"bpost","isin":"BE0974268972","lei":"5493008AAX0BESN9WN06"},{"id":"scandic","name":"Scandic","isin":"SE0007640156","lei":"529900JY9ZBGUXGRKQ86"},{"id":"mediobanca","name":"Mediobanca","isin":"IT0000062957","lei":"PSNL19R2RXX5U3QWHI44"},{"id":"orron-energy","name":"Orrön Energy","isin":"SE0000825820","lei":"549300IULC8F8IGXKI15"},{"id":"viaplay-group","name":"Viaplay Group","isin":"SE0012116390","lei":"5493006E0IJD0DHJSR89"}],"s":[{"id":"archer-daniels-midland","name":"Archer Daniels Midland","sec":"ADM","cik":"0000007084"},{"id":"jones-lang-lasalle","name":"Jones Lang LaSalle","sec":"JLL","cik":"0001037976"},{"id":"dominion-energy","name":"Dominion Energy","sec":"D","cik":"0000715957"},{"id":"gxo-logistics","name":"GXO Logistics","sec":"GXO","cik":"0001852244"},{"id":"eldorado-resorts","name":"Eldorado Resorts","sec":"CZR","cik":"0001590895"},{"id":"altice-usa","name":"Altice USA","sec":"OPTU","cik":"0001702780"},{"id":"watsco","name":"Watsco","sec":"WSO","cik":"0000105016"},{"id":"insperity","name":"Insperity","sec":"NSP","cik":"0001000753"},{"id":"urban-outfitters","name":"Urban Outfitters","sec":"URBN","cik":"0000912615"},{"id":"ares-management","name":"Ares Management","sec":"ARES","cik":"0001176948"},{"id":"under-armour","name":"Under Armour","sec":"UAA","cik":"0001336917"},{"id":"five-below","name":"Five Below","sec":"FIVE","cik":"0001177609"},{"id":"heico","name":"HEICO","sec":"HEI","cik":"0000046619"},{"id":"skyworks-solutions","name":"Skyworks Solutions","sec":"SWKS","cik":"0000004127"},{"id":"diebold-nixdorf","name":"Diebold Nixdorf","sec":"DBD","cik":"0000028823"},{"id":"the-scotts-miracle-gro-company","name":"The Scotts Miracle-Gro Company","sec":"SMG","cik":"0000825542"},{"id":"old-national-bank","name":"Old National Bank","sec":"ONB","cik":"0000707179"},{"id":"hubspot","name":"HubSpot","sec":"HUBS","cik":"0001404655"},{"id":"globus-medical","name":"Globus Medical","sec":"GMED","cik":"0001237831"},{"id":"sabre-holdings","name":"Sabre Holdings","sec":"SABR","cik":"0001597033"},{"id":"acushnet-company","name":"Acushnet Company","sec":"GOLF","cik":"0001672013"},{"id":"new-fortress-energy","name":"New Fortress Energy","sec":"NFE","cik":"0001749723"},{"id":"graco","name":"Graco","sec":"GGG","cik":"0000042888"},{"id":"papa-johns-pizza","name":"Papa John's Pizza","sec":"PZZA","cik":"0000901491"}]};
async function timing() {
  const { collectOne, pool } = await import("../fetch_data.mjs");
  const res = {};
  for (const [k, list, n] of [["esef", SAMPLE.e, 3], ["sec", SAMPLE.s, 5]]) {
    const t0 = Date.now(), one = [];
    await pool(list, n, async c => { const t = Date.now(); try { const r = await collectOne(fetch, { ...c, region: "EU", sector: "industrie", domain: "x", desc: "x", tv: "X:X", ticker: "X" }); one.push([c.id, Math.round((Date.now() - t) / 100) / 10, (r.years || []).length]); } catch (e) { one.push([c.id, Math.round((Date.now() - t) / 100) / 10, "ÉCHEC " + e.message.slice(0, 80)]); } if (k === "sec") await sleep(150); });
    res[k] = { n: list.length, secondes: Math.round((Date.now() - t0) / 1000), parSociete: one };
    L("durée", k, list.length, "sociétés en", res[k].secondes, "s");
  }
  save("timing.json", res);
}

const fin = () => writeFileSync("data/diag/out.json", JSON.stringify({ auto1: log }, null, 1));
setTimeout(() => { L("arrêt forcé"); fin(); process.exit(0); }, 15.3 * 60e3).unref();
const W = load("wd.json", {}), E = load("esef.json", {});
const U = (await import("../univers.mjs")).default, hi = new Set(U.map(c => c.isin).filter(Boolean));
// ISIN européens de Wikidata absents de la liste : d'abord ceux qui ont des rapports ESEF, puis par notoriété
const sl = o => +(o.sl || 0), esefL = new Set(Object.keys(E));
const wdEu = Object.values(W).filter(o => o.isin && !o.dead && o.web && !o.isin.some(i => hi.has(i)) && o.isin.some(i => EU.has(i.slice(0, 2))))
  .sort((a, b) => ((b.lei || []).some(l => esefL.has(l)) - (a.lei || []).some(l => esefL.has(l))) || sl(b) - sl(a));
const G = load("gleif.json", {}); const TM = timing().catch(e => L("durée", e.message));
const prio = [], seen = new Set(), add = i => { if (i && !seen.has(i) && !hi.has(i)) { seen.add(i); prio.push(i); } };
wdEu.filter(o => (o.lei || []).some(l => esefL.has(l)) || o.isin.some(i => G.isinLei && esefL.has(G.isinLei[i]))).forEach(o => o.isin.filter(i => EU.has(i.slice(0, 2))).slice(0, 2).forEach(add));
for (const [lei, l] of Object.entries((G && G.leiIsin) || {})) { const c = (E[lei] || {}).c; const s = l.filter(i => /^[A-Z]{2}/.test(i)).sort((a, b) => (b.slice(0, 2) === c) - (a.slice(0, 2) === c)); if (s.length <= 6) s.slice(0, 3).forEach(add); }
wdEu.forEach(o => o.isin.filter(i => EU.has(i.slice(0, 2))).slice(0, 1).forEach(add));
L("figi priorités", prio.length);
await Promise.all([figi(prio), TM]);
fin();
