// L'actualité « Le monde » : les sujets de la semaine choisis et rédigés par l'IA du site à partir des titres de médias reconnus
// (cf/site/data/actu/monde.json), avec nos chiffres (secteurs, indices). Servis par /api/monde (mondePublic).
// 13/11 (recentrage) : module détaché du rapport de la semaine (avant : cf/src/rapport8.mjs et cf/src/espace.mjs).
import { variationSemaine, SECTEURS, INDICES, lundiDe, addJ as addJour } from "./semaine.mjs";
import { iaJSON, frCorrige } from "./iasite.mjs";
import { CONSIGNES } from "./consignes.mjs";
import { siteData, jourParis, semaineIso, jourSemaine } from "./espace.mjs";
import { json } from "./compte.mjs";

export const r1 = v => Math.round(v * 10) / 10, r0 = v => Math.round(v);
export const SUPPOSE = /pourrai(t|ent)|(a|ont) pu |semble|probablement|sans doute|refl[eè]te/i;
export const addJ = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const med = a => { const p = a.slice().sort((x, y) => x - y), m = p.length >> 1; return p.length ? (p.length % 2 ? p[m] : (p[m - 1] + p[m]) / 2) : null; };
export const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const INDICE_PAYS = { US: ["sp500", "S&P 500"], FR: ["cac40", "CAC 40"], DE: ["dax", "DAX"], GB: ["ftse100", "FTSE 100"], JP: ["nikkei", "Nikkei 225"] };
export function univers(d, lundi, auj) {
  const parSec = {};
  for (const [k, m] of Object.entries(d.meta || {})) {
    if (!m || !m.sector || !d.names[k]) continue;
    const v = variationSemaine(d.cs, k, lundi, auj, d.px[k], d.sem); if (!v) continue;
    const p = d.px[k], cap = p && p.cap > 0 ? (p.cur === "EUR" || !p.cur ? p.cap : d.fx && d.fx[p.cur] > 0 ? p.cap * d.fx[p.cur] : 0) : 0; // capitalisation en euros, pour classer les plus grandes
    (parSec[m.sector] = parSec[m.sector] || []).push({ k, nom: d.names[k], v: v.pct, cap, region: m.region });
  }
  return parSec;
}
export function trancheMonde(jour) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  if (String(jour).slice(0, 10) !== `${p.year}-${p.month}-${p.day}`) return "";
  return "|h" + Math.floor((Number(p.hour) % 24) / 3);
}
export const MOTS_VIDES = new Set(("avec dans pour plus sans sous vers chez entre apres avant contre depuis pendant selon comme mais donc cette leur leurs elle elles nous vous sont ete etre avoir fait faire tout tous toute toutes tres aussi alors ainsi encore deja face pres " +
  "this that with from have will what when where which while their there they them than then into over after before about amid among says said say could would should more most much many some just here your ours does been being were also back make made take " +
  "stock stocks share shares market markets today news live update updates week weekly daily year years month months report reports price prices high highs lows record records rise rises rose fall falls fell gain gains drop drops jump jumps surge surges slump " +
  "bourse marche marches action actions hausse baisse semaine jour jours annee annees mois prix cours point points milliard milliards million millions billion billions trillion percent first last next best ahead still amid why how " +
  "watch know need things three five seven top buy sell hold check latest inside outside video photos explained analysis opinion editorial election elections results result wall street talks could worth here").split(" "));
export function motsTitre(t) { return [...new Set(fold(String(t || "")).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !MOTS_VIDES.has(w) && !/^\d+$/.test(w)))]; }
/* 14/11 (Romain : « il faut que l'actualité soit mieux traitée ») : le site s'adresse à des lecteurs français et européens.
   Avant, un sujet comptait par le nombre de médias qui le reprenaient : quatre journaux indiens qui se reprennent entre eux
   suffisaient à mettre l'inflation indienne en tête. Maintenant, chaque média a une région (France, Europe, États-Unis,
   Royaume-Uni, Asie et autres) ; un sujet compte surtout par le nombre de régions qui en parlent, la France et l'Europe pèsent
   un peu plus, chaque région est plafonnée dans la liste envoyée à l'IA, et les sites de conseils boursiers sont écartés. */
const ZONE_FR = /\.(fr|be|ch)$|^(france24\.com|euronews\.com|bfmtv\.com|boursier\.com|journaldunet\.com|lerevenu\.com|connaissancedesenergies\.org|lesnumeriques\.com|01net\.com|numerama\.com|journalauto\.com)$/;
const ZONE_EU = /\.(de|at|es|it|nl|se|dk|no|fi|ie|eu|pt|pl)$|^(dw\.com|ft\.com|politico\.eu|euronews\.com|reuters\.com|economist\.com|hellenicshippingnews\.com|lloydslist\.com|splash247\.com|tradewindsnews\.com|seatrade-maritime\.com|expansion\.com|elpais\.com|elmundo\.es|abc\.es|lavanguardia\.com|eleconomista\.es|elconfidencial\.com|corriere\.it|repubblica\.it|lastampa\.it|ansa\.it|faz\.net|irishtimes\.com|independent\.ie|rte\.ie|businesspost\.ie|handelsblatt\.com|cincodias\.elpais\.com|ilsole24ore\.com|milanofinanza\.it)$/;
const ZONE_UK = /\.co\.uk$|^(bbc\.com|news\.sky\.com|sky\.com|cityam\.com|theguardian\.com|independent\.co\.uk|telegraph\.co\.uk|thetimes\.co\.uk)$/;
const ZONE_AS = /\.(in|jp|cn|kr|sg|hk|au|ph|ca)$|indiatimes\.com$|^(livemint\.com|moneycontrol\.com|business-standard\.com|thehindubusinessline\.com|scmp\.com|straitstimes\.com|caixinglobal\.com|koreaherald\.com|rappler\.com|theglobeandmail\.com|financialpost\.com|bnnbloomberg\.ca|aljazeera\.com|afr\.com|smh\.com\.au|asia\.nikkei\.com)$/;
export const zoneMedia = s => { s = String(s || "").toLowerCase().replace(/^www\./, ""); return ZONE_FR.test(s) ? "FR" : ZONE_UK.test(s) ? "UK" : ZONE_EU.test(s) ? "EU" : ZONE_AS.test(s) ? "AS" : "US"; };
const ZONE_POIDS = { FR: 1.3, EU: 1.2, UK: 1, US: 1, AS: 0.7 };
const ZONE_MAX = { FR: 50, EU: 40, UK: 30, US: 45, AS: 15 }; // titres au plus par région dans les 140 envoyés à l'IA
const CONSEILS = /^(fool\.com|investopedia\.com|thestreet\.com|kitco\.com|proactiveinvestors\.co\.uk|finanzen\.net|boerse-online\.de|moneyvox\.fr|mieuxvivre-votreargent\.fr)$/; // conseils et cours, pas des sujets d'actualité
export function choisirTitres(items, max = 140) {
  items = items.filter(x => !CONSEILS.test(String(x.s || "").replace(/^www\./, "")));
  const M = items.map(x => ({ x, w: motsTitre(x.t), z: zoneMedia(x.s) })), src = new Map(), zon = new Map();
  for (const m of M) for (const w of m.w) { let S = src.get(w), Z = zon.get(w); if (!S) src.set(w, S = new Set()); if (!Z) zon.set(w, Z = new Set()); S.add(m.x.s); Z.add(m.z); }
  const nbMedias = new Set(items.map(x => x.s)).size || 1;
  // un mot repris par plus de 40 % des médias ne distingue plus rien ; par moins de 3 médias, ce n'est pas encore un sujet
  const poids = w => { const n = (src.get(w) || new Set()).size; if (n < 3 || n > Math.max(6, nbMedias * 0.4)) return 0; const Z = zon.get(w); return n * (0.4 + 0.3 * Z.size) * Math.max(...[...Z].map(z => ZONE_POIDS[z])); };
  for (const m of M) { const P = m.w.map(w => [w, poids(w)]).filter(p => p[1]).sort((a, b) => b[1] - a[1]); m.cle = P[0] ? P[0][0] : null; m.score = ((P[0] ? P[0][1] : 0) + (P[1] ? P[1][1] * 0.5 : 0)) * ZONE_POIDS[m.z]; m.repris = P[0] ? src.get(P[0][0]).size : 1; m.regions = P[0] ? zon.get(P[0][0]).size : 1; }
  M.sort((a, b) => b.score - a.score || b.x.d.localeCompare(a.x.d));
  const parCle = {}, parMedia = {}, parZone = {}, vus = new Set(), out = [];
  for (const m of M) { if (out.length >= max) break; if (!m.cle) continue;
    const t = fold(m.x.t).slice(0, 60); if (vus.has(t)) continue;
    if ((parCle[m.cle] || 0) >= 7 || (parMedia[m.x.s] || 0) >= 10 || (parZone[m.z] || 0) >= ZONE_MAX[m.z]) continue;
    // dans un même sujet, un média ne parle qu'une fois tant que d'autres médias restent à citer
    if (out.some(o => o.cle === m.cle && o.x.s === m.x.s) && (parCle[m.cle] || 0) < 4) continue;
    vus.add(t); parCle[m.cle] = (parCle[m.cle] || 0) + 1; parMedia[m.x.s] = (parMedia[m.x.s] || 0) + 1; parZone[m.z] = (parZone[m.z] || 0) + 1; out.push(m); }
  return out.map(m => ({ ...m.x, repris: m.repris, regions: m.regions, zone: m.z }));
}
export async function mondeDe(env, d, n, lundi, auj) {
  const fin = addJ(lundi, 6), items = ((d.monde && d.monde.items) || []).filter(x => x && x.d && x.d.slice(0, 10) >= addJ(lundi, -2) && x.d.slice(0, 10) <= fin && x.t && x.u);
  if (items.length < 4) return null;
  const T = choisirTitres(items, 140); // du plus important au moins important (12/11)
  const parSec = univers(d, lundi, auj), secteurs = {};
  for (const [s, L] of Object.entries(parSec)) secteurs[s] = { nom: SECTEURS[s] || s, mediane_pct: r1(med(L.map(x => x.v))), n: L.length };
  // Les faits envoyés à l'IA sont coupés à 14 000 caractères par iaJSON : on retire des titres (les plus anciens) jusqu'à tenir dedans,
  // sinon le JSON arrive tronqué (7/11 : 128 titres, réponse perdue)
  const faits = { semaine_du: lundi, au: fin, indices: (n.indices || []).map(i => ({ id: i.id, nom: i.nom, variation_pct: i.pct })), secteurs, titres: [] };
  const ZN = { FR: "France", EU: "Europe", UK: "Royaume-Uni", US: "États-Unis", AS: "Asie et autres" };
  while (T.length && (faits.titres = T.map((x, i) => ({ i, date: x.d.slice(0, 10), media: x.s, region_du_media: ZN[x.zone] || "", medias_sur_ce_sujet: x.repris, regions_sur_ce_sujet: x.regions, titre: x.t.slice(0, 120) })), JSON.stringify(faits).length > 13500)) T.pop();
  const valide = o => {
    if (!o || !Array.isArray(o.sujets)) return null;
    const S = o.sujets.slice(0, 10).map(s => ({ // 8/11 (Romain : « étoffer le monde ») : jusqu'à 10 sujets
      titre: String(s.titre || "").replace(/—/g, ",").slice(0, 100), theme: String(s.theme || "").slice(0, 50), fait: String(s.fait || "").replace(/—/g, ",").slice(0, 360),
      titres: [...new Set((Array.isArray(s.titres) ? s.titres : []).map(Number).filter(i => Number.isInteger(i) && T[i]))].slice(0, 3),
      secteurs: (Array.isArray(s.secteurs) ? s.secteurs : []).filter(x => x in secteurs).slice(0, 3),
      pays: (Array.isArray(s.pays) ? s.pays : []).map(x => String(x).toUpperCase()).filter(x => /^[A-Z]{2}$/.test(x)).slice(0, 3) }))
      .map(s => ({ ...s, titre: frCorrige(s.titre.replace(/^Le livre sterling/i, "La livre sterling")), fait: frCorrige(s.fait) }))
      .map(s => ({ ...s, fait: s.fait.split(/(?<=\.)\s+/).filter(ph => !SUPPOSE.test(ph) && !/[«"“]|selon des titres|des titres comme/i.test(ph)).join(" ") })) // 7/11 nuit : plus de titres anglais recopiés dans le texte (ils sont en lien sous le sujet)
      .filter(s => s.titre.length > 8 && s.fait.length > 30 && s.titres.length >= 2) // 6/11 : un sujet porté par un seul titre est écarté
      .filter(s => new Set(s.titres.map(i => T[i].s)).size >= 2 && !/\brumeurs?\b/i.test(s.fait)); // 12/11 : au moins deux médias différents, et jamais de « rumeurs »
    return S.length ? { sujets: S } : null;
  };
  /* 12/11 midi : pour le jour en cours, les sujets sont refaits toutes les 3 heures (13/11 ; quatre fois par jour le 12/11) au lieu d'une : une nouvelle du soir n'attend plus le lendemain. */
  const r = await iaJSON(env, "monde14|" + lundi + "|" + auj + trancheMonde(auj), CONSIGNES.semaine_monde, faits, 1900, valide).catch(() => null);
  if (!r) return null;
  // Nos chiffres pour chaque sujet : médiane du secteur, ses plus grandes entreprises, l'indice du pays ; les valeurs du lecteur concernées
  const ctx = (d.contexte && d.contexte.sujets) || [];
  const sujets = r.sujets.map(s => {
    const chiffres = [];
    for (const sk of s.secteurs) { const L = parSec[sk] || []; if (!L.length) continue;
      chiffres.push({ lab: `${SECTEURS[sk] || sk} : médiane de ${L.length} entreprises`, v: r1(med(L.map(x => x.v))) });
      L.filter(x => x.cap > 0).sort((a, b) => b.cap - a.cap).slice(0, s.secteurs.length > 1 ? 2 : 3).forEach(x => chiffres.push({ lab: x.nom, k: x.k, v: x.v })); } // sans capitalisation connue : la médiane seule
    for (const p of s.pays) { const ix = INDICE_PAYS[p], v = ix && variationSemaine(d.cs, "i:" + ix[0], lundi, auj, d.px["i:" + ix[0]], d.sem); if (v) chiffres.push({ lab: ix[1], v: v.pct }); }
    const touche = (n.lignes || []).filter(l => { const m = d.meta[l.k]; return m && (s.secteurs.includes(m.sector) || s.pays.includes(m.region)); })
      .map(l => ({ k: l.k, nom: l.nom, v: l.variation_semaine_pct, eur: l.portefeuille && l.portefeuille.var_eur != null ? r0(l.portefeuille.var_eur) : null }));
    // dossier de fond du site (contexte.json) : au moins deux termes différents de son dossier dans le titre et le fait du sujet
    // (les mots des dossiers sont larges : « taux » seul rattachait la Banque d'Angleterre au dossier de la BCE)
    const txt = fold(s.titre + " " + s.fait);
    const fond = ctx.find(c => { try { return c.mots && new Set((txt.match(new RegExp(c.mots, "g")) || [])).size >= 2; } catch (e) { return false; } });
    return { ...s, titres: s.titres.map(i => ({ t: T[i].t, s: T[i].s, u: T[i].u, d: T[i].d.slice(0, 10) })), chiffres: chiffres.slice(0, 5), touche: touche.slice(0, 6),
      fond: fond ? { id: fond.id, titre: fond.titre, maj: fond.maj } : null };
  });
  return { sujets, modele: r.modele || null };
}

/* 13/11 (Romain : 10 secondes d'attente, 3 sujets) : le visiteur n'attend plus jamais l'IA.
   Les sujets de la semaine sont gardés en base et servis tout de suite ; au-delà de 2 heures ils sont refaits en arrière-plan.
   Les nouveaux sujets s'ajoutent aux anciens de la semaine (10 au plus, les plus récents d'abord) : une mise à jour ne peut plus en retirer. */
const mondePlie = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const mondeMots = t => new Set(mondePlie(t).split(/[^a-z0-9]+/).filter(w => w.length > 3));
/* Noms propres d'un titre : les mots qui commencent par une majuscule ailleurs qu'en tête de titre (Nvidia, Huang, Ukraine, Inde).
   13/11 : avant, un seul mot courant en commun (« publie », « annonce ») suffisait à confondre deux sujets différents. */
const mondeNoms = t => new Set(String(t || "").split(/[^\p{L}\p{N}]+/u).slice(1).filter(w => w.length > 3 && /^\p{Lu}/u.test(w)).map(mondePlie));
function mondeMeme(a, b) {
  const ua = new Set((a.titres || []).map(x => x.u)); if ((b.titres || []).some(x => ua.has(x.u))) return true;
  const ma = mondeMots(a.titre), mb = mondeMots(b.titre); let n = 0; for (const w of ma) if (mb.has(w)) n++;
  if (n >= 2) return true;
  const na = mondeNoms(a.titre), nb = mondeNoms(b.titre); for (const w of na) if (nb.has(w)) return true;
  return false;
}
/* 14/11 : un sujet dont tous les titres cités viennent de médias « Asie et autres » (un seul pays lointain, repris par sa presse
   nationale) n'est plus montré, même s'il avait été choisi plus tôt dans la semaine (les sujets s'accumulent). Les sujets repris
   dans plusieurs régions passent devant, l'ordre de l'IA départageant les autres. */
export const mondeRegions = x => new Set((x.titres || []).map(t => zoneMedia(t.s))).size;
export const mondeLointain = x => (x.titres || []).length > 0 && (x.titres || []).every(t => zoneMedia(t.s) === "AS");
// Pays qui pèsent pour un lecteur européen : l'Europe, les États-Unis, la Chine, le Japon, et les pays dont dépendent l'énergie
// et les grands conflits suivis par les marchés. Un sujet qui ne parle que d'autres pays (Inde, Canada, Australie…) passe après.
const PAYS_PROCHES = new Set("FR DE IT ES NL BE LU CH AT PT IE GB SE DK NO FI PL GR CZ HU RO EU US CN JP TW KR RU UA IL IR SA AE QA".split(" "));
export const mondeProche = x => !(x.pays || []).length || (x.pays || []).some(p => PAYS_PROCHES.has(p));
export function mondeFusion(neufs, anciens) {
  const out = [];
  for (const x of [...(neufs || []), ...(anciens || [])]) if (x && !mondeLointain(x) && !out.some(y => mondeMeme(x, y))) out.push(x);
  return out.map((x, i) => [x, i]).sort((a, b) => mondeProche(b[0]) - mondeProche(a[0]) || a[1] - b[1]).map(p => p[0]).slice(0, 10);
}
async function mondeCalcul(request, env, auj, ancien) {
  const d = await siteData(request, env);
  const calc = async decal => {
    const jour = decal ? addJour(auj, -((jourSemaine(auj) + 6) % 7) - 1) : auj, semaine = semaineIso(jour), lundi = lundiDe(semaine);
    // variation de la semaine des trois grands indices, calculée ici (avant le 13/11 : par le code du rapport de la semaine)
    const n = { lignes: [], indices: ["cac40", "stoxx50", "sp500"].map(id => { const v = variationSemaine(d.cs, "i:" + id, lundi, jour, d.px["i:" + id], d.sem); return v ? { id, nom: INDICES[id], pct: v.pct } : null; }).filter(Boolean) };
    const m = await mondeDe(env, d, n, lundi, jour).catch(() => null);
    if (!m || !(m.sujets || []).length) return null;
    m.sujets.forEach(x => { x.chiffres = (x.chiffres || []).filter(c => c.v != null && c.v !== 0); });
    return { du: lundi, au: addJour(lundi, 6), jour, sujets: m.sujets, modele: m.modele || null };
  };
  const cur = await calc(0);
  if (cur) cur.sujets = ancien && !ancien.semaine_passee && ancien.du === cur.du ? mondeFusion(cur.sujets, ancien.sujets) : mondeFusion(cur.sujets, []);
  if (!cur && ancien) return null;
  if (cur && cur.sujets.length >= 6) return { ...cur, genere: Date.now() };
  const prev = ancien && ancien.precedente ? ancien.precedente : await calc(7);
  if (cur) return { ...cur, genere: Date.now(), precedente: prev };
  if (prev) return { ...prev, genere: Date.now(), semaine_passee: true };
  return null;
}
export async function mondePublic(request, env, ctx) {
  const auj = jourParis(), cle = "monde7|" + lundiDe(semaineIso(auj));
  let garde = null, age = Infinity;
  if (env.DB) try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS monde_pub (k TEXT PRIMARY KEY, txt TEXT NOT NULL, at INTEGER NOT NULL)`).run();
    const h = await env.DB.prepare(`SELECT txt, at FROM monde_pub WHERE k = ?`).bind(cle).first(); if (h) { garde = JSON.parse(h.txt); age = Date.now() - h.at; } } catch (e) { }
  /* première lecture de la semaine avec la nouvelle clé : on reprend les sujets gardés jour par jour par l'ancienne (monde6|jour) */
  if (!garde && env.DB) try {
    const lundi = lundiDe(semaineIso(auj));
    const R = await env.DB.prepare(`SELECT k, txt FROM monde_pub WHERE k LIKE 'monde6|%' AND k >= ? ORDER BY at DESC LIMIT 7`).bind("monde6|" + lundi).all();
    let S = [];
    for (const r of (R.results || [])) { const o = JSON.parse(r.txt); if (o && o.du === lundi && !o.semaine_passee) S = mondeFusion(S, o.sujets); }
    if (S.length) garde = { du: lundi, au: addJour(lundi, 6), jour: auj, sujets: S, modele: null, reprise: true };
  } catch (e) { }
  const refaire = async () => {
    const out = await mondeCalcul(request, env, auj, garde).catch(() => null);
    if (out && env.DB) try { await env.DB.prepare(`INSERT OR REPLACE INTO monde_pub (k, txt, at) VALUES (?, ?, ?)`).bind(cle, JSON.stringify(out), Date.now()).run(); } catch (e) { }
    return out;
  };
  if (garde && garde.reprise) { const out = await refaire(); return json(out || garde); }
  if (garde && (garde.sujets || []).length) {
    if (age > 2 * 36e5) {
      if (env.DB) try { await env.DB.prepare(`UPDATE monde_pub SET at = ? WHERE k = ?`).bind(Date.now() - 2 * 36e5 + 5 * 6e4, cle).run(); } catch (e) { }
      if (ctx && ctx.waitUntil) ctx.waitUntil(refaire());
    }
    return json(garde);
  }
  const out = await refaire();
  if (!out) return json({ sujets: [], message: "Pas encore assez de titres cette semaine." });
  return json(out);
}
