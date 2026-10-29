/* Calculs des outils (module « outils2 ») : recouvrement d'ETF, simulateur d'épargne, scénarios historiques,
   « Et si j'avais investi ? ». Aucune dépendance, aucun accès au DOM : chargé par index.html (window.O2C)
   et par les tests Node (tests/t_outils2.mjs). */
(function (root) {
  "use strict";
  const sum = a => a.reduce((s, x) => s + x, 0);

  /* ---------- 1. Recouvrement d'ETF ---------- */
  // f : { isins: [[isin, %]] } -> Map isin -> poids en % du fonds
  const mapOf = f => { const m = new Map(); for (const [i, w] of (f && f.isins) || []) if (i && w > 0) m.set(i, (m.get(i) || 0) + w); return m; };
  // Paire de fonds : positions communes (nombre) et poids économique réel (somme des minimums de poids)
  function paire(fa, fb) {
    const a = mapOf(fa), b = mapOf(fb);
    let n = 0, ov = 0, aInB = 0, bInA = 0;
    for (const [i, w] of a) if (b.has(i)) { n++; ov += Math.min(w, b.get(i)); aInB += w; bInA += b.get(i); }
    return { communes: n, recouvrement: ov, partAdansB: aInB, partBdansA: bInA, lignesA: a.size, lignesB: b.size, couvA: sum([...a.values()]), couvB: sum([...b.values()]) };
  }
  // Concentration d'une liste de poids en % : 10 premières, plus grosse ligne, nombre équivalent de lignes (1 / somme des carrés)
  function concentration(poids) {
    const p = poids.filter(x => x > 0).sort((x, y) => y - x), tot = sum(p);
    if (!tot) return { top10: 0, max: 0, nEq: 0, n: 0 };
    const hhi = sum(p.map(x => (x / tot) ** 2));
    return { top10: sum(p.slice(0, 10)), top1: p[0], max: p[0], nEq: 1 / hhi, n: p.length, couverture: tot };
  }
  // Portefeuille combiné : fonds = [{ id, w (part du portefeuille, somme quelconque), isins, sectors, countries }]
  function combine(fonds) {
    const W = sum(fonds.map(f => Math.max(0, f.w || 0))) || 1;
    const parts = fonds.map(f => Math.max(0, f.w || 0) / W), maps = fonds.map(mapOf);
    const lignes = new Map();
    maps.forEach((m, k) => { for (const [i, w] of m) { const l = lignes.get(i) || { isin: i, w: 0, par: fonds.map(() => 0), n: 0 }; l.w += parts[k] * w; l.par[k] = w; l.n++; lignes.set(i, l); } });
    const liste = [...lignes.values()].sort((x, y) => y.w - x.w);
    const expo = cle => { const o = {}; fonds.forEach((f, k) => { for (const [c, w] of f[cle] || []) o[c] = (o[c] || 0) + parts[k] * w; }); return Object.entries(o).sort((x, y) => y[1] - x[1]); };
    // Part de chaque fonds dans des titres qu'aucun autre fonds choisi ne détient (en % de ce fonds)
    const propre = maps.map((m, k) => { let s = 0; for (const [i, w] of m) if (!maps.some((o, j) => j !== k && o.has(i))) s += w; return s; });
    // Part du portefeuille investie dans des titres présents dans au moins deux fonds
    const doublon = sum(liste.filter(l => l.n >= 2).map(l => l.w));
    return { parts, lignes: liste, conc: concentration(liste.map(l => l.w)), seuls: maps.map(m => concentration([...m.values()])), secteurs: expo("sectors"), pays: expo("countries"), propre, doublon, communesToutes: liste.filter(l => l.n === fonds.length).length };
  }

  /* ---------- 2. Simulateur : versements, frais détaillés, fiscalité ---------- */
  // p : { initial, mensuel, annees, rendement (brut annuel, avant frais du fonds), ter (frais courants annuels),
  //       fraisOrdre(montant, type : initial | versement | vente) -> € de courtage, ordresParAn (1 à 12), change (% par opération), enveloppe "pea"|"cto",
  //       taux: { pfu, ps }, inflation (annuelle, facultatif), vente (true : frais de courtage et de change à la revente) }
  function simule(p) {
    const n = Math.max(1, Math.round(p.annees)) * 12, rm = Math.pow(1 + p.rendement, 1 / 12) - 1, tm = 1 - Math.pow(1 - (p.ter || 0), 1 / 12);
    const fo = p.fraisOrdre || (() => 0), chg = Math.max(0, p.change || 0), pas = 12 / Math.max(1, Math.min(12, Math.round(p.ordresParAn || 12)));
    let v = 0, vBrut = 0, verse = 0, attente = 0, courtage = 0, change = 0, ordres = 0, fraisFonds = 0;
    const achat = (m, type) => { if (m <= 0) return; const f = Math.min(m, fo(m, type)), c = (m - f) * chg; courtage += f; change += c; ordres++; v += m - f - c; vBrut += m; };
    const ans = [{ a: 0, valeur: 0, verse: 0, sansFrais: 0 }];
    verse += p.initial || 0; achat(p.initial || 0, "initial");
    ans[0] = { a: 0, valeur: v, verse, sansFrais: vBrut };
    for (let m = 1; m <= n; m++) {
      const avant = v * (1 + rm); fraisFonds += avant * tm; v = avant * (1 - tm); vBrut *= 1 + rm;
      verse += p.mensuel || 0; attente += p.mensuel || 0;
      if (Math.floor(m / pas + 1e-9) > Math.floor((m - 1) / pas + 1e-9)) { achat(attente, "versement"); attente = 0; }
      if (m % 12 === 0) ans.push({ a: m / 12, valeur: v + attente, verse, sansFrais: vBrut + attente });
    }
    v += attente; vBrut += attente;
    const fv = p.vente ? Math.min(v, fo(v, "vente")) : 0, cv = p.vente ? (v - fv) * chg : 0;
    const brutRetrait = v - fv - cv, gain = brutRetrait - verse;
    const annees = n / 12, peaTaux = annees >= 5 ? p.taux.ps : p.taux.pfu, taux = p.enveloppe === "pea" ? peaTaux : p.taux.pfu;
    const impot = Math.max(0, gain) * taux, net = brutRetrait - impot;
    const defl = p.inflation ? Math.pow(1 + p.inflation, annees) : 1;
    return { verse, valeur: v, sansFrais: vBrut, courtage: courtage + fv, change: change + cv, fraisFonds, ordres: ordres + (p.vente ? 1 : 0), gain, impot, taux, net, netReel: net / defl, defl, ans, plafondPEA: p.enveloppe === "pea" && verse > 150000,
      coutFrais: vBrut - brutRetrait };
  }
  // Rendements annuels moyens de toutes les fenêtres de N années consécutives (série { année: % })
  function fenetres(serie, N) {
    const ys = Object.keys(serie).map(Number).sort((a, b) => a - b), r = [];
    for (let i = 0; i + N <= ys.length; i++) { let g = 1; for (let k = 0; k < N; k++) g *= 1 + serie[ys[i + k]] / 100; r.push({ debut: ys[i], fin: ys[i + N - 1], r: Math.pow(g, 1 / N) - 1 }); }
    return r;
  }
  function quantile(xs, q) { const s = [...xs].sort((a, b) => a - b); if (!s.length) return null; const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); }
  // Scénarios prudent / central / favorable : 10e centile, médiane, 90e centile des fenêtres historiques de la durée choisie
  // (durée ramenée à ce que permet la série pour garder au moins 8 fenêtres).
  function scenarios(serie, annees) {
    const n = Object.keys(serie).length, N = Math.max(1, Math.min(Math.round(annees), n - 7)), f = fenetres(serie, N), xs = f.map(x => x.r);
    const pire = f.reduce((a, x) => x.r < a.r ? x : a, f[0]), meilleur = f.reduce((a, x) => x.r > a.r ? x : a, f[0]);
    return { N, nb: f.length, prudent: quantile(xs, 0.1), central: quantile(xs, 0.5), favorable: quantile(xs, 0.9), pire, meilleur, negatives: xs.filter(x => x < 0).length };
  }

  /* ---------- 3. Et si j'avais investi ? ---------- */
  // Livret A : intérêts par quinzaine (dépôt compté à partir de la quinzaine suivante), capitalisés le 31 décembre.
  // taux : [["AAAA-MM-JJ", % annuel]] trié ; debut / fin : "AAAA-MM-JJ"
  function livretA(montant, debut, fin, taux) {
    const q = d => { const [y, m, j] = d.split("-").map(Number); return y * 24 + (m - 1) * 2 + (j > 15 ? 1 : 0); };
    const tauxA = k => { const y = Math.floor(k / 24), m = Math.floor((k % 24) / 2) + 1, d = `${y}-${String(m).padStart(2, "0")}-${k % 2 ? "16" : "01"}`; let t = taux[0][1]; for (const [dd, tt] of taux) if (dd <= d) t = tt; return t; };
    let cap = montant, int = 0; const q0 = q(debut) + 1, q1 = q(fin);
    for (let k = q0; k < q1; k++) { int += cap * tauxA(k) / 100 / 24; if (k % 24 === 23) { cap += int; int = 0; } }
    return cap + int;
  }
  // Valeur d'un placement unique : montant (après frais d'achat) converti en devise, cours de départ et d'arrivée, taux de change (devise pour 1 €)
  function valeurPlacement(montantNet, p0, p1, fx0 = 1, fx1 = 1) { if (!(p0 > 0) || !(p1 > 0)) return null; const parts = montantNet * fx0 / p0; return { parts, valeur: parts * p1 / fx1 }; }
  // Prix : montant qu'il fallait à la date d'arrivée pour garder le pouvoir d'achat (indice des prix)
  function inflation(montant, ipc0, ipc1) { return ipc0 > 0 && ipc1 > 0 ? montant * ipc1 / ipc0 : null; }
  // Mois Insee disponible le plus proche (au plus tard) d'une date
  function moisProche(mois, d) { const ks = Object.keys(mois || {}).sort(); let r = null; for (const k of ks) if (k <= d.slice(0, 7)) r = k; return r; }

  const api = { paire, concentration, combine, simule, fenetres, quantile, scenarios, livretA, valeurPlacement, inflation, moisProche };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.O2C = api;
})(typeof window !== "undefined" ? window : globalThis);
