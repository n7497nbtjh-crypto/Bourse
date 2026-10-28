// Construit le site : données de démo, sitemap, Worker.
// Usage : node build.mjs [https://adresse-du-site]
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const ORIGIN = process.argv[2] || "https://repere.pages.dev";
import { copyFileSync, existsSync, writeFileSync as wfs } from "node:fs";
copyFileSync("data/agenda.json", "cf/site/data/agenda.json");
if (existsSync("data/segments-fr.json")) copyFileSync("data/segments-fr.json", "cf/site/data/segments-fr.json");
{ const R = {}; for (const f of ["france", "europe", "us"]) if (existsSync(`data/repartitions/${f}.mjs`)) Object.assign(R, (await import(`./data/repartitions/${f}.mjs`)).default); wfs("cf/site/data/repartitions.json", JSON.stringify(R)); }
{ const E = existsSync("data/etf.mjs") ? (await import("./data/etf.mjs")).default : []; wfs("cf/site/data/etf.json", JSON.stringify({ updated: "2026-10-28", list: E })); }
{ const { default: U, REGIONS } = await import("./data/univers.mjs"); const { default: F } = await import("./data/fiches.mjs"); const { default: C, SOURCES_COURTIERS } = await import("./data/courtiers.mjs");
  writeFileSync("cf/site/data/univers.json", JSON.stringify({ regions: REGIONS, companies: U.map(({ id, name, ticker, domain, desc, sector, isin, tv, region, fiche, sec }) => ({ id, name, ticker, domain, desc, sector, isin, tv, region, sec, fiche: F[id] || fiche || null })) }));
  writeFileSync("cf/site/data/courtiers.json", JSON.stringify({ updated: "2026-10-28", sources: SOURCES_COURTIERS, list: C.map(c => ({ ...c, grille: c.grille.map(g => [g[0] === Infinity ? null : g[0], g[1], g[2]]) })) }));
  const miss = U.filter(c => !F[c.id] && !c.fiche).map(c => c.id); if (miss.length) { console.log("fiches manquantes :", miss.join(", ")); process.exit(1); } }
const { default: INDEX } = await import("./data/univers.mjs");
const paths = ["/", "/entreprises", "/simulateurs", "/simulateurs/epargne", "/simulateurs/frais", "/simulateurs/pea-cto", "/actualites", "/agenda", "/portefeuille", "/lexique", "/etf", "/communaute", ...(existsSync("data/etf.mjs") ? (await import("./data/etf.mjs")).default.map(e => "/etf/" + e.id) : []), ...INDEX.flatMap(c => ["/entreprise/" + c.id, "/entreprise/" + c.id + "/comptes", "/entreprise/" + c.id + "/comprendre/argent"])];
writeFileSync("cf/site/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${ORIGIN}${p}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("cf/site/robots.txt", `User-agent: *\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
{ const { default: U, SECTEURS } = await import("./data/univers.mjs");
  wfs("cf/src/index.gen.mjs", "// Fichier fabriqué par build.mjs : la liste minimale des entreprises pour le Worker.\nexport const SECTEURS = " + JSON.stringify(SECTEURS) + ";\nexport default " + JSON.stringify(U.map(({ id, name, sector, desc, region, isin }) => ({ id, name, sector, desc, region, isin }))) + ";\n"); }
execSync("npx --yes esbuild@0.24.0 cf/src/worker.mjs --bundle --format=esm --minify-syntax --outfile=cf/site/_worker.js", { stdio: "inherit" });
console.log(paths.length, "pages dans le sitemap");
