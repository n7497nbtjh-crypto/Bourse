/* ---------- « Comparer deux ETF » (9/11/2026, maquette docs/maquettes/comparer-etf-v1.html validée par Romain) ----------
   Remplace la présentation de « Mes ETF se recouvrent-ils ? » (même adresse /outils/recouvrement, mêmes paramètres ?a ?b ?c ?d ?w,
   mêmes calculs : O2_rcCalcul de m/outils2.js, qui appelle O2_rcAfficher redéfinie ici).
   Titre = la réponse (« Le Nasdaq-100 est à 93 % dans le S&P 500. ») ; face à face (entreprises, concentration, frais, PEA,
   performances publiées, le meilleur de chaque ligne en vert) ; en commun ; les plus grosses entreprises et les secteurs en barres
   face à face ; repliés : « Vous détenez les deux ? » (part en double, parts réglables), le détail paire par paire, sources. */
const CE5 = { perf: null };
async function outilRecouvrement5() {
  O2_css(); setTitle("Comparer deux ETF"); setNav("sim");
  const S = O2_rcEtat();
  const trouve = re => ETF.list.find(e => re.test(e.index || "") && e.compo && e.pea) || ETF.list.find(e => re.test(e.index || "") && e.compo) || ETF.list.find(e => re.test(e.index || ""));
  const presets = [["S&P 500 vs Nasdaq-100", /^S&P 500$/i, /^Nasdaq.?100$/i], ["Monde vs S&P 500", /^MSCI World$/i, /^S&P 500$/i], ["CAC 40 vs Euro Stoxx 50", /^CAC 40$/i, /^Euro Stoxx 50$/i], ["Monde vs Europe", /^MSCI World$/i, /^(MSCI Europe|Stoxx Europe 600)$/i]]
    .map(([l, a, b]) => { const ea = trouve(a), eb = trouve(b); return ea && eb ? [l, ea.id, eb.id] : null; }).filter(Boolean);
  app.innerHTML = `<div class="ek ek-page s4 rc4 ce5">
    <section class="ek-hero"><span class="mc-stk">Comparer deux ETF</span><h1 class="ag4-t" id="rct">Lecture des compositions…</h1><p class="mc-sub" id="rcs">Choisissez deux fonds : le site ouvre leurs compositions officielles et les met face à face.</p>
      <div class="ce5-pick" id="o2rl"></div>
      <div class="ce5-ex"><span>Exemples :</span>${presets.map(([l, a, b]) => `<a href="#" role="button" data-a="${a}" data-b="${b}">${esc(l)}</a>`).join("")}<a href="#" role="button" class="ce5-add" id="o2radd">+ Un troisième fonds</a><b class="ce5-v" id="ce5v" hidden></b></div></section>
    <div id="o2rr"></div></div>`;
  const lignes = () => {
    $("#o2rl").innerHTML = S.ids.map((id, i) => `${i ? `<span class="ce5-vs">VS</span>` : ""}<div class="ce5-f"><span class="rv-dot" style="background:${O2_RC[i]}"></span>
      <div class="sj-pkw"><input id="o2rq${i}" class="el-in" type="search" autocomplete="off" placeholder="Nom d'un ETF ou d'un indice" aria-label="ETF n° ${i + 1}"><div class="msug" hidden></div></div>
      ${S.ids.length > 2 ? `<a href="#" role="button" class="rv-x" data-x="${i}" aria-label="Retirer ce fonds">×</a>` : ""}</div>`).join("");
    $("#o2rl").style.gridTemplateColumns = S.ids.map(() => "minmax(0,1fr)").join(" auto ");
    S.ids.forEach((id, i) => { $("#o2rq" + i).value = ETFBY[id].name; bindPicker("o2rq" + i, k => { S.ids[i] = k.slice(2); maj(); }, true); });
    $$("#o2rl [data-x]").forEach(b => b.onclick = e => { e.preventDefault(); const i = +b.dataset.x; S.ids.splice(i, 1); S.w.splice(i, 1); maj(); });
    $("#o2radd").hidden = S.ids.length >= 4; $("#o2radd").textContent = S.ids.length === 2 ? "+ Un troisième fonds" : "+ Un autre fonds";
  };
  const maj = (redessine = true) => {
    const q = new URLSearchParams(); S.ids.forEach((id, i) => q.set("abcd"[i], id)); q.set("w", S.w.join(","));
    history.replaceState({}, "", "/outils/recouvrement?" + q); if (redessine) lignes();
    $$(".ce5-ex [data-a]").forEach(b => b.classList.toggle("on", S.ids.length === 2 && S.ids[0] === b.dataset.a && S.ids[1] === b.dataset.b));
    O2_rcCalcul(S);
  };
  CE5.maj = maj; CE5.S = S;
  $("#o2radd").onclick = e => { e.preventDefault(); const x = ETF.list.find(y => y.compo && !S.ids.includes(y.id) && /Emerging|Europe/i.test(y.index || "")) || ETF.list.find(y => !S.ids.includes(y.id)); if (!x) return; S.ids.push(x.id); S.w = S.ids.map(() => Math.round(100 / S.ids.length)); maj(); };
  $$(".ce5-ex [data-a]").forEach(b => b.onclick = e => { e.preventDefault(); S.ids = [b.dataset.a, b.dataset.b]; S.w = [50, 50]; maj(); });
  if (!CE5.perf) CE5.perf = (typeof E4 === "object" && E4.perf) || await getJSON("/data/etf-perf.json", { items: {} });
  maj();
}
const ce5Nom = e => !e.index || /^(Solactive|iSTOXX|ISS)|ESG|Screened|Select|Filtered/i.test(e.index) ? e.name.replace(/\s*\((capitalisation|distribution)\)/i, "") : e.index; // indice connu, sinon le nom du fonds
const ce5Du = n => { const l = ce5Le(n); return l.startsWith("le ") ? "du " + l.slice(3) : /^[AEIOUYÉH]/i.test(l) ? "d'" + l : "de " + l; };
const ce5Le = n => /^(S&P|Nasdaq|Dow|Russell|CAC|DAX|FTSE|MSCI|Stoxx|Euro Stoxx|Nikkei|Topix|SBF|Solactive)/i.test(n) ? "le " + n : n;
// Barres face à face : deux colonnes de valeurs (en %), noms au milieu
function ce5Miroir(rows, n0, n1) {
  const mx = Math.max(1, ...rows.flatMap(r => [r.a || 0, r.b || 0]));
  const cell = (v, cote) => v == null || v <= 0 ? `<div class="${cote}"><em>${v == null ? "–" : "0 %"}</em></div>` : `<div class="${cote}">${cote === "l" ? `<em>${O2_p(v, 1, false)}</em>` : ""}<i style="width:${Math.max(1.5, v / mx * 72).toFixed(1)}%"></i>${cote === "r" ? `<em>${O2_p(v, 1, false)}</em>` : ""}</div>`;
  return `<div class="ce5-mir"><div class="h l">${esc(n0)}</div><div></div><div class="h r">${esc(n1)}</div>
    ${rows.map(r => `${cell(r.a, "l")}<div class="n">${r.href ? `<a href="${r.href}">${esc(r.label)}</a>` : esc(r.label)}${r.tag || ""}</div>${cell(r.b, "r")}`).join("")}</div>`;
}
function O2_rcAfficher(D) {
  const { S, E, F, X, N, nm, paires, p0, best, ov, verdict, couleurs, nomsS, top, lib, expo, devs, csq, sources, emetteur, comps } = D;
  const el = $("#o2rr"), t = $("#rct"), s = $("#rcs"); if (!el) return;
  const partiels = E.map((e, i) => comps[i] && comps[i].partiel ? `${esc(e.name)} : seules ses ${F0.format(comps[i].isins.length)} plus grosses lignes sont publiées (${O2_p(comps[i].partiel, 0, false)} du fonds)` : "").filter(Boolean);
  const avert = partiels.length ? `<p class="ce5-av">Comparaison partielle. ${partiels.join(" ; ")}. Les entreprises en commun et le poids identique ne portent que sur ces lignes.</p>` : "";
  const P = (CE5.perf && CE5.perf.items) || {}, perf = E.map(e => P[e.id] || null);
  const noms = [...E.map(ce5Nom), "Combiné"], fus = new Map();
  top.forEach(r => { const x = fus.get(r.label); if (!x) fus.set(r.label, { ...r, v: [...r.v] }); else x.v = x.v.map((a, i) => a == null && r.v[i] == null ? null : (a || 0) + (r.v[i] || 0)); });
  const top2 = [...fus.values()].sort((a, b) => b.v.at(-1) - a.v.at(-1)).slice(0, 10);
  const secW = (f, k) => { const x = (f.sectors || []).find(z => z[0] === k); return x ? x[1] : 0; };
  // Le titre : la réponse
  let titre, sous, badge;
  if (N === 2) {
    const p = p0[2], [inA, inB] = [p.partAdansB, p.partBdansA], petit = inA >= inB ? 0 : 1, grand = 1 - petit, inc = Math.max(inA, inB);
    const seulsG = (petit === 0 ? p.lignesB : p.lignesA) - p.communes;
    badge = inc >= 90 || ov >= 60 ? "Très proches" : ov >= 30 ? "Une base commune" : "Complémentaires";
    const part = comps[petit] && comps[petit].partiel;
    if (part) { const pc = Math.min(100, inc / part * 100); badge = pc >= 90 ? "Très proches" : pc >= 50 ? "Une base commune" : "Complémentaires";
      titre = `${O2_p(pc, 0, false)} des ${F0.format(comps[petit].isins.length)} plus grosses lignes ${ce5Du(ce5Nom(E[petit]))} sont dans ${ce5Le(ce5Nom(E[grand]))}.`; }
    else titre = inc >= 70 ? `${ce5Le(ce5Nom(E[petit])).replace(/^l/, "L")} est à ${O2_p(inc, 0, false)} dans ${ce5Le(ce5Nom(E[grand]))}.` : ov >= 30 ? `${ce5Nom(E[0])} et ${ce5Nom(E[1])} : ${O2_p(ov, 0, false)} en commun.` : `${ce5Nom(E[0])} et ${ce5Nom(E[1])} se complètent.`;
    const absent = (F[grand].sectors || []).filter(([k, w]) => w >= 5 && secW(F[petit], k) < 0.5).sort((a, b) => b[1] - a[1])[0];
    sous = part ? `Seules ses ${F0.format(comps[petit].isins.length)} plus grosses lignes sont publiées, soit ${O2_p(part, 0, false)} du fonds : la comparaison porte sur celles-ci.` : inc >= 90 ? `Ces deux fonds sont <b>très proches</b> : ${esc(ce5Le(ce5Nom(E[petit])))} ne fait presque qu'augmenter le poids des mêmes entreprises. ${esc(ce5Le(ce5Nom(E[grand])).replace(/^l/, "L"))} en ajoute ${F0.format(seulsG)} autres${absent ? `, dont tout le secteur ${esc(lib(absent[0]).toLowerCase())} (${O2_p(absent[1], 0, false)} du fonds)` : ""}.`
      : verdict;
  } else { badge = ov >= 60 ? "Très proches" : ov >= 30 ? "Une base commune" : "Complémentaires"; titre = `${F0.format(N)} fonds, ${O2_p(X.doublon, 0, false)} de l'argent en double.`; sous = verdict; }
  if (t) t.textContent = titre.replace(/(\d) %/g, "$1\u00a0%"); if (s) s.innerHTML = sous.replace(/(\d) %/g, "$1&nbsp;%");
  const v = $("#ce5v"); if (v) { v.hidden = false; v.textContent = badge; }
  // Face à face : le meilleur de chaque ligne en vert
  const lig = (lab, sub, vals, fmt, mieux) => { const ok = vals.map(x => x != null && isFinite(x)); const cible = ok.filter(Boolean).length > 1 && mieux ? (mieux === "haut" ? Math.max(...vals.filter((x, i) => ok[i])) : Math.min(...vals.filter((x, i) => ok[i]))) : null;
    const egal = cible != null && vals.filter(x => x === cible).length === vals.length;
    return `<tr><td>${lab}${sub ? `<small>${sub}</small>` : ""}</td>${vals.map((x, i) => `<td class="${!egal && cible != null && x === cible ? "win" : ""}">${ok[i] ? fmt(x, i) : "–"}</td>`).join("")}</tr>`; };
  const lignesN = F.map((f, i) => (comps[i] && comps[i].lines) || (E[i].compo && E[i].compo.n) || (f.isins || []).length);
  const sec1 = (F[0].sectors || [])[0] ? (F[0].sectors || [])[0][0] : "it";
  const perfDate = perf.filter(Boolean).map(x => x.asOf).sort().at(-1);
  const face = `<div class="ce5-card"><table class="ce5-ff"><tr><th></th>${E.map((e, i) => `<th><span class="sq" style="background:${O2_RC[i]}"></span>${esc(ce5Nom(e))}</th>`).join("")}</tr>
    ${lig("Entreprises", "", lignesN, x => F0.format(x), "haut")}
    ${lig("Poids des 10 plus grosses", "plus c'est haut, plus c'est concentré", X.seuls.map(z => z.top10), x => O2_p(x, 0, false), "bas")}
    ${lig(esc(lib(sec1)), "le premier secteur", F.map(f => secW(f, sec1)), x => O2_p(x, 0, false), null)}
    ${lig("Frais par an", "sur 1 000 € placés", E.map(e => e.ter), x => `${O2_p(x, 2, false)}<small>${F2.format(x * 10)} €</small>`, "bas")}
    ${lig("Éligible au PEA", "", E.map(e => e.pea ? 1 : 0), x => x ? "oui" : "non", null)}
    ${lig("Sur 1 an", "", perf.map(x => x && x.a1 != null ? x.a1 * 100 : null), x => O2_p(x, 1), "haut")}
    ${lig("Sur 5 ans", "", perf.map(x => x && x.a5 != null ? x.a5 * 100 : null), x => O2_p(x, 1), "haut")}
  </table><p class="ek-note">Vert : le plus d'entreprises, le moins concentré, le moins de frais, la plus forte hausse passée. ${perfDate ? `Performances publiées par les émetteurs au ${dLabel(perfDate)}, en euros${perf.some(x => x && x.sansDiv) ? " (« sans dividendes » pour les parts distribuantes)" : ""}` : "Performances non disponibles"} : elles ne disent rien de l'avenir.</p></div>`;
  // En commun (deux fonds)
  let commun = "";
  if (N === 2 && !partiels.length) { const p = p0[2], sA = p.lignesA - p.communes, sB = p.lignesB - p.communes, [inA, inB] = [p.partAdansB, p.partBdansA], petit = inA >= inB ? 0 : 1, inc = Math.max(inA, inB);
    commun = `<section class="ek-sec"><span class="ek-stk2 v">En commun</span><h2>${F0.format(p.communes)} entreprise${p.communes > 1 ? "s" : ""} dans les deux.</h2>
      <div class="ce5-venn"><div class="a" style="flex:${Math.max(sA, 1)}">${sA > 40 ? `${F0.format(sA)} seulement dans ${esc(ce5Le(ce5Nom(E[0])))}` : F0.format(sA)}</div><div class="c" style="flex:${Math.max(p.communes, 8)}">${F0.format(p.communes)}</div><div class="b" style="flex:${Math.max(sB, 1)}">${sB > 40 ? `${F0.format(sB)} seulement dans ${esc(ce5Le(ce5Nom(E[1])))}` : F0.format(sB)}</div></div>
      <div class="ce5-leg"><span>${esc(ce5Nom(E[0]))} : ${F0.format(p.lignesA)} entreprises</span><span>${esc(ce5Nom(E[1]))} : ${F0.format(p.lignesB)} entreprises</span></div>
      <div class="ce5-3"><div class="ce5-card"><b>${O2_p(inc, 0, false)}</b><span>du poids ${esc(ce5Du(ce5Nom(E[petit])))} est aussi dans ${esc(ce5Le(ce5Nom(E[1 - petit])))}.</span></div>
        <div class="ce5-card"><b>${O2_p(ov, 0, false)}</b><span>de poids identique entre les deux fonds (pour chaque entreprise, le plus petit des deux poids).</span></div>
        <div class="ce5-card"><b>${F0.format(petit === 0 ? sA : sB)}</b><span>entreprise${(petit === 0 ? sA : sB) > 1 ? "s" : ""} ${esc(ce5Du(ce5Nom(E[petit])))} absente${(petit === 0 ? sA : sB) > 1 ? "s" : ""} de l'autre : ${O2_p(Math.max(0, 100 - inc), 0, false)} de son poids.</span></div></div></section>`; }
  // Les plus grosses et les secteurs : face à face pour deux fonds, colonnes au-delà
  const grosses = N === 2 ? ce5Miroir(top2.map(r => ({ label: r.label, href: r.href, a: r.v[0], b: r.v[1] })), noms[0], noms[1]) : O2_barres(top2, noms, couleurs);
  const secs = X.secteurs.length ? (N === 2 ? ce5Miroir(expo("secteurs", lib, 8).map(r => { const a = r.v[0], b = r.v[1], d = (b || 0) - (a || 0);
      return { label: r.label, a, b, tag: (a || 0) >= 3 && !(b > 0) ? `<span class="ce5-d dn">absent ${esc(ce5Du(noms[1]))}</span>` : (b || 0) >= 3 && !(a > 0) ? `<span class="ce5-d dn">absent ${esc(ce5Du(noms[0]))}</span>` : Math.abs(d) >= 10 ? `<span class="ce5-d ${d > 0 ? "up" : "dn2"}">${d > 0 ? "+" : "−"}${F0.format(Math.abs(d))} pts pour ${esc(ce5Le(noms[1]))}</span>` : "" }; }), noms[0], noms[1]) : O2_barres(expo("secteurs", lib, 8), noms, couleurs))
    : `<p class="muted">Répartition par secteur non disponible pour ces fonds.</p>`;
  const paysTxt = E.map((e, i) => { const c = (F[i].countries || []).slice(0, 3); return c.length ? `${esc(ce5Nom(e))} : ${c.map(([k, w]) => `${esc(COUNTRY[k] || k)} ${O2_p(w, 0, false)}`).join(", ")}` : ""; }).filter(Boolean).join(" · ");
  // Replié : la part en double si l'on détient les fonds ensemble (calcul d'origine), parts réglables
  const seg = [["En double (dans au moins deux fonds)", X.doublon, "#D94F2B", "d"], ...E.map((e, i) => [`Propre à ${e.name}`, X.propre[i] * X.parts[i], O2_RC[i]])].filter(x => x[1] > 0.05);
  const tot = seg.reduce((a, x) => a + x[1], 0) || 1;
  el.innerHTML = `
    ${avert}<section class="ek-sec"><span class="ek-stk2 b">Face à face</span><h2>${N === 2 ? "Les deux fonds" : "Les fonds"}, ligne par ligne.</h2>${face}</section>
    ${commun}
    <section class="ek-sec"><span class="ek-stk2">Les plus grosses</span><h2>Mêmes géants, poids différents.</h2><div class="ce5-card">${grosses}<p class="ek-note">Les 10 plus grosses entreprises des fonds réunis, en % de chaque fonds. « – » : le fonds ne la détient pas.</p></div></section>
    <section class="ek-sec"><span class="ek-stk2 p">Secteurs</span><h2>Où va l'argent.</h2><div class="ce5-card">${secs}<p class="ek-note">${paysTxt ? `Pays : ${paysTxt}. ` : ""}${emetteur ? "Secteurs publiés par les émetteurs (classification GICS)." : "Secteurs calculés par le site à partir des entreprises qu'il suit dans chaque fonds."}</p></div></section>
    <section class="ek-sec">
      <details class="s4-pl ce5-dbl"><summary>Vous détenez ${N === 2 ? "les deux" : "ces fonds"} ? Ce qui est en double dans votre portefeuille</summary>
        <div class="ce5-parts">${E.map((e, i) => `<label class="s4-f"><span>Part de ${esc(e.name)} (%)</span><input class="el-in" type="number" inputmode="decimal" min="0" max="100" step="5" data-w="${i}" value="${S.w[i]}"></label>`).join("")}</div>
        <p class="ce5-dt">${O2_p(X.doublon, 0, false)} de votre argent est en double</p>
        <div class="rv-bar" role="img" aria-label="Répartition de votre argent">${seg.map(([l, v_, c, d]) => `<i class="${d ? "d" : ""}" style="flex:${(v_ / tot * 1000).toFixed(0)};background:${c}" title="${esc(l)}"></i>`).join("")}</div>
        <div class="s4-parts">${seg.map(([l, v_, c]) => `<div class="s4-pt"><i style="background:${c}"></i><span>${esc(l)}</span><b>${O2_p(v_, 0, false)}</b></div>`).join("")}</div>
        <div class="rv-csq">${csq.map(x => `<div>${x}</div>`).join("")}</div>
        <p class="ek-note">Constats calculés sur les compositions publiées, pas une recommandation : un recouvrement peut être voulu.</p></details>
      ${N > 2 ? `<details class="s4-pl"><summary>Le détail, paire par paire</summary><ul>${paires.map(([i, j, p]) => `<li><b>${esc(nm(i))}</b> et <b>${esc(nm(j))}</b> : ${F0.format(p.communes)} entreprises en commun, ${O2_p(p.recouvrement, 0, false)} de poids identique.</li>`).join("")}</ul></details>` : ""}
      <details class="s4-pl"><summary>Sources et méthode</summary><ul>${sources}</ul><p class="ek-note">« En commun » : entreprises présentes dans les fonds ; « poids identique » : somme, entreprise par entreprise, du plus petit des poids. Information, pas un conseil d'investissement.</p></details></section>`;
  $$("#o2rr [data-w]").forEach(inp => inp.oninput = () => { const i = +inp.dataset.w; S.w[i] = Math.max(0, parseFloat(String(inp.value).replace(",", ".")) || 0); clearTimeout(CE5.t); CE5.t = setTimeout(() => { const ouvert = $(".ce5-dbl") && $(".ce5-dbl").open; CE5.maj(false); setTimeout(() => { if (ouvert && $(".ce5-dbl")) $(".ce5-dbl").open = true; }, 400); }, 300); });
}
window.outilRecouvrement = outilRecouvrement5;
