// Sonde de l'agent « outils2 » : essaie la collecte data/outils2_hist.mjs et rend le fichier produit.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
const out = process.env.SORTIE || "data/sonde/out/outils2"; mkdirSync(out, { recursive: true });
console.log(execFileSync("node", ["data/outils2_hist.mjs"], { encoding: "utf8" }));
copyFileSync("cf/site/data/hist-ref.json", out + "/hist-ref.json");
