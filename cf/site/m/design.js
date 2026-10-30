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
  if (pts.length < 2) {
    el.innerHTML = `<div class="dsgc dsgc-vide"><p>Un seul relevé de cours est disponible pour cette valeur : ${dsgFmt(q.p, q.cur)}. Il n'y a pas encore de quoi tracer une évolution.</p></div>`;
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

document.head.insertAdjacentHTML("beforeend", `<style>
/* Lisibilité (29/10/2026, demande de Romain) : les petites étiquettes (VENTES, BÉNÉFICE, DIVIDENDE…) étaient en police à chasse fixe,
   11 px, gris clair : illisibles. Partout sur le site, elles passent en police de texte, 12 px, graisse 600, gris moyen. Les chiffres restent en chasse fixe. */
.kick,.ess .lbl,.lbl,.pxhead .kick,.tile .kick,.ftile .kick,.rf-keys .fk .kick,.rf-trimh .kick,.pf3 .kick,.pf3hero .kick,.acc .kick,.cmpr .kick,.rf-sum .kick,.ctx .kick{font-family:var(--sans);font-size:12.5px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--grey)}
.rf-keys .fk .kick{font-size:12.5px}
/* Apaisement (29/10/2026, soir) : Romain trouve le site « fatigant » : trop d'étiquettes colorées, de titres de couleurs.
   Règle : la couleur ne sert qu'au sens (vert = favorable, orange = à surveiller, hausse / baisse). Tout le reste est gris ou encre.
   Ici l'accueil ; la même règle sera appliquée page par page. */
.acc{--accf:var(--grey);--acci:var(--grey);--acch:var(--grey);--accs:var(--grey)}
.acc .acc-tag{font:600 11px/1 var(--sans);letter-spacing:.04em;background:transparent;color:var(--grey);border:1px solid var(--line);padding:3px 7px;border-radius:99px}
.acc .acc-tag.acc-tf{background:var(--ink);color:#fff;border-color:var(--ink)}
.acc .acc-tag.acc-th{border-style:dashed}
.acc .acc-lf,.acc .acc-li,.acc .acc-lh,.acc .acc-ls{--c:var(--line)}
.acc em.acc-smx{color:var(--ink)}
.acc .acc-trust svg{stroke:var(--grey)}.acc .acc-dot{background:var(--grey)}
.acc .acc-al.fav b,.acc .acc-age.fav b{color:var(--ink)}
.acc .pill,.acc .badge{background:#F1EFEA;color:var(--grey);border:0}
.acc .pill.fort,.acc .badge.fort{background:#E6F3EB;color:#176B40}.acc .pill.vig,.acc .badge.vig{background:#FBEBE2;color:#A8481A}
/* Sujets du jour : la carte garde le fait et l'interprétation ; hypothèse et entreprises à surveiller s'ouvrent avec « Approfondir » */
.acc .acc-sj .acc-lh,.acc .acc-sj .acc-ls{display:none}
/* Onglet Chiffres en détail, apaisé (30/10) : cartes « ce qui a le plus changé » blanches, seul le chiffre porte la couleur ;
   « Ce qui explique ces chiffres » replié sous une phrase de lecture */
.rf-chg{background:#fff!important;border:1px solid var(--line2)!important;border-left-width:1px!important}
details.ctx-in{border-top:1px solid var(--line2);padding:0 22px}details.ctx-in > summary{list-style:none;cursor:pointer;padding:14px 0;display:flex;flex-direction:column;gap:3px}
details.ctx-in > summary::-webkit-details-marker{display:none}
details.ctx-in > summary .ctx-ti{font-family:var(--serif);font-size:17px;font-weight:800}details.ctx-in > summary .ctx-ti:after{content:" +";font-family:var(--sans);color:var(--light)}details.ctx-in[open] > summary .ctx-ti:after{content:" −"}
details.ctx-in > summary .ctx-sl{font-size:13.5px;color:var(--grey);line-height:1.5}details.ctx-in > .pb{padding-left:0;padding-right:0}
/* Accueil, allégé (30/10, nuit) : l'accueil montre l'essentiel ; la suite est dans Actualités.
   Plus de liste « autres sujets suivis », plus de liste « autres annonces », plus de colonne presse : l'agenda reste seul à côté des annonces. */
.acc .acc-autres,.acc .acc-als,.acc .acc-als + *,.acc .acc-annside > section:nth-child(2){display:none}
.acc .acc-annw .acc-annm .acc-ah{display:none}
/* Comparer, apaisé (30/10) : la règle des couleurs n'est plus répétée sous chaque thème (une légende en tête suffit) */
.cmpr-exp .cmpr-rule{display:none}
/* Accessibilité (point 7, 29/10/2026) : sur téléphone, aucun texte sous 11 px, aucune cible tactile sous 24 px */
.lg b{font-size:max(9px,calc(var(--s) * .36))}
@media (max-width:760px){
  table.t th,.cmpr-badge,.cmpr-all tr.grp th,.cmpr-sug .h,.ctx-tag,.ess .lbl,.rf-fct th[scope=row] small,table.tbx-full thead th small{font-size:11px}
  .prov-i{width:24px;height:24px;font-size:12px;margin-left:4px}
  .linkbtn,.crumbs a,a.more,button.more{padding-top:5px;padding-bottom:5px;min-height:28px;display:inline-flex;align-items:center}
  .def,.lnk{padding-top:5px;padding-bottom:5px;line-height:1.3} /* restent en ligne : un mot défini peut passer à la ligne */
  .cmpr-x{width:36px;height:36px}
  span.ctx-tag{font-size:11px}
  a.th,.cmpr-all a.th{display:inline-flex;align-items:center;min-height:28px}
  .cmpr-co{min-height:28px}
  .fh-act .favbtn{min-height:40px}
  .tbx-gb{min-width:40px;min-height:36px}
  /* Stabilité (point 7) : la place du cours et de la fiche est réservée avant leur arrivée, rien ne saute */
  #pxh{min-height:112px}
  .rf-mid .rf-sum.fh-wait{min-height:560px}
}
#ctab > .empty:only-child{min-height:70vh}
.rf-mid .rf-sum.fh-wait{min-height:470px}
.f2-chart{display:flex;flex-direction:column;overflow:hidden}.f2-chart #tvchart,.f2-chart .tradingview-widget-container{overflow:hidden}.f2-chart #tvchart.f2-tv{flex:1 1 auto;height:auto;min-height:300px}
@media (max-width:760px){.f2-chart #tvchart.f2-tv{min-height:240px}}
.dsg-tv{height:100%;display:flex;flex-direction:column}
.dsg-tv .tradingview-widget-container__widget{flex:1 1 auto;min-height:0}
.dsg-tv .tradingview-widget-copyright{font-size:11.5px;color:var(--grey);padding:6px 0 0;text-align:right}
.dsg-tv .tradingview-widget-copyright a{color:var(--grey)}
.dsgc{display:flex;flex-direction:column;height:100%;gap:8px}
.dsgc svg{flex:1 1 auto;width:100%;min-height:200px}
.dsgc-ax{font-size:11.5px;fill:var(--grey);font-family:var(--mono,inherit)}
.dsgc-vl{font-size:13px;font-weight:700;fill:var(--ink)}
.dsgc-dt{font-size:11.5px;fill:var(--grey)}
.dsgc-lg{margin:0;font-size:12.5px;line-height:1.5;color:var(--grey)}
.dsgc-vide{justify-content:center;align-items:center;text-align:center;color:var(--grey);font-size:14px;padding:20px}
.dsgc-vide p{margin:0;max-width:34em}

/* ---------- 2. Présentation ---------- */
/* Gris trop clair pour être lu : contraste porté au seuil recommandé. */
:root{--light:#6E6961}
/* Un cadre dans un cadre : on garde un seul trait, l'air fait la séparation. */
.panel .panel{border:0;box-shadow:none;background:transparent;padding:0}
/* Les sources répétées sous chaque point : présentes, mais en retrait. */
.srcline,.pt-src{font-size:12px;color:var(--light)}
</style>`);

/* 30/10 (demande de Romain) : plus de mini-courbes dans les tableaux de chiffres ; la colonne garde la variation sur un an.
   Le graphique complet reste au-dessus du tableau de chaque thème. */
function tblxSpark() { return ""; }
document.head.insertAdjacentHTML("beforeend", `<style>.tbx-gb:empty,.tbx-trw:empty{display:none}</style>`);
document.head.insertAdjacentHTML("beforeend", `<style>.pxhead .pxeur{display:block;font-size:13px;color:var(--grey);margin:-2px 0 4px}@media (max-width:760px){.pxhead .pxeur{display:inline;margin:0 0 0 8px}}</style>`);
/* Accueil (30/10) : sous-titres en police de texte, sans capitales espacées */
document.head.insertAdjacentHTML("beforeend", `<style>.acc .acc-subh h3{font-family:var(--sans);font-size:16px;font-weight:700;letter-spacing:0}.acc .acc-ah{font:600 13px var(--sans);letter-spacing:0;text-transform:none;color:var(--grey)}</style>`);
/* Règle de police, tout le site (30/10, demande de Romain) : la serif pour les titres de page et de bloc (h1, h2) ;
   la police de texte pour tout le reste, sous-titres compris ; la chasse fixe uniquement pour les chiffres. */
document.head.insertAdjacentHTML("beforeend", `<style>
h3,h4,h5,.ctx-h,.rf-h3,.acc-sj h3,.acc-l b,.synk li b,summary,.anf-ctxd > summary,.cmpr-det > summary{font-family:var(--sans)!important;letter-spacing:0}
h3,.rf-h3,.ctx-h{font-weight:700}
.kick,.synhero .kick,.synhome .kick,.par-demo .kick,.par-demo .tag,.acc-sj .kick,.acc-sjk,.pxhead .kick,.tile .kick,.ftile .kick,.cmpr-ind,.ctx-k,.ctx-d,.rf-ctab th small,.tbx-unit,.acc-legend span,.synmeta span,.acc-tag{font-family:var(--sans)!important;letter-spacing:.02em}
.ctx-d{font-variant-numeric:tabular-nums}
</style>`);
document.head.insertAdjacentHTML("beforeend", `<style>
/* Étiquettes encore en chasse fixe (relevé du 30/10) : toutes en police de texte */
.anf-sait h4,.ess .lbl,.cmpr-sug .h,.cmpr-badge,.cmpr-vl .th,.cmpr-all tr.grp th,.fbt,.pf3bdg,.pf3dx span,.cm-n,table.tbx .u,.pf3mq,.syncat,.synnews .cat,.acc-tag{font-family:var(--sans)!important;letter-spacing:.02em}
.cmpr-all tr.grp th,.fbt,.anf-sait h4,.cmpr-sug .h{font-size:12.5px;font-weight:600;text-transform:none}
</style>`);
function synSpark() { return ""; } // 30/10 (Romain) : plus de petites courbes, nulle part
/* 30/10 (Romain, DESIGN.md) : plus aucune capitale espacée nulle part ; les petites étiquettes en Plex Sans, pas en chasse fixe */
document.head.insertAdjacentHTML("beforeend", `<style>
body *{text-transform:none!important}
small,th,.kick,.navpied p,.par-sect,.par-tools small,.par-demo .kick,.pa-keep small,.ctx-k,.ctx-th,.out-crit,.out-dc small,.o2-sc,.o2-tile small,.etft3 small,.etfcols small,.pf3hd,.pf3bd,.pf3bdg,.pf3dx,.pf3ipv,.rf-bl h3,.rf-card h4,.fbt,.syncat,.synev,.synevol,.rc-exq,.tbx thead th,.pop .kick{letter-spacing:0!important}
.navpied p,table.t th,.tbx thead th,.par-sect,.par-tools small,.pa-keep small,.ctx-k,.ctx-th,.out-crit,.o2-sc,.pf3hd,.pf3bd,.pf3bdg,.pf3dx,.fbt,.syncat,.synev,.synevol,.rc-exq,.rf-ctab th .rf-cth,.acc-agd{font-family:var(--sans)!important}
.navpied p{font-weight:700;color:var(--ink);font-size:13px}
</style>`);
/* Par où commencer : trois écrans visuels (30/10) */
document.head.insertAdjacentHTML("beforeend", `<style>
.cm3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:0 0 18px}
.cm3-c{display:flex;flex-direction:column;gap:6px;padding:20px 22px;border:1px solid var(--rule);border-radius:14px;background:#fff;color:var(--ink);text-decoration:none;min-height:230px}.cm3-c:hover{border-color:var(--ink)}
.cm3-n{font-family:var(--mono);font-size:12px;color:var(--light)}.cm3-t{font-family:var(--serif)!important;font-weight:800;font-size:22px;line-height:1.1;letter-spacing:-.01em}
.cm3-v{font-family:var(--mono);font-weight:500;font-size:34px;line-height:1;margin-top:10px}.cm3-u{font-size:13px;color:var(--grey)}.cm3-d{font-size:14px;line-height:1.5;color:var(--grey);margin-top:8px;flex:1}.cm3-l{font-size:13.5px;font-weight:600;margin-top:8px}
@media (max-width:760px){.cm3{grid-template-columns:minmax(0,1fr)}.cm3-c{min-height:0}.cm3-v{font-size:28px}}
</style>`);
/* Page Outils (lot 2 et 5, 30/10) : deux familles, des cartes visuelles (icône, nom, une ligne). Chaque outil n'est listé qu'ici. */
(function () {
  const I = { epargne: "M4 18l5-6 4 3 7-9M4 4v16h16", passe: "M12 8v4l3 2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0", verif: "M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7zM9 12l2 2 4-4", repart: "M12 3v9h9a9 9 0 1 1-9-9zM14 3a9 9 0 0 1 7 7h-7z", listes: "M4 6h16M4 12h10M4 18h7", comparer: "M4 20V9M10 20V4M16 20v-8M22 20H2", recouv: "M9 12a5 5 0 1 0 0-.01M15 12a5 5 0 1 0 0-.01", pf: "M3 7h18v12H3zM3 11h18M8 7V4h8v3", frais: "M4 4h16v16H4zM8 9h8M8 13h5M8 17h3", impot: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h3", livret: "M4 6h16v12H4zM4 10h16" };
  const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[k]}"/></svg>`;
  const G = [
    ["Pour débuter", "Avec vos chiffres, hypothèses affichées", [
      ["/simulateurs/epargne", "epargne", "Simulateur d'épargne", "Ce que devient une somme placée chaque mois, frais et impôt compris."],
      ["/outils/si-javais", "passe", "Et si j'avais investi ?", "1 000 € placés il y a 1, 3 ou 5 ans, comparés au marché."],
      ["/outils/verifier", "verif", "Vérifier une offre", "Un site ou un conseiller face aux listes noires de l'AMF."],
      ["/repartitions", "repart", "Répartitions types", "Des exemples de répartition expliqués, sans personnalisation."],
      ["/livret-a-ou-bourse", "livret", "Livret A ou Bourse ?", "100 € par mois sur 10, 20 ou 30 ans, inflation comprise."],
    ]],
    ["Pour aller plus loin", "Trier, comparer, radiographier", [
      ["/repartitions#listes", "listes", "Listes par critères", "Les entreprises qui répondent aux critères que vous choisissez."],
      ["/comparer", "comparer", "Comparer des entreprises", "Côte à côte, critère par critère, face à la médiane du secteur."],
      ["/outils/recouvrement", "recouv", "Deux ETF se recouvrent-ils ?", "Les entreprises que deux à quatre ETF ont en commun."],
      ["/portefeuille", "pf", "Mon portefeuille", "Frais réels, doublons d'ETF, concentration, dividendes."],
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
  document.head.insertAdjacentHTML("beforeend", `<style>
.ot-g{margin:22px 0 0}.ot-h{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 10px}.ot-h h2{font-family:var(--serif);font-weight:800;font-size:24px;margin:0}.ot-h span{font-size:13px;color:var(--grey)}
.ot-c{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ot-k{display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-areas:"i t" "i d";gap:2px 10px;padding:16px 18px;border:1px solid var(--rule);border-radius:6px;background:#fff;color:var(--ink);text-decoration:none}
.ot-k svg{grid-area:i;width:26px;height:26px;margin-top:1px}.ot-k b{grid-area:t;font-size:16px}.ot-k span{grid-area:d;font-size:13px;line-height:1.45;color:var(--grey)}
.ot-k:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
@media (max-width:900px){.ot-c{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.ot-c{grid-template-columns:minmax(0,1fr)}}
</style>`);
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
  document.head.insertAdjacentHTML("beforeend", `<style>
.ent-plus{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);margin:0 0 14px}
.ent-plus a{display:flex;flex-direction:column;gap:2px;padding:12px 18px 12px 0;border-right:1px solid var(--rule);color:var(--ink);text-decoration:none}.ent-plus a+a{padding-left:18px}.ent-plus a:last-child{border-right:0}.ent-plus b{font-size:15px}.ent-plus span{font-size:13px;color:var(--grey)}.ent-plus a:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
@media (max-width:760px){.ent-plus{grid-template-columns:minmax(0,1fr)}.ent-plus a{border-right:0;border-bottom:1px solid var(--rule);padding-left:0!important}.ent-plus a:last-child{border-bottom:0}}
</style>`);
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
document.head.insertAdjacentHTML("beforeend", `<style>.prem-av{margin:6px 0 14px!important;max-width:none}.prem-av li{padding-top:14px!important;padding-bottom:12px!important}.prem-av b{font-size:16px!important}.prem-av span{font-size:13.5px!important}.prem-preuve{font-size:13px;color:var(--grey);margin:0 0 18px;max-width:820px}</style>`);
document.head.insertAdjacentHTML("beforeend", `<style>
.aca-lead{font-size:19px!important;line-height:1.45!important;color:var(--ink)!important;max-width:760px}
.aca-outil{margin:-8px 0 20px}.acales .aca-outil a{display:inline-block;border:1px solid var(--ink);border-radius:999px;padding:7px 14px;font-weight:600;font-size:14px;text-decoration:none;color:var(--ink)}.acales .aca-outil a:hover{background:var(--lime)}
.acavis{margin:18px 0 22px;padding:18px 22px;border:1px solid var(--rule);border-radius:14px;background:#fff}.acavis-k{font-size:12.5px;font-weight:600;color:var(--grey);margin:0 0 10px}
.acavis-n{display:flex;flex-wrap:wrap;gap:8px 28px;margin:0 0 12px}.acavis-n b{font-family:var(--mono);font-weight:500;font-size:30px;line-height:1;white-space:nowrap}
.acavis-p{margin:0;font-size:14.5px;line-height:1.55;color:var(--grey)}.acavis-p mark.nm{background:transparent;color:var(--ink);font-family:var(--mono);font-weight:500}
@media (max-width:760px){.acavis-n b{font-size:24px}.acavis{padding:14px 16px}}
</style>`);
/* Premium : liste d'attente (30/10) */
document.head.insertAdjacentHTML("beforeend", `<style>.prem-bientot{margin:0;font-weight:600;color:var(--grey)}.prem-att{margin-top:14px;border-left:3px solid var(--lime)}.prem-attm{margin:8px 0 0;font-size:14px;min-height:1.2em}.prem-attm.ok{color:var(--g)}.prem-attm.ko{color:var(--o)}.ptab td:nth-child(3) b{font-weight:600}</style>`);
/* Lot 2 : la porte Marchés */
document.head.insertAdjacentHTML("beforeend", `<style>.mk-portes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 30px}.mk-porte{display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-areas:"i t" "i n" "d d";gap:2px 10px;padding:16px 18px;border:1px solid var(--rule);border-radius:6px;background:#fff;color:var(--ink);text-decoration:none}.mk-porte svg{grid-area:i;width:26px;height:26px;margin-top:2px}.mk-porte b{grid-area:t;font-size:17px}.mk-porte small{grid-area:n;font-family:var(--mono);font-size:12.5px;color:var(--grey)}.mk-porte span{grid-area:d;margin-top:8px;font-size:13.5px;line-height:1.45;color:var(--grey)}.mk-porte:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}@media (max-width:900px){.mk-portes{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:480px){.mk-portes{grid-template-columns:minmax(0,1fr)}}</style>`);
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
  document.head.insertAdjacentHTML("beforeend", `<style>.rf-etf ~ .cols .rf-l2h{margin:6px 0 10px}.cols details.rf-pl2{margin:0 0 12px}.cols details.rf-pl2 .rf-th-in.panel{border:0;box-shadow:none;margin:0;border-radius:0}</style>`);
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
  document.head.insertAdjacentHTML("beforeend", `<style>
.cmpr-vide .cmpr-sel{display:block}.cmpr-vide .cmpr-add{padding:18px 22px;border-style:solid;border-color:var(--ink);background:#fff}.cmpr-vide .cmpr-add label{font-size:15px;color:var(--ink)}.cmpr-vide .cmpr-q input{font-size:18px;padding:12px 14px}
.rf-ctab-t td.rf-hi::after{content:" ▲";font-size:10px}.rf-ctab-t td.rf-lo::after{content:" ▼";font-size:10px;color:var(--grey)}
.cmpr-csvp{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:10px 18px 14px}
.out-gal6 .out-pg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}@media (max-width:900px){.out-gal6 .out-pg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:560px){.out-gal6 .out-pg{grid-template-columns:minmax(0,1fr)}}
</style>`);
})();
/* Lot 6 : finitions. Codes boursiers et ISIN en police à chasse fixe ; les chiffres sont en police normale (chasse tabulaire, index.html). */
document.head.insertAdjacentHTML("beforeend", `<style>.etfhd .ids b,.fhero .tags .tag:first-child,.rf-trimt td:last-child{font-family:var(--code);font-size:.95em}</style>`);
/* Lot 6 : un seul style de badge (vert, gris, rouge). Les catégories d'annonces (résultats, dividende…) sont grises ; seul « info privilégiée » reste signalé. */
document.head.insertAdjacentHTML("beforeend", `<style>.ax-chip,.acc-cat{color:var(--grey)!important;background:var(--soft)!important;border-color:var(--rule)!important}.ax-imp{color:var(--o)!important;background:color-mix(in srgb,var(--o) 10%,transparent)!important;border-color:transparent!important}</style>`);
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
        ${ligne ? `<p class="cmpr-ligne">${ligne}</p>` : ""}
        <div class="cmpr-tbl">${tblxScrollBox(rfCmpTableHTML(cos[0], X), "Faites glisser pour voir toutes les entreprises")}</div>
        ${notes.length ? `<ul class="cmpr-notes">${notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
        ${cmprIABar(cos.length, null)}</section>
      <details class="rf-pl rf-pl2" id="cmpr-crit"><summary><b>Comprendre chaque critère</b><span>Ce que mesure chaque ligne, et où chacune se place dans son secteur</span></summary><div class="rf-plb cmpr-crits">${crit}</div></details>
      <details class="rf-pl rf-pl2" id="cmpr-tout"><summary><b>Les indicateurs, un par un</b><span>Marges, dette, trésorerie, dividende, côte à côte</span></summary><div class="rf-plb" id="cmpr-toutb"></div></details>
      <details class="rf-pl rf-pl2" id="cmpr-src"><summary><b>Sources et dates</b><span>Les comptes officiels de chaque entreprise</span></summary><div class="rf-plb" style="padding:12px 22px">${cmprSources(X)}</div></details>`;
    // le tableau complet est construit par l'ancien rendu, à l'ouverture du pli seulement
    const tout = $("#cmpr-tout"); if (tout) tout.addEventListener("toggle", () => { const tb = $("#cmpr-toutb"); if (!tout.open || !tb || tb.dataset.on) return; tb.dataset.on = "1"; const tmp = document.createElement("div"); tmp.id = "cmpr-body"; const old = el; el.id = "cmpr-body-x"; document.body.appendChild(tmp); try { b0(ids); } catch (e) { } el.id = "cmpr-body"; const full = tmp.querySelector("#cmpr-tout .accb, #cmpr-tout > *:not(summary)"); tb.innerHTML = full ? full.innerHTML : "<p class='muted' style='padding:12px'>Indisponible</p>"; tmp.remove(); if (typeof tblxBindScroll === "function") tblxBindScroll(tb); }, { once: true });
    if (typeof tblxBindScroll === "function") tblxBindScroll(el);
    // ▲ ▼ par ligne et export CSV (lot 5), conservés
    const t = $("#cmpr-body .rf-ctab-t"); if (t) { const num = x => { const m = String(x).replace(/\s/g, "").match(/-?\d+(?:[,.]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : null; };
      $$("tbody tr", t).forEach(tr => { if (tr.classList.contains("rf-q")) return; const cells = [...tr.querySelectorAll("td")].filter(td => !td.classList.contains("rf-medc") && !td.classList.contains("rf-q")), vals = cells.map(td => num(td.textContent)); const ok = vals.filter(v => v != null); if (ok.length < 2 || Math.max(...ok) === Math.min(...ok)) return; const hi = vals.indexOf(Math.max(...ok)), lo = vals.indexOf(Math.min(...ok)); cells[hi].classList.add("rf-hi"); cells[lo].classList.add("rf-lo"); });
      const box = t.closest(".cmpr-tbl"); box.insertAdjacentHTML("beforeend", `<p class="cmpr-csvp"><button type="button" class="btn ghost" data-cmpr-csv>Exporter en CSV</button><span class="light" style="font-size:12.5px">▲ le plus élevé · ▼ le plus bas de la ligne · médiane : les entreprises du secteur de ${esc(cos[0].name)} suivies par le site</span></p>`);
      $("[data-cmpr-csv]", box).onclick = () => { const rows = [...t.querySelectorAll("tr")].map(tr => [...tr.querySelectorAll("th,td")].map(c => `"${c.innerText.replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`).join(";")); const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `comparaison-${ids.join("-")}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }; }
  };
  document.head.insertAdjacentHTML("beforeend", `<style>
.cmpr-ligne{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;margin:0;padding:16px 22px 6px;font-size:15px}.cmpr-ligne i{color:var(--light);font-style:normal}.cmpr-ligne small{color:var(--grey);font-size:12.5px}
.cmpr-crits{padding:6px 22px 12px}.cmpr-crit{padding:12px 0;border-top:1px solid var(--rule)}.cmpr-crit:first-child{border-top:0}.cmpr-crit h3{margin:0 0 4px;font-size:15px}.cmpr-crit p{margin:0 0 8px;font-size:13.5px;color:var(--grey);max-width:720px}
.cmpr-jg{display:grid;grid-template-columns:170px minmax(0,1fr);gap:4px 14px;align-items:center;padding:4px 0}.cmpr-jg>span{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600}.cmpr-jg .rf6-jg small{font-size:11.5px}
#cmpr-body .rf-ctab-t th.rf-medh:last-child,#cmpr-body .rf-ctab-t td.rf-q{display:none} /* la colonne « La moitié du secteur » n'est plus affichée : le tableau tient dans le cadre */
@media (max-width:600px){.cmpr-jg{grid-template-columns:minmax(0,1fr)}}
</style>`);
})();
