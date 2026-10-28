// Espace personnel : comptes, sessions, données, bilan de la semaine, notifications, Premium rattaché au compte.
// Base SQLite en mémoire (comme D1), données du site, cours, modèle et e-mails simulés.
import { DatabaseSync } from "node:sqlite";
import { espace, compteDe, semaineIso, jourParis } from "../cf/src/espace.mjs";
import { premiumOf, quota } from "../cf/src/compte.mjs";
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
const DAY = 864e5, today = jourParis(), demain = jourParis(Date.now() + DAY), wd = new Date(today + "T12:00:00Z").getUTCDay();
let aiCalls = 0, aiText = "Cette semaine, vos lignes ont progressé de 2 % en moyenne. LVMH a gagné 10 %, ce qui est beaucoup pour une grande entreprise, tandis que TotalEnergies a reculé de 5 %. La cause de ces mouvements n'est pas connue.", sent = [];
const env = { DB: { prepare: q => stmt(q) }, ADMIN_KEY: "k", MAIL_FROM: "bilan@exemple.fr", BREVO_KEY: "b", HASH_SALT: "sel-test",
  AI: { run: async () => { aiCalls++; return { response: aiText }; } },
  ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; const d = {
    "/data/univers.json": { companies: [{ id: "lvmh", name: "LVMH" }, { id: "totalenergies", name: "TotalEnergies" }] },
    "/data/etf.json": { list: [{ id: "cw8", name: "Amundi MSCI World" }] },
    "/data/actu-analyse.json": { items: { "https://ex.fr/lvmh-t3.pdf": { id: "lvmh", type: "Chiffre d'affaires trimestriel", date: today, chiffres: [["Ventes", "19,1 Md€ (+2 %)"]], lecture: ["Les ventes progressent un peu."] } } },
    "/data/agenda.json": { events: [{ id: "totalenergies", date: demain, type: "Résultats", label: "Résultats du 3e trimestre" }] },
    "/data/agenda-auto.json": { events: [] },
    "/data/semaine.json": { date: "2026-10-21", items: { "c:lvmh": 500, "c:totalenergies": 60, "e:cw8": 400 } } }[p];
    return new Response(JSON.stringify(d || {})); } } };
globalThis.caches = { default: { match: async () => new Response(JSON.stringify({ items: { "c:lvmh": { p: 550, chg: 6, cur: "EUR" }, "c:totalenergies": { p: 57, chg: -1, cur: "EUR" }, "e:cw8": { p: 404, chg: 0.2, cur: "EUR" } } })), put: async () => { } } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("brevo")) { const b = JSON.parse(o.body); sent.push({ to: b.to[0].email, subject: b.subject, text: b.textContent, html: b.htmlContent }); return new Response("{}", { status: 201 }); }
  return realFetch(u, o); };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const req = (method, path, body, h = {}) => new Request("https://t.local" + path, { method, headers: { "content-type": "application/json", "cf-connecting-ip": "1.1.1.1", ...h }, body: body ? JSON.stringify(body) : undefined });
const E = async (method, path, body, cookie, h = {}) => { const r = await espace(req(method, path, body, cookie ? { cookie, ...h } : h), env); const sc = r.headers.get("set-cookie"); return [r.status, await r.json(), sc]; };
const cookieOf = sc => sc && sc.split(";")[0];

// Semaines ISO
ok(semaineIso("2026-10-28") === "2026-W44" && semaineIso("2021-01-03") === "2020-W53" && semaineIso("2026-12-31") === "2026-W53" && semaineIso("2024-12-30") === "2025-W01", "semaines ISO");

// Inscription
let [s, j, sc] = await E("POST", "/api/espace/inscription", { email: "a@ex.fr", motdepasse: "court" }); ok(s === 400, "mot de passe trop court");
[s] = await E("POST", "/api/espace/inscription", { email: "pas-une-adresse", motdepasse: "motdepasse-solide" }); ok(s === 400, "adresse invalide");
[s, j, sc] = await E("POST", "/api/espace/inscription", { email: " A@Ex.fr ", motdepasse: "motdepasse-solide", favoris: ["c:lvmh", "pas bon"], portefeuille: { l: [{ k: "c:totalenergies", q: 10, pru: 50 }, { k: "e:cw8", m: 1000 }] }, profil: { risque: "prudent" } });
ok(s === 200 && j.email === "a@ex.fr" && /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(j.code_secours), "inscription " + JSON.stringify(j));
ok(sc && /^bilan_s=[a-f0-9]{64};/.test(sc) && /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Lax/.test(sc) && /Path=\//.test(sc) && /Max-Age=5184000/.test(sc), "cookie de session " + sc);
let A = cookieOf(sc); const codeA = j.code_secours;
const rowA = sql.prepare("SELECT * FROM comptes WHERE email = 'a@ex.fr'").get();
ok(rowA.hash.startsWith("pbkdf2-sha256$100000$") && !rowA.hash.includes("motdepasse") && rowA.sel.length === 32 && !rowA.secours.includes(codeA.replace(/-/g, "")), "mot de passe et code stockés hachés");
ok(sql.prepare("SELECT h FROM sessions").get().h !== A.slice(8), "seule l'empreinte de la session est gardée");
[s, j] = await E("POST", "/api/espace/inscription", { email: "a@EX.fr", motdepasse: "autre-motdepasse" }); ok(s === 409 && !/existe/.test(j.error), "adresse déjà prise, message neutre " + j.error);

// Moi
[s, j] = await E("GET", "/api/espace/moi"); ok(s === 200 && j.connecte === false, "non connecté");
let r = await espace(req("GET", "/api/espace/moi", null, { cookie: A }), env), txt = await r.text(); j = JSON.parse(txt);
ok(j.connecte && j.email === "a@ex.fr" && j.premium === false && j.plan === null && j.nonlus === 0 && j.teaser === false && j.mail === true, "moi " + txt);
ok(JSON.stringify(j.donnees.favoris) === '["c:lvmh"]' && j.donnees.portefeuille.l.length === 2 && j.donnees.profil.risque === "prudent", "données importées à l'inscription");
ok(!/pbkdf2|"hash"|"sel"|secours/.test(txt), "aucune empreinte renvoyée");
ok((await compteDe(req("GET", "/", null, { cookie: A }), env)).email === "a@ex.fr" && (await compteDe(req("GET", "/"), env)) === null, "compteDe");

// Connexion : 8 échecs puis blocage
for (let i = 1; i <= 8; i++) { [s, j] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "mauvais-mdp-" + i }); ok(s === 401 && j.error === "Adresse ou mot de passe incorrect.", "échec " + i + " " + s); }
[s] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "mauvais-mdp-9" }); ok(s === 429, "9e essai bloqué " + s);
[s] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "motdepasse-solide" }); ok(s === 429, "bloqué même avec le bon mot de passe");
[s] = await E("POST", "/api/espace/connexion", { email: "z@ex.fr", motdepasse: "motdepasse-solide" }, null, { "cf-connecting-ip": "2.2.2.2" }); ok(s === 401, "adresse inconnue : même réponse");
[s] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "motdepasse-solide" }, null, { "cf-connecting-ip": "3.3.3.3" }); ok(s === 429, "blocage par adresse, quelle que soit l'IP");
sql.prepare("DELETE FROM essais WHERE cle LIKE 'e:%'").run();
[s] = await E("POST", "/api/espace/connexion", { email: "b@ex.fr", motdepasse: "motdepasse-solide" }); ok(s === 429, "blocage par IP " + s);
sql.prepare("DELETE FROM essais").run();
[s, j, sc] = await E("POST", "/api/espace/connexion", { email: "A@ex.fr", motdepasse: "motdepasse-solide" }); ok(s === 200 && /^bilan_s=/.test(sc), "connexion");
const A2 = cookieOf(sc);
[s] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "motdepasse-solide" }, null, { origin: "https://autre-site.example" }); ok(s === 403, "autre origine refusée");

// Données
[s] = await E("PUT", "/api/espace/donnees", { favoris: ["c:lvmh"] }); ok(s === 401, "données : connexion requise");
for (const [b, m] of [[{ favoris: "c:lvmh" }, "favoris pas un tableau"], [{ favoris: ["c:LVMH"] }, "favori mal formé"], [{ favoris: ["x:lvmh"] }, "préfixe inconnu"], [{ favoris: Array.from({ length: 201 }, (_, i) => "c:e" + i) }, "201 favoris"],
  [{ profil: [1, 2] }, "profil tableau"], [{ profil: "prudent" }, "profil texte"], [{ portefeuille: { l: "x".repeat(62000) } }, "portefeuille trop gros"], [{ portefeuille: 12 }, "portefeuille nombre"]]) {
  [s] = await E("PUT", "/api/espace/donnees", b, A); ok(s === 400, "validation : " + m + " " + s); }
[s] = await E("PUT", "/api/espace/donnees", { favoris: ["c:lvmh", "c:lvmh", "e:cw8"] }, A); ok(s === 200, "favoris enregistrés");
[s, j] = await E("GET", "/api/espace/moi", null, A2); ok(JSON.stringify(j.donnees.favoris) === '["c:lvmh","e:cw8"]' && j.donnees.portefeuille.l.length === 2 && j.donnees.profil.risque === "prudent", "les autres champs restent " + JSON.stringify(j.donnees));

// Bilan de la semaine
[s, j] = await E("GET", "/api/espace/bilan", null, A);
const L = Object.fromEntries((j.lignes || []).map(l => [l.k, l]));
ok(s === 200 && j.semaine === semaineIso(today) && j.lignes.length === 3, "bilan construit " + JSON.stringify(j).slice(0, 300));
ok(L["c:lvmh"].variation_semaine_pct === 10 && L["c:totalenergies"].variation_semaine_pct === -5 && L["e:cw8"].variation_semaine_pct === 1 && L["c:lvmh"].cours === 550 && L["c:lvmh"].devise === "EUR" && L["c:lvmh"].nom === "LVMH", "variations de la semaine");
ok(j.moyenne === 2 && j.meilleure.k === "c:lvmh" && j.pire.k === "c:totalenergies" && j.hausses === 2 && j.baisses === 1, "moyenne, meilleure, pire");
ok(j.annonces.length === 1 && j.annonces[0].nom === "LVMH" && j.a_venir.length === 1 && j.a_venir[0].date === demain, "annonces et dates à venir");
ok(j.texte === aiText && aiCalls === 1 && Array.isArray(j.historique) && j.historique.length === 0 && typeof j.provisoire === "boolean" && !Object.keys(j).some(k => k.startsWith("_")), "commentaire rédigé " + JSON.stringify(j.texte));
ok(sql.prepare("SELECT vu FROM bilans").get().vu === 1, "bilan marqué vu");
[s, j] = await E("GET", "/api/espace/bilan", null, A); ok(s === 200 && j.texte === aiText && aiCalls === 1, "bilan relu sans nouvel appel au modèle");
sql.prepare("INSERT INTO bilans (compte, semaine, contenu, created) VALUES (?, '2026-W30', ?, 0)").run(rowA.id, JSON.stringify({ semaine: "2026-W30", genere: 0, lignes: [], moyenne: -1.5, annonces: [], a_venir: [], texte: "ancien", _cles: "" }));
[s, j] = await E("GET", "/api/espace/bilan", null, A); ok(j.historique.length === 1 && j.historique[0].semaine === "2026-W30" && j.historique[0].moyenne === -1.5, "historique " + JSON.stringify(j.historique));
[s, j] = await E("GET", "/api/espace/bilan?semaine=2026-W30", null, A); ok(s === 200 && j.texte === "ancien" && j.provisoire === false && aiCalls === 1, "semaine passée");
[s] = await E("GET", "/api/espace/bilan?semaine=2026-W01", null, A); ok(s === 404, "semaine absente");
[s] = await E("GET", "/api/espace/bilan?semaine=44", null, A); ok(s === 400, "semaine invalide");
[s] = await E("GET", "/api/espace/bilan"); ok(s === 401, "bilan : connexion requise");

// Compte B (gratuit) : modèle indisponible, chiffres affichés quand même, nouvel essai plus tard
[s, j, sc] = await E("POST", "/api/espace/inscription", { email: "b@ex.fr", motdepasse: "motdepasse-de-b", favoris: ["c:totalenergies"] }); const B = cookieOf(sc);
aiText = ""; [s, j] = await E("GET", "/api/espace/bilan", null, B); ok(s === 200 && j.texte === null && j.lignes.length === 1 && j.moyenne === -5, "sans IA : chiffres seuls");
const n0 = aiCalls; [s, j] = await E("GET", "/api/espace/bilan", null, B); ok(aiCalls === n0, "pas de nouvel essai tout de suite");
const rowB = sql.prepare("SELECT * FROM comptes WHERE email = 'b@ex.fr'").get(), cb = JSON.parse(sql.prepare("SELECT contenu FROM bilans WHERE compte = ?").get(rowB.id).contenu);
cb._ia_at = 0; sql.prepare("UPDATE bilans SET contenu = ? WHERE compte = ?").run(JSON.stringify(cb), rowB.id);
aiText = "Texte de rattrapage assez long : TotalEnergies a reculé de 5 % sur la semaine, sans cause connue dans les faits. Ce mouvement reste modéré."; [s, j] = await E("GET", "/api/espace/bilan", null, B); ok(j.texte && j.texte.startsWith("Texte de rattrapage"), "nouvel essai lors d'une visite suivante");
[s] = await E("PUT", "/api/espace/donnees", { favoris: ["c:totalenergies", "c:lvmh"] }, B); [s, j] = await E("GET", "/api/espace/bilan", null, B); ok(j.lignes.length === 2, "bilan refait quand la liste change");

// Quotas : un compte gratuit est compté sous son identifiant, pas sous l'IP
let q = await quota(req("POST", "/api/veille", null, { cookie: B }), env, "veille");
ok(q.ok && sql.prepare("SELECT who FROM usage").all().some(x => x.who === "u:" + rowB.id), "quota compté par compte " + JSON.stringify(sql.prepare("SELECT who FROM usage").all()));
q = await quota(req("POST", "/api/veille", null, { cookie: B, "cf-connecting-ip": "9.9.9.9" }), env, "veille"); ok(!q.ok, "même compte, autre appareil : même compteur");

// Premium rattaché au compte
const TOK = "abcdef0123456789abcdef0123456789abcdef01";
sql.prepare("INSERT INTO abonnes (token, email, plan, sub_id, session, until, created) VALUES (?, 'c@ex.fr', 'unique', NULL, 'cs_x', ?, ?)").run(TOK, Date.now() + 300 * DAY, Date.now());
[s] = await E("POST", "/api/espace/premium", { token: "" }, A); ok(s === 400, "code vide");
[s] = await E("POST", "/api/espace/premium", { token: "abcdef" }, A); ok(s === 404, "code inconnu");
ok((await premiumOf(req("GET", "/", null, { cookie: A }), env)) === null, "pas encore Premium");
[s, j] = await E("POST", "/api/espace/premium", { token: TOK }, A); ok(s === 200 && j.premium && j.plan === "unique", "Premium rattaché " + JSON.stringify(j));
[s, j] = await E("GET", "/api/espace/moi", null, A2); ok(j.premium === true && j.plan === "unique", "Premium sur l'autre appareil");
ok((await premiumOf(req("GET", "/", null, { cookie: A }), env)).token === TOK, "premiumOf par le cookie");
ok((await premiumOf(req("GET", "/", null, { "x-bilan-token": TOK }), env)).token === TOK, "premiumOf par le code (inchangé)");
ok((await premiumOf(req("GET", "/", null, { cookie: B }), env)) === null, "B n'est pas Premium");
[s] = await E("POST", "/api/espace/premium", { token: TOK }, B); ok(s === 409, "code déjà rattaché à un autre compte");
q = await quota(req("POST", "/api/veille", null, { cookie: A }), env, "veille"); ok(q.ok && q.premium, "quota Premium par le compte");

// Préférences et robot
[s] = await E("POST", "/api/espace/preferences", { teaser: "oui" }, A); ok(s === 400, "préférence invalide");
[s, j] = await E("POST", "/api/espace/preferences", { teaser: true }, A); ok(s === 200 && j.teaser === true, "e-mail de rappel demandé");
[s] = await E("POST", "/api/espace/tache?quoi=bilan"); ok(s === 403, "tâche protégée");
[s, j] = await E("POST", "/api/espace/tache?quoi=bilan", null, null, { "x-admin-key": "k" }); ok(s === 200 && j.traites === 2 && j.reste === 0 && j.bilans === 2, "tâche " + JSON.stringify(j));
const types = sql.prepare("SELECT type FROM notifs WHERE compte = ?").all(rowA.id).map(x => x.type).sort().join(",");
ok(types === (wd >= 1 && wd <= 5 ? "annonce,bilan,mouvement,resultats" : "annonce,bilan,resultats"), "notifications créées " + types);
ok(sent.length === 1 && sent[0].to === "a@ex.fr" && sent[0].subject === "Votre bilan de la semaine est prêt" && sent[0].text.includes("https://t.local/espace") && !/%|LVMH/.test(sent[0].text + sent[0].html), "e-mail court, lien seulement " + JSON.stringify(sent));
[s, j] = await E("GET", "/api/espace/notifs", null, A); ok(s === 200 && j.notifs.length === types.split(",").length && j.nonlus === j.notifs.length && j.notifs[0].lien && j.notifs.every(n => n.lu === false), "liste des notifications");
[s, j] = await E("GET", "/api/espace/moi", null, A); ok(j.nonlus === types.split(",").length && j.bilan && j.bilan.semaine === semaineIso(today), "non lues dans moi");
[s] = await E("POST", "/api/espace/notifs/lu", null, A); [s, j] = await E("GET", "/api/espace/notifs", null, A); ok(j.nonlus === 0, "tout marqué lu");
[s, j] = await E("POST", "/api/espace/tache?quoi=bilan", null, null, { "x-admin-key": "k" }); ok(j.traites === 0 && j.reste === 0, "rien à refaire " + JSON.stringify(j));
sql.prepare("UPDATE comptes SET last_tache = 0, teaser = 0").run();
[s, j] = await E("POST", "/api/espace/tache?quoi=alertes", null, null, { "x-admin-key": "k" }); ok(j.traites === 2 && j.notifs === 0 && sent.length === 1, "alertes sans doublon " + JSON.stringify(j));

// Code de secours
[s] = await E("POST", "/api/espace/secours", { email: "a@ex.fr", code: "AAAA-BBBB-CCCC-DDDD", nouveau: "nouveau-mdp-tres-sur" }); ok(s === 401, "mauvais code");
[s, j, sc] = await E("POST", "/api/espace/secours", { email: "a@ex.fr", code: codeA.toLowerCase().replace(/-/g, " "), nouveau: "nouveau-mdp-tres-sur" });
ok(s === 200 && j.code_secours && j.code_secours !== codeA && /^bilan_s=/.test(sc), "mot de passe réinitialisé " + JSON.stringify(j));
const codeA2 = j.code_secours; A = cookieOf(sc);
[s, j] = await E("GET", "/api/espace/moi", null, A2); ok(j.connecte === false, "anciennes sessions fermées");
[s, j] = await E("GET", "/api/espace/moi", null, A); ok(j.connecte === true && j.premium === true, "nouvelle session, Premium conservé");
[s] = await E("POST", "/api/espace/secours", { email: "a@ex.fr", code: codeA, nouveau: "encore-un-autre-mdp" }); ok(s === 401, "ancien code inutilisable");
[s] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "nouveau-mdp-tres-sur" }); ok(s === 200, "connexion avec le nouveau mot de passe");

// Changement de mot de passe, déconnexion
[s] = await E("POST", "/api/espace/motdepasse", { ancien: "faux-mot-de-passe", nouveau: "troisieme-mdp-sur" }, A); ok(s === 401, "ancien mot de passe faux");
[s] = await E("POST", "/api/espace/motdepasse", { ancien: "nouveau-mdp-tres-sur", nouveau: "troisieme-mdp-sur" }, A); ok(s === 200, "mot de passe changé");
[s] = await E("POST", "/api/espace/connexion", { email: "a@ex.fr", motdepasse: "troisieme-mdp-sur" }); ok(s === 200, "connexion après changement");
[s, j, sc] = await E("POST", "/api/espace/deconnexion", null, A); ok(s === 200 && /Max-Age=0/.test(sc), "déconnexion");
[s, j] = await E("GET", "/api/espace/moi", null, A); ok(j.connecte === false, "session fermée");

// Suppression (RGPD)
[s] = await E("POST", "/api/espace/supprimer", { motdepasse: "faux-mot-de-passe" }, B); ok(s === 401, "suppression : mot de passe requis");
[s, j, sc] = await E("POST", "/api/espace/supprimer", { motdepasse: "motdepasse-de-b" }, B); ok(s === 200 && /Max-Age=0/.test(sc), "compte supprimé");
const left = ["comptes WHERE id", "sessions WHERE compte", "donnees WHERE compte", "bilans WHERE compte", "notifs WHERE compte"].map(t => sql.prepare(`SELECT COUNT(*) AS n FROM ${t} = ?`).get(rowB.id).n);
ok(left.every(n => n === 0), "plus aucune ligne pour ce compte " + left);
[s] = await E("POST", "/api/espace/connexion", { email: "b@ex.fr", motdepasse: "motdepasse-de-b" }); ok(s === 401, "compte supprimé : connexion impossible");
console.log(fails ? fails + " échec(s)" : "espace : tout est bon");
process.exit(fails ? 1 : 0);
