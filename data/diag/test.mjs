import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const out = {};
try { out.log = execSync("node data/actu_analyse.mjs", { env: { ...process.env, MAX_SEC: "30" }, timeout: 15 * 60e3 }).toString().slice(-3000); } catch (e) { out.err = String(e.stdout || "") + String(e.stderr || e.message); }
try { const j = JSON.parse(readFileSync("cf/site/data/actu-analyse.json")); out.n = Object.keys(j.items).length; out.sample = Object.entries(j.items).slice(0, 40); } catch (e) { out.read = String(e); }
writeFileSync("data/diag/out.json", JSON.stringify(out, null, 1));
