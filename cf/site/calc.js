// Calculs du site (simulations, mesures de portefeuille). Aucune dépendance.
// Chargé par index.html et par les tests Node (tests/t_calc.mjs).
(function (root) {
  "use strict";

  // Rendement annualisé à partir d'une suite de rendements mensuels.
  function annualize(monthly) {
    if (!monthly.length) return 0;
    const g = monthly.reduce((a, r) => a * (1 + r), 1);
    return Math.pow(g, 12 / monthly.length) - 1;
  }

  // Volatilité annuelle : écart-type des rendements mensuels × √12.
  function volatility(monthly) {
    if (monthly.length < 2) return 0;
    const m = monthly.reduce((a, b) => a + b, 0) / monthly.length;
    const v = monthly.reduce((a, r) => a + (r - m) ** 2, 0) / (monthly.length - 1);
    return Math.sqrt(v) * Math.sqrt(12);
  }

  // Perte maximale sur une courbe de valeur (indice de performance) + temps de récupération en mois.
  function drawdown(curve) {
    let peak = curve[0], peakI = 0, max = 0, troughI = 0, peakOfMax = 0;
    for (let i = 0; i < curve.length; i++) {
      if (curve[i] > peak) { peak = curve[i]; peakI = i; }
      const d = curve[i] / peak - 1;
      if (d < max) { max = d; troughI = i; peakOfMax = peakI; }
    }
    let recovery = null;
    if (max < 0) {
      for (let i = troughI; i < curve.length; i++) if (curve[i] >= curve[peakOfMax]) { recovery = i - troughI; break; }
    }
    return { max, peakI: peakOfMax, troughI, recovery };
  }

  // TRI (rendement pondéré par l'argent). flows : [{t: années depuis le début, v: montant}]
  // Convention : versements de l'investisseur négatifs, sommes récupérées positives.
  function xirr(flows) {
    const npv = r => flows.reduce((a, f) => a + f.v / Math.pow(1 + r, f.t), 0);
    let lo = -0.99, hi = 10, flo = npv(lo), fhi = npv(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2, fm = npv(mid);
      if (Math.abs(fm) < 1e-9) return mid;
      if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  // Simulation d'un portefeuille sur le passé, au pas mensuel.
  // assets : [{prices:[...], divs:[{m, dps}], w: poids 0-1, sector}] alignés sur months
  // opts : { start (index du mois), initial, monthly, rebalance: "aucun"|"annuel", reinvest: bool, fee: € par ordre }
  function backtest(months, assets, opts) {
    const s = opts.start, n = months.length;
    const fee = Math.max(0, opts.fee || 0);
    const divMap = assets.map(a => Object.fromEntries((a.divs || []).map(d => [d.m, d.dps])));
    const sh = assets.map(() => 0);
    let fees = 0, divTotal = 0, paidOut = 0, invested = 0, orders = 0;
    const values = [], curve = [], rets = [], flows = [], labels = [];
    const buy = (amount) => {
      // Répartit un montant selon les poids, un ordre par ligne.
      assets.forEach((a, j) => {
        const amt = amount * a.w;
        if (amt <= 0) return;
        const f = Math.min(fee, amt); fees += f; orders++;
        sh[j] += (amt - f) / a.prices[i];
      });
    };
    let i = s;
    // Mois de départ
    invested += opts.initial;
    flows.push({ t: 0, v: -opts.initial });
    buy(opts.initial);
    let v = sh.reduce((acc, q, j) => acc + q * assets[j].prices[i], 0);
    values.push(v); curve.push(1); labels.push(months[i]);
    let idx = 1;
    for (i = s + 1; i < n; i++) {
      // Dividendes du mois
      let cash = 0, outThis = 0;
      assets.forEach((a, j) => {
        const d = divMap[j][months[i]];
        if (d && sh[j] > 0) {
          const amt = sh[j] * d; divTotal += amt;
          if (opts.reinvest) cash += amt; else { paidOut += amt; outThis += amt; }
        }
      });
      const hold = sh.reduce((acc, q, j) => acc + q * assets[j].prices[i], 0);
      const pre = hold + cash + outThis;
      const r = pre / v - 1; rets.push(r); idx *= 1 + r; curve.push(idx);
      // Versement mensuel + dividendes réinvestis
      const contrib = opts.monthly;
      if (contrib > 0) { invested += contrib; flows.push({ t: (i - s) / 12, v: -contrib }); }
      if (outThis > 0) flows.push({ t: (i - s) / 12, v: outThis });
      const toInvest = contrib + cash;
      if (toInvest > 0) buy(toInvest);
      // Rééquilibrage annuel, au mois anniversaire
      if (opts.rebalance === "annuel" && (i - s) % 12 === 0) {
        // Chaque ligne qui s'écarte de plus d'1 € de sa cible donne un ordre (achat ou vente), frais compris.
        const tot = sh.reduce((acc, q, j) => acc + q * assets[j].prices[i], 0);
        const k = assets.filter((a, j) => Math.abs(tot * a.w - sh[j] * a.prices[i]) >= 1).length;
        if (k > 0) {
          const net = tot - k * fee; fees += k * fee; orders += k;
          assets.forEach((a, j) => { sh[j] = net * a.w / a.prices[i]; });
        }
      }
      v = sh.reduce((acc, q, j) => acc + q * assets[j].prices[i], 0);
      values.push(v); labels.push(months[i]);
    }
    const final = v;
    flows.push({ t: (n - 1 - s) / 12, v: final });
    const dd = drawdown(curve);
    // Années civiles complètes
    const years = {};
    for (let k = 1; k < labels.length; k++) {
      const y = labels[k].slice(0, 4);
      (years[y] = years[y] || []).push(rets[k - 1]);
    }
    const yearly = Object.entries(years).filter(([, rs]) => rs.length === 12).map(([y, rs]) => [y, rs.reduce((a, r) => a * (1 + r), 1) - 1]);
    const best = yearly.length ? yearly.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
    const worst = yearly.length ? yearly.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
    return {
      labels, values, curve, final, invested, fees, orders, divTotal, paidOut,
      gain: final + paidOut - invested,
      tri: xirr(flows), twr: annualize(rets), vol: volatility(rets), dd, best, worst,
      weightsEnd: assets.map((a, j) => (sh[j] * a.prices[n - 1]) / final),
    };
  }

  // Versements réguliers avec un rendement constant (intérêts composés), frais annuels en %.
  function compound({ initial, monthly, years, rate, fee = 0 }) {
    const rm = Math.pow((1 + rate) * (1 - fee), 1 / 12) - 1;
    let v = initial, paid = initial;
    const values = [v], paidS = [paid];
    for (let m = 1; m <= years * 12; m++) {
      v = v * (1 + rm) + monthly; paid += monthly;
      if (m % 12 === 0) { values.push(v); paidS.push(paid); }
    }
    return { final: v, paid, values, paidS };
  }

  // PEA ou compte-titres : même placement, fiscalité différente.
  // rates : { pfu: 0.314, ps: 0.186 } (taux 2026). Hypothèses simplifiées, voir la page.
  function peaCto({ initial, monthly, years, growth, yieldD, rates }) {
    const gm = Math.pow(1 + growth, 1 / 12) - 1;
    function run(taxDiv) {
      let v = initial, basis = initial, taxPaid = 0;
      const vals = [v];
      for (let m = 1; m <= years * 12; m++) {
        v = v * (1 + gm) + monthly; basis += monthly;
        if (m % 12 === 0) {
          let d = v * yieldD;
          if (taxDiv) { const t = d * rates.pfu; taxPaid += t; d -= t; basis += d; }
          v += d;
          vals.push(v);
        }
      }
      return { v, basis, taxPaid, vals };
    }
    const paid = initial + monthly * years * 12;
    const pea = run(false), cto = run(true);
    const peaGain = Math.max(0, pea.v - paid);
    const peaRate = years >= 5 ? rates.ps : rates.pfu;
    const peaTax = peaGain * peaRate;
    const ctoGain = Math.max(0, cto.v - cto.basis);
    const ctoTax = ctoGain * rates.pfu;
    return {
      paid,
      pea: { gross: pea.v, tax: peaTax, net: pea.v - peaTax, rate: peaRate, vals: pea.vals },
      cto: { gross: cto.v, tax: ctoTax + cto.taxPaid, taxDiv: cto.taxPaid, net: cto.v - ctoTax, vals: cto.vals },
    };
  }

  // En une fois ou étalé : valeur au mois « end » d'un montant investi au mois s.
  function lumpVsDca(prices, s, end, amount, spread) {
    const lump = amount / prices[s] * prices[end];
    let q = 0; const part = amount / spread;
    for (let k = 0; k < spread; k++) q += part / prices[Math.min(s + k, end)];
    return { lump, dca: q * prices[end] };
  }

  const api = { annualize, volatility, drawdown, xirr, backtest, compound, peaCto, lumpVsDca };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Calc = api;
})(typeof window !== "undefined" ? window : globalThis);
