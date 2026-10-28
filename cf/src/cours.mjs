// /api/cours : cours différés lus dans la feuille Google publiée, gardés 10 minutes en cache.
import { COURS_CSV, parseCours } from "../../data/cours_config.mjs";
export async function cours(request, ctx) {
  const cache = caches.default, key = new Request(new URL("/api/cours", request.url).toString());
  const hit = await cache.match(key); if (hit) return hit;
  let body;
  try {
    const r = await fetch(COURS_CSV, { cf: { cacheTtl: 300 } });
    if (!r.ok) throw new Error("feuille " + r.status);
    const items = parseCours(await r.text());
    if (Object.keys(items).length < 50) throw new Error("feuille incomplète");
    body = JSON.stringify({ updated: new Date().toISOString(), source: "Google Finance, cours différés", items });
  } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 503 }); }
  const res = new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600" } });
  ctx && ctx.waitUntil ? ctx.waitUntil(cache.put(key, res.clone())) : await cache.put(key, res.clone());
  return res;
}
