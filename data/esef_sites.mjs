// Comptes en retard (5/11/2026) : filings.xbrl.org n'indexe pas encore les rapports ESEF 2025 de nombreuses sociétés
// (Belgique, Italie, Pologne, Pays-Bas, Luxembourg, pays nordiques… : ArcelorMittal, Kerry, IMCD, Eurofins restaient à 2024).
// Chaque société publie pourtant son paquet ESEF officiel sur son site. Ce robot le cherche (trouverRapports de
// data/rapports_site.mjs : robots.txt respecté, aucun site forcé), vérifie que le document porte bien le LEI de la société et
// qu'il apporte un exercice plus récent, puis note son adresse dans data/esef_sites.json. La collecte habituelle
// (data/fetch_data.mjs) lit ensuite ce paquet comme un dépôt de l'AMF : tous les chiffres, pas seulement ceux d'un PDF.
//   node data/esef_sites.mjs [--minutes 40] [--ids a,b] [--sans-navigateur]
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { trouverRapports, ouvrirNavigateur } from "./rapports_site.mjs";
import { ixbrlFiles, ixbrlToJson } from "./amf.mjs";
import { extract } from "./esef.mjs";

const UA = "Mozilla/5.0 (compatible; ENKLAIR-bot/1.0; +https://enklair.com/methode)";
const OUT = new URL("./esef_sites.json", import.meta.url), SOC = new URL("../cf/site/data/societes/", import.meta.url);
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function attendu(fyEnd = "12-31", now = new Date()) { // dernier exercice dont le rapport devrait être publié (4 mois après la clôture)
  const [m, d] = fyEnd.split("-").map(Number); let y = now.getUTCFullYear();
  while (Date.UTC(y, m - 1, d) + 122 * 864e5 > now.getTime()) y--;
  return y;
}
const newestYear = r => Math.max(-Infinity, ...Object.entries((r && r.years) || {}).filter(([, v]) => v.ca != null || v.net != null).map(([y]) => +y)); // comme data/fetch_data.mjs

async function main() {
  const stop = Date.now() + (+arg("--minutes", 40)) * 60e3, seuls = (arg("--ids", "") || "").split(",").filter(Boolean);
  const { default: U } = await import("./univers.mjs");
  const memo = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const todo = [];
  for (const c of U) {
    if (seuls.length && !seuls.includes(c.id)) continue;
    if (!c.domain || /^FR/.test(c.isin || "") || c.cik || c.sec) continue; // France : AMF ; SEC : déjà à jour
    let s; try { s = JSON.parse(readFileSync(new URL(c.id + ".json", SOC))); } catch (e) { continue; }
    if (!s.lei || s.sourcePdf || !s.years || !s.years.length) continue;
    const have = Math.max(...s.years), att = attendu(s.fyEnd || "12-31");
    if (have >= att) continue;
    const m = memo[c.id]; if (!seuls.length && m && (m.ny > have || Date.now() - Date.parse(m.d) < 7 * 864e5)) continue; // déjà trouvé, ou cherché il y a moins d'une semaine
    todo.push({ c, s, have });
  }
  console.log(todo.length, "sociétés aux comptes en retard à chercher");
  const nav = process.argv.includes("--sans-navigateur") ? null : await ouvrirNavigateur().catch(() => null);
  let ok = 0, n = 0;
  for (const { c, s, have } of todo) {
    if (Date.now() > stop) break; n++;
    const L = []; let trouve = null;
    try {
      const R = await trouverRapports(c.domain, { lei: s.lei, log: m => L.push(m), navigateur: nav && nav.ouvrir });
      for (const f of R.esef.slice(0, 3)) {
        try {
          const r = await fetch(f.u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(180000) }); if (!r.ok) { L.push(`${f.u.slice(-60)} : ${r.status}`); continue; }
          const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 150e6) { L.push("paquet trop gros"); continue; }
          const htmls = ixbrlFiles(buf, f.u); if (!htmls.length) { L.push(`${f.u.slice(-60)} : pas de rapport iXBRL dedans`); continue; }
          const doc = ixbrlToJson(htmls); if (!Object.keys(doc.facts || {}).length) continue;
          if (!JSON.stringify(doc.facts).slice(0, 2e6).includes(s.lei)) { L.push(`${f.u.slice(-60)} : LEI différent (autre société ?)`); continue; }
          const ny = newestYear(extract(doc)); if (!(ny > have)) { L.push(`${f.u.slice(-60)} : exercice ${ny}, rien de nouveau`); continue; }
          trouve = { u: f.u, ny }; break;
        } catch (e) { L.push(`${f.u.slice(-60)} : ${e.message}`); }
        await sleep(800);
      }
    } catch (e) { L.push("panne " + e.message); }
    memo[c.id] = { d: new Date().toISOString().slice(0, 10), ...(trouve ? { url: trouve.u, ny: trouve.ny, lei: s.lei } : { pourquoi: L.slice(-2).join(" | ").slice(0, 240) }) };
    if (trouve) { ok++; console.log("✓", c.id, have, "→", trouve.ny, trouve.u.slice(0, 120)); } else console.log("✗", c.id, L.slice(-1)[0] || "aucun paquet ESEF repéré");
    if (n % 5 === 0) writeFileSync(OUT, JSON.stringify(memo, null, 0));
  }
  writeFileSync(OUT, JSON.stringify(memo, null, 0));
  if (nav) await nav.fermer();
  console.log(`${n} sociétés cherchées, ${ok} paquets ESEF plus récents trouvés.`);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) await main();
