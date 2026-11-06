// Tournage du site comme une vraie visite sur téléphone : chaque image est une capture nette (x3), le défilement est calculé image par image.
// Sortie : /tmp/v3/f/00001.jpg… et /tmp/v3/doigt.json (position du doigt par image, en pixels CSS du téléphone).
const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
const fs = require("fs"); const FPS = 60, OUT = "/tmp/v3/f"; fs.rmSync("/tmp/v3", { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const eio = x => x < .5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2;
(async () => {
  const { b, p } = await ouvrir({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await p.route(/\/api\/(comparer|quota)/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reste: 5, max: 5 }) }));
  // traduction des titres étrangers : le site la demande à son IA ; ici, les traductions de la maquette du rapport (marquées « traduit » par le site)
  const TRAD = JSON.parse(process.env.TRAD || "{}");
  await p.route("**/api/ia/traduire", async r => { const t = JSON.parse(r.request().postData() || "{}").t || []; r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fr: t.map(x => TRAD[x] || null) }) }); });
  let n = 0; const doigt = [], marques = {};
  const nettoie = () => p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 300) e.style.visibility = "hidden"; } });
  let fx = null, fy = null, fp = 0, fo = 0;
  const snap = async () => { n++; await p.screenshot({ path: `${OUT}/${String(n).padStart(5, "0")}.jpg`, type: "jpeg", quality: 90 }); doigt.push([fx, fy, fp, fo]); };
  const hold = async s => { for (let i = 0; i < Math.round(s * FPS); i++) await snap(); };
  const sy = () => p.evaluate(() => scrollY);
  const scroll = async (to, s) => { const from = await sy(); const N = Math.round(s * FPS); for (let i = 1; i <= N; i++) { await p.evaluate(y => scrollTo(0, y), from + (to - from) * eio(i / N)); await snap(); } };
  const yDe = async (loc, marge = 120) => { const bb = await loc.boundingBox(); return Math.max(0, (await sy()) + bb.y - marge); };
  // le doigt arrive, appuie, relâche
  const tap = async (loc, s = .7) => { const bb = await loc.boundingBox(); const tx = bb.x + bb.width / 2, ty = bb.y + bb.height / 2, N = Math.round(s * FPS);
    const x0 = fx == null ? tx + 60 : fx, y0 = fy == null ? ty + 180 : fy;
    for (let i = 1; i <= N; i++) { const q = i / N, m = eio(Math.min(1, q / .55)); fx = x0 + (tx - x0) * m; fy = y0 + (ty - y0) * m; fo = Math.min(1, q * 4); fp = q > .6 && q < .85 ? Math.sin((q - .6) / .25 * Math.PI) : 0; await snap(); } };
  const lacher = async (s = .25) => { const N = Math.round(s * FPS); for (let i = 1; i <= N; i++) { fo = 1 - i / N; await snap(); } fx = fy = null; };
  const mark = k => { marques[k] = n; };

  // 1. Accueil : recherche d'Hermès
  await aller(p, "/", 3500); await nettoie(); mark("accueil");
  await hold(.7);
  const inp = p.locator(".a4-srch input").first();
  await scroll(await yDe(inp, 300), .9);
  await tap(inp); await inp.click(); mark("tape");
  for (const ch of "Hermès") { await p.keyboard.type(ch); await p.waitForTimeout(120); await hold(.12); }
  await p.waitForTimeout(700); await hold(.5);
  const sug = p.locator(".srow").first(); await tap(sug); await lacher(.15);
  await sug.click(); await p.waitForTimeout(2500); await nettoie(); await p.evaluate(() => scrollTo(0, 0));
  // 2. Fiche Hermès
  mark("fiche"); await hold(1.0);
  const ver = p.locator("text=/^Le verdict/").first();
  await scroll(await yDe(ver, 70), 1.3); mark("verdict"); await hold(2.4);
  const cmpB = p.locator("a:has-text('Comparer à ses rivales'), button:has-text('Comparer à ses rivales')").first();
  await scroll(await yDe(cmpB, 520), .8); await hold(.6);
  await tap(cmpB, .8); await lacher(.15); mark("versComparer");
  const href = await cmpB.getAttribute("href").catch(() => null);
  if (href) await aller(p, href, 3500); else { await cmpB.click(); await p.waitForTimeout(3000); }
  await nettoie(); await p.evaluate(() => scrollTo(0, 0));
  // 3. Comparer
  mark("comparer"); await hold(.9);
  const vd = p.locator("text=/devant sur/").first();
  await scroll(await yDe(vd, 160), 1.4); mark("cmpVerdict"); await hold(1.8);
  const mg = p.locator("text=/^Marge d.exploitation/").first();
  if (await mg.count()) { await scroll(await yDe(mg, 120), 1.4); mark("cmpMarge"); await hold(1.8); }
  // 4. Rapport de la semaine
  await aller(p, "/rapport-exemple", 4500); await nettoie(); await p.evaluate(() => scrollTo(0, 0));
  mark("rapport"); await hold(1.0);
  const dh = p.locator(".s9-dos").filter({ hasText: "Hermès" }).first();
  await scroll(await yDe(dh, 90), 1.6); mark("rapHermes"); await hold(2.2);
  fs.writeFileSync("/tmp/v3/doigt.json", JSON.stringify({ n, doigt, marques, href }));
  console.log(n, "images", marques, href);
  await b.close();
})();
