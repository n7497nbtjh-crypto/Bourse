// Rattachement d'une annonce ou d'un article à une entreprise suivie par le site.
// Par ordre de sûreté : ISIN, LEI, numéro SEC (CIK), code de l'action sur sa place, puis le nom (nettoyé des formes
// juridiques : SA, SE, plc, AB, ASA, Oyj, A/S, N.V., AG…), limité aux sociétés de la place concernée quand on la connaît.
export const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ß/g, "ss").toLowerCase();
const LEGAL = new Set(("sa se plc ab asa as a s oyj oy nv n v ag spa s p a inc incorporated corp corporation co company ltd limited llc lp holding holdings group groupe " +
  "publ the sab de cv bhd berhad kgaa kg gmbh aps bv b v ag s a s e sca scs sas societe anonyme s a s plc. ord shs class a b c adr ads cl hf asa. pjsc tbk nyrt").split(" "));
export function tokens(s) {
  return fold(s).replace(/&/g, " ").replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}
export const core = s => { const t = tokens(s); const k = t.filter(w => !LEGAL.has(w)); return (k.length ? k : t).join(" "); };
// Place de cotation (préfixe TradingView) pour chaque nom de marché des sources
export const MARKET = { stockholm: "OMXSTO", copenhagen: "OMXCOP", helsinki: "OMXHEX", iceland: "OMXICE", oslo: "OSL", london: "LSE", xosl: "OSL", xoas: "OSL", merk: "OSL" };
export function buildIndex(U) {
  const by = { isin: new Map(), lei: new Map(), cik: new Map(), sec: new Map(), tick: new Map(), name: new Map() };
  const add = (m, k, id) => { if (!k) return; if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(id)) m.get(k).push(id); };
  for (const c of U) {
    if (c.isin) add(by.isin, c.isin.toUpperCase(), c.id);
    if (c.lei) add(by.lei, c.lei.toUpperCase(), c.id);
    if (c.cik) add(by.cik, String(+c.cik), c.id);
    if (c.sec) add(by.sec, String(c.sec).toUpperCase(), c.id);
    if (c.tv) { const [p, t] = String(c.tv).split(":"); add(by.tick, p + ":" + String(t || "").replace(/_/g, " ").toUpperCase(), c.id); add(by.tick, p + ":" + String(t || "").toUpperCase(), c.id); }
    for (const n of [c.name, c.legal, ...(c.alias || [])]) if (n) add(by.name, core(n), c.id);
  }
  const C = Object.fromEntries(U.map(c => [c.id, c]));
  return { by, C, U };
}
const one = l => l && l.length ? l[0] : null;
// Nom d'une source -> entreprise, dans la place indiquée (préfixe TradingView) si connue
const FONDS = /\b(trust|fund|funds|etf|etc|ucits|icav|sicav|realkredit|boligkreditt|securities|finance|financing|funding|treasury|capital markets|investment|investments|index|solutions|asset management|international plc|bank plc|issuer|b v|bv)\b/;
export function byName(ix, name, place = null, exactOnly = false) {
  const k = core(name); if (!k) return null;
  const inPlace = id => !place || String(ix.C[id].tv || "").startsWith(place + ":");
  const exact = (ix.by.name.get(k) || []).filter(inPlace);
  if (exact.length) return exact[0];
  if (exactOnly || FONDS.test(k)) return null;
  // Le nom du site est le début ou la fin du nom officiel : « UPM » / « UPM-Kymmene », « Volvo » / « AB Volvo »
  const kt = k.split(" ");
  let best = null, bestLen = 0, n = 0;
  for (const [nk, ids] of ix.by.name) {
    const nt = nk.split(" "); if (nt.length > kt.length) continue;
    const pre = nt.every((w, i) => kt[i] === w), suf = nt.every((w, i) => kt[kt.length - nt.length + i] === w);
    if (!pre && !suf) continue;
    if (nk.length < 3 && nt.length === 1) continue; // « hm », « bp » seuls : trop ambigu sans place
    for (const id of ids) if (inPlace(id)) { if (nk.length > bestLen) { best = id; bestLen = nk.length; n = 1; } else if (nk.length === bestLen && id !== best) n++; }
  }
  return best && n === 1 && (place || bestLen >= 5) ? best : null;
}
export function match(ix, { isin, lei, cik, sec, ticker, place, name, exact = false } = {}) {
  return one(isin && ix.by.isin.get(String(isin).toUpperCase())) || one(lei && ix.by.lei.get(String(lei).toUpperCase())) || one(cik && ix.by.cik.get(String(+cik)))
    || one(sec && ix.by.sec.get(String(sec).toUpperCase())) || one(ticker && place && ix.by.tick.get(place + ":" + String(ticker).toUpperCase()))
    || (name ? byName(ix, name, place, exact) : null);
}

/* ---------- Presse : une entreprise est-elle nommée dans un titre ? ---------- */
// Noms courants qui sont aussi des mots ordinaires : on exige la forme exacte (majuscule) et un mot de contexte.
const AMBIG = new Set(["apple", "shell", "next", "sage", "visa", "target", "gap", "block", "snap", "meta", "ford", "oracle", "amazon", "orange", "total", "bic", "elis", "spie", "unity", "square", "chemours", "aviva", "tesco", "boots", "ocado", "halma", "smiths", "burberry", "experian",
  "intel", "ally", "progressive", "equity", "southern", "dominion", "entergy", "allstate", "discover", "humana", "ball", "crown", "corning", "lear", "polaris", "garmin", "match", "zoom", "uber", "lyft", "pinterest", "carnival", "royal", "regions", "citizens", "truist", "fifth", "principal", "prudential",
  "sampo", "orkla", "storebrand", "nokia", "kone", "wartsila", "neste", "fortum", "elisa", "huhtamaki", "metso", "outokumpu", "stora", "valmet", "nordea", "ericsson", "volvo", "saab", "scania", "securitas", "sandvik", "skanska", "telia", "essity", "boliden", "electrolux", "husqvarna", "getinge", "ica",
  "dsv", "orsted", "pandora", "carlsberg", "coloplast", "genmab", "tryg", "vestas", "demant", "rockwool", "jyske", "mowi", "yara", "telenor", "dnb", "equinor", "aker", "subsea", "hydro", "salmar", "kongsberg", "schibsted", "adevinta", "atea", "bakkafrost", "frontline", "golden", "tomra", "veidekke", "wallenius"]);
const CONTEXTE = /(\b(shares?|stocks?|earnings|results|profit|profits|revenue|sales|ceo|cfo|chief|dividend|investors?|quarter|acquisition|acquires?|buys?|sells?|deal|merger|bid|takeover|guidance|outlook|forecast|layoffs?|jobs|cuts?|plant|factory|lawsuit|fine[ds]?|launch(es)?|unveils?|chips?|contract|orders?|billion|million|bn|market|valuation|ipo|bourse|action|actions|ventes|r[ée]sultats|b[ée]n[ée]fice|chiffre d.affaires|dividende|rachat|usine|emplois|patron|pdg|directeur|plan social|milliards?|millions?|aktie|gewinn|umsatz|beneficio|utile|ricavi|vinst|omsättning|resultat)\b|[$€£%])/i;
// Trois niveaux d'exigence : nom en plusieurs mots (insensible à la casse) ; sigle ou nom à majuscule interne (LVMH, TotalEnergies : casse exacte) ;
// nom d'un seul mot ou nom courant (Apple, Next, Orange : casse exacte et mot de contexte économique dans le titre).
export function pressIndex(U) {
  const L = [];
  for (const c of U) {
    const names = [c.name, ...(c.alias || [])].filter(Boolean);
    for (const n of names) {
      const clean = String(n).replace(/\s*\(.*?\)\s*/g, " ").trim(); if (clean.length < 3) continue;
      const k = fold(clean), multi = /\s/.test(clean) && clean.length >= 8, sigle = /^[A-Z0-9&.-]{3,}$/.test(clean) || /[a-z][A-Z]/.test(clean) || /\d/.test(clean);
      const amb = AMBIG.has(k) || (!multi && !sigle) || (multi && clean.split(/\s+/).every(w => AMBIG.has(fold(w))));
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?=$|[^\\p{L}\\p{N}])`, multi ? "iu" : "u");
      L.push({ id: c.id, re, amb: amb && !(sigle && !AMBIG.has(k) && clean.length >= 4), len: clean.length });
    }
  }
  return L.sort((a, b) => b.len - a.len);
}
// Entreprises nommées dans le titre (au plus 3). Les noms courants exigent la casse exacte et un mot de contexte économique.
export function inTitle(PI, title) {
  const t = String(title || ""), out = [];
  for (const x of PI) {
    if (out.includes(x.id)) continue;
    if (!x.re.test(t)) continue;
    if (x.amb && !CONTEXTE.test(t)) continue;
    out.push(x.id); if (out.length >= 3) break;
  }
  return out;
}
