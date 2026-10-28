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
];
let ready = false;
async function init(db) { if (ready) return; for (const q of SCHEMA) await db.prepare(q).run(); ready = true; }
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
    const r = await db.prepare(`SELECT id, room, pseudo, body, kind, parent, created, likes FROM messages WHERE room = ? AND hidden = 0 AND id < ? ORDER BY id DESC LIMIT 50`).bind(room, before).all();
    return json({ room, items: r.results || [] });
  }
  if (request.method === "GET" && path === "/api/communaute/recent") { // derniers messages, tous salons
    const r = await db.prepare(`SELECT id, room, pseudo, body, kind, created, likes FROM messages WHERE hidden = 0 ORDER BY id DESC LIMIT 30`).all();
    const t = await db.prepare(`SELECT room, COUNT(*) AS n FROM messages WHERE hidden = 0 AND created > ? GROUP BY room ORDER BY n DESC LIMIT 10`).bind(Date.now() - 7 * 864e5).all();
    return json({ items: r.results || [], rooms: t.results || [] });
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
    const r = await db.prepare(`INSERT INTO messages (room, pseudo, body, kind, parent, created, who) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(room, pseudo, body, kind, parent, now, me).first();
    return json({ ok: true, item: { id: r.id, room, pseudo, body, kind, parent, created: now, likes: 0 } }, 201);
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
