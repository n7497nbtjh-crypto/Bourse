/* ---------- Outils v4 (3/11/2026), même direction que Marchés v4 ----------
   La page d'accueil des outils : en-tête jaune, puis les outils en cartes (icône jaune, nom, une ligne, « Ouvrir »).
   Remplace window.pageOutils (pour la page sans sous-page seulement). */
const OU4_I = { lex: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6", idees: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3z", epargne: "M4 18l5-6 4 3 7-9M4 4v16h16", passe: "M12 8v4l3 2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0", verif: "M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7zM9 12l2 2 4-4", repart: "M12 3v9h9a9 9 0 1 1-9-9zM14 3a9 9 0 0 1 7 7h-7z", listes: "M4 6h16M4 12h10M4 18h7", comparer: "M4 20V9M10 20V4M16 20v-8M22 20H2", recouv: "M14 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM20 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0z", pf: "M3 7h18v12H3zM3 11h18M8 7V4h8v3", frais: "M4 4h16v16H4zM8 9h8M8 13h5M8 17h3", impot: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h3", agenda: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4", div: "M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8" };
const ou4Ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${OU4_I[k] || OU4_I.listes}"/></svg>`;
/* 13/11 (recentrage) : six outils, tous ici et nulle part ailleurs. Maquette docs/maquettes/menu-outils-v1.html. */
const OU4_L = [
  ["/classements", "listes", "Classements", "Où se situe une entreprise dans son secteur : ventes, marge, dette, croissance.", "prem"],
  ["/comparer", "comparer", "Comparer des entreprises", "Deux entreprises côte à côte, sur les mêmes repères, avec zones vertes et rouges."],
  ["/outils/recouvrement", "recouv", "Comparer deux ETF", "Ce qu'ils ont en commun, leurs frais, les vraies entreprises à l'intérieur."],
  ["/agenda", "agenda", "Agenda des résultats", "Quelle entreprise publie ses comptes, et quel jour. Vos favoris en tête."],
  ["/dividendes", "div", "Calendrier des dividendes", "Qui verse un dividende, quand, et combien par action."],
  ["/lexique", "lex", "Lexique", "Chaque mot de la Bourse expliqué simplement : PER, marge, dividende, capitalisation."]];
const OU4_0 = window.pageOutils;
function pageOutils4(t) {
  if (t) return OU4_0.apply(this, arguments);
  setNav("sim"); setTitle("Outils");
  const carte = ([h, k, n, d, pr]) => `<a class="ou4-c ou4-o" href="${h}">${pr ? `<i class="ou4-pr">Premium</i>` : ""}${ou4Ic(k)}<b>${esc(n)}</b><span>${esc(d)}</span><em>Ouvrir →</em></a>`;
  app.innerHTML = `<div class="ek ek-page ou4-page">
    <section class="ek-hero"><span class="mc-stk">${OU4_L.length} outils, c'est tout</span><h1 class="ag4-t">Les outils.</h1>
      <p class="mc-sub">Classer, comparer, savoir quand ça tombe. Tout part des comptes officiels des entreprises, et rien n'est un conseil.</p></section>
    <section class="ek-sec"><div class="ou4-g ou4-g3">${OU4_L.map(carte).join("")}</div></section></div>`;
}
window.pageOutils = pageOutils4;
