const { ouvrir, aller } = require("/home/claude/bourse/scripts/_site");
const fs = require("fs");
(async () => {
  const { b, p } = await ouvrir({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const TRAD = JSON.parse(fs.readFileSync("/tmp/v3_trad.json", "utf8"));
  await p.route("**/api/rapport-exemple*", r => r.fulfill({ path: "/tmp/rex.json", contentType: "application/json" }));
  await p.route(/\/api\/(comparer|quota)/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reste: 5, max: 5 }) }));
  await p.route("**/api/ia/traduire", r => { const t = JSON.parse(r.request().postData() || "{}").t || []; r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fr: t.map(x => TRAD[x] || null) }) }); });
  const net = () => p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const cs = getComputedStyle(e); if ((cs.position === "fixed" || cs.position === "sticky") && e.getBoundingClientRect().top > 200) e.style.visibility = "hidden"; if (cs.position === "sticky" || cs.position === "fixed") { e.style.position = "absolute"; } } });
  const R = async sel => { const r = await p.evaluate(s => { const e = typeof s === "string" ? document.querySelector(s) : null; if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; }, sel); return r; };
  const RT = async (re, up = 0) => p.evaluate(([src, up]) => { const rx = new RegExp(src); const e0 = [...document.querySelectorAll("h1,h2,h3,h4,p,div,span,b,a")].find(x => rx.test(x.textContent.trim()) && x.children.length < 4); let e = e0; for (let i = 0; i < up && e; i++) e = e.parentElement; if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; }, [re, up]);
  const out = {};
  await aller(p, "/entreprise/hermes", 3500); await net(); await p.screenshot({ path: "/tmp/v6/full_hermes.png", fullPage: true });
  out.hermes = { h1: await R("h1"), verdict: await RT("^Le verdict"), cartes: await RT("^Chaque repère est placé") };
  await aller(p, "/comparer?ids=hermes,lvmh,kering", 3500); await net(); await p.screenshot({ path: "/tmp/v6/full_cmp.png", fullPage: true });
  out.cmp = { h1: await R("h1"), verdict: await RT("devant sur"), marge: await RT("^Gardés sur 100") };
  await aller(p, "/rapport-exemple", 5000); await net(); await p.waitForTimeout(800); await p.screenshot({ path: "/tmp/v6/full_rap.png", fullPage: true });
  out.rap = { hero: await R(".s7-hero"), h1: await R(".s7-hero h1"), retenir: await R(".s7-rts"), dos: await p.evaluate(() => [...document.querySelectorAll(".s9-dos")].map(e => { const b = e.getBoundingClientRect(); return { nom: e.querySelector(".s9-id b").textContent, x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; })),
    une: await p.evaluate(() => { const d = [...document.querySelectorAll(".s9-dos")].find(e => /Apple/.test(e.querySelector(".s9-id").textContent)); const u = d.querySelector(".s9-une"); const b = u.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; }),
    duo: await R(".s7-duo"), ctx: await R(".s7-ctx") };
  out.H = { hermes: await p.evaluate(() => 0) };
  fs.writeFileSync("/tmp/v6/pos.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
  await b.close();
})();
