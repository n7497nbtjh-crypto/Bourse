/* ---------- Fiche entreprise v4 (lot 2 de la refonte, 2/11/2026) ----------
   Maquette validée par Romain : docs/maquettes/fiche-hermes-v14.html. Une seule page, construite d'un bloc, sans recomposer l'ancienne fiche :
   1. en-tête jaune : identité, cours et fourchette sur un an, verdict en une phrase, chaîne des 5 repères (face à la médiane des rivales) ;
   2. le fil en 5 étapes (composants partagés m/composants.js) : ce qu'elle vend, ce qu'elle en garde, ce qu'il lui reste, ce qu'elle reverse,
      ce que ça coûte en Bourse ; chaque étape = un graphique + « Ce qui l'explique » (causes calculées sur les comptes) + une carte repliée ;
   3. actualité, « Prouvé », tous les chiffres, questions à l'IA du site.
   Rivales : data/concurrents.json. Sont écartées et nommées sous les graphiques : une société aux mêmes ventes qu'une autre (holding du même
   groupe, ex. Christian Dior SE et LVMH) et une société aux comptes incohérents (bénéfice ou résultat supérieur aux ventes). Moins de 3 rivales
   valables : comparaison au secteur entier, dit en clair. Aucun chiffre écrit en dur : tout vient des fichiers de données.
   Lit : RBY, FULL (/data/societes/<id>.json), CONC, REP, AG, PX (valo, pxOf), FICHES, wikidata (ficheWDLoad), AVERIF.
   Styles : /composants.css (classes ek-). Les modules fiche.js, fiche2.js, fiche3.js seront retirés au lot 3. */

const F4 = { on: true };
const F4_SYM = c => (typeof CUR !== "undefined" && CUR[c]) || " " + (c || "");
function f4Md(m, cur) { // montant en millions → « 16,0 Md€ » / « 852 M€ »
  if (m == null || !isFinite(m)) return "–";
  const a = Math.abs(m), s = m < 0 ? "−" : "";
  return s + (a >= 1000 ? ekFr(a / 1000, a >= 100000 ? 0 : 1) + " Md" : ekFr(a, 0) + " M") + F4_SYM(cur).trim().replace(/^(?=[A-Z])/, " ");
}
const f4Pc = (r, d = 1, sign = false) => { if (r == null || !isFinite(r)) return "–"; const t = ekFr(Math.abs(r * 100), d); return (/^0(,0*)?$/.test(t) ? "" : sign && r > 0 ? "+" : r < 0 ? "−" : "") + t + " %"; };
const f4Med = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
function f4Nice(max) { if (!(max > 0)) return { max: 1, ticks: [0, 1] }; const p = Math.pow(10, Math.floor(Math.log10(max))); const m = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => x * p >= max * 1.12) || 10; const top = m * p;
  const st = [2, 3, 4, 5].map(n => top / n).find(v => Number.isInteger(v / Math.pow(10, Math.floor(Math.log10(v)) - 1))) || top / 4, ticks = []; for (let t = 0; t <= top + 1e-9; t += st) ticks.push(+t.toFixed(10)); return { max: top, ticks }; }

// ——— Mesures d'une société (dernier exercice, fichier d'index) ———
function f4M(c) {
  const ok = v => v != null && isFinite(v), r = {};
  if (ok(c.ca) && c.caPrev > 0) r.g = c.ca / c.caPrev - 1;
  if (c.ca > 0 && ok(c.ebit) && !isBank(c)) r.m = c.ebit / c.ca;
  if (c.ca > 0 && ok(c.net)) r.nm = c.net / c.ca;
  if (c.equity > 0 && ok(c.net)) r.roe = c.net / c.equity;
  if (c.net > 0 && ok(c.divPaid)) r.pay = c.divPaid / c.net;
  else if (c.dps > 0 && c.eps > 0) r.pay = c.dps / c.eps; // dividendes versés non publiés : dividende par action ÷ bénéfice par action
  if (ok(c.net) && c.netPrev > 0) r.ng = c.net / c.netPrev - 1;
  try { const v = valo(c); if (v) { if (v.pe > 0) r.pe = v.pe; if (v.peNs) r.peNs = true; if (v.yld != null) r.yld = v.yld; } } catch (e) { }
  return r;
}
const f4Valide = c => c && !c.missing && c.ca > 0 && (c.net == null || Math.abs(c.net) <= c.ca) && (c.ebit == null || Math.abs(c.ebit) <= c.ca);

// ——— Rivales : liste du site, doublons et comptes incohérents écartés (et nommés) ———
const f4ValideB = c => c && !c.missing && c.equity > 0 && c.net != null && isFinite(c.net);
function f4Rivales(s, bk) {
  const val = bk ? f4ValideB : f4Valide, cle = bk ? "net" : "ca";
  const ids = (typeof CONC !== "undefined" && CONC[s.id]) || [], out = [], L = [], vus = [[s[cle], s.name]];
  ids.forEach(id => { const c = RBY[id]; if (!c || c.id === s.id) return;
    if (!val(c)) { out.push({ nom: c.name, raison: c.missing ? "ses comptes ne sont pas encore relevés sur le site" : "ses comptes sont incomplets sur le site" }); return; }
    const d = vus.find(([ca]) => ca && Math.abs(c[cle] / ca - 1) < 0.002); if (d) { out.push({ nom: c.name, raison: `${bk ? "même bénéfice" : "mêmes ventes"} que ${d[1]} (même groupe), comptée une seule fois` }); return; }
    vus.push([c[cle], c.name]); L.push(c); });
  if (L.length >= 3) return { L, out, mode: "rivales", lib: `ses ${L.length} rivales` };
  const sec = R.companies.filter(c => c.id !== s.id && c.sector === s.sector && val(c) && isBank(c) === isBank(s));
  return { L: sec, out: [], mode: "secteur", lib: `les ${sec.length} entreprises du secteur ${secName(s).toLowerCase()}` };
}

// ——— Séries sur plusieurs exercices (fichier complet) ———
function f4Serie(c, k, n = 4) { if (!c || !c.fin || !c.fin[k] || !c.fin[k].slice(-n).some(v => v != null && isFinite(v))) return null; const y = c.years.slice(-n), v = c.fin[k].slice(-n); return { y, v }; }
const f4Taux = (c, i) => { const t = c.fin.tax && c.fin.tax[i], p = c.fin.pretax && c.fin.pretax[i]; return t != null && p > 0 ? t / p : null; };

// ——— Jauge courte des repères de l'en-tête ———
function f4Jauge(v, m, basEstMieux, ecart) {
  if (v == null || m == null) return "";
  let d = ecart ? (v - m) / ecart : (m ? (v / m - 1) : 0); if (basEstMieux) d = -d;
  const x = 50 + Math.max(-44, Math.min(44, d * 50));
  return `<span class="ek-mg" style="background:linear-gradient(90deg,${basEstMieux ? "#BFF0DA" : "#FFD0C4"} 0 50%,${basEstMieux ? "#FFD0C4" : "#BFF0DA"} 50%)"><b style="left:${basEstMieux ? 100 - x : x}%"></b></span>`;
}
function f4Ton(v, m, basEstMieux, ecartAbs) { // "g" mieux, "r" moins bien, "" comparable
  if (v == null || m == null) return "";
  const mieux = ecartAbs != null ? v > m + ecartAbs : v > m * 1.15, pire = ecartAbs != null ? v < m - ecartAbs : v < m * 0.85;
  return basEstMieux ? (v < m * 0.85 ? "g" : v > m * 1.15 ? "r" : "") : mieux ? "g" : pire ? "r" : "";
}

// ——— La page ———
async function pageCompany4(id, tab) {
  const s = RBY[id];
  if (!s) return pageNotFound();
  setNav("ent"); setTitle(s.name);
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement de la fiche…</div></div>`;
  const load = s.missing ? Promise.resolve(null) : (FULL[id] ? Promise.resolve(FULL[id]) : fetch(`/data/societes/${id}.json`).then(r => r.json()).then(j => FULL[id] = j).catch(() => null));
  const [c] = await Promise.all([load, PXP, typeof ficheWDLoad === "function" ? ficheWDLoad(id) : null, typeof loadFiches === "function" ? loadFiches() : null]);
  if (typeof ficheMemeId === "function" && !ficheMemeId(id)) return;
  if (s.missing || !c || !c.fin) { app.innerHTML = `<div class="ek ek-page">${f4Tete(s, null, null)}<p class="ek-note" style="margin-top:30px">Les comptes de ${esc(s.name)} ne sont pas encore relevés sur le site.</p></div>`; return; }
  const bk = isBank(s) || !f4Valide(s), P = f4Rivales(s, bk), M = f4M(s), MED = {};
  ["g", "ng", "m", "nm", "roe", "pay", "pe", "yld"].forEach(k => MED[k] = f4Med(P.L.map(x => f4M(x)[k]).filter(v => !(k === "pay" && v > 1.5))));
  const ctx = { bk, s, c, P, M, MED, cur: s.currency, sym: F4_SYM(s.currency).trim(), nom: s.name, rap: ((c.sources || [])[0] || {}).report || null };
  let html = "";
  try { html = f4Tete(s, c, ctx) + f4Fil(ctx) + f4Fin(ctx); }
  catch (e) { console.error("fiche v4", e); html = f4Tete(s, c, ctx) + `<p class="ek-note">Une partie de la fiche n'a pas pu s'afficher.</p>`; }
  app.innerHTML = `<div class="ek ek-page">${html}</div>`;
  f4Ancres(ctx);
  const cible = tab === "comptes" ? "tout" : (tab === "actualite" || tab === "agenda" || tab === "communaute") ? "actu" : location.hash.slice(1);
  if (cible) { const t = document.getElementById(cible); if (t) setTimeout(() => { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView({ block: "start" }); }, 30); }
}

function f4Tete(s, c, x) {
  const p = typeof pxOf === "function" ? pxOf(s) : null, fi = (typeof FICHES !== "undefined" && FICHES && FICHES[s.id]) || null;
  const pea = typeof peaOk === "function" ? peaOk(s) : null, ini = s.name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  let pc = "";
  if (p) {
    const ch = p.chg, pos = p.h52 > p.l52 && p.l52 > 0 && p.h52 / p.l52 <= 3 ? Math.max(0, Math.min(100, (p.p - p.l52) / (p.h52 - p.l52) * 100)) : null, dd = p.h52 > 0 ? p.p / p.h52 - 1 : null;
    pc = `<div class="ek-pcard"><div class="ek-p"><b>${esc(pxFmt(p.p, p.cur))}</b>${ch != null ? `<span style="color:${ch > 0 ? EK_G : ch < 0 ? EK_R : "#555"}">${ch > 0 ? "+" : ""}${ekFr(ch, 2)} % ${esc(typeof jourSeance === "function" ? jourSeance() : "")}</span>` : ""}</div>
      <small>Cours différé${typeof PXUP === "string" && PXUP !== "none" ? ", relevé le " + esc(new Date(PXUP).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })) : ""}</small>
      ${pos != null ? `<div class="ek-rg"><i style="left:${pos}%"></i><em style="left:${pos}%">aujourd'hui</em></div><div class="ek-rgl"><span>plus bas ${esc(pxFmt(p.l52, p.cur))}</span><span>plus haut ${esc(pxFmt(p.h52, p.cur))}</span></div>
      <p>Sur un an, l'action a valu entre ${esc(pxFmt(p.l52, p.cur))} et ${esc(pxFmt(p.h52, p.cur))}.${dd != null && dd < -0.03 ? ` Elle est aujourd'hui <b>${ekFr(-dd * 100, 0)} % sous son plus haut</b>.` : " Elle est proche de son plus haut."}</p>` : ""}
      ${s.tv ? `<button type="button" class="ek-lk" data-f4-tv>Voir le graphique du cours ↗</button>` : ""}</div>`;
  } else pc = `<div class="ek-pcard"><small>Cours non disponible pour ce titre.</small></div>`;
  const chips = [secName(s), [typeof regName === "function" ? regName(s) : "", s.ticker].filter(Boolean).join(" · "), pea === true ? "Éligible au PEA ✓" : pea === false ? "Hors PEA" : ""].filter(Boolean);
  return `<section class="ek-hero">
    <div class="ek-crumb"><a href="/entreprises">Entreprises</a><span>›</span>${esc(secName(s))}<span>›</span>${esc(s.name)}</div>
    <div class="ek-top"><div><div class="ek-idt"><span class="ek-mono" aria-hidden="true">${esc(ini)}</span><h1>${esc(s.name)}</h1></div>
      <p class="ek-desc">${esc((fi && fi.fait) || s.desc || "")}</p><div class="ek-chips">${chips.map(t => `<span class="ek-chip">${esc(t)}</span>`).join("")}</div></div>${pc}</div>
    <div id="f4tv" hidden></div>
    ${x ? f4Verdict(x) + f4Chaine(x) : ""}
    <div class="ek-medl"><span>${x ? `Chaque repère est placé face à la ${ekDefMot("mediane", "médiane", {})} de <b>${esc(x.P.lib)}</b>${x.P.mode === "rivales" ? ` (${esc(x.P.L.map(r => r.name).join(", "))})` : ""}.` : ""}</span>
      <div class="ek-acts">${typeof favBtn === "function" ? favBtn("c:" + s.id).replace('class="favbtn', 'class="ek-btn dk favbtn') : ""}${x && x.P.mode === "rivales" ? `<a class="ek-btn" href="/comparer?ids=${esc([s.id, ...x.P.L.slice(0, 2).map(r => r.id)].join(","))}">Comparer à ses rivales</a>` : ""}<button type="button" class="ek-btn bl" data-f4-ia>✦ Poser une question à l'IA</button></div></div>
  </section>`;
}

function f4Verdict(x) {
  const { M, MED, s } = x, k = x.bk ? "roe" : "m", rent = f4Ton(M[k], MED[k]), lev = s.netDebt != null && s.ebit > 0 ? s.netDebt / s.ebit : null;
  const a = rent === "g" ? "Très rentable" : rent === "r" ? "<em>Peu rentable</em>" : "Rentable comme ses rivales";
  const b = x.bk ? "" : s.netDebt == null ? "" : s.netDebt <= 0 ? "sans dette" : lev > 3 ? "<em>endettée</em>" : "dette modérée";
  const pr = M.pe == null ? "" : f4Ton(M.pe, MED.pe, true), c = M.pe == null ? "" : pr === "r" ? "<em>chère</em>" : pr === "g" ? "peu chère" : "prix dans la moyenne";
  const parts = [a, b, c].filter(Boolean);
  return `<div class="ek-vrd"><span class="ek-stk2">Le verdict</span><h2>${parts.join(", ").replace(/^(<em>)?(\w)/, (m0, t, l) => (t || "") + l.toUpperCase())}.</h2></div>`;
}

function f4Chaine(x) {
  const { M, MED, s, sym } = x, bank = isBank(s), k2 = bank ? "nm" : "m";
  const R5 = x.bk ? [
    ["Son bénéfice", f4Pc(M.ng, 1, true), f4Ton(M.ng, MED.ng, false, 0.02), `sur un an : ${f4Md(s.net, s.currency)} en ${s.year}`, f4Jauge(M.ng, MED.ng, false, 0.3), MED.ng != null ? `rivales : ${f4Pc(MED.ng, 1, true)}` : ""],
    ["Sa rentabilité", M.roe != null ? ekFr(M.roe * 100, 1) + " %" : "–", f4Ton(M.roe, MED.roe), `gagnés sur 100 ${sym} de fonds propres`, f4Jauge(M.roe, MED.roe), MED.roe != null ? `rivales : ${ekFr(MED.roe * 100, 1)} %` : ""],
  ] : [
    ["Ses ventes", f4Pc(M.g, 1, true), f4Ton(M.g, MED.g, false, 0.02), `sur un an : ${f4Md(s.ca, s.currency)} de ventes en ${s.year}`, f4Jauge(M.g, MED.g, false, 0.2), MED.g != null ? `rivales : ${f4Pc(MED.g, 1, true)}` : ""],
    ["Sa marge", M[k2] != null ? ekFr(M[k2] * 100, 0) + " " + sym : "–", f4Ton(M[k2], MED[k2]), `gardés sur 100 ${sym} de ventes`, f4Jauge(M[k2], MED[k2]), MED[k2] != null ? `rivales : ${ekFr(MED[k2] * 100, 0)} ${sym}` : ""],
  ];
  if (!x.bk) R5.push(
    ["Son bénéfice", M.nm != null ? ekFr(M.nm * 100, 0) + " " + sym : "–", f4Ton(M.nm, MED.nm), `de bénéfice sur 100 ${sym}${s.netDebt != null && s.netDebt <= 0 && !bank ? ", et aucune dette" : ""}`, f4Jauge(M.nm, MED.nm), MED.nm != null ? `rivales : ${ekFr(MED.nm * 100, 1)} ${sym}` : ""]);
  R5.push(
    ["Son dividende", M.pay != null ? (M.pay > 1.5 ? "> 100 %" : f4Pc(M.pay, 0)) : s.divPaid || s.dps ? "–" : "0 %", "", M.pay > 1.5 ? "le dividende dépasse le bénéfice de l'année" : s.dps ? `du bénéfice versé : ${ekFr(s.dps, s.dps >= 10 ? 0 : 2)} ${sym} par action` : "du bénéfice versé", f4Jauge(M.pay, MED.pay), MED.pay != null ? `rivales : ${f4Pc(MED.pay, 0)}` : ""],
    ["Son prix en Bourse", M.pe != null ? ekFr(M.pe, 0) + " fois" : "–", M.pe != null ? f4Ton(M.pe, MED.pe, true) : "", M.pe != null ? "son bénéfice annuel (PER)" : "PER non significatif", f4Jauge(M.pe, MED.pe, true), MED.pe != null ? `rivales : ${ekFr(MED.pe, 0)} fois` : ""]);
  return `<div class="ek-chain" style="--n:${R5.length}">${R5.map((r, i) => `<a class="ek-rp" href="#e${i + 1}"><span class="ek-st"><i>${i + 1}</i>${esc(r[0])}</span><span class="ek-v ${r[2]}">${esc(r[1])}</span><span class="ek-s">${esc(r[3])}</span>${r[4]}<span class="ek-ml">${esc(r[5])}</span><span class="ek-go">Comprendre <span>↓</span></span></a>`).join("")}</div>`;
}

// ——— Le fil en 5 étapes ———
function f4Fil(x) {
  const E = x.bk ? [f4B1(x), f4B2(x), f4E4(x), f4E5(x)] : [f4E1(x), f4E2(x), f4E3(x), f4E4(x), f4E5(x)];
  E.forEach((e, i) => { e.id = "e" + (i + 1); e.n = i + 1; });
  return `<section class="ek-sec" id="fil"><span class="ek-stk2">L'histoire de ses comptes</span><h2>${x.bk ? "De son bénéfice au prix de l'action" : "De ses ventes au prix de l'action"}, en ${E.length} étapes.</h2>${ekFil(E)}</section>`; }
const f4Src = (x, t) => ({ texte: t || "Comptes officiels", lien: x.rap });
const f4Prochain = id => { const e = typeof eventsOf === "function" ? eventsOf(id).find(e => e.date >= TODAY && e.type === "Résultats") : null; return e ? `${e.label || "Prochaine publication"} le ${new Date(e.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.` : ""; };

function f4E1(x) {
  const { s, c, M, MED, P } = x, se = f4Serie(c, "ca"), cur = s.currency;
  const gs = []; if (se) for (let i = 1; i < se.v.length; i++) if (se.v[i] != null && se.v[i - 1] > 0) gs.push([se.y[i], se.v[i] / se.v[i - 1] - 1]);
  const causes = [];
  const rep = typeof REP !== "undefined" && REP[s.id];
  if (rep && rep.activites && rep.activites.length) { const a = rep.activites[0], z = rep.zones && rep.zones[0];
    causes.push({ titre: `${a[0]} : ${ekFr(a[1], 0)} % des ventes`, texte: `Son premier métier${z ? `. Premier marché : ${z[0]} (${ekFr(z[1], 0)} %)` : ""}. Répartition ${rep.annee || ""}.`, lien: { href: "#m1", label: "son métier ↓" } }); }
  const last = gs.length ? gs[gs.length - 1] : null, prev = gs.length > 1 ? gs[gs.length - 2] : null;
  return { id: "e1", n: 1, sur: "Ses ventes", titre: `${f4Md(s.ca, cur)} de ventes en ${s.year}, ${f4Pc(M.g, 1, true)} sur un an.`,
    mots: [{ cle: "ventes", ex: f4Md(s.ca, cur), calc: `ventes ${s.year}`, nom: s.name }, { cle: "croissance", ex: f4Pc(M.g, 1, true), calc: `${ekFr(s.ca, 0)} ÷ ${ekFr(s.caPrev, 0)} − 1`, nom: s.name }],
    visuel: se ? f4Cols(x, se, "Ses ventes", null, `Chaque barre donne les ventes d'un exercice ; sous l'année, la variation par rapport à l'année d'avant.${gs.length >= 2 ? ` Depuis ${se.y[0]} : ${f4Pc(se.v[se.v.length - 1] / se.v.find(v => v > 0) - 1, 0, true)}.` : ""}`) : "",
    explique: causes.length ? ekExplique({ causes, surveiller: f4Prochain(s.id) }) : "",
    plus: ekPlus({ id: "m1", icone: "◎", titre: "Son métier et d'où viennent ses ventes", html: f4Metier(x) }),
    suite: `Sur ces ${f4Md(s.ca, cur)}, combien lui reste-t-il une fois l'activité payée ?` };
}

function f4Cols(x, se, titre, ligne, indice, fmtD) {
  const cur = x.s.currency, md = Math.max(...se.v.filter(v => v != null).map(Math.abs)) >= 1000, f = v => md ? ekFr(v / 1000, fmtD != null ? fmtD : (Math.abs(v) >= 100000 ? 0 : v >= 10000 ? 1 : 2)) : ekFr(v, 0);
  const nm = f4Nice(Math.max(...se.v.filter(v => v != null)));
  return ekColonnes({ titre, unite: `en ${md ? "milliards" : "millions"} ${cur === "EUR" ? "d'€" : "de " + x.sym}`, annees: se.y, valeurs: se.v, fmt: f, max: nm.max, graduations: nm.ticks, fmtAxe: t => md ? ekFr(t / 1000, t / 1000 < 10 && t % 1000 ? 1 : 0) : ekFr(t, 0), ligne, indice, source: f4Src(x, "Comptes officiels, exercices clos") });
}

function f4Metier(x) {
  const { s } = x, wd = typeof ficheWd === "function" ? ficheWd(s.id) : null, fi = (typeof FICHES !== "undefined" && FICHES && FICHES[s.id]) || null, rep = typeof REP !== "undefined" && REP[s.id];
  let h = "";
  const facts = [];
  if (wd && wd.fonde) facts.push(["Création", wd.fonde, wd.fondateurs && wd.fondateurs.length ? "par " + wd.fondateurs.slice(0, 2).join(" et ") : ""]);
  if (wd && wd.siege) facts.push(["Siège", wd.siege, wd.pays || ""]);
  if (wd && wd.effectif && wd.effectif[0]) facts.push(["Salariés", ekFr(wd.effectif[0], 0), wd.effectif[1] ? "chiffre de " + wd.effectif[1] : ""]);
  try { const sec = R.companies.filter(c => c.sector === s.sector && f4Valide(c)).map(c => [c.id, typeof caEur === "function" ? caEur(c) : c.ca]).sort((p, q) => q[1] - p[1]), k = sec.findIndex(z => z[0] === s.id);
    if (k >= 0 && sec.length > 5) facts.push(["Taille dans son secteur", `${k + 1}${k ? "e" : "re"} sur ${sec.length}`, "par les ventes"]); } catch (e) { }
  if (facts.length) h += `<div class="ek-facts">${facts.map(f => `<div><small>${esc(f[0])}</small><b>${esc(f[1])}</b><span>${esc(f[2])}</span></div>`).join("")}</div>`;
  if (fi) h += `<div class="ek-three">${[["Ce qu'elle fait", fi.fait, "#E2F8EE"], ["Comment elle gagne de l'argent", fi.argent, "#FFF6C7"], ["Ce dont elle dépend", fi.depend, "#FFE0EC"]].filter(t => t[1]).map(t => `<div style="background:${t[2]}"><small>${esc(t[0])}</small>${esc(t[1])}</div>`).join("")}</div>`;
  if (rep && (rep.activites || rep.zones)) {
    const COL = ["#FFE14D", "#FF7EB3", "#A9B6FF", "#6EE3B5", "#FFB27A", "#C8A2FF", "#E6E4DE", "#BDE0FE"];
    const bloc = (t, L) => !L || !L.length ? "" : `<div><h4>${esc(t)} · ${esc(rep.annee || "")}</h4><div class="ek-bar">${L.map((l, i) => `<i style="width:${l[1]}%;background:${COL[i % COL.length]}">${l[1] >= 8 ? ekFr(l[1], 0) + " %" : ""}</i>`).join("")}</div>
      <div class="ek-leg">${L.map((l, i) => `<div><b style="background:${COL[i % COL.length]}"></b>${esc(l[0])}<span>${ekFr(l[1], 0)} % · ${esc(f4Md(x.s.ca * l[1] / 100, x.s.currency))}</span></div>`).join("")}</div></div>`;
    h += `<div class="ek-rep">${bloc("Par activité", rep.activites)}${bloc("Par zone géographique", rep.zones)}</div>${rep.source ? `<p class="ek-note">Répartition relevée dans la <a href="${esc(rep.source)}" target="_blank" rel="noopener">publication de l'entreprise</a> ; montants calculés sur les ventes ${esc(x.s.year)}.</p>` : ""}`;
  }
  return h || `<p class="ek-note">Pas encore de description détaillée pour cette entreprise.</p>`;
}

function f4E2(x) {
  const { s, c, M, MED, P, sym } = x, bank = isBank(s), k = bank ? "nm" : "m", v = M[k], med = MED[k];
  const lib = bank ? "bénéfice sur 100 " + sym + " de revenus" : "marge d'exploitation";
  const rows = [{ nom: s.name, v: v != null ? v * 100 : null, texte: v != null ? ekFr(v * 100, 0) + " " + sym : "", moi: 1 }, ...P.L.map(r => { const m = f4M(r)[k]; return { nom: r.name, v: m != null ? m * 100 : null, texte: m != null ? ekFr(m * 100, 0) + " " + sym : (r.missing ? "comptes non relevés" : "chiffre non publié sous cette forme") }; })]
    .filter(r => r.v == null || r.v > -1000);
  const pl = rows.filter(r => r.v != null).sort((a, b) => b.v - a.v), hors = rows.filter(r => r.v == null);
  const mx = Math.max(10, ...pl.map(r => r.v)), nn = f4Nice(mx), mn = Math.min(0, ...pl.map(r => r.v));
  const pts = P.mode === "rivales" ? [...pl.map(r => ({ ...r, v: Math.max(0, r.v) })), ...hors, ...P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison }))] : pl.filter(r => r.moi).concat(hors.filter(r => r.moi));
  const ratio = v != null && med > 0 ? v / med : null;
  const titre = v == null ? `Sa marge n'est pas publiée sous une forme comparable.` : `Sur 100 ${sym} vendus, elle en garde ${ekFr(v * 100, 0)}. ${ratio == null ? "" : ratio >= 1.15 ? `${ratio >= 1.8 && ratio < 2.2 ? "Presque deux fois plus que" : ekFr(ratio, 1) + " fois plus que"} ${P.mode === "rivales" ? "ses rivales" : "son secteur"}.` : ratio <= 0.85 ? `Moins que ${P.mode === "rivales" ? "ses rivales" : "son secteur"} (${ekFr(med * 100, 0)} ${sym}).` : `Comme ${P.mode === "rivales" ? "ses rivales" : "son secteur"}.`}`;
  // Causes : stabilité de la marge, coûts face aux ventes, rivale la moins rentable
  const causes = [], ca = f4Serie(c, "ca"), eb = f4Serie(c, bank ? "net" : "ebit");
  if (ca && eb) {
    const mg = ca.v.map((x2, i) => x2 > 0 && eb.v[i] != null ? eb.v[i] / x2 * 100 : null), ok = mg.filter(z => z != null);
    if (ok.length >= 3) { const lo = Math.min(...ok), hi = Math.max(...ok), f0 = ok[0], f1 = ok[ok.length - 1];
      const i0 = ca.v.findIndex((z, i) => z > 0 && eb.v[i] > 0), gc = ca.v[ca.v.length - 1] / ca.v[i0] - 1, ge = eb.v[eb.v.length - 1] / eb.v[i0] - 1;
      if (i0 >= 0 && i0 < ca.v.length - 1 && isFinite(gc) && isFinite(ge)) causes.push({ titre: ge > gc + 0.02 ? "Le résultat grandit plus vite que les ventes" : ge < gc - 0.02 ? "Les coûts montent plus vite que les ventes" : "Les coûts suivent les ventes, sans les dépasser", texte: `Depuis ${ca.y[i0]} : ventes ${f4Pc(gc, 0, true)}, ${bank ? "bénéfice" : "résultat d'exploitation"} ${f4Pc(ge, 0, true)}. ${ge > gc + 0.02 ? "La marge s'améliore en grandissant." : ge < gc - 0.02 ? "La marge s'use." : "La marge ne s'use pas en grandissant."}` });
    }
  }
  const pire = pl.filter(r => !r.moi).slice(-1)[0];
  if (pire && P.mode === "rivales" && pl.length >= 3) { const rr = P.L.find(r => r.name === pire.nom), g = rr ? f4M(rr).g : null;
    causes.push({ titre: `La moins rentable : ${pire.nom}`, texte: `${ekFr(pire.v, 0)} ${sym} gardés sur 100 ${sym}${g != null ? `, avec des ventes ${f4Pc(g, 1, true)} sur un an` : ""}. Quand les ventes baissent, les coûts fixes (boutiques, salaires) pèsent plus.` }); }
  const gs = f4Serie(c, "ca"); let ralentit = false; if (gs && gs.v.length >= 3) { const n = gs.v.length, a = gs.v[n - 1] / gs.v[n - 2] - 1, b = gs.v[n - 2] / gs.v[n - 3] - 1; ralentit = a < b - 0.01; }
  const mt = ca && eb ? ekTableau(ca.y, [[bank ? `Bénéfice sur 100 ${sym} de revenus` : `Gardés sur 100 ${sym} vendus`, ca.v.map((z, i) => z > 0 && eb.v[i] != null ? ekFr(eb.v[i] / z * 100, 1) + " " + sym : "–")], [bank ? "Bénéfice" : "Résultat d'exploitation", eb.v.map(z => f4Md(z, s.currency))]]) : "";
  return { id: "e2", n: 2, sur: "Sa marge", titre,
    mots: [{ cle: bank ? "benefice" : "marge", ex: v != null ? f4Pc(v, 1) : "", calc: !bank && s.ebit != null ? `${ekFr(s.ebit, 0)} ÷ ${ekFr(s.ca, 0)}` : "", nom: s.name }, { cle: "mediane", ex: med != null ? ekFr(med * 100, 0) + " " + sym : "", calc: `${lib} médiane de ${P.lib}`, nom: s.name }],
    visuel: v != null && pl.length ? ekPoints({ titre: `Gardés sur 100 ${sym} de ventes`, unite: `${lib} ${s.year}`, lignes: pts, mediane: med != null ? med * 100 : 0, mediane_label: med != null ? `médiane ${ekFr(med * 100, 0)} ${sym}` : "", max: nn.max, graduations: nn.ticks, fmtAxe: t => ekFr(t, 0) + " " + sym,
      indice: `Chaque point place une entreprise sur l'échelle. À droite du pointillé (zone verte), elle garde plus que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu ; à gauche (zone rouge), moins.${mn < 0 ? " Une marge négative est placée sur zéro." : ""}`, source: f4Src(x, `Comptes ${s.year}`) }) : "",
    explique: causes.length ? ekExplique({ causes, surveiller: ralentit ? "Si les ventes ralentissent encore, la marge peut baisser : une partie des coûts est fixe." : f4Prochain(s.id) || "La marge du prochain exercice." }) : "",
    plus: mt ? ekPlus({ id: "m2", icone: "%", titre: "Sa marge, année par année", html: mt }) : "",
    suite: "Et une fois l'impôt payé, que reste-t-il ?" };
}

function f4E3(x) {
  const { s, c, M, sym } = x, cur = s.currency, ns = f4Serie(c, "net"), n = c.years.length - 1, bank = isBank(s);
  const ng = s.net != null && s.netPrev > 0 ? s.net / s.netPrev - 1 : null;
  const dette = bank || s.netDebt == null ? "" : s.netDebt <= 0 ? ", et aucune dette" : `, et ${f4Md(s.netDebt, cur)} de dette`;
  const titre = `${f4Md(s.net, cur)} de bénéfice${dette}.${ng != null ? ` ${ng >= 0 ? "En hausse" : "En baisse"} de ${ekFr(Math.abs(ng) * 100, 1)} % sur un an.` : ""}`;
  const nY = Math.min(4, c.years.length), tx = Array.from({ length: nY }, (_, j) => f4Taux(c, c.years.length - nY + j));
  const t1 = f4Taux(c, n), t0 = n > 0 ? f4Taux(c, n - 1) : null, alerte = t1 != null && t0 != null && t1 > t0 + 0.02;
  const ligne = tx.some(t => t != null) ? { nom: "impôt", valeurs: tx.map(t => t == null ? "" : ekFr(t * 100, 0) + " %"), alerte: alerte ? tx.length - 1 : -1 } : null;
  // Causes : ce qui a fait bouger le bénéfice d'un exercice à l'autre
  const causes = [], F = c.fin, v = (k, i) => F[k] && F[k][i] != null ? F[k][i] : null;
  if (n > 0 && !bank) {
    const dE = v("ebit", n) != null && v("ebit", n - 1) != null ? v("ebit", n) - v("ebit", n - 1) : null, fin1 = v("pretax", n) != null && v("ebit", n) != null ? v("pretax", n) - v("ebit", n) : null, fin0 = v("pretax", n - 1) != null && v("ebit", n - 1) != null ? v("pretax", n - 1) - v("ebit", n - 1) : null;
    const dT = v("tax", n) != null && v("tax", n - 1) != null ? -(v("tax", n) - v("tax", n - 1)) : null, y1 = c.years[n], y0 = c.years[n - 1];
    const C = [];
    if (dE != null) C.push([Math.abs(dE), { titre: `L'activité : ${dE >= 0 ? "+" : "−"}${f4Md(Math.abs(dE), cur)}`, texte: `Le résultat d'exploitation passe de ${f4Md(v("ebit", n - 1), cur)} à ${f4Md(v("ebit", n), cur)}.` }]);
    if (dT != null) C.push([Math.abs(dT), { titre: `L'impôt : ${dT >= 0 ? "+" : "−"}${f4Md(Math.abs(dT), cur)}`, texte: `L'impôt passe de ${f4Md(v("tax", n - 1), cur)} à ${f4Md(v("tax", n), cur)}${t0 != null && t1 != null ? ` : il prend ${ekFr(t1 * 100, 0)} % du résultat avant impôt, contre ${ekFr(t0 * 100, 0)} % en ${y0}` : ""}.` }]);
    if (fin1 != null && fin0 != null && Math.abs(fin1 - fin0) > 0) C.push([Math.abs(fin1 - fin0), { titre: `Intérêts et divers : ${fin1 - fin0 >= 0 ? "+" : "−"}${f4Md(Math.abs(fin1 - fin0), cur)}`, texte: `Entre le résultat d'exploitation et le résultat avant impôt : ${f4Md(fin1, cur)} en ${y1}, contre ${f4Md(fin0, cur)} en ${y0}.` }]);
    C.sort((a, b) => b[0] - a[0]).slice(0, 2).forEach(z => causes.push(z[1]));
  }
  if (!bank && s.netDebt != null) causes.push(s.netDebt <= 0 ? { titre: "Aucune dette, donc aucun intérêt à payer", texte: `Elle a ${f4Md(-s.netDebt, cur)} de trésorerie de plus que ses emprunts.`, lien: { href: "#m3", label: "trésorerie ↓" } }
    : { titre: `Une dette de ${f4Md(s.netDebt, cur)}`, texte: s.ebit > 0 ? `Soit ${ekFr(s.netDebt / s.ebit, 1)} années de résultat d'exploitation.` : "Son résultat d'exploitation ne la couvre pas cette année.", lien: { href: "#m3", label: "année par année ↓" } });
  const cash = f4Serie(c, "netDebt");
  const tb = ns ? ekTableau(ns.y, [["Bénéfice net", ns.v.map(z => f4Md(z, cur))], ...(cash ? [[cash.v.some(z => z != null && z > 0) ? "Dette nette (négatif : trésorerie)" : "Trésorerie nette", cash.v.map(z => z == null ? "–" : cash.v.some(q => q != null && q > 0) ? f4Md(z, cur) : f4Md(-z, cur))]] : []), ["Bénéfice sur 100 " + sym + " vendus", ns.v.map((z, i) => { const ca = f4Serie(c, "ca"); return ca && ca.v[i] > 0 && z != null ? ekFr(z / ca.v[i] * 100, 1) + " " + sym : "–"; })]]) : "";
  return { id: "e3", n: 3, sur: "Son bénéfice", titre,
    mots: [{ cle: "benefice", ex: f4Md(s.net, cur), calc: `exercice ${s.year}`, nom: s.name }, ...(t1 != null ? [{ cle: "impot", ex: f4Pc(t1, 1), calc: `${ekFr(v("tax", n), 0)} ÷ ${ekFr(v("pretax", n), 0)}`, nom: s.name }] : []), ...(!bank && s.netDebt != null ? [{ cle: s.netDebt <= 0 ? "treso" : "dette", ex: f4Md(Math.abs(s.netDebt), cur), calc: `fin ${s.year}`, nom: s.name }] : [])],
    visuel: ns ? f4Cols(x, ns, "Son bénéfice net", ligne, ligne ? `La ligne « impôt » donne la part du résultat payée en impôt chaque année.${alerte ? ` Elle monte en ${c.years[n]} (${ekFr(t1 * 100, 0)} %, contre ${ekFr(t0 * 100, 0)} %) : à elle seule, elle retire une partie du bénéfice.` : ""}` : "Chaque barre donne le bénéfice net d'un exercice.") : "",
    explique: causes.length ? ekExplique({ causes, surveiller: alerte ? "Le taux d'impôt du prochain exercice." : !bank && s.netDebt > 0 && s.ebit > 0 && s.netDebt / s.ebit > 3 ? "Le poids de la dette, au-delà de 3 années de résultat." : f4Prochain(s.id) || "Le bénéfice du prochain exercice." }) : "",
    plus: tb ? ekPlus({ id: "m3", icone: sym.length === 1 ? sym : "€", titre: "Bénéfice et trésorerie, année par année", html: tb }) : "",
    suite: "Que fait-elle de ce bénéfice ?" };
}

function f4E4(x) {
  const { s, c, M, MED, sym } = x, cur = s.currency, pay = M.pay, dv = f4Serie(c, "dps"), dp = f4Serie(c, "divPaid");
  const rien = !s.divPaid && !s.dps, parAction = !s.divPaid && s.dps > 0;
  const titre = rien ? "Elle ne verse pas de dividende : elle garde tout son bénéfice." : pay > 1.5 ? "Elle verse plus que son bénéfice de l'année : le dividende puise dans ses réserves." : pay != null ? `Elle reverse ${f4Pc(Math.min(pay, 9.99), 0)} de son bénéfice à ses actionnaires${s.dps ? ` : ${ekFr(s.dps, s.dps >= 10 ? 0 : 2)} ${sym} par action` : ""}.` : s.net != null && s.net <= 0 ? "Le dividende est versé malgré un bénéfice nul ou négatif." : "La part du bénéfice versée n'est pas calculable cette année.";
  const causes = [];
  if (s.fcf != null && s.divPaid) causes.push(s.fcf >= s.divPaid ? { titre: "Ses liquidités couvrent le dividende", texte: `Investissements payés, son activité lui laisse ${f4Md(s.fcf, cur)} ; le dividende en prend ${f4Md(s.divPaid, cur)}.` } : { titre: "Le dividende dépasse ce que l'activité laisse", texte: `Investissements payés, il reste ${f4Md(s.fcf, cur)} ; le dividende en prend ${f4Md(s.divPaid, cur)}. La différence vient de sa trésorerie ou de nouveaux emprunts.` });
  const cash = f4Serie(c, "netDebt"); if (!isBank(s) && cash) { const L = cash.v.map((z, i) => [cash.y[i], z]).filter(z => z[1] != null); if (L.length >= 2 && L.every(z => z[1] <= 0)) causes.push({ titre: L[L.length - 1][1] < L[0][1] ? "Ce qu'elle garde s'accumule" : "Sa trésorerie diminue", texte: `Trésorerie nette : ${f4Md(-L[0][1], cur)} fin ${L[0][0]}, ${f4Md(-L[L.length - 1][1], cur)} fin ${L[L.length - 1][0]}.` }); }
  const part = rien ? 0 : Math.max(0, Math.min(100, (pay != null ? pay : 1) * 100));
  return { id: "e4", n: 4, sur: "Son dividende", titre, haut: true,
    mots: [{ cle: "distrib", ex: pay != null && pay <= 1.5 ? f4Pc(pay, 0) : "", calc: s.divPaid && s.net ? `${ekFr(s.divPaid, 0)} ÷ ${ekFr(s.net, 0)}` : parAction && s.eps ? `${ekFr(s.dps, 2)} ÷ ${ekFr(s.eps, 2)} par action` : "", nom: s.name }, ...(s.dps ? [{ cle: "dpa", ex: `${ekFr(s.dps, 2)} ${sym}`, calc: `exercice ${s.year}`, nom: s.name }] : []), ...(M.yld != null ? [{ cle: "rendement", ex: f4Pc(M.yld, 1), calc: "au cours actuel", nom: s.name }] : [])],
    visuel: ekPartage({ titre: `Partage du bénéfice ${s.year}`, unite: f4Md(s.net, cur), part, partTexte: rien ? "" : parAction ? `Versé : ${f4Pc(pay, 0)}` : `Versé : ${f4Md(s.divPaid, cur)}`, resteTexte: part >= 100 ? "" : parAction ? `Gardé : ${f4Pc(1 - pay, 0)}` : `Gardé : ${f4Md(Math.max(0, s.net - (s.divPaid || 0)), cur)}`, mediane: MED.pay != null ? Math.min(100, MED.pay * 100) : 50, mediane_label: MED.pay != null ? `médiane ${f4Pc(MED.pay, 0)}` : "",
      indice: `La barre représente tout le bénéfice ${s.year}. En vert, la part versée aux actionnaires ; en blanc, ce qui reste dans l'entreprise.${MED.pay != null ? ` Les rivales versent ${f4Pc(MED.pay, 0)} (médiane).` : ""}${pay > 1 ? " Le dividende dépasse le bénéfice : la barre est pleine." : ""}`, source: f4Src(x, `Versements de ${s.year}`) }),
    explique: causes.length ? ekExplique({ causes, surveiller: M.yld != null ? `Rendement : ${f4Pc(M.yld, 1)} par an au cours actuel${MED.yld != null ? `, contre ${f4Pc(MED.yld, 1)} chez les rivales` : ""}.` : "" }) : "",
    plus: dp ? ekPlus({ id: "m4", icone: "↗", titre: "Le dividende, année par année", html: ekTableau(dp.y, [["Dividendes versés", dp.v.map(z => z == null ? "–" : f4Md(z, cur))], ...(dv ? [["Par action", dv.v.map(z => z == null ? "–" : ekFr(z, 2) + " " + sym)]] : [])]) }) : "",
    suite: "Avec ces chiffres, combien coûte l'action ?" };
}

function f4E5(x) {
  const { s, M, MED, P, sym } = x, p = typeof pxOf === "function" ? pxOf(s) : null, v = (() => { try { return valo(s); } catch (e) { return null; } })();
  const pe = M.pe, med = MED.pe;
  const sansCours = !p || !(p.p > 0), titre = pe == null ? (sansCours ? "Son cours n'est pas disponible sur le site : le prix de l'action ne peut pas être comparé." : "Son PER n'a pas de sens cette année : le bénéfice est trop faible ou négatif.") : `L'action coûte ${ekFr(pe, 0)} fois son bénéfice annuel.${med != null ? ` ${P.mode === "rivales" ? "Ses rivales" : "Son secteur"}, ${ekFr(med, 0)} fois.` : ""}`;
  const pl = [{ nom: s.name, v: pe, texte: pe != null ? ekFr(pe, 0) + " fois" : sansCours ? "son cours n'est pas disponible sur le site" : "son bénéfice est trop faible, le PER n'aurait pas de sens", moi: 1 }, ...(P.mode === "rivales" ? P.L.map(r => { const m = f4M(r); return { nom: r.name, v: m.pe != null ? m.pe : null, texte: m.pe != null ? ekFr(m.pe, 0) + " fois" : "son bénéfice est trop faible ou son cours manque, le PER n'aurait pas de sens" }; }) : [])];
  const mx = f4Nice(Math.max(30, ...pl.filter(r => r.v != null).map(r => Math.min(r.v, 100))));
  const causes = [];
  if (pe != null && med != null) {
    const mieux = x.bk ? [["bénéfice", f4Ton(M.ng, MED.ng, false, 0.02)], ["rentabilité", f4Ton(M.roe, MED.roe)]] : [["ventes", f4Ton(M.g, MED.g, false, 0.02)], ["marge", f4Ton(M.m, MED.m)], ["bénéfice", f4Ton(M.nm, MED.nm)]];
    const g = mieux.filter(z => z[1] === "g").map(z => z[0]), r = mieux.filter(z => z[1] === "r").map(z => z[0]);
    if (pe > med * 1.15) causes.push({ titre: "Le marché paie plus cher", texte: g.length ? `Ses ${g.join(", ")} ${g.length > 1 ? "sont meilleurs" : g[0] === "rentabilité" || g[0] === "marge" ? "est meilleure" : "est meilleur"} que chez ${P.mode === "rivales" ? "ses rivales" : "son secteur"} (étapes ${x.bk ? "1 et 2" : "1 à 3"}). Les investisseurs attendent que ça dure.` : `Ses comptes ne sont pas meilleurs que ceux de ${P.mode === "rivales" ? "ses rivales" : "son secteur"} : le prix reflète surtout des attentes.`, lien: { href: "#e1", label: "étape 1 ↑" } });
    else if (pe < med * 0.85) causes.push({ titre: "Le marché paie moins cher", texte: r.length ? `Ses ${r.join(", ")} ${r.length > 1 ? "sont moins bons" : r[0] === "rentabilité" || r[0] === "marge" ? "est moins bonne" : "est moins bon"} que chez ${P.mode === "rivales" ? "ses rivales" : "son secteur"} (étapes ${x.bk ? "1 et 2" : "1 à 3"}) : le marché doute.` : `Ses comptes sont aussi bons que ceux de ${P.mode === "rivales" ? "ses rivales" : "son secteur"} : le prix bas reflète un doute sur l'avenir, que les comptes passés ne montrent pas.`, lien: { href: "#e1", label: "étape 1 ↑" } });
    else causes.push({ titre: "Un prix dans la moyenne", texte: `Le marché la paie comme ${P.mode === "rivales" ? "ses rivales" : "son secteur"}.` });
  }
  const f4Plage = q => q && q.h52 > 0 && q.l52 > 0 && q.h52 / q.l52 <= 3; // fourchette sur un an jugée fiable (sinon masquée, comme dans l'en-tête)
  if (f4Plage(p)) { const dd = p.p / p.h52 - 1, rv = P.mode === "rivales" ? P.L.map(r => { const q = pxOf(r); return f4Plage(q) ? [r.name, q.p / q.h52 - 1] : null; }).filter(Boolean) : [];
    const mr = f4Med(rv.map(z => z[1]));
    if (dd < -0.1 && rv.length && mr != null) causes.push(mr < -0.1 ? { titre: "Tout le secteur a reculé, pas seulement elle", texte: `Depuis leur plus haut de l'année : ${rv.slice(0, 3).map(z => `${z[0]} ${f4Pc(z[1], 0, true)}`).join(", ")}.` } : { titre: "Une baisse qui lui est propre", texte: `Ses rivales sont restées près de leur plus haut : ${rv.slice(0, 3).map(z => `${z[0]} ${f4Pc(z[1], 0, true)}`).join(", ")}.` });
  }
  return { id: "e5", n: 5, sur: "Son prix en Bourse", titre,
    mots: [{ cle: "per", ex: pe != null ? ekFr(pe, 0) + " fois" : "", calc: v && v.capE && s.net ? `${f4Md(v.capE / 1e6, "EUR")} ÷ ${f4Md(s.net, s.currency)}` : "", nom: s.name }, ...(v && v.capE ? [{ cle: "capi", ex: f4Md(v.capE / 1e6, "EUR"), calc: "au cours actuel", nom: s.name }] : [])],
    visuel: pe == null ? "" : ekPoints({ titre: "Années de bénéfice pour payer l'action", unite: `PER, cours du ${typeof PXUP === "string" && PXUP !== "none" ? new Date(PXUP).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }) : "jour"}`, basEstMieux: true, motBas: "moins chère", motHaut: "plus chère", lignes: [...pl, ...P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison }))], mediane: med != null ? med : 0, mediane_label: med != null ? `médiane ${ekFr(med, 0)} fois` : "", max: mx.max, graduations: mx.ticks, fmtAxe: t => ekFr(t, 0),
      indice: `Chaque point place une entreprise sur l'échelle du PER. À gauche du pointillé (zone verte), moins chère que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu ; à droite (zone rouge), plus chère. Ici, plus le point est à droite, plus l'action est chère.`, source: { texte: `Cours du jour, comptes ${s.year}` } }),
    explique: causes.length ? ekExplique({ causes, surveiller: pe != null && med != null && pe > med * 1.15 ? `À ${ekFr(pe, 0)} fois le bénéfice, le cours dépend des attentes : un ralentissement des ventes pèse vite sur lui.` : pe != null && med != null && pe < med * 0.85 ? "Un PER bas peut durer si les ventes ou les marges continuent de reculer." : "" }) : "",
    plus: ekPlus({ id: "m5", icone: "≈", titre: "Valeur en Bourse et rendement", html: ekTableau([""], [["Valeur en Bourse", [v && v.capE ? f4Md(v.capE / 1e6, "EUR") : "–"]], ["Bénéfice net " + s.year, [f4Md(s.net, s.currency)]], ["PER (valeur ÷ bénéfice)", [pe != null ? ekFr(pe, 1) : "non significatif"]], ["Rendement du dividende", [M.yld != null ? f4Pc(M.yld, 1) : "–"]], ...(p ? [["Cours", [pxFmt(p.p, p.cur)]], ...(f4Plage(p) ? [["Plus bas / plus haut sur un an", [`${pxFmt(p.l52, p.cur)} / ${pxFmt(p.h52, p.cur)}`]]] : [])] : [])]) }) };
}

// ——— Variante banque / assurance (ou comptes de ventes inutilisables) : bénéfice et rentabilité des fonds propres ———
function f4B1(x) {
  const { s, c, M, MED, P } = x, cur = s.currency, se = f4Serie(c, "net"), qui = P.mode === "rivales" ? "ses rivales" : "son secteur";
  const gs = []; if (se) for (let i = 1; i < se.v.length; i++) if (se.v[i] != null && se.v[i - 1] > 0) gs.push([se.y[i], se.v[i] / se.v[i - 1] - 1]);
  const causes = [];
  return { sur: "Son bénéfice", titre: `${f4Md(s.net, cur)} de bénéfice en ${s.year}${M.ng != null ? `, ${f4Pc(M.ng, 1, true)} sur un an` : ""}.`,
    mots: [{ cle: "benefice", ex: f4Md(s.net, cur), calc: `exercice ${s.year}`, nom: s.name }],
    visuel: se ? f4Cols(x, se, "Son bénéfice net", null, "Chaque barre donne le bénéfice net d'un exercice ; sous l'année, la variation par rapport à l'année d'avant.") : "",
    explique: causes.length ? ekExplique({ causes, surveiller: f4Prochain(s.id) || "Le bénéfice du prochain exercice." }) : "",
    plus: ekPlus({ id: "m1", icone: "◎", titre: "Son métier et d'où viennent ses revenus", html: f4Metier(x) }),
    suite: `Sur 100 ${x.sym} apportés par ses actionnaires, combien gagne-t-elle ?` };
}
function f4B2(x) {
  const { s, c, M, MED, P, sym } = x, v = M.roe, med = MED.roe, qui = P.mode === "rivales" ? "ses rivales" : "son secteur";
  const rows = [{ nom: s.name, v: v != null ? v * 100 : null, texte: v != null ? ekFr(v * 100, 1) + " %" : "fonds propres non publiés", moi: 1 }, ...P.L.map(r => { const m = f4M(r).roe; return { nom: r.name, v: m != null ? m * 100 : null, texte: m != null ? ekFr(m * 100, 1) + " %" : "fonds propres non publiés" }; })];
  const pl = rows.filter(r => r.v != null), nn = f4Nice(Math.max(10, ...pl.map(r => r.v)));
  const pts = P.mode === "rivales" ? [...pl.map(r => ({ ...r, v: Math.max(0, r.v) })), ...rows.filter(r => r.v == null), ...P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison }))] : pl.filter(r => r.moi);
  const causes = [], ne = f4Serie(c, "net"), eq = f4Serie(c, "equity");
  if (ne && eq) { const r = ne.v.map((z, i) => z != null && eq.v[i] > 0 ? z / eq.v[i] * 100 : null), ok = r.filter(z => z != null);
    if (ok.length >= 3) { const lo = Math.min(...ok), hi = Math.max(...ok), f0 = ok[0], f1 = ok[ok.length - 1], y0 = ne.y[r.indexOf(f0)];
      const i0 = ne.v.findIndex((z, i) => z > 0 && eq.v[i] > 0), gn = ne.v[ne.v.length - 1] / ne.v[i0] - 1, ge = eq.v[eq.v.length - 1] / eq.v[i0] - 1;
      if (isFinite(gn) && isFinite(ge)) causes.push({ titre: gn > ge + 0.02 ? "Le bénéfice grandit plus vite que les fonds propres" : gn < ge - 0.02 ? "Les fonds propres grandissent plus vite que le bénéfice" : "Bénéfice et fonds propres avancent ensemble", texte: `Depuis ${ne.y[i0]} : bénéfice ${f4Pc(gn, 0, true)}, fonds propres ${f4Pc(ge, 0, true)}.` }); } }
  const tb = ne && eq ? ekTableau(ne.y, [["Rentabilité des fonds propres", ne.v.map((z, i) => z != null && eq.v[i] > 0 ? ekFr(z / eq.v[i] * 100, 1) + " %" : "–")], ["Bénéfice net", ne.v.map(z => f4Md(z, s.currency))], ["Capitaux propres", eq.v.map(z => f4Md(z, s.currency))]]) : "";
  return { sur: "Sa rentabilité", titre: v == null ? "Ses fonds propres ne sont pas publiés sous une forme comparable." : `Sur 100 ${sym} de fonds propres, elle gagne ${ekFr(v * 100, 1)} ${sym} par an.${med != null ? (v > med * 1.15 ? ` Plus que ${qui} (${ekFr(med * 100, 1)} ${sym}).` : v < med * 0.85 ? ` Moins que ${qui} (${ekFr(med * 100, 1)} ${sym}).` : ` Comme ${qui}.`) : ""}`,
    mots: [{ cle: "roe", ex: v != null ? ekFr(v * 100, 1) + " %" : "", calc: s.equity ? `${ekFr(s.net, 0)} ÷ ${ekFr(s.equity, 0)}` : "", nom: s.name }, { cle: "mediane", ex: med != null ? ekFr(med * 100, 1) + " %" : "", calc: `rentabilité médiane de ${P.lib}`, nom: s.name }],
    visuel: v != null && pl.length ? ekPoints({ titre: `Gagnés sur 100 ${sym} de fonds propres`, unite: `rentabilité des capitaux propres ${s.year}`, lignes: pts, mediane: med != null ? med * 100 : 0, mediane_label: med != null ? `médiane ${ekFr(med * 100, 1)} %` : "", max: nn.max, graduations: nn.ticks, fmtAxe: t => ekFr(t, 0) + " %",
      indice: `Chaque point place une entreprise sur l'échelle. À droite du pointillé (zone verte), elle rapporte plus que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu ; à gauche (zone rouge), moins.`, source: f4Src(x, `Comptes ${s.year}`) }) : "",
    explique: causes.length ? ekExplique({ causes, surveiller: f4Prochain(s.id) || "La rentabilité du prochain exercice." }) : "",
    plus: tb ? ekPlus({ id: "m2", icone: "%", titre: "Sa rentabilité, année par année", html: tb }) : "",
    suite: "Que fait-elle de ce bénéfice ?" };
}

// ——— Après le fil : actualité, preuve, tous les chiffres, questions ———
function f4Fin(x) {
  const { s, c } = x, ev = typeof eventsOf === "function" ? eventsOf(s.id) : [], pass = ev.filter(e => e.date < TODAY).slice(-1), next = ev.filter(e => e.date >= TODAY).slice(0, 3 - pass.length), L = [...pass, ...next];
  const dl = d => new Date(d + "T12:00:00"), cl = c.clos || s.clos || null;
  const ag = L.length ? `<div class="ek-agenda">${L.map(e => `<div class="${e.date < TODAY ? "pass" : ""}"><small>${e.date < TODAY ? "Publié le " + dl(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "À venir"}</small><b>${esc(dl(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}</b><p>${esc(e.label || e.type || "")}</p>${e.source ? `<a href="${esc(e.source)}" target="_blank" rel="noopener">${e.date < TODAY ? "Lire la publication" : "Agenda de l'entreprise"}</a>` : ""}</div>`).join("")}</div>` : `<p class="ek-note">Aucune date de publication relevée pour l'instant.</p>`;
  const fb = typeof fiabilite === "function" ? fiabilite(s, c) : null;
  // Tous les comptes : une seule carte, un seul tableau, groupé par famille (une famille sans chiffre n'apparaît pas)
  const yy = c.years.slice(-4), i0 = c.years.length - yy.length, G = [["Compte de résultat", ["ca", "ebit", "pretax", "tax", "net", "eps"]], ["Bilan, à la clôture", ["equity", "cash", "debt", "netDebt", "leases"]], ["L'argent réellement encaissé", ["cfo", "capex", "fcf"]], ["Pour l'actionnaire", ["divPaid", "dps"]]];
  const lignes = []; G.forEach(([t, keys]) => { const ks = keys.filter(k => c.fin[k] && c.fin[k].slice(i0).some(v => v != null)); if (!ks.length) return; lignes.push([t, null]);
    ks.forEach(k => lignes.push([F4_LIB[k] || k, c.fin[k].slice(i0).map(v => v == null ? "–" : /^(eps|dps|dpsEst)$/.test(k) ? ekFr(v, 2) + " " + x.sym : f4Md(v, s.currency))])); });
  const tout = lignes.length ? ekPlus({ id: "t-comptes", icone: "≡", titre: `Tous ses comptes, ${yy[0]} à ${yy[yy.length - 1]}`, html: ekTableau(yy, lignes) }) : "";
  const qs = [s.net != null && s.netPrev > 0 ? `Pourquoi le bénéfice de ${s.name} a ${s.net >= s.netPrev ? "augmenté" : "baissé"} en ${s.year} ?` : `Que fait ${s.name} ?`, x.M.pe != null ? `Pourquoi l'action ${s.name} vaut-elle ${ekFr(x.M.pe, 0)} fois son bénéfice ?` : `Comment ${s.name} gagne-t-elle de l'argent ?`, `Quels sont les principaux risques pour ${s.name} ?`];
  return `<section class="ek-sec" id="actu"><span class="ek-stk2 p">Son actualité</span><h2>Ce qui vient de tomber, ce qui arrive.</h2>${ag}
      <p class="ek-note">Tout ce qui est au-dessus porte sur l'exercice ${esc(s.year)}, audité et déposé. Une publication plus récente n'est reprise qu'une fois relevée.</p>
      ${x.rap ? `<div class="ek-proof"><span class="ek-stk2">Prouvé</span><p>Les chiffres de cette page viennent du <b>rapport annuel ${esc(s.year)} de ${esc(s.name)}</b>${fb ? `. Fiabilité des données : ${esc(fb.mot)}` : ""}.</p><a href="${esc(x.rap)}" target="_blank" rel="noopener">Ouvrir le rapport ↗</a></div>` : ""}</section>
    <section class="ek-sec" id="tout"><span class="ek-stk2 b">Pour aller plus loin</span><h2>Tous les chiffres, en détail.</h2>
      ${tout}</section>
    <section class="ek-end"><h2>✦ Une question sur ${esc(s.name)} ?</h2><div class="ek-qs">${qs.map(q => `<button type="button" data-f4-q="${esc(q)}">${esc(q)}</button>`).join("")}</div><small>L'IA du site répond avec les chiffres de cette page. Information factuelle, sans conseil.</small></section>`;
}
const F4_LIB = { ca: "Ventes (chiffre d'affaires)", ebit: "Résultat d'exploitation", pretax: "Résultat avant impôt", tax: "Impôt sur les résultats", net: "Bénéfice net", eps: "Bénéfice par action", equity: "Capitaux propres", cash: "Trésorerie", debt: "Emprunts", netDebt: "Dette nette (négatif : trésorerie)", leases: "Dettes de loyers", cfo: "Liquidités tirées de l'activité", capex: "Investissements", fcf: "Flux de trésorerie disponible", divPaid: "Dividendes versés", dps: "Dividende par action" };

// Liens « dans le rapport officiel » : ouverts sur la ligne exacte du chiffre quand l'ancre existe (data/ancres.mjs)
function f4Ancres(x) {
  if (typeof ancreLiens !== "function") return;
  const K = x.bk ? { e1: "net", e3: "divPaid" } : { e1: "ca", e2: "ebit", e3: "net", e4: "divPaid" };
  Object.entries(K).forEach(([e, k]) => { const a = document.querySelector(`#${e} .ek-src a`); if (!a) return;
    ancreLiens(x.s.id, [k], x.s.year).then(l => { if (l && l[0] && l[0].url) a.href = l[0].url; }).catch(() => { }); });
}

document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-f4-tv],[data-f4-ia],[data-f4-q]"); if (!t) return;
  const m = location.pathname.match(/^\/entreprise\/([^/]+)/), s = m && RBY[m[1]];
  if (t.dataset.f4Tv !== undefined && s) { const box = document.getElementById("f4tv"); if (!box) return; box.hidden = !box.hidden;
    if (!box.hidden && !box.dataset.on && typeof tvChart === "function") { box.dataset.on = "1"; box.className = "ek-tvbox"; tvChart(box, s.tv, s.name); }
    t.textContent = box.hidden ? "Voir le graphique du cours ↗" : "Masquer le graphique"; return; }
  if (typeof orcIaOpen !== "function") return;
  orcIaOpen();
  if (t.dataset.f4Q && typeof orcIaAsk === "function") orcIaAsk(t.dataset.f4Q);
});

// Branchement : remplace la fiche (toutes les anciennes adresses /comptes, /actualite… ouvrent la même page, sur le bon bloc)
if (F4.on) {
  window.pageCompany = pageCompany4;
  // L'ancienne fiche a pu être lancée au chargement (fiche.js, fiche2.js) avant ce module : sa fin d'affichage ne doit plus rien écrire (lot 3 : modules retirés).
  if (typeof tabBref === "function") tabBref = function () { };
  if (typeof R !== "undefined" && R && R.companies && /^\/entreprise\/[a-z0-9-]+/.test(location.pathname) && typeof route === "function") route();
}
