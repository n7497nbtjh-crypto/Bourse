// Contrôle de cohérence de toutes les fiches entreprises (cf/site/data/societes/*.json) avant mise en ligne.
// Repère ce qu'un lecteur ne doit jamais voir : devise absente, années en désordre, unité probablement fausse
// (milliers au lieu de millions), bénéfice par action de signe opposé au bénéfice, dette nette incohérente
// avec dette et trésorerie, marges ou croissances aberrantes, exercice ancien non signalé.
//   node tests/t_coherence.mjs            résumé et exemples ; code de sortie 1 si une erreur bloquante
//   node tests/t_coherence.mjs --tout     liste complète
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const VERIFIES = (() => { try { return JSON.parse(readFileSync("data/sauts-verifies.json", "utf8")); } catch (e) { return {}; } })();

const DIR = "cf/site/data/societes", TOUT = process.argv.includes("--tout");
const BANQUES = new Set(["banque", "assurance", "finance", "financier", "immobilier", "immo"]); // « immo » : clé réelle du secteur dans univers-min.json (5e passage)
const E = {}; // code → [ { id, detail } ]
const AVERIFIER = {}; // id → { ca: [années], marge: [années], … } (5e passage, A8)
const note = (code, id, detail) => (E[code] = E[code] || []).push({ id, detail });
const last = a => (Array.isArray(a) ? a.filter(v => v != null).slice(-1)[0] : undefined);
const num = v => typeof v === "number" && isFinite(v);

const FX = (() => { try { return JSON.parse(readFileSync("cf/site/data/fx.json", "utf8")).eur || {}; } catch (e) { return {}; } })();
const files = readdirSync(DIR).filter(f => f.endsWith(".json"));
let avecComptes = 0;
for (const f of files) {
  let s; try { s = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")); } catch (e) { note("json", f, "fichier illisible"); continue; }
  const fin = s.fin || {}, years = s.years || [], n = years.length;
  const has = Object.values(fin).some(a => Array.isArray(a) && a.some(num));
  if (!has) continue; // sans comptes : le site l'indique, rien à vérifier ici
  avecComptes++;
  const id = s.id || f;
  // 1. structure
  if (!s.currency) note("devise", id, "comptes sans devise");
  if (!/^\d{2}-\d{2}$/.test(s.fyEnd || "")) note("fyEnd", id, `clôture « ${s.fyEnd} »`);
  for (let i = 1; i < n; i++) if (!(years[i] > years[i - 1])) note("annees", id, years.join(","));
  for (const [k, a] of Object.entries(fin)) if (Array.isArray(a) && a.length !== n) note("longueur", id, `${k} : ${a.length} valeurs pour ${n} années`);
  // 2. unité : un chiffre d'affaires au-delà de 2 000 milliards (en millions : 2 000 000) n'existe pas
  const ca = last(fin.ca), net = last(fin.net);
  const fx = FX[s.currency];
  if (num(ca) && fx && ca * fx > 1.5e6) note("unite", id, `ventes ${Math.round(ca)} M${s.currency || ""} (${Math.round(ca * fx / 1e3)} Md€) : milliers pris pour des millions ?`);
  if (num(ca) && ca < 0) note("ca-negatif", id, `ventes ${ca}`);
  // 3. signes : bénéfice par action et bénéfice net doivent aller dans le même sens
  if (Array.isArray(fin.eps) && Array.isArray(fin.net)) for (let i = 0; i < n; i++) { const e = fin.eps[i], v = fin.net[i]; if (num(e) && num(v) && Math.abs(v) > 1 && Math.abs(e) > 0.01 && Math.sign(v) !== Math.sign(e)) note("signe-eps", id, `${years[i]} : bénéfice ${Math.round(v)} M, BPA ${e}`); }
  // 4. dette nette ≈ dette − trésorerie (tolérance 35 % ou 10 M, les baux et placements expliquent de petits écarts)
  const debt = last(fin.debt), cash = last(fin.cash), nd = last(fin.netDebt);
  if (num(debt) && num(cash) && num(nd)) { const calc = debt - cash, tol = Math.max(10, 0.35 * Math.max(Math.abs(calc), Math.abs(nd))); if (Math.abs(calc - nd) > tol) note("dette-nette", id, `dette ${Math.round(debt)} − tréso ${Math.round(cash)} = ${Math.round(calc)}, publié ${Math.round(nd)}`); }
  // 5. marges et croissances hors de toute vraisemblance (hors banques, où le « chiffre d'affaires » n'a pas le même sens)
  if (!BANQUES.has(s.sector) && num(ca) && num(net) && ca > 10) { const m = net / ca; if (m > 0.8 || m < -5) note("marge", id, `marge nette ${(m * 100).toFixed(0)} %`); }
  if (Array.isArray(fin.ca)) for (let i = 1; i < n; i++) { const a = fin.ca[i - 1], b = fin.ca[i]; if (num(a) && num(b) && a > 50 && years[i] === years[i - 1] + 1 && (b / a > 5 || b / a < 0.15)) note("croissance", id, `${years[i - 1]} → ${years[i]} : ${Math.round(a)} → ${Math.round(b)} (×${(b / a).toFixed(1)})`); }
  // 6. fraîcheur : la source la plus récente doit correspondre à la dernière année ; au-delà de 18 mois le site doit afficher « comptes anciens » (provenance.js), on le compte ici
  const src = (s.sources || []).map(x => x.periodEnd).filter(Boolean).sort().slice(-1)[0];
  if (src && years[n - 1] && Math.abs(+src.slice(0, 4) - years[n - 1]) > 1) note("source-annee", id, `dernière source ${src}, dernière année ${years[n - 1]}`);
  const clos = src && src.length >= 10 ? src : (years[n - 1] ? `${years[n - 1]}-${s.fyEnd || "12-31"}` : null);
  if (clos && (Date.now() - Date.parse(clos)) / 864e5 > 548) note("ancien", id, `clos le ${clos}`);
  // 7. (5e passage, A8) valeurs aberrantes d'une année à l'autre : ventes × 3 (ou ÷ 3), marge d'exploitation qui saute de moins de 10 % à plus de 50 %
  //    (ou l'inverse), fonds propres ou trésorerie × 8 : changement d'unité, de devise ou de périmètre probable. Ces fiches affichent
  //    « chiffre à vérifier » (cf/site/data/a-verifier.json, lu par le site) au lieu du chiffre.
  const doute = {};
  const saut = (k, lim, lib) => { const a = fin[k]; if (!Array.isArray(a)) return; for (let i = 1; i < n; i++) { const x = a[i - 1], y = a[i]; if (num(x) && num(y) && Math.abs(x) > 50 && Math.abs(y) > 50 && years[i] === years[i - 1] + 1 && (Math.abs(y / x) > lim || Math.abs(y / x) < 1 / lim)) { (doute[k] = doute[k] || []).push(years[i]); note(lib, id, `${k} ${years[i - 1]} → ${years[i]} : ${Math.round(x)} → ${Math.round(y)} (×${(y / x).toFixed(1)})`); } } };
  saut("ca", 3, "saut-ventes");
  if (!BANQUES.has(s.sector)) saut("equity", 8, "saut-bilan"); // la trésorerie varie légitimement beaucoup : pas de test dessus
  if (!BANQUES.has(s.sector) && Array.isArray(fin.ebit) && Array.isArray(fin.ca)) for (let i = 1; i < n; i++) {
    const m0 = num(fin.ebit[i - 1]) && num(fin.ca[i - 1]) && fin.ca[i - 1] > 50 ? fin.ebit[i - 1] / fin.ca[i - 1] : null, m1 = num(fin.ebit[i]) && num(fin.ca[i]) && fin.ca[i] > 50 ? fin.ebit[i] / fin.ca[i] : null;
    if (m0 != null && m1 != null && years[i] === years[i - 1] + 1 && ((m0 < 0.1 && m1 > 0.5) || (m1 < 0.1 && m0 > 0.5))) { (doute.marge = doute.marge || []).push(years[i]); note("saut-marge", id, `marge ${years[i - 1]} → ${years[i]} : ${(m0 * 100).toFixed(0)} % → ${(m1 * 100).toFixed(0)} %`); }
  }
  const ok = VERIFIES[id] || {}; // 5/11 : sauts réels vérifiés à la main (data/sauts-verifies.json)
  for (const k of Object.keys(doute)) { doute[k] = doute[k].filter(y => !(ok[k] || []).includes(y)); if (!doute[k].length) delete doute[k]; }
  if (Object.keys(doute).length) AVERIFIER[id] = doute;
}

const BLOQUANT = new Set(["json", "devise", "fyEnd", "annees", "longueur", "unite", "ca-negatif", "signe-eps"]);
const LIB = { json: "fichier illisible", devise: "comptes sans devise", fyEnd: "date de clôture invalide", annees: "années en désordre", longueur: "séries de longueurs différentes", unite: "unité probablement fausse", "ca-negatif": "ventes négatives", "saut-ventes": "ventes × 3 ou ÷ 3 en un an (chiffre à vérifier)", "saut-marge": "marge qui saute (chiffre à vérifier)", "saut-bilan": "fonds propres × 8 en un an (chiffre à vérifier)", "signe-eps": "BPA de signe opposé au bénéfice", "dette-nette": "dette nette ≠ dette − trésorerie", marge: "marge nette invraisemblable", croissance: "saut de ventes ×5 ou ÷6 d'une année à l'autre", "source-annee": "source et dernière année décalées", ancien: "comptes clos depuis plus de 18 mois (affichés comme anciens)" };
console.log(`${files.length} fiches, ${avecComptes} avec comptes`);
let bloquants = 0;
for (const code of Object.keys(LIB)) {
  const l = E[code] || []; if (!l.length) continue;
  const b = BLOQUANT.has(code); if (b) bloquants += l.length;
  console.log(`${b ? "ERREUR " : "à voir "} ${LIB[code]} : ${l.length}`);
  for (const x of (TOUT ? l : l.slice(0, 4))) console.log(`     ${x.id} · ${x.detail}`);
  if (!TOUT && l.length > 4) console.log(`     … ${l.length - 4} autres (--tout)`);
}
try { writeFileSync("cf/site/data/a-verifier.json", JSON.stringify({ maj: new Date().toISOString().slice(0, 10), items: AVERIFIER })); console.log(`${Object.keys(AVERIFIER).length} fiche(s) avec un chiffre à vérifier → cf/site/data/a-verifier.json`); } catch (e) { console.log("a-verifier.json non écrit :", e.message); }
console.log(bloquants ? `${bloquants} erreur(s) bloquante(s)` : "aucune erreur bloquante");
process.exit(bloquants ? 1 : 0);
