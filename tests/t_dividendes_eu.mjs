// Relevé des dates de dividende dans les annonces officielles européennes (data/dividendes_europe.mjs).
// Usage : node tests/t_dividendes_eu.mjs
import { extraire, html2txt } from "../data/dividendes_europe.mjs";
let ko = 0;
const ok = (nom, x, attendu) => { const bon = Object.entries(attendu).every(([k, v]) => x[k] === v) && Object.keys(x).every(k => k in attendu);
  if (!bon) { ko++; console.log("ÉCHEC", nom, JSON.stringify(x), "attendu", JSON.stringify(attendu)); } else console.log("ok", nom); };

ok("Oslo, informations clés", extraire("The board resolved to distribute a dividend of NOK 1.50 per share. Dividend amount: NOK 1.50 per share Last day including right: 2 November 2026 Ex-date: 3 November 2026 Record date: 4 November 2026 Payment date: 6 November 2026 Date of approval: 30 October 2026", "2026-10-30"),
  { ex: "2026-11-03", rec: "2026-11-04", pay: "2026-11-06", amt: "1,50 NOK" });
ok("Finlande, deuxième versement (ancien versement et bénéfice par action ignorés)", extraire("Valmet confirms the key dates for its second dividend instalment: EUR 0.67 per share to be paid out on October 7, 2026. The dividend will be paid to shareholders who are registered on the dividend record date, which is October 1, 2026. The first instalment of EUR 0.68 per share was paid on April 9, 2026. Earnings per share EUR 1.20.", "2026-09-29"),
  { pay: "2026-10-07", rec: "2026-10-01", amt: "0,67 €" });
ok("France, acompte", extraire("Le Conseil a décidé le versement d'un acompte sur dividende de 1,00 euro par action. La date de détachement est fixée au 3 décembre 2026 et la mise en paiement interviendra le 5 décembre 2026. Le bénéfice par action ressort à 4,10 €.", "2026-09-30"),
  { ex: "2026-12-03", pay: "2026-12-05", amt: "1,00 €" });
ok("Londres, pence", extraire("The third quarter interim dividend of 9.5 pence per ordinary share will be paid on 19 December 2026 to shareholders on the register on 14 November 2026. The ex-dividend date is 13 November 2026.", "2026-10-29"),
  { pay: "2026-12-19", ex: "2026-11-13", amt: "9,50 pence" });
ok("Londres, tableau (date des certificats américains écartée)", extraire(html2txt("<p>Shell today announced an interim dividend of US$ 0.3906 per ordinary share.</p><table><tr><td>Ex- Dividend Date for ADSs</td><td>November 13, 2026</td></tr><tr><td>Ex- Dividend Date for ordinary shares</td><td>November 12, 2026</td></tr><tr><td>Record date</td><td>November 13, 2026</td></tr><tr><td>Payment date</td><td>December 21, 2026</td></tr></table>"), "2026-10-29"),
  { ex: "2026-11-12", rec: "2026-11-13", pay: "2026-12-21", amt: "0,3906 $" });
ok("Date d'un coupon d'obligation ignorée", extraire("The notes will pay interest. Payment date: 15 December 2026.", "2026-10-29"), {});
ok("Date passée ignorée", extraire("The dividend was paid on 3 May 2026.", "2026-10-29"), {});
ok("Date seulement envisagée ignorée", extraire("The Annual General Meeting is scheduled for 12 May 2027. The potential dividend payment date is 21 May 2027.", "2026-09-30"), {});
if (ko) { console.log(ko, "échec(s)"); process.exit(1); }
console.log("Tout est bon.");
