// Sonde « ia-simple » : « Connecter mon IA » (OpenRouter) fonctionne-t-il depuis le navigateur ?
// Préliminaires CORS (OPTIONS) depuis l'origine du site pour l'échange du code, la liste des modèles, l'état de la clé et l'appel du modèle,
// plus la liste publique des modèles (pour vérifier le filtre de cf/site/m/monia.js). Aucune clé n'est utilisée.
const ORIGIN = "https://repere-bourse.pages.dev";
const UA = "bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse)";
const H = ["access-control-allow-origin", "access-control-allow-headers", "access-control-allow-methods"];
const out = { pre: {}, get: {} };
const P = [["auth/keys", "POST", "content-type"], ["chat/completions", "POST", "authorization,content-type,http-referer,x-title"], ["key", "GET", "authorization"], ["models", "GET", ""]];
for (const [p, m, h] of P) {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/" + p, { method: "OPTIONS", headers: { origin: ORIGIN, "access-control-request-method": m, ...(h ? { "access-control-request-headers": h } : {}), "user-agent": UA } });
    out.pre[p] = { status: r.status, ...Object.fromEntries(H.map(x => [x, r.headers.get(x)])) };
  } catch (e) { out.pre[p] = { erreur: String(e.message || e) }; }
  await new Promise(s => setTimeout(s, 1000));
}
try {
  const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { origin: ORIGIN, "user-agent": UA } });
  const j = await r.json();
  out.get.models = { status: r.status, acao: r.headers.get("access-control-allow-origin"), n: (j.data || []).length,
    gratuits: (j.data || []).filter(m => /:free$/.test(m.id)).map(m => ({ id: m.id, name: m.name, ctx: m.context_length, created: m.created, arch: m.architecture && { i: m.architecture.input_modalities, o: m.architecture.output_modalities } })),
    familles: (j.data || []).filter(m => /^(mistralai|meta-llama|google|deepseek|qwen|openai|anthropic)\//.test(m.id)).map(m => ({ id: m.id, p: m.pricing && [m.pricing.prompt, m.pricing.completion], ctx: m.context_length, created: m.created, o: m.architecture && m.architecture.output_modalities })) };
} catch (e) { out.get.models = { erreur: String(e.message || e) }; }
try { const r = await fetch("https://openrouter.ai/api/v1/auth/keys", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", "user-agent": UA }, body: JSON.stringify({ code: "invalide", code_verifier: "x".repeat(43), code_challenge_method: "S256" }) });
  out.get.echange_invalide = { status: r.status, acao: r.headers.get("access-control-allow-origin"), corps: (await r.text()).slice(0, 200) }; } catch (e) { out.get.echange_invalide = { erreur: String(e.message || e) }; }
console.log(JSON.stringify(out.pre), JSON.stringify(out.get.echange_invalide), out.get.models && out.get.models.n);
const fs = await import("node:fs");
fs.writeFileSync((process.env.SORTIE || ".") + "/openrouter.json", JSON.stringify(out, null, 1));
