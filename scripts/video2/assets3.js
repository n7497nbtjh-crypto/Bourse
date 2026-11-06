const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
(async () => {
  const hide = p => p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if ((cs.position === "fixed" || cs.position === "sticky") && e.getBoundingClientRect().top > 150) e.style.display = "none"; } });
  const { b, p } = await ouvrir({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  await p.route("**/api/**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reste: 5, max: 5 }) }));
  await aller(p, "/comparer?ids=lvmh,hermes,kering", 4000); await hide(p);
  const h = await p.evaluate(() => document.body.scrollHeight); console.log("h", h);
  await p.screenshot({ path: "/tmp/v2/cmp_full.png", fullPage: true });
  await b.close();
})();
