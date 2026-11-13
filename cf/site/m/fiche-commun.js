/* ====================================================================================
   Fonctions communes de la fiche entreprise, gardées lors de la suppression de l'ancienne fiche (fiche.js, fiche2.js, fiche3.js, lot 3, 3/11/2026).
   - faits Wikidata (siège, création, effectifs) : ficheWDLoad, ficheWd ; garde de navigation : ficheMemeId (lus par m/fiche4.js et m/orchestre.js) ;
   - niveaux point fort / moyen / à surveiller (rfNiveaux, rfTally) : lus par quick() dans app.js, donc par toutes les listes du site ;
   - anciennes adresses /entreprise/<id>/comprendre/<k> : ouvrent la fiche sur l'étape correspondante.
   ==================================================================================== */
const FICHE_WD = {}; // faits Wikidata par entreprise (fichiers /data/wd/<id>.json fabriqués par build.mjs)
let FICHE_WD_IDX = null;
function ficheWDLoad(id) {
  if (!id) return Promise.resolve(null);
  if (FICHE_WD[id] !== undefined) return Promise.resolve(FICHE_WD[id]);
  if (!FICHE_WD_IDX) FICHE_WD_IDX = fetch("/data/wd/index.json").then(r => r.ok ? r.json() : null).then(j => j ? new Set(j.ids || []) : null).catch(() => null); // zéro 404 : on ne demande la fiche Wikidata que si elle existe
  return FICHE_WD_IDX.then(idx => idx && !idx.has(id) ? null : fetch(`/data/wd/${id}.json`).then(r => r.ok ? r.json() : null).catch(() => null)).then(j => { if (j && j.siege && /^(siège|si[eè]ge social|headquarters)/i.test(j.siege)) delete j.siege; return (FICHE_WD[id] = j); });
}
const ficheWd = id => FICHE_WD[id] || null;
const ficheMemeId = id => location.pathname.split("/")[2] === id;

function rfNiveaux(s, f) { // les niveaux (point fort / moyen / à surveiller) dérivent des positions des jauges (une seule source, lot A du 31/10)
  const A = Object.fromEntries(rfAxes(s).map(a => [a.k, a])), lv = k => A[k] && A[k].lv ? A[k].lv : null;
  return { croissance: lv("croissance"), rentabilite: lv("marge"), solidite: A.solidite && A.solidite.special === "sansdette" ? "fort" : lv("solidite"), valorisation: lv("prix") };
}
function rfTally(s, f) { const t = { fort: 0, moyen: 0, vig: 0 }; Object.values(rfNiveaux(s, f)).forEach(l => { if (l && t[l] != null) t[l]++; }); return t; }

// Anciennes adresses « comprendre » : la fiche v4 (m/fiche4.js) sur la bonne étape
const FICHE_CT = { argent: "metier", varier: "metier", croissance: "e1", marge: "e2", net: "e3", roe: "e2", dette: "e3", fcf: "tout", dividende: "e4", prix: "e5" };
window.pageComprendre = function (id, k) { goR(`/entreprise/${id}#${FICHE_CT[k] || "tout"}`); };
