// 13/11 (recentrage) : outil du chantier. Demande le module acorn (npm i --no-save acorn).
// node extraire.js <source.mjs> <cible.mjs> nom1 nom2 … : déplace ces déclarations (et celles dont elles dépendent dans le même fichier) vers la cible.
const fs = require("fs"), acorn = require("acorn");
const [srcF, cibF, ...noms0] = process.argv.slice(2), noms = noms0.filter(x => !x.startsWith("--")), s = fs.readFileSync(srcF, "utf8");
const ast = acorn.parse(s, { ecmaVersion: "latest", sourceType: "module" });
const D = new Map(), mots = t => new Set(t.match(/[A-Za-z_$][\w$]*/g) || []);
for (const n of ast.body) {
  let d = n, exp = false; if (n.type === "ExportNamedDeclaration" && n.declaration) { d = n.declaration; exp = true; }
  const ids = d.type === "FunctionDeclaration" ? [d.id.name] : d.type === "VariableDeclaration" ? d.declarations.map(x => x.id.type === "Identifier" ? x.id.name : null).filter(Boolean) : [];
  for (const id of ids) D.set(id, { start: n.start, end: n.end, exp, texte: s.slice(d.start, d.end), refs: mots(s.slice(n.start, n.end)), ids });
}
const pris = new Set(), file = [...noms];
while (file.length) { const n = file.pop(); if (pris.has(n)) continue; const d = D.get(n); if (!d) { console.error("introuvable :", n); process.exit(1); } pris.add(n); for (const w of d.refs) if (D.has(w) && !pris.has(w)) file.push(w); }
// noms importés par la source dont les morceaux déplacés ont besoin
const imports = ast.body.filter(n => n.type === "ImportDeclaration"), besoin = [];
const blocs = [...new Map([...pris].map(n => [D.get(n).start, D.get(n)])).values()].sort((a, b) => a.start - b.start);
for (const im of imports) { const L = im.specifiers.map(x => x.local.name).filter(n => blocs.some(b => b.refs.has(n))); if (L.length) besoin.push(`import { ${L.join(", ")} } from ${im.source.raw};`); }
const reste = [...D.entries()].filter(([n]) => !pris.has(n));
const dep = [...new Set(blocs.flatMap(b => [...b.refs]).filter(w => reste.some(([n]) => n === w)))];
if (dep.length) { console.error("les morceaux déplacés dépendent encore de la source :", dep.join(" ")); }
const cible = besoin.join("\n") + (besoin.length ? "\n\n" : "") + blocs.map(b => "export " + b.texte).join("\n") + "\n";
let out = s; for (const b of blocs.slice().reverse()) { let e = b.end; if (out[e] === "\n") e++; out = out.slice(0, b.start) + out.slice(e); }
const tous = [...pris], reexp = tous.filter(n => D.get(n).exp), utilises = tous.filter(n => new RegExp("(?<![\\w$.])" + n.replace(/\$/g, "\\$") + "(?![\\w$])").test(out));
const cibRel = "./" + cibF.split("/").pop();
const tete = (utilises.length ? `import { ${utilises.join(", ")} } from "${cibRel}";\n` : "") + (reexp.length ? `export { ${reexp.join(", ")} } from "${cibRel}";\n` : "");
const derImp = imports.length ? imports[imports.length - 1].end : 0;
// la position d'insertion est calculée sur la source d'origine : on réinsère après le dernier import si aucun bloc déplacé n'est avant
const avant = blocs.filter(b => b.end <= derImp).length; if (avant) { console.error("bloc déplacé avant les imports : cas non prévu"); process.exit(1); }
out = out.slice(0, derImp) + "\n" + tete + out.slice(derImp);
if (process.argv.includes("--ecrire")) { fs.writeFileSync(srcF, out); fs.writeFileSync(cibF, (fs.existsSync(cibF) ? fs.readFileSync(cibF, "utf8") : "") + cible); }
console.log("déplacés :", tous.join(" "), "| réexportés :", reexp.join(" "), "| encore utilisés dans la source :", utilises.join(" "), "| imports nécessaires :", besoin.join(" "));
