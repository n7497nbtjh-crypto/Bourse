/* =====================================================================================================
   Provenance des chiffres (module « provenance », 29 octobre 2026)
   1. Un registre unique des indicateurs (PROV_IND) : nom, formule en clair, unité, nature (publié / calculé / estimé /
      donnée de marché), source, période, limites. Toutes les fiches, les tableaux et le comparateur s'en servent.
   2. Un petit bouton « i » (provBtn) ouvre une bulle accessible (survol, clavier, toucher) : source avec lien,
      date de référence, date de récupération, période, devise, formule, nature. Une donnée ancienne est signalée.
   3. Ratios ajoutés quand les données le permettent : ROCE (avant impôt), valeur d'entreprise ÷ EBITDA,
      rendement du flux de trésorerie disponible.
   4. Fraîcheur du cours (priceHead) et « Vérifier une offre » (outilVerifier) : trois issues distinctes.
   Rien n'est inventé : quand une date n'est pas conservée par la collecte, la bulle le dit.
   ===================================================================================================== */

/* ---------- 1. Registre des indicateurs ---------- */
const PROV_NAT = {
  publie: ["Publié", "Chiffre repris tel quel des comptes annuels publiés par l'entreprise."],
  calcule: ["Calculé par le site", "Calculé par le site à partir de chiffres publiés, avec la formule indiquée."],
  estime: ["Estimé par le site", "Reconstitué à partir de plusieurs lignes des comptes : il peut différer du chiffre annoncé par l'entreprise."],
  marche: ["Donnée de marché", "Cours de Bourse différé, fourni par Google Finance. Ce n'est pas un cours en temps réel."],
  emetteur: ["Publié par l'émetteur", "Chiffre relevé sur le site de la société de gestion qui crée le fonds."],
};
// src : comptes | cours | mixte (cours + comptes) | etf | etfcompo
const PROV_IND = {
  ca: { nom: "Chiffre d'affaires", formule: "Total des ventes de l'exercice, tel que publié (pour une banque : produit net bancaire).", unite: "devise", nature: "publie", src: "comptes", term: "ca" },
  g: { nom: "Croissance des ventes", formule: "(Chiffre d'affaires de l'exercice ÷ chiffre d'affaires de l'exercice précédent) − 1.", unite: "pct", nature: "calcule", src: "comptes", deux: true, term: "croissance",
    limite: "Un rachat d'entreprise, une cession ou les taux de change peuvent gonfler ou réduire la croissance sans changement de l'activité d'origine." },
  cagr: { nom: "Croissance moyenne des ventes", formule: "(Chiffre d'affaires du dernier exercice ÷ celui du premier exercice lu) puissance (1 ÷ nombre d'années) − 1 : la croissance annuelle moyenne.", unite: "pct", nature: "calcule", src: "comptes", plusieurs: true, term: "croissance",
    limite: "Calculée sur les exercices lus par le site (jusqu'à cinq) : une année exceptionnelle au début ou à la fin la déforme." },
  ng: { nom: "Évolution du bénéfice net", formule: "(Résultat net de l'exercice ÷ résultat net de l'exercice précédent) − 1.", unite: "pct", nature: "calcule", src: "comptes", deux: true, term: "net" },
  ebit: { nom: "Résultat d'exploitation", formule: "Résultat opérationnel publié (étiquette IFRS « résultat des activités opérationnelles » ; à défaut, le résultat opérationnel courant présenté par l'entreprise).", unite: "devise", nature: "publie", src: "comptes", term: "resexp",
    limite: "Les entreprises ne le présentent pas toutes de la même façon (éléments exceptionnels inclus ou non)." },
  marge: { nom: "Marge d'exploitation", formule: "Résultat d'exploitation ÷ chiffre d'affaires.", unite: "pct", nature: "calcule", src: "comptes", term: "marge", limite: "Ne s'applique pas aux banques et aux assureurs." },
  ebitda: { nom: "EBITDA", formule: "Résultat d'exploitation + dotations aux amortissements (ou, à défaut, l'EBITDA présenté par l'entreprise).", unite: "devise", nature: "estime", src: "comptes", term: "ebitda",
    limite: "Le site l'additionne lui-même : le chiffre peut différer de l'EBITDA « ajusté » mis en avant par l'entreprise." },
  net: { nom: "Résultat net", formule: "Résultat net part du groupe publié (à défaut, résultat net total).", unite: "devise", nature: "publie", src: "comptes", term: "net",
    limite: "Un élément exceptionnel (cession, dépréciation) peut le gonfler ou le réduire une année." },
  nm: { nom: "Marge nette", formule: "Résultat net ÷ chiffre d'affaires.", unite: "pct", nature: "calcule", src: "comptes", term: "margenette" },
  equity: { nom: "Capitaux propres", formule: "Capitaux propres part du groupe à la clôture, tels que publiés.", unite: "devise", nature: "publie", src: "comptes", term: "capitaux" },
  cash: { nom: "Trésorerie", formule: "Trésorerie et équivalents de trésorerie à la clôture, tels que publiés.", unite: "devise", nature: "publie", src: "comptes", term: "tresorerie" },
  debt: { nom: "Dette financière", formule: "Emprunts publiés : total s'il est publié, sinon part à long terme + part à court terme.", unite: "devise", nature: "calcule", src: "comptes", term: "dette",
    limite: "Les dettes de loyers (IFRS 16) ne sont en général pas comprises." },
  netDebt: { nom: "Dette nette", formule: "Dette financière − trésorerie. Négative : plus de trésorerie que de dettes.", unite: "devise", nature: "estime", src: "comptes", term: "dettenette",
    limite: "Reconstituée par le site : l'entreprise peut publier une dette nette différente (placements, dettes de loyers, dérivés)." },
  lev: { nom: "Dette nette ÷ EBITDA", formule: "Dette nette ÷ EBITDA : le nombre d'années de résultat d'exploitation avant amortissements pour rembourser la dette nette.", unite: "ans", nature: "calcule", src: "comptes", term: "lev",
    limite: "Repose sur deux chiffres estimés par le site (dette nette et EBITDA). Ne s'applique pas aux banques." },
  gear: { nom: "Dette nette ÷ capitaux propres", formule: "Dette nette ÷ capitaux propres.", unite: "pct", nature: "calcule", src: "comptes", term: "gear" },
  roe: { nom: "Rentabilité des capitaux propres (ROE)", formule: "Résultat net ÷ capitaux propres à la clôture du même exercice.", unite: "pct", nature: "calcule", src: "comptes", term: "roe",
    limite: "Des capitaux propres faibles (rachats d'actions, pertes passées) la gonflent." },
  roce: { nom: "Rentabilité des capitaux employés (ROCE, avant impôt)", formule: "Résultat d'exploitation ÷ (capitaux propres + dette nette), à la clôture du même exercice.", unite: "pct", nature: "calcule", src: "comptes", term: "roce",
    limite: "Calculé avant impôt : la charge d'impôt n'est pas collectée par le site, le vrai ROIC (après impôt) ne peut donc pas être calculé. Non calculé pour les banques et quand les capitaux propres sont négatifs." },
  cfo: { nom: "Flux de trésorerie d'exploitation", formule: "Trésorerie générée par l'activité, telle que publiée dans le tableau des flux de trésorerie.", unite: "devise", nature: "publie", src: "comptes", term: "cfo" },
  capex: { nom: "Investissements", formule: "Flux de trésorerie d'exploitation − flux de trésorerie disponible (achats d'immobilisations corporelles et incorporelles).", unite: "devise", nature: "estime", src: "comptes", term: "invest" },
  fcf: { nom: "Flux de trésorerie disponible", formule: "Flux de trésorerie d'exploitation − achats d'immobilisations corporelles − achats d'immobilisations incorporelles.", unite: "devise", nature: "calcule", src: "comptes", term: "fcf",
    limite: "Avant paiement des loyers et des acquisitions d'entreprises : l'entreprise peut publier un chiffre différent." },
  conv: { nom: "Argent disponible ÷ résultat net", formule: "Flux de trésorerie disponible ÷ résultat net.", unite: "pct", nature: "calcule", src: "comptes", term: "conversion" },
  eps: { nom: "Bénéfice net par action (BNPA)", formule: "BNPA de base publié : résultat net ÷ nombre moyen d'actions.", unite: "parAction", nature: "publie", src: "comptes", term: "bnpa" },
  dps: { nom: "Dividende par action", formule: "Dividende par action publié dans les comptes. S'il n'est pas publié : dividendes versés ÷ nombre d'actions (résultat net ÷ BNPA), signalé « estimé ».", unite: "parAction", nature: "publie", src: "comptes", term: "dps" },
  divPaid: { nom: "Dividendes versés", formule: "Dividendes payés aux actionnaires pendant l'exercice, lus dans le tableau des flux de trésorerie.", unite: "devise", nature: "publie", src: "comptes", term: "divverses",
    limite: "Montant payé pendant l'exercice (souvent le dividende de l'année précédente). N'inclut pas les rachats d'actions." },
  payout: { nom: "Taux de distribution", formule: "Dividendes versés pendant l'exercice ÷ résultat net du même exercice.", unite: "pct", nature: "calcule", src: "comptes", term: "payout",
    limite: "Les dividendes payés pendant une année correspondent souvent au bénéfice de l'année précédente." },
  cours: { nom: "Cours de l'action", formule: "Dernier cours connu, différé.", unite: "cours", nature: "marche", src: "cours", term: "cours" },
  var1an: { nom: "Évolution du cours sur un an", formule: "(Cours actuel ÷ cours d'il y a un an) − 1, dividendes non compris.", unite: "pct", nature: "calcule", src: "cours", term: "cours" },
  range52: { nom: "Position sur un an", formule: "(Cours − plus bas sur 52 semaines) ÷ (plus haut − plus bas sur 52 semaines).", unite: "pct", nature: "calcule", src: "cours", term: "cours" },
  cap: { nom: "Valeur en Bourse (capitalisation)", formule: "Capitalisation fournie par Google Finance (cours × nombre d'actions), convertie en euros aux taux de la BCE.", unite: "eur", nature: "marche", src: "mixte", term: "cap",
    limite: "Quand elle paraît incohérente avec le bénéfice par action, le site la recalcule avec le cours et le nombre d'actions déduit des comptes." },
  per: { nom: "PER", formule: "Valeur en Bourse ÷ résultat net du dernier exercice publié (à défaut : cours ÷ BNPA).", unite: "fois", nature: "calcule", src: "mixte", term: "per",
    limite: "Calculé sur le dernier bénéfice annuel publié, pas sur des prévisions : il ne se calcule pas en cas de perte." },
  rendement: { nom: "Rendement du dividende", formule: "Dividendes versés pendant le dernier exercice ÷ valeur en Bourse actuelle (à défaut : dividende par action ÷ cours).", unite: "pct", nature: "calcule", src: "mixte", term: "rdt",
    limite: "Calculé sur le dernier dividende versé, pas sur le prochain : un dividende peut baisser ou être supprimé." },
  evebitda: { nom: "Valeur d'entreprise ÷ EBITDA", formule: "(Valeur en Bourse + dette nette) ÷ EBITDA du dernier exercice publié, tout converti en euros.", unite: "fois", nature: "estime", src: "mixte", term: "evebitda",
    limite: "Valeur d'entreprise simplifiée : sans les intérêts minoritaires, les dettes de loyers ni les engagements de retraite. Repose sur la dette nette et l'EBITDA estimés par le site. Non calculé pour les banques." },
  rdtfcf: { nom: "Rendement du flux de trésorerie disponible", formule: "Flux de trésorerie disponible du dernier exercice ÷ valeur en Bourse actuelle, convertis en euros.", unite: "pct", nature: "calcule", src: "mixte", term: "rdtfcf",
    limite: "Une seule année : une année d'investissements exceptionnels le fait baisser." },
  etf_ter: { nom: "Frais courants", formule: "Frais courants annuels (TER) indiqués par l'émetteur, prélevés chaque jour dans la valeur de la part.", unite: "pct", nature: "emetteur", src: "etf", term: "ter",
    limite: "Ne comprend ni les frais de courtage ni l'écart entre prix d'achat et de vente. Le chiffre qui fait foi est celui du document d'informations clés (DIC)." },
  etf_encours: { nom: "Encours du fonds", formule: "Montant placé dans le fonds, indiqué par l'émetteur, converti en euros.", unite: "eur", nature: "emetteur", src: "etf", limite: "Ordre de grandeur : l'encours change chaque jour." },
  etf_compo: { nom: "Composition", formule: "Lignes du portefeuille publiées par l'émetteur (ou composition de l'indice suivi), en % du fonds.", unite: "pct", nature: "emetteur", src: "etfcompo",
    limite: "Une composition est une photo à une date donnée : elle change à chaque rééquilibrage de l'indice." },
};
// Les autres noms du site pour les mêmes indicateurs (clés INDI, lexique, colonnes)
const PROV_ALIAS = { croissance: "g", g1: "g", taille: "ca", marge_nette: "nm", margenette: "nm", rentabilite: "roe", dette: "lev", dettenette: "netDebt", distribution: "payout",
  capitalisation: "cap", variation_1an: "var1an", rdt: "rendement", divverses: "divPaid", ev_ebitda: "evebitda", rendement_fcf: "rdtfcf", ter: "etf_ter", bnpa: "eps", resexp: "ebit", invest: "capex", conversion: "conv" };
const provKey = k => PROV_IND[k] ? k : PROV_ALIAS[k] && PROV_IND[PROV_ALIAS[k]] ? PROV_ALIAS[k] : null;

// Notions du lexique pour les ratios ajoutés
const PROV_TERMS = {
  roce: { name: "ROCE (rentabilité des capitaux employés)", what: "Ce que rapporte l'activité pour 100 € investis dans l'entreprise, qu'ils viennent des actionnaires ou des prêteurs.", calc: "Résultat d'exploitation ÷ (capitaux propres + dette nette). Ici avant impôt.",
    read: "Au-dessus de 15 % : l'entreprise tire beaucoup de son capital. Il se compare au sein d'un même secteur.", limit: "Le ROIC, sa version après impôt, n'est pas calculé : la charge d'impôt n'est pas collectée par le site." },
  evebitda: { name: "Valeur d'entreprise ÷ EBITDA", what: "Combien d'années de résultat d'exploitation avant amortissements coûterait le rachat de toute l'entreprise, dettes comprises.", calc: "(Valeur en Bourse + dette nette) ÷ EBITDA.",
    read: "Contrairement au PER, il tient compte de la dette. Il se compare au sein d'un même secteur.", limit: "Ne s'applique pas aux banques. Version simplifiée : sans intérêts minoritaires ni dettes de loyers." },
  rdtfcf: { name: "Rendement du flux de trésorerie disponible", what: "L'argent disponible produit en un an, rapporté au prix de l'entreprise en Bourse.", calc: "Flux de trésorerie disponible ÷ valeur en Bourse.",
    read: "Un rendement élevé signifie que l'entreprise produit beaucoup d'argent par rapport à son prix. Négatif : elle a dépensé plus qu'elle n'a encaissé.", limit: "Une seule année peut tromper (gros investissements, acquisitions)." },
};
try { Object.entries(PROV_TERMS).forEach(([k, t]) => { if (!TERMS[k]) TERMS[k] = t; if (!ALL[k]) ALL[k] = t; }); } catch (e) { }

/* ---------- 2. Ratios ajoutés (calculs purs, testés par tests/t_provenance.mjs) ---------- */
function provRoce(s) { // s : chiffres d'un exercice (ebit, equity, netDebt)
  if (!s || isBank(s) || !okn(s.ebit) || !okn(s.equity) || !okn(s.netDebt) || s.equity <= 0) return null;
  const ce = s.equity + s.netDebt; return ce > 0 ? s.ebit / ce : null;
}
function provEvEbitda(s) {
  if (!s || isBank(s) || !okn(s.netDebt) || !(s.ebitda > 0)) return null;
  const v = valo(s); if (!v || !v.capE || v.vieux) return null;
  const nd = toEur(s.netDebt * 1e6, s.currency), eb = toEur(s.ebitda * 1e6, s.currency);
  if (!isFinite(nd) || !isFinite(eb) || eb <= 0) return null;
  const x = (v.capE + nd) / eb; return x > 0 && x < 200 ? x : null;
}
function provRdtFcf(s) {
  if (!s || isBank(s) || !okn(s.fcf)) return null;
  const v = valo(s); if (!v || !v.capE || v.vieux) return null;
  const f = toEur(s.fcf * 1e6, s.currency); if (!isFinite(f)) return null;
  const x = f / v.capE; return Math.abs(x) < 0.5 ? x : null;
}
try {
  if (!INDI.roce) INDI.roce = ["Rentabilité des capitaux employés (ROCE)", c => { const x = provRoce(c); return x == null ? null : x * 100; }, x => pct(x / 100, 1, false), false];
  if (!INDI.ev_ebitda) INDI.ev_ebitda = ["Valeur d'entreprise ÷ EBITDA", c => provEvEbitda(c), x => F1.format(x) + " fois", true];
  if (!INDI.rendement_fcf) INDI.rendement_fcf = ["Rendement du flux de trésorerie disponible", c => { const x = provRdtFcf(c); return x == null ? null : x * 100; }, x => pct(x / 100, 1, false), false];
} catch (e) { }

/* ---------- 3. Dates et fraîcheur ---------- */
const PROV_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function provJoursOuvres(iso, today = TODAY) { // jours de semaine écoulés depuis une date (jours fériés non comptés à part)
  if (!iso) return null;
  const a = new Date(String(iso).slice(0, 10) + "T12:00:00Z"), b = new Date(String(today).slice(0, 10) + "T12:00:00Z");
  if (!(a < b)) return 0;
  let n = 0; for (const d = new Date(a); d < b;) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w && w < 6) n++; }
  return n;
}
function provMoisDepuis(iso, today = TODAY) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const a = new Date(iso.slice(0, 10) + "T12:00:00Z"), b = new Date(String(today).slice(0, 10) + "T12:00:00Z");
  return Math.floor((b - a) / (30.44 * 864e5));
}
// Date de clôture du dernier exercice lu : date complète (ESEF) ou année + jour de clôture (SEC)
function provClos(c, s) {
  const src = c && c.sources && c.sources[0];
  if (src && /^\d{4}-\d{2}-\d{2}$/.test(src.periodEnd || "")) return src.periodEnd;
  const y = (c && c.years && c.years.at(-1)) || (s && s.year);
  if (y && c && /^\d{2}-\d{2}$/.test(c.fyEnd || "")) return `${y}-${c.fyEnd}`;
  if (s && s.clos) return s.clos;
  return null;
}
function provComptesAge(c, s) { const d = provClos(c, s); const m = provMoisDepuis(d); return { clos: d, mois: m, vieux: m != null && m > 15 }; }
function provComptesVieux(c, s) { // bandeau pour la fiche : comptes de plus de 15 mois
  const a = provComptesAge(c, s); if (!a.vieux) return "";
  return `<p class="prov-old" role="note"><b>Comptes anciens.</b> Le dernier exercice lu par le site a été clos le ${dLabel(a.clos)}, il y a ${provDuree(a.mois)}. Les chiffres ci-dessous ne décrivent pas la situation actuelle : des comptes plus récents ont peut-être été publiés depuis, vérifiez auprès de l'entreprise.</p>`;
}
const provDuree = m => m < 24 ? `${m} mois` : `plus de ${Math.floor(m / 12)} ans`;
// Cours : date du relevé et fraîcheur. PXUP vaut une date (fichier quotidien du site) ou un horodatage (cours lus par le serveur).
// p.d : date du fichier de secours quand le titre manquait dans la feuille de cours (ajoutée par le serveur).
function provCours(p) {
  const up = PXUP && PXUP !== "none" ? String(PXUP) : null;
  const d = p && p.d ? String(p.d).slice(0, 10) : up ? up.slice(0, 10) : null;
  const live = !!(up && up.length > 10 && !(p && p.d));
  let heure = null; if (live) { const t = new Date(up); if (!isNaN(t)) heure = t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h "); }
  const jo = d ? provJoursOuvres(d) : null;
  return { d, live, heure, jo, vieux: jo != null && jo > 3 };
}
let PROV_FX = null; // date des taux de change de la BCE
function provFxDate() { if (PROV_FX === null) { PROV_FX = fetch("/data/fx.json").then(r => r.ok ? r.json() : null).then(j => (PROV_FX = j && j.updated || "")).catch(() => (PROV_FX = "")); } return PROV_FX; }

/* ---------- 4. Le bouton « i » et sa bulle ---------- */
function provBtn(k, ids, label) {
  const key = provKey(k); if (!key) return "";
  const I = PROV_IND[key];
  return `<button type="button" class="prov-i" data-prov="${key}" data-prov-ids="${esc(ids || "")}" aria-haspopup="dialog" aria-expanded="false" aria-controls="pop" aria-label="D'où vient ce chiffre ? ${esc(label || I.nom)}"><span aria-hidden="true">i</span></button>`;
}
const PROV_CURN = { EUR: "euros", USD: "dollars américains", GBP: "livres sterling", CHF: "francs suisses", SEK: "couronnes suédoises", DKK: "couronnes danoises", NOK: "couronnes norvégiennes", JPY: "yens", CAD: "dollars canadiens", AUD: "dollars australiens", HKD: "dollars de Hong Kong", CNY: "yuans", INR: "roupies indiennes", KRW: "wons", TWD: "dollars taïwanais", BRL: "réals", ZAR: "rands", SAR: "riyals saoudiens", PLN: "zlotys", ILS: "shekels", MXN: "pesos mexicains", SGD: "dollars de Singapour" };
const provCurName = cur => cur ? (PROV_CURN[cur] || cur) : "devise non indiquée";
function provUnite(I, cur) {
  switch (I.unite) {
    case "devise": return `Millions de ${provCurName(cur)}, devise des comptes publiés.`;
    case "parAction": return `${provCurName(cur)[0].toUpperCase() + provCurName(cur).slice(1)} par action, devise des comptes publiés.`;
    case "pct": return I.src === "comptes" ? `Pourcentage : rapport de deux montants publiés dans la même devise (${provCurName(cur)}).` : "Pourcentage.";
    case "ans": return "Nombre d'années (rapport de deux montants dans la même devise).";
    case "fois": return "Nombre de fois (sans unité). Valeur en Bourse en euros ; comptes convertis en euros aux taux de la BCE.";
    case "eur": return "Euros, après conversion aux taux de la BCE si besoin.";
    case "cours": return "Devise de la place de cotation.";
  }
  return "";
}
function provSrcComptes(c) { // { label, url } du document officiel
  if (!c || !c.sources || !c.sources.length) return null;
  const x = c.sources[0];
  if (c.cik) return { label: "Rapports annuels (10-K ou 20-F) déposés à la SEC américaine, lus dans ses données publiques EDGAR", url: x.report || `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=10-K` };
  if (x.source === "AMF") return { label: "Rapport financier annuel au format ESEF déposé auprès de l'AMF (diffusé par la DILA)", url: x.report };
  return { label: "Rapport financier annuel au format ESEF, publié sur filings.xbrl.org", url: x.report };
}
function provDetail(id) { // comptes complets d'une entreprise (sources, date de lecture), gardés dans FULL
  const s = RBY[id]; if (!s || s.missing) return Promise.resolve(null);
  if (FULL[id]) return Promise.resolve(FULL[id]);
  return fetch(`/data/societes/${id}.json`).then(r => r.ok ? r.json() : null).then(j => j ? (FULL[id] = j) : null).catch(() => null);
}
const provRow = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
const provLien = (txt, url) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener nofollow">${esc(txt)}</a>` : esc(txt);
function provNature(key, I, c) {
  let n = I.nature, note = "";
  if (c && c.fin) {
    const f = c.fin, L = (c.years || []).length - 1;
    if (key === "dps" && (f.dps == null || f.dps[L] == null) && f.dpsEst && f.dpsEst[L] != null) { n = "estime"; note = "Le dividende par action n'est pas publié sous l'étiquette standard pour ce dernier exercice : il est estimé (dividendes versés ÷ nombre d'actions)."; }
    if (key === "ebit" && f.ebitExt && f.ebitExt[L]) note = "Pour cette entreprise, le site lit le résultat opérationnel sous une étiquette propre à l'entreprise (par exemple le résultat opérationnel courant).";
  }
  return { n, note };
}
// Bloc « comptes » : exercice, date de clôture, document, date de lecture, ancienneté
function provBlocComptes(I, s, c) {
  const out = [], age = provComptesAge(c, s), y = c && c.years ? c.years.at(-1) : s.year;
  const per = I.deux ? `Exercice ${y} comparé à l'exercice ${y - 1}` : I.plusieurs && c && c.years && c.years.length > 1 ? `Exercices ${c.years[0]} à ${y}` : `Exercice annuel ${y}`;
  out.push(provRow("Période", `${per}${age.clos ? `, clos le ${dLabel(age.clos)}` : ""}.`));
  const src = provSrcComptes(c);
  out.push(provRow("Source", src ? provLien(src.label, src.url) + "." : c ? "Comptes annuels publiés." : "Comptes annuels publiés (détail non chargé)."));
  out.push(provRow("Récupéré le", c && c.updated ? `${dLabel(c.updated)} (lecture du document par le robot du site).` : "Date de récupération non conservée."));
  return { html: out.join(""), age };
}
function provBlocCours(p) {
  if (!p) return { html: provRow("Cours", PXUP && PXUP !== "none" ? "Cours non disponible pour ce titre." : "Cours en cours de chargement."), k: null };
  const k = provCours(p);
  const quand = k.live ? `relevé aujourd'hui${k.heure ? ` à ${k.heure}` : ""} (cours différé)` : k.d ? `relevé le ${dLabel(k.d)}` : "date du relevé inconnue";
  return { html: provRow("Cours", `Google Finance, ${esc(p.s || "")} : ${quand}. L'heure exacte de la dernière transaction n'est pas fournie par la source.`), k };
}
async function provHTML(key, ids) {
  const I = PROV_IND[key]; if (!I) return "";
  const nat = PROV_NAT[I.nature] || PROV_NAT.calcule, list = String(ids || "").split(",").filter(Boolean);
  let rows = "", warn = [], natN = I.nature, natNote = "";
  const coIds = list.filter(x => x.startsWith("c:")).map(x => x.slice(2)).filter(id => RBY[id]);
  const etfIds = list.filter(x => x.startsWith("e:")).map(x => x.slice(2)).filter(id => ETFBY[id]);
  if (I.src === "etf" || I.src === "etfcompo") {
    const e = ETFBY[etfIds[0]];
    if (e) {
      const F = typeof ETF_fichier === "function" ? await ETF_fichier(e) : null;
      if (I.src === "etf") {
        rows += provRow("Source", e.url ? provLien(`Fiche du fonds sur le site de l'émetteur (${e.src || e.issuer})`, e.url) + "." : `Documents de l'émetteur (${esc(e.issuer || "")}).`);
        rows += provRow("Récupéré le", e.releve ? `${dLabel(e.releve)} (collecte mensuelle du site).` : ETF.updated ? `Catalogue des émetteurs relu le ${dLabel(ETF.updated)} ; date propre à ce fonds non conservée.` : "Date de récupération non conservée.");
        rows += provRow("Date de référence", "Non indiquée par l'émetteur sur la page lue : valeur affichée par l'émetteur au jour du relevé.");
      } else {
        const C = e.compo && F && F.top ? F : (typeof etfComp === "function" ? await etfComp(e) : null);
        if (C) {
          const via = C.proxy ? `déclaration du fonds américain ${esc(C.proxy)} à la SEC (formulaire N-PORT), qui suit ${e.proxyIndex && e.proxyIndex !== e.index ? "un indice proche" : "le même indice"}`
            : C.source ? provLien(C.source.nom || "Émetteur", C.source.url) : "Émetteur";
          rows += provRow("Source", via + ".");
          rows += provRow("Niveau", C.proxy ? "Fonds de référence américain : l'ETF européen peut différer légèrement." : C.niveau === "fonds" ? "Lignes détenues par le fonds lui-même." : C.niveau === "indice" ? "Composition de l'indice suivi (le fonds peut différer légèrement, par exemple s'il est synthétique)." : C.niveau === "panier" ? "Panier de titres détenu par un fonds synthétique, différent de l'indice dont il verse la performance." : "Non précisé.");
          rows += provRow("Date de référence", C.asOf ? `Composition au ${dLabel(C.asOf)}.` : "Date de la composition non indiquée par la source.");
          const m = C.asOf ? provMoisDepuis(C.asOf) : null; if (m != null && m > 3) warn.push(`Composition ancienne : elle date de ${m} mois.`);
          rows += provRow("Récupéré le", F && F.releve ? `${dLabel(F.releve)}.` : "Date de récupération non conservée (collecte mensuelle du site).");
        } else rows += provRow("Source", "Composition non disponible pour ce fonds.");
      }
    }
  } else if (coIds.length > 1) { // tableau comparatif : une ligne par entreprise
    const det = await Promise.all(coIds.map(provDetail));
    if (I.src !== "cours") {
      rows += provRow("Comptes", `<ul class="prov-ul">${coIds.map((id, i) => { const s = RBY[id], c = det[i], a = provComptesAge(c, s), src = provSrcComptes(c);
        if (s.missing) return `<li><b>${esc(s.name)}</b> : comptes non disponibles.</li>`;
        if (a.vieux) warn.push(`${s.name} : comptes clos il y a ${provDuree(a.mois)}.`);
        return `<li><b>${esc(s.name)}</b> : exercice ${s.year}${a.clos ? `, clos le ${dLabel(a.clos)}` : ""}${src ? `, ${provLien(c.cik ? "SEC (EDGAR)" : "rapport ESEF", src.url)}` : ""}${c && c.updated ? `, lu le ${dLabel(c.updated)}` : ", date de lecture non conservée"}${s.currency ? `, en ${provCurName(s.currency)}` : ""}.</li>`; }).join("")}</ul>`);
      if (I.deux) rows += provRow("Période", "Dernier exercice publié de chaque entreprise, comparé au précédent.");
      if (new Set(coIds.map(id => RBY[id].year)).size > 1) warn.push("Les exercices comparés ne sont pas tous de la même année.");
    }
    if (I.src === "cours" || I.src === "mixte") { const b = provBlocCours(pxOf(RBY[coIds[0]])); rows += b.html.replace(/Google Finance, [^:]*:/, "Google Finance :"); if (coIds.some(id => { const p = pxOf(RBY[id]); return p && provCours(p).vieux; })) warn.push("Le cours d'au moins une entreprise n'a pas été mis à jour depuis plus de 3 jours ouvrés."); }
  } else if (coIds.length === 1) {
    const s = RBY[coIds[0]], c = await provDetail(coIds[0]);
    const nn = provNature(key, I, c); natN = nn.n; natNote = nn.note;
    if (I.src === "comptes" || I.src === "mixte") {
      if (s.missing) rows += provRow("Comptes", "Comptes non disponibles en données ouvertes pour cette entreprise.");
      else { const b = provBlocComptes(I, s, c); rows += b.html; if (b.age.vieux) warn.push(`Comptes anciens : le dernier exercice lu a été clos il y a ${provDuree(b.age.mois)}. Des comptes plus récents ont peut-être été publiés.`); }
    }
    if (I.src === "cours" || I.src === "mixte") { const b = provBlocCours(pxOf(s)); rows += b.html; if (b.k && b.k.vieux) warn.push(`Cours ancien : pas de nouveau relevé depuis ${b.k.jo} jours ouvrés. Il n'est pas présenté comme actuel.`); }
    if (I.src === "mixte" || I.unite === "eur") { const d = await provFxDate(); if (s.currency && s.currency !== "EUR" || (pxOf(s) || {}).cur !== "EUR") rows += provRow("Change", `Taux de référence de la BCE${d ? ` du ${dLabel(d)}` : ""}.`); }
    rows = provRow("Devise", esc(provUnite(I, s.currency || (pxOf(s) || {}).cur))) + rows;
  } else { // en-tête d'un tableau de nombreuses entreprises : la provenance générale, les dates détaillées sont sur chaque fiche
    rows += provRow("Source", I.src === "cours" ? "Google Finance, cours différés." : `Comptes annuels publiés : rapports ESEF (sociétés européennes, filings.xbrl.org et AMF) et rapports déposés à la SEC (EDGAR)${I.src === "mixte" ? ", avec les cours différés de Google Finance" : ""}.`);
    if (I.src !== "cours") rows += provRow("Période", `Dernier exercice annuel publié de chaque entreprise${I.deux ? ", comparé au précédent" : ""} : les exercices ne se terminent pas tous à la même date.`);
    if (I.src !== "cours") rows += provRow("Dates", `Fichier des comptes reconstruit le ${R && R.updated ? dLabel(R.updated) : "(date inconnue)"}. La date de clôture et la date de lecture de chaque rapport sont indiquées sur la fiche de l'entreprise (bouton « i »).`);
    if (I.src !== "comptes") { const k = provCours(null); rows += provRow("Cours", k.d ? `Relevés le ${dLabel(k.d)}${k.live && k.heure ? ` à ${k.heure}` : ""}${k.vieux ? `, sans nouveau relevé depuis ${k.jo} jours ouvrés` : ""}.` : "En cours de chargement."); }
    rows += provRow("Devise", I.unite === "devise" ? "Devise des comptes de chaque entreprise ; convertie en euros pour le tri et les comparaisons (taux de la BCE)." : esc(provUnite(I, "EUR")));
  }
  const nl = PROV_NAT[natN] || nat;
  return `<button class="x" type="button" aria-label="Fermer">×</button>
    <p class="prov-k">D'où vient ce chiffre ?</p><h4 id="prov-h">${esc(I.nom)}</h4>
    <p class="prov-nat prov-n-${natN}"><b>${esc(nl[0])}.</b> ${esc(nl[1])}</p>
    ${warn.map(w => `<p class="prov-old">${esc(w)}</p>`).join("")}
    <dl class="prov-dl">${provRow("Formule", esc(I.formule))}${rows}${natNote ? provRow("À noter", esc(natNote)) : ""}${I.limite ? provRow("Limite", esc(I.limite)) : ""}</dl>
    <p class="prov-ft"><a href="/methode">Notre méthode</a>${I.term && ALL[I.term] ? ` · <a href="/lexique#${I.term}">Définition</a>` : ""}</p>`;
}

/* Ouverture : bulle partagée #pop (la même que les définitions). Survol (souris), focus clavier, toucher. */
let PROV_OPEN = null, PROV_MODE = null, PROV_T = 0, PROV_SEQ = 0;
const provHover = () => { try { return matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { return false; } };
function provPlace(btn) {
  if (innerWidth > 760) {
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + scrollX - 10)) + "px";
    const h = pop.offsetHeight, dessus = r.bottom + 6 + h > innerHeight && r.top - 6 - h > 60; // pas de place en dessous : la bulle s'ouvre au-dessus
    pop.style.top = (dessus ? r.top + scrollY - 6 - h : r.bottom + scrollY + 6) + "px";
  } else { pop.style.left = ""; pop.style.top = ""; }
}
async function provOpen(btn, mode) {
  const key = btn.dataset.prov, seq = ++PROV_SEQ; if (!PROV_IND[key]) return;
  if (PROV_OPEN && PROV_OPEN !== btn) PROV_OPEN.setAttribute("aria-expanded", "false");
  if (typeof popFor !== "undefined" && popFor && popFor !== btn) closeDef();
  PROV_OPEN = btn; PROV_MODE = mode; btn.setAttribute("aria-expanded", "true");
  pop.classList.add("prov"); pop.setAttribute("aria-labelledby", "prov-h");
  pop.innerHTML = `<p class="prov-k">D'où vient ce chiffre ?</p><h4 id="prov-h">${esc(PROV_IND[key].nom)}</h4><p class="muted">Chargement…</p>`;
  pop.classList.add("open"); provPlace(btn);
  let html = ""; try { html = await provHTML(key, btn.dataset.provIds); } catch (e) { html = `<p>${esc(PROV_IND[key].formule)}</p>`; }
  if (seq !== PROV_SEQ || PROV_OPEN !== btn) return;
  pop.innerHTML = html; provPlace(btn);
  try { popFor = btn; } catch (e) { }
  if (mode === "clic") pop.focus({ preventScroll: true });
}
function provClose() {
  clearTimeout(PROV_T); if (!PROV_OPEN) return;
  PROV_OPEN.setAttribute("aria-expanded", "false"); PROV_OPEN = null; PROV_MODE = null; PROV_SEQ++;
  pop.classList.remove("open", "prov"); pop.removeAttribute("aria-labelledby");
  try { popFor = null; } catch (e) { }
}
let PROV_NOFOCUS = false; // retour du focus sur le bouton après fermeture : ne pas rouvrir la bulle
function provFocus(b) { PROV_NOFOCUS = true; try { b.focus({ preventScroll: true }); } finally { setTimeout(() => { PROV_NOFOCUS = false; }, 0); } }
// Clic (et toucher) : capturé avant les autres gestionnaires (tri des colonnes, ligne cliquable, lien de tuile)
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest(".prov-i");
  if (b) { e.preventDefault(); e.stopPropagation(); if (PROV_OPEN === b && PROV_MODE === "clic") { provClose(); provFocus(b); } else provOpen(b, "clic"); return; }
  if (PROV_OPEN && (e.target.closest("#pop .x") || !e.target.closest("#pop"))) { const was = PROV_OPEN; provClose(); if (e.target.closest("#pop .x")) { provFocus(was); e.stopPropagation(); } }
}, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && PROV_OPEN) { const b = PROV_OPEN; provClose(); provFocus(b); } });
document.addEventListener("mouseover", e => {
  if (!provHover()) return;
  const b = e.target.closest && e.target.closest(".prov-i");
  if (b) { clearTimeout(PROV_T); if (PROV_OPEN !== b) PROV_T = setTimeout(() => provOpen(b, "survol"), 160); return; }
  if (PROV_OPEN && e.target.closest && e.target.closest("#pop")) { clearTimeout(PROV_T); return; }
  if (PROV_MODE === "survol") { clearTimeout(PROV_T); PROV_T = setTimeout(() => { if (PROV_MODE === "survol") provClose(); }, 260); }
});
document.addEventListener("focusin", e => {
  const b = e.target.closest && e.target.closest(".prov-i");
  if (b && PROV_NOFOCUS) return;
  if (b && PROV_OPEN !== b) { let kb = true; try { kb = b.matches(":focus-visible"); } catch (x) { } if (kb) provOpen(b, "focus"); return; }
  if (PROV_MODE === "focus" && !(e.target.closest && e.target.closest("#pop"))) provClose();
});
addEventListener("scroll", () => { if (PROV_OPEN && PROV_MODE !== "clic" && innerWidth > 760) provClose(); }, { passive: true });

document.head.insertAdjacentHTML("beforeend", `<style id="prov-css">
.prov-i{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin:0 0 0 5px;padding:0;border:1px solid currentColor;border-radius:50%;background:transparent;color:var(--grey,#6B6B6B);font:italic 600 10.5px/1 Georgia,serif;cursor:pointer;vertical-align:1px;position:relative;opacity:.75;flex:none;text-transform:none;letter-spacing:0}
.prov-i::before{content:"";position:absolute;inset:-8px}
.prov-i:hover,.prov-i[aria-expanded=true]{opacity:1;color:var(--ink,#111);background:#F3F0E8}
.prov-i:focus-visible{outline:2px solid var(--link,#1F4FD1);outline-offset:2px;opacity:1}
.pop.prov{width:360px;z-index:1200}
.pop.prov .prov-k{margin:0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--grey)}
.pop.prov h4{margin:2px 0 6px}
.prov-nat{margin:0 0 8px!important;padding:6px 9px;border-radius:8px;background:#F3F0E8;font-size:12.5px;line-height:1.45}
.prov-nat.prov-n-publie,.prov-nat.prov-n-emetteur{background:#EAF5EF}.prov-nat.prov-n-estime{background:#FFF4E0}.prov-nat.prov-n-marche{background:#EEF2FB}
.prov-dl{display:grid;grid-template-columns:92px minmax(0,1fr);gap:5px 10px;margin:6px 0 0;font-size:12.5px;line-height:1.45}
.prov-dl dt{color:var(--grey);font-weight:600}.prov-dl dd{margin:0;overflow-wrap:anywhere}
.prov-ul{margin:0;padding-left:16px}.prov-ul li{margin:0 0 3px}
.prov-old{margin:6px 0 0;padding:7px 10px;border-radius:8px;background:#FFF1E6;border:1px solid #F3C9A6;color:#7A3B0E;font-size:12.5px;line-height:1.45}
.prov-ft{margin:10px 0 0!important;font-size:12.5px}
.panel > .prov-old{margin:12px 20px}
@media (max-width:560px){.panel > .prov-old{margin:10px 16px}}
.pxhead .d.prov-stale{color:#9A4A12;font-weight:600}
@media (max-width:760px){.pop.prov{max-height:72vh;overflow:auto}.prov-dl{grid-template-columns:84px minmax(0,1fr)}.prov-i{width:18px;height:18px;font-size:11.5px}}
</style>`);

/* ---------- 5. Valorisation : jamais un PER ou un rendement calculé avec des comptes périmés ----------
   Reprise de valo() d'index.html (capitalisation, PER, rendement). Seul ajout : quand le dernier exercice lu a plus de 15 mois,
   le PER et le rendement ne sont pas calculés (cours d'aujourd'hui ÷ bénéfice d'un exercice ancien = chiffre trompeur). */
function provComptesPerimes(s) {
  if (!s) return false;
  if (s.clos) { const m = provMoisDepuis(s.clos); if (m != null) return m > 15; }
  const d = s.id && FULL[s.id] ? provComptesAge(FULL[s.id], s) : null; if (d && d.mois != null) return d.vieux;
  return s.year != null && s.year <= +String(TODAY).slice(0, 4) - 2; // sans date de clôture : un exercice d'il y a deux ans ou plus est forcément ancien
}
function valo(c) {
  const p = pxOf(c); if (!p) return null;
  const vieux = provComptesPerimes(c);
  let capE = p.cap ? toEur(p.cap, p.cur) : null; const netE = c.net != null ? toEur(c.net * 1e6, c.currency) : null;
  let pe = capE && netE > 0 ? capE / netE : null, sain = true;
  if (pe == null && c.eps > 0 && p.cur === c.currency) pe = p.p / c.eps;
  // Garde-fou : devise des comptes mal lue ou capitalisation erronée dans la source des cours.
  const peE = c.eps > 0 && p.p > 0 ? p.p / c.eps : null;
  if (!vieux && peE != null && peE >= 3 && peE <= 150 && (pe == null || pe < 3 || pe > 150)) { pe = peE; sain = false; if (c.net > 0) capE = toEur(p.p * c.net * 1e6 / c.eps, p.cur); }
  let yld = null;
  if (sain && c.divPaid > 0.5 && capE) yld = toEur(c.divPaid * 1e6, c.currency) / capE;
  if ((yld == null || yld > 0.15) && c.dps > 0 && (p.cur === c.currency || !sain)) yld = c.dps / p.p;
  if (yld != null && (yld > 0.25 || yld < 0)) yld = null;
  if (pe != null && (pe > 500 || pe < 2)) pe = null;
  if (vieux) { pe = null; yld = null; }
  return { p, capE, pe, yld, vieux };
}

// Médianes du secteur : sans les entreprises dont les comptes ont plus de 15 mois (reprise de computeMedians et medInd d'index.html)
function computeMedians() {
  const by = {};
  R.companies.filter(c => !c.missing && !provComptesPerimes(c)).forEach(c => { const r = ratios(c); if (isBank(c)) { r.lev = r.gear = r.conv = r.marge = null; } (by[c.sector] = by[c.sector] || []).push(r); });
  MED = Object.fromEntries(Object.entries(by).map(([k, l]) => [k, { n: l.length, ...Object.fromEntries(MKEYS.map(m => [m, median(l.map(x => x[m]))])) }]));
}
function medInd(sector, k) { const key = sector + "|" + k; if (MEDI[key] === undefined) MEDI[key] = median(R.companies.filter(c => c.sector === sector && !c.missing && !provComptesPerimes(c)).map(INDI[k][1])); return MEDI[key]; }

/* ---------- 6. Cours : fraîcheur affichée honnêtement ---------- */
function priceHead(c, isEtf = false) {
  const p = isEtf ? pxEtf(c) : pxOf(c);
  if (!p) return `<div class="pxhead"><span class="d">${PXUP && PXUP !== "none" ? "Cours non disponible pour ce titre" : "Chargement du cours…"}</span></div>`;
  const k = provCours(p), ch = p.chg;
  const quand = k.vieux ? `Cours du ${dLabel(k.d)} : pas de nouveau relevé depuis ${k.jo} jours ouvrés` : k.live ? `Cours différé${k.heure ? ` · relevé à ${k.heure}` : ""}` : k.d ? `Dernier cours relevé le ${dLabel(k.d)}` : "Cours différé";
  const jour = k.vieux ? "lors de la dernière séance relevée" : k.live || k.d === TODAY ? "aujourd'hui" : "lors de la dernière séance";
  return `<div class="pxhead"><span class="kick">Cours${provBtn("cours", (isEtf ? "e:" : "c:") + c.id, "Cours de l'action")}</span><span class="p">${pxFmt(p.p, p.cur)}</span>${p.cur && p.cur !== "EUR" && isFinite(toEur(p.p, p.cur)) ? `<span class="pxeur">soit ${pxFmt(toEur(p.p, p.cur), "EUR")}</span>` : ""}${ch != null ? `<span class="${ch > 0 ? "up" : ch < 0 ? "down" : "muted"}" style="font-weight:600">${ch > 0 ? "+" : ""}${F2.format(ch)} % ${jour}</span>` : ""}<span class="d${k.vieux ? " prov-stale" : ""}">${quand} · ${esc(p.s)}</span></div>`;
}

/* ---------- 7. Valorisation : PER, valeur d'entreprise ÷ EBITDA, rendement du flux de trésorerie disponible ---------- */
function prixHTML(s, c) {
  const f = figuresOf(c), v = valo(s), idxId = s.region === "US" || s.region === "MONDE" ? "sp500" : "cac40", idx = PX["i:" + idxId], idxName = idxId === "sp500" ? "S&P 500" : "CAC 40";
  if (!v) return `<section class="panel" id="prix"><div class="ph"><h2>Le prix de l'action</h2></div><div class="pb muted">${PXUP && PXUP !== "none" ? "Le cours de cette action n'est pas disponible dans notre source pour le moment." : "Chargement du cours…"}</div></section>`;
  const p = v.p, mp = MEDPE[s.sector], ids = "c:" + s.id, k = provCours(p);
  const perf = (a, b) => a && b ? a / b - 1 : null;
  const prow = [["1 an", "p1y"], ["3 ans", "p3y"], ["5 ans", "p5y"]].map(([l, kk]) => [l, perf(p.p, p[kk]), idx ? perf(idx.p, idx[kk]) : null]).filter(r => r[1] != null);
  const pos = p.h52 && p.l52 && p.h52 > p.l52 ? Math.min(1, Math.max(0, (p.p - p.l52) / (p.h52 - p.l52))) : null;
  const peTxt = v.pe ? `L'action coûte <b>${F0.format(v.pe)} fois</b> le bénéfice de la dernière année${mp ? `, contre ${F0.format(mp)} fois pour la médiane de son secteur` : ""}. ${mp ? (v.pe > mp * 1.3 ? "Le marché la paie plus cher que ses concurrentes : il attend plus de croissance, ou il est optimiste." : v.pe < mp * 0.75 ? "Le marché la paie moins cher que ses concurrentes : il attend moins de croissance, ou il est prudent." : "C'est dans la moyenne de son secteur.") : ""}` : v.vieux ? "Le dernier exercice lu par le site est trop ancien : le PER et le rendement ne sont pas calculés, car le cours d'aujourd'hui serait rapporté à un bénéfice périmé." : f.net != null && f.net <= 0 ? "L'entreprise a perdu de l'argent sur le dernier exercice : le PER (prix ÷ bénéfice) ne se calcule pas." : "";
  const ev = provEvEbitda(s), mev = medInd(s.sector, "ev_ebitda"), fy = provRdtFcf(s);
  const kick = (t, key) => `<span class="kick">${t}${provBtn(key, ids)}</span>`;
  return `<section class="panel" id="prix"><div class="ph"><h2>Le prix de l'action</h2><span class="light" style="font-size:12.5px">${k.vieux ? `Cours du ${dLabel(k.d)}` : "Cours différé"} · ${esc(p.s)}</span></div>
    <div class="pb" style="padding-top:2px"><p class="lead" style="margin:0">${peTxt}</p>${k.vieux ? `<p class="prov-old" style="margin:10px 0 0">Cours ancien : pas de nouveau relevé depuis ${k.jo} jours ouvrés. Les ratios ci-dessous reposent sur ce cours.</p>` : ""}</div>
    <div class="tiles">
      <div class="tile"><span class="kick">Cours</span><span class="v">${pxFmt(p.p, p.cur)}</span><small>${p.chg != null ? `${p.chg > 0 ? "+" : ""}${F2.format(p.chg)} % aujourd'hui` : "dernier cours connu"}</small></div>
      <div class="tile">${kick("Valeur en Bourse", "cap")}<span class="v">${capFmt(v.capE)}</span><small>prix de toutes ses actions (capitalisation)</small></div>
      <div class="tile">${kick("PER", "per")}<span class="v">${v.pe ? F0.format(v.pe) : "–"}</span><small>${v.pe ? `ans de bénéfice pour payer ce prix${mp ? ` · secteur : ${F0.format(mp)}` : ""}` : v.vieux ? "non calculé : comptes trop anciens" : "non calculable (perte ou donnée manquante)"}</small></div>
      ${ev != null ? `<div class="tile">${kick("Valeur d'entreprise ÷ EBITDA", "evebitda")}<span class="v">${F1.format(ev)}</span><small>fois, dettes comprises${mev != null ? ` · secteur : ${F1.format(mev)}` : ""}</small></div>` : ""}
      ${fy != null ? `<div class="tile">${kick("Rendement de l'argent disponible", "rdtfcf")}<span class="v">${pct(fy, 1, false)}</span><small>flux de trésorerie disponible ÷ valeur en Bourse</small></div>` : ""}
      <div class="tile"><span class="kick">Rendement</span><span class="v">${v.yld != null ? pct(v.yld, 1, false) : "–"}</span><small>${v.yld != null ? "dividende annuel ÷ valeur en Bourse" : v.vieux ? "non calculé : comptes trop anciens" : "pas de dividende"}</small></div>
    </div>
    ${perExplique(s)}
    <div class="pb">
      ${pos != null ? `<p class="kick" style="margin-top:4px">Sur un an : du plus bas au plus haut</p><div class="range"><i style="left:${pos * 100}%"></i></div><div class="range-l"><span>${pxFmt(p.l52, p.cur)}</span><span>${pos > 0.85 ? "proche de son plus haut de l'année" : pos < 0.15 ? "proche de son plus bas de l'année" : `à ${F0.format(pos * 100)} % entre le plus bas et le plus haut`}</span><span>${pxFmt(p.h52, p.cur)}</span></div>` : ""}
      ${prow.length ? `<p class="kick" style="margin-top:18px">Évolution du cours, comparée au ${idxName}${provBtn("var1an", ids)}</p>
        <div class="scroll-x"><table class="t"><thead><tr><th class="l">Sur</th><th>${esc(s.name)}</th>${idx ? `<th>${idxName}</th>` : ""}</tr></thead><tbody>${prow.map(([l, a, b]) => `<tr><td class="l">${l}</td><td class="num ${a >= 0 ? "up" : "down"}">${sgn(a, 0)}</td>${idx ? `<td class="num">${b != null ? sgn(b, 0) : "–"}</td>` : ""}</tr>`).join("")}</tbody></table></div>
        <p class="note">Évolution du prix seul, dividendes non compris. ${prow.at(-1)[2] != null ? (prow.at(-1)[1] > prow.at(-1)[2] ? `Sur ${prow.at(-1)[0]}, l'action a fait mieux que le ${idxName}.` : `Sur ${prow.at(-1)[0]}, l'action a fait moins bien que le ${idxName}.`) : ""} Le passé ne dit rien de l'avenir.</p>` : ""}
    </div>
    <div class="src">PER, valeur d'entreprise ÷ EBITDA et rendements calculés par le site avec les derniers comptes annuels publiés (exercice ${f.year}) et la valeur en Bourse ${k.vieux ? `du ${dLabel(k.d)}` : "actuelle"}, convertie en euros aux taux de la BCE. Cours : Google Finance, différés. Touchez « i » pour la formule et les dates.</div></section>`;
}

/* ---------- 8. ETF : provenance des frais, de l'encours et de la composition ---------- */
(function () {
  const pageEtf0 = window.pageEtf;
  if (typeof pageEtf0 !== "function") return;
  window.pageEtf = async function (id) {
    const r = await pageEtf0.apply(this, arguments);
    try { provEtf(id); } catch (e) { }
    return r;
  };
})();
function provEtf(id) {
  const e = ETFBY[id]; if (!e || location.pathname !== "/etf/" + id) return;
  const ids = "e:" + id;
  const ter = $("#efrais .etfter-l b"); if (ter && !ter.parentNode.querySelector(".prov-i")) ter.insertAdjacentHTML("afterend", provBtn("etf_ter", ids));
  const dt = [...document.querySelectorAll("#ecarac dt")].find(x => /^Encours/.test(x.textContent)); if (dt && !dt.querySelector(".prov-i")) dt.insertAdjacentHTML("beforeend", provBtn("etf_encours", ids));
  const addCompo = () => { const h = $("#ecomp .ph h2"); if (h && !h.querySelector(".prov-i")) h.insertAdjacentHTML("beforeend", provBtn("etf_compo", ids)); return !!h; };
  if (!addCompo()) { let n = 0; const t = setInterval(() => { if (addCompo() || ++n > 20 || location.pathname !== "/etf/" + id) clearInterval(t); }, 250); }
}

/* ---------- 9. « Vérifier une offre » : trois issues distinctes, jamais de « feu vert » ---------- */
// Mots trop courants pour identifier un acteur : une recherche faite seulement de ces mots est jugée insuffisante.
const PROV_LN_GENERIQUES = new Set(["invest", "investir", "investissement", "investissements", "investment", "investments", "trading", "trade", "trader", "crypto", "cryptos", "bitcoin", "btc", "bourse", "finance", "finances", "financier", "financiere",
  "capital", "capitaux", "gestion", "conseil", "conseils", "patrimoine", "placement", "placements", "forex", "banque", "bank", "epargne", "wealth", "asset", "assets", "fund", "funds", "fonds", "profit", "profits", "gain", "gains", "rendement",
  "global", "international", "group", "groupe", "france", "europe", "paris", "partners", "consulting", "market", "markets", "marche", "com", "fr", "net", "org", "www", "http", "https", "sas", "sarl", "ltd", "limited", "inc", "sa",
  "or", "gold", "vin", "vins", "diamant", "diamants", "immobilier", "options", "binaires", "broker", "courtier", "plateforme", "app", "application", "conseiller", "amf", "contact", "info", "service", "services", "securities", "capital-invest"]);
const PROV_LN_MAX = 40; // au-delà, la saisie est trop générale pour être utile
function provLnNorm(q) {
  let t = norm(String(q || "").trim()).replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  const at = t.lastIndexOf("@"); const mail = at > 0 ? t.slice(at + 1) : null;
  t = t.replace(/[/?#].*$/, "").replace(/\s+/g, " ").trim();
  return { t, domaine: mail ? mail.replace(/[/?#].*$/, "") : /^[a-z0-9.-]+\.[a-z]{2,}$/.test(t) ? t : null };
}
function provLnIndex(items) { // nom normalisé et domaine de chaque entrée (le nom contient souvent le site ou l'adresse e-mail)
  return items.map(x => { const n = norm(x.n || ""), s = norm(x.s || ""), apres = n.includes("@") ? n.slice(n.lastIndexOf("@") + 1) : n;
    const dom = (apres.match(/([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?![a-z0-9-])/) || [])[1] || null;
    return { x, n, s, dom: dom ? dom.replace(/^www\./, "") : null }; });
}
// Résultat : { issue: "trouve" | "insuffisant" | "aucun", hits, raison }
function provLnCherche(q, IDX) {
  const { t, domaine } = provLnNorm(q);
  const mots = t.split(/[\s.\-_@]+/).filter(Boolean);
  if (t.length < 4) return { issue: "insuffisant", hits: [], raison: "court" };
  if (!domaine && mots.every(m => PROV_LN_GENERIQUES.has(m) || m.length < 3)) return { issue: "insuffisant", hits: [], raison: "generique" };
  const hits = IDX.filter(i => i.n.includes(t) || (i.s && i.s.includes(t)) || (domaine && i.dom && (domaine === i.dom || domaine.endsWith("." + i.dom))));
  if (hits.length > PROV_LN_MAX && !domaine) return { issue: "insuffisant", hits: [], raison: "trop", n: hits.length };
  return hits.length ? { issue: "trouve", hits: hits.map(h => h.x) } : { issue: "aucun", hits: [] };
}
const provLnCat = c => String(c || "").split("|").map(x => x.replace(/^Biens_divers\//, "Biens divers : ").replace(/_/g, " ").replace("Usurpation AMF", "Usurpation de l'identité de l'AMF")).join(", ");
async function outilVerifier() {
  setTitle("Vérifier un site ou une offre");
  app.innerHTML = `<div class="crumbs"><a href="/outils">Outils</a> › Vérifier un site ou une offre</div><h1 class="pagetitle">Vérifier un site, une appli ou une offre</h1>
    <p class="pagesub">Une publicité promet 10 % par mois, un « conseiller » vous contacte sur WhatsApp, un site propose du trading de cryptos ? Tapez son nom, son adresse internet ou son adresse e-mail : le site cherche dans les listes noires publiées par l'AMF.</p>
    <section class="panel"><div class="pb"><form id="lnf" class="field" style="max-width:560px" role="search"><label for="lnq">Nom exact, site internet ou adresse e-mail</label><div style="display:flex;gap:8px"><input id="lnq" type="search" autocomplete="off" placeholder="ex. invest-profit-plus.com" style="flex:1;min-width:0"><button class="btn" type="submit">Vérifier</button></div></form>
      <div id="lnr" style="margin-top:12px" aria-live="polite"></div></div>
      <div class="src" id="lns">Chargement des listes…</div></section>
    <section class="panel"><div class="ph"><h2>Les bons réflexes, même sans alerte</h2></div><div class="pb">
      <p style="margin:0 0 10px"><b>Ne pas figurer sur une liste noire ne prouve pas qu'une offre est fiable.</b> Les listes ne recensent que les acteurs déjà signalés ; un site frauduleux change souvent de nom. Avant de verser de l'argent, vérifiez que l'acteur est autorisé :</p>
      <ul style="margin:0;padding-left:18px;line-height:1.7">
        <li><a class="lnk" href="https://www.regafi.fr" target="_blank" rel="noopener">REGAFI</a> : banques, entreprises d'investissement et prestataires de paiement autorisés en France.</li>
        <li><a class="lnk" href="https://www.orias.fr" target="_blank" rel="noopener">ORIAS</a> : conseillers en investissements financiers et intermédiaires immatriculés.</li>
        <li>Les listes blanches de l'<a class="lnk" href="https://www.amf-france.org" target="_blank" rel="noopener">AMF</a> : prestataires de services sur crypto-actifs agréés, sociétés de gestion, offres de financement participatif autorisées.</li>
        <li>En cas de doute, AMF Épargne Info Service : 01 53 45 62 00 (du lundi au vendredi).</li></ul></div></section>
    <section class="panel"><div class="ph"><h2>Les signaux qui doivent alerter</h2></div><div class="pb"><ul style="margin:0;padding-left:18px;line-height:1.7">
      <li>Un rendement élevé <b>et</b> garanti : en Bourse, un rendement élevé s'accompagne toujours d'un risque de perte.</li>
      <li>Un contact que vous n'avez pas demandé (appel, message privé, réseau social) et une pression pour décider vite.</li>
      <li>Un versement demandé par virement vers un compte à l'étranger, en cryptomonnaie ou par carte cadeau.</li>
      <li>Une société introuvable dans les registres officiels, ou au nom proche d'une institution connue.</li></ul></div></section>`;
  if (!LN) { try { LN = await (await fetch("/data/listes-noires.json")).json(); } catch (e) { LN = { items: [] }; } }
  if (!$("#lnq")) return;
  const IDX = provLnIndex(LN.items || []), jo = LN.updated ? provJoursOuvres(LN.updated) : null, vieux = jo != null && jo > 3;
  const maj = LN.updated ? `Liste mise à jour le ${dLabel(LN.updated)}` : "Date de mise à jour inconnue";
  $("#lns").innerHTML = IDX.length ? `${F0.format(IDX.length)} entrées. ${maj}${vieux ? ` <b class="prov-stale">(pas de mise à jour depuis ${jo} jours ouvrés : les inscriptions récentes peuvent manquer)</b>` : ""} · source : ${LN.source ? `<a class="lnk" href="${esc(LN.source)}" target="_blank" rel="noopener">listes noires de l'AMF</a>` : "listes noires de l'AMF"}, jeu de données ouvert publié sur data.gouv.fr.`
    : "Les listes noires ne sont pas disponibles pour le moment : consultez directement le site de l'AMF.";
  const rappel = `<p class="lnnote">L'absence de la liste ne prouve pas qu'une offre est fiable. ${maj.replace("Liste mise", "Liste noire mise")}.</p>`;
  const q = $("#lnq");
  const run = () => {
    const v = q.value.trim(); if (!v) { $("#lnr").innerHTML = ""; return; }
    if (!IDX.length) { $("#lnr").innerHTML = `<div class="lnins"><b>Recherche impossible pour le moment.</b> Les listes n'ont pas pu être chargées : consultez le site de l'AMF.</div>`; return; }
    const R0 = provLnCherche(v, IDX);
    if (R0.issue === "trouve") {
      const h = R0.hits, n = h.length;
      $("#lnr").innerHTML = `<div class="lnwarn" role="alert"><b>Correspondance trouvée dans les listes noires de l'AMF${n > 1 ? ` (${n > 12 ? "au moins 12 affichées sur " + n : n} entrées)` : ""}.</b> L'AMF signale ces acteurs comme non autorisés à proposer des produits ou services financiers en France. Ne versez pas d'argent. Vérifiez que le nom correspond exactement à celui de l'offre.</div>
        ${h.slice(0, 12).map(x => `<div class="lnit"><b>${esc(x.n || x.s)}</b>${x.s && x.n ? ` <span class="light">${esc(x.s)}</span>` : ""}<div class="light" style="font-size:12.5px">${esc(provLnCat(x.c))}${x.d ? ` · inscrit le ${esc(/^\d{4}-\d{2}-\d{2}$/.test(x.d) ? dLabel(x.d) : x.d)}` : ""}</div></div>`).join("")}${rappel.replace("L'absence de la liste ne prouve pas qu'une offre est fiable. ", "")}`;
    } else if (R0.issue === "insuffisant") {
      $("#lnr").innerHTML = `<div class="lnins"><b>Recherche insuffisante.</b> ${R0.raison === "court" ? "La saisie est trop courte pour identifier un acteur : tapez au moins 4 caractères." : R0.raison === "trop" ? `Ce terme apparaît dans ${F0.format(R0.n)} entrées : il est trop général pour conclure.` : "Ces mots sont trop courants (par exemple « invest », « trading », « crypto ») pour identifier un acteur."} Tapez le nom exact de la société, l'adresse du site (ex. nom-du-site.com) ou l'adresse e-mail de votre contact.</div>${rappel}`;
    } else {
      $("#lnr").innerHTML = `<div class="lnnone"><b>Aucune correspondance dans les listes noires de l'AMF.</b> Cela ne prouve pas que l'offre est fiable : les listes ne contiennent que les acteurs déjà signalés, et les escrocs changent souvent de nom. Vérifiez que l'acteur figure sur REGAFI, sur l'ORIAS ou sur une liste blanche de l'AMF (voir ci-dessous) avant de verser de l'argent.</div>${rappel.replace("L'absence de la liste ne prouve pas qu'une offre est fiable. ", "")}`;
    }
  };
  let tm = 0; q.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 250); };
  $("#lnf").onsubmit = ev => { ev.preventDefault(); clearTimeout(tm); run(); };
}
document.head.insertAdjacentHTML("beforeend", `<style>
.lnins{background:#FFF6E5;border:1px solid #F0D29A;border-radius:12px;padding:12px 14px;color:#6B4A0E}
.lnnone{background:#F5F3EE;border:1px solid var(--line,#E6E2DA);border-radius:12px;padding:12px 14px;color:var(--ink,#111)}
.lnnote{margin:8px 2px 0;font-size:12.5px;color:var(--grey)}
.prov-stale{color:#9A4A12}
</style>`);
