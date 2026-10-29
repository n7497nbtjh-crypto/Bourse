// Sonde du chantier « analyse » : collecte Wikidata + taux BCE, puis vérification des liens des sources citées.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const dir = process.env.SORTIE || "data/sonde/out/analyse";
fs.mkdirSync(dir, { recursive: true });
if (!process.env.LIENS_SEULS) { try { execFileSync("node", ["data/facteurs.mjs", dir + "/facteurs.json"], { stdio: "inherit" }); } catch (e) { console.error("collecte : échec", String(e).slice(0, 200)); } }
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const L = JSON.parse(fs.readFileSync("data/sonde/analyse_liens.json", "utf8")), out = {};
for (const [k, urls] of Object.entries(L)) {
  out[k] = [];
  for (const u of urls) {
    let st = null, titre = "", fin = u;
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5", "Accept-Language": "fr,en;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
      st = r.status; fin = r.url;
      const t = (r.headers.get("content-type") || "").includes("html") ? (await r.text()).slice(0, 60000) : "";
      titre = ((t.match(/<title[^>]*>([^<]{0,200})/i) || [])[1] || "").replace(/\s+/g, " ").trim();
    } catch (e) { st = "erreur " + String(e).slice(0, 80); }
    out[k].push({ u, st, fin, titre });
    console.log(k, st, u.slice(0, 90), "→", titre.slice(0, 60));
    await new Promise(r => setTimeout(r, 400));
  }
}
fs.writeFileSync(dir + "/liens.json", JSON.stringify(out, null, 1));
