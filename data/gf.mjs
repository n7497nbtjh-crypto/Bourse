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
export const INDICES = [["cac40", "INDEXEURO:PX1"], ["sp500", "INDEXSP:.INX"], ["stoxx50", "INDEXSTOXX:SX5E"], ["nasdaq100", "INDEXNASDAQ:NDX"], ["dax", "INDEXDB:DAX"], ["ftse100", "INDEXFTSE:UKX"], ["nikkei", "INDEXNIKKEI:NI225"]];
