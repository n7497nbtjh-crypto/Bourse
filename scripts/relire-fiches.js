// Relecture des textes générés sur les fiches entreprise (fiche v4, m/fiche4.js). Créé le 2/11/2026 après des fautes vues par Romain
// (« Ses ventes est moins bon… ») : les phrases sont calculées pour plus de 2 000 sociétés, il faut donc les relire en masse, pas une à une.
// 1. ouvre N fiches (une liste fixe de cas difficiles + des fiches au hasard) ;
// 2. relève chaque texte affiché (verdict, repères, titres, « Ce qui l'explique », « À surveiller », transitions, notes, indices) ;
// 3. signale les fautes connues (accords, ponctuation, mot répété, NaN, comparaison aux rivales sans rivales à l'écran…) ;
// 4. écrit tous les modèles de phrases (chiffres et noms remplacés) dans /tmp/relecture-fiches.txt, à RELIRE avant chaque mise en ligne.
// Usage : node scripts/relire-fiches.js [n] ; code de sortie 1 s'il reste une faute repérée.
const { ouvrir, aller, ROOT } = require("./_site"), fs = require("fs"), path = require("path");
const FIXES = ["hermes", "lvmh", "kering", "moncler", "bnp-paribas", "societe-generale", "axa", "apple", "nvidia", "totalenergies", "klepierre", "unibail-rodamco-westfield", "atalaya-mining", "alibaba", "siemens", "intel", "air-liquide", "asml"];
const REGLES = [
  [/\b(Ses ventes|Ses comptes|Ses marges)\s+est\b/, "accord : pluriel + « est »"],
  [/\b(Sa marge|Sa rentabilité|Son bénéfice)\s+sont\b/, "accord : singulier + « sont »"],
  [/\bbone\b|\bbones\b/, "orthographe : « bonne »"],
  [/\b(Sa marge|Sa rentabilité)\s+est\s+(meilleur|moins bon)\b(?!ne|e)/, "accord : féminin"],
  [/\bSes ventes\s+sont\s+(meilleurs|moins bons)\b/, "accord : « ventes » est féminin"],
  [/ [,.](?!\d)/, "espace avant une virgule ou un point"],
  [/\.\.(?!\.)|,,/, "ponctuation doublée"],
  [/\(\s*\)|\[\s*\]/, "parenthèses vides"],
  [/undefined|NaN|Infinity|\bnull\b|\[object/, "valeur technique affichée"],
  [/\b([a-zàâçéèêëîïôûùüÿœ]{3,}) \1\b/i, "mot répété"],
  [/(?<![A-Za-z])[+−-]\s*[−-]\d|(?<![A-Za-z])\+\+/, "double signe"],
  [/—/, "tiret cadratin (interdit sur le site)"],
  [/\b(étape|étapes) \d/, "renvoi à une autre étape (refusé par Romain)"],
  [/\b(tu|ton|ta|tes)\b/i, "tutoiement (le site vouvoie)"],
  [/\b(progressé|reculé) de 0 %/, "variation nulle dite comme une hausse ou une baisse"],
  [/\breculé de (1\d\d|[2-9]\d\d) %/, "recul de plus de 100 % (perte à dire autrement)"],
  [/il lui reste −/, "montant négatif présenté comme un reste"],
  [/années de [^.]* suffirait\b|une année de [^.]* suffiraient\b/, "accord : suffire"],
];
(async () => {
  const n = +process.argv[2] || 60, dir = path.join(ROOT, "data", "societes");
  const tous = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).filter(id => !FIXES.includes(id));
  for (let i = tous.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tous[i], tous[j]] = [tous[j], tous[i]]; }
  const ids = [...FIXES, ...tous.slice(0, Math.max(0, n - FIXES.length))];
  const { b, p } = await ouvrir(), fautes = [], modeles = new Map(); let vues = 0;
  for (const id of ids) {
    try { await aller(p, "/entreprise/" + id, 1800); } catch (e) { continue; }
    const r = await p.evaluate(() => {
      const page = document.querySelector(".ek-page"); if (!page || !document.querySelector(".ek-fil")) return null;
      const nom = (document.querySelector(".ek-hero h1") || {}).textContent || "", med = (document.querySelector(".ek-medl") || {}).textContent || "";
      const rivales = ((med.match(/\(([^)]+)\)/) || [])[1] || "").split(",").map(x => x.trim()).filter(Boolean);
      const T = [], add = (zone, el) => { if (!el) return; const t = (el.innerText || el.textContent || "").replace(/(\S)\s*\?(\s*:)/g, "$1$2").replace(/\s+/g, " ").trim(); if (t) T.push([zone, t]); };
      document.querySelectorAll(".ek-vrd h2").forEach(e => add("verdict", e));
      document.querySelectorAll(".ek-rp").forEach(e => { add("repère : titre", e.querySelector(".ek-st")); add("repère : texte", e.querySelector(".ek-s")); add("repère : rivales", e.querySelector(".ek-ml")); });
      document.querySelectorAll(".ek-medl > span").forEach(e => add("repères : légende", e));
      document.querySelectorAll(".ek-sec > h2").forEach(e => add("titre de section", e));
      document.querySelectorAll(".ek-step").forEach(st => {
        const k = st.id, sur = (st.querySelector(".ek-q") || {}).textContent || "", vis = st.querySelector(".ek-box");
        const aRivales = !!(vis && vis.querySelector(".ek-cmpl, .ek-cbar em, svg rect[fill='#E2F8EE'], svg rect[fill='#FFE9E3'], svg rect[fill='#F1F1EE']"));
        const h0 = st.querySelector(".ek-h"), h = h0 && h0.cloneNode(true); if (h) h.querySelectorAll(".ek-hc i").forEach(i => i.remove()); if (h) { add(`${sur} : titre`, h); if (/rivales|secteur/.test(h.textContent) && !aRivales) T.push(["!!", `${k} : titre comparé aux rivales sans rivales à l'écran : ${h.textContent}`]); if (!/[.?!]$/.test(h.textContent.trim())) T.push(["!!", `${k} : titre sans ponctuation finale : ${h.textContent}`]); }
        st.querySelectorAll(".ek-cmp").forEach(e => { add(`${sur} : pastille`, e); if (/rivales|secteur/.test(e.textContent) && !aRivales) T.push(["!!", `${k} : pastille comparée aux rivales sans rivales à l'écran : ${e.textContent}`]); });
        st.querySelectorAll(".ek-bt").forEach(e => add(`${sur} : titre du graphique`, e));
        st.querySelectorAll(".ek-cz strong").forEach(e => add(`${sur} : cause (titre)`, e));
        st.querySelectorAll(".ek-cz p").forEach(e => add(`${sur} : cause (texte)`, e));
        st.querySelectorAll(".ek-watch").forEach(e => add(`${sur} : à surveiller`, e));
        st.querySelectorAll(".ek-trans").forEach(e => add(`${sur} : transition`, e));
        st.querySelectorAll(".ek-out, .ek-cmpl").forEach(e => add(`${sur} : note du graphique`, e));
        st.querySelectorAll(".ek-hint p").forEach(e => add(`${sur} : indice`, e));
      });
      return { nom, rivales, T };
    });
    if (!r) continue; vues++;
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const [zone, t] of r.T) {
      if (zone === "!!") { fautes.push(`${id} : ${t}`); continue; }
      for (const [re, quoi] of REGLES) if (re.test(t)) fautes.push(`${id} · ${zone} · ${quoi} : « ${t} »`);
      let m = t; [r.nom, ...r.rivales].filter(x => x && x.length > 1).sort((a, b) => b.length - a.length).forEach((x, i) => { m = m.replace(new RegExp(esc(x), "g"), i === 0 && x === r.nom ? "‹NOM›" : "‹RIVALE›"); });
      m = m.replace(/‹NOM›/g, "‹NOM›").replace(/[+−-]?\d[\d\s ]*(,\d+)?/g, "#");
      const k = zone + " | " + m; const v = modeles.get(k) || { n: 0, ex: t, ids: new Set() }; v.n++; v.ids.add(id); modeles.set(k, v);
    }
  }
  await b.close();
  const L = [...modeles.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr")).map(([k, v]) => `${String(v.n).padStart(4)} × ${k}\n        ex. (${[...v.ids][0]}) « ${v.ex} »`);
  fs.writeFileSync("/tmp/relecture-fiches.txt", `${vues} fiches relevées, ${modeles.size} modèles de phrases, ${fautes.length} faute(s) repérée(s)\n\n== FAUTES ==\n${fautes.join("\n") || "aucune"}\n\n== MODÈLES (à relire) ==\n${L.join("\n")}\n`);
  console.log(`${vues} fiches relevées, ${modeles.size} modèles de phrases, ${fautes.length} faute(s) repérée(s). Rapport : /tmp/relecture-fiches.txt`);
  if (fautes.length) console.log(fautes.slice(0, 30).join("\n"));
  process.exit(fautes.length ? 1 : 0);
})();
