// Sonde « archi » : les fournisseurs d'IA compatibles OpenAI acceptent-ils un appel direct depuis le navigateur (CORS) ?
// On envoie la requête préliminaire (OPTIONS) qu'enverrait un navigateur depuis le site, puis un POST sans clé
// (réponse 401 attendue) pour voir si l'erreur reste lisible. Aucune clé n'est utilisée.
const ORIGIN = "https://repere-bourse.pages.dev";
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const CIBLES = {
  mistral: "https://api.mistral.ai/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
};
const H = ["access-control-allow-origin", "access-control-allow-headers", "access-control-allow-methods", "access-control-allow-credentials"];
const out = {};
for (const [nom, url] of Object.entries(CIBLES)) {
  const r = { url };
  try {
    const p = await fetch(url, { method: "OPTIONS", headers: { origin: ORIGIN, "access-control-request-method": "POST", "access-control-request-headers": "authorization,content-type", "user-agent": UA } });
    r.preflight = { status: p.status, ...Object.fromEntries(H.map(h => [h, p.headers.get(h)])) };
  } catch (e) { r.preflight = { erreur: String(e.message || e) }; }
  try {
    const p = await fetch(url, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", authorization: "Bearer cle-invalide-de-test", "user-agent": UA }, body: JSON.stringify({ model: "x", messages: [{ role: "user", content: "test" }], max_tokens: 1 }) });
    r.post = { status: p.status, "access-control-allow-origin": p.headers.get("access-control-allow-origin"), corps: (await p.text()).slice(0, 200) };
  } catch (e) { r.post = { erreur: String(e.message || e) }; }
  out[nom] = r; console.log(nom, JSON.stringify(r));
  await new Promise(s => setTimeout(s, 1500));
}
const fs = await import("node:fs");
fs.writeFileSync((process.env.SORTIE || ".") + "/cors.json", JSON.stringify(out, null, 1));
