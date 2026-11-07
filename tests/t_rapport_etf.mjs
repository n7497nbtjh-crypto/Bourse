// 7/11 soir : rapport de la semaine adapté au portefeuille (que des ETF, que des actions, un peu des deux).
// Données réelles du dépôt (cf/site/data), base SQLite en mémoire, IA du site simulée. Usage : node tests/t_rapport8.mjs
import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { rapportExemple, calculerRapportExemple, EXEMPLE_PROFIL } from "../cf/src/espace.mjs";
const sql = new DatabaseSync(":memory:");
globalThis.fetch = async () => new Response("", { status: 404 }); // aucun accès réseau : cours du dépôt seulement (cours.json, cours-semaine.json)
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => { sql.prepare(q).run(...p); return { meta: { changes: 1 } }; } });
const ROOT = new URL("../cf/site/", import.meta.url);
let lectures = 0; // lectures de fichiers par appel : Cloudflare en limite le nombre (50 sur l'offre gratuite) ; le 6/11 le rapport dépassait et perdait l'IA
const env = {
  DB: { prepare: q => stmt(q), batch: async l => Promise.all(l.map(s => s.all())) },
  ASSETS: { fetch: async req => { lectures++; const p = decodeURIComponent(new URL(req.url || String(req)).pathname).replace(/^\//, ""), f = new URL(p, ROOT); return existsSync(f) ? new Response(readFileSync(f)) : new Response("", { status: 404 }); } },
  AI: { run: async () => ({ response: "{}" }) }, // IA simulée : aucun texte (le rapport calculé doit se suffire)
};
// 7/11 soir : rapport adapté au portefeuille (que des ETF, que des actions, un peu des deux). Usage : node tests/t_rapport_etf.mjs
let ok = 0, ko = 0; const t = (c, m) => { if (c) ok++; else { ko++; console.log("ÉCHEC :", m); } };
const base = JSON.parse(JSON.stringify(EXEMPLE_PROFIL)), calc = async pf => { EXEMPLE_PROFIL.portefeuille = pf; EXEMPLE_PROFIL.favoris = []; return calculerRapportExemple(new Request("https://enklair.com/api/rapport-exemple"), env); };
const E = await calc({ l: [{ k: "e:amundi-msci-world-pea", q: 970, pru: 5.6 }, { k: "e:ishares-core-sp500", q: 4, pru: 600 }, { k: "e:hsbc-msci-world", q: 30, pru: 33, cur: "EUR" }] });
const x = E.etf8 || {};
if (process.env.R8_JSON) (await import("node:fs")).writeFileSync(process.env.R8_JSON, JSON.stringify(E));
t(x.profil === "etf", "profil ETF (" + x.profil + ")");
t(x.par_etf && x.par_etf.length === 3, "trois ETF ouverts (" + (x.par_etf || []).length + ")");
t((x.par_etf || []).find(e => e.k === "e:hsbc-msci-world" && e.via_indice === "MSCI World"), "HSBC sans positions publiées : contenu de l'indice MSCI World");
t((x.par_etf || []).every(e => e.couvert_pct >= 60 && e.baisse.length + e.hausse.length >= 3), "chaque ETF : entreprises suivies et mouvements");
t(x.entreprises && x.entreprises[0] && x.entreprises.length === 10 && x.entreprises[0].via > 0, "dix vraies entreprises");
t(x.memes_indices && x.memes_indices.some(m => m.index === "MSCI World" && m.etfs.length === 2), "deux ETF sur le même indice repérés");
t(x.devise && x.devise.us_eur > 0 && x.devise.taux_debut && x.devise.taux_fin, "effet du dollar calculé");
t(x.frais && x.frais.an > 0 && x.frais.lignes.length === 3, "frais des ETF en euros");
t(x.vues && x.vues.length >= 1 && x.vues.every(v => E.rivales[v.k]), "plus grosses entreprises des ETF face à leurs rivales");
t(Array.isArray(x.a_venir) && x.a_venir.every(e => e.eur >= 50 && e.date > "2026-11-07"), "dates à venir des entreprises des ETF");
const somme = (x.par_etf || []).flatMap(e => [...e.baisse, ...e.hausse]); t(somme.every(r => isFinite(r.eur) && Math.abs(r.eur) < 1000), "contributions plausibles");
console.log("ETF :", JSON.stringify({ profil: x.profil, top: (x.entreprises || []).slice(0, 4).map(e => [e.nom, e.eur, e.v, e.contrib]), dollar: x.devise, frais: x.frais && x.frais.an, venir: x.a_venir, vues: (x.vues || []).map(v => v.nom) }));
const A = await calc({ l: [{ k: "c:totalenergies", q: 40, pru: 58 }, { k: "c:apple", q: 6, pru: 200 }, { k: "c:lvmh", q: 3, pru: 520 }] });
if (process.env.R8_JSON) (await import("node:fs")).writeFileSync(process.env.R8_JSON + ".a.json", JSON.stringify(A));
t(A.etf8 && A.etf8.profil === "actions" && !A.etf8.par_etf.length && !A.etf8.vues, "profil actions : pas de bloc ETF");
t(A.etf8.devise && A.etf8.devise.us_eur > 0, "actions américaines : effet du dollar");
t(Array.isArray(A.etf8.dividendes), "dividendes calculés");
console.log("Actions :", JSON.stringify({ div: A.etf8.dividendes, dev: A.etf8.devise }));
const M = await calc(base.portefeuille);
if (process.env.R8_JSON) (await import("node:fs")).writeFileSync(process.env.R8_JSON + ".m.json", JSON.stringify(M));
t(M.etf8 && M.etf8.profil === "mixte", "profil mixte (" + (M.etf8 && M.etf8.profil) + ")");
t(M.etf8.doublons.some(d => d.k === "c:lvmh" || d.k === "c:totalenergies" || d.k === "c:air-liquide" || d.k === "c:schneider-electric"), "doublon : action en direct aussi dans l'ETF");
console.log("Mixte :", JSON.stringify({ doublons: M.etf8.doublons, part: M.etf8.part_etf_pct }));
console.log(ko ? `${ok} réussis, ${ko} échecs` : `rapport adapté : ${ok} vérifications OK`); process.exit(ko ? 1 : 0);
