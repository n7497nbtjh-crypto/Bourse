/* ---------- Actualité v4 (3/11/2026), même direction que Marchés v4 et la liste des ETF ----------
   En-tête jaune : la saison en une phrase (part des entreprises qui vendent plus qu'il y a un an, calculée sur les annonces
   chiffrées), trois grands chiffres, recherche d'entreprise, filtres en un clic (type, zone), bascule annonces / presse.
   Fil par jour : chaque annonce en carte (logo, type en couleur, titre, chiffres clés en pastilles vertes ou rouges,
   « Ce que ça veut dire » replié, lien vers la source officielle). Colonne de droite : les prochaines dates et la presse.
   Données et règles de tri : m/actu.js (actuFil, actuJour, actuType, ACTU_CAT, actuStats), inchangées. Remplace window.pageActus. */
const AX_TYPES = [["imp", "L'essentiel"], ["resultats", "Résultats"], ["dividende", "Dividendes"], ["operation", "Acquisitions, OPA"], ["dirigeants", "Direction"], ["tout", "Tout"]];
const AX_ZONES = [["tout", "Monde"], ["FR", "France"], ["EU", "Europe"], ["US", "États-Unis"], ["MONDE", "Reste du monde"], ["fav", "Mes favoris"]];
function axFig([l, v]) {
  const m = String(v).match(/\(([+−-])\s?(\d+(?:,\d+)?)\s?%/), s = m ? (m[1] === "+" ? "g" : "r") : "", val = String(v).replace(/\s*\([^)]*\)\s*$/, ""), ev = m ? `${m[1] === "+" ? "+" : "−"}${m[2]} % sur un an` : (String(v).match(/\(([^)]*)\)\s*$/) || [])[1] || "";
  return `<div class="ax4-f"><small>${esc(l)}</small><b>${esc(val)}</b>${ev ? `<em class="${s}">${esc(ev)}</em>` : ""}</div>`;
}
// 4/11 : titres publiés en anglais (Oslo, Nasdaq Nordic, FCA) traduits en français par l'IA du site (/api/ia/traduire,
// traduction gardée pour tous et sur l'appareil) ; le titre d'origine reste au survol, avec la mention « traduit de l'anglais ».
const AX_TR = (() => { try { return JSON.parse(localStorage.getItem("bilan.trad") || "{}"); } catch (e) { return {}; } })();
let axTrT = 0;
const AX_DE = { en: "de l'anglais", sv: "du suédois", fi: "du finnois", da: "du danois", no: "du norvégien", de: "de l'allemand", nl: "du néerlandais", it: "de l'italien", es: "de l'espagnol" };
const axNorm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function axTrPoser(el, fr) { const o = el.textContent, lg = AX_DE[el.getAttribute("data-tr")] || "d'une autre langue";
  const h = el.classList.contains("ax4-s") && el.previousElementSibling; // sous-titre traduit identique au titre en français : retiré
  if (h && h.tagName === "H3" && axNorm(h.textContent) === axNorm(fr)) { h.title = "Titre d'origine : " + o; el.outerHTML = `<small class="ax4-tr">Titre traduit ${lg}</small>`; return; }
  el.textContent = fr; el.lang = "fr"; el.removeAttribute("data-tr"); el.title = "Titre d'origine : " + o;
  if (!el.nextElementSibling || !el.nextElementSibling.classList.contains("ax4-tr")) el.insertAdjacentHTML("afterend", `<small class="ax4-tr">Titre traduit ${lg}</small>`); }
async function axTraduire() {
  const L = [...document.querySelectorAll("#app [data-tr]")]; if (!L.length) return;
  L.forEach(el => { const f = AX_TR[el.textContent.trim()]; if (f) axTrPoser(el, f); });
  const reste = [...new Set([...document.querySelectorAll("#app [data-tr]")].map(el => el.textContent.trim()))].slice(0, 30);
  if (!reste.length) return;
  let r = null; try { r = await (await fetch("/api/ia/traduire", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: reste }) })).json(); } catch (e) { }
  if (!r || !Array.isArray(r.fr)) return;
  reste.forEach((t, i) => { if (r.fr[i]) AX_TR[t] = r.fr[i]; });
  try { const k = Object.keys(AX_TR); if (k.length > 600) k.slice(0, k.length - 600).forEach(x => delete AX_TR[x]); localStorage.setItem("bilan.trad", JSON.stringify(AX_TR)); } catch (e) { }
  document.querySelectorAll("#app [data-tr]").forEach(el => { const f = AX_TR[el.textContent.trim()]; if (f) axTrPoser(el, f); else el.removeAttribute("data-tr"); });
}
(() => { const a = document.getElementById("app"); if (!a) return;
  new MutationObserver(() => { if (axTrT) return; axTrT = setTimeout(() => { axTrT = 0; if (document.querySelector("#app [data-tr]")) axTraduire(); }, 250); }).observe(a, { childList: true, subtree: true }); })();
function axCarte(it) {
  const C = ACTU_CAT[it.c] || ACTU_CAT.autre, co = RBY[it.id]; if (!co) return "";
  const gen = !it.tf || /^(Communiqué|Information importante)$/.test(it.tf), main = gen && it.t ? it.t : (it.tf || C.l), sub = !gen && it.t && it.t !== it.tf ? it.t : "";
  const lect = it.x && it.x.c ? `<p>${esc(it.x.c)}</p>${it.x.ch ? `<p><b>Ce que cela change :</b> ${esc(it.x.ch)}</p>` : ""}<small>Rédigé par une IA à partir de l'annonce. La source fait foi.</small>`
    : it.r && it.r.length ? `<ul>${it.r.map(x => `<li>${esc(x)}</li>`).join("")}</ul><small>Calculé par le site à partir des chiffres de l'annonce.</small>` : "";
  const en = it.l && it.l !== "fr" && it.s !== "sec" ? it.l : ""; // titre publié dans une autre langue (les titres SEC sont déjà écrits en français par le site) : traduit par axTraduire (IA du site, une fois pour tous)
  const src = ACTU_SRC[it.s] || "source officielle", lg = it.l && it.l !== "fr" && ACTU_LANG[it.l] ? `, ${ACTU_LANG[it.l]}` : "";
  return `<article class="ax4-c" style="--c:${C.c}"><div class="ax4-h">${mcLogo(co)}<span class="ax4-co"><a href="/entreprise/${esc(co.id)}">${esc(co.name)}</a><small>${esc(secName(co))}${hhmm(it.d) ? " · " + esc(hhmm(it.d)) : ""}</small></span>
      <span class="ax4-t" title="${esc(C.why)}">${esc(C.l)}</span>${it.p ? `<span class="ax4-p" title="Information privilégiée : un fait susceptible d'influencer le cours, que l'entreprise doit publier sans délai">Info. privilégiée</span>` : ""}</div>
    <h3${en && main === it.t ? ` data-tr="${en}" lang="${en}"` : ""}>${esc(main)}</h3>${sub ? `<p class="ax4-s"${en ? ` data-tr="${en}" lang="${en}"` : ""}>${esc(sub)}</p>` : ""}
    ${it.f && it.f.length ? `<div class="ax4-fs">${it.f.slice(0, 4).map(axFig).join("")}</div>` : ""}
    <div class="ax4-b">${lect ? `<details class="ax4-l"><summary>Ce que ça veut dire</summary>${lect}</details>` : it.i >= 2 && !C.routine ? `<button type="button" class="ax4-ia" data-clair="${esc(it.id)}|${esc(it.k)}">✦ Expliquer en clair</button><div class="iabox"></div>` : ""}
      <a class="ax4-src" href="${esc(it.u)}" target="_blank" rel="noopener">Lire l'annonce (${esc(src)}${esc(lg)}) ↗</a></div></article>`;
}
function axFil(items) {
  if (!items.length) return `<p class="ek-note">Aucune annonce pour ce choix sur les derniers jours.</p>`;
  let out = "", last = "";
  for (const it of items) { const k = dayKey(it.d); if (k !== last) { out += `<h3 class="ax4-day">${esc(dayLabel(it.d))}</h3>`; last = k; } out += axCarte(it); }
  return out;
}
let AX4P = []; // titres de presse affichés, pour le bouton « Expliquer » (6/11, Romain)
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-axp]"); if (!b) return; e.preventDefault();
  const a = AX4P[+b.dataset.axp], box = b.nextElementSibling; if (!a || !box) return;
  if (!miaConnectee()) { b.remove(); box.outerHTML = miaInvite(); return; }
  b.disabled = true; b.textContent = "Rédaction en cours…";
  // 9/11 : un article de presse est expliqué comme dans le rapport (synthese.js) : l'IA lit l'article (robots.txt respecté) avec la consigne « presse ».
  // Avant, la consigne des annonces officielles recevait les comptes et le cours de la fiche : l'explication du titre « Huang reconnaît une liaison »
  // parlait des ventes annuelles et disait le cours en hausse alors que le titre annonçait une baisse.
  const co = RBY[a.id]; b.textContent = "Lecture de l'article…"; let art = { texte: "", etat: "illisible" };
  try { if (a.id && a.u) art = await (await fetch(`/api/ia/article?k=${encodeURIComponent("c:" + a.id)}&u=${encodeURIComponent(a.u)}`)).json(); } catch (err) { }
  b.textContent = "Rédaction en cours…";
  let j; try { j = await iaRediger("presse", { entreprise: co ? co.name : a.id, media: String(a.s || "").replace(/^www\./, ""), date: String(a.d || "").slice(0, 10), titre: a.t, texte: art.texte || "" }, { max: 320 }); } catch (err) { j = { error: "L'IA est indisponible pour le moment." }; }
  b.remove();
  const x = j.txt ? jsonFrom(j.txt) : null;
  const note = art.texte ? "Résumé par l'IA d'ENKLAIR à partir de l'article. L'article fait foi." : art.etat === "interdit" ? "Ce média n'autorise pas la lecture automatique de ses articles : résumé à partir du titre seulement. Ouvrez l'article pour le détail." : "L'article n'a pas pu être lu (accès réservé aux abonnés ou page illisible) : résumé à partir du titre seulement.";
  box.outerHTML = x && x.clair ? `<div class="ax-cl"><b>En clair</b><p>${esc(x.clair)}</p>${x.change ? `<b>Ce que cela touche</b><p>${esc(x.change)}</p>` : ""}<small>${note}</small></div>`
    : `<p class="muted">${esc(j.error || "Explication indisponible pour le moment.")}</p>`;
});
function axPresse(P, n) {
  if (!P.length) return `<p class="ek-note">Aucun titre de presse repéré pour ce choix.</p>`;
  AX4P = P.slice(0, n);
  return `<div class="ax4-ps">${AX4P.map((a, i) => { const co = RBY[a.id]; return `<div class="ax4-prw"><a class="ax4-pr" href="${esc(a.u)}" target="_blank" rel="noopener nofollow">${co ? mcLogo(co) : ""}<span><small>${co ? `<b>${esc(co.name)}</b> · ` : ""}${esc(String(a.s || "").replace(/^www\./, ""))}${a.d ? " · " + esc(hhmm(a.d) || dShort(a.d)) : ""}</small><b>${esc(a.t)}</b></span><i>↗</i></a><div class="ax4-prx"><button type="button" class="ax4-ia" data-axp="${i}">✦ Expliquer</button><div></div></div></div>`; }).join("")}</div>`;
}
function axAvenir() {
  const ev = (AG.events || []).filter(e => e.date >= TODAY && RBY[e.id]).sort((a, b) => a.date.localeCompare(b.date) || ((valo(RBY[b.id]) || {}).capE || 0) - ((valo(RBY[a.id]) || {}).capE || 0)).slice(0, 6);
  if (!ev.length) return "";
  const j = d => new Date(d + "T12:00:00");
  return `<div class="ax4-side"><p class="h">À venir</p>${ev.map(e => { const c = RBY[e.id]; return `<a class="ax4-ev" href="/entreprise/${esc(c.id)}"><span class="d"><b>${j(e.date).getDate()}</b><small>${esc(j(e.date).toLocaleDateString("fr-FR", { month: "short" }))}</small></span><span><b>${esc(c.name)}</b><small>${esc(e.label || e.type || "")}</small></span></a>`; }).join("")}<a class="ax4-more" href="/agenda">Tout l'agenda →</a></div>`;
}

function pageActus4() {
  setTitle("Actualité des entreprises"); setNav("news");
  const q = new URLSearchParams(location.search), old = q.get("src");
  const st = { zone: q.get("zone") || (old === "us" ? "US" : old === "fr" || old === "toutes" ? "FR" : "tout"), type: q.get("type") || "imp", sect: q.get("secteur") || "", vue: q.get("vue") || (old === "monde" || old === "une" ? "presse" : "monde"), qq: "", n: 30, jours: 0, th: "" }; // 9/11 : « Le monde » (sujets du rapport de la semaine) par défaut
  if (!AX_ZONES.some(z => z[0] === st.zone)) st.zone = "tout"; if (!AX_TYPES.some(t => t[0] === st.type)) st.type = "imp";
  app.innerHTML = `<div class="ek ek-page ax4-page">
    <section class="ek-hero ax4-hero"><span class="mc-stk">Actualité</span><h1 id="ax4h">Ce que les entreprises annoncent.</h1><p class="mc-sub" id="ax4sub">Les annonces officielles des entreprises suivies, chiffrées et expliquées, et les titres de la presse.</p>
      <div class="ax4-k" id="ax4k"></div>
      <label class="el-q" id="ax4ql"><span aria-hidden="true">🔍</span><input class="el-in" type="search" id="ax4q" placeholder="Une entreprise : LVMH, Apple, Novo Nordisk…" aria-label="Filtrer par entreprise" autocomplete="off"></label>
      <div class="ax4-bar"><div class="ax4-vue" id="ax4vue"><button type="button" data-v="monde">Le monde</button><button type="button" data-v="annonces">Annonces officielles</button><button type="button" data-v="presse">Dans la presse</button></div><a class="ax4-ag" href="/agenda">📅 L'agenda de la semaine →</a></div></section>
    <div class="ax4-cols"><div>
      <div class="el-f ax4-ch" id="ax4type"><span>Type :</span>${AX_TYPES.map(([k, l]) => `<button type="button" data-t="${k}">${l}</button>`).join("")}</div>
      <div class="el-f ax4-ch" id="ax4zone" data-zone><span>Zone :</span>${AX_ZONES.map(([k, l]) => `<button type="button" data-z="${k}">${l}</button>`).join("")}
        <select id="ax4sect" aria-label="Secteur"><option value="">Tous les secteurs</option>${Object.entries(R.sectors).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <div id="ax4feed"><p class="ek-note">Chargement…</p></div><div id="ax4plus"></div></div>
      <aside class="ax4-aside">${axAvenir()}</aside></div>
    <p class="mc-note" id="ax4srcs"></p></div>`;
  $("#ax4sect").value = st.sect;
  let FIL = null, EXTRA = [];
  const fav = () => new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const keep = id => { const c = RBY[id]; if (!c) return false; if (st.zone === "fav" && !fav().has(id)) return false; if (st.zone === "EU" && !(c.region === "EU" || c.region === "FR")) return false; if (/^(FR|US|MONDE)$/.test(st.zone) && c.region !== st.zone) return false; if (st.sect && c.sector !== st.sect) return false; if (st.qq && !ax4Nom(c, st.qq)) return false; return true; };
  const url = () => { const u = new URLSearchParams(); if (st.zone !== "tout") u.set("zone", st.zone); if (st.type !== "imp") u.set("type", st.type); if (st.sect) u.set("secteur", st.sect); if (st.vue !== "monde") u.set("vue", st.vue); try { history.replaceState(history.state, "", "/actualites" + (u.toString() ? "?" + u : "")); } catch (e) { } };
  const annonces = () => [...(FIL.o || []), ...EXTRA].filter(it => keep(it.id) && actuType(it, st.type));
  const tete = () => { // la saison en une phrase, calculée sur toutes les annonces chiffrées (sans les filtres)
    const L = [...(FIL.o || []), ...EXTRA].filter(it => RBY[it.id] && actuImp(it)), T = actuStats(L), pc = T.find(t => /ventes en hausse/.test(t[1])), v = pc ? parseInt(pc[0]) : null;
    $("#ax4h").innerHTML = v != null ? `<span class="${v >= 50 ? "g" : "r"}">${v} %</span> des entreprises vendent plus qu'il y a un an.` : `${F0.format(L.length)} annonces importantes ces derniers jours.`;
    $("#ax4sub").textContent = v != null ? `Parmi les entreprises qui ont publié leurs résultats ces derniers jours : ${pc[2]}.` : "Les annonces officielles des entreprises suivies, chiffrées et expliquées.";
    $("#ax4k").innerHTML = T.filter(t => !/ventes en hausse/.test(t[1])).slice(0, 3).map(([n, l, s]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span><small>${esc(s)}</small></div>`).join("");
  };
  const draw = () => {
    $$("#ax4vue button").forEach(b => b.classList.toggle("on", b.dataset.v === st.vue));
    $$("#ax4type button").forEach(b => b.classList.toggle("on", b.dataset.t === st.type));
    $$("#ax4zone button").forEach(b => b.classList.toggle("on", b.dataset.z === st.zone));
    const mo = st.vue === "monde"; $("#ax4type").hidden = st.vue === "presse" || mo; $("#ax4zone").hidden = mo; $("#ax4ql").hidden = mo; $("#ax4k").hidden = mo; url();
    if (mo) { ax4MondeHero(); const feed = $("#ax4feed"); $("#ax4plus").innerHTML = ""; if (!AXM.data) { feed.innerHTML = `<p class="ek-note">Chargement des sujets de la semaine…</p>`; ax4MondeCharger().then(() => { if (st.vue === "monde") draw(); }); return; } feed.innerHTML = ax4Monde(AXM.data, st.th); return; }
    if (FIL) tete(); if (!FIL) return;
    const feed = $("#ax4feed"), plus = $("#ax4plus");
    if (st.zone === "fav" && !fav().size) { feed.innerHTML = `<p class="ek-note">Vous ne suivez encore aucune entreprise. Ajoutez-en depuis leur fiche avec le bouton « Ajouter aux favoris ».</p>`; plus.innerHTML = ""; return; }
    if (st.vue === "presse") { const P = (FIL.p || []).filter(a => keep(a.id)); feed.innerHTML = axPresse(P, st.n) + `<p class="mc-note">Titres repérés dans des médias reconnus (index ouvert GDELT, BBC News). L'article se lit chez l'éditeur ; le site n'en reprend pas le texte.</p>`; plus.innerHTML = P.length > st.n ? `<button type="button" class="el-more" data-plus>Afficher plus</button>` : ""; return; }
    const A = annonces();
    feed.innerHTML = axFil(A.slice(0, st.n));
    plus.innerHTML = A.length > st.n || st.jours < (FIL.jours || []).length ? `<button type="button" class="el-more" data-plus>Afficher plus</button>` : "";
  };
  const plusAnnonces = async () => {
    if (annonces().length > st.n) { st.n += 30; draw(); return; }
    const have = new Set([...(FIL.o || []), ...EXTRA].map(x => String(x.d).slice(0, 10))), first = [...have].sort()[0];
    const next = (FIL.jours || []).filter(d => !have.has(d) || d < first).slice(0, 3);
    st.jours += 3; st.n += 30;
    for (const d of next) { const L = await actuJour(d); const ks = new Set([...(FIL.o || []), ...EXTRA].map(x => x.k)); EXTRA.push(...L.filter(x => !ks.has(x.k))); }
    EXTRA.sort((a, b) => b.d.localeCompare(a.d)); draw();
  };
  const page = app.querySelector(".ax4-page");
  page.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.v) { st.vue = b.dataset.v; st.n = 30; draw(); }
    else if (b.dataset.th !== undefined) { st.th = b.dataset.th; draw(); }
    else if (b.dataset.t) { st.type = b.dataset.t; st.n = 30; draw(); }
    else if (b.dataset.z) { st.zone = b.dataset.z; st.n = 30; draw(); }
    else if (b.dataset.plus !== undefined) { if (st.vue === "presse") { st.n += 30; draw(); } else plusAnnonces(); }
  });
  $("#ax4sect").onchange = e => { st.sect = e.target.value; st.n = 30; draw(); };
  let tq = null; $("#ax4q").oninput = e => { clearTimeout(tq); tq = setTimeout(() => { st.qq = e.target.value.trim(); st.n = 30; draw(); }, 250); };
  draw();
  actuFil().then(j => {
    if (!document.getElementById("ax4feed")) return;
    FIL = j; if (st.vue !== "monde") tete(); draw();
    const S = j.sources || [];
    $("#ax4srcs").innerHTML = S.length ? `Mis à jour ${j.maj ? `le ${esc(dLabel(j.maj.slice(0, 10)))} à ${esc(hhmm(j.maj))}` : ""}. Sources : ${S.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.nom)}</a>`).join(", ")}. Titres et liens d'origine ; classement, chiffres et explications calculés par le site. Rien ici n'est un conseil d'investissement.` : "";
  });
}

window.pageActus = pageActus4;

/* ---------- « Le monde » (9/11, maquette actualite-sujets-v2 validée) : les sujets du rapport de la semaine, pour tout le monde ----------
   Données : /api/monde (cf/src/espace.mjs, mondePublic : mêmes sujets que le rapport, gardés 3 h). Présentation du rapport (rapport8.js, #r8-monde). */
const AXM = { data: null, p: null };
function ax4MondeCharger() { return AXM.p || (AXM.p = getJSON("/api/monde", { sujets: [] }).then(async j => { AXM.data = j || { sujets: [] }; try { await ax4ChezVous(AXM.data); if (AXM.data.precedente) await ax4ChezVous(AXM.data.precedente); } catch (e) { } return AXM.data; })); }
// « Chez vous » (comme le rapport) : la part du portefeuille du visiteur (enregistré dans son navigateur) touchée par chaque sujet,
// par les secteurs du sujet, sinon par son pays ; actions en direct et contenu des ETF (pf3Look de m/portefeuille.js)
async function ax4ChezVous(M) {
  if (typeof pf2Load !== "function" || typeof pf3Rows !== "function" || typeof pf3Look !== "function") return;
  const P = pf2Load(); if (!P || !(P.l || []).length) return;
  const { rows, T } = pf3Rows(P); if (!(T.tot > 0)) return;
  const X = await pf3Look(rows), nomSec = k => (R.sectors && R.sectors[k]) || k;
  (M.sujets || []).forEach(s => {
    let w = 0, lab = "";
    if ((s.secteurs || []).length) { w = s.secteurs.reduce((a, k) => a + (X.sect[nomSec(k)] || 0) + (nomSec(k) !== k ? X.sect[k] || 0 : 0), 0); lab = s.secteurs.map(nomSec).join(", "); }
    else if ((s.pays || []).length) { w = X.ctry[s.pays[0]] || 0; lab = (typeof COUNTRY !== "undefined" && COUNTRY[s.pays[0]]) || s.pays[0]; }
    if (w >= 0.01) s.chez = { pct: w * 100, eur: w * T.tot, lab };
  });
}
function ax4MondeHero() {
  const M = AXM.data, h = $("#ax4h"), sb = $("#ax4sub"); if (!h) return;
  h.textContent = M && M.semaine_passee ? "Ce qui a fait bouger les marchés la semaine dernière." : "Ce qui a fait bouger les marchés cette semaine.";
  sb.textContent = M && (M.sujets || []).length ? `${F0.format(M.sujets.length)} sujet${M.sujets.length > 1 ? "s" : ""} de la semaine du ${dLabel(M.du)} au ${dLabel(M.au)}${M.precedente ? ", puis ceux de la semaine dernière" : ""}, résumés en deux phrases, avec ce qu'ils ont fait aux cours.` : "Les grands sujets de la semaine, résumés, avec ce qu'ils ont fait aux cours.";
}
const AX4M_COUL = ["#FFB8D9", "#BFD4FF", "#BDEBD2", "#FFE14D"];
function ax4Monde(M, th) {
  const S0 = (M && M.sujets) || [];
  if (!S0.length) return `<p class="ek-note">${esc((M && M.message) || "Les sujets de la semaine ne sont pas encore prêts.")}</p>`;
  const themes = {}; S0.forEach(s => String(s.theme || "").split(/\s*·\s*/).filter(Boolean).forEach(t => themes[t] = (themes[t] || 0) + 1));
  const filt = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const S = th ? S0.filter(s => String(s.theme || "").split(/\s*·\s*/).includes(th)) : S0;
  const pc = v => `<b class="${v > 0 ? "up" : v < 0 ? "dn" : ""}">${O2_p ? O2_p(v, 1) : (v > 0 ? "+" : "") + v + " %"}</b>`;
  const lien = c => c.k && c.k.startsWith("c:") && RBY[c.k.slice(2)] ? `<a href="/entreprise/${esc(c.k.slice(2))}">${esc(c.lab)}</a>` : esc(c.lab);
  const carte = (s, i, grand) => {
    const ch = (s.chiffres || []).filter(c => c.v != null && c.v !== 0), co = ch.filter(c => c.k), fort = co.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
    const src = (s.titres || []).map(t => `<a href="${esc(t.u)}" target="_blank" rel="noopener nofollow">${esc(String(t.s || "").replace(/^www\./, ""))}</a>, ${esc(dShort(t.d))}`).join(" · ");
    return `<article class="ax4m-c${grand ? " g" : ""}"><span class="th" style="background:${AX4M_COUL[i % 4]}">${esc(s.theme || "")}</span><h3>${esc(s.titre)}</h3><p>${esc(s.fait)}</p>
      ${ch.length ? `<div class="ch">${ch.map(c => `<span>${lien(c)} ${pc(c.v)}</span>`).join("")}</div>` : ""}
      ${grand && fort && Math.abs(fort.v) >= 1 ? `<div class="big"><b class="${fort.v > 0 ? "up" : "dn"}">${O2_p(fort.v, 1)}</b><span>pour ${esc(fort.lab)}, ${fort.v < 0 ? "la plus forte baisse" : "la plus forte hausse"} des entreprises citées</span></div>` : ""}
      ${s.chez ? (grand ? `<div class="chez"><small>Chez vous</small><div><b>${O2_p(s.chez.pct, 0, false)}</b><span>de votre argent · ${F0.format(s.chez.eur)} €</span></div><i style="--w:${Math.min(100, s.chez.pct).toFixed(1)}%"></i><small class="m">Par ${esc(s.chez.lab)}, en direct et dans vos ETF.</small></div>` : `<div class="chez p"><b>Chez vous : ${O2_p(s.chez.pct, 0, false)}</b> · ${F0.format(s.chez.eur)} €</div>`) : ""}
      ${src ? `<div class="src">${src}</div>` : ""}</article>`; };
  return `${filt.length > 1 ? `<div class="ax4m-fil"><button type="button" data-th="" class="${th ? "" : "on"}">Tout (${S0.length})</button>${filt.map(([t, n]) => `<button type="button" data-th="${esc(t)}" class="${th === t ? "on" : ""}">${esc(t)} (${n})</button>`).join("")}</div>` : ""}
    <div class="ax4m-g2">${S.slice(0, 2).map((s, i) => carte(s, i, true)).join("")}</div>
    ${S.length > 2 ? `<div class="ax4m-g">${S.slice(2).map((s, i) => carte(s, i + 2, false)).join("")}</div>` : ""}
    ${!th && M.precedente && (M.precedente.sujets || []).length ? `<h2 class="ax4m-h2">La semaine dernière.</h2><p class="ax4m-sub">Du ${esc(dLabel(M.precedente.du))} au ${esc(dLabel(M.precedente.au))}, avec les variations de toute la semaine.</p><div class="ax4m-g">${M.precedente.sujets.map((s, i) => carte(s, i + 1, false)).join("")}</div>` : ""}
    <p class="mc-note">Sujets choisis et résumés par l'IA d'ENKLAIR à partir des titres de médias reconnus${M.jour ? `, relevés le ${esc(dLabel(M.jour))}` : ""} ; variations de la semaine calculées par le site sur les cours de clôture. Les articles font foi. Information, pas un conseil d'investissement.</p>`;
}

// Filtre par nom : début d'un mot du nom ou ticker exact ; si des noms correspondent exactement (« Meta »), on ne garde qu'eux (pas Kennametal ni Jacquet Metals).
function ax4Nom(c, q) {
  const w = norm(q), t = n => " " + norm(n).replace(/[^a-z0-9]+/g, " ") + " ";
  if (!w) return true;
  if (ax4Nom.q !== w) { ax4Nom.q = w; ax4Nom.exact = Object.values(RBY).some(x => t(x.name).includes(" " + w + " ") || norm(x.ticker || "") === w); }
  const n = t(c.name), tk = norm(c.ticker || "") === w;
  return ax4Nom.exact ? n.includes(" " + w + " ") || tk : n.includes(" " + w) || tk;
}
