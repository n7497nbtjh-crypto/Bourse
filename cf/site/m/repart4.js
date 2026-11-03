/* ---------- « Quelle part en actions ? » v4 (3/11/2026), même direction que les autres outils v4 ----------
   /repartitions. En-tête jaune : ce qu'une forte baisse coûterait en titre (suit les curseurs), les curseurs, la barre et
   l'exemple le plus proche en carte blanche dans le bandeau. Puis : une liste à partir de vos critères (ETF avec le logo de
   l'émetteur, entreprises avec leur logo) en cartes, et « comment c'est calculé » replié.
   Calculs et contenus inchangés : recoSlHTML, recoSlParts, recoBaisse, recoFiltresHTML, recoListeHTML, recoLier (m/reco.js).
   Remplace pageRepartitions. */
const RP4_droite0 = window.recoSlDroite, RP4_etf0 = window.recoEtfLigne;
window.recoSlDroite = function () { // le titre suit les curseurs
  const h = RP4_droite0.apply(this, arguments);
  try { const p = recoSlParts(), b = Math.round(recoBaisse(p)), t = $("#rp4t"), s = $("#rp4s");
    if (t) t.textContent = `Avec ${p.etf}\u00a0% en actions, une forte baisse coûterait ${b}\u00a0%.`;
    if (s) s.innerHTML = `Si les actions chutaient de 30 % et les obligations de 5 %, il resterait <b>${F0.format(1000 - 10 * b).replace(/ /g, " ")} €</b> sur 1 000 €. Une multiplication, pas une prévision. Déplacez les curseurs.`;
  } catch (e) { }
  return h;
};
window.recoEtfLigne = function (e) { return RP4_etf0.apply(this, arguments).replace('<span class="rc-ico2">ETF</span>', typeof elLogo === "function" ? elLogo(e) : '<span class="rc-ico2">ETF</span>'); };
async function pageRepartitions4() {
  setTitle("Répartitions types et listes par critères"); setNav("sim"); recoCSS();
  if (!R) return;
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([PXP, recoDivLoad(), typeof EL !== "undefined" && !EL.logos ? getJSON("/logos/emetteurs/index.json", { l: {} }).then(j => EL.logos = j.l || {}) : null]);
  if (location.pathname !== "/repartitions") return;
  app.innerHTML = `<div class="ek ek-page s4 rp4">
    <section class="ek-hero"><span class="mc-stk">Quelle part en actions ?</span><h1 class="ag4-t" id="rp4t">Quelle part en actions ?</h1><p class="mc-sub" id="rp4s"></p>
      <div class="s4-form rp4-form" id="rc-ex">
        <label class="rc-lab">Ce que chaque compte accepte, pour <select id="rc-env">${RECO_ENV.map(([k, l]) => `<option value="${k}"${k === RECO_ST.env ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <div id="rc-slw">${recoSlHTML()}</div></div>
      <p class="rp4-legal">Information factuelle, pas un conseil en investissement : les quatre exemples sont les mêmes pour tout le monde, et le site ne désigne pas celui qui vous conviendrait. Pour un conseil adapté à votre situation, adressez-vous à un conseiller en investissements financiers immatriculé à l'<a class="lnk" href="https://www.orias.fr" target="_blank" rel="noopener">ORIAS</a>.</p></section>
    <section class="ek-sec" id="listes"><span class="ek-stk2 b">Une liste à partir de vos critères</span><h2>Vous choisissez, le site trie.</h2>
      <div id="rc-f">${recoFiltresHTML()}</div><div id="rc-l">${recoListeHTML()}</div></section>
    <section class="ek-sec"><details class="s4-pl"><summary>Comment ces listes sont calculées</summary>
      <p><b>Niveau de risque (1 à 5).</b> Il vient de la nature du placement, pas d'un jugement : ETF monétaire 1, obligations 2, ETF d'actions larges 3, pays émergents, thématiques et pays unique 4, matières premières 5. Une action seule vaut au moins 3.</p>
      <p><b>Éligibilité au PEA.</b> Pour une action : siège dans l'Union européenne ou l'EEE (pays du code ISIN, recoupé avec Wikidata) et société soumise à l'impôt sur les sociétés ; les foncières exonérées (SIIC, SIR, SOCIMI, REIT) sont exclues. Pour un ETF : l'éligibilité déclarée par l'émetteur.</p>
      <p><b>Chiffres des entreprises.</b> Ventes, marge, croissance et dette viennent du dernier exercice publié ; le PER et le rendement rapportent un cours du jour (différé) à un résultat déjà clos. Les deux ne portent donc pas sur la même période.</p>
      <p><b>Exemples de répartition.</b> Les pourcentages sont fixes, identiques pour tous, et choisis pour échelonner la part d'actions de 0 à 80 %. L'effet d'une baisse est une multiplication sur l'exemple (actions −30 %, obligations −5 %), pas une prévision.</p>
      <p class="ek-note">Sources : comptes annuels ESEF (Europe) et SEC (États-Unis), cours différés du site, fiches des émetteurs d'ETF, Wikidata (CC0). Les performances passées ne préjugent pas des performances futures. Les familles de placements et leurs règles : <a class="lnk" href="/pea-cto">PEA, compte-titres ou assurance-vie</a>.</p></details></section></div>`;
  recoLier();
  recoSlDroite(); // titre de départ
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
}
window.pageRepartitions = pageRepartitions4;
