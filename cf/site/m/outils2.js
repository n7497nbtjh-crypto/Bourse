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
const O2_p = (v, d = 1, s = true) => v == null || !isFinite(v) ? "–" : (s && v > 0 ? "+" : v < 0 ? "−" : "") + nf(d).format(Math.abs(v)) + " %";
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
// Unités de devise pour 1 € : moyenne mensuelle BCE pour le passé, taux BCE du jour pour aujourd'hui

// Série d'un titre : points aux dates relevées (il y a 5, 3, 1 an, aujourd'hui), en euros
// 7/11 : ETF sans cours passés dans les feuilles Google : série officielle de l'émetteur (cf/site/data/etf-hist/<id>.json,
// valeur liquidative ajustée des dividendes, en euros, une valeur par semaine ; robot etf-hist.yml), chargée par sj4Hist (sijavais4.js)

/* ====================================================================================
   4. Simulateur d'épargne : versements, frais détaillés et modifiables, fiscalité 2026, trois scénarios historiques
   ==================================================================================== */

// Paramètres de O2C.simule pour un courtier donné

/* ====================================================================================
   5. Agenda : heure vérifiée ou « non communiquée », type, attentes, chiffres publiés
   ==================================================================================== */
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
// Variation entre parenthèses dans un chiffre extrait : « 5,1 Md€ (+18 %) » -> 18
// Lecture d'une publication : chiffres classés, points positifs / négatifs / risques, prévisions et commentaires
// Synthèse approfondie : rédigée par l'IA connectée du visiteur (m/monia.js, tâche « annonce »), à partir des seuls faits du communiqué
/* styles : voir site.css */
