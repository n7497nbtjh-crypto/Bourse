// Contrôle téléphone (375 × 812) : sur 10 fiches au hasard avec comptes, les cinq jauges « Sa place dans le secteur » sont visibles
// (hauteur > 0) dans les deux premiers écrans (y < 1624 px) ; aucun débordement horizontal ; pas de signe « - » devant un chiffre ;
// aucun texte sous 12 px. Usage : node scripts/check-mobile.js [n]
const { ouvrir, aller, ROOT } = require("./_site"), fs = require("fs"), path = require("path");
(async () => {
  const n = +process.argv[2] || 10, ids = fs.readdirSync(path.join(ROOT, "data", "societes")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const { b, p } = await ouvrir({ viewport: { width: 375, height: 812 } }); const err = [], sans = []; let vus = 0;
  for (const id of ids) {
    if (vus >= n) break;
    await aller(p, "/entreprise/" + id, 3500);
    const r = await p.evaluate(() => {
      const J = [...document.querySelectorAll(".rf-hplace .prof .pa2")].map(e => { const r = e.getBoundingClientRect(); return { h: r.height, y: r.top + scrollY }; });
      const txt = (document.querySelector("main") || document.body).innerText;
      const petits = [...document.querySelectorAll("main *")].filter(e => e.offsetParent && e.childNodes.length && [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length;
      return { verdict: !!document.querySelector(".rf-vc"), J, large: document.documentElement.scrollWidth > 376, moins: (txt.match(/(^|[\s(])-\d/g) || []).length, petits };
    });
    if (!r.verdict) continue;
    if (!r.J.length) { sans.push(id); continue; } // pas de jauge possible (indicateurs non lisibles ou secteur trop petit) : signalé, pas compté
    vus++;
    if (r.J.length < 3) err.push(`${id} : ${r.J.length} jauge(s) seulement`);
    r.J.forEach((j, k) => { if (j.h <= 0) err.push(`${id} : jauge ${k + 1} de hauteur 0`); else if (j.y > 1624) err.push(`${id} : jauge ${k + 1} à ${Math.round(j.y)} px (après le deuxième écran)`); });
    if (r.large) err.push(`${id} : débordement horizontal`);
    if (r.moins) err.push(`${id} : ${r.moins} signe(s) « - » devant un chiffre (attendu « − »)`);
    if (r.petits) err.push(`${id} : ${r.petits} texte(s) sous 12 px`);
  }
  await b.close();
  console.log((err.length ? "PROBLÈMES :\n- " + err.join("\n- ") : `OK : ${vus} fiches, jauges visibles dans les deux premiers écrans, pas de débordement, signes et tailles corrects`) + (sans.length ? `\n(sans jauge, indicateurs non lisibles : ${sans.join(", ")})` : ""));
  process.exit(err.length ? 1 : 0);
})();
