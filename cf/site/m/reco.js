/* Module « reco » d'ENKLAIR : chargé après m/parcours.js et avant m/orchestre.js.
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
   investissement (MIF 2), et ENKLAIR n'est pas conseiller en investissements financiers (CIF).
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
  if (!recoFr()) return "";
  const p = recoPeaInfo(c), t = p.ok === true ? ["ok", "Éligible PEA"] : p.ok === false ? ["non", "Hors PEA"] : ["av", "PEA à vérifier"];
  return `<span class="rc-pea rc-pea-${t[0]}" title="${esc(p.why)}">${t[1]}</span>`;
}
function recoEtfPeaTag(e) {
  if (!recoFr()) return "";
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
const recoFr = () => typeof frSeul === "function" ? frSeul() : true; // 3/11 : PEA seulement pour un visiteur en France (m/pays.js)
/* 31/10 (Romain) : le but de la page n'était pas clair. Elle répond maintenant à une seule question, visible d'abord :
   « quelle part en actions, et qu'est-ce que ça change ? ». Un curseur, une barre, deux grands chiffres ; les quatre exemples deviennent des réglages du curseur. */

/* ---------- 2. Listes par critères ---------- */

/* ---------- La page ---------- */


if (typeof document !== "undefined" && document.querySelector) recoDivLoad();

let RECO_CSS = false;
/* styles : voir site.css */
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
