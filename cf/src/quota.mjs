// Quotas hebdomadaires des gratuits hors IA (4/11/2026, décision de Romain) : 5 comparaisons d'entreprises par semaine,
// avec ou sans compte (compteur sur l'appareil ET sur le compte, remis à zéro le lundi, heure UTC). Premium : sans limite.
// POST /api/quota/comparer { ids: [...] } → { ok, reste, plafond, premium }
// Une comparaison = un ensemble d'entreprises. Rouvrir la même, ou y ajouter une entreprise, ne compte pas de nouveau.
import { visiteurSemaine, sessionCompte, premiumOf } from "./compte.mjs";
const json = (o, status = 200) => Response.json(o, { status, headers: { "cache-control": "no-store" } });
const lundi = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
export const PLAFONDS = { comparer: 3 }; // 6/11 (Romain) : 3 par semaine (avant : 5)
export async function quota(request, env) {
  const url = new URL(request.url), quoi = url.pathname.split("/")[3];
  if (!PLAFONDS[quoi]) return json({ error: "Introuvable" }, 404);
  const plafond = +env.COMPARER_GRATUIT_SEMAINE || PLAFONDS[quoi];
  const p = await premiumOf(request, env).catch(() => null);
  if (p) return json({ ok: true, premium: true, reste: null, plafond: null });
  if (!env.DB) return json({ ok: true, reste: plafond, plafond, erreur: "base" }); // jamais bloquer à cause d'une panne
  let ids = [];
  if (request.method === "POST") { try { const b = await request.json(); ids = [...new Set((b.ids || []).map(String).filter(x => /^[a-z0-9-]{1,80}$/.test(x)))].sort().slice(0, 10); } catch (e) { } }
  const c = await sessionCompte(request, env).catch(() => null), H = [await visiteurSemaine(request, env), ...(c && c.id ? ["c:" + c.id] : [])], sem = lundi();
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS quotas (semaine TEXT NOT NULL, quoi TEXT NOT NULL, h TEXT NOT NULL, cle TEXT NOT NULL, PRIMARY KEY (semaine, quoi, h, cle))`).run();
    const deja = new Map(); // h → ensembles déjà comptés
    for (const h of H) deja.set(h, ((await env.DB.prepare(`SELECT cle FROM quotas WHERE semaine = ? AND quoi = ? AND h = ?`).bind(sem, quoi, h).all()).results || []).map(r => r.cle));
    const n = Math.max(...H.map(h => deja.get(h).length));
    if (request.method !== "POST" || ids.length < 2) return json({ ok: n < plafond, reste: Math.max(0, plafond - n), plafond });
    const cle = ids.join(","), inclus = k => k.split(",").every(x => ids.includes(x));
    if (H.some(h => deja.get(h).some(inclus))) { // même comparaison, ou une entreprise ajoutée : l'ensemble compté est remplacé
      for (const h of H) { const old = deja.get(h).find(inclus); if (old && old !== cle) await env.DB.prepare(`UPDATE OR IGNORE quotas SET cle = ? WHERE semaine = ? AND quoi = ? AND h = ? AND cle = ?`).bind(cle, sem, quoi, h, old).run(); else if (!old) await env.DB.prepare(`INSERT OR IGNORE INTO quotas VALUES (?, ?, ?, ?)`).bind(sem, quoi, h, cle).run(); }
      return json({ ok: true, reste: Math.max(0, plafond - n), plafond });
    }
    if (n >= plafond) return json({ ok: false, reste: 0, plafond });
    for (const h of H) await env.DB.prepare(`INSERT OR IGNORE INTO quotas VALUES (?, ?, ?, ?)`).bind(sem, quoi, h, cle).run();
    if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM quotas WHERE semaine < ?`).bind(sem).run();
    return json({ ok: true, reste: Math.max(0, plafond - n - 1), plafond });
  } catch (e) { return json({ ok: true, reste: plafond, plafond, erreur: "base" }); }
}
