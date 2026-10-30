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
  if (ex) { // l'exemple de l'accueil contre la fiche : marge d'exploitation (tuile « marge ») et PER (section Valorisation), comparés en nombre
    await aller(p, "/entreprise/" + ex.id, 3500);
    const f = await p.evaluate(() => { document.querySelectorAll("#tous-les-chiffres details").forEach(d => d.open = true);
      const k = document.querySelector('.rf-kt[data-g="marge"] b'), v = document.querySelector("#rf-valorisation");
      const per = v && (v.innerText.match(/PER\s*\n?\s*i?\s*\n?\s*(\d+(?:[,.]\d+)?)/) || v.innerText.match(/coûte (\d+) fois/) || [])[1];
      return { marge: k ? k.textContent : null, per: per || null }; });
    const num = t => { const m = String(t || "").replace(/\s/g, "").match(/-?\d+(?:[,.]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : null; };
    for (const [l, v] of ex.lignes) {
      if (l === "Marge d'exploitation") { if (f.marge == null) err.push(`${ex.id} : marge absente de la fiche`); else if (Math.round(num(f.marge)) !== Math.round(num(v))) err.push(`${ex.id} : ${l} « ${norm(v)} » sur l'accueil, « ${norm(f.marge)} » sur la fiche`); }
      if (/PER/.test(l)) { if (f.per == null) err.push(`${ex.id} : PER absent de la fiche`); else if (Math.round(num(f.per)) !== Math.round(num(v))) err.push(`${ex.id} : PER « ${norm(v)} » sur l'accueil, « ${norm(f.per)} » sur la fiche`); }
    }
    if (!ex.lignes.some(([l]) => l === "Marge d'exploitation")) err.push(`${ex.id} : l'exemple n'affiche pas la marge d'exploitation`);
  }
  // 1.3 (30/10) : sur N fiches au hasard (50 par défaut), aucun PER > 100 ni taux de distribution > 150 % affiché en clair, plis ouverts compris
  const N = +(process.argv[2] || 50), fs = require("fs"), path = require("path"), ROOT = require("./_site").ROOT;
  const ids = fs.readdirSync(path.join(ROOT, "data", "societes")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  let vus = 0;
  for (const id of ids) { if (vus >= N) break;
    await aller(p, "/entreprise/" + id, 3000);
    const r = await p.evaluate(() => { if (!document.querySelector(".rf-vc")) return null; document.querySelectorAll("#tous-les-chiffres details").forEach(d => d.open = true); const num = e => { const m = e.textContent.replace(/\s/g, "").match(/^-?\d+(?:[,.]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : null; }; // chiffres « en clair » : tuiles, cases, grands chiffres (les phrases d'explication peuvent citer la valeur avec son contexte)
      const per = [...document.querySelectorAll('.rf-kt[data-g="per"] b, .tile .v, td.num, .acc-exr b, .rf-cv')].filter(e => /fois|^\d/.test(e.textContent) && /PER|fois/i.test((e.closest(".tile, td, .rf-kt, .acc-exr") || e).textContent)).map(num).filter(x => x != null && x > 100);
      const pay = [...document.querySelectorAll('.rf-kt[data-g="payout"] b, .tile .v, td.num')].filter(e => /bénéfice|distribution|versée|Part/i.test((e.closest(".tile, tr, .rf-kt") || e).textContent) && /%/.test(e.textContent)).map(num).filter(x => x != null && x > 150);
      return { per, pay, verdict: (document.querySelector(".rf-vc") || {}).textContent || "" }; });
    if (!r) continue; vus++;
    if (r.per.length) err.push(`${id} : PER affiché en clair ${r.per.join(", ")}`);
    if (r.pay.length) err.push(`${id} : taux de distribution affiché en clair ${r.pay.join(", ")} %`);
  }
  await b.close();
  console.log(err.length ? "ÉCARTS :\n- " + err.join("\n- ") : `OK : l'exemple ${ex && ex.id} concorde avec la fiche ; ${vus} fiches sans PER > 100 ni distribution > 150 % en clair`);
  process.exit(err.length ? 1 : 0);
})();
