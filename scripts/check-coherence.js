// Contrôle de cohérence accueil ↔ fiches : chaque carte de l'accueil (cours, devise, points) et l'exemple (marge, PER)
// doivent afficher exactement ce que la fiche correspondante affiche. Échoue au moindre écart. Usage : node scripts/check-coherence.js
const { ouvrir, aller } = require("./_site");
const norm = t => (t || "").replace(/\s+/g, " ").trim();
(async () => {
  const { b, p } = await ouvrir(); const err = [];
  await aller(p, "/", 2500);
  const cartes = await p.$$eval(".acc-card", L => L.map(a => ({ id: a.getAttribute("href").split("/").pop(), prix: a.querySelector(".acc-cp b") ? a.querySelector(".acc-cp b").textContent : null, pts: [...a.querySelectorAll(".acc-ct i")].map(i => i.textContent) })));
  const ex = await p.$eval("#a4-ex", a => ({ id: a.querySelector(".a4-go").getAttribute("href").split("/").pop(), lignes: [["Chiffre d'affaires", a.querySelector(".a4-n").textContent]] })).catch(() => null); // 2/11 : accueil v4, la carte d'exemple (marge en grand)
  if (!ex) err.push("accueil : exemple absent"); // les cartes « Trois fiches » ont disparu au lot 3 ; l'exemple reste contrôlé
  for (const c of cartes) {
    await aller(p, "/entreprise/" + c.id, 3000);
    const f = await p.evaluate(() => ({ prix: document.querySelector(".pxhead .p, .ek-pcard .ek-p b") && document.querySelector(".pxhead .p, .ek-pcard .ek-p b").textContent, pts: [...(document.querySelector(".rf-tally") ? document.querySelector(".rf-tally").querySelectorAll("span") : [])].map(s => (s.textContent.match(/\d+/) || [""])[0]) }));
    if (c.prix && norm(c.prix) !== norm(f.prix)) err.push(`${c.id} : cours « ${norm(c.prix)} » sur l'accueil, « ${norm(f.prix)} » sur la fiche`);
    if (c.pts.length && c.pts.join("/") !== f.pts.join("/")) err.push(`${c.id} : points ${c.pts.join("/")} sur l'accueil, ${f.pts.join("/")} sur la fiche`);
  }
  if (ex) { // l'exemple de l'accueil contre la fiche : marge d'exploitation (tuile « marge ») et PER (section Valorisation), comparés en nombre
    await aller(p, "/entreprise/" + ex.id, 3500);
    const f = await p.evaluate(() => { document.querySelectorAll("#tous-les-chiffres details").forEach(d => d.open = true);
      const k = document.querySelector('.f3-kt[data-f3k="marge"] b, .rf-kt[data-g="marge"] b, .ek-chain .ek-rp:nth-child(1)'), v = document.querySelector("#rf-valorisation, .ek-chain .ek-rp:last-child");
      const per = v && (v.innerText.match(/PER\s*\n?\s*i?\s*\n?\s*(\d+(?:[,.]\d+)?)/) || v.innerText.match(/coûte (\d+) fois/) || [])[1];
      return { marge: k ? ((k.innerText.match(/(\d+(?:,\d+)?)\s*Md€/) || [])[1] || null) : null, per: per || null }; });
    const num = t => { const m = String(t || "").replace(/\s/g, "").match(/-?\d+(?:[,.]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : null; };
    for (const [l, v] of ex.lignes) {
      if (l === "Chiffre d'affaires") { if (f.marge == null) err.push(`${ex.id} : chiffre d'affaires absent de la fiche`); else if (Math.round(num(f.marge)) !== Math.round(num(v))) err.push(`${ex.id} : ${l} « ${norm(v)} » sur l'accueil, « ${norm(f.marge)} » sur la fiche`); }
      if (/PER/.test(l)) { if (f.per == null) err.push(`${ex.id} : PER absent de la fiche`); else if (Math.round(num(f.per)) !== Math.round(num(v))) err.push(`${ex.id} : PER « ${norm(v)} » sur l'accueil, « ${norm(f.per)} » sur la fiche`); }
    }
    if (!ex.lignes.some(([l]) => l === "Chiffre d'affaires")) err.push(`${ex.id} : l'exemple n'affiche pas le chiffre d'affaires`);
  }
  // 1.3 (30/10) : sur N fiches au hasard (50 par défaut), aucun PER > 100 ni taux de distribution > 150 % affiché en clair, plis ouverts compris
  const N = +(process.argv[2] || 50), fs = require("fs"), path = require("path"), ROOT = require("./_site").ROOT;
  const ids = fs.readdirSync(path.join(ROOT, "data", "societes")).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  let vus = 0;
  for (const id of ids) { if (vus >= N) break;
    await aller(p, "/entreprise/" + id, 3000);
    const r = await p.evaluate(() => { if (!document.querySelector(".rf-vc, .ek-vrd")) return null; document.querySelectorAll("#tous-les-chiffres details, #tout details, .ek-more").forEach(d => d.open = true); const num = e => { const m = e.textContent.replace(/\s/g, "").match(/^-?\d+(?:[,.]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : null; }; // chiffres « en clair » : tuiles, cases, grands chiffres (les phrases d'explication peuvent citer la valeur avec son contexte)
      const per = [...document.querySelectorAll('.rf-kt[data-g="per"] b, .tile .v, td.num, .acc-exr b, .rf-cv, .ek-chain .ek-rp:last-child .ek-v, .ek-tbl td')].filter(e => /fois|^\d/.test(e.textContent) && /PER|fois/i.test((e.closest(".tile, tr, .rf-kt, .acc-exr, .ek-rp") || e).textContent)).map(num).filter(x => x != null && x > 100);
      const pay = [...document.querySelectorAll('.rf-kt[data-g="payout"] b, .tile .v, td.num, .ek-chain .ek-rp:nth-last-child(2) .ek-v')].filter(e => !/⚠/.test(e.textContent) && !/verse plus/.test((e.closest(".tile, tr, .rf-kt") || e).textContent)).filter(e => /bénéfice|distribution|versée|Part/i.test((e.closest(".tile, tr, .rf-kt, .ek-rp") || e).textContent) && /%/.test(e.textContent)).map(num).filter(x => x != null && x > 150);
      const h4 = [...document.querySelectorAll(".ek-h")].map(e => (e.textContent.match(/reverse (\d+) %/) || [])[1]).filter(Boolean).map(Number).filter(x => x > 150); pay.push(...h4);
      return { per, pay, verdict: (document.querySelector(".rf-vc, .ek-vrd") || {}).textContent || "" }; });
    if (!r) continue; vus++;
    if (r.per.length) err.push(`${id} : PER affiché en clair ${r.per.join(", ")}`);
    if (r.pay.length) err.push(`${id} : taux de distribution affiché en clair ${r.pay.join(", ")} %`);
  }
  await b.close();
  // 4e passage, 1.4 : fourchettes sur 1 an suspectes (plus haut / plus bas > 3) dans les cours : signalées, la fiche ne les affiche pas
  try { const C = JSON.parse(require("fs").readFileSync("cf/site/data/cours.json", "utf8")).items || {}; const sus = Object.entries(C).filter(([k, v]) => k.startsWith("c:") && v.l52 > 0 && v.h52 / v.l52 > 3).map(([k, v]) => `${k.slice(2)} (${v.l52}–${v.h52})`);
    if (sus.length) console.log(`Fourchettes sur 1 an suspectes (ratio > 3, masquées sur la fiche) : ${sus.length}. ${sus.slice(0, 8).join(", ")}${sus.length > 8 ? "…" : ""}`); } catch (e) { }
  console.log(err.length ? "ÉCARTS :\n- " + err.join("\n- ") : `OK : l'exemple ${ex && ex.id} concorde avec la fiche ; ${vus} fiches sans PER > 100 ni distribution > 150 % en clair`);
  process.exit(err.length ? 1 : 0);
})();
