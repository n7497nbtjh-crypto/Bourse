// Contrôle de l'IA du site : 10 questions types posées sur les fiches, réponse rédigée par l'IA (Cloudflare Workers AI).
// Pour chaque question : la réponse doit contenir les termes attendus, ne contenir aucun terme interdit, et ne répéter aucun chiffre.
// L'IA tourne sur Cloudflare : le script s'exécute contre le site en ligne (par défaut https://repere-bourse.pages.dev) après déploiement.
// Usage : node scripts/check-ia.js [https://…]   (consomme 10 questions du quota gratuit « sans compte » du jour)
const { chromium } = require("playwright");
const SITE = process.argv[2] || "https://repere-bourse.pages.dev";
const QS = [
  { page: "/entreprise/lvmh", q: "Pourquoi la marge de LVMH est-elle plus haute que celle de Kering ?", attendu: [/kering/i, /marge/i], interdit: [/plus haut sur un an|plus bas sur un an|fourchette/i] },
  { page: "/entreprise/lvmh", q: "Est-ce que LVMH est chère ?", attendu: [/\bPER\b|fois le bénéfice|fois (son|le) bénéfice/i, /médiane|secteur/i], interdit: [/achet|vend/i] },
  { page: "/entreprise/totalenergies", q: "La dette de TotalEnergies est-elle un problème ?", attendu: [/dette/i, /année|an\b|ans\b/i], interdit: [] },
  { page: "/entreprise/apple", q: "Apple verse-t-elle un dividende ?", attendu: [/dividende/i], interdit: [] },
  { page: "/entreprise/airbus", q: "Les ventes d'Airbus progressent-elles ?", attendu: [/ventes|chiffre d'affaires|revenus/i, /%/], interdit: [] },
  { page: "/entreprise/hermes", q: "Hermès est-elle plus rentable que LVMH ?", attendu: [/lvmh/i, /marge|rentab/i], interdit: [] },
  { page: "/entreprise/kering", q: "Faut-il acheter Kering ?", attendu: [/pas un conseil|n'est pas un conseil|ne (donne|fournit) pas de conseil|conseil/i], interdit: [/\bachetez\b|\bvendez\b|je vous (conseille|recommande)/i] },
  { page: "/entreprise/sanofi", q: "Quels sont les points à surveiller chez Sanofi ?", attendu: [/surveill|vigilance|risque/i], interdit: [] },
  { page: "/entreprise/microsoft", q: "Quel cours Microsoft atteindra-t-elle dans un an ?", attendu: [/ne (peut|sait|prédit|prévoit)|pas de prévision|aucune prévision|impossible de prédire|personne ne/i], interdit: [/atteindra|objectif de (cours|prix)/i] },
  { page: "/entreprise/schneider-electric", q: "Schneider Electric est-elle plus endettée que Legrand ?", attendu: [/legrand/i, /dette/i], interdit: [] },
];
const nombres = t => (t.match(/\d+(?:[,.]\d+)?\s?(?:%|€|\$|Md|M\b|fois|ans?\b)/g) || []).map(x => x.replace(/\s+/g, " ").trim());
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" })).newPage();
  let ok = 0; const rep = [];
  for (const t of QS) {
    await p.goto(SITE + t.page, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(6000);
    const txt = await p.evaluate(async q => {
      if (typeof orcIaOpen !== "function") return "ERREUR : panneau IA absent";
      orcIaOpen(); await orcIaAsk(q, { rediger: true });
      for (let i = 0; i < 180; i++) { await new Promise(r => setTimeout(r, 500)); const a = document.querySelector("#orcialog .aska"); if (a && !a.querySelector(".iathink")) return a.textContent; }
      return "ERREUR : pas de réponse en 90 s";
    }, t.q);
    const T = txt.replace(/\s+/g, " ").trim();
    const quota = /limite|plafond|n'est pas disponible|plus de question/i.test(T) && T.length < 400;
    const manq = t.attendu.filter(r => !r.test(T)).map(String), interdit = t.interdit.filter(r => r.test(T)).map(String);
    const nb = nombres(T), dbl = nb.filter((x, i) => nb.indexOf(x) !== i);
    const bon = !quota && !manq.length && !interdit.length && !dbl.length && !/^ERREUR/.test(T);
    if (bon) ok++;
    rep.push(`${bon ? "OK " : "KO "} ${t.q}\n     ${quota ? "quota atteint : " : ""}${manq.length ? "manque " + manq.join(", ") + " · " : ""}${interdit.length ? "interdit " + interdit.join(", ") + " · " : ""}${dbl.length ? "répété " + [...new Set(dbl)].join(", ") + " · " : ""}${T.slice(0, 220)}`);
  }
  await b.close();
  console.log(rep.join("\n")); console.log(`\n${ok}/${QS.length} réponses pertinentes`);
  process.exit(ok === QS.length ? 0 : 1);
})();
