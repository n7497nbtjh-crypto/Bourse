const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
(async () => {
  const { b, p } = await ouvrir({ viewport: { width: 560, height: 1000 }, deviceScaleFactor: 3 });
  await aller(p, "/entreprise/hermes", 3500);
  await p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 200) e.style.display = "none"; } });
  const A = await p.locator("text=/^Le verdict/").first().boundingBox(), Z = await p.locator("text=/Poser une question/").first().boundingBox();
  const sy = await p.evaluate(() => scrollY); const r = { y: A.y + sy - 16, h: Z.y + Z.height - A.y + 40 }, g = 0;
  await p.screenshot({ path: "/tmp/v2/verdict.png", clip: { x: 0, y: r.y, width: 560, height: r.h }, fullPage: true });
  console.log(r, g);
  await b.close();
})();
