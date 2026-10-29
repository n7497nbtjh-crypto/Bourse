// Premium, routes de l'ancienne IA du serveur (retirées) et envois d'e-mails, testés sur une base SQLite en mémoire et des services simulés.
import { DatabaseSync } from "node:sqlite";
import * as compte from "../cf/src/compte.mjs";
import { veille } from "../cf/src/veille.mjs";
import worker from "../cf/src/worker.mjs";
const { premium, sendMail, mailCapacity } = compte;
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
let sent = [];
const env = { DB: { prepare: q => stmt(q), batch: async l => Promise.all(l.map(s => s.all())) }, ADMIN_KEY: "k", MAIL_FROM: "bilan@exemple.fr", BREVO_KEY: "b", RESEND_KEY: "r", STRIPE_SECRET: "sk_test",
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

// Anciennes routes de l'IA : 410 avec un message clair, sans appeler de modèle
for (const [m, u] of [["POST", "/api/assistant"], ["POST", "/api/demande"], ["GET", "/api/resume?u=https://www.sec.gov/x"], ["GET", "/api/actu/clair?id=lvmh&k=a"]]) {
  [s, j] = await J(await worker.fetch(req(m, u, m === "POST" ? { question: "Question de test ?" } : null), env, { waitUntil() { } })); ok(s === 410 && /panneau ✦/.test(j.error) && j.ia_serveur === false, "route retirée " + u + " " + s);
}
// L'IA du site (cf/src/iasite.mjs) : Workers AI simulé, plafonds par visiteur et pour le site, consignes du serveur
{
  const W = (m, u, b) => worker.fetch(req(m, u, b), envIA, { waitUntil() { } });
  let appels = [];
  const envIA = { ...env, IA_QUESTIONS_JOUR: "3", AI: { run: async (model, o) => { appels.push({ model, o }); return { response: "<think>x</think>Réponse de test rédigée par le modèle du site.", usage: { prompt_tokens: 1000, completion_tokens: 200 } }; } } };
  [s, j] = await J(await worker.fetch(req("GET", "/api/ia/etat"), env, { waitUntil() { } })); ok(s === 200 && j.disponible === false, "sans liaison AI : indisponible " + JSON.stringify(j));
  [s, j] = await J(await W("GET", "/api/ia/etat")); ok(s === 200 && j.disponible === true && j.reste_visiteur === 3, "état " + JSON.stringify(j));
  [s, j] = await J(await W("POST", "/api/ia/rediger", { tache: "assistant", user: "Faits : {} Question : que fait LVMH ?" }));
  ok(s === 200 && j.txt === "Réponse de test rédigée par le modèle du site." && j.modele === "Qwen3 30B", "réponse rédigée " + JSON.stringify(j));
  ok(appels[0].model === "@cf/qwen/qwen3-30b-a3b-fp8" && appels[0].o.messages[0].content.includes("Règles d'objectivité") && appels[0].o.max_tokens <= 900, "consignes du serveur, modèle économe d'abord");
  [s, j] = await J(await W("POST", "/api/ia/rediger", { tache: "pirate", user: "x" })); ok(s === 400, "tâche inconnue refusée");
  await W("POST", "/api/ia/rediger", { tache: "expliquer", user: "C'est quoi un ETF ?" }); await W("POST", "/api/ia/rediger", { tache: "expliquer", user: "C'est quoi un ETF ?" });
  [s, j] = await J(await W("POST", "/api/ia/rediger", { tache: "expliquer", user: "Encore ?" })); ok(s === 429 && j.limite === "visiteur" && appels.length === 3, "plafond par visiteur " + JSON.stringify(j));
  sql.exec(`UPDATE ia_neurones SET n = 9000`);
  [s, j] = await J(await W("POST", "/api/ia/rediger", { tache: "expliquer", user: "Autre visiteur" }, ));
  const r2 = await worker.fetch(new Request("https://t.local/api/ia/rediger", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "2.2.2.2" }, body: JSON.stringify({ tache: "expliquer", user: "Autre visiteur" }) }), envIA, { waitUntil() { } });
  const j2 = await r2.json(); ok(r2.status === 429 && j2.limite === "site" && appels.length === 3, "plafond du site : plus aucun appel au modèle " + JSON.stringify(j2));
  // Premium : passe malgré le plafond du site, et a son propre plafond (150)
  const rp = await worker.fetch(req("POST", "/api/ia/rediger", { tache: "expliquer", user: "Question Premium" }, { "x-bilan-token": tok }), envIA, { waitUntil() { } });
  const jp = await rp.json(); ok(rp.status === 200 && jp.txt && appels.length === 4, "Premium répond malgré le plafond du site " + JSON.stringify(jp).slice(0, 80));
  const ep = await (await worker.fetch(req("GET", "/api/ia/etat", null, { "x-bilan-token": tok }), envIA, { waitUntil() { } })).json();
  ok(ep.niveau === "premium" && ep.plafond_visiteur === 150 && ep.reste_visiteur === 149 && ep.site_epuise === false, "état Premium " + JSON.stringify(ep));
  // Budget mensuel : avec 1 € de budget, un gratuit repasse (99 000 neurones de marge)
  const envB = { ...envIA, IA_BUDGET_MOIS: "1" };
  const rb = await worker.fetch(new Request("https://t.local/api/ia/rediger", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "3.3.3.3" }, body: JSON.stringify({ tache: "expliquer", user: "Avec budget" }) }), envB, { waitUntil() { } });
  ok(rb.status === 200 && appels.length === 5, "budget mensuel : le gratuit repasse au-delà de la part gratuite du jour");
  sql.exec(`UPDATE ia_neurones SET n = 10000 + 99000`);
  const rc = await worker.fetch(new Request("https://t.local/api/ia/rediger", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "4.4.4.4" }, body: JSON.stringify({ tache: "expliquer", user: "Budget épuisé" }) }), envB, { waitUntil() { } });
  const jc = await rc.json(); ok(rc.status === 429 && jc.limite === "site" && /budget du mois/.test(jc.message) && appels.length === 5, "budget mensuel épuisé : arrêt pour les gratuits " + jc.message);
}
[s, j] = await J(await veille(req("POST", "/api/veille", { faits: {} }), env)); ok(s === 410 && /IA du site/.test(j.error), "bilan rédigé retiré du serveur");

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
