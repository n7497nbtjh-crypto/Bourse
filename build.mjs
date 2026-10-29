// Construit le site : données de démo, sitemap, Worker.
// Usage : node build.mjs [https://adresse-du-site]
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const ORIGIN = process.argv[2] || process.env.SITE_ORIGIN || "https://repere-bourse.pages.dev"; // domaine propre : définir SITE_ORIGIN
import { copyFileSync, existsSync, readFileSync, writeFileSync as wfs } from "node:fs";
{ // Agenda : dates officielles relevées sur les calendriers des entreprises (data/agenda.json et data/agenda/*.mjs)
  const base = JSON.parse((await import("node:fs")).readFileSync("data/agenda.json", "utf8"));
  let ev = [...base.events];
  for (const f of ["france", "europe", "us"]) if (existsSync(`data/agenda/${f}.mjs`)) ev.push(...(await import(`./data/agenda/${f}.mjs`)).default);
  const seen = new Set(); ev = ev.filter(e => e && e.id && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && !seen.has(e.id + e.date + e.type) && seen.add(e.id + e.date + e.type));
  wfs("cf/site/data/agenda.json", JSON.stringify({ note: base.note, events: ev })); }
if (existsSync("data/segments-fr.json")) copyFileSync("data/segments-fr.json", "cf/site/data/segments-fr.json");
{ const { gfParts, INDICES } = await import("./data/gf.mjs"); const UNI = (await import("./data/univers.mjs")).default; const EL = existsSync("data/etf.mjs") ? (await import("./data/etf.mjs")).default : [];
  // gf.csv : feuille Google actuelle (entreprises qui y avaient déjà un cours en premier) ; gf2.csv : seconde feuille pour le reste
  const known = existsSync("cf/site/data/cours.json") ? JSON.parse(readFileSync("cf/site/data/cours.json", "utf8")).items || {} : {};
  const [g1, g2] = gfParts(UNI, EL, INDICES, known); wfs("cf/site/data/gf.csv", g1); wfs("cf/site/data/gf2.csv", g2); }
for (const f of ["parcours", "commencer", "legal", "academie"]) if (existsSync(`data/${f}.json`)) wfs(`cf/site/data/${f}.json`, readFileSync(`data/${f}.json`, "utf8"));
if (existsSync("data/concurrents.json")) wfs("cf/site/data/concurrents.json", readFileSync("data/concurrents.json", "utf8"));
{ const R = {}; for (const f of ["france", "europe", "us"]) if (existsSync(`data/repartitions/${f}.mjs`)) Object.assign(R, (await import(`./data/repartitions/${f}.mjs`)).default); wfs("cf/site/data/repartitions.json", JSON.stringify(R)); }
{ const E = existsSync("data/etf.mjs") ? (await import("./data/etf.mjs")).default : []; wfs("cf/site/data/etf.json", JSON.stringify({ updated: "2026-10-28", list: E })); }
{ const { default: U, REGIONS } = await import("./data/univers.mjs"); const { default: F } = await import("./data/fiches.mjs"); const { default: C, SOURCES_COURTIERS } = await import("./data/courtiers.mjs");
  writeFileSync("cf/site/data/univers.json", JSON.stringify({ regions: REGIONS, companies: U.map(({ id, name, ticker, domain, desc, sector, isin, tv, region, fiche, sec }) => ({ id, name, ticker, domain, desc, sector, isin, tv, region, sec, fiche: F[id] || fiche || null })) }));
  writeFileSync("cf/site/data/courtiers.json", JSON.stringify({ updated: "2026-10-28", sources: SOURCES_COURTIERS, list: C.map(c => ({ ...c, grille: c.grille.map(g => [g[0] === Infinity ? null : g[0], g[1], g[2]]) })) }));
  const miss = U.filter(c => !F[c.id] && !c.fiche).map(c => c.id); if (miss.length) { console.log("fiches manquantes :", miss.join(", ")); process.exit(1); } }
const { default: INDEX } = await import("./data/univers.mjs");
const paths = ["/", ...["cac40", "stoxx50", "dax", "sp500", "nasdaq100", "ftse100", "nikkei"].map(i => "/indice/" + i), "/entreprises", "/simulateurs", "/simulateurs/epargne", "/simulateurs/frais", "/simulateurs/pea-cto", "/actualites", "/agenda", "/portefeuille", "/lexique", "/etf", "/communaute", "/pea-cto", "/comparer", "/dividendes", "/outils", "/marches", "/outils/si-javais", "/outils/recouvrement", "/outils/verifier", "/debuter", "/commencer", "/demander", "/espace", "/premium", "/methode", "/academie", ...(existsSync("data/academie.json") ? JSON.parse(readFileSync("data/academie.json", "utf8")).modules.flatMap(m => ["/academie/" + m.id, ...m.lecons.map(l => "/academie/" + m.id + "/" + l.id)]) : []), "/mentions-legales", "/cgv", "/confidentialite", "/avertissement", ...JSON.parse(readFileSync("data/parcours.json", "utf8")).niveaux.flatMap(n => ["/debuter/" + n.id, ...n.lecons.map(l => "/debuter/" + n.id + "/" + l.id)]), ...(existsSync("data/etf.mjs") ? (await import("./data/etf.mjs")).default.map(e => "/etf/" + e.id) : []), ...INDEX.flatMap(c => ["/entreprise/" + c.id, "/entreprise/" + c.id + "/comptes", "/entreprise/" + c.id + "/comprendre/argent"])];
writeFileSync("cf/site/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${ORIGIN}${p}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("cf/site/robots.txt", `User-agent: *\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
{ const { default: U, SECTEURS } = await import("./data/univers.mjs");
  wfs("cf/src/index.gen.mjs", "// Fichier fabriqué par build.mjs : la liste minimale des entreprises pour le Worker.\nexport const SECTEURS = " + JSON.stringify(SECTEURS) + ";\nexport default " + JSON.stringify(U.map(({ id, name, sector, desc, region, isin }) => ({ id, name, sector, desc, region, isin }))) + ";\n"); }
{ // consignes des modèles, partagées avec l'IA qui tourne dans le navigateur des visiteurs
  const ia = await import("./cf/src/ia.mjs"), dm = await import("./cf/src/demande.mjs");
  wfs("cf/site/data/prompts.json", JSON.stringify({ demande: dm.SYS, expliquer: dm.SYS_EXPL, assistant: ia.SYS_ASSIST, veille: ia.SYS_VEILLE, portefeuille: ia.SYS_PF, comparaison: ia.SYS_CMP }));
}
// Version du site : empreinte des fichiers servis (hors données). Le service worker (cf/site/sw.js) la lit dans l'en-tête
// x-bilan-version des pages et vide son cache dès qu'elle change : jamais un ancien script avec une nouvelle page.
const VERSION_SITE = await (async () => { const { createHash } = await import("node:crypto"), { readdirSync, statSync } = await import("node:fs"), h = createHash("sha256"), sauf = new Set(["cf/site/data", "cf/site/_worker.js", "cf/site/sitemap.xml", "cf/site/robots.txt"]);
  const walk = d => readdirSync(d).sort().forEach(f => { const p = d + "/" + f; if (sauf.has(p)) return; if (statSync(p).isDirectory()) walk(p); else h.update(p + "\0").update(readFileSync(p)); });
  walk("cf/site"); return h.digest("hex").slice(0, 16); })();
execSync(`npx --yes esbuild@0.24.0 cf/src/worker.mjs --bundle --format=esm --minify-syntax --define:BILAN_VERSION='"${VERSION_SITE}"' --outfile=cf/site/_worker.js`, { stdio: "inherit" });
console.log(paths.length, "pages dans le sitemap");
