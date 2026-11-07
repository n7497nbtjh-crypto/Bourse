/* ---------- Outils v4 (3/11/2026), même direction que Marchés v4 ----------
   La page d'accueil des outils : en-tête jaune (trois outils mis en avant), puis deux familles en cartes (icône jaune, nom,
   une ligne, « Ouvrir »). Les sous-pages (/outils/si-javais, /outils/recouvrement, /outils/verifier) restent celles d'origine.
   Remplace window.pageOutils (pour la page sans sous-page seulement). */
const OU4_I = { idees: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3z", epargne: "M4 18l5-6 4 3 7-9M4 4v16h16", passe: "M12 8v4l3 2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0", verif: "M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7zM9 12l2 2 4-4", repart: "M12 3v9h9a9 9 0 1 1-9-9zM14 3a9 9 0 0 1 7 7h-7z", listes: "M4 6h16M4 12h10M4 18h7", comparer: "M4 20V9M10 20V4M16 20v-8M22 20H2", recouv: "M14 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM20 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0z", pf: "M3 7h18v12H3zM3 11h18M8 7V4h8v3", frais: "M4 4h16v16H4zM8 9h8M8 13h5M8 17h3", impot: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h3", agenda: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4", div: "M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8" };
const ou4Ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${OU4_I[k] || OU4_I.listes}"/></svg>`;
const OU4_UNE = [
  ["/simulateurs/epargne", "epargne", "Simulateur d'épargne", "Ce que devient une somme placée chaque mois, frais et impôt compris."],
  ["/portefeuille", "pf", "Mon portefeuille", "Frais réels, doublons d'ETF, concentration, dividendes."],
  ["/outils/verifier", "verif", "Vérifier une offre", "Un site ou un « conseiller » face aux listes noires de l'AMF."]];
const OU4_G = [
  ["b", "Pour débuter", "Avec vos chiffres, hypothèses affichées.", [
    ["/outils/si-javais", "passe", "Et si j'avais investi ?", "1 000 € placés il y a 1, 3 ou 5 ans, comparés au marché, au Livret A et à l'inflation."],
    ["/idees-recues", "idees", "Les idées reçues face aux chiffres", "Dix phrases qu'on entend souvent, vérifiées avec des données sourcées."],
    ["/simulateurs/frais", "frais", "Le coût des frais", "Courtage et frais de gestion sur 10, 20 ou 30 ans, courtier par courtier."]]],
  ["p", "Pour aller plus loin", "Trier, comparer, radiographier.", [
    ["/comparer", "comparer", "Comparer des entreprises", "Côte à côte, critère par critère, face à la médiane du secteur."],
    ["/outils/recouvrement", "recouv", "Deux ETF se recouvrent-ils ?", "Les entreprises que deux à quatre ETF ont en commun."],
    ["/classements", "listes", "Classements", "Les entreprises qui cumulent le plus de points forts, critère par critère."],
    ["/dividendes", "div", "Calendrier des dividendes", "Les prochaines dates de détachement et de paiement."],
    ["/agenda", "agenda", "Agenda des résultats", "Les prochaines publications, jour par jour."],
    ["/pronostics", "listes", "Pronostics de résultats", "Avant chaque publication : ventes en hausse ou en baisse ? Un exercice pour apprendre à anticiper."]]]];
const OU4_0 = window.pageOutils;
function pageOutils4(t) {
  if (t) return OU4_0.apply(this, arguments);
  setNav("sim"); setTitle("Outils");
  const fr = e4Fr(), carte = ([h, k, n, d, seul]) => seul === "fr" && !fr ? "" : `<a class="ou4-c" href="${h}">${ou4Ic(k)}<b>${esc(n)}</b><span>${esc(d)}</span><em>Ouvrir →</em></a>`;
  app.innerHTML = `<div class="ek ek-page ou4-page">
    <section class="ek-hero"><span class="mc-stk">Outils</span><h1 class="ag4-t">Calculer, comparer, vérifier.</h1>
      <p class="mc-sub">Avec vos chiffres. Les hypothèses sont toujours affichées, et rien n'est un conseil.</p>
      <div class="ou4-une">${OU4_UNE.map(carte).join("")}</div></section>
    ${OU4_G.map(([cl, t, s, L]) => `<section class="ek-sec"><span class="ek-stk2 ${cl}">${esc(t)}</span><h2>${esc(s)}</h2><div class="ou4-g">${L.map(carte).join("")}</div></section>`).join("")}
    <section class="ek-sec"><a class="ou4-deb" href="/apprendre"><b>Vous débutez ?</b><span>Le guide, les cours et le lexique sont dans Apprendre.</span><em>Apprendre →</em></a></section></div>`;
}
window.pageOutils = pageOutils4;
