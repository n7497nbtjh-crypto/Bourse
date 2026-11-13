/* Module « tableaux » d'ENKLAIR : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Composant de tableau commun (classe .tbx), tendances, mini-courbes, phrases de lecture,
   onglet « Les chiffres en détail » (tabComptes), graphiques par année (colChart), liste des entreprises,
   résultats du copilote, agenda et comparateur de frais. */

/* ---------- Définitions ajoutées au lexique (lignes du tableau sans définition existante) ---------- */
const TBLX_TERMS = {
  margenette: { name: "Marge nette", what: "Le bénéfice final sur 100 € vendus.", calc: "Résultat net ÷ chiffre d'affaires.", read: "Se compare entre entreprises du même secteur.", limit: "Un élément exceptionnel (vente d'une filiale, dépréciation) peut la fausser une année." },
  invest: { name: "Investissements", what: "L'argent dépensé dans l'année pour les usines, les équipements, les logiciels et les autres actifs durables.", calc: "Flux de trésorerie d'exploitation − flux de trésorerie disponible. Ici estimé à partir des comptes publiés.", read: "Des investissements élevés préparent souvent l'activité future, mais réduisent l'argent disponible de l'année.", limit: "Les rachats d'entreprises ne sont pas toujours inclus." },
  conversion: { name: "Argent disponible ÷ résultat net", what: "La part du bénéfice qui se retrouve réellement en argent disponible, après les investissements.", calc: "Flux de trésorerie disponible ÷ résultat net.", read: "Plus de 80 % : les bénéfices se transforment bien en argent. Négatif : l'entreprise dépense plus qu'elle n'encaisse.", limit: "Une grosse année d'investissement la fait baisser ponctuellement." },
  divverses: { name: "Dividendes versés", what: "Le total versé aux actionnaires pendant l'exercice, toutes actions confondues.", calc: "Montant inscrit dans le tableau des flux de trésorerie.", read: "Contrairement au montant par action, il n'est pas faussé quand l'entreprise divise ses actions.", limit: "N'inclut pas les rachats d'actions." },
};
try { Object.entries(TBLX_TERMS).forEach(([k, t]) => { if (!TERMS[k]) TERMS[k] = t; if (!ALL[k]) ALL[k] = t; }); } catch (e) { }

/* ---------- Petits outils ---------- */
const TBLX_CURN = { EUR: "euros", USD: "dollars américains", GBP: "livres sterling", CHF: "francs suisses", SEK: "couronnes suédoises", DKK: "couronnes danoises", NOK: "couronnes norvégiennes", PLN: "zlotys polonais", CNY: "yuans chinois", CAD: "dollars canadiens", JPY: "yens", KRW: "wons sud-coréens", BRL: "réals brésiliens", MXN: "pesos mexicains", INR: "roupies indiennes", AUD: "dollars australiens", HKD: "dollars de Hong Kong", RUB: "roubles", UAH: "hryvnias", PEN: "soles péruviens", TWD: "dollars taïwanais" };
const tblxSym = cur => CUR[cur] || cur || "";
const tblxSp = cur => CUR[cur] && CUR[cur].length === 1 ? "" : " "; // « Md€ » mais « Md CHF »
const tblxDe = (q, n) => `${q} ${/^[aeiouyéè]/i.test(n) ? "d'" : "de "}${n}`; // « milliards d'euros », « millions de dollars »
function tblxMoneyUnit(vals, cur) { // une seule unité par ligne : tout en Md ou tout en M
  const m = Math.max(0, ...vals.filter(okn).map(Math.abs)), s = tblxSym(cur);
  if (m >= 1000) return { div: 1000, d: m >= 10000 ? 1 : 2, u: "Md" + tblxSp(cur) + s, long: tblxDe("milliards", TBLX_CURN[cur] || cur) };
  return { div: 1, d: m >= 100 ? 0 : m >= 10 ? 1 : 2, u: "M" + tblxSp(cur) + s, long: tblxDe("millions", TBLX_CURN[cur] || cur) };
}
const tblxPts = d => { const x = Math.abs(d * 100); return (d > 0 ? "+" : d < 0 ? "−" : "") + nf(x < 10 ? 1 : 0).format(x) + " pt" + (x >= 2 ? "s" : ""); };
const tblxRel = r => (r > 0 ? "+" : r < 0 ? "−" : "") + nf(Math.abs(r) < 0.1 ? 1 : 0).format(Math.abs(r) * 100) + " %";
const tblxAns = v => F1.format(v) + " an" + (Math.abs(v) >= 2 ? "s" : "");
function tblxFmt(row, cur) { // [format de cellule sans unité, format complet avec unité, unité affichée]
  const k = row.kind;
  if (k === "money") { const u = tblxMoneyUnit(row.vals, cur); return [v => nf(u.d).format(v / u.div), v => big(v, cur), u.u, u.long]; }
  if (k === "ps") return [v => F2.format(v), v => eur(v, 2, cur), tblxSym(cur) + " par action", (TBLX_CURN[cur] || cur) + " par action"];
  if (k === "pctS") { const ns = row.k === "g" && typeof nsCrois === "function"; return [v => ns && nsCrois(v) ? "n.s." : pct(v).replace(/\s*%$/, ""), v => ns && nsCrois(v) ? "n.s." : pct(v), "%", "en %"]; } // 1.3 : variation > ±200 % non significative
  if (k === "pct") { const ns = row.k === "payout" && typeof nsPayout === "function"; return [v => ns && nsPayout(v) ? "plus que le bénéfice" : pct(v, 1, false).replace(/\s*%$/, ""), v => ns && nsPayout(v) ? "plus que le bénéfice" : pct(v, 1, false), "%", "en %"]; }
  if (k === "x") return [v => F1.format(v), v => v < 0 ? "pas de dette nette" : tblxAns(v), "années", "en années"];
  return [v => F1.format(v), v => F1.format(v), "", ""];
}
// Variation entre deux valeurs : +1 hausse, −1 baisse, 0 stable (seuils selon le type de chiffre)
function tblxDir(kind, a, b) {
  if (!okn(a) || !okn(b)) return null;
  const d = b - a;
  if (kind === "money" || kind === "ps") return Math.abs(d) <= Math.abs(a) * 0.02 || d === 0 ? 0 : Math.sign(d);
  if (kind === "pct") return Math.abs(d) < 0.005 ? 0 : Math.sign(d);
  if (kind === "pctS") return Math.abs(d) < 0.01 ? 0 : Math.sign(d);
  if (kind === "x") return Math.abs(d) < 0.1 ? 0 : Math.sign(d);
  return Math.sign(d);
}
function tblxChange(kind, a, b) { // texte de la variation
  if (!okn(a) || !okn(b)) return "";
  if (kind === "money" || kind === "ps") return a > 0 && b > 0 ? tblxRel(b / a - 1) : "";
  if (kind === "pct" || kind === "pctS") return tblxPts(b - a);
  if (kind === "x") return (b - a > 0 ? "+" : b - a < 0 ? "−" : "") + F1.format(Math.abs(b - a));
  return "";
}
// Niveau du dernier chiffre : mêmes seuils que la lecture de la fiche (fort / moyen / vigilance)
function tblxLevel(row) {
  const v = row.last, m = row.med;
  if (!okn(v)) return null;
  switch (row.k) {
    case "g": return v >= 0.05 ? "fort" : v >= 0 ? "moyen" : "vig";
    case "marge": return m != null ? (v >= m + Math.max(0.03, Math.abs(m) * 0.25) ? "fort" : v <= m - Math.max(0.03, Math.abs(m) * 0.3) ? "vig" : "moyen") : (v >= 0.15 ? "fort" : v >= 0.07 ? "moyen" : "vig");
    case "nm": return v < 0 ? "vig" : m != null ? (v >= m + Math.max(0.02, Math.abs(m) * 0.25) ? "fort" : v <= m - Math.max(0.02, Math.abs(m) * 0.3) ? "vig" : "moyen") : (v >= 0.1 ? "fort" : v >= 0.03 ? "moyen" : "vig");
    case "roe": return v >= 0.15 ? "fort" : v >= 0.08 ? "moyen" : "vig";
    case "lev": return v <= 1.5 ? "fort" : v <= 3 ? "moyen" : "vig";
    case "gear": return v <= 0.5 ? "fort" : v <= 1 ? "moyen" : "vig";
    case "payout": return v <= 0.6 ? "fort" : v <= 0.9 ? "moyen" : "vig";
    case "conv": return v >= 0.8 ? "fort" : v >= 0 ? "moyen" : "vig";
    case "net": return v < 0 ? "vig" : row.prev > 0 ? (v >= row.prev ? "fort" : v > row.prev * 0.7 ? "moyen" : "vig") : row.prev != null && row.prev < 0 ? "fort" : "moyen";
    case "fcf": return v < 0 ? "vig" : "moyen";
    case "netDebt": return v < 0 ? "fort" : null;
    default: return null;
  }
}
// Position par rapport à la médiane du secteur
function tblxVsMed(row) {
  const v = row.last, m = row.med; if (!okn(v) || !okn(m)) return null;
  const d = v - m, near = row.kind === "x" ? 0.3 : Math.max(0.01, Math.abs(m) * 0.1), far = row.kind === "x" ? 1 : Math.max(0.03, Math.abs(m) * 0.3);
  const pos = Math.abs(d) <= near ? 0 : Math.sign(d), strong = Math.abs(d) >= far;
  const q = pos * (row.k === "payout" ? -1 : row.sens || 0); // pour la part versée, plus bas laisse plus de marge
  return { pos, strong, q, txt: pos === 0 ? "proche de la médiane du secteur" : (strong ? "nettement " : "") + (pos > 0 ? "au-dessus de" : "en dessous de") + " la médiane du secteur" };
}

/* ---------- Mini-courbe (sparkline) ---------- */
// Flèche de tendance : sens de la variation, couleur selon que c'est une bonne ou une moins bonne nouvelle
function tblxArrow(dir, q, txt = "", title = "") {
  if (dir == null) return `<span class="tbx-ar na">–</span>`;
  const g = dir > 0 ? "↑" : dir < 0 ? "↓" : "→", c = q > 0 ? "up" : q < 0 ? "dn" : "eq";
  return `<span class="tbx-ar ${c}"${title ? ` title="${esc(title)}"` : ""}><b aria-hidden="true">${g}</b>${txt ? `<span>${esc(txt)}</span>` : ""}<span class="sr">${dir > 0 ? "en hausse" : dir < 0 ? "en baisse" : "stable"}</span></span>`;
}

/* ---------- Lignes des comptes ---------- */
function tblxRows(s, c) {
  const f = c.fin || {}, Y = c.years, bank = isBank(s), med = MED[s.sector] || {}, useMed = med.n > 1;
  const A = k => Y.map((_, i) => f[k] && okn(f[k][i]) ? f[k][i] : null);
  const has = a => a.some(v => v != null);
  const div = (a, b) => a.map((v, i) => v != null && b[i] != null && b[i] > 0 ? v / b[i] : null);
  const ca = A("ca"), ebit = A("ebit"), net = A("net"), equity = A("equity"), cash = A("cash"), debt = A("debt"), netDebt = A("netDebt"), ebitda = A("ebitda"), cfo = A("cfo"), fcf = A("fcf"), eps = A("eps"), divPaid = A("divPaid");
  const dps0 = A("dps"), dpsE = A("dpsEst"), dps = dps0.map((v, i) => v != null ? v : dpsE[i]);
  const nEst = dps0.filter((v, i) => v == null && dpsE[i] != null).length, dpsEst = nEst ? (has(dps0) ? " (en partie estimé)" : " (estimé)") : "";
  const g = ca.map((v, i) => i && v != null && ca[i - 1] > 0 ? v / ca[i - 1] - 1 : null);
  const capex = cfo.map((v, i) => v != null && fcf[i] != null ? v - fcf[i] : null);
  const lev = div(netDebt, ebitda).map((v, i) => v != null ? v : netDebt[i] != null && netDebt[i] < 0 && ebitda[i] > 0 ? netDebt[i] / ebitda[i] : null);
  const M = k => useMed && okn(med[k]) ? med[k] : null;
  const rows = [
    { k: "ca", grp: "res", label: bank ? "Revenus (produit net bancaire)" : "Chiffre d'affaires", short: bank ? "Revenus" : "Ventes", term: "ca", vals: ca, kind: "money", sens: 1 },
    { k: "g", grp: "res", label: bank ? "Croissance des revenus" : "Croissance des ventes", short: "Croissance", term: "croissance", vals: g, kind: "pctS", sens: 1, med: M("g1") },
    { k: "ebit", grp: "res", label: "Résultat d'exploitation", short: "Résultat d'exploitation", term: "resexp", vals: ebit, kind: "money", sens: 1 },
    { k: "marge", grp: "res", label: "Marge d'exploitation", short: "Marge", term: "marge", vals: div(ebit, ca), kind: "pct", sens: 1, med: M("marge"), hide: bank },
    { k: "ebitda", grp: "res", label: "EBITDA (estimé)", short: "EBITDA", term: "ebitda", vals: ebitda, kind: "money", sens: 1, hide: bank },
    { k: "net", grp: "res", label: "Résultat net", short: "Résultat net", term: "net", vals: net, kind: "money", sens: 1 },
    { k: "nm", grp: "res", label: "Marge nette", short: "Marge nette", term: "margenette", vals: div(net, ca), kind: "pct", sens: 1, med: M("nm") },
    { k: "equity", grp: "bil", label: "Capitaux propres", short: "Capitaux propres", term: "capitaux", vals: equity, kind: "money", sens: 1 },
    { k: "cash", grp: "bil", label: "Trésorerie", short: "Trésorerie", term: "tresorerie", vals: cash, kind: "money", sens: 1 },
    { k: "debt", grp: "bil", label: "Dette financière", short: "Dette financière", term: "dette", vals: debt, kind: "money", sens: -1, hide: bank },
    { k: "netDebt", grp: "bil", label: "Dette nette (estimée)", short: "Dette nette", term: "dettenette", vals: netDebt, kind: "money", sens: -1, hide: bank },
    { k: "lev", grp: "bil", label: "Dette nette ÷ EBITDA", short: "Endettement", term: "lev", vals: lev, kind: "x", sens: -1, med: M("lev"), hide: bank },
    { k: "gear", grp: "bil", label: "Dette nette ÷ capitaux propres", short: "Dette ÷ capitaux propres", term: "gear", vals: div(netDebt, equity), kind: "pct", sens: -1, med: M("gear"), hide: bank },
    { k: "roe", grp: "bil", label: "Rentabilité des capitaux propres", short: "Rentabilité (ROE)", term: "roe", vals: div(net, equity), kind: "pct", sens: 1, med: M("roe") },
    { k: "roce", grp: "bil", label: "Rentabilité des capitaux employés (ROCE, avant impôt)", short: "Capitaux employés (ROCE)", term: "roce", kind: "pct", sens: 1, hide: bank,
      vals: ebit.map((v, i) => v != null && equity[i] > 0 && netDebt[i] != null && equity[i] + netDebt[i] > 0 ? v / (equity[i] + netDebt[i]) : null),
      med: useMed && typeof medInd === "function" && INDI.roce ? (x => okn(x) ? x / 100 : null)(medInd(s.sector, "roce")) : null },
    { k: "cfo", grp: "flx", label: "Flux de trésorerie d'exploitation", short: "Argent encaissé", term: "cfo", vals: cfo, kind: "money", sens: 1 },
    { k: "capex", grp: "flx", label: "Investissements (estimés)", short: "Investissements", term: "invest", vals: capex, kind: "money", sens: 0 },
    { k: "fcf", grp: "flx", label: "Flux de trésorerie disponible", short: "Argent disponible", term: "fcf", vals: fcf, kind: "money", sens: 1 },
    { k: "conv", grp: "flx", label: "Argent disponible ÷ résultat net", short: "Conversion en argent", term: "conversion", vals: div(fcf, net), kind: "pct", sens: 1, med: bank ? null : M("conv"), hide: bank },
    { k: "eps", grp: "act", label: "Bénéfice net par action (BNPA)", short: "BNPA", term: "bnpa", vals: eps, kind: "ps", sens: 1 },
    { k: "dps", grp: "act", label: "Dividende par action" + dpsEst, short: "Dividende par action", term: "dps", vals: dps, kind: "ps", sens: 1 },
    { k: "divPaid", grp: "act", label: "Dividendes versés (total)", short: "Dividendes versés", term: "divverses", vals: divPaid, kind: "money", sens: 0 },
    { k: "payout", grp: "act", label: "Taux de distribution", short: "Part du bénéfice versée", term: "payout", vals: div(divPaid, net), kind: "pct", sens: 0, med: M("payout") },
  ].filter(r => !r.hide && has(r.vals));
  const ess = bank ? ["ca", "net", "nm", "roe", "equity", "eps", "dps", "payout"]
    : ["ca", "marge", "net", "roe", has(fcf) ? "fcf" : "cfo", has(lev) ? "lev" : "netDebt", "dps", "payout"];
  rows.forEach(r => {
    r.ess = ess.includes(r.k); r.med = okn(r.med) ? r.med : null;
    const idx = r.vals.map((v, i) => v != null ? i : -1).filter(i => i >= 0);
    r.li = idx.at(-1); r.fi = idx[0]; r.n = idx.length;
    r.last = r.vals[r.li]; r.prev = r.li > 0 ? r.vals[r.li - 1] : null; r.first = r.vals[r.fi];
    r.dir = tblxDir(r.kind, r.prev, r.last);
    r.q = r.dir == null ? 0 : r.dir * (r.sens || 0);
    r.lv = tblxLevel(r); r.vm = tblxVsMed(r);
    [r.cell, r.full, r.unit, r.ulong] = tblxFmt(r, c.currency);
    r.phrase = tblxPhrase(r, Y, c.currency);
  });
  return { rows, ess: ess.map(k => rows.find(r => r.k === k)).filter(Boolean) };
}
// Une phrase de lecture par ligne : le sens de l'évolution, l'ampleur, la médiane du secteur
function tblxPhrase(r, Y, cur) {
  const yl = Y[r.li], yp = r.li > 0 ? Y[r.li - 1] : null, yf = Y[r.fi], F = r.full;
  if (r.n === 0) return "";
  let t = "";
  if (r.k === "netDebt" && r.last < 0) t = `Plus de trésorerie que de dettes en ${yl} : ${big(-r.last, cur)} d'avance.`;
  else if (r.k === "lev" && r.last < 0) t = `Pas de dette nette en ${yl} : l'entreprise a plus de trésorerie que de dettes.`;
  else if (r.n === 1) t = `${F(r.last)} en ${yl}. Un seul exercice publié : pas encore d'évolution à lire.`;
  else if (r.kind === "money" || r.kind === "ps") {
    const pos = r.sens >= 0;
    if (pos && r.last < 0 && r.k !== "capex") t = r.prev != null && r.prev >= 0 ? `${r.k === "net" ? "Perte" : "Chiffre négatif"} en ${yl} (${F(r.last)}), après ${F(r.prev)} en ${yp}.` : `${r.k === "net" ? "Perte" : "Chiffre négatif"} en ${yl} (${F(r.last)})${r.prev != null ? `, comme en ${yp}` : ""}.`;
    else if (pos && r.prev != null && r.prev < 0 && r.last >= 0) t = `De nouveau positif en ${yl} (${F(r.last)}), après ${F(r.prev)} en ${yp}.`;
    else {
      let st = 0; for (let i = r.li; i > r.fi; i--) { const d = tblxDir(r.kind, r.vals[i - 1], r.vals[i]); if (d == null || d === 0 || d !== r.dir) break; st++; }
      const tot = r.first > 0 && r.last > 0 ? tblxRel(r.last / r.first - 1) : "";
      const w = d => d > 0 ? "En hausse" : d < 0 ? "En baisse" : "Stable";
      if (r.dir && st >= 2 && st === r.n - 1) t = `${w(r.dir)} chaque année depuis ${yf} : de ${F(r.first)} à ${F(r.last)}${tot ? `, soit ${tot}` : ""}.`; // 1/11 : on dit d'où l'on part et où l'on arrive
      else if (r.dir && st >= 2) { const v0 = r.vals[r.li - st], tt = v0 > 0 && r.last > 0 ? tblxRel(r.last / v0 - 1) : ""; t = `${w(r.dir)} ${st} ans de suite : ${F(v0)} en ${Y[r.li - st]}, ${F(r.last)} en ${yl}${tt ? ` (${tt})` : ""}.`; } // 1/11 : l'écart sur la même période, plus de comparaison avec une année plus ancienne (trompeuse)
      else {
        const one = tblxChange(r.kind, r.prev, r.last), totDir = tblxDir(r.kind, r.first, r.last);
        t = r.prev == null ? `${F(r.last)} en ${yl}.` : `${w(r.dir)} sur un an${one && r.dir ? ` (${one})` : ""}${tot && r.n >= 3 ? `${totDir && r.dir && totDir !== r.dir ? ", mais" : ","} ${tot} depuis ${yf}` : ""}.`;
      }
    }
  } else {
    const totDir = tblxDir(r.kind, r.first, r.last);
    if (r.k === "g") t = `${F(r.last)} en ${yl}${r.prev != null ? `, après ${F(r.prev)} en ${yp}` : ""}.`;
    else if (!totDir && F(r.first) === F(r.last)) t = `Stable depuis ${yf}, autour de ${F(r.last)}.`;
    else {
      t = `${totDir > 0 ? "En hausse" : totDir < 0 ? "En baisse" : "Presque stable"} depuis ${yf} : de ${F(r.first)} à ${F(r.last)}`;
      t += r.n >= 3 && r.dir && totDir && r.dir !== totDir ? `, mais en ${r.dir > 0 ? "hausse" : "baisse"} sur un an (${tblxChange(r.kind, r.prev, r.last)}).` : ".";
    }
  }
  if (r.vm) t += ` ${r.vm.txt.replace(/^./, x => x.toUpperCase())} (${r.full(r.med)}).`;
  return t;
}

/* ---------- Défilement horizontal : ombres et indication ---------- */
function tblxScrollBox(inner, hint = "Faites glisser pour voir toutes les colonnes") {
  return `<div class="tbx-box"><div class="scroll-x tbx-sc">${inner}</div><div class="tbx-hint" aria-hidden="true">${esc(hint)} <b>⇆</b></div></div>`;
}
function tblxBindScroll(root) {
  (root ? $$(".tbx-box", root) : $$(".tbx-box")).forEach(b => {
    const sc = $(".tbx-sc", b); if (!sc || sc.dataset.tb) return; sc.dataset.tb = 1;
    const up = () => { const m = sc.scrollWidth - sc.clientWidth; b.classList.toggle("can", m > 2); b.classList.toggle("l", sc.scrollLeft > 2); b.classList.toggle("r", sc.scrollLeft < m - 2); };
    sc.addEventListener("scroll", up, { passive: true }); addEventListener("resize", up); up(); requestAnimationFrame(up); setTimeout(up, 60);
  });
}
// Tri générique : en-têtes th[data-sk] (index de colonne), cellules td[data-v] (valeur numérique ou texte)
/* ---------- Onglet « Les chiffres en détail » ---------- */
const tblxProvG = k => typeof provBtn === "function" ? provBtn(k, "") : ""; // en-tête d'un tableau de plusieurs entreprises


/* ---------- Onglet « Les chiffres en détail » : regroupé par thème (refonte du 29 octobre, 13 h 30) ----------
   En tête, ce qui a le plus changé sur un an ; puis un bloc par thème (croissance, rentabilité, bilan et endettement,
   flux de trésorerie, valorisation, dividende) : une question simple, les indicateurs avec leur tendance et la médiane du secteur,
   un graphique, et le détail accessible sans tout afficher. Le tableau complet année par année reste disponible, replié. */

/* ---------- Graphique en colonnes par année : dernière année accentuée, valeurs affichées, repère médiane ---------- */
function colChart({ labels, series, fmt, tickFmt = null, ref = null, refLabel = "", h = 170, note = "" }) {
  let k = 0; while (k < labels.length - 1 && series.every(s => !okn(s.values[k]))) k++;
  labels = labels.slice(k); series = series.map(s => ({ ...s, values: s.values.slice(k).map(v => okn(v) ? v : null) }));
  const all = series.flatMap(s => s.values).filter(v => v != null).concat(ref != null ? [ref] : []);
  if (!all.length) return `<p class="muted" style="margin:0">Pas de chiffres publiés pour ce graphique.</p>`;
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all)), tmin = ticks[0], tmax = ticks.at(-1);
  const W = chartW(), H = h, pl = W < 420 ? 46 : 54, pr = 12, pt = 22, pb = 28, n = labels.length, band = (W - pl - pr) / n;
  const Y = v => pt + (H - pt - pb) * (tmax - v) / (tmax - tmin || 1), X = i => pl + band * (i + .5);
  const ns = series.length, bw = Math.min(ns > 1 ? 16 : 30, band * (ns > 1 ? 0.6 : 0.56) / ns), gap = 2, tf = tickFmt || fmt;
  const one = ns === 1, PAST = "#C9C1B1", PASTNEG = "#EBA48F";
  const maxLab = one ? Math.max(...series[0].values.filter(v => v != null).map(v => String(fmt(v)).length)) : 99;
  const allLabels = one && band >= maxLab * 6.3 + 8;
  let g = ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="${t === 0 ? "#CFC6B4" : GRIDC}" stroke-width="1"/><text x="${pl - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="${AXC}">${esc(tf(t))}</text>`).join("");
  let bars = "", hits = "";
  labels.forEach((lab, i) => {
    const x0 = X(i) - (ns * bw + (ns - 1) * gap) / 2, lastI = i === n - 1;
    series.forEach((s, j) => {
      const v = s.values[i]; if (v == null) { if (one) bars += `<text x="${X(i)}" y="${Y(0) - 6}" text-anchor="middle" font-size="11" fill="${AXC}">non publié</text>`; return; }
      const x = x0 + j * (bw + gap), y0 = Y(Math.max(0, v)), y1 = Y(Math.min(0, v)), hh = Math.max(1.5, y1 - y0), r = Math.min(4, bw / 2, hh);
      const col = one ? (v < 0 ? (lastI ? ORANGEC : PASTNEG) : (lastI ? (s.color || INK) : PAST)) : (v < 0 ? ORANGEC : (s.color || INK));
      bars += v >= 0 ? `<path d="M${x},${y1} V${y0 + r} Q${x},${y0} ${x + r},${y0} H${x + bw - r} Q${x + bw},${y0} ${x + bw},${y0 + r} V${y1} Z" fill="${col}"/>`
        : `<path d="M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 - r} V${y0} Z" fill="${col}"/>`;
    });
    if (one) { const v = series[0].values[i]; if (v != null && (lastI || allLabels)) bars += `<text x="${X(i)}" y="${v >= 0 ? Y(v) - 7 : Y(v) + 15}" text-anchor="middle" font-size="${lastI ? 12.5 : 11.5}" font-weight="${lastI ? 700 : 500}" fill="${lastI ? INK : "#6E695F"}">${esc(fmt(v))}</text>`; }
    g += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="12" ${i === n - 1 ? 'font-weight="700" fill="#111214"' : 'fill="#55524C"'}>${esc(lab)}</text>`;
    const tip = { h: String(lab), r: series.map(s => [s.name, s.values[i] == null ? "non publié" : fmt(s.values[i]), s.color || INK]).concat(ref != null ? [[refLabel, fmt(ref), SAND]] : []) };
    hits += `<rect x="${pl + band * i}" y="${pt}" width="${band}" height="${H - pt - pb}" fill="transparent" tabindex="0" ${tipAttr(tip)}/>`;
  });
  const refl = ref != null ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(ref)}" y2="${Y(ref)}" stroke="#A39679" stroke-width="1.6" stroke-dasharray="6 4"/>` : "";
  const leg = ns > 1 || ref != null ? `<div class="lg2">${series.map(s => `<span><i style="background:${s.color || INK}"></i>${esc(s.name)}</span>`).join("")}${ref != null ? `<span><i class="ln tbx-dash"></i>${esc(refLabel)} : ${esc(fmt(ref))}</span>` : ""}</div>` : "";
  return `<div class="chart2">${leg}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.name).join(", "))}">${g}${refl}${bars}${hits}</svg>${note ? `<p class="note">${note}</p>` : ""}</div>`;
}

/* ---------- Tri générique par délégation : table.tbx-sort th[data-sk], valeurs dans td[data-v] ---------- */
document.addEventListener("click", e => {
  const th = e.target.closest("table.tbx-sort th[data-sk]"); if (!th || e.target.closest(".def")) return;
  const table = th.closest("table"), col = +th.dataset.sk, asc = th.getAttribute("aria-sort") === "descending";
  $$("th[data-sk]", table).forEach(x => x.removeAttribute("aria-sort"));
  th.setAttribute("aria-sort", asc ? "ascending" : "descending");
  const tb = table.tBodies[0], rows = [...tb.rows], dir = asc ? 1 : -1;
  const val = r => { const c = r.cells[col], v = c ? c.dataset.v : null; return v == null || v === "" ? null : isNaN(+v) ? v : +v; };
  rows.sort((a, b) => { const x = val(a), y = val(b); if (x == null) return y == null ? 0 : 1; if (y == null) return -1; return typeof x === "string" ? dir * String(x).localeCompare(y, "fr") : dir * (x - y); });
  rows.forEach(r => tb.appendChild(r));
});
const tblxTh = (label, i, cls = "") => `<th scope="col" class="${cls}" data-sk="${i}" title="Cliquer pour trier">${label}<i class="tbx-so" aria-hidden="true"></i></th>`;
// Case colorée selon la zone (vert : nettement mieux que la médiane du secteur, orange : nettement moins bien)
function tblxZoneCell(v, fmt, m, lowerBetter, band = null) { // band : écart absolu jugé net (sinon 15 %)
  if (!okn(v)) return `<td class="num na" data-v="">–</td>`;
  const b = band != null ? band : Math.abs(m || 0) * 0.15, d = m == null ? 0 : (v - m) * (lowerBetter ? -1 : 1);
  const z = lowerBetter == null || m == null ? "" : d > b ? "tz-fort" : d < -b ? "tz-vig" : "tz-moyen";
  return `<td class="num" data-v="${v}"><span class="tbx-val sm ${z}">${esc(fmt(v))}</span>${m != null ? `<small class="tbx-sec">secteur ${esc(fmt(m))}</small>` : ""}</td>`;
}

/* ---------- Résultats du copilote (« Demander ») ---------- */
function cellInd(c, k) {
  const f = INDI[k], v = f[1](c);
  const m = v == null ? null : medInd(c.sector, k), pctLike = ["croissance", "marge", "marge_nette", "rentabilite", "rendement", "distribution"].includes(k);
  return tblxZoneCell(v, f[2], m, f[3], pctLike && m != null ? Math.max(2, Math.abs(m) * 0.2) : null);
}
/* 5e passage (B4) : les critères compris, en pastilles modifiables (retirer, changer le seuil, ajouter), au-dessus de la liste.
   Chaque modification relance le même calcul (runFiltre) sur la même demande : rien n'est rédigé, rien n'est estimé. */
const FILT_A = []; // demandes affichées, retrouvées par leur numéro
const FILT_COND = { sup_mediane: "au-dessus de la médiane", inf_mediane: "sous la médiane", sup: "plus de", inf: "moins de" };
const FILT_AJOUT = [["croissance", "sup", 8, "Croissance > 8 %"], ["marge", "sup_mediane", null, "Marge > médiane"], ["dette", "inf", 2, "Dette < 2 ans"], ["rendement", "sup", 3, "Dividende > 3 %"], ["per", "inf_mediane", null, "PER < médiane"]];
function filtPastilles(a, fid) {
  const COURT = { croissance: "Croissance", marge: "Marge", marge_nette: "Marge nette", rentabilite: "Rentabilité", dette: "Dette", per: "PER", rendement: "Dividende", distribution: "Part versée", variation_1an: "Cours sur 1 an", capitalisation: "Valeur en Bourse", taille: "Ventes" };
  const lab = k => { const I = INDI[k.indicateur]; if (!I) return ""; const n = COURT[k.indicateur] || I[0].replace(/ \(.*\)$/, ""); return k.condition === "sup_mediane" || k.condition === "inf_mediane" ? `${n} ${FILT_COND[k.condition]}` : `${n} : ${FILT_COND[k.condition]} ${k.valeur != null ? I[2](k.valeur) : ""}`; };
  const P = [];
  if (a.secteur) P.push(["secteur", R.sectors[a.secteur] || a.secteur]);
  if (a.region) P.push(["region", R.regions[a.region] || a.region]);
  if (a.pays) P.push(["pays", COUNTRY[a.pays] || a.pays]);
  if (a.pea) P.push(["pea", "Éligibles au PEA"]);
  if (a.mot && THEME_RE[a.mot]) P.push(["mot", "Thème " + THEME_RE[a.mot][1]]);
  a.criteres.forEach((k, i) => P.push(["c" + i, lab(k), k]));
  const libres = FILT_AJOUT.filter(([ind]) => !a.criteres.some(k => k.indicateur === ind));
  return `<div class="filt-p" data-fid="${fid}" aria-label="Critères compris : touchez une pastille pour la retirer ou la modifier"><span class="filt-pt">Compris :</span>${P.map(([k, t, c]) => `<span class="filt-pi">${c && (c.condition === "sup" || c.condition === "inf") ? `<button type="button" class="filt-v" data-filt-moins="${k}" aria-label="Seuil plus bas">−</button>` : ""}<span>${esc(t)}</span>${c && (c.condition === "sup" || c.condition === "inf") ? `<button type="button" class="filt-v" data-filt-plus="${k}" aria-label="Seuil plus haut">+</button>` : ""}<button type="button" class="filt-x" data-filt-x="${k}" aria-label="Retirer : ${esc(t)}">×</button></span>`).join("")}
    ${libres.length ? `<label class="filt-add"><span class="sr">Ajouter un critère</span><select data-filt-add><option value="">+ Ajouter un critère</option>${libres.map(([ind, , , t], i) => `<option value="${ind}">${esc(t)}</option>`).join("")}</select></label>` : ""}</div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-filt-x],[data-filt-plus],[data-filt-moins]"); if (!b) return;
  const box = b.closest(".filt-p"), wrap = box && box.closest(".filt-w"), a = box && FILT_A[+box.dataset.fid]; if (!a || !wrap) return;
  const k = b.dataset.filtX || b.dataset.filtPlus || b.dataset.filtMoins;
  if (b.dataset.filtX) { if (k[0] === "c") a.criteres.splice(+k.slice(1), 1); else delete a[k]; }
  else { const c = a.criteres[+k.slice(1)]; if (!c || c.valeur == null) return; const pas = Math.max(0.5, Math.abs(c.valeur) * 0.25); c.valeur = Math.round((c.valeur + (b.dataset.filtPlus ? pas : -pas)) * 10) / 10; }
  a.titre = "Entreprises qui correspondent à vos critères"; wrap.outerHTML = filtreHTML(a);
});
document.addEventListener("change", e => {
  const s = e.target.closest && e.target.closest("[data-filt-add]"); if (!s || !s.value) return;
  const box = s.closest(".filt-p"), wrap = box && box.closest(".filt-w"), a = box && FILT_A[+box.dataset.fid]; if (!a || !wrap) return;
  const x = FILT_AJOUT.find(([ind]) => ind === s.value); if (!x) return; a.criteres.push({ indicateur: x[0], condition: x[1], valeur: x[2] });
  if (!a.tri || !INDI[a.tri.indicateur]) a.tri = { indicateur: x[0], ordre: "desc" }; wrap.outerHTML = filtreHTML(a);
});
function filtreHTML(a) {
  const fid = FILT_A.indexOf(a) >= 0 ? FILT_A.indexOf(a) : FILT_A.push(a) - 1;
  if (!a.tri || (a.criteres.length && !a.criteres.some(k => k.indicateur === a.tri.indicateur) && a.tri.indicateur !== "capitalisation" && a.tri.indicateur !== "taille" && a.tri.indicateur !== "variation_1an")) a.tri = a.criteres[0] ? { indicateur: a.criteres[0].indicateur, ordre: INDI[a.criteres[0].indicateur][3] === true ? "asc" : "desc" } : { indicateur: "capitalisation", ordre: "desc" };
  return `<div class="filt-w">${filtPastilles(a, fid)}${filtreCorps(a)}</div>`;
}
// Minuscule en tête, sauf pour un sigle (PER).
function tbMin(t) { return /^[A-Z]{2,}\b/.test(t) ? t : t[0].toLowerCase() + t.slice(1); }
function filtreCorps(a) {
  const { l, tri } = runFiltre(a), lim = 30, /* 4/11 : liste entière pour tous (réponses calculées et pages /question) */ cols = [...new Set([...a.criteres.map(k => k.indicateur), tri.indicateur, "per"])].filter(k => INDI[k]).slice(0, 4);
  const desc = [a.mot && THEME_RE[a.mot] && "thème " + THEME_RE[a.mot][1], a.secteur && R.sectors[a.secteur], a.region && R.regions[a.region], a.pays && (COUNTRY[a.pays] || a.pays), a.pea && "éligibles au PEA", ...a.criteres.filter(k => !((k.condition === "sup" || k.condition === "inf") && k.valeur == null)).map(k => k.indicateur === "per" && k.condition === "sup" && k.valeur === 0 ? "bénéficiaires" : `${tbMin(INDI[k.indicateur][0])} ${k.condition === "sup_mediane" ? "au-dessus de la médiane du secteur" : k.condition === "inf_mediane" ? "sous la médiane du secteur" : (k.condition === "sup" ? ": plus de " : ": moins de ") + (k.valeur != null ? INDI[k.indicateur][2](k.valeur) : "")}`)].filter(Boolean);
  if (!l.length) return `<p class="lead">Aucune entreprise ne remplit tous ces critères (${esc(desc.join(", "))}). Essayez avec un critère de moins.</p>`;
  const tally = c => { const t = quick(c); return t ? t.fort - t.vig : ""; };
  return `<p class="lead" style="margin:0 0 6px"><b>${l.length} entreprise${l.length > 1 ? "s" : ""}</b> remplissent ces critères${desc.length ? ` : ${esc(desc.join(", "))}` : ""}. Classées par ${esc(tbMin(INDI[tri.indicateur][0]))}.</p>
    <div class="tbx-legend" style="padding:0 0 8px"><span><i class="lg-up"></i>nettement mieux que la médiane du secteur</span><span><i class="lg-dn"></i>nettement moins bien</span><span class="light">Une liste de critères n'est pas une sélection d'achat : ouvrez chaque fiche.</span></div>
    ${tblxScrollBox(`<table class="t tbx tbx-sort iat"><thead><tr><th class="l lab" scope="col" data-sk="0">Entreprise<i class="tbx-so"></i></th>${cols.map((k, i) => tblxTh(esc(INDI[k][0]) + tblxProvG(k), i + 1)).join("")}<th class="l" scope="col" data-sk="${cols.length + 1}">Repères<i class="tbx-so"></i></th></tr></thead><tbody>
    ${l.slice(0, lim).map((c, j) => `<tr class="${j % 2 ? "z" : ""}"><th scope="row" class="l lab" data-v="${esc(c.name)}"><a class="cell-co" href="/entreprise/${c.id}">${logo(c, 26)}<span><b>${esc(c.name)}</b><small class="light">${esc(regName(c))} · ${esc(secName(c))}</small></span></a></th>${cols.map(k => cellInd(c, k)).join("")}<td class="l" data-v="${tally(c)}">${(t => t ? pills(t) : "")(quick(c))}</td></tr>`).join("")}</tbody></table>`)}
    ${l.length > lim ? `<p class="muted" style="font-size:13.5px;margin:10px 0 0">${l.length - lim} autres entreprises.</p>` : ""}
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px">${l.length > 1 ? `<a class="more" href="/comparer?ids=${l.slice(0, 3).map(c => c.id).join(",")}">Comparer les trois premières →</a>` : ""}<button type="button" class="linkbtn" data-favall="${l.slice(0, lim).map(c => "c:" + c.id).join(",")}">☆ Tout ajouter à mes favoris</button></div>`;
}
// Les tableaux insérés après coup (copilote, IA) reçoivent leurs ombres de défilement
try { new MutationObserver(() => { if (document.querySelector(".tbx-box .tbx-sc:not([data-tb])")) tblxBindScroll(); }).observe(document.getElementById("app") || document.body, { childList: true, subtree: true }); } catch (e) { }

/* ---------- Liste des entreprises, vue tableau ---------- */
function pageEntreprises() {
  setTitle("Les entreprises"); setNav("ent");
  const qs = new URLSearchParams(location.search); if (qs.get("secteur")) listState.sector = qs.get("secteur"); if (qs.get("region")) listState.region = qs.get("region");
  const sectors = [...new Set(R.companies.map(c => c.sector))].sort((a, b) => secName({ sector: a }).localeCompare(secName({ sector: b }), "fr"));
  const n = r => R.companies.filter(c => c.region === r).length;
  app.innerHTML = `<h1 class="pagetitle">Les entreprises</h1><p class="pagesub">${R.companies.length} grandes entreprises de France, d'Europe et des États-Unis. Les points de couleur résument ce que disent leurs comptes.</p>
    <section class="panel">
      <div class="filters" id="regTabs"><button data-r="all">Toutes</button>${Object.entries(R.regions).map(([k, l]) => `<button data-r="${k}">${esc(l)} <span class="light">${n(k)}</span></button>`).join("")}</div>
      <div class="ph" style="padding-top:0;padding-bottom:0;border-bottom:0">
      <div class="filters" id="secTabs" style="border:0;padding:0;flex:1"><button data-s="all">Tous les secteurs</button>${sectors.map(s => `<button data-s="${s}">${esc(secName({ sector: s }))}</button>`).join("")}</div>
      <div class="viewsw d-only" id="vsw"><button data-v="cartes">Cartes</button><button data-v="tableau">Tableau</button></div></div></section>
    <div class="field" style="max-width:360px;margin:0 0 14px"><input id="eq" type="search" placeholder="Filtrer : nom, code, pays…" aria-label="Filtrer les entreprises"></div>
    ${LEGEND}<div id="elist"></div>`;
  const render = () => {
    $$("#regTabs button").forEach(b => b.classList.toggle("on", b.dataset.r === listState.region));
    $$("#secTabs button").forEach(b => b.classList.toggle("on", b.dataset.s === listState.sector));
    $$("#vsw button").forEach(b => b.classList.toggle("on", b.dataset.v === listState.view));
    const q = norm(($("#eq") || {}).value || "").trim();
    const list = R.companies.filter(c => (listState.region === "all" || c.region === listState.region) && (listState.sector === "all" || c.sector === listState.sector) && (!q || norm(c.name + " " + c.ticker + " " + (c.desc || "")).includes(q)));
    if (!list.length) { $("#elist").innerHTML = `<section class="panel"><div class="empty">Aucune entreprise pour ce choix.</div></section>`; return; }
    const view = innerWidth <= 760 ? "cartes" : listState.view;
    if (view === "cartes") {
      const sorted = [...list].sort((a, b) => (!!a.missing - !!b.missing) || (caEur(b) - caEur(a)) || a.name.localeCompare(b.name, "fr"));
      const base = innerWidth <= 760 ? 20 : 60, shown = sorted.slice(0, listState.max || base); // lot C : 20 cartes sur téléphone, puis « Voir plus »
      $("#elist").innerHTML = `<p class="muted" style="margin:0 0 10px;font-size:13px">${F0.format(list.length)} entreprise${list.length > 1 ? "s" : ""}, des plus grosses aux plus petites.</p><div class="cards">${shown.map(coCard).join("")}</div>${sorted.length > shown.length ? `<div style="text-align:center;margin:-12px 0 28px"><button class="btn" id="emore" type="button">Voir ${Math.min(base, sorted.length - shown.length)} de plus</button></div>` : ""}`;
      const mb = $("#emore"); if (mb) mb.onclick = () => { listState.max = (listState.max || base) + base; render(); };
      return;
    }
    const k = listState.sort, dir = listState.dir, rows = list.map(c => ({ c, m: ratios(c), t: quick(c) }));
    const val = (r, k) => k === "ca" ? caEur(r.c) || null : k === "net" ? (r.c.net != null ? r.c.net * (FXE[r.c.currency] ?? 0) : null) : k === "vig" ? (r.t ? r.t.fort - r.t.vig : null) : k === "year" ? r.c.year : r.m[k];
    rows.sort((a, b) => k === "name" ? dir * a.c.name.localeCompare(b.c.name, "fr") : (!!a.c.missing - !!b.c.missing) || dir * ((val(a, k) ?? -1e15) - (val(b, k) ?? -1e15)));
    const max = listState.tmax || 100, shown = rows.slice(0, max);
    const th = (key, label, cls = "") => `<th scope="col" class="sort ${cls}" data-k="${key}"${key === k ? ` aria-sort="${dir > 0 ? "ascending" : "descending"}"` : ""} title="Cliquer pour trier">${label}<i class="tbx-so" aria-hidden="true"></i></th>`;
    const arrow = (a, b, sens = 1) => { const d = tblxDir("money", b, a); return d == null ? "" : tblxArrow(d, d * sens, a > 0 && b > 0 ? tblxRel(a / b - 1) : "", "Par rapport à l'exercice précédent"); };
    const med = s => MED[s] || {};
    $("#elist").innerHTML = `<section class="panel"><div class="tbx-legend" style="padding:12px 18px 8px"><span><i class="lg-up"></i>nettement mieux que la médiane du secteur</span><span><i class="lg-dn"></i>nettement moins bien</span><span class="light">↑ ↓ : évolution sur un an. Chiffres du dernier rapport annuel, dans la devise de l'entreprise.</span></div>
      ${tblxScrollBox(`<table class="t tbx tbx-list click"><thead><tr>${th("name", "Entreprise", "l lab")}${th("ca", "Ventes" + tblxProvG("ca"))}${th("g1", "Croissance" + tblxProvG("g"))}${th("marge", "Marge" + tblxProvG("marge"))}${th("net", "Bénéfice" + tblxProvG("net"))}${th("vig", "Repères", "l")}${th("year", "Exercice")}</tr></thead><tbody>
      ${shown.map(({ c, m, t }, j) => `<tr data-id="${c.id}" class="${j % 2 ? "z" : ""}"><th scope="row" class="l lab"><div class="cell-co">${logo(c, 32)}<div><a class="nm" href="/entreprise/${c.id}">${esc(c.name)}</a><div class="sub">${esc(regName(c))} · ${esc(secName(c))}</div></div></div></th>
      ${c.missing ? `<td colspan="6" class="l light">${missingTxt(c)}</td>` : `<td class="num"><b class="tbx-big">${big(c.ca, c.currency)}</b>${arrow(c.ca, c.caPrev)}</td>${tblxZoneCell(m.g1, v => pct(v), med(c.sector).g1, false, Math.max(0.02, Math.abs(med(c.sector).g1 || 0) * 0.25))}${isBank(c) ? `<td class="num na" title="Ne s'applique pas aux banques et assurances">–</td>` : tblxZoneCell(m.marge, v => pct(v, 1, false), med(c.sector).marge, false, Math.max(0.03, Math.abs(med(c.sector).marge || 0) * 0.25))}<td class="num"><b class="tbx-big${c.net < 0 ? " neg" : ""}">${big(c.net, c.currency)}</b>${arrow(c.net, c.netPrev)}</td><td class="l">${t ? pills(t) : ""}</td><td class="num">${c.year ?? "–"}</td>`}</tr>`).join("")}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}
      ${rows.length > max ? `<div style="text-align:center;padding:14px"><button class="btn" id="tmore" type="button">Voir ${Math.min(100, rows.length - max)} de plus (${F0.format(rows.length - max)} restantes)</button></div>` : ""}
      <div class="src">${F0.format(list.length)} entreprise${list.length > 1 ? "s" : ""}. Cliquez sur un en-tête pour trier (ventes et bénéfices convertis en euros pour le tri), sur une ligne pour ouvrir la fiche. Couleurs : comparaison à la médiane des entreprises suivies du même secteur, pas un avis sur l'action.</div></section>`;
    tblxBindScroll($("#elist"));
    const tm = $("#tmore"); if (tm) tm.onclick = () => { listState.tmax = max + 100; render(); };
    $("#elist thead").onclick = e => { const t = e.target.closest("th.sort"); if (!t) return; if (listState.sort === t.dataset.k) listState.dir *= -1; else { listState.sort = t.dataset.k; listState.dir = t.dataset.k === "name" ? 1 : -1; } listState.tmax = 100; render(); };
  };
  let qt = null; $("#eq").oninput = () => { clearTimeout(qt); qt = setTimeout(() => { listState.tmax = 100; render(); }, 200); };
  $("#regTabs").onclick = e => { const b = e.target.closest("button"); if (b) { listState.region = b.dataset.r; listState.max = 60; listState.tmax = 100; render(); } };
  $("#secTabs").onclick = e => { const b = e.target.closest("button"); if (b) { listState.sector = b.dataset.s; listState.max = 60; listState.tmax = 100; render(); } };
  $("#vsw").onclick = e => { const b = e.target.closest("button"); if (b) { listState.view = b.dataset.v; render(); } };
  render();
}

/* pageAgenda et simFrais : déplacées dans m/outils2.js (agenda avec heures vérifiées, simulateur refait). */


/* ---------- Styles du composant ---------- */
/* styles : voir site.css */

document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".rf-moreb"); if (!b) return; const t = b.closest(".rf-thg").querySelector(".rf-more"); if (t) t.hidden = false; b.remove(); });
/* styles : voir site.css */
