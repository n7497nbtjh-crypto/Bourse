// Compare deux dossiers de captures point par point (pixelmatch 5, pngjs). Usage : node scripts/captures-toutes.js /tmp/avant ; … ; node scripts/captures-toutes.js /tmp/apres ; node scripts/captures-comparer.js /tmp/avant /tmp/apres
const fs = require("fs"), { PNG } = require("pngjs"), pm = require("pixelmatch");
const [a, b] = process.argv.slice(2); let diff = 0, n = 0; const L = [];
for (const f of fs.readdirSync(a)) { n++; if (!fs.existsSync(b + "/" + f)) { L.push(f + " : absent"); diff++; continue; }
  const A = PNG.sync.read(fs.readFileSync(a + "/" + f)), B = PNG.sync.read(fs.readFileSync(b + "/" + f));
  if (A.width !== B.width || A.height !== B.height) { L.push(`${f} : taille ${A.width}x${A.height} → ${B.width}x${B.height}`); diff++; continue; }
  const d = pm(A.data, B.data, null, A.width, A.height, { threshold: 0.1 }); if (d > 0) { L.push(`${f} : ${d} points différents`); diff++; } }
console.log(L.join("\n")); console.log(`${n} captures comparées, ${diff} différentes`);
