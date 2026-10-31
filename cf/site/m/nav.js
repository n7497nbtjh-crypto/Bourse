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
/* 30/10 (Romain) : quatre entrées, quatre choix visibles par entrée au plus ; le reste en « aussi » et dans le plan du site en bas.
   Rien n'est supprimé : toutes les adresses restent, seules les entrées de menu changent. */
/* Lot 2 (30/10, prompt de refonte) : quatre portes, chacune une seule page d'entrée. La barre et le menu du téléphone ne montrent
   que ces quatre liens (plus Premium) ; chaque porte range ses pages. « items » et « aussi » ne servent plus qu'au plan du site (/plan)
   et à la rubrique soulignée. Aucune page n'est accessible par deux entrées. */
const NAV = [
  {
    k: "dec", label: "Apprendre", porte: "/apprendre", sous: "Trois décisions, l'Académie, le lexique, le compte",
    items: [
      ["/apprendre", "Apprendre", "Les trois décisions avant d'investir, puis l'Académie par niveau"],
      ["/lexique", "Le lexique", "Chaque chiffre de la Bourse expliqué"],
      ["/pea-cto", "PEA ou compte-titres", "Ce qu'on peut y mettre, et l'impôt en 2026"],
      ["/academie/formation", "Formation guidée de six semaines", "De l'épargne de précaution au premier portefeuille"],
    ],
    aussi: [
      ["/methode", "Méthode et sources"],
      ["/pourquoi-bilan", "Pourquoi bilan."],
    ],
  },
  {
    k: "exp", label: "Marchés", porte: "/marches", sous: "Entreprises, ETF, actualité, classements",
    items: [
      ["/entreprises", "Les entreprises", "2 852 fiches, chacune face à la médiane de son secteur"],
      ["/etf", "Les ETF", "Ce qu'ils contiennent, leurs frais, le PEA"],
      ["/actualites", "L'actualité", "Annonces officielles lues, chiffrées et expliquées"],
      ["/classements", "Classements", "Les mieux placées, critère par critère"],
    ],
    aussi: [
      ["/marches", "Les marchés du jour"],
      ["/agenda", "L'agenda"],
      ["/decouvertes", "Découvertes du jour"],
      ["/dividendes", "Calendrier des dividendes"],
      ["/hier", "Ce qui s'est passé hier"],
      ["/communaute", "Communauté"],
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
      ["/repartitions", "Quelle part en actions ? Listes par critères"],
      ["/idees-recues", "Les idées reçues face aux chiffres"],
      ["/livret-a-ou-bourse", "Livret A ou Bourse ?"],
      ["/simulateurs/frais", "Le coût des frais"],
      ["/simulateurs/pea-cto", "L'impôt selon le compte"],
      ["/demander", "Demander à l'IA"],
    ],
  },
  {
    k: "esp", label: "Mon espace", porte: "/espace", sous: "Ce que vous suivez", compte: true,
    items: [
      ["/espace", "@esp", "Votre rapport de la semaine : vos valeurs, leur actualité, leurs dates"],
      ["/favoris", "Mes favoris", "Les entreprises et ETF que vous suivez"],
      ["/portefeuille", "Mon portefeuille", "Vos lignes, leurs frais, leur diversification"],
      ["/espace/alertes", "Mes alertes", "Publication, dividende, mouvement de plus de 5 %"],
    ],
    aussi: [
      ["/espace/rapport", "Régler mon rapport"],
      ["/rapport-exemple", "Un rapport en exemple"],
      ["/espace/ia", "L'IA du site"],
      ["/espace/reglages", "Réglages"],
      ["/connecteur", "bilan. dans ChatGPT ou Claude"],
      ["/premium", "Premium"],
    ],
  },
];
// Pied de page : pages institutionnelles, hors navigation principale
const NAV_PIED = [["/methode", "Méthode et sources"], ["/mentions-legales", "Mentions légales"], ["/cgv", "CGV"], ["/confidentialite", "Confidentialité"], ["/avertissement", "Avertissement sur les risques"], ["/plan", "Plan du site"]];
// setNav("xxx") → rubrique à souligner dans la barre (clés utilisées par les pages du site)
const NAV_G = { home: "", aca: "dec", new: "dec", lex: "dec", mkt: "exp", news: "exp", ent: "exp", etf: "exp", com: "exp", sim: "ana", pf: "ana", fav: "esp", esp: "esp", ia: "", prem: "" };

/* ---------- Construction ---------- */
const navEsc = s => (typeof esc === "function" ? esc(s) : String(s));
const navLib = t => t === "@esp" ? `<span class="esplbl">Se connecter</span>` : navEsc(t); // « Se connecter » ou « Mon espace » selon la session (espaceBadge)
function navMenuHTML(g) { // panneau déroulant d'une rubrique (ordinateur)
  return `<div class="ddm">${g.items.map(([h, t, d]) => `<a href="${h}"><b>${navLib(t)}</b><span>${navEsc(d)}</span></a>`).join("")}
    </div>`; // 30/10 (Romain) : quatre choix par rubrique, rien d'autre ; le reste est dans le plan du site en bas de page
}
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
#nav a.navporte{padding:18px 10px 16px;font-weight:600;white-space:nowrap}#nav a.navporte.on{box-shadow:inset 0 -3px 0 var(--lime)}
#nav a.navfav .lb{display:none}#nav a.navfav{padding-left:6px;padding-right:6px}
/* lot C : le menu du téléphone s'ouvre par-dessus la page (panneau plein écran), se ferme par ✕, Échap ou un lien */
.mpanel.open{position:fixed;inset:0;z-index:80;overflow:auto;background:var(--page);padding:0 var(--gut,20px) calc(20px + env(safe-area-inset-bottom));border:0}
.mp-h{display:flex;justify-content:space-between;align-items:center;min-height:56px;border-bottom:1px solid var(--ink);margin:0 0 4px}.mp-t{font-family:var(--serif);font-weight:800;font-size:22px}.mp-x{border:0;background:none;font-size:22px;width:44px;height:44px;cursor:pointer;color:var(--ink)}
.mpanel a.mporte{display:flex;flex-direction:column;gap:2px;padding:14px 0;min-height:44px;color:var(--ink);border-bottom:1px solid var(--rule)}.mpanel a.mporte b{font-size:19px}.mpanel a.mporte span{font-size:14px;color:var(--grey)}
footer .navpied4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 24px;margin:0 0 14px}footer .navpied4 a{display:flex;flex-direction:column;gap:2px;padding:0;margin:0;font-size:14px}footer .navpied4 a b{font-weight:600;display:block}footer .navpied4 a span{display:block;font-size:12.5px;color:var(--grey)}
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
document.addEventListener("click", e => { if (e.target.closest(".mp-x") && typeof closePanels === "function") closePanels(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && typeof closePanels === "function" && document.getElementById("mpanel") && document.getElementById("mpanel").classList.contains("open")) closePanels(); });
