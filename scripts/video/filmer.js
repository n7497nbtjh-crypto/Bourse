// Vidéo ENKLAIR (7/11 soir) : filme une vraie navigation sur enklair.com, image par image (défilement, curseur, clics réels).
// Usage : node scripts/video/filmer.js <plan.json> <dossier de sortie>
// Le plan : { fps, segments: [{ nom, url, duree, attente, cacher: [sélecteurs], scroll: [[t, y|"ancre"]], curseur: [[t, "ancre", dx, dy]],
//   camera: [[t, zoom, "ancre"|[x,y], dy, dx]], clic: [t, "ancre"] }] } ; une ancre = « sélecteur CSS » ou « texte:… » (élément le plus petit qui contient le texte).
// Sortie : <dossier>/<segment>/00001.jpg… (fenêtre 1280 x 846, densité 2) et <dossier>/<segment>/plan.json (curseur, caméra, clic par image, en pixels CSS de la fenêtre).
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const interp = (keys, t, f) => { if (t <= keys[0][0]) return f(keys[0]); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], k = ease((t - a[0]) / (b[0] - a[0])); const va = f(a), vb = f(b); return va.map((x, j) => x + (vb[j] - x) * k); } return f(keys[keys.length - 1]); };
(async () => {
  const [planF, out] = process.argv.slice(2), plan = JSON.parse(fs.readFileSync(planF)), fps = plan.fps || 30;
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 846 }, deviceScaleFactor: 2, locale: "fr-FR" });
  const p = await ctx.newPage();
  for (const s of plan.segments) {
    const dir = path.join(out, s.nom); fs.mkdirSync(dir, { recursive: true });
    if (s.url) { await p.goto("https://enklair.com" + s.url, { waitUntil: "load" }); }
    await p.waitForTimeout(s.attente || 4000);
    // parcourt la page une fois pour que tout s'affiche (blocs chargés au défilement), puis revient en haut
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 600)); });
    await p.addStyleTag({ content: `${["#orciab", ...(s.cacher || [])].join(",")}{display:none!important} html{scroll-behavior:auto!important}` });
    // ancres → coordonnées dans la page (pixels CSS, défilement compris)
    const ancre = async a => {
      if (Array.isArray(a)) return a;
      return p.evaluate(a => { let el;
        if (a.startsWith("texte:")) { const re = new RegExp(a.slice(6)); el = [...document.querySelectorAll("#app *")].filter(e => re.test(e.textContent) && e.getBoundingClientRect().width > 0).sort((x, y) => x.textContent.length - y.textContent.length)[0]; }
        else el = document.querySelector(a);
        if (!el) return null; const r = el.getBoundingClientRect(); return [r.x + r.width / 2 + scrollX, r.y + r.height / 2 + scrollY, r.x + scrollX, r.y + scrollY, r.width, r.height]; }, a); };
    const res = async keys => { const o = []; for (const k of keys || []) { const v = { ...k }; o.push(v); } return o; };
    const SC = []; for (const [t, y, dy] of s.scroll || [[0, 0]]) { let v = y; if (typeof y === "string") { const q = await ancre(y); v = q ? q[3] - (dy || 120) : 0; } SC.push([t, v]); }
    const CU = []; for (const [t, a, dx, dy] of s.curseur || []) { const q = await ancre(a); if (q) CU.push([t, q[0] + (dx || 0), q[1] + (dy || 0)]); }
    const CA = []; for (const [t, z, a, dy, dx] of s.camera || [[0, 1, [640, 423]]]) { const q = typeof a === "string" ? await ancre(a) : a; CA.push([t, z, q ? q[0] + (dx || 0) : 640, q ? q[1] + (dy || 0) : 423, typeof a === "string"]); }
    let clic = null; if (s.clic) { const q = await ancre(s.clic[1]); clic = q ? [s.clic[0], q[0], q[1]] : null; }
    const n = Math.round(s.duree * fps), cadres = [];
    for (let i = 0; i < n; i++) {
      const t = i / fps, [y] = interp(SC, t, k => [k[1]]);
      await p.evaluate(y => window.scrollTo(0, y), Math.round(y)); const sy = await p.evaluate(() => scrollY);
      const c = CU.length ? interp(CU, t, k => [k[1], k[2]]) : null;
      const [z, fx, fy] = interp(CA, t, k => [k[1], k[2], k[3] - (k[4] ? 0 : 0)]);
      // la caméra vise un point de la page : converti en coordonnées de la fenêtre
      const camPage = CA.some(k => k[4]);
      cadres.push({ cur: c ? [c[0], c[1] - sy] : null, cam: [z, fx, camPage ? fy - sy : fy], clic: clic && t >= clic[0] && t < clic[0] + 0.5 ? (t - clic[0]) / 0.5 : null });
      await p.screenshot({ path: path.join(dir, String(i + 1).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 90 });
    }
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify({ fps, cadres }));
    if (clic) { await p.mouse.click(clic[1], clic[2] - (await p.evaluate(() => scrollY))); await p.waitForLoadState("load"); }
    console.log(s.nom, n, "images");
  }
  await b.close();
})();
