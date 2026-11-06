const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
(async () => {
  const { b, p } = await ouvrir({ viewport: { width: 560, height: 1000 }, deviceScaleFactor: 3 });
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await aller(p, "/rapport-exemple", 4500);
  await p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" || cs.position === "sticky") e.style.display = "none"; } });
  const el = await p.evaluateHandle(() => [...document.querySelectorAll(".s9-dos")].find(x => /Hermès/.test(x.querySelector(".s9-id").textContent)));
  await el.asElement().scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await el.asElement().screenshot({ path: "/tmp/v2/dossier_hermes.png" });
  await b.close();
})();
