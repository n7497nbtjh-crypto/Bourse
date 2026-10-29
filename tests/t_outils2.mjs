// Calculs des outils (cf/site/m/outils2_calc.js) : recouvrement d'ETF, simulateur, scénarios, « Et si j'avais investi ? ».
// Cas simples dont on connaît la réponse. Usage : node tests/t_outils2.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const C = require("../cf/site/m/outils2_calc.js");
let bad = 0;
const near = (a, b, tol, msg) => { const ok = a != null && Math.abs(a - b) <= tol; if (!ok) bad++; console.log(ok ? "ok " : "ÉCART", msg, a, "attendu", b); };
const vrai = (c, msg) => { if (!c) bad++; console.log(c ? "ok " : "ÉCART", msg); };

// 1. Recouvrement : positions communes et poids économique réel
const A = { isins: [["X", 50], ["Y", 30], ["Z", 20]] }, B = { isins: [["X", 10], ["Y", 10], ["W", 80]] };
const p = C.paire(A, B);
near(p.communes, 2, 0, "deux positions communes");
near(p.recouvrement, 20, 1e-9, "poids identique = somme des minimums (10 + 10)");
near(p.partAdansB, 80, 1e-9, "part de A dans des titres que B détient (50 + 30)");
near(p.partBdansA, 20, 1e-9, "part de B dans des titres que A détient");
near(C.paire(A, A).recouvrement, 100, 1e-9, "un fonds se recouvre à 100 % avec lui-même");
near(C.paire(A, { isins: [["Q", 100]] }).recouvrement, 0, 0, "aucun titre commun : 0 %");
// 2. Concentration : 4 lignes égales => 4 lignes équivalentes ; une ligne à 100 % => 1
near(C.concentration([25, 25, 25, 25]).nEq, 4, 1e-9, "diversification effective, lignes égales");
near(C.concentration([100]).nEq, 1, 1e-9, "une seule ligne");
near(C.concentration(Array(20).fill(5)).top10, 50, 1e-9, "10 premières lignes sur 20 égales = 50 %");
// 3. Portefeuille combiné 50/50
const X = C.combine([{ w: 50, ...A, countries: [["US", 100]], sectors: [["it", 100]] }, { w: 50, ...B, countries: [["FR", 100]], sectors: [["fin", 100]] }]);
near(X.lignes.find(l => l.isin === "X").w, 30, 1e-9, "poids combiné de X = (50 + 10) / 2");
near(X.lignes.reduce((s, l) => s + l.w, 0), 100, 1e-9, "le portefeuille combiné fait 100 %");
near(X.doublon, 50, 1e-9, "poids en double : X (30) + Y (20)");
near(X.propre[0], 20, 1e-9, "part propre du premier fonds (Z)");
near(X.propre[1], 80, 1e-9, "part propre du second fonds (W)");
near(X.pays.find(c => c[0] === "US")[1], 50, 1e-9, "pays combinés");
near(C.combine([{ w: 3, ...A }, { w: 1, ...B }]).parts[0], 0.75, 1e-9, "parts normalisées (3 pour 1)");
// 4. Simulateur : sans frais ni impôt = intérêts composés
const T0 = { pfu: 0.314, ps: 0.186 };
const s0 = C.simule({ initial: 1000, mensuel: 0, annees: 10, rendement: 0.05, ter: 0, taux: { pfu: 0, ps: 0 }, enveloppe: "cto" });
near(s0.net, 1000 * 1.05 ** 10, 1e-6, "versement unique à 5 % pendant 10 ans");
const s1 = C.simule({ initial: 0, mensuel: 100, annees: 2, rendement: 0, ter: 0, taux: T0, enveloppe: "cto" });
near(s1.verse, 2400, 1e-9, "versements cumulés"); near(s1.net, 2400, 1e-9, "rendement nul : pas de gain, pas d'impôt");
// Courtage : 1 € par ordre, 12 ordres par an pendant 2 ans + achat initial = 25 € ; vente comptée en plus
const s2 = C.simule({ initial: 100, mensuel: 100, annees: 2, rendement: 0, ter: 0, fraisOrdre: () => 1, ordresParAn: 12, taux: T0, enveloppe: "cto", vente: true });
near(s2.courtage, 26, 1e-9, "25 ordres d'achat + 1 de vente à 1 €"); near(s2.net, 2500 - 26, 1e-9, "les frais réduisent la valeur, pas d'impôt sur une perte");
const s3 = C.simule({ initial: 0, mensuel: 100, annees: 1, rendement: 0, ter: 0, fraisOrdre: () => 1, ordresParAn: 4, taux: T0, enveloppe: "cto" });
near(s3.ordres, 4, 0, "4 achats par an"); near(s3.courtage, 4, 1e-9, "4 ordres à 1 €");
// Frais courants : 1 % par an sur 1 an sans rendement => −1 %
const s4 = C.simule({ initial: 1000, mensuel: 0, annees: 1, rendement: 0, ter: 0.01, taux: { pfu: 0, ps: 0 }, enveloppe: "cto" });
near(s4.valeur, 990, 1e-6, "frais courants de 1 % sur un an"); near(s4.fraisFonds, 10, 1e-6, "frais du fonds prélevés");
// Change : 0,5 % sur un achat de 1000 €
near(C.simule({ initial: 1000, mensuel: 0, annees: 1, rendement: 0, ter: 0, change: 0.005, taux: T0, enveloppe: "cto" }).change, 5, 1e-9, "frais de change");
// Fiscalité : PEA de 5 ans = prélèvements sociaux, PEA de 3 ans et compte-titres = prélèvement forfaitaire
const g = { initial: 10000, mensuel: 0, rendement: 0.1, ter: 0, taux: T0 };
const pea5 = C.simule({ ...g, annees: 5, enveloppe: "pea" }), cto5 = C.simule({ ...g, annees: 5, enveloppe: "cto" }), pea3 = C.simule({ ...g, annees: 3, enveloppe: "pea" });
const gain5 = 10000 * (1.1 ** 5 - 1);
near(pea5.impot, gain5 * 0.186, 1e-6, "PEA de 5 ans : 18,6 % des gains"); near(cto5.impot, gain5 * 0.314, 1e-6, "compte-titres : 31,4 %");
near(pea3.taux, 0.314, 0, "PEA de moins de 5 ans : 31,4 %");
vrai(C.simule({ initial: 0, mensuel: 1000, annees: 15, rendement: 0, ter: 0, taux: T0, enveloppe: "pea" }).plafondPEA, "plafond du PEA de 150 000 € signalé");
near(C.simule({ initial: 1000, mensuel: 0, annees: 2, rendement: 0, ter: 0, taux: T0, enveloppe: "cto", inflation: 0.02 }).netReel, 1000 / 1.02 ** 2, 1e-6, "euros d'aujourd'hui");
// 5. Scénarios historiques : série constante => les trois scénarios valent ce rendement
const cst = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [1996 + i, 5]));
const sc = C.scenarios(cst, 10);
near(sc.central, 0.05, 1e-12, "scénario central d'une série constante"); near(sc.prudent, 0.05, 1e-12, "prudent"); near(sc.nb, 21, 0, "21 périodes de 10 ans sur 30 ans");
near(C.scenarios(cst, 40).N, 23, 0, "durée ramenée pour garder 8 périodes");
near(C.quantile([1, 2, 3, 4, 5], 0.5), 3, 0, "médiane"); near(C.quantile([0, 10], 0.1), 1, 1e-12, "10e centile interpolé");
near(C.fenetres({ 2000: 10, 2001: -10 }, 2)[0].r, Math.sqrt(1.1 * 0.9) - 1, 1e-12, "rendement annuel moyen géométrique");
// Avec la vraie série du site (MSCI World en euros, m/communication.js) : ordre prudent < central < favorable
const src = readFileSync(new URL("../cf/site/m/communication.js", import.meta.url), "utf8"), mw = src.match(/const COMM_MW = (\{[\s\S]*?\});/);
if (mw) { const serie = Function("return " + mw[1])(); const r = C.scenarios(serie, 15); vrai(r.prudent < r.central && r.central < r.favorable, `scénarios MSCI World 15 ans : ${(r.prudent * 100).toFixed(1)} < ${(r.central * 100).toFixed(1)} < ${(r.favorable * 100).toFixed(1)} %`); }
// 6. Livret A : 1000 € à 3 % du 1er janvier au 1er janvier suivant = 1030 € ; intérêts par quinzaine
near(C.livretA(1000, "2023-12-31", "2025-01-01", [["2023-02-01", 3]]), 1030, 1e-6, "Livret A à 3 % sur une année civile");
near(C.livretA(1000, "2024-01-20", "2024-02-16", [["2023-02-01", 3]]), 1000 + 1000 * 0.03 / 24, 1e-6, "dépôt le 20 : intérêts à partir du 1er du mois suivant (une quinzaine)");
near(C.livretA(1000, "2024-12-31", "2026-01-01", [["2023-02-01", 3], ["2025-02-01", 2.4], ["2025-08-01", 1.7]]), 1000 * (1 + (3 * 2 + 2.4 * 12 + 1.7 * 10) / 24 / 100), 1e-6, "changements de taux en cours d'année");
// 7. Placement unique et inflation
const vp = C.valeurPlacement(1000, 100, 150, 1.2, 1.1);
near(vp.valeur, 1000 * 1.2 / 100 * 150 / 1.1, 1e-9, "conversion de devise au départ et à l'arrivée");
near(C.inflation(1000, 100, 103.07), 1030.7, 1e-9, "même pouvoir d'achat");
vrai(C.valeurPlacement(1000, 0, 10) === null, "cours de départ absent : pas de calcul");
near(+C.moisProche({ "2026-08": 1, "2026-09": 2 }, "2026-10-29").slice(5), 9, 0, "dernier mois publié au plus tard");
// 8. Données de référence publiées (si présentes) : séries plausibles
try { const R = JSON.parse(readFileSync(new URL("../cf/site/data/hist-ref.json", import.meta.url), "utf8"));
  vrai(Object.keys(R.ipc.mois).length >= 60, "indice des prix : au moins 5 ans de mois"); vrai(Object.values(R.fx.mois).at(-1).USD > 0.5 && Object.values(R.fx.mois).at(-1).USD < 2, "dollar pour un euro plausible");
  vrai(R.livretA.taux.every(([d, t], i, a) => /^\d{4}-\d{2}-\d{2}$/.test(d) && t > 0 && t < 10 && (!i || d > a[i - 1][0])), "taux du Livret A datés et ordonnés");
} catch (e) { bad++; console.log("ÉCART hist-ref.json illisible :", e.message); }
console.log(bad ? `${bad} écart(s)` : "tous les calculs sont justes"); process.exit(bad ? 1 : 0);
