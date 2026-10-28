// Accès aux modèles de langue, sur plusieurs services gratuits ou presque, utilisés à tour de rôle.
//
// Ordre d'essai (le premier qui répond gagne) :
//   1. Mistral (La Plateforme, offre gratuite « Experiment ») si MISTRAL_KEY est défini.
//      Environ 1 milliard de jetons par mois et par modèle, 1 requête par seconde. Les requêtes peuvent servir
//      à entraîner les modèles de Mistral : le site ne leur envoie que des données publiques et la question.
//   2. Groq (offre gratuite) si GROQ_KEY est défini : environ 1 000 requêtes et 200 000 jetons par jour.
//   3. Workers AI (Cloudflare), déjà branché : 10 000 « neurones » gratuits par jour. On utilise d'abord un
//      modèle économe (environ 5 fois moins cher que Mistral Small), puis Mistral Small s'il reste du budget.
//      Au-delà, avec l'offre Workers payante, 1 000 neurones coûtent 0,011 $ : environ 0,03 € pour 100 réponses.
//      IA_NEURONES_JOUR fixe le plafond quotidien (10 000 par défaut, à relever avec l'offre payante).
// Toutes les réponses identiques sont gardées en cache par les appelants (table resumes).

const TODAY = () => new Date().toISOString().slice(0, 10);
let ready = false;
export const DIAG = [];
const note = m => { DIAG.push(String(m).slice(0, 160)); if (DIAG.length > 6) DIAG.shift(); };
async function init(db) { if (ready || !db) return; await db.prepare(`CREATE TABLE IF NOT EXISTS ia_neurones (jour TEXT PRIMARY KEY, n REAL NOT NULL)`).run(); ready = true; }
async function neuronesUtilises(env) { await init(env.DB); const r = env.DB ? await env.DB.prepare(`SELECT n FROM ia_neurones WHERE jour = ?`).bind(TODAY()).first() : null; return r ? r.n : 0; }
async function ajouterNeurones(env, n) { if (!env.DB || !(n > 0)) return; await init(env.DB); await env.DB.prepare(`INSERT INTO ia_neurones (jour, n) VALUES (?, ?) ON CONFLICT (jour) DO UPDATE SET n = n + ?`).bind(TODAY(), n, n).run(); }

// Coût Workers AI en neurones par million de jetons [entrée, sortie] (tarif Cloudflare, octobre 2026)
const CF = [
  ["@cf/qwen/qwen3-30b-a3b-fp8", 4625, 30475],
  ["@cf/mistralai/mistral-small-3.1-24b-instruct", 31876, 50488],
];
const approxTokens = s => Math.ceil(String(s).length / 3.2);
const nettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/g, "").replace(/—/g, ",").replace(/\*\*/g, "").trim();

async function viaOpenAI(url, key, model, messages, max_tokens, temperature, json) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { method: "POST", signal: ctl.signal, headers: { authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens, temperature, ...(json ? { response_format: { type: "json_object" } } : {}) }) });
    if (!r.ok) { note(url.split('/')[2] + " " + r.status); return null; }
    const j = await r.json(), raw = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; return nettoie(raw && typeof raw === "object" ? JSON.stringify(raw) : raw);
  } catch (e) { note("fetch " + e.message); return null; } finally { clearTimeout(t); }
}

const FOURNISSEURS = [
  ["mistral", env => env.MISTRAL_KEY, (env, m, mt, te, js) => viaOpenAI("https://api.mistral.ai/v1/chat/completions", env.MISTRAL_KEY, env.MISTRAL_MODEL || "mistral-small-latest", m, mt, te, js)],
  ["groq", env => env.GROQ_KEY, (env, m, mt, te, js) => viaOpenAI("https://api.groq.com/openai/v1/chat/completions", env.GROQ_KEY, env.GROQ_MODEL || "openai/gpt-oss-20b", m, mt, te, js)],
  ["workers-ai", env => env.AI, async (env, messages, max_tokens, temperature, json, qualite) => {
    const plafond = +env.IA_NEURONES_JOUR || 10000;
    for (const [model, cin, cout] of (qualite ? [...CF].reverse() : CF)) {
      const estime = (approxTokens(messages.map(x => x.content).join(" ")) * cin + max_tokens * cout) / 1e6;
      if ((await neuronesUtilises(env)) + estime > plafond) { note(model + " plafond"); continue; }
      try {
        const msgs = model.includes("qwen3") ? messages.map((x, i) => i === messages.length - 1 ? { ...x, content: x.content + "\n/no_think" } : x) : messages;
        const out = await env.AI.run(model, { messages: msgs, max_tokens, temperature });
        const raw = out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content)), txt = nettoie(raw && typeof raw === "object" ? JSON.stringify(raw) : raw); // Workers AI renvoie parfois le JSON déjà décodé
        const u = out && out.usage, reel = u && u.prompt_tokens ? (u.prompt_tokens * cin + (u.completion_tokens || 0) * cout) / 1e6 : estime;
        await ajouterNeurones(env, reel);
        if (txt && txt.length > 15) return txt;
        note(model + " vide : " + JSON.stringify(out).slice(0, 120));
      } catch (e) { note(model + " " + (e.message || e)); }
    }
    return null;
  }],
];

/** Rédige un texte. Ne lève jamais d'erreur : renvoie null si aucun service n'a pu répondre. */
// qualite : true pour les textes qui expliquent (modèle plus fiable d'abord) ; false pour classer une demande (modèle économe d'abord)
export async function rediger(env, { systeme, utilisateur, max_tokens = 600, temperature = 0.2, json = false, qualite = true }) {
  const messages = [{ role: "system", content: systeme }, { role: "user", content: utilisateur }];
  for (const [nom, actif, appel] of FOURNISSEURS) {
    if (!actif(env)) continue;
    const t = await appel(env, messages, max_tokens, temperature, json, qualite);
    if (t) return t;
  }
  return null;
}
/** Extrait le premier objet JSON d'une réponse de modèle. */
export function jsonDe(t) {
  if (!t) return null; const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j <= i) return null; try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}
/** État des services (pour la page d'administration et les tests). */
export async function etatIA(env) {
  return { services: FOURNISSEURS.filter(([, a]) => a(env)).map(([n]) => n), neurones_utilises: Math.round(await neuronesUtilises(env)), plafond_neurones: +env.IA_NEURONES_JOUR || 10000 };
}
