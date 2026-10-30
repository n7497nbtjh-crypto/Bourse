// Contrôle de cohérence accueil ↔ fiches : chaque carte de l'accueil (cours, devise, points) et l'exemple (marge, PER)
// doivent afficher exactement ce que la fiche correspondante affiche. Échoue au moindre écart. Usage : node scripts/check-coherence.js
const { ouvrir, aller } = require("./_site");
const norm = t => (t || "").replace(/\s+/g, " ").trim();
(async () => {
  const { b, p } = await ouvrir(); const err = [];
  await aller(p, "/", 2500);
  const cartes = await p.$$eval(".acc-card", L => L.map(a => ({ id: a.getAttribute("href").split("/").pop(), prix: a.querySelector(".acc-cp b") ? a.querySelector(".acc-cp b").textContent : null, pts: [...a.querySelectorAll(".acc-ct i")].map(i => i.textContent) })));
  const ex = await p.$eval(".acc-ex", a => ({ id: a.getAttribute("href").split("/").pop(), lignes: [...a.querySelectorAll(".acc-exr")].map(r => [r.querySelector(".acc-exk").textContent, r.querySelector("b").textContent]) })).catch(() => null);
  if (!ex) err.push("accueil : exemple absent"); // les cartes « Trois fiches » ont disparu au lot 3 ; l'exemple reste contrôlé
  for (const c of cartes) {
    await aller(p, "/entreprise/" + c.id, 3000);
    const f = await p.evaluate(() => ({ prix: document.querySelector(".pxhead .p") && document.querySelector(".pxhead .p").textContent, pts: [...(document.querySelector(".rf-tally") ? document.querySelector(".rf-tally").querySelectorAll("span") : [])].map(s => (s.textContent.match(/\d+/) || [""])[0]) }));
    if (c.prix && norm(c.prix) !== norm(f.prix)) err.push(`${c.id} : cours « ${norm(c.prix)} » sur l'accueil, « ${norm(f.prix)} » sur la fiche`);
    if (c.pts.length && c.pts.join("/") !== f.pts.join("/")) err.push(`${c.id} : points ${c.pts.join("/")} sur l'accueil, ${f.pts.join("/")} sur la fiche`);
  }
  if (ex) {
    await aller(p, "/entreprise/" + ex.id, 3000);
    const figs = await p.$$eval("#retenir .rf6-fig", L => L.map(f => [f.querySelector("small").textContent, f.querySelector("b").textContent]));
    const per = await p.$eval(".rf6-mods", () => { const f = [...document.querySelectorAll(".rf6-fig")].find(x => x.querySelector("small").textContent === "PER"); return f ? f.querySelector("b").textContent : null; }).catch(() => null);
    for (const [l, v] of ex.lignes) {
      if (l === "Marge d'exploitation") { const f = figs.find(x => x[0] === l); if (!f) err.push(`${ex.id} : « ${l} » absent de la fiche`); else if (norm(f[1]) !== norm(v)) err.push(`${ex.id} : ${l} « ${norm(v)} » sur l'accueil, « ${norm(f[1])} » sur la fiche`); }
      if (/PER/.test(l)) { const n = v.match(/\d+/); if (!per || !n || !per.startsWith(n[0])) err.push(`${ex.id} : PER « ${norm(v)} » sur l'accueil, « ${norm(per)} » sur la fiche`); }
    }
    if (!ex.lignes.some(([l]) => l === "Marge d'exploitation")) err.push(`${ex.id} : l'exemple n'affiche pas la marge d'exploitation`);
  }
  await b.close();
  console.log(err.length ? "ÉCARTS :\n- " + err.join("\n- ") : `OK : ${cartes.length ? cartes.length + " cartes et " : ""}l'exemple ${ex && ex.id} concorde${cartes.length ? "nt" : ""} avec la fiche`);
  process.exit(err.length ? 1 : 0);
})();
