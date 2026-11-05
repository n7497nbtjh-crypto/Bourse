/* ---------- Les idées reçues v4 (3/11/2026), même direction que les autres pages v4 ----------
   /idees-recues. En-tête jaune : le nombre d'idées en titre, le sommaire en cartes (numéro, phrase, tampon du verdict).
   Puis une carte par idée : la phrase en grand, le tampon penché (Faux, Plutôt faux, Vrai en partie), la réponse,
   « À retenir » en jaune, quatre plis (pourquoi on y croit, les données, les nuances, un exemple), liens et sources.
   Contenus et chiffres inchangés : commIdees, COMM_VERDICT, commIrPane, COMM_IR_ETAPES, commSrcHTML (m/communication.js).
   Remplace pageIdeesRecues ; la carte seule de l'accueil et d'Apprendre (commIdeeCarte) ne change pas. */
const IR4_C = { faux: "f", pfaux: "p", partie: "v" };
function ir4Carte(x, i, L) {
  const [vt] = COMM_VERDICT[x.v] || ["", ""];
  return `<article class="ir ir4" id="${x.id}" data-ir="${x.id}">
    <div class="ir4-h"><span class="ir4-n">${String(i + 1).padStart(2, "0")}</span><p class="ir4-m">« ${esc(x.mythe.replace(/\.$/, ""))} »</p><span class="ir4-v ${IR4_C[x.v] || ""}">${esc(vt)}</span></div>
    <p class="ir4-r">${x.rep}</p>
    <div class="ir4-ret"><b>À retenir</b><p>${x.retenir}</p></div>
    <div class="ir4-plis">${COMM_IR_ETAPES.map(([k, t]) => `<details class="ir4-pli"><summary>${t}</summary><div class="ir-pane">${commIrPane(x, k)}</div></details>`).join("")}</div>
    <div class="ir4-f"><div class="ir4-go">${x.liens.map(([l, h]) => `<a href="${h}">${esc(l)} →</a>`).join("")}</div><details class="ir4-src"><summary>Sources</summary>${commSrcHTML(x.src)}</details></div>
    <nav class="ir4-nav">${i > 0 ? `<a href="#${L[i - 1].id}" data-ir4="${L[i - 1].id}">← Idée précédente</a>` : "<span></span>"}<span>${i + 1} sur ${L.length}</span>${i < L.length - 1 ? `<a href="#${L[i + 1].id}" data-ir4="${L[i + 1].id}">Idée suivante →</a>` : "<span></span>"}</nav>
  </article>`;
}
function pageIdeesRecues4() {
  setTitle("Les idées reçues sur la Bourse, face aux chiffres"); setNav("sim");
  const L = commIdees(), n = { faux: 0, pfaux: 0, partie: 0 }; L.forEach(x => n[x.v] = (n[x.v] || 0) + 1);
  app.innerHTML = `<div class="ek ek-page ir4-page">
    <section class="ek-hero"><span class="mc-stk">Idées reçues</span><h1 class="ag4-t">${L.length} phrases qu'on entend, face aux chiffres.</h1>
      <p class="mc-sub">Pour chacune : la réponse, ce qu'il faut retenir, puis le détail si vous voulez (pourquoi on y croit, les données, les nuances, un exemple). Chiffres officiels, sources à l'appui.</p>
      <p class="ir4-tot">${[["faux", "fausses"], ["pfaux", "plutôt fausses"], ["partie", "vraies en partie"]].filter(([k]) => n[k]).map(([k, l]) => `<span class="ir4-v ${IR4_C[k]}">${n[k]} ${l}</span>`).join("")}</p>
      <div class="ir4-som">${L.map((x, i) => `<a href="#${x.id}" data-ir4="${x.id}"><span class="ir4-n">${String(i + 1).padStart(2, "0")}</span><b>« ${esc(x.mythe.replace(/\.$/, ""))} »</b><span class="ir4-v ${IR4_C[x.v] || ""}">${esc((COMM_VERDICT[x.v] || [""])[0])}</span></a>`).join("")}</div></section>
    <section class="ek-sec ir4-list">${L.map((x, i) => ir4Carte(x, i, L)).join("")}</section>
    <section class="ek-sec"><span class="ek-stk2 b">Pour aller plus loin</span><h2>Apprendre, à votre rythme.</h2>
      <div class="ou4-g">${[["/apprendre", "idees", "Le parcours pour apprendre", "Trois niveaux de leçons de trois minutes."], ["/livret-a-ou-bourse", "epargne", "Livret A ou Bourse", "Le comparateur, avec vos montants."], ["/academie/psychologie", "alerte", "Psychologie et pièges", "Les erreurs que tout le monde fait, et comment les éviter."], ["/avertissement", "verif", "Les risques", "Ce qu'il faut savoir avant d'investir."]].map(([h, k, t, d]) => `<a class="ou4-c" href="${h}">${ou4Ic(k)}<b>${esc(t)}</b><span>${esc(d)}</span><em>Ouvrir →</em></a>`).join("")}</div>
      <p class="ek-note">Ces réponses sont générales : elles ne tiennent pas compte de votre situation et ne sont pas des conseils en investissement. Pour un conseil personnalisé, adressez-vous à un conseiller en investissements financiers enregistré auprès de l'ORIAS.</p></section></div>`;
  commListeNoire().then(x => { $$(".cm-ln").forEach(el => { if (x) el.textContent = F0.format(x.n); }); });
  // 5/11 (Romain : « pas toutes à la suite, ça donne mal à la tête ») : une seule idée à l'écran, choisie dans le sommaire
  const h = location.hash.slice(1); ir4Voir(L.some(x => x.id === h) ? h : L[0].id, !!h);
}
function ir4Voir(id, defiler) {
  $$(".ir4-list .ir4").forEach(a => a.classList.toggle("on", a.id === id));
  $$(".ir4-som a").forEach(a => a.classList.toggle("on", a.dataset.ir4 === id));
  if (defiler) { const t = document.getElementById(id); if (t) setTimeout(() => t.scrollIntoView({ block: "start", behavior: "smooth" }), 0); }
}
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("[data-ir4]"); if (!a || !document.querySelector(".ir4-page")) return;
  e.preventDefault(); history.replaceState({}, "", "#" + a.dataset.ir4); ir4Voir(a.dataset.ir4, true); });
window.pageIdeesRecues = pageIdeesRecues4;
