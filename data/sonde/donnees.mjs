// Sonde du chantier « calculs et données » (29/10/2026).
// 1. Vérifie que la lecture des deux taxonomies d'un dépôt SEC (us-gaap + ifrs-full) rattrape les sociétés
//    bloquées sur un vieil exercice (Honda 2014, Itaú 2010, Toyota 2020, Sony 2021…).
// 2. Relève les chiffres clés de trois sociétés connues, pour contrôler les formules à la main.
// 3. Cherche la cause de l'absence de rapport ESEF pour l'Allemagne et la Pologne sur filings.xbrl.org.
// 4. Teste la recherche d'identifiant LEI pour quelques ISIN qui échouent.
import { writeFileSync, mkdirSync } from "node:fs";
import { extractSec, factsUrl } from "../sec.mjs";
import { toSeries } from "../esef.mjs";
import { getJSON, UA, filingsFor, leiFromIsin, VERIF } from "../fetch_data.mjs";

const OUT = process.env.SORTIE || "data/sonde/out/donnees";
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
console.log("en-tête utilisé :", UA);

// Mêmes conditions que la collecte du site (en-tête, reprises, limites de débit)
async function get(url, accept = "application/json") {
  try { return await getJSON(fetch, url, accept); }
  catch (e) { console.log("échec", url.slice(0, 90), e.message); return null; }
}

// Ce que l'ancien code aurait choisi : une seule taxonomie, celle qui a le plus d'étiquettes
const ancienChoix = facts => (!facts["us-gaap"] || Object.keys(facts["ifrs-full"] || {}).length > Object.keys(facts["us-gaap"] || {}).length) ? "ifrs-full" : "us-gaap";

const SEC = [
  ["honda", "0000715153"], ["toyota", "0001094517"], ["sony", "0000313838"], ["itau-unibanco", "0001132597"],
  ["agnico-eagle", "0000002809"], ["gold-fields", "0001172724"], ["himax", "0001421000"], ["diageo", "0000835403"],
  ["turkcell", "0001071321"], ["ypf", "0000904851"], ["centerra-gold", "0001267130"], ["constellium", "0001563411"],
  // trois sociétés connues, pour contrôler les formules à la main
  ["apple", "0000320193"], ["microsoft", "0000789019"], ["coca-cola", "0000021344"],
];

const res = { sec: {}, xbrl: {}, gleif: {} };
for (const [id, cik] of SEC) {
  const doc = await get(factsUrl(cik));
  if (!doc) { res.sec[id] = { erreur: "companyfacts introuvable" }; continue; }
  const facts = doc.facts || {};
  const ns = {};
  for (const n of ["us-gaap", "ifrs-full"]) if (facts[n]) ns[n] = Object.keys(facts[n]).length;
  const s = toSeries(extractSec(doc));
  res.sec[id] = {
    cik, entite: doc.entityName, taxonomies: ns, ancienChoix: ancienChoix(facts),
    nouveau: { annees: s.years, devise: s.currency, fyEnd: s.fyEnd, tags: s.tags || null },
    derniers: s.years.slice(-3).map((y, i) => {
      const k = s.years.length - Math.min(3, s.years.length) + i;
      const a = f => (s.fin[f] ? s.fin[f][k] : null);
      return { annee: y, ca: a("ca"), ebit: a("ebit"), net: a("net"), eps: a("eps"), dps: a("dps"), dpsEst: a("dpsEst"), equity: a("equity"), cash: a("cash"), debt: a("debt"), netDebt: a("netDebt"), netDebtBaux: a("netDebtBaux"), leases: a("leases"), ebitda: a("ebitda"), cfo: a("cfo"), capex: a("capex"), fcf: a("fcf"), divPaid: a("divPaid"), tax: a("tax"), pretax: a("pretax") };
    }),
  };
  console.log(id, "taxonomies", JSON.stringify(ns), "ancien choix", ancienChoix(facts), "-> annees", JSON.stringify(s.years));
  await sleep(700);
}

// filings.xbrl.org : y a-t-il des dépôts pour l'Allemagne et la Pologne, et jusqu'à quand ?
// On passe par la fonction de la collecte elle-même, pour être dans les mêmes conditions.
for (const [pays, lei, nom] of [["DE", "529900D6BF99LW9R2E68", "SAP"], ["DE", "529900K9B0N5BT694847", "Allianz"], ["PL", "P4GTT6GF1W40LGUY8U04", "PKO BP"], ["PL", "259400MMKZ6P76PRPJ27", "Orlen"], ["FR", "969500P7OWJ1JYDHO762", "LVMH (témoin)"]]) {
  let fl = [];
  try { fl = await filingsFor(fetch, lei, 8); } catch (e) { console.log("échec filings", nom, e.message); }
  res.xbrl[nom] = { pays, lei, nb: fl.length, periodes: fl.map(f => [f.period_end, !!f.json]) };
  console.log("xbrl", nom, JSON.stringify(res.xbrl[nom]));
  await sleep(1500);
}
// Nombre total de dépôts indexés par pays (dernier exercice)
for (const pays of ["DE", "PL", "FR", "IT", "ES", "BE"]) {
  const filter = encodeURIComponent(JSON.stringify([{ name: "country", op: "eq", val: pays }]));
  const j = await get(`https://filings.xbrl.org/api/filings?filter=${filter}&sort=-period_end&page[size]=5`, "application/vnd.api+json");
  res.xbrl["pays:" + pays] = { nb: ((j && j.data) || []).length, dernieres: ((j && j.data) || []).map(f => f.attributes?.period_end) };
  console.log("pays", pays, JSON.stringify(res.xbrl["pays:" + pays]));
  await sleep(1200);
}

// GLEIF : les ISIN européens qui n'ont pas trouvé d'identifiant LEI (les sociétés asiatiques
// n'ont de toute façon pas de rapport ESEF). On vérifie le nouveau repli par recherche approchée,
// puis on regarde si filings.xbrl.org a un rapport pour l'identifiant trouvé.
for (const [nom, isin] of [["Campari", "NL0015435975"], ["Nokian Tyres", "FI0009005318"], ["B&M European Value Retail", "LU1072616219"],
  ["Bank of Åland", "FI0009000103"], ["Raisio Group", "FI0009002943"], ["Atria-yhtymä", "FI0009006548"], ["Cementir", "NL0013995087"]]) {
  let id = null;
  try { id = await leiFromIsin(fetch, isin, nom); } catch (e) { console.log("échec gleif", nom, e.message); }
  let fl = [];
  if (id) { try { fl = await filingsFor(fetch, id.lei, 4); } catch (e) { } }
  res.gleif[nom] = { isin, lei: id ? id.lei : null, legalName: id ? id.legalName : null, rapports: fl.map(f => f.period_end) };
  console.log("gleif", nom, JSON.stringify(res.gleif[nom]));
  await sleep(1500);
}
res.verif = VERIF;

// Pourquoi certaines sociétés restent bloquées sur un exercice ancien : on regarde les dates de fin
// et les formulaires réellement présents dans companyfacts, devise par devise.
res.brut = {};
for (const [id, cik] of [["diageo", "0000835403"], ["turkcell", "0001071321"], ["ypf", "0000904851"], ["gravity", "0001313310"]]) {
  const doc = await get(factsUrl(cik));
  if (!doc) { res.brut[id] = { erreur: "introuvable" }; continue; }
  const o = { entite: doc.entityName, concepts: {} };
  for (const ns of ["us-gaap", "ifrs-full"]) {
    const g = (doc.facts || {})[ns]; if (!g) continue;
    for (const c of ["Revenue", "Revenues", "RevenueFromContractsWithCustomers", "ProfitLoss", "NetIncomeLoss", "ProfitLossAttributableToOwnersOfParent"]) {
      const u = (g[c] || {}).units; if (!u) continue;
      o.concepts[ns + ":" + c] = Object.fromEntries(Object.entries(u).map(([dev, rows]) => {
        const l = rows.filter(r => r.start && (new Date(r.end) - new Date(r.start)) / 864e5 > 330);
        const der = l.sort((a, b) => String(a.end).localeCompare(String(b.end))).slice(-3);
        return [dev, { n: l.length, derniers: der.map(r => [r.end, r.form, r.val]) }];
      }));
    }
  }
  res.brut[id] = o;
  console.log("brut", id, JSON.stringify(o).slice(0, 900));
  await sleep(800);
}

writeFileSync(OUT + "/donnees.json", JSON.stringify(res, null, 1));
console.log("fini");
