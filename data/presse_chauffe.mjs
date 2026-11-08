// 8/11 (Romain) : « une synthèse pour chaque entreprise, pour que les gens ne demandent plus chacun à l'IA de rédiger la même chose ».
// Le samedi et le dimanche, ce robot fait écrire à l'avance la synthèse de presse de la semaine (/api/ia/presse) des entreprises
// dont on a parlé, des plus grandes aux plus petites. Chaque synthèse est gardée par le site toute la semaine et servie à tous.
// Il s'arrête de lui-même à MAX par jour ou quand la part gratuite d'IA du jour est épuisée (il en laisse aux visiteurs).
import fs from "node:fs";
const SITE = process.env.SITE || "https://enklair.com", MAX = +(process.env.MAX || 25);
const auj = new Date(), j = auj.getUTCDay(), dim = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), auj.getUTCDate() + (j === 0 ? 0 : 7 - j)));
const au = dim.toISOString().slice(0, 10), du = new Date(dim - 6 * 864e5).toISOString().slice(0, 10);
let cours = {}; try { cours = JSON.parse(fs.readFileSync("cf/site/data/cours.json", "utf8")).items || {}; } catch { }
const soc = JSON.parse(fs.readFileSync("cf/site/data/societes.json", "utf8")).companies;
const C = [];
for (const s of soc) {
  let a; try { a = JSON.parse(fs.readFileSync(`cf/site/data/actu/c/${s.id}.json`, "utf8")); } catch { continue; }
  const n = (a.p || []).filter(x => x && x.u && String(x.d || "").slice(0, 10) >= du && String(x.d || "").slice(0, 10) <= au).length;
  if (n >= 2) C.push({ id: s.id, nom: s.name, cap: +((cours["c:" + s.id] || {}).cap || 0), n });
}
C.sort((a, b) => b.n - a.n || b.cap - a.cap); // les plus couvertes par la presse d'abord : ce sont celles des rapports
console.log(`Semaine du ${du} au ${au} : ${C.length} entreprises avec au moins 2 articles.`);
let faites = 0, deja = 0, refus = 0, vides = 0, suite = 0;
for (const c of C) {
  if (faites >= MAX) break;
  const t0 = Date.now();
  let r; try { r = await (await fetch(`${SITE}/api/ia/presse?k=c:${c.id}&au=${au}&nom=${encodeURIComponent(c.nom)}`, { headers: { "user-agent": "ENKLAIR robot presse (+https://enklair.com)" } })).json(); } catch (e) { r = { erreur: String(e) }; }
  if (r.clair) { if (Date.now() - t0 < 1500) deja++; else { faites++; suite = 0; } console.log(`✓ ${c.nom} (${r.n} articles)`); }
  else if (r.vide) vides++;
  else { refus++; console.log(`· ${c.nom} : ${r.raison || r.erreur || "indisponible"}`); if (!r.raison && ++suite >= 3) { console.log("Part gratuite du jour épuisée : arrêt."); break; } }
}
console.log(`Écrites : ${faites} · déjà prêtes : ${deja} · refusées : ${refus} · moins de 2 articles lisibles : ${vides}`);
