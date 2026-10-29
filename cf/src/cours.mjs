// /api/cours : cours différés lus dans la feuille Google publiée, gardés 10 minutes en cache.
import { COURS_CSVS, parseCours } from "../../data/cours_config.mjs";
export async function cours(request, ctx, env) {
  const cache = caches.default, key = new Request(new URL("/api/cours", request.url).toString());
  const hit = await cache.match(key); if (hit) return hit;
  let body;
  try {
    const items = {};
    for (const [i, u] of COURS_CSVS.entries()) { // première feuille obligatoire, seconde facultative (entreprises au-delà de ~1 260 lignes)
      const r = await fetch(u, { cf: { cacheTtl: 300 } }).catch(() => null);
      if (!r || !r.ok) { if (i === 0) throw new Error("feuille " + (r ? r.status : "injoignable")); continue; }
      Object.assign(items, parseCours(await r.text()));
    }
    if (Object.keys(items).length < 50) throw new Error("feuille incomplète");
    // Colonnes historiques vides ou titres absents de la feuille : on complète avec le fichier du robot (dernières valeurs connues)
    try {
      const f = env && env.ASSETS ? await env.ASSETS.fetch(new URL("/data/cours.json", request.url)) : await fetch(new URL("/data/cours.json", request.url));
      if (f.ok) { const j = await f.json(), HF = ["h52", "l52", "p1y", "p3y", "p5y"];
        for (const [k, v] of Object.entries(j.items || {})) { const it = items[k]; if (!it) { items[k] = v; continue; } for (const h of HF) if (it[h] == null && v[h] != null) it[h] = v[h]; } }
    } catch (e) { }
    body = JSON.stringify({ updated: new Date().toISOString(), source: "Google Finance, cours différés", items });
  } catch (e) { return Response.json({ error: String(e.message || e) }, { status: 503 }); }
  const res = new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600" } });
  ctx && ctx.waitUntil ? ctx.waitUntil(cache.put(key, res.clone())) : await cache.put(key, res.clone());
  return res;
}
