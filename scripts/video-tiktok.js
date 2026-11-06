// Tournage de la vidéo ENKLAIR : chaque scène = une page du site filmée image par image (défilement doux), légendes injectées.
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const ROOT = "/home/claude/bourse/cf/site", OUT = "/tmp/vid/sc", FPS = 30;
fs.mkdirSync(OUT, { recursive: true });
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const only = process.argv[2];
const CSS = `
#vx{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:inherit}
#vx .cap{position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap}
#vx .tag{display:inline-block;background:#FFE14D;border:2.5px solid #111;border-radius:12px;padding:10px 16px!important;font:800 19px/1.1 "Bricolage Grotesque",Inter,sans-serif!important;color:#111!important;box-shadow:4px 4px 0 #111;letter-spacing:-.3px}
#vx .full{position:absolute;inset:0;background:#FFE14D;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 30px}
#vx .big{font:800 50px/1.02 "Bricolage Grotesque",Inter,sans-serif;color:#111;letter-spacing:-1.5px}
#vx .mid{font:600 22px/1.3 Inter,sans-serif;color:#111;margin-top:18px}
#vx .logo{display:inline-block;background:#FFE14D;border:3px solid #111;border-radius:10px;padding:6px 16px;font:800 44px "Bricolage Grotesque",sans-serif;box-shadow:5px 5px 0 #111;background:#fff}
#vx .hl{background:#fff;border:3px solid #111;border-radius:12px;padding:0 10px;display:inline-block;transform:rotate(-2deg)}
[class*=question],[class*=Question]{}
`;
async function main() {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const pg = await ctx.newPage();
  await pg.route(/.*/, r => { const u = r.request().url(); if (!u.includes("//t.local")) return r.fulfill({ status: 404, body: "" });
    const pth = decodeURIComponent(u.split("//t.local")[1].split("#")[0].split("?")[0]);
    if (pth === "/api/rapport-exemple") return r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" });
    if (pth.startsWith("/api/")) return r.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    const f = path.join(ROOT, pth.replace(/^\//, "")); if (fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ path: f });
    if (/\.[a-z0-9]+$/i.test(pth.split("/").pop())) return r.fulfill({ status: 404, body: "" });
    return r.fulfill({ path: path.join(ROOT, "index.html") }); });
  async function ouvre(u) {
    await pg.goto("http://t.local" + u, { waitUntil: "load" }); await pg.waitForTimeout(2500);
    await pg.evaluate(css => { document.documentElement.style.scrollBehavior = "auto";
      const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
      const d = document.createElement("div"); d.id = "vx"; document.body.appendChild(d);
      // bulle flottante « Question ? » : masquée pour la vidéo
      for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if ((cs.position === "fixed" || cs.position === "sticky") && /Question/.test(e.textContent) && e.textContent.length < 40) e.style.display = "none"; }
      for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 300 && e.id !== "vx") e.style.display = "none"; }
      for (const e of document.querySelectorAll("button,a,div")) if (/^\s*✦?\s*Question\s*\?\s*$/.test(e.textContent) && e.children.length < 3) e.style.visibility = "hidden";
    }, CSS);
  }
  const y = (txt, off = 120) => pg.evaluate(([t, o]) => { const e = [...document.querySelectorAll("h1,h2,h3,p,b,span,div,a")].find(x => x.textContent.trim().startsWith(t) && x.children.length < 4);
    return e ? Math.max(0, e.getBoundingClientRect().top + scrollY - o) : 0; }, [txt, off]);
  async function scene(nom, dur, frame) {
    if (only && only !== nom) return;
    const tmp = `${OUT}/${nom}.part.mp4`, fin = `${OUT}/${nom}.mp4`;
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", String(FPS), tmp]);
    const N = Math.round(dur * FPS);
    for (let i = 0; i < N; i++) { await frame(i / FPS, i / (N - 1)); const buf = await pg.screenshot({ type: "jpeg", quality: 92 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r)); }
    ff.stdin.end(); const code = await new Promise(r => ff.on("close", r)); if (code === 0) fs.renameSync(tmp, fin); console.log(nom, N, "images", code);
  }
  // overlay : html + style d'entrée animé
  const ov = (html) => pg.evaluate(h => { document.getElementById("vx").innerHTML = h; }, html);
  const pop = (t, t0 = 0.05, d = 0.35) => { const k = Math.min(1, Math.max(0, (t - t0) / d)); const e = 1 - Math.pow(1 - k, 3); return { o: e, s: 0.85 + 0.15 * e + (k < 1 ? 0.04 * Math.sin(k * Math.PI) : 0) }; };
  const cap = (txt, t, top = 600, rot = -2) => { const p = pop(t); return `<div class="cap" style="top:${top}px;opacity:${p.o};transform:translateX(-50%) rotate(${rot}deg) scale(${p.s})"><span class="tag">${txt}</span></div>`; };
  const scroll = v => pg.evaluate(v => window.scrollTo(0, v), v);

  // 1. Accroche (sur l'accueil, écran jaune)
  await ouvre("/");
  await scene("01-accroche", 2.6, async (t) => {
    const a = pop(t, 0.1), b = pop(t, 0.9), c = pop(t, 1.5);
    await ov(`<div class="full"><div class="big" style="opacity:${a.o};transform:scale(${a.s})">La Bourse,</div><div class="big" style="opacity:${b.o};transform:scale(${b.s});margin-top:6px">enfin <span class="hl">claire.</span></div><div class="mid" style="opacity:${c.o}">3 338 entreprises expliquées<br>à partir de leurs comptes officiels</div></div>`);
  });
  // 2. Accueil : de l'accroche à l'exemple Hermès
  const yH = await y("Hermès", 220);
  await scene("02-accueil", 4.2, async (t, k) => { await scroll(ease(Math.min(1, k * 1.25)) * yH); await ov(cap("Une action comprise en 30 secondes", t - 0.3, 640)); });
  // 3. Fiche Hermès : verdict et repères face aux rivales
  await ouvre("/entreprise/hermes");
  const yV = await y("Le verdict", 90), yR = await y("Son métier", 300);
  await scene("03-fiche", 4.6, async (t, k) => { await scroll(ease(Math.min(1, k * 1.4)) * yV); await ov(cap("Chaque chiffre face à ses rivales", t - 0.4, 650, 2)); });
  const yC = await y("De ses ventes au prix", 60);
  await scene("04-comptes", 3.6, async (t, k) => { await scroll(yR + ease(Math.min(1, k * 1.3)) * (yC + 330 - yR)); await ov(cap("Ses vrais comptes, en clair", t - 0.3, 660, -2)); });
  // 5. Rapport de la semaine
  await ouvre("/rapport-exemple");
  const yP = await y("Votre rapport", 60), yA = await y("L'actualité", 40);
  await scene("05-rapport", 4.8, async (t, k) => { const a = ease(Math.min(1, k * 1.6)), b = ease(Math.max(0, (k - 0.6) / 0.4)); await scroll(a * yP + b * (yA - yP)); await ov(cap("Votre semaine en 2 minutes", t - 0.3, 640, 2)); });
  // 6. Comparer
  await ouvre("/comparer");
  const yT = await y("Toutes prêtes", 90);
  await scene("06-comparer", 3.4, async (t, k) => { await scroll(ease(Math.min(1, k * 1.2)) * (yT + 900)); await ov(cap("63 comparaisons en un clic", t - 0.3, 640, -2)); });
  // 7. Fin
  await scene("07-fin", 3.2, async (t) => {
    const a = pop(t, 0.1), b = pop(t, 0.6), c = pop(t, 1.1);
    await ov(`<div class="full"><div style="opacity:${a.o};transform:scale(${a.s})"><span class="logo">ENKLAIR</span></div><div class="big" style="opacity:${b.o};transform:scale(${b.s});margin-top:26px;font-size:44px">enklair.com</div><div class="mid" style="opacity:${c.o}">Gratuit. Sans inscription.<br>Des faits, jamais de conseil.</div></div>`);
  });
  await br.close();
}
main().catch(e => { console.error(e); process.exit(1); });
