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
/* Page Outils : quatre groupes, descriptions entières (30/10, Romain : « trop d'outils ») */
(function () {
  const G = [
    ["Mon argent", "Combien, à quel rythme, avec quels frais", [["/simulateurs", "Simulateur d'épargne", "Versements mensuels, frais réels, impôt PEA ou compte-titres, trois scénarios tirés de l'histoire."], ["/simulateurs/frais", "Le même plan chez chaque courtier", "Ce que coûtent le courtage et les frais du fonds sur toute la durée."], ["/outils/si-javais", "Et si j'avais investi ?", "Une somme placée il y a 1, 3 ou 5 ans, comparée à un indice, au livret A et à la hausse des prix."], ["/livret-a-ou-bourse", "Livret A ou Bourse", "Ce que chacun a rapporté, et ce que chacun fait perdre certaines années."]]],
    ["Mon portefeuille", "Ce que vous possédez vraiment", [["/portefeuille", "Radiographie de portefeuille", "Vos ETF ouverts : entreprises, pays, frais, dividendes, concentration."], ["/outils/recouvrement", "Mes ETF se recouvrent-ils ?", "2 à 4 ETF : positions communes, poids en double, secteurs et devises combinés."], ["/dividendes", "Calendrier des dividendes", "Détachements et paiements à venir, à ajouter à votre agenda."], ["/repartitions", "Répartitions types", "Des exemples de répartition expliqués, sans conseil."]]],
    ["Les entreprises", "Trouver, comparer, classer", [["/comparer", "Comparer des entreprises", "Côte à côte, critère par critère, face à la médiane du secteur."], ["/classements", "Classements", "Celles qui cumulent le plus de points forts dans leur secteur."], ["/decouvertes", "Découvertes du jour", "Six entreprises moins connues dont les comptes ressortent."], ["/repartitions#listes", "Listes par critères", "Entreprises et ETF triés selon un critère : dividende, croissance, frais."]]],
    ["Se protéger, apprendre", "Avant de signer quoi que ce soit", [["/outils/verifier", "Vérifier un site ou une offre", "Le nom comparé aux listes noires de l'AMF, mises à jour chaque jour."], ["/commencer", "Par où commencer", "Trois choses avant d'investir, puis le détail en sept étapes."], ["/pea-cto", "PEA ou compte-titres", "Ce qu'on peut y mettre et l'impôt, en 2026."], ["/apprendre", "L'Académie", "Des leçons courtes par niveau, avec des quiz."]]],
  ];
  const p0 = window.pageOutils;
  if (typeof p0 !== "function") return;
  window.pageOutils = function (t) {
    if (t) return p0.apply(this, arguments);
    setNav("sim"); setTitle("Outils");
    app.innerHTML = `<h1 class="pagetitle">Les outils</h1><p class="pagesub">Des calculs et des comparaisons, hypothèses affichées, jamais de conseil. Quatre familles.</p>
      ${G.map(([t, s, L]) => `<section class="ot-g"><div class="ot-h"><h2>${esc(t)}</h2><span>${esc(s)}</span></div><div class="ot-l">${L.map(([h, n, d]) => `<a class="ot-i" href="${h}"><b>${esc(n)}</b><span>${esc(d)}</span></a>`).join("")}</div></section>`).join("")}`;
  };
  document.head.insertAdjacentHTML("beforeend", `<style>
.ot-g{margin:22px 0 0;border-top:1px solid var(--ink);padding-top:10px}.ot-h{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 8px}.ot-h h2{font-family:var(--serif);font-weight:800;font-size:22px;margin:0}.ot-h span{font-size:13px;color:var(--grey)}
.ot-l{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}.ot-i{display:flex;flex-direction:column;gap:4px;padding:14px 18px 14px 0;border-top:1px solid var(--rule);border-right:1px solid var(--rule);color:var(--ink);text-decoration:none;min-width:0}.ot-i:nth-child(n+2){padding-left:18px}.ot-i:last-child{border-right:0}.ot-i b{font-size:15.5px}.ot-i span{font-size:13.5px;line-height:1.5;color:var(--grey)}.ot-i:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
@media (max-width:900px){.ot-l{grid-template-columns:repeat(2,minmax(0,1fr))}.ot-i:nth-child(2n){border-right:0}.ot-i:nth-child(2n+1){padding-left:0}.ot-i:nth-child(2n){padding-left:18px}}
@media (max-width:560px){.ot-l{grid-template-columns:minmax(0,1fr)}.ot-i{border-right:0;padding-left:0!important}}
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
