// Valeurs liquidatives officielles des ETF (4/11/2026).
// Les feuilles Google (GOOGLEFINANCE) ne donnent un cours qu'à une petite partie des ETF (83 sur 1 174 le 4/11).
// Pour les autres, le robot des cours (data/cours_fetch.mjs) prend la valeur liquidative publiée par l'émetteur :
// le prix d'une part calculé chaque soir par le fonds, très proche du cours en Bourse. Elle est datée et marquée `vl`,
// pour que le site dise « valeur liquidative du … » et ne la fasse jamais passer pour un cours en direct.
//   node data/etf_vl.mjs            → affiche ce qui est trouvé (test)
import { http } from "./etf_lib.mjs";

const AM_API = "https://www.amundietf.fr/mapi/ProductAPI/getProductsData";
const jour = t => new Date(t).toISOString().slice(0, 10);

// Amundi : par paquets de 20 fonds, la valeur liquidative (characteristics NAV, dans la devise de la part)
// et les dix derniers jours de la série ajustée des dividendes (date de la valeur et variation du jour).
export async function vlAmundi(etfs, log = () => { }) {
  const out = {}, L = etfs.filter(e => e.issuer === "Amundi" && e.isin);
  const debut = new Date(Date.now() - 12 * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
  for (let i = 0; i < L.length; i += 20) {
    const lot = L.slice(i, i + 20);
    const body = { context: { countryCode: "FRA", languageCode: "fr", userProfileName: "RETAIL" }, productType: "PRODUCT", productIds: lot.map(e => e.isin), characteristics: ["ISIN", "CURRENCY", "NAV"],
      historics: [{ indicator: "countervalorisedAdjustedNAV", startDate: debut, endDate: "2050-01-01T00:00:00.000Z" }] };
    let j; try { j = await http(AM_API, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", accept: "application/json" }, type: "json", pause: 1000, timeout: 60e3 }); }
    catch (e) { log("amundi lot " + i + " : " + e.message); continue; }
    for (const p of (j && j.products) || []) {
      const e = lot.find(x => x.isin === p.productId), ch = p.characteristics || {}; if (!e) continue;
      const vl = +ch.NAV, cur = ch.CURRENCY || (p.currencies || {}).CURRENCY; if (!(vl > 0) || !cur) continue;
      const h = ((p.historics || [])[0] || {}).historicalData || [], pts = h.filter(x => x && x.data > 0).sort((a, b) => a.date - b.date);
      if (!pts.length) continue; // pas de date : on ne publie pas une valeur sans savoir de quel jour elle est
      const a = pts[pts.length - 1], b = pts[pts.length - 2];
      const d = jour(a.date); if ((Date.now() - a.date) / 864e5 > 8) continue; // valeur trop ancienne
      out["e:" + e.id] = { s: "VL", cur, p: vl, chg: b ? Math.round((a.data / b.data - 1) * 10000) / 100 : null, d, vl: 1, src: "Amundi" };
    }
  }
  log("amundi : " + Object.keys(out).length + " valeurs liquidatives sur " + L.length + " fonds");
  return out;
}

// iShares : la liste de blackrock.com/fr donne, en une seule demande, la valeur liquidative de chaque part et sa date.
export async function vlIshares(etfs, log = () => { }) {
  const out = {}, par = new Map(etfs.filter(e => e.issuer === "iShares" && e.isin).map(e => [e.isin, e])); if (!par.size) return out;
  const j = await http("https://www.blackrock.com/fr/intermediaries/products/product-list/1524727817804.ajax?tab=all&fileType=json", { type: "json", pause: 1500, timeout: 180e3 });
  const I = Object.fromEntries(j.columns.map((c, i) => [c.name, i])), v = (r, k) => { const x = r[I[k]]; return x && typeof x === "object" && "r" in x ? x.r : x === "-" ? null : x; };
  for (const r of j.data) {
    const e = par.get(v(r, "isin")); if (!e) continue;
    const p = +v(r, "navAmount"), d = String(v(r, "navAmountAsOf") || ""), cur = v(r, "seriesBaseCurrencyCode");
    if (!(p > 0) || !/^\d{8}$/.test(d) || !cur) continue;
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`; if ((Date.now() - Date.parse(iso)) / 864e5 > 8) continue;
    out["e:" + e.id] = { s: "VL", cur, p, chg: null, d: iso, vl: 1, src: "iShares" };
  }
  log("ishares : " + Object.keys(out).length + " valeurs liquidatives sur " + par.size + " fonds");
  return out;
}

// SPDR : l'outil de recherche de ssga.com (une seule demande) donne la valeur liquidative (« $10,86 ») et sa date (asOfDate).
export async function vlSpdr(etfs, log = () => { }) {
  const out = {}, par = new Map(etfs.filter(e => e.issuer === "SPDR" && e.isin).map(e => [e.isin, e])); if (!par.size) return out;
  const j = await http("https://www.ssga.com/bin/v1/ssmp/fund/fundfinder?country=fr&language=fr&role=intermediary&product=etfs&ui=fund-finder", { type: "json", pause: 1500, timeout: 120e3 });
  const DEV = { "$": "USD", "€": "EUR", "£": "GBP", "CHF": "CHF", "¥": "JPY" };
  for (const r of j.data.funds.etfs.datas) {
    const docs = JSON.stringify(r.documentPdf || []), isin = (docs.match(/isin=([A-Z]{2}[A-Z0-9]{10})/) || (r.keywords || "").match(/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/) || [])[1];
    const e = par.get(isin); if (!e) continue;
    const m = String(r.nav || "").match(/^\s*(\$|€|£|¥|CHF)\s?([\d\s.\u202f\u00a0]+,\d+|[\d.]+)/); if (!m) continue;
    const p = +m[2].replace(/[\s.\u202f\u00a0](?=\d{3}(\D|$))/g, "").replace(",", "."), d = (r.asOfDate || [])[1];
    if (!(p > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d || "") || (Date.now() - Date.parse(d)) / 864e5 > 8) continue;
    out["e:" + e.id] = { s: "VL", cur: DEV[m[1]], p, chg: null, d, vl: 1, src: "SPDR" };
  }
  log("spdr : " + Object.keys(out).length + " valeurs liquidatives sur " + par.size + " fonds");
  return out;
}

// Invesco : statistiques clés de chaque part (dng-api.invesco.com, service déjà lu par data/etf_emetteurs.mjs) : nav + asOfDate + devise.
export async function vlInvesco(etfs, log = () => { }) {
  const out = {}, L = etfs.filter(e => e.issuer === "Invesco" && e.isin);
  for (const e of L) {
    const j = await http(`https://dng-api.invesco.com/cache/v1/accounts/fr_FR/shareclasses/${e.isin}/keyStats?idType=isin&productCode=ETF&bondType=NotCallable`, { type: "json", pause: 600, retries: 1, timeout: 30e3 }).catch(() => null);
    const k = j && (j.keyStats || []).find(x => x.name === "nav"); if (!k || !(k.value > 0) || !j.currency || !/^\d{4}-\d{2}-\d{2}$/.test(k.asOfDate || "")) continue;
    if ((Date.now() - Date.parse(k.asOfDate)) / 864e5 > 8) continue;
    out["e:" + e.id] = { s: "VL", cur: j.currency, p: Math.round(k.value * 10000) / 10000, chg: null, d: k.asOfDate, vl: 1, src: "Invesco" };
  }
  log("invesco : " + Object.keys(out).length + " valeurs liquidatives sur " + L.length + " fonds");
  return out;
}

// Une part dont la valeur est publiée dans une autre devise (dollar…) est convertie en euros au taux de la BCE (fx.json) :
// les ETF suivis cotent en euros à Paris, Amsterdam ou Francfort, et le prix de revient saisi est en euros.
export async function valeursLiquidatives(etfs, log = console.log) {
  const out = {};
  try { Object.assign(out, await vlAmundi(etfs, log)); } catch (e) { log("::warning::Amundi : " + e.message); }
  try { Object.assign(out, await vlIshares(etfs, log)); } catch (e) { log("::warning::iShares : " + e.message); }
  try { Object.assign(out, await vlSpdr(etfs, log)); } catch (e) { log("::warning::SPDR : " + e.message); }
  try { Object.assign(out, await vlInvesco(etfs, log)); } catch (e) { log("::warning::Invesco : " + e.message); }
  let fx = {}; try { const { readFileSync } = await import("node:fs"); fx = JSON.parse(readFileSync(new URL("../cf/site/data/fx.json", import.meta.url))).eur || {}; } catch (e) { }
  for (const [k, x] of Object.entries(out)) {
    if (x.cur === "EUR") continue;
    const t = fx[x.cur === "GBp" || x.cur === "GBX" ? "GBP" : x.cur], div = x.cur === "GBp" || x.cur === "GBX" ? 100 : 1;
    if (!(t > 0)) { delete out[k]; continue; }
    Object.assign(x, { p: Math.round(x.p / div * t * 10000) / 10000, curFonds: x.cur, cur: "EUR", conv: "BCE" });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const L = JSON.parse(readFileSync(new URL("../cf/site/data/etf.json", import.meta.url))).list;
  const r = await valeursLiquidatives(L);
  for (const k of ["e:amundi-pea-s-and-p-500-screened-acc", "e:amundi-cac-40-acc", "e:ishares-core-msci-world", "e:" + (L.find(e => e.issuer === "SPDR") || {}).id]) console.log(k, JSON.stringify(r[k]));
}
