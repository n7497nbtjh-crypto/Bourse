// L'IA du site (29 octobre 2026, à la demande de Romain : une IA sur le site, gratuite pour tous, sans clé ni compte).
// Cloudflare Workers AI, par la liaison AI du projet Pages : 10 000 « neurones » gratuits par jour et par compte
// (developers.cloudflare.com/workers-ai/platform/pricing, consulté le 29/10/2026). Le site s'arrête avant : plafond
// IA_NEURONES_JOUR (9 000 par défaut), compté dans la base D1. Au-delà, le site garde ses réponses calculées : aucun coût.
// Trois niveaux (business plan du 29/10/2026) : visiteur sans compte IA_QUESTIONS_JOUR (3 par jour, empreinte anonyme du jour),
// compte gratuit IA_QUESTIONS_COMPTE (10 par jour, par compte), Premium IA_QUESTIONS_PREMIUM (150 par jour, usage raisonnable).
// Budget mensuel IA_BUDGET_MOIS (euros, 0 par défaut) : à 0, le site reste dans la part gratuite du jour ; au-delà de 0, il peut
// dépasser jusqu'à ce budget (0,011 $ les 1 000 neurones), puis l'IA s'arrête pour les gratuits ; Premium continue.
// Les consignes sont celles du serveur (cf/src/consignes.mjs) : le navigateur choisit la tâche, pas le texte des consignes.
// Les questions partent chez Cloudflare (sous-traitant déjà utilisé pour l'hébergement) ; Workers AI ne s'en sert pas pour entraîner ses modèles.
import { CONSIGNES } from "./consignes.mjs";
import { visitor, sessionCompte, premiumOf } from "./compte.mjs";

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
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_neurones (jour TEXT PRIMARY KEY, n REAL NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_visiteurs (jour TEXT NOT NULL, h TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (jour, h))`).run();
  pret = true;
}
const NEURONES_GRATUITS_JOUR = 10000, NEURONES_PAR_EURO = 99000; // 1 € ≈ 1,09 $ ≈ 99 000 neurones à 0,011 $ les 1 000
// Qui pose la question : Premium, compte gratuit ou visiteur anonyme ; h = clé du compteur
async function niveau(request, env) {
  const p = await premiumOf(request, env).catch(() => null);
  const c = p ? null : await sessionCompte(request, env).catch(() => null);
  if (p) return { niveau: "premium", h: "p:" + String(p.token).slice(0, 24) };
  if (c && c.id) return { niveau: "compte", h: "c:" + c.id };
  return { niveau: "visiteur", h: await visitor(request, env) };
}
// Les compteurs sont la garantie du coût nul : s'ils ne peuvent pas être lus, l'IA ne répond pas (erreur: true).
async function compteurs(env, h) {
  if (!env.DB) return { erreur: true, neurones: 0, questions: 0 };
  try {
    await init(env.DB);
    const a = await env.DB.prepare(`SELECT n FROM ia_neurones WHERE jour = ?`).bind(jour()).first();
    const b = await env.DB.prepare(`SELECT n FROM ia_visiteurs WHERE jour = ? AND h = ?`).bind(jour(), h).first();
    const m = await env.DB.prepare(`SELECT SUM(MAX(n - ?, 0)) AS p FROM ia_neurones WHERE jour LIKE ?`).bind(NEURONES_GRATUITS_JOUR, jour().slice(0, 7) + "%").first();
    return { neurones: (a && a.n) || 0, questions: (b && b.n) || 0, payes_mois: (m && m.p) || 0 };
  } catch (e) { return { erreur: true, neurones: 0, questions: 0, detail: String(e && e.message || e) }; }
}
async function compter(env, h, neurones) {
  if (!env.DB) return;
  await env.DB.prepare(`INSERT INTO ia_neurones (jour, n) VALUES (?, ?) ON CONFLICT (jour) DO UPDATE SET n = n + ?`).bind(jour(), neurones, neurones).run();
  await env.DB.prepare(`INSERT INTO ia_visiteurs (jour, h, n) VALUES (?, ?, 1) ON CONFLICT (jour, h) DO UPDATE SET n = n + 1`).bind(jour(), h).run();
  if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM ia_visiteurs WHERE jour < ?`).bind(jour()).run();
}
const plafonds = env => ({ neurones: +env.IA_NEURONES_JOUR || 9000, budget: Math.max(0, +env.IA_BUDGET_MOIS || 0) * NEURONES_PAR_EURO,
  questions: { visiteur: +env.IA_QUESTIONS_JOUR || 3, compte: +env.IA_QUESTIONS_COMPTE || 10, premium: +env.IA_QUESTIONS_PREMIUM || 150 } });
// Le site a-t-il encore de quoi répondre à un gratuit ? Dans la part gratuite du jour, ou dans le budget du mois.
const siteOk = (c, P, marge) => c.neurones + marge < P.neurones || (P.budget > 0 && c.payes_mois + marge < P.budget);

/** GET /api/ia/etat et POST /api/ia/rediger { tache, user, max }. */
export async function iaSite(request, env) {
  const url = new URL(request.url), P = plafonds(env);
  const { niveau: nv, h } = await niveau(request, env), plafond = P.questions[nv];
  if (url.pathname === "/api/ia/etat") {
    if (!env.AI) return json({ disponible: false, raison: "absente", niveau: nv });
    const c = await compteurs(env, h);
    if (c.erreur) return json({ disponible: false, raison: "compteur", detail: c.detail, niveau: nv });
    const epuise = nv !== "premium" && !siteOk(c, P, 300);
    return json({ disponible: !epuise && c.questions < plafond, reste_visiteur: Math.max(0, plafond - c.questions), site_epuise: epuise, plafond_visiteur: plafond, niveau: nv, plafonds: P.questions });
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
  if (c.erreur) return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment (compteur illisible)." }, 503);
  if (c.questions >= plafond) return json({ limite: "visiteur", niveau: nv, message: nv === "premium" ? `Vous avez posé ${plafond} questions à l'IA aujourd'hui, la limite d'usage raisonnable. Elle revient demain.`
    : `Vous avez posé vos ${plafond} questions rédigées du jour. Les réponses calculées restent disponibles, et l'IA revient demain.` }, 429);
  const messages = [{ role: "system", content: sys }, { role: "user", content: user }];
  for (const [model, cin, cout, nom] of MODELES) {
    const estime = (jetons(sys + user) * cin + max * cout) / 1e6;
    if (nv !== "premium" && !siteOk(c, P, estime)) continue; // Premium passe toujours : son abonnement paie la réponse
    try {
      const msgs = model.includes("qwen3") ? [messages[0], { role: "user", content: user + "\n/no_think" }] : messages;
      const out = await env.AI.run(model, { messages: msgs, max_tokens: max, temperature: 0.2 });
      const raw = out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
      const txt = nettoie(raw && typeof raw === "object" ? JSON.stringify(raw) : raw);
      const u = out && out.usage, reel = u && u.prompt_tokens ? (u.prompt_tokens * cin + (u.completion_tokens || 0) * cout) / 1e6 : estime;
      try { await compter(env, h, reel); } catch (e) { return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment (compteur en panne)." }, 503); }
      if (txt.length > 15) return json({ txt, modele: nom });
    } catch (e) { /* modèle suivant */ }
  }
  return json({ limite: "site", niveau: nv, message: P.budget > 0 ? "L'IA du site a atteint son budget du mois pour les visiteurs gratuits. Les réponses calculées restent disponibles ; Premium n'a pas cette limite." : "L'IA du site a atteint sa part gratuite pour aujourd'hui. Les réponses calculées restent disponibles, et l'IA revient demain." }, 429);
}
