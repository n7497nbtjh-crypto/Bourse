// data/univers.mjs
var SECTEURS = {
  conso: "Consommation",
  industrie: "Industrie",
  energie: "\xC9nergie",
  sante: "Sant\xE9",
  tech: "Technologie",
  finance: "Banque et assurance",
  telecom: "T\xE9l\xE9coms et m\xE9dias",
  materiaux: "Mat\xE9riaux",
  services: "Services aux collectivit\xE9s",
  immo: "Immobilier"
}, FRANCE = [
  { id: "accor", domain: "accor.com", desc: "H\xF4tellerie dans le monde entier (Novotel, Ibis, Sofitel\u2026).", name: "Accor", ticker: "AC", isin: "FR0000120404", sector: "conso" },
  { id: "air-liquide", domain: "airliquide.com", desc: "Gaz pour l'industrie et la sant\xE9 : oxyg\xE8ne, azote, hydrog\xE8ne.", name: "Air Liquide", ticker: "AI", isin: "FR0000120073", sector: "materiaux" },
  { id: "airbus", domain: "airbus.com", desc: "Avions de ligne, h\xE9licopt\xE8res, d\xE9fense et espace.", name: "Airbus", ticker: "AIR", isin: "NL0000235190", sector: "industrie" },
  { id: "arcelormittal", domain: "arcelormittal.com", desc: "Production d'acier.", name: "ArcelorMittal", legal: "ArcelorMittal", ticker: "MT", isin: "LU1598757687", sector: "materiaux" },
  { id: "axa", domain: "axa.com", desc: "Assurance (dommages, sant\xE9, vie) et gestion d'\xE9pargne.", name: "AXA", ticker: "CS", isin: "FR0000120628", sector: "finance" },
  { id: "biomerieux", domain: "biomerieux.com", desc: "Tests de diagnostic m\xE9dical pour les laboratoires.", name: "bioM\xE9rieux", ticker: "BIM", isin: "FR0013280286", sector: "sante" },
  { id: "bnp-paribas", domain: "bnpparibas.com", desc: "Banque de d\xE9tail, banque d'investissement et assurance.", name: "BNP Paribas", ticker: "BNP", isin: "FR0000131104", sector: "finance" },
  { id: "bouygues", domain: "bouygues.com", desc: "Construction, t\xE9l\xE9coms (Bouygues Telecom) et m\xE9dias (TF1).", name: "Bouygues", ticker: "EN", isin: "FR0000120503", sector: "industrie" },
  { id: "bureau-veritas", domain: "bureauveritas.com", desc: "Contr\xF4le, inspection et certification.", name: "Bureau Veritas", ticker: "BVI", isin: "FR0006174348", sector: "industrie" },
  { id: "capgemini", domain: "capgemini.com", desc: "Conseil et services informatiques.", name: "Capgemini", ticker: "CAP", isin: "FR0000125338", sector: "tech" },
  { id: "carrefour", domain: "carrefour.com", desc: "Grande distribution alimentaire.", name: "Carrefour", ticker: "CA", isin: "FR0000120172", sector: "conso" },
  { id: "credit-agricole", domain: "credit-agricole.com", desc: "Banque et assurance (Cr\xE9dit Agricole S.A., LCL, Amundi).", name: "Cr\xE9dit Agricole", ticker: "ACA", isin: "FR0000045072", sector: "finance" },
  { id: "danone", domain: "danone.com", desc: "Produits laitiers, eaux min\xE9rales et nutrition sp\xE9cialis\xE9e.", name: "Danone", ticker: "BN", isin: "FR0000120644", sector: "conso" },
  { id: "dassault-systemes", domain: "3ds.com", desc: "Logiciels de conception 3D et de simulation.", name: "Dassault Syst\xE8mes", ticker: "DSY", isin: "FR0014003TT8", sector: "tech" },
  { id: "edenred", domain: "edenred.com", desc: "Titres-restaurant et solutions de paiement pour les entreprises.", name: "Edenred", ticker: "EDEN", isin: "FR0010908533", sector: "tech" },
  { id: "engie", domain: "engie.com", desc: "Production et distribution d'\xE9lectricit\xE9 et de gaz.", name: "Engie", ticker: "ENGI", isin: "FR0010208488", sector: "services" },
  { id: "essilorluxottica", domain: "essilorluxottica.com", desc: "Verres correcteurs, montures et lunettes de soleil.", name: "EssilorLuxottica", ticker: "EL", isin: "FR0000121667", sector: "sante" },
  { id: "eurofins", domain: "eurofins.com", desc: "Analyses de laboratoire : alimentation, environnement, pharmacie.", name: "Eurofins Scientific", ticker: "ERF", isin: "FR0014000MR3", sector: "sante" },
  { id: "hermes", domain: "hermes.com", desc: "Maroquinerie et objets de luxe.", name: "Herm\xE8s", ticker: "RMS", isin: "FR0000052292", sector: "conso" },
  { id: "kering", domain: "kering.com", desc: "Mode et maroquinerie de luxe (Gucci, Saint Laurent).", name: "Kering", ticker: "KER", isin: "FR0000121485", sector: "conso" },
  { id: "legrand", domain: "legrand.com", desc: "\xC9quipements \xE9lectriques pour les b\xE2timents.", name: "Legrand", ticker: "LR", isin: "FR0010307819", sector: "industrie" },
  { id: "loreal", domain: "loreal.com", desc: "Produits de beaut\xE9 et cosm\xE9tiques.", name: "L'Or\xE9al", ticker: "OR", isin: "FR0000120321", sector: "conso" },
  { id: "lvmh", domain: "lvmh.com", desc: "Luxe : mode, maroquinerie, vins et spiritueux, parfums, montres.", name: "LVMH", ticker: "MC", isin: "FR0000121014", sector: "conso" },
  { id: "michelin", domain: "michelin.com", desc: "Pneumatiques.", name: "Michelin", ticker: "ML", isin: "FR001400AJ45", sector: "industrie" },
  { id: "orange", domain: "orange.com", desc: "Op\xE9rateur de t\xE9l\xE9communications.", name: "Orange", ticker: "ORA", isin: "FR0000133308", sector: "telecom" },
  { id: "pernod-ricard", domain: "pernod-ricard.com", desc: "Vins et spiritueux.", name: "Pernod Ricard", ticker: "RI", isin: "FR0000120693", sector: "conso" },
  { id: "publicis", domain: "publicisgroupe.com", desc: "Publicit\xE9 et marketing.", name: "Publicis", ticker: "PUB", isin: "FR0000130577", sector: "telecom" },
  { id: "renault", domain: "renaultgroup.com", desc: "Construction automobile.", name: "Renault", ticker: "RNO", isin: "FR0000131906", sector: "industrie" },
  { id: "safran", domain: "safran-group.com", desc: "Moteurs d'avion, \xE9quipements a\xE9ronautiques et d\xE9fense.", name: "Safran", ticker: "SAF", isin: "FR0000073272", sector: "industrie" },
  { id: "saint-gobain", domain: "saint-gobain.com", desc: "Mat\xE9riaux de construction.", name: "Saint-Gobain", ticker: "SGO", isin: "FR0000125007", sector: "materiaux" },
  { id: "sanofi", domain: "sanofi.com", desc: "M\xE9dicaments et vaccins.", name: "Sanofi", ticker: "SAN", isin: "FR0000120578", sector: "sante" },
  { id: "schneider-electric", domain: "se.com", desc: "Gestion de l'\xE9nergie et automatismes.", name: "Schneider Electric", ticker: "SU", isin: "FR0000121972", sector: "industrie" },
  { id: "societe-generale", domain: "societegenerale.com", desc: "Banque de d\xE9tail et banque d'investissement.", name: "Soci\xE9t\xE9 G\xE9n\xE9rale", ticker: "GLE", isin: "FR0000130809", sector: "finance" },
  { id: "stmicroelectronics", domain: "st.com", desc: "Puces \xE9lectroniques (semi-conducteurs).", name: "STMicroelectronics", ticker: "STMPA", isin: "NL0000226223", sector: "tech" },
  { id: "teleperformance", domain: "tp.com", desc: "Relation client pour le compte d'autres entreprises.", name: "Teleperformance", ticker: "TEP", isin: "FR0000051807", sector: "tech" },
  { id: "thales", domain: "thalesgroup.com", desc: "D\xE9fense, a\xE9ronautique, espace et cybers\xE9curit\xE9.", name: "Thales", ticker: "HO", isin: "FR0000121329", sector: "industrie" },
  { id: "totalenergies", domain: "totalenergies.com", desc: "P\xE9trole, gaz et \xE9lectricit\xE9.", name: "TotalEnergies", ticker: "TTE", isin: "FR0000120271", sector: "energie" },
  { id: "unibail-rodamco-westfield", domain: "urw.com", desc: "Centres commerciaux (Westfield).", name: "Unibail-Rodamco-Westfield", ticker: "URW", isin: "FR0013326246", sector: "immo" },
  { id: "veolia", domain: "veolia.com", desc: "Gestion de l'eau, des d\xE9chets et de l'\xE9nergie.", name: "Veolia", ticker: "VIE", isin: "FR0000124141", sector: "services" },
  { id: "vinci", domain: "vinci.com", desc: "Construction et concessions (autoroutes, a\xE9roports).", name: "Vinci", ticker: "DG", isin: "FR0000125486", sector: "industrie" }
].map((c) => ({ ...c, tv: "EURONEXT:" + c.ticker, region: "FR" })), AUTRES = [
  { id: "asml", name: "ASML", ticker: "ASML", isin: "NL0010273215", tv: "EURONEXT:ASML", region: "EU", sector: "tech", domain: "asml.com", desc: "Machines qui fabriquent les puces \xE9lectroniques (lithographie)." },
  { id: "sap", name: "SAP", ticker: "SAP", isin: "DE0007164600", tv: "XETR:SAP", region: "EU", sector: "tech", domain: "sap.com", desc: "Logiciels de gestion pour les entreprises." },
  { id: "siemens", name: "Siemens", ticker: "SIE", isin: "DE0007236101", tv: "XETR:SIE", region: "EU", sector: "industrie", domain: "siemens.com", desc: "Automatisation industrielle, infrastructures, trains." },
  { id: "allianz", name: "Allianz", ticker: "ALV", isin: "DE0008404005", tv: "XETR:ALV", region: "EU", sector: "finance", domain: "allianz.com", desc: "Assurance et gestion d'\xE9pargne." },
  { id: "deutsche-telekom", name: "Deutsche Telekom", ticker: "DTE", isin: "DE0005557508", tv: "XETR:DTE", region: "EU", sector: "telecom", domain: "telekom.com", desc: "Op\xE9rateur t\xE9l\xE9coms en Europe et aux \xC9tats-Unis (T-Mobile)." },
  { id: "mercedes-benz", name: "Mercedes-Benz", ticker: "MBG", isin: "DE0007100000", tv: "XETR:MBG", region: "EU", sector: "industrie", domain: "mercedes-benz.com", desc: "Voitures et utilitaires haut de gamme." },
  { id: "bmw", name: "BMW", ticker: "BMW", isin: "DE0005190003", tv: "XETR:BMW", region: "EU", sector: "industrie", domain: "bmwgroup.com", desc: "Voitures (BMW, Mini) et motos." },
  { id: "basf", name: "BASF", ticker: "BAS", isin: "DE000BASF111", tv: "XETR:BAS", region: "EU", sector: "materiaux", domain: "basf.com", desc: "Chimie." },
  { id: "bayer", name: "Bayer", ticker: "BAYN", isin: "DE000BAY0017", tv: "XETR:BAYN", region: "EU", sector: "sante", domain: "bayer.com", desc: "M\xE9dicaments et produits pour l'agriculture." },
  { id: "infineon", name: "Infineon", ticker: "IFX", isin: "DE0006231004", tv: "XETR:IFX", region: "EU", sector: "tech", domain: "infineon.com", desc: "Puces \xE9lectroniques pour l'automobile et l'\xE9nergie." },
  { id: "adidas", name: "Adidas", ticker: "ADS", isin: "DE000A1EWWW0", tv: "XETR:ADS", region: "EU", sector: "conso", domain: "adidas.com", desc: "Chaussures et v\xEAtements de sport." },
  { id: "munich-re", name: "Munich Re", ticker: "MUV2", isin: "DE0008430026", tv: "XETR:MUV2", region: "EU", sector: "finance", domain: "munichre.com", desc: "R\xE9assurance : elle assure les assureurs." },
  { id: "rheinmetall", name: "Rheinmetall", ticker: "RHM", isin: "DE0007030033", tv: "XETR:RHM", region: "EU", sector: "industrie", domain: "rheinmetall.com", desc: "D\xE9fense : v\xE9hicules blind\xE9s et munitions." },
  { id: "iberdrola", name: "Iberdrola", ticker: "IBE", isin: "ES0144580Y14", tv: "BME:IBE", region: "EU", sector: "services", domain: "iberdrola.com", desc: "\xC9lectricit\xE9, en grande partie renouvelable." },
  { id: "santander", name: "Banco Santander", ticker: "SAN", isin: "ES0113900J37", tv: "BME:SAN", region: "EU", sector: "finance", domain: "santander.com", desc: "Banque de d\xE9tail en Europe et en Am\xE9rique." },
  { id: "inditex", name: "Inditex", ticker: "ITX", isin: "ES0148396007", tv: "BME:ITX", region: "EU", sector: "conso", domain: "inditex.com", desc: "V\xEAtements (Zara, Massimo Dutti, Bershka)." },
  { id: "enel", name: "Enel", ticker: "ENEL", isin: "IT0003128367", tv: "MIL:ENEL", region: "EU", sector: "services", domain: "enel.com", desc: "Production et distribution d'\xE9lectricit\xE9." },
  { id: "eni", name: "Eni", ticker: "ENI", isin: "IT0003132476", tv: "MIL:ENI", region: "EU", sector: "energie", domain: "eni.com", desc: "P\xE9trole et gaz." },
  { id: "intesa-sanpaolo", name: "Intesa Sanpaolo", ticker: "ISP", isin: "IT0000072618", tv: "MIL:ISP", region: "EU", sector: "finance", domain: "intesasanpaolo.com", desc: "Banque." },
  { id: "ferrari", name: "Ferrari", ticker: "RACE", isin: "NL0011585146", tv: "MIL:RACE", region: "EU", sector: "industrie", domain: "ferrari.com", desc: "Voitures de sport." },
  { id: "stellantis", name: "Stellantis", ticker: "STLAP", isin: "NL00150001Q9", tv: "EURONEXT:STLAP", region: "EU", sector: "industrie", domain: "stellantis.com", desc: "Automobile (Peugeot, Fiat, Citro\xEBn, Jeep)." },
  { id: "ing", name: "ING", ticker: "INGA", isin: "NL0011821202", tv: "EURONEXT:INGA", region: "EU", sector: "finance", domain: "ing.com", desc: "Banque." },
  { id: "ahold-delhaize", name: "Ahold Delhaize", ticker: "AD", isin: "NL0011794037", tv: "EURONEXT:AD", region: "EU", sector: "conso", domain: "aholddelhaize.com", desc: "Supermarch\xE9s en Europe et aux \xC9tats-Unis." },
  { id: "adyen", name: "Adyen", ticker: "ADYEN", isin: "NL0012969182", tv: "EURONEXT:ADYEN", region: "EU", sector: "tech", domain: "adyen.com", desc: "Paiements en ligne pour les commer\xE7ants." },
  { id: "ab-inbev", name: "AB InBev", ticker: "ABI", isin: "BE0974293251", tv: "EURONEXT:ABI", region: "EU", sector: "conso", domain: "ab-inbev.com", desc: "Bi\xE8res (Budweiser, Stella Artois, Corona)." },
  { id: "nokia", name: "Nokia", ticker: "NOKIA", isin: "FI0009000681", tv: "OMXHEX:NOKIA", region: "EU", sector: "tech", domain: "nokia.com", desc: "\xC9quipements de r\xE9seaux t\xE9l\xE9coms." },
  { id: "apple", name: "Apple", ticker: "AAPL", sec: "AAPL", tv: "NASDAQ:AAPL", region: "US", sector: "tech", domain: "apple.com", desc: "iPhone, Mac et services (App Store, iCloud)." },
  { id: "microsoft", name: "Microsoft", ticker: "MSFT", sec: "MSFT", tv: "NASDAQ:MSFT", region: "US", sector: "tech", domain: "microsoft.com", desc: "Logiciels (Windows, Office) et cloud (Azure)." },
  { id: "nvidia", name: "Nvidia", ticker: "NVDA", sec: "NVDA", tv: "NASDAQ:NVDA", region: "US", sector: "tech", domain: "nvidia.com", desc: "Puces graphiques et puces pour l'intelligence artificielle." },
  { id: "amazon", name: "Amazon", ticker: "AMZN", sec: "AMZN", tv: "NASDAQ:AMZN", region: "US", sector: "conso", domain: "amazon.com", desc: "Commerce en ligne et cloud (AWS)." },
  { id: "alphabet", name: "Alphabet (Google)", ticker: "GOOGL", sec: "GOOGL", tv: "NASDAQ:GOOGL", region: "US", sector: "telecom", domain: "abc.xyz", desc: "Google : recherche, publicit\xE9, YouTube, cloud." },
  { id: "meta", name: "Meta", ticker: "META", sec: "META", tv: "NASDAQ:META", region: "US", sector: "telecom", domain: "meta.com", desc: "Facebook, Instagram, WhatsApp, financ\xE9s par la publicit\xE9." },
  { id: "tesla", name: "Tesla", ticker: "TSLA", sec: "TSLA", tv: "NASDAQ:TSLA", region: "US", sector: "industrie", domain: "tesla.com", desc: "Voitures \xE9lectriques et batteries." },
  { id: "jpmorgan", name: "JPMorgan Chase", ticker: "JPM", sec: "JPM", tv: "NYSE:JPM", region: "US", sector: "finance", domain: "jpmorganchase.com", desc: "Banque." },
  { id: "visa", name: "Visa", ticker: "V", sec: "V", tv: "NYSE:V", region: "US", sector: "finance", domain: "visa.com", desc: "R\xE9seau de paiement par carte." },
  { id: "mastercard", name: "Mastercard", ticker: "MA", sec: "MA", tv: "NYSE:MA", region: "US", sector: "finance", domain: "mastercard.com", desc: "R\xE9seau de paiement par carte." },
  { id: "johnson-johnson", name: "Johnson & Johnson", ticker: "JNJ", sec: "JNJ", tv: "NYSE:JNJ", region: "US", sector: "sante", domain: "jnj.com", desc: "M\xE9dicaments et mat\xE9riel m\xE9dical." },
  { id: "eli-lilly", name: "Eli Lilly", ticker: "LLY", sec: "LLY", tv: "NYSE:LLY", region: "US", sector: "sante", domain: "lilly.com", desc: "M\xE9dicaments (diab\xE8te, ob\xE9sit\xE9, cancer)." },
  { id: "procter-gamble", name: "Procter & Gamble", ticker: "PG", sec: "PG", tv: "NYSE:PG", region: "US", sector: "conso", domain: "pg.com", desc: "Produits d'hygi\xE8ne et d'entretien (Pampers, Gillette, Ariel)." },
  { id: "exxonmobil", name: "ExxonMobil", ticker: "XOM", sec: "XOM", tv: "NYSE:XOM", region: "US", sector: "energie", domain: "exxonmobil.com", desc: "P\xE9trole et gaz." },
  { id: "coca-cola", name: "Coca-Cola", ticker: "KO", sec: "KO", tv: "NYSE:KO", region: "US", sector: "conso", domain: "coca-colacompany.com", desc: "Boissons." },
  { id: "pepsico", name: "PepsiCo", ticker: "PEP", sec: "PEP", tv: "NASDAQ:PEP", region: "US", sector: "conso", domain: "pepsico.com", desc: "Boissons et snacks (Pepsi, Lay's)." },
  { id: "costco", name: "Costco", ticker: "COST", sec: "COST", tv: "NASDAQ:COST", region: "US", sector: "conso", domain: "costco.com", desc: "Magasins-entrep\xF4ts sur abonnement." },
  { id: "mcdonalds", name: "McDonald's", ticker: "MCD", sec: "MCD", tv: "NYSE:MCD", region: "US", sector: "conso", domain: "mcdonalds.com", desc: "Restauration rapide, surtout en franchise." },
  { id: "nike", name: "Nike", ticker: "NKE", sec: "NKE", tv: "NYSE:NKE", region: "US", sector: "conso", domain: "nike.com", desc: "Chaussures et v\xEAtements de sport." },
  { id: "disney", name: "Disney", ticker: "DIS", sec: "DIS", tv: "NYSE:DIS", region: "US", sector: "telecom", domain: "thewaltdisneycompany.com", desc: "Films, parcs d'attractions et streaming." },
  { id: "netflix", name: "Netflix", ticker: "NFLX", sec: "NFLX", tv: "NASDAQ:NFLX", region: "US", sector: "telecom", domain: "netflix.com", desc: "Streaming de films et s\xE9ries." },
  { id: "oracle", name: "Oracle", ticker: "ORCL", sec: "ORCL", tv: "NYSE:ORCL", region: "US", sector: "tech", domain: "oracle.com", desc: "Bases de donn\xE9es et cloud." },
  { id: "amd", name: "AMD", ticker: "AMD", sec: "AMD", tv: "NASDAQ:AMD", region: "US", sector: "tech", domain: "amd.com", desc: "Processeurs et puces graphiques." },
  { id: "intel", name: "Intel", ticker: "INTC", sec: "INTC", tv: "NASDAQ:INTC", region: "US", sector: "tech", domain: "intel.com", desc: "Processeurs." },
  { id: "boeing", name: "Boeing", ticker: "BA", sec: "BA", tv: "NYSE:BA", region: "US", sector: "industrie", domain: "boeing.com", desc: "Avions de ligne et d\xE9fense." },
  { id: "caterpillar", name: "Caterpillar", ticker: "CAT", sec: "CAT", tv: "NYSE:CAT", region: "US", sector: "industrie", domain: "caterpillar.com", desc: "Engins de chantier et moteurs." },
  { id: "pfizer", name: "Pfizer", ticker: "PFE", sec: "PFE", tv: "NYSE:PFE", region: "US", sector: "sante", domain: "pfizer.com", desc: "M\xE9dicaments et vaccins." },
  { id: "chevron", name: "Chevron", ticker: "CVX", sec: "CVX", tv: "NYSE:CVX", region: "US", sector: "energie", domain: "chevron.com", desc: "P\xE9trole et gaz." },
  { id: "salesforce", name: "Salesforce", ticker: "CRM", sec: "CRM", tv: "NYSE:CRM", region: "US", sector: "tech", domain: "salesforce.com", desc: "Logiciels en ligne de gestion de la relation client." },
  { id: "adobe", name: "Adobe", ticker: "ADBE", sec: "ADBE", tv: "NASDAQ:ADBE", region: "US", sector: "tech", domain: "adobe.com", desc: "Logiciels de cr\xE9ation (Photoshop) et de documents (PDF)." }
], univers_default = [...FRANCE, ...AUTRES];

// cf/src/amf.mjs
var API = "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
function pick(rec, tests) {
  for (let t of tests)
    for (let [k, v] of Object.entries(rec))
      if (!(v == null || v === "" || typeof v == "object") && t(k, v))
        return String(v);
  return "";
}
function normalize(rec) {
  let r = rec.record && rec.record.fields ? rec.record.fields : rec, date = r.uin_dat_amf || pick(r, [(k) => /dat/.test(k)]), company = pick(r, [(k) => /nom_soc|raison_sociale|denomination/.test(k), (k) => /societe.*nom|nom.*societe/.test(k), (k) => /(^|_)nom($|_)/.test(k)]), title = pick(r, [(k) => /tit/.test(k), (k) => /libelle|objet|intitule/.test(k)]), type = r.sous_type_d_information || r.subtype_of_information || pick(r, [(k) => /sous_type|subtype/.test(k), (k) => /type/.test(k) && !/mime|content/.test(k)]), url = pick(r, [(k, v) => /^https?:\/\//.test(v) && /\.pdf/i.test(v), (k, v) => /^https?:\/\//.test(v)]);
  return {
    id: r.uin_idt_uin || "",
    date: String(date || ""),
    lang: r.informationdeposee_inf_lng_inf || "",
    isin: r.identificationsociete_iso_cd_isi || "",
    company,
    title: title || type || "Publication",
    type,
    url
  };
}
async function amf(request, followed = []) {
  let u = new URL(request.url), limit = Math.max(1, Math.min(50, parseInt(u.searchParams.get("limit") || "20", 10) || 20)), q = (u.searchParams.get("q") || "").replace(/["\\]/g, "").slice(0, 60).trim(), isin = (u.searchParams.get("isin") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12), raw = u.searchParams.get("raw") === "1", where = [];
  u.searchParams.get("suivies") === "1" && followed.length && where.push(`identificationsociete_iso_cd_isi in (${followed.map((i) => `"${i}"`).join(",")})`), isin && where.push(`identificationsociete_iso_cd_isi="${isin}"`), q && where.push(`"${q}"`);
  let api = new URL(API);
  api.searchParams.set("limit", String(limit)), api.searchParams.set("order_by", "uin_dat_amf desc"), where.length && api.searchParams.set("where", where.join(" AND "));
  let cache = typeof caches < "u" ? caches.default : null, key = new Request(api.toString() + (raw ? "&_raw" : ""));
  if (cache) {
    let hit = await cache.match(key);
    if (hit) return hit;
  }
  let body, status = 200;
  try {
    let r = await fetch(api.toString(), { headers: { accept: "application/json" }, cf: { cacheTtl: 900 } });
    if (!r.ok) throw new Error("AMF " + r.status);
    let j = await r.json(), list = j.results || j.records || [];
    body = raw ? j : { source: "AMF \u2013 info-financiere.gouv.fr", total: j.total_count ?? list.length, items: list.map(normalize) };
  } catch {
    status = 502, body = { error: "Le flux de l'AMF est momentan\xE9ment indisponible.", items: [] };
  }
  let res = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${status === 200 ? 900 : 60}` }
  });
  return cache && status === 200 && await cache.put(key, res.clone()), res;
}

// cf/src/worker.mjs
var INDEX = univers_default.map((c) => ({ id: c.id, name: c.name, sector: SECTEURS[c.sector], desc: c.desc || "" })), SITE = "Rep\xE8re", BASE_DESC = "Les chiffres cl\xE9s des entreprises cot\xE9es, expliqu\xE9s simplement, et des simulateurs pour comprendre l'investissement. Informations factuelles, sans conseil.", TOOLS = { passe: "Simulateur sur le pass\xE9", interets: "Simulateur d'int\xE9r\xEAts compos\xE9s", frais: "Simulateur de l'impact des frais", "pea-cto": "Simulateur PEA ou compte-titres", "une-fois": "Investir en une fois ou chaque mois" }, BY = Object.fromEntries(INDEX.map((c) => [c.id, c])), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function meta(path) {
  let p = path.replace(/\/+$/, "") || "/", base = p.replace(/^(\/entreprise\/[a-z0-9-]+)\/(comptes|actualite|agenda)$/, "$1"), m;
  if (p === "/") return { title: `${SITE} \xB7 La Bourse expliqu\xE9e`, desc: BASE_DESC };
  if (m = base.match(/^\/entreprise\/([a-z0-9-]+)$/)) {
    let c = BY[m[1]];
    return c ? { title: `${c.name} : cours, comptes et actualit\xE9 \xB7 ${SITE}`, desc: `${c.name} (${c.sector}). ${c.desc} Cours de l'action, chiffre d'affaires, marge, r\xE9sultat, dette et dividende tir\xE9s des rapports annuels, publications officielles AMF. Chaque chiffre est expliqu\xE9.` } : null;
  }
  if (m = p.match(/^\/simulateurs(?:\/([a-z-]+))?$/)) {
    let t = TOOLS[m[1] || "passe"];
    return t ? { title: `${t} \xB7 ${SITE}`, desc: "Simulez l'\xE9volution d'un placement, avec les hypoth\xE8ses affich\xE9es. Outil p\xE9dagogique, sans conseil." } : null;
  }
  return p === "/entreprises" ? { title: `Les entreprises \xB7 ${SITE}`, desc: "Les grandes entreprises de France, d'Europe et des \xC9tats-Unis : ce qu'elles font, leurs comptes et leurs points forts et faibles, expliqu\xE9s simplement." } : p === "/actualites" ? { title: `Actualit\xE9 des entreprises \xB7 ${SITE}`, desc: "R\xE9sultats, dividendes, assembl\xE9es g\xE9n\xE9rales et publications officielles d\xE9pos\xE9es aupr\xE8s de l'AMF." } : p === "/agenda" ? { title: `Agenda financier \xB7 ${SITE}`, desc: "Dates des r\xE9sultats, assembl\xE9es g\xE9n\xE9rales et dividendes des entreprises cot\xE9es." } : p === "/portefeuille" ? { title: `Portefeuille \xB7 ${SITE}`, desc: "Suivez la performance r\xE9elle de vos placements ou entra\xEEnez-vous avec un portefeuille virtuel." } : p === "/lexique" ? { title: `Lexique \xB7 ${SITE}`, desc: "PER, rendement, marge, dette, volatilit\xE9 : chaque chiffre de la Bourse expliqu\xE9 simplement, avec ses limites." } : p === "/mentions-legales" ? { title: `Mentions l\xE9gales \xB7 ${SITE}`, desc: BASE_DESC } : null;
}
var worker_default = {
  async fetch(request, env) {
    let url = new URL(request.url);
    if (url.pathname === "/api/amf") return amf(request, univers_default.filter((c) => c.region === "FR").map((c) => c.isin));
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Introuvable" }, { status: 404 });
    let info = meta(url.pathname);
    if (!info) {
      let r = await env.ASSETS.fetch(request);
      if (r.status !== 404 && !(r.headers.get("content-type") || "").includes("text/html")) return r;
      if (url.pathname.match(/\.[a-z0-9]+$/i)) return new Response("Introuvable", { status: 404 });
    }
    let html = await (await env.ASSETS.fetch(new Request(new URL("/", url), request))).text(), t = info || { title: `Page introuvable \xB7 ${SITE}`, desc: BASE_DESC };
    return html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.title)}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}">`), new Response(html, { status: info ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
  }
};
export {
  worker_default as default,
  meta
};
