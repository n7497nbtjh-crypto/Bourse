// L'horloge Cloudflare (cf/horloge/worker.mjs) doit lancer chaque robot programmé à l'heure de son cron GitHub
import { readFileSync, readdirSync } from "node:fs";
import { HORAIRES, aLancer } from "../cf/horloge/worker.mjs";
let err = 0;
for (const f of readdirSync(".github/workflows").filter(f => f.endsWith(".yml"))) {
  const crons = [...readFileSync(".github/workflows/" + f, "utf8").matchAll(/^\s*- cron:\s*"([^"]+)"/gm)].map(m => m[1].trim());
  const h = HORAIRES[f] || [];
  if (crons.join("|") !== h.join("|")) { console.log("Horloge différente de", f, ":", crons, "contre", h); err++; }
}
for (const f of Object.keys(HORAIRES)) try { readFileSync(".github/workflows/" + f); } catch (e) { console.log("Robot inconnu dans l'horloge :", f); err++; }
if (aLancer(new Date("2026-11-14T05:17:00Z")).join() !== "donnees.yml,etf-hist.yml") { console.log("Calcul des horaires faux"); err++; }
if (err) process.exit(1); console.log("t_horloge : OK");
