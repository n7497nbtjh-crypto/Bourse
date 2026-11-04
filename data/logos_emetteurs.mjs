// Logos des émetteurs d'ETF (3/11/2026) : icône officielle publiée par le site de chaque émetteur (apple-touch-icon,
// sinon la plus grande balise <link rel="icon">), réduite à 64 px et écrite dans cf/site/logos/emetteurs/<slug>.png.
// L'index cf/site/logos/emetteurs/index.json garde la source de chaque logo. Sans logo, le site affiche l'initiale.
// Usage : node data/logos_emetteurs.mjs   (à relancer à la main si un émetteur change de logo)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
export const EMETTEURS = {
  Amundi: "https://www.amundietf.fr/fr/particuliers", iShares: "https://www.ishares.com/uk/individual/en", SPDR: "https://www.ssga.com/uk/en_gb/intermediary/etfs",
  Invesco: "https://www.invesco.com/uk/en/", Vanguard: "https://www.vanguard.co.uk/", Xtrackers: "https://etf.dws.com/fr-fr/", "BNP Paribas Easy": "https://www.bnpparibas-am.com/fr-fr/",
  "Franklin Templeton": "https://www.franklintempleton.co.uk/", KraneShares: "https://kraneshares.eu/", VanEck: "https://www.vaneck.com/fr/fr/", "L&G": "https://www.lgim.com/uk/en/", HSBC: "https://www.assetmanagement.hsbc.fr/", WisdomTree: "https://www.wisdomtree.eu/fr-fr",
};
export const slugEm = n => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DIR = "cf/site/logos/emetteurs"; mkdirSync(DIR, { recursive: true });
const idx = existsSync(DIR + "/index.json") ? JSON.parse(readFileSync(DIR + "/index.json", "utf8")) : { l: {} };
const get = async u => { const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(r.status + " " + u); return r; };
for (const [nom, site] of Object.entries(EMETTEURS).filter(([n]) => process.argv.length < 3 || process.argv.slice(2).includes(n))) { // node data/logos_emetteurs.mjs [Nom…]
  const slug = slugEm(nom); let ok = false;
  try {
    const html = await (await get(site)).text(), base = new URL(site);
    const liens = [...html.matchAll(/<link[^>]+>/gi)].map(m => m[0]).filter(l => /rel=["'][^"']*(icon|apple-touch)/i.test(l))
      .map(l => ({ href: (l.match(/href=["']([^"']+)/i) || [])[1], t: (l.match(/sizes=["'](\d+)/i) || [])[1] || (/apple-touch/i.test(l) ? 180 : /\.svg/i.test(l) ? 512 : 16) }))
      .filter(x => x.href).sort((a, b) => b.t - a.t);
    const cands = [...liens.map(x => new URL(x.href, base).href), new URL("/apple-touch-icon.png", base).href, new URL("/favicon.ico", base).href];
    for (const u of cands) {
      try { let buf = Buffer.from(await (await get(u)).arrayBuffer());
        if (/\.ico(\?|$)/i.test(u) || (buf[0] === 0 && buf[1] === 0 && buf[2] === 1)) { // icône Windows (.ico) : la plus grande image, lue par Pillow
          writeFileSync("/tmp/em.ico", buf); execFileSync("python3", ["-c", "from PIL import Image;im=Image.open('/tmp/em.ico');s=max(im.ico.sizes());im.size=s;im.load();im.save('/tmp/em.png')"]); buf = readFileSync("/tmp/em.png"); }
        const img = sharp(buf, { density: 300 }), m = await img.metadata(); if (!m.width || m.width < 32) continue;
        await img.trim({ threshold: 20 }).resize(64, 64, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(`${DIR}/${slug}.png`);
        idx.l[nom] = { f: slug + ".png", source: u, maj: new Date().toISOString().slice(0, 10) }; ok = true; console.log("✓", nom, u, m.width + "px"); break; } catch (e) { }
    }
  } catch (e) { console.log("panne", nom, e.message); }
  if (!ok) console.log("✗", nom);
}
writeFileSync(DIR + "/index.json", JSON.stringify(idx, null, 1));
