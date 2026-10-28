// Espace personnel : comptes (adresse + mot de passe), données du navigateur gardées en ligne, bilan de la semaine
// et notifications à consulter sur le site. L'e-mail ne sert plus qu'à prévenir (« Votre bilan est prêt »), si la personne l'a demandé.
//  POST /api/espace/inscription, /connexion, /deconnexion, /secours, /motdepasse, /preferences, /supprimer, /premium
//  GET  /api/espace/moi     PUT /api/espace/donnees     GET /api/espace/bilan?semaine=2026-W44
//  GET  /api/espace/notifs  POST /api/espace/notifs/lu
//  POST /api/espace/tache   robot quotidien (.github/workflows/espace.yml), protégé par ADMIN_KEY
// Sécurité : mots de passe dérivés par PBKDF2-SHA256 (100 000 tours, sel aléatoire), session dans un cookie HttpOnly
// dont seule l'empreinte SHA-256 est gardée en base, essais limités par adresse et par empreinte d'IP.
import { REGLES } from "./regles.mjs";
import { json, initCompte, premiumOf, visitor, sessionCompte, sha256hex, cookieSession, mailReady, mailCapacity, sendMail } from "./compte.mjs";
import { cours } from "./cours.mjs";
import { rediger } from "./llm.mjs";

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
const jourSemaine = ymd => new Date(ymd + "T12:00:00Z").getUTCDay(); // 0 dimanche … 6 samedi
const semainePrecedente = ymd => semaineIso(new Date(Date.parse(ymd + "T12:00:00Z") - 7 * JOUR).toISOString().slice(0, 10));

/* ---------- Données du site (mêmes sources que le bilan par e-mail de ia.mjs) ---------- */
async function siteData(request, env) {
  const get = async p => { try { return await (await env.ASSETS.fetch(new Request(new URL(p, request.url)))).json(); } catch (e) { return null; } };
  const [uni, etf, ana, ag, agAuto, sem] = await Promise.all([get("/data/univers.json"), get("/data/etf.json"), get("/data/actu-analyse.json"), get("/data/agenda.json"), get("/data/agenda-auto.json"), get("/data/semaine.json")]);
  let px = {}; try { px = (await (await cours(new Request(new URL("/api/cours", request.url)))).json()).items || {}; } catch (e) { }
  const names = {}; (uni && uni.companies || []).forEach(c => names["c:" + c.id] = c.name); (etf && etf.list || []).forEach(e => names["e:" + e.id] = e.name);
  return { names, px, sem: (sem && sem.items) || {}, ana: (ana && ana.items) || {}, ev: [...((ag && ag.events) || []), ...((agAuto && agAuto.events) || [])] };
}
// Lignes du portefeuille, quel que soit son format (radiographie { l: [{ k }] } ou opérations { ops: [{ id }] }).
function clesPortefeuille(pf, names) {
  const out = new Set(); let n = 0;
  const walk = (x, depth) => {
    if (!x || typeof x !== "object" || depth > 6 || n++ > 5000) return;
    if (Array.isArray(x)) { x.forEach(y => walk(y, depth + 1)); return; }
    for (const f of ["k", "id"]) { const v = x[f]; if (typeof v !== "string") continue; if (KEY.test(v)) out.add(v); else if (/^[a-z0-9-]{1,60}$/.test(v) && names["c:" + v]) out.add("c:" + v); }
    for (const v of Object.values(x)) if (v && typeof v === "object") walk(v, depth + 1);
  };
  walk(pf, 0); return [...out];
}
const clesDe = (row, names) => [...new Set([...parse(row && row.favoris, []).filter(k => typeof k === "string" && KEY.test(k)), ...clesPortefeuille(parse(row && row.portefeuille, null), names)])].slice(0, 260);
const lienDe = k => k.startsWith("e:") ? "/etf/" + k.slice(2) : "/entreprise/" + k.slice(2);
const r2 = v => Math.round(v * 100) / 100;
const NF = (v, d = 1) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const sgnP = v => (v > 0 ? "+" : v < 0 ? "−" : "") + NF(Math.abs(v)) + " %";

// Les faits de la semaine pour une liste de lignes (variation sur 7 jours, annonces des 7 derniers jours, dates des 14 prochains).
function faitsSemaine(d, keys, semaine) {
  const lignes = keys.filter(k => d.names[k]).map(k => {
    const p = d.px[k], w = d.sem[k], v = p && p.p && w ? r2((p.p / w - 1) * 100) : null;
    return { k, nom: d.names[k], variation_semaine_pct: v, cours: p && p.p != null ? p.p : null, devise: (p && p.cur) || null };
  }).sort((a, b) => (b.variation_semaine_pct ?? -1e9) - (a.variation_semaine_pct ?? -1e9));
  const mv = lignes.filter(l => l.variation_semaine_pct != null), court = l => l && { k: l.k, nom: l.nom, variation_semaine_pct: l.variation_semaine_pct };
  const today = jourParis(), il7 = jourParis(Date.now() - 7 * JOUR), in14 = jourParis(Date.now() + 14 * JOUR);
  const ids = new Set(lignes.filter(l => l.k.startsWith("c:")).map(l => l.k.slice(2)));
  const annonces = Object.entries(d.ana).filter(([, a]) => a && ids.has(a.id) && a.date >= il7 && a.chiffres && a.chiffres.length)
    .sort((x, y) => String(y[1].date).localeCompare(x[1].date)).slice(0, 12)
    .map(([u, a]) => ({ k: "c:" + a.id, nom: d.names["c:" + a.id], date: a.date, type: a.type || null, titre: a.titre || null, chiffres: a.chiffres.slice(0, 4), lecture: (a.lecture || []).slice(0, 3), source: u, lien: "/entreprise/" + a.id + "/actualite" }));
  const a_venir = d.ev.filter(e => e && ids.has(e.id) && e.date >= today && e.date <= in14).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
    .map(e => ({ k: "c:" + e.id, nom: d.names["c:" + e.id], date: e.date, type: e.type || null, label: e.label || "", lien: "/entreprise/" + e.id + "/agenda" }));
  return {
    semaine, genere: Date.now(), lignes,
    moyenne: mv.length ? r2(mv.reduce((a, l) => a + l.variation_semaine_pct, 0) / mv.length) : null,
    meilleure: court(mv[0]) || null, pire: mv.length > 1 ? court(mv[mv.length - 1]) : null,
    hausses: mv.filter(l => l.variation_semaine_pct > 0).length, baisses: mv.filter(l => l.variation_semaine_pct < 0).length,
    annonces, a_venir, texte: null,
  };
}
const SYS_BILAN = `Tu écris, en français, le commentaire du bilan de la semaine d'un particulier qui débute en Bourse. Tu reçois des faits en JSON : la variation sur la semaine des entreprises et des ETF qu'il suit ou qu'il possède, la moyenne, les annonces officielles de la semaine et les prochaines dates.
Règles strictes :
- Explique la semaine de façon factuelle et pédagogique, en 120 à 220 mots, en deux ou trois courts paragraphes de texte suivi.
- Vouvoie le lecteur.
- Cite uniquement des chiffres présents dans les faits. N'invente aucun chiffre et aucune cause à un mouvement de cours : si la cause n'est pas dans les faits, dis qu'elle n'est pas connue.
- Explique simplement ce que représente un mouvement (par exemple : 8 % en une semaine, c'est beaucoup pour une grande entreprise).
- Aucun conseil d'achat ou de vente, aucune recommandation, aucune prédiction sur les cours.
- Pas de listes à puces, pas de titres, pas de tirets cadratins.
${REGLES}`;
const faitsIA = c => ({
  semaine: c.semaine, moyenne_semaine_pct: c.moyenne, nombre_de_lignes: c.lignes.length, hausses: c.hausses, baisses: c.baisses,
  lignes: c.lignes.filter(l => l.variation_semaine_pct != null).slice(0, 25).map(l => ({ nom: l.nom, variation_semaine_pct: l.variation_semaine_pct })),
  annonces: c.annonces.slice(0, 6).map(a => ({ entreprise: a.nom, date: a.date, type: a.type, chiffres: a.chiffres, lecture: a.lecture })),
  a_venir: c.a_venir.slice(0, 6).map(e => ({ entreprise: e.nom, date: e.date, evenement: e.label })),
});
let redige = rediger; // remplaçable dans les tests
export function _redacteur(f) { redige = f || rediger; }

// Bilan de la semaine en cours : construit ou rafraîchi si besoin (liste changée, chiffres de plus de 24 h, ou week-end : version définitive).
async function assurerBilan(env, d, compteId, keys, semaine, stocke) {
  const cles = [...keys].sort().join(","), auj = jourParis(), weekend = [0, 6].includes(jourSemaine(auj));
  let c = stocke ? parse(stocke.contenu, null) : null;
  const refaire = !c || c._cles !== cles || (!c._final && (Date.now() - c.genere > JOUR || weekend));
  if (!refaire) return { c, change: false };
  const n = faitsSemaine(d, keys, semaine);
  n._cles = cles; n._final = weekend; n._ia_n = (c && c._ia_n) || 0; n._ia_at = (c && c._ia_at) || 0;
  const utile = n.lignes.some(l => l.variation_semaine_pct != null) || n.annonces.length || n.a_venir.length;
  if (utile) await env.DB.prepare(`INSERT INTO bilans (compte, semaine, contenu, created, vu) VALUES (?, ?, ?, ?, 0) ON CONFLICT (compte, semaine) DO UPDATE SET contenu = excluded.contenu, vu = 0`).bind(compteId, semaine, JSON.stringify(n), Date.now()).run();
  return { c: n, change: true, stocke: !!utile };
}
async function commenter(env, compteId, c) { // au plus 4 essais par semaine, espacés de 6 h ; sans réponse, la page montre les chiffres
  if (c.texte || !c.lignes.length || (c._ia_n || 0) >= 4 || Date.now() - (c._ia_at || 0) < 6 * 36e5) return c;
  c._ia_n = (c._ia_n || 0) + 1; c._ia_at = Date.now();
  let t = null; try { t = await redige(env, { systeme: SYS_BILAN, utilisateur: JSON.stringify(faitsIA(c)), max_tokens: 600, temperature: 0.2 }); } catch (e) { }
  if (t && String(t).trim().length > 80) c.texte = String(t).replace(/—/g, ",").trim();
  await env.DB.prepare(`UPDATE bilans SET contenu = ? WHERE compte = ? AND semaine = ?`).bind(JSON.stringify(c), compteId, c.semaine).run();
  return c;
}
const publicBilan = c => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith("_")));

/* ---------- Routes ---------- */
export async function espace(request, env) {
  if (!env || !env.DB) return json({ error: "L'espace personnel est indisponible pour le moment." }, 503);
  await init(env.DB);
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, ""), m = request.method;
  if (m !== "GET" && m !== "HEAD" && path !== "/api/espace/tache") { // formulaires d'un autre site : refusés
    const o = request.headers.get("origin"); if (o && o !== "null") { try { if (new URL(o).host !== url.host) return json({ error: "Origine refusée." }, 403); } catch (e) { return json({ error: "Origine refusée." }, 403); } }
  }
  if (path === "/api/espace/tache" && m === "POST") return tache(request, env, url);

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
    const [d, nl, sess] = await Promise.all([
      env.DB.prepare(`SELECT favoris, portefeuille, profil, updated FROM donnees WHERE compte = ?`).bind(c.id).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM notifs WHERE compte = ? AND lu = 0`).bind(c.id).first(),
      env.DB.prepare(`SELECT h, expires FROM sessions WHERE h = ?`).bind(await sha256hex(cookieSession(request))).first()]);
    const p = await premiumDe(env, c.premium, url.origin);
    const dernier = await env.DB.prepare(`SELECT semaine, vu FROM bilans WHERE compte = ? ORDER BY semaine DESC LIMIT 1`).bind(c.id).first();
    const r = json({ connecte: true, email: c.email, premium: !!p, plan: p ? p.plan : null, premium_jusqu_au: p ? p.until : null,
      donnees: { favoris: parse(d && d.favoris, []) || [], portefeuille: parse(d && d.portefeuille, null), profil: parse(d && d.profil, null), maj: d ? d.updated : null },
      nonlus: (nl && nl.n) || 0, teaser: !!c.teaser, mail: mailReady(env), cree: c.created,
      bilan: dernier ? { semaine: dernier.semaine, vu: !!dernier.vu } : null });
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

  if (path === "/api/espace/preferences" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    if (typeof b.teaser !== "boolean") return json({ error: "Préférence invalide." }, 400);
    await env.DB.prepare(`UPDATE comptes SET teaser = ? WHERE id = ?`).bind(b.teaser ? 1 : 0, c.id).run();
    return json({ ok: true, teaser: b.teaser, mail: mailReady(env) });
  }

  if (path === "/api/espace/supprimer" && m === "POST") {
    const { b, err } = await lire(request); if (err) return err;
    const cles = ["e:" + c.email]; if (await limite(env, cles)) return TROP();
    if (!(await verifie(String(b.motdepasse || "").slice(0, 200), c))) { await echec(env, cles); return json({ error: "Mot de passe incorrect." }, 401); }
    for (const q of [`DELETE FROM notifs WHERE compte = ?`, `DELETE FROM bilans WHERE compte = ?`, `DELETE FROM donnees WHERE compte = ?`, `DELETE FROM sessions WHERE compte = ?`, `DELETE FROM comptes WHERE id = ?`]) await env.DB.prepare(q).bind(c.id).run();
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

  if (path === "/api/espace/bilan" && m === "GET") {
    const auj = jourParis(), cur = semaineIso(auj), semaine = url.searchParams.get("semaine") || cur;
    if (!/^\d{4}-W\d{2}$/.test(semaine)) return json({ error: "Semaine invalide (format 2026-W44)." }, 400);
    let row = await env.DB.prepare(`SELECT contenu, vu FROM bilans WHERE compte = ? AND semaine = ?`).bind(c.id, semaine).first(), b = row ? parse(row.contenu, null) : null;
    if (semaine === cur) {
      const d = await siteData(request, env), don = await env.DB.prepare(`SELECT favoris, portefeuille FROM donnees WHERE compte = ?`).bind(c.id).first();
      const r = await assurerBilan(env, d, c.id, clesDe(don, d.names), cur, row); b = r.c;
      if (r.change && !r.stocke) b = { ...b, vide: true };
    } else if (!b || semaine > cur) return json({ error: "Aucun bilan pour cette semaine." }, 404);
    if (b && !b.vide && (semaine === cur || semaine === semainePrecedente(auj))) b = await commenter(env, c.id, b);
    await env.DB.prepare(`UPDATE bilans SET vu = 1 WHERE compte = ? AND semaine = ?`).bind(c.id, semaine).run();
    const hist = ((await env.DB.prepare(`SELECT semaine, contenu FROM bilans WHERE compte = ? AND semaine <> ? ORDER BY semaine DESC LIMIT 12`).bind(c.id, semaine).all()).results || [])
      .map(h => ({ semaine: h.semaine, moyenne: (parse(h.contenu, {}) || {}).moyenne ?? null }));
    return json({ ...publicBilan(b), provisoire: semaine === cur && !b._final, historique: hist });
  }

  if (path === "/api/espace/notifs" && m === "GET") {
    const rows = (await env.DB.prepare(`SELECT id, at, type, texte, lien, lu FROM notifs WHERE compte = ? ORDER BY at DESC, id DESC LIMIT 50`).bind(c.id).all()).results || [];
    return json({ notifs: rows.map(r => ({ ...r, lu: !!r.lu })), nonlus: rows.filter(r => !r.lu).length });
  }
  if (path === "/api/espace/notifs/lu" && m === "POST") {
    await env.DB.prepare(`UPDATE notifs SET lu = 1 WHERE compte = ? AND lu = 0`).bind(c.id).run();
    return json({ ok: true });
  }
  return json({ error: "Introuvable." }, 404);
}

/* ---------- Robot : alertes chaque soir, bilan prêt le samedi matin ---------- */
async function notifier(env, compteId, type, texte, lien, jour, extra = "") {
  const r = await env.DB.prepare(`INSERT OR IGNORE INTO notifs (compte, at, type, texte, lien, cle) VALUES (?, ?, ?, ?, ?, ?)`).bind(compteId, Date.now(), type, texte.slice(0, 400), lien, [type, lien, jour, extra].join("|").slice(0, 500)).run();
  return (r && r.meta && r.meta.changes) || 0;
}
async function tache(request, env, url) {
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) return json({ error: "Non autorisé." }, 403);
  const quoi = url.searchParams.get("quoi"), auj = jourParis(), wd = jourSemaine(auj), sem = semaineIso(auj), now = Date.now();
  const modeBilan = quoi === "bilan" || (!quoi && wd === 6), cutoff = now - 6 * 36e5;
  const W = modeBilan ? `(c.last_tache < ? OR c.last_semaine IS NOT ?)` : `c.last_tache < ?`, B = modeBilan ? [cutoff, sem] : [cutoff];
  const rows = (await env.DB.prepare(`SELECT c.id, c.email, c.teaser, c.last_tache, c.last_semaine, d.favoris, d.portefeuille FROM comptes c LEFT JOIN donnees d ON d.compte = c.id WHERE ${W} ORDER BY c.id LIMIT 100`).bind(...B).all()).results || [];
  let notifs = 0, mails = 0, bilans = 0;
  if (rows.length) {
    const d = await siteData(request, env), demain = jourParis(now + JOUR), ouvre = wd >= 1 && wd <= 5, origin = (env.SITE_URL || url.origin).replace(/\/+$/, "");
    let cap = modeBilan && mailReady(env) ? await mailCapacity(env) : 0;
    for (const r of rows) {
      const keys = clesDe(r, d.names).filter(k => d.names[k]), ids = new Set(keys.filter(k => k.startsWith("c:")).map(k => k.slice(2)));
      if (keys.length && r.last_tache < cutoff) {
        const depuis = jourParis(Math.max(r.last_tache || 0, now - 2 * JOUR));
        for (const [u, a] of Object.entries(d.ana)) if (a && ids.has(a.id) && a.date >= depuis && a.chiffres && a.chiffres.length)
          notifs += await notifier(env, r.id, "annonce", `${d.names["c:" + a.id]} : ${a.type || "nouvelle publication"}. ${a.chiffres.slice(0, 3).map(x => x.join(" : ")).join(" ; ")}.`, "/entreprise/" + a.id + "/actualite", a.date, u);
        if (ouvre) for (const k of keys) { const p = d.px[k]; if (p && p.chg != null && Math.abs(p.chg) >= 5)
          notifs += await notifier(env, r.id, "mouvement", `${d.names[k]} : ${sgnP(p.chg)} aujourd'hui. Un mouvement de cette taille suit souvent une annonce : regardez son actualité.`, lienDe(k), auj); }
        for (const e of d.ev) if (e && ids.has(e.id) && e.date === demain)
          notifs += await notifier(env, r.id, /r[ée]sultat/i.test(e.type || e.label || "") ? "resultats" : "agenda", `${d.names["c:" + e.id]} : demain, ${e.label || e.type}.`, "/entreprise/" + e.id + "/agenda", e.date);
      }
      if (modeBilan && r.last_semaine !== sem && keys.length) {
        const st = await env.DB.prepare(`SELECT contenu FROM bilans WHERE compte = ? AND semaine = ?`).bind(r.id, sem).first();
        const b = await assurerBilan(env, d, r.id, keys, sem, st); // les chiffres seulement : le commentaire est rédigé à la visite
        if (b.stocke !== false) {
          bilans++;
          notifs += await notifier(env, r.id, "bilan", "Votre bilan de la semaine est prêt.", "/espace", sem);
          if (r.teaser && cap > 0) { try { await sendMail(env, r.email, "Votre bilan de la semaine est prêt",
            `Bonjour,\n\nVotre bilan de la semaine est prêt sur bilan. :\n${origin}/espace\n\nVous recevez ce message parce que vous l'avez demandé dans votre espace. Pour ne plus le recevoir, décochez l'option dans votre espace.\n\nbilan. Informations factuelles, sans conseil en investissement.`,
            `<div style="background:#F8F5EE;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#111214"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E6E0D4;border-radius:14px;padding:24px"><p style="font:900 26px Georgia,serif;margin:0">bilan<span style="color:#0E6B4A">.</span></p><p style="font-size:17px;margin:16px 0">Votre bilan de la semaine est prêt.</p><p><a href="${origin}/espace" style="background:#111214;color:#fff;padding:10px 16px;border-radius:99px;text-decoration:none;font-weight:600">Voir mon bilan</a></p><p style="font-size:12px;color:#87827A;margin-top:22px">Vous recevez ce message parce que vous l'avez demandé. Pour ne plus le recevoir, décochez l'option dans votre espace.</p></div></div>`); mails++; cap--; } catch (e) { cap = 0; } }
        }
      }
      await env.DB.prepare(modeBilan ? `UPDATE comptes SET last_tache = ?, last_semaine = ? WHERE id = ?` : `UPDATE comptes SET last_tache = ? WHERE id = ?`).bind(...(modeBilan ? [now, sem, r.id] : [now, r.id])).run();
    }
    await env.DB.prepare(`DELETE FROM notifs WHERE at < ?`).bind(now - 90 * JOUR).run(); // ménage
    await env.DB.prepare(`DELETE FROM essais WHERE at < ?`).bind(now - JOUR).run();
    await env.DB.prepare(`DELETE FROM sessions WHERE expires < ?`).bind(now).run();
  }
  const reste = ((await env.DB.prepare(`SELECT COUNT(*) AS n FROM comptes c WHERE ${W}`).bind(...B).first()) || {}).n || 0;
  return json({ traites: rows.length, reste, notifs, bilans, mails, mode: modeBilan ? "bilan" : "alertes" });
}
