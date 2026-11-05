// Retire de cf/site/site.css les règles dont TOUS les sélecteurs visent une classe qui n'existe plus nulle part
// dans le JavaScript, index.html ou les données (3/11/2026, ménage de l'accueil puis du lot 3).
// Usage : node scripts/css-mort.js <préfixe> [<préfixe>…] [--ecrire]   ex. node scripts/css-mort.js acc- rf- f3- --ecrire
// Sans --ecrire : affiche seulement ce qui serait retiré.
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "cf", "site"), CSS = path.join(ROOT, "site.css");
const args = process.argv.slice(2), ecrire = args.includes("--ecrire"), pref = args.filter(a => !a.startsWith("--"));
if (!pref.length) { console.log("Préfixe de classe manquant (ex. acc-)."); process.exit(1); }
// Tout le code qui peut écrire une classe : modules, app.js, index.html, worker
const SRC = path.join(__dirname, "..", "cf", "src"); // 5/11 : le Worker écrit aussi des pages (questions, partage) : ses classes comptent
const fichiers = [path.join(ROOT, "app.js"), path.join(ROOT, "index.html"), ...fs.readdirSync(ROOT).filter(f => /\.(js|html)$/.test(f) && f !== "app.js" && f !== "index.html" && !f.startsWith("_")).map(f => path.join(ROOT, f)), ...fs.readdirSync(path.join(ROOT, "m")).filter(f => f.endsWith(".js")).map(f => path.join(ROOT, "m", f)), ...fs.readdirSync(SRC).filter(f => f.endsWith(".mjs") && !f.endsWith(".gen.mjs")).map(f => path.join(SRC, f)), ...["legal.json", "questions.json"].map(f => path.join(ROOT, "data", f)).filter(f => fs.existsSync(f))];
const code = fichiers.map(f => fs.readFileSync(f, "utf8")).join("\n");
// 5/11 : classes construites par morceaux (`lv-${x}`, "pf3-" + x) : tout nom qui commence par un de ces morceaux compte comme utilisé
const DYN = [...new Set([...code.matchAll(/([a-zA-Z][\w-]*-)\$\{/g), ...code.matchAll(/["'`]([a-zA-Z][\w-]*-)["'`]\s*\+/g)].map(m => m[1]))];
const vue = {}; const utilisee = c => DYN.some(d => c.startsWith(d)) || (vue[c] ?? (vue[c] = new RegExp(`(^|[^a-zA-Z0-9_-])${c.replace(/[-]/g, "\\-")}($|[^a-zA-Z0-9_-])`).test(code)));
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
(process.argv.includes("--tout") ? retirees : retirees.slice(0, 15)).forEach(r => console.log("  - " + r));
if (ecrire) { fs.writeFileSync(CSS, out); console.log("site.css réécrit."); }
