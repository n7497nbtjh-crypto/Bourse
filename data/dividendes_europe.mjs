// Dividendes annoncés des entreprises européennes suivies (3/11/2026, Romain : « mets plus de dividendes »).
// Source : les annonces officielles que le site collecte déjà (data/actu.mjs → cf/site/data/actu/c/<id>.json) :
//   Oslo Børs NewsWeb, Nasdaq Nordic (Stockholm, Copenhague, Helsinki), FCA NSM (Londres), AMF (France).
// Pour chaque annonce qui parle d'un dividende (titre) ou de résultats / de calendrier financier, le texte officiel est lu
// et les dates écrites dans le texte sont relevées : détachement (ex-date), date d'enregistrement (record date), versement.
// Aucune date n'est estimée ni déduite d'une année précédente : seules les dates écrites dans l'annonce, à côté du mot
// qui les désigne, sont gardées ; le lien de l'annonce sert de source. Une date doit tomber après la publication.
// Chaque annonce n'est lue qu'une fois (cache data/dividendes_eu_cache.json).
// Résultat : cf/site/data/agenda-dividendes-eu.json ({ updated, source, events: [{ id, date, type, label, source }] }).
// Usage : node data/dividendes_europe.mjs [--max 600] [--minutes 12]
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const MOIS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
  januar: 1, januari: 1, februar: 2, februari: 2, marts: 3, maj: 5, juni: 6, juli: 7, augusti: 8, oktober: 10, desember: 12,
};
const NOMS = Object.keys(MOIS).sort((a, b) => b.length - a.length).join("|");
const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const iso = (y, m, d) => { const t = new Date(Date.UTC(+y, +m - 1, +d)); return t.getUTCMonth() === +m - 1 && +y > 2000 ? t.toISOString().slice(0, 10) : null; };
// Toutes les dates écrites dans un texte (déjà passé par fold), avec leur position
export function dates(t) {
  const R = [], re = new RegExp(`\\b(?:(\\d{1,2})(?:er|st|nd|rd|th)?\\.?\\s+(${NOMS})\\.?,?\\s+(20\\d\\d)|(${NOMS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)|(20\\d\\d)-(\\d\\d)-(\\d\\d)|(\\d{1,2})[./](\\d{1,2})[./](20\\d\\d))\\b`, "g");
  let m;
  while ((m = re.exec(t))) {
    const d = m[1] ? iso(m[3], MOIS[m[2]], m[1]) : m[4] ? iso(m[6], MOIS[m[4]], m[5]) : m[7] ? iso(m[7], m[8], m[9]) : iso(m[12], m[11], m[10]);
    if (d) R.push({ d, i: m.index, f: m.index + m[0].length });
  }
  return R;
}
// Mots qui désignent chaque date (anglais, français, norvégien, suédois, danois, finnois)
const MOTS = {
  ex: /(ex\s?[-–]?\s?dividend(?:e)?(?: date| day)?|ex\s?[-–]?\s?date|ex[- ]?dag(?:en)?|ex[- ]?dato|traded ex[- ]dividend|without (?:the )?(?:right to )?(?:the )?dividend|eks\.? ?(?:utbytte|dato)|date de detachement|detachement(?: du (?:solde|dividende|coupon|acompte)[^.]{0,40})?|detache)/g,
  rec: /(record date|date of record|dividend record date|date d.enregistrement|record ?dato|avstamningsdag(?:en)?|tasmaytyspaiva)/g,
  pay: /(payment date|payable (?:on|date)|paid (?:out )?(?:on )?|pay(?:ment)? on|to be paid|will be paid(?: out)?(?: on)?|mise en paiement|mis en paiement|date de paiement|date de versement|verse(?:e)? le|paye(?:e)? le|utbetal\w*|betalingsdato|udbetal\w*|maksupaiva|distributed on)/g,
};
const DIV = /(dividend|dividende|acompte|utbytte|utdelning|udbytte|osinko|coupon)/;
// Relève détachement, enregistrement et versement : chaque date prend le mot qui la précède de plus près (120 signes, même phrase)
export function extraire(texte, pub) {
  const t = fold(texte).replace(/\s+/g, " "), D = dates(t), out = {};
  const min = new Date(Date.parse(pub) - 4 * 864e5).toISOString().slice(0, 10), max = new Date(Date.parse(pub) + 300 * 864e5).toISOString().slice(0, 10);
  for (const x of D) {
    if (x.d < min || x.d > max) continue;
    const av = t.slice(Math.max(0, x.i - 120), x.i), coupe = Math.max(av.lastIndexOf(". "), av.lastIndexOf("; "), av.lastIndexOf(" * "));
    const zone = coupe >= 0 ? av.slice(coupe + 2) : av;
    let best = null;
    for (const k in MOTS) { MOTS[k].lastIndex = 0; let m; while ((m = MOTS[k].exec(zone))) { const fin = m.index + m[0].length; if (!best || fin > best.fin) best = { k, fin }; } }
    if (!best || /\b(ads|adss|adr|adrs|american depositary)\b/.test(zone.slice(best.fin))) continue; // date propre aux certificats américains
    if (/\b(potential|possible|eventual|eventuel\w*|tentative|indicative)\b/.test(zone)) continue; // date seulement envisagée
    // la phrase autour doit parler de dividende (sinon : date de paiement d'un coupon d'obligation, d'un rachat…)
    const ph = t.slice(Math.max(0, x.i - 300), x.f + 80);
    if (!DIV.test(ph)) continue;
    if (!out[best.k]) out[best.k] = x.d;
  }
  if (out.pay && (out.ex || out.rec) && out.pay < (out.ex || out.rec)) delete out.pay;
  if (out.ex && out.rec && (Date.parse(out.rec) - Date.parse(out.ex)) / 864e5 > 10) delete out.rec;
  if (out.pay && (Date.parse(out.pay) - Date.parse(out.ex || out.rec || out.pay)) / 864e5 > 75) delete out.pay;
  // montant : dans la même phrase qu'un mot « dividende »
  for (const ph of t.split(/(?<=[.;!?])\s|\s\*\s/)) {
    if (!DIV.test(ph) || /(earnings|resultat|benefice|result) (per|par) (share|action)|\beps\b|bpa/.test(ph)) continue;
    const m = ph.match(/(?:\b(eur|usd|nok|sek|dkk|gbp|chf)|(€|\$|£))\s?(\d{1,4}(?:[.,]\d{1,4})?)\s*(?:per (?:ordinary )?share|par action|pr\.? aksje|per aktie|a share)/)
      || ph.match(/(\d{1,4}(?:[.,]\d{1,4})?)\s?(eur|euros?|€|usd|nok|sek|dkk|kr|kroner|kronor|chf|pence|p)\s*(?:brut\s*)?(?:per (?:ordinary )?share|par action|pr\.? aksje|per aktie|a share)/);
    if (!m) continue;
    let v, c;
    if (m[3] !== undefined && (m[1] || m[2])) { v = m[3]; c = m[1] || m[2]; } else { v = m[1]; c = m[2]; }
    v = +String(v).replace(",", "."); if (!(v > 0 && v < 1000)) continue;
    c = { eur: "€", euro: "€", euros: "€", "€": "€", usd: "$", $: "$", gbp: "£", "£": "£", nok: "NOK", sek: "SEK", dkk: "DKK", kr: "kr", kroner: "kr", kronor: "kr", chf: "CHF", pence: "pence", p: "pence" }[c];
    if (c) { out.amt = v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + " " + c; break; }
  }
  return out;
}

// Texte officiel d'une annonce
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const html2txt = h => String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<\/(p|div|tr|li|h\d)>|<br\s*\/?>/gi, " . ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
async function texte(a) {
  const get = (u, o = {}) => fetch(u, { ...o, headers: { "User-Agent": UA, ...(o.headers || {}) }, signal: AbortSignal.timeout(30000) });
  if (a.s === "oslo") {
    const id = String(a.u).match(/message\/(\d+)/)?.[1]; if (!id) return "";
    const r = await get(`https://api3.oslo.oslobors.no/v1/newsreader/message?messageId=${id}`, { method: "POST" }); if (!r.ok) throw new Error("HTTP " + r.status);
    return html2txt((await r.json()).data?.message?.body || "");
  }
  if (a.s === "amf" && /\.pdf$/i.test(a.u)) {
    const r = await get(a.u); if (!r.ok) throw new Error("HTTP " + r.status);
    const dir = mkdtempSync(tmpdir() + "/dv-"), f = dir + "/a.pdf";
    try { writeFileSync(f, Buffer.from(await r.arrayBuffer())); return execFileSync("pdftotext", ["-q", "-l", "6", f, "-"], { maxBuffer: 20e6 }).toString("utf8").replace(/\s+/g, " "); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  }
  const r = await get(a.u); if (!r.ok) throw new Error("HTTP " + r.status);
  let h = await r.text();
  if (a.s === "nasdaq") { const i = h.indexOf('id="view-body"'); if (i > 0) h = h.slice(i); }
  return html2txt(h).slice(0, 200000);
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? +process.argv[i + 1] || d : d; };
  const MAX = arg("--max", 600), STOP = Date.now() + arg("--minutes", 12) * 60e3, OUT = "cf/site/data/agenda-dividendes-eu.json", CACHE = "data/dividendes_eu_cache.json";
  const S = JSON.parse(readFileSync("cf/site/data/societes.json", "utf8")), C = new Map((S.companies || S).map(c => [c.id, c]));
  const officiel = new Set(JSON.parse(readFileSync("cf/site/data/agenda.json", "utf8")).events.filter(e => e.type === "Dividende").map(e => e.id));
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const T0 = new Date().toISOString().slice(0, 10), lim = new Date(Date.now() - 120 * 864e5).toISOString();
  // Annonces candidates : titre qui parle de dividende, ou résultats / calendrier / assemblée (le dividende y est souvent annoncé)
  const cand = [];
  for (const f of readdirSync("cf/site/data/actu/c")) {
    let d; try { d = JSON.parse(readFileSync("cf/site/data/actu/c/" + f, "utf8")); } catch { continue; }
    const c = C.get(d.id); if (!c || c.region === "US" || officiel.has(c.id)) continue;
    for (const a of d.o || []) {
      if (!["oslo", "nasdaq", "nsm", "amf"].includes(a.s) || !a.u || a.d < lim) continue;
      const titre = fold(a.t || ""), div = DIV.test(titre) && !/reinvestment|reinvestissement|drip|policy|politique|forecast|prevision/.test(titre);
      if (!div && !["resultats", "agenda", "assemblee", "dividende"].includes(a.c)) continue;
      cand.push({ ...a, id: d.id, div });
    }
  }
  cand.sort((a, b) => (b.div - a.div) || b.d.localeCompare(a.d));
  let lus = 0, pannes = 0;
  for (const a of cand) {
    if (cache[a.k]) continue;
    if (lus >= MAX || Date.now() > STOP) break;
    try { const tx = (a.t || "") + " . " + await texte(a); const x = extraire(tx, a.d.slice(0, 10));
      // « Ex dividend NOK 1.45 today » : le détachement est le jour de l'annonce
      if (!x.ex && /\bex[ .-]?div\w*\b.*\b(today|i dag)\b|\beks\.? utbytte\b.*\bi dag\b/i.test(a.t || "")) x.ex = a.d.slice(0, 10);
      cache[a.k] = { d: a.d.slice(0, 10), id: a.id, u: a.u, x }; if (++lus % 50 === 0) writeFileSync(CACHE, JSON.stringify(cache));
    } catch (e) { pannes++; if (pannes < 15) console.log("panne", a.s, a.u, e.message); }
    await sleep(a.s === "nsm" ? 700 : 350);
  }
  // Nettoyage du cache : annonces de plus de 150 jours
  const vieux = new Date(Date.now() - 150 * 864e5).toISOString().slice(0, 10);
  for (const k in cache) if (cache[k].d < vieux) delete cache[k];
  // Événements : l'annonce la plus récente l'emporte pour une même société (correction, confirmation des dates)
  const parId = new Map();
  for (const v of Object.values(cache).sort((a, b) => b.d.localeCompare(a.d))) {
    const x = v.x || {}; if (!(x.ex || x.rec || x.pay) || !C.has(v.id) || officiel.has(v.id)) continue;
    const L = parId.get(v.id) || []; parId.set(v.id, L);
    const cle = x.ex || x.rec || x.pay, deja = L.find(e => Math.abs(Date.parse(e.cle) - Date.parse(cle)) < 20 * 864e5);
    if (deja) { for (const k of ["ex", "rec", "pay", "amt"]) if (!deja.x[k] && x[k]) deja.x[k] = x[k]; continue; } // même dividende : l'annonce plus ancienne complète la plus récente
    L.push({ cle, v, x: { ...x } });
  }
  const events = [];
  for (const [id, L] of parId) for (const { v, x } of L) {
    if (x.pay && x.pay < (x.ex || x.rec || x.pay)) delete x.pay;
    const lab = x.amt ? ` (${x.amt})` : "", src = v.u;
    if ([x.ex, x.rec, x.pay].filter(Boolean).sort().pop() < T0) continue; // tout est passé
    if (x.ex) events.push({ id, date: x.ex, type: "Dividende", label: `Détachement du dividende${lab}`, source: src });
    else if (x.rec) events.push({ id, date: x.rec, type: "Dividende", label: `Date d'enregistrement du dividende${lab}`, source: src });
    if (x.pay) events.push({ id, date: x.pay, type: "Dividende", label: `Paiement du dividende${lab}`, source: src });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  writeFileSync(CACHE, JSON.stringify(cache));
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), source: "Annonces officielles (Oslo Børs, Nasdaq Nordic, FCA, AMF)", events }));
  console.log(`${cand.length} annonces candidates, ${lus} lues (${pannes} pannes), ${new Set(events.map(e => e.id)).size} entreprises, ${events.length} dates.`);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) await main();
