// Logos hébergés par le site : pour les entreprises suivies (les 300 plus grosses capitalisations d'abord), le logo déclaré sur
// Wikidata (P154) est lu sur Wikimedia Commons, avec sa licence, réduit à 64 px (PNG) et écrit dans cf/site/logos/<id>.png.
// cf/site/logos/index.json liste les logos disponibles avec leur licence et leur auteur (attribution). Les licences non libres
// sont ignorées : seuls le domaine public, CC0, CC BY, CC BY-SA et « marque déposée, pas d'originalité » (PD-textlogo) sont pris.
// Usage : node data/logos_fetch.mjs [--max N]   (robot des données ; ~1 requête par seconde)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";
const UA = `bilan.-logos/1.0 (${process.env.CONTACT || "contact@repere-bourse.pages.dev"})`;
const max = +(process.argv[process.argv.indexOf("--max") + 1] || 0) || 300;
const wd = JSON.parse(readFileSync("cf/site/data/wikidata.json", "utf8")).items, px = JSON.parse(readFileSync("cf/site/data/cours.json", "utf8")).items;
const U = JSON.parse(readFileSync("cf/site/data/univers-min.json", "utf8")).companies;
const ordre = U.filter(c => wd[c.id] && wd[c.id].q).sort((a, b) => ((px["c:" + b.id] || {}).cap || 0) - ((px["c:" + a.id] || {}).cap || 0)).slice(0, max);
mkdirSync("cf/site/logos", { recursive: true });
const idx = existsSync("cf/site/logos/index.json") ? JSON.parse(readFileSync("cf/site/logos/index.json", "utf8")) : { maj: null, l: {} };
const OK = /^(cc0|cc-by(-sa)?-[0-9.]+|pd|public domain|pd-textlogo|pd-shape|pd-ineligible)/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function json(u) { const r = await fetch(u, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); }
let n = 0;
for (const c of ordre) {
  if (idx.l[c.id] && idx.l[c.id].maj && (Date.now() - Date.parse(idx.l[c.id].maj)) < 90 * 864e5) continue; // revu tous les 90 jours
  try {
    const e = await json(`https://www.wikidata.org/wiki/Special:EntityData/${wd[c.id].q}.json`), ent = e.entities[wd[c.id].q], p154 = ent && ent.claims && ent.claims.P154;
    const file = p154 && p154[0] && p154[0].mainsnak.datavalue && p154[0].mainsnak.datavalue.value;
    if (!file) { idx.l[c.id] = { maj: new Date().toISOString().slice(0, 10), absent: true }; await sleep(800); continue; }
    const t = "File:" + file.replace(/ /g, "_");
    const info = await json(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(t)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=128&format=json`);
    const page = Object.values(info.query.pages)[0], ii = page && page.imageinfo && page.imageinfo[0]; if (!ii) throw new Error("pas d'image");
    const meta = ii.extmetadata || {}, lic = (meta.LicenseShortName && meta.LicenseShortName.value) || "", auteur = (meta.Artist && meta.Artist.value.replace(/<[^>]+>/g, "")) || "";
    if (!OK.test(lic)) { idx.l[c.id] = { maj: new Date().toISOString().slice(0, 10), absent: true, licence: lic }; await sleep(800); continue; }
    const r = await fetch(ii.thumburl || ii.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error("image " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).resize(64, 64, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(`cf/site/logos/${c.id}.png`);
    idx.l[c.id] = { maj: new Date().toISOString().slice(0, 10), f: `${c.id}.png`, licence: lic, auteur: auteur.slice(0, 120), source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(t)}` };
    n++;
  } catch (e) { console.error(c.id, String(e).slice(0, 120)); }
  await sleep(1000);
}
idx.maj = new Date().toISOString().slice(0, 10);
writeFileSync("cf/site/logos/index.json", JSON.stringify(idx));
console.log(`${n} logos écrits ; ${Object.values(idx.l).filter(x => x.f).length} disponibles au total`);
