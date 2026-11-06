const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
(async () => {
  const { b, p } = await ouvrir({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const TRAD = JSON.parse(require("fs").readFileSync("/tmp/v3_trad.json", "utf8"));
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await p.route(/\/api\/(comparer|quota)/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reste: 5, max: 5 }) }));
  await p.route("**/api/ia/traduire", r => { const t = JSON.parse(r.request().postData() || "{}").t || []; r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fr: t.map(x => TRAD[x] || null) }) }); });
  const net = () => p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 300) e.style.visibility = "hidden"; } });
  for (const id of ["apple", "lvmh", "asml", "nvidia", "totalenergies", "hermes"]) { await aller(p, "/entreprise/" + id, 3000); await net(); await p.screenshot({ path: `/tmp/v5/f_${id}.png` }); }
  // fiche Hermès, verdict visible
  const v = p.locator("text=/^Le verdict/").first(); const bb = await v.boundingBox(); await p.evaluate(y => scrollTo(0, y), bb.y - 330); await p.waitForTimeout(300);
  await p.screenshot({ path: "/tmp/v5/hermes_verdict_page.png" });
  const hv = await p.locator("text=/^Le verdict/").first().boundingBox(); console.log("verdict", hv);
  // titre du verdict
  const h2 = p.locator("text=/^Très rentable, sans dette/").first(); await h2.screenshot({ path: "/tmp/v5/c_titre.png" }); console.log("titre", await h2.boundingBox());
  // 5 cartes
  const cards = await p.evaluate(() => { const L = ["Ses ventes", "Sa marge", "Son bénéfice", "Son dividende", "Son prix en Bourse"]; return L.map(t => { const h = [...document.querySelectorAll("*")].find(x => x.children.length <= 2 && x.textContent.trim().replace(/^\d\s*/, "") === t); let e = h; while (e && e.getBoundingClientRect().height < 150) e = e.parentElement; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }); });
  for (let i = 0; i < 5; i++) { const c = cards[i]; await p.screenshot({ path: `/tmp/v5/c_rep${i}.png`, clip: { x: c.x, y: c.y, width: c.w, height: c.h } }); }
  console.log("cartes", JSON.stringify(cards));
  // comparer
  await aller(p, "/comparer?ids=hermes,lvmh,kering", 3500); await net();
  const vd = p.locator("text=/devant sur/").first(); await vd.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, 200)); await p.waitForTimeout(300); await vd.screenshot({ path: "/tmp/v5/c_cmp.png" });
  const mg = await p.evaluate(() => { const h = [...document.querySelectorAll("*")].find(x => /^Gardés sur 100/.test(x.textContent.trim()) && x.children.length < 3); h.scrollIntoView({ block: "center" }); let e = h; while (e && e.getBoundingClientRect().width < 400) e = e.parentElement; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.waitForTimeout(300); const mg2 = await p.evaluate(() => { const h = [...document.querySelectorAll("*")].find(x => /^Gardés sur 100/.test(x.textContent.trim()) && x.children.length < 3); let e = h; while (e && e.getBoundingClientRect().width < 400) e = e.parentElement; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.screenshot({ path: "/tmp/v5/c_marge.png", clip: { x: mg2.x - 4, y: mg2.y - 4, width: mg2.w + 14, height: mg2.h + 14 } });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200); await p.screenshot({ path: "/tmp/v5/p_cmp.png" });
  // rapport
  await aller(p, "/rapport-exemple", 4500); await net(); await p.waitForTimeout(800);
  const dh = p.locator(".s9-dos").filter({ hasText: "Hermès" }).first(); await dh.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await dh.screenshot({ path: "/tmp/v5/c_rap.png" });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200); await p.screenshot({ path: "/tmp/v5/p_rap.png" });
  await b.close();
})();
