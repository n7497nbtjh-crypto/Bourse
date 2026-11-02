/* ---------- Fiche entreprise v3 (2/11/2026, maquette validée par Romain : docs/maquettes/fiche-hermes-v5.html) ----------
   La fiche existante (m/fiche2.js) est construite comme avant, puis recomposée :
   1. en-tête jaune : identité, cours et fourchette sur un an expliquée, verdict, cinq repères (chiffre + jauge face à la
      médiane + « Explication » qui renvoie au détail), actions (Suivre, Comparer, IA mise en avant, graphique) ;
   2. « Elle seule » : trois graphiques sur 4 ans (variation sous chaque année, lien vers la ligne du rapport officiel) ;
   3. « Face aux autres » : trois comparaisons (la mieux placée en vert, la moins bien en rouge, médiane en pointillé) ;
   4. « Son métier » : le bloc métier existant (chiffres, activités, zones), ouvert ; 5. « Son actualité » : bloc existant ;
   6. bandeau « Prouvé » ; 7. « Tous les chiffres, en détail » : les plis existants (rien n'est retiré) ; 8. question à l'IA.
   Aucun chiffre écrit en dur. Styles : site.css, bloc « Fiche v3 ». */
const F3 = { on: true };
const f3Nb = (v, d = 1) => v == null || !isFinite(v) ? "–" : nf(d).format(v);
const f3Px0 = (p, cur) => { try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur || "EUR", maximumFractionDigits: p >= 100 ? 0 : 2 }).format(p); } catch (e) { return F0.format(p); } };
const f3Pct = (v, d = 1) => v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + f3Nb(Math.abs(v), d) + " %";
const f3Ton = p => p == null ? "n" : p >= 0.6 ? "g" : p <= 0.4 ? "o" : "n";
const f3Peers = s => R.companies.filter(c => c.sector === s.sector && !c.missing && !(isBank(c) !== isBank(s)));
const f3Med = (s, f) => median(f3Peers(s).map(f).filter(v => v != null && isFinite(v)));
const f3Pe = c => { try { const v = valo(c); return v && v.pe > 0 && !v.peNs ? v.pe : null; } catch (e) { return null; } };
const f3Yld = c => { try { const v = valo(c); return v && v.yld != null ? v.yld : null; } catch (e) { return null; } };
const f3Rang = r => r ? `${r.rank}${r.rank === 1 ? "re" : "e"} sur ${r.n}` : "";
const f3Cur = cur => CUR[cur] || (" " + (cur || ""));
function f3Montant(m, cur) { return big(m, cur || "EUR").replace(/ (Md|M)/, " $1"); }

function f3Reperes(s, c) { // les cinq repères : [clé, titre, valeur, ton, sous-titre, jauge, ligne secteur, explication [p1, p2, méthode], pli]
  const r = ratios(s), bank = isBank(s), ax = {}; rfAxes(s).forEach(a => { ax[a.k] = a.r; });
  const nm = s.name, cur = s.currency, L = [];
  // Croissance
  const g = r.g1 != null ? r.g1 * 100 : null, gm = f3Med(s, x => ratios(x).g1), ca = c && c.fin && c.fin.ca ? c.fin.ca : null, yrs = c ? c.years : [];
  let trend = "";
  if (ca) { const v = []; for (let i = 1; i < ca.length; i++) if (ca[i] != null && ca[i - 1] > 0) v.push([yrs[i], (ca[i] / ca[i - 1] - 1) * 100]); if (v.length >= 3) trend = `D'une année sur l'autre : ${v.slice(-3).map(([y, x]) => `${f3Pct(x)} en ${y}`).join(", ")}.`; }
  L.push(["croissance", "Croissance", f3Pct(g), f3Ton(ax.croissance && ax.croissance.p), `ventes ${s.year || ""}`.trim(), ax.croissance, gm != null ? `secteur : ${f3Pct(gm * 100)} · ${f3Rang(ax.croissance)}` : "",
    g == null ? null : [`Les ventes de ${esc(nm)} sont passées de <b>${f3Montant(s.caPrev, cur)} à ${f3Montant(s.ca, cur)}</b> en ${s.year}, soit ${f3Pct(g)}.${gm != null ? ` La moitié des entreprises du secteur ont fait moins de ${f3Pct(gm * 100)}.` : ""}${ax.croissance ? ` ${esc(nm)} fait mieux que ${Math.round(ax.croissance.p * 100)} % d'entre elles.` : ""}`, trend, "Chiffre d'affaires de l'exercice comparé à l'exercice précédent."], "rf-resultats", "Résultats"]);
  // Marge (banques : rentabilité des capitaux propres)
  if (bank) {
    const roe = r.roe != null ? r.roe * 100 : null, rm = f3Med(s, x => ratios(x).roe), m = ax.marge;
    L.push(["marge", "Rentabilité", f3Pct(roe).replace("+", ""), f3Ton(m && m.p), "bénéfice / capitaux propres", m, rm != null ? `banques : ${f3Nb(rm * 100)} % · ${f3Rang(m)}` : "",
      roe == null ? null : [`Sur 100 € de capitaux propres, ${esc(nm)} a dégagé <b>${f3Nb(roe)} €</b> de bénéfice en ${s.year}.${rm != null ? ` La médiane des banques suivies est de ${f3Nb(rm * 100)} €.` : ""}`, "Pour une banque, ce ratio (ROE) remplace la marge : ses ventes ne se lisent pas comme celles d'une entreprise industrielle.", "Bénéfice net divisé par les capitaux propres."], "rf-rentab", "Rentabilité"]);
  } else {
    const mg = r.marge != null ? r.marge * 100 : null, mm = f3Med(s, x => ratios(x).marge), m = ax.marge;
    L.push(["marge", "Marge", mg == null ? "–" : f3Nb(Math.round(mg), 0) + " €", f3Ton(m && m.p), "gardés sur 100 € de ventes", m, mm != null ? `secteur : ${f3Nb(Math.round(mm * 100), 0)} € · ${f3Rang(m)}` : "",
      mg == null ? null : [`Sur 100 € de ventes, il reste <b>${f3Nb(mg)} €</b> à ${esc(nm)} une fois payés la fabrication, les salaires, les loyers et la publicité (résultat d'exploitation : ${f3Montant(s.ebit, cur)}).${mm != null ? ` La médiane du secteur est de <b>${f3Nb(mm * 100)} €</b>.` : ""}`, m ? (m.rank <= 5 ? `Seules ${m.rank - 1} des ${m.n} entreprises du secteur font mieux.` : `${esc(nm)} est ${f3Rang(m)} entreprises du secteur sur ce point.`) : "", "Résultat d'exploitation divisé par le chiffre d'affaires."], "rf-rentab", "Rentabilité"]);
  }
  // Dette
  const sd = ax.solidite, nd = s.netDebt, eb = s.ebitda;
  if (!bank) {
    let v, sub, ex;
    if (nd != null && nd < 0) { v = "Aucune"; sub = `${f3Montant(-nd, cur)} de trésorerie nette`; ex = [`${esc(nm)} a plus d'argent en caisse que de dettes : <b>${f3Montant(-nd, cur)} de trésorerie nette</b> à la clôture de ${s.year}.`, s.netDebtBaux != null && s.leases ? (s.netDebtBaux < 0 ? `Même en comptant ses loyers à payer (${f3Montant(s.leases, cur)}), il lui resterait ${f3Montant(-s.netDebtBaux, cur)}.` : `En comptant ses loyers à payer (${f3Montant(s.leases, cur)}), elle aurait ${f3Montant(s.netDebtBaux, cur)} de dette nette.`) : "", "Trésorerie moins dettes financières, à la clôture de l'exercice."]; }
    else if (nd != null) { const mo = eb > 0 ? nd / eb * 12 : null; v = !sd ? f3Montant(nd, cur) : sd.p >= 0.6 ? "Faible" : sd.p > 0.4 ? "Moyenne" : "Élevée"; sub = `${f3Montant(nd, cur)} de dette nette`; const lm = f3Med(s, x => ratios(x).lev);
      ex = [`${esc(nm)} doit <b>${f3Montant(nd, cur)}</b> de plus qu'elle n'a en caisse.${mo != null ? ` C'est ${mo < 24 ? `${Math.max(1, Math.round(mo))} mois` : `${f3Nb(mo / 12)} années`} de son résultat brut d'exploitation.` : ""}`, lm != null ? `La médiane du secteur est de ${f3Nb(lm)} année${lm >= 2 ? "s" : ""} de résultat brut.` : "", "Dettes financières moins trésorerie, rapportées au résultat brut d'exploitation (EBITDA)."]; }
    else { v = "–"; sub = "non disponible"; ex = null; }
    L.push(["solidite", "Dette", v, nd != null && nd < 0 ? "g" : f3Ton(sd && sd.p), sub, sd, sd ? f3Rang(sd) + (nd != null && nd < 0 && sd.rank === 1 ? ", ex æquo" : "") : "", ex, "rf-dette", "Bilan et trésorerie"]);
  } else {
    const eq = s.equity; L.push(["solidite", "Fonds propres", eq != null ? f3Montant(eq, cur) : "–", "n", "capitaux propres", null, "", eq != null ? [`Les capitaux propres de ${esc(nm)} s'élèvent à <b>${f3Montant(eq, cur)}</b> à la clôture de ${s.year}.`, "Pour une banque, la dette fait partie du métier : on regarde plutôt la solidité de ses fonds propres, détaillée dans « Bilan ».", "Capitaux propres, part du groupe."] : null, "rf-dette", "Bilan et trésorerie"]);
  }
  // Dividende
  const y = f3Yld(s), ym = f3Med(s, f3Yld), dv = ax.dividende, dpsOk = s.dps > 0 && !s.dpsE, pay = r.payout;
  L.push(["dividende", "Dividende", y != null && y > 0.0005 ? f3Nb(y * 100) + " %" : "Aucun", y != null && y > 0.0005 ? f3Ton(dv && dv.p) : "n", dpsOk ? `${f3Nb(s.dps, s.dps % 1 ? 2 : 0)} ${f3Cur(cur).trim()} par action` : y > 0.0005 ? "rendement estimé" : "pas de dividende versé", dv, ym != null ? `secteur : ${f3Nb(ym * 100)} % · ${f3Rang(dv)}` : "",
    y != null && y > 0.0005 ? [`${dpsOk ? `${esc(nm)} verse <b>${f3Nb(s.dps, s.dps % 1 ? 2 : 0)} ${f3Cur(cur).trim()} par action</b> au titre de ${s.year}. ` : ""}Au cours actuel, cela fait <b>${f3Nb(y * 100)} % par an</b>${ym != null ? `, contre ${f3Nb(ym * 100)} % pour la médiane du secteur` : ""}.${dpsOk ? "" : " Le montant par action est estimé à partir des dividendes versés."}`, pay != null && pay > 0 && pay < 1.5 ? `${f3Nb(pay * 100, 0)} % de son bénéfice part en dividendes.` : "", "Dividende par action divisé par le cours."] : [`${esc(nm)} ne verse pas de dividende sur son dernier exercice.`, "Une entreprise peut préférer réinvestir ses bénéfices ou racheter ses propres actions.", ""], "rf-div", "Dividende"]);
  // Prix
  const pe = f3Pe(s), pm = f3Med(s, f3Pe), px = ax.prix, cap = (() => { try { const v = valo(s); return v && v.capE; } catch (e) { return null; } })();
  L.push(["prix", "Prix de l'action", pe != null ? f3Nb(Math.round(pe), 0) + " fois" : "–", f3Ton(px && px.p), pe != null ? "son bénéfice annuel" : "bénéfice négatif ou absent", px, pm != null ? `secteur : ${f3Nb(Math.round(pm), 0)} fois · ${f3Rang(px)}` : "",
    pe != null ? [`En Bourse, ${esc(nm)} vaut ${cap ? `<b>${f3Montant(cap / 1e6, "EUR")}</b>, soit ` : ""}<b>${f3Nb(Math.round(pe), 0)} fois</b> son bénéfice annuel.${pm != null ? ` La médiane du secteur est de ${f3Nb(Math.round(pm), 0)} fois.` : ""}`, "Plus ce chiffre est élevé, plus les investisseurs paient cher chaque euro de bénéfice. Ce n'est ni un signal d'achat ni un signal de vente : c'est ce que le marché paie aujourd'hui.", "Capitalisation divisée par le bénéfice net (PER)."] : null, "rf-valo", "Prix en Bourse"]);
  return L;
}

function f3HeroHTML(s, c) {
  const p = pxOf(s), cur = (p && p.cur) || s.currency, R5 = f3Reperes(s, c), verd = rfVerdictMots(s) || "";
  const parts = verd.split(", "), last = parts.length > 1 ? parts.pop() : null;
  
  let rng = "";
  if (p && p.h52 > 0 && p.l52 > 0 && p.h52 / p.l52 <= 3 && p.p) {
    const pos = Math.max(0, Math.min(100, (p.p - p.l52) / (p.h52 - p.l52) * 100)), sous = (1 - p.p / p.h52) * 100;
    rng = `<div class="f3-rng"><div class="f3-t"><b style="left:${pos.toFixed(0)}%"></b></div><div class="f3-tl2"><span>1 an · plus bas ${f3Px0(p.l52, cur)}</span><span>${sous >= 1 ? `${f3Nb(Math.round(sous), 0)} % sous le plus haut` : "au plus haut"}</span><span>${f3Px0(p.h52, cur)}</span></div></div>`;
  }
  const fiche = s.fiche && typeof s.fiche === "object" ? s.fiche : null;
  return `<section class="f3-hero"><div class="f3-w">
    <div class="f3-top"><div>
      <div class="f3-id">${logo(s, 72)}<div><h1>${esc(s.name)}</h1><p>${esc((fiche && fiche.fait) || s.desc || "")}</p></div></div>
      <div class="f3-tags" id="f3-tags"></div>
    </div>
    ${p && p.p ? `<div class="f3-price pxhead"><b class="p">${a4Px(p.p, cur)}</b><span class="f3-chg ${accCls(p.chg)}">${accPct(p.chg)} ${esc(jourSeance())}</span><small>Cours différé${s.tv ? " · " + esc(s.tv.split(":")[0]) : ""}</small>${rng}</div>` : ""}</div>
    ${verd ? `<div class="f3-verdict"><span class="a4-stk a4-wh">Le verdict</span><h2 class="rf-vc">${esc(parts.join(", "))}${last ? `, <span class="${/chère|cher/i.test(last) ? "o" : /bon marché/i.test(last) ? "g" : ""}">${esc(last)}.</span>` : "."}</h2></div>` : ""}
    <div class="f3-five">${R5.map(([k, t, v, ton, sub, r, sec, ex], i) => `<div class="f3-r" data-f3r="${i}"><small>${esc(t)}</small><strong class="${ton}">${esc(v)}</strong><span class="f3-q">${esc(sub)}</span>${r ? `<div class="f3-ms"><i>médiane</i><b style="left:${(r.p * 100).toFixed(0)}%"></b></div>` : `<div class="f3-ms f3-ms0"></div>`}<em>${esc(sec)}</em>${ex ? `<button type="button" class="f3-lnk" data-f3x="${i}">Explication +</button>` : ""}</div>`).join("")}</div>
    <div class="f3-why" id="f3-why" hidden></div>
    <div class="f3-acts" id="f3-acts"></div>
  </div></section>`;
}

function f3Chart(vals, yrs, cur, inv) { // colonnes sur 4 ans, axe gradué, variation sous chaque année
  const W = 320, H = 200, Lx = 36, T = 26, B = 150, lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const big1 = Math.max(Math.abs(lo), Math.abs(hi)) >= 1000, k = big1 ? 1000 : 1, u = big1 ? "Md" : "M";
  const span = (hi - lo) / k || 1, stepRaw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(stepRaw))), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(m => m >= stepRaw) || stepRaw;
  const top = Math.ceil(hi / k / step) * step, bot = Math.floor(lo / k / step) * step, sy = v => B - (B - T) * (v / k - bot) / ((top - bot) || 1);
  let o = "";
  for (let t = bot; t <= top + 1e-9; t += step) { const yy = sy(t * k); o += `<line x1="${Lx}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#E6E3DA" ${Math.abs(t) > 1e-9 ? 'stroke-dasharray="3 4"' : 'stroke="#999"'}/><text x="${Lx - 6}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#888">${f3Nb(t, step < 1 ? 1 : 0)}</text>`; }
  const n = vals.length, bw = Math.min(46, (W - Lx) / n * 0.62), gap = (W - Lx - bw * n) / n;
  vals.forEach((v, i) => {
    const x = Lx + gap / 2 + i * (bw + gap), y0 = sy(0), y1 = sy(v), last = i === n - 1;
    o += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${bw}" height="${Math.max(2, Math.abs(y1 - y0))}" rx="7" fill="${last ? "#FFE14D" : v < 0 ? "#FFD0C4" : "#F2F0EA"}" stroke="#111" stroke-width="2"/>`;
    o += `<text x="${x + bw / 2}" y="${(v >= 0 ? y1 - 7 : y1 + 15)}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#111">${f3Nb(v / k, Math.abs(v / k) >= 100 ? 0 : 1)}</text>`;
    o += `<text x="${x + bw / 2}" y="${B + 17}" text-anchor="middle" font-size="11" font-weight="700" fill="#555">${yrs[i]}</text>`;
    if (i && vals[i - 1] > 0 && v > 0) { const c = (v / vals[i - 1] - 1) * 100, good = inv ? c <= 0 : c >= 0; o += `<rect x="${x + bw / 2 - 25}" y="${B + 25}" width="50" height="17" rx="8.5" fill="${good ? "#C9F6E3" : "#FFD9D1"}"/><text x="${x + bw / 2}" y="${B + 37.5}" text-anchor="middle" font-size="10" font-weight="800" fill="${good ? "#006B48" : "#C2260E"}">${f3Pct(c)}</text>`; }
  });
  return `<svg class="f3-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valeurs en ${u}${esc(f3Cur(cur))}">${o}</svg>`;
}
function f3Serie(c, k, n = 4) { if (!c || !c.fin || !c.fin[k]) return null; const L = c.years.map((y, i) => [y, c.fin[k][i]]).filter(([, v]) => v != null && isFinite(v)).slice(-n); return L.length >= 2 ? L : null; }
function f3SeuleHTML(s, c) {
  const cur = c && c.currency || s.currency, bank = isBank(s), out = [];
  const bloc = (titre, L, cle, inv, sousF) => { const v = L.map(x => x[1]), y = L.map(x => x[0]), first = v[0], lastv = v[v.length - 1], prev = v[v.length - 2];
    const sous = sousF ? sousF(v) : (first > 0 && lastv > 0 ? `${f3Pct((lastv / first - 1) * 100, 0)} depuis ${y[0]}` : "");
    const ton = sousF ? "g" : (first > 0 && lastv > 0 ? ((lastv >= first) !== !!inv ? "g" : "o") : "n");
    return `<div class="f3-ch"><h3>${titre}</h3><div class="f3-big">${f3Montant(Math.abs(lastv), cur)}<small class="${ton}">${esc(sous)}</small></div>${f3Chart(v, y, cur, inv)}<a class="f3-pv" data-f3anc="${cle}" data-an="${y[y.length - 1]}" href="#rf-sources">Voir les sources ↓</a></div>`; };
  const ca = f3Serie(c, "ca"); if (ca) out.push(bloc(bank ? "Son produit net bancaire" : "Ses ventes", ca, "ca"));
  const net = f3Serie(c, "net"); if (net) out.push(bloc("Son bénéfice", net, "net", false, v => { const a = v[v.length - 1], b = v[v.length - 2]; return b > 0 && a > 0 ? `${f3Pct((a / b - 1) * 100)} en ${net[net.length - 1][0]}` : a < 0 ? "perte" : ""; }));
  const nd = f3Serie(c, "netDebt");
  if (!bank && nd) { const last = nd[nd.length - 1][1]; if (last < 0) out.push(bloc("Sa trésorerie nette", nd.map(([y, v]) => [y, -v]), "cash", false, () => "aucune dette nette")); else out.push(bloc("Sa dette nette", nd, "debt", true, v => { const a = v[v.length - 1], b = v[0]; return b > 0 ? `${f3Pct((a / b - 1) * 100, 0)} depuis ${nd[0][0]}` : ""; })); }
  else { const eq = f3Serie(c, "equity"); if (eq) out.push(bloc("Ses fonds propres", eq, "equity")); }
  if (!out.length) return "";
  const na = Math.max(...[ca, net, nd].filter(Boolean).map(x => x.length)), mots = ["", "", "deux", "trois"];
  return `<section class="f3-sec"><span class="a4-stk a4-ye">1 · Elle seule</span><h2>${na} ans de comptes en ${mots[out.length] || out.length} image${out.length > 1 ? "s" : ""}.</h2><div class="f3-tri">${out.join("")}</div></section>`;
}
function f3CritCards(crit, L, s, lien = true) { // une carte par critère : classement de la mieux placée à la moins bien, barres depuis zéro, médiane du secteur en repère sous l'axe
  return crit.map(([t, f, fmt, mf, sens, ex, pli, plil]) => {
    const rows = L.map(c => ({ c, v: f(c) })), ok = rows.filter(r => r.v != null && isFinite(r.v)); if (ok.length < 2) return "";
    const med = mf ? mf(s) : null, vs = [...ok.map(r => Math.abs(r.v)), med != null ? Math.abs(med) : 0], max = Math.max(...vs) || 1, wid = v => Math.max(3, Math.abs(v) / max * 100);
    const tri = [...ok].sort((a, b) => sens === "hi" ? b.v - a.v : a.v - b.v), na = rows.filter(r => !(r.v != null && isFinite(r.v)));
    return `<div class="f3-ch f3-cc"><h3>${esc(t)}</h3><details class="f3-cq"><summary>C'est quoi ?</summary><p>${esc(ex)}${lien && pli ? ` <a href="#${pli}" data-f3go="${pli}">Tout le détail dans « ${esc(plil)} » ↓</a>` : ""}</p></details>
      <div class="f3-cr2">${tri.map(({ c, v }, i) => `<div class="f3-rw2${c === s ? " me" : ""}${i === 0 ? " best" : i === tri.length - 1 ? " worst" : ""}"><span class="f3-rg">${i + 1}</span><a href="/entreprise/${c.id}">${esc(c.name)}</a><b>${fmt(v)}</b><div class="f3-tk2">${v < 0 ? "" : `<i style="width:${wid(v).toFixed(1)}%"></i>`}</div></div>`).join("")}
      ${na.map(({ c }) => `<div class="f3-rw2 na"><span class="f3-rg">–</span><a href="/entreprise/${c.id}">${esc(c.name)}</a><b>non calculable</b><div class="f3-tk2"></div></div>`).join("")}
      ${med != null ? `<div class="f3-md2"><div class="f3-tk2"><i style="left:${wid(med).toFixed(1)}%"></i></div><span>médiane du secteur : <b>${fmt(med)}</b> (repère noir)</span></div>` : ""}</div></div>`; }).filter(Boolean);
}
function f3AutresHTML(s) {
  const pr = peersOf(s, 4).list.filter(c => !c.missing).slice(0, 4); if (pr.length < 2) return "";
  const bank = isBank(s), L = [s, ...pr];
  const crit = [
    bank ? ["Rentabilité : ce qu'elles gagnent sur 100 € de capitaux propres", c => ratios(c).roe, v => f3Nb(v * 100) + " €", s => f3Med(s, x => ratios(x).roe), "hi", "Le bénéfice net rapporté aux capitaux propres (ROE). C'est la mesure de rentabilité usuelle pour une banque.", "rf-rentab", "Rentabilité"]
      : ["Marge : ce qu'il leur reste sur 100 € de ventes", c => ratios(c).marge, v => f3Nb(Math.round(v * 100), 0) + " €", s => f3Med(s, x => ratios(x).marge), "hi", "La marge d'exploitation : ce qui reste des ventes une fois payés la fabrication, les salaires, les loyers et la publicité, avant les impôts et les intérêts. Plus elle est haute, plus l'entreprise gagne d'argent sur ce qu'elle vend.", "rf-rentab", "Rentabilité"],
    ["Croissance : l'évolution de leurs ventes sur un an", c => ratios(c).g1, v => f3Pct(v * 100), s => f3Med(s, x => ratios(x).g1), "hi", "La hausse (ou la baisse) du chiffre d'affaires sur le dernier exercice. Elle dit si l'entreprise vend de plus en plus, ou de moins en moins.", "rf-resultats", "Résultats"],
    ["Prix : combien d'années de bénéfice coûte l'action", f3Pe, v => f3Nb(Math.round(v), 0) + " fois", s => f3Med(s, f3Pe), "lo", "Le PER compare la valeur de l'entreprise en Bourse à son bénéfice annuel. 30 fois veut dire qu'il faudrait 30 ans de bénéfice actuel pour atteindre le prix payé. Plus il est bas, moins l'action est chère au regard de ce qu'elle gagne.", "rf-valo", "Prix en Bourse"]];
  const cards = f3CritCards(crit, L, s);
  if (!cards.length) return "";
  const absents = peersOf(s, 4).list.filter(c => c.missing).map(c => c.name);
  return `<section class="f3-sec"><span class="a4-stk a4-bl">2 · Face aux autres</span><h2>${esc(s.name)} contre ses rivales.</h2><div class="f3-cmp">${cards.join("")}</div>
    <div class="f3-leg"><span><i class="b"></i>la mieux placée</span><span><i class="w"></i>la moins bien placée</span><span>Pour le prix, la mieux placée est celle au PER le plus bas.</span></div>
    <div class="f3-cta2"><span>${absents.length ? `${esc(listFr(absents))} : données incomplètes sur le site.` : "Tous les critères, côte à côte."}</span><a href="/comparer?ids=${[s, ...pr].map(c => c.id).join(",")}">Comparer en détail →</a></div></section>`;
}
function f3Questions(s) {
  const r = ratios(s), q = [], ax = {}; rfAxes(s).forEach(a => { ax[a.k] = a.r; });
  if (ax.prix && ax.prix.p <= 0.4) q.push(`Pourquoi l'action ${s.name} coûte-t-elle autant ?`); else if (ax.prix && ax.prix.p >= 0.6) q.push(`Pourquoi l'action ${s.name} coûte-t-elle si peu ?`);
  if (s.net != null && s.netPrev > 0 && s.net < s.netPrev) q.push(`Pourquoi le bénéfice a-t-il baissé en ${s.year} ?`); else if (r.g1 != null && r.g1 > 0.1) q.push(`D'où vient la croissance de ${s.name} ?`);
  q.push(s.netDebt != null && s.netDebt < 0 ? "Que fait-elle de sa trésorerie ?" : `La dette de ${s.name} est-elle un risque ?`);
  q.push(`Comment ${s.name} gagne-t-elle de l'argent ?`);
  return q.slice(0, 3);
}
function f3Recomposer(s, c) {
  const root = $("#app"); if (!root || $(".f3", root)) return;
  const tvch = $("#tvchart"), tags = $(".fh-tags"), act = $(".fh-act"), metier = $("#rf-metier"), change = $("#rf-change"), tous = $("#tous-les-chiffres"), crumbs = $(".crumbs-fiche"), fiab = $("details.fiab");
  if (!tous) return; // la fiche n'a pas son contenu habituel (entreprise sans comptes) : on la laisse telle quelle
  const R5 = f3Reperes(s, c), wrap = document.createElement("div"); wrap.className = "f3";
  wrap.innerHTML = f3HeroHTML(s, c) + `<div class="f3-main">${f3SeuleHTML(s, c)}${f3AutresHTML(s)}
    <section class="f3-sec" id="f3-metier"><span class="a4-stk a4-gr">3 · Son métier</span><h2>${esc(s.name)} en chiffres.</h2><div id="f3-metw"></div></section>
    <section class="f3-sec" id="f3-actu"><span class="a4-stk a4-pk">4 · Son actualité</span><h2>Ce qui vient de tomber, ce qui arrive.</h2><div id="f3-actw"></div></section>
    <div class="f3-proof"><span class="a4-stk a4-ye">Prouvé</span><p id="f3-prt">Les chiffres de cette page viennent des <b>comptes officiels</b> de ${esc(s.name)}.</p><a id="f3-pra" href="#rf-sources" data-f3go="rf-sources">Voir les sources ↓</a></div>
    <section class="f3-sec" id="f3-tous"><span class="a4-stk a4-wh">Pour aller plus loin</span><h2>Tous les chiffres, en détail.</h2><p class="f3-lead">Les cinq repères du haut de page, chiffre par chiffre et année par année, avec leurs explications.</p><div id="f3-tousw"></div></section>
  </div>
  <section class="f3-ask"><div class="f3-w"><div class="f3-iah"><span class="f3-iab">${F3_IA}</span><h2>Une question sur ${esc(s.name)} ?</h2></div><div class="f3-qs">${f3Questions(s).map(q => `<button type="button" data-f3q="${esc(q)}">${esc(q)}</button>`).join("")}</div><p>L'IA du site répond avec les chiffres de cette page. Information factuelle, sans conseil.</p></div></section>`;
  // déplacer les blocs existants (leurs boutons gardent leur fonctionnement)
  const tg = $("#f3-tags", wrap); if (tags) tg.appendChild(tags);
  const ac = $("#f3-acts", wrap);
  if (act) { const ia = act.querySelector(".fh-ia"); if (ia) { ia.classList.add("f3-ia"); ia.innerHTML = F3_IA + "Poser une question à l'IA"; ac.appendChild(ia); } $$(".favbtn", act).forEach(b => ac.appendChild(b)); }
  if (tvch) ac.insertAdjacentHTML("beforeend", `<a class="favbtn" href="#rf-cours" data-f3go="rf-cours">Voir le graphique du cours</a>`);
  if (fiab) { fiab.classList.add("f3-fiab"); tg.appendChild(fiab); }
  const mw = $("#f3-metw", wrap), mt = metier && metier.querySelector("#metier"), fms = mt ? $$(".fm", mt) : [], fi = s.fiche && typeof s.fiche === "object" ? s.fiche : null;
  if (fms[0]) mw.appendChild(fms[0]);
  if (fi && (fi.fait || fi.argent || fi.depend)) mw.insertAdjacentHTML("beforeend", `<div class="f3-met">${[["Ce qu'elle fait", fi.fait], ["Comment elle gagne de l'argent", fi.argent], ["Ce dont elle dépend", fi.depend]].filter(x => x[1]).map(([t, v]) => `<div><small>${t}</small><p>${esc(v)}</p></div>`).join("")}</div>`);
  if (fms[1]) { const p0 = fms[1].querySelector(":scope > p"); if (p0 && fi && fi.argent && p0.textContent.trim() === fi.argent.trim()) p0.remove(); const h = fms[1].querySelector("h3"); if (h) h.textContent = false ? `D'où viennent ses ${f3Montant(s.ca, s.currency).replace(/\u00a0Md(.*)$/, " milliards de ventes").replace(/\u00a0M(.*)$/, " millions de ventes")}` : "D'où viennent ses ventes"; mw.appendChild(fms[1]); }
  f3Repartitions(mw);
  if (!mw.children.length && mt) { const p1 = mt.querySelector(".f1p"); if (p1) mw.appendChild(p1); }
  if (!mw.children.length) $("#f3-metier", wrap).remove();
  const aw = $("#f3-actw", wrap); if (change) { const pb = change.querySelector(".ph"); if (pb) pb.remove(); while (change.firstChild) aw.appendChild(change.firstChild); } else $("#f3-actu", wrap).remove(); try { f3Actu(aw); } catch (e) { console.error("f3 actu", e); }
  const tw = $("#f3-tousw", wrap); const head = tous.querySelector(".rf-l2h"); if (head) head.remove();
  if (tvch) { const d = document.createElement("details"); d.className = "rf-pl rf-pl2"; d.id = "rf-cours"; d.innerHTML = `<summary><span class="rf-plt"><b>Le cours de l'action</b><span>Graphique sur un an, cours différé</span></span><span class="rf-plo" aria-hidden="true"><i>Ouvrir</i><i>Fermer</i></span></summary><div class="rf-plb"></div>`; d.querySelector(".rf-plb").appendChild(tvch); tous.insertBefore(d, tous.firstChild); }
  if (metier) { try { f3Identite(mw, metier, s); } catch (e) { console.error("f3 identité", e); } metier.remove(); } // 2/11 : plus de pli « Activités, pays, dirigeants » (doublon) : ce qui manquait rejoint « Son métier »
  tw.appendChild(tous);
  try { f3Themes(tw, s, c); } catch (e) { console.error("f3 thèmes", e); }
  // remplacer la page
  const old = [...root.children]; root.innerHTML = ""; if (crumbs) root.appendChild(crumbs); root.appendChild(wrap);
  const rest = document.createElement("div"); rest.className = "f3-rest"; old.forEach(n => { if (n !== crumbs && n.id !== "ctab") rest.appendChild(n); }); // conservé hors de la vue : rien n'est détruit
  rest.hidden = true; root.appendChild(rest);
  try { f3Chaine(tw); } catch (e) { console.error("f3 chaîne", e); }
  const ctab = old.find(n => n.id === "ctab"); if (ctab) { $$("#etapes-corps > section", ctab).forEach(x => { if (!x.contains(tous)) x.remove(); }); ctab.hidden = true; root.appendChild(ctab); }
  // explications
  wrap.addEventListener("click", e => {
    const b = e.target.closest("[data-f3x], .f3-r"); if (b && wrap.contains(b) && !e.target.closest("a")) { const i = +(b.dataset.f3x || b.dataset.f3r), r = R5[i]; if (!r || !r[7]) return; const w = $("#f3-why"), on = w.dataset.i === String(i) && !w.hidden;
      $$(".f3-r", wrap).forEach(x => x.classList.toggle("on", !on && x.dataset.f3r === String(i)));
      if (on) { w.hidden = true; w.dataset.i = ""; return; }
      w.dataset.i = i; w.hidden = false; w.innerHTML = `<p class="f3-wk">Explication · ${esc(r[1])}</p>${r[7].filter(Boolean).slice(0, 2).map(x => `<p>${x}</p>`).join("")}${r[7][2] ? `<small>${esc(r[7][2])}</small>` : ""}<a class="f3-det" href="#${r[8]}" data-f3go="${r[8]}">Tout le détail dans « ${esc(r[9])} » ↓</a>`; return; }
    const g = e.target.closest("[data-f3go]"); if (g) { e.preventDefault(); const t = document.getElementById(g.dataset.f3go); if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView({ behavior: "smooth", block: "start" }); if (g.dataset.f3go === "rf-cours" && typeof ficheGraphique === "function") ficheGraphique(s); } return; }
    const q = e.target.closest("[data-f3q]"); if (q && typeof orcIaOpen === "function") { orcIaOpen(); if (typeof orcIaAsk === "function") orcIaAsk(q.dataset.f3q); }
  });
  // liens vers la ligne exacte du rapport officiel
  if (typeof ancreLiens === "function") $$("[data-f3anc]", wrap).forEach(async a => { try { const k = a.dataset.f3anc, l = await ancreLiens(s.id, [k === "debt" ? "cash" : k], a.dataset.an); if (l && l[0]) { a.href = l[0].url; a.target = "_blank"; a.rel = "noopener"; a.textContent = `${l[0].lbl} ${l[0].an} dans le rapport officiel ↗`; } } catch (e) { } });
  const src = typeof provSrcComptes === "function" ? provSrcComptes(c) : null, fb = typeof fiabilite === "function" ? fiabilite(s, c) : null;
  if (src) { $("#f3-prt").innerHTML = `Les chiffres de cette page viennent des <b>comptes officiels</b> de ${esc(s.name)} : ${esc(src.label.charAt(0).toLowerCase() + src.label.slice(1))}.${fb ? ` Fiabilité des données : ${esc(fb.mot)}.` : ""}`; if (src.url) { const a = $("#f3-pra"); a.href = src.url; a.target = "_blank"; a.rel = "noopener"; a.removeAttribute("data-f3go"); a.textContent = "Ouvrir le rapport ↗"; } }
}
const F3_COUL = ["#FFE14D", "#FF9EC6", "#9DB0FF", "#7FE0B9", "#FFB98A", "#C9B8FF", "#E6E3DA", "#B9E6F5"];
function f3Repartitions(root) { // « D'où viennent ses ventes » : chaque liste de barres devient une barre empilée en couleurs + sa légende (maquette v3)
  const cartes = []; let hote = null;
  $$(".fbt", root).forEach(t => { if (!/activit|zone|g[ée]ograph|pays|r[ée]gion/i.test(t.textContent)) return; hote = hote || t.parentElement; const bars = t.nextElementSibling; if (!bars || !bars.classList.contains("fbars")) return;
    const L = $$(".fbar", bars).map(r => ({ n: (r.querySelector(".l") || {}).textContent || "", w: parseFloat(((r.querySelector(".b i") || {}).style || {}).width) || 0, p: (r.querySelector(".p") || {}).textContent || "", a: (r.querySelector(".a") || {}).textContent || "" })).filter(x => x.w > 0);
    if (!L.length) return;
    const tot = L.reduce((a, x) => a + x.w, 0) || 1;
    cartes.push(`<div class="f3-ch f3-mix"><h3>${esc(t.textContent)}</h3><div class="f3-stack">${L.map((x, i) => `<i style="width:${(x.w / tot * 100).toFixed(2)}%;background:${F3_COUL[i % F3_COUL.length]}" title="${esc(x.n)} ${esc(x.p)}"></i>`).join("")}</div><ul class="f3-mx">${L.map((x, i) => `<li><i style="background:${F3_COUL[i % F3_COUL.length]}"></i><span>${esc(x.n)}</span><b>${esc(x.p)}</b><em>${esc(x.a)}</em></li>`).join("")}</ul></div>`);
    t.remove(); bars.remove(); });
  if (!cartes.length) return;
  const fm = hote || root, w = document.createElement("div"); w.className = "f3-mixes"; w.innerHTML = cartes.join("");
  const ps = $$(":scope > p:not(.fbt)", fm), apres = ps.length ? ps[ps.length - 1] : fm.querySelector("h3");
  if (apres && apres.nextSibling) fm.insertBefore(w, apres.nextSibling); else fm.appendChild(w);
  $$(":scope > p, :scope > a, :scope > .src", fm).forEach(x => { const ia = x.querySelector("button"); if (ia) { ia.classList.add("f3-iam"); x.replaceWith(ia); } else x.remove(); }); // 2/11 : sous le titre, seulement le bouton IA
}
const F3_IA = `<svg class="f3-iai" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" fill="currentColor"/><path d="M19 2l.8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8z" fill="currentColor"/></svg>`;
(() => { // branchement : après la construction habituelle de la fiche (vue principale seulement)
  const pc0 = window.pageCompany; if (typeof pc0 !== "function") return;
  window.pageCompany = async function (id, tab) {
    await pc0.apply(this, arguments);
    if (tab || !F3.on) return;
    const s = RBY[id]; if (!s || s.missing || !ficheMemeId(id)) return;
    try { f3Recomposer(s, FULL[id] || null); } catch (e) { console.error("fiche v3", e); }
  };
})();

/* ---------- 2/11 (Romain : « chaque section doit suivre la DA, supprime les doublons ») ----------
   Les plis thématiques de « Tous les chiffres » (Résultats, Rentabilité, Bilan, Flux) sont reconstruits dans le style v3 à partir des
   lignes de tableaux.js (tblxRows) : une tuile par indicateur (chiffre, variation, médiane, bouton i), un seul graphique en colonnes
   (même dessin qu'en haut de la fiche, médiane en pointillé), la lecture en jaune et « C'est quoi ? ». Plus de rangée de pastilles
   ni de liste « Le détail année par année » : elles répétaient les tuiles. Le tableau complet reste dans « Comptes complets ». */
function f3Cols(vals, yrs, fmt, med, inv, kind) { // colonnes v3 pour n'importe quelle grandeur (montant, %, ratio)
  const V = vals.map(v => v == null ? 0 : v), all = med != null ? [...V, med] : V, lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  const W = 320, H = 200, Lx = 44, T = 26, B = 150, span = (hi - lo) || 1, stepRaw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(stepRaw))), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(m => m >= stepRaw) || stepRaw;
  const top = Math.ceil(hi / step) * step, bot = Math.floor(lo / step) * step, sy = v => B - (B - T) * (v - bot) / ((top - bot) || 1);
  const tick = v => kind === "money" ? f3Nb(v >= 1000 || v <= -1000 ? v / 1000 : v, Math.abs(v) >= 100 ? 0 : 1) + (Math.abs(v) >= 1000 ? " Md" : " M") : kind === "pct" || kind === "pctS" ? f3Nb(v * 100, 0) + " %" : f3Nb(v, step < 1 ? 1 : 0);
  let o = "";
  for (let t = bot; t <= top + 1e-9; t += step) { const yy = sy(t); o += `<line x1="${Lx}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#E6E3DA" ${Math.abs(t) > 1e-9 ? 'stroke-dasharray="3 4"' : 'stroke="#999"'}/><text x="${Lx - 6}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#888">${tick(t)}</text>`; }
  const n = vals.length, bw = Math.min(46, (W - Lx) / n * 0.62), gap = (W - Lx - bw * n) / n;
  vals.forEach((v, i) => {
    const x = Lx + gap / 2 + i * (bw + gap), last = i === n - 1;
    o += `<text x="${x + bw / 2}" y="${B + 17}" text-anchor="middle" font-size="11" font-weight="${last ? 800 : 700}" fill="${last ? "#111" : "#555"}">${yrs[i]}</text>`;
    if (v == null) { o += `<text x="${x + bw / 2}" y="${B - 8}" text-anchor="middle" font-size="11" fill="#999">–</text>`; return; }
    const y0 = sy(0), y1 = sy(v);
    o += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${bw}" height="${Math.max(2, Math.abs(y1 - y0))}" rx="7" fill="${last ? "#FFE14D" : v < 0 ? "#FFD0C4" : "#F2F0EA"}" stroke="#111" stroke-width="2"/>`;
    o += `<text x="${x + bw / 2}" y="${(v >= 0 ? y1 - 7 : y1 + 15)}" text-anchor="middle" font-size="12" font-weight="800" fill="#111">${esc(fmt(v))}</text>`;
    const p = vals[i - 1]; if (i && p != null && ((kind === "money" || kind === "ps") ? p > 0 && v > 0 : true)) {
      const c = (kind === "money" || kind === "ps") ? (v / p - 1) * 100 : (v - p) * (kind === "pct" || kind === "pctS" ? 100 : 1), good = inv ? c <= 0 : c >= 0, txt = (kind === "money" || kind === "ps") ? f3Pct(c, 1) : (c > 0 ? "+" : c < 0 ? "−" : "") + f3Nb(Math.abs(c), 1) + (kind === "x" ? "" : " pt");
      o += `<rect x="${x + bw / 2 - 27}" y="${B + 25}" width="54" height="17" rx="8.5" fill="${good ? "#C9F6E3" : "#FFD9D1"}"/><text x="${x + bw / 2}" y="${B + 37.5}" text-anchor="middle" font-size="10" font-weight="800" fill="${good ? "#006B48" : "#C2260E"}">${txt}</text>`; }
  });
  if (med != null && med >= bot && med <= top) { const ym = sy(med); o += `<line x1="${Lx}" x2="${W}" y1="${ym}" y2="${ym}" stroke="#111" stroke-width="2" stroke-dasharray="6 5"/><rect x="${W - 92}" y="${ym - 19}" width="92" height="16" rx="6" fill="#111"/><text x="${W - 46}" y="${ym - 7.5}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">médiane ${esc(fmt(med))}</text>`; }
  return `<svg class="f3-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution par exercice">${o}</svg>`;
}
const F3_INV = { lev: 1, gear: 1, debt: 1, netDebt: 1, capex: 0 }; // moins, c'est mieux
function f3Themes(tw, s, c) {
  if (typeof tblxRows !== "function" || !c || !c.years) return;
  const P = tblxRows(s, c), Y = c.years;
  $$("section.rf-th2", tw).forEach(sec => {
    const keys = $$(".rf-kts .rf-kt, .rf-gsel button", sec).map(b => b.dataset.g).filter(Boolean), rows = [...new Set(keys)].map(k => P.rows.find(r => r.k === k)).filter(Boolean);
    if (!rows.length) return;
    const q = sec.querySelector(".ph h2 small"), ex = sec.querySelector(".rf-thx"), ctx = sec.querySelector(".rf-ctx, .ctx-chiffres");
    const tile = r => { const chg = tblxChange(r.kind, r.prev, r.last), cls = r.q > 0 ? "u" : r.q < 0 ? "d" : "n", ly = Y[r.li], yl = Y.at(-1);
      return `<div class="f3-kt" role="button" tabindex="0" data-f3k="${r.k}"><small>${esc(r.short || r.label)}${ly !== yl ? ` (${ly})` : ""}${tblxProv(r.k, s)}</small><b>${esc(r.full(r.last))}</b>${chg ? `<span class="${cls}">${r.dir > 0 ? "↑" : r.dir < 0 ? "↓" : "→"} ${esc(chg)}</span>` : `<span class="n">–</span>`}${r.med != null ? `<em>médiane du secteur ${esc(r.full(r.med))}</em>` : "<em></em>"}</div>`; }; // div et non button : la tuile contient le bouton « i »
    const w = document.createElement("div"); w.className = "f3-th"; w.dataset.th = sec.id;
    w.innerHTML = `<div class="f3-kts">${rows.map(tile).join("")}</div>
      <div class="f3-thg"><div class="f3-thc"></div><div class="f3-thl"><div class="f3-thl2"></div></div></div>`;
    const show = k => { const r = rows.find(x => x.k === k); if (!r) return; $$(".f3-kt", w).forEach(b => b.classList.toggle("on", b.dataset.f3k === k));
      const inv = !!F3_INV[r.k] || (r.sens < 0), vals = r.vals.map(v => v == null || !isFinite(v) ? null : v);
      $(".f3-thc", w).innerHTML = `<p class="f3-thn"><b>${esc(r.label)}</b>${r.unit && r.kind === "money" ? ` <span>en ${esc(r.ulong || r.unit)}</span>` : ""}</p>` + f3Cols(vals, Y, v => r.full(v), r.med, inv, r.kind);
      const d = typeof ALL !== "undefined" && ALL[r.term];
      $(".f3-thl2", w).innerHTML = (r.phrase ? `<p class="f3-lec">${esc(r.phrase)}</p>` : "") + `<p class="f3-anc"><a data-f3anc="${esc(r.k)}" data-an="${Y[r.li]}" hidden></a></p>` + (d && d.what ? `<p class="f3-cq2"><b>${esc(r.short || r.label)}, c'est quoi ?</b> ${esc(d.what)}${d.read ? " " + esc(d.read) : ""}</p>` : (ex ? `<p class="f3-cq2"><b>C'est quoi ?</b> ${esc(ex.textContent)}</p>` : ""));
      if (typeof ancreLiens === "function") { const a = $(".f3-anc a", w); ancreLiens(s.id, [r.k === "marge" ? "ebit" : r.k === "nm" ? "net" : r.k], Y[r.li]).then(l => { if (l && l[0]) { a.href = l[0].url; a.target = "_blank"; a.rel = "noopener nofollow"; a.textContent = `${l[0].lbl} ${l[0].an} dans le rapport officiel ↗`; a.hidden = false; } }).catch(() => { }); } };
    w.addEventListener("click", e => { const b = e.target.closest(".f3-kt"); if (b && !e.target.closest(".prov-i")) show(b.dataset.f3k); });
    w.addEventListener("keydown", e => { const b = e.target.closest(".f3-kt"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(b.dataset.f3k); } });
    const first = rows.find(r => r.ess) || rows[0]; show(first.k);
    // ce qui est remplacé : rangée de pastilles, graphique ancien, « détail année par année » (doublons) ; le contexte des ventes est gardé
    $$(".rf-kts, .rf-thc, details.rf-thd, .ph", sec).forEach(x => x.remove());
    sec.insertBefore(w, sec.firstChild); sec.classList.add("f3-th-host");
  });
  // Dividende : le graphique des dividendes versés passe au même dessin ; le « 1 an : du plus bas au plus haut » est déjà dans l'en-tête de la fiche
  const dv = $("#rf-dividende .chart2", tw), rd = P.rows.find(r => r.k === "divPaid"); if (dv && rd) { dv.innerHTML = `<p class="f3-thn"><b>Dividendes versés</b> <span>en ${esc(rd.ulong || rd.unit || "")}</span></p>` + f3Cols(rd.vals.map(v => v == null || !isFinite(v) ? null : v), Y, v => rd.full(v), null, false, "money"); dv.classList.add("f3-divg"); }
  const rg = $("#rf-valorisation .pb .range", tw); if (rg) rg.closest(".pb").remove();
  // « Le PER, concrètement » : les deux phrases deviennent deux cartes à grand chiffre, la zone verte / rouge garde la jauge v3
  const px = $("#rf-valorisation .perx", tw); if (px) { const ps = $$(":scope > p:not(.kick):not(.note)", px), zg = $(".zg", px), note = $("p.note", px);
    const ans = ps[0] && (ps[0].innerHTML.match(/<b>(\d+) ans<\/b>/) || [])[1], cent = ps[1] && (ps[1].innerHTML.match(/<b>([\d,]+ €)<\/b> par an/) || [])[1];
    const m = zg && zg.querySelector(".zgm"), v = zg && zg.querySelector(".zgv"), pm = m ? parseFloat(m.style.left) : null, pv = v ? parseFloat(v.style.left) : null, medT = zg && (zg.querySelector(".zgl b") || {}).textContent;
    px.outerHTML = `<div class="f3-per"><span class="a4-stk a4-ye">Le PER, concrètement</span><div class="f3-perc">${ans ? `<div class="f3-perk"><b>${esc(ans)} ans</b><p>${ps[0].innerHTML}</p></div>` : ""}${cent ? `<div class="f3-perk"><b>${esc(cent)}</b><p>${ps[1].innerHTML}</p></div>` : ""}</div>
      ${pv != null ? `<div class="f3-perg"><div class="f3-ms f3-ms-l"><i style="left:${pm != null ? pm : 50}%"></i><em style="left:${pm != null ? pm : 50}%">médiane${medT ? " " + esc(medT) : ""}</em><b style="left:${pv}%"></b></div><div class="f3-perl"><span>moins chère que le secteur</span><span>plus chère</span></div></div>` : ""}
      ${note ? `<p class="f3-lec">${esc(note.textContent)}</p>` : ""}</div>`; }
  // Comptes complets : un bloc par famille (compte de résultat, bilan, flux, actionnaire), les quatre derniers exercices, le dernier en jaune.
  const tout = $("#rf-tout", tw); if (tout) { const yrs = Y.slice(-4), i0 = Y.length - yrs.length, G = typeof TBLX_GRP !== "undefined" ? TBLX_GRP : {}, GS = typeof TBLX_GRPSUB !== "undefined" ? TBLX_GRPSUB : {};
    const grps = [...new Set(P.rows.map(r => r.grp))];
    const html = grps.map(g => { const rs = P.rows.filter(r => r.grp === g); if (!rs.length) return "";
      const CH = { res: ["Ce qu'elle vend et ce qu'elle en garde", "Compte de résultat", "rf-resultats", "étapes 1 et 2"], bil: ["Ce qu'elle possède et ce qu'elle doit", "Bilan, à la clôture", "rf-dette", "étape 3"], flx: ["L'argent réellement encaissé", "Flux de trésorerie", "rf-dette", "étape 3"], act: ["Ce qui revient à chaque action", "Bénéfice et dividende par action", "rf-div", "étape 4"] }[g] || [G[g] || g, GS[g] || "", null, ""];
      return `<div class="f3-cpt"><h3>${esc(CH[0])}<small>${esc(CH[1])}${CH[2] ? ` · <a href="#" data-f3st="${CH[2]}">voir l'${esc(CH[3])} ↑</a>` : ""}</small></h3><div class="f3-ccg" style="--n:${yrs.length}"><div class="f3-cch"><span></span>${yrs.map((y, i) => `<b class="${i === yrs.length - 1 ? "last" : ""}">${y}</b>`).join("")}</div>
        ${rs.map(r => { const chg = tblxChange(r.kind, r.prev, r.last), cls = r.q > 0 ? "u" : r.q < 0 ? "d" : "n";
          return `<div class="f3-ccr"><span><b class="f3-lb">${esc(r.label)}</b><b class="f3-sb">${esc(r.short || r.label)}</b>${tblxProv(r.k, s)}<small>${esc(r.unit || "")}${chg ? ` · <i class="${cls}">${r.dir > 0 ? "↑" : r.dir < 0 ? "↓" : "→"} ${esc(chg)} sur un an</i>` : ""}</small></span>${yrs.map((y, i) => { const v = r.vals[i0 + i]; return `<em class="${i === yrs.length - 1 ? "last" : ""}">${v == null || !isFinite(v) ? "–" : esc(r.cell ? r.cell(v) : r.full(v))}</em>`; }).join("")}</div>`; }).join("")}</div></div>`; }).join("");
    tout.insertAdjacentHTML("afterbegin", `<div class="f3-ccw">${html}<p class="f3-src">Un tiret : chiffre non publié sous l'étiquette standard. « Estimé » : calculé à partir des comptes. Vert et rouge : seuils de lecture du site, pas un avis.</p></div>`);
    $$(".rf-all, .src, .ph", tout).forEach(x => x.remove()); }
  $$("#rf-valorisation .ph, #rf-dividende .ph", tw).forEach(x => x.remove());
}
function f3Identite(mw, metier, s) { // ce qui restait dans le pli « Activités, pays, dirigeants » et qui n'est pas déjà sur la fiche
  if (!metier) return;
  const fms = $$(".fm", metier), chips = fms.map(f => f.querySelector(".fchips")).find(Boolean), dir = fms.map(f => f.querySelector(".fdir")).find(Boolean), fid = fms.map(f => f.querySelector(".fid2")).find(Boolean);
  const cards = [];
  if (chips && chips.children.length) cards.push(`<div class="f3-idc"><small>Filiales et marques connues</small><div class="f3-chips">${[...chips.children].map(x => `<span>${esc(x.textContent)}</span>`).join("")}</div><p class="f3-src">Wikidata (CC0), liste peut-être incomplète.</p></div>`);
  if (dir && dir.children.length) cards.push(`<div class="f3-idc"><small>Qui la dirige</small><ul class="f3-dir">${[...dir.children].map(x => `<li><span>${esc((x.querySelector("small") || {}).textContent || "")}</span><b>${esc((x.querySelector("b") || x).textContent)}</b></li>`).join("")}</ul><p class="f3-src">Wikidata (CC0) : le rapport annuel fait foi.</p></div>`);
  if (fid) { const rows = [...fid.children].filter(x => !/^(Pays|Secteur|Encyclopédie)$/.test((x.querySelector("span") || {}).textContent || "")); // pays et secteur sont dans l'en-tête ; Wikipédia retiré (2/11)
    if (rows.length) cards.push(`<div class="f3-idc"><small>Carte d'identité</small><dl class="f3-fid">${rows.map(x => `<div><dt>${esc(x.querySelector("span").textContent)}</dt><dd>${x.querySelector("b").innerHTML}</dd></div>`).join("")}</dl></div>`); }
  if (cards.length) mw.insertAdjacentHTML("beforeend", `<div class="f3-idg n${cards.length}">${cards.join("")}</div>`);
}

/* 2/11 (Romain) : les pages « comprendre » (/entreprise/<id>/comprendre/<k>) redisaient les chiffres de la fiche : elles renvoient vers la section
   correspondante de la fiche (comme le serveur le fait déjà pour un lien direct). */
const F3_CT = { argent: "f3-metier", varier: "f3-metier", croissance: "rf-resultats", marge: "rf-rentab", net: "rf-rentab", roe: "rf-rentab", dette: "rf-dette", fcf: "rf-dette", dividende: "rf-div", prix: "rf-valo" };
window.pageComprendre = function (id, k) { goR(`/entreprise/${id}#${F3_CT[k] || "tous-les-chiffres"}`); setTimeout(() => { const t = document.getElementById(F3_CT[k] || "tous-les-chiffres"); if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView({ block: "start" }); } }, 600); };

/* ---------- 2/11 (Romain) : « Son actualité » en fil chronologique v3 ----------
   Une seule liste : dernières annonces officielles (avec « Expliquer en clair »), presse récente, dates à venir. Le pli
   « Toutes ses annonces et ses dates » garde tout (filtres, agenda complet). */
function f3Actu(aw) {
  if (!aw) return;
  if (!aw.dataset.f3obs) { aw.dataset.f3obs = "1"; const fa = $("#factu", aw); if (fa) { let t = 0; new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; const old = $(".f3-tl", aw); if (old) old.remove(); try { f3Actu(aw); } catch (e) { } }, 300); }).observe(fa, { childList: true, subtree: true }); } } // les annonces arrivent après (fetch)
  $$("#ax-p .ax-pr", aw).forEach(a => { if (!/·\s*FR\s*·/.test((a.querySelector(".pm") || {}).textContent || "")) a.hidden = true; }); // presse : français seulement, aussi dans le pli
  if ($(".f3-tl", aw)) return;
  const trim = $("#rf-trim", aw), ev = $$(".rf-ev li", aw), ann = $$("#ax-o .ax-it", aw).slice(0, 3), pr = $$("#ax-p .ax-pr", aw).slice(0, 2);
  const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const items = [];
  let jour = ""; $$("#ax-o .ax-list > *", aw).forEach(n => { if (n.classList.contains("ax-day")) jour = n.textContent.trim(); else if (n.classList.contains("ax-it") && ann.includes(n)) { const m = jour.match(/(\d+)\s+([a-zéû]+)/i), d = m ? `${m[1]} ${(mois.find(x => x.startsWith(m[2].slice(0, 3).toLowerCase())) || m[2])}` : jour;
    const chip = n.querySelector(".ax-chip"), tf = n.querySelector(".ax-tf"), t = n.querySelector(".ax-t"), btn = n.querySelector(".iabtn"), box = n.querySelector(".iabox"), src = n.querySelector(".ax-src");
    const card = document.createElement("div"); card.className = "f3-tlc";
    card.innerHTML = `<span class="f3-dt y">${esc(d)}</span><div class="f3-tlb">${chip ? `<span class="f3-tag">${esc(chip.textContent)}</span>` : ""}<b>${esc((tf || t || {}).textContent || "")}</b>${tf && t && t.textContent.trim() !== tf.textContent.trim() ? `<small>${esc(t.textContent)}</small>` : ""}<div class="f3-tla"></div></div>`;
    const a = card.querySelector(".f3-tla"); if (btn) { const b2 = btn.cloneNode(true); b2.classList.add("f3-ia2"); a.appendChild(b2); a.insertAdjacentHTML("beforeend", `<div class="iabox"></div>`); } if (src) { const s2 = src.cloneNode(true); s2.className = "f3-pv"; s2.textContent = "Lire l'annonce ↗"; a.appendChild(s2); }
    items.push(card); } });
  pr.filter(a => /·\s*FR\s*·/.test((a.querySelector(".pm") || {}).textContent || "")).forEach(a => { const pm = (a.querySelector(".pm") || {}).textContent || "", dm = pm.match(/(\d\d)\/(\d\d)\/(\d\d)/), d = dm ? `${+dm[1]} ${mois[+dm[2] - 1]}` : "";
    const card = document.createElement("div"); card.className = "f3-tlc";
    card.innerHTML = `<span class="f3-dt">${esc(d)}</span><div class="f3-tlb"><span class="f3-tag p">Presse</span><b><a href="${a.getAttribute("href")}" target="_blank" rel="noopener nofollow">${esc((a.querySelector(".pt") || a).textContent)} ↗</a></b><small>${esc(pm.split("·")[0].trim())}</small></div>`; items.push(card); });
  const avenir = ev.length ? `<div class="f3-av1"><span class="f3-tag k">À venir</span>${ev.map(li => `<span class="f3-av"><b>${esc((li.querySelector("b") || {}).textContent || "")}</b>${esc((li.querySelector("span") || {}).textContent || "")}</span>`).join("")}</div>` : "";
  if (!items.length && !avenir) return;
  const w = document.createElement("div"); w.className = "f3-tl"; items.forEach(c => w.appendChild(c)); if (avenir) w.insertAdjacentHTML("beforeend", avenir);
  // dans le pli : plus de bloc « À venir » ni de presse vide (déjà au-dessus ou rien à montrer)
  const pli = $("#rf-agenda", aw); if (pli) { const ch = $(".rf-chev", pli); if (ch) ch.hidden = true; const sm = $("summary .rf-plt b", pli), sp = $("summary .rf-plt span", pli); if (sm) sm.textContent = "Toutes ses annonces des 90 derniers jours"; if (sp) sp.textContent = "Filtrer par type, lire l'original, explication par l'IA";
    $$(".ax-it", pli).forEach((it, i) => { if (i >= 5) it.classList.add("f3-plus"); }); const lst = $(".ax-list", pli); if (lst && $$(".f3-plus", lst).length && !$(".f3-plusb", pli)) lst.insertAdjacentHTML("afterend", `<button type="button" class="f3-plusb" onclick="this.closest('#rf-agenda').classList.add('f3-tout');this.remove()">Voir les ${$$(".f3-plus", lst).length} autres annonces</button>`);
    const pp = $("#ax-p", pli); if (pp && !$$(".ax-pr", pp).some(a => !a.hidden)) { const sec = pp.closest("section"); if (sec) sec.hidden = true; } }
  if (trim) trim.remove(); const ev0 = $(".rf6-ev", aw); if (ev0) ev0.remove();
  aw.insertBefore(w, aw.firstChild);
}

/* ---------- 2/11 (Romain) : « Tous les chiffres » en chaîne, une étape à la fois ----------
   Les plis sont présentés en ligne, dans l'ordre de la causalité : ce qu'elle vend → ce qu'elle en garde → ce qu'elle possède
   et doit → ce que vaut l'action → ce qu'elle reverse. Une étape ouverte à la fois ; le cours, les comptes complets et les
   sources sont en « Et aussi ». Les résumés des plis (titre, chiffre clé) disparaissent : la chaîne les remplace. */
const F3_CHAIN = [["rf-resultats", "Ce qu'elle vend", "ca"], ["rf-rentab", "Ce qu'elle en garde", "marge"], ["rf-dette", "Ce qu'il lui reste", "netDebt"], ["rf-div", "Ce qu'elle reverse", "yld"], ["rf-valo", "Ce que ça coûte en Bourse", "pe"]];
const F3_AUSSI = [["rf-cours", "Le cours"], ["rf-tout-w", "Comptes complets"], ["rf-sources", "Sources"]];
function f3ChaineChiffres(s, c) { // le chiffre clé de chaque étape, affiché dans la chaîne
  const o = {}; try { const P = tblxRows(s, c), r = k => P.rows.find(x => x.k === k), ca = r("ca"), mg = r("marge"), roe = r("roe"), nd = r("netDebt"), v = valo(s);
    const g = r("g"); if (g && g.last != null) o.ca = `${g.full(g.last)} de ventes sur un an`; else if (ca && ca.last != null) o.ca = `exercice ${c.years[ca.li]}`;
    if (mg && mg.last != null) o.marge = `${f3Nb(Math.round(mg.last * 100), 0)} € sur 100 € de ventes`; else if (roe && roe.last != null) o.marge = `${roe.full(roe.last)} de rentabilité`;
    if (nd && nd.last != null) o.netDebt = nd.last < 0 ? `${nd.full(-nd.last)} de trésorerie nette` : `${nd.full(nd.last)} de dette nette`;
    if (v && v.yld != null) o.yld = `${f3Nb(v.yld * 100, 1)} % de rendement`; else if (s.dps === 0 || s.dps == null) o.yld = "pas de dividende";
    if (v && v.pe) o.pe = `${f3Nb(Math.round(v.pe), 0)} fois son bénéfice`; else if (v && v.peNs) o.pe = "PER non significatif";
  } catch (e) { } return o;
}
function f3Leads(s, c) { // une phrase de lecture par étape, comme celle du PER
  const L = {}; try { const P = tblxRows(s, c), r = k => P.rows.find(x => x.k === k), ca = r("ca"), g = r("g"), mg = r("marge"), roe = r("roe"), nd = r("netDebt"), lev = r("lev"), fcf = r("fcf"), nm = s.name, bank = isBank(s);
    if (ca && ca.last != null) { const yl = c.years[ca.li], gv = g && g.last != null ? g.last : null, gm = g && g.med != null ? g.med : null;
      L["rf-resultats"] = `${gv != null ? `Ses ventes ont progressé de <b>${esc(g.full(gv))}</b> en ${yl}${gm != null ? `, contre ${esc(g.full(gm))} pour la médiane de son secteur` : ""}. ` : ""}${gv != null && gm != null ? (gv > gm ? "Elle grandit plus vite que ses concurrentes." : gv < gm ? "Elle grandit moins vite que ses concurrentes." : "Elle grandit au rythme de son secteur.") : ""}`; }
    if (mg && mg.last != null) L["rf-rentab"] = `Sur 100 € de ventes, il lui reste <b>${f3Nb(Math.round(mg.last * 100), 0)} €</b> une fois payés salaires, achats et frais${mg.med != null ? `, contre ${f3Nb(Math.round(mg.med * 100), 0)} € pour la médiane de son secteur` : ""}. ${mg.med != null ? (mg.last > mg.med * 1.2 ? "Chaque vente lui rapporte nettement plus qu'à ses concurrentes." : mg.last < mg.med * 0.8 ? "Chaque vente lui rapporte moins qu'à ses concurrentes." : "Chaque vente lui rapporte à peu près autant qu'à ses concurrentes.") : ""}`;
    else if (roe && roe.last != null) L["rf-rentab"] = `Pour 100 € apportés par ses actionnaires, ${esc(nm)} gagne <b>${esc(roe.full(roe.last))}</b> par an${roe.med != null ? `, contre ${esc(roe.full(roe.med))} pour la médiane de son secteur` : ""}.`;
    if (nd && nd.last != null) L["rf-dette"] = nd.last < 0 ? `Une fois ses dettes remboursées, il lui resterait encore <b>${esc(nd.full(-nd.last))}</b> de trésorerie : elle n'a pas de dette nette.${fcf && fcf.last != null ? ` Ses bénéfices se transforment en argent : ${esc(fcf.full(fcf.last))} d'argent disponible sur l'exercice.` : ""}` : `Elle doit <b>${esc(nd.full(nd.last))}</b> de plus qu'elle n'a de trésorerie${lev && lev.last != null ? `, soit <b>${f3Nb(lev.last, 1)} an${lev.last >= 2 ? "s" : ""}</b> de résultat pour rembourser${lev.med != null ? ` (médiane du secteur : ${f3Nb(lev.med, 1)})` : ""}` : ""}.`;
  } catch (e) { } return L;
}
function f3Chaine(tw) {
  if (!tw || $(".f3-chain", tw)) return;
  const has = id => !!tw.querySelector("#" + id);
  const steps = F3_CHAIN.filter(([id]) => has(id)), aussi = F3_AUSSI.filter(([id]) => has(id)); if (!steps.length) return;
  const nav = document.createElement("div"); nav.className = "f3-chain";
  const sid = location.pathname.split("/")[2], s = RBY[sid], c = s && FULL[sid], K = s && c ? f3ChaineChiffres(s, c) : {}, LD = s && c ? f3Leads(s, c) : {};
  nav.innerHTML = `<div class="f3-steps">${steps.map(([id, t, k], i) => `<button type="button" data-f3st="${id}"><i>${i + 1}</i><b>${t}</b><small>${esc(K[k] || "")}</small></button>`).join('<span class="f3-arr" aria-hidden="true">→</span>')}</div>
    ${aussi.length ? `<div class="f3-aussi"><span>Et aussi :</span>${aussi.map(([id, t]) => `<button type="button" data-f3st="${id}">${t}</button>`).join("")}</div>` : ""}`;
  tw.insertBefore(nav, tw.firstChild); tw.classList.add("f3-chained");
  Object.entries(LD).forEach(([id, h]) => { const th = tw.querySelector("#" + id + " .f3-th"); if (th && !th.querySelector(".f3-lead0")) th.insertAdjacentHTML("afterbegin", `<p class="f3-lec f3-lead0">${h}</p>`); });
  const show = id => { $$("details.rf-pl", tw).forEach(d => { d.open = d.id === id; }); $$("[data-f3st]", nav).forEach(b => b.classList.toggle("on", b.dataset.f3st === id)); };
  tw.addEventListener("click", e => { const b = e.target.closest("[data-f3st]"); if (!b) return; e.preventDefault(); show(b.dataset.f3st); if (!nav.contains(b)) nav.scrollIntoView({ behavior: "smooth", block: "start" }); if (b.dataset.f3st === "rf-cours" && typeof ficheGraphique === "function") { try { const sid = location.pathname.split("/")[2]; if (RBY[sid]) ficheGraphique(RBY[sid]); } catch (x) { } } });
  show((location.hash && has(location.hash.slice(1)) && $$("details.rf-pl", tw).some(d => d.id === location.hash.slice(1))) ? location.hash.slice(1) : steps[0][0]);
  tw.addEventListener("toggle", e => { const d = e.target; if (d.matches("details.rf-pl") && d.open) { $$("details.rf-pl", tw).forEach(x => { if (x !== d) x.open = false; }); $$("[data-f3st]", nav).forEach(b => b.classList.toggle("on", b.dataset.f3st === d.id)); } }, true);
}
