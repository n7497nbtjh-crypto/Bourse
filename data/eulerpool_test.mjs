// Test Eulerpool (30/10/2026) : lit les comptes annuels et trimestriels de quelques entreprises et les compare aux comptes
// officiels que le site a déjà (ESEF, SEC). Rien n'est écrit dans le site : affichage seulement. Clé : secret EULERPOOL_KEY.
import { readFileSync, existsSync } from "node:fs";
const KEY = process.env.EULERPOOL_KEY; if (!KEY) { console.log("::error::EULERPOOL_KEY absent"); process.exit(1); }
const H = { Authorization: "Bearer " + KEY, accept: "application/json" };
const BASES = ["https://api.eulerpool.com/v1", "https://api.eulerpool.com/api/1"];
const ESSAIS = { lvmh: ["MC.PA", "MC", "LVMH", "FR0000121014"], totalenergies: ["TTE.PA", "TTE", "FR0000120271"], sap: ["SAP.DE", "SAP", "DE0007164600"], "samsung-electronics": ["005930.KS", "005930", "KR7005930003", "SSNLF"], microsoft: ["MSFT"], "air-liquide": ["AI.PA", "AI", "FR0000120073"] };
async function get(path) {
  for (const b of BASES) { const r = await fetch(b + path, { headers: H }); const t = await r.text(); if (r.ok) { try { return { base: b, j: JSON.parse(t) }; } catch (e) { return { base: b, raw: t.slice(0, 300) }; } } if (r.status !== 404) return { base: b, status: r.status, raw: t.slice(0, 300) }; }
  return { status: 404 };
}
const local = id => { const f = new URL(`../cf/site/data/societes/${id}.json`, import.meta.url); if (!existsSync(f)) return null; const c = JSON.parse(readFileSync(f, "utf8")); const n = c.years.length - 1; return { year: c.years[n], ca: c.fin.ca && c.fin.ca[n], net: c.fin.net && c.fin.net[n], cur: c.currency }; };
const M = v => v == null ? "–" : (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " M";
// 1. découverte : quel chemin de recherche existe ?
for (const p of ["/search?q=LVMH", "/companies/search?q=LVMH", "/securities/search?query=LVMH", "/companies/MC.PA/profile", "/companies/MC.PA", "/companies/MSFT/income-statement?period=annual&limit=2"]) { const r = await get(p); console.log(p, "→", r.status || 200, r.base || "", JSON.stringify(r.j || r.raw || "").slice(0, 400)); }
// 2. comparaison
for (const [id, tks] of Object.entries(ESSAIS)) {
  const loc = local(id); let ok = false;
  for (const tk of tks) {
    const a = await get(`/companies/${encodeURIComponent(tk)}/income-statement?period=annual&limit=3`);
    if (!a.j || !Array.isArray(a.j.data)) continue;
    const q = await get(`/companies/${encodeURIComponent(tk)}/income-statement?period=quarterly&limit=4`);
    const last = a.j.data[0] || {}, keys = Object.keys(last).slice(0, 14);
    console.log(`\n== ${id} (${tk}) champs : ${keys.join(", ")}`);
    console.log("  Eulerpool annuel :", a.j.data.slice(0, 3).map(d => `${d.fiscalYear || d.date || d.period} ventes ${M(d.revenue)} net ${M(d.netIncome)} ${d.currency || d.reportedCurrency || ""}`).join(" | "));
    if (loc) console.log("  Site (officiel)  :", `${loc.year} ventes ${loc.ca != null ? loc.ca.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " M" : "–"} net ${loc.net != null ? loc.net.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " M" : "–"} ${loc.cur}`);
    if (q.j && Array.isArray(q.j.data)) console.log("  Trimestres       :", q.j.data.slice(0, 4).map(d => `${d.fiscalYear || ""} ${d.fiscalQuarter || d.period || d.date || ""} ventes ${M(d.revenue)} net ${M(d.netIncome)}`).join(" | ")); else console.log("  Trimestres       : non obtenus", q.status || "", (q.raw || "").slice(0, 120));
    ok = true; break;
  }
  if (!ok) console.log(`\n== ${id} : aucun identifiant reconnu (${tks.join(", ")})`);
}
