// Historique officiel des ETF (3/11/2026) : la valeur de chaque fonds jour par jour, publiée par son émetteur, pour tracer
// la courbe et calculer la performance sur 1, 3, 5 et 10 ans (dividendes réinvestis).
//   node data/etf_historique.mjs                 tous les ETF des émetteurs pris en charge
//   node data/etf_historique.mjs --id amundi-msci-world-pea --id ishares-core-msci-world
//   node data/etf_historique.mjs --emetteur Amundi --max 40
// Sources (officielles, une requête toutes les 1 à 1,5 s, comme data/etf_collecte.mjs) :
//   - Amundi : API produits d'amundietf.fr, indicateur « countervalorisedAdjustedNAV » (valeur liquidative ajustée des dividendes) ;
//   - iShares : API des pages produit d'ishares.com, composant « performance » (série « performanceData », dividendes réinvestis,
//     et performances officielles du fonds et de son indice, arrêtées à la fin du mois).
//   SPDR et Invesco : à ajouter (voir docs ; 251 ETF).
// Sorties :
//   cf/site/data/etf-hist/<id>.json : { id, src, url, devise, asOf, s: [[AAAA-MM-JJ, valeur], …] une valeur par semaine,
//     perf: { m1, m6, ytd, a1, a3, a5, a10, depuis, debut, annees: { 2025: x, … }, pireBaisse: { v, de, a } }, officiel?: { … } }
//   cf/site/data/etf-perf.json : { updated, items: { <id>: { a1, a3, a5, asOf, devise } } } pour les listes
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { http } from "./etf_lib.mjs";
import * as EM from "./etf_emetteurs.mjs";

const ROOT = new URL("../", import.meta.url).pathname, OUT = ROOT + "cf/site/data/etf-hist/";
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ids = args.reduce((a, x, i) => (x === "--id" ? [...a, args[i + 1]] : a), []), emetteur = opt("--emetteur"), max = +opt("--max") || Infinity;
const T0 = Date.now(), log = (...a) => console.log(`[${Math.round((Date.now() - T0) / 1000)} s]`, ...a);
const jour = t => new Date(t).toISOString().slice(0, 10);

// ——— Calculs à partir d'une série quotidienne [[ms, valeur], …] triée ———
export function calculs(pts) {
  pts = pts.filter(p => p[1] > 0 && isFinite(p[1])).sort((a, b) => a[0] - b[0]);
  if (pts.length < 20) return null;
  const last = pts[pts.length - 1], d0 = new Date(last[0]);
  const avant = t => { let lo = 0, hi = pts.length - 1, r = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (pts[m][0] <= t) { r = pts[m]; lo = m + 1; } else hi = m - 1; } return r; };
  const recul = (an, mois = 0) => { const d = new Date(d0); d.setUTCFullYear(d.getUTCFullYear() - an); d.setUTCMonth(d.getUTCMonth() - mois); return d.getTime(); };
  const perf = t => { if (t < pts[0][0] - 5 * 864e5) return null; const p = avant(t); return p ? last[1] / p[1] - 1 : null; };
  const r = v => v == null ? null : Math.round(v * 10000) / 10000;
  const P = { m1: r(perf(recul(0, 1))), m6: r(perf(recul(0, 6))), a1: r(perf(recul(1))), a3: r(perf(recul(3))), a5: r(perf(recul(5))), a10: r(perf(recul(10))),
    ytd: r(perf(Date.UTC(d0.getUTCFullYear(), 0, 1) - 1)), depuis: r(last[1] / pts[0][1] - 1), debut: jour(pts[0][0]) };
  // Années civiles complètes (au plus 10)
  P.annees = {};
  for (let y = d0.getUTCFullYear() - 1; y >= d0.getUTCFullYear() - 10; y--) {
    const a = avant(Date.UTC(y, 0, 1) - 1), b = avant(Date.UTC(y + 1, 0, 1) - 1);
    if (!a || !b || a[0] < Date.UTC(y - 1, 11, 20) || pts[0][0] > Date.UTC(y, 0, 10)) break;
    P.annees[y] = r(b[1] / a[1] - 1);
  }
  // Pire baisse sur 5 ans (du plus haut au plus bas qui suit)
  const t5 = recul(5); let haut = null, pire = { v: 0, de: null, a: null };
  for (const p of pts) { if (p[0] < t5) continue; if (!haut || p[1] > haut[1]) haut = p; const dd = p[1] / haut[1] - 1; if (dd < pire.v) pire = { v: r(dd), de: jour(haut[0]), a: jour(p[0]) }; }
  P.pireBaisse = pire.de ? pire : null;
  // Une valeur par semaine (la dernière de chaque semaine), 10 ans au plus
  const t10 = recul(10), sem = new Map();
  for (const p of pts) { if (p[0] < t10) continue; const d = new Date(p[0]), k = Math.floor((p[0] / 864e5 + 3) / 7); sem.set(k, p); }
  const s = [...sem.values()].map(p => [jour(p[0]), Math.round(p[1] * 10000) / 10000]);
  if (s.length && s[s.length - 1][0] !== jour(last[0])) s.push([jour(last[0]), Math.round(last[1] * 10000) / 10000]);
  return { asOf: jour(last[0]), s, perf: P };
}

// ——— Conversion en euros (taux de référence quotidiens de la BCE, historique officiel depuis 1999) ———
// Un ETF coté en euros dont le fonds est tenu en dollars évolue, pour un épargnant en euros, comme sa valeur convertie en euros.
let FXH = null;
async function fxHist() {
  if (FXH) return FXH;
  const zip = "/tmp/eurofxref-hist.zip", r = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip");
  writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  const csv = execSync(`unzip -p ${zip}`, { maxBuffer: 64e6 }).toString().trim().split("\n"), head = csv.shift().split(",").map(x => x.trim());
  FXH = {}; for (const c of head.slice(1)) if (c) FXH[c] = [];
  for (const l of csv.reverse()) { const v = l.split(","), t = Date.parse(v[0] + "T00:00:00Z"); head.forEach((c, i) => { if (i && c && v[i] && v[i] !== "N/A") FXH[c].push([t, +v[i]]); }); }
  return FXH;
}
async function enEuros(pts, devise) {
  if (!devise || devise === "EUR") return pts;
  const F = (await fxHist())[devise === "GBX" ? "GBP" : devise]; if (!F || !F.length) return null; // devise sans taux BCE : pas de série en euros
  let k = 0; const out = [];
  for (const [t, v] of pts) { while (k + 1 < F.length && F[k + 1][0] <= t) k++; if (F[k][0] > t) continue; out.push([t, v / F[k][1] * (devise === "GBX" ? 0.01 : 1)]); }
  return out;
}

// ——— Amundi ———
const AM_API = "https://www.amundietf.fr/mapi/ProductAPI/getProductsData";
async function amundi(liste) {
  const out = {};
  for (let i = 0; i < liste.length; i += 20) {
    const lot = liste.slice(i, i + 20);
    const body = { context: { countryCode: "FRA", languageCode: "fr", userProfileName: "RETAIL" }, productType: "PRODUCT", productIds: lot.map(e => e.isin), characteristics: ["ISIN", "CURRENCY"],
      historics: [{ indicator: "countervalorisedAdjustedNAV", startDate: "1000-01-01T00:00:00.000Z", endDate: "2050-01-01T00:00:00.000Z" }] };
    let j; try { j = await http(AM_API, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", accept: "application/json" }, type: "json", pause: 1200, timeout: 180e3 }); }
    catch (e) { log("amundi lot", i, e.message); continue; }
    for (const p of (j && j.products) || []) {
      const e = lot.find(x => x.isin === p.productId); if (!e) continue;
      const h = (p.historics || []).find(x => x.indicator === "countervalorisedAdjustedNAV"), dev = (p.currencies && p.currencies.CURRENCY) || e.devise || "EUR";
      const pts = await enEuros(((h && h.historicalData) || []).map(x => [x.date, +x.data]), dev); if (!pts) continue;
      const c = calculs(pts); if (!c) continue;
      out[e.id] = { id: e.id, src: "Amundi (amundietf.fr), valeur liquidative ajustée des dividendes", url: e.url || `https://www.amundietf.fr/fr/particuliers/produits/${e.isin.toLowerCase()}`, devise: "EUR", deviseFonds: dev, ...c };
    }
    log(`amundi : ${Object.keys(out).length} séries (${Math.min(i + 20, liste.length)}/${liste.length})`);
  }
  return out;
}

// ——— iShares ———
async function ishares(liste) {
  const out = {};
  let pids = {};
  try { const rows = await EM.ishares(() => { }, { detail: () => false }); for (const r of rows) if (r.isin && r.pid) pids[r.isin] = { pid: r.pid, url: r.url }; }
  catch (e) { log("ishares liste :", e.message); return out; }
  log("ishares : " + Object.keys(pids).length + " numéros de fonds");
  let n = 0;
  for (const e of liste) {
    const P = pids[e.isin]; if (!P) continue;
    const u = `https://www.ishares.com/varnish-api/uk-retail01-product-data/product-data/api/v2/get-product-data?appSubType=ISHARES&appType=PRODUCT_PAGE&component=performance&locale=en_GB&portfolioId=${P.pid}&targetSite=ishares-uk&userType=individual&excludeContent=true&asOfDate=&includeConfig=true`;
    let j; try { j = await http(u, { type: "json", headers: { accept: "application/json", "x-application-id": "pp-ui-csr" }, pause: 1200, retries: 1, timeout: 90e3 }); } catch (err) { log("ishares", e.id, err.message); continue; }
    const c0 = j && j.componentsByNameMap && j.componentsByNameMap.performance && j.componentsByNameMap.performance.containersByNameMap;
    const d = c0 && c0.chart && c0.chart.dataPointsByNameMap, pd = d && d.performanceData;
    if (!pd || !pd.value || !pd.value.length) continue;
    const ds = pd.asOfDate.map(x => { const s = String(x); return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)); });
    const devF = j.currencyCode || null, pts = await enEuros(pd.value.map((v, i) => [ds[i], +v]), devF); if (!pts) continue;
    const c = calculs(pts); if (!c) continue;
    // Performances officielles (fin de mois) : fonds et indice
    const cu = c0.returns && c0.returns.subContainersByNameMap && c0.returns.subContainersByNameMap.cumulative && c0.returns.subContainersByNameMap.cumulative.dataPointsByNameMap;
    const V = (k, i) => cu && cu[k] && cu[k].value && cu[k].value[i] != null && cu[k].value[i] !== "" ? Math.round(+cu[k].value[i] * 100) / 10000 : null;
    const dl = cu && cu.dateList && cu.dateList.value && String(cu.dateList.value[0]);
    const officiel = cu ? { asOf: dl ? `${dl.slice(0, 4)}-${dl.slice(4, 6)}-${dl.slice(6, 8)}` : null, fonds: { a1: V("oneYear", 0), a3: V("threeYear", 0), a5: V("fiveYear", 0), a10: V("tenYear", 0) }, indice: { a1: V("oneYear", 1), a3: V("threeYear", 1), a5: V("fiveYear", 1), a10: V("tenYear", 1) } } : null;
    out[e.id] = { id: e.id, src: "iShares (ishares.com), performance dividendes réinvestis" + (devF && devF !== "EUR" ? `, convertie en euros au taux de la BCE (fonds tenu en ${devF})` : ""), url: P.url || null, devise: "EUR", deviseFonds: devF, ...c, ...(officiel ? { officiel: { ...officiel, devise: devF } } : {}) };
    if (++n % 25 === 0) log(`ishares : ${n} séries`);
  }
  return out;
}

// ——— Programme ———
if (process.argv[1] && /etf_historique\.mjs$/.test(process.argv[1])) {
  const L = JSON.parse(readFileSync(ROOT + "cf/site/data/etf.json", "utf8")).list;
  let choix = L.filter(e => e.isin && (!ids.length || ids.includes(e.id)) && (!emetteur || e.issuer === emetteur));
  const parEm = em => choix.filter(e => e.issuer === em).slice(0, max);
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const res = { ...(await amundi(parEm("Amundi"))), ...(await ishares(parEm("iShares"))) };
  for (const [id, r] of Object.entries(res)) writeFileSync(OUT + id + ".json", JSON.stringify(r));
  // Index des performances pour les listes (fusion avec l'existant : un passage partiel ne retire rien)
  const IDX = ROOT + "cf/site/data/etf-perf.json"; let idx = { items: {} }; try { idx = JSON.parse(readFileSync(IDX, "utf8")); } catch (e) { }
  for (const [id, r] of Object.entries(res)) idx.items[id] = { a1: r.perf.a1, a3: r.perf.a3, a5: r.perf.a5, asOf: r.asOf, devise: r.devise };
  idx.updated = new Date().toISOString().slice(0, 10);
  writeFileSync(IDX, JSON.stringify(idx));
  const tot = L.filter(e => ["Amundi", "iShares"].includes(e.issuer)).length;
  log(`${Object.keys(res).length} séries écrites (${Object.keys(idx.items).length} dans l'index, ${tot} ETF Amundi et iShares au total)`);
}
