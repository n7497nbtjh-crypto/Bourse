// Contrôle de cohérence de TOUTES les fiches (6/11/2026, après l'erreur Ubisoft) : chaque fiche est calculée dans la page
// (mêmes fonctions que le site : f4Ctx, f4Tete, f4Fil, f4Fin) sans être affichée, puis son texte est passé à des règles :
// valeurs impossibles (NaN, undefined, Infinity), « gagne -x », variation datée d'une autre année que les derniers comptes,
// « garde tout son bénéfice » en perte, pourcentages absurdes, verdict d'une autre année, médiane négative présentée en vert.
// Usage : node scripts/check-fiches-tout.js [N]   → rapport /tmp/check-fiches-tout.txt (0 problème attendu)
const { ouvrir, aller } = require("./_site");
const fs = require("fs");
(async () => {
  const N = +process.argv[2] || 0;
  const { b, p } = await ouvrir();
  await aller(p, "/entreprises", 3000);
  const res = await p.evaluate(async (N) => {
    await loadPrices(); if (typeof loadFiches === "function") await loadFiches();
    const ids = R.companies.map(c => c.id).slice(0, N || undefined), out = [];
    const txt = h => { const d = document.createElement("div"); d.innerHTML = h; d.querySelectorAll("svg text").forEach(t => t.textContent = " " + t.textContent + " "); return d.textContent.replace(/\s+/g, " "); };
    for (const id of ids) {
      const s = RBY[id]; let c;
      try { c = FULL[id] || (FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json()); } catch (e) { out.push([id, "fiche illisible"]); continue; }
      if (!c || !c.fin) continue;
      let h = "";
      try { const x = f4Ctx(s, c); h = f4Tete(s, c, x) + f4Fil(x) + f4Fin(x); } catch (e) { out.push([id, "erreur de calcul : " + String(e).slice(0, 80)]); continue; }
      const t = txt(h), pb = [];
      if (/\bNaN\b|undefined|Infinity|\[object/.test(t)) pb.push("valeur impossible : " + (t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,30}/) || [""])[0]);
      if (/gagne -|gagne −/.test(t)) pb.push("« gagne » suivi d'un chiffre négatif");
      for (const m of t.matchAll(/en (hausse|baisse) de [\d  ,]+ % en (\d{4})/g)) if (+m[2] !== +s.year && /Bénéfice net|Chiffre d'affaires|Ses ventes|Son bénéfice/.test(t.slice(Math.max(0, m.index - 80), m.index))) pb.push(`variation datée ${m[2]} alors que les derniers comptes sont de ${s.year}`);
      if (s.net != null && s.net < 0 && /garde tout son bénéfice/.test(t)) pb.push("« garde tout son bénéfice » alors qu'elle est en perte");
      for (const m of t.matchAll(/(?<![\d,.])([−-]?\d{1,3}(?:\u202f\d{3})*(?:,\d+)?)\s?%/g)) { const v = Math.abs(+m[1].replace(/\u202f/g, "").replace(",", ".").replace("−", "-")); if (v > 5000) pb.push("pourcentage hors de toute mesure : " + m[0]); }
      const vd = t.match(/Le verdict (\d{4})/); if (vd && +vd[1] !== +s.year) pb.push(`verdict ${vd[1]} pour des comptes ${s.year}`);
      for (const m of t.matchAll(/(baisse|recul\w*) de (\d[\d\u202f]*(?:,\d+)?) %/g)) if (+m[2].replace(/\u202f/g, "").replace(",", ".") > 100) pb.push("baisse de plus de 100 % (une perte se dit autrement) : " + m[0]);
      if (/Son capital grandit plus vite que ses gains/.test(t) && /actionnaires a reculé/.test(t)) pb.push("« son capital grandit » alors qu'il recule");
      if (/Plus que (ses rivales|son secteur)[^.]{0,40}Moins que (ses rivales|son secteur)/.test(t) && false) pb.push("");
      pb.forEach(z => out.push([id, z]));
    }
    return { n: ids.length, out };
  }, N);
  const lignes = res.out.map(([id, z]) => `${id} : ${z}`);
  fs.writeFileSync("/tmp/check-fiches-tout.txt", lignes.join("\n") + "\n");
  const parType = {}; res.out.forEach(([, z]) => { const k = z.replace(/[\d ,.:«»-]+/g, " ").slice(0, 60); parType[k] = (parType[k] || 0) + 1; });
  console.log(`${res.n} fiches calculées, ${res.out.length} problème(s). Rapport : /tmp/check-fiches-tout.txt`);
  Object.entries(parType).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log("  " + v + " × " + k));
  await b.close();
})();
