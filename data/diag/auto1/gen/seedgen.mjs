// Lot auto2 : grandes valeurs européennes rédigées à la main (seeds.mjs), ISIN repris des listes officielles.
// node data/diag/auto1/gen/seedgen.mjs . [--write]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import SEEDS from "./seeds.mjs";
const REPO = process.argv[2], D = REPO + "/data/diag/auto1/";
const { isinOk } = await import(pathToFileURL(REPO + "/data/isin.mjs").href);
const AUTO2 = existsSync(REPO + "/data/lots/auto2.mjs") ? new Set((await import(pathToFileURL(REPO + "/data/lots/auto2.mjs").href)).default.map(c => c.id)) : new Set();
const U = (await import(pathToFileURL(REPO + "/data/univers.mjs").href)).default.filter(c => !AUTO2.has(c.id));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\b(the|group|groupe|holding|se|ag|sa|nv|plc|ab|asa|a\/s)\b/g, "").replace(/[^a-z0-9]/g, "");
const have = { isin: new Set(U.map(c => c.isin)), id: new Set(U.map(c => c.id)), name: new Set(U.filter(c => c.region === "EU" || c.region === "FR").map(c => norm(c.name))), domain: new Set(U.map(c => c.domain)), tv: new Set(U.map(c => c.tv)) };
const SYM = {};
const add = (k, isin, name) => { if (isinOk(isin || "")) (SYM[k] = SYM[k] || []).push([isin, name]); };
const parse = l => { const o = []; let c = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ";" && !q) { o.push(c); c = ""; } else c += ch; } o.push(c); return o; };
for (const l of readFileSync(D + "liste_euronext_get.csv", "utf8").split(/\r?\n/).slice(4)) { const c = parse(l); if (c.length < 13) continue; const m = c[3].split(",")[0]; const p = /Milan/.test(m) ? "MIL" : /Oslo/.test(m) ? "OSL" : /^Euronext (Paris|Amsterdam|Brussels|Lisbon|Dublin|Growth)/.test(m) ? "EURONEXT" : null; if (p) add(p + ":" + c[2].toUpperCase(), c[1], c[0]); }
for (const f of readdirSync(D).filter(f => f.startsWith("liste_nordic_"))) { const p = { STO: "OMXSTO", CPH: "OMXCOP", HEL: "OMXHEX" }[f.split("_")[2]]; if (!p) continue; for (const r of JSON.parse(readFileSync(D + f)).data.instrumentListing.rows) add(p + ":" + r.symbol.toUpperCase().replace(/\s+/g, "_"), r.isin, r.fullName); }
for (const l of readFileSync(D + "liste_xetra.csv", "utf8").split(/\r?\n/).slice(3)) { const f = l.split(";"); if (f[1] === "Active" && f[18] === "CS") add("XETR:" + f[7], f[3], f[2]); }
for (const l of readFileSync(D + "liste_six_fqs2.csv", "utf8").split(/\r?\n/).slice(1)) { const [nm, s, i] = l.split(";"); add("SIX:" + s, i, nm); }
for (const [i, l] of Object.entries(JSON.parse(readFileSync(D + "figi.json")))) for (const r of l) if (r[0] === "SM" && r[2] === "Common Stock") add("BME:" + r[1], i, r[3]);
const G = JSON.parse(readFileSync(D + "gleif.json")), ISIN_LEI = { ...(G.isinLei || {}) }; for (const [lei, l] of Object.entries(G.leiIsin || {})) for (const i of l) if (!ISIN_LEI[i]) ISIN_LEI[i] = lei;
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ø/g, "o").replace(/&/g, " and ").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = [], drop = [];
for (const [tv, name, sector, domain, desc, fait, argent, depend] of SEEDS) {
  const e = (SYM[tv] || [])[0];
  if (!e) { drop.push(tv + " : absent de la liste officielle"); continue; }
  const [isin] = e; let id = slug(name); if (have.id.has(id)) id = slug(name + " " + tv.split(":")[1]);
  const why = have.isin.has(isin) ? "ISIN" : have.tv.has(tv) ? "cotation" : (have.name.has(norm(name)) && !["Porsche SE", "Heineken Holding"].includes(name)) ? "nom" : have.domain.has(domain) ? "site" : have.id.has(id) ? "identifiant" : null;
  if (why) { drop.push(`${name} : déjà dans la liste (${why})`); continue; }
  for (const t of [desc, fait, argent, depend]) if (/[—–]/.test(t)) throw new Error("tiret long : " + name);
  const lei = ISIN_LEI[isin];
  out.push({ id, name, ticker: tv.split(":")[1].replace(/_/g, " "), isin, ...(lei ? { lei } : {}), tv, region: isin.startsWith("FR") ? "FR" : "EU", sector, domain, desc, fiche: { fait, argent, depend } });
  have.id.add(id); have.isin.add(isin);
}
console.log(out.length, "sociétés ;", drop.length, "écartées :", drop.join(" ; "));
if (process.argv.includes("--write")) {
  const q = JSON.stringify;
  const body = out.map(r => `  { id: ${q(r.id)}, name: ${q(r.name)}, ticker: ${q(r.ticker)}, isin: ${q(r.isin)}, ${r.lei ? `lei: ${q(r.lei)}, ` : ""}tv: ${q(r.tv)}, region: ${q(r.region)}, sector: ${q(r.sector)}, domain: ${q(r.domain)},\n    desc: ${q(r.desc)},\n    fiche: { fait: ${q(r.fait || r.fiche.fait)}, argent: ${q(r.fiche.argent)}, depend: ${q(r.fiche.depend)} } },`).join("\n");
  writeFileSync(REPO + "/data/lots/auto2.mjs", `// Lot « auto2 » : ${out.length} grandes valeurs européennes (membres des grands indices) absentes de la liste, fiches rédigées à la main.
// ISIN repris des listes officielles des bourses (Euronext, Nasdaq Nordic, Xetra, SIX ; OpenFIGI pour Madrid), LEI de GLEIF quand il est connu.
// Source : data/diag/auto1/gen/seeds.mjs (node data/diag/auto1/gen/seedgen.mjs . --write).
export default [
${body}
];
`);
}
