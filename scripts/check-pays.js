// Contrôle « PEA seulement en France » (3/11/2026) : ouvre les grandes pages comme un visiteur situé en Belgique
// et en Allemagne (pays donné par Cloudflare, attribut data-pays-ip), puis relève tout « PEA » visible à l'écran.
// Vérifie aussi qu'un visiteur en France voit bien le PEA (liste des ETF, fiche ETF) et qu'un choix mémorisé
// (« France » en Belgique) l'emporte sur la détection.
// Usage : node scripts/check-pays.js [pages…]   → 0 problème attendu avant de pousser.
const { ouvrir } = require("./_site"), fs = require("fs"), path = require("path");
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/entreprises", "/entreprise/lvmh", "/entreprise/totalenergies", "/comparer?ids=lvmh,hermes,kering", "/comparer",
  "/etf", "/etf?pea=1", "/etf/amundi-msci-world-pea", "/etf/ishares-core-msci-world", "/marches", "/actualites", "/agenda", "/classements", "/classements?c=dividende&pea=1", "/dividendes",
  "/outils", "/outils/si-javais", "/outils/recouvrement", "/simulateurs/epargne", "/simulateurs/frais", "/repartitions", "/idees-recues", "/decouvertes",
  "/apprendre", "/academie/placements/etf", "/lexique", "/portefeuille", "/espace", "/premium", "/methode", "/plan"];
const ROOT = path.join(__dirname, "..", "cf", "site");
const VISIBLE = `() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, t = n.textContent, t2 = t.replace(/\\bPEA(?= [A-Z0-9])/g, "").replace(/équivalent du PEA/g, ""); if (!/\\bPEA\\b/.test(t2)) continue; // noms de fonds (« Amundi PEA Monde ») et « pas d'équivalent du PEA » admis
    const e = n.parentElement; if (!e || e.closest("script,style,noscript,[hidden],details:not([open]) > :not(summary),.ssr,.pays-bar,.pays-info")) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || !r.height || cs.visibility === "hidden") continue;
    let x = e, cache = false; while (x) { if (getComputedStyle(x).display === "none") { cache = true; break; } x = x.parentElement; } if (cache) continue;
    out.push(t.replace(/\\s+/g, " ").trim().slice(0, 90)); }
  document.querySelectorAll("input[placeholder],option").forEach(e => { const t = e.placeholder || e.textContent; if (/\\bPEA\\b/.test(t.replace(/\\bPEA(?= [A-Z0-9])/g, "")) && e.offsetParent !== null) out.push("[champ] " + t.slice(0, 90)); });
  return [...new Set(out)]; }`;
(async () => {
  const { b, p } = await ouvrir(); let ip = null;
  await p.route(/.*/, async r => { // même service que _site.js, avec le pays posé par le Worker en production
    const u = r.request().url(), pth = u.includes("//t.local") ? u.split("//t.local")[1].split("#")[0].split("?")[0] : "";
    const f = path.join(ROOT, pth.replace(/^\//, ""));
    if (!u.includes("//t.local") || pth.startsWith("/api/") || (fs.existsSync(f) && fs.statSync(f).isFile()) || /\.[a-z0-9]+$/i.test(pth.split("/").pop())) return r.fallback();
    let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"); if (ip) html = html.replace(/<html\b/, `<html data-pays-ip="${ip}"`);
    return r.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
  });
  let pb = 0; const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 160)));
  const voir = async (u, choix) => { await p.goto("http://t.local" + u, { waitUntil: "load", timeout: 60000 }); await p.evaluate(c => { try { c ? localStorage.setItem("bilan.pays", c) : localStorage.removeItem("bilan.pays"); } catch (e) { } }, choix);
    await p.goto("http://t.local" + u, { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(1300); return p.evaluate(`(${VISIBLE})()`); };
  for (const pays of ["be", "de"]) {
    ip = pays; let n = 0;
    for (const u of PAGES) { const v = await voir(u, null); if (v.length) { pb++; n++; console.log(`  [${pays}] ${u} : ${v.slice(0, 4).map(x => "« " + x + " »").join(" ; ")}`); } }
    console.log(`${pays === "be" ? "Belgique" : "Allemagne"} : ${PAGES.length} pages, ${n} avec du PEA visible`);
  }
  ip = "fr"; for (const u of ["/etf", "/etf/amundi-msci-world-pea"]) { const v = await voir(u, null); if (!v.length) { pb++; console.log(`  [fr] ${u} : aucun PEA visible pour un visiteur en France`); } }
  ip = "be"; { const v = await voir("/etf/amundi-msci-world-pea", "fr"); if (!v.length) { pb++; console.log("  [be + choix France] le choix mémorisé ne l'emporte pas sur la détection"); } }
  ip = null; { const v = await voir("/etf/amundi-msci-world-pea", null); if (!v.length) { pb++; console.log("  [pays inconnu] le PEA devrait être affiché (France par défaut)"); } }
  if (errs.length) { pb += errs.length; console.log("Erreurs JS :", [...new Set(errs)].slice(0, 5)); }
  console.log(pb ? `${pb} problème(s)` : "OK : PEA visible seulement pour un visiteur en France");
  await b.close(); process.exit(pb ? 1 : 0);
})();
