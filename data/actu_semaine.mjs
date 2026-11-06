// Nouvelles des 10 derniers jours de toutes les entreprises, en un seul fichier (6/11 soir), pour le rapport de la semaine :
// le serveur y lit les nouvelles des rivales et les derniers comptes sans ouvrir un fichier par entreprise
// (Cloudflare limite le nombre de lectures par appel : avec un fichier par rivale, le rapport dépassait la limite et perdait l'IA et la radiographie).
// Lancé par build.mjs à chaque construction du site, à partir de cf/site/data/actu/c/*.json et de cf/site/data/societes.json.
//   node data/actu_semaine.mjs  →  cf/site/data/actu/semaine.json { maj, items: { id: [{ d, c, t, f, u } | { d, t, u, s, p: 1 }] }, comptes: { id: [an, devise, ventes, ventes an-1, bénéfice] } }
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
const DIR = new URL("../cf/site/data/actu/c/", import.meta.url), OUT = new URL("../cf/site/data/actu/semaine.json", import.meta.url);
const CAT = new Set(["resultats", "rapport", "operation", "contrat", "dirigeants", "dividende", "opa"]); // pas d'opérations courantes (rachats, droits de vote)
const FAIT = /\b(sign|accord|agreement|contrat|contract|acqui|rach[eè]te|lance|launch|vend|sells?|stake|participation|nomm|appoint|usine|plant|merger|fusion)/i;
const OPIN = /\?|recommand|conseil|aktie|should you|buy|sell |kaufen|could|top \d|meilleures? actions|stock (is|to)|why .* stock/i;
const min = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10), items = {};
let n = 0;
if (existsSync(DIR)) for (const f of readdirSync(DIR)) {
  if (!f.endsWith(".json")) continue;
  let j; try { j = JSON.parse(readFileSync(new URL(f, DIR), "utf8")); } catch (e) { continue; }
  const L = [];
  for (const a of Array.isArray(j.o) ? j.o : []) if (a && String(a.d) >= min && CAT.has(a.c) && /^https:\/\//.test(a.u || "")) L.push({ d: String(a.d).slice(0, 10), c: a.c, t: String(a.tf || a.t || "").slice(0, 200), ...(Array.isArray(a.f) && a.f.length ? { f: a.f.slice(0, 3) } : {}), u: a.u });
  let np = 0; for (const a of Array.isArray(j.p) ? j.p : []) if (a && String(a.d) >= min && FAIT.test(a.t || "") && !OPIN.test(a.t || "") && /^https:\/\//.test(a.u || "") && np++ < 2) L.push({ d: String(a.d).slice(0, 10), t: String(a.t).slice(0, 200), u: a.u, s: a.s || null, p: 1 });
  if (L.length) { items[f.slice(0, -5)] = L.slice(0, 8); n += L.length; }
}
const comptes = {};
try { for (const c of JSON.parse(readFileSync(new URL("../cf/site/data/societes.json", import.meta.url), "utf8")).companies || []) if (c && c.ca > 0 && c.year) comptes[c.id] = [c.year, c.currency || null, c.ca, c.caPrev || null, c.net ?? null]; } catch (e) { }
writeFileSync(OUT, JSON.stringify({ maj: new Date().toISOString(), depuis: min, items, comptes }));
console.log(`actu/semaine.json : ${n} nouvelles de ${Object.keys(items).length} entreprises depuis le ${min}, comptes de ${Object.keys(comptes).length}`);
