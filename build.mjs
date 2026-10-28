// Construit le site : données de démo, sitemap, Worker.
// Usage : node build.mjs [https://adresse-du-site]
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const ORIGIN = process.argv[2] || "https://repere.pages.dev";
execSync("node data/gen_demo.mjs", { stdio: "inherit" });
import { copyFileSync } from "node:fs";
copyFileSync("data/agenda.json", "cf/site/data/agenda.json");
{ const { default: U } = await import("./data/univers.mjs"); writeFileSync("cf/site/data/univers.json", JSON.stringify(U.map(({ id, name, ticker, domain, desc, sector, isin, tv }) => ({ id, name, ticker, domain, desc, sector, isin, tv })))); }
const { default: INDEX } = await import("./data/univers.mjs");
const paths = ["/", "/entreprises", "/simulateurs", "/simulateurs/interets", "/simulateurs/frais", "/simulateurs/pea-cto", "/simulateurs/une-fois", "/actualites", "/agenda", "/portefeuille", "/lexique", ...INDEX.flatMap(c => ["/entreprise/" + c.id, "/entreprise/" + c.id + "/comptes"])];
writeFileSync("cf/site/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${ORIGIN}${p}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("cf/site/robots.txt", `User-agent: *\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
execSync("npx --yes esbuild@0.24.0 cf/src/worker.mjs --bundle --format=esm --minify-syntax --outfile=cf/site/_worker.js", { stdio: "inherit" });
console.log(paths.length, "pages dans le sitemap");
