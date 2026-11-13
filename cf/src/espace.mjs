// Espace personnel : comptes (adresse + mot de passe) et favoris gardés en ligne.
//  POST /api/espace/inscription, /connexion, /deconnexion, /secours, /motdepasse, /supprimer, /premium
//  GET  /api/espace/moi     PUT /api/espace/donnees
// Aussi : mesures d'administration, compteurs de visites, état du site (page du propriétaire), données du site pour « Le monde » (siteData).
// Sécurité : mots de passe dérivés par PBKDF2-SHA256 (100 000 tours, sel aléatoire), session dans un cookie HttpOnly
// dont seule l'empreinte SHA-256 est gardée en base, essais limités par adresse et par empreinte d'IP.
import { iaMesures } from "./iasite.mjs";
import { json, initCompte, premiumOf, visitor, sessionCompte, sha256hex, cookieSession, mailReady, adminOk, proprietaireDe, abonnementEnCours } from "./compte.mjs";
import { coursComplets } from "./cours.mjs";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS comptes (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, hash TEXT NOT NULL, sel TEXT NOT NULL, created INTEGER NOT NULL, secours TEXT, premium TEXT, teaser INTEGER NOT NULL DEFAULT 0, last_tache INTEGER NOT NULL DEFAULT 0, last_semaine TEXT)`,
  `CREATE INDEX IF NOT EXISTS comptes_premium ON comptes (premium)`,
  `CREATE TABLE IF NOT EXISTS sessions (h TEXT PRIMARY KEY, compte TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_compte ON sessions (compte)`,
  `CREATE TABLE IF NOT EXISTS donnees (compte TEXT PRIMARY KEY, favoris TEXT, portefeuille TEXT, profil TEXT, updated INTEGER)`,
  `CREATE TABLE IF NOT EXISTS bilans (compte TEXT NOT NULL, semaine TEXT NOT NULL, contenu TEXT NOT NULL, created INTEGER NOT NULL, vu INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (compte, semaine))`,
  `CREATE TABLE IF NOT EXISTS notifs (id INTEGER PRIMARY KEY AUTOINCREMENT, compte TEXT NOT NULL, at INTEGER NOT NULL, type TEXT NOT NULL, texte TEXT NOT NULL, lien TEXT, lu INTEGER NOT NULL DEFAULT 0, cle TEXT)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notifs_cle ON notifs (compte, cle)`,
  `CREATE INDEX IF NOT EXISTS notifs_at ON notifs (compte, at)`,
  `CREATE TABLE IF NOT EXISTS essais (cle TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS essais_cle ON essais (cle, at)`,
  `CREATE TABLE IF NOT EXISTS etat (cle TEXT PRIMARY KEY, val TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS essais_premium (email TEXT PRIMARY KEY, compte TEXT NOT NULL, at INTEGER NOT NULL)`, // 5e passage (C) : un essai Premium de 14 jours par adresse, sans carte
  `CREATE TABLE IF NOT EXISTS compteurs (semaine TEXT NOT NULL, cle TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (semaine, cle))`, // 5e passage (E4) : tunnel, sans traceur ni donnée personnelle
  `CREATE TABLE IF NOT EXISTS stats_jour (jour TEXT NOT NULL, cle TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (jour, cle))`, // 8/11 : fréquentation jour par jour, sans identifiant
  `CREATE TABLE IF NOT EXISTS presence (minute INTEGER PRIMARY KEY, n INTEGER NOT NULL)`, // 8/11 : pages ouvertes en ce moment (un signal par minute et par onglet visible, rien d'autre)
  `CREATE TABLE IF NOT EXISTS mcp_cles (cle TEXT PRIMARY KEY, compte TEXT NOT NULL UNIQUE, created INTEGER NOT NULL)`, // 5e passage (C) : adresse personnelle du connecteur // 5e passage : dernier passage du robot (alertes, bilans), pour que le site dise « bientôt » tant qu'il n'a jamais tourné
];
let ready = false;
async function init(db) { if (ready) return; await initCompte(db); for (const q of SCHEMA) await db.prepare(q).run(); ready = true; }

/** Le compte connecté (ligne de la table comptes), ou null. Usage interne : ne jamais renvoyer la ligne telle quelle. */
export async function compteDe(request, env) {
  if (!env || !env.DB) return null;
  await init(env.DB);
  return sessionCompte(request, env);
}

/* ---------- Outils ---------- */
const ITER = 100000, JOUR = 864e5, SESSION_MS = 60 * JOUR, FENETRE = 15 * 6e4, MAX_ESSAIS = 8, MAX_CHAMP = 60 * 1024;
const KEY = /^[ce]:[a-z0-9-]{1,60}$/;
const hex = u8 => [...u8].map(b => b.toString(16).padStart(2, "0")).join("");
const alea = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const egal = (a, b) => { if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
async function derive(mdp, sel, iter = ITER) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(sel.match(/../g).map(h => parseInt(h, 16))), iterations: iter }, k, 256);
  return hex(new Uint8Array(bits));
}
async function nouveauHash(mdp) { const sel = alea(16); return { sel, hash: `pbkdf2-sha256$${ITER}$` + await derive(mdp, sel) }; }
async function verifie(mdp, compte) {
  if (!compte) { await derive(String(mdp), "00".repeat(16)); return false; } // même durée que pour une vraie adresse
  const [, it, h] = String(compte.hash).split("$");
  return egal(await derive(String(mdp), compte.sel, +it || ITER), h || "");
}
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I
const nouveauCode = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => ALPHA[b & 31]).join("").match(/..../g).join("-");
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
async function hashCode(code) { const s = alea(16); return s + "$" + await sha256hex(s + "|" + normCode(code)); }
async function codeOk(code, stocke) { const [s, h] = String(stocke || "").split("$"); return !!(s && h) && egal(await sha256hex(s + "|" + normCode(code)), h); }
const emailOk = e => e.length <= 254 && /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(e);
const mdpOk = m => typeof m === "string" && m.length >= 10 && m.length <= 200;
const COOKIE = "HttpOnly; Secure; SameSite=Lax; Path=/";
const avecCookie = (r, v) => { r.headers.append("set-cookie", v); return r; };
async function ouvrirSession(env, compteId) {
  const t = alea(32), now = Date.now();
  await env.DB.prepare(`INSERT INTO sessions (h, compte, created, expires) VALUES (?, ?, ?, ?)`).bind(await sha256hex(t), compteId, now, now + SESSION_MS).run();
  if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM sessions WHERE expires < ?`).bind(now).run();
  return `bilan_s=${t}; ${COOKIE}; Max-Age=${SESSION_MS / 1000}`;
}
const EFFACE = `bilan_s=; ${COOKIE}; Max-Age=0`;
async function limite(env, cles) { for (const c of cles) { const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM essais WHERE cle = ? AND at > ?`).bind(c, Date.now() - FENETRE).first(); if (r && r.n >= MAX_ESSAIS) return true; } return false; }
async function echec(env, cles) { for (const c of cles) await env.DB.prepare(`INSERT INTO essais (cle, at) VALUES (?, ?)`).bind(c, Date.now()).run(); }
const TROP = () => json({ error: "Trop de tentatives. Par sécurité, réessayez dans un quart d'heure." }, 429);
async function lire(request) {
  const t = await request.text();
  if (t.length > 400000) return { err: json({ error: "Données trop volumineuses." }, 413) };
  try { const b = t ? JSON.parse(t) : {}; return b && typeof b === "object" && !Array.isArray(b) ? { b } : { err: json({ error: "Requête illisible." }, 400) }; } catch (e) { return { err: json({ error: "Requête illisible." }, 400) }; }
}
const parse = (s, d) => { try { const v = JSON.parse(s); return v === undefined ? d : v; } catch (e) { return d; } };
const taille = v => new TextEncoder().encode(JSON.stringify(v)).length;


// Données venues du navigateur : favoris, portefeuille, profil. strict = refuser (PUT) ; sinon on ignore ce qui ne va pas (import à l'inscription).
function valider(b, strict) {
  const out = {}, ignores = [];
  const ko = (champ, msg) => { if (strict) return msg; ignores.push(champ); return null; };
  if (b.favoris !== undefined) {
    let f = b.favoris === null ? [] : b.favoris;
    if (!Array.isArray(f)) { const e = ko("favoris", "La liste de favoris doit être un tableau."); if (e) return { error: e }; f = null; }
    if (f) {
      if (strict && f.some(x => typeof x !== "string" || !KEY.test(x))) return { error: "Favori invalide dans la liste." };
      f = [...new Set(f.filter(x => typeof x === "string" && KEY.test(x)))];
      if (f.length > 200) { if (strict) return { error: "200 favoris au plus." }; f = f.slice(0, 200); }
      out.favoris = JSON.stringify(f);
    }
  }
  for (const [champ, objet] of [["portefeuille", false], ["profil", true]]) {
    if (b[champ] === undefined) continue;
    const v = b[champ];
    if (v !== null && (typeof v !== "object" || (objet && Array.isArray(v)))) { const e = ko(champ, `Format de ${champ} invalide.`); if (e) return { error: e }; continue; }
    if (taille(v) > MAX_CHAMP) { const e = ko(champ, `${champ === "profil" ? "Profil" : "Portefeuille"} trop volumineux (60 Ko au plus).`); if (e) return { error: e }; continue; }
    out[champ] = JSON.stringify(v);
  }
  return { data: out, ignores };
}
async function enregistrer(env, compteId, d) {
  await env.DB.prepare(`INSERT INTO donnees (compte, favoris, portefeuille, profil, updated) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (compte) DO UPDATE SET favoris = COALESCE(excluded.favoris, favoris), portefeuille = COALESCE(excluded.portefeuille, portefeuille), profil = COALESCE(excluded.profil, profil), updated = excluded.updated`)
    .bind(compteId, d.favoris ?? null, d.portefeuille ?? null, d.profil ?? null, Date.now()).run();
}
const premiumDe = async (env, token, origin) => token ? premiumOf(new Request(origin + "/", { headers: { "x-bilan-token": token } }), env) : null;

/* ---------- Dates : jour et semaine ISO à l'heure de Paris ---------- */
export function jourParis(t = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function semaineIso(ymd) {
  const d = new Date(ymd + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); // jeudi de la semaine
  const y = d.getUTCFullYear(), w = 1 + Math.floor((d - Date.UTC(y, 0, 1)) / (7 * JOUR));
  return `${y}-W${String(w).padStart(2, "0")}`;
}
export const jourSemaine = ymd => new Date(ymd + "T12:00:00Z").getUTCDay(); // 0 dimanche … 6 samedi

/* ---------- Données du site (mêmes sources que les pages) ---------- */
export async function siteData(request, env) {
  const get = async p => { try { const r = await env.ASSETS.fetch(new Request(new URL(p, request.url))); return r.ok === false ? null : await r.json(); } catch (e) { return null; } };
  const [conc, monde, contexte, actuSem] = await Promise.all([get("/data/concurrents.json"), get("/data/actu/monde.json"), get("/data/contexte.json"), get("/data/actu/semaine.json")]); // 6/11 soir : rapport v8 (cf/src/rapport8.mjs)
  const [uni, etf, ana, ag, agAuto, sem, cs, fx, dvUs, dvEu] = await Promise.all([get("/data/univers.json"), get("/data/etf.json"), get("/data/actu-analyse.json"), get("/data/agenda.json"), get("/data/agenda-auto.json"), get("/data/semaine.json"), get("/data/cours-semaine.json"), get("/data/fx.json"), get("/data/agenda-dividendes.json"), get("/data/agenda-dividendes-eu.json")]);
  let px = {}; try { px = (await coursComplets(new Request(new URL("/api/cours", request.url)), null, env)).items || {}; } catch (e) { }
  const names = {}, meta = {}, isin = {}, etfm = {};
  (uni && uni.companies || []).forEach(c => { names["c:" + c.id] = c.name; meta["c:" + c.id] = { region: c.region, sector: c.sector }; if (c.isin) isin["c:" + c.id] = c.isin; });
  (etf && etf.list || []).forEach(e => { names["e:" + e.id] = e.name; etfm["e:" + e.id] = { ter: e.ter, pea: e.pea, index: e.index, proxy: e.proxy || null }; });
  const parIsin = Object.fromEntries(Object.entries(isin).map(([k, v]) => [v, k])), memo = new Map(), charger = p => { if (!memo.has(p)) memo.set(p, get(p)); return memo.get(p); };
  const actuCache = new Map();
  return { names, meta, isin, parIsin, charger, conc: conc || {}, monde, contexte, actuSem, etf: etfm, px, fx: (fx && fx.eur) || { EUR: 1 }, cs: cs && Array.isArray(cs.dates) ? cs : null, sem: sem && sem.items ? sem : null,
    ana: (ana && ana.items) || {}, ev: [...((ag && ag.events) || []), ...((agAuto && agAuto.events) || [])],
    div: [...((dvUs && dvUs.events) || []), ...((dvEu && dvEu.events) || [])], // 4/11 : calendriers des dividendes (Nasdaq, annonces européennes), alertes Premium
    // Articles par entreprise publiés par la collecte d'actualités (cf/site/data/actu/c/<id>.json), lus à la demande
    actuDe: async ids => { const out = {}; for (const id of ids.slice(0, 20)) { if (!actuCache.has(id)) actuCache.set(id, get("/data/actu/c/" + id + ".json"));
      const j = await actuCache.get(id); if (j && (Array.isArray(j) || Array.isArray(j.o) || Array.isArray(j.p))) out["c:" + id] = j; } return out; } };
}



const precedenteDe = semaine => { const m = /^(\d{4})-W(\d{2})$/.exec(semaine); const l = new Date(Date.UTC(+m[1], 0, 4)); l.setUTCDate(l.getUTCDate() - ((l.getUTCDay() + 6) % 7) + (+m[2] - 1) * 7 - 7); return semaineIso(l.toISOString().slice(0, 10)); };


/* ---------- Routes ---------- */
export async function espace(request, env) {
  if (!env || !env.DB) return json({ error: "L'espace personnel est indisponible pour le moment." }, 503);
  await init(env.DB);
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, ""), m = request.method;
  if (m !== "GET" && m !== "HEAD" && path !== "/api/espace/tache") { // formulaires d'un autre site : refusés
    const o = request.headers.get("origin"); if (o && o !== "null") { try { if (new URL(o).host !== url.host) return json({ error: "Origine refusée." }, 403); } catch (e) { return json({ error: "Origine refusée." }, 403); } }
  }
  if (path === "/api/espace/mesures" && m === "GET") return mesures(request, env);
  if (path === "/api/espace/v" && m === "POST") return visite(request, env);
  if (path === "/api/espace/stats" && m === "GET") { const p = await premiumOf(request, env); if (!p || p.plan !== "proprietaire") return json({ error: "Réservé au propriétaire du site." }, 403); return json(await statsSite(env)); }
  // 7/11 : état du site, calculé chaque matin par le robot (scripts/etat-site.mjs), gardé 35 jours, lu par le compte propriétaire seulement
  if (path === "/api/espace/etat" && m === "POST") {
    if (!adminOk(request, env)) return json({ error: "Non autorisé." }, 403);
    const { b, err } = await lire(request); if (err) return err;
    const jour = /^\d{4}-\d{2}-\d{2}$/.test(b.jour || "") ? b.jour : jourParis();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cache_json (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)`).run();
    await env.DB.prepare(`INSERT OR REPLACE INTO cache_json (k, v, at) VALUES (?, ?, ?)`).bind("etat|" + jour, JSON.stringify(b).slice(0, 400000), Date.now()).run();
    await env.DB.prepare(`DELETE FROM cache_json WHERE k LIKE 'etat|%' AND at < ?`).bind(Date.now() - 35 * JOUR).run();
    return json({ ok: true, jour });
  }
  if (path === "/api/espace/etat" && m === "GET") {
    const p = await premiumOf(request, env); if (!p || p.plan !== "proprietaire") return json({ error: "Réservé au propriétaire du site." }, 403);
    let rows = []; try { rows = (await env.DB.prepare(`SELECT k, v FROM cache_json WHERE k LIKE 'etat|%' ORDER BY k DESC LIMIT 30`).all()).results || []; } catch (e) { }
    return json({ items: rows.map(r => { try { return JSON.parse(r.v); } catch (e) { return null; } }).filter(Boolean) });
  }
  if (path === "/api/espace/essai" && m === "POST") { // essai Premium de 14 jours, sans carte : seulement si ESSAI_14J = "1" (Romain l'ouvre), une fois par adresse
    if (env.ESSAI_14J !== "1") return json({ error: "L'essai gratuit n'est pas encore ouvert." }, 403);
    const c = await compteDe(request, env); if (!c) return json({ error: "Créez votre espace gratuit (une adresse e-mail suffit), puis lancez l'essai." }, 401);
    if (await premiumDe(env, c.premium, url.origin)) return json({ error: "Premium est déjà actif sur ce compte." }, 409);
    if (await env.DB.prepare(`SELECT 1 FROM essais_premium WHERE email = ? OR compte = ?`).bind(c.email, c.id).first()) return json({ error: "L'essai gratuit a déjà été utilisé avec cette adresse." }, 409);
    const token = alea(20), until = Date.now() + 14 * JOUR;
    await initCompte(env.DB);
    await env.DB.prepare(`INSERT INTO abonnes (token, email, plan, sub_id, session, until, created) VALUES (?, ?, 'essai', NULL, NULL, ?, ?)`).bind(token, c.email, until, Date.now()).run();
    await env.DB.prepare(`UPDATE comptes SET premium = ? WHERE id = ?`).bind(token, c.id).run();
    await env.DB.prepare(`INSERT INTO essais_premium (email, compte, at) VALUES (?, ?, ?)`).bind(c.email, c.id, Date.now()).run();
    return json({ ok: true, jusqu_au: until });
  }
  if (path === "/api/espace/inscription" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const ip = "s:" + await visitor(request, env);
    if (await limite(env, [ip])) return json({ error: "Trop de comptes créés depuis cette connexion. Réessayez plus tard." }, 429);
    const email = String(b.email || "").trim().toLowerCase(), mdp = b.motdepasse;
    if (!emailOk(email)) return json({ error: "Adresse e-mail invalide." }, 400);
    if (!mdpOk(mdp)) return json({ error: "Le mot de passe doit faire au moins 10 caractères." }, 400);
    const v = valider(b, false);
    await echec(env, [ip]); // compte aussi les inscriptions réussies : 8 par quart d'heure et par connexion au plus
    if (await env.DB.prepare(`SELECT 1 AS x FROM comptes WHERE email = ?`).bind(email).first()) return json({ error: "Impossible de créer un compte avec cette adresse. Si vous en avez déjà un, connectez-vous." }, 409);
    const id = alea(16), { sel, hash } = await nouveauHash(mdp), code = nouveauCode();
    try { await env.DB.prepare(`INSERT INTO comptes (id, email, hash, sel, created, secours, teaser) VALUES (?, ?, ?, ?, ?, ?, 0)`).bind(id, email, hash, sel, Date.now(), await hashCode(code)).run(); }
    catch (e) { return json({ error: "Impossible de créer un compte avec cette adresse. Si vous en avez déjà un, connectez-vous." }, 409); }
    await enregistrer(env, id, v.data);
    return avecCookie(json({ ok: true, email, code_secours: code, ...(v.ignores.length ? { ignores: v.ignores } : {}) }), await ouvrirSession(env, id));
  }

  if (path === "/api/espace/connexion" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const email = String(b.email || "").trim().toLowerCase().slice(0, 254), cles = ["e:" + email, "i:" + await visitor(request, env)];
    if (await limite(env, cles)) return TROP();
    const c = emailOk(email) ? await env.DB.prepare(`SELECT * FROM comptes WHERE email = ?`).bind(email).first() : null;
    if (!(await verifie(String(b.motdepasse || "").slice(0, 200), c))) { await echec(env, cles); return json({ error: "Adresse ou mot de passe incorrect." }, 401); }
    await env.DB.prepare(`DELETE FROM essais WHERE cle = ?`).bind(cles[0]).run();
    return avecCookie(json({ ok: true, email: c.email }), await ouvrirSession(env, c.id));
  }

  if (path === "/api/espace/secours" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const email = String(b.email || "").trim().toLowerCase().slice(0, 254), cles = ["e:" + email, "i:" + await visitor(request, env)];
    if (await limite(env, cles)) return TROP();
    if (!mdpOk(b.nouveau)) return json({ error: "Le nouveau mot de passe doit faire au moins 10 caractères." }, 400);
    const c = emailOk(email) ? await env.DB.prepare(`SELECT * FROM comptes WHERE email = ?`).bind(email).first() : null;
    if (!c || !(await codeOk(b.code, c.secours))) { await echec(env, cles); return json({ error: "Adresse ou code de secours incorrect." }, 401); }
    const { sel, hash } = await nouveauHash(b.nouveau), code = nouveauCode();
    await env.DB.prepare(`UPDATE comptes SET hash = ?, sel = ?, secours = ? WHERE id = ?`).bind(hash, sel, await hashCode(code), c.id).run();
    await env.DB.prepare(`DELETE FROM sessions WHERE compte = ?`).bind(c.id).run();
    await env.DB.prepare(`DELETE FROM essais WHERE cle = ?`).bind(cles[0]).run();
    return avecCookie(json({ ok: true, email: c.email, code_secours: code }), await ouvrirSession(env, c.id));
  }

  if (path === "/api/espace/deconnexion" && m === "POST") {
    const t = cookieSession(request); if (t) await env.DB.prepare(`DELETE FROM sessions WHERE h = ?`).bind(await sha256hex(t)).run();
    return avecCookie(json({ ok: true }), EFFACE);
  }

  // Tout le reste demande d'être connecté
  const c = await sessionCompte(request, env);
  if (path === "/api/espace/moi" && m === "GET") {
    if (!c) return json({ connecte: false });
    const [d, sess] = await Promise.all([
      env.DB.prepare(`SELECT favoris, portefeuille, profil, updated FROM donnees WHERE compte = ?`).bind(c.id).first(),
      env.DB.prepare(`SELECT h, expires FROM sessions WHERE h = ?`).bind(await sha256hex(cookieSession(request))).first()]);
    const po = await proprietaireDe(env, c), p = po || await premiumDe(env, c.premium, url.origin);
    const r = json({ connecte: true, email: c.email, premium: !!p, plan: p ? p.plan : null, resiliable: !!(p && p.sub_id), premium_jusqu_au: p ? p.until : null,
      donnees: { favoris: parse(d && d.favoris, []) || [], maj: d ? d.updated : null },
      mail: mailReady(env), cree: c.created, ...(po ? { jeton: po.token } : {}) }); // jeton : Premium aussi dans ce navigateur (IA, quotas)
    if (sess && sess.expires - Date.now() < SESSION_MS - 7 * JOUR) { // session prolongée à chaque visite (au plus une fois par semaine)
      await env.DB.prepare(`UPDATE sessions SET expires = ? WHERE h = ?`).bind(Date.now() + SESSION_MS, sess.h).run();
      avecCookie(r, `bilan_s=${cookieSession(request)}; ${COOKIE}; Max-Age=${SESSION_MS / 1000}`);
    }
    return r;
  }
  if (!c) return json({ error: "Connectez-vous pour accéder à votre espace.", connecte: false }, 401);

  if (path === "/api/espace/donnees" && (m === "PUT" || m === "POST")) {
    const { b, err } = await lire(request); if (err) return err;
    const v = valider(b, true); if (v.error) return json({ error: v.error }, 400);
    await enregistrer(env, c.id, v.data);
    return json({ ok: true });
  }

  if (path === "/api/espace/motdepasse" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const cles = ["e:" + c.email]; if (await limite(env, cles)) return TROP();
    if (!mdpOk(b.nouveau)) return json({ error: "Le nouveau mot de passe doit faire au moins 10 caractères." }, 400);
    if (!(await verifie(String(b.ancien || "").slice(0, 200), c))) { await echec(env, cles); return json({ error: "Mot de passe actuel incorrect." }, 401); }
    const { sel, hash } = await nouveauHash(b.nouveau);
    await env.DB.prepare(`UPDATE comptes SET hash = ?, sel = ? WHERE id = ?`).bind(hash, sel, c.id).run();
    await env.DB.prepare(`DELETE FROM sessions WHERE compte = ? AND h <> ?`).bind(c.id, await sha256hex(cookieSession(request))).run(); // les autres appareils sont déconnectés
    return json({ ok: true });
  }

  if (path === "/api/espace/supprimer" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const cles = ["e:" + c.email]; if (await limite(env, cles)) return TROP();
    if (!(await verifie(String(b.motdepasse || "").slice(0, 200), c))) { await echec(env, cles); return json({ error: "Mot de passe incorrect." }, 401); }
    // 7/11 (Romain) : on ne supprime pas un espace dont l'abonnement continue de prélever ; il faut d'abord le résilier
    { // tout abonnement rattaché à ce compte ou payé avec son adresse, même échu : Stripe dit s'il prélève encore
      const subs = ((await env.DB.prepare(`SELECT sub_id FROM abonnes WHERE (token = ? OR email = ?) AND sub_id IS NOT NULL`).bind(c.premium || "", String(c.email || "").toLowerCase()).all().catch(() => ({ results: [] }))).results || []);
      let enCours = null; try { for (const p of subs) { enCours = enCours || await abonnementEnCours(env, p); } } catch (e) { return json({ error: "Impossible de vérifier votre abonnement pour le moment. Réessayez plus tard : votre espace n'a pas été supprimé.", abonnement: true }, 409); }
      if (enCours) return json({ error: "Votre abonnement Premium est toujours actif : il continuerait d'être prélevé. Résiliez-le d'abord avec « Gérer ou résilier mon abonnement », puis supprimez votre espace.", abonnement: true }, 409); }
    for (const q of [`DELETE FROM notifs WHERE compte = ?`, `DELETE FROM bilans WHERE compte = ?`, `DELETE FROM donnees WHERE compte = ?`, `DELETE FROM sessions WHERE compte = ?`, `DELETE FROM comptes WHERE id = ?`, `DELETE FROM mcp_cles WHERE compte = ?`]) await env.DB.prepare(q).bind(c.id).run();
    return avecCookie(json({ ok: true }), EFFACE);
  }

  if (path === "/api/espace/premium" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const token = String(b.token || "").replace(/[^a-f0-9]/g, "").slice(0, 64);
    if (!token) return json({ error: "Collez votre code Premium." }, 400);
    const p = await premiumDe(env, token, url.origin);
    if (!p) return json({ error: "Code Premium inconnu ou expiré." }, 404);
    if (await env.DB.prepare(`SELECT 1 AS x FROM comptes WHERE premium = ? AND id <> ?`).bind(token, c.id).first()) return json({ error: "Ce code Premium est déjà rattaché à un autre compte." }, 409);
    await env.DB.prepare(`UPDATE comptes SET premium = ? WHERE id = ?`).bind(token, c.id).run();
    return json({ ok: true, premium: true, plan: p.plan, premium_jusqu_au: p.until });
  }

  return json({ error: "Introuvable." }, 404);
}

/* ---------- 8/11 : fréquentation du site, pour la page État du site (propriétaire) ----------
   Le navigateur envoie une ligne par page vue (type de page, source de la visite) et, tant que l'onglet est visible, un signal par minute.
   Rien ne permet de reconnaître quelqu'un : ni adresse IP, ni cookie, ni identifiant ; seulement des totaux par jour et par minute. */
const SOURCES = [["tiktok", /tiktok/], ["instagram", /instagram/], ["facebook", /facebook|fb\.me/], ["x", /(^|\.)x\.com$|twitter|t\.co$/], ["youtube", /youtube|youtu\.be/], ["linkedin", /linkedin|lnkd/], ["reddit", /reddit/], ["snapchat", /snapchat/],
  ["google", /google\./], ["bing", /bing\./], ["duckduckgo", /duckduckgo/], ["qwant", /qwant/], ["ecosia", /ecosia/], ["yahoo", /yahoo\./], ["chatgpt", /chatgpt|openai/], ["perplexity", /perplexity/], ["claude", /claude\.ai/]];
const heureParis = (t = Date.now()) => +(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).formatToParts(t).find(x => x.type === "hour") || { value: 0 }).value % 24;
async function visite(request, env) {
  const ua = request.headers.get("user-agent") || ""; if (/bot|crawl|spider|headless|lighthouse|preview|slurp|facebookexternalhit/i.test(ua)) return json({ ok: true });
  const { b, err } = await lire(request); if (err) return json({ ok: false });
  const now = Date.now(), minute = Math.floor(now / 60000);
  try {
    if (b.t === "ping") { await env.DB.prepare(`INSERT INTO presence (minute, n) VALUES (?, 1) ON CONFLICT (minute) DO UPDATE SET n = n + 1`).bind(minute).run(); return json({ ok: true }); }
    if (b.t !== "pv") return json({ ok: false });
    const jour = jourParis(now), h = heureParis(now), cles = ["pv", "h:" + h];
    const pth = String(b.p || "/").toLowerCase().slice(0, 80); if (/^\/[a-z0-9\-\/]*$/.test(pth) && pth.split("/").length <= 4) cles.push("p:" + (pth.replace(/\/+$/, "") || "/"));
    if (b.nouveau) { cles.push("visite", "hv:" + h);
      let src = String(b.src || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      if (!src) { let host = ""; try { host = b.ref ? new URL(b.ref).hostname.replace(/^www\./, "") : ""; } catch (e) { } const hit = host && SOURCES.find(([, re]) => re.test(host));
        src = !host ? "direct" : hit ? hit[0] : /enklair\.com$/.test(host) ? "direct" : "autre site"; }
      cles.push("src:" + src); }
    await env.DB.batch(cles.map(c => env.DB.prepare(`INSERT INTO stats_jour (jour, cle, n) VALUES (?, ?, 1) ON CONFLICT (jour, cle) DO UPDATE SET n = n + 1`).bind(jour, c)));
    if (Math.random() < 0.01) { await env.DB.prepare(`DELETE FROM presence WHERE minute < ?`).bind(minute - 3 * 24 * 60).run(); await env.DB.prepare(`DELETE FROM stats_jour WHERE jour < ?`).bind(jourParis(now - 730 * JOUR)).run(); }
  } catch (e) { try { await init(env.DB); } catch (x) { } }
  return json({ ok: true });
}
export async function statsSite(env) {
  const now = Date.now(), minute = Math.floor(now / 60000), auj = jourParis(now);
  const P = ((await env.DB.prepare(`SELECT minute, n FROM presence WHERE minute > ?`).bind(minute - 24 * 60).all()).results || []);
  const parMin = Object.fromEntries(P.map(r => [r.minute, r.n]));
  // en ce moment : signaux des deux dernières minutes pleines (un par minute et par onglet visible)
  const direct = Math.round(((parMin[minute - 1] || 0) + (parMin[minute - 2] || 0)) / 2) || (parMin[minute] || 0);
  const courbe = []; for (let k = 59; k >= 0; k--) courbe.push(parMin[minute - k] || 0);
  const debut = jourParis(now - 29 * JOUR), R = ((await env.DB.prepare(`SELECT jour, cle, n FROM stats_jour WHERE jour >= ?`).bind(debut).all()).results || []);
  const J = {}; for (const r of R) (J[r.jour] = J[r.jour] || {})[r.cle] = r.n;
  const jours = []; for (let k = 29; k >= 0; k--) { const j = jourParis(now - k * JOUR), o = J[j] || {}; jours.push({ jour: j, visites: o.visite || 0, pages: o.pv || 0 }); }
  const somme = (js, pre) => { const t = {}; for (const j of js) for (const [c, n] of Object.entries(J[j] || {})) if (c.startsWith(pre)) t[c.slice(pre.length)] = (t[c.slice(pre.length)] || 0) + n; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
  const sept = jours.slice(-7).map(x => x.jour), A = J[auj] || {};
  return { direct, courbe, aujourdhui: { visites: A.visite || 0, pages: A.pv || 0, heures: Array.from({ length: 24 }, (_, h) => A["hv:" + h] || 0) }, jours,
    pages: { jour: somme([auj], "p:").slice(0, 12), sept: somme(sept, "p:").slice(0, 15) }, sources: { jour: somme([auj], "src:"), sept: somme(sept, "src:") } };
}

/* ---------- Tunnel (5e passage, E4) : des compteurs par semaine, sans cookie ni identifiant. ----------
   Le Worker compte les pages servies (visite, fiche, source : moteur ou X) ; le navigateur signale trois gestes (suivre une entreprise,
   voir l'aperçu d'une alerte Premium, ouvrir le rapport exemple) par /api/compteur ; le reste vient de la base (comptes, rapports, essais, Premium). */
export const COMPTEURS_OK = new Set(["visite", "fiche", "src:moteur", "src:x", "src:autre", "suivre", "premium-vue", "fiche-verrou"]);
export async function compterEvt(env, cles) {
  if (!env || !env.DB) return; const sem = semaineIso(jourParis());
  try { for (const c of cles) if (COMPTEURS_OK.has(c)) await env.DB.prepare(`INSERT INTO compteurs (semaine, cle, n) VALUES (?, ?, 1) ON CONFLICT (semaine, cle) DO UPDATE SET n = n + 1`).bind(sem, c).run(); }
  catch (e) { try { await init(env.DB); } catch (x) { } }
}
async function tunnel(env) {
  try {
    const sem = semaineIso(jourParis()), prec = precedenteDe(sem), now = Date.now();
    const lire = async w => Object.fromEntries(((await env.DB.prepare(`SELECT cle, n FROM compteurs WHERE semaine = ?`).bind(w).all()).results || []).map(r => [r.cle, r.n]));
    const n = async (q, ...b) => (((await env.DB.prepare(q).bind(...b).first()) || {}).n) || 0;
    const base = async w => ({ comptes_crees: await n(`SELECT COUNT(*) AS n FROM comptes WHERE created > ? AND created <= ?`, now - (w === sem ? 7 : 14) * JOUR, now - (w === sem ? 0 : 7) * JOUR), essais: await n(`SELECT COUNT(*) AS n FROM essais_premium WHERE at > ? AND at <= ?`, now - (w === sem ? 7 : 14) * JOUR, now - (w === sem ? 0 : 7) * JOUR) });
    const etapes = async w => { const c = await lire(w), b = await base(w); return { semaine: w, visites: c.visite || 0, depuis_moteurs: c["src:moteur"] || 0, depuis_x: c["src:x"] || 0, fiches: c.fiche || 0, suivre: c.suivre || 0, comptes: b.comptes_crees, page_premium: c["premium-vue"] || 0, essais: b.essais }; };
    return { cette_semaine: await etapes(sem), semaine_precedente: await etapes(prec), premium_actifs: await n(`SELECT COUNT(*) AS n FROM abonnes WHERE until > ?`, now).catch(() => 0) };
  } catch (e) { return { erreur: String(e && e.message || e) }; }
}
/* Mesures d'administration (5e passage, B2) : GET /api/espace/mesures avec l'en-tête x-admin-key. Aucun traceur tiers : tout vient de la base.
   - comptes : total, créés sur 7 et 30 jours ; actifs : sessions ouvertes ou prolongées sur 7 jours ;
   - rapport : comptes ayant un rapport pour la semaine en cours, part qui l'a ouvert (bilans.vu = 1) ; même chose pour la semaine précédente ;
   - premium : abonnés en cours, inscrits à la liste d'attente ; robot : dernier passage réel (alertes, bilans). */
async function mesures(request, env) {
  if (!adminOk(request, env)) return json({ error: "Non autorisé." }, 403);
  await init(env.DB);
  const now = Date.now();
  const n = async (q, ...b) => (((await env.DB.prepare(q).bind(...b).first()) || {}).n) || 0;
  return json({
    jour: jourParis(),
    comptes: { total: await n(`SELECT COUNT(*) AS n FROM comptes`), crees_7j: await n(`SELECT COUNT(*) AS n FROM comptes WHERE created > ?`, now - 7 * JOUR), crees_30j: await n(`SELECT COUNT(*) AS n FROM comptes WHERE created > ?`, now - 30 * JOUR),
      actifs_7j: await n(`SELECT COUNT(DISTINCT compte) AS n FROM sessions WHERE expires > ?`, now + SESSION_MS - 7 * JOUR), avec_favoris: await n(`SELECT COUNT(*) AS n FROM donnees WHERE favoris IS NOT NULL AND favoris <> '[]'`) },
    premium: { abonnes: await n(`SELECT COUNT(*) AS n FROM abonnes WHERE until > ?`, now).catch(() => 0), attente: await n(`SELECT COUNT(*) AS n FROM attente`).catch(() => 0) },
    ia: await iaMesures(env), // 5e passage (C) : coût réel de l'IA, par niveau ; coût par abonné = cout_estime_eur ÷ premium.abonnes
    tunnel: await tunnel(env), // 5e passage (E4) : chaque étape du tunnel, par semaine
  });
}

