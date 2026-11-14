// Sonde : photos sous licence libre sur Wikimedia Commons (API officielle, User-Agent honnête), pour les carrousels
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.SORTIE || process.argv[2] || "out"; mkdirSync(OUT, { recursive: true });
const UA = "enklair-site/1.0 (https://enklair.com; contact via GitHub n7497nbtjh-crypto/Bourse)";
const Q = (process.env.REQUETES || "Palais Brongniart|Place de la Bourse Paris|Euronext Paris|La Défense Paris skyline|TotalEnergies station-service|Kering siège|stock ticker board").split("|");
const res = [];
for (const q of Q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&iiextmetadatafilter=LicenseShortName|Artist|DateTimeOriginal&format=json`;
  const d = await (await fetch(u, { headers: { "user-agent": UA } })).json();
  for (const p of Object.values(d.query?.pages || {})) {
    const ii = p.imageinfo[0], m = ii.extmetadata || {}, lic = m.LicenseShortName?.value || "";
    if (!/CC0|CC BY|Public domain|domaine public/i.test(lic) || ii.height < 1900 && ii.width < 1900) continue;
    const nom = `${res.length}.jpg`;
    try { const b = Buffer.from(await (await fetch(ii.thumburl, { headers: { "user-agent": UA } })).arrayBuffer()); writeFileSync(`${OUT}/${nom}`, b); } catch (e) { continue; }
    res.push({ nom, q, titre: p.title, w: ii.width, h: ii.height, licence: lic, auteur: (m.Artist?.value || "").replace(/<[^>]+>/g, "").trim().slice(0, 80), date: m.DateTimeOriginal?.value || "", page: ii.descriptionurl, original: ii.url });
    await new Promise(r => setTimeout(r, 400));
  }
}
writeFileSync(`${OUT}/photos.json`, JSON.stringify(res, null, 1)); console.log(res.length, "photos");
