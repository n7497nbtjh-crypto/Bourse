// Sonde n° 4 du chantier « communication » : taux de change dollar / mark (avant l'euro).
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.SORTIE || "data/sonde/out/communication4";
mkdirSync(OUT, { recursive: true });
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const U = {
  fred_exgeus: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=EXGEUS",
  fred_aexgeus: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=AEXGEUS",
  fred_dexgeus_txt: "https://fred.stlouisfed.org/data/DEXGEUS.txt",
  ecb_ecu_m: "https://data-api.ecb.europa.eu/service/data/EXR/M.USD.ECU.SP00.E?format=csvdata",
  ecb_ecu_a: "https://data-api.ecb.europa.eu/service/data/EXR/A.USD.ECU.SP00.E?format=csvdata",
  bbk_dem: "https://api.statistiken.bundesbank.de/rest/data/BBEX3/M.USD.DEM.BB.AC.A04?format=csv&lang=en",
  bbk_dem2: "https://api.statistiken.bundesbank.de/rest/data/BBEX3/M.DEM.USD.BB.AC.A04?format=csv&lang=en",
};
for (const [k, u] of Object.entries(U)) {
  try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(40000) }); const t = await r.text(); writeFileSync(`${OUT}/${k}.txt`, `${r.status}\n` + t.slice(0, 400000)); console.log(k, r.status, t.length); }
  catch (e) { console.log(k, String(e)); }
  await sleep(1200);
}
console.log("fin");
