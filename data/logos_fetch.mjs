// Logos hébergés par le site, pour les entreprises suivies (les 300 plus grosses capitalisations d'abord).
// 5e passage (31/10/2026) : le robot précédent faisait un appel Wikidata par entreprise et chaque appel partait en délai
// dépassé depuis GitHub (journal du run 41184365749). Nouveau robot, lent et groupé :
//   1. Wikidata, par paquets de 50 entreprises (wbgetentities, propriété P154 = logo), 4 s entre deux appels ;
//   2. Wikimedia Commons, par paquets de 50 fichiers (licence, auteur, vignette) ; seulement les licences libres
//      (domaine public, CC0, CC BY, CC BY-SA, PD-textlogo) ; l'index garde la licence et l'auteur (attribution) ;
//   3. l'image via upload.wikimedia.org (vignette 128 px) ou, en dernier recours, Special:FilePath ;
//   4. sinon le site officiel (domaine de univers-min.json) avec un User-Agent de navigateur courant :
//      apple-touch-icon.png, puis la balise <link rel="icon"> la plus grande (SVG ou PNG ≥ 64 px).
// Le logo est réduit à 64 px (PNG, fond transparent) et écrit dans cf/site/logos/<id>.png. Jamais d'appel depuis le navigateur
// du visiteur : s'il manque, le site affiche une pastille à l'initiale.
// Chaque passage ne traite que les entreprises sans logo ou dont le logo a plus de 90 jours, --max N au plus (150 par défaut) ;
// une panne réseau ne vaut pas « absent » : on réessaie la nuit suivante jusqu'à couvrir les 300.
// Bilan dans data/diagnostic.json (logos: { disponibles, commons, site_officiel, initiale, top300, pannes }).
// Usage : node data/logos_fetch.mjs [--max N] [--top N]   (robot logos.yml ; CONTACT = adresse de contact pour le User-Agent)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";
const CONTACT = process.env.CONTACT || "";
const UA = `bilan-logos/2.0 (https://repere-bourse.pages.dev${CONTACT ? "; " + CONTACT : ""}) node-fetch`;
const UA_NAV = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? +process.argv[i + 1] || d : d; };
const max = arg("--max", 150), TOP = arg("--top", 300);
const PAUSE_WM = 4000, PAUSE_SITE = 1000;
const wd = (() => { try { return JSON.parse(readFileSync("cf/site/data/wikidata.json", "utf8")).items || {}; } catch (e) { return {}; } })();
const px = (() => { try { return JSON.parse(readFileSync("cf/site/data/cours.json", "utf8")).items || {}; } catch (e) { return {}; } })();
const U = JSON.parse(readFileSync("cf/site/data/univers-min.json", "utf8")).companies;
mkdirSync("cf/site/logos", { recursive: true });
const idx = existsSync("cf/site/logos/index.json") ? JSON.parse(readFileSync("cf/site/logos/index.json", "utf8")) : { maj: null, l: {} };
idx.l = idx.l || {};
const jour = new Date().toISOString().slice(0, 10), FRAIS = 90 * 864e5;
const aRevoir = c => { const x = idx.l[c.id]; if (!x || !x.maj) return true; const age = Date.now() - Date.parse(x.maj); // 1/11 : sans logo, on réessaie après 30 jours, et tout de suite si le passage précédent n'avait pas les essais « www. »
  return x.f ? age >= FRAIS : !(x.absent && x.v2 && age < 30 * 864e5); };
const FX = (() => { try { return JSON.parse(readFileSync("cf/site/data/fx.json", "utf8")).eur || {}; } catch (e) { return {}; } })();
const capE = c => { const p = px["c:" + c.id]; return p && p.cap ? p.cap * (p.cur === "EUR" ? 1 : FX[p.cur] || 0) : 0; };
const parCap = (a, b) => capE(b) - capE(a);
const top300 = U.slice().sort(parCap).slice(0, TOP);
// Ordre : le top 300 d'abord, puis le reste par capitalisation ; seulement ce qui est à revoir
const ordre = top300.concat(U.slice().sort(parCap).slice(TOP)).filter(aRevoir).slice(0, max);
const OK = /^(cc0|cc-by(-sa)?-[0-9.]+|cc by|pd|public domain|pd-textlogo|pd-shape|pd-ineligible)/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pannes = 0;
async function fetchR(u, o = {}, essais = 2) { // une relance après 10 s sur délai dépassé ou 429/5xx
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA, ...(o.headers || {}) }, signal: AbortSignal.timeout(o.timeout || 25000), redirect: "follow" });
      if ((r.status === 429 || r.status >= 500) && i < essais) { await sleep(10000); continue; }
      return r;
    } catch (e) { if (i >= essais) throw e; await sleep(10000); }
  }
}
async function json(u) { const r = await fetchR(u, { headers: { accept: "application/json" } }); if (!r.ok) throw new Error(r.status + " " + u.slice(0, 80)); return r.json(); }
async function image(u, nav) {
  const r = await fetchR(u, { headers: { "user-agent": nav ? UA_NAV : UA, accept: "image/*,*/*;q=0.5" }, timeout: 20000 }, 1);
  if (!r.ok) throw new Error("image " + r.status);
  const ct = r.headers.get("content-type") || "";
  if (!/image|octet-stream|svg/.test(ct)) throw new Error("pas une image : " + ct.slice(0, 30));
  return Buffer.from(await r.arrayBuffer());
}
async function ecrire(c, buf) { // 64 px, fond transparent ; un logo trop petit (< 32 px) ou vide est refusé
  const img = sharp(buf, { density: 300 }), meta = await img.metadata();
  if ((meta.width || 0) < 32 && (meta.height || 0) < 32 && meta.format !== "svg") throw new Error("trop petit");
  await img.resize(64, 64, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(`cf/site/logos/${c.id}.png`);
}
const paquets = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

// 1. Wikidata : fichier du logo (P154) pour tous les Q, par 50
const avecQ = ordre.filter(c => wd[c.id] && wd[c.id].q);
const fichier = {}; // id → "Nom du fichier.svg"
let wikidataOK = true;
for (const p of paquets(avecQ, 50)) {
  const ids = p.map(c => wd[c.id].q).join("|");
  try {
    const e = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims&format=json`);
    for (const c of p) { const ent = e.entities && e.entities[wd[c.id].q], cl = ent && ent.claims && ent.claims.P154, v = cl && cl[0] && cl[0].mainsnak.datavalue && cl[0].mainsnak.datavalue.value; if (v) fichier[c.id] = v; }
    console.log(`Wikidata : ${p.length} entreprises lues, ${p.filter(c => fichier[c.id]).length} avec un logo déclaré`);
  } catch (e) { pannes++; wikidataOK = false; console.error("Wikidata :", String(e).slice(0, 120)); }
  await sleep(PAUSE_WM);
}
// 2. Commons : licence, auteur et vignette, par 50 fichiers
const info = {}; // fichier → { lic, auteur, thumb, url }
const fichiers = [...new Set(Object.values(fichier))];
for (const p of paquets(fichiers, 50)) {
  const titres = p.map(f => "File:" + f.replace(/ /g, "_")).join("|");
  try {
    const r = await json(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titres)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=128&format=json`);
    const norm = {}; for (const n of (r.query && r.query.normalized) || []) norm[n.to] = n.from;
    for (const page of Object.values((r.query && r.query.pages) || {})) {
      const ii = page.imageinfo && page.imageinfo[0]; if (!ii) continue;
      const meta = ii.extmetadata || {}, lic = (meta.LicenseShortName && meta.LicenseShortName.value) || "", auteur = (meta.Artist && meta.Artist.value.replace(/<[^>]+>/g, "")) || "";
      const t = (norm[page.title] || page.title).replace(/^File:/, "");
      info[t] = info[t.replace(/_/g, " ")] = { lic, auteur, thumb: ii.thumburl, url: ii.url, titre: page.title };
    }
    console.log(`Commons : ${p.length} fichiers lus`);
  } catch (e) { pannes++; console.error("Commons :", String(e).slice(0, 120)); }
  await sleep(PAUSE_WM);
}
// 3 et 4. Image par entreprise : Commons (upload.wikimedia.org) puis site officiel
async function siteOfficiel(c) {
  const dom = (c.domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""); if (!dom) return null;
  const bases = [`https://${dom}`, ...(dom.startsWith("www.") ? [] : [`https://www.${dom}`])]; // 1/11 : beaucoup de sites ne répondent qu'avec « www. »
  const essais = bases.flatMap(b => [`${b}/apple-touch-icon.png`, `${b}/apple-touch-icon-precomposed.png`]);
  for (const base of bases) try { // la balise <link rel="icon"> (ou l'icône de tuile Windows) la plus grande de la page d'accueil
    const r = await fetchR(base, { headers: { "user-agent": UA_NAV, accept: "text/html,application/xhtml+xml", "accept-language": "fr,en;q=0.8" }, timeout: 20000 }, 1);
    if (r.ok) {
      const html = (await r.text()).slice(0, 300000), links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(l => /rel=["'][^"']*(apple-touch-icon|icon)[^"']*["']/i.test(l));
      const cand = links.map(l => { const href = (l.match(/href=["']([^"']+)["']/i) || [])[1], sizes = (l.match(/sizes=["'](\d+)x\d+["']/i) || [])[1], svg = /svg/i.test(l) || /\.svg(\?|$)/i.test(href || ""); return href ? { href: new URL(href, r.url).href, taille: svg ? 999 : +sizes || 0 } : null; }).filter(Boolean).sort((a, b) => b.taille - a.taille);
      for (const x of cand) if (x.taille >= 64 || x.taille === 0) essais.unshift(x.href); // la balise déclarée passe avant les noms devinés
      const tuile = (html.match(/<meta[^>]+name=["']msapplication-TileImage["'][^>]+content=["']([^"']+)["']/i) || [])[1]; if (tuile) essais.push(new URL(tuile, r.url).href);
      break;
    }
  } catch (e) { }
  for (const u of essais) { try { const buf = await image(u, true); await ecrire(c, buf); return { maj: jour, f: `${c.id}.png`, licence: "site officiel", source: u, src: "site" }; } catch (e) { } }
  return null;
}
let n = 0, nc = 0, ns = 0;
// 1/11 : le passage du 1/11 a trouvé 816 logos puis a dépassé les 80 minutes de GitHub avant d'enregistrer : tout était perdu.
// Désormais l'index est enregistré toutes les 25 entreprises, et le robot s'arrête de lui-même après DUREE_MIN minutes (65 par défaut).
const t0 = Date.now(), DUREE = (+process.env.DUREE_MIN || 65) * 60000; let k = 0;
for (const c of ordre) {
  if (Date.now() - t0 > DUREE) { console.log(`Temps écoulé : arrêt propre après ${k} entreprises, la suite au prochain passage`); break; }
  if (++k % 25 === 0) { idx.maj = jour; writeFileSync("cf/site/logos/index.json", JSON.stringify(idx)); }
  let r = null, refus = "", panne = false, f = fichier[c.id], i = f && (info[f] || info[f.replace(/ /g, "_")]);
  if (i) {
    if (!OK.test(i.lic)) refus = i.lic;
    else {
      const urls = [i.thumb, i.url, `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=128`].filter(Boolean);
      for (const u of urls) { try { await ecrire(c, await image(u)); r = { maj: jour, f: `${c.id}.png`, licence: i.lic, auteur: i.auteur.slice(0, 120), source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(i.titre)}`, src: "commons" }; break; } catch (e) { panne = /Timeout|fetch failed|ECONN/.test(String(e)); console.error(c.id, "commons :", String(e).slice(0, 90)); } }
      await sleep(PAUSE_WM);
    }
  }
  if (!r) { try { r = await siteOfficiel(c); } catch (e) { panne = true; console.error(c.id, "site :", String(e).slice(0, 90)); } await sleep(PAUSE_SITE); }
  if (r) { idx.l[c.id] = r; n++; if (r.src === "commons") nc++; else ns++; console.log(`${c.id} : ${r.src === "commons" ? "Commons (" + r.licence + ")" : "site officiel"}`); }
  else if (!panne && wikidataOK) { idx.l[c.id] = { maj: jour, absent: true, v2: true, ...(refus ? { licence: refus } : {}) }; console.log(`${c.id} : aucun logo utilisable${refus ? " (licence " + refus + ")" : ""}`); }
  else { pannes++; console.log(`${c.id} : panne réseau, à réessayer`); }
}
idx.maj = jour;
writeFileSync("cf/site/logos/index.json", JSON.stringify(idx));
const tous = Object.values(idx.l), dispo = tous.filter(x => x.f).length, commonsN = tous.filter(x => x.f && x.src !== "site").length, siteN = tous.filter(x => x.f && x.src === "site").length;
const top300ok = top300.filter(c => idx.l[c.id] && idx.l[c.id].f).length;
try { const d = existsSync("data/diagnostic.json") ? JSON.parse(readFileSync("data/diagnostic.json", "utf8")) : {}; d.logos = { date: jour, disponibles: dispo, commons: commonsN, site_officiel: siteN, initiale: U.length - dispo, top300: top300ok, pannes, traitees: ordre.length }; writeFileSync("data/diagnostic.json", JSON.stringify(d, null, 1)); } catch (e) { }
console.log(`${n} logos écrits ce passage (${nc} Commons, ${ns} site officiel), ${pannes} pannes ; ${dispo} disponibles au total, ${top300ok} parmi les ${TOP} plus grosses capitalisations`);
