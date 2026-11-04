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
        // 4/11 (Romain) : mettre en avant la notification quand une valeur chute
        if (!P.dem && !$("#pf4chute")) s.insertAdjacentHTML("afterend", typeof isPrem === "function" && isPrem()
          ? `<p class="pf4-chute" id="pf4chute"><span aria-hidden="true">🔔</span> <span>Une de vos lignes chute de plus de 5 % ? Vous recevez une notification le soir même. <a href="/espace/reglages">Notifications sur ce téléphone</a></span></p>`
          : `<p class="pf4-chute" id="pf4chute"><span aria-hidden="true">🔔</span> <span><b>Une de vos lignes chute de plus de 5 % ?</b> Avec Premium, ENKLAIR vous envoie une notification le soir même. <a href="/premium#alertes">Être prévenu</a></span></p>`);
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

/* 4/11 (Premium) : la radiographie détaillée est réservée à Premium. Sans Premium (4/11 : plus de demi-version), chaque tuile garde son titre, sans son chiffre clé ; le détail de quatre tuiles est remplacé par ce qu'il contient et le lien vers Premium.
   Le portefeuille d'exemple reste entièrement ouvert, pour montrer ce que l'on obtient. */
const PF4_PREM = {
  "pf3-possede": "Ce que vous possédez vraiment à travers vos ETF : les entreprises qui reviennent dans plusieurs fonds, réunies, et votre vraie part dans chacune.",
  "pf3-repartition": "Vos expositions par pays, secteur, devise, type et compte, ligne par ligne et à travers le contenu de vos ETF.",
  "pf3-risque": "Ce qu'une baisse de 10, 20 ou 30 % coûterait en euros, ligne par ligne, et les lignes qui pèsent le plus dans le risque.",
  "pf3-dividendes": "Le calendrier de vos dividendes des 12 prochains mois : date, montant attendu par ligne et total par mois."
};
function pf4Verrou(P) {
  if ((typeof isPrem === "function" && isPrem()) || (P && P.dem)) return;
  for (const [id, txt] of Object.entries(PF4_PREM)) {
    const d = document.getElementById(id); if (!d || d.dataset.pf4v) continue;
    d.dataset.pf4v = "1"; d.classList.add("pf4v");
    const s = d.querySelector(":scope>summary"); if (!s) continue;
    [...d.children].forEach(c => { if (c !== s) c.remove(); });
    s.insertAdjacentHTML("beforeend", `<span class="pf4v-b">🔒 Avec Premium</span>`);
    d.insertAdjacentHTML("beforeend", `<div class="pf4v-c"><p>${esc(txt)}</p><p class="pf4v-l">Calculé sur votre portefeuille, avec Premium, comme les alertes sur toutes vos valeurs et les classements complets.</p><a class="ek-btn dk" href="/premium#portefeuille">Voir Premium</a></div>`);
  }
}
if (typeof pf3Dash === "function") { const PF4_dash0 = pf3Dash; pf3Dash = async function (R0, P) { const r = await PF4_dash0.apply(this, arguments); try { pf4Verrou(P); } catch (e) { } return r; }; }
