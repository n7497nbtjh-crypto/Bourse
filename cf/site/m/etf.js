/* Module « etf » d'ENKLAIR : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Page : liste des ETF (pageEtfs) ; la fiche d'un ETF est dans m/etf4.js. Composition : cf/site/data/etf/<id>.json (format dans CHANTIERS.md). */

/* ---------- Données de référence ---------- */
Object.assign(ISSUERDOM, { "Franklin Templeton": "franklintempleton.com", KraneShares: "kraneshares.com", VanEck: "vaneck.com", "L&G": "lgim.com", WisdomTree: "wisdomtree.eu", HSBC: "hsbc.com", UBS: "ubs.com", "Global X": "globalxetfs.eu", Fidelity: "fidelity.fr", JPMorgan: "jpmorgan.com" });
Object.assign(COUNTRY, { NZ: "Nouvelle-Zélande", PL: "Pologne", ID: "Indonésie", TH: "Thaïlande", MY: "Malaisie", PH: "Philippines", CL: "Chili", TR: "Turquie", GR: "Grèce", AE: "Émirats arabes unis", QA: "Qatar", KW: "Koweït", PE: "Pérou", CO: "Colombie", HU: "Hongrie", CZ: "Tchéquie", EG: "Égypte", AR: "Argentine", MO: "Macao", IM: "Île de Man", GG: "Guernesey", CW: "Curaçao", PA: "Panama", CY: "Chypre", MT: "Malte", IS: "Islande", RO: "Roumanie", VN: "Viêt Nam", EU: "Union européenne", XS: "Supranational", VG: "Îles Vierges britanniques", GI: "Gibraltar", MC: "Monaco", LI: "Liechtenstein", EE: "Estonie", LV: "Lettonie", LT: "Lituanie", SI: "Slovénie", SK: "Slovaquie", HR: "Croatie", BG: "Bulgarie", PK: "Pakistan", NG: "Nigeria", KE: "Kenya", MA: "Maroc", BH: "Bahreïn", OM: "Oman", JO: "Jordanie", PR: "Porto Rico", UY: "Uruguay", RU: "Russie", LR: "Liberia" });
const ETF_SECT = { it: "Technologies de l'information", fin: "Finance", sante: "Santé", conso_disc: "Consommation discrétionnaire", indus: "Industrie", comm: "Services de communication", conso_base: "Consommation de base", energie: "Énergie", materiaux: "Matériaux", services_pub: "Services aux collectivités", immo: "Immobilier", liquidites: "Liquidités et dérivés", autre: "Autres" };
const ETF_EURO = new Set(["FR", "DE", "NL", "IT", "ES", "BE", "FI", "IE", "AT", "PT", "LU", "GR", "SK", "SI", "LT", "LV", "EE", "CY", "MT", "HR", "EU"]);
// Présentation factuelle des émetteurs (groupe, siège). Les chiffres affichés à côté viennent des données du site.
const ETF_EMET = {
  Amundi: ["Société de gestion française, filiale du groupe Crédit Agricole et cotée à la Bourse de Paris.", "Elle a repris en 2021 la gamme d'ETF Lyxor de la Société Générale. C'est l'émetteur qui propose le plus d'ETF éligibles au PEA."],
  iShares: ["Gamme d'ETF de BlackRock, société de gestion américaine cotée à New York.", "C'est la plus grande gamme d'ETF au monde. Ses ETF européens sont surtout de droit irlandais."],
  SPDR: ["Gamme d'ETF de State Street, groupe bancaire américain installé à Boston.", "Ses ETF européens sont de droit irlandais et cotés sur plusieurs Bourses d'Europe."],
  Invesco: ["Société de gestion américaine cotée à New York.", "Elle gère notamment l'un des plus anciens ETF sur le Nasdaq-100, coté en Europe depuis 2002."],
  Vanguard: ["Société de gestion américaine dont les propriétaires sont ses propres fonds, donc leurs porteurs de parts.", "Ses ETF européens sont de droit irlandais."],
  Xtrackers: ["Gamme d'ETF de DWS, société de gestion allemande contrôlée par Deutsche Bank et cotée à Francfort.", "Ses ETF européens sont de droit irlandais ou luxembourgeois."],
  "BNP Paribas Easy": ["Gamme d'ETF de BNP Paribas Asset Management, filiale du groupe bancaire français BNP Paribas.", "Plusieurs de ses ETF sont éligibles au PEA."],
  "Franklin Templeton": ["Société de gestion américaine cotée à New York.", "Sa gamme d'ETF européens s'appelle Franklin."],
  VanEck: ["Société de gestion américaine familiale, fondée à New York en 1955.", "Elle est connue pour ses ETF thématiques (mines d'or, semi-conducteurs, défense)."],
  WisdomTree: ["Société de gestion américaine cotée à New York.", "Elle propose notamment des ETC sur les matières premières en Europe."],
  "L&G": ["Gamme d'ETF de Legal & General, groupe britannique d'assurance et de gestion d'actifs coté à Londres.", ""],
  KraneShares: ["Société de gestion américaine spécialisée dans les actions chinoises.", ""],
};
/* ---------- Petits calculs ---------- */
const ETF_COMPO = {};
// Fichier détaillé de l'ETF (composition et informations de la fiche), chargé une fois
async function ETF_fichier(e) { if (ETF_COMPO[e.id] === undefined) ETF_COMPO[e.id] = await getJSON(`/data/etf/${e.id}.json`, null); return ETF_COMPO[e.id]; }
async function etfComp(e) {   // remplace celle d'index.html : composition détaillée de l'émetteur, sinon l'ancien fonds américain de référence
  if (!e) return null;
  if (e.compo) { const f = await ETF_fichier(e); if (f && f.top) return f; }
  if (!e.proxy) return null;
  if (ETFCOMP[e.proxy] !== undefined) return ETFCOMP[e.proxy];
  ETFCOMP[e.proxy] = await getJSON(`/data/etf/${e.proxy}.json`, null); return ETFCOMP[e.proxy];
}
const ETF_idx = e => norm(String(e.index || "").replace(/\(couvert[^)]*\)/, " couvert"));
function ETF_peers(e) { return ETF.list.filter(x => x.categorie === e.categorie && x.ter != null); }
function ETF_med(e) { const p = ETF_peers(e); return p.length >= 3 ? median(p.map(x => x.ter)) : null; }
function ETF_terVerdict(e) {
  const m = ETF_med(e); if (m == null || e.ter == null) return null;
  const r = e.ter / m;
  return r <= 0.8 ? { c: "g", w: "Parmi les moins chers", m } : r >= 1.25 ? { c: "o", w: "Plus cher que la plupart", m } : { c: "n", w: "Dans la norme", m };
}
// Rang dans la catégorie : 0 = plus faible, 1 = plus élevé
function ETF_rank(e, f, higherBetter = true) {
  const v = f(e); if (v == null || !isFinite(v)) return null;
  const vals = ETF_peers(e).map(f).filter(x => x != null && isFinite(x)); if (vals.length < 4) return null;
  const below = vals.filter(x => x < v).length, eq = vals.filter(x => x === v).length;
  let p = (below + (eq - 1) / 2) / Math.max(1, vals.length - 1); if (!higherBetter) p = 1 - p;
  return { p: Math.max(0, Math.min(1, p)), n: vals.length };
}
const ETF_cout = (ter, years, monthly = 100, rate = 0.05) => { const a = Calc.compound({ initial: 0, monthly, years, rate }).final, b = Calc.compound({ initial: 0, monthly, years, rate, fee: (ter || 0) / 100 }).final; return { brut: a, net: b, cout: a - b }; };
const ETF_pctS = (v, d = 1) => v == null ? "–" : nf(d).format(v) + " %";
const ETF_nomLigne = t => { const c = t.isin && ISINBY[t.isin]; if (c) return c.name; let s = String(t.name || ""); for (let i = 0; i < 3; i++) s = s.replace(/[\s,]+(INC|CORP|CORPORATION|LTD|PLC|SA|SE|NV|AG|CO|CLASS [A-Z]|CL [A-Z]|REG|ORD|NAMEN|-REG|USD[\d.]+|EUR[\d.]+)\.?\s*$/i, ""); s = s.replace(/\s*-?\s*(INC|CORP)?-?\s*CL(ASS)?\s+[A-Z]$/i, "").replace(/\s*&\s*(CO\.?)?$/i, ""); return titleCase(s.replace(/[\s,.&-]+$/, "")).replace(/\.Com\b/g, ".com"); };
const ETF_place = e => (e.cotations || []).find(c => c.ticker === e.ticker) || null;
const ETF_badges = (e, big) => [
  e.pea === true ? `<span class="eb eb-g">PEA</span>` : e.pea === false && big ? `<span class="eb">Hors PEA</span>` : "",
  e.distribution ? `<span class="eb">${e.distribution === "distribution" ? "Distribuant" : "Capitalisant"}</span>` : "",
  big && e.replication ? `<span class="eb">${e.replication === "synthétique" ? "Synthétique" : e.methode === "échantillonnée" ? "Physique (échantillon)" : "Physique"}</span>` : (e.replication === "synthétique" ? `<span class="eb">Synthétique</span>` : ""),
  e.levier ? `<span class="eb eb-o">Levier ou inverse</span>` : "", e.couvert ? `<span class="eb">Couvert en euros</span>` : ""].join("");

/* ---------- Styles ---------- */
/* styles : voir site.css */

/* ---------- Liste des ETF ---------- */
let ETF_LS = null;
const ETF_PRESETS = [["Tous", {}], ["Monde · PEA", { cat: "actions-monde", env: "pea" }], ["S&P 500", { q: "s&p 500" }], ["Nasdaq-100", { q: "nasdaq" }], ["Europe", { cat: "actions-europe" }], ["France", { cat: "actions-france" }], ["Émergents", { cat: "actions-emergents" }], ["Dividendes", { cat: "dividendes" }], ["Obligations", { cat: "obligations" }], ["Monétaire", { cat: "monetaire" }], ["Or et matières", { cat: "matieres" }], ["Thématiques", { cat: "theme" }]];
function ETF_lsInit() {
  if (ETF_LS) return ETF_LS;
  const u = new URLSearchParams(location.search);
  ETF_LS = { q: u.get("q") || "", cat: u.get("cat") || "all", env: u.get("env") || (u.get("pea") ? "pea" : "all"), dist: u.get("dist") || "all", em: u.get("em") || "all", fr: u.get("fr") || "all", tri: u.get("tri") || "frais", n: 40 };
  if (typeof etfState === "object" && etfState && etfState.pea && ETF_LS.env === "all") ETF_LS.env = "pea";
  return ETF_LS;
}
function ETF_row(e) {
  const v = ETF_terVerdict(e), pl = ETF_place(e);
  return `<a class="etfrow" href="/etf/${e.id}">${logo({ name: e.issuer, domain: issuerDom(e) }, 34)}<span><span class="nm">${esc(e.name)}</span><span class="sb">${esc(e.index || ECAT[e.categorie] || "")}${e.ticker ? ` · ${esc(e.ticker)}${pl ? " " + esc(pl.place.replace("Euronext ", "")) : ""}` : ""}</span><span class="tg">${ETF_badges(e)}</span></span>
    <span class="rt"><b>${e.ter != null ? ETF_pctS(e.ter, 2) : "–"}</b><small>${v ? `<i style="background:var(--${v.c === "n" ? "n" : v.c})"></i>` : ""}par an</small><small>${e.encours ? big(e.encours) : ""}</small></span></a>`;
}
function pageEtfs() {
  setTitle("Les ETF : frais, composition, PEA"); setNav("etf");
  const S = ETF_lsInit(), L = ETF.list;
  const nPea = L.filter(e => e.pea === true).length, ems = [...new Set(L.map(e => e.issuer))].sort((a, b) => L.filter(e => e.issuer === b).length - L.filter(e => e.issuer === a).length);
  const cats = Object.keys(ECAT).filter(c => L.some(e => e.categorie === c));
  const opt = (v, l, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(l)}</option>`;
  app.innerHTML = `<h1 class="pagetitle">Les ETF</h1><p class="pagesub">Un ETF (fonds indiciel coté) achète en une fois toutes les entreprises d'un indice. Voici ${F0.format(L.length)} ETF cotés à Paris, Francfort ou Amsterdam, dont ${F0.format(nPea)} éligibles au PEA, avec leurs frais, leur contenu et leur émetteur.</p>
    <section class="panel"><div class="etfq"><input type="search" id="eq" placeholder="Nom, indice, ticker ou ISIN : MSCI World, CW8, IE00B4L5Y983…" aria-label="Chercher un ETF" value="${esc(S.q)}" autocomplete="off"></div>
      <div class="etfpre scroll-x" id="epre">${ETF_PRESETS.map(([l], i) => `<button type="button" data-i="${i}">${esc(l)}</button>`).join("")}</div>
      <div class="etfflt" style="border-top:1px solid var(--line2,#EFECE6)">
        <div><label for="ecat">Catégorie</label><select id="ecat">${opt("all", "Toutes", S.cat)}${cats.map(c => opt(c, ECAT[c], S.cat)).join("")}</select></div>
        <div><label for="eenv">Compte</label><select id="eenv">${opt("all", "PEA ou compte-titres", S.env)}${opt("pea", "Éligibles au PEA", S.env)}${opt("cto", "Compte-titres seulement", S.env)}</select></div>
        <div><label for="edist">Dividendes</label><select id="edist">${opt("all", "Peu importe", S.dist)}${opt("capitalisation", "Réinvestis (capitalisant)", S.dist)}${opt("distribution", "Versés (distribuant)", S.dist)}</select></div>
        <div><label for="eem">Émetteur</label><select id="eem">${opt("all", "Tous", S.em)}${ems.map(m => opt(m, m, S.em)).join("")}</select></div>
        <div><label for="efr">Frais par an</label><select id="efr">${opt("all", "Tous", S.fr)}${["0.1", "0.2", "0.3", "0.5"].map(x => opt(x, "Jusqu'à " + ETF_pctS(+x, 2), S.fr)).join("")}</select></div>
      </div></section>
    <div class="etfcount"><span id="ecount"></span><span><label for="etri" class="light" style="font-size:12.5px">Trier par </label><select id="etri" style="height:32px;border:1px solid var(--line,#E6E2DA);border-radius:8px;background:#fff;font:inherit;font-size:13px">${opt("frais", "Frais les plus bas", S.tri)}${opt("encours", "Encours le plus élevé", S.tri)}${opt("nom", "Nom", S.tri)}${opt("recent", "Plus récents", S.tri)}${opt("ancien", "Plus anciens", S.tri)}</select></span></div>
    <section class="panel" id="elist"></section>
    <p class="note">Frais courants, encours, éligibilité au PEA et cotations relevés chaque mois sur les sites des émetteurs (Amundi, iShares, SPDR, Invesco…). Le point de couleur compare les frais à la ${medBtn()} de la catégorie : vert parmi les moins chers, rouge plus cher que la plupart. Rien ici n'est un conseil d'achat.</p>`;
  const render = () => {
    const t = norm(S.q.trim()), tk = S.q.trim().toUpperCase();
    let l = L.filter(e => (S.cat === "all" || e.categorie === S.cat) && (S.env === "all" || (S.env === "pea" ? e.pea === true : e.pea !== true)) && (S.dist === "all" || e.distribution === S.dist) && (S.em === "all" || e.issuer === S.em) && (S.fr === "all" || (e.ter != null && e.ter <= +S.fr + 1e-9)));
    if (t) l = l.filter(e => e.isin === tk || (e.cotations || []).some(c => c.ticker === tk) || e.ticker === tk || t.split(/\s+/).every(w => norm(e.name + " " + (e.index || "") + " " + e.issuer + " " + (ECAT[e.categorie] || "") + " " + (e.ticker || "")).includes(w)));
    const by = { frais: (a, b) => (a.ter ?? 9) - (b.ter ?? 9) || (b.encours || 0) - (a.encours || 0), encours: (a, b) => (b.encours || 0) - (a.encours || 0), nom: (a, b) => a.name.localeCompare(b.name, "fr"), recent: (a, b) => (b.creation || "").localeCompare(a.creation || ""), ancien: (a, b) => (a.creation || "9").localeCompare(b.creation || "9") }[S.tri] || (() => 0);
    l.sort(by);
    $("#ecount").textContent = l.length ? `${F0.format(l.length)} ETF${l.length > 1 ? "" : ""} trouvé${l.length > 1 ? "s" : ""}` : "";
    $("#elist").innerHTML = l.length ? `<div class="etfrows">${l.slice(0, S.n).map(ETF_row).join("")}</div>${l.length > S.n ? `<button type="button" class="etfmore" id="emore">Afficher ${F0.format(Math.min(40, l.length - S.n))} ETF de plus (${F0.format(l.length - S.n)} restants)</button>` : ""}` : `<div class="empty">Aucun ETF ne correspond. Essayez un autre mot, ou retirez un filtre.</div>`;
    const mo = $("#emore"); if (mo) mo.onclick = () => { S.n += 40; render(); };
    $$("#epre button").forEach(b => { const p = ETF_PRESETS[+b.dataset.i][1]; b.classList.toggle("on", +b.dataset.i ? Object.entries(p).every(([k, v]) => S[k] === v) && (p.q ? true : !S.q) : !S.q && S.cat === "all" && S.env === "all"); });
    const qs = new URLSearchParams(); for (const k of ["q", "cat", "env", "dist", "em", "fr", "tri"]) if (S[k] && S[k] !== "all" && !(k === "tri" && S[k] === "frais")) qs.set(k, S[k]);
    try { history.replaceState(history.state, "", "/etf" + (qs.toString() ? "?" + qs : "")); } catch (e) { }
  };
  const set = (k, v) => { S[k] = v; S.n = 40; render(); };
  let tm; $("#eq").oninput = ev => { clearTimeout(tm); tm = setTimeout(() => set("q", ev.target.value), 120); };
  $("#ecat").onchange = ev => set("cat", ev.target.value); $("#eenv").onchange = ev => set("env", ev.target.value); $("#edist").onchange = ev => set("dist", ev.target.value);
  $("#eem").onchange = ev => set("em", ev.target.value); $("#efr").onchange = ev => set("fr", ev.target.value); $("#etri").onchange = ev => set("tri", ev.target.value);
  $("#epre").onclick = ev => { const b = ev.target.closest("button"); if (!b) return; const p = ETF_PRESETS[+b.dataset.i][1]; Object.assign(S, { q: "", cat: "all", env: "all", dist: "all", em: "all", fr: "all" }, p, { n: 40 }); $("#eq").value = S.q; ["cat", "env", "dist", "em", "fr"].forEach(k => { const el = $("#e" + (k === "cat" ? "cat" : k)); if (el) el.value = S[k]; }); render(); };
  render();
}

/* ---------- Fiche d'un ETF ---------- */
function ETF_phrase(e, c) {
  if (c && c.lines) {
    const n = c.lines, pays = (c.countries || []).filter(x => x[0] !== "XS" && x[0] !== "EU").length, t10 = (c.top || []).slice(0, 10).reduce((a, x) => a + (x.pct || 0), 0);
    const quoi = e.categorie === "obligations" || e.categorie === "monetaire" ? "obligations et titres de créance" : e.categorie === "immobilier" ? "sociétés immobilières" : "entreprises";
    const pl = n >= 2 ? `<b>${F0.format(n)}</b> ${quoi}` : quoi;
    return `Une part de cet ETF, c'est un petit morceau de ${pl}${pays > 1 ? ` de <b>${F0.format(pays)}</b> pays` : pays === 1 ? ` d'un seul pays (${esc(COUNTRY[c.countries[0][0]] || c.countries[0][0])})` : ""}${t10 > 0 && n > 10 ? ` ; les 10 plus grosses lignes pèsent <b>${F0.format(t10)} %</b> du total` : ""}.`;
  }
  if (e.categorie === "matieres" && /or\b|gold/i.test(e.name + " " + e.index)) return "Une part de ce produit représente une petite quantité d'or physique, conservée dans des coffres pour le compte des porteurs. Ce n'est pas un panier d'entreprises.";
  return e.fiche ? esc(e.fiche.contenu) : `Cet ETF reproduit l'indice ${esc(e.index || "")}.`;
}
function ETF_voisins(e) {
  const same = ETF.list.filter(x => x.id !== e.id && ETF_idx(x) === ETF_idx(e) && x.ter != null).sort((a, b) => a.ter - b.ter || (b.encours || 0) - (a.encours || 0));
  const cat = ETF.list.filter(x => x.id !== e.id && !same.includes(x) && x.categorie === e.categorie && x.ter != null && !x.levier && (e.pea !== true || x.pea === true)).sort((a, b) => (b.encours || 0) - (a.encours || 0));
  return { same, cat };
}
function ETF_ajoutPf(e) {
  if (typeof pf2Load !== "function" || typeof pf2Save !== "function") { go("/portefeuille"); return; }
  const P = pf2Load(), k = "e:" + e.id;
  if (!P.l.some(l => l.k === k)) { if (typeof pfFull === "function" && pfFull(P)) { toast(`Votre portefeuille est plein. <a href="/portefeuille">Le voir</a>`); return; } const p = typeof PX === "object" && PX[k]; P.l.push(p ? { k, q: 10, pru: Math.round(p.p * 100) / 100 } : { k, m: 1000 }); pf2Save(P); }
  toast(`${esc(e.name)} est dans votre portefeuille. <a href="/portefeuille">Ajuster le montant</a>`);
}
/* styles : voir site.css */
/* Fiche d'un ETF : m/etf4.js (3/11/2026). */
