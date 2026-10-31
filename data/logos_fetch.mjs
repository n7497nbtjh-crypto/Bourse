// Logos hébergés par le site, pour les entreprises suivies (les plus grosses capitalisations d'abord).
// Deux sources, dans l'ordre :
//   1. Wikimedia Commons : le logo déclaré sur Wikidata (P154), seulement sous licence libre (domaine public, CC0, CC BY,
//      CC BY-SA, « marque déposée, pas d'originalité » : PD-textlogo). L'index garde la licence et l'auteur (attribution).
//   2. Le site officiel de l'entreprise (domaine connu dans univers-min.json) : apple-touch-icon.png, puis la balise
//      <link rel="icon"> la plus grande (SVG ou PNG ≥ 64 px). L'index note la source « site officiel ».
// Le logo est réduit à 64 px (PNG, fond transparent) et écrit dans cf/site/logos/<id>.png. Jamais d'appel depuis le navigateur
// du visiteur : s'il manque, le site affiche une pastille à l'initiale.
// Chaque passage ne traite que les entreprises sans logo ou dont le logo a plus de 90 jours, --max N au plus (150 par défaut).
// Le bilan est écrit dans data/diagnostic.json (logos: { disponibles, commons, site_officiel, initiale }).
// Usage : node data/logos_fetch.mjs [--max N]   (robot des données ; ~1 requête par seconde)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";
const UA = `bilan.-logos/1.1 (${process.env.CONTACT || "contact@repere-bourse.pages.dev"})`;
const max = +(process.argv[process.argv.indexOf("--max") + 1] || 0) || 150;
const wd = (() => { try { return JSON.parse(readFileSync("cf/site/data/wikidata.json", "utf8")).items || {}; } catch (e) { return {}; } })();
const px = (() => { try { return JSON.parse(readFileSync("cf/site/data/cours.json", "utf8")).items || {}; } catch (e) { return {}; } })();
const U = JSON.parse(readFileSync("cf/site/data/univers-min.json", "utf8")).companies;
mkdirSync("cf/site/logos", { recursive: true });
const idx = existsSync("cf/site/logos/index.json") ? JSON.parse(readFileSync("cf/site/logos/index.json", "utf8")) : { maj: null, l: {} };
idx.l = idx.l || {};
const jour = new Date().toISOString().slice(0, 10), FRAIS = 90 * 864e5;
const aRevoir = c => !(idx.l[c.id] && idx.l[c.id].maj && (Date.now() - Date.parse(idx.l[c.id].maj)) < FRAIS && (idx.l[c.id].f || idx.l[c.id].absent));
const FX = (() => { try { return JSON.parse(readFileSync("cf/site/data/fx.json", "utf8")).eur || {}; } catch (e) { return {}; } })();
const capE = c => { const p = px["c:" + c.id]; return p && p.cap ? p.cap * (p.cur === "EUR" ? 1 : FX[p.cur] || 0) : 0; }; // capitalisation en euros, pour l'ordre
const parCap = (a, b) => capE(b) - capE(a);
const ordre = U.filter(c => !c.missing || true).sort(parCap).filter(aRevoir).slice(0, max);
const OK = /^(cc0|cc-by(-sa)?-[0-9.]+|pd|public domain|pd-textlogo|pd-shape|pd-ineligible)/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const opts = { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000), redirect: "follow" };
async function json(u) { const r = await fetch(u, { ...opts, headers: { ...opts.headers, accept: "application/json" } }); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); }
async function image(u) { const r = await fetch(u, opts); if (!r.ok) throw new Error("image " + r.status); const ct = r.headers.get("content-type") || ""; if (!/image|octet-stream|svg/.test(ct)) throw new Error("pas une image : " + ct); return Buffer.from(await r.arrayBuffer()); }
async function ecrire(c, buf) { // 64 px, fond transparent ; un logo trop petit (< 32 px) ou vide est refusé
  const img = sharp(buf, { density: 300 }), meta = await img.metadata();
  if ((meta.width || 0) < 32 && (meta.height || 0) < 32 && meta.format !== "svg") throw new Error("trop petit");
  await img.resize(64, 64, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(`cf/site/logos/${c.id}.png`);
}
async function commons(c) {
  const q = wd[c.id] && wd[c.id].q; if (!q) return null;
  const e = await json(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`), ent = e.entities[q], p154 = ent && ent.claims && ent.claims.P154;
  const file = p154 && p154[0] && p154[0].mainsnak.datavalue && p154[0].mainsnak.datavalue.value; if (!file) return null;
  const t = "File:" + file.replace(/ /g, "_");
  const info = await json(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(t)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=128&format=json`);
  const page = Object.values(info.query.pages)[0], ii = page && page.imageinfo && page.imageinfo[0]; if (!ii) return null;
  const meta = ii.extmetadata || {}, lic = (meta.LicenseShortName && meta.LicenseShortName.value) || "", auteur = (meta.Artist && meta.Artist.value.replace(/<[^>]+>/g, "")) || "";
  if (!OK.test(lic)) return { refus: lic };
  await ecrire(c, await image(ii.thumburl || ii.url));
  return { maj: jour, f: `${c.id}.png`, licence: lic, auteur: auteur.slice(0, 120), source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(t)}`, src: "commons" };
}
async function siteOfficiel(c) {
  const dom = (c.domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""); if (!dom) return null;
  const base = `https://${dom}`;
  const essais = [`${base}/apple-touch-icon.png`, `${base}/apple-touch-icon-precomposed.png`];
  try { // la balise <link rel="icon"> la plus grande de la page d'accueil
    const r = await fetch(base, { ...opts, headers: { ...opts.headers, accept: "text/html" } });
    if (r.ok) { const html = (await r.text()).slice(0, 300000), links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(l => /rel=["'][^"']*(apple-touch-icon|icon)[^"']*["']/i.test(l));
      const cand = links.map(l => { const href = (l.match(/href=["']([^"']+)["']/i) || [])[1], sizes = (l.match(/sizes=["'](\d+)x\d+["']/i) || [])[1], svg = /svg/i.test(l) || /\.svg(\?|$)/i.test(href || ""); return href ? { href: new URL(href, r.url).href, taille: svg ? 999 : +sizes || 0 } : null; }).filter(Boolean).sort((a, b) => b.taille - a.taille);
      for (const x of cand) if (x.taille >= 64 || x.taille === 0) essais.push(x.href); }
  } catch (e) { }
  for (const u of essais) { try { const buf = await image(u); await ecrire(c, buf); return { maj: jour, f: `${c.id}.png`, licence: "site officiel", source: u, src: "site" }; } catch (e) { } }
  return null;
}
let n = 0, nc = 0, ns = 0;
for (const c of ordre) {
  try {
    let r = null, refus = "", panne = false;
    try { r = await commons(c); if (r && r.refus) { refus = r.refus; r = null; } } catch (e) { panne = true; console.error(c.id, "commons :", String(e).slice(0, 100)); }
    if (!r) { await sleep(300); try { r = await siteOfficiel(c); } catch (e) { panne = true; console.error(c.id, "site :", String(e).slice(0, 100)); } }
    if (r) { idx.l[c.id] = r; n++; if (r.src === "commons") nc++; else ns++; }
    else if (!panne) idx.l[c.id] = { maj: jour, absent: true, ...(refus ? { licence: refus } : {}) }; // une panne réseau ne vaut pas « absent » : on réessaiera au prochain passage
  } catch (e) { console.error(c.id, String(e).slice(0, 120)); }
  await sleep(700);
}
idx.maj = jour;
writeFileSync("cf/site/logos/index.json", JSON.stringify(idx));
const tous = Object.values(idx.l), dispo = tous.filter(x => x.f).length, commonsN = tous.filter(x => x.f && x.src !== "site").length, siteN = tous.filter(x => x.f && x.src === "site").length;
const top300 = U.slice().sort(parCap).slice(0, 300), top300ok = top300.filter(c => idx.l[c.id] && idx.l[c.id].f).length;
try { const d = existsSync("data/diagnostic.json") ? JSON.parse(readFileSync("data/diagnostic.json", "utf8")) : {}; d.logos = { date: jour, disponibles: dispo, commons: commonsN, site_officiel: siteN, initiale: U.length - dispo, top300: top300ok }; writeFileSync("data/diagnostic.json", JSON.stringify(d, null, 1)); } catch (e) { }
console.log(`${n} logos écrits ce passage (${nc} Commons, ${ns} site officiel) ; ${dispo} disponibles au total, ${top300ok} parmi les 300 plus grosses capitalisations`);
