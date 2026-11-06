// Tournage du site sur ordinateur (1280 x 800, x2) : défilement et souris calculés image par image.
// Sortie : /tmp/v4/f/00001.jpg… et /tmp/v4/meta.json (souris par image, repères de zoom, adresses).
const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
const fs = require("fs"); const FPS = 60, OUT = "/tmp/v4/f"; fs.rmSync("/tmp/v4", { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const eio = x => x < .5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2;
(async () => {
  const { b, p } = await ouvrir({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const TRAD = JSON.parse(process.env.TRAD || "{}");
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await p.route(/\/api\/(comparer|quota)/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reste: 5, max: 5 }) }));
  await p.route("**/api/ia/traduire", r => { const t = JSON.parse(r.request().postData() || "{}").t || []; r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fr: t.map(x => TRAD[x] || null) }) }); });
  let n = 0; const souris = [], M = {}, url = [];
  let mx = 900, my = 700, clic = 0, adr = "enklair.com";
  const nettoie = () => p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 300) e.style.visibility = "hidden"; } });
  const snap = async () => { n++; await p.screenshot({ path: `${OUT}/${String(n).padStart(5, "0")}.jpg`, type: "jpeg", quality: 90 }); souris.push([Math.round(mx * 10) / 10, Math.round(my * 10) / 10, Math.round(clic * 100) / 100]); url.push(adr); };
  const hold = async s => { for (let i = 0; i < Math.round(s * FPS); i++) await snap(); };
  const sy = () => p.evaluate(() => scrollY);
  const scroll = async (to, s) => { const from = await sy(); to = Math.max(0, Math.min(to, await p.evaluate(() => document.documentElement.scrollHeight - innerHeight))); const N = Math.round(s * FPS); for (let i = 1; i <= N; i++) { await p.evaluate(y => scrollTo(0, y), from + (to - from) * eio(i / N)); await snap(); } };
  const yDe = async (loc, marge = 120) => { const bb = await loc.boundingBox(); return Math.max(0, (await sy()) + bb.y - marge); };
  const vers = async (loc, s = .7, dx = 0) => { const bb = await loc.boundingBox(); const tx = bb.x + Math.min(bb.width / 2, 60) + dx, ty = bb.y + bb.height / 2, x0 = mx, y0 = my, N = Math.round(s * FPS);
    for (let i = 1; i <= N; i++) { const q = eio(i / N); mx = x0 + (tx - x0) * q; my = y0 + (ty - y0) * q - Math.sin(q * Math.PI) * 30; await snap(); } };
  const presse = async () => { for (let i = 1; i <= 12; i++) { clic = Math.sin(i / 12 * Math.PI); await snap(); } clic = 0; };
  // repère de zoom : rectangle (pixels CSS de la fenêtre) au moment présent
  const rect = async (k, a, z = null) => { const A = await a.boundingBox(); M[k] = { n, x: A.x, y: A.y, w: A.width, h: A.height, z }; };
  const rect2 = async (k, a, bLoc) => { const A = await a.boundingBox(), B = await bLoc.boundingBox(); const x = Math.min(A.x, B.x), y = Math.min(A.y, B.y); M[k] = { n, x, y, w: Math.max(A.x + A.width, B.x + B.width) - x, h: Math.max(A.y + A.height, B.y + B.height) - y }; };

  // 1. Accueil
  await aller(p, "/", 3500); await nettoie(); M.accueil = { n };
  await hold(.5);
  const inp = p.locator(".a4-srch input").first();
  await vers(inp, .8, 40); await presse(); await inp.click();
  await rect("recherche", inp);
  for (const ch of "Hermès") { await p.keyboard.type(ch); await p.waitForTimeout(110); await hold(.11); }
  await p.waitForTimeout(700); await hold(.45);
  const sug = p.locator(".srow").first(); await vers(sug, .55); M.sugg = { n }; await presse();
  await sug.click(); await p.waitForTimeout(2600); await nettoie(); await p.evaluate(() => scrollTo(0, 0)); adr = "enklair.com/entreprise/hermes";
  // 2. Fiche
  M.fiche = { n }; await hold(.25);
  await rect2("ficheHaut", p.locator("h1").first(), p.locator("text=/^Voir le graphique du cours/").first()); await hold(1.9);
  const ver = p.locator("text=/^Le verdict/").first();
  await scroll(await yDe(ver, 100), 1.0);
  await rect2("verdict", ver, p.locator("text=/^Chaque repère est placé/").first()); await hold(2.6);
  const cmpB = p.locator("a:has-text('Comparer à ses rivales'), button:has-text('Comparer à ses rivales')").first();
  await vers(cmpB, .7); await presse();
  const href = await cmpB.getAttribute("href").catch(() => null);
  if (href) await aller(p, href, 3500); else { await cmpB.click(); await p.waitForTimeout(3000); } await nettoie(); await p.evaluate(() => scrollTo(0, 0)); adr = "enklair.com/comparer?ids=hermes,lvmh,kering";
  // 3. Comparer
  M.comparer = { n }; await hold(.9);
  const vd = p.locator("text=/devant sur/").first();
  await scroll(await yDe(vd, 110), 1.0); await rect("cmpVerdict", vd); await hold(2.0);
  const mg = p.locator("text=/^Marge d.exploitation/").first();
  await scroll(await yDe(mg, 90), 1.1);
  const box = await p.evaluate(() => { const h = [...document.querySelectorAll("*")].find(x => /^Gardés sur 100/.test(x.textContent.trim()) && x.children.length < 3); let e = h; while (e && e.getBoundingClientRect().width < 400) e = e.parentElement; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  M.cmpMarge = { n, ...box }; await hold(2.2);
  // 4. Rapport
  await aller(p, "/rapport-exemple", 4500); await nettoie(); await p.evaluate(() => scrollTo(0, 0)); adr = "enklair.com/rapport-exemple"; mx = 1100; my = 650;
  M.rapport = { n }; await hold(.9);
  const dh = p.locator(".s9-dos").filter({ hasText: "Hermès" }).first();
  await scroll(await yDe(dh, 70), 1.2); await rect("rapHermes", dh); await hold(2.6);
  fs.writeFileSync("/tmp/v4/meta.json", JSON.stringify({ n, souris, M, url }));
  console.log(n, "images", JSON.stringify(M));
  await b.close();
})();
