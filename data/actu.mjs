// Fil d'actualité des entreprises suivies : annonces officielles (sources primaires) et titres de presse.
// Lancé plusieurs fois par jour en semaine par .github/workflows/actu.yml.
//
// Annonces officielles (titre d'origine, lien vers la source, classement et chiffres calculés par le site) :
//   AMF          info-financiere.gouv.fr (API ouverte, Licence Ouverte Etalab) : sociétés françaises et autres émetteurs suivis par l'AMF
//   SEC          EDGAR, data.sec.gov (domaine public, en-tête User-Agent avec contact, 10 requêtes par seconde au plus)
//   Nasdaq Nordic Bourses de Stockholm, Copenhague, Helsinki et Reykjavik : annonces des sociétés cotées (api.news.eu.nasdaq.com)
//   Oslo Børs    NewsWeb, mécanisme officiel de stockage de la Norvège (api3.oslo.oslobors.no)
//   FCA NSM      National Storage Mechanism britannique : toutes les informations réglementées des sociétés cotées à Londres
// Presse (titre, site, date, lien ; jamais le texte) :
//   GDELT        fichiers ouverts « GKG » publiés toutes les 15 minutes (data.gdeltproject.org), usage libre avec citation,
//                limités à une liste de médias reconnus ; titres repérés en anglais et dans les autres langues (« translingual »)
//   BBC News     flux RSS Business, dont la BBC autorise l'affichage des titres sur un site avec la mention « BBC News »
//
// Sorties (cf/site/data/actu/) :
//   c/<id>.json    { id, maj, o: [annonces 90 jours], p: [presse 30 jours] }
//   fil.json       { maj, sources, o: [annonces récentes de toutes les entreprises], p: [presse récente] }
//   j/<jour>.json  { d, o: [annonces du jour] } pour les 90 derniers jours (chargement progressif de /actualites)
//   ../actu-sec.json (format historique, lu par data/actu_analyse.mjs)
// Annonce : { k, d, id, s, c, i, tf, t, u, l, p?, f?, r?, x? }
//   k clé, d date ISO UTC, s source, c catégorie, i importance 0 à 3, tf titre français écrit par le site, t titre d'origine,
//   u lien, l langue, p 1 si information privilégiée, f chiffres [[libellé, valeur]], r lecture (phrases calculées), x { c: en clair, ch: ce qui change } (IA)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import U from "./univers.mjs";
import { buildIndex, match, MARKET, pressIndex, inTitle, fold } from "./actu_match.mjs";
import { classe, titreFr, importance, privilegiee, chiffresEN, presenter, vraisemblable, ROUTINE } from "./actu_regles.mjs";

const OUT = new URL("../cf/site/data/", import.meta.url), DIR = new URL("actu/", OUT);
const CONTACT = process.env.CONTACT || "contact via GitHub n7497nbtjh-crypto/Bourse";
const UA = `bilan-site (site pedagogique) ${CONTACT}`;
const NOW = Date.now(), JOUR = 864e5, HISTO = 90 * JOUR, HISTO_P = 30 * JOUR;
const STOP = NOW + (+process.env.ACTU_MINUTES || 28) * 60e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = u => createHash("sha1").update(String(u)).digest("base64url").slice(0, 11);
const iso = d => { const t = new Date(d); return isNaN(t) ? null : t.toISOString().replace(/\.\d{3}Z$/, "Z"); };
const day = d => String(d).slice(0, 10);
const ix = buildIndex(U), PI = pressIndex(U), C = ix.C;
const log = (...a) => console.log(...a);
const SRC = {}; // état et volumes de chaque source pour l'affichage
const note = (k, o) => { SRC[k] = { ...(SRC[k] || {}), ...o }; };

async function get(url, { json = false, text = true, opt = {}, tries = 3, timeout = 30000 } = {}) {
  for (let a = 1; a <= tries; a++) {
    try {
      const r = await fetch(url, { ...opt, headers: { "user-agent": UA, accept: json ? "application/json" : "*/*", ...(opt.headers || {}) }, signal: AbortSignal.timeout(timeout) });
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(8000 * a); throw new Error("429 " + url.slice(0, 90)); }
      if (!r.ok) throw new Error(r.status + " " + url.slice(0, 90));
      return json ? await r.json() : text ? await r.text() : Buffer.from(await r.arrayBuffer());
    } catch (e) { if (a === tries) throw e; await sleep(1500 * a); }
  }
}
const readJSON = (u, d) => { try { return existsSync(u) ? JSON.parse(readFileSync(u, "utf8")) : d; } catch (e) { return d; } };
async function pool(items, n, fn) { let k = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) { const it = items[k++]; await fn(it); } })); }

/* ---------- État : annonces déjà connues (lues dans les fichiers par entreprise) ---------- */
mkdirSync(new URL("c/", DIR), { recursive: true }); mkdirSync(new URL("j/", DIR), { recursive: true });
const ETAT = readJSON(new URL("etat.json", DIR), {});
const STORE = {}; // id -> { o: Map(k -> item), p: Map(k -> item) }
for (const f of readdirSync(new URL("c/", DIR))) {
  const j = readJSON(new URL("c/" + f, DIR), null); if (!j || !C[j.id]) continue;
  for (const x of j.o || []) if (x.c === "autre" && x.s !== "sec") { const c = classe(x.t); if (c && c !== "autre") { x.c = c; x.i = Math.max(x.i, importance(c, x.t)); x.tf = titreFr(c, x.t); } } // règles améliorées depuis
  STORE[j.id] = { o: new Map((j.o || []).map(x => [x.k, x])), p: new Map((j.p || []).map(x => [x.k, x])) };
}
const store = id => STORE[id] || (STORE[id] = { o: new Map(), p: new Map() });
const since = (k, max) => { const t = ETAT[k] ? Date.parse(ETAT[k]) - 6 * 3600e3 : NOW - max; return Math.max(t, NOW - max); };
let NOUVEAUX = [];
function ajoute(raw) {
  // raw : { s, d, id, t, u, l, off (catégorie officielle), p }
  if (!raw.id || !raw.t || !raw.u || !raw.d) return;
  if (NOW - Date.parse(raw.d) > HISTO) return;
  const c = raw.c || classe(raw.t, raw.off || "", raw.s); if (!c) return;
  const k = key(raw.u), S = store(raw.id);
  if (S.o.has(k)) return;
  const it = { k, d: raw.d, id: raw.id, s: raw.s, c, i: importance(c, raw.t, raw.off || ""), tf: titreFr(c, raw.t, raw.off || "", raw.s), t: String(raw.t).replace(/\s+/g, " ").trim().slice(0, 220), u: raw.u, l: raw.l || "" };
  if (raw.p || privilegiee(raw.off || "")) it.p = 1;
  if (raw.f && raw.f.length) it.f = raw.f; if (raw.r && raw.r.length) it.r = raw.r;
  if (raw.doc) Object.defineProperty(it, "_doc", { value: raw.doc, enumerable: false });
  S.o.set(k, it); NOUVEAUX.push(it);
}

/* ---------- AMF ---------- */
const AMF_API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
async function amf() {
  const from = new Date(since("amf", HISTO)).toISOString().slice(0, 10);
  const isins = [...new Set(U.filter(c => c.isin).map(c => c.isin))], recs = [];
  for (let i = 0; i < isins.length && Date.now() < STOP; i += 50) {
    const where = `identificationsociete_iso_cd_isi in (${isins.slice(i, i + 50).map(x => `"${x}"`).join(",")}) AND uin_dat_amf >= date'${from}'`;
    for (let off = 0; off < 9900; off += 100) {
      const u = new URL(AMF_API); u.searchParams.set("limit", "100"); u.searchParams.set("offset", String(off)); u.searchParams.set("order_by", "uin_dat_amf desc"); u.searchParams.set("where", where);
      const j = await get(u.toString(), { json: true }).catch(e => { log("AMF", e.message); return null; });
      const r = (j && j.results) || []; recs.push(...r); if (r.length < 100) break; await sleep(250);
    }
    await sleep(250);
  }
  // Une même publication existe souvent en français et en anglais : on garde le français
  const best = new Map();
  for (const r of recs) {
    const url = r.url_de_recuperation || Object.values(r).find(v => typeof v === "string" && /^https?:\/\/.+\.pdf/i.test(v)); if (!url) continue;
    const g = r.identificationsociete_iso_cd_isi + "|" + String(r.uin_dat_amf).slice(0, 15), prev = best.get(g);
    if (!prev || (prev.informationdeposee_inf_lng_inf !== "Français" && r.informationdeposee_inf_lng_inf === "Français")) best.set(g, { ...r, _u: url });
  }
  let n = 0;
  for (const r of best.values()) {
    const id = match(ix, { isin: r.identificationsociete_iso_cd_isi, lei: r.identificationsociete_iso_cd_lei }); if (!id) continue;
    const t = r.informationdeposee_inf_tit_inf || r.sous_type_d_information || "Publication";
    const before = NOUVEAUX.length;
    ajoute({ s: "amf", d: iso(r.uin_dat_amf), id, t: /^(informations privil[ée]gi[ée]es|inside information) \/ autres communiqu/i.test(t) ? (r.sous_type_d_information || t) : t, u: r._u, l: r.informationdeposee_inf_lng_inf === "Anglais" ? "en" : "fr", off: [r.sous_type_d_information, r.type_d_information].filter(Boolean).join(" ; ") });
    n += NOUVEAUX.length - before;
  }
  note("amf", { n: recs.length, nouveaux: n }); log("AMF", recs.length, "publications,", n, "nouvelles");
}

/* ---------- SEC EDGAR ---------- */
const ITEMS = { "2.02": "resultats", "5.02": "dirigeants", "1.01": "operation", "2.01": "operation", "5.07": "assemblee", "1.05": "incident", "3.02": "emission", "2.03": "emission", "8.01": "autre", "7.01": "autre", "2.05": "operation", "2.06": "autre", "5.03": "autre", "3.01": "autre" };
const SECT = { resultats: "Annonce de résultats (8-K)", dirigeants: "Changement de dirigeant ou d'administrateur (8-K)", operation: "Accord ou opération importante (8-K)", assemblee: "Résultats des votes de l'assemblée (8-K)", incident: "Incident de cybersécurité (8-K)", emission: "Émission de titres ou emprunt (8-K)", autre: "Communiqué (8-K)" };
const HOME = id => { const c = C[id]; return c.region === "FR" || /^(OMXSTO|OMXCOP|OMXHEX|OMXICE|OSL|LSE):/.test(c.tv || ""); };
async function sec() {
  let tick = {};
  try { const j = await get("https://www.sec.gov/files/company_tickers.json", { json: true }); for (const v of Object.values(j || {})) tick[String(v.ticker).toUpperCase()] = String(v.cik_str); } catch (e) { log("SEC tickers", e.message); }
  const list = U.filter(c => c.sec || c.cik), from = NOW - HISTO, legacy = []; // toujours 90 jours : le fichier de chaque société est relu de toute façon, et une société manquée (refus 429) est rattrapée
  let n = 0, lus = 0;
  await pool(list, 2, async c => {
    if (Date.now() > STOP) return;
    const cik = String(+(c.cik || tick[String(c.sec).toUpperCase()] || 0)); if (!+cik) return;
    let sub; try { sub = await get(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`, { json: true, tries: 4 }); } catch (e) { log("SEC", c.name, e.message); return; }
    lus++;
    const r = (sub && sub.filings && sub.filings.recent) || {};
    for (let i = 0; i < (r.form || []).length; i++) {
      const form = r.form[i], d = iso(r.acceptanceDateTime?.[i] || r.filingDate[i]); if (!d || Date.parse(d) < NOW - HISTO) break;
      if (!/^(8-K|10-K|10-Q|20-F|40-F|6-K|DEF 14A|SC TO-T|SC TO-I|SC 14D9|425)$/.test(form)) continue;
      const items = String(r.items?.[i] || "").split(",").map(x => x.trim()).filter(Boolean);
      const acc = String(r.accessionNumber[i] || "").replace(/-/g, ""), u = `https://www.sec.gov/Archives/edgar/data/${+cik}/${acc}/${r.primaryDocument[i]}`;
      const kind = form === "10-K" || form === "20-F" || form === "40-F" ? "rapport-annuel" : form === "10-Q" ? "rapport-trimestriel" : form === "DEF 14A" ? "assemblee" : form === "6-K" ? "communique" : form === "8-K" ? ({ resultats: "resultats", dirigeants: "dirigeants", operation: "acquisition", assemblee: "assemblee", incident: "incident" }[items.map(x => ITEMS[x]).find(k => k && k !== "autre")] || "autre") : "acquisition";
      if (Date.parse(d) >= NOW - 21 * JOUR) legacy.push({ id: c.id, date: r.acceptanceDateTime?.[i] || r.filingDate[i], form, kind, items, url: u });
      if (Date.parse(d) < from) continue;
      if (form === "6-K" && HOME(c.id)) continue; // le communiqué d'origine vient déjà de l'AMF, de Nasdaq, d'Oslo ou du NSM
      let cat, t;
      if (form === "8-K") { cat = items.map(x => ITEMS[x]).find(k => k && k !== "autre") || "autre"; if (cat === "autre" && !items.some(x => x === "8.01" || x === "7.01")) continue; t = SECT[cat]; }
      else if (form === "10-Q") { cat = "resultats"; t = "Rapport trimestriel (10-Q)"; }
      else if (/^(10-K|20-F|40-F)$/.test(form)) { cat = "rapport"; t = `Rapport annuel (${form})`; }
      else if (form === "DEF 14A") { cat = "assemblee"; t = "Convocation à l'assemblée générale (DEF 14A)"; }
      else if (form === "6-K") { const desc = r.primaryDocDescription?.[i] || ""; t = desc && !/^6-?k$/i.test(desc) ? desc : "Communiqué (6-K)"; cat = classe(t) || "autre"; }
      else { cat = "operation"; t = form === "SC 14D9" ? "Avis sur une offre publique (SC 14D9)" : form === "425" ? "Communication sur une fusion (425)" : "Offre publique d'achat (SC TO)"; }
      const before = NOUVEAUX.length;
      ajoute({ s: "sec", d, id: c.id, t, u, l: "en", c: cat, off: form });
      n += NOUVEAUX.length - before;
    }
    await sleep(260);
  });
  legacy.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (legacy.length > 50) writeFileSync(new URL("actu-sec.json", OUT), JSON.stringify({ updated: new Date().toISOString(), source: "SEC EDGAR", items: legacy.slice(0, 900) }));
  note("sec", { n: lus, nouveaux: n }); log("SEC", lus, "sociétés lues,", n, "nouveaux dépôts");
}

/* ---------- Nasdaq Nordic ---------- */
async function nasdaq() {
  const from = new Date(since("nasdaq", 45 * JOUR)).toISOString().slice(0, 10);
  const all = [];
  for (let start = 0; start < 30000 && Date.now() < STOP; start += 200) {
    const u = `https://api.news.eu.nasdaq.com/news/query.action?type=json&showAttachments=false&showCnsSpecific=true&showCompany=true&countResults=false&globalGroup=exchangeNotice&globalName=NordicAllMarkets&displayLanguage=en&timeZone=UTC&dateMask=yyyy-MM-dd%27T%27HH%3Amm%3Ass&limit=200&start=${start}&dir=DESC`;
    const j = await get(u, { json: true }).catch(e => { log("Nasdaq", e.message); return null; });
    const it = (j && j.results && j.results.item) || []; all.push(...it);
    if (it.length < 200 || !it.length || String(it[it.length - 1].releaseTime).slice(0, 10) < from) break; await sleep(500);
  }
  // Doublons de langue : on garde l'anglais (ou la version la plus proche)
  const groups = new Map();
  for (const x of all) {
    if (!/Main Market/.test(x.market || "")) continue;
    const place = MARKET[String(x.market).split(", ").pop().toLowerCase()];
    const id = match(ix, { name: x.company, place }); if (!id) continue;
    const g = id + "|" + String(x.releaseTime).slice(0, 15), prev = groups.get(g);
    if (!prev || (prev.language !== "en" && x.language === "en")) groups.set(g, { ...x, _id: id });
  }
  let n = 0;
  for (const x of groups.values()) { const b = NOUVEAUX.length; ajoute({ s: "nasdaq", d: iso(x.releaseTime + "Z"), id: x._id, t: x.headline, u: x.messageUrl, l: x.language, off: x.cnsCategory, doc: x.messageUrl }); n += NOUVEAUX.length - b; }
  note("nasdaq", { n: all.length, nouveaux: n }); log("Nasdaq Nordic", all.length, "annonces,", n, "nouvelles");
}

/* ---------- Oslo Børs NewsWeb ---------- */
async function oslo() {
  const from = since("oslo", 45 * JOUR), all = [];
  for (let t = from; t < NOW + JOUR && Date.now() < STOP; t += 7 * JOUR) {
    const a = new Date(t).toISOString().slice(0, 10), b = new Date(Math.min(t + 7 * JOUR, NOW + JOUR)).toISOString().slice(0, 10);
    const j = await get(`https://api3.oslo.oslobors.no/v1/newsreader/list?category=&issuer=&fromDate=${a}&toDate=${b}&market=&messageTitle=`, { json: true }).catch(e => { log("Oslo", e.message); return null; });
    all.push(...((j && j.data && j.data.messages) || [])); await sleep(500);
  }
  const groups = new Map();
  for (const m of all) {
    if (m.test || m.correctedByMessageId) continue;
    const id = match(ix, { ticker: m.issuerSign, place: "OSL", name: m.issuerName }); if (!id) continue;
    const g = id + "|" + String(m.publishedTime).slice(0, 15), prev = groups.get(g), en = !/[æøå]/i.test(m.title) && !/\b(og|av|for|til|med|resultat for)\b/i.test(m.title);
    if (!prev || (!prev._en && en)) groups.set(g, { ...m, _id: id, _en: en });
  }
  let n = 0;
  for (const m of groups.values()) { const b = NOUVEAUX.length; ajoute({ s: "oslo", d: iso(m.publishedTime), id: m._id, t: m.title, u: `https://newsweb.oslobors.no/message/${m.messageId}`, l: m._en ? "en" : "no", off: (m.category || []).map(c => c.category_en).join(" ; "), doc: `https://api3.oslo.oslobors.no/v1/newsreader/message?messageId=${m.messageId}` }); n += NOUVEAUX.length - b; }
  note("oslo", { n: all.length, nouveaux: n }); log("Oslo", all.length, "annonces,", n, "nouvelles");
}

/* ---------- FCA National Storage Mechanism (Royaume-Uni) ---------- */
const NSM_SKIP = /^(Net Asset Value|Final Terms|Form 8|Disclosure Table|FRN Variable|Price Monitoring|Blocklisting|Block listing|Irish Takeover|Final Announcement|Supplementary Prospectus|Base Prospectus|Report on Payments|Transaction in Own Shares|Director\/PDMR|Holding\(s\) in Company|Total Voting Rights|Treasury Stock|Annual Information Update|Notification of Transactions)/i;
// Avis techniques sur des obligations et produits structurés (banques) : sans intérêt pour un actionnaire
const NSM_BRUIT = /(stabili[sz]ation|admission (of shares|to trading)|issue size|early redemption|redemption|retirement|cancellation|tranche|\bXS\d{6,}|series \d+|po notice|notice of results|filing of documents|form (8-k|10-q|10-k|6-k)|\bdoc re\b|current report on form|noteholders|bondholders|interest rate|coupon|rate fix|prospectus supplement|supplementary prospectus|base prospectus|pricing supplement|programme|exchange rate set|notice to shareholders|ucits|share class)/i;
async function nsm() {
  const t0 = since("nsm", 30 * JOUR);
  let n = 0, seen = 0, kept = 0;
  // Fenêtres d'une journée : l'API ne pagine pas au-delà de 10 000 résultats
  for (let w = t0; w < NOW && Date.now() < STOP; w += JOUR) for (let off = 0; off < 9500 && Date.now() < STOP; off += 500) {
    const from = iso(w), to = iso(Math.min(w + JOUR, NOW + 3600e3));
    const body = { from: off, size: 500, sortorder: "desc", sort: "submitted_date", criteriaObj: { criteria: [{ name: "latest_flag", value: "Y" }], dateCriteria: [{ name: "submitted_date", value: { from, to } }] } };
    const j = await get("https://api.data.fca.org.uk/search?index=nsm-search", { json: true, opt: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } }).catch(e => { log("NSM", e.message); return null; });
    const h = (j && j.hits && j.hits.hits) || []; seen += h.length;
    for (const x of h) {
      const s = x._source || {};
      const routine = NSM_SKIP.test(s.type || "");
      const id = match(ix, { lei: s.lei, isin: null }) || (s.company ? match(ix, { name: String(s.company).replace(/;.*$/, ""), exact: true }) : null);
      if (!id || C[id].region === "US" || HOME(id) && !/^LSE:/.test(C[id].tv || "")) continue; // déjà couvertes par la SEC, l'AMF, Nasdaq ou Oslo
      if (NSM_BRUIT.test((s.headline || "") + " " + (s.type || ""))) continue;
      if (routine && !/^(Transaction in Own Shares|Director\/PDMR|Holding\(s\) in Company|Total Voting Rights)/i.test(s.type || "")) continue;
      kept++;
      const b = NOUVEAUX.length;
      const u = "https://data.fca.org.uk/artefacts/" + s.download_link;
      ajoute({ s: "nsm", d: iso(s.publication_date || s.submitted_date), id, t: s.headline || s.type, u, l: "en", off: s.type, doc: /\.html?$/i.test(s.download_link || "") ? u : null });
      n += NOUVEAUX.length - b;
    }
    if (h.length < 500) break; await sleep(800);
  }
  note("nsm", { n: seen, nouveaux: n }); log("NSM", seen, "documents,", kept, "de sociétés suivies,", n, "nouveaux");
}

/* ---------- Chiffres : lecture du communiqué complet pour les annonces importantes ---------- */
let SUM = null;
function annual(id) {
  if (!SUM) { SUM = {}; const j = readJSON(new URL("societes.json", OUT), { companies: [] }); for (const c of j.companies || []) SUM[c.id] = c; }
  const c = SUM[id]; if (!c || !c.ca) return null;
  return { ca: c.ca, cur: c.currency, g1: c.caPrev ? c.ca / c.caPrev - 1 : null, dps: c.dps || null };
}
async function docText(it) {
  const u = it._doc; if (!u) return "";
  if (it.s === "oslo") { const j = await get(u, { json: true }); return String((j && j.data && j.data.message && j.data.message.body) || ""); }
  const h = await get(u); return htmlText(h || "");
}
export function htmlText(html) {
  return String(html).replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|td)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&[a-z]+;/g, " ")
    .replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
async function chiffres() {
  const todo = NOUVEAUX.filter(it => it._doc && it.i >= 2 && /^(resultats|dividende|operation)$/.test(it.c) && !it.f).slice(0, +(process.env.ACTU_DOCS || 160));
  let ok = 0;
  await pool(todo, 3, async it => {
    if (Date.now() > STOP) return;
    try {
      const txt = await docText(it); if (txt.length < 200) return;
      const x = vraisemblable(chiffresEN(txt), annual(it.id)), p = presenter(x, annual(it.id));
      if (p.f.length) { it.f = p.f.slice(0, 5); ok++; } if (p.r.length) it.r = p.r;
      const ext = [x.ca, x.net, x.objectif].filter(Boolean).map(o => o.s).filter(s => s.length < 320).slice(0, 2);
      if (ext.length) Object.defineProperty(it, "_ext", { value: ext, enumerable: false });
    } catch (e) { log("chiffres", it.u.slice(0, 80), e.message); }
    await sleep(300);
  });
  // AMF et SEC : chiffres lus par data/actu_analyse.mjs (PDF de l'AMF, pièces jointes et XBRL de la SEC)
  const ana = readJSON(new URL("actu-analyse.json", OUT), { items: {} }).items || {};
  let n2 = 0;
  for (const S of Object.values(STORE)) for (const it of S.o.values()) {
    const a = ana[it.u]; if (!a || it.f) continue;
    if (a.chiffres && a.chiffres.length) { it.f = a.chiffres.slice(0, 5); n2++; }
    if (a.lecture && a.lecture.length && a.chiffres && a.chiffres.length) it.r = a.lecture.slice(0, 3);
    if (it.s === "sec" && a.titre && it.c === "resultats") it.tf = a.titre;
    if (it.s === "sec" && it.c === "autre" && /résultats/i.test(a.type || "")) { it.c = "resultats"; it.i = 3; it.tf = "Annonce de résultats"; }
    if (it.s === "sec" && it.c === "autre" && /dividende/i.test(a.type || "")) { it.c = "dividende"; it.i = 2; it.tf = "Dividende"; }
  }
  log("chiffres :", ok, "communiqués lus,", n2, "analyses AMF/SEC rattachées");
}

/* ---------- Presse : GDELT (GKG) et BBC News ---------- */
// Médias reconnus (presse généraliste et économique). Exclus : agrégateurs, sites de cotations et de communiqués.
export const MEDIAS = ("lesechos.fr investir.lesechos.fr lefigaro.fr latribune.fr bfmtv.com challenges.fr capital.fr usinenouvelle.com lemonde.fr franceinfo.fr francetvinfo.fr ouest-france.fr lexpress.fr lepoint.fr " +
  "liberation.fr leparisien.fr la-croix.com france24.com rfi.fr journaldunet.com agefi.fr lopinion.fr 20minutes.fr lesoir.be lecho.be rtbf.be letemps.ch rts.ch boursier.com mieuxvivre-votreargent.fr " +
  "lerevenu.com moneyvox.fr connaissancedesenergies.org lsa-conso.fr lemoniteur.fr air-journal.fr journalauto.com autoplus.fr numerama.com lesnumeriques.com 01net.com zdnet.fr lemondeinformatique.fr " +
  "reuters.com apnews.com bloomberg.com ft.com wsj.com cnbc.com bbc.co.uk bbc.com theguardian.com nytimes.com washingtonpost.com forbes.com fortune.com businessinsider.com marketwatch.com barrons.com " +
  "economist.com techcrunch.com theverge.com axios.com fool.com investopedia.com thestreet.com cnn.com abcnews.go.com cbsnews.com nbcnews.com npr.org latimes.com usatoday.com politico.com politico.eu " +
  "arstechnica.com wired.com engadget.com theinformation.com fiercepharma.com fiercebiotech.com statnews.com biopharmadive.com electrek.co insideevs.com autonews.com freightwaves.com supplychaindive.com " +
  "retaildive.com foodbusinessnews.net just-food.com aviationweek.com flightglobal.com simpleflying.com defensenews.com breakingdefense.com spacenews.com oilprice.com rigzone.com upstreamonline.com " +
  "mining.com mining-technology.com kitco.com hellenicshippingnews.com lloydslist.com splash247.com tradewindsnews.com seatrade-maritime.com " +
  "handelsblatt.com faz.net spiegel.de sueddeutsche.de welt.de tagesschau.de zeit.de manager-magazin.de wiwo.de boerse-online.de finanzen.net n-tv.de nzz.ch fuw.ch handelszeitung.ch derstandard.at diepresse.com " +
  "expansion.com cincodias.elpais.com elpais.com elmundo.es abc.es lavanguardia.com eleconomista.es elconfidencial.com ilsole24ore.com corriere.it repubblica.it milanofinanza.it lastampa.it ansa.it " +
  "fd.nl nrc.nl volkskrant.nl nos.nl tijd.be standaard.be di.se svd.se dn.se gp.se svt.se borsen.dk berlingske.dk politiken.dk dr.dk finans.dk e24.no dn.no nrk.no aftenposten.no kauppalehti.fi hs.fi yle.fi " +
  "irishtimes.com independent.ie rte.ie businesspost.ie cityam.com thisismoney.co.uk telegraph.co.uk independent.co.uk news.sky.com sky.com standard.co.uk thetimes.co.uk proactiveinvestors.co.uk " +
  "asia.nikkei.com japantimes.co.jp scmp.com straitstimes.com theglobeandmail.com financialpost.com cbc.ca afr.com smh.com.au abc.net.au livemint.com economictimes.indiatimes.com business-standard.com " +
  "moneycontrol.com thehindubusinessline.com koreaherald.com koreatimes.co.kr caixinglobal.com rappler.com bnnbloomberg.ca dw.com euronews.com aljazeera.com").split(" ");
const MSET = new Set(MEDIAS);
const BLOQUES = /(^|\.)(boursorama|yahoo|zonebourse|marketscreener|news\.google|google|msn|globenewswire|businesswire|prnewswire|accesswire|newsfilecorp|einpresswire|benzinga|marketbeat|tickerreport|etfdailynews|defenseworld|thelincolnianonline|dailypolitical|wkrb13|themarketsdaily|thecerbatgem|modernreaders|zolmax|com-unik|americanbankingnews|watchlistnews|investing|seekingalpha|stocktitan|streetinsider|tipranks|zacks|insidermonkey|gurufocus|simplywall|finanznachrichten|finanzen|ad-hoc-news|openpr|newswire|prweb|issuewire)\./i;
const media = dom => { let d = String(dom || "").toLowerCase().replace(/^www\./, ""); while (d) { if (MSET.has(d)) return d; const i = d.indexOf("."); if (i < 0) break; d = d.slice(i + 1); if (!d.includes(".")) break; } return null; };
const LANG = { fra: "fr", eng: "en", deu: "de", spa: "es", ita: "it", nld: "nl", swe: "sv", dan: "da", nor: "no", nob: "no", fin: "fi", por: "pt", jpn: "ja", kor: "ko", zho: "zh" };
const PRESSE = []; let presseVus = new Set();
function ajoutePresse({ d, t, u, site, l, src, sur = true }) {
  if (!t || !u || !d || NOW - Date.parse(d) > HISTO_P) return;
  const titre = String(t).replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, "").replace(/\s+/g, " ").trim();
  if (titre.length < 25 || titre.length > 260) return;
  const ids = inTitle(PI, titre); if (!ids.length) return;
  const nk = fold(titre).replace(/[^a-z0-9]/g, "").slice(0, 70); if (presseVus.has(nk) || presseVus.has(u)) return;
  presseVus.add(nk); presseVus.add(u);
  PRESSE.push({ k: key(u), d, ids, t: titre.slice(0, 220), u, s: site, l, src, ...(sur ? {} : { a: 1 }) });
}
async function gdelt() {
  const last = ETAT.gdelt ? Date.parse(ETAT.gdelt) : NOW - 12 * 3600e3;
  const start = Math.max(last + 15 * 60e3, NOW - 36 * 3600e3), files = [];
  for (let t = Math.floor(start / 9e5) * 9e5; t <= NOW - 15 * 60e3; t += 9e5) files.push(new Date(t).toISOString().replace(/[-:T]/g, "").slice(0, 12) + "00");
  const tmp = "/tmp/actu-gdelt"; mkdirSync(tmp, { recursive: true });
  let rows = 0, done = null, kept0 = PRESSE.length;
  for (const f of files) {
    if (Date.now() > STOP - 4 * 60e3) break;
    for (const kind of ["gkg", "translation.gkg"]) {
      try {
        const buf = await get(`http://data.gdeltproject.org/gdeltv2/${f}.${kind}.csv.zip`, { text: false, timeout: 60000, tries: 2 }); if (!buf) continue;
        writeFileSync(`${tmp}/g.zip`, buf);
        const csv = execFileSync("unzip", ["-p", `${tmp}/g.zip`], { maxBuffer: 400 * 1024 * 1024 }).toString("utf8");
        for (const line of csv.split("\n")) {
          if (!line) continue; rows++;
          const c = line.split("\t"), dom = String(c[3] || "").toLowerCase().replace(/^www\./, ""); if (!dom || BLOQUES.test(dom + ".")) continue; const site = media(dom) || dom, sur = site !== dom || MSET.has(dom);
          const tt = (c[26] || "").match(/<PAGE_TITLE>(.*?)<\/PAGE_TITLE>/); if (!tt) continue;
          const lc = kind === "gkg" ? "eng" : ((c[25] || "").match(/srclc:(\w{3})/) || [])[1];
          const l = LANG[lc] || ""; if (!l) continue;
          const d = c[1] && c[1].length === 14 ? `${c[1].slice(0, 4)}-${c[1].slice(4, 6)}-${c[1].slice(6, 8)}T${c[1].slice(8, 10)}:${c[1].slice(10, 12)}:00Z` : null;
          ajoutePresse({ sur, d, t: tt[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'"), u: c[4], site, l, src: "gdelt" });
        }
      } catch (e) { log("GDELT", f, kind, e.message.slice(0, 80)); }
    }
    done = f;
  }
  if (done) ETAT.gdelt = `${done.slice(0, 4)}-${done.slice(4, 6)}-${done.slice(6, 8)}T${done.slice(8, 10)}:${done.slice(10, 12)}:00Z`;
  note("gdelt", { n: rows, nouveaux: PRESSE.length - kept0, fichiers: files.length });
  log("GDELT", files.length, "fichiers,", rows, "articles lus,", PRESSE.length - kept0, "titres retenus");
}
async function bbc() {
  let n0 = PRESSE.length;
  try {
    const x = await get("https://feeds.bbci.co.uk/news/business/rss.xml");
    for (const m of String(x || "").matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const g = tag => ((m[1].match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)) || [])[1] || "").trim();
      ajoutePresse({ d: iso(g("pubDate")), t: g("title"), u: g("link").replace(/\?at_medium.*$/, ""), site: "bbc.co.uk", l: "en", src: "bbc" });
    }
  } catch (e) { log("BBC", e.message); }
  note("bbc", { nouveaux: PRESSE.length - n0 }); log("BBC", PRESSE.length - n0, "titres retenus");
}

/* ---------- Écriture ---------- */
const SOURCES = [
  ["amf", "AMF", "Autorité des marchés financiers, info-financiere.gouv.fr", "https://www.info-financiere.gouv.fr", "Licence Ouverte (Etalab)", "Annonces officielles"],
  ["sec", "SEC", "Securities and Exchange Commission, EDGAR", "https://www.sec.gov/edgar/search/", "Domaine public (États-Unis)", "Annonces officielles"],
  ["nasdaq", "Nasdaq Nordic", "Bourses de Stockholm, Copenhague, Helsinki et Reykjavik", "https://www.nasdaq.com/european-market-activity/news/company-news", "Annonces publiques des sociétés cotées", "Annonces officielles"],
  ["oslo", "Oslo Børs", "NewsWeb, Euronext Oslo Børs", "https://newsweb.oslobors.no", "Mécanisme officiel de stockage (Norvège)", "Annonces officielles"],
  ["nsm", "FCA (NSM)", "National Storage Mechanism, Financial Conduct Authority", "https://data.fca.org.uk/#/nsm/nationalstoragemechanism", "Mécanisme officiel de stockage (Royaume-Uni)", "Annonces officielles"],
  ["gdelt", "GDELT", "Projet GDELT, index ouvert de la presse mondiale", "https://www.gdeltproject.org", "Données ouvertes, usage libre avec citation ; titres de médias reconnus uniquement", "Presse"],
  ["bbc", "BBC News", "Flux RSS Business", "https://www.bbc.co.uk/news/business", "Affichage des titres autorisé par la BBC avec la mention « BBC News »", "Presse"],
];
function ecrire() {
  const minO = NOW - HISTO, minP = NOW - HISTO_P;
  // Presse rattachée à chaque entreprise
  for (const a of PRESSE) for (const id of a.ids) { const S = store(id); if (!S.p.has(a.k)) S.p.set(a.k, { k: a.k, d: a.d, t: a.t, u: a.u, s: a.s, l: a.l, ...(a.a ? { a: 1 } : {}), ...(a.ids.length > 1 ? { co: a.ids } : {}) }); }
  const all = [], press = [];
  let ecrits = 0;
  for (const c of U) store(c.id); // un fichier par entreprise suivie, même vide : la fiche et la synthèse le lisent sans erreur
  for (const [id, S] of Object.entries(STORE)) {
    let nr = 0;
    const o = dedoublonne([...S.o.values()].filter(x => Date.parse(x.d) >= minO)).sort((a, b) => b.d.localeCompare(a.d)).filter(x => !ROUTINE.has(x.c) || x.c === "agenda" || nr++ < 25).slice(0, 300);
    const p = [...S.p.values()].filter(x => Date.parse(x.d) >= minP).sort((a, b) => (a.a ? 1 : 0) - (b.a ? 1 : 0) || b.d.localeCompare(a.d)).slice(0, 40).sort((a, b) => b.d.localeCompare(a.d));
    const file = new URL(`c/${id}.json`, DIR);
    const txt = JSON.stringify({ id, o, p }), prev = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (prev !== txt) { writeFileSync(file, txt); ecrits++; }
    all.push(...o); p.forEach(x => press.push({ ...x, id }));
  }
  all.sort((a, b) => b.d.localeCompare(a.d));
  // Fichiers par jour (annonces non routinières), 90 jours
  const byDay = {};
  for (const x of all) if (!ROUTINE.has(x.c)) (byDay[day(x.d)] = byDay[day(x.d)] || []).push(x);
  for (const f of readdirSync(new URL("j/", DIR))) if (!byDay[f.slice(0, 10)]) unlinkSync(new URL("j/" + f, DIR));
  for (const [d, L] of Object.entries(byDay)) { const file = new URL(`j/${d}.json`, DIR), txt = JSON.stringify({ d, o: L }); if (!existsSync(file) || readFileSync(file, "utf8") !== txt) writeFileSync(file, txt); }
  // Fil récent : 4 derniers jours d'annonces non routinières, 2 jours de presse (dédoublonnée)
  const filO = all.filter(x => !ROUTINE.has(x.c) && NOW - Date.parse(x.d) < 4 * JOUR).slice(0, 1500);
  const seenP = new Set(), filP = press.sort((a, b) => b.d.localeCompare(a.d)).filter(x => !x.a && NOW - Date.parse(x.d) < 2 * JOUR && !seenP.has(x.k) && seenP.add(x.k)).slice(0, 400);
  const parSrc = {}; for (const x of all) parSrc[x.s] = (parSrc[x.s] || 0) + 1;
  const parReg = {}; for (const x of all) { const r = C[x.id].region; parReg[r] = (parReg[r] || 0) + 1; }
  const sources = SOURCES.map(([k, nom, detail, url, licence, type]) => ({ k, nom, detail, url, licence, type, at: ETAT[k] || null, ok: SRC[k] ? !SRC[k].erreur : !!ETAT[k], erreur: SRC[k] && SRC[k].erreur || null, n90: k === "gdelt" || k === "bbc" ? press.filter(x => (k === "bbc") === (x.s === "bbc.co.uk")).length : parSrc[k] || 0 }));
  const jours = Object.keys(byDay).sort().reverse();
  // Couverture : part des entreprises suivies avec au moins une annonce (90 jours) ou un article (30 jours), par région
  const couverture = {};
  for (const c of U) { const r = couverture[c.region] || (couverture[c.region] = { n: 0, annonces: 0, presse: 0, une: 0 }); const S = STORE[c.id]; const a = S && [...S.o.values()].some(x => Date.parse(x.d) >= minO), pr = S && [...S.p.values()].some(x => Date.parse(x.d) >= minP); r.n++; if (a) r.annonces++; if (pr) r.presse++; if (a || pr) r.une++; }
  log("couverture", JSON.stringify(couverture));
  writeFileSync(new URL("fil.json", DIR), JSON.stringify({ maj: new Date().toISOString(), sources, jours, total: all.length, regions: parReg, couverture, entreprises: Object.keys(STORE).filter(id => STORE[id].o.size).length, o: filO, p: filP }));
  writeFileSync(new URL("etat.json", DIR), JSON.stringify(ETAT, null, 1));
  log(`écrit : ${ecrits} fiches modifiées, ${all.length} annonces sur 90 jours, ${filO.length} dans le fil, ${filP.length} titres de presse récents`, parSrc, parReg);
}
// Une même annonce publiée par deux sources (ex. Nasdaq et le NSM pour une société cotée à Londres et Stockholm) : on garde la première
function dedoublonne(L) {
  const out = [], seen = new Map();
  for (const x of L.sort((a, b) => a.d.localeCompare(b.d))) {
    const g = x.c + "|" + fold(x.t).replace(/[^a-z0-9]/g, "").slice(0, 50), prev = seen.get(g);
    if (prev && Math.abs(Date.parse(prev.d) - Date.parse(x.d)) < 36 * 3600e3 && prev.s !== x.s) { if (!prev.f && x.f) prev.f = x.f; continue; }
    seen.set(g, x); out.push(x);
  }
  return out;
}

async function main() {
  const etapes = [["amf", amf], ["sec", sec], ["nasdaq", nasdaq], ["oslo", oslo], ["nsm", nsm]];
  const only = process.argv.slice(2).filter(a => !a.startsWith("-"));
  if (only.includes("relire")) { await chiffres(); ecrire(); return; } // après data/actu_analyse.mjs : rattache les chiffres AMF et SEC
  for (const [k, fn] of etapes) {
    if (only.length && !only.includes(k)) continue;
    if (Date.now() > STOP) break;
    const t0 = Date.now();
    try { await fn(); ETAT[k] = new Date(t0).toISOString(); } catch (e) { log("ÉCHEC", k, e.message); note(k, { erreur: String(e.message).slice(0, 120) }); }
  }
  await chiffres();
  if (!only.length || only.includes("presse")) { await bbc(); try { await gdelt(); } catch (e) { log("ÉCHEC GDELT", e.message); note("gdelt", { erreur: e.message }); } ETAT.bbc = new Date().toISOString(); }
  ecrire();
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
