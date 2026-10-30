import { adminOk } from "./compte.mjs";
// Espace communauté : analyses argumentées, questions-réponses, listes de suivi publiques, pronostics, avis.
// Une analyse est liée à une fiche (entreprise ou ETF) et suit un format fixe : thèse, arguments, risques, horizon.
// Les chiffres du site ne sont jamais saisis par le visiteur : la page les recalcule à l'affichage (exercice enregistré dans meta.ex).
// Stockage : base Cloudflare D1 liée au projet sous le nom DB. Les tables se créent seules au premier appel.
// Garde-fous : longueur limitée, pas de liens, 5 messages par 10 minutes et par visiteur, masquage après 3 signalements.
// Les adresses IP ne sont jamais stockées : seulement une empreinte qui change chaque jour.
// Modération : ADMIN_KEY (variable secrète à créer soi-même dans Cloudflare) permet de masquer un message.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, pseudo TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'avis', parent INTEGER, created INTEGER NOT NULL, who TEXT NOT NULL, likes INTEGER NOT NULL DEFAULT 0, reports INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS m_room ON messages (room, id)`,
  `CREATE INDEX IF NOT EXISTS m_who ON messages (who, created)`,
  `CREATE TABLE IF NOT EXISTS votes (msg INTEGER NOT NULL, who TEXT NOT NULL, kind TEXT NOT NULL, PRIMARY KEY (msg, who, kind))`,
  `CREATE TABLE IF NOT EXISTS avis (room TEXT NOT NULL, who TEXT NOT NULL, v INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (room, who))`,
];
// Colonnes ajoutées après coup : on tente de les créer, l'erreur « déjà présente » est ignorée
SCHEMA.push(
  `CREATE TABLE IF NOT EXISTS pronos (evt TEXT NOT NULL, who TEXT NOT NULL, v INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (evt, who))`,
  `CREATE TABLE IF NOT EXISTS partages (who TEXT PRIMARY KEY, lignes TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS listes (id INTEGER PRIMARY KEY AUTOINCREMENT, pseudo TEXT NOT NULL, titre TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', items TEXT NOT NULL, created INTEGER NOT NULL, who TEXT NOT NULL, cle TEXT NOT NULL, likes INTEGER NOT NULL DEFAULT 0, reports INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS l_who ON listes (who, created)`);
const ALTERS = [`ALTER TABLE messages ADD COLUMN tags TEXT NOT NULL DEFAULT ''`, `ALTER TABLE messages ADD COLUMN meta TEXT NOT NULL DEFAULT ''`];
let ready = false;
async function init(db) { if (ready) return; for (const q of SCHEMA) await db.prepare(q).run(); for (const q of ALTERS) { try { await db.prepare(q).run(); } catch (e) { } } ready = true; }
// Mentions dans un message : [[c:lvmh]] (entreprise) ou [[e:amundi-msci-world-pea]] (ETF)
export const mentions = body => [...new Set([...String(body).matchAll(/\[\[([ce]):([a-z0-9-]{1,60})\]\]/g)].map(m => (m[1] === "e" ? "etf-" : "") + m[2]))].slice(0, 5);
export function _reset() { ready = false; }

const KINDS = ["idee", "question", "avis", "analyse"];
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
async function who(request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const day = new Date().toISOString().slice(0, 10);
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + day + "|repere"));
  return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}
export const clean = s => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\n{3,}/g, "\n\n").trim();
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|fr|net|io|xyz|ru|ly|gg|me)\b)/i;
const BAD = /\b(enc[uo]l|connard|salope|pute|nique ta|ntm)\b/i;
const roomOk = r => /^[a-z0-9-]{1,60}$/.test(r);
const ficheOk = r => roomOk(r) && r !== "general" && r !== "questions"; // une analyse porte sur une entreprise ou un ETF
// Une analyse explique, elle ne donne pas d'ordre ni de promesse
const CONSIGNE = /(^|[^\p{L}])(achetez|vendez|ach[eè]te[sz]?[- ]la|vends[- ]la|foncez|all[- ]in|(gains?|rendements?|plus-values?|profits?|performances?) garanti(e|es|s)?|sans (aucun )?risque|100 ?% s[ûu]r|x ?10|objectif de cours|to the moon)(?![\p{L}\d])/iu;
const HORIZONS = ["court", "moyen", "long"];
const KEY = /^[ce]:[a-z0-9-]{1,60}$/;
const hex = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
const textOk = (...l) => l.some(x => LINK.test(x)) ? "Les liens ne sont pas autorisés." : l.some(x => BAD.test(x)) ? "Merci de rester courtois." : null;
// Contrôle d'une analyse argumentée : renvoie [erreur] ou [null, meta]
export function analyseOk(b) {
  const t = clean(b.these).replace(/\s+/g, " "), r = clean(b.risques), h = String(b.horizon || ""), body = clean(b.body);
  if (!ficheOk(String(b.room || ""))) return ["Une analyse se rattache à une entreprise ou à un ETF."];
  if (t.length < 10 || t.length > 140) return ["La thèse tient en une phrase de 10 à 140 caractères."];
  if (body.length < 80 || body.length > 2000) return ["Les arguments font entre 80 et 2 000 caractères."];
  if (r.length < 30 || r.length > 800) return ["Décrivez au moins un risque (30 à 800 caractères)."];
  if (!HORIZONS.includes(h)) return ["Choisissez un horizon."];
  const e = textOk(t, r, body); if (e) return [e];
  if ([t, r, body].some(x => CONSIGNE.test(x))) return ["Formulez une analyse, pas une consigne d'achat ou de vente ni une promesse de gain."];
  const ex = parseInt(b.ex, 10);
  return [null, { t, r, h, ...(ex >= 2000 && ex <= 2100 ? { ex } : {}) }];
}

export default async function communaute(request, env) {
  if (!env || !env.DB) return json({ error: "L'espace communauté n'est pas encore activé." }, 503);
  const db = env.DB, url = new URL(request.url), path = url.pathname.replace(/\/+$/, "");
  await init(db);
  if (request.method === "GET" && path === "/api/communaute") {
    const room = url.searchParams.get("room") || "general";
    if (!roomOk(room)) return json({ error: "Salon inconnu." }, 400);
    const before = parseInt(url.searchParams.get("before") || "0", 10) || 2 ** 52;
    // Les messages du salon, et ceux d'autres salons qui citent cette entreprise ou cet ETF
    const r = await db.prepare(`SELECT id, room, pseudo, body, kind, parent, created, likes, meta FROM messages WHERE (room = ? OR tags LIKE ?) AND hidden = 0 AND id < ? ORDER BY id DESC LIMIT 50`).bind(room, `%,${room},%`, before).all();
    return json({ room, items: r.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/avis") {
    const room = url.searchParams.get("room") || "";
    if (!roomOk(room)) return json({ error: "Salon inconnu." }, 400);
    const r = await db.prepare(`SELECT v, COUNT(*) AS n FROM avis WHERE room = ? AND at > ? GROUP BY v`).bind(room, Date.now() - 30 * 864e5).all();
    const o = { confiant: 0, neutre: 0, prudent: 0 };
    for (const x of r.results || []) o[x.v > 0 ? "confiant" : x.v < 0 ? "prudent" : "neutre"] = x.n;
    return json({ room, ...o });
  }
  if (request.method === "GET" && path === "/api/communaute/recent") { // derniers messages, tous salons
    const r = await db.prepare(`SELECT id, room, pseudo, body, kind, created, likes, meta FROM messages WHERE hidden = 0 ORDER BY id DESC LIMIT 30`).all();
    const t = await db.prepare(`SELECT room, COUNT(*) AS n FROM messages WHERE hidden = 0 AND created > ? GROUP BY room ORDER BY n DESC LIMIT 10`).bind(Date.now() - 7 * 864e5).all();
    return json({ items: r.results || [], rooms: t.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/questions") { // questions des visiteurs, avec le nombre de réponses
    const r = await db.prepare(`SELECT q.id, q.pseudo, q.body, q.created, q.likes, q.tags, (SELECT COUNT(*) FROM messages a WHERE a.parent = q.id AND a.hidden = 0) AS n FROM messages q WHERE q.kind = 'question' AND q.parent IS NULL AND q.hidden = 0 ORDER BY q.id DESC LIMIT 60`).all();
    return json({ items: r.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/fil") { // une question et ses réponses (les plus appréciées d'abord)
    const id = parseInt(url.searchParams.get("id") || "0", 10);
    const q = await db.prepare(`SELECT id, room, pseudo, body, kind, created, likes, meta FROM messages WHERE id = ? AND hidden = 0`).bind(id).first();
    if (!q) return json({ error: "Message introuvable." }, 404);
    const a = await db.prepare(`SELECT id, room, pseudo, body, kind, parent, created, likes FROM messages WHERE parent = ? AND hidden = 0 ORDER BY likes DESC, id ASC LIMIT 100`).bind(id).all();
    return json({ question: q, answers: a.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/analyses") { // analyses argumentées, d'une fiche ou de toutes
    const room = url.searchParams.get("room") || "", tri = url.searchParams.get("tri") === "recentes" ? "m.id DESC" : "m.likes DESC, m.id DESC";
    if (room && !ficheOk(room)) return json({ error: "Salon inconnu." }, 400);
    const r = await db.prepare(`SELECT m.id, m.room, m.pseudo, m.body, m.kind, m.created, m.likes, m.meta, (SELECT COUNT(*) FROM messages a WHERE a.parent = m.id AND a.hidden = 0) AS n FROM messages m WHERE m.kind = 'analyse' AND m.meta != '' AND m.parent IS NULL AND m.hidden = 0${room ? " AND m.room = ?" : ""} ORDER BY ${tri} LIMIT 40`).bind(...(room ? [room] : [])).all();
    return json({ items: r.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/listes") { // listes de suivi publiques
    const tri = url.searchParams.get("tri") === "recentes" ? "id DESC" : "likes DESC, id DESC";
    const r = await db.prepare(`SELECT id, pseudo, titre, note, items, created, likes FROM listes WHERE hidden = 0 ORDER BY ${tri} LIMIT 40`).all();
    return json({ items: r.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/liste") {
    const x = await db.prepare(`SELECT id, pseudo, titre, note, items, created, likes FROM listes WHERE id = ? AND hidden = 0`).bind(parseInt(url.searchParams.get("id") || "0", 10)).first();
    return x ? json({ item: x }) : json({ error: "Liste introuvable ou retirée." }, 404);
  }
  if (request.method === "GET" && path === "/api/communaute/pronos") { // pronostics : hausse ou baisse des ventes, par publication
    const ids = (url.searchParams.get("evt") || "").split(",").filter(x => /^[a-z0-9-]{1,60}:\d{4}-\d{2}-\d{2}$/.test(x)).slice(0, 80);
    if (!ids.length) return json({ items: {} });
    const r = await db.prepare(`SELECT evt, v, COUNT(*) AS n FROM pronos WHERE evt IN (${ids.map(() => "?").join(",")}) GROUP BY evt, v`).bind(...ids).all();
    const mine = await db.prepare(`SELECT evt, v FROM pronos WHERE who = ? AND evt IN (${ids.map(() => "?").join(",")})`).bind(await who(request), ...ids).all();
    const o = {}; for (const x of r.results || []) { o[x.evt] = o[x.evt] || { hausse: 0, baisse: 0 }; o[x.evt][x.v > 0 ? "hausse" : "baisse"] = x.n; }
    for (const x of mine.results || []) { o[x.evt] = o[x.evt] || { hausse: 0, baisse: 0 }; o[x.evt].moi = x.v; }
    return json({ items: o });
  }
  if (request.method === "GET" && path === "/api/communaute/portefeuilles") { // ce que détiennent les visiteurs qui ont partagé leur portefeuille
    const r = await db.prepare(`SELECT lignes FROM partages WHERE at > ?`).bind(Date.now() - 120 * 864e5).all();
    const tot = {}, held = {}; let n = 0;
    for (const x of r.results || []) { let l = []; try { l = JSON.parse(x.lignes); } catch (e) { continue; } n++; for (const [k, w] of l) { tot[k] = (tot[k] || 0) + w; held[k] = (held[k] || 0) + 1; } }
    const items = Object.entries(tot).map(([k, w]) => ({ k, poids: n ? w / n : 0, part: n ? held[k] / n : 0 })).sort((a, b) => b.part - a.part || b.poids - a.poids).slice(0, 25);
    return json({ n, items });
  }
  if (request.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  let b = {};
  try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
  const me = await who(request);
  if (path === "/api/communaute") {
    const room = String(b.room || "general"), pseudo = clean(b.pseudo).slice(0, 30), body = clean(b.body), kind = KINDS.includes(b.kind) ? b.kind : "avis";
    if (!roomOk(room)) return json({ error: "Salon inconnu." }, 400);
    if (pseudo.length < 2) return json({ error: "Choisissez un pseudo d'au moins 2 caractères." }, 400);
    let meta = "";
    if (b.these != null) { // analyse argumentée
      const [err, m] = analyseOk(b); if (err) return json({ error: err }, 400);
      const e = textOk(pseudo); if (e) return json({ error: e }, 400);
      if (b.website) return json({ ok: true });
      const jour = await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE who = ? AND created > ? AND meta != ''`).bind(me, Date.now() - 864e5).first();
      if (jour && jour.n >= 3) return json({ error: "Trois analyses par jour au plus : prenez le temps de les étayer." }, 429);
      meta = JSON.stringify(m);
    } else if (body.length < 3 || body.length > 1000) return json({ error: "Le message doit faire entre 3 et 1 000 caractères." }, 400);
    if (LINK.test(body) || LINK.test(pseudo)) return json({ error: "Les liens ne sont pas autorisés." }, 400);
    if (BAD.test(body) || BAD.test(pseudo)) return json({ error: "Merci de rester courtois." }, 400);
    if (b.website) return json({ ok: true }); // champ piège pour les robots
    const recent = await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE who = ? AND created > ?`).bind(me, Date.now() - 10 * 60e3).first();
    if (recent && recent.n >= 5) return json({ error: "Trop de messages d'affilée : réessayez dans quelques minutes." }, 429);
    const parent = meta ? null : Number.isInteger(b.parent) ? b.parent : null, k = meta ? "analyse" : kind;
    const now = Date.now();
    const tags = mentions(body);
    const r = await db.prepare(`INSERT INTO messages (room, pseudo, body, kind, parent, created, who, tags, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(room, pseudo, body, k, parent, now, me, tags.length ? "," + tags.join(",") + "," : "", meta).first();
    return json({ ok: true, item: { id: r.id, room, pseudo, body, kind: k, parent, created: now, likes: 0, meta } }, 201);
  }
  if (path === "/api/communaute/liste") { // publier une liste de suivi : titre, note facultative, 2 à 30 lignes
    const pseudo = clean(b.pseudo).slice(0, 30), titre = clean(b.titre).replace(/\s+/g, " "), note = clean(b.note);
    const items = [...new Set(Array.isArray(b.items) ? b.items.map(String).filter(x => KEY.test(x)) : [])].slice(0, 30);
    if (pseudo.length < 2) return json({ error: "Choisissez un pseudo d'au moins 2 caractères." }, 400);
    if (titre.length < 3 || titre.length > 80) return json({ error: "Le titre fait entre 3 et 80 caractères." }, 400);
    if (note.length > 400) return json({ error: "La note fait 400 caractères au plus." }, 400);
    if (items.length < 2) return json({ error: "Une liste contient au moins 2 entreprises ou ETF." }, 400);
    const e = textOk(pseudo, titre, note); if (e) return json({ error: e }, 400);
    if (CONSIGNE.test(titre) || CONSIGNE.test(note)) return json({ error: "Une liste de suivi décrit ce que vous suivez, pas ce qu'il faut acheter." }, 400);
    if (b.website) return json({ ok: true });
    const jour = await db.prepare(`SELECT COUNT(*) AS n FROM listes WHERE who = ? AND created > ?`).bind(me, Date.now() - 864e5).first();
    if (jour && jour.n >= 3) return json({ error: "Trois listes par jour au plus." }, 429);
    const cle = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
    const r = await db.prepare(`INSERT INTO listes (pseudo, titre, note, items, created, who, cle) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(pseudo, titre, note, JSON.stringify(items), Date.now(), me, await hex(cle)).first();
    return json({ ok: true, id: r.id, cle }, 201);
  }
  if (path === "/api/communaute/liste/retirer") { // seul l'auteur (la clé remise à la publication) peut retirer sa liste
    const id = parseInt(b.id, 10) || 0, x = await db.prepare(`SELECT cle FROM listes WHERE id = ?`).bind(id).first();
    if (!x || !b.cle || x.cle !== await hex(String(b.cle))) return json({ error: "Non autorisé." }, 403);
    await db.prepare(`UPDATE listes SET hidden = 1 WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }
  if (path === "/api/communaute/liste/utile" || path === "/api/communaute/liste/signaler") {
    const id = parseInt(b.id, 10); if (!id) return json({ error: "Liste inconnue." }, 400);
    const kind = path.endsWith("utile") ? "l:like" : "l:report";
    const ins = await db.prepare(`INSERT OR IGNORE INTO votes (msg, who, kind) VALUES (?, ?, ?)`).bind(id, me, kind).run();
    if (ins.meta && ins.meta.changes === 0) return json({ ok: true, deja: true });
    if (kind === "l:like") await db.prepare(`UPDATE listes SET likes = likes + 1 WHERE id = ?`).bind(id).run();
    else await db.prepare(`UPDATE listes SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= 3 THEN 1 ELSE hidden END WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }
  if (path === "/api/communaute/prono") {
    const evt = String(b.evt || ""), v = Math.sign(parseInt(b.v, 10) || 0);
    if (!/^[a-z0-9-]{1,60}:\d{4}-\d{2}-\d{2}$/.test(evt) || !v) return json({ error: "Pronostic invalide." }, 400);
    if (evt.slice(-10) < new Date().toISOString().slice(0, 10)) return json({ error: "Les résultats sont déjà publiés." }, 400);
    await db.prepare(`INSERT INTO pronos (evt, who, v, at) VALUES (?, ?, ?, ?) ON CONFLICT (evt, who) DO UPDATE SET v = excluded.v, at = excluded.at`).bind(evt, me, v, Date.now()).run();
    return json({ ok: true });
  }
  if (path === "/api/communaute/portefeuille") { // partage anonyme : seulement les lignes et leur poids
    const l = Array.isArray(b.lignes) ? b.lignes.filter(x => Array.isArray(x) && /^[ce]:[a-z0-9-]{1,60}$/.test(x[0]) && x[1] > 0).slice(0, 40) : [];
    if (b.retirer) { await db.prepare(`DELETE FROM partages WHERE who = ?`).bind(me).run(); return json({ ok: true }); }
    if (!l.length) return json({ error: "Portefeuille vide." }, 400);
    const sum = l.reduce((a, x) => a + +x[1], 0), norm = l.map(([k, w]) => [k, Math.round(+w / sum * 1000) / 1000]);
    await db.prepare(`INSERT INTO partages (who, lignes, at) VALUES (?, ?, ?) ON CONFLICT (who) DO UPDATE SET lignes = excluded.lignes, at = excluded.at`).bind(me, JSON.stringify(norm), Date.now()).run();
    return json({ ok: true });
  }
  if (path === "/api/communaute/avis") { // un avis par visiteur et par salon, modifiable
    const room = String(b.room || ""), v = Math.sign(parseInt(b.v, 10) || 0);
    if (!roomOk(room) || room === "general") return json({ error: "Salon inconnu." }, 400);
    await db.prepare(`INSERT INTO avis (room, who, v, at) VALUES (?, ?, ?, ?) ON CONFLICT (room, who) DO UPDATE SET v = excluded.v, at = excluded.at`).bind(room, me, v, Date.now()).run();
    return json({ ok: true });
  }
  if (path === "/api/communaute/aime" || path === "/api/communaute/signaler") {
    const id = parseInt(b.id, 10); if (!id) return json({ error: "Message inconnu." }, 400);
    const kind = path.endsWith("aime") ? "like" : "report";
    const ins = await db.prepare(`INSERT OR IGNORE INTO votes (msg, who, kind) VALUES (?, ?, ?)`).bind(id, me, kind).run();
    if (ins.meta && ins.meta.changes === 0) return json({ ok: true, deja: true });
    if (kind === "like") await db.prepare(`UPDATE messages SET likes = likes + 1 WHERE id = ?`).bind(id).run();
    else await db.prepare(`UPDATE messages SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= 3 THEN 1 ELSE hidden END WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }
  if (path === "/api/communaute/masquer") {
    if (!adminOk(request, env)) return json({ error: "Non autorisé." }, 403);
    await db.prepare(`UPDATE ${b.type === "liste" ? "listes" : "messages"} SET hidden = 1 WHERE id = ?`).bind(parseInt(b.id, 10)).run();
    return json({ ok: true });
  }
  return json({ error: "Introuvable." }, 404);
}
