// Sonde ponctuelle (5/11) : quels points d'accès Eulerpool répondent, et avec quels champs. N'écrit rien.
const KEY = process.env.EULERPOOL_KEY, B = "https://api.eulerpool.com/api/1", isin = process.argv[2] || "DE0008404005";
const P = ["incomestatement", "balancesheet", "balance-sheet", "cashflowstatement", "cashflow", "cash-flow-statement", "dividends", "keyfigures", "key-figures", "ratios", "fundamentals", "estimates"];
for (const p of P) {
  const r = await fetch(`${B}/equity/${p}/${isin}?token=${KEY}`); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
  const x = Array.isArray(j) ? j.filter(e => String(e.period || e.date || "").slice(0, 10) <= "2026-11-05").sort((a, b) => String(b.period || b.date).localeCompare(String(a.period || a.date)))[0] : j;
  console.log(p, r.status, Array.isArray(j) ? j.length + " lignes" : "", x ? JSON.stringify(x).slice(0, 900) : t.slice(0, 120));
}
