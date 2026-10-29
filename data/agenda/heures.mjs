// Heures de publication des résultats, relevées à la main sur la source officielle (calendrier financier de la société
// ou communiqué qui annonce la date). Relevé du 29 octobre 2026 (agent « outils2 »).
// Une heure n'est inscrite que si la source la donne. Champs :
//   pub   : heure de publication du communiqué, à l'heure locale de la source ("HH:MM")
//   env   : "vers" ou "au plus tard" quand la source le précise (affiché tel quel)
//   cal   : heure indiquée par le calendrier officiel sans préciser s'il s'agit du communiqué ou de la présentation
//   moment: "avant-ouverture" | "apres-cloture" quand la source le dit sans heure précise
//   conf  : heure de la conférence ou du webcast (même jour), jamais présentée comme l'heure de publication
//   tz    : fuseau de l'heure donnée par la source (IANA) ; src : lien ; vu : date du relevé
// build.mjs recopie ces champs sur l'événement du même jour et de la même entreprise dans cf/site/data/agenda.json.
const V = "2026-10-29";
export default [
  { id: "exxonmobil", date: "2026-10-30", pub: "05:30", conf: "08:30", tz: "America/Chicago", src: "https://investor.exxonmobil.com/company-information/press-releases/detail/1212/exxonmobil-to-release-third-quarter-2026-financial-results", vu: V },
  { id: "chevron", date: "2026-10-30", conf: "11:00", tz: "America/New_York", src: "https://chevroncorp.gcs-web.com/news-releases/news-release-details/advisory-chevron-corporations-3q-2026-earnings-conference-call", vu: V },
  { id: "sanofi", date: "2026-10-30", conf: "13:30", tz: "Europe/Paris", src: "https://www.sanofi.com/en/investors/financial-results-and-events/financial-calendar/", vu: V },
  { id: "astrazeneca", date: "2026-10-30", cal: "07:00", tz: "Europe/London", src: "https://www.astrazeneca.com/investor-relations.html", vu: V },
  { id: "capgemini", date: "2026-10-30", cal: "07:00", tz: "Europe/Paris", src: "https://investors.capgemini.com/en/calendar/", vu: V },
  { id: "marathon-petroleum", date: "2026-11-03", conf: "11:00", tz: "America/New_York", src: "https://ir.marathonpetroleum.com/investor/news-releases/news-details/2026/Marathon-Petroleum-Corp--to-Report-Third-Quarter-Financial-Results-on-November-3-2026/default.aspx", vu: V },
  { id: "sysco", date: "2026-11-03", conf: "10:00", tz: "America/New_York", src: "https://investors.sysco.com/annual-reports-and-sec-filings/news-releases/2026/10-13-2026-130623744", vu: V },
  { id: "novo-nordisk", date: "2026-11-04", conf: "13:00", tz: "Europe/Copenhagen", src: "https://www.novonordisk.com/investors/financial-results.html", vu: V },
  { id: "mckesson", date: "2026-11-04", moment: "apres-cloture", conf: "16:30", tz: "America/New_York", src: "https://investor.mckesson.com/news/financial-news/2026/McKesson-Corporation-Announces-Second-Quarter-Fiscal-2027-Earnings-Release-Date/default.aspx", vu: V },
  { id: "cvs-health", date: "2026-11-04", conf: "08:00", tz: "America/New_York", src: "https://www.cvshealth.com/news/company-news/cvs-health-to-hold-third-quarter-2026-earnings-conference-call.html", vu: V },
  { id: "cencora", date: "2026-11-04", moment: "avant-ouverture", conf: "08:30", tz: "America/New_York", src: "https://investor.cencora.com/news/news-details/2026/Cencora-Announces-Date-and-Time-for-Fourth-Quarter-Fiscal-2026-Earnings-Release/default.aspx", vu: V },
  { id: "cigna", date: "2026-11-05", pub: "06:30", env: "au plus tard", conf: "08:30", tz: "America/New_York", src: "https://finviz.com/news/400741/the-cigna-groups-third-quarter-2026-earnings-release-details", vu: V },
  { id: "cardinal-health", date: "2026-11-05", moment: "avant-ouverture", conf: "08:30", tz: "America/New_York", src: "https://finviz.com/news/397505/cardinal-health-to-announce-first-quarter-results-for-fiscal-year-2027-on-november-5", vu: V },
  { id: "humana", date: "2026-11-06", pub: "06:00", conf: "08:00", tz: "America/New_York", src: "https://humana.gcs-web.com/news-releases/news-release-details/humana-inc-release-third-quarter-2026-results-november-6-2026", vu: V },
  { id: "petrobras", date: "2026-11-10", moment: "apres-cloture", tz: "America/Sao_Paulo", src: "https://www.sec.gov/Archives/edgar/data/0001119639/000129281426004918/pbr20261013_6k1.htm", vu: V },
  { id: "brookfield", date: "2026-11-12", pub: "07:00", env: "vers", conf: "10:00", tz: "America/New_York", src: "https://www.sec.gov/Archives/edgar/data/0001001085/000117184326006563/exh_991.htm", vu: V },
  { id: "disney", date: "2026-11-17", moment: "avant-ouverture", conf: "08:30", tz: "America/New_York", src: "https://investors.thewaltdisneycompany.com/news/news-details/2026/The-Walt-Disney-Company-Executives-to-Discuss-Fiscal-Full-Year-and-Fourth-Quarter-2026-Financial-Results-via-Webcast/default.aspx", vu: V },
];
