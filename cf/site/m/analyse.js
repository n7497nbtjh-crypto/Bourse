/* Module « analyse » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   Ce qui la valorise, ce qui lui fait défaut, le contexte à connaître :
   - facteurs financiers calculés sur plusieurs exercices (comptes officiels lus par le site) ;
   - facteurs de contexte appliqués par des règles explicites (pays, devise, secteur, cotation, actionnariat),
     chacune avec sa source officielle ou reconnue (table ANALYSE_REGLES ci-dessous).
   Aucune opinion, aucune prédiction, aucun conseil : des faits, des chiffres et des risques connus, au conditionnel quand il le faut.
   Fonctions publiques : analyseForcesFaiblesses(s, c), analyseHTML(s, c), analyseFaitsIA(s, c) ; ficheFaits(s, c) est enrichie. */

let ANALYSE_WD = null, ANALYSE_P = null; // cf/site/data/facteurs.json : faits Wikidata (CC0) et taux BCE, chargés à la première fiche ouverte
function analyseCharge() {
  if (!ANALYSE_P) ANALYSE_P = fetch("/data/facteurs.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => { ANALYSE_WD = j; if (j) setTimeout(() => { try { analyseRafraichir(); document.dispatchEvent(new CustomEvent("analyse:pret")); } catch (e) { } }, 0); return j; });
  return ANALYSE_P;
}
if (/^\/entreprise\//.test(location.pathname)) analyseCharge();

/* ---------- Sources : [nom affiché, adresse] ---------- */
const ANALYSE_SRC = {
  sec_chine: ["SEC (régulateur américain), informations à fournir par les sociétés liées à la Chine", "https://www.sec.gov/corpfin/disclosure-considerations-china-based-issuers"],
  sec_vie: ["SEC, déclaration du président sur les sociétés chinoises et les structures VIE (30 juillet 2021)", "https://www.sec.gov/news/statement/gensler-2021-07-30"],
  hfcaa: ["SEC, loi HFCAA sur les sociétés étrangères cotées aux États-Unis", "https://www.sec.gov/hfcaa"],
  fmi_chine: ["FMI, Chine : rapports et données", "https://www.imf.org/en/Countries/CHN"],
  fmi_groupes: ["FMI, classement des pays (Perspectives de l'économie mondiale)", "https://www.imf.org/en/Publications/WEO/weo-database/2024/October/groups-and-aggregates"],
  ce_chine: ["Commission européenne, relations commerciales entre l'UE et la Chine", "https://policy.trade.ec.europa.eu/eu-trade-relationships-country-and-region/countries-and-regions/china_en"],
  bis_export: ["Département du Commerce des États-Unis (BIS), contrôles des exportations", "https://www.bis.gov/"],
  hkma: ["Autorité monétaire de Hong Kong, système de change lié au dollar", "https://www.hkma.gov.hk/eng/key-functions/money/linked-exchange-rate-system/"],
  hkex: ["Bourse de Hong Kong (HKEX)", "https://www.hkex.com.hk/"],
  ue_russie: ["Commission européenne, sanctions adoptées après l'agression de l'Ukraine par la Russie", "https://finance.ec.europa.eu/eu-and-world/sanctions-restrictive-measures/sanctions-adopted-following-russias-military-aggression-against-ukraine_en"],
  bce_change: ["BCE, taux de change de référence de l'euro", "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.fr.html"],
  mce2: ["Danmarks Nationalbank, politique de change fixe face à l'euro", "https://www.nationalbanken.dk/en/frequently-asked-questions/questions-regarding-fixed-exchange-rate-policy"],
  amf_actions: ["AMF, guide « Investir en actions »", "https://www.amf-france.org/sites/institutionnel/files/pdf/59273/fr/Investir_en_actions.pdf"],
  amf_infos: ["AMF, guide « Bien s'informer sur les sociétés cotées »", "https://www.amf-france.org/sites/institutionnel/files/pdf/59207/fr/Bien_s%27informer_sur_les_societes_cotees_en_bourse.pdf"],
  irs_w8: ["IRS (administration fiscale américaine), formulaire W-8BEN", "https://www.irs.gov/forms-pubs/about-form-w-8-ben"],
  afc_ch: ["Administration fédérale des contributions (Suisse), impôt anticipé", "https://www.estv.admin.ch/estv/fr/accueil/impot-anticipe.html"],
  uk_stamp: ["Gouvernement britannique, taxes à l'achat d'actions", "https://www.gov.uk/tax-buy-shares"],
  ttf: ["BOFiP (impots.gouv.fr), taxe sur les transactions financières", "https://bofip.impots.gouv.fr/doctrine/BOI-TCA-FIN"],
  pea: ["Service-public.fr, fiche PEA", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385"],
  eu_ets: ["Commission européenne, système d'échange de quotas d'émission (SEQE-UE)", "https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en"],
  cbam: ["Commission européenne, mécanisme d'ajustement carbone aux frontières", "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en"],
  co2_auto: ["Commission européenne, normes d'émissions de CO2 des voitures neuves", "https://climate.ec.europa.eu/eu-action/transport/road-transport-reducing-co2-emissions-vehicles/co2-emission-performance-standards-cars-and-vans_en"],
  bm_mp: ["Banque mondiale, marchés des matières premières", "https://www.worldbank.org/en/research/commodity-markets"],
  bce_ssm: ["BCE, supervision bancaire", "https://www.bankingsupervision.europa.eu/home/html/index.fr.html"],
  bri_bale: ["Banque des règlements internationaux, règles de Bâle III", "https://www.bis.org/bcbs/basel3.htm"],
  eiopa: ["EIOPA (autorité européenne des assurances), Solvabilité II", "https://www.eiopa.europa.eu/browse/regulation-and-policy/solvency-ii_en"],
  inpi: ["INPI, le brevet", "https://www.inpi.fr/comprendre-la-propriete-intellectuelle/le-brevet"],
  ema: ["Agence européenne des médicaments, autorisation de mise sur le marché", "https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation"],
  cms: ["CMS (assurance maladie publique américaine), négociation des prix des médicaments", "https://www.cms.gov/priorities/medicare-prescription-drug-affordability/overview/medicare-drug-price-negotiation-program"],
  bce_taux: ["BCE, taux d'intérêt directeurs", "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.fr.html"],
  reit: ["SEC (Investor.gov), les sociétés immobilières cotées (REIT)", "https://www.investor.gov/introduction-investing/investing-basics/investment-products/real-estate-investment-trusts-reits"],
  cre: ["Commission de régulation de l'énergie (CRE)", "https://www.cre.fr/"],
  arcep: ["Arcep, régulateur des télécoms", "https://www.arcep.fr/"],
  iata: ["IATA, analyses économiques du transport aérien", "https://www.iata.org/en/publications/economics/"],
  armes: ["Union européenne, position commune sur les exportations d'armes (2008/944/PESC)", "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32008E0944"],
  ocde_ep: ["OCDE, gouvernance des entreprises publiques", "https://www.oecd.org/en/topics/state-owned-enterprises.html"],
  sec_fpi: ["SEC, formulaire 20-F des sociétés étrangères cotées aux États-Unis", "https://www.sec.gov/files/form20-f.pdf"],
};

/* ---------- Repères : pays, places de cotation, devises ---------- */
const ANALYSE_PAYS = { US: "États-Unis", JP: "Japon", GB: "Royaume-Uni", FR: "France", CA: "Canada", DE: "Allemagne", CH: "Suisse", NL: "Pays-Bas", AU: "Australie", TW: "Taïwan", CN: "Chine", IN: "Inde", KR: "Corée du Sud", IT: "Italie", ES: "Espagne", SE: "Suède", DK: "Danemark", IE: "Irlande", BR: "Brésil", HK: "Hong Kong", SG: "Singapour", BE: "Belgique", FI: "Finlande", NO: "Norvège", ZA: "Afrique du Sud", SA: "Arabie saoudite", MX: "Mexique", IL: "Israël", AT: "Autriche", PT: "Portugal", LU: "Luxembourg", JE: "Jersey", BM: "Bermudes", KY: "îles Caïmans", CY: "Chypre", GR: "Grèce", PL: "Pologne", NZ: "Nouvelle-Zélande", MH: "îles Marshall", VG: "îles Vierges britanniques", IM: "île de Man", GG: "Guernesey", GI: "Gibraltar", MT: "Malte", FO: "îles Féroé", AG: "Antigua-et-Barbuda", RU: "Russie", UY: "Uruguay", AR: "Argentine", PE: "Pérou", CL: "Chili", CO: "Colombie", ID: "Indonésie", TH: "Thaïlande", MY: "Malaisie", PH: "Philippines", AE: "Émirats arabes unis", QA: "Qatar", TR: "Turquie", EG: "Égypte", CZ: "Tchéquie", HU: "Hongrie", RO: "Roumanie", UA: "Ukraine", KZ: "Kazakhstan", IS: "Islande", PA: "Panama", BS: "Bahamas", CW: "Curaçao", LI: "Liechtenstein", MC: "Monaco", EE: "Estonie", LV: "Lettonie", LT: "Lituanie", SK: "Slovaquie", SI: "Slovénie", HR: "Croatie", BG: "Bulgarie", VN: "Viêt Nam", NG: "Nigeria", MA: "Maroc" };
const ANALYSE_OFF = new Set(["KY", "BM", "VG", "JE", "GG", "IM", "MH", "AG", "GI", "PA", "BS", "CW", "LR"]); // immatriculation fréquente pour des groupes qui travaillent ailleurs
const ANALYSE_EURO = new Set(["FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT", "IE", "AT", "FI", "GR", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "MC"]);
// Économies émergentes et en développement selon le FMI (Perspectives de l'économie mondiale)
const ANALYSE_EMERG = new Set(["CN", "IN", "BR", "MX", "ZA", "TR", "ID", "TH", "MY", "PH", "SA", "AE", "QA", "KW", "EG", "CL", "CO", "PE", "AR", "PL", "HU", "RO", "BG", "RU", "UA", "KZ", "NG", "VN", "UY", "MA"]);
const ANALYSE_EMCUR = new Set(["BRL", "MXN", "INR", "ZAR", "TRY", "IDR", "ARS", "PEN", "CLP", "COP", "PLN", "HUF", "RON", "UAH", "RUB", "THB", "MYR", "PHP", "SAR", "EGP", "NGN"]);
const ANALYSE_BOURSE = { NYSE: ["US", "USD"], NASDAQ: ["US", "USD"], EURONEXT: [null, "EUR"], LSE: ["GB", "GBP"], OMXSTO: ["SE", "SEK"], XETR: ["DE", "EUR"], TSE: ["JP", "JPY"], MIL: ["IT", "EUR"], OSL: ["NO", "NOK"], OMXCOP: ["DK", "DKK"], BME: ["ES", "EUR"], OMXHEX: ["FI", "EUR"], SIX: ["CH", "CHF"], HKEX: ["HK", "HKD"], VIE: ["AT", "EUR"], TSX: ["CA", "CAD"], GPW: ["PL", "PLN"], NSE: ["IN", "INR"], ATHEX: ["GR", "EUR"], ASX: ["AU", "AUD"], KRX: ["KR", "KRW"], BMFBOVESPA: ["BR", "BRL"], BMV: ["MX", "MXN"], TWSE: ["TW", "TWD"], TASE: ["IL", "ILS"], SZSE: ["CN", "CNY"], SSE: ["CN", "CNY"], SGX: ["SG", "SGD"], TADAWUL: ["SA", "SAR"] };
const ANALYSE_PLACE = { NYSE: "New York (NYSE)", NASDAQ: "New York (Nasdaq)", EURONEXT: "Euronext", LSE: "Londres", OMXSTO: "Stockholm", XETR: "Francfort (Xetra)", TSE: "Tokyo", MIL: "Milan", OSL: "Oslo", OMXCOP: "Copenhague", BME: "Madrid", OMXHEX: "Helsinki", SIX: "Zurich (SIX)", HKEX: "Hong Kong", VIE: "Vienne", TSX: "Toronto", GPW: "Varsovie", NSE: "Bombay (NSE)", ATHEX: "Athènes", ASX: "Sydney", KRX: "Séoul", BMFBOVESPA: "São Paulo", BMV: "Mexico", TWSE: "Taipei", TASE: "Tel-Aviv", SZSE: "Shenzhen", SSE: "Shanghai", SGX: "Singapour", TADAWUL: "Riyad" };
// [nom avec article, pluriel pour « cotée en … », symbole]
const ANALYSE_DEV = { EUR: ["l'euro", "euros", "€"], USD: ["le dollar américain", "dollars américains", "$"], GBP: ["la livre sterling", "livres sterling", "£"], CHF: ["le franc suisse", "francs suisses", "CHF"], SEK: ["la couronne suédoise", "couronnes suédoises", "SEK"], NOK: ["la couronne norvégienne", "couronnes norvégiennes", "NOK"], DKK: ["la couronne danoise", "couronnes danoises", "DKK"], JPY: ["le yen", "yens", "¥"], CAD: ["le dollar canadien", "dollars canadiens", "CAD"], AUD: ["le dollar australien", "dollars australiens", "AUD"], PLN: ["le zloty", "zlotys", "PLN"], HKD: ["le dollar de Hong Kong", "dollars de Hong Kong", "HKD"], CNY: ["le yuan", "yuans", "CNY"], KRW: ["le won", "wons", "KRW"], INR: ["la roupie indienne", "roupies indiennes", "INR"], BRL: ["le real brésilien", "reals brésiliens", "BRL"], MXN: ["le peso mexicain", "pesos mexicains", "MXN"], ILS: ["le shekel", "shekels", "ILS"], SGD: ["le dollar de Singapour", "dollars de Singapour", "SGD"], ZAR: ["le rand", "rands", "ZAR"], TRY: ["la livre turque", "livres turques", "TRY"], TWD: ["le dollar de Taïwan", "dollars de Taïwan", "TWD"], SAR: ["le riyal saoudien", "riyals saoudiens", "SAR"], HUF: ["le forint", "forints", "HUF"], CZK: ["la couronne tchèque", "couronnes tchèques", "CZK"], RUB: ["le rouble", "roubles", "RUB"], UAH: ["la hryvnia", "hryvnias", "UAH"], PEN: ["le sol péruvien", "sols péruviens", "PEN"], IDR: ["la roupie indonésienne", "roupies indonésiennes", "IDR"], NZD: ["le dollar néo-zélandais", "dollars néo-zélandais", "NZD"] };
const analyseDevNom = cur => (ANALYSE_DEV[cur] || [cur, cur, cur]);
const analyseDu = cur => { const n = analyseDevNom(cur)[0]; return n.startsWith("le ") ? "du " + n.slice(3) : "de " + n; };
const analysePaysLe = cc => { const n = analysePaysNom(cc); if (!n) return ""; if (["Israël", "Singapour", "Hong Kong", "Chypre", "Malte", "Taïwan", "Monaco", "Jersey", "Guernesey", "Gibraltar"].includes(n)) return n; if (/^(États|Pays|Émirats|Philippines|îles|Bermudes|Bahamas)/.test(n)) return "les " + n; if (/^[AEIOUÉÎ]/i.test(n)) return "l'" + n; return (/e$/.test(n) && !["Mexique", "Cambodge", "Mozambique"].includes(n) ? "la " : "le ") + n; };
const analysePaysNom = cc => ANALYSE_PAYS[cc] || cc || "";
const analysePaysDe = cc => { const n = analysePaysNom(cc); if (!n) return ""; if (/^(îles|île) /i.test(n)) return "aux " + n.replace(/^île /, "île ").replace(/^îles /, "îles "); return ({ "États-Unis": "aux États-Unis", "Pays-Bas": "aux Pays-Bas", "Émirats arabes unis": "aux Émirats arabes unis", "Philippines": "aux Philippines", "Bahamas": "aux Bahamas", "Bermudes": "aux Bermudes", "Chypre": "à Chypre", "Malte": "à Malte", "Jersey": "à Jersey", "Guernesey": "à Guernesey", "Gibraltar": "à Gibraltar", "Singapour": "à Singapour", "Hong Kong": "à Hong Kong", "Monaco": "à Monaco", "Taïwan": "à Taïwan", "Israël": "en Israël", "Panama": "au Panama", "Japon": "au Japon", "Canada": "au Canada", "Brésil": "au Brésil", "Mexique": "au Mexique", "Royaume-Uni": "au Royaume-Uni", "Danemark": "au Danemark", "Luxembourg": "au Luxembourg", "Portugal": "au Portugal", "Pérou": "au Pérou", "Chili": "au Chili", "Kazakhstan": "au Kazakhstan", "Qatar": "au Qatar", "Maroc": "au Maroc", "Nigeria": "au Nigeria", "Viêt Nam": "au Viêt Nam", "Liechtenstein": "au Liechtenstein", "Curaçao": "à Curaçao" })[n] || "en " + n; };

/* ---------- Petits outils ---------- */
const ANALYSE_ok = x => x != null && isFinite(x);
const analyseP1 = v => pct(v, 1, false), analyseP0 = v => pct(v, 0, false);
const analysePts = d => F1.format(Math.abs(d * 100)).replace(/,0$/, "") + " point" + (Math.abs(d * 100) >= 2 ? "s" : "");
const analyseAns = x => F1.format(x).replace(/,0$/, "") + " an" + (x >= 2 ? "s" : "");
const analyseE100 = (v, cur) => F1.format(v * 100).replace(/,0$/, "") + " " + (CUR[cur] || cur || "€");
const analyseFois = x => F0.format(x) + " fois";
const analyseCap = t => t.charAt(0).toUpperCase() + t.slice(1);
const analyseN = (n, s, p) => n + " " + (n > 1 ? (p || s + "s") : s);
function analyseTxt(s) { return norm([s.name, s.desc, s.fiche && s.fiche.fait, s.fiche && s.fiche.argent, s.fiche && s.fiche.depend].filter(Boolean).join(" ")); }
function analyseMois(iso) { const d = new Date(iso + "T00:00:00Z"); return isNaN(d) ? null : (new Date(TODAY + "T00:00:00Z") - d) / (30.44 * 864e5); }
function analyseDateFin(c) { const L = c.years.length - 1, fy = /^\d\d-\d\d$/.test(c.fyEnd || "") ? c.fyEnd : "12-31"; return `${c.years[L]}-${fy}`; }
const ANALYSE_YLD = {};
function analyseMedYld(sector) { if (ANALYSE_YLD[sector] !== undefined) return ANALYSE_YLD[sector]; const l = R.companies.filter(x => x.sector === sector && !x.missing).map(x => { const v = valo(x); return v && v.yld > 0 ? v.yld : null; }).filter(ANALYSE_ok); return ANALYSE_YLD[sector] = l.length >= 5 ? median(l) : null; }

/* ---------- Le contexte d'une entreprise : pays, cotation, devises, secteur ---------- */
function analyseCtx(s, c) {
  if (!ANALYSE_WD) analyseCharge();
  const wd = (ANALYSE_WD && ANALYSE_WD.societes && ANALYSE_WD.societes[s.id]) || null;
  const bx = String(s.tv || "").split(":")[0], tk = String(s.tv || "").split(":")[1] || s.ticker;
  const legal = s.isin ? s.isin.slice(0, 2).toUpperCase() : null, offshore = !!(legal && ANALYSE_OFF.has(legal));
  let pays = null, paysSrc = null;
  if (wd && wd.siegeHK) { pays = "HK"; paysSrc = "wikidata"; }
  else if (wd && (wd.paysSiege || wd.pays)) { pays = wd.paysSiege || wd.pays; paysSrc = "wikidata"; }
  else if (legal && !offshore && /^[A-Z]{2}$/.test(legal) && legal !== "XS" && legal !== "EU") { pays = legal; paysSrc = "isin"; }
  else if (ANALYSE_BOURSE[bx] && ANALYSE_BOURSE[bx][0]) { pays = ANALYSE_BOURSE[bx][0]; paysSrc = "bourse"; }
  else if (s.region === "FR" || s.region === "US") { pays = s.region; paysSrc = "region"; }
  if (pays === "HK" && legal === "CN") pays = "CN"; // actions H : société de Chine continentale
  const p = typeof pxOf === "function" ? pxOf(s) : null;
  let curCot = (p && p.cur) || (ANALYSE_BOURSE[bx] || [])[1] || null; if (curCot === "ILA") curCot = "ILS"; if (curCot === "GBX" || curCot === "GBp") curCot = "GBP";
  const curCpt = (c && c.currency) || s.currency || null;
  const txt = analyseTxt(s);
  return { wd, bx, tk, legal, offshore, pays, paysSrc, curCot, curCpt, txt, p, v: typeof valo === "function" && !s.missing ? valo(s) : null, bank: isBank(s), pea: peaOk(s), sector: s.sector,
    usList: bx === "NYSE" || bx === "NASDAQ" || !!s.sec, divs: s.missing ? null : s.divPaid > 0.5 };
}
const ANALYSE_KW = {
  auto: /automobil|\bvoitures?\b|vehicules? (electriques?|particuliers|utilitaires)|constructeur (auto|de voitures)|equipementier auto|\bpneus?\b|camions?\b/,
  mine: /\bmines?\b|minier|miniere|extraction (de|du|d)|cuivre|\bor\b|lithium|nickel|\bzinc\b|minerai|charbon|uranium|platine|argent metal/,
  lourd: /ciment|acier|siderurg|aluminium|engrais/,
  pharma: /pharma|medicaments?|vaccins?|biotech|therapeuti|molecules?/,
  assur: /assur|reassur/,
  semi: /semi.?conducteurs?|\bpuces?\b|microprocesseurs?|processeurs|lithographie|tranches de silicium|memoires? (vive|flash)/,
  aerien: /compagnie aerienne|transport aerien|vols? (reguliers|low cost)|\bavions? de ligne\b(?!.{0,20}(fabrique|construi|moteurs?))/,
  defense: /defense|armement|militaire|munitions?|missiles?/,
  telecom: /operateur|telecom|reseau mobile|fibre|forfaits?|abonnes? (mobile|internet)/,
  reseau: /electricite|\bgaz\b|\beau\b|reseaux? (de distribution|electrique|de transport)|nucleaire|renouvelable/,
  petrole: /petrole|\bgaz\b|raffin|gnl|forage|hydrocarbure|petroli/,
};

/* =====================================================================
   Règles de contexte. Chaque règle : à qui elle s'applique (si), dans quelle colonne (col), son poids (1 à 3),
   son titre, son explication (avec les chiffres de l'entreprise quand il y en a) et sa source.
   ===================================================================== */
const ANALYSE_REGLES = [
  // Chine continentale et Hong Kong
  { id: "cn_regl", col: "defaut", poids: 3, si: x => x.pays === "CN", titre: "Risque réglementaire et intervention de l'État en Chine",
    detail: x => "Les autorités chinoises peuvent changer vite les règles d'un secteur ou intervenir dans la gestion des entreprises : depuis 2020, la technologie, l'éducation privée, les jeux vidéo et l'immobilier ont été visés. Le régulateur américain des marchés (SEC) demande aux sociétés liées à la Chine de décrire ce risque à leurs actionnaires.", src: "sec_chine" },
  { id: "cn_marche", col: "defaut", poids: 2, si: x => x.pays === "CN" || x.pays === "HK", titre: "Marché boursier chinois instable",
    detail: x => "Les actions chinoises ont connu de fortes secousses, comme le krach de l'été 2015 ou la chute des valeurs technologiques en 2021 et 2022, suivies de mesures de soutien des autorités. Le cours peut donc varier fortement pour des raisons qui ne viennent pas des comptes de l'entreprise. Le FMI suit ces risques dans ses rapports annuels sur la Chine.", src: "fmi_chine" },
  { id: "cn_vie", col: "defaut", poids: 2, si: x => x.pays === "CN" && x.offshore, titre: "Montage juridique à l'étranger (structure dite VIE possible)",
    detail: x => `La société cotée est immatriculée ${analysePaysDe(x.legal)}, alors que son activité est en Chine. Dans les secteurs fermés aux capitaux étrangers, les groupes chinois passent souvent par des contrats avec des sociétés chinoises (structure dite VIE) : l'actionnaire détient alors des droits contractuels, pas l'entreprise chinoise elle-même, et ces contrats pourraient être contestés en Chine. Le rapport annuel indique si l'entreprise utilise ce montage.`, src: "sec_vie" },
  { id: "cn_hfcaa", col: "defaut", poids: 1, si: x => (x.pays === "CN" || x.pays === "HK") && x.usList, titre: "Cotation américaine sous surveillance (loi HFCAA)",
    detail: x => "Depuis 2020, la loi américaine HFCAA peut faire retirer de la cote aux États-Unis une société dont l'auditeur ne peut pas être contrôlé par le régulateur américain pendant deux années de suite. Fin 2022, ce régulateur a indiqué avoir obtenu cet accès en Chine continentale et à Hong Kong, mais il peut revenir sur cette décision.", src: "hfcaa" },
  { id: "cn_tensions", col: "defaut", poids: 2, si: x => x.pays === "CN", poidsDe: x => ANALYSE_KW.semi.test(x.txt) || ANALYSE_KW.auto.test(x.txt) || x.sector === "tech" ? 3 : 2, titre: "Tensions commerciales avec les États-Unis et l'Europe",
    detail: x => "Droits de douane, contrôles des exportations de technologies (puces, machines) et enquêtes antisubventions de l'Union européenne (par exemple sur les voitures électriques chinoises en 2024) peuvent toucher ses ventes à l'étranger ou son accès à certains composants.", src: "ce_chine" },
  { id: "cn_immo", col: "defaut", poids: 3, si: x => x.pays === "CN" && x.sector === "immo", titre: "Crise de l'immobilier chinois",
    detail: x => "Depuis 2021, plusieurs grands promoteurs chinois n'ont pas pu rembourser leurs dettes et les ventes de logements neufs ont fortement baissé. Le FMI cite ce secteur parmi les principaux risques de l'économie chinoise.", src: "fmi_chine" },
  { id: "cn_h", col: "contexte", poids: 1, si: x => x.legal === "CN" && x.bx === "HKEX", titre: "Actions dites H, cotées à Hong Kong",
    detail: x => "Société de Chine continentale dont les actions s'échangent à Hong Kong, en dollars de Hong Kong. Les mêmes sociétés ont souvent aussi des actions réservées surtout aux investisseurs chinois, cotées à Shanghai ou Shenzhen, à un prix qui peut être différent.", src: "hkex" },
  { id: "hk", col: "contexte", poids: 1, si: x => x.pays === "HK", titre: "Siège à Hong Kong",
    detail: x => "Hong Kong est une région administrative spéciale de la Chine. Beaucoup de sociétés de Hong Kong réalisent une grande partie de leur activité en Chine continentale : les risques chinois peuvent les toucher aussi.", src: "hkex" },
  // Russie et pays émergents
  { id: "ru", col: "defaut", poids: 3, si: x => x.pays === "RU", titre: "Sanctions contre la Russie",
    detail: x => "Depuis 2014, et surtout depuis 2022, l'Union européenne applique des sanctions contre la Russie. Des activités ou des actifs liés à la Russie peuvent être bloqués, dépréciés ou difficiles à vendre, et certaines actions ne peuvent plus être échangées normalement.", src: "ue_russie" },
  { id: "emerg", col: "defaut", poids: 1, si: x => x.pays && ANALYSE_EMERG.has(x.pays) && x.pays !== "CN", titre: x => `Économie émergente : ${analysePaysNom(x.pays)}`,
    detail: x => `Le FMI classe ${analysePaysLe(x.pays)} parmi les économies émergentes. Les Bourses de ces pays connaissent en général des variations plus fortes, et les règles (fiscalité, mouvements de capitaux, protection des actionnaires minoritaires) peuvent changer plus vite que dans les pays développés.`, src: "fmi_groupes" },
  { id: "dev_emerg", col: "defaut", poids: 2, si: x => ANALYSE_EMCUR.has(x.curCot) || ANALYSE_EMCUR.has(x.curCpt), titre: x => `Devise de pays émergent : ${analyseDevNom(ANALYSE_EMCUR.has(x.curCpt) ? x.curCpt : x.curCot)[0]}`,
    detail: x => { const cur = ANALYSE_EMCUR.has(x.curCpt) ? x.curCpt : x.curCot; return `${ANALYSE_EMCUR.has(x.curCpt) ? `Ses comptes sont tenus en ${analyseDevNom(cur)[1]}` : `L'action est cotée en ${analyseDevNom(cur)[1]}`}. Les devises des pays émergents peuvent perdre beaucoup de valeur face à l'euro en peu de temps, ce qui réduit la valeur en euros des bénéfices, des dividendes et de l'action.${analyseFxTxt(cur)}`; }, src: "bce_change" },
  // Devises de cotation (pour un épargnant en euros)
  { id: "eur", col: "contexte", poids: 1, si: x => x.curCot === "EUR", titre: "Cotée en euros",
    detail: x => `Pas de risque de change direct pour un épargnant en euros.${x.curCpt && x.curCpt !== "EUR" ? ` Ses comptes sont en revanche publiés en ${analyseDevNom(x.curCpt)[1]} : la conversion en euros fait varier ses chiffres.` : " L'entreprise peut en revanche réaliser une partie de ses ventes dans d'autres devises."}`, src: "bce_change" },
  { id: "change", col: "contexte", poids: 2, si: x => x.curCot && !["EUR", "DKK", "HKD", "CNY"].includes(x.curCot) && !ANALYSE_EMCUR.has(x.curCot), titre: x => `Cotée en ${analyseDevNom(x.curCot)[1]} : risque de change`,
    detail: x => `Pour un épargnant en euros, la valeur de l'action et des dividendes dépend aussi du cours ${analyseDu(x.curCot)} face à l'euro.${analyseFxTxt(x.curCot)}`, src: "bce_change" },
  { id: "dkk", col: "contexte", poids: 1, si: x => x.curCot === "DKK", titre: "Cotée en couronnes danoises, liées à l'euro",
    detail: x => `Le Danemark maintient sa couronne dans une marge étroite autour d'un cours fixe face à l'euro (mécanisme de change MCE II) : le risque de change est faible pour un épargnant en euros.${analyseFxTxt("DKK")}`, src: "mce2" },
  { id: "hkd", col: "contexte", poids: 1, si: x => x.curCot === "HKD", titre: "Cotée en dollars de Hong Kong, liés au dollar américain",
    detail: x => `Le dollar de Hong Kong est maintenu dans une marge étroite autour d'un cours fixe face au dollar américain. Pour un épargnant en euros, le risque de change est donc surtout celui du dollar américain face à l'euro.${analyseFxTxt("HKD")}`, src: "hkma" },
  { id: "cny", col: "contexte", poids: 1, si: x => x.curCot === "CNY" || x.curCpt === "CNY", titre: "Comptes ou cotation en yuans",
    detail: x => `Le yuan n'est pas une devise librement convertible : la banque centrale chinoise fixe chaque jour un cours de référence et limite ses variations. Sa valeur en euros varie néanmoins.${analyseFxTxt("CNY")}`, src: "fmi_chine" },
  { id: "devcpt", col: "contexte", poids: 1, si: x => x.curCpt && x.curCot && x.curCpt !== x.curCot && x.curCot !== "EUR" && !ANALYSE_EMCUR.has(x.curCpt) && x.curCpt !== "CNY", titre: x => `Comptes en ${analyseDevNom(x.curCpt)[1]}, action en ${analyseDevNom(x.curCot)[1]}`,
    detail: x => "Les chiffres de ses comptes et le cours de l'action ne sont pas dans la même devise : le site convertit avec les taux de la BCE pour calculer le prix rapporté au bénéfice et le rendement.", src: "bce_change" },
  // Fiscalité et frais propres au pays
  { id: "us_div", col: "contexte", poids: 2, si: x => (x.legal === "US" || (!x.legal && x.pays === "US")) && x.divs !== false, titre: "Dividendes américains : retenue à la source",
    detail: x => analyseCap((x.divs ? "" : "Si elle verse un dividende : ") + "les États-Unis prélèvent 30 % sur les dividendes versés à un non-résident. La convention fiscale entre la France et les États-Unis ramène ce taux à 15 % si vous remplissez le formulaire W-8BEN chez votre courtier ; ces 15 % donnent droit à un crédit d'impôt en France."), src: "irs_w8" },
  { id: "ch_div", col: "contexte", poids: 2, si: x => x.legal === "CH" && x.divs !== false, titre: "Dividendes suisses : impôt anticipé de 35 %",
    detail: x => analyseCap((x.divs ? "" : "Si elle verse un dividende : ") + "la Suisse retient 35 % sur les dividendes. Pour un résident de France, la convention fiscale limite l'impôt suisse à 15 % : les 20 % restants se récupèrent auprès de l'administration fiscale suisse, avec un formulaire de remboursement."), src: "afc_ch" },
  { id: "uk_stamp", col: "contexte", poids: 1, si: x => x.legal === "GB" && x.bx === "LSE", titre: "Droit de timbre britannique à l'achat",
    detail: x => "L'achat d'actions de sociétés britanniques supporte en général une taxe de 0,5 % (Stamp Duty Reserve Tax), prélevée par le courtier. Le Royaume-Uni ne prélève pas d'impôt à la source sur les dividendes.", src: "uk_stamp" },
  { id: "ttf", col: "contexte", poids: 1, si: x => x.legal === "FR" && x.v && x.v.capE > 1e9, titre: "Taxe sur les transactions financières à l'achat",
    detail: x => `L'achat d'actions de sociétés françaises dont la valeur en Bourse dépasse 1 milliard d'euros supporte une taxe de 0,4 % depuis le 1er avril 2025, prélevée par le courtier. La liste officielle est fixée chaque 1er décembre ; au cours actuel, ${x.v ? capFmt(x.v.capE) : ""} de capitalisation.`, src: "ttf" },
  // Secteur
  { id: "auto", col: "defaut", poids: 2, si: x => ANALYSE_KW.auto.test(x.txt) && ["conso", "industrie"].includes(x.sector), titre: "Automobile : secteur cyclique en pleine transition",
    detail: x => "Les ventes de véhicules suivent la conjoncture et le coût du crédit : elles baissent nettement en période de récession. Le passage à l'électrique demande de gros investissements, et l'Union européenne impose une baisse forte des émissions de CO2 des voitures neuves d'ici 2035.", src: "co2_auto" },
  { id: "petrole", col: "defaut", poids: 2, si: x => x.sector === "energie" && ANALYSE_KW.petrole.test(x.txt), titre: "Résultats liés aux prix du pétrole et du gaz",
    detail: x => "Ses ventes et ses bénéfices suivent les prix mondiaux du pétrole et du gaz, qui peuvent varier de moitié en quelques mois. Une très bonne année peut être suivie d'une année faible sans que l'entreprise ait changé.", src: "bm_mp" },
  { id: "carbone", col: "contexte", poids: 1, si: x => x.sector === "energie" || ANALYSE_KW.lourd.test(x.txt) || (x.sector === "services" && ANALYSE_KW.reseau.test(x.txt)), titre: "Prix du carbone en Europe",
    detail: x => "En Europe, les centrales, raffineries, aciéries et cimenteries doivent acheter des quotas pour chaque tonne de CO2 émise (système SEQE-UE). Un prix du carbone plus élevé augmente leurs coûts ; depuis 2026, l'Union européenne applique aussi un ajustement carbone sur certaines importations (acier, ciment, aluminium, engrais).", src: "eu_ets", src2: "cbam" },
  { id: "mine", col: "defaut", poids: 2, si: x => x.sector === "materiaux" && ANALYSE_KW.mine.test(x.txt), titre: "Dépendance aux prix des métaux",
    detail: x => "Ses ventes dépendent du prix mondial des métaux qu'elle extrait, qui peut varier de plus d'un tiers en un an. Une mine dépend aussi de ses permis d'exploitation, de ses coûts d'énergie, de la teneur du minerai et des règles du pays où elle se trouve.", src: "bm_mp" },
  { id: "materiaux", col: "defaut", poids: 1, si: x => x.sector === "materiaux" && !ANALYSE_KW.mine.test(x.txt), titre: "Secteur cyclique : matériaux",
    detail: x => "Chimie, ciment, acier, papier : la demande suit l'industrie et la construction, et les coûts suivent l'énergie et les matières premières. Les bénéfices peuvent varier fortement d'une année à l'autre.", src: "bm_mp" },
  { id: "banque", col: "contexte", poids: 2, si: x => x.bank && (!ANALYSE_KW.assur.test(x.txt) || /banque|bancaire|credits? /.test(x.txt)), titre: "Banque : métier très encadré",
    detail: x => `Une banque doit garder un minimum de fonds propres face aux crédits qu'elle accorde (règles dites de Bâle III).${x.pays && ANALYSE_EURO.has(x.pays) ? " Dans la zone euro, les grandes banques sont surveillées directement par la BCE." : ""} Ses résultats dépendent des taux d'intérêt et du coût des crédits non remboursés, qui monte quand l'économie ralentit.`, src: x => x.pays && ANALYSE_EURO.has(x.pays) ? "bce_ssm" : "bri_bale" },
  { id: "assur", col: "contexte", poids: 2, si: x => x.sector === "finance" && ANALYSE_KW.assur.test(x.txt), titre: "Assureur : solvabilité encadrée et catastrophes",
    detail: x => "Un assureur doit prouver qu'il peut payer les sinistres même dans un scénario difficile (règles Solvabilité II en Europe). Une année de catastrophes naturelles (tempêtes, inondations, incendies) peut peser fortement sur ses résultats ; ses placements suivent aussi les marchés et les taux.", src: "eiopa" },
  { id: "pharma", col: "defaut", poids: 2, si: x => x.sector === "sante" && ANALYSE_KW.pharma.test(x.txt), titre: "Dépendance aux brevets et aux autorisations",
    detail: x => "Un brevet protège un médicament pendant 20 ans à partir de son dépôt. À son expiration, des copies moins chères (génériques, biosimilaires) arrivent et les ventes du médicament baissent souvent fortement. Chaque nouveau médicament doit aussi être autorisé (EMA en Europe, FDA aux États-Unis), et les essais peuvent échouer.", src: "inpi", src2: "ema" },
  { id: "pharma_us", col: "contexte", poids: 1, si: x => x.sector === "sante" && ANALYSE_KW.pharma.test(x.txt) && (x.pays === "US" || x.usList), titre: "Prix des médicaments négociés aux États-Unis",
    detail: x => "Depuis 2026, l'assurance maladie publique américaine (Medicare) applique des prix négociés pour une première liste de médicaments très vendus, et la liste s'allonge chaque année. Les laboratoires concernés peuvent voir baisser leurs prix aux États-Unis.", src: "cms" },
  { id: "semi", col: "defaut", poids: 2, si: x => x.sector === "tech" && ANALYSE_KW.semi.test(x.txt), titre: "Semi-conducteurs : cycles et contrôles des exportations",
    detail: x => "Les ventes de puces suivent des cycles marqués : elles peuvent chuter quand les clients ont trop de stocks. Depuis 2022, les États-Unis, puis les Pays-Bas et le Japon, limitent aussi l'exportation de certaines puces et machines de fabrication vers la Chine.", src: "bis_export" },
  { id: "immo", col: "defaut", poids: 2, si: x => x.sector === "immo", titre: "Sensibilité aux taux d'intérêt",
    detail: x => "Une foncière emprunte beaucoup pour acheter ses immeubles. Quand les taux d'intérêt montent, sa dette coûte plus cher et la valeur de ses immeubles baisse en général : c'est ce qui s'est passé en 2022 et 2023, quand la BCE a relevé ses taux de 0 % à 4 %.", src: "bce_taux" },
  { id: "reit", col: "contexte", poids: 1, si: x => x.sector === "immo", titre: "Foncière cotée : beaucoup de bénéfice reversé",
    detail: x => "Les sociétés immobilières cotées sous un statut fiscal spécial (REIT aux États-Unis, SIIC en France) doivent reverser l'essentiel de leurs revenus locatifs en dividendes, en échange d'une exonération d'impôt sur les sociétés. Une part du bénéfice reversée très élevée est donc normale pour elles.", src: "reit" },
  { id: "regule", col: "contexte", poids: 2, si: x => x.sector === "services", titre: "Services aux collectivités : prix encadrés",
    detail: x => `Une partie des tarifs (réseaux d'électricité, de gaz ou d'eau) est fixée ou contrôlée par un régulateur${x.pays === "FR" ? ", comme la Commission de régulation de l'énergie en France" : ""}. Les revenus sont plus prévisibles, mais les hausses de prix sont limitées et les investissements lourds se financent souvent par la dette.`, src: "cre" },
  { id: "telecom", col: "contexte", poids: 1, si: x => x.sector === "telecom" && ANALYSE_KW.telecom.test(x.txt), titre: "Télécoms : secteur régulé, gros investissements",
    detail: x => "Les fréquences, les prix de gros et le partage des réseaux sont encadrés par un régulateur (l'Arcep en France). Les réseaux (fibre, 5G) demandent des investissements lourds et réguliers, souvent financés par la dette.", src: "arcep" },
  { id: "aerien", col: "defaut", poids: 2, si: x => ANALYSE_KW.aerien.test(x.txt) && ["industrie", "conso"].includes(x.sector), titre: "Transport aérien : carburant et conjoncture",
    detail: x => "Le carburant est l'un des premiers coûts d'une compagnie aérienne, et la demande de voyages chute en cas de crise (la pandémie de 2020 a cloué la plupart des avions au sol). Les marges du secteur restent faibles en moyenne.", src: "iata" },
  { id: "defense", col: "contexte", poids: 1, si: x => ANALYSE_KW.defense.test(x.txt) && ["industrie", "tech"].includes(x.sector), titre: "Défense : clients publics, exportations encadrées",
    detail: x => "Ses clients sont surtout des États : les commandes suivent les budgets militaires, et chaque exportation d'armement exige une autorisation du gouvernement, selon des critères communs à l'Union européenne.", src: "armes" },
  // Cotation
  { id: "pea_oui", col: "contexte", poids: 2, si: x => x.pea === true, titre: "Éligible au PEA",
    detail: x => "Société dont le siège est dans l'Union européenne ou l'Espace économique européen : ses actions peuvent aller dans un PEA. Après 5 ans, les gains d'un PEA ne paient que les prélèvements sociaux (18,6 % en 2026), au lieu de 31,4 % sur un compte-titres.", src: "pea" },
  { id: "pea_non", col: "contexte", poids: 2, si: x => x.pea === false, titre: "Pas de PEA : compte-titres seulement",
    detail: x => `Son siège ${x.legal ? `(${analysePaysNom(x.legal)}, d'après son code ISIN)` : ""} est hors de l'Union européenne et de l'Espace économique européen : ses actions vont dans un compte-titres. Un ETF éligible au PEA peut en revanche la contenir indirectement.`.replace("  ", " "), src: "pea" },
  { id: "us_etr", col: "contexte", poids: 1, si: x => (x.bx === "NYSE" || x.bx === "NASDAQ") && x.pays && x.pays !== "US" && x.legal !== "US", titre: "Société étrangère cotée aux États-Unis",
    detail: x => `Société ${x.pays ? `basée ${analysePaysDe(x.pays)}` : "étrangère"} cotée à New York. Les sociétés étrangères y publient un rapport annuel (formulaire 20-F ou 40-F), mais ne sont pas obligées de publier des comptes trimestriels aussi détaillés que les sociétés américaines.`, src: "sec_fpi" },
  { id: "adr", col: "contexte", poids: 1, si: x => x.sec && x.bx !== "NYSE" && x.bx !== "NASDAQ", titre: "Aussi cotée à New York",
    detail: x => `En plus de ${ANALYSE_PLACE[x.bx] || x.bx}, ses titres s'échangent à New York sous le code ${x.sec}, en dollars, souvent sous forme de certificats représentant des actions (ADR). Le prix suit celui de la cotation principale, converti en dollars.`, src: "sec_fpi" },
];

/* ---------- Taux de change BCE : fourchette et variation sur 5 ans ---------- */
function analyseFx(cur) {
  const a = ANALYSE_WD && ANALYSE_WD.devises && ANALYSE_WD.devises[cur]; if (!a || a.length < 24) return null;
  const last = a[a.length - 1], i5 = Math.max(0, a.length - 61), w = a.slice(i5), vals = w.map(x => x[1]);
  return { min: Math.min(...vals), max: Math.max(...vals), first: w[0], last, var5: w[0][1] / last[1] - 1 }; // var5 : évolution de la devise face à l'euro
}
function analyseFxTxt(cur) {
  const f = analyseFx(cur); if (!f) return "";
  const dig = f.last[1] >= 100 ? 0 : f.last[1] >= 10 ? 1 : f.last[1] >= 2 ? 2 : 3, fm = v => nf(dig).format(v), sym = analyseDevNom(cur)[2];
  const y0 = f.first[0].slice(0, 4), nom = analyseDevNom(cur)[0], Nom = nom.charAt(0).toUpperCase() + nom.slice(1);
  return ` Depuis ${mLong(f.first[0])}, 1 € a valu entre ${fm(f.min)} et ${fm(f.max)} ${sym} (moyennes mensuelles de la BCE). ${Nom} a ${f.var5 >= 0 ? "gagné" : "perdu"} ${analyseP0(Math.abs(f.var5))} face à l'euro sur cette période.`;
}

/* =====================================================================
   Facteurs financiers : calculés sur tous les exercices lus par le site
   ===================================================================== */
function analyseFinance(s, c, out) {
  const Y = c.years || [], L = Y.length - 1; if (L < 0 || !c.fin) return;
  const A = k => c.fin[k] || [], at = (k, i) => { const a = A(k); return i >= 0 && i < a.length && ANALYSE_ok(a[i]) ? a[i] : null; };
  const cur = c.currency, B = x => big(x, cur), bank = isBank(s), med = MED[s.sector] || {}, medOk = (med.n || 0) >= 3, e100 = v => analyseE100(v, cur);
  const rep = c.sources && c.sources[0] && c.sources[0].report;
  const srcC = (y0, y1) => ({ source: `Comptes annuels ${y0 === y1 ? y1 : `de ${y0} à ${y1}`}${s.sec || s.region === "US" ? " (SEC)" : c.lei ? " (ESEF)" : ""}`, url: rep || officielLink(s) || "" });
  const add = (col, id, poids, titre, detail, src) => out[col].push({ id, titre, detail, poids, ...src });
  const V = (s.sector && medOk) ? ` Médiane des ${med.n} entreprises du secteur suivies par le site : ` : null;

  // 1. Croissance sur plusieurs années
  const ca = Y.map((_, i) => at("ca", i)), i0 = ca.findIndex(x => x > 0), g = [];
  for (let i = Math.max(1, i0 + 1); i <= L; i++) if (ca[i - 1] > 0 && ca[i] != null) g.push([Y[i], ca[i] / ca[i - 1] - 1]);
  const ups = g.filter(x => x[1] > 0).length, mot = bank ? "revenus" : "ventes", Mot = bank ? "Revenus" : "Ventes";
  if (i0 >= 0 && ca[L] > 0 && L - i0 >= 2) {
    const cagr = Math.pow(ca[L] / ca[i0], 1 / (L - i0)) - 1, base = `${Mot} passé${bank ? "s" : "es"} de ${B(ca[i0])} en ${Y[i0]} à ${B(ca[L])} en ${Y[L]}, soit ${pct(cagr)} par an en moyenne. En hausse ${ups} année${ups > 1 ? "s" : ""} sur ${g.length}.`;
    const vs = medOk && med.g1 != null ? `${V}${pct(med.g1)} sur la dernière année.` : "";
    if (cagr >= 0.05 && ups === g.length) add("valorise", "croissance", cagr >= 0.1 ? 3 : 2, `Croissance régulière des ${mot}`, base + vs, srcC(Y[i0], Y[L]));
    else if (cagr >= 0.05 && g.length >= 3 && ups >= g.length - 1) add("valorise", "croissance", 2, `${Mot} en hausse, avec une seule année de recul`, base + vs, srcC(Y[i0], Y[L]));
    else if (cagr >= 0.05) add("valorise", "croissance", 1, `${Mot} en hausse sur la période, mais irrégulières`, base + vs, srcC(Y[i0], Y[L]));
    else if (cagr <= -0.02) add("defaut", "recul", cagr <= -0.08 ? 3 : 2, `${Mot} en recul sur plusieurs années`, base, srcC(Y[i0], Y[L]));
    else if (g.length >= 3 && ups <= g.length / 2 && cagr < 0.03) add("defaut", "irreg", 1, `${Mot} sans progression nette`, base, srcC(Y[i0], Y[L]));
  }
  const pire = g.slice().sort((a, b) => a[1] - b[1])[0];
  if (pire && pire[1] <= -0.15) add("defaut", "chute", 2, `${Mot} en forte baisse en ${pire[0]}`, `${Mot} en baisse de ${analyseP0(-pire[1])} sur l'exercice ${pire[0]}. Une telle chute montre que l'activité peut être très sensible à la conjoncture, aux prix ou à la perte d'un client ou d'une activité (cession).`, srcC(pire[0] - 1, pire[0]));

  // 2. Marges : niveau face au secteur et tendance
  if (!bank) {
    const ms = Y.map((_, i) => ca[i] > 0 && at("ebit", i) != null ? at("ebit", i) / ca[i] : null), vi = ms.map((m, i) => m != null ? i : -1).filter(i => i >= 0);
    const mL = ms[L], mm = medOk ? med.marge : null;
    if (mL != null && mm != null) {
      if (mL >= mm + Math.max(0.05, Math.abs(mm) * 0.4)) add("valorise", "marge_sect", 3, "Marge nettement supérieure à son secteur", `Une fois payés salaires, achats et frais, il lui reste ${e100(mL)} sur 100 ${CUR[cur] || cur} de ventes (exercice ${Y[L]}).${V}${analyseP1(mm)}. Une marge élevée laisse plus de place si les coûts montent ou si les prix baissent.`, srcC(Y[L], Y[L]));
      else if (mL < 0) add("defaut", "marge_neg", 3, "Activité à perte", `L'activité coûte plus qu'elle ne rapporte : ${analyseP1(mL)} de marge d'exploitation sur l'exercice ${Y[L]}.${V}${analyseP1(mm)}.`, srcC(Y[L], Y[L]));
      else if (mL <= mm - Math.max(0.04, Math.abs(mm) * 0.4)) add("defaut", "marge_sect", 2, "Marge plus faible que son secteur", `Il lui reste ${e100(mL)} sur 100 ${CUR[cur] || cur} de ventes une fois les coûts payés (exercice ${Y[L]}).${V}${analyseP1(mm)}. Une marge mince laisse peu de place si les coûts montent.`, srcC(Y[L], Y[L]));
    }
    if (vi.length >= 3) {
      const a = vi[0], d = mL != null ? mL - ms[a] : null, sp = Math.max(...vi.map(i => ms[i])) - Math.min(...vi.map(i => ms[i]));
      if (d != null && d >= 0.03) add("valorise", "marge_tend", 2, "Marge en progression", `Sa marge d'exploitation est passée de ${analyseP1(ms[a])} en ${Y[a]} à ${analyseP1(mL)} en ${Y[L]}, soit ${analysePts(d)} de plus : elle garde davantage sur chaque vente.`, srcC(Y[a], Y[L]));
      else if (d != null && d <= -0.03) add("defaut", "marge_tend", 2, "Marge en baisse", `Sa marge d'exploitation est passée de ${analyseP1(ms[a])} en ${Y[a]} à ${analyseP1(mL)} en ${Y[L]}, soit ${analysePts(d)} de moins : coûts en hausse, prix sous pression ou activité moins rentable.`, srcC(Y[a], Y[L]));
      else if (vi.length >= 4 && sp <= 0.03 && mL >= 0.08) add("valorise", "marge_stab", 1, "Marge stable", `Sa marge d'exploitation est restée entre ${analyseP1(Math.min(...vi.map(i => ms[i])))} et ${analyseP1(Math.max(...vi.map(i => ms[i])))} de ${Y[a]} à ${Y[L]} : des résultats réguliers.`, srcC(Y[a], Y[L]));
    }
  }

  // 3. Bénéfices : régularité, bénéfice par action
  const nets = Y.map((_, i) => at("net", i)), nv = nets.filter(x => x != null), pertes = Y.filter((_, i) => nets[i] != null && nets[i] < 0);
  if (nv.length >= 3 && !pertes.length && nets[L] != null) add("valorise", "benef", nv.length >= 5 ? 2 : 1, "Bénéficiaire chaque année", `Bénéfice net positif sur chacun des ${nv.length} exercices lus par le site (${Y[nets.findIndex(x => x != null)]} à ${Y[L]}) : ${B(nets[L])} sur le dernier.`, srcC(Y[0], Y[L]));
  else if (pertes.length >= 2) add("defaut", "pertes", 3, `Pertes ${pertes.length} années sur ${nv.length}`, `L'entreprise a perdu de l'argent en ${pertes.join(", ").replace(/, (\d+)$/, " et $1")}${nets[L] != null ? ` ; sur le dernier exercice, ${nets[L] >= 0 ? `bénéfice de ${B(nets[L])}` : `perte de ${B(-nets[L])}`}` : ""}.`, srcC(Y[0], Y[L]));
  else if (pertes.length === 1 && nets[L] < 0) add("defaut", "perte", 3, `Perte sur l'exercice ${Y[L]}`, `Perte de ${B(-nets[L])} en ${Y[L]}, après des bénéfices les années précédentes. Le rapport annuel en donne la raison (charge ponctuelle ou baisse de l'activité).`, srcC(Y[L], Y[L]));
  const eps = Y.map((_, i) => at("eps", i)), e0 = eps.findIndex(x => x > 0);
  // Division d'actions (« split ») : le bénéfice par action chute alors que le bénéfice tient. On ne compare pas les chiffres par action de part et d'autre.
  const split = new Set(); for (let i = 1; i <= L; i++) if (eps[i] > 0 && eps[i - 1] > 0 && nets[i] > 0 && nets[i - 1] > 0 && (eps[i] / eps[i - 1]) / (nets[i] / nets[i - 1]) < 0.7) split.add(i);
  const splitEntre = (a, b) => [...split].some(i => i > a && i <= b);
  if (e0 >= 0 && eps[L] > 0 && L - e0 >= 2 && nets[L] > 0 && !splitEntre(e0, L)) {
    const ge = Math.pow(eps[L] / eps[e0], 1 / (L - e0)) - 1;
    if (ge >= 0.1) add("valorise", "bpa", 2, "Bénéfice par action en forte hausse", `Le bénéfice par action est passé de ${eur(eps[e0], 2, cur)} en ${Y[e0]} à ${eur(eps[L], 2, cur)} en ${Y[L]}, soit ${pct(ge)} par an. C'est la part du bénéfice qui revient à chaque action.`, srcC(Y[e0], Y[L]));
    else if (ge <= -0.1) add("defaut", "bpa", 2, "Bénéfice par action en baisse", `Le bénéfice par action est passé de ${eur(eps[e0], 2, cur)} en ${Y[e0]} à ${eur(eps[L], 2, cur)} en ${Y[L]}, soit ${pct(ge)} par an.`, srcC(Y[e0], Y[L]));
  }

  // 4. Rentabilité des capitaux propres
  const eq = Y.map((_, i) => at("equity", i)), roe = Y.map((_, i) => eq[i] > 0 && nets[i] != null ? nets[i] / eq[i] : null), r3 = roe.slice(-3);
  if (eq[L] != null && eq[L] <= 0) add(nets[L] > 0 ? "contexte" : "defaut", "cp_neg", 2, "Capitaux propres négatifs", `Fin ${Y[L]}, ses dettes dépassent la valeur comptable de ses actifs (${B(eq[L])} de capitaux propres). ${nets[L] > 0 ? "C'est fréquent chez des entreprises rentables qui rachètent beaucoup leurs propres actions, surtout aux États-Unis." : "Combiné à des pertes, c'est un signe de fragilité."}`, srcC(Y[L], Y[L]));
  else if (bank && roe[L] != null && medOk && med.roe != null) {
    if (roe[L] >= Math.max(0.12, med.roe + 0.03)) add("valorise", "roe", 3, "Rentabilité supérieure aux autres banques et assureurs", `Pour 100 ${CUR[cur] || cur} qui appartiennent aux actionnaires, elle a gagné ${e100(roe[L])} en ${Y[L]}.${V}${analyseP1(med.roe)}.`, srcC(Y[L], Y[L]));
    else if (roe[L] < Math.min(0.06, med.roe - 0.03)) add("defaut", "roe", 2, "Rentabilité faible pour son secteur", `Pour 100 ${CUR[cur] || cur} qui appartiennent aux actionnaires, elle a gagné ${e100(roe[L])} en ${Y[L]}.${V}${analyseP1(med.roe)}.`, srcC(Y[L], Y[L]));
  } else if (!bank && r3.length === 3 && r3.every(x => x != null && x >= 0.15)) add("valorise", "roe", 2, "Rentabilité élevée et durable", `La rentabilité des capitaux propres dépasse 15 % sur chacun des trois derniers exercices (${r3.map(analyseP0).join(", ")}).${V && med.roe != null ? `${V}${analyseP1(med.roe)}.` : ""}`, srcC(Y[L - 2], Y[L]));

  // 5. Solidité : dette, trésorerie, évolution
  if (!bank) {
    const nd = Y.map((_, i) => at("netDebt", i)), eb = Y.map((_, i) => at("ebitda", i)), cash = at("cash", L), debt = at("debt", L);
    const lev = Y.map((_, i) => nd[i] != null && eb[i] > 0 ? nd[i] / eb[i] : null), toler = ["immo", "services", "telecom"].includes(s.sector);
    const det = cash != null && debt != null ? ` (${B(cash)} de trésorerie pour ${B(debt)} de dettes financières)` : "";
    if (nd[L] != null && nd[L] < 0) add("valorise", "dette", 3, "Plus de trésorerie que de dettes", `Fin ${Y[L]}, sa trésorerie dépasse ses dettes financières de ${B(-nd[L])}${det}. Elle pourrait rembourser tout ce qu'elle a emprunté avec l'argent qu'elle a en caisse.`, srcC(Y[L], Y[L]));
    else if (lev[L] != null) {
      const mt = medOk && med.lev != null ? `${V}${analyseAns(med.lev)}.` : "";
      if (lev[L] <= 1) add("valorise", "dette", 2, "Dette faible", `Sa dette nette de ${B(nd[L])}${det} équivaut à ${analyseAns(lev[L])} de résultat d'exploitation avant amortissements (EBITDA, ${Y[L]}).${mt}`, srcC(Y[L], Y[L]));
      else if (lev[L] > 3 && (!toler || lev[L] > Math.max(3, (med.lev || 0) * 1.3))) add("defaut", "dette", lev[L] > 4.5 ? 3 : 2, "Dette élevée", `Sa dette nette de ${B(nd[L])}${det} équivaut à ${analyseAns(lev[L])} de résultat d'exploitation avant amortissements (EBITDA, ${Y[L]}). Au-delà de 3 ans, la dette pèse si les taux montent ou si les résultats baissent.${mt}`, srcC(Y[L], Y[L]));
      else if (lev[L] > 3) add("contexte", "dette", 1, "Dette élevée, mais habituelle dans son secteur", `Sa dette nette équivaut à ${analyseAns(lev[L])} d'EBITDA (${Y[L]}). Les entreprises de son secteur empruntent beaucoup pour financer réseaux ou immeubles.${mt}`, srcC(Y[L], Y[L]));
    } else if (nd[L] > 0 && eb[L] != null && eb[L] <= 0) add("defaut", "dette", 3, "Dette sans résultat pour la rembourser", `Dette nette de ${B(nd[L])} fin ${Y[L]}, alors que son résultat d'exploitation avant amortissements est nul ou négatif.`, srcC(Y[L], Y[L]));
    const j = nd.findIndex(x => x != null);
    if (j >= 0 && j < L - 1 && nd[L] != null && nd[j] != null) {
      if (nd[j] > 0 && nd[L] > nd[j] * 1.5 && (lev[L] == null || lev[L] > 2) && nd[L] - nd[j] > 0.05 * (ca[L] || 0)) add("defaut", "dette_tend", 2, "Dette en forte hausse", `Sa dette nette est passée de ${B(nd[j])} fin ${Y[j]} à ${B(nd[L])} fin ${Y[L]}${lev[j] != null && lev[L] != null ? `, soit de ${analyseAns(lev[j])} à ${analyseAns(lev[L])} d'EBITDA` : ""}. Une acquisition ou de gros investissements en sont souvent la cause.`, srcC(Y[j], Y[L]));
      else if (nd[j] > 0 && nd[L] < nd[j] * 0.6 && nd[j] - nd[L] > 0.03 * (ca[L] || 0)) add("valorise", "dette_tend", 2, "Dette en nette baisse", `Sa dette nette est passée de ${B(nd[j])} fin ${Y[j]} à ${nd[L] < 0 ? `une trésorerie nette de ${B(-nd[L])}` : B(nd[L])} fin ${Y[L]} : l'entreprise se désendette.`, srcC(Y[j], Y[L]));
    }
  }

  // 6. Génération de trésorerie (argent disponible après investissements)
  if (!bank) {
    const fcf = Y.map((_, i) => at("fcf", i)), fi = fcf.map((x, i) => x != null ? i : -1).filter(i => i >= 0);
    if (fi.length >= 3) {
      const pos = fi.filter(i => fcf[i] > 0), sum = fi.reduce((a, i) => a + fcf[i], 0), last3 = fi.slice(-3), neg3 = last3.filter(i => fcf[i] < 0);
      const fm = fi.filter(i => ca[i] > 0).map(i => fcf[i] / ca[i]), fmMoy = fm.length ? fm.reduce((a, b) => a + b, 0) / fm.length : null;
      if (pos.length === fi.length) add("valorise", "fcf", fmMoy != null && fmMoy >= 0.1 ? 3 : 2, "De l'argent disponible chaque année", `Après avoir payé ses investissements, il lui est resté de l'argent sur chacun des ${fi.length} exercices lus (${Y[fi[0]]} à ${Y[fi.at(-1)]}) : ${B(sum)} au total${fmMoy != null ? `, soit ${analyseE100(fmMoy, cur)} pour 100 ${CUR[cur] || cur} de ventes en moyenne` : ""}. C'est ce qui finance dividendes, rachats d'actions et remboursement de la dette.`, srcC(Y[fi[0]], Y[fi.at(-1)]));
      else if (neg3.length >= 2) add("defaut", "fcf", 2, "Investissements supérieurs à l'argent encaissé", `Sur ${neg3.length} des ${last3.length} derniers exercices (${neg3.map(i => Y[i]).join(", ").replace(/, (\d+)$/, " et $1")}), ses investissements ont coûté plus que ce que son activité a rapporté. L'écart se finance par la trésorerie, la dette ou de nouvelles actions.`, srcC(Y[last3[0]], Y[last3.at(-1)]));
    }
  }

  // 7. Dividende : régularité, évolution, part du bénéfice, couverture par l'argent disponible
  const dp = Y.map((_, i) => at("divPaid", i)), dpsR = A("dps"), dps = Y.map((_, i) => at("dps", i)), dpsE = Y.map((_, i) => at("dpsEst", i));
  const dpV = dp.filter(x => x != null), nDiv = dp.filter(x => x > 0.5).length;
  if (dpV.length >= 2 && nDiv === 0) add("contexte", "div_non", 1, "Pas de dividende", `Aucun dividende versé sur les ${dpV.length} exercices lus : l'entreprise garde ses bénéfices pour investir, se désendetter ou racheter ses actions.`, srcC(Y[0], Y[L]));
  if (nDiv >= 3 && nDiv === dpV.length) {
    const dd = dps.some(x => x != null) ? dps : dpsE, est = !dps.some(x => x != null), di = dd.map((x, i) => x > 0 ? i : -1).filter(i => i >= 0);
    let evo = "", cut = null;
    if (di.length >= 3) {
      for (let k = 1; k < di.length; k++) if (dd[di[k]] < dd[di[k - 1]] * 0.9 && !splitEntre(di[k - 1], di[k])) cut = [Y[di[k]], dd[di[k - 1]], dd[di[k]]];
      const tot = dd[di.at(-1)] / dd[di[0]] - 1, monte = di.every((i, k) => k === 0 || dd[i] >= dd[di[k - 1]] * 0.98);
      if (!cut && !est && monte && tot > 0.05 && !splitEntre(di[0], di.at(-1))) evo = ` Le dividende par action est passé de ${eur(dd[di[0]], 2, cur)} à ${eur(dd[di.at(-1)], 2, cur)} (${pct(tot, 0)}), sans baisse.`;
    }
    add("valorise", "div_reg", evo ? 2 : 1, evo ? "Dividende régulier et en hausse" : "Dividende versé chaque année", `Dividende versé sur chacun des ${nDiv} exercices lus (${Y[0]} à ${Y[L]}).${evo}`, srcC(Y[0], Y[L]));
    if (cut && !est) add("defaut", "div_cut", 2, `Dividende réduit en ${cut[0]}`, `Le dividende par action est passé de ${eur(cut[1], 2, cur)} à ${eur(cut[2], 2, cur)} sur l'exercice ${cut[0]}. Un dividende n'est jamais garanti.`, srcC(cut[0] - 1, cut[0]));
  }
  if (dp[L] > 0.5) {
    const pay = nets[L] > 0 ? dp[L] / nets[L] : null, fcfL = at("fcf", L), immo = s.sector === "immo";
    if (!(nets[L] > 0)) add("defaut", "div_perte", 3, "Dividende versé malgré une perte", `${B(dp[L])} versés aux actionnaires en ${Y[L]} alors que l'entreprise est en perte : le dividende est payé avec la trésorerie ou la dette.`, srcC(Y[L], Y[L]));
    else if (pay > 1 && !immo) add("defaut", "div_couv", 3, "Dividende supérieur au bénéfice", `Elle a versé ${analyseP0(pay)} de son bénéfice ${Y[L]} (${B(dp[L])} pour ${B(nets[L])} de bénéfice). Cela ne peut pas durer sans hausse des bénéfices.`, srcC(Y[L], Y[L]));
    else if (pay > 0.9 && !immo) add("defaut", "div_couv", 2, "Dividende peu couvert par le bénéfice", `Elle reverse ${analyseP0(pay)} de son bénéfice ${Y[L]} : peu de marge si les résultats baissent.${medOk && med.payout != null ? `${V}${analyseP0(med.payout)}.` : ""}`, srcC(Y[L], Y[L]));
    else if (!bank && fcfL != null && fcfL > 0 && dp[L] > fcfL * 1.1 && !immo) add("defaut", "div_fcf", 2, "Dividende supérieur à l'argent disponible", `En ${Y[L]}, elle a versé ${B(dp[L])} de dividendes pour ${B(fcfL)} d'argent disponible après investissements : la différence vient de la trésorerie ou de la dette.`, srcC(Y[L], Y[L]));
    else if (pay != null && pay <= 0.6 && (bank || fcfL == null || dp[L] <= fcfL)) add("valorise", "div_couv", 1, "Dividende bien couvert", `Elle reverse ${analyseP0(pay)} de son bénéfice ${Y[L]}${!bank && fcfL > 0 ? `, et le dividende (${B(dp[L])}) est inférieur à l'argent disponible après investissements (${B(fcfL)})` : ""} : il reste une marge si les bénéfices baissent.`, srcC(Y[L], Y[L]));
  }

  // 8. Dilution ou rachats d'actions (nombre d'actions ≈ bénéfice ÷ bénéfice par action)
  const sh = Y.map((_, i) => nets[i] > 0 && eps[i] > 0 ? nets[i] / eps[i] : null), si = sh.map((x, i) => x != null ? i : -1).filter(i => i >= 0);
  if (si.length >= 2 && si.at(-1) - si[0] >= 2) {
    const a = si[0], b = si.at(-1), r = sh[b] / sh[a] - 1;
    if (r > -0.5 && r < 1 && !splitEntre(a, b)) {
      if (r >= 0.08) add("defaut", "dilution", r >= 0.2 ? 3 : 2, "Nombre d'actions en hausse (dilution)", `D'après ses comptes, le nombre d'actions a augmenté d'environ ${analyseP0(r)} entre ${Y[a]} et ${Y[b]} (bénéfice divisé par bénéfice par action). Chaque action donne alors droit à une part plus petite des bénéfices.`, srcC(Y[a], Y[b]));
      else if (r <= -0.05) add("valorise", "rachats", 2, "Rachats d'actions", `D'après ses comptes, le nombre d'actions a baissé d'environ ${analyseP0(-r)} entre ${Y[a]} et ${Y[b]} (bénéfice divisé par bénéfice par action) : chaque action représente une part plus grande des bénéfices.`, srcC(Y[a], Y[b]));
    }
  }

  // 9. Prix rapporté au bénéfice, face au secteur
  const v = valo(s), mp = MEDPE[s.sector];
  if (v && v.pe && mp) {
    if (v.pe >= mp * 1.5) add("defaut", "per", 2, "Prix élevé par rapport au bénéfice", `Au cours actuel, l'action coûte ${analyseFois(v.pe)} son bénéfice annuel (PER), contre ${analyseFois(mp)} pour la médiane de son secteur. Ce prix suppose une croissance future plus forte que celle de ses concurrentes ; si elle ne vient pas, le cours peut baisser.`, { source: "Cours différé et comptes " + Y[L], url: "" });
    else if (v.pe <= mp * 0.67) add("contexte", "per", 1, "Prix bas par rapport au bénéfice", `Au cours actuel, l'action coûte ${analyseFois(v.pe)} son bénéfice annuel (PER), contre ${analyseFois(mp)} pour la médiane de son secteur. Un prix bas traduit souvent des attentes plus faibles ou un risque perçu par le marché : ce n'est pas forcément une bonne affaire.`, { source: "Cours différé et comptes " + Y[L], url: "" });
  }
  if (v && v.yld != null) { const my = analyseMedYld(s.sector); if (my && v.yld >= Math.max(0.05, my * 2)) add("contexte", "rdt", 1, "Rendement du dividende élevé", `Au cours actuel, le dividende représente ${analyseP1(v.yld)} du prix de l'action par an, contre ${analyseP1(my)} pour la médiane de son secteur. Un rendement très élevé peut annoncer une baisse du dividende si le bénéfice ne suit pas.`, { source: "Cours différé et comptes " + Y[L], url: "" }); }

  // 10. Fraîcheur et étendue des comptes
  const fin = analyseDateFin(c), mo = analyseMois(fin);
  if (mo != null && mo > 16) add("contexte", "vieux", 2, `Derniers comptes lus : exercice ${Y[L]}`, `Le dernier exercice lu par le site s'est terminé le ${dLabel(fin)}, il y a ${F0.format(mo)} mois. Un exercice plus récent a pu être publié depuis : les chiffres ci-dessus peuvent avoir changé.`, srcC(Y[L], Y[L]));
  if (Y.length <= 2) add("contexte", "court", 1, "Historique court", `Le site n'a lu que ${analyseN(Y.length, "exercice")} (${Y.join(" et ")}) : les tendances sur plusieurs années ne se calculent pas encore.`, srcC(Y[0], Y[L]));
}

/* ---------- Taille et position dans le secteur, dépendance à une activité ou une zone ---------- */
function analysePosition(s, x, out) {
  const add = (col, id, poids, titre, detail, src) => out[col].push({ id, titre, detail, poids, ...src });
  if (!s.missing && s.ca > 0) {
    const sec = R.companies.filter(y => y.sector === s.sector && !y.missing && y.ca > 0).sort((a, b) => caEur(b) - caEur(a)), rk = sec.findIndex(y => y.id === s.id) + 1;
    if (rk && sec.length >= 10) {
      if (rk <= 3 || rk <= Math.ceil(sec.length * 0.03)) add("valorise", "taille", rk <= 3 ? 2 : 1, "Parmi les plus grandes de son secteur", `${rk}${rk === 1 ? "re" : "e"} sur ${sec.length} par les ventes parmi les entreprises du secteur ${secName(s).toLowerCase()} suivies par le site (${big(s.ca, s.currency)} sur l'exercice ${s.year}). La taille aide à négocier avec les fournisseurs et à financer de gros investissements.`, { source: "Comptes annuels lus par le site", url: "" });
      else if (rk > sec.length * 0.85) add("contexte", "taille", 1, "Petite taille dans son secteur", `${rk}e sur ${sec.length} par les ventes parmi les entreprises du secteur ${secName(s).toLowerCase()} suivies par le site.`, { source: "Comptes annuels lus par le site", url: "" });
    }
  }
  const capE = x.v && x.v.capE ? x.v.capE : x.p && x.p.cap ? toEur(x.p.cap, x.p.cur) : null;
  if (s.missing && capE > 0) { // sans comptes : on situe au moins sa valeur en Bourse dans le secteur
    const sec = R.companies.filter(y => y.sector === s.sector).map(y => { if (y.id === s.id) return [y, capE]; const v = !y.missing && valo(y); const c2 = v && v.capE ? v.capE : (pxOf(y) && pxOf(y).cap ? toEur(pxOf(y).cap, pxOf(y).cur) : null); return [y, c2]; }).filter(z => z[1] > 0).sort((a, b) => b[1] - a[1]);
    const rk = sec.findIndex(z => z[0].id === s.id) + 1;
    if (rk && sec.length >= 10 && rk <= 5) add("valorise", "taille_cap", 2, "Parmi les plus grandes valeurs en Bourse de son secteur", `Au cours actuel, ses actions valent environ ${capFmt(capE)} : ${rk}${rk === 1 ? "re" : "e"} sur ${sec.length} entreprises du secteur ${secName(s).toLowerCase()} dont le site a le cours.`, { source: "Cours différé", url: "" });
  }
  if (capE) x.v = Object.assign({}, x.v || {}, { capE });
  if (x.v && x.v.capE) {
    if (x.v.capE < 1e9) add("contexte", "smallcap", 2, "Petite capitalisation", `Sa valeur en Bourse est d'environ ${capFmt(x.v.capE)}. Les petites capitalisations s'échangent en général en moins grandes quantités : l'écart entre prix d'achat et prix de vente peut être plus large et le cours varier plus fortement.`, { source: ANALYSE_SRC.amf_actions[0], url: ANALYSE_SRC.amf_actions[1] });
  }
  const rep = typeof REP !== "undefined" && REP ? REP[s.id] : null;
  if (rep) {
    const src = { source: `Répartition des ventes ${rep.annee || ""} publiée par l'entreprise`.replace("  ", " "), url: rep.source || "" };
    const norm100 = l => { const t = l.reduce((a, y) => a + y[1], 0) || 1; return l.map(([n, v]) => [n, v / t]).sort((a, b) => b[1] - a[1]); };
    if (rep.activites && rep.activites.length) {
      const l = norm100(rep.activites), top = l[0];
      if (top[1] >= 0.7 && l.length >= 2) add("defaut", "dep_act", 1, "Dépend d'une activité principale", `${analyseP0(top[1])} de ses ventes viennent de l'activité « ${top[0]} »${rep.annee ? ` (${rep.annee})` : ""}. Un recul de ce seul métier pèserait directement sur l'ensemble.`, src);
      else if (l.length >= 4 && top[1] <= 0.4) add("valorise", "div_act", 1, "Activités diversifiées", `Aucune activité ne dépasse ${analyseP0(top[1])} des ventes : ${l.slice(0, 4).map(([n, v]) => `${n} ${analyseP0(v)}`).join(", ")}. Un recul d'un métier pèse moins sur l'ensemble.`, src);
    }
    if (rep.zones && rep.zones.length) {
      const l = norm100(rep.zones.filter(z => !/^autres?$/i.test(z[0]))), top = l[0];
      if (top && top[1] >= 0.6 && l.length >= 2) add("contexte", "dep_zone", 1, "Ventes concentrées sur une zone", `${analyseP0(top[1])} de ses ventes se font dans la zone « ${top[0]} »${rep.annee ? ` (${rep.annee})` : ""} : l'économie de cette zone compte beaucoup pour ses résultats.`, src);
      else if (top && l.length >= 4 && top[1] <= 0.4) add("valorise", "div_zone", 1, "Ventes réparties dans le monde", `Aucune zone ne dépasse ${analyseP0(top[1])} des ventes : ${l.slice(0, 4).map(([n, v]) => `${n} ${analyseP0(v)}`).join(", ")}.`, src);
    }
  }
}

/* ---------- Actionnariat et places de cotation (Wikidata) ---------- */
function analyseActionnariat(s, x, out) {
  const wd = x.wd; if (!wd) return;
  const wsrc = { source: "Wikidata (base collaborative, CC0) : à vérifier dans le rapport annuel", url: "https://www.wikidata.org/wiki/" + wd.wd };
  const ETATN = /^(État|Etat|Gouvernement|Government|Ministère|Ministry|République|Republic|State of|Confédération|Kingdom of|Royaume)/i;
  (wd.actionnaires || []).forEach(a => { if (!a.type && ETATN.test(a.nom)) a.type = "etat"; });
  const act = (wd.actionnaires || []).filter(a => !(/pension|fund|fonds/i.test(a.nom) && !(a.part >= 0.1))).filter(a => a.type === "etat" || a.type === "famille" || a.type === "personne" || (a.type === "entreprise" && a.part >= 0.3) || a.part >= 0.3);
  const etat = act.filter(a => a.type === "etat" && (a.part >= 0.05 || (a.part == null && !/pension|fund|fonds/i.test(a.nom))));
  if (etat.length || wd.etat) {
    const a = etat[0], qui = a ? `${a.nom}${a.part ? ` (environ ${analyseP0(a.part)} du capital${a.an ? ` en ${a.an}` : ""})` : ""}` : "";
    const cn = x.pays === "CN";
    out[cn ? "defaut" : "contexte"].push({ id: "etat", poids: 2, titre: cn ? "Contrôlée par l'État chinois" : "L'État au capital", detail: `${a ? `Wikidata cite comme actionnaire ${qui}.` : "Wikidata la classe parmi les entreprises publiques."} Un État actionnaire peut peser sur les décisions (nominations, prix, emplois, stratégie) au nom d'objectifs publics, en plus de l'intérêt des autres actionnaires ; il peut aussi la soutenir en cas de difficulté.`, ...wsrc, src2: ANALYSE_SRC.ocde_ep });
  }
  const ref = act.filter(a => a.type !== "etat" && (a.part >= 0.2 || ((a.type === "famille" || a.type === "personne") && a.part >= 0.1)));
  if (ref.length) {
    const t = ref.slice(0, 2).map(a => `${a.nom}${a.part ? ` (environ ${analyseP0(a.part)}${a.an ? ` en ${a.an}` : ""})` : ""}`).join(" et ");
    out.contexte.push({ id: "reference", poids: 1, titre: "Actionnaire de référence", detail: `Wikidata cite comme actionnaire${ref.length > 1 ? "s" : ""} ${t}. Un actionnaire de référence apporte de la stabilité, mais les petits actionnaires pèsent peu dans les décisions.`, ...wsrc });
  }
  const BALIAS = { "hong kong exchanges and clearing": "bourse de hong kong", "new york stock exchange": "nyse", "london stock exchange": "bourse de londres", "deutsche börse": "bourse de francfort", "frankfurter wertpapierbörse": "bourse de francfort", "xetra": "bourse de francfort" };
  const vu = new Set(), b = (wd.bourses || []).filter(n => !/OTC|over-the-counter|gré à gré/i.test(n)).map(n => BALIAS[n.toLowerCase()] ? BALIAS[n.toLowerCase()].replace(/^bourse de (.)/, (m, a) => "bourse de " + a.toUpperCase()).replace(/^nyse$/, "New York Stock Exchange") : n).filter(n => { const k = n.toLowerCase(); return !vu.has(k) && vu.add(k); });
  if (b.length >= 2) out.contexte.push({ id: "multi", poids: 1, titre: "Cotée sur plusieurs places", detail: `Wikidata indique ${b.length} places de cotation : ${b.slice(0, 4).join(", ")}${b.length > 4 ? "…" : ""}. Le prix et la devise peuvent différer d'une place à l'autre ; chez votre courtier, le code ISIN${s.isin ? ` (${s.isin})` : ""} évite les confusions.`, ...wsrc });
}

/* =====================================================================
   Point d'entrée : { valorise, defaut, contexte, connu, manque }
   ===================================================================== */
function analyseForcesFaiblesses(s, c) {
  const out = { valorise: [], defaut: [], contexte: [], connu: [], manque: [] };
  if (!s) return out;
  const x = analyseCtx(s, c); x.sec = s.sec || null;
  try { if (c && c.years && c.years.length) analyseFinance(s, c, out); } catch (e) { console.warn("analyse : comptes", e); }
  try { analysePosition(s, x, out); } catch (e) { console.warn("analyse : position", e); }
  for (const r of ANALYSE_REGLES) {
    try {
      if (!r.si(x)) continue;
      const k = typeof r.src === "function" ? r.src(x) : r.src, S = ANALYSE_SRC[k] || ["", ""], S2 = r.src2 && ANALYSE_SRC[r.src2];
      out[r.col].push({ id: r.id, titre: typeof r.titre === "function" ? r.titre(x) : r.titre, detail: r.detail(x), poids: r.poidsDe ? r.poidsDe(x) : r.poids, source: S[0], url: S[1], src2: S2 || null, regle: true });
    } catch (e) { console.warn("analyse : règle " + r.id, e); }
  }
  try { analyseActionnariat(s, x, out); } catch (e) { console.warn("analyse : actionnariat", e); }
  const peu = !c || !c.years || c.years.length < 2 || s.missing;
  if (peu) {
    if (!c || s.missing) out.contexte.push({ id: "collecte", poids: 3, titre: "Comptes pas encore lus par le site", detail: IA_strip_analyse(missingTxt(s, true)) + " Les points ci-dessous viennent de son pays, de son secteur, de sa devise et de sa cotation : ils restent valables sans les comptes.", source: "bilan., état de la collecte des comptes", url: "/methode" });
    if (s.fiche && s.fiche.depend) out.contexte.push({ id: "depend", poids: 2, titre: "Ce qui fait varier ses résultats", detail: s.fiche.depend, source: "Fiche métier de bilan., écrite d'après le rapport annuel", url: officielLink(s) || "" });
    if (s.fiche && s.fiche.argent) out.contexte.push({ id: "argent", poids: 1, titre: "D'où vient son chiffre d'affaires", detail: s.fiche.argent, source: "Fiche métier de bilan., écrite d'après le rapport annuel", url: officielLink(s) || "" });
    try { const po = peersOf(s, 4), pr = po.auto ? [] : po.list; if (pr.length) out.contexte.push({ id: "pairs", poids: 1, titre: "Concurrentes suivies par le site", detail: `${pr.map(y => y.name).join(", ")}. Leurs comptes donnent un ordre de grandeur de ce qui est habituel dans ce métier (étape « Concurrents » de la fiche).`, source: "bilan., liste des concurrentes", url: "/comparer?ids=" + [s.id, ...pr.map(y => y.id)].join(",") }); } catch (e) { }
  }
  // Doublons : une même idée ne figure qu'une fois (la règle « dette tolérée » laisse la place à la règle de secteur)
  for (const k of ["valorise", "defaut", "contexte"]) { const seen = new Set(); out[k] = out[k].filter(i => !seen.has(i.id) && seen.add(i.id)).sort((a, b) => b.poids - a.poids); }
  // Ce que l'on sait, ce qui manque (dit clairement)
  const f = c && c.years && c.years.length ? c : null, L = f ? f.years.length - 1 : -1, has = k => f && f.fin && f.fin[k] && f.fin[k].some(ANALYSE_ok);
  out.connu.push(`Secteur : ${secName(s)}`);
  if (x.pays) out.connu.push(`Pays : ${analysePaysNom(x.pays)}${x.paysSrc === "wikidata" ? " (siège, d'après Wikidata)" : x.paysSrc === "isin" ? " (d'après son code ISIN)" : x.paysSrc === "bourse" ? " (d'après sa place de cotation)" : ""}`);
  if (x.offshore) out.connu.push(`Société immatriculée ${analysePaysDe(x.legal)}`);
  out.connu.push(`Cotation : ${ANALYSE_PLACE[x.bx] || x.bx || "inconnue"}${x.tk ? `, code ${x.tk}` : ""}${x.curCot ? `, en ${analyseDevNom(x.curCot)[1]}` : ""}`);
  if (x.pea != null) out.connu.push(x.pea ? "Éligible au PEA" : "Hors PEA (compte-titres)");
  if (f) out.connu.push(`Comptes lus : ${analyseN(f.years.length, "exercice")}, de ${f.years[0]} à ${f.years[L]} (clos le ${dLabel(analyseDateFin(f))})`);
  if (x.p) out.connu.push(`Cours différé${x.v && x.v.capE ? ` et valeur en Bourse (${capFmt(x.v.capE)})` : ""}`);
  if (x.wd && x.wd.creation) out.connu.push(`Création : ${x.wd.creation} (Wikidata)`);
  if (x.wd && x.wd.effectif) out.connu.push(`Effectif : environ ${F0.format(x.wd.effectif)} personnes${x.wd.effectifAn ? ` (${x.wd.effectifAn})` : ""} (Wikidata)`);
  if (!f) out.manque.push(s.missing ? IA_strip_analyse(missingTxt(s, true)) : "Comptes annuels non disponibles");
  else {
    const m = [];
    if (!has("ebit") && !isBank(s)) m.push("résultat d'exploitation"); if (!has("netDebt") && !isBank(s)) m.push("dette nette"); if (!has("fcf") && !isBank(s)) m.push("argent disponible après investissements");
    if (!has("divPaid") && !has("dps")) m.push("dividendes"); if (!has("eps")) m.push("bénéfice par action");
    if (m.length) out.manque.push(`Dans ses comptes, le site ne trouve pas : ${m.join(", ")}`);
    if (analyseMois(analyseDateFin(f)) > 16) out.manque.push("Comptes de plus de 16 mois : un exercice plus récent devrait exister");
  }
  if (!x.p) out.manque.push("Cours de l'action (prix, PER et rendement ne se calculent pas)");
  if (!(typeof REP !== "undefined" && REP && REP[s.id])) out.manque.push("Répartition des ventes par activité et par zone");
  if (x.pea == null) out.manque.push("Éligibilité au PEA (pas de code ISIN connu)");
  if (!x.wd) out.manque.push("Actionnaires principaux et places de cotation (absents de Wikidata ou pas encore reliés)");
  if (f && !isBank(s)) out.manque.push("Frais financiers : la couverture des intérêts par le résultat n'est pas encore calculée");
  if (f) out.manque.push("Historique du cours : la comparaison avec ses propres prix passés n'est pas encore faite");
  return out;
}
function IA_strip_analyse(h) { return String(h || "").replace(/<[^>]+>/g, "").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }

/* =====================================================================
   Rendu : deux colonnes, puis le contexte, puis ce que l'on sait et ce qui manque
   ===================================================================== */
const ANALYSE_TOP = 4;
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".anf-plus"); if (!b) return; const r = b.previousElementSibling; if (!r) return; const open = r.hidden; r.hidden = !open; b.textContent = open ? "Réduire" : "Lire la suite"; b.setAttribute("aria-expanded", String(open)); });
function analyseItem(i, col) {
  const src = i.source ? `<span class="anf-src">Source : ${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.source)}</a>` : esc(i.source)}${i.src2 ? ` · <a href="${esc(i.src2[1])}" target="_blank" rel="noopener">${esc(i.src2[0])}</a>` : ""}</span>` : "";
  const m = i.detail.match(/^.+?[.:](?=\s+[A-ZÀ-Ý«(]|$)/), un = m ? m[0] : i.detail, reste = i.detail.slice(un.length).trim();
  const corps = reste && i.detail.length > 170 ? `${esc(un)} <span class="anf-rest" hidden>${esc(reste)}</span><button type="button" class="anf-plus" aria-expanded="false">Lire la suite</button>` : esc(i.detail);
  return `<li class="anf-i anf-${col}" data-anf="${esc(i.id)}"><span class="anf-w" role="img" aria-label="Importance ${i.poids} sur 3" title="Importance ${i.poids} sur 3">${[1, 2, 3].map(k => `<i class="${k <= i.poids ? "on" : ""}"></i>`).join("")}</span><div><b>${esc(i.titre)}</b><p>${corps}</p>${src}</div></li>`;
}
function analyseListe(l, col, vide) {
  if (!l.length) return `<p class="anf-vide">${vide}</p>`;
  const a = l.slice(0, ANALYSE_TOP), b = l.slice(ANALYSE_TOP);
  return `<ul class="anf-l">${a.map(i => analyseItem(i, col)).join("")}</ul>${b.length ? `<details class="anf-more"><summary>Voir ${b.length === 1 ? "l'autre point" : `les ${b.length} autres points`}</summary><ul class="anf-l">${b.map(i => analyseItem(i, col)).join("")}</ul></details>` : ""}`;
}
function analyseHTML(s, c, mode) {
  if (!s) return "";
  const inner = mode === "inner"; // « inner » : bloc intégré dans le panneau « L'essentiel à retenir » de la fiche
  analyseCSS();
  let r; try { r = analyseForcesFaiblesses(s, c); } catch (e) { console.warn("analyse", e); return ""; }
  const nV = r.valorise.length, nD = r.defaut.length, nC = r.contexte.length, peu = !c || !c.years || c.years.length < 2 || s.missing;
  const yr = c && c.years && c.years.length ? c.years.at(-1) : null;
  const ctx = r.contexte.slice().sort((a, b) => b.poids - a.poids);
  const T = inner ? "div" : "section";
  return `<${T} class="${inner ? "anf anf-in" : "panel anf"}" id="analyse" data-analyse-id="${esc(s.id)}" data-analyse-mode="${inner ? "inner" : ""}">
    <div class="ph"><h2>${inner ? "Sur plusieurs années et selon son contexte" : "Ce qui la valorise, ce qui lui fait défaut"}</h2><span class="light" style="font-size:12.5px">${yr ? `Comptes ${yr}` : "Sans comptes"} · règles publiques</span></div>
    <p class="anf-intro">${nV} atout${nV > 1 ? "s" : ""}, ${nD} point${nD > 1 ? "s" : ""} faible${nD > 1 ? "s" : ""} ou risque${nD > 1 ? "s" : ""}, et ${nC} élément${nC > 1 ? "s" : ""} de contexte pour ${esc(s.name)}. Chaque point donne son chiffre et sa source. ${peu ? "Les comptes de cette entreprise sont incomplets : l'analyse s'appuie surtout sur son pays, son secteur, sa devise et sa cotation." : "Les points tirés des comptes portent sur plusieurs exercices, pas sur une seule année."}</p>
    <div class="anf-cols">
      <div class="anf-c anf-cv"><h3><i></i>Ce qui la valorise</h3>${analyseListe(r.valorise, "v", peu ? "Sans comptes complets, le site ne peut pas mesurer ses atouts financiers." : "Aucun atout net dans ses comptes au regard des règles du site.")}</div>
      <div class="anf-c anf-cd"><h3><i></i>Ce qui lui fait défaut</h3>${analyseListe(r.defaut, "d", "Aucun point faible net dans ses comptes ni dans les règles de contexte.")}</div>
    </div>
    ${ctx.length ? (inner ? `<details class="anf-ctx anf-ctxd"><summary>Le contexte à connaître (${ctx.length} point${ctx.length > 1 ? "s" : ""} : pays, devise, secteur, fiscalité)</summary>${analyseListe(ctx, "c", "")}</details>` : `<div class="anf-ctx"><h3>Le contexte à connaître</h3><p class="anf-sub">Ni atout ni défaut en soi : ce qu'il faut savoir avant de lire son cours ou ses comptes.</p>${analyseListe(ctx, "c", "")}</div>`) : ""}
    <details class="anf-sait"${peu ? " open" : ""}><summary>Ce que le site sait d'elle, et ce qui manque</summary><div class="anf-sait-g">
      <div><h4>Ce que l'on sait</h4><ul>${r.connu.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div><h4>Ce qui manque</h4><ul>${r.manque.map(t => `<li>${esc(t)}</li>`).join("") || "<li>Rien d'essentiel.</li>"}</ul></div></div></details>
    ${inner ? `<p class="anf-meth">Méthode : seuils fixes, médiane du secteur et règles de contexte écrites à l'avance, chacune avec sa source. Ni note, ni prévision, ni conseil.</p>` : `<div class="src">Méthode : des seuils fixes, la médiane du secteur et des règles de contexte écrites à l'avance (pays, devise, secteur, cotation, actionnariat), chacune avec sa source officielle ou reconnue. Les points marqués de trois traits pèsent le plus. Ce n'est ni une note, ni une prévision, ni un conseil d'achat ou de vente.</div>`}
  </${T}>`;
}
function analyseRafraichir() { // quand facteurs.json arrive après l'affichage
  document.querySelectorAll("[data-analyse-id]").forEach(el => { const s = RBY[el.dataset.analyseId]; if (!s) return; const h = analyseHTML(s, FULL[s.id] || null, el.dataset.analyseMode || ""); if (h) el.outerHTML = h; });
}
function analyseCSS() {
  if (analyseCSS.ok) return; analyseCSS.ok = true;
  document.head.insertAdjacentHTML("beforeend", `<style id="analyse-css">
.anf .anf-intro{margin:0;padding:2px 22px 14px;color:var(--grey);font-size:14px;max-width:880px}
.anf-cols{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line2,#EFEAE0)}
.anf-c{padding:16px 22px 18px;min-width:0}
.anf-cv{border-right:1px solid var(--line2,#EFEAE0)}
.anf-c h3,.anf-ctx h3{font-family:var(--serif);font-size:17px;display:flex;align-items:center;gap:8px;margin:0 0 6px}
.anf-c h3 i{width:10px;height:10px;border-radius:50%;display:inline-block}
.anf-cv h3{color:var(--g)} .anf-cv h3 i{background:var(--g)}
.anf-cd h3{color:#B23A1E} .anf-cd h3 i{background:var(--o)}
.anf-l{list-style:none;margin:0;padding:0}
.anf-i{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;padding:11px 0;border-bottom:1px dashed var(--line,#E6E0D4)}
.anf-l > .anf-i:last-child{border-bottom:0}
.anf-i b{display:block;font-size:14.5px;line-height:1.35}
.anf-i p{margin:3px 0 4px;font-size:13.5px;line-height:1.5;color:var(--ink)}
.anf-src{display:block;font-size:11.5px;color:var(--light);line-height:1.4;overflow-wrap:anywhere}
.anf-src a{color:var(--grey);text-decoration:underline;text-decoration-color:var(--line,#E6E0D4);text-underline-offset:2px}
.anf-w{display:flex;align-items:flex-end;gap:2px;height:14px;margin-top:3px}
.anf-w i{display:block;width:4px;border-radius:1px;background:var(--line,#E6E0D4)}
.anf-w i:nth-child(1){height:6px} .anf-w i:nth-child(2){height:10px} .anf-w i:nth-child(3){height:14px}
.anf-v .anf-w i.on{background:var(--g)} .anf-d .anf-w i.on{background:var(--o)} .anf-c .anf-w i.on{background:var(--grey)}
.anf-plus{border:0;background:none;padding:0 0 0 4px;color:var(--grey);font-size:12.5px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.anf-vide{color:var(--grey);font-size:13.5px;margin:6px 0}
.anf-more summary,.anf-sait summary{cursor:pointer;font-size:13px;color:var(--grey);padding:8px 0;list-style:none}
.anf-more summary::-webkit-details-marker,.anf-sait summary::-webkit-details-marker{display:none}
.anf-more summary:before,.anf-sait summary:before{content:"+ ";font-family:var(--mono)}
.anf-more[open] summary:before,.anf-sait[open] summary:before{content:"− "}
.anf-ctx{padding:16px 22px 10px;border-top:1px solid var(--line2,#EFEAE0);background:#FCFBF8}
.anf-ctx .anf-sub{margin:0 0 4px;font-size:13px;color:var(--grey)}
.anf-ctx .anf-l{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}
.anf-ctx .anf-l > .anf-i:last-child{border-bottom:1px dashed var(--line,#E6E0D4)}
.anf-sait{padding:4px 22px 10px;border-top:1px solid var(--line2,#EFEAE0)}
.anf-sait summary{font-weight:600;color:var(--ink)}
.anf-sait-g{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px;padding-bottom:6px}
.anf-sait h4{margin:4px 0;font-size:12px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--light);font-weight:500}
.anf-sait ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.55}
.anf-in{border-top:1px solid var(--line2,#EFEAE0);margin-top:6px}
.anf-in .ph h2{font-size:17px}
.anf-ctxd > summary{cursor:pointer;font-family:var(--serif);font-weight:800;font-size:16px;padding:2px 0 8px;list-style:none}
.anf-ctxd > summary::-webkit-details-marker{display:none}
.anf-ctxd > summary:before{content:"+ ";font-family:var(--mono)} .anf-ctxd[open] > summary:before{content:"− "}
.anf-meth{margin:0;padding:8px 22px 12px;font-size:12px;color:var(--light)}
@media (max-width:760px){.anf-meth{padding:8px 14px 12px}.anf-cols,.anf-sait-g,.anf-ctx .anf-l{grid-template-columns:1fr}.anf-cv{border-right:0;border-bottom:1px solid var(--line2,#EFEAE0)}.anf-c,.anf-ctx,.anf-sait{padding-left:14px;padding-right:14px}.anf .anf-intro{padding:2px 14px 12px}}
</style>`);
}

/* =====================================================================
   Pour l'IA : faits compacts (assistant de fiche, serveur /api/assistant)
   ===================================================================== */
function analyseFaitsIA(s, c) {
  if (!s) return "";
  let r; try { r = analyseForcesFaiblesses(s, c); } catch (e) { return ""; }
  const l = (t, a) => a.length ? `${t} : ${a.map(i => `${i.titre} (${i.detail.replace(/\s+/g, " ").slice(0, 260)}${i.source ? ` Source : ${i.source}` : ""})`).join(" ; ")}` : "";
  return [l("Ce qui la valorise", r.valorise.slice(0, 6)), l("Ce qui lui fait défaut", r.defaut.slice(0, 6)), l("Contexte", r.contexte.slice(0, 6)), r.manque.length ? `Données manquantes : ${r.manque.join(" ; ")}` : ""].filter(Boolean).join("\n");
}
// Les phrases que l'assistant local ajoute aux questions « atouts », « risques », « solide ».
function analyseAssist(s, c, genre) {
  let r; try { r = analyseForcesFaiblesses(s, c); } catch (e) { return []; }
  const un = t => { const m = t.match(/^.+?[.](?=\s+[A-ZÀ-Ý]|$)/); return (m ? m[0] : t).replace(/\.$/, ""); }; // la première phrase suffit à l'oral
  const pt = i => `${i.titre} : ${un(i.detail).charAt(0).toLowerCase() + un(i.detail).slice(1)}.`;
  const sansDette = genre === "solide_sans_dette"; if (sansDette) genre = "solide";
  const P = [];
  if (genre === "forts") { const a = r.valorise.slice(0, 3); if (a.length) P.push(`Ce qui la valorise, sur plusieurs exercices : ${a.map(pt).join(" ")}`); }
  if (genre === "risques") {
    const d = r.defaut.filter(i => i.regle).slice(0, 3), f = r.defaut.filter(i => !i.regle).slice(0, 2);
    if (f.length) P.push(`Dans ses comptes sur plusieurs années : ${f.map(pt).join(" ")}`);
    if (d.length) P.push(`Risques liés à son pays, sa devise ou son secteur : ${d.map(pt).join(" ")}`);
    const cx = r.contexte.filter(i => ["change", "devcpt", "smallcap", "cny", "hkd", "dette", "vieux"].includes(i.id)).slice(0, d.length >= 2 ? 1 : 2);
    if (cx.length) P.push(`À connaître aussi : ${cx.map(pt).join(" ")}`);
  }
  if (genre === "solide") {
    const k = new Set(["dette", "dette_tend", "fcf", "benef", "pertes", "perte", "cp_neg", "roe", "marge_neg", "div_perte", "div_couv", "div_fcf"]);
    if (sansDette) { k.delete("dette"); k.delete("cp_neg"); }
    const a = r.valorise.filter(i => k.has(i.id)).slice(0, 3), d = r.defaut.filter(i => k.has(i.id)).slice(0, 3);
    if (a.length) P.push(`${sansDette ? "Sur plusieurs exercices, ce qui la rend solide" : "Ce qui la rend solide"} : ${a.map(pt).join(" ")}`);
    if (d.length) P.push(`${sansDette ? "Sur plusieurs exercices, ce qui la fragilise" : "Ce qui la fragilise"} : ${d.map(pt).join(" ")}`);
    if (!a.length && !d.length && !sansDette) { const g = r.defaut.filter(i => i.regle).slice(0, 2); if (g.length) P.push(`À connaître : ${g.map(pt).join(" ")}`); }
  }
  if ((genre === "risques" || genre === "solide") && r.manque.length && (!c || s.missing)) P.push(`Ce que le site ne sait pas encore : ${r.manque.slice(0, 3).join(" ; ").replace(/\.$/, "")}.`);
  return P;
}

/* ---------- ficheFaits : contenu existant, plus les facteurs de l'analyse ---------- */
function ficheFaits(s, c) {
  const f = c ? figuresOf(c) : null, r = ratios(s), m = MED[s.sector] || {}, v = valo(s), p = pxOf(s);
  const x = (() => { try { return analyseForcesFaiblesses(s, c); } catch (e) { return null; } })();
  const court = l => (l || []).slice(0, 8).map(i => ({ point: i.titre, detail: i.detail, source: i.source || null }));
  return {
    entreprise: s.name, secteur: secName(s), pays: regName(s), activite: s.fiche ? s.fiche.fait : s.desc, comment_elle_gagne_de_l_argent: s.fiche && s.fiche.argent, ce_qui_fait_varier_ses_resultats: s.fiche && s.fiche.depend,
    compte_possible: peaOk(s) == null ? null : peaOk(s) ? "PEA ou compte-titres" : "compte-titres seulement",
    comptes: f && { exercice: f.year, devise: s.currency, ventes_millions: s.ca, ventes_annee_precedente_millions: s.caPrev, benefice_net_millions: s.net, croissance_ventes_pct: R1(r.g1), marge_operationnelle_pct: R1(r.marge), marge_nette_pct: R1(r.nm), rentabilite_capitaux_propres_pct: R1(r.roe), dette_nette_en_annees_de_resultat_avant_amortissements: r.lev == null ? null : Math.round(r.lev * 10) / 10, tresorerie_superieure_a_la_dette: s.netDebt != null && s.netDebt < 0, part_du_benefice_versee_en_dividende_pct: R1(r.payout) },
    mediane_du_secteur: { entreprises: m.n, croissance_ventes_pct: R1(m.g1), marge_operationnelle_pct: R1(m.marge), rentabilite_pct: R1(m.roe), dette_en_annees_de_resultat_avant_amortissements: m.lev == null ? null : Math.round(m.lev * 10) / 10, distribution_pct: R1(m.payout), per: MEDPE[s.sector] ? Math.round(MEDPE[s.sector]) : null },
    jugement_du_site_critere_par_critere: f ? lecture(s, f).map(i => `${i.q} ${String(i.value || "").replace(/<[^>]+>/g, "")} (${i.lv === "fort" ? "point fort" : i.lv === "vig" ? "point de vigilance" : "dans la moyenne"})`) : [],
    profil_dans_le_secteur: profilAxes(s).map(([t, xx]) => `${t} : ${xx.rank}e sur ${xx.n}, ${axWord(xx.p)}`),
    action: p && { cours: p.p, devise: p.cur, variation_jour_pct: p.chg, variation_1an_pct: p.p1y ? R1(p.p / p.p1y - 1) : null, plus_haut_1an: p.h52, plus_bas_1an: p.l52, per: v && v.pe ? Math.round(v.pe * 10) / 10 : null, rendement_dividende_pct: v ? R1(v.yld) : null, capitalisation_milliards_eur: v && v.capE ? Math.round(v.capE / 1e8) / 10 : null },
    concurrents: peersOf(s, 4).list.map(y => { const rr = ratios(y), vv = valo(y); return { nom: y.name, croissance_ventes_pct: R1(rr.g1), marge_pct: R1(rr.marge), per: vv && vv.pe ? Math.round(vv.pe) : null }; }),
    annonces_recentes: Object.values(ANA || {}).filter(y => y.id === s.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(y => ({ date: y.date, type: y.type, chiffres: y.chiffres, lecture: y.lecture })),
    prochaines_dates: eventsOf(s.id).filter(e => e.date >= TODAY).slice(0, 3).map(e => ({ date: e.date, quoi: e.label })),
    ce_qui_la_valorise: x ? court(x.valorise) : [],
    ce_qui_lui_fait_defaut: x ? court(x.defaut) : [],
    contexte_pays_devise_secteur: x ? court(x.contexte) : [],
    donnees_manquantes: x ? x.manque : [],
    date_du_jour: TODAY,
  };
}

/* ---------- Branchement dans la fiche ----------
   ficheAnalyse(s, c) est l'emplacement réservé à ce module par le module « fiche » (étape « L'essentiel à retenir »).
   Pour une entreprise sans comptes, la fiche n'a pas d'étape « L'essentiel » : le bloc complet s'ajoute à l'étape « Son métier ». */
function ficheAnalyse(s, c) {
  try { return analyseHTML(s, c, "inner"); } catch (e) { return ""; }
}
function analyseSansComptes() {
  const m = location.pathname.match(/^\/entreprise\/([^/]+)\/?$/); if (!m || typeof RBY === "undefined") return;
  const s = RBY[decodeURIComponent(m[1])]; if (!s || !s.missing) return;
  const et = document.querySelector('#etapes-corps .etape[data-etape="metier"]'); if (!et || et.querySelector("[data-analyse-id]")) return;
  const h = analyseHTML(s, null); if (!h) return;
  const nav = et.querySelector(".etnav"); if (nav) nav.insertAdjacentHTML("beforebegin", h); else et.insertAdjacentHTML("beforeend", h);
}
try { new MutationObserver(() => { clearTimeout(analyseSansComptes.t); analyseSansComptes.t = setTimeout(analyseSansComptes, 60); }).observe(document.getElementById("app") || document.body, { childList: true, subtree: true }); } catch (e) { }
