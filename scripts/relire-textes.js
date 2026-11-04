// Relecture des textes du site (4/11/2026) : ouvre les grandes pages (ordinateur), relève le texte visible et écrit
// /tmp/relecture-textes.json ; tests/relire_textes.py en tire les fautes : tiret cadratin, tutoiement, ponctuation,
// mots répétés, « NaN » ou « undefined », mots inconnus du dictionnaire français.
// Usage : node scripts/relire-textes.js [pages…] && python3 tests/relire_textes.py
const { ouvrir, aller } = require("./_site"), fs = require("fs");
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/entreprises", "/entreprise/lvmh", "/entreprise/bnp-paribas", "/entreprise/apple", "/entreprise/totalenergies",
  "/comparer?ids=lvmh,hermes,kering", "/comparer", "/etf", "/etf/amundi-msci-world-pea", "/etf/ishares-core-msci-world", "/marches", "/actualites", "/agenda", "/classements", "/dividendes",
  "/outils", "/outils/si-javais", "/outils/recouvrement", "/outils/verifier", "/simulateurs/epargne", "/simulateurs/frais", "/repartitions", "/idees-recues", "/decouvertes",
  "/apprendre", "/lexique", "/pea-cto", "/livret-a-ou-bourse", "/pourquoi-bilan", "/portefeuille", "/espace", "/premium", "/methode", "/plan", "/demander", "/communaute",
  "/favoris", "/hier", "/connecteur", "/ia/connecter", "/rapport-exemple", "/question/plus-gros-dividendes-france", "/question/entreprises-francaises-meilleure-marge",
  "/mentions-legales", "/cgv", "/confidentialite", "/avertissement", "/academie/placements/etf"];
(async () => { const { b, p } = await ouvrir(); const out = {};
  for (const u of PAGES) { try { await aller(p, u, 1600); out[u] = await p.evaluate(() => { document.querySelectorAll("details").forEach(d => d.open = true); return document.querySelector("#app").innerText; }); } catch (e) { out[u] = "ERREUR " + e.message; } }
  fs.writeFileSync("/tmp/relecture-textes.json", JSON.stringify(out)); console.log(Object.keys(out).length, "pages relevées"); await b.close(); })();
