// Après la mise en ligne : demande au site de résumer (IA Cloudflare) les annonces les plus récentes,
// pour que les visiteurs trouvent les résumés déjà prêts. Le site plafonne lui-même le nombre de résumés par jour.
import { readFileSync } from "node:fs";
const SITE = process.env.SITE_URL || "https://repere-bourse.pages.dev";
const j = JSON.parse(readFileSync(new URL("../cf/site/data/actu-analyse.json", import.meta.url)));
const list = Object.entries(j.items || {}).filter(([, v]) => v.chiffres && v.chiffres.length).sort((a, b) => String(b[1].date).localeCompare(String(a[1].date))).slice(0, +(process.env.IA_MAX || 45));
let ok = 0, stop = Date.now() + 10 * 60e3;
for (const [u] of list) {
  if (Date.now() > stop) break;
  try { const r = await fetch(`${SITE}/api/resume?u=${encodeURIComponent(u)}`, { headers: process.env.ADMIN_KEY ? { "x-admin-key": process.env.ADMIN_KEY } : {} }); const x = await r.json(); if (x.txt) ok++; else if (r.status === 429) break; } catch (e) { }
}
console.log(ok, "résumés IA prêts sur", list.length);
