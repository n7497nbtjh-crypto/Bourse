// Liste des codes Google Finance pour la feuille « cours » (GOOGLEFINANCE). Jusqu'à trois codes candidats par titre,
// la feuille garde le premier qui renvoie un cours. Résultat : cf/site/data/gf.csv (lu par la feuille avec IMPORTDATA).
const EX = { NYSE: ["NYSE"], NASDAQ: ["NASDAQ"], LSE: ["LON"], OMXSTO: ["STO"], OMXCOP: ["CPH"], OMXHEX: ["HEL"], BME: ["BME"], MIL: ["BIT"], XETR: ["ETR", "FRA"],
  OSL: ["OSL"], VIE: ["VIE"], TSX: ["TSE"], GPW: ["WSE"], ATHEX: ["ATH"], TSE: ["TYO"], NSE: ["NSE"], SIX: ["SWX"], HKEX: ["HKG"], BMFBOVESPA: ["BVMF"], BMV: ["BMV"], TWSE: ["TPE"], ASX: ["ASX"], TASE: ["TLV"],
  KRX: ["KRX"], SSE: ["SHA"], SZSE: ["SHE"], SGX: ["SGX"], TADAWUL: ["TADAWUL"] };
const EURONEXT = { FR: ["EPA", "AMS", "EBR"], NL: ["AMS", "EPA", "EBR"], BE: ["EBR", "AMS", "EPA"], PT: ["ELI", "EPA", "AMS"], IE: ["ISE", "AMS", "EPA"], LU: ["AMS", "EPA", "EBR"], ES: ["EPA", "AMS", "BME"] };
export function candidates(tv, isin = "") {
  const [ex, t] = String(tv || "").split(":"); if (!t) return [];
  const g = ex === "EURONEXT" ? (EURONEXT[isin.slice(0, 2)] || ["EPA", "AMS", "EBR"]) : (EX[ex] || [ex]);
  const tick = (ex === "LSE" ? t.replace(/\.$/, "") : ex === "HKEX" ? t.replace(/^0+/, "") : t).replace(/_/g, "-"); // Google : NOVO-B et non NOVO_B
  return [...new Set(g.map(p => `${p}:${tick}`))].slice(0, 3);
}
export function gfCsv(companies, etfs, indices) {
  const rows = [["id", "c1", "c2", "c3"]];
  for (const c of companies) rows.push(["c:" + c.id, ...candidates(c.tv, c.isin), "", "", ""].slice(0, 4));
  for (const e of etfs) rows.push(["e:" + e.id, ...candidates(e.tv, e.isin), "", "", ""].slice(0, 4));
  for (const [id, sym] of indices) rows.push(["i:" + id, sym, "", ""]);
  return rows.map(r => r.join(",")).join("\n") + "\n";
}
// Une feuille Google ne calcule qu'environ 1 260 lignes de GOOGLEFINANCE à la fois (au-delà, les cours et les colonnes historiques
// ne répondent plus). La liste est donc découpée en fichiers de GF_ROWS lignes : gf.csv (feuille actuelle), gf2.csv, gf3.csv…
// (une copie de la feuille par fichier, voir data/cours_config.mjs). Ordre : indices, puis les titres (actions et ETF) dont la feuille
// donnait déjà un cours, puis les autres, ceux des bourses que GOOGLEFINANCE ne lit pas (Oslo, Dublin…) en dernier.
export const GF_ROWS = 1262;
export function gfParts(companies, etfs, indices, known = {}, size = GF_ROWS) {
  const row = (k, tv, isin) => [k, ...candidates(tv, isin), "", "", ""].slice(0, 4);
  const titles = [...companies.map(c => row("c:" + c.id, c.tv, c.isin)), ...etfs.map(e => row("e:" + e.id, e.tv, e.isin))];
  const st = {}; for (const r of titles) { const p = (r[1] || "").split(":")[0]; st[p] = st[p] || [0, 0]; st[p][0]++; if (known[r[0]]) st[p][1]++; }
  const dead = r => r.slice(1).filter(Boolean).every(c => { const s = st[c.split(":")[0]]; return s && s[0] >= 5 && s[1] === 0; });
  const all = [...indices.map(([id, sym]) => ["i:" + id, sym, "", ""]), ...titles.filter(r => known[r[0]]), ...titles.filter(r => !known[r[0]] && !dead(r)), ...titles.filter(r => !known[r[0]] && dead(r))];
  const csv = rows => [["id", "c1", "c2", "c3"], ...rows].map(r => r.join(",")).join("\n") + "\n";
  const parts = []; for (let i = 0; i < all.length; i += size) parts.push(csv(all.slice(i, i + size)));
  return parts;
}
// Nom du fichier de la partie i (0 : gf.csv, 1 : gf2.csv…)
export const gfName = i => i ? "gf" + (i + 1) + ".csv" : "gf.csv";
export const INDICES = [["cac40", "INDEXEURO:PX1"], ["sp500", "INDEXSP:.INX"], ["stoxx50", "INDEXSTOXX:SX5E"], ["nasdaq100", "INDEXNASDAQ:NDX"], ["dax", "INDEXDB:DAX"], ["ftse100", "INDEXFTSE:UKX"], ["nikkei", "INDEXNIKKEI:NI225"]];
