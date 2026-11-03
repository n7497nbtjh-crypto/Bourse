/* ---------- Apprendre v4 (3/11/2026), même direction que les autres pages v4 ----------
   En-tête jaune (le but, le bouton pour commencer ou continuer, le choix du pays), puis : trois décisions avant d'acheter
   (cartes de commencerTrois, adaptées au pays par paysPoser), les trois niveaux de l'Académie, les outils à garder sous la
   main en cartes avec icône, et le détail (sept étapes, questionnaire, questions fréquentes) en lignes repliées.
   Contenus et calculs inchangés (parcours.js, app.js, pays.js). Remplace window.pageApprendre. */
const AP4_GARDER = [
  ["/lexique", "listes", "Le lexique", "Chaque chiffre expliqué, avec un exemple réel et des repères."],
  ["/idees-recues", "idees", "Vrai ou faux ?", "Les idées reçues sur la Bourse, face aux chiffres."],
  ["/outils", "epargne", "Les outils", "Simulateurs et comparateurs, avec vos chiffres."],
  ["/pea-cto", "impot", "Quel compte ouvrir ?", "PEA, compte-titres, assurance-vie : ce que chacun change.", "fr"]];
async function pageApprendre4() {
  setTitle("Apprendre la Bourse"); setNav("aca");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([acaLoad(), parParcours(), premStatus().catch(() => null), typeof commencerCharger === "function" ? commencerCharger() : null]);
  const C = typeof COMM !== "undefined" ? COMM : null, fr = typeof e4Fr === "function" ? e4Fr() : true;
  const NV = parNiveaux(), nx = parProchaine(NV), lus = NV.reduce((a, v) => a + v.lus + v.dl, 0), tot = NV.reduce((a, v) => a + v.lec.length + v.dt, 0);
  const prog = lus ? `${lus} leçon${lus > 1 ? "s" : ""} lue${lus > 1 ? "s" : ""} sur ${tot}` : `${tot} leçons de 3 minutes, progression gardée sur cet appareil`;
  const carte = ([h, k, n, d, seul]) => seul === "fr" && !fr ? "" : `<a class="ou4-c" href="${h}">${ou4Ic(k)}<b>${esc(n)}</b><span>${esc(d)}</span><em>Ouvrir →</em></a>`;
  app.innerHTML = `<div class="ek ek-page ap4">
    <section class="ek-hero"><span class="mc-stk">Apprendre</span><h1 class="ag4-t">Savoir lire une entreprise, et choisir son compte.</h1>
      <p class="mc-sub">Trois décisions avant d'acheter, puis trois niveaux de leçons de trois minutes, sans inscription.</p>
      <div class="ap4-go">${nx ? `<a class="ap4-btn" href="${nx.h}">${lus ? "Continuer" : "Commencer"} : ${esc(nx.t)} →</a>` : `<a class="ap4-btn" href="/lexique">Revoir le lexique →</a>`}<span>${esc(prog)}</span></div></section>
    <section class="ek-sec" id="decisions"><span class="ek-stk2 b">Avant d'acheter</span><h2>Trois décisions, dans l'ordre.</h2>${typeof commencerTrois === "function" ? commencerTrois() : ""}</section>
    <section class="ek-sec" id="academie"><span class="ek-stk2 p">L'Académie</span><h2>Trois niveaux, des bases au portefeuille.</h2>
      ${parNiveauxHTML(NV)}
      ${ACA && ACA.formation ? `<a class="ou4-deb ap4-form" href="/academie/formation"><b>La formation guidée</b><span>Six semaines pas à pas, de l'épargne de précaution au premier portefeuille.${isPrem() ? "" : " Premium."}</span><em>Découvrir →</em></a>` : ""}</section>
    <section class="ek-sec"><span class="ek-stk2 b">À garder sous la main</span><h2>Les repères, quand vous en avez besoin.</h2><div class="ou4-g">${AP4_GARDER.map(carte).join("")}</div></section>
    ${C ? `<section class="ek-sec ap4-det" id="detail"><span class="ek-stk2 p">Le détail</span><h2>Pour aller au fond des choses.</h2>${commencerBlocsHTML(C)}</section>` : ""}
    <p class="ek-note">Contenu pédagogique et général, pas un conseil en investissement : pour un conseil adapté à votre situation, adressez-vous à un conseiller en investissements financiers (CIF) enregistré à l'ORIAS. <a class="lnk" href="/methode">Méthode et sources</a></p></div>`;
  if (C && typeof commencerLier === "function") commencerLier(C);
  if (typeof paysPoser === "function") try { paysPoser(); const b = $(".ap4 .pays-bar"), sub = $(".ap4 .ek-hero .mc-sub"); if (b && sub) sub.after(b); } catch (e) { }
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { if (t.tagName === "DETAILS") t.open = true; setTimeout(() => t.scrollIntoView({ block: "start" }), 30); } }
}
window.pageApprendre = pageApprendre4;
