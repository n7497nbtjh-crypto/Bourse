// Test Eulerpool (30/10/2026) : comptes annuels, trimestriels et cours de quelques entreprises, comparés aux comptes officiels
// que le site a déjà (ESEF, SEC). Rien n'est écrit dans le site : affichage seulement. Clé : secret EULERPOOL_KEY (paramètre token).
import { readFileSync, existsSync } from "node:fs";
const KEY = process.env.EULERPOOL_KEY; if (!KEY) { console.log("::error::EULERPOOL_KEY absent"); process.exit(1); }
const B = "https://api.eulerpool.com/api/1";
const ESSAIS = { lvmh: "FR0000121014", totalenergies: "FR0000120271", sap: "DE0007164600", "samsung-electronics": "KR7005930003", microsoft: "US5949181045", "air-liquide": "FR0000120073", "shinhan": "KR7055550008", "toyota": "JP3633400001" };
async function get(path) {
  const u = B + path + (path.includes("?") ? "&" : "?") + "token=" + KEY;
  const r = await fetch(u, { headers: { accept: "application/json" } }); const t = await r.text();
  if (!r.ok) return { status: r.status, raw: t.replace(/\s+/g, " ").slice(0, 160) };
  try { return { j: JSON.parse(t) }; } catch (e) { return { status: r.status, raw: t.slice(0, 160) }; }
}
const local = id => { const f = new URL(`../cf/site/data/societes/${id}.json`, import.meta.url); if (!existsSync(f)) return null; const c = JSON.parse(readFileSync(f, "utf8")); const n = c.years.length - 1; return { year: c.years[n], ca: c.fin.ca && c.fin.ca[n], net: c.fin.net && c.fin.net[n], ebit: c.fin.ebit && c.fin.ebit[n], cur: c.currency }; };
const M = v => v == null ? "–" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const d = ms => ms ? new Date(ms).toISOString().slice(0, 10) : "";
let n = 0;
for (const [id, isin] of Object.entries(ESSAIS)) {
  const loc = local(id);
  const [prof, inc, q, cd] = await Promise.all([get(`/equity/profile/${isin}`), get(`/equity/incomestatement/${isin}`), get(`/equity/income-statement-quarterly/${isin}`), get(`/equity/candles/${isin}?range=1y`)]); n += 4;
  console.log(`\n== ${id} (${isin})`);
  if (prof.j) { const p = prof.j; console.log("  profil :", [p.name || p.companyName, p.currency || p.reportedCurrency, p.exchange || p.exchangeShortName, p.sector || p.industry].filter(Boolean).join(" · "), "champs :", Object.keys(p).slice(0, 25).join(",")); } else console.log("  profil :", prof.status, prof.raw);
  if (inc.j && Array.isArray(inc.j)) { const L = inc.j.slice().sort((a, b) => String(b.period).localeCompare(String(a.period))).slice(0, 3);
    console.log("  Eulerpool annuel :", L.map(x => `${String(x.period).slice(0, 10)} ventes ${M(x.revenue)} ebit ${M(x.ebit)} net ${M(x.netIncome)} ${x.currency || ""}`).join(" | "));
    if (L[0]) console.log("  champs annuels   :", Object.keys(L[0]).join(","));
  } else console.log("  annuel :", inc.status, inc.raw);
  if (loc) console.log("  Site (officiel)  :", `${loc.year} ventes ${M(loc.ca)} M ebit ${M(loc.ebit)} M net ${M(loc.net)} M ${loc.cur}`); else console.log("  Site : pas de comptes");
  if (q.j && Array.isArray(q.j)) { const L = q.j.slice().sort((a, b) => String(b.period || b.date).localeCompare(String(a.period || a.date))).slice(0, 4);
    console.log("  Trimestres       :", L.length ? L.map(x => `${String(x.period || x.date).slice(0, 10)} ventes ${M(x.revenue)} net ${M(x.netIncome)}`).join(" | ") : "liste vide"); if (L[0]) console.log("  champs trim.     :", Object.keys(L[0]).join(",")); } else console.log("  trimestres :", q.status, q.raw);
  if (cd.j && Array.isArray(cd.j)) { const L = cd.j; console.log("  Cours 1 an       :", L.length, "points, du", d(L[0] && L[0].timestamp), "au", d(L.at(-1) && L.at(-1).timestamp), "dernier", L.at(-1) && L.at(-1).close); } else console.log("  cours :", cd.status, cd.raw);
}
console.log("\n", n, "requêtes utilisées");
