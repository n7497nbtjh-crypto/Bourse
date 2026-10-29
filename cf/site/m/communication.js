/* Module « communication » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Contenu :
   - /idees-recues : les idées reçues sur la Bourse, déconstruites avec des chiffres sourcés et leurs nuances ;
   - /livret-a-ou-bourse : comparateur historique « 100 € par mois » Livret A, actions monde et inflation ;
   - /pourquoi-bilan : ce que bilan. fait que les autres ne font pas, avec démonstrations et tableau comparatif ;
   - fonctions de rendu réutilisables par l'accueil : commComparaisonHTML(), commIdeesHTML(), commPourquoiHTML(). */

/* ====================================================================================
   1. Données historiques (toutes sourcées, voir COMM_SRC)
   ==================================================================================== */
// Livret A : taux moyen de chaque année civile, en %. 1996-2014 et 2015-2025 : historique publié par Toutsurmesfinances
// (taux moyens d'après la Banque de France). 2006-2025 recalculés par bilan. à partir des dates officielles de changement de taux.
const COMM_LA = { 1996: 3.70, 1997: 3.50, 1998: 3.20, 1999: 2.70, 2000: 2.60, 2001: 3.00, 2002: 3.00, 2003: 2.70, 2004: 2.25, 2005: 2.15,
  2006: 2.45, 2007: 2.85, 2008: 3.70, 2009: 1.90, 2010: 1.45, 2011: 2.10, 2012: 2.25, 2013: 1.60, 2014: 1.15, 2015: 0.90,
  2016: 0.75, 2017: 0.75, 2018: 0.75, 2019: 0.75, 2020: 0.52, 2021: 0.50, 2022: 1.38, 2023: 2.92, 2024: 3.00, 2025: 2.16 };
// Insee, indice des prix à la consommation, ensemble des ménages, France, base 2015 (série 001759970), valeur de décembre.
const COMM_IPC = { 1995: 75.88, 1996: 77.14, 1997: 78.02, 1998: 78.19, 1999: 79.17, 2000: 80.47, 2001: 81.56, 2002: 83.41, 2003: 85.23, 2004: 87.00,
  2005: 88.39, 2006: 89.71, 2007: 92.03, 2008: 92.95, 2009: 93.80, 2010: 95.45, 2011: 97.80, 2012: 99.10, 2013: 99.80, 2014: 99.86, 2015: 100.04,
  2016: 100.65, 2017: 101.85, 2018: 103.47, 2019: 104.98, 2020: 104.96, 2021: 107.85, 2022: 114.16, 2023: 118.39, 2024: 119.95, 2025: 120.90 };
// Actions monde : MSCI World en euros, performance de l'année civile en %, dividendes réinvestis.
// 2012-2025 : chiffres officiels MSCI (dividendes nets, fiche EUR). 1996-2011 : performance MSCI en dollars (dividendes bruts)
// convertie en euros par bilan. au taux de fin d'année (BCE depuis 1999 ; avant, moyenne de décembre du mark, Réserve fédérale, au taux fixe de 1,95583 DEM pour 1 €).
const COMM_MW = { 1996: 22.86, 1997: 33.17, 1998: 17.15, 1999: 46.14, 2000: -5.99, 2001: -11.86, 2002: -32.38, 2003: 11.06, 2004: 6.86, 2005: 27.03,
  2006: 8.07, 2007: -1.97, 2008: -36.88, 2009: 26.35, 2010: 21.12, 2011: -1.91,
  2012: 14.05, 2013: 21.20, 2014: 19.50, 2015: 10.42, 2016: 10.73, 2017: 7.51, 2018: -4.11, 2019: 30.02, 2020: 6.33, 2021: 31.07, 2022: -12.78, 2023: 19.60, 2024: 26.60, 2025: 6.77 };
const COMM_MW_OFF = 2012, COMM_FIN = 2025, COMM_DEB = 1996;
// MSCI World en dollars, dividendes bruts réinvestis, 1970-2025 (fiches MSCI ; 1970-2011 repris par Wikipédia).
const COMM_MWUSD = [-1.98, 19.56, 23.55, -14.51, -24.48, 34.50, 14.71, 5.00, 18.22, 12.67, 27.72, -3.30, 11.27, 23.28, 5.77, 41.77, 42.80, 16.76, 23.95, 17.19,
  -16.52, 18.97, -4.66, 23.13, 5.58, 21.32, 14.00, 16.23, 24.80, 25.34, -12.92, -16.52, -19.54, 33.76, 15.25, 10.02, 20.65, 9.57, -40.33, 30.79,
  12.34, -5.02, 16.54, 27.37, 5.50, -0.32, 8.15, 23.07, -8.20, 28.40, 16.50, 22.35, -17.73, 24.42, 19.19, 21.60];

const COMM_SRC = {
  msciEur: ["MSCI, fiche de l'indice MSCI World (EUR), 30 septembre 2026", "https://www.msci.com/documents/10199/890dd84d-3750-4656-87f2-1229ed5a5d6e"],
  msciUsd: ["MSCI, fiche de l'indice MSCI World (USD), 30 septembre 2026", "https://www.msci.com/documents/10199/178e6643-6ae6-47b9-82be-e1fc565ededb"],
  wikiMsci: ["Wikipédia, MSCI World : rendements annuels 1970-2025 (repris des fiches MSCI)", "https://en.wikipedia.org/wiki/MSCI_World"],
  ipc: ["Insee, indice des prix à la consommation, série 001759970", "https://www.insee.fr/fr/statistiques/serie/001759970"],
  ipcSept: ["Insee, Informations rapides n° 247 : +3,1 % sur un an en septembre 2026 (15 octobre 2026)", "https://www.insee.fr/fr/statistiques/9080209"],
  livret: ["Service-public.gouv.fr, Livret A", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2365"],
  livretAout: ["Meilleurtaux, les taux officiels des livrets au 1er août 2026", "https://placement.meilleurtaux.com/livret-epargne/actualites/2026-juillet/livrets-les-taux-officiels-au-1er-aout-2026.html"],
  livretHist: ["Toutsurmesfinances, taux moyen annuel du Livret A depuis 1970 (données Banque de France)", "https://www.toutsurmesfinances.com/placements/livret-a-et-livret-bleu-historique-du-taux-moyen-annuel-depuis-1970.html"],
  bce: ["Banque centrale européenne, taux de référence dollar pour un euro, fin de mois", "https://data.ecb.europa.eu/data/datasets/EXR/EXR.M.USD.EUR.SP00.E"],
  fredDem: ["Réserve fédérale de Saint-Louis (FRED), mark allemand pour un dollar, série EXGEUS", "https://fred.stlouisfed.org/series/EXGEUS"],
  spiva: ["S&P Dow Jones Indices, SPIVA Europe, fin 2025", "https://www.spglobal.com/spdji/en/documents/spiva/spiva-europe-year-end-2025.pdf"],
  amfObs: ["AMF, Lettre de l'Observatoire de l'épargne n° 65, avril 2026", "https://www.amf-france.org/sites/institutionnel/files/private/2026-04/loe-65_1.pdf"],
  amfFrais: ["AMF, les frais des placements financiers continuent de baisser (avril 2026)", "https://www.amf-france.org/sites/institutionnel/files/pdf/78695/fr/Les_frais_des_placements_financiers_continuent_de_baisser%2C_en_particulier_ceux_des_fonds_d%27investissement.pdf"],
  peaFrais: ["La finance pour tous, plafonnement des frais du PEA (2020)", "https://www.lafinancepourtous.com/2020/02/19/pea-les-frais-de-transaction-de-gestion-et-de-transfert-plafonnes/"],
  motley: ["The Motley Fool via Webull, manquer les 10 meilleures séances du S&P 500 (octobre 2026)", "https://www.webull.com/news/15762946850827264"],
  vanguard: ["BenefitsPro, résumé de l'étude Vanguard (2012) sur l'investissement en une fois", "https://benefitspro.com/2012/10/31/lump-sum-investing-vs-dollar-cost-averaging"],
  barber: ["Barber et Odean (2000), Trading Is Hazardous to Your Wealth, Journal of Finance", "https://faculty.haas.berkeley.edu/odean/Papers%20current%20versions/Individual_Investor_Performance_Final.pdf"],
  barber2: ["Barber, Lee, Liu et Odean (2014), The cross-section of speculator skill", "https://ideas.repec.org/a/eee/finmar/v18y2014icp1-24.html"],
  fed87: ["Federal Reserve History, Stock Market Crash of 1987", "https://www.federalreservehistory.org/essays/stock-market-crash-of-1987"],
  yardeni: ["Yardeni Research, S&P 500 bull and bear market tables", "https://archive.yardeni.com/pub/sp500corrbeartables.pdf"],
  educfi: ["La finance pour tous, plan EDUCFI 2026-2028 (6 mai 2026)", "https://www.lafinancepourtous.com/2026/05/06/education-financiere-un-plan-strategique-ambitieux-pour-2026-2028/"],
  amfListes: ["AMF, listes noires et mises en garde", "https://www.amf-france.org/fr/espace-epargnants/proteger-son-epargne/listes-noires-et-mises-en-garde"],
  esma: ["AMF et ESMA, conseils aux finfluenceurs pour une promotion responsable (janvier 2026)", "https://www.amf-france.org/fr/actualites-publications/actualites/lesma-et-lamf-publient-lattention-des-finfluenceurs-des-conseils-pour-une-promotion-responsable-sur"],
  pea: ["Service-public.gouv.fr, Plan d'épargne en actions (PEA)", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385"],
  ps: ["Meilleurtaux, les prélèvements sociaux du PEA passent à 18,6 % (février 2026)", "https://placement.meilleurtaux.com/bourse/actualites/2026-fevrier/taux-prelevements-sociaux-applique-pea-passe-desormais-18-6.html"],
  esmaCfd: ["ESMA, restrictions sur les CFD et interdiction des options binaires (mars 2018)", "https://www.esma.europa.eu/node/84933"],
  esef: ["Rapports annuels au format ESEF (filings.xbrl.org) et dépôts SEC (EDGAR)", "/methode"],
  bdfPrec: ["INC et Banque de France, l'épargne de précaution", "https://www.inc-conso.fr/content/lepargne-de-precaution-indispensable-pour-les-imprevus-avec-la-banque-de-france"],
};

/* ====================================================================================
   2. Petits outils de mise en forme
   ==================================================================================== */
const commE = v => (v < 0 ? "−" : "") + F0.format(Math.abs(Math.round(v))) + " €";
const commP = (v, d = 1, s = false) => { const r = +v.toFixed(d); return (s && r > 0 ? "+" : r < 0 ? "−" : "") + nf(d).format(Math.abs(r)) + " %"; };
const commSrcHTML = keys => `<ul class="cm-srcs">${keys.map(k => COMM_SRC[k]).filter(Boolean).map(([l, u]) => `<li><a class="lnk" href="${esc(u)}"${u.startsWith("/") ? "" : ` target="_blank" rel="noopener"`}>${esc(l)}</a></li>`).join("")}</ul>`;
// Barres horizontales simples : rows = [[libellé, valeur, texte affiché, couleur]]
function commBars(rows, max, note = "") {
  const m = max || Math.max(...rows.map(r => Math.abs(r[1])));
  return `<div class="cm-bars">${rows.map(([l, v, t, c]) => `<div class="cm-bar"><span class="cm-bl">${l}</span><span class="cm-bt"><i style="width:${Math.max(1.5, Math.abs(v) / m * 100).toFixed(1)}%;background:${c || "var(--ink)"}"></i></span><b class="cm-bv">${t}</b></div>`).join("")}</div>${note ? `<p class="cm-vnote">${note}</p>` : ""}`;
}
const COMM_C = { act: "#0E6B4A", la: "#2B5C9E", inf: "#D94F2B", ver: "#A39C8E" };

/* ====================================================================================
   3. Comparateur « 100 € par mois » : Livret A, actions monde, inflation
   ==================================================================================== */
function commSimule(debut, fin, m) {
  const pts = [{ y: debut - 1, ver: 0, la: 0, act: 0, inf: 0 }];
  let la = 0, act = 0, inf = 0, ver = 0;
  for (let y = debut; y <= fin; y++) {
    const rl = Math.pow(1 + COMM_LA[y] / 100, 1 / 12) - 1, ra = Math.pow(1 + COMM_MW[y] / 100, 1 / 12) - 1, ri = Math.pow(COMM_IPC[y] / COMM_IPC[y - 1], 1 / 12) - 1;
    for (let k = 0; k < 12; k++) { ver += m; la = (la + m) * (1 + rl); act = (act + m) * (1 + ra); inf = (inf + m) * (1 + ri); }
    pts.push({ y, ver, la, act, inf });
  }
  // la pire année traversée par l'indice pendant la période, et l'effet sur le capital
  let pire = null;
  for (let i = 1; i < pts.length; i++) { const y = pts[i].y; if (!pire || COMM_MW[y] < COMM_MW[pire.y]) pire = { y, avant: pts[i - 1].act, apres: pts[i].act }; }
  const prix = COMM_IPC[fin] / COMM_IPC[debut - 1] - 1;
  return { pts, fin: pts[pts.length - 1], pire, prix, ans: fin - debut + 1 };
}
const commNice = max => { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
function commChartHTML(r) {
  const P = r.pts, n = P.length - 1, max = Math.max(...P.map(p => Math.max(p.act, p.la, p.inf, p.ver))) * 1.06, st = commNice(max), top = Math.ceil(max / st) * st;
  const X = i => (i / n * 1000).toFixed(1), Y = v => (300 - v / top * 300).toFixed(1);
  const line = (k, c, dash) => `<polyline points="${P.map((p, i) => X(i) + "," + Y(p[k])).join(" ")}" fill="none" stroke="${c}" stroke-width="${k === "act" ? 3 : 2.25}" ${dash ? `stroke-dasharray="7 6"` : ""} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
  const grid = []; for (let v = 0; v <= top + 1e-6; v += st) grid.push(v);
  const step = n > 15 ? 5 : 2;
  const xs = P.map((p, i) => (i % step === 0 && n - i > step / 2) || i === n ? `<span style="left:${(i / n * 100).toFixed(2)}%">${p.y}</span>` : "").join("");
  return `<div class="cm-chart" data-n="${n}" role="img" aria-label="Évolution du capital, de fin ${P[0].y} à fin ${P[n].y}">
    <div class="cm-plot">
      ${grid.map(v => `<i class="cm-grid" data-v="${v}" style="top:${(100 - v / top * 100).toFixed(2)}%"><em>${v >= 1000 ? F0.format(v / 1000) + " k€" : F0.format(v) + " €"}</em></i>`).join("")}
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">${line("ver", COMM_C.ver)}${line("inf", COMM_C.inf, true)}${line("la", COMM_C.la)}${line("act", COMM_C.act)}</svg>
      <i class="cm-vl" hidden></i><div class="cm-tip" hidden></div>
    </div>
    <div class="cm-xs">${xs}</div>
  </div>`;
}
function commTipHTML(p) {
  return `<b>Fin ${p.y}</b><span><i style="background:${COMM_C.act}"></i>Actions monde <em>${commE(p.act)}</em></span><span><i style="background:${COMM_C.la}"></i>Livret A <em>${commE(p.la)}</em></span><span><i class="d" style="background:${COMM_C.inf}"></i>Seuil inflation <em>${commE(p.inf)}</em></span><span><i style="background:${COMM_C.ver}"></i>Versé <em>${commE(p.ver)}</em></span>`;
}
// Rendu réutilisable (accueil, idées reçues, page dédiée). opts : { ans: 10|20|30, mois: 100, debut: année, compact: bool }
function commComparaisonHTML(opts = {}) {
  const m = [25, 50, 100, 200, 500].includes(+opts.mois) ? +opts.mois : 100;
  let debut = +opts.debut || (COMM_FIN - (+opts.ans || 20) + 1);
  debut = Math.min(COMM_FIN - 4, Math.max(COMM_DEB, debut));
  const r = commSimule(debut, COMM_FIN, m), f = r.fin, ans = r.ans, compact = !!opts.compact;
  const gA = f.act - f.inf, gL = f.la - f.inf;
  const card = (k, t, v, sub, cls = "") => `<div class="cm-k ${cls}" data-k="${k}"><small><i style="background:${COMM_C[k]}"${k === "inf" ? ` class="d"` : ""}></i>${t}</small><b>${commE(v)}</b><span>${sub}</span></div>`;
  const reel = g => g >= 0 ? `<em class="up">+${commE(g)}</em> au-dessus du seuil inflation` : `<em class="down">${commE(g)}</em> sous le seuil inflation : pouvoir d'achat perdu`;
  const pr = r.pire, perte = pr ? pr.avant + 12 * m - pr.apres : 0, pireTxt = pr && COMM_MW[pr.y] < 0 ? `Pire année traversée : <b>${pr.y}</b>, ${commP(COMM_MW[pr.y], 1, true)} pour l'indice. Fin ${pr.y - 1}, le capital en actions valait ${commE(pr.avant)}. Malgré ${commE(12 * m)} versés pendant l'année, il ne valait plus que ${commE(pr.apres)} fin ${pr.y} : la baisse a effacé environ <b>${commE(perte)}</b>.` : `Aucune année de baisse de l'indice sur cette période : c'est l'exception, pas la règle.`;
  return `<div class="cm-sim${compact ? " cm-compact" : ""}" data-m="${m}" data-debut="${debut}" data-compact="${compact ? 1 : ""}">
    <div class="cm-ctl">
      <div class="cm-seg" role="group" aria-label="Durée">${[10, 20, 30].map(a => `<button type="button" data-cm-debut="${COMM_FIN - a + 1}" class="${debut === COMM_FIN - a + 1 ? "on" : ""}" aria-pressed="${debut === COMM_FIN - a + 1}">${a} ans</button>`).join("")}</div>
      <div class="cm-seg cm-seg-m" role="group" aria-label="Versement mensuel">${[50, 100, 200, 500].map(a => `<button type="button" data-cm-mois="${a}" class="${m === a ? "on" : ""}" aria-pressed="${m === a}">${a} €</button>`).join("")}<span>par mois</span></div>
    </div>
    <label class="cm-range"><span>Année de départ : <b>${debut}</b></span><input type="range" min="${COMM_DEB}" max="${COMM_FIN - 4}" step="any" value="${debut}" data-cm-range aria-label="Année de départ" aria-valuetext="Départ en ${debut}" style="--p:${((debut - COMM_DEB) / (COMM_FIN - 4 - COMM_DEB) * 100).toFixed(2)}%"><small>${COMM_DEB}</small><small>${COMM_FIN - 4}</small></label>
    <p class="cm-lead">${F0.format(m)} € versés chaque mois de janvier ${debut} à décembre ${COMM_FIN} (${ans} ans), soit <b>${commE(f.ver)}</b> versés. Leur valeur fin ${COMM_FIN} :</p>
    <div class="cm-ks">
      ${card("act", "Actions monde (MSCI World)", f.act, reel(gA), "cm-k-act")}
      ${card("la", "Livret A", f.la, reel(gL))}
      ${card("inf", "Seuil inflation", f.inf, `ce qu'il fallait pour garder le pouvoir d'achat (prix ${commP(r.prix * 100, 0, true)})`)}
    </div>
    ${commChartHTML(r)}
    <div class="cm-leg"><span><i style="background:${COMM_C.act}"></i>Actions monde</span><span><i style="background:${COMM_C.la}"></i>Livret A</span><span><i class="d" style="background:${COMM_C.inf}"></i>Seuil inflation</span><span><i style="background:${COMM_C.ver}"></i>Total versé</span></div>
    <p class="cm-pire">${pireTxt}</p>
    <p class="cm-warn"><b>Historique, pas une promesse.</b> Les performances passées ne préjugent pas des performances futures. Un placement en actions peut perdre plus de la moitié de sa valeur, parfois pendant des années. Calcul avant frais et impôts ; le Livret A n'est pas imposé. Ce n'est pas un conseil.</p>
    ${compact ? `<p class="cm-more"><a class="lnk" href="/livret-a-ou-bourse">Méthode, sources et chiffres année par année</a> · <a class="lnk" href="/idees-recues">Les idées reçues sur la Bourse</a></p>` : `<details class="cm-meth"><summary>Méthode et sources</summary>
      <p>Versement le premier de chaque mois. Le rendement de chaque année est réparti de façon régulière sur ses douze mois : en réalité, les actions montent et baissent en cours d'année. Livret A : taux moyen de chaque année. Seuil inflation : chaque versement revalorisé de la hausse des prix de décembre à décembre (Insee).</p>
      <p>Actions monde : indice MSCI World en euros, dividendes réinvestis. De 2012 à 2025, chiffres officiels de MSCI (dividendes nets d'impôts). De 1996 à 2011, MSCI ne publie pas gratuitement la série en euros : bilan. convertit la performance en dollars (dividendes bruts) au taux de change de fin d'année. Contrôle : de fin 2000 à septembre 2026, cette série donne 6,9 % par an contre 6,67 % pour l'indice officiel net. Elle est donc légèrement optimiste pour les années anciennes. Un ETF réel coûte aussi des frais courants (environ 0,1 % à 0,4 % par an).</p>
      ${commSrcHTML(["msciEur", "msciUsd", "wikiMsci", "bce", "fredDem", "livretHist", "livret", "ipc"])}</details>`}
  </div>`;
}
// Interactions du comparateur (délégation : fonctionne où que le bloc soit inséré).
// Mise à jour sur place, sans reconstruire le bloc : le curseur glisse en continu (l'année retenue est l'entier le plus proche),
// les courbes, l'échelle et les montants passent en douceur de l'ancienne à la nouvelle valeur. Les calculs restent ceux de commSimule.
const COMM_ANIM = { ms: 420, n: 600 };
const commEase = t => 1 - Math.pow(1 - t, 3);
function commEtat(debut, m) { // ce qu'il faut dessiner pour une période : points, échelle, montants finaux
  const r = commSimule(debut, COMM_FIN, m), P = r.pts, max = Math.max(...P.map(p => Math.max(p.act, p.la, p.inf, p.ver))) * 1.06, st = commNice(max);
  return { r, P, st, top: Math.ceil(max / st) * st, f: r.fin };
}
function commEch(P, k, x) { // valeur de la série k à l'abscisse x (0 à 1), interpolation linéaire entre deux fins d'année
  const n = P.length - 1, u = x * n, i = Math.min(n - 1, Math.floor(u)), t = u - i;
  return P[i][k] + (P[i + 1][k] - P[i][k]) * t;
}
function commDessin(box, A, B, t) { // état intermédiaire entre A et B (t de 0 à 1)
  const svg = box.querySelector(".cm-plot svg"); if (!svg) return;
  const top = A.top + (B.top - A.top) * t, N = COMM_ANIM.n, lines = svg.querySelectorAll("polyline"), keys = ["ver", "inf", "la", "act"];
  if (t >= 1) { // état final exact : un point par fin d'année
    const n = B.P.length - 1;
    keys.forEach((k, j) => lines[j] && lines[j].setAttribute("points", B.P.map((p, i) => (i / n * 1000).toFixed(1) + "," + (300 - p[k] / B.top * 300).toFixed(1)).join(" ")));
  } else {
    keys.forEach((k, j) => {
      if (!lines[j]) return; let s = "";
      for (let i = 0; i <= N; i++) { const x = i / N, v = commEch(A.P, k, x) + (commEch(B.P, k, x) - commEch(A.P, k, x)) * t; s += (x * 1000).toFixed(1) + "," + (300 - v / top * 300).toFixed(1) + " "; }
      lines[j].setAttribute("points", s);
    });
  }
  box.querySelectorAll(".cm-grid").forEach(g => { const v = +g.dataset.v, y = 100 - v / top * 100; g.style.top = y.toFixed(2) + "%"; g.style.opacity = y < -0.5 ? 0 : 1; });
  box.querySelectorAll(".cm-k[data-k]").forEach(c => { const k = c.dataset.k, b = c.querySelector("b"); if (b) b.textContent = commE(A.f[k] + (B.f[k] - A.f[k]) * t); });
}
function commGrille(box, B) { // lignes de l'échelle de la nouvelle période (placées ensuite à chaque image)
  const plot = box.querySelector(".cm-plot"); if (!plot) return;
  plot.querySelectorAll(".cm-grid").forEach(g => g.remove());
  const frag = []; for (let v = 0; v <= B.top + 1e-6; v += B.st) frag.push(`<i class="cm-grid" data-v="${v}"><em>${v >= 1000 ? F0.format(v / 1000) + " k€" : F0.format(v) + " €"}</em></i>`);
  plot.insertAdjacentHTML("afterbegin", frag.join(""));
}
function commMaj(box, patch = {}) {
  const m0 = +box.dataset.m, d0 = +box.dataset.debut;
  const m = patch.mois != null ? +patch.mois : m0, debut = Math.min(COMM_FIN - 4, Math.max(COMM_DEB, patch.debut != null ? Math.round(+patch.debut) : d0));
  if (m === m0 && debut === d0) return;
  const tmp = document.createElement("div"); tmp.innerHTML = commComparaisonHTML({ mois: m, debut, compact: !!box.dataset.compact });
  const nb = tmp.firstElementChild;
  box.dataset.m = m; box.dataset.debut = debut;
  // textes : phrase d'introduction, écarts au seuil inflation, pire année, libellé du curseur, graduations des années
  [".cm-lead", ".cm-pire", ".cm-range > span", ".cm-xs"].forEach(sel => { const a = box.querySelector(sel), b = nb.querySelector(sel); if (a && b && a.innerHTML !== b.innerHTML) a.innerHTML = b.innerHTML; });
  box.querySelectorAll(".cm-k[data-k]").forEach(c => { const n2 = nb.querySelector(`.cm-k[data-k="${c.dataset.k}"] span`), s = c.querySelector("span"); if (n2 && s) s.innerHTML = n2.innerHTML; });
  box.querySelectorAll(".cm-seg button").forEach(b => { const on = b.dataset.cmDebut ? +b.dataset.cmDebut === debut : +b.dataset.cmMois === m; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  const ch = box.querySelector(".cm-chart"), n2 = nb.querySelector(".cm-chart"); if (ch && n2) { ch.dataset.n = n2.dataset.n; ch.setAttribute("aria-label", n2.getAttribute("aria-label")); }
  const rg = box.querySelector("[data-cm-range]");
  if (rg) { rg.setAttribute("aria-valuetext", `Départ en ${debut}`); if (!patch.glisse) commCurseur(rg, debut); }
  // animation : on repart de l'état affiché (même au milieu d'une animation précédente)
  const B = commEtat(debut, m), now = performance.now();
  let A = box._cmB || commEtat(d0, m0);
  if (box._cmA && box._cmT0 != null) { const t = commEase(Math.min(1, (now - box._cmT0) / COMM_ANIM.ms)); if (t < 1) A = commMelange(box._cmA, box._cmB, t); }
  box._cmA = A; box._cmB = B; box._cmT0 = now;
  commGrille(box, B);
  box.querySelectorAll(".cm-plot .cm-vl,.cm-plot .cm-tip").forEach(x => x.hidden = true);
  box.classList.remove("cm-flash"); void box.offsetWidth; box.classList.add("cm-flash");
  const reduit = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduit) { commDessin(box, A, B, 1); box._cmT0 = null; return; }
  if (!box._cmRaf) { const step = () => { if (!box.isConnected || box._cmT0 == null) { box._cmRaf = 0; return; }
      const t = Math.min(1, (performance.now() - box._cmT0) / COMM_ANIM.ms); commDessin(box, box._cmA, box._cmB, t >= 1 ? 1 : commEase(t));
      if (t < 1) box._cmRaf = requestAnimationFrame(step); else { box._cmRaf = 0; box._cmT0 = null; } };
    box._cmRaf = requestAnimationFrame(step); }
}
function commMelange(A, B, t) { // état intermédiaire figé (point de départ d'une nouvelle animation)
  const N = 120, P = []; for (let i = 0; i <= N; i++) { const x = i / N, o = {}; ["ver", "la", "act", "inf"].forEach(k => o[k] = commEch(A.P, k, x) + (commEch(B.P, k, x) - commEch(A.P, k, x)) * t); P.push(o); }
  const f = {}; ["ver", "la", "act", "inf"].forEach(k => f[k] = A.f[k] + (B.f[k] - A.f[k]) * t);
  return { P, top: A.top + (B.top - A.top) * t, st: B.st, f };
}
function commCurseur(rg, v, anime = true) { // place le curseur (glissement court vers une année entière)
  const a = +rg.value, fin = () => { rg.value = v; commRemplir(rg); };
  if (!anime || Math.abs(a - v) < 0.01 || (matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return fin();
  const t0 = performance.now(), d = 220, st = () => { const t = Math.min(1, (performance.now() - t0) / d); rg.value = a + (v - a) * commEase(t); commRemplir(rg); if (t < 1) requestAnimationFrame(st); else fin(); };
  requestAnimationFrame(st);
}
function commRemplir(rg) { const mn = +rg.min, mx = +rg.max; rg.style.setProperty("--p", ((+rg.value - mn) / (mx - mn) * 100).toFixed(2) + "%"); }
(function () {
  document.addEventListener("click", e => {
    const b = e.target.closest(".cm-sim [data-cm-debut], .cm-sim [data-cm-mois]"); if (!b) return;
    const box = b.closest(".cm-sim");
    if (b.dataset.cmDebut) commMaj(box, { debut: +b.dataset.cmDebut }); else commMaj(box, { mois: +b.dataset.cmMois });
  });
  document.addEventListener("input", e => {
    const r = e.target.closest(".cm-sim [data-cm-range]"); if (!r) return;
    commRemplir(r); commMaj(r.closest(".cm-sim"), { debut: Math.round(+r.value), glisse: true });
  });
  document.addEventListener("change", e => { // au lâcher : le curseur se cale sur l'année retenue
    const r = e.target.closest(".cm-sim [data-cm-range]"); if (!r) return;
    commCurseur(r, Math.round(+r.value));
  });
  document.addEventListener("keydown", e => { // clavier : une année par flèche, cinq par page
    const r = e.target.closest && e.target.closest(".cm-sim [data-cm-range]"); if (!r) return;
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key], v0 = Math.round(+r.value);
    const v = e.key === "Home" ? +r.min : e.key === "End" ? +r.max : d ? Math.min(+r.max, Math.max(+r.min, v0 + d)) : null;
    if (v == null) return; e.preventDefault();
    commCurseur(r, v); commMaj(r.closest(".cm-sim"), { debut: v, glisse: true });
  });
  const tip = e => {
    const plot = e.target.closest && e.target.closest(".cm-plot"); if (!plot) return;
    const box = plot.closest(".cm-sim"), chart = plot.closest(".cm-chart"), n = +chart.dataset.n;
    const rc = plot.getBoundingClientRect(), x = Math.min(1, Math.max(0, ((e.touches ? e.touches[0].clientX : e.clientX) - rc.left) / rc.width)), i = Math.round(x * n);
    const r = commSimule(+box.dataset.debut, COMM_FIN, +box.dataset.m), p = r.pts[i];
    const vl = plot.querySelector(".cm-vl"), t = plot.querySelector(".cm-tip");
    vl.hidden = false; vl.style.left = (i / n * 100) + "%";
    t.hidden = false; t.innerHTML = commTipHTML(p); t.style.left = (i / n > 0.55 ? "auto" : `calc(${(i / n * 100).toFixed(2)}% + 10px)`); t.style.right = (i / n > 0.55 ? `calc(${(100 - i / n * 100).toFixed(2)}% + 10px)` : "auto");
  };
  document.addEventListener("pointermove", tip, { passive: true });
  document.addEventListener("pointerout", e => {
    const plot = e.target.closest && e.target.closest(".cm-plot"); if (!plot || plot.contains(e.relatedTarget)) return;
    plot.querySelectorAll(".cm-vl,.cm-tip").forEach(x => x.hidden = true);
  });
  document.head.insertAdjacentHTML("beforeend", `<style id="cm-anim-css">
.cm-range input[type=range]{-webkit-appearance:none;appearance:none;height:28px;background:transparent;cursor:pointer;touch-action:pan-y;margin:2px 0}
.cm-range input[type=range]:focus{outline:none}
.cm-range input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:99px;background:linear-gradient(to right,var(--ink) 0 var(--p,50%),var(--rule) var(--p,50%) 100%)}
.cm-range input[type=range]::-moz-range-track{height:6px;border-radius:99px;background:var(--rule)}
.cm-range input[type=range]::-moz-range-progress{height:6px;border-radius:99px;background:var(--ink)}
.cm-range input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:50%;background:var(--panel,#fff);border:2px solid var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .15s ease,box-shadow .15s ease}
.cm-range input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--panel,#fff);border:2px solid var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .15s ease}
.cm-range input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.08)}
.cm-range input[type=range]:active::-webkit-slider-thumb{transform:scale(1.2);box-shadow:0 0 0 7px rgba(17,18,20,.08),0 1px 4px rgba(0,0,0,.2)}
.cm-range input[type=range]:active::-moz-range-thumb{transform:scale(1.2)}
.cm-range input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px #D6F26B}
.cm-range>span b{display:inline-block;min-width:3.2em;font-family:var(--mono)}
.cm-grid{transition:opacity .2s}
.cm-k{transition:background-color .5s ease,border-color .5s ease}
.cm-flash .cm-k b{animation:cmPulse .45s ease}
@keyframes cmPulse{0%{opacity:.55}100%{opacity:1}}
.cm-k b{font-variant-numeric:tabular-nums}
.cm-seg button{transition:background-color .15s,color .15s,box-shadow .15s}
@media (prefers-reduced-motion:reduce){.cm-flash .cm-k b{animation:none}.cm-range input[type=range]::-webkit-slider-thumb{transition:none}}
</style>`);
})();

/* ====================================================================================
   4. Les idées reçues
   ==================================================================================== */
function commStats() { // calculé sur les comptes chargés par le site
  const ok = (R && R.companies || []).filter(c => !c.missing && c.net != null && c.ca > 0);
  return { n: ok.length, benef: ok.filter(c => c.net > 0).length, div: ok.filter(c => c.divPaid > 0 || c.dps > 0).length, tot: (R && R.companies || []).length };
}
let COMM_LN = null; // nombre d'entrées de la liste noire AMF, chargé à la demande
function commListeNoire() {
  if (COMM_LN) return Promise.resolve(COMM_LN);
  return fetch("/data/listes-noires.json").then(r => r.ok ? r.json() : null).then(j => COMM_LN = j && j.items ? { n: j.items.length, maj: j.updated } : null).catch(() => null);
}
const COMM_VERDICT = { faux: ["Faux", "cm-v-faux"], pfaux: ["Plutôt faux", "cm-v-pfaux"], partie: ["Vrai en partie", "cm-v-partie"] };
// Exemple concret tiré des comptes chargés par le site (aucun chiffre écrit à la main)
function commExempleComptes() {
  const c = ["lvmh", "totalenergies", "airbus", "loreal"].map(id => typeof RBY !== "undefined" && RBY[id]).find(c => c && !c.missing && c.ca > 0 && c.caPrev > 0 && c.net != null);
  if (!c) return "Chaque fiche d'entreprise du site compare ses ventes, sa marge et sa dette à la médiane de son secteur, à partir de ses comptes officiels.";
  const g = c.ca / c.caPrev - 1;
  return `<a class="lnk" href="/entreprise/${c.id}">${esc(c.name)}</a> a publié pour ${c.year} des ventes de <b>${big(c.ca, c.currency)}</b> (${sgn(g, 1)} sur un an) et un bénéfice net de <b>${big(c.net, c.currency)}</b>, d'après ses comptes officiels. Ce sont ces chiffres que sa fiche compare à la médiane de son secteur.`;
}
function commIdees() {
  const S = commStats(), pc = (a, b) => b ? Math.round(a / b * 100) : 0;
  const pos = COMM_MWUSD.filter(v => v > 0).length, neg = COMM_MWUSD.length - pos;
  const s20 = commSimule(COMM_FIN - 9, COMM_FIN, 100).fin;
  return [
    { id: "casino", mythe: "La Bourse, c'est un casino.", v: "pfaux",
      rep: "Au casino, les règles sont faites pour que la maison gagne en moyenne. En Bourse, vous achetez des parts d'entreprises qui produisent des bénéfices et versent des dividendes.",
      faits: [`L'indice MSCI World (1 249 grandes entreprises de 23 pays développés) a progressé de <b>9,02 % par an</b> en moyenne de fin 1987 à septembre 2026, en dollars, dividendes réinvestis.`,
        `De 1970 à 2025, il a monté <b>${pos} années sur ${COMM_MWUSD.length}</b> et baissé ${neg} fois.`],
      viz: () => `<div class="cm-years" role="img" aria-label="${pos} années de hausse et ${neg} années de baisse de 1970 à 2025">${COMM_MWUSD.map((v, i) => `<i class="${v >= 0 ? "p" : "n"}" title="${1970 + i} : ${commP(v, 1, true)}"></i>`).join("")}</div>
        <div class="cm-yleg"><span>1re ligne : 1970 à 1997 · 2e ligne : 1998 à 2025</span><span><i class="p"></i>hausse <i class="n"></i>baisse</span></div>`,
      credible: "Les cours bougent chaque jour sans raison apparente. Les médias parlent surtout des krachs et des coups de chance. Et certains produits fonctionnent vraiment comme un pari.",
      nuance: "Sur un jour ou un mois, le résultat ressemble à un tirage au sort. Une entreprise seule peut perdre presque toute sa valeur. Ces chiffres sont passés et ne garantissent rien pour l'avenir.",
      exemple: "Le trading à effet de levier (CFD) se rapproche vraiment du jeu : selon l'ESMA (2018), <b>74 % à 89 %</b> des comptes de particuliers y perdent de l'argent. Détenir un indice large pendant des années est une tout autre démarche.",
      retenir: "Le risque dépend de ce que vous achetez et de la durée. Une action seule sur quelques mois ressemble à un pari ; un indice large sur de nombreuses années, beaucoup moins.",
      src: ["msciUsd", "wikiMsci", "esmaCfd"], liens: [["Risque et rendement", "/academie/bases/risque-rendement"], ["L'effet de levier et les CFD", "/academie/psychologie/levier-cfd"]] },
    { id: "argent", mythe: "Il faut beaucoup d'argent pour commencer.", v: "faux",
      rep: "Quelques dizaines d'euros par mois suffisent pour démarrer. Ce qui compte, c'est que les frais restent petits par rapport au montant investi.",
      faits: ["Sur un PEA, les frais d'un ordre passé en ligne sont plafonnés à <b>0,5 %</b> du montant depuis 2020.",
        "En janvier 2026, un ordre de 1 000 € à Paris coûtait en moyenne environ <b>0,15 %</b> chez les néo-courtiers, 0,45 % chez les courtiers en ligne établis et 0,65 % dans les banques de réseau."],
      viz: () => commBars([["Ordre de 50 €", 4, "4 %", COMM_C.inf], ["Ordre de 100 €", 2, "2 %", "#E59A3A"], ["Ordre de 500 €", 0.4, "0,4 %", COMM_C.act], ["Ordre de 1 000 €", 0.2, "0,2 %", COMM_C.act]], 4, "Poids d'un frais fixe de 2 € par ordre, selon le montant (exemple de calcul)."),
      credible: "Les actions connues coûtent souvent plusieurs centaines d'euros l'unité. On imagine aussi des frais d'entrée élevés et des montants minimums, comme pour certains placements bancaires.",
      nuance: "Un frais fixe par ordre écrase les petits montants. Comparez la grille de votre courtier pour votre montant habituel. Avant d'investir, gardez une épargne de précaution disponible.",
      exemple: "Avec un frais fixe de 2 € par ordre, un achat de 50 € perd <b>4 %</b> dès le départ, et il faudra payer à nouveau à la revente. Le même frais sur 1 000 € ne pèse que <b>0,2 %</b>.",
      retenir: "Le montant de départ compte moins que le poids des frais. Regardez le coût d'un ordre pour la somme que vous investissez vraiment.",
      src: ["amfObs", "peaFrais"], liens: [["Les frais de courtage", "/academie/frais-fiscalite/frais-courtage"], ["Simulateur de frais", "/simulateurs/frais"]] },
    { id: "experts", mythe: "La Bourse, c'est réservé aux experts.", v: "pfaux",
      rep: "Les professionnels eux-mêmes battent rarement le marché. Un ETF permet de détenir tout un indice avec un seul titre, sans choisir les actions une par une.",
      faits: ["Sur les dix ans terminés fin 2025, <b>98,1 %</b> des fonds d'actions françaises en euros ont fait moins bien que leur indice."],
      credible: "Le vocabulaire est technique, les écrans sont remplis de chiffres et les professionnels semblent disposer d'outils hors de portée.",
      exemple: "Un seul ETF qui suit le MSCI World vous rend propriétaire d'une petite part d'environ <b>1 249 entreprises</b> de 23 pays, sans choisir les actions une par une.",
      retenir: "Pas besoin d'être expert pour détenir le marché. Il faut en revanche comprendre le risque, l'horizon et les frais : c'est l'objet de l'Académie.",
      viz: () => `<div class="cm-dots" role="img" aria-label="98 fonds sur 100 sous leur indice">${Array.from({ length: 100 }, (_, i) => `<i class="${i < 98 ? "" : "g"}"></i>`).join("")}</div><p class="cm-vnote">Sur 100 fonds d'actions françaises gérés par des professionnels, environ 98 ont fait moins bien que leur indice en dix ans.</p>`,
      nuance: "Il faut tout de même comprendre trois choses : le risque, l'horizon et les frais. Un ETF baisse quand son indice baisse. C'est l'objet de l'Académie, gratuite pour l'essentiel.",
      src: ["spiva", "msciEur"], liens: [["Les indices boursiers", "/academie/bourse/indices"], ["L'Académie", "/academie"], ["Les ETF", "/etf"]] },
    { id: "tout-perdre", mythe: "On peut tout perdre du jour au lendemain.", v: "partie",
      rep: "Vrai pour une entreprise seule, qui peut faire faillite. Un indice de centaines d'entreprises ne disparaît pas en une nuit, mais il peut baisser fortement et longtemps.",
      faits: ["Pire baisse du MSCI World en euros depuis fin 2000 : <b>−53,6 %</b>, du 24 mai 2001 au 9 mars 2009.",
        "Pire séance du CAC 40 : <b>−12,28 %</b>, le 12 mars 2020."],
      viz: () => commBars([["Krach de 1987", 23, "23 mois", "#E59A3A"], ["Bulle internet, 2000", 86, "7 ans", COMM_C.inf], ["Crise de 2008", 65, "5 ans et demi", COMM_C.inf], ["Covid, 2020", 6, "6 mois", COMM_C.act]], 86, "Temps mis par le S&P 500 (hors dividendes) pour retrouver son plus haut d'avant la crise."),
      credible: "Des entreprises célèbres ont fait faillite et des krachs ont effacé la moitié de la valeur des marchés. Ces histoires marquent davantage que les années calmes.",
      nuance: "Ces baisses ont jusqu'ici été rattrapées, mais parfois après plus de cinq ans, et rien ne le garantit. Une action seule peut perdre 80 % ou plus.",
      exemple: "Après la bulle internet de 2000, le S&P 500 (hors dividendes) a mis environ <b>7 ans</b> à retrouver son plus haut. Après la chute du Covid en 2020, environ <b>6 mois</b>.",
      retenir: "Une entreprise seule peut disparaître ; un indice diversifié peut baisser de moitié et longtemps. L'argent dont vous aurez besoin dans les prochaines années est exposé à ces baisses.",
      src: ["msciEur", "fed87", "yardeni"], liens: [["Volatilité et krachs historiques", "/academie/bourse/krachs"], ["L'horizon de placement", "/academie/bases/horizon"], ["Diversifier", "/academie/portefeuille/diversification"]] },
    { id: "livret-a", mythe: "Le Livret A suffit.", v: "partie",
      rep: "Le Livret A est parfait pour l'argent dont vous pourriez avoir besoin vite. Sur longue durée, il protège mal contre la hausse des prix.",
      faits: ["Taux du Livret A : <b>1,7 %</b> net depuis le 1er août 2026.",
        "Hausse des prix sur un an en septembre 2026 : <b>3,1 %</b> (Insee). Le rendement réel du Livret A est donc négatif."],
      credible: "Le Livret A est simple, sans risque, sans impôt et disponible à tout moment. Pendant des années, il a semblé suffire.",
      exemple: `${F0.format(100)} € par mois de 2016 à 2025 : environ <b>${commE(s20.la)}</b> sur un Livret A, contre <b>${commE(s20.act)}</b> en actions monde, pour ${commE(s20.ver)} versés. Les actions ont connu de fortes baisses en chemin.`,
      retenir: "Le Livret A est fait pour la réserve de précaution. Sur longue durée, il protège mal contre la hausse des prix.",
      viz: () => commBars([["Livret A", 1.7, "1,7 %", COMM_C.la], ["Hausse des prix sur un an", 3.1, "3,1 %", COMM_C.inf]], 3.1, "Taux du Livret A au 1er août 2026 et inflation de septembre 2026.") + `<p class="cm-more"><a class="btn cm-btn" href="/livret-a-ou-bourse">Comparer sur 10, 20 ou 30 ans</a></p>`,
      nuance: "Le Livret A garantit le capital, reste disponible et n'est pas imposé. Les actions peuvent perdre la moitié de leur valeur. L'ordre logique : d'abord une réserve de précaution (la Banque de France cite deux à six mois de revenus), ensuite seulement des placements qui varient. Le Livret A est plafonné à 22 950 €.",
      src: ["livretAout", "livret", "ipcSept", "bdfPrec"], liens: [["Livret A ou Bourse : le comparateur", "/livret-a-ou-bourse"], ["Les livrets réglementés", "/academie/placements/livrets"], ["L'inflation", "/academie/bases/inflation"]] },
    { id: "bon-moment", mythe: "Il faut attendre le bon moment pour entrer.", v: "pfaux",
      rep: "Personne ne sait prévoir les meilleurs jours. Les manquer coûte très cher, et ils arrivent souvent en pleine panique.",
      faits: ["7 des 10 meilleures séances ont eu lieu moins de deux semaines après l'une des 10 pires.",
        "Investir une grosse somme d'un coup a fait mieux qu'étaler ses achats environ <b>deux fois sur trois</b> (Vanguard, 2012)."],
      viz: () => commBars([["Resté investi 20 ans", 82300, "82 300 $", COMM_C.act], ["Sans les 10 meilleures séances", 35700, "35 700 $", COMM_C.inf]], 82300, "10 000 $ placés dans un fonds S&P 500 sur 20 ans (calcul de The Motley Fool, octobre 2026)."),
      credible: "Chacun connaît quelqu'un qui a acheté juste avant un krach. Attendre une baisse paraît prudent et logique.",
      nuance: "Tout investir juste avant une forte baisse est pénible : en 2000 ou en 2007, il a fallu des années pour se refaire. Investir chaque mois la même somme réduit ce regret, même si ce n'est pas toujours le plus rentable.",
      exemple: "10 000 $ placés 20 ans dans un fonds S&P 500 : environ <b>82 300 $</b>. En manquant seulement les 10 meilleures séances : environ <b>35 700 $</b>.",
      retenir: "Personne ne sait prévoir les meilleurs jours, et les manquer coûte cher. Investir régulièrement la même somme évite d'avoir à choisir le moment.",
      src: ["motley", "vanguard"], liens: [["Le coût du market timing", "/academie/psychologie/trading-timing"], ["Comparateur Livret A ou Bourse", "/livret-a-ou-bourse"]] },
    { id: "economie", mythe: "La Bourse n'a rien à voir avec l'économie réelle.", v: "faux",
      rep: "Une action est une part d'entreprise. Sur longue durée, son prix suit les ventes, les bénéfices et les dividendes que publient les comptes officiels.",
      faits: S.n ? [`Sur les <b>${F0.format(S.n)}</b> entreprises dont bilan. a lu les derniers comptes annuels, <b>${pc(S.benef, S.n)} %</b> ont fait un bénéfice et ${pc(S.div, S.n)} % ont versé un dividende.`,
        "Ces chiffres sont calculés par le site à partir des rapports déposés aux autorités : format ESEF en Europe, SEC aux États-Unis."] : ["Les comptes des entreprises n'ont pas pu être chargés."],
      viz: () => S.n ? commBars([["Ont fait un bénéfice", pc(S.benef, S.n), pc(S.benef, S.n) + " %", COMM_C.act], ["Ont versé un dividende", pc(S.div, S.n), pc(S.div, S.n) + " %", "#5E9C7C"]], 100, `Calcul de bilan. sur ${F0.format(S.n)} entreprises, dernier exercice publié.`) : "",
      credible: "Un cours réagit parfois fortement à une rumeur ou à une déclaration, sans que l'entreprise ait changé. La Bourse semble vivre dans son propre monde.",
      nuance: "À court terme, le cours peut s'éloigner beaucoup des comptes, dans les deux sens : c'est l'effet des émotions et des anticipations. Et les comptes ont plusieurs mois de retard sur l'activité.",
      exemple: commExempleComptes(),
      retenir: "À long terme, le prix d'une action suit ce que l'entreprise vend et gagne ; à court terme, il peut s'en écarter beaucoup. Les comptes officiels restent le point de départ.",
      src: ["esef"], liens: [["Les entreprises et leurs comptes", "/entreprises"], ["Le compte de résultat", "/academie/comptes/compte-resultat"], ["Méthode et sources", "/methode"]] },
    { id: "frais", mythe: "Les frais, c'est un détail.", v: "faux",
      rep: "Les frais se prélèvent chaque année, sur un capital qui grossit. Sur 25 ans, un point de frais en plus coûte des milliers d'euros.",
      faits: ["En 2025, frais annuels moyens : <b>1,3 %</b> pour les fonds d'actions françaises, <b>0,33 %</b> pour les ETF actions."],
      credible: "Un frais de 1 % par an paraît minuscule à côté des variations de la Bourse. Et il est prélevé discrètement, sans facture.",
      exemple: "10 000 € placés 25 ans à 6 % par an avant frais (hypothèse) : environ <b>39 700 €</b> avec 0,33 % de frais par an, <b>31 500 €</b> avec 1,3 %. Soit 8 200 € d'écart.",
      retenir: "Les frais font partie des rares choses que vous contrôlez. Comparer les frais courants avant de choisir un fonds évite un coût qui grossit avec les années.",
      viz: () => commBars([["Frais de 0,33 % par an", 39700, "39 700 €", COMM_C.act], ["Frais de 1,3 % par an", 31500, "31 500 €", COMM_C.inf]], 39700, "Capital final de 10 000 € placés 25 ans, hypothèse de 6 % par an avant frais : 8 200 € d'écart."),
      nuance: "Un fonds plus cher peut valoir la peine s'il rapporte plus que ses frais : c'est rare sur dix ans. Les frais courants ne disent pas tout : frais de courtage, de garde et de change s'ajoutent parfois.",
      src: ["amfFrais", "amfObs", "spiva"], liens: [["Les frais courants sur 20 à 30 ans", "/academie/frais-fiscalite/frais-courants"], ["Simulateur de frais", "/simulateurs/frais"], ["Comparer les ETF", "/etf"]] },
    { id: "trader", mythe: "Pour gagner, il faut acheter et vendre souvent.", v: "faux",
      rep: "Plus on passe d'ordres, plus on paie de frais et plus on se trompe de moment. Les études montrent que les plus actifs gagnent le moins.",
      faits: ["Une étude a suivi <b>66 465</b> foyers américains de 1991 à 1996 : plus ils passaient d'ordres, moins ils gagnaient après frais.",
        "Moins de <b>1 %</b> des day traders de Taïwan battent le marché de façon régulière une fois les frais payés."],
      credible: "Les réseaux sociaux montrent des gains rapides. Agir souvent donne l'impression de maîtriser la situation.",
      exemple: "De 1991 à 1996, les foyers les plus actifs ont gagné <b>11,4 %</b> par an, contre <b>17,9 %</b> pour le marché : 6,5 points de moins chaque année.",
      retenir: "Chaque ordre coûte des frais et expose à une erreur de moment. En moyenne, les investisseurs les plus actifs gagnent le moins.",
      viz: () => commBars([["Le marché", 17.9, "17,9 %", COMM_C.act], ["Le foyer moyen", 16.4, "16,4 %", "#5E9C7C"], ["Les plus actifs", 11.4, "11,4 %", COMM_C.inf]], 17.9, "Rendement annuel après frais, 1991 à 1996 (Barber et Odean, 2000)."),
      nuance: "Ajuster son portefeuille de temps en temps reste normal, par exemple pour revenir à la répartition prévue. Ces études portent sur des marchés et des périodes passés.",
      src: ["barber", "barber2"], liens: [["Le coût du trading fréquent", "/academie/psychologie/trading-timing"], ["L'excès de confiance", "/academie/psychologie/exces-confiance"]] },
    { id: "france", mythe: "Mieux vaut investir dans ce qu'on connaît : la France.", v: "pfaux",
      rep: "La France pèse environ 2 % des grandes entreprises des pays développés. N'acheter que des actions françaises, c'est miser sur un seul pays.",
      faits: ["Dans l'indice MSCI World, la France pèse <b>2,24 %</b>, les États-Unis <b>72,94 %</b> (30 septembre 2026)."],
      credible: "On connaît les marques françaises, on suit leur actualité, et le PEA favorise les actions européennes. Investir chez soi paraît plus sûr.",
      exemple: "Le CAC 40 est passé de <b>6 944 points</b> en septembre 2000 à <b>2 401 points</b> en mars 2003 : une seule Bourse peut baisser fortement et stagner longtemps.",
      retenir: "Un seul pays, c'est un seul risque. Un indice mondial répartit ce risque, avec ses propres excès : beaucoup d'États-Unis, de grandes valeurs et de dollar.",
      viz: () => { const w = [["États-Unis", 72.94, "#2B5C9E"], ["Japon", 5.91, "#5E9C7C"], ["Royaume-Uni", 3.41, "#8C7BB8"], ["Canada", 3.29, "#C98A2B"], ["France", 2.24, COMM_C.inf], ["Autres", 12.21, "#B9B2A5"]];
        return `<div class="cm-stack" role="img" aria-label="Répartition par pays du MSCI World">${w.map(([l, v, c]) => `<i style="width:${v}%;background:${c}" title="${l} : ${nf(2).format(v)} %"></i>`).join("")}</div><div class="cm-sleg">${w.map(([l, v, c]) => `<span><i style="background:${c}"></i>${l} <b>${nf(v < 10 ? 2 : 1).format(v)} %</b></span>`).join("")}</div>`; },
      nuance: "Un indice mondial a ses propres excès : plus de 70 % aux États-Unis, et environ 28 % sur seulement 10 entreprises. Le dollar ajoute un risque de change. Sur un PEA, des ETF monde existent grâce à la réplication synthétique.",
      src: ["msciEur", "msciUsd"], liens: [["Diversifier", "/academie/portefeuille/diversification"], ["Le CAC 40", "/indice/cac40"], ["Le chevauchement entre ETF", "/outils/recouvrement"]] },
    { id: "tuyau", mythe: "Un bon tuyau sur les réseaux sociaux peut rapporter gros.", v: "faux",
      rep: "Les promesses de gain rapide sont la porte d'entrée des arnaques. Vérifiez qui parle, s'il est payé, et si la plateforme est autorisée.",
      faits: ["<b>16 %</b> des Français estiment avoir été victimes d'une arnaque, <b>32 %</b> chez les plus jeunes (chiffres cités par la présidente de l'AMF, mai 2026).",
        `La liste noire de l'AMF compte <b class="cm-ln">plusieurs milliers</b> de sites et d'entités non autorisés.`,
        "Un « finfluenceur » doit dire s'il est rémunéré pour parler d'un produit (AMF et ESMA, janvier 2026)."],
      viz: () => commBars([["Ensemble des Français", 16, "16 %", "#E59A3A"], ["Les plus jeunes", 32, "32 %", COMM_C.inf]], 32, "Part des personnes qui estiment avoir été victimes d'une arnaque.") + `<p class="cm-more"><a class="btn cm-btn" href="/outils/verifier">Vérifier un site sur la liste noire</a></p>`,
      credible: "Les publications montrent des gains spectaculaires, souvent avec des captures d'écran. Le ton est amical et le conseil semble gratuit.",
      nuance: "Tout n'est pas à jeter en ligne : certains créateurs suivent le certificat de l'influence responsable de l'ARPP et de l'AMF. Une information sérieuse se vérifie dans les comptes officiels et cite ses sources.",
      exemple: "Situation type : un compte promet un gain rapide et sûr, puis vous dirige vers une plateforme de trading. Avant tout versement, le nom de la plateforme se vérifie sur la liste noire de l'AMF, en quelques secondes.",
      retenir: "Une promesse de gain rapide et sans risque est un signal d'alerte. Vérifiez qui parle, s'il est payé, et si la plateforme est autorisée.",
      src: ["educfi", "amfListes", "esma"], liens: [["Reconnaître les arnaques", "/academie/psychologie/arnaques"], ["Réseaux sociaux et finfluenceurs", "/academie/psychologie/finfluenceurs"]] },
    { id: "impots", mythe: "La fiscalité de la Bourse est un casse-tête.", v: "pfaux",
      rep: "Deux enveloppes couvrent l'essentiel. Le PEA est très avantageux après 5 ans. Le courtier fournit chaque année un récapitulatif pour la déclaration.",
      faits: ["PEA de plus de 5 ans : gains exonérés d'impôt sur le revenu, seuls <b>18,6 %</b> de prélèvements sociaux. Compte-titres : <b>31,4 %</b>."],
      credible: "Plus-values, dividendes, prélèvements sociaux, enveloppes : le vocabulaire fiscal intimide, et les règles changent souvent.",
      exemple: "Sur un gain de 20 000 € : <b>3 720 €</b> d'impôts et prélèvements avec un PEA de plus de 5 ans, <b>6 280 €</b> avec un compte-titres (règles 2026).",
      retenir: "Deux enveloppes couvrent l'essentiel, et le courtier fournit un récapitulatif chaque année pour la déclaration. Le choix du compte pèse autant que le choix des titres.",
      viz: () => commBars([["PEA de plus de 5 ans", 3720, "3 720 €", COMM_C.act], ["Compte-titres", 6280, "6 280 €", COMM_C.inf]], 6280, "Impôts et prélèvements sur un gain de 20 000 € (règles 2026)."),
      nuance: "Un retrait avant 5 ans ferme en principe le PEA. Les actions américaines achetées en direct n'y entrent pas. Le compte-titres reste utile au-delà des plafonds ou pour d'autres titres.",
      src: ["pea", "ps"], liens: [["PEA ou compte-titres", "/pea-cto"], ["Simulateur PEA ou compte-titres", "/simulateurs/pea-cto"], ["Le PEA", "/academie/placements/pea"]] },
  ];
}
/* ---------- Idées reçues déconstruites : une carte à retourner par idée ----------
   Format de chaque carte : la croyance (« Vrai ou faux ? ») → le verdict → 1. pourquoi on y croit, 2. ce que montrent les données,
   3. les nuances, 4. un exemple concret → ce que l'investisseur peut en retenir. Les réponses restent sur cet appareil (bilan.idees). */
const COMM_IR_KEY = "bilan.idees";
const COMM_IR_ETAPES = [["credible", "Pourquoi on y croit"], ["donnees", "Les données"], ["nuance", "Les nuances"], ["exemple", "Un exemple"]];
function commIrEtat() { try { return JSON.parse(localStorage.getItem(COMM_IR_KEY) || "{}") || {}; } catch (e) { return {}; } }
function commIrNoter(id, r) { const s = commIrEtat(); s[id] = r; try { localStorage.setItem(COMM_IR_KEY, JSON.stringify(s)); } catch (e) { } }
const commIrJuste = (x, r) => x.v === "partie" ? "nuance" : r === "f" ? "oui" : r === "v" ? "non" : null; // « Faux » et « Plutôt faux » : la bonne intuition est « Faux »
function commIrScore(L) {
  const s = commIrEtat(), rep = L.filter(x => s[x.id] === "v" || s[x.id] === "f");
  return { faites: L.filter(x => s[x.id]).length, rep: rep.length, ok: rep.filter(x => commIrJuste(x, s[x.id]) !== "non").length, n: L.length };
}
function commIrPane(x, k) {
  if (k === "credible") return `<p>${x.credible}</p>`;
  if (k === "donnees") return `<div class="cm-grid2"><ul class="cm-faits">${x.faits.map(f => `<li>${f}</li>`).join("")}</ul><div class="cm-viz">${x.viz()}</div></div>`;
  if (k === "nuance") return `<p>${x.nuance}</p>`;
  return `<p>${x.exemple}</p>`;
}
function commIrReponse(x, r) {
  const [vt, vc] = COMM_VERDICT[x.v], j = commIrJuste(x, r);
  const you = j === "oui" ? `<span class="ir-you ok">Bonne intuition</span>` : j === "non" ? `<span class="ir-you ko">Pas tout à fait</span>` : j === "nuance" && r !== "x" ? `<span class="ir-you nu">Les deux à la fois</span>` : "";
  return `<div class="ir-verdict"><span class="cm-v ${vc}">${vt}</span>${you}</div>
    <p class="ir-rep">${x.rep}</p>
    <div class="ir-steps" role="tablist" aria-label="Déconstruire l'idée reçue">${COMM_IR_ETAPES.map(([k, t], i) => `<button type="button" role="tab" data-ir-tab="${k}" aria-selected="${i ? "false" : "true"}" class="${i ? "" : "on"}"><i>${i + 1}</i>${t}</button>`).join("")}</div>
    <div class="ir-pane" role="tabpanel" data-k="credible">${commIrPane(x, "credible")}</div>
    <div class="ir-ret"><p class="kick">Ce que l'on peut en retenir</p><p>${x.retenir}</p></div>
    <div class="cm-foot"><div class="cm-go">${x.liens.map(([l, h]) => `<a class="chip" href="${h}">${esc(l)}</a>`).join("")}</div>
      <details class="cm-src"><summary>Sources</summary>${commSrcHTML(x.src)}</details></div>`;
}
// Une carte. opts.seule : affichage isolé (Apprendre, Académie) avec le bouton « Une autre idée reçue »
function commIdeeCarte(x, i, opts = {}) {
  const r = commIrEtat()[x.id], ouvert = !!r;
  return `<article class="ir${ouvert ? " open" : ""}${opts.seule ? " ir-seule" : ""}" id="${x.id}" data-ir="${x.id}">
    <div class="ir-q"><span class="cm-n">${String(i + 1).padStart(2, "0")}</span><div class="ir-qb"><p class="cm-myth">« ${esc(x.mythe.replace(/\.$/, ""))} »</p>
      <div class="ir-ask"${ouvert ? " hidden" : ""}><span class="kick">Vrai ou faux ?</span><button type="button" class="btn ghost" data-ir-ans="v">Vrai</button><button type="button" class="btn ghost" data-ir-ans="f">Faux</button><button type="button" class="linkbtn" data-ir-ans="x">Voir la réponse</button></div></div></div>
    <div class="ir-a"${ouvert ? "" : " hidden"}>${ouvert ? commIrReponse(x, r) : ""}</div>
    ${opts.seule ? `<div class="ir-nav"><span class="light ir-sc"></span><button type="button" class="linkbtn" data-ir-next>Une autre idée reçue →</button><a class="more" href="/idees-recues">Les ${commIdees().length} idées reçues →</a></div>` : ""}
  </article>`;
}
function commIdeeHTML(x, i) { return commIdeeCarte(x, i); } // ancien nom, gardé pour les appels existants
function commIrScoreHTML(L) {
  const s = commIrScore(L);
  return s.faites ? `<b>${s.faites} / ${s.n}</b> idées vues${s.rep ? ` · <b>${s.ok}</b> bonne${s.ok > 1 ? "s" : ""} intuition${s.ok > 1 ? "s" : ""} sur ${s.rep}` : ""}` : `${s.n} idées, une minute chacune`;
}
function commIrMajScore() { const L = commIdees(), h = commIrScoreHTML(L); $$(".ir-score b.ir-sv, .ir-sc").forEach(e => { e.innerHTML = h; }); }
// Une seule écoute pour toutes les cartes du site
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-ir-ans],[data-ir-tab],[data-ir-next]"); if (!b) return;
  const card = b.closest("[data-ir]"); if (!card) return;
  const L = commIdees(), x = L.find(y => y.id === card.dataset.ir); if (!x) return;
  if (b.dataset.irAns) {
    commIrNoter(x.id, b.dataset.irAns);
    const a = $(".ir-a", card); a.innerHTML = commIrReponse(x, b.dataset.irAns); a.hidden = false; $(".ir-ask", card).hidden = true; card.classList.add("open", "flip");
    setTimeout(() => card.classList.remove("flip"), 450); commIrMajScore();
    const t = $(".ir-verdict", card); if (t && t.getBoundingClientRect().top > innerHeight - 120) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (b.dataset.irTab) {
    $$("[data-ir-tab]", card).forEach(t => { const on = t === b; t.classList.toggle("on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    const p = $(".ir-pane", card); p.dataset.k = b.dataset.irTab; p.innerHTML = commIrPane(x, b.dataset.irTab);
    return;
  }
  if (b.hasAttribute("data-ir-next")) { // la prochaine idée pas encore vue (sinon la suivante)
    const s = commIrEtat(), i = L.indexOf(x), n = L.slice(i + 1).concat(L.slice(0, i)).find(y => !s[y.id]) || L[(i + 1) % L.length];
    card.outerHTML = commIdeeCarte(n, L.indexOf(n), { seule: true }); commIrMajScore();
  }
});
function pageIdeesRecues() {
  setTitle("Idées reçues sur la Bourse : vrai ou faux ?"); setNav("aca");
  const L = commIdees(), s = commIrEtat(), first = L.find(x => !s[x.id]);
  app.innerHTML = `<div class="cm-page ir-page">
    <header class="cm-hero"><p class="kick">Idées reçues déconstruites</p><h1 class="pagetitle">Vrai ou faux ? Les idées reçues sur la Bourse</h1>
      <p class="pagesub">${L.length} phrases qu'on entend souvent. Répondez d'abord, puis retournez la carte : pourquoi on y croit, ce que montrent les données, les nuances, un exemple et ce qu'il faut en retenir. Chiffres officiels, sources à l'appui.</p>
      <div class="ir-score"><span><b class="ir-sv">${commIrScoreHTML(L)}</b></span>${first ? `<a class="btn" href="#${first.id}">${Object.keys(s).length ? "Continuer" : "Commencer"}</a>` : `<button type="button" class="linkbtn" id="ir-raz">Tout recommencer</button>`}</div></header>
    <div class="ir-list">${L.map((x, i) => commIdeeCarte(x, i)).join("")}</div>
    <section class="panel cm-end"><div class="pb"><h2>Pour aller plus loin</h2><p>Ces réponses sont générales. Elles ne tiennent pas compte de votre situation et ne sont pas des conseils d'investissement. Pour un conseil personnalisé, adressez-vous à un conseiller en investissements financiers enregistré auprès de l'ORIAS.</p>
      <div class="cm-go"><a class="chip" href="/apprendre">Le parcours pour apprendre</a><a class="chip" href="/livret-a-ou-bourse">Livret A ou Bourse : le comparateur</a><a class="chip" href="/academie/psychologie">Psychologie et pièges</a><a class="chip" href="/avertissement">Avertissement sur les risques</a></div></div></section>
  </div>`;
  const raz = $("#ir-raz"); if (raz) raz.onclick = () => { try { localStorage.removeItem(COMM_IR_KEY); } catch (e) { } pageIdeesRecues(); };
  commListeNoire().then(x => { $$(".cm-ln").forEach(el => { if (x) el.textContent = F0.format(x.n); }); });
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 0); }
}
// Une carte seule, pour Apprendre et l'Académie : la première idée pas encore vue
function commIdeeSeuleHTML() {
  const L = commIdees(), s = commIrEtat(), x = L.find(y => !s[y.id]) || L[0];
  return commIdeeCarte(x, L.indexOf(x), { seule: true }).replace('<span class="light ir-sc"></span>', `<span class="light ir-sc">${commIrScoreHTML(L)}</span>`);
}
// Bloc court pour l'accueil : trois idées reçues, renvoi vers la page
function commIdeesHTML(n = 3) {
  const L = commIdees().filter(x => ["casino", "argent", "livret-a", "bon-moment", "experts"].includes(x.id)).slice(0, n);
  return `<div class="cm-teaser">${L.map(x => `<a class="cm-tz" href="/idees-recues#${x.id}"><span class="kick">Vrai ou faux ?</span><b>« ${esc(x.mythe.replace(/\.$/, ""))} »</b><span>Répondez, puis découvrez ce que montrent les données.</span></a>`).join("")}</div>
    <p class="cm-more"><a class="lnk" href="/idees-recues">Les ${commIdees().length} idées reçues, chiffres et sources à l'appui</a></p>`;
}
document.head.insertAdjacentHTML("beforeend", `<style id="ir-css">
.ir-page .cm-hero{margin-bottom:14px}
.ir-score{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;margin:14px 0 0;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;font-size:14px}
.ir-score b.ir-sv{font-weight:400}.ir-score b.ir-sv b{font-weight:700}
.ir-list{display:grid;gap:12px;margin:0 0 20px}
.ir{background:var(--card,#fff);border:1px solid var(--line);border-radius:16px;padding:16px 18px;scroll-margin-top:80px;transition:border-color .2s,box-shadow .2s}
.ir.open{border-color:var(--ink)}
.ir.flip .ir-a{animation:irflip .42s cubic-bezier(.2,.7,.2,1)}
@keyframes irflip{from{opacity:0;transform:perspective(900px) rotateX(-12deg) translateY(-6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ir.flip .ir-a{animation:none}}
.ir-q{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start}
.ir-q .cm-n{font-size:20px;line-height:1.2;color:var(--ink);font-weight:600}
.ir .cm-myth{margin:0;font-size:20px}
.ir-ask{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;margin-top:12px}
.ir-ask .kick{margin:0 6px 0 0}
.ir-ask[hidden],.ir-a[hidden]{display:none}
.ir-ask .btn{min-width:84px;justify-content:center}
.ir-a{margin-top:12px;border-top:1px solid var(--line2,#EFEAE0);padding-top:12px}
.ir-verdict{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ir-you{font-size:12.5px;font-weight:700;border-radius:99px;padding:2px 9px}
.ir-you.ok{color:var(--g);background:#E5F2EA}.ir-you.ko{color:#9A3B12;background:#FBE7DD}.ir-you.nu{color:#7A4A00;background:#FFF1D8}
.ir-rep{font-size:15.5px;line-height:1.5;margin:8px 0 12px;max-width:780px}
.ir-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0 0 10px}
.ir-steps button{display:flex;gap:7px;align-items:center;border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 10px;font:600 13px var(--sans,inherit);color:var(--grey);cursor:pointer;text-align:left;min-width:0}
.ir-steps button i{font:700 11px var(--mono);font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--soft);color:var(--ink);flex:none}
.ir-steps button.on{border-color:var(--ink);color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.ir-steps button.on i{background:var(--ink);color:#fff}
.ir-steps button:focus-visible{outline:2px solid var(--g);outline-offset:2px}
.ir-pane{min-height:64px;font-size:15px;line-height:1.55}
.ir-pane>p{margin:0;max-width:780px}
.ir-pane[data-k=nuance]{background:#FFF8EC;border-left:3px solid #E59A3A;border-radius:0 10px 10px 0;padding:10px 14px}
.ir-pane[data-k=exemple]{background:var(--soft);border-radius:10px;padding:10px 14px}
.ir-ret{margin:12px 0 0;border:1px solid var(--g);background:#F2F8F4;border-radius:12px;padding:10px 14px}
.ir-ret .kick{color:var(--g);margin:0 0 3px}.ir-ret p:last-child{margin:0;font-weight:600;line-height:1.45}
.ir-nav{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:flex-end;margin-top:12px;padding-top:10px;border-top:1px solid var(--line2,#EFEAE0);font-size:13.5px}
.ir-nav .ir-sc{margin-right:auto}
@media (max-width:860px){.ir{padding:14px}.ir .cm-myth{font-size:18px}.ir-q .cm-n{font-size:17px}.ir-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.ir-steps button{font-size:12.5px;padding:7px 8px}.ir-nav{justify-content:flex-start}.ir-nav .ir-sc{flex-basis:100%}}
</style>`);

/* ====================================================================================
   5. Page « Livret A ou Bourse »
   ==================================================================================== */
function pageLivretBourse() {
  setTitle("Livret A ou Bourse : 100 € par mois sur 10, 20 ou 30 ans"); setNav("sim");
  const rows = []; for (let y = COMM_FIN; y >= COMM_DEB; y--) rows.push(`<tr><td>${y}</td><td class="r">${commP(COMM_LA[y], 2)}</td><td class="r">${commP((COMM_IPC[y] / COMM_IPC[y - 1] - 1) * 100, 1, true)}</td><td class="r ${COMM_MW[y] < 0 ? "down" : ""}">${commP(COMM_MW[y], 1, true)}${y < COMM_MW_OFF ? "<sup>*</sup>" : ""}</td></tr>`);
  const r10 = commSimule(COMM_FIN - 9, COMM_FIN, 100).fin, r30 = commSimule(COMM_FIN - 29, COMM_FIN, 100);
  app.innerHTML = `<div class="cm-page">
    <header class="cm-hero"><p class="kick">Comparateur historique</p><h1 class="pagetitle">Livret A ou Bourse : ce qu'auraient donné 100 € par mois</h1>
      <p class="pagesub">Le même effort d'épargne, placé sur un Livret A ou sur les actions du monde entier, comparé à la hausse des prix. Avec les vrais chiffres des années passées, les bonnes comme les mauvaises.</p></header>
    <section class="panel"><div class="pb">${commComparaisonHTML({ ans: 20 })}</div></section>
    <div class="cm-cols">
      <section class="panel"><div class="ph"><h2>Ce que montre la comparaison</h2></div><div class="pb"><ul class="cm-faits">
        <li>Sur 10 ans (2016 à 2025), 12 000 € versés deviennent environ ${commE(r10.la)} sur un Livret A et ${commE(r10.act)} en actions monde.</li>
        <li>Le Livret A a parfois rapporté moins que la hausse des prix : en 2022, il a rapporté 1,38 % pendant que les prix montaient de 5,9 % sur l'année.</li>
        <li>Sur longue période, les actions ont nettement creusé l'écart, en traversant des années très difficiles : ${commP(COMM_MW[2002], 1, true)} en 2002, ${commP(COMM_MW[2008], 1, true)} en 2008.</li>
      </ul></div></section>
      <section class="panel"><div class="ph"><h2>Ce qu'elle ne montre pas</h2></div><div class="pb"><ul class="cm-faits">
        <li>Le Livret A est garanti et disponible à tout moment. Les actions ne le sont pas : il faut pouvoir attendre plusieurs années.</li>
        <li>Ce calcul ignore les frais (courtage, frais courants d'un ETF) et les impôts sur les gains. Le Livret A n'est pas imposé ; un PEA de plus de 5 ans l'est peu.</li>
        <li>Le résultat dépend beaucoup de la date de départ. Essayez de commencer en 2000 : la décennie suivante a été mauvaise pour les actions.</li>
      </ul></div></section>
    </div>
    <section class="panel"><div class="ph"><h2>Les chiffres utilisés, année par année</h2></div><div class="pb">
      <p class="note" style="margin-top:0">Chaque ligne est un chiffre publié par une source officielle ou reconnue. Vous pouvez refaire le calcul.</p>
      <div class="scroll-x"><table class="t cm-tab"><thead><tr><th>Année</th><th class="r">Livret A (taux moyen)</th><th class="r">Hausse des prix (déc. à déc.)</th><th class="r">Actions monde en €</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
      <p class="note">* Années ${COMM_DEB} à ${COMM_MW_OFF - 1} : performance MSCI World en dollars (dividendes bruts) convertie en euros par bilan. au taux de change de fin d'année. À partir de ${COMM_MW_OFF} : chiffres officiels MSCI en euros, dividendes nets.</p>
    </div><div class="src">${commSrcHTML(["msciEur", "msciUsd", "wikiMsci", "bce", "fredDem", "livretHist", "livret", "livretAout", "ipc", "ipcSept"])}</div></section>
    <section class="panel cm-end"><div class="pb"><h2>Avant de vous lancer</h2><p>Gardez d'abord une épargne de précaution sur un livret. N'investissez en actions que l'argent dont vous n'aurez pas besoin avant plusieurs années. Ce comparateur est pédagogique : ce n'est pas un conseil d'investissement.</p>
      <div class="cm-go"><a class="chip" href="/idees-recues">Les idées reçues sur la Bourse</a><a class="chip" href="/academie/bases/epargne-precaution">L'épargne de précaution</a><a class="chip" href="/academie/bases/interets-composes">Les intérêts composés</a><a class="chip" href="/pea-cto">PEA ou compte-titres</a><a class="chip" href="/simulateurs/epargne">Simulateur d'épargne</a></div></div></section>
  </div>`;
}

/* ====================================================================================
   6. Page « Pourquoi bilan. »
   ==================================================================================== */
const COMM_DEMO_IDS = ["totalenergies", "lvmh", "airbus", "loreal", "apple", "nvidia"];
function commDemoFiche(id) {
  const s = RBY[id]; if (!s || s.missing) return `<p class="muted">Les comptes de cette entreprise ne sont pas disponibles.</p>`;
  const ks = ["marge", "rentabilite", "dette", "croissance"].filter(k => INDI[k] && INDI[k][1](s) != null).slice(0, 3);
  const row = k => {
    const [lab, fn, fmt, inv] = INDI[k], v = fn(s), md = medInd(s.sector, k);
    const better = md == null || v == null ? null : inv ? v < md : v > md, gap = md ? Math.abs(v - md) / Math.max(Math.abs(md), 1e-9) : 0;
    const cls = better == null || gap < 0.1 ? "n" : better ? "g" : "o";
    return `<div class="cm-dr"><span>${esc(lab)}</span><b>${fmt(v)}</b><small>médiane du secteur : ${md == null ? "–" : fmt(md)}</small><i class="cm-dot ${cls}" title="${cls === "g" ? "Mieux que la médiane" : cls === "o" ? "Moins bien que la médiane" : "Proche de la médiane"}"></i></div>`;
  };
  return `<div class="cm-demo-co">${logo(s, 36)}<div><b>${esc(s.name)}</b><small>${esc(s.desc || "")}</small></div></div>
    <div class="cm-drs">${ks.map(row).join("")}</div>
    ${typeof profilMini === "function" ? profilMini(s) : ""}
    <p class="cm-vnote">Comptes ${s.year || ""} déposés auprès des autorités. Vert : nettement mieux que la médiane du secteur ; orange : nettement moins bien ; gris : proche.</p>
    <a class="lnk" href="/entreprise/${s.id}">Voir la fiche complète de ${esc(s.name)}</a>`;
}
function commDemoCalcul() { // une vraie question, calculée à l'instant sur les comptes
  const fr = R.companies.filter(c => !c.missing && c.region === "FR" && c.netDebt != null && c.ca > 0);
  const cash = fr.filter(c => c.netDebt < 0), div = cash.filter(c => c.divPaid > 0 || c.dps > 0);
  return { n: fr.length, cash: cash.length, div: div.length, ex: div.slice().sort((a, b) => (b.ca || 0) - (a.ca || 0)).slice(0, 4).map(c => c.name) };
}
function pagePourquoiBilan() {
  setTitle("Ce que bilan. fait que les autres ne font pas"); setNav("new");
  const S = commStats(), etf = (ETF && ETF.list || []).length, peaN = R.companies.filter(c => peaOk(c)).length, brok = (typeof BROKERS !== "undefined" && BROKERS && BROKERS.list || []).length, D = commDemoCalcul();
  const A = (n, t, txt, preuve) => `<article class="cm-av panel"><div class="pb"><span class="cm-n">${n}</span><h3>${t}</h3><p>${txt}</p>${preuve ? `<div class="cm-pv"><p class="kick">La preuve</p>${preuve}</div>` : ""}</div></article>`;
  const Y = `<span class="cm-y">✓</span>`, N = `<span class="cm-x">✗</span>`, P = `<span class="cm-p">~</span>`, U = `<span class="cm-u">–</span>`;
  const T = [
    ["Comptes officiels expliqués en français, avec la médiane du secteur", [Y, "verdict vert, gris ou orange"], [N, ""], [N, "données brutes"], [P, "données et synthèse"], [U, ""], [P, "Snowflake, en anglais, 1 vue par jour en gratuit"]],
    ["Assistant IA sur une entreprise", [Y, "gratuit, illimité, calcule sur les comptes"], [Y, "gratuit, Deep Search limité"], [N, "non constaté"], [N, "non constaté"], [P, "connecteur Claude, agent annoncé"], [Y, "Charlie, gratuit et payant"]],
    ["PEA, frais de courtage, fiscalité française", [Y, ""], [N, ""], [P, ""], [P, ""], [U, ""], [N, ""]],
    ["Pédagogie structurée", [Y, "Académie : 55 leçons sourcées"], [N, ""], [P, "articles, simulateurs"], [N, ""], [Y, "blog"], [P, ""]],
    ["Radiographie du portefeuille et chevauchement d'ETF", [Y, "gratuit"], [U, ""], [U, ""], [U, ""], [Y, "offre Plus, 149,99 €/an"], [P, "offre Premium"]],
    ["En français", [Y, ""], [Y, ""], [Y, ""], [Y, ""], [Y, ""], [N, ""]],
    ["Sans publicité", [Y, ""], [Y, ""], [N, ""], [N, "version gratuite"], [U, ""], [U, ""]],
    ["Application mobile", [N, "site seulement"], [P, "Android"], [Y, ""], [Y, "iOS"], [Y, ""], [Y, ""]],
    ["Cours en temps réel", [N, "différés"], [N, "Paris différé de 15 min"], [Y, "clients BoursoBank"], [Y, ""], [U, ""], [U, ""]],
    ["Consensus des analystes", [N, "choix : payant, proche du conseil"], [P, ""], [Y, "Euronext Paris"], [Y, ""], [U, ""], [U, ""]],
    ["Prix de l'offre payante", ["", "gratuit pour l'essentiel ; Premium prévu à 4,90 €/mois ou 39 €/an"], ["", "gratuit"], ["", "gratuit (site)"], ["", "Access : 29 €/mois ou 288 €/an"], ["", "Lite 54,99 €/an ; Plus 149,99 €/an"], ["", "Standard : 96 $/an"]],
  ];
  const cols = ["bilan.", "Google Finance", "Boursorama", "Zonebourse", "Finary", "Simply Wall St"];
  const opts = COMM_DEMO_IDS.filter(id => RBY[id] && !RBY[id].missing);
  app.innerHTML = `<div class="cm-page">
    <header class="cm-hero cm-hero-b"><p class="kick">Pourquoi bilan.</p><h1 class="pagetitle">Ce que bilan. fait que les autres ne font pas</h1>
      <p class="pagesub">Un site pour comprendre la Bourse à partir des comptes officiels, en français, avec une IA qui calcule au lieu d'inventer. Sans publicité, sans produit à vendre, sans conseil.</p>
      <div class="cm-stats"><div><b>${F0.format(S.tot)}</b><span>entreprises suivies</span></div><div><b>${F0.format(etf)}</b><span>ETF analysés</span></div><div><b class="cm-nl">55</b><span>leçons sourcées</span></div><div><b>0</b><span>publicité</span></div></div></header>
    <div class="cm-avs">
      ${A("01", "Les comptes officiels, expliqués avec la médiane du secteur", "Chaque chiffre vient des rapports annuels déposés auprès des autorités (ESEF en Europe, SEC aux États-Unis). Il est comparé à la médiane des entreprises du même secteur : vous voyez tout de suite ce qui est un point fort et ce qu'il faut surveiller.",
        `<div class="cm-demo"><div class="cm-seg cm-seg-co" role="group" aria-label="Choisir une entreprise">${opts.map((id, i) => `<button type="button" data-cm-co="${id}" class="${i === 0 ? "on" : ""}" aria-pressed="${i === 0}">${esc(RBY[id].name)}</button>`).join("")}</div><div id="cmdemo">${opts.length ? commDemoFiche(opts[0]) : ""}</div></div>`)}
      ${A("02", "Une IA qui calcule et cite ses sources", "Les questions courantes sont comprises et calculées par le site lui-même, sur les comptes de sa base : la réponse est exacte par construction. Pour les questions libres, si vous connectez votre IA, le modèle choisi ne reçoit que les chiffres du site, leurs sources et des règles strictes : aucune prédiction de cours, aucune recommandation.",
        `<div class="cm-calc"><p class="cm-q">« Quelles entreprises françaises ont plus de trésorerie que de dettes et versent un dividende ? »</p><p class="cm-a">Réponse calculée à l'instant : <b>${D.div}</b> sur les ${D.n} entreprises françaises dont le site a les comptes${D.ex.length ? `, par exemple ${D.ex.map(esc).join(", ")}` : ""}.</p><small>Source : derniers rapports annuels ESEF. Calcul fait dans votre navigateur, sans modèle d'IA.</small>
        <div class="cm-go"><a class="chip" href="/demander?q=${encodeURIComponent("entreprises françaises sans dette qui versent un dividende")}">Poser cette question</a><a class="chip" href="/demander?q=${encodeURIComponent("Compare LVMH, Hermès et Kering")}">Comparer LVMH, Hermès et Kering</a><a class="chip" href="/methode">Comment l'IA est encadrée</a></div></div>`)}
      ${A("03", "Illimitée et gratuite pour l'essentiel", "Comme les calculs se font en grande partie dans votre navigateur, ils ne coûtent presque rien au site : ils restent gratuits et sans quota. Ailleurs, l'IA est souvent payante ou plafonnée.",
        `<div class="cm-quota"><div class="cm-me2"><b>bilan.</b><span>questions calculées sur les comptes</span><em class="up">illimité, gratuit</em></div><div><b>Investing.com, WarrenAI</b><span>dans l'offre payante InvestingPro</span><em>jusqu'à 500 crédits par mois</em></div><div><b>TradingView, AI Copilot</b><span>en plus d'un abonnement payant</span><em>option payante</em></div></div><p class="cm-vnote">D'après les offres publiées, relevées en octobre 2026.</p>`)}
      ${A("04", "Votre IA, si vous le souhaitez", "Connectez ChatGPT, Claude, Gemini ou Mistral avec votre propre clé (Gemini et Mistral ont une offre gratuite) : vos questions reçoivent alors une réponse rédigée, appuyée sur les chiffres et les sources du site. La clé reste dans votre navigateur. Vous utilisez déjà ChatGPT ou Claude ? Le connecteur bilan. s'y ajoute en une minute.", "")}
      ${A("05", "Pensé pour un épargnant français", "L'éligibilité au PEA sur chaque fiche, les frais de courtage rapportés au montant de votre ordre, la comparaison PEA ou compte-titres, la fiscalité à 31,4 % ou 18,6 % : ce que Google Finance, Yahoo ou Simply Wall St ne traitent pas.",
        `<div class="cm-mini3"><div><b>${F0.format(peaN)}</b><span>entreprises signalées éligibles au PEA</span></div>${brok ? `<div><b>${brok}</b><span>courtiers comparés sur leurs frais</span></div>` : ""}<div><b>2</b><span>simulateurs : frais et PEA ou compte-titres</span></div></div><div class="cm-go"><a class="chip" href="/pea-cto">PEA ou compte-titres</a><a class="chip" href="/simulateurs/frais">Frais de courtage</a></div>`)}
      ${A("06", "La liste noire de l'AMF, vérifiable en un clic", "Avant de confier de l'argent à un site inconnu, collez son adresse : le site la compare aux listes noires et mises en garde publiées par l'AMF.",
        `<div class="cm-mini3"><div><b class="cm-ln">…</b><span>sites et entités de la liste noire AMF</span></div><div><b>16 %</b><span>des Français estiment avoir été victimes d'une arnaque (AMF, mai 2026)</span></div></div><div class="cm-go"><a class="chip" href="/outils/verifier">Vérifier un site</a></div>`)}
      ${A("07", "Une Académie reliée aux vraies données", "55 leçons sourcées et 63 questions de quiz, de l'épargne de précaution à la lecture d'un bilan. Chaque notion renvoie vers une vraie entreprise : la leçon sur le PER mène au PER de TotalEnergies, calculé avec les derniers comptes.",
        `<div class="cm-go"><a class="chip" href="/academie">Ouvrir l'Académie</a><a class="chip" href="/academie/valorisation/per">Leçon : le PER</a><a class="chip" href="/entreprise/totalenergies">Le PER de TotalEnergies</a><a class="chip" href="/idees-recues">Les idées reçues</a></div>`)}
      ${A("08", "Sans publicité, sans produit à vendre, sans conseil", "bilan. ne touche aucune commission de courtier, n'affiche aucune publicité et ne vend aucun placement. Il explique ; il ne dit jamais quoi acheter ou vendre. Boursorama, Investing.com et Zonebourse affichent de la publicité dans leur version gratuite.", "")}
    </div>
    <section class="panel"><div class="ph"><h2>Le tableau comparatif honnête</h2></div><div class="pb">
      <p class="note" style="margin-top:0">D'après notre revue des offres publiques au 28 octobre 2026. ✓ oui · ~ partiel · ✗ non · – non évalué. Les cases où bilan. fait moins bien sont laissées telles quelles.</p>
      <div class="scroll-x"><table class="t cm-cmp"><thead><tr><th></th>${cols.map((c, i) => `<th class="${i ? "" : "cm-me"}">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${T.map(([l, ...cs]) => `<tr><th scope="row">${esc(l)}</th>${cs.map(([m, t], i) => `<td class="${i ? "" : "cm-me"}">${m}${t ? `<small>${esc(t)}</small>` : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    </div><div class="src"><ul class="cm-srcs"><li><a class="lnk" href="https://blog.google/intl/fr-fr/nouveautes-produits/explorez-obtenez-des-reponses/le-nouveau-google-finance-est-disponible-en-france/" target="_blank" rel="noopener">Google, le nouveau Google Finance en France (septembre 2026)</a></li><li><a class="lnk" href="https://letraderdudimanche.com/meilleur-site-analyse-bourse" target="_blank" rel="noopener">Le Trader du Dimanche, prix de Zonebourse et InvestingPro (août 2026)</a></li><li><a class="lnk" href="https://signal-alpha.fr/avis-finary/" target="_blank" rel="noopener">Signal Alpha, prix de Finary (juillet 2026)</a></li><li><a class="lnk" href="https://freenance.io/products/simply-wall-st-review-2026-stock-analysis-charts-fair-value/" target="_blank" rel="noopener">Freenance, test de Simply Wall St (2026)</a></li><li><a class="lnk" href="https://www.investing.com/pro/pricing" target="_blank" rel="noopener">Investing.com, offres InvestingPro</a></li><li><a class="lnk" href="https://chartwisehub.com/tradingview-ai-chart-copilot-guide/" target="_blank" rel="noopener">ChartWiseHub, AI Copilot de TradingView</a></li></ul></div></section>
    <section class="panel"><div class="ph"><h2>Ce que bilan. ne fait pas (encore)</h2></div><div class="pb"><ul class="cm-faits">
      <li><b>Pas de cours en temps réel.</b> Les cours sont différés : le site sert à comprendre, pas à passer des ordres à la seconde.</li>
      <li><b>Pas de consensus d'analystes ni d'objectif de cours.</b> Ces travaux sont payants et proches du conseil : le site préfère les comptes.</li>
      <li><b>Pas de synchronisation avec votre courtier.</b> Vous saisissez votre portefeuille vous-même ; il reste dans votre navigateur ou votre espace.</li>
      <li><b>Pas de conseil personnalisé.</b> Pour cela, adressez-vous à un conseiller en investissements financiers enregistré à l'ORIAS.</li>
    </ul></div></section>
    <section class="panel cm-end"><div class="pb"><h2>Commencez par une question</h2><p>Le plus simple pour juger : posez une vraie question, ouvrez une fiche, ou faites le parcours du débutant.</p>
      <div class="cm-go"><a class="btn cm-btn" href="/demander">Demander à l'IA</a><a class="chip" href="/commencer">Par où commencer</a><a class="chip" href="/entreprises">Les entreprises</a><a class="chip" href="/methode">Méthode et sources</a></div></div></section>
  </div>`;
  commListeNoire().then(x => { $$(".cm-ln").forEach(el => el.textContent = x ? F0.format(x.n) : "plus de 3 000"); });
  if (typeof acaLoad === "function") acaLoad().then(a => { const el = $(".cm-nl"); if (a && el) el.textContent = a.modules.reduce((n, m) => n + m.lecons.length, 0); });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-cm-co]"); if (!b) return;
  $$("[data-cm-co]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
  const d = $("#cmdemo"); if (d) d.innerHTML = commDemoFiche(b.dataset.cmCo);
});
// Bloc court pour l'accueil : les avantages en quatre cartes
function commPourquoiHTML() {
  const S = commStats();
  const it = [["Comptes officiels", `${F0.format(S.tot)} entreprises, chaque chiffre comparé à la médiane de son secteur.`], ["IA qui calcule", "Les réponses sont calculées sur les comptes, avec leur source. Gratuit et illimité."], ["Pensé pour la France", "PEA, frais de courtage, fiscalité, liste noire de l'AMF."], ["Indépendant", "Aucune publicité, aucun produit vendu, aucun conseil d'achat."]];
  return `<div class="cm-teaser">${it.map(([t, d]) => `<a class="cm-tz" href="/pourquoi-bilan"><b>${t}</b><span>${d}</span></a>`).join("")}</div><p class="cm-more"><a class="lnk" href="/pourquoi-bilan">Ce que bilan. fait que les autres ne font pas</a></p>`;
}

/* ====================================================================================
   7. Routes et styles
   ==================================================================================== */
ROUTES_EXTRA.push([/^\/idees-recues$/, () => pageIdeesRecues()]);
ROUTES_EXTRA.push([/^\/livret-a-ou-bourse$/, () => pageLivretBourse()]);
ROUTES_EXTRA.push([/^\/pourquoi-bilan$/, () => pagePourquoiBilan()]);

document.head.insertAdjacentHTML("beforeend", `<style id="cm-style">
.cm-page{max-width:980px;margin:0 auto}
.cm-page .panel{margin:0 0 18px}
.cm-hero{margin:8px 0 22px}.cm-hero .pagesub{max-width:720px}
.cm-n{font-family:var(--mono);font-size:12px;color:var(--light);letter-spacing:.04em}
.cm-v{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.02em;border-radius:99px;padding:2px 9px;white-space:nowrap}
.cm-v-faux{background:var(--ink);color:#fff}.cm-v-pfaux{background:var(--soft);color:var(--ink);border:1px solid var(--line)}.cm-v-partie{background:#FFE9C7;color:#7A4A00}
.cm-som{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 26px}
.cm-som a{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13.5px}
.cm-som a:hover{border-color:var(--ink)}.cm-som .t{font-weight:600}
.cm-idee{scroll-margin-top:80px}
.cm-ih{display:flex;gap:14px;align-items:flex-start;padding:20px 22px 4px}
.cm-ih .cm-n{font-size:22px;line-height:1.15;color:var(--ink);font-weight:600}
.cm-myth{font-family:var(--serif);font-weight:800;font-size:22px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
.cm-ib{padding:6px 22px 18px}
.cm-rep{font-size:16px;line-height:1.5;margin:4px 0 14px;max-width:760px}
.cm-grid2{display:grid;grid-template-columns:1.1fr 1fr;gap:22px;align-items:start}
.cm-faits{margin:6px 0 0;padding-left:18px}.cm-faits li{margin:0 0 8px;line-height:1.5}
.cm-viz{background:#FCFBF8;border:1px solid var(--line2);border-radius:12px;padding:14px}
.cm-nuance{margin:14px 0 0;background:#FFF8EC;border-left:3px solid #E59A3A;border-radius:0 10px 10px 0;padding:10px 14px}
.cm-nuance p{margin:0}.cm-nuance .kick{color:#9A5B00;margin-bottom:4px}
.cm-foot{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-top:14px}
.cm-go{display:flex;flex-wrap:wrap;gap:0;margin-top:6px}.cm-go .chip{margin:0 6px 6px 0}
details.cm-src summary,details.cm-meth summary{cursor:pointer;font-size:13px;color:var(--grey);font-weight:600}
.cm-srcs{margin:8px 0 0;padding-left:18px;font-size:12.5px;line-height:1.5}.cm-srcs li{margin:0 0 4px}
.cm-src{max-width:100%}
.cm-bars{display:flex;flex-direction:column;gap:9px}
.cm-bar{display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;gap:10px;align-items:center;font-size:13px}
.cm-bl{color:var(--grey);line-height:1.25}.cm-bt{height:12px;background:var(--soft);border-radius:99px;overflow:hidden}.cm-bt i{display:block;height:100%;border-radius:99px}
.cm-bv{font-family:var(--mono);font-size:12.5px;white-space:nowrap}
.cm-vnote{font-size:12px;color:var(--light);margin:10px 0 0;line-height:1.4}
.cm-years{display:grid;grid-template-columns:repeat(28,1fr);gap:3px}
.cm-years i{display:block;aspect-ratio:1;border-radius:3px}.cm-years i.p,.cm-yleg i.p{background:var(--g)}.cm-years i.n,.cm-yleg i.n{background:var(--o)}
.cm-yleg{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--light);margin-top:8px;flex-wrap:wrap}.cm-yleg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 8px;vertical-align:-1px}
.cm-dots{display:grid;grid-template-columns:repeat(20,1fr);gap:4px}.cm-dots i{display:block;aspect-ratio:1;border-radius:50%;background:#C9C2B4}.cm-dots i.g{background:var(--g)}
.cm-stack{display:flex;height:22px;border-radius:6px;overflow:hidden}.cm-stack i{display:block;height:100%}
.cm-sleg{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:10px;font-size:12.5px;color:var(--grey)}.cm-sleg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}
.cm-more{margin:12px 0 0}.cm-btn{display:inline-block;padding:9px 16px;font-weight:600;font-size:14px}
.cm-end h2{font-size:19px;margin:0 0 6px}
/* comparateur */
.cm-sim{position:relative}
.cm-ctl{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between}
.cm-seg{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;background:var(--soft);border-radius:10px;padding:3px}
.cm-seg button{white-space:nowrap;border:0;background:transparent;border-radius:8px;padding:6px 12px;font-weight:600;font-size:13.5px;cursor:pointer;color:var(--grey)}
.cm-seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.cm-seg-m span{font-size:12.5px;color:var(--light);padding:0 8px 0 4px}
.cm-range{display:grid;grid-template-columns:1fr auto auto;gap:2px 10px;align-items:center;margin:12px 0 4px;font-size:13px;color:var(--grey)}
.cm-range input{grid-column:1/-1;width:100%;accent-color:var(--ink)}.cm-range small{display:none}
.cm-lead{margin:10px 0 12px;font-size:14.5px;line-height:1.5}
.cm-ks{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cm-k{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--card)}
.cm-k small{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--grey);font-weight:600}
.cm-k b{display:block;font-family:var(--mono);font-size:21px;margin:4px 0 2px;letter-spacing:-.02em}
.cm-k span{font-size:12px;color:var(--grey);line-height:1.35;display:block}
.cm-k em{font-style:normal;font-weight:700;font-family:var(--mono)}.cm-k em.up{color:var(--up)}.cm-k em.down{color:var(--down)}
.cm-k-act{border-color:#9CC9B2;background:#F3FAF6}
.cm-k i,.cm-leg i,.cm-tip i{display:inline-block;width:10px;height:10px;border-radius:2px;flex:none}
.cm-k i.d,.cm-leg i.d,.cm-tip i.d{height:3px;border-radius:0;width:12px}
.cm-chart{margin:16px 0 4px;padding-left:46px}
.cm-plot{position:relative;height:230px;touch-action:pan-y}
.cm-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.cm-grid{position:absolute;left:0;right:0;border-top:1px solid var(--line2);height:0}
.cm-grid em{position:absolute;right:100%;margin-right:8px;transform:translateY(-50%);font-style:normal;font-family:var(--mono);font-size:10.5px;color:var(--light);white-space:nowrap}
.cm-xs{position:relative;height:18px;margin-top:6px;font-family:var(--mono);font-size:10.5px;color:var(--light)}
.cm-xs span{position:absolute;transform:translateX(-50%);white-space:nowrap}.cm-xs span:first-child{transform:none}.cm-xs span:last-child{transform:translateX(-100%)}
.cm-vl{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--ink);pointer-events:none}
.cm-tip{position:absolute;top:4px;z-index:3;background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);padding:8px 10px;font-size:12px;min-width:180px;pointer-events:none}
.cm-tip b{display:block;margin-bottom:4px}.cm-tip span{display:flex;align-items:center;gap:6px;justify-content:space-between}.cm-tip span i{margin-right:2px}.cm-tip em{font-style:normal;font-family:var(--mono);margin-left:auto}
.cm-leg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--grey);margin:8px 0 0}.cm-leg span{display:inline-flex;align-items:center;gap:6px}
.cm-pire{font-size:13.5px;margin:12px 0 0;line-height:1.5}
.cm-warn{font-size:12.5px;color:var(--grey);background:var(--soft);border-radius:10px;padding:9px 12px;margin:12px 0 0;line-height:1.45}
details.cm-meth{margin-top:12px}details.cm-meth p{font-size:13px;line-height:1.5;color:var(--grey)}
.cm-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}.cm-cols .panel{margin:0 0 18px}
.cm-tab td,.cm-tab th{white-space:nowrap}.cm-tab sup{color:var(--light)}
/* pourquoi */
.cm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}
.cm-stats div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.cm-stats b{display:block;font-family:var(--serif);font-size:28px;font-weight:800;line-height:1.1}.cm-stats span{font-size:12.5px;color:var(--grey)}
.cm-avs{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}
.cm-av h3{font-size:18px;margin:6px 0 6px;line-height:1.25}.cm-av p{margin:0 0 8px;line-height:1.5}
.cm-pv{border-top:1px solid var(--line2);margin-top:12px;padding-top:10px}
.cm-demo .cm-seg{margin-bottom:12px}.cm-demo .cm-seg button{padding:5px 10px;font-size:12.5px}
.cm-demo-co{display:flex;gap:10px;align-items:center;margin-bottom:10px}.cm-demo-co small{display:block;color:var(--grey);font-size:12px;line-height:1.35}
.cm-drs{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.cm-dr{display:grid;grid-template-columns:1fr auto 14px;grid-template-rows:auto auto;column-gap:10px;align-items:center;border:1px solid var(--line2);border-radius:10px;padding:7px 10px;font-size:13px}
.cm-dr b{font-family:var(--mono);font-size:13.5px}.cm-dr small{grid-column:1/3;color:var(--light);font-size:11.5px}.cm-dr .cm-dot{grid-row:1/3;grid-column:3}
.cm-dot{display:inline-block;width:11px;height:11px;border-radius:50%}.cm-dot.g{background:var(--g)}.cm-dot.o{background:var(--o)}.cm-dot.n{background:var(--n)}
.cm-calc .cm-q{font-family:var(--serif);font-weight:700;font-size:15.5px;margin:0 0 6px}.cm-calc .cm-a{margin:0 0 4px}.cm-calc small{color:var(--light);font-size:12px;display:block;margin-bottom:8px}
.cm-quota{display:flex;flex-direction:column;gap:6px}.cm-quota div{display:grid;grid-template-columns:1fr auto;column-gap:10px;border:1px solid var(--line2);border-radius:10px;padding:8px 10px;font-size:13px}
.cm-quota b{grid-column:1}.cm-quota span{grid-column:1;color:var(--light);font-size:12px}.cm-quota em{grid-column:2;grid-row:1/3;align-self:center;font-style:normal;font-weight:600;font-size:12.5px;text-align:right}.cm-quota .cm-me2{background:#F3FAF6;border-color:#9CC9B2}
.cm-mini3{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:8px}
.cm-mini3 div{background:var(--soft);border-radius:10px;padding:9px 11px}.cm-mini3 b{display:block;font-family:var(--mono);font-size:18px}.cm-mini3 span{font-size:12px;color:var(--grey);line-height:1.3;display:block}
table.cm-cmp th[scope=row]{font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:13px;font-weight:600;text-align:left;min-width:180px;max-width:240px;white-space:normal;color:var(--ink);background:transparent}
table.cm-cmp td{vertical-align:top;min-width:120px;white-space:normal;font-size:13px}
table.cm-cmp td small{display:block;color:var(--light);font-size:11.5px;line-height:1.35;margin-top:2px}
table.cm-cmp thead th{text-transform:none;letter-spacing:0;font-size:12.5px;color:var(--ink)}
table.cm-cmp .cm-me{background:#F3FAF6}
.cm-y{color:var(--g);font-weight:700}.cm-x{color:var(--o);font-weight:700}.cm-p{color:#B07A12;font-weight:700}.cm-u{color:var(--light)}
/* accueil */
.cm-teaser{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.cm-tz{display:flex;flex-direction:column;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.cm-tz:hover{border-color:var(--ink)}.cm-tz b{font-family:var(--serif);font-size:16px;line-height:1.25}.cm-tz span:not(.cm-v){font-size:13px;color:var(--grey);line-height:1.4}.cm-tz .cm-v{align-self:flex-start}
@media (max-width:760px){
  .cm-som{grid-template-columns:1fr}
  .cm-grid2,.cm-cols,.cm-avs{grid-template-columns:1fr}
  .cm-ks{grid-template-columns:1fr}
  .cm-k{display:grid;grid-template-columns:1fr auto;align-items:baseline;column-gap:10px}.cm-k b{margin:0;font-size:18px;grid-row:1/3;grid-column:2;align-self:center}.cm-k span{grid-column:1}
  .cm-stats{grid-template-columns:1fr 1fr}
  .cm-ih{padding:16px 16px 2px;gap:10px}.cm-ib{padding:4px 16px 16px}.cm-myth{font-size:19px}.cm-ih .cm-n{font-size:18px}
  .cm-rep{font-size:15px}
  .cm-plot{height:200px}.cm-chart{padding-left:44px}.cm-grid em{font-size:10px;margin-right:6px}.cm-seg-m span{display:none}.cm-seg button{padding:6px 8px}
  .cm-ctl{flex-direction:column;align-items:stretch}.cm-seg{justify-content:space-between}.cm-seg button{flex:1}
  .cm-seg-co{justify-content:flex-start}.cm-seg-co button{flex:none}
  .cm-bar{grid-template-columns:minmax(80px,40%) 1fr auto}
}
</style>`);
