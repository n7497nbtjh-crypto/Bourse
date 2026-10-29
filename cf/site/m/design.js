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
.kick,.ess .lbl,.lbl,.pxhead .kick,.tile .kick,.ftile .kick,.rf-keys .fk .kick,.rf-trimh .kick,.pf3 .kick,.pf3hero .kick,.acc .kick,.cmpr .kick,.rf-sum .kick,.ctx .kick{font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--grey)}
.rf-keys .fk .kick{font-size:12.5px}
/* Accessibilité (point 7, 29/10/2026) : sur téléphone, aucun texte sous 11 px, aucune cible tactile sous 24 px */
.lg b{font-size:max(9px,calc(var(--s) * .36))}
@media (max-width:760px){
  table.t th,.cmpr-badge,.cmpr-all tr.grp th,.cmpr-sug .h,.ctx-tag,.ess .lbl,.rf-fct th[scope=row] small,table.tbx-full thead th small,.kick,.fk .kick,.rf-keys .fk .kick{font-size:11px}
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
