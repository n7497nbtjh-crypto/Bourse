// Sonde ponctuelle : profil et symbole Eulerpool d'une liste d'ISIN (pour préparer un lot). Affiche une ligne JSON.
const KEY = process.env.EULERPOOL_KEY, B = "https://api.eulerpool.com/api/1", L = (process.argv[2] || "").split(",").filter(Boolean), out = {};
const get = async p => { const r = await fetch(`${B}${p}${p.includes("?") ? "&" : "?"}token=${KEY}`); return r.ok ? r.json() : null; };
for (const i of L) {
  const p = await get(`/equity/profile/${i}`), s = await get(`/equity/search?q=${i}`), m = s && (s.results || []).find(x => x.isin === i);
  out[i] = p ? { n: p.name, t: m && m.ticker, c: p.currency, w: p.website, s: p.sector, ind: p.industry, cap: p.mcap, pays: p.country, bourse: p.exchange, d: (p.description || "").slice(0, 260) } : null;
  console.log("P1=" + JSON.stringify([i, out[i]]));
  await new Promise(r => setTimeout(r, 200));
}

