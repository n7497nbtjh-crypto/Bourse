/* Page Premium, version finale (5/11, maquette validée docs/maquettes/premium-final.html).
   Remplace window.pagePremium (app.js) : bandeau (promesse + trois avantages + choix de la formule), quatre services montrés
   en aperçu avec ce qu'on a « ailleurs », un tableau face aux autres solutions, garanties, dernier appel, questions.
   Logique inchangée : OFFRES (/api/premium/offres), premStatus, moi(), premiumMerci, portail Stripe, code d'accès, code perdu.
   Espace obligatoire avant de payer : sans connexion, le bouton mène à /espace?payer=… (moi() d'app.js envoie ensuite vers Stripe). */
(function () {
  const ancien = window.pagePremium;
  const lien = k => { const l = OFFRES && OFFRES[k]; if (!l) return null; return MOI && MOI.connecte ? l + "?prefilled_email=" + encodeURIComponent(MOI.email || "") : "/espace?payer=" + k; };
  const ok = '<span class="ok">✓</span>', no = '<span class="no">✕</span>', mi = t => `<span class="mi">${t}</span>`;
  // 6/11 (Romain) : deux comparatifs. 1. Gratuit / Premium sur ENKLAIR. 2. ENKLAIR Premium face à la concurrence, avec les prix
  // (relevés le 6/11/2026 : Zonebourse Premium 40 €/mois, Access 24 €/mois ; Simply Wall St Premium 10,95 $/mois ; ChatGPT Plus 22,99 €/mois TTC).
  const VS1 = [
    ["Fiches entreprises complètes (3 300 entreprises face à leurs rivales)", mi("5 par jour"), '<span class="ok">Sans limite</span>'],
    ["Son rang dans son secteur, les 5 classements", no, ok],
    ["Comparer jusqu'à 5 entreprises", mi("3 par semaine"), '<span class="ok">Sans limite</span>'],
    ["Questions à l'IA du site, réponses tirées des comptes officiels", mi("3 par semaine"), '<span class="ok">30 par jour</span>'],
    ["Le rapport de votre semaine, chaque samedi", no, ok],
    ["Alerte le soir même si une de vos valeurs chute de plus de 5 %", no, ok],
    ["Vos ETF aux rayons X : ce que vous possédez vraiment", no, ok],
    ["Brancher Claude ou ChatGPT sur les comptes officiels (connecteur)", no, ok],
    ["Export de vos chiffres (CSV)", no, ok],
    ["Actualité, agenda, outils, Apprendre, portefeuille", ok, ok],
  ];
  const VS2 = [
    ["Prix", '<b>3,25 € par mois</b><small>39 € l\'année, ou 4,90 € par mois</small>', "40 € par mois<small>Premium ; Access 24 €, Expert 199 €</small>", "environ 10 € par mois<small>10,95 $ ; 30 fiches par mois</small>", "22,99 € par mois<small>ChatGPT Plus</small>"],
    ["Chaque chiffre relié au document officiel de l'entreprise", ok, mi("données d'un fournisseur"), mi("données d'un fournisseur"), no],
    ["Chaque entreprise face à la médiane de ses vraies rivales", ok, mi("en partie"), mi("en partie"), mi("de mémoire")],
    ["Expliqué pour quelqu'un qui débute, en français", ok, no, mi("en anglais"), mi("si vous le demandez")],
    ["Le rapport de votre semaine, vos alertes", ok, mi("newsletter, alertes de cours"), mi("alertes"), no],
    ["Une IA qui cite ses sources, 30 questions par jour", ok, no, no, mi("sans source")],
    ["Aucun conseil d'achat ni de vente", ok, mi("conseils et portefeuilles types"), mi("estimations de « juste valeur »"), ok],
  ];
  const av = (num, titre, txt, pts, ailleurs, vis, inv) => `<div class="pm5-av${inv ? " inv" : ""}"><div class="pm5-tx"><p class="pm5-num">${num}</p><h3>${titre}</h3><p class="pm5-lead">${txt}</p>
    <ul>${pts.map(p => `<li>${p}</li>`).join("")}</ul><p class="pm5-gx">${ailleurs}</p></div><div class="pm5-vis">${vis}</div></div>`;
  const lg = (id, ini) => typeof LOGOS !== "undefined" && LOGOS[id] && LOGOS[id].f ? `<span class="pm5-lg"><img src="/logos/${LOGOS[id].f}" alt=""></span>` : `<span class="pm5-lg">${ini}</span>`;

  window.pagePremium = async function (sub) {
    if (sub === "merci") return ancien(sub);
    setTitle("Premium"); setNav("prem");
    app.innerHTML = `<div class="empty">Chargement…</div>`;
    if (!OFFRES) { try { OFFRES = await (await fetch("/api/premium/offres")).json(); } catch (e) { OFFRES = {}; } }
    await moi().catch(() => null); PREM = null; const st = await premStatus();
    try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=premium-vue"); } catch (e) { }
    const nCo = R && R.companies ? R.companies.length : 0, ouvert = !!(OFFRES.mensuel || OFFRES.unique);
    const offre = st.premium ? `<div class="pm5-offre"><h3>Premium est actif</h3><p class="pm5-act">${st.plan === "mensuel" ? "Abonnement mensuel" : st.plan === "essai" ? "Essai gratuit" : "Accès d'un an"}${st.until && st.until < 4e12 ? `, jusqu'au ${new Date(st.until).toLocaleDateString("fr-FR")}` : ""}${st.email ? ` · ${esc(st.email)}` : ""}.</p>
        ${st.plan === "mensuel" ? `<a class="pm5-btn" href="/premium" id="portail">Gérer ou résilier mon abonnement</a>` : ""}<a class="pm5-btn o" href="/espace">Ouvrir mon espace</a><a class="pm5-petit" href="/premium" id="unprem">Retirer l'accès de cet appareil</a></div>`
      : ouvert ? `<div class="pm5-offre"><h3>Choisissez votre formule</h3><div class="pm5-pl" role="radiogroup">
        <div tabindex="0" class="on" data-pm5="unique" role="radio" aria-checked="true"><span class="rd"></span><span><b>Un an <span class="eco">−34 %</span></b><small>Un seul paiement, sans renouvellement</small></span><em>39 €<small>soit 3,25 € par mois</small></em></div>
        <div tabindex="0" data-pm5="mensuel" role="radio" aria-checked="false"><span class="rd"></span><span><b>Mensuel</b><small>Sans engagement</small></span><em>4,90 €<small>par mois</small></em></div></div>
        <a class="pm5-btn y" id="pm5go" href="${esc(lien("unique") || "/premium")}">Passer à Premium →</a>
        <div class="pm5-gar"><span>Résiliable en deux clics</span><span>Paiement sécurisé Stripe</span><span>Sur tous vos appareils</span><span>Accès immédiat</span></div>
        ${MOI && MOI.connecte ? "" : `<p class="pm5-gr">Vous créez d'abord votre espace (adresse et mot de passe) : Premium y est rattaché.</p>`}</div>`
      : `<div class="pm5-offre"><h3>Soyez prévenu à l'ouverture</h3><form id="attf" class="askf" novalidate><input type="email" placeholder="vous@exemple.fr" aria-label="Adresse e-mail" autocomplete="email" required><button class="btn">Prévenez-moi</button></form><p id="attm" class="prem-attm"></p><p id="attn" class="pm5-gr"></p></div>`;
    const vRap = `<div class="pm5-mr"><div class="pm5-mr-h"><small>Exemple · semaine du 28 octobre</small><b>Votre portefeuille a gagné <em>33 €</em> cette semaine.</b></div>
      <div class="pm5-mr-r">${lg("air-liquide", "AL")}<p>Air Liquide<small>Chiffre d'affaires : 7,3 Md€, +4,3 %</small></p><span class="pm5-pv up">+7,5 %</span></div>
      <div class="pm5-mr-r">${lg("lvmh", "LV")}<p>LVMH<small>Rachète ses propres actions</small></p><span class="pm5-pv up">+8,1 %</span></div>
      <div class="pm5-mr-r">${lg("schneider-electric", "SE")}<p>Schneider Electric<small>Accord avec NVIDIA et HPE</small></p><span class="pm5-pv dn">−6,0 %</span></div></div>`;
    const vTel = `<div class="pm5-tel"><div class="pm5-ecr"><p class="pm5-h">18:45<small>Exemple de notification</small></p>
      <div class="pm5-nt"><i>E</i><div><b>ENKLAIR</b> <small>· ce soir</small><p>▼ Une de vos valeurs : −6,2 % aujourd'hui. Un mouvement de cette taille suit souvent une annonce : regardez son actualité.</p></div></div>
      <div class="pm5-nt"><i>E</i><div><b>ENKLAIR</b> <small>· hier</small><p>Une de vos valeurs a publié ses résultats : ventes +12 % sur un an.</p></div></div></div></div>`;
    const vIa = `<div class="pm5-chat"><p class="q">Pourquoi le bénéfice d'Hermès a baissé en 2025 ?</p>
      <div class="r">Les ventes ont progressé de <b>5,5 %</b>, mais le bénéfice net recule de <b>1,7 %</b>, à 4,5 Md€ : l'impôt a pesé davantage (2,3 Md€ contre 1,8). Hermès reste la plus rentable de ses rivales : <b>28 €</b> de bénéfice sur 100 € de ventes.<span class="s">Sources : comptes 2024 et 2025 d'Hermès</span></div>
      <span class="cpt">Exemple de réponse · 30 questions par jour</span></div>`;
    const vPf = `<div class="pm5-mp"><h4>Où est vraiment votre argent <small>exemple</small></h4>
      <div class="bar"><span style="width:52%;background:#3B5BFF"></span><span style="width:31%;background:#FFE14D"></span><span style="width:9%;background:#00A06B"></span><span style="width:8%;background:#DDD"></span></div>
      <div class="lgd"><span style="--c:#3B5BFF">États-Unis 52 %</span><span style="--c:#FFE14D">France 31 %</span><span style="--c:#00A06B">Japon 9 %</span><span style="--c:#DDD">Autres 8 %</span></div>
      <div class="k"><div><small>Si les marchés baissaient de 30 %</small><b class="dn">−2 900 €</b></div><div><small>Dividendes attendus sur un an</small><b>186 €</b></div></div></div>`;
    app.innerHTML = `<div class="ek ek-page pm5">
    <section class="pm5-hero"><div><span class="mc-stk">Premium</span><h1>Ce que votre courtier ne vous dit pas.</h1>
      <p class="pm5-lead">ENKLAIR lit chaque jour les documents officiels de ${F0.format(nCo)} entreprises, les compare à leurs rivales et vous dit ce qui change pour vos placements. En français, sources à l'appui.</p>
      <div class="pm5-b3"><div><i>★</i><p><b>Toutes les fiches, sans limite</b><span>Plus de 3 000 entreprises, chacune face à ses rivales.</span></p></div>
        <div><i>📰</i><p><b>Chaque samedi, votre rapport</b><span>Ce qui s'est passé pour vos valeurs, en deux minutes.</span></p></div>
        <div><i class="r">🔔</i><p><b>Prévenu si une valeur chute</b><span>Plus de 5 % de baisse dans la journée : notification le soir même.</span></p></div>
        <div><i class="b">◎</i><p><b>Vos ETF passés aux rayons X</b><span>Ce que vous possédez vraiment, entreprise par entreprise.</span></p></div></div>
      <a class="pm5-ex" href="/rapport-exemple"><span class="pm5-ex-i">📰</span><span><b>Voir un vrai rapport de la semaine</b><small>Calculé aujourd'hui avec les chiffres du site, pour un portefeuille d'exemple</small></span><em>→</em></a></div>
      ${offre}</section>
    <section class="pm5-sec ek-sec"><span class="ek-stk2 p">Seulement avec Premium</span><h2>Quatre choses que personne d'autre ne fait pour vous.</h2>
      <p class="pm5-lead">Un courtier vous montre des cours. Un site boursier, des articles. Une IA, ce qu'elle a en mémoire. ENKLAIR part des documents officiels et les relie à <b>vos</b> placements.</p>
      ${av("1 · Vos ETF aux rayons X", "Ce que vous possédez vraiment, à travers vos ETF.", "Un ETF Monde, c'est plus de 1 300 entreprises. Premium les additionne avec vos actions pour vous montrer vos vraies expositions.", ["Vos expositions par pays et par secteur", "Ce qu'une forte baisse coûterait, en euros", "Le calendrier de vos dividendes", "Et sans limite : comparaisons, cinq classements, export des chiffres"], "Ailleurs : vous voyez « 1 ligne : ETF Monde », sans savoir ce qu'il y a dedans.", vPf, false)}
      ${av("2 · Votre rapport du samedi", "Le samedi, toute votre semaine en deux minutes.", "Ce que vos entreprises ont publié dans le monde entier, lu dans les documents officiels et traduit en français. Ce qui a fait bouger votre portefeuille. Ce qui arrive.", ["Résultats, rachats d'actions, accords et presse, entreprise par entreprise", "Ce que chaque ligne vous a fait gagner ou perdre, en euros", "Vos prochaines dates : résultats, dividendes, dernier jour pour les toucher"], `Ailleurs : personne ne lit pour vous les annonces de Paris, New York et Oslo.</p><p style="margin:14px 0 0"><a class="pm5-btn o" style="display:inline-flex" href="/rapport-exemple">Voir le rapport d'exemple de cette semaine →</a>`, vRap, true)}
      ${av("3 · Les alertes", "Une de vos valeurs chute ? Vous le savez le soir même.", "ENKLAIR surveille chaque soir votre portefeuille et vos favoris. Pas besoin d'ouvrir le site.", ["Baisse de plus de 5 % dans la journée : notification sur votre téléphone" + (OFFRES.mail ? " et par e-mail" : ""), "Résultats publiés, avec leurs chiffres clés", "Dernier jour pour acheter et toucher un dividende"], "Ailleurs : une alerte de cours, sans vous dire pourquoi.", vTel, false)}
      ${av("4 · L'IA qui cite ses sources", "Posez vos questions, autant que vous voulez.", "Des réponses tirées des comptes officiels et comparées au secteur, avec leurs sources. Et vous pouvez brancher Claude ou ChatGPT sur ENKLAIR.", ["30 questions par jour, au lieu de 3 par semaine", "Chaque chiffre cité avec sa source", "Le connecteur pour votre propre IA"], "Ailleurs : une IA répond de mémoire, sans source ni comparaison au secteur.", vIa, true)}
    </section>
    <section class="pm5-sec ek-sec"><span class="ek-stk2">Gratuit ou Premium</span><h2>Ce que Premium ajoute.</h2>
      <div class="pm5-vsw"><div class="pm5-vs pm5-vs3"><div><span></span><span>ENKLAIR gratuit</span><span>ENKLAIR Premium</span></div>
      ${VS1.map(r => `<div><span>${r[0]}</span>${r.slice(1).map(c => `<span>${c}</span>`).join("")}</div>`).join("")}</div></div>
      <p class="pm5-vsn">En gratuit, l'en-tête et les 5 repères de chaque fiche restent toujours ouverts, ainsi que les entreprises que vous suivez en favori.</p></section>
    <section class="pm5-sec ek-sec"><span class="ek-stk2">Face aux autres</span><h2>Moins cher, et pas le même travail.</h2>
      <div class="pm5-vsw"><div class="pm5-vs pm5-vs5"><div><span></span><span>ENKLAIR Premium</span><span>Zonebourse</span><span>Simply Wall St</span><span>Une IA seule</span></div>
      ${VS2.map(r => `<div><span>${r[0]}</span>${r.slice(1).map(c => `<span>${c}</span>`).join("")}</div>`).join("")}</div></div>
      <p class="pm5-vsn">Prix publics relevés le 6 novembre 2026 sur les sites des éditeurs (Zonebourse : formules Access, Premium et Expert ; Simply Wall St : formule Premium en dollars ; ChatGPT Plus en euros TTC). Les services des autres sites évoluent : vérifiez chez eux avant de choisir.</p></section>
    <section class="pm5-sec ek-sec"><span class="ek-stk2 b">En confiance</span><h2>Simple à prendre, simple à quitter.</h2><div class="pm5-tr">
      <div><i>↺</i><b>Résiliable en deux clics</b><p>Depuis Mon espace. L'accès reste ouvert jusqu'à la fin du mois payé.</p></div>
      <div><i>🔒</i><b>Paiement par Stripe</b><p>ENKLAIR ne voit jamais votre numéro de carte.</p></div>
      <div><i>⚖</i><b>Jamais de conseil d'achat</b><p>De l'information et des explications, pas de recommandation.</p></div>
      <div><i>◎</i><b>Sources officielles</b><p>Chaque chiffre renvoie au document de l'entreprise.</p></div></div></section>
    ${st.premium || !ouvert ? "" : `<section class="pm5-fin"><div><h2>Votre premier rapport arrive samedi.</h2><p>39 € pour un an, ou 4,90 € par mois sans engagement.</p></div><a class="pm5-btn y" href="/premium" id="pm5fin">Passer à Premium →</a></section>`}
    <section class="pm5-sec ek-sec"><span class="ek-stk2">Questions</span><h2>Questions fréquentes.</h2><div class="pm5-faq">
      <details open><summary>Premium donne-t-il des conseils pour acheter ?</summary><p>Non. Premium donne plus de suivi et d'explications, jamais de recommandation d'achat ou de vente. ENKLAIR n'est pas un conseiller en investissement.</p></details>
      <details open><summary>Comment résilier ?</summary><p>Depuis Mon espace, « Gérer ou résilier mon abonnement ». L'accès reste ouvert jusqu'à la fin du mois payé. L'offre d'un an ne se renouvelle pas.</p></details>
      <details><summary>Pourquoi payer si mon IA répond déjà ?</summary><p>Votre IA répond quand vous pensez à lui demander, avec ce qu'elle a en mémoire. ENKLAIR lit les publications officielles chaque jour, compare chaque entreprise à ses rivales, garde vos semaines en mémoire et vous prévient.</p></details>
      <details><summary>Puis-je changer d'avis ?</summary><p>Les conditions de rétractation sont détaillées dans les <a class="lnk" href="/cgv">conditions générales de vente</a>.</p></details>
      <details><summary>J'ai déjà un code d'accès</summary><p>Le code s'affiche après le paiement. Collez-le ici pour activer Premium sur cet appareil.</p><form id="codef" class="askf"><input type="text" placeholder="Votre code" aria-label="Code d'accès" autocomplete="off"><button class="btn">Activer</button></form><p id="codem" class="muted"></p></details>
      <details><summary>J'ai perdu mon code</summary><p>Indiquez l'adresse utilisée pour payer : si un accès actif y correspond, le code vous est renvoyé.</p><form id="lostf" class="askf"><input type="email" placeholder="vous@exemple.fr" aria-label="Adresse e-mail" autocomplete="email"><button class="btn">Recevoir mon code</button></form><p id="lostm" class="muted"></p></details>
    </div></section>
    <p class="pm5-pied">Paiement sécurisé par Stripe. <a class="lnk" href="/cgv">Conditions générales de vente</a> · <a class="lnk" href="/confidentialite">Confidentialité</a> · <a class="lnk" href="/avertissement">Avertissement sur les risques</a></p></div>`;
    // choix de la formule
    let choix = "unique";
    document.querySelectorAll("[data-pm5]").forEach(a => a.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.click(); } });
    document.querySelectorAll("[data-pm5]").forEach(a => a.onclick = e => { e.preventDefault(); choix = a.dataset.pm5;
      document.querySelectorAll("[data-pm5]").forEach(x => { x.classList.toggle("on", x === a); x.setAttribute("aria-checked", x === a); });
      const g = $("#pm5go"); if (g) g.href = lien(choix) || "/premium"; });
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
