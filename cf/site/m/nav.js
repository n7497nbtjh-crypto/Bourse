/* Module « nav » d'ENKLAIR : la navigation du site, définie une seule fois.
   Chargé après monia.js, il remplit lui-même les zones qui montrent le menu (et la barre de la rubrique, navSous) :
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
/* 13/11 soir (Romain) : plus de rubrique « Outils ». Trois rubriques et Mon espace ; chaque outil est rangé dans la rubrique
   dont il parle et apparaît dans la petite barre de la rubrique (navSous), sous la barre du haut. Le lexique est en pied de page. */
const NAV = [
  {
    k: "news", label: "Actualités", porte: "/actualites", sous: "L'actualité expliquée, les dates à venir",
    items: [
      ["/actualites", "L'actualité", "Les sujets de la semaine et les annonces officielles, expliqués", "frais"],
      ["/agenda", "Agenda des résultats", "Quelle entreprise publie ses comptes, et quel jour", "agenda"],
      ["/dividendes", "Dividendes", "Qui verse un dividende, quand, et combien par action", "div"],
    ],
  },
  {
    k: "ent", label: "Entreprises", porte: "/entreprises", sous: "Les fiches, les classements, la comparaison",
    items: [
      ["/entreprises", "Les entreprises", "Chaque fiche face à la médiane de son secteur", "pf"],
      ["/classements", "Classements", "Où se situe une entreprise dans son secteur", "listes"],
      ["/comparer", "Comparer", "Côte à côte, critère par critère, face au secteur", "comparer"],
    ],
  },
  {
    k: "etf", label: "ETF", porte: "/etf", sous: "Ce qu'ils contiennent, leurs frais, les comparer",
    items: [
      ["/etf", "Les ETF", "Ce qu'ils contiennent, leurs frais, leur performance", "repart"],
      ["/outils/recouvrement", "Comparer deux ETF", "Composition, frais et entreprises en commun", "recouv"],
    ],
  },
  {
    k: "esp", label: "Mon espace", porte: "/espace", sous: "Ce que vous suivez", compte: true,
    items: [
      ["/espace", "@esp", "Votre espace : compte, favoris, abonnement"],
      ["/favoris", "Mes favoris", "Les entreprises et ETF que vous suivez"],
    ],
    aussi: [
      ["/espace/reglages", "Réglages"],
      ["/premium", "Premium"],
    ],
  },
];
// Pied de page : pages institutionnelles, hors navigation principale
const NAV_PIED = [["/lexique", "Lexique"], ["/methode", "Méthode et sources"], ["/mentions-legales", "Mentions légales"], ["/cgv", "CGV"], ["/confidentialite", "Confidentialité"], ["/avertissement", "Avertissement sur les risques"], ["/plan", "Plan du site"]];
// setNav("xxx") → rubrique à souligner dans la barre (clés utilisées par les pages du site)
const NAV_G = { home: "", aca: "", new: "", lex: "", mkt: "news", news: "news", ent: "ent", etf: "etf", sim: "", pf: "esp", fav: "esp", esp: "esp", ia: "", prem: "" };

/* ---------- Construction ---------- */
const navEsc = s => (typeof esc === "function" ? esc(s) : String(s));
const navIc = k => `<i class="navic">${typeof ou4Ic === "function" ? ou4Ic(k) : ""}</i>`;
function navBarreHTML() { // les portes en liens directs, l'étoile des favoris (compteur), Premium
  // 13/11 soir (Romain : « les sections sont trop cachées ») : chaque rubrique déroule ses pages au survol, avec une petite flèche
  return NAV.map(g => { const a = `<a href="${g.porte}" data-g="${g.k}" class="navporte${g.compte ? " navesp" : ""}">${g.compte ? `Mon espace<span class="espn"></span>` : navEsc(g.label)}${!g.compte && g.items.length > 1 ? `<i class="navch" aria-hidden="true">▾</i>` : ""}</a>`;
    return g.compte || g.items.length < 2 ? a : `<div class="navgrp">${a}<div class="navdd">${g.items.map(([h, t, d, ic]) => `<a href="${h}">${navIc(ic)}<span><b>${navEsc(t)}</b><small>${navEsc(d)}</small></span></a>`).join("")}</div></div>`; }).join("")
    + `<a href="/favoris" data-nav="fav" class="navfav" title="Mes favoris" aria-label="Mes favoris"><span class="st">★</span><span class="favn"></span></a>`
    + `<a href="/premium" data-nav="prem" class="navprem">Premium</a>`;
}
function navPanneauHTML() { // menu du téléphone : les quatre portes, Premium (la recherche a son bouton « Chercher » dans la barre)
  return `<div class="mp-h"><span class="mp-t">Menu</span><button type="button" class="mp-x" aria-label="Fermer le menu">✕</button></div>` + NAV.map(g => `<a href="${g.porte}" class="mporte"><b>${g.compte ? `Mon espace <span class="espn"></span>` : navEsc(g.label)}</b><span>${navEsc(g.sous)}</span></a>${!g.compte && g.items.length > 1 ? `<div class="msous">${g.items.slice(1).map(([h, t]) => `<a href="${h}">${navEsc(t)}</a>`).join("")}</div>` : ""}`).join("")
    + `<a href="/premium" class="mporte mprem"><b>Premium</b><span>Toutes les fiches, les classements et les comparaisons, sans limite</span></a>`;
}
function navPiedHTML() { // pied de page : les quatre portes, puis Méthode et sources et les pages légales
  return `<nav class="navpied navpied4 navpied5" aria-label="Rubriques">${NAV.map(g => `<a href="${g.porte}"><b>${navEsc(g.label)}</b><span>${navEsc(g.sous)}</span></a>`).join("")}</nav>
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
  navSous(g);
}
/* Les pages de la rubrique, sous la barre du haut. Sur une page de la rubrique : de grandes cartes (icône, nom, explication),
   celle qu'on lit en jaune. Sur une fiche : la version courte, en pastilles. Vide (donc cachée) hors des trois rubriques. */
function navSous(g) {
  let el = document.getElementById("navsous");
  if (!el) { el = document.createElement("nav"); el.id = "navsous"; el.setAttribute("aria-label", "Pages de la rubrique"); NAV_SOUS.el = el; }
  const G = NAV.find(x => x.k === g && !x.compte && x.items.length > 1), p = location.pathname.replace(/\/+$/, "") || "/";
  let ici = null; if (G) for (const [h] of G.items) if (p === h) ici = h;
  el.className = "wrap navsous" + (G && ici ? " navcartes n" + G.items.length : "");
  el.innerHTML = !G ? "" : ici ? G.items.map(([h, t, d, ic]) => `<a href="${h}"${h === ici ? ' class="on" aria-current="page"' : ""}>${navIc(ic)}<span><b>${navEsc(t)}</b><small>${navEsc(d)}</small></span></a>`).join("")
    : G.items.map(([h, t]) => `<a href="${h}">${navEsc(t)}</a>`).join("");
  el.hidden = !G; navSousPlacer();
}
/* 13/11 soir (Romain : « trop collé, à mettre en dessous de l'encadré jaune ») : la barre est posée juste après le bandeau jaune
   de la page, dès qu'il est affiché (les pages se dessinent après setNav, parfois en deux temps). Sans bandeau : avant la page. */
const NAV_SOUS = { el: null, obs: null };
function navSousPlacer() {
  const el = NAV_SOUS.el || document.getElementById("navsous"), app = document.getElementById("app"); if (!el || !app) return;
  const hero = app.querySelector(".ek-hero, .e3-hero, .f4-hero, .ek-page > section:first-child");
  if (hero && hero.parentNode) { if (hero.nextElementSibling !== el) hero.after(el); el.classList.add("apres"); el.classList.remove("wrap"); }
  else { if (el.parentNode !== app.parentNode || el.nextElementSibling !== app) app.parentNode.insertBefore(el, app); el.classList.remove("apres"); el.classList.add("wrap"); }
  if (!NAV_SOUS.obs) { let t = 0; NAV_SOUS.obs = new MutationObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(navSousPlacer); }); NAV_SOUS.obs.observe(app, { childList: true, subtree: true }); }
}

/* ---------- Plan du site : /plan ---------- */
function pagePlan() {
  setTitle("Plan du site"); setNav("");
  app.innerHTML = `<div class="legal"><p class="kick">Toutes les pages</p><h1 class="pagetitle">Plan du site</h1>
    <p class="pagesub">Les rubriques du site et toutes leurs pages. Les fiches d'entreprises et d'ETF s'ouvrent depuis la recherche, en haut de chaque page.</p>
    ${NAV.map(g => `<section class="panel"><div class="ph"><h2>${navEsc(g.label)}</h2><span class="light" style="font-size:12.5px">${navEsc(g.sous)}</span></div><div class="pb"><div class="navplan">
      ${g.items.map(([h, t, d]) => `<a href="${h}"${h === "/pea-cto" ? ' class="fr-seul"' : ""}><b>${navEsc(t === "@esp" ? "Mon espace" : t)}</b><small>${navEsc(d)}</small></a>`).join("")}
      ${(g.aussi || []).map(([h, t]) => `<a href="${h}"><b>${navEsc(t)}</b></a>`).join("")}</div></div></section>`).join("")}
    <section class="panel"><div class="ph"><h2>Le site</h2></div><div class="pb"><div class="navplan">${NAV_PIED.map(([h, t]) => `<a href="${h}"><b>${navEsc(t)}</b></a>`).join("")}</div></div></section></div>`;
}
if (typeof ROUTES_EXTRA !== "undefined") ROUTES_EXTRA.push([/^\/plan$/, () => pagePlan()]);

/* ---------- Style ---------- */
/* styles : voir site.css */
navRemplir();
document.addEventListener("click", e => { if (e.target.closest(".mp-x") && typeof closePanels === "function") closePanels(); });
/* Liste d'une rubrique : une seule ouverte à la fois, et elle se referme dès qu'on a choisi une page (13/11, capture de Romain : deux listes l'une sur l'autre) */
document.addEventListener("click", e => { const g = e.target.closest && e.target.closest("#nav .navgrp"); if (!g) return; g.classList.add("ferme"); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
document.addEventListener("mouseover", e => { const g = e.target.closest && e.target.closest("#nav .navgrp"); document.querySelectorAll("#nav .navgrp.ferme").forEach(x => { if (x !== g) x.classList.remove("ferme"); }); });
document.addEventListener("mouseout", e => { const g = e.target.closest && e.target.closest("#nav .navgrp.ferme"); if (g && !(e.relatedTarget && g.contains(e.relatedTarget))) g.classList.remove("ferme"); });
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
