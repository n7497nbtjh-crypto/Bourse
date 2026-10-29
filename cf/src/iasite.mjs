// L'IA du site (29 octobre 2026, à la demande de Romain : une IA sur le site, gratuite pour tous, sans clé ni compte).
// Cloudflare Workers AI, par la liaison AI du projet Pages : 10 000 « neurones » gratuits par jour et par compte
// (developers.cloudflare.com/workers-ai/platform/pricing, consulté le 29/10/2026). Le site s'arrête avant : plafond
// IA_NEURONES_JOUR (9 000 par défaut), compté dans la base D1. Au-delà, le site garde ses réponses calculées : aucun coût.
// Plafond par visiteur (IA_QUESTIONS_JOUR, 25 par défaut) : empreinte anonyme du jour (compte.mjs), jamais l'adresse IP.
// Les consignes sont celles du serveur (cf/src/consignes.mjs) : le navigateur choisit la tâche, pas le texte des consignes.
// Les questions partent chez Cloudflare (sous-traitant déjà utilisé pour l'hébergement) ; Workers AI ne s'en sert pas pour entraîner ses modèles.
import { CONSIGNES } from "./consignes.mjs";
import { visitor } from "./compte.mjs";

// Coût en neurones par million de jetons [entrée, sortie] (tarif Cloudflare d'octobre 2026). Le moins cher d'abord.
const MODELES = [
  ["@cf/qwen/qwen3-30b-a3b-fp8", 4625, 30475, "Qwen3 30B"],
  ["@cf/mistralai/mistral-small-3.1-24b-instruct", 31876, 50488, "Mistral Small 3.1"],
];
const jour = () => new Date().toISOString().slice(0, 10); // les limites de Cloudflare repartent à 0 h UTC
const jetons = s => Math.ceil(String(s).length / 3.2);
const nettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/g, "").replace(/—/g, ",").replace(/\*\*/g, "").trim();
const json = (o, status = 200) => Response.json(o, { status, headers: { "cache-control": "no-store" } });

let pret = false;
async function init(db) {
  if (pret || !db) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS ia_neurones (jour TEXT PRIMARY KEY, n REAL NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ia_visiteurs (jour TEXT NOT NULL, h TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (jour, h))`),
  ]);
  pret = true;
}
async function compteurs(env, h) {
  if (!env.DB) return { neurones: 0, questions: 0 };
  await init(env.DB);
  const [a, b] = await env.DB.batch([
    env.DB.prepare(`SELECT n FROM ia_neurones WHERE jour = ?`).bind(jour()),
    env.DB.prepare(`SELECT n FROM ia_visiteurs WHERE jour = ? AND h = ?`).bind(jour(), h),
  ]);
  return { neurones: (a.results[0] || {}).n || 0, questions: (b.results[0] || {}).n || 0 };
}
async function compter(env, h, neurones) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO ia_neurones (jour, n) VALUES (?, ?) ON CONFLICT (jour) DO UPDATE SET n = n + ?`).bind(jour(), neurones, neurones),
    env.DB.prepare(`INSERT INTO ia_visiteurs (jour, h, n) VALUES (?, ?, 1) ON CONFLICT (jour, h) DO UPDATE SET n = n + 1`).bind(jour(), h),
    env.DB.prepare(`DELETE FROM ia_visiteurs WHERE jour < ?`).bind(jour()),
  ]);
}
const plafonds = env => ({ neurones: +env.IA_NEURONES_JOUR || 9000, questions: +env.IA_QUESTIONS_JOUR || 25 });

/** GET /api/ia/etat et POST /api/ia/rediger { tache, user, max }. */
export async function iaSite(request, env) {
  const url = new URL(request.url), P = plafonds(env);
  const h = await visitor(request, env);
  if (url.pathname === "/api/ia/etat") {
    if (!env.AI) return json({ disponible: false, raison: "absente" });
    const c = await compteurs(env, h);
    return json({ disponible: c.neurones < P.neurones - 300 && c.questions < P.questions, reste_visiteur: Math.max(0, P.questions - c.questions), site_epuise: c.neurones >= P.neurones - 300, plafond_visiteur: P.questions });
  }
  if (url.pathname !== "/api/ia/rediger") return json({ error: "Introuvable" }, 404);
  if (request.method !== "POST") return json({ error: "Méthode non permise" }, 405);
  if (!env.AI) return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment." }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible" }, 400); }
  const sys = CONSIGNES[b && b.tache];
  if (!sys) return json({ error: "Tâche inconnue" }, 400);
  const user = String(b.user || "").slice(0, 15000), max = Math.min(Math.max(+b.max || 600, 200), 900);
  if (user.length < 3) return json({ error: "Question vide" }, 400);
  const c = await compteurs(env, h);
  if (c.questions >= P.questions) return json({ limite: "visiteur", message: `Vous avez posé ${P.questions} questions à l'IA du site aujourd'hui : c'est la limite quotidienne, pour que tout le monde y ait accès. Les réponses calculées restent disponibles, et l'IA revient demain.` }, 429);
  const messages = [{ role: "system", content: sys }, { role: "user", content: user }];
  for (const [model, cin, cout, nom] of MODELES) {
    const estime = (jetons(sys + user) * cin + max * cout) / 1e6;
    if (c.neurones + estime > P.neurones) continue;
    try {
      const msgs = model.includes("qwen3") ? [messages[0], { role: "user", content: user + "\n/no_think" }] : messages;
      const out = await env.AI.run(model, { messages: msgs, max_tokens: max, temperature: 0.2 });
      const raw = out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
      const txt = nettoie(raw && typeof raw === "object" ? JSON.stringify(raw) : raw);
      const u = out && out.usage, reel = u && u.prompt_tokens ? (u.prompt_tokens * cin + (u.completion_tokens || 0) * cout) / 1e6 : estime;
      await compter(env, h, reel);
      if (txt.length > 15) return json({ txt, modele: nom });
    } catch (e) { /* modèle suivant */ }
  }
  return json({ limite: "site", message: "L'IA du site a atteint sa limite gratuite pour aujourd'hui. Les réponses calculées restent disponibles, et l'IA revient demain." }, 429);
}
