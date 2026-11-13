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
await check("/", 200, "ENKLAIR");
await check("/entreprise/lvmh", 200, "LVMH");
{ // 5e passage (B1) : image de partage propre à la fiche quand elle existe (cf/site/og/index.json), image générale sinon
  const h = await (await W.fetch(new Request("https://t.local/entreprise/lvmh"), env)).text(), og = (h.match(/property="og:image" content="([^"]+)"/) || [])[1] || "";
  const attendu = existsSync(new URL("./og/index.json", root)) && JSON.parse(readFileSync(new URL("./og/index.json", root))).ids.includes("lvmh") ? "/og/entreprise/lvmh.png" : "/icons/partage.png";
  if (!og.endsWith(attendu)) { bad++; console.log("ÉCART og:image", og, "attendu", attendu); } else console.log("ok  og:image", og);
  const h2 = await (await W.fetch(new Request("https://t.local/entreprise/danone"), env)).text(), og2 = (h2.match(/property="og:image" content="([^"]+)"/) || [])[1] || "";
  if (!/partage\.png$|\/og\/entreprise\/danone\.png$/.test(og2)) { bad++; console.log("ÉCART og:image danone", og2); }
}
await check("/entreprise/totalenergies", 200, "TotalEnergies");
await check("/actualites", 200, "Actualité");
await check("/entreprise/inconnue", 404, "introuvable");
await check("/lexique", 200, "Lexique");
await check("/entreprise/apple", 200, "Apple");
await check("/calc.js", 200);
await check("/nimporte.png", 404);
await check("/espace/reglages", 200, "Mon espace");
// 13/11 (recentrage) : les pages supprimées renvoient vers la page la plus proche
for (const [de, vers] of [["/portefeuille", "/"], ["/rapport-exemple", "/"], ["/connecteur", "/"], ["/espace/alertes", "/espace"], ["/espace/rapport", "/espace"], ["/espace/bilan", "/espace"], ["/apprendre", "/"], ["/debuter", "/"], ["/commencer", "/"], ["/academie", "/"], ["/academie/express/lire/per", "/"], ["/debuter/prix/per?x=1", "/?x=1"], ["/pea-cto", "/"], ["/idees-recues", "/"], ["/pourquoi-bilan", "/"], ["/simulateurs/epargne", "/outils"], ["/simulateurs/pea-cto", "/outils"], ["/outils/si-javais", "/outils"], ["/outils/verifier", "/outils"], ["/pronostics", "/outils"], ["/hier", "/actualites"], ["/demander", "/"], ["/espace/ia", "/espace"], ["/entreprise/lvmh/comptes", "/entreprise/lvmh#tous-les-chiffres"], ["/entreprise/lvmh/actualite?x=1", "/entreprise/lvmh?x=1#rf-agenda"]]) {
  const r = await W.fetch(new Request("https://t.local" + de), env), ok = r.status === 301 && r.headers.get("location") === "https://t.local" + vers;
  if (!ok) bad++; console.log(ok ? "ok " : "ÉCART", de, "→", r.status, r.headers.get("location")); }
{ const h = await (await W.fetch(new Request("https://t.local/entreprise/lvmh"), env)).text(), m = h.match(/<script type="application\/ld\+json">([^<]*)<\/script>/);
  let ok = false; try { const j = JSON.parse(m[1]); ok = j["@type"] === "FAQPage" && j.mainEntity.length >= 3 && j.mainEntity.every(q => q.name && q.acceptedAnswer.text); } catch (e) { }
  if (!ok) bad++; console.log(ok ? "ok " : "ÉCART", "/entreprise/lvmh : FAQ JSON-LD"); }
console.log(bad ? `${bad} écart(s)` : "0 écart"); process.exit(bad ? 1 : 0);
