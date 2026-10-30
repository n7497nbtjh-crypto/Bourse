// Relève les domaines dont l'icône Google (s2/favicons) n'existe pas, pour que le site ne la demande plus (zéro 404 dans la console).
// Usage : node data/logos_check.mjs [--max N]   (robot des données, une fois par semaine ; ~3 000 requêtes HEAD, en parallèle par 20)
// Écrit cf/site/data/logos-absents.json : { maj, n, d: [domaines] }. Un domaine déjà noté absent est revérifié (un logo peut apparaître).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const max = +(process.argv[process.argv.indexOf("--max") + 1] || 0) || Infinity;
const uni = JSON.parse(readFileSync("cf/site/data/univers-min.json", "utf8")), etf = existsSync("cf/site/data/etf.json") ? JSON.parse(readFileSync("cf/site/data/etf.json", "utf8")) : { list: [] };
const doms = [...new Set([...(uni.companies || []).map(c => c.domain), ...(etf.list || []).map(e => e.issuerDomain || e.domain)].filter(Boolean))].slice(0, max);
const absents = [];
async function test(d) {
  try {
    const r = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (r.status === 404) absents.push(d); else await r.arrayBuffer();
  } catch (e) { /* réseau : on ne conclut rien */ }
}
for (let i = 0; i < doms.length; i += 20) await Promise.all(doms.slice(i, i + 20).map(test));
absents.sort();
writeFileSync("cf/site/data/logos-absents.json", JSON.stringify({ maj: new Date().toISOString().slice(0, 10), n: doms.length, d: absents }));
console.log(`${doms.length} domaines testés, ${absents.length} sans icône`);
