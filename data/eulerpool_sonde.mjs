// Sonde ponctuelle : formes des réponses Eulerpool (cours, profil, dividendes). N'écrit rien.
const KEY = process.env.EULERPOOL_KEY, B = "https://api.eulerpool.com/api/1", isin = process.argv[2] || "CH0038863350";
const P = [`/equity/candles/${isin}?range=5y`, `/equity/candles/${isin}?range=max`, `/equity/candles/${isin}?range=1y`, `/equity/profile/${isin}`, `/equity/dividends/${isin}`, `/equity/quotes/${isin}`, `/equity/quote/${isin}`];
for (const p of P) {
  const r = await fetch(`${B}${p}${p.includes("?") ? "&" : "?"}token=${KEY}`); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
  if (Array.isArray(j)) console.log(p, r.status, j.length, "lignes ; premières :", JSON.stringify(j.slice(0, 2)), "dernières :", JSON.stringify(j.slice(-3)));
  else console.log(p, r.status, t.slice(0, 700));
}
