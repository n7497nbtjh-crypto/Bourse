/* ---------- Page Entreprises v3 (2/11/2026, maquette validée : docs/maquettes/entreprises-v1.html) ----------
   En haut : bloc jaune (nombre d'entreprises, recherche, filtres rapides), secteurs en cartes de couleur, puis
   « Les plus grandes » : tableau dense avec quatre jauges face à la médiane du secteur et le verdict, triable.
   Les filtres et les secteurs s'appliquent à ce tableau ; la liste complète existante (tableaux.js) reste dessous,
   sous « Toutes les entreprises ». Styles : site.css, bloc « Entreprises v3 ». */
const E3 = { f: new Set(), sec: null, tri: "taille", n: 20 };
const e3Fr = () => typeof frSeul === "function" ? frSeul() : true; // PEA : seulement pour un visiteur en France (m/pays.js)
const E3_FILTRES = [
  ["pea", "Éligibles au PEA", c => typeof peaOk === "function" && peaOk(c) === true],
  ["sansdette", "Sans dette", c => c.netDebt != null && c.netDebt < 0 && !isBank(c)],
  ["rentables", "Très rentables", c => { const a = e3Ax(c).marge; return a && a.p >= 0.8; }],
  ["bonmarche", "Bon marché", c => { const a = e3Ax(c).prix; return a && a.p >= 0.6; }],
  ["dividende", "Avec dividende", c => { try { const v = valo(c); return v && v.yld > 0.005; } catch (e) { return false; } }]];
const E3_AXM = new Map();
function e3Ax(c) { if (E3_AXM.has(c.id)) return E3_AXM.get(c.id); const o = {}; try { rfAxes(c).forEach(a => { o[a.k] = a.r; }); } catch (e) { } E3_AXM.set(c.id, o); return o; }
const e3Cap = c => { const x = pxOf(c); const v = x && x.cap ? toEur(x.cap, x.cur) : null; return v && isFinite(v) ? v : (caEur(c) || 0) * 1e3; }; // capitalisation publiée par la source des cours (pas celle recalculée par valo, fausse pour certains certificats américains) ; à défaut, le chiffre d'affaires
const E3_COUL = ["#FFF2B3", "#FFE0EC", "#DCE3FF", "#CDF5E4", "#FFE3D1", "#EDE3FF"];
function e3Liste() {
  let L = R.companies.filter(c => !c.missing && (!E3.sec || c.sector === E3.sec));
  E3_FILTRES.forEach(([k, , f]) => { if (E3.f.has(k) && (k !== "pea" || e3Fr())) L = L.filter(f); });
  const cle = { taille: e3Cap, marge: c => (e3Ax(c).marge || {}).p ?? -1, croissance: c => (e3Ax(c).croissance || {}).p ?? -1, solidite: c => (e3Ax(c).solidite || {}).p ?? -1, prix: c => (e3Ax(c).prix || {}).p ?? -1 }[E3.tri];
  return { tot: L.length, rows: L.map(c => [cle(c), e3Cap(c), c]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).map(x => x[2]).slice(0, E3.n) };
}
function e3Jauge(r) { return r ? `<div class="e3-ms" title="${esc(r.rank + "e sur " + r.n)}"><b style="left:${(r.p * 100).toFixed(0)}%"></b></div>` : `<div class="e3-g0">–</div>`; }
function e3TableHTML() {
  const { tot, rows } = e3Liste();
  if (!rows.length) return `<p class="e3-vide">Aucune entreprise ne répond à ces critères. Retirez un filtre.</p>`;
  return `<div class="e3-tbl"><table><thead><tr><th>Entreprise</th><th>Cours<small>dernière séance</small></th><th>Marge</th><th>Croissance</th><th>Solidité</th><th>Prix</th><th>Verdict</th></tr></thead><tbody>${rows.map(c => {
    const p = pxOf(c), ax = e3Ax(c);
    return `<tr data-id="${c.id}"><td><a class="e3-co" href="/entreprise/${c.id}">${logo(c, 36)}<span><b>${esc(c.name)}</b><small>${esc(secName(c))}</small></span></a></td>
      <td class="e3-num">${p && p.p ? `<b>${a4Px(p.p, p.cur || c.currency)}</b><span class="${p.chg > 0 ? "u" : p.chg < 0 ? "d" : ""}">${accPct(p.chg)}</span>` : "–"}</td>
      <td>${e3Jauge(ax.marge)}</td><td>${e3Jauge(ax.croissance)}</td><td>${e3Jauge(ax.solidite)}</td><td>${e3Jauge(ax.prix)}</td><td class="e3-v">${esc(rfVerdictMots(c) || "")}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="e3-more"><span>${F0.format(tot)} entreprise${tot > 1 ? "s" : ""} pour ce choix${tot > rows.length ? `, les ${rows.length} premières affichées` : ""}</span>${tot > rows.length ? `<button type="button" data-e3plus>Afficher 20 de plus</button>` : ""}</div>`;
}
function e3Rendre() {
  const t = $("#e3-t"); if (t) t.innerHTML = e3TableHTML();
  $$(".e3-fil [data-e3f]").forEach(b => b.classList.toggle("on", E3.f.has(b.dataset.e3f)));
  $$(".e3-secs [data-e3s]").forEach(b => b.classList.toggle("on", b.dataset.e3s === E3.sec));
  $$(".e3-sort [data-e3t]").forEach(b => b.classList.toggle("on", b.dataset.e3t === E3.tri));
  const st = $("#e3-sectit"); if (st) st.textContent = E3.sec ? secName({ sector: E3.sec }) : "Les plus grandes";
}
function e3Poser() {
  if ($(".e3", app)) return;
  const ok = R.companies.filter(c => !c.missing).length;
  const secs = Object.entries(R.sectors).map(([k, n]) => [k, n, R.companies.filter(c => c.sector === k && !c.missing).length]).filter(x => x[2]).sort((a, b) => b[2] - a[2]);
  const h = $("h1.pagetitle", app), sub = $(".pagesub", app);
  const w = document.createElement("div"); w.className = "e3";
  w.innerHTML = `<section class="e3-hero"><span class="a4-stk a4-wh">Les entreprises</span><h1>${F0.format(ok)} entreprises, lues et comparées.</h1>
      <div class="search big a4-srch" data-search><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input class="el-in" type="search" placeholder="Hermès, Apple, un ISIN…" aria-label="Rechercher une entreprise" autocomplete="off"><div class="results"></div></div>
      <div class="e3-fil"><span>Filtrer :</span>${E3_FILTRES.filter(([k]) => k !== "pea" || e3Fr()).map(([k, l]) => `<button type="button" data-e3f="${k}">${esc(l)}</button>`).join("")}</div></section>
    <section class="e3-sec"><span class="a4-stk" style="background:var(--a4b)">Par secteur</span><h2>Choisissez un terrain de jeu.</h2>
      <div class="e3-secs">${secs.map(([k, n, c], i) => `<button type="button" data-e3s="${k}" style="background:${E3_COUL[i % E3_COUL.length]}"><b>${esc(n)}</b><span>${F0.format(c)} entreprises</span></button>`).join("")}</div></section>
    <section class="e3-sec"><span class="a4-stk a4-pk" id="e3-sectit">Les plus grandes</span><h2>Chaque ligne, face à son secteur.</h2>
      <div class="e3-sort"><span>Trier par :</span>${[["taille", "Taille"], ["marge", "Marge"], ["croissance", "Croissance"], ["solidite", "Solidité"], ["prix", "Prix"]].map(([k, l]) => `<button type="button" data-e3t="${k}">${l}</button>`).join("")}</div>
      <div id="e3-t"></div>
      <p class="e3-lg">Chaque jauge place l'entreprise dans son secteur : le trait noir est la médiane, à droite c'est mieux. Pour le prix, à droite c'est moins cher.</p></section>
    <section class="e3-sec" id="e3-toutes"><span class="a4-stk a4-wh">Toutes les entreprises</span><h2>La liste complète.</h2></section>`;
  if (h) h.remove(); if (sub) sub.remove();
  app.insertBefore(w, app.firstChild);
  const plus = $(".ent-plus", app); if (plus) { const t = $("#e3-toutes", w); t.parentNode.insertBefore(plus, t); plus.classList.add("e3-plus"); } // « Découvertes du jour, Classements, Comparer » avant la liste complète, pas entre son titre et ses filtres
  w.addEventListener("click", e => {
    const f = e.target.closest("[data-e3f]"), s = e.target.closest("[data-e3s]"), t = e.target.closest("[data-e3t]"), plus = e.target.closest("[data-e3plus]");
    if (f) { const k = f.dataset.e3f; E3.f.has(k) ? E3.f.delete(k) : E3.f.add(k); E3.n = 20; e3Rendre(); }
    else if (s) { E3.sec = E3.sec === s.dataset.e3s ? null : s.dataset.e3s; E3.n = 20; e3Rendre(); $("#e3-sectit").scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (t) { E3.tri = t.dataset.e3t; e3Rendre(); }
    else if (plus) { E3.n += 20; e3Rendre(); }
    else { const tr = e.target.closest("tr[data-id]"); if (tr && !e.target.closest("a")) go("/entreprise/" + tr.dataset.id); }
  });
  e3Rendre();
  if (typeof loadPrices === "function") loadPrices().then(() => { if (!document.body.contains(w)) return; E3_AXM.clear(); e3Rendre(); }).catch(() => { }); // cours, capitalisation et PER arrivent après l'affichage
  if (typeof bindSearch === "function") { try { bindSearch(w); } catch (e) { } }
}
(() => { const p0 = window.pageEntreprises; if (typeof p0 !== "function") return;
  window.pageEntreprises = function () { const r = p0.apply(this, arguments); try { e3Poser(); } catch (e) { console.error("entreprises v3", e); } return r; }; })();
