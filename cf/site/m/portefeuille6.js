/* ---------- Mon portefeuille v6 (7/11, maquette docs/maquettes/portefeuille-v6.html validée par Romain) ----------
   Couche chargée après m/portefeuille5.js. Romain : « trop de répétitions, espaces mal agencés, refais des encadrés cliquables ».
   - Haut de page : le total, deux pastilles (gain depuis vos achats, variation du jour), l'anneau des lignes à droite.
     Les deux bandeaux (alerte, rapport) et les cartes chiffrées de l'ancien haut de page sont masqués : leurs chiffres sont dans les encadrés.
   - « L'essentiel » : huit encadrés (chiffre + verdict en deux mots). Un clic ouvre le détail sous la rangée : ce sont les
     blocs calculés par portefeuille.js (diversification, points d'attention, frais, dividendes, dates, PEA), déplacés tels quels.
   - Un seul encadré Premium au lieu des quatre boutons « Voir Premium » répétés (blocs verrouillés retirés des détails).
   Rien n'est recalculé ici : les chiffres viennent de PF3S.ctx (pf3Dash). */
const PF6 = { open: null };
function pf6Prem() { return typeof isPrem === "function" && isPrem(); }
function pf6Hero(R0, P) {
  const h = $("#pf3 .v3-hero"); if (!h) return;
  const T = R0 && R0.T, plein = P && P.l && P.l.length && T && T.tot > 0;
  document.documentElement.classList.toggle("pf6on", !!plein);
  if (!plein) return;
  let g = h.querySelector(".pf6-hl"); if (!g) { g = document.createElement("div"); g.className = "pf6-hl"; [...h.children].forEach(c => g.appendChild(c)); h.appendChild(g); }
  const don = $("#pf4don"); if (don && don.parentElement !== h) h.appendChild(don);
  const h1 = h.querySelector("h1"); if (h1) h1.textContent = pf3Eu(T.tot).replace(/ /g, " ");
  const st = h.querySelector(".a4-stk"); if (st) st.textContent = "Mon portefeuille";
  const s = h.querySelector(".pagesub"); if (s) s.innerHTML = `<span class="pf6-pills">${T.gainPct == null ? `<span class="pf6-pill">Plus-value inconnue (cours manquants)</span>` : `<span class="pf6-pill ${T.gain >= 0 ? "g" : "r"}">${pf3Sg(T.gain)} depuis vos achats (${pf3Pc(T.gainPct)})</span>`}${T.dayN ? `<span class="pf6-pill ${T.day >= 0 ? "g" : "r"}">${pf3Sg(T.day)} aujourd'hui</span>` : ""}</span>
    <small class="pf6-sm">Si vous vendiez tout aujourd'hui, pour ${pf3Eu(T.cost)} investis. Cours différés, calculé dans votre navigateur.</small>`;
}
// Les encadrés : [clé, libellé, chiffre, verdict [classe, texte], ligne, jauge 0..100 ou null, blocs du détail | fonction]
function pf6Tuiles(c) {
  const { R0, X, S, F, D, P } = c, T = R0.T, prem = pf6Prem(), out = [];
  if (T.gain != null) out.push(["pv", "Plus-value", pf3Sg(T.gain), T.gain >= 0 ? ["g", "En gain"] : ["r", "En perte"], `${pf3Pc(T.gainPct)} depuis vos achats`, null, pf6DetPv]);
  if (S.score != null) out.push(["div", "Diversification", `${S.score}<small>/100</small>`, S.score >= 75 ? ["g", "Bonne"] : S.score >= 50 ? ["o", "Moyenne"] : ["r", "Faible"], "dispersion de votre argent, ETF ouverts", S.score, ["pf3-diversification", "pf3-repartition"]]);
  const ws = R0.live.map(r => r.w || 0).sort((a, b) => b - a), n3 = Math.min(3, ws.length), top = ws.slice(0, n3).reduce((a, b) => a + b, 0);
  if (ws.length > 1) out.push(["conc", "Concentration", `${F0.format(Math.round(top * 100))} %<small>sur ${n3} ligne${n3 > 1 ? "s" : ""}</small>`, top >= 0.6 ? ["r", "Concentré"] : top >= 0.4 ? ["o", "Moyen"] : ["g", "Réparti"], `${c.A.filter(a => a.lv !== "info").length} point${c.A.filter(a => a.lv !== "info").length > 1 ? "s" : ""} d'attention`, Math.round((1 - top) * 100), ["pf3-alertes", "pf3-risque"]]);
  const an = (F.terE || 0) + (F.yearBrok || 0), lourd = (F.ter || 0) > 0.004 || (F.heavy || []).length;
  out.push(["frais", "Frais par an", an > 0 ? "≈ " + pf3Eu(an) : "–", an > 0 ? (lourd ? ["r", "Élevés"] : ["g", "Faibles"]) : ["n", "À compléter"], F.ten > 0 ? `≈ ${pf3Eu(F.ten)} sur 10 ans` : "indiquez votre courtier", null, ["pf3-frais"]]);
  const prochain = D.lines.filter(x => x.next && x.next.date >= TODAY).sort((a, b) => a.next.date.localeCompare(b.next.date))[0];
  out.push(["dvd", "Dividendes par an", D.total > 0 ? "≈ " + pf3Eu(D.total) : "0 €", prochain ? ["n", "Prochain : " + pf6Jr(prochain.next.date)] : ["n", "Avant impôts"], prochain ? esc(prochain.r.info.name) : D.yld ? `rendement ${pct(D.yld, 2, false)}` : "actions en direct", null, prem ? ["pf3-dividendes"] : pf6DetDvd]);
  const cos = R0.live.filter(r => r.info.kind === "c").map(r => r.info.c), up = AG.events.filter(e => e.date >= TODAY && cos.some(x => x.id === e.id)).sort((a, b) => a.date.localeCompare(b.date));
  if (cos.length) out.push(["dates", "Prochaine date", up.length ? pf6Jr(up[0].date) : "–", up.length ? ["n", ((RBY[up[0].id] || {}).name || "").slice(0, 22)] : ["n", "Aucune annoncée"], up.length ? `${up.length} date${up.length > 1 ? "s" : ""} à venir` : "pour vos actions en direct", null, ["pf3-dates"]]);
  const pea = R0.rows.filter(r => r.l.env === "pea"), cfg = P.cfg || {};
  if (pea.length || cfg.peaOuv) { const vers = +cfg.peaVers > 0 ? +cfg.peaVers : pea.reduce((a, r) => a + (r.costE || 0), 0);
    out.push(["pea", "Plafond du PEA", pf3Eu(Math.max(0, 150000 - vers)), ["g", "Restant"], "sur 150 000 € de versements", null, ["pf3-pea"]]); }
  const pr = (cfg.prog || []).length; out.push(["prog", "Achats programmés", pr ? String(pr) : "Aucun", pr ? ["g", "Actifs"] : ["n", "À régler"], "le même achat chaque mois", null, ["pf3prog"]]);
  out.push(prem ? ["possede", "Ce que vous possédez vraiment", `${F0.format((X.top || []).length)}<small>entreprises</small>`, ["n", "ETF ouverts"], "vos ETF et vos actions réunis", null, ["pf3-possede"]]
    : ["prem", "Avec Premium", "Ce que vous possédez vraiment", ["y", "4 analyses de plus"], "", null, pf6DetPrem]);
  return out;
}
function pf6Jr(d) { return new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }
function pf6DetPv(c) {
  const L = c.R0.live.filter(r => r.gainE != null).sort((a, b) => b.gainE - a.gainE), mx = Math.max(1, ...L.map(r => Math.abs(r.gainE)));
  return `<h3>${pf3Sg(c.R0.T.gain)} depuis vos achats</h3><div class="pf6-rows">${L.map(r => `<div class="pf6-row"><span>${esc(r.info.name)}</span><span class="pf6-bar"><i style="width:${(Math.abs(r.gainE) / mx * 100).toFixed(0)}%;background:${r.gainE >= 0 ? "#00A06B" : "#D92D12"}"></i></span><b class="${r.gainE >= 0 ? "g" : "r"}">${pf3Sg(r.gainE)}</b></div>`).join("")}</div>
    <p class="pf6-src">Ce que vous auriez en plus ou en moins si vous vendiez aujourd'hui, avant impôts. Prix de revient calculé comme les courtiers français.</p>`;
}
function pf6DetDvd(c) {
  const L = c.D.lines.filter(x => x.est > 0).sort((a, b) => b.est - a.est);
  return `<h3>≈ ${pf3Eu(c.D.total)} de dividendes par an</h3>${L.length ? `<div class="pf6-rows">${L.map(x => `<div class="pf6-row"><span>${esc(x.r.info.name)}</span><span class="pf6-sub">${x.next ? "prochaine date : " + pf6Jr(x.next.date) : "date pas encore annoncée"}</span><b>≈ ${pf3Eu(x.est)}</b></div>`).join("")}</div>` : `<p>Aucune de vos actions en direct n'a versé de dividende dans ses derniers comptes.</p>`}
    <p class="pf6-src">Estimation avant impôts : dernier dividende publié dans les comptes, rapporté au cours du jour. Le calendrier mois par mois est dans Premium.</p>`;
}
function pf6DetPrem() {
  return `<h3>Avec Premium</h3><p>Ce que vous possédez vraiment à travers vos ETF, vos expositions par pays et par secteur, le risque en euros ligne par ligne, le calendrier de vos dividendes mois par mois. Et un e-mail si une de vos lignes chute de plus de 5 %, le rapport de la semaine chaque samedi.</p>
    <div class="pf6-act"><a class="ek-btn dk" href="/premium#portefeuille">Voir Premium</a><a class="lnk" href="/rapport-exemple">Voir un rapport de la semaine</a></div>`;
}
function pf6Build() {
  const c = PF3S.ctx, root = $("#pf3"); if (!root) return;
  let box = $("#pf6");
  if (!c || !c.R0 || !c.R0.live.length || !document.documentElement.classList.contains("pf6on")) { if (box) box.hidden = true; return; }
  if (!box) { box = document.createElement("section"); box.id = "pf6"; box.className = "pf6-ess"; const ref = $("#pf3lines"); (ref || $("#pf5")).insertAdjacentElement("beforebegin", box); }
  box.hidden = false;
  const T = pf6Tuiles(c); PF6.tuiles = T;
  const det = $("#pf6det"); if (det) [...det.children].forEach(x => pf6Rendre(x)); // les blocs reviennent à leur place avant de redessiner
  box.innerHTML = `<h2 class="pf6-t">L'essentiel en un coup d'œil.</h2><p class="pf6-st">Cliquez sur un encadré pour le détail.</p>
    <div class="pf6-g" id="pf6g">${T.map(([k, lab, n, [vc, vt], sub, jz], i) => `<button type="button" class="pf6-c${k === "prem" ? " dk" : ""}${i === T.length - 1 && T.length % 4 === 1 ? " large" : ""}" data-k="${k}" aria-expanded="false"><span class="pf6-lb">${esc(lab)}</span><span class="pf6-n${k === "prem" ? " txt" : ""}">${n}</span><span class="pf6-vd ${vc}">${esc(vt)}</span>${sub ? `<small>${sub}</small>` : ""}${jz != null ? `<span class="pf6-gz"><i style="left:${Math.max(2, Math.min(98, jz))}%"></i></span>` : ""}<span class="pf6-ch" aria-hidden="true">›</span></button>`).join("")}<div class="pf6-det" id="pf6det" hidden></div></div>`;
  $("#pf6g").onclick = e => { const b = e.target.closest(".pf6-c"); if (b) pf6Ouvrir(PF6.open === b.dataset.k ? null : b.dataset.k); };
  if (PF6.open && T.some(t => t[0] === PF6.open)) pf6Ouvrir(PF6.open); else PF6.open = null;
}
function pf6Rendre(x) { // un bloc de portefeuille.js retourne dans son rangement (masqué)
  if (x.dataset && x.dataset.pf6src) { const dst = document.getElementById(x.dataset.pf6src); if (dst) { dst.appendChild(x); return; } }
  x.remove();
}
function pf6Ouvrir(k) {
  const det = $("#pf6det"), g = $("#pf6g"); if (!det || !g) return;
  [...det.children].forEach(x => pf6Rendre(x)); det.hidden = true;
  $$(".pf6-c", g).forEach(b => { b.classList.toggle("act", b.dataset.k === k); b.setAttribute("aria-expanded", b.dataset.k === k ? "true" : "false"); });
  PF6.open = k; if (!k) return;
  const t = (PF6.tuiles || []).find(x => x[0] === k); if (!t) return;
  const quoi = t[6];
  if (typeof quoi === "function") det.insertAdjacentHTML("beforeend", `<div class="pf6-in">${quoi(PF3S.ctx)}</div>`);
  else for (const id of quoi) { const el = document.getElementById(id); if (!el || el.dataset.pf4v) continue; // bloc verrouillé : l'encadré Premium le dit une fois
    if (!el.dataset.pf6src && el.parentElement && el.parentElement.id) el.dataset.pf6src = el.parentElement.id;
    if (el.tagName === "DETAILS") el.open = true; det.appendChild(el); }
  if (!det.children.length) det.insertAdjacentHTML("beforeend", `<div class="pf6-in">${pf6DetPrem()}</div>`);
  // le détail se place juste après la rangée de l'encadré ouvert
  const all = $$(".pf6-c", g), i = all.findIndex(b => b.dataset.k === k), cols = getComputedStyle(g).gridTemplateColumns.split(" ").length || 1;
  all[Math.min(all.length - 1, Math.floor(i / cols) * cols + cols - 1)].after(det);
  det.hidden = false;
}
// Le bandeau de la page (.v3-hero) peut être posé après le premier calcul (pagePortefeuille de portefeuille4.js) : on réessaie un court moment
function pf6Tout(n = 0) { const c = PF3S.ctx; if (!c) return; if (!$("#pf3 .v3-hero")) { if (n < 40) setTimeout(() => pf6Tout(n + 1), 100); return; } pf6Hero(c.R0, c.P); pf6Build(); }
if (typeof pf3Hero === "function") { const PF6_hero0 = pf3Hero; pf3Hero = function (R0, P) { const r = PF6_hero0.apply(this, arguments); try { pf6Hero(R0, P); } catch (e) { console.error("pf6", e); } return r; }; }
if (typeof pf3Dash === "function") { const PF6_dash0 = pf3Dash; pf3Dash = async function () {
  const det = $("#pf6det"); if (det) [...det.children].forEach(x => x.tagName === "DETAILS" || x.classList.contains("pf6-in") ? x.remove() : pf6Rendre(x)); // anciens blocs : portefeuille.js les recrée
  const r = await PF6_dash0.apply(this, arguments); try { pf6Tout(); } catch (e) { console.error("pf6", e); } return r; }; }
if (typeof pf3ProgDraw === "function") { const PF6_prog0 = pf3ProgDraw; pf3ProgDraw = function () { const r = PF6_prog0.apply(this, arguments); try { if (PF6.open === "prog") pf6Ouvrir("prog"); } catch (e) { } return r; }; }
