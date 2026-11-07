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
    hyp: hist && q.get("hyp") !== "perso" ? "hist" : "perso", rp: n("rp", 2), rc: n("rc", 5), rf: n("rf", 8),
    d0: /^\d{4}-\d{2}$/.test(q.get("d0") || "") ? q.get("d0") : TODAY.slice(0, 7), r: n("r", NaN) }; // 7/11 (Romain) : rendement choisi par l'utilisateur, dates de début et de fin
  const scDe = a => hist ? O2C.scenarios(hist, a) : null, fin = (d, a) => { const [y, m] = d.split("-").map(Number); return `${y + a}-${String(m).padStart(2, "0")}`; };
  if (!isFinite(S.r)) { const s0 = scDe(S.ans); S.r = s0 ? Math.round(s0.central * 1000) / 10 : 5; }
  const champ = (id, l, val, at = "") => `<label class="s4-f"><span>${l}</span><input id="${id}" class="el-in" type="number" inputmode="decimal" value="${val}" ${at}></label>`;
  const seg = (id, L) => `<div class="s4-seg" id="${id}">${L.map(([v_, l]) => `<a href="#" role="button" data-v="${v_}">${l}</a>`).join("")}</div>`;
  app.innerHTML = `<div class="ek ek-page s4">
    <section class="ek-hero"><span class="mc-stk">Simulateur d'épargne</span><h1 class="ag4-t" id="s4t">…</h1><p class="mc-sub" id="s4s"></p>
      <div class="s4-form" id="s4form">
        ${champ("s4i", "Je place au départ", S.ini, 'min="0" step="100"')}${champ("s4m", "Puis chaque mois", S.men, 'min="0" step="10"')}<label class="s4-f"><span>À partir de</span><input id="s4d0" class="el-in" type="month" value="${S.d0}"></label><label class="s4-f"><span>Jusqu'à</span><input id="s4d1" class="el-in" type="month" value="${fin(S.d0, S.ans)}"></label>
        ${fr ? `<div class="s4-f"><span>Compte</span>${seg("s4env", [["pea", "PEA"], ["cto", "Compte-titres"]])}</div>` : ""}
        <label class="s4-f"><span>Courtier</span><select id="s4bk">${brokerOptions(S.bk)}</select></label>
        <div class="s4-rend"><div class="s4-rt"><span>Rendement estimé par an, avant frais</span><b id="s4rv"></b></div><input type="range" id="s4r" min="-5" max="15" step="0.1" value="${S.r}" aria-label="Rendement estimé par an">
          <div class="s4-pre" id="s4pre"></div><p class="s4-warn" id="s4warn" hidden></p></div>
        <div class="s4-perso" id="s4perso" hidden>${champ("s4pfx", "Frais fixes par ordre (€)", 0, 'min="0" step="0.5"')}${champ("s4ppc", "Pourcentage par ordre (%)", 0, 'min="0" step="0.05"')}</div>
        <details class="s4-det" id="s4det"><summary>Réglages avancés : achats par an, change, inflation</summary><div class="s4-dg">
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
    S.ini = Math.max(0, val("s4i")); S.men = Math.max(0, val("s4m")); S.d0 = /^\d{4}-\d{2}$/.test($("#s4d0").value) ? $("#s4d0").value : S.d0; { const d1 = $("#s4d1").value, [y0, m0] = S.d0.split("-").map(Number), [y1, m1] = /^\d{4}-\d{2}$/.test(d1) ? d1.split("-").map(Number) : [y0 + S.ans, m0]; S.ans = Math.max(1, Math.min(40, Math.round(((y1 - y0) * 12 + (m1 - m0)) / 12))); }
    S.r = Math.max(-5, Math.min(15, parseFloat($("#s4r").value) || 0)); S.bk = $("#s4bk").value; S.ter = Math.max(0, Math.min(3, val("s4ter")));
    S.plan = $("#s4plan").checked; S.chg = Math.max(0, Math.min(2, val("s4chg"))); S.vente = $("#s4vente").checked; S.reel = $("#s4reel").checked; S.infl = Math.max(0, Math.min(10, val("s4infl")));
    S.perso = { fixe: val("s4pfx"), pct: val("s4ppc") };
    marque("s4env", S.env); marque("s4ord", S.ord);
    const sc0 = scDe(S.ans), pre = sc0 ? [["Prudent", sc0.prudent], ["Central", sc0.central], ["Favorable", sc0.favorable]].map(([l, x]) => [l, Math.round(x * 1000) / 10]) : [];
    $("#s4rv").textContent = O2_p(S.r, 1);
    $("#s4pre").innerHTML = pre.map(([l, x]) => `<button type="button" data-r="${x}" class="${Math.abs(S.r - x) < 0.05 ? "act" : ""}">${l} ${O2_p(x, 1)}</button>`).join("") + (sc0 ? `<small>Repères : périodes de ${sc0.N} ans passées du MSCI World (1 fois sur 10 moins bien, la moitié, 1 fois sur 10 mieux)</small>` : "");
    const w = $("#s4warn"), fav = pre.length ? pre[2][1] : 9; w.hidden = S.r <= Math.max(10, fav); w.textContent = `Plus de ${O2_p(fav, 1)} par an : c'est au-dessus du repère favorable, que seule 1 période passée de ${S.ans} ans sur 10 a atteint ou dépassé. Le résultat devient très optimiste.`;
    const b = brokerBy(S.bk); $("#s4perso").hidden = !b.custom; 
    $("#s4planf").hidden = b.plan == null; $("#s4planh").textContent = b.plan != null ? `${b.name} : ${b.plan ? eur(b.plan) : "gratuit"} par versement programmé` : "";
    const u = new URLSearchParams({ ini: S.ini, men: S.men, ans: S.ans, d0: S.d0, r: S.r, env: S.env, bk: S.bk, ter: S.ter, ord: S.ord, chg: S.chg, infl: S.infl }); if (!S.plan) u.set("plan", "0"); if (S.reel) u.set("reel", "1"); if (!S.vente) u.set("vente", "0");
    history.replaceState({}, "", location.pathname + "?" + u + location.hash);
    s4Resultat(S, hist, fr);
  };
  const form = $("#s4form");
  form.addEventListener("click", e => { const x = e.target.closest(".s4-seg [data-v]"); if (!x) return; e.preventDefault(); const g = x.parentElement.id;
    if (g === "s4env") S.env = x.dataset.v; else if (g === "s4ord") S.ord = +x.dataset.v; run(); });
  form.addEventListener("click", e => { const x = e.target.closest("#s4pre [data-r]"); if (!x) return; e.preventDefault(); $("#s4r").value = x.dataset.r; run(); });
  let t = null; form.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 150); }); form.addEventListener("change", run);
  const ancre = { frais: "s4courtiers", "pea-cto": "s4fisc" }[tool];
  run();
  if (ancre) setTimeout(() => { const a = document.getElementById(ancre); if (a) a.scrollIntoView({ block: "start" }); }, 80);
}
function s4Resultat(S, hist, fr) { // 7/11 (Romain, maquette simulateur-v6) : un seul rendement, choisi ; trois blocs ; détail au clic
  const el = $("#s4res"); if (!el) return;
  const b = brokerBy(S.bk), r = S.r / 100, sc = hist ? O2C.scenarios(hist, S.ans) : null;
  const C = O2C.simule(O2_simParams(S, b, r)), k = x => S.reel ? x / C.defl : x, kA = (x, a) => S.reel ? x / Math.pow(1 + S.infl / 100, a) : x;
  const titre = $("#s4t"), sous = $("#s4s");
  if (!(C.verse > 0)) { titre.textContent = "Combien placer, et pendant combien de temps ?"; sous.textContent = "Indiquez un montant de départ ou un versement mensuel."; el.innerHTML = ""; return; }
  const [y0, m0] = S.d0.split("-").map(Number), finTxt = new Date(Date.UTC(y0 + S.ans, m0 - 1, 15)).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const env = S.env === "pea" ? "PEA" : "compte-titres", reelTxt = S.reel ? " en euros d'aujourd'hui" : "";
  titre.textContent = `Environ ${s4E(k(C.net))} en ${finTxt}.`;
  sous.innerHTML = `Pour <b>${s4E(C.verse)}</b> versés sur un ${env} en ${S.ans} an${S.ans > 1 ? "s" : ""}, avec ${O2_p(S.r, 1)} par an avant frais, après frais et impôt${reelTxt}. Une estimation, jamais une promesse : la Bourse ne monte pas du même pourcentage chaque année.`;
  // Où part l'argent
  const fonds = Math.max(0, C.coutFrais - C.courtage - C.change), gainsNets = Math.max(0, C.net - C.verse);
  const parts = [["Vos versements", C.verse, "#FFE14D"], ["Gains qui vous restent", gainsNets, "#00A06B"], ["Frais du fonds", fonds, "#7A5AF8"], ["Courtage", C.courtage, "#0E7490"], ...(C.change > 0 ? [["Frais de change", C.change, "#B0702A"]] : []), ["Impôt", C.impot, "#D92D12"]].filter(x => x[1] > 0.5);
  const tot = parts.reduce((a, x) => a + x[1], 0) || 1;
  // PEA ou compte-titres
  const autre = O2C.simule(O2_simParams(S, b, r, S.env === "pea" ? "cto" : "pea"));
  const fisc = [[S.env === "pea" ? "PEA" : "Compte-titres", C], [S.env === "pea" ? "Compte-titres" : "PEA", autre]].sort((a, z) => (a[0] === "PEA" ? -1 : 1));
  const best = Math.max(...fisc.map(x => x[1].net));
  // Courtiers : les trois premiers, les autres au clic
  const ordreM = S.men * 12 / S.ord;
  const brk = BROKERS.list.filter(x => !x.custom).map(x => ({ x, r: O2C.simule(O2_simParams(S, x, r)), f: S.plan && x.plan != null && S.ord === 12 ? x.plan : brokerFee(x, ordreM) })).sort((a, z) => z.r.net - a.r.net);
  const top = brk.length ? brk[0].r.net : 0, mxE = Math.max(1, ...brk.map(z => top - z.r.net));
  const ligneBk = ({ x, r: rr, f }, j) => `<div class="s5-bkr${x.id === b.id ? " moi" : ""}${j >= 3 ? " plus" : ""}"${j >= 3 ? " hidden" : ""}><span class="s5-n">${j + 1}</span><span class="s5-bn"><b>${esc(x.name)}</b>${x.id === b.id ? `<em>votre choix</em>` : ""}<small>${O2_e(f, 2)} par achat${fr ? ` · ${x.pea ? "PEA ✓" : "pas de PEA"}` : ""}</small></span>
      <span class="s5-bb"><i style="width:${((top - rr.net) / mxE * 100).toFixed(0)}%"></i></span><span class="s5-bv">courtage ${s4E(k(rr.courtage))}</span><span class="s5-bd">${rr.net < top ? "−" + s4E(k(top - rr.net)).replace("−", "") : "le moins cher"}</span></div>`;
  el.innerHTML = `
    <div class="s5-res"><div class="s5-box"><p class="s5-lab">Où part l'argent</p><b class="s5-h">Sur ${s4E(k(C.sansFrais))} possibles, ${s4E(k(C.net))} pour vous.</b>
        <div class="s4-bar" role="img" aria-label="Répartition du montant final">${parts.map(([l, x, c]) => `<i style="flex:${(x / tot * 1000).toFixed(0)};background:${c}" title="${esc(l)} : ${s4E(k(x))}"></i>`).join("")}</div>
        <div class="s4-parts">${parts.map(([l, x, c], i) => `<div class="s4-pt"><i style="background:${c}"></i><span>${esc(l)}</span><b class="${i > 1 ? "r" : ""}">${i > 1 ? "−" : ""}${s4E(k(x))}</b></div>`).join("")}</div></div>
      ${fr ? `<div class="s5-box" id="s4fisc"><p class="s5-lab">${s4Hc("pea", "PEA")} ou compte-titres ?</p><div class="s5-fi">${fisc.map(([l, rr]) => `<div class="s5-fic${rr.net === best ? " g" : ""}">${rr.net === best ? `<span class="s5-vd">Le plus favorable ici</span>` : ""}<b>${l} · ${s4E(k(rr.net))}</b><small>impôt ${s4E(k(rr.impot))}, soit ${pct(rr.taux, 1, false)} des gains${l === "PEA" && S.ans < 5 ? " (PEA de moins de 5 ans)" : ""}</small></div>`).join("")}</div>
        <p class="ek-note">PEA de plus de 5 ans : seuls les prélèvements sociaux (${pct(RATES.ps, 1, false)}) sur les gains ; avant 5 ans et sur un compte-titres : ${pct(RATES.pfu, 1, false)}. Taux ${RATES.year}, ${O2_src("Service-public.gouv.fr", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385")}.${C.plafondPEA ? " <b>Vos versements dépassent le plafond de 150 000 € du PEA.</b>" : ""}</p></div>` : ""}</div>
    <section class="ek-sec" id="s4courtiers"><h2>Les frais, courtier par courtier.</h2>
      <p class="s4-lead">Achats de ${s4E(ordreM)}, ${S.ord} fois par an, pendant ${S.ans} ans, ${s4Hc("courtage", "courtage")} compris. En rouge : ce que vous auriez en moins à la fin par rapport au moins cher.</p>
      <div class="s5-bk" id="s5bk">${brk.map(ligneBk).join("")}${brk.length > 3 ? `<button type="button" class="s5-more" id="s5more">Voir les ${brk.length - 3} autres courtiers</button>` : ""}</div>
      <p class="ek-note">Un frais fixe pèse lourd sur les petits achats : 1 € représente 1 % d'un achat de 100 €, mais 0,1 % d'un achat de 1 000 €. Vérifiez la grille sur le site du courtier : elle peut changer.</p></section>
    <section class="ek-sec"><details class="s4-pl" id="s5det"><summary>Détail du calcul : la courbe année par année et les hypothèses</summary>
      <div class="s4-ch" id="s4ch"></div>
      <ul><li>Rendement : ${O2_p(S.r, 1)} par an, appliqué de façon régulière chaque mois.${sc ? ` Repères tirés de la performance annuelle de l'indice MSCI World en euros, dividendes réinvestis, de ${Object.keys(hist)[0]} à ${Object.keys(hist).at(-1)} : sur les ${sc.nb} périodes de ${sc.N} années consécutives, 10e centile ${O2_p(sc.prudent * 100, 1)}, médiane ${O2_p(sc.central * 100, 1)}, 90e centile ${O2_p(sc.favorable * 100, 1)}${sc.negatives ? ` ; ${sc.negatives} période${sc.negatives > 1 ? "s ont" : " a"} fini en perte` : " ; aucune n'a fini en perte"}.` : ""}</li>
        <li>Courtage : grille de ${esc(b.name)} appliquée à chaque ordre${S.plan && b.plan != null && S.ord === 12 ? " (plan programmé pour les versements mensuels)" : ""} ; ${S.ord} achat${S.ord > 1 ? "s" : ""} par an${S.vente ? ", plus un ordre de revente à la fin" : ""}. Frais du fonds : ${F2.format(S.ter)} % par an. Total des frais : ${s4E(k(C.coutFrais))} (${C.ordres} ordres).</li>
        <li>Impôt : calculé une seule fois, au retrait total à la fin, sur le gain. Barème progressif, abattements et pertes reportables non pris en compte.</li>
        <li>Les marchés ne montent pas régulièrement : une baisse de 30 % ou plus peut arriver plusieurs fois sur 20 ans. L'historique d'un indice mondial ne dit rien d'une action seule, d'un secteur ou d'un pays. Durée arrondie à l'année entière.</li></ul>
      <p class="ek-note">Rendements historiques : ${typeof commSrcHTML === "function" && sc ? commSrcHTML(["msciEur", "wikiMsci", "bce"]) : "vos hypothèses"} Frais courants : fiches des émetteurs d'ETF relevées par le site.</p></details></section>`;
  const mo = $("#s5more"); if (mo) mo.onclick = () => { $$("#s5bk .plus").forEach(x => x.hidden = false); mo.remove(); };
  const dessiner = () => { const xs = C.ans.map(a => a.a);
    O2_courbe($("#s4ch"), { series: [{ nom: `Votre épargne (${O2_p(S.r, 1)} par an)`, couleur: O2_C.ink, epais: 2.5, pts: C.ans.map(a => [a.a, kA(a.valeur, a.a)]) }, { nom: "Total versé", couleur: O2_C.gris, tirets: true, pts: C.ans.map(a => [a.a, a.verse]) }], zero: true,
      xTicks: xs.map(a => [a, String(y0 + a)]), yFmt: (x, ax) => ax ? (Math.abs(x) >= 1e6 ? F1.format(x / 1e6) + " M€" : F0.format(x / 1000) + " k€") : O2_e(x), tipX: a => `${y0 + a} (après ${a} an${a > 1 ? "s" : ""})` }); };
  const det = $("#s5det"); if (det) det.addEventListener("toggle", () => { if (det.open) dessiner(); });
}
window.pageSim = pageSim4;
