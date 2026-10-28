// Prochaines dates de résultats trouvées dans l'actualité (aucune date estimée).
// Le bot cherche, pour les plus grandes entreprises sans date officielle relevée, les articles récents qui annoncent
// « XYZ publiera ses résultats le 12 février » ou « XYZ to report fourth-quarter results on February 12 ».
// Source : GDELT (presse mondiale, API ouverte). Chaque date garde le lien de l'article qui l'annonce.
// Résultat : cf/site/data/agenda-auto.json
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import U from "./univers.mjs";

const MOIS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const EN = new RegExp(`\\b(?:to|will)\\s+(?:report|release|announce|publish|host|present)\\b[^.!?]{0,90}?\\b(?:results|earnings)\\b[^.!?]{0,50}?\\b(?:on\\s+)?(?:\\w+day,?\\s+)?(${MOIS_EN.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d\\d))?`, "i");
const FR = new RegExp(`\\b(?:publiera|presentera|devoilera|annoncera|publie|publieront)\\b[^.!?]{0,90}?\\b(?:resultats|chiffre d.affaires)\\b[^.!?]{0,50}?\\ble\\s+(?:\\w+\\s+)?(\\d{1,2})(?:er)?\\s+(${MOIS_FR.join("|")})(?:\\s+(20\\d\\d))?`, "i");

// Date future la plus proche correspondant au jour et au mois
function future(month, day, year, today) {
  const t = new Date(today + "T00:00:00Z");
  let y = year ? +year : t.getUTCFullYear();
  let d = new Date(Date.UTC(y, month, day));
  if (!year && d < t) d = new Date(Date.UTC(y + 1, month, day));
  if (d.getUTCMonth() !== month) return null; // 31 février…
  const iso = d.toISOString().slice(0, 10);
  return iso >= today && (d - t) / 864e5 <= 150 ? iso : null;
}
export function dateFromTitle(title, today = new Date().toISOString().slice(0, 10)) {
  const t = norm(title);
  let m = t.match(EN);
  if (m) return future(MOIS_EN.indexOf(m[1].toLowerCase()), +m[2], m[3], today);
  m = t.match(FR);
  if (m) return future(MOIS_FR.indexOf(m[2].toLowerCase()), +m[1], m[3], today);
  return null;
}
export function queryFor(name) {
  const n = String(name).replace(/\s*\(.*$/, "").replace(/["()]/g, "").trim();
  return `"${n}" (results OR earnings OR résultats) (report OR release OR announce OR publiera OR présentera)`;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const OUT = new URL("../cf/site/data/", import.meta.url);
  // Entreprises qui ont déjà une date officielle à venir : inutile de chercher
  const manual = new Set();
  for (const f of ["agenda.json"]) { const p = new URL(f, OUT); if (existsSync(p)) for (const e of JSON.parse(readFileSync(p)).events || []) if (e.date >= today && e.type === "Résultats") manual.add(e.id); }
  const idx = existsSync(new URL("societes.json", OUT)) ? JSON.parse(readFileSync(new URL("societes.json", OUT))).companies : [];
  const FX = { EUR: 1, USD: 0.92, GBP: 1.17, SEK: 0.087, DKK: 0.134, NOK: 0.085, CHF: 1.05, JPY: 0.0061 };
  const size = Object.fromEntries(idx.map(c => [c.id, (c.ca || 0) * (FX[c.currency] || 0)]));
  const list = U.filter(c => !manual.has(c.id)).sort((a, b) => (size[b.id] || 0) - (size[a.id] || 0)).slice(0, +(process.env.AGENDA_MAX || 150));
  const events = [], stop = Date.now() + 18 * 60e3;
  for (const c of list) {
    if (Date.now() > stop) break;
    try {
      const u = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
      u.searchParams.set("query", queryFor(c.name)); u.searchParams.set("mode", "artlist"); u.searchParams.set("format", "json");
      u.searchParams.set("maxrecords", "50"); u.searchParams.set("timespan", "45d"); u.searchParams.set("sort", "datedesc");
      const r = await fetch(u, { headers: { "user-agent": "Repere (site pedagogique)" } });
      const txt = r.ok ? await r.text() : "";
      const arts = txt.trim().startsWith("{") ? (JSON.parse(txt).articles || []) : [];
      const found = arts.map(a => ({ a, d: dateFromTitle(a.title, today) })).filter(x => x.d && norm(x.a.title).includes(norm(c.name.split(" ")[0])));
      if (found.length) { const { a, d } = found[0]; events.push({ id: c.id, date: d, type: "Résultats", label: "Publication des résultats (date annoncée)", source: a.url, presse: a.domain }); console.log("date", c.name, d); }
    } catch (e) { console.log("presse", c.name, e.message); }
    await sleep(5500); // GDELT : une requête toutes les 5 secondes
  }
  writeFileSync(new URL("agenda-auto.json", OUT), JSON.stringify({ updated: today, source: "Presse (GDELT)", events }));
  console.log(events.length, "dates trouvées dans l'actualité");
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
