// Comptes Premium (paiement Stripe), envoi d'e-mails sur plusieurs services gratuits.
// Réglages Cloudflare (Paramètres > Variables et secrets) :
//   STRIPE_SECRET (secret)            clé secrète Stripe, pour vérifier les paiements
//   STRIPE_LINK_MENSUEL, STRIPE_LINK_UNIQUE (texte)   liens de paiement Stripe (Payment Links)
//   MAIL_FROM (texte)                 adresse d'envoi sur votre domaine, ex. bilan@votre-domaine.fr
//   BREVO_KEY, MAILJET_KEY + MAILJET_SECRET, RESEND_KEY (secrets)   un ou plusieurs services d'envoi
//   ADMIN_KEY (secret)                clé du robot pour déclencher les envois
//   PRIX_MENSUEL, PRIX_UNIQUE (texte)  prix affichés sur la page Premium, ex. « 4,90 € par mois »
//   HASH_SALT (secret, facultatif)     sel de l'empreinte anonyme des visiteurs
export const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS abonnes (token TEXT PRIMARY KEY, email TEXT, plan TEXT NOT NULL, sub_id TEXT, session TEXT UNIQUE, until INTEGER NOT NULL, created INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS ab_email ON abonnes (email)`,
  `CREATE TABLE IF NOT EXISTS mail_compte (fournisseur TEXT NOT NULL, jour TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (fournisseur, jour))`,
];
let ready = false;
export async function initCompte(db) { if (ready) return; for (const q of SCHEMA) await db.prepare(q).run(); ready = true; }
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Qui est le visiteur ? (empreinte anonyme du jour, ou abonné) ---------- */
export async function visitor(request, env = {}) { // empreinte pseudonyme : change chaque jour, salée, jamais l'adresse IP en clair
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + today() + "|" + (env.HASH_SALT || "bilan-sel-2026")));
  return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}
/* ---------- Compte connecté (cookie de session bilan_s, voir espace.mjs) ---------- */
export const sha256hex = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
export const cookieSession = request => { const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)bilan_s=([a-f0-9]{64})(?:;|$)/); return m ? m[1] : null; };
const SESS = new WeakMap(); // une seule lecture de la session par requête
export function sessionCompte(request, env) {
  if (!env || !env.DB) return Promise.resolve(null);
  if (!SESS.has(request)) SESS.set(request, (async () => {
    const t = cookieSession(request); if (!t) return null;
    try { return (await env.DB.prepare(`SELECT c.* FROM sessions s JOIN comptes c ON c.id = s.compte WHERE s.h = ? AND s.expires > ?`).bind(await sha256hex(t), Date.now()).first()) || null; }
    catch (e) { return null; } // tables pas encore créées
  })());
  return SESS.get(request);
}
export async function premiumOf(request, env) {
  if (!env || !env.DB) return null;
  let t = (request.headers.get("x-bilan-token") || "").replace(/[^a-f0-9]/g, "").slice(0, 64);
  if (!t) { const c = await sessionCompte(request, env); t = (c && c.premium) || ""; } // Premium rattaché au compte : actif sur tous les appareils
  if (!t) return null;
  await initCompte(env.DB);
  let a = await env.DB.prepare(`SELECT * FROM abonnes WHERE token = ?`).bind(t).first();
  if (!a) return null;
  if (a.until < Date.now() && a.sub_id && env.STRIPE_SECRET) { // abonnement mensuel : on vérifie qu'il est toujours actif
    try { const s = await stripe(env, `subscriptions/${a.sub_id}`);
      if (["active", "trialing", "past_due"].includes(s.status)) { const until = s.current_period_end * 1000 + 3 * 864e5; await env.DB.prepare(`UPDATE abonnes SET until = ? WHERE token = ?`).bind(until, t).run(); a = { ...a, until }; } } catch (e) { }
  }
  return a.until > Date.now() ? a : null;
}
/* ---------- Stripe ---------- */
async function stripe(env, path) {
  const r = await fetch("https://api.stripe.com/v1/" + path, { headers: { authorization: "Bearer " + env.STRIPE_SECRET } });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || "Stripe " + r.status); return j;
}
const newToken = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
export async function premium(request, env) {
  if (!env || !env.DB) return json({ error: "Indisponible pour le moment." }, 503);
  await initCompte(env.DB);
  const url = new URL(request.url), path = url.pathname;
  if (path === "/api/premium/offres") return json({ mensuel: env.STRIPE_LINK_MENSUEL || null, unique: env.STRIPE_LINK_UNIQUE || null, prix_mensuel: env.PRIX_MENSUEL || null, prix_unique: env.PRIX_UNIQUE || null, mail: !!(env.MAIL_FROM && (env.BREVO_KEY || env.MAILJET_KEY || env.RESEND_KEY)) });
  if (path === "/api/premium/statut") { const p = await premiumOf(request, env); return json(p ? { premium: true, plan: p.plan, until: p.until, email: p.email ? p.email.replace(/^(.).*(@.*)$/, "$1…$2") : null } : { premium: false }); }
  if (path === "/api/premium/activer") { // retour de Stripe après paiement : ?session_id=cs_…
    if (!env.STRIPE_SECRET) return json({ error: "Le paiement n'est pas encore configuré." }, 503);
    const sid = (url.searchParams.get("session_id") || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 200);
    if (!sid.startsWith("cs_")) return json({ error: "Paiement introuvable." }, 400);
    const old = await env.DB.prepare(`SELECT token FROM abonnes WHERE session = ?`).bind(sid).first();
    if (old) return json({ token: old.token });
    try {
      const s = await stripe(env, `checkout/sessions/${sid}`);
      if (!(s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required"))) return json({ error: "Le paiement n'est pas encore confirmé. Réessayez dans une minute." }, 402);
      let plan = "unique", until = Date.now() + 368 * 864e5, sub = null; // paiement unique : 12 mois d'accès
      if (s.mode === "subscription" && s.subscription) { sub = typeof s.subscription === "string" ? s.subscription : s.subscription.id; const so = await stripe(env, `subscriptions/${sub}`); plan = "mensuel"; until = so.current_period_end * 1000 + 3 * 864e5; }
      const token = newToken(), email = (s.customer_details && s.customer_details.email) || s.customer_email || null;
      await env.DB.prepare(`INSERT INTO abonnes (token, email, plan, sub_id, session, until, created) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(token, email && email.toLowerCase(), plan, sub, sid, until, Date.now()).run();
      return json({ token, plan });
    } catch (e) { return json({ error: "Vérification du paiement impossible : " + String(e.message).slice(0, 100) }, 502); }
  }
  if (path === "/api/premium/retrouver" && request.method === "POST") { // renvoie le code d'accès à l'adresse utilisée pour payer
    let b = {}; try { b = await request.json(); } catch (e) { }
    const email = String(b.email || "").trim().toLowerCase();
    const rows = (await env.DB.prepare(`SELECT token, plan FROM abonnes WHERE email = ? AND until > ?`).bind(email, Date.now()).all()).results || [];
    if (rows.length) { try { await sendMail(env, email, "Votre code d'accès bilan. Premium", `Bonjour,\n\nVoici votre code d'accès Premium : ${rows[0].token}\n\nSur le site, ouvrez la page Premium et collez ce code dans « J'ai déjà un code ».\n\nbilan.`); } catch (e) { return json({ error: "L'envoi d'e-mail n'est pas encore disponible : écrivez-nous pour retrouver votre accès." }, 503); } }
    return json({ ok: true }); // même réponse si l'adresse est inconnue : on ne révèle pas qui est abonné
  }
  if (path === "/api/premium/portail") { // gérer ou résilier son abonnement (portail client Stripe)
    const p = await premiumOf(request, env); if (!p || !p.sub_id || !env.STRIPE_SECRET) return json({ error: "Aucun abonnement mensuel actif." }, 400);
    try { const sub = await stripe(env, `subscriptions/${p.sub_id}`);
      const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", { method: "POST", headers: { authorization: "Bearer " + env.STRIPE_SECRET, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ customer: sub.customer, return_url: url.origin + "/premium" }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message); return json({ url: j.url });
    } catch (e) { return json({ error: "Portail indisponible : " + String(e.message).slice(0, 100) }, 502); }
  }
  return json({ error: "Introuvable." }, 404);
}

/* ---------- E-mails : plusieurs services gratuits utilisés à tour de rôle ---------- */
// Brevo 300/jour, Mailjet 200/jour, Resend 100/jour : environ 600 e-mails par jour sans payer, soit plus de 4 000 bilans par semaine.
const PROVIDERS = [
  ["brevo", env => env.BREVO_KEY, 290, async (env, to, subject, text, html) => fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env.BREVO_KEY, "content-type": "application/json" }, body: JSON.stringify({ sender: { email: env.MAIL_FROM, name: "bilan." }, to: [{ email: to }], subject, textContent: text, htmlContent: html || undefined }) })],
  ["mailjet", env => env.MAILJET_KEY && env.MAILJET_SECRET, 195, async (env, to, subject, text, html) => fetch("https://api.mailjet.com/v3.1/send", { method: "POST", headers: { authorization: "Basic " + btoa(env.MAILJET_KEY + ":" + env.MAILJET_SECRET), "content-type": "application/json" }, body: JSON.stringify({ Messages: [{ From: { Email: env.MAIL_FROM, Name: "bilan." }, To: [{ Email: to }], Subject: subject, TextPart: text, HTMLPart: html || undefined }] }) })],
  ["resend", env => env.RESEND_KEY, 95, async (env, to, subject, text, html) => fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + env.RESEND_KEY, "content-type": "application/json" }, body: JSON.stringify({ from: `bilan. <${env.MAIL_FROM}>`, to, subject, text, html: html || undefined }) })],
];
export const mailReady = env => !!(env.MAIL_FROM && PROVIDERS.some(([, on]) => on(env)));
export async function mailCapacity(env) {
  await initCompte(env.DB); let left = 0;
  for (const [name, on, max] of PROVIDERS) { if (!on(env)) continue; const r = await env.DB.prepare(`SELECT n FROM mail_compte WHERE fournisseur = ? AND jour = ?`).bind(name, today()).first(); left += Math.max(0, max - (r ? r.n : 0)); }
  return left;
}
export async function sendMail(env, to, subject, text, html = "") {
  if (!mailReady(env)) throw new Error("envoi non configuré");
  await initCompte(env.DB);
  for (const [name, on, max, send] of PROVIDERS) {
    if (!on(env)) continue;
    const r = await env.DB.prepare(`SELECT n FROM mail_compte WHERE fournisseur = ? AND jour = ?`).bind(name, today()).first();
    if (r && r.n >= max) continue;
    const res = await send(env, to, subject, text, html);
    if (!res.ok) continue; // service en panne ou quota atteint chez lui : on passe au suivant
    await env.DB.prepare(`INSERT INTO mail_compte (fournisseur, jour, n) VALUES (?, ?, 1) ON CONFLICT (fournisseur, jour) DO UPDATE SET n = n + 1`).bind(name, today()).run();
    return name;
  }
  throw new Error("quota d'envoi du jour atteint");
}
