/* La découverte de la semaine (4/11/2026, demande de Romain) : chaque semaine, une entreprise de taille petite ou moyenne
   présentée en détail, fonctionnalité du site (page /decouverte, carte sur l'accueil) : identité, métier, verdict, cinq repères face
   à ses rivales, ventes et marge sur plusieurs années, rivales, prochaine date.
   Choix par une règle publique, jamais par la qualité (sinon ce serait une recommandation) : un secteur à tour de rôle,
   puis, dans ce secteur, une entreprise valant entre 300 millions et 10 milliards d'euros en Bourse, aux comptes complets
   et récents, prise à tour de rôle par ordre alphabétique de son identifiant.
   Réutilise les briques de la fiche v4 (f4Ctx, f4Verdict, f4Chaine, f4MetierSec, f4E1, f4E2 de m/fiche4.js).
   L'accueil pose <section id="acc-dec"> ; ce module le remplit. Remplace l'ancienne sélection quotidienne /decouvertes (m/outils.js),
   qui retenait des entreprises « dont les comptes ressortent » : un tri par qualité, trop proche d'une recommandation. */
const DEC_REGLE = "Chaque semaine, un secteur à tour de rôle ; dans ce secteur, une entreprise valant entre 300 millions et 10 milliards d'euros en Bourse, aux comptes complets et récents, prise à tour de rôle par ordre alphabétique. Ce n'est ni un classement ni un conseil : une entreprise à connaître, pas à acheter.";
function decNumero(sem) { const m = String(sem || "").match(/^(\d{4})-W(\d{2})$/); return m ? +m[1] * 53 + +m[2] : 0; }
function decChoix(sem) {
  if (typeof R === "undefined" || !R || !R.companies || typeof f4Valide !== "function") return null;
  const an = +String(sem).slice(0, 4) || new Date().getFullYear();
  const C = R.companies.filter(c => {
    if (c.missing || !f4Valide(c) || (typeof isBank === "function" && isBank(c)) || !c.desc || !(c.year >= an - 1)) return false;
    const v = typeof valo === "function" ? valo(c) : null; return v && v.capE >= 3e8 && v.capE <= 1e10;
  });
  const secs = [...new Set(C.map(c => c.sector))].sort(); if (!secs.length) return null;
  const n = decNumero(sem), sec = secs[n % secs.length], L = C.filter(c => c.sector === sec).sort((a, b) => a.id.localeCompare(b.id));
  return L[Math.floor(n / secs.length) % L.length] || null;
}
const decTaille = e => e >= 2e9 ? "entreprise moyenne" : "petite entreprise";
async function decHTML(sem) {
  const s = decChoix(sem); if (!s) return "";
  const c = FULL[s.id] || await fetch(`/data/societes/${s.id}.json`).then(r => r.ok ? r.json() : null).then(j => j ? (FULL[s.id] = j) : null).catch(() => null);
  if (!c || !c.fin) return "";
  if (typeof ficheWDLoad === "function") await ficheWDLoad(s.id).catch(() => null);
  const x = f4Ctx(s, c), v = valo(s) || {}, wd = typeof ficheWd === "function" ? ficheWd(s.id) : null, an = +TODAY.slice(0, 4);
  const faits = [
    wd && wd.fonde ? ["Créée en", `${wd.fonde} (${an - wd.fonde} ans)`] : null,
    wd && wd.siege ? ["Siège", wd.siege + (wd.pays ? `, ${wd.pays}` : "")] : null,
    wd && wd.effectif ? ["Effectifs", `${F0.format(wd.effectif[0])} personnes`] : null,
    s.ca > 0 ? [`Ventes ${s.year}`, f4Md(s.ca, s.currency)] : null,
    v.capE ? ["Valeur en Bourse", f4Md(v.capE / 1e6, "EUR")] : null
  ].filter(Boolean);
  let fil = "";
  try { const E = [f4E1(x), f4E2(x)]; E.forEach((e, i) => { e.id = "dec" + (i + 1); e.n = i + 1; }); E[E.length - 1].suite = null; /* la question suivante mènerait à une étape absente ici */ fil = ekFil(E); } catch (e) { fil = ""; }
  let chaine = "", verdict = "", metier = "";
  try { verdict = f4Verdict(x); chaine = f4Chaine(x).replace(/href="#e(\d)"/g, `href="/entreprise/${s.id}#e$1"`); metier = f4MetierSec(x).replace(' id="metier"', ""); } catch (e) { }
  const riv = x.P.mode === "rivales" ? x.P.L.slice(0, 6) : [], prochain = typeof f4Prochain === "function" ? f4Prochain(s.id) : "";
  return `<div class="ek dec-in">
    <div class="dec-head">${f4Logo(s, null)}<div><h3>${esc(s.name)}</h3><p>${esc(secName(s))} · ${esc(regName(s) || "")}${v.capE ? ` · ${decTaille(v.capE)}` : ""}</p></div></div>
    <p class="dec-desc">${esc(s.desc)}</p>
    ${faits.length ? `<div class="dec-faits">${faits.map(([k, t]) => `<div><small>${esc(k)}</small><b>${esc(t)}</b></div>`).join("")}</div>` : ""}
    ${verdict}${chaine}
    ${metier}
    ${fil ? `<section class="ek-sec"><span class="ek-stk2">Ses comptes</span><h2>Ses ventes et ce qu'elle en garde, année après année.</h2>${fil}</section>` : ""}
    ${riv.length ? `<p class="dec-riv"><b>Ses rivales sur le site :</b> ${riv.map(r => `<a href="/entreprise/${esc(r.id)}">${esc(r.name)}</a>`).join(", ")}.</p>` : ""}
    ${prochain ? `<p class="dec-riv"><b>À noter :</b> ${esc(prochain)}</p>` : ""}
    <div class="dec-act"><a class="ek-btn dk" href="/entreprise/${esc(s.id)}">Toute la fiche de ${esc(s.name)} →</a>${riv.length >= 2 ? `<a class="ek-btn" href="/comparer?ids=${esc([s.id, ...riv.slice(0, 2).map(r => r.id)].join(","))}">La comparer à ses rivales</a>` : ""}</div>
    <p class="dec-regle">Comment elle est choisie : ${esc(DEC_REGLE)}</p></div>`;
}
function decSemaine(t = Date.now()) { // semaine ISO, « 2026-W45 »
  const d = new Date(t); d.setUTCHours(12, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
  const j1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return `${d.getUTCFullYear()}-W${String(1 + Math.round(((d - j1) / 864e5 - 3 + (j1.getUTCDay() + 6) % 7) / 7)).padStart(2, "0")}`;
}
// Carte de l'accueil : l'essentiel, puis la présentation complète sur /decouverte
function decCarte(s) {
  const v = valo(s) || {}, M = f4M(s), sym = F4_SYM(s.currency).trim();
  const K = [s.ca > 0 ? [`Ventes ${s.year}`, f4Md(s.ca, s.currency), M.g != null ? `${M.g >= 0 ? "+" : "−"}${ekFr(Math.abs(M.g * 100), 1)} % sur un an` : ""] : null,
    M.nm != null ? [M.nm < 0 ? "Perte" : "Bénéfice", `${ekFr(Math.abs(M.nm * 100), 0)} ${sym}`, `${M.nm < 0 ? "perdus" : "gardés"} sur 100 ${sym} de ventes`] : null,
    v.capE ? ["Valeur en Bourse", f4Md(v.capE / 1e6, "EUR"), decTaille(v.capE)] : null].filter(Boolean);
  return `<div class="ek dec-card"><a class="dec-cl" href="/decouverte">
    <div class="dec-head">${f4Logo(s, null)}<div><h3>${esc(s.name)}</h3><p>${esc(secName(s))} · ${esc(regName(s) || "")}</p></div></div>
    <p class="dec-desc">${esc(s.desc)}</p>
    <div class="dec-faits">${K.map(([k, t, d]) => `<div><small>${esc(k)}</small><b>${esc(t)}</b>${d ? `<em>${esc(d)}</em>` : ""}</div>`).join("")}</div>
    <span class="dec-go">Lire sa présentation complète →</span></a></div>`;
}
async function decAccueil(el) {
  if (!el || el.dataset.ok) return; el.dataset.ok = "1";
  try { await (typeof PXP !== "undefined" ? PXP : null); } catch (e) { }
  const s = decChoix(decSemaine()); if (!s || !el.isConnected) { if (el.isConnected) el.remove(); return; }
  el.innerHTML = `<span class="a4-stk a4-ye">La découverte de la semaine</span><h2>Une entreprise à connaître.</h2>${decCarte(s)}
    <p class="a4-plus"><a href="/decouverte">La présentation complète →</a><a href="/decouverte#avant">Les semaines précédentes →</a></p>`;
}
async function pageDecouverte() {
  setTitle("La découverte de la semaine"); if (typeof setNav === "function") setNav("ent");
  app.innerHTML = `<div class="ek ek-page"><div class="empty">Chargement…</div></div>`;
  try { await Promise.all([typeof PXP !== "undefined" ? PXP : null, typeof loadFiches === "function" ? loadFiches() : null]); } catch (e) { }
  const sem = decSemaine(), s = decChoix(sem), h = s ? await decHTML(sem).catch(() => "") : "";
  if (location.pathname !== "/decouverte") return;
  const avant = [1, 2, 3, 4, 5, 6].map(k => decChoix(decSemaine(Date.now() - k * 7 * 864e5))).filter(Boolean);
  app.innerHTML = `<div class="ek ek-page dc4"><section class="ek-hero dc4-hero"><span class="mc-stk">La découverte de la semaine</span>
      <h1 class="ag4-t">${s ? esc(s.name) + "." : "Une entreprise à connaître."}</h1>
      <p class="mc-sub">Chaque semaine, une entreprise moins connue, présentée en détail : ce qu'elle fait, ses comptes face à ses rivales, ce qui l'attend. Pour apprendre à lire une entreprise, pas pour l'acheter.</p></section>
    ${h ? `<section class="ek-sec dc4-pres">${h}</section>` : `<p class="ek-note">La découverte de la semaine n'a pas pu être préparée pour le moment.</p>`}
    ${avant.length ? `<section class="ek-sec" id="avant"><span class="ek-stk2 b">Les semaines précédentes</span><h2>Déjà présentées.</h2><div class="dc4-av">${avant.map(c => `<a href="/entreprise/${esc(c.id)}">${f4Logo(c, null, true)}<span><b>${esc(c.name)}</b><small>${esc(secName(c))} · ${esc(regName(c) || "")}</small></span></a>`).join("")}</div></section>` : ""}</div>`;
}
if (typeof ROUTES_EXTRA !== "undefined") {
  ROUTES_EXTRA.unshift([/^\/decouverte\/?$/, () => pageDecouverte()]);
  ROUTES_EXTRA.unshift([/^\/decouvertes\/?$/, () => { history.replaceState({}, "", "/decouverte"); pageDecouverte(); }]); // ancienne sélection quotidienne
}
// L'accueil est écrit par innerHTML : on remplit la section dès qu'elle apparaît.
(function () {
  const voir = () => document.querySelectorAll("#acc-dec:not([data-ok])").forEach(decAccueil);
  new MutationObserver(voir).observe(document.documentElement, { childList: true, subtree: true });
})();
