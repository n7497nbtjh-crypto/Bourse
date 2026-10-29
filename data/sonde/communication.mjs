// Sonde du chantier « communication » : disponibilité de noms (RDAP), comptes sociaux, séries historiques publiques.
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.SORTIE || "data/sonde/out/communication";
mkdirSync(OUT, { recursive: true });
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, opt = {}) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": opt.accept || "*/*", ...(opt.headers || {}) }, redirect: opt.redirect || "follow", signal: AbortSignal.timeout(25000) });
    const t = await r.text();
    return { status: r.status, url: r.url, text: t };
  } catch (e) { return { status: 0, err: String(e), text: "" }; }
}
const save = (n, d) => writeFileSync(`${OUT}/${n}`, typeof d === "string" ? d : JSON.stringify(d, null, 1));

// 1) Séries publiques
const series = {
  msci_eur_net: "https://app2.msci.com/products/service/index/indexmaster/getLevelDataForGraph?currency_symbol=EUR&index_variant=NETR&start_date=19691231&end_date=20261028&data_frequency=END_OF_MONTH&index_codes=990100",
  msci_usd_gross: "https://app2.msci.com/products/service/index/indexmaster/getLevelDataForGraph?currency_symbol=USD&index_variant=GRTR&start_date=19691231&end_date=20261028&data_frequency=END_OF_MONTH&index_codes=990100",
  msci_usd_net: "https://app2.msci.com/products/service/index/indexmaster/getLevelDataForGraph?currency_symbol=USD&index_variant=NETR&start_date=19691231&end_date=20261028&data_frequency=END_OF_MONTH&index_codes=990100",
  msci_eur_gross: "https://app2.msci.com/products/service/index/indexmaster/getLevelDataForGraph?currency_symbol=EUR&index_variant=GRTR&start_date=19691231&end_date=20261028&data_frequency=END_OF_MONTH&index_codes=990100",
  insee_ipc_001763852: "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001763852",
  insee_ipc_001759970: "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001759970",
  wb_infl_fra: "https://api.worldbank.org/v2/country/FRA/indicator/FP.CPI.TOTL.ZG?format=json&per_page=100",
  wiki_livret_a: "https://fr.wikipedia.org/w/api.php?action=parse&page=Livret_A&prop=wikitext&format=json",
  sp_livret_a: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2365",
  bdf_taux_regl: "https://www.banque-france.fr/fr/statistiques/taux-et-cours/taux-reglementes-epargne",
  msci_factsheet_usd: "https://www.msci.com/documents/10199/178e6643-6ae6-47b9-82be-e1fc565ededb",
};
for (const [k, u] of Object.entries(series)) {
  const r = await get(u);
  save(`serie_${k}.txt`, `${r.status} ${r.url || ""} ${r.err || ""}\n` + r.text.slice(0, 3_000_000));
  console.log("serie", k, r.status, r.text.length, r.err || "");
  await sleep(800);
}
// Fiche MSCI en PDF : texte via pdfjs si disponible
try {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const r = await fetch(series.msci_factsheet_usd, { headers: { "User-Agent": UA } }); const buf = new Uint8Array(await r.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: buf }).promise; let txt = "";
  for (let i = 1; i <= doc.numPages; i++) { const p = await doc.getPage(i); const c = await p.getTextContent(); txt += c.items.map(x => x.str).join(" ") + "\n\n"; }
  save("factsheet_usd.txt", txt); console.log("factsheet", txt.length);
} catch (e) { console.log("pdf", String(e)); }

// 2) Domaines (RDAP)
const NOMS = ["bilan", "bilan-bourse", "bilanbourse", "lebilan", "monbilan", "bilans", "bilan-invest", "bilaninvest", "repere", "repere-bourse", "reperebourse", "mediane", "lamediane", "mediane-bourse", "medianebourse", "comptesclairs", "comptes-clairs", "compteclair", "bourselisible", "bourse-lisible", "lisible", "bourseclaire", "bourse-claire", "chiffresclairs", "decrypte-bourse", "fondamental", "fondamentaux", "socle", "prisme-bourse", "lucide", "lucide-bourse", "alappui", "comptesalappui", "verdict-bourse", "verdictbourse", "ratio-bourse", "clairpea", "pea-clair", "boursepourtous", "bourse-pour-tous", "comprendrelabourse", "comprendre-la-bourse", "bourseexpliquee", "bourse-expliquee", "labourseexpliquee", "boussole-bourse", "sobre-bourse", "boursesobre", "chiffre-clair", "bourse-en-clair", "bourseenclair", "enclair", "enclair-bourse", "decode-bourse", "bilanclair", "bilan-clair", "lisibl", "mediano"];
const RDAP = { fr: n => `https://rdap.nic.fr/domain/${n}.fr`, com: n => `https://rdap.verisign.com/com/v1/domain/${n}.com` };
const dom = [];
for (const n of NOMS) for (const [tld, f] of Object.entries(RDAP)) {
  const r = await get(f(n), { accept: "application/rdap+json" });
  let reg = null, ev = null;
  try { const j = JSON.parse(r.text); ev = (j.events || []).map(e => e.eventAction + ":" + (e.eventDate || "").slice(0, 10)).join(","); reg = (j.entities || []).filter(e => (e.roles || []).includes("registrar")).map(e => (e.vcardArray?.[1] || []).find(x => x[0] === "fn")?.[3]).join(";"); } catch (e) { }
  dom.push({ nom: n, tld, status: r.status, enregistre: r.status === 200 ? true : r.status === 404 ? false : null, evenements: ev, registrar: reg });
  console.log("rdap", n + "." + tld, r.status);
  await sleep(700);
}
save("domaines.json", dom);

// 3) Comptes sociaux (indicatif : ces sites ne garantissent pas une réponse fiable sans connexion)
const HANDLES = ["bilan", "bilanbourse", "bilan_bourse", "bilanfr", "bilan_fr", "lebilan", "repere", "reperebourse", "mediane", "medianebourse", "comptesclairs", "bourselisible", "bourseenclair", "enclairbourse", "lisible", "bourseclaire", "bilanclair", "comptesalappui"];
const soc = [];
for (const h of HANDLES) {
  const x = await get(`https://api.x.com/i/users/username_available.json?username=${h}`, { accept: "application/json" });
  const ig = await get(`https://www.instagram.com/${h}/`, { accept: "text/html" });
  const tt = await get(`https://www.tiktok.com/@${h}`, { accept: "text/html" });
  const igTitle = (ig.text.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const igOg = (ig.text.match(/property="og:title" content="([^"]*)"/) || [])[1] || "";
  const ttFound = tt.text.includes(`"uniqueId":"${h}"`), ttNot = /couldn't find this account|Impossible de trouver ce compte|"statusCode":10221/i.test(tt.text);
  soc.push({ handle: h, x: { status: x.status, body: x.text.slice(0, 300) }, instagram: { status: ig.status, title: igTitle.slice(0, 120), og: igOg.slice(0, 120), len: ig.text.length }, tiktok: { status: tt.status, trouve: ttFound, introuvable: ttNot, len: tt.text.length } });
  console.log("social", h, x.status, ig.status, tt.status);
  await sleep(1500);
}
save("social.json", soc);
console.log("fin");
