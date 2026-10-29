// Synthèse « Votre semaine en 2 minutes » : faits calculés (cf/src/synthese.mjs) et route /api/espace/bilan.
// Base SQLite en mémoire (comme D1), données du site, cours et modèle simulés.
import { DatabaseSync } from "node:sqlite";
import { clotures, lundiDe, variationSemaine, indiceDe, categorie, lignesPf, faitsSynthese, essentielDe, resumeCourt, seancePrecedente, addJ } from "../cf/src/synthese.mjs";
import { espace, syntheseNotif, semaineIso, jourParis, _redacteur } from "../cf/src/espace.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };

// Dates
ok(lundiDe("2026-W44") === "2026-10-26" && lundiDe("2026-W01") === "2025-12-29" && lundiDe("2020-W53") === "2020-12-28" && lundiDe("x") === null, "lundi d'une semaine ISO");
ok(seancePrecedente("2026-10-26") === "2026-10-23" && seancePrecedente("2026-10-28") === "2026-10-27" && seancePrecedente("2026-11-01") === "2026-10-30", "séance précédente");

// Clôtures : la copie du matin porte la clôture de la veille ; samedi, dimanche et lundi portent celle du vendredi
const hist = { "2026-10-23": { "c:a": 99 }, "2026-10-24": { "c:a": 100, "i:cac40": 8000 }, "2026-10-25": { "c:a": 100, "i:cac40": 8000 }, "2026-10-26": { "c:a": 100, "i:cac40": 8000 },
  "2026-10-27": { "c:a": 104, "i:cac40": 8040 }, "2026-10-28": { "c:a": 106, "i:cac40": 8080, "c:b": "x" }, "2026-10-29": { "c:a": 103, "i:cac40": 8120, "c:b": 50 } };
const cs = clotures(hist);
ok(JSON.stringify(cs.dates) === JSON.stringify(["2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28"]), "dates de clôture " + cs.dates);
ok(JSON.stringify(cs.items["c:a"]) === "[99,100,104,106,103]" && cs.items["c:b"].filter(v => v != null).length === 1 && cs.items["c:b"][4] === 50, "séries de clôture " + JSON.stringify(cs.items));

// Variation de la semaine 44 : depuis la clôture du vendredi 23, plus le cours du moment
let v = variationSemaine(cs, "c:a", "2026-10-26", "2026-10-29", { p: 105 });
ok(v && v.pct === 5 && v.du === "2026-10-23" && JSON.stringify(v.serie) === "[100,104,106,103,105]" && !v.partiel, "variation de la semaine " + JSON.stringify(v));
v = variationSemaine(cs, "c:a", "2026-10-26", "2026-10-31", { p: 103 }); // samedi : la dernière clôture est celle du vendredi, déjà relevée ? non : le 30 n'est pas encore relevé
ok(v && v.serie.length === 5 && v.au === "2026-10-30", "samedi : cours du vendredi ajouté " + JSON.stringify(v));
v = variationSemaine(cs, "c:b", "2026-10-26", "2026-10-29", { p: 51 });
ok(v && v.partiel && v.du === "2026-10-28" && v.pct === 2, "semaine partielle quand l'historique commence en cours de semaine " + JSON.stringify(v));
ok(variationSemaine(cs, "c:zz", "2026-10-26", "2026-10-29", { p: 10 }) === null, "sans historique : pas de variation");
ok(variationSemaine({ dates: ["2026-10-23"], items: { "c:a": [10] } }, "c:a", "2026-10-26", "2026-10-29", { p: 30 }) === null, "variation invraisemblable écartée");
v = variationSemaine(null, "c:a", "2026-10-26", "2026-10-29", { p: 110 }, { date: "2026-10-22", items: { "c:a": 100 } });
ok(v && v.pct === 10, "repli sur semaine.json");

// Indices et catégories
ok(indiceDe("c:x", { region: "FR" }) === "cac40" && indiceDe("c:x", { region: "MONDE" }) === null && indiceDe("e:x", { index: "S&P 500" }) === "sp500" && indiceDe("e:x", { index: "MSCI World" }) === null && indiceDe("e:x", { index: "S&P 500 Equal Weight" }) === null, "indice de référence");
ok(categorie("Annonce de résultats").code === "resultats" && categorie("Chiffre d'affaires du trimestre").code === "ca" && categorie("Annonce de dividende").code === "dividende" && categorie("Communiqué", "Offre publique d'achat sur X").code === "opa" && categorie("Changement de dirigeants").code === "dirigeants" && categorie("Communiqué").code === "communique", "catégories d'annonces");
ok(categorie("Annonce de résultats").poids > categorie("Changement de dirigeants").poids && categorie("Communiqué", "OPA").poids > categorie("Annonce de résultats").poids, "importance");

// Portefeuille : deux formats
let lp = lignesPf({ l: [{ k: "c:a", q: 10, pru: 90 }, { k: "e:w", m: 1000 }, { k: "BAD" }, { k: "c:a", q: 5 }] });
ok(lp.length === 2 && lp[0].q === 15 && lp[1].m === 1000, "portefeuille radiographie " + JSON.stringify(lp));
lp = lignesPf({ ops: [{ id: "a", q: 10, sens: "achat" }, { id: "a", q: 4, sens: "vente" }, { k: "e:w", q: 3 }, { id: "b", q: 2, sens: "vente" }] });
ok(lp.length === 2 && lp.find(l => l.k === "c:a").q === 6 && lp.find(l => l.k === "e:w").q === 3, "portefeuille en opérations " + JSON.stringify(lp));

// Faits de la semaine
const d = {
  names: { "c:a": "Alpha", "c:b": "Bêta", "c:g": "Gamma US", "e:w": "ETF Monde" },
  meta: { "c:a": { region: "FR" }, "c:b": { region: "FR" }, "c:g": { region: "US" } }, isin: { "c:a": "FR0000000001", "c:b": "FR0000000002", "c:g": "US0000000003" },
  etf: { "e:w": { ter: 0.6, pea: false, index: "MSCI World" } }, fx: { EUR: 1, USD: 0.9 },
  px: { "c:a": { p: 105, cur: "EUR" }, "c:b": { p: 51, cur: "EUR" }, "c:g": { p: 200, cur: "USD" }, "e:w": { p: 10, cur: "EUR" }, "i:cac40": { p: 8200 }, "i:sp500": { p: 6100 } },
  cs: { dates: cs.dates, items: { ...cs.items, "c:g": [170, 180, 205, 210, 190], "e:w": [10, 10, 10, 10, 10], "i:sp500": [6000, 6000, 6050, 6100, 6100] } }, sem: null,
  ana: { "https://ex.fr/a.pdf": { id: "a", type: "Annonce de résultats", date: "2026-10-27", chiffres: [["Bénéfice net", "1,2 Md€ (+8 %)"]], lecture: ["Le bénéfice progresse de 8 %."], explication: "x" },
    "https://ex.fr/b.pdf": { id: "b", type: "Nombre d'actions et de droits de vote", date: "2026-10-28", chiffres: [], lecture: ["Une information publiée par l'entreprise."], explication: "Une information publiée par l'entreprise.", extraits: ["Le nombre total d'actions composant le capital social s'élève à 12 345 678 actions."] },
    "https://ex.fr/old.pdf": { id: "a", type: "Annonce de résultats", date: "2026-10-20", chiffres: [] } },
  ev: [{ id: "g", date: "2026-11-05", type: "Résultats", label: "Résultats du 3e trimestre", source: "https://ex.fr/agenda" }, { id: "a", date: "2026-12-20", type: "Dividende", label: "Détachement" }],
  actu: { "c:b": [{ titre: "Bêta nomme un nouveau directeur général", url: "https://presse.ex/b", date: "2026-10-28T10:00:00Z", source: "presse.ex", resume: "Le conseil a choisi une dirigeante venue du secteur." }, { titre: "vieux", url: "https://presse.ex/v", date: "2026-10-01" }] },
};
const pf = { l: [{ k: "c:a", q: 10, pru: 90 }, { k: "c:g", q: 5, pru: 150 }, { k: "e:w", q: 40 }] };
const prec = { portefeuille: { alertes: [{ code: "ligne", niveau: "vig", valeur: 30 }, { code: "frais", niveau: "moyen", valeur: 0.6 }, { code: "top3", niveau: "vig", valeur: 90, texte: "Trois lignes concentrent 90 %." }] } };
const f = faitsSynthese(d, { favoris: ["c:b", "c:a", "c:inconnue"], pf }, "2026-W44", { auj: "2026-10-29", precedent: prec });
const L = Object.fromEntries(f.lignes.map(l => [l.k, l]));
ok(f.lignes.length === 4 && !L["c:inconnue"], "lignes suivies, inconnue écartée");
ok(L["c:a"].variation_semaine_pct === 5 && L["c:a"].indice.id === "cac40" && L["c:a"].indice.pct === 2.5 && L["c:a"].ecart_pts === 2.5 && L["c:a"].favori && L["c:a"].en_portefeuille, "Alpha : +5 %, CAC 40 +2,5 %, écart +2,5 points " + JSON.stringify(L["c:a"]));
ok(L["c:g"].variation_semaine_pct === 11.11 && L["c:g"].indice.id === "sp500" && L["e:w"].indice === null && L["c:b"].partiel, "Gamma contre le S&P 500, ETF Monde sans indice, Bêta partielle");
ok(f.meilleure.k === "c:g" && f.pire.k === "e:w" && f.hausses === 3 && f.baisses === 0 && !f.partiel, "meilleure, pire, partiel " + JSON.stringify([f.meilleure, f.pire, f.hausses, f.baisses]));
const P = f.portefeuille;
// valeurs : Alpha 10 × 105 = 1050 €, Gamma 5 × 200 × 0,9 = 900 €, ETF 40 × 10 = 400 € ; total 2350 €
ok(P && P.valeur_eur === 2350 && P.lignes === 3 && P.couverture_pct === 100, "valeur du portefeuille " + JSON.stringify(P).slice(0, 200));
// gains : Alpha 1050 − 1000 = 50 ; Gamma 900 − 810 = 90 ; ETF 0 → 140 € sur 2210 € au départ = +6,33 %
ok(Math.round(P.var_eur) === 140 && P.var_pct === 6.33 && L["c:a"].portefeuille.valeur_eur === 1050 && Math.round(L["c:g"].portefeuille.var_eur) === 90, "gain de la semaine en euros et en % " + JSON.stringify([P.var_eur, P.var_pct]));
ok(P.vs.map(i => i.id).join() === "cac40,sp500" && P.serie && P.serie.length >= 5 && P.serie[P.serie.length - 1] === 2350, "comparaison aux indices et courbe " + JSON.stringify(P.serie));
const A = Object.fromEntries(P.alertes.map(a => [a.code, a]));
ok(A.ligne && A.ligne.valeur === 44.68 && A.ligne.evol === "hausse" && A.frais && A.frais.evol === "stable" && A.pea && A.pea.valeur === 44.68 && A.pea.evol === "nouveau" && !A.top3, "alertes du portefeuille et leur évolution " + JSON.stringify(P.alertes.map(a => [a.code, a.valeur, a.evol])));
ok(P.levees.length === 1 && P.levees[0].code === "top3", "alerte levée");
ok(f.annonces.length === 3 && f.annonces[0].k === "c:a" && f.annonces[0].categorie === "resultats" && f.annonces[0].source === "https://ex.fr/a.pdf" && f.annonces[0].resume === "Le bénéfice progresse de 8 %.", "annonces de la semaine classées " + JSON.stringify(f.annonces.map(a => [a.k, a.categorie, a.poids])));
const bA = f.annonces.find(a => a.k === "c:b" && a.origine === "officiel"), pr = f.annonces.find(a => a.origine === "presse");
ok(bA.resume.startsWith("Le nombre total d'actions") && bA.categorie === "capital", "résumé en clair tiré de l'extrait quand la lecture est générique");
ok(pr && pr.categorie === "dirigeants" && pr.source === "https://presse.ex/b" && pr.site === "presse.ex" && pr.poids > bA.poids, "article de presse classé " + JSON.stringify(pr));
ok(f.a_venir.length === 1 && f.a_venir[0].nom === "Gamma US" && f.a_venir[0].categorie === "resultats" && f.a_venir[0].source === "https://ex.fr/agenda", "à venir sur 14 jours");
ok(f.essentiel.length === 3, "trois phrases " + JSON.stringify(f.essentiel));
ok(/^Votre portefeuille a gagné 140 € \(\+6,3 %\) cette semaine, contre \+2,5 % pour le CAC 40 et \+1,7 % pour le S&P 500\.$/.test(f.essentiel[0]), "phrase 1 : " + f.essentiel[0]);
ok(/^Gamma US signe la plus forte hausse de votre liste \(\+11,1 %\)\. Aucune annonce officielle/.test(f.essentiel[1]), "phrase 2 : " + f.essentiel[1]);
ok(/^À venir : Gamma US, Résultats du 3e trimestre, le jeudi 5 novembre\.$/.test(f.essentiel[2]), "phrase 3 : " + f.essentiel[2]);
ok(f.lecture_min >= 1 && f.lecture_min <= 5 && f.v === 2 && f.du === "2026-10-26" && f.au === "2026-11-01", "temps de lecture, version, période");
ok(!/NaN|undefined|—/.test(JSON.stringify(f)), "aucun NaN, undefined ou tiret cadratin");
// Annonce qui accompagne le plus fort mouvement
const f2 = faitsSynthese({ ...d, cs: { dates: cs.dates, items: { "c:a": [99, 100, 90, 85, 80] } }, px: { "c:a": { p: 80, cur: "EUR" } } }, { favoris: ["c:a"] }, "2026-W44", { auj: "2026-10-29" });
ok(/^Votre valeur suivie a évolué de −20,0 % cette semaine\.$/.test(f2.essentiel[0]), "phrase 1 sans portefeuille : " + f2.essentiel[0]);
ok(/^Alpha signe la plus forte baisse de votre liste \(−20,0 %\), la semaine de sa publication « Annonce de résultats » : bénéfice net 1,2 Md€ \(\+8 %\)\.$/.test(f2.essentiel[1]), "phrase 2 avec annonce : " + f2.essentiel[1]);
ok(/Aucune date/.test(f2.essentiel[2]), "phrase 3 sans date : " + f2.essentiel[2]);
// Fichiers de la collecte d'actualités (format { id, o: [annonces], p: [presse] }) et lignes rangées dans un PEA
const actu3 = { "c:a": { id: "a", o: [
    { d: "2026-10-27T17:40:00Z", id: "a", s: "amf", c: "resultats", i: 3, tf: "Résultats du troisième trimestre", u: "https://ex.fr/a.pdf", f: [], r: ["Le bénéfice progresse."], x: { c: "Alpha gagne plus qu'il y a un an.", ch: "Rien ne change pour le dividende annoncé." } },
    { d: "2026-10-28T08:00:00Z", id: "a", s: "amf", c: "operation", i: 3, tf: "Offre publique d'achat sur Delta", u: "https://ex.fr/opa.pdf", f: [["Prix offert", "42 € par action"]], r: [] },
    { d: "2026-10-28T08:00:00Z", id: "a", s: "amf", c: "rachat", i: 0, tf: "Déclaration des rachats d'actions", u: "https://ex.fr/rachat.pdf" },
    { d: "2026-10-12T08:00:00Z", id: "a", s: "amf", c: "dividende", i: 2, tf: "Ancien", u: "https://ex.fr/vieux.pdf" }],
  p: [{ d: "2026-10-28T10:00:00Z", t: "Alpha : les résultats rassurent", u: "https://presse.ex/1", s: "presse.ex" }, { d: "2026-10-28T11:00:00Z", t: "Deux", u: "https://presse.ex/2", s: "presse.ex" },
    { d: "2026-10-28T12:00:00Z", t: "Trois", u: "https://presse.ex/3", s: "presse.ex" }, { d: "2026-10-28T13:00:00Z", t: "Quatre", u: "https://presse.ex/4", s: "presse.ex" }] } };
const f3 = faitsSynthese({ ...d, actu: actu3 }, { favoris: ["c:a"], pf: { v: 3, cfg: { env: "pea" }, l: [{ k: "c:a", q: 10, env: "pea" }, { k: "c:g", q: 5, env: "pea" }, { k: "c:g", q: 1, env: "cto" }] } }, "2026-W44", { auj: "2026-10-29" });
const A3 = f3.annonces;
ok(A3[0].categorie === "opa" && A3[0].chiffres[0][1] === "42 € par action" && A3[0].source_nom === "AMF", "OPA en tête " + JSON.stringify(A3.map(a => [a.categorie, a.poids])));
const r3 = A3.find(a => a.source === "https://ex.fr/a.pdf");
ok(r3 && r3.categorie === "resultats" && r3.resume === "Alpha gagne plus qu'il y a un an." && r3.change === "Rien ne change pour le dividende annoncé." && r3.chiffres[0][0] === "Bénéfice net", "annonce de la collecte, complétée par les chiffres de actu-analyse " + JSON.stringify(r3));
ok(A3.filter(a => a.source === "https://ex.fr/a.pdf").length === 1 && !A3.some(a => a.source === "https://ex.fr/vieux.pdf"), "doublon et annonce hors semaine écartés");
ok(A3.filter(a => a.origine === "presse").length === 3 && A3.find(a => a.origine === "presse").site === "presse.ex" && A3.find(a => a.categorie === "capital").poids < A3.find(a => a.origine === "presse").poids, "presse limitée à 3 articles, routine en bas " + JSON.stringify(A3.map(a => [a.categorie, a.poids])));
const H = f3.portefeuille.alertes.find(a => a.code === "pea_hors");
ok(H && /^Gamma US est rangé dans votre PEA mais ne semble pas éligible\.$/.test(H.texte) && !f3.portefeuille.alertes.some(a => a.code === "pea"), "titre non éligible rangé dans le PEA " + JSON.stringify(f3.portefeuille.alertes.map(a => a.texte)));
ok(!/NaN|undefined|—/.test(JSON.stringify(f3)), "aucun NaN, undefined ou tiret cadratin (collecte)");
const rc = resumeCourt(f);
ok(rc.titre === "Votre semaine en 2 minutes" && rc.lien === "/espace" && rc.resume.length <= 221 && rc.resume.startsWith("Votre portefeuille"), "résumé pour les notifications " + JSON.stringify(rc));
ok(resumeCourt(null) === null && resumeCourt({ semaine: "2026-W40", moyenne: 1 }).resume.length > 10, "résumé d'un ancien bilan");

// Route /api/espace/bilan avec une base en mémoire
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
const today = jourParis(), lundi = lundiDe(semaineIso(today)), avant = addJ(lundi, -3);
let aiCalls = 0; _redacteur(async () => { aiCalls++; return "Cette semaine, Alpha a progressé de 5 %, un peu plus que le CAC 40. La cause de ce mouvement n'est pas connue. Gamma US publiera ses résultats bientôt ; ce n'est pas un conseil."; });
const cours2 = { dates: [avant], items: { "c:alpha": [100], "i:cac40": [8000] } };
const env = { DB: { prepare: q => stmt(q) }, ADMIN_KEY: "k", HASH_SALT: "sel",
  ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; const m = {
    "/data/univers.json": { companies: [{ id: "alpha", name: "Alpha", region: "FR", isin: "FR0000000001" }] }, "/data/etf.json": { list: [] },
    "/data/actu-analyse.json": { items: { "https://ex.fr/r.pdf": { id: "alpha", type: "Annonce de résultats", date: today, chiffres: [["Ventes", "3 Md€"]], lecture: ["Les ventes montent."] } } },
    "/data/agenda.json": { events: [] }, "/data/agenda-auto.json": { events: [] }, "/data/cours-semaine.json": cours2, "/data/fx.json": { eur: { EUR: 1 } } }[p];
    return m ? new Response(JSON.stringify(m)) : new Response("introuvable", { status: 404 }); } } };
globalThis.caches = { default: { match: async () => new Response(JSON.stringify({ items: { "c:alpha": { p: 105, cur: "EUR" }, "i:cac40": { p: 8200 } } })), put: async () => { } } };
const req = (method, path, body, h = {}) => new Request("https://t.local" + path, { method, headers: { "content-type": "application/json", "cf-connecting-ip": "9.9.9.9", ...h }, body: body ? JSON.stringify(body) : undefined });
const E = async (method, path, body, cookie) => { const r = await espace(req(method, path, body, cookie ? { cookie } : {}), env); return [r.status, await r.json(), r.headers.get("set-cookie")]; };
let [s, j, sc] = await E("POST", "/api/espace/inscription", { email: "s@ex.fr", motdepasse: "motdepasse-solide", favoris: ["c:alpha"], portefeuille: { l: [{ k: "c:alpha", q: 10, pru: 80 }] } });
const C = sc.split(";")[0];
[s, j] = await E("GET", "/api/espace/bilan?apercu=1", null, C);
ok(s === 200 && j.v === 2 && j.lignes[0].variation_semaine_pct === 5 && j.portefeuille.valeur_eur === 1050 && j.portefeuille.var_eur === 50 && j.essentiel.length >= 2 && j.texte === null && aiCalls === 0 && j.historique.length === 0 && j.en_cours, "aperçu : chiffres sans appel au modèle " + JSON.stringify(j).slice(0, 300));
ok(j.annonces[0].resume === "Les ventes montent." && j.indices.find(i => i.id === "cac40").pct === 2.5 && j.lignes[0].ecart_pts === 2.5, "annonce et indice dans la réponse");
ok(!Object.keys(j).some(k => k.startsWith("_")), "champs internes cachés");
[s, j] = await E("GET", "/api/espace/bilan", null, C);
ok(s === 200 && aiCalls === 1 && /Alpha/.test(j.texte) && j.lecture_min >= 1, "commentaire rédigé à la visite " + aiCalls);
[s, j] = await E("GET", "/api/espace/bilan", null, C);
ok(aiCalls === 1 && /Alpha/.test(j.texte), "commentaire gardé en cache");
const acc = sql.prepare("SELECT id FROM comptes WHERE email = 's@ex.fr'").get().id;
const n = await syntheseNotif(env, acc);
ok(n && n.titre === "Votre semaine en 2 minutes" && /^Votre portefeuille a gagné 50 €/.test(n.resume) && n.semaine === semaineIso(today), "syntheseNotif " + JSON.stringify(n));
ok((await syntheseNotif(env, "inconnu")) === null, "syntheseNotif sans synthèse");
// Ancienne synthèse (format précédent) : reconstruite
sql.prepare("UPDATE bilans SET contenu = ? WHERE compte = ?").run(JSON.stringify({ semaine: semaineIso(today), genere: Date.now(), lignes: [], annonces: [], a_venir: [], _cles: "c:alpha", _final: true }), acc);
[s, j] = await E("GET", "/api/espace/bilan?apercu=1", null, C);
ok(j.v === 2 && j.portefeuille, "ancien format reconstruit");
// Robot du samedi : la notification reprend la première phrase
sql.prepare("DELETE FROM bilans").run(); sql.prepare("UPDATE comptes SET last_tache = 0, last_semaine = NULL").run();
const rt = await espace(new Request("https://t.local/api/espace/tache?quoi=bilan", { method: "POST", headers: { "x-admin-key": "k" } }), env), jt = await rt.json();
const nb = sql.prepare("SELECT texte FROM notifs WHERE compte = ? AND type = 'bilan'").get(acc);
ok(jt.bilans === 1 && nb && /^Votre semaine en 2 minutes est prête\. Votre portefeuille a gagné 50 €/.test(nb.texte), "notification du samedi " + JSON.stringify(jt) + " " + (nb && nb.texte));
// Notification push (cf/src/push.mjs) : titre fixe, la première phrase de la synthèse en corps
const { message } = await import("../cf/src/push.mjs");
const mp = message([{ id: 1, type: "bilan", texte: nb.texte, lien: "/espace", at: 1 }]), mo = message([{ id: 2, type: "bilan", texte: "Votre bilan de la semaine est prêt.", lien: "/espace", at: 1 }]);
ok(mp.t === "Votre semaine en 2 minutes est prête" && /^Votre portefeuille a gagné 50 €/.test(mp.b) && mp.u === "/espace" && mo.b.startsWith("Les variations"), "notification push " + JSON.stringify([mp, mo]));

console.log(fails ? `synthese : ${fails} échec(s)` : "synthese : tout est bon");
process.exit(fails ? 1 : 0);
