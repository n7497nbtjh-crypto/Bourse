// Rapports annuels lus sur le site de chaque entreprise (4/11/2026).
// Une seule méthode pour tous les pays : toute société cotée publie son rapport annuel sur son site ; dans l'Union européenne
// et au Royaume-Uni, il existe aussi au format ESEF (lisible par une machine), le même que celui lu à l'AMF et sur filings.xbrl.org.
// Le robot part du domaine de l'entreprise (univers), respecte robots.txt, lit le plan du site et les pages « investisseurs »,
// repère le paquet ESEF le plus récent (.zip, .xhtml), le lit avec ixbrlToJson (data/amf.mjs) et vérifie que l'identifiant
// LEI du document est bien celui de l'entreprise.
// Étape 2 (à venir) : le rapport en PDF pour les pays sans ESEF.
import { inflateRawSync } from "node:zlib";

const UA = "Mozilla/5.0 (compatible; ENKLAIR-bot/1.0; +https://enklair.com/methode)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOTS = /(investor|investoren|ir\b|\/ir\/|annual|jahres|geschaeftsbericht|geschäftsbericht|gesch(ae|ä)fts|finanzbericht|financial[-_ ]?reports?|reports?[-_ ]and[-_ ]presentations|publications|publikationen|berichte|results|downloads?|esef|rapport|relazion|informe|bericht)/i;
const FICHIER = /\.(zip|xhtml|xbrl)(\?|#|$)/i;

// robots.txt : règles « User-agent: * » (et ENKLAIR) ; renvoie une fonction ok(chemin)
export function robots(txt) {
  const groupes = [], L = String(txt || "").split(/\r?\n/).map(l => l.replace(/#.*/, "").trim()).filter(Boolean);
  let cur = null;
  for (const l of L) {
    const [k, ...v] = l.split(":"), val = v.join(":").trim(), key = k.trim().toLowerCase();
    if (key === "user-agent") { if (!cur || cur.regles.length) { cur = { agents: [], regles: [] }; groupes.push(cur); } cur.agents.push(val.toLowerCase()); }
    else if (cur && (key === "allow" || key === "disallow")) cur.regles.push([key, val]);
  }
  const g = groupes.find(x => x.agents.some(a => a.includes("enklair"))) || groupes.find(x => x.agents.includes("*"));
  const sitemaps = L.filter(l => /^sitemap:/i.test(l)).map(l => l.replace(/^sitemap:\s*/i, ""));
  const re = p => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  return { sitemaps, ok: chemin => {
    if (!g) return true; let best = null;
    for (const [k, p] of g.regles) { if (!p) { if (k === "disallow") continue; } if (re(p).test(chemin) && (!best || p.length > best[1].length || (p.length === best[1].length && k === "allow"))) best = [k, p]; }
    return !best || best[0] === "allow";
  } };
}

async function get(u, { binaire = false, max = 4e6 } = {}) {
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: binaire ? "*/*" : "text/html,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(binaire ? 120000 : 25000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  if (binaire) return Buffer.from(await r.arrayBuffer());
  const t = await r.text(); return { t: t.slice(0, max), url: r.url };
}
const liens = (html, base) => {
  const out = [];
  for (const m of String(html).matchAll(/<a\b[^>]*?href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    try { out.push({ u: new URL(m[1].replace(/&amp;/g, "&"), base).href, t: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }); } catch (e) { }
  }
  for (const m of String(html).matchAll(/["'](https?:\/\/[^"'\s]+?\.(?:zip|xhtml)(?:\?[^"'\s]*)?)["']/gi)) out.push({ u: m[1], t: "" }); // liens écrits dans des scripts
  return out;
};
const annee = s => Math.max(0, ...[...String(s).matchAll(/(?<!\d)(20[12]\d)(?!\d)/g)].map(m => +m[1]));

// Cherche les paquets ESEF publiés sur le site ; renvoie [{ u, t, an, score }] du plus prometteur au moins prometteur
export async function trouverRapports(domaine, { lei = "", maxPages = 45, log = () => { } } = {}) {
  const base = /^https?:/.test(domaine) ? domaine : "https://www." + domaine.replace(/^www\./, "");
  let rb = { ok: () => true, sitemaps: [] };
  try { rb = robots((await get(new URL("/robots.txt", base).href)).t); } catch (e) { }
  const host = new URL(base).hostname.replace(/^www\./, ""), meme = u => { try { return new URL(u).hostname.replace(/^www\./, "").endsWith(host.split(".").slice(-2).join(".")); } catch (e) { return false; } };
  const permis = u => { try { const x = new URL(u); return rb.ok(x.pathname + x.search); } catch (e) { return false; } };
  const fichiers = new Map(), aVoir = [], vus = new Set();
  const pdfs = new Map();
  const noterPdf = (u, t) => {
    if (!/\.pdf(\?|#|$)/i.test(u)) return; const x = (u + " " + t).toLowerCase();
    let sc = (/(consolidated|konzernabschluss|konzern|annual[-_ ]?report|gesch(ae|ä)ftsbericht|financial[-_ ]statements?|jahresfinanzbericht|integrated[-_ ]report|rapport[-_ ]annuel|document[-_ ]d.enregistrement|årsredovisning|arsredovisning|aarsrapport|årsrapport|annual[-_ ]financial[-_ ]report|relazione[-_ ]finanziaria|informe[-_ ]anual)/.test(x) ? 30 : 0)
      + (/(consolidated|konzern)/.test(x) ? 15 : 0) + (/(full|complete|gesamt)/.test(x) ? 3 : 0)
      - (/(sustainab|nachhalt|esg|climate|compensation|remuneration|verg(ue|ü)tung|governance|supervisory|aufsichtsrat|auditor|pr(ue|ü)fungsvermerk|responsibility[-_ ]statement|half|halbjahr|interim|quartal|quarter|q[1-4][-_ .]|presentation|slides|statement[-_]|factbook|five[-_ ]year|5[-_ ]year|jahres(ue|ü)bersicht|invitation|agenda|hauptversammlung|agm|proxy|tax|summary|kurzbericht|highlights|magazine|letter|brochure|press|presse|fact[-_ ]sheet|green[-_ ]bond|prospectus|corporate[-_ ]social)/.test(x) ? 40 : 0)
      - (/(annual[-_ ]financial[-_ ]statement|jahresabschluss)/.test(x) && !/(konzern|consolidated)/.test(x) ? 15 : 0)
      - (/[-_ ](ag|se|plc|sa|nv|asa|ab|oyj)[-_ ](financial[-_ ]statements|jahresabschluss|annual[-_ ]accounts)/.test(x) && !/(group|konzern|consolidated)/.test(x) ? 25 : 0) // comptes de la seule société mère (BMW AG)
      + (/(group|konzern)/.test(x) ? 5 : 0);
    const an0 = annee(u + " " + t), anCour = new Date().getUTCFullYear(); if (an0 && an0 < anCour - 1) return; // rapport d'un exercice ancien
    if (/(north[-_ ]?america|latin|asia|china|india|brasil|brazil|mexico|usa|uk[-_]|japan|korea|nordic|schweiz|suisse|österreich|austria|deutschland[-_]gmbh|gmbh)/.test(x) && !/(group|konzern|consolidated)/.test(x)) sc -= 25; // rapport d'une filiale
    if (sc < 20) return; const f = pdfs.get(u) || { u, t, an: annee(u + " " + t), score: sc }; f.score = Math.max(f.score, sc); pdfs.set(u, f);
  };
  const noter = (u, t) => {
    noterPdf(u, t);
    if (!FICHIER.test(u) && !/esef/i.test(u)) return;
    const s = (lei && u.toUpperCase().includes(lei) ? 50 : 0) + (/esef/i.test(u + " " + t) ? 30 : 0) + (/\.zip/i.test(u) ? 10 : 0) + (/annual|jahres|gesch|report|bericht|afr/i.test(u + " " + t) ? 5 : 0)
      - (/(half|halb|interim|quartal|quarter|q[1-4]|semi|hy|h1)/i.test(u + " " + t) ? 40 : 0) - (/(sustainab|nachhalt|esg|remuneration|verguetung|vergütung|esrs)/i.test(u + " " + t) ? 30 : 0);
    if (s < 20) return;
    const f = fichiers.get(u) || { u, t, an: annee(u + " " + t), score: s }; f.score = Math.max(f.score, s); fichiers.set(u, f);
  };
  const ajouter = (u, prio) => { if (!vus.has(u) && meme(u) && permis(u) && !FICHIER.test(u) && !/\.(pdf|jpg|png|svg|mp4|css|js)(\?|$)/i.test(u)) { vus.add(u); aVoir.push([prio, u]); } };
  // plan du site : les adresses de pages « investisseurs », et les fichiers ESEF qui y figureraient
  const sms = rb.sitemaps.length ? rb.sitemaps.slice(0, 6) : [new URL("/sitemap.xml", base).href];
  for (let i = 0, n = 0; i < sms.length && n < 12; i++, n++) {
    try { const { t } = await get(sms[i], { max: 2e7 }); const locs = [...t.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].replace(/&amp;/g, "&"));
      for (const l of locs) { if (/\.xml(\.gz)?$/i.test(l) && sms.length < 40 && (MOTS.test(l) || /sitemap[-_]?(index|[0-9]|page|en|de|com)/i.test(l) || locs.length < 60)) { if (!/\.gz$/.test(l)) sms.push(l); continue; }
        noter(l, ""); if (MOTS.test(l) && /(annual|jahres|gesch|financial|report|bericht|publication|esef|download)/i.test(l)) ajouter(l, 3 + (/(annual|jahres|gesch|esef)/i.test(l) ? 2 : 0)); }
    } catch (e) { }
    await sleep(300);
  }
  ajouter(base + "/", 1);
  for (const p of ["/investors", "/investor-relations", "/en/investors", "/de/investoren", "/en/investor-relations", "/investoren"]) ajouter(new URL(p, base).href, 0);
  let lues = 0;
  while (aVoir.length && lues < maxPages) {
    aVoir.sort((a, b) => b[0] - a[0]); const [prio, u] = aVoir.shift();
    let page; try { page = await get(u); lues++; } catch (e) { continue; }
    for (const l of liens(page.t, page.url)) {
      noter(l.u, l.t);
      if (MOTS.test(l.u + " " + l.t)) { const a = annee(l.u + " " + l.t), an = new Date().getUTCFullYear(); if (a && a < an - 1) continue;
        ajouter(l.u, prio - 1 + (/(annual|jahres|gesch|esef|financial[-_ ]report|publication)/i.test(l.u + " " + l.t) ? 3 : 0) + (a >= an - 1 ? 2 : 0)); }
    }
    await sleep(500);
  }
  log(`${host} : ${lues} pages lues, ${fichiers.size} fichiers ESEF, ${pdfs.size} rapports PDF candidats`);
  const tri = L => L.sort((a, b) => (b.an || 9999) - (a.an || 9999) || b.score - a.score); // sans année dans le lien : celui de la page de l'exercice en cours
  return { esef: tri([...fichiers.values()]), pdf: tri([...pdfs.values()]) };
}
export async function trouverEsef(domaine, o) { return (await trouverRapports(domaine, o)).esef; }

/* ---------- Étape 2 : comptes lus dans le rapport annuel en PDF (texte de pdftotext -layout) ----------
   On cherche la page du compte de résultat consolidé (une ligne de ventes et une ligne de résultat net, chacune avec
   au moins deux colonnes de chiffres, et l'unité « in millions of € »…), puis le bilan (capitaux propres, trésorerie).
   Colonnes : les deux derniers nombres d'une ligne (exercice, exercice précédent), dans l'ordre des années de l'en-tête. */
const NB = /\(?[−–-]?\s?\d{1,3}(?:[,. ' ]\d{3})*(?:[.,]\d+)?\)?|\(?[−–-]?\d+(?:[.,]\d+)?\)?|^[−–-]$/g;
export function nombre(tok, allemand = false) {
  let t = String(tok).trim(); if (/^[−–-]$/.test(t)) return 0;
  const neg = /^\(.*\)$/.test(t) || /^[−–-]/.test(t); t = t.replace(/[()−–\-\s'’\u202f\u00a0]/g, "");
  if (allemand) t = t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  else { if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(/,(?=\d{3}(\D|$))/g, "").replace(",", "."); }
  const v = Number(t); return isFinite(v) ? (neg ? -v : v) : null;
}
const LIB = {
  ca: /^(total\s+)?(net\s+)?(revenues?|sales|turnover|umsatzerl[öo]se|umsatz|revenue from contracts with customers|chiffre d'affaires|ricavi|ventas|omsättning|nettoomsättning|omsetning|liikevaihto|omzet|net revenues?)\b/i,
  ebit: /^(operating (profit|income|result)|income from operations|profit (\(loss\) )?from operations|result from operating activities|ebit\b|betriebsergebnis|operatives ergebnis|r[ée]sultat op[ée]rationnel|rörelseresultat|driftsresultat|liikevoitto)/i,
  net: /^(net (income|profit|result|earnings)|profit (for|of) the (year|period|financial year)|consolidated net (income|profit)|group net (income|profit)|profit after tax(es)?|konzern(jahres)?(ergebnis|überschuss)|jahresüberschuss|periodenergebnis|r[ée]sultat net|årets resultat|utile netto|net income \(loss\)|profit \(loss\) for the (year|period)|profit attributable to|profit \(loss\)(?=\s*$)|profit for the year)(?![a-z])/i,
  netPart: /^(shareholders of|owners of the (parent|company)|equity holders of|attributable to (shareholders|owners|equity holders)|aktionäre|anteilseigner|actionnaires|propriétaires|.{0,30}attributable to (the )?(owners|shareholders|equity holders|stockholders))/i,
  equity: /^(total (shareholders'? )?equity( attributable to (shareholders|owners|equity holders)[^0-9]*)?|eigenkapital(\s+gesamt)?|summe eigenkapital|total des capitaux propres)/i,
  cash: /^(cash and cash equivalents|zahlungsmittel und zahlungsmitteläquivalente|trésorerie et équivalents)/i,
};
export function lireComptesPdf(texte) {
  const pages = String(texte).split("\f"), out = { years: {}, pages: {} };
  const allemand = (texte.match(/\d\.\d{3},\d/g) || []).length > (texte.match(/\d,\d{3}\.\d/g) || []).length && (texte.match(/\b\d{1,3}\.\d{3}\b/g) || []).length > (texte.match(/\b\d{1,3},\d{3}\b/g) || []).length;
  const unite = p => { const lc = p.split("\n").find(l => /(millions?|mio\.?|thousands?|tsd\.?|tausend|billions?|mrd\.?)/i.test(l) && /(€|\beur\b|\busd\b|\$|\bchf\b|£|\bgbp\b|\bsek\b|\bnok\b|\bdkk\b|\bjpy\b|¥)/i.test(l) && l.trim().length < 140);
    if (lc) { const ech = /thousand|tsd|tausend/i.test(lc) ? 1e-3 : /billion|mrd/i.test(lc) ? 1e3 : 1; const dev = /€|eur/i.test(lc) ? "EUR" : /chf/i.test(lc) ? "CHF" : /£|gbp/i.test(lc) ? "GBP" : /sek/i.test(lc) ? "SEK" : /nok/i.test(lc) ? "NOK" : /dkk/i.test(lc) ? "DKK" : /jpy|¥/i.test(lc) ? "JPY" : "USD"; return { ech, dev }; }
    const m = p.match(/(in|en|In|EUR|USD|CHF|GBP|SEK|NOK|DKK|€|\$|£)[^\n]{0,30}?(millions?|mio\.?|mn|m\b|thousands?|tsd\.?|tausend|billions?|mrd\.?)/i) || p.match(/(millions?|mio\.?|thousands?|tsd\.?|tausend)\s*(of\s*)?(€|eur|euro|usd|\$|chf|£|gbp|sek|nok|dkk|jpy|¥)/i);
    if (!m) return null; const i0 = p.lastIndexOf("\n", m.index) + 1, s = p.slice(i0, p.indexOf("\n", m.index) > 0 ? p.indexOf("\n", m.index) : undefined); const ech = /thousand|tsd|tausend/i.test(s) ? 1e-3 : /billion|mrd/i.test(s) ? 1e3 : 1;
    const dev = /€|eur/i.test(s) ? "EUR" : /chf/i.test(s) ? "CHF" : /£|gbp/i.test(s) ? "GBP" : /sek/i.test(s) ? "SEK" : /nok/i.test(s) ? "NOK" : /dkk/i.test(s) ? "DKK" : /jpy|¥/i.test(s) ? "JPY" : /usd|\$/i.test(s) ? "USD" : null;
    return { ech, dev }; };
  const lignes = p => p.split("\n").map(l => { const t = l.replace(/\s+$/, ""); const lab = t.replace(/^\s+/, "").split(/\s{2,}|\s(?=\(?[−–-]?\d)/)[0].trim();
    const d0 = t.indexOf(lab) + lab.length, pos = [];
    for (const m of t.slice(d0).matchAll(/\(?[−–-]?\d[\d,.'’\u202f\u00a0]*\d\)?|\(?[−–-]?\d\)?|(?<=\s)[−–-](?=\s|$)/g)) { const v = nombre(m[0].trim(), allemand); if (v != null) pos.push({ v, fin: d0 + m.index + m[0].length, pct: /%/.test(t.slice(d0 + m.index + m[0].length, d0 + m.index + m[0].length + 2)) }); }
    return { lab, raw: t, pos, nums: pos.map(x => x.v) }; });
  const annees = p => { for (const l of p.split("\n")) { const M = [...l.matchAll(/(?<![\d.,])(20[0-3]\d)(?![\d.,])/g)], ys = M.map(m => +m[1]); if (ys.length >= 2 && Math.abs(ys[0] - ys[1]) === 1) { const r = ys.slice(); r.fins = M.map(m => m.index + 4); return r; } } return null; };
  // valeur de la ligne sous la colonne d'une année (fin du nombre alignée sur la fin de l'année de l'en-tête, à 14 caractères près) ; sinon ordre des deux derniers nombres
  const sous = (ligne, ys, i) => { if (ys.fins) { let best = null; for (const x of ligne.pos) { if (x.pct) continue; const d = Math.abs(x.fin - ys.fins[i]); if (d <= 14 && (!best || d < best.d)) best = { d, v: x.v }; } if (best) return best.v; }
    const n = ligne.nums; return ys[0] > ys[1] ? (i === 0 ? n.at(-2) : n.at(-1)) : (i === 0 ? n.at(-1) : n.at(-2)); };
  const cherche = (L, re, depuis = 0) => { for (let i = depuis; i < L.length; i++) if (re.test(L[i].lab) && L[i].nums.length >= 2) return [L[i], i]; return [null, -1]; };
  // compte de résultat
  const TITRE = /(consolidated|group|konzern)[\s-]*(income statements?|statements? of (income|profit or loss|operations|comprehensive income)|profit and loss|gewinn- und verlustrechnung)|konzern-gewinn|compte de r[ée]sultat consolid/i;
  // chaque page candidate est lue ; on garde la meilleure : titre « compte de résultat consolidé », chiffres en millions (pas arrondis au milliard), nombre de lignes chiffrées
  const cands = [];
  for (let k = 0; k < pages.length; k++) { const out = { years: {} };
    const p = pages[k], u = unite(p), ys = annees(p); if (!u || !ys) continue;
    if (/(table of contents|contents|inhalt|sommaire)/i.test(p.slice(0, 600)) && (p.match(/\.{5,}/g) || []).length > 3) continue; // sommaire
    if (!TITRE.test(p.slice(0, 1500))) continue; // 4/11 : seulement la page titrée « compte de résultat consolidé » (pas les chiffres clés, ni un tableau par activité)
    if (/\b(Q[1-4]|quarter|quartal|nine months|9M|H1|half[- ]year|halbjahr|six months|first half|9 months|trimestre|semestre)\b/i.test(p.slice(0, 1200))) continue; // compte trimestriel ou semestriel
    const L = lignes(p + "\n" + (pages[k + 1] || "").split(/statements? of (financial position|comprehensive)|balance sheet|bilanz/i)[0]), [ca] = cherche(L, LIB.ca), [net, iNet] = cherche(L, LIB.net); // le compte de résultat continue souvent sur la page suivante
    if (!ca || !net || ca.nums.at(-2) <= 0) continue;
    const iNew = ys[0] > ys[1] ? 0 : 1, ordre = [ys[iNew], ys[1 - iNew]];
    const put = (key, ligne, echelle = u.ech) => { if (!ligne) return; const a = sous(ligne, ys, iNew), b = sous(ligne, ys, 1 - iNew); if (a == null || b == null) return; (out.years[ordre[0]] = out.years[ordre[0]] || {})[key] = a * echelle; (out.years[ordre[1]] = out.years[ordre[1]] || {})[key] = b * echelle; };
    put("ca", ca); put("ebit", cherche(L, LIB.ebit)[0]);
    let part = null; for (let i = iNet + 1; i < Math.min(L.length, iNet + 6); i++) if (LIB.netPart.test(L[i].lab) && L[i].nums.length >= 2) { part = L[i]; break; }
    put("net", part || net);
    const iE = L.findIndex(l => /basic earnings per share|unverwässert|résultat (net )?par action|earnings per share/i.test(l.lab));
    if (iE >= 0) for (let i = iE; i < Math.min(L.length, iE + 6); i++) if (L[i].nums.length >= 2 && (LIB.net.test(L[i].lab) || /earnings per share|per share/i.test(L[i].lab)) && Math.abs(L[i].nums.at(-2)) < 1e4 && /[.,]\d\d\b/.test(L[i].raw)) { put("eps", L[i], 1); break; }
    out.currency = u.dev; out.page = k + 1; out.ordre = ordre;
    const fin = (p + "\n" + pages.slice(k + 1, k + 4).join("\n")).match(/(september|december|march|june)\s+(30|31),?\s+20\d\d|(30|31)\.\s?(september|dezember|märz|juni)|(31|30)\s+(décembre|septembre|mars|juin)/i);
    const MOIS = { september: "09-30", december: "12-31", dezember: "12-31", march: "03-31", märz: "03-31", june: "06-30", juni: "06-30", décembre: "12-31", septembre: "09-30", mars: "03-31", juin: "06-30" };
    out.fyEnd = fin ? MOIS[(fin[1] || fin[4] || fin[6] || "").toLowerCase()] || null : null;
    out.score = (TITRE.test(p.slice(0, 1500)) ? 10 : 0) + (u.ech === 1 || u.ech === 1e-3 ? 3 : 0) + Math.min(10, L.filter(l => l.nums.length >= 2).length / 3) + (/(segment|division|automotive|business unit)/i.test(p.slice(0, 600)) ? -8 : 0);
    // bilan : page suivante qui porte les capitaux propres
    for (let j = k + 1; j < Math.min(pages.length, k + 6); j++) {
      const Lb = lignes(pages[j]), ub = unite(pages[j]) || u, [eq] = cherche(Lb, LIB.equity), [cash] = cherche(Lb, LIB.cash);
      if (eq) { const yb = annees(pages[j]); if (yb) { const ib = yb[0] > yb[1] ? 0 : 1;
        for (const [key, ligne] of [["equity", eq], ["cash", cash]]) if (ligne) { const a = sous(ligne, yb, ib), b = sous(ligne, yb, 1 - ib); if (a == null || b == null) continue; if (out.years[ordre[0]]) out.years[ordre[0]][key] = a * ub.ech; if (out.years[ordre[1]]) out.years[ordre[1]][key] = b * ub.ech; } }
        break; }
    }
    cands.push(out);
  }
  const best = cands.sort((a, b) => b.score - a.score)[0] || { years: {} };
  if (pages.length < 30) best.years = {}; // un rapport annuel complet compte des dizaines de pages ; un document court est un communiqué ou un extrait
  // fin d'exercice : la date de clôture la plus citée dans tout le document (« December 31, 2025 », « 30. September 2025 »…)
  const MOIS2 = { "12-31": /(december|dezember|décembre|dicembre|diciembre)\s*31|31\.?\s*(december|dezember|décembre|dicembre|diciembre)/gi, "09-30": /(september|septembre|settembre)\s*30|30\.?\s*(september|septembre|settembre)/gi, "03-31": /(march|märz|mars|marzo)\s*31|31\.?\s*(march|märz|mars|marzo)/gi, "06-30": /(june|juni|juin|giugno|junio)\s*30|30\.?\s*(june|juni|juin|giugno|junio)/gi };
  const cpt = Object.entries(MOIS2).map(([k, re]) => [k, (texte.match(re) || []).length]).sort((a, b) => b[1] - a[1]);
  if (cpt[0][1] >= 3) best.fyEnd = cpt[0][0];
  Object.assign(out, best);
  // contrôles : ventes positives, bénéfice plus petit que les ventes, deux exercices
  const ys = Object.keys(out.years); out.ok = ys.length === 2 && ys.every(y => out.years[y].ca > 0 && out.years[y].net != null && Math.abs(out.years[y].net) < out.years[y].ca) && !!out.currency;
  return out;
}

/* ---------- Le robot : sociétés sans comptes → rapport annuel PDF de leur site ---------- */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const robotsCache = new Map();
async function permisFichier(u) { // robots.txt de l'hôte du fichier (souvent un serveur de documents distinct)
  const h = new URL(u).origin; if (!robotsCache.has(h)) { let rb = { ok: () => true }; try { rb = robots((await get(h + "/robots.txt")).t); } catch (e) { } robotsCache.set(h, rb); }
  const x = new URL(u); return robotsCache.get(h).ok(x.pathname + x.search);
}
export function pdfTexte(buf) {
  const dir = mkdtempSync(tmpdir() + "/rs-"), f = dir + "/a.pdf";
  try { writeFileSync(f, buf); return execFileSync("pdftotext", ["-q", "-layout", "-l", "400", f, "-"], { maxBuffer: 200e6 }).toString("utf8"); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
// Comptes d'une société à partir de son site : { comptes, url } ou null (raison dans log)
export async function comptesDuSite(c, { log = () => { }, essais = 4 } = {}) {
  if (!c.domain) return null;
  const R = await trouverRapports(c.domain, { lei: c.lei || "", log });
  const vu = new Set();
  for (const f of R.pdf.slice(0, 12)) {
    if (vu.size >= essais) break;
    if (vu.has(f.u) || !(await permisFichier(f.u).catch(() => false))) continue; vu.add(f.u);
    try {
      const buf = await get(f.u, { binaire: true }); if (buf.length > 80e6 || buf.slice(0, 4).toString() !== "%PDF") continue;
      const r = lireComptesPdf(pdfTexte(buf));
      if (!r.ok) { log(`  ${f.u.slice(-70)} : compte de résultat non trouvé`); continue; }
      const dernier = Math.max(...Object.keys(r.years).map(Number));
      if (Date.parse(`${dernier}-${r.fyEnd || "12-31"}T00:00:00Z`) > Date.now()) { log(`  ${f.u.slice(-70)} : exercice ${dernier} pas encore clos (rapport semestriel ?)`); continue; }
      if (dernier < new Date().getUTCFullYear() - 2) { log(`  ${f.u.slice(-70)} : exercice ${dernier}, trop ancien`); continue; }
      return { comptes: r, url: f.u, dernier };
    } catch (e) { log(`  ${f.u.slice(-70)} : ${e.message}`); }
    await sleep(800);
  }
  return null;
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const { default: U } = await import("./univers.mjs"), { toSeries } = await import("./esef.mjs"), { summary, VERSION } = await import("./fetch_data.mjs");
  const OUT = new URL("../cf/site/data/", import.meta.url), CACHE = new URL("./rapports_site_cache.json", import.meta.url);
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const idx = JSON.parse(readFileSync(new URL("societes.json", OUT), "utf8")), parId = new Map(idx.companies.map((c, i) => [c.id, i]));
  const seuls = (arg("--ids", "") || "").split(",").filter(Boolean), minutes = +arg("--minutes", 50), stop = Date.now() + minutes * 60e3, nPar = +arg("--paralleles", 6);
  const reessai = 20 * 864e5; // un échec est retenté au bout de 20 jours (nouveau rapport, site modifié)
  const todo = U.filter(c => c.domain && !c.sec && !c.cik && (seuls.length ? seuls.includes(c.id) : (() => { const s = idx.companies[parId.get(c.id)]; return !s || s.missing; })())
    && (seuls.length || !cache[c.id] || (!cache[c.id].ok && Date.now() - Date.parse(cache[c.id].d) > reessai)));
  console.log(todo.length, "sociétés à chercher sur leur site");
  let ok = 0, n = 0;
  const une = async c => {
    if (Date.now() > stop) return;
    const L = []; let r = null;
    try { r = await comptesDuSite(c, { log: m => L.push(m) }); } catch (e) { L.push("panne " + e.message); }
    n++;
    cache[c.id] = { d: new Date().toISOString().slice(0, 10), ok: !!r, ...(r ? { u: r.url, an: r.dernier } : { pourquoi: L.slice(-3).join(" | ").slice(0, 300) }) };
    if (!r) { console.log("✗", c.id, L.slice(-1)[0] || ""); return; }
    const s = toSeries({ currency: r.comptes.currency, fyEnd: r.comptes.fyEnd, years: r.comptes.years, norme: "IFRS" });
    const full = { v: VERSION, devise2: true, dette3: true, id: c.id, name: c.name, ticker: c.ticker, tv: c.tv, isin: c.isin, region: c.region, domain: c.domain, desc: c.desc, lei: c.lei || null, legalName: c.legal || c.name, sector: c.sector,
      ...s, sourcePdf: true, sources: [{ periodEnd: `${r.dernier}-${r.comptes.fyEnd || "12-31"}`, report: r.url, json: null, source: "Rapport annuel publié sur le site de l'entreprise (PDF)" }], updated: new Date().toISOString().slice(0, 10) };
    writeFileSync(new URL(`societes/${c.id}.json`, OUT), JSON.stringify(full));
    const k = parId.get(c.id); if (k != null) idx.companies[k] = summary(full); else { parId.set(c.id, idx.companies.length); idx.companies.push(summary(full)); }
    ok++; console.log("✓", c.id, r.dernier, r.comptes.currency, "ventes", Math.round(r.comptes.years[r.dernier].ca), "net", Math.round(r.comptes.years[r.dernier].net));
    if (ok % 10 === 0) { writeFileSync(new URL("societes.json", OUT), JSON.stringify(idx)); writeFileSync(CACHE, JSON.stringify(cache)); }
  };
  const file = todo.slice(); await Promise.all(Array.from({ length: nPar }, async () => { while (file.length && Date.now() < stop) await une(file.shift()); }));
  writeFileSync(new URL("societes.json", OUT), JSON.stringify(idx)); writeFileSync(CACHE, JSON.stringify(cache, null, 0));
  console.log(`${n} sociétés cherchées, ${ok} comptes trouvés.`);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) await main();
