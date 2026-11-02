// Ancres de preuve (1/11/2026, Romain : « un vrai avantage que les autres ne peuvent pas avoir »).
// Dans un rapport annuel européen au format ESEF, chaque chiffre balisé porte un identifiant (ex. « reg-ix-108 ») qui est aussi
// l'identifiant de l'élément dans le document officiel (xhtml) : l'adresse « rapport.xhtml#reg-ix-108 » ouvre le rapport sur ce chiffre.
// Ce robot relit le dernier rapport de chaque entreprise (filings.xbrl.org, données publiques), retrouve l'identifiant des chiffres
// affichés par le site et écrit cf/site/data/ancres/<id>.json :
//   { report: "<adresse du document officiel>", maj: "AAAA-MM-JJ", y: { "2025": { ca: "reg-ix-6", net: "…" }, "2024": { … } } }
// Garde-fou : un identifiant n'est gardé que si la valeur du document est celle que le site affiche (à 0,5 % près) ; sinon pas d'ancre.
// Usage : node data/ancres.mjs [--max N]   (robot ancres.yml ; arrêt propre après DUREE_MIN minutes, 60 par défaut)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { extract } from "./esef.mjs";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? +process.argv[i + 1] || d : d; };
const MAX = arg("--max", 300), DUREE = (+process.env.DUREE_MIN || 60) * 60000, t0 = Date.now(), FIN = +process.env.FIN || 0; // FIN : heure limite commune aux relances (secondes)
const UA = `bilan-ancres/1.0 (https://enklair.com${process.env.CONTACT ? "; " + process.env.CONTACT : ""})`;
const OUT = "cf/site/data/ancres"; mkdirSync(OUT, { recursive: true });
// Indicateurs affichés par le site dont la valeur vient directement d'un chiffre du document
const CLES = ["ca", "ebit", "net", "eps", "dps", "equity", "cash", "cfo", "divPaid", "tax", "pretax"];
const U = JSON.parse(readFileSync("cf/site/data/univers-min.json", "utf8")).companies;
const px = (() => { try { return JSON.parse(readFileSync("cf/site/data/cours.json", "utf8")).items || {}; } catch (e) { return {}; } })();
const cap = c => { const p = px["c:" + c.id]; return p && p.cap ? p.cap : 0; };
const lire = id => { try { return JSON.parse(readFileSync(`cf/site/data/societes/${id}.json`, "utf8")); } catch (e) { return null; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ordre = U.slice().sort((a, b) => cap(b) - cap(a)).map(c => ({ c, s: lire(c.id) })).filter(({ s }) => s && !s.cik && s.sources && s.sources[0] && /filings\.xbrl\.org/.test(s.sources[0].json || ""))
  .filter(({ c, s }) => { const f = `${OUT}/${c.id}.json`; if (!existsSync(f)) return true; try { const a = JSON.parse(readFileSync(f, "utf8")); return a.report !== s.sources[0].report; } catch (e) { return true; } }) // nouveau rapport : à relire
  .slice(0, MAX);
console.log(`${ordre.length} entreprises à relire`);
let ok = 0, vides = 0, pannes = 0, k = 0;
for (const { c, s } of ordre) {
  if (Date.now() - t0 > DUREE || (FIN && Date.now() / 1000 > FIN)) { console.log(`Temps écoulé : arrêt propre après ${k} entreprises`); break; }
  k++;
  const src = s.sources[0];
  try {
    const r = await fetch(src.json, { headers: { "user-agent": UA } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const ex = extract(await r.json()), y = {};
    for (const [an, ids] of Object.entries(ex.ids || {})) {
      const i = (s.years || []).indexOf(+an); if (i < 0) continue;
      for (const key of CLES) {
        const id = ids[key], v = ex.years[an] && ex.years[an][key], site = s.fin && s.fin[key] ? s.fin[key][i] : null;
        if (!id || v == null || site == null) continue;
        if (Math.abs(v - site) > Math.max(0.5, Math.abs(site) * 0.005)) continue; // le site affiche autre chose (autre source, autre étiquette) : pas d'ancre
        (y[an] = y[an] || {})[key] = id;
      }
    }
    if (Object.keys(y).length) { writeFileSync(`${OUT}/${c.id}.json`, JSON.stringify({ report: src.report, maj: new Date().toISOString().slice(0, 10), y })); ok++; }
    else { vides++; writeFileSync(`${OUT}/${c.id}.json`, JSON.stringify({ report: src.report, maj: new Date().toISOString().slice(0, 10), y: {} })); }
  } catch (e) { pannes++; console.log(c.id, ":", String(e.message || e).slice(0, 80)); }
  await sleep(800);
}
console.log(`${ok} entreprises avec ancres, ${vides} sans chiffre retrouvé, ${pannes} pannes`);
