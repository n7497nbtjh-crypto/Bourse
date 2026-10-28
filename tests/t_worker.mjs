// Vérifie que le Worker renvoie le bon titre pour chaque page et un 404 pour le reste.
import { readFileSync, existsSync } from "node:fs";
const { default: W } = await import("../cf/site/_worker.js");
const root = new URL("../cf/site/", import.meta.url);
const env = { ASSETS: { fetch: async (req) => {
  const p = new URL(req.url).pathname; const f = new URL("." + (p === "/" ? "/index.html" : p), root);
  if (!existsSync(f)) return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
  return new Response(readFileSync(f), { headers: { "content-type": p.endsWith(".json") ? "application/json" : p.endsWith(".js") ? "text/javascript" : "text/html" } });
} } };
let bad = 0;
const check = async (path, status, titlePart) => {
  const r = await W.fetch(new Request("https://t.local" + path), env);
  const t = (await r.text()).match(/<title>([^<]*)<\/title>/);
  const ok = r.status === status && (!titlePart || (t && t[1].includes(titlePart)));
  if (!ok) bad++;
  console.log(ok ? "ok " : "ÉCART", path, r.status, t ? t[1] : "");
};
await check("/", 200, "comptes à l'appui");
await check("/entreprise/lvmh", 200, "LVMH");
await check("/entreprise/totalenergies/comptes", 200, "TotalEnergies");
await check("/actualites", 200, "Actualité");
await check("/entreprise/inconnue", 404, "introuvable");
await check("/simulateurs/pea-cto", 200, "PEA");
await check("/lexique", 200, "Lexique");
await check("/data/courtiers.json", 200);
await check("/entreprise/apple", 200, "Apple");
await check("/calc.js", 200);
await check("/nimporte.png", 404);
console.log(bad ? `${bad} écart(s)` : "0 écart"); process.exit(bad ? 1 : 0);
