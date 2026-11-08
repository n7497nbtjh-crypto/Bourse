/* Module « nav » d'ENKLAIR : la navigation du site, définie une seule fois.
   Chargé en dernier (après monia.js), il remplit lui-même les quatre zones qui montrent le menu :
   la barre du haut (#nav), le menu du téléphone (#mpanel), le pied de page (#footnav) et le plan du site (/plan).
   Avant, le menu était écrit dans index.html puis complété par m/outils.js, m/reco.js et m/orchestre.js (26 entrées,
   4 endroits). Ici, une seule table : NAV. Quatre entrées : Apprendre, Marchés, Outils, Mon espace (Communauté retirée le 7/11).
   Aucune page ne disparaît : ce qui n'est pas dans les liens principaux reste dans la ligne « Aussi » de sa rubrique,
   dans le plan du site et dans le pied de page.
   Accès directs gardés dans la barre : « ✦ Demander à l'IA », « ★ Favoris » (avec son compteur) et Premium. */

/* ---------- La table du menu ----------
   [chemin, libellé, explication]. « aussi » = pages de la rubrique qui ne sont pas dans les liens principaux. */
/* 30/10 (Romain) : quatre entrées, quatre choix visibles par entrée au plus ; le reste en « aussi » et dans le plan du site en bas.
   Rien n'est supprimé : toutes les adresses restent, seules les entrées de menu changent. */
/* Lot 2 (30/10, prompt de refonte) : quatre portes, chacune une seule page d'entrée. La barre et le menu du téléphone ne montrent
   que ces quatre liens (plus Premium) ; chaque porte range ses pages. « items » et « aussi » ne servent plus qu'au plan du site (/plan)
   et à la rubrique soulignée. Aucune page n'est accessible par deux entrées. */
const NAV = [
  {
    k: "dec", label: "Apprendre", porte: "/apprendre", sous: "La Bourse en 7 idées, le lexique",
    items: [
      ["/apprendre", "La Bourse en 7 idées", "Un quart d'heure, avec de vraies entreprises"],
      ["/lexique", "Le lexique", "Chaque chiffre de la Bourse expliqué"],
      ["/pea-cto", "PEA ou compte-titres", "Ce qu'on peut y mettre, et l'impôt en 2026"],
    ],
    aussi: [
      ["/methode", "Méthode et sources"],
      ["/pourquoi-bilan", "Pourquoi ENKLAIR"],
    ],
  },
  {
    k: "exp", label: "Marchés", porte: "/marches", sous: "Entreprises, ETF, actualité, agenda",
    items: [
      ["/entreprises", "Les entreprises", "2 852 fiches, chacune face à la médiane de son secteur"],
      ["/etf", "Les ETF", "Ce qu'ils contiennent, leurs frais, leur performance"],
      ["/actualites", "L'actualité", "Annonces officielles lues, chiffrées et expliquées"],
      ["/agenda", "L'agenda", "Résultats et dividendes à venir, jour par jour"],
      ["/classements", "Classements", "Les mieux placées, critère par critère"],
    ],
    aussi: [
      ["/marches", "Les marchés du jour"],
      ["/dividendes", "Calendrier des dividendes"],
      ["/hier", "Ce qui s'est passé hier"],
    ],
  },
  {
    k: "ana", label: "Outils", porte: "/outils", sous: "Simuler, comparer, vérifier",
    items: [
      ["/comparer", "Comparer des entreprises", "Côte à côte, critère par critère, face au secteur"],
      ["/simulateurs/epargne", "Simulateur d'épargne", "Ce que devient une somme placée chaque mois"],
      ["/outils/si-javais", "Et si j'avais investi ?", "1 000 € placés il y a 1, 3 ou 5 ans"],
      ["/outils/verifier", "Vérifier une offre", "Un site ou un conseiller face aux listes noires de l'AMF"],
    ],
    aussi: [
      ["/outils", "Tous les outils"],
      ["/outils/recouvrement", "Deux ETF se recouvrent-ils ?"],
      ["/idees-recues", "Les idées reçues face aux chiffres"],
      ["/simulateurs/frais", "Le coût des frais"],
      ["/demander", "Demander à l'IA"],
    ],
  },
  // 7/11 (Romain) : la Communauté est retirée du menu ; seuls les pronostics restent, dans Outils (/pronostics).
  {
    k: "esp", label: "Mon espace", porte: "/espace", sous: "Ce que vous suivez", compte: true,
    items: [
      ["/espace", "@esp", "Votre espace : favoris, portefeuille, alertes"],
      ["/rapport-exemple", "★ Le rapport de la semaine", "Chaque samedi, toute l'actualité de vos valeurs : voir un exemple"],
      ["/favoris", "Mes favoris", "Les entreprises et ETF que vous suivez"],
      ["/portefeuille", "Mon portefeuille", "Vos lignes, leurs frais, leur diversification"],
      ["/espace/alertes", "Mes alertes", "Publication, dividende, mouvement de plus de 5 %"],
    ],
    aussi: [
      ["/espace/rapport", "Régler mon rapport"],
      ["/espace/ia", "L'IA du site"],
      ["/espace/reglages", "Réglages"],
      ["/connecteur", "ENKLAIR dans ChatGPT ou Claude"],
      ["/premium", "Premium"],
    ],
  },
];
// Pied de page : pages institutionnelles, hors navigation principale
const NAV_PIED = [["/methode", "Méthode et sources"], ["/mentions-legales", "Mentions légales"], ["/cgv", "CGV"], ["/confidentialite", "Confidentialité"], ["/avertissement", "Avertissement sur les risques"], ["/plan", "Plan du site"]];
// setNav("xxx") → rubrique à souligner dans la barre (clés utilisées par les pages du site)
const NAV_G = { home: "", aca: "dec", new: "dec", lex: "dec", mkt: "exp", news: "exp", ent: "exp", etf: "exp", com: "ana", pronostics: "ana", sim: "ana", pf: "ana", fav: "esp", esp: "esp", ia: "", prem: "" };

/* ---------- Construction ---------- */
const navEsc = s => (typeof esc === "function" ? esc(s) : String(s));
const navLib = t => t === "@esp" ? `<span class="esplbl">Se connecter</span>` : navEsc(t); // « Se connecter » ou « Mon espace » selon la session (espaceBadge)
function navBarreHTML() { // quatre portes en liens directs, l'étoile des favoris (compteur), Premium
  return NAV.map(g => `<a href="${g.porte}" data-g="${g.k}" class="navporte${g.compte ? " navesp" : ""}">${g.compte ? `Mon espace<span class="espn"></span>` : navEsc(g.label)}</a>`).join("")
    + `<a href="/favoris" data-nav="fav" class="navfav" title="Mes favoris" aria-label="Mes favoris"><span class="st">★</span><span class="favn"></span></a>`
    + `<a href="/premium" data-nav="prem" class="navprem">Premium</a>`;
}
function navPanneauHTML() { // menu du téléphone : les quatre portes, Premium (la recherche a son bouton « Chercher » dans la barre)
  return `<div class="mp-h"><span class="mp-t">Menu</span><button type="button" class="mp-x" aria-label="Fermer le menu">✕</button></div>` + NAV.map(g => `<a href="${g.porte}" class="mporte"><b>${g.compte ? `Mon espace <span class="espn"></span>` : navEsc(g.label)}</b><span>${navEsc(g.sous)}</span></a>`).join("")
    + `<a href="/premium" class="mporte mprem"><b>Premium</b><span>Le rapport complet, toutes les alertes, sans limite</span></a>`;
}
function navPiedHTML() { // pied de page : les quatre portes, puis Méthode et sources et les pages légales
  return `<nav class="navpied navpied4" aria-label="Rubriques">${NAV.map(g => `<a href="${g.porte}"><b>${navEsc(g.label)}</b><span>${navEsc(g.sous)}</span></a>`).join("")}</nav>
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
  document.querySelectorAll("#nav a.navporte").forEach(a => a.classList.toggle("on", a.dataset.g === g));
}

/* ---------- Plan du site : /plan ---------- */
function pagePlan() {
  setTitle("Plan du site"); setNav("");
  app.innerHTML = `<div class="legal"><p class="kick">Toutes les pages</p><h1 class="pagetitle">Plan du site</h1>
    <p class="pagesub">Les quatre rubriques du site et toutes leurs pages. Les fiches d'entreprises et d'ETF s'ouvrent depuis la recherche, en haut de chaque page.</p>
    ${NAV.map(g => `<section class="panel"><div class="ph"><h2>${navEsc(g.label)}</h2><span class="light" style="font-size:12.5px">${navEsc(g.sous)}</span></div><div class="pb"><div class="navplan">
      ${g.items.map(([h, t, d]) => `<a href="${h}"${h === "/pea-cto" ? ' class="fr-seul"' : ""}><b>${navEsc(t === "@esp" ? "Mon espace" : t)}</b><small>${navEsc(d)}</small></a>`).join("")}
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
/* styles : voir site.css */
navRemplir();
document.addEventListener("click", e => { if (e.target.closest(".mp-x") && typeof closePanels === "function") closePanels(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && typeof closePanels === "function" && document.getElementById("mpanel") && document.getElementById("mpanel").classList.contains("open")) closePanels(); });
/* 8/11 : fréquentation (page État du site). Une ligne par page vue et, onglet visible, un signal par minute.
   Aucun cookie ni identifiant : « nouveau » dit seulement si c'est la première page de cet onglet. */
(function () {
  if (navigator.webdriver) return;
  let der = "", t = null;
  const env = o => { try { fetch("/api/espace/v", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o), keepalive: true, credentials: "omit" }).catch(() => { }); } catch (e) { } };
  const pv = () => { clearTimeout(t); t = setTimeout(() => {
    const p = location.pathname; if (p === der) return; der = p;
    let nouveau = false; try { nouveau = !sessionStorage.getItem("bilan.vu"); sessionStorage.setItem("bilan.vu", "1"); } catch (e) { }
    const q = new URLSearchParams(location.search);
    env({ t: "pv", p, nouveau, src: q.get("src") || q.get("utm_source") || "", ref: nouveau ? document.referrer || "" : "" });
  }, 400); };
  const hp = history.pushState; history.pushState = function () { const r = hp.apply(this, arguments); pv(); return r; };
  addEventListener("popstate", pv); pv(); env({ t: "ping" });
  setInterval(() => { if (document.visibilityState === "visible") env({ t: "ping" }); }, 60000);
})();
