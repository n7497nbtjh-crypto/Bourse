// Cours de clôture repris d'Eulerpool (5/11/2026) pour les entreprises sans cours dans les feuilles Google.
// Un appel par société et par jour (cours ajustés des divisions d'actions sur 5 ans : dernier cours, variation, plus haut / bas
// sur un an, cours il y a 1, 3 et 5 ans) ; nombre d'actions repris du profil une fois par mois (capitalisation = cours × actions).
// Mention « Data by Eulerpool » sur la fiche (offre gratuite). Les cours Google restent prioritaires.
//   node data/eulerpool_cours.mjs --verifier 40   compare Eulerpool et Google sur 40 sociétés qui ont les deux (n'écrit rien)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { DEVISE_PLACE } from "./eulerpool.mjs";
const KEY = process.env.EULERPOOL_KEY || "", B = "https://api.eulerpool.com/api/1";
const CACHE = new URL("./eulerpool_cours_cache.json", import.meta.url);
const J = 864e5, r2 = v => Math.round(v * 100) / 100, r4 = v => v == null ? null : Math.round(v * 1e4) / 1e4;

async function get(path) {
  const r = await fetch(`${B}${path}${path.includes("?") ? "&" : "?"}token=${KEY}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Eulerpool ${r.status}`);
  return r.json();
}
// Bougies (clôtures datées) → champs du fichier des cours, ou null si trop ancien ou incohérent
export function depuisBougies(L, cur, actions, auj = Date.now()) {
  const C = (L || []).filter(x => x && x.close > 0 && x.timestamp).sort((a, b) => a.timestamp - b.timestamp);
  if (C.length < 30) return null;
  const der = C.at(-1); if (auj - der.timestamp > 7 * J) return null; // plus de cotation récente
  // cours à une date : la dernière séance avant, sinon (début de l'historique, 5 ans pile) la première séance dans les 12 jours qui suivent
  const avant = t => { let v = null; for (const x of C) { if (x.timestamp <= t) v = x; else break; } if (v && t - v.timestamp < 12 * J) return v.close; const w = C.find(x => x.timestamp > t); return w && w.timestamp - t < 12 * J ? w.close : null; };
  const an = C.filter(x => x.timestamp > der.timestamp - 365 * J).map(x => x.close);
  const prec = C.at(-2), chg = prec ? r2((der.close / prec.close - 1) * 100) : null;
  if (chg != null && Math.abs(chg) > 40) return null; // saut d'un jour invraisemblable (cours mal raccordé)
  return { s: "EP", cur, p: Math.round(der.close * 1e4) / 1e4, chg, cap: actions > 0 ? Math.round(der.close * actions * 1e6) : null, h52: r4(Math.max(...an)), l52: r4(Math.min(...an)),
    p1y: r4(avant(der.timestamp - 365 * J)), p3y: r4(avant(der.timestamp - 3 * 365 * J)), p5y: r4(avant(der.timestamp - 5 * 365 * J)),
    d: new Date(der.timestamp).toISOString().slice(0, 10), ep: 1 };
}

// societes : [{ id, isin, tv }] sans cours ; renvoie { "c:<id>": item } et tient le cache à jour (un appel par société et par jour)
export async function coursEulerpool(societes, log = console.log) {
  if (!KEY) { log("EULERPOOL_KEY absent : cours Eulerpool non demandés"); return {}; }
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {}, out = {}, now = Date.now();
  let appels = 0, ok = 0;
  for (const c of societes) {
    const place = String(c.tv || "").split(":")[0], cur = DEVISE_PLACE[place];
    if (!c.isin || !cur) continue; // Londres (5/11) : profil en livres = cours en pence chez Eulerpool (GSK 1 827,5 pour 18,27 £), divisés par 100
    const m = cache[c.id] || {};
    try {
      if (!m.prof || now - Date.parse(m.prof) > 30 * J) { const p = await get(`/equity/profile/${c.isin}`); appels++; Object.assign(m, { prof: new Date().toISOString().slice(0, 10), cur: p && p.currency, actions: p && p.shares }); }
      if (m.cur !== cur) { cache[c.id] = m; continue; } // devise du profil différente de la cotation : écarté (voir data/eulerpool.mjs)
      if (!m.lu || now - m.lu > 20 * 3600e3) { const b = await get(`/equity/candles/${c.isin}?range=5y`); appels++; m.lu = now; m.item = depuisBougies(place === "LSE" ? (b || []).map(x => ({ ...x, close: x.close / 100 })) : b, cur, m.actions); }
      cache[c.id] = m;
      if (m.item && now - Date.parse(m.item.d) < 7 * J) {
        // Capitalisation recoupée avec les comptes : nombre d'actions = bénéfice ÷ bénéfice par action. Un écart de plus de 25 %
        // (plusieurs catégories d'actions, augmentation de capital : Porsche, Ørsted) fait prendre le nombre tiré des comptes.
        const it = { ...m.item }, f = new URL(`../cf/site/data/societes/${c.id}.json`, import.meta.url);
        try { if (existsSync(f)) { const j = JSON.parse(readFileSync(f, "utf8")), n = (j.fin && j.fin.net || []).at(-1), e = (j.fin && j.fin.eps || []).at(-1);
          if (j.currency === cur && n > 0 && e > 0) { const nb = n / e; if (!(m.actions > 0) || Math.abs(m.actions / nb - 1) > 0.25) it.cap = Math.round(it.p * nb * 1e6); } } } catch (e) { }
        out["c:" + c.id] = it; ok++; }
    } catch (e) { log("cours Eulerpool", c.id, e.message); if (/ 5\d\d/.test(e.message)) break; }
    if (appels % 50 === 49) writeFileSync(CACHE, JSON.stringify(cache));
  }
  writeFileSync(CACHE, JSON.stringify(cache));
  log(`${ok} cours repris d'Eulerpool (${appels} appels)`);
  return out;
}

if (process.argv[1] && /[\/\\]eulerpool_cours\.mjs$/.test(process.argv[1])) {
  const i = process.argv.indexOf("--verifier"), n = i > 0 ? +process.argv[i + 1] : 40;
  const { default: U } = await import("./univers.mjs"), items = JSON.parse(readFileSync(new URL("../cf/site/data/cours.json", import.meta.url))).items;
  const mode = process.argv[process.argv.indexOf("--verifier") + 2] || ""; // « lse », « devise » ou « us » : cas à valider avant de les ouvrir
  const avec = U.filter(c => items["c:" + c.id] && items["c:" + c.id].p > 0 && items["c:" + c.id].s !== "EP" && DEVISE_PLACE[String(c.tv || "").split(":")[0]]
    && (mode === "lse" ? /^LSE:/.test(c.tv) : mode === "us" ? /^(NYSE|NASDAQ):/.test(c.tv) : !/^LSE:/.test(c.tv || "")));
  for (let k = avec.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [avec[k], avec[j]] = [avec[j], avec[k]]; }
  const L = []; for (const c of avec.slice(0, n)) {
    const g = items["c:" + c.id], cur = DEVISE_PLACE[c.tv.split(":")[0]];
    const p = await get(`/equity/profile/${c.isin}`), b = p && (mode === "devise" ? p.currency !== cur : p.currency === cur) ? await get(`/equity/candles/${c.isin}?range=5y`) : null, e = b ? depuisBougies(/^LSE:/.test(c.tv) ? b.map(x => ({ ...x, close: x.close / 100 })) : b, cur, p.shares) : null;
    if (!e) { console.log(c.id, "pas de cours Eulerpool", p ? p.currency : "inconnue"); continue; }
    const ec = x => g[x] && e[x] ? Math.round((e[x] / g[x] - 1) * 1000) / 10 : null;
    L.push(Math.abs(ec("p"))); console.log(c.id, cur, "Google", g.p, "Eulerpool", e.p, e.d, "écart", ec("p"), "% | 1 an", ec("p1y"), "% | haut", ec("h52"), "% | capitalisation", ec("cap"), "%");
  }
  L.sort((a, b) => a - b); console.log(`\n${L.length} comparés ; écart médian ${L[L.length >> 1]} %, ${L.filter(x => x > 3).length} au-delà de 3 %`);
}
