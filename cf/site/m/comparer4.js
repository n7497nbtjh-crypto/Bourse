/* ====================================================================================
   Comparer v4 (3/11/2026) : la page /comparer en un seul module, avec les composants partagés (m/composants.js).
   Maquette validée par Romain : docs/maquettes/comparer-v1.html.
   - Avec 2 entreprises ou plus : en-tête (cartes des entreprises, ajout, partage), verdict + tableau des scores
     (critères cliquables vers leur étape, médiane du secteur en ligne repère), fil en six étapes (taille, croissance,
     marge, dette, dividende, prix : points face à la médiane + « ce qui a changé »), tous les chiffres côte à côte
     (meilleure et moins bonne par ligne), question à l'IA, sources, trois comparaisons proches.
   - Sans entreprise ou avec une seule : en-tête de recherche, concurrents proposés, puis les comparaisons toutes prêtes
     (OUT_PRESETS et outCalcPresets de m/outils.js), triées par thème.
   Chaque titre est calculé sur les chiffres (aucun texte écrit pour une société). Rien n'est un conseil.
   ==================================================================================== */
const CX = { on: true };
const cxFr = (v, d = 0) => ekFr(v, d);
const cxLast = a => { if (!a) return null; for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; };
function cxLogo(c, cls) {
  const f = typeof LOGOS !== "undefined" && LOGOS[c.id] && LOGOS[c.id].f, ini = String(c.name || "").replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return f ? `<span class="cx-lg${cls ? " " + cls : ""}"><img src="/logos/${esc(f)}" alt="" loading="lazy" onerror="this.parentNode.textContent='${esc(ini).replace(/'/g, "")}'"></span>` : `<span class="cx-lg cx-lgi${cls ? " " + cls : ""}">${esc(ini)}</span>`;
}
const cxSym = c => typeof F4_SYM === "function" ? F4_SYM(c.currency).trim() : (c.currency || "€");
const cxMd = (m, cur) => typeof f4Md === "function" ? f4Md(m, cur) : cxFr(m, 0) + " M";
const cxAns = v => cxFr(v, 1) + (v >= 2 ? " ans" : " an");

// ——— Les chiffres d'une entreprise pour la comparaison ———
function cxFig(s) {
  const c = FULL[s.id] || null, f = (c && c.fin) || {}, M = typeof f4M === "function" ? f4M(s) : {}, bank = isBank(s), valide = typeof f4Valide !== "function" || f4Valide(s); // comptes incohérents (résultat > ventes) : marges écartées
  const serie = k => (f[k] || []).slice(-4), ebitda = cxLast(f.ebitda), nd = s.netDebt;
  const lev = bank || nd == null ? null : nd <= 0 ? -1 : (ebitda > 0 ? nd / ebitda : s.ebit > 0 ? nd / s.ebit : null);
  return { s, c, bank, M, nom: s.name, ok: !s.missing && s.ca != null,
    taille: typeof caEur === "function" && s.ca > 0 ? caEur(s) : null,
    valide, g: M.g != null ? M.g * 100 : null, m: !bank && valide && M.m != null && M.m <= 1 ? M.m * 100 : null, lev, yld: M.yld != null ? M.yld * 100 : null, pe: M.pe != null ? M.pe : null,
    pay: M.pay != null ? M.pay * 100 : null, nm: valide && M.nm != null && M.nm <= 1 ? M.nm * 100 : null, roe: M.roe != null ? M.roe * 100 : null,
    ca: serie("ca"), ebit: serie("ebit"), net: serie("net"), ndS: serie("netDebt"), div: serie("divPaid"), an: c && c.years ? c.years.slice(-4) : [] };
}
// Médianes du secteur de la première entreprise (MED du site, et calcul pour le prix et le rendement)
function cxMed(s) {
  const m = (typeof MED !== "undefined" && MED[s.sector]) || {}, ok = v => v != null && isFinite(v);
  const sec = R.companies.filter(c => c.sector === s.sector && !c.missing);
  const med = a => { const x = a.filter(ok).sort((p, q) => p - q); if (x.length < 5) return null; const k = Math.floor(x.length / 2); return x.length % 2 ? x[k] : (x[k - 1] + x[k]) / 2; };
  let pe = null, yld = null; try { const L = sec.map(c => typeof f4M === "function" ? f4M(c) : {}); pe = med(L.map(x => x.pe).filter(v => v > 0 && v < 200)); yld = med(L.map(x => x.yld != null ? x.yld * 100 : null)); } catch (e) { }
  return { n: m.n || sec.length, g: ok(m.g1) ? m.g1 * 100 : null, m: ok(m.marge) ? m.marge * 100 : null, lev: ok(m.lev) ? m.lev : null, pay: ok(m.payout) ? m.payout * 100 : null, nm: ok(m.nm) ? m.nm * 100 : null, roe: ok(m.roe) ? m.roe * 100 : null, pe, yld,
    nom: typeof secName === "function" ? secName(s).toLowerCase() : s.sector };
}

// ——— Les cinq critères classés, et la taille (affichée, pas comptée) ———
const CX_K = [
  { k: "taille", n: "Taille", cle: "ventes", neutre: 1, f: v => cxMd(v, "EUR") },
  { k: "g", n: "Croissance", cle: "croissance", haut: 1, f: v => (v > 0 ? "+" : "") + cxFr(v, 1) + " %" },
  { k: "m", n: "Marge", cle: "marge", haut: 1, f: v => cxFr(v, 0) + " €", na: "sans objet pour une banque" },
  { k: "lev", n: "Dette", cle: "dette", haut: 0, f: v => v < 0 ? "aucune" : cxAns(v), na: "sans objet pour une banque" },
  { k: "yld", n: "Dividende", cle: "rendement", haut: 1, f: v => cxFr(v, 1) + " %", na: "pas de dividende relevé" },
  { k: "pe", n: "Prix", cle: "per", haut: 0, f: v => cxFr(v, 0) + " fois", na: "pas de sens cette année" }];
function cxRang(F, k) { // « g » en tête, « r » dernière, « n » entre les deux ; « na » sans valeur
  const ok = F.filter(x => x[k.k] != null), tri = ok.slice().sort((a, b) => k.haut ? b[k.k] - a[k.k] : a[k.k] - b[k.k]);
  return x => x[k.k] == null ? "na" : k.neutre || ok.length < 2 ? "n" : x === tri[0] ? "g" : x === tri[tri.length - 1] ? "r" : "n";
}

// ——— Titres courts : un constat calculé, pas les chiffres du graphique ———
function cxTitres(F) {
  const nm = x => x.nom, has = k => F.filter(x => x[k] != null), best = (k, haut) => has(k).sort((a, b) => haut ? b[k] - a[k] : a[k] - b[k])[0];
  const T = {};
  const tl = has("taille").sort((a, b) => b.taille - a.taille);
  T.taille = tl.length < 2 ? "non comparable." : tl[0].taille > tl.slice(1).reduce((a, x) => a + x.taille, 0) && tl.length > 2 ? `${nm(tl[0])}, le poids lourd.` : tl[0].taille < tl[1].taille * 1.2 ? "Des tailles proches." : `${nm(tl[0])}, la plus grande.`;
  const gs = has("g"), up = gs.filter(x => x.g > 0);
  T.g = gs.length < 2 ? "non comparable." : up.length === gs.length ? `Toutes en hausse, ${nm(best("g", 1))} devant.` : !up.length ? "Toutes en recul." : up.length === 1 ? `${nm(up[0])}, seule en hausse.` : `${nm(best("g", 1))} grandit le plus vite.`;
  const ms = has("m").sort((a, b) => b.m - a.m), neg = ms.find(x => x.m < 0);
  T.m = ms.length < 2 ? "non comparable." : neg ? `${nm(neg)} perd de l'argent sur son activité.` : ms[1].m > 0 && ms[0].m / ms[1].m >= 1.5 ? `${nm(ms[0])} loin devant.` : ms[1].m > 0 && ms[0].m / ms[1].m < 1.15 ? `${nm(ms[0])} devant, de peu.` : `${nm(ms[0])} devant.`;
  const dl = has("lev"), monte = F.find(x => { const a = x.ndS.filter(v => v != null); return a.length >= 2 && a[a.length - 1] > 0 && a[0] > 0 && a[a.length - 1] > a[0] * 1.5; });
  T.lev = dl.length < 2 ? "non comparable." : dl.every(x => x.lev < 0) ? "Aucune n'a de dette." : monte ? `${nm(monte)} s'endette.` : best("lev", 0).lev < 0 ? `${nm(best("lev", 0))}, sans dette.` : `${nm(best("lev", 0))}, la plus solide.`;
  const ys = has("yld"), by = best("yld", 1);
  T.yld = !ys.length ? "Pas de dividende relevé." : by.pay != null && by.pay > 100 ? `${nm(by)} verse plus qu'elle ne gagne.` : ys.length < 2 ? `${nm(by)}, seule à verser un dividende relevé.` : `${nm(by)} rapporte le plus.`;
  const ps = has("pe").sort((a, b) => b.pe - a.pe);
  T.pe = ps.length < 2 ? "non calculable cette année." : ps[0].pe / ps[ps.length - 1].pe >= 1.4 ? `${nm(ps[0])}, la plus chère.` : "Des prix proches.";
  // Après « Terme : », une phrase qui ne commence pas par un nom d'entreprise prend une minuscule
  const noms = F.map(x => x.nom); Object.keys(T).forEach(k => { if (!noms.some(n => T[k].startsWith(n))) T[k] = T[k][0].toLowerCase() + T[k].slice(1); });
  return T;
}

// ——— Verdict ———
function cxVerdict(F, R5) {
  const crit = CX_K.filter(k => !k.neutre && F.filter(x => x[k.k] != null).length >= 2), tete = F.map(x => crit.filter(k => R5[k.k](x) === "g").length), der = F.map(x => crit.filter(k => R5[k.k](x) === "r").length);
  if (!crit.length) return "Pas assez de chiffres pour un verdict.";
  const mx = Math.max(...tete), L = F.filter((x, i) => tete[i] === mx), dmx = Math.max(...der), D = F.filter((x, i) => der[i] === dmx && tete[i] < mx);
  const lead = L.length === 1 ? `<i>${esc(L[0].nom)}</i> devant sur ${mx} critère${mx > 1 ? "s" : ""} sur ${crit.length}` : `${listFr(L.map(x => `<i>${esc(x.nom)}</i>`))} à égalité, ${mx} critère${mx > 1 ? "s" : ""} chacune`;
  return lead + (D.length === 1 && dmx > 0 ? `, <em>${esc(D[0].nom)}</em> dernière sur ${dmx}.` : ".");
}

// ——— En-tête ———
function cxCarte(x, ids) {
  const s = x.s, p = typeof pxOf === "function" ? pxOf(s) : null;
  return `<div class="cx-co"><a class="x" href="${cxUrl(ids.filter(i => i !== s.id))}" aria-label="Retirer ${esc(s.name)}">✕</a><div class="t">${cxLogo(s)}<div><b class="n">${esc(s.name)}</b><small>${esc([secName(s), regName(s)].filter(Boolean).join(" · "))}</small></div></div>
    ${p && p.p > 0 ? `<div class="px">${esc(pxFmt(p.p, p.cur))}${p.chg != null ? `<span style="color:${p.chg > 0 ? EK_G : p.chg < 0 ? EK_R : "#555"}">${p.chg > 0 ? "+" : ""}${cxFr(p.chg, 2)} %</span>` : ""}</div>` : `<div class="px cx-nopx">cours non disponible</div>`}
    <a class="go" href="/entreprise/${esc(s.id)}">Voir sa fiche →</a></div>`;
}
const cxUrl = a => "/comparer" + (a.length ? "?ids=" + a.join(",") : "");
function cxAjout(ids, CMAX) {
  if (ids.length >= CMAX) return `<div class="cx-add"><b>${CMAX} au maximum${CMAX === 5 ? "" : " en version gratuite"}</b><small>${CMAX === 5 ? "Retirez-en une pour en ajouter une autre." : `Retirez-en une, ou passez à <a href="/premium">Premium</a> pour en comparer cinq.`}</small></div>`;
  return `<div class="cx-add"><b>${ids.length ? "+ Ajouter" : "Ajouter une entreprise"}</b><div class="cx-q"><input id="cxq" type="search" autocomplete="off" spellcheck="false" placeholder="${ids.length ? "Nom ou code…" : "Nom ou code : LVMH, Apple, TotalEnergies…"}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cxs" aria-label="Ajouter une entreprise à la comparaison"><div class="cx-sug" id="cxs" role="listbox" hidden></div></div><small>${ids.length ? (CMAX === 5 ? "Jusqu'à cinq." : "Une 4e et une 5e avec <a href=\"/premium\">Premium</a>.") : "Ou commencez par une comparaison toute prête, juste en dessous."}</small></div>`;
}

// ——— Une étape ———
function cxEv(titre, L, note) {
  return `<div class="cx-ev"><p class="h">${esc(titre)}</p>${L.map(r => `<div class="cx-r">${cxLogo(r.x.s)}<div><b>${esc(r.x.nom)}</b><small>${esc(r.de)}</small></div><em class="${r.t ? "t" + r.t : ""}">${esc(r.a)}</em></div>`).join("")}${note ? `<div class="w2">${esc(note)}</div>` : ""}</div>`;
}
function cxPts(F, o) {
  return ekPoints(Object.assign({ lignes: F.map(x => ({ nom: x.nom, v: o.val(x), texte: o.val(x) == null ? (typeof o.na === "function" ? o.na(x) : o.na) : o.txt(x), moi: 1 })) }, o));
}
function cxEtapes(F, MD, T, d0) {
  const A = F.find(x => x.an.length) || F[0], a0 = A.an[0], E = [];
  const pc = (a, b) => a > 0 && b != null ? (b / a - 1) * 100 : null, sg = v => (v > 0 ? "+" : v < 0 ? "−" : "") + cxFr(Math.abs(v), 0) + " %";
  const medLab = (v, f) => v != null ? `médiane ${f(v)}` : "";
  const src = { texte: `Comptes ${F[0].s.year}` };
  // 1. Taille
  const tl = F.filter(x => x.taille != null).sort((a, b) => b.taille - a.taille), mxT = tl.length ? tl[0].taille : 1;
  E.push({ id: "cx-taille", sur: "Taille", concept: { cle: "ventes" }, titre: T.taille,
    visuel: ekBox({ titre: "Leurs ventes", unite: "dernier exercice, en milliards d'€", indice: "La taille ne dit pas qui gagne le plus : elle dit qui vend le plus. Les ventes en autres devises sont converties en euros.", source: src },
      `<div class="cx-hb">${tl.map(x => `<div><span class="nm">${cxLogo(x.s)}${esc(x.nom)}</span><i style="width:${Math.max(2, x.taille / mxT * 100)}%"></i><b>${cxFr(x.taille / 1000, 1)}</b></div>`).join("")}</div>`),
    droite: cxEv(a0 ? `Depuis ${a0}` : "Sur trois ans", F.filter(x => x.ca.filter(v => v != null).length >= 2).map(x => { const a = x.ca.filter(v => v != null), d = pc(a[0], a[a.length - 1]); return { x, de: `${cxMd(a[0], x.s.currency)} → ${cxMd(a[a.length - 1], x.s.currency)}`, a: d == null ? "" : sg(d), t: d > 0 ? "g" : d < 0 ? "r" : "" }; })),
    suite: "Et sur la dernière année, laquelle grandit le plus vite ?" });
  // 2. Croissance
  const gv = F.map(x => x.g).filter(v => v != null), gm = Math.max(5, ...gv.map(Math.abs), MD.g != null ? Math.abs(MD.g) : 0), gn = f4Nice(gm);
  E.push({ id: "cx-g", sur: "Croissance", concept: { cle: "croissance" }, titre: T.g,
    visuel: cxPts(F, { titre: "Variation des ventes", unite: "sur un an", val: x => x.g, na: "non publiée", txt: x => CX_K[1].f(x.g), mediane: MD.g != null ? MD.g : 0, mediane_label: medLab(MD.g, CX_K[1].f), min: -gn.max, max: gn.max, graduations: [-gn.max, 0, gn.max], fmtAxe: t => (t > 0 ? "+" : "") + cxFr(t, 0) + " %", indice: "Chaque point place une entreprise. À droite du pointillé (zone verte), ses ventes progressent plus vite que la médiane du secteur.", source: src }),
    droite: cxEv("Les trois dernières années", F.filter(x => x.ca.filter(v => v != null).length >= 3).map(x => { const c = x.ca, g = []; for (let i = 1; i < c.length; i++) if (c[i] != null && c[i - 1] > 0) g.push(c[i] / c[i - 1] - 1);
      const tous = g.length >= 2 && g.every(v => v > 0), recul = g.length >= 2 && g.every(v => v < 0), deux = g.length >= 2 && g.slice(-2).every(v => v < 0);
      return { x, de: g.map(v => (v > 0 ? "+" : "") + cxFr(v * 100, 0) + " %").join(" · "), a: tous ? "en hausse chaque année" : recul ? `${g.length === 3 ? "trois" : "deux"} ans de recul` : deux ? "deux ans de recul" : "irrégulier", t: tous ? "g" : recul || deux ? "r" : "" }; })),
    suite: "Sur ces ventes, combien reste-t-il une fois l'activité payée ?" });
  // 3. Marge
  const mv = F.map(x => x.m).filter(v => v != null);
  if (mv.length) { const mn = f4Nice(Math.max(10, ...mv, MD.m || 0));
    E.push({ id: "cx-m", sur: "Marge", concept: { cle: "marge" }, titre: T.m,
      visuel: cxPts(F, { titre: "Gardés sur 100 € de ventes", unite: "marge d'exploitation", val: x => x.m, na: x => x.bank ? "sans objet pour une banque" : "ses comptes ne permettent pas de la calculer (résultat supérieur aux ventes)", txt: x => cxFr(x.m, 0) + " " + cxSym(x.s), mediane: MD.m || 0, mediane_label: medLab(MD.m, v => cxFr(v, 0) + " €"), max: mn.max, graduations: mn.ticks, fmtAxe: t => cxFr(t, 0) + " €", indice: "À droite du pointillé (zone verte), l'entreprise garde plus que la médiane du secteur sur chaque vente. Une marge négative est placée sur zéro.", source: src }),
      droite: cxEv(a0 ? `Ce qui a changé depuis ${a0}` : "Ce qui a changé", F.filter(x => x.m != null && x.ca[0] > 0 && x.ebit[0] != null).map(x => { const a = x.ebit[0] / x.ca[0] * 100, b = x.m; return { x, de: `${cxFr(a, 0)} → ${cxFr(b, 0)} gardés sur 100`, a: (b - a >= 0 ? "+" : "−") + cxFr(Math.abs(b - a), 0), t: b - a >= 1 ? "g" : b - a <= -1 ? "r" : "" }; })),
      suite: "Une entreprise qui garde peu peut-elle rembourser ses dettes ?" }); }
  // 4. Dette
  const lv = F.map(x => x.lev).filter(v => v != null);
  if (lv.length) { const ln = f4Nice(Math.max(3, ...lv, MD.lev || 0));
    E.push({ id: "cx-lev", sur: "Dette", concept: { cle: "dette" }, titre: T.lev,
      visuel: cxPts(F, { titre: "Années de résultat pour rembourser la dette", unite: "dette nette ÷ résultat avant amortissements", basEstMieux: true, motBas: "plus solide", motHaut: "plus endettée", val: x => x.lev == null ? null : Math.max(0, x.lev), na: "sans objet pour une banque", txt: x => x.lev < 0 ? "aucune dette" : cxAns(x.lev), mediane: MD.lev || 0, mediane_label: medLab(MD.lev, cxAns), max: ln.max, graduations: ln.ticks, fmtAxe: t => cxFr(t, 0), indice: "À gauche du pointillé (zone verte), l'entreprise rembourserait sa dette plus vite que la médiane du secteur. « Aucune dette » : elle a plus d'argent en caisse que de dettes.", source: src }),
      droite: cxEv(a0 ? `Leur dette nette, fin ${a0} → fin ${F[0].s.year}` : "Leur dette nette", F.filter(x => x.ndS.filter(v => v != null).length >= 2).map(x => { const a = x.ndS.filter(v => v != null), u = a[0], v = a[a.length - 1];
        return { x, de: u < 0 && v < 0 ? `plus d'argent en caisse que de dettes : ${cxMd(-u, x.s.currency)} → ${cxMd(-v, x.s.currency)}` : `${u < 0 ? "aucune" : cxMd(u, x.s.currency)} → ${v < 0 ? "aucune" : cxMd(v, x.s.currency)}`, a: v < 0 ? "aucune dette" : u > 0 && v > u * 1.5 ? "× " + cxFr(v / u, 1) : u > 0 && v < u * 0.67 ? "en baisse" : u <= 0 ? "nouvelle dette" : "stable", t: v < 0 || (u > 0 && v < u * 0.67) ? "g" : (u > 0 && v > u * 1.5) || u <= 0 ? "r" : "" }; })),
      suite: "Que versent-elles à leurs actionnaires ?" }); }
  // 5. Dividende
  const yv = F.map(x => x.yld).filter(v => v != null), trop = F.find(x => x.pay != null && x.pay > 150 && x.yld != null);
  if (yv.length) { const yn = f4Nice(Math.max(4, ...yv, MD.yld || 0));
    E.push({ id: "cx-yld", sur: "Dividende", concept: { cle: "rendement" }, titre: T.yld,
      visuel: cxPts(F, { titre: "Dividende annuel ÷ prix de l'action", unite: `rendement au cours du ${d0}`, val: x => x.yld, na: "pas de dividende relevé", txt: x => cxFr(x.yld, 1) + " %", mediane: MD.yld || 0, mediane_label: medLab(MD.yld, v => cxFr(v, 1) + " %"), max: yn.max, graduations: yn.ticks, fmtAxe: t => cxFr(t, 1) + " %", indice: "Un rendement élevé n'est pas une garantie : le dividende peut être réduit.", source: { texte: `Dividendes ${F[0].s.year}, cours du ${d0}` } }),
      droite: cxEv(`Part du bénéfice versée en ${F[0].s.year}`, F.filter(x => x.pay != null).map(x => ({ x, de: x.div.length && cxLast(x.div) != null && cxLast(x.net) != null ? `${cxMd(cxLast(x.div), x.s.currency)} versés pour ${cxMd(cxLast(x.net), x.s.currency)} de bénéfice` : "dividende par action ÷ bénéfice par action", a: x.pay > 150 ? "× " + cxFr(x.pay / 100, 0) : cxFr(x.pay, 0) + " " + cxSym(x.s), t: x.pay > 100 ? "r" : "" })),
        trop ? `${trop.nom} a versé ${cxFr(trop.pay / 100, 0)} fois son bénéfice de l'année : le dividende ne vient pas des gains de l'année.` : ""),
      suite: "Reste une question : combien coûtent-elles en Bourse ?" }); }
  // 6. Prix
  const pv = F.map(x => x.pe).filter(v => v != null);
  if (pv.length) { const pn = f4Nice(Math.max(30, ...pv.map(v => Math.min(v, 100)), MD.pe || 0));
    E.push({ id: "cx-pe", sur: "Prix", concept: { cle: "per" }, titre: T.pe,
      visuel: cxPts(F, { titre: "Années de bénéfice pour payer l'action", unite: `PER, cours du ${d0}`, basEstMieux: true, motBas: "moins chère", motHaut: "plus chère", val: x => x.pe, na: "son bénéfice est trop faible, le PER n'aurait pas de sens", txt: x => cxFr(x.pe, 0) + " fois", mediane: MD.pe || 0, mediane_label: medLab(MD.pe, v => cxFr(v, 0) + " fois"), max: pn.max, graduations: pn.ticks, fmtAxe: t => cxFr(t, 0), indice: "À gauche du pointillé (zone verte), l'action coûte moins d'années de bénéfice que la médiane du secteur.", source: { texte: `Cours du ${d0}, comptes ${F[0].s.year}` } }),
      droite: cxEv("Ce que le marché paie", F.map(x => x.pe == null ? { x, de: "bénéfice trop faible cette année", a: "non calculable", t: "" } : MD.pe ? { x, de: x.pe > MD.pe * 1.15 ? `${cxFr(x.pe / MD.pe, 1)} fois la médiane` : x.pe < MD.pe * 0.85 ? `${cxFr(x.pe / MD.pe, 1)} fois la médiane` : "comme la médiane", a: x.pe > MD.pe * 1.15 ? "plus chère" : x.pe < MD.pe * 0.85 ? "moins chère" : "dans la norme", t: x.pe > MD.pe * 1.15 ? "r" : x.pe < MD.pe * 0.85 ? "g" : "" } : { x, de: cxFr(x.pe, 0) + " fois son bénéfice", a: "", t: "" })),
      suite: "" }); }
  E.forEach((e, i) => { e.n = i + 1; if (i === E.length - 1) e.suite = ""; });
  return E;
}

// ——— Tous les chiffres côte à côte ———
function cxTableau(F, MD) {
  const pct = v => cxFr(v, 1) + " %", money = x => v => cxMd(v, x.s.currency);
  const L = [["Ses résultats"],
    ["Chiffre d'affaires", x => cxLast(x.ca) ?? x.s.ca, money, 0, null],
    ["Croissance des ventes", x => x.g, () => v => (v > 0 ? "+" : "") + pct(v), 1, MD.g],
    ["Résultat d'exploitation", x => cxLast(x.ebit) ?? x.s.ebit, money, 0, null],
    ["Marge d'exploitation", x => x.m, () => pct, 1, MD.m],
    ["Bénéfice net", x => cxLast(x.net) ?? x.s.net, money, 0, null],
    ["Marge nette", x => x.nm, () => pct, 1, MD.nm],
    ["Son bilan et sa dette"],
    ["Capitaux propres", x => x.s.equity ?? (x.c && x.c.fin && cxLast(x.c.fin.equity)), money, 0, null],
    ["Dette nette", x => x.s.netDebt, x => v => v < 0 ? "aucune" : cxMd(v, x.s.currency), 0, null],
    ["Années de résultat pour la rembourser", x => x.lev, () => v => v < 0 ? "aucune dette" : cxAns(v), -1, MD.lev],
    ["Rentabilité des capitaux propres", x => x.roe, () => pct, 1, MD.roe],
    ["Pour l'actionnaire"],
    ["Dividendes versés", x => cxLast(x.div), money, 0, null],
    ["Part du bénéfice versée", x => x.pay, () => v => v > 150 ? "× " + cxFr(v / 100, 0) : cxFr(v, 0) + " %", 0, MD.pay],
    ["Rendement", x => x.yld, () => pct, 1, MD.yld],
    ["PER", x => x.pe, () => v => cxFr(v, 0) + " fois", -1, MD.pe]];
  const fmtMed = (r, v) => v == null ? "–" : r[0] === "Années de résultat pour la rembourser" ? cxAns(v) : r[0] === "PER" ? cxFr(v, 0) + " fois" : r[0] === "Croissance des ventes" ? (v > 0 ? "+" : "") + pct(v) : r[0] === "Part du bénéfice versée" ? cxFr(v, 0) + " %" : pct(v);
  const cell = (r, x) => { const vals = F.map(r[1]).filter(v => v != null), v = r[1](x); if (v == null) return `<td class="na">–</td>`;
    const txt = esc(r[2](x)(v)); if (!r[3] || vals.length < 2) return `<td>${txt}</td>`;
    const b = r[3] > 0 ? Math.max(...vals) : Math.min(...vals), w = r[3] > 0 ? Math.min(...vals) : Math.max(...vals);
    return `<td class="${v === b ? "cx-b" : v === w ? "cx-w" : ""}">${v === b ? "<i>▲</i>" : v === w ? "<i>▼</i>" : ""}${txt}</td>`; };
  const devises = [...new Set(F.map(x => x.s.currency))];
  return `<div class="ek-tc ek-tc-l"><p class="cx-sw">Faites glisser le tableau vers la gauche →</p><div class="scroll-x"><table class="ek-tt ek-tt-r cx-tt"><thead><tr><th></th>${F.map(x => `<th><span class="ek-nm">${cxLogo(x.s, "cx-lgs")}${esc(x.nom)}</span></th>`).join("")}<th>médiane secteur</th></tr></thead><tbody>${L.map(r => r.length === 1 ? `<tr class="cx-grp"><th colspan="${F.length + 2}">${esc(r[0])}</th></tr>` : `<tr><th>${esc(r[0])}</th>${F.map(x => cell(r, x)).join("")}<td class="m">${esc(fmtMed(r, r[4]))}</td></tr>`).join("")}</tbody></table></div>
    <p class="ek-tn"><span class="cx-lg2"><i class="cx-lb">▲</i>la meilleure de la ligne</span><span class="cx-lg2"><i class="cx-lw">▼</i>la moins bonne</span>Les montants (ventes, bénéfice…) ne sont pas classés : plus gros ne veut pas dire mieux. Derniers exercices clos${devises.length > 1 ? `, chacun dans sa devise (${esc(devises.join(", "))})` : `, en ${esc(devises[0] || "")}`}. <button type="button" class="ek-lk" data-cx-csv>Télécharger le tableau (CSV)</button></p></div>`;
}

// ——— Sources ———
function cxSources(F, MD, d0) {
  return `<div class="cx-src">${F.map(x => { const src = (x.c && x.c.sources || [])[0] || {}, fe = x.c && x.c.fyEnd, cl = fe && x.s.year ? `${x.s.year}-${fe}` : null; // date de clôture : exercice + fin d'exercice (le champ « clos » de l'index peut être faux)
    return `<div><b>${esc(x.nom)}</b>Rapport annuel ${esc(x.s.year || "")}${cl ? `, clos le ${esc(new Date(cl + "T12:00:00").toLocaleDateString("fr-FR"))}` : ""}. Cours différé du ${esc(d0)}.${src.report ? `<br><a href="${esc(src.report)}" target="_blank" rel="noopener">Ouvrir le rapport ↗</a>` : ""}</div>`; }).join("")}</div>
    <p class="ek-tn">Médiane du secteur : la valeur du milieu parmi les ${MD.n} entreprises du secteur ${esc(MD.nom)} suivies par le site${new Set(F.map(x => x.s.sector)).size > 1 ? `, celui de ${esc(F[0].nom)}` : ""}.</p>`;
}

// ——— Comparaisons toutes prêtes ———
function cxPresets() { try { return [...(typeof outCalcPresets === "function" ? outCalcPresets() : []), ...(typeof OUT_PRESETS !== "undefined" ? OUT_PRESETS : [])].filter(p => p.ids.filter(id => RBY[id]).length >= 2); } catch (e) { return []; } }
function cxCartePreset(p) {
  const l = p.ids.filter(id => RBY[id]);
  return `<a class="cx-pc" href="${cxUrl(l)}" data-th="${esc(p.th || "")}"><span class="lgs">${l.map(id => cxLogo(RBY[id])).join("")}</span><b>${esc(p.t)}</b><small>${esc(listFr(l.map(id => RBY[id].name)))}</small>${p.d ? `<span class="d">${esc(p.d)}</span>` : ""}</a>`;
}
function cxProches(ids) {
  const P = cxPresets(), cle = l => l.slice().sort().join(","), ici = cle(ids), secs = new Set(ids.map(id => RBY[id] && RBY[id].sector));
  const avec = P.filter(p => cle(p.ids) !== ici && p.ids.some(id => ids.includes(id))), meme = P.filter(p => cle(p.ids) !== ici && !avec.includes(p) && p.ids.some(id => RBY[id] && secs.has(RBY[id].sector)));
  return [...avec, ...meme].slice(0, 3);
}
function cxGalerie() {
  const P = cxPresets(), th = Object.keys(typeof OUT_THEMES !== "undefined" ? OUT_THEMES : {}).filter(k => P.some(p => p.th === k));
  return `<section class="ek-sec" id="cx-toutes"><span class="ek-stk2 p">Toutes prêtes</span><h2>${P.length} comparaisons, en un clic.</h2>
    <div class="cx-th" role="group" aria-label="Thèmes"><button type="button" class="on" data-cx-th="">Tout (${P.length})</button>${th.map(k => `<button type="button" data-cx-th="${esc(k)}">${esc(OUT_THEMES[k])}</button>`).join("")}</div>
    <div class="cx-gal" id="cx-gal">${P.map(cxCartePreset).join("")}</div></section>`;
}

// ——— La page ———
async function pageComparer4() {
  setNav("ent");
  if (!R) return;
  const s0 = location.search;
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement…</div></div>`;
  await PXP; if (typeof premStatus === "function") await premStatus().catch(() => null);
  if (location.pathname !== "/comparer" || location.search !== s0) return;
  const CMAX = typeof isPrem === "function" && isPrem() ? 5 : (typeof FREE !== "undefined" ? FREE.cmp : 3);
  const raw = [...new Set((new URLSearchParams(location.search).get("ids") || "").split(",").map(x => x.trim()).filter(id => RBY[id]))];
  const ids = raw.slice(0, CMAX), cut = raw.slice(CMAX).map(id => RBY[id]);
  await Promise.all(ids.map(id => { const s = RBY[id]; if (s.missing || FULL[id]) return null; return fetch(`/data/societes/${id}.json`).then(r => r.ok ? r.json() : null).then(j => { if (j) FULL[id] = j; }).catch(() => null); }));
  if (location.pathname !== "/comparer" || location.search !== s0) return;
  const F = ids.map(id => cxFig(RBY[id])), d0 = typeof PXUP === "string" && PXUP !== "none" ? new Date(PXUP).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }) : "jour";
  setTitle(F.length >= 2 ? `${listFr(F.map(x => x.nom))} : la comparaison` : "Comparer des entreprises");
  const sug = typeof peersOf === "function" && ids.length && ids.length < CMAX ? (() => { const seen = new Set(ids), out = []; ids.forEach(id => peersOf(RBY[id], 5).list.forEach(p => { if (!seen.has(p.id) && !p.missing) { seen.add(p.id); out.push(p); } })); return out.slice(0, 5); })() : [];
  const cutTxt = cut.length ? `<p class="cx-cut">La version gratuite compare ${CMAX} entreprises à la fois : ${esc(listFr(cut.map(c => c.name)))} ${cut.length > 1 ? "n'ont" : "n'a"} pas été ajoutée${cut.length > 1 ? "s" : ""}. <a href="/premium">Premium</a> en compare cinq.</p>` : "";
  const sugTxt = sug.length ? `<div class="cx-sugs"><span>${ids.length ? "Concurrents directs :" : "Suggestions :"}</span>${sug.map(c => `<a href="${cxUrl([...ids, c.id])}">${cxLogo(c)}+ ${esc(c.name)}</a>`).join("")}</div>` : "";
  let html;
  if (F.length < 2) {
    html = `<section class="ek-hero cx-hero"><div class="cx-crumb"><a href="/outils">Outils</a> › Comparer</div><h1>Qui fait mieux ?</h1>
      <p class="cx-lead">Choisissez deux ou trois entreprises : le site les classe sur cinq critères, à partir de leurs comptes officiels.</p>
      <div class="cx-sel${F.length ? "" : " cx-sel1"}">${F.map(x => cxCarte(x, ids)).join("")}${cxAjout(ids, CMAX)}</div>${sugTxt}${cutTxt}</section>${cxGalerie()}`;
  } else {
    const MD = cxMed(F[0].s), R5 = {}; CX_K.forEach(k => R5[k.k] = cxRang(F, k));
    const T = cxTitres(F), E = cxEtapes(F, MD, T, d0), have = new Set(E.map(e => e.id.slice(3)));
    const score = `<div class="cx-score scroll-x"><table><thead><tr><th></th>${CX_K.map((k, i) => have.has(k.k) ? `<th><a class="cx-go" href="#cx-${k.k}" data-cx-go="cx-${k.k}"><i>${E.findIndex(e => e.id === "cx-" + k.k) + 1}</i><br>${k.n}<span>↓</span></a></th>` : "").join("")}</tr></thead>
      <tbody>${F.map(x => `<tr><th>${cxLogo(x.s)}<a href="/entreprise/${esc(x.s.id)}">${esc(x.nom)}</a></th>${CX_K.filter(k => have.has(k.k)).map(k => { const v = x[k.k], up = !k.neutre && MD[k.k] != null && v != null ? (k.haut ? v > MD[k.k] : v < MD[k.k]) : null;
        return `<td><b class="${R5[k.k](x)}">${v == null ? esc(x.bank && (k.k === "m" || k.k === "lev") ? "sans objet" : k.k === "m" && !x.valide ? "non calculable" : k.na || "–") : esc(k.f(v))}${up == null ? "" : `<span class="ar" title="${up ? "mieux" : "moins bien"} que la médiane du secteur">${up ? "▲" : "▼"}</span>`}</b></td>`; }).join("")}</tr>`).join("")}</tbody>
      <tfoot><tr><th><span class="cx-mk">médiane</span>du secteur</th>${CX_K.filter(k => have.has(k.k)).map(k => `<td>${!k.neutre && MD[k.k] != null ? `<span class="cx-med">${esc(k.f(MD[k.k]))}</span>` : ""}</td>`).join("")}</tr></tfoot></table></div>
      <div class="cx-leg"><span><i class="cx-lb"></i>en tête sur ce critère</span><span><i class="cx-lw"></i>dernière ${F.length === 2 ? "des deux" : F.length === 3 ? "des trois" : "du groupe"}</span><span>▲ ▼ mieux ou moins bien que la médiane du secteur</span><span>La taille n'est pas comptée : vendre plus ne veut pas dire faire mieux. Être en tête n'est ni une recommandation ni une prédiction.</span></div>`;
    const proches = cxProches(ids), qs = cxQuestions(F);
    // Titre de la comparaison : celui de la comparaison toute prête quand les entreprises sont les mêmes, sinon le ou les secteurs
    const cle = l => l.slice().sort().join(","), pre = cxPresets().find(p => cle(p.ids.filter(id => RBY[id])) === cle(ids));
    const secs = [...new Set(F.map(x => secName(x.s)))], titreC = pre ? pre.t : secs.length === 1 ? `Comparaison · ${secs[0]}` : `Comparaison · ${listFr(secs.map(t => t.toLowerCase())).replace(/^./, c => c.toUpperCase())}`;
    html = `<section class="ek-hero cx-hero"><div class="cx-crumb"><a href="/outils">Outils</a> › Comparer</div><span class="cx-titre">${esc(titreC)}</span><h1>${esc(listFr(F.map(x => x.nom)).replace(/ et ([^ ]+)$/, " ou $1"))} ?</h1>${pre && pre.d ? `<p class="cx-lead">${esc(pre.d)}</p>` : ""}
        <div class="cx-sel">${F.map(x => cxCarte(x, ids)).join("")}${cxAjout(ids, CMAX)}</div>${sugTxt}${cutTxt}
        <div class="cx-bar"><button type="button" data-cx-share>🔗 Partager cette comparaison</button><a href="/comparer">Tout retirer</a></div></section>
      <div class="ek-vrd"><span class="ek-stk2" style="background:#fff">Le verdict</span><h2>${cxVerdict(F, R5)}</h2></div>${score}
      <section class="ek-sec" id="cx-fil"><span class="ek-stk2">Critère par critère</span><h2>${E.length} questions, dans l'ordre.</h2>${ekFil(E.map(e => ({ id: e.id, n: e.n, sur: e.sur, titre: e.titre, concept: e.concept, visuel: e.visuel, explique: e.droite, suite: e.suite })))}</section>
      <section class="ek-sec" id="cx-tout"><span class="ek-stk2 b">Pour aller plus loin</span><h2>Tous les chiffres, côte à côte.</h2>${cxTableau(F, MD)}</section>
      <section class="ek-end"><h2>✦ Une question sur ${F.length === 2 ? "ces deux" : F.length === 3 ? "ces trois" : "ces"} entreprises ?</h2><div class="ek-qs">${qs.map(q => `<button type="button" data-cx-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
        <form class="ek-ask" data-cx-ask><input type="text" name="q" maxlength="300" placeholder="Posez votre question sur ${esc(listFr(F.map(x => x.nom)))}…" aria-label="Votre question" autocomplete="off"><button type="submit">Demander</button></form>
        <small>L'IA du site répond avec les chiffres de cette page. Information factuelle, sans conseil.</small></section>
      <section class="ek-sec" id="cx-sources"><span class="ek-stk2" style="background:var(--ek-y)">Prouvé</span><h2>D'où viennent ces chiffres.</h2>${cxSources(F, MD, d0)}</section>
      ${proches.length ? `<section class="ek-sec" id="cx-proches"><span class="ek-stk2 p">Dans le même esprit</span><h2>D'autres comparaisons proches.</h2><div class="cx-gal">${proches.map(cxCartePreset).join("")}</div></section>` : ""}`;
    window.CXF = F; window.CXMD = MD;
  }
  app.innerHTML = `<div class="ek ek-page cx-page">${html}</div>`;
  CX.ids = ids; CX.CMAX = CMAX;
  cxRecherche(ids, CMAX);
  if (CX.focus) { CX.focus = false; const q = document.getElementById("cxq"); if (q) q.focus({ preventScroll: true }); }
}
function cxQuestions(F) {
  const ms = F.filter(x => x.m != null).sort((a, b) => b.m - a.m), dn = F.find(x => x.net.length >= 2 && cxLast(x.net) != null && x.net[x.net.length - 2] > 0 && cxLast(x.net) < x.net[x.net.length - 2] * 0.7);
  const q = [];
  if (ms.length >= 2) q.push(`Pourquoi ${ms[0].nom} garde-t-elle plus sur ses ventes que ${ms[ms.length - 1].nom} ?`);
  if (dn) q.push(`Qu'est-ce qui a fait baisser le bénéfice de ${dn.nom} ?`);
  q.push(`Qu'est-ce qui distingue le métier de ${listFr(F.slice(0, 3).map(x => x.nom))} ?`);
  return q.slice(0, 2);
}

// ——— Recherche dans le champ « Ajouter » ———
function cxRecherche(ids, CMAX) {
  const q = document.getElementById("cxq"), box = document.getElementById("cxs"); if (!q || !box) return;
  let hits = [], sel = -1;
  const nrm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const pick = id => { if (!id || ids.includes(id)) return; CX.focus = ids.length + 1 < CMAX; go(cxUrl([...ids, id])); };
  const draw = () => {
    const t = nrm(q.value.trim());
    if (!t) { box.hidden = true; q.setAttribute("aria-expanded", "false"); return; }
    const score = c => { const n = nrm(c.name), tk = nrm(c.ticker || ""); if (tk === t || nrm(c.isin) === t) return 0; if (n.startsWith(t)) return 1; if (n.split(/[\s'’.-]+/).some(w => w.startsWith(t))) return 2; if (t.length >= 2 && n.includes(t)) return 3; if (t.length >= 2 && tk.startsWith(t)) return 4; return 9; };
    hits = R.companies.filter(c => !ids.includes(c.id)).map(c => [score(c), c]).filter(x => x[0] < 9).sort((a, b) => a[0] - b[0] || (caEur(b[1]) - caEur(a[1]))).slice(0, 8).map(x => x[1]);
    sel = -1;
    box.innerHTML = hits.length ? hits.map((c, i) => `<button type="button" role="option" id="cxs-${i}" data-id="${esc(c.id)}">${cxLogo(c)}<span><b>${esc(c.name)}</b><small>${esc([c.ticker, secName(c), regName(c)].filter(Boolean).join(" · "))}</small></span></button>`).join("") : `<p>Aucune entreprise trouvée.</p>`;
    box.hidden = false; q.setAttribute("aria-expanded", "true");
  };
  const mark = () => { [...box.querySelectorAll("button")].forEach((b, i) => b.classList.toggle("on", i === sel)); const b = box.querySelectorAll("button")[sel]; if (b) { b.scrollIntoView({ block: "nearest" }); q.setAttribute("aria-activedescendant", b.id); } };
  q.addEventListener("input", draw);
  q.addEventListener("keydown", e => {
    const n = box.querySelectorAll("button").length;
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && n) { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n; mark(); }
    else if (e.key === "Enter") { e.preventDefault(); const b = box.querySelectorAll("button")[Math.max(0, sel)]; if (b) pick(b.dataset.id); }
    else if (e.key === "Escape") { box.hidden = true; q.setAttribute("aria-expanded", "false"); }
  });
  box.addEventListener("mousedown", e => e.preventDefault());
  box.addEventListener("click", e => { const b = e.target.closest("button[data-id]"); if (b) pick(b.dataset.id); });
  q.addEventListener("blur", () => setTimeout(() => { box.hidden = true; q.setAttribute("aria-expanded", "false"); }, 150));
}

async function cxPartager() {
  const url = location.origin + "/comparer" + location.search;
  if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ title: document.title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  let ok = false; try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { }
  if (typeof toast === "function") toast(ok ? "Lien copié. Collez-le pour partager cette comparaison." : `Copiez ce lien : <span style="word-break:break-all">${esc(url)}</span>`);
}
function cxCsv() {
  const t = document.querySelector(".cx-tt"); if (!t) return;
  const rows = [...t.querySelectorAll("tr")].map(tr => [...tr.querySelectorAll("th,td")].map(c => `"${c.innerText.replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`).join(";"));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `comparaison-${(CX.ids || []).join("-")}.csv`; document.body.appendChild(a); a.click(); a.remove();
}
document.addEventListener("click", e => {
  if (location.pathname !== "/comparer") return;
  const g = e.target.closest("[data-cx-go]"); if (g) { e.preventDefault(); const t = document.getElementById(g.dataset.cxGo); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (e.target.closest("[data-cx-share]")) { e.preventDefault(); cxPartager(); return; }
  if (e.target.closest("[data-cx-csv]")) { e.preventDefault(); cxCsv(); return; }
  const th = e.target.closest("[data-cx-th]"); if (th) { document.querySelectorAll("[data-cx-th]").forEach(b => b.classList.toggle("on", b === th)); document.querySelectorAll("#cx-gal .cx-pc").forEach(a => a.hidden = !!th.dataset.cxTh && a.dataset.th !== th.dataset.cxTh); return; }
  const q = e.target.closest("[data-cx-q]"); if (q && typeof orcIaOpen === "function") { orcIaOpen(); if (typeof orcIaAsk === "function") orcIaAsk(q.dataset.cxQ); }
});
document.addEventListener("submit", e => {
  const f = e.target.closest && e.target.closest("[data-cx-ask]"); if (!f) return; e.preventDefault();
  const q = (f.q.value || "").trim(); if (!q || typeof orcIaOpen !== "function") return;
  orcIaOpen(); if (typeof orcIaAsk === "function") orcIaAsk(q + ` (comparaison : ${listFr((CX.ids || []).map(id => RBY[id] && RBY[id].name).filter(Boolean))})`); f.q.value = "";
});

// Branchement : remplace l'ancienne page (m/comparer.js, comparer3.js et les retouches de design.js / outils.js)
if (CX.on) {
  window.pageComparer = pageComparer4;
  if (typeof R !== "undefined" && R && location.pathname === "/comparer") pageComparer4();
}
