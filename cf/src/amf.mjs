// Publications officielles des sociétés cotées, via l'API ouverte de l'AMF (info-financiere.gouv.fr).
// Accès libre, sans clé, Licence Ouverte. Quota : 10 000 appels par jour et par adresse IP.
// Les réponses sont gardées 15 minutes en cache pour rester loin du quota.
//
// Paramètres de /api/amf :
//   limit  (1 à 50, défaut 20)
//   q      recherche libre (nom de société)
//   isin   code ISIN d'une société
//   raw=1  renvoie la réponse brute de l'AMF (pour vérifier les noms de champs)
//
// Les noms exacts des champs n'ont pas pu être vérifiés en direct lors de l'écriture :
// la fonction normalize() les repère par motif, et raw=1 permet de contrôler.

const API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
const TTL = 900;

function pick(rec, tests) {
  for (const t of tests) {
    for (const [k, v] of Object.entries(rec)) {
      if (v == null || v === "" || typeof v === "object") continue;
      if (t(k, v)) return String(v);
    }
  }
  return "";
}

export function normalize(rec) {
  const r = rec.record && rec.record.fields ? rec.record.fields : rec; // v2.0 ou v2.1
  const date = r.uin_dat_amf || pick(r, [k => /dat/.test(k)]);
  const company = pick(r, [k => /nom_soc|raison_sociale|denomination/.test(k), k => /societe.*nom|nom.*societe/.test(k), k => /(^|_)nom($|_)/.test(k)]);
  const title = pick(r, [k => /tit/.test(k), k => /libelle|objet|intitule/.test(k)]);
  const type = r.subtype_of_information || pick(r, [k => /sous_type|subtype/.test(k), k => /type/.test(k) && !/mime|content/.test(k)]);
  const url = pick(r, [(k, v) => /^https?:\/\//.test(v) && /\.pdf/i.test(v), (k, v) => /^https?:\/\//.test(v)]);
  return {
    id: r.uin_idt_uin || "",
    date: String(date || "").slice(0, 19),
    isin: r.identificationsociete_iso_cd_isi || "",
    company, title: title || type || "Publication", type, url,
  };
}

export default async function amf(request, followed = []) {
  const u = new URL(request.url);
  const limit = Math.max(1, Math.min(50, parseInt(u.searchParams.get("limit") || "20", 10) || 20));
  const q = (u.searchParams.get("q") || "").replace(/["\\]/g, "").slice(0, 60).trim();
  const isin = (u.searchParams.get("isin") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const raw = u.searchParams.get("raw") === "1";
  const where = [];
  // suivies=1 : seulement les sociétés suivies par le site
  if (u.searchParams.get("suivies") === "1" && followed.length) where.push(`identificationsociete_iso_cd_isi in (${followed.map(i => `"${i}"`).join(",")})`);
  if (isin) where.push(`identificationsociete_iso_cd_isi="${isin}"`);
  if (q) where.push(`"${q}"`); // recherche plein texte
  const api = new URL(API);
  api.searchParams.set("limit", String(limit));
  api.searchParams.set("order_by", "uin_dat_amf desc");
  if (where.length) api.searchParams.set("where", where.join(" AND "));

  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(api.toString() + (raw ? "&_raw" : ""));
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }

  let body, status = 200;
  try {
    const r = await fetch(api.toString(), { headers: { accept: "application/json" }, cf: { cacheTtl: TTL } });
    if (!r.ok) throw new Error("AMF " + r.status);
    const j = await r.json();
    const list = j.results || j.records || [];
    body = raw ? j : { source: "AMF – info-financiere.gouv.fr", total: j.total_count ?? list.length, items: list.map(normalize) };
  } catch (e) {
    status = 502;
    body = { error: "Le flux de l'AMF est momentanément indisponible.", items: [] };
  }
  const res = new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${status === 200 ? TTL : 60}` },
  });
  if (cache && status === 200) await cache.put(key, res.clone());
  return res;
}
