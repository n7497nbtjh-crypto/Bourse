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
  // 5/11 : plus de fusion avec le fichier du robot ici (lire 650 ko de JSON en plus des feuilles dépassait sans doute le temps de
  // calcul permis au Worker : la copie gardée avait 20 h). La page fait la fusion elle-même (loadPrices dans app.js).
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

// Cours de la feuille complétés par le fichier du robot (cours Eulerpool, valeurs liquidatives, historiques) : pour les tâches du
// serveur (alertes, veille, connecteur MCP). Même règle que loadPrices dans app.js. Renvoie { updated, source, items }.
export async function coursComplets(request, ctx, env) {
  let j = {}; try { j = await (await cours(request, ctx, env)).json(); } catch (e) { }
  const items = j.items || {}, rob = await fichierRobot(request, env);
  if (rob && rob.items) for (const [k, v] of Object.entries(rob.items)) { const it = items[k];
    if (!it || (!(it.p > 0) && v.p > 0) || ((v.ep || v.vl) && v.d && (!it.d || v.d > it.d))) items[k] = it || !rob.updated || v.vl || v.ep ? v : { ...v, d: rob.updated };
    else for (const f of ["h52", "l52", "p1y", "p3y", "p5y"]) if (it[f] == null && v[f] != null) it[f] = v[f]; }
  return { ...j, items };
}
