// Sonde (5/11/2026) : où Invesco, Xtrackers (DWS) et HSBC publient-ils la valeur liquidative du jour de leurs ETF ?
// Écrit chaque réponse brute dans le dossier de sortie, pour examen hors ligne.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2] || process.env.SORTIE || "data/sonde/out/vl-emetteurs"; mkdirSync(OUT, { recursive: true });
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ess = async (nom, url, headers = {}) => {
  try { const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json, text/html;q=0.9, */*;q=0.8", ...headers }, signal: AbortSignal.timeout(60000) });
    const t = await r.text(); writeFileSync(`${OUT}/${nom}.txt`, `${r.status} ${url}\n${t.slice(0, 400000)}`); console.log(nom, r.status, t.length); }
  catch (e) { writeFileSync(`${OUT}/${nom}.txt`, `ERREUR ${url}\n${e.message}`); console.log(nom, "erreur", e.message); }
  await sleep(1500);
};
const IV = "https://dng-api.invesco.com/cache/v1/accounts/fr_FR/shareclasses/IE0032077012";
await ess("iv-base", IV + "?idType=isin");
await ess("iv-prices", IV + "/prices?idType=isin");
await ess("iv-nav", IV + "/nav?idType=isin");
await ess("iv-keystats", IV + "/keyStats?idType=isin&productCode=ETF&bondType=NotCallable");
await ess("iv-perf", IV + "/performance?idType=isin");
await ess("iv-liste", "https://dng-api.invesco.com/cache/v1/accounts/fr_FR/shareclasses?idType=isin&productType=ETF");
await ess("iv-robots", "https://dng-api.invesco.com/robots.txt");
// Xtrackers (DWS)
await ess("xt-robots", "https://etf.dws.com/robots.txt");
await ess("xt-page", "https://etf.dws.com/fr-fr/IE00BJ0KDR00/");
await ess("xt-api", "https://etf.dws.com/api/pdp/fr-fr/etf/IE00BJ0KDR00");
await ess("xt-sitemap", "https://etf.dws.com/sitemap.xml");
// HSBC
await ess("hs-robots", "https://www.assetmanagement.hsbc.co.uk/robots.txt");
await ess("hs-page", "https://www.assetmanagement.hsbc.co.uk/en/individual-investor/funds/ie000mwuqbj0");
await ess("hs-fr", "https://www.assetmanagement.hsbc.fr/fr/investisseurs-particuliers/fund-centre");
await ess("hs-api", "https://www.assetmanagement.hsbc.co.uk/api/v1/nav/ie000mwuqbj0");
