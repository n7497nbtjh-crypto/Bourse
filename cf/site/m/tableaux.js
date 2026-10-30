/* Module « tableaux » de bilan. : chargé après le script principal de index.html.
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
const TBLX_GRP = { res: "Compte de résultat", bil: "Bilan", flx: "Flux de trésorerie", act: "Pour l'actionnaire" };
const TBLX_GRPSUB = { res: "Ce que l'entreprise vend et ce qu'elle gagne", bil: "Ce qu'elle possède et ce qu'elle doit, à la clôture", flx: "L'argent réellement encaissé et dépensé", act: "Ce qui revient à chaque action" };
const tblxSym = cur => CUR[cur] || cur || "";
const tblxSp = cur => CUR[cur] && CUR[cur].length === 1 ? "" : " "; // « Md€ » mais « Md CHF »
function tblxMoneyUnit(vals, cur) { // une seule unité par ligne : tout en Md ou tout en M
  const m = Math.max(0, ...vals.filter(okn).map(Math.abs)), s = tblxSym(cur);
  if (m >= 1000) return { div: 1000, d: m >= 10000 ? 1 : 2, u: "Md" + tblxSp(cur) + s, long: "milliards de " + (TBLX_CURN[cur] || cur) };
  return { div: 1, d: m >= 100 ? 0 : m >= 10 ? 1 : 2, u: "M" + tblxSp(cur) + s, long: "millions de " + (TBLX_CURN[cur] || cur) };
}
const tblxPts = d => { const x = Math.abs(d * 100); return (d > 0 ? "+" : d < 0 ? "−" : "") + nf(x < 10 ? 1 : 0).format(x) + " pt" + (x >= 2 ? "s" : ""); };
const tblxRel = r => (r > 0 ? "+" : r < 0 ? "−" : "") + nf(Math.abs(r) < 0.1 ? 1 : 0).format(Math.abs(r) * 100) + " %";
const tblxAns = v => F1.format(v) + " an" + (Math.abs(v) >= 2 ? "s" : "");
function tblxFmt(row, cur) { // [format de cellule sans unité, format complet avec unité, unité affichée]
  const k = row.kind;
  if (k === "money") { const u = tblxMoneyUnit(row.vals, cur); return [v => nf(u.d).format(v / u.div), v => big(v, cur), u.u, u.long]; }
  if (k === "ps") return [v => F2.format(v), v => eur(v, 2, cur), tblxSym(cur) + " par action", (TBLX_CURN[cur] || cur) + " par action"];
  if (k === "pctS") return [v => pct(v).replace(/\s*%$/, ""), v => pct(v), "%", "en %"];
  if (k === "pct") return [v => pct(v, 1, false).replace(/\s*%$/, ""), v => pct(v, 1, false), "%", "en %"];
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
const TBLX_LVTXT = { fort: "point fort", moyen: "dans la moyenne", vig: "point de vigilance" };
// Position par rapport à la médiane du secteur
function tblxVsMed(row) {
  const v = row.last, m = row.med; if (!okn(v) || !okn(m)) return null;
  const d = v - m, near = row.kind === "x" ? 0.3 : Math.max(0.01, Math.abs(m) * 0.1), far = row.kind === "x" ? 1 : Math.max(0.03, Math.abs(m) * 0.3);
  const pos = Math.abs(d) <= near ? 0 : Math.sign(d), strong = Math.abs(d) >= far;
  const q = pos * (row.k === "payout" ? -1 : row.sens || 0); // pour la part versée, plus bas laisse plus de marge
  return { pos, strong, q, txt: pos === 0 ? "proche de la médiane du secteur" : (strong ? "nettement " : "") + (pos > 0 ? "au-dessus de" : "en dessous de") + " la médiane du secteur" };
}

/* ---------- Mini-courbe (sparkline) ---------- */
function tblxSpark(vals, { w = 64, h = 22, q = 0, med = null, label = "" } = {}) {
  const pts = vals.map((v, i) => okn(v) ? [i, v] : null).filter(Boolean);
  if (pts.length < 2) return `<svg class="spk" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="2" x2="${w - 2}" y1="${h / 2}" y2="${h / 2}" stroke="#E2DCCF" stroke-dasharray="2 3"/></svg>`;
  const ys = pts.map(p => p[1]).concat(okn(med) ? [med] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys); if (hi === lo) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; }
  const n = vals.length, X = i => 3 + (w - 8) * (n > 1 ? i / (n - 1) : 0.5), Y = v => 3 + (h - 6) * (hi - v) / (hi - lo);
  let d = "", prev = -2; pts.forEach(([i, v]) => { d += (i === prev + 1 ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1); prev = i; });
  const col = q > 0 ? "#0E6B4A" : q < 0 ? "#D94F2B" : "#111214", last = pts.at(-1);
  const zero = lo < 0 && hi > 0 ? `<line x1="2" x2="${w - 2}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#D8D1C2" stroke-width="1"/>` : "";
  const md = okn(med) ? `<line x1="2" x2="${w - 2}" y1="${Y(med).toFixed(1)}" y2="${Y(med).toFixed(1)}" stroke="#B9AE97" stroke-width="1.2" stroke-dasharray="3 2"/>` : "";
  return `<svg class="spk" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${zero}${md}<path d="${d}" fill="none" stroke="#8A857D" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="3.2" fill="${col}"/></svg>`;
}
// Flèche de tendance : sens de la variation, couleur selon que c'est une bonne ou une moins bonne nouvelle
function tblxArrow(dir, q, txt = "", title = "") {
  if (dir == null) return `<span class="tbx-ar na">–</span>`;
  const g = dir > 0 ? "↑" : dir < 0 ? "↓" : "→", c = q > 0 ? "up" : q < 0 ? "dn" : "eq";
  return `<span class="tbx-ar ${c}"${title ? ` title="${esc(title)}"` : ""}><b aria-hidden="true">${g}</b>${txt ? `<span>${esc(txt)}</span>` : ""}<span class="sr">${dir > 0 ? "en hausse" : dir < 0 ? "en baisse" : "stable"}${q > 0 ? ", bonne nouvelle" : q < 0 ? ", moins bonne nouvelle" : ""}</span></span>`;
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
      if (r.dir && st >= 2 && st === r.n - 1) t = `${w(r.dir)} chaque année depuis ${yf}${tot ? ` : ${tot} au total` : ""}.`;
      else if (r.dir && st >= 2) t = `${w(r.dir)} depuis ${Y[r.li - st]} (${st} ans de suite)${tot && r.n >= 3 ? `, ${tot} depuis ${yf}` : ""}.`;
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
function tblxSortable(table) {
  if (!table || table.dataset.sorted) return; table.dataset.sorted = 1;
  table.querySelector("thead").addEventListener("click", e => {
    const th = e.target.closest("th[data-sk]"); if (!th) return;
    const col = +th.dataset.sk, dir = th.getAttribute("aria-sort") === "descending" ? 1 : -1;
    $$("th[data-sk]", table).forEach(x => x.removeAttribute("aria-sort"));
    th.setAttribute("aria-sort", dir > 0 ? "ascending" : "descending");
    const tb = table.tBodies[0], rows = [...tb.rows];
    const val = r => { const c = r.cells[col]; const v = c ? c.dataset.v : null; return v == null || v === "" ? null : isNaN(+v) ? v : +v; };
    rows.sort((a, b) => { const x = val(a), y = val(b); if (x == null) return 1; if (y == null) return -1; return typeof x === "string" ? dir * x.localeCompare(y, "fr") : dir * (x - y); });
    rows.forEach(r => tb.appendChild(r));
  });
}

/* ---------- Onglet « Les chiffres en détail » ---------- */
const TBLX_VK = "bilan.tableaux.vue";
const tblxGetV = () => { try { return localStorage.getItem(TBLX_VK) === "tout" ? "tout" : "ess"; } catch (e) { return "ess"; } };
const tblxSetV = v => { try { localStorage.setItem(TBLX_VK, v); } catch (e) { } };
const tblxTitle = r => { const t = ALL[r.term]; return t ? t.what : ""; };
const tblxMob = () => (window.innerWidth || 1000) <= 760;
const tblxProv = (k, s) => typeof provBtn === "function" && s ? provBtn(k, "c:" + s.id) : ""; // bouton « i » : d'où vient ce chiffre (m/provenance.js)
const tblxProvG = k => typeof provBtn === "function" ? provBtn(k, "") : ""; // en-tête d'un tableau de plusieurs entreprises
function tblxLvCls(r) { return r.lv ? "tz-" + r.lv : ""; }

function tblxEssHTML(s, c, P) {
  const Y = c.years, yl = Y[lastIdx(c)], span = `${Y[0]} à ${yl}`;
  const rows = P.ess.map(r => {
    const ly = Y[r.li], stale = ly !== yl;
    const one = tblxChange(r.kind, r.prev, r.last);
    return `<tr data-k="${r.k}">
      <th scope="row" class="l lab"><span class="nm">${def(r.term, r.short || r.label)}${tblxProv(r.k, s)}</span><p class="tbx-ph">${esc(r.phrase)}</p></th>
      <td class="v"><span class="tbx-val ${tblxLvCls(r)}">${esc(r.full(r.last))}</span>${stale ? `<small class="light">en ${ly}</small>` : ""}${r.lv ? `<small class="tbx-lv ${tblxLvCls(r)}">${TBLX_LVTXT[r.lv]}</small>` : ""}${r.med != null ? `<small class="m-only light tbx-mm">secteur : ${esc(r.full(r.med))}</small>` : ""}</td>
      <td class="tr"><button type="button" class="tbx-gb" data-g="${r.k}" aria-label="Voir l'évolution en graphique : ${esc(r.short || r.label)}">${tblxSpark(r.vals, { w: 76, h: 26, q: r.q, med: r.med, label: "Évolution de " + span })}</button>${tblxArrow(r.dir, r.q, one, "Sur un an")}</td>
      <td class="md d-only">${r.med != null ? `<span class="num">${esc(r.full(r.med))}</span>${r.vm ? `<small class="tbx-vm q${r.vm.q > 0 ? "up" : r.vm.q < 0 ? "dn" : "eq"}">${esc(r.vm.pos === 0 ? "proche" : (r.vm.strong ? "nettement " : "") + (r.vm.pos > 0 ? "au-dessus" : "en dessous"))}</small>` : ""}` : `<span class="light">–</span>`}</td></tr>`;
  }).join("");
  return `<table class="t tbx tbx-ess"><caption class="sr">L'essentiel des comptes de ${esc(s.name)}</caption><thead><tr><th class="l" scope="col">Indicateur</th><th scope="col">Exercice ${yl}</th><th scope="col">Évolution ${esc(span)}</th><th scope="col" class="d-only">${def("mediane", "Médiane du secteur")}</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function tblxFullHTML(s, c, P) {
  const Y = c.years, L = Y.length - 1, nc = Y.length + 3, ORD = Y.map((_, i) => i);
  ORD.reverse(); // 30/10 (Romain) : on lit de gauche à droite, l'exercice le plus récent vient en premier, juste après le nom de la ligne
  let z = 0, out = "", g0 = "";
  P.rows.forEach(r => {
    if (r.grp !== g0) { g0 = r.grp; z = 0; out += `<tr class="grp"><th colspan="${nc}" scope="colgroup"><span>${TBLX_GRP[g0]}<small>${TBLX_GRPSUB[g0]}</small></span></th></tr>`; }
    const cells = ORD.map(i => { const v = r.vals[i];
      if (v == null) return `<td class="num na${i === L ? " last" : ""}" title="Non publié">–</td>`;
      const d = i > 0 ? tblxDir(r.kind, r.vals[i - 1], v) : null, q = d == null ? 0 : d * (r.sens || 0);
      const lvc = "";
      return `<td class="num${q > 0 ? " hu" : q < 0 ? " hd" : ""}${i === L ? " last" : ""}${lvc}"${i > 0 && d != null ? ` title="${esc(Y[i] + " : " + r.full(v) + (tblxChange(r.kind, r.vals[i - 1], v) ? " (" + tblxChange(r.kind, r.vals[i - 1], v) + " sur un an)" : ""))}"` : ""}>${esc(r.cell(v))}</td>`;
    }).join("");
    out += `<tr data-k="${r.k}" class="${z++ % 2 ? "z" : ""}${r.ess ? " es" : ""}" tabindex="0" aria-expanded="false">
      <th scope="row" class="l lab"><span class="nm">${def(r.term, r.label)}${tblxProv(r.k, s)}</span><span class="u">${esc(r.unit)}</span></th>${cells}
      <td class="tr"><span class="tbx-trw">${tblxSpark(r.vals, { w: 60, h: 20, q: r.q, med: r.med, label: "Évolution" })}${tblxArrow(r.dir, r.q, "", "Sur un an")}</span></td>
      <td class="md">${r.med != null ? `<span class="num">${esc(r.cell(r.med))}</span>` : `<span class="light">–</span>`}</td></tr>`;
  });
  return `<table class="t tbx tbx-full"><caption class="sr">Tous les comptes publiés de ${esc(s.name)}, par exercice</caption><thead><tr><th class="l lab" scope="col">Indicateur <span class="u">unité</span></th>${ORD.map(i => [Y[i], i]).map(([y, i]) => `<th scope="col" class="${i === L ? "last" : ""}">${y}${i === L ? "<small>dernier</small>" : ""}</th>`).join("")}<th scope="col">Sur un an</th><th scope="col">${def("mediane", "Médiane secteur")}</th></tr></thead><tbody>${out}</tbody></table>`;
}
function tblxDetail(r, Y) {
  const rule = RULES[r.term] || RULES[r.k];
  return `<div class="tbx-det"><p><b>${esc(r.label)}.</b> ${esc(r.phrase)}</p>${r.lv ? `<p><span class="tbx-lv ${tblxLvCls(r)}">${TBLX_LVTXT[r.lv]}</span> ${rule ? esc(rule) : ""}</p>` : rule ? `<p class="muted">${esc(rule)}</p>` : ""}
    <p class="tbx-acts"><button type="button" class="linkbtn tbx-gb" data-g="${r.k}">Voir en graphique</button> ${ALL[r.term] ? `<button type="button" class="def linkbtn" data-def="${r.term}">Définition</button>` : ""}</p></div>`;
}
function tblxChart(s, c, r) {
  if (!r) return "";
  const cur = c.currency, tick = r.kind === "money" ? compact(cur) : r.kind === "pct" || r.kind === "pctS" ? pctTick : r.kind === "ps" ? (v => F2.format(v)) : (v => F1.format(v));
  return colChart({ labels: c.years.map(String), series: [{ name: r.short || r.label, values: r.vals }], fmt: r.full, tickFmt: tick, ref: r.med, refLabel: "Médiane du secteur, dernier exercice", h: 210 })
    + `<p class="tbx-gph"><b>${esc(r.short || r.label)}${r.unit && r.kind === "money" ? ` <span class="light">(${esc(r.ulong)})</span>` : ""}.</b> ${esc(r.phrase)}</p>`;
}

/* ---------- Onglet « Les chiffres en détail » : regroupé par thème (refonte du 29 octobre, 13 h 30) ----------
   En tête, ce qui a le plus changé sur un an ; puis un bloc par thème (croissance, rentabilité, bilan et endettement,
   flux de trésorerie, valorisation, dividende) : une question simple, les indicateurs avec leur tendance et la médiane du secteur,
   un graphique, et le détail accessible sans tout afficher. Le tableau complet année par année reste disponible, replié. */
const TBLX_THEMES = [
  { k: "croissance", t: "Croissance", q: "Vend-elle plus qu'avant ?", rows: ["ca", "g", "eps"],
    ex: "Les ventes (chiffre d'affaires) mesurent la taille de l'activité. Une hausse peut venir des volumes, des prix, du change ou d'un rachat : il faut la lire avec la rentabilité." },
  { k: "rentabilite", t: "Rentabilité", q: "Que lui reste-t-il sur ce qu'elle vend ?", rows: ["marge", "ebit", "ebitda", "net", "nm", "roe", "roce"],
    ex: "La marge d'exploitation dit ce qu'il reste sur 100 de ventes une fois payés salaires, achats et frais. La rentabilité des capitaux propres (ROE) rapporte le bénéfice à l'argent des actionnaires." },
  { k: "bilan", t: "Bilan et endettement", q: "Ce qu'elle possède, ce qu'elle doit", rows: ["lev", "netDebt", "debt", "cash", "equity", "gear"],
    ex: "La dette nette est la dette financière moins la trésorerie. Rapportée au résultat d'exploitation avant amortissements (EBITDA), elle dit en combien d'années l'entreprise pourrait la rembourser." },
  { k: "flux", t: "Flux de trésorerie", q: "Ses bénéfices deviennent-ils de l'argent disponible ?", rows: ["fcf", "cfo", "capex", "conv"],
    ex: "Le bénéfice est un calcul comptable ; la trésorerie, de l'argent réellement encaissé. L'argent disponible est ce qui reste après les investissements : il paie dividendes, rachats d'actions et remboursements." },
  { k: "valorisation", t: "Valorisation", q: "Combien coûte l'entreprise en Bourse ?", special: "prix" },
  { k: "dividende", t: "Dividende", q: "Que reçoit l'actionnaire ?", special: "div" },
];
function tblxThemeOf(k) { const T = TBLX_THEMES.find(T => T.rows && T.rows.includes(k)); return T ? T.k : k === "dps" || k === "divPaid" || k === "payout" ? "dividende" : "croissance"; }
function tblxScore(r) { // ampleur d'une évolution sur un an, 1 = significative
  if (r.prev == null || r.last == null || !r.sens || r.k === "g") return 0;
  if (r.kind === "money" || r.kind === "ps") return r.prev !== 0 ? Math.abs((r.last - r.prev) / r.prev) / 0.10 : 0;
  if (r.kind === "pct" || r.kind === "pctS") return Math.abs(r.last - r.prev) * 100 / 2;
  if (r.kind === "x") return Math.abs(r.last - r.prev) / 0.5;
  return 0;
}
function tblxChanges(P, yi) {
  const l = P.rows.filter(r => r.li === yi).map(r => ({ r, sc: tblxScore(r) * (r.ess ? 1.3 : 1) })).filter(x => x.sc >= 1).sort((a, b) => b.sc - a.sc);
  const out = [], seen = new Set();
  for (const { r } of l) { const th = tblxThemeOf(r.k); if (seen.has(r.k) || (r.k === "nm" && seen.has("net")) || (r.k === "debt" && seen.has("netDebt"))) continue; seen.add(r.k); out.push(r); if (out.length >= 4) break; }
  return out;
}
function tblxThemeRows(rows, Y, s) {
  const yl = Y.at(-1);
  return rows.map(r => {
    const ly = Y[r.li], stale = ly !== yl, one = tblxChange(r.kind, r.prev, r.last);
    return `<tr data-k="${r.k}" tabindex="0" aria-expanded="false">
      <th scope="row" class="l lab"><span class="nm">${def(r.term, r.short || r.label)}${tblxProv(r.k, s)}</span><p class="tbx-ph">${esc(r.phrase)}</p></th>
      <td class="v"><span class="tbx-val ${tblxLvCls(r)}">${esc(r.full(r.last))}</span>${stale ? `<small class="light">en ${ly}</small>` : ""}${r.lv ? `<small class="tbx-lv ${tblxLvCls(r)}">${TBLX_LVTXT[r.lv]}</small>` : ""}${r.med != null ? `<small class="light tbx-mm">secteur : ${esc(r.full(r.med))}</small>` : ""}</td>
      <td class="tr"><button type="button" class="tbx-gb" data-g="${r.k}" aria-label="Voir l'évolution en graphique : ${esc(r.short || r.label)}">${tblxSpark(r.vals, { w: 76, h: 26, q: r.q, med: r.med, label: `Évolution de ${Y[0]} à ${yl}` })}</button>${tblxArrow(r.dir, r.q, one, "Sur un an")}</td></tr>`;
  }).join("");
}
function tblxThemeHTML(T, s, c, P) {
  const Y = c.years;
  if (T.special === "prix") {
    const h = prixHTML(s, c);
    if (!h || !/id="prix"/.test(h)) return "";
    return h.replace(`<section class="panel" id="prix"><div class="ph"><h2>Le prix de l'action</h2>`, `<section class="panel rf-th" id="rf-valorisation"><div class="ph"><h2>Valorisation <small>${esc(T.q)}</small></h2>`)
      .replace(/<div class="tile"><span class="kick">Cours<\/span>[\s\S]*?<\/small><\/div>\s*/, "") // le cours est déjà dans l'en-tête
      .replace(/<div class="tile"><span class="kick">Rendement<\/span>[\s\S]*?<\/small><\/div>\s*/, ""); // le rendement est dans le thème « Dividende »
  }
  if (T.special === "div") {
    const h = dividendeHTML(s, c); if (!h) return "";
    return h.replace(`<section class="panel" id="dividende"><div class="ph"><h2>Dividende</h2>`, `<section class="panel rf-th" id="rf-dividende"><div class="ph"><h2>Dividende <small>${esc(T.q)}</small></h2>`)
      .replace(`<span class="kick">Par action</span>`, `<span class="kick">Par action${tblxProv("dps", s)}</span>`)
      .replace(`<span class="kick">Rendement</span>`, `<span class="kick">Rendement${tblxProv("rendement", s)}</span>`)
      .replace(`<span class="kick">Part du bénéfice</span>`, `<span class="kick">Part du bénéfice${tblxProv("payout", s)}</span>`);
  }
  const rows = T.rows.map(k => P.rows.find(r => r.k === k)).filter(Boolean);
  if (!rows.length) return "";
  const ctx = T.k === "croissance" && typeof contexteChiffresHTML === "function" ? contexteChiffresHTML(s, c, true) : "";
  const gr = rows.filter(r => r.n >= 2);
  // 30/10 (Romain) : le visuel d'abord. Des tuiles (chiffre, sur un an, verdict), le graphique en pleine largeur, le tableau et l'explication au clic.
  const yl = Y.at(-1);
  const tuiles = rows.slice(0, 4).map(r => { const one = tblxChange(r.kind, r.prev, r.last), ly = Y[r.li];
    return `<button type="button" class="rf-kt ${tblxLvCls(r)}" data-g="${r.k}" title="Voir l'évolution en graphique"><small>${esc(r.short || r.label)}${ly !== yl ? ` (${ly})` : ""}</small><b>${esc(r.full(r.last))}</b><span>${tblxArrow(r.dir, r.q, one, "Sur un an")}${r.lv ? `<em class="tbx-lv ${tblxLvCls(r)}">${TBLX_LVTXT[r.lv]}</em>` : ""}</span>${r.med != null ? `<i>médiane du secteur ${esc(r.full(r.med))}</i>` : ""}</button>`; }).join("");
  return `<section class="panel rf-th rf-th2" id="rf-${T.k}"><div class="ph"><h2>${esc(T.t)} <small>${esc(T.q)}</small></h2></div>
    <div class="rf-kts">${tuiles}</div>
    ${gr.length ? `<div class="rf-thc rf-thc2" data-th="${T.k}"><div class="filters rf-gsel">${gr.map(r => `<button type="button" data-g="${r.k}">${esc(r.short || r.label)}</button>`).join("")}</div><div class="rf-gbox"></div></div>` : ""}
    <details class="rf-thd"><summary>Le détail année par année<small>${rows.length} indicateur${rows.length > 1 ? "s" : ""}, de ${Y[0]} à ${yl}, et ce que chacun veut dire</small></summary>
      <p class="rf-thx">${esc(T.ex)}</p>
      <div class="rf-thtw">${tblxScrollBox(`<table class="t tbx tbx-ess rf-tht"><caption class="sr">${esc(T.t)} : les indicateurs de ${esc(s.name)}</caption><thead><tr><th class="l" scope="col">Indicateur</th><th scope="col">Exercice ${yl}</th><th scope="col">Sur un an</th></tr></thead><tbody>${tblxThemeRows(rows, Y, s)}</tbody></table>`)}</div>
    </details>${ctx}</section>`;
}
function tabComptes(s, c, el) {
  if (!c || !c.years || !c.years.length || !c.fin) {
    el.innerHTML = `<section class="panel"><div class="ph"><h2>Les comptes de ${esc(s.name)}</h2></div><div class="pb tbx-empty"><p class="lead" style="margin:0 0 6px">${missingTxt(s, true)}</p><p class="muted" style="margin:0">En attendant, la <a class="lnk" href="/entreprise/${s.id}">vue d'ensemble</a> donne le cours et l'actualité, et vous pouvez <a class="lnk" href="/comparer?ids=${[s, ...peersOf(s, 3).list].map(x => x.id).join(",")}">comparer ses concurrentes</a>.</p></div></section>`;
    return;
  }
  const P = tblxRows(s, c), Y = c.years, cur = c.currency, med = MED[s.sector] || {}, bank = isBank(s), yl = Y[lastIdx(c)];
  if (!P.rows.length) { el.innerHTML = `<section class="panel"><div class="empty">Aucun chiffre lisible automatiquement dans les comptes de ${esc(s.name)} pour l'instant.</div></section>`; return; }
  if (typeof ctxCharge === "function") ctxCharge();
  const fy = c.fyEnd ? c.fyEnd.split("-").reverse().join("/") : null;
  const curTxt = TBLX_CURN[cur] ? TBLX_CURN[cur] + (CUR[cur] ? ` (${CUR[cur]})` : ` (${cur})`) : cur;
  const f = figuresOf(c), cross = typeof croisements === "function" ? croisements(s, f) : [];
  const chg = tblxChanges(P, lastIdx(c)), themes = TBLX_THEMES.map(T => [T, tblxThemeHTML(T, s, c, P)]).filter(x => x[1]);
  el.innerHTML = `
    <section class="panel tbx-panel rf-top" id="tbx">
      <div class="ph"><h2>Les chiffres de ${esc(s.name)}, par thème</h2><span class="light tbx-meta">${Y.length} exercice${Y.length > 1 ? "s" : ""} (${Y[0]}${Y.length > 1 ? " à " + yl : ""})${fy ? ` · clos le ${fy}` : ""}</span></div>
      ${typeof provComptesVieux === "function" ? provComptesVieux(c, s) : ""}
      <div class="pb">
        <h3 class="rf-h3">Ce qui a le plus changé sur un an</h3>
        ${chg.length ? `<div class="rf-chgs">${chg.map(r => `<a class="rf-chg ${r.q > 0 ? "q-up" : r.q < 0 ? "q-dn" : "q-eq"}" href="#rf-${tblxThemeOf(r.k)}"><span class="rf-cl">${esc(r.short || r.label)}</span><b>${tblxArrow(r.dir, r.q, tblxChange(r.kind, r.prev, r.last))}</b><small>de ${esc(r.full(r.prev))} à ${esc(r.full(r.last))} (${Y[r.li - 1]} → ${Y[r.li]})</small></a>`).join("")}</div>` : `<p class="rf-no">Aucune évolution marquée entre les deux derniers exercices.</p>`}
        ${cross.length ? `<h3 class="rf-h3" style="margin-top:18px">À lire ensemble</h3><ul class="rf-cross">${cross.map(([h, p]) => `<li><b>${esc(h)}.</b> ${p}</li>`).join("")}</ul>` : ""}
        <p class="tbx-unit" style="margin:14px 0 0">Montants en ${esc(curTxt)} : <b>M</b> = millions, <b>Md</b> = milliards. Vert : mieux que l'année précédente ou que les repères ; orange : moins bien. Le sens dépend de l'indicateur : une dette qui baisse est une bonne nouvelle.</p>
      </div>
      <nav class="rf-thnav" aria-label="Thèmes">${themes.map(([T]) => `<a href="#rf-${T.k}">${esc(T.t)}</a>`).join("")}<a href="#rf-tout">Tout le tableau</a></nav>
    </section>
    ${themes.map(x => x[1]).join("")}
    <section class="panel rf-th" id="rf-tout"><details class="rf-all"${tblxGetV() === "tout" ? " open" : ""}><summary><span><b>Tous les comptes, année par année</b><small>${P.rows.length} lignes, ${Y.length} exercices : compte de résultat, bilan, flux de trésorerie, actionnaire</small></span></summary>
      <p class="tbx-sum">Chaque case est colorée selon l'évolution par rapport à l'année précédente. Touchez une ligne pour lire ce qu'elle dit.</p>
      ${tblxScrollBox(tblxFullHTML(s, c, P), tblxMob() ? "Faites glisser pour voir les années précédentes, la tendance et la médiane" : "Faites glisser pour voir les années précédentes")}</details>
      <div class="src">Un tiret signifie que le chiffre n'est pas publié sous l'étiquette standard. « Estimé » : calculé à partir des comptes, peut différer du chiffre annoncé par l'entreprise.${bank ? " Banques et assurances : marge d'exploitation, dette et EBITDA ne s'appliquent pas." : ""} Médiane calculée sur le dernier exercice de ${med.n || 0} entreprise${med.n > 1 ? "s" : ""} suivie${med.n > 1 ? "s" : ""} du secteur ${esc(secName(s).toLowerCase())}. Couleurs : seuils de lecture du site, pas un avis sur l'action.</div></section>
    <section class="panel"><div class="ph"><h2>Sources</h2></div>
      <table class="t tbx tbx-src"><thead><tr><th class="l">Exercice clos le</th><th class="l">Document</th></tr></thead><tbody>
      ${c.cik ? `<tr><td class="l wrap">Exercices ${Y[0]} à ${yl}</td><td class="l wrap"><a class="lnk" href="${esc((c.sources[0] || {}).report || "")}" target="_blank" rel="noopener">Rapports annuels 10-K déposés à la SEC</a></td></tr>`
        : (c.sources || []).map(x => `<tr><td class="l wrap">${dLabel(x.periodEnd)}</td><td class="l wrap">${x.report ? `<a class="lnk" href="${esc(x.report)}" target="_blank" rel="noopener">Rapport financier annuel (ESEF)</a>` : "Rapport financier annuel (ESEF)"}</td></tr>`).join("")}</tbody></table>
      <div class="src">${c.cik ? "Comptes lus dans les données publiques de la SEC (EDGAR), au format XBRL." : `Comptes lus dans les rapports ${def("esef", "ESEF")} publiés sur filings.xbrl.org.`}${c.updated ? ` Mis à jour le ${dLabel(c.updated)}.` : ""} Cours : Google Finance, différés. Taux de change : BCE.</div></section>`;
  const byK = k => P.rows.find(r => r.k === k);
  const setG = (box, k) => { const r = byK(k); if (!r || !box) return; $$(".rf-gsel button", box).forEach(b => b.classList.toggle("on", b.dataset.g === k)); $(".rf-gbox", box).innerHTML = tblxChart(s, c, r); };
  $$(".rf-thc", el).forEach(box => { const b = $(".rf-gsel button", box); if (b) setG(box, b.dataset.g); });
  const toggleDet = tr => {
    const open = tr.nextElementSibling && tr.nextElementSibling.classList.contains("det");
    if (open) { tr.nextElementSibling.remove(); tr.setAttribute("aria-expanded", "false"); return; }
    const r = byK(tr.dataset.k); if (!r) return;
    const sc = tr.closest(".tbx-sc"), w = sc ? sc.clientWidth : 320, n = tr.cells.length;
    tr.insertAdjacentHTML("afterend", `<tr class="det"><td colspan="${n}"><div class="tbx-detw" style="width:${Math.max(240, w - 2)}px">${tblxDetail(r, Y)}</div></td></tr>`);
    tr.setAttribute("aria-expanded", "true");
  };
  el.addEventListener("click", e => {
    const gb = e.target.closest(".tbx-gb, .rf-kt");
    if (gb) { const th = gb.closest(".rf-th"), box = th && $(".rf-thc", th); if (box && $(`.rf-gsel button[data-g="${gb.dataset.g}"]`, box)) { setG(box, gb.dataset.g); if (box.getBoundingClientRect().top > innerHeight || box.getBoundingClientRect().bottom < 0) box.scrollIntoView({ behavior: "smooth", block: "center" }); } else { const tr = gb.closest("tr[data-k]"); if (tr) toggleDet(tr); } return; }
    const sel = e.target.closest(".rf-gsel button"); if (sel) { setG(sel.closest(".rf-thc"), sel.dataset.g); return; }
    const a = e.target.closest(".rf-thnav a, a.rf-chg"); if (a) { const t = document.getElementById(a.getAttribute("href").slice(1)); if (t) { e.preventDefault(); if (t.id === "rf-tout") $("details", t).open = true; t.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(history.state, "", a.getAttribute("href")); } return; }
    if (e.target.closest(".def,a,button,summary")) return;
    const tr = e.target.closest(".tbx-full tbody tr[data-k], .rf-tht tbody tr[data-k]"); if (tr) toggleDet(tr);
  });
  el.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".tbx-full tbody tr[data-k], .rf-tht tbody tr[data-k]")) { e.preventDefault(); toggleDet(e.target); } });
  const all = $(".rf-all", el); if (all) all.addEventListener("toggle", () => { tblxSetV(all.open ? "tout" : "ess"); tblxBindScroll(el); $$(".tbx-full", el).forEach(t => { const sc = t.closest(".tbx-sc"); if (sc) { sc.scrollLeft = tblxMob() ? 0 : sc.scrollWidth; sc.dispatchEvent(new Event("scroll")); } }); });
  $$(".lab .def", el).forEach(b => { const t = ALL[b.dataset.def]; if (t) b.title = t.what; });
  requestAnimationFrame(() => tblxBindScroll(el));
  setTimeout(() => $$(".tbx-full", el).forEach(t => { const x = t.closest(".tbx-sc"); if (x) { x.scrollLeft = 0; x.dispatchEvent(new Event("scroll")); } }), 0);
  if (typeof ctxRafraichir === "function") setTimeout(() => { try { ctxRafraichir(); } catch (e) { } }, 0);
}

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
function filtreHTML(a) {
  const { l, tri } = runFiltre(a), lim = isPrem() ? 30 : 8, cols = [...new Set([...a.criteres.map(k => k.indicateur), tri.indicateur, "per"])].filter(k => INDI[k]).slice(0, 4);
  const desc = [a.mot && THEME_RE[a.mot] && "thème " + THEME_RE[a.mot][1], a.secteur && R.sectors[a.secteur], a.region && R.regions[a.region], a.pays && (COUNTRY[a.pays] || a.pays), a.pea && "éligibles au PEA", ...a.criteres.map(k => `${INDI[k.indicateur][0].toLowerCase()} ${k.condition === "sup_mediane" ? "au-dessus de la médiane du secteur" : k.condition === "inf_mediane" ? "sous la médiane du secteur" : (k.condition === "sup" ? "supérieure à " : "inférieure à ") + (k.valeur != null ? INDI[k.indicateur][2](k.valeur) : "")}`)].filter(Boolean);
  if (!l.length) return `<p class="lead">Aucune entreprise ne remplit tous ces critères (${esc(desc.join(", "))}). Essayez avec un critère de moins.</p>`;
  const tally = c => { const t = quick(c); return t ? t.fort - t.vig : ""; };
  return `<p class="lead" style="margin:0 0 6px"><b>${l.length} entreprise${l.length > 1 ? "s" : ""}</b> remplissent ces critères${desc.length ? ` : ${esc(desc.join(", "))}` : ""}. Classées par ${esc(INDI[tri.indicateur][0].toLowerCase())}.</p>
    <div class="tbx-legend" style="padding:0 0 8px"><span><i class="lg-up"></i>nettement mieux que la médiane du secteur</span><span><i class="lg-dn"></i>nettement moins bien</span><span class="light">Une liste de critères n'est pas une sélection d'achat : ouvrez chaque fiche.</span></div>
    ${tblxScrollBox(`<table class="t tbx tbx-sort iat"><thead><tr><th class="l lab" scope="col" data-sk="0">Entreprise<i class="tbx-so"></i></th>${cols.map((k, i) => tblxTh(esc(INDI[k][0]) + tblxProvG(k), i + 1)).join("")}<th class="l" scope="col" data-sk="${cols.length + 1}">Repères<i class="tbx-so"></i></th></tr></thead><tbody>
    ${l.slice(0, lim).map((c, j) => `<tr class="${j % 2 ? "z" : ""}"><th scope="row" class="l lab" data-v="${esc(c.name)}"><a class="cell-co" href="/entreprise/${c.id}">${logo(c, 26)}<span><b>${esc(c.name)}</b><small class="light">${esc(regName(c))} · ${esc(secName(c))}</small></span></a></th>${cols.map(k => cellInd(c, k)).join("")}<td class="l" data-v="${tally(c)}">${(t => t ? pills(t) : "")(quick(c))}</td></tr>`).join("")}</tbody></table>`)}
    ${l.length > lim ? `<p class="muted" style="font-size:13.5px;margin:10px 0 0">${l.length - lim} autres entreprises. ${isPrem() ? "" : `<a class="lnk" href="/premium">Premium</a> affiche jusqu'à 30 résultats.`}</p>` : ""}
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
      const shown = sorted.slice(0, listState.max || 60);
      $("#elist").innerHTML = `<p class="muted" style="margin:0 0 10px;font-size:13px">${F0.format(list.length)} entreprise${list.length > 1 ? "s" : ""}, des plus grosses aux plus petites.</p><div class="cards">${shown.map(coCard).join("")}</div>${sorted.length > shown.length ? `<div style="text-align:center;margin:-12px 0 28px"><button class="btn" id="emore" type="button">Voir ${Math.min(60, sorted.length - shown.length)} de plus</button></div>` : ""}`;
      const mb = $("#emore"); if (mb) mb.onclick = () => { listState.max = (listState.max || 60) + 60; render(); };
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
document.head.insertAdjacentHTML("beforeend", `<style id="tbx-css">
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.tbx-meta{font-size:12.5px}
.tbx-bar{display:flex;align-items:center;justify-content:space-between;gap:10px 18px;flex-wrap:wrap;padding:12px 18px 4px}
.tbx-seg{display:inline-flex;border:1.5px solid var(--ink);border-radius:10px;overflow:hidden;flex:none}
.tbx-seg button{background:#fff;border:0;padding:7px 14px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;color:var(--ink)}
.tbx-seg button span{font-weight:400;color:var(--light);font-size:12px;margin-left:4px}
.tbx-seg button+button{border-left:1.5px solid var(--ink)}
.tbx-seg button.on{background:var(--ink);color:#fff}.tbx-seg button.on span{color:#C9C4BA}
.tbx-unit{margin:0;font-size:12.5px;color:var(--grey)}
.tbx-legend{display:flex;flex-wrap:wrap;gap:4px 16px;padding:6px 18px 10px;font-size:12px;color:var(--grey)}
.tbx-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.tbx-legend .lg-up{background:rgba(14,107,74,.16);box-shadow:inset 0 0 0 1px rgba(14,107,74,.35)}.tbx-legend .lg-dn{background:rgba(217,79,43,.16);box-shadow:inset 0 0 0 1px rgba(217,79,43,.4)}
.tbx-legend .lg-md{height:0;border-top:2px dashed #A39679;border-radius:0;vertical-align:3px;width:16px}
.tbx-sum{margin:0;padding:0 18px 10px;font-size:13.5px;color:var(--grey)}
.tbx-box{position:relative}
.tbx-box::after{content:"";position:absolute;top:0;bottom:0;right:0;width:26px;pointer-events:none;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(17,18,20,.10));opacity:0;transition:opacity .2s}
.tbx-box.can.r::after{opacity:1}
.tbx-hint{display:none;font-size:12px;color:var(--light);padding:6px 18px 0;text-align:right}
.tbx-box.can .tbx-hint{display:block}
table.tbx{border-collapse:separate;border-spacing:0;width:100%}
table.tbx th,table.tbx td{border-bottom:1px solid #EFEAE0}
table.tbx thead th{position:relative;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--grey);font-weight:600;border-bottom:1.5px solid var(--ink);background:#fff;vertical-align:bottom}
table.tbx tbody th{text-transform:none;letter-spacing:0;font-size:14px;color:var(--ink);font-weight:400;background:inherit;border-bottom:1px solid #EFEAE0;padding:9px 12px}
table.tbx tbody tr{background:#fff}
table.tbx tbody tr.z{background:#FBF9F4}
table.tbx tbody tr:not(.grp):not(.det):hover > *{box-shadow:inset 0 0 0 999px rgba(198,244,50,.16)}
table.tbx td.num{font-family:var(--mono);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
table.tbx .lab{position:sticky;left:0;z-index:2;background:inherit;text-align:left;font-weight:400;white-space:normal}
table.tbx thead .lab{background:#fff;z-index:3}
table.tbx .lab::after{content:"";position:absolute;top:0;bottom:0;right:-10px;width:10px;pointer-events:none;background:linear-gradient(90deg,rgba(17,18,20,.09),rgba(17,18,20,0));opacity:0;transition:opacity .2s}
.tbx-box.l table.tbx .lab::after{opacity:1}
table.tbx .lab .nm{font-weight:500;color:var(--ink);font-size:14px}
table.tbx .lab .def{font-weight:500}
table.tbx .u{display:block;font-size:11.5px;color:var(--light);font-family:var(--mono);letter-spacing:0;text-transform:none;font-weight:400;margin-top:1px}
table.tbx thead .u{display:inline;margin-left:4px}
/* essentiel */
table.tbx-ess th.lab{min-width:220px;max-width:460px;padding-top:12px;padding-bottom:12px}
.tbx-ph{margin:3px 0 0;font-size:12.5px;line-height:1.4;color:var(--grey);font-weight:400}
table.tbx-ess td{vertical-align:middle}
table.tbx-ess td.v{text-align:right;white-space:nowrap}
.tbx-val{display:inline-block;font-family:var(--mono);font-weight:600;font-size:15.5px;letter-spacing:-.02em;padding:2px 7px;border-radius:6px;color:var(--ink)}
.tbx-val.tz-fort{background:rgba(14,107,74,.10);color:#0B5A3E}.tbx-val.tz-vig{background:rgba(217,79,43,.11);color:#A8361C}.tbx-val.tz-moyen{background:#F1ECE1}
table.tbx-ess td.v small{display:block;font-size:11.5px;margin-top:2px}
.tbx-lv{font-size:11.5px;font-weight:600}
.tbx-lv.tz-fort{color:var(--g)}.tbx-lv.tz-vig{color:#B23A1E}.tbx-lv.tz-moyen{color:var(--grey)}
span.tbx-lv{display:inline-block;padding:1px 7px;border-radius:999px;background:#F1ECE1;margin-right:4px}
span.tbx-lv.tz-fort{background:rgba(14,107,74,.10)}span.tbx-lv.tz-vig{background:rgba(217,79,43,.11)}
table.tbx-ess td.tr{white-space:nowrap;text-align:left}
.tbx-gb{background:none;border:0;padding:2px;margin:0 6px 0 0;cursor:zoom-in;vertical-align:middle;border-radius:6px}
.tbx-gb:hover{background:#F3FBD3}.tbx-gb:focus-visible{outline:2px solid var(--ink)}
button.linkbtn.tbx-gb{cursor:pointer;margin:0;padding:0}
.spk{display:inline-block;vertical-align:middle;overflow:visible}
.tbx-ar{display:inline-flex;align-items:baseline;gap:3px;font-family:var(--mono);font-size:12.5px;font-weight:600;letter-spacing:-.02em;vertical-align:middle}
.tbx-ar b{font-family:var(--sans);font-size:15px;line-height:1}
.tbx-ar.up{color:var(--g)}.tbx-ar.dn{color:#C8452A}.tbx-ar.eq{color:var(--grey)}.tbx-ar.na{color:var(--light)}
table.tbx-ess td.md{text-align:right;white-space:nowrap}
table.tbx-ess td.md .num{font-size:14px;color:var(--grey)}
.tbx-vm{display:block;font-size:11.5px;font-weight:600}
.tbx-vm.qup{color:var(--g)}.tbx-vm.qdn{color:#B23A1E}.tbx-vm.qeq{color:var(--light)}
/* tout voir */
table.tbx-full th.lab{min-width:230px}
table.tbx-full td{padding:9px 12px}
table.tbx-full tbody td.num{font-size:13.5px}
table.tbx-full thead th.last{background:var(--ink);color:#fff;border-radius:8px 8px 0 0}
table.tbx-full thead th small{display:block;font-size:10px;letter-spacing:.04em;color:#C9C4BA;font-weight:500}
table.tbx-full td.last{font-weight:700;box-shadow:inset 1.5px 0 0 var(--ink),inset -1.5px 0 0 var(--ink)}
table.tbx-full tbody tr:last-child td.last{box-shadow:inset 1.5px 0 0 var(--ink),inset -1.5px 0 0 var(--ink),inset 0 -1.5px 0 var(--ink)}
table.tbx-full tbody tr:not(.grp):not(.det):hover > td.last{box-shadow:inset 0 0 0 999px rgba(198,244,50,.16),inset 1.5px 0 0 var(--ink),inset -1.5px 0 0 var(--ink)}
table.tbx-full td.hu{background:rgba(14,107,74,.075)}
table.tbx-full td.hd{background:rgba(217,79,43,.085)}
table.tbx-full td.last.tz-fort{color:#0B5A3E}table.tbx-full td.last.tz-vig{color:#A8361C}
table.tbx-full td.na{color:#B5AFA4}
table.tbx-full tbody tr[data-k]{cursor:pointer}
table.tbx-full tbody tr[data-k]:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}
table.tbx-full td.tr{text-align:left}
.tbx-trw{display:inline-flex;align-items:center;gap:6px}
table.tbx-full td.md{color:var(--grey)}table.tbx-full td.md .num{font-family:var(--mono);font-size:13px}
table.tbx tr.grp th{background:#F6F2E9;text-align:left;padding:14px 0 8px;border-bottom:1.5px solid #D9D1C0}
table.tbx tr.grp th > span{position:sticky;left:18px;display:inline-block;font-family:var(--serif);font-weight:800;font-size:15px;color:var(--ink);letter-spacing:-.01em;text-transform:none;padding-left:0}
table.tbx tr.grp small{font-family:var(--sans);font-weight:400;font-size:12px;color:var(--grey);margin-left:10px;letter-spacing:0}
table.tbx-full tr.det td{background:#FFFDF4;padding:0;text-align:left;white-space:normal}
.tbx-detw{position:sticky;left:0;padding:10px 16px 12px;box-sizing:border-box}
.tbx-det p{margin:0 0 6px;font-size:13.5px;line-height:1.5}.tbx-det p:last-child{margin:0}
.tbx-acts{display:flex;gap:16px;flex-wrap:wrap}
.tbx-gpanel .pb{padding-top:16px}
.tbx-gph{margin:10px 0 0;font-size:13.5px;color:var(--grey);max-width:720px}.tbx-gph b{color:var(--ink)}
.lg2 i.tbx-dash{background:none!important;height:0;border-top:2px dashed #A39679;border-radius:0}
.tbx-empty .lead{font-size:15px}
table.tbx-src td{white-space:normal}
/* tri, cases à zone, étiquettes */
table.tbx th[data-sk],table.tbx th.sort{cursor:pointer;user-select:none;white-space:nowrap}
.tbx-so{display:inline-block;width:0;height:0;margin-left:6px;border:4px solid transparent;border-top-color:#C9C1B1;vertical-align:-1px;opacity:.9}
th[aria-sort=descending] .tbx-so{border-top-color:var(--ink)}th[aria-sort=ascending] .tbx-so{border-top-color:transparent;border-bottom-color:var(--ink);vertical-align:3px}
table.tbx th[data-sk]:hover,table.tbx th.sort:hover{color:var(--ink)}
.tbx-val.sm{font-size:13.5px;font-weight:600;padding:1px 6px;white-space:normal;max-width:150px;line-height:1.35}
.tbx-sec{display:block;font-size:11px;color:var(--light);font-family:var(--sans);letter-spacing:0;margin-top:2px}
.tbx-big{font-weight:600}.tbx-big.neg{color:#A8361C}
table.tbx td.num .tbx-ar{display:flex;justify-content:flex-end;font-size:11.5px;margin-top:2px}
table.tbx td.num .tbx-ar b{font-size:13px}
table.tbx td.na{color:#B5AFA4}
table.tbx-list th.lab{min-width:240px}table.tbx-list .lab a.nm{color:var(--ink);text-decoration:none;font-weight:600}table.tbx-list .lab a.nm:hover{text-decoration:underline}
table.tbx-list tbody tr{cursor:pointer}
table.tbx.iat th.lab{min-width:200px}
.tbx-tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;background:#F1ECE1;color:var(--grey);white-space:nowrap}
.tbx-tag.g{background:rgba(14,107,74,.12);color:#0B5A3E}.tbx-tag.on{background:var(--ink);color:#fff}
table.tbx.brk tr.sel > *{background:#F3FBD3}
.tbx-fee{display:inline-block;width:60px;height:6px;background:#F1ECE1;border-radius:3px;margin-right:10px;vertical-align:middle;overflow:hidden}.tbx-fee i{display:block;height:100%;background:var(--ink);border-radius:3px}
.tbx-date{white-space:nowrap}.tbx-date b{font-family:var(--mono);font-size:16px}.tbx-date small{display:block;font-size:11.5px;color:var(--light)}
table.tbx-ag tbody tr[data-href]{cursor:pointer}
.tbx-agl{font-size:13px;color:var(--grey);margin-top:3px;white-space:normal}table.tbx-ag tbody th{white-space:normal}
@media (max-width:760px){ .tbx-fee{display:none} table.tbx-list th.lab,table.tbx.iat th.lab{min-width:150px} }
@media (max-width:760px){
  .tbx-bar{padding:10px 12px 2px}.tbx-legend{padding:6px 12px 8px}.tbx-sum{padding:0 12px 8px}.tbx-hint{padding:6px 12px 0}
  .tbx-legend span.light{display:none}
  table.tbx th,table.tbx td{padding:9px 8px}
  table.tbx .lab{padding-left:12px!important}
  /* l'essentiel en fiches empilées : nom et chiffre, puis tendance, puis phrase */
  table.tbx-ess,table.tbx-ess tbody{display:block}
  table.tbx-ess thead{display:none}
  table.tbx-ess tbody tr{display:grid;grid-template-columns:1fr auto;grid-template-areas:"nm v" "tr v" "ph ph";gap:4px 10px;padding:12px 12px 12px;border-bottom:1px solid #EFEAE0}
  table.tbx-ess tbody tr:not(.grp):not(.det):hover > *{box-shadow:none}
  table.tbx-ess th.lab{display:contents}
  table.tbx-ess th.lab .nm{grid-area:nm;align-self:end;font-size:14.5px}
  table.tbx-ess .tbx-ph{grid-area:ph;margin:2px 0 0}
  table.tbx-ess td{border:0;padding:0!important}
  table.tbx-ess td.v{grid-area:v;align-self:center}
  table.tbx-ess td.tr{grid-area:tr}
  .tbx-val{font-size:15px;padding:2px 6px}
  table.tbx-full th.lab{min-width:138px;max-width:150px}
  table.tbx-full .lab .nm,table.tbx-full .lab .def{font-size:13px;line-height:1.3}
  table.tbx-full td{padding:9px 9px}
  table.tbx tr.grp th > span{left:12px;padding-left:0;font-size:14px}
  table.tbx tr.grp small{display:block;margin:2px 0 0}
  .tbx-seg button{padding:7px 11px;font-size:13px}
}
@media (max-width:400px){ table.tbx-ess td.tr .tbx-gb{margin-right:2px} table.tbx-ess .spk{width:58px} }
@media print{
  .tbx-seg,.tbx-hint,#tbxgsel,.tbx-gb,.qtabs,.tv,#tvchart{display:none!important}
  .tbx-view[hidden]{display:block!important}
  .tbx-sc{overflow:visible!important}
  table.tbx .lab{position:static}
  table.tbx tr{break-inside:avoid}
  table.tbx,table.tbx *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.tbx tbody tr:hover > *{box-shadow:none!important}
  .tbx-box::after,table.tbx .lab::after{display:none}
  .tbx-panel,.tbx-gpanel{break-inside:auto}
}
/* Onglet « Les chiffres en détail » par thème (refonte du 29 octobre, 13 h 30) */
.rf-top .pb{padding-top:14px}
.rf-h3{font-family:var(--serif);font-size:18px;font-weight:800;margin:0 0 10px}
.rf-chgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.rf-chg{display:flex;flex-direction:column;gap:3px;padding:11px 14px;border:1px solid var(--line);border-left:3px solid var(--n);border-radius:10px;background:#fff;color:var(--ink);text-decoration:none}
.rf-chg.q-up{border-left-color:var(--g)} .rf-chg.q-dn{border-left-color:var(--o)}
.rf-chg:hover{border-color:var(--ink)}
.rf-chg .rf-cl{font-size:13px;font-weight:600}
.rf-chg b{font-family:var(--mono);font-size:16px}
.rf-chg small{font-size:12px;color:var(--grey);line-height:1.35}
.rf-cross{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px;line-height:1.5}
.rf-no{margin:0;font-size:13.5px;color:var(--grey)}
.rf-thnav{display:flex;flex-wrap:wrap;gap:6px;padding:12px 22px 16px;border-top:1px solid var(--line2)}
.rf-thnav a{font-size:13.5px;font-weight:600;padding:6px 12px;border:1.5px solid var(--line);border-radius:99px;color:var(--ink);text-decoration:none;background:#fff}
.rf-thnav a:hover{border-color:var(--ink)}
.rf-th{scroll-margin-top:130px}
.rf-th .ph h2 small,#ctab .rf-th .ph h2 small{display:block;font-family:var(--sans);font-size:13.5px;font-weight:500;color:var(--grey);margin-top:3px;letter-spacing:0}
.rf-thx{margin:0;padding:10px 22px 4px;font-size:13.5px;line-height:1.5;color:#55524C}
.rf-moreb{margin:8px 22px 4px}.rf-thg{padding-bottom:10px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:0 8px;align-items:start}
.rf-thg.rf-th1{grid-template-columns:minmax(0,1fr)}
.rf-thg .tbx-box{margin:0}
.rf-thc{padding:12px 22px 14px;min-width:0}
.rf-gsel{margin:0 0 8px;display:flex;flex-wrap:wrap;gap:6px}
.rf-gsel button{font:inherit;font-size:12.5px;padding:4px 10px;border:1.5px solid var(--line);border-radius:99px;background:#fff;cursor:pointer;color:#3E3B36}
.rf-gsel button.on{background:var(--ink);border-color:var(--ink);color:#fff}
.rf-tht th.lab{max-width:none}
.rf-tht tbody tr[data-k]{cursor:pointer}
.ctx-in{border-top:1px solid var(--line2);margin-top:6px}
.ctx-in .ph{border-bottom:0!important}
.ctx-in .ctx-ti{font-family:var(--serif);font-size:18px;font-weight:800;margin:0}
.ctx-more{margin:14px 0 4px;border:1px solid var(--line);border-radius:10px;padding:0 14px;background:#FBF9F2}
.ctx-more > summary{cursor:pointer;padding:11px 0;font-weight:600;font-size:14.5px;list-style:none}
.ctx-more > summary::-webkit-details-marker{display:none}
.ctx-more > summary::before{content:"+";display:inline-block;width:18px;font-weight:700}
.ctx-more[open] > summary::before{content:"−"}
.ctx-more > summary small{display:block;font-weight:400;font-size:12.5px;color:var(--grey);margin-left:18px}
.ctx-more[open]{padding-bottom:12px}
.rf-all > summary{cursor:pointer;list-style:none;padding:16px 22px;display:flex;align-items:center;gap:12px}
.rf-all > summary::-webkit-details-marker{display:none}
.rf-all > summary::after{content:"+";margin-left:auto;font-size:22px;line-height:1;font-weight:400}
.rf-all[open] > summary::after{content:"−"}
.rf-all > summary b{display:block;font-family:var(--serif);font-size:20px;font-weight:800}
.rf-all > summary small{display:block;font-size:13px;color:var(--grey);margin-top:2px}
.rf-all .tbx-sum{padding:0 22px 8px}
@media (max-width:1200px){.rf-thg{grid-template-columns:minmax(0,1fr)}}
@media (max-width:760px){.rf-thx{padding:10px 16px 4px}.rf-thc{padding:10px 12px 12px}.rf-thnav{padding:10px 12px 14px}.rf-all > summary{padding:14px 16px}.rf-all .tbx-sum{padding:0 12px 8px}.rf-th .ph h2 small{font-size:13px}}
</style>`);

document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".rf-moreb"); if (!b) return; const t = b.closest(".rf-thg").querySelector(".rf-more"); if (t) t.hidden = false; b.remove(); });
document.head.insertAdjacentHTML("beforeend", `<style>
.rf-kts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0;border-bottom:1px solid var(--rule)}
.rf-kt{appearance:none;background:transparent;border:0;border-right:1px solid var(--rule);text-align:left;padding:14px 18px;display:flex;flex-direction:column;gap:4px;cursor:pointer;font:inherit;color:var(--ink)}.rf-kt:last-child{border-right:0}.rf-kt:hover{background:#FDFCF7}
.rf-kt small{font-size:12.5px;color:var(--grey);font-weight:600}.rf-kt b{font-family:var(--mono);font-weight:500;font-size:26px;line-height:1.05}.rf-kt.tz-fort b{color:var(--g)}.rf-kt.tz-vig b{color:var(--down)}
.rf-kt span{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px}.rf-kt em{font-style:normal;font-size:11.5px;font-weight:600}.rf-kt i{font-style:normal;font-size:12px;color:var(--light)}
.rf-th2 .rf-thc2{padding:14px 18px 6px}.rf-th2 .rf-gbox svg{width:100%;height:auto;max-height:260px}
.rf-thd{border-top:1px solid var(--rule)}.rf-thd summary{cursor:pointer;padding:12px 18px;font-weight:600;font-size:14px;list-style:none;display:flex;flex-direction:column;gap:2px}.rf-thd summary::-webkit-details-marker{display:none}.rf-thd summary small{font-weight:400;color:var(--grey);font-size:12.5px}.rf-thd summary::after{content:"+";position:absolute;right:18px;font-family:var(--mono);color:var(--grey)}.rf-thd summary{position:relative}.rf-thd[open] summary::after{content:"−"}
.rf-thd .rf-thx{padding:0 18px}
@media (max-width:760px){.rf-kts{grid-template-columns:repeat(2,minmax(0,1fr))}.rf-kt{border-bottom:1px solid var(--rule)}.rf-kt:nth-child(2n){border-right:0}.rf-kt b{font-size:22px}}
</style>`);
