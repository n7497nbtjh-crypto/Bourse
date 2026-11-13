#!/usr/bin/env node
/* Code mort du site (scripts classiques partageant le même espace global).
   13/11 (recentrage) : outil du chantier, voir docs/chantier-recentrage-2026-11.md. Demande le module acorn (npm i --no-save acorn).
   Options : --noms (liste), --pourquoi NOM… (qui cite ce nom), --supprimer.
   Usage : node scripts/code-mort.js            -> rapport
           node scripts/code-mort.js --supprimer -> retire les déclarations mortes des fichiers
   Prudent : un nom est « utilisé » dès que le mot apparaît quelque part dans du code vivant, y compris dans une chaîne
   (gestionnaires onclick="…", typeof x === "function", wrap("nom")). */
const fs = require("fs"), path = require("path"), acorn = require("acorn");
const R = path.join(__dirname, "..", "cf", "site") + "/";
const html = fs.readFileSync(R + "index.html", "utf8");
const ordre = [...html.matchAll(/<script[^>]*\ssrc="\/([^"?]+\.js)[^"]*"/g)].map(m => m[1]).filter(f => fs.existsSync(R + f));
const SUPPR = process.argv.includes("--supprimer");
const mots = t => new Set(t.match(/[A-Za-z_$][\w$]*/g) || []);

// une expression est « pure » si l'évaluer ne fait rien d'autre que construire une valeur
function pure(n) {
  if (!n) return true;
  switch (n.type) {
    case "Literal": case "Identifier": case "ArrowFunctionExpression": case "FunctionExpression": case "ThisExpression": return true;
    case "TemplateLiteral": return n.expressions.every(pure);
    case "ArrayExpression": return n.elements.every(e => !e || (e.type === "SpreadElement" ? pure(e.argument) : pure(e)));
    case "ObjectExpression": return n.properties.every(p => p.type === "SpreadElement" ? pure(p.argument) : (!p.computed || pure(p.key)) && pure(p.value));
    case "UnaryExpression": return n.operator !== "delete" && pure(n.argument);
    case "BinaryExpression": case "LogicalExpression": return pure(n.left) && pure(n.right);
    case "ConditionalExpression": return pure(n.test) && pure(n.consequent) && pure(n.alternate);
    case "MemberExpression": return pure(n.object) && (!n.computed || pure(n.property));
    case "NewExpression": return n.callee.type === "Identifier" && ["Set", "Map", "WeakMap", "WeakSet", "RegExp", "Intl"].includes(n.callee.name) && n.arguments.every(pure)
      || (n.callee.type === "MemberExpression" && n.callee.object.type === "Identifier" && n.callee.object.name === "Intl" && n.arguments.every(pure));
    default: return false;
  }
}
const decls = [];          // { nom, fichier, start, end, texte, refs }
let racines = mots(html);  // mots des instructions exécutées au chargement
const src = {}, racParF = {}, capParF = {};
for (const f of ordre) {
  const s = src[f] = fs.readFileSync(R + f, "utf8");
  let ast; try { ast = acorn.parse(s, { ecmaVersion: "latest", sourceType: "script", allowAwaitOutsideFunction: true }); } catch (e) { console.error("ANALYSE IMPOSSIBLE", f, e.message); process.exit(2); }
  for (const n of ast.body) {
    const t = s.slice(n.start, n.end);
    if (n.type === "FunctionDeclaration") decls.push({ nom: n.id.name, fichier: f, start: n.start, end: n.end, texte: t, refs: mots(t), genre: "fonction" });
    else if (n.type === "VariableDeclaration" && n.declarations.length === 1 && n.declarations[0].id.type === "Identifier" && pure(n.declarations[0].init))
{ decls.push({ nom: n.declarations[0].id.name, fichier: f, start: n.start, end: n.end, texte: t, refs: mots(t), genre: n.kind });
      for (const w of mots(t)) (capParF[f] = capParF[f] || new Set()).add(w); }
    else for (const w of mots(t)) { racines.add(w); (racParF[f] = racParF[f] || new Set()).add(w); }
  }
}
/* Doublons : une fonction redéclarée par un script chargé plus tard remplace la première (la page ne démarre qu'après le chargement
   de tous les scripts). L'ancienne version est morte, sauf si un script chargé entre les deux la cite dans ses instructions de chargement
   (capture « const f0 = window.f », appel immédiat). */
const ombres = [];
{ const G = new Map(); decls.forEach((d, i) => { if (d.genre !== "fonction") return; if (!G.has(d.nom)) G.set(d.nom, []); G.get(d.nom).push(d); });
  for (const [nom, L] of G) { if (L.length < 2) continue; const der = L[L.length - 1], b = ordre.indexOf(der.fichier);
    for (const d of L.slice(0, -1)) { const a = ordre.indexOf(d.fichier); let cite = false;
      for (let k = a; k < b; k++) if ((racParF[ordre[k]] && racParF[ordre[k]].has(nom)) || (capParF[ordre[k]] && capParF[ordre[k]].has(nom))) cite = true;
      if (!cite) ombres.push(d); } } }
for (const d of ombres) decls.splice(decls.indexOf(d), 1);
const parNom = new Map(); for (const d of decls) { if (!parNom.has(d.nom)) parNom.set(d.nom, []); parNom.get(d.nom).push(d); }
// propagation
const vivant = new Set(), file = [];
for (const w of racines) if (parNom.has(w) && !vivant.has(w)) { vivant.add(w); file.push(w); }
while (file.length) { const n = file.pop(); for (const d of parNom.get(n)) for (const w of d.refs) if (w !== n && parNom.has(w) && !vivant.has(w)) { vivant.add(w); file.push(w); } }
const morts = decls.filter(d => !vivant.has(d.nom)).concat(ombres);
console.log("dont versions remplacées par un script chargé plus tard :", ombres.length, ombres.slice(0, 40).map(d => d.nom + "@" + d.fichier.replace("m/", "")).join(" "));
const pq = process.argv.indexOf("--pourquoi");
if (pq > 0) { for (const nom of process.argv.slice(pq + 1)) { const L = decls.filter(d => vivant.has(d.nom) && d.nom !== nom && d.refs.has(nom)).map(d => d.nom + " (" + d.fichier + ")");
  console.log(nom, vivant.has(nom) ? "VIVANT" : "mort", "| au chargement :", racines.has(nom), "| cité par :", L.slice(0, 12).join(", ")); } process.exit(0); }
const parF = {}; for (const d of morts) { (parF[d.fichier] = parF[d.fichier] || []).push(d); }
let total = 0;
for (const f of ordre) { const L = parF[f] || []; const o = L.reduce((a, d) => a + d.end - d.start, 0); total += o;
  if (L.length) console.log(`${f.padEnd(26)} ${String(L.length).padStart(4)} déclarations mortes, ${String(Math.round(o / 1000)).padStart(4)} Ko sur ${Math.round(src[f].length / 1000)} Ko`); }
console.log(`TOTAL : ${morts.length} déclarations mortes, ${Math.round(total / 1000)} Ko ; ${decls.length - morts.length} vivantes`);
if (process.argv.includes("--noms")) for (const f of ordre) if (parF[f]) console.log(f + " : " + parF[f].map(d => d.nom).join(" "));
if (SUPPR) for (const f of Object.keys(parF)) {
  let s = src[f]; const L = parF[f].slice().sort((a, b) => b.start - a.start);
  for (const d of L) {
    let a = d.start, b = d.end;
    // commentaire de fin de ligne attaché à la déclaration, et saut de ligne
    const reste = s.slice(b).match(/^[ \t]*(\/\/[^\n]*)?\n?/); if (reste) b += reste[0].length;
    s = s.slice(0, a) + s.slice(b);
  }
  fs.writeFileSync(R + f, s);
}
