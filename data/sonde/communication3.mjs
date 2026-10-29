// Sonde n° 3 du chantier « communication » : taux de change de fin d'année (FRED, BCE), comptes X, fiche ESMA/AMF finfluenceurs.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.SORTIE || "data/sonde/out/communication3";
mkdirSync(OUT, { recursive: true });
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const save = (n, d) => writeFileSync(`${OUT}/${n}`, typeof d === "string" ? d : JSON.stringify(d, null, 1));
async function get(u, accept = "*/*") {
  try { const r = await fetch(u, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(40000) }); return { status: r.status, text: await r.text() }; }
  catch (e) { return { status: 0, text: String(e) }; }
}
const PAGES = {
  fred_dexgeus: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXGEUS",
  fred_dexuseu: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXUSEU",
  ecb_usd_eur_m: "https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.E?format=csvdata",
};
for (const [k, u] of Object.entries(PAGES)) { const r = await get(u); save(`${k}.csv`, r.text); console.log(k, r.status, r.text.length); await sleep(1000); }
// Comptes X (point d'entrée public de disponibilité utilisé à l'inscription)
const HANDLES = ["bilanbourse", "bilan_bourse", "bilan_fr", "lebilan", "bilanfinance", "bilan_invest", "bilaninvest", "medianebourse", "bourseclaire", "bourselisible", "bourseenclair", "comptesalappui", "verdictbourse", "boursesobre", "bilanclair", "decodebourse", "prismebourse", "lucidebourse", "repere_bourse", "reperebourse", "bilanpointfr", "bilan_point", "bilanpoint"];
const x = [];
for (const h of HANDLES) { const r = await get(`https://api.x.com/i/users/username_available.json?username=${h}`, "application/json"); x.push({ h, status: r.status, body: r.text.slice(0, 200) }); console.log("x", h, r.status, r.text.slice(0, 80)); await sleep(1500); }
save("x.json", x);
// TikTok (présence de l'identifiant dans la page)
const tt = [];
for (const h of HANDLES) { const r = await get(`https://www.tiktok.com/@${h}`, "text/html"); tt.push({ h, status: r.status, trouve: r.text.includes(`"uniqueId":"${h}"`), len: r.text.length }); await sleep(1500); }
save("tiktok.json", tt);
// Domaines supplémentaires
const NOMS = ["bilanfinance", "bilan-finance", "bilan-point", "bilanpoint", "lebilan-bourse", "bilan-pea", "bilanpea", "monbilanbourse", "bilan-eco", "bilanboursier", "bilan-boursier"];
const dom = [];
for (const n of NOMS) for (const [tld, u] of [["fr", `https://rdap.nic.fr/domain/${n}.fr`], ["com", `https://rdap.verisign.com/com/v1/domain/${n}.com`]]) {
  const r = await get(u, "application/rdap+json"); dom.push({ nom: n, tld, status: r.status, reg: (r.text.match(/"eventAction":"registration","eventDate":"([\d-]+)/) || [])[1] || null }); await sleep(700);
}
// .app et .io via l'annuaire RDAP de l'IANA
const boot = JSON.parse((await get("https://data.iana.org/rdap/dns.json")).text || "{}");
const rdapFor = tld => (boot.services || []).find(s => s[0].includes(tld))?.[1]?.[0];
for (const tld of ["app", "io", "eu"]) {
  const base = rdapFor(tld); if (!base) { console.log("pas de RDAP pour", tld); continue; }
  for (const n of ["bilan", "bilanbourse", "bilan-bourse"]) { const r = await get(`${base.replace(/\/$/, "")}/domain/${n}.${tld}`, "application/rdap+json"); dom.push({ nom: n, tld, status: r.status, reg: (r.text.match(/"eventAction":"registration","eventDate":"([\d-]+)/) || [])[1] || null }); await sleep(700); }
}
save("domaines2.json", dom);
const esma = await fetch("https://esma.europa.eu/sites/default/files/2026-01/FR_France_fr_-_Finfluencers_factsheet.pdf", { headers: { "User-Agent": UA } });
try {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await esma.arrayBuffer()) }).promise; let txt = "";
  for (let i = 1; i <= doc.numPages; i++) { const p = await doc.getPage(i); const c = await p.getTextContent(); txt += c.items.map(x => x.str).join(" ") + "\n\n"; }
  save("esma_finfluenceurs.txt", txt);
} catch (e) { console.log("esma", String(e)); }
console.log("fin");
