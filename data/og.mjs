// Images de partage par fiche (5e passage, B1, 31/10/2026) : /og/entreprise/<id>.png (1200 × 630) : logo ou initiale, nom, secteur,
// verdict, les cinq jauges face à la médiane, « source : comptes officiels ». Pour le partage sur X et les messageries (og:image).
// Les positions des jauges et le verdict viennent des fonctions du site lui-même (rfAxes, rfVerdictMots), ouvertes une fois dans
// Chromium hors ligne (comme scripts/check-contradictions.mjs) : rien n'est recalculé à part.
// Ne traite que les N plus grosses capitalisations (--max, 300 par défaut) : une image pèse 20 à 40 ko.
// Écrit aussi cf/site/og/index.json (liste des identifiants) : le Worker ne met og:image que pour ces fiches.
//   node data/og.mjs [--max 300] [--id lvmh]      (robot og.yml ; Playwright + sharp requis)
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";
const require = createRequire(import.meta.url);
const { ouvrir, aller } = require("../scripts/_site.js");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const MAX = +arg("--max", 300), ID = arg("--id", null), OUT = "cf/site/og/entreprise";
mkdirSync(OUT, { recursive: true });
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SECT = { tech: "Technologie", finance: "Banque et assurance", sante: "Santé", conso: "Consommation", industrie: "Industrie", materiaux: "Matériaux", telecom: "Télécoms et médias", immo: "Immobilier", energie: "Énergie", services: "Services aux collectivités" };
const TEINTE = { tech: 215, finance: 150, sante: 350, conso: 25, industrie: 205, materiaux: 40, telecom: 265, immo: 95, energie: 10, services: 180 };

export function carteSVG(d) { // d : { name, sector, verdict, year, axes: [{ t, word, p }], logoB64 }
  const h = TEINTE[d.sector] ?? 30, ini = String(d.name || "").replace(/[^A-Za-zÀ-ÿ' -]/g, "").split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const logo = d.logoB64 ? `<clipPath id="c"><rect x="72" y="64" width="96" height="96" rx="20"/></clipPath><rect x="72" y="64" width="96" height="96" rx="20" fill="#fff" stroke="#E2DCCF"/><image href="data:image/png;base64,${d.logoB64}" x="84" y="76" width="72" height="72" clip-path="url(#c)"/>`
    : `<rect x="72" y="64" width="96" height="96" rx="20" fill="hsl(${h} 38% 88%)" stroke="hsl(${h} 30% 78%)"/><text x="120" y="129" text-anchor="middle" font-family="Inter Tight, Inter, Arial, sans-serif" font-weight="800" font-size="44" fill="hsl(${h} 45% 28%)">${esc(ini)}</text>`;
  const nom = esc(d.name).slice(0, 34), fs = d.name.length > 22 ? 44 : 56;
  const jauges = (d.axes || []).slice(0, 5).map((a, i) => { const y = 318 + i * 54, x0 = 540, w = 420, px = x0 + Math.max(0, Math.min(1, a.p ?? 0.5)) * w, col = a.p == null ? "#B9B2A5" : a.p >= 0.55 ? "#0E6B4A" : a.p > 0.45 ? "#B9B2A5" : "#D94F2B";
    return `<text x="72" y="${y + 7}" font-family="IBM Plex Sans, Arial, sans-serif" font-weight="700" font-size="24" fill="#111214">${esc(a.t)}</text>
      <text x="218" y="${y + 7}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="18" fill="#55524C">${esc(String(a.word || "").slice(0, 34))}</text>
      <rect x="${x0}" y="${y - 4}" width="${w}" height="8" rx="4" fill="url(#g)"/><rect x="${x0 + w / 2 - 1}" y="${y - 12}" width="2" height="24" fill="#111214"/>
      ${a.p == null ? "" : `<circle cx="${px.toFixed(1)}" cy="${y}" r="11" fill="#fff" stroke="${col}" stroke-width="4"/>`}`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#F3C9B8"/><stop offset=".5" stop-color="#E2DCCF"/><stop offset="1" stop-color="#BFE3CF"/></linearGradient></defs>
  <rect width="1200" height="630" fill="#F8F5EE"/>
  ${logo}
  <text x="196" y="112" font-family="Inter Tight, Inter, Arial, sans-serif" font-weight="800" font-size="${fs}" fill="#111214" letter-spacing="-1">${nom}</text>
  <text x="196" y="150" font-family="IBM Plex Sans, Arial, sans-serif" font-size="22" fill="#55524C">${esc(SECT[d.sector] || "")}${d.year ? ` · comptes ${esc(d.year)}` : ""}</text>
  <text x="72" y="248" font-family="Inter Tight, Inter, Arial, sans-serif" font-weight="800" font-size="${d.verdict.length > 34 ? 36 : 44}" fill="#111214" letter-spacing="-1">${esc(d.verdict)}</text>
  <text x="540" y="292" font-family="IBM Plex Sans, Arial, sans-serif" font-size="16" fill="#6F6A63">sous la médiane du secteur</text><text x="960" y="292" text-anchor="end" font-family="IBM Plex Sans, Arial, sans-serif" font-size="16" fill="#6F6A63">au-dessus</text>
  ${jauges}
  <text x="72" y="596" font-family="Inter Tight, Inter, Arial, sans-serif" font-weight="800" font-size="30" fill="#111214">bilan<tspan fill="#0E6B4A">.</tspan></text>
  <text x="1128" y="596" text-anchor="end" font-family="IBM Plex Sans, Arial, sans-serif" font-size="18" fill="#6F6A63">Source : comptes officiels · information, pas conseil</text>
</svg>`;
}

if (process.argv[1] && /[\/\\]og\.mjs$/.test(process.argv[1])) {
  const { b, p } = await ouvrir();
  await aller(p, "/entreprise/lvmh", 2500);
  await p.waitForFunction(() => typeof rfAxes === "function" && typeof rfVerdictMots === "function" && typeof R !== "undefined" && R && R.companies && typeof MEDPE === "object" && typeof pxOf === "function", null, { timeout: 60000 });
  const liste = await p.evaluate(({ MAX, ID }) => {
    const FX = (typeof FXR !== "undefined" && FXR) || {}; const capE = c => { const q = pxOf(c); return q && q.cap ? q.cap * (q.cur === "EUR" ? 1 : FX[q.cur] || 1) : 0; };
    const cs = R.companies.filter(c => !c.missing && (ID ? c.id === ID : true)).sort((a, b) => capE(b) - capE(a)).slice(0, ID ? 1 : MAX);
    return cs.map(c => ({ id: c.id, name: c.name, sector: c.sector, year: c.year, verdict: rfVerdictMots(c), axes: rfAxes(c).map(a => ({ t: a.t, word: a.word, p: a.r ? a.r.p : null })) }));
  }, { MAX, ID });
  await b.close();
  // Une carte n'est réécrite que si son contenu change (verdict, positions arrondies au dixième, logo) : le dépôt ne grossit pas chaque semaine
  const idxF = "cf/site/og/index.json", idx = existsSync(idxF) ? JSON.parse(readFileSync(idxF, "utf8")) : { ids: [], h: {} }; idx.h = idx.h || {};
  let n = 0, same = 0; const ids = [];
  for (const d of liste) {
    try {
      const lf = `cf/site/logos/${d.id}.png`; d.logoB64 = existsSync(lf) ? readFileSync(lf).toString("base64") : null;
      const h = [d.name, d.verdict, d.year, d.axes.map(a => `${a.t}:${a.word}:${a.p == null ? "-" : Math.round(a.p * 10)}`).join("|"), d.logoB64 ? d.logoB64.length : 0].join("#");
      if (idx.h[d.id] === h && existsSync(`${OUT}/${d.id}.png`)) { ids.push(d.id); same++; continue; }
      await sharp(Buffer.from(carteSVG(d))).png({ palette: true, colours: 48, compressionLevel: 9, effort: 10 }).toFile(`${OUT}/${d.id}.png`); idx.h[d.id] = h; ids.push(d.id); n++;
    } catch (e) { console.error(d.id, String(e).slice(0, 120)); }
  }
  for (const k of Object.keys(idx.h)) if (!ids.includes(k) && !ID) delete idx.h[k];
  writeFileSync(idxF, JSON.stringify({ maj: new Date().toISOString().slice(0, 10), ids: ID ? [...new Set([...(idx.ids || []), ...ids])] : ids, h: idx.h }));
  console.log(`${n} image(s) de partage écrite(s), ${same} inchangée(s), dans ${OUT} (${liste.length} fiches demandées)`);
}
