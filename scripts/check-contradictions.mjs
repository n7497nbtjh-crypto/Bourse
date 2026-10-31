// 4e passage (31/10, lot A 1.5) : aucune fiche ne doit se contredire.
// Le site est ouvert UNE fois (Playwright, hors ligne, fichiers du dépôt) et ses propres fonctions (rfAxes, rfVerdictMots,
// rfPosition, valo) sont appliquées aux ~2 850 entreprises, sans rendre une seule fiche. Échoue (code 1) si :
//   - un mot du verdict contredit la jauge correspondante (rentable ↔ Marge, endettée ↔ Solidité, chère / bon marché ↔ Prix) ;
//   - la jauge Dividende et le rendement ne vont pas dans le même sens (jauge à droite avec un rendement nul, ou l'inverse) ;
//   - la position d'une jauge et la phrase « mieux / moins bien placée que X % » de sa section ne concordent pas ;
//   - la fourchette sur 1 an est absurde (plus haut / plus bas > 3) tout en étant affichée.
// Écrit data/contradictions.json : nombre de fiches en défaut, et les 20 premiers exemples. Objectif : 0.
//   node scripts/check-contradictions.mjs
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { ouvrir, aller } = require("./_site.js");

const { b, p } = await ouvrir();
await aller(p, "/entreprise/lvmh", 2500); // charge le script principal, les modules, les données et les cours
await p.waitForFunction(() => typeof rfAxes === "function" && typeof rfVerdictMots === "function" && typeof R !== "undefined" && R && R.companies && typeof MEDPE === "object", null, { timeout: 60000 });
const res = await p.evaluate(() => {
  const out = [], band = p => p >= 0.75 ? 0 : p >= 0.55 ? 1 : p > 0.45 ? 2 : p > 0.25 ? 3 : 4;
  let n = 0;
  for (const s of R.companies) {
    if (s.missing) continue; n++;
    const pb = [], A = Object.fromEntries(rfAxes(s).map(a => [a.k, a])), v = valo(s), verdict = rfVerdictMots(s).toLowerCase();
    // 1. verdict ↔ jauges
    const bm = A.marge && A.marge.r ? band(A.marge.r.p) : null;
    if (/très rentable|(^|, )rentable/.test(verdict) && !/peu rentable/.test(verdict) && bm != null && bm >= 2 && !(s.net < 0)) pb.push(`verdict « rentable » mais jauge Marge « ${A.marge.word} »`);
    if (/peu rentable/.test(verdict) && bm != null && bm <= 1) pb.push(`verdict « peu rentable » mais jauge Marge « ${A.marge.word} »`);
    const bs = A.solidite && A.solidite.r ? band(A.solidite.r.p) : null, sd = A.solidite && A.solidite.special === "sansdette";
    if (/peu endettée/.test(verdict) && bs != null && bs >= 2 && !sd) pb.push(`verdict « peu endettée » mais jauge Solidité « ${A.solidite.word} »`);
    if (/(^|, )endettée/.test(verdict) && !/peu endettée/.test(verdict) && bs != null && bs <= 1) pb.push(`verdict « endettée » mais jauge Solidité « ${A.solidite.word} »`);
    if (sd && !/sans dette/.test(verdict)) pb.push("dette nette négative sans « sans dette » dans le verdict");
    const bp = A.prix && A.prix.r ? band(A.prix.r.p) : null;
    if (/bon marché/.test(verdict) && bp != null && bp >= 2) pb.push(`verdict « bon marché » mais jauge Prix « ${A.prix.word} »`);
    if (/chère/.test(verdict) && !/moins chère/.test(verdict) && bp != null && bp <= 1) pb.push(`verdict « chère » mais jauge Prix « ${A.prix.word} »`);
    // 2. jauge Dividende ↔ rendement
    if (A.dividende) {
      const y = v && v.yld != null ? v.yld : null;
      if (A.dividende.r && !(y > 0)) pb.push("jauge Dividende avec un rendement nul ou inconnu");
      if (A.dividende.special === "nodiv" && y > 0.001) pb.push(`« pas de dividende » mais rendement ${(y * 100).toFixed(1)} %`);
      if (A.dividende.r && y != null) { const md = MED[s.sector]; if (md && md.n >= 5 && A.dividende.r.p >= 0.55 && y < 0.001) pb.push("jauge Dividende à droite avec un rendement de 0 %"); }
    }
    // 3. jauge ↔ phrase de la section (même position attendue)
    const m = ratios(s);
    for (const [key, k, inv, val] of [["g1", "croissance", false, m.g1], ["marge", "marge", false, m.marge], ["lev", "solidite", true, m.lev], ["pe", "prix", true, v && v.pe]]) {
      const a = A[k]; if (!a || !a.r || typeof rfPosition !== "function") continue;
      const pos = rfPosition(s, key, inv, val); if (!pos) continue;
      if (Math.abs(pos.pos - a.r.p) > 0.02) pb.push(`section ${key} : « placée » à ${Math.round(pos.pos * 100)} % contre jauge ${Math.round(a.r.p * 100)} %`);
    }
    // 4. fourchette sur 1 an absurde affichée
    const px = pxOf(s); if (px && px.l52 > 0 && px.h52 / px.l52 > 3 && typeof ficheCours === "function" && /fh-rg/.test(ficheCours(s) || "")) pb.push(`fourchette sur 1 an affichée avec un rapport ${(px.h52 / px.l52).toFixed(1)}`);
    if (pb.length) out.push({ id: s.id, nom: s.name, verdict: rfVerdictMots(s), problemes: pb });
  }
  return { n, out };
});
await b.close();
const rapport = { date: new Date().toISOString().slice(0, 10), fiches: res.n, en_defaut: res.out.length, exemples: res.out.slice(0, 20) };
writeFileSync("data/contradictions.json", JSON.stringify(rapport, null, 1) + "\n");
console.log(`${res.n} fiches avec comptes, ${res.out.length} en défaut.`);
res.out.slice(0, 20).forEach(x => console.log(`- ${x.id} (« ${x.verdict} ») : ${x.problemes.join(" ; ")}`));
process.exit(res.out.length ? 1 : 0);
