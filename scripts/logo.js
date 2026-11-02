// Fabrique le logo ENKLAIR (DA v3 : Bricolage Grotesque, jaune #FFE14D, contour noir) : favicon.svg, icônes PWA, icône Apple,
// badge, image de partage par défaut (1200×630). Usage : node scripts/logo.js (Playwright requis, polices Google).
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "cf", "site", "icons");
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Inter:wght@600;700&display=block" rel="stylesheet">`;
const carre = (s, maskable) => `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>*{margin:0}body{width:${s}px;height:${s}px;background:${maskable ? "#FFE14D" : "transparent"};display:grid;place-items:center;overflow:hidden}
.b{width:${maskable ? s : s * 0.92}px;height:${maskable ? s : s * 0.92}px;background:#FFE14D;border-radius:${maskable ? 0 : s * 0.22}px;display:grid;place-items:center;${maskable ? "" : `border:${Math.max(2, s * 0.045)}px solid #111;box-sizing:border-box`}}
.e{font:800 ${s * 0.62}px "Bricolage Grotesque";letter-spacing:-.07em;color:#111;line-height:1;margin-top:-${s * 0.04}px;${maskable ? "" : "transform:rotate(-6deg)"}}</style></head><body><div class="b"><div class="e">E</div></div></body></html>`;
const partage = `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#fff;font-family:Inter;color:#111;display:flex;flex-direction:column;justify-content:space-between;padding:70px 80px}
.logo{display:inline-block;font:800 92px "Bricolage Grotesque";letter-spacing:-.06em;background:#FFE14D;padding:6px 30px 14px;border-radius:24px;transform:rotate(-2deg);border:5px solid #111;box-shadow:10px 10px 0 #111}
h1{font:800 70px/1 "Bricolage Grotesque";letter-spacing:-.05em;max-width:18ch;margin-top:30px}
.ms{height:22px;border-radius:11px;background:linear-gradient(90deg,#FFD0C4 50%,#BFF0DA 50%);position:relative;width:520px;margin-top:34px}.ms:before{content:"";position:absolute;left:50%;top:-10px;width:5px;height:42px;background:#111}.ms i{position:absolute;top:-13px;left:78%;width:48px;height:48px;margin-left:-24px;border-radius:50%;background:#111;border:8px solid #fff}
.f{display:flex;justify-content:space-between;font:700 26px Inter;color:#444}</style></head><body><div><span class="logo">ENKLAIR</span><h1>Comprenez n'importe quelle action en 30 secondes.</h1><div class="ms"><i></i></div></div>
<div class="f"><span>Les comptes officiels, face à la médiane du secteur.</span><span>Information, pas conseil.</span></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const shoot = async (html, w, h, file, omit) => { const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await p.setContent(html, { waitUntil: "networkidle" }).catch(() => { }); await p.waitForTimeout(400); await p.screenshot({ path: path.join(DIR, file), omitBackground: !!omit }); await p.close(); };
  for (const [s, f] of [[512, "icon-512.png"], [192, "icon-192.png"], [180, "apple-touch-icon.png"], [48, "favicon-48.png"], [32, "favicon-32.png"], [96, "badge-96.png"]]) await shoot(carre(s, false), s, s, f, true);
  for (const [s, f] of [[512, "icon-maskable-512.png"], [192, "icon-maskable-192.png"]]) await shoot(carre(s, true), s, s, f, false);
  await shoot(partage, 1200, 630, "partage.png", false);
  await b.close();
  fs.writeFileSync(path.join(DIR, "favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#FFE14D" stroke="#111" stroke-width="2"/><path d="M11 9.5h10.5v3H14.6v2.7h6v3h-6v2.8h7.1v3H11z" fill="#111" transform="rotate(-6 16 16)"/></svg>`);
  console.log("logo : icônes et image de partage écrites dans cf/site/icons");
})();
