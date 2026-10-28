// Articles de presse récents sur une entreprise ou sur les marchés, via GDELT (gdeltproject.org).
// GDELT recense la presse mondiale en continu ; son API est gratuite et ouverte, sans clé.
// On ne reprend que le titre, le site, la date et le lien : l'article se lit chez l'éditeur.
// Les réponses sont gardées 30 minutes en cache (GDELT limite le nombre d'appels).
const API = "https://api.gdeltproject.org/api/v2/doc/doc";
const TTL = 1800;
const CONTEXTE = "(bourse OR action OR actions OR résultats OR dividende OR chiffre OR stock OR shares OR earnings OR revenue OR results)";
export const SUJETS = {
  marches: { q: "theme:ECON_STOCKMARKET sourcelang:french", label: "Marchés, presse française" },
  monde: { q: "theme:ECON_STOCKMARKET sourcelang:english", label: "Marchés, presse internationale" },
};
export function queryFor(name) {
  const n = String(name).replace(/\s*\(.*$/, "").replace(/["()]/g, "").trim();
  return `"${n}" ${CONTEXTE} (sourcelang:french OR sourcelang:english)`;
}
// « 20261028T143000Z » -> ISO
const iso = s => /^\d{8}T\d{6}Z$/.test(s || "") ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z` : s;
export function normalize(j) {
  const seen = new Set(), out = [];
  for (const a of (j && j.articles) || []) {
    const t = String(a.title || "").trim(); if (!t || !a.url) continue;
    const k = t.toLowerCase().slice(0, 80); if (seen.has(k)) continue; seen.add(k);
    out.push({ title: t, url: a.url, site: a.domain || "", date: iso(a.seendate), lang: a.language || "", pays: a.sourcecountry || "" });
  }
  return out;
}
export default async function presse(request, index) {
  const u = new URL(request.url);
  const id = (u.searchParams.get("id") || "").replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const sujet = SUJETS[u.searchParams.get("sujet")] ? u.searchParams.get("sujet") : null;
  const c = id ? index.find(x => x.id === id) : null;
  if (!c && !sujet) return new Response(JSON.stringify({ error: "Sujet inconnu.", items: [] }), { status: 400, headers: { "content-type": "application/json; charset=utf-8" } });
  const api = new URL(API);
  api.searchParams.set("query", c ? queryFor(c.name) : SUJETS[sujet].q);
  api.searchParams.set("mode", "artlist"); api.searchParams.set("format", "json");
  api.searchParams.set("maxrecords", "40"); api.searchParams.set("sort", "datedesc");
  api.searchParams.set("timespan", c ? "21d" : "2d");
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(api.toString());
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let body, status = 200;
  try {
    const r = await fetch(api.toString(), { headers: { "user-agent": "bilan (site pedagogique)" }, cf: { cacheTtl: TTL } });
    if (!r.ok) throw new Error("GDELT " + r.status);
    const txt = await r.text();
    body = { source: "GDELT", items: normalize(txt.trim().startsWith("{") ? JSON.parse(txt) : {}) };
  } catch (e) { status = 502; body = { error: "La presse n'est pas disponible pour le moment.", items: [] }; }
  const res = new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${status === 200 ? TTL : 60}` } });
  if (cache && status === 200) await cache.put(key, res.clone());
  return res;
}
