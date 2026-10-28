// Agenda officiel des sociétés américaines (relevé du 28 octobre 2026).
// Uniquement des dates publiées par l'entreprise (communiqués, page investisseurs).
// Aux États-Unis, les communiqués de dividende donnent la « record date »
// (date d'enregistrement) et la « payable date » (date de paiement).
const D = "Date d'enregistrement du dividende";
const P = "Paiement du dividende";

export default [
  // Amazon
  { id: "amazon", date: "2026-10-29", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-to-Webcast-Third-Quarter-2026-Financial-Results-Conference-Call/default.aspx" },

  // Walmart (dividende annuel versé en 4 fois, calendrier publié en février 2026)
  { id: "walmart", date: "2026-12-11", type: "Dividende", label: `${D} (0,2475 $)`, source: "https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases" },
  { id: "walmart", date: "2027-01-04", type: "Dividende", label: `${P} (0,2475 $)`, source: "https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases" },

  // Apple
  { id: "apple", date: "2026-11-02", type: "Résultats", label: "Résultats du 4e trimestre de l'exercice 2026", source: "https://www.mactrast.com/2026/10/apple-to-announce-fiscal-q4-2026-earnings-on-november-2/" },

  // McKesson
  { id: "mckesson", date: "2026-11-04", type: "Résultats", label: "Résultats du 2e trimestre de l'exercice 2027", source: "https://investor.mckesson.com/news/financial-news/2026/McKesson-Corporation-Announces-Second-Quarter-Fiscal-2027-Earnings-Release-Date/default.aspx" },
  { id: "mckesson", date: "2026-12-01", type: "Dividende", label: `${D} (0,94 $)`, source: "https://investor.mckesson.com/news/financial-news/2026/McKesson-Corporation-Declares-Quarterly-Dividend-b0b70e24e/default.aspx" },
  { id: "mckesson", date: "2027-01-04", type: "Dividende", label: `${P} (0,94 $)`, source: "https://investor.mckesson.com/news/financial-news/2026/McKesson-Corporation-Declares-Quarterly-Dividend-b0b70e24e/default.aspx" },

  // CVS Health
  { id: "cvs-health", date: "2026-11-04", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://www.cvshealth.com/news/company-news/cvs-health-to-hold-third-quarter-2026-earnings-conference-call.html" },

  // ExxonMobil
  { id: "exxonmobil", date: "2026-10-30", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://investor.exxonmobil.com/company-information/press-releases/detail/1212/exxonmobil-to-release-third-quarter-2026-financial-results" },

  // Microsoft
  { id: "microsoft", date: "2026-10-28", type: "Résultats", label: "Résultats du 1er trimestre de l'exercice 2027", source: "https://finviz.com/news/400058/microsoft-announces-quarterly-earnings-release-date" },
  { id: "microsoft", date: "2026-12-08", type: "Assemblée", label: "Assemblée générale 2026 (en ligne)", source: "https://www.microsoft.com/en-us/investor/annual-meeting" },

  // Cencora
  { id: "cencora", date: "2026-11-04", type: "Résultats", label: "Résultats du 4e trimestre et annuels (exercice 2026)", source: "https://investor.cencora.com/news/news-details/2026/Cencora-Announces-Date-and-Time-for-Fourth-Quarter-Fiscal-2026-Earnings-Release/default.aspx" },

  // Costco
  { id: "costco", date: "2026-10-30", type: "Dividende", label: `${D} (1,47 $)`, source: "https://investor.costco.com/news/news-details/2026/Costco-Wholesale-Corporation-Announces-Quarterly-Cash-Dividend-a3058b1eb/default.aspx" },
  { id: "costco", date: "2026-11-13", type: "Dividende", label: `${P} (1,47 $)`, source: "https://investor.costco.com/news/news-details/2026/Costco-Wholesale-Corporation-Announces-Quarterly-Cash-Dividend-a3058b1eb/default.aspx" },

  // Cigna
  { id: "cigna", date: "2026-11-05", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://finviz.com/news/400741/the-cigna-groups-third-quarter-2026-earnings-release-details" },

  // Cardinal Health
  { id: "cardinal-health", date: "2026-11-05", type: "Résultats", label: "Résultats du 1er trimestre de l'exercice 2027", source: "https://finviz.com/news/397505/cardinal-health-to-announce-first-quarter-results-for-fiscal-year-2027-on-november-5" },

  // Elevance Health
  { id: "elevance-health", date: "2026-12-04", type: "Dividende", label: `${D} (1,72 $)`, source: "https://www.elevancehealth.com/newsroom/elv-quarterly-earnings-q3-2026" },
  { id: "elevance-health", date: "2026-12-18", type: "Dividende", label: `${P} (1,72 $)`, source: "https://www.elevancehealth.com/newsroom/elv-quarterly-earnings-q3-2026" },

  // Chevron
  { id: "chevron", date: "2026-10-30", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://chevroncorp.gcs-web.com/news-releases/news-release-details/advisory-chevron-corporations-3q-2026-earnings-conference-call" },

  // General Motors
  { id: "general-motors", date: "2026-12-04", type: "Dividende", label: `${D} (0,18 $)`, source: "https://www.sec.gov/Archives/edgar/data/0001467858/000146785826000056/gmq32026pressreleaseandfin.htm" },
  { id: "general-motors", date: "2026-12-17", type: "Dividende", label: `${P} (0,18 $)`, source: "https://www.sec.gov/Archives/edgar/data/0001467858/000146785826000056/gmq32026pressreleaseandfin.htm" },

  // JPMorgan Chase
  { id: "jpmorgan", date: "2026-10-31", type: "Dividende", label: `${P} (1,65 $)`, source: "https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-increased-common-stock-dividend-9-15" },

  // Kroger
  { id: "kroger", date: "2026-11-16", type: "Dividende", label: `${D} (0,39 $)`, source: "https://ir.kroger.com/news/news-details/2026/Krogers-Board-of-Directors-Declares-Quarterly-Dividend-f632ed7d0/default.aspx" },
  { id: "kroger", date: "2026-12-01", type: "Dividende", label: `${P} (0,39 $)`, source: "https://ir.kroger.com/news/news-details/2026/Krogers-Board-of-Directors-Declares-Quarterly-Dividend-f632ed7d0/default.aspx" },

  // Verizon
  { id: "verizon", date: "2026-11-02", type: "Dividende", label: `${P} (0,7075 $)`, source: "https://www.verizon.com/about/news/verizon-declares-quarterly-dividend-september-2026" },

  // Marathon Petroleum
  { id: "marathon-petroleum", date: "2026-11-03", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://ir.marathonpetroleum.com/investor/news-releases/news-details/2026/Marathon-Petroleum-Corp--to-Report-Third-Quarter-Financial-Results-on-November-3-2026/default.aspx" },

  // Phillips 66
  { id: "phillips-66", date: "2026-10-28", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://investor.phillips66.com/financial-information/news-releases/news-release-details/2026/Phillips-66-to-announce-third-quarter-financial-results/default.aspx" },
  { id: "phillips-66", date: "2026-11-17", type: "Dividende", label: `${D} (1,33 $)`, source: "https://investor.phillips66.com/financial-information/news-releases/news-release-details/2026/Phillips-66-Announces-Increase-in-Quarterly-Dividend-9e093b7cd/default.aspx" },
  { id: "phillips-66", date: "2026-12-01", type: "Dividende", label: `${P} (1,33 $)`, source: "https://investor.phillips66.com/financial-information/news-releases/news-release-details/2026/Phillips-66-Announces-Increase-in-Quarterly-Dividend-9e093b7cd/default.aspx" },

  // Humana
  { id: "humana", date: "2026-11-06", type: "Résultats", label: "Résultats du 3e trimestre 2026", source: "https://humana.gcs-web.com/news-releases/news-release-details/humana-inc-release-third-quarter-2026-results-november-6-2026" },
  { id: "humana", date: "2026-10-30", type: "Dividende", label: `${D} (0,885 $)`, source: "https://humana.gcs-web.com/news-releases/news-release-details/humana-board-declares-payment-quarterly-dividend-stockholders-53" },
  { id: "humana", date: "2026-11-27", type: "Dividende", label: `${P} (0,885 $)`, source: "https://humana.gcs-web.com/news-releases/news-release-details/humana-board-declares-payment-quarterly-dividend-stockholders-53" },

  // AT&T
  { id: "att", date: "2026-11-02", type: "Dividende", label: `${P} (0,2775 $)`, source: "https://about.att.com/story/2026/november-stock-dividend.html" },

  // Comcast
  { id: "comcast", date: "2027-01-06", type: "Dividende", label: `${D} (0,33 $)`, source: "https://www.cmcsa.com/news-releases/news-release-details/comcast-declares-quarterly-dividend-57" },
  { id: "comcast", date: "2027-01-27", type: "Dividende", label: `${P} (0,33 $)`, source: "https://www.cmcsa.com/news-releases/news-release-details/comcast-declares-quarterly-dividend-57" },

  // Bank of America
  { id: "bank-of-america", date: "2026-12-04", type: "Dividende", label: `${D} (0,32 $)`, source: "https://newsroom.bankofamerica.com/content/newsroom/press-releases/2026/10/bank-of-america-declares-fourth-quarter-2026-stock-dividends.html" },
  { id: "bank-of-america", date: "2026-12-24", type: "Dividende", label: `${P} (0,32 $)`, source: "https://newsroom.bankofamerica.com/content/newsroom/press-releases/2026/10/bank-of-america-declares-fourth-quarter-2026-stock-dividends.html" },

  // Disney
  { id: "disney", date: "2026-11-17", type: "Résultats", label: "Résultats annuels et du 4e trimestre (exercice 2026)", source: "https://investors.thewaltdisneycompany.com/news/news-details/2026/The-Walt-Disney-Company-Executives-to-Discuss-Fiscal-Full-Year-and-Fourth-Quarter-2026-Financial-Results-via-Webcast/default.aspx" },

  // Johnson & Johnson
  { id: "johnson-johnson", date: "2026-11-24", type: "Dividende", label: `${D} (1,34 $)`, source: "https://www.investor.jnj.com/investor-news/news-details/2026/Johnson--Johnson-Announces-Quarterly-Dividend-for-Fourth-Quarter-2026/default.aspx" },
  { id: "johnson-johnson", date: "2026-12-08", type: "Dividende", label: `${P} (1,34 $)`, source: "https://www.investor.jnj.com/investor-news/news-details/2026/Johnson--Johnson-Announces-Quarterly-Dividend-for-Fourth-Quarter-2026/default.aspx" },

  // Procter & Gamble
  { id: "procter-gamble", date: "2026-11-16", type: "Dividende", label: `${P} (1,0885 $)`, source: "https://www.sec.gov/Archives/edgar/data/0000080424/000008042426000214/pgdividendreleasenov2026.htm" },

  // Citigroup
  { id: "citigroup", date: "2026-11-02", type: "Dividende", label: `${D} (0,67 $)`, source: "https://www.citigroup.com/global/news/press-release/2026/citigroup-declares-common-stock-dividend-preferred-dividends-october-19" },
  { id: "citigroup", date: "2026-11-25", type: "Dividende", label: `${P} (0,67 $)`, source: "https://www.citigroup.com/global/news/press-release/2026/citigroup-declares-common-stock-dividend-preferred-dividends-october-19" },

  // Target
  { id: "target", date: "2026-11-11", type: "Dividende", label: `${D} (1,16 $)`, source: "https://corporate.target.com/press/release/2026/09/target-corporation-declares-regular-quarterly-dividend" },
  { id: "target", date: "2026-12-01", type: "Dividende", label: `${P} (1,16 $)`, source: "https://corporate.target.com/press/release/2026/09/target-corporation-declares-regular-quarterly-dividend" },

  // T-Mobile US
  { id: "t-mobile-us", date: "2026-11-25", type: "Dividende", label: `${D} (1,17 $)`, source: "https://www.t-mobile.com/news/business/t-mobile-announces-q4-2026-dividend-increase" },
  { id: "t-mobile-us", date: "2026-12-10", type: "Dividende", label: `${P} (1,17 $)`, source: "https://www.t-mobile.com/news/business/t-mobile-announces-q4-2026-dividend-increase" },

  // Lowe's
  { id: "lowes", date: "2026-11-04", type: "Dividende", label: `${P} (1,25 $)`, source: "https://finviz.com/news/386671/lowes-companies-inc-declares-cash-dividend" },

  // Sysco
  { id: "sysco", date: "2026-11-03", type: "Résultats", label: "Résultats du 1er trimestre de l'exercice 2027", source: "https://investors.sysco.com/annual-reports-and-sec-filings/news-releases/2026/10-13-2026-130623744" },
];
