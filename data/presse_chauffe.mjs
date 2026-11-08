// 8/11 (Romain) : « une synthèse pour chaque entreprise, pour que les gens ne demandent plus chacun à l'IA de rédiger la même chose » ;
// « le rapport doit être disponible dès le samedi matin, voire le vendredi soir » ; « 75 synthèses prérédigées ».
// Vendredi soir (après la clôture de Wall Street) puis samedi juste après minuit UTC (part gratuite d'IA du samedi), ce robot fait écrire
// à l'avance la synthèse de presse de la semaine (/api/ia/presse) des entreprises les plus citées par la presse. Sans clé : il reste dans
// la part gratuite du jour et s'arrête quand elle est épuisée. Chaque synthèse est gardée par le site toute la semaine et servie à tous.
import fs from "node:fs";
const SITE = process.env.SITE || "https://enklair.com", MAX = +(process.env.MAX || 75), RANG = +(process.env.RANG || 75);
const H = { "user-agent": "ENKLAIR robot presse (+https://enklair.com)" };
const auj = new Date(), j = auj.getUTCDay(), dim = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), auj.getUTCDate() + (j === 0 ? 0 : 7 - j)));
const au = dim.toISOString().slice(0, 10), du = new Date(dim - 6 * 864e5).toISOString().slice(0, 10);
const soc = JSON.parse(fs.readFileSync("cf/site/data/societes.json", "utf8")).companies;
let cours = {}; try { cours = JSON.parse(fs.readFileSync("cf/site/data/cours.json", "utf8")).items || {}; } catch { }
const C = [];
for (const s of soc) {
  let a; try { a = JSON.parse(fs.readFileSync(`cf/site/data/actu/c/${s.id}.json`, "utf8")); } catch { continue; }
  const n = (a.p || []).filter(x => x && x.u && String(x.d || "").slice(0, 10) >= du && String(x.d || "").slice(0, 10) <= au).length;
  if (n >= 2) C.push({ id: s.id, nom: s.name, n, cap: +((cours["c:" + s.id] || {}).cap || 0) });
}
C.sort((a, b) => b.n - a.n || b.cap - a.cap); // les plus citées par la presse d'abord
const cibles = C.slice(0, RANG);
console.log(`Semaine du ${du} au ${au} : ${C.length} entreprises avec au moins 2 articles ; ${cibles.length} retenues.`);
let faites = 0, deja = 0, refus = 0, vides = 0, suite = 0;
for (const c of cibles) {
  if (faites >= MAX) break;
  const t0 = Date.now();
  let r; try { r = await (await fetch(`${SITE}/api/ia/presse?k=c:${c.id}&au=${au}&nom=${encodeURIComponent(c.nom)}`, { headers: H })).json(); } catch (e) { r = { erreur: String(e) }; }
  if (r.clair) { suite = 0; if (Date.now() - t0 < 1500) deja++; else { faites++; console.log(`✓ ${c.nom} (${r.n} articles)`); } }
  else if (r.vide) vides++;
  else { refus++; console.log(`· ${c.nom} : ${r.raison || r.erreur || "indisponible"}`); if (!r.raison && ++suite >= 3) { console.log("Part gratuite du jour épuisée : arrêt."); break; } }
}
console.log(`Écrites : ${faites} · déjà prêtes : ${deja} · refusées : ${refus} · moins de 2 articles lisibles : ${vides}`);
