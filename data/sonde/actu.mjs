// Sonde de l'agent « actu » (2) : fichiers bruts de GDELT (GKG), SEC avec contact, pagination NSM et Nasdaq Nordic.
// Rien n'est publié : les réponses brutes sont rendues en artefact pour vérifier formats et volumes.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const OUT = process.env.SORTIE || "data/sonde/out/actu";
mkdirSync(OUT, { recursive: true });
const UA = `bilan-site ${process.env.CONTACT || "contact via GitHub n7497nbtjh-crypto/Bourse"}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
async function get(name, url, opt = {}, keep = 400000) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opt, headers: { "user-agent": UA, accept: "*/*", ...(opt.headers || {}) }, signal: AbortSignal.timeout(60000) });
    const buf = Buffer.from(await r.arrayBuffer());
    if (name) writeFileSync(`${OUT}/${name}.txt`, `${r.status} ${url}\n\n` + buf.subarray(0, keep).toString("utf8"));
    log.push(`${name}\t${r.status}\t${buf.length}\t${Date.now() - t0}ms\t${url}`);
    return { status: r.status, buf };
  } catch (e) { log.push(`${name}\tERR\t${e.message}\t${url}`); return { status: 0, buf: Buffer.alloc(0) }; }
}
// 1. GDELT GKG : dernier fichier, taille, titres de pages et organisations
const lu = (await get("gdelt_last", "http://data.gdeltproject.org/gdeltv2/lastupdate.txt")).buf.toString();
const gkgUrl = (lu.match(/(http\S+gkg\.csv\.zip)/) || [])[1];
if (gkgUrl) {
  const z = await get("", gkgUrl);
  writeFileSync("/tmp/g.zip", z.buf); execSync("cd /tmp && unzip -o -q g.zip");
  const f = execSync("ls /tmp/*.gkg.csv").toString().trim().split("\n")[0];
  const rows = readFileSync(f, "latin1").split("\n").filter(Boolean);
  const titled = rows.map(r => r.split("\t")).filter(c => /<PAGE_TITLE>/.test(c[26] || ""));
  const sample = titled.slice(0, 40).map(c => ({ date: c[1], src: c[3], url: c[4], orgs: (c[14] || "").slice(0, 200), orgs2: (c[13] || "").slice(0, 200), title: ((c[26] || "").match(/<PAGE_TITLE>(.*?)<\/PAGE_TITLE>/) || [])[1] }));
  writeFileSync(`${OUT}/gdelt_gkg.json`, JSON.stringify({ zip: z.buf.length, rows: rows.length, titled: titled.length, sample }, null, 1));
}
const lt = (await get("gdelt_last_tr", "http://data.gdeltproject.org/gdeltv2/lastupdate-translation.txt")).buf.toString();
const gkgT = (lt.match(/(http\S+gkg\.csv\.zip)/) || [])[1];
if (gkgT) { const z = await get("", gkgT); log.push("translation gkg zip " + z.buf.length); }
// 2. SEC avec contact
await get("sec_sub", "https://data.sec.gov/submissions/CIK0000320193.json", {}, 3000);
// 3. NSM : page 2 et filtre par date
const day = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
await get("nsm_p2", "https://api.data.fca.org.uk/search?index=nsm-search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: 200, size: 200, sortorder: "desc", sort: "submitted_date", criteriaObj: null }) }, 3000);
await get("nsm_date", "https://api.data.fca.org.uk/search?index=nsm-search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: 0, size: 5, sortorder: "desc", sort: "submitted_date", criteriaObj: { criteria: [{ name: "latest_flag", value: "Y" }], dateCriteria: [{ name: "submitted_date", value: { from: day + "T00:00:00Z", to: day + "T23:59:59Z" } }] } }) }, 6000);
// 4. Nasdaq Nordic : décalage et plage de dates
await get("nasdaq_p", `https://api.news.eu.nasdaq.com/news/query.action?type=json&showAttachments=false&showCnsSpecific=true&showCompany=true&countResults=true&globalGroup=exchangeNotice&globalName=NordicAllMarkets&displayLanguage=en&timeZone=CET&dateMask=yyyy-MM-dd+HH%3Amm%3Ass&limit=500&start=500&dir=DESC&fromDate=${day}`, {}, 4000);
// 5. Cision par langue et Business Wire (structure des éléments)
for (const l of ["fr", "fi", "dk", "no", "de"]) { await get("cision_" + l, `https://news.cision.com/${l}/ListItems?format=rss`, {}, 6000); await sleep(500); }
await get("bw", "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEF9YXA==", {}, 5000);
await get("emarket", "https://www.emarketstorage.it/en", {}, 3000);
writeFileSync(`${OUT}/_log.txt`, log.join("\n"));
console.log(log.join("\n"));
