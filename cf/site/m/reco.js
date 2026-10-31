/* Module « reco » de bilan. : chargé après m/parcours.js et avant m/orchestre.js.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   Contenu :
   1. RECO : calculs purs, sans navigateur (testés par tests/t_reco.mjs) :
      - éligibilité au PEA d'une action (règle documentée ci-dessous) et d'un ETF (champ « pea » fourni par l'émetteur) ;
      - niveau de risque d'un placement (1 à 5), d'après sa nature (catégorie d'ETF, taille de l'entreprise) ;
      - ce que chaque compte accepte (placement) ;
      - profil et choisir : gardés et testés, mais plus appelés par aucune page depuis la refonte du 29 octobre 2026.
   2. Navigateur : peaOk() du site s'appuie sur RECO.peaAction (une seule règle partout) ;
      page /repartitions (exemples de répartition expliqués, listes construites sur des critères choisis par le visiteur) ;
      étiquettes PEA, niveaux de risque et catalyseurs réutilisés par m/outils.js.

   Cadre : information factuelle à but pédagogique. La page n'établit pas de profil, n'enregistre aucune réponse
   et ne désigne aucune répartition ni aucun titre comme adapté à une personne : ce serait du conseil en
   investissement (MIF 2), et bilan. n'est pas conseiller en investissements financiers (CIF).
   Aucun chiffre n'est inventé : tout vient des comptes publiés (ESEF/SEC), des cours du site et des fiches
   des émetteurs d'ETF, avec leur source. */

const RECO = (() => {
  /* ---------- 1. Éligibilité au PEA ----------
     Règle légale (article L221-31 du Code monétaire et financier) : actions de sociétés qui ont leur siège dans l'Union
     européenne ou dans un État de l'EEE ayant signé une convention d'assistance fiscale (Norvège, Islande, Liechtenstein),
     ET soumises à l'impôt sur les sociétés dans les conditions de droit commun (ou un impôt équivalent).
     La place de cotation ne compte pas : une société néerlandaise cotée à New York reste éligible en droit, une société
     suisse cotée à Paris ne l'est pas.
     Mise en œuvre :
     - le siège est lu dans le pays du code ISIN (deux premières lettres), recoupé avec le pays donné par Wikidata
       (cf/site/data/pea.json, fabriqué par data/pea.mjs) ; si les deux se contredisent, le site affiche « à vérifier » ;
     - l'impôt sur les sociétés : les foncières cotées sous un régime qui les exonère (SIIC en France, SIR en Belgique,
       SOCIMI en Espagne, REIT irlandais…) sont exclues ; une foncière d'un pays qui a un tel régime et qui n'est pas dans
       une des deux listes ci-dessous est « à vérifier ».
     Limites : le pays de l'ISIN peut différer du siège réel (fusion, transfert de siège) ; les listes sont tenues à la main
     (vérifiées le 29/10/2026) ; le courtier fait foi au moment de l'achat. */
  const EEE = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "SE", "DK", "NO", "IS", "LI", "PL", "CZ", "GR", "HU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "BG", "RO"]);
  const REIT = new Set(["unibail-rodamco-westfield", "covivio", "gecina", "icade", "klepierre", "mercialys", "altarea", "carmila", "argan", "frey", // SIIC (France)
    "warehouses-de-pauw", "aedifica", "montea", "xior", "care-property-invest", "retail-estates", "home-invest-belgium", "cofinimmo", // SIR (Belgique)
    "merlin-properties", "inmobiliaria-colonial", "lar-espana", // SOCIMI (Espagne)
    "ires-reit", "eurocommercial-properties", "wereldhave", "vastned", "nsi"]); // REIT irlandais, FBI néerlandais
  const IMMO_IS = new Set(["nexity", "kaufman-broad", "bassac", "hexaom", "neinor-homes", "atenor", "glenveagh-properties", "cairn-homes", // promoteurs et constructeurs
    "vonovia", "deutsche-wohnen", "leg-immobilien", "tag-immobilien", "patrizia-immobilien", "ca-immo", "aroundtown", "grand-city-properties"]);
  const REIT_PAYS = new Set(["FR", "BE", "ES", "NL", "IE", "DE", "IT", "PT", "GR", "FI", "BG", "HU", "LT"]);
  function peaAction(c, div) {
    if (!c || !c.id) return { ok: null, code: "inconnu", why: "Titre inconnu du site : vérifiez auprès de votre courtier." };
    const i = String(c.isin || "").slice(0, 2).toUpperCase(), d = div && div[c.id];
    if (REIT.has(c.id)) return { ok: false, code: "reit", why: "Foncière sous un régime qui l'exonère d'impôt sur les sociétés (SIIC, SIR, SOCIMI ou REIT) : la loi l'exclut du PEA, même si son siège est en Europe." };
    if (!i) {
      if (d) return { ok: null, code: "sans-isin", why: `Pas de code ISIN connu du site ; Wikidata situe l'entreprise en ${d.pays}. À vérifier auprès de votre courtier.` };
      if (c.region === "US" || c.region === "MONDE") return { ok: false, code: "hors-eee", why: "Cotée hors d'Europe, et aucune source du site (code ISIN, Wikidata) ne situe son siège dans l'Union européenne ou l'EEE." };
      return { ok: null, code: "sans-isin", why: "Pas de code ISIN connu du site : le pays du siège n'est pas vérifiable ici." };
    }
    if (!EEE.has(i)) return d ? { ok: null, code: "divergence", why: `Code ISIN ${i} (hors Union européenne), mais Wikidata situe l'entreprise en ${d.pays}. Les sources se contredisent : à vérifier auprès de votre courtier.` }
      : { ok: false, code: "hors-eee", why: `Société immatriculée hors de l'Union européenne et de l'EEE (code ISIN ${i}). Peu importe où l'action est cotée : seul le siège compte.` };
    if (d) return { ok: null, code: "divergence", why: `Code ISIN ${i} (Union européenne ou EEE), mais Wikidata situe l'entreprise en ${d.pays}. Les sources se contredisent : à vérifier auprès de votre courtier.` };
    if (c.sector === "immo" && !IMMO_IS.has(c.id) && REIT_PAYS.has(i)) return { ok: null, code: "fonciere", why: "Société immobilière d'un pays qui a un régime de foncière exonérée d'impôt (SIIC, SIR, SOCIMI…). Si elle en relève, elle est exclue du PEA : à vérifier." };
    return { ok: true, code: "ok", why: `Siège dans l'Union européenne ou l'EEE (code ISIN ${i}), et aucun régime d'exonération d'impôt sur les sociétés connu.` };
  }
  // ETF : l'éligibilité est juridique (le fonds respecte le quota de 75 % d'actions européennes, en direct ou via un panier
  // et un contrat d'échange), elle ne dit rien de ce que le fonds suit. On garde les deux informations séparées.
  function peaEtf(e) {
    if (!e) return { ok: null, why: "Fonds inconnu du site." };
    const p1 = e.compo && Array.isArray(e.compo.p1) ? e.compo.p1 : null;
    const expo = p1 ? { pays: p1[0], pct: p1[1] } : null, swap = /synth|swap/i.test(String(e.replication || e.methode || ""));
    if (e.pea === true) return { ok: true, expo, swap, why: `Éligible au PEA d'après l'émetteur (${e.issuer || "fiche du fonds"}).${swap ? " Le fonds détient un panier d'actions européennes et reçoit la performance de son indice par un contrat d'échange : c'est ce qui le rend éligible, pas ce qu'il suit." : ""}` };
    if (e.pea === false) return { ok: false, expo, swap, why: `Non éligible au PEA d'après l'émetteur (${e.issuer || "fiche du fonds"}).` };
    return { ok: null, expo, swap, why: "L'émetteur n'indique pas l'éligibilité au PEA : à vérifier." };
  }

  /* ---------- 2. Questionnaire ----------
     Les 5 premières questions (horizon, baisse, precaution, connaissance, choisir) viennent de /data/commencer.json
     (même clé d'enregistrement « bilan.profil » que /commencer) ; les autres sont propres à /pour-moi. Valeur = index de l'option. */
  const QX = [
    { id: "perte", g: "risque", q: "Quelle baisse pourriez-vous supporter sans changer vos projets ?", aide: "C'est votre capacité réelle à perdre, différente de votre envie de risque.", o: ["Aucune : j'aurai besoin de toute la somme", "Jusqu'à 10 %", "Jusqu'à 25 %", "Plus de 25 % : cet argent n'est pas nécessaire à mes projets"] },
    { id: "liquidite", g: "situation", q: "Pourriez-vous devoir retirer une partie de cet argent à tout moment ?", o: ["Oui, c'est probable", "Peut-être une petite partie", "Non, pas avant l'échéance prévue"] },
    { id: "objectif", g: "objectifs", q: "Quel est votre objectif principal ?", o: ["Protéger mon capital", "Toucher des revenus réguliers", "Faire croître mon capital", "Diversifier ce que j'ai déjà"] },
    { id: "capital", g: "situation", q: "Combien pensez-vous placer au départ ?", o: ["Moins de 1 000 €", "De 1 000 à 10 000 €", "De 10 000 à 50 000 €", "Plus de 50 000 €"] },
    { id: "versement", g: "situation", q: "Et chaque mois ?", o: ["Rien de régulier", "Moins de 100 €", "De 100 à 500 €", "Plus de 500 €"] },
    { id: "enveloppe", g: "objectifs", q: "Sur quel compte ?", o: ["PEA", "Compte-titres", "PEA et compte-titres", "Assurance-vie", "Pas encore de compte"] },
  ];
  const BASE = ["horizon", "baisse", "precaution", "connaissance", "choisir"];
  const IDS = [...BASE, ...QX.map(q => q.id)];
  const ENV = ["pea", "cto", "both", "av", "none"];
  const okAns = a => a && typeof a === "object" ? a : {};
  const manquantes = ans => IDS.filter(k => !Number.isInteger(okAns(ans)[k]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const r5 = x => Math.round(x / 5) * 5;

  /* ---------- 3. Modèle des retours ----------
     retour = { id, v: "ok" | "risque" | "redondant" | "inadapte", kind: "ent" | "etf" | "sect" | "alloc", tags: [..], risk: 1..5, at }
     - « trop risquée » : plafond de risque des pistes suivantes = risque de cette piste − 1 (jamais sous 1),
       et la part d'actions indicative baisse de 5 points (15 au plus) ;
     - « redondante » : la piste disparaît et ses étiquettes (secteur, catégorie) perdent du poids ;
     - « inadaptée » : la piste disparaît, ses étiquettes perdent un peu de poids ;
     - « pertinente » : ses étiquettes gagnent du poids (pistes semblables mises en avant). */
  const FB_V = { ok: "Pertinente", risque: "Trop risquée", redondant: "Redondante", inadapte: "Inadaptée" };
  function modele(retours) {
    const M = { cap: 5, w: {}, excl: new Set(), eqAdj: 0, n: 0 };
    const last = new Map(); // le dernier avis sur une même piste remplace les précédents
    (Array.isArray(retours) ? retours : []).forEach(r => { if (r && r.id && FB_V[r.v]) last.set(r.id, r); });
    for (const r of last.values()) {
      M.n++;
      const tags = Array.isArray(r.tags) ? r.tags : [], add = d => tags.forEach(t => { M.w[t] = (M.w[t] || 0) + d; });
      if (r.v === "risque") { if (r.risk >= 1) M.cap = Math.min(M.cap, Math.max(1, r.risk - 1)); M.eqAdj = Math.min(15, M.eqAdj + 5); if (r.kind !== "alloc") M.excl.add(r.id); }
      else if (r.v === "redondant") { M.excl.add(r.id); add(-1.5); }
      else if (r.v === "inadapte") { M.excl.add(r.id); add(-1); }
      else if (r.v === "ok") add(1.5);
    }
    return M;
  }

  /* ---------- 4. Profil et allocation indicative ----------
     Part d'actions = la plus basse des limites suivantes (la prudence l'emporte) :
     horizon (moins de 5 ans : 30 % ; 5 à 10 ans : 60 % ; plus de 10 ans : 90 %), réaction à une baisse de 30 %
     (25 / 50 / 75 / 90 %), capacité de perte (10 / 35 / 65 / 100 %), besoin de liquidité (40 / 75 / 100 %).
     Puis : objectif « protéger » → 30 % au plus ; « revenus » → −5 points ; découverte de la Bourse → 70 % au plus ;
     retours « trop risquée » → jusqu'à −15 points. Fourchette affichée : ±10 points, arrondie à 5. */
  const LIM = { horizon: [30, 60, 90], baisse: [25, 50, 75, 90], perte: [10, 35, 65, 100], liquidite: [40, 75, 100] };
  const NIV = ["", "Très prudent", "Prudent", "Équilibré", "Dynamique", "Offensif"];
  function profil(ans0, retours) {
    const ans = okAns(ans0), miss = manquantes(ans);
    if (miss.length) return { complet: false, manque: miss };
    const M = modele(retours), lim = Object.entries(LIM).map(([k, t]) => [k, t[ans[k]] != null ? t[ans[k]] : 100]);
    const plafond = Math.min(...lim.map(x => x[1])), frein = lim.filter(x => x[1] === plafond).map(x => x[0]);
    let eq = plafond;
    if (ans.objectif === 0) eq = Math.min(eq, 30);
    if (ans.objectif === 1) eq -= 5;
    if (ans.connaissance === 0) eq = Math.min(eq, 70);
    eq = clamp(r5(eq - M.eqAdj), 0, 100);
    const eqMin = clamp(r5(eq - 10), 0, 100), eqMax = clamp(r5(eq + 10), 0, Math.min(100, plafond));
    const niveau = eq < 20 ? 1 : eq < 40 ? 2 : eq < 60 ? 3 : eq < 80 ? 4 : 5;
    // Actions en direct : jamais plus de 25 % du total, et seulement si vous le souhaitez et savez lire des comptes
    let dMax = Math.min([0, 10, 25][ans.connaissance] ?? 0, [0, 10, 25][ans.choisir] ?? 0, eqMax);
    if (ans.capital === 0 && ans.versement <= 1) dMax = Math.min(dMax, 10);
    if (niveau <= 1) dMax = 0;
    const safe = 100 - eq, court = ans.horizon === 0 || ans.liquidite === 0 || ans.objectif === 0;
    const garanti = court ? safe : r5(safe * 0.5), oblig = safe - garanti, env = ENV[ans.enveloppe] || "none";
    const rg = (v, d = 10, max = 100) => [clamp(r5(v - d), 0, 100), clamp(r5(v + d), 0, max)];
    const classes = [];
    if (eq > 0) classes.push({ k: "etf", label: "Actions via des ETF larges", v: eq - Math.round(dMax / 2 / 5) * 5, r: rg(eq - Math.round(dMax / 2 / 5) * 5, 10, eqMax), risk: 3,
      why: "Un ETF large répartit le risque sur des centaines d'entreprises, avec des frais bas. C'est la base de la part en actions." });
    if (dMax > 0) classes.push({ k: "direct", label: "Actions en direct", v: Math.round(dMax / 2 / 5) * 5, r: [0, dMax], risk: 4,
      why: "Facultatif. Demande de lire les résultats deux à quatre fois par an. Une entreprise seule peut perdre beaucoup plus qu'un ETF." });
    if (oblig > 0) classes.push({ k: "oblig", label: "Obligations (ETF d'obligations)", v: oblig, r: rg(oblig, 10), risk: 2,
      why: "Des prêts aux États et aux entreprises : moins de variations que les actions, mais une valeur qui baisse quand les taux montent." });
    if (garanti > 0) classes.push({ k: "garanti", label: "Sans risque de perte en capital", v: garanti, r: rg(garanti, 10), risk: 1,
      why: "Fonds en euros d'assurance-vie, livrets réglementés, ou ETF monétaire (très faible risque, sans garantie). L'argent reste disponible ou presque." });
    const hyp = [
      `Part d'actions limitée par : ${frein.map(k => ({ horizon: "votre horizon", baisse: "votre réaction à une baisse", perte: "la baisse que vous pouvez supporter", liquidite: "votre besoin de disponibilité" })[k]).join(", ")} (${plafond} % au plus).`,
      ans.objectif === 0 ? "Objectif « protéger mon capital » : la part d'actions est plafonnée à 30 %." : ans.objectif === 1 ? "Objectif « revenus » : 5 points de moins en actions, au profit des placements qui versent des intérêts." : null,
      ans.connaissance === 0 ? "Vous découvrez la Bourse : la part d'actions est plafonnée à 70 % le temps d'apprendre." : null,
      M.eqAdj ? `Vos retours « trop risquée » retirent ${M.eqAdj} points à la part d'actions.` : null,
      "Les fourchettes sont des repères arrondis à 5 points, pas des chiffres exacts : votre situation complète (revenus, patrimoine, impôts, projets) n'est pas connue du site.",
    ].filter(Boolean);
    const prereq = [];
    if (ans.precaution === 0) prereq.push("Avant d'investir en Bourse, constituez une épargne de précaution de 3 à 6 mois de dépenses sur un livret. C'est la première étape, avant toute répartition.");
    else if (ans.precaution === 1) prereq.push("Terminez votre épargne de précaution (3 à 6 mois de dépenses sur un livret) avant d'augmenter la part en actions.");
    if (ans.horizon === 0) prereq.push("Sur moins de 5 ans, une baisse de 30 % des actions peut ne pas avoir le temps de se rattraper : la part d'actions reste faible.");
    return { complet: true, ans, eq, eqMin, eqMax, plafond, frein, niveau, label: NIV[niveau], dMax, env, classes, hyp, prereq, modele: M,
      riskMax: Math.min(M.cap, niveau <= 1 ? 2 : niveau === 2 ? 3 : niveau <= 4 ? 4 : 5) };
  }

  // Où placer chaque classe selon le compte choisi (contraintes des enveloppes)
  function placement(env, k) {
    const T = {
      pea: { etf: "PEA : ETF portant la mention « éligible PEA »", direct: "PEA : actions de sociétés européennes seulement", oblig: "Pas possible dans un PEA : hors PEA (assurance-vie ou compte-titres)", garanti: "Hors PEA (livret, fonds en euros) ; dans le PEA, un ETF monétaire éligible" },
      cto: { etf: "Compte-titres : tous les ETF", direct: "Compte-titres : actions du monde entier", oblig: "Compte-titres : ETF d'obligations", garanti: "Hors compte-titres (livret, fonds en euros) ou ETF monétaire" },
      both: { etf: "PEA d'abord (ETF éligibles), compte-titres pour le reste", direct: "PEA pour les sociétés européennes, compte-titres pour les autres", oblig: "Compte-titres (impossible dans un PEA)", garanti: "Livret ou fonds en euros, hors des deux comptes" },
      av: { etf: "Assurance-vie : unités de compte en ETF, selon votre contrat", direct: "Rarement possible en assurance-vie : compte-titres ou PEA", oblig: "Assurance-vie : fonds ou ETF d'obligations, selon votre contrat", garanti: "Assurance-vie : fonds en euros" },
      none: { etf: "Un PEA pour un horizon de plus de 5 ans, sinon un compte-titres", direct: "PEA pour les sociétés européennes", oblig: "Compte-titres ou assurance-vie", garanti: "Livret réglementé ou fonds en euros d'assurance-vie" },
    };
    return (T[env] || T.none)[k] || "";
  }

  /* ---------- 5. Niveau de risque d'une piste (1 à 5) ---------- */
  // f = { taille: "micro"|"small"|"mid"|"large"|null, perte: bool, levier: nombre|null, amp: amplitude sur 52 semaines (0,4 = 40 %)|null }
  function risqueAction(f) {
    let r = { micro: 5, small: 4, mid: 3, large: 3 }[f && f.taille] || 4; // une action seule : jamais sous 3
    if (f && (f.perte || (f.levier != null && f.levier > 3) || (f.amp != null && f.amp > 0.6))) r++;
    return clamp(r, 3, 5);
  }
  const RISK_ETF = { monetaire: 1, obligations: 2, "actions-monde": 3, "actions-europe": 3, "actions-usa": 3, facteurs: 3, dividendes: 3, "actions-france": 4, "actions-emergents": 4, "actions-asie": 4, theme: 4, immobilier: 4, matieres: 5 };
  const risqueEtf = e => clamp((RISK_ETF[e && e.categorie] || 4) + (e && e.levier ? 2 : 0), 1, 5);

  /* ---------- 6. Choix des pistes ----------
     cands = [{ id, kind, tags, risk, s (score de base), ... }] ; o = { n, riskMax, modele, held: Set, uniq: étiquette à ne pas répéter } */
  function choisir(cands, o) {
    const M = o.modele || modele([]), held = o.held || new Set(), cap = Math.min(o.riskMax ?? 5, M.cap);
    const L = cands.filter(c => !held.has(c.id) && !M.excl.has(c.id) && c.risk <= cap)
      .map(c => ({ c, s: (c.s || 0) + (c.tags || []).reduce((a, t) => a + (M.w[t] || 0), 0) }))
      .sort((a, b) => b.s - a.s || String(a.c.id).localeCompare(String(b.c.id)));
    const out = [], seen = new Set();
    for (const x of L) {
      if (out.length >= (o.n || 3)) break;
      const u = o.uniq ? (x.c.tags || []).find(t => t.startsWith(o.uniq)) : null;
      if (u && seen.has(u)) continue;
      if (u) seen.add(u); out.push(x.c);
    }
    return out;
  }
  const fourchette = r => r[0] === r[1] ? `${r[0]} %` : `${r[0]} à ${r[1]} %`;

  return { EEE, REIT, IMMO_IS, peaAction, peaEtf, QX, BASE, IDS, ENV, manquantes, modele, profil, placement, risqueAction, risqueEtf, choisir, fourchette, FB_V, NIV };
})();
if (typeof module === "object" && module) module.exports = RECO;

/* =====================================================================
   2. Navigateur
   ===================================================================== */
let RECO_DIV = {}, RECO_DIVP = null;
function recoDivLoad() {
  if (!RECO_DIVP) RECO_DIVP = fetch("/data/pea.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => { RECO_DIV = (j && j.divergences) || {}; return RECO_DIV; });
  return RECO_DIVP;
}
// Utilisée par peaOk() de index.html : une seule règle d'éligibilité pour tout le site
function recoPeaOk(c) { return RECO.peaAction(c, RECO_DIV).ok; }
function recoPeaInfo(c) { return RECO.peaAction(c, RECO_DIV); }
function recoPeaTag(c) {
  const p = recoPeaInfo(c), t = p.ok === true ? ["ok", "Éligible PEA"] : p.ok === false ? ["non", "Hors PEA"] : ["av", "PEA à vérifier"];
  return `<span class="rc-pea rc-pea-${t[0]}" title="${esc(p.why)}">${t[1]}</span>`;
}
function recoEtfPeaTag(e) {
  const p = RECO.peaEtf(e), t = p.ok === true ? ["ok", "Éligible PEA"] : p.ok === false ? ["non", "Hors PEA"] : ["av", "PEA non indiqué"];
  return `<span class="rc-pea rc-pea-${t[0]}" title="${esc(p.why)}">${t[1]}</span>`;
}

/* ---------- Ce que l'on sait d'une entreprise : taille, profil, valorisation, risques, catalyseurs ---------- */
const RECO_TAILLE = { micro: "Microcapitalisation", small: "Petite capitalisation", mid: "Moyenne capitalisation", large: "Grande capitalisation" };
const RECO_STYLE = { croissance: "Croissance", rendement: "Rendement", redressement: "Redressement", solidite: "Solidité financière" };
// Capitalisation en euros : micro < 300 M€, petite < 2 Md€, moyenne < 10 Md€, grande au-delà.
// Sans cours, la taille est estimée par les ventes (moins de 150 M€, 1 Md€, 5 Md€), et c'est indiqué.
function recoTaille(c) {
  const v = typeof valo === "function" ? valo(c) : null, k = v && v.capE;
  if (k > 0) return { t: k >= 1e10 ? "large" : k >= 2e9 ? "mid" : k >= 3e8 ? "small" : "micro", src: "capi", capE: k };
  const ca = c.ca > 0 ? toEur(c.ca, c.currency) : null;
  if (ca > 0 && isFinite(ca)) return { t: ca >= 5000 ? "large" : ca >= 1000 ? "mid" : ca >= 150 ? "small" : "micro", src: "ventes", caE: ca };
  return null;
}
function recoAmp(c) { const p = pxOf(c); return p && p.h52 > 0 && p.l52 > 0 && p.h52 >= p.l52 ? (p.h52 - p.l52) / p.h52 : null; }
function recoStyle(c) {
  const m = ratios(c), v = valo(c), st = typeof OUT_ST !== "undefined" && OUT_ST ? OUT_ST[c.id] : null, cv = typeof outCouv === "function" ? outCouv(c) : null;
  if (c.netPrev != null && c.netPrev < 0 && c.net > 0) return "redressement";
  if (v && v.yld >= 0.035 && cv && cv.k === "oui") return "rendement";
  if ((st && st.caUp >= 3 && st.cagr >= 0.07) || (m.g1 != null && m.g1 >= 0.15 && c.net > 0)) return "croissance";
  if (c.net > 0 && c.netDebt != null && c.netDebt <= 0 && !isBank(c)) return "solidite";
  return null;
}
function recoValo(c) { // phrases de valorisation, toutes calculées (cours du site, bénéfice publié, médiane du secteur)
  const v = valo(c), out = []; if (!v) return out;
  if (v.capE) out.push(`Valeur en Bourse : ${capFmt(v.capE)}.`);
  const med = typeof MEDPE === "object" ? MEDPE[c.sector] : null;
  if (v.pe) out.push(`Le prix de l'action vaut ${F0.format(v.pe)} fois le bénéfice par action${med ? `, contre ${F0.format(med)} fois pour la médiane de son secteur` : ""} (PER).`);
  else if (!(c.net > 0)) out.push("Pas de PER : l'entreprise était en perte au dernier exercice.");
  if (v.yld) out.push(`Rendement du dividende : ${pct(v.yld, 1, false)} du prix de l'action.`);
  return out;
}
function recoRisques(c, T) {
  const R0 = [], m = ratios(c), amp = recoAmp(c), y = new Date().getFullYear();
  if (T && (T.t === "micro" || T.t === "small")) R0.push(["Liquidité", `${RECO_TAILLE[T.t]} : peu d'actions s'échangent chaque jour en général. Acheter ou vendre peut faire bouger le prix ; un ordre à cours limité évite les mauvaises surprises.`]);
  if (amp != null && amp >= 0.3) R0.push(["Volatilité", `Sur un an, le cours le plus bas a été ${F0.format(amp * 100)} % sous le plus haut (cours du site).`]);
  const rep = typeof REP === "object" && REP ? REP[c.id] : null, a1 = rep && rep.activites && rep.activites[0];
  if (a1 && a1[1] >= 60) R0.push(["Concentration", `Une seule activité (${esc(a1[0])}) fait ${F0.format(a1[1])} % des ventes ${rep.annee || ""} (rapport annuel).`]);
  if (!isBank(c) && m.lev != null && m.lev > 3) R0.push(["Dette", `La dette nette vaut ${F1.format(m.lev)} années de résultat d'exploitation avant amortissements.`]);
  if (!(c.net > 0)) R0.push(["Pertes", `En perte au dernier exercice (${esc(String(c.year || ""))}).`]);
  if (c.currency && c.currency !== "EUR") R0.push(["Devise", `Comptes en ${esc(c.currency)} : le taux de change s'ajoute aux variations de l'action pour un investisseur en euros.`]);
  if (T && (T.t === "micro" || T.t === "small")) R0.push(["Information", `Société peu suivie : peu ou pas d'analystes, des comptes publiés une ou deux fois par an.${c.year && c.year < y - 1 ? ` Derniers comptes connus : exercice ${c.year}.` : ""} Vérifiez les derniers communiqués avant toute décision.`]);
  else if (c.year && c.year < y - 1) R0.push(["Information", `Derniers comptes connus : exercice ${c.year}. Des chiffres plus récents peuvent exister.`]);
  return R0;
}
// Catalyseurs potentiels : annonces officielles importantes des 90 derniers jours et dates à venir, toujours avec leur source
async function recoCatal(c) {
  const out = [], lim = new Date(Date.now() - 90 * 864e5).toISOString();
  try {
    const j = typeof actuCo === "function" ? await actuCo(c.id) : null;
    (j && j.o || []).filter(a => a.i >= 2 && a.d >= lim && !/^(rachat|capital|initie|agenda)$/.test(a.c)).sort((a, b) => b.i - a.i || b.d.localeCompare(a.d)).slice(0, 2)
      .forEach(a => out.push({ d: a.d.slice(0, 10), t: a.tf && a.tf !== "Information importante" ? a.tf : a.t, u: a.u, s: "Annonce officielle" }));
  } catch (e) { }
  (typeof eventsOf === "function" ? eventsOf(c.id) : []).filter(e => e.date >= TODAY).slice(0, 2).forEach(e => out.push({ d: e.date, t: e.label, u: e.source, s: "À venir" }));
  return out;
}
const recoDate = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
function recoCatalHTML(l) {
  if (!l.length) return `<p class="rc-mut">Aucune annonce importante ni date publiée relevée par le site ces 90 derniers jours.</p>`;
  return `<ul class="rc-cat">${l.map(x => `<li><span>${esc(x.s)} · ${esc(recoDate(x.d))}</span>${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(String(x.t).slice(0, 160))}</a>` : esc(String(x.t).slice(0, 160))}</li>`).join("")}</ul><p class="rc-mut">Des événements à suivre, pas des prévisions : leur effet sur le cours n'est pas connu d'avance.</p>`;
}
function recoFillCatal(root) {
  $$("[data-rc-cat]", root).forEach(async el => { const c = RBY[el.dataset.rcCat]; if (!c || el.dataset.ok) return; el.dataset.ok = "1"; el.innerHTML = recoCatalHTML(await recoCatal(c)); });
}

/* =====================================================================
   Répartitions types et listes par critères  (/repartitions)
   =====================================================================
   Refonte du 29 octobre 2026 (point P0-6 de docs/audit-2026-10.md).
   Avant : un questionnaire établissait un profil, puis la page proposait une répartition et des titres « pour vous ».
   Une proposition adaptée au profil d'une personne peut relever du conseil en investissement (statut CIF, ORIAS) :
   la page ne le fait plus. À la place :
   1. des exemples de répartition, expliqués : à quoi chacun correspond, ce qu'il implique, ses limites.
      Les pourcentages sont fixes et identiques pour tous ; l'effet d'une baisse est un calcul arithmétique sur
      l'exemple, jamais une prévision ;
   2. des listes construites sur des critères que la personne choisit elle-même (catégorie, éligibilité au PEA,
      frais, encours, secteur, région, taille), triées sur un chiffre publié ou calculé, avec sa source.
   Aucune recommandation adressée à la personne, aucun « pour vous », aucune prédiction, aucun profil enregistré.
   Les fonctions de calcul de RECO (profil, placement, choisir) restent dans le module : « placement » sert à dire
   ce que chaque compte accepte, les autres sont gardées pour les tests (tests/t_reco.mjs) et ne sont plus appelées
   par la page. */

function recoEtfAlt(region) { // l'ETF large le moins cher d'une zone (sert aussi à m/outils.js)
  const cat = region === "eu" ? "actions-europe" : "actions-monde";
  return (ETF.list || []).filter(e => e.categorie === cat && e.ter != null && !e.levier && (region !== "eu" || e.pea === true) && (e.encours || 0) >= 100).sort((a, b) => a.ter - b.ter || (b.encours || 0) - (a.encours || 0))[0] || null;
}
// Catégorie incohérente avec le contenu (ex. ETF MSCI EMU, zone euro, rangés dans « pays émergents » dans etf.json) : écarté
function recoEtfSuspect(e) {
  const p1 = e && e.compo && Array.isArray(e.compo.p1) ? e.compo.p1[0] : null;
  return !!e && e.categorie === "actions-emergents" && (RECO.EEE.has(p1) || /\bEMU\b|euro ?stoxx/i.test((e.index || "") + " " + (e.name || "")));
}
const RECO_RISK = ["", "Très faible", "Faible", "Moyen", "Élevé", "Très élevé"];
const recoRisk = r => `<span class="rc-risk rc-r${r}" title="Niveau de risque ${r} sur 5 : ${RECO_RISK[r]}"><i></i><i></i><i></i><i></i><i></i><em>Risque ${r}/5</em></span>`;

/* ---------- 1. Les répartitions données en exemple ----------
   Quatre exemples construits par le site pour montrer, par le calcul, ce que change la part d'actions.
   Ils ne viennent d'aucune recommandation et ne désignent personne. */
const RECO_CLASSES = {
  etf: ["Actions, via des ETF larges", "#111214", 3, "Un ETF large suit des centaines ou des milliers d'entreprises à la fois, avec des frais souvent inférieurs à 0,30 % par an."],
  oblig: ["Obligations, via des ETF d'obligations", "#B9AE97", 2, "Des prêts aux États et aux grandes entreprises. Ils varient moins que les actions, mais leur valeur baisse quand les taux montent."],
  garanti: ["Sans risque de perte en capital", "#D9D3C7", 1, "Livrets réglementés, fonds en euros d'assurance-vie, ou ETF monétaire (risque très faible, sans garantie). L'argent reste disponible, ou presque."],
};
const RECO_EX = [
  { id: "garantie", nom: "Tout sans risque de perte", parts: { garanti: 100 },
    quoi: "Correspond à de l'argent dont on peut avoir besoin à tout moment, ou à un projet à moins de trois ans : apport, travaux, études.",
    lim: "Le rendement est généralement proche de l'inflation, parfois en dessous : le pouvoir d'achat de la somme peut baisser avec le temps." },
  { id: "prudente", nom: "Un quart en actions", parts: { etf: 25, oblig: 25, garanti: 50 },
    quoi: "Une part d'actions faible, pour un horizon de trois à huit ans, ou quand une baisse de valeur passagère gênerait vraiment.",
    lim: "Une part d'actions faible limite autant les baisses que les hausses. Trois lignes à tenir, c'est aussi trois lots de frais à surveiller." },
  { id: "equilibree", nom: "La moitié en actions", parts: { etf: 50, oblig: 20, garanti: 30 },
    quoi: "Un partage souvent cité en exemple dans la pédagogie financière, pour un horizon de huit ans et plus.",
    lim: "La moitié du capital suit les marchés d'actions : les variations se voient sur les relevés, à la hausse comme à la baisse." },
  { id: "dynamique", nom: "Quatre cinquièmes en actions", parts: { etf: 80, oblig: 10, garanti: 10 },
    quoi: "Une part d'actions forte, qui suppose un horizon long (dix ans et plus) et de ne pas avoir besoin de cette somme entre-temps.",
    lim: "Historiquement, les marchés d'actions ont connu des baisses de plus de 40 % suivies de plusieurs années de remontée. Il faut pouvoir attendre sans vendre." },
];
const RECO_ENV = [["pea", "un PEA"], ["cto", "un compte-titres"], ["both", "un PEA et un compte-titres"], ["av", "une assurance-vie"], ["none", "pas encore de compte"]];
const RECO_ST = { env: "pea", type: "etf" };
function recoBaisse(parts) { // arithmétique sur l'exemple : actions −30 %, obligations −5 %, garanti 0 %
  return (parts.etf || 0) * 0.3 + (parts.oblig || 0) * 0.05;
}
function recoExCarte(x) {
  const cl = Object.keys(RECO_CLASSES).filter(k => x.parts[k]);
  return `<article class="rc-ex"><header><h3>${esc(x.nom)}</h3><p class="rc-exb">${cl.map(k => `${x.parts[k]} % ${RECO_CLASSES[k][0].toLowerCase().replace(/,.*/, "")}`).join(" · ")}</p></header>
    <div class="rc-bar" role="img" aria-label="${cl.map(k => `${x.parts[k]} % ${RECO_CLASSES[k][0]}`).join(", ")}">${cl.map(k => `<span style="width:${x.parts[k]}%;background:${RECO_CLASSES[k][1]}" title="${esc(RECO_CLASSES[k][0])} : ${x.parts[k]} %"></span>`).join("")}</div>
    <dl class="rc-exd">
      ${cl.map(k => `<div class="rc-al"><i style="background:${RECO_CLASSES[k][1]}"></i><div><b>${esc(RECO_CLASSES[k][0])}</b><span class="rc-rg">${x.parts[k]} %</span>${recoRisk(RECO_CLASSES[k][2])}<p>${esc(RECO_CLASSES[k][3])}</p><p class="rc-where">${esc(RECO.placement(RECO_ST.env, k))}</p></div></div>`).join("")}
    </dl>
    <p class="rc-exq"><b>À quoi cet exemple correspond</b> ${esc(x.quoi)}</p>
    <p class="rc-exl"><b>Ses limites</b> ${esc(x.lim)}</p>
    <p class="rc-exc">Calcul sur cet exemple : si les actions baissaient de 30 % et les obligations de 5 %, l'ensemble baisserait d'environ <b>${F0.format(Math.round(recoBaisse(x.parts)))} %</b>. C'est une multiplication, pas une prévision : la baisse réelle peut être plus forte ou plus faible.</p>
  </article>`;
}
/* 31/10 (Romain) : le but de la page n'était pas clair. Elle répond maintenant à une seule question, visible d'abord :
   « quelle part en actions, et qu'est-ce que ça change ? ». Un curseur, une barre, deux grands chiffres ; les quatre exemples deviennent des réglages du curseur. */
const RECO_SL = { etf: 50, oblig: 20 };
function recoSlParts() { const a = RECO_SL.etf, o = Math.min(RECO_SL.oblig, 100 - a); return { etf: a, oblig: o, garanti: 100 - a - o }; }
function recoSlDroite() {
  const parts = recoSlParts(), a = parts.etf, baisse = recoBaisse(parts), reste = 1000 - 10 * baisse;
  const ex = RECO_EX.slice().sort((x, y) => Math.abs((x.parts.etf || 0) - a) - Math.abs((y.parts.etf || 0) - a))[0], proche = Math.abs((ex.parts.etf || 0) - a) <= 12;
  const cl = Object.keys(RECO_CLASSES).filter(k => parts[k] > 0);
  return `<div class="rc-bar rc-bar2" role="img" aria-label="${cl.map(k => `${parts[k]} % ${RECO_CLASSES[k][0]}`).join(", ")}">${cl.map(k => `<span style="width:${parts[k]}%;background:${RECO_CLASSES[k][1]}"><i>${parts[k] >= 12 ? parts[k] + " %" : ""}</i></span>`).join("")}</div>
      <div class="rc-leg">${cl.map(k => `<span><i style="background:${RECO_CLASSES[k][1]}"></i>${esc(RECO_CLASSES[k][0].replace(/,.*/, ""))} ${recoRisk(RECO_CLASSES[k][2])}</span>`).join("")}</div>
      <div class="rc-big"><div><small>Si les actions chutaient de 30 % et les obligations de 5 %</small><b class="${baisse >= 15 ? "dn" : ""}">${baisse ? "−" : ""}${F0.format(Math.round(baisse))} %</b><span>sur l'ensemble</span></div><div><small>Sur 1 000 €, il resterait</small><b>${F0.format(Math.round(reste))} €</b><span>une multiplication, pas une prévision</span></div></div>
      ${proche ? `<p class="rc-exq"><b>${esc(ex.nom)}.</b> ${esc(ex.quoi)}</p><p class="rc-exl"><b>Ses limites</b> ${esc(ex.lim)}</p>` : `<p class="rc-exq"><b>Entre deux exemples.</b> Plus la part d'actions est grande, plus les hausses et les baisses se voient sur vos relevés, et plus l'horizon doit être long.</p>`}
      <p class="rc-where2"><b>Où ça se loge, pour ${esc((RECO_ENV.find(e => e[0] === RECO_ST.env) || RECO_ENV[0])[1])}</b> ${cl.map(k => `<span>${esc(RECO_CLASSES[k][0].replace(/,.*/, ""))} : ${esc(RECO.placement(RECO_ST.env, k))}</span>`).join("")}</p>`;
}
function recoSlHTML() {
  const parts = recoSlParts(), a = parts.etf, o = parts.oblig, g = parts.garanti;
  const ex = RECO_EX.slice().sort((x, y) => Math.abs((x.parts.etf || 0) - a) - Math.abs((y.parts.etf || 0) - a))[0], proche = Math.abs((ex.parts.etf || 0) - a) <= 12;
  return `<div class="rc-sl">
    <div class="rc-slc"><label for="rc-sla"><b>Part en actions</b><output id="rc-slao">${a} %</output></label><input type="range" id="rc-sla" min="0" max="100" step="5" value="${a}" aria-label="Part en actions">
      <label for="rc-slo"><b>Part en obligations</b><output id="rc-sloo">${o} %</output></label><input type="range" id="rc-slo" min="0" max="100" step="5" value="${o}" aria-label="Part en obligations"><p class="rc-mut">Le reste, <b id="rc-slg">${g} %</b>, sans risque de perte en capital (livret, fonds en euros, ETF monétaire).</p>
      <div class="rc-slx">${RECO_EX.map(x => `<button type="button" class="rc-chip${x.id === ex.id && proche ? " on" : ""}" data-rc-ex="${x.id}">${esc(x.nom)}</button>`).join("")}</div></div>
    <div class="rc-slv" id="rc-slv">${recoSlDroite()}</div></div>`;
}
function recoSlLier(root) {
  const tout = () => { const b = $("#rc-slw", root); if (b) { b.innerHTML = recoSlHTML(); recoSlLier(root); } };
  const a = $("#rc-sla", root), o = $("#rc-slo", root);
  const vite = () => { // pendant le glissement : seuls les chiffres et la colonne de droite changent, le curseur reste sous le doigt
    const p = recoSlParts(); $("#rc-slao", root).textContent = p.etf + " %"; $("#rc-sloo", root).textContent = p.oblig + " %"; $("#rc-slg", root).textContent = p.garanti + " %";
    if (+o.value !== p.oblig) o.value = p.oblig; $("#rc-slv", root).innerHTML = recoSlDroite();
    const ex = RECO_EX.slice().sort((x, y) => Math.abs((x.parts.etf || 0) - p.etf) - Math.abs((y.parts.etf || 0) - p.etf))[0], proche = Math.abs((ex.parts.etf || 0) - p.etf) <= 12;
    $$("[data-rc-ex]", root).forEach(b => b.classList.toggle("on", proche && b.dataset.rcEx === ex.id));
  };
  if (a) a.oninput = () => { RECO_SL.etf = +a.value; RECO_SL.oblig = Math.min(RECO_SL.oblig, 100 - RECO_SL.etf); vite(); };
  if (o) o.oninput = () => { RECO_SL.oblig = Math.min(+o.value, 100 - RECO_SL.etf); vite(); }; // le curseur des obligations ne bouge jamais seul ; il est seulement borné par ce qui reste
  $$("[data-rc-ex]", root).forEach(b => b.onclick = () => { const x = RECO_EX.find(e => e.id === b.dataset.rcEx); RECO_SL.etf = x.parts.etf || 0; RECO_SL.oblig = x.parts.oblig || 0; tout(); });
}
function recoExHTML() {
  return `<section class="panel"><div class="ph"><h2>Quelle part en actions ? Ce que ça change</h2><span class="light" style="font-size:12.5px">réglez, le site calcule</span></div><div class="pb">
    <p class="rc-mut" style="margin:0 0 12px">Déplacez le curseur : la barre montre la répartition, les deux chiffres montrent ce qu'une forte baisse ferait à l'ensemble. Quatre exemples, du plus prudent au plus exposé, servent de repères. Le site ne désigne pas celui qui vous conviendrait : cela dépend de votre situation complète, qu'il ne connaît pas.</p>
    <label class="rc-lab">Ce que chaque compte accepte, pour <select id="rc-env">${RECO_ENV.map(([k, l]) => `<option value="${k}"${k === RECO_ST.env ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <div id="rc-slw">${recoSlHTML()}</div>
    <p class="rc-mut">Les trois grandes familles de placements et leurs règles (plafonds, impôt en 2026) sont détaillées dans <a class="lnk" href="/pea-cto">PEA, compte-titres ou assurance-vie</a> et dans <a class="lnk" href="/apprendre#academie">l'Académie</a>.</p></div></section>`;
}
function recoExHTML_ancien() {
  return `<section class="panel"><div class="ph"><h2>Des répartitions en exemple</h2><span class="light" style="font-size:12.5px">les mêmes pour tout le monde</span></div><div class="pb">
    <p class="rc-mut" style="margin:0 0 12px">Quatre exemples, du plus prudent au plus exposé, pour montrer ce que change la part d'actions. Le site ne désigne pas celui qui vous conviendrait : cela dépend de votre situation complète, qu'il ne connaît pas.</p>
    <label class="rc-lab">Ce que chaque compte accepte, pour <select id="rc-env">${RECO_ENV.map(([k, l]) => `<option value="${k}"${k === RECO_ST.env ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="rc-exs" id="rc-exs">${RECO_EX.map(recoExCarte).join("")}</div>
    <p class="rc-mut">Les trois grandes familles de placements et leurs règles (plafonds, impôt en 2026) sont détaillées dans <a class="lnk" href="/pea-cto">PEA, compte-titres ou assurance-vie</a> et dans <a class="lnk" href="/apprendre#academie">l'Académie</a>.</p></div></section>`;
}

/* ---------- 2. Listes par critères ---------- */
const RECO_TRI_ETF = [["ter", "Frais les plus bas"], ["encours", "Encours le plus élevé"], ["lignes", "Le plus de lignes détenues"], ["nom", "Nom"]];
const RECO_TRI_ENT = [["q", "Le plus de points forts mesurés"], ["g1", "Croissance des ventes la plus forte"], ["marge", "Marge d'exploitation la plus élevée"], ["yld", "Rendement du dividende le plus élevé"], ["dette", "Dette la plus faible"], ["taille", "Ventes les plus élevées"]];
const RECO_TAILLES = [["", "toutes tailles"], ["large", "grandes capitalisations"], ["mid", "moyennes"], ["small", "petites"], ["micro", "microcapitalisations"]];
function recoFiltresHTML() {
  const t = RECO_ST.type;
  const sel = (id, l, opts, v) => `<label class="rc-sel"><span>${l}</span><select id="${id}">${opts.map(([k, x]) => `<option value="${k}"${String(k) === String(v) ? " selected" : ""}>${x}</option>`).join("")}</select></label>`;
  const secs = Object.entries(R.sectors || {}).map(([k, v]) => [k, v]).sort((a, b) => a[1].localeCompare(b[1]));
  const regs = Object.entries(R.regions || {}).map(([k, v]) => [k, typeof v === "string" ? v : v.name || k]);
  return `<div class="rc-tabs" role="tablist" aria-label="Type de liste">${[["etf", "Des ETF"], ["ent", "Des entreprises"]].map(([k, l]) => `<button type="button" role="tab" data-rc-type="${k}" aria-selected="${k === t}" class="${k === t ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="rc-filt" id="rc-filt">${t === "etf"
      ? sel("f-cat", "Catégorie", [["", "toutes"], ...Object.entries(ECAT)], RECO_ST.cat || "")
        + sel("f-pea", "Éligibilité au PEA", [["", "peu importe"], ["oui", "éligible au PEA"], ["non", "non éligible"]], RECO_ST.pea || "")
        + sel("f-ter", "Frais annuels", [["", "peu importe"], ["0.15", "0,15 % au plus"], ["0.25", "0,25 % au plus"], ["0.5", "0,50 % au plus"]], RECO_ST.ter || "")
        + sel("f-enc", "Encours", [["", "peu importe"], ["100", "100 M€ au moins"], ["1000", "1 Md€ au moins"]], RECO_ST.enc || "")
        + sel("f-dist", "Dividendes du fonds", [["", "peu importe"], ["capi", "réinvestis (capitalisant)"], ["dist", "versés (distribuant)"]], RECO_ST.dist || "")
        + sel("f-tri", "Trier par", RECO_TRI_ETF, RECO_ST.tri || "ter")
      : sel("f-sect", "Secteur", [["", "tous"], ...secs], RECO_ST.sect || "")
        + sel("f-reg", "Région", [["", "toutes"], ...regs], RECO_ST.reg || "")
        + sel("f-taille", "Taille", RECO_TAILLES, RECO_ST.taille || "")
        + sel("f-pea", "Éligibilité au PEA", [["", "peu importe"], ["oui", "éligible au PEA"], ["non", "non éligible"]], RECO_ST.pea || "")
        + sel("f-tri", "Trier par", RECO_TRI_ENT, RECO_ST.tri || "q")}</div>`;
}
function recoEtfListe() {
  const S = RECO_ST, terMax = S.ter ? +S.ter : null, encMin = S.enc ? +S.enc : null;
  let L = (ETF.list || []).filter(e => {
    if (S.cat && e.categorie !== S.cat) return false;
    if (S.pea === "oui" && e.pea !== true) return false;
    if (S.pea === "non" && e.pea === true) return false;
    if (terMax != null && !(e.ter != null && e.ter <= terMax)) return false;
    if (encMin != null && !((e.encours || 0) >= encMin)) return false;
    if (S.dist === "capi" && !/capi/i.test(e.distribution || "")) return false;
    if (S.dist === "dist" && !/dist/i.test(e.distribution || "")) return false;
    return !recoEtfSuspect(e);
  });
  const tri = S.tri || "ter";
  L.sort(tri === "encours" ? (a, b) => (b.encours || 0) - (a.encours || 0)
    : tri === "lignes" ? (a, b) => ((b.compo || {}).n || 0) - ((a.compo || {}).n || 0)
    : tri === "nom" ? (a, b) => a.name.localeCompare(b.name)
    : (a, b) => (a.ter == null ? 99 : a.ter) - (b.ter == null ? 99 : b.ter) || (b.encours || 0) - (a.encours || 0));
  return L;
}
function recoEtfLigne(e) {
  const C = e.compo || {}, pe = RECO.peaEtf(e);
  const faits = [e.ter != null ? `Frais ${pct(e.ter / 100, 2, false)} par an` : null, e.encours ? `Encours ${F0.format(e.encours)} M€` : null,
    C.n ? `${F0.format(C.n)} lignes, les 10 premières font ${F0.format(C.t10 || 0)} %` : null,
    pe.expo ? `${F0.format(pe.expo.pct)} % ${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)}` : null,
    [e.replication, e.distribution].filter(Boolean).join(" · ") || null].filter(Boolean);
  return `<a class="rc-row" href="/etf/${esc(e.id)}"><span class="rc-ico2">ETF</span><span class="rc-rh"><b>${esc(e.name)}</b><small>${esc([e.issuer, ECAT[e.categorie] || e.categorie, e.index].filter(Boolean).join(" · "))}</small></span>
    <span class="rc-rt">${recoRisk(RECO.risqueEtf(e))}${recoEtfPeaTag(e)}</span>
    <span class="rc-rf">${faits.map(f => `<em>${f}</em>`).join("")}</span></a>`;
}
function recoEntListe() {
  const S = RECO_ST, out = [];
  for (const c of R.companies || []) {
    if (c.missing || !c.desc) continue;
    if (S.sect && c.sector !== S.sect) continue;
    if (S.reg && c.region !== S.reg) continue;
    const pea = recoPeaOk(c);
    if (S.pea === "oui" && pea !== true) continue;
    if (S.pea === "non" && pea === true) continue;
    const T = recoTaille(c);
    if (S.taille && (!T || T.t !== S.taille)) continue;
    const m = ratios(c), v = valo(c), q = typeof quick === "function" ? quick(c) : null;
    out.push({ c, T, m, v, q, risk: RECO.risqueAction({ taille: T && T.t, perte: !(c.net > 0), levier: typeof isBank === "function" && isBank(c) ? null : m.lev, amp: recoAmp(c) }) });
  }
  const n = x => x == null || !isFinite(x) ? -Infinity : x;
  const tri = RECO_ST.tri || "q";
  out.sort(tri === "g1" ? (a, b) => n(b.m.g1) - n(a.m.g1)
    : tri === "marge" ? (a, b) => n(b.m.marge) - n(a.m.marge)
    : tri === "yld" ? (a, b) => n(b.v && b.v.yld) - n(a.v && a.v.yld)
    : tri === "dette" ? (a, b) => (a.m.lev == null ? Infinity : a.m.lev) - (b.m.lev == null ? Infinity : b.m.lev)
    : tri === "taille" ? (a, b) => n(typeof eurM === "function" ? eurM(b.c.ca, b.c.currency) : b.c.ca) - n(typeof eurM === "function" ? eurM(a.c.ca, a.c.currency) : a.c.ca)
    : (a, b) => ((b.q ? b.q.fort - b.q.vig : -9)) - ((a.q ? a.q.fort - a.q.vig : -9)));
  return out;
}
function recoEntLigne(x) {
  const c = x.c, m = x.m, v = x.v;
  const faits = [c.ca ? `Ventes ${big(c.ca, c.currency)}` : null, m.marge != null ? `Marge d'exploitation ${pct(m.marge, 1, false)}` : null,
    m.g1 != null ? `Ventes ${m.g1 >= 0 ? "en hausse de" : "en baisse de"} ${pct(Math.abs(m.g1), 1, false)} sur un an` : null,
    v && v.pe != null ? `PER ${F1.format(v.pe)}` : null, v && v.yld != null ? `Rendement ${pct(v.yld, 1, false)}` : null,
    c.year ? `Exercice ${c.year}` : null].filter(Boolean);
  return `<a class="rc-row" href="/entreprise/${esc(c.id)}">${logo(c, 30)}<span class="rc-rh"><b>${esc(c.name)}</b><small>${esc([secName(c), typeof regName === "function" ? regName(c) : "", x.T ? RECO_TAILLE[x.T.t] : ""].filter(Boolean).join(" · "))}</small></span>
    <span class="rc-rt">${recoRisk(x.risk)}${recoPeaTag(c)}</span>
    <span class="rc-rf">${faits.map(f => `<em>${f}</em>`).join("")}</span></a>`;
}
function recoListeHTML() {
  const etf = RECO_ST.type === "etf";
  const L = etf ? recoEtfListe() : recoEntListe(), vus = L.slice(0, 12);
  const lien = etf ? "/etf" : "/entreprises" + (RECO_ST.sect ? "?secteur=" + RECO_ST.sect : "");
  if (!L.length) return `<p class="rc-mut">Aucun ${etf ? "ETF" : "titre"} suivi par le site ne réunit ces critères. Élargissez-en un.</p>`;
  return `<p class="rc-cnt2"><b>${F0.format(L.length)}</b> ${etf ? (L.length > 1 ? "ETF réunissent" : "ETF réunit") : (L.length > 1 ? "entreprises réunissent" : "entreprise réunit")} ces critères${L.length > 12 ? `, les 12 premiers du tri sont affichés` : ""}.</p>
    <div class="rc-rows">${vus.map(etf ? recoEtfLigne : recoEntLigne).join("")}</div>
    <p class="rc-mut">Liste calculée sur les données du site : ${etf ? "fiches des émetteurs d'ETF (frais, encours, composition, éligibilité au PEA déclarée)" : "comptes annuels publiés (ESEF en Europe, SEC aux États-Unis) et cours différés du site"}. Un chiffre élevé n'est pas une bonne nouvelle en soi, un chiffre bas n'est pas une mauvaise nouvelle : la fiche donne le détail et la médiane du secteur. <a class="lnk" href="${lien}">La liste complète et tous les filtres</a></p>`;
}
const RECO_LEGAL = `<div class="rc-legal"><b>Information factuelle à but pédagogique, pas un conseil en investissement.</b> Cette page ne tient pas compte de votre situation et ne désigne aucune répartition ni aucun titre comme adapté à qui que ce soit : elle montre des exemples et des listes triées sur des critères que vous choisissez. bilan. n'est pas conseiller en investissements financiers (CIF). Pour un conseil adapté à votre situation, adressez-vous à un CIF immatriculé à l'<a href="https://www.orias.fr" target="_blank" rel="noopener">ORIAS</a>. Investir en Bourse comporte un risque de perte en capital.</div>`;

/* ---------- La page ---------- */
async function pageRepartitions() {
  setTitle("Répartitions types et listes par critères"); setNav("sim"); recoCSS();
  if (!R) return;
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([PXP, recoDivLoad()]);
  if (location.pathname !== "/repartitions") return;
  app.innerHTML = `<div class="rc-page"><div class="crumbs"><a href="/outils">Outils</a> › Répartitions et listes</div>
    <h1 class="pagetitle">Quelle part en actions ? Et quelles listes selon vos critères</h1>
    <p class="pagesub">Des exemples de répartition expliqués, et des listes d'ETF et d'entreprises construites sur les critères que vous choisissez. Le site n'établit pas de profil et ne désigne rien comme adapté à votre situation.</p>
    ${RECO_LEGAL}
    <div id="rc-ex">${recoExHTML()}</div>
    <section class="panel" id="listes"><div class="ph"><h2>Une liste à partir de vos critères</h2><span class="light" style="font-size:12.5px">vous choisissez, le site calcule</span></div><div class="pb">
      <div id="rc-f">${recoFiltresHTML()}</div><div id="rc-l">${recoListeHTML()}</div></div></section>
    <section class="panel"><details class="acc"><summary><b>Comment ces listes sont calculées</b><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 16px">
      <p><b>Niveau de risque (1 à 5).</b> Il vient de la nature du placement, pas d'un jugement : ETF monétaire 1, obligations 2, ETF d'actions larges 3, pays émergents, thématiques et pays unique 4, matières premières 5. Une action seule vaut au moins 3 : 3 pour une grande ou moyenne entreprise, 4 pour une petite, 5 pour une microcapitalisation, un point de plus en cas de perte, de dette lourde ou de cours très variable.</p>
      <p><b>Éligibilité au PEA.</b> Pour une action : siège dans l'Union européenne ou l'EEE (pays du code ISIN, recoupé avec Wikidata) et société soumise à l'impôt sur les sociétés ; les foncières exonérées (SIIC, SIR, SOCIMI, REIT) sont exclues. Pour un ETF : l'éligibilité déclarée par l'émetteur, qui ne dit rien de ce que le fonds suit. Votre courtier fait foi au moment de l'achat.</p>
      <p><b>Chiffres des entreprises.</b> Ventes, marge, croissance et dette viennent du dernier exercice publié ; le PER et le rendement rapportent un cours du jour (différé) à un résultat déjà clos. Les deux ne portent donc pas sur la même période.</p>
      <p><b>Exemples de répartition.</b> Les pourcentages sont fixes, identiques pour tous, et choisis pour échelonner la part d'actions de 0 à 80 %. L'effet d'une baisse est une multiplication sur l'exemple (actions −30 %, obligations −5 %), pas une prévision.</p>
      <p class="rc-mut">Sources : comptes annuels ESEF (Europe) et SEC (États-Unis), cours différés du site, fiches des émetteurs d'ETF, Wikidata (CC0). Les performances passées ne préjugent pas des performances futures.</p></div></details></section></div>`;
  recoLier();
}
function recoLier() {
  const maj = () => { const l = $("#rc-l"); if (l) l.innerHTML = recoListeHTML(); };
  const f = $("#rc-f");
  if (f) f.addEventListener("change", e => {
    const id = e.target.id;
    if (id === "f-cat") RECO_ST.cat = e.target.value;
    else if (id === "f-pea") RECO_ST.pea = e.target.value;
    else if (id === "f-ter") RECO_ST.ter = e.target.value;
    else if (id === "f-enc") RECO_ST.enc = e.target.value;
    else if (id === "f-dist") RECO_ST.dist = e.target.value;
    else if (id === "f-sect") RECO_ST.sect = e.target.value;
    else if (id === "f-reg") RECO_ST.reg = e.target.value;
    else if (id === "f-taille") RECO_ST.taille = e.target.value;
    else if (id === "f-tri") RECO_ST.tri = e.target.value;
    maj();
  });
  if (f) f.addEventListener("click", e => {
    const b = e.target.closest("[data-rc-type]"); if (!b || b.dataset.rcType === RECO_ST.type) return;
    RECO_ST.type = b.dataset.rcType; RECO_ST.tri = RECO_ST.type === "etf" ? "ter" : "q";
    f.innerHTML = recoFiltresHTML(); maj();
  });
  const env = $("#rc-env");
  if (env) env.onchange = () => { RECO_ST.env = env.value; const x = $("#rc-slw"); if (x) { x.innerHTML = recoSlHTML(); recoSlLier(document); } };
  recoSlLier(document);
}

/* ---------- Routes, menu ---------- */
if (typeof ROUTES_EXTRA !== "undefined") {
  ROUTES_EXTRA.push([/^\/repartitions$/, () => pageRepartitions()]);
  ROUTES_EXTRA.push([/^\/pour-moi$/, () => { history.replaceState({}, "", "/repartitions" + location.search); return pageRepartitions(); }]); // ancienne adresse
}
if (typeof OUTILS !== "undefined" && Array.isArray(OUTILS)) {
  const i = OUTILS.findIndex(o => o[0] === "/pour-moi"); if (i >= 0) OUTILS.splice(i, 1);
  if (!OUTILS.some(o => o[0] === "/repartitions")) OUTILS.push(["/repartitions", "Répartitions types et listes par critères", "Des exemples de répartition expliqués, et des listes d'ETF et d'entreprises triées sur les critères que vous choisissez."]);
}
if (typeof document !== "undefined" && document.querySelector) recoDivLoad();

let RECO_CSS = false;
document.head.insertAdjacentHTML("beforeend", `<style>
.rc-sl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:20px 36px;align-items:start}.rc-slc label{display:flex;justify-content:space-between;align-items:baseline;margin:10px 0 4px}.rc-slc label:first-child{margin-top:0}.rc-slc output{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums}.rc-slc input[type=range]{width:100%;accent-color:#111214}
.rc-slx{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.rc-chip{border:1px solid var(--rule);background:#fff;border-radius:999px;padding:7px 12px;font:500 13px var(--sans);cursor:pointer;color:var(--ink)}.rc-chip.on{background:#111214;color:#fff;border-color:#111214}
.rc-bar2{height:28px!important;display:flex!important;gap:2px;border-radius:6px;overflow:hidden}.rc-bar2 span{display:flex!important;align-items:center;justify-content:center;float:none!important;height:100%}.rc-bar2 i{font-style:normal;font-size:12px;color:#fff;mix-blend-mode:difference;font-variant-numeric:tabular-nums}
.rc-leg{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 0 16px;font-size:13px;color:var(--grey)}.rc-leg span{display:inline-flex;align-items:center;gap:6px}.rc-leg i{width:10px;height:10px;border-radius:2px}
.rc-big{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}.rc-big>div{padding:14px 16px;border:1px solid var(--rule);border-radius:8px;background:#fff}.rc-big small{display:block;font-size:12.5px;color:var(--grey);min-height:2.6em}.rc-big b{display:block;font-size:34px;line-height:1.1;font-variant-numeric:tabular-nums;margin:4px 0 2px}.rc-big b.dn{color:var(--down)}.rc-big span{font-size:12.5px;color:var(--grey)}
.rc-where2{font-size:13px;color:var(--grey);margin:10px 0 0}.rc-where2 b{display:block;color:var(--ink);margin-bottom:4px}.rc-where2 span{display:block}
@media (max-width:760px){.rc-sl{grid-template-columns:minmax(0,1fr)}.rc-big b{font-size:28px}}
</style>`);
function recoCSS() {
  if (RECO_CSS || typeof document === "undefined") return; RECO_CSS = true;
  document.head.insertAdjacentHTML("beforeend", `<style id="rc-css">
.rc-page>.panel,.rc-page>#rc-ex>.panel{margin-top:16px}
.rc-legal{margin-top:14px;background:#F3EFE6;border-radius:12px;padding:11px 14px;font-size:13px;line-height:1.5;color:#4A4336}.rc-legal b{color:var(--ink)}.rc-legal a{color:var(--link)}
.rc-mut{color:var(--grey);font-size:13px;line-height:1.5;margin:6px 0 0}
.rc-prog{height:6px;border-radius:99px;background:var(--soft);overflow:hidden;margin:0 0 14px}.rc-prog span{display:block;height:100%;background:var(--ink);border-radius:99px;transition:width .2s}
.rc-grp{margin-top:6px}.rc-gt{display:flex;align-items:center;gap:8px;font:600 15px var(--sans);margin:14px 0 8px}.rc-gt span{width:24px;height:24px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:12.5px}
.rc-q{border:1px solid var(--rule);border-radius:12px;padding:10px 14px 12px;margin:0 0 8px;min-width:0}.rc-q.ok{border-color:#CFE5D7;background:#FAFCFA}
.rc-q legend{font-weight:600;font-size:14.5px;padding:0;float:left;width:100%;margin-bottom:8px}.rc-q legend small{display:block;font-weight:400;color:var(--grey);font-size:12.5px;margin-top:2px}
.rc-opts{display:flex;flex-wrap:wrap;gap:6px;clear:both}.rc-opts label{cursor:pointer;position:relative;max-width:100%}.rc-opts input{position:absolute;opacity:0;pointer-events:none}
.rc-opts span{display:inline-block;border:1px solid var(--rule);border-radius:999px;padding:7px 13px;font-size:13.5px;background:#fff;line-height:1.3}
.rc-opts input:checked+span{background:var(--ink);color:#fff;border-color:var(--ink)}.rc-opts input:focus-visible+span{outline:2px solid var(--link);outline-offset:2px}
.rc-sum{display:flex;flex-wrap:wrap;gap:6px}.rc-sum span{font-size:12.5px;background:var(--soft);border-radius:999px;padding:4px 10px;color:var(--ink)}
.rc-wait{display:flex;flex-direction:column;gap:6px;align-items:flex-start}.rc-wait span{color:var(--grey);font-size:13.5px}.rc-wait .btn{margin-top:4px}
.rc-verdict .rc-vh{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}.rc-verdict h2{font:700 26px var(--serif);margin:2px 0 4px}.rc-vs{margin:0;font-size:15px}
.rc-gauge{display:flex;gap:4px;align-items:center;flex-wrap:wrap;max-width:170px}.rc-gauge span{width:30px;height:10px;border-radius:3px;background:var(--soft)}.rc-gauge span.on{background:var(--ink)}.rc-gauge small{width:100%;text-align:right;color:var(--grey);font-size:12px}
.rc-gauge.sm span{width:18px;height:7px}
.rc-pre{background:#FFF6EC;border-radius:10px;padding:9px 12px;font-size:13.5px;color:#7A4B12;margin:12px 0 0}
.rc-bar{display:flex;height:14px;border-radius:7px;overflow:hidden;margin:2px 0 14px;gap:2px}.rc-bar span{display:block;height:100%}
.rc-alloc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px}
.rc-al{display:flex;gap:10px;align-items:flex-start;border-top:1px solid var(--rule);padding-top:10px;min-width:0}.rc-al>i{width:12px;height:12px;border-radius:3px;flex:none;margin-top:4px}.rc-al>div{min-width:0}
.rc-al b{font-size:14.5px;margin-right:8px}.rc-rg{font:700 15px var(--mono,monospace);margin-right:8px;white-space:nowrap}.rc-al p{margin:4px 0 0;font-size:13px;color:var(--grey);line-height:1.45}.rc-al .rc-where{color:var(--ink)}
.rc-risk{display:inline-flex;align-items:center;gap:2px;vertical-align:middle;cursor:help}.rc-risk i{width:6px;height:10px;border-radius:2px;background:var(--rule)}.rc-risk em{font-style:normal;font-size:11.5px;color:var(--grey);margin-left:5px;white-space:nowrap}
.rc-r1 i:nth-child(-n+1),.rc-r2 i:nth-child(-n+2){background:#0E6B4A}.rc-r3 i:nth-child(-n+3){background:#8A6D1E}.rc-r4 i:nth-child(-n+4),.rc-r5 i:nth-child(-n+5){background:#C8452A}
.rc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.rc-card{border:1px solid var(--rule);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;background:#fff;min-width:0}
.rc-card header{display:flex;gap:10px;align-items:center;min-width:0}.rc-ht{display:flex;flex-direction:column;min-width:0}.rc-ht a{color:var(--ink);text-decoration:none}.rc-ht a:hover{text-decoration:underline}.rc-ht b{font:700 16px var(--serif)}.rc-ht small{font-size:12.5px;color:var(--grey);line-height:1.35}
.rc-ico{flex:none;width:36px;height:36px;border-radius:10px;background:var(--soft);display:grid;place-items:center;font:700 11.5px var(--sans);color:var(--grey)}
.rc-tags{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.rc-pea{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.03em;padding:2px 7px;border-radius:5px;cursor:help;white-space:nowrap}
.rc-pea-ok{background:#E3F2E9;color:#0F6B3E}.rc-pea-non{background:var(--soft);color:var(--grey)}.rc-pea-av{background:#FFF1D6;color:#7A5410}
.rc-st{font-size:11.5px;font-weight:600;border:1px solid var(--rule);border-radius:999px;padding:1px 8px;color:var(--grey)}
.rc-desc{margin:0;font-size:13.5px;color:var(--grey);line-height:1.45}
.rc-why{margin:0;background:#EEF6F0;border-radius:10px;padding:8px 12px;font-size:13.5px;line-height:1.45}.rc-why>b{display:block;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#0F6B3E;margin-bottom:2px}
.rc-warn{display:block;color:#7A4B12;margin-top:4px}
.rc-facts{margin:0;padding-left:16px;font-size:13.5px;line-height:1.5}
.rc-det{border-top:1px solid var(--rule);padding-top:6px}.rc-det summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--link);list-style:none}.rc-det summary::-webkit-details-marker{display:none}.rc-det summary::after{content:" +"}.rc-det[open] summary::after{content:" −"}
.rc-det>div p{font-size:13.5px;line-height:1.5;margin:8px 0 0}.rc-det>div p b{margin-right:4px}
.rc-rk{margin:6px 0 0;padding-left:16px;font-size:13px;line-height:1.5}.rc-rk li{margin:3px 0}
.rc-cat{list-style:none;margin:4px 0 0;padding:0;font-size:13px}.rc-cat li{display:flex;flex-direction:column;gap:1px;padding:5px 0;border-top:1px solid var(--soft)}.rc-cat li span{font-size:11.5px;color:var(--grey)}.rc-cat a{color:var(--link);overflow-wrap:anywhere}
.rc-fb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:auto;padding-top:8px;border-top:1px solid var(--soft)}.rc-fb>span{font-size:12px;color:var(--grey);width:100%}
.rc-fb button{font:inherit;font-size:12.5px;border:1px solid var(--rule);background:#fff;border-radius:999px;padding:5px 10px;cursor:pointer;color:var(--ink)}.rc-fb button:hover{border-color:var(--ink)}
.rc-fb button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.rc-vig{list-style:none;margin:0;padding:0}.rc-vig li{display:flex;flex-direction:column;gap:2px;padding:9px 0 9px 16px;border-top:1px solid var(--rule);position:relative;font-size:14px}.rc-vig li:first-child{border-top:0}
.rc-vig li::before{content:"";position:absolute;left:0;top:15px;width:8px;height:8px;border-radius:50%;background:#8A6D1E}.rc-vig li.vig::before{background:#C8452A}.rc-vig li.fort::before{background:#0E6B4A}.rc-vig span{color:var(--grey);font-size:13px;line-height:1.45}
.rc-mini .rc-mh{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.rc-mini .rc-mh>div{display:flex;flex-direction:column}.rc-mini .rc-mh b{font:700 17px var(--serif)}.rc-mini .rc-mh .rc-mut{margin:0;font-size:12px}
.rc-ml{list-style:none;margin:10px 0 0;padding:0}.rc-ml li{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--rule)}.rc-ml a{display:flex;flex-direction:column;min-width:0;color:var(--ink);text-decoration:none}.rc-ml a b{font-size:14.5px}.rc-ml small{font-size:12px;color:var(--grey)}
.rc-mini .btn{margin-top:10px}.rc-mini p{margin:0 0 8px;font-size:14px;line-height:1.5}

/* Répartitions en exemple et listes par critères (refonte du 29/10/2026) */
.rc-lab{display:block;font-size:13.5px;color:var(--grey);margin:0 0 14px}
.rc-lab select{font:inherit;font-size:14px;color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:6px 8px;background:#fff;margin-left:4px;min-height:36px}
.rc-exs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.rc-ex{border:1px solid var(--rule);border-radius:14px;padding:16px 18px;background:#fff;min-width:0;display:flex;flex-direction:column}
.rc-ex h3{font:700 19px var(--serif);margin:0}
.rc-exb{margin:3px 0 10px;font-size:12.5px;color:var(--grey);line-height:1.4}
.rc-exd{margin:0 0 12px}
.rc-exq,.rc-exl{margin:0 0 8px;font-size:13.5px;line-height:1.5}
.rc-exq>b,.rc-exl>b{display:block;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--grey);margin-bottom:2px}
.rc-exc{margin:auto 0 0;background:var(--soft);border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.5}
.rc-tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}
.rc-tabs button{font:600 14px inherit;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:8px 16px;min-height:40px;cursor:pointer}
.rc-tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.rc-filt{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:flex-end;margin:0 0 16px}
.rc-filt .rc-sel span{font-size:12.5px;color:var(--grey)}
.rc-filt select{min-height:38px}
.rc-cnt2{margin:0 0 10px;font-size:13.5px;color:var(--grey)}.rc-cnt2 b{color:var(--ink);font-family:var(--mono,monospace)}
.rc-rows{display:flex;flex-direction:column}
.rc-row{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1.25fr);gap:4px 14px;align-items:center;padding:12px 10px;margin:0 -10px;border-top:1px solid var(--rule);border-radius:10px;color:var(--ink);text-decoration:none;min-height:60px}
.rc-row:first-child{border-top:0}.rc-row:hover{background:var(--soft)}
.rc-row>.lg,.rc-ico2{grid-column:1;grid-row:1 / span 2;align-self:center;flex:none}
.rc-ico2{width:34px;height:34px;border-radius:9px;background:var(--soft);display:grid;place-items:center;font:700 11px var(--sans);color:var(--grey)}
.rc-rh{grid-column:2;grid-row:1}.rc-rt{grid-column:2;grid-row:2}.rc-rf{grid-column:3;grid-row:1 / span 2}
.rc-rh{display:flex;flex-direction:column;min-width:0}.rc-rh b{font-size:14.5px;font-weight:600}.rc-rh small{font-size:12.5px;color:var(--grey);line-height:1.35}
.rc-rt{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.rc-rf{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:12.5px;color:var(--grey)}.rc-rf em{font-style:normal;white-space:nowrap}
@media (max-width:980px){.rc-exs{grid-template-columns:1fr}.rc-row{grid-template-columns:auto minmax(0,1fr);row-gap:6px}.rc-row .rc-rt{grid-column:2;grid-row:2}.rc-row .rc-rf{grid-column:1 / -1;grid-row:3}}
@media (max-width:720px){.rc-alloc{grid-template-columns:1fr}.rc-verdict h2{font-size:22px}.rc-grid{grid-template-columns:1fr}.rc-gauge small{text-align:left}.rc-ml li .rc-risk em{display:none}}
</style>`);
}
