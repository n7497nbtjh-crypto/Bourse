// /api/cours : cours différés lus dans la feuille Google publiée.
// 30/10/2026 : la feuille met souvent 5 à 10 secondes à répondre, et chaque visiteur qui tombait sur un cache vide attendait
// autant avant de voir la page. Désormais la réponse est immédiate : la dernière copie connue (gardée 24 h), ou à défaut le
// fichier du robot (/data/cours.json) ; la feuille est relue en arrière-plan quand la copie a plus de 10 minutes.
import { COURS_CSVS, parseCours } from "../../data/cours_config.mjs";
const FRAIS_MS = 10 * 60e3;

async function lireFeuille(request, env) {
  const items = {};
  for (const [i, u] of COURS_CSVS.entries()) { // première feuille obligatoire, seconde facultative (entreprises au-delà de ~1 260 lignes)
    const r = await fetch(u, { cf: { cacheTtl: 300 } }).catch(() => null);
    if (!r || !r.ok) { if (i === 0) throw new Error("feuille " + (r ? r.status : "injoignable")); continue; }
    Object.assign(items, parseCours(await r.text()));
  }
  if (Object.keys(items).length < 50) throw new Error("feuille incomplète");
  // Colonnes historiques vides ou titres absents de la feuille : on complète avec le fichier du robot (dernières valeurs connues)
  const j = await fichierRobot(request, env);
  if (j) { const HF = ["h52", "l52", "p1y", "p3y", "p5y"];
    for (const [k, v] of Object.entries(j.items || {})) { const it = items[k]; if (!it) { items[k] = j.updated ? { ...v, d: j.updated } : v; continue; } for (const f of HF) if (it[f] == null && v[f] != null) it[f] = v[f]; } }
  return { updated: new Date().toISOString(), source: "Google Finance, cours différés", items };
}
async function fichierRobot(request, env) {
  try { const f = env && env.ASSETS ? await env.ASSETS.fetch(new URL("/data/cours.json", request.url)) : await fetch(new URL("/data/cours.json", request.url)); return f.ok ? await f.json() : null; } catch (e) { return null; }
}
const reponse = (corps, age) => new Response(typeof corps === "string" ? corps : JSON.stringify(corps), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "x-cours-age": String(age) } });

export async function cours(request, ctx, env) {
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(new URL("/api/cours?copie=1", request.url).toString());
  const rafraichir = async () => { try { const j = await lireFeuille(request, env); if (cache) await cache.put(key, new Response(JSON.stringify(j), { headers: { "content-type": "application/json", "cache-control": "public, max-age=86400", "x-lu": String(Date.now()) } })); return j; } catch (e) { return null; } };
  const enFond = p => { if (ctx && ctx.waitUntil) ctx.waitUntil(p); };
  const hit = cache ? await cache.match(key) : null;
  if (hit) {
    const lu = +(hit.headers.get("x-lu") || 0), age = Date.now() - lu;
    if (age > FRAIS_MS) enFond(rafraichir());
    return reponse(await hit.text(), Math.round(age / 1000));
  }
  // Aucune copie dans ce centre de données : le fichier du robot tout de suite, la feuille en arrière-plan
  const j = await fichierRobot(request, env);
  if (j && j.items && Object.keys(j.items).length > 50) { enFond(rafraichir()); return reponse({ ...j, source: (j.source || "Google Finance") + " (copie du matin, mise à jour en cours)" }, -1); }
  const frais = await rafraichir();
  if (frais) return reponse(frais, 0);
  return Response.json({ error: "Cours indisponibles pour le moment" }, { status: 503 });
}
