// Analyse des annonces officielles : au lieu de renvoyer vers un PDF ou un dépôt en anglais, le bot lit le document
// et en tire, en français, les chiffres clés et ce qu'ils veulent dire. Aucune IA payante : lecture des données XBRL
// (rapports trimestriels et annuels américains), puis repérage des phrases chiffrées dans les communiqués.
// Sources : SEC EDGAR (dépôts 8-K, 6-K, 10-Q, 10-K) et AMF (communiqués PDF des sociétés françaises).
// Résultat : cf/site/data/actu-analyse.json  { url: { type, titre, chiffres:[[label, valeur]], lecture:[...], extraits:[...], date } }
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import U from "./univers.mjs";
import { US_CONCEPTS, IFRS_CONCEPTS, factsUrl } from "./sec.mjs";
import { UA, getJSON, pool } from "./fetch_data.mjs";

const OUT = new URL("../cf/site/data/", import.meta.url);
const TODAY = new Date().toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NF = d => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const CURS = { USD: "$", EUR: "€", GBP: "£" };
export const money = (v, cur = "USD") => { const a = Math.abs(v), s = CURS[cur] || " " + cur; return a >= 1e9 ? NF(1).format(v / 1e9) + " Md" + s : a >= 1e6 ? NF(0).format(v / 1e6) + " M" + s : NF(0).format(v) + " " + s; };
export const pctS = v => (v > 0 ? "+" : v < 0 ? "−" : "") + NF(Math.abs(v) < 0.1 ? 1 : 0).format(Math.abs(v * 100)) + " %";
const BY = Object.fromEntries(U.map(c => [c.id, c]));

/* ---------- Texte brut d'une page HTML ---------- */
export function htmlText(html) {
  return String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ").replace(/&amp;/g, "&").replace(/&#8217;|&#x2019;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&#x201c;|&#x201d;/gi, '"')
    .replace(/&#8212;|&#8211;|&mdash;|&ndash;/g, "-").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&[a-z]+;/g, " ")
    .replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
const sentences = t => t.replace(/\s+/g, " ").split(/(?<=[.;])\s+(?=[A-ZÀ-Ý"«(])/).map(s => s.trim()).filter(s => s.length > 30 && s.length < 600);

/* ---------- Communiqués en anglais (SEC) : chiffres repérés dans les phrases ---------- */
const AMT = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(billion|million|bn|m)\b/i;
const GROW = /\b(up|increased?|grew|growth of|rose|higher by|an? increase of)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s?(?:%|percent)/i;
const FALL = /\b(down|decreased?|declined?|fell|lower by|a decrease of|a decline of)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s?(?:%|percent)/i;
// Variation sur un an : on préfère celle qui est suivie de « year ago », « year-over-year », « prior year »
function yoy(s) {
  const re = new RegExp(`(?:${GROW.source})|(?:${FALL.source})`, "gi"), all = [...s.matchAll(re)].map(m => { const up = GROW.test(m[0]); const v = parseFloat(m[0].match(/(\d+(?:\.\d+)?)\s?(?:%|percent)/)[1]) / 100; return { v: up ? v : -v, yr: /year[- ]ago|year[- ]over[- ]year|prior[- ]year|last year|same (?:quarter|period) (?:a|last) year|compared (?:to|with) (?:the )?(?:\w+ )?(?:quarter|period)? ?(?:of )?(?:fiscal )?20\d\d/i.test(s.slice(m.index + m[0].length, m.index + m[0].length + 40).split(/,| and |;/)[0]) }; });
  if (!all.length) return null;
  return (all.find(x => x.yr) || (all.length === 1 ? all[0] : null) || {}).v ?? null;
}
const num = (s, unit) => parseFloat(s.replace(/,/g, "")) * (/^b/i.test(unit) ? 1e9 : 1e6);
export function extractEN(text) {
  const S = sentences(text.slice(0, 20000)), out = {}, used = [];
  const take = (key, re, need = AMT) => { if (out[key]) return; const s = S.find(x => re.test(x) && need.test(x) && !/non-gaap|adjusted/i.test(x.slice(0, 80))) || S.find(x => re.test(x) && need.test(x)); if (!s) return;
    const m = s.match(need), gy = yoy(s);
    out[key] = { v: m[2] && /illion/i.test(m[2]) ? num(m[1], m[2]) : parseFloat(m[1].replace(/,/g, "")), g: gy, q: /quarter/i.test(s) ? "trimestre" : /full[- ]year|fiscal year|twelve months|annual/i.test(s) ? "année" : "", s }; used.push(s); };
  take("ca", /\b(revenues?|net sales|total sales|sales)\b/i, /\b(?:revenues?|net sales|total sales)\b(?: (?:of|was|were|totaled|totalled|reached|came in at|grew to|increased to|rose to)| for the [\w\s-]{3,30} (?:was|were|of))? \$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(billion|million)\b/i);
  take("net", /\bnet (income|earnings|profit)\b/i, /\bnet (?:income|earnings|profit)(?: attributable to [\w\s.,&-]{3,40})?(?: (?:of|was|were|totaled|totalled|reached|came in at))? \$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(billion|million)\b/i);
  take("eps", /\b(earnings|EPS|net income) per (diluted )?share|\bdiluted (EPS|earnings per share)\b/i, /\$\s?(\d+\.\d{2})\b/);
  take("div", /\bdividend\b/i, /\$\s?(\d+\.\d{2,4})\s*(?:per share|a share)/i);
  take("rachat", /\b(repurchase|buyback|buy back)\b/i);
  const guide = S.find(x => /\b(outlook|guidance|expects?|anticipates?|forecast)\b/i.test(x) && /\b(revenues?|net sales|sales)\b/i.test(x) && AMT.test(x) && !/repurchase|buyback|capital expenditure|capex/i.test(x));
  if (guide) { const m = guide.match(AMT); out.prevision = { v: num(m[1], m[2]), s: guide, q: /quarter/i.test(guide) ? "trimestre" : /year/i.test(guide) ? "année" : "" }; }
  return out;
}

/* ---------- Communiqués européens en anglais (Oslo, Nasdaq Nordic, Londres) : 4/11/2026 ----------
   Montants écrits « EUR 1,234 million », « SEK 12.3 bn », « MEUR 1,234 », « £1.2bn », « NOK 4,567m »… : la devise est relevée,
   puis chaque montant est récrit sous une seule forme (« ¤1,234 million ») avant le repérage des phrases. Un chiffre n'est gardé
   que si la devise du communiqué est celle des comptes de l'entreprise (sinon la comparaison aux comptes annuels n'aurait pas de sens). */
const DEV = { "€": "EUR", "£": "GBP", "$": "USD", EUR: "EUR", SEK: "SEK", NOK: "NOK", DKK: "DKK", GBP: "GBP", CHF: "CHF", USD: "USD", ISK: "ISK", PLN: "PLN" };
const DEV_RE = "EUR|SEK|NOK|DKK|GBP|CHF|USD|ISK|PLN";
export function normEU(t) {
  const n = {}, vu = d => { d = DEV[d] || DEV[d.toUpperCase()]; if (d) n[d] = (n[d] || 0) + 1; return d; };
  const nb = "(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)", u = "(bn|billion|mn|million|m|M)\\b";
  let x = String(t).replace(/(\d) (\d{3})\b/g, "$1,$2"); // « 12 345 » (espace des milliers)
  x = x.replace(new RegExp(`\\b(${DEV_RE})\\s?(?:in\\s)?(million|billion|m|bn)\\s${nb}`, "g"), (m, d, uu, v) => { vu(d); return `¤${v} ${/^b/.test(uu) ? "billion" : "million"}`; }); // « EUR million 1,234 »
  x = x.replace(new RegExp(`\\bM(${DEV_RE})\\s?${nb}`, "g"), (m, d, v) => { vu(d); return `¤${v} million`; }); // « MSEK 12,345 »
  x = x.replace(new RegExp(`${nb}\\s?M(${DEV_RE})\\b`, "g"), (m, v, d) => { vu(d); return `¤${v} million`; }); // « 1,234 MEUR »
  x = x.replace(new RegExp(`(${DEV_RE}|€|£|\\$)\\s?${nb}\\s?${u}`, "g"), (m, d, v, uu) => { vu(d); return `¤${v} ${/^b/i.test(uu) ? "billion" : "million"}`; });
  x = x.replace(new RegExp(`${nb}\\s?(${DEV_RE})\\s?${u}`, "g"), (m, v, d, uu) => { vu(d); return `¤${v} ${/^b/i.test(uu) ? "billion" : "million"}`; }); // « 1,234 EUR million »
  x = x.replace(new RegExp(`${nb}\\s?(billion|million|bn)\\s(euros?|dollars?|pounds?)\\b`, "gi"), (m, v, uu, d) => { vu(/^e/i.test(d) ? "EUR" : /^d/i.test(d) ? "USD" : "GBP"); return `¤${v} ${/^b/i.test(uu) ? "billion" : "million"}`; });
  x = x.replace(new RegExp(`(${DEV_RE})(m|bn)\\b\\s?${nb}`, "g"), (m, d, uu, v) => { vu(d); return `¤${v} ${uu === "bn" ? "billion" : "million"}`; }); // « EURm 1,234 »
  const dev = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return { t: x, dev: dev ? dev[0] : null };
}
const EU_AMT = /¤(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?) (billion|million)/;
export function extractEU(text, titre = "") {
  const { t, dev } = normEU(text), tt = t.replace(/\s+/g, " "), S = sentences(t.slice(0, 40000)), out = { dev };
  const per = s => /\b(Q[1-4]|(first|second|third|fourth) quarter|quarter|July\s?[-–]\s?September|April\s?[-–]\s?June|October\s?[-–]\s?December|January\s?[-–]\s?March)\b/i.test(s) && !/January\s?[-–]\s?(June|September|December)|nine months|first half|half[- ]year|full[- ]year/i.test(s.slice(0, 160)) ? "trimestre"
    : /\b(first half|half[- ]year|H1|January\s?[-–]\s?June|six months)\b/i.test(s) ? "semestre"
    : /\b(January\s?[-–]\s?September|nine months|9M)\b/i.test(s) ? "neuf mois" : /\b(full[- ]year|January\s?[-–]\s?December|twelve months)\b/i.test(s) ? "année" : "";
  const take = (key, re, bad) => {
    const cands = S.filter(x => re.test(x) && EU_AMT.test(x) && !(bad && bad.test(x)));
    const s = cands.find(x => per(x) === "trimestre") || cands[0]; if (!s) return;
    const i = s.search(re), r = s.slice(i); let m = r.match(EU_AMT), j = m ? r.indexOf(m[0]) : -1; if (!m || j > 90) return;
    if (/\b(by|(increase|decrease|growth|rise|decline|drop|improvement) of)\s*$/i.test(r.slice(0, j))) { // « increased by ¤65 million to ¤1,929 million » : le montant de la période est celui qui suit « to »
      const k = r.slice(j + m[0].length).match(new RegExp("^\\s*to\\s" + EU_AMT.source)); if (!k) return;
      j = j + m[0].length + k.index + k[0].indexOf("¤"); m = r.slice(j).match(EU_AMT); }
    const apres = r.slice(j + m[0].length, j + m[0].length + 40), entre = r.slice(0, j);
    if (/^\s*(higher|lower|more|less|above|below)\b/i.test(apres) || /\b(impact|items?|exceptional|one-off|charge)\b/i.test(entre)) return; // écart ou élément exceptionnel, pas le montant de la période
    const v = parseFloat(m[1].replace(/,/g, "")) * (m[2] === "billion" ? 1e9 : 1e6);
    let g = yoy(s); const rep = s.match(/([+\-−])\s?(\d+(?:\.\d+)?)\s?%\s*(?:on a\s)?reported/i);
    if (rep) g = (rep[1] === "+" ? 1 : -1) * parseFloat(rep[2]) / 100; else if (/like-for-like|\bLFL\b|organic|constant (currenc|exchange)/i.test(s)) g = null; const hl = s.match(/(\d+(?:\.\d+)?)\s?(?:%|percent)\s(higher|lower)\s(than|compared)/i); if (g == null && hl) g = (hl[2].toLowerCase() === "higher" ? 1 : -1) * parseFloat(hl[1]) / 100;
    const pr = apres.match(/^\s*\((\d{1,3}(?:,\d{3})*(?:\.\d+)?)\)/); // usage nordique : chiffre de l'an dernier entre parenthèses, « ¤4,679 million (4,101) »
    if (g == null && pr) { const p0 = parseFloat(pr[1].replace(/,/g, "")) * (m[2] === "billion" ? 1e9 : 1e6); if (p0 > 0) g = v / p0 - 1; }
    // période : celle de la phrase ; sinon celle du titre s'il annonce un trimestre seul (« Q3 2026 », « third quarter ») ; sinon rien (phrase de présentation de l'entreprise, ex. « revenues of SEK 90 billion »)
    let q = per(s);
    if (!q) { // intertitre le plus proche au-dessus de la phrase (« Third quarter 2026 », « July-September », « January-September »…)
      const pos = tt.indexOf(s.slice(0, 50)), av = pos > 0 ? tt.slice(Math.max(0, pos - 3000), pos) : "";
      const lastQ = Math.max(...[...av.matchAll(/\b(Q[1-4]\s?20\d\d|(first|second|third|fourth) quarter( of)?( 20\d\d)?|(July|April|October|January)\s?[-–]\s?(September|June|December|March)\s?(20\d\d)?)\b/gi)]
        .filter(m => !/January\s?[-–]\s?(June|September|December)/i.test(m[0])).map(m => m.index), -1);
      const last9 = Math.max(...[...av.matchAll(/\b(January\s?[-–]\s?(June|September|December)|nine months|first half|half[- ]year|full[- ]year)\b/gi)].map(m => m.index), -1);
      if (lastQ > last9) q = "trimestre";
      else if (/\b(Q[1-4]|(first|second|third|fourth) quarter)\b/i.test(titre) && !/January|nine months|half/i.test(titre)) q = "trimestre";
    }
    if (!q) return;
    out[key] = { v, g, q, s };
  };
  take("ca", /\b(net sales|revenues?|turnover|total income|net revenues?|sales)\b/i, /\b(order(s| intake)|EBITA?|EBITDA|operating (profit|income|result|margin)|adjusted|underlying|comparable|organic|guidance|outlook|expects?|target|capital increase|rights issue|bond|financing|acquisition|offering|buy-?back)\b/i);
  take("net", /\b(net (income|profit|result)|profit (for|after tax)|result for the period)\b/i, /\b(current net|adjusted|underlying|comparable|EBITA?|EBITDA|per share|guidance|outlook|expects?)\b/i);
  return out;
}

export async function analyseEu(a, texteDe) {
  const c = BY[a.id], annual = summaryOf(a.id), cur = SUM && SUM[a.id] && SUM[a.id].currency; if (!c || !annual || !annual.ca || !cur) return null; // sans ventes annuelles, aucun garde-fou : rien n'est publié
  const [type, explication] = TYPES_SEC.resultats;
  const res = { id: a.id, type, explication, date: String(a.d).slice(0, 10), chiffres: [], lecture: [], extraits: [] };
  const brut = extractEU((a.t || "") + " . " + await texteDe(a), a.t || "");
  if (brut.dev !== cur) return { ...res, lecture: [explication] }; // devise du communiqué différente de celle des comptes : pas de comparaison possible
  const x = plausible(brut, annual), per = q => q === "trimestre" ? " du trimestre" : q === "semestre" ? " du semestre" : q === "neuf mois" ? " des neuf premiers mois" : q === "année" ? " de l'année" : "";
  if (x.ca) res.chiffres.push([`Ventes${per(x.ca.q)}`, money(x.ca.v, cur) + (x.ca.g != null ? ` (${pctS(x.ca.g)} sur un an)` : "")]);
  if (x.net) res.chiffres.push([`Bénéfice net${per(x.net.q)}`, money(x.net.v, cur) + (x.net.g != null ? ` (${pctS(x.net.g)} sur un an)` : "")]);
  res.lecture = res.chiffres.length ? lecture(c, x, annual) : [explication];
  return res;
}

/* ---------- Communiqués français (AMF) : phrases chiffrées ---------- */
const FR_AMT = /(\d{1,3}(?:[ .  ]\d{3})*(?:,\d+)?)\s*(milliards?|millions?|Md|M|Mds|md)\s*(?:d['’]\s?euros|€|EUR|de dollars|\$)?/i;
const FR_UP = /(?:hausse|progression|croissance|augmentation|en progression|en hausse)\s+(?:de\s+|organique de\s+|publiée de\s+)?\+?(\d+(?:,\d+)?)\s?%/i;
const FR_DN = /(?:baisse|recul|diminution|repli|en baisse|en recul)\s+(?:de\s+)?-?(\d+(?:,\d+)?)\s?%/i;
const FR_SIGNED = /([+\-−])\s?(\d+(?:,\d+)?)\s?%/;
const frNum = (s, u) => parseFloat(s.replace(/[ .  ]/g, "").replace(",", ".")) * (/^(milliard|md)/i.test(u) ? 1e9 : 1e6);
export function extractFR(text) {
  const S = sentences(text.slice(0, 30000)), out = {}, extraits = [];
  const take = (key, re, need = FR_AMT) => { if (out[key]) return; const s = S.find(x => re.test(x) && need.test(x)); if (!s) return;
    const m = s.match(need), u = s.match(FR_UP), d = s.match(FR_DN), sg = s.match(FR_SIGNED);
    let g = u ? parseFloat(u[1].replace(",", ".")) / 100 : d ? -parseFloat(d[1].replace(",", ".")) / 100 : sg ? (sg[1] === "+" ? 1 : -1) * parseFloat(sg[2].replace(",", ".")) / 100 : null;
    const pub = s.match(/(?:données |variation |hausse |baisse )?publiée?s?\s*:?\s*(?:de\s)?([+\-−])\s?(\d+(?:,\d+)?)\s?%/i); // la variation publiée prime sur la variation « à données comparables »
    if (pub) g = (pub[1] === "+" ? 1 : -1) * parseFloat(pub[2].replace(",", ".")) / 100; else if (/comparables?|organique|changes? constants?|périmètre constant|pcc\b/i.test(s)) g = null;
    out[key] = { v: m[2] ? frNum(m[1], m[2]) : parseFloat(m[1].replace(",", ".")), g, q: /neuf (premiers )?mois|\b9M\b/i.test(s) ? "neuf mois" : /trimestre|T[1-4]\b/i.test(s) ? "trimestre" : /semestre|S1\b/i.test(s) ? "semestre" : /annuel|exercice|année/i.test(s) ? "année" : "", s }; extraits.push(s); };
  const near = kw => new RegExp(`(?:${kw})[^.;:]{0,70}?(?:(?:s['’]établit à|s['’]est établi à|atteint|ressort à|s['’]élève à|de|à)\\s+|:\\s*)(\\d{1,3}(?:[ \\u202f\\u00a0.]\\d{3})*(?:,\\d+)?)\\s*(milliards?|millions?|Md|M)\\s*(?:d['’]\\s?euros|€|EUR)`, "i");
  take("ca", /chiffre d['’]affaires|revenus/i, near("chiffre d['’]affaires|revenus"));
  take("rop", /résultat opérationnel|résultat d['’]exploitation/i, near("résultat opérationnel|résultat d['’]exploitation"));
  take("net", /résultat net/i, near("résultat net"));
  take("div", /dividende/i, /(\d+(?:,\d+)?)\s?(?:€|euros?)\s*par action/i);
  const obj = S.find(x => /objectif|perspective|prévision|confirme|relève|abaisse|guidance/i.test(x) && /(\d)/.test(x));
  if (obj) { out.objectif = { s: obj }; extraits.push(obj); }
  out.extraits = [...new Set(extraits)].filter(s => s.length < 300 && !/[«»]|je tiens|nous sommes|j['’]/i.test(s) && !/\d \d \d/.test(s)).slice(0, 3);
  return out;
}

/* ---------- Garde-fous : on écarte tout chiffre invraisemblable au regard des comptes annuels ---------- */
export function plausible(x, annual) {
  if (!annual || !annual.ca) return x;
  const CA = Math.abs(annual.ca) * 1e6, q = o => o && o.q, ok = {};
  const range = qq => qq === "trimestre" ? [0.12, 0.45] : qq === "semestre" ? [0.3, 0.7] : qq === "neuf mois" ? [0.5, 1.05] : qq === "année" ? [0.7, 1.5] : [0.1, 1.5];
  for (const k of Object.keys(x)) ok[k] = x[k];
  if (x.ca) { const [a, b] = range(q(x.ca)); if (!(x.ca.v >= a * CA && x.ca.v <= b * CA)) delete ok.ca; }
  for (const k of ["net", "rop"]) if (x[k] && !(Math.abs(x[k].v) <= 0.6 * CA && Math.abs(x[k].v) >= 0.002 * CA)) delete ok[k];
  if (x.prevision && (!(x.prevision.v >= 0.1 * CA && x.prevision.v <= 1.6 * CA) || (x.ca && Math.abs(x.prevision.v / x.ca.v - 1) < 0.02))) delete ok.prevision;
  if (x.eps && annual.eps > 0 && !(x.eps.v >= annual.eps * 0.08 && x.eps.v <= annual.eps * 2)) delete ok.eps;
  if (x.div && annual.dps > 0 && !(x.div.v >= annual.dps * 0.1 && x.div.v <= annual.dps * 3)) delete ok.div;
  if (x.rachat && !(x.rachat.v <= 0.6 * CA * 3)) delete ok.rachat;
  return ok;
}
/* ---------- Lecture : ce que les chiffres veulent dire ---------- */
function lecture(c, x, annual) {
  const L = [];
  if (x.ca && x.ca.g != null) {
    const g = x.ca.g;
    L.push(g > 0.15 ? `Les ventes progressent très vite (${pctS(g)}).` : g > 0.03 ? `Les ventes progressent (${pctS(g)}).` : g > -0.03 ? `Les ventes sont stables (${pctS(g)}).` : `Les ventes reculent (${pctS(g)}).`);
    if (annual && annual.g1 != null && Math.abs(g - annual.g1) > 0.03) L.push(g > annual.g1 ? `C'est plus rapide que sur le dernier exercice complet (${pctS(annual.g1)}) : l'activité accélère.` : `C'est moins rapide que sur le dernier exercice complet (${pctS(annual.g1)}) : l'activité ralentit.`);
  }
  if (x.net && x.net.g != null && x.ca && x.ca.g != null) {
    if (x.net.v < 0) L.push("L'entreprise est en perte sur la période.");
    else if (x.net.g < -0.03 && x.ca.g >= -0.03) L.push(`Le bénéfice recule (${pctS(x.net.g)}) alors que les ventes ${x.ca.g > 0.03 ? "progressent" : "tiennent"} : les coûts pèsent davantage, ou un élément exceptionnel joue.`); // 5/11 : « progresse moins vite… (−20 %) » était un contresens
    else if (x.net.g < -0.03) L.push(`Le bénéfice recule aussi (${pctS(x.net.g)}).`);
    else if (x.net.g > x.ca.g + 0.05) L.push(`Le bénéfice progresse plus vite que les ventes (${pctS(x.net.g)}) : chaque vente rapporte davantage.`);
    else if (x.net.g < x.ca.g - 0.05) L.push(`Le bénéfice progresse moins vite que les ventes (${pctS(x.net.g)}) : les coûts pèsent davantage, ou un élément exceptionnel joue.`);
  } else if (x.net && x.net.v < 0) L.push("L'entreprise est en perte sur la période.");
  else if (x.net && x.net.g != null) L.push(x.net.g > 0.03 ? `Le bénéfice progresse (${pctS(x.net.g)}) par rapport à la même période l'an dernier.` : x.net.g < -0.03 ? `Le bénéfice recule (${pctS(x.net.g)}) par rapport à la même période l'an dernier.` : `Le bénéfice est stable (${pctS(x.net.g)}) sur un an.`); // 5/11 : bénéfice seul publié (RaySearch) : une phrase plutôt que rien
  if (x.div && annual && annual.dps) { const d = x.div.v / annual.dps - 1; if (Math.abs(d) > 0.01 && x.div.q !== "trimestre" && d > -0.15 && d < 0.6) /* 6/11 : un versement trimestriel (Apple 0,27 $ face à 1,06 $ par an) ne se compare pas au dividende annuel */ L.push(d > 0 ? `Le dividende annoncé est en hausse par rapport au dernier versé.` : `Le dividende annoncé est en baisse par rapport au dernier versé.`); }
  if (x.objectif) L.push(/relève|améliore|rehausse/i.test(x.objectif.s) ? "L'entreprise relève ses objectifs : elle s'attend à mieux que prévu." : /abaisse|révise à la baisse|réduit/i.test(x.objectif.s) ? "L'entreprise abaisse ses objectifs : elle s'attend à moins bien que prévu." : /confirme|maintient|réitère/i.test(x.objectif.s) ? "L'entreprise confirme ses objectifs pour l'année." : "");
  if (x.rachat) L.push(`L'entreprise annonce des rachats d'actions (${money(x.rachat.v)}) : si les actions rachetées sont annulées, la part de chaque actionnaire restant augmente.`);
  return L.filter(Boolean);
}

/* ---------- Rapports trimestriels et annuels américains : chiffres XBRL exacts ---------- */
const factsCache = {};
async function quarterFromXbrl(cik, acc, form) {
  const doc = factsCache[cik] || (factsCache[cik] = await getJSON(fetch, factsUrl(cik)));
  const facts = (doc && doc.facts) || {}, ifrs = !facts["us-gaap"], g = (ifrs ? facts["ifrs-full"] : facts["us-gaap"]) || {}, C = ifrs ? IFRS_CONCEPTS : US_CONCEPTS;
  const want = form === "10-Q" ? [80, 100] : [350, 380], dur = r => (new Date(r.end) - new Date(r.start)) / 864e5;
  const pick = (concepts, unitRe = /^[A-Z]{3}$/) => {
    for (const k of concepts) for (const [u, rows] of Object.entries((g[k] || {}).units || {})) {
      if (!unitRe.test(u)) continue;
      const mine = rows.filter(r => String(r.accn || "").replace(/-/g, "") === acc && r.start && dur(r) >= want[0] && dur(r) <= want[1]).sort((a, b) => b.end.localeCompare(a.end));
      if (!mine.length) continue;
      const cur = mine[0], endPrev = new Date(new Date(cur.end) - 365 * 864e5);
      const prev = rows.filter(r => r.start && dur(r) >= want[0] && dur(r) <= want[1] && Math.abs(new Date(r.end) - endPrev) < 12 * 864e5).sort((a, b) => b.filed.localeCompare(a.filed))[0];
      return { v: cur.val, prev: prev ? prev.val : null, g: prev && prev.val ? cur.val / Math.abs(prev.val) - (prev.val < 0 ? -1 : 1) : null, unit: u, end: cur.end };
    }
    return null;
  };
  const ca = pick(C.ca), net = pick(C.net), eps = pick(ifrs ? ["DilutedEarningsLossPerShare", "BasicEarningsLossPerShare"] : ["EarningsPerShareDiluted", "EarningsPerShareBasic"], /\//);
  return ca || net ? { ca, net, eps } : null;
}

const TYPES_SEC = {
  "rapport-trimestriel": ["Rapport trimestriel (10-Q)", "Les comptes du trimestre, vérifiés par l'entreprise mais pas audités. Ils détaillent les ventes, les coûts, la dette et la trésorerie."],
  "rapport-annuel": ["Rapport annuel", "Le document de référence de l'année : comptes audités, activité, risques. C'est de lui que viennent les chiffres de la fiche."],
  resultats: ["Annonce de résultats", "Le communiqué publié le jour des résultats : les chiffres de la période et souvent les prévisions de la direction. Le rapport détaillé suit quelques jours plus tard."],
  dirigeants: ["Changement de dirigeants", "L'arrivée ou le départ d'un dirigeant ou d'un administrateur. Un départ soudain du directeur général ou financier est souvent suivi de près par le marché."],
  accord: ["Accord important", "L'entreprise a signé un contrat important (financement, partenariat, fourniture). Le dépôt en donne les grandes lignes."],
  acquisition: ["Acquisition ou cession", "L'entreprise achète ou vend une activité. À surveiller : le prix payé et la façon de le financer (trésorerie, dette, nouvelles actions)."],
  assemblee: ["Assemblée générale", "Les résultats des votes des actionnaires : comptes, dividende, administrateurs, rémunération des dirigeants."],
  incident: ["Incident de cybersécurité", "L'entreprise déclare un incident informatique important, comme l'exige la réglementation américaine."],
  communique: ["Communiqué (société étrangère)", "Les sociétés étrangères cotées aux États-Unis déposent leurs communiqués sous ce format : résultats, dividende, opérations."],
  autre: ["Autre annonce", "Une information que l'entreprise juge utile aux investisseurs."],
};

async function analyseSec(it) {
  const c = BY[it.id]; if (!c) return null;
  const m = it.url.match(/\/data\/(\d+)\/(\d+)\//); if (!m) return null;
  const cik = m[1].padStart(10, "0"), acc = m[2], [titre, explication] = TYPES_SEC[it.kind] || TYPES_SEC.autre;
  const res = { type: titre, explication, date: String(it.date).slice(0, 10), chiffres: [], lecture: [], extraits: [] };
  const annual = summaryOf(c.id);
  if (it.form === "10-Q" || it.form === "10-K") {
    const q = await quarterFromXbrl(cik, acc, it.form).catch(() => null);
    if (q) {
      const per = it.form === "10-Q" ? "du trimestre" : "de l'exercice", end = (q.ca || q.net).end;
      res.titre = `Comptes ${per} clos le ${new Date(end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
      if (q.ca) res.chiffres.push([`Ventes ${per}`, money(q.ca.v, q.ca.unit) + (q.ca.g != null ? ` (${pctS(q.ca.g)} sur un an)` : "")]);
      if (q.net) res.chiffres.push([`Bénéfice net ${per}`, money(q.net.v, q.net.unit) + (q.net.g != null ? ` (${pctS(q.net.g)} sur un an)` : "")]);
      if (q.eps) res.chiffres.push(["Bénéfice par action", NF(2).format(q.eps.v) + " " + (q.eps.unit.split("/")[0] === "USD" ? "$" : q.eps.unit.split("/")[0])]);
      res.lecture = lecture(c, { ca: q.ca, net: q.net }, annual);
    }
    return res.chiffres.length ? res : { ...res, lecture: [explication] };
  }
  // Communiqués (8-K, 6-K) : on lit la pièce jointe principale (EX-99.1) ou le document lui-même
  let text = "";
  try {
    const idx = await getJSON(fetch, it.url.replace(/[^/]+$/, "index.json"));
    const files = ((idx && idx.directory && idx.directory.item) || []).filter(f => /\.htm/i.test(f.name) && !/index/i.test(f.name));
    const ex = files.find(f => /ex-?99[._-]?1|ex991|exhibit99/i.test(f.name)) || files.sort((a, b) => (+b.size || 0) - (+a.size || 0))[0];
    const url = ex ? it.url.replace(/[^/]+$/, ex.name) : it.url;
    const r = await fetch(url, { headers: { "user-agent": UA } }); if (r.ok) text = htmlText(await r.text());
  } catch (e) { }
  if (!text) return { ...res, lecture: [explication] };
  // Seuls les communiqués de résultats portent des chiffres : une assemblée générale, un changement de dirigeant ou un accord
  // citent parfois les ventes de l'année passée, et ces chiffres anciens se retrouvaient en tête de l'annonce (30/10)
  if (["assemblee", "dirigeants", "accord", "acquisition", "incident", "autre"].includes(it.kind) && !/\b(quarterly results|financial results|results for the (first|second|third|fourth) quarter|fiscal (year|quarter) results|reports? (first|second|third|fourth)[- ]quarter)/i.test(text.slice(0, 3000))) return { ...res, lecture: [explication] };
  const x = plausible(extractEN(text), annual), per = q => q === "trimestre" ? " du trimestre" : q === "année" ? " de l'année" : "";
  if (x.ca) res.chiffres.push([`Ventes${per(x.ca.q)}`, money(x.ca.v, c.currency || "USD") + (x.ca.g != null ? ` (${pctS(x.ca.g)} sur un an)` : "")]);
  if (x.net) res.chiffres.push([`Bénéfice net${per(x.net.q)}`, money(x.net.v, c.currency || "USD") + (x.net.g != null ? ` (${pctS(x.net.g)} sur un an)` : "")]);
  if (x.eps) res.chiffres.push(["Bénéfice par action", NF(2).format(x.eps.v) + " $" + (x.eps.g != null ? ` (${pctS(x.eps.g)})` : "")]);
  if (x.div) res.chiffres.push(["Dividende annoncé", NF(2).format(x.div.v) + " $ par action"]);
  if (x.prevision) res.chiffres.push([`Prévision${per(x.prevision.q)}`, "environ " + money(x.prevision.v, c.currency || "USD")]);
  if (res.chiffres.length && it.kind === "communique") res.type = "Annonce de résultats";
  if (/dividend/i.test(text.slice(0, 1500)) && !x.ca && x.div) { res.type = "Annonce de dividende"; res.explication = "L'entreprise annonce le montant et les dates de son prochain dividende."; }
  res.lecture = lecture(c, x, annual);
  if (!res.chiffres.length) res.lecture = [explication];
  return res;
}

/* ---------- AMF : communiqués PDF des sociétés françaises ---------- */
const AMF_API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
let pdfjs = null;
async function pdfText(buf) {
  if (!pdfjs) { try { pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); } catch (e) { return ""; } }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true }).promise;
  let t = ""; for (let p = 1; p <= Math.min(doc.numPages, 6); p++) { const pg = await doc.getPage(p); const tc = await pg.getTextContent(); t += tc.items.map(i => i.str + (i.hasEOL ? "\n" : " ")).join("") + "\n"; }
  return t;
}
function amfType(t) {
  t = String(t || "").toLowerCase();
  if (/trimestri|chiffre d'affaires/.test(t)) return ["Chiffre d'affaires du trimestre", "La publication des ventes de la période, souvent accompagnée d'un point sur les objectifs de l'année."];
  if (/semestriel/.test(t)) return ["Résultats semestriels", "Les comptes des six premiers mois de l'exercice, avec un rapport de la direction."];
  if (/annuel|financier annuel/.test(t)) return ["Résultats ou rapport annuel", "Les comptes de l'année. Le rapport annuel détaillé est le document de référence."];
  if (/rachat|propres actions/.test(t)) return ["Rachat d'actions", "L'entreprise rachète ses propres actions en Bourse. Quand elles sont annulées, la part de chaque actionnaire augmente."];
  if (/droits de vote|nombre total/.test(t)) return ["Nombre d'actions et de droits de vote", "Publication réglementaire mensuelle. Rien à en tirer en général, sauf forte variation."];
  if (/assembl/.test(t)) return ["Assemblée générale", "Documents ou résultats des votes des actionnaires."];
  if (/dirigeant|transaction/.test(t)) return ["Opération d'un dirigeant", "Un dirigeant a acheté ou vendu des actions de l'entreprise."];
  return ["Communiqué", "Une information publiée par l'entreprise et déposée auprès de l'AMF."];
}
export async function amfItems() {
  const isins = U.filter(c => c.region === "FR" && c.isin).map(c => c.isin), out = [];
  for (let i = 0; i < isins.length; i += 40) {
    const u = new URL(AMF_API); u.searchParams.set("limit", "100"); u.searchParams.set("order_by", "uin_dat_amf desc");
    u.searchParams.set("where", `identificationsociete_iso_cd_isi in (${isins.slice(i, i + 40).map(x => `"${x}"`).join(",")}) AND uin_dat_amf >= date'${new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10)}'`);
    try { const j = await getJSON(fetch, u.toString()); (j && j.results || []).forEach(r => out.push(r)); } catch (e) { console.log("AMF", e.message); }
    await sleep(300);
  }
  return out;
}
const langueDe = t => { const en = (t.match(/\b(the|and|with|sales|of)\b/gi) || []).length, fr = (t.match(/\b(le|la|les|des|et|du|une)\b/gi) || []).length; return en > fr * 1.5 ? "en" : "fr"; };
const puces = t => String(t).replace(/\n\s*[\uE000-\uF8FF•▪●◦■➢►✓-]\s*/g, ".\n").replace(/(^|\s)[\uE000-\uF8FF•▪●◦■➢►✓](?=\s)/g, ".\n"); // une puce commence une nouvelle phrase
export async function analyseAmf(r) {
  const isin = r.identificationsociete_iso_cd_isi, c = U.find(x => x.isin === isin); if (!c) return null;
  const url = Object.values(r).find(v => typeof v === "string" && /^https?:\/\/.+\.pdf/i.test(v)); if (!url) return null;
  const typ = r.sous_type_d_information || r.type_d_information || "", [type, explication] = amfType(typ + " " + (r.titre || ""));
  const res = { url, id: c.id, type, explication, date: String(r.uin_dat_amf || "").slice(0, 10), chiffres: [], lecture: [], extraits: [] };
  if (/droits de vote|nombre total/i.test(typ)) return { ...res, lecture: [explication] };
  try {
    const rr = await fetch(url, { headers: { "user-agent": UA } }); if (!rr.ok) return { ...res, lecture: [explication] };
    const buf = await rr.arrayBuffer(); if (buf.byteLength > 6e6) return { ...res, lecture: [explication] };
    const brut = await pdfText(buf), titre = String(r.titre || ""), langue = langueDe(brut);
    if (langue === "en") { // 6/11 : beaucoup de grandes sociétés françaises déposent leur communiqué en anglais (Danone, L'Oréal, Safran…)
      const x = plausible(extractEU(titre + " .\n" + puces(brut), titre), summaryOf(c.id)), perE = q => q === "trimestre" ? " du trimestre" : q === "semestre" ? " du semestre" : q === "neuf mois" ? " des neuf premiers mois" : q === "année" ? " de l'année" : "";
      if (x.dev === "EUR" || !x.dev) {
        if (x.ca) res.chiffres.push([`Chiffre d'affaires${perE(x.ca.q)}`, money(x.ca.v, "EUR") + (x.ca.g != null ? ` (${pctS(x.ca.g)} sur un an)` : "")]);
        if (x.net) res.chiffres.push([`Résultat net${perE(x.net.q)}`, money(x.net.v, "EUR") + (x.net.g != null ? ` (${pctS(x.net.g)} sur un an)` : "")]);
      }
      res.lecture = res.chiffres.length ? lecture(c, x, summaryOf(c.id)) : [explication];
      return res;
    }
    const x = plausible(extractFR(titre + ". " + puces(brut)), summaryOf(c.id)), per = q => q === "trimestre" ? " du trimestre" : q === "semestre" ? " du semestre" : q === "neuf mois" ? " des neuf premiers mois" : q === "année" ? " de l'année" : "";
    if (x.ca) res.chiffres.push([`Chiffre d'affaires${per(x.ca.q)}`, money(x.ca.v, "EUR") + (x.ca.g != null ? ` (${pctS(x.ca.g)})` : "")]);
    if (x.rop) res.chiffres.push([`Résultat opérationnel${per(x.rop.q)}`, money(x.rop.v, "EUR") + (x.rop.g != null ? ` (${pctS(x.rop.g)})` : "")]);
    if (x.net) res.chiffres.push([`Résultat net${per(x.net.q)}`, money(x.net.v, "EUR") + (x.net.g != null ? ` (${pctS(x.net.g)})` : "")]);
    if (x.div) res.chiffres.push(["Dividende", NF(2).format(x.div.v) + " € par action"]);
    res.extraits = x.extraits || [];
    res.lecture = lecture(c, x, summaryOf(c.id));
    if (!res.chiffres.length && !res.extraits.length) res.lecture = [explication];
  } catch (e) { res.lecture = [explication]; }
  return res;
}

let SUM = null;
function summaryOf(id) {
  if (!SUM) { try { SUM = Object.fromEntries(JSON.parse(readFileSync(new URL("societes.json", OUT))).companies.map(c => [c.id, c])); } catch (e) { SUM = {}; } }
  const c = SUM[id]; if (!c) return null;
  return { g1: c.ca && c.caPrev ? c.ca / c.caPrev - 1 : null, dps: c.dps || null, ca: c.ca || null, eps: c.eps || null, net: c.net || null };
}

/* ---------- Contrôle final (6/11) : relu à chaque passage sur TOUTES les annonces gardées, anciennes comprises ----------
   Un chiffre affiché doit coller à la taille de l'entreprise pour la période annoncée. Sinon on le retire (sans rien inventer à la place).
   Cas réels écartés : prévision annuelle prise pour les ventes du trimestre (Grainger 17,9 Md$, Eaton 27,4 Md$), poste comptable de banque
   pris pour des « ventes » (Fifth Third 22 M$), « 1 M€ » de chiffre d'affaires annuel chez Guillin, augmentation de capital lue comme des ventes. */
const lireMontant = t => { const m = String(t).replace(/[  ]/g, " ").match(/^(?:environ )?(-?[\d ]+(?:,\d+)?)\s*(Md|M)?\s*([^\s(]+)/); if (!m) return null;
  return { v: parseFloat(m[1].replace(/ /g, "").replace(",", ".")) * (m[2] === "Md" ? 1e9 : m[2] === "M" ? 1e6 : 1), sym: m[3] }; };
export function controleChiffres(a, annual, devise) {
  if (!a || !a.chiffres || !a.chiffres.length || !annual || !annual.ca) return a;
  const CA = Math.abs(annual.ca) * 1e6, sym = (CURS[devise] || " " + devise).trim(), xbrl = /\((10-Q)\)|^Rapport annuel/.test(a.type || "") && /^Comptes /.test(a.titre || "");
  const perTitre = /du trimestre/.test(a.titre || "") ? 0.25 : /de l'exercice/.test(a.titre || "") ? 1 : null;
  const fr = l => /trimestre/i.test(l) ? 0.25 : /semestre/i.test(l) ? 0.5 : /neuf/i.test(l) ? 0.75 : /année|exercice/i.test(l) ? 1 : perTitre;
  const B = { 0.25: [0.12, 0.45], 0.5: [0.3, 0.7], 0.75: [0.5, 1.05], 1: [0.7, 1.6] };
  let retire = [];
  if (xbrl && a.chiffres.some(([l]) => l === "Ventes" || l === "Bénéfice net")) { const per = perTitre === 1 ? " de l'exercice" : " du trimestre"; // libellé sans période (avant le 6/11)
    a = { ...a, chiffres: a.chiffres.map(([l, t]) => [l === "Ventes" || l === "Bénéfice net" ? l + per : l, t]) }; }
  const a0 = a;
  const garde = a.chiffres.filter(([l, t]) => {
    if (/^Bénéfice par action/.test(l) && !xbrl) { // lu dans un communiqué : souvent un bénéfice « ajusté » ou une prévision annuelle (Taboola 60 $)
      const v = parseFloat(String(t).replace(/[\u202f\u00a0 ]/g, "").replace(",", ".")), e = annual.eps, gm = String(t).match(/\(([+−-])\s?([\d ]+(?:,\d+)?)\s?%/), g = gm ? (gm[1] === "+" ? 1 : -1) * parseFloat(gm[2].replace(/ /g, "").replace(",", ".")) / 100 : 0;
      const ok = e > 0 && Math.abs(v) >= 0.05 * e && Math.abs(v) <= 0.6 * e * Math.max(1, 1 + g); if (!ok) retire.push("bpa"); return ok; }
    const vente = /^(Ventes|Chiffre d'affaires|Revenus)/i.test(l), net = /^(Bénéfice net|Résultat net)/i.test(l); if (!vente && !net) return true;
    const x = lireMontant(t); if (!x || x.sym !== sym) return true; // autre devise : pas de comparaison possible
    const f = fr(l), [lo, hi] = B[f] || B[0.25]; // période inconnue : un communiqué de résultats donne d'abord le trimestre
    const gm = String(t).match(/\(([+−-])\s?([\d ]+(?:,\d+)?)\s?%/), g = gm ? (gm[1] === "+" ? 1 : -1) * parseFloat(gm[2].replace(/ /g, "").replace(",", ".")) / 100 : 0;
    let ok;
    if (vente) ok = x.v >= lo * CA * (xbrl ? 0.5 : 1) && (xbrl || x.v <= hi * CA * Math.max(1, 1 + g)); // comptes officiels (XBRL) : seulement le plancher, la croissance peut être réelle (Micron)
    else ok = xbrl || Math.abs(x.v) <= Math.max(hi * CA * 0.7, Math.abs(annual.net || 0) * 1e6 * (f || 0.25) * 2.5) * Math.max(1, 1 + Math.max(0, g)); // banques : le « chiffre d'affaires » de la fiche est petit, on compare aussi au bénéfice annuel
    if (!ok) retire.push(vente ? "ventes" : "bénéfice");
    return ok;
  });
  if (!retire.length) return a0;
  const lecture = (a.lecture || []).filter(s => !(retire.includes("ventes") && /ventes/i.test(s)) && !(retire.includes("bénéfice") && /bénéfice|perte/i.test(s)));
  return { ...a, chiffres: garde, lecture: garde.length && lecture.length ? lecture : [a.explication || "Les chiffres de ce document n'ont pas pu être lus de façon sûre : voir le document officiel."], controle: retire };
}

async function main() {
  const file = new URL("actu-analyse.json", OUT);
  const prev = existsSync(file) ? JSON.parse(readFileSync(file)).items || {} : {};
  const keep = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.date && (Date.now() - new Date(v.date)) < 75 * 864e5));
  const sec = existsSync(new URL("actu-sec.json", OUT)) ? JSON.parse(readFileSync(new URL("actu-sec.json", OUT))).items || [] : [];
  const todo = sec.filter(i => !keep[i.url] && (Date.now() - new Date(i.date)) < 21 * 864e5).slice(0, +(process.env.MAX_SEC || 150));
  const stop = Date.now() + 14 * 60e3;
  await pool(todo, 3, async it => { if (Date.now() > stop) return; try { const a = await analyseSec(it); if (a) keep[it.url] = { id: it.id, ...a }; } catch (e) { console.log("SEC", it.url, e.message); } await sleep(250); });
  console.log(todo.length, "dépôts SEC examinés");
  const amf = await amfItems(); let n = 0;
  for (const r of amf) { if (Date.now() > stop) break; const url = Object.values(r).find(v => typeof v === "string" && /^https?:\/\/.+\.pdf/i.test(v)); if (!url || keep[url]) continue; try { const a = await analyseAmf(r); if (a) { keep[url] = a; n++; } } catch (e) { console.log("AMF", e.message); } await sleep(200); }
  console.log(amf.length, "annonces AMF,", n, "analysées");
  // 4/11 : communiqués de résultats européens en anglais (Oslo, Nasdaq Nordic, Londres), déjà collectés par data/actu.mjs
  try {
    const { texte } = await import("./dividendes_europe.mjs"), { readdirSync } = await import("node:fs"), eu = [];
    for (const f of readdirSync(new URL("actu/c/", OUT))) { let j; try { j = JSON.parse(readFileSync(new URL("actu/c/" + f, OUT))); } catch (e) { continue; }
      for (const a of j.o || []) if (["oslo", "nasdaq", "nsm"].includes(a.s) && a.c === "resultats" && a.u && !keep[a.u] && (Date.now() - new Date(a.d)) < 21 * 864e5) eu.push({ ...a, id: j.id }); }
    eu.sort((a, b) => b.d.localeCompare(a.d)); let ne = 0, nc = 0;
    for (const a of eu.slice(0, +(process.env.MAX_EU || 300))) { if (Date.now() > stop + 10 * 60e3) break;
      try { const r = await analyseEu(a, texte); if (r) { keep[a.u] = r; ne++; if (r.chiffres.length) nc++; } } catch (e) { console.log("EU", a.u, e.message); }
      await sleep(a.s === "nsm" ? 700 : 350); }
    console.log(eu.length, "communiqués européens,", ne, "analysés,", nc, "avec chiffres");
  } catch (e) { console.log("EU", e.message); }
  let nr = 0; for (const [u, v] of Object.entries(keep)) { const c = BY[v.id], w = controleChiffres(v, summaryOf(v.id), (c && c.currency) || "USD"); if (w !== v) { keep[u] = w; nr++; } }
  console.log(nr, "annonces dont un chiffre invraisemblable a été retiré");
  writeFileSync(file, JSON.stringify({ updated: new Date().toISOString(), items: keep }));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
