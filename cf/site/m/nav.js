/* Module « nav » de bilan. : la navigation du site, définie une seule fois.
   Chargé en dernier (après monia.js), il remplit lui-même les quatre zones qui montrent le menu :
   la barre du haut (#nav), le menu du téléphone (#mpanel), le pied de page (#footnav) et le plan du site (/plan).
   Avant, le menu était écrit dans index.html puis complété par m/outils.js, m/reco.js et m/orchestre.js (26 entrées,
   4 endroits). Ici, une seule table : NAV. Quatre entrées : Découvrir, Explorer, Analyser, Mon espace.
   Aucune page ne disparaît : ce qui n'est pas dans les liens principaux reste dans la ligne « Aussi » de sa rubrique,
   dans le plan du site et dans le pied de page.
   Accès directs gardés dans la barre : « ✦ Demander à l'IA », « ★ Favoris » (avec son compteur) et Premium. */

/* ---------- La table du menu ----------
   [chemin, libellé, explication]. « aussi » = pages de la rubrique qui ne sont pas dans les liens principaux. */
const NAV = [
  {
    k: "dec", label: "Découvrir", sous: "Apprendre la Bourse, dans l'ordre",
    items: [
      ["/apprendre", "Apprendre pas à pas", "Trois niveaux, des bases aux sujets avancés"],
      ["/commencer", "Par où commencer", "Le guide en sept étapes, dans l'ordre"],
      ["/academie", "L'Académie", "Le programme complet, par niveau, avec des quiz"],
      ["/idees-recues", "Vrai ou faux ?", "Les idées reçues, vérifiées avec des chiffres"],
      ["/lexique", "Le lexique", "Chaque chiffre de la Bourse expliqué"],
      ["/pea-cto", "PEA, compte-titres, assurance-vie", "Ce qu'on peut y mettre, et l'impôt en 2026"],
    ],
    aussi: [
      ["/academie/express", "L'essentiel en trois étapes"],
      ["/livret-a-ou-bourse", "Livret A ou Bourse"],
      ["/repartitions", "Répartitions types"],
      ["/pourquoi-bilan", "Pourquoi bilan."],
      ["/methode", "Méthode et sources"],
    ],
  },
  {
    k: "exp", label: "Explorer", sous: "Les marchés, les entreprises, les ETF",
    items: [
      ["/marches", "Les marchés du jour", "Indices, plus fortes hausses et baisses"],
      ["/entreprises", "Les entreprises", "Leurs comptes comparés à la médiane de leur secteur"],
      ["/etf", "Les ETF", "Fonds indiciels : ce qu'ils contiennent, leurs frais"],
      ["/actualites", "Actualités", "Annonces officielles lues, chiffrées et expliquées"],
      ["/agenda", "Agenda et dividendes", "Résultats, assemblées et versements à venir"],
      ["/communaute", "Communauté", "Questions et analyses des visiteurs"],
    ],
    aussi: [
      ["/classements", "Classements des entreprises"],
      ["/decouvertes", "Découvertes du jour"],
      ["/dividendes", "Calendrier des dividendes"],
      ["/hier", "Ce qui s'est passé hier"],
    ],
  },
  {
    k: "ana", label: "Analyser", sous: "Comparer, simuler, vérifier",
    items: [
      ["/comparer", "Comparer des entreprises", "Plusieurs entreprises côte à côte, critère par critère"],
      ["/portefeuille", "Mon portefeuille", "Ce que vous possédez vraiment : frais, doublons, dividendes"],
      ["/simulateurs/epargne", "Simulateurs", "Épargne, frais du courtier, PEA ou compte-titres"],
      ["/outils/verifier", "Vérifier une offre", "Un nom comparé aux listes noires de l'AMF"],
    ],
    aussi: [
      ["/outils/si-javais", "Et si j'avais investi ?"],
      ["/outils/recouvrement", "Deux ETF se recouvrent-ils ?"],
      ["/repartitions", "Répartitions types et listes par critères"],
      ["/demander", "Demander à l'IA"],
      ["/outils", "Tous les outils"],
    ],
  },
  {
    k: "esp", label: "Mon espace", sous: "Ce que vous suivez", compte: true,
    items: [
      ["/espace", "@esp", "Votre bilan de la semaine : variations, annonces et dates de ce que vous suivez"],
      ["/favoris", "Mes favoris", "Les entreprises et ETF que vous suivez"],
      ["/portefeuille", "Mon portefeuille", "Vos lignes, leurs frais et leur diversification"],
      ["/espace/alertes", "Mes alertes", "Ce que le site vous signale, et les notifications"],
      ["/espace/ia", "L'IA du site", "Gratuite, sans compte ni clé, à partir des données du site"],
      ["/espace/reglages", "Réglages", "Compte, appareils, application"],
      ["/premium", "Premium", "Plus d'Académie, d'alertes et d'historique"],
    ],
    aussi: [
      ["/espace/rapport", "Régler mon bilan de la semaine"],
      ["/connecteur", "Utiliser bilan. dans ChatGPT ou Claude"],
    ],
  },
];
// Pied de page : pages institutionnelles, hors navigation principale
const NAV_PIED = [["/methode", "Méthode et sources"], ["/pourquoi-bilan", "Pourquoi bilan."], ["/connecteur", "Connecteur ChatGPT et Claude"], ["/premium", "Premium"],
  ["/mentions-legales", "Mentions légales"], ["/cgv", "CGV"], ["/confidentialite", "Confidentialité"], ["/avertissement", "Avertissement sur les risques"]];
// setNav("xxx") → rubrique à souligner dans la barre (clés utilisées par les pages du site)
const NAV_G = { home: "", aca: "dec", new: "dec", lex: "dec", mkt: "exp", news: "exp", ent: "exp", etf: "exp", com: "exp", sim: "ana", pf: "ana", fav: "esp", esp: "esp", ia: "", prem: "" };

/* ---------- Construction ---------- */
const navEsc = s => (typeof esc === "function" ? esc(s) : String(s));
const navLib = t => t === "@esp" ? `<span class="esplbl">Se connecter</span>` : navEsc(t); // « Se connecter » ou « Mon espace » selon la session (espaceBadge)
function navMenuHTML(g) { // panneau déroulant d'une rubrique (ordinateur)
  return `<div class="ddm">${g.items.map(([h, t, d]) => `<a href="${h}"><b>${navLib(t)}</b><span>${navEsc(d)}</span></a>`).join("")}
    ${g.aussi && g.aussi.length ? `<p class="ddx">Aussi : ${g.aussi.map(([h, t]) => `<a href="${h}">${navEsc(t)}</a>`).join("")}</p>` : ""}</div>`;
}
function navBarreHTML() {
  const esp = NAV.find(g => g.compte);
  return NAV.filter(g => !g.compte).map(g => `<div class="dd" data-g="${g.k}"><button type="button" aria-expanded="false">${navEsc(g.label)}</button>${navMenuHTML(g)}</div>`).join("")
    + `<a href="/demander" data-nav="ia" class="navia" title="Poser une question : la réponse est calculée sur les comptes officiels">✦ Demander à l'IA</a>`
    + `<a href="/favoris" data-nav="fav" class="navfav" title="Mes favoris"><span class="st">★</span><span class="lb">Favoris</span><span class="favn"></span></a>`
    + (esp ? `<div class="dd" data-g="esp"><button type="button" aria-expanded="false">Mon espace<span class="espn"></span></button>${navMenuHTML(esp)}</div>` : "")
    + `<a href="/premium" data-nav="prem" class="navprem">Premium</a>`;
}
function navPanneauHTML() { // menu du téléphone
  return `<a href="/demander"><b>✦ Demander à l'IA</b></a><a href="/favoris"><b>★ Mes favoris</b> <span class="favn"></span></a><a href="/espace"><b class="esplbl">Se connecter</b> <span class="espn"></span></a>`
    + NAV.map(g => `<p class="mg">${navEsc(g.label)}</p>${g.items.filter(([h, t]) => t !== "@esp" && h !== "/favoris").map(([h, t]) => `<a href="${h}">${navEsc(t)}</a>`).join("")}${g.aussi && g.aussi.length ? `<p class="mx">${g.aussi.map(([h, t]) => `<a href="${h}">${navEsc(t)}</a>`).join("")}</p>` : ""}`).join("");
}
function navPiedHTML() { // pied de page : plan du site en quatre colonnes, puis les pages institutionnelles
  return `<nav class="navpied" aria-label="Plan du site">${NAV.map(g => `<div><p>${navEsc(g.label)}</p>${[...g.items, ...(g.aussi || [])].map(([h, t]) => `<a href="${h}">${navEsc(t === "@esp" ? "Mon espace" : t)}</a>`).join("")}</div>`).join("")}</nav>
    <div class="navlg">${NAV_PIED.map(([h, t]) => `<a href="${h}">${navEsc(t)}</a>`).join("")}</div>`;
}
function navRemplir() {
  const n = document.getElementById("nav"); if (n) n.innerHTML = navBarreHTML();
  const m = document.getElementById("mpanel"); if (m) m.innerHTML = navPanneauHTML();
  const f = document.getElementById("footnav"); if (f) f.innerHTML = navPiedHTML();
  const mr = document.querySelector(".mright"); // téléphone : étoile avec le compteur, à côté de « Chercher » et « Menu »
  if (mr && !mr.querySelector(".mfav")) mr.insertAdjacentHTML("afterbegin", `<a class="mbtn mfav" href="/favoris" aria-label="Mes favoris"><span class="st">★</span><span class="favn"></span></a>`);
  if (typeof favCount === "function") try { favCount(); } catch (e) { }
  if (typeof espaceBadge === "function") try { espaceBadge(); } catch (e) { }
}
// Rubrique soulignée : remplace setNav() d'index.html (une seule table de correspondance)
function navRubrique(path) { // la rubrique du menu qui contient cette adresse (la plus longue correspondance)
  let best = null, len = 0;
  for (const g of NAV) for (const [h] of [...g.items, ...(g.aussi || [])]) { const hp = h.split(/[?#]/)[0]; if ((path === hp || path.startsWith(hp + "/")) && hp.length > len) { best = g.k; len = hp.length; } }
  return best;
}
function setNav(k) {
  const g = (k ? navRubrique(location.pathname) : null) || NAV_G[k] || "-";
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.nav === k));
  document.querySelectorAll("#nav .dd").forEach(d => { d.classList.remove("open"); d.classList.toggle("on", d.dataset.g === g); });
}

/* ---------- Plan du site : /plan ---------- */
function pagePlan() {
  setTitle("Plan du site"); setNav("");
  app.innerHTML = `<div class="legal"><p class="kick">Toutes les pages</p><h1 class="pagetitle">Plan du site</h1>
    <p class="pagesub">Les quatre rubriques du site et toutes leurs pages. Les fiches d'entreprises et d'ETF s'ouvrent depuis la recherche, en haut de chaque page.</p>
    ${NAV.map(g => `<section class="panel"><div class="ph"><h2>${navEsc(g.label)}</h2><span class="light" style="font-size:12.5px">${navEsc(g.sous)}</span></div><div class="pb"><div class="navplan">
      ${g.items.map(([h, t, d]) => `<a href="${h}"><b>${navEsc(t === "@esp" ? "Mon espace" : t)}</b><small>${navEsc(d)}</small></a>`).join("")}
      ${(g.aussi || []).map(([h, t]) => `<a href="${h}"><b>${navEsc(t)}</b></a>`).join("")}</div></div></section>`).join("")}
    <section class="panel"><div class="ph"><h2>Le site</h2></div><div class="pb"><div class="navplan">${NAV_PIED.map(([h, t]) => `<a href="${h}"><b>${navEsc(t)}</b></a>`).join("")}</div></div></section></div>`;
}
if (typeof ROUTES_EXTRA !== "undefined") ROUTES_EXTRA.push([/^\/plan$/, () => pagePlan()]);

/* ---------- Ancienne adresse /simulateurs/passe ----------
   Elle affichait le simulateur d'épargne sans le dire (audit P2-6). Le worker la redirige en 301 ;
   ici, l'enveloppe sert aux liens internes et au retour en arrière. pageSim vient de m/outils2.js (chargé avant). */
const navSimAvant = typeof pageSim === "function" ? pageSim : null;
if (navSimAvant) window.pageSim = function (tool) {
  if (tool === "passe") { history.replaceState({}, "", "/outils/si-javais"); return route(); }
  return navSimAvant(tool);
};

/* ---------- Style ---------- */
document.head.insertAdjacentHTML("beforeend", `<style id="nav-css">
#nav .ddm{min-width:320px}
#nav .ddx{margin:6px 4px 2px;padding-top:8px;border-top:1px solid var(--line2,#EDE8DD);font-size:12.5px;color:var(--light);line-height:1.6}
#nav .ddx a{display:inline;padding:0;border:0;font-size:12.5px;color:var(--grey);text-decoration:none;white-space:normal}
#nav .ddx a:hover{color:var(--ink);text-decoration:underline;background:none}
#nav .ddx a:not(:last-child)::after{content:" · ";color:var(--light);text-decoration:none}
#nav a.navfav{padding:18px 8px 16px;display:flex;gap:5px;align-items:center;font-weight:700;white-space:nowrap}
#nav a.navfav .st{color:#C98A00;font-size:15px;line-height:1}
#nav a.navfav.on .st{color:inherit}
#nav .dd[data-g="esp"]>button{font-weight:600}
.mbtn.mfav{display:inline-flex;align-items:center;gap:4px;text-decoration:none;font-weight:700}
.mbtn.mfav .st{color:#C98A00}
.mpanel .mx{padding:2px 0 10px;margin:0;border:0!important;font-size:13px;line-height:1.8}
.mpanel .mx a{display:inline;padding:0;border:0;color:var(--grey)}
.mpanel .mx a:not(:last-child)::after{content:" · "}
#footnav{flex:1 0 100%;order:-1;margin:0 0 18px;padding:0 0 16px;border-bottom:1px solid var(--rule)}
footer .navpied a,footer .navlg a{margin-left:0}
.navpied{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px 24px;margin:0 0 16px}
.navpied p{margin:0 0 6px;font:600 11px var(--mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--light)}
.navpied a{display:block;padding:3px 0;font-size:13px;min-height:0}
.navlg{display:flex;flex-wrap:wrap;gap:4px 14px}
.navplan{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 18px}
.navplan a{display:flex;flex-direction:column;gap:1px;padding:9px 10px;margin:0 -10px;border-radius:9px;color:var(--ink);text-decoration:none}
.navplan a:hover{background:var(--soft)}.navplan b{font-weight:600;font-size:14.5px}.navplan small{font-size:12.5px;color:var(--grey);line-height:1.4}
@media (max-width:1240px){#nav .ddm{min-width:290px}}
@media (max-width:1120px){#nav a.navia{display:none}}
@media (min-width:761px) and (max-width:939px){#nav a.navfav{padding-left:5px!important;padding-right:5px!important;font-size:13px!important}#nav a.navfav .lb{display:none}}
@media (max-width:760px){.navpied{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.navpied{grid-template-columns:1fr;gap:14px}}
</style>`);
navRemplir();
