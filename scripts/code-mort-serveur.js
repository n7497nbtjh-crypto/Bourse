#!/usr/bin/env node
/* Dépendance : acorn (npm i acorn dans un dossier de travail), comme scripts/code-mort.js. */
/* Code mort du serveur (modules ESM de cf/src). Une déclaration de premier niveau est morte si son nom n'apparaît dans aucun
   autre morceau de code du serveur (mot cherché partout, chaînes comprises : prudent), hors lignes d'import et hors elle-même.
   Les constantes dont la valeur n'est pas « pure » (appel de fonction…) sont gardées. Répété jusqu'à ne plus rien trouver,
   puis les imports devenus inutiles sont retirés.
   Usage : node mort-esm.js [--supprimer] [--garder nom,nom]   (noms gardés : ceux que des tests ou des robots importent) */
const fs = require("fs"), path = require("path"), acorn = require("acorn");
const R = path.join(__dirname, "..", "cf", "src") + "/";
const SUPPR = process.argv.includes("--supprimer");
const gi = process.argv.indexOf("--garder"), GARDER = new Set(gi > 0 ? process.argv[gi + 1].split(",") : []);
const ti = process.argv.indexOf("--tuer"), TUER = new Set(ti > 0 ? process.argv[ti + 1].split(",") : []); // fichier:nom à retirer même si le mot apparaît ailleurs (mot courant), dans ce fichier seulement
const mots = t => t.match(/[A-Za-z_$][\w$]*/g) || [];
function pure(n) {
  if (!n) return true;
  switch (n.type) {
    case "Literal": case "Identifier": case "ArrowFunctionExpression": case "FunctionExpression": return true;
    case "TemplateLiteral": return n.expressions.every(pure);
    case "ArrayExpression": return n.elements.every(e => !e || (e.type === "SpreadElement" ? pure(e.argument) : pure(e)));
    case "ObjectExpression": return n.properties.every(p => p.type === "SpreadElement" ? pure(p.argument) : (!p.computed || pure(p.key)) && pure(p.value));
    case "UnaryExpression": return n.operator !== "delete" && pure(n.argument);
    case "BinaryExpression": case "LogicalExpression": return pure(n.left) && pure(n.right);
    case "ConditionalExpression": return pure(n.test) && pure(n.consequent) && pure(n.alternate);
    case "MemberExpression": return pure(n.object) && (!n.computed || pure(n.property));
    case "NewExpression": return n.callee.type === "Identifier" && ["Set", "Map", "RegExp"].includes(n.callee.name) && n.arguments.every(pure);
    default: return false;
  }
}
const noms = p => !p ? [] : p.type === "Identifier" ? [p.name] : p.type === "ObjectPattern" ? p.properties.flatMap(q => noms(q.value || q.argument)) : p.type === "ArrayPattern" ? p.elements.flatMap(noms) : p.type === "AssignmentPattern" ? noms(p.left) : p.type === "RestElement" ? noms(p.argument) : [];
let total = 0, octets = 0;
for (let tour = 1; tour < 30; tour++) {
  const files = fs.readdirSync(R).filter(f => f.endsWith(".mjs") && f !== "index.gen.mjs");
  const morceaux = []; // { f, start, end, noms, pur, texte }
  for (const f of files) {
    const s = fs.readFileSync(R + f, "utf8"), a = acorn.parse(s, { ecmaVersion: "latest", sourceType: "module" });
    for (const n of a.body) {
      if (n.type === "ImportDeclaration") continue;
      if (n.type === "ExportNamedDeclaration" && !n.declaration) continue; // export { a, b } : ne compte pas comme un usage
      const d = n.type === "ExportNamedDeclaration" ? n.declaration : n;
      let nm = [], pur = false;
      if (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") { nm = [d.id.name]; pur = true; }
      else if (d.type === "VariableDeclaration") { nm = d.declarations.flatMap(x => noms(x.id)); pur = d.declarations.every(x => pure(x.init)); }
      morceaux.push({ f, start: n.start, end: n.end, noms: nm, pur, texte: s.slice(n.start, n.end) });
    }
  }
  const compte = new Map(); // mot -> nombre de morceaux qui le contiennent
  for (const m of morceaux) { m.set = new Set(mots(m.texte)); for (const w of m.set) compte.set(w, (compte.get(w) || 0) + 1); }
  const morts = morceaux.filter(m => m.noms.length && m.pur && m.noms.every(w => !GARDER.has(w) && (TUER.has(m.f.replace(/\.mjs$/, "") + ":" + w) || (compte.get(w) || 0) - (m.set.has(w) ? 1 : 0) === 0)));
  if (!morts.length) break;
  total += morts.length; octets += morts.reduce((a, m) => a + m.end - m.start, 0);
  if (!SUPPR) { for (const m of morts) console.log(m.f.padEnd(16), m.noms.join(", ")); console.log(`(premier tour seulement) ${morts.length} déclarations mortes`); break; }
  for (const f of files) {
    let s = fs.readFileSync(R + f, "utf8");
    for (const m of morts.filter(m => m.f === f).sort((a, b) => b.start - a.start)) {
      let a = m.start, b = m.end;
      while (s[b] === " " || s[b] === ";") b++; if (s.slice(b, b + 2) === "//") { while (b < s.length && s[b] !== "\n") b++; }
      if (s[b] === "\n") b++;
      // commentaire collé juste au-dessus : retiré avec la déclaration
      let av = s.slice(0, a), mm;
      while ((mm = av.match(/(?:^|\n)([ \t]*\/\/[^\n]*\n)$/)) || (mm = av.match(/(?:^|\n)([ \t]*\/\*(?:(?!\*\/)[\s\S])*\*\/[ \t]*\n)$/))) { av = av.slice(0, av.length - mm[1].length); }
      s = av + s.slice(b);
    }
    fs.writeFileSync(R + f, s);
  }
}
// imports inutiles
let imp = 0;
if (SUPPR) for (const f of fs.readdirSync(R).filter(f => f.endsWith(".mjs") && f !== "index.gen.mjs")) {
  let s = fs.readFileSync(R + f, "utf8"); const a = acorn.parse(s, { ecmaVersion: "latest", sourceType: "module" });
  const corps = a.body.filter(n => n.type !== "ImportDeclaration").map(n => s.slice(n.start, n.end)).join("\n"), W = new Set(mots(corps));
  for (const n of a.body.filter(n => n.type === "ImportDeclaration" && n.specifiers.length).reverse()) {
    const garde = n.specifiers.filter(sp => W.has(sp.local.name)); if (garde.length === n.specifiers.length) continue;
    imp += n.specifiers.length - garde.length;
    let e = n.end; if (s[e] === "\n") e++;
    if (!garde.length) { s = s.slice(0, n.start) + s.slice(e); continue; }
    const def = garde.find(sp => sp.type === "ImportDefaultSpecifier"), ns = garde.find(sp => sp.type === "ImportNamespaceSpecifier"), nommes = garde.filter(sp => sp.type === "ImportSpecifier").map(sp => sp.imported.name === sp.local.name ? sp.local.name : `${sp.imported.name} as ${sp.local.name}`);
    const attr = s.slice(n.source.end, n.end);
    s = s.slice(0, n.start) + "import " + [def && def.local.name, ns && "* as " + ns.local.name, nommes.length && "{ " + nommes.join(", ") + " }"].filter(Boolean).join(", ") + " from " + s.slice(n.source.start, n.source.end) + attr + s.slice(n.end);
  }
  fs.writeFileSync(R + f, s);
}
if (SUPPR) console.log(`TOTAL : ${total} déclarations retirées (${Math.round(octets / 1024)} Ko), ${imp} imports retirés`);
