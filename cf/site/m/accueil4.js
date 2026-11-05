/* ---------- Accueil v4 (1-2/11/2026, maquette validée par Romain : docs/maquettes/accueil-v12.html) ----------
   Direction « Quotidien » : un curieux doit comprendre en quelques secondes ce que fait le site.
   1. La promesse + la recherche, à côté d'un exemple réel interactif (4 entreprises) : marge face à la médiane, puis
      croissance, dette et prix, chacun en jauge face à la médiane du secteur (mêmes rangs que la fiche : rfAxes).
   2. Un bandeau de preuves. 3. Deux outils liés (elle seule, face aux autres) + la preuve en garantie.
   4. Le portefeuille. 5. Pourquoi ENKLAIR 6. La dernière séance. 7. Appel final.
   Aucun chiffre écrit en dur : tout est calculé à partir des comptes et des cours chargés par le site.
   Styles : site.css, bloc « Accueil v4 ». Remplace l'ancien pageHome (m/accueil.js, supprimé le 3/11/2026). */
// Petites fonctions reprises de l'ancien accueil (m/accueil.js, supprimé le 3/11/2026) : utilisées ici, par app.js (accIc) et m/entreprises3.js (accPct).
const accTaille = c => { try { const v = valo(c); if (v && v.capE) return v.capE; } catch (e) { } const e = typeof eurM === "function" ? eurM(c.ca, c.currency) : c.ca; return e ? e * 1e6 : 0; };
const accPct = v => v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + F2.format(Math.abs(v)) + " %";
const accCls = v => v > 0 ? "up" : v < 0 ? "down" : "";
const accMembre = () => (MOI && MOI.connecte) || (() => { try { return localStorage.getItem("bilan.acc.membre") === "1"; } catch (e) { return false; } })();
const ACC_I = { cal: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 13h3M8 16h6", ia: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5",
  pub: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5", mk: "M3 17l5-6 4 3 5-7 4 4", ag: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", dec: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z", sec: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", esp: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  conso: "M6 7h12l-1 12H7zM9 7a3 3 0 0 1 6 0", industrie: "M3 21V9l6 4V9l6 4V5h6v16z", energie: "M13 2L4 14h7l-1 8 9-12h-7z", sante: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z", tech: "M4 5h16v11H4zM9 20h6M12 16v4", finance: "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 20h20M12 3l9 7H3z", telecom: "M12 20V10M12 10a5 5 0 0 1 5-5M12 10a5 5 0 0 0-5-5M5 14a8 8 0 0 1 14 0", materiaux: "M12 3l9 6-9 6-9-6zM3 15l9 6 9-6", services: "M12 2v4M4.9 4.9l2.8 2.8M2 12h4M4.9 19.1l2.8-2.8M12 18v4M19.1 19.1l-2.8-2.8M22 12h-4M19.1 4.9l-2.8 2.8M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", immo: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6",
};
const accIc = k => `<svg class="acc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ACC_I[k] || ACC_I.sec}"/></svg>`;
function accMarchesTitre() { const ids = ["cac40", "stoxx50", "sp500", "dax"], rows = ids.map(id => PX["i:" + id]).filter(p => p && p.chg != null); const j = jourSeance(), ouvert = j === "aujourd'hui", J = j.charAt(0).toUpperCase() + j.slice(1);
  if (!rows.length) return ouvert ? "Les marchés aujourd'hui" : `Les marchés, séance de ${j}`; const up = rows.filter(p => p.chg > 0).length; // 1/11 : le week-end, on nomme la dernière séance
  const sens = up === rows.length ? ["montent", "ont monté"] : up === 0 ? ["reculent", "ont reculé"] : up >= rows.length / 2 ? ["montent plutôt", "ont plutôt monté"] : ["reculent plutôt", "ont plutôt reculé"];
  return ouvert ? `Les marchés ${sens[0]} aujourd'hui` : `${J}, les marchés ${sens[1]}`; }
const A4_EX = ["hermes", "lvmh", "asml", "sanofi"];
const A4 = { id: null };
const a4Med = (s, f) => median(R.companies.filter(c => c.sector === s.sector && !c.missing && !(isBank(c) !== isBank(s))).map(f).filter(v => v != null && isFinite(v)));
const a4Nb = v => F1.format(v).replace(/,0$/, "");
const a4Px = (p, cur) => { try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur || "EUR", maximumFractionDigits: p >= 1000 ? 2 : 2 }).format(p); } catch (e) { return F2.format(p); } };
const a4Ton = p => p == null ? "n" : p >= 0.6 ? "g" : p <= 0.4 ? "o" : "n";
function a4Fiche(id) { // tout ce que montre la carte d'exemple, calculé
  const s = RBY[id]; if (!s || s.missing || isBank(s)) return null;
  // 5/11 (Romain) : le grand chiffre n'est plus la marge d'exploitation mais le bénéfice net sur 100 € de ventes
  const r = ratios(s), mm = a4Med(s, c => ratios(c).nm); if (r.nm == null || mm == null) return null;
  const ax = {}; rfAxes(s).forEach(a => { ax[a.k] = a.r; });
  const rk = rankIn(s, c => ratios(c).nm, true, "nm");
  const p = pxOf(s), m = r.nm * 100, med = mm * 100, x = med > 0 ? m / med : null;
  const main = x == null ? "" : x >= 2 ? `${a4Nb(x)} fois la médiane !` : x >= 1.1 ? "au-dessus de la médiane" : x > 0.9 ? "autour de la médiane" : "sous la médiane";
  const g = r.g1 != null ? r.g1 * 100 : null, gm = a4Med(s, c => ratios(c).g1);
  const sd = ax.solidite, nd = s.netDebt, eb = s.ebitda;
  let dette, detteN;
  if (nd != null && nd < 0) { dette = "Aucune"; detteN = `${big(-nd, s.currency)} de trésorerie`; }
  else { dette = !sd ? "–" : sd.p >= 0.6 ? "Faible" : sd.p > 0.4 ? "Moyenne" : "Élevée"; const mo = nd != null && eb > 0 ? nd / eb * 12 : null; detteN = mo == null ? "" : mo < 24 ? `${Math.max(1, Math.round(mo))} mois de résultat brut` : `${a4Nb(mo / 12)} ans de résultat brut`; }
  const px = ax.prix;
  return { s, m, med, rk, main, p,
    tri: [
      [["croissance", "Croissance"], g == null ? "–" : (g > 0 ? "+" : g < 0 ? "−" : "") + a4Nb(Math.abs(g)) + " %", ax.croissance, gm == null ? "" : `secteur : ${gm > 0 ? "+" : gm < 0 ? "−" : ""}${a4Nb(Math.abs(gm * 100))} %`],
      [["dette", "Dette"], dette, sd, detteN],
      [["per", "Prix"], !px ? "–" : px.p >= 0.6 ? "PER bas" : px.p <= 0.4 ? "PER haut" : "Dans la norme", px, px ? `${px.rank}e sur ${px.n}` : ""]] };
}
const a4Def = (cle, txt, f) => typeof ekDefMot === "function" ? ekDefMot(cle, txt, f || {}) : esc(txt); // mot souligné qui ouvre la définition (même fenêtre que la fiche)
function a4CarteHTML(id) {
  const f = a4Fiche(id); if (!f) return `<p class="rf-no">Exemple indisponible.</p>`;
  const { s, m, med, rk, main, p } = f, maxv = Math.max(m, med, 1);
  return `<div class="a4-hd">${logo(s, 46)}<div><strong>${esc(s.name)}</strong><small>${esc(secName(s))} · ${esc(COUNTRY[s.region] || s.region || "")}</small></div>
    ${p ? `<div class="a4-px">${a4Px(p.p, p.cur || s.currency)}<small class="${accCls(p.chg)}">${accPct(p.chg)} ${esc(jourSeance())}</small></div>` : ""}</div>
    <div class="a4-n">${a4Nb(Math.round(m))}<small>€</small></div>
    <p class="a4-cap">${a4Def("benefice", "Bénéfice net", { ex: a4Nb(Math.round(m)) + " €", nom: s.name })} : ce qu'il lui reste, tout payé, sur 100 € de ventes.${rk ? ` ${rk.rank}<sup>e</sup> sur ${rk.n} entreprises du secteur ${esc(secName(s).toLowerCase())}.` : ""}</p>
    ${main ? `<span class="a4-hand">${esc(main)}</span>` : ""}
    <div class="a4-duo"><div>${esc(s.name)}<i style="width:${(Math.max(m, 0) / maxv * 100).toFixed(0)}%;background:var(--a4y)"></i></div><div><span>${a4Def("mediane", "Médiane")} ${a4Nb(Math.round(med))} €</span><i style="width:${(Math.max(med, 0) / maxv * 100).toFixed(0)}%"></i></div></div>
    <div class="a4-tri">${f.tri.map(([l, v, r, n]) => `<div><small>${a4Def(l[0], l[1], { nom: s.name })}</small><strong class="${r && r.neutre ? "k" : a4Ton(r && r.p)}">${esc(v)}</strong>${r ? `<div class="a4-ms${r.neutre ? " a4-ms-n" : ""}" title="Le trait : la médiane du secteur"><b style="left:${((r.neutre ? 1 - r.p : r.p) * 100).toFixed(0)}%"></b></div>` : ""}<em>${esc(n)}</em></div>`).join("")}</div>
    <a class="a4-go" href="/entreprise/${s.id}">Voir la fiche ${esc(s.name)} →</a>`;
}
function a4Montrer(id) {
  A4.id = id; const el = $("#a4-ex"); if (!el) return;
  el.innerHTML = a4CarteHTML(id);
  $$("#a4-tabs button").forEach(b => { b.classList.toggle("on", b.dataset.id === id); b.setAttribute("aria-pressed", b.dataset.id === id); });
}
function a4Bouge() { // indices et grandes entreprises de la dernière séance
  const ids = ["cac40", "stoxx50", "sp500", "nasdaq100"], idx = INDEX_INFO.filter(x => ids.includes(x[0])).map(([id, name]) => ({ id, name, p: PX["i:" + id] })).filter(r => r.p && r.p.chg != null);
  const grands = R.companies.filter(c => !c.missing && accTaille(c) >= 5e9).map(c => ({ c, p: pxOf(c) })).filter(x => x.p && x.p.chg != null && Math.abs(x.p.chg) < 40).sort((a, b) => b.p.chg - a.p.chg);
  return { idx, hs: grands.slice(0, 2), bs: grands.slice(-2).reverse() };
}
function a4TickerHTML() {
  const { idx, hs, bs } = a4Bouge(), l = [...idx.map(r => [r.name, r.p.chg]), ...[...hs, ...bs].map(x => [x.c.name, x.p.chg])];
  if (!l.length) return "";
  const J = jourSeance(), one = l.map(([n, v]) => `<span><b>${esc(n)}</b><span class="${accCls(v)}">${accPct(v)}</span></span>`).join("");
  return `<div class="a4-tick scroll-x" aria-hidden="true"><div class="a4-tr"><span><b class="a4-tj">${esc(J.charAt(0).toUpperCase() + J.slice(1))}</b></span>${one}<span><b class="a4-tj">${esc(J.charAt(0).toUpperCase() + J.slice(1))}</b></span>${one}</div></div>`;
}
function a4MarchesHTML() {
  const { idx, hs, bs } = a4Bouge(); if (!idx.length) return "";
  const top = [...idx].sort((a, b) => Math.abs(b.p.chg) - Math.abs(a.p.chg))[0], autres = idx.filter(r => r !== top);
  const ligne = x => `<a href="/entreprise/${x.c.id}">${logo(x.c, 40)}<span>${esc(x.c.name)}</span><b class="${x.p.chg > 0 ? "a4-u" : "a4-d"}">${accPct(x.p.chg)}</b></a>`;
  return `<div class="a4-mk"><a class="a4-boom ${top.p.chg < 0 ? "dn" : "up"}" href="/indice/${top.id}"><small>${esc(top.name)}, à la clôture</small><strong>${accPct(top.p.chg)}</strong>
      <span class="a4-idx">${autres.map(r => `<span>${esc(r.name)} ${accPct(r.p.chg)}</span>`).join("")}</span></a>
    <div class="a4-mv">${[...hs, ...bs].map(ligne).join("")}<p>Plus fortes hausses et baisses parmi les entreprises de plus de 5 milliards d'euros. Cours différés. <a href="/marches">Tous les marchés →</a></p></div></div>`;
}
async function a4Preuve() { // le lien de la garantie : un vrai chiffre, ouvert dans le rapport officiel
  const el = $("#a4-preuve"); if (!el) return;
  for (const id of A4_EX) { try { const l = await ancreLiens(id, ["ca"]); if (l && l[0]) { el.href = l[0].url; el.textContent = `Exemple : les ventes ${l[0].an} de ${RBY[id].name} ↗`; el.target = "_blank"; el.rel = "noopener"; return; } } catch (e) { } }
}
async function pageHome() {
  setTitle(""); setNav("home");
  document.documentElement.classList.add("acc-home");
  if (!$(".a4", app)) app.innerHTML = `<div class="a4"><section class="a4-hero"><div class="a4-w"><div class="a4-l"><h1>Comprenez n'importe quelle action en 30&nbsp;secondes.</h1></div></div></section></div>`;
  await PXP;
  if (location.pathname !== "/") return;
  const membre = accMembre(), ok = R.companies.filter(c => !c.missing).length;
  const ex = A4_EX.filter(id => a4Fiche(id)), cmp = ex.length >= 2 ? [RBY[ex[0]], RBY[ex[1]]] : null;
  const cm = cmp ? cmp.map(c => ({ c, m: ratios(c).marge * 100 })) : [], med = cmp ? a4Med(cmp[0], c => ratios(c).marge) * 100 : null, cmax = Math.max(1, ...cm.map(x => x.m), med || 0);
  const ax0 = ex[0] ? rfAxes(RBY[ex[0]]).filter(a => a.r) : [];
  app.innerHTML = `${a4TickerHTML()}<div class="a4">
  <section class="a4-hero"><div class="a4-w">
    <div class="a4-l">
      <span class="a4-stk a4-wh">Sans inscription · sans publicité</span>
      <h1>Comprenez n'importe quelle action en 30&nbsp;secondes.</h1>
      <p class="a4-sub">ENKLAIR lit les <b>comptes officiels</b> de ${F0.format(ok)} entreprises et vous dit, en clair, si elles sont rentables, endettées, et ce que le marché en pense, <b>par rapport à leurs concurrentes</b>.</p>
      <div class="search big a4-srch" data-search><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Hermès, Apple, ASML…" aria-label="Rechercher une entreprise ou un ETF" autocomplete="off"><div class="results"></div></div>
      <p class="a4-hint">Changez d'entreprise dans l'exemple pour voir le site en action.</p>
    </div>
    ${ex.length ? `<div class="a4-card"><span class="a4-stk a4-pk">Exemple réel, derniers comptes</span>
      <div class="a4-tabs" id="a4-tabs" role="group" aria-label="Choisir l'entreprise de l'exemple">${ex.map(id => `<button type="button" data-id="${id}">${logo(RBY[id], 22)}${esc(RBY[id].name)}</button>`).join("")}</div>
      <div id="a4-ex"></div></div>` : ""}
  </div></section>
  <div class="a4-trust"><div><b>${F0.format(ok)}</b>entreprises analysées</div><div><b>5</b>repères par entreprise, face au secteur</div><div><b>Prouvé</b>chiffres reliés au rapport officiel</div><div><b>0</b>conseil, 0 publicité</div></div>

  <section class="a4-sec">
    <span class="a4-stk a4-ye">Ce que vous pouvez faire</span>
    <h2>Une entreprise vous intrigue&nbsp;? En deux clics, vous la cernez.</h2>
    <div class="a4-pair">
      <div class="a4-step"><span class="a4-k"><i>1</i>Elle seule</span><h3>Est-ce qu'elle tient la route&nbsp;?</h3>
        <div class="a4-v a4-pv"><div class="a4-mini">${ax0.map(a => `<div>${esc(a.t)}<i><b style="left:${(a.r.p * 100).toFixed(0)}%"></b></i></div>`).join("")}</div><p>Cinq repères pour ${esc(ex[0] ? RBY[ex[0]].name : "chaque entreprise")}, chacun placé face à la médiane de son secteur.</p></div>
        <a class="a4-go2" href="${ex[0] ? `/entreprise/${ex[0]}` : "/entreprises"}">${ex[0] ? `Voir la fiche ${esc(RBY[ex[0]].name)}` : "Les entreprises"}<span>→</span></a></div>
      <div class="a4-step a4-ys"><span class="a4-k"><i>2</i>Face aux autres</span><h3>Est-elle meilleure que ses rivales&nbsp;?</h3>
        <div class="a4-v a4-cmp">${cm.map((x, i) => `<div>${esc(x.c.name)}<i style="width:${(Math.max(x.m, 0) / cmax * 100).toFixed(0)}%" class="${i ? "" : "on"}">${a4Nb(Math.round(x.m))} €</i></div>`).join("")}${med != null ? `<div>Médiane<i class="md" style="width:${(Math.max(med, 0) / cmax * 100).toFixed(0)}%">${a4Nb(Math.round(med))} €</i></div>` : ""}<p>Gardés sur 100 € de ventes, derniers comptes</p></div>
        <a class="a4-go2" href="${cmp ? `/comparer?ids=${cmp.map(c => c.id).join(",")}` : "/comparer"}">${cmp ? `Comparer ${esc(cmp[0].name)} et ${esc(cmp[1].name)}` : "Comparer"}<span>→</span></a></div>
    </div>
    <div class="a4-proof"><span class="a4-stk a4-ye">Et à chaque fois</span><p>Chaque chiffre vient du <b>rapport officiel</b> de l'entreprise. Un clic l'ouvre sur la ligne exacte : vous n'avez pas à nous croire sur parole.</p><a id="a4-preuve" href="/methode">Notre méthode ↗</a></div>
  </section>

  <section class="a4-sec">
    <span class="a4-stk a4-bl">Vous investissez déjà&nbsp;?</span>
    <div class="a4-pf"><div><h3>Voyez ce que votre portefeuille contient vraiment.</h3>
      <ul><li>Les secteurs et les pays derrière vos actions et vos ETF</li><li>Vos entreprises face à leur secteur</li><li>Chaque semaine, ce qui a bougé et pourquoi</li></ul>
      <a class="a4-bt" href="/portefeuille">Radiographier mon portefeuille →</a></div>
      <div><div class="a4-pfb"><i style="width:38%;background:var(--a4y)">Tech 38 %</i><i style="width:27%;background:#FF9EC6">Luxe 27 %</i><i style="width:20%;background:#7FE0B9">Santé 20 %</i><i style="width:15%"></i></div><p>Exemple fictif de répartition par secteur</p></div></div>
  </section>

  <section class="a4-sec">
    <span class="a4-stk a4-gr">Pourquoi ENKLAIR</span>
    <h2>Ce qui fait la différence.</h2>
    <div class="a4-why"><div class="y"><b>Comparé</b><p>Un chiffre seul ne dit rien. Ici, chacun est placé face à la médiane du secteur.</p></div><div class="p"><b>Prouvé</b><p>Les chiffres viennent des rapports déposés par les entreprises, et vous pouvez les vérifier.</p></div><div class="b"><b>Expliqué</b><p>Chaque notion a sa définition en une phrase. Pas besoin d'être expert.</p></div><div class="g"><b>Neutre</b><p>Aucun conseil d'acheter ou de vendre, aucune publicité, aucun courtier derrière.</p></div></div>
  </section>

  <section class="a4-sec" id="acc-marches">
    <span class="a4-stk a4-pk">${esc((s => s.charAt(0).toUpperCase() + s.slice(1))(jourSeance()))} en Bourse</span>
    <h2>${esc(accMarchesTitre())}</h2>
    ${a4MarchesHTML()}
    <p class="a4-plus"><a href="/actualites">Ce que les entreprises ont publié →</a><a href="/agenda">Les 7 prochains jours →</a><a href="/dividendes">Les prochains dividendes →</a></p>
  </section>

  <section class="a4-end">
    <span class="a4-stk a4-ye">À vous</span>
    <h2>Et votre entreprise préférée, elle garde combien&nbsp;?</h2>
    <div class="search big a4-srch a4-srch2" data-search><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Hermès, LVMH, Apple…" aria-label="Rechercher une entreprise" autocomplete="off"><div class="results"></div></div>
    <p class="a4-endl">ou <a href="/espace">${membre ? "ouvrez votre rapport de la semaine" : "recevez le rapport de la semaine sur vos favoris"}</a></p>
  </section>
  </div>`;
  const tabs = $("#a4-tabs"); if (tabs) tabs.onclick = ev => { const b = ev.target.closest("button"); if (b) a4Montrer(b.dataset.id); };
  if (ex.length) a4Montrer(A4.id && ex.includes(A4.id) ? A4.id : ex[0]);
  a4Preuve();
  if (typeof bindSearch === "function") { try { bindSearch(app); } catch (e) { } }
}

// La barre de recherche du menu est masquée sur l'accueil (une seule barre visible) ; la classe suit la navigation (repris de m/accueil.js)
(() => {
  const r0 = window.route; if (typeof r0 !== "function") return;
  window.route = function () { document.documentElement.classList.toggle("acc-home", location.pathname === "/"); return r0.apply(this, arguments); };
  document.documentElement.classList.toggle("acc-home", location.pathname === "/");
})();
