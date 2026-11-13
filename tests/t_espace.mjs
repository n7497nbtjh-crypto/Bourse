// Espace personnel : comptes, sessions, favoris, Premium rattaché au compte (13/11 : rapport, alertes et portefeuille supprimés).
// Base SQLite en mémoire (comme D1), données du site, cours, modèle et e-mails simulés.
import { DatabaseSync } from "node:sqlite";
import { espace, compteDe, semaineIso, jourParis } from "../cf/src/espace.mjs";
import { premiumOf } from "../cf/src/compte.mjs";
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
const DAY = 864e5, today = jourParis(), demain = jourParis(Date.now() + DAY), wd = new Date(today + "T12:00:00Z").getUTCDay();
let aiCalls = 0, aiText = "Cette semaine, vos lignes ont progressé de 2 % en moyenne. LVMH a gagné 10 %, ce qui est beaucoup pour une grande entreprise, tandis que TotalEnergies a reculé de 5 %. La cause de ces mouvements n'est pas connue.", sent = [];
const env = { DB: { prepare: q => stmt(q) }, ADMIN_KEY: "k", MAIL_FROM: "bilan@exemple.fr", BREVO_KEY: "b", HASH_SALT: "sel-test",
  AI: { run: async () => { aiCalls++; return { response: aiText }; } },
  ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; const d = {
    "/data/univers.json": { companies: [{ id: "lvmh", name: "LVMH", sector: "conso" }, { id: "totalenergies", name: "TotalEnergies", sector: "energie" }] },
    "/data/etf.json": { list: [{ id: "cw8", name: "Amundi MSCI World" }] },
    "/data/actu-analyse.json": { items: { "https://ex.fr/lvmh-t3.pdf": { id: "lvmh", type: "Chiffre d'affaires trimestriel", date: today, chiffres: [["Ventes", "19,1 Md€ (+2 %)"]], lecture: ["Les ventes progressent un peu."] } } },
    "/data/agenda.json": { events: [{ id: "totalenergies", date: demain, type: "Résultats", label: "Résultats du 3e trimestre" }] },
    "/data/agenda-auto.json": { events: [] },
    "/data/semaine.json": { date: "2026-10-21", items: { "c:lvmh": 500, "c:totalenergies": 60, "e:cw8": 400 } } }[p];
    return new Response(JSON.stringify(d || {})); } } };
globalThis.caches = { default: { match: async () => new Response(JSON.stringify({ items: { "c:lvmh": { p: 550, chg: 6, cur: "EUR" }, "c:totalenergies": { p: 57, chg: -1, cur: "EUR" }, "e:cw8": { p: 404, chg: 0.2, cur: "EUR" } } })), put: async () => { } } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("api.stripe.com/v1/subscriptions/")) return new Response(JSON.stringify({ status: "active", cancel_at_period_end: globalThis.STRIPE_ANNULE === true, current_period_end: 1800000000 }), { status: 200 });
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
ok(j.connecte && j.email === "a@ex.fr" && j.premium === false && j.plan === null && !("nonlus" in j) && !("bilan" in j) && j.mail === true, "moi " + txt);
ok(JSON.stringify(j.donnees.favoris) === '["c:lvmh"]' && !("portefeuille" in j.donnees), "favoris importés à l'inscription, portefeuille non renvoyé");
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
[s, j] = await E("GET", "/api/espace/moi", null, A2); ok(JSON.stringify(j.donnees.favoris) === '["c:lvmh","e:cw8"]', "favoris enregistrés " + JSON.stringify(j.donnees));

// Compte B (gratuit)
[s, j, sc] = await E("POST", "/api/espace/inscription", { email: "b@ex.fr", motdepasse: "motdepasse-de-b", favoris: ["c:totalenergies"] }); const B = cookieOf(sc);
const rowB = sql.prepare("SELECT * FROM comptes WHERE email = 'b@ex.fr'").get();
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
{ // 7/11 : abonnement mensuel encore actif : suppression refusée tant qu'il n'est pas résilié
  const tok = "f0".repeat(20); sql.prepare("INSERT OR IGNORE INTO abonnes (token, email, plan, sub_id, session, until, created) VALUES (?, 'x@ex.fr', 'mensuel', 'sub_123', 'cs_m', ?, ?)").run(tok, Date.now() + 30 * DAY, Date.now());
  const avant = sql.prepare("SELECT premium FROM comptes WHERE id = ?").get(rowB.id).premium; sql.prepare("UPDATE comptes SET premium = ? WHERE id = ?").run(tok, rowB.id); env.STRIPE_SECRET = "rk_test";
  [s, j] = await E("POST", "/api/espace/supprimer", { motdepasse: "motdepasse-de-b" }, B); ok(s === 409 && j.abonnement && /Résiliez-le/.test(j.error), "suppression refusée : abonnement mensuel actif " + s);
  globalThis.STRIPE_ANNULE = true;
  [s, j] = await E("POST", "/api/espace/supprimer", { motdepasse: "faux" }, B); ok(s === 401, "toujours le mot de passe d'abord");
  { // abonnement payé avec la même adresse mais pas rattaché au compte : refusé aussi
    globalThis.STRIPE_ANNULE = false; const em = sql.prepare("SELECT email FROM comptes WHERE id = ?").get(rowB.id).email;
    sql.prepare("INSERT OR IGNORE INTO abonnes (token, email, plan, sub_id, session, until, created) VALUES (?, ?, 'annuel', 'sub_456', 'cs_a', ?, ?)").run("ab".repeat(20), em.toLowerCase(), Date.now() - DAY, Date.now());
    sql.prepare("UPDATE comptes SET premium = NULL WHERE id = ?").run(rowB.id);
    [s, j] = await E("POST", "/api/espace/supprimer", { motdepasse: "motdepasse-de-b" }, B); ok(s === 409 && j.abonnement, "suppression refusée : abonnement annuel actif, payé avec la même adresse, même échu " + s);
    sql.prepare("DELETE FROM abonnes WHERE sub_id = 'sub_456'").run(); }
  delete env.STRIPE_SECRET; globalThis.STRIPE_ANNULE = false; sql.prepare("UPDATE comptes SET premium = ? WHERE id = ?").run(avant, rowB.id);
}
[s, j, sc] = await E("POST", "/api/espace/supprimer", { motdepasse: "motdepasse-de-b" }, B); ok(s === 200 && /Max-Age=0/.test(sc), "compte supprimé");
const left = ["comptes WHERE id", "sessions WHERE compte", "donnees WHERE compte", "bilans WHERE compte", "notifs WHERE compte"].map(t => sql.prepare(`SELECT COUNT(*) AS n FROM ${t} = ?`).get(rowB.id).n);
ok(left.every(n => n === 0), "plus aucune ligne pour ce compte " + left);
[s] = await E("POST", "/api/espace/connexion", { email: "b@ex.fr", motdepasse: "motdepasse-de-b" }); ok(s === 401, "compte supprimé : connexion impossible");
// 7/11 : compte propriétaire (variable PROPRIETAIRES) : Premium sans paiement, vu par /moi, par le navigateur (jeton) et par le rapport
{ env.PROPRIETAIRES = "Proprio@Ex.fr, autre@ex.fr";
  let [s1, j1, sc1] = await E("POST", "/api/espace/inscription", { email: "proprio@ex.fr", motdepasse: "motdepasse-proprio" }); ok(s1 === 200, "propriétaire : inscription " + s1);
  const ck = cookieOf(sc1); [s1, j1] = await E("GET", "/api/espace/moi", null, ck);
  ok(j1.premium === true && j1.plan === "proprietaire" && /^[a-f0-9]{64}$/.test(j1.jeton || ""), "propriétaire : Premium dans /moi " + JSON.stringify({ p: j1.premium, plan: j1.plan }));
  const p1 = await premiumOf(req("GET", "/", null, { "x-bilan-token": j1.jeton }), env); ok(p1 && p1.plan === "proprietaire", "propriétaire : le jeton du navigateur est reconnu");
  const sav = env.ADMIN_KEY; env.ADMIN_KEY = "autre-cle"; const p2 = await premiumOf(req("GET", "/", null, { "x-bilan-token": j1.jeton }), env); ok(!p2, "propriétaire : jeton refusé si la clé secrète change"); env.ADMIN_KEY = sav;
  [s1, j1, sc1] = await E("POST", "/api/espace/inscription", { email: "pas-proprio@ex.fr", motdepasse: "motdepasse-autre" }); [s1, j1] = await E("GET", "/api/espace/moi", null, cookieOf(sc1)); ok(!j1.premium && !j1.jeton, "autre compte : pas de Premium");
  delete env.PROPRIETAIRES; }
console.log(fails ? fails + " échec(s)" : "espace : tout est bon");
process.exit(fails ? 1 : 0);
