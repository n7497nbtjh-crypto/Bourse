// Sonde ponctuelle : clôtures d'un an d'une société (repérer les pics isolés). N'écrit rien.
const KEY = process.env.EULERPOOL_KEY, B = "https://api.eulerpool.com/api/1", isin = process.argv[2] || "KR7012330007";
const r = await fetch(`${B}/equity/candles/${isin}?range=1y&token=${KEY}`); const L = await r.json();
const C = L.map(x => [new Date(x.timestamp).toISOString().slice(0, 10), x.close]);
const hauts = C.slice().sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log("SERIE", C.length, "points ; plus hauts :", JSON.stringify(hauts), "; un point par mois :", JSON.stringify(C.filter((x, i) => i % 21 === 0)));
