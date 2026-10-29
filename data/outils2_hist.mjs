// Séries de référence pour « Et si j'avais investi ? » et le simulateur (module cf/site/m/outils2.js) :
//  - Insee, indice des prix à la consommation, ensemble des ménages, France base 2025 (série 011814630, rétropolée par l'Insee), valeurs mensuelles ;
//  - Banque centrale européenne, taux de change de référence, moyenne mensuelle (unités de devise pour 1 euro).
// Sources ouvertes (licence ouverte Etalab pour l'Insee ; réutilisation libre avec mention de la source pour la BCE).
// Résultat : cf/site/data/hist-ref.json. Lancé par .github/workflows/outils2.yml (une fois par semaine).
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const UA = { "user-agent": "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)" };
const OUT = new URL("../cf/site/data/hist-ref.json", import.meta.url);
const DEVISES = ["USD", "GBP", "CHF", "JPY", "SEK", "DKK", "NOK", "CAD", "AUD", "HKD", "CNY", "KRW", "INR", "BRL", "MXN", "PLN", "SGD", "TWD", "ZAR", "ILS"];
const debut = new Date(Date.UTC(new Date().getUTCFullYear() - 7, 0, 1)).toISOString().slice(0, 7);

// Lecture des observations d'une réponse SDMX (XML générique ou structure-specific) : TIME_PERIOD et OBS_VALUE
export function obsSdmx(xml) {
  const out = {};
  for (const m of String(xml).matchAll(/<(?:\w+:)?Obs\b[^>]*>/g)) {
    const t = (m[0].match(/TIME_PERIOD="([^"]+)"/) || [])[1], v = (m[0].match(/OBS_VALUE="([^"]+)"/) || [])[1];
    if (t && v != null && isFinite(+v)) out[t] = +v;
  }
  return out;
}
// CSV de la BCE (format=csvdata) : { "2021-10": { USD: 1.16, … } }
export function fxCsv(txt) {
  const lines = String(txt).trim().split(/\r?\n/), head = lines.shift().split(",");
  const ic = head.indexOf("CURRENCY"), it = head.indexOf("TIME_PERIOD"), iv = head.indexOf("OBS_VALUE"), out = {};
  for (const l of lines) { const c = l.split(","); const v = parseFloat(c[iv]); if (!(v > 0)) continue; (out[c[it]] = out[c[it]] || {})[c[ic]] = v; }
  return out;
}

async function main() {
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const res = { maj: new Date().toISOString().slice(0, 10) };
  try {
    const r = await fetch(`https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/011814630?startPeriod=${debut}`, { headers: UA });
    const mois = obsSdmx(await r.text());
    if (Object.keys(mois).length < 24) throw new Error("trop peu de valeurs : " + Object.keys(mois).length);
    res.ipc = { source: "Insee, indice des prix à la consommation, ensemble des ménages, France, base 2025, séries rétropolées (série 011814630)", url: "https://www.insee.fr/fr/statistiques/serie/011814630", mois };
  } catch (e) { console.log("::warning::Insee non lu :", e.message); if (prev.ipc) res.ipc = prev.ipc; }
  try {
    const r = await fetch(`https://data-api.ecb.europa.eu/service/data/EXR/M.${DEVISES.join("+")}.EUR.SP00.A?startPeriod=${debut}&format=csvdata`, { headers: UA });
    const mois = fxCsv(await r.text());
    if (Object.keys(mois).length < 24) throw new Error("trop peu de mois : " + Object.keys(mois).length);
    res.fx = { source: "Banque centrale européenne, taux de change de référence de l'euro, moyenne mensuelle (unités de devise pour 1 €)", url: "https://data.ecb.europa.eu/data/datasets/EXR", mois };
  } catch (e) { console.log("::warning::BCE non lue :", e.message); if (prev.fx) res.fx = prev.fx; }
  // Livret A : taux officiels et dates d'effet (arrêtés publiés au Journal officiel), relevés à la main.
  res.livretA = { source: "Taux officiels du Livret A et dates d'effet (Service-public.gouv.fr ; historique Selectra)", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2365",
    taux: [["2020-02-01", 0.5], ["2022-02-01", 1], ["2022-08-01", 2], ["2023-02-01", 3], ["2025-02-01", 2.4], ["2025-08-01", 1.7], ["2026-02-01", 1.5], ["2026-08-01", 1.7]] };
  writeFileSync(OUT, JSON.stringify(res));
  console.log("ipc", Object.keys(res.ipc?.mois || {}).length, "mois ; fx", Object.keys(res.fx?.mois || {}).length, "mois");
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
