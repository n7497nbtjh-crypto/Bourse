/* ---------- Apprendre v5 (3/11/2026, maquette en ligne sur /apprendre/nouveau) ----------
   Demande de Romain : un seul module d'apprentissage, clair, ordonné, pas trop long, visuel et interactif, dans la DA du
   site ; garder « Les repères, vous en aurez besoin ». Sept idées, chacune : une question en titre, un visuel qu'on manipule
   (curseur ou choix), la phrase à retenir, un vrai ou faux corrigé tout de suite, un lien pour aller plus loin.
   Chiffres : comptes des entreprises (RBY, f4M, f4Rivales de fiche4.js), ETF suivis (ETF.list), MSCI World en euros
   (COMM_MW, commSimule de communication.js), frais médians (O2_terMedian). Seuls les calculs d'exemple sont des hypothèses,
   écrites comme telles. Progression gardée sur l'appareil (bilan.apprendre5). Styles : composants.css, bloc « Apprendre v5 ». */
const AP5_IDS = ["hermes", "lvmh", "totalenergies", "air-liquide"];
const AP5_E = v => F0.format(Math.round(v)) + " €";
const AP5_P = (v, d = 1) => (v > 0 ? "+" : v < 0 ? "−" : "") + ekFr(Math.abs(v), d) + " %";
function ap5Etat() { try { return JSON.parse(localStorage.getItem("bilan.apprendre5") || "{}"); } catch (e) { return {}; } }
function ap5Note(k) { const s = ap5Etat(); s[k] = 1; try { localStorage.setItem("bilan.apprendre5", JSON.stringify(s)); } catch (e) { } }
function ap5Chips(nom, ids, on) { return `<div class="ap5-chips scroll-x" data-ap5-chips="${nom}">${ids.map(id => RBY[id] ? `<button type="button" data-id="${id}" class="${id === on ? "on" : ""}">${f4Logo(RBY[id], null, true)}${esc(RBY[id].name)}</button>` : "").join("")}</div>`; }
function ap5Quiz(k, q, bon, oui, non) { // vrai ou faux, corrigé tout de suite
  return `<div class="ap5-q" data-ap5-q="${k}" data-bon="${bon}"><span class="ap5-qk">Vrai ou faux ?</span><p>${q}</p><div><button type="button" data-r="v">Vrai</button><button type="button" data-r="f">Faux</button></div>
    <p class="ap5-qr" hidden data-oui="${esc(oui)}" data-non="${esc(non)}"></p></div>`;
}
function ap5Chap(n, k, titre, corps, retenir, quiz, plus) {
  return `<section class="ap5-ch" id="c${n}" data-k="${k}"><div class="ap5-n"><b>${n}</b></div><div class="ap5-c">
    <span class="ap5-kick">Idée ${n} sur 7</span><h2>${titre}</h2>${corps}
    <div class="ap5-ret"><span class="ek-stk2">À retenir</span><p>${retenir}</p></div>${quiz}
    ${plus ? `<a class="ap5-plus" href="${plus[0]}">${plus[1]} →</a>` : ""}</div></section>`;
}
async function pageApprendre5() {
  setTitle("Apprendre la Bourse en 7 idées"); setNav("aca");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([typeof PXP !== "undefined" ? PXP : null, typeof loadFiches === "function" ? loadFiches() : null]);
  const ids = AP5_IDS.filter(id => RBY[id] && !RBY[id].missing), ex = ids[0], S = ap5Etat();
  const ter = (typeof O2_terMedian === "function" && O2_terMedian()) || { v: 0.3, n: 0 };
  const mw = ETF.list.find(e => e.id === "ishares-core-msci-world") || ETF.list.find(e => /MSCI World/i.test(e.index || "") && e.compo && e.compo.n);
  const ans = Object.keys(COMM_MW).map(Number).sort((a, z) => a - z), hausse = ans.filter(y => COMM_MW[y] > 0).length;
  const garder = (typeof AP4_GARDER !== "undefined" ? AP4_GARDER : []).filter(x => x[4] !== "fr" || (typeof frSeul !== "function" || frSeul()));
  const fait = Object.keys(S).length;
  app.innerHTML = `<div class="ek ek-page ap5">
    <section class="ek-hero"><span class="mc-stk">Apprendre</span><h1 class="ag4-t">La Bourse en 7 idées, avec de vraies entreprises.</h1>
      <p class="mc-sub">Un quart d'heure, dans l'ordre. Vous manipulez les chiffres, vous vérifiez ce que vous avez compris. Les comptes sont ceux publiés par les entreprises.</p>
      <div class="ap4-go"><a class="ap4-btn" href="#c${Math.min(7, fait + 1)}">${fait ? `Continuer : idée ${Math.min(7, fait + 1)}` : "Commencer"} →</a><span>${fait ? `${fait} idée${fait > 1 ? "s" : ""} sur 7 comprise${fait > 1 ? "s" : ""}` : "Sans inscription, progression gardée sur cet appareil"}</span></div></section>
    <nav class="ap5-prog" aria-label="Les 7 idées">${["Réserve", "Action", "Lire", "Prix", "Diversifier", "Frais", "Temps"].map((t, i) => `<a href="#c${i + 1}" data-c="${i + 1}"><i>${i + 1}</i><span>${t}</span></a>`).join("")}</nav>
    ${ap5Chap(1, "reserve", "D'abord, une réserve.", `<p class="ap5-lead">Avant d'acheter une action, gardez de côté de quoi faire face à un imprévu, sur une épargne disponible à tout moment.</p>
      <div class="ap5-box"><label class="ap5-sl"><span>Vos dépenses par mois</span><input type="range" id="ap5dep" min="500" max="5000" step="100" value="1500"><b id="ap5depv"></b></label>
        <div class="ap5-mois" id="ap5mois">${[1, 2, 3, 4, 5, 6].map(m => `<span class="${m <= 3 ? "a" : "b"}"><small>mois ${m}</small></span>`).join("")}</div>
        <p class="ap5-big" id="ap5res"></p></div>`,
      "Trois à six mois de dépenses, à part. L'argent placé en Bourse est celui dont vous n'aurez pas besoin avant plusieurs années.",
      ap5Quiz("reserve", "Votre voiture tombe en panne : 1 200 € de réparation. C'est le moment de vendre vos actions.", "f", "Exact : c'est le rôle de la réserve. Vendre dans l'urgence oblige parfois à vendre au mauvais moment.", "Non : c'est le rôle de la réserve. Vendre dans l'urgence oblige parfois à vendre au mauvais moment."),
      ["/academie/bases/epargne-precaution", "L'épargne de précaution en détail"])}
    ${ap5Chap(2, "action", "Une action, c'est un morceau d'entreprise.", `<p class="ap5-lead">Chaque action donne droit à une part du bénéfice. L'entreprise en verse une partie (le dividende) et garde le reste pour investir.</p>
      <div class="ap5-box">${ap5Chips("act", ids, ex)}<label class="ap5-sl"><span>Nombre d'actions</span><input type="range" id="ap5n" min="1" max="50" value="10"><b id="ap5nv"></b></label>
        <div id="ap5act"></div></div>`,
      "Acheter une action, c'est devenir copropriétaire : vous profitez des bénéfices, et vous subissez les pertes.",
      ap5Quiz("action", "Si l'entreprise ne verse pas de dividende, votre action ne vous rapporte rien.", "f", "Exact : le bénéfice gardé est réinvesti dans l'entreprise. S'il la fait grandir, la valeur de votre part peut monter.", "Non : le bénéfice gardé est réinvesti dans l'entreprise. S'il la fait grandir, la valeur de votre part peut monter."),
      ["/lexique#action", "L'action dans le lexique"])}
    ${ap5Chap(3, "lire", "Lire une entreprise : trois questions.", `<p class="ap5-lead">Vend-elle plus qu'avant ? Combien garde-t-elle sur ce qu'elle vend ? Que doit-elle ? Chaque réponse se lit face à ses concurrentes.</p>
      <div class="ap5-box">${ap5Chips("lire", ids, ex)}<div class="ap5-trois" id="ap5lire"></div><p class="ap5-src" id="ap5lires"></p></div>`,
      "Un chiffre seul ne dit rien : 10 % de marge, c'est beaucoup dans la grande distribution et peu dans le luxe. Comparez toujours au même métier.",
      ap5Quiz("lire", "Une marge de 10 % peut être bonne dans un métier et faible dans un autre.", "v", "Exact : c'est pour cela que chaque chiffre du site est placé face à la médiane des entreprises du même métier.", "Si : c'est pour cela que chaque chiffre du site est placé face à la médiane des entreprises du même métier."),
      ex ? [`/entreprise/${ex}`, `La fiche complète de ${RBY[ex].name}`] : null)}
    ${ap5Chap(4, "prix", "Le prix : combien d'années de bénéfices ?", `<p class="ap5-lead">Le PER divise le prix de l'action par le bénéfice d'une action. Il dit combien d'années du bénéfice actuel vous payez d'avance.</p>
      <div class="ap5-box">${ap5Chips("prix", ids, ex)}<div id="ap5prix"></div></div>`,
      "Un PER élevé n'est pas une erreur : les acheteurs parient sur un bénéfice qui va grandir. S'il ne grandit pas, le prix peut baisser.",
      ap5Quiz("prix", "Un PER de 30 veut dire que l'action va monter de 30 %.", "f", "Exact : c'est un prix, pas une prévision. Il dit combien vous payez pour un euro de bénéfice d'aujourd'hui.", "Non : c'est un prix, pas une prévision. Il dit combien vous payez pour un euro de bénéfice d'aujourd'hui."),
      ["/lexique#per", "Le PER dans le lexique"])}
    ${ap5Chap(5, "divers", "Ne pas tout miser sur une seule.", `<p class="ap5-lead">Une entreprise peut faire faillite. Plus vous en détenez, moins une mauvaise surprise pèse sur votre argent.</p>
      <div class="ap5-box"><div class="ap5-seg" id="ap5div">${[1, 10, 100, mw && mw.compo && mw.compo.n || 1000].map((n, i) => `<button type="button" data-n="${n}" class="${i === 1 ? "on" : ""}">${F0.format(n)} entreprise${n > 1 ? "s" : ""}</button>`).join("")}</div>
        <div class="ap5-dots" id="ap5dots"></div><p class="ap5-big" id="ap5divr"></p>
        ${mw ? `<p class="ap5-etf">Un ETF qui suit l'indice MSCI World, comme <a href="/etf/${esc(mw.id)}">${esc(mw.name)}</a>, en détient <b>${F0.format(mw.compo.n)}</b> en une seule ligne, pour <b>${ekFr(mw.ter, 2)} %</b> de frais par an.</p>` : ""}</div>`,
      "Diversifier ne supprime pas le risque que tout le marché baisse ensemble. Cela supprime celui qu'une seule entreprise vous coûte tout.",
      ap5Quiz("divers", "Un ETF de plus de 1 000 entreprises peut quand même baisser fortement.", "v", "Exact : quand toute la Bourse baisse, l'ETF baisse aussi. En 2008, le MSCI World a perdu 36,9 % en euros.", "Si : quand toute la Bourse baisse, l'ETF baisse aussi. En 2008, le MSCI World a perdu 36,9 % en euros."),
      ["/academie/placements/etf", "Comprendre un ETF"])}
    ${ap5Chap(6, "frais", "Les frais, discrets mais têtus.", `<p class="ap5-lead">Un pour cent par an semble peu. Mais les frais se prélèvent chaque année, sur une somme qui grandit.</p>
      <div class="ap5-box"><label class="ap5-sl"><span>Frais par an</span><input type="range" id="ap5f" min="0" max="2.5" step="0.05" value="1.5"><b id="ap5fv"></b></label>
        <div id="ap5frais"></div><p class="ap5-src">Exemple : 200 € par mois pendant 20 ans, avec l'hypothèse d'une hausse de 5 % par an avant frais. Ce n'est pas une prévision.${ter.n ? ` Repère : la médiane des frais de ${ter.n} ETF actions monde suivis par le site est de ${ekFr(ter.v, 2)} % par an.` : ""}</p></div>`,
      "À rendement égal, les frais font la différence sur la durée. Regardez les frais du fonds et ceux du courtier avant d'acheter.",
      ap5Quiz("frais", "Sur l'exemple, passer de 1,5 % à 0,2 % de frais par an laisse plus de 10 000 € de plus au bout de 20 ans.", "v", "Exact : 10 556 € d'écart, pour les mêmes 48 000 € versés.", "Si : 10 556 € d'écart, pour les mêmes 48 000 € versés."),
      ["/simulateurs/frais", "Calculer avec vos frais"])}
    ${ap5Chap(7, "temps", "Le temps fait le travail, les baisses font partie du voyage.", `<p class="ap5-lead">Sur ${ans.length} années, les actions du monde ont monté ${hausse} fois et baissé ${ans.length - hausse} fois. Choisissez une année de départ.</p>
      <div class="ap5-box"><div class="ap5-ans" id="ap5ans">${ans.map(y => `<button type="button" data-y="${y}" class="${COMM_MW[y] >= 0 ? "g" : "r"}" title="${y} : ${AP5_P(COMM_MW[y])}" style="--h:${Math.min(100, Math.abs(COMM_MW[y]) * 2)}%"><i></i><small>${String(y).slice(2)}</small></button>`).join("")}</div>
        <div id="ap5tps"></div><p class="ap5-src">MSCI World en euros, dividendes réinvestis, année par année (fiches MSCI ; avant 2012, converti depuis le dollar par ENKLAIR). 100 € investis chaque mois. Les performances passées ne préjugent pas des performances futures.</p></div>`,
      "Personne ne sait quand viendra la prochaine baisse. Ce qui a compté, c'est de rester investi assez longtemps pour la traverser.",
      ap5Quiz("temps", "Il faut attendre le bon moment pour commencer à investir.", "f", "Exact : personne ne le connaît à l'avance. Investir un peu chaque mois évite de tout miser sur un seul moment.", "Non : personne ne le connaît à l'avance. Investir un peu chaque mois évite de tout miser sur un seul moment."),
      ["/outils/si-javais", "Et si j'avais investi ?"])}
    <section class="ek-sec ap5-fin" id="fin"><span class="ek-stk2 b">Et maintenant</span><h2>Vous avez l'essentiel. À vous de lire.</h2>
      <div class="ou4-g">${[[ex ? `/entreprise/${ex}` : "/entreprises", "listes", "Lire une vraie fiche", "Le verdict, les cinq étapes, face aux concurrentes."], ["/etf", "epargne", "Trouver un ETF", "Frais, contenu et performance, face à la médiane."], ["/simulateurs/epargne", "impot", "Simuler votre épargne", "Vos montants, trois scénarios tirés de l'histoire."]].map(([h, k, n, d]) => `<a class="ou4-c" href="${h}">${ou4Ic(k)}<b>${esc(n)}</b><span>${esc(d)}</span><em>Ouvrir →</em></a>`).join("")}</div></section>
    <section class="ek-sec"><span class="ek-stk2 b">À garder sous la main</span><h2>Les repères, vous en aurez besoin.</h2><div class="ou4-g">${garder.map(([h, k, n, d]) => `<a class="ou4-c" href="${h}">${ou4Ic(k)}<b>${esc(n)}</b><span>${esc(d)}</span><em>Ouvrir →</em></a>`).join("")}</div></section>
    <p class="ek-note">Contenu pédagogique et général, pas un conseil en investissement. Les entreprises citées sont des exemples, pas une sélection.</p></div>`;
  ap5Brancher(ids, ex, mw);
}
function ap5Brancher(ids, ex, mw) {
  const st = { act: ex, lire: ex, prix: ex };
  const rDep = () => { const d = +$("#ap5dep").value; $("#ap5depv").textContent = AP5_E(d); $("#ap5res").innerHTML = `Votre réserve : de <b>${AP5_E(3 * d)}</b> à <b>${AP5_E(6 * d)}</b>`; };
  const rAct = () => { const s = RBY[st.act], n = +$("#ap5n").value, p = pxOf(s), eps = s.eps, dps = s.dps || 0; $("#ap5nv").textContent = F0.format(n);
    const garde = Math.max(0, eps - dps), pd = eps > 0 ? Math.min(100, dps / eps * 100) : 0;
    $("#ap5act").innerHTML = `<div class="ap5-tri"><div><small>Vous payez</small><b>${p && p.p ? AP5_E(n * p.p) : "–"}</b><span>${F0.format(n)} × ${p && p.p ? ekFr(p.p, 2) + " €" : "cours non disponible"}</span></div>
      <div><small>Votre part du bénéfice ${esc(s.year)}</small><b>${eps != null ? AP5_E(n * eps) : "–"}</b><span>${eps != null ? ekFr(eps, 2) + " € par action" : ""}</span></div>
      <div><small>Dont versé en dividende</small><b>${AP5_E(n * dps)}</b><span>le reste, ${AP5_E(n * garde)}, est gardé</span></div></div>
      ${eps > 0 ? `<div class="ap5-split" aria-hidden="true"><span class="y" style="width:${pd}%">dividende</span><span style="width:${100 - pd}%">gardé pour investir</span></div>` : ""}
      <p class="ap5-src">Comptes ${esc(s.year)} publiés par ${esc(s.name)} ; cours relevé par le site.</p>`; };
  const rLire = () => { const s = RBY[st.lire], bk = isBank(s) || !f4Valide(s), P = f4Rivales(s, bk), M = f4M(s), med = k => f4Med(P.L.map(x => f4M(x)[k]).filter(v => v != null));
    const g = M.g, gm = med("g"), m = M.m, mm = med("m"), nd = s.netDebt, ebitda = s.ebit;
    const barre = (v, md, fmt) => { const mx = Math.max(Math.abs(v || 0), Math.abs(md || 0), 1e-9); return `<div class="ap5-bars"><div><span>${esc(s.name)}</span><i class="me" style="width:${Math.max(3, Math.abs(v) / mx * 100)}%"></i><b>${fmt(v)}</b></div><div><span>Médiane</span><i style="width:${Math.max(3, Math.abs(md) / mx * 100)}%"></i><b>${fmt(md)}</b></div></div>`; };
    const ton = (v, md) => v == null || md == null ? "" : v >= md ? "g" : "r";
    const cartes = [
      ["Vend-elle plus ?", g != null ? AP5_P(g * 100) : "–", "de ventes sur un an", ton(g, gm), g != null && gm != null ? barre(g * 100, gm * 100, v => AP5_P(v)) : ""],
      ["Que garde-t-elle ?", m != null ? ekFr(m * 100, 1) + " %" : "–", "de marge d'exploitation", ton(m, mm), m != null && mm != null ? barre(m * 100, mm * 100, v => ekFr(v, 1) + " %") : ""],
      ["Que doit-elle ?", nd == null ? "–" : nd <= 0 ? "Rien" : big(nd, s.currency), nd == null ? "" : nd <= 0 ? `de dette nette : ${big(-nd, s.currency)} de trésorerie en plus` : ebitda > 0 ? `de dette nette, ${ekFr(nd / ebitda, 1)} années de résultat` : "de dette nette", nd == null ? "" : nd <= 0 ? "g" : ebitda > 0 && nd / ebitda > 3 ? "r" : "", ""]];
    $("#ap5lire").innerHTML = cartes.map(([q, v, u, t, b]) => `<div class="ap5-k ${t}"><small>${q}</small><b>${v}</b><span>${u}</span>${b}</div>`).join("");
    $("#ap5lires").textContent = `Médiane de ${P.L.length > 2 ? "ses concurrentes : " + listFr(P.L.slice(0, 4).map(x => x.name)) : "son secteur"}. Comptes ${s.year}.`; };
  const rPrix = () => { const s = RBY[st.prix], P = f4Rivales(s, isBank(s) || !f4Valide(s)), pe = f4M(s).pe, md = f4Med(P.L.map(x => f4M(x).pe).filter(v => v != null && v > 0 && v < 200)), n = pe ? Math.round(pe) : 0;
    $("#ap5prix").innerHTML = pe ? `<p class="ap5-big">${esc(s.name)} : <b>${ekFr(pe, 0)} années</b> de bénéfices${md ? `, face à ${ekFr(md, 0)} pour ses concurrentes` : ""}.</p>
      <div class="ap5-annees" aria-hidden="true">${Array.from({ length: Math.min(60, Math.max(n, md ? Math.round(md) : 0)) }, (_, i) => `<i class="${i < n ? "on" : ""}${md && i === Math.round(md) - 1 ? " md" : ""}"></i>`).join("")}</div>
      <p class="ap5-src">Un carré = une année du bénéfice ${esc(s.year)}. ${md ? "Le carré cerclé marque la médiane des concurrentes." : ""}</p>` : `<p class="ek-note">Pas de PER calculable pour ${esc(s.name)} (bénéfice négatif ou cours absent).</p>`; };
  const rDiv = n => { const k = Math.min(n, 100); $("#ap5dots").innerHTML = Array.from({ length: k }, (_, i) => `<i class="${i === 0 ? "r" : ""}"></i>`).join("") + (n > 100 ? `<em>… et ${F0.format(n - 100)} autres</em>` : "");
    $("#ap5divr").innerHTML = `Si l'une fait faillite, vous perdez <b>${ekFr(100 / n, n >= 100 ? 2 : 0)} %</b> de votre argent.`; };
  const rFrais = () => { const f = +$("#ap5f").value, fin = t => { let v = 0; const r = Math.pow(1 + (0.05 - t / 100), 1 / 12) - 1; for (let i = 0; i < 240; i++) v = (v + 200) * (1 + r); return v; };
    const a = fin(f), b0 = fin(0.2), mx = Math.max(a, b0); $("#ap5fv").textContent = ekFr(f, 2) + " %";
    $("#ap5frais").innerHTML = `<div class="ap5-bars ap5-bars2"><div><span>Avec ${ekFr(f, 2)} %</span><i class="me" style="width:${a / mx * 100}%"></i><b>${AP5_E(a)}</b></div><div><span>Avec 0,20 %</span><i style="width:${b0 / mx * 100}%"></i><b>${AP5_E(b0)}</b></div></div>
      <p class="ap5-big">${Math.abs(b0 - a) < 50 ? "Presque aucune différence." : `Écart : <b>${AP5_E(Math.abs(b0 - a))}</b> sur 48 000 € versés.`}</p>`; };
  const rTps = y => { const r = commSimule(y, COMM_FIN, 100), f = r.pts ? r.pts[r.pts.length - 1] : null; $$("#ap5ans button").forEach(b => b.classList.toggle("on", +b.dataset.y >= y));
    if (!f) { $("#ap5tps").innerHTML = ""; return; }
    const pire = r.pire; $("#ap5tps").innerHTML = `<div class="ap5-tri"><div><small>Versé de ${y} à ${COMM_FIN}</small><b>${AP5_E(f.ver)}</b><span>100 € par mois</span></div><div class="g"><small>Valeur fin ${COMM_FIN}</small><b>${AP5_E(f.act)}</b><span>${AP5_P((f.act / f.ver - 1) * 100, 0)} sur ce qui a été versé</span></div>
      ${pire ? `<div class="r"><small>Pire année traversée</small><b>${pire.y} : ${AP5_P(COMM_MW[pire.y])}</b><span>une année à traverser sans vendre</span></div>` : ""}</div>`; };
  rDep(); rAct(); rLire(); rPrix(); rDiv(10); rFrais(); rTps(2006);
  $("#ap5dep").oninput = rDep; $("#ap5n").oninput = rAct; $("#ap5f").oninput = rFrais;
  app.onclick = e => {
    const c = e.target.closest("[data-ap5-chips] button"); if (c) { const k = c.parentNode.dataset.ap5Chips; st[k] = c.dataset.id; $$("button", c.parentNode).forEach(b => b.classList.toggle("on", b === c)); ({ act: rAct, lire: rLire, prix: rPrix })[k](); return; }
    const d = e.target.closest("#ap5div button"); if (d) { $$("#ap5div button").forEach(b => b.classList.toggle("on", b === d)); rDiv(+d.dataset.n); return; }
    const y = e.target.closest("#ap5ans button"); if (y) { rTps(Math.min(+y.dataset.y, COMM_FIN - 4)); return; }
    const q = e.target.closest(".ap5-q button"); if (q) { const box = q.closest(".ap5-q"), ok = q.dataset.r === box.dataset.bon, r = $(".ap5-qr", box);
      $$("button", box).forEach(b => { b.disabled = true; b.classList.toggle("bon", b.dataset.r === box.dataset.bon); b.classList.toggle("faux", b === q && !ok); });
      r.hidden = false; r.className = "ap5-qr " + (ok ? "g" : "r"); r.textContent = ok ? r.dataset.oui : r.dataset.non; if (ok) { ap5Note(box.dataset.ap5Q); ap5Prog(); } }
  };
  ap5Prog();
}
function ap5Prog() { const S = ap5Etat(); $$(".ap5-prog a").forEach(a => { const ch = document.getElementById("c" + a.dataset.c); a.classList.toggle("ok", !!(ch && S[ch.dataset.k])); }); }
ROUTES_EXTRA.push([/^\/apprendre\/nouveau$/, () => pageApprendre5()]);
