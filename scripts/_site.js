// Ouvre le site construit localement (cf/site) dans Chromium, sans réseau extérieur : http://t.local/… sert les fichiers du dépôt.
// Utilisé par les scripts de contrôle (check-*.js). Usage : const { ouvrir } = require("./_site"); const { b, p } = await ouvrir();
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "cf", "site");
async function ouvrir(opts = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, serviceWorkers: "block" });
  const p = await ctx.newPage();
  await p.route(/.*/, r => {
    const u = r.request().url();
    if (!u.includes("//t.local")) return r.fulfill({ status: 404, body: "" }); // logos, polices, TradingView : rien ne sort
    const pth = u.split("//t.local")[1].split("#")[0].split("?")[0];
    if (pth.startsWith("/api/")) return r.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    const f = path.join(ROOT, pth.replace(/^\//, ""));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ path: f });
    if (/\.[a-z0-9]+$/i.test(pth.split("/").pop())) return r.fulfill({ status: 404, body: "" });
    return r.fulfill({ path: path.join(ROOT, "index.html") });
  });
  return { b, p, ctx };
}
async function aller(p, pth, attente = 1500) { await p.goto("http://t.local" + pth, { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(attente); }
module.exports = { ouvrir, aller, ROOT };
