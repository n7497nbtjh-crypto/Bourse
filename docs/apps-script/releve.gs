/** @OnlyCurrentDoc */
// Accès limité à cette feuille seulement (pas aux autres fichiers du compte).
// ENKLAIR : relevé des cours (7/11/2026), installé dans chacune des 4 feuilles « bilan - cours ».
// Pourquoi : une feuille fermée n'est recalculée qu'en partie et Google sert parfois une copie ancienne du CSV publié.
// Ce que fait le script, toutes les heures : il recharge la liste des titres (IMPORTDATA de la cellule A1), laisse
// GOOGLEFINANCE calculer, puis copie les valeurs dans l'onglet « releve », avec l'heure du relevé (colonne « maj »).
// Le robot du site (data/cours_fetch.mjs) lit cet onglet, publié en CSV, et refuse un relevé de plus de 30 heures.
// Installation : Extensions > Apps Script, coller ce fichier, choisir la fonction « installer », Exécuter, autoriser.

function releve() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), f = ss.getSheets().filter(x => x.getName() !== "releve")[0];
  const a1 = f.getRange("A1"), fo = a1.getFormula();
  if (fo) a1.setFormula(fo.replace(/\?v=[^"]*"/, '?v=' + Date.now() + '"'));
  SpreadsheetApp.flush();
  let vals = null, avant = -1, stable = 0;
  for (let i = 0; i < 16 && stable < 2; i++) { // jusqu'à 4 minutes : on attend que le nombre de cours calculés ne bouge plus
    Utilities.sleep(15000);
    SpreadsheetApp.flush();
    vals = f.getDataRange().getValues();
    const c = vals[0].indexOf("price"), n = vals.slice(1).filter(r => typeof r[c] === "number" && r[c] > 0).length;
    stable = n === avant && n > 0 ? stable + 1 : 0; avant = n;
  }
  if (!vals || avant <= 0) return;
  const maj = Utilities.formatDate(new Date(), "Etc/UTC", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  const out = vals.map((r, i) => r.concat([i ? maj : "maj"]));
  let r = ss.getSheetByName("releve"); if (!r) r = ss.insertSheet("releve", ss.getSheets().length); // en dernier : le CSV publié sans gid reste la feuille 1
  r.clearContents();
  r.getRange(1, 1, out.length, out[0].length).setValues(out);
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("releve").timeBased().everyHours(1).create();
  releve();
}
