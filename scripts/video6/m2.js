const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
const fs = require("fs");
(async () => { const { b, p } = await ouvrir({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await p.route(/\/api\/(comparer|quota)/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reste: 5, max: 5 }) }));
  const net = () => p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "fixed" && e.getBoundingClientRect().top > 200) e.style.visibility = "hidden"; } });
  for (const id of ["apple", "lvmh", "asml", "nvidia", "totalenergies", "hermes"]) { await aller(p, "/entreprise/" + id, 3000); await net(); await p.screenshot({ path: `/tmp/v6/g_${id}.jpg`, type: "jpeg", quality: 92 }); }
  await aller(p, "/comparer?ids=hermes,lvmh,kering", 3500);
  console.log("cmpv", JSON.stringify(await p.evaluate(() => { const e = [...document.querySelectorAll("h2,h3,p,div")].find(x => /^Hermès devant sur/.test(x.textContent.trim()) && x.children.length < 4); const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; })));
  await aller(p, "/rapport-exemple", 4500);
  console.log("btn", JSON.stringify(await p.evaluate(() => { const d = [...document.querySelectorAll(".s9-dos")].find(e => /Apple/.test(e.querySelector(".s9-id").textContent)); const b = d.querySelector(".s9-une .s9-ia").getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; })));
  console.log("rt", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll(".s7-rt")].map(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; }))));
  await b.close(); })();
