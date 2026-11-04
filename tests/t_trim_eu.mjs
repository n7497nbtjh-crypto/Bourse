// Test de data/trim_eu.mjs : lecture du chiffre d'affaires d'un communiqué et reconstitution des trimestres
import assert from "node:assert/strict";
import { caPeriode, trimestres, perDe, anDe, tableaux, publiable } from "../data/trim_eu.mjs";
const t = (s, ti = "") => caPeriode(s, ti);
let x = t("CHIFFRE D'AFFAIRES DU TROISIEME TRIMESTRE 2026. Au troisième trimestre 2026, le chiffre d’affaires s’est établi à 7 233 millions d’euros, en croissance de +4,0% en données comparables.");
assert.equal(x.per, "T3"); assert.equal(x.v, 7233); assert.equal(x.cmp, true);
x = t("Le chiffre d’affaires du 3ème trimestre 2026 a progressé de 7,9 %, à 1 420,1 M€ La croissance organique s’est élevée à 4,3 % (vs. +3,0 % au 1er semestre).");
assert.equal(x.per, "T3", "« au 1er semestre » après le chiffre ne change pas la période"); assert.equal(x.v, 1420.1);
x = t("Le chiffre d’affaires du 3ème trimestre 2026 de Sopra Steria s’est élevé à 1 420,1 M€, en croissance de 7,9 %. À périmètre constant, +4,3 % (vs. +3,0 % au 1er semestre).");
assert.equal(x.per, "T3"); assert.equal(x.v, 1420.1);
x = t("Sur les neuf premiers mois de l’année, le chiffre d’affaires ressort à 525,6 M€, en progression de +22,5%.");
assert.equal(x.per, "9M");
x = t("Le chiffre d’affaires licences et autres ventes de logiciels progresse de 14% à 219 millions d'euros au troisième trimestre 2026.");
assert.equal(x, null, "chiffre d'une activité");
x = t("Technip Energies a généré un chiffre d'affaires de 7,2 milliards d'euros en 2025 et est cotée sur Euronext Paris.", "Résultats des neuf premiers mois 2026");
assert.equal(x, null, "présentation de la société");
x = t("Chiffre d’affaires supérieur à 500 M€ attendu pour 2027 au premier semestre.");
assert.equal(x, null, "objectif");
assert.equal(perDe("Au 30 septembre 2026"), "9M"); assert.equal(anDe("A", "2026-02-20"), 2025); assert.equal(anDe("T3", "2026-10-28"), 2026);
// trimestres : T2 = S1 − T1, T3 = 9M − S1, T4 = année − 9M
const R = [{ per: "T1", an: 2025, v: 100, d: "2025-04-20", u: "a" }, { per: "S1", an: 2025, v: 210, d: "2025-07-25", u: "b" }, { per: "9M", an: 2025, v: 330, d: "2025-10-20", u: "c" },
  { per: "T1", an: 2026, v: 104, d: "2026-04-20", u: "d" }, { per: "S1", an: 2026, v: 220, d: "2026-07-25", u: "e" }, { per: "T3", an: 2026, v: 300, d: "2026-10-20", u: "f" }];
const Q = trimestres(R, { 2025: 450 });
assert.deepEqual(Q.map(q => [q.end, q.ca]), [["2025-03-31", 100], ["2025-06-30", 110], ["2025-09-30", 120], ["2025-12-31", 120], ["2026-03-31", 104], ["2026-06-30", 116]], "T3 2026 à 300 écarté (hors des bornes)");
assert.equal(trimestres([{ per: "T1", an: 2026, v: 100, d: "2026-04-20" }, { per: "T2", an: 2026, v: 60, d: "2026-07-20" }, { per: "T3", an: 2026, v: 104, d: "2026-10-20" }], { 2025: 400 }).length, 2, "trimestre loin des autres de l'année écarté");
assert.equal(trimestres([{ per: "T1", an: 2026, v: 4100, d: "2026-04-20", u: "x" }], { 2025: 16000 }).length, 0, "montant arrondi au milliard écarté");
// tableau : chaque nombre prend la période écrite au-dessus de lui ; la variation du tableau confirme le couple
const tab = ["(en millions d'euros)", "                           T3 2026       T3 2025      Variation", "Chiffre d'affaires           7 233         6 876          +5,2 %"].join("\n");
const tb = tableaux(tab, "Chiffre d'affaires du 3e trimestre 2026");
assert.deepEqual(tb.map(r => [r.per, r.an, r.v, r.ok]), [["T3", 2026, 7233, 1], ["T3", 2025, 6876, 1]]);
assert.equal(tableaux("            9M 2026     9M 2025\nChiffre d'affaires du pôle Europe     1 200     1 100").length, 0, "ligne d'une activité ignorée");
// publication : l'année en cours confirmée, et son point de comparaison aussi
const R2 = [{ per: "T1", an: 2025, v: 100, d: "2025-04-20", u: "a" }, { per: "T1", an: 2025, v: 100, d: "2026-04-20", u: "b" }, { per: "T1", an: 2026, v: 104, d: "2026-04-20", u: "b", ok: 1 },
  { per: "T2", an: 2025, v: 110, d: "2025-07-20", u: "c" }, { per: "T2", an: 2025, v: 110, d: "2026-07-20", u: "d" }, { per: "T2", an: 2026, v: 115, d: "2026-07-20", u: "d", ok: 1 }];
assert.equal(publiable(trimestres(R2, { 2025: 430 })), true);
assert.equal(publiable(trimestres(R2.filter(r => r.u !== "b" || r.an === 2026).map(r => r.u === "a" ? r : r), { 2025: 430 })), false, "T1 2025 lu dans un seul communiqué : pas confirmé");
console.log("t_trim_eu : OK");
