// Contrôle de cohérence de toutes les fiches entreprises (cf/site/data/societes/*.json) avant mise en ligne.
// Repère ce qu'un lecteur ne doit jamais voir : devise absente, années en désordre, unité probablement fausse
// (milliers au lieu de millions), bénéfice par action de signe opposé au bénéfice, dette nette incohérente
// avec dette et trésorerie, marges ou croissances aberrantes, exercice ancien non signalé.
//   node tests/t_coherence.mjs            résumé et exemples ; code de sortie 1 si une erreur bloquante
//   node tests/t_coherence.mjs --tout     liste complète
import { readdirSync, readFileSync } from "node:fs";

const DIR = "cf/site/data/societes", TOUT = process.argv.includes("--tout");
const BANQUES = new Set(["banque", "assurance", "finance", "financier", "immobilier"]);
const E = {}; // code → [ { id, detail } ]
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
}

const BLOQUANT = new Set(["json", "devise", "fyEnd", "annees", "longueur", "unite", "ca-negatif", "signe-eps"]);
const LIB = { json: "fichier illisible", devise: "comptes sans devise", fyEnd: "date de clôture invalide", annees: "années en désordre", longueur: "séries de longueurs différentes", unite: "unité probablement fausse", "ca-negatif": "ventes négatives", "signe-eps": "BPA de signe opposé au bénéfice", "dette-nette": "dette nette ≠ dette − trésorerie", marge: "marge nette invraisemblable", croissance: "saut de ventes ×5 ou ÷6 d'une année à l'autre", "source-annee": "source et dernière année décalées", ancien: "comptes clos depuis plus de 18 mois (affichés comme anciens)" };
console.log(`${files.length} fiches, ${avecComptes} avec comptes`);
let bloquants = 0;
for (const code of Object.keys(LIB)) {
  const l = E[code] || []; if (!l.length) continue;
  const b = BLOQUANT.has(code); if (b) bloquants += l.length;
  console.log(`${b ? "ERREUR " : "à voir "} ${LIB[code]} : ${l.length}`);
  for (const x of (TOUT ? l : l.slice(0, 4))) console.log(`     ${x.id} · ${x.detail}`);
  if (!TOUT && l.length > 4) console.log(`     … ${l.length - 4} autres (--tout)`);
}
console.log(bloquants ? `${bloquants} erreur(s) bloquante(s)` : "aucune erreur bloquante");
process.exit(bloquants ? 1 : 0);
