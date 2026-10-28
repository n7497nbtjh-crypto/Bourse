import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const out = {};
try { out.ln = await (await import("../listes_noires.mjs")).main(); } catch (e) { out.lnErr = String(e); }
try { const r = await (await import("../dirigeants.mjs")).main(25); out.dir = Object.entries(r).slice(0, 6); } catch (e) { out.dirErr = String(e); }
try { execSync("node data/actu_analyse.mjs", { env: { ...process.env, MAX_SEC: "60" }, timeout: 15 * 60e3, stdio: "ignore" }); } catch (e) { out.err = String(e.message); }
try { const j = JSON.parse(readFileSync("cf/site/data/actu-analyse.json")); out.n = Object.keys(j.items).length; out.sample = Object.entries(j.items).filter(([, v]) => v.chiffres && v.chiffres.length).slice(0, 40).map(([u, v]) => [v.id, v.type, v.titre, v.chiffres, v.lecture, v.extraits]); } catch (e) { out.read = String(e); }
writeFileSync("data/diag/out.json", JSON.stringify(out, null, 1));
