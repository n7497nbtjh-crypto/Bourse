/* Module « outils » d'ENKLAIR : chargé après le script principal de index.html (et après m/comparer.js).
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Contenu :
   - /classements : classements calculés sur les comptes (points forts, en tête de son secteur, croissance régulière,
     dividende relevé, rentables et peu endettées), filtres, top 3 gratuit, liste complète avec Premium ;
   - /dividendes (pageDividendes remplacée) : calendrier, plus hauts rendements avec garde-fou, dividendes relevés,
     simulateur « combien je toucherais » en PEA ou compte-titres, export .ics, explication du détachement ;
   - /decouvertes et outilsDecouverteHTML() (pour l'accueil) : une sélection quotidienne d'entreprises moins connues ;
   - /comparer : la page est dans m/comparer4.js ; ce module fournit OUT_PRESETS et outCalcPresets (comparaisons toutes prêtes).
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
 // ventes en millions d'euros
function outCouv(c) { // le dividende est-il couvert par le bénéfice du dernier exercice ?
  if (!(c.divPaid > 0.5)) return null;
  if (!(c.net > 0)) return { k: "non", t: "Non couvert", d: "versé alors que l'entreprise est en perte" };
  const p = c.divPaid / c.net;
  return p <= 0.9 ? { k: "oui", t: "Couvert", d: `${F0.format(p * 100)} % du bénéfice versé` } : p <= 1.05 ? { k: "juste", t: "Tout juste", d: `${F0.format(p * 100)} % du bénéfice versé` } : { k: "non", t: "Non couvert", d: `${F0.format(p * 100)} % du bénéfice versé` };
}
const outCouvTag = c => { const x = outCouv(c); return x ? `<span class="out-cv out-cv-${x.k}" title="${esc(x.d)}">${x.t}</span>` : ""; };
const outPea = c => peaOk(c) ? `<span class="out-pea">PEA</span>` : "";
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
  let l = R.companies.filter(c => !c.missing && !outVieux(c) && (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)) && outTailleOk(c, f.t));
  const val = [];
  for (const c of l) {
    const st = S[c.id], m = ratios(c), q = quick(c);
    if (k === "points") { if (!q || q.fort + q.moyen + q.vig < 3) continue; val.push({ c, q, a: q.fort - q.vig, b: q.fort, d: st ? st.top * 2 + st.caUp + st.divUp : 0, e: m.marge || 0 }); }
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
// pageClassements : m/classements4.js (Classements v4, 3/11/2026)

/* ---------- 2. Dividendes ---------- */
function outDivKind(e) { const l = e.label || ""; return /enregistrement/i.test(l) ? "rec" : /paiement|versement|mise en paiement/i.test(l) ? "pay" : /détach|dernier jour|ex-div/i.test(l) ? "det" : "autre"; }
const OUT_DK = { det: ["Détachement", "Pour recevoir ce dividende, il faut détenir l'action la veille au soir de cette date (ou à la date indiquée)."], pay: ["Paiement", "Le jour où l'argent arrive sur le compte des actionnaires."], rec: ["Enregistrement", "Il faut être inscrit comme actionnaire à cette date. En pratique, acheter au moins un jour de Bourse avant aux États-Unis, deux en Europe."], autre: ["Dividende", ""] };
function outDivAmt(e) { const m = (e.label || "").match(/\(([\d\s,.]+)\s*(€|\$|£|CHF|kr|NOK|SEK|DKK|pence)\)/); return m ? m[1].trim() + " " + m[2] : ""; }
function outDivEvents(f) {
  return AG.events.filter(e => e.date >= TODAY && RBY[e.id] && /ividende|acompte|détachement|solde/i.test(e.type + " " + e.label))
    .filter(e => { const c = RBY[e.id]; return (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)) && (!f.fav || f.favIds.has(c.id)); })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
function outDivTop(f) {
  return R.companies.filter(c => !c.missing && !outVieux(c) && (!f.cv || (outCouv(c) || {}).k === "oui") && (!f.s || c.sector === f.s) && outRegOk(c, f.r) && (!f.pea || peaOk(c)))
    .map(c => ({ c, v: valo(c) })).filter(x => x.v && x.v.yld > 0.001 && x.v.capE > 2e8).sort((a, b) => b.v.yld - a.v.yld);
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
// pageDividendes : m/dividendes4.js (Dividendes v4, 3/11/2026)

// Comptes anciens (plus de 15 mois) : jamais dans un classement, une découverte ni une comparaison
// recalculée. La règle est celle de m/donnees.js (donVieux), chargé après ce module.
function outVieux(c) { try { return typeof donVieux === "function" ? donVieux(c) : false; } catch (e) { return false; } }

/* ---------- 3. Découvertes : une sélection quotidienne, diversifiée, sans biais vers les grandes valeurs ----------
   Chaque jour : 6 entreprises (une par « case » : petite valeur éligible au PEA, petite ou moyenne valeur européenne,
   valeur hors d'Europe, profil rendement, croissance, redressement), de secteurs différents, au plus deux par région,
   et 2 ETF éligibles au PEA de catégories différentes (hors ETF Monde, déjà partout).
   Les grandes capitalisations (plus de 10 Md€) et les entreprises des comparaisons célèbres sont écartées.
   Taille, profil, valorisation, risques et catalyseurs : fonctions recoTaille, recoStyle, recoValo, recoRisques, recoCatal de m/reco.js. */
function outSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function outRand(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const OUT_SLOTS = [
  { k: "pea", get t() { return (typeof frSeul !== "function" || frSeul()) ? "Petite valeur éligible au PEA" : "Petite valeur européenne"; }, f: x => (x.T.t === "small" || x.T.t === "micro") && x.pea === true },
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
    if (c.missing || !c.desc || famous.has(c.id) || !(c.year >= y - 2) || outVieux(c)) continue;
    const q = quick(c); if (!q || q.fort + q.moyen + q.vig < 4 || q.fort < 2) continue;
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
  if (!isBank(c) && m.marge != null && m.marge <= 1 && med.marge > 0 && m.marge > med.marge * 1.5) F.push([3, `Garde ${outE100(m.marge)} sur 100 € de ventes, contre ${outE100(med.marge)} pour la médiane de son secteur`]);
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
      <p class="fr-seul"><b>Éligibilité au PEA</b> ${esc(recoPeaInfo(c).why)}</p></div></details>
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
    <p class="out-dcd"><b>Ce qu'il contient</b> ${esc((e.fiche && (typeof sansPea === "function" ? sansPea(e.fiche.quoi) : e.fiche.quoi)) || `Il suit l'indice ${e.index || ""}.`)}</p>
    <p class="out-dcr"><b>Raison de la sélection</b> ETF${(typeof frSeul !== "function" || frSeul()) ? " éligible au PEA" : ""} hors ETF Monde, pour varier les catégories : ${esc(ECAT[e.categorie] || e.categorie)}.</p>
    <div class="out-kp"><div><span>Frais par an</span><b>${pct(e.ter / 100, 2, false)}</b></div><div><span>Encours</span><b>${e.encours ? F0.format(e.encours) + " M€" : "–"}</b></div><div><span>Lignes</span><b>${C.n ? F0.format(C.n) : "–"}</b></div><div><span>1er pays</span><b>${pe.expo ? `${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)} ${F0.format(pe.expo.pct)} %` : "–"}</b></div></div>
    <details class="rc-det"><summary>Éligibilité, exposition et risques</summary><div>
      <p class="fr-seul"><b>Éligibilité au PEA</b> ${esc(pe.why)}</p>
      <p><b>Exposition</b> ${pe.expo ? `Ce que le fonds suit : ${F0.format(pe.expo.pct)} % ${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)}${C.p1 && C.pays ? `, ${F0.format(C.pays)} pays au total` : ""}.` : "Composition non détaillée par l'émetteur."}<span class="fr-seul"> L'éligibilité au PEA ne dit rien de cette exposition.</span></p>
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
    <p class="pagesub">${esc(outDateFr(TODAY).replace(/^./, x => x.toUpperCase()))} : six entreprises peu citées, de tailles, de pays, de secteurs et de profils différents, et deux ETF${(typeof frSeul !== "function" || frSeul()) ? " éligibles au PEA" : ""}. Pour chacune : activité, chiffres, valorisation, catalyseurs et risques.</p>
    ${OUT_NOADV}
    <h2 class="out-h2">Entreprises</h2>
    <div class="out-dg big">${today.map(x => outDecCard(x, true)).join("")}</div>
    ${etfs.length ? `<h2 class="out-h2">${(typeof frSeul !== "function" || frSeul()) ? "ETF éligibles au PEA" : "ETF"}</h2><div class="out-dg big out-dg2">${etfs.map(outEtfCard).join("")}</div>` : ""}
    <section class="panel"><div class="ph"><h2>Les jours précédents</h2></div><div class="pb" style="padding-top:4px">${prev.map(([d, l]) => `<div class="out-prev"><b>${esc(outDateFr(d, { weekday: "long", day: "numeric", month: "long" }))}</b><div>${l.map(x => `<a class="chip" href="/entreprise/${x.c.id}">${logo(x.c, 20)}${esc(x.c.name)}</a>`).join("")}</div></div>`).join("")}</div></section>
    <section class="panel"><details class="acc"><summary><b>Comment la sélection est faite</b><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 16px">
      <p><b>Le vivier.</b> Les entreprises suivies dont les comptes ont moins de deux ans, avec au moins 5 critères mesurés, 2 points forts ou plus et au plus 2 points de vigilance (3 pour un redressement). Les grandes capitalisations (plus de 10 Md€) et les entreprises des comparaisons célèbres sont écartées. Une microcapitalisation n'entre que si ses comptes sont récents et complets. Cela fait ${F0.format(P.length)} entreprises aujourd'hui : ${F0.format(nT("mid"))} moyennes, ${F0.format(nT("small"))} petites, ${F0.format(nT("micro"))} micro.</p>
      <p><b>Les six cases du jour.</b> Une petite valeur ${(typeof frSeul !== "function" || frSeul()) ? "éligible au PEA" : "européenne"}, une valeur européenne, une valeur hors d'Europe, puis un profil rendement (dividende d'au moins 3,5 % couvert par le bénéfice), croissance (ventes en hausse 3 ans de suite à plus de 7 % par an, ou +15 % sur un an) et redressement (retour aux bénéfices après une perte). Au plus une entreprise par secteur et deux par région. Tout le monde voit la même sélection le même jour.</p>
      <p><b>Tailles.</b> Capitalisation en euros : micro sous 300 M€, petite jusqu'à 2 Md€, moyenne jusqu'à 10 Md€. Sans cours disponible, la taille est estimée par les ventes (signalé par un astérisque).</p>
      <p class="fr-seul"><b>PEA.</b> Une action cotée en Europe n'est pas forcément éligible : il faut un siège dans l'Union européenne ou l'EEE et une société soumise à l'impôt sur les sociétés (les foncières SIIC, SIR ou SOCIMI sont exclues). Le site lit le pays du code ISIN, le recoupe avec Wikidata et affiche « à vérifier » quand les sources se contredisent. Pour un ETF, l'éligibilité est celle déclarée par l'émetteur ; un ETF éligible peut suivre des actions américaines ou asiatiques.</p>
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
  const L = R.companies.filter(c => !c.missing && !outVieux(c)).map(c => ({ c, v: valo(c), m: ratios(c) })).filter(x => x.v && x.v.capE > 0);
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
// La galerie des comparaisons est affichée par m/comparer4.js (cxGalerie) à partir de OUT_PRESETS et outCalcPresets.

/* ---------- Routes, menu, styles ---------- */
ROUTES_EXTRA.push([/^\/classements$/, () => { outCSS(); pageClassements(); }]);
ROUTES_EXTRA.push([/^\/decouvertes$/, () => { outCSS(); pageDecouvertes(); }]);
(function outMenu() { // liens ajoutés au menu sans retoucher index.html
  // le menu (barre, téléphone, pied de page) est construit par m/nav.js
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
