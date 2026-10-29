// Notifications push (Web Push standard) pour les comptes de « Mon espace ».
// Les clés VAPID ne sont manipulées par personne : le Worker crée la paire au premier besoin (WebCrypto ECDSA P-256),
// garde la clé privée dans D1 (table push_vapid) et ne publie que la clé publique.
//  GET  /api/push/cle            clé publique VAPID, pour PushManager.subscribe()
//  POST /api/push/abonnement     { abonnement: PushSubscription.toJSON(), choix: { annonces, dividendes, mouvements, bilan }, ancien? }
//  POST /api/push/etat           { endpoint } : cet appareil est-il abonné, avec quels choix
//  POST /api/push/desabonnement  { endpoint }
//  POST /api/push/essai          { endpoint } : une notification d'essai sur cet appareil
// Envoi : pousser() est appelé après la tâche du soir (/api/espace/tache, .github/workflows/espace.yml) et envoie
// les notifications du site pas encore poussées, selon les choix de chaque appareil. Abonnements expirés (404, 410) supprimés.
// Chiffrement du message : aes128gcm (RFC 8188 et RFC 8291). Jeton VAPID : JWT ES256 (RFC 8292). WebCrypto seulement.
import { json, sessionCompte } from "./compte.mjs";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS push_vapid (id INTEGER PRIMARY KEY CHECK (id = 1), public TEXT NOT NULL, prive TEXT NOT NULL, created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS push_abonnements (endpoint TEXT PRIMARY KEY, compte TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, choix TEXT NOT NULL, appareil TEXT, created INTEGER NOT NULL, last_ok INTEGER, echecs INTEGER NOT NULL DEFAULT 0, essai INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS push_ab_compte ON push_abonnements (compte)`,
  `CREATE TABLE IF NOT EXISTS push_envois (notif INTEGER PRIMARY KEY, at INTEGER NOT NULL)`,
];
let ready = false;
async function init(db) { if (ready) return; for (const q of SCHEMA) await db.prepare(q).run(); ready = true; }

/* ---------- Outils binaires ---------- */
const TE = s => new TextEncoder().encode(s);
export const b64u = u8 => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const concat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hkdf(salt, ikm, info, n) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, n * 8));
}

/* ---------- Chiffrement du message (RFC 8291, codage aes128gcm de la RFC 8188, un seul enregistrement) ---------- */
// p256dh : clé publique de l'appareil (65 octets, non compressée) ; auth : secret de 16 octets ; texte : contenu en clair.
// opts.salt et opts.cles (paire ECDH éphémère) ne servent qu'aux tests : sinon tirés au hasard à chaque message.
export const MAX_CLAIR = 3800; // le corps chiffré doit tenir dans 4 096 octets
export async function chiffrer(p256dh, auth, texte, opts = {}) {
  const ua = typeof p256dh === "string" ? unb64u(p256dh) : p256dh, secret = typeof auth === "string" ? unb64u(auth) : auth;
  if (ua.length !== 65 || ua[0] !== 4) throw new Error("clé p256dh invalide");
  if (secret.length !== 16) throw new Error("secret auth invalide");
  const clair = typeof texte === "string" ? TE(texte) : texte;
  if (clair.length > MAX_CLAIR) throw new Error("message trop long");
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  const as = opts.cles || await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(secret, ecdh, concat(TE("WebPush: info\0"), ua, asPub), 32);
  const cek = await hkdf(salt, ikm, TE("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, TE("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(clair, new Uint8Array([2])))); // 0x02 : dernier enregistrement
  const tete = new Uint8Array(21); tete.set(salt, 0); new DataView(tete.buffer).setUint32(16, 4096); tete[20] = 65;
  return concat(tete, asPub, ct);
}

/* ---------- Jeton VAPID (RFC 8292) ---------- */
export async function jetonVapid(privateKey, aud, sub, exp) {
  const h = b64u(TE(JSON.stringify({ typ: "JWT", alg: "ES256" }))), c = b64u(TE(JSON.stringify({ aud, exp, sub })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, TE(h + "." + c))); // r || s, 64 octets
  return h + "." + c + "." + b64u(sig);
}
let VAPID = null; // { public, privateKey, at } gardé une heure par instance du Worker
const JETONS = new Map(); // jetons signés par service de push (aud), réutilisés tant qu'ils ont plus d'une heure de validité
export async function clesVapid(env) {
  if (VAPID && Date.now() - VAPID.at < 36e5) return VAPID;
  await init(env.DB);
  let row = await env.DB.prepare(`SELECT public, prive FROM push_vapid WHERE id = 1`).first();
  if (!row) { // premier besoin : la paire est créée ici, jamais saisie ni vue par personne
    const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pub = b64u(new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey))), jwk = await crypto.subtle.exportKey("jwk", k.privateKey);
    await env.DB.prepare(`INSERT OR IGNORE INTO push_vapid (id, public, prive, created) VALUES (1, ?, ?, ?)`).bind(pub, JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }), Date.now()).run();
    row = await env.DB.prepare(`SELECT public, prive FROM push_vapid WHERE id = 1`).first(); // deux créations simultanées : la première enregistrée gagne
  }
  const privateKey = await crypto.subtle.importKey("jwk", { ...JSON.parse(row.prive), ext: false, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  if (!VAPID || VAPID.public !== row.public) JETONS.clear();
  return VAPID = { public: row.public, privateKey, at: Date.now() };
}

/* ---------- Abonnements ---------- */
// Services de push des navigateurs : on n'envoie qu'à eux (pas de requête vers une adresse quelconque).
const HOTES = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
export function endpointOk(e) {
  if (typeof e !== "string" || e.length > 1024) return false;
  try { const u = new URL(e); return u.protocol === "https:" && !u.port && !u.username && !u.password && HOTES.some(h => h.test(u.hostname)); } catch (x) { return false; }
}
const cleOk = (s, n) => { try { const u = unb64u(s); return u.length === n && (n !== 65 || u[0] === 4); } catch (e) { return false; } };
export const CHOIX = { annonces: "Résultats, annonces et assemblées de vos entreprises", dividendes: "Dividendes : la veille du détachement", mouvements: "Mouvement de plus de 5 % en une séance", bilan: "Votre bilan de la semaine, le samedi matin" };
const normChoix = (c, base) => { const o = {}; for (const k of Object.keys(CHOIX)) o[k] = c && typeof c[k] === "boolean" ? c[k] : base && typeof base[k] === "boolean" ? base[k] : true; return o; };
const parse = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } };
const MAX_APPAREILS = 10;
function appareil(ua = "") {
  const nav = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${nav} sur ${os}` : nav;
}

/* ---------- Envoi d'un message à un appareil ---------- */
let envoi = (u, o) => fetch(u, o); // remplaçable dans les tests
export function _envoi(f) { envoi = f || ((u, o) => fetch(u, o)); }
const contact = (env, origin) => { const s = String(env.SITE_URL || origin || "https://repere-bourse.pages.dev").replace(/\/+$/, ""); return /^https:\/\//.test(s) ? s : "https://repere-bourse.pages.dev"; };
export async function envoyer(env, ab, message, { origin, ttl = 43200, urgence = "normal" } = {}) {
  const v = await clesVapid(env), aud = new URL(ab.endpoint).origin, now = Math.floor(Date.now() / 1000);
  let j = JETONS.get(aud);
  if (!j || j.exp - now < 3600) { j = { exp: now + 12 * 3600 }; j.t = await jetonVapid(v.privateKey, aud, contact(env, origin), j.exp); JETONS.set(aud, j); }
  const body = await chiffrer(ab.p256dh, ab.auth, JSON.stringify(message));
  const r = await envoi(ab.endpoint, { method: "POST", body, headers: { authorization: `vapid t=${j.t}, k=${v.public}`, "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: String(ttl), urgency: urgence } });
  return r.status;
}

/* ---------- Ce qu'affiche la notification ---------- */
// Types des notifications du site (espace.mjs) : annonce, resultats, agenda, mouvement, bilan.
export const categorie = n => n.type === "mouvement" ? "mouvements" : n.type === "bilan" ? "bilan" : n.type === "agenda" && /dividende/i.test(n.texte || "") ? "dividendes" : "annonces";
const court = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
export function message(ns) {
  if (ns.length === 1) {
    const n = ns[0], t = String(n.texte || ""), i = t.indexOf(" : ");
    if (n.type === "bilan") return { t: "Votre bilan de la semaine est prêt", b: "Les mouvements de vos entreprises, leurs annonces et les dates à venir, en une page.", u: n.lien || "/espace", tag: "bilan-semaine", ts: n.at };
    const nom = i > 0 && i < 80 ? t.slice(0, i) : "bilan.", reste = i > 0 && i < 80 ? t.slice(i + 3) : t;
    const quoi = { annonce: "nouvelle publication", resultats: "résultats demain", mouvement: "mouvement du jour" }[n.type] || (categorie(n) === "dividendes" ? "dividende demain" : "demain");
    return { t: court(`${nom} · ${quoi}`, 90), b: court(reste, 240), u: n.lien || "/espace/alertes", tag: "bilan-" + n.id, ts: n.at };
  }
  return { t: `${ns.length} nouvelles alertes sur vos entreprises`, b: court(ns.slice(0, 3).map(n => n.texte).join("\n"), 300), u: "/espace/alertes", tag: "bilan-alertes", ts: ns[ns.length - 1].at };
}

/* ---------- Envoi groupé après la tâche du soir ---------- */
const FENETRE = 36 * 36e5; // une notification plus vieille que 36 h n'est plus poussée
async function resultat(env, ab, s) { // 2xx : bon ; 404 et 410 : abonnement expiré ; autre : échec compté (5 de suite : supprimé)
  if (s >= 200 && s < 300) { await env.DB.prepare(`UPDATE push_abonnements SET last_ok = ?, echecs = 0 WHERE endpoint = ?`).bind(Date.now(), ab.endpoint).run(); return "ok"; }
  if (s === 404 || s === 410 || (ab.echecs || 0) >= 4) { await env.DB.prepare(`DELETE FROM push_abonnements WHERE endpoint = ?`).bind(ab.endpoint).run(); return "supprime"; }
  await env.DB.prepare(`UPDATE push_abonnements SET echecs = echecs + 1 WHERE endpoint = ?`).bind(ab.endpoint).run(); return "erreur";
}
export async function pousser(env, { origin, budget = 30 } = {}) {
  if (!env || !env.DB) return { envoyes: 0, reste: false };
  await init(env.DB);
  const now = Date.now();
  let rows;
  try {
    rows = (await env.DB.prepare(`SELECT n.id, n.compte, n.at, n.type, n.texte, n.lien FROM notifs n WHERE n.at > ? AND n.compte IN (SELECT compte FROM push_abonnements) AND NOT EXISTS (SELECT 1 FROM push_envois e WHERE e.notif = n.id) ORDER BY n.id LIMIT 400`).bind(now - FENETRE).all()).results || [];
  } catch (e) { return { envoyes: 0, reste: false }; } // tables de l'espace pas encore créées
  if (!rows.length) {
    if (budget > 0) { // ménage : envois de plus de 7 jours, appareils de comptes supprimés
      await env.DB.prepare(`DELETE FROM push_envois WHERE at < ?`).bind(now - 7 * 864e5).run();
      try { await env.DB.prepare(`DELETE FROM push_abonnements WHERE compte NOT IN (SELECT id FROM comptes)`).run(); } catch (e) { }
    }
    return { envoyes: 0, reste: false };
  }
  if (budget <= 0) return { envoyes: 0, reste: true, en_attente: rows.length };
  const comptes = [...new Set(rows.map(r => r.compte))], abos = [];
  for (let i = 0; i < comptes.length; i += 50) { const part = comptes.slice(i, i + 50);
    abos.push(...((await env.DB.prepare(`SELECT * FROM push_abonnements WHERE compte IN (${part.map(() => "?").join(",")})`).bind(...part).all()).results || [])); }
  let envoyes = 0, supprimes = 0, erreurs = 0, utilise = 0; const faits = [];
  for (const c of comptes) {
    const ns = rows.filter(r => r.compte === c);
    const jobs = abos.filter(a => a.compte === c).map(a => { const ch = normChoix(parse(a.choix, {})); const sel = ns.filter(n => n.at >= a.created - 6e4 && ch[categorie(n)]); return sel.length ? [a, sel] : null; }).filter(Boolean);
    if (utilise > 0 && utilise + jobs.length > budget) break; // la suite au prochain appel de la tâche
    utilise += jobs.length;
    const res = await Promise.all(jobs.map(([a, sel]) => envoyer(env, a, message(sel), { origin, ttl: sel.some(n => n.type === "bilan") ? 172800 : 43200 }).catch(() => 0).then(s => resultat(env, a, s))));
    for (const r of res) { if (r === "ok") envoyes++; else if (r === "supprime") supprimes++; else erreurs++; }
    faits.push(...ns.map(n => n.id));
  }
  for (let i = 0; i < faits.length; i += 40) { const part = faits.slice(i, i + 40);
    await env.DB.prepare(`INSERT OR IGNORE INTO push_envois (notif, at) VALUES ${part.map(() => "(?, ?)").join(", ")}`).bind(...part.flatMap(id => [id, now])).run(); }
  return { envoyes, supprimes, erreurs, reste: faits.length < rows.length || rows.length >= 400 };
}

/* ---------- Routes ---------- */
async function lire(request) {
  const t = await request.text();
  if (t.length > 8000) return { err: json({ error: "Requête trop volumineuse." }, 413) };
  try { const b = t ? JSON.parse(t) : {}; return b && typeof b === "object" && !Array.isArray(b) ? { b } : { err: json({ error: "Requête illisible." }, 400) }; } catch (e) { return { err: json({ error: "Requête illisible." }, 400) }; }
}
export async function push(request, env) {
  if (!env || !env.DB) return json({ error: "Les notifications sont indisponibles pour le moment." }, 503);
  await init(env.DB);
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, ""), m = request.method;
  if (path === "/api/push/cle" && m === "GET") return json({ cle: (await clesVapid(env)).public });
  if (m !== "POST") return json({ error: "Introuvable." }, 404);
  const o = request.headers.get("origin"); // formulaires d'un autre site : refusés
  if (o && o !== "null") { try { if (new URL(o).host !== url.host) return json({ error: "Origine refusée." }, 403); } catch (e) { return json({ error: "Origine refusée." }, 403); } }
  const { b, err } = await lire(request); if (err) return err;

  if (path === "/api/push/desabonnement") {
    if (typeof b.endpoint !== "string" || b.endpoint.length > 1024) return json({ error: "Abonnement invalide." }, 400);
    await env.DB.prepare(`DELETE FROM push_abonnements WHERE endpoint = ?`).bind(b.endpoint).run();
    return json({ ok: true });
  }
  if (path === "/api/push/etat") {
    if (typeof b.endpoint !== "string" || b.endpoint.length > 1024) return json({ abonne: false });
    const [row, c] = await Promise.all([env.DB.prepare(`SELECT compte, choix FROM push_abonnements WHERE endpoint = ?`).bind(b.endpoint).first(), sessionCompte(request, env)]);
    if (!row) return json({ abonne: false, choix: normChoix(null) });
    if (c && row.compte !== c.id) return json({ abonne: false, autre_compte: true, choix: normChoix(null) });
    return json({ abonne: true, choix: normChoix(parse(row.choix, {})) });
  }
  if (path === "/api/push/abonnement") {
    const a = b.abonnement || {}, k = a.keys || {};
    if (!endpointOk(a.endpoint)) return json({ error: "Service de notification non reconnu." }, 400);
    if (!cleOk(k.p256dh, 65) || !cleOk(k.auth, 16)) return json({ error: "Clés de l'abonnement invalides." }, 400);
    let compte = null, base = null;
    const c = await sessionCompte(request, env);
    if (c) compte = c.id;
    if (typeof b.ancien === "string" && b.ancien !== a.endpoint) { // le navigateur a renouvelé l'abonnement : l'ancien prouve qu'il s'agit du même appareil
      const old = await env.DB.prepare(`SELECT compte, choix FROM push_abonnements WHERE endpoint = ?`).bind(b.ancien).first();
      if (old && (!compte || old.compte === compte)) { compte = old.compte; base = parse(old.choix, null); }
    }
    if (!compte) return json({ error: "Connectez-vous à votre espace pour activer les notifications.", connecte: false }, 401);
    const prev = await env.DB.prepare(`SELECT compte, choix FROM push_abonnements WHERE endpoint = ?`).bind(a.endpoint).first();
    if (prev && prev.compte === compte && !base) base = parse(prev.choix, null);
    const choix = normChoix(b.choix, base);
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM push_abonnements WHERE compte = ? AND endpoint <> ?`).bind(compte, a.endpoint).first();
    if (n && n.n >= MAX_APPAREILS) await env.DB.prepare(`DELETE FROM push_abonnements WHERE endpoint IN (SELECT endpoint FROM push_abonnements WHERE compte = ? AND endpoint <> ? ORDER BY COALESCE(last_ok, created) LIMIT ?)`).bind(compte, a.endpoint, n.n - MAX_APPAREILS + 1).run();
    await env.DB.prepare(`INSERT INTO push_abonnements (endpoint, compte, p256dh, auth, choix, appareil, created, echecs) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, choix = excluded.choix, appareil = excluded.appareil, echecs = 0,
      created = CASE WHEN push_abonnements.compte = excluded.compte THEN push_abonnements.created ELSE excluded.created END, compte = excluded.compte`)
      .bind(a.endpoint, compte, k.p256dh, k.auth, JSON.stringify(choix), appareil(request.headers.get("user-agent") || "").slice(0, 60), Date.now()).run();
    if (typeof b.ancien === "string" && b.ancien !== a.endpoint) await env.DB.prepare(`DELETE FROM push_abonnements WHERE endpoint = ? AND compte = ?`).bind(b.ancien, compte).run();
    return json({ ok: true, choix });
  }
  if (path === "/api/push/essai") {
    const c = await sessionCompte(request, env);
    if (!c) return json({ error: "Connectez-vous à votre espace.", connecte: false }, 401);
    const row = typeof b.endpoint === "string" ? await env.DB.prepare(`SELECT * FROM push_abonnements WHERE endpoint = ? AND compte = ?`).bind(b.endpoint, c.id).first() : null;
    if (!row) return json({ error: "Cet appareil n'est pas abonné." }, 404);
    if (Date.now() - (row.essai || 0) < 60000) return json({ error: "Une notification d'essai vient d'être envoyée. Réessayez dans une minute." }, 429);
    await env.DB.prepare(`UPDATE push_abonnements SET essai = ? WHERE endpoint = ?`).bind(Date.now(), row.endpoint).run();
    let s = 0;
    try { s = await envoyer(env, row, { t: "bilan. · notification d'essai", b: "Les notifications fonctionnent sur cet appareil. Vous serez prévenu selon vos choix, le soir après la clôture.", u: "/espace/alertes", tag: "bilan-essai", ts: Date.now() }, { origin: url.origin, ttl: 600 }); } catch (e) { }
    const r = await resultat(env, row, s);
    if (r === "ok") return json({ ok: true });
    return json({ error: r === "supprime" ? "Cet abonnement n'est plus valide : réactivez les notifications." : "Le service de notification n'a pas accepté le message. Réessayez plus tard.", statut: s }, 502);
  }
  return json({ error: "Introuvable." }, 404);
}
