// Premium, routes de l'ancienne IA du serveur (retirées) et envois d'e-mails, testés sur une base SQLite en mémoire et des services simulés.
import { DatabaseSync } from "node:sqlite";
import * as compte from "../cf/src/compte.mjs";
import { veille } from "../cf/src/veille.mjs";
import worker from "../cf/src/worker.mjs";
const { premium, sendMail, mailCapacity } = compte;
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
let sent = [];
const env = { DB: { prepare: q => stmt(q) }, ADMIN_KEY: "k", MAIL_FROM: "bilan@exemple.fr", BREVO_KEY: "b", RESEND_KEY: "r", STRIPE_SECRET: "sk_test",
  ASSETS: { fetch: async req => { const p = new URL(req.url).pathname; const d = { "/data/univers.json": { companies: [{ id: "lvmh", name: "LVMH" }] }, "/data/etf.json": { list: [] }, "/data/actu-analyse.json": { items: {} }, "/data/agenda.json": { events: [] }, "/data/agenda-auto.json": { events: [] }, "/data/semaine.json": { items: { "c:lvmh": 500 } } }[p]; return new Response(JSON.stringify(d || {})); } } };
globalThis.caches = { default: { match: async () => new Response(JSON.stringify({ items: { "c:lvmh": { p: 550, chg: 6 } } })), put: async () => { } } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes("brevo")) { sent.push(["brevo", JSON.parse(o.body).to[0].email, JSON.parse(o.body).subject]); return new Response("{}", { status: 201 }); }
  if (u.includes("resend")) { sent.push(["resend", JSON.parse(o.body).to]); return new Response("{}"); }
  if (u.includes("checkout/sessions/cs_ok")) return new Response(JSON.stringify({ status: "complete", payment_status: "paid", mode: "payment", customer_details: { email: "Client@Ex.fr" } }));
  if (u.includes("checkout/sessions/cs_wait")) return new Response(JSON.stringify({ status: "open", payment_status: "unpaid" }));
  return realFetch(u, o); };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("ÉCHEC", m); } };
const req = (method, path, body, h = {}) => new Request("https://t.local" + path, { method, headers: { "content-type": "application/json", "cf-connecting-ip": "1.1.1.1", ...h }, body: body ? JSON.stringify(body) : undefined });
const J = async r => [r.status, await r.json()];

// Offres et activation
let [s, j] = await J(await premium(req("GET", "/api/premium/offres"), env)); ok(s === 200 && !("limites" in j) && !("quota" in compte) && !("LIMITS" in compte), "offres sans quotas d'IA");
[s, j] = await J(await premium(req("GET", "/api/premium/activer?session_id=cs_wait"), env)); ok(s === 402, "paiement non confirmé refusé");
[s, j] = await J(await premium(req("GET", "/api/premium/activer?session_id=cs_ok"), env)); ok(s === 200 && j.token && j.plan === "unique", "activation " + JSON.stringify(j));
const tok = j.token;
[s, j] = await J(await premium(req("GET", "/api/premium/activer?session_id=cs_ok"), env)); ok(j.token === tok, "activation rejouée : même code");
[s, j] = await J(await premium(req("GET", "/api/premium/statut", null, { "x-bilan-token": tok }), env)); ok(j.premium && j.until < Date.now() + 370 * 864e5 && j.email === "c…@ex.fr", "statut premium 12 mois " + JSON.stringify(j));
[s, j] = await J(await premium(req("GET", "/api/premium/statut", null, { "x-bilan-token": "abcdef" }), env)); ok(!j.premium, "code inconnu");

// L'IA du serveur est retirée : ses anciennes routes répondent 410 avec un message clair, sans appeler de modèle
for (const [m, u] of [["POST", "/api/assistant"], ["POST", "/api/demande"], ["GET", "/api/resume?u=https://www.sec.gov/x"], ["GET", "/api/actu/clair?id=lvmh&k=a"], ["GET", "/api/ia/etat"]]) {
  [s, j] = await J(await worker.fetch(req(m, u, m === "POST" ? { question: "Question de test ?" } : null), env, { waitUntil() { } })); ok(s === 410 && /connectez votre IA/.test(j.error) && j.ia_serveur === false, "route retirée " + u + " " + s);
}
[s, j] = await J(await veille(req("POST", "/api/veille", { faits: {} }), env)); ok(s === 410 && /connectez votre IA/.test(j.error), "bilan rédigé retiré du serveur");

// Inscription, confirmation, envoi hebdomadaire, alertes
[s, j] = await J(await veille(req("POST", "/api/veille/inscription", { email: "a@ex.fr", ids: ["c:lvmh"] }, { "x-bilan-token": tok }), env)); ok(s === 200, "inscription " + JSON.stringify(j));
const t = sql.prepare("SELECT token, alertes FROM veille WHERE email = 'a@ex.fr'").get();
ok(t.alertes === 1, "alertes activées pour Premium");
let r = await veille(req("GET", "/api/veille/confirmer?t=" + t.token), env); ok((await r.text()).includes("confirmée"), "confirmation");
[s] = await J(await veille(req("POST", "/api/veille/envoi"), env)); ok(s === 403, "envoi protégé");
[s, j] = await J(await veille(req("POST", "/api/veille/envoi", null, { "x-admin-key": "k" }), env)); ok(s === 200 && j.envoyes === 1 && j.reste === 0, "bilan envoyé " + JSON.stringify(j));
ok(sent.some(x => x[2] && /\+10,0 %/.test(x[2])), "objet avec la variation de la semaine " + JSON.stringify(sent));
[s, j] = await J(await veille(req("POST", "/api/veille/envoi", null, { "x-admin-key": "k" }), env)); ok(j.envoyes === 0, "pas de doublon dans la semaine");
[s, j] = await J(await veille(req("POST", "/api/veille/alertes", null, { "x-admin-key": "k" }), env)); ok(j.envoyes === 1, "alerte sur une variation de 6 % " + JSON.stringify(j));
[s, j] = await J(await veille(req("POST", "/api/veille/alertes", null, { "x-admin-key": "k" }), env)); ok(j.envoyes === 0, "une alerte par soir au plus");

// Rotation des services : Brevo puis Resend
sql.prepare("INSERT OR REPLACE INTO mail_compte VALUES ('brevo', ?, 290)").run(new Date().toISOString().slice(0, 10));
ok(await mailCapacity(env) === 95, "capacité restante");
ok(await sendMail(env, "x@ex.fr", "s", "t") === "resend", "bascule sur Resend quand Brevo est plein");
console.log(fails ? fails + " échec(s)" : "compte : tout est bon");
process.exit(fails ? 1 : 0);
