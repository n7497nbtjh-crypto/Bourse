/* =====================================================================================================
   Module « design » (29 octobre 2026)
   1. Le cours de l'action : graphique TradingView (widget gratuit, autorisé le 29/10/2026) ; en secours,
      un dessin fait par le site à partir de ses relevés réels (5 ans, 3 ans, 1 an, aujourd'hui).
   2. Retouches de présentation : gris lisible, moins de cadres imbriqués, hiérarchie plus nette.
   ===================================================================================================== */

/* ---------- 1. Courbe du cours, dessinée par le site ---------- */
const DSG_PTS = [["p5y", 5, "il y a 5 ans"], ["p3y", 3, "il y a 3 ans"], ["p1y", 1, "il y a 1 an"]];

function dsgQuote(symbol, name) {
  if (typeof PX !== "object" || !PX) return null;
  // Le code de la feuille de cours (EPA:MC) et celui de la fiche (EURONEXT:MC) diffèrent :
  // on retrouve la valeur par son nom, puis par son code si besoin.
  const n = typeof norm === "function" ? norm(name || "") : String(name || "").toLowerCase();
  if (n) {
    const co = (typeof R === "object" && R && R.companies || []).find(c => norm(c.name) === n);
    if (co && PX["c:" + co.id]) return { k: "c:" + co.id, q: PX["c:" + co.id] };
    const e = (typeof ETF === "object" && ETF && ETF.list || []).find(x => norm(x.name) === n);
    if (e && PX["e:" + e.id]) return { k: "e:" + e.id, q: PX["e:" + e.id] };
  }
  for (const k in PX) if (PX[k] && PX[k].s === symbol) return { k, q: PX[k] };
  return null;
}

function dsgFmt(v, cur) {
  const sym = (typeof CUR === "object" && CUR && CUR[cur]) || cur || "";
  const n = v >= 1000 ? F0.format(v) : F2.format(v);
  return sym ? `${n} ${sym}` : n;
}

function dsgCourbe(el, symbol, name) { // dessin maison : secours quand le graphique TradingView ne peut pas s'afficher
  if (!el) return;
  dsgRedraw.set(el, [symbol, name]);
  const hit = dsgQuote(symbol, name), q = hit && hit.q;
  if ((!q || !(q.p > 0)) && (typeof PX !== "object" || !PX || !Object.keys(PX).length)) {
    // Les cours ne sont pas encore chargés : on réessaie plutôt que d'annoncer une absence.
    el.innerHTML = `<div class="dsgc dsgc-vide"><p>Chargement du cours…</p></div>`;
    const n = (el.dataset.dsgTry = String(+(el.dataset.dsgTry || 0) + 1));
    if (+n <= 24) { setTimeout(() => { if (document.body.contains(el)) dsgCourbe(el, symbol, name); }, 300); return; }
  }
  if (!q || !(q.p > 0)) {
    el.innerHTML = `<div class="dsgc dsgc-vide"><p>Le cours de cette valeur n'est pas relevé pour l'instant. Les chiffres des comptes restent affichés plus bas.</p></div>`;
    return;
  }
  const now = new Date(), pts = [];
  for (const [f, ans, lib] of DSG_PTS) {
    if (q[f] > 0) pts.push({ v: q[f], lib, an: now.getFullYear() - ans });
  }
  pts.push({ v: q.p, lib: "aujourd'hui", an: now.getFullYear(), last: true });
  if (pts.length < 2) { // lot A 1.4 : pas de « un seul relevé » à côté d'une fourchette sur 1 an ; si la fourchette existe, elle suffit
    const ok52 = q.l52 > 0 && q.h52 > q.l52 && q.h52 / q.l52 <= 3;
    el.innerHTML = ok52 ? `<div class="dsgc dsgc-vide"><p>Cours du jour : <b>${dsgFmt(q.p, q.cur)}</b>, entre ${dsgFmt(q.l52, q.cur)} et ${dsgFmt(q.h52, q.cur)} sur un an. L'historique détaillé n'est pas encore relevé pour cette valeur.</p></div>` : `<div class="dsgc dsgc-vide"><p>Cours du jour : <b>${dsgFmt(q.p, q.cur)}</b>. L'historique n'est pas encore relevé pour cette valeur.</p></div>`;
    return;
  }
  const vals = pts.map(p => p.v), bas = Math.min(...vals, q.l52 > 0 ? q.l52 : Infinity), haut = Math.max(...vals, q.h52 > 0 ? q.h52 : -Infinity);
  const marge = (haut - bas) * 0.14 || haut * 0.1 || 1, y0 = bas - marge, y1 = haut + marge;
  // On dessine à la taille réelle du bloc : sinon les textes du graphique sont étirés.
  const W = Math.max(360, Math.round(el.clientWidth || 900)), H = Math.max(240, Math.round(el.clientHeight || 320)) - 26;
  const etroit = W < 560, gl = etroit ? 14 : 52, gr = etroit ? 64 : 96, gt = 30, gb = 34; // sur téléphone : marges réduites et libellés courts, sinon ils se chevauchent
  const x = i => gl + (W - gl - gr) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
  const y = v => gt + (H - gt - gb) * (1 - (v - y0) / (y1 - y0));
  const hausse = pts[pts.length - 1].v >= pts[0].v, col = hausse ? "#0E6B4A" : "#B5301D";
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const aire = `${d} L${x(pts.length - 1).toFixed(1)} ${(H - gb).toFixed(1)} L${x(0).toFixed(1)} ${(H - gb).toFixed(1)} Z`;
  const bande = q.h52 > 0 && q.l52 > 0 ? `<rect x="${gl}" y="${y(q.h52).toFixed(1)}" width="${W - gl - gr}" height="${Math.max(1, y(q.l52) - y(q.h52)).toFixed(1)}" fill="var(--ink)" opacity=".045"/>` : "";
  const tk = (typeof niceTicks === "function" ? niceTicks(y0, y1, 3) : [y0, (y0 + y1) / 2, y1]).filter(v => v >= y0 && v <= y1);
  const ticks = tk.map(v => `<g><line x1="${gl}" x2="${W - gr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--line2)" stroke-dasharray="2 4"/><text x="${W - gr + 8}" y="${(y(v) + 4).toFixed(1)}" class="dsgc-ax">${dsgFmt(v, q.cur)}</text></g>`).join("");
  const pcs = pts.map((p, i) => `<g><circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${p.last ? 6 : 4.5}" fill="${p.last ? col : "var(--page)"}" stroke="${col}" stroke-width="2.5"/>
      <text x="${x(i).toFixed(1)}" y="${(y(p.v) - 14).toFixed(1)}" class="dsgc-vl" text-anchor="${i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}">${dsgFmt(p.v, q.cur)}</text>
      <text x="${x(i).toFixed(1)}" y="${H - gb + 20}" class="dsgc-dt" text-anchor="${i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}">${esc(etroit ? p.lib.replace("il y a ", "").replace("aujourd'hui", "auj.") : p.lib)}</text></g>`).join("");
  const ecart = pts[0].v > 0 ? (pts[pts.length - 1].v / pts[0].v - 1) * 100 : null;
  el.innerHTML = `<div class="dsgc">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cours de ${esc(name)} aux relevés disponibles">
      ${bande}${ticks}
      <path d="${aire}" fill="${col}" opacity=".07"/>
      <path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="7 5" stroke-linejoin="round"/>
      ${pcs}
    </svg>
    <p class="dsgc-lg">${pts.length} relevés de cours, sans l'historique entre eux : le trait est pointillé pour le rappeler.${ecart != null ? ` Sur la période, le cours a ${ecart >= 0 ? "progressé" : "reculé"} de ${F1.format(Math.abs(ecart))} %, hors dividendes.` : ""}${q.h52 > 0 && q.l52 > 0 ? ` La zone grisée est l'écart entre le plus bas et le plus haut des 52 dernières semaines.` : ""}</p>
  </div>`;
}

const dsgRedraw = new Map();
addEventListener("resize", () => { for (const [el, a] of dsgRedraw) { if (document.body.contains(el)) dsgCourbe(el, a[0], a[1]); else dsgRedraw.delete(el); } }, { passive: true });

/* ---------- Graphique TradingView (autorisé par Romain le 29/10/2026) ----------
   Le graphique complet (bougies ou ligne, zoom, périodes) est fourni par le widget gratuit de TradingView,
   avec la mention et le lien exigés par leur licence. Si le script ne charge pas (bloqueur, panne, hors ligne),
   le dessin maison à partir des relevés du site prend la place après 6 secondes. */
const DSG_TV_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
/* Places absentes du widget gratuit de TradingView (testé le 29/10/2026, une valeur par place) : le widget affiche alors un avis
   « symbole disponible uniquement sur TradingView », voire un autre titre par défaut. Pour ces places, on dessine la courbe nous-mêmes. */
const DSG_TV_NON = new Set(["LSE", "TSE", "TWSE", "NSE", "HKEX", "KRX", "SGX", "TADAWUL"]);
function tvChart(el, symbol, name) {
  if (!el) return;
  if (!symbol || DSG_TV_NON.has(String(symbol).split(":")[0])) { const n = document.querySelector(".f2-ch-h .f2-note"); if (n) n.innerHTML = "Repères du site · cours différé"; return dsgCourbe(el, symbol, name); }
  const mobile = matchMedia("(max-width:760px)").matches;
  el.innerHTML = `<div class="tradingview-widget-container dsg-tv"><div class="tradingview-widget-container__widget"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/symbols/${encodeURIComponent(symbol.replace(":", "-"))}/" rel="noopener nofollow" target="_blank">Graphique ${esc(name)} par TradingView</a> · cours différé selon la bourse</div></div>`;
  const s = document.createElement("script");
  s.src = DSG_TV_SRC; s.async = true; s.type = "text/javascript";
  s.innerHTML = JSON.stringify({ autosize: true, symbol, interval: "D", range: "12M", timezone: "Europe/Paris", theme: "light", style: "3", locale: "fr",
    backgroundColor: "rgba(255,255,255,0)", gridColor: "rgba(0,0,0,0.05)", hide_top_toolbar: true, hide_legend: true, hide_side_toolbar: true, allow_symbol_change: false,
    save_image: false, calendar: false, hide_volume: true, withdateranges: !mobile, details: false, support_host: "https://www.tradingview.com" });
  s.onerror = () => dsgCourbe(el, symbol, name);
  el.firstChild.insertBefore(s, el.firstChild.lastChild);
  setTimeout(() => { if (document.body.contains(el) && !el.querySelector("iframe")) dsgCourbe(el, symbol, name); }, 6000);
}

/* Le module d'information du haut (anciennement TradingView) n'a plus lieu d'être : le cours figure déjà
   dans l'en-tête de la fiche, avec son heure de relevé et sa source. */
function tv(el) { if (el) el.innerHTML = ""; }

/* styles : voir site.css */

/* 30/10 (demande de Romain) : plus de mini-courbes dans les tableaux de chiffres ; la colonne garde la variation sur un an.
   Le graphique complet reste au-dessus du tableau de chaque thème. */
function tblxSpark() { return ""; }
/* styles : voir site.css */
/* styles : voir site.css */
/* Accueil (30/10) : sous-titres en police de texte, sans capitales espacées */
/* styles : voir site.css */
/* Règle de police, tout le site (30/10, demande de Romain) : la serif pour les titres de page et de bloc (h1, h2) ;
   la police de texte pour tout le reste, sous-titres compris ; la chasse fixe uniquement pour les chiffres. */
/* styles : voir site.css */
/* styles : voir site.css */
function synSpark() { return ""; } // 30/10 (Romain) : plus de petites courbes, nulle part
/* 30/10 (Romain, DESIGN.md) : plus aucune capitale espacée nulle part ; les petites étiquettes en Plex Sans, pas en chasse fixe */
/* styles : voir site.css */
/* Par où commencer : trois écrans visuels (30/10) */
/* styles : voir site.css */
/* Page Outils (lot 2 et 5, 30/10) : deux familles, des cartes visuelles (icône, nom, une ligne). Chaque outil n'est listé qu'ici. */
(function () {
  const I = { idees: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3z", epargne: "M4 18l5-6 4 3 7-9M4 4v16h16", passe: "M12 8v4l3 2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0", verif: "M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7zM9 12l2 2 4-4", repart: "M12 3v9h9a9 9 0 1 1-9-9zM14 3a9 9 0 0 1 7 7h-7z", listes: "M4 6h16M4 12h10M4 18h7", comparer: "M4 20V9M10 20V4M16 20v-8M22 20H2", recouv: "M9 12a5 5 0 1 0 0-.01M15 12a5 5 0 1 0 0-.01", pf: "M3 7h18v12H3zM3 11h18M8 7V4h8v3", frais: "M4 4h16v16H4zM8 9h8M8 13h5M8 17h3", impot: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h3", livret: "M4 6h16v12H4zM4 10h16" };
  const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[k]}"/></svg>`;
  const G = [
    ["Pour débuter", "Avec vos chiffres, hypothèses affichées", [
      ["/simulateurs/epargne", "epargne", "Simulateur d'épargne", "Ce que devient une somme placée chaque mois, frais et impôt compris."],
      ["/outils/si-javais", "passe", "Et si j'avais investi ?", "1 000 € placés il y a 1, 3 ou 5 ans, comparés au marché."],
      ["/outils/verifier", "verif", "Vérifier une offre", "Un site ou un conseiller face aux listes noires de l'AMF."],
      ["/repartitions", "repart", "Quelle part en actions ?", "Un curseur, et ce qu'une forte baisse ferait à l'ensemble."],
      ["/livret-a-ou-bourse", "livret", "Livret A ou Bourse ?", "100 € par mois sur 10, 20 ou 30 ans, inflation comprise."],
      ["/idees-recues", "idees", "Les idées reçues face aux chiffres", "Dix phrases qu'on entend souvent, vérifiées avec des données sourcées."],
    ]],
    ["Pour aller plus loin", "Trier, comparer, radiographier", [
      ["/portefeuille", "pf", "Mon portefeuille", "Frais réels, doublons d'ETF, concentration, dividendes, achats programmés."],
      ["/comparer", "comparer", "Comparer des entreprises", "Côte à côte, critère par critère, face à la médiane du secteur."],
      ["/outils/recouvrement", "recouv", "Deux ETF se recouvrent-ils ?", "Les entreprises que deux à quatre ETF ont en commun."],
      ["/repartitions#listes", "listes", "Listes par critères", "Les entreprises qui répondent aux critères que vous choisissez."],
      ["/simulateurs/frais", "frais", "Le coût des frais", "Courtage et frais de gestion sur 10, 20 ou 30 ans."],
      ["/simulateurs/pea-cto", "impot", "L'impôt selon le compte", "PEA ou compte-titres, avec vos montants."],
    ]],
  ];
  const p0 = window.pageOutils;
  if (typeof p0 !== "function") return;
  window.pageOutils = function (t) {
    if (t) return p0.apply(this, arguments);
    setNav("sim"); setTitle("Outils");
    app.innerHTML = `<h1 class="pagetitle">Outils</h1><p class="pagesub">Des calculs et des comparaisons, hypothèses affichées, jamais de conseil.</p>
      ${G.map(([t, s, L]) => `<section class="ot-g"><div class="ot-h"><h2>${esc(t)}</h2><span>${esc(s)}</span></div><div class="ot-c">${L.map(([h, k, n, d]) => `<a class="ot-k" href="${h}">${ic(k)}<b>${esc(n)}</b><span>${esc(d)}</span></a>`).join("")}</div></section>`).join("")}`;
  };
  /* styles : voir site.css */
})();
/* Page Entreprises : classements et découvertes du jour intégrés en tête (30/10, Romain : moins de pages) */
(function () {
  const e0 = window.pageEntreprises; if (typeof e0 !== "function") return;
  window.pageEntreprises = function () {
    const r = e0.apply(this, arguments);
    const sub = $(".pagesub", app);
    if (sub && !$(".ent-plus", app)) sub.insertAdjacentHTML("afterend", `<div class="ent-plus"><a href="/decouvertes"><b>Découvertes du jour</b><span>Six entreprises moins connues dont les comptes ressortent</span></a><a href="/classements"><b>Classements</b><span>Celles qui cumulent le plus de points forts, secteur par secteur</span></a><a href="/comparer"><b>Comparer</b><span>Jusqu'à trois entreprises côte à côte, face à leur secteur</span></a></div>`);
    return r;
  };
  /* styles : voir site.css */
})();
/* Page ETF : trois entrées en tête (30/10) */
(function () {
  const f0 = window.pageEtfs; if (typeof f0 !== "function") return;
  window.pageEtfs = function () {
    const r = f0.apply(this, arguments);
    const sub = $(".pagesub", app);
    if (sub && !$(".ent-plus", app)) sub.insertAdjacentHTML("afterend", `<div class="ent-plus"><a href="/academie/placements/etf"><b>Comprendre un ETF</b><span>Une leçon de trois minutes : ce que c'est, ce que ça coûte</span></a><a href="/etf?pea=1"><b>Éligibles au PEA</b><span>Ceux qu'un PEA peut contenir, avec leurs frais</span></a><a href="/outils/recouvrement"><b>Deux ETF se recouvrent-ils ?</b><span>Positions en double, secteurs et devises combinés</span></a></div>`);
    return r;
  };
})();
/* styles : voir site.css */
/* styles : voir site.css */
/* Premium : liste d'attente (30/10) */
/* styles : voir site.css */
/* Lot 2 : la porte Marchés */
/* styles : voir site.css */
/* Lot 4 : la fiche ETF sur le modèle de la fiche entreprise. Niveau 1 : en-tête (verdict, frais, risques), ce que vous achetez,
   les dix plus grosses lignes. Niveau 2 (plis) : où va votre argent, les frais, les risques en détail, les questions, les ETF proches,
   les avis, la discussion. Ouverts d'office si « Afficher toujours le détail » est coché. */
(function () {
  const e0 = window.pageEtf; if (typeof e0 !== "function") return;
  const plier = (sec, titre, sous, open) => {
    if (!sec || sec.closest("details.rf-pl2")) return;
    const d = document.createElement("details"); d.className = "rf-pl rf-pl2"; d.open = !!open; d.id = sec.id ? "pli-" + sec.id : "";
    d.innerHTML = `<summary><b>${titre}</b>${sous ? `<span>${sous}</span>` : ""}</summary><div class="rf-plb"></div>`;
    sec.replaceWith(d); d.querySelector(".rf-plb").appendChild(sec); sec.classList.add("rf-th-in");
  };
  const appliquer = () => {
    const auto = typeof rfDetailToujours === "function" && rfDetailToujours();
    const h2 = s => { const h = s && s.querySelector("h2"); return h ? h.textContent.trim() : ""; };
    plier($("#efrais"), "Ce que coûtent ses frais", "Sur 10 et 20 ans, face à sa catégorie", auto);
    plier($("#erisques"), "Les risques en détail", "Marché, change, concentration, contrepartie", auto);
    plier($("#equestions"), "Vos questions sur cet ETF", "Réponses calculées à partir de la fiche", auto);
    $$("aside > section.panel").forEach(s => { const t = h2(s); if (/^ETF proches|^Avis|^Discussion/.test(t)) plier(s, t, "", auto); });
    const comp = $("#ecomp"); if (comp) { const secs = $$("section.panel", comp); if (secs[1]) plier(secs[1], h2(secs[1]) || "Où va votre argent", "Par secteur et par pays", auto); }
    const col = $(".rf-etf ~ .cols > div", app) || $(".cols > div", app), first = col && $("details.rf-pl2", col);
    if (first) { let h = $(".rf-l2h", app); if (!h) { first.insertAdjacentHTML("beforebegin", `<div class="rf-l2h"><h2>Tout le détail</h2><label class="rf-l2t"><input type="checkbox" id="rf-detail"${auto ? " checked" : ""}> Afficher toujours le détail</label></div>`); } else if (h.nextElementSibling !== first) first.before(h); }
    const cb = $("#rf-detail", app); if (cb && !cb.dataset.on) { cb.dataset.on = "1"; cb.onchange = () => { if (typeof rfDetailSet === "function") rfDetailSet(cb.checked); $$("details.rf-pl2", app).forEach(d => d.open = cb.checked); }; }
  };
  window.pageEtf = async function (id) {
    const r = await e0.apply(this, arguments);
    if (!location.pathname.startsWith("/etf/")) return r;
    appliquer();
    const comp = $("#ecomp"); if (comp && !$("details", comp)) new MutationObserver((m, o) => { if ($("section.panel", comp)) { appliquer(); o.disconnect(); } }).observe(comp, { childList: true });
    return r;
  };
  /* styles : voir site.css */
})();
/* Lot 4 : réglage « Afficher toujours le détail » dans Mon espace › Réglages (mémorisé sur l'appareil) */
(function () {
  const r0 = window.espaceReglages; if (typeof r0 !== "function") return;
  window.espaceReglages = function (el, m) {
    const r = r0.apply(this, arguments);
    if (el && !el.querySelector("#rg-detail")) {
      const s = document.createElement("section"); s.className = "panel";
      s.innerHTML = `<div class="ph"><h2>Lecture des fiches</h2></div><div class="pb"><label class="rf-l2t" style="font-size:14.5px;color:var(--ink)"><input type="checkbox" id="rg-detail"${typeof rfDetailToujours === "function" && rfDetailToujours() ? " checked" : ""}> Afficher toujours le détail (toutes les sections « Tous les chiffres » ouvertes sur les fiches)</label><p class="muted" style="margin:8px 0 0;font-size:13px">Par défaut, chaque fiche montre d'abord le verdict et les jauges ; le détail s'ouvre au clic. Ce choix est gardé sur cet appareil.</p></div>`;
      el.insertBefore(s, el.firstElementChild ? el.firstElementChild.nextElementSibling : null);
      s.querySelector("#rg-detail").onchange = e => { if (typeof rfDetailSet === "function") rfDetailSet(e.target.checked); };
    }
    return r;
  };
})();
/* Lot 5 (30/10) : Comparer. Grand champ pleine largeur au départ, six comparaisons populaires (les autres derrière un bouton),
   le plus élevé et le plus bas de chaque ligne mis en évidence (ce n'est pas « le meilleur »), export CSV du tableau. */
(function () {
  const r0 = window.cmprRender; if (typeof r0 !== "function") return;
  window.cmprRender = function (ids, cut, CMAX) {
    const r = r0.apply(this, arguments);
    const sel = $(".cmpr-selp", app); if (sel && !ids.length) { sel.classList.add("cmpr-vide"); const lb = $(".cmpr-add label", sel); if (lb) lb.textContent = CMAX >= 5 ? "Ajoutez 2 à 5 entreprises" : "Ajoutez 2 ou 3 entreprises"; const q = $("#cmpq"); if (q) q.placeholder = "Nom ou code : LVMH, Kering, Hermès…"; }
    return r;
  };
  const g0 = window.outGalleryHTML;
  if (typeof g0 === "function") window.outGalleryHTML = function () {
    const h = g0.apply(this, arguments), all = OUT_PRESETS.filter(p => p.ids.filter(id => RBY[id]).length >= 2).slice(0, 6), n = (h.match(/class="out-pc"/g) || []).length;
    return `<section class="panel out-gal6"><div class="ph"><h2>Six comparaisons populaires</h2><span class="light" style="font-size:12.5px">En un clic, le verdict critère par critère</span></div><div class="pb" style="padding-top:8px"><div class="out-pg">${all.map(outPresetCard).join("")}</div>
      <p style="margin:14px 0 0"><button type="button" class="btn ghost" data-out-toutes>Voir toutes les comparaisons (${n})</button></p></div></section><div class="out-galw" hidden>${h}</div>`;
  };
  document.addEventListener("click", e => { const b = e.target.closest("[data-out-toutes]"); if (!b) return; const w = $(".out-galw"); if (w) { w.hidden = false; b.closest("section").hidden = true; w.scrollIntoView({ block: "start", behavior: "smooth" }); } });
  const b0 = window.cmprRenderBody;
  if (typeof b0 === "function") window.cmprRenderBody = function (ids) {
    const r = b0.apply(this, arguments);
    const t = $("#cmpr-body .rf-ctab-t"); if (!t) return r;
    const num = x => { const m = String(x).replace(/\s/g, "").match(/-?\d+(?:[,.]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : null; };
    $$("tbody tr", t).forEach(tr => { if (tr.classList.contains("rf-q")) return; const cells = [...tr.querySelectorAll("td")].filter(td => !td.classList.contains("rf-medc") && !td.classList.contains("rf-q")), vals = cells.map(td => num(td.textContent));
      const ok = vals.filter(v => v != null); if (ok.length < 2 || Math.max(...ok) === Math.min(...ok)) return;
      const hi = vals.indexOf(Math.max(...ok)), lo = vals.indexOf(Math.min(...ok));
      cells[hi].classList.add("rf-hi"); cells[hi].title = (cells[hi].title ? cells[hi].title + " · " : "") + "Le plus élevé de la comparaison"; cells[lo].classList.add("rf-lo"); cells[lo].title = (cells[lo].title ? cells[lo].title + " · " : "") + "Le plus bas de la comparaison"; });
    const box = t.closest(".cmpr-tbl"); if (box && !$("[data-cmpr-csv]", box)) { box.insertAdjacentHTML("beforeend", `<p class="cmpr-csvp"><button type="button" class="btn ghost" data-cmpr-csv>Exporter en CSV</button><span class="light" style="font-size:12.5px">▲ le plus élevé · ▼ le plus bas de la ligne</span></p>`);
      $("[data-cmpr-csv]", box).onclick = () => { const rows = [...t.querySelectorAll("tr")].map(tr => [...tr.querySelectorAll("th,td")].map(c => `"${c.innerText.replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`).join(";"));
        const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `comparaison-${ids.join("-")}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }; }
    return r;
  };
  /* styles : voir site.css */
})();
/* Lot 6 : finitions. Codes boursiers et ISIN en police à chasse fixe ; les chiffres sont en police normale (chasse tabulaire, index.html). */
/* styles : voir site.css */
/* Lot 6 : un seul style de badge (vert, gris, rouge). Les catégories d'annonces (résultats, dividende…) sont grises ; seul « info privilégiée » reste signalé. */
/* styles : voir site.css */
/* 3e passage (30/10), 2.1 : le comparateur, un chiffre une fois. Une ligne de verdict (avantages par entreprise), le tableau
   (critères, entreprises, médiane), puis trois plis : « Comprendre chaque critère » (une jauge et une phrase par critère, sans les
   chiffres du tableau), « Les indicateurs » (tableau complet), « Sources et dates ». Les six phrases de verdict et le détail thème par
   thème disparaissent de la page : le tableau dit la même chose. */
(function () {
  const b0 = window.cmprRenderBody; if (typeof b0 !== "function") return;
  window.cmprRenderBody = function (ids) {
    const el = $("#cmpr-body"); if (!el) return b0.apply(this, arguments);
    const cos = ids.map(id => RBY[id]);
    if (cos.length < 2 || typeof cmprCtx !== "function" || typeof rfCmpTableHTML !== "function") return b0.apply(this, arguments);
    if (CMPR_STATE) CMPR_STATE.stale = ids.some(id => !RBY[id].missing && !FULL[id]);
    const X = cmprCtx(cos), V = cmprVerdict(X), notes = cmprNotes(X);
    // une seule ligne de verdict : combien de critères chaque entreprise mène (le plus élevé n'est pas « le meilleur » : la taille et le dividende sont neutres)
    const gagne = {}; let nb = 0;
    V.lines.forEach(l => { if (l.T.neutral || !l.S || !l.S.best) return; nb++; const id = l.S.best.F.c.id; gagne[id] = (gagne[id] || 0) + 1; });
    const ligne = nb ? cos.map(c => `<span><b>${esc(c.name)}</b> : ${gagne[c.id] || 0} critère${(gagne[c.id] || 0) > 1 ? "s" : ""} en tête</span>`).join(`<i aria-hidden="true">·</i>`) + ` <small>sur ${nb} comparés</small>` : "";
    const crit = V.lines.map(l => { const T = l.T, d = typeof RF_CMP_DEF !== "undefined" && ALL && ALL[RF_CMP_DEF[T.k]]; const phr = d ? d.what : (typeof T.ind === "function" ? T.ind(X) : "");
      const jauges = X.F.map(F => { const spec = typeof RF_CMP_KEY !== "undefined" && RF_CMP_KEY[T.k]; if (!spec || !F.ok) return ""; let val = null; try { val = spec[0] === "pe" || spec[0] === "yld" ? (F.v || {})[spec[0]] : spec[0] === "ca" ? caEur(F.c) : ratios(F.c)[spec[0]]; } catch (e) { } if (val == null) return "";
        const inv = T.k === "solidite" || T.k === "prix" ? true : T.k === "dividende" || T.k === "taille" ? null : false; const g = typeof rf6Jauge === "function" ? rf6Jauge(F.c, spec[0], inv, val) : ""; return g ? `<div class="cmpr-jg"><span>${logo(F.c, 18)}${esc(F.c.name)}</span>${g}</div>` : ""; }).join("");
      return `<div class="cmpr-crit"><h3>${esc(T.t)}</h3><p>${esc(phr || "")}</p>${jauges}</div>`; }).join("");
    el.innerHTML = `
      <section class="panel cmpr-vp" id="cmpr-verdict">
        ${typeof cmprSynthese === "function" ? cmprSynthese(X, V) || (ligne ? `<p class="cmpr-ligne">${ligne}</p>` : "") : ligne ? `<p class="cmpr-ligne">${ligne}</p>` : ""}
        <div class="cmpr-tbl">${tblxScrollBox(rfCmpTableHTML(cos[0], X), "Faites glisser pour voir toutes les entreprises")}</div>
        ${notes.length ? `<ul class="cmpr-notes">${notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
        ${cmprIABar(cos.length, null)}</section>
      <details class="rf-pl rf-pl2" id="cmpr-crit"><summary><b>Comprendre chaque critère</b><span>Ce que mesure chaque ligne, et où chacune se place dans son secteur</span></summary><div class="rf-plb cmpr-crits">${crit}</div></details>
      <details class="rf-pl rf-pl2" id="cmpr-tout"><summary><b>Les indicateurs, un par un</b><span>Marges, dette, trésorerie, dividende, côte à côte</span></summary><div class="rf-plb" id="cmpr-toutb"></div></details>
      <details class="rf-pl rf-pl2" id="cmpr-src"><summary><b>Sources et dates</b><span>Les comptes officiels de chaque entreprise</span></summary><div class="rf-plb" style="padding:12px 22px">${cmprSources(X)}</div></details>`;
    // le tableau complet est construit par l'ancien rendu, à l'ouverture du pli seulement
    const tout = $("#cmpr-tout"); if (tout) tout.addEventListener("toggle", () => { const tb = $("#cmpr-toutb"); if (!tout.open || !tb || tb.dataset.on) return; tb.dataset.on = "1"; const tmp = document.createElement("div"); tmp.id = "cmpr-body"; const old = el; el.id = "cmpr-body-x"; document.body.appendChild(tmp); try { b0(ids); } catch (e) { } el.id = "cmpr-body"; const full = tmp.querySelector("#cmpr-tout .accb, #cmpr-tout > *:not(summary)"); tb.innerHTML = full ? full.innerHTML : "<p class='muted' style='padding:12px'>Indisponible</p>"; tmp.remove(); if (typeof tblxBindScroll === "function") tblxBindScroll(tb); }, { once: true });
    if (typeof tblxBindScroll === "function") tblxBindScroll(el);
    // 31/10 (Romain) : la meilleure valeur de chaque ligne en vert, la moins bonne en rouge, au sens du critère (une dette plus basse est en tête) ; le reste sans couleur
    const t = $("#cmpr-body .rf-ctab-t"); if (t) {
      $$("tbody tr[data-k]", t).forEach(tr => { const l = V.lines.find(x => x.T.k === tr.dataset.k); if (!l || !l.S || !l.S.sorted || l.S.sorted.length < 2 || l.T.neutral) return;
        const cells = [...tr.querySelectorAll("td")].filter(td => !td.classList.contains("rf-medc") && !td.classList.contains("rf-q"));
        const idx = F => X.F.indexOf(F), best = l.S.best, worst = l.S.sorted.at(-1);
        if (best && cells[idx(best.F)]) cells[idx(best.F)].classList.add("rf-hi");
        if (worst && worst !== best && cells[idx(worst.F)] && worst.r.key !== l.S.sorted[0].r.key) cells[idx(worst.F)].classList.add("rf-lo"); });
      if (typeof cmprBarres === "function") cmprBarres(t, X, cos[0], gagne); // 1/11 (Romain) : une barre par case et le trait de la médiane, à la place des petites courbes
      // en tête : le nom de l'entreprise qui mène le plus de critères est souligné
      const lead = Object.entries(gagne).sort((a, b) => b[1] - a[1])[0]; if (lead && lead[1] > 0) $$(".cmpr-ligne span", el).forEach(sp => { if (sp.textContent.startsWith(RBY[lead[0]].name)) sp.classList.add("cmpr-lead"); });
      const box = t.closest(".cmpr-tbl"); box.insertAdjacentHTML("beforeend", `<p class="cmpr-csvp"><button type="button" class="btn ghost" data-cmpr-csv>Exporter en CSV</button><span class="light" style="font-size:12.5px">vert ▲ : en tête sur ce critère · rouge ▼ : en retrait · trait noir : médiane du secteur · colonne « Secteur » : la valeur du milieu (médiane) des entreprises du secteur de ${esc(cos[0].name)} suivies par le site, c'est-à-dire ce qui est « normal » dans ce secteur</span></p>`);
      $("[data-cmpr-csv]", box).onclick = () => { const rows = [...t.querySelectorAll("tr")].map(tr => [...tr.querySelectorAll("th,td")].map(c => `"${c.innerText.replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`).join(";")); const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `comparaison-${ids.join("-")}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }; }
  };
  /* styles : voir site.css */
})();
/* Lot C (30/10) : /etf sur téléphone. Recherche et filtres rapides visibles ; les menus déroulants et le tri derrière un bouton
   « Filtres (n) » qui ouvre un panneau du bas (fermé par ✕, Échap ou un toucher à côté). Sur ordinateur, rien ne change. */
(function () {
  const e0 = window.pageEtfs; if (typeof e0 !== "function") return;
  const tel = () => matchMedia("(max-width:760px)").matches;
  const nActifs = () => $$(".etfflt select, #etri").filter(s => s.value && s.value !== "all" && s.value !== (s.id === "etri" ? s.options[0].value : "all")).length;
  const maj = () => { const b = $("#etf-flt-btn"); if (b) { const n = nActifs(); b.textContent = `Filtres${n ? ` (${n})` : ""}`; } };
  const fermer = () => { document.documentElement.classList.remove("etf-flt-open"); const b = $("#etf-flt-btn"); if (b) { b.setAttribute("aria-expanded", "false"); maj(); } };
  window.pageEtfs = function () {
    const r = e0.apply(this, arguments);
    if (!tel() || $("#etf-flt-btn", app)) return r;
    const flt = $(".etfflt", app), pre = $("#epre", app), tri = $("#etri", app); if (!flt || !pre) return r;
    pre.insertAdjacentHTML("afterend", `<p class="etf-flt-p"><button type="button" class="btn ghost" id="etf-flt-btn" aria-expanded="false" aria-controls="etf-flt-panel">Filtres</button></p>`);
    flt.id = "etf-flt-panel"; flt.insertAdjacentHTML("afterbegin", `<div class="etf-flt-h"><b>Filtres</b><button type="button" class="etf-flt-x" aria-label="Fermer">✕</button></div>`);
    if (tri && tri.parentElement) { const w = document.createElement("div"); w.innerHTML = `<label for="etri">Trier par</label>`; w.appendChild(tri); flt.appendChild(w); }
    flt.insertAdjacentHTML("beforeend", `<p class="etf-flt-ok"><button type="button" class="btn" id="etf-flt-ok">Voir les résultats</button></p>`);
    document.body.insertAdjacentHTML("beforeend", `<div class="etf-flt-bg" id="etf-flt-bg"></div>`);
    $("#etf-flt-btn").onclick = () => { const o = !document.documentElement.classList.contains("etf-flt-open"); document.documentElement.classList.toggle("etf-flt-open", o); $("#etf-flt-btn").setAttribute("aria-expanded", String(o)); };
    $(".etf-flt-x", flt).onclick = fermer; $("#etf-flt-ok").onclick = fermer; $("#etf-flt-bg").onclick = fermer;
    document.addEventListener("keydown", e => { if (e.key === "Escape") fermer(); });
    flt.addEventListener("change", maj); maj();
    return r;
  };
  /* styles : voir site.css */
})();
/* Lot C (30/10) : téléphone. Pied de page en deux colonnes sous 600 px ; aucun texte sous 12 px (13 px pour ce qui porte un
   chiffre) ; cibles tactiles d'au moins 44 px. Les classes connues sont traitées en CSS ; un passage JS, après chaque page,
   relève ce qui resterait en dessous (le site a des centaines de petits libellés hérités). */
/* styles : voir site.css */
(() => { // passage JS : tout texte encore sous 12 px est remonté (13 px s'il contient un chiffre) ; cibles tactiles sous 44 px rehaussées
  if (!matchMedia("(max-width:760px)").matches) return;
  let t = null;
  const passe = () => { t = null; const main = document.querySelector("main"); if (!main) return;
    main.querySelectorAll("*").forEach(e => { if (!e.childNodes.length || e.closest("svg,script,style,.sr")) return; const txt = [...e.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent).join("").trim(); if (!txt) return;
      const fs = parseFloat(getComputedStyle(e).fontSize), min = /\d/.test(txt) ? 13 : 12; if (fs < min) e.style.fontSize = min + "px"; });
    main.querySelectorAll("a[href],button").forEach(e => { if (e.closest(".tbx-sc table,.rf-ctab,.pcmp,.fh-tags,.fh-ids,.tags,.ax-chips,.acc-cat") || e.classList.contains("prov-i") || e.classList.contains("tag") || e.classList.contains("ax-chip") || getComputedStyle(e).display === "inline") return; /* .prov-i : zone tactile de 44 px par pseudo-élément, le rond reste petit */ const h = e.getBoundingClientRect().height; if (h > 0 && h < 44) { e.style.minHeight = "44px"; if (getComputedStyle(e).display === "inline-block") { e.style.display = "inline-flex"; e.style.alignItems = "center"; } } });
  };
  const plan = () => { if (t) return; t = setTimeout(passe, 400); };
  new MutationObserver(plan).observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
  plan();
})();
