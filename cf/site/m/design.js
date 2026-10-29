/* =====================================================================================================
   Module « design » (29 octobre 2026)
   1. Le cours de l'action est dessiné par le site, à partir des relevés réels. Plus aucun script
      TradingView dans la page : il laissait un grand vide au chargement, affichait des liens vers
      TradingView et pouvait lire ce que le navigateur garde pour le visiteur.
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

function tvChart(el, symbol, name) {
  if (!el) return;
  dsgRedraw.set(el, [symbol, name]);
  const hit = dsgQuote(symbol, name), q = hit && hit.q;
  if ((!q || !(q.p > 0)) && (typeof PX !== "object" || !PX || !Object.keys(PX).length)) {
    // Les cours ne sont pas encore chargés : on réessaie plutôt que d'annoncer une absence.
    el.innerHTML = `<div class="dsgc dsgc-vide"><p>Chargement du cours…</p></div>`;
    const n = (el.dataset.dsgTry = String(+(el.dataset.dsgTry || 0) + 1));
    if (+n <= 24) { setTimeout(() => { if (document.body.contains(el)) tvChart(el, symbol, name); }, 300); return; }
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
addEventListener("resize", () => { for (const [el, a] of dsgRedraw) { if (document.body.contains(el)) tvChart(el, a[0], a[1]); else dsgRedraw.delete(el); } }, { passive: true });

/* Le module d'information du haut (anciennement TradingView) n'a plus lieu d'être : le cours figure déjà
   dans l'en-tête de la fiche, avec son heure de relevé et sa source. */
function tv(el) { if (el) el.innerHTML = ""; }

document.head.insertAdjacentHTML("beforeend", `<style>
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
