// IA du serveur : rotation des services gratuits, Workers AI facultatif, coupure totale, aucune clé exposée.
import { DatabaseSync } from "node:sqlite";
import { rediger, servicesIA, iaActive, etatPublic } from "../cf/src/llm.mjs";
import { assistant } from "../cf/src/ia.mjs";
import { demande } from "../cf/src/demande.mjs";
const sql = new DatabaseSync(":memory:");
const stmt = (q, p = []) => ({ bind: (...a) => stmt(q, a), all: async () => ({ results: sql.prepare(q).all(...p) }), first: async () => sql.prepare(q).get(...p) ?? null, run: async () => ({ meta: { changes: Number(sql.prepare(q).run(...p).changes) } }) });
const DB = { prepare: q => stmt(q) };
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "ÉCHEC ") + m); if (!c) fails++; };
const appels = []; let panne = new Set();
globalThis.fetch = async (u, o = {}) => { u = String(u); const h = u.split("/")[2]; appels.push(h);
  if (panne.has(h)) return new Response("{}", { status: 503 });
  return new Response(JSON.stringify({ choices: [{ message: { content: "Réponse de " + h + " assez longue pour être acceptée." } }] })); };
let aiRuns = 0; const AI = { run: async () => { aiRuns++; return { response: "Réponse de Workers AI assez longue pour être acceptée." } } };
const msg = { systeme: "s", utilisateur: "u" };

ok((await rediger({}, msg)) === null && !iaActive({}), "aucune clé, aucun Workers AI : pas d'IA serveur, aucune erreur");
ok(servicesIA({ AI, IA_WORKERS_AI: "off" }).length === 0, "IA_WORKERS_AI=off désactive Workers AI");
ok(servicesIA({ AI }).join() === "workers-ai", "Workers AI seul quand il est branché");
const tout = { DB, AI, MISTRAL_KEY: "m", GROQ_KEY: "g", GEMINI_KEY: "ge", OPENROUTER_KEY: "o" };
ok(servicesIA(tout).join() === "mistral,groq,gemini,openrouter,workers-ai", "ordre : services gratuits d'abord, Workers AI en dernier");
appels.length = 0; let t = await rediger(tout, msg); ok(/api\.mistral\.ai/.test(t) && appels.length === 1, "Mistral répond en premier");
panne = new Set(["api.mistral.ai", "api.groq.com"]); appels.length = 0; t = await rediger(tout, msg);
ok(/generativelanguage/.test(t) && appels.length === 3, "Mistral et Groq en panne : Gemini prend le relais");
panne = new Set(["api.mistral.ai", "api.groq.com", "generativelanguage.googleapis.com", "openrouter.ai"]); aiRuns = 0; t = await rediger(tout, msg);
ok(/Workers AI/.test(t) && aiRuns === 1, "tous les services gratuits en panne : Workers AI en dernier recours");
aiRuns = 0; t = await rediger({ ...tout, IA_WORKERS_AI: "off" }, msg); ok(t === null && aiRuns === 0, "Workers AI désactivé : jamais appelé");
panne = new Set(); appels.length = 0; t = await rediger({ ...tout, IA_SERVEUR: "off" }, msg); ok(t === null && appels.length === 0 && !iaActive({ ...tout, IA_SERVEUR: "off" }), "IA_SERVEUR=off coupe toute l'IA du serveur");
const e = await (etatPublic({ MISTRAL_KEY: "secret-123", AI, IA_WORKERS_AI: "off" })).text();
ok(e.includes('"serveur":true') && e.includes("mistral") && !e.includes("secret-123"), "/api/ia/etat : noms des services, jamais de clé");
// Sans IA serveur : réponse 503 claire, et aucun quota consommé
const req = (path, body) => new Request("https://t.local" + path, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "2.2.2.2" }, body: JSON.stringify(body) });
let r = await assistant(req("/api/assistant", { question: "Quelle est sa marge ?", faits: {} }), { DB });
ok(r.status === 503 && (await r.json()).ia_serveur === false, "assistant sans IA serveur : 503 explicite");
r = await demande(req("/api/demande", { question: "entreprises peu endettées" }), { DB });
ok(r.status === 503, "demande sans IA serveur : 503 explicite");
let used = 0; try { used = sql.prepare("SELECT COUNT(*) n FROM usage").get().n; } catch (x) { used = 0; }
ok(used === 0, "aucun quota consommé quand le serveur n'a pas d'IA");
r = await assistant(req("/api/assistant", { question: "Quelle est sa marge ?", faits: {} }), { DB, GROQ_KEY: "g" });
ok(r.status === 200 && /groq/.test((await r.json()).txt), "assistant sans Workers AI, avec Groq seul : répond");
console.log(fails ? fails + " échec(s)" : "llm : tout est bon");
process.exit(fails ? 1 : 0);
