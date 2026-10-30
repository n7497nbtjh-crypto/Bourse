// « Signaler une erreur » : un visiteur indique un chiffre ou un texte faux sur une page.
// Stockage D1 (table signalements, créée au premier appel). Pas d'adresse IP : une empreinte du jour seulement.
// Limite : 5 signalements par jour et par visiteur. Lecture réservée au robot ou à l'administrateur (en-tête x-admin-key = ADMIN_KEY).
import { json, adminOk } from "./compte.mjs";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS signalements (id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, quoi TEXT NOT NULL, texte TEXT NOT NULL, who TEXT NOT NULL, created INTEGER NOT NULL, traite INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS s_who ON signalements (who, created)`,
];
let ready = false;
async function init(db) { if (ready) return; for (const q of SCHEMA) await db.prepare(q).run(); ready = true; }
export function _reset() { ready = false; }
const QUOI = ["chiffre", "texte", "ia", "lien", "autre"];

async function empreinte(request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const day = new Date().toISOString().slice(0, 10);
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + day + "|signaler"));
  return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function signaler(request, env) {
  if (!env.DB) return json({ error: "Service indisponible." }, 503);
  await init(env.DB);
  if (request.method === "GET") {
    if (!adminOk(request, env)) return json({ error: "Accès réservé." }, 403);
    const r = await env.DB.prepare(`SELECT id, page, quoi, texte, created, traite FROM signalements ORDER BY id DESC LIMIT 200`).all();
    return json({ items: r.results || [] });
  }
  if (request.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
  const page = String(b.page || "").slice(0, 200), quoi = QUOI.includes(b.quoi) ? b.quoi : "autre";
  const texte = String(b.texte || "").replace(/\s+/g, " ").trim().slice(0, 1000);
  if (!/^\/[a-z0-9/?=&%._-]*$/i.test(page)) return json({ error: "Page inconnue." }, 400);
  if (texte.length < 10) return json({ error: "Décrivez l'erreur en quelques mots (10 caractères au moins)." }, 400);
  const who = await empreinte(request), depuis = Date.now() - 86400000;
  const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM signalements WHERE who = ? AND created > ?`).bind(who, depuis).first();
  if (n && n.n >= 5) return json({ error: "Merci : vous avez déjà envoyé 5 signalements aujourd'hui." }, 429);
  await env.DB.prepare(`INSERT INTO signalements (page, quoi, texte, who, created) VALUES (?, ?, ?, ?, ?)`).bind(page, quoi, texte, who, Date.now()).run();
  return json({ ok: true });
}
