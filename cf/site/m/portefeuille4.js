/* ---------- Mon portefeuille v4 (3/11/2026), même direction que les outils v4 ----------
   /portefeuille. Le module m/portefeuille.js (calculs, saisie, import, plis) reste en place ; cette couche :
   - met le résultat en titre du bandeau jaune (« 5 497 € aujourd'hui. » + plus-value, sur combien investi) ;
   - habille la page en v4 (classe .ek.ek-page.pf4 sur #pf3, CSS pf4 dans composants.css) : chiffres clés en cartes,
     lignes en tableau clair, et les onze blocs du tableau de bord en tuiles (titre + chiffre clé) : une tuile ouverte
     prend toute la largeur ; la rangée de pastilles de navigation, devenue inutile, est masquée.
   Remplace pagePortefeuille (enveloppe) et pf3Hero (enveloppe). */
const PF4_page0 = window.pagePortefeuille, PF4_hero0 = window.pf3Hero;
window.pf3Hero = function (R0, P) {
  const r = PF4_hero0.apply(this, arguments);
  try {
    const hb = $("#pf3hero"); if (hb) hb.classList.remove("panel"); // les chiffres clés en cartes, sans cadre autour
    const h = $("#pf3 h1.pagetitle"), s = $("#pf3 .pagesub"), T = R0 && R0.T, nb = s0 => String(s0).replace(/ /g, " ");
    if (h && s) {
      if (P && P.l && P.l.length && T && T.tot > 0) {
        h.textContent = nb(`${pf3Eu(T.tot)} aujourd'hui.`);
        s.innerHTML = `${T.gainPct == null ? "Plus-value inconnue (cours manquants)" : `<b>${pf3Sg(T.gain)}</b> (${pf3Pc(T.gainPct)}) si vous vendiez aujourd'hui`}, sur ${pf3Eu(T.cost)} investis${T.dayN ? `, ${pf3Sg(T.day)} depuis hier` : ""}. ${P.dem ? "Portefeuille d'exemple : rien n'est enregistré." : `Calculé dans ce navigateur${typeof connecte === "function" && connecte() ? " et enregistré dans votre espace" : ""}.`}`;
      } else {
        h.textContent = "Ce que vous possédez vraiment.";
        s.textContent = "Ajoutez vos actions et vos ETF : la valeur aux cours du jour, votre plus ou moins-value, vos frais, vos dividendes et ce que contiennent vraiment vos ETF. Tout est calculé dans ce navigateur.";
      }
    }
  } catch (e) { }
  return r;
};
window.pagePortefeuille = async function () {
  const r = await PF4_page0.apply(this, arguments);
  const el = $("#pf3"); if (el) el.classList.add("ek", "ek-page", "pf4");
  return r;
};
