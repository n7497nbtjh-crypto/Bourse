/* ---------- « Vérifier une offre » v4 (3/11/2026), même direction que les autres pages v4 ----------
   /outils/verifier. En-tête jaune : la question en titre, la grande barre de recherche, la fraîcheur de la liste.
   Le verdict s'affiche en grande carte juste sous la recherche (signalé / pas sur la liste, mais… / recherche insuffisante).
   Puis : les signaux qui doivent alerter (cartes à icône), où vérifier qu'un acteur est autorisé (cartes-liens), le numéro de l'AMF.
   Recherche inchangée : provLnIndex, provLnCherche, provLnCat (m/provenance.js), liste /data/listes-noires.json.
   Remplace outilVerifier (appelée par pageOutils("verifier")). */
OU4_I.tel = "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z";
OU4_I.alerte = "M12 3l9 16H3zM12 10v4M12 17v.5";
const VF4_SIG = [
  ["epargne", "Un rendement élevé et garanti", "En Bourse, un rendement élevé s'accompagne toujours d'un risque de perte. « Garanti » et « 10 % par mois » ne vont pas ensemble."],
  ["tel", "Un contact que vous n'avez pas demandé", "Appel, message privé, réseau social, puis une pression pour décider vite : « l'offre expire ce soir »."],
  ["div", "Un paiement inhabituel", "Virement vers un compte à l'étranger, cryptomonnaie, carte cadeau : des moyens de paiement presque impossibles à récupérer."],
  ["alerte", "Un nom qui ressemble à un autre", "Une société introuvable dans les registres officiels, ou au nom proche d'une banque ou d'une institution connue."]];
const VF4_REG = [
  ["https://www.regafi.fr", "REGAFI", "Banques, entreprises d'investissement et prestataires de paiement autorisés en France."],
  ["https://www.orias.fr", "ORIAS", "Conseillers en investissements financiers et intermédiaires immatriculés."],
  ["https://www.amf-france.org", "Listes blanches de l'AMF", "Prestataires sur crypto-actifs agréés, sociétés de gestion, financement participatif autorisé."]];
async function outilVerifier4() {
  setTitle("Vérifier un site ou une offre"); setNav("sim");
  app.innerHTML = `<div class="ek ek-page vf4">
    <section class="ek-hero"><span class="mc-stk">Vérifier une offre</span><h1 class="ag4-t">Ce site est-il signalé par l'AMF ?</h1>
      <p class="mc-sub">Une publicité promet 10 % par mois, un « conseiller » vous écrit sur WhatsApp ? Tapez son nom, son site ou son adresse e-mail.</p>
      <form id="lnf" class="vf-f" role="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input id="lnq" class="el-in" type="search" autocomplete="off" placeholder="ex. invest-profit-plus.com" aria-label="Nom exact, site internet ou adresse e-mail"><button type="submit">Vérifier</button></form>
      <p class="vf-s" id="lns">Chargement des listes…</p>
      <div id="lnr" aria-live="polite"></div></section>
    <section class="ek-sec"><span class="ek-stk2 p">Les signaux d'alerte</span><h2>Quatre signes qui doivent vous arrêter.</h2>
      <div class="ou4-g vf-g">${VF4_SIG.map(([k, t, d]) => `<div class="ou4-c vf-c">${ou4Ic(k)}<b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div></section>
    <section class="ek-sec"><span class="ek-stk2 b">Avant de verser de l'argent</span><h2>Vérifiez que l'acteur est autorisé.</h2>
      <p class="vf-lead">Ne pas figurer sur une liste noire ne prouve pas qu'une offre est fiable : les listes ne recensent que les acteurs déjà signalés, et un site frauduleux change souvent de nom.</p>
      <div class="ou4-g">${VF4_REG.map(([u, t, d]) => `<a class="ou4-c" href="${u}" target="_blank" rel="noopener">${ou4Ic("verif")}<b>${esc(t)}</b><span>${esc(d)}</span><em>Consulter ↗</em></a>`).join("")}
        <a class="ou4-c vf-tel" href="tel:+33153456200">${ou4Ic("tel")}<b>Un doute ? Appelez l'AMF</b><span>AMF Épargne Info Service, du lundi au vendredi.</span><em>01 53 45 62 00</em></a></div></section></div>`;
  if (typeof LN === "undefined" || !LN) { try { LN = await (await fetch("/data/listes-noires.json")).json(); } catch (e) { LN = { items: [] }; } }
  if (!$("#lnq")) return;
  const IDX = provLnIndex(LN.items || []), jo = LN.updated ? provJoursOuvres(LN.updated) : null, vieux = jo != null && jo > 3;
  const maj = LN.updated ? `mise à jour le ${dLabel(LN.updated)}` : "date de mise à jour inconnue";
  $("#lns").innerHTML = IDX.length ? `<b>${F0.format(IDX.length)}</b> acteurs signalés dans les listes noires de l'AMF, ${maj}${vieux ? ` <b class="prov-stale">(pas de mise à jour depuis ${jo} jours ouvrés : les inscriptions récentes peuvent manquer)</b>` : ""}. ${LN.source ? `<a class="lnk" href="${esc(LN.source)}" target="_blank" rel="noopener">Source</a>` : ""}`
    : "Les listes noires ne sont pas disponibles pour le moment : consultez directement le site de l'AMF.";
  const q = $("#lnq"), box = $("#lnr");
  const carte = (cl, ic, t, corps) => `<div class="vf-v ${cl}" ${cl === "r" ? 'role="alert"' : ""}><span class="vf-i">${ic}</span><div><b class="vf-t">${t}</b>${corps}</div></div>`;
  const run = () => {
    const v_ = q.value.trim(); if (!v_) { box.innerHTML = ""; return; }
    if (!IDX.length) { box.innerHTML = carte("i", "!", "Recherche impossible pour le moment.", `<p>Les listes n'ont pas pu être chargées : consultez le site de l'AMF.</p>`); return; }
    const R0 = provLnCherche(v_, IDX);
    if (R0.issue === "trouve") {
      const h = R0.hits, n = h.length;
      box.innerHTML = carte("r", "✕", `Signalé par l'AMF${n > 1 ? ` : ${n > 12 ? `${n} entrées, les 12 premières affichées` : `${n} entrées`}` : ""}.`,
        `<p>L'AMF signale cet acteur comme non autorisé à proposer des produits ou services financiers en France. <b>Ne versez pas d'argent.</b> Si c'est déjà fait, contactez votre banque au plus vite et signalez-le à l'AMF.</p>
        <div class="vf-hits">${h.slice(0, 12).map(x => `<div><b>${esc(x.n || x.s)}</b>${x.s && x.n ? ` <span>${esc(x.s)}</span>` : ""}<small>${esc(provLnCat(x.c))}${x.d ? ` · inscrit le ${esc(/^\d{4}-\d{2}-\d{2}$/.test(x.d) ? dLabel(x.d) : x.d)}` : ""}</small></div>`).join("")}</div>`);
    } else if (R0.issue === "insuffisant") {
      box.innerHTML = carte("i", "?", "Recherche insuffisante.", `<p>${R0.raison === "court" ? "La saisie est trop courte pour identifier un acteur : tapez au moins 4 caractères." : R0.raison === "trop" ? `Ce terme apparaît dans ${F0.format(R0.n)} entrées : il est trop général pour conclure. Tapez le nom exact, l'adresse du site ou l'adresse e-mail.` : "Ces mots sont trop courants pour conclure : tapez le nom exact, l'adresse du site ou l'adresse e-mail."} Et même absent des listes, un acteur ne prouve pas ainsi qu'il est fiable.</p>`);
    } else {
      box.innerHTML = carte("n", "–", "Pas sur les listes noires de l'AMF. Ce n'est pas une garantie.", `<p>Être absent des listes ne prouve pas qu'une offre est fiable : elles ne contiennent que les acteurs déjà signalés, et les escrocs changent souvent de nom. Vérifiez que l'acteur figure sur REGAFI, sur l'ORIAS ou sur une liste blanche de l'AMF (plus bas), et relisez les quatre signaux d'alerte.</p>`);
    }
  };
  let tm = 0; q.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 250); };
  $("#lnf").onsubmit = ev => { ev.preventDefault(); clearTimeout(tm); run(); };
}
window.outilVerifier = outilVerifier4;
