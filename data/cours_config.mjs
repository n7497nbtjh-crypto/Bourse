// Feuille Google « bilan - cours des actions » (GOOGLEFINANCE), publiée en CSV : lecture seule, cours différés d'environ 20 minutes.
export const COURS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQSc8wwIJdTs5yppVXXRcMpjRNx03oAqNSdNU4JCga490IjxCB7V-tHsichFZVB6gzpNmDn4htDrRA/pub?output=csv";
// Lecture du CSV publié : { "c:lvmh": { s, p, chg, cur, cap, h52, l52, p1y, p3y, p5y }, … }
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
    if (cur === "GBX") { cur = "GBP"; k = 0.01; } // cours de Londres en pence
    const o = { s: r[col("sym")], cur, p: p != null ? p * k : null, chg: num(r[col("chg")]), cap: num(r[col("cap")]) };
    for (const f of ["h52", "l52", "p1y", "p3y", "p5y"]) { const x = num(r[col(f)]); o[f] = x != null ? x * k : null; }
    if (o.p != null) out[id] = o;
  }
  return out;
}
