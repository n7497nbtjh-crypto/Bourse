// Sonde ponctuelle : ISIN des sociétés de Tokyo d'après leur code (recherche Eulerpool, ticker « code.T »). Affiche une ligne JSON.
const KEY = process.env.EULERPOOL_KEY, B = "https://api.eulerpool.com/api/1", codes = (process.argv[2] || "").split(",").filter(Boolean), out = {};
for (const c of codes) {
  const r = await fetch(`${B}/equity/search?q=${c}&token=${KEY}`); const j = r.ok ? await r.json() : {};
  const m = (j.results || []).find(x => x.ticker === c + ".T"); out[c] = m ? [m.isin, m.name] : null;
  await new Promise(r => setTimeout(r, 250));
}
console.log("ISIN=" + JSON.stringify(out));
