// Maquette de synthèse pour les tests d'affichage (tests/t_synthese_ui.py et tests/audit.py) : vraies entreprises du site,
// cours et annonces de TEST (inventés pour la maquette, jamais publiés). Usage : node tests/synthese_maquette.mjs [vide|plein] ['{réglages du rapport}']
import { readFileSync } from "node:fs";
import { faitsSynthese } from "../cf/src/synthese.mjs";
const J = p => JSON.parse(readFileSync(new URL("../cf/site/data/" + p, import.meta.url)));
const uni = J("univers.json"), etf = J("etf.json");
const names = {}, meta = {}, isin = {}, etfm = {};
uni.companies.forEach(c => { names["c:" + c.id] = c.name; meta["c:" + c.id] = { region: c.region, sector: c.sector }; isin["c:" + c.id] = c.isin; });
etf.list.forEach(e => { names["e:" + e.id] = e.name; etfm["e:" + e.id] = { ter: e.ter, pea: e.pea, index: e.index }; });
const dates = ["2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28"];
const S = (a, b) => dates.map((_, i) => Math.round((a + (b - a) * i / 4 + Math.sin(i * 1.7) * a * 0.008) * 100) / 100);
const items = { "c:lvmh": S(640, 600), "c:nvidia": S(178, 192), "c:totalenergies": S(54, 55.4), "e:amundi-msci-world-pea": S(5.6, 5.66), "c:hermes": S(2150, 2120), "c:air-liquide": S(167, 171),
  "c:kering": S(270, 281), "c:loreal": S(380, 374), "c:danone": S(70, 71), "c:bp": S(4.6, 4.5), "c:shell": S(27, 27.6), "c:eni": S(15, 15.2),
  "i:cac40": S(7950, 7890), "i:sp500": S(6750, 6810), "i:stoxx50": S(5600, 5580), "i:nasdaq100": S(24800, 25200), "i:dax": S(24000, 23900), "i:ftse100": S(9600, 9620) };
const px = Object.fromEntries(Object.entries(items).map(([k, s]) => [k, { p: s[4] * (k === "c:lvmh" ? 0.995 : 1.002), cur: k === "c:nvidia" ? "USD" : "EUR" }]));
const ana = {
  "https://example.org/lvmh-t3.pdf": { id: "lvmh", type: "Chiffre d'affaires du trimestre", date: "2026-10-27", chiffres: [["Ventes du trimestre", "18,3 Md€ (−2 %)"], ["Mode et maroquinerie", "−4 %"]], lecture: ["Les ventes reculent de 2 % à taux de change constants, tirées vers le bas par la mode et la maroquinerie."] },
  "https://example.org/tte-dirigeant.pdf": { id: "totalenergies", type: "Changement de dirigeants", date: "2026-10-28", chiffres: [], lecture: [], extraits: ["Le conseil d'administration a nommé une nouvelle directrice financière, qui prendra ses fonctions le 1er janvier 2027."] },
  "https://example.org/tte-actions.pdf": { id: "totalenergies", type: "Nombre d'actions et de droits de vote", date: "2026-10-26", chiffres: [], lecture: [], explication: "Déclaration mensuelle obligatoire." },
  "https://example.org/hermes-div.pdf": { id: "hermes", type: "Annonce de dividende", date: "2026-10-28", chiffres: [["Acompte", "3,50 € par action"]], lecture: ["Un acompte sur dividende sera versé en février."] },
};
const ev = [{ id: "totalenergies", date: "2026-10-30", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://example.org/agenda" }, { id: "nvidia", date: "2026-11-11", type: "Résultats", label: "Résultats du 3e trimestre de l'exercice 2027" }, { id: "air-liquide", date: "2026-11-06", type: "Dividende", label: "Détachement de l'acompte" }];
const actu = { // format de la collecte d'actualités (cf/site/data/actu/c/<id>.json)
  "c:nvidia": { id: "nvidia", o: [], p: [{ d: "2026-10-28T09:00:00Z", t: "Nvidia présente une nouvelle génération de puces pour centres de données", u: "https://example.org/nvda", s: "example.org", l: "fr" }] },
  "c:lvmh": { id: "lvmh", o: [{ d: "2026-10-27T16:45:00Z", id: "lvmh", s: "amf", c: "resultats", i: 3, tf: "Chiffre d'affaires du troisième trimestre 2026", u: "https://example.org/lvmh-t3.pdf", f: [], r: [],
    x: { c: "Les ventes du trimestre reculent de 2 % à taux de change constants. La mode et la maroquinerie, première activité du groupe, baissent de 4 %.", ch: "Le groupe ne change pas ses objectifs annuels ; les résultats complets de l'année seront publiés fin janvier." } }], p: [] } };
const vide = process.argv[2] === "vide", rapport = process.argv[3] ? JSON.parse(process.argv[3]) : null;
const f = faitsSynthese({ names, meta, isin, etf: etfm, px, fx: { EUR: 1, USD: 0.92 }, cs: { dates, items }, sem: null, ana, ev, actu },
  vide ? { favoris: [], rapport } : { rapport, favoris: ["c:lvmh", "c:nvidia", "c:totalenergies", "e:amundi-msci-world-pea", "c:hermes", "c:air-liquide"], pf: { l: [{ k: "c:lvmh", q: 4, pru: 700 }, { k: "c:totalenergies", q: 40, pru: 50 }, { k: "e:amundi-msci-world-pea", q: 300 }] } },
  "2026-W44", { auj: "2026-10-29", precedent: { portefeuille: { alertes: [{ code: "ligne", niveau: "vig", valeur: 41 }, { code: "pea", niveau: "info", valeur: 100 }] } } });
f.texte = "Ce qui a bougé\nVotre portefeuille recule un peu cette semaine, surtout à cause de LVMH, dont les ventes du trimestre ont baissé de 2 %. Nvidia progresse nettement.\nÀ venir\nTotalEnergies publie ses résultats vendredi.";
f.provisoire = true; f.en_cours = true;
f.historique = [{ semaine: "2026-W43", moyenne: 1.2, portefeuille_pct: 0.8 }, { semaine: "2026-W42", moyenne: -0.6, portefeuille_pct: -1.1 }, { semaine: "2026-W41", moyenne: 2.1, portefeuille_pct: 1.5 }];
if (vide) Object.assign(f, { vide: true, lignes: [] });
process.stdout.write(JSON.stringify(f));
