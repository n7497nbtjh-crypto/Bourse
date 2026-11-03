/* ---------- Simulateur d'épargne v4 (3/11/2026), même direction que les autres pages v4 ----------
   /simulateurs, /simulateurs/epargne, /simulateurs/frais et (en France) /simulateurs/pea-cto.
   En-tête jaune : le résultat en titre (scénario central), le formulaire en carte blanche dans le bandeau.
   Puis : trois scénarios tirés de l'histoire (cartes + courbe), où part l'argent (barre empilée + lignes),
   PEA ou compte-titres (deux cartes, la meilleure en vert), le même plan chez chaque courtier (rangées), hypothèses repliées.
   Calculs inchangés : O2C.simule, O2C.scenarios, O2_simParams, O2_courbe (m/outils2.js), brokerBy / brokerFee (app.js).
   Les adresses gardent leurs paramètres (?ini, ?men, ?ans, ?env, ?bk, ?ter, ?ord, ?chg, ?infl, ?plan, ?reel, ?vente, ?hyp…).
   Hors France, /simulateurs/pea-cto reste le calcul du pays (m/pays.js). Remplace window.pageSim. */
const SIM4_0 = window.pageSim;
const s4Hc = (cle, t) => `<span class="ek-hc" role="button" tabindex="0" data-ek-def="${cle}">${t}<i>?</i></span>`;
const s4E = x => O2_e(Math.round(x)).replace(/\u202f/g, "\u00a0"); // espace insécable normale : la fine disparaît dans les grands titres serrés
function pageSim4(tool) {
  if (tool === "passe" || (tool === "pea-cto" && typeof e4Fr === "function" && !e4Fr())) return SIM4_0.apply(this, arguments);
  if (typeof O2_css === "function") O2_css(); setNav("sim");
  setTitle(tool === "frais" ? "Simulateur : le coût des frais" : tool === "pea-cto" ? "Simulateur : PEA ou compte-titres" : "Simulateur d'épargne");
  const hist = typeof COMM_MW !== "undefined" ? COMM_MW : null, ter = O2_terMedian(), fr = typeof e4Fr === "function" ? e4Fr() : true;
  const q = new URLSearchParams(location.search), n = (k, d) => { const x = parseFloat(q.get(k)); return isFinite(x) ? x : d; };
  const S = { ini: n("ini", 1000), men: n("men", 150), ans: Math.max(1, Math.min(40, Math.round(n("ans", 20)))), env: q.get("env") === "cto" || !fr ? "cto" : "pea", bk: BROKERS.list.some(b => b.id === q.get("bk")) ? q.get("bk") : "trade-republic",
    ter: n("ter", ter.v), ord: [1, 2, 4, 12].includes(n("ord", 12)) ? n("ord", 12) : 12, plan: q.get("plan") !== "0", chg: n("chg", 0), infl: n("infl", 2), reel: q.get("reel") === "1", vente: q.get("vente") !== "0",
    hyp: hist && q.get("hyp") !== "perso" ? "hist" : "perso", rp: n("rp", 2), rc: n("rc", 5), rf: n("rf", 8) };
  const champ = (id, l, val, at = "") => `<label class="s4-f"><span>${l}</span><input id="${id}" class="el-in" type="number" inputmode="decimal" value="${val}" ${at}></label>`;
  const seg = (id, L) => `<div class="s4-seg" id="${id}">${L.map(([v_, l]) => `<a href="#" role="button" data-v="${v_}">${l}</a>`).join("")}</div>`;
  app.innerHTML = `<div class="ek ek-page s4">
    <section class="ek-hero"><span class="mc-stk">Simulateur d'épargne</span><h1 class="ag4-t" id="s4t">…</h1><p class="mc-sub" id="s4s"></p>
      <div class="s4-form" id="s4form">
        ${champ("s4i", "Je place au départ", S.ini, 'min="0" step="100"')}${champ("s4m", "Puis chaque mois", S.men, 'min="0" step="10"')}${champ("s4a", "Pendant (années)", S.ans, 'min="1" max="40"')}
        ${fr ? `<div class="s4-f"><span>Compte</span>${seg("s4env", [["pea", "PEA"], ["cto", "Compte-titres"]])}</div>` : ""}
        <label class="s4-f"><span>Courtier</span><select id="s4bk">${brokerOptions(S.bk)}</select></label>
        <div class="s4-perso" id="s4perso" hidden>${champ("s4pfx", "Frais fixes par ordre (€)", 0, 'min="0" step="0.5"')}${champ("s4ppc", "Pourcentage par ordre (%)", 0, 'min="0" step="0.05"')}</div>
        <details class="s4-det" id="s4det"><summary>Frais et hypothèses détaillées</summary><div class="s4-dg">
          <div class="s4-f"><span>Rendement supposé</span>${seg("s4hyp", [...(hist ? [["hist", "Tiré de l'histoire"]] : []), ["perso", "Mes hypothèses"]])}</div>
          <div class="s4-f" id="s4rates" hidden><span>Rendements par an : prudent, central, favorable (%)</span><div class="s4-3">${["rp", "rc", "rf"].map(k => `<input id="s4${k}" class="el-in" type="number" step="0.5" value="${S[k]}">`).join("")}</div></div>
          ${champ("s4ter", "Frais courants du fonds (% par an)", +S.ter.toFixed(2), 'min="0" max="3" step="0.05"')}
          <div class="s4-f"><span>Achats par an</span>${seg("s4ord", [[12, "12"], [4, "4"], [2, "2"], [1, "1"]])}</div>
          ${champ("s4chg", "Frais de change (% par opération)", S.chg, 'min="0" max="2" step="0.05"')}
          ${champ("s4infl", "Hausse des prix supposée (% par an)", S.infl, 'min="0" max="10" step="0.5"')}
          <label class="s4-c" id="s4planf"><input type="checkbox" id="s4plan" ${S.plan ? "checked" : ""}><span>Plan d'investissement programmé <small id="s4planh"></small></span></label>
          <label class="s4-c"><input type="checkbox" id="s4vente" ${S.vente ? "checked" : ""}><span>Compter les frais de revente <small>un ordre de vente de tout le placement à la fin</small></span></label>
          <label class="s4-c"><input type="checkbox" id="s4reel" ${S.reel ? "checked" : ""}><span>Montants en euros d'aujourd'hui <small>divisés par la hausse des prix supposée</small></span></label>
          <p class="s4-hint">${ter.n ? `Frais courants par défaut : médiane de ${ter.n} ETF actions monde${fr ? " éligibles au PEA" : ""} suivis par le site ; 0 pour des actions en direct. ` : ""}Frais de change : seulement pour un titre coté dans une autre devise. Hausse des prix : 2 % est l'objectif de la Banque centrale européenne.</p>
        </div></details></div></section>
    <div id="s4res"></div></div>`;
  const val = id => { const e = document.getElementById(id); return e ? parseFloat(String(e.value).replace(",", ".")) || 0 : 0; };
  const marque = (id, v_) => $$(`#${id} [data-v]`).forEach(b => b.classList.toggle("on", b.dataset.v === String(v_)));
  const run = () => {
    S.ini = Math.max(0, val("s4i")); S.men = Math.max(0, val("s4m")); S.ans = Math.max(1, Math.min(40, Math.round(val("s4a")) || 1)); S.bk = $("#s4bk").value; S.ter = Math.max(0, Math.min(3, val("s4ter")));
    S.plan = $("#s4plan").checked; S.chg = Math.max(0, Math.min(2, val("s4chg"))); S.vente = $("#s4vente").checked; S.reel = $("#s4reel").checked; S.infl = Math.max(0, Math.min(10, val("s4infl")));
    S.rp = val("s4rp"); S.rc = val("s4rc"); S.rf = val("s4rf"); S.perso = { fixe: val("s4pfx"), pct: val("s4ppc") };
    marque("s4env", S.env); marque("s4hyp", S.hyp); marque("s4ord", S.ord);
    const b = brokerBy(S.bk); $("#s4perso").hidden = !b.custom; $("#s4rates").hidden = S.hyp !== "perso";
    $("#s4planf").hidden = b.plan == null; $("#s4planh").textContent = b.plan != null ? `${b.name} : ${b.plan ? eur(b.plan) : "gratuit"} par versement programmé` : "";
    const u = new URLSearchParams({ ini: S.ini, men: S.men, ans: S.ans, env: S.env, bk: S.bk, ter: S.ter, ord: S.ord, chg: S.chg, infl: S.infl }); if (!S.plan) u.set("plan", "0"); if (S.reel) u.set("reel", "1"); if (!S.vente) u.set("vente", "0");
    if (S.hyp === "perso") { u.set("hyp", "perso"); u.set("rp", S.rp); u.set("rc", S.rc); u.set("rf", S.rf); }
    history.replaceState({}, "", location.pathname + "?" + u + location.hash);
    s4Resultat(S, hist, fr);
  };
  const form = $("#s4form");
  form.addEventListener("click", e => { const x = e.target.closest(".s4-seg [data-v]"); if (!x) return; e.preventDefault(); const g = x.parentElement.id;
    if (g === "s4env") S.env = x.dataset.v; else if (g === "s4hyp") S.hyp = x.dataset.v; else if (g === "s4ord") S.ord = +x.dataset.v; run(); });
  let t = null; form.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 150); }); form.addEventListener("change", run);
  const ancre = { frais: "s4courtiers", "pea-cto": "s4fisc" }[tool];
  run();
  if (ancre) setTimeout(() => { const a = document.getElementById(ancre); if (a) a.scrollIntoView({ block: "start" }); }, 80);
}
function s4Resultat(S, hist, fr) {
  const el = $("#s4res"); if (!el) return;
  const b = brokerBy(S.bk), sc = S.hyp === "hist" && hist ? O2C.scenarios(hist, S.ans) : null;
  const taux = sc ? { p: sc.prudent, c: sc.central, f: sc.favorable } : { p: S.rp / 100, c: S.rc / 100, f: S.rf / 100 };
  const R = { p: O2C.simule(O2_simParams(S, b, taux.p)), c: O2C.simule(O2_simParams(S, b, taux.c)), f: O2C.simule(O2_simParams(S, b, taux.f)) };
  const C = R.c, k = x => S.reel ? x / C.defl : x, kA = (x, a) => S.reel ? x / Math.pow(1 + S.infl / 100, a) : x;
  const titre = $("#s4t"), sous = $("#s4s");
  if (!(C.verse > 0)) { titre.textContent = "Combien placer, et pendant combien de temps ?"; sous.textContent = "Indiquez un montant de départ ou un versement mensuel."; el.innerHTML = ""; return; }
  const env = S.env === "pea" ? "PEA" : "compte-titres", reelTxt = S.reel ? " en euros d'aujourd'hui" : "";
  titre.textContent = `Environ ${s4E(k(C.net))} dans ${S.ans} an${S.ans > 1 ? "s" : ""}.`;
  sous.innerHTML = `Pour <b>${s4E(C.verse)}</b> versés sur un ${env}${reelTxt}, après frais et impôt, dans le ${sc ? "scénario central tiré de l'histoire" : "scénario central de vos hypothèses"}. Jamais une promesse : entre ${s4E(k(R.p.net))} et ${s4E(k(R.f.net))} selon le scénario.${fr ? "" : ` L'impôt suit ici les règles françaises : <a class="lnk" href="/simulateurs/pea-cto">le calcul pour votre pays</a>.`}`;
  const lab = { p: "Prudent", c: "Central", f: "Favorable" }, col = { p: O2_C.orange, c: O2_C.ink, f: O2_C.bleu };
  const expl = sc ? { p: `1 période de ${sc.N} ans sur 10 a fait moins bien`, c: `la moitié des périodes de ${sc.N} ans a fait mieux`, f: `1 période de ${sc.N} ans sur 10 a fait mieux` } : { p: "votre hypothèse basse", c: "votre hypothèse centrale", f: "votre hypothèse haute" };
  const pertes = sc ? (sc.negatives ? `Sur l'historique utilisé, ${F0.format(sc.negatives)} période${sc.negatives > 1 ? "s" : ""} de ${sc.N} ans sur ${F0.format(sc.nb)} ${sc.negatives > 1 ? "ont" : "a"} fini en perte.` : `Sur l'historique utilisé, aucune des ${F0.format(sc.nb)} périodes de ${sc.N} ans n'a fini en perte.`) + " L'avenir peut faire pire que le scénario prudent." : "Vos propres hypothèses de rendement : le site ne les vérifie pas.";
  // Où part l'argent
  const fonds = Math.max(0, C.coutFrais - C.courtage - C.change), gainsNets = Math.max(0, C.net - C.verse);
  const parts = [["Vos versements", C.verse, "#A39C8E"], ["Gains qui vous restent", gainsNets, "#1E8A52"], ["Frais du fonds", fonds, "#D94F2B"], ["Courtage", C.courtage, "#F0A23B"], ...(C.change > 0 ? [["Frais de change", C.change, "#B0702A"]] : []), ["Impôt", C.impot, "#6B4FBB"]].filter(x => x[1] > 0);
  const tot = parts.reduce((a, x) => a + x[1], 0) || 1;
  // PEA ou compte-titres
  const autre = O2C.simule(O2_simParams(S, b, taux.c, S.env === "pea" ? "cto" : "pea"));
  const fisc = [[S.env === "pea" ? "PEA" : "Compte-titres", C], [S.env === "pea" ? "Compte-titres" : "PEA", autre]].sort((a, z) => (a[0] === "PEA" ? -1 : 1));
  const best = Math.max(...fisc.map(x => x[1].net));
  // Courtiers
  const ordreM = S.men * 12 / S.ord;
  const brk = BROKERS.list.filter(x => !x.custom).map(x => ({ x, r: O2C.simule(O2_simParams(S, x, taux.c)), f: S.plan && x.plan != null && S.ord === 12 ? x.plan : brokerFee(x, ordreM) })).sort((a, z) => z.r.net - a.r.net);
  const top = brk.length ? brk[0].r.net : 0;
  el.innerHTML = `
    <section class="ek-sec"><span class="ek-stk2 b">Trois scénarios</span><h2>${sc ? `Ce qu'aurait donné ${s4Hc("scenario", "le passé")}.` : "Selon vos hypothèses."}</h2>
      <div class="s4-sc">${["p", "c", "f"].map(s => `<div class="s4-scc${s === "c" ? " c" : ""}"><span class="s4-k"><i style="background:${col[s]}"></i>${lab[s]}</span><b>${s4E(k(R[s].net))}</b>
        <span class="s4-g">${O2_p(taux[s] * 100, 1)} par an avant frais</span><small>${esc(expl[s])} · gain net ${s4E(k(R[s].net - R[s].verse))}</small></div>`).join("")}</div>
      <div class="s4-ch" id="s4ch"></div><p class="ek-note">${esc(pertes)} Les gains se cumulent d'année en année : ce sont les ${s4Hc("interets", "intérêts composés")}.</p></section>
    <section class="ek-sec"><span class="ek-stk2 p">Où part l'argent</span><h2>Sur ${s4E(k(C.sansFrais))} possibles, ${s4E(k(C.net))} pour vous.</h2>
      <div class="s4-bar" role="img" aria-label="Répartition du montant final">${parts.map(([l, x, c]) => `<i style="flex:${(x / tot * 1000).toFixed(0)};background:${c}" title="${esc(l)} : ${s4E(k(x))}"></i>`).join("")}</div>
      <div class="s4-parts">${parts.map(([l, x, c], i) => `<div class="s4-pt"><i style="background:${c}"></i><span>${esc(l)}</span><b class="${i > 1 ? "r" : ""}">${i > 1 ? "−" : ""}${s4E(k(x))}</b></div>`).join("")}</div>
      <p class="ek-note">Total des frais : <b>${s4E(k(C.coutFrais))}</b>, soit ${pct(C.coutFrais / Math.max(1, C.sansFrais - C.verse), 0, false)} des gains avant frais (${C.ordres} ordre${C.ordres > 1 ? "s" : ""}). ${s4Hc("ter", "Frais du fonds")} : ${F2.format(S.ter)} % par an, et les gains qu'ils auraient produits. Impôt : ${pct(C.taux, 1, false)} des gains${S.env === "pea" ? (S.ans >= 5 ? ", PEA de plus de 5 ans : prélèvements sociaux seulement" : ", PEA de moins de 5 ans") : fr ? ", prélèvement forfaitaire unique" : ", prélèvement forfaitaire unique français (dans votre pays, l'impôt peut être différent)"}.</p></section>
    ${fr ? `<section class="ek-sec" id="s4fisc"><span class="ek-stk2 b">Le compte</span><h2>${s4Hc("pea", "PEA")} ou compte-titres ?</h2>
      <div class="s4-fi">${fisc.map(([l, r]) => `<div class="s4-fic${r.net === best ? " g" : ""}"><span class="s4-k">${l}${r.net === best ? " · le plus favorable ici" : ""}</span><b>${s4E(k(r.net))}</b><small>impôt ${s4E(k(r.impot))}, soit ${pct(r.taux, 1, false)} des gains</small></div>`).join("")}</div>
      <details class="s4-pl"><summary>Pourquoi cet écart, et ce qu'il faut savoir</summary><ul>
        <li>PEA ouvert depuis plus de 5 ans : seuls les prélèvements sociaux (${pct(RATES.ps, 1, false)}) sont dus sur les gains au retrait. Avant 5 ans : prélèvement forfaitaire unique de ${pct(RATES.pfu, 1, false)}, comme sur un compte-titres.</li>
        <li>Le calcul suppose un ETF qui réinvestit ses dividendes (capitalisant) : sur un compte-titres, rien n'est alors imposé avant la vente. Avec des dividendes versés, le compte-titres serait taxé chaque année et l'écart serait plus grand.</li>
        <li>Le PEA n'accepte que des actions européennes et des fonds éligibles (dont des ETF monde « PEA »), dans la limite de 150 000 € de versements.${C.plafondPEA ? " <b>Vos versements dépassent ce plafond.</b>" : ""}</li></ul>
        <p class="ek-note">Taux ${RATES.year}. Sources : ${O2_src("Service-public.gouv.fr, le PEA", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385")} ; ${O2_src("Meilleurtaux, prélèvements sociaux à 18,6 % (février 2026)", "https://www.meilleurtaux.com/placement/actualites/2026-fevrier/prelevements-sociaux-hausse-18-6.html")}.</p></details></section>` : ""}
    <section class="ek-sec" id="s4courtiers"><span class="ek-stk2 p">Les courtiers</span><h2>Le même plan chez chaque courtier.</h2>
      <p class="s4-lead">Achats de ${s4E(ordreM)}, ${S.ord} fois par an, pendant ${S.ans} ans, ${s4Hc("courtage", "courtage")} compris. L'écart avec le premier est en rouge.</p>
      <div class="s4-bk">${brk.map(({ x, r, f }, j) => `<div class="s4-bkr${x.id === b.id ? " on" : ""}"><span class="s4-n">${j + 1}</span><span class="s4-bn"><b>${esc(x.name)}</b>${x.id === b.id ? `<em>votre choix</em>` : ""}<small>${esc(typeof sansPea === "function" ? sansPea(x.note || "") : x.note || "")}</small></span>
        <span class="s4-bv"><small>par achat</small>${O2_e(f, 2)}</span><span class="s4-bv"><small>courtage total</small>${s4E(k(r.courtage))}</span>
        <span class="s4-bv s4-bt"><small>il vous reste</small>${s4E(k(r.net))}${r.net < top ? `<i>−${s4E(k(top - r.net)).replace("−", "")}</i>` : ""}</span>
        ${fr ? `<span class="s4-pea ${x.pea ? "g" : "r"}">${x.pea ? "PEA ✓" : "Pas de PEA"}</span>` : ""}</div>`).join("")}</div>
      <p class="ek-note">Un frais fixe pèse lourd sur les petits achats : 1 € représente 1 % d'un achat de 100 €, mais 0,1 % d'un achat de 1 000 €. Les frais ne sont pas le seul critère : ${fr ? "disponibilité du PEA, " : ""}place de cotation, service client. Vérifiez la grille sur le site du courtier : elle peut changer.</p></section>
    <section class="ek-sec"><details class="s4-pl"><summary>Hypothèses et limites du calcul</summary><ul>
        <li>Rendement : ${sc ? `performance annuelle de l'indice MSCI World en euros, dividendes réinvestis, de ${Object.keys(hist)[0]} à ${Object.keys(hist).at(-1)} : rendement moyen de chacune des ${sc.nb} périodes de ${sc.N} années consécutives. Prudent = 10e centile, central = médiane, favorable = 90e centile.` : "vos trois hypothèses, appliquées de façon régulière chaque mois."}</li>
        <li>Courtage : grille de ${esc(b.name)} appliquée à chaque ordre${S.plan && b.plan != null && S.ord === 12 ? " (plan programmé pour les versements mensuels, grille normale pour le versement de départ et la revente)" : ""} ; ${S.ord} achat${S.ord > 1 ? "s" : ""} par an${S.vente ? ", plus un ordre de revente à la fin" : ""}.</li>
        <li>Frais courants du fonds : ${F2.format(S.ter)} % par an, prélevés chaque mois sur la valeur. Frais de change : ${F2.format(S.chg)} % par opération.</li>
        <li>Impôt : calculé une seule fois, au retrait total à la fin, sur le gain. Barème progressif, abattements et pertes reportables non pris en compte.</li>
        <li>Les marchés ne montent pas régulièrement : une baisse de 30 % ou plus peut arriver plusieurs fois sur 20 ans, et l'ordre des bonnes et mauvaises années change le résultat quand on verse chaque mois.</li>
        <li>L'historique d'un indice mondial ne dit rien d'une action seule, d'un secteur ou d'un pays. Ni l'écart de suivi de l'ETF, ni l'écart entre prix d'achat et de vente, ni les droits de garde ne sont comptés. Grilles de frais et règles fiscales de ${RATES.year}.</li></ul>
      <p class="ek-note">Rendements historiques : ${typeof commSrcHTML === "function" && sc ? commSrcHTML(["msciEur", "wikiMsci", "bce"]) : "vos hypothèses"} Frais courants : fiches des émetteurs d'ETF relevées par le site.</p></details></section>`;
  const xs = C.ans.map(a => a.a), ser = ["f", "c", "p"].map(s => ({ nom: `${lab[s]} (${O2_p(taux[s] * 100, 1)} par an)`, couleur: col[s], epais: s === "c" ? 2.5 : 2, pts: R[s].ans.map(a => [a.a, kA(a.valeur, a.a)]) }));
  ser.push({ nom: "Total versé", couleur: O2_C.gris, tirets: true, pts: C.ans.map(a => [a.a, a.verse]) });
  const y0 = +TODAY.slice(0, 4);
  O2_courbe($("#s4ch"), { series: ser, zero: true, xTicks: xs.map(a => [a, String(y0 + a)]), yFmt: (x, ax) => ax ? (Math.abs(x) >= 1e6 ? F1.format(x / 1e6) + " M€" : F0.format(x / 1000) + " k€") : O2_e(x), tipX: a => `${y0 + a} (après ${a} an${a > 1 ? "s" : ""})` });
}
window.pageSim = pageSim4;
