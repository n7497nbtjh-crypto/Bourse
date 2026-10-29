// « En clair pour un débutant » et « Ce que cela change pour l'entreprise » : deux courts paragraphes rédigés par l'IA du site
// (rotation Mistral, Groq, Workers AI via rediger(), aucun crédit Claude) à partir des faits que le robot a extraits d'une annonce.
//   POST /api/actu/clair  { k, faits }  réservé au robot (en-tête x-admin-key), résultat gardé en base (table actu_clair)
//   GET  /api/actu/clair?k=a,b,c         lecture seule du cache (au plus 30 clés)
// Le robot recopie les textes dans les fichiers /data/actu/*.json : les visiteurs les lisent sans appeler le serveur.
import { rediger, jsonDe } from "./llm.mjs";
import { REGLES } from "./regles.mjs";
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
let ready = false;
async function init(db) { if (ready) return; await db.prepare(`CREATE TABLE IF NOT EXISTS actu_clair (k TEXT PRIMARY KEY, clair TEXT NOT NULL, change TEXT NOT NULL, at INTEGER NOT NULL)`).run(); ready = true; }
export const SYS_CLAIR = `Tu expliques à une personne qui débute en Bourse une annonce officielle d'une entreprise cotée. Tu reçois des faits en JSON (type d'annonce, titre officiel, chiffres extraits du communiqué, phrases du communiqué, derniers comptes annuels).
Réponds uniquement par un objet JSON : {"clair": "...", "change": "..."}.
- "clair" : 2 ou 3 phrases courtes (60 mots au plus) qui disent ce qui est annoncé, avec les chiffres fournis et leur période, et expliquent chaque terme technique.
- "change" : 1 ou 2 phrases (45 mots au plus), factuelles, sur ce que cela change pour l'entreprise (ses ventes, sa rentabilité, sa dette, son périmètre, sa direction), sans parler du cours de Bourse.
- N'utilise que les faits fournis. Aucun chiffre qui n'y figure pas. Si un point manque, ne l'invente pas.
- Français, vouvoiement si besoin, phrases courtes, pas de tiret cadratin, pas de liste.
- Aucun conseil d'achat ou de vente, aucune prédiction.
${REGLES}`;
const propre = t => String(t || "").replace(/—/g, ",").replace(/\s+/g, " ").trim().slice(0, 600);
export async function clair(request, env) {
  if (!env || !env.DB) return json({ error: "Indisponible." }, 503);
  await init(env.DB);
  const u = new URL(request.url);
  if (request.method === "GET") {
    const ks = String(u.searchParams.get("k") || "").split(",").map(x => x.replace(/[^A-Za-z0-9_-]/g, "")).filter(Boolean).slice(0, 30);
    if (!ks.length) return json({ items: {} });
    const r = await env.DB.prepare(`SELECT k, clair, change FROM actu_clair WHERE k IN (${ks.map(() => "?").join(",")})`).bind(...ks).all();
    return json({ items: Object.fromEntries((r.results || []).map(x => [x.k, { c: x.clair, ch: x.change }])) });
  }
  if (request.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) return json({ error: "Réservé au robot du site." }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
  const k = String(b.k || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20); if (!k) return json({ error: "Clé manquante." }, 400);
  const hit = await env.DB.prepare(`SELECT clair, change FROM actu_clair WHERE k = ?`).bind(k).first();
  if (hit) return json({ clair: hit.clair, change: hit.change, cache: true });
  const faits = JSON.stringify(b.faits || {}).slice(0, 5000);
  const t = await rediger(env, { systeme: SYS_CLAIR, utilisateur: faits, max_tokens: 380, json: true });
  const j = jsonDe(t);
  if (!j || !j.clair || String(j.clair).length < 40) return json({ error: "Rédaction impossible pour le moment." }, 503);
  const c = propre(j.clair), ch = propre(j.change);
  await env.DB.prepare(`INSERT OR REPLACE INTO actu_clair (k, clair, change, at) VALUES (?, ?, ?, ?)`).bind(k, c, ch, Date.now()).run();
  return json({ clair: c, change: ch });
}
