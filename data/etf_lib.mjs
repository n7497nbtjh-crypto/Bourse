// Outils communs à la collecte des ETF (data/etf_collecte.mjs) : accès réseau poli, lecture des nombres et des dates,
// noms de pays et de secteurs, nom d'indice lisible, catégorie du site.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const CACHE = process.env.ETF_CACHE || "";   // dossier de cache pour le développement (vide en production)
if (CACHE) mkdirSync(CACHE, { recursive: true });
export const sleep = ms => new Promise(r => setTimeout(r, ms));
const lastHit = {};

// GET ou POST avec un délai minimal par site, trois essais, 404 -> null. type : "text" | "json" | "buf"
export async function http(url, { method = "GET", body = null, headers = {}, type = "text", pause = 800, retries = 3, timeout = 90e3 } = {}) {
  const key = createHash("sha1").update(method + " " + url + " " + (body || "")).digest("hex");
  const cf = CACHE && `${CACHE}/${key}`;
  if (cf && existsSync(cf)) { const b = readFileSync(cf); if (b.length === 0) return null; return type === "buf" ? b : type === "json" ? JSON.parse(b.toString("utf8").replace(/^﻿/, "")) : b.toString("utf8"); }
  const host = new URL(url).host;
  for (let a = 1; a <= retries; a++) {
    const wait = (lastHit[host] || 0) + pause - Date.now(); if (wait > 0) await sleep(wait);
    lastHit[host] = Date.now();
    let r;
    try { r = await fetch(url, { method, body: body || undefined, headers: { "user-agent": UA, accept: "*/*", ...headers }, signal: AbortSignal.timeout(timeout) }); }
    catch (e) { if (a === retries) throw new Error(`réseau ${e.message} sur ${url}`); await sleep(2000 * a); continue; }
    if (r.status === 404 || r.status === 410) { if (cf) writeFileSync(cf, ""); return null; }
    if (r.ok) {
      const b = Buffer.from(await r.arrayBuffer());
      if (cf) writeFileSync(cf, b);
      return type === "buf" ? b : type === "json" ? JSON.parse(b.toString("utf8").replace(/^﻿/, "")) : b.toString("utf8");
    }
    if (a === retries || (r.status >= 400 && r.status < 500 && r.status !== 429)) throw new Error(`${r.status} sur ${url}`);
    await sleep(3000 * a);
  }
}

// « 2 392,78 » « 0,20% » « $6,66 M » « EUR 1 234 567 » -> nombre
export function num(s) {
  if (s == null) return null; if (typeof s === "number") return isFinite(s) ? s : null;
  let t = String(s).replace(/[\s  ]/g, "").replace(/[^\d,.\-]/g, "");
  if (!t || t === "-") return null;
  if (t.includes(",") && t.includes(".")) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (t.includes(",")) t = t.replace(",", ".");
  const v = parseFloat(t); return isFinite(v) ? v : null;
}
const MOIS = { jan: 1, janv: 1, fev: 2, fevr: 2, feb: 2, mar: 3, mars: 3, avr: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juil: 7, jul: 7, aou: 8, aout: 8, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const sans = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// 20240326, "2024-03-26", "26/mars/2024", "09 févr. 2026", "25/Sept/2009", "26/03/2024" -> "2024-03-26"
export function isoDate(s) {
  if (s == null || s === "" || s === "-") return null;
  if (typeof s === "number" && s > 19000101) { const t = String(s); return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`; }
  const t = sans(s).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[\/ .-]+([a-z]+)\.?[\/ .-]+(\d{4})/); if (m && MOIS[m[2]] ) return `${m[3]}-${String(MOIS[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
export const slug = s => sans(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const unesc = s => String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;/g, "'").replace(/&eacute;/g, "é").replace(/&egrave;/g, "è").replace(/&nbsp;/g, " ");

// Pays : noms anglais ou français -> code ISO à deux lettres (les codes du site, COUNTRY dans index.html)
const PAYS = {
  "united states": "US", "etats-unis": "US", "etats unis": "US", usa: "US", "u.s.": "US", japan: "JP", japon: "JP", "united kingdom": "GB", "royaume-uni": "GB", "royaume uni": "GB", uk: "GB", "great britain": "GB",
  france: "FR", canada: "CA", germany: "DE", allemagne: "DE", switzerland: "CH", suisse: "CH", netherlands: "NL", "pays-bas": "NL", "pays bas": "NL", australia: "AU", australie: "AU", taiwan: "TW", "taiwan (province of china)": "TW",
  china: "CN", chine: "CN", india: "IN", inde: "IN", "korea (south)": "KR", "south korea": "KR", korea: "KR", "korea, republic of": "KR", "coree du sud": "KR", "coree": "KR", "republique de coree": "KR", italy: "IT", italie: "IT", spain: "ES", espagne: "ES",
  sweden: "SE", suede: "SE", denmark: "DK", danemark: "DK", ireland: "IE", irlande: "IE", brazil: "BR", bresil: "BR", "hong kong": "HK", singapore: "SG", singapour: "SG", belgium: "BE", belgique: "BE", finland: "FI", finlande: "FI",
  norway: "NO", norvege: "NO", "south africa": "ZA", "afrique du sud": "ZA", "saudi arabia": "SA", "arabie saoudite": "SA", mexico: "MX", mexique: "MX", israel: "IL", austria: "AT", autriche: "AT", portugal: "PT", luxembourg: "LU",
  jersey: "JE", bermuda: "BM", bermudes: "BM", "cayman islands": "KY", "iles caimans": "KY", "new zealand": "NZ", "nouvelle-zelande": "NZ", "nouvelle zelande": "NZ", poland: "PL", pologne: "PL", indonesia: "ID", indonesie: "ID", thailand: "TH", thailande: "TH",
  malaysia: "MY", malaisie: "MY", philippines: "PH", chile: "CL", chili: "CL", turkey: "TR", turquie: "TR", "turkiye": "TR", greece: "GR", grece: "GR", "united arab emirates": "AE", "emirats arabes unis": "AE", qatar: "QA", kuwait: "KW", koweit: "KW",
  peru: "PE", perou: "PE", colombia: "CO", colombie: "CO", hungary: "HU", hongrie: "HU", "czech republic": "CZ", czechia: "CZ", "republique tcheque": "CZ", egypt: "EG", egypte: "EG", argentina: "AR", argentine: "AR", macau: "MO", macao: "MO",
  "isle of man": "IM", guernsey: "GG", guernesey: "GG", curacao: "CW", panama: "PA", liberia: "LR", cyprus: "CY", chypre: "CY", malta: "MT", malte: "MT", iceland: "IS", islande: "IS", romania: "RO", roumanie: "RO", vietnam: "VN", "viet nam": "VN",
  pakistan: "PK", nigeria: "NG", kenya: "KE", morocco: "MA", maroc: "MA", bahrain: "BH", oman: "OM", jordan: "JO", "puerto rico": "PR", uruguay: "UY", russia: "RU", russie: "RU", "zone euro": "EU", "european union": "EU", "union europeenne": "EU", supranational: "XS",
  "virgin islands (british)": "VG", "british virgin islands": "VG", "iles vierges britanniques": "VG", gibraltar: "GI", monaco: "MC", liechtenstein: "LI", estonia: "EE", latvia: "LV", lithuania: "LT", slovenia: "SI", slovakia: "SK", croatia: "HR", bulgaria: "BG",
};
export function pays(s) {
  if (!s) return null; const t = sans(s).trim().replace(/\s+/g, " ");
  if (/^[a-z]{2}$/.test(t)) return t.toUpperCase();
  return PAYS[t] || PAYS[t.replace(/^the /, "")] || null;
}
// Secteurs (classification GICS en anglais ou en français) -> clé courte affichée par le site
export const SECTEURS_ETF = { it: "Technologies de l'information", fin: "Finance", sante: "Santé", conso_disc: "Consommation discrétionnaire", indus: "Industrie", comm: "Services de communication", conso_base: "Consommation de base", energie: "Énergie", materiaux: "Matériaux", services_pub: "Services aux collectivités", immo: "Immobilier", liquidites: "Liquidités et dérivés", autre: "Autres" };
export function secteur(s) {
  if (!s) return null; const t = sans(s);
  if (/information tech|technolog|^it$|logiciel|semi/.test(t)) return "it";
  if (/financ|bank|banque|assur|insur/.test(t)) return "fin";
  if (/health|sante/.test(t)) return "sante";
  if (/discretion|cyclical|biens de consommation durables/.test(t)) return "conso_disc";
  if (/staples|de base|non.?cyclical|consumer defensive/.test(t)) return "conso_base";
  if (/industr/.test(t)) return "indus";
  if (/communication|telecom|media/.test(t)) return "comm";
  if (/energ/.test(t)) return "energie";
  if (/material|materiau|basic|chimi/.test(t)) return "materiaux";
  if (/utilit|collectivit|services publics/.test(t)) return "services_pub";
  if (/real estate|immobil|reit/.test(t)) return "immo";
  if (/cash|liquidit|derive|deriv|future|forward|money market|monetaire|swap|fx|devise/.test(t)) return "liquidites";
  return "autre";
}

// Nom d'indice lisible : « MSCI Daily Net TR World Euro » -> « MSCI World », « NASDAQ - 100 Notional NTR Index » -> « Nasdaq-100 »
export function indexLisible(raw, nom = "") {
  if (!raw) return null;
  let s = String(raw).replace(/\s+/g, " ").trim();
  const hedge = /hedged|couvert|hdg/i.test(s) ? (/(?:to |en |in )?(eur|euro)/i.test(s.match(/hedged.*$|couvert.*$|hdg.*$/i)?.[0] || "") ? " (couvert en euros)" : " (couvert)") : "";
  s = s.replace(/\b\d+% hedged.*$|\b(?:eur|usd|gbp|chf)?\s*hedged.*$|\bhdg.*$|couvert.*$/i, "");
  s = s.replace(/\bMSCI Daily (?:Net |Gross )?(?:TR |Total Return )?/i, "MSCI ");
  s = s.replace(/\((?:net|gross|ntr|tr|nr|eur|usd|net return|total return|price)[^)]*\)/gi, "");
  s = s.replace(/\b(?:net total return|total return|net return|gross total return|price return|notional net|notional|net tr|ntr|\btr\b|\bnr\b|\bgtr\b|\bnet\b|daily|index|indice|eur|euro|usd|gbp|chf|jpy)\b/gi, " ");
  s = s.replace(/\s+/g, " ").replace(/\s*-\s*$/, "").trim();
  s = s.replace(/^NASDAQ\s*-?\s*100/i, "Nasdaq-100").replace(/^S&P 500®?/i, "S&P 500").replace(/^EURO STOXX 50/i, "Euro Stoxx 50").replace(/^STOXX Europe 600/i, "Stoxx Europe 600").replace(/^CAC 40®?/i, "CAC 40").replace(/^DAX®?/, "DAX").replace(/^Nikkei 225/i, "Nikkei 225");
  if (/^FTSE All.?World/i.test(s)) s = s.replace(/^FTSE All.?World/i, "FTSE All-World");
  if (s.length < 3) s = String(raw).trim();
  return s + hedge;
}
// Clé de regroupement d'indice (pour retrouver la composition d'un indice chez un autre fonds qui le reproduit)
export function indexCle(index) {
  if (!index) return null;
  return sans(index).replace(/\(couvert[^)]*\)/, " hedged").replace(/®|™/g, "").replace(/[^a-z0-9&+]+/g, " ").replace(/\b(the|ucits|capped|select)\b/g, " ").replace(/\s+/g, " ").trim();
}

// Catégorie du site (mêmes clés que l'existant) à partir de la classe d'actifs, de l'indice et du nom
export function categorie({ classe = "", index = "", name = "" }) {
  const c = sans(classe), t = sans(index + " " + name);
  if (/money market|monetaire|overnight|€str|\bestr\b|eonia|smart overnight|cash/.test(t) || /money market|monetaire/.test(c)) return "monetaire";
  if (/commodit|matiere|precious|gold|\bor\b|silver|argent|platin|palladium|bitcoin|crypto|\betc\b|etn/.test(c) || /physical (gold|silver|platinum|palladium|precious)|commodit|bloomberg .*commodity|matieres premieres|\bgold etc\b|crude oil|brent|wti/.test(t)) return "matieres";
  if (/fixed income|obligat|bond|credit|govt|government|treasury|treasuries|aggregate|corporate|high yield|tresor|inflation|\boat\b|bund|\bgilts?\b|sovereign|souverain|tips/.test(c + " " + t) && !/equity|action/.test(c)) return "obligations";
  if (/real estate|immobil|reit|epra|property|properties/.test(c + " " + t)) return "immobilier";
  if (/dividend|dividende|high yield equity|rendement|aristocrat|income/.test(t) && !/bond/.test(t)) return "dividendes";
  if (/minimum volatility|min vol|low volatility|quality|momentum|value factor|\bvalue\b|multi.?factor|enhanced value|size factor|equal weight|fundamental|rafi/.test(t) && !/s&p 500 equal weight/.test(t)) return "facteurs";
  if (/semiconductor|semi-conducteur|robot|automation|artificial intelligence|\bai\b|intelligence artificielle|cyber|clean energy|energie propre|renewable|renouvelable|hydrogen|hydrogene|battery|batter|lithium|water|\beau\b|digital|metaverse|blockchain|fintech|video gam|esports|gaming|cloud|internet|e.?commerce|biotech|genomic|healthcare innovation|medical tech|defen[cs]e|aerospace|space|uranium|nuclear|nucleaire|gold miners|mines d|miners|mining|infrastructure|smart city|electric vehicle|vehicules electriques|ageing|aging|millennial|future mobility|circular|food|agri|timber|wood|luxury|luxe|disruptive|innovation|cannabis|travel|china tech|global x|thematic|megatrend/.test(t)) return "theme";
  if (/\b(health care|healthcare|financials|banks|energy|utilities|information technology|technology|consumer discretionary|consumer staples|industrials|materials|communication services|telecommunication|insurance|oil|chemicals|automobiles|media|pharma|retail)\b|sector|secteur/.test(t)) return "theme";
  if (/emerging|emergent|\bem\b|\bchina\b|\bchine\b|\bindia\b|\binde\b|brazil|bresil|korea|coree|taiwan|latin america|amerique latine|south africa|mexico|saudi|turkey|indonesia|vietnam|frontier|csi 300|msci em\b|ftse em\b|bric/.test(t)) return "actions-emergents";
  if (/\bworld\b|monde|\bacwi\b|all.?world|global|international|all country|developed markets|ftse developed\b/.test(t) && !/europe|usa|\bus\b|japan|pacific/.test(t.replace(/ex usa|ex us/, ""))) return "actions-monde";
  if (/france|\bcac\b|sbf 120|cac 40|cac mid/.test(t)) return "actions-france";
  if (/s&p 500|s&p 400|s&p 600|s&p smallcap|nasdaq|russell|\busa\b|\bus\b|united states|america|dow jones|etats.?unis|msci usa|ftse usa|crsp us/.test(t)) return "actions-usa";
  if (/europe|europ|euro stoxx|stoxx|\bemu\b|eurozone|zone euro|dax|mdax|ftse 100|ftse 250|\buk\b|united kingdom|germany|allemagne|switzerland|suisse|\bsmi\b|italy|italie|ftse mib|spain|espagne|ibex|netherlands|aex|nordic|sweden|belgium|austria|portugal|poland|greece|grece|norway|norvege|denmark|danemark|finland|ireland|israel/.test(t)) return "actions-europe";
  if (/japan|japon|topix|nikkei|pacific|pacifique|asia|asie|australia|asx|hong kong|singapore/.test(t)) return "actions-asie";
  if (/world|global/.test(t)) return "actions-monde";
  return /equity|action/.test(c) ? "actions-monde" : null;
}
