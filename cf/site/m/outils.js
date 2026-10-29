/* Module « outils » de bilan. : chargé après le script principal de index.html (et après m/comparer.js).
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Contenu :
   - /classements : classements calculés sur les comptes (points forts, en tête de son secteur, croissance régulière,
     dividende relevé, rentables et peu endettées), filtres, top 3 gratuit, liste complète avec Premium ;
   - /dividendes (pageDividendes remplacée) : calendrier, plus hauts rendements avec garde-fou, dividendes relevés,
     simulateur « combien je toucherais » en PEA ou compte-titres, export .ics, explication du détachement ;
   - /decouvertes et outilsDecouverteHTML() (pour l'accueil) : une sélection quotidienne d'entreprises moins connues ;
   - /comparer : galerie de comparaisons toutes prêtes, classées par thème (cmprRenderBody enveloppée, m/comparer.js intact).
   Données : R.companies (dernier exercice), cours (PX via valo), agenda (AG) et /data/historique.json
   (plusieurs exercices, fabriqué par data/outils_historique.mjs au moment de la construction). */

/* ---------- Historique des comptes (plusieurs exercices) ---------- */
let OUT_H = null, OUT_HP = null, OUT_ST = null;
function outHist() {
  if (!OUT_HP) OUT_HP = fetch("/data/historique.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => { OUT_H = (j && j.h) || {}; OUT_ST = null; return OUT_H; });
  return OUT_HP;
}
// Statistiques calculées une fois pour toutes les entreprises : régularité des ventes, du dividende, rang dans le secteur.
function outStats() {
  if (OUT_ST) return OUT_ST;
  const H = OUT_H || {}, S = {}, grp = {};
  for (const c of R.companies) {
    const h = H[c.id]; if (c.missing || !h) continue;
    const n = h.n, ca = h.ca, d = h.d, dp = h.dp, nt = h.nt, bank = isBank(c);
    let caUp = 0; for (let i = n - 1; i > 0 && ca[i] > 0 && ca[i - 1] > 0 && ca[i] > ca[i - 1] * 1.001; i--) caUp++;
    const i0 = ca.findIndex(v => v > 0), span = n - 1 - i0;
    const cagr = i0 >= 0 && span >= 2 && ca[n - 1] > 0 ? Math.pow(ca[n - 1] / ca[i0], 1 / span) - 1 : null;
    let divUp = 0;
    for (let i = n - 1; i > 0; i--) {
      if (!(d[i] > 0 && d[i - 1] > 0 && d[i] > d[i - 1] * 1.005 && d[i] < d[i - 1] * 3)) break;
      if (dp[i] > 0 && dp[i - 1] > 0 && dp[i] < dp[i - 1] * 0.9) break; // montant total versé en baisse : division d'action ou erreur de source
      divUp++;
    }
    const dI0 = d.findIndex(v => v > 0), dSpan = n - 1 - dI0;
    const dCagr = divUp >= 2 && dI0 >= 0 && dSpan >= 2 && d[n - 1] > 0 ? Math.pow(d[n - 1] / d[dI0], 1 / dSpan) - 1 : null;
    const netN = nt.filter(v => v != null).length, profitAll = netN >= 3 && nt.every(v => v == null || v > 0);
    S[c.id] = { n, y0: h.y, caUp, cagr, divUp, dCagr, profitAll, netN, top: 0, topN: 0, best: 0, ca, d };
    // rang dans le secteur, exercice par exercice : marge d'exploitation (banques et assurances : rentabilité des capitaux propres)
    for (let i = 0; i < n; i++) {
      const v = bank ? (h.eq[i] > 0 && h.nt[i] != null ? h.nt[i] / h.eq[i] : null) : (ca[i] > 0 && h.eb[i] != null ? h.eb[i] / ca[i] : null);
      if (v == null || !isFinite(v) || Math.abs(v) > 3) continue;
      const k = c.sector + (bank ? "|b" : "") + "|" + (h.y + i); (grp[k] = grp[k] || []).push([c.id, v]);
    }
  }
  for (const l of Object.values(grp)) {
    if (l.length < 10) continue;
    l.sort((a, b) => b[1] - a[1]);
    const cut = Math.max(1, Math.ceil(l.length * 0.1));
    l.forEach(([id], r) => { const s = S[id]; s.topN++; if (r < cut) s.top++; if (r === 0) s.best++; });
  }
  return OUT_ST = S;
}

/* ---------- Petites aides ---------- */
const OUT_REG = [["", "Toutes les régions"], ["fr", "France"], ["eu", "Europe (France comprise)"], ["us", "États-Unis"], ["monde", "Reste du monde"]];
const OUT_TAILLE = [["", "Toutes les tailles"], ["g", "Grandes (plus de 10 Md€)"], ["m", "Moyennes (1 à 10 Md€)"], ["p", "Petites (moins de 1 Md€)"]];
const outRegOk = (c, r) => !r || (r === "fr" ? c.region === "FR" : r === "eu" ? c.region === "FR" || c.region === "EU" : r === "us" ? c.region === "US" : c.region === "MONDE");
function outTailleOk(c, t) { if (!t) return true; const v = valo(c), k = v && v.capE; if (!(k > 0)) return false; return t === "g" ? k >= 1e10 : t === "m" ? k >= 1e9 && k < 1e10 : k < 1e9; }
const outN = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const outAns = n => n > 1 ? `${n} années de suite` : "sur la dernière année";
const outE100 = v => F0.format(v * 100) + " €";
function outCaEur(c) { return c.ca > 0 ? toEur(c.ca, c.currency) : null; } // ventes en millions d'euros
function outCouv(c) { // le dividende est-il couvert par le bénéfice du dernier exercice ?
  if (!(c.divPaid > 0.5)) return null;
  if (!(c.net > 0)) return { k: "non", t: "Non couvert", d: "versé alors que l'entreprise est en perte" };
  const p = c.divPaid / c.net;
  return p <= 0.9 ? { k: "oui", t: "Couvert", d: `${F0.format(p * 100)} % du bénéfice versé` } : p <= 1.05 ? { k: "juste", t: "Tout juste", d: `${F0.format(p * 100)} % du bénéfice versé` } : { k: "non", t: "Non couvert", d: `${F0.format(p * 100)} % du bénéfice versé` };
}
const outCouvTag = c => { const x = outCouv(c); return x ? `<span class="out-cv out-cv-${x.k}" title="${esc(x.d)}">${x.t}</span>` : ""; };
const outPea = c => peaOk(c) ? `<span class="out-pea">PEA</span>` : "";
function outSelect(id, opts, val, label) { return `<label class="out-sel"><span>${label}</span><select id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === val ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`; }
const outSecOpts = () => [["", "Tous les secteurs"], ...Object.entries(R.sectors).sort((a, b) => a[1].localeCompare(b[1], "fr"))];
function outQS(o) { const q = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v) q.set(k, v); }); const s = q.toString(); return s ? "?" + s : ""; }
const OUT_ICON = {
  rang: `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/></svg>`,
  cal: `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  dl: `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>`,
  lock: `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  info: `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>`,
  loupe: `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
};
const OUT_NOADV = `<div class="out-noadv">${OUT_ICON.info}<p><b>Ce n'est pas une recommandation d'achat.</b> Ces listes trient des faits tirés des comptes publiés. Une entreprise en tête peut avoir une action chère, et les comptes passés ne disent rien de l'avenir.</p></div>`;

/* ---------- 1. Classements par points forts ---------- */
const OUT_CL = {
  points: { t: "Le plus de points forts", s: "Points forts moins points de vigilance, sur les critères de la fiche", icon: "✓",
    how: "Chaque entreprise est jugée sur les mêmes critères que sa fiche (croissance, marge, bénéfice, rentabilité, dette, argent disponible, dividende), face à la médiane de son secteur. Le classement retient le nombre de points forts moins le nombre de points de vigilance, puis le nombre de points forts." },
  tete: { t: "Souvent en tête de leur secteur", s: "Dans les 10 % les plus rentables de leur secteur, exercice après exercice", icon: "★",
    how: "Pour chaque exercice publié (jusqu'à cinq), les entreprises d'un même secteur sont rangées par marge d'exploitation (banques et assurances : rentabilité des capitaux propres). Le classement compte le nombre d'exercices passés dans les 10 % les meilleures. Il faut au moins 10 entreprises comparables par secteur et par année." },
  croissance: { t: "Croissance régulière", s: "Ventes en hausse chaque année, sans trou d'air", icon: "↗",
    how: "Nombre d'années de suite où les ventes ont augmenté, en partant du dernier exercice, puis croissance moyenne par an sur toute la période disponible. Les ventes sont lues dans la devise des comptes : l'effet du change n'y est pas." },
  dividende: { t: "Dividende relevé", s: "Dividende par action en hausse plusieurs années de suite", icon: "€",
    how: "Nombre d'années de suite où le dividende par action a augmenté (de plus de 0,5 %), en partant du dernier exercice. Une hausse n'est pas comptée si le montant total versé a baissé en même temps (division d'action ou donnée douteuse). Le badge « Couvert » indique si le dernier dividende a été payé avec le bénéfice." },
  solides: { t: "Rentables et peu endettées", s: "Bénéficiaires chaque année, peu ou pas de dette", icon: "◆",
    how: "Entreprises bénéficiaires à chaque exercice publié (au moins trois), dont la dette nette est nulle ou inférieure à une année de résultat d'exploitation avant amortissements. Classées par marge d'exploitation. Les banques et assurances ne sont pas comprises : la dette est leur matière première." },
};
function outClRows(k, f) {
  const S = outStats();
  let l = R.companies.filter(c => !c.missing && (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)) && outTailleOk(c, f.t));
  const val = [];
  for (const c of l) {
    const st = S[c.id], m = ratios(c), q = quick(c);
    if (k === "points") { if (!q || q.fort + q.moyen + q.vig < 5) continue; val.push({ c, q, a: q.fort - q.vig, b: q.fort, d: st ? st.top * 2 + st.caUp + st.divUp : 0, e: m.marge || 0 }); }
    else if (k === "tete") { if (!st || st.top < 2 || st.topN < 3) continue; val.push({ c, q, st, a: st.top / st.topN, b: st.top, d: st.best }); }
    else if (k === "croissance") { if (!st || st.caUp < 2 || st.cagr == null) continue; val.push({ c, q, st, a: st.caUp, b: st.cagr, d: 0 }); }
    else if (k === "dividende") { if (!st || st.divUp < 2) continue; val.push({ c, q, st, a: st.divUp, b: st.dCagr || 0, d: 0 }); }
    else if (k === "solides") {
      if (isBank(c) || !st || !st.profitAll || m.marge == null || m.marge <= 0) continue;
      const lowDebt = c.netDebt != null && (c.netDebt <= 0 || (c.ebitda > 0 && c.netDebt / c.ebitda < 1)); if (!lowDebt) continue;
      val.push({ c, q, st, a: m.marge, b: -(c.netDebt / Math.max(1, c.ebitda || 1)), d: 0 });
    }
  }
  return val.sort((x, y) => y.a - x.a || y.b - x.b || y.d - x.d || (y.e || 0) - (x.e || 0) || x.c.name.localeCompare(y.c.name, "fr"));
}
function outClWhy(k, x) {
  const c = x.c, m = ratios(c), st = x.st, med = MED[c.sector] || {};
  if (k === "points") return `${outN(x.q.fort, "point fort", "points forts")}, ${x.q.vig ? outN(x.q.vig, "point de vigilance", "points de vigilance") : "aucun point de vigilance"} sur ${x.q.fort + x.q.moyen + x.q.vig} critères (comptes ${esc(c.year || "")})`;
  if (k === "tete") return `Dans les 10 % les meilleures de son secteur ${x.st.top} exercice${x.st.top > 1 ? "s" : ""} sur ${x.st.topN}${x.st.best ? `, première ${x.st.best} fois` : ""}${isBank(c) ? (m.roe != null ? ` · rentabilité ${pct(m.roe, 0, false)}` : "") : m.marge != null ? ` · marge ${pct(m.marge, 0, false)}${med.marge != null ? ` (secteur : ${pct(med.marge, 0, false)})` : ""}` : ""}`;
  if (k === "croissance") return `Ventes en hausse ${outAns(st.caUp)}, ${sgn(st.cagr, 1)} par an en moyenne depuis ${st.y0 + st.ca.findIndex(v => v > 0)}`;
  if (k === "dividende") { const v = valo(c); return `Dividende relevé ${outAns(st.divUp)}${st.dCagr != null ? `, ${sgn(st.dCagr, 1)} par an` : ""}${v && v.yld ? ` · rendement ${pct(v.yld, 1, false)}` : ""}`; }
  if (k === "solides") return `Bénéficiaire ${st.netN} exercices sur ${st.netN} · ${c.netDebt <= 0 ? "pas de dette nette" : "dette nette inférieure à un an de résultat"} · marge ${pct(m.marge, 0, false)}${med.marge != null ? ` (secteur : ${pct(med.marge, 0, false)})` : ""}`;
  return "";
}
function outClRow(k, x, i) {
  const c = x.c;
  return `<a class="out-row" href="/entreprise/${c.id}"><span class="out-rk${i < 3 ? " top" : ""}">${i + 1}</span>${logo(c, 36)}<span class="out-rt"><b>${esc(c.name)}</b><small>${esc([secName(c), regName(c)].filter(Boolean).join(" · "))} ${outPea(c)}</small><span class="out-why">${outClWhy(k, x)}</span></span><span class="out-rv">${x.q ? pills(x.q) : ""}${k === "dividende" ? outCouvTag(c) : ""}</span></a>`;
}
const OUT_CRIT = { points: "Critères : croissance, marge, bénéfice, rentabilité, dette, argent disponible et dividende, chacun face à la médiane du secteur.",
  tete: "Critère : marge d'exploitation (rentabilité des capitaux propres pour les banques), rang dans le secteur sur cinq exercices au plus.",
  croissance: "Critère : années de suite avec des ventes en hausse, puis croissance moyenne par an.",
  dividende: "Critère : années de suite avec un dividende par action en hausse, contrôlé par le montant total versé.",
  solides: "Critères : bénéficiaire à chaque exercice publié, dette nette inférieure à un an de résultat, puis marge d'exploitation." };
function outClScore(k, x) { // le score seul, sans rien qui permette de reconnaître l'entreprise
  const st = x.st, m = ratios(x.c);
  if (k === "points") return `${outN(x.q.fort, "point fort", "points forts")}, ${outN(x.q.vig, "point de vigilance", "points de vigilance")}`;
  if (k === "tete") return `Dans les 10 % les meilleures ${st.top} exercice${st.top > 1 ? "s" : ""} sur ${st.topN}`;
  if (k === "croissance") return `Ventes en hausse ${outAns(st.caUp)}`;
  if (k === "dividende") return `Dividende relevé ${outAns(st.divUp)}`;
  if (k === "solides") return `Bénéficiaire ${st.netN} exercices sur ${st.netN}, marge de ${pct(m.marge, 0, false)}`;
  return "";
}
function outClBlur(k, x, i) {
  return `<div class="out-row out-blur" aria-label="Place ${i + 1} réservée à Premium"><span class="out-rk top">${i + 1}</span><span class="lgph" aria-hidden="true"></span><span class="out-rt"><b aria-hidden="true">Entreprise masquée</b><small aria-hidden="true">Secteur · Région</small><span class="out-why">${outClScore(k, x)}</span></span><span class="out-rv">${OUT_ICON.lock}</span></div>`;
}
async function pageClassements() {
  setTitle("Classements des entreprises"); setNav("ent");
  if (!R) return;
  app.innerHTML = `<div class="empty">Chargement des comptes de plusieurs années…</div>`;
  await Promise.all([PXP, outHist(), premStatus()]);
  if (location.pathname !== "/classements") return;
  const P = new URLSearchParams(location.search);
  const f = { c: OUT_CL[P.get("c")] ? P.get("c") : "points", s: R.sectors[P.get("s")] ? P.get("s") : "", r: OUT_REG.some(([v]) => v && v === P.get("r")) ? P.get("r") : "", pea: P.get("pea") === "1" ? "1" : "", t: OUT_TAILLE.some(([v]) => v && v === P.get("t")) ? P.get("t") : "" };
  const prem = isPrem();
  app.innerHTML = `<div class="out-page"><div class="crumbs"><a href="/entreprises">Entreprises</a> › Classements</div>
    <h1 class="pagetitle">Les classements</h1>
    <p class="pagesub">Quelles entreprises cumulent le plus de points forts, restent en tête de leur secteur ou relèvent leur dividende chaque année ? Tout est calculé à partir des comptes officiels publiés, avec la méthode affichée.</p>
    <div class="out-tabs scroll-x" role="tablist">${Object.entries(OUT_CL).map(([k, v]) => `<button type="button" role="tab" data-k="${k}" aria-selected="${k === f.c}" class="${k === f.c ? "on" : ""}"><i>${v.icon}</i><b>${esc(v.t)}</b><small>${esc(v.s)}</small></button>`).join("")}</div>
    <section class="panel"><div class="pb out-filt">${outSelect("out-s", outSecOpts(), f.s, "Secteur")}${outSelect("out-r", OUT_REG, f.r, "Région")}${outSelect("out-t", OUT_TAILLE, f.t, "Taille en Bourse")}<label class="out-chk"><input type="checkbox" id="out-pea"${f.pea ? " checked" : ""}> Éligibles au PEA</label></div></section>
    <div id="out-cl"></div></div>`;
  /* Aperçu sans Premium : les 3 premières places sont floutées (nom, logo et lien absents de la page, seul le score reste),
     les places 4 à 15 sont visibles pour comprendre le classement. Ce n'est pas une restriction d'accès au sens strict :
     les comptes de chaque entreprise sont publics et consultables gratuitement sur sa fiche, et le calcul est fait dans le
     navigateur. Premium apporte la liste triée complète (50 places) ; la méthode, les critères et les limites restent visibles pour tous. */
  const draw = () => {
    const k = f.c, D = OUT_CL[k], rows = outClRows(k, f), lim = prem ? 50 : 15, flou = prem ? 0 : Math.min(3, Math.max(0, rows.length - 1));
    const shown = rows.slice(0, lim), more = rows.length - shown.length, vis = shown.slice(flou);
    history.replaceState(null, "", "/classements" + outQS({ c: k === "points" ? "" : k, s: f.s, r: f.r, pea: f.pea, t: f.t }));
    $("#out-cl").innerHTML = `<section class="panel"><div class="ph"><h2>${esc(D.t)}</h2><span class="light" style="font-size:12.5px">${rows.length ? `${F0.format(rows.length)} entreprise${rows.length > 1 ? "s" : ""} retenue${rows.length > 1 ? "s" : ""}` : ""}</span></div>
      <div class="pb" style="padding-top:6px">
      <div class="out-crit"><div><em>Ce qui est mesuré</em><p>${esc(D.s)}. ${esc(OUT_CRIT[k])}</p></div><div><em>Ce que cela ne dit pas</em><p>Ni si l'action est chère, ni ce qu'elle fera. Les comptes passés ne garantissent rien, et une entreprise hors classement peut avoir simplement des comptes manquants.</p></div></div>
      ${rows.length ? `<div class="out-list">${shown.slice(0, flou).map((x, i) => outClBlur(k, x, i)).join("")}${vis.map((x, i) => outClRow(k, x, i + flou)).join("")}</div>` : `<div class="empty">Aucune entreprise ne remplit ces conditions avec ces filtres. Élargissez le secteur ou la région.</div>`}
      ${flou ? `<div class="out-apercu">${OUT_ICON.lock}<div><b>Aperçu : les ${flou} premières places sont réservées à Premium</b><span>Les places suivantes sont visibles pour que vous voyiez comment le classement fonctionne. Les comptes de chaque entreprise restent gratuits sur sa fiche : Premium vous donne la liste triée complète (jusqu'à 50 places), avec tous les filtres.</span></div><a class="btn" href="/premium">Voir le classement complet</a></div>` : ""}
      ${more > 0 && prem ? `<p class="note">${F0.format(more)} autres entreprises remplissent les conditions. Affinez avec les filtres pour les voir.</p>` : ""}
      ${vis.length >= 2 ? `<p style="margin:14px 0 0"><a class="lnk" href="/comparer?ids=${vis.slice(0, prem ? 5 : 3).map(x => x.c.id).join(",")}">Comparer les ${Math.min(vis.length, prem ? 5 : 3)} premières affichées critère par critère →</a></p>` : ""}
      ${OUT_NOADV}</div></section>
      <section class="panel"><details class="acc"><summary><b>Comment ce classement est calculé</b><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 16px"><p>${esc(D.how)}</p>
        <p>Les comptes viennent des rapports annuels officiels (format ESEF en Europe, SEC aux États-Unis), lus par le site. Les entreprises dont les comptes ne sont pas disponibles n'apparaissent pas. ${medBtnSafe()}</p>
        <p><b>Limites.</b> Un seul exercice peut être exceptionnel (cession, crise). Les ventes sont dans la devise des comptes, sans effet de change. Les petites entreprises ont souvent moins d'années publiées et entrent moins facilement dans les classements sur plusieurs exercices. L'éligibilité au PEA suit la règle du site : siège dans l'Union européenne ou l'EEE et impôt sur les sociétés (les foncières exonérées sont exclues).</p>
        <p class="muted">Une bonne place dit « ces comptes ressortent sur ce critère ». Elle ne dit ni que l'action est bon marché, ni qu'elle montera.</p></div></details></section>`;
  };
  draw();
  $$(".out-tabs button", app).forEach(b => b.onclick = () => { f.c = b.dataset.k; $$(".out-tabs button", app).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); draw(); });
  $("#out-s").onchange = e => { f.s = e.target.value; draw(); };
  $("#out-r").onchange = e => { f.r = e.target.value; draw(); };
  $("#out-t").onchange = e => { f.t = e.target.value; draw(); };
  $("#out-pea").onchange = e => { f.pea = e.target.checked ? "1" : ""; draw(); };
}
function medBtnSafe() { return typeof medBtn === "function" ? medBtn("Qu'est-ce que la médiane ?") : ""; }

/* ---------- 2. Dividendes ---------- */
function outDivKind(e) { const l = e.label || ""; return /enregistrement/i.test(l) ? "rec" : /paiement|versement|mise en paiement/i.test(l) ? "pay" : /détach|dernier jour|ex-div/i.test(l) ? "det" : "autre"; }
const OUT_DK = { det: ["Détachement", "Pour recevoir ce dividende, il faut détenir l'action la veille au soir de cette date (ou à la date indiquée)."], pay: ["Paiement", "Le jour où l'argent arrive sur le compte des actionnaires."], rec: ["Enregistrement", "Aux États-Unis : il faut être inscrit comme actionnaire à cette date. En pratique, acheter au moins un jour de Bourse avant."], autre: ["Dividende", ""] };
function outDivAmt(e) { const m = (e.label || "").match(/\(([\d\s,.]+)\s*(€|\$|£|CHF|kr|NOK)\)/); return m ? m[1].trim() + " " + m[2] : ""; }
function outDivEvents(f) {
  return AG.events.filter(e => e.date >= TODAY && RBY[e.id] && /ividende|acompte|détachement|solde/i.test(e.type + " " + e.label))
    .filter(e => { const c = RBY[e.id]; return (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)) && (!f.fav || f.favIds.has(c.id)); })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
function outDivCal(list0, all) {
  if (!list0.length) return `<div class="empty">Aucune date de dividende annoncée avec ces filtres pour l'instant.</div>`;
  const list = all ? list0 : list0.slice(0, 20), rest = list0.length - list.length;
  const byM = {}; list.forEach(e => (byM[e.date.slice(0, 7)] = byM[e.date.slice(0, 7)] || []).push(e));
  return Object.entries(byM).map(([mk, l]) => `<h3 class="out-mh">${MOISL[+mk.slice(5) - 1].replace(/^./, x => x.toUpperCase())} ${mk.slice(0, 4)} <span>${outN(l.length, "date", "dates")}</span></h3><div class="out-cal">${l.map(e => {
    const c = RBY[e.id], k = outDivKind(e), [y, m, d] = e.date.split("-"), v = valo(c), amt = outDivAmt(e);
    return `<div class="out-ev"><div class="out-d"><b>${+d}</b>${MOIS[+m - 1]}</div><a class="out-evc" href="/entreprise/${c.id}">${logo(c, 30)}<span><b>${esc(c.name)}</b><small>${esc(e.label)}</small></span></a><span class="out-k out-k-${k}" title="${esc(OUT_DK[k][1])}">${OUT_DK[k][0]}</span><span class="out-evv">${amt ? `<b class="num">${esc(amt)}</b>` : ""}${v && v.yld ? `<small>rend. ${pct(v.yld, 1, false)}</small>` : ""}</span>${e.source ? `<a class="out-src" href="${esc(e.source)}" target="_blank" rel="noopener" title="Source : ${esc(e.source.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}">source</a>` : ""}</div>`; }).join("")}</div>`).join("") + (rest > 0 ? `<button type="button" class="btn ghost out-more" id="out-more">Voir les ${rest} autres dates</button>` : "");
}
function outDivTop(f) {
  return R.companies.filter(c => !c.missing && (!f.cv || (outCouv(c) || {}).k === "oui") && (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)))
    .map(c => ({ c, v: valo(c) })).filter(x => x.v && x.v.yld > 0.001 && x.v.capE > 2e8).sort((a, b) => b.v.yld - a.v.yld);
}
function outDivRow(x, i, S) {
  const c = x.c, st = S[c.id], cv = outCouv(c);
  return `<tr><td class="out-n">${i + 1}</td><td><a class="out-tc" href="/entreprise/${c.id}">${logo(c, 26)}<span><b>${esc(c.name)}</b><small>${esc(secName(c))} ${outPea(c)}</small></span></a></td><td class="num"><b>${pct(x.v.yld, 1, false)}</b></td><td>${cv ? `<span class="out-cv out-cv-${cv.k}">${cv.t}</span><small class="out-cvd">${esc(cv.d)}</small>` : `<span class="light">–</span>`}</td><td class="num">${st && st.divUp >= 1 ? `${st.divUp} an${st.divUp > 1 ? "s" : ""}` : `<span class="light">–</span>`}</td></tr>`;
}
function outDivSim(c, m, acct) {
  const v = valo(c);
  if (!v || !v.yld) return `<p class="muted">Pas de rendement calculable pour ${esc(c.name)} : cours ou dividende non disponible.</p>`;
  const brut = m * v.yld, us = c.region === "US" || (c.isin || "").startsWith("US"), fr = (c.isin || "").startsWith("FR"), pea = peaOk(c);
  let net, lines = [];
  if (acct === "pea" && !pea) return `<p class="out-warn">${esc(c.name)} n'est pas éligible au PEA (seules les entreprises de l'Union européenne et de l'Espace économique européen le sont). Choisissez le compte-titres pour voir le calcul.</p>`;
  if (acct === "pea") {
    net = brut;
    lines.push(["Impôt français à l'encaissement", "0 €", "Le dividende reste dans le PEA et peut être réinvesti."]);
    if (!fr) lines.push(["Retenue du pays de l'entreprise", "possible", "Le pays de l'entreprise peut prélever une retenue à la source, que le PEA ne permet pas de récupérer : le montant reçu peut être plus faible."]);
    lines.push(["Au retrait (après 5 ans)", pct(RATES.ps, 1, false), "Seuls les prélèvements sociaux sont dus sur les gains, au moment du retrait."]);
  } else {
    if (us) { net = brut * (1 - 0.15 - RATES.ps); lines.push(["Retenue américaine", "15 %", "Avec le formulaire W-8BEN (proposé par la plupart des courtiers). Elle remplace l'impôt sur le revenu français de 12,8 % grâce au crédit d'impôt."], ["Prélèvements sociaux", pct(RATES.ps, 1, false), "Payés en France chaque année."]); }
    else { net = brut * (1 - RATES.pfu); lines.push(["Prélèvement forfaitaire unique", pct(RATES.pfu, 1, false), `Impôt sur le revenu 12,8 % et prélèvements sociaux ${pct(RATES.ps, 1, false)}, prélevés chaque année.`]); if (!fr) lines.push(["Retenue du pays de l'entreprise", "possible", "Une retenue à la source étrangère peut s'ajouter ; elle se déduit en partie de l'impôt français."]); }
  }
  const nb = v.p && v.p.p > 0 ? Math.floor(m / v.p.p) : null;
  return `<div class="out-simr"><div class="out-big"><span>Dividende annuel brut</span><b class="num">${eur(brut, 0)}</b><small>${pct(v.yld, 2, false)} de ${eur(m, 0)}</small></div><div class="out-big out-net"><span>Ce qui reste ${acct === "pea" ? "dans le PEA" : "après impôts"}</span><b class="num">${eur(net, 0)}</b><small>soit ${eur(net / 12, 0)} par mois en moyenne</small></div></div>
    <ul class="out-tax">${lines.map(([a, b, d]) => `<li><span><b>${a}</b><small>${d}</small></span><em>${b}</em></li>`).join("")}</ul>
    <p class="note">Calcul : montant investi × rendement (dernier dividende annuel ÷ cours actuel${nb != null ? `, soit environ ${F0.format(nb)} action${nb > 1 ? "s" : ""}` : ""}). Le dividende peut baisser, être supprimé ou augmenter : ce n'est pas une promesse de revenu. Taux ${RATES.year} hors cas particuliers (option pour le barème, abattement de 40 %).</p>`;
}
let OUT_DOCCLICK = false;
async function pageDividendes() {
  setTitle("Dividendes : calendrier, rendements et simulateur"); setNav("news");
  if (!R) return; outCSS();
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([PXP, outHist()]);
  if (location.pathname !== "/dividendes") return;
  const favIds = new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const f = { s: "", r: "", pea: "", fav: false, favIds, cv: true, all: false };
  const S = outStats();
  const upcoming = outDivEvents({ ...f }).filter(e => outDivKind(e) === "det"), nx = upcoming[0];
  const defC = RBY["totalenergies"] && valo(RBY["totalenergies"]) ? RBY["totalenergies"] : outDivTop(f)[0] && outDivTop(f)[0].c;
  const sim = { c: defC, m: 5000, a: "pea" };
  app.innerHTML = `<div class="out-page"><div class="crumbs"><a href="/marches">Marchés</a> › Dividendes</div>
    <h1 class="pagetitle">Les dividendes</h1>
    <p class="pagesub">Les prochaines dates de détachement et de paiement, les plus hauts rendements avec leur garde-fou, les dividendes relevés chaque année, et ce que vous toucheriez vraiment après impôts.</p>
    <div class="out-kpis"><div><span>Prochain détachement</span><b>${nx ? `${esc(RBY[nx.id].name)}` : "–"}</b><small>${nx ? new Date(nx.date + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "aucune date annoncée"}</small></div>
      <div><span>Dates annoncées</span><b class="num">${F0.format(outDivEvents(f).length)}</b><small>détachements et paiements à venir</small></div>
      <div><span>Dividende relevé 4 ans de suite</span><b class="num">${F0.format(Object.values(S).filter(s => s.divUp >= 4).length)}</b><small>entreprises suivies</small></div></div>
    <nav class="out-anc"><a href="#out-sim">Combien je toucherais</a><a href="#out-cal">Calendrier</a><a href="#out-top">Plus hauts rendements</a><a href="#out-up">Dividendes relevés</a><a href="#out-det">Le détachement expliqué</a></nav>
    <section class="panel" id="out-sim"><div class="ph"><h2>Combien je toucherais ?</h2></div><div class="pb">
      <div class="out-simf"><label class="out-sel out-q"><span>Entreprise</span><input id="out-sq" type="search" autocomplete="off" placeholder="Nom de l'entreprise" value="${sim.c ? esc(sim.c.name) : ""}"><div class="out-sug" id="out-ss" hidden></div></label>
        <label class="out-sel"><span>Montant investi</span><input id="out-sm" type="number" min="100" step="100" value="${sim.m}" inputmode="numeric"></label>
        <div class="out-sel"><span>Compte</span><div class="chips out-acct"><button type="button" data-a="pea" class="on">PEA</button><button type="button" data-a="cto">Compte-titres</button></div></div></div>
      <div id="out-sr"></div></div></section>
    <section class="panel"><div class="pb out-filt"><b class="out-fl">Filtrer les listes</b>${outSelect("out-s", outSecOpts(), "", "Secteur")}${outSelect("out-r", OUT_REG, "", "Région")}<label class="out-chk"><input type="checkbox" id="out-pea"> Éligibles au PEA</label><label class="out-chk"><input type="checkbox" id="out-fav"> Mes favoris${favIds.size ? ` (${favIds.size})` : ""}</label></div></section>
    <section class="panel" id="out-cal"><div class="ph"><h2>Le calendrier</h2><button type="button" class="btn ghost out-ics" id="ics">${OUT_ICON.dl}Ajouter à mon agenda (.ics)</button></div><div class="pb" style="padding-top:6px" id="out-calb"></div>
      <div class="src">Chaque date vient du calendrier publié par l'entreprise ou d'un communiqué, avec son lien. Le fichier .ics s'ouvre dans Google Agenda, Apple Calendrier ou Outlook : rien n'est envoyé.</div></section>
    <div class="out-two"><section class="panel" id="out-top"><div class="ph"><h2>Les plus hauts rendements</h2><label class="out-chk out-cvchk"><input type="checkbox" id="out-cv" checked> Dividende couvert seulement</label></div><div class="pb" style="padding-top:4px" id="out-topb"></div>
      <div class="src">Rendement = dernier dividende annuel ÷ cours (cours différés). Garde-fou : « Couvert » si le dividende versé est inférieur à 90 % du bénéfice du dernier exercice.</div></section>
      <section class="panel" id="out-up"><div class="ph"><h2>Dividendes relevés</h2><a href="/classements?c=dividende">Le classement</a></div><div class="pb" style="padding-top:4px" id="out-upb"></div>
      <div class="src">Années de suite où le dividende par action a augmenté, d'après les rapports annuels (jusqu'à cinq exercices), puis rendement actuel. Rendements inférieurs à 1 % écartés.</div></section></div>
    <section class="panel" id="out-det"><div class="ph"><h2>Le détachement, en trois dates</h2></div><div class="pb">
      <ol class="out-tl"><li><b>La veille</b><span>Vous devez détenir l'action à la clôture de la Bourse. Acheter le jour même ne donne plus droit au dividende.</span></li>
        <li><b>Le jour du détachement</b><span>Le dividende « se détache » de l'action : le cours baisse mécaniquement d'environ son montant. Exemple : une action à 50 € qui verse 2 € ouvre vers 48 €.</span></li>
        <li><b>Le jour du paiement</b><span>Quelques jours plus tard, l'argent arrive sur votre compte. Dans un PEA, il y reste sans impôt ; sur un compte-titres, ${pct(RATES.pfu, 1, false)} sont prélevés.</span></li></ol>
      <p class="note">Le dividende n'est donc pas un « cadeau » : la valeur sort de l'entreprise pour arriver chez l'actionnaire. Ce qui compte sur la durée, c'est que l'entreprise puisse le payer avec ses bénéfices. <a class="lnk" href="/lexique">Le lexique</a> explique le taux de distribution et le rendement.</p></div></section>
    ${OUT_NOADV}</div>`;
  const drawSim = () => { const el = $("#out-sr"); if (!el) return; el.innerHTML = sim.c ? outDivSim(sim.c, Math.max(0, +sim.m || 0), sim.a) : `<p class="muted">Choisissez une entreprise.</p>`; };
  const draw = () => {
    $("#out-calb").innerHTML = outDivCal(outDivEvents(f), f.all);
    const mo = $("#out-more"); if (mo) mo.onclick = () => { f.all = true; $("#out-calb").innerHTML = outDivCal(outDivEvents(f), true); };
    const top = outDivTop(f);
    $("#out-topb").innerHTML = top.length ? `<div class="out-tw"><table class="out-tb"><thead><tr><th></th><th>Entreprise</th><th>Rendement</th><th>Couvert ?</th><th>Relevé</th></tr></thead><tbody>${top.slice(0, 12).map((x, i) => outDivRow(x, i, S)).join("")}</tbody></table></div>
      <p class="out-warn">${f.cv ? "Seuls les dividendes payés avec moins de 90 % du bénéfice sont listés. Décochez la case pour voir tous les rendements, y compris ceux qui dépassent le bénéfice." : "Un rendement très élevé vient souvent d'un cours qui a beaucoup baissé ou d'un dividende exceptionnel. Regardez s'il est couvert par le bénéfice."}</p>` : `<div class="empty">Aucune entreprise avec ces filtres.</div>`;
    const up = R.companies.filter(c => !c.missing && S[c.id] && S[c.id].divUp >= 2 && (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)) && (!f.fav || favIds.has(c.id)))
      .map(c => ({ c, y: (valo(c) || {}).yld || 0 })).filter(x => x.y >= 0.01).sort((a, b) => S[b.c.id].divUp - S[a.c.id].divUp || b.y - a.y).map(x => x.c).slice(0, 12);
    $("#out-upb").innerHTML = up.length ? `<div class="out-list out-list-s">${up.map((c, i) => { const st = S[c.id], v = valo(c); return `<a class="out-row" href="/entreprise/${c.id}"><span class="out-rk">${i + 1}</span>${logo(c, 30)}<span class="out-rt"><b>${esc(c.name)}</b><small>Relevé ${outAns(st.divUp)}${st.dCagr != null ? ` · ${sgn(st.dCagr, 1)} par an` : ""}${v && v.yld ? ` · rend. ${pct(v.yld, 1, false)}` : ""}</small></span><span class="out-rv">${outCouvTag(c)}</span></a>`; }).join("")}</div>` : `<div class="empty">Aucune entreprise avec ces filtres.</div>`;
  };
  drawSim(); draw();
  $("#out-s").onchange = e => { f.s = e.target.value; draw(); };
  $("#out-r").onchange = e => { f.r = e.target.value; draw(); };
  $("#out-pea").onchange = e => { f.pea = e.target.checked ? "1" : ""; draw(); };
  $("#out-cv").onchange = e => { f.cv = e.target.checked; draw(); };
  $("#out-fav").onchange = e => { f.fav = e.target.checked; draw(); };
  $("#ics").onclick = () => { const list = outDivEvents(f); if (!list.length) return toast("Aucune date à exporter avec ces filtres."); const a = document.createElement("a"); a.href = URL.createObjectURL(icsFile(list, "Dividendes (bilan.)")); a.download = "dividendes-bilan.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $("#out-sm").oninput = e => { sim.m = e.target.value; drawSim(); };
  $$(".out-acct button", app).forEach(b => b.onclick = () => { sim.a = b.dataset.a; $$(".out-acct button", app).forEach(x => x.classList.toggle("on", x === b)); drawSim(); });
  const q = $("#out-sq"), sg = $("#out-ss");
  const pool = R.companies.filter(c => !c.missing && c.divPaid > 0.5);
  q.oninput = () => { const t = norm(q.value.trim()); if (t.length < 2) { sg.hidden = true; return; }
    const l = pool.filter(c => norm(c.name).includes(t) || norm(c.ticker || "") === t).slice(0, 6);
    sg.innerHTML = l.length ? l.map(c => `<button type="button" data-id="${c.id}">${logo(c, 22)}<span>${esc(c.name)}</span><small>${(() => { const v = valo(c); return v && v.yld ? pct(v.yld, 1, false) : ""; })()}</small></button>`).join("") : `<p class="muted">Aucune entreprise versant un dividende ne correspond.</p>`; sg.hidden = false; };
  q.onfocus = () => q.select();
  sg.onclick = e => { const b = e.target.closest("button[data-id]"); if (!b) return; sim.c = RBY[b.dataset.id]; q.value = sim.c.name; sg.hidden = true; drawSim(); };
  if (!OUT_DOCCLICK) { OUT_DOCCLICK = true; document.addEventListener("click", e => { const g = $("#out-ss"); if (g && !e.target.closest(".out-q")) g.hidden = true; }); }
}

/* ---------- 3. Découvertes : une sélection quotidienne, diversifiée, sans biais vers les grandes valeurs ----------
   Chaque jour : 6 entreprises (une par « case » : petite valeur éligible au PEA, petite ou moyenne valeur européenne,
   valeur hors d'Europe, profil rendement, croissance, redressement), de secteurs différents, au plus deux par région,
   et 2 ETF éligibles au PEA de catégories différentes (hors ETF Monde, déjà partout).
   Les grandes capitalisations (plus de 10 Md€) et les entreprises des comparaisons célèbres sont écartées.
   Taille, profil, valorisation, risques et catalyseurs : fonctions recoTaille, recoStyle, recoValo, recoRisques, recoCatal de m/reco.js. */
function outSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function outRand(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const OUT_SLOTS = [
  { k: "pea", t: "Petite valeur éligible au PEA", f: x => (x.T.t === "small" || x.T.t === "micro") && x.pea === true },
  { k: "eu", t: "Valeur européenne de taille moyenne ou petite", f: x => x.c.region === "EU" },
  { k: "monde", t: "Hors d'Europe", f: x => x.c.region === "US" || x.c.region === "MONDE" },
  { k: "rendement", t: "Profil rendement", f: x => x.style === "rendement" },
  { k: "croissance", t: "Profil croissance", f: x => x.style === "croissance" },
  { k: "redressement", t: "Profil redressement", f: x => x.style === "redressement" },
];
let OUT_POOL = null, OUT_POOLK = "";
function outPool() {
  const k = (typeof PXUP === "string" ? PXUP : "") + "|" + !!OUT_ST;
  if (OUT_POOL && OUT_POOLK === k) return OUT_POOL;
  const famous = new Set(OUT_PRESETS.flatMap(p => p.ids)), y = new Date().getFullYear(), l = [];
  for (const c of R.companies) {
    if (c.missing || !c.desc || famous.has(c.id) || !(c.year >= y - 2)) continue;
    const q = quick(c); if (!q || q.fort + q.moyen + q.vig < 5 || q.fort < 2) continue;
    const T = typeof recoTaille === "function" ? recoTaille(c) : null; if (!T || T.t === "large") continue;
    const style = recoStyle(c);
    if (q.vig > (style === "redressement" ? 3 : 2)) continue;
    // microcapitalisations : seulement si les comptes sont récents et complets (données jugées fiables)
    if (T.t === "micro" && (!(c.year >= y - 1) || [c.ca, c.net, c.equity, c.netDebt].some(v => v == null) || q.vig > 1)) continue;
    l.push({ c, q, T, style, pea: recoPeaOk(c) });
  }
  l.sort((a, b) => a.c.id.localeCompare(b.c.id));
  const rnd = outRand(outSeed("bilan-decouvertes-2")); // ordre mélangé une fois pour toutes, puis lu jour après jour
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  OUT_POOLK = k; return OUT_POOL = l;
}
function outDayPicks(dateIso, n = 6) {
  const P = outPool(); if (!P.length) return [];
  const out = [], sec = new Set(), reg = {}, used = new Set();
  for (const S of OUT_SLOTS) {
    if (out.length >= n) break;
    const start = outSeed(S.k + "|" + dateIso) % P.length; // point de départ tiré au hasard (le même pour tous) chaque jour
    for (let k = 0; k < P.length; k++) {
      const x = P[(start + k) % P.length];
      if (used.has(x.c.id) || sec.has(x.c.sector) || (reg[x.c.region] || 0) >= 2 || !S.f(x)) continue;
      out.push({ ...x, slot: S }); used.add(x.c.id); sec.add(x.c.sector); reg[x.c.region] = (reg[x.c.region] || 0) + 1; break;
    }
  }
  return out;
}
function outEtfPicks(dateIso, n = 2) { // ETF éligibles au PEA, hors ETF Monde, deux catégories différentes chaque jour
  const L = (ETF.list || []).filter(e => e.pea === true && e.ter != null && !e.levier && (e.encours || 0) >= 50 && e.categorie !== "actions-monde" && !(typeof recoEtfSuspect === "function" && recoEtfSuspect(e))).sort((a, b) => a.id.localeCompare(b.id));
  if (!L.length) return [];
  const day = Math.floor(Date.parse(dateIso + "T12:00:00Z") / 864e5), out = [], cats = new Set();
  for (let k = 0; k < L.length && out.length < n; k++) { const e = L[(day * 5 + k * 7) % L.length]; if (cats.has(e.categorie) || out.includes(e)) continue; out.push(e); cats.add(e.categorie); }
  return out;
}
function outFacts(c) { // ce qui ressort des comptes, en phrases courtes et sourcées (pas de jugement sur l'action)
  const m = ratios(c), med = MED[c.sector] || {}, st = OUT_ST && OUT_ST[c.id], F = [];
  if (st && st.top >= 3) F.push([5, `Dans les 10 % les plus rentables de son secteur ${st.top} exercices sur ${st.topN}`]);
  if (st && st.caUp >= 3) F.push([4, `Ventes en hausse ${st.caUp} années de suite${st.cagr != null ? ` (${sgn(st.cagr, 0)} par an)` : ""}`]);
  if (st && st.divUp >= 3) F.push([4, `Dividende relevé ${st.divUp} années de suite`]);
  if (c.netPrev != null && c.netPrev < 0 && c.net > 0) F.push([4.5, `De nouveau bénéficiaire : ${big(c.net, c.currency)} après une perte de ${big(-c.netPrev, c.currency)} l'exercice précédent`]);
  if (!isBank(c) && m.marge != null && med.marge > 0 && m.marge > med.marge * 1.5) F.push([3, `Garde ${outE100(m.marge)} sur 100 € de ventes, contre ${outE100(med.marge)} pour la médiane de son secteur`]);
  if (m.roe != null && m.roe >= 0.15 && (med.roe == null || m.roe > med.roe)) F.push([2.5, `Rentabilité de ${pct(m.roe, 0, false)} des capitaux propres${med.roe != null ? ` (secteur : ${pct(med.roe, 0, false)})` : ""}`]);
  if (!isBank(c) && c.netDebt != null && c.netDebt <= 0) F.push([2, "Pas de dette nette : plus de trésorerie que d'emprunts"]);
  if (m.g1 != null && m.g1 >= 0.08) F.push([2, `Ventes en hausse de ${pct(m.g1, 0, false)} sur le dernier exercice`]);
  if (m.payout != null && m.payout >= 0.2 && m.payout <= 0.7) F.push([1, `Dividende couvert : ${F0.format(m.payout * 100)} % du bénéfice reversé`]);
  return F.sort((a, b) => b[0] - a[0]).map(x => x[1]);
}
function outDecKpis(c) {
  const v = valo(c), med = MEDPE[c.sector], K = [];
  K.push(["Valeur en Bourse", v && v.capE ? capFmt(v.capE) : "–"]);
  K.push(["PER", v && v.pe ? `${F0.format(v.pe)}${med ? ` <small>secteur ${F0.format(med)}</small>` : ""}` : c.net > 0 ? "–" : "En perte"]);
  K.push(["Rendement", v && v.yld ? pct(v.yld, 1, false) : "–"]);
  K.push([`Ventes ${esc(String(c.year || ""))}`, big(c.ca, c.currency)]);
  return `<div class="out-kp">${K.map(([l, x]) => `<div><span>${l}</span><b>${x}</b></div>`).join("")}</div>`;
}
function outDecCard(x, lg) {
  const c = x.c, F = outFacts(c).slice(0, lg ? 3 : 2), fl = typeof FLAG === "object" && c.isin ? FLAG[c.isin.slice(0, 2)] || "" : "";
  const risk = RECO.risqueAction({ taille: x.T.t, perte: !(c.net > 0), levier: isBank(c) ? null : ratios(c).lev, amp: recoAmp(c) });
  const why = `${x.slot ? x.slot.t + " : " : ""}${outN(x.q.fort, "point fort", "points forts")} et ${outN(x.q.vig, "point de vigilance", "points de vigilance")} sur ${x.q.fort + x.q.moyen + x.q.vig} critères face à la médiane de son secteur.`;
  const head = `<span class="out-dch">${logo(c, lg ? 44 : 36)}<span><b>${esc(c.name)}</b><small>${fl ? `<span class="out-fl2">${fl}</span>` : ""}${esc([secName(c), regName(c)].filter(Boolean).join(" · "))}</small></span></span>`;
  const tags = `<span class="out-dtg"><span class="out-tl2">${esc(RECO_TAILLE[x.T.t])}${x.T.src === "ventes" ? "*" : ""}</span>${x.style ? `<span class="out-tl2">${RECO_STYLE[x.style]}</span>` : ""}${recoPeaTag(c)}${recoRisk(risk)}</span>`;
  if (!lg) return `<a class="out-dc" href="/entreprise/${c.id}">${head}${tags}<span class="out-dcd">${esc(c.desc)}</span>${F.length ? `<span class="out-dcw"><em>Pourquoi la découvrir</em><ul>${F.map(f => `<li>${f}</li>`).join("")}</ul></span>` : ""}</a>`;
  const Rk = recoRisques(c, x.T), V = recoValo(c);
  return `<article class="out-dc big"><a class="out-dca" href="/entreprise/${c.id}">${head}</a>${tags}
    <p class="out-dcd"><b>Activité</b> ${esc(c.desc)}</p>
    <p class="out-dcr"><b>Raison de la sélection</b> ${esc(why)}</p>
    ${outDecKpis(c)}
    ${F.length ? `<div class="out-dcw"><em>Éléments financiers</em><ul>${F.map(f => `<li>${f}</li>`).join("")}</ul></div>` : ""}
    <details class="rc-det"><summary>Valorisation, catalyseurs et risques</summary><div>
      ${V.length ? `<p><b>Valorisation</b> ${V.join(" ")}</p>` : ""}
      <p><b>Catalyseurs potentiels</b></p><div data-rc-cat="${esc(c.id)}"><p class="rc-mut">Chargement des annonces…</p></div>
      <p><b>Risques</b></p>${Rk.length ? `<ul class="rc-rk">${Rk.map(([t, z]) => `<li><b>${t}</b> ${z}</li>`).join("")}</ul>` : `<p class="rc-mut">Aucun risque particulier relevé dans les chiffres ; les risques propres à toute action demeurent.</p>`}
      <p><b>Éligibilité au PEA</b> ${esc(recoPeaInfo(c).why)}</p></div></details>
    <a class="lnk out-dcl" href="/entreprise/${c.id}">Lire la fiche complète →</a></article>`;
}
function outEtfCard(e) {
  const pe = RECO.peaEtf(e), C = e.compo || {}, r = RECO.risqueEtf(e);
  const risques = [r >= 4 ? "Concentré sur une région, un pays ou un thème : plus variable qu'un ETF Monde." : "Suit un marché d'actions : des baisses de 30 % ou plus sont possibles.",
    pe.swap ? "Réplication synthétique : le fonds dépend d'un contrat d'échange avec une banque (risque de contrepartie, encadré par la réglementation)." : null,
    (e.encours || 0) < 100 ? "Encours inférieur à 100 M€ : un petit fonds risque davantage d'être fermé." : null,
    e.devise && e.devise !== "EUR" ? `Fonds en ${esc(e.devise)} : le change joue.` : null].filter(Boolean);
  return `<article class="out-dc big out-de"><a class="out-dca" href="/etf/${esc(e.id)}"><span class="out-dch"><span class="rc-ico">ETF</span><span><b>${esc(e.name)}</b><small>${esc([e.issuer, ECAT[e.categorie] || e.categorie].filter(Boolean).join(" · "))}</small></span></span></a>
    <span class="out-dtg">${recoEtfPeaTag(e)}${recoRisk(r)}</span>
    <p class="out-dcd"><b>Ce qu'il contient</b> ${esc((e.fiche && e.fiche.quoi) || `Il suit l'indice ${e.index || ""}.`)}</p>
    <p class="out-dcr"><b>Raison de la sélection</b> ETF éligible au PEA hors ETF Monde, pour varier les catégories : ${esc(ECAT[e.categorie] || e.categorie)}.</p>
    <div class="out-kp"><div><span>Frais par an</span><b>${pct(e.ter / 100, 2, false)}</b></div><div><span>Encours</span><b>${e.encours ? F0.format(e.encours) + " M€" : "–"}</b></div><div><span>Lignes</span><b>${C.n ? F0.format(C.n) : "–"}</b></div><div><span>1er pays</span><b>${pe.expo ? `${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)} ${F0.format(pe.expo.pct)} %` : "–"}</b></div></div>
    <details class="rc-det"><summary>Éligibilité, exposition et risques</summary><div>
      <p><b>Éligibilité au PEA</b> ${esc(pe.why)}</p>
      <p><b>Exposition</b> ${pe.expo ? `Ce que le fonds suit : ${F0.format(pe.expo.pct)} % ${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)}${C.p1 && C.pays ? `, ${F0.format(C.pays)} pays au total` : ""}.` : "Composition non détaillée par l'émetteur."} L'éligibilité au PEA ne dit rien de cette exposition.</p>
      <p><b>Risques</b></p><ul class="rc-rk">${risques.map(z => `<li>${z}</li>`).join("")}</ul>
      <p class="rc-mut">Source : fiche de l'émetteur${C.asOf ? `, composition au ${esc(C.asOf)}` : ""}. Les performances passées ne préjugent pas des performances futures.</p></div></details>
    <a class="lnk out-dcl" href="/etf/${esc(e.id)}">Lire la fiche du fonds →</a></article>`;
}
function outDateFr(iso, opt) { return new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", opt || { weekday: "long", day: "numeric", month: "long" }); }
// Pour l'accueil : 3 entreprises du jour (l'orchestrateur place ce bloc). Rien ne bloque : les comptes de l'exercice suffisent.
function outilsDecouverteHTML(n = 3) {
  if (!R) return "";
  const l = outDayPicks(TODAY, 6).slice(0, n); if (!l.length) return "";
  if (!OUT_H) outHist().then(() => { outStats(); const l2 = outDayPicks(TODAY, 6).slice(0, n); $$(".out-home[data-d='" + TODAY + "']").forEach(el => { el.querySelector(".out-dg").innerHTML = l2.map(x => outDecCard(x, false)).join(""); }); });
  else outStats();
  outCSS(); if (typeof recoCSS === "function") recoCSS();
  return `<section class="panel out-home" data-d="${TODAY}"><div class="ph"><h2>À découvrir aujourd'hui</h2><a href="/decouvertes">Toutes les découvertes</a></div><div class="pb" style="padding-top:6px">
    <p class="muted out-hs">Des petites et moyennes entreprises, d'Europe et d'ailleurs, dont les comptes ressortent sur nos critères. Une nouvelle sélection chaque jour, sans conseil d'achat.</p><div class="out-dg">${l.map(x => outDecCard(x, false)).join("")}</div></div></section>`;
}
async function pageDecouvertes() {
  setTitle("Découvertes du jour"); setNav("ent");
  if (!R) return;
  if (typeof recoCSS === "function") recoCSS();
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([PXP, outHist(), typeof recoDivLoad === "function" ? recoDivLoad() : null]); outStats();
  if (location.pathname !== "/decouvertes") return;
  const today = outDayPicks(TODAY, 6), etfs = outEtfPicks(TODAY, 2), P = outPool();
  const prev = [1, 2, 3, 4, 5, 6].map(k => { const d = new Date(Date.parse(TODAY + "T12:00:00Z") - k * 864e5).toISOString().slice(0, 10); return [d, outDayPicks(d, 6)]; });
  const nT = t => P.filter(x => x.T.t === t).length;
  app.innerHTML = `<div class="out-page"><div class="crumbs"><a href="/entreprises">Entreprises</a> › Découvertes</div>
    <h1 class="pagetitle">À découvrir aujourd'hui</h1>
    <p class="pagesub">${esc(outDateFr(TODAY).replace(/^./, x => x.toUpperCase()))} : six entreprises peu citées, de tailles, de pays, de secteurs et de profils différents, et deux ETF éligibles au PEA. Pour chacune : activité, chiffres, valorisation, catalyseurs et risques.</p>
    ${OUT_NOADV}
    <h2 class="out-h2">Entreprises</h2>
    <div class="out-dg big">${today.map(x => outDecCard(x, true)).join("")}</div>
    ${etfs.length ? `<h2 class="out-h2">ETF éligibles au PEA</h2><div class="out-dg big out-dg2">${etfs.map(outEtfCard).join("")}</div>` : ""}
    <section class="panel"><div class="ph"><h2>Les jours précédents</h2></div><div class="pb" style="padding-top:4px">${prev.map(([d, l]) => `<div class="out-prev"><b>${esc(outDateFr(d, { weekday: "long", day: "numeric", month: "long" }))}</b><div>${l.map(x => `<a class="chip" href="/entreprise/${x.c.id}">${logo(x.c, 20)}${esc(x.c.name)}</a>`).join("")}</div></div>`).join("")}</div></section>
    <section class="panel"><details class="acc"><summary><b>Comment la sélection est faite</b><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 16px">
      <p><b>Le vivier.</b> Les entreprises suivies dont les comptes ont moins de deux ans, avec au moins 5 critères mesurés, 2 points forts ou plus et au plus 2 points de vigilance (3 pour un redressement). Les grandes capitalisations (plus de 10 Md€) et les entreprises des comparaisons célèbres sont écartées. Une microcapitalisation n'entre que si ses comptes sont récents et complets. Cela fait ${F0.format(P.length)} entreprises aujourd'hui : ${F0.format(nT("mid"))} moyennes, ${F0.format(nT("small"))} petites, ${F0.format(nT("micro"))} micro.</p>
      <p><b>Les six cases du jour.</b> Une petite valeur éligible au PEA, une valeur européenne, une valeur hors d'Europe, puis un profil rendement (dividende d'au moins 3,5 % couvert par le bénéfice), croissance (ventes en hausse 3 ans de suite à plus de 7 % par an, ou +15 % sur un an) et redressement (retour aux bénéfices après une perte). Au plus une entreprise par secteur et deux par région. Tout le monde voit la même sélection le même jour.</p>
      <p><b>Tailles.</b> Capitalisation en euros : micro sous 300 M€, petite jusqu'à 2 Md€, moyenne jusqu'à 10 Md€. Sans cours disponible, la taille est estimée par les ventes (signalé par un astérisque).</p>
      <p><b>PEA.</b> Une action cotée en Europe n'est pas forcément éligible : il faut un siège dans l'Union européenne ou l'EEE et une société soumise à l'impôt sur les sociétés (les foncières SIIC, SIR ou SOCIMI sont exclues). Le site lit le pays du code ISIN, le recoupe avec Wikidata et affiche « à vérifier » quand les sources se contredisent. Pour un ETF, l'éligibilité est celle déclarée par l'émetteur ; un ETF éligible peut suivre des actions américaines ou asiatiques.</p>
      <p><b>Catalyseurs.</b> Annonces officielles importantes des 90 derniers jours (AMF, SEC et autres régulateurs) et dates publiées par l'entreprise, avec leur lien. Ce sont des événements à suivre, pas des prévisions.</p>
      <p class="muted">Petites valeurs : moins d'échanges chaque jour, des cours plus variables, une information plus rare et parfois une activité concentrée. Découvrir n'est pas acheter : lisez la fiche, ses points de vigilance et le prix de l'action avant toute décision.</p></div></details></section></div>`;
  if (typeof recoFillCatal === "function") recoFillCatal(app);
}

/* ---------- 4. Comparaisons toutes prêtes ---------- */
const OUT_THEMES = { tech: "Technologie", fin: "Banque et finance", nrj: "Énergie", ind: "Industrie et transport", conso: "Consommation et luxe", sante: "Santé", immo: "Immobilier et télécoms", calc: "Calculées chaque jour" };
const OUT_PRESETS = [
  { th: "conso", ids: ["lvmh", "hermes", "kering"], t: "Le luxe français", d: "Trois maisons, trois modèles : marge, croissance et prix en Bourse très différents." },
  { th: "conso", ids: ["lvmh", "moncler", "burberry"], t: "Le luxe européen", d: "Un géant diversifié face à deux marques spécialisées." },
  { th: "tech", ids: ["apple", "microsoft", "alphabet"], t: "Les géants de la tech", d: "Les plus grandes valeurs en Bourse du monde, côte à côte." },
  { th: "tech", ids: ["amazon", "meta", "netflix"], t: "Les GAFAM et le streaming", d: "Commerce en ligne, publicité et abonnements : trois façons de gagner de l'argent sur Internet." },
  { th: "tech", ids: ["nvidia", "amd", "intel"], t: "Les fabricants de puces", d: "Une croissance et des prix en Bourse qui n'ont rien à voir." },
  { th: "tech", ids: ["asml", "applied-materials", "lam-research"], t: "Les machines à fabriquer des puces", d: "Ceux qui vendent les outils aux fabricants de semi-conducteurs." },
  { th: "tech", ids: ["tsmc", "intel", "micron"], t: "Fondeurs et mémoire", d: "Fabriquer les puces des autres, ou les siennes." },
  { th: "tech", ids: ["stmicroelectronics", "soitec", "texas-instruments"], t: "Les semi-conducteurs européens", d: "Deux françaises face à l'américain de référence des puces analogiques." },
  { th: "tech", ids: ["dassault-systemes", "oracle", "salesforce"], t: "Les éditeurs de logiciels", d: "Des marges élevées, mais des croissances très différentes." },
  { th: "tech", ids: ["capgemini", "sopra-steria", "accenture"], t: "Les services informatiques", d: "Des métiers de main-d'œuvre : marges plus faibles, peu de dette." },
  { th: "tech", ids: ["alibaba", "jd-com", "baidu"], t: "La tech chinoise", d: "Commerce en ligne et moteur de recherche, avec le risque propre au marché chinois." },
  { th: "tech", ids: ["netflix", "spotify", "disney"], t: "Le streaming", d: "Films, séries et musique par abonnement." },
  { th: "tech", ids: ["meta", "pinterest", "snap"], t: "Les réseaux sociaux", d: "Tous vivent de la publicité, avec des rentabilités opposées." },
  { th: "fin", ids: ["bnp-paribas", "societe-generale", "credit-agricole"], t: "Les banques françaises", d: "Pour une banque, la rentabilité se lit sur les capitaux propres." },
  { th: "fin", ids: ["jpmorgan", "bank-of-america", "goldman-sachs"], t: "Les banques américaines", d: "Banque de détail et banque d'affaires." },
  { th: "fin", ids: ["hsbc", "santander", "ing"], t: "Les grandes banques européennes", d: "Royaume-Uni, Espagne et Pays-Bas face à face." },
  { th: "fin", ids: ["bnp-paribas", "unicredit", "intesa-sanpaolo"], t: "BNP Paribas face aux banques italiennes", d: "Les banques italiennes ont fortement redressé leur rentabilité." },
  { th: "fin", ids: ["axa", "generali", "scor"], t: "Les assureurs", d: "Deux assureurs et un réassureur, l'assureur des assureurs." },
  { th: "fin", ids: ["visa", "mastercard", "paypal"], t: "Les paiements", d: "Les réseaux de cartes et le paiement en ligne." },
  { th: "fin", ids: ["adyen", "worldline", "paypal"], t: "Le paiement en ligne", d: "Trois acteurs du paiement, trois trajectoires très différentes." },
  { th: "fin", ids: ["amundi", "eurazeo", "wendel"], t: "Gestion d'actifs et investissement", d: "Gérer l'argent des autres ou investir le sien dans des entreprises." },
  { th: "nrj", ids: ["totalenergies", "shell", "bp"], t: "Les pétrolières européennes", d: "Un secteur cyclique : les bénéfices suivent le prix du pétrole." },
  { th: "nrj", ids: ["totalenergies", "exxonmobil", "chevron"], t: "TotalEnergies face aux majors américaines", d: "Taille, dette et dividende des plus grandes compagnies." },
  { th: "nrj", ids: ["eni", "repsol", "equinor"], t: "Italie, Espagne, Norvège", d: "Trois compagnies pétrolières européennes de taille moyenne." },
  { th: "nrj", ids: ["engie", "iberdrola", "enel"], t: "L'électricité et le gaz", d: "Des métiers régulés, beaucoup de dette et des dividendes réguliers." },
  { th: "ind", ids: ["airbus", "boeing", "safran"], t: "L'aéronautique", d: "Avionneurs et motoriste : marges, dette et carnets de commandes." },
  { th: "ind", ids: ["thales", "dassault-aviation", "safran"], t: "La défense française", d: "Électronique, avions de combat et moteurs." },
  { th: "ind", ids: ["bae-systems", "leonardo", "thales"], t: "La défense européenne", d: "Royaume-Uni, Italie et France, portés par les budgets militaires." },
  { th: "ind", ids: ["lockheed-martin", "northrop-grumman", "rtx"], t: "La défense américaine", d: "Les grands fournisseurs du Pentagone." },
  { th: "ind", ids: ["stellantis", "renault", "ferrari"], t: "Les constructeurs européens", d: "Volume contre luxe : des marges sans comparaison." },
  { th: "ind", ids: ["tesla", "toyota", "general-motors"], t: "Les constructeurs mondiaux", d: "Le pionnier de l'électrique face aux géants historiques." },
  { th: "ind", ids: ["tesla", "nio", "rivian"], t: "Les voitures électriques", d: "Un rentable et deux entreprises encore en perte." },
  { th: "ind", ids: ["michelin", "pirelli"], t: "Les pneus", d: "Un français et un italien, sur un métier qui se renouvelle à chaque usure." },
  { th: "ind", ids: ["vinci", "eiffage", "bouygues"], t: "Construction et concessions", d: "Autoroutes, aéroports et chantiers." },
  { th: "ind", ids: ["schneider-electric", "legrand", "air-liquide"], t: "Les industriels français de qualité", d: "Matériel électrique et gaz industriels : des marges régulières." },
  { th: "ind", ids: ["air-france-klm", "iag", "easyjet"], t: "Les compagnies aériennes", d: "Beaucoup de ventes, peu de marge et des avions financés par la dette." },
  { th: "ind", ids: ["aeroports-de-paris", "getlink", "vinci"], t: "Les infrastructures de transport", d: "Aéroports, tunnel sous la Manche et autoroutes." },
  { th: "conso", ids: ["loreal", "estee-lauder", "procter-gamble"], t: "Beauté et hygiène", d: "Marques mondiales, marges élevées." },
  { th: "conso", ids: ["danone", "unilever", "kraft-heinz"], t: "L'alimentation", d: "Des produits du quotidien, une croissance lente et régulière." },
  { th: "conso", ids: ["pernod-ricard", "diageo", "remy-cointreau"], t: "Les spiritueux", d: "Whisky, cognac et pastis : marges fortes, ventes en ralentissement." },
  { th: "conso", ids: ["ab-inbev", "heineken", "carlsberg"], t: "Les brasseurs", d: "Les trois plus grands groupes de bière européens." },
  { th: "conso", ids: ["coca-cola", "pepsico"], t: "Coca-Cola ou PepsiCo", d: "Boissons seules, ou boissons et biscuits apéritifs." },
  { th: "conso", ids: ["mcdonalds", "starbucks"], t: "La restauration rapide", d: "Un franchiseur et un exploitant de cafés." },
  { th: "conso", ids: ["carrefour", "ahold-delhaize", "tesco"], t: "La grande distribution européenne", d: "Des marges de quelques centimes par euro vendu." },
  { th: "conso", ids: ["walmart", "costco", "amazon"], t: "La distribution américaine", d: "Hypermarchés, entrepôts réservés aux membres et commerce en ligne." },
  { th: "conso", ids: ["nike", "inditex"], t: "Sport et mode", d: "Une marque de sport et le propriétaire de Zara." },
  { th: "conso", ids: ["accor", "marriott", "hilton"], t: "L'hôtellerie", d: "Les grands groupes hôteliers vivent surtout de la gestion et des franchises." },
  { th: "conso", ids: ["booking", "airbnb", "accor"], t: "Réserver un voyage", d: "Les plateformes de réservation face à un hôtelier." },
  { th: "conso", ids: ["edenred", "pluxee", "sodexo"], t: "Titres-restaurant et restauration collective", d: "Les cartes repas et la cantine d'entreprise." },
  { th: "sante", ids: ["sanofi", "pfizer", "merck"], t: "Les laboratoires pharmaceutiques", d: "France et États-Unis : brevets, recherche et dividendes." },
  { th: "sante", ids: ["novo-nordisk", "eli-lilly"], t: "Les traitements contre l'obésité", d: "Les deux laboratoires qui dominent ce marché." },
  { th: "sante", ids: ["astrazeneca", "gsk", "novartis"], t: "La pharmacie européenne", d: "Royaume-Uni et Suisse, trois grands laboratoires." },
  { th: "sante", ids: ["eurofins", "biomerieux", "ipsen"], t: "La santé française de taille moyenne", d: "Laboratoires d'analyses, diagnostic et médicaments de spécialité." },
  { th: "sante", ids: ["essilorluxottica", "abbott", "medtronic"], t: "Le matériel médical", d: "Lunettes, diagnostic et dispositifs médicaux." },
  { th: "immo", ids: ["unibail-rodamco-westfield", "klepierre", "gecina"], t: "Les foncières françaises", d: "Centres commerciaux et bureaux : loyers, dette et valeur des immeubles." },
  { th: "immo", ids: ["covivio", "icade", "gecina"], t: "Bureaux et logements", d: "Trois foncières exposées aux bureaux." },
  { th: "immo", ids: ["orange", "vodafone", "telefonica"], t: "Les opérateurs télécoms européens", d: "Des réseaux coûteux, beaucoup de dette, des dividendes élevés." },
  { th: "immo", ids: ["verizon", "att", "t-mobile-us"], t: "Les opérateurs américains", d: "Trois opérateurs qui se partagent le marché américain." },
];
function outCalcPresets() { // comparaisons recalculées à chaque visite, à partir des cours et des comptes
  const L = R.companies.filter(c => !c.missing).map(c => ({ c, v: valo(c), m: ratios(c) })).filter(x => x.v && x.v.capE > 0);
  const fr = L.filter(x => x.c.region === "FR"), big = fr.filter(x => x.v.capE >= 1e10);
  const P = [];
  const add = (l, t, d) => { if (l.length >= 2) P.push({ th: "calc", ids: l.slice(0, 3).map(x => x.c.id), t, d, calc: true }); };
  add([...big].filter(x => x.v.yld).sort((a, b) => b.v.yld - a.v.yld), "Les grandes françaises qui versent le plus", "Les plus hauts rendements parmi les françaises de plus de 10 Md€ en Bourse.");
  add([...fr].sort((a, b) => b.v.capE - a.v.capE), "Les plus grandes françaises en Bourse", "Les trois premières capitalisations de la Bourse de Paris suivies par le site.");
  add([...L].sort((a, b) => b.v.capE - a.v.capE), "Les plus grandes du monde", "Les trois plus grandes valeurs en Bourse suivies par le site.");
  add(big.filter(x => !isBank(x.c) && x.m.marge != null).sort((a, b) => b.m.marge - a.m.marge), "Les grandes françaises les plus rentables", "Les meilleures marges d'exploitation parmi les françaises de plus de 10 Md€.");
  add(big.filter(x => x.v.pe).sort((a, b) => a.v.pe - b.v.pe), "Les grandes françaises les moins chères", "Les plus petits rapports cours / bénéfice : souvent des secteurs dont on attend peu de croissance.");
  return P;
}
function outPresetCard(p) {
  const l = p.ids.filter(id => RBY[id]);
  return `<a class="out-pc" href="/comparer?ids=${l.join(",")}" data-th="${p.th}"><span class="lgs">${l.map(id => logo(RBY[id], 32)).join("")}</span><b>${esc(p.t)}</b><small>${esc(listFr(l.map(id => RBY[id].name)))}</small><span class="out-pcd">${esc(p.d)}</span>${p.calc ? `<em>Mis à jour avec les cours du jour</em>` : ""}</a>`;
}
function outGalleryHTML() {
  const all = [...outCalcPresets(), ...OUT_PRESETS].filter(p => p.ids.filter(id => RBY[id]).length >= 2);
  const th = Object.keys(OUT_THEMES).filter(k => all.some(p => p.th === k));
  return `<section class="panel out-gal"><div class="ph"><h2>${F0.format(all.length)} comparaisons toutes prêtes</h2><span class="light" style="font-size:12.5px">En un clic, le verdict critère par critère</span></div>
    <div class="pb" style="padding-top:8px"><div class="chips out-thc"><button type="button" class="on" data-th="">Toutes</button>${th.map(k => `<button type="button" data-th="${k}">${esc(OUT_THEMES[k])}</button>`).join("")}</div>
    ${th.map(k => `<div class="out-gth" data-th="${k}"><h3>${esc(OUT_THEMES[k])}</h3><div class="out-pg">${all.filter(p => p.th === k).map(outPresetCard).join("")}</div></div>`).join("")}</div></section>`;
}
function outGalleryBind(root) {
  const c = root.querySelector(".out-thc"); if (!c) return;
  c.onclick = e => { const b = e.target.closest("button"); if (!b) return; $$("button", c).forEach(x => x.classList.toggle("on", x === b)); $$(".out-gth", root).forEach(g => { g.hidden = !!b.dataset.th && g.dataset.th !== b.dataset.th; }); };
}
function outRelated(ids) { // d'autres comparaisons du même secteur, sous une comparaison en cours
  const sec = new Set(ids.map(id => RBY[id] && RBY[id].sector)), cur = ids.join(",");
  return OUT_PRESETS.filter(p => p.ids.join(",") !== cur && p.ids.some(id => RBY[id] && sec.has(RBY[id].sector)) && p.ids.filter(id => RBY[id]).length >= 2).slice(0, 6);
}
if (typeof cmprRenderBody === "function") { // enveloppe : la page de m/comparer.js reste identique, la galerie s'ajoute
  const OUT_cmprBody0 = cmprRenderBody;
  window.cmprRenderBody = function (ids) {
    OUT_cmprBody0(ids);
    const el = $("#cmpr-body"); if (!el) return;
    outCSS();
    if (ids.length < 2) {
      const pre = el.querySelector(".cmpr-pre"), sec = pre && pre.closest("section");
      const box = document.createElement("div"); box.innerHTML = outGalleryHTML();
      if (sec) sec.replaceWith(box.firstElementChild); else el.appendChild(box.firstElementChild);
      outGalleryBind(el);
    } else {
      const rel = outRelated(ids);
      if (rel.length) el.insertAdjacentHTML("beforeend", `<section class="panel out-gal"><div class="ph"><h2>D'autres comparaisons du même secteur</h2><a href="/comparer">Toutes les comparaisons</a></div><div class="pb" style="padding-top:8px"><div class="out-pg">${rel.map(outPresetCard).join("")}</div></div></section>`);
    }
  };
}

/* ---------- Routes, menu, styles ---------- */
ROUTES_EXTRA.push([/^\/classements$/, () => { outCSS(); pageClassements(); }]);
ROUTES_EXTRA.push([/^\/decouvertes$/, () => { outCSS(); pageDecouvertes(); }]);
(function outMenu() { // liens ajoutés au menu sans retoucher index.html
  const dd = document.querySelector('#nav .dd[data-g="ent"] .ddm');
  if (dd && !dd.querySelector('a[href="/classements"]')) {
    const cmp = dd.querySelector('a[href="/comparer"]');
    const h = `<a href="/classements"><b>Classements</b><span>Le plus de points forts, en tête de leur secteur</span></a><a href="/decouvertes"><b>Découvertes du jour</b><span>Des entreprises moins connues à explorer</span></a>`;
    if (cmp) cmp.insertAdjacentHTML("afterend", h); else dd.insertAdjacentHTML("beforeend", h);
  }
  const dv = document.querySelector('#nav .dd[data-g="mkt"] a[href="/dividendes"] span'); if (dv) dv.textContent = "Calendrier, rendements, simulateur";
  const mp = document.getElementById("mpanel");
  if (mp && !mp.querySelector('a[href="/classements"]')) { const c = mp.querySelector('a[href="/comparer"]'); if (c) c.insertAdjacentHTML("afterend", `<a href="/classements">Classements</a><a href="/decouvertes">Découvertes du jour</a>`); }
  if (typeof OUTILS !== "undefined" && Array.isArray(OUTILS) && !OUTILS.some(o => o[0] === "/classements")) OUTILS.push(["/classements", "Classements des entreprises", "Celles qui cumulent le plus de points forts, restent en tête de leur secteur ou relèvent leur dividende."], ["/decouvertes", "Découvertes du jour", "Chaque jour, six entreprises moins connues dont les comptes ressortent."]);
})();
let OUT_CSS = false;
function outCSS() {
  if (OUT_CSS) return; OUT_CSS = true;
  document.head.insertAdjacentHTML("beforeend", `<style id="out-css">
.oi{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.out-page>.panel,.out-page>.out-two,.out-page>.out-dg,.out-page>.out-noadv{margin-top:16px}
.out-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:18px 0 0}
.out-tabs button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 14px;cursor:pointer;color:var(--ink);font:inherit}
.out-tabs button i{font-style:normal;font-weight:700;width:26px;height:26px;border-radius:8px;background:var(--soft);display:grid;place-items:center;font-size:14px}
.out-tabs button b{font-size:14.5px;line-height:1.25}.out-tabs button small{font-size:12.5px;color:var(--grey);line-height:1.35}
.out-tabs button.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}.out-tabs button.on i{background:var(--ink);color:#fff}
.out-filt{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:flex-end}
.out-sel{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--grey);min-width:0}
.out-sel select,.out-sel input{font:inherit;font-size:14.5px;color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:#fff;min-width:0;max-width:100%}
.out-chk{display:flex;align-items:center;gap:8px;font-size:14px;padding:8px 0;cursor:pointer}.out-chk input{width:17px;height:17px;accent-color:var(--ink)}
.out-fl{font-size:13px;align-self:center;width:100%}
.out-noadv{display:flex;gap:10px;align-items:flex-start;background:var(--soft);border-radius:12px;padding:10px 14px;margin:6px 0 12px;color:var(--grey)}
.out-noadv p{margin:0;font-size:13.5px;line-height:1.5}.out-noadv b{color:var(--ink)}.out-noadv .oi{margin-top:2px}
.out-list{display:flex;flex-direction:column}
.out-row{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--line2);color:var(--ink);text-decoration:none}
.out-row:first-child{border-top:0}.out-row:hover{background:var(--soft)}
.out-rk{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:600 13px var(--mono,monospace);background:var(--soft);color:var(--grey)}
.out-rk.top{background:var(--ink);color:#fff}
.out-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.out-rt b{font-size:15px}.out-rt>small{color:var(--grey);font-size:12.5px}
.out-why{font-size:13.5px;color:var(--ink);line-height:1.4}
.out-rv{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.out-pea{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:5px;background:#E3F2E9;color:#0F6B3E;vertical-align:1px}
.out-cv{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap}
.out-cv-oui{background:#E3F2E9;color:#0F6B3E}.out-cv-juste{background:#F3EFE6;color:#6B5A2E}.out-cv-non{background:#FCE9D6;color:#9A4A0B}
.out-cvd{display:block;color:var(--grey);font-size:11.5px;margin-top:2px}
.out-crit{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 12px}.out-crit>div{background:var(--soft);border-radius:12px;padding:9px 13px}
.out-crit em{font-style:normal;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--grey)}.out-crit p{margin:3px 0 0;font-size:13px;line-height:1.45}
.out-blur{cursor:default}.out-blur:hover{background:none}.out-blur .lgph{width:36px;height:36px;border-radius:10px;background:var(--soft);flex:none;filter:blur(2px)}
.out-blur .out-rt b,.out-blur .out-rt>small{filter:blur(5px);user-select:none;color:var(--light)}.out-blur .out-rv{color:var(--light)}
.out-apercu{display:flex;gap:12px;align-items:center;flex-wrap:wrap;border:1px solid var(--rule);border-radius:12px;padding:12px 14px;margin:10px 0 0;background:#FBFAF7}
.out-apercu>div{flex:1;min-width:220px;display:flex;flex-direction:column;gap:3px}.out-apercu b{font-size:14.5px}.out-apercu span{font-size:13px;color:var(--grey);line-height:1.45}
@media (max-width:720px){.out-crit{grid-template-columns:1fr}}
.out-lock{position:relative;margin-top:2px}
.out-ghost{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--line2);opacity:.45;filter:blur(1.5px)}
.out-ghost .lgph{width:36px;height:36px;border-radius:10px;background:var(--soft)}.out-ghost b{display:block;width:180px;height:12px;border-radius:4px;background:var(--rule)}.out-ghost small{display:block;width:120px;height:10px;border-radius:4px;background:var(--soft);margin-top:6px}
.out-lockc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:10px;background:linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.95))}
.out-lockc b{font-size:15px}.out-lockc span{font-size:13px;color:var(--grey);max-width:440px}.out-lockc .btn{margin-top:4px}
.out-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}
.out-kpis>div{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;min-width:0}
.out-kpis span{font-size:12.5px;color:var(--grey)}.out-kpis b{font:700 20px var(--serif);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.out-kpis small{font-size:12.5px;color:var(--light)}
.out-anc{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.out-anc a{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--ink);text-decoration:none;background:#fff}.out-anc a:hover{border-color:var(--ink)}
.out-simf{display:grid;grid-template-columns:2fr 1fr auto;gap:12px;align-items:end}
.out-q{position:relative}.out-sug{position:absolute;top:100%;left:0;right:0;z-index:20;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);margin-top:4px;padding:4px}
.out-sug button{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;padding:7px 8px;border-radius:8px;cursor:pointer;font:inherit;font-size:14px;color:var(--ink);text-align:left}.out-sug button:hover{background:var(--soft)}.out-sug button span{flex:1}.out-sug small{color:var(--grey)}.out-sug p{margin:6px 8px;font-size:13px}
.out-acct{margin:0}.out-acct button{padding:8px 14px}
.out-simr{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.out-big{border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}.out-big span{font-size:12.5px;color:var(--grey)}.out-big b{font:700 28px var(--serif)}.out-big small{font-size:12.5px;color:var(--grey)}
.out-net{background:#EEF6F0;border-color:#CFE5D7}
.out-tax{list-style:none;margin:12px 0 0;padding:0}.out-tax li{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-top:1px solid var(--line2)}.out-tax li span{display:flex;flex-direction:column;gap:2px;font-size:14px}.out-tax small{color:var(--grey);font-size:12.5px;line-height:1.4}.out-tax em{font-style:normal;font-weight:600;white-space:nowrap;font-size:14px}
.out-warn{background:#FFF6EC;border-radius:10px;padding:9px 12px;font-size:13px;color:#7A4B12;margin:12px 0 0}
.out-more{margin-top:14px}.out-cvchk{font-size:13px;padding:0;font-weight:400}
.out-ics{gap:8px;display:inline-flex;align-items:center;height:36px;font-size:13.5px}
.out-mh{font:600 15px var(--sans);margin:14px 0 6px;display:flex;gap:8px;align-items:baseline}.out-mh span{font-size:12.5px;color:var(--light);font-weight:400}
.out-cal{display:flex;flex-direction:column}
.out-ev{display:grid;grid-template-columns:48px minmax(0,1fr) auto auto auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line2)}
.out-d{text-align:center;font-size:11.5px;color:var(--grey);line-height:1.1}.out-d b{display:block;font:700 19px var(--serif);color:var(--ink)}
.out-evc{display:flex;align-items:center;gap:10px;min-width:0;color:var(--ink);text-decoration:none}.out-evc>span{display:flex;flex-direction:column;min-width:0}.out-evc b{font-size:14.5px}.out-evc small{font-size:12.5px;color:var(--grey);overflow:hidden;text-overflow:ellipsis}
.out-k{font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap;cursor:help}
.out-k-det{background:#FCE9D6;color:#9A4A0B}.out-k-pay{background:#E3F2E9;color:#0F6B3E}.out-k-rec{background:#E6ECF5;color:#1C3D6E}.out-k-autre{background:var(--soft);color:var(--grey)}
.out-evv{display:flex;flex-direction:column;align-items:flex-end;font-size:13px;min-width:70px}.out-evv small{color:var(--grey);font-size:11.5px}
.out-src{font-size:12px;color:var(--grey)}
.out-two{display:grid;grid-template-columns:1.25fr 1fr;gap:16px}.out-two .panel{margin:0}
.out-tw{overflow-x:auto}
.out-tb{width:100%;border-collapse:collapse;font-size:14px}.out-tb th{text-align:left;font-size:12px;font-weight:600;color:var(--grey);padding:6px 6px;border-bottom:1px solid var(--line)}.out-tb td{padding:8px 6px;border-top:1px solid var(--line2);vertical-align:middle}
.out-tb .num{text-align:right;white-space:nowrap}.out-tb th:nth-child(3),.out-tb th:nth-child(5){text-align:right}.out-n{color:var(--light);font-size:12.5px;width:18px}
.out-tc{display:flex;align-items:center;gap:8px;color:var(--ink);text-decoration:none;min-width:0}.out-tc>span{display:flex;flex-direction:column;min-width:0}.out-tc small{font-size:12px;color:var(--grey)}
.out-list-s .out-row{padding:9px 2px}.out-list-s .out-rk{width:24px;height:24px;font-size:12px}
.out-tl{list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;counter-reset:t}
.out-tl li{counter-increment:t;border:1px solid var(--line);border-radius:14px;padding:14px 16px 14px;display:flex;flex-direction:column;gap:4px;position:relative}
.out-tl li::before{content:counter(t);width:26px;height:26px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px;margin-bottom:4px}
.out-tl b{font-size:15px}.out-tl span{font-size:13.5px;color:var(--grey);line-height:1.5}
.out-dg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.out-dc{display:flex;flex-direction:column;gap:10px;border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fff;color:var(--ink);text-decoration:none;min-width:0}
.out-dc:hover{border-color:var(--ink)}
.out-dch{display:flex;gap:10px;align-items:center;min-width:0}.out-dch>span{display:flex;flex-direction:column;min-width:0}.out-dch b{font:700 16.5px var(--serif)}.out-dch small{font-size:12.5px;color:var(--grey)}
.out-fl2{margin-right:5px;display:inline-block;vertical-align:-1px}.out-fl2 svg{width:15px;height:10px;border-radius:2px;display:block}
.out-dcd{font-size:13.5px;color:var(--grey);line-height:1.45}
.out-dcw{background:#EEF6F0;border-radius:10px;padding:8px 12px}.out-dcw em{font-style:normal;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0F6B3E}
.out-dcw ul{margin:4px 0 0;padding-left:16px;font-size:13.5px;line-height:1.45}
.out-dcf{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;font-size:12.5px;flex-wrap:wrap}
.out-home .out-hs{margin:0 0 12px;font-size:13.5px}
.out-h2{font:700 19px var(--serif);margin:22px 0 10px}
.out-dc.big{gap:9px}.out-dca{color:var(--ink);text-decoration:none}.out-dca:hover b{text-decoration:underline}
.out-dtg{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}.out-tl2{font-size:11.5px;font-weight:600;border:1px solid var(--rule);border-radius:999px;padding:1px 8px;color:var(--grey);white-space:nowrap}
.out-dc .out-dcd b,.out-dcr b{display:block;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--grey);margin-bottom:1px}
.out-dcr{margin:0;font-size:13.5px;line-height:1.45}
.out-kp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.out-kp>div{background:var(--soft);border-radius:9px;padding:6px 10px;display:flex;flex-direction:column;min-width:0}
.out-kp span{font-size:11.5px;color:var(--grey)}.out-kp b{font:600 14.5px var(--mono,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.out-kp b small{font:400 11.5px var(--sans);color:var(--grey)}
.out-dcl{font-size:13.5px;margin-top:auto}
.out-dg2{grid-template-columns:repeat(2,1fr)}
.out-prev{display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--line2);align-items:baseline}.out-prev:first-child{border-top:0}.out-prev>b{flex:none;width:170px;font-size:13.5px;font-weight:600}.out-prev>div{display:flex;flex-wrap:wrap;gap:6px}
.out-prev .chip{display:inline-flex;align-items:center;gap:6px;font-size:13px}
.out-thc{margin:0 0 6px}
.out-gth h3{font:600 15px var(--sans);margin:16px 0 8px}
.out-pg{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.out-pc{display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#fff;color:var(--ink);text-decoration:none;min-width:0}
.out-pc:hover{border-color:var(--ink)}
.out-pc .lgs{display:flex}.out-pc .lgs .lg{margin-right:-6px;box-shadow:0 0 0 2px #fff}
.out-pc b{font:700 15.5px var(--serif)}.out-pc small{color:var(--ink);font-size:12.5px}.out-pcd{color:var(--grey);font-size:13px;line-height:1.4}
.out-pc em{font-style:normal;font-size:11.5px;color:#0F6B3E;font-weight:600}
.out-gal{margin-top:16px}
@media (max-width:1000px){.out-tabs{grid-template-columns:repeat(3,1fr)}.out-dg{grid-template-columns:1fr 1fr}.out-two{grid-template-columns:1fr}}
@media (max-width:640px){
  .out-tabs{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin-left:calc(-1 * var(--gut,16px));margin-right:calc(-1 * var(--gut,16px));padding:0 var(--gut,16px) 4px}
  .out-tabs button{flex:0 0 72%;scroll-snap-align:start}
  .out-filt{display:grid;grid-template-columns:1fr 1fr}.out-filt .out-chk{grid-column:span 1}.out-fl{grid-column:1/-1}
  .out-sel select{width:100%}
  .out-row{gap:10px;align-items:flex-start}.out-rv{display:none}.out-row .lg{--s:30px!important}
  .out-kpis{grid-template-columns:1fr;gap:8px}.out-kpis>div{flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.out-kpis b{font-size:17px}
  .out-simf{grid-template-columns:1fr}.out-acct{flex-wrap:nowrap}.out-anc a{font-size:12.5px;padding:4px 10px}
  .out-simr{grid-template-columns:1fr}.out-big b{font-size:24px}
  .out-ev{grid-template-columns:40px minmax(0,1fr) auto;row-gap:4px}.out-ev .out-evv{display:none}.out-ev .out-src{display:none}
  .out-ev .out-evc .lg{display:none}
  .out-tl{grid-template-columns:1fr}
  .out-dg{grid-template-columns:1fr}
  .out-prev{flex-direction:column;gap:6px}.out-prev>b{width:auto}
  .out-ics{width:100%;justify-content:center;margin-top:8px}
  .out-tb th:nth-child(5),.out-tb td:nth-child(5),.out-tb th:nth-child(1),.out-tb td:nth-child(1){display:none}
  .out-cvd{display:none}
}
</style>`);
}
