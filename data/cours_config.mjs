// Feuille Google « bilan - cours des actions » (GOOGLEFINANCE), publiée en CSV : lecture seule, cours différés d'environ 20 minutes.
export const COURS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQSc8wwIJdTs5yppVXXRcMpjRNx03oAqNSdNU4JCga490IjxCB7V-tHsichFZVB6gzpNmDn4htDrRA/pub?output=csv";
// Une feuille ne calcule qu'environ 1 260 titres : la liste est découpée en gf.csv, gf2.csv, gf3.csv… (data/gf.mjs).
// Pour chaque fichier gfN.csv à partir de gf2.csv, Romain crée une fois une copie de la feuille :
//   1. ouvrir la feuille « bilan - cours des actions » ; 2. Fichier > Créer une copie (nom : « bilan - cours 2 », « bilan - cours 3 »…) ;
//   3. dans la copie, cellule A1, remplacer « gf.csv » par « gf2.csv » (ou gf3.csv…) dans la formule IMPORTDATA, Entrée ;
//   4. Fichier > Partager > Publier sur le Web > « Feuille entière », format « Valeurs séparées par des virgules (.csv) » > Publier ;
//   5. ajouter le lien obtenu à la liste ci-dessous, dans l'ordre (ou le donner à Claude).
export const COURS_CSV_SUITE = [ // copies de la feuille : gf2.csv, gf3.csv, gf4.csv (publiées le 29/10/2026)
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQRss-rBkYNWtXDrNMHcDudDsxMJZ2djLCjTvt-w6bGiXqnPEbdr3sxPtcXpa9tgTDN045owZTzaxNd/pub?output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQwYIFEt9Ux_l7uyPut1Hv--GFFmiBgi2tgV2HN4UigVZLfGmykoaKEr-E1ZRsIO09dOpgUgZmzlrld/pub?output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR70B8qndqju4-YPgTIzxFTB7iPMfcUtHoKz9ZWG-ekQ_yXZfTs5ZPmDa4sxIvEaSbAo5jnIhJrSQon/pub?output=csv",
];
export const COURS_CSVS = [COURS_CSV, ...COURS_CSV_SUITE].filter(Boolean);
// Lecture du CSV publié : { "c:lvmh": { s, p, chg, cur, cap, h52, l52, p1y, p3y, p5y }, … }
const DEV_PLACE = { NASDAQ: "USD", NYSE: "USD", NYSEAMERICAN: "USD", EPA: "EUR", AMS: "EUR", EBR: "EUR", ELI: "EUR", ETR: "EUR", FRA: "EUR", BIT: "EUR", BME: "EUR", HEL: "EUR", VIE: "EUR", ISE: "EUR", SWX: "CHF", STO: "SEK", CPH: "DKK", OSL: "NOK", TYO: "JPY", HKG: "HKD", TSE: "CAD", ASX: "AUD", WSE: "PLN" };
export function parseCours(txt) {
  const rows = [], re = /("([^"]|"")*"|[^,\n\r]*)(,|\r?\n|$)/g;
  let row = [], m;
  while ((m = re.exec(txt)) && m[0] !== "") {
    let v = m[1]; if (v.startsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
    row.push(v); if (m[3] !== ",") { rows.push(row); row = []; }
  }
  const head = rows.shift() || [], col = k => head.indexOf(k), out = {};
  const num = v => { const x = parseFloat(String(v).replace(/[^0-9.eE+-]/g, "")); return isFinite(x) ? x : null; };
  for (const r of rows) {
    const id = r[col("id")]; if (!id || !r[col("sym")]) continue;
    let cur = r[col("cur")] || null, p = num(r[col("price")]), k = 1;
    // 7/11 : une feuille recalculée en partie peut donner le cours sans sa devise (Apple sans « USD » : PER faux sur tout le site).
    // La devise est alors déduite de la place de cotation quand elle n'a qu'une devise ; sinon (Londres…) la ligne reste sans devise.
    if (!cur && p != null) cur = DEV_PLACE[String(r[col("sym")]).split(":")[0]] || null;
    if (cur === "GBX") { cur = "GBP"; k = 0.01; } // cours de Londres en pence
    const o = { s: r[col("sym")], cur, p: p != null ? p * k : null, chg: num(r[col("chg")]), cap: num(r[col("cap")]) };
    for (const f of ["h52", "l52", "p1y", "p3y", "p5y"]) { const x = num(r[col(f)]); o[f] = x != null ? x * k : null; }
    // 5/11 : Londres, Google donne parfois le plus haut sur un an en pence et le cours en livres (Compass : 34,11 £ et « 2 563 ») : ramené à la même unité
    if (o.p > 0 && cur === "GBP") for (const f of ["h52", "l52", "p1y", "p3y", "p5y"]) { const x = o[f]; if (x > 0 && x / o.p > 30) o[f] = x / 100; else if (x > 0 && o.p / x > 30) o[f] = x * 100; }
    // fourchette sur un an qui n'encadre pas le cours du jour : fausse, retirée
    if (o.p > 0 && o.h52 > 0 && o.l52 > 0 && (o.p > o.h52 * 1.05 || o.p < o.l52 * 0.95 || o.l52 > o.h52)) { o.h52 = null; o.l52 = null; }
    if (o.p != null) out[id] = o;
  }
  return out;
}
