// Rapport de la semaine v8 (6/11 soir) : rivales, monde, radiographie, achats programmés, IA nourrie et phrases creuses refusées.
// Données réelles du dépôt (cf/site/data), base SQLite en mémoire, IA du site simulée. Usage : node tests/t_rapport8.mjs
import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { rapportExemple, calculerRapportExemple } from "../cf/src/espace.mjs";
const sql = new DatabaseSync(":memory:");
globalThis.fetch = async () => new Response("", { status: 404 }); // aucun accès réseau : cours du dépôt seulement (cours.json, cours-semaine.json)
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => { sql.prepare(q).run(...p); return { meta: { changes: 1 } }; } });
const ROOT = new URL("../cf/site/", import.meta.url);
const appels = { monde: 0, entreprise: 0 }, faitsVus = [];
let lectures = 0; // lectures de fichiers par appel : Cloudflare en limite le nombre (50 sur l'offre gratuite) ; le 6/11 le rapport dépassait et perdait l'IA
const env = {
  DB: { prepare: q => stmt(q), batch: async l => Promise.all(l.map(s => s.all())) },
  ASSETS: { fetch: async req => { lectures++; const p = decodeURIComponent(new URL(req.url || String(req)).pathname).replace(/^\//, ""), f = new URL(p, ROOT); return existsSync(f) ? new Response(readFileSync(f)) : new Response("", { status: 404 }); } },
  AI: { run: async (model, { messages }) => {
    const sys = messages[0].content, user = messages[1].content.replace(/\n\/no_think$/, ""); let f; try { f = JSON.parse(user); } catch (e) { throw new Error("JSON tronqué envoyé à l'IA (" + user.length + " caractères)"); }
    if (sys.startsWith("Tu choisis")) { appels.monde++;
      return { response: JSON.stringify({ sujets: [
        { titre: "Élections américaines : les valeurs de l'IA chahutées", theme: "États-Unis · Politique", fait: "Les Américains ont voté le 3 novembre. La presse relie à ce vote un recul des valeurs liées à l'intelligence artificielle.", titres: [0, 1], secteurs: ["tech"], pays: ["US"] },
        { titre: "La Banque d'Angleterre remonte son taux à 4 %", theme: "Royaume-Uni · Taux", fait: "Le 5 novembre, première hausse depuis plus de trois ans. La livre est montée à son plus haut depuis le référendum du Brexit. Cela pourrait refléter une confiance accrue.", titres: [2, 3], secteurs: [], pays: ["GB"] },
        { titre: "Sujet inventé", theme: "x", fait: "Un sujet sans titre réel doit être retiré par le serveur, même avec un texte assez long.", titres: [999], secteurs: ["tech"], pays: [] }] }), usage: { prompt_tokens: 3000, completion_tokens: 300 } }; }
    appels.entreprise++; faitsVus.push(f);
    if (f.entreprise === "TotalEnergies") return { response: JSON.stringify({ clair: "TotalEnergies a publié un communiqué. Cela pourrait influencer la structure du capital.", change: "" }) }; // creux : doit être refusé
    if (f.entreprise !== "ASML") return { response: "{}" }; // pas de texte : le navigateur montre la phrase calculée
    const vs = f.rivales.map(r => r.variation_semaine_pct);
    return { response: JSON.stringify({ clair: `ASML n'a rien annoncé cette semaine. Sa baisse est celle de tout son métier : ses rivales ont fait de ${Math.min(...vs)} % à ${Math.max(...vs)} %.`, change: `Ses comptes n'ont pas changé : ${Math.round(f.derniers_comptes_annuels.ventes_millions / 100) / 10} Md€ de ventes en ${f.derniers_comptes_annuels.exercice}.` }) };
  } },
};
let ok = 0, ko = 0; const t = (c, m) => { if (c) ok++; else { ko++; console.log("ÉCHEC :", m); } };
const b = await calculerRapportExemple(new Request("https://enklair.com/api/rapport-exemple"), env);
{ const lu = lectures, f = await (await rapportExemple(new Request("https://enklair.com/api/rapport-exemple"), env)).json(); lectures = lu; // 7/11 : rapport d'exemple figé, servi tel quel
  t(f.date_rapport === "2026-11-06" && f.lignes && f.lignes.length && f.monde && !f.en_cours, "rapport d'exemple figé : celui du 6 novembre, sans recalcul"); }
if (process.env.R8_JSON) (await import("node:fs")).writeFileSync(process.env.R8_JSON, JSON.stringify(b)); // pour les captures (scripts locaux)
t(b.v === 5, "version 5 du rapport");
console.log("Lectures de fichiers pour un rapport :", lectures); t(lectures <= 40, `au plus 40 lectures de fichiers par rapport (${lectures})`);
const R = b.rivales || {};
t(R["c:asml"] && R["c:asml"].liste.length >= 3, "ASML a ses rivales");
t(R["c:totalenergies"] && R["c:totalenergies"].liste.some(x => x.k === "c:shell"), "TotalEnergies face à Shell");
t(Object.values(R).every(x => x.verdict === null || ["suit", "mieux", "moins", "resultats"].includes(x.verdict)), "verdicts connus");
t(R["c:apple"] && R["c:apple"].verdict === "resultats", "Apple : résultats publiés");
t(Object.values(R).every(x => x.nouvelles.every(a => !/rachat|droits de vote/i.test(a.categorie + a.titre))), "pas d'opérations courantes chez les rivales");
console.log("Rivales :", Object.entries(R).map(([k, x]) => `${k} ${x.verdict} méd ${x.med} (${x.nouvelles.length} nouv.)`).join(" · "));
t(b.monde && b.monde.sujets.length === 2, "monde : 2 sujets gardés, le sujet inventé retiré");
const s0 = b.monde && b.monde.sujets[0];
t(b.monde && b.monde.sujets.every(x => !/pourrait/.test(x.fait)), "suppositions retirées du fait (« pourrait refléter »)");
t(s0 && s0.titres.length === 2 && s0.titres.every(x => /^https:\/\//.test(x.u)), "chaque sujet cite ses titres avec leur lien");
t(s0 && s0.chiffres.length >= 2, "nos chiffres pour le sujet tech");
t(s0 && s0.touche.some(x => x.k === "c:asml"), "ASML concernée par le sujet tech");
console.log("Monde :", JSON.stringify(b.monde && b.monde.sujets.map(s => ({ t: s.titre, ch: s.chiffres, touche: s.touche.map(x => x.nom), fond: s.fond && s.fond.id })), null, 0).slice(0, 900));
// Hors connexion, le test n'a pas les cours du jour : la radiographie est testée avec les valeurs du rapport d'exemple du 6/11 au soir
{ const { radioDe } = await import("../cf/src/rapport8.mjs");
  const u = JSON.parse(readFileSync(new URL("univers.json", new URL("data/", ROOT)), "utf8")), e = JSON.parse(readFileSync(new URL("data/etf.json", ROOT), "utf8"));
  const names = {}, meta = {}, parIsin = {}, etf = {};
  u.companies.forEach(c => { names["c:" + c.id] = c.name; meta["c:" + c.id] = { sector: c.sector, region: c.region }; if (c.isin) parIsin[c.isin] = "c:" + c.id; });
  e.list.forEach(x => { names["e:" + x.id] = x.name; etf["e:" + x.id] = { proxy: x.proxy || null }; });
  const V = { "e:amundi-msci-world-pea": 5809, "c:lvmh": 1229, "c:air-liquide": 1130, "c:totalenergies": 945, "c:schneider-electric": 910 };
  const n = { lignes: Object.entries(V).map(([k, v]) => ({ k, nom: names[k], portefeuille: { valeur_eur: v } })) };
  const charger = async p => JSON.parse(readFileSync(new URL(p.replace(/^\//, ""), ROOT), "utf8"));
  b.radio = await radioDe({ names, meta, parIsin, etf, charger }, n, b.monde); }
t(b.radio && b.radio.seaux.length >= 2, "radiographie : au moins deux seaux");
const tech = b.radio && b.radio.seaux.find(x => /Technologie/.test(x.lab)), us = b.radio && b.radio.seaux.find(x => /États-Unis/.test(x.lab));
t(tech && tech.via_etf.length === 1 && tech.eur > 300, "tech : vue à travers l'ETF Monde");
t(us && us.pct > 25 && us.pct < 60, "États-Unis : entre 25 et 60 % du portefeuille");
console.log("Radio :", JSON.stringify(b.radio && b.radio.seaux.map(x => [x.lab, x.eur, x.pct, x.direct, x.exemples])));
t(Array.isArray(b.dca) && b.dca[0].q === 25 && b.dca[0].prochain > "2026-01-01", "achat programmé : 25 parts, prochaine date");
console.log("DCA :", JSON.stringify(b.dca));
const IA = b.ia_entreprises || {};
t(!IA["c:totalenergies"], "texte creux de TotalEnergies refusé");
t(IA["c:asml"] && /rivales/.test(IA["c:asml"].clair), "ASML : texte de l'IA gardé");
t(!IA["c:lvmh"], "réponse vide de l'IA : rien gardé (phrase calculée à la place)");
const fA = faitsVus.find(f => f.entreprise === "ASML");
t(fA && fA.rivales.length >= 3 && fA.derniers_comptes_annuels && fA.derniers_comptes_annuels.ventes_millions > 0, "l'IA reçoit les rivales et les comptes d'ASML");
t(fA && fA.sujets_du_monde_qui_la_touchent.length >= 1, "l'IA reçoit le sujet du monde qui touche ASML");
t(appels.monde === 1, "un seul appel pour le monde");
const n0 = appels.entreprise, r2 = await calculerRapportExemple(new Request("https://enklair.com/api/rapport-exemple?x=2"), env);
t(appels.monde === 1 && r2.monde && r2.monde.sujets.length === 2, "monde servi par le cache au deuxième passage");
console.log(`\n${ok} réussis, ${ko} échecs (appels IA : monde ${appels.monde}, entreprises ${appels.entreprise}, dont ${appels.entreprise - n0} au deuxième passage)`);
process.exit(ko ? 1 : 0);
