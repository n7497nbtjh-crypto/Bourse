// Retire de cf/site/site.css les règles dont TOUS les sélecteurs visent une classe qui n'existe plus nulle part
// dans le JavaScript, index.html ou les données (3/11/2026, ménage de l'accueil puis du lot 3).
// Usage : node scripts/css-mort.js <préfixe> [<préfixe>…] [--ecrire]   ex. node scripts/css-mort.js acc- rf- f3- --ecrire
// Sans --ecrire : affiche seulement ce qui serait retiré.
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "cf", "site"), CSS = path.join(ROOT, "site.css");
const args = process.argv.slice(2), ecrire = args.includes("--ecrire"), pref = args.filter(a => !a.startsWith("--"));
if (!pref.length) { console.log("Préfixe de classe manquant (ex. acc-)."); process.exit(1); }
// Tout le code qui peut écrire une classe : modules, app.js, index.html, worker
const fichiers = [path.join(ROOT, "app.js"), path.join(ROOT, "index.html"), ...fs.readdirSync(path.join(ROOT, "m")).filter(f => f.endsWith(".js")).map(f => path.join(ROOT, "m", f))];
const code = fichiers.map(f => fs.readFileSync(f, "utf8")).join("\n");
const vue = {}; const utilisee = c => vue[c] ?? (vue[c] = new RegExp(`(^|[^a-zA-Z0-9_-])${c.replace(/[-]/g, "\\-")}($|[^a-zA-Z0-9_-])`).test(code));
const css = fs.readFileSync(CSS, "utf8");
// Découpe en règles (en suivant les accolades) ; les @media sont parcourus à l'intérieur
let out = "", i = 0, retirees = [];
function regle(sel, corps) {
  const sels = sel.split(",").map(s => s.trim()).filter(Boolean);
  const morte = s => { const cl = (s.match(/\.[a-zA-Z_][\w-]*/g) || []).map(x => x.slice(1)).filter(c => pref.some(p => c.startsWith(p))); return cl.length && cl.some(c => !utilisee(c)); };
  if (sels.length && sels.every(morte)) { retirees.push(sel.trim().slice(0, 120)); return ""; }
  const garde = sels.filter(s => !morte(s));
  return (garde.length < sels.length ? garde.join(",") : sel) + "{" + corps + "}";
}
function bloc(txt) {
  let r = "", k = 0;
  while (k < txt.length) {
    const a = txt.indexOf("{", k); if (a < 0) { r += txt.slice(k); break; }
    const tete = txt.slice(k, a);
    let d = 1, b = a + 1; while (b < txt.length && d) { if (txt[b] === "{") d++; else if (txt[b] === "}") d--; b++; }
    const corps = txt.slice(a + 1, b - 1);
    // garde les commentaires et espaces avant le sélecteur
    const m = tete.match(/^([\s\S]*?)([^\s/][^/]*)$/) || ["", "", tete], avant = tete.slice(0, tete.length - (m[2] || "").length), sel = m[2] || tete;
    if (/^\s*@(media|supports)/.test(sel)) { const inner = bloc(corps); r += avant + (inner.trim() ? sel + "{" + inner + "}" : ""); }
    else if (/^\s*@/.test(sel)) r += tete + "{" + corps + "}";
    else r += avant + regle(sel, corps);
    k = b;
  }
  return r;
}
out = bloc(css);
console.log(`${retirees.length} règle(s) à retirer (${(css.length - out.length) / 1000 | 0} ko sur ${css.length / 1000 | 0} ko)`);
retirees.slice(0, 15).forEach(r => console.log("  - " + r));
if (ecrire) { fs.writeFileSync(CSS, out); console.log("site.css réécrit."); }
