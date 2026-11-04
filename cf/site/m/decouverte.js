/* La découverte de la semaine (4/11/2026, demande de Romain) : chaque semaine, une entreprise de taille petite ou moyenne
   présentée en détail dans le rapport de la semaine (et le rapport exemple) : identité, métier, verdict, cinq repères face
   à ses rivales, ventes et marge sur plusieurs années, rivales, prochaine date.
   Choix par une règle publique, jamais par la qualité (sinon ce serait une recommandation) : un secteur à tour de rôle,
   puis, dans ce secteur, une entreprise valant entre 300 millions et 10 milliards d'euros en Bourse, aux comptes complets
   et récents, prise à tour de rôle par ordre alphabétique de son identifiant.
   Réutilise les briques de la fiche v4 (f4Ctx, f4Verdict, f4Chaine, f4MetierSec, f4E1, f4E2 de m/fiche4.js).
   Le rapport pose <section id="syn-dec" data-sem="2026-W45"> ; ce module le remplit. */
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
async function decRemplir(el) {
  if (!el || el.dataset.ok) return; el.dataset.ok = "1";
  try { await Promise.all([typeof PXP !== "undefined" ? PXP : null, typeof loadFiches === "function" ? loadFiches() : null]); } catch (e) { }
  const h = await decHTML(el.dataset.sem).catch(e => { console.error("découverte", e); return ""; });
  if (!el.isConnected) return;
  if (!h) { el.remove(); return; }
  el.innerHTML = `<h2><i>★</i>La découverte de la semaine</h2>${h}`;
}
// Le rapport est écrit par innerHTML à plusieurs endroits : on remplit la section dès qu'elle apparaît.
(function () {
  const voir = () => document.querySelectorAll("#syn-dec:not([data-ok])").forEach(decRemplir);
  new MutationObserver(voir).observe(document.documentElement, { childList: true, subtree: true });
})();
