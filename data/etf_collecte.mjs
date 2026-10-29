// Collecte mensuelle des ETF : catalogue officiel des émetteurs + composition de chaque fonds.
//   node data/etf_collecte.mjs            catalogue + compositions
//   node data/etf_collecte.mjs catalogue  catalogue seulement
// Sorties :
//   data/etf_catalogue.json        les ETF retenus, au format de etf.json (data/etf.mjs les ajoute à la liste choisie à la main)
//   cf/site/data/etf/<id>.json     composition détaillée d'un ETF, chargée à la demande par la page de l'ETF et le portefeuille
// Format d'un fichier de composition : voir CHANTIERS.md (section ETF).
// Règles : sources officielles des émetteurs uniquement, robots.txt respectés, une requête par seconde environ par site.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { categorie, indexLisible, indexCle, slug, pays, secteur, SECTEURS_ETF, isoDate } from "./etf_lib.mjs";
import * as EM from "./etf_emetteurs.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const OUTC = ROOT + "data/etf_catalogue.json", OUTD = ROOT + "cf/site/data/etf/";
const T0 = Date.now(), JOURNAL = [];
const log = (...a) => { const s = `[${Math.round((Date.now() - T0) / 1000)} s] ` + a.join(" "); JOURNAL.push(s); console.log(s); };
const r1 = x => x == null ? null : Math.round(x * 10) / 10, r2 = x => x == null ? null : Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;
const FX = (() => { try { return JSON.parse(readFileSync(ROOT + "cf/site/data/fx.json", "utf8")).eur; } catch (e) { return { EUR: 1, USD: 0.86, GBP: 1.17, CHF: 1.07, JPY: 0.0057 }; } })();
const enEuros = (v, cur) => v == null ? null : v * (FX[(cur || "EUR").toUpperCase().replace("GBX", "GBP")] || (cur ? null : 1) || 1);
const { CHOISIS: CURATED } = await import("./etf.mjs");
const PLACES_FR = ["Euronext Paris", "Xetra", "Euronext Amsterdam"];
const ISSUER_DOM = { Amundi: "amundi.com", iShares: "ishares.com", SPDR: "ssga.com", Invesco: "invesco.com" };

// ---------------------------------------------------------------- 1. Catalogue
const avant = existsSync(OUTC) ? JSON.parse(readFileSync(OUTC, "utf8")) : { list: [], brut: {} };
const brut = {};
async function lire(nom, f) {
  try { const l = await f(); if (l.length < 5) throw new Error("liste presque vide (" + l.length + ")"); brut[nom] = l; log(nom, ":", l.length, "parts lues"); }
  catch (e) { log("ÉCHEC", nom, e.message, "(on garde la collecte précédente)"); brut[nom] = null; }
}
const cible = x => (x.aumM == null || x.aumM >= 20 || /PEA/.test(x.name || "")) && !/hedged|couvert/i.test(x.name || "");
await lire("amundi", () => EM.amundi(log));
await lire("ishares", () => EM.ishares(log, { detail: cible }));
await lire("spdr", () => EM.spdr(log, { detail: () => true }));
await lire("invesco", () => EM.invesco(log));

const nomCourt = n => String(n || "").replace(/[®™]/g, "").replace(/^State Street\s+SPDR\b/, "SPDR").replace(/\bUCITS\b/g, "").replace(/\bETF\b/g, "").replace(/\s+-\s+/g, " ").replace(/\b(USD|EUR|GBP|CHF|JPY)\b(?=\s*(\(|Acc|Dist|$))/g, "").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim()
  .replace(/\s*\(Acc\)$|\s+Acc$/i, " (capitalisation)").replace(/\s*\(Dist\)$|\s+Dist$/i, " (distribution)").replace(/\s+/g, " ").trim();
const LEVIER = /leveraged|levier|\(-?\d(\.\d)?x\)|daily \(-?\d|inverse|short strategy|\bshort\b|bear|ultra/i;

function normalise(r) {
  const index = indexLisible(r.indexOfficiel || "", r.name);
  const listings = (r.listings || []).filter(l => l && l.ticker);
  const pick = PLACES_FR.map(p => listings.find(l => l.place === p && (!l.devise || /EUR/i.test(l.devise))) || listings.find(l => l.place === p)).find(Boolean);
  const encours = r1(enEuros(r.aumM, r.aumCur || r.devise)) ?? r1(r.fondsM);
  return { isin: r.isin, name: nomCourt(r.name), nomOfficiel: r.name, issuer: r.issuer, index: index || null, indexOfficiel: r.indexOfficiel || null, categorie: categorie({ classe: r.classe, index: r.indexOfficiel || "", name: r.name }),
    ter: r.ter != null ? r2(r.ter) : null, pea: r.pea ?? null, distribution: r.distribution || null, replication: r.replication || null, methode: r.methode || null, devise: r.devise || null, encours, creation: r.creation || null,
    domicile: r.domicile ? ({ Ireland: "Irlande", France: "France", Luxembourg: "Luxembourg", Germany: "Allemagne", IE: "Irlande", LU: "Luxembourg", FR: "France", DE: "Allemagne" }[r.domicile] || r.domicile) : null,
    ticker: pick ? pick.ticker : null, tv: pick ? (pick.place === "Xetra" ? "XETR:" : "EURONEXT:") + pick.ticker : null, cotations: listings.filter(l => PLACES_FR.includes(l.place)).map(l => ({ place: l.place, ticker: l.ticker, devise: l.devise || null })),
    couvert: !!r.couvert || /hedged|couvert/i.test(r.name || "") || undefined, levier: LEVIER.test((r.name || "") + " " + (r.indexOfficiel || "")) || undefined, contrepartie: r.contrepartie || undefined,
    nIndex: r.nIndex || undefined, url: r.url || null, src: { amundi: "amundietf.fr", ishares: "blackrock.com/fr", spdr: "ssga.com", invesco: "invesco.com/fr" }[r.ref && r.ref.type] || null, _r: r };
}
let all = [];
for (const [nom, l] of Object.entries(brut)) {
  if (l) all.push(...l.map(normalise));
  else all.push(...(avant.list || []).filter(e => e._em === nom));   // émetteur injoignable : ancienne liste
}
// Sélection : coté à Paris, Francfort (Xetra) ou Amsterdam ; tous les ETF éligibles au PEA, les autres à partir de 50 M€ d'encours
const curIsin = new Set(CURATED.map(e => e.isin));
const sel = all.filter(e => curIsin.has(e.isin) || (e.cotations && e.cotations.length && e.ter != null && e.index && e.categorie && (e.pea === true || (e.encours || 0) >= 50) && !(e.couvert && (e.encours || 0) < 300)));
log("catalogue :", all.length, "parts lues,", sel.length, "retenues");

// Identifiants : ceux de la liste choisie à la main ne changent jamais ; les autres viennent du nom (stables d'un mois à l'autre via le catalogue précédent)
const oldId = Object.fromEntries((avant.list || []).map(e => [e.isin, e.id]));
const used = new Set(CURATED.map(e => e.id));
for (const e of sel) {
  const c = CURATED.find(x => x.isin === e.isin);
  if (c) { e.id = c.id; continue; }
  let id = oldId[e.isin] && !used.has(oldId[e.isin]) ? oldId[e.isin] : slug(e.name.replace(/\((capitalisation|distribution)\)/, m => m.includes("cap") ? "acc" : "dist")).slice(0, 70);
  if (used.has(id)) id = (id.slice(0, 60) + "-" + e.isin.slice(-4).toLowerCase());
  used.add(id); e.id = id;
}

// ---------------------------------------------------------------- 2. Compositions
const fin = () => {
  const list = sel.map(({ _r, ...e }) => ({ ...e, _em: _r ? _r.ref && _r.ref.type : e._em })).sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(OUTC, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), note: "Fabriqué par data/etf_collecte.mjs à partir des sites des émetteurs. Ne pas modifier à la main.", journal: JOURNAL.slice(-80), list }, null, 0).replace(/\},\{"isin"/g, '},\n{"isin"'));
};
if (process.argv[2] === "catalogue") { fin(); process.exit(0); }

let XLSX = null; try { XLSX = (await import("xlsx")).default; } catch (e) { log("module xlsx absent : compositions SPDR ignorées"); }
mkdirSync(OUTD, { recursive: true });
const EQ = /equity|action|ordinary|common|stock|adr|gdr|reit|preferred|^ec$/i, CASH = /cash|liquidit|money market|monétaire|future|forward|swap|fx|devise|derivative|dérivé|collateral/i;

// Résumé commun à toutes les sources. lines : [{ name, isin, w (en %), pays, sect, type }]
function resume(lines, { n = null, asOf = null } = {}) {
  lines = lines.filter(l => l && l.w != null && isFinite(l.w));
  const tot = lines.reduce((a, l) => a + Math.max(0, l.w), 0) || 100;
  const scale = tot > 0 && (tot < 80 || tot > 120) ? 100 / tot : 1;          // poids en fraction ou somme anormale : on ramène à 100
  for (const l of lines) { l.w *= scale; l.p = pays(l.pays) || (l.isin && /^[A-Z]{2}/.test(l.isin) && !/^(XS|EU|QZ)/.test(l.isin) ? null : null); l.s = l.sect ? secteur(l.sect) : null; if (l.type && CASH.test(l.type) && !EQ.test(l.type)) l.s = "liquidites"; }
  const titres = lines.filter(l => l.s !== "liquidites" && !/^(cash|eur cash|usd cash)/i.test(l.name || ""));
  // une même entreprise peut apparaître deux fois (ex. Alphabet A et C) : on garde les lignes telles que publiées
  const top = [...titres].sort((a, b) => b.w - a.w).slice(0, 15).map(l => ({ name: l.name, isin: l.isin || null, pct: r2(l.w), country: l.p || null, sector: l.s || null }));
  const agg = k => { const m = {}; for (const l of lines) { const key = l[k]; if (!key) continue; m[key] = (m[key] || 0) + l.w; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([x, v]) => [x, r1(v)]).filter(x => x[1] >= 0.05); };
  const isins = titres.filter(l => l.isin && l.w >= 0.003).sort((a, b) => b.w - a.w).slice(0, 4000).map(l => [l.isin, r3(l.w)]);
  return { asOf, lines: n || titres.length, top, countries: agg("p").slice(0, 25), sectors: agg("s"), isins, couverture: r1(lines.filter(l => l.s).reduce((a, l) => a + l.w, 0)) };
}
// Répartitions déjà agrégées publiées par Amundi (indice ou fonds)
function amundiBD(bd, niveau) {
  const T = bd[niveau + "_TOP10"], S = bd[niveau + "_SECTORS"], C = bd[niveau + "_COUNTRIES"]; if (!T || !T.length) return null;
  const top = T.map(x => ({ name: x.n, isin: x.isin || null, pct: r2(x.w * 100), country: pays(x.pays), sector: secteur(x.sect) }));
  const merge = (arr, f) => { const m = {}; for (const x of arr || []) { const k = f(x.n); if (k) m[k] = (m[k] || 0) + x.w * 100; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r1(v)]); };
  return { top, sectors: merge(S, n => /other|autre/i.test(n) ? "autre" : secteur(n)), countries: merge(C, n => pays(n) || (/other|autre/i.test(n) ? null : null)) };
}
const compo = {};      // id -> fichier
const parIndice = {};  // clé d'indice -> meilleure composition complète (fonds physique)
let nOk = 0;
for (const e of sel) {
  const r = e._r; if (!r) continue;
  const t = r.ref && r.ref.type;
  try {
    let res = null, source = null, niveau = "fonds";
    if (t === "amundi") {
      const bd = r.ref.bd || {};
      if (e.replication === "physique" && e.categorie !== "matieres") {
        const p = await EM.amundiPositions(e.isin);
        if (p && p.lines.length) { res = resume(p.lines, { n: p.n, asOf: p.asOf }); source = { nom: "Amundi, composition du fonds", url: e.url }; }
      }
      if (!res) { const b = amundiBD(bd, "INDEX"); if (b) { res = { asOf: null, lines: e.nIndex || null, ...b, isins: [] }; source = { nom: "Amundi, composition de l'indice", url: e.url }; niveau = "indice"; } }
    } else if (t === "ishares") {
      const p = await EM.isharesPositions(r);
      if (p && p.lines.length) { res = resume(p.lines, { asOf: p.asOf }); source = { nom: "iShares (BlackRock), positions du fonds", url: e.url }; }
    } else if (t === "spdr") {
      const p = await EM.spdrPositions(r, XLSX);
      if (p && p.lines.length) { res = resume(p.lines, { asOf: p.asOf }); source = { nom: "SPDR (State Street), positions du fonds", url: e.url }; }
    } else if (t === "invesco") {
      const p = await EM.invescoPositions(r);
      if (p && p.lines.length) { res = resume(p.lines, { asOf: p.asOf, n: p.n }); source = { nom: "Invesco, " + (p.niveau === "indice" ? "composition de l'indice" : "positions du fonds"), url: e.url }; niveau = p.niveau; }
    }
    if (!res) continue;
    // Fonds à réplication synthétique : ses positions réelles sont un panier de substitution, sans rapport avec l'indice
    const substitut = e.replication === "synthétique" && niveau === "fonds";
    compo[e.id] = { id: e.id, isin: e.isin, niveau: substitut ? "panier" : niveau, source, ...res };
    if (!substitut && e.replication === "physique" && res.isins.length >= 20 && res.sectors.length && e.index) {
      const k = indexCle(e.index), prev = parIndice[k];
      if (!prev || res.isins.length > prev.isins.length || (res.asOf || "") > (prev.asOf || "")) parIndice[k] = { ...compo[e.id], via: { id: e.id, name: e.name } };
    }
    if (++nOk % 50 === 0) log("compositions :", nOk);
  } catch (err) { log("composition", e.id, ":", err.message); }
}
log("compositions lues :", nOk, "; indices de référence :", Object.keys(parIndice).length);

// Fonds sans composition exploitable (synthétiques, autres émetteurs de la liste choisie) : composition de l'indice d'après un fonds physique qui le reproduit
const ALIAS = { "msci world": ["msci world"], "s&p 500": ["s&p 500"], "nasdaq 100": ["nasdaq 100"], "stoxx europe 600": ["stoxx europe 600"], "euro stoxx 50": ["euro stoxx 50"] };
const tous = [...sel.filter(e => !curIsin.has(e.isin)), ...CURATED.map(c => ({ ...(sel.find(e => e.isin === c.isin) || {}), ...c }))];
for (const e of tous) {
  const k = indexCle(e.index), ref = k && parIndice[k];
  const cur = compo[e.id];
  if (cur && cur.niveau !== "panier" && cur.isins && cur.isins.length) continue;
  if (ref && ref.via.id !== e.id) {
    const base = { ...ref, id: e.id, isin: e.isin, niveau: "indice", source: { nom: "Composition de l'indice d'après " + ref.via.name, url: ref.source && ref.source.url }, via: ref.via };
    if (cur && cur.niveau === "indice") compo[e.id] = { ...cur, isins: ref.isins, countries: cur.countries.length ? cur.countries : ref.countries, sectors: cur.sectors.length ? cur.sectors : ref.sectors, viaIsins: ref.via };
    else compo[e.id] = { ...base, panier: cur && cur.niveau === "panier" ? { lines: cur.lines, top: cur.top.slice(0, 5), asOf: cur.asOf } : undefined };
  }
}
// Écriture : un fichier par ETF, et un résumé dans le catalogue (lu au démarrage du site)
// Informations détaillées (lues seulement sur la fiche) : rangées dans le fichier de l'ETF pour garder etf.json léger
const INFO = ["nomOfficiel", "indexOfficiel", "url", "src", "cotations", "contrepartie", "nIndex"];
const keep = new Set();
for (const e of [...sel, ...CURATED.filter(c => !sel.some(s => s.id === c.id))]) {
  const c = compo[e.id] && !(compo[e.id].niveau === "panier" && !compo[e.id].isins.length) ? compo[e.id] : null;
  const s = sel.find(x => x.id === e.id) || {};
  const info = Object.fromEntries(INFO.map(k => [k, s[k]]).filter(([, v]) => v != null));
  if (!c && !Object.keys(info).length) continue;
  const f = c ? { ...c } : { id: e.id, isin: e.isin }; delete f.couverture; f.info = info;
  writeFileSync(OUTD + e.id + ".json", JSON.stringify(f)); if (c) keep.add(e.id);
}
for (const e of sel) {
  const c = compo[e.id]; if (!c || !keep.has(e.id)) continue;
  e.compo = { n: c.lines || null, t10: r1(c.top.slice(0, 10).reduce((a, x) => a + (x.pct || 0), 0)), asOf: c.asOf || null, niveau: c.niveau, pays: c.countries.length, p1: c.countries[0] || null, s1: c.sectors.find(s => s[0] !== "liquidites" && s[0] !== "autre") || null };
}
const resumeCur = {};
for (const c of CURATED) { const k = compo[c.id]; if (k && keep.has(c.id)) resumeCur[c.id] = { n: k.lines || null, t10: r1(k.top.slice(0, 10).reduce((a, x) => a + (x.pct || 0), 0)), asOf: k.asOf || null, niveau: k.niveau, pays: k.countries.length, p1: k.countries[0] || null, s1: k.sectors.find(s => s[0] !== "liquidites" && s[0] !== "autre") || null }; }
fin();
writeFileSync(ROOT + "data/etf_compo_choisis.json", JSON.stringify(resumeCur));
// fichiers d'anciens ETF qui ne sont plus suivis : on les laisse (les liens anciens continuent de fonctionner)
log("fini :", keep.size, "compositions écrites");
