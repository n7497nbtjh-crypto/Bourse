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
  const guide = S.find(x => /\b(outlook|guidance|expects?|anticipates?|forecast)\b/i.test(x) && AMT.test(x));
  if (guide) { const m = guide.match(AMT); out.prevision = { v: num(m[1], m[2]), s: guide, q: /quarter/i.test(guide) ? "trimestre" : /year/i.test(guide) ? "année" : "" }; }
  return out;
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
    const g = u ? parseFloat(u[1].replace(",", ".")) / 100 : d ? -parseFloat(d[1].replace(",", ".")) / 100 : sg ? (sg[1] === "+" ? 1 : -1) * parseFloat(sg[2].replace(",", ".")) / 100 : null;
    out[key] = { v: m[2] ? frNum(m[1], m[2]) : parseFloat(m[1].replace(",", ".")), g, q: /trimestre|T[1-4]\b/i.test(s) ? "trimestre" : /semestre|S1\b/i.test(s) ? "semestre" : /annuel|exercice|année/i.test(s) ? "année" : "", s }; extraits.push(s); };
  const near = kw => new RegExp(`(?:${kw})[^.;:]{0,70}?(?:s['’]établit à|s['’]est établi à|atteint|ressort à|s['’]élève à|de|à)\\s+(\\d{1,3}(?:[ \\u202f\\u00a0.]\\d{3})*(?:,\\d+)?)\\s*(milliards?|millions?|Md|M)\\s*(?:d['’]\\s?euros|€|EUR)`, "i");
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
  const range = qq => qq === "trimestre" ? [0.12, 0.45] : qq === "semestre" ? [0.3, 0.7] : qq === "année" ? [0.7, 1.5] : [0.1, 1.5];
  for (const k of Object.keys(x)) ok[k] = x[k];
  if (x.ca) { const [a, b] = range(q(x.ca)); if (!(x.ca.v >= a * CA && x.ca.v <= b * CA)) delete ok.ca; }
  for (const k of ["net", "rop"]) if (x[k] && !(Math.abs(x[k].v) <= 0.6 * CA && Math.abs(x[k].v) >= 0.002 * CA)) delete ok[k];
  if (x.prevision && !(x.prevision.v >= 0.1 * CA && x.prevision.v <= 1.6 * CA)) delete ok.prevision;
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
    else if (x.net.g > x.ca.g + 0.05) L.push(`Le bénéfice progresse plus vite que les ventes (${pctS(x.net.g)}) : chaque vente rapporte davantage.`);
    else if (x.net.g < x.ca.g - 0.05) L.push(`Le bénéfice progresse moins vite que les ventes (${pctS(x.net.g)}) : les coûts pèsent davantage, ou un élément exceptionnel joue.`);
  } else if (x.net && x.net.v < 0) L.push("L'entreprise est en perte sur la période.");
  if (x.div && annual && annual.dps) { const d = x.div.v / annual.dps - 1; if (Math.abs(d) > 0.01 && x.div.q !== "trimestre") L.push(d > 0 ? `Le dividende annoncé est en hausse par rapport au dernier versé.` : `Le dividende annoncé est en baisse par rapport au dernier versé.`); }
  if (x.objectif) L.push(/relève|améliore|rehausse/i.test(x.objectif.s) ? "L'entreprise relève ses objectifs : elle s'attend à mieux que prévu." : /abaisse|révise à la baisse|réduit/i.test(x.objectif.s) ? "L'entreprise abaisse ses objectifs : elle s'attend à moins bien que prévu." : /confirme|maintient|réitère/i.test(x.objectif.s) ? "L'entreprise confirme ses objectifs pour l'année." : "");
  if (x.rachat) L.push(`L'entreprise annonce des rachats d'actions (${money(x.rachat.v)}) : en annulant des actions, elle augmente la part de chaque actionnaire restant.`);
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
      if (q.ca) res.chiffres.push(["Ventes", money(q.ca.v, q.ca.unit) + (q.ca.g != null ? ` (${pctS(q.ca.g)} sur un an)` : "")]);
      if (q.net) res.chiffres.push(["Bénéfice net", money(q.net.v, q.net.unit) + (q.net.g != null ? ` (${pctS(q.net.g)} sur un an)` : "")]);
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
async function amfItems() {
  const isins = U.filter(c => c.region === "FR" && c.isin).map(c => c.isin), out = [];
  for (let i = 0; i < isins.length; i += 40) {
    const u = new URL(AMF_API); u.searchParams.set("limit", "100"); u.searchParams.set("order_by", "uin_dat_amf desc");
    u.searchParams.set("where", `identificationsociete_iso_cd_isi in (${isins.slice(i, i + 40).map(x => `"${x}"`).join(",")}) AND uin_dat_amf >= date'${new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10)}'`);
    try { const j = await getJSON(fetch, u.toString()); (j && j.results || []).forEach(r => out.push(r)); } catch (e) { console.log("AMF", e.message); }
    await sleep(300);
  }
  return out;
}
async function analyseAmf(r) {
  const isin = r.identificationsociete_iso_cd_isi, c = U.find(x => x.isin === isin); if (!c) return null;
  const url = Object.values(r).find(v => typeof v === "string" && /^https?:\/\/.+\.pdf/i.test(v)); if (!url) return null;
  const typ = r.sous_type_d_information || r.type_d_information || "", [type, explication] = amfType(typ + " " + (r.titre || ""));
  const res = { url, id: c.id, type, explication, date: String(r.uin_dat_amf || "").slice(0, 10), chiffres: [], lecture: [], extraits: [] };
  if (/droits de vote|nombre total/i.test(typ)) return { ...res, lecture: [explication] };
  try {
    const rr = await fetch(url, { headers: { "user-agent": UA } }); if (!rr.ok) return { ...res, lecture: [explication] };
    const buf = await rr.arrayBuffer(); if (buf.byteLength > 6e6) return { ...res, lecture: [explication] };
    const x = plausible(extractFR(await pdfText(buf)), summaryOf(c.id)), per = q => q === "trimestre" ? " du trimestre" : q === "semestre" ? " du semestre" : q === "année" ? " de l'année" : "";
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
  return { g1: c.ca && c.caPrev ? c.ca / c.caPrev - 1 : null, dps: c.dps || null, ca: c.ca || null, eps: c.eps || null };
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
  writeFileSync(file, JSON.stringify({ updated: new Date().toISOString(), items: keep }));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
