// L'actualité « Le monde » (cf/src/monde.mjs), sans navigateur ni IA.
// Usage : node tests/t_monde.mjs
import { choisirTitres, mondeFusion, mondePublic } from "../cf/src/monde.mjs";
let ok = 0, ko = 0;
const t = (c, m) => { if (c) ok++; else { ko++; console.log("ÉCHEC", m); } };

// 1. Un sujet repris par plusieurs médias est retenu ; un titre isolé, même plus récent, ne l'est pas.
const TITRES = ["Nvidia : Jensen Huang quitte la direction", "Huang démissionne, Nvidia plonge en Bourse", "Après le départ de Huang, qui pour diriger Nvidia ?", "Nvidia perd son fondateur Jensen Huang"];
const items = [
  { t: "Petit fait divers local sans suite", s: "journal-a", u: "https://a/1", d: "2026-11-13T09:00:00Z" },
  ...["journal-b", "journal-c", "journal-d", "journal-e"].map((s, i) => ({ t: TITRES[i], s, u: "https://" + s + "/nv", d: "2026-11-12T0" + i + ":00:00Z" })),
];
const T = choisirTitres(items, 10);
t(T.length === 4 && T.every(x => /Nvidia/.test(x.t)), "les quatre titres sur Nvidia sont retenus, pas le fait divers isolé (" + T.length + ")");
t(T.length && T[0].repris === 4, "le nombre de médias est compté (" + (T[0] && T[0].repris) + ")");
t(new Set(T.map(x => x.s)).size === 4, "un titre par média");

// 2. Fusion : un sujet déjà gardé n'est pas doublé, un nouveau sujet s'ajoute, rien n'est retiré.
const anciens = [{ titre: "Crise au sein de Nvidia et risques pour le marché", titres: [{ u: "https://x/1" }] }, { titre: "Inflation aux États-Unis", titres: [{ u: "https://x/2" }] }];
const neufs = [{ titre: "Départ de Jensen Huang de Nvidia", titres: [{ u: "https://x/3" }] }, { titre: "Inflation en Inde franchit un seuil", titres: [{ u: "https://x/4" }] }];
const F = mondeFusion(neufs, anciens);
t(F.length === 3, "Nvidia n'apparaît qu'une fois, les deux inflations restent distinctes (" + F.map(x => x.titre).join(" | ") + ")");
t(F[0].titre === "Départ de Jensen Huang de Nvidia", "le sujet le plus récent passe en premier");
t(mondeFusion([], anciens).length === 2, "une mise à jour vide ne retire aucun sujet");
const NOMS = ["Airbus", "Boeing", "Toyota", "Samsung", "Nestlé", "Siemens", "Sanofi", "Renault", "Volkswagen", "Microsoft", "Amazon", "Danone", "Ferrari", "Novartis"];
t(mondeFusion(NOMS.map((n, i) => ({ titre: n + " publie", titres: [{ u: "https://y/" + i }] })), []).length === 10, "dix sujets au plus");

// 3. Sans base ni titres de presse, /api/monde répond proprement (pas d'erreur).
const env = { ASSETS: { fetch: async () => new Response("{}", { headers: { "content-type": "application/json" } }) } };
const r = await mondePublic(new Request("https://t.local/api/monde"), env, { waitUntil() { } });
const j = await r.json();
t(r.status === 200 && Array.isArray(j.sujets), "/api/monde renvoie une liste de sujets, même vide");

console.log(`${ok} vérifications, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
