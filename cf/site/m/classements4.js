/* ---------- Classements v4 (3/11/2026), même direction que Marchés, ETF et Actualité v4 ----------
   En-tête jaune : le classement choisi en titre, les cinq classements en cartes (icône, ce qui est mesuré), filtres en un clic.
   Puis « ce qui est mesuré / ce que cela ne dit pas », le classement en rangées numérotées (logo, la raison en une ligne,
   le chiffre qui classe en grand). Aperçu sans Premium inchangé : les premières places floutées (nom absent de la page),
   places suivantes visibles. Calculs : outClRows, outClWhy, outClScore, OUT_CL (m/outils.js). Remplace window.pageClassements. */
const CL4_REG = [["", "Toutes"], ["fr", "France"], ["eu", "Europe"], ["us", "États-Unis"], ["monde", "Reste du monde"]];
function cl4Chiffre(k, x) { // le chiffre qui classe, en grand, et ce qu'il veut dire
  const st = x.st, m = ratios(x.c);
  if (k === "points" && x.q) return [`${x.q.fort}`, `point${x.q.fort > 1 ? "s" : ""} fort${x.q.fort > 1 ? "s" : ""}`, x.q.vig ? `${x.q.vig} de vigilance` : "aucun de vigilance"];
  if (k === "tete" && st) return [`${st.top}/${st.topN}`, "années en tête", "de son secteur"];
  if (k === "croissance" && st) return [`${st.caUp} ans`, "de hausse", st.cagr != null ? `${sgn(st.cagr, 1)} par an` : ""];
  if (k === "dividende" && st) return [`${st.divUp} ans`, "de hausse", st.dCagr != null ? `${sgn(st.dCagr, 1)} par an` : ""];
  if (k === "solides" && m.marge != null) return [pct(m.marge, 0, false), "de marge", "bénéficiaire chaque année"];
  return ["", "", ""];
}
function cl4Ligne(k, x, i) {
  const c = x.c, [v, l, s] = cl4Chiffre(k, x);
  return `<a class="cl4-r" href="/entreprise/${esc(c.id)}"><span class="cl4-rk${i < 3 ? " top" : ""}">${i + 1}</span>${mcLogo(c)}<span class="cl4-n"><b>${esc(c.name)}</b><small>${esc([secName(c), typeof regName === "function" ? regName(c) : ""].filter(Boolean).join(" · "))}${typeof peaOk === "function" && peaOk(c) && e4Fr() ? " · PEA ✓" : ""}</small><span class="cl4-w">${outClWhy(k, x)}</span></span>
    <span class="cl4-v"><strong>${esc(v)}</strong><small>${esc(l)}</small><em>${esc(s)}</em></span><i aria-hidden="true">›</i></a>`;
}
function cl4Flou(k, x, i) {
  return `<div class="cl4-r cl4-flou" aria-label="Place ${i + 1} réservée à Premium"><span class="cl4-rk top">${i + 1}</span><span class="mc-lg" aria-hidden="true">?</span><span class="cl4-n"><b aria-hidden="true">Entreprise masquée</b><small aria-hidden="true">Secteur · Région</small><span class="cl4-w">${outClScore(k, x)}</span></span><span class="cl4-v"><strong>🔒</strong><small>Premium</small></span></div>`;
}
async function pageClassements4() {
  setTitle("Classements des entreprises"); setNav("ent");
  if (!R) return;
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement des comptes de plusieurs années…</div></div>`;
  await Promise.all([PXP, outHist(), typeof premStatus === "function" ? premStatus() : null]);
  if (location.pathname !== "/classements") return;
  const P = new URLSearchParams(location.search);
  const f = { c: OUT_CL[P.get("c")] ? P.get("c") : "points", s: R.sectors[P.get("s")] ? P.get("s") : "", r: OUT_REG.some(([v]) => v && v === P.get("r")) ? P.get("r") : "", pea: P.get("pea") === "1" && e4Fr() ? "1" : "", t: OUT_TAILLE.some(([v]) => v && v === P.get("t")) ? P.get("t") : "" };
  const prem = typeof isPrem === "function" && isPrem(), fr = e4Fr();
  app.innerHTML = `<div class="ek ek-page cl4-page">
    <section class="ek-hero"><span class="mc-stk">Classements</span><h1 class="ag4-t" id="cl4t"></h1><p class="mc-sub" id="cl4s"></p>
      <div class="cl4-tabs" role="tablist">${Object.entries(OUT_CL).map(([k, v]) => `<a href="/classements${k === "points" ? "" : "?c=" + k}" role="tab" data-k="${k}"><i aria-hidden="true">${v.icon}</i><b>${esc(v.t)}</b><small>${esc(v.s)}</small></a>`).join("")}</div></section>
    <section class="ek-sec"><div class="el-f ax4-ch" id="cl4f"><span>Région :</span>${CL4_REG.map(([k, l]) => `<button type="button" data-r="${k}">${l}</button>`).join("")}${fr ? `<button type="button" data-pea>Éligibles au PEA</button>` : ""}
        <select id="cl4sec" aria-label="Secteur">${outSecOpts().map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select><select id="cl4tai" aria-label="Taille en Bourse">${OUT_TAILLE.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div>
      <div class="cl4-crit" id="cl4crit"></div><div id="cl4l"></div></section>
    <section class="ek-sec"><details class="ax4-l cl4-how"><summary>Comment ce classement est calculé</summary><div id="cl4how"></div></details></section></div>`;
  $("#cl4sec").value = f.s; $("#cl4tai").value = f.t;
  const draw = () => {
    const k = f.c, D = OUT_CL[k], rows = outClRows(k, f), lim = prem ? 50 : 15, flou = prem ? 0 : Math.min(5, Math.max(0, rows.length - 1));
    const shown = rows.slice(0, lim), vis = shown.slice(flou), more = rows.length - shown.length;
    try { history.replaceState(history.state, "", "/classements" + outQS({ c: k === "points" ? "" : k, s: f.s, r: f.r, pea: f.pea, t: f.t })); } catch (e) { }
    $$(".cl4-tabs a").forEach(b => { const on = b.dataset.k === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    $$("#cl4f [data-r]").forEach(b => b.classList.toggle("on", b.dataset.r === f.r)); const bp = $("#cl4f [data-pea]"); if (bp) bp.classList.toggle("on", !!f.pea);
    $("#cl4t").textContent = D.t + ".";
    $("#cl4s").textContent = rows.length ? `${F0.format(rows.length)} entreprise${rows.length > 1 ? "s" : ""} remplissent les conditions${f.s ? ` dans le secteur ${R.sectors[f.s]}` : ""}. Calculé sur leurs comptes officiels publiés.` : "Aucune entreprise ne remplit ces conditions avec ces filtres.";
    $("#cl4crit").innerHTML = `<div><b>Ce qui est mesuré</b><p>${esc(D.s)}. ${esc(OUT_CRIT[k])}</p></div><div class="n"><b>Ce que cela ne dit pas</b><p>Ni ce que vaut l'action en Bourse, ni ce qu'elle fera. Les comptes passés ne garantissent rien, et une entreprise absente peut simplement avoir des comptes manquants.</p></div>`;
    // 4/11 (décision de Romain) : les classements font partie de Premium, sans demi-version (plus de places floutées)
    if (!prem) { $("#cl4l").innerHTML = rows.length ? `<div class="cl4-prem cl4-prem2"><b>Ce classement fait partie de Premium.</b><span>${F0.format(rows.length)} entreprise${rows.length > 1 ? "s" : ""} remplissent ces conditions. Premium les classe pour vous, de la première à la cinquantième, avec la raison de chaque place. Les comptes de chaque entreprise restent gratuits sur sa fiche.</span><a href="/premium">Voir les classements avec Premium →</a></div>` : `<p class="ek-note">Élargissez le secteur ou la région.</p>`; }
    else $("#cl4l").innerHTML = rows.length ? `<div class="cl4-list">${shown.slice(0, flou).map((x, i) => cl4Flou(k, x, i)).join("")}${vis.map((x, i) => cl4Ligne(k, x, i + flou)).join("")}</div>
      ${flou ? `<div class="cl4-prem"><b>Les ${flou} premières places sont réservées à Premium.</b><span>Les places suivantes restent visibles pour comprendre le classement. Les comptes de chaque entreprise sont gratuits sur sa fiche ; Premium donne la liste triée complète (50 places).</span><a href="/premium">Découvrir Premium →</a></div>` : ""}
      ${more > 0 && prem ? `<p class="mc-note">${F0.format(more)} autres entreprises remplissent les conditions : affinez avec les filtres pour les voir.</p>` : ""}
      ${vis.length >= 2 ? `<p class="mc-note"><a href="/comparer?ids=${vis.slice(0, 3).map(x => x.c.id).join(",")}">Comparer les ${Math.min(3, vis.length)} premières affichées critère par critère →</a></p>` : ""}
      <p class="mc-note">Ce n'est pas une recommandation d'achat : ces listes trient des faits tirés des comptes publiés.</p>` : `<p class="ek-note">Élargissez le secteur ou la région.</p>`;
    $("#cl4how").innerHTML = `<p>${esc(D.how)}</p><p>Les comptes viennent des rapports annuels officiels (format ESEF en Europe, SEC aux États-Unis), lus par le site. Les entreprises dont les comptes ne sont pas disponibles n'apparaissent pas.</p><p><b>Limites.</b> Un seul exercice peut être exceptionnel (cession, crise). Les ventes sont dans la devise des comptes, sans effet de change. Les petites entreprises ont souvent moins d'années publiées et entrent moins facilement dans les classements sur plusieurs exercices.</p>`;
  };
  app.querySelector(".cl4-page").addEventListener("click", e => {
    const t = e.target.closest(".cl4-tabs a"); if (t) { e.preventDefault(); f.c = t.dataset.k; draw(); return; }
    const b = e.target.closest("button"); if (!b) return;
    else if (b.dataset.r !== undefined) { f.r = b.dataset.r; draw(); }
    else if (b.dataset.pea !== undefined) { f.pea = f.pea ? "" : "1"; draw(); }
  });
  $("#cl4sec").onchange = e => { f.s = e.target.value; draw(); };
  $("#cl4tai").onchange = e => { f.t = e.target.value; draw(); };
  draw();
}

window.pageClassements = pageClassements4;
