// Vidéo ENKLAIR (7/11 nuit) : filme de vrais blocs du site, isolés sur fond blanc, comme la vidéo d'origine.
// Pour chaque plan : ouvre la page sur enklair.com (largeur téléphone), fait les clics prévus, puis pour chaque bloc
// prend une image par 1/60 s pendant son animation (jouée dans la page, image par image, sans hasard).
// Usage : node scripts/video/elements.js plan.json dossier_sortie
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
const [plan, OUT] = [JSON.parse(fs.readFileSync(process.argv[2], "utf8")), process.argv[3]];
const FPS = 60, DPR = 2.5, W = 432;

// Animations jouées dans la page : f(el, t) avec t en secondes ; état final identique à la page réelle.
const ANIM = `
window.__e = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
window.__A = {
  rangs(el, t, o) { [...el.querySelectorAll(o.enfants || ":scope > *")].slice(0, o.max || 99).forEach((r, i) => { const p = __e((t - (o.d0 || 0) - i * (o.pas || .08)) / .4); r.style.opacity = p; r.style.transform = "translateY(" + ((1 - p) * 18) + "px)"; }); },
  jauges(el, t) { __A.rangs(el, t, { enfants: ".ek-rp" }); el.querySelectorAll(".ek-mg b").forEach((b, i) => { if (b.dataset.f == null) b.dataset.f = parseFloat(b.style.left); const q = __e((t - .35 - i * .1) / .7); b.style.left = (50 + (b.dataset.f - 50) * q) + "%"; }); },
  points(el, t) {
    const svg = el.querySelector("svg"), med = svg.querySelector("line[stroke-dasharray]"), mx = +med.getAttribute("x1");
    [...svg.querySelectorAll("circle")].forEach((c, i) => {
      if (c.dataset.f == null) c.dataset.f = c.getAttribute("cx");
      const q = __e((t - .25 - i * .09) / .75), x = mx + (c.dataset.f - mx) * q; c.setAttribute("cx", x);
      const l = c.previousElementSibling; if (l && l.tagName === "line") { l.setAttribute("x2", x); l.style.opacity = q; }
      let v = c.nextElementSibling; if (v && v.tagName === "text") v.style.opacity = __e((t - .7 - i * .09) / .3);
    });
  },
  tuiles(el, t) { [...el.children].forEach((r, i) => { const p = __e((t - i * .06) / .35); r.style.opacity = p; r.style.transform = "scale(" + (.9 + .1 * p) + ")"; }); },
  barres(el, t) {
    el.querySelectorAll(".r8-cb").forEach((r, i) => {
      const f = r.querySelector(".f"), b = r.querySelector("b"); if (f.dataset.f == null) f.dataset.f = parseFloat(f.style.width);
      const q = __e((t - .2 - i * .12) / .6); f.style.width = (f.dataset.f * q) + "%"; b.style.opacity = __e((t - .45 - i * .12) / .3);
    });
  },
  courbe(el, t) {
    const pl = el.querySelector("polyline"); if (!pl) return; const L = pl.getTotalLength(); pl.style.strokeDasharray = L; pl.style.strokeDashoffset = L * (1 - __e((t - .3) / .9));
    const big = el.querySelector(".r8-big"); if (big) big.style.opacity = __e((t - .1) / .3);
  }
};`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 1700 }, deviceScaleFactor: DPR, locale: "fr-FR", isMobile: true, hasTouch: true });
  // Vue Premium pour le tournage (classements, rapport) : réponse locale au navigateur du tournage seulement, rien n'est envoyé au site
  await ctx.route("**/api/premium/statut", r => r.fulfill({ status: 200, contentType: "application/json", body: '{"premium":true}' }));
  await ctx.addInitScript(() => { try { localStorage.setItem("bilan.premium", "tournage-video"); } catch (e) { } });
  const p = await ctx.newPage();
  for (const pl of plan.plans) {
    await p.goto("https://enklair.com" + pl.url, { waitUntil: "load" }); await p.waitForTimeout(3500);
    for (const c of pl.clics || []) { await p.locator(c.q).nth(c.n || 0).click(); await p.waitForTimeout(1500); }
    await p.addStyleTag({ content: "*{transition:none!important;animation:none!important;caret-color:transparent!important}" });
    await p.evaluate(ANIM);
    for (const [j, L] of pl.blocs.entries()) {
      const id = `${pl.id}-${j}`, dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
      const h = await p.evaluateHandle(L => {
        let els = [...document.querySelectorAll(L.q)]; els = els.filter(e => e.getClientRects().length && e.offsetHeight > 0); if (L.txt) els = els.filter(e => new RegExp(L.txt).test(e.textContent));
        const el = els[L.n || 0]; if (!el) return null;
        document.querySelectorAll("body *").forEach(e => { const s = getComputedStyle(e).position; if ((s === "fixed" || s === "sticky") && !e.contains(el)) e.style.visibility = "hidden"; });
        for (let a = el.parentElement; a; a = a.parentElement) { a.style.setProperty("background", "#fff", "important"); a.style.setProperty("box-shadow", "none", "important"); a.style.setProperty("border-color", "transparent", "important"); }
        (L.cacher || []).forEach(s => el.querySelectorAll(s).forEach(x => x.style.display = "none"));
        el.scrollIntoView({ block: "start" }); window.scrollBy(0, -40); return el;
      }, L);
      if (!(await h.evaluate(e => !!e))) throw new Error("bloc introuvable : " + JSON.stringify(L));
      await p.waitForTimeout(400);
      await h.evaluate(el => Promise.race([Promise.all([...el.querySelectorAll("img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 6000))]));
      const bb = await h.evaluate((el, L) => { const r = el.getBoundingClientRect(); let bas = r.bottom; if (L.lignes) { const k = [...el.querySelectorAll(L.lignes)]; if (k.length > L.max) bas = k[L.max - 1].getBoundingClientRect().bottom; } return { x: r.left, y: r.top, w: r.width, h: bas - r.top }; }, L);
      const pad = L.pad ?? 6, clip = { x: Math.max(0, bb.x - pad), y: Math.max(0, bb.y - pad), width: Math.min(W, bb.w + 2 * pad), height: bb.h + 2 * pad };
      const n = L.anim ? Math.round((L.duree || 1.4) * FPS) + 1 : 1;
      for (let i = 0; i < n; i++) {
        if (L.anim) await h.evaluate((el, a) => __A[a.nom](el, a.t, a.o || {}), { nom: L.anim, t: i / FPS, o: L.opts });
        await p.screenshot({ path: path.join(dir, `f${String(i).padStart(3, "0")}.jpg`), clip, type: "jpeg", quality: 92 });
      }
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ n, x: Math.round(clip.x * DPR), w: Math.round(clip.width * DPR), h: Math.round(clip.height * DPR) }));
      console.log(id, n, "images", Math.round(clip.width * DPR) + "x" + Math.round(clip.height * DPR));
    }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
