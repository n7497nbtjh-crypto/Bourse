// Rivales trouvées automatiquement (5/11 nuit, Romain : « beaucoup d'entreprises ne sont pas comparées à leurs rivales, Live Nation par exemple »).
// Pour chaque entreprise qui a moins de 3 rivales dans data/concurrents.json (liste écrite à la main, toujours prioritaire),
// on cherche des entreprises du même métier parmi celles qui ont des comptes :
//   - même code d'activité de la SEC (data/sic.json, sociétés cotées aux États-Unis) : 4 chiffres, sinon 3 ;
//   - même branche d'activité précise dans Wikidata (cf/site/data/wd/<id>.json, « secteurs ») ; les branches trop larges sont ignorées ;
//   - description du métier proche (fiches.json : desc + « ce qu'elle fait »), mots communs.
// Une rivale doit réunir au moins un de ces signaux forts ; à score égal, la taille la plus proche passe devant.
// node data/rivales_auto.mjs → data/concurrents_auto.json { id: [rivales] } ; build.mjs l'ajoute à cf/site/data/concurrents.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const R = p => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const MAN = R("./concurrents.json"), U = R("../cf/site/data/univers.json").companies, IDX = R("../cf/site/data/societes.json").companies;
const SIC = existsSync(new URL("./sic.json", import.meta.url)) ? R("./sic.json") : {};
const FI = R("../cf/site/data/fiches.json"), FX = R("../cf/site/data/fx.json").eur;
const S = Object.fromEntries(IDX.map(c => [c.id, c]));
const ok = c => c && !c.missing && c.year != null;
const caE = c => c && c.ca > 0 ? c.ca * ((FX[c.currency || "EUR"]) || (c.currency === "EUR" ? 1 : 0)) : 0;
const WD = id => { try { return R(`../cf/site/data/wd/${id}.json`).secteurs || []; } catch (e) { return []; } };
// branches trop larges pour dire « même métier »
const LARGE = new Set(["service financier", "secteur financier", "activités de fabrication", "conglomérat", "activités des sièges sociaux", "technologie de l'information", "industrie", "commerce", "secteur énergétique", "construction", "électronique", "génie mécanique", "soins de santé", "secteur tertiaire", "services", "commerce de gros", "activités de services financiers, à l’exception des assurances et des caisses de retraite", "fabrication", "énergie", "transport", "investissement", "holding"]);
const VIDE = new Set("dans pour avec leurs ainsi entre comme aussi autres monde mondial mondiale surtout plusieurs notamment grande grandes grand grands petits produits services activité activités clients entreprise entreprises société sociétés groupe fabrique propose vente ventes vend aussi france europe états-unis amérique asie chine japon inde corée allemagne".split(" "));
const mots = id => { const f = FI[id] || {}, u = UM[id] || {}; return new Set(String([u.desc, f.fait, f.argent].join(" ")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter(w => w.length >= 5 && !VIDE.has(w)).map(w => w.replace(/s$/, ""))); };
const UM = Object.fromEntries(U.map(u => [u.id, u]));
const base = U.filter(u => ok(S[u.id])).map(u => ({ id: u.id, sector: u.sector || (S[u.id] || {}).sector, sic: (SIC[u.id] || [])[0] || null, wd: new Set(WD(u.id).filter(x => !LARGE.has(x))), mots: mots(u.id), ca: caE(S[u.id]) }));
// une branche Wikidata partagée par plus de 60 entreprises est trop large elle aussi
const freq = {}; base.forEach(b => b.wd.forEach(x => freq[x] = (freq[x] || 0) + 1));
base.forEach(b => b.wd = new Set([...b.wd].filter(x => freq[x] <= 60)));
const B = Object.fromEntries(base.map(b => [b.id, b]));
function score(a, b) {
  let s = 0, fort = false;
  if (a.sic && b.sic) { if (a.sic === b.sic) { s += 5; fort = true; } else if (a.sic.slice(0, 3) === b.sic.slice(0, 3)) { s += 3; fort = true; } else if (a.sic.slice(0, 2) === b.sic.slice(0, 2) && a.sector === b.sector) s += 1; }
  const w = [...a.wd].filter(x => b.wd.has(x)).length; if (w) { s += 3 + w; fort = true; }
  const m = [...a.mots].filter(x => b.mots.has(x)).length; if (m >= 2) { s += Math.min(4, m); if (m >= 3 && a.sector === b.sector) fort = true; }
  if (a.sector === b.sector) s += 1; else if (!(a.sic && a.sic === b.sic) && !w) return 0;
  if (m === 0 && a.mots.size >= 4 && b.mots.size >= 4) s -= 2; // même code, mais rien de commun dans la description du métier (Garmin / Northrop Grumman)
  // 5/11 : signal fort ET au moins un mot du métier en commun (sinon : Garmin face à Northrop Grumman, Camurus face à Canopy Growth)
  const sur = (a.sic && a.sic === b.sic && m >= 1) || (w && m >= 1) || (m >= 4 && a.sector === b.sector) || (a.sic && a.sic === b.sic && w);
  return fort && sur ? s : 0;
}
const OUT = {}; let faits = 0, rien = 0;
for (const a of base) {
  const man = (MAN[a.id] || []).filter(id => B[id]);
  if (man.length >= 3) continue;
  const cand = base.filter(b => b.id !== a.id && !man.includes(b.id)).map(b => ({ id: b.id, s: score(a, b), d: a.ca > 0 && b.ca > 0 ? Math.abs(Math.log(b.ca / a.ca)) : 9 })).filter(x => x.s >= 5 && x.d < Math.log(60))
    .sort((x, y) => y.s - x.s || x.d - y.d).slice(0, 4 - man.length).map(x => x.id);
  if (man.length + cand.length >= 3) { OUT[a.id] = cand; faits++; } else rien++;
}
writeFileSync(new URL("./concurrents_auto.json", import.meta.url), JSON.stringify(OUT, null, 0));
console.log(`${faits} entreprises complétées, ${rien} sans rivales sûres (le site garde la médiane du secteur)`);
const ex = ["live-nation", "hermes", "samsung-electronics", "colgate-palmolive-india"].map(id => `${id} : ${[...(MAN[id] || []), ...(OUT[id] || [])].join(", ")}`); console.log(ex.join("\n"));
