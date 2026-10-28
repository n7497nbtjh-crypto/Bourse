// Espace communauté : messages des visiteurs, par salon (général, une entreprise, un ETF).
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
  `CREATE TABLE IF NOT EXISTS partages (who TEXT PRIMARY KEY, lignes TEXT NOT NULL, at INTEGER NOT NULL)`);
const ALTERS = [`ALTER TABLE messages ADD COLUMN tags TEXT NOT NULL DEFAULT ''`];
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

export default async function communaute(request, env) {
  if (!env || !env.DB) return json({ error: "L'espace communauté n'est pas encore activé." }, 503);
  const db = env.DB, url = new URL(request.url), path = url.pathname.replace(/\/+$/, "");
  await init(db);
  if (request.method === "GET" && path === "/api/communaute") {
    const room = url.searchParams.get("room") || "general";
    if (!roomOk(room)) return json({ error: "Salon inconnu." }, 400);
    const before = parseInt(url.searchParams.get("before") || "0", 10) || 2 ** 52;
    // Les messages du salon, et ceux d'autres salons qui citent cette entreprise ou cet ETF
    const r = await db.prepare(`SELECT id, room, pseudo, body, kind, parent, created, likes FROM messages WHERE (room = ? OR tags LIKE ?) AND hidden = 0 AND id < ? ORDER BY id DESC LIMIT 50`).bind(room, `%,${room},%`, before).all();
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
    const r = await db.prepare(`SELECT id, room, pseudo, body, kind, created, likes FROM messages WHERE hidden = 0 ORDER BY id DESC LIMIT 30`).all();
    const t = await db.prepare(`SELECT room, COUNT(*) AS n FROM messages WHERE hidden = 0 AND created > ? GROUP BY room ORDER BY n DESC LIMIT 10`).bind(Date.now() - 7 * 864e5).all();
    return json({ items: r.results || [], rooms: t.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/questions") { // questions des visiteurs, avec le nombre de réponses
    const r = await db.prepare(`SELECT q.id, q.pseudo, q.body, q.created, q.likes, q.tags, (SELECT COUNT(*) FROM messages a WHERE a.parent = q.id AND a.hidden = 0) AS n FROM messages q WHERE q.kind = 'question' AND q.parent IS NULL AND q.hidden = 0 ORDER BY q.id DESC LIMIT 60`).all();
    return json({ items: r.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/fil") { // une question et ses réponses (les plus appréciées d'abord)
    const id = parseInt(url.searchParams.get("id") || "0", 10);
    const q = await db.prepare(`SELECT id, room, pseudo, body, kind, created, likes FROM messages WHERE id = ? AND hidden = 0`).bind(id).first();
    if (!q) return json({ error: "Question introuvable." }, 404);
    const a = await db.prepare(`SELECT id, room, pseudo, body, kind, parent, created, likes FROM messages WHERE parent = ? AND hidden = 0 ORDER BY likes DESC, id ASC LIMIT 100`).bind(id).all();
    return json({ question: q, answers: a.results || [] });
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
    if (body.length < 3 || body.length > 1000) return json({ error: "Le message doit faire entre 3 et 1 000 caractères." }, 400);
    if (LINK.test(body) || LINK.test(pseudo)) return json({ error: "Les liens ne sont pas autorisés." }, 400);
    if (BAD.test(body) || BAD.test(pseudo)) return json({ error: "Merci de rester courtois." }, 400);
    if (b.website) return json({ ok: true }); // champ piège pour les robots
    const recent = await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE who = ? AND created > ?`).bind(me, Date.now() - 10 * 60e3).first();
    if (recent && recent.n >= 5) return json({ error: "Trop de messages d'affilée : réessayez dans quelques minutes." }, 429);
    const parent = Number.isInteger(b.parent) ? b.parent : null;
    const now = Date.now();
    const tags = mentions(body);
    const r = await db.prepare(`INSERT INTO messages (room, pseudo, body, kind, parent, created, who, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(room, pseudo, body, kind, parent, now, me, tags.length ? "," + tags.join(",") + "," : "").first();
    return json({ ok: true, item: { id: r.id, room, pseudo, body, kind, parent, created: now, likes: 0 } }, 201);
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
    if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) return json({ error: "Non autorisé." }, 403);
    await db.prepare(`UPDATE messages SET hidden = 1 WHERE id = ?`).bind(parseInt(b.id, 10)).run();
    return json({ ok: true });
  }
  return json({ error: "Introuvable." }, 404);
}
