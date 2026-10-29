// Lecture des catalogues officiels des émetteurs d'ETF. Chaque fonction rend une liste de parts au même format :
// { isin, name, issuer, ter, aumM (millions, devise aumCur), aumCur, devise, creation, domicile, distribution, replication, methode,
//   indexOfficiel, pea (true/false/null), classe, listings: [{ place, ticker, devise }], url, ref (de quoi lire la composition) }
// Sources (toutes publiques, sur les sites des émetteurs) :
//   Amundi   : plan du site amundietf.fr + l'interface de données de ses fiches produit (mapi/ProductAPI/getProductsData)
//   iShares  : liste des produits de blackrock.com/fr (fichier de la liste des produits) + fiche produit de chaque fonds
//   SPDR     : outil de recherche de fonds de ssga.com (France) + fiche produit
//   Invesco  : plan du site invesco.com/fr + interface de données des fiches (dng-api.invesco.com)
import { http, num, isoDate, unesc } from "./etf_lib.mjs";

const PLACE_BBG = { FP: "Euronext Paris", PA: "Euronext Paris", NA: "Euronext Amsterdam", GY: "Xetra", GR: "Francfort", IM: "Borsa Italiana", LN: "Londres", SW: "SIX", SE: "SIX", BB: "Euronext Bruxelles", SM: "Madrid", ID: "Dublin", PL: "Lisbonne", AV: "Vienne", SS: "Stockholm" };
export const placeDeBbg = code => { const m = String(code || "").trim().match(/^(\S+)\s+([A-Z]{2})$/); return m ? { ticker: m[1], place: PLACE_BBG[m[2]] || m[2], bbg: m[2] } : null; };
const placeDeNom = s => { const t = String(s || "").toLowerCase();
  return /paris/.test(t) ? "Euronext Paris" : /amsterdam/.test(t) ? "Euronext Amsterdam" : /xetra|deutsche b|frankfurt|francfort/.test(t) ? "Xetra" : /milan|italiana/.test(t) ? "Borsa Italiana" : /london|londres|lse/.test(t) ? "Londres" : /six|swiss/.test(t) ? "SIX" : /brussel|bruxelles/.test(t) ? "Euronext Bruxelles" : s; };
const repl = s => { const t = String(s || "").toLowerCase();
  if (/swap|synth|indirect/.test(t)) return ["synthétique", "swap"];
  if (/optimi|sampl|échantill|echantill/.test(t)) return ["physique", "échantillonnée"];
  if (/phys|full|complète|complete|direct|réplication|replication/.test(t)) return ["physique", "complète"];
  return [null, null]; };
const distrib = s => /dist|distribu|income|inc\b|revenu|versé|verse|quarterly|semi|annual|trimes|annuel|mensuel|monthly/i.test(s || "") ? "distribution" : /acc|capi|réinvest|reinvest/i.test(s || "") ? "capitalisation" : null;

// ---------------------------------------------------------------- Amundi
const AM_CHAR = ["ISIN", "SHARE_MARKETING_NAME", "TER", "FUND_PEA", "MNEMO", "DISTRIBUTION_POLICY", "LAUNCH_DATE", "FUND_REPLICATION_METHODOLOGY", "FUND_DOMICILIATION_COUNTRY", "CURRENCY", "AUM", "FUND_AUM_IN_EURO", "BENCHMARK_NAME", "ASSET_CLASS", "BENCHMARK_NUMBER_OF_COMPONENTS", "CURRENCY_HEDGE", "FUND_SWAP_COUNTERPART", "LISTINGS", "FUND_SAMPLING", "IS_THEMATIC"];
const AM_BD = ["INDEX_TOP10", "INDEX_SECTORS", "INDEX_COUNTRIES", "FUND_TOP10", "FUND_SECTORS", "FUND_COUNTRIES"];
const AM_API = "https://www.amundietf.fr/mapi/ProductAPI/getProductsData";
const amPost = body => http(AM_API, { method: "POST", body: JSON.stringify({ context: { countryCode: "FRA", languageCode: "fr", userProfileName: "RETAIL" }, productType: "PRODUCT", ...body }), headers: { "content-type": "application/json", accept: "application/json" }, type: "json", pause: 1200 });
export async function amundi(log) {
  const sm = await http("https://www.amundietf.fr/sitemap/sitemap.xml", { pause: 1000 });
  const urls = {};
  for (const m of sm.matchAll(/<loc>(https:\/\/www\.amundietf\.fr\/fr\/professionnels\/produits\/[^<]+\/([a-z]{2}[0-9a-z]{10}))<\/loc>/g)) urls[m[2].toUpperCase()] = m[1].replace("/professionnels/produits/", "/particuliers/produits/");
  const isins = Object.keys(urls); log("amundi : " + isins.length + " parts dans le plan du site");
  const out = [];
  for (let i = 0; i < isins.length; i += 20) {
    const part = isins.slice(i, i + 20);
    let j; try { j = await amPost({ productIds: part, characteristics: AM_CHAR, breakDown: { aggregationFields: AM_BD } }); } catch (e) { log("amundi lot " + i + " : " + e.message); continue; }
    for (const p of (j && j.products) || []) {
      const c = p.characteristics || {}; if (!c.ISIN) continue;
      const [replication, methode0] = repl(c.FUND_REPLICATION_METHODOLOGY);
      const bd = {}; for (const b of p.breakDowns || []) bd[b.aggregationField] = b.breakDownData.map(x => ({ n: x.aggregationName, w: x.adjustedWeight || x.weight, isin: x.additionalProperties && x.additionalProperties.isin, pays: x.additionalProperties && x.additionalProperties.countryOfRisk, sect: x.additionalProperties && x.additionalProperties.sector }));
      const listings = (Array.isArray(c.LISTINGS) ? c.LISTINGS : []).map(l => { const b = placeDeBbg(l.ticker); return b ? { place: b.place, ticker: b.ticker, devise: l.tradingCurrency, principal: l.mainListing === "true" } : null; }).filter(Boolean);
      out.push({ isin: c.ISIN, name: c.SHARE_MARKETING_NAME, issuer: "Amundi", ter: num(c.TER), aumM: c.AUM ? c.AUM / 1e6 : null, aumCur: c.CURRENCY || "EUR", fondsM: c.FUND_AUM_IN_EURO ? c.FUND_AUM_IN_EURO / 1e6 : null,
        devise: c.CURRENCY, creation: isoDate(c.LAUNCH_DATE), domicile: c.FUND_DOMICILIATION_COUNTRY, distribution: distrib(c.DISTRIBUTION_POLICY), replication, methode: replication === "physique" ? (c.FUND_SAMPLING ? "échantillonnée" : "complète") : methode0,
        indexOfficiel: c.BENCHMARK_NAME, nIndex: c.BENCHMARK_NUMBER_OF_COMPONENTS || null, pea: c.FUND_PEA === true ? true : c.FUND_PEA === false ? false : null, classe: c.ASSET_CLASS, couvert: !!c.CURRENCY_HEDGE,
        contrepartie: c.FUND_SWAP_COUNTERPART || null, listings, mnemo: c.MNEMO, url: urls[c.ISIN], ref: { type: "amundi", bd } });
    }
    if (i % 200 === 0) log(`amundi : ${out.length} lues`);
  }
  return out;
}
// Composition complète d'un fonds Amundi (positions réelles, utile pour les fonds à réplication physique)
export async function amundiPositions(isin) {
  const j = await amPost({ productIds: [isin], characteristics: ["ISIN"], composition: { compositionFields: ["date", "type", "isin", "name", "weight", "sector", "countryOfRisk", "currency"] } });
  const c = j && j.products && j.products[0] && j.products[0].composition; if (!c) return null;
  const lines = (c.compositionData || []).map(x => x.compositionCharacteristics || {}).map(x => ({ name: x.name, isin: x.isin, w: (x.weight || 0) * 100, pays: x.countryOfRisk, sect: x.sector, type: x.type, date: x.date }));
  return { n: c.totalNumberOfInstruments || lines.length, asOf: (lines.find(l => l.date) || {}).date || null, lines };
}

// ---------------------------------------------------------------- iShares (BlackRock France)
const BR = "https://www.blackrock.com";
export async function ishares(log, { detail = r => true } = {}) {
  const j = await http(BR + "/fr/intermediaries/products/product-list/1524727817804.ajax?tab=all&fileType=json", { type: "json", pause: 1500, timeout: 180e3 });
  const cols = j.columns.map(c => c.name), I = Object.fromEntries(cols.map((c, i) => [c, i]));
  const v = (r, k) => { const x = r[I[k]]; return x && typeof x === "object" && "r" in x ? x.r : x === "-" ? null : x; };
  const rows = j.data.filter(r => (v(r, "productView") || []).includes("ishares") && /\bET[FC]\b/.test(v(r, "fundName") || ""));
  log("ishares : " + rows.length + " parts d'ETF dans la liste de blackrock.com/fr");
  const out = [];
  for (const r of rows) {
    const rec = { isin: v(r, "isin"), name: v(r, "fundSeriesName") || v(r, "fundName"), issuer: "iShares", ter: v(r, "onGoingCharges"), aumM: v(r, "totalFundSizeInMillions"), aumCur: null, devise: v(r, "seriesBaseCurrencyCode"),
      creation: isoDate(v(r, "inceptionDate")), domicile: v(r, "domicile"), distribution: distrib(v(r, "useOfProfits")), classe: v(r, "aladdinAssetClass"), pid: v(r, "portfolioId"), url: BR + v(r, "productPageUrl"), ticker0: v(r, "localExchangeTicker") };
    if (!rec.isin || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(rec.isin)) continue;
    out.push(rec);
  }
  // Fiche produit (indice, réplication, PEA, cotations) pour les parts retenues
  let n = 0;
  for (const rec of out) {
    if (!detail(rec)) continue;
    try { Object.assign(rec, await isharesFiche(rec.url)); n++; } catch (e) { log("ishares fiche " + rec.isin + " : " + e.message); }
    if (n % 50 === 0) log(`ishares : ${n} fiches lues`);
  }
  return out;
}
export async function isharesFiche(url) {
  const t = await http(url, { pause: 1000 }); if (!t) return {};
  const K = {};
  for (const m of t.matchAll(/<div class="product-data-item col-(\w+)\s*">([\s\S]*?)<div class="data">\s*([\s\S]*?)\s*<\/div>/g)) K[m[1]] = unesc(m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  const listings = [];
  const tb = t.split('class="colExchange"').slice(1);
  for (const row of tb) {
    const cell = k => { const m = row.match(new RegExp(`class="${k}">\\s*([^<]*?)\\s*</td>`)); return m ? unesc(m[1]) : null; };
    const ex = (row.match(/^>\s*([^<]*?)\s*<\/td>/) || [])[1];
    const b = placeDeBbg(cell("colBBEQTICK"));
    if (b) listings.push({ place: b.place, ticker: cell("colTicker") || b.ticker, devise: cell("colCurrencyCode") });
    else if (ex) listings.push({ place: placeDeNom(ex), ticker: cell("colTicker"), devise: cell("colCurrencyCode") });
  }
  const hold = (t.match(/\/fr\/intermediaries\/products\/\d+\/fund\/(\d+)\.ajax\?tab=all&(?:amp;)?fileType=json/) || [])[0];
  const [replication, methode] = repl((K.productStructure || "") + " " + (K.fundMethodologyTypeCode || ""));
  const aum = K.totalNetAssetsFundLevel || K.totalNetAssets || "";
  return { indexOfficiel: K.indexSeriesName || null, replication, methode: replication === "synthétique" ? "swap" : /optimi|échantil|sampl/i.test(K.fundMethodologyTypeCode || "") ? "échantillonnée" : replication ? "complète" : null,
    pea: K.peaFlag ? /oui|yes/i.test(K.peaFlag) : null, ter: num(K.emeaMgt) ?? undefined, aumM: num(aum) ? num(aum) / 1e6 : undefined, aumCur: (aum.match(/^[A-Z]{3}/) || [])[0] || null, devise: K.seriesBaseCurrencyCode || undefined,
    nLignes: num(K.numHoldings), listings, holdUrl: hold ? BR + hold.replace(/&amp;/g, "&") : null, ref: { type: "ishares" } };
}
// Positions d'un fonds iShares : interface du site britannique (avec ISIN) si le fonds y est vendu, sinon le fichier du site français
export async function isharesPositions(rec) {
  if (rec.pid) {
    try {
      const u = `https://www.ishares.com/varnish-api/uk-retail01-product-data/product-data/api/v2/get-product-data?appSubType=ISHARES&appType=PRODUCT_PAGE&component=holdings&locale=en_GB&portfolioId=${rec.pid}&targetSite=ishares-uk&userType=individual&excludeContent=true&asOfDate=&includeConfig=true`;
      const j = await http(u, { type: "json", headers: { accept: "application/json", "x-application-id": "pp-ui-csr" }, pause: 1200, retries: 1 });
      const d = j && j.componentsByNameMap && j.componentsByNameMap.holdings && j.componentsByNameMap.holdings.containersByNameMap.all.dataPointsByNameMap;
      if (d && d.holdingPercent && d.holdingPercent.value && d.holdingPercent.value.length) {
        const V = k => (d[k] && d[k].value) || [];
        const lines = V("holdingPercent").map((w, i) => ({ w, name: V("issueName")[i], isin: V("isin")[i], pays: V("countryOfRisk")[i], sect: V("sectorName")[i], type: V("assetClass")[i] }));
        return { asOf: isoDate(d.asOfDate && d.asOfDate.value), lines, src: "https://www.ishares.com/uk/individual/en/products/" + rec.pid + "/" };
      }
    } catch (e) { /* fonds non vendu au Royaume-Uni : on passe au fichier français */ }
  }
  if (!rec.holdUrl) return null;
  const j = await http(rec.holdUrl, { type: "json", pause: 1200 });
  if (!j || !j.aaData) return null;
  const val = x => x && typeof x === "object" ? x.raw : num(x);
  const lines = j.aaData.map(r => ({ ticker: r[0], name: r[1], sect: r[2], type: r[3], w: val(r[5]), pays: r[10], bourse: r[11] }));
  return { asOf: null, lines, src: rec.url };
}

// ---------------------------------------------------------------- SPDR (State Street)
const SS = "https://www.ssga.com";
export async function spdr(log, { detail = r => true } = {}) {
  const j = await http(SS + "/bin/v1/ssmp/fund/fundfinder?country=fr&language=fr&role=intermediary&product=etfs&ui=fund-finder", { type: "json", pause: 1500 });
  const rows = j.data.funds.etfs.datas; log("spdr : " + rows.length + " fonds dans l'outil de recherche ssga.com");
  const out = [];
  for (const r of rows) {
    const docs = JSON.stringify(r.documentPdf || []);
    const isin = (docs.match(/isin=([A-Z]{2}[A-Z0-9]{10})/) || (r.keywords || "").match(/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/) || [])[1];
    if (!isin) continue;
    const hold = (docs.match(/"path":"(\/library-content\/products\/fund-data\/etfs\/emea\/holdings-daily-[^"]+\.xlsx)"/) || [])[1];
    const aum = String(r.aum || ""), cur = aum.startsWith("$") ? "USD" : aum.startsWith("€") ? "EUR" : aum.startsWith("£") ? "GBP" : null;
    const mult = /\bMd|\bB\b|\bbn|Mrd/i.test(aum) ? 1000 : 1;
    out.push({ isin, name: r.fundName, issuer: "SPDR", ter: r.ter && r.ter[1], aumM: num(aum) != null ? num(aum) * mult : null, aumCur: cur, creation: r.inceptionDate && r.inceptionDate[1] && r.inceptionDate[1] !== "0001-01-01" ? r.inceptionDate[1] : null,
      domicile: r.domicile === "IE" ? "Irlande" : r.domicile, distribution: distrib(r.fundName), url: SS + r.fundUri, holdUrl: hold ? SS + hold : null, ref: { type: "spdr" } });
  }
  let n = 0;
  for (const rec of out) { if (!detail(rec)) continue; try { Object.assign(rec, await spdrFiche(rec.url)); n++; } catch (e) { log("spdr fiche " + rec.isin + " : " + e.message); } }
  log("spdr : " + n + " fiches lues");
  return out;
}
async function spdrFiche(url) {
  const t = await http(url, { pause: 1200 }); if (!t) return {};
  const tok = unesc(t.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, "\n")).split(/\n+/).map(s => s.replace(/\s+/g, " ").trim()).filter(s => s && s !== "®");
  const after = lab => { const i = tok.indexOf(lab); return i >= 0 ? tok[i + 1] : null; };
  const listings = [];
  const i0 = tok.indexOf("Code Reuters");
  if (i0 > 0) for (let i = i0 + 1; i + 6 < tok.length; i += 7) { const b = placeDeBbg(tok[i + 5]); if (!b) break; listings.push({ place: b.place, ticker: tok[i + 3], devise: tok[i + 1] }); }
  const [replication, methode] = repl(after("Méthode de Réplication") || "");
  const pea = after("Eligible PEA");
  return { indexOfficiel: after("Indice"), replication, methode, pea: pea ? /oui/i.test(pea) : null, devise: after("Devise de la Part"), distribution: distrib(after("Traitement des revenus")) || undefined, listings };
}
export async function spdrPositions(rec, XLSX) {
  if (!rec.holdUrl || !XLSX) return null;
  const b = await http(rec.holdUrl, { type: "buf", pause: 1200 }); if (!b) return null;
  const wb = XLSX.read(b, { type: "buffer" }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
  const h = rows.findIndex(r => r && r.some(x => /^ISIN$/i.test(String(x || ""))) && r.some(x => /weight|poids/i.test(String(x || ""))));
  if (h < 0) return null;
  const H = rows[h].map(x => String(x || "").trim().toLowerCase()), col = re => H.findIndex(x => re.test(x));
  const ci = col(/^isin$/), cn = col(/security name|^name$|nom/), cw = col(/percent of fund|weight|poids/), cs = col(/sector|secteur/), cc = col(/country|pays/), ct = col(/asset class|type/);
  const asOfTxt = rows.slice(0, h).flat().map(x => String(x || "")).find(x => /\d{2}[-/.]\w{3}[-/.]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(x));
  const lines = rows.slice(h + 1).filter(r => r && r[ci] && num(r[cw]) != null).map(r => ({ isin: String(r[ci]).trim(), name: r[cn], w: num(r[cw]), sect: cs >= 0 ? r[cs] : null, pays: cc >= 0 ? r[cc] : null, type: ct >= 0 ? r[ct] : null }));
  return { asOf: asOfTxt ? isoDate(asOfTxt.replace(/^.*?(\d)/, "$1").replace(/-/g, " ")) : null, lines, src: rec.url };
}

// ---------------------------------------------------------------- Invesco
const IV = "https://dng-api.invesco.com/cache/v1/accounts/fr_FR/shareclasses/";
export async function invesco(log) {
  const sm = await http("https://www.invesco.com/fr/fr/sitemap.xml", { pause: 1000 });
  const pages = [...sm.matchAll(/<loc>(https:\/\/www\.invesco\.com\/fr\/fr\/financial-products\/etfs\/[^<]+\.html)<\/loc>/g)].map(m => m[1]);
  log("invesco : " + pages.length + " pages d'ETF dans le plan du site");
  const out = [];
  for (const url of pages) {
    try {
      const t = await http(url, { pause: 900 }); if (!t) continue;
      const isin = (t.match(/<meta name="isin" content="([A-Z]{2}[A-Z0-9]{10})"/) || [])[1]; if (!isin) continue;
      const j = await http(IV + isin + "?idType=isin", { type: "json", pause: 600 }); if (!j || j.shareClassStatus === "closed") continue;
      const [replication, methode] = repl(j.replicationMethod);
      const listings = (j.shareclassListings || []).map(l => { const b = placeDeBbg(l.listingBloombergTicker); return { place: b ? b.place : placeDeNom(l.listingExchangeName), ticker: l.listingTicker, devise: l.listingCurrency }; });
      const ter = num(j.shareclassCharges && (j.shareclassCharges.ongoingCharge || j.shareclassCharges.fundManagementCharge));
      const ks = await http(IV + isin + "/keyStats?idType=isin&productCode=ETF&bondType=NotCallable", { type: "json", pause: 600 }).catch(() => null);
      const aum = ks && (ks.keyStats || []).find(k => k.name === "assetsUnderManagement");
      out.push({ isin, name: unesc(j.shareClassFullName), issuer: "Invesco", ter, aumM: aum && aum.value ? aum.value / 1e6 : null, aumCur: ks && ks.currency || null, devise: j.shareClassCurrency, creation: isoDate(j.shareClassInceptionDate), domicile: (j.account || {}).domicileCountry === "IE" ? "Irlande" : (j.account || {}).domicileCountry,
        distribution: distrib(j.shareClassSuffix + " " + (j.distributionFrequency || "")), replication, methode, indexOfficiel: unesc(((j.benchmarkRelationships || [])[0] || {}).benchmarkFullName || "") || null,
        pea: j.peaEligible ? /yes|oui/i.test(j.peaEligible) : null, classe: (j.investmentStrategy || {}).assetType, couvert: !!j.hedgedIndicator, listings, url, ref: { type: "invesco" } });
    } catch (e) { log("invesco " + url + " : " + e.message); }
    if (out.length % 50 === 0) log("invesco : " + out.length + " lues");
  }
  return out;
}
export async function invescoPositions(rec) {
  for (const k of ["fund", "index"]) {
    const j = await http(IV + rec.isin + "/holdings/" + k + "?idType=isin", { type: "json", pause: 700 }).catch(() => null);
    if (j && (j.holdings || []).length) return { asOf: j.effectiveDate || null, lines: j.holdings.map(h => ({ name: h.name, isin: h.isin, w: h.weight })), src: rec.url, niveau: k === "index" ? "indice" : "fonds", n: j.numberOfHoldings || j.holdings.length };
  }
  return null;
}
