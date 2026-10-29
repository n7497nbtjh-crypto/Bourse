// Règles du fil d'actualité : classer une annonce, reconnaître la période, écrire un titre français, repérer les chiffres.
// Tout est fait par règles, sans IA : le résultat est identique à chaque passage et vérifiable.
import { fold } from "./actu_match.mjs";

/* ---------- Classement ---------- */
// Catégories : resultats, rapport, dividende, operation (acquisition, OPA, fusion, cession), dirigeants, assemblee, emission,
// incident, autre ; routinières (peu d'intérêt en soi) : rachat, capital, initie (achats et ventes des dirigeants), agenda.
export const ROUTINE = new Set(["rachat", "capital", "initie", "agenda"]);
const R = {
  ignorer: /\b(net asset value|valeur liquidative|final terms|form 8\.[0-9]|form 8 \(|disclosure table|frn variable rate|adjustment of interest rate|rente(justering|regulering)|price monitoring|blocklisting|block listing|trading halt|suspension of trading|report on payments to govern|irish takeover panel|final announcement released|bonds? (interest|coupon) (payment|rate)|interest rate (fixing|reset)|nav update|daily nav|monthly factsheet|form 6-k$)/,
  capital: /(total voting rights|droits de vote|nombre total d.actions|nombre d.actions et de droits|holding\(s\) in company|major shareholding|major shareholder|franchissement de seuil|declaration de participation|notification of (major )?(holding|interest)|flagging|liputusilmoitus|flaggningsmeddelande|change in number of shares and votes|changes in share capital and votes|number of shares and votes)/,
  rachat: /(transactions? in own shares|own shares|actions propres|rachat d.actions|share (re)?purchase|buy-?back|contrat de liquidite|aterkop|omien osakkeiden|egne aksjer|tilbagekob|programme de rachat|repurchase of shares|tilbakekjop|aterkopsprogram)/,
  initie: /(director\/pdmr|pdmr|managers.? transactions?|insider transaction|transactions? (des|de|d.un) dirigeants?|declaration des transactions sur titres|johdon liiketoimet|insynshandel|meldepliktig handel|primary insider|director(s)?.? dealing|director shareholding)/,
  agenda: /(financial calendar|calendrier financier|^invitation\b|invitation (to|-)|webcast|webinar|conference call|audiocast|briefing on|telefonkonferens|bjuder in|to (host|hold) (a )?(conference|webcast|call)|(will|to) (report|publish|release|announce|present) .{0,70}(results|report)|(will be|to be) (published|released|presented)|date of (publication|release)|inbjudan|kutsu|publiera ses resultats le|publication des resultats le|reschedules?|taloudelliset raportit|financial (information|reporting|reports) (and|in) 20\d\d|presentation of .{0,40}results|results presentation|presentasjon av|invitasjon|finansiell kalender)/,
  comite: /(nomination committee|valberedning|nimitystoimikunta|osakkeenomistajien nimitys|comite des nominations|comite de nomination|valgkomite)/,
  notation: /(s&p global|moody.s|fitch|credit rating|notation|kreditbetyg|luottoluokitu|rating(s)? (affirmed|upgraded|downgraded))/,
  cote: /(delisting|radiation|retrait de la cote|avnotering|listing of (the )?shares|admission to trading|first day of trading|premier jour de cotation)/,
  financement: /(loan facility|credit facility|term loan|revolving|financing agreement|refinanc|lanefacilitet|kreditfacilitet|ligne de credit|financement)/,
  contrat: /(signs? .{0,50}(agreement|contract|deal)|wins? .{0,40}(contract|order)|receives? .{0,30}order|awarded .{0,30}contract|order (worth|value|intake)|contrat|commande|vinder .{0,30}(projekt|kontrakt)|tecknar avtal|erhaller order|tilaus|sopimu)/,
  incident: /(cybersecurity incident|cyber.?attack|cyberattaque|incident de cybersecurite|ransomware|data breach)/,
  assemblee: /(general meeting|\bagm\b|\begm\b|assemblee generale|assemblees? generales?|bolagsstamma|arsstamma|yhtiokokous|generalforsamling|proxy statement|notice of (annual|extraordinary)|result of (the )?(annual|extraordinary|agm|egm)|decisions? of (the )?general meeting|resolutions? (passed|adopted))/,
  dividende: /(dividend|dividende|utdelning|osinko|udbytte|\bex.?date\b|ex-dividend|acompte sur dividende|scrip)/,
  rapport: /(annual financial report|annual report|rapport financier annuel|rapport annuel|document d.enregistrement universel|universal registration document|\bdeu\b|\burd\b|arsredovisning|vuosikertomus|arsrapport|form 10-k|form 20-f|form 40-f)/,
  resultats: /(results|interim report|interim statement|half[- ]year(ly)? (report|results|financial)|half year|\bh1\b|\bq[1-4]\b|[1-4](st|nd|rd|th) quarter|(first|second|third|fourth) quarter|quarterly|trading update|trading statement|financial statement release|full[- ]year|earnings|resultats?|chiffre d.affaires|ventes (du|annuelles|trimestrielles)|semestriel|trimestriel|premier semestre|neuf mois|9 mois|delarsrapport|bokslutskommunike|kvartalsrapport|halvarsrapport|osavuosikatsaus|puolivuosikatsaus|tilinpaatostiedote|liiketoimintakatsaus|kvartalsregnskap|kvartalsrapport|profit warning|tulosvaroitus|avertissement sur resultats|guidance|perspectives|objectifs? (annuels?|financiers?|\d{4})|revises? (its )?(outlook|guidance)|raises? (its )?(outlook|guidance)|lowers? (its )?(outlook|guidance)|preliminary (results|figures|sales|revenue)|perioderesultat|uppgjor|arsfjordung|revenues? (for|of|up|down|grew|rose|fell)|net sales (for|of|up|down|grew|rose|fell|increased|decreased)|sales for the|nine months|regnskap)/,
  operation: /(acqui|merger|takeover|tender offer|(recommended|cash|possible|firm) offer|offer for|offre publique|\bopa\b|\bope\b|\bopas\b|fusion|cession|divest|disposal|sale of (its|the)|to sell|to buy|rachat de la societe|prise de controle|joint venture|rule 2\.[47]|scheme of arrangement|forvarv|yrityskauppa|oppkjop|uppkop|offentligt uppkopserbjudande|ostotarjous|business combination|definitive agreement|strategic review|demerger|scission|spin-?off|osittaisjakautum)/,
  emission: /(issue of (equity|debt|shares|new shares)|bond(s)? (issue|offering)|notes? (offering|due)|senior notes|obligat|emission (d.obligations|obligataire|de titres|d.actions)|bond issuance|green bond|bond loan|obliga|augmentation de capital|capital increase|rights issue|private placement|placement prive|share issue|directed (share )?issue|nyemission|riktad emission|osakeanti|emisjon|prospectus|convertible|equity raise|capital raise|offering of)/,
  dirigeants: /(\bceo\b|\bcfo\b|\bcoo\b|chief executive|chief financial|chief operating|chief \w+ officer|appoint\w* .{0,40}(director|chair|president|head of|board|officer|\bvp\b|management)|nomme\w* .{0,30}(directeur|directrice|president|administrat)|directeur general|directrice generale|directorate change|board changes?|changes? (in|to) (the )?(board|management)|management changes?|changes board|resign|demission|steps? down|succession|\bvd\b|toimitusjohtaja|konsernsjef|administrerende direktor|new (chair|president)|president du conseil|board of directors)/,
};
export function classe(title, official = "", src = "") {
  const t = fold(title), o = fold(official), both = t + " | " + o;
  if (R.ignorer.test(both)) return null;
  // Catégories officielles explicites des sources
  if (/(information financiere trimestrielle|rapports financiers et d.audit semestriels|interim report|half year financial report|financial statement release|quarterly report|half-year report|interim results|final results|[1-4](st|nd|rd|th) quarter results|q[1-4] results|trading statement)/.test(o)) return R.dividende.test(t) && !R.resultats.test(t) ? "dividende" : "resultats";
  if (/(annual financial report|rapport financier annuel|document de reference|annual report)/.test(o)) return "rapport";
  if (/(managers.? transactions?|director\/pdmr|transactions (de|des) dirigeants|declaration des transactions)/.test(o)) return "initie";
  if (/(own shares|actions de l.emetteur|actions propres|transaction in own)/.test(o)) return "rachat";
  if (/(major share|holding\(s\) in company|total number of voting|total voting|nombre total de droits|droits de vote)/.test(o)) return "capital";
  if (/(notice to general meeting|decisions of general meeting|notice of agm|result of agm|notice of egm|result of egm|annual general meeting)/.test(o)) return "assemblee";
  if (/financial calendar/.test(o)) return "agenda";
  if (/(changes? (in )?board|directorate change|management changes)/.test(o)) return "dirigeants";
  if (/(dividend declaration|ex date)/.test(o)) return "dividende";
  if (/(issue of equity|issue of debt|publication of a prospectus|prospectus)/.test(o)) return "emission";
  for (const k of ["incident", "capital", "rachat", "initie", "comite"]) if (R[k].test(t)) return k === "comite" ? "assemblee" : k;
  if (R.agenda.test(t) && !/(interim report|delarsrapport|osavuosikatsaus)[^:]{0,40}:/.test(t)) return "agenda";
  if (/(acqui|merger|takeover|tender offer|offre publique|\bopa\b|demerger|scission|spin-?off|offer for|business combination|osittaisjakautum)/.test(t) && !/(results|resultats|interim report)/.test(t)) return "operation";
  if (R.emission.test(t) && !/(results|resultats|interim report|quarter|trimestre|delarsrapport)/.test(t)) return "emission";
  if (R.resultats.test(t)) return R.dividende.test(t) && !/(results|resultats|report|rapport)/.test(t) ? "dividende" : "resultats";
  for (const k of ["operation", "dividende", "assemblee", "rapport", "emission", "dirigeants"]) if (R[k].test(t)) return k;
  if (R.financement.test(t)) return "emission";
  if (R.contrat.test(t)) return "contrat";
  return "autre";
}
// Information privilégiée (MAR, art. 17) : l'entreprise annonce un fait qui peut faire bouger le cours
export const privilegiee = official => /(informations? privilegiees?|inside information|innsideinformasjon|insiderinformation|sisapiiritieto)/.test(fold(official));
export function importance(cat, title, official = "") {
  const base = { resultats: 3, operation: 3, incident: 3, dividende: 2, rapport: 2, emission: 2, dirigeants: 2, assemblee: 1, contrat: 1, autre: 1, agenda: 0, rachat: 0, capital: 0, initie: 0 }[cat] ?? 1;
  let i = base;
  if (cat === "assemblee" && R.comite.test(fold(title))) return 0;
  if (cat === "dirigeants" && /\b(ceo|cfo|chief executive|chief financial|directeur general|directrice generale|directeur financier|pdg|toimitusjohtaja|konsernsjef|vd)\b/.test(fold(title))) i = 3;
  if (privilegiee(official) && !ROUTINE.has(cat)) i = Math.max(i, 2);
  if (/profit warning|avertissement|lowers? (its )?(outlook|guidance)|abaisse|revises? .{0,20}down|raises? (its )?(outlook|guidance)|releve (ses|son) (objectif|prevision)/.test(fold(title))) i = 3;
  return Math.min(3, i);
}

/* ---------- Période (pour le titre français) ---------- */
const NUM = { first: 1, second: 2, third: 3, fourth: 4, premier: 1, premiere: 1, deuxieme: 2, second: 2, troisieme: 3, quatrieme: 4, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "1er": 1, "2e": 2, "3e": 3, "4e": 4, "2eme": 2, "3eme": 3, "4eme": 4 };
export function periode(title) {
  const t = fold(title).replace(/[–—]/g, "-"), y = (t.match(/\b(20\d\d)\b/) || [])[1] || "";
  let m;
  if ((m = t.match(/\bq([1-4])\b/)) || (m = t.match(/\b([1-4])q\b/))) return { q: +m[1], y };
  if ((m = t.match(/\b(first|second|third|fourth|1st|2nd|3rd|4th) quarter\b/))) return { q: NUM[m[1]], y };
  if ((m = t.match(/\b(premier|1er|deuxieme|2e|2eme|second|troisieme|3e|3eme|quatrieme|4e|4eme) trimestre\b/))) return { q: NUM[m[1]], y };
  if (/\b(t([1-4]))\b/.test(t) && (m = t.match(/\bt([1-4])\b/))) return { q: +m[1], y };
  if (/(nine months|nine-month|9 mois|neuf mois|9m\b|january.{0,6}september|januari.{0,6}september|tammi.{0,6}syyskuu|janvier.{0,6}septembre|1 january.{0,8}30 september|1-9\/20|1\.1\.?.{0,3}30\.9|jan.{0,4}sept?)/.test(t)) return { q: 3, y, neuf: true };
  if (/(july.{0,6}september|juli.{0,6}september|heina.{0,6}syyskuu|juillet.{0,6}septembre|7-9\/20)/.test(t)) return { q: 3, y };
  if (/(april.{0,6}june|april.{0,6}juni|huhti.{0,6}kesakuu|avril.{0,6}juin|4-6\/20)/.test(t)) return { q: 2, y };
  if (/(january.{0,6}march|januari.{0,6}mars|tammi.{0,6}maaliskuu|janvier.{0,6}mars|1-3\/20)/.test(t)) return { q: 1, y };
  if (/(october.{0,6}december|oktober.{0,6}december|loka.{0,6}joulukuu|octobre.{0,6}decembre)/.test(t)) return { q: 4, y };
  if (/(half[- ]year|first half|\bh1\b|premier semestre|semestriel|\bs1\b|halvar|puolivuosi|january.?-.?june|januari.?-.?juni|tammi.?-.?kesakuu|second quarter)/.test(t)) return { s: 1, y };
  if (/(full[- ]year|annual results|year[- ]end|resultats annuels|exercice|\bfy\b|bokslut|tilinpaatos|fourth quarter and full)/.test(t)) return { a: true, y };
  return y ? { y } : null;
}
const ORD = ["", "1er", "2e", "3e", "4e"];
export function titreFr(cat, title, official = "", src = "") {
  const t = fold(title), p = periode(title);
  const per = !p ? "" : p.q ? ` du ${ORD[p.q]} trimestre${p.y ? " " + p.y : ""}` : p.s ? ` semestriels${p.y ? " " + p.y : ""}` : p.a ? ` annuels${p.y ? " " + p.y : ""}` : "";
  switch (cat) {
    case "resultats":
      if (/(raises?|releve|rehausse|upgrades?|nostaa) .{0,25}(outlook|guidance|objectif|prevision|tulosohjau)|positive profit warning|positiivinen tulosvaroitus/.test(t)) return "Objectifs relevés";
      if (/(profit warning|avertissement sur resultats|tulosvaroitus)/.test(t)) return "Avertissement sur les résultats";
      if (/(lowers?|abaisse|cuts?|downgrades?|revises? down) .{0,25}(outlook|guidance|objectif|prevision)/.test(t)) return "Objectifs abaissés";
      if (/(chiffre d.affaires|ventes|revenue|sales|turnover)/.test(t) && !/(results|resultats|report|rapport|profit|benefice|earnings)/.test(t)) return "Chiffre d'affaires" + (p && p.q ? per : p && p.s ? " du semestre" + (p.y ? " " + p.y : "") : p && p.a ? " annuel" + (p.y ? " " + p.y : "") : "");
      if (/(trading update|trading statement|business update|point d.activite)/.test(t)) return "Point sur l'activité" + (p && p.q ? per : "");
      if (p && p.s) return "Résultats semestriels" + (p.y ? " " + p.y : "");
      if (p && p.a) return "Résultats annuels" + (p.y ? " " + p.y : "");
      return "Résultats" + per;
    case "rapport": return /10-q/.test(t) ? "Rapport trimestriel" : "Rapport annuel" + (p && p.y ? " " + p.y : "");
    case "dividende": return /(ex.?date|ex-dividend|detachement)/.test(t) ? "Détachement du dividende" : "Dividende";
    case "operation":
      if (/(tender offer|offre publique|\bopa\b|\bope\b|takeover|offer for|uppkopserbjudande|ostotarjous|rule 2\.7|recommended (cash )?offer)/.test(t)) return "Offre publique d'achat";
      if (/(demerger|scission|spin-?off|osittaisjakautum)/.test(t)) return "Scission d'une activité";
      if (/(merger|fusion|business combination)/.test(t)) return "Fusion";
      if (/(divest|disposal|cession|to sell|sale of|sells|cede)/.test(t)) return "Cession d'une activité";
      if (/(acqui|to buy|rachete|rachat de|forvarv|oppkjop|yrityskauppa)/.test(t)) return "Acquisition";
      if (/joint venture/.test(t)) return "Coentreprise";
      if (/strategic review|revue strategique/.test(t)) return "Revue stratégique";
      return "Accord important";
    case "dirigeants":
      if (/\b(ceo|chief executive|directeur general|directrice generale|pdg|toimitusjohtaja|konsernsjef|vd)\b/.test(t)) return "Changement de directeur général";
      if (/\b(cfo|chief financial|directeur financier|directrice financiere)\b/.test(t)) return "Changement de directeur financier";
      if (/(chair|president du conseil|board|conseil d.administration|styrelse|hallitus)/.test(t)) return "Conseil d'administration";
      return "Changement à la direction";
    case "assemblee": return R.comite.test(t) ? "Comité de nomination" : /(result|resultat|decision|resolution|voting results|outcome|kommunike|report from|forlob|approve)/.test(t + " " + fold(official)) ? "Assemblée générale : résultats des votes" : /(notice|convocation|kallelse|kutsu|indkaldelse|innkalling|proxy)/.test(t + " " + fold(official)) ? "Assemblée générale : convocation" : "Assemblée générale";
    case "emission":
      if (/(bond|notes|obliga|debt|emprunt)/.test(t)) return "Émission d'obligations";
      if (/(augmentation de capital|capital increase|rights issue|share issue|issue of (equity|shares|new shares)|nyemission|riktad|osakeanti|emisjon|placement|equity raise|treasury)/.test(t)) return "Émission d'actions";
      if (/prospectus/.test(t)) return "Prospectus";
      if (R.financement.test(t)) return "Financement";
      return "Émission de titres";
    case "incident": return "Incident de cybersécurité";
    case "rachat": return "Rachat d'actions";
    case "capital": return /(holding|franchissement|major|flagg|liputus|participation|interest)/.test(t + " " + fold(official)) ? "Actionnaire important" : "Nombre d'actions et droits de vote";
    case "initie": return "Achat ou vente d'actions par un dirigeant";
    case "agenda": return /(webcast|conference|presentation|invitation|audiocast)/.test(t) ? "Invitation à la présentation des résultats" : "Calendrier financier";
    case "contrat": return "Contrat ou commande";
    default:
      if (R.notation.test(t)) return "Note de crédit";
      if (R.cote.test(t)) return /(delisting|radiation|retrait|avnotering)/.test(t) ? "Retrait de la cote" : "Cotation en Bourse";
      return privilegiee(official) ? "Information importante" : "Communiqué";
  }
}

/* ---------- Chiffres : montants et variations dans un communiqué en anglais (toutes devises) ---------- */
const CUR = { eur: "€", "€": "€", usd: "$", "$": "$", us$: "$", gbp: "£", "£": "£", sek: "SEK", nok: "NOK", dkk: "DKK", chf: "CHF", isk: "ISK", jpy: "¥", cad: "CA$", gbx: "p" };
const NFS = d => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
export function montant(v, cur = "€") {
  const a = Math.abs(v), s = cur === "€" || cur === "$" || cur === "£" ? cur : " " + cur;
  return a >= 1e9 ? NFS(a >= 1e11 ? 0 : 1).format(v / 1e9) + " Md" + s : a >= 1e6 ? NFS(a >= 1e8 ? 0 : 1).format(v / 1e6).replace(/,0$/, "") + " M" + s : NFS(0).format(v) + " " + s.trim();
}
export const pctS = v => (v > 0 ? "+" : v < 0 ? "−" : "") + NFS(Math.abs(v) < 0.1 ? 1 : 0).format(Math.abs(v * 100)) + " %";
// « EUR 26.5 million », « SEK 228.2m », « MSEK 228,2 », « EURm 12.3 », « €1.2bn », « $57.0 billion », « DKK 1,234 million »
const N = String.raw`([-−]?\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|[-−]?\s?\d+(?:[.,]\d+)?)`;
const C1 = String.raw`(EUR|USD|US\$|GBP|SEK|NOK|DKK|CHF|ISK|€|\$|£)`;
const MULT = String.raw`(billion|bn|million|mn|m|thousand|k)\b`;
const AMT = new RegExp(String.raw`(?:${C1}\s?${N}\s?${MULT}|${N}\s?${MULT}\s?${C1}|\b(M|MN|T|K|B|BN)?(SEK|NOK|DKK|EUR|USD|GBP|ISK)(m|M|bn|BN|k)?\s?${N}(?!\s?%)|${C1}\s?${N}\s?(?=\s|,|;|\))(?!\s?(?:per|a)\s?share))`, "i");
const toNum = s => { s = String(s).replace(/[−]/, "-").replace(/\s/g, ""); if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, "")); return parseFloat(s.replace(",", ".")); };
const mul = m => !m ? 1 : /^b/i.test(m) ? 1e9 : /^(m|mn)$/i.test(m) ? 1e6 : /^(t|k|thousand)$/i.test(m) ? 1e3 : /^million$/i.test(m) ? 1e6 : 1;
export function lireMontant(s) {
  const m = s.match(AMT); if (!m) return null;
  if (m[1]) return { v: toNum(m[2]) * mul(m[3]), cur: CUR[m[1].toLowerCase()] || m[1], i: m.index };
  if (m[4]) return { v: toNum(m[4]) * mul(m[5]), cur: CUR[m[6].toLowerCase()] || m[6], i: m.index };
  if (m[8]) { const pre = m[7] ? mul(m[7].replace(/n$/i, "")) : 1, post = m[9] ? mul(m[9]) : 1; return { v: toNum(m[10]) * pre * post, cur: CUR[m[8].toLowerCase()] || m[8], i: m.index }; }
  if (m[11]) return { v: toNum(m[12]), cur: CUR[m[11].toLowerCase()] || m[11], i: m.index, nu: true };
  return null;
}
const phrases = t => String(t).replace(/\s+/g, " ").split(/(?<=[.;!?])\s+(?=[A-ZÀ-Ý"«(•–-])|\s[•▪●]\s|\s-\s(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 700);
function variation(s, from = 0) {
  const x = s.slice(from, from + 160);
  let m = x.match(/\b(up|increased?|grew|growth of|rose|higher|an? increase of|improved by|organic growth of)\s+(?:by\s+)?\+?(\d+(?:[.,]\d+)?)\s?(?:%|per ?cent)/i);
  if (m) return parseFloat(m[2].replace(",", ".")) / 100;
  m = x.match(/\b(down|decreased?|declined?|fell|lower|a decrease of|a decline of|dropped)\s+(?:by\s+)?-?(\d+(?:[.,]\d+)?)\s?(?:%|per ?cent)/i);
  if (m) return -parseFloat(m[2].replace(",", ".")) / 100;
  m = x.match(/\(\s*([+\-−–]?\d+(?:[.,]\d+)?)\s?%\s*\)/) || x.match(/(?:^|[\s,(])([+\-−–]\d+(?:[.,]\d+)?)\s?%/);
  if (m) return parseFloat(m[1].replace(/[−–]/, "-").replace(",", ".")) / 100;
  return null;
}
// Valeur de l'an passé entre parenthèses : « Net sales SEK 228.2 m (236.2) » -> variation calculée
function precedent(s, a) {
  const after = s.slice(a.i, a.i + 90), m = after.match(/\(\s*(?:SEK|EUR|USD|NOK|DKK|€|\$|£)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)\s*(?:m|bn|million|billion)?\s*\)/i);
  if (!m) return null;
  const raw = s.slice(a.i).match(new RegExp(N)); if (!raw) return null;
  const cur = toNum(raw[1]), prev = toNum(m[1]);
  return prev > 0 && cur > 0 && cur / prev < 5 && cur / prev > 0.2 ? cur / prev - 1 : null;
}
const KW = {
  ca: /\b(net sales|revenues?|sales|turnover|net revenue|total income|operating income)\b/i,
  rop: /\b(operating profit|operating result|ebita|ebit|adjusted operating (profit|income)|operating income|comparable operating profit|underlying operating profit)\b/i,
  net: /\b(net (profit|income|earnings|result)|profit (for|after tax|attributable)|result (for the period|after tax)|net profit attributable)\b/i,
  eps: /\b(earnings per share|eps)\b/i,
  div: /\bdividend\b/i,
};
export function chiffresEN(text, cur0 = null) {
  const S = phrases(String(text).slice(0, 25000)), out = {};
  for (const k of ["ca", "rop", "net"]) {
    for (const s of S) {
      const km = s.match(KW[k]); if (!km) continue;
      if (k === "ca" && /operating income/i.test(km[0]) && !/bank|insurance/i.test(s)) continue;
      if (k === "rop" && KW.net.test(s.slice(0, km.index))) continue;
      const a = lireMontant(s.slice(km.index, km.index + 140)); if (!a || a.nu && a.v < 1000) continue;
      if (Math.abs(a.v) < 1e5 || (k === "ca" && a.v <= 0)) continue;
      a.i += km.index;
      const g = variation(s, a.i) ?? precedent(s, a);
      out[k] = { v: a.v, cur: a.cur, g, q: /\bquarter|q[1-4]\b/i.test(s) ? "trimestre" : /half[- ]year|six months|first half|january.?-.?june/i.test(s) ? "semestre" : /full[- ]year|twelve months|financial year|annual|january.?-.?december/i.test(s) ? "année" : "", s };
      break;
    }
  }
  for (const s of S) { const m = s.match(/(?:earnings per share|EPS)[^.;]{0,60}?(?:EUR|USD|SEK|NOK|DKK|GBP|€|\$|£)\s?(-?\d+[.,]\d{1,3})|(?:earnings per share|EPS)[^.;]{0,60}?(-?\d+[.,]\d{1,3})\s?(?:EUR|USD|SEK|NOK|DKK|GBP|€|\$|pence|p)\b/i); if (m) { out.eps = { v: parseFloat((m[1] || m[2]).replace(",", ".")), cur: (s.match(/EUR|USD|SEK|NOK|DKK|GBP|€|\$|£|pence/i) || [""])[0], s }; break; } }
  for (const s of S) { const m = s.match(/dividend[^.;]{0,80}?(?:of\s+)?(?:(EUR|USD|SEK|NOK|DKK|GBP|CHF|€|\$|£)\s?(\d+[.,]\d{1,4})|(\d+[.,]\d{1,4})\s?(EUR|USD|SEK|NOK|DKK|GBP|CHF|€|pence|p|cents)\b)[^.;]{0,30}?(?:per|a)\s+(?:ordinary\s+)?share/i); if (m) { out.div = { v: parseFloat((m[2] || m[3]).replace(",", ".")), cur: CUR[(m[1] || m[4]).toLowerCase()] || (m[1] || m[4]), s }; break; } }
  const g = S.find(s => /\b(outlook|guidance|expects?|forecast|anticipates?)\b/i.test(s) && KW.ca.test(s) && lireMontant(s));
  if (g) { const a = lireMontant(g); if (a && a.v >= 1e6 && !(out.ca && Math.abs(a.v / out.ca.v - 1) < 0.03)) out.prevision = { v: a.v, cur: a.cur, s: g, q: /quarter/i.test(g) ? "trimestre" : "année" }; }
  const obj = S.find(s => /\b(raises?|lowers?|reiterates?|confirms?|maintains?|narrows?|updates?)\b[^.]{0,40}\b(outlook|guidance|targets?|forecast)\b/i.test(s));
  if (obj) out.objectif = { s: obj, sens: /raises?|upgrades?/i.test(obj) ? 1 : /lowers?|cuts?/i.test(obj) ? -1 : 0 };
  return out;
}
// Chiffres affichés et lecture, à partir de l'extraction et des derniers comptes annuels
const PER = q => q === "trimestre" ? " du trimestre" : q === "semestre" ? " du semestre" : q === "année" ? " de l'année" : "";
export function presenter(x, annual = null) {
  const f = [], L = [];
  if (x.ca) f.push([`Ventes${PER(x.ca.q)}`, montant(x.ca.v, x.ca.cur) + (x.ca.g != null ? ` (${pctS(x.ca.g)})` : "")]);
  if (x.rop) f.push([`Résultat d'exploitation${PER(x.rop.q)}`, montant(x.rop.v, x.rop.cur) + (x.rop.g != null ? ` (${pctS(x.rop.g)})` : "")]);
  if (x.net) f.push([`Bénéfice net${PER(x.net.q)}`, montant(x.net.v, x.net.cur) + (x.net.g != null ? ` (${pctS(x.net.g)})` : "")]);
  if (x.eps) f.push(["Bénéfice par action", NFS(2).format(x.eps.v) + " " + (CUR[String(x.eps.cur).toLowerCase()] || x.eps.cur || "")]);
  if (x.div) f.push(["Dividende par action", NFS(2).format(x.div.v) + " " + (x.div.cur || "")]);
  if (x.prevision) f.push([`Prévision de ventes${PER(x.prevision.q)}`, "environ " + montant(x.prevision.v, x.prevision.cur)]);
  if (x.ca && x.ca.g != null) {
    const g = x.ca.g; L.push(g > 0.15 ? `Les ventes progressent très vite (${pctS(g)}).` : g > 0.03 ? `Les ventes progressent (${pctS(g)}).` : g > -0.03 ? `Les ventes sont stables (${pctS(g)}).` : `Les ventes reculent (${pctS(g)}).`);
    if (annual && annual.g1 != null && Math.abs(g - annual.g1) > 0.03) L.push(g > annual.g1 ? `C'est plus rapide que sur le dernier exercice complet (${pctS(annual.g1)}) : l'activité accélère.` : `C'est moins rapide que sur le dernier exercice complet (${pctS(annual.g1)}) : l'activité ralentit.`);
  }
  if (x.net && x.net.v < 0) L.push("L'entreprise est en perte sur la période.");
  else if (x.net && x.net.g != null && x.ca && x.ca.g != null) {
    if (x.net.g > x.ca.g + 0.05) L.push(`Le bénéfice progresse plus vite que les ventes (${pctS(x.net.g)}) : chaque vente rapporte davantage.`);
    else if (x.net.g < x.ca.g - 0.05) L.push(`Le bénéfice progresse moins vite que les ventes (${pctS(x.net.g)}) : les coûts pèsent davantage, ou un élément exceptionnel joue.`);
  }
  if (x.objectif) L.push(x.objectif.sens > 0 ? "L'entreprise relève ses objectifs : elle s'attend à mieux que prévu." : x.objectif.sens < 0 ? "L'entreprise abaisse ses objectifs : elle s'attend à moins bien que prévu." : "L'entreprise confirme ses objectifs.");
  return { f, r: L.slice(0, 3) };
}
// Garde-fou : chiffres invraisemblables au regard des comptes annuels (même devise seulement)
export function vraisemblable(x, annual) {
  if (!annual || !annual.ca) return x;
  const CA = Math.abs(annual.ca) * 1e6, cur = annual.cur, ok = { ...x };
  const same = o => !o || !o.cur || !cur || o.cur === cur || (o.cur === "€" && cur === "EUR") || (o.cur === "$" && cur === "USD") || (o.cur === "£" && cur === "GBP");
  const range = q => q === "trimestre" ? [0.12, 0.45] : q === "semestre" ? [0.3, 0.7] : q === "année" ? [0.7, 1.5] : [0.1, 1.5];
  if (x.ca && same(x.ca)) { const [a, b] = range(x.ca.q); if (!(x.ca.v >= a * CA && x.ca.v <= b * CA)) delete ok.ca; }
  for (const k of ["net", "rop"]) if (x[k] && same(x[k]) && !(Math.abs(x[k].v) <= 0.7 * CA && Math.abs(x[k].v) >= 0.001 * CA)) delete ok[k];
  if (x.prevision && same(x.prevision) && !(x.prevision.v >= 0.1 * CA && x.prevision.v <= 1.6 * CA)) delete ok.prevision;
  for (const k of ["ca", "rop", "net", "prevision"]) if (ok[k] && Math.abs(ok[k].g ?? 0) > 3) ok[k] = { ...ok[k], g: null };
  return ok;
}
