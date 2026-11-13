#!/usr/bin/env node
/* CSS mort : retire les sélecteurs dont une classe ou un identifiant n'apparaît nulle part dans le code du site.
   Prudent : un nom est vivant s'il apparaît comme mot dans un script, une page ou un petit fichier de données, ou s'il commence
   par un préfixe que le code complète (« ek-${x} », "a4-" + k). Usage : node css-mort.js [--ecrire] */
const fs = require("fs"), path = require("path"), postcss = require("postcss"), sp = require("postcss-selector-parser");
const S = path.join(__dirname, "..", "cf", "site") + "/", SRC = path.join(__dirname, "..", "cf", "src") + "/", ECRIRE = process.argv.includes("--ecrire");
const fichiers = ["index.html", "app.js", "ia.js", "calc.js", "sw.js", ...fs.readdirSync(S + "m").map(f => "m/" + f)].map(f => S + f)
  .concat(fs.readdirSync(SRC).filter(f => f !== "index.gen.mjs").map(f => SRC + f))
  .concat(fs.readdirSync(S + "data").filter(f => f.endsWith(".json") && fs.statSync(S + "data/" + f).size < 400000).map(f => S + "data/" + f));
const corpus = fichiers.map(f => fs.readFileSync(f, "utf8")).join("\n");
const mots = new Set(corpus.match(/[A-Za-z_][A-Za-z0-9_-]*/g));
for (const w of [...mots]) if (w.includes("-")) { /* « a-b-c » ne rend pas « a » vivant, mais un mot suivi d'un tiret final si */ }
const prefixes = new Set();
for (const m of corpus.matchAll(/([A-Za-z][A-Za-z0-9_-]*)\$\{/g)) prefixes.add(m[1]);
for (const m of corpus.matchAll(/([A-Za-z][A-Za-z0-9_-]*)["'`]\s*\+/g)) prefixes.add(m[1]);
const P2 = [...prefixes].filter(p => p.length >= 2), P1 = new Set([...prefixes].filter(p => p.length === 1));
const cache = new Map();
function vivant(n) {
  if (cache.has(n)) return cache.get(n);
  let v = mots.has(n) || P2.some(p => n.startsWith(p)) || (P1.has(n[0]) && (n.length <= 3 || /^[a-z]\d+$/i.test(n)));
  cache.set(n, v); return v;
}
function selMort(sel) {
  let mort = false;
  try { sp(root => { root.walk(node => { if (node.type !== "class" && node.type !== "id") return; let a = node.parent, dansPseudo = false; while (a) { if (a.type === "pseudo") dansPseudo = true; a = a.parent; } if (!dansPseudo && !vivant(node.value)) mort = true; }); }).processSync(sel); } catch (e) { return false; }
  return mort;
}
let total = 0, retires = 0, octets = 0; const noms = new Map();
for (const f of ["site.css", "composants.css"]) {
  const css = fs.readFileSync(S + f, "utf8"), root = postcss.parse(css); const avant = css.length;
  root.walkRules(rule => {
    if (rule.parent && rule.parent.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    const sels = rule.selectors; total += sels.length;
    const garde = sels.filter(s => !selMort(s)); retires += sels.length - garde.length;
    for (const s of sels) if (!garde.includes(s)) { const m = s.match(/[.#]([A-Za-z_][A-Za-z0-9_-]*)/g) || []; for (const x of m) if (!vivant(x.slice(1))) noms.set(x, (noms.get(x) || 0) + 1); }
    if (!garde.length) rule.remove(); else if (garde.length < sels.length) rule.selectors = garde;
  });
  // blocs @media et autres devenus vides
  let encore = true; while (encore) { encore = false; root.walkAtRules(a => { if (a.nodes && a.nodes.length === 0 && !/^(font-face|import|charset)$/i.test(a.name)) { a.remove(); encore = true; } }); }
  // @keyframes plus cités
  const reste = root.toString(); root.walkAtRules(/keyframes$/i, a => { const n = a.params.trim(); const ailleurs = reste.split(a.toString()).join(""); if (!new RegExp("\\b" + n.replace(/[-]/g, "\\-") + "\\b").test(ailleurs) && !mots.has(n)) a.remove(); });
  const out = root.toString().replace(/\n{3,}/g, "\n\n"); octets += avant - out.length;
  console.log(f.padEnd(16), Math.round(avant / 1024) + " Ko →", Math.round(out.length / 1024) + " Ko");
  if (ECRIRE) fs.writeFileSync(S + f, out);
}
console.log(`${retires} sélecteurs morts sur ${total} ; ${Math.round(octets / 1024)} Ko ; ${noms.size} noms de classe ou d'identifiant introuvables dans le code`);
if (process.argv.includes("--noms")) console.log([...noms.keys()].sort().join(" "));
