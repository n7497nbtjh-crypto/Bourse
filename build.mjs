// Construit le site : données de démo, sitemap, Worker.
// Usage : node build.mjs [https://adresse-du-site]
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const ORIGIN = process.argv[2] || "https://repere.pages.dev";
import { copyFileSync } from "node:fs";
copyFileSync("data/agenda.json", "cf/site/data/agenda.json");
{ const { default: U, REGIONS } = await import("./data/univers.mjs"); const { default: F } = await import("./data/fiches.mjs"); const { default: C, SOURCES_COURTIERS } = await import("./data/courtiers.mjs");
  writeFileSync("cf/site/data/univers.json", JSON.stringify({ regions: REGIONS, companies: U.map(({ id, name, ticker, domain, desc, sector, isin, tv, region }) => ({ id, name, ticker, domain, desc, sector, isin, tv, region, fiche: F[id] || null })) }));
  writeFileSync("cf/site/data/courtiers.json", JSON.stringify({ updated: "2026-10-28", sources: SOURCES_COURTIERS, list: C.map(c => ({ ...c, grille: c.grille.map(g => [g[0] === Infinity ? null : g[0], g[1], g[2]]) })) }));
  const miss = U.filter(c => !F[c.id]).map(c => c.id); if (miss.length) { console.log("fiches manquantes :", miss.join(", ")); process.exit(1); } }
const { default: INDEX } = await import("./data/univers.mjs");
const paths = ["/", "/entreprises", "/simulateurs", "/simulateurs/interets", "/simulateurs/frais", "/simulateurs/pea-cto", "/simulateurs/une-fois", "/actualites", "/agenda", "/portefeuille", "/lexique", ...INDEX.flatMap(c => ["/entreprise/" + c.id, "/entreprise/" + c.id + "/comptes"])];
writeFileSync("cf/site/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${ORIGIN}${p}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("cf/site/robots.txt", `User-agent: *\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
execSync("npx --yes esbuild@0.24.0 cf/src/worker.mjs --bundle --format=esm --minify-syntax --outfile=cf/site/_worker.js", { stdio: "inherit" });
console.log(paths.length, "pages dans le sitemap");
