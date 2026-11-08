/* Module « outils2 » d'ENKLAIR (vague « refonte » du 29 octobre) : chargé après parcours.js, avant orchestre.js.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Contenu :
   1. Outils communs : courbe SVG à axe de temps (O2_courbe), heures et fuseaux, chargement des séries de référence ;
   2. /outils/recouvrement : recouvrement de 2 à 4 ETF (outilRecouvrement) ;
   3. /outils/si-javais : « Et si j'avais investi ? », une seule courbe (outilSiJavais) ;
   4. /simulateurs[/epargne|frais|pea-cto] : simulateur d'épargne refait (pageSim, simFrais, simEpargne, simPeaCto) ;
   5. /agenda : heures vérifiées (O2_heure, lue par m/agenda4.js, la page Agenda v4) ;
   6. /hier : « Ce qui s'est passé hier » (pageHier).
   Calculs purs dans m/outils2_calc.js (O2C), testés par tests/t_outils2.mjs. */

/* ====================================================================================
   1. Outils communs
   ==================================================================================== */
const O2_C = { ink: "#141414", bleu: "#2B5C9E", vert: "#0E8A5F", orange: "#D94F2B", gris: "#A39C8E", sable: "#C9C3B8" };
const O2_DATA = {};
async function O2_json(u) { if (!(u in O2_DATA)) O2_DATA[u] = getJSON(u, null); return O2_DATA[u]; }
const O2_ref = () => O2_json("/data/hist-ref.json");
const O2_e = (v, d = 0) => v == null || !isFinite(v) ? "–" : (v < 0 ? "−" : "") + nf(d).format(Math.abs(v)) + " €";
const O2_p = (v, d = 1, s = true) => v == null || !isFinite(v) ? "–" : (s && v > 0 ? "+" : v < 0 ? "−" : "") + nf(d).format(Math.abs(v)) + " %";
const O2_MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const O2_moisL = ym => { const [y, m] = ym.split("-"); return MOISL[+m - 1] + " " + y; };
const O2_src = (label, url) => url ? `<a class="lnk" href="${esc(url)}"${url.startsWith("/") ? "" : ` target="_blank" rel="noopener"`}>${esc(label)}</a>` : esc(label);

// Heure d'une source (date, "HH:MM", fuseau IANA) -> instant UTC, puis affichage à l'heure de Paris
function O2_instant(date, hm, tz) {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = hm.split(":").map(Number);
  let t = Date.UTC(y, mo - 1, d, h, mi);
  for (let k = 0; k < 2; k++) { // décalage du fuseau à cet instant (deux passes : changement d'heure)
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
    const vu = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    t += Date.UTC(y, mo - 1, d, h, mi) - vu;
  }
  return new Date(t);
}
const O2_hParis = dt => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(dt).replace(":", " h ");
const O2_jourParis = dt => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(dt);
const O2_TZN = { "Europe/Paris": "heure de Paris", "Europe/London": "heure de Londres", "Europe/Copenhagen": "heure de Copenhague", "America/New_York": "heure de New York", "America/Chicago": "heure de Chicago", "America/Sao_Paulo": "heure de São Paulo" };
const O2_hLoc = (hm, tz) => hm.replace(":", " h ") + " " + (O2_TZN[tz] || tz);

/* Courbe à axe de temps : séries [{ nom, couleur, tirets, pts: [[x, y]] }], x en nombre (années, mois…).
   Infobulle au survol (ou au toucher) qui donne toutes les séries au même x ; légende cliquable pour masquer une série. */
function O2_courbe(el, o) {
  if (!el) return;
  const cache = new Set(o.cache || []);
  const dessine = () => {
    const W = Math.max(280, el.clientWidth || 600), H = o.h || (W < 500 ? 240 : 300), m = { l: W < 500 ? 48 : 62, r: 14, t: 14, b: 30 };
    const vis = o.series.filter(s => !cache.has(s.nom) && s.pts.length);
    const xs = o.series.flatMap(s => s.pts.map(p => p[0])), ys = vis.flatMap(s => s.pts.map(p => p[1])).filter(v => v != null && isFinite(v));
    if (!xs.length) { el.innerHTML = ""; return; }
    let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x1 === x0) x1 = x0 + 1;
    let y0 = o.zero ? Math.min(0, ...ys) : Math.min(...ys), y1 = Math.max(...ys, y0 + 1);
    const pad = (y1 - y0) * 0.08; y1 += pad; if (!o.zero) y0 = Math.max(o.plancher ?? -Infinity, y0 - pad);
    const st = (() => { const r = (y1 - y0) / 4, p = Math.pow(10, Math.floor(Math.log10(r))), n = r / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; })();
    y0 = Math.floor(y0 / st) * st; y1 = Math.ceil(y1 / st) * st;
    const yl = []; for (let v = y0; v <= y1 + st / 2; v += st) yl.push(o.yFmt ? o.yFmt(v, true) : F0.format(v));
    m.l = Math.max(36, Math.ceil(Math.max(...yl.map(t => String(t).length)) * 6.8) + 14);
    const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => m.t + (1 - (y - y0) / (y1 - y0)) * (H - m.t - m.b);
    let g = "";
    for (let v = y0; v <= y1 + st / 2; v += st) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#EFEAE0"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end" class="o2-ax">${esc(o.yFmt ? o.yFmt(v, true) : F0.format(v))}</text>`;
    const ticks = o.xTicks || [...new Set(xs)].map(x => [x, String(x)]);
    // Étiquettes de l'axe : on garde la dernière, et on saute celles qui chevaucheraient la précédente
    const larg = l => String(l).length * 6.8 + 10, tk = [];
    for (let i = ticks.length - 1; i >= 0; i--) { const t = ticks[i]; if (!tk.length || X(tk[0][0]) - X(t[0]) >= (larg(tk[0][1]) + larg(t[1])) / 2) tk.unshift(t); }
    tk.forEach(([x, l], i) => g += `<text x="${X(x)}" y="${H - 8}" text-anchor="${i === 0 && X(x) < m.l + 30 ? "start" : i === tk.length - 1 && X(x) > W - 40 ? "end" : "middle"}" class="o2-ax">${esc(l)}</text>`);
    if (o.refY != null && o.refY >= y0 && o.refY <= y1) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(o.refY)}" y2="${Y(o.refY)}" stroke="#A39C8E" stroke-dasharray="2 3"/>`;
    const lignes = vis.map(s => { const pts = s.pts.filter(p => p[1] != null && isFinite(p[1])); if (!pts.length) return "";
      return `<path d="${pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join("")}" fill="none" stroke="${s.couleur}" stroke-width="${s.epais || 2}" ${s.tirets ? `stroke-dasharray="5 4"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`
        + (s.points ? pts.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" fill="${s.couleur}" stroke="#fff" stroke-width="2"/>`).join("") : ""); }).join("");
    el.innerHTML = `<div class="o2-cw"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.titre || "Courbe")}">${g}${lignes}<line class="o2-cx" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="#141414" stroke-width="1" opacity="0"/><g class="o2-dots"></g><rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent" class="o2-hit"/></svg><div class="o2-tip" hidden></div></div>
      <div class="o2-leg">${o.series.map(s => `<button type="button" data-n="${esc(s.nom)}" class="${cache.has(s.nom) ? "off" : ""}" aria-pressed="${!cache.has(s.nom)}"><i style="${s.tirets ? `background:repeating-linear-gradient(90deg,${s.couleur} 0 5px,transparent 5px 8px)` : `background:${s.couleur}`}"></i>${esc(s.nom)}</button>`).join("")}</div>`;
    const svg = $("svg", el), tip = $(".o2-tip", el), cx = $(".o2-cx", el), dots = $(".o2-dots", el), ux = [...new Set(xs)].sort((a, b) => a - b);
    const montre = ev => { const r = svg.getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left, sx = px * W / r.width;
      const x = ux.reduce((a, b) => Math.abs(X(b) - sx) < Math.abs(X(a) - sx) ? b : a, ux[0]);
      const rows = vis.map(s => [s, (s.pts.find(p => p[0] === x) || [])[1]]).filter(([, v]) => v != null && isFinite(v));
      cx.setAttribute("x1", X(x)); cx.setAttribute("x2", X(x)); cx.setAttribute("opacity", ".25");
      dots.innerHTML = rows.map(([s, v]) => `<circle cx="${X(x)}" cy="${Y(v)}" r="4.5" fill="${s.couleur}" stroke="#fff" stroke-width="2"/>`).join("");
      tip.innerHTML = `<b>${esc(o.tipX ? o.tipX(x) : String(x))}</b>${rows.map(([s, v]) => `<span><i style="background:${s.couleur}"></i>${esc(s.nom)} <em>${esc(o.yFmt ? o.yFmt(v) : F0.format(v))}</em></span>`).join("")}`;
      tip.hidden = !rows.length; const tw = tip.offsetWidth, lx = X(x) * r.width / W; tip.style.left = Math.max(0, Math.min(r.width - tw, lx - tw / 2)) + "px"; };
    const cache_ = () => { tip.hidden = true; cx.setAttribute("opacity", "0"); dots.innerHTML = ""; };
    svg.addEventListener("pointermove", montre); svg.addEventListener("pointerdown", montre); svg.addEventListener("pointerleave", cache_);
    $$(".o2-leg button", el).forEach(b => b.onclick = () => { const n = b.dataset.n; cache.has(n) ? cache.delete(n) : cache.add(n); if (cache.size >= o.series.length) cache.delete(n); dessine(); });
  };
  dessine();
  if (el._o2ro) el._o2ro.disconnect();
  if (window.ResizeObserver) { let w = el.clientWidth; el._o2ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 20) { w = el.clientWidth; dessine(); } }); el._o2ro.observe(el); }
}

/* Petites barres horizontales comparées (une ligne = un libellé, plusieurs valeurs) */
function O2_barres(rows, noms, couleurs, fmt = v => O2_p(v, 1, false)) { // 31/10 (Romain) : une colonne par fonds, barre courte et chiffre côte à côte, au lieu de barres empilées illisibles
  const max = Math.max(1e-9, ...rows.flatMap(r => r.v.filter(x => x != null))), n = noms.length;
  return `<div class="o2-cb" style="--n:${n}"><div class="o2-cbh"><span></span>${noms.map((nm, i) => `<span><i style="background:${couleurs[i]}"></i>${esc(nm)}</span>`).join("")}</div>${rows.map(r => `<div class="o2-cbr"><span class="o2-cbl">${r.href ? `<a class="lnk" href="${r.href}">${esc(r.label)}</a>` : esc(r.label)}</span>${r.v.map((x, i) => `<span class="o2-cbb" title="${esc(noms[i])} : ${esc(x == null ? "absent" : fmt(x))}"><i style="width:${x ? Math.max(2, x / max * 100) : 0}%;background:${couleurs[i]}"></i><b>${x == null ? "–" : esc(fmt(x))}</b></span>`).join("")}</div>`).join("")}</div>`;
}

function O2_css() {
  if ($("#o2-css")) return;
  document.head.insertAdjacentHTML("beforeend", `<style id="o2-css">
.o2-pubs{display:grid;gap:10px;padding:10px 12px 4px}.o2-pubc{background:#fff;border:1px solid var(--rule);border-radius:10px;padding:12px 14px}.o2-pubh{display:flex;justify-content:space-between;align-items:center;gap:10px}.o2-pubh .cell-co{display:inline-flex;align-items:center;gap:8px;min-width:0;color:var(--ink);text-decoration:none}.o2-pubh b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.o2-pubh small{color:var(--grey);font-size:12.5px;white-space:nowrap;flex:none}.o2-pubt{margin:6px 0 8px;font-size:13.5px;color:var(--grey)}.o2-pubf{display:flex;flex-wrap:wrap;gap:8px 18px}.o2-pubf span{display:flex;flex-direction:column;min-width:0}.o2-pubf small{font-size:12px;color:var(--grey)}.o2-pubf b{font-size:16px;font-variant-numeric:tabular-nums}.o2-pubf em{font-style:normal;font-size:12.5px;font-weight:600}.o2-pubf em.up{color:var(--up)}.o2-pubf em.down{color:var(--down)}.o2-publ{margin:10px 0 0;display:flex;gap:16px;font-size:13px}
.o2-cw{position:relative}.o2-cw svg{display:block;width:100%;height:auto;touch-action:pan-y}
.o2-ax{font:11px var(--mono,monospace);fill:#7A756B}
.o2-tip{position:absolute;top:0;z-index:5;background:#fff;border:1px solid #E4DED2;border-radius:10px;box-shadow:0 6px 18px rgba(17,18,20,.12);padding:8px 10px;font-size:12.5px;pointer-events:none;min-width:150px}
.o2-tip b{display:block;margin-bottom:4px}.o2-tip span{display:flex;align-items:center;gap:6px;white-space:nowrap}.o2-tip i{width:10px;height:3px;border-radius:2px;flex:none}.o2-tip em{font-style:normal;margin-left:auto;padding-left:10px;font-family:var(--mono,monospace)}
.o2-leg{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0 0}.o2-leg button{border:0;background:none;font:inherit;font-size:13px;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:4px 0}
.o2-leg button i{width:18px;height:3px;border-radius:2px;flex:none}.o2-leg button.off{color:var(--light);text-decoration:line-through}.o2-leg button.off i{opacity:.3}
.o2-verdict{border:1.5px solid var(--ink);border-radius:14px;padding:16px 18px;margin:0 0 14px;background:#fff}.o2-verdict p{margin:0;font-size:16px;line-height:1.5}.o2-verdict .kick{margin-bottom:6px}
.o2-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.o2-tile{border:1px solid #E4DED2;border-radius:12px;padding:12px 14px;background:#fff}.o2-tile .k{font-size:12px;color:var(--grey);text-transform:uppercase;letter-spacing:.05em}.o2-tile .v{font:600 24px var(--mono,monospace);letter-spacing:-.03em;margin:4px 0 2px}.o2-tile small{color:var(--grey);font-size:12.5px;line-height:1.35;display:block}
.o2-sc{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.o2-sc>div{border:1px solid #E4DED2;border-radius:12px;padding:12px 14px;background:#fff}.o2-sc>div.c{border:1.5px solid var(--ink)}
.o2-sc .k{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--grey);display:flex;align-items:center;gap:6px}.o2-sc .k i{width:14px;height:3px;border-radius:2px}.o2-sc .v{font:600 22px var(--mono,monospace);letter-spacing:-.03em;margin:4px 0}.o2-sc small{display:block;color:var(--grey);font-size:12.5px;line-height:1.4}
@media(max-width:700px){.o2-sc{grid-template-columns:1fr}.o2-tile .v{font-size:19px}}
.o2-hyp{margin:14px 0 0;padding:12px 14px;border-radius:12px;background:#F6F3EC;font-size:13.5px;line-height:1.55}.o2-hyp ul{margin:6px 0 0;padding-left:18px}.o2-hyp li{margin:2px 0}
.o2-lim{font-size:13px;color:var(--grey);line-height:1.55}.o2-lim li{margin:3px 0}
.o2-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px 16px;align-items:start}
.o2-seg{display:inline-flex;border:1.5px solid var(--ink);border-radius:10px;overflow:hidden;flex-wrap:wrap}.o2-seg button{background:#fff;border:0;padding:8px 12px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;color:var(--ink)}.o2-seg button+button{border-left:1.5px solid var(--ink)}.o2-seg button.on{background:var(--ink);color:#fff}
.o2-det{margin-top:12px;border-top:1px solid #EFEAE0;padding-top:10px}.o2-det>summary{cursor:pointer;font-weight:600;font-size:14px;padding:4px 0}.o2-det[open]>summary{margin-bottom:10px}
.o2-cb{display:grid;gap:0}.o2-cbh,.o2-cbr{display:grid;grid-template-columns:minmax(110px,180px) repeat(var(--n),minmax(0,1fr));gap:10px 16px;align-items:center;font-size:13px;padding:7px 0;border-bottom:1px solid var(--rule)}.o2-cbh{font-size:12.5px;color:var(--grey);padding-bottom:6px}.o2-cbh span{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.o2-cbh i{width:10px;height:10px;border-radius:2px;flex:none}.o2-cbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.o2-cbb{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:8px;align-items:center}.o2-cbb i{display:block;height:10px;border-radius:0 4px 4px 0;min-width:0;background-clip:padding-box}.o2-cbb b{font:500 13px var(--sans);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
@media (max-width:600px){.o2-cbh,.o2-cbr{grid-template-columns:minmax(0,1fr);gap:4px}.o2-cbh span:first-child{display:none}.o2-cbh{display:flex;flex-wrap:wrap;gap:4px 14px}.o2-cbl{font-weight:600}}
.o2-keys{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--grey);margin:0 0 10px}.o2-keys i{display:inline-block;width:12px;height:8px;border-radius:2px;margin-right:5px;vertical-align:0}
.o2-row{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:0 0 8px}.o2-row .field{flex:1 1 180px;margin:0;min-width:0}.o2-row .o2-w{flex:0 0 84px}.o2-x{border:1px solid #E4DED2;background:#fff;border-radius:8px;width:38px;height:38px;cursor:pointer;font-size:18px;line-height:1}
.o2-tag{display:inline-block;font-size:11.5px;padding:2px 7px;border-radius:999px;background:#F1EEE6;color:#5C574E;font-weight:600;white-space:nowrap}.o2-tag.ok{background:rgba(14,138,95,.12);color:#0B6B4A}.o2-tag.no{background:rgba(217,79,43,.12);color:#A63A1C}.o2-tag.mu{background:#F1EEE6;color:#7A756B;font-weight:500}
.o2-pts{margin:6px 0 0;padding-left:18px;font-size:13.5px;line-height:1.5}.o2-pts li{margin:2px 0}
.o2-note{font-size:12.5px;color:var(--grey);line-height:1.5;margin:8px 0 0}
.o2-split{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:820px){.o2-split{grid-template-columns:1fr}}
.o2-split h3{font-size:14px;margin:0 0 8px}
</style>`);
}

/* ====================================================================================
   2. Recouvrement de 2 à 4 ETF
   ==================================================================================== */
const O2_RC = ["#141414", "#2B5C9E", "#0E8A5F", "#D94F2B"];
// Secteurs du site (comptes), quand une source ne publie pas les secteurs des fonds
const O2_SECSITE = { tech: "Technologie", finance: "Banque et assurance", sante: "Santé", industrie: "Industrie", conso: "Consommation", energie: "Énergie", materiaux: "Matériaux", telecom: "Télécoms et médias", services: "Services aux collectivités", immo: "Immobilier" };
// Devise principale d'un pays (exposition indirecte : un ETF coté en euros reste exposé aux devises des titres qu'il détient)
const O2_DEV = { US: "USD", JP: "JPY", GB: "GBP", CH: "CHF", CA: "CAD", AU: "AUD", SE: "SEK", DK: "DKK", NO: "NOK", HK: "HKD", CN: "CNY", KR: "KRW", TW: "TWD", IN: "INR", BR: "BRL", SG: "SGD", IL: "ILS", ZA: "ZAR", MX: "MXN", PL: "PLN",
  FR: "EUR", DE: "EUR", NL: "EUR", IT: "EUR", ES: "EUR", BE: "EUR", FI: "EUR", IE: "EUR", AT: "EUR", PT: "EUR", LU: "EUR", GR: "EUR" };
const O2_nomLigne = (isin, noms) => { const c = ISINBY[isin]; if (c) return c.name; const n = noms[isin]; return n ? (typeof ETF_nomLigne === "function" ? ETF_nomLigne({ isin, name: n }) : titleCase(n)) : "Titre " + isin + " (nom non publié)"; };

function O2_rcEtat() {
  const q = new URLSearchParams(location.search), ids = ["a", "b", "c", "d"].map(k => q.get(k)).filter(id => id && ETFBY[id]);
  const w = (q.get("w") || "").split(",").map(Number);
  if (ids.length < 2) {
    const m = ETF.list.find(e => /^MSCI World$/i.test(e.index || "") && e.pea && e.compo) || ETF.list.find(e => /world/i.test(e.index || "")), s = ETF.list.find(e => /^S&P 500$/i.test(e.index || "") && e.compo);
    for (const e of [m, s, ETF.list[0], ETF.list[1]]) if (e && !ids.includes(e.id) && ids.length < 2) ids.push(e.id);
  }
  return { ids, w: ids.map((_, i) => w[i] > 0 ? w[i] : Math.round(100 / ids.length)) };
}
function outilRecouvrement() { return outilRecouvrement4(); } // page construite par m/recouv4.js (3/11/2026)
async function O2_rcCalcul(S) {
  const jeton = S.jeton = {}, E = S.ids.map(id => ETFBY[id]), comps = await Promise.all(E.map(e => etfComp(e)));
  if (jeton !== S.jeton || !$("#o2rr")) return;
  const manque = E.filter((e, i) => !comps[i] || !(comps[i].isins || []).length);
  if ((manque.length || !(S.w.reduce((a, b) => a + b, 0) > 0)) && $("#rct")) $("#rct").textContent = manque.length ? "Composition indisponible." : "Indiquez la part d'au moins un fonds.";
  if (manque.length) { $("#o2rr").innerHTML = `<section class="panel"><div class="pb muted">La composition détaillée n'est pas disponible pour ${manque.map(e => `<b>${esc(e.name)}</b>`).join(", ")}. Elle est relevée chaque mois sur le site de l'émetteur : choisissez un autre fonds sur le même indice.</div></section>`; return; }
  if (!(S.w.reduce((a, b) => a + b, 0) > 0)) { $("#o2rr").innerHTML = `<section class="panel"><div class="pb muted">Indiquez la part d'au moins un fonds.</div></section>`; return; }
  const noms = {}; comps.forEach(c => (c.top || []).forEach(t => { if (t.isin && t.name) noms[t.isin] = noms[t.isin] || t.name; }));
  const emetteur = comps.every(c => (c.sectors || []).length);
  const secteurs = c => { if (emetteur) return c.sectors; const m = {}; let k = 0; for (const [i, w] of c.isins) { const co = ISINBY[i]; if (co && co.sector) { m[co.sector] = (m[co.sector] || 0) + w; k += w; } } return k > 30 ? Object.entries(m).map(([s, w]) => [s, w * 100 / k]) : []; };
  const F = E.map((e, i) => ({ id: e.id, w: S.w[i], isins: comps[i].isins, sectors: secteurs(comps[i]), countries: comps[i].countries || [] }));
  const X = O2C.combine(F), N = E.length, nm = i => E[i].name;
  const paires = []; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) paires.push([i, j, O2C.paire(F[i], F[j])]);
  const p0 = paires.reduce((a, p) => p[2].recouvrement > a[2].recouvrement ? p : a, paires[0]);
  const best = X.seuls.reduce((a, s) => s.nEq > a ? s.nEq : a, 0);
  const ov = p0[2].recouvrement, inclus = paires.filter(([, , p]) => p.partAdansB > 90 || p.partBdansA > 90);
  const verdict = ov >= 60 ? `Ces fonds se ressemblent beaucoup : <b>${O2_p(ov, 0, false)}</b> du portefeuille de ${esc(nm(p0[0]))} se retrouve, avec le même poids, dans ${esc(nm(p0[1]))}. Les détenir ensemble diversifie peu.`
    : ov >= 30 ? `Ces fonds ont une base commune importante (<b>${O2_p(ov, 0, false)}</b> de poids identique entre ${esc(nm(p0[0]))} et ${esc(nm(p0[1]))}), mais chacun apporte aussi des entreprises que l'autre n'a pas.`
    : `Ces fonds sont assez différents : au plus <b>${O2_p(ov, 0, false)}</b> de poids identique entre deux d'entre eux. Ils se complètent plutôt.`;
  const tile = (k, v, s) => `<div class="o2-tile"><div class="k">${k}</div><div class="v">${v}</div><small>${s}</small></div>`;
  const keys = `<div class="o2-keys">${E.map((e, i) => `<span><i style="background:${O2_RC[i]}"></i>${esc(e.name)} (${F0.format(X.parts[i] * 100)} %)</span>`).join("")}<span><i style="background:#9DBF1F"></i>Votre portefeuille combiné</span></div>`;
  const couleurs = [...O2_RC.slice(0, N), "#9DBF1F"], nomsS = [...E.map(e => e.name), "Portefeuille combiné"];
  const top = X.lignes.slice(0, 12).map(l => ({ label: O2_nomLigne(l.isin, noms), href: ISINBY[l.isin] ? "/entreprise/" + ISINBY[l.isin].id : null, v: [...l.par.map(x => x || null), l.w] }));
  const lib = k => emetteur ? (typeof ETF_SECT !== "undefined" && ETF_SECT[k]) || k : O2_SECSITE[k] || k;
  const expo = (cle, nomF, n) => { const cf = cle === "secteurs" ? "sectors" : "countries";
    return X[cle].slice(0, n).map(([k]) => ({ label: nomF(k), v: [...F.map(f => { const x = (f[cf] || []).find(z => z[0] === k); return x ? x[1] : null; }), (X[cle].find(z => z[0] === k) || [])[1]] })); };
  const dev = {}; X.pays.forEach(([c, w]) => { const d = O2_DEV[c] || "autres"; dev[d] = (dev[d] || 0) + w; });
  const devs = Object.entries(dev).sort((a, b) => b[1] - a[1]), horsEur = devs.filter(([d]) => d !== "EUR").reduce((a, [, w]) => a + w, 0);
  const pays1 = X.pays[0], csq = [];
  csq.push(X.doublon > 25 ? `<b>${O2_p(X.doublon, 0, false)}</b> de votre argent est placé dans des entreprises présentes dans au moins deux de vos fonds. Ce n'est pas une erreur en soi, mais ces lignes ne diversifient pas : elles renforcent le poids des mêmes entreprises.`
    : `Seulement <b>${O2_p(X.doublon, 0, false)}</b> de votre argent est placé dans des entreprises présentes dans plusieurs fonds : chaque fonds apporte surtout des titres différents.`);
  inclus.forEach(([i, j, p]) => { const [a, b, x] = p.partAdansB > 90 ? [i, j, p.partAdansB] : [j, i, p.partBdansA];
    csq.push(`Presque tout ${esc(E[a].index || nm(a))} (${O2_p(x, 0, false)} de son poids) se retrouve dans ${esc(E[b].index || nm(b))}. Ajouter ${esc(nm(a))} revient surtout à <b>augmenter le poids</b> de ces entreprises, pas à en ajouter de nouvelles.`); });
  csq.push(`Les 10 plus grosses lignes pèsent <b>${O2_p(X.conc.top10, 0, false)}</b> du portefeuille combiné. ${X.conc.top10 > 25 ? "C'est une concentration forte : quelques entreprises font une grande partie des hausses et des baisses." : "La concentration reste modérée."}`);
  if (pays1 && pays1[1] > 50) csq.push(`${esc(COUNTRY[pays1[0]] || pays1[0])} représente <b>${O2_p(pays1[1], 0, false)}</b> de l'ensemble : votre épargne dépend surtout de l'économie et des marchés de ce pays.`);
  if (horsEur > 20) csq.push(`Environ <b>${O2_p(horsEur, 0, false)}</b> du portefeuille est investi dans des entreprises de pays hors zone euro. Même si vos ETF sont cotés en euros, leur valeur suit aussi le cours des devises (dollar, yen…), sauf pour un fonds « couvert ».`);
  const swap = E.filter(e => e.methode === "swap" || e.replication === "synthétique");
  if (swap.length) csq.push(`${swap.map(e => esc(e.name)).join(", ")} ${swap.length > 1 ? "sont des fonds synthétiques : ils détiennent d'autres titres et reçoivent" : "est un fonds synthétique : il détient d'autres titres et reçoit"} la performance de l'indice par un contrat d'échange. Le calcul porte sur la composition de l'indice suivi, qui est l'exposition réelle.`);
  const sources = E.map((e, i) => { const c = comps[i], s = typeof c.source === "object" && c.source ? c.source : { nom: c.source, url: c.url }, couv = X.seuls[i].couverture;
    return `<li><b>${esc(e.name)}</b> : ${c.niveau === "indice" ? "composition de l'indice suivi" : c.niveau === "panier" ? "panier détenu par le fonds" : c.proxy ? `fonds américain de référence sur le même indice (${esc(c.proxy)})` : "composition du fonds"}, ${F0.format(c.lines || (c.isins || []).length)} lignes${c.asOf ? ` au ${dLabel(c.asOf)}` : ""}, ${O2_p(couv, 0, false)} du fonds identifié ligne à ligne. Source : ${O2_src(s.nom || "émetteur", s.url)}.</li>`; }).join("");
  O2_rcAfficher({ S, E, F, X, N, nm, paires, p0, best, ov, verdict, couleurs, nomsS, top, lib, expo, devs, horsEur, csq, sources, emetteur, comps });
}

/* ====================================================================================
   3. Et si j'avais investi ? Une seule courbe, des séries distinctes, des hypothèses écrites
   ==================================================================================== */
const O2_IDXCUR = { cac40: "EUR", stoxx50: "EUR", dax: "EUR", sp500: "USD", nasdaq100: "USD", ftse100: "GBP", nikkei: "JPY" };
const O2_IDXNOM = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", stoxx600: "Stoxx Europe 600", dax: "DAX", sp500: "S&P 500", nasdaq100: "Nasdaq 100", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
const O2_nomK = k => k.startsWith("i:") ? O2_IDXNOM[k.slice(2)] || k.slice(2) : keyName(k) || k;
const O2_curK = k => { const p = PX[k]; if (p && p.cur) return p.cur; if (k.startsWith("i:")) return O2_IDXCUR[k.slice(2)] || null; if (k.startsWith("e:")) return (ETFBY[k.slice(2)] || {}).devise || null; return null; };
const O2_moinsAns = (iso, a) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(Date.UTC(y - a, m - 1, d)); if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0); return dt.toISOString().slice(0, 10); };
const O2_dCourt = iso => { const [y, m] = iso.split("-"); return O2_MOIS[+m - 1] + " " + y; };
// Unités de devise pour 1 € : moyenne mensuelle BCE pour le passé, taux BCE du jour pour aujourd'hui
function O2_fx(ref, cur, iso, auj) {
  if (!cur || cur === "EUR") return 1;
  if (auj && typeof FX !== "undefined" && FX && FX[cur]) return 1 / FX[cur];
  const m = ref && ref.fx && ref.fx.mois, k = m && O2C.moisProche(m, iso);
  return k && m[k][cur] ? m[k][cur] : null;
}
function outilSiJavais() { return outilSiJavais4(); } // page construite par m/sijavais4.js (3/11/2026)
// Série d'un titre : points aux dates relevées (il y a 5, 3, 1 an, aujourd'hui), en euros
// 7/11 : ETF sans cours passés dans les feuilles Google : série officielle de l'émetteur (cf/site/data/etf-hist/<id>.json,
// valeur liquidative ajustée des dividendes, en euros, une valeur par semaine ; robot etf-hist.yml), chargée par sj4Hist (sijavais4.js)
const O2_ETFH = {};
function O2_sjEtfHist(k, S, Hs, frais) {
  const s = (Hs.s || []).filter(x => x && x[1] > 0), der = s[s.length - 1];
  if (!der && Hs.perf && Hs.asOf && (!Hs.devise || Hs.devise === "EUR")) { // HSBC : seulement les performances officielles de fin de mois (fiche mensuelle)
    const P = Hs.perf, g = { 1: P.a1, 3: P.a3, 5: P.a5 }; if (g[S.ans] == null) return { k, err: `pas de performance publiée sur ${S.ans} an${S.ans > 1 ? "s" : ""}` };
    const net = Math.max(0, S.amt - frais), fin = net * (1 + g[S.ans]);
    const pts = [5, 3, 1, 0].filter(a => a <= S.ans).map(a => [-a, a === S.ans ? net : a === 0 ? fin : g[a] != null ? fin / (1 + g[a]) : null]);
    return { k, nom: O2_nomK(k), cur: "EUR", pts, div: null, parts: net, net, frais, depart: 1, base: Hs.asOf, finDate: Hs.asOf, hist: { src: Hs.src || "émetteur", asOf: Hs.asOf, debut: O2_moinsAns(Hs.asOf, S.ans), mensuel: true } };
  }
  if (!der || (Hs.devise && Hs.devise !== "EUR")) return null;
  const at = d => { let b = null; for (const x of s) { if (x[0] > d) break; b = x; } return b && (Date.parse(d) - Date.parse(b[0])) / 864e5 <= 10 ? b : null; };
  const champs = [5, 3, 1, 0].filter(a => a <= S.ans), x0 = at(O2_moinsAns(der[0], S.ans));
  if (!x0) return { k, err: `pas de valeur il y a ${S.ans} an${S.ans > 1 ? "s" : ""} (série de l'émetteur depuis le ${dLabel(s[0][0])})` };
  const net = Math.max(0, S.amt - frais), parts = net / x0[1];
  const pts = champs.map(a => { const x = a === 0 ? der : at(O2_moinsAns(der[0], a)); return [-a, x ? parts * x[1] : null]; });
  return { k, nom: O2_nomK(k), cur: "EUR", pts, div: null, parts, net, frais, depart: x0[1], base: der[0], hist: { src: Hs.src || "émetteur", asOf: der[0], debut: x0[0], sansDiv: !!Hs.sansDiv } };
}
function O2_sjSerie(k, S, ref, H, frais) {
  const p = PX[k], cur = O2_curK(k);
  const champs = [[5, "p5y"], [3, "p3y"], [1, "p1y"], [0, "p"]].filter(([a]) => a <= S.ans), deb = O2_moinsAns(TODAY, S.ans);
  if (k.startsWith("e:") && O2_ETFH[k] && !(p && p[champs[0][1]] > 0)) { const r = O2_sjEtfHist(k, S, O2_ETFH[k], frais); if (r) return r; }
  if (!p || !(p.p > 0)) return { k, err: "pas de cours" };
  const base = p.dp && p.dp < TODAY ? p.dp : TODAY; // 7/11 : cours passés repris de la mémoire du robot : ils datent du jour p.dp, pas d'aujourd'hui
  if (!(p[champs[0][1]] > 0)) return { k, err: `pas de cours il y a ${S.ans} an${S.ans > 1 ? "s" : ""}` };
  const fx0 = O2_fx(ref, cur, O2_moinsAns(base, S.ans)); if (fx0 == null) return { k, err: "taux de change historique indisponible" };
  const net = Math.max(0, S.amt - frais), parts = net * fx0 / p[champs[0][1]];
  const pts = champs.filter(([, f]) => p[f] > 0).map(([a, f]) => { const fx = O2_fx(ref, cur, a === 0 ? TODAY : O2_moinsAns(base, a), a === 0); return [-a, fx ? parts * p[f] / fx : null]; });
  // Dividendes perçus (actions) : dividende par action publié de chaque exercice, supposé versé le 1er juin de l'année suivante
  let div = null; const c = k.startsWith("c:") ? RBY[k.slice(2)] : null, h = c && H && H.h && H.h[c.id];
  if (h && h.d && h.d.some(x => x > 0) && c.currency === cur) {
    const fy = h.d.map((x, i) => [h.y + i, x]), cumul = iso => fy.filter(([y, x]) => x > 0 && `${y + 1}-06-01` > deb && `${y + 1}-06-01` <= iso).reduce((s, [, x]) => s + x, 0);
    div = pts.map(([x, val]) => { const iso = O2_moinsAns(TODAY, -x), fx = O2_fx(ref, cur, iso, x === 0); return [x, val != null && fx ? val + parts * cumul(iso) / fx : null]; });
    const exos = fy.filter(([y, x]) => x > 0 && `${y + 1}-06-01` > deb && `${y + 1}-06-01` <= TODAY).map(([y]) => y);
    div.exos = exos; if (!exos.length) div = null;
  }
  return { k, nom: O2_nomK(k), cur, pts, div, parts, net, frais, depart: p[champs[0][1]], base };
}

/* ====================================================================================
   4. Simulateur d'épargne : versements, frais détaillés et modifiables, fiscalité 2026, trois scénarios historiques
   ==================================================================================== */
const O2_BCE2 = ["Banque centrale européenne, objectif d'inflation de 2 % à moyen terme", "https://www.ecb.europa.eu/mopo/strategy/pricestab/html/index.fr.html"];
function O2_terMedian() {
  const l = ETF.list.filter(e => e.categorie === "actions-monde" && e.pea && e.ter > 0).map(e => e.ter);
  return l.length >= 3 ? { v: median(l), n: l.length } : { v: 0.2, n: 0 };
}
function pageSim(tool) { return pageSim4(tool); } // page construite par m/simulateur4.js (3/11/2026)
// Paramètres de O2C.simule pour un courtier donné
function O2_simParams(S, b, rendement, env) {
  const ordre = (m, type) => type === "versement" && S.plan && b.plan != null && S.ord === 12 ? b.plan : brokerFee(b, m, S.perso);
  return { initial: S.ini, mensuel: S.men, annees: S.ans, rendement, ter: S.ter / 100, fraisOrdre: ordre, ordresParAn: S.ord, change: S.chg / 100, enveloppe: env || S.env, taux: RATES, inflation: S.reel ? S.infl / 100 : 0, vente: S.vente };
}

/* ====================================================================================
   5. Agenda : heure vérifiée ou « non communiquée », type, attentes, chiffres publiés
   ==================================================================================== */
const O2_JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const O2_US = tz => /^America\/(New_York|Chicago)/.test(tz || "");
// Heure d'un événement d'agenda : seulement ce que la source officielle donne (champ h, voir data/agenda/heures.mjs)
function O2_heure(e) {
  const h = e.h; if (!h) return { court: "Heure non communiquée", txt: "", ok: false };
  const lien = h.src ? ` <a class="lnk" href="${esc(h.src)}" target="_blank" rel="noopener">source</a>` : "";
  const loc = (hm, tz) => tz && tz !== "Europe/Paris" ? `, soit ${O2_hLoc(hm, tz)}` : "";
  const jour = dt => O2_jourParis(dt) !== e.date ? " (le lendemain, heure de Paris)" : "";
  if (h.pub) { const dt = O2_instant(e.date, h.pub, h.tz), pre = h.env ? h.env + " " : "";
    return { ok: true, court: pre + O2_hParis(dt), txt: `Publication annoncée par la société${h.env ? ` (${esc(h.env)})` : ""} : ${pre}${O2_hParis(dt)} à Paris${loc(h.pub, h.tz)}${jour(dt)}.${h.conf ? ` Conférence à ${O2_hParis(O2_instant(e.date, h.conf, h.tz))}.` : ""}${lien}` }; }
  if (h.cal) { const dt = O2_instant(e.date, h.cal, h.tz);
    return { ok: true, court: O2_hParis(dt), txt: `Horaire indiqué par le calendrier financier officiel : ${O2_hParis(dt)} à Paris${loc(h.cal, h.tz)}${jour(dt)}, sans préciser s'il s'agit du communiqué ou de la présentation.${lien}` }; }
  const m = h.moment === "avant-ouverture" ? (O2_US(h.tz) ? "Avant l'ouverture de Wall Street" : "Avant l'ouverture de la Bourse") : h.moment === "apres-cloture" ? (O2_US(h.tz) ? "Après la clôture de Wall Street" : "Après la clôture de la Bourse") : null;
  const conf = h.conf ? `Conférence ou webcast à ${O2_hParis(O2_instant(e.date, h.conf, h.tz))} à Paris${loc(h.conf, h.tz)}.` : "";
  return { ok: !!m, court: m ? m.replace("Avant l'ouverture de", "Avant").replace("Après la clôture de", "Après") : "Heure non communiquée", txt: `${m ? m + " : heure exacte non communiquée." : "Heure de publication non communiquée."} ${conf}${lien}` };
}

/* ====================================================================================
   6. Ce qui s'est passé hier : résultats publiés la veille, à partir des communiqués officiels collectés
   ==================================================================================== */
const O2_H = { max: 20 };
const O2_jourIso = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function O2_veille(iso) { let d = O2_jourIso(iso, -1); while ([0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay())) d = O2_jourIso(d, -1); return d; }
const O2_jourL = iso => { const d = new Date(iso + "T12:00:00Z"); return ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()] + " " + dLabel(iso); };
// Variation entre parenthèses dans un chiffre extrait : « 5,1 Md€ (+18 %) » -> 18
const O2_var = s => { const m = String(s).replace(/[  ]/g, " ").match(/\(\s*([+−-])\s?([\d ]+(?:,\d+)?)\s?%/); return m ? (m[1] === "+" ? 1 : -1) * parseFloat(m[2].replace(/ /g, "").replace(",", ".")) : null; };
const O2_RE = { ca: /ventes|chiffre d.affaires|revenus?\b|produit net bancaire|primes|revenue/i, res: /résultat|bénéfice|perte|ebitda|ebit\b|marge opérationnelle/i, prev: /objectif|prévision|perspective|guidance|outlook|confirme|relève|abaisse|rehausse|réitère|attend|expects?|forecast|reaffirm|raise|lower/i };
// Lecture d'une publication : chiffres classés, points positifs / négatifs / risques, prévisions et commentaires
function O2_lecture(g, ana) {
  const f = g.f, ca = f.filter(([l]) => O2_RE.ca.test(l) && !O2_RE.res.test(l)), res = f.filter(([l]) => O2_RE.res.test(l)), aut = f.filter(x => !ca.includes(x) && !res.includes(x));
  const pos = [], neg = [], risq = [], vars = [];
  for (const [l, val] of f) { const x = O2_var(val); if (x == null) continue; vars.push(x); 
    if (x > 1) pos.push(`${l.replace(/ du trimestre| du semestre/i, "")} en hausse (${O2_p(x, Math.abs(x) < 10 ? 1 : 0)})`); else if (x < -1) neg.push(`${l.replace(/ du trimestre| du semestre/i, "")} en baisse (${O2_p(x, Math.abs(x) < 10 ? 1 : 0)})`); }
  for (const [l, val] of res) if (/^[−-]/.test(String(val).trim()) || /perte/i.test(l)) risq.push(`${l} négatif : l'entreprise perd de l'argent sur la période`);
  const lec = [...(g.r || []), ...((ana && ana.lecture) || [])].filter(x => !/^Le communiqué publié|rapport détaillé suit/i.test(x));
  for (const s of new Set(lec)) { if (/coûts pèsent|ralentit|recule|dégrad/i.test(s)) risq.push(s.replace(/\.$/, "")); else if (/accélère|chaque vente rapporte davantage|confirme ses objectifs|relève/i.test(s)) pos.push(s.replace(/\.$/, "")); else if (/abaisse/i.test(s)) neg.push(s.replace(/\.$/, "")); }
  const prev = [...new Set([...lec.filter(s => O2_RE.prev.test(s)), ...((ana && ana.extraits) || []).filter(s => O2_RE.prev.test(s))])].slice(0, 3);
  const extraits = ((ana && ana.extraits) || []).filter(s => !prev.includes(s)).slice(0, 2);
  const nv = vars.length, nP = vars.filter(x => x > 1).length, nN = vars.filter(x => x < -1).length;
  const bilan = nv < 2 ? null : nP >= 2 && !nN && !risq.length ? "Plutôt positifs" : nN >= 2 && !nP ? "Plutôt négatifs" : "Contrastés";
  const manque = [!ca.length && "chiffre d'affaires", !res.length && "résultat (opérationnel ou net)"].filter(Boolean);
  return { ca, res, aut, pos: [...new Set(pos)], neg: [...new Set(neg)], risq: [...new Set(risq)], prev, extraits, bilan, nv, manque, vca: ca.map(([, x]) => O2_var(x)).find(x => x != null) };
}
async function pageHier() {
  O2_css(); setNav("news");
  const q = new URLSearchParams(location.search), auj = O2_jourParis(new Date());
  const d = /^\d{4}-\d{2}-\d{2}$/.test(q.get("d") || "") && q.get("d") < auj ? q.get("d") : O2_veille(auj);
  setTitle(d === O2_veille(auj) ? "Ce qui s'est passé hier" : "Résultats publiés le " + dLabel(d));
  const prec = O2_veille(d), suiv = (() => { let x = O2_jourIso(d, 1); while ([0, 6].includes(new Date(x + "T12:00:00Z").getUTCDay())) x = O2_jourIso(x, 1); return x < auj ? x : null; })();
  app.innerHTML = `<div class="crumbs"><a href="/actualites">Actualités</a> › Ce qui s'est passé hier</div><h1 class="pagetitle">Ce qui s'est passé hier</h1>
    <p class="pagesub">Les résultats publiés ${d === O2_veille(auj) ? "lors de la dernière séance" : "ce jour-là"} par les entreprises suivies : les chiffres du communiqué officiel, ce que la direction annonce pour la suite, et une lecture calculée, sans conclure sur un seul chiffre.</p>
    <div class="o2-hnav"><a class="pill" href="/hier?d=${prec}">← ${esc(O2_jourL(prec))}</a><b>${esc(O2_jourL(d).replace(/^./, c => c.toUpperCase()))}</b>${suiv ? `<a class="pill" href="/hier?d=${suiv}">${esc(O2_jourL(suiv))} →</a>` : "<span></span>"}</div>
    <div id="o2h"><section class="panel"><div class="pb muted">Lecture des communiqués…</div></section></div>`;
  const fichiers = await Promise.all([O2_jourIso(d, -1), d, O2_jourIso(d, 1)].map(x => O2_json(`/data/actu/j/${x}.json`)));
  if (!$("#o2h")) return;
  const vus = new Set(), items = fichiers.flatMap(j => (j && j.o) || []).filter(x => x.c === "resultats" && RBY[x.id] && O2_jourParis(new Date(x.d)) === d && !vus.has(x.k) && vus.add(x.k));
  const G = {}; for (const x of items) { const g = G[x.id] = G[x.id] || { id: x.id, docs: [] }; g.docs.push(x); }
  const groupes = Object.values(G).map(g => { g.docs.sort((a, b) => (b.f || []).length - (a.f || []).length || (b.i || 0) - (a.i || 0)); const m = g.docs[0], vusL = new Set(), f = [];
    g.docs.forEach(x => (x.f || []).forEach(([l, v_]) => { if (!vusL.has(l)) { vusL.add(l); f.push([l, v_]); } }));
    return { ...g, main: m, f, r: [...new Set(g.docs.flatMap(x => x.r || []))], t: Math.min(...g.docs.map(x => Date.parse(x.d))), co: RBY[g.id] }; })
    .sort((a, b) => caEur(b.co) - caEur(a.co));
  if (!groupes.length) { $("#o2h").innerHTML = `<section class="panel"><div class="pb"><div class="empty">Aucune publication de résultats repérée ce jour-là dans les sources officielles suivies (AMF, SEC, Nasdaq Nordic, Oslo Børs, FCA).</div><p class="o2-note">Les prochaines dates sont dans l'<a class="lnk" href="/agenda">agenda</a>.</p></div></section>`; return; }
  const S = { zone: "tout", q: "", max: O2_H.max };
  const ana = O2_json("/data/actu-analyse.json");
  const dessine = async () => {
    const A = ((await ana) || {}).items || {};
    const L = groupes.map(g => ({ g, l: O2_lecture(g, g.docs.map(x => A[x.u]).find(Boolean)) }));
    O2_H.groupes = Object.fromEntries(L.map(({ g, l }) => [g.id, { ...g, l }]));
    const zones = { tout: () => true, FR: g => g.co.region === "FR", EU: g => g.co.region === "EU", US: g => g.co.region === "US", MONDE: g => g.co.region === "MONDE" };
    const liste = L.filter(({ g }) => zones[S.zone](g) && (!S.q || norm(g.co.name).includes(norm(S.q))));
    const avecV = L.filter(x => x.l.vca != null), up = avecV.filter(x => x.l.vca > 1).length, dn = avecV.filter(x => x.l.vca < -1).length;
    const nb = z => L.filter(({ g }) => zones[z](g)).length;
    $("#o2h").innerHTML = `<section class="panel"><div class="pb"><div class="o2-verdict"><p class="kick">En bref</p><p><b>${F0.format(groupes.length)} entreprise${groupes.length > 1 ? "s" : ""}</b> suivie${groupes.length > 1 ? "s" : ""} ${groupes.length > 1 ? "ont" : "a"} publié des résultats (${["FR", "EU", "US", "MONDE"].map(z => [z, nb(z)]).filter(([, n]) => n).map(([z, n]) => `${n} ${{ FR: "en France", EU: "ailleurs en Europe", US: "aux États-Unis", MONDE: "dans le reste du monde" }[z]}`).join(", ")}).${avecV.length ? ` Parmi les ${F0.format(avecV.length)} qui donnent l'évolution de leurs ventes sur un an, ${F0.format(up)} sont en hausse et ${F0.format(dn)} en baisse.` : ""}</p>
        <p class="o2-note">Chiffres extraits automatiquement des communiqués officiels : vérifiez-les dans le communiqué (lien sur chaque fiche). Attentes des analystes : aucune estimation n'est affichée, faute de source de consensus fiable et autorisée.</p></div>
      <div class="tbx-bar" style="padding:4px 0 0"><div class="o2-seg" id="o2hz">${[["tout", "Toutes"], ["FR", "France"], ["EU", "Europe"], ["US", "États-Unis"], ["MONDE", "Autres"]].filter(([z]) => z === "tout" || nb(z)).map(([z, l]) => `<button type="button" data-v="${z}" class="${S.zone === z ? "on" : ""}">${l} <span class="light">${nb(z)}</span></button>`).join("")}</div>
        <div class="field" style="margin:0;min-width:200px"><input id="o2hq" type="search" placeholder="Chercher une entreprise" aria-label="Chercher une entreprise" value="${esc(S.q)}"></div></div></div></section>
      <div id="o2hl">${liste.slice(0, S.max).map(O2_hCarte).join("") || `<section class="panel"><div class="pb muted">Aucune entreprise ne correspond.</div></section>`}</div>
      ${liste.length > S.max ? `<div style="text-align:center;margin:14px 0"><button class="btn" type="button" id="o2hm">Voir ${Math.min(20, liste.length - S.max)} de plus (${F0.format(liste.length - S.max)} restantes)</button></div>` : ""}
      <div class="src">Sources : annonces réglementées déposées à l'AMF (Info-financière, DILA), à la SEC (8-K, 10-Q, 6-K), sur Nasdaq Nordic, Oslo Børs et au registre britannique (FCA), collectées par le site. Heures de publication : heure du dépôt, à l'heure de Paris. Classement : par taille de l'entreprise (chiffre d'affaires annuel).</div>`;
    $("#o2hz").onclick = e => { const b = e.target.closest("button"); if (b) { S.zone = b.dataset.v; S.max = O2_H.max; dessine(); } };
    const qi = $("#o2hq"); let t = null; qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { S.q = qi.value.trim(); S.max = O2_H.max; dessine().then(() => { const n = $("#o2hq"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); }, 250); };
    const m = $("#o2hm"); if (m) m.onclick = () => { S.max += 20; dessine(); };
    $$("#o2hl [data-ia]").forEach(b => b.onclick = () => O2_hIA(b));
    if (location.hash && !S.scrolled) { S.scrolled = true; const c = document.getElementById(location.hash.slice(1)); if (c) c.scrollIntoView({ block: "start" }); }
  };
  await dessine();
}
function O2_hCarte({ g, l }) {
  const co = g.co, m = g.main, dt = new Date(g.t), chif = (titre, rows) => rows.length ? `<div><p class="kick" style="margin:0 0 4px">${titre}</p>${rows.map(([a, b]) => `<div class="o2-hf"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>` : "";
  const pts = (t, arr, cls) => arr.length ? `<div class="o2-hp ${cls}"><b>${t}</b><ul>${arr.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  return `<section class="panel o2-hc" id="h-${g.id}"><div class="pb">
    <div class="o2-hh"><a class="cell-co" href="/entreprise/${g.id}/actualite">${logo(co, 34)}<span><b>${esc(co.name)}</b><span class="sub" style="display:block">${esc(regName(co))} · ${esc(secName(co))}</span></span></a>
      <div class="o2-hm"><span>${esc(m.tf || "Résultats")}</span><small>publié à ${O2_hParis(dt)} (heure de Paris)</small></div></div>
    <div class="o2-hg">${chif("Chiffre d'affaires", l.ca)}${chif("Résultat", l.res)}${chif("Autres indicateurs", l.aut)}</div>
    ${l.manque.length ? `<p class="o2-note">Non extrait automatiquement : ${l.manque.join(" et ")}. Il figure peut-être dans le communiqué.</p>` : ""}
    <p class="o2-note"><span class="o2-tag mu">Attentes des analystes</span> Pas d'estimation disponible : impossible de dire si ces chiffres sont meilleurs ou moins bons que prévu.</p>
    ${l.prev.length ? `<div class="o2-hq"><b>Prévisions et commentaires de la direction</b>${l.prev.map(s => `<blockquote>${esc(s)}</blockquote>`).join("")}</div>` : `<p class="o2-note">Aucune prévision ni commentaire de la direction n'a été extrait automatiquement de ce communiqué.</p>`}
    ${l.extraits.length ? `<details class="o2-det"><summary>Autres passages du communiqué</summary>${l.extraits.map(s => `<blockquote class="o2-bq">${esc(s)}</blockquote>`).join("")}</details>` : ""}
    <div class="o2-hs"><p class="kick" style="margin:0 0 6px">Synthèse calculée${l.bilan ? ` : <b>${l.bilan.toLowerCase()}</b>` : ""}</p>
      ${l.bilan ? `<div class="o2-hpg">${pts("Points positifs", l.pos, "p")}${pts("Points négatifs", l.neg, "n")}${pts("Risques à surveiller", l.risq, "r")}</div>` : `<p class="o2-note" style="margin:0">Trop peu de chiffres comparables (${l.nv} évolution${l.nv > 1 ? "s" : ""} sur un an) pour une synthèse : un seul indicateur ne suffit pas à juger une publication.${l.risq.length ? " À surveiller : " + esc(l.risq.join(" ; ")) + "." : ""}</p>`}</div>
    <div class="o2-ha"><a class="lnk" href="${esc(m.u)}" target="_blank" rel="noopener">Lire le communiqué officiel</a>${g.docs.length > 1 ? `<span class="light">${g.docs.length} documents publiés</span>` : ""}${(m.i || 0) >= 2 ? `<button type="button" class="btn" data-ia="${esc(g.id)}|${esc(m.k)}">✦ Synthèse approfondie par l'IA</button>` : ""}</div>
    <div class="o2-hia" hidden></div></div></section>`;
}
// Synthèse approfondie : rédigée par l'IA connectée du visiteur (m/monia.js, tâche « annonce »), à partir des seuls faits du communiqué
async function O2_hIA(b) {
  const [id, k] = b.dataset.ia.split("|"), out = b.closest(".pb").querySelector(".o2-hia"), g = O2_H.groupes && O2_H.groupes[id];
  out.hidden = false;
  if (typeof iaRediger !== "function" || (typeof miaConnectee === "function" && !miaConnectee())) { b.remove(); out.innerHTML = typeof miaInvite === "function" ? miaInvite("Les chiffres et la lecture ci-dessus sont calculés sans IA.") : `<p class="muted">IA indisponible.</p>`; return; }
  b.disabled = true; out.innerHTML = `<div class="iathink"><span></span><span></span><span></span> L'IA lit les faits extraits du communiqué…</div>`;
  const co = RBY[id], m = g ? g.main : null;
  const faits = { entreprise: co ? co.name : id, secteur: co ? secName(co) : null, activite: co && co.fiche ? co.fiche.fait : co ? co.desc : null, type: m ? m.tf : "Résultats", titre_officiel: m ? m.t : null, date: m ? String(m.d).slice(0, 10) : null,
    chiffres: g ? g.f : [], lecture_calculee: g ? g.r : [], prevision_et_commentaires: g && g.l ? g.l.prev : [], extraits: g && g.l ? g.l.extraits : [], attentes_des_analystes: "non disponibles", dernier_exercice: co && co.ca != null ? { ventes_millions: co.ca, devise: co.currency } : null, lien: m ? m.u : null };
  let j; try { j = await iaRediger("annonce", faits, { max: 420 }); } catch (e) { j = { error: "L'IA est indisponible pour le moment." }; }
  b.remove();
  const x = j && j.txt ? (typeof jsonFrom === "function" ? jsonFrom(j.txt) : null) : null;
  out.innerHTML = x && x.clair ? `<p><b>En clair :</b> ${esc(x.clair)}</p>${x.change ? `<p><b>Ce que cela change :</b> ${esc(x.change)}</p>` : ""}<p class="o2-note">Rédigé par l'IA d'ENKLAIR (${esc(j.modele || "modèle choisi")}) à partir des seuls faits extraits du communiqué. Le communiqué fait foi ; ce n'est pas un conseil.</p>`
    : typeof miaRendu === "function" ? miaRendu(j) : `<p class="muted">${esc((j && j.error) || "Synthèse indisponible.")}</p>`;
}
ROUTES_EXTRA.push([/^\/hier$/, () => pageHier()]);
/* styles : voir site.css */
