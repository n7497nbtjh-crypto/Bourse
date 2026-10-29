// Couverture des comptes par région et par source : node data/diag/couverture.mjs [fichier societes.json]
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync(process.argv[2] || new URL("../../cf/site/data/societes.json", import.meta.url)));
const U = (await import("../univers.mjs")).default, byId = Object.fromEntries(U.map(c => [c.id, c]));
const t = {};
for (const c of S.companies) {
  const u = byId[c.id] || {}, src = u.sec ? "SEC" : "ESEF";
  const k = (u.region || c.region) + " " + src; t[k] = t[k] || { total: 0, ok: 0, recent: 0 };
  t[k].total++; if (!c.missing) { t[k].ok++; if (c.year >= 2025) t[k].recent++; }
}
const reg = {}; for (const [k, v] of Object.entries(t)) { const r = k.split(" ")[0]; reg[r] = reg[r] || { total: 0, ok: 0, recent: 0 }; for (const f of ["total", "ok", "recent"]) reg[r][f] += v[f]; }
const all = Object.values(reg).reduce((a, v) => ({ total: a.total + v.total, ok: a.ok + v.ok, recent: a.recent + v.recent }), { total: 0, ok: 0, recent: 0 });
console.log("par région et source :", JSON.stringify(t));
console.log("par région :", JSON.stringify(reg));
console.log("ensemble :", JSON.stringify(all), "| années du dernier exercice :", JSON.stringify(S.companies.filter(c => !c.missing).reduce((m, c) => (m[c.year] = (m[c.year] || 0) + 1, m), {})));
const errs = {}; for (const e of S.errors || []) { const k = e.replace(/^[^:]+ : /, "").replace(/[A-Z0-9]{20}|CIK\d+|https?:\S+|[A-Z]{2}[A-Z0-9]{9}\d/g, "…").slice(0, 60); errs[k] = (errs[k] || 0) + 1; }
console.log("échecs :", JSON.stringify(Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 12)));
