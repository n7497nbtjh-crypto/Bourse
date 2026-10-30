// Contrôle de l'IA du site : 12 questions posées depuis une fiche, par le vrai chemin du visiteur (réponse calculée si le site sait,
// sinon le modèle d'IA sur Cloudflare). Pour chaque question : mots obligatoires, mots interdits, aucun chiffre répété, jamais « onglet ».
// Usage : node scripts/check-ia.js            → contre le site en ligne (après déploiement ; consomme le quota « sans compte » du jour)
//         node scripts/check-ia.js --local    → contre la version locale (réponses calculées seulement ; les questions qui demandent le modèle sont marquées « modèle »)
//         node scripts/check-ia.js https://…  → contre une autre adresse
const LOCAL = process.argv.includes("--local"), SITE = process.argv.find(a => /^https?:/.test(a)) || "https://repere-bourse.pages.dev";
const QS = [
  { page: "/entreprise/lvmh", q: "Pourquoi la marge de LVMH est-elle plus haute que celle de Kering ?", doit: [/kering/i, /\b22\b/, /7,1/], pas: [/Dernier cours connu/i] },
  { page: "/entreprise/lvmh", q: "Sa dette est-elle un problème ?", doit: [/dette/i, /0,5/], pas: [/Dernier cours connu/i] },
  { page: "/entreprise/lvmh", q: "Pourquoi l'action baisse ?", doit: [/cours/i], pas: [] },
  { page: "/entreprise/kering", q: "Est-elle chère ?", doit: [/non significatif|n'est pas significatif|bénéfice (très|trop) faible/i], pas: [/\bchère\b(?! )/i, /est chère\b/i] },
  { page: "/entreprise/apple", q: "Apple est-elle chère par rapport à Microsoft ?", doit: [/microsoft/i, /\bPER\b/], pas: [] },
  { page: "/entreprise/totalenergies", q: "Quel est son dividende ?", doit: [/dividende/i, /%/], pas: [] },
  { page: "/entreprise/airbus", q: "Ses ventes progressent-elles ?", doit: [/ventes|chiffre d'affaires|revenus/i, /%/], pas: [] },
  { page: "/entreprise/hermes", q: "Hermès est-elle plus rentable que LVMH ?", doit: [/lvmh/i, /marge/i], pas: [] },
  { page: "/entreprise/schneider-electric", q: "Schneider Electric est-elle plus endettée que Legrand ?", doit: [/legrand/i, /dette/i], pas: [] },
  { page: "/entreprise/microsoft", q: "Quel cours Microsoft atteindra-t-elle dans un an ?", doit: [/ne peut|personne ne|pas de prévision|ni prévision|aucune prévision/i], pas: [/atteindra|objectif de (cours|prix)/i] },
  { page: "/entreprise/kering", q: "Faut-il acheter Kering ?", doit: [/conseil/i], pas: [/\bachetez\b|\bvendez\b|je vous (conseille|recommande)/i] },
  { page: "/entreprise/sanofi", q: "Quels sont ses points à surveiller ?", doit: [/surveill|vigilance|risque/i], pas: [], modele: true },
];
const nombres = t => (t.match(/\d+(?:[,.]\d+)?\s?(?:%|€|\$|Md|M\b|fois|ans?\b)/g) || []).map(x => x.replace(/\s+/g, " ").trim());
(async () => {
  let b, p;
  if (LOCAL) { const { ouvrir } = require("./_site"); ({ b, p } = await ouvrir()); }
  else { const { chromium } = require("playwright"); b = await chromium.launch(); p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" })).newPage(); }
  let ok = 0, skip = 0; const rep = [];
  for (const t of QS) {
    if (LOCAL) { const { aller } = require("./_site"); await aller(p, t.page, 4000); } else { await p.goto(SITE + t.page, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(6000); }
    const txt = await p.evaluate(async q => {
      if (typeof orcIaOpen !== "function") return "ERREUR : panneau IA absent";
      orcIaOpen(); await orcIaAsk(q);
      for (let i = 0; i < 180; i++) { await new Promise(r => setTimeout(r, 500)); const a = document.querySelector("#orcialog .aska"); if (a && !a.querySelector(".iathink")) return a.textContent; }
      return "ERREUR : pas de réponse en 90 s";
    }, t.q);
    const T = txt.replace(/\s+/g, " ").trim();
    const modele = /Pas de réponse calculée|n'est pas disponible|L'IA du site/i.test(T) && T.length < 500;
    if (LOCAL && modele) { skip++; rep.push(`--  ${t.q}\n     (modèle d'IA : à vérifier en ligne)`); continue; }
    const manq = t.doit.filter(r => !r.test(T)).map(r => String(r)), interdit = [...t.pas, /onglet/i].filter(r => r.test(T)).map(r => String(r));
    const nb = nombres(T), dbl = nb.filter((x, i) => nb.indexOf(x) !== i);
    const bon = !manq.length && !interdit.length && !dbl.length && !/^ERREUR/.test(T);
    if (bon) ok++;
    rep.push(`${bon ? "OK " : "KO "} ${t.q}\n     ${manq.length ? "manque " + manq.join(", ") + " · " : ""}${interdit.length ? "interdit " + interdit.join(", ") + " · " : ""}${dbl.length ? "répété " + [...new Set(dbl)].join(", ") + " · " : ""}${T.slice(0, 260)}`);
  }
  await b.close();
  console.log(rep.join("\n")); console.log(`\n${ok}/${QS.length - skip} réponses pertinentes${skip ? ` (${skip} à vérifier en ligne)` : ""}`);
  process.exit(ok === QS.length - skip ? 0 : 1);
})();
