/* Page Premium (13/11, recentrage : une seule formule, 19 € par an ; décision de Romain).
   Premium ouvre ce qui est limité en gratuit : toutes les fiches, le rang dans le secteur, les classements, les comparaisons.
   Remplace window.pagePremium (app.js) ; /premium/merci reste dans app.js (premiumMerci).
   Espace obligatoire avant de payer : sans connexion, le bouton mène à /espace?payer=unique (moi() d'app.js envoie ensuite vers Stripe).
   Le bouton n'est ouvert que si le lien de paiement du serveur est au prix affiché (premOuvert d'app.js) ; sinon : « être prévenu ». */
(function () {
  const ancien = window.pagePremium;
  const lien = () => MOI && MOI.connecte ? OFFRES.unique + "?prefilled_email=" + encodeURIComponent(MOI.email || "") : "/espace?payer=unique";
  const ok = '<span class="ok">✓</span>', no = '<span class="no">✕</span>', mi = t => `<span class="mi">${t}</span>`;
  const VS1 = [
    ["Fiches entreprises complètes, chacune face à ses rivales", mi("5 par jour"), '<span class="ok">Sans limite</span>'],
    ["Son rang dans son secteur", no, ok],
    ["Les classements", no, ok],
    ["Comparer jusqu'à 5 entreprises", mi("3 par semaine"), '<span class="ok">Sans limite</span>'],
    ["Actualité expliquée, ETF, agenda des résultats, dividendes, lexique", ok, ok],
  ];
  const PRIX = PREM_PRIX + " €", PAR_MOIS = (PREM_PRIX / 12).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  window.pagePremium = async function (sub) {
    if (sub === "merci") return ancien(sub);
    setTitle("Premium"); setNav("prem");
    app.innerHTML = `<div class="empty">Chargement…</div>`;
    if (!OFFRES) { try { OFFRES = await (await fetch("/api/premium/offres")).json(); } catch (e) { OFFRES = {}; } }
    await moi().catch(() => null); PREM = null; const st = await premStatus();
    try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=premium-vue"); } catch (e) { }
    const nCo = R && R.companies ? R.companies.length : 0, ouvert = premOuvert(OFFRES);
    const offre = st.premium ? `<div class="pm5-offre"><h3>Premium est actif</h3><p class="pm5-act">${st.plan === "mensuel" ? "Abonnement mensuel" : st.plan === "annuel" ? "Abonnement annuel" : st.plan === "essai" ? "Essai gratuit" : st.plan === "proprietaire" ? "Compte du propriétaire" : "Accès d'un an"}${st.until && st.until < 4e12 ? `, jusqu'au ${new Date(st.until).toLocaleDateString("fr-FR")}` : ""}${st.email ? ` · ${esc(st.email)}` : ""}.</p>
        ${(st.plan === "mensuel" || st.plan === "annuel") ? `<a class="pm5-btn" href="/premium" id="portail">Gérer ou résilier mon abonnement</a>` : ""}<a class="pm5-btn o" href="/espace">Ouvrir mon espace</a><a class="pm5-petit" href="/premium" id="unprem">Retirer l'accès de cet appareil</a></div>`
      : ouvert ? `<div class="pm5-offre"><h3>Une seule formule</h3><div class="pm5-pl">
        <div class="on"><span class="rd"></span><span><b>Un an</b><small>Un seul paiement, sans renouvellement</small></span><em>${PRIX}<small>soit ${PAR_MOIS} par mois</small></em></div></div>
        <a class="pm5-btn y" id="pm5go" href="${esc(lien())}">Passer à Premium →</a>
        <div class="pm5-gar"><span>Rien à résilier</span><span>Paiement sécurisé Stripe</span><span>Sur tous vos appareils</span><span>Accès immédiat</span></div>
        ${MOI && MOI.connecte ? "" : `<p class="pm5-gr">Vous créez d'abord votre espace (adresse et mot de passe) : Premium y est rattaché.</p>`}</div>`
      : `<div class="pm5-offre"><h3>${PRIX} par an, bientôt ouvert</h3><p class="pm5-gr">La formule ouvre dans quelques jours. Laissez votre adresse pour être prévenu.</p><form id="attf" class="askf" novalidate><input type="email" placeholder="vous@exemple.fr" aria-label="Adresse e-mail" autocomplete="email" required><button class="btn">Prévenez-moi</button></form><p id="attm" class="prem-attm"></p><p id="attn" class="pm5-gr"></p></div>`;
    app.innerHTML = `<div class="ek ek-page pm5">
    <section class="pm5-hero"><div><span class="mc-stk">Premium</span><h1>Tout ENKLAIR, sans limite.</h1>
      <p class="pm5-lead">ENKLAIR lit les documents officiels de ${F0.format(nCo)} entreprises et place chacune face à ses rivales. Premium ouvre tout, pour ${PRIX} par an.</p>
      <div class="pm5-b3"><div><i>★</i><p><b>Toutes les fiches, sans limite</b><span>Plus de 3 000 entreprises, chacune face à la médiane de ses rivales.</span></p></div>
        <div><i class="b">◎</i><p><b>Les classements</b><span>Les entreprises classées, et le rang de chacune dans son secteur.</span></p></div>
        <div><i class="r">⇄</i><p><b>Comparer sans limite</b><span>Jusqu'à 5 entreprises côte à côte, autant de fois que vous voulez.</span></p></div></div></div>
      ${offre}</section>
    <section class="pm5-sec ek-sec"><span class="ek-stk2">Gratuit ou Premium</span><h2>Ce que Premium ajoute.</h2>
      <div class="pm5-vsw"><div class="pm5-vs pm5-vs3"><div><span></span><span>ENKLAIR gratuit</span><span>ENKLAIR Premium</span></div>
      ${VS1.map(r => `<div><span>${r[0]}</span>${r.slice(1).map(c => `<span>${c}</span>`).join("")}</div>`).join("")}</div></div>
      <p class="pm5-vsn">En gratuit, l'en-tête et les 5 repères de chaque fiche restent toujours ouverts, ainsi que les entreprises que vous suivez en favori.</p></section>
    <section class="pm5-sec ek-sec"><span class="ek-stk2 b">En confiance</span><h2>Simple à prendre, rien à résilier.</h2><div class="pm5-tr">
      <div><i>↺</i><b>Un seul paiement</b><p>${PRIX} pour un an. Rien n'est prélevé ensuite.</p></div>
      <div><i>🔒</i><b>Paiement par Stripe</b><p>ENKLAIR ne voit jamais votre numéro de carte.</p></div>
      <div><i>⚖</i><b>Jamais de conseil d'achat</b><p>De l'information et des explications, pas de recommandation.</p></div>
      <div><i>◎</i><b>Sources officielles</b><p>Chaque chiffre renvoie au document de l'entreprise.</p></div></div></section>
    ${st.premium || !ouvert ? "" : `<section class="pm5-fin"><div><h2>Toutes les fiches, dès maintenant.</h2><p>${PRIX} pour un an, en un seul paiement.</p></div><a class="pm5-btn y" href="/premium" id="pm5fin">Passer à Premium →</a></section>`}
    <section class="pm5-sec ek-sec"><span class="ek-stk2">Questions</span><h2>Questions fréquentes.</h2><div class="pm5-faq">
      <details open><summary>Premium donne-t-il des conseils pour acheter ?</summary><p>Non. Premium ouvre plus de fiches, de classements et de comparaisons, jamais de recommandation d'achat ou de vente. ENKLAIR n'est pas un conseiller en investissement.</p></details>
      <details open><summary>Que se passe-t-il au bout d'un an ?</summary><p>L'accès s'arrête, sans prélèvement. Vous le reprenez si vous le souhaitez.</p></details>
      <details><summary>Puis-je changer d'avis ?</summary><p>Les conditions de rétractation sont détaillées dans les <a class="lnk" href="/cgv">conditions générales de vente</a>.</p></details>
      <details><summary>J'ai déjà un code d'accès</summary><p>Le code s'affiche après le paiement. Collez-le ici pour activer Premium sur cet appareil.</p><form id="codef" class="askf"><input type="text" placeholder="Votre code" aria-label="Code d'accès" autocomplete="off"><button class="btn">Activer</button></form><p id="codem" class="muted"></p></details>
      <details><summary>J'ai perdu mon code</summary><p>Indiquez l'adresse utilisée pour payer : si un accès actif y correspond, le code vous est renvoyé.</p><form id="lostf" class="askf"><input type="email" placeholder="vous@exemple.fr" aria-label="Adresse e-mail" autocomplete="email"><button class="btn">Recevoir mon code</button></form><p id="lostm" class="muted"></p></details>
    </div></section>
    <p class="pm5-pied">Paiement sécurisé par Stripe. <a class="lnk" href="/cgv">Conditions générales de vente</a> · <a class="lnk" href="/confidentialite">Confidentialité</a> · <a class="lnk" href="/avertissement">Avertissement sur les risques</a></p></div>`;
    const F = $("#pm5fin"); if (F) F.onclick = e => { e.preventDefault(); const g = $("#pm5go"); if (g) g.scrollIntoView({ block: "center", behavior: "smooth" }); };
    const P = $("#portail"); if (P) P.onclick = async e => { e.preventDefault(); try { const j = await (await iaFetch("/api/premium/portail")).json(); if (j.url) location.href = j.url; else toast(esc(j.error || "Le portail n'a pas pu s'ouvrir.")); } catch (x) { toast("Le site est injoignable : réessayez."); } };
    const U = $("#unprem"); if (U) U.onclick = e => { e.preventDefault(); setPremTok(""); document.documentElement.classList.remove("is-prem"); pagePremium(); };
    const AF = $("#attf"), AM = $("#attm"); if (AF) AF.onsubmit = async e => { e.preventDefault(); const em = AF.querySelector("input").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { AM.textContent = "Cette adresse ne semble pas valide : vérifiez-la."; return; }
      try { const j = await (await fetch("/api/premium/attente", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: em }) })).json(); AM.textContent = j.ok ? "C'est noté. Vous serez prévenu à l'ouverture." : (j.error || "Réessayez dans un moment."); } catch (x) { AM.textContent = "Le site est injoignable : réessayez."; } };
    $("#codef").onsubmit = async e => { e.preventDefault(); const v = $("#codef input").value.trim().replace(/[^a-f0-9]/gi, "").toLowerCase(); if (v.length < 20) { $("#codem").textContent = "Ce code ne semble pas complet."; return; }
      setPremTok(v); const s = await premStatus(); if (s.premium) { toast("Premium est activé sur cet appareil."); MOI = null; await moi(true).catch(() => null); pagePremium(); } else { setPremTok(""); $("#codem").textContent = "Ce code n'est pas reconnu ou l'accès a expiré."; } };
    $("#lostf").onsubmit = async e => { e.preventDefault(); const v = $("#lostf input").value.trim(); if (!/@/.test(v)) return;
      if (!OFFRES.mail) { $("#lostm").innerHTML = `Connectez-vous à <a class="lnk" href="/espace">votre espace</a> : votre abonnement y est rattaché, sans code.`; return; } // pas encore d'envoi d'e-mails
      try { const j = await (await fetch("/api/premium/retrouver", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: v }) })).json(); $("#lostm").textContent = j.error || "Si un accès actif correspond à cette adresse, le code vient de vous être envoyé."; } catch (x) { $("#lostm").textContent = "Le site est injoignable : réessayez."; } };
  };
})();
