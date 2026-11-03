/* ====================================================================================
   Fonctions communes de la fiche entreprise, gardées lors de la suppression de l'ancienne fiche (fiche.js, fiche2.js, fiche3.js, lot 3, 3/11/2026).
   - faits Wikidata (siège, création, effectifs) : ficheWDLoad, ficheWd ; garde de navigation : ficheMemeId (lus par m/fiche4.js et m/orchestre.js) ;
   - réponses locales de l'IA sur l'identité d'une entreprise (enveloppe de localAssist, ia.js) ;
   - niveaux point fort / moyen / à surveiller (rfNiveaux, rfTally) : lus par quick() dans app.js, donc par toutes les listes du site ;
   - palette F3_COUL (m/etf3.js) ;
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

/* ---------- L'IA locale de la fiche : faits Wikidata, et le cours sur un an même sans historique ---------- */
const FICHE_LA0 = window.localAssist;
window.localAssist = function (s, c, raw) {
  const q = typeof IA_txt === "function" ? IA_txt(raw) : String(raw).toLowerCase(), wd = s ? ficheWd(s.id) : null;
  if (wd && /(depuis quand|cree|creee|creation|fonde|fondee|fondation|date de naissance|siege|salaries|employes|effectifs?|personnes? (y )?travaill|\bpdg\b|patron|dirige|directeur general|\bceo\b|president|fondateur|fiche identite)/.test(" " + q + " ") && !/dividende|dette|marge|cours|prix|chere?/.test(q)) {
    const P = [], N = s.name;
    if (wd.fonde && /depuis|cree|creation|fond|existe|identite/.test(q)) P.push(`${N} a été créée en ${wd.fonde}, il y a ${+TODAY.slice(0, 4) - wd.fonde} ans.`);
    if (wd.siege && /siege|ou |identite|existe/.test(q)) P.push(`Son siège est à ${wd.siege}${wd.pays ? ` (${wd.pays})` : ""}.`);
    if (wd.effectif && /salari|employ|effectif|personne|travaill|identite/.test(q)) P.push(`Elle emploie environ ${F0.format(wd.effectif[0])} personnes${wd.effectif[1] ? ` (chiffre de ${wd.effectif[1]})` : ""}.`);
    if (/pdg|patron|dirige|directeur|ceo|president|fondateur/.test(q)) {
      if (wd.pdg) P.push(`Directeur général : ${wd.pdg.join(", ")}.`);
      if (wd.president) P.push(`Président du conseil : ${wd.president.join(", ")}.`);
      if (wd.fondateurs && /fondateur|identite/.test(q)) P.push(`${wd.fondateurs.length > 1 ? "Fondateurs" : "Fondateur"} : ${wd.fondateurs.join(", ")}.`);
    }
    if (P.length) { P.push("Source : Wikidata, base de connaissances ouverte. Le rapport annuel de l'entreprise fait foi en cas d'écart."); return P.join("\n"); }
  }
  let t = FICHE_LA0(s, c, raw);
  const p = s && pxOf(s);
  if (t && p && !p.p1y && p.h52 > p.l52 && /Dernier cours connu/.test(t) && !/Sur un an/.test(t) && !/au plus bas/.test(t)) { // la fourchette n'est écrite qu'une fois (posTxt de ia.js la donne déjà)
    const x = v => eur(v, v >= 100 ? 0 : 2, p.cur);
    t = t.replace(/(Dernier cours connu[^\n]*\n?)/, `$1Sur un an, le cours a évolué entre ${x(p.l52)} (plus bas) et ${x(p.h52)} (plus haut).\n`);
  }
  return t;
};

function rfNiveaux(s, f) { // les niveaux (point fort / moyen / à surveiller) dérivent des positions des jauges (une seule source, lot A du 31/10)
  const A = Object.fromEntries(rfAxes(s).map(a => [a.k, a])), lv = k => A[k] && A[k].lv ? A[k].lv : null;
  return { croissance: lv("croissance"), rentabilite: lv("marge"), solidite: A.solidite && A.solidite.special === "sansdette" ? "fort" : lv("solidite"), valorisation: lv("prix") };
}
function rfTally(s, f) { const t = { fort: 0, moyen: 0, vig: 0 }; Object.values(rfNiveaux(s, f)).forEach(l => { if (l && t[l] != null) t[l]++; }); return t; }
const F3_COUL = ["#FFE14D", "#FF9EC6", "#9DB0FF", "#7FE0B9", "#FFB98A", "#C9B8FF", "#E6E3DA", "#B9E6F5"];

// Anciennes adresses « comprendre » : la fiche v4 (m/fiche4.js) sur la bonne étape
const FICHE_CT = { argent: "metier", varier: "metier", croissance: "e1", marge: "e2", net: "e3", roe: "e2", dette: "e3", fcf: "tout", dividende: "e4", prix: "e5" };
window.pageComprendre = function (id, k) { goR(`/entreprise/${id}#${FICHE_CT[k] || "tout"}`); };
