// Contrôle anti-doublon sur les fiches : sur 20 fiches au hasard (avec comptes), le texte affiché (niveau 1, plis fermés)
// ne doit porter chaque mot de verdict qu'une seule fois. Usage : node scripts/check-doublons.js [n]
const { ouvrir, aller, ROOT } = require("./_site"), fs = require("fs"), path = require("path");
const TERMES = [/\brentable\b/g, /\bendettée\b/g, /\bchère\b/g, /\bbon marché\b/g, /\bprix dans la norme\b/g, /\ben perte\b/g, /\bpoints? forts?\b/g, /\bà surveiller\b/g];
(async () => {
  const n = +process.argv[2] || 20, ids = fs.readdirSync(path.join(ROOT, "data", "societes")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const { b, p } = await ouvrir(); const err = []; let vus = 0;
  for (const id of ids) {
    if (vus >= n) break;
    await aller(p, "/entreprise/" + id, 3500);
    const r = await p.evaluate(() => { const m = document.querySelector("main") || document.body; return { txt: m.innerText, tabs: document.querySelectorAll("#etapes, .f2tabs, .qtabs").length, verdict: !!document.querySelector(".rf-vc") }; });
    if (!r.verdict) continue; // fiche sans comptes : pas de verdict, pas de doublon possible
    vus++;
    if (r.tabs) err.push(`${id} : ${r.tabs} barre(s) d'onglets`);
    const t = r.txt.toLowerCase().replace(/\s+/g, " ");
    for (const re of TERMES) { const k = (t.match(re) || []).length; if (k > 1) err.push(`${id} : « ${re.source.replace(/\\b/g, "")} » ${k} fois`); }
  }
  await b.close();
  console.log(err.length ? "DOUBLONS :\n- " + err.join("\n- ") : `OK : ${vus} fiches, chaque mot de verdict une seule fois, zéro onglet`);
  process.exit(err.length ? 1 : 0);
})();
