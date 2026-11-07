// Vidéo ENKLAIR (7/11 soir) : filme une vraie navigation sur enklair.com, image par image (défilement, curseur, saisie, clics réels).
// Usage : node scripts/video/filmer.js <plan.json> <dossier de sortie>
// Plan : { fps, viewport: [l, h], segments: [{ nom, url?, duree, attente, cacher: [sélecteurs],
//   scroll: [[t, y | ancre, décalage]], curseur: [[t, ancre | "suite", dx, dy]], camera: [[t, zoom, ancre | "haut", dy, dx]],
//   saisie: [t, ancre du champ, texte, durée], clics: [[t, ancre]] (dans la page), clic: [t, ancre, dx, dy] (vers la page suivante) }] }
// Une ancre = sélecteur CSS ou « texte:<expression> » (le plus petit élément visible qui contient ce texte). Les ancres sont lues
// au moment où on en a besoin (après une saisie, une liste de suggestions existe). Le clic termine le segment : la page suivante
// est filmée par le segment suivant, sans image de chargement.
// Sortie : <dossier>/<segment>/00001.jpg… (densité 2) et plan.json (curseur, caméra, clic, en pixels CSS de la fenêtre).
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : -(Math.cos(Math.PI * t) - 1) / 2; // sinusoïdale : départ et arrivée très doux
(async () => {
  const [planF, out] = process.argv.slice(2), plan = JSON.parse(fs.readFileSync(planF)), fps = plan.fps || 30, VP = plan.viewport || [1280, 846];
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 2, locale: "fr-FR" });
  const p = await ctx.newPage(); let dernier = null; // dernière position du curseur (fenêtre), reprise par « suite »
  const ancre = a => p.evaluate(a => { let el;
    if (a.startsWith("texte:")) { const re = new RegExp(a.slice(6)); el = [...document.querySelectorAll("body *")].filter(e => re.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden").sort((x, y) => x.textContent.length - y.textContent.length)[0]; }
    else el = document.querySelector(a);
    if (!el) return null; const r = el.getBoundingClientRect(), fixe = getComputedStyle(el).position === "fixed" || !!el.closest("header");
    return [r.x + r.width / 2, r.y + r.height / 2 + (fixe ? 0 : scrollY), fixe]; }, a);
  for (const s of plan.segments) {
    const dir = path.join(out, s.nom); fs.mkdirSync(dir, { recursive: true });
    if (s.url) await p.goto("https://enklair.com" + s.url, { waitUntil: "load" });
    await p.waitForTimeout(s.attente || 3000);
    await p.addStyleTag({ content: `${["#orciab", ...(s.cacher || [])].join(",")}{display:none!important} html{scroll-behavior:auto!important} *{caret-color:transparent}` });
    if (!s.sansParcours) { // parcourt la page une fois (blocs chargés au défilement), puis revient en haut
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 500)); }); }
    // clés : valeurs résolues à la demande (ancre lue quand la clé précédente est atteinte)
    const cles = (L, f) => (L || []).map(k => ({ t: k[0], k, v: null, f }));
    const SC = cles(s.scroll || [[0, 0]]), CU = cles(s.curseur), CA = cles(s.camera || [[0, 1, "haut"]]);
    const resout = async (L, t, quoi, sy) => { for (let i = 0; i < L.length; i++) { const c = L[i]; if (c.v || (i > 0 && t < L[i - 1].t)) continue;
      if (quoi === "scroll") { const [, y, dy] = c.k; if (typeof y === "number") c.v = [y]; else { const q = await ancre(y); c.v = [q ? Math.max(0, q[1] - (dy || 120)) : sy]; } }
      if (quoi === "curseur") { const [, a, dx, dy] = c.k; let q = a === "suite" ? (dernier ? [dernier[0], dernier[1] + sy, false] : null) : Array.isArray(a) ? [a[0], a[1] + sy, false] : await ancre(a); if (!q) q = [VP[0] / 2, VP[1] / 2 + sy, false]; c.v = [q[0] + (dx || 0), q[1] + (dy || 0), q[2]]; }
      if (quoi === "camera") { const [, z, a, dy, dx] = c.k; const q = a === "haut" ? null : await ancre(a); c.v = q ? [z, q[0] + (dx || 0), q[1] + (dy || 0), true && !q[2]] : [z, VP[0] / 2, VP[1] / 2, false]; } } };
    const val = (L, t) => { const R = L.filter(c => c.v); if (!R.length) return null; if (t <= R[0].t) return R[0].v;
      for (let i = 1; i < R.length; i++) if (t <= R[i].t) { const a = R[i - 1], b2 = R[i], k = ease((t - a.t) / (b2.t - a.t)); return a.v.map((x, j) => typeof x === "number" ? x + (b2.v[j] - x) * k : b2.v[j]); }
      return R[R.length - 1].v; };
    const n = Math.round(s.duree * fps), cadres = []; let tape = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fps; let sy = await p.evaluate(() => scrollY);
      await resout(SC, t, "scroll", sy); const [y] = val(SC, t);
      await p.evaluate(y => window.scrollTo(0, y), Math.round(y)); sy = await p.evaluate(() => scrollY);
      if (s.saisie && t >= s.saisie[0]) { const [t0, sel, txt, du] = s.saisie, nb = Math.min(txt.length, Math.floor((t - t0) / du * txt.length) + 1);
        if (!tape) { const q = await ancre(sel); if (q) await p.mouse.click(q[0], q[2] ? q[1] : q[1] - sy); } while (tape < nb) { await p.keyboard.type(txt[tape]); tape++; } await p.waitForTimeout(30); }
      // clics dans la page sans changer de page (choix d'un critère, d'un filtre…) : [t, ancre]
      for (const a of s.clics || []) if (!a.fait && t >= a[0]) { a.fait = true; const q = await ancre(a[1]); if (q) { await p.mouse.click(q[0], q[2] ? q[1] : q[1] - sy); await p.waitForTimeout(250); } }
      await resout(CU, t, "curseur", sy); await resout(CA, t, "camera", sy);
      const c = val(CU, t), cam = val(CA, t);
      const cur = c ? [c[0], c[2] ? c[1] : c[1] - sy] : null; if (cur) dernier = cur;
      const camV = cam ? [cam[0], cam[1], cam[3] ? cam[2] - sy : cam[2]] : [1, VP[0] / 2, VP[1] / 2];
      cadres.push({ cur, cam: camV, clic: (() => { for (const a of [...(s.clics || []), ...(s.clic ? [s.clic] : [])]) if (t >= a[0] && t < a[0] + 0.45) return (t - a[0]) / 0.45; return null; })() });
      await p.screenshot({ path: path.join(dir, String(i + 1).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 90 });
    }
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify({ fps, viewport: VP, cadres }));
    if (s.clic) { const q = await ancre(s.clic[1]); if (q) { const sy = await p.evaluate(() => scrollY); await p.mouse.click(q[0] + (s.clic[2] || 0), (q[2] ? q[1] : q[1] - sy) + (s.clic[3] || 0)); await p.waitForTimeout(400); } else console.log("ancre du clic introuvable :", s.clic[1]); }
    console.log(s.nom, n, "images");
  }
  await b.close();
})();
