// Dates habituelles de résultats (7/11, Romain : « 45 rendez-vous sur la semaine, c'est ridicule, on couvre plus de 3 000 entreprises »).
// Pour chaque entreprise sans date officielle à venir, la date à laquelle elle a publié ses résultats il y a un an (annonce officielle
// relevée par le robot de l'actualité, cf/site/data/actu/c/<id>.json, catégorie « resultats ») donne une date attendue cette année,
// au même jour de la semaine. Toujours affichée comme « date habituelle, à confirmer », avec le lien de l'annonce de l'an dernier :
// jamais présentée comme une date officielle (règle : une donnée estimée ne passe jamais pour actuelle).
// Lancé par build.mjs. Résultat : cf/site/data/agenda-habituel.json { updated, events: [{ id, date, type, label, source, estime: true }] }
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const DIR = new URL("../cf/site/data/actu/c/", import.meta.url), OUT = new URL("../cf/site/data/agenda-habituel.json", import.meta.url);
const today = new Date().toISOString().slice(0, 10), JOUR = 864e5;
const officiel = new Set();
for (const f of ["agenda.json", "agenda-auto.json"]) { try { for (const e of JSON.parse(readFileSync(new URL("../cf/site/data/" + f, import.meta.url), "utf8")).events || []) if (e.type === "Résultats" && e.date >= today) officiel.add(e.id); } catch (e) { } }
const fr = d => { const [y, m, j] = d.split("-"); return `${+j}/${m}/${y}`; };
// Même date un an plus tard, ramenée au même jour de la semaine (les publications tombent presque toujours le même jour de semaine)
function unAnPlusTard(d) {
  const t = new Date(d + "T12:00:00Z"), n = new Date(Date.UTC(t.getUTCFullYear() + 1, t.getUTCMonth(), t.getUTCDate()));
  const diff = t.getUTCDay() - n.getUTCDay(), r = new Date(n.getTime() + (diff > 3 ? diff - 7 : diff < -3 ? diff + 7 : diff) * JOUR);
  return r.toISOString().slice(0, 10);
}
const events = []; let nCo = 0;
if (existsSync(DIR)) for (const f of readdirSync(DIR)) {
  if (!f.endsWith(".json")) continue;
  const id = f.slice(0, -5); if (officiel.has(id)) continue;
  let j; try { j = JSON.parse(readFileSync(new URL(f, DIR), "utf8")); } catch (e) { continue; }
  const R = (Array.isArray(j.o) ? j.o : []).filter(a => a && a.c === "resultats" && a.d && /^https:\/\//.test(a.u || "")).map(a => ({ d: String(a.d).slice(0, 10), u: a.u, t: a.tf || a.t || "" }));
  if (!R.length) continue;
  const vus = new Set(); let n = 0;
  for (const a of R.sort((x, y) => x.d.localeCompare(y.d))) {
    const date = unAnPlusTard(a.d); if (date < today || (Date.parse(date) - Date.parse(today)) / JOUR > 400) continue;
    const mois = date.slice(0, 7); if (vus.has(mois)) continue; vus.add(mois); // une date par mois au plus (un communiqué et son rapport le même jour)
    events.push({ id, date, type: "Résultats", label: `Résultats attendus (date habituelle : publiés le ${fr(a.d)} l'an dernier, à confirmer)`, source: a.u, estime: true }); n++;
  }
  if (n) nCo++;
}
// Rapports déposés à la SEC (10-Q, 10-K, 20-F) ou à l'AMF : la date de dépôt de l'an dernier (cf/site/data/trim/<id>.json, dates réelles des
// formulaires) donne la date attendue cette année. Pas les trimestres venus d'Eulerpool (date de collecte, pas de dépôt).
const TRIM = new URL("../cf/site/data/trim/", import.meta.url), FORMES = new Set(["10-Q", "10-K", "20-F", "6-K", "AMF"]);
const deja = new Set(events.map(e => e.id + ":" + e.date.slice(0, 7)));
let nTrim = 0;
if (existsSync(TRIM)) for (const f of readdirSync(TRIM)) {
  if (!f.endsWith(".json")) continue;
  const id = f.slice(0, -5); if (officiel.has(id)) continue;
  let j; try { j = JSON.parse(readFileSync(new URL(f, TRIM), "utf8")); } catch (e) { continue; }
  const F = [...new Set((j.q || []).filter(q => q && q.filed && FORMES.has(q.form) && (Date.parse(today) - Date.parse(q.filed)) / JOUR <= 370).map(q => q.filed))];
  for (const d of F) {
    const date = unAnPlusTard(d), k = id + ":" + date.slice(0, 7);
    if (date < today || deja.has(k) || (Date.parse(date) - Date.parse(today)) / JOUR > 400) continue;
    deja.add(k); nTrim++;
    events.push({ id, date, type: "Résultats", label: `Rapport trimestriel ou annuel attendu (date habituelle : déposé le ${fr(d)} l'an dernier, à confirmer)`, source: j.source || null, estime: true });
  }
}
console.log(`  dont ${nTrim} d'après les dépôts officiels de l'an dernier (SEC, AMF)`);
events.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(OUT, JSON.stringify({ updated: today, source: "Date de l'an dernier (annonce officielle), à confirmer", events }));
// 7/11 soir : copie courte (45 prochains jours, sans libellé) pour le rapport de la semaine : le serveur ne lit pas 1,5 Mo à chaque rapport
writeFileSync(new URL("../cf/site/data/agenda-habituel-proche.json", import.meta.url), JSON.stringify({ updated: today, events: events.filter(e => (Date.parse(e.date) - Date.parse(today)) / JOUR <= 45).map(e => ({ id: e.id, date: e.date, type: e.type })) }));
const sem = events.filter(e => (Date.parse(e.date) - Date.parse(today)) / JOUR < 7).length;
console.log(`agenda-habituel.json : ${events.length} dates habituelles de résultats pour ${nCo} entreprises (${sem} dans les 7 jours)`);
