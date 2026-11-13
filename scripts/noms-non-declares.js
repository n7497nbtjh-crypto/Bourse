// Dépendances : acorn et eslint 8 (npm i acorn eslint@8 dans un dossier de travail), comme scripts/code-mort.js.
// Noms utilisés mais déclarés nulle part : toutes les déclarations de premier niveau des scripts d'index.html sont des globales.
const fs=require("fs"),path=require("path"),acorn=require("acorn"),{Linter}=require("eslint");
const site=path.join(__dirname,"..","cf","site");
const html=fs.readFileSync(site+"/index.html","utf8");
const files=[...html.matchAll(/<script[^>]*src="\/([^"?]+\.js)/g)].map(m=>m[1]);
const glob={};
const add=p=>{ if(!p)return; if(p.type==="Identifier")glob[p.name]="writable"; else if(p.type==="ObjectPattern")p.properties.forEach(q=>add(q.value||q.argument)); else if(p.type==="ArrayPattern")p.elements.forEach(add); else if(p.type==="AssignmentPattern")add(p.left); else if(p.type==="RestElement")add(p.argument); };
const src={};
for(const f of files){ const s=fs.readFileSync(site+"/"+f,"utf8"); src[f]=s; const a=acorn.parse(s,{ecmaVersion:"latest"});
  for(const n of a.body){ if(n.type==="FunctionDeclaration"||n.type==="ClassDeclaration")glob[n.id.name]="writable"; else if(n.type==="VariableDeclaration")n.declarations.forEach(d=>add(d.id)); }
  for(const m of s.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g))glob[m[1]]="writable"; }
const L=new Linter(); let n=0;
for(const f of files){ const r=L.verify(src[f],{parserOptions:{ecmaVersion:"latest"},env:{browser:true,es2022:true},globals:glob,rules:{"no-undef":["error",{typeof:false}]}});
  for(const m of r){ n++; console.log(f+":"+m.line+" "+m.message); } }
console.log(n+" nom(s) non déclaré(s), "+files.length+" scripts");
