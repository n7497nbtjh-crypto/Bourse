/* ---------- « Deux ETF se recouvrent-ils ? » v4 (3/11/2026), même direction que les autres outils v4 ----------
   /outils/recouvrement. En-tête jaune : la part de l'argent en double en titre, le verdict en phrase, le choix des fonds
   (2 à 4, part de chacun, exemples) en carte blanche dans le bandeau.
   Puis : ce que vous détenez vraiment (barre : en double / propre à chaque fonds, trois chiffres), les plus grosses
   entreprises fonds par fonds, ce que cela change, secteurs et pays, et repliés : paire par paire, expositions indirectes, sources.
   Calculs inchangés : O2_rcCalcul (m/outils2.js) prépare les données et appelle O2_rcAfficher, redéfinie ici.
   Mêmes paramètres d'adresse (?a ?b ?c ?d ?w). Remplace outilRecouvrement. */
async function outilRecouvrement4() {
  O2_css(); setTitle("Recouvrement des ETF"); setNav("sim");
  const S = O2_rcEtat();
  const trouve = re => ETF.list.find(e => re.test(e.index || "") && e.compo && e.pea) || ETF.list.find(e => re.test(e.index || "") && e.compo) || ETF.list.find(e => re.test(e.index || ""));
  const presets = [["Monde + S&P 500", /^MSCI World$/i, /^S&P 500$/i], ["Monde + Nasdaq 100", /^MSCI World$/i, /^Nasdaq.?100$/i], ["Monde + Europe", /^MSCI World$/i, /^(MSCI Europe|Stoxx Europe 600)$/i], ["CAC 40 + Euro Stoxx 50", /^CAC 40$/i, /^Euro Stoxx 50$/i]]
    .map(([l, a, b]) => { const ea = trouve(a), eb = trouve(b); return ea && eb ? [l, ea.id, eb.id] : null; }).filter(Boolean);
  app.innerHTML = `<div class="ek ek-page s4 rc4">
    <section class="ek-hero"><span class="mc-stk">Mes ETF se recouvrent-ils ?</span><h1 class="ag4-t" id="rct">Lecture des compositions…</h1><p class="mc-sub" id="rcs">Beaucoup d'ETF contiennent les mêmes grandes entreprises. Choisissez 2 à 4 fonds et la part de chacun : le site ouvre leurs compositions officielles.</p>
      <div class="s4-form rv-form"><div id="o2rl" class="rv-l"></div>
        <div class="rv-act"><a href="#" role="button" class="rv-add" id="o2radd">+ Ajouter un ETF</a><span>Exemples :</span><div class="s4-seg rv-ex">${presets.map(([l, a, b]) => `<a href="#" role="button" data-a="${a}" data-b="${b}">${esc(l)}</a>`).join("")}</div></div></div></section>
    <div id="o2rr"></div></div>`;
  const lignes = () => {
    $("#o2rl").innerHTML = S.ids.map((id, i) => `<div class="rv-row"><span class="rv-dot" style="background:${O2_RC[i]}"></span>
      <div class="s4-f rv-pk"><span>ETF n° ${i + 1}</span><div class="sj-pkw"><input id="o2rq${i}" class="el-in" type="search" autocomplete="off" placeholder="Nom d'un ETF"><div class="msug" hidden></div></div></div>
      <label class="s4-f rv-w"><span>Part (%)</span><input id="o2rw${i}" class="el-in" type="number" inputmode="decimal" min="0" max="100" step="5" value="${S.w[i]}"></label>
      ${S.ids.length > 2 ? `<a href="#" role="button" class="rv-x" data-x="${i}" aria-label="Retirer ce fonds">×</a>` : ""}</div>`).join("");
    S.ids.forEach((id, i) => {
      $("#o2rq" + i).value = ETFBY[id].name; bindPicker("o2rq" + i, k => { S.ids[i] = k.slice(2); maj(); }, true);
      $("#o2rw" + i).oninput = () => { S.w[i] = Math.max(0, parseFloat(String($("#o2rw" + i).value).replace(",", ".")) || 0); clearTimeout(S.t); S.t = setTimeout(maj, 250, false); };
    });
    $$("#o2rl [data-x]").forEach(b => b.onclick = e => { e.preventDefault(); const i = +b.dataset.x; S.ids.splice(i, 1); S.w.splice(i, 1); maj(); });
    $("#o2radd").hidden = S.ids.length >= 4;
  };
  const maj = (redessine = true) => {
    const q = new URLSearchParams(); S.ids.forEach((id, i) => q.set("abcd"[i], id)); q.set("w", S.w.join(","));
    history.replaceState({}, "", "/outils/recouvrement?" + q); if (redessine) lignes();
    $$(".rv-ex [data-a]").forEach(b => b.classList.toggle("on", S.ids.length === 2 && S.ids[0] === b.dataset.a && S.ids[1] === b.dataset.b));
    O2_rcCalcul(S);
  };
  $("#o2radd").onclick = e => { e.preventDefault(); const x = ETF.list.find(y => y.compo && !S.ids.includes(y.id) && /Emerging|Europe/i.test(y.index || "")) || ETF.list.find(y => !S.ids.includes(y.id)); if (!x) return; S.ids.push(x.id); S.w = S.ids.map(() => Math.round(100 / S.ids.length)); maj(); };
  $$(".rv-ex [data-a]").forEach(b => b.onclick = e => { e.preventDefault(); S.ids = [b.dataset.a, b.dataset.b]; S.w = [50, 50]; maj(); });
  maj();
}
function O2_rcAfficher(D) {
  const { E, F, X, N, nm, paires, p0, best, ov, verdict, couleurs, nomsS, top, lib, expo, devs, csq, sources, emetteur } = D;
  const el = $("#o2rr"), t = $("#rct"), s = $("#rcs"); if (!el) return;
  // Noms courts dans les colonnes (l'indice suivi), et une même entreprise cotée deux fois (ex. Alphabet A et C) réunie en une ligne
  const noms = [...E.map(e => e.index || e.name), "Combiné"], fus = new Map();
  top.forEach(r => { const x = fus.get(r.label); if (!x) fus.set(r.label, { ...r, v: [...r.v] }); else x.v = x.v.map((a, i) => a == null && r.v[i] == null ? null : (a || 0) + (r.v[i] || 0)); });
  const top2 = [...fus.values()].sort((a, b) => b.v.at(-1) - a.v.at(-1)).slice(0, 10);
  if (t) t.textContent = `${O2_p(X.doublon, 0, false).replace(/ /g, " ")} de votre argent est en double.`;
  if (s) s.innerHTML = verdict;
  // Barre : en double, puis la part propre à chaque fonds (poids du fonds × part du fonds investie dans des titres qu'aucun autre fonds ne détient)
  const seg = [["En double (dans au moins deux fonds)", X.doublon, "#D94F2B", "d"], ...E.map((e, i) => [`Propre à ${e.name}`, X.propre[i] * X.parts[i], O2_RC[i]])].filter(x => x[1] > 0.05);
  const tot = seg.reduce((a, x) => a + x[1], 0) || 1;
  const chiffre = (v_, l, d, cl = "") => `<div class="sj-c${cl}"><span class="s4-k">${l}</span><b>${v_}</b><small>${d}</small></div>`;
  el.innerHTML = `
    <section class="ek-sec"><span class="ek-stk2 b">Ce que vous détenez vraiment</span><h2>Votre argent, fonds par fonds.</h2>
      <div class="rv-bar" role="img" aria-label="Répartition de votre argent">${seg.map(([l, v_, c, d]) => `<i class="${d ? "d" : ""}" style="flex:${(v_ / tot * 1000).toFixed(0)};background:${c}" title="${esc(l)} : ${O2_p(v_, 0, false)}"></i>`).join("")}</div>
      <div class="s4-parts">${seg.map(([l, v_, c]) => `<div class="s4-pt"><i style="background:${c}"></i><span>${esc(l)}</span><b>${O2_p(v_, 0, false)}</b></div>`).join("")}</div>
      <div class="sj-cs rv-cs">
        ${chiffre(F0.format(N === 2 ? p0[2].communes : X.communesToutes), "Entreprises en commun", N === 2 ? `sur ${F0.format(p0[2].lignesA)} et ${F0.format(p0[2].lignesB)} lignes` : "présentes dans tous vos fonds")}
        ${chiffre(O2_p(X.conc.top10, 0, false), "Les 10 plus grosses lignes", X.conc.top10 > 25 ? "du total : concentration forte" : "du total : concentration modérée", X.conc.top10 > 25 ? " w" : "")}
        ${chiffre("≈ " + F0.format(X.conc.nEq), "Diversification réelle", `comme ${F0.format(X.conc.nEq)} lignes de même poids (le fonds le plus diversifié seul : ≈ ${F0.format(best)})`)}</div>
      <p class="ek-note">Le nombre d'entreprises en commun ne suffit pas : deux fonds peuvent partager des centaines de petites lignes et peu de poids. Le poids en double additionne, pour chaque entreprise, le plus petit des poids.</p></section>
    <section class="ek-sec"><span class="ek-stk2 p">Ce que cela change</span><h2>Ce qu'il faut en retenir.</h2>
      <div class="rv-csq">${csq.map(x => `<div>${x}</div>`).join("")}</div>
      <p class="ek-note">Constats calculés sur les compositions publiées, pas une recommandation : un recouvrement peut être voulu (renforcer les États-Unis, par exemple).</p></section>
    <section class="ek-sec"><span class="ek-stk2 b">Les plus grosses entreprises</span><h2>Leur poids dans chaque fonds.</h2>
      <div class="rv-box">${O2_barres(top2, noms, couleurs)}</div>
      <p class="ek-note">« – » : le fonds ne détient pas l'entreprise. Dernière colonne : votre portefeuille combiné, selon les parts choisies.</p></section>
    <section class="ek-sec"><span class="ek-stk2 p">Secteurs et pays</span><h2>Où va votre argent.</h2>
      <div class="rv-box o2-split"><div><h3>Par secteur</h3>${X.secteurs.length ? O2_barres(expo("secteurs", lib, 8), noms, couleurs) : `<p class="muted">Répartition par secteur non disponible pour ces fonds.</p>`}</div>
        <div><h3>Par pays</h3>${X.pays.length ? O2_barres(expo("pays", k => COUNTRY[k] || k, 8), noms, couleurs) : `<p class="muted">Répartition par pays non disponible.</p>`}</div></div>
      <p class="ek-note">${emetteur ? "Secteurs publiés par les émetteurs (classification GICS)." : "Secteurs calculés par le site à partir des entreprises qu'il suit dans chaque fonds (classification du site), car au moins une source ne les publie pas."}</p></section>
    <section class="ek-sec">
      <details class="s4-pl"><summary>Le détail, paire par paire</summary>${tblxScrollBox(`<table class="t tbx"><thead><tr><th class="l lab" scope="col">Paire de fonds</th><th scope="col">Positions communes</th><th scope="col">Poids identique</th><th scope="col">Part du 1er dans le 2d</th><th scope="col">Part du 2d dans le 1er</th></tr></thead><tbody>
        ${paires.map(([i, j, p], z) => `<tr class="${z % 2 ? "z" : ""}"><th scope="row" class="l lab"><span class="nm">${esc(nm(i))}</span><span class="sub" style="display:block">et ${esc(nm(j))}</span></th><td class="num">${F0.format(p.communes)}<span class="sub" style="display:block">sur ${F0.format(p.lignesA)} et ${F0.format(p.lignesB)}</span></td><td class="num"><b>${O2_p(p.recouvrement, 0, false)}</b></td><td class="num">${O2_p(p.partAdansB, 0, false)}</td><td class="num">${O2_p(p.partBdansA, 0, false)}</td></tr>`).join("")}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}
        <p class="ek-note">« Part du 1er dans le 2d » : poids, dans le premier fonds, des entreprises que le second détient aussi. Proche de 100 % : le premier est presque inclus dans le second.</p></details>
      <details class="s4-pl"><summary>Expositions indirectes</summary><ul>${E.map((e, i) => `<li><b>${esc(e.name)}</b> suit l'indice <b>${esc(e.index || "non indiqué")}</b>${e.devise ? `, coté en ${esc(e.devise)}` : ""}${e.couvert ? ", couvert contre le risque de change" : ""}. Premier pays : ${F[i].countries[0] ? `${esc(COUNTRY[F[i].countries[0][0]] || F[i].countries[0][0])} (${O2_p(F[i].countries[0][1], 0, false)})` : "non indiqué"}.</li>`).join("")}
        ${devs.length ? `<li>Devises des entreprises détenues (d'après leur pays) : ${devs.slice(0, 5).map(([d, w]) => `${esc(d === "autres" ? "autres devises" : d)} ${O2_p(w, 0, false)}`).join(", ")}.</li>` : ""}</ul></details>
      <details class="s4-pl"><summary>Sources et méthode</summary><ul>${sources}</ul><p class="ek-note">Méthode : poids des lignes en % de chaque fonds ; portefeuille combiné = poids de chaque fonds multipliés par sa part ; « diversification réelle » = 1 ÷ somme des carrés des poids (indice de Herfindahl).</p></details></section>`;
  tblxBindScroll(el);
}
window.outilRecouvrement = outilRecouvrement4;
