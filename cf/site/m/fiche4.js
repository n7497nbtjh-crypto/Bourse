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
// 5/11 (Romain) : montant hors euro suivi de son équivalent en euros, au taux BCE du jour (fx.json)
// 5/11 soir (Romain : plus de « (≈ … €) » partout) : tout montant hors euro est converti en euros au taux BCE du jour et marqué d'un astérisque ;
// une seule note l'explique, sous les repères (f4NoteFx). La forme du graphique ne change pas (même taux pour toutes les années).
function f4EnEur() { return ""; }
const f4Par = (v, cur) => { const k = f4Kfx(cur), w = k ? v * k : v; return ekFr(w, w >= 10 ? 0 : 2) + " " + (k ? "€*" : F4_SYM(cur).trim()); }; // dividende par action
const f4Kfx = cur => { if (!cur || cur === "EUR" || typeof toEur !== "function") return null; const k = toEur(1, cur); return k > 0 && isFinite(k) ? k : null; };
function f4Md(m, cur) { // montant en millions → « 16,0 Md€ » / « 852 M€ » ; hors euro : « 221 Md€* »
  if (m == null || !isFinite(m)) return "–";
  const kfx = f4Kfx(cur); if (kfx) return f4Md(m * kfx, "EUR") + "*";
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
// Banques : fonds propres facultatifs (jamais repris des comptes Eulerpool, 5/11)
const f4ValideB = c => c && !c.missing && !(c.equity != null && c.equity <= 0) && c.net != null && isFinite(c.net);
function f4Rivales(s, bk) {
  const val = bk ? f4ValideB : f4Valide, cle = bk ? "net" : "ca";
  const ids = (typeof CONC !== "undefined" && CONC[s.id]) || [], out = [], L = [], vus = [[s[cle], s.name, s.equity]];
  ids.forEach(id => { const c = RBY[id]; if (!c || c.id === s.id) return;
    if (!val(c)) { out.push({ nom: c.name, raison: c.missing ? "ses comptes ne sont pas encore relevés sur le site" : "ses comptes sont incomplets sur le site" }); return; }
    const d = vus.find(([ca, , eq]) => ca && Math.abs(c[cle] / ca - 1) < 0.002 && (!bk || !eq || !c.equity || Math.abs(c.equity / eq - 1) < 0.002)); if (d) { out.push({ nom: c.name, raison: `${bk ? "même bénéfice" : "mêmes ventes"} que ${d[1]} (même groupe), comptée une seule fois` }); return; }
    vus.push([c[cle], c.name, c.equity]); L.push(c); });
  if (L.length >= 3) return { L, out, mode: "rivales", lib: `ses ${L.length} rivales`, de: `de ses ${L.length} rivales`, qui: "ses rivales", chez: "chez ses rivales", court: "rivales" };
  const sec = R.companies.filter(c => c.id !== s.id && c.sector === s.sector && val(c) && isBank(c) === isBank(s));
  return { L: sec, out: [], mode: "secteur", lib: `les ${sec.length} entreprises du secteur ${secName(s).toLowerCase()}`, de: `des ${sec.length} entreprises du secteur ${secName(s).toLowerCase()}`, qui: "son secteur", chez: "dans son secteur", court: "secteur" };
}

// ——— Séries sur plusieurs exercices (fichier complet) ———
function f4Serie(c, k, n = 4) { if (!c || !c.fin || !c.fin[k] || !c.fin[k].slice(-n).some(v => v != null && isFinite(v))) return null; const y = c.years.slice(-n), v = c.fin[k].slice(-n); return { y, v }; }
const f4Taux = (c, i) => { const t = c.fin.tax && c.fin.tax[i], p = c.fin.pretax && c.fin.pretax[i]; return t != null && p > 0 ? t / p : null; };

// ——— Jauge courte des repères de l'en-tête ———
function f4Jauge(v, m, basEstMieux, ecart, neutre) {
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
// Contexte de calcul d'une fiche (rivales, repères, médianes) : aussi utilisé par la découverte de la semaine (m/decouverte.js)
function f4Ctx(s, c) {
  const bk = isBank(s) || !f4Valide(s), P = f4Rivales(s, bk), M = f4M(s), MED = {};
  ["g", "ng", "m", "nm", "roe", "pay", "pe", "yld"].forEach(k => MED[k] = f4Med(P.L.map(x => f4M(x)[k]).filter(v => !(k === "pay" && v > 1.5))));
  return { bk, s, c, P, M, MED, cur: s.currency, sym: "€", nom: s.name, rap: ((c.sources || [])[0] || {}).report || null };
}
async function pageCompany4(id, tab) {
  const s = RBY[id];
  if (!s && window.SANS_COMPTES && SANS_COMPTES.has(id)) { history.replaceState({}, "", "/entreprises"); route(); return; } // comptes pas encore relevés : fiche non montrée (app.js)
  if (!s) return pageNotFound();
  setNav("ent"); setTitle(s.name);
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement de la fiche…</div></div>`;
  const load = s.missing ? Promise.resolve(null) : (FULL[id] ? Promise.resolve(FULL[id]) : fetch(`/data/societes/${id}.json`).then(r => r.json()).then(j => FULL[id] = j).catch(() => null));
  const [c] = await Promise.all([load, PXP, typeof ficheWDLoad === "function" ? ficheWDLoad(id) : null, typeof loadFiches === "function" ? loadFiches() : null]);
  if (typeof ficheMemeId === "function" && !ficheMemeId(id)) return;
  if (s.missing || !c || !c.fin) { app.innerHTML = `<div class="ek ek-page">${f4Tete(s, null, null)}<p class="ek-note" style="margin-top:30px">Les comptes de ${esc(s.name)} ne sont pas encore relevés sur le site.</p></div>`; return; }
  const ctx = f4Ctx(s, c);
  let html = "";
  const qf = f4Quota(s.id); // 6/11 (Romain) : 5 fiches complètes par jour en gratuit
  if (qf.bloque) { app.innerHTML = `<div class="ek ek-page">${f4Tete(s, c, ctx)}${f4Verrou(s)}</div>`; window.F4X = ctx; try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=fiche-verrou"); } catch (e) { } return; }
  try { html = f4Tete(s, c, ctx) + f4QuotaNote(qf) + f4MetierSec(ctx) + f4Fil(ctx) + `<div id="f4-annee"></div>` + f4Fin(ctx); }
  catch (e) { console.error("fiche v4", e); html = f4Tete(s, c, ctx) + `<p class="ek-note">Une partie de la fiche n'a pas pu s'afficher.</p>`; }
  app.innerHTML = `<div class="ek ek-page">${html}</div>`;
  const kfx = f4Kfx(s.currency), md = app.querySelector(".ek-medl");
  if (kfx && md) md.insertAdjacentHTML("afterend", `<p class="ek-fx">* Montants convertis en euros au taux de la BCE${window.FXDATE ? " du " + new Date(window.FXDATE + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : ""} (${kfx < 0.05 ? `1 € = ${ekFr(1 / kfx, 0)} ${esc(s.currency)}` : `1 ${esc(s.currency)} = ${ekFr(kfx, 3)} €`}). Comptes publiés en ${esc(s.currency)} : les chiffres d'origine sont dans « Tous les chiffres ».</p>`);
  window.F4X = ctx; f4Ancres(ctx); f4Trim(ctx); if (typeof f4Annee === "function") f4Annee(ctx); f4Mobile(); // l'année en cours (m/annee4.js) ; cartes fermées sur téléphone
  if (typeof ctxCharge === "function") ctxCharge().then(() => { if (window.F4X === ctx) { f4Contexte(ctx); f4MSecteur(); } });
  const ANC = { "rf-resultats": "e1", "rf-rentab": "e2", "rf-dette": "e3", "rf-div": "e4", "rf-valo": "e5", "f3-metier": "metier", "tous-les-chiffres": "tout", "rf-concurrents": "tout", "concurrents": "tout" }; // anciennes ancres (liens déjà partagés)
  const h0 = location.hash.slice(1), cible = tab === "comptes" ? "tout" : (tab === "actualite" || tab === "agenda" || tab === "communaute") ? "actu" : (ANC[h0] || h0);
  if (cible) { const t = document.getElementById(cible); if (t) setTimeout(() => { if (t.tagName === "DETAILS") t.open = true; t.classList.add("f4m-open"); t.scrollIntoView({ block: "start" }); }, 30); }
}

/* 6/11 (décision de Romain) : en gratuit, 5 fiches complètes par jour (entreprises différentes, comptées dans ce navigateur, clé bilan.fichesJour).
   Au-delà : l'en-tête et les 5 repères restent ouverts, la suite est réservée à Premium. Toujours ouvertes : Premium, les favoris,
   les robots (moteurs de recherche, aperçus de liens) et une fiche déjà ouverte dans la journée. */
const F4_LIBRES = 5;
function f4Quota(id) {
  const libre = { libre: true };
  try {
    if ((typeof isPrem === "function" && isPrem()) || navigator.webdriver || /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|lighthouse/i.test(navigator.userAgent || "") || (typeof isFav === "function" && isFav("c:" + id))) return libre;
    const j = new Date().toLocaleDateString("sv-SE"); let q = null;
    try { q = JSON.parse(localStorage.getItem("bilan.fichesJour") || "null"); } catch (e) { }
    if (!q || q.d !== j || !Array.isArray(q.ids)) q = { d: j, ids: [] };
    if (!q.ids.includes(id)) { if (q.ids.length >= F4_LIBRES) return { bloque: true }; q.ids.push(id); localStorage.setItem("bilan.fichesJour", JSON.stringify(q)); }
    return { n: q.ids.indexOf(id) + 1 };
  } catch (e) { return libre; }
}
function f4QuotaNote(qf) { return qf && qf.n ? `<p class="f4-qt"><b>Fiche gratuite ${qf.n} / ${F4_LIBRES} aujourd'hui</b><a href="/premium">Toutes les fiches avec Premium →</a></p>` : ""; }
function f4Verrou(s) {
  return `<section class="f4-lock"><span class="ek-stk2">★ Premium</span><h2>Vous avez ouvert vos ${F4_LIBRES} fiches gratuites du jour.</h2>
    <p>La suite de la fiche de ${esc(s.name)} est réservée aux abonnés Premium :</p>
    <ul><li>L'histoire de ses comptes en 4 étapes</li><li>Ses rivales, point par point</li><li>Tous ses chiffres sur 5 ans, avec la source</li><li>Son rang dans son secteur</li></ul>
    <div class="f4-lock-b"><a class="f4-lock-go" href="/premium">Passer à Premium <small>dès 3,25 € par mois</small></a><span>ou revenez demain : ${F4_LIBRES} nouvelles fiches</span></div>
    <p class="f4-lock-n">39 € pour un an (3,25 € par mois) ou 4,90 € par mois, sans engagement. Les entreprises que vous suivez en favori restent toujours ouvertes.</p></section>`;
}

// Logo officiel (collecté par le robot logos.yml dans /logos/<id>.png) ; sinon les initiales dans le même cadre
function f4LogoSrc(c) { return typeof LOGOS !== "undefined" && c && c.id && LOGOS[c.id] && LOGOS[c.id].f ? "/logos/" + LOGOS[c.id].f : null; }
function f4Logo(c, ini, petit) {
  const src = f4LogoSrc(c), cl = petit ? "ek-lg ek-lg-s" : "ek-mono";
  if (!ini) ini = String(c.name || "").replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return src ? `<span class="${cl} ek-logo"><img src="${src}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('ek-logo');this.parentNode.textContent='${esc(ini).replace(/'/g, "")}'"></span>` : `<span class="${cl}" aria-hidden="true">${esc(ini)}</span>`;
}
function f4Tete(s, c, x) {
  const p = typeof pxOf === "function" ? pxOf(s) : null, fi = (typeof FICHES !== "undefined" && FICHES && FICHES[s.id]) || null;
  const pea = typeof peaOk === "function" ? peaOk(s) : null, ini = s.name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  let pc = "";
  if (p) {
    const ch = p.chg, pos = p.h52 > p.l52 && p.l52 > 0 && p.h52 / p.l52 <= 3 ? Math.max(0, Math.min(100, (p.p - p.l52) / (p.h52 - p.l52) * 100)) : null, dd = p.h52 > 0 ? p.p / p.h52 - 1 : null;
    pc = `<div class="ek-pcard"><div class="ek-p"><b>${esc(pxFmt(p.p, p.cur))}</b>${ch != null ? `<span style="color:${ch > 0 ? EK_G : ch < 0 ? EK_R : "#555"}">${ch > 0 ? "+" : ""}${ekFr(ch, 2)} % ${p.ep ? "sur la séance" : esc(typeof jourSeance === "function" ? jourSeance() : "")}</span>` : ""}</div>
      ${p.cur && p.cur !== "EUR" && typeof toEur === "function" && isFinite(toEur(p.p, p.cur)) ? `<div class="ek-peur">≈ ${esc(pxFmt(toEur(p.p, p.cur), "EUR"))}*</div>` : ""}
      <small>${p.ep && p.d ? `Cours de clôture du ${esc(new Date(p.d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }))} · <a href="https://eulerpool.com" target="_blank" rel="noopener">Data by Eulerpool</a>` : `Cours différé${typeof PXUP === "string" && PXUP !== "none" ? ", relevé le " + esc(new Date(PXUP).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })) : ""}`}</small>
      ${pos != null ? `<div class="ek-rg"><i style="left:${pos}%"></i><em style="left:${pos}%">aujourd'hui</em></div><div class="ek-rgl"><span>plus bas ${esc(pxFmt(p.l52, p.cur))}</span><span>plus haut ${esc(pxFmt(p.h52, p.cur))}</span></div>
      <p>Sur un an, l'action a valu entre ${esc(pxFmt(p.l52, p.cur))} et ${esc(pxFmt(p.h52, p.cur))}.${dd != null && dd < -0.03 ? ` Elle est aujourd'hui <b>${ekFr(-dd * 100, 0)} % sous son plus haut</b>.` : " Elle est proche de son plus haut."}</p>` : ""}
      ${s.tv ? `<button type="button" class="ek-lk" data-f4-tv>Voir le graphique du cours ↗</button>` : ""}</div>`;
  } else pc = `<div class="ek-pcard"><small>Cours non disponible pour ce titre.</small></div>`;
  const chips = [secName(s), [typeof regName === "function" ? regName(s) : "", s.ticker].filter(Boolean).join(" · "), !e4FrF() ? "" : pea === true ? "Éligible au PEA ✓" : pea === false ? "Hors PEA" : ""].filter(Boolean);
  return `<section class="ek-hero">
    <div class="ek-crumb"><a href="/entreprises">Entreprises</a><span>›</span>${esc(secName(s))}<span>›</span>${esc(s.name)}</div>
    <div class="ek-top"><div class="ek-gauche"><div class="ek-idt">${f4Logo(s, ini)}<div><h1${s.name.length > 18 ? ' class="ek-h1l"' : s.name.length > 11 ? ' class="ek-h1m"' : ""}>${esc(s.name)}</h1><div class="ek-chips">${chips.map(t => `<span class="ek-chip">${esc(t)}</span>`).join("")}</div></div></div>
      <p class="ek-desc">${esc((fi && fi.fait) || s.desc || "")}</p></div>${pc}</div>
    <div id="f4tv" hidden></div>
    ${x ? f4Verdict(x) + f4Chaine(x) : ""}
    <div class="ek-medl"><span>${x ? `Chaque repère est placé face à la ${ekDefMot("mediane", "médiane", {})} <b>${esc(x.P.de)}</b>${x.P.mode === "rivales" ? ` (${esc(x.P.L.map(r => r.name).join(", "))})` : ""}.` : ""}</span>
      <div class="ek-acts">${typeof favBtn === "function" ? favBtn("c:" + s.id).replace('class="favbtn', 'class="ek-btn favbtn') : ""}${x && x.P.mode === "rivales" ? `<a class="ek-btn" href="/comparer?ids=${esc([s.id, ...x.P.L.slice(0, 2).map(r => r.id)].join(","))}">Comparer à ses rivales</a>` : ""}<button type="button" class="ek-btn bl" data-f4-ia>✦ Poser une question à l'IA</button></div></div>
    <div class="f4al" id="f4al" hidden></div>
  </section>`;
}

function f4Verdict(x) {
  const { M, MED, s } = x, k = x.bk ? "roe" : "m", rent = f4Ton(M[k], MED[k]), lev = s.netDebt != null && s.ebit > 0 ? s.netDebt / s.ebit : null;
  const a = M[k] == null ? (s.net > 0 ? "Bénéficiaire" : s.net < 0 ? "<em>En perte</em>" : "") // 5/11 : rentabilité inconnue (fonds propres absents) : pas de comparaison inventée
    : rent === "g" ? "Très rentable" : rent === "r" ? "<em>Peu rentable</em>" : `Rentable comme ${x.P.qui}`;
  const b = x.bk ? "" : s.netDebt == null ? "" : s.netDebt <= 0 ? "sans dette" : lev > 3 ? "<em>endettée</em>" : "dette modérée";
  const pr = M.pe == null ? "" : f4Ton(M.pe, MED.pe, true), c = M.pe == null ? "" : pr === "r" ? "le marché y croit" : pr === "g" ? "le marché doute" : "le marché est partagé"; // 4/11 : pas de jugement sur le prix (règles des recommandations d'investissement), ce que dit le PER
  const parts = [a, b, c].filter(Boolean);
  return `<div class="ek-vrd"><span class="ek-stk2">Le verdict${x.c && x.c.years && x.c.years.length ? " " + x.c.years[x.c.years.length - 1] : ""}</span><h2>${parts.join(", ").replace(/^(<em>)?(\w)/, (m0, t, l) => (t || "") + l.toUpperCase())}.</h2></div>`;
}

function f4Chaine(x) {
  const { M, MED, s, sym } = x, bank = isBank(s), k2 = bank ? "nm" : "m";
  const R5 = x.bk ? [
    ["Son bénéfice", f4Pc(M.ng, 1, true), f4Ton(M.ng, MED.ng, false, 0.02), s.net != null && s.year ? `sur un an : ${f4Md(s.net, s.currency)} en ${s.year}` : "bénéfice non publié", f4Jauge(M.ng, MED.ng, false, 0.3), MED.ng != null ? `${x.P.court} : ${f4Pc(MED.ng, 1, true)}` : ""],
    ["Sa rentabilité", M.roe != null ? ekFr(M.roe * 100, 1) + " %" : "–", f4Ton(M.roe, MED.roe), `gagnés sur 100 ${sym} de fonds propres`, f4Jauge(M.roe, MED.roe), MED.roe != null ? `${x.P.court} : ${ekFr(MED.roe * 100, 1)} %` : ""],
  ].filter(r => r[0] !== "Sa rentabilité" || M.roe != null) : [
    ["Ses ventes", f4Pc(M.g, 1, true), f4Ton(M.g, MED.g, false, 0.02), `sur un an : ${f4Md(s.ca, s.currency)} de ventes en ${s.year}${f4EnEur(s.ca, s.currency)}`, f4Jauge(M.g, MED.g, false, 0.2), MED.g != null ? `${x.P.court} : ${f4Pc(MED.g, 1, true)}` : ""],
    ["Sa marge", M[k2] != null ? ekFr(M[k2] * 100, 0) + " " + sym : "–", f4Ton(M[k2], MED[k2]), M[k2] != null && M[k2] < 0 ? `perdus sur 100 ${sym} de ventes` : `gardés sur 100 ${sym} de ventes`, f4Jauge(M[k2], MED[k2]), MED[k2] != null ? `${x.P.court} : ${ekFr(MED[k2] * 100, 0)} ${sym}` : ""],
  ];
  if (!x.bk) R5.push(
    ["Son bénéfice", M.nm != null ? ekFr(M.nm * 100, 0) + " " + sym : "–", f4Ton(M.nm, MED.nm), `${M.nm != null && M.nm < 0 ? "de perte" : "de bénéfice"} sur 100 ${sym} de ventes`, f4Jauge(M.nm, MED.nm), MED.nm != null ? `${x.P.court} : ${ekFr(MED.nm * 100, 1)} ${sym}` : ""]);
  R5.push(
    ["Son dividende", M.pay != null ? (M.pay > 1.5 ? "> 100 %" : f4Pc(M.pay, 0)) : s.divPaid || s.dps || (x.c && (x.c.sourcePdf || x.c.sourceEP)) ? "–" : "0 %", "", M.pay > 1.5 ? "le dividende dépasse le bénéfice de l'année" : s.dps ? `du bénéfice versé : ${f4Par(s.dps, s.currency)} par action` : "du bénéfice versé", f4Jauge(M.pay, MED.pay), MED.pay != null ? `${x.P.court} : ${f4Pc(MED.pay, 0)}` : ""],
    ["Son prix en Bourse", M.pe != null ? ekFr(M.pe, 0) + " fois" : "–", "", M.pe != null ? "son bénéfice annuel (PER)" : "PER non significatif", f4Jauge(M.pe, MED.pe, true), MED.pe != null ? `${x.P.court} : ${ekFr(MED.pe, 0)} fois` : ""]);
  return `<div class="ek-chain" style="--n:${R5.length}">${R5.map((r, i) => `<a class="ek-rp" href="#e${i + 1}"><span class="ek-st"><i>${i + 1}</i>${esc(r[0])}</span><span class="ek-v ${r[2]}">${esc(r[1])}</span><span class="ek-s">${esc(r[3])}</span>${r[4]}<span class="ek-ml">${esc(r[5])}</span><span class="ek-go">Comprendre <span>↓</span></span></a>`).join("")}</div>`;
}

// ——— Le fil en 5 étapes ———
function f4Fil(x) {
  const E = x.bk ? [f4B1(x), f4B2(x), f4E4(x), f4E5(x)] : [f4E1(x), f4E2(x), f4E3(x), f4E4(x), f4E5(x)];
  E.forEach((e, i) => { e.id = "e" + (i + 1); e.n = i + 1; });
  return `<section class="ek-sec" id="fil"><span class="ek-stk2">L'histoire de ses comptes</span><h2>${x.bk ? "De son bénéfice au prix de l'action" : "De ses ventes au prix de l'action"}, en ${E.length} étapes.</h2>${ekFil(E)}</section>`; }
const f4Src = (x, t) => x.c && x.c.sourceEP ? { texte: "Comptes publiés, fournis par le spécialiste des données financières Eulerpool", lien: "https://eulerpool.com", label: "Data by Eulerpool ↗" } // 5/11 : mention exigée par Eulerpool
  : ({ texte: t || "Comptes officiels", lien: x.rap });
const f4Prochain = id => { const e = typeof eventsOf === "function" ? eventsOf(id).find(e => e.date >= TODAY && e.type === "Résultats") : null; return e ? `${e.label || "Prochaine publication"} le ${new Date(e.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.` : ""; };


// Titre d'une série annuelle : la variation de l'année et ce qu'elle a de particulier (sans redire chaque barre)
// Fin de titre après le terme exact (« Chiffre d'affaires : … ») : en minuscule, sans sujet.
function f4TitreSerie(gs, an) {
  if (!gs.length) return "";
  const [y1, g1] = gs[gs.length - 1], av = gs.slice(0, -1).map(z => z[1]), y0 = gs[0][0] - 1;
  if (g1 <= -1) return `devenu négatif en ${y1}.`; // 6/11 : jamais « en baisse de 250 % »
  if (g1 < 0) return `en baisse de ${ekFr(-g1 * 100, 1)} % en ${y1}${av.length && av[av.length - 1] < 0 ? ", deuxième année de recul" : av.length && av.every(v => v > 0) ? `, premier recul depuis ${y0}` : ""}.`;
  const base = `en hausse de ${ekFr(g1 * 100, 1)} % en ${y1}`;
  if (av.length >= 2 && g1 < Math.min(...av)) return `${base}, sa plus faible progression depuis ${y0}.`;
  if (av.length >= 2 && g1 > Math.max(...av)) return `${base}, sa plus forte progression depuis ${y0}.`;
  return base + ".";
}
function f4Montant(v, cur, an) { return v == null ? "" : v < 0 ? `une perte de ${f4Md(-v, cur)} en ${an}.` : `${f4Md(v, cur)} en ${an}.`; }
function f4E1(x) {
  const { s, c, M, MED, P } = x, se = f4Serie(c, "ca"), cur = s.currency;
  const gs = []; if (se) for (let i = 1; i < se.v.length; i++) if (se.v[i] != null && se.v[i - 1] > 0) gs.push([se.y[i], se.v[i] / se.v[i - 1] - 1]);
  const causes = [];
  const last = gs.length ? gs[gs.length - 1] : null, prev = gs.length > 1 ? gs[gs.length - 2] : null;
  return { id: "e1", n: 1, sur: "Ses ventes", titre: (gs.length && se && gs[gs.length - 1][0] === se.y[se.y.length - 1] ? f4TitreSerie(gs, s.year) : "") || f4Montant(s.ca, cur, s.year), concept: s.ca != null ? { cle: "ventes", ex: f4Md(s.ca, cur), calc: `ventes ${s.year}`, nom: s.name } : null,
    mots: [{ cle: "ventes", ex: f4Md(s.ca, cur), calc: `ventes ${s.year}`, nom: s.name }, { cle: "croissance", ex: f4Pc(M.g, 1, true), calc: `${ekFr(s.ca, 0)} ÷ ${ekFr(s.caPrev, 0)} − 1`, nom: s.name }],
    visuel: se ? f4Cols(x, se, "Ses ventes", null, `Chaque barre donne les ventes d'un exercice ; sous l'année, la variation par rapport à l'année d'avant.${gs.length >= 2 ? ` Depuis ${se.y[0]} : ${f4Pc(se.v[se.v.length - 1] / se.v.find(v => v > 0) - 1, 0, true)}.` : ""}`) : "",
    explique: causes.length ? ekExplique({ causes, surveiller: f4Prochain(s.id) }) : "",
    suite: `Sur ces ${f4Md(s.ca, cur)}, combien lui reste-t-il une fois l'activité payée ?` };
}

function f4Cols(x, se, titre, ligne, indice, fmtD) {
  const kfx = f4Kfx(x.s.currency); if (kfx) se = { ...se, v: se.v.map(v => v == null ? null : v * kfx) };
  const cur = kfx ? "EUR" : x.s.currency, md = Math.max(...se.v.filter(v => v != null).map(Math.abs)) >= 1000, f = v => md ? ekFr(v / 1000, fmtD != null ? fmtD : (Math.abs(v) >= 100000 ? 0 : v >= 10000 ? 1 : 2)) : ekFr(v, 0);
  // Échelle commune aux gains et aux pertes : le pas vient de l'écart total, le haut de l'axe du plus grand gain (0 s'il n'y a que des pertes)
  const vv = se.v.filter(v => v != null), hi = Math.max(0, ...vv), lo = Math.min(0, ...vv), base = f4Nice(lo < 0 ? hi - lo : hi), pas = base.ticks.length > 1 ? base.ticks[1] - base.ticks[0] : base.max;
  const top = lo < 0 ? Math.ceil(hi * 1.12 / pas) * pas : base.max, tk = []; for (let t = 0; t <= top + 1e-9; t += pas) tk.push(+t.toFixed(10));
  const nm = lo < 0 ? { max: top, ticks: tk, pas } : base;
  return ekColonnes({ titre, unite: `en ${md ? "milliards" : "millions"} ${cur === "EUR" ? "d'€" + (kfx ? "*" : "") : "de " + x.sym}`, annees: se.y, valeurs: se.v, fmt: f, max: nm.max, pas: nm.pas, graduations: nm.ticks, fmtAxe: t => md ? ekFr(t / 1000, t / 1000 < 10 && t % 1000 ? 1 : 0) : ekFr(t, 0), ligne, indice, source: f4Src(x, "Comptes officiels, exercices clos") });
}

function f4MetierSec(x) { // avant les étapes : à quoi correspondent les chiffres qui suivent
  const h = f4Metier(x); if (/ek-note">Pas encore/.test(h)) return "";
  return `<section class="ek-sec" id="metier"><span class="ek-stk2 p">Son métier</span><h2>${x.bk ? "D'où viennent ses revenus." : "D'où viennent ses ventes."}</h2><div class="ek-metier">${h}</div></section>`;
}
function f4Metier(x) {
  const { s } = x, wd = typeof ficheWd === "function" ? ficheWd(s.id) : null, fi = (typeof FICHES !== "undefined" && FICHES && FICHES[s.id]) || null, rep = typeof REP !== "undefined" && REP[s.id];
  let h = "";
  const facts = [];
  if (wd && wd.fonde) facts.push(["Création", wd.fonde, wd.fondateurs && wd.fondateurs.length ? "par " + wd.fondateurs.slice(0, 2).join(" et ") : ""]);
  if (wd && wd.siege) facts.push(["Siège", wd.siege, wd.pays || ""]);
  if (wd && wd.effectif && wd.effectif[0]) facts.push(["Salariés", ekFr(wd.effectif[0], 0), wd.effectif[1] ? "chiffre de " + wd.effectif[1] : ""]);
  try { const sec = R.companies.filter(c => c.sector === s.sector && f4Valide(c)).map(c => [c.id, typeof caEur === "function" ? caEur(c) : c.ca]).sort((p, q) => q[1] - p[1]), k = sec.findIndex(z => z[0] === s.id);
    // 6/11 (Romain) : le rang dans le secteur est un classement, réservé à Premium
    if (k >= 0 && sec.length > 5) facts.push(typeof isPrem === "function" && isPrem() ? ["Taille dans son secteur", `${k + 1}${k ? "e" : "re"} sur ${sec.length}`, "par les ventes", "/classements"] : ["Taille dans son secteur", "★ Premium", `son rang parmi les ${sec.length} entreprises du secteur`, "/premium", "Débloquer avec Premium →"]); } catch (e) { }
  if (facts.length) h += `<div class="ek-facts">${facts.map(f => f[3] ? `<a class="hl" href="${esc(f[3])}"><small>${esc(f[0])}</small><b>${esc(f[1])}</b><span>${esc(f[2])}</span><em>${esc(f[4] || "Voir le classement →")}</em></a>` : `<div><small>${esc(f[0])}</small><b>${esc(f[1])}</b><span>${esc(f[2])}</span></div>`).join("")}</div>`;
  if (fi) h += `<div class="ek-two">${[["Comment elle gagne de l'argent", fi.argent, "#FFF6C7"], ["Ce dont elle dépend", fi.depend, "#E2F8EE"]].filter(t => t[1]).map(t => `<div style="background:${t[2]}"><small>${esc(t[0])}</small>${esc(t[1])}</div>`).join("")}</div>`;
  if (rep && (rep.activites || rep.zones)) {
    const COL = ["#FFE14D", "#FF7EB3", "#A9B6FF", "#6EE3B5", "#FFB27A", "#C8A2FF", "#E6E4DE", "#BDE0FE"];
    const resserre = L => { if (!L || L.length <= 5) return L; const t = L.slice(0, 4), r = L.slice(4).reduce((a, x) => a + x[1], 0); return [...t, ["Autres", r]]; };
    const bloc = (t, L0) => { const L = resserre(L0); return !L || !L.length ? "" : `<div><h4>${esc(t)} · ${esc(rep.annee || "")}</h4><div class="ek-bar">${L.map((l, i) => `<i style="width:${l[1]}%;background:${COL[i % COL.length]}">${l[1] >= 8 ? ekFr(l[1], 0) + " %" : ""}</i>`).join("")}</div>
      <div class="ek-leg">${L.map((l, i) => `<div><b style="background:${COL[i % COL.length]}"></b>${esc(l[0])}<span>${ekFr(l[1], 0)} % · ${esc(f4Md(x.s.ca * l[1] / 100, x.s.currency))}</span></div>`).join("")}</div></div>` };
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
  // 6/11 : marges négatives placées à gauche de zéro (comme la rentabilité, f4B2) ; au-delà de -nn.max, au bord avec une flèche et le chiffre en note
  const pasM = nn.ticks.length > 1 ? nn.ticks[1] - nn.ticks[0] : nn.max / 5, mnM = mn < 0 ? -Math.min(nn.max, Math.ceil(-mn / pasM) * pasM) : 0;
  const gradM = []; for (let t = mnM; t <= nn.max + 1e-9; t += pasM) gradM.push(Math.round(t * 100) / 100);
  const borneM = r => r.v < mnM ? { ...r, note: `est hors de l'échelle : ${r.texte} gardés sur 100 ${sym}.` } : r;
  const pts = P.mode === "rivales" ? [...pl.map(borneM), ...hors, ...P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison }))] : pl.filter(r => r.moi).map(borneM).concat(hors.filter(r => r.moi));
  const ratio = v != null && med > 0 ? v / med : null;
  const qui2 = P.qui, cmpM = ratio == null ? "" : ratio > 4 ? `Bien plus que ${qui2} (${ekFr(med * 100, 0)} ${sym})` : ratio >= 1.8 && ratio < 2.2 ? `Presque deux fois plus que ${qui2}` : ratio >= 1.15 ? `${ekFr(ratio, 1)} fois plus que ${qui2}` : ratio <= 0.85 ? `Moins que ${qui2} (${ekFr(med * 100, 0)} ${sym})` : `Comme ${qui2}`;
  const tonM = ratio == null ? "n" : ratio >= 1.15 ? "g" : ratio <= 0.85 || v < 0 ? "r" : "n";
  const titre = v == null ? `Sa marge n'est pas publiée sous une forme comparable.` : (v < 0 ? `elle perd ${ekFr(-v * 100, 0)} ${sym} sur 100 ${sym} vendus, une fois l'activité payée.` : `elle garde ${ekFr(v * 100, 0)} ${sym} sur 100 ${sym} vendus, une fois l'activité payée.`);
  // Causes : stabilité de la marge, coûts face aux ventes, rivale la moins rentable
  const causes = [], ca = f4Serie(c, "ca"), eb = f4Serie(c, bank ? "net" : "ebit");
  if (ca && eb) {
    const mg = ca.v.map((x2, i) => x2 > 0 && eb.v[i] != null ? eb.v[i] / x2 * 100 : null), ok = mg.filter(z => z != null);
    if (ok.length >= 3) { const lo = Math.min(...ok), hi = Math.max(...ok), f0 = ok[0], f1 = ok[ok.length - 1];
      const i0 = ca.v.findIndex((z, i) => z > 0 && eb.v[i] > 0), gc = ca.v[ca.v.length - 1] / ca.v[i0] - 1, ge = eb.v[eb.v.length - 1] / eb.v[i0] - 1;
      if (i0 >= 0 && i0 < ca.v.length - 1 && isFinite(gc) && isFinite(ge)) causes.push({ titre: ge > gc + 0.02 ? "Ses coûts augmentent moins vite que ses ventes" : ge < gc - 0.02 ? "Ses coûts augmentent plus vite que ses ventes" : "Ses coûts suivent ses ventes", texte: `Depuis ${ca.y[i0]}, ses ventes ${f4Evol(gc).replace(/^a /, "ont ").replace(/^est restée? stable$/, "sont restées stables")} et ce qu'elle en garde ${f4Evol(ge)}. ${ge <= -1 ? "Ses ventes ne couvrent plus ses coûts." : ge > gc + 0.02 ? "Chaque vente lui rapporte un peu plus qu'avant." : ge < gc - 0.02 ? "Chaque vente lui rapporte un peu moins qu'avant." : "Chaque vente lui rapporte autant qu'avant."}` });
    }
  }
  const pire = pl.filter(r => !r.moi).slice(-1)[0];
  if (pire && P.mode === "rivales" && pl.length >= 3) { const rr = P.L.find(r => r.name === pire.nom), g = rr ? f4M(rr).g : null;
    if (g != null && g < -0.02) causes.push({ titre: `Chez ${pire.nom}, les ventes reculent`, texte: `${f4Pc(g, 1, true)} sur un an, et ${ekFr(pire.v, 0)} ${sym} gardés sur 100 ${sym} : quand les ventes baissent, les coûts fixes (magasins, salaires) pèsent plus.` }); }
  const gs = f4Serie(c, "ca"); let ralentit = false; if (gs && gs.v.length >= 3) { const n = gs.v.length, a = gs.v[n - 1] / gs.v[n - 2] - 1, b = gs.v[n - 2] / gs.v[n - 3] - 1; ralentit = a < b - 0.01; }
  const mt = ca && eb ? ekTableau(ca.y, [[bank ? `Bénéfice sur 100 ${sym} de revenus` : `Gardés sur 100 ${sym} vendus`, ca.v.map((z, i) => z > 0 && eb.v[i] != null ? ekFr(eb.v[i] / z * 100, 1) + " " + sym : "–")], [bank ? "Bénéfice" : "Résultat d'exploitation", eb.v.map(z => f4Md(z, s.currency))]]) : "";
  return { id: "e2", n: 2, sur: "Sa marge", titre, cmp: { texte: cmpM, ton: tonM },
    concept: v != null ? { cle: bank ? "benefice" : "marge", ex: f4Pc(v, 1), calc: !bank && s.ebit != null ? `${ekFr(s.ebit, 0)} ÷ ${ekFr(s.ca, 0)}` : "", nom: s.name } : null,
    mots: [{ cle: bank ? "benefice" : "marge", ex: v != null ? f4Pc(v, 1) : "", calc: !bank && s.ebit != null ? `${ekFr(s.ebit, 0)} ÷ ${ekFr(s.ca, 0)}` : "", nom: s.name }, { cle: "mediane", ex: med != null ? ekFr(med * 100, 0) + " " + sym : "", calc: `${lib} médiane ${P.de}`, nom: s.name }],
    visuel: v != null && pl.length ? ekPoints({ titre: `Gardés sur 100 ${sym} de ventes`, unite: `${lib} ${s.year}`, lignes: pts, mediane: med != null ? med * 100 : 0, mediane_label: med != null ? `médiane ${ekFr(med * 100, 0)} ${sym}` : "", min: mnM, max: nn.max, graduations: gradM, fmtAxe: t => ekFr(t, 0) + " " + sym,
      indice: `Chaque point place une entreprise sur l'échelle. À droite du pointillé (zone verte), elle garde plus que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu ; à gauche (zone rouge), moins.${mn < mnM ? " Une marge plus basse que l'échelle est posée au bord, avec une flèche." : ""}`, source: f4Src(x, `Comptes ${s.year}`) }) : "",
    explique: causes.length ? ekExplique({ causes, surveiller: ralentit ? "Si les ventes ralentissent encore, la marge peut baisser : une partie des coûts est fixe." : f4Prochain(s.id) }) : "",
    suite: "Et une fois l'impôt payé, que reste-t-il ?" };
}

function f4E3(x) {
  const { s, c, M, sym } = x, cur = s.currency, ns = f4Serie(c, "net"), n = c.years.length - 1, bank = isBank(s);
  const ng = s.net != null && s.netPrev > 0 ? s.net / s.netPrev - 1 : null;
  let titre = f4Montant(s.net, cur, s.year);
  const nY = Math.min(4, c.years.length), tx = Array.from({ length: nY }, (_, j) => f4Taux(c, c.years.length - nY + j));
  const t1 = f4Taux(c, n), t0 = n > 0 ? f4Taux(c, n - 1) : null, alerte = t1 != null && t0 != null && t1 > t0 + 0.02;
  const ligne = tx.some(t => t != null) ? { nom: "taux d'impôt", valeurs: tx.map(t => t == null ? "" : ekFr(t * 100, 0) + " %"), alerte: alerte ? tx.length - 1 : -1 } : null;
  // Causes : ce qui a fait bouger le bénéfice d'un exercice à l'autre
  const causes = [], F = c.fin, v = (k, i) => F[k] && F[k][i] != null ? F[k][i] : null;
  if (n > 0 && !bank) {
    const dE = v("ebit", n) != null && v("ebit", n - 1) != null ? v("ebit", n) - v("ebit", n - 1) : null, fin1 = v("pretax", n) != null && v("ebit", n) != null ? v("pretax", n) - v("ebit", n) : null, fin0 = v("pretax", n - 1) != null && v("ebit", n - 1) != null ? v("pretax", n - 1) - v("ebit", n - 1) : null;
    const dT = v("tax", n) != null && v("tax", n - 1) != null ? -(v("tax", n) - v("tax", n - 1)) : null, y1 = c.years[n], y0 = c.years[n - 1];
    const C = [];
    if (dE != null) C.push([Math.abs(dE), { titre: dE >= 0 ? "Son activité rapporte plus" : "Son activité rapporte moins", texte: `Avant intérêts et impôts, elle a gagné ${f4Md(Math.abs(dE), cur)} de ${dE >= 0 ? "plus" : "moins"} qu'en ${y0}.` }]);
    if (dT != null) C.push([Math.abs(dT), { titre: dT < 0 ? "Elle paie plus d'impôts" : "Elle paie moins d'impôts", texte: `${f4Md(Math.abs(dT), cur)} d'impôts de ${dT < 0 ? "plus" : "moins"} qu'en ${y0}${t0 != null && t1 != null ? ` : l'impôt prend ${ekFr(t1 * 100, 0)} ${x.sym} sur 100 ${x.sym} gagnés${ekFr(t1 * 100, 0) === ekFr(t0 * 100, 0) ? ", comme l'an dernier" : `, contre ${ekFr(t0 * 100, 0)} ${x.sym}`}` : ""}.` }]);
    if (fin1 != null && fin0 != null && Math.abs(fin1 - fin0) > 0) C.push([Math.abs(fin1 - fin0), { titre: fin1 - fin0 >= 0 ? "Ses placements et sa dette lui coûtent moins" : "Ses placements et sa dette lui coûtent plus", texte: `Intérêts reçus et payés, et autres gains ou pertes hors activité : ${f4Md(Math.abs(fin1 - fin0), cur)} de ${fin1 - fin0 >= 0 ? "mieux" : "moins bien"} qu'en ${y0}.` }]);
    C.sort((a, b) => b[0] - a[0]).slice(0, 2).forEach(z => causes.push(z[1]));
    if (ng != null) { // la cause principale, dans le sens de la variation
      const K = [["act", dE], ["imp", dT], ["fin", fin1 != null && fin0 != null ? fin1 - fin0 : null]].filter(z => z[1] != null && (ng < 0 ? z[1] < 0 : z[1] > 0)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      const pq = ng < 0 ? { act: "l'activité rapporte moins", imp: "l'impôt a pris plus", fin: "les intérêts et divers pèsent plus" } : { act: "grâce à l'activité", imp: "l'impôt a pris moins", fin: "grâce aux intérêts et divers" };
      // 6/11 (Stellantis : « en baisse de 508,7 % ») : un bénéfice devenu une perte se dit en montants, pas en pourcentage
      titre = ng <= -1 ? `${f4Montant(s.net, cur, y1).replace(/\.$/, "")}, après ${f4Md(s.netPrev, cur)} de bénéfice en ${y1 - 1}${K ? ", car " + pq[K[0]] : ""}.` : `${ng < 0 ? "en baisse" : "en hausse"} de ${ekFr(Math.abs(ng) * 100, 1)} % en ${y1}${K ? (ng < 0 || K[0] === "imp" ? ", car " : " ") + pq[K[0]] : ""}.`; }
  }
  if (!bank && s.netDebt != null) causes.push(s.netDebt <= 0 ? { titre: "Plus d'argent en caisse que de dettes", texte: `Même en remboursant tous ses emprunts, il lui resterait ${f4Md(-s.netDebt, cur)} : elle ne dépend pas des banques.` }
    : { titre: s.ebit > 0 && s.netDebt / s.ebit < 2 ? "Une dette légère" : s.ebit > 0 && s.netDebt / s.ebit <= 3 ? "Une dette à surveiller" : "Une dette lourde", texte: s.ebit > 0 ? `Elle doit ${f4Md(s.netDebt, cur)} : ${s.netDebt / s.ebit < 1.5 ? (s.netDebt / s.ebit < 1 ? "moins d'une année" : "environ une année") + " de ce que rapporte son activité suffirait" : `environ ${ekFr(s.netDebt / s.ebit, 0)} années de ce que rapporte son activité suffiraient`} à la rembourser.` : `Elle doit ${f4Md(s.netDebt, cur)}, alors que son activité ne rapporte rien cette année.` });
  const cash = f4Serie(c, "netDebt");
  const tb = ns ? ekTableau(ns.y, [["Bénéfice net", ns.v.map(z => f4Md(z, cur))], ...(cash ? [[cash.v.some(z => z != null && z > 0) ? "Dette nette (négatif : trésorerie)" : "Trésorerie nette", cash.v.map(z => z == null ? "–" : cash.v.some(q => q != null && q > 0) ? f4Md(z, cur) : f4Md(-z, cur))]] : []), ["Bénéfice sur 100 " + sym + " vendus", ns.v.map((z, i) => { const ca = f4Serie(c, "ca"); return ca && ca.v[i] > 0 && z != null ? ekFr(z / ca.v[i] * 100, 1) + " " + sym : "–"; })]]) : "";
  return { id: "e3", n: 3, sur: "Son bénéfice", titre, concept: s.net != null ? { cle: "benefice", ex: f4Md(s.net, cur), calc: `exercice ${s.year}`, nom: s.name } : null,
    mots: [{ cle: "benefice", ex: f4Md(s.net, cur), calc: `exercice ${s.year}`, nom: s.name }, ...(t1 != null ? [{ cle: "impot", ex: f4Pc(t1, 1), calc: `${ekFr(v("tax", n), 0)} ÷ ${ekFr(v("pretax", n), 0)}`, nom: s.name }] : []), ...(!bank && s.netDebt != null ? [{ cle: s.netDebt <= 0 ? "treso" : "dette", ex: f4Md(Math.abs(s.netDebt), cur), calc: `fin ${s.year}`, nom: s.name }] : [])],
    visuel: ns ? f4Cols(x, ns, "Son bénéfice net", ligne, ligne ? `La ligne « taux d'impôt » donne la part du résultat payée en impôt chaque année.${alerte ? ` Elle monte en ${c.years[n]} (${ekFr(t1 * 100, 0)} %, contre ${ekFr(t0 * 100, 0)} %) : à elle seule, elle retire une partie du bénéfice.` : ""}` : "Chaque barre donne le bénéfice net d'un exercice.") : "",
    explique: causes.length ? ekExplique({ causes, surveiller: alerte ? "Le taux d'impôt du prochain exercice." : !bank && s.netDebt > 0 && s.ebit > 0 && s.netDebt / s.ebit > 3 ? "Le poids de la dette, au-delà de 3 années de résultat." : f4Prochain(s.id) }) : "",
    suite: "Que fait-elle de ce bénéfice ?" };
}

function f4E4(x) {
  const { s, c, M, MED, P, sym } = x, cur = s.currency, pay = M.pay, dv = f4Serie(c, "dps"), dp = f4Serie(c, "divPaid");
  const rien = !s.divPaid && !s.dps && !(c.sourcePdf || c.sourceEP), parAction = !s.divPaid && s.dps > 0; // 4/11 : comptes lus dans un PDF sans ligne de dividende : non relevé, pas « aucun dividende »
  const titre = (c.sourcePdf || c.sourceEP) && !s.divPaid && !s.dps ? "Le dividende n'a pas encore été relevé dans son rapport annuel." : rien ? (s.net != null && s.net <= 0 ? "Elle ne verse pas de dividende : elle est en perte cette année." : "Elle ne verse pas de dividende : elle garde tout son bénéfice.") : pay > 1.5 ? "Elle verse plus que son bénéfice de l'année : le dividende puise dans ses réserves." : pay != null ? `${f4Pc(Math.min(pay, 9.99), 0)} pour les actionnaires${s.dps ? `, soit ${f4Par(s.dps, s.currency)} par action` : ""}.` : s.net != null && s.net <= 0 ? "Le dividende est versé malgré un bénéfice nul ou négatif." : "La part du bénéfice versée n'est pas calculable cette année.";
  const causes = [];
  if (s.fcf != null && s.divPaid) causes.push(s.fcf >= s.divPaid ? { titre: "Elle a de quoi le payer", texte: `Une fois ses investissements payés, il lui reste ${f4Md(s.fcf, cur)} d'argent frais ; le dividende en prend ${f4Md(s.divPaid, cur)}.` } : { titre: "Elle verse plus qu'elle n'encaisse", texte: `${s.fcf < 0 ? `Son activité ne couvre même pas ses investissements (il manque ${f4Md(-s.fcf, cur)})` : `Une fois ses investissements payés, il lui reste ${f4Md(s.fcf, cur)}`} ; le dividende en prend ${f4Md(s.divPaid, cur)}. Elle puise dans ses réserves ou emprunte.` });
  const cash = f4Serie(c, "netDebt"); if (!isBank(s) && cash) { const L = cash.v.map((z, i) => [cash.y[i], z]).filter(z => z[1] != null); if (L.length >= 2 && L.every(z => z[1] <= 0)) causes.push({ titre: L[L.length - 1][1] < L[0][1] ? "Elle met le reste de côté" : "Ses réserves diminuent", texte: `Son argent disponible, dettes déduites : ${f4Md(-L[0][1], cur)} fin ${L[0][0]}, ${f4Md(-L[L.length - 1][1], cur)} fin ${L[L.length - 1][0]}.` }); }
  const rD = !rien && pay != null && MED.pay != null && MED.pay > 0 ? pay / MED.pay : null;
  const tonD = pay > 1 ? "r" : rD == null ? "g" : rD <= 0.85 ? "r" : "g";
  const cmpD = rien || pay == null ? "" : pay > 1 && pay <= 1.5 ? "Plus que son bénéfice de l'année" : pay > 1.5 ? "" : rD == null ? "" : rD >= 1.15 ? `Plus que ${P.qui}` : rD <= 0.85 ? `Moins que ${P.qui}` : `Comme ${P.qui}`;
  const part = rien ? 0 : Math.max(0, Math.min(100, (pay != null ? pay : 1) * 100));
  return { id: "e4", n: 4, sur: "Son dividende", titre, haut: true, cmp: { texte: cmpD, ton: tonD },
    concept: !rien && pay != null && pay <= 1.5 ? { cle: "distrib", ex: f4Pc(pay, 0), calc: s.divPaid && s.net ? `${ekFr(s.divPaid, 0)} ÷ ${ekFr(s.net, 0)}` : parAction && s.eps ? `${ekFr(s.dps, 2)} ÷ ${ekFr(s.eps, 2)} par action` : "", nom: s.name } : null,
    mots: [{ cle: "distrib", ex: pay != null && pay <= 1.5 ? f4Pc(pay, 0) : "", calc: s.divPaid && s.net ? `${ekFr(s.divPaid, 0)} ÷ ${ekFr(s.net, 0)}` : parAction && s.eps ? `${ekFr(s.dps, 2)} ÷ ${ekFr(s.eps, 2)} par action` : "", nom: s.name }, ...(s.dps ? [{ cle: "dpa", ex: f4Par(s.dps, s.currency), calc: `exercice ${s.year}`, nom: s.name }] : []), ...(M.yld != null ? [{ cle: "rendement", ex: f4Pc(M.yld, 1), calc: "au cours actuel", nom: s.name }] : [])],
    visuel: (() => { // Points face à la médiane, comme pour le prix : sur 100 de bénéfice, combien sont versés
      const vp = rien ? 0 : pay != null ? pay * 100 : null; if (vp == null) return "";
      // Au-delà de 100 : elle verse plus que son bénéfice de l'année (rouge). Au-delà de 150 : point au bout de l'axe, « × 10 » et le vrai calcul en note.
      const ligne = (r, m, moi) => { const v = moi ? vp : m.pay != null ? m.pay * 100 : null; if (v == null) return { nom: r.name, v: null, texte: r.missing ? "comptes non relevés" : "dividende non relevé" };
        const o = { nom: r.name, v, texte: ekFr(v, 0) + " " + sym, moi }; if (v > 100) o.ton = "r";
        if (v > 150) { o.texte = "× " + ekFr(v / 100, v >= 1000 ? 0 : 1); o.note = r.divPaid != null && r.net != null ? `a versé ${f4Md(r.divPaid, r.currency)} de dividendes pour ${f4Md(r.net, r.currency)} de bénéfice en ${r.year || s.year} : ${ekFr(v / 100, v >= 1000 ? 0 : 1)} fois son bénéfice de l'année.` : `verse ${ekFr(v / 100, v >= 1000 ? 0 : 1)} fois son bénéfice de l'année.`; }
        return o; };
      const lig = [ligne(s, M, 1), ...(P.mode === "rivales" ? P.L.map(r => ligne(r, f4M(r), 0)) : [])];
      const pl = lig.filter(r => r.v != null).sort((a, b) => b.v - a.v), nn = f4Nice(Math.min(150, Math.max(100, ...pl.map(r => r.v))));
      return ekPoints({ titre: `Versés sur 100 ${sym} de bénéfice`, unite: `dividendes ${s.year}`, lignes: [...pl, ...lig.filter(r => r.v == null), ...(P.mode === "rivales" ? P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison })) : [])],
        mediane: MED.pay != null ? Math.min(nn.max, MED.pay * 100) : 0, mediane_label: MED.pay != null ? `médiane ${ekFr(MED.pay * 100, 0)} ${sym}` : "", max: nn.max, graduations: nn.ticks, fmtAxe: t => ekFr(t, 0) + " " + sym, motBas: "verse moins", motHaut: "verse plus",
        indice: `Chaque point place une entreprise : combien elle verse à ses actionnaires sur 100 ${sym} de bénéfice. À droite du pointillé (zone verte), elle verse plus que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu ; à gauche (zone rouge), moins. Au-delà de 100 ${sym}, elle verse plus que son bénéfice de l'année.`, source: f4Src(x, `Versements de ${s.year}`) });
    })(),
    explique: causes.length ? ekExplique({ causes, surveiller: M.yld != null ? `Rendement : ${f4Pc(M.yld, 1)} par an au cours actuel${MED.yld != null ? `, contre ${f4Pc(MED.yld, 1)} ${P.chez}` : ""}.` : "" }) : "",
    suite: "Avec ces chiffres, combien coûte l'action ?" };
}

function f4E5(x) {
  const { s, M, MED, P, sym } = x, p = typeof pxOf === "function" ? pxOf(s) : null, v = (() => { try { return valo(s); } catch (e) { return null; } })();
  const pe = M.pe, med = MED.pe;
  const sansCours = !p || !(p.p > 0), titre = pe == null ? (sansCours ? "Son cours n'est pas disponible sur le site : le prix de l'action ne peut pas être comparé." : "Son PER n'a pas de sens cette année : le bénéfice est trop faible ou négatif.") : `l'action coûte ${ekFr(pe, 0)} fois son bénéfice annuel.`;
  const cmpP = pe == null || med == null ? "" : `${P.mode === "rivales" ? "Ses rivales" : "Son secteur"} : ${ekFr(med, 0)} fois`;
  const pl = [{ nom: s.name, v: pe, texte: pe != null ? ekFr(pe, 0) + " fois" : sansCours ? "son cours n'est pas disponible sur le site" : "son bénéfice est trop faible, le PER n'aurait pas de sens", moi: 1 }, ...(P.mode === "rivales" ? P.L.map(r => { const m = f4M(r); return { nom: r.name, v: m.pe != null ? m.pe : null, texte: m.pe != null ? ekFr(m.pe, 0) + " fois" : "son bénéfice est trop faible ou son cours manque, le PER n'aurait pas de sens" }; }) : [])];
  const mx = f4Nice(Math.max(30, ...pl.filter(r => r.v != null).map(r => Math.min(r.v, 100))));
  const causes = [];
  if (pe != null && med != null) {
    const mieux = x.bk ? [["bénéfice", f4Ton(M.ng, MED.ng, false, 0.02)], ["rentabilité", f4Ton(M.roe, MED.roe)]] : [["ventes", f4Ton(M.g, MED.g, false, 0.02)], ["marge", f4Ton(M.m, MED.m)], ["bénéfice", f4Ton(M.nm, MED.nm)]];
    const g = mieux.filter(z => z[1] === "g").map(z => z[0]), r = mieux.filter(z => z[1] === "r").map(z => z[0]), qui = P.qui;
    if (pe > med * 1.15) causes.push({ titre: "Le marché y croit", texte: g.length ? `${f4Groupe(g, true)} que ${P.chez}. Les investisseurs attendent que ça dure.` : `Ses comptes ne sont pas meilleurs que ceux ${P.mode === "rivales" ? "de ses rivales" : "des entreprises de son secteur"} : le prix reflète surtout des attentes.` });
    else if (pe < med * 0.85) causes.push({ titre: "Le marché doute", texte: r.length ? `${f4Groupe(r, false)} que ${P.chez} : le marché doute.` : `Ses comptes sont aussi bons que ceux ${P.mode === "rivales" ? "de ses rivales" : "des entreprises de son secteur"} : le prix bas reflète un doute sur l'avenir, que les comptes passés ne montrent pas.` });
    else causes.push({ titre: "Un prix dans la moyenne", texte: `Le marché la paie comme ${P.mode === "rivales" ? "ses rivales" : "son secteur"}.` });
  }
  const f4Plage = q => q && q.h52 > 0 && q.l52 > 0 && q.h52 / q.l52 <= 3; // fourchette sur un an jugée fiable (sinon masquée, comme dans l'en-tête)
  if (f4Plage(p)) { const dd = p.p / p.h52 - 1, rv = P.mode === "rivales" ? P.L.map(r => { const q = pxOf(r); return f4Plage(q) ? [r.name, q.p / q.h52 - 1] : null; }).filter(Boolean) : [];
    const mr = f4Med(rv.map(z => z[1]));
    if (dd < -0.1 && rv.length && mr != null) causes.push(mr < -0.1 ? { titre: "Tout le secteur a reculé, pas seulement elle", texte: `Depuis leur plus haut de l'année : ${rv.slice(0, 3).map(z => `${z[0]} ${f4Pc(z[1], 0, true)}`).join(", ")}.` } : { titre: "Une baisse qui lui est propre", texte: `Ses rivales sont restées près de leur plus haut : ${rv.slice(0, 3).map(z => `${z[0]} ${f4Pc(z[1], 0, true)}`).join(", ")}.` });
  }
  return { id: "e5", n: 5, sur: "Son prix en Bourse", titre, cmp: { texte: cmpP, ton: pe != null && med != null ? f4Ton(pe, med, true) || "n" : "n" }, // 5/11 (Romain) : PER de nouveau en vert / rouge face aux rivales
    concept: pe != null ? { cle: "per", ex: ekFr(pe, 0) + " fois", calc: v && v.capE && s.net ? `${f4Md(v.capE / 1e6, "EUR")} ÷ ${f4Md(s.net, s.currency)}` : "", nom: s.name } : null,
    mots: [{ cle: "per", ex: pe != null ? ekFr(pe, 0) + " fois" : "", calc: v && v.capE && s.net ? `${f4Md(v.capE / 1e6, "EUR")} ÷ ${f4Md(s.net, s.currency)}` : "", nom: s.name }, ...(v && v.capE ? [{ cle: "capi", ex: f4Md(v.capE / 1e6, "EUR"), calc: "au cours actuel", nom: s.name }] : [])],
    visuel: pe == null ? "" : ekPoints({ titre: "Années de bénéfice pour payer l'action", unite: `PER, cours du ${typeof PXUP === "string" && PXUP !== "none" ? new Date(PXUP).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }) : "jour"}`, basEstMieux: true, motBas: "PER plus bas", motHaut: "PER plus haut", lignes: [...pl.map(r => r.v != null && r.v > mx.max ? { ...r, note: `coûte ${ekFr(r.v, 0)} fois son bénéfice annuel, au-delà de l'échelle du graphique.` } : r), ...P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison }))], mediane: med != null ? med : 0, mediane_label: med != null ? `médiane ${ekFr(med, 0)} fois` : "", max: mx.max, graduations: mx.ticks, fmtAxe: t => ekFr(t, 0),
      indice: `Chaque point place une entreprise sur l'échelle du PER. À gauche du pointillé, un PER plus bas que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu : le marché doute davantage ; à droite, un PER plus haut : le marché y croit davantage.`, source: { texte: `Cours du jour, comptes ${s.year}` } }),
    explique: causes.length ? ekExplique({ causes, surveiller: pe != null && med != null && pe > med * 1.15 ? `À ${ekFr(pe, 0)} fois le bénéfice, le cours dépend des attentes : un ralentissement des ventes pèse vite sur lui.` : pe != null && med != null && pe < med * 0.85 ? "Un PER bas peut durer si les ventes ou les marges continuent de reculer." : "" }) : "" };
}

// ——— Variante banque / assurance (ou comptes de ventes inutilisables) : bénéfice et rentabilité des fonds propres ———
function f4B1(x) {
  const { s, c, M, MED, P } = x, cur = s.currency, se = f4Serie(c, "net"), qui = P.mode === "rivales" ? "ses rivales" : "son secteur";
  const gs = []; if (se) for (let i = 1; i < se.v.length; i++) if (se.v[i] != null && se.v[i - 1] > 0) gs.push([se.y[i], se.v[i] / se.v[i - 1] - 1]);
  const causes = [];
  // 6/11 (Ubisoft : « en baisse de 254,3 % en 2025 » affiché pour 2026) : la variation n'est dite que si elle porte sur la dernière année ; sinon le montant, et celui de l'année d'avant
  const nY = se ? se.y[se.y.length - 1] : null, nP = se && se.v.length > 1 ? se.v[se.v.length - 2] : null, pY = se && se.y.length > 1 ? se.y[se.y.length - 2] : null;
  const tB1 = gs.length && gs[gs.length - 1][0] === nY ? f4TitreSerie(gs, s.year) : s.net != null && s.year ? f4Montant(s.net, cur, s.year).replace(/\.$/, "") + (nP != null && pY ? `, après ${nP < 0 ? "une perte de " + f4Md(-nP, cur) : f4Md(nP, cur) + " de bénéfice"} en ${pY}.` : ".") : "";
  return { sur: "Son bénéfice", titre: tB1 || "Son bénéfice n'est pas publié sous une forme comparable.", concept: s.net != null && s.year ? { cle: "benefice", ex: f4Md(s.net, cur), calc: `exercice ${s.year}`, nom: s.name } : null,
    mots: [{ cle: "benefice", ex: f4Md(s.net, cur), calc: `exercice ${s.year}`, nom: s.name }],
    visuel: se ? f4Cols(x, se, "Son bénéfice net", null, "Chaque barre donne le bénéfice net d'un exercice ; sous l'année, la variation par rapport à l'année d'avant.") : "",
    explique: causes.length ? ekExplique({ causes, surveiller: f4Prochain(s.id) }) : "",
    suite: `Sur 100 ${x.sym} apportés par ses actionnaires, combien gagne-t-elle ?` };
}
function f4B2(x) {
  const { s, c, M, MED, P, sym } = x, v = M.roe, med = MED.roe, qui = P.mode === "rivales" ? "ses rivales" : "son secteur";
  const rows = [{ nom: s.name, v: v != null ? v * 100 : null, texte: v != null ? ekFr(v * 100, 1) + " %" : "fonds propres non publiés", moi: 1 }, ...P.L.map(r => { const m = f4M(r).roe; return { nom: r.name, v: m != null ? m * 100 : null, texte: m != null ? ekFr(m * 100, 1) + " %" : "fonds propres non publiés" }; })];
  const pl = rows.filter(r => r.v != null), nn = f4Nice(Math.max(10, ...pl.map(r => r.v)));
  // 6/11 (capture de Romain, Ubisoft) : les rentabilités négatives sont placées à gauche de zéro (avant : toutes posées sur zéro, en vert) ;
  // l'échelle descend au plus à -nn.max, une valeur plus basse est posée au bord avec une flèche et son vrai chiffre en note
  const pas = nn.ticks.length > 1 ? nn.ticks[1] - nn.ticks[0] : nn.max / 5, bas0 = Math.min(0, ...pl.map(r => r.v)), mn = bas0 < 0 ? -Math.min(nn.max, Math.ceil(-bas0 / pas) * pas) : 0;
  const grad = []; for (let t = mn; t <= nn.max + 1e-9; t += pas) grad.push(Math.round(t * 100) / 100);
  const borne = r => r.v < mn ? { ...r, note: `est hors de l'échelle : ${r.texte}.` } : r;
  const pts = P.mode === "rivales" ? [...pl.map(borne), ...rows.filter(r => r.v == null), ...P.out.map(o => ({ nom: o.nom, v: null, texte: o.raison }))] : pl.filter(r => r.moi).map(borne);
  const causes = [], ne = f4Serie(c, "net"), eq = f4Serie(c, "equity");
  if (ne && eq) { const r = ne.v.map((z, i) => z != null && eq.v[i] > 0 ? z / eq.v[i] * 100 : null), ok = r.filter(z => z != null);
    if (ok.length >= 3) { const lo = Math.min(...ok), hi = Math.max(...ok), f0 = ok[0], f1 = ok[ok.length - 1], y0 = ne.y[r.indexOf(f0)];
      const i0 = ne.v.findIndex((z, i) => z > 0 && eq.v[i] > 0), gn = ne.v[ne.v.length - 1] / ne.v[i0] - 1, ge = eq.v[eq.v.length - 1] / eq.v[i0] - 1;
      const perte = ne.v[ne.v.length - 1] != null && ne.v[ne.v.length - 1] <= 0;
      if (isFinite(gn) && isFinite(ge)) causes.push({ titre: perte ? "Son bénéfice est devenu une perte" : gn > ge + 0.02 ? "Elle gagne plus avec le même capital" : gn < ge - 0.02 ? (ge > 0 ? "Son capital grandit plus vite que ses gains" : "Ses gains reculent plus vite que son capital") : "Ses gains suivent son capital", texte: `Depuis ${ne.y[i0]}, son bénéfice ${f4Evol(gn)} et l'argent apporté par ses actionnaires ${f4Evol(ge)}.` }); } }
  const tb = ne && eq ? ekTableau(ne.y, [["Rentabilité des fonds propres", ne.v.map((z, i) => z != null && eq.v[i] > 0 ? ekFr(z / eq.v[i] * 100, 1) + " %" : "–")], ["Bénéfice net", ne.v.map(z => f4Md(z, s.currency))], ["Capitaux propres", eq.v.map(z => f4Md(z, s.currency))]]) : "";
  return { sur: "Sa rentabilité", titre: v == null ? "Ses fonds propres ne sont pas publiés sous une forme comparable." : v < 0 ? `elle perd ${ekFr(-v * 100, 1)} ${sym} par an sur 100 ${sym} apportés par ses actionnaires.` : `elle gagne ${ekFr(v * 100, 1)} ${sym} par an sur 100 ${sym} apportés par ses actionnaires.`,
    // médiane négative : l'écart de 15 % se compte sur sa valeur absolue (avant : -4,5 face à -4 passait pour « comme »)
    cmp: v == null || med == null ? null : v > med + Math.abs(med) * 0.15 ? { texte: `Plus que ${qui} (médiane : ${ekFr(med * 100, 1)} ${sym})`, ton: "g" } : v < med - Math.abs(med) * 0.15 ? { texte: `Moins que ${qui} (médiane : ${ekFr(med * 100, 1)} ${sym})`, ton: "r" } : { texte: `Comme ${qui}`, ton: "n" },
    concept: v != null ? { cle: "roe", texte: "Rentabilité des fonds propres", ex: ekFr(v * 100, 1) + " %", calc: s.equity ? `${ekFr(s.net, 0)} ÷ ${ekFr(s.equity, 0)}` : "", nom: s.name } : null,
    mots: [{ cle: "roe", ex: v != null ? ekFr(v * 100, 1) + " %" : "", calc: s.equity ? `${ekFr(s.net, 0)} ÷ ${ekFr(s.equity, 0)}` : "", nom: s.name }, { cle: "mediane", ex: med != null ? ekFr(med * 100, 1) + " %" : "", calc: `rentabilité médiane ${P.de}`, nom: s.name }],
    visuel: v != null && pl.length ? ekPoints({ titre: `Gagnés sur 100 ${sym} de fonds propres`, unite: `rentabilité des capitaux propres ${s.year}`, lignes: pts, mediane: med != null ? med * 100 : 0, mediane_label: med != null ? `médiane ${ekFr(med * 100, 1)} %` : "", min: mn, max: nn.max, graduations: grad, fmtAxe: t => ekFr(t, 0) + " %",
      indice: `Chaque point place une entreprise sur l'échelle. À droite du pointillé (zone verte), elle rapporte plus que la ${P.mode === "rivales" ? "rivale" : "société"} du milieu ; à gauche (zone rouge), moins.`, source: f4Src(x, `Comptes ${s.year}`) }) : "",
    explique: causes.length ? ekExplique({ causes, surveiller: f4Prochain(s.id) }) : "",
    suite: "Que fait-elle de ce bénéfice ?" };
}

// Groupe nominal accordé : « Ses ventes sont meilleures », « Sa marge et son bénéfice sont meilleurs », « Son bénéfice est moins bon »
// « a progressé de 12 % » / « a reculé de 3 % » / « est resté stable » / « est devenu une perte »
function f4Evol(r, fem) { if (r == null || !isFinite(r)) return "a changé"; if (Math.abs(r) < 0.005) return fem ? "est restée stable" : "est resté stable"; if (r <= -1) return "est devenu une perte"; return `a ${r > 0 ? "progressé" : "reculé"} de ${ekFr(Math.abs(r) * 100, 0)} %`; }
function f4Groupe(mots, mieux) {
  const G = { ventes: ["sa croissance", "f", "sg"], marge: ["sa marge", "f", "sg"], "bénéfice": ["son bénéfice", "m", "sg"], "rentabilité": ["sa rentabilité", "f", "sg"] };
  const L = mots.map(m => G[m]).filter(Boolean); if (!L.length) return "";
  const pl = L.length > 1 || L[0][2] === "pl", fem = L.every(x => x[1] === "f");
  const noms = L.map(x => x[0]), liste = noms.length > 1 ? noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1] : noms[0];
  const adj = (mieux ? "meilleur" + (fem ? "e" : "") : "moins bon" + (fem ? "ne" : "")) + (pl ? "s" : "");
  return liste[0].toUpperCase() + liste.slice(1) + (pl ? " sont " : " est ") + adj;
}

// ——— Contexte (m/contexte.js, data/contexte.json) : sujets d'actualité qui touchent le secteur (bloc « Son actualité »)
// et événements des années passées sous le graphique de l'étape 1. Rien n'est écrit pour une société : sujets et événements
// sont rattachés par secteur, pays et métier (ctxProfil / ctxCible). 3/11, maquette validée par Romain.
const F4_SENS = { "+": ["Plutôt favorable", "up"], "-": ["Plutôt défavorable", "dn"], "±": ["À double tranchant", "mx"] };
function f4Contexte(x) {
  const { s, c } = x; if (typeof CTX_D === "undefined" || !CTX_D) return;
  try {
    const box = document.getElementById("f4sx"), l = contexteSujets(s, c).slice(0, 3);
    const mois = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const srcN = n => esc(String(n).split(",")[0].split(" : ")[0]);
    if (box && l.length) {
      box.innerHTML = `<span class="ek-stk2">Son secteur</span><h3 class="f4sx-t">Ce qui touche son secteur en ce moment.</h3>
        <div class="f4sx-g">${l.map(({ sj, im }) => { const [lab, cl] = F4_SENS[im.sens] || F4_SENS["±"];
          return `<article class="f4sx-c"><div class="f4sx-top"><span class="f4sx-th">${esc(sj.theme)}</span><span class="f4sx-s ${cl}">${lab}</span></div>
            <h4>${esc(sj.titre)}</h4><p class="f4sx-p"><b>Pour les ${esc(im.qui.charAt(0).toLowerCase() + im.qui.slice(1))}</b> : ${esc(im.mecanisme)}</p>
            <details><summary>Les faits datés, depuis ${esc(mois(sj.depuis))}</summary><ul>${(sj.faits || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
            ${(sj.src || []).length ? `<p class="f4sx-src">Sources : ${sj.src.map(o => o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${srcN(o.nom)}</a>` : srcN(o.nom)).join(" · ")}</p>` : ""}</details></article>`; }).join("")}</div>
        <p class="f4sx-n">Vérifié le ${esc(dLabel(CTX_D.maj))}. Les effets décrits sont possibles, pas certains. <a href="/methode#contexte">Sources et méthode</a></p>`;
      box.hidden = false; box.className = "f4sx";
    }
    const ser = ctxSerie(s, c), e1 = document.querySelector("#e1 .ek-row");
    if (!ser || ser.ys.length < 3 || !e1 || document.querySelector("#e1 .f4cy")) return;
    const R = ctxPhases(ser), P = ctxProfil(s, c), vus = new Set();
    const items = R.phases.map(ph => ({ ph, ev: ctxEvts(P, c, ph).filter(e => !vus.has(e.id) && vus.add(e.id))[0] })).filter(o => o.ev);
    if (!items.length) return;
    const pc = g => (g > 0 ? "+" : "−") + ekFr(Math.abs(g * 100), 1) + " %", an = ys => ys.length > 1 ? ys[0] + "-" + ys[ys.length - 1] : ys[0];
    e1.insertAdjacentHTML("afterend", `<div class="f4cy"><h4>Ce qui se passait autour, année par année.</h4><ul>${items.map(({ ph, ev }) => `<li><div class="f4cy-y"><b>${esc(an(ph.ys))}</b>${ph.gs.map(g => `<span class="${g >= 0 ? "up" : "dn"}">${pc(g)}</span>`).join(" ")}</div>
      <p>${esc(ev.titre)}.</p><details><summary>Le détail</summary><p>${esc(ev.texte)}</p></details></li>`).join("")}</ul>
      <p class="f4cy-n">Variation de ${esc(ser.k === "net" ? "son bénéfice" : "ses ventes")} par rapport à l'année d'avant. Le site montre ce qui s'est passé au même moment ; il ne mesure pas la part de chaque événement.</p></div>`);
  } catch (e) { console.error("fiche v4 contexte", e); }
}

// ——— Après le fil : actualité, preuve, tous les chiffres, questions ———
function f4Fin(x) {
  const { s, c } = x, ev = typeof eventsOf === "function" ? eventsOf(s.id) : [], pass = ev.filter(e => e.date < TODAY).slice(-1), next = ev.filter(e => e.date >= TODAY).slice(0, 3 - pass.length), L = [...pass, ...next];
  const dl = d => new Date(d + "T12:00:00"), cl = c.clos || s.clos || null;
  const nj = d => Math.round((dl(d) - dl(TODAY)) / 864e5), st = d => { const n = nj(d); return n < 0 ? "Publié" : n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : "Dans " + n + " jours"; };
  const ag = L.length ? `<ul class="f4ag">${L.map(e => `<li class="${e.date < TODAY ? "pass" : "fut"}"><span class="f4ag-d"><b>${dl(e.date).getDate()}</b><small>${esc(dl(e.date).toLocaleDateString("fr-FR", { month: "short" }))}</small></span>
      <span class="f4ag-t"><b>${esc(e.label || e.type || "")}</b><small>${esc(dl(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}${e.source ? `<a href="${esc(e.source)}" target="_blank" rel="noopener">${e.date < TODAY ? "Lire la publication" : "Agenda de l'entreprise"} ↗</a>` : ""}</small></span>
      <span class="f4ag-s">${st(e.date)}</span></li>`).join("")}</ul>` : `<p class="ek-note">Aucune date de publication relevée pour l'instant.</p>`;
  const secteur = `<div id="f4sx" hidden></div>`; // rempli par f4Contexte une fois contexte.json chargé
  const fb = typeof fiabilite === "function" ? fiabilite(s, c) : null;
  const tout = f4Tout(x);
  const qs = [s.net != null && s.netPrev > 0 ? `Comment le bénéfice de ${s.name} a-t-il évolué sur l'exercice ${s.year} ?` : `Que fait ${s.name} ?`, x.M.pe != null ? `Pourquoi l'action ${s.name} vaut-elle ${ekFr(x.M.pe, 0)} fois son bénéfice ?` : `Comment ${s.name} gagne-t-elle de l'argent ?`, `Quels sont les principaux risques pour ${s.name} ?`];
  return `<section class="ek-sec" id="actu"><span class="ek-stk2 p">Son actualité</span><h2>Ce qui vient de tomber, ce qui arrive.</h2>${ag}${secteur}
      <p class="ek-note">Tout ce qui est au-dessus porte sur l'exercice ${esc(s.year)}${c.sourceEP ? ", clos" : ", audité et déposé"}. Une publication plus récente n'est reprise qu'une fois relevée.</p>
      ${c.sourceEP ? `<div class="ek-proof"><span class="ek-stk2">Source</span><p>Les chiffres de cette page sont ceux des <b>comptes annuels publiés par ${esc(s.name)}</b>, exercice ${esc(s.year)} compris, fournis par le spécialiste des données financières Eulerpool et contrôlés par ENKLAIR (années complètes, cohérence d'une année à l'autre).</p><a href="https://eulerpool.com" target="_blank" rel="noopener">Data by Eulerpool ↗</a></div>` : x.rap ? `<div class="ek-proof"><span class="ek-stk2">Prouvé</span><p>Les chiffres de cette page viennent du <b>rapport annuel ${esc(s.year)} de ${esc(s.name)}</b>${fb ? `. Fiabilité des données : ${esc(fb.mot)}` : ""}.</p><a href="${esc(x.rap)}" target="_blank" rel="noopener">Ouvrir le rapport ↗</a></div>` : ""}</section>
    <section class="ek-sec" id="tout"><span class="ek-stk2 b">Pour aller plus loin</span><h2>Tous les chiffres, en détail.</h2>
      ${tout}</section>
    <section class="ek-end"><h2>✦ Une question sur ${esc(s.name)} ?</h2><div class="ek-qs">${qs.slice(0, 2).map(q => `<button type="button" data-f4-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="ek-ask" data-f4-ask><input type="text" name="q" maxlength="300" placeholder="Posez votre question sur ${esc(s.name)}…" aria-label="Votre question sur ${esc(s.name)}" autocomplete="off"><button type="submit">Demander</button></form>
      <small>L'IA du site répond avec les chiffres de cette page. Information factuelle, sans conseil.</small></section>`;
}
// « Tous les chiffres » : quatre cartes (résultats, bilan, argent encaissé, actionnaire), puis face aux rivales et depuis la clôture.
// Chaque ligne : le mot (cliquable s'il a une définition), quatre années, la dernière en jaune, la variation sur un an en couleur, la médiane du secteur.
const F4_DEFK = { ca: "ventes", g: "croissance", marge: "marge", net: "benefice", roe: "roe", netDebt: "dette", dps: "dpa", payout: "distrib" };
function f4Tout(x) {
  const { s, c, P } = x; let R; try { R = tblxRows(s, c); } catch (e) { return ""; }
  const Y = c.years, n = Y.length, k0 = Math.max(0, n - 4), yy = Y.slice(k0), G = [["res", "Ses résultats"], ["bil", "Son bilan et sa dette"], ["flx", "L'argent réellement encaissé"], ["act", "Pour l'actionnaire"]];
  const ton = q => q > 0 ? "g" : q < 0 ? "r" : "";
  const carte = ([g, t]) => { const L = R.rows.filter(r => r.grp === g); if (!L.length) return "";
    return `<div class="ek-tc"><h3>${t}</h3><div class="scroll-x"><table class="ek-tt"><thead><tr><th></th>${yy.map((y, i) => `<th${i === yy.length - 1 ? ' class="d"' : ""}>${esc(y)}</th>`).join("")}<th>sur 1 an</th><th>médiane secteur</th></tr></thead><tbody>${L.map(r => {
      const ch = typeof tblxChange === "function" ? tblxChange(r.kind, r.prev, r.last) : "", vm = r.med != null ? tblxVsMed(r) : null, lab = F4_DEFK[r.k] && EK_DEF[F4_DEFK[r.k]] ? ekDefMot(F4_DEFK[r.k], r.label, { nom: s.name }) : esc(r.label);
      return `<tr><th>${lab}<small>${esc(r.unit || "")}</small></th>${yy.map((y, i) => { const v = r.vals[k0 + i]; return `<td${i === yy.length - 1 ? ` class="d${vm ? " " + ton(vm.q) : ""}"` : ""}>${v == null ? '<i class="nr">non relevé</i>' : esc(r.cell(v))}</td>`; }).join("")}<td class="v ${r.li === n - 1 ? ton(r.q) : ""}">${r.li === n - 1 && ch ? esc(ch) : ""}</td><td class="m">${r.med != null ? esc(r.full(r.med)) : ""}</td></tr>`; }).join("")}</tbody></table></div></div>`; };
  // Face aux rivales (celles des graphiques)
  const riv = P.mode === "rivales" ? [{ ...s, moi: 1 }, ...P.L] : [];
  const cols = [["Ventes", r => r.ca != null ? f4Md(r.ca, r.currency) : "–"], ["Croissance", r => { const m = f4M(r); return m.g != null ? f4Pc(m.g, 1, true) : "–"; }], ["Marge", r => { const m = f4M(r); return m.m != null ? f4Pc(m.m, 0) : "–"; }], ["Bénéfice net", r => r.net != null ? f4Md(r.net, r.currency) : "–"], ["PER", r => { const m = f4M(r); return m.pe != null ? ekFr(m.pe, 0) + " fois" : "–"; }], ["Rendement", r => { const m = f4M(r); return m.yld != null ? f4Pc(m.yld, 1) : "–"; }]];
  const ids = riv.map(r => r.id).filter(Boolean);
  const rivH = riv.length ? `<div class="ek-tc ek-tc-l"><h3>Face à ses rivales</h3><div class="scroll-x"><table class="ek-tt ek-tt-r"><thead><tr><th></th>${cols.map(k => `<th>${k[0]}</th>`).join("")}</tr></thead><tbody>${riv.map(r => `<tr${r.moi ? ' class="moi"' : ""}><th><span class="ek-nm">${f4Logo(r, null, 1)}${r.moi || !r.id ? esc(r.name) : `<a href="/entreprise/${esc(r.id)}">${esc(r.name)}</a>`}</span></th>${cols.map(k => `<td>${esc(k[1](r))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${ids.length > 1 ? `<a class="ek-lk" href="/comparer?ids=${ids.slice(0, 4).map(encodeURIComponent).join(",")}">Comparer en détail ↗</a>` : ""}</div>` : "";
  const csv = `<button type="button" class="ek-lk" data-f4-csv>Télécharger tous les chiffres (CSV)${typeof isPrem === "function" && isPrem() ? "" : " · Premium"}</button>`;
  return `<div class="ek-tg">${G.map(carte).join("")}</div>${rivH}<div id="f4-trim"></div><p class="ek-tn">Exercices clos, en ${esc(c.currency || s.currency || "")}. « Médiane secteur » : la valeur du milieu parmi les entreprises du secteur ${esc((secName(s) || "").toLowerCase())}. En vert ou rouge, la dernière année face à cette médiane. ${csv}</p>`;
}
async function f4Trim(x) { // « Depuis la clôture » : trimestres publiés après le dernier exercice (sociétés américaines, SEC)
  const el = document.getElementById("f4-trim"); if (!el) return;
  try {
    const ix = await fetch("/data/trim/index.json").then(r => r.ok ? r.json() : null); if (!ix || !(ix.ids || []).includes(x.s.id)) return;
    const j = await fetch(`/data/trim/${x.s.id}.json`).then(r => r.ok ? r.json() : null); if (!j || !j.q) return;
    const Q = j.q.slice(-4); if (!Q.length) return;
    const d = e => new Date(e + "T12:00:00").toLocaleDateString("fr-FR", { month: "short", year: "numeric" }), m = v => v == null ? "–" : f4Md(v, j.currency || x.s.currency);
    el.innerHTML = `<div class="ek-tc ek-tc-l"><h3>Ses quatre derniers trimestres</h3><div class="scroll-x"><table class="ek-tt"><thead><tr><th>Trimestre clos fin</th>${Q.map((q, i) => `<th${i === Q.length - 1 ? ' class="d"' : ""}>${esc(d(q.end))}</th>`).join("")}</tr></thead><tbody><tr><th>Ventes</th>${Q.map((q, i) => `<td${i === Q.length - 1 ? ' class="d"' : ""}>${esc(m(q.ca))}</td>`).join("")}</tr><tr><th>Bénéfice net</th>${Q.map((q, i) => `<td${i === Q.length - 1 ? ' class="d"' : ""}>${esc(m(q.net))}</td>`).join("")}</tr></tbody></table></div><p class="ek-tn">Comptes trimestriels déposés à la SEC (non audités pour les trimestres 10-Q). <a href="${esc(j.source || "#")}" target="_blank" rel="noopener">Source ↗</a></p></div>`;
  } catch (e) { }
}
function f4Csv(x) {
  let R; try { R = tblxRows(x.s, x.c); } catch (e) { return; }
  const Y = x.c.years, q = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Indicateur", "Unité", ...Y].map(q).join(";"), ...R.rows.map(r => [r.label, r.unit || "", ...r.vals.map(v => v == null ? "" : r.cell(v))].map(q).join(";"))];
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `${x.s.id}-chiffres.csv`; document.body.appendChild(a); a.click(); a.remove();
}
const F4_LIB = { ca: "Ventes (chiffre d'affaires)", ebit: "Résultat d'exploitation", pretax: "Résultat avant impôt", tax: "Impôt sur les résultats", net: "Bénéfice net", eps: "Bénéfice par action", equity: "Capitaux propres", cash: "Trésorerie", debt: "Emprunts", netDebt: "Dette nette (négatif : trésorerie)", leases: "Dettes de loyers", cfo: "Liquidités tirées de l'activité", capex: "Investissements", fcf: "Flux de trésorerie disponible", divPaid: "Dividendes versés", dps: "Dividende par action" };

// Liens « dans le rapport officiel » : ouverts sur la ligne exacte du chiffre quand l'ancre existe (data/ancres.mjs)
function f4Ancres(x) {
  if (typeof ancreLiens !== "function") return;
  const K = x.bk ? { e1: "net", e3: "divPaid" } : { e1: "ca", e2: "ebit", e3: "net", e4: "divPaid" };
  Object.entries(K).forEach(([e, k]) => { const a = document.querySelector(`#${e} .ek-src a`); if (!a) return;
    ancreLiens(x.s.id, [k], x.s.year).then(l => { if (l && l[0] && l[0].url) a.href = l[0].url; }).catch(() => { }); });
}

document.addEventListener("click", e => { // repères de l'en-tête : aller à l'étape, juste sous l'en-tête collant du site
  const r = e.target.closest && e.target.closest("a.ek-rp"); if (!r) return;
  const t = document.getElementById(r.getAttribute("href").slice(1)); if (!t) return;
  e.preventDefault(); e.stopPropagation();
  const bar = document.querySelector(".bar, header"), off = (bar && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().height : 0) + 16;
  scrollTo({ top: t.getBoundingClientRect().top + scrollY - off, behavior: "smooth" });
}, true);
document.addEventListener("submit", e => {
  const f = e.target.closest && e.target.closest("[data-f4-ask]"); if (!f) return; e.preventDefault();
  const q = (f.q.value || "").trim(); if (!q || typeof orcIaOpen !== "function") return;
  orcIaOpen(); if (typeof orcIaAsk === "function") orcIaAsk(q); f.q.value = "";
});
/* 4/11 (Premium) : « Être prévenu ». Ajoute la valeur aux favoris (ce que suit le robot des alertes) et dit ce qui arrivera :
   sans Premium, la valeur est ajoutée aux favoris et le bloc dit que les alertes font partie de Premium. */
async function f4Alerte(k, btn) {
  const box = document.getElementById("f4al"); if (!box) return;
  if (!isFav(k)) { const a = favs().slice(); a.unshift(k); setFavs(a); $$(`[data-fav="${k}"]`).forEach(x => { x.classList.add("on"); x.setAttribute("aria-pressed", "true"); x.textContent = favLbl(k); });
    try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=suivre"); } catch (e) { } }
  box.hidden = false; box.innerHTML = `<p>Un instant…</p>`;
  if (!btn.closest("#f4al") && btn.closest("#f4-annee")) box.scrollIntoView({ behavior: "smooth", block: "center" });
  const m = await moi(), nom = (RBY[k.slice(2)] || {}).name || "cette entreprise";
  const quoi = `une baisse de plus de 5 % dans la journée, ses résultats publiés (avec les chiffres clés), la veille de ses rendez-vous, ses fortes variations du jour, le dernier jour pour toucher un dividende annoncé et ses plus hauts ou plus bas sur un an`;
  // 4/11 (décision de Romain) : les alertes font partie de Premium, sans demi-version gratuite
  if (m.premium) { btn.textContent = "🔔 Vous serez prévenu"; box.innerHTML = `<p><b>C'est noté.</b> Si ${esc(nom)} chute de plus de 5 % dans la journée, vous recevez une notification le soir même, sur votre téléphone si vous les avez activées (<a href="/espace/reglages">Réglages</a>) et dans Mon espace. Aussi : ${quoi.replace(/^une baisse de plus de 5 % dans la journée, /, "")}.</p>`; }
  else box.innerHTML = `<p><b>Si ${esc(nom)} chute de plus de 5 % dans la journée, ENKLAIR vous envoie une notification le soir même.</b> C'est dans Premium, avec ${quoi.replace(/^une baisse de plus de 5 % dans la journée, /, "")}. ${esc(nom)} est déjà dans vos favoris.</p><div class="f4al-a"><a class="ek-btn dk" href="/premium#alertes">Être prévenu avec Premium</a></div>`;
}
document.addEventListener("click", e => {
  const al = e.target.closest && e.target.closest("[data-f4-alerte]"); if (al) { f4Alerte(al.dataset.f4Alerte, al); return; }
  if (e.target.closest && e.target.closest("[data-f4-csv]")) { // 4/11 : l'export fait partie de Premium (« Toutes les données »)
    if (typeof isPrem === "function" && !isPrem()) { if (typeof toast === "function") toast(`L'export des chiffres fait partie de Premium. <a href="/premium#donnees">Voir Premium</a>`); return; }
    if (window.F4X) f4Csv(window.F4X); return; }
  const t = e.target.closest && e.target.closest("[data-f4-tv],[data-f4-ia],[data-f4-q]"); if (!t) return;
  const m = location.pathname.match(/^\/entreprise\/([^/]+)/), s = m && RBY[m[1]];
  if (t.dataset.f4Tv !== undefined && s) { const box = document.getElementById("f4tv"); if (!box) return; box.hidden = !box.hidden;
    if (!box.hidden && !box.dataset.on && typeof tvChart === "function") { box.dataset.on = "1"; box.className = "ek-tvbox"; tvChart(box, s.tv, s.name); }
    t.textContent = box.hidden ? "Voir le graphique du cours ↗" : "Masquer le graphique"; return; }
  if (typeof orcIaOpen !== "function") return;
  orcIaOpen();
  if (t.dataset.f4Q && typeof orcIaAsk === "function") orcIaAsk(t.dataset.f4Q);
});

const e4FrF = () => typeof frSeul === "function" ? frSeul() : true; // PEA : seulement pour un visiteur en France (m/pays.js)
// Branchement : remplace la fiche (toutes les anciennes adresses /comptes, /actualite… ouvrent la même page, sur le bon bloc)
if (F4.on) {
  window.pageCompany = pageCompany4;
  // L'ancienne fiche a pu être lancée au chargement (fiche.js, fiche2.js) avant ce module : sa fin d'affichage ne doit plus rien écrire (lot 3 : modules retirés).
  if (typeof R !== "undefined" && R && R.companies && /^\/entreprise\/[a-z0-9-]+/.test(location.pathname) && typeof route === "function") route();
}

// 5/11 (maquette validée docs/maquettes/fiche-mobile-v1.html) : sur téléphone, la fiche en cartes fermées.
// Rien n'est retiré : chaque carte montre l'essentiel (terme, chiffre, pastille) et s'ouvre au toucher. L'ordinateur ne change pas (CSS sous 760 px).
function f4MPli(box, tete, cacher, ouvert) {
  if (!box || !tete || box.classList.contains("f4m-pl")) return;
  box.classList.add("f4m-pl"); if (ouvert) box.classList.add("f4m-open");
  tete.classList.add("f4m-t"); tete.setAttribute("role", "button"); tete.setAttribute("tabindex", "0");
  if (!tete.querySelector(".f4m-chev")) tete.insertAdjacentHTML("beforeend", `<span class="f4m-chev" aria-hidden="true">⌄</span>`);
  cacher.forEach(e => e && e.classList.add("f4m-x"));
}
function f4Mobile() {
  const pg = document.querySelector("#app .ek-page"); if (!pg || !document.getElementById("fil")) return;
  pg.classList.add("f4m");
  const rps = [...pg.querySelectorAll(".ek-chain .ek-rp")];
  pg.querySelectorAll(".ek-step").forEach((st, i) => {
    const sc = st.querySelector(".ek-sc"); if (!sc || sc.querySelector(".f4m-h")) return;
    const hc = sc.querySelector(".ek-hc"), q = sc.querySelector(".ek-q"), rp = rps[i], cmp = sc.querySelector(".ek-cmp");
    const terme = hc ? hc.textContent.replace(/\?$/, "").trim() : (q ? q.textContent.replace(/^\d+ · /, "") : "");
    const v = rp && rp.querySelector(".ek-v"), sous = rp && rp.querySelector(".ek-s");
    sc.insertAdjacentHTML("afterbegin", `<div class="f4m-h"><span class="f4m-n">${i + 1}</span><div><div class="f4m-te"><em>${esc(terme)}</em>${q ? ` · ${esc(q.textContent.replace(/^\d+ · /, ""))}` : ""}</div>${v ? `<div class="f4m-f"><span class="${v.className.replace("ek-v", "").trim()}">${esc(v.textContent)}</span>${sous ? ` <small>${esc(sous.textContent)}</small>` : ""}</div>` : ""}${cmp ? cmp.outerHTML.replace('class="ek-cmp', 'class="ek-cmp f4m-cmp') : ""}</div></div>`);
    f4MPli(st, sc.querySelector(".f4m-h"), [...sc.children].filter(e => !e.classList.contains("f4m-h")), i === 0);
  });
  // Son métier : l'identité reste, activités et pays au toucher
  const met = pg.querySelector("#metier .ek-metier");
  if (met && met.children.length > 1) {
    const autres = [...met.children].filter(e => !e.classList.contains("ek-facts"));
    const f = met.querySelector(".ek-facts");
    (f || met.firstElementChild).insertAdjacentHTML("afterend", `<div class="f4m-sous"><b>Ses activités, ses pays, comment elle gagne de l'argent</b></div>`);
    f4MPli(met, met.querySelector(".f4m-sous"), autres, false);
  }
  // Tous les chiffres : une carte par tableau
  pg.querySelectorAll("#tout .ek-tc").forEach(tc => { const h = tc.querySelector("h3"); if (h) f4MPli(tc, h, [...tc.children].filter(e => e !== h), false); });
  f4MSecteur();
}
function f4MSecteur() {
  const sx = document.querySelector(".f4m #f4sx"); if (!sx) return;
  const h = sx.querySelector(".f4sx-t"), g = sx.querySelector(".f4sx-g"); if (!h || !g) return;
  const n = g.children.length;
  if (!h.querySelector(".f4m-nb")) h.insertAdjacentHTML("beforeend", `<small class="f4m-nb">${n} sujet${n > 1 ? "s" : ""} en ce moment</small>`);
  f4MPli(sx, h, [...sx.children].filter(e => e !== h && !e.classList.contains("ek-stk2")), false);
}
document.addEventListener("click", ev => {
  const t = ev.target.closest(".f4m .f4m-t"); if (t && !ev.target.closest("a,.ek-hc,[data-ek-def]")) { t.closest(".f4m-pl").classList.toggle("f4m-open"); return; }
  const a = ev.target.closest(".f4m .ek-chain a.ek-rp"); // un repère du bandeau ouvre son étape
  if (a) { const st = document.getElementById(a.getAttribute("href").slice(1)); if (st) st.classList.add("f4m-open"); }
});
document.addEventListener("keydown", ev => { const t = ev.target.closest && ev.target.closest(".f4m .f4m-t"); if (t && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); t.closest(".f4m-pl").classList.toggle("f4m-open"); } });
