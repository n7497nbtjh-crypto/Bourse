// Sonde ponctuelle : recherche d'une société chez Eulerpool (nom ou code de cotation). N'écrit rien.
const KEY = process.env.EULERPOOL_KEY, B = "https://api.eulerpool.com/api/1", q = process.argv[2] || "Kirin";
for (const p of [`/equity/search?q=${q}`, `/equity/search?query=${q}`, `/search?q=${q}`, `/equity/search/${q}`, `/equity/symbol/${q}`, `/equity/ticker/${q}`, `/equity/lookup?q=${q}`]) {
  const r = await fetch(`${B}${p}${p.includes("?") ? "&" : "?"}token=${KEY}`); const t = await r.text(); console.log(p, r.status, t.slice(0, 400));
}
