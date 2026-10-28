// Catalogue des ETF les plus utilisés par les épargnants français (PEA et compte-titres).
// Données vérifiées sur justetf.com et les sites des émetteurs (octobre 2026) :
// ISIN, frais courants (ter, en % par an), éligibilité PEA, réplication, distribution.
// encours : en millions d'euros, ordre de grandeur seulement.
// tv : symbole TradingView de la ligne cotée en euros utilisée pour les cours.
// proxy : ETF coté aux États-Unis qui suit le même indice (ou un indice proche, voir proxyIndex)
//   et qui dépose ses compositions mensuelles à la SEC (formulaire N-PORT). Sert à montrer le contenu.
// fiche : quoi (ce qu'on achète), contenu (ce qu'il y a dedans), varie (ce qui fait bouger le prix).

// Liste unique des codes proxy utilisés plus bas (à garder synchronisée avec les entrées).
export const PROXIES = ["URTH", "VT", "ACWI", "IVV", "QQQM", "IWM", "IEUR", "FEZ", "EWQ", "EEM", "IEMG", "MCHI", "INDA", "EWJ", "SOXX", "ICLN", "IXJ", "SDY", "REET", "IEF"];

const ETF = [
  // ——— Actions monde ———
  { id: "amundi-msci-world-pea", name: "Amundi PEA Monde (MSCI World)", isin: "FR001400U5Q4", ticker: "DCAM", tv: "EURONEXT:DCAM", issuer: "Amundi", index: "MSCI World", categorie: "actions-monde",
    ter: 0.20, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 1700, proxy: "URTH",
    fiche: { quoi: "Les grandes entreprises des pays développés, en une seule ligne logée dans un PEA.", contenu: "Environ 1 300 entreprises de 23 pays. Les États-Unis pèsent environ 70 %, la technologie est le premier secteur.", varie: "Les cours des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "amundi-msci-world-swap", name: "Amundi MSCI World Swap (CW8)", isin: "LU1681043599", ticker: "CW8", tv: "EURONEXT:CW8", issuer: "Amundi", index: "MSCI World", categorie: "actions-monde",
    ter: 0.38, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 6800, proxy: "URTH",
    fiche: { quoi: "Le même indice MSCI World, dans un fonds plus ancien, lui aussi éligible au PEA.", contenu: "Environ 1 300 entreprises de 23 pays développés. Les États-Unis pèsent environ 70 %.", varie: "Les cours des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "ishares-msci-world-swap-pea", name: "iShares MSCI World Swap PEA", isin: "IE0002XZSHO1", ticker: "WPEA", tv: "EURONEXT:WPEA", issuer: "iShares", index: "MSCI World", categorie: "actions-monde",
    ter: 0.20, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 2300, proxy: "URTH",
    fiche: { quoi: "L'indice MSCI World chez iShares, dans une version conçue pour le PEA.", contenu: "Environ 1 300 entreprises de 23 pays développés. Les États-Unis pèsent environ 70 %.", varie: "Les cours des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "ishares-core-msci-world", name: "iShares Core MSCI World", isin: "IE00B4L5Y983", ticker: "EUNL", tv: "XETR:EUNL", issuer: "iShares", index: "MSCI World", categorie: "actions-monde",
    ter: 0.20, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 131000, proxy: "URTH",
    fiche: { quoi: "Les grandes entreprises des pays développés. Le fonds détient directement les actions.", contenu: "Environ 1 300 entreprises de 23 pays. Les États-Unis pèsent environ 70 %, la technologie est le premier secteur.", varie: "Les cours des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "vanguard-ftse-all-world-acc", name: "Vanguard FTSE All-World (capitalisation)", isin: "IE00BK5BQT80", ticker: "VWCE", tv: "XETR:VWCE", issuer: "Vanguard", index: "FTSE All-World", categorie: "actions-monde",
    ter: 0.14, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 55000, proxy: "VT", proxyIndex: "FTSE Global All Cap",
    fiche: { quoi: "Les grandes et moyennes entreprises du monde entier, pays émergents compris.", contenu: "Plus de 4 000 entreprises de près de 50 pays. Les États-Unis pèsent environ 60 %, les émergents environ 10 %.", varie: "Les marchés américains d'abord, puis l'Europe, le Japon et les émergents, et le taux de change euro-dollar." } },
  { id: "vanguard-ftse-all-world-dist", name: "Vanguard FTSE All-World (distribution)", isin: "IE00B3RBWM25", ticker: "VWRL", tv: "EURONEXT:VWRL", issuer: "Vanguard", index: "FTSE All-World", categorie: "actions-monde",
    ter: 0.14, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 24000, proxy: "VT", proxyIndex: "FTSE Global All Cap",
    fiche: { quoi: "Le même indice mondial, avec des dividendes versés chaque trimestre.", contenu: "Plus de 4 000 entreprises de près de 50 pays, pays émergents compris. Les États-Unis pèsent environ 60 %.", varie: "Les marchés américains d'abord, puis l'Europe, le Japon et les émergents, et le taux de change euro-dollar." } },
  { id: "ishares-msci-acwi", name: "iShares MSCI ACWI", isin: "IE00B6R52259", ticker: "IUSQ", tv: "XETR:IUSQ", issuer: "iShares", index: "MSCI ACWI", categorie: "actions-monde",
    ter: 0.20, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 32000, proxy: "ACWI",
    fiche: { quoi: "Les grandes et moyennes entreprises des pays développés et émergents.", contenu: "Environ 2 500 entreprises de 47 pays. Les États-Unis pèsent environ 65 %, les émergents environ 10 %.", varie: "Les cours des grandes entreprises américaines, la santé des pays émergents et le taux de change euro-dollar." } },
  { id: "ishares-msci-world-small-cap", name: "iShares MSCI World Small Cap", isin: "IE00BF4RFH31", ticker: "IUSN", tv: "XETR:IUSN", issuer: "iShares", index: "MSCI World Small Cap", categorie: "actions-monde",
    ter: 0.35, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 7900, proxy: "",
    fiche: { quoi: "Les petites entreprises cotées des pays développés.", contenu: "Plus de 3 000 entreprises de 23 pays. Les États-Unis pèsent environ 60 %. Industrie et finance sont les premiers secteurs.", varie: "La conjoncture économique et le niveau des taux d'intérêt, auxquels les petites entreprises sont plus sensibles." } },

  // ——— Actions États-Unis ———
  { id: "amundi-sp500-pea", name: "Amundi PEA S&P 500", isin: "FR0011871128", ticker: "PSP5", tv: "EURONEXT:PSP5", issuer: "Amundi", index: "S&P 500", categorie: "actions-usa",
    ter: 0.12, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 1250, proxy: "IVV",
    fiche: { quoi: "Les 500 grandes entreprises américaines, dans un PEA.", contenu: "500 entreprises cotées aux États-Unis. La technologie pèse environ un tiers. Apple, Microsoft et Nvidia sont en tête.", varie: "Les résultats des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "bnp-sp500", name: "BNP Paribas Easy S&P 500", isin: "FR0011550185", ticker: "ESE", tv: "EURONEXT:ESE", issuer: "BNP Paribas Easy", index: "S&P 500", categorie: "actions-usa",
    ter: 0.14, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 3700, proxy: "IVV",
    fiche: { quoi: "Les 500 grandes entreprises américaines, dans un PEA.", contenu: "500 entreprises cotées aux États-Unis. La technologie pèse environ un tiers.", varie: "Les résultats des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "ishares-core-sp500", name: "iShares Core S&P 500", isin: "IE00B5BMR087", ticker: "SXR8", tv: "XETR:SXR8", issuer: "iShares", index: "S&P 500", categorie: "actions-usa",
    ter: 0.07, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 138000, proxy: "IVV",
    fiche: { quoi: "Les 500 grandes entreprises américaines. Le fonds détient directement les actions.", contenu: "500 entreprises cotées aux États-Unis. La technologie pèse environ un tiers.", varie: "Les résultats des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "vanguard-sp500", name: "Vanguard S&P 500", isin: "IE00B3XXRP09", ticker: "VUSA", tv: "EURONEXT:VUSA", issuer: "Vanguard", index: "S&P 500", categorie: "actions-usa",
    ter: 0.07, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 48000, proxy: "IVV",
    fiche: { quoi: "Les 500 grandes entreprises américaines, avec des dividendes versés chaque trimestre.", contenu: "500 entreprises cotées aux États-Unis. La technologie pèse environ un tiers.", varie: "Les résultats des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "spdr-sp500", name: "SPDR S&P 500", isin: "IE00B6YX5C33", ticker: "SPY5", tv: "EURONEXT:SPY5", issuer: "SPDR", index: "S&P 500", categorie: "actions-usa",
    ter: 0.03, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 19000, proxy: "IVV",
    fiche: { quoi: "Les 500 grandes entreprises américaines, avec des dividendes versés chaque trimestre.", contenu: "500 entreprises cotées aux États-Unis. La technologie pèse environ un tiers.", varie: "Les résultats des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "xtrackers-msci-usa", name: "Xtrackers MSCI USA", isin: "IE00BJ0KDR00", ticker: "XD9U", tv: "XETR:XD9U", issuer: "Xtrackers", index: "MSCI USA", categorie: "actions-usa",
    ter: 0.03, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 12000, proxy: "IVV", proxyIndex: "S&P 500",
    fiche: { quoi: "Les grandes et moyennes entreprises américaines.", contenu: "Environ 550 entreprises. Le contenu est très proche du S&P 500, avec la technologie en tête.", varie: "Les résultats des grandes entreprises américaines et le taux de change euro-dollar." } },
  { id: "amundi-nasdaq100-pea", name: "Amundi PEA Nasdaq-100", isin: "FR0011871110", ticker: "PUST", tv: "EURONEXT:PUST", issuer: "Amundi", index: "Nasdaq-100", categorie: "actions-usa",
    ter: 0.30, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 1250, proxy: "QQQM",
    fiche: { quoi: "Les 100 plus grandes entreprises non financières cotées au Nasdaq, dans un PEA.", contenu: "100 entreprises, surtout américaines. La technologie pèse plus de la moitié. Les dix premières font environ la moitié du fonds.", varie: "Les résultats et les perspectives des géants de la technologie, et le taux de change euro-dollar." } },
  { id: "ishares-nasdaq100", name: "iShares Nasdaq 100", isin: "IE00B53SZB19", ticker: "SXRV", tv: "XETR:SXRV", issuer: "iShares", index: "Nasdaq-100", categorie: "actions-usa",
    ter: 0.30, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 26000, proxy: "QQQM",
    fiche: { quoi: "Les 100 plus grandes entreprises non financières cotées au Nasdaq.", contenu: "100 entreprises, surtout américaines. La technologie pèse plus de la moitié.", varie: "Les résultats et les perspectives des géants de la technologie, et le taux de change euro-dollar." } },
  { id: "invesco-eqqq-nasdaq100", name: "Invesco EQQQ Nasdaq-100", isin: "IE0032077012", ticker: "EQQQ", tv: "EURONEXT:EQQQ", issuer: "Invesco", index: "Nasdaq-100", categorie: "actions-usa",
    ter: 0.30, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 12700, proxy: "QQQM",
    fiche: { quoi: "Les 100 plus grandes entreprises non financières cotées au Nasdaq, avec des dividendes versés.", contenu: "100 entreprises, surtout américaines. La technologie pèse plus de la moitié.", varie: "Les résultats et les perspectives des géants de la technologie, et le taux de change euro-dollar." } },
  { id: "spdr-russell-2000", name: "SPDR Russell 2000 US Small Cap", isin: "IE00BJ38QD84", ticker: "R2US", tv: "XETR:R2US", issuer: "SPDR", index: "Russell 2000", categorie: "actions-usa",
    ter: 0.30, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 1300, proxy: "IWM",
    fiche: { quoi: "Les petites entreprises cotées aux États-Unis.", contenu: "Environ 2 000 entreprises. Santé, industrie et finance sont les premiers secteurs. Aucune ne pèse plus de 1 %.", varie: "L'économie américaine et les taux d'intérêt : beaucoup de ces entreprises sont endettées." } },

  // ——— Actions Europe ———
  { id: "amundi-stoxx-europe-600", name: "Amundi Core Stoxx Europe 600", isin: "LU0908500753", ticker: "MEUD", tv: "EURONEXT:MEUD", issuer: "Amundi", index: "Stoxx Europe 600", categorie: "actions-europe",
    ter: 0.07, pea: true, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 21000, proxy: "IEUR", proxyIndex: "MSCI Europe IMI",
    fiche: { quoi: "600 grandes, moyennes et petites entreprises européennes.", contenu: "600 entreprises de 17 pays, Royaume-Uni et Suisse compris. Royaume-Uni, France et Allemagne sont en tête.", varie: "L'économie européenne, les banques, la santé et l'industrie, qui sont les plus gros secteurs." } },
  { id: "bnp-stoxx-europe-600", name: "BNP Paribas Easy Stoxx Europe 600", isin: "FR0011550193", ticker: "ETZ", tv: "EURONEXT:ETZ", issuer: "BNP Paribas Easy", index: "Stoxx Europe 600", categorie: "actions-europe",
    ter: 0.19, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 1100, proxy: "IEUR", proxyIndex: "MSCI Europe IMI",
    fiche: { quoi: "600 entreprises européennes, dans un PEA.", contenu: "600 entreprises de 17 pays, Royaume-Uni et Suisse compris.", varie: "L'économie européenne, les banques, la santé et l'industrie." } },
  { id: "ishares-stoxx-europe-600", name: "iShares Stoxx Europe 600 (DE)", isin: "DE0002635307", ticker: "EXSA", tv: "XETR:EXSA", issuer: "iShares", index: "Stoxx Europe 600", categorie: "actions-europe",
    ter: 0.20, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 9500, proxy: "IEUR", proxyIndex: "MSCI Europe IMI",
    fiche: { quoi: "600 entreprises européennes, avec des dividendes versés.", contenu: "600 entreprises de 17 pays, Royaume-Uni et Suisse compris.", varie: "L'économie européenne, les banques, la santé et l'industrie." } },
  { id: "amundi-msci-europe-pea", name: "Amundi PEA MSCI Europe", isin: "FR0013412038", ticker: "PCEU", tv: "EURONEXT:PCEU", issuer: "Amundi", index: "MSCI Europe", categorie: "actions-europe",
    ter: 0.15, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 390, proxy: "IEUR", proxyIndex: "MSCI Europe IMI",
    fiche: { quoi: "Les grandes et moyennes entreprises européennes, dans un PEA.", contenu: "Environ 400 entreprises de 15 pays. Royaume-Uni, France, Suisse et Allemagne sont en tête.", varie: "L'économie européenne et les cours des plus grosses sociétés, comme ASML, Novo Nordisk ou Nestlé." } },
  { id: "ishares-core-msci-europe", name: "iShares Core MSCI Europe", isin: "IE00B4K48X80", ticker: "EUNK", tv: "XETR:EUNK", issuer: "iShares", index: "MSCI Europe", categorie: "actions-europe",
    ter: 0.12, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 15800, proxy: "IEUR", proxyIndex: "MSCI Europe IMI",
    fiche: { quoi: "Les grandes et moyennes entreprises européennes.", contenu: "Environ 400 entreprises de 15 pays, Royaume-Uni et Suisse compris.", varie: "L'économie européenne et les cours des plus grosses sociétés." } },
  { id: "amundi-euro-stoxx-50", name: "Amundi Euro Stoxx 50 II", isin: "FR0007054358", ticker: "MSE", tv: "EURONEXT:MSE", issuer: "Amundi", index: "Euro Stoxx 50", categorie: "actions-europe",
    ter: 0.20, pea: true, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 4600, proxy: "FEZ",
    fiche: { quoi: "Les 50 plus grandes entreprises de la zone euro.", contenu: "50 entreprises. France et Allemagne font plus des deux tiers. ASML, SAP et LVMH sont parmi les premières.", varie: "Les cours de quelques très grandes sociétés françaises et allemandes, et l'économie de la zone euro." } },

  // ——— Actions France ———
  { id: "amundi-cac40", name: "Amundi CAC 40", isin: "FR0007052782", ticker: "CAC", tv: "EURONEXT:CAC", issuer: "Amundi", index: "CAC 40", categorie: "actions-france",
    ter: 0.25, pea: true, distribution: "distribution", replication: "physique", devise: "EUR", encours: 3000, proxy: "EWQ", proxyIndex: "MSCI France",
    fiche: { quoi: "Les 40 entreprises qui composent le CAC 40, avec un dividende versé chaque année.", contenu: "40 grandes sociétés cotées à Paris. Le luxe, l'industrie et l'énergie pèsent lourd.", varie: "Les cours de LVMH, TotalEnergies, Airbus ou Schneider, et la demande mondiale, car ces groupes vendent partout." } },

  // ——— Actions pays émergents ———
  { id: "amundi-pea-emergents", name: "Amundi PEA Émergents (MSCI Emerging) ESG Transition", isin: "FR0013412020", ticker: "PAEEM", tv: "EURONEXT:PAEEM", issuer: "Amundi", index: "MSCI EM ex-Egypt ESG Broad CTB Select", categorie: "actions-emergents",
    ter: 0.30, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 900, proxy: "EEM", proxyIndex: "MSCI Emerging Markets",
    fiche: { quoi: "Les grandes entreprises des pays émergents, dans un PEA.", contenu: "Plus de 1 000 entreprises. Chine, Taïwan et Inde sont en tête. L'indice écarte certaines activités et réduit le poids des plus émettrices de CO2.", varie: "L'économie chinoise, les semi-conducteurs taïwanais, le dollar et les devises des pays émergents." } },
  { id: "ishares-core-msci-em-imi", name: "iShares Core MSCI Emerging Markets IMI", isin: "IE00BKM4GZ66", ticker: "IS3N", tv: "XETR:IS3N", issuer: "iShares", index: "MSCI Emerging Markets IMI", categorie: "actions-emergents",
    ter: 0.18, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 37600, proxy: "IEMG",
    fiche: { quoi: "Les entreprises de toutes tailles des pays émergents.", contenu: "Plus de 3 000 entreprises de 24 pays. Chine, Taïwan et Inde font plus de la moitié.", varie: "L'économie chinoise, les semi-conducteurs taïwanais, le dollar et les devises des pays émergents." } },
  { id: "xtrackers-msci-china", name: "Xtrackers MSCI China", isin: "LU0514695690", ticker: "XCS6", tv: "XETR:XCS6", issuer: "Xtrackers", index: "MSCI China", categorie: "actions-emergents",
    ter: 0.65, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 950, proxy: "MCHI",
    fiche: { quoi: "Les grandes et moyennes entreprises chinoises.", contenu: "Environ 550 entreprises. Tencent et Alibaba pèsent lourd. Internet, consommation et finance dominent.", varie: "La croissance chinoise, les décisions de Pékin et les relations commerciales avec les États-Unis." } },
  { id: "amundi-pea-chine", name: "Amundi PEA Chine (MSCI China) Screened", isin: "FR0011871078", ticker: "PASI", tv: "EURONEXT:PASI", issuer: "Amundi", index: "MSCI China Screened Select ex Thermal Coal", categorie: "actions-emergents",
    ter: 0.65, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 65, proxy: "MCHI", proxyIndex: "MSCI China",
    fiche: { quoi: "Les grandes entreprises chinoises, dans un PEA.", contenu: "Plusieurs centaines d'entreprises chinoises, sans le charbon et certaines activités exclues.", varie: "La croissance chinoise, les décisions de Pékin et les relations commerciales avec les États-Unis." } },
  { id: "ishares-msci-india", name: "iShares MSCI India", isin: "IE00BZCQB185", ticker: "QDV5", tv: "XETR:QDV5", issuer: "iShares", index: "MSCI India", categorie: "actions-emergents",
    ter: 0.65, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 4300, proxy: "INDA",
    fiche: { quoi: "Les grandes et moyennes entreprises indiennes.", contenu: "Environ 150 entreprises. Banques, informatique et énergie sont en tête, avec HDFC Bank et Reliance.", varie: "La croissance indienne, les prix élevés de la bourse locale et la valeur de la roupie." } },

  // ——— Actions Asie développée ———
  { id: "ishares-core-msci-japan", name: "iShares Core MSCI Japan IMI", isin: "IE00B4L5YX21", ticker: "EUNN", tv: "XETR:EUNN", issuer: "iShares", index: "MSCI Japan IMI", categorie: "actions-asie",
    ter: 0.12, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 7500, proxy: "EWJ", proxyIndex: "MSCI Japan",
    fiche: { quoi: "Les entreprises japonaises de toutes tailles.", contenu: "Plus de 1 000 entreprises. Industrie, consommation et technologie dominent, avec Toyota et Sony.", varie: "Les exportations japonaises, la politique de la Banque du Japon et la valeur du yen." } },
  { id: "amundi-pea-japon-topix", name: "Amundi PEA Japon (TOPIX)", isin: "FR0013411980", ticker: "PTPXE", tv: "EURONEXT:PTPXE", issuer: "Amundi", index: "TOPIX", categorie: "actions-asie",
    ter: 0.20, pea: true, distribution: "capitalisation", replication: "synthétique", devise: "EUR", encours: 150, proxy: "EWJ", proxyIndex: "MSCI Japan",
    fiche: { quoi: "La bourse de Tokyo, dans un PEA.", contenu: "Plus de 1 600 entreprises de la Bourse de Tokyo. Industrie, banques et automobile sont en tête.", varie: "Les exportations japonaises, la politique de la Banque du Japon et la valeur du yen." } },

  // ——— Thématiques ———
  { id: "ishares-msci-global-semiconductors", name: "iShares MSCI Global Semiconductors", isin: "IE000I8KRLL9", ticker: "SEME", tv: "EURONEXT:SEME", issuer: "iShares", index: "MSCI ACWI IMI Semiconductors & Semiconductor Equipment ESG Screened Select Capped", categorie: "theme",
    ter: 0.35, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 5000, proxy: "SOXX", proxyIndex: "NYSE Semiconductor",
    fiche: { quoi: "Les fabricants de puces électroniques et de machines pour les produire.", contenu: "Une cinquantaine d'entreprises, surtout américaines et taïwanaises : Nvidia, TSMC, Broadcom, ASML.", varie: "La demande en puces pour l'intelligence artificielle, les smartphones et l'automobile. Le secteur monte et baisse fort." } },
  { id: "amundi-msci-water", name: "Amundi MSCI Water", isin: "FR0010527275", ticker: "WAT", tv: "EURONEXT:WAT", issuer: "Amundi", index: "MSCI ACWI IMI Water Filtered", categorie: "theme",
    ter: 0.60, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 1500, proxy: "",
    fiche: { quoi: "Les entreprises qui distribuent, traitent ou équipent les réseaux d'eau.", contenu: "Quelques dizaines d'entreprises dans le monde : services d'eau, tuyaux, pompes, instruments de mesure.", varie: "Les investissements dans les réseaux d'eau et la santé de l'industrie, avec un poids fort des États-Unis." } },
  { id: "ishares-global-water", name: "iShares Global Water", isin: "IE00B1TXK627", ticker: "IQQQ", tv: "XETR:IQQQ", issuer: "iShares", index: "S&P Global Water", categorie: "theme",
    ter: 0.65, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 1900, proxy: "",
    fiche: { quoi: "Les entreprises liées à l'eau : distribution, traitement, équipements.", contenu: "50 entreprises dans le monde, dont Veolia, American Water et Xylem.", varie: "Les investissements publics dans l'eau, les tarifs régulés et l'activité industrielle." } },
  { id: "ishares-global-clean-energy", name: "iShares Global Clean Energy Transition", isin: "IE00B1XNHC34", ticker: "IQQH", tv: "XETR:IQQH", issuer: "iShares", index: "S&P Global Clean Energy Transition", categorie: "theme",
    ter: 0.65, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 2400, proxy: "ICLN",
    fiche: { quoi: "Les entreprises du solaire, de l'éolien et de la production d'électricité bas carbone.", contenu: "Une centaine d'entreprises dans le monde : producteurs d'électricité, fabricants de panneaux et d'éoliennes.", varie: "Les taux d'intérêt, les aides publiques à l'énergie verte et le prix de l'électricité." } },
  { id: "xtrackers-msci-world-health-care", name: "Xtrackers MSCI World Health Care", isin: "IE00BM67HK77", ticker: "XDWH", tv: "XETR:XDWH", issuer: "Xtrackers", index: "MSCI World Health Care", categorie: "theme",
    ter: 0.25, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 3800, proxy: "IXJ", proxyIndex: "S&P Global 1200 Health Care",
    fiche: { quoi: "Les grandes entreprises de la santé des pays développés.", contenu: "Environ 130 entreprises : laboratoires, matériel médical, assureurs santé. Les États-Unis pèsent environ 70 %.", varie: "Les résultats des essais de médicaments, la politique de prix des médicaments aux États-Unis et le dollar." } },
  { id: "amundi-stoxx-europe-defense", name: "Amundi Stoxx Europe Defense", isin: "LU3038520774", ticker: "DEFS", tv: "EURONEXT:DEFS", issuer: "Amundi", index: "STOXX Europe Total Market Defense Capped", categorie: "theme",
    ter: 0.35, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 550, proxy: "",
    fiche: { quoi: "Les entreprises européennes de la défense.", contenu: "Quelques dizaines d'entreprises, dont Rheinmetall, Thales, Safran et BAE Systems. Le poids de chacune est plafonné.", varie: "Les budgets militaires européens, les commandes d'armement et l'actualité géopolitique." } },

  // ——— Dividendes ———
  { id: "ishares-stoxx-europe-select-dividend-30", name: "iShares Stoxx Europe Select Dividend 30 (DE)", isin: "DE0002635299", ticker: "EXSH", tv: "XETR:EXSH", issuer: "iShares", index: "Stoxx Europe Select Dividend 30", categorie: "dividendes",
    ter: 0.32, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 1300, proxy: "",
    fiche: { quoi: "30 entreprises européennes qui versent des dividendes élevés et réguliers.", contenu: "30 entreprises, souvent des banques, des assureurs et des services publics.", varie: "Les résultats des banques et des assureurs, et le niveau des taux d'intérêt." } },
  { id: "spdr-us-dividend-aristocrats", name: "SPDR S&P US Dividend Aristocrats", isin: "IE00B6YX5D40", ticker: "SPYD", tv: "XETR:SPYD", issuer: "SPDR", index: "S&P High Yield Dividend Aristocrats", categorie: "dividendes",
    ter: 0.35, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 3400, proxy: "SDY",
    fiche: { quoi: "Des entreprises américaines qui augmentent leur dividende depuis au moins 20 ans.", contenu: "Une centaine d'entreprises. Industrie, services publics et consommation courante sont les plus représentés.", varie: "La solidité des grandes entreprises traditionnelles américaines, les taux d'intérêt et le dollar." } },
  { id: "spdr-euro-dividend-aristocrats", name: "SPDR S&P Euro Dividend Aristocrats", isin: "IE00B5M1WJ87", ticker: "EUDV", tv: "EURONEXT:EUDV", issuer: "SPDR", index: "S&P Euro High Yield Dividend Aristocrats", categorie: "dividendes",
    ter: 0.30, pea: true, distribution: "distribution", replication: "physique", devise: "EUR", encours: 1800, proxy: "",
    fiche: { quoi: "Des entreprises de la zone euro qui maintiennent ou augmentent leur dividende depuis au moins 10 ans.", contenu: "Une quarantaine d'entreprises, surtout françaises, allemandes et néerlandaises.", varie: "L'économie de la zone euro et le niveau des taux d'intérêt." } },

  // ——— Immobilier ———
  { id: "ishares-developed-markets-property-yield", name: "iShares Developed Markets Property Yield", isin: "IE00B1FZS350", ticker: "IQQ6", tv: "XETR:IQQ6", issuer: "iShares", index: "FTSE EPRA Nareit Developed Dividend+", categorie: "immobilier",
    ter: 0.59, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 820, proxy: "REET", proxyIndex: "FTSE EPRA Nareit Global REITs",
    fiche: { quoi: "Des sociétés foncières cotées qui possèdent et louent des bureaux, des commerces, des entrepôts ou des logements.", contenu: "Plus de 300 sociétés, surtout américaines. Elles reversent une grande partie de leurs loyers.", varie: "Les taux d'intérêt, la valeur des immeubles et le taux d'occupation des locaux." } },

  // ——— Obligations ———
  { id: "ishares-core-euro-govt-bond", name: "iShares Core Euro Government Bond", isin: "IE00B4WXJJ64", ticker: "EUNH", tv: "XETR:EUNH", issuer: "iShares", index: "Bloomberg Euro Treasury Bond", categorie: "obligations",
    ter: 0.07, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 5400, proxy: "",
    fiche: { quoi: "Des prêts aux États de la zone euro, sous forme d'obligations.", contenu: "Plusieurs centaines d'obligations d'État. France, Italie et Allemagne sont en tête.", varie: "Les taux d'intérêt : quand ils montent, la valeur des obligations baisse, et l'inverse." } },
  { id: "ishares-core-euro-corp-bond", name: "iShares Core € Corp Bond", isin: "IE00B3F81R35", ticker: "EUN5", tv: "XETR:EUN5", issuer: "iShares", index: "Bloomberg Euro Corporate Bond", categorie: "obligations",
    ter: 0.09, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 8700, proxy: "",
    fiche: { quoi: "Des prêts aux grandes entreprises, en euros.", contenu: "Plus de 3 000 obligations d'entreprises bien notées, beaucoup de banques.", varie: "Les taux d'intérêt et le risque perçu de défaut des entreprises." } },
  { id: "ishares-usd-treasury-7-10", name: "iShares $ Treasury Bond 7-10yr", isin: "IE00B1FZS798", ticker: "IUSM", tv: "XETR:IUSM", issuer: "iShares", index: "ICE US Treasury 7-10 Year", categorie: "obligations",
    ter: 0.07, pea: false, distribution: "distribution", replication: "physique", devise: "EUR", encours: 3200, proxy: "IEF",
    fiche: { quoi: "Des prêts à l'État américain, remboursés dans 7 à 10 ans.", contenu: "Une vingtaine d'obligations du Trésor américain, en dollars.", varie: "Les taux d'intérêt américains et le taux de change euro-dollar." } },

  // ——— Matières premières ———
  { id: "amundi-physical-gold", name: "Amundi Physical Gold ETC", isin: "FR0013416716", ticker: "GOLD", tv: "EURONEXT:GOLD", issuer: "Amundi", index: "Or (prix au comptant)", categorie: "matieres",
    ter: 0.12, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 11400, proxy: "",
    fiche: { quoi: "De l'or, sans avoir à le stocker. C'est un ETC, pas un fonds : un titre de créance garanti par de l'or.", contenu: "Des lingots stockés dans un coffre, au nom de l'émetteur.", varie: "Le prix de l'or en dollars, qui monte souvent dans les périodes d'inquiétude, et le taux de change euro-dollar." } },
  { id: "ishares-physical-gold", name: "iShares Physical Gold ETC", isin: "IE00B4ND3602", ticker: "PPFB", tv: "XETR:PPFB", issuer: "iShares", index: "Or (prix au comptant)", categorie: "matieres",
    ter: 0.12, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 33000, proxy: "",
    fiche: { quoi: "De l'or, sans avoir à le stocker. C'est un ETC garanti par de l'or physique.", contenu: "Des lingots stockés dans un coffre à Londres.", varie: "Le prix de l'or en dollars et le taux de change euro-dollar." } },
  { id: "invesco-physical-gold", name: "Invesco Physical Gold ETC", isin: "IE00B579F325", ticker: "8PSG", tv: "XETR:8PSG", issuer: "Invesco", index: "Or (prix au comptant)", categorie: "matieres",
    ter: 0.12, pea: false, distribution: "capitalisation", replication: "physique", devise: "EUR", encours: 26000, proxy: "",
    fiche: { quoi: "De l'or, sans avoir à le stocker. C'est un ETC garanti par de l'or physique.", contenu: "Des lingots stockés dans un coffre à Londres.", varie: "Le prix de l'or en dollars et le taux de change euro-dollar." } },
];

export default ETF;
