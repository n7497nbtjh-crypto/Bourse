/* Module « outils2 » de bilan. (vague « refonte » du 29 octobre) : chargé après parcours.js, avant orchestre.js.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Contenu :
   1. Outils communs : courbe SVG à axe de temps (O2_courbe), heures et fuseaux, chargement des séries de référence ;
   2. /outils/recouvrement : recouvrement de 2 à 4 ETF (outilRecouvrement) ;
   3. /outils/si-javais : « Et si j'avais investi ? », une seule courbe (outilSiJavais) ;
   4. /simulateurs[/epargne|frais|pea-cto] : simulateur d'épargne refait (pageSim, simFrais, simEpargne, simPeaCto) ;
   5. /agenda : heures vérifiées, chiffres publiés (pageAgenda, remplace celle de m/tableaux.js) ;
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
function O2_barres(rows, noms, couleurs, fmt = v => O2_p(v, 1, false)) {
  const max = Math.max(1e-9, ...rows.flatMap(r => r.v.filter(x => x != null)));
  return `<div class="o2-cb">${rows.map(r => `<div class="o2-cbr"><span class="o2-cbl">${r.href ? `<a class="lnk" href="${r.href}">${esc(r.label)}</a>` : esc(r.label)}</span><span class="o2-cbv">${r.v.map((x, i) => `<span class="o2-cbb" title="${esc(noms[i])} : ${esc(x == null ? "absent" : fmt(x))}"><i style="width:${x ? Math.max(1.5, x / max * 100) : 0}%;background:${couleurs[i]}"></i><b>${x == null ? "–" : fmt(x)}</b></span>`).join("")}</span></div>`).join("")}</div>`;
}

function O2_css() {
  if ($("#o2-css")) return;
  document.head.insertAdjacentHTML("beforeend", `<style id="o2-css">
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
.o2-cb{display:grid;gap:6px}.o2-cbr{display:grid;grid-template-columns:minmax(110px,190px) 1fr;gap:10px;align-items:center;font-size:13px}.o2-cbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.o2-cbv{display:grid;gap:2px}.o2-cbb{display:grid;grid-template-columns:1fr 54px;gap:6px;align-items:center}.o2-cbb i{display:block;height:8px;border-radius:0 4px 4px 0;min-width:0}.o2-cbb b{font:500 12px var(--mono,monospace);text-align:right}
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
async function outilRecouvrement() {
  O2_css(); setTitle("Recouvrement des ETF"); setNav("sim");
  const S = O2_rcEtat();
  const trouve = re => ETF.list.find(e => re.test(e.index || "") && e.compo && e.pea) || ETF.list.find(e => re.test(e.index || "") && e.compo) || ETF.list.find(e => re.test(e.index || ""));
  const presets = [["Monde + S&P 500", /^MSCI World$/i, /^S&P 500$/i], ["Monde + Nasdaq 100", /^MSCI World$/i, /^Nasdaq.?100$/i], ["Monde + Europe", /^MSCI World$/i, /^(MSCI Europe|Stoxx Europe 600)$/i], ["CAC 40 + Euro Stoxx 50", /^CAC 40$/i, /^Euro Stoxx 50$/i]]
    .map(([l, a, b]) => { const ea = trouve(a), eb = trouve(b); return ea && eb ? [l, ea.id, eb.id] : null; }).filter(Boolean);
  app.innerHTML = `<div class="crumbs"><a href="/outils">Outils</a> › Recouvrement des ETF</div><h1 class="pagetitle">Mes ETF se recouvrent-ils ?</h1>
    <p class="pagesub">Beaucoup d'ETF contiennent les mêmes grandes entreprises. Choisissez 2 à 4 fonds et la part de chacun : le site ouvre leurs compositions officielles et calcule ce que vous détenez vraiment.</p>
    <section class="panel"><div class="pb"><div id="o2rl"></div>
      <div style="display:flex;gap:8px 10px;flex-wrap:wrap;align-items:center;margin-top:6px"><button type="button" class="linkbtn" id="o2radd">+ Ajouter un ETF</button><span class="light" style="font-size:12.5px">Exemples :</span>${presets.map(([l, a, b]) => `<button type="button" class="chip" data-a="${a}" data-b="${b}">${esc(l)}</button>`).join("")}</div></div></section>
    <div id="o2rr"><div class="pb muted">Lecture des compositions…</div></div>`;
  const lignes = () => {
    $("#o2rl").innerHTML = S.ids.map((id, i) => `<div class="o2-row">${pickerHTML("o2rq" + i, `ETF n° ${i + 1}`)}<div class="field o2-w"><label for="o2rw${i}">Part (%)</label><input id="o2rw${i}" type="number" inputmode="decimal" min="0" max="100" step="5" value="${S.w[i]}"></div>${S.ids.length > 2 ? `<button type="button" class="o2-x" data-x="${i}" aria-label="Retirer ce fonds">×</button>` : ""}</div>`).join("");
    S.ids.forEach((id, i) => {
      $("#o2rq" + i).value = ETFBY[id].name; bindPicker("o2rq" + i, k => { S.ids[i] = k.slice(2); maj(); }, true);
      $("#o2rw" + i).oninput = () => { S.w[i] = Math.max(0, parseFloat(String($("#o2rw" + i).value).replace(",", ".")) || 0); clearTimeout(S.t); S.t = setTimeout(maj, 250, false); };
    });
    $$("#o2rl [data-x]").forEach(b => b.onclick = () => { const i = +b.dataset.x; S.ids.splice(i, 1); S.w.splice(i, 1); maj(); });
    $("#o2radd").hidden = S.ids.length >= 4;
  };
  const maj = (redessine = true) => {
    const q = new URLSearchParams(); S.ids.forEach((id, i) => q.set("abcd"[i], id)); q.set("w", S.w.join(","));
    history.replaceState({}, "", "/outils/recouvrement?" + q); if (redessine) lignes(); O2_rcCalcul(S);
  };
  $("#o2radd").onclick = () => { const e = ETF.list.find(x => x.compo && !S.ids.includes(x.id) && /Emerging|Europe/i.test(x.index || "")) || ETF.list.find(x => !S.ids.includes(x.id)); if (!e) return; S.ids.push(e.id); S.w = S.ids.map(() => Math.round(100 / S.ids.length)); maj(); };
  $$("#app .chip[data-a]").forEach(b => b.onclick = () => { S.ids = [b.dataset.a, b.dataset.b]; S.w = [50, 50]; maj(); });
  lignes(); O2_rcCalcul(S);
}
async function O2_rcCalcul(S) {
  const jeton = S.jeton = {}, E = S.ids.map(id => ETFBY[id]), comps = await Promise.all(E.map(e => etfComp(e)));
  if (jeton !== S.jeton || !$("#o2rr")) return;
  const manque = E.filter((e, i) => !comps[i] || !(comps[i].isins || []).length);
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
  $("#o2rr").innerHTML = `<section class="panel"><div class="pb">
      <div class="o2-verdict"><p class="kick">En bref</p><p>${verdict}</p></div>
      <div class="o2-tiles">${tile("Poids réellement en double", O2_p(X.doublon, 0, false), "de votre argent placé dans des titres présents dans au moins deux fonds")}
        ${tile("Positions communes", F0.format(N === 2 ? p0[2].communes : X.communesToutes), N === 2 ? `sur ${F0.format(p0[2].lignesA)} et ${F0.format(p0[2].lignesB)} lignes` : "présentes dans tous vos fonds")}
        ${tile("10 premières lignes", O2_p(X.conc.top10, 0, false), "du portefeuille combiné (concentration)")}
        ${tile("Diversification effective", "≈ " + F0.format(X.conc.nEq) + " lignes", `équivalent en lignes de même poids (fonds le plus diversifié seul : ≈ ${F0.format(best)})`)}</div>
      <p class="o2-note">Le <b>nombre</b> de positions communes ne suffit pas : deux fonds peuvent partager des centaines de petites lignes et peu de poids. Le <b>poids économique réel</b> en commun additionne, pour chaque entreprise, le plus petit des deux poids.</p></div></section>
    <section class="panel"><div class="ph"><h2>Positions communes : nombre et poids réel</h2></div><div class="pb">
      ${tblxScrollBox(`<table class="t tbx"><thead><tr><th class="l lab" scope="col">Paire de fonds</th><th scope="col">Positions communes</th><th scope="col">Poids identique</th><th scope="col">Part du 1er dans le 2d</th><th scope="col">Part du 2d dans le 1er</th></tr></thead><tbody>
      ${paires.map(([i, j, p], z) => `<tr class="${z % 2 ? "z" : ""}"><th scope="row" class="l lab"><span class="nm">${esc(nm(i))}</span><span class="sub" style="display:block">et ${esc(nm(j))}</span></th><td class="num">${F0.format(p.communes)}<span class="sub" style="display:block">sur ${F0.format(p.lignesA)} et ${F0.format(p.lignesB)}</span></td><td class="num"><b>${O2_p(p.recouvrement, 0, false)}</b></td><td class="num">${O2_p(p.partAdansB, 0, false)}</td><td class="num">${O2_p(p.partBdansA, 0, false)}</td></tr>`).join("")}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}
      <p class="o2-note">« Part du 1er dans le 2d » : poids, dans le premier fonds, des entreprises que le second détient aussi (quel que soit leur poids dans le second). Proche de 100 % : le premier est presque inclus dans le second.</p></div></section>
    <section class="panel"><div class="ph"><h2>Les plus grosses entreprises, fonds par fonds</h2></div><div class="pb">${keys}${O2_barres(top, nomsS, couleurs)}
      <p class="o2-note">Poids de chaque entreprise dans chaque fonds (« – » : le fonds ne la détient pas) puis dans votre portefeuille combiné, selon les parts choisies.</p></div></section>
    <section class="panel"><div class="ph"><h2>Ce que chaque fonds apporte en propre</h2></div><div class="pb">
      ${hbars(E.map((e, i) => ({ label: e.name, v: X.propre[i] / 100, c: O2_RC[i] })), x => pct(x, 0, false))}
      <p class="o2-note">Poids du fonds investi dans des entreprises qu'aucun de vos autres fonds ne détient. Plus c'est bas, moins ce fonds diversifie le reste.</p></div></section>
    <section class="panel"><div class="ph"><h2>Exposition par secteur et par pays</h2></div><div class="pb">${keys}<div class="o2-split">
      <div><h3>Par secteur</h3>${X.secteurs.length ? O2_barres(expo("secteurs", lib, 8), nomsS, couleurs) : `<p class="muted">Répartition par secteur non disponible pour ces fonds.</p>`}</div>
      <div><h3>Par pays</h3>${X.pays.length ? O2_barres(expo("pays", k => COUNTRY[k] || k, 8), nomsS, couleurs) : `<p class="muted">Répartition par pays non disponible.</p>`}</div></div>
      <p class="o2-note">${emetteur ? "Secteurs publiés par les émetteurs (classification GICS)." : "Secteurs calculés par le site à partir des entreprises qu'il suit dans chaque fonds (classification du site), car au moins une source ne les publie pas."}</p></div></section>
    <section class="panel"><div class="ph"><h2>Expositions indirectes</h2></div><div class="pb">
      <ul class="o2-pts">${E.map((e, i) => `<li><b>${esc(e.name)}</b> suit l'indice <b>${esc(e.index || "non indiqué")}</b>${e.devise ? `, coté en ${esc(e.devise)}` : ""}${e.couvert ? ", couvert contre le risque de change" : ""}. Premier pays : ${F[i].countries[0] ? `${esc(COUNTRY[F[i].countries[0][0]] || F[i].countries[0][0])} (${O2_p(F[i].countries[0][1], 0, false)})` : "non indiqué"}.</li>`).join("")}
        ${devs.length ? `<li>Devises des entreprises détenues (d'après leur pays) : ${devs.slice(0, 5).map(([d, w]) => `${esc(d === "autres" ? "autres devises" : d)} ${O2_p(w, 0, false)}`).join(", ")}.</li>` : ""}</ul></div></section>
    <section class="panel"><div class="ph"><h2>Ce que cela change pour la diversification</h2></div><div class="pb"><ul class="o2-pts">${csq.map(x => `<li>${x}</li>`).join("")}</ul>
      <p class="o2-note">Constats calculés sur les compositions publiées, pas une recommandation : un recouvrement peut être voulu (renforcer les États-Unis, par exemple).</p></div>
      <div class="src"><ul style="margin:0 0 6px;padding-left:18px">${sources}</ul>Méthode : poids des lignes en % de chaque fonds ; portefeuille combiné = poids de chaque fonds multipliés par sa part ; « diversification effective » = 1 ÷ somme des carrés des poids (indice de Herfindahl).</div></section>`;
  tblxBindScroll($("#o2rr"));
}

/* ====================================================================================
   3. Et si j'avais investi ? Une seule courbe, des séries distinctes, des hypothèses écrites
   ==================================================================================== */
const O2_IDXCUR = { cac40: "EUR", stoxx50: "EUR", dax: "EUR", sp500: "USD", nasdaq100: "USD", ftse100: "GBP", nikkei: "JPY" };
const O2_IDXNOM = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", dax: "DAX", sp500: "S&P 500", nasdaq100: "Nasdaq 100", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
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
async function outilSiJavais() {
  O2_css(); setTitle("Et si j'avais investi ?"); setNav("sim"); await PXP;
  const q = new URLSearchParams(location.search);
  const S = { k: q.get("k") && (PX[q.get("k")] || RBY[q.get("k").slice(2)]) ? q.get("k") : "c:lvmh", cmp: q.get("vs") === "aucun" ? "" : PX[q.get("vs")] ? q.get("vs") : null, amt: +q.get("m") > 0 ? +q.get("m") : 1000, ans: [1, 3, 5].includes(+q.get("ans")) ? +q.get("ans") : 5, bk: q.get("bk") || "trade-republic" };
  const defCmp = k => { const c = k.startsWith("c:") ? RBY[k.slice(2)] : null, e = k.startsWith("e:") ? ETFBY[k.slice(2)] : null;
    return c ? (c.region === "US" ? "i:sp500" : c.region === "FR" ? "i:cac40" : ["DE", "NL", "IT", "ES", "BE", "FI", "IE", "AT", "PT"].includes((c.isin || "").slice(0, 2)) ? "i:stoxx50" : "i:sp500") : e && /CAC|France/i.test(e.index || "") ? "i:stoxx50" : "i:cac40"; };
  if (S.cmp === null) S.cmp = defCmp(S.k);
  app.innerHTML = `<div class="crumbs"><a href="/outils">Outils</a> › Et si j'avais investi ?</div><h1 class="pagetitle">Et si j'avais investi ?</h1>
    <p class="pagesub">Ce que serait devenue une somme placée en une fois il y a 1, 3 ou 5 ans, comparée à un indice, au Livret A et à la hausse des prix. Cours réellement relevés, sources en bas de page.</p>
    <section class="panel"><div class="pb"><div class="o2-form">
      ${pickerHTML("o2sq", "Action ou ETF")}
      ${numIn("o2sm", "Montant placé (€)", S.amt, "", 'min="10" step="100"')}
      <div class="field"><label>Il y a</label><div class="o2-seg" id="o2sa">${[5, 3, 1].map(a => `<button type="button" data-a="${a}">${a} an${a > 1 ? "s" : ""}</button>`).join("")}</div></div>
      <div class="field"><label for="o2sbk">Courtier (frais d'achat)</label><select id="o2sbk">${brokerOptions(S.bk)}</select></div></div>
      <div class="field" style="margin-top:10px"><label>Comparer avec</label><div class="chips" id="o2sv">${["i:cac40", "i:stoxx50", "i:sp500", "i:nasdaq100"].map(k => `<button type="button" data-k="${k}">${O2_IDXNOM[k.slice(2)]}</button>`).join("")}<button type="button" data-k="">Aucun indice</button></div></div></div></section>
    <div id="o2sr"><div class="pb muted">Calcul…</div></div>`;
  const ref = await O2_ref(), H = await O2_json("/data/historique.json");
  const go_ = () => {
    const u = new URLSearchParams({ k: S.k, vs: S.cmp || "aucun", m: S.amt, ans: S.ans, bk: S.bk }); history.replaceState({}, "", "/outils/si-javais?" + u);
    $$("#o2sa button").forEach(b => b.classList.toggle("on", +b.dataset.a === S.ans)); $$("#o2sv button").forEach(b => b.classList.toggle("on", b.dataset.k === (S.cmp || "")));
    O2_sjCalcul(S, ref, H);
  };
  bindPicker("o2sq", k => { S.k = k; S.cmp = defCmp(k); go_(); }); $("#o2sq").value = O2_nomK(S.k);
  $("#o2sm").oninput = () => { S.amt = Math.max(0, v("o2sm")); clearTimeout(S.t); S.t = setTimeout(go_, 200); };
  $("#o2sa").onclick = e => { const b = e.target.closest("button"); if (b) { S.ans = +b.dataset.a; go_(); } };
  $("#o2sv").onclick = e => { const b = e.target.closest("button"); if (b) { S.cmp = b.dataset.k || null; go_(); } };
  $("#o2sbk").onchange = () => { S.bk = $("#o2sbk").value; go_(); };
  go_();
}
// Série d'un titre : points aux dates relevées (il y a 5, 3, 1 an, aujourd'hui), en euros
function O2_sjSerie(k, S, ref, H, frais) {
  const p = PX[k], cur = O2_curK(k); if (!p || !(p.p > 0)) return { k, err: "pas de cours" };
  const champs = [[5, "p5y"], [3, "p3y"], [1, "p1y"], [0, "p"]].filter(([a]) => a <= S.ans), deb = O2_moinsAns(TODAY, S.ans);
  if (!(p[champs[0][1]] > 0)) return { k, err: `pas de cours il y a ${S.ans} an${S.ans > 1 ? "s" : ""}` };
  const fx0 = O2_fx(ref, cur, deb); if (fx0 == null) return { k, err: "taux de change historique indisponible" };
  const net = Math.max(0, S.amt - frais), parts = net * fx0 / p[champs[0][1]];
  const pts = champs.filter(([, f]) => p[f] > 0).map(([a, f]) => { const fx = O2_fx(ref, cur, O2_moinsAns(TODAY, a), a === 0); return [-a, fx ? parts * p[f] / fx : null]; });
  // Dividendes perçus (actions) : dividende par action publié de chaque exercice, supposé versé le 1er juin de l'année suivante
  let div = null; const c = k.startsWith("c:") ? RBY[k.slice(2)] : null, h = c && H && H.h && H.h[c.id];
  if (h && h.d && h.d.some(x => x > 0) && c.currency === cur) {
    const fy = h.d.map((x, i) => [h.y + i, x]), cumul = iso => fy.filter(([y, x]) => x > 0 && `${y + 1}-06-01` > deb && `${y + 1}-06-01` <= iso).reduce((s, [, x]) => s + x, 0);
    div = pts.map(([x, val]) => { const iso = O2_moinsAns(TODAY, -x), fx = O2_fx(ref, cur, iso, x === 0); return [x, val != null && fx ? val + parts * cumul(iso) / fx : null]; });
    const exos = fy.filter(([y, x]) => x > 0 && `${y + 1}-06-01` > deb && `${y + 1}-06-01` <= TODAY).map(([y]) => y);
    div.exos = exos; if (!exos.length) div = null;
  }
  return { k, nom: O2_nomK(k), cur, pts, div, parts, net, frais, depart: p[champs[0][1]] };
}
function O2_sjCalcul(S, ref, H) {
  const el = $("#o2sr"); if (!el) return;
  const deb = O2_moinsAns(TODAY, S.ans), b = brokerBy(S.bk), frais = S.k.startsWith("i:") ? 0 : brokerFee(b, S.amt, { fixe: 0, pct: 0 });
  const A = O2_sjSerie(S.k, S, ref, H, frais), I = S.cmp && S.cmp !== S.k ? O2_sjSerie(S.cmp, S, ref, H, 0) : null;
  if (A.err) { el.innerHTML = `<section class="panel"><div class="pb"><div class="o2-verdict"><p>Calcul impossible pour <b>${esc(O2_nomK(S.k))}</b> : ${esc(A.err)}. ${S.ans > 1 ? "Essayez une période plus courte." : ""}</p></div><p class="o2-note">Le site n'invente aucun cours : il n'affiche que ceux réellement relevés (Google Finance) et convertis avec les taux de la BCE.</p></div></section>`; return; }
  const xs = A.pts.map(p => p[0]), dates = xs.map(x => O2_moinsAns(TODAY, -x));
  const T = ref && ref.livretA ? ref.livretA.taux : null, ipc = ref && ref.ipc ? ref.ipc.mois : null;
  const livret = T ? xs.map((x, i) => [x, O2C.livretA(S.amt, deb, dates[i], T)]) : null;
  const m0 = ipc && O2C.moisProche(ipc, deb), prix = m0 ? xs.map((x, i) => { const m1 = O2C.moisProche(ipc, dates[i]); return [x, O2C.inflation(S.amt, ipc[m0], ipc[m1])]; }) : null;
  const mFin = ipc && O2C.moisProche(ipc, TODAY);
  const series = [{ nom: A.nom + (A.div ? " (cours seul)" : ""), couleur: O2_C.ink, pts: A.pts, points: true, epais: 2.5 }];
  if (A.div) series.push({ nom: A.nom + " avec dividendes perçus", couleur: O2_C.ink, tirets: true, pts: A.div, points: true });
  if (I && !I.err) series.push({ nom: I.nom + " (indice, sans dividendes)", couleur: O2_C.bleu, pts: I.pts, points: true });
  if (livret) series.push({ nom: "Livret A", couleur: O2_C.vert, pts: livret, points: true });
  if (prix) series.push({ nom: "Hausse des prix (même pouvoir d'achat)", couleur: O2_C.orange, tirets: true, pts: prix, epais: 1.5 });
  const fin = s => s && s.pts ? s.pts[s.pts.length - 1][1] : null, vA = A.div ? A.div.at(-1)[1] : fin(A), vI = I && !I.err ? fin(I) : null, vL = livret ? livret.at(-1)[1] : null, vP = prix ? prix.at(-1)[1] : null;
  const perf = x => x != null ? O2_p((x / S.amt - 1) * 100, 0) : "–";
  const phr = `${O2_e(S.amt)} placés dans <b>${esc(A.nom)}</b> en ${O2_dCourt(deb)} vaudraient aujourd'hui environ <b>${O2_e(vA)}</b> (${perf(vA)})${A.div ? ", dividendes perçus compris" : ""}.`
    + (vI != null ? ` Placés dans le ${esc(I.nom)}, ils vaudraient ${O2_e(vI)} (${perf(vI)}).` : "")
    + (vL != null ? ` Sur un Livret A : ${O2_e(vL)}.` : "")
    + (vP != null ? ` Pour garder le même pouvoir d'achat, il fallait ${O2_e(vP)}${vA < vP ? " : ce placement a perdu du pouvoir d'achat." : "."}` : "");
  const lignes = series.map(s => `<tr><th scope="row" class="l lab"><span class="nm">${esc(s.nom)}</span></th>${xs.map(x => { const p = s.pts.find(z => z[0] === x); return `<td class="num">${p && p[1] != null ? O2_e(p[1]) : "–"}</td>`; }).join("")}<td class="num"><b>${perf(fin(s))}</b></td></tr>`).join("");
  const e = S.k.startsWith("e:") ? ETFBY[S.k.slice(2)] : null;
  const hyp = [
    `Montant : ${O2_e(S.amt)} placés en une seule fois le ${dLabel(deb)}, sans versement ensuite. Les versements mensuels demanderaient les cours mois par mois, que le site ne conserve pas encore.`,
    `Frais d'achat : ${frais ? `${eur(frais)} (grille ${esc(b.name)}), déduits du montant placé` : "aucun"}. ${e ? `Les frais courants de l'ETF (${e.ter != null ? pct(e.ter / 100, 2, false) + " par an" : "non indiqués"}) sont déjà déduits de son cours.` : ""} Pas de frais de revente ni d'impôt : c'est la valeur avant revente.`,
    A.div ? `Dividendes : dividende par action publié dans les comptes annuels des exercices ${A.div.exos.join(", ")}, supposé versé le 1er juin de l'année suivante et gardé en liquidités (ni réinvesti ni imposé). Estimation : les dates et acomptes réels varient.`
      : e ? (e.distribution === "distribution" ? "Dividendes : cet ETF les distribue ; ils ne sont pas comptés ici (montants versés non disponibles)." : "Dividendes : cet ETF les réinvestit ; ils sont déjà dans son cours.") : "Dividendes : non comptés (dividendes par action non disponibles ou dans une autre devise que le cours).",
    `Devise : ${A.cur && A.cur !== "EUR" ? `cours en ${esc(A.cur)}, convertis en euros au taux moyen du mois (BCE) pour le passé et au taux du jour pour aujourd'hui. La variation du ${esc(A.cur)} face à l'euro est donc comprise.` : "cours en euros."}`,
    I && !I.err ? `Indice : ${esc(I.nom)}, indice de prix (dividendes non réinvestis), sans frais : il ne s'achète pas directement.` : I && I.err ? `Indice ${esc(O2_nomK(S.cmp))} : ${esc(I.err)}.` : "",
    livret ? `Livret A : taux officiels successifs (${T.filter(t => t[0] >= deb.slice(0, 7)).map(t => `${F1.format(t[1])} % au ${dLabel(t[0])}`).slice(-4).join(", ") || "taux en vigueur"}), intérêts par quinzaine capitalisés au 31 décembre, sans plafond ni impôt (le Livret A n'est pas imposé).` : "Livret A : taux historiques indisponibles.",
    prix ? `Hausse des prix : indice des prix à la consommation de l'Insee, de ${O2_moisL(m0)} à ${O2_moisL(mFin)} (dernier mois publié).` : "Hausse des prix : indice de l'Insee indisponible.",
  ].filter(Boolean);
  el.innerHTML = `<section class="panel"><div class="pb">
      <div class="o2-verdict"><p class="kick">En bref</p><p>${phr}</p></div>
      <div id="o2sc"></div>
      <p class="o2-note">${xs.length} cours relevés (${dates.map(dLabel).join(", ")}) : entre deux points, la courbe est tracée en ligne droite, alors que le cours a varié davantage. Touchez ou survolez la courbe pour lire les valeurs ; touchez un nom de la légende pour masquer une série.</p>
      ${tblxScrollBox(`<table class="t tbx"><thead><tr><th class="l lab" scope="col">Placement</th>${dates.map(d => `<th scope="col">${O2_dCourt(d)}</th>`).join("")}<th scope="col">Évolution</th></tr></thead><tbody>${lignes}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}
      <div class="o2-hyp"><b>Hypothèses du calcul</b><ul>${hyp.map(x => `<li>${x}</li>`).join("")}</ul></div>
      <p class="o2-note"><b>Le passé ne dit rien de l'avenir.</b> Un autre point de départ, quelques semaines plus tôt ou plus tard, donnerait un autre résultat. Ce n'est pas un conseil d'achat ou de vente.</p></div>
    <div class="src">Cours : Google Finance (cours de clôture ou différés relevés par le site, mise à jour du ${PXUP && PXUP !== "none" ? dLabel(String(PXUP).slice(0, 10)) : "jour"}). Taux de change : ${ref && ref.fx ? O2_src("BCE, taux de référence", ref.fx.url) : "BCE"}. ${prix ? `Prix : ${O2_src(ref.ipc.source, ref.ipc.url)}.` : ""} ${livret ? `Livret A : ${O2_src("Service-public.gouv.fr", ref.livretA.url)}.` : ""} Frais : ${brokerSrc()} ${A.div ? "Dividendes : comptes annuels officiels (ESEF, SEC) lus par le site." : ""}</div></section>`;
  const ticks = xs.map((x, i) => [x, O2_dCourt(dates[i])]);
  O2_courbe($("#o2sc"), { series, xTicks: ticks, yFmt: (v, ax) => ax ? F0.format(v) + " €" : O2_e(v), tipX: x => dLabel(O2_moinsAns(TODAY, -x)), refY: S.amt, titre: "Valeur du placement au fil du temps" });
  tblxBindScroll(el);
}

/* ====================================================================================
   4. Simulateur d'épargne : versements, frais détaillés et modifiables, fiscalité 2026, trois scénarios historiques
   ==================================================================================== */
const O2_BCE2 = ["Banque centrale européenne, objectif d'inflation de 2 % à moyen terme", "https://www.ecb.europa.eu/mopo/strategy/pricestab/html/index.fr.html"];
function O2_terMedian() {
  const l = ETF.list.filter(e => e.categorie === "actions-monde" && e.pea && e.ter > 0).map(e => e.ter);
  return l.length >= 3 ? { v: median(l), n: l.length } : { v: 0.2, n: 0 };
}
function pageSim(tool) {
  O2_css(); setNav("sim");
  const ancre = { frais: "o2frais", "pea-cto": "o2fisc" }[tool];
  setTitle(tool === "frais" ? "Simulateur : le coût des frais" : tool === "pea-cto" ? "Simulateur : PEA ou compte-titres" : "Simulateur d'épargne");
  const hist = typeof COMM_MW !== "undefined" ? COMM_MW : null, ter = O2_terMedian();
  const q = new URLSearchParams(location.search), n = (k, d) => { const x = parseFloat(q.get(k)); return isFinite(x) ? x : d; };
  const S = { ini: n("ini", 1000), men: n("men", 150), ans: Math.max(1, Math.min(40, Math.round(n("ans", 20)))), env: q.get("env") === "cto" ? "cto" : "pea", bk: BROKERS.list.some(b => b.id === q.get("bk")) ? q.get("bk") : "trade-republic",
    ter: n("ter", ter.v), ord: [1, 2, 4, 12].includes(n("ord", 12)) ? n("ord", 12) : 12, plan: q.get("plan") !== "0", chg: n("chg", 0), infl: n("infl", 2), reel: q.get("reel") === "1", vente: q.get("vente") !== "0",
    hyp: hist && q.get("hyp") !== "perso" ? "hist" : "perso", rp: n("rp", 2), rc: n("rc", 5), rf: n("rf", 8) };
  app.innerHTML = `<div class="crumbs"><a href="/outils">Outils</a> › Simulateur</div><h1 class="pagetitle">Simulateur d'épargne</h1>
    <p class="pagesub">Ce que pourrait devenir une épargne placée chaque mois, une fois payés les frais réels de votre courtier, les frais du fonds et l'impôt. Trois scénarios tirés de l'histoire, jamais une promesse.</p>
    <section class="panel"><div class="pb">
      <div class="o2-form">
        ${numIn("o2i", "Je place au départ (€)", S.ini, "", 'min="0" step="100"')}
        ${numIn("o2m", "Puis chaque mois (€)", S.men, "", 'min="0" step="10"')}
        ${numIn("o2a", "Pendant (années)", S.ans, "", 'min="1" max="40"')}
        <div class="field"><label>Compte</label><div class="o2-seg" id="o2env"><button type="button" data-v="pea">PEA</button><button type="button" data-v="cto">Compte-titres</button></div></div>
        <div class="field"><label for="o2bk">Courtier</label><select id="o2bk">${brokerOptions(S.bk)}</select></div>
      </div>
      <div class="row2" id="o2perso" hidden style="margin-top:10px">${numIn("o2pfx", "Frais fixes par ordre (€)", 0, "", 'min="0" step="0.5"')}${numIn("o2ppc", "Pourcentage par ordre (%)", 0, "", 'min="0" step="0.05"')}</div>
      <details class="o2-det" id="o2det"><summary>Frais et hypothèses détaillées</summary>
        <div class="o2-form">
          <div class="field"><label>Rendement supposé</label><div class="o2-seg" id="o2hyp">${hist ? `<button type="button" data-v="hist">Actions monde (historique)</button>` : ""}<button type="button" data-v="perso">Mes hypothèses</button></div></div>
          <div class="field" id="o2rates" hidden><label>Rendements par an (prudent, central, favorable)</label><div class="row2" style="grid-template-columns:repeat(3,1fr)">${["rp", "rc", "rf"].map(k => `<input id="o2${k}" type="number" step="0.5" value="${S[k]}" aria-label="Rendement ${k === "rp" ? "prudent" : k === "rc" ? "central" : "favorable"} (%)">`).join("")}</div><div class="hint">En % par an, avant frais du fonds.</div></div>
          ${numIn("o2ter", "Frais courants du fonds (% par an)", +S.ter.toFixed(2), ter.n ? `Médiane de ${ter.n} ETF actions monde éligibles au PEA suivis par le site. 0 pour des actions en direct.` : "", 'min="0" max="3" step="0.05"')}
          <div class="field"><label>Achats par an</label><div class="o2-seg" id="o2ord">${[[12, "12"], [4, "4"], [2, "2"], [1, "1"]].map(([v_, l]) => `<button type="button" data-v="${v_}">${l}</button>`).join("")}</div><div class="hint">Moins d'ordres, plus gros : moins de frais fixes, mais l'argent attend.</div></div>
          <div class="field" id="o2planf"><label><input type="checkbox" id="o2plan" ${S.plan ? "checked" : ""}> Plan d'investissement programmé</label><div class="hint" id="o2planh"></div></div>
          ${numIn("o2chg", "Frais de change (% par opération)", S.chg, "Seulement pour un titre coté dans une autre devise. Un ETF coté en euros n'en a pas, même s'il contient des actions américaines.", 'min="0" max="2" step="0.05"')}
          <div class="field"><label><input type="checkbox" id="o2vente" ${S.vente ? "checked" : ""}> Compter les frais de revente</label><div class="hint">Un ordre de vente de tout le placement à la fin.</div></div>
          <div class="field"><label><input type="checkbox" id="o2reel" ${S.reel ? "checked" : ""}> Montants en euros d'aujourd'hui</label>${numIn("o2infl", "Hausse des prix supposée (% par an)", S.infl, "2 % : objectif de la Banque centrale européenne.", 'min="0" max="10" step="0.5"')}</div>
        </div></details>
    </div></section>
    <div id="o2res"></div>`;
  const seg = (id, val) => $$(`#${id} button`).forEach(b => b.classList.toggle("on", b.dataset.v === String(val)));
  const lit = () => {
    S.ini = Math.max(0, v("o2i")); S.men = Math.max(0, v("o2m")); S.ans = Math.max(1, Math.min(40, Math.round(v("o2a")) || 1)); S.bk = $("#o2bk").value; S.ter = Math.max(0, Math.min(3, v("o2ter")));
    S.plan = $("#o2plan").checked; S.chg = Math.max(0, Math.min(2, v("o2chg"))); S.vente = $("#o2vente").checked; S.reel = $("#o2reel").checked; S.infl = Math.max(0, Math.min(10, v("o2infl")));
    S.rp = v("o2rp"); S.rc = v("o2rc"); S.rf = v("o2rf"); S.perso = { fixe: v("o2pfx"), pct: v("o2ppc") };
  };
  const run = () => {
    lit(); seg("o2env", S.env); seg("o2hyp", S.hyp); seg("o2ord", S.ord);
    const b = brokerBy(S.bk); $("#o2perso").hidden = !b.custom; $("#o2rates").hidden = S.hyp !== "perso";
    $("#o2planf").hidden = b.plan == null; $("#o2planh").textContent = b.plan != null ? `${b.name} : ${b.plan ? eur(b.plan) : "gratuit"} par versement programmé (au lieu de la grille par ordre).` : "";
    const u = new URLSearchParams({ ini: S.ini, men: S.men, ans: S.ans, env: S.env, bk: S.bk, ter: S.ter, ord: S.ord, chg: S.chg, infl: S.infl }); if (!S.plan) u.set("plan", "0"); if (S.reel) u.set("reel", "1"); if (!S.vente) u.set("vente", "0"); if (S.hyp === "perso") { u.set("hyp", "perso"); u.set("rp", S.rp); u.set("rc", S.rc); u.set("rf", S.rf); }
    history.replaceState({}, "", location.pathname + "?" + u + location.hash);
    O2_simResultat(S, hist);
  };
  $("#o2env").onclick = e => { const x = e.target.closest("button"); if (x) { S.env = x.dataset.v; run(); } };
  $("#o2hyp").onclick = e => { const x = e.target.closest("button"); if (x) { S.hyp = x.dataset.v; run(); } };
  $("#o2ord").onclick = e => { const x = e.target.closest("button"); if (x) { S.ord = +x.dataset.v; run(); } };
  let t = null; app.querySelector("section.panel").addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 120); });
  app.querySelector("section.panel").addEventListener("change", run);
  if (ancre) $("#o2det").open = true;
  run();
  if (ancre) setTimeout(() => { const a = document.getElementById(ancre); if (a) a.scrollIntoView({ block: "start" }); }, 60);
}
// Paramètres de O2C.simule pour un courtier donné
function O2_simParams(S, b, rendement, env) {
  const ordre = (m, type) => type === "versement" && S.plan && b.plan != null && S.ord === 12 ? b.plan : brokerFee(b, m, S.perso);
  return { initial: S.ini, mensuel: S.men, annees: S.ans, rendement, ter: S.ter / 100, fraisOrdre: ordre, ordresParAn: S.ord, change: S.chg / 100, enveloppe: env || S.env, taux: RATES, inflation: S.reel ? S.infl / 100 : 0, vente: S.vente };
}
function O2_simResultat(S, hist) {
  const el = $("#o2res"); if (!el) return;
  const b = brokerBy(S.bk), sc = S.hyp === "hist" && hist ? O2C.scenarios(hist, S.ans) : null;
  const taux = sc ? { p: sc.prudent, c: sc.central, f: sc.favorable } : { p: S.rp / 100, c: S.rc / 100, f: S.rf / 100 };
  const R = { p: O2C.simule(O2_simParams(S, b, taux.p)), c: O2C.simule(O2_simParams(S, b, taux.c)), f: O2C.simule(O2_simParams(S, b, taux.f)) };
  const C = R.c, k = x => S.reel ? x / C.defl : x, kA = (x, a) => S.reel ? x / Math.pow(1 + S.infl / 100, a) : x;
  const autre = O2C.simule(O2_simParams(S, b, taux.c, S.env === "pea" ? "cto" : "pea"));
  if (!(C.verse > 0)) { el.innerHTML = `<section class="panel"><div class="pb muted">Indiquez un montant de départ ou un versement mensuel.</div></section>`; return; }
  const lab = { p: "Prudent", c: "Central", f: "Favorable" }, col = { p: O2_C.orange, c: O2_C.ink, f: O2_C.bleu };
  const expl = sc ? { p: `sur les périodes de ${sc.N} ans du passé, 1 sur 10 a fait moins bien`, c: `la moitié des périodes de ${sc.N} ans a fait mieux, la moitié moins bien`, f: `sur les périodes de ${sc.N} ans du passé, 1 sur 10 a fait mieux` } : { p: "votre hypothèse basse", c: "votre hypothèse centrale", f: "votre hypothèse haute" };
  const reelTxt = S.reel ? ` en euros d'aujourd'hui (${F1.format(S.infl)} % de hausse des prix par an)` : "";
  const env = S.env === "pea" ? "PEA" : "compte-titres";
  const fondsFrais = Math.max(0, C.coutFrais - C.courtage - C.change);
  const pertes = sc ? `Sur l'historique utilisé, ${sc.negatives ? `${F0.format(sc.negatives)} période${sc.negatives > 1 ? "s" : ""} de ${sc.N} ans sur ${F0.format(sc.nb)} ${sc.negatives > 1 ? "ont" : "a"} fini en perte` : `aucune des ${F0.format(sc.nb)} périodes de ${sc.N} ans n'a fini en perte`} ; la pire (${sc.pire.debut}-${sc.pire.fin}) a rapporté ${O2_p(sc.pire.r * 100, 1)} par an, la meilleure (${sc.meilleur.debut}-${sc.meilleur.fin}) ${O2_p(sc.meilleur.r * 100, 1)} par an.` : "";
  const brk = BROKERS.list.filter(x => !x.custom).map(x => ({ x, r: O2C.simule(O2_simParams(S, x, taux.c)), f: S.plan && x.plan != null && S.ord === 12 ? x.plan : brokerFee(x, S.men * 12 / S.ord) })).sort((a, z) => z.r.net - a.r.net);
  const meilleur = brk.length ? brk[0].r.net : 0, ordreM = S.men * 12 / S.ord;
  const decomp = [["Vous versez", C.verse, ""], ["Gains du placement avant tous frais", C.sansFrais - C.verse, "s"], ["Frais de courtage" + (S.vente ? " (achats et revente)" : ""), -C.courtage, ""], ...(C.change > 0 ? [["Frais de change", -C.change, ""]] : []),
    ["Frais courants du fonds", -fondsFrais, `${F2.format(S.ter)} % par an, et les gains qu'ils auraient produits`], [`Impôt à la sortie (${pct(C.taux, 1, false)} des gains)`, -C.impot, S.env === "pea" ? (S.ans >= 5 ? "PEA de plus de 5 ans : prélèvements sociaux seulement" : "PEA de moins de 5 ans : prélèvement forfaitaire complet") : "prélèvement forfaitaire unique"]];
  el.innerHTML = `<section class="panel"><div class="pb">
      <div class="o2-verdict"><p class="kick">En bref</p><p>En versant <b>${O2_e(C.verse)}</b> en ${S.ans} an${S.ans > 1 ? "s" : ""} sur un ${env}, vous auriez environ <b>${O2_e(k(C.net))}</b>${reelTxt} après frais et impôt dans le scénario central (${O2_p(taux.c * 100, 1)} par an${sc ? ", la médiane historique" : ""}). Selon le scénario : de ${O2_e(k(R.p.net))} à ${O2_e(k(R.f.net))}.</p></div>
      <div class="o2-sc">${["p", "c", "f"].map(s => `<div class="${s === "c" ? "c" : ""}"><div class="k"><i style="background:${col[s]}"></i>${lab[s]}</div><div class="v">${O2_e(k(R[s].net))}</div><small><b>${O2_p(taux[s] * 100, 1)}</b> par an avant frais : ${expl[s]}</small><small>Gain net : ${O2_e(k(R[s].net) - C.verse)}${S.reel ? " (pouvoir d'achat)" : ""}</small></div>`).join("")}</div>
      <div id="o2ch"></div>
      ${sc ? `<p class="o2-note">${pertes} Ce sont des scénarios tirés du passé, pas des prévisions : l'avenir peut faire pire que le scénario prudent.</p>` : `<p class="o2-note">Vos propres hypothèses de rendement : le site ne les vérifie pas. Ce ne sont pas des prévisions.</p>`}
    </div></section>
    <section class="panel"><div class="ph"><h2>Où part l'argent (scénario central)</h2></div><div class="pb">
      ${tblxScrollBox(`<table class="t tbx"><tbody>${decomp.map(([l, x, h], i) => `<tr class="${i % 2 ? "z" : ""}"><th scope="row" class="l lab"><span class="nm">${esc(l)}</span>${h && h !== "s" ? `<span class="sub" style="display:block">${esc(h)}</span>` : ""}</th><td class="num ${i > 1 && x ? "down" : ""}">${i > 1 ? "−" : i && x > 0 ? "+" : i && x < 0 ? "−" : ""}${O2_e(Math.abs(k(x)))}</td></tr>`).join("")}<tr><th scope="row" class="l lab"><b>Il vous reste</b></th><td class="num"><b>${O2_e(k(C.net))}</b></td></tr></tbody></table>`)}
      <p class="o2-note">Total des frais : <b>${O2_e(k(C.coutFrais))}</b>, soit ${pct(C.coutFrais / Math.max(1, C.sansFrais - C.verse), 0, false)} des gains avant frais. ${C.ordres} ordre${C.ordres > 1 ? "s" : ""} passé${C.ordres > 1 ? "s" : ""}${S.ord < 12 ? ` (les versements attendent ${12 / S.ord} mois avant d'être investis)` : ""}.</p></div></section>
    <section class="panel" id="o2fisc"><div class="ph"><h2>PEA ou compte-titres</h2></div><div class="pb">
      <div class="o2-tiles"><div class="o2-tile"><div class="k">${env}</div><div class="v">${O2_e(k(C.net))}</div><small>impôt : ${O2_e(k(C.impot))} (${pct(C.taux, 1, false)} des gains)</small></div>
        <div class="o2-tile"><div class="k">${S.env === "pea" ? "Compte-titres" : "PEA"}</div><div class="v">${O2_e(k(autre.net))}</div><small>impôt : ${O2_e(k(autre.impot))} (${pct(autre.taux, 1, false)} des gains)</small></div></div>
      <ul class="o2-pts"><li>PEA ouvert depuis plus de 5 ans : seuls les prélèvements sociaux (${pct(RATES.ps, 1, false)}) sont dus sur les gains au retrait. Avant 5 ans : prélèvement forfaitaire unique de ${pct(RATES.pfu, 1, false)}, comme sur un compte-titres.</li>
        <li>Le calcul suppose un ETF qui réinvestit ses dividendes (capitalisant) : sur un compte-titres, rien n'est alors imposé avant la vente. Avec des dividendes versés, le compte-titres serait taxé chaque année et l'écart serait plus grand.</li>
        <li>Le PEA n'accepte que des actions européennes et des fonds éligibles (dont des ETF monde « PEA »), dans la limite de 150 000 € de versements.${C.plafondPEA ? " <b>Vos versements dépassent ce plafond.</b>" : ""}</li></ul>
      <p class="o2-note">Taux ${RATES.year}. Sources : ${O2_src("Service-public.gouv.fr, le PEA", "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385")} ; ${O2_src("Meilleurtaux, prélèvements sociaux à 18,6 % (février 2026)", "https://placement.meilleurtaux.com/bourse/actualites/2026-fevrier/taux-prelevements-sociaux-applique-pea-passe-desormais-18-6.html")}.</p></div></section>
    <section class="panel" id="o2frais"><div class="ph"><h2>Le même plan chez chaque courtier</h2></div><div class="pb">
      ${tblxScrollBox(`<table class="t tbx tbx-sort brk"><thead><tr><th class="l lab" scope="col" data-sk="0">Courtier<i class="tbx-so"></i></th>${tblxTh(`Frais par achat de ${O2_e(ordreM)}`, 1)}${tblxTh(`Courtage sur ${S.ans} ans`, 2)}${tblxTh("Il vous reste (central)", 3)}<th class="l" scope="col" data-sk="4">PEA<i class="tbx-so"></i></th></tr></thead><tbody>
      ${brk.map(({ x, r, f }, j) => `<tr class="${j % 2 ? "z" : ""}${x.id === b.id ? " sel" : ""}"><th scope="row" class="l lab" data-v="${esc(x.name)}"><span class="nm">${esc(x.name)}</span>${x.id === b.id ? ` <span class="tbx-tag on">votre choix</span>` : ""}<span class="sub d-only" style="display:block">${esc(x.note || "")}</span></th><td class="num" data-v="${f}">${eur(f)}</td><td class="num" data-v="${r.courtage}">${O2_e(r.courtage)}</td><td class="num" data-v="${r.net}"><b>${O2_e(k(r.net))}</b>${r.net < meilleur - 0.5 ? `<span class="sub" style="display:block">${O2_e(k(r.net - meilleur))}</span>` : ""}</td><td class="l" data-v="${x.pea ? 1 : 0}">${x.pea ? "Oui" : S.env === "pea" ? `<span class="o2-tag no">Pas de PEA</span>` : "Non"}</td></tr>`).join("")}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}
      <p class="o2-note">Un frais fixe pèse lourd sur les petits achats : 1 € représente 1 % d'un achat de 100 €, mais 0,1 % d'un achat de 1 000 €. Les frais ne sont pas le seul critère : disponibilité du PEA, place de cotation, service client. ${brokerSrc()}</p></div></section>
    <section class="panel"><div class="ph"><h2>Hypothèses et limites du modèle</h2></div><div class="pb">
      <div class="o2-hyp" style="margin-top:0"><b>Hypothèses</b><ul>
        <li>Rendement : ${sc ? `performance annuelle de l'indice MSCI World en euros, dividendes réinvestis, de ${Object.keys(hist)[0]} à ${Object.keys(hist).at(-1)} : rendement moyen de chacune des ${sc.nb} périodes de ${sc.N} années consécutives${sc.N < S.ans ? ` (l'historique ne permet pas assez de périodes de ${S.ans} ans : les scénarios utilisent des périodes de ${sc.N} ans)` : ""}. Prudent = 10e centile, central = médiane, favorable = 90e centile.` : `vos hypothèses (${O2_p(taux.p * 100, 1)}, ${O2_p(taux.c * 100, 1)}, ${O2_p(taux.f * 100, 1)} par an).`} Le rendement est appliqué de façon régulière chaque mois.</li>
        <li>Courtage : grille de ${esc(b.name)} appliquée à chaque ordre${S.plan && b.plan != null && S.ord === 12 ? " (plan programmé pour les versements mensuels, grille normale pour le versement de départ et la revente)" : ""} ; ${S.ord} achat${S.ord > 1 ? "s" : ""} par an${S.vente ? ", plus un ordre de revente à la fin" : ""}.</li>
        <li>Frais courants du fonds : ${F2.format(S.ter)} % par an, prélevés chaque mois sur la valeur. Frais de change : ${F2.format(S.chg)} % par opération.</li>
        <li>Impôt : calculé une seule fois, au retrait total à la fin, sur le gain (valeur de revente moins les sommes versées). Barème progressif, abattements et pertes reportables non pris en compte.</li>
        ${S.reel ? `<li>Euros d'aujourd'hui : montants divisés par la hausse des prix supposée (${F1.format(S.infl)} % par an), pour lire le pouvoir d'achat.</li>` : ""}</ul></div>
      <ul class="o2-lim"><li>Les marchés ne montent pas régulièrement : une baisse de 30 % ou plus peut arriver plusieurs fois sur 20 ans, et l'ordre des bonnes et mauvaises années change le résultat quand on verse chaque mois.</li>
        <li>L'historique d'un indice mondial ne dit rien d'une action seule, d'un secteur ou d'un pays, qui peuvent faire bien mieux ou bien pire.</li>
        <li>Les grilles de frais et les règles fiscales changent : elles sont celles de ${RATES.year}.</li>
        <li>Ni l'écart de suivi de l'ETF, ni l'écart entre prix d'achat et de vente, ni les droits de garde éventuels ne sont comptés.</li></ul></div>
      <div class="src">Rendements historiques : ${typeof commSrcHTML === "function" && sc ? commSrcHTML(["msciEur", "wikiMsci", "bce"]) : "vos hypothèses"} Frais courants : fiches des émetteurs d'ETF relevées par le site. Inflation supposée : ${O2_src(O2_BCE2[0], O2_BCE2[1])}.</div></section>`;
  const xs = C.ans.map(a => a.a), ser = ["f", "c", "p"].map(s => ({ nom: `${lab[s]} (${O2_p(taux[s] * 100, 1)} par an)`, couleur: col[s], epais: s === "c" ? 2.5 : 2, pts: R[s].ans.map(a => [a.a, kA(a.valeur, a.a)]) }));
  ser.push({ nom: "Total versé", couleur: O2_C.gris, tirets: true, pts: C.ans.map(a => [a.a, a.verse]) });
  const y0 = +TODAY.slice(0, 4);
  O2_courbe($("#o2ch"), { series: ser, zero: true, xTicks: xs.map(a => [a, String(y0 + a)]), yFmt: (x, ax) => ax ? (Math.abs(x) >= 1e6 ? F1.format(x / 1e6) + " M€" : F0.format(x / 1000) + " k€") : O2_e(x), tipX: a => `${y0 + a} (après ${a} an${a > 1 ? "s" : ""})`, titre: "Valeur de l'épargne selon les trois scénarios" });
  tblxBindScroll(el);
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
function pageAgenda() {
  O2_css(); setTitle("Agenda financier"); setNav("news");
  const q = new URLSearchParams(location.search);
  let ty = ["Résultats", "Assemblée", "Dividende"].includes(q.get("type")) ? q.get("type") : "Tous", per = ["semaine", "mois"].includes(q.get("p")) ? q.get("p") : "tout";
  const nE = new Set(AG.events.map(e => e.id)).size, nH = AG.events.filter(e => e.h && e.date >= TODAY).length;
  app.innerHTML = `<h1 class="pagetitle">Agenda</h1><p class="pagesub">Les prochaines publications de résultats, assemblées et dividendes des entreprises suivies, relevées sur leurs calendriers officiels. Ce qui a été publié hier est dans <a class="lnk" href="/hier">Ce qui s'est passé hier</a>.</p>
    <section class="panel"><div class="tbx-bar"><div class="filters" id="af" style="padding:0;border:0">${[["Tous", "Tous"], ["Résultats", "Résultats"], ["Assemblée", "Assemblées"], ["Dividende", "Dividendes"]].map(([t, l]) => `<button data-t="${t}">${l}</button>`).join("")}</div>
      <div class="o2-seg" id="ap">${[["semaine", "7 jours"], ["mois", "30 jours"], ["tout", "Tout"]].map(([p, l]) => `<button type="button" data-v="${p}">${l}</button>`).join("")}</div></div>
      <div id="al"></div>
      <div class="src">Dates relevées sur les calendriers financiers officiels de ${F0.format(nE)} entreprise${nE > 1 ? "s" : ""} (lien « source » sur chaque fiche). Heure : affichée seulement si la société l'a annoncée (${F0.format(nH)} événement${nH > 1 ? "s" : ""} à venir pour l'instant), convertie à l'heure de Paris ; sinon « heure non communiquée ». Attentes des analystes : le site n'a pas de source de consensus fiable et autorisée, il n'en affiche donc pas.</div></section>
    <section class="panel" id="arec"><div class="ph"><h2>Publié ces derniers jours</h2><a href="/hier">Ce qui s'est passé hier</a></div><div class="pb muted">Recherche des communiqués…</div></section>`;
  const T0 = new Date(TODAY + "T00:00:00Z");
  const delai = d => { const n = Math.round((new Date(d + "T00:00:00Z") - T0) / 864e5); return n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`; };
  const render = () => {
    $$("#af button").forEach(b => b.classList.toggle("on", b.dataset.t === ty)); $$("#ap button").forEach(b => b.classList.toggle("on", b.dataset.v === per));
    const u = new URLSearchParams(); if (ty !== "Tous") u.set("type", ty); if (per !== "tout") u.set("p", per); history.replaceState({}, "", "/agenda" + (u.toString() ? "?" + u : ""));
    const lim = per === "semaine" ? 7 : per === "mois" ? 30 : 1e4;
    const list = upcoming().filter(e => (ty === "Tous" || e.type === ty) && (new Date(e.date + "T00:00:00Z") - T0) / 864e5 < lim);
    if (!list.length) { $("#al").innerHTML = `<div class="empty">Aucun événement sur cette période.</div>`; return; }
    let mk = "", z = 0, body = "";
    list.forEach(e => {
      const m = e.date.slice(0, 7); if (m !== mk) { mk = m; z = 0; body += `<tr class="grp"><th colspan="4" scope="colgroup"><span>${MOISL[+m.slice(5) - 1].replace(/^./, x => x.toUpperCase())} ${m.slice(0, 4)}</span></th></tr>`; }
      const co = RBY[e.id], d = new Date(e.date + "T00:00:00Z"), H = e.type === "Résultats" ? O2_heure(e) : null;
      body += `<tr class="${z++ % 2 ? "z" : ""}"><td class="l tbx-date"><b>${d.getUTCDate()}</b> ${O2_JOURS[d.getUTCDay()]}<small>${delai(e.date)}</small></td>
        <th scope="row" class="l"><a class="cell-co" href="/entreprise/${e.id}/agenda">${logo(co, 24)}<span><b>${esc(co.name)}</b></span></a><div class="m-only tbx-agl" ${H ? `data-ag="${e.id}|${e.date}"` : ""}>${esc(e.label)}${H ? `<div class="o2-agh">${H.ok ? `<b>${esc(H.court)}</b>` : `<span class="o2-tag mu">${esc(H.court)}</span>`}</div>` : ""}</div></th>
        <td class="l wrap d-only">${esc(e.label)}${H && H.txt ? `<div class="sub">${H.txt}</div>` : ""}${e.source ? `<div class="sub"><a class="lnk" href="${esc(e.source)}" target="_blank" rel="noopener">Calendrier officiel</a></div>` : ""}</td>
        <td class="l d-only" ${H ? `data-ag="${e.id}|${e.date}"` : ""}><span class="tbx-tag">${esc(e.type || "")}</span>${H ? `<div class="o2-agh">${H.ok ? `<b>${esc(H.court)}</b>${/^\d|^vers|^au plus/.test(H.court) ? "<small> heure de Paris</small>" : ""}` : `<span class="o2-tag mu">${esc(H.court)}</span>`}</div>` : ""}</td></tr>`;
    });
    $("#al").innerHTML = tblxScrollBox(`<table class="t tbx tbx-ag"><thead><tr><th class="l" scope="col">Date</th><th class="l" scope="col">Entreprise</th><th class="l d-only" scope="col">Événement</th><th class="l d-only" scope="col">Type et heure</th></tr></thead><tbody>${body}</tbody></table>`);
    tblxBindScroll($("#al"));
  };
  $("#af").onclick = e => { const b = e.target.closest("button"); if (b) { ty = b.dataset.t; render(); } };
  $("#ap").onclick = e => { const b = e.target.closest("button"); if (b) { per = b.dataset.v; render(); } };
  render(); O2_agRecents();
}
// Résultats prévus ces 7 derniers jours : chiffres réellement publiés (annonces officielles collectées par le site)
async function O2_agRecents() {
  const el = $("#arec"); if (!el) return;
  const d7 = new Date(Date.parse(TODAY) - 7 * 864e5).toISOString().slice(0, 10);
  const ev = AG.events.filter(e => e.type === "Résultats" && e.date >= d7 && e.date <= TODAY && RBY[e.id]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  const lire = id => typeof actuCo === "function" ? actuCo(id) : getJSON(`/data/actu/c/${id}.json`, { o: [] });
  const res = await Promise.all(ev.map(async e => { const j = await lire(e.id), t0 = Date.parse(e.date) - 864e5, t1 = Date.parse(e.date) + 2 * 864e5;
    const o = (j.o || []).filter(x => x.c === "resultats" && Date.parse(x.d) >= t0 && Date.parse(x.d) < t1).sort((a, b) => (b.f || []).length - (a.f || []).length || a.d.localeCompare(b.d));
    return [e, o[0] || null]; }));
  if (!$("#arec")) return;
  // Événements du jour déjà publiés : l'heure réelle du dépôt remplace « heure non communiquée » dans la liste à venir
  res.forEach(([e, x]) => { if (!x) return; document.querySelectorAll(`[data-ag="${e.id}|${e.date}"] .o2-agh`).forEach(td => { td.innerHTML = `<span class="o2-tag ok">Publié à ${O2_hParis(new Date(x.d))}</span>`; }); });
  for (let i = res.length - 1; i >= 0; i--) if (!res[i][1] && res[i][0].date >= TODAY) res.splice(i, 1);
  if (!res.length) { el.querySelector(".pb").textContent = "Aucune publication de résultats prévue ces 7 derniers jours."; return; }
  el.innerHTML = `<div class="ph"><h2>Publié ces derniers jours</h2><a href="/hier">Ce qui s'est passé hier</a></div>
    ${tblxScrollBox(`<table class="t tbx"><thead><tr><th class="l" scope="col">Date</th><th class="l lab" scope="col">Entreprise</th><th class="l" scope="col">Chiffres publiés</th></tr></thead><tbody>${res.map(([e, x], z) => { const co = RBY[e.id], dt = x ? new Date(x.d) : null;
      return `<tr class="${z % 2 ? "z" : ""}"><td class="l tbx-date"><b>${+e.date.slice(8)}</b> ${O2_MOIS[+e.date.slice(5, 7) - 1]}${dt ? `<small>publié à ${O2_hParis(dt)}</small>` : ""}</td><th scope="row" class="l lab"><a class="cell-co" href="/entreprise/${e.id}/actualite">${logo(co, 22)}<span><b>${esc(co.name)}</b><span class="sub" style="display:block">${esc(e.label)}</span></span></a></th>
        <td class="l wrap">${x ? `${(x.f || []).slice(0, 3).map(([l, v_]) => `<span style="display:block"><span class="light">${esc(l)} :</span> <b>${esc(v_)}</b></span>`).join("") || `<span class="light">Communiqué publié, chiffres non extraits automatiquement.</span>`} <a class="lnk" href="${esc(x.u)}" target="_blank" rel="noopener">Communiqué</a>${dt && Date.now() - dt < 5 * 864e5 ? ` · <a class="lnk" href="/hier?d=${O2_jourParis(dt)}#h-${e.id}">Lecture détaillée</a>` : ""}` : `<span class="light">${e.date >= TODAY ? "Pas encore publié." : "Communiqué non trouvé dans les sources officielles suivies (AMF, SEC, bourses nordiques)."}</span>`}</td></tr>`; }).join("")}</tbody></table>`, "Faites glisser pour voir toutes les colonnes")}
    <div class="src">Chiffres extraits automatiquement des communiqués officiels (AMF, SEC, Nasdaq Nordic, Oslo Børs, FCA) : vérifiez-les dans le communiqué. Heure de publication : celle du dépôt dans la source, à l'heure de Paris.</div>`;
  tblxBindScroll(el);
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
  out.innerHTML = x && x.clair ? `<p><b>En clair :</b> ${esc(x.clair)}</p>${x.change ? `<p><b>Ce que cela change :</b> ${esc(x.change)}</p>` : ""}<p class="o2-note">Rédigé par l'IA de bilan. (${esc(j.modele || "modèle choisi")}) à partir des seuls faits extraits du communiqué. Le communiqué fait foi ; ce n'est pas un conseil.</p>`
    : typeof miaRendu === "function" ? miaRendu(j) : `<p class="muted">${esc((j && j.error) || "Synthèse indisponible.")}</p>`;
}
ROUTES_EXTRA.push([/^\/hier$/, () => pageHier()]);
document.head.insertAdjacentHTML("beforeend", `<style id="o2h-css">
.o2-hnav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}.o2-hnav b{font-size:15px}
.o2-hh{display:flex;justify-content:space-between;gap:10px 18px;flex-wrap:wrap;align-items:flex-start;margin:0 0 10px}.o2-hm{text-align:right}.o2-hm span{display:block;font-weight:600}.o2-hm small{color:var(--grey);font-size:12.5px}
.o2-hg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:4px 0 6px}.o2-hf{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;padding:3px 0;border-bottom:1px solid #F1EEE6}.o2-hf b{font-family:var(--mono,monospace);font-weight:600;text-align:right}
.o2-hq{margin:10px 0 0;font-size:13.5px}.o2-hq blockquote,.o2-bq{margin:6px 0 0;padding:6px 10px;border-left:3px solid #C9C3B8;background:#FBF9F4;font-size:13.5px;line-height:1.5}
.o2-hs{margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#F6F3EC}.o2-hpg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.o2-hp b{font-size:13px}.o2-hp ul{margin:4px 0 0;padding-left:18px;font-size:13px;line-height:1.45}.o2-hp.p b{color:#0B6B4A}.o2-hp.n b{color:#A63A1C}.o2-hp.r b{color:#7A5A12}
.o2-ha{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap;margin:12px 0 0}.o2-hia{margin:10px 0 0;padding:10px 12px;border:1px solid #E4DED2;border-radius:12px;font-size:14px;line-height:1.55}.o2-hia p{margin:0 0 6px}
.o2-agh{margin-top:4px;font-size:12.5px}.o2-agh small{color:var(--grey)}
@media(max-width:600px){.o2-hm{text-align:left}}
</style>`);
