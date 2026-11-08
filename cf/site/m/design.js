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
/* Page Outils : retouches retirées le 3/11/2026, la page est refaite dans m/outils4.js. */
/* Page Entreprises : classements et découvertes du jour intégrés en tête (30/10, Romain : moins de pages) */
(function () {
  const e0 = window.pageEntreprises; if (typeof e0 !== "function") return;
  window.pageEntreprises = function () {
    const r = e0.apply(this, arguments);
    const sub = $(".pagesub", app);
    // 7/11 : plus de « découverte de la semaine » (Romain)
    return r;
  };
  /* styles : voir site.css */
})();
/* Liste des ETF : retouches retirées le 3/11/2026, la page est refaite dans m/etfs4.js. */
/* styles : voir site.css */
/* styles : voir site.css */
/* Premium : liste d'attente (30/10) */
/* styles : voir site.css */
/* Lot 2 : la porte Marchés */
/* styles : voir site.css */
/* Fiche ETF : retouches retirées le 3/11/2026, la page est refaite dans m/etf4.js. */
/* Comparer : retouches retirées le 3/11/2026, la page est refaite dans m/comparer4.js. */
/* Lot 6 : finitions. Codes boursiers et ISIN en police à chasse fixe ; les chiffres sont en police normale (chasse tabulaire, index.html). */
/* styles : voir site.css */
/* Lot 6 : un seul style de badge (vert, gris, rouge). Les catégories d'annonces (résultats, dividende…) sont grises ; seul « info privilégiée » reste signalé. */
/* styles : voir site.css */

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
    main.querySelectorAll("a[href],button").forEach(e => { if (e.closest(".tbx-sc table,.rf-ctab,.pcmp,.fh-tags,.fh-ids,.tags,.ax-chips,.acc-cat") || e.classList.contains("prov-i") || e.classList.contains("tag") || e.classList.contains("ax-chip") || getComputedStyle(e).display === "inline") return; /* .prov-i : zone tactile de 44 px par pseudo-élément, le rond reste petit */ const h = e.getBoundingClientRect().height; if (h > 0 && h < 44) { const cs = getComputedStyle(e), w = e.getBoundingClientRect().width;
        /* 8/11 : un rond (croix « retirer ») ou un lien souligné par une bordure se déformait en ovale : zone tactile invisible à la place */
        if ((parseFloat(cs.borderTopLeftRadius) >= h / 2 - 1 && Math.abs(w - h) < 4) || (parseFloat(cs.borderBottomWidth) > 0 && !parseFloat(cs.borderTopWidth))) { e.classList.add("ek-tz"); if (cs.position === "static") e.style.position = "relative"; return; }
        e.style.minHeight = "44px"; if (getComputedStyle(e).display === "inline-block") { e.style.display = "inline-flex"; e.style.alignItems = "center"; } } });
  };
  const plan = () => { if (t) return; t = setTimeout(passe, 400); };
  new MutationObserver(plan).observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
  plan();
})();
