// Historique compact des comptes (plusieurs exercices) pour les classements, les dividendes et les découvertes (cf/site/m/outils.js).
// Lu dans cf/site/data/societes/<id>.json (comptes ESEF/SEC déjà collectés), écrit dans cf/site/data/historique.json.
// Fichier fabriqué par build.mjs à chaque mise en ligne : ne pas le committer.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const r = (v, d = 0) => v == null || !isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d;
const med = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

// Dividende par action : le chiffre publié d'abord, sinon l'estimation (dividende versé ÷ nombre d'actions).
// Une valeur sans rapport avec les autres années (erreur d'unité dans la source) est écartée.
function dividendes(fin, n) {
  const pub = fin.dps || [], est = fin.dpsEst || [];
  const d = Array.from({ length: n }, (_, i) => pub[i] > 0 ? pub[i] : est[i] > 0 ? est[i] : pub[i] === 0 || est[i] === 0 ? 0 : null);
  const m = med(d.filter(v => v > 0));
  return d.map(v => v > 0 && m && (v / m > 6 || v / m < 1 / 6) ? null : v);
}

export function historique(dir = "cf/site/data/societes", out = "cf/site/data/historique.json") {
  if (!existsSync(dir)) return 0;
  const h = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    let s; try { s = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")); } catch { continue; }
    const y = s.years || [], fin = s.fin || {}, n = y.length;
    if (!s.id || n < 2) continue;
    const col = (k, d = 0) => Array.from({ length: n }, (_, i) => r((fin[k] || [])[i], d));
    h[s.id] = { y: y[0], n, ca: col("ca"), eb: col("ebit"), nt: col("net"), eq: col("equity"), nd: col("netDebt"), dp: col("divPaid"), d: dividendes(fin, n).map(v => r(v, 4)) };
  }
  writeFileSync(out, JSON.stringify({ maj: new Date().toISOString().slice(0, 10), source: "Comptes annuels officiels (ESEF, SEC) déjà lus par le site", h }));
  return Object.keys(h).length;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(historique(), "entreprises dans historique.json");
