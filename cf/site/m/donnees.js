/* Chantier « calculs et données » (29/10/2026) — chargé après m/provenance.js.
   Corrige les calculs qui présentaient une période fausse, une estimation ou une donnée périmée
   comme un chiffre publié et à jour. Aucun affichage d'infobulle ici : la provenance affichée
   est tenue par m/provenance.js, qui s'appuie sur les champs exposés plus bas.

   Partage des rôles avec m/provenance.js (ne pas redéfinir ce qui est à lui) :
     provenance : valo(), computeMedians(), medInd(), priceHead(), PROV_IND, bulles « i »,
                  provComptesPerimes(), provComptesAge(), provEvEbitda(), provRdtFcf(), provRoce().
     donnees    : ratios(), figuresOf(), computePE(), taux de change BCE, exclusion des comptes
                  anciens des classements et des découvertes, indicateurs ajoutés (cours/valeur
                  comptable, croissance moyenne, ROIC quand l'impôt sera collecté).

   À appeler depuis un module d'affichage :
     donVieux(c)      -> vrai si le dernier exercice lu a plus de 15 mois (règle de provenance.js)
     donDps(c)        -> { v, estime }                       dividende par action et sa nature
     donDette(c)      -> { v, baux, leases, def }            dette nette et sa définition
     donMed(secteur)  -> { n, nPerime, annees: [min, max] }  effectif et exercices d'une médiane
     donMedInd(s,k,r) -> médiane d'un indicateur, au besoin limitée à une région
     donCroissance(s) -> { g1, multi, ans, verif }           croissance, seulement si exercices consécutifs
     donPb(c), donRoic(c), figuresOf(c).cagr3 / .cagr5
*/

/* ---------- 1. Comptes anciens : une seule règle pour tout le site ---------- */
// La règle et le champ « clos » viennent de m/provenance.js. Repli si ce module n'est pas chargé :
// sans date de clôture, un exercice d'il y a deux ans au moins est périmé à coup sûr.
function donVieux(c) {
  if (!c || c.missing) return false;
  if (typeof provComptesPerimes === "function") { try { return !!provComptesPerimes(c); } catch (e) { } }
  if (c.clos) { const m = Math.floor((Date.now() - new Date(c.clos + "T12:00:00Z")) / (30.44 * 864e5)); if (isFinite(m)) return m > 15; }
  return c.year != null && c.year <= new Date().getUTCFullYear() - 2;
}
// Entreprise à retenir dans une médiane, un classement, une sélection : comptes présents et pas périmés
function donRetenue(c) { return !!c && !c.missing && !donVieux(c); }

/* ---------- 2. Dividende par action : publié ou estimé (P0-2) ---------- */
// Dans societes.json, « dps » porte le dividende publié, et « dpsE » vaut 1 quand c'est une estimation
// (dividendes versés ÷ nombre d'actions). Les fiches détaillées gardent les deux séries (dps, dpsEst).
// Avant le 29/10/2026 rien ne distinguait les deux dans les listes : 637 entreprises affichaient
// une estimation présentée comme publiée.
function donDps(c) {
  if (!c) return { v: null, estime: false };
  const v = c.dps != null ? c.dps : c.dpsEst != null ? c.dpsEst : null;
  return { v, estime: v != null && (c.dpsE === 1 || c.dpsE === true || (c.dps == null && c.dpsEst != null)) };
}
// Suffixe à ajouter à un libellé de dividende dans une liste ou une comparaison
function donDpsNote(c) { return donDps(c).estime ? " (estimé)" : ""; }

/* ---------- 3. Taux de change : ceux de la BCE, pas des taux écrits en dur (P1-9) ---------- */
// FXE est le jeu de taux fixes de index.html (USD 0,92, GBP 1,17…), utilisé par caEur() pour classer
// les entreprises par taille et par toEur() en dernier recours. FX contient les taux de référence de la
// BCE du jour (cf/site/data/fx.json). On recopie les seconds dans le premier dès qu'ils sont chargés :
// caEur() et toEur() s'en servent alors sans autre changement, et les devises absentes de FXE
// (couronne tchèque, rand, lire turque…) ne valent plus zéro.
let DON_FX = false;
function donFxSync() {
  if (DON_FX) return true;
  if (typeof FX !== "object" || !FX) return false;
  let n = 0;
  for (const [k, v] of Object.entries(FX)) if (typeof v === "number" && isFinite(v) && v > 0) { FXE[k] = v; n++; }
  FXE.EUR = 1;
  if (!n) return false;
  DON_FX = true;
  try { for (const k of Object.keys(MEDI)) if (/\|taille$/.test(k)) delete MEDI[k]; } catch (e) { }
  return true;
}
const donEur = (v, cur) => v == null || !cur ? null : v * ((typeof FX === "object" && FX && FX[cur]) || FXE[cur] || (cur === "EUR" ? 1 : NaN));
// computePE() de index.html n'est appelée qu'une fois, à la fin du chargement des cours : bon moment
// pour appliquer les taux de la BCE. Les entreprises aux comptes anciens sortent de la médiane de PER
// (valo() leur rend déjà un PER vide, on évite seulement de les compter).
function computePE() {
  donFxSync();
  const by = {};
  (R.companies || []).forEach(c => { if (!donRetenue(c)) return; const v = valo(c); if (v && v.pe) (by[c.sector] = by[c.sector] || []).push(v.pe); });
  MEDPE = Object.fromEntries(Object.entries(by).map(([k, l]) => [k, l.length >= 5 ? median(l) : null]));
}

/* ---------- 4. Croissance : seulement entre deux exercices qui se suivent (P1-8) ---------- */
// 22 entreprises ont un exercice manquant (JCDecaux 2021 puis 2024, Telecom Italia, BPER, Kyndryl…) :
// la « croissance sur un an » couvrait en réalité deux ou trois ans. On ne l'annonce que si les
// exercices se suivent ; sinon on garde la variation en disant combien d'années elle couvre.
function donVar(v, prev, year, yearPrev) {
  const ok = x => x != null && isFinite(x);
  if (!ok(v) || !(prev > 0)) return { g1: null, multi: null, ans: null, verif: false };
  const r = v / prev - 1;
  if (year == null || yearPrev == null) return { g1: r, multi: null, ans: 1, verif: false }; // période non vérifiable (données d'avant le 29/10/2026)
  const ans = year - yearPrev;
  if (ans === 1) return { g1: r, multi: null, ans: 1, verif: true };
  if (ans >= 2 && ans <= 6) return { g1: null, multi: r, ans, verif: true };
  return { g1: null, multi: null, ans: null, verif: true };
}
function donCroissance(s) { return s ? donVar(s.ca, s.caPrev, s.year, s.yearPrev) : donVar(null); }

/* ---------- 5. Dette nette : dettes locatives signalées, définition explicite (P1-11) ---------- */
// Les emprunts publiés en IFRS ne comprennent pas les dettes locatives (IFRS 16), alors que les
// entreprises les comptent dans leur propre dette nette ; les dépôts américains ne retiennent pas les
// mêmes étiquettes. La collecte fournit maintenant « leases » et « netDebtBaux », et, dans les fiches
// détaillées, « tags.debt » dit exercice par exercice ce qui entre dans le chiffre.
function donDette(c) {
  if (!c) return { v: null, baux: null, leases: null, def: null, norme: null };
  return {
    v: c.netDebt != null ? c.netDebt : null,
    baux: c.netDebtBaux != null ? c.netDebtBaux : null,
    leases: c.leases != null ? c.leases : null,
    def: c.tagDette || (c.netDebtBaux != null ? "emprunts publiés, moins la trésorerie ; dettes locatives connues et fournies à part" : null),
    norme: c.norme || null,
  };
}

/* ---------- 6. Indicateurs à partir des comptes ---------- */
function ratios(s) { // s : chiffres du dernier exercice
  const g = donCroissance(s), n = donVar(s && s.net, s && s.netPrev, s && s.year, s && s.yearPrev);
  const k = x => x != null && isFinite(x);
  const baux = s && s.netDebtBaux != null ? s.netDebtBaux : null;
  return {
    g1: g.g1, gMulti: g.multi, gAns: g.ans, gVerif: g.verif,
    marge: s && s.ca > 0 && k(s.ebit) ? s.ebit / s.ca : null,
    nm: s && s.ca > 0 && k(s.net) ? s.net / s.ca : null,
    ng: n.g1, ngMulti: n.multi, ngAns: n.ans,
    roe: s && s.equity > 0 && k(s.net) ? s.net / s.equity : null,
    lev: s && s.ebitda > 0 && k(s.netDebt) ? s.netDebt / s.ebitda : null,
    levBaux: s && s.ebitda > 0 && k(baux) ? baux / s.ebitda : null,
    gear: s && s.equity > 0 && k(s.netDebt) ? s.netDebt / s.equity : null,
    conv: s && s.net > 0 && k(s.fcf) ? s.fcf / s.net : null,
    payout: s && k(s.divPaid) && s.net > 0 ? s.divPaid / s.net : null,
  };
}

/* ---------- 7. Effectif et exercices d'une médiane (P1-10) ---------- */
// MED[secteur].n existe déjà (provenance.js) ; on ajoute combien d'entreprises ont été écartées
// pour comptes anciens et quels exercices sont réellement couverts.
const DON_MEDINFO = {};
function donMed(secteur) {
  if (DON_MEDINFO[secteur]) return DON_MEDINFO[secteur];
  let n = 0, nPerime = 0; const ans = [];
  for (const c of (typeof R !== "undefined" && R && R.companies) || []) {
    if (c.missing || c.sector !== secteur) continue;
    if (donVieux(c)) { nPerime++; continue; }
    n++; if (c.year != null) ans.push(c.year);
  }
  ans.sort();
  return DON_MEDINFO[secteur] = { n, nPerime, annees: ans.length ? [ans[0], ans[ans.length - 1]] : null };
}
// Médiane d'un indicateur dans un secteur, au besoin limitée à une région
function donMedInd(sector, k, region) {
  if (!region) return medInd(sector, k);
  const key = sector + "|" + k + "|" + region;
  if (MEDI[key] === undefined) {
    const l = (R.companies || []).filter(c => c.sector === sector && donRetenue(c) && (c.region === region || (region === "EU" && c.region === "FR")));
    MEDI[key] = l.length >= 3 ? median(l.map(INDI[k][1])) : null;
  }
  return MEDI[key];
}

/* ---------- 8. Indicateurs calculables en plus (P2-1) ---------- */
// Cours ÷ valeur comptable : valeur en Bourse du jour ÷ capitaux propres de clôture.
function donPb(s) {
  if (!donRetenue(s)) return null;
  if (!(s.equity > 0)) return null;
  const v = valo(s); if (!v || !v.capE || v.vieux) return null;
  const eq = donEur(s.equity * 1e6, s.currency);
  if (!(eq > 0)) return null;
  const x = v.capE / eq;
  return x > 0 && x < 300 ? x : null; // borne large : un rapport élevé est courant après des rachats d'actions
}
// Rentabilité du capital employé APRÈS impôt : (résultat d'exploitation × (1 − taux d'impôt effectif))
// ÷ (capitaux propres + dette nette). Le taux vient des comptes (impôt ÷ résultat avant impôt),
// jamais d'une hypothèse. Donnée collectée depuis la version 4 : vide tant que les robots n'ont pas repassé.
function donRoic(s) {
  if (!s || !donRetenue(s) || (typeof isBank === "function" && isBank(s))) return null;
  const k = x => x != null && isFinite(x);
  if (!k(s.ebit) || !k(s.equity) || !k(s.netDebt) || !k(s.tax) || !(s.pretax > 0)) return null;
  const ce = s.equity + s.netDebt; if (!(ce > 0)) return null;
  const taux = s.tax / s.pretax; if (!(taux >= 0 && taux < 0.6)) return null;
  const x = s.ebit * (1 - taux) / ce;
  return x > -1 && x < 2 ? x : null;
}

/* ---------- 9. Chiffres du dernier exercice, à partir d'une fiche complète ---------- */
// Ajouts : yearPrev (période de la croissance), cagr3 / cagr5 sur exercices consécutifs seulement,
// investissements, dettes locatives, étiquettes XBRL retenues.
function donCagr(c, a, n) {
  const ys = c.years || [], L = ys.length - 1;
  if (L < n) return null;
  const i = L - n;
  if (ys[L] - ys[i] !== n) return null; // exercices non consécutifs : moyenne impossible
  const fin = a("ca", L), deb = a("ca", i);
  if (!(fin > 0) || !(deb > 0)) return null;
  return { v: Math.pow(fin / deb, 1 / n) - 1, de: ys[i], a: ys[L], ans: n };
}
function figuresOf(c) {
  if (typeof CURSYM !== "undefined") CURSYM = (typeof CUR !== "undefined" && CUR[c.currency]) || c.currency || "€";
  const L = c.years.length - 1, a = (k, i = L) => i >= 0 && c.fin[k] ? c.fin[k][i] : null;
  const caF = a("ca", 0), ca = a("ca");
  const ms = c.years.map((_, i) => a("ca", i) > 0 && a("ebit", i) != null ? a("ebit", i) / a("ca", i) : null);
  const lastM = ms.slice(-3);
  const ok = x => x != null && isFinite(x);
  let margeTrend = null;
  if (lastM.length === 3 && lastM.every(ok)) {
    if (lastM[0] > lastM[1] && lastM[1] > lastM[2] && lastM[0] - lastM[2] > 0.02) margeTrend = "baisse";
    if (lastM[0] < lastM[1] && lastM[1] < lastM[2] && lastM[2] - lastM[0] > 0.02) margeTrend = "hausse";
  }
  const tag = t => (c.tags && c.tags[t] && L >= 0 ? c.tags[t][L] ?? null : null);
  return {
    year: c.years[L], yearPrev: L >= 1 ? c.years[L - 1] : null, currency: c.currency,
    ca, caPrev: a("ca", L - 1), ebit: a("ebit"), net: a("net"), netPrev: a("net", L - 1), equity: a("equity"),
    netDebt: a("netDebt"), netDebtBaux: a("netDebtBaux"), leases: a("leases"), ebitda: a("ebitda"),
    fcf: a("fcf"), cfo: a("cfo"), capex: a("capex"), divPaid: a("divPaid"), eps: a("eps"),
    tax: a("tax"), pretax: a("pretax"),
    dps: a("dps") ?? a("dpsEst"), dpsEst: a("dps") == null && a("dpsEst") != null, dpsE: a("dps") == null && a("dpsEst") != null ? 1 : 0,
    // Moyenne sur toute la période : seulement si tous les exercices se suivent
    cagr: ca > 0 && caF > 0 && L >= 2 && c.years[L] - c.years[0] === L ? Math.pow(ca / caF, 1 / L) - 1 : null,
    cagr3: donCagr(c, a, 3), cagr5: donCagr(c, a, 5),
    span: L, first: c.years[0], consecutif: L >= 1 && c.years[L] - c.years[L - 1] === 1, margeTrend, marges: ms,
    tagNet: tag("net"), tagDette: tag("debt"), norme: tag("norme") || c.norme || null,
    clos: typeof provClos === "function" ? provClos(c, null) : null,
  };
}

/* ---------- 10. Indicateurs ajoutés à la liste commune (filtres, classements, comparaisons) ---------- */
// Chaque nouvel indicateur est déclaré dans le registre de provenance (m/provenance.js) : sans cela
// le bouton « i » ne dirait pas d'où vient le chiffre.
try {
  if (typeof PROV_IND === "object" && PROV_IND) {
    if (!PROV_IND.pb) PROV_IND.pb = { nom: "Cours ÷ valeur comptable", formule: "Valeur en Bourse actuelle ÷ capitaux propres à la clôture du dernier exercice publié, tout converti en euros.", unite: "fois", nature: "calcule", src: "mixte",
      limite: "Les capitaux propres comptables ne mesurent pas la valeur des marques, des brevets ni des équipes. Un rapport élevé est normal pour une entreprise peu gourmande en capital ou qui a racheté beaucoup de ses actions. Non calculé si les capitaux propres sont négatifs." };
    if (!PROV_IND.roic) PROV_IND.roic = { nom: "Rentabilité du capital employé après impôt", formule: "Résultat d'exploitation × (1 − taux d'impôt effectif) ÷ (capitaux propres + dette nette). Le taux d'impôt effectif vient des comptes : charge d'impôt ÷ résultat avant impôt.", unite: "pct", nature: "calcule", src: "comptes",
      limite: "Capital employé approché par capitaux propres + dette nette. Calculé seulement quand la charge d'impôt et le résultat avant impôt ont été lus dans les comptes. Non calculé pour les banques et les assurances." };
    if (!PROV_IND.cagr3) PROV_IND.cagr3 = { nom: "Croissance moyenne des ventes sur 3 ans", formule: "(Chiffre d'affaires du dernier exercice ÷ celui d'il y a trois exercices) puissance (1 ÷ 3) − 1.", unite: "pct", nature: "calcule", src: "comptes", plusieurs: true, term: "croissance",
      limite: "Calculée seulement si les quatre exercices se suivent. Une année exceptionnelle au début ou à la fin la déforme." };
    if (typeof PROV_ALIAS === "object" && PROV_ALIAS) { if (!PROV_ALIAS.cours_valeur_comptable) PROV_ALIAS.cours_valeur_comptable = "pb"; if (!PROV_ALIAS.cagr5) PROV_ALIAS.cagr5 = "cagr"; }
  }
} catch (e) { }
try {
  INDI.taille = ["Ventes annuelles", c => { donFxSync(); return c.ca > 0 ? (typeof caEur === "function" ? caEur(c) : c.ca * (FXE[c.currency] ?? 0)) / 1000 : null; }, x => F1.format(x) + " Md€", null];
  if (!INDI.cours_valeur_comptable) INDI.cours_valeur_comptable = ["Cours ÷ valeur comptable", c => donPb(c), x => F1.format(x) + " fois", true];
  if (!INDI.roic) INDI.roic = ["Rentabilité du capital employé après impôt", c => { const x = donRoic(c); return x == null ? null : x * 100; }, x => pct(x / 100, 1, false), false];
} catch (e) { }
