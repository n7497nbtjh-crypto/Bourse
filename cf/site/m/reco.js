/* Module « reco » de bilan. : chargé après m/parcours.js et avant m/orchestre.js.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   Contenu :
   1. RECO : calculs purs, sans navigateur (testés par tests/t_reco.mjs) :
      - éligibilité au PEA d'une action (règle documentée ci-dessous) et d'un ETF (champ « pea » fourni par l'émetteur) ;
      - profil d'investisseur à partir du questionnaire (5 questions de /commencer + 6 questions de /pour-moi) ;
      - allocation indicative par classe d'actifs, en fourchettes arrondies à 5 points ;
      - niveau de risque d'une piste (1 à 5), modèle des retours (« pertinente », « trop risquée », « redondante », « inadaptée »)
        et choix des pistes qui en tient compte.
   2. Navigateur : peaOk() du site s'appuie sur RECO.peaAction (une seule règle partout), page /pour-moi,
      recoCompactHTML() pour l'accueil et Mon espace (recoAccueilHTML, recoEspaceHTML), enregistrement des réponses
      et des retours sur l'appareil (bilan.profil, bilan.reco.retours) et dans le compte (POST /api/espace/reco).

   Cadre : contenu pédagogique et informatif. Ce n'est pas un conseil en investissement personnalisé au sens de la
   réglementation (MIF 2) : bilan. n'est pas conseiller en investissements financiers (CIF). Aucun chiffre n'est inventé :
   tout vient des comptes publiés (ESEF/SEC), des cours du site, des fiches des émetteurs d'ETF et des réponses données. */

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

/* ---------- Réponses et retours : sur l'appareil, et dans le compte si vous êtes connecté ---------- */
const RECO_KP = "bilan.profil", RECO_KR = "bilan.reco.retours";
const recoLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
const recoSrv = () => (typeof MOI !== "undefined" && MOI && MOI.connecte && MOI.donnees && MOI.donnees.profil && typeof MOI.donnees.profil === "object") ? MOI.donnees.profil : {};
function recoAns() { // réponses de l'appareil, complétées par celles du compte
  const loc = recoLS(RECO_KP, {}), srv = recoSrv(), a = {};
  RECO.IDS.forEach(k => { const v = Number.isInteger(loc[k]) ? loc[k] : Number.isInteger(srv[k]) ? srv[k] : null; if (v != null) a[k] = v; });
  return a;
}
function recoRetours() {
  const m = new Map(); [...((recoSrv().reco || {}).retours || []), ...recoLS(RECO_KR, [])].forEach(r => { if (r && r.id && (!m.has(r.id) || (r.at || 0) >= (m.get(r.id).at || 0))) m.set(r.id, r); });
  return [...m.values()].filter(r => r.v).sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-100);
}
let RECO_PT = null;
function recoSave(ans, retours) {
  try { if (ans) localStorage.setItem(RECO_KP, JSON.stringify({ ...recoLS(RECO_KP, {}), ...ans })); if (retours) localStorage.setItem(RECO_KR, JSON.stringify(retours)); } catch (e) { }
  if (typeof connecte !== "function" || !connecte()) return;
  const body = { reponses: recoAns(), retours: retours || recoRetours() };
  if (MOI.donnees) MOI.donnees.profil = { ...recoSrv(), ...body.reponses, reco: { retours: body.retours } };
  clearTimeout(RECO_PT);
  RECO_PT = setTimeout(() => fetch("/api/espace/reco", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => { }), 600);
}
// Un avis retiré est gardé avec v: null (horodaté) pour l'emporter sur l'ancien avis enregistré dans le compte
function recoRetour(p, v) {
  const all = new Map(); [...((recoSrv().reco || {}).retours || []), ...recoLS(RECO_KR, [])].forEach(r => { if (r && r.id && (!all.has(r.id) || (r.at || 0) >= (all.get(r.id).at || 0))) all.set(r.id, r); });
  all.set(p.id, { id: p.id, v: v || null, kind: p.kind, tags: p.tags || [], risk: p.risk, at: Date.now() });
  const l = [...all.values()].sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-100);
  recoSave(null, l);
}

/* ---------- Contexte : portefeuille du site, historique des comptes ---------- */
async function recoCtx() {
  await Promise.all([PXP, recoDivLoad(), typeof outHist === "function" ? outHist() : null]);
  if (typeof outStats === "function") outStats();
  const P = typeof pf2Load === "function" ? pf2Load() : { l: [] }, held = new Set();
  let R0 = null, X = null;
  P.l.forEach(l => { if (l.k) held.add(l.k); });
  if (P.l.length && typeof pf3Rows === "function") { try { R0 = pf3Rows(P); X = R0.T.tot > 0 ? await pf3Look(R0.rows) : null; } catch (e) { R0 = X = null; } }
  return { P, R0, X, held };
}
const RECO_SECK = { it: "tech", fin: "finance", sante: "sante", conso_disc: "conso", conso_base: "conso", indus: "industrie", comm: "telecom", energie: "energie", materiaux: "materiaux", services_pub: "services", immo: "immo" };
function recoSectW(X) { // poids de chaque secteur du site dans le portefeuille (actions en direct et contenu des ETF détaillés)
  const w = {}; if (!X) return w;
  const byName = Object.fromEntries(Object.entries(R.sectors).map(([k, v]) => [v, k]));
  Object.entries(X.sect || {}).forEach(([s, v]) => { const k = byName[s] || RECO_SECK[s]; if (k) w[k] = (w[k] || 0) + v; });
  return w;
}
function recoHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
const recoSemaine = () => { const d = new Date(); return d.getUTCFullYear() + "-" + Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 6048e5); };

/* ---------- Pistes : ETF, entreprises, secteurs ---------- */
function recoEtfAlt(region) { // l'ETF large le moins cher, comme alternative plus diversifiée
  const cat = region === "eu" ? "actions-europe" : "actions-monde";
  return (ETF.list || []).filter(e => e.categorie === cat && e.ter != null && !e.levier && (region !== "eu" || e.pea === true) && (e.encours || 0) >= 100).sort((a, b) => a.ter - b.ter || (b.encours || 0) - (a.encours || 0))[0] || null;
}
// Catégorie incohérente avec le contenu (ex. ETF MSCI EMU, zone euro, rangés dans « pays émergents » dans etf.json) : écarté
function recoEtfSuspect(e) {
  const p1 = e && e.compo && Array.isArray(e.compo.p1) ? e.compo.p1[0] : null;
  return !!e && e.categorie === "actions-emergents" && (RECO.EEE.has(p1) || /\bEMU\b|euro ?stoxx/i.test((e.index || "") + " " + (e.name || "")));
}
function recoEtfCands(pr, ctx) {
  const a = pr.ans, env = pr.env, heldCat = new Set(), out = [];
  ctx.held.forEach(k => { if (k.startsWith("e:")) { const e = ETFBY[k.slice(2)]; if (e) heldCat.add(e.categorie); } });
  const C = {};
  if (pr.eq > 0) C["actions-monde"] = [5, "Le socle le plus simple : une seule ligne pour les grandes entreprises des pays développés."];
  if (pr.eq >= 30) C["actions-europe"] = [env === "pea" ? 4 : 2.5, "Les grandes entreprises européennes, avec moins d'exposition au dollar."];
  if (pr.niveau >= 3) C["actions-emergents"] = [a.objectif >= 2 ? 3 : 1.5, "Chine, Inde, Taïwan, Brésil… : des économies absentes d'un ETF Monde classique, plus volatiles."];
  if (a.objectif === 1 && pr.eq > 0) C.dividendes = [4.5, "Des entreprises choisies pour leur dividende, pour un objectif de revenus."];
  if (pr.niveau >= 4 && env === "pea") C["actions-france"] = [1, "Les grandes entreprises françaises : simple à suivre, mais concentré sur un seul pays."];
  if ((pr.niveau <= 2 || a.liquidite === 0) && env !== "av") C.monetaire = [3.5, "Une poche qui varie très peu, disponible rapidement (sans garantie en capital)."];
  if (pr.classes.some(x => x.k === "oblig") && env !== "pea") C.obligations = [3, "Des prêts aux États et entreprises, pour amortir les baisses des actions."];
  if (pr.niveau >= 5) C.theme = [0.5, "Un thème précis (santé, énergie propre, semi-conducteurs…) : concentré, à garder petit."];
  for (const e of ETF.list || []) {
    const cc = C[e.categorie]; if (!cc || e.ter == null || e.levier) continue;
    if (env === "pea" && e.pea !== true) continue;
    // garde-fou contre une catégorie mal renseignée (ex. un ETF zone euro rangé dans les émergents)
    if (recoEtfSuspect(e)) continue;
    let s = cc[0] - e.ter * 2 + Math.log10((e.encours || 0) + 1) * 0.5;
    if (/capi/i.test(e.distribution || "") && a.objectif !== 1) s += 0.4;
    if (/dist/i.test(e.distribution || "") && a.objectif === 1) s += 0.4;
    let redond = null;
    if (heldCat.has(e.categorie)) { s -= 4; redond = "Vous détenez déjà un ETF de cette catégorie."; }
    if (e.categorie === "actions-usa" && heldCat.has("actions-monde")) { s -= 4; redond = "Un ETF Monde contient déjà environ 70 % d'actions américaines."; }
    out.push({ id: "e:" + e.id, kind: "etf", e, risk: RECO.risqueEtf(e), s, tags: ["cat:" + e.categorie, "emet:" + (e.issuer || "")], raison: cc[1], redond });
  }
  return out;
}
function recoCoCands(pr, ctx) {
  if (pr.dMax <= 0 || pr.env === "av") return [];
  const a = pr.ans, sw = recoSectW(ctx.X), y = new Date().getFullYear(), wk = recoSemaine(), out = [];
  for (const c of R.companies) {
    if (c.missing || !c.desc || !(c.year >= y - 2)) continue;
    const q = quick(c); if (!q || q.fort + q.moyen + q.vig < 5 || q.vig > 2) continue;
    const pea = recoPeaOk(c); if (pr.env === "pea" && pea !== true) continue;
    const T = recoTaille(c); if (!T) continue;
    const style = recoStyle(c), m = ratios(c);
    const risk = RECO.risqueAction({ taille: T.t, perte: !(c.net > 0), levier: isBank(c) ? null : m.lev, amp: recoAmp(c) });
    let s = q.fort - q.vig; const pq = [];
    if (a.objectif === 1 && style === "rendement") { s += 3; pq.push("objectif de revenus : dividende couvert par le bénéfice"); }
    if (a.objectif === 2 && style === "croissance") { s += 3; pq.push("objectif de croissance : ventes en hausse régulière"); }
    if (a.objectif === 0 && style === "solidite") { s += 2; pq.push("objectif de protection : pas de dette nette"); }
    if (a.objectif === 3 && !(sw[c.sector] > 0.02)) { s += 3; pq.push("diversification : secteur absent de votre portefeuille"); }
    if (sw[c.sector] > 0.25) s -= 3;
    if (T.t === "large") s -= 1.5; // pas de biais vers les grandes valeurs déjà connues
    if (style === "redressement") s -= 0.5; // profil plus incertain, gardé mais moins mis en avant
    s += recoHash(c.id + wk) * 1.5; // la sélection change chaque semaine, sans privilégier les plus connues
    out.push({ id: "c:" + c.id, kind: "ent", c, T, style, risk, s, pea, tags: ["sect:" + c.sector, "taille:" + T.t, "style:" + (style || "autre"), "reg:" + c.region], pq });
  }
  return out;
}
function recoSectCands(pr, ctx) {
  if (pr.eq <= 0 || pr.ans.objectif === 0) return [];
  const sw = recoSectW(ctx.X), by = {};
  R.companies.forEach(c => { if (c.missing) return; const v = valo(c), m = ratios(c); const b = by[c.sector] = by[c.sector] || { y: [], g: [], n: 0 }; b.n++; if (v && v.yld) b.y.push(v.yld); if (m.g1 != null) b.g.push(m.g1); });
  return Object.entries(by).filter(([k, b]) => b.n >= 20 && !(sw[k] > 0.05)).map(([k, b]) => {
    const my = b.y.length >= 10 ? median(b.y) : null, mg = b.g.length >= 10 ? median(b.g) : null, a = pr.ans;
    const s = a.objectif === 1 ? (my || 0) * 100 : a.objectif === 2 ? (mg || 0) * 100 : 1 + recoHash(k + recoSemaine());
    const why = a.objectif === 1 ? "Rendement médian du dividende parmi les plus élevés des secteurs suivis : en lien avec votre objectif de revenus." : a.objectif === 2 ? "Croissance médiane des ventes parmi les plus fortes des secteurs suivis : en lien avec votre objectif de croissance." : "Un secteur pour diversifier ce que vous détenez.";
    return { id: "s:" + k, kind: "sect", k, risk: 3, s, tags: ["sect:" + k], my, mg, n: b.n, abs: ctx.X ? !(sw[k] > 0) : null, why };
  });
}

/* ---------- Points de vigilance du portefeuille (calculés sur les lignes saisies dans /portefeuille) ---------- */
function recoVigil(pr, ctx) {
  const X = ctx.X, R0 = ctx.R0, W = []; if (!X || !R0) return W;
  const t = X.type || {}, eqW = (t["Actions en direct"] || 0) + (t["ETF actions"] || 0) + (t["ETF immobilier"] || 0) + (t["Autres titres"] || 0), dW = t["Actions en direct"] || 0;
  if (eqW * 100 > pr.eqMax + 5) W.push(["vig", `Environ ${F0.format(eqW * 100)} % de votre portefeuille est en actions, au-dessus de la fourchette de votre profil (${RECO.fourchette([pr.eqMin, pr.eqMax])}).`, "Calcul sur les lignes du portefeuille du site seulement : vos livrets et votre assurance-vie hors Bourse n'y sont pas, ils peuvent rééquilibrer l'ensemble."]);
  if (dW * 100 > pr.dMax + 5) W.push(["vig", `Les actions en direct font ${F0.format(dW * 100)} % du portefeuille, pour ${pr.dMax ? `${pr.dMax} % au plus` : "aucune"} dans votre profil.`, "Une entreprise seule peut perdre la moitié de sa valeur ; un ETF large répartit ce risque."]);
  const top = (X.top || []).find(x => !/composition non détaillée/.test(x.name));
  if (top && top.w > 0.1) W.push(["vig", `${esc(top.name)} pèse ${pct(top.w, 0, false)} du portefeuille, en comptant le contenu de vos ETF.`, `Si elle perdait la moitié de sa valeur, le portefeuille baisserait d'environ ${pct(top.w / 2, 0, false)}.`]);
  const ctry = Object.entries(X.ctry || {}).filter(([k]) => /^[A-Z]{2}$/.test(k)).sort((a, b) => b[1] - a[1])[0];
  if (ctry && ctry[1] > 0.6 && X.known > 0.5) W.push(["moyen", `${esc(COUNTRY[ctry[0]] || ctry[0])} : ${pct(ctry[1], 0, false)} du portefeuille.`, ctry[0] === "US" ? "Un ETF Monde en contient déjà environ 70 % : c'est le poids des États-Unis dans la Bourse mondiale." : "Une crise propre à ce pays toucherait une grande partie du portefeuille."]);
  const sw = recoSectW(X), s1 = Object.entries(sw).sort((a, b) => b[1] - a[1])[0];
  if (s1 && s1[1] > 0.35) W.push(["moyen", `${esc(R.sectors[s1[0]] || s1[0])} : ${pct(s1[1], 0, false)} du portefeuille.`, "Les entreprises d'un même secteur montent et baissent souvent ensemble."]);
  (X.overlaps || []).filter(o => o[2] >= 50).slice(0, 2).forEach(o => W.push(["moyen", `${esc(o[0].name)} et ${esc(o[1].name)} ont ${F0.format(o[2])} % de contenu en commun.`, "Deux ETF qui se recouvrent autant n'apportent presque pas de diversification."]));
  const hors = R0.live.filter(r => r.l.env === "pea" && (r.info.kind === "c" ? recoPeaOk(r.info.c) === false : r.info.kind === "e" ? r.info.e && r.info.e.pea === false : false));
  if (hors.length) W.push(["vig", `${hors.length} ligne${hors.length > 1 ? "s" : ""} rangée${hors.length > 1 ? "s" : ""} dans le PEA ${hors.length > 1 ? "ne sont" : "n'est"} pas éligible${hors.length > 1 ? "s" : ""} : ${hors.slice(0, 3).map(r => esc(r.info.name)).join(", ")}.`, "Vérifiez le compte indiqué pour ces lignes : un PEA n'accepte que des sociétés européennes imposées à l'impôt sur les sociétés et les ETF éligibles."]);
  if (pr.ans.horizon === 0 && eqW > 0.5) W.push(["vig", "Horizon de moins de 5 ans avec plus de la moitié en actions.", "Une baisse de 30 % peut ne pas avoir le temps de se rattraper."]);
  if (!W.length) W.push(["fort", "Aucun point de vigilance majeur sur les lignes saisies.", "Contrôle fait sur la part d'actions, la concentration par entreprise, pays et secteur, le recouvrement des ETF et les règles du PEA."]);
  return W;
}

/* ---------- Affichage ---------- */
const RECO_RISK = ["", "Très faible", "Faible", "Moyen", "Élevé", "Très élevé"];
const recoRisk = r => `<span class="rc-risk rc-r${r}" title="Niveau de risque ${r} sur 5 : ${RECO_RISK[r]}"><i></i><i></i><i></i><i></i><i></i><em>Risque ${r}/5</em></span>`;
function recoFb(p) {
  const cur = recoRetours().find(r => r.id === p.id);
  return `<div class="rc-fb" data-fb="${esc(p.id)}"><span>Cette piste vous semble :</span>${Object.entries(RECO.FB_V).map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="${!!(cur && cur.v === k)}">${t}</button>`).join("")}</div>`;
}
function recoEtfCard(p, pr) {
  const e = p.e, pe = RECO.peaEtf(e), C = e.compo || {}, alt = p.risk >= 4 ? recoEtfAlt("monde") : null;
  const facts = [`Frais : ${pct(e.ter / 100, 2, false)} par an`, e.encours ? `Encours : ${F0.format(e.encours)} M€` : null, C.n ? `${F0.format(C.n)} lignes, les 10 premières font ${F0.format(C.t10 || 0)} %` : null,
    pe.expo ? `Exposition : ${F0.format(pe.expo.pct)} % ${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)}` : null, [e.replication, e.distribution].filter(Boolean).map(esc).join(" · ") || null].filter(Boolean);
  return `<article class="rc-card" data-id="${esc(p.id)}"><header><span class="rc-ico">ETF</span><span class="rc-ht"><a href="/etf/${esc(e.id)}"><b>${esc(e.name)}</b></a><small>${esc([e.issuer, ECAT[e.categorie] || e.categorie, e.index].filter(Boolean).join(" · "))}</small></span></header>
    <div class="rc-tags">${recoRisk(p.risk)}${recoEtfPeaTag(e)}</div>
    <p class="rc-why"><b>Pourquoi cette piste</b>${esc(p.raison)}${p.redond ? ` <span class="rc-warn">${esc(p.redond)}</span>` : ""}</p>
    <ul class="rc-facts">${facts.map(f => `<li>${f}</li>`).join("")}</ul>
    <details class="rc-det"><summary>Limites, conditions et alternative</summary><div>
      <p><b>Pertinente si</b> ${p.risk >= 4 ? "cette ligne reste une petite part de la partie actions, à côté d'un ETF large." : p.risk <= 2 ? "vous cherchez à réduire les variations ou à garder de l'argent disponible." : `vous gardez cet argent au moins ${pr.ans.horizon === 2 ? "10" : "5"} ans et acceptez des baisses passagères de 30 % ou plus.`}</p>
      <p><b>Éligibilité au PEA</b> ${esc(pe.why)}${pe.expo ? ` Ce que le fonds suit est une autre question : ${F0.format(pe.expo.pct)} % ${esc(COUNTRY[pe.expo.pays] || pe.expo.pays)}.` : ""}</p>
      <p><b>Limites</b> Les performances passées ne préjugent pas des performances futures. Frais et encours viennent de la fiche de l'émetteur ; vérifiez-les chez votre courtier.${(e.encours || 0) < 100 ? " Petit encours : un fonds de moins de 100 M€ risque davantage d'être fermé." : ""}</p>
      ${alt && alt.id !== e.id ? `<p><b>Moins risqué</b> <a class="lnk" href="/etf/${esc(alt.id)}">${esc(alt.name)}</a> répartit le risque sur ${alt.compo && alt.compo.n ? F0.format(alt.compo.n) + " entreprises" : "des centaines d'entreprises"}.</p>` : ""}</div></details>
    ${recoFb(p)}</article>`;
}
function recoCoCard(p, pr) {
  const c = p.c, F = typeof outFacts === "function" ? outFacts(c).slice(0, 2) : [], V = recoValo(c), Rk = recoRisques(c, p.T), pi = recoPeaInfo(c), alt = recoEtfAlt(c.region === "FR" || c.region === "EU" ? "eu" : "monde");
  const raison = [p.style ? `Profil « ${RECO_STYLE[p.style]} »` : "Comptes au-dessus de la médiane de son secteur", ...p.pq].join(" ; ") + ".";
  return `<article class="rc-card" data-id="${esc(p.id)}"><header>${logo(c, 36)}<span class="rc-ht"><a href="/entreprise/${esc(c.id)}"><b>${esc(c.name)}</b></a><small>${esc([secName(c), regName(c), RECO_TAILLE[p.T.t] + (p.T.src === "ventes" ? " (estimée par les ventes)" : "")].filter(Boolean).join(" · "))}</small></span></header>
    <div class="rc-tags">${recoRisk(p.risk)}${recoPeaTag(c)}${p.style ? `<span class="rc-st">${RECO_STYLE[p.style]}</span>` : ""}</div>
    <p class="rc-desc">${esc(c.desc)}</p>
    <p class="rc-why"><b>Pourquoi cette piste</b>${esc(raison)}</p>
    ${F.length ? `<ul class="rc-facts">${F.map(f => `<li>${f}</li>`).join("")}</ul>` : ""}
    <details class="rc-det"><summary>Valorisation, risques et conditions</summary><div>
      ${V.length ? `<p><b>Valorisation</b> ${V.join(" ")}</p>` : ""}
      ${Rk.length ? `<p><b>Risques</b></p><ul class="rc-rk">${Rk.map(([t, x]) => `<li><b>${t}</b> ${x}</li>`).join("")}</ul>` : ""}
      <p><b>Catalyseurs potentiels</b></p><div data-rc-cat="${esc(c.id)}"><p class="rc-mut">Chargement des annonces…</p></div>
      <p><b>Pertinente si</b> vous voulez choisir vous-même une partie de vos actions, lisez ses résultats deux à quatre fois par an, et que cette ligne reste petite : vos actions en direct, toutes ensemble, sont au plus ${pr.dMax} % du total dans votre profil.</p>
      <p><b>Éligibilité au PEA</b> ${esc(pi.why)}</p>
      <p><b>Limites</b> Les chiffres décrivent l'exercice ${esc(String(c.year || ""))} : ils ne disent pas si le prix de l'action est intéressant aujourd'hui, ni ce qu'elle fera.</p>
      ${alt ? `<p><b>Moins risqué</b> <a class="lnk" href="/etf/${esc(alt.id)}">${esc(alt.name)}</a> (${pct(alt.ter / 100, 2, false)} de frais par an) détient ${alt.compo && alt.compo.n ? F0.format(alt.compo.n) + " entreprises" : "des centaines d'entreprises"} : le sort d'une seule pèse peu.</p>` : ""}</div></details>
    ${recoFb(p)}</article>`;
}
function recoSectCard(p) {
  const n = R.sectors[p.k] || p.k;
  return `<article class="rc-card rc-sect" data-id="${esc(p.id)}"><header><span class="rc-ico">◧</span><span class="rc-ht"><a href="/entreprises?secteur=${esc(p.k)}"><b>${esc(n)}</b></a><small>${F0.format(p.n)} entreprises suivies</small></span></header>
    <p class="rc-why"><b>Pourquoi ce secteur</b>${p.abs === true ? "Absent de votre portefeuille." : p.abs === false ? "Peu présent dans votre portefeuille (moins de 5 %)." : p.why || "Un secteur à explorer pour votre objectif."}</p>
    <ul class="rc-facts">${p.my != null ? `<li>Rendement médian du dividende : ${pct(p.my, 1, false)}</li>` : ""}${p.mg != null ? `<li>Croissance médiane des ventes : ${sgn(p.mg, 1)} sur le dernier exercice</li>` : ""}</ul>
    <p class="rc-mut">Médianes des entreprises suivies par le site (comptes publiés, cours du site). Pour s'exposer à un secteur sans choisir d'entreprise, il existe des ETF sectoriels.</p>
    ${recoFb(p)}</article>`;
}
const RECO_LEGAL = `<div class="rc-legal"><b>Contenu pédagogique et informatif, pas un conseil en investissement.</b> Ces pistes sont calculées à partir de vos réponses et des données publiques du site. Elles ne tiennent pas compte de toute votre situation (revenus, patrimoine, impôts, projets) et ne sont pas un conseil personnalisé au sens de la réglementation : bilan. n'est pas conseiller en investissements financiers (CIF). Pour un conseil adapté, adressez-vous à un CIF immatriculé à l'<a href="https://www.orias.fr" target="_blank" rel="noopener">ORIAS</a>. Investir en Bourse comporte un risque de perte en capital.</div>`;

/* ---------- Questionnaire ---------- */
let RECO_COMM = null;
async function recoComm() { if (!RECO_COMM) RECO_COMM = await fetch("/data/commencer.json").then(r => r.json()).catch(() => null); return RECO_COMM; }
function recoQuestions(C) { // les 11 questions, regroupées en 3 temps
  const base = Object.fromEntries((C && C.questions || []).map(q => [q.id, { id: q.id, q: q.question || q.q || q.texte || q.titre, o: q.options.map(o => o.label || o.t || o.texte || o.titre) }]));
  const X = Object.fromEntries(RECO.QX.map(q => [q.id, q]));
  return [["Votre situation", ["horizon", "liquidite", "precaution", "capital", "versement"]], ["Votre rapport au risque", ["perte", "baisse"]], ["Vos objectifs et votre compte", ["objectif", "connaissance", "choisir", "enveloppe"]]]
    .map(([t, ids]) => [t, ids.map(id => base[id] || X[id]).filter(Boolean)]);
}
function recoFormHTML(C, ans) {
  const G = recoQuestions(C), n = G.reduce((a, g) => a + g[1].length, 0), done = RECO.IDS.filter(k => Number.isInteger(ans[k])).length, cx = typeof connecte === "function" && connecte();
  return `<div class="ph"><h2>Votre profil en ${n} questions</h2><span class="light rc-cnt" style="font-size:12.5px">${done} sur ${n} · environ 2 minutes</span></div>
    <div class="pb"><div class="rc-prog"><span style="width:${Math.round(done / n * 100)}%"></span></div><form id="rc-form">${G.map(([t, qs], gi) => `<div class="rc-grp"><p class="rc-gt"><span>${gi + 1}</span>${esc(t)}</p>${qs.map(q => `<fieldset class="rc-q${Number.isInteger(ans[q.id]) ? " ok" : ""}"><legend>${esc(q.q)}${q.aide ? `<small>${esc(q.aide)}</small>` : ""}</legend><div class="rc-opts">${q.o.map((o, i) => `<label><input type="radio" name="${q.id}" value="${i}"${ans[q.id] === i ? " checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div></fieldset>`).join("")}</div>`).join("")}</form>
    <p class="rc-mut" style="margin-top:12px">Réponses gardées sur cet appareil${cx ? " et dans votre compte" : ""}. Les 5 questions de « Par où commencer » sont reprises.${cx ? "" : ` <a class="lnk" href="/espace">Connectez-vous</a> pour les retrouver sur vos autres appareils.`}</p></div>`;
}
function recoResumeHTML(C, ans) {
  const G = recoQuestions(C).flatMap(g => g[1]);
  return `<div class="ph"><h2>Vos réponses</h2><button type="button" class="linkbtn" id="rc-edit">Modifier mes réponses</button></div><div class="pb"><div class="rc-sum">${G.map(q => `<span title="${esc(q.q)}">${esc(q.o[ans[q.id]] || "")}</span>`).join("")}</div></div>`;
}

/* ---------- La page /pour-moi ---------- */
const RECO_ST = { edit: false };
async function pageRecoPourMoi() {
  setTitle("Pistes pour vous"); setNav("sim"); recoCSS();
  if (!R) return;
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  const [C, ctx] = await Promise.all([recoComm(), recoCtx(), typeof moi === "function" ? moi() : null]);
  if (location.pathname !== "/pour-moi") return;
  app.innerHTML = `<div class="rc-page"><div class="crumbs"><a href="/outils">Outils</a> › Pistes pour vous</div>
    <h1 class="pagetitle">Des pistes adaptées à votre profil</h1>
    <p class="pagesub">Une répartition indicative, des ETF et des entreprises à étudier, et les points de vigilance de votre portefeuille. Tout est calculé à partir de vos réponses, de votre portefeuille sur le site et des données officielles.</p>
    ${RECO_LEGAL}<section class="panel" id="rc-q"></section><div id="rc-out"></div></div>`;
  recoDraw(C, ctx);
}
function recoDraw(C, ctx) {
  const ans = recoAns(), pr = RECO.profil(ans, recoRetours()), q = $("#rc-q"); if (!q) return;
  q.innerHTML = pr.complet && !RECO_ST.edit ? recoResumeHTML(C, ans) : recoFormHTML(C, ans);
  const f = $("#rc-form", q);
  if (f) f.onchange = e => {
    const t = e.target; if (!t.name) return;
    recoSave({ [t.name]: +t.value });
    const a2 = recoAns(), fs = t.closest("fieldset"); if (fs) fs.classList.add("ok");
    const done = RECO.IDS.filter(k => Number.isInteger(a2[k])).length, pg = $(".rc-prog span", q), lt = $(".rc-cnt", q);
    if (pg) pg.style.width = Math.round(done / RECO.IDS.length * 100) + "%";
    if (lt) lt.textContent = `${done} sur ${RECO.IDS.length} · environ 2 minutes`;
    if (!RECO.manquantes(a2).length && !RECO_ST.edit) { recoDraw(C, ctx); const o = $("#rc-out"); if (o && o.scrollIntoView) o.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else recoOut(C, ctx);
  };
  const ed = $("#rc-edit", q); if (ed) ed.onclick = () => { RECO_ST.edit = true; recoDraw(C, ctx); };
  if (RECO_ST.edit && pr.complet) q.querySelector(".ph").insertAdjacentHTML("beforeend", `<button type="button" class="linkbtn" id="rc-done">Terminé</button>`);
  const dn = $("#rc-done", q); if (dn) dn.onclick = () => { RECO_ST.edit = false; recoDraw(C, ctx); };
  recoOut(C, ctx);
}
function recoPistes(pr, ctx) {
  const M = pr.modele, held = ctx.held;
  const etf = RECO.choisir(recoEtfCands(pr, ctx), { n: 3, riskMax: pr.riskMax, modele: M, held, uniq: "cat:" });
  const ent = RECO.choisir(recoCoCands(pr, ctx), { n: 3, riskMax: pr.riskMax, modele: M, held, uniq: "sect:" });
  const sect = RECO.choisir(recoSectCands(pr, ctx), { n: 3, riskMax: 5, modele: M, held: new Set(), uniq: "sect:" });
  return { etf, ent, sect };
}
function recoOut(C, ctx) {
  const el = $("#rc-out"); if (!el) return;
  const ans = recoAns(), retours = recoRetours(), pr = RECO.profil(ans, retours);
  if (!pr.complet) { el.innerHTML = `<section class="panel"><div class="pb rc-wait"><b>Encore ${pr.manque.length} question${pr.manque.length > 1 ? "s" : ""}</b><span>Les pistes s'affichent dès que le profil est complet.</span></div></section>`; return; }
  const P = recoPistes(pr, ctx), V = recoVigil(pr, ctx), cols = { etf: "#111214", direct: "#0E6B4A", oblig: "#B9AE97", garanti: "#D9D3C7" };
  const pAlloc = { id: "alloc:" + pr.niveau, kind: "alloc", tags: ["alloc"], risk: pr.niveau };
  const nRet = retours.length;
  el.innerHTML = `
    <section class="panel rc-verdict"><div class="pb">
      <div class="rc-vh"><div><p class="kick">Votre profil</p><h2>${esc(pr.label)}</h2><p class="rc-vs">Part d'actions indicative : <b>${RECO.fourchette([pr.eqMin, pr.eqMax])}</b>${pr.eq <= 0 ? "" : pr.dMax ? `, dont ${pr.dMax} % au plus en actions en direct` : ", uniquement via des ETF"}.</p></div>
        <div class="rc-gauge" role="img" aria-label="Niveau de risque ${pr.niveau} sur 5">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= pr.niveau ? "on" : ""}"></span>`).join("")}<small>Risque ${pr.niveau} sur 5</small></div></div>
      ${pr.prereq.map(x => `<p class="rc-pre">${esc(x)}</p>`).join("")}
    </div></section>
    <section class="panel"><div class="ph"><h2>1. Répartition indicative</h2><span class="light" style="font-size:12.5px">en fourchettes, pas en chiffres exacts</span></div><div class="pb">
      <div class="rc-bar">${pr.classes.map(x => `<span style="width:${x.v}%;background:${cols[x.k]}" title="${esc(x.label)} : ${RECO.fourchette(x.r)}"></span>`).join("")}</div>
      <div class="rc-alloc">${pr.classes.map(x => `<div class="rc-al"><i style="background:${cols[x.k]}"></i><div><b>${esc(x.label)}</b><span class="rc-rg">${RECO.fourchette(x.r)}</span>${recoRisk(x.risk)}<p>${esc(x.why)}</p><p class="rc-where">${esc(RECO.placement(pr.env, x.k))}</p></div></div>`).join("")}</div>
      <details class="rc-det"><summary>Hypothèses de calcul</summary><div><ul class="rc-rk">${pr.hyp.map(h => `<li>${esc(h)}</li>`).join("")}</ul>
        ${pr.eqMax > 0 ? `<p><b>Plus prudent</b> La même répartition avec ${RECO.fourchette([Math.max(0, pr.eqMin - 15), Math.max(0, pr.eqMax - 15)])} d'actions réduit l'ampleur des baisses, au prix d'une croissance attendue plus faible.</p>` : ""}</div></details>
      ${recoFb(pAlloc)}</div></section>
    <section class="panel"><div class="ph"><h2>2. Votre portefeuille : points de vigilance</h2>${ctx.X ? `<a href="/portefeuille">Ouvrir le portefeuille</a>` : ""}</div><div class="pb">
      ${ctx.X ? `<ul class="rc-vig">${V.map(([z, t, w]) => `<li class="${z}"><b>${t}</b><span>${w}</span></li>`).join("")}</ul>` : `<div class="rc-wait"><b>Aucun portefeuille sur le site</b><span>Ajoutez vos lignes ou importez le fichier de votre courtier : les pistes éviteront ce que vous détenez déjà et signaleront les concentrations.</span><a class="btn" href="/portefeuille">Ajouter mon portefeuille</a></div>`}</div></section>
    <section class="panel"><div class="ph"><h2>3. ETF à étudier</h2><span class="light" style="font-size:12.5px">${pr.env === "pea" ? "uniquement des fonds éligibles au PEA" : "classés par adéquation, puis par frais"}</span></div><div class="pb">
      ${P.etf.length ? `<div class="rc-grid">${P.etf.map(p => recoEtfCard(p, pr)).join("")}</div>` : `<p class="rc-mut">Aucun ETF ne correspond avec ces réponses et vos retours.</p>`}</div></section>
    <section class="panel"><div class="ph"><h2>4. Entreprises à étudier</h2><span class="light" style="font-size:12.5px">${pr.env === "pea" ? "sociétés éligibles au PEA" : "toutes tailles, tous pays"}</span></div><div class="pb">
      ${pr.dMax <= 0 ? `<p class="rc-mut">Votre profil ne prévoit pas d'actions en direct${pr.ans.choisir === 0 ? " (vous préférez une solution simple)" : pr.ans.connaissance === 0 ? " tant que vous découvrez la Bourse" : ""} : les ETF font ce travail de diversification. <a class="lnk" href="/decouvertes">Les découvertes du jour</a> restent ouvertes pour apprendre.</p>`
        : pr.env === "av" ? `<p class="rc-mut">Une assurance-vie permet rarement d'acheter des actions en direct : les pistes d'entreprises concernent un PEA ou un compte-titres.</p>`
        : P.ent.length ? `<div class="rc-grid">${P.ent.map(p => recoCoCard(p, pr)).join("")}</div>` : `<p class="rc-mut">Aucune entreprise ne remplit les conditions avec vos retours actuels.</p>`}</div></section>
    ${P.sect.length ? `<section class="panel"><div class="ph"><h2>5. Secteurs à explorer</h2></div><div class="pb"><div class="rc-grid">${P.sect.map(recoSectCard).join("")}</div></div></section>` : ""}
    <section class="panel"><details class="acc"><summary><b>Comment ces pistes sont choisies</b><span class="chev" aria-hidden="true"></span></summary><div class="accb" style="padding:0 22px 16px">
      <p><b>Répartition.</b> La part d'actions est la plus basse des limites fixées par votre horizon, votre réaction à une baisse, la baisse que vous pouvez supporter et votre besoin de disponibilité. La prudence l'emporte toujours.</p>
      <p><b>Niveau de risque (1 à 5).</b> ETF monétaire 1, obligations 2, ETF actions larges 3, émergents, thématiques et un seul pays 4, matières premières 5. Une action seule vaut au moins 3 : 3 pour une grande ou moyenne entreprise, 4 pour une petite, 5 pour une micro, un point de plus en cas de perte, de dette lourde ou de cours très variable. Seules les pistes sous le plafond de votre profil sont proposées.</p>
      <p><b>Entreprises.</b> Comptes publiés depuis moins de deux ans, au moins 5 critères mesurés, au plus 2 points de vigilance, un secteur différent par piste, ni celles que vous détenez déjà. La sélection tourne chaque semaine pour ne pas favoriser les plus connues.</p>
      <p><b>PEA.</b> Siège dans l'Union européenne ou l'EEE (code ISIN, recoupé avec Wikidata) et société imposée à l'impôt sur les sociétés : les foncières exonérées (SIIC, SIR, SOCIMI, REIT) sont exclues. Pour un ETF, l'éligibilité est celle déclarée par l'émetteur ; elle ne dit rien de ce que le fonds suit. Votre courtier fait foi.</p>
      <p><b>Vos retours (${nRet}).</b> « Trop risquée » abaisse le plafond de risque et la part d'actions ; « redondante » et « inadaptée » retirent la piste et éloignent les pistes semblables ; « pertinente » met en avant les pistes semblables.${nRet ? ` <button type="button" class="linkbtn" id="rc-reset">Effacer mes retours</button>` : ""}</p>
      <p class="rc-mut">Sources : comptes annuels ESEF (Europe) et SEC (États-Unis), cours du site, fiches des émetteurs d'ETF, annonces officielles (AMF, SEC…), Wikidata (CC0). Les performances passées ne préjugent pas des performances futures.</p></div></details></section>`;
  recoFillCatal(el);
  recoBindFb(el, () => recoOut(C, ctx), [...P.etf, ...P.ent, ...P.sect, pAlloc]);
  const rs = $("#rc-reset", el);
  if (rs) rs.onclick = () => { const l = recoRetours().map(r => ({ ...r, v: null, at: Date.now() })); recoSave(null, l); recoOut(C, ctx); toast("Vos retours ont été effacés."); };
}
function recoBindFb(root, redraw, all) {
  $$(".rc-fb button", root).forEach(b => b.onclick = () => {
    const id = b.closest(".rc-fb").dataset.fb, p = all.find(x => x.id === id); if (!p) return;
    const cur = recoRetours().find(r => r.id === id), v = cur && cur.v === b.dataset.v ? null : b.dataset.v;
    recoRetour(p, v);
    toast(v ? (v === "ok" ? "Merci : les pistes semblables seront mises en avant." : v === "risque" ? "Noté : les pistes suivantes seront moins risquées." : "Noté : cette piste est remplacée par une autre.") : "Avis retiré.");
    redraw();
  });
}

/* ---------- Version compacte : accueil et Mon espace ----------
   recoCompactHTML({ titre }) renvoie le HTML tout de suite (rien à attendre) ; l'accueil et Mon espace le placent. */
function recoCompactHTML(o = {}) {
  if (!R) return ""; recoCSS(); recoDivLoad();
  const ans = recoAns(), pr = RECO.profil(ans, recoRetours()), titre = o.titre || "Des pistes pour vous", N = RECO.IDS.length;
  if (!pr.complet) {
    const n = N - pr.manque.length;
    return `<section class="panel rc-mini"><div class="ph"><h2>${esc(titre)}</h2><a href="/pour-moi">Commencer</a></div><div class="pb"><p>Répondez à ${N} questions en 2 minutes : horizon, baisse supportable, compte utilisé. Le site calcule une répartition indicative, et des ETF et entreprises à étudier.</p>
      ${n ? `<div class="rc-prog"><span style="width:${Math.round(n / N * 100)}%"></span></div><p class="rc-mut">${n} réponse${n > 1 ? "s" : ""} sur ${N} déjà données.</p>` : ""}<a class="btn" href="/pour-moi">${n ? "Terminer mon profil" : "Trouver mes pistes"}</a></div></section>`;
  }
  const ctx = { held: new Set((typeof pf2Load === "function" ? pf2Load().l : []).map(l => l.k)), X: null, R0: null };
  const P = recoPistes(pr, ctx), top = [...P.etf.slice(0, 2), ...P.ent.slice(0, 1)];
  return `<section class="panel rc-mini"><div class="ph"><h2>${esc(titre)}</h2><a href="/pour-moi">Toutes mes pistes</a></div><div class="pb">
    <div class="rc-mh"><div><span class="rc-mut">Votre profil</span><b>${esc(pr.label)}</b></div><div><span class="rc-mut">Part d'actions</span><b>${RECO.fourchette([pr.eqMin, pr.eqMax])}</b></div><div class="rc-gauge sm" role="img" aria-label="Risque ${pr.niveau} sur 5">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= pr.niveau ? "on" : ""}"></span>`).join("")}</div></div>
    ${top.length ? `<ul class="rc-ml">${top.map(p => p.kind === "etf" ? `<li><a href="/etf/${esc(p.e.id)}"><b>${esc(p.e.name)}</b><small>ETF · ${esc(ECAT[p.e.categorie] || "")} · ${pct(p.e.ter / 100, 2, false)} par an</small></a>${recoRisk(p.risk)}</li>` : `<li><a href="/entreprise/${esc(p.c.id)}"><b>${esc(p.c.name)}</b><small>${esc(secName(p.c))} · ${esc(RECO_TAILLE[p.T.t])}</small></a>${recoRisk(p.risk)}</li>`).join("")}</ul>` : ""}
    <p class="rc-mut">Pédagogique, pas un conseil en investissement. Donnez votre avis sur chaque piste pour affiner les suivantes.</p></div></section>`;
}
function recoAccueilHTML() { return recoCompactHTML({ titre: "Des pistes pour vous" }); }
function recoEspaceHTML() { return recoCompactHTML({ titre: "Vos pistes" }); }

/* ---------- Route, menu ---------- */
if (typeof ROUTES_EXTRA !== "undefined") ROUTES_EXTRA.push([/^\/pour-moi$/, () => pageRecoPourMoi()]);
if (typeof document !== "undefined" && document.querySelector) {
  recoDivLoad();
  const dd = document.querySelector('#nav .dd[data-g="out"] .ddm');
  if (dd && !dd.querySelector('a[href="/pour-moi"]')) { const pf = dd.querySelector('a[href="/portefeuille"]'), h = `<a href="/pour-moi"><b>Pistes pour vous</b><span>Répartition et idées selon votre profil</span></a>`; if (pf) pf.insertAdjacentHTML("afterend", h); else dd.insertAdjacentHTML("afterbegin", h); }
  const mp = document.getElementById("mpanel");
  if (mp && !mp.querySelector('a[href="/pour-moi"]')) { const pf = mp.querySelector('a[href="/portefeuille"]'); if (pf) pf.insertAdjacentHTML("afterend", `<a href="/pour-moi">Pistes pour vous</a>`); }
  if (typeof OUTILS !== "undefined" && Array.isArray(OUTILS) && !OUTILS.some(o => o[0] === "/pour-moi")) OUTILS.unshift(["/pour-moi", "Pistes pour vous", "Une répartition indicative, des ETF et des entreprises à étudier selon votre profil et votre portefeuille."]);
}
let RECO_CSS = false;
function recoCSS() {
  if (RECO_CSS || typeof document === "undefined") return; RECO_CSS = true;
  document.head.insertAdjacentHTML("beforeend", `<style id="rc-css">
.rc-page>.panel,.rc-page>#rc-out>.panel{margin-top:16px}
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
@media (max-width:720px){.rc-alloc{grid-template-columns:1fr}.rc-verdict h2{font-size:22px}.rc-grid{grid-template-columns:1fr}.rc-gauge small{text-align:left}.rc-ml li .rc-risk em{display:none}}
</style>`);
}
