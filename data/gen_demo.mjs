// Génère les données de démonstration (entreprises FICTIVES, chiffres FICTIFS).
// Sortie : cf/site/data/demo.json (lu par le site) et cf/src/demo-index.mjs (lu par le Worker pour les pages Google).
// Quand un vrai fournisseur de données sera choisi, ce fichier sera remplacé par un import depuis son API.
import { writeFileSync, mkdirSync } from "node:fs";

// Générateur pseudo-aléatoire déterministe : les mêmes données à chaque construction.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const START = { y: 2014, m: 1 };          // premier mois de l'historique
const END = { y: 2026, m: 9 };            // dernier mois (cours « du jour » de la démo)
const MONTHS = [];
for (let y = START.y, m = START.m; y < END.y || (y === END.y && m <= END.m); m++) {
  if (m > 12) { m = 1; y++; }
  if (y > END.y || (y === END.y && m > END.m)) break;
  MONTHS.push(`${y}-${String(m).padStart(2, "0")}`);
}
const YEARS = [2021, 2022, 2023, 2024, 2025];

// Repères de secteur (démo) : médianes indicatives affichées à côté des chiffres.
const SECTORS = {
  energie: { name: "Énergie", ref: { marge: 12, per: 9, rdt: 5.0, levier: 1.2, croissance: 3 } },
  industrie: { name: "Industrie", ref: { marge: 11, per: 18, rdt: 2.2, levier: 1.5, croissance: 5 } },
  sante: { name: "Santé", ref: { marge: 20, per: 21, rdt: 2.0, levier: 1.6, croissance: 6 } },
  tech: { name: "Technologie", ref: { marge: 22, per: 30, rdt: 0.8, levier: 0.5, croissance: 12 } },
  conso: { name: "Consommation", ref: { marge: 18, per: 24, rdt: 1.8, levier: 1.0, croissance: 7 } },
  banque: { name: "Banque", ref: { marge: 30, per: 8, rdt: 6.0, levier: null, croissance: 3 } },
  telecom: { name: "Télécoms", ref: { marge: 14, per: 13, rdt: 5.5, levier: 2.6, croissance: 1 } },
  distrib: { name: "Distribution", ref: { marge: 4, per: 12, rdt: 4.0, levier: 2.0, croissance: 3 } },
};

// Entreprises fictives. ca0 = chiffre d'affaires 2021 en millions d'euros.
const COMPANIES = [
  { id: "alveane-energie", tr: 0.02, name: "Alvéane Énergie", sector: "energie", ca0: 52000, g: [0.38, -0.12, -0.08, 0.02], mo: [0.10, 0.17, 0.14, 0.12, 0.115], payout: 0.48, lev: 0.9, per: 8.5, shares: 2400, vol: 0.075, desc: "Production et distribution de pétrole, de gaz et d'électricité renouvelable." },
  { id: "norbelle-industrie", tr: 0.08, name: "Norbelle Industrie", sector: "industrie", ca0: 18500, g: [0.07, 0.06, 0.04, 0.05], mo: [0.10, 0.105, 0.11, 0.115, 0.12], payout: 0.40, lev: 1.4, per: 19, shares: 560, vol: 0.06, desc: "Équipements électriques et automatismes pour l'industrie et le bâtiment." },
  { id: "lumisante", tr: 0.05, name: "Lumisanté", sector: "sante", ca0: 31000, g: [0.05, 0.03, 0.06, 0.04], mo: [0.24, 0.23, 0.21, 0.22, 0.225], payout: 0.50, lev: 1.1, per: 17, shares: 1250, vol: 0.045, desc: "Médicaments sur ordonnance et vaccins." },
  { id: "quarzio-logiciels", tr: 0.13, name: "Quarzio Logiciels", sector: "tech", ca0: 4200, g: [0.16, 0.14, 0.12, 0.11], mo: [0.18, 0.20, 0.22, 0.24, 0.25], payout: 0.15, lev: 0.2, per: 34, shares: 330, vol: 0.085, desc: "Logiciels de gestion pour les entreprises, vendus par abonnement." },
  { id: "maison-verlaine", tr: 0.1, name: "Maison Verlaine", sector: "conso", ca0: 9800, g: [0.17, 0.09, 0.03, -0.02], mo: [0.27, 0.28, 0.27, 0.25, 0.23], payout: 0.45, lev: 0.7, per: 26, shares: 105, vol: 0.07, desc: "Maroquinerie, parfums et prêt-à-porter haut de gamme." },
  { id: "credit-de-l-ill", tr: 0.03, name: "Crédit de l'Ill", sector: "banque", ca0: 24000, g: [0.04, 0.03, 0.02, 0.03], mo: [0.27, 0.29, 0.30, 0.31, 0.31], payout: 0.55, lev: null, per: 7.5, shares: 1200, vol: 0.07, bank: true, desc: "Banque de détail et banque de financement en Europe." },
  { id: "hexalis-telecom", tr: -0.01, name: "Hexalis Télécom", sector: "telecom", ca0: 42000, g: [0.00, -0.01, 0.01, 0.01], mo: [0.13, 0.12, 0.125, 0.13, 0.13], payout: 0.75, lev: 2.8, per: 12, shares: 2650, vol: 0.05, desc: "Téléphonie mobile, internet et services aux entreprises." },
  { id: "bastidia-distribution", tr: 0.02, name: "Bastidia Distribution", sector: "distrib", ca0: 76000, g: [0.06, 0.08, 0.02, 0.01], mo: [0.035, 0.032, 0.03, 0.033, 0.034], payout: 0.50, lev: 2.2, per: 11, shares: 740, vol: 0.06, desc: "Hypermarchés, supermarchés et commerce en ligne." },
];

// Fonds indiciels fictifs : servent de point de comparaison et sont utilisables dans les simulations.
const FUNDS = [
  { id: "demo-monde", name: "Indice démo Monde", kind: "fonds", mu: 0.0068, vol: 0.04, start: 100, fee: 0.2, desc: "Fonds indiciel fictif représentant les grandes entreprises du monde entier. Dividendes réinvestis." },
  { id: "demo-france", name: "Indice démo France", kind: "fonds", mu: 0.0062, vol: 0.047, start: 50, fee: 0.25, desc: "Fonds indiciel fictif représentant les grandes entreprises françaises. Dividendes réinvestis." },
];

const round = (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

function priceWalk(r, n, vol, drift) {
  const p = [1];
  for (let i = 1; i < n; i++) p.push(p[i - 1] * Math.exp(drift - vol * vol / 2 + vol * gauss(r)));
  return p;
}

const out = { asOf: MONTHS[MONTHS.length - 1], months: MONTHS, sectors: {}, companies: [], funds: [] };
for (const [k, s] of Object.entries(SECTORS)) out.sectors[k] = s;

COMPANIES.forEach((c, idx) => {
  const r = rng(1000 + idx * 77);
  const ca = [c.ca0];
  c.g.forEach(g => ca.push(ca[ca.length - 1] * (1 + g + (r() - 0.5) * 0.01)));
  const ebit = ca.map((v, i) => v * c.mo[i]);
  const net = ebit.map((v, i) => v * (c.bank ? 0.72 : 0.68 + (r() - 0.5) * 0.06));
  const eps = net.map(v => v / c.shares);
  const dps = eps.map(v => round(Math.max(0, v * c.payout), 2));
  const ebitda = ebit.map((v, i) => v * (c.bank ? 1 : 1.35 + r() * 0.15));
  const netDebt = c.lev == null ? null : ebitda.map(v => v * (c.lev + (r() - 0.5) * 0.3));
  const roe0 = c.bank ? 0.10 : 0.13 + r() * 0.07;
  const equity = net.map(v => v / (roe0 * (0.97 + r() * 0.06)));
  const fcf = c.bank ? null : net.map(v => v * (0.75 + r() * 0.4));
  // Cours : marche aléatoire recalée pour que le PER final corresponde à la cible.
  // Pont brownien : le cours part d'un niveau cohérent et finit au PER visé, avec des variations réalistes.
  const n = MONTHS.length, target = c.per * eps[eps.length - 1] * (1 + (r() - 0.5) * 0.06);
  const B = [0]; for (let i = 1; i < n; i++) B.push(B[i - 1] + c.vol * gauss(r));
  const a = Math.log(target) - c.tr * (n - 1) / 12, b = Math.log(target);
  const prices = B.map((x, i) => round(Math.exp(a + (b - a) * i / (n - 1) + x - B[n - 1] * i / (n - 1)), 2));
  // Dividendes historiques : versés chaque année en juin (montant de l'exercice précédent).
  const divs = [];
  for (let y = 2015; y <= 2026; y++) {
    const yi = YEARS.indexOf(y - 1);
    const d = yi >= 0 ? dps[yi] : round(dps[0] * Math.pow(0.95, 2021 - (y - 1)), 2);
    if (MONTHS.includes(`${y}-06`)) divs.push({ m: `${y}-06`, dps: d });
  }
  out.companies.push({
    id: c.id, name: c.name, kind: "action", sector: c.sector, country: "France", desc: c.desc, bank: !!c.bank,
    shares: c.shares,
    years: YEARS,
    fin: {
      ca: ca.map(v => round(v)), ebit: ebit.map(v => round(v)), net: net.map(v => round(v)),
      eps: eps.map(v => round(v, 2)), dps, ebitda: ebitda.map(v => round(v)),
      netDebt: netDebt && netDebt.map(v => round(v)), equity: equity.map(v => round(v)), fcf: fcf && fcf.map(v => round(v)),
    },
    prices, divs,
  });
});

FUNDS.forEach((f, idx) => {
  const r = rng(9000 + idx * 31);
  const walk = priceWalk(r, MONTHS.length, f.vol, f.mu);
  out.funds.push({ id: f.id, name: f.name, kind: "fonds", desc: f.desc, fee: f.fee, prices: walk.map(v => round(v * f.start, 2)), divs: [] });
});

// Agenda et actualités : déduits des chiffres ci-dessus, dates fictives.
const T3 = ["2026-10-22", "2026-10-29", "2026-11-03", "2026-11-05", "2026-11-10", "2026-11-12", "2026-11-17", "2026-11-19"];
const ANNUAL = ["2027-02-04", "2027-02-11", "2027-02-18", "2027-02-25", "2027-03-04", "2027-03-11", "2027-03-18", "2027-03-25"];
const AG = ["2027-04-22", "2027-04-27", "2027-04-29", "2027-05-04", "2027-05-06", "2027-05-11", "2027-05-18", "2027-05-25"];
const fr = (x, d = 1) => x.toFixed(d).replace(".", ",");
const pm = x => (x >= 0 ? "+" : "") + fr(x * 100) + " %";
out.companies.forEach((c, i) => {
  const L = c.fin.ca.length - 1, f = c.fin;
  const g = f.ca[L] / f.ca[L - 1] - 1, gn = f.net[L] / f.net[L - 1] - 1;
  const h1 = f.ca[L] * (0.49 + (i % 3) * 0.005), h1g = g + ((i % 4) - 1.5) * 0.01;
  c.ticker = c.name.normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  c.agenda = [
    { date: T3[i], type: "Résultats", label: "Chiffre d'affaires du 3e trimestre 2026" },
    { date: ANNUAL[(i * 5) % 8], type: "Résultats", label: "Résultats annuels 2026" },
    { date: AG[(i * 3) % 8], type: "Assemblée", label: "Assemblée générale annuelle" },
    { date: "2026-06-" + String(10 + i).padStart(2, "0"), type: "Dividende", label: "Détachement du dividende", detail: fr(f.dps[L], 2) + " € par action" },
    { date: "2026-07-" + String(21 + i).padStart(2, "0"), type: "Résultats", label: "Résultats du 1er semestre 2026" },
  ];
  const t3 = T3[i] <= "2026-10-28";
  c.news = [
    ...(t3 ? [{ date: T3[i], time: "07:30", type: "Résultats", title: `Chiffre d'affaires du 3e trimestre 2026 : ${fr(f.ca[L] * 0.25 / 1000)} Md€`, text: `Chiffre d'affaires en variation de ${pm(g * 0.9)} sur un an à périmètre comparable. Objectifs annuels confirmés.` }] : []),
    { date: "2026-07-" + String(21 + i).padStart(2, "0"), time: "17:45", type: "Résultats", title: `Résultats du 1er semestre 2026 : chiffre d'affaires de ${fr(h1 / 1000)} Md€ (${pm(h1g)})`, text: `Résultat net semestriel de ${fr(f.net[L] * 0.48 / 1000, 2)} Md€. Comptes semestriels déposés auprès de l'AMF.` },
    { date: "2026-06-" + String(10 + i).padStart(2, "0"), time: "08:00", type: "Dividende", title: `Détachement du dividende de ${fr(f.dps[L], 2)} € par action`, text: "Dividende au titre de l'exercice 2025, voté en assemblée générale." },
    { date: "2026-05-" + String(5 + i).padStart(2, "0"), time: "18:00", type: "Assemblée", title: "Assemblée générale : toutes les résolutions adoptées", text: `Dividende de ${fr(f.dps[L], 2)} € approuvé. Compte rendu des votes publié.` },
    { date: "2026-04-" + String(20 + i).padStart(2, "0"), time: "07:00", type: "Activité", title: "Chiffre d'affaires du 1er trimestre 2026", text: "Publication de l'activité trimestrielle." },
    { date: "2026-02-" + String(12 + i).padStart(2, "0"), time: "07:00", type: "Résultats", title: `Résultats annuels 2025 : résultat net de ${fr(f.net[L] / 1000, 2)} Md€ (${pm(gn)})`, text: `Chiffre d'affaires de ${fr(f.ca[L] / 1000)} Md€ (${pm(g)}). Dividende proposé : ${fr(f.dps[L], 2)} € par action.` },
  ];
});

mkdirSync(new URL("../cf/site/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../cf/site/data/demo.json", import.meta.url), JSON.stringify(out));
// Petit index pour le Worker (titres et descriptions des pages Google).
const idxData = out.companies.map(c => ({ id: c.id, name: c.name, sector: SECTORS[c.sector].name, desc: c.desc }))
  .concat(out.funds.map(f => ({ id: f.id, name: f.name, sector: "Fonds indiciel", desc: f.desc })));
writeFileSync(new URL("../cf/src/demo-index.mjs", import.meta.url), "// Généré par data/gen_demo.mjs\nexport default " + JSON.stringify(idxData, null, 1) + ";\n");
console.log(out.companies.length, "entreprises,", out.funds.length, "fonds,", MONTHS.length, "mois");
