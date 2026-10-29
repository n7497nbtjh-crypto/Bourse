// Sonde « audit » (docs/audit-2026-10.md) : en-têtes HTTP, poids compressés et comportement des routes du site en production.
// Lecture seule, quelques requêtes espacées, aucun compte, aucune écriture.
import { writeFileSync, mkdirSync } from "node:fs";
const SITE = "https://repere-bourse.pages.dev";
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const OUT = process.env.SORTIE || "data/sonde/out/audit";
mkdirSync(OUT, { recursive: true });
const CHEMINS = ["/", "/entreprise/lvmh", "/etf/amundi-msci-world-pea", "/page-qui-n-existe-pas", "/debuter", "/m/accueil.js", "/ia.js", "/sw.js",
  "/data/societes.json", "/data/univers.json", "/data/etf.json", "/data/segments-fr.json", "/data/inexistant.json", "/data/societes/lvmh.json",
  "/sitemap.xml", "/robots.txt", "/api/cours", "/api/presse?q=lvmh", "/api/amf", "/api/nimporte", "/mcp"];
const pause = ms => new Promise(r => setTimeout(r, ms));
const res = {};
for (const p of CHEMINS) {
  const r0 = { };
  for (const enc of ["br", "identity"]) {
    try {
      const t = Date.now();
      const r = await fetch(SITE + p, { headers: { "user-agent": UA, "accept-encoding": enc }, redirect: "manual" });
      const buf = Buffer.from(await r.arrayBuffer());
      r0[enc] = { statut: r.status, ms: Date.now() - t, octets_recus: buf.length, entetes: Object.fromEntries(r.headers), debut: enc === "identity" ? buf.subarray(0, 120).toString("utf8") : undefined };
    } catch (e) { r0[enc] = { erreur: String(e) }; }
    await pause(400);
  }
  res[p] = r0;
}
// Rendu sans JavaScript : ce que voit un robot sur une fiche (texte hors balises script et style)
try {
  const h = await (await fetch(SITE + "/entreprise/lvmh", { headers: { "user-agent": UA } })).text();
  const corps = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<head>[\s\S]*?<\/head>/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  res.sans_js = { titre: (h.match(/<title>([^<]*)/) || [])[1], description: (h.match(/<meta name="description" content="([^"]*)/) || [])[1], json_ld: (h.match(/application\/ld\+json/g) || []).length, texte_visible: corps.slice(0, 600), longueur_texte: corps.length };
} catch (e) { res.sans_js = { erreur: String(e) }; }
writeFileSync(OUT + "/audit.json", JSON.stringify(res, null, 1));
console.log("ok", Object.keys(res).length);
