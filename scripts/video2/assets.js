// Captures nettes (x3) des éléments du site qui serviront de matière à la vidéo
const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
(async () => {
  const shot = async (p, sel, name, opt = {}) => { const el = typeof sel === "string" ? await p.$(sel) : sel; if (!el) { console.log("absent", name); return; } await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await el.screenshot({ path: `/tmp/v2/${name}.png`, ...opt }); const bb = await el.boundingBox(); console.log(name, Math.round(bb.width), Math.round(bb.height)); };
  const hide = p => p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 200) e.style.display = "none"; } });
  // téléphone
  let { b, p } = await ouvrir({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await aller(p, "/entreprise/hermes", 3500); await hide(p);
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: "/tmp/v2/tel_hermes.png" });
  await aller(p, "/", 3500); await hide(p); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: "/tmp/v2/tel_accueil.png" });
  await aller(p, "/comparer", 3000); await hide(p); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: "/tmp/v2/tel_comparer.png" });
  await aller(p, "/rapport-exemple", 4000); await hide(p); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: "/tmp/v2/tel_rapport.png" });
  await aller(p, "/etf", 3500); await hide(p); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: "/tmp/v2/tel_etf.png" });
  await aller(p, "/portefeuille", 3500); await hide(p); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: "/tmp/v2/tel_portefeuille.png" });
  await b.close();
  // éléments (ordinateur étroit, x3)
  ({ b, p } = await ouvrir({ viewport: { width: 560, height: 1000 }, deviceScaleFactor: 3 }));
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await aller(p, "/", 3500); await hide(p);
  const carte = await p.evaluateHandle(() => { const h = [...document.querySelectorAll("*")].find(x => x.textContent.trim() === "Exemple réel, derniers comptes"); return h && h.parentElement; });
  await shot(p, carte.asElement(), "carte_hermes");
  await aller(p, "/entreprise/hermes", 3500); await hide(p);
  const verdict = await p.evaluateHandle(() => { const h = [...document.querySelectorAll("h2,h3,p,div")].find(x => /^Très rentable/.test(x.textContent.trim()) && x.children.length < 3); let e = h; for (let i = 0; i < 3 && e; i++) e = e.parentElement; return e; });
  await shot(p, verdict.asElement(), "verdict");
  await aller(p, "/rapport-exemple", 4500); await hide(p);
  const ap = await p.evaluateHandle(() => [...document.querySelectorAll(".s9-dos")].find(x => /Apple/.test(x.textContent)));
  await shot(p, ap.asElement(), "dossier_apple");
  await b.close();
})();
