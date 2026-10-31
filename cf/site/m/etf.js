/* Module « etf » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Pages : liste des ETF (pageEtfs) et fiche d'un ETF (pageEtf). Composition : cf/site/data/etf/<id>.json (format dans CHANTIERS.md). */

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
const ETF_DOMI = { Irlande: "L'Irlande accueille la plupart des ETF vendus en Europe, notamment pour leur traitement fiscal des dividendes américains.", Luxembourg: "Le Luxembourg est, avec l'Irlande, l'un des deux grands pays d'accueil des fonds européens.", France: "Un fonds de droit français, contrôlé par l'AMF.", Allemagne: "Un fonds de droit allemand, contrôlé par la BaFin." };

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
document.head.insertAdjacentHTML("beforeend", `<style>
.eb{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:99px;border:1px solid var(--line,#E6E2DA);font-size:11.5px;font-weight:600;color:var(--grey);background:#fff;white-space:nowrap}
.eb-g{border-color:#BFDCCB;background:#EEF6F1;color:#0E6B4A}.eb-o{border-color:#F1C9BC;background:#FBEFEA;color:#B4441F}
.etfhd{padding:20px 22px}
.etfhd .top{display:flex;gap:14px;align-items:flex-start}
.etfhd h1{font-family:var(--serif);font-weight:800;letter-spacing:-.015em;font-size:26px;line-height:1.15;margin:0}
.etfhd .sub{color:var(--grey);margin-top:4px;font-size:14px}
.etfhd .ids{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12.5px;color:var(--grey);align-items:center}
.etfhd .ids b{font-family:var(--mono);color:var(--ink);font-weight:600}.etfhd .ids .fh-isin2{display:inline-flex;align-items:center;gap:6px;background:var(--ink);color:#fff;border-radius:999px;padding:4px 10px}.etfhd .ids .fh-isin2 b{color:#fff}.etfhd .ids .fh-isin2 small{font-size:10.5px;opacity:.75}.etfhd .ids .fh-isin2 .copy{color:#fff;border-color:rgba(255,255,255,.4)}
.etfhd .copy{border:0;background:none;padding:0 2px;cursor:pointer;color:var(--grey);font:inherit;text-decoration:underline dotted}
.etfhd .badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.etfhd .acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.etfhd .acts .linkbtn,.etfhd .acts a.pill{display:inline-flex;align-items:center;height:30px;padding:0 12px;border:1px solid var(--ink);border-radius:99px;font-size:13px;font-weight:600;color:var(--ink);background:#fff;text-decoration:none;cursor:pointer}
.etfhd .acts .favbtn{margin:0}
.etfkv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 14px;margin:8px 0 0;font-size:14px;line-height:1.45}
.etfkv dt{color:var(--grey);font-size:12.5px;padding:8px 0;border-bottom:1px dashed var(--line,#E6E2DA)}
.etfkv dd{margin:0;padding:8px 0;border-bottom:1px dashed var(--line,#E6E2DA)}
.etfkv dd b{font-family:var(--mono);font-weight:600}
.etfkv dt:last-of-type,.etfkv dd:last-of-type{border-bottom:0}
.etfgrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:0;border-top:1px solid var(--line2,#EFECE6)}
.etfgrid>div{padding:18px 22px}.etfgrid>div+div{border-left:1px solid var(--line2,#EFECE6);background:#FCFBF8}
.etfter{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.etfter .v{font-family:var(--mono);font-size:30px;font-weight:600;letter-spacing:-.02em}
.etfter .u{color:var(--grey);font-size:13px}
.etfvd{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;margin-top:4px}
.etfvd i{width:9px;height:9px;border-radius:50%;display:inline-block}
.vd-g{color:#0E6B4A}.vd-g i{background:var(--g,#0E6B4A)}.vd-o{color:#B4441F}.vd-o i{background:var(--o,#D94F2B)}.vd-n{color:var(--grey)}.vd-n i{background:var(--n,#B9B3A8)}
.etfbuy{font-size:17px;line-height:1.45;margin:0 0 14px}
.etfbuy b{font-family:var(--mono);font-weight:600}
.etft3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 6px}
.etft3 div{border:1px solid var(--line,#E6E2DA);border-radius:12px;padding:10px 12px;background:#fff}
.etft3 span{display:block;font-size:11.5px;color:var(--grey);text-transform:uppercase;letter-spacing:.04em}
.etft3 b{font-family:var(--mono);font-size:20px;font-weight:600}
.etft3 small{display:block;font-size:12px;color:var(--grey);margin-top:2px}
.etfcols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.etfcols h3,.etfh3{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--grey);margin:4px 0 8px;font-weight:600}
.etfsrc{font-size:12px;color:var(--light,#8B867E);margin-top:10px}
.etfsrc a{color:inherit}
.etfnote{background:#FBF7EC;border:1px solid #EFE3C2;border-radius:10px;padding:10px 12px;font-size:13.5px;line-height:1.5;margin:0 0 12px}
.etffees{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:6px 0 12px}
.etffees div{border:1px solid var(--line,#E6E2DA);border-radius:12px;padding:12px;background:#fff}
.etffees span{font-size:12.5px;color:var(--grey);display:block}
.etffees b{font-family:var(--mono);font-size:22px;font-weight:600}
.etfrisk{list-style:none;padding:0;margin:0}
.etfrisk li{padding:9px 0 9px 22px;border-bottom:1px dashed var(--line,#E6E2DA);position:relative;font-size:14px;line-height:1.5}
.etfrisk li:last-child{border-bottom:0}
.etfrisk li:before{content:"";position:absolute;left:4px;top:15px;width:8px;height:8px;border-radius:50%;background:var(--n,#B9B3A8)}
.etfrisk li.o:before{background:var(--o,#D94F2B)}.etfrisk li.g:before{background:var(--g,#0E6B4A)}
.etfrows{display:flex;flex-direction:column}
.etfrow{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 16px;border-top:1px solid var(--line2,#EFECE6);color:inherit;text-decoration:none}
.etfrow:first-child{border-top:0}
.etfrow:hover{background:#FAF8F4}
.etfrow .nm{display:block;font-weight:600;font-size:14.5px;line-height:1.3}
.etfrow .sb{display:block;font-size:12.5px;color:var(--grey);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.etfrow .tg{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.etfrow .tg .eb{height:19px;font-size:10.5px;padding:0 7px}
.etfrow .rt{text-align:right;white-space:nowrap}
.etfrow .rt b{font-family:var(--mono);font-size:16px;font-weight:600;display:block}
.etfrow .rt small{font-size:11.5px;color:var(--grey);display:block}
.etfrow .rt i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:1px}
.etfflt{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:12px 16px}
.etfflt label{display:block;font-size:11.5px;color:var(--grey);margin-bottom:3px;font-weight:600}
.etfflt select{width:100%;height:36px;border:1px solid var(--line,#E6E2DA);border-radius:10px;background:#fff;padding:0 8px;font:inherit;font-size:13.5px;color:var(--ink)}
.etfq{display:flex;gap:8px;padding:14px 16px 4px}
.etfq input{flex:1;min-width:0;height:42px;border:1px solid var(--line,#E6E2DA);border-radius:12px;padding:0 14px;font:inherit;font-size:15px;background:#fff}
.etfpre{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:8px 16px 14px}
.etfpre::-webkit-scrollbar{display:none}
.etfpre button{flex:none;height:30px;padding:0 12px;border-radius:99px;border:1px solid var(--line,#E6E2DA);background:#fff;font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}
.etfpre button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.etfcount{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:2px 2px 10px;font-size:13.5px;color:var(--grey);flex-wrap:wrap}
.etfmore{display:block;width:100%;height:46px;border:0;border-top:1px solid var(--line2,#EFECE6);background:#FCFBF8;font:inherit;font-weight:600;cursor:pointer;color:var(--ink)}
.etfqa{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.etfqa button{height:auto;min-height:32px;padding:5px 12px;border-radius:99px;border:1px solid var(--line,#E6E2DA);background:#fff;font:inherit;font-size:13px;cursor:pointer;text-align:left;color:var(--ink)}
.etfqa button.on{border-color:var(--ink);background:var(--ink);color:#fff}
.etfans{border-left:3px solid var(--ink);background:#FAF8F4;border-radius:0 10px 10px 0;padding:10px 14px;font-size:14.5px;line-height:1.55;margin:0 0 12px}
.etfans p{margin:0 0 6px}.etfans p:last-child{margin:0}
.etfask{display:flex;gap:8px}
.etfask input{flex:1;min-width:0;height:40px;border:1px solid var(--line,#E6E2DA);border-radius:10px;padding:0 12px;font:inherit;background:#fff}
.etffaq details{border-top:1px solid var(--line2,#EFECE6);padding:12px 0}
.etffaq details:first-child{border-top:0}
.etffaq summary{cursor:pointer;font-weight:600;font-size:14.5px;list-style:none;display:flex;justify-content:space-between;gap:10px}
.etffaq summary::-webkit-details-marker{display:none}
.etffaq summary:after{content:"+";color:var(--grey);font-weight:400}
.etffaq details[open] summary:after{content:"–"}
.etffaq details p{margin:8px 0 0;font-size:14px;line-height:1.55;color:var(--ink)}
.etfnb{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:10px 0;border-top:1px dashed var(--line,#E6E2DA);color:inherit;text-decoration:none}
.etfnb:first-child{border-top:0}
.etfnb b{font-size:14px}.etfnb small{display:block;font-size:12px;color:var(--grey)}
.etfnb .n{font-family:var(--mono);font-size:14px;text-align:right}
.etfnb .ov{font-size:12px;color:var(--grey);text-align:right;min-width:74px}
/* noms d'indice longs dans le classement de l'accueil (m/orchestre.js) : une ligne, coupée proprement */
a.orcrow span.t small{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;white-space:normal;overflow:hidden}
@media (max-width:860px){
 .etfgrid{grid-template-columns:1fr}.etfgrid>div+div{border-left:0;border-top:1px solid var(--line2,#EFECE6)}
 .etfcols{grid-template-columns:1fr}
 .etfflt{grid-template-columns:1fr 1fr}
}
@media (max-width:520px){
 .etfhd{padding:16px}.etfhd h1{font-size:22px}.etfgrid>div{padding:16px}
 .etft3 b{font-size:17px}.etft3 div{padding:8px 10px}
 .etffees b{font-size:18px}
 .etfrow{padding:12px;grid-template-columns:30px minmax(0,1fr) auto;gap:10px}
 .etfrow .sb{white-space:normal}
 .etfnb{grid-template-columns:minmax(0,1fr) auto}.etfnb .ov{grid-column:1/-1;text-align:left}
}
</style>`);

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
function ETF_concentration(c) {
  if (!c || !c.top || !c.top.length) return "";
  const t10 = c.top.slice(0, 10).reduce((a, x) => a + (x.pct || 0), 0), p1 = (c.countries || [])[0];
  const a = t10 > 50 ? `Les 10 premières lignes font plus de la moitié du fonds : il dépend fortement de quelques ${t10 > 50 ? "noms" : ""}, même s'il en contient ${F0.format(c.lines || 0)}.` : t10 > 30 ? `Les 10 premières lignes pèsent ${F0.format(t10)} % : le fonds est assez concentré sur ses plus grosses positions.` : `Les 10 premières lignes pèsent ${F0.format(t10)} % : le reste est réparti sur de nombreuses lignes.`;
  const b = p1 && p1[1] > 60 ? ` ${esc(COUNTRY[p1[0]] || p1[0])} pèse ${F0.format(p1[1])} % : le fonds dépend surtout de ce pays, de son économie et de sa devise.` : "";
  return a + b;
}
function ETF_srcLine(c, e) {
  if (!c) return "";
  const d = c.asOf ? ` Données au ${dLabel(c.asOf)}.` : "";
  const lien = c.source && c.source.url ? `<a href="${esc(c.source.url)}" target="_blank" rel="noopener nofollow">${esc(c.source.nom)}</a>` : esc((c.source && c.source.nom) || "Émetteur");
  if (c.proxy) return `Source : déclaration publique du fonds américain ${esc(c.proxy)} à la SEC (formulaire N-PORT), qui suit ${e.proxyIndex && e.proxyIndex !== e.index ? "un indice proche" : "le même indice"}.${d} L'ETF européen peut différer légèrement.`;
  if (c.niveau === "indice" && c.via) return `Source : ${lien}, fonds physique qui reproduit le même indice (${esc(e.index || "")}).${d} L'ETF lui-même peut différer légèrement.`;
  if (c.niveau === "indice") return `Source : ${lien}.${d}`;
  if (c.proxy) return `Source : déclaration publique du fonds américain ${esc(c.proxy)} à la SEC (formulaire N-PORT), qui suit ${e.proxyIndex && e.proxyIndex !== e.index ? "un indice proche" : "le même indice"}.${d} L'ETF européen peut différer légèrement.`;
  return `Source : ${lien}.${d}`;
}
function ETF_risques(e, c) {
  const R = [];
  R.push(["n", `<b>Risque de marché.</b> La valeur de la part suit ${e.categorie === "obligations" ? "le prix des obligations, qui baisse quand les taux d'intérêt montent" : e.categorie === "monetaire" ? "les taux à court terme de la zone euro : les variations sont faibles, mais le rendement baisse quand la BCE baisse ses taux" : "l'indice, à la hausse comme à la baisse"}. Le capital n'est pas garanti.`]);
  if (c && c.countries && c.countries.length) {
    const hors = c.countries.filter(([k]) => !ETF_EURO.has(k)).reduce((a, x) => a + x[1], 0);
    if (hors > 20 && !e.couvert) R.push(["o", `<b>Risque de change.</b> Environ ${F0.format(hors)} % du fonds est investi hors de la zone euro. Si le dollar ou les autres devises baissent face à l'euro, la part perd de la valeur, même si les entreprises ne bougent pas.`]);
  } else if (!/europe|euro|france|cac|dax|stoxx|emu/i.test(e.index + " " + e.categorie) && !e.couvert && e.categorie !== "monetaire") R.push(["o", `<b>Risque de change.</b> L'indice n'est pas en euros : la valeur de la part dépend aussi du taux de change.`]);
  if (e.couvert) R.push(["n", `<b>Couverture de change.</b> Cette part est couverte contre les variations de change. La couverture a un coût, compris dans la performance.`]);
  if (c && c.top) { const t10 = c.top.slice(0, 10).reduce((a, x) => a + (x.pct || 0), 0), p1 = (c.countries || [])[0]; if (t10 > 40 || (p1 && p1[1] > 60)) R.push(["o", `<b>Concentration.</b> ${ETF_concentration(c)}`]); }
  if (e.replication === "synthétique") R.push(["n", `<b>Contrepartie.</b> Le fonds reçoit la performance de l'indice d'une banque, par un contrat d'échange (swap)${e.contrepartie ? ` ; banque partenaire indiquée par l'émetteur : ${esc(e.contrepartie)}` : ""}. Si elle faisait défaut, la perte serait limitée par la réglementation européenne (UCITS), qui plafonne ce risque à 10 % de l'actif.`]);
  if (e.levier) R.push(["o", `<b>Levier ou stratégie inverse.</b> Ce produit amplifie ou inverse les variations quotidiennes de l'indice. Sur plusieurs jours, sa performance peut s'écarter fortement d'un multiple de celle de l'indice. Il est conçu pour des opérations de courte durée.`]);
  if ((e.encours || 0) < 100 && e.encours != null) R.push(["n", `<b>Petit fonds.</b> Avec ${big(e.encours)} d'encours, le fonds est petit : l'émetteur peut décider de le fermer ou de le fusionner (les porteurs récupèrent alors la valeur de leurs parts).`]);
  return R;
}
// Réponses instantanées, calculées à partir des données de la fiche
function ETF_qa(e, c, voisin) {
  const v = ETF_terVerdict(e), Q = [];
  Q.push(["pea", "Est-il éligible au PEA ?", e.pea === true ? `Oui. ${esc(e.issuer)} indique que cet ETF est éligible au PEA. Vous pouvez donc l'acheter dans un PEA comme dans un compte-titres.${e.replication === "synthétique" && !/europe|euro|france|cac|stoxx|dax/i.test(e.index || "") ? " Il suit un indice hors d'Europe grâce à un contrat d'échange (réplication synthétique) : c'est ce qui le rend éligible." : ""}` : e.pea === false ? `Non. D'après ${esc(e.issuer)}, cet ETF n'est pas éligible au PEA : il s'achète dans un compte-titres (ou parfois une assurance vie).` : `L'émetteur n'indique pas d'éligibilité au PEA pour cet ETF sur les documents consultés. Vérifiez auprès de votre courtier avant d'acheter dans un PEA.`]);
  Q.push(["contenu", "Que contient-il ?", `${ETF_phrase(e, c)}${c && c.top && c.top.length ? ` Les premières lignes sont ${c.top.slice(0, 3).map(t => esc(ETF_nomLigne(t))).join(", ")}.` : ""}${c && c.sectors && c.sectors.length && !["obligations", "monetaire"].includes(e.categorie) ? ` Premier secteur : ${esc((ETF_SECT[c.sectors.find(s => s[0] !== "liquidites")?.[0]] || "").toLowerCase())} (${F0.format((c.sectors.find(s => s[0] !== "liquidites") || [0, 0])[1])} %).` : ""}`]);
  if (e.ter != null) Q.push(["cher", "Est-il cher ?", `Ses frais courants sont de ${ETF_pctS(e.ter, 2)} par an, soit ${eur(e.ter * 10, 0)} par an pour 1 000 € placés. ${v ? `La ${medBtn()} des ${ETF_peers(e).length} ETF de sa catégorie (${esc(ECAT[e.categorie] || "")}) est de ${ETF_pctS(v.m, 2)} : ${v.c === "g" ? "il fait partie des moins chers" : v.c === "o" ? "il est plus cher que la plupart" : "il est dans la norme"}.` : ""} S'y ajoutent les frais de courtage, payés à chaque achat chez votre courtier.`]);
  if (e.distribution) Q.push(["capi", "Capitalisant ou distribuant ?", e.distribution === "distribution" ? `Distribuant : les dividendes reçus des entreprises vous sont versés en argent, en général une à quatre fois par an. Dans un compte-titres, ils sont imposés l'année où vous les recevez.` : `Capitalisant : les dividendes reçus des entreprises sont réinvestis dans le fonds, ils augmentent la valeur de la part. Rien ne vous est versé, et dans un compte-titres rien n'est imposé tant que vous ne vendez pas.`]);
  if (voisin) {
    const d = [], dt = (e.ter ?? 0) - (voisin.ter ?? 0);
    if (Math.abs(dt) >= 0.005) d.push(`des frais ${dt > 0 ? "plus élevés" : "plus bas"} (${ETF_pctS(e.ter, 2)} contre ${ETF_pctS(voisin.ter, 2)})`);
    if (e.pea !== voisin.pea && (e.pea === true || voisin.pea === true)) d.push(e.pea === true ? "l'éligibilité au PEA, que l'autre n'a pas" : "l'absence d'éligibilité au PEA, que l'autre a");
    if (e.distribution !== voisin.distribution && e.distribution && voisin.distribution) d.push(`les dividendes ${e.distribution === "distribution" ? "versés" : "réinvestis"} (contre ${voisin.distribution === "distribution" ? "versés" : "réinvestis"})`);
    if (e.replication !== voisin.replication && e.replication && voisin.replication) d.push(`une réplication ${e.replication} (contre ${voisin.replication})`);
    if (e.issuer !== voisin.issuer) d.push(`l'émetteur (${esc(e.issuer)} contre ${esc(voisin.issuer)})`);
    if (e.encours && voisin.encours && (e.encours / voisin.encours > 3 || voisin.encours / e.encours > 3)) d.push(`la taille (${big(e.encours)} contre ${big(voisin.encours)} d'encours)`);
    Q.push(["diff", `Quelle différence avec ${voisin.name} ?`, `${ETF_idx(voisin) === ETF_idx(e) ? `Les deux suivent le même indice (${esc(e.index)}) : leur contenu est quasiment identique.` : `${esc(voisin.name)} suit un indice différent (${esc(voisin.index || "")}).`} ${d.length ? "Ce qui change : " + d.join(", ") + "." : "Leurs caractéristiques principales sont les mêmes."}`]);
  }
  return Q;
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
/* « En bref » de la fiche ETF (refonte du 29 octobre, 13 h 30) : ce que contient une part, ses frais, l'essentiel pratique,
   les risques principaux (titres seulement, détaillés plus bas). Aucun chiffre qui ne vienne de la fiche. */
function ETF_bref(e, C, v) {
  const R = ETF_risques(e, C).map(([k, t]) => [k, (t.match(/<b>([^<]+?)\.?<\/b>/) || [])[1]]).filter(x => x[1]);
  const pea = e.pea === true ? "Éligible au PEA" : e.pea === false ? "Hors PEA : compte-titres" : null;
  const ess = [pea, e.distribution === "distribution" ? "Dividendes versés aux porteurs" : e.distribution ? "Dividendes réinvestis (capitalisant)" : null,
    e.replication === "synthétique" ? "Réplication synthétique : un contrat d'échange avec une banque" : e.replication ? (e.methode === "échantillonnée" ? "Réplication physique, sur un échantillon de l'indice" : "Réplication physique : le fonds achète les titres") : null,
    e.levier ? "Levier ou stratégie inverse" : null, e.couvert ? "Part couverte contre le change" : null].filter(Boolean);
  // 30/10 (Romain) : le verdict en trois mots, comme sur la fiche entreprise, puis la jauge des frais dans sa catégorie
  const t10 = C && C.top ? C.top.slice(0, 10).reduce((a, x) => a + (x.pct || 0), 0) : null;
  const mots = [v ? (v.c === "g" ? "Frais bas" : v.c === "o" ? "Frais élevés" : "Frais dans la norme") : null, e.pea === true ? "éligible au PEA" : e.pea === false ? "hors PEA" : null, t10 != null ? (t10 > 40 ? "très concentré" : t10 > 25 ? "assez concentré" : "bien réparti") : null].filter(Boolean);
  const rk = ETF_rank(e, x => x.ter, false), jauge = rk ? `<div class="rf6-jg" title="Parmi les ${rk.n} ETF de sa catégorie suivis par le site ; la médiane est au milieu, à droite les moins chers"><span class="fk-g"><em></em><i style="left:${Math.round(rk.p * 100)}%"></i></span><small>${rk.p >= 0.5 ? `moins cher que ${Math.round(rk.p * 100)} % de sa catégorie` : `plus cher que ${Math.round((1 - rk.p) * 100)} % de sa catégorie`}${v && v.m != null ? ` · médiane ${ETF_pctS(v.m, 2)}` : ""}</small></div>` : "";
  return `<div class="rf-sh"><h2 class="f2-h">En bref</h2><span class="f2-sub">${e.index ? `Indice ${esc(e.index)}` : esc(ECAT[e.categorie] || "")}</span></div>
    ${mots.length ? `<p class="rf-vc">${esc(mots.join(", "))}<small>selon la fiche de l'émetteur, face aux ETF de sa catégorie</small></p>` : ""}
    <p class="fh-v etf-v" id="fverdict">${ETF_phrase(e, C)}</p>
    <div class="rf-bl"><h3>Frais</h3><p class="rf-fr"><b>${e.ter != null ? ETF_pctS(e.ter, 2) : "non communiqués"}</b>${e.ter != null ? " par an" : ""}${v ? `<span class="etfvd vd-${v.c}"><i></i>${esc(v.w)} de sa catégorie</span>` : ""}</p>${jauge}</div>
    <div class="rf-pts"><div class="rf-bl"><h3>L'essentiel pratique</h3><ul>${ess.map(t => `<li class="rf-n"><i></i>${esc(t)}</li>`).join("")}</ul></div>
      <div class="rf-bl"><h3>Risques principaux</h3><ul>${R.slice(0, 4).map(([k, t]) => `<li class="${k === "o" ? "rf-d" : "rf-n"}"><i></i>${esc(t)}</li>`).join("")}</ul></div></div>
    <div class="rf-foot"><a class="rf-lk" href="#ebuy" data-rf-go="ebuy">Sa composition</a><a class="rf-lk" href="#erisques" data-rf-go="erisques">Les risques en détail</a></div>`;
}
document.addEventListener("click", ev => { const a = ev.target.closest && ev.target.closest("[data-rf-go]"); if (!a) return; const t = document.getElementById(a.dataset.rfGo); if (t) { ev.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } });
async function pageEtf(id) {
  const e = ETFBY[id]; if (!e) return pageNotFound();
  if (!e.proxy || e.compo) { const F = await ETF_fichier(e); if (F && F.info) Object.assign(e, F.info); if (location.pathname !== "/etf/" + id) return; }
  setTitle(`${e.name} : composition, frais, PEA`); setNav("etf");
  const v = ETF_terVerdict(e), pl = ETF_place(e), em = ETF_EMET[e.issuer] || ETF_EMET[Object.keys(ETF_EMET).find(k => (e.issuer || "").startsWith(k))];
  const { same, cat } = ETF_voisins(e), voisin = same[0] && same[0].ter < (e.ter ?? 9) ? same[0] : same[0] || cat[0];
  const rT = ETF_rank(e, x => x.ter, false), rE = ETF_rank(e, x => x.encours), rN = ETF_rank(e, x => x.compo && x.compo.n), rA = ETF_rank(e, x => x.creation ? -Date.parse(x.creation) : null);
  const word = (p, a) => p >= 0.75 ? a[0] : p >= 0.55 ? a[1] : p > 0.45 ? a[2] : p > 0.25 ? a[3] : a[4];
  const axes = [["Frais", "moins cher à droite", rT, ["parmi les moins chers", "moins cher que la médiane", "dans la médiane", "plus cher que la médiane", "parmi les plus chers"]], ["Taille du fonds", "encours", rE, ["parmi les plus gros", "plus gros que la médiane", "dans la médiane", "plus petit que la médiane", "parmi les plus petits"]], ["Diversification", "nombre de lignes", rN, ["parmi les plus diversifiés", "plus que la médiane", "dans la médiane", "moins que la médiane", "parmi les moins diversifiés"]], ["Ancienneté", "date de création", rA, ["parmi les plus anciens", "plus ancien que la médiane", "dans la médiane", "plus récent que la médiane", "parmi les plus récents"]]].filter(a => a[2]);
  const created = e.creation ? dLabel(e.creation) : null;
  app.innerHTML = `<div class="crumbs"><a href="/etf">ETF</a> › <a href="/etf?cat=${esc(e.categorie || "")}">${esc(ECAT[e.categorie] || "Autres")}</a></div>
    <section class="panel fhero rf-hero rf-etf"><div class="etfhd rf-etfhd"><div class="top"><div class="rf-etfid">${logo({ name: e.issuer, domain: issuerDom(e) }, 52)}<div style="min-width:0">
      <h1>${esc(e.name)}</h1><div class="sub">${e.index ? `Indice <b style="color:var(--ink);font-weight:600">${esc(e.index)}</b> · ` : ""}${esc(e.issuer)}</div>
      <div class="ids">${e.ticker ? `<span>Ticker <b>${esc(e.ticker)}</b>${pl ? ` · ${esc(pl.place)}` : ""}</span>` : ""}<span class="fh-isin2" title="Code ISIN : l'identifiant international de l'ETF, le même chez tous les courtiers"><small>ETF · ISIN</small><b>${esc(e.isin)}</b> <button type="button" class="copy" id="ecopy" aria-label="Copier l'ISIN">copier</button></span></div>
      <div class="acts">${favBtn("e:" + e.id)}<button type="button" class="linkbtn" id="epf">+ Ajouter à mon portefeuille</button><a class="pill" href="#ecomp" data-etf-comp>Sa composition</a><a class="pill" href="/outils/recouvrement?a=${e.id}${voisin ? `&b=${voisin.id}` : ""}">${voisin ? `Recouvrement avec ${esc(voisin.name.length > 28 ? voisin.name.slice(0, 26) + "…" : voisin.name)}` : "Se recouvre-t-il avec un autre ETF ?"}</a></div></div></div><div class="px tv rf-etfpx" id="tvinfo"></div></div></div>
      <div class="f2-mid rf-mid${e.tv ? "" : " f2-noc"}">${e.tv ? `<div class="f2-chart"><div class="f2-ch-h"><h2 class="f2-h">Le cours de la part</h2><span class="f2-note">Cours différé</span></div><div class="tv tv-chart f2-tv" id="tvchart" role="img" aria-label="Courbe du cours de ${esc(e.name)}"><div class="f2-tvph">Chargement de la courbe…</div></div></div>` : ""}<div class="fh-sum rf-sum" id="ebref">${ETF_bref(e, null, v)}</div></div>
    </section>
    <div class="cols"><div>
      <section class="panel" id="ebuy"><div class="ph"><h2>Ce que vous achetez vraiment</h2></div><div class="pb"><div class="empty">Chargement de la composition…</div></div></section>
      <div id="ecomp"></div>
      <section class="panel" id="efrais"><div class="ph"><h2>Ce que coûtent ses frais</h2></div><div class="pb" id="efees"></div>
        <div class="pb rf-etfprof"><p class="etfter-l"><b>${e.ter != null ? ETF_pctS(e.ter, 2) : "–"}</b> par an, prélevés dans la valeur de la part${v ? `<span class="etfvd vd-${v.c}"><i></i>${v.w} de sa catégorie</span>` : ""}</p>${v ? `<p class="note" style="margin:4px 0 0">${medBtn("Médiane")} des ${ETF_peers(e).length} ETF « ${esc(ECAT[e.categorie] || "")} » : ${ETF_pctS(v.m, 2)} par an.</p>` : ""}
        ${axes.length >= 2 ? `<div class="prof" style="margin-top:14px"><p class="kick" style="margin-bottom:6px">Sa place dans la catégorie</p>${axes.map(([t, d, r, w]) => `<div class="pa2"><span class="pt"><b>${t}</b><small>${word(r.p, w)}</small></span><span class="pl" title="${esc(d)}"><i class="pm"></i><i class="pd" style="left:${r.p * 100}%;background:${t === "Frais" ? (r.p >= 0.55 ? "var(--g)" : r.p > 0.45 ? "var(--n)" : "var(--o)") : "var(--ink)"}"></i></span></div>`).join("")}<p class="note" style="margin:4px 0 0">Parmi les ${ETF_peers(e).length} ETF de la catégorie suivis par le site ; à droite : moins cher, plus gros, plus diversifié, plus ancien. Le trait du milieu est la ${medBtn()}. Ce n'est pas une note d'achat.</p></div>` : ""}</div></section>
      <section class="panel" id="erisques"><div class="ph"><h2>Les risques à connaître</h2></div><div class="pb" id="erisk"></div></section>
      <section class="panel" id="equestions"><div class="ph"><h2>Vos questions sur cet ETF</h2><span class="light" style="font-size:12.5px">Réponses calculées à partir de la fiche</span></div><div class="pb etffaq" id="eia"></div></section>
    </div><aside>
      <section class="panel" id="ecarac"><div class="ph"><h2>Caractéristiques</h2></div><div class="pb"><dl class="etfkv">
          <dt>Encours</dt><dd><b>${e.encours ? big(e.encours) : "–"}</b> placés dans le fonds</dd>
          ${created ? `<dt>Création</dt><dd>${esc(created)}</dd>` : ""}
          ${e.domicile ? `<dt>Pays du fonds</dt><dd>${esc(e.domicile)}</dd>` : ""}
          ${(e.cotations || []).length > 1 ? `<dt>Cotations</dt><dd>${e.cotations.map(c => `${esc(c.ticker)} <span class="light">${esc(c.place.replace("Euronext ", ""))}</span>`).join(" · ")}</dd>` : ""}
        </dl></div>
        <div class="src">${e.url ? `Caractéristiques relevées sur <a href="${esc(e.url)}" target="_blank" rel="noopener nofollow">la fiche de l'émetteur</a>` : "Caractéristiques relevées sur les documents de l'émetteur"}${e.src ? ` (${esc(e.src)})` : ""}. Vérifiez-les dans le document d'informations clés (DIC) avant d'investir.</div></section>
      <section class="panel"><div class="ph"><h2>Qui crée ce fonds ?</h2></div><div class="pb" id="eemet"></div></section>
      <section class="panel"><div class="ph"><h2>ETF proches</h2>${same.length ? `<a href="/etf?q=${encodeURIComponent(e.index || "")}">Même indice</a>` : ""}</div><div class="pb" id="evois"></div></section>
      <section class="panel"><div class="ph"><h2>Avis des visiteurs</h2></div><div class="pb" id="eavis"></div></section>
      <section class="panel"><div class="ph"><h2>Discussion</h2><a href="/communaute?salon=etf-${e.id}">Ouvrir</a></div><div class="pb" id="cmini"></div></section>
    </aside></div>`;
  if (e.tv) { tv($("#tvinfo"), "single-quote", { symbol: e.tv, width: "100%" }); tvChart($("#tvchart"), e.tv, e.name); }
  try { chatBlock($("#cmini"), "etf-" + e.id, { compact: true }); avisBlock($("#eavis"), "etf-" + e.id, e.name); } catch (x) { }
  $("#ecopy").onclick = () => { try { navigator.clipboard.writeText(e.isin).then(() => toast("ISIN copié : " + esc(e.isin)), () => toast("ISIN : " + esc(e.isin))); } catch (x) { toast("ISIN : " + esc(e.isin)); } };
  $("#epf").onclick = () => ETF_ajoutPf(e);

  // Frais en euros
  const peersIdx = same.filter(x => x.ter != null), cheap = [...peersIdx, ...ETF_peers(e).filter(x => x.id !== e.id)].sort((a, b) => a.ter - b.ter)[0];
  if (e.ter != null) {
    const c10 = ETF_cout(e.ter, 10), c20 = ETF_cout(e.ter, 20);
    const ref = peersIdx.length ? peersIdx.sort((a, b) => a.ter - b.ter)[0] : cheap, refSame = peersIdx.length > 0;
    const gap = ref && ref.ter < e.ter ? c20.cout - ETF_cout(ref.ter, 20).cout : 0;
    $("#efees").innerHTML = `<p class="lead" style="margin-top:0">Pour <b>100 € placés chaque mois</b>, avec une hausse illustrative de 5 % par an avant frais, ses frais courants coûtent au total :</p>
      <div class="etffees"><div><span>Sur 10 ans (12 000 € versés)</span><b>${eur(c10.cout, 0)}</b></div><div><span>Sur 20 ans (24 000 € versés)</span><b>${eur(c20.cout, 0)}</b></div></div>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.55">${ref && ref.ter < e.ter && gap >= 1 ? `L'ETF le moins cher ${refSame ? "sur le même indice" : "de sa catégorie"}, <a class="lnk" href="/etf/${ref.id}">${esc(ref.name)}</a> (${ETF_pctS(ref.ter, 2)} par an), aurait coûté environ <b>${eur(gap, 0)} de moins</b> sur 20 ans${refSame ? "" : ", mais il ne suit pas forcément le même indice"}.` : ref ? `C'est ${refSame ? "l'ETF le moins cher sur cet indice" : "l'un des ETF les moins chers de sa catégorie"} parmi ceux que suit le site.` : ""}</p>
      <p style="margin:0;font-size:14px;line-height:1.55">S'ajoutent les <b>frais de courtage</b>, payés à chaque achat et à chaque vente : ils varient beaucoup d'un courtier à l'autre. <a class="lnk" href="/simulateurs/frais">Comparer les courtiers avec vos montants</a>.</p>
      <div class="etfsrc">Calcul du site : versements mensuels, rendement de 5 % par an choisi pour l'exemple (ce n'est pas une prévision), frais courants déduits chaque année.</div>`;
  } else $("#efees").innerHTML = `<p class="muted" style="margin:0">Frais non communiqués.</p>`;

  // Émetteur
  const mine = ETF.list.filter(x => x.issuer === e.issuer), totEm = mine.reduce((a, x) => a + (x.encours || 0), 0), autres = mine.filter(x => x.id !== e.id && !x.levier).sort((a, b) => (b.encours || 0) - (a.encours || 0)).slice(0, 4);
  $("#eemet").innerHTML = `<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${logo({ name: e.issuer, domain: issuerDom(e) }, 40)}<div><b style="font-size:16px">${esc(e.issuer)}</b><div class="light" style="font-size:12.5px">${F0.format(mine.length)} ETF suivis sur le site${totEm ? ` · ${big(totEm)} d'encours au total` : ""}</div></div></div>
    ${em ? `<p style="margin:0 0 6px;font-size:14px;line-height:1.55">${esc(em[0])}</p>${em[1] ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.55">${esc(em[1])}</p>` : ""}` : ""}
    ${e.domicile ? `<p style="margin:0 0 10px;font-size:13.5px;line-height:1.55;color:var(--grey)"><b style="color:var(--ink)">Fonds de droit ${esc({ Irlande: "irlandais", Luxembourg: "luxembourgeois", France: "français", Allemagne: "allemand" }[e.domicile] || e.domicile)}.</b> ${esc(ETF_DOMI[e.domicile] || "")} Les ETF vendus en Europe suivent la directive UCITS : l'argent des porteurs est séparé de celui de l'émetteur et confié à une banque dépositaire.</p>` : ""}
    ${autres.length ? `<p class="kick" style="margin:6px 0 4px">Ses autres ETF les plus gros</p>${autres.map(x => `<a class="etfnb" href="/etf/${x.id}"><span><b>${esc(x.name)}</b><small>${esc(x.index || "")}</small></span><span class="n">${ETF_pctS(x.ter, 2)}</span></a>`).join("")}<a class="more" style="display:inline-block;margin-top:8px" href="/etf?em=${encodeURIComponent(e.issuer)}">Tous ses ETF →</a>` : ""}`;

  // Voisins
  const nb = [...same.slice(0, 5), ...cat.slice(0, Math.max(0, 6 - Math.min(5, same.length)))];
  $("#evois").innerHTML = nb.length ? `${same.length ? `<p class="note" style="margin:0 0 4px">${F0.format(same.length)} autre${same.length > 1 ? "s" : ""} ETF sur le même indice, du moins cher au plus cher, puis des ETF de la même catégorie.</p>` : `<p class="note" style="margin:0 0 4px">ETF les plus gros de la même catégorie.</p>`}${nb.map(x => `<a class="etfnb" href="/etf/${x.id}" data-ov="${x.id}"><span><b>${esc(x.name)}</b><small>${ETF_idx(x) === ETF_idx(e) ? "Même indice" : esc(x.index || "")}${x.pea === true ? " · PEA" : ""}</small></span><span class="n">${ETF_pctS(x.ter, 2)}</span><span class="ov"></span></a>`).join("")}<a class="more" style="display:inline-block;margin-top:8px" href="/outils/recouvrement?a=${e.id}${nb[0] ? "&b=" + nb[0].id : ""}">Mesurer le chevauchement de deux ETF →</a>` : `<p class="muted" style="margin:0">Pas d'ETF comparable suivi pour l'instant.</p>`;

  // Composition (chargée à la demande)
  const c = await etfComp(e);
  if (!app.contains($("#ebuy"))) return;
  let C = c;
  if (c && !c.niveau) { // ancien format : fonds américain de référence (SEC) ; secteurs d'après les entreprises reconnues par le site
    const m = {}; let known = 0; for (const [isin, w] of c.isins || []) { const co = ISINBY[isin]; if (co) { const k = "§" + co.sector; m[k] = (m[k] || 0) + w; known += w; } }
    C = { ...c, niveau: "indice", proxy: c.proxy || e.proxy, sectors: known > 40 ? Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, w]) => [k, w * 100 / known]) : [] };
  }
  const tops = C && C.top ? C.top.slice(0, 10) : [], secs = C && (C.sectors || []).filter(s => s[1] >= 0.5), ctry = C && (C.countries || []).filter(x => x[1] >= 0.5);
  const t10 = tops.reduce((a, x) => a + (x.pct || 0), 0), nP = ctry ? ctry.length : 0;
  const eb = $("#ebref"); if (eb) eb.innerHTML = ETF_bref(e, C, v);
  $("#ebuy .pb").innerHTML = `${C && C.lines ? "" : `<p class="etfbuy">${ETF_phrase(e, C)}</p>`}
        ${C && C.niveau === "indice" && e.replication === "synthétique" ? `<div class="etfnote" style="margin-top:12px">Ce fonds est <b>synthétique</b> : il détient en réalité un autre panier de titres${C.panier && C.panier.lines ? ` (${F0.format(C.panier.lines)} lignes)` : ""} et reçoit la performance de l'indice ${esc(e.index || "")} par un contrat d'échange avec une banque. Ce qui compte pour vous, c'est l'indice : c'est sa composition qui est montrée ici.</div>` : ""}
    ${e.fiche ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.55"><b>Ce qui fait varier sa valeur :</b> ${esc(e.fiche.varie)}</p>` : ""}
    ${C ? `<div class="etfsrc">${ETF_srcLine(C, e)}</div>` : !e.fiche ? `<div class="etfsrc">La composition détaillée de cet ETF n'est pas encore disponible. Elle est relevée chaque mois sur le site de l'émetteur.</div>` : ""}`;
  if (C && tops.length) {
    const bond = ["obligations", "monetaire"].includes(e.categorie);
    $("#ecomp").innerHTML = `<section class="panel"><div class="ph"><h2>${bond ? "Les 10 plus grosses lignes" : "Les 10 plus grosses entreprises"}</h2><span class="light" style="font-size:12.5px">${C.asOf ? "au " + dLabel(C.asOf) : ""}</span></div><div class="pb">
        ${ETF_risques(e, C).some(r => /<b>Concentration/.test(r[1])) ? "" : `<p class="lead" style="margin:0 0 10px">${ETF_concentration(C)}</p>`}
        ${hbars(tops.map(t => { const co = t.isin && ISINBY[t.isin]; return { label: ETF_nomLigne(t), v: (t.pct || 0) / 100, href: co ? `/entreprise/${co.id}` : null }; }), x => pct(x, 1, false))}
        ${tops.some(t => t.isin && ISINBY[t.isin]) ? `<p class="note" style="margin:8px 0 0">Les noms soulignés au survol mènent à la fiche de l'entreprise, avec ses comptes.</p>` : ""}
        <div class="etfsrc">${ETF_srcLine(C, e)}</div></div></section>
      ${(secs && secs.length && !bond) || (ctry && ctry.length) ? `<section class="panel"><div class="ph"><h2>Où va votre argent</h2></div><div class="pb"><div class="etfcols">
        ${secs && secs.length && !bond ? `<div><h3>Par secteur</h3>${hbars(secs.slice(0, 11).map(([k, x]) => ({ label: k[0] === "§" ? (R.sectors[k.slice(1)] || k.slice(1)) : ETF_SECT[k] || k, v: x / 100, c: k === "liquidites" ? "var(--n)" : null })), x => pct(x, 1, false))}</div>` : ""}
        ${ctry && ctry.length ? `<div><h3>Par pays</h3>${hbars(ctry.slice(0, 10).map(([k, x]) => ({ label: COUNTRY[k] || k, v: x / 100 })), x => pct(x, 1, false))}${ctry.length > 10 ? `<p class="note" style="margin:6px 0 0">Et ${F0.format(ctry.length - 10)} autres pays.</p>` : ""}</div>` : ""}
      </div><div class="etfsrc">${C.proxy ? "Secteurs calculés sur les entreprises de l'indice que le site suit. " : C.niveau === "fonds" ? "Pays de risque et secteurs (classification GICS) indiqués par l'émetteur pour chaque ligne." : "Répartition de l'indice."} ${ETF_srcLine(C, e)}</div></div></section>` : ""}`;
  }
  // Risques
  $("#erisk").innerHTML = `<ul class="etfrisk">${ETF_risques(e, C).map(([k, t]) => `<li class="${k}">${t}</li>`).join("")}</ul><div class="etfsrc">Le niveau de risque officiel (de 1 à 7) figure dans le document d'informations clés (DIC) de l'émetteur.</div>`;
  // Chevauchement avec les voisins
  if (C && C.isins && C.isins.length) {
    const ma = new Map(C.isins);
    for (const a of $$("#evois [data-ov]").slice(0, 5)) {
      const x = ETFBY[a.dataset.ov]; etfComp(x).then(cx => { if (!cx || !cx.isins || !cx.isins.length || !app.contains(a)) return; let ov = 0; for (const [k, w] of cx.isins) if (ma.has(k)) ov += Math.min(w, ma.get(k)); $(".ov", a).textContent = F0.format(Math.min(100, ov)) + " % en commun"; });
    }
  }
  // Questions et FAQ
  const Q = ETF_qa(e, C, voisin);
  const FAQ = [...Q.map(([, q, a]) => [q, a]), ["Où l'acheter ?", `Chez un courtier ou une banque en ligne, comme une action, pendant les heures de cotation${pl ? ` : il est coté sur ${esc(pl.place)} sous le code ${esc(e.ticker)}` : ""}. Son code ISIN, ${esc(e.isin)}, permet de le retrouver chez n'importe quel courtier.`]];
  $("#eia").innerHTML = `<div id="efaq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}</div>
    <form class="etfask" id="eask"><input type="text" placeholder="Une autre question sur cet ETF ?" aria-label="Votre question sur cet ETF" maxlength="300"><button class="btn" type="submit">Demander à l'IA</button></form>
    <p class="note" style="margin:8px 0 0">Les réponses ci-dessus sont calculées à partir des données de la fiche. Les autres questions s'ouvrent dans le panneau ✦ de l'IA. Aucune réponse n'est un conseil d'achat.</p>`;
  $("#eask").onsubmit = ev => { ev.preventDefault(); const q = $("#eask input").value.trim(); if (!q) return; const full = /etf|fonds|il |-il|ce fonds/i.test(q) ? `${q} (${e.name})` : `${e.name} : ${q}`; if (typeof orcIaAsk === "function") { orcIaOpen(); orcIaAsk(full); } else go("/demander?q=" + encodeURIComponent(full)); };
  // La FAQ structurée (FAQPage) est ajoutée au HTML par le Worker (cf/src/etf_meta.mjs) : lisible par les moteurs sans JavaScript.
}
document.head.insertAdjacentHTML("beforeend", `<style>.etf-v{font-family:var(--sans)!important;font-size:15px!important;font-weight:400!important;line-height:1.5!important;color:var(--grey)!important;margin:0 0 14px!important}.etf-v b{color:var(--ink);font-family:var(--mono);font-weight:500}</style>`);

document.addEventListener("click", e => { // « Sa composition » : va à la composition de la fiche, sans passer par le routeur
  const a = e.target.closest && e.target.closest("a[data-etf-comp]"); if (!a) return;
  e.preventDefault(); e.stopImmediatePropagation(); const t = document.getElementById("ecomp"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
}, true);
