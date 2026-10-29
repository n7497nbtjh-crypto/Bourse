// Sonde de l'agent « actu » : accessibilité des sources d'annonces officielles et de presse depuis GitHub Actions.
// Rien n'est publié : les réponses brutes sont rendues en artefact pour vérifier formats, volumes et conditions.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.SORTIE || "data/sonde/out/actu";
mkdirSync(OUT, { recursive: true });
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
async function get(name, url, opt = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opt, headers: { "user-agent": UA, accept: "*/*", ...(opt.headers || {}) }, signal: AbortSignal.timeout(40000) });
    const t = await r.text();
    writeFileSync(`${OUT}/${name}.txt`, `${r.status} ${url}\n${[...r.headers].map(h => h.join(": ")).join("\n")}\n\n${t}`);
    log.push(`${name}\t${r.status}\t${t.length}\t${Date.now() - t0}ms\t${url}`);
    return t;
  } catch (e) { log.push(`${name}\tERR\t${e.message}\t${url}`); return ""; }
}
const GNW = n => `https://www.globenewswire.com/RssFeed/${n}`;
const L = [
  ["amf", "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records?limit=100&order_by=uin_dat_amf%20desc"],
  ["sec_current", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&count=100&output=atom"],
  ["gnw_fr", GNW("country/France/feedTitle/GlobeNewswire%20-%20News%20from%20France")],
  ["gnw_dk", GNW("country/Denmark/feedTitle/GlobeNewswire%20-%20News%20from%20Denmark")],
  ["gnw_eu_reg", GNW("subjectcode/85-European%20Regulatory%20News/feedTitle/GlobeNewswire%20-%20European%20Regulatory%20News")],
  ["nasdaq_nordic", "https://api.news.eu.nasdaq.com/news/query.action?type=json&showAttachments=false&showCnsSpecific=true&showCompany=true&countResults=true&globalGroup=exchangeNotice&globalName=NordicAllMarkets&displayLanguage=en&timeZone=CET&dateMask=yyyy-MM-dd+HH%3Amm%3Ass&limit=200&start=0&dir=DESC"],
  ["oslo", `https://api3.oslo.oslobors.no/v1/newsreader/list?category=&issuer=&fromDate=${new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)}&toDate=${new Date().toISOString().slice(0, 10)}&market=&messageTitle=`],
  ["cnmv_oir", "https://www.cnmv.es/Portal/Otra-Informacion-Relevante/AlDia-OIR.aspx?lang=en"],
  ["cnmv_ip", "https://www.cnmv.es/Portal/Informacion-Privilegiada/AlDia-IP.aspx?lang=en"],
  ["cnmv_robots", "https://www.cnmv.es/robots.txt"],
  ["actusnews_rss", "https://www.actusnews.com/fr/rss"],
  ["actusnews_robots", "https://www.actusnews.com/robots.txt"],
  ["bbc_business", "https://feeds.bbci.co.uk/news/business/rss.xml"],
  ["cision_fr", "https://news.cision.com/fr/ListItems?format=rss"],
  ["bw_home", "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEF9YXA=="],
];
for (const [n, u] of L) { await get(n, u); await sleep(400); }
await get("nsm", "https://api.data.fca.org.uk/search?index=nsm-search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: 0, size: 200, sortorder: "desc", sort: "submitted_date", criteriaObj: null }) });
// GDELT : une requête groupée (plusieurs noms) toutes les 6 secondes
const groups = [["TotalEnergies", "LVMH", "Sanofi", "Airbus", "Schneider Electric", "Air Liquide", "BNP Paribas", "L'Oréal", "Hermès", "Safran"],
  ["Nvidia", "Microsoft", "Apple", "Novo Nordisk", "ASML", "Siemens", "SAP", "Nestlé", "Shell", "AstraZeneca"]];
for (const [i, g] of groups.entries()) {
  await sleep(6500);
  const u = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  u.searchParams.set("query", `(${g.map(x => `"${x}"`).join(" OR ")}) (sourcelang:french OR sourcelang:english)`);
  u.searchParams.set("mode", "artlist"); u.searchParams.set("format", "json"); u.searchParams.set("maxrecords", "250"); u.searchParams.set("timespan", "2d"); u.searchParams.set("sort", "datedesc");
  await get("gdelt_" + i, u.toString());
}
writeFileSync(`${OUT}/_log.txt`, log.join("\n"));
console.log(log.join("\n"));
