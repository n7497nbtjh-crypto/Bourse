// Sonde du chantier « analyse » : lance la collecte Wikidata et dépose le résultat dans le dossier de sortie.
import { execFileSync } from "node:child_process";
const out = (process.env.SORTIE || "data/sonde/out/analyse") + "/facteurs.json";
execFileSync("node", ["data/facteurs.mjs", out], { stdio: "inherit" });
