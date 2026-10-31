/* Module « accueil » de bilan. : la page d'accueil, chargé en dernier (après orchestre.js).
   Redéclare pageHome (elle remplace aussi l'enveloppe de parcours.js, dont le comportement est repris ici :
   aperçu de rapport pour les visiteurs, « Votre semaine en 2 minutes » pour les membres, dans #homeesp).
   Ordre de la page (refonte du 29 octobre 2026, point P1-2 de docs/audit-2026-10.md) :
   identité et question à l'IA → quatre accès directs (analyser une entreprise, comparer des ETF, étudier un
   portefeuille, apprendre les bases) → Le point du jour (faits, interprétations, hypothèses) → Votre suivi (favoris,
   portefeuille, semaine du membre) → Annonces des entreprises → bouton « Voir plus » qui déplie À découvrir,
   Débuter, le rapport de la semaine et Premium. Rien n'est retiré : tout ce qui était sur la page y est encore,
   replié ou regroupé. Le bloc « Des pistes pour vous » a disparu de l'accueil (point P0-6 de l'audit : le site ne
   propose plus de répartition ni de titres adaptés au profil d'une personne).
   Données : /data/contexte.json (sujets vérifiés à la main), /data/actu/fil.json (annonces officielles et presse),
   cours différés (PX), agenda (AG). Rien n'est rédigé par un modèle ici : tout est repris ou calculé, avec la source. */

const ACC = { ctx: null, fil: null, prets: null, ouvert: null };
const ACC_CTX_URL = "/data/contexte.json";
function accCharge() {
  if (ACC.prets) return ACC.prets;
  const ctx = (typeof ctxCharge === "function" ? ctxCharge() : fetch(ACC_CTX_URL).then(r => r.ok ? r.json() : null)).catch(() => null);
  const fil = (typeof actuFil === "function" ? actuFil() : fetch("/data/actu/fil.json").then(r => r.ok ? r.json() : null)).catch(() => null);
  const fi = typeof loadFiches === "function" ? loadFiches().catch(() => null) : null; // les sujets du jour désignent les entreprises concernées d'après leurs textes de fiche
  return ACC.prets = Promise.all([ctx, fil, fi]).then(([c, f]) => { ACC.ctx = c; ACC.fil = f || { o: [], p: [] }; return ACC; });
}
if (location.pathname === "/") accCharge(); // téléchargement lancé pendant que le site charge ses données
const accAttendre = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);

/* ---------- Petits outils ---------- */
const accTag = (k, txt) => `<span class="acc-tag acc-t${k}">${txt}</span>`;
const ACC_TAGS = { f: "Fait", i: "Interprétation", h: "Hypothèse", s: "À surveiller" };
const ACC_SENS = { "+": ["plutôt favorable", "up"], "-": ["plutôt défavorable", "dn"], "±": ["à double tranchant", "mx"] };
const accJour = iso => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
const accJourLong = iso => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso));
const accTaille = c => { try { const v = valo(c); if (v && v.capE) return v.capE; } catch (e) { } const e = typeof eurM === "function" ? eurM(c.ca, c.currency) : c.ca; return e ? e * 1e6 : 0; };
const accPct = v => v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + F2.format(Math.abs(v)) + " %";
const accCls = v => v > 0 ? "up" : v < 0 ? "down" : "";
const accMin = t => /^[A-ZÀÂÉÈÊÎÔÛÇ][a-zàâéèêëîïôûüç' ]/.test(t) && !/^[A-Z][a-z]*[A-Z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
const accPhrase1 = t => { const m = String(t || "").match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(t || "")).trim(); };
const accMoisAn = iso => { const [y, m] = String(iso || "").split("-"); return y && m ? `${MOISL[+m - 1]} ${y}` : ""; };
const accFavIds = () => new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
const accMembre = () => (MOI && MOI.connecte) || (() => { try { return localStorage.getItem("bilan.acc.membre") === "1"; } catch (e) { return false; } })();

/* ---------- Bandeau de confiance, en une ligne ---------- */
function accConfiance() {
  const maj = PXUP && PXUP !== "none" ? (/T\d/.test(PXUP) ? new Date(PXUP).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : dLabel(String(PXUP).slice(0, 10))) : null;
  const it = [["Comptes officiels", "Chiffres tirés des rapports annuels déposés auprès des autorités (ESEF, SEC)."], ["Calculé, pas inventé", "Chaque chiffre est calculé sur les données, avec sa source."], ["Indépendant", "Aucune publicité, aucun produit financier vendu, aucun conseil."], [maj ? `Cours du ${maj}` : "À jour", `${F0.format(R.companies.length)} entreprises et ${ETF.list.length} ETF suivis. Cours différés.`]];
  return `<ul class="acc-trust">${it.map(([t, d]) => `<li><a href="/methode" title="${esc(d)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>${esc(t)}</a></li>`).join("")}</ul>`;
}

/* ====================================================================================
   1. Le point du jour : synthèse de l'actualité économique et financière
   ==================================================================================== */
function accSujets() {
  const S = ((ACC.ctx && ACC.ctx.sujets) || []).filter(s => !s.fin || s.fin >= TODAY), P = (ACC.fil && ACC.fil.p) || [];
  return S.map((s, i) => { let re = null; try { re = s.mots ? new RegExp(s.mots) : null; } catch (e) { }
    const arts = re ? P.filter(a => re.test(" " + norm(String(a.t || "")) + " ")) : [];
    return { s, i, arts }; });
}
// Entreprises suivies visées par un impact (règles de contexte.js) ; limité à une liste donnée pour rester rapide
function accVisees(im, liste) {
  if (typeof ctxProfil !== "function" || typeof ctxCible !== "function") return [];
  const out = [];
  for (const c of liste) { if (!c || c.missing) continue; let ok = false; try { ok = ctxCible(im.cible, ctxProfil(c, FULL[c.id] || null)); } catch (e) { } if (ok) out.push(c); }
  return out;
}
function accProchains(jours = 10) {
  const fin = addDays(TODAY, jours);
  return AG.events.filter(e => e.date >= TODAY && e.date <= fin && RBY[e.id] && !RBY[e.id].missing).sort((a, b) => a.date.localeCompare(b.date) || accTaille(RBY[b.id]) - accTaille(RBY[a.id]));
}
function accSurveiller(sj, evs) { // dates à venir des entreprises que le sujet concerne
  const ids = new Set(), out = [];
  const cos = [...new Set(evs.map(e => e.id))].map(id => RBY[id]);
  for (const im of sj.impacts || []) for (const c of accVisees(im, cos)) ids.add(c.id);
  for (const e of evs) if (ids.has(e.id) && !out.some(x => x.id === e.id)) out.push(e);
  return out.sort((a, b) => accTaille(RBY[b.id]) - accTaille(RBY[a.id])).slice(0, 3).sort((a, b) => a.date.localeCompare(b.date));
}
function accMarchesHTML() {
  const ids = ["cac40", "stoxx50", "sp500", "nasdaq100", "dax"], rows = INDEX_INFO.filter(x => ids.includes(x[0])).map(([id, name]) => ({ id, name, p: PX["i:" + id] })).filter(r => r.p && r.p.chg != null).slice(0, 4);
  let mv = null; try { mv = moversData("all", 1); } catch (e) { }
  const up = mv && mv.up[0], dn = mv && mv.dn[0];
  if (!rows.length && !up) return `<div class="acc-kpi"><p class="acc-kh">${accTag("f", "Fait")} Les marchés</p><p class="muted acc-kv0">Les cours ne sont pas disponibles pour le moment.</p><a class="acc-kl" href="/marches">Tous les marchés →</a></div>`;
  return `<div class="acc-kpi"><p class="acc-kh">${accTag("f", "Fait")} Les marchés aujourd'hui</p>
    <div class="acc-idx">${rows.map(r => `<a href="/indice/${r.id}"><span>${esc(r.name)}</span><b class="${accCls(r.p.chg)}">${accPct(r.p.chg)}</b></a>`).join("")}</div>
    ${up || dn ? `<p class="acc-kx">${up ? `Plus forte hausse : <a href="/entreprise/${up.c.id}">${esc(up.c.name)}</a> <b class="up">${accPct(up.p.chg)}</b>` : ""}${up && dn ? "<br>" : ""}${dn ? `Plus forte baisse : <a href="/entreprise/${dn.c.id}">${esc(dn.c.name)}</a> <b class="down">${accPct(dn.p.chg)}</b>` : ""}</p>` : ""}
    <a class="acc-kl" href="/marches">Tous les marchés →</a></div>`;
}
function accAnnoncesStats() {
  const f = ACC.fil || {}, maj = Date.parse(f.maj || "") || Date.now(), lim = maj - 864e5;
  const L = (f.o || []).filter(it => Date.parse(it.d) >= lim && !(typeof ACTU_CAT !== "undefined" && (ACTU_CAT[it.c] || {}).routine));
  const res = L.filter(x => x.c === "resultats"), g = [];
  for (const x of res) { const v = (x.f || []).find(([l]) => /^(Ventes|Chiffre d'affaires)/.test(l)); const m = v && String(v[1]).match(/\(([+−-])(\d+(?:,\d+)?)\s?%/); if (m) g.push((m[1] === "+" ? 1 : -1) * parseFloat(m[2].replace(",", "."))); }
  return { n: L.length, res: res.length, cos: new Set(res.map(x => x.id)).size, g, up: g.filter(v => v > 0).length, med: g.length ? median(g) : null, maj };
}
function accAnnoncesKpiHTML() {
  const s = accAnnoncesStats();
  if (!s.n) return `<div class="acc-kpi"><p class="acc-kh">${accTag("f", "Fait")} Annonces officielles</p><p class="muted acc-kv0">Aucune annonce importante repérée ces dernières 24 heures.</p><a class="acc-kl" href="/actualites">Toute l'actualité →</a></div>`;
  return `<div class="acc-kpi"><p class="acc-kh">${accTag("f", "Fait")} Annonces officielles, dernières 24 h</p>
    <p class="acc-kv"><b>${F0.format(s.n)}</b><span>annonces officielles (hors déclarations de routine), dont <b>${F0.format(s.res)}</b> résultats</span></p>
    ${s.g.length >= 3 ? `<p class="acc-kx"><b class="${s.up / s.g.length >= 0.5 ? "up" : "down"}">${Math.round(s.up / s.g.length * 100)} %</b> des résultats chiffrés montrent des ventes en hausse sur un an (médiane ${s.med > 0 ? "+" : s.med < 0 ? "−" : ""}${F1.format(Math.abs(s.med))} %, ${s.g.length} annonces).</p>` : ""}
    <a class="acc-kl" href="#acc-annonces" data-acc-scroll="acc-annonces">Les annonces à retenir ↓</a></div>`;
}
function accAgendaKpiHTML(evs) {
  const sem = evs.filter(e => e.date <= addDays(TODAY, 7)), top = [...sem].sort((a, b) => accTaille(RBY[b.id]) - accTaille(RBY[a.id])).slice(0, 3).sort((a, b) => a.date.localeCompare(b.date));
  if (!sem.length) return `<div class="acc-kpi"><p class="acc-kh">${accTag("s", "À surveiller")} Les 7 prochains jours</p><p class="muted acc-kv0">Aucune date renseignée cette semaine.</p><a class="acc-kl" href="/agenda">L'agenda →</a></div>`;
  return `<div class="acc-kpi"><p class="acc-kh">${accTag("s", "À surveiller")} Les 7 prochains jours</p>
    <p class="acc-kv"><b>${F0.format(sem.length)}</b><span>dates annoncées par les entreprises suivies (résultats, dividendes, assemblées)</span></p>
    <ul class="acc-kul">${top.map(e => `<li><a href="/entreprise/${e.id}">${esc(RBY[e.id].name)}</a> <span>${esc(e.type ? e.type.toLowerCase() : e.label)} · ${esc(accJour(e.date))}</span></li>`).join("")}</ul>
    <a class="acc-kl" href="/agenda">L'agenda complet →</a></div>`;
}
function accSujetCarte(x, evs) {
  const s = x.s, imps = s.impacts || [], fait = s.faits && s.faits.length ? s.faits[s.faits.length - 1] : "";
  const hyp = imps.find(i => i.sens === "-") || imps[0];
  const qui = imps.slice(0, 3).map(i => { const [l, c] = ACC_SENS[i.sens] || ACC_SENS["±"]; return `${esc(i.qui.charAt(0).toLowerCase() + i.qui.slice(1))} <em class="acc-s${c}">(${l})</em>`; });
  const surv = accSurveiller(s, evs);
  return `<article class="acc-sj" data-acc-sj="${esc(s.id)}">
    <p class="acc-theme">${esc(s.theme)}${s.depuis ? ` · depuis ${esc(accMoisAn(s.depuis))}` : ""}</p>
    <h4>${esc(s.titre)}</h4>
    ${fait ? `<div class="acc-l acc-lf"><p>${accTag("f", "Fait")}${esc(fait)}</p></div>` : ""}
    ${qui.length ? `<div class="acc-l acc-li"><p>${accTag("i", "Interprétation")}Concerne surtout ${qui.join(", ")}.</p></div>` : ""}
    ${hyp ? `<div class="acc-l acc-lh"><p>${accTag("h", "Hypothèse")}<b>${esc(hyp.qui)}</b> : ${esc(accMin(accPhrase1(hyp.mecanisme)))}</p></div>` : ""}
    ${surv.length ? `<div class="acc-l acc-ls"><p>${accTag("s", "À surveiller")}${surv.map(e => `<a href="/entreprise/${e.id}">${esc(RBY[e.id].name)}</a> : ${esc((e.type || "date").toLowerCase())} le ${esc(accJour(e.date))}`).join(" · ")}</p></div>` : ""}
    <button type="button" class="acc-more" data-acc-open="${esc(s.id)}" aria-expanded="false" aria-controls="acc-det">Approfondir<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
  </article>`;
}
function accPointHTML() {
  const evs = accProchains(10), L = accSujets(), top = L.slice(0, 3), autres = L.slice(3);
  const maj = ACC.ctx && ACC.ctx.maj ? dLabel(ACC.ctx.maj) : null;
  return `<div class="acc-rep">
    <div class="acc-kpis scroll-x">${accMarchesHTML()}${accAnnoncesKpiHTML()}${accAgendaKpiHTML(evs)}</div>
    ${L.length ? `<div class="acc-subh"><h3>Les sujets qui font l'actualité</h3><p class="acc-legend" aria-label="Comment lire cette synthèse">${accTag("f", "Fait")}<span>daté et sourcé</span>${accTag("i", "Interprétation")}<span>lecture du site</span>${accTag("h", "Hypothèse")}<span>effet possible, jamais certain</span></p></div>
    <div class="acc-sjs scroll-x">${top.map(x => accSujetCarte(x, evs)).join("")}</div>
    <div id="acc-det" class="acc-det" hidden></div>
    ${autres.length ? `<div class="acc-autres"><p class="acc-ah">Autres sujets suivis</p><div class="acc-chips scroll-x">${autres.map(x => `<button type="button" class="acc-chip" data-acc-open="${esc(x.s.id)}" aria-expanded="false" aria-controls="acc-det"><small>${esc(x.s.theme)}</small>${esc(x.s.titre)}</button>`).join("")}</div></div>` : ""}` : `<p class="muted" style="margin:14px 0 0">Les sujets d'actualité ne sont pas disponibles pour le moment.</p>`}
    <p class="acc-src">Vérifié le ${esc(maj || "")} · <a class="lnk" href="/methode#contexte">Sources et méthode →</a></p>
  </div>`;
}
function accExemples(v, n = 5) { // exemples pris dans les secteurs qui regroupent l'essentiel des entreprises visées (évite les correspondances de hasard)
  const k = {}; v.forEach(c => k[c.sector] = (k[c.sector] || 0) + 1);
  const ok = new Set(Object.keys(k).filter(x => k[x] >= Math.max(2, v.length * 0.25)));
  return (ok.size ? v.filter(c => ok.has(c.sector)) : v).slice(0, n);
}
function accDetailHTML(id) {
  const x = accSujets().find(y => y.s.id === id); if (!x) return "";
  const s = x.s, cos = R.companies.filter(c => !c.missing);
  const imps = (s.impacts || []).map(im => { const v = accVisees(im, cos).sort((a, b) => accTaille(b) - accTaille(a)), ex = accExemples(v); const [l, c] = ACC_SENS[im.sens] || ACC_SENS["±"];
    return `<li><p><b>${esc(im.qui)}</b> <em class="acc-s${c}">${l}</em></p><p>${esc(im.mecanisme)}</p>
      ${v.length ? `<p class="acc-cos"><span>${F0.format(v.length)} entreprise${v.length > 1 ? "s" : ""} suivie${v.length > 1 ? "s" : ""} concernée${v.length > 1 ? "s" : ""}, dont :</span> ${ex.map(c => `<a href="/entreprise/${c.id}?etape=essentiel#contexte-actu">${logo(c, 20)}${esc(c.name)}</a>`).join("")}</p>` : ""}</li>`; }).join("");
  const arts = x.arts.slice(0, 3);
  return `<div class="acc-deth"><div><p class="acc-theme">${esc(s.theme)}${s.depuis ? ` · depuis le ${esc(dLabel(s.depuis))}` : ""}</p><h4>${esc(s.titre)}</h4></div><button type="button" class="acc-x" data-acc-close aria-label="Refermer">×</button></div>
    <div class="acc-detg">
      <div class="acc-l acc-lf">${accTag("f", "Faits")}<div><ul>${s.faits.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
        <p class="acc-srcs">Sources : ${(s.src || []).map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.nom)}</a>`).join(" · ")}</p>
        ${arts.length ? `<p class="acc-ah" style="margin-top:12px">Dans la presse ces derniers jours</p><ul class="acc-press">${arts.map(a => `<li><a href="${esc(a.u)}" target="_blank" rel="noopener nofollow">${esc(a.t)}</a> <small>${esc(String(a.s || "").replace(/^www\./, ""))}${a.d ? ` · ${dShort(a.d)}` : ""}</small></li>`).join("")}</ul><p class="acc-note">Titres repérés par mots-clés dans les médias suivis par le site.</p>` : ""}</div></div>
      <div class="acc-l acc-lh">${accTag("h", "Hypothèses")}<div><p class="acc-note" style="margin-top:0">Ce que le sujet pourrait changer, secteur par secteur. Mécanismes possibles, pas des prévisions.</p><ul class="acc-imps">${imps}</ul></div></div>
    </div>
    <p class="acc-note">Le site ne mesure pas l'effet exact sur les comptes de chaque entreprise. Sur une fiche, la section « L'actualité qui la concerne » détaille ce qui la touche. Ce n'est pas un conseil d'investissement.</p>`;
}
function accOuvrir(id, btn) {
  const box = $("#acc-det"); if (!box) return;
  const meme = ACC.ouvert === id && !box.hidden;
  $$("[data-acc-open]").forEach(b => { b.setAttribute("aria-expanded", "false"); b.classList.remove("on"); });
  $$(".acc-sj").forEach(c => c.classList.remove("on"));
  if (meme) { box.hidden = true; ACC.ouvert = null; return; }
  ACC.ouvert = id; box.innerHTML = accDetailHTML(id); box.hidden = false;
  $$(`[data-acc-open="${id}"]`).forEach(b => { b.setAttribute("aria-expanded", "true"); b.classList.add("on"); });
  const c = $(`.acc-sj[data-acc-sj="${id}"]`); if (c) c.classList.add("on");
  const r = box.getBoundingClientRect(); if (r.top > innerHeight - 120 || r.top < 60) box.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

/* ====================================================================================
   2. Annonces des entreprises : pleine largeur, résultats chiffrés en premier, dates à venir
   ==================================================================================== */
const ACC_ANN = { f: "une" };
function accFig(l, v) {
  const m = String(v).match(/^(.*?)\s*\(([+−-]\s?[\d.,]+\s?%)([^)]*)\)\s*$/);
  const val = m ? m[1] : v, va = m ? m[2].replace("-", "−") + (m[3] || "") : "";
  return `<div class="acc-fig"><small>${esc(l)}</small><b>${esc(val)}</b>${va ? `<em class="${/^\+/.test(va) ? "up" : "down"}">${esc(va)}</em>` : ""}</div>`;
}
function accAnnTitre(it) {
  const C = (typeof ACTU_CAT !== "undefined" && ACTU_CAT[it.c]) || { l: "Communiqué" }, gen = !it.tf || /^(Communiqué|Information importante)$/.test(it.tf);
  return { C, main: gen && it.t ? it.t : (it.tf || C.l), sub: !gen && it.t && it.t !== it.tf ? it.t : "" };
}
function accAnnCarte(it, fav) {
  const co = RBY[it.id], { C, main, sub } = accAnnTitre(it);
  return `<article class="acc-ann${fav ? " fav" : ""}">
    <div class="acc-annh"><a href="/entreprise/${co.id}/actualite" class="acc-co">${logo(co, 32)}<span><b>${esc(co.name)}</b><small>${esc(secName(co))}${fav ? " · dans vos favoris" : ""}</small></span></a><span class="acc-cat" style="--c:${C.c || "#5F5B55"}">${esc(C.l)}</span></div>
    <h4>${esc(main)}</h4>${sub ? `<p class="acc-ori" lang="${esc(it.l || "en")}">${esc(sub)}</p>` : ""}
    ${it.f && it.f.length ? `<div class="acc-figs">${it.f.slice(0, 3).map(([l, v]) => accFig(l, v)).join("")}</div>` : ""}
    ${it.r && it.r.length ? `<p class="acc-lec">${accTag("i", "Lecture")} ${esc(it.r.slice(0, 2).join(" "))}</p>` : ""}
    <p class="acc-annf"><span>${esc(dayLabel(it.d))}${hhmm(it.d) ? " · " + hhmm(it.d) : ""}${it.p ? ` · <b title="Information privilégiée : un fait susceptible d'influencer le cours, que l'entreprise doit publier sans délai">info. privilégiée</b>` : ""}</span>${typeof actuSrcLink === "function" ? actuSrcLink(it) : `<a class="lnk" href="${esc(it.u)}" target="_blank" rel="noopener">Lire l'annonce</a>`}</p>
  </article>`;
}
function accAnnLigne(it, fav) {
  const co = RBY[it.id], { C, main } = accAnnTitre(it);
  return `<a class="acc-al${fav ? " fav" : ""}" href="/entreprise/${co.id}/actualite">${logo(co, 26)}<span class="acc-alt"><span class="acc-alm"><b>${esc(co.name)}</b><span class="acc-cat" style="--c:${C.c || "#5F5B55"}">${esc(C.l)}</span><small>${esc(dayLabel(it.d))}${hhmm(it.d) ? " · " + hhmm(it.d) : ""}</small></span><span class="acc-alx">${esc(main)}</span></span></a>`;
}
function accUnique(l, cle = x => x.id) { const v = new Set(); return l.filter(x => { const k = cle(x); if (v.has(k)) return false; v.add(k); return true; }); }
function accAnnChoix(f) {
  const fav = accFavIds(), O = ((ACC.fil && ACC.fil.o) || []).filter(it => RBY[it.id] && !(typeof ACTU_CAT !== "undefined" && (ACTU_CAT[it.c] || {}).routine) && it.i >= 1);
  const jours = [...new Set(O.map(it => dayKey(it.d)))].slice(0, 2), recent = O.filter(it => jours.includes(dayKey(it.d)));
  const score = it => (fav.has(it.id) ? 1e15 : 0) + accTaille(RBY[it.id]) + (it.f && it.f.length ? 1e11 : 0);
  const tri = l => [...l].sort((a, b) => score(b) - score(a));
  if (f === "fav") { const m = accUnique(tri(O.filter(it => fav.has(it.id))), x => x.id + x.c); return { une: m.filter(it => it.f && it.f.length).slice(0, 4), autres: m.filter(it => !(it.f && it.f.length)).slice(0, 6), fav }; }
  if (f === "res") { const m = accUnique(tri(recent.filter(it => it.c === "resultats"))); return { une: m.slice(0, 4), autres: m.slice(4, 10), fav }; }
  if (f === "op") { const m = accUnique(tri(O.filter(it => ["operation", "contrat", "dirigeants", "dividende", "emission", "incident", "assemblee"].includes(it.c) && it.i >= 2)), x => x.id + x.c); return { une: [], autres: m.slice(0, 10), fav }; }
  const une = accUnique(tri(recent.filter(it => it.c === "resultats" && it.f && it.f.length))).slice(0, 4), pris = new Set(une.map(x => x.k));
  const vus = new Set(une.map(x => x.id)), autres = accUnique(tri(recent.filter(it => !pris.has(it.k) && it.i >= 2 && it.c !== "resultats")), x => x.id + x.c).slice(0, 6);
  if (autres.length < 6) autres.push(...accUnique(tri(recent.filter(it => !pris.has(it.k) && !vus.has(it.id) && !autres.some(a => a.id === it.id)))).slice(0, 6 - autres.length));
  return { une, autres, fav };
}
function accAnnCorps() {
  const { une, autres, fav } = accAnnChoix(ACC_ANN.f);
  if (!une.length && !autres.length) return `<p class="acc-vide">${ACC_ANN.f === "fav" ? "Aucune annonce récente de vos favoris. Ajoutez des entreprises à vos favoris pour les retrouver ici." : "Aucune annonce pour ce choix ces derniers jours."}</p>`;
  return `${une.length ? `<div class="acc-anns">${une.map(it => accAnnCarte(it, fav.has(it.id))).join("")}</div>` : ""}
    ${autres.length ? `<p class="acc-ah">${une.length ? "Autres annonces importantes" : "Annonces importantes"}</p><div class="acc-als">${autres.map(it => accAnnLigne(it, fav.has(it.id))).join("")}</div>` : ""}`;
}
function accAgendaHTML() {
  const fav = accFavIds(), evs = accProchains(14), jours = [];
  for (const e of evs) { let j = jours.find(x => x.d === e.date); if (!j) jours.push(j = { d: e.date, l: [] }); j.l.push(e); }
  let n = 0; const out = [];
  for (const j of jours) { if (n >= 9) break; const l = j.l.sort((a, b) => (fav.has(b.id) - fav.has(a.id)) || accTaille(RBY[b.id]) - accTaille(RBY[a.id])), k = Math.min(l.length, Math.max(2, 9 - n), 4);
    out.push(`<div class="acc-agj"><p class="acc-agd">${esc(accJourLong(j.d))}</p>${l.slice(0, k).map(e => `<a class="acc-age${fav.has(e.id) ? " fav" : ""}" href="/entreprise/${e.id}/agenda">${logo(RBY[e.id], 22)}<span><b>${esc(RBY[e.id].name)}</b><small>${esc(e.label)}</small></span></a>`).join("")}${l.length > k ? `<a class="acc-agm" href="/agenda">+ ${l.length - k} autre${l.length - k > 1 ? "s" : ""} ce jour-là</a>` : ""}</div>`); n += k; }
  return out.length ? out.join("") : `<p class="acc-vide">Aucune date renseignée dans les deux prochaines semaines.</p>`;
}
function accPresseHTML() {
  const fav = accFavIds(), P = ((ACC.fil && ACC.fil.p) || []).filter(a => a.t && a.u);
  const L = [...P].sort((a, b) => (fav.has(b.id) - fav.has(a.id)) || (b.l === "fr") - (a.l === "fr") || String(b.d).localeCompare(String(a.d))).slice(0, 4);
  return L.length ? `<div class="acc-press2">${L.map(a => `<a href="${esc(a.u)}" target="_blank" rel="noopener nofollow"><span>${esc(a.t)}</span><small>${RBY[a.id] ? esc(RBY[a.id].name) + " · " : ""}${esc(String(a.s || "").replace(/^www\./, ""))}${a.l ? " · " + esc(String(a.l).toUpperCase()) : ""}</small></a>`).join("")}</div>` : `<p class="acc-vide">Aucun article récent repéré.</p>`;
}
function accAnnoncesHTML() {
  const nf = accFavIds().size;
  const tabs = [["une", "À la une"], ["res", "Résultats"], ["op", "Opérations et dividendes"]].concat(nf ? [["fav", "Mes favoris"]] : []);
  return `<div class="acc-annw"><div class="acc-annm panel"><div class="acc-tabs scroll-x" role="tablist" aria-label="Type d'annonce">${tabs.map(([k, l]) => `<button type="button" role="tab" data-acc-ann="${k}" aria-selected="${k === ACC_ANN.f}" class="${k === ACC_ANN.f ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="acc-annb" id="acc-annb">${accAnnCorps()}</div>
      <p class="acc-src" style="margin:0;padding:10px 18px 14px">Annonces officielles déposées auprès des autorités (AMF, SEC, Nasdaq Nordic, Oslo Børs, FCA). Titres traduits et chiffres extraits par le site ; la source fait foi.</p></div>
    <aside class="acc-annside"><section class="panel"><div class="ph"><h3>À venir</h3><a href="/agenda">Agenda</a></div><div class="pb acc-ag">${accAgendaHTML()}</div></section>
      <section class="panel"><div class="ph"><h3>Dans la presse</h3><a href="/actualites?vue=presse">Toute la presse</a></div><div class="pb">${accPresseHTML()}</div></section></aside></div>`;
}

/* ====================================================================================
   3. Pour vous : favoris, portefeuille, semaine du membre
   ==================================================================================== */
function accFavorisHTML() {
  const F = favs().slice(0, 40), O = (ACC.fil && ACC.fil.o) || [];
  const rows = F.map(k => { const id = k.slice(2), e = k.startsWith("e:"), x = e ? ETFBY[id] : RBY[id]; if (!x || x.missing) return null;
    const p = PX[k], ev = e ? null : eventsOf(id).find(v => v.date >= TODAY && v.date <= addDays(TODAY, 30)), an = e ? null : O.find(it => it.id === id && !(typeof ACTU_CAT !== "undefined" && (ACTU_CAT[it.c] || {}).routine));
    return { k, id, e, x, p, ev, an, s: Math.abs(p && p.chg || 0) + (an ? 50 : 0) + (ev ? 20 : 0) }; }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 6);
  if (!rows.length) return "";
  return `<section class="panel acc-fav"><div class="ph"><h3>Vos favoris aujourd'hui</h3><a href="/favoris">Mes favoris</a></div><div class="pb">${rows.map(r => {
    const info = r.an ? `Annonce : ${accAnnTitre(r.an).main}` : r.ev ? `${r.ev.label} le ${accJour(r.ev.date)}` : r.e ? (r.x.index || "ETF") : secName(r.x);
    return `<a class="acc-fr" href="/${r.e ? "etf" : "entreprise"}/${r.id}${r.an ? "/actualite" : ""}">${r.e ? logo({ name: r.x.issuer, domain: typeof issuerDom === "function" ? issuerDom(r.x) : "" }, 26) : logo(r.x, 26)}<span class="acc-frn"><b>${esc(r.x.name)}</b><small>${r.an ? `<i class="acc-dot"></i>` : ""}${esc(info)}</small></span><b class="acc-frv ${accCls(r.p && r.p.chg)}">${r.p && r.p.chg != null ? accPct(r.p.chg) : "–"}</b></a>`; }).join("")}
    <p class="acc-note" style="margin:8px 0 0">Variation du jour, cours différés. Un point signale une annonce officielle récente.</p></div></section>`;
}
function accPortefeuilleHTML() {
  let P = null; try { P = pf2Load(); } catch (e) { }
  if (!P || !P.l || !P.l.length || typeof pf3Rows !== "function") return `<section class="panel acc-pf"><div class="pb"><p class="acc-ah" style="margin-top:0">Votre portefeuille</p><p class="muted" style="margin:4px 0 10px;font-size:13.5px">Saisissez vos lignes ou importez le relevé de votre courtier : valeur, frais, diversification et dividendes, calculés pour vous.</p><a class="btn ghost" href="/portefeuille">Suivre mon portefeuille</a></div></section>`;
  let T = null; try { T = pf3Rows(P).T; } catch (e) { }
  if (!T) return "";
  return `<a class="panel acc-pf acc-pfa" href="/portefeuille"><div class="pb"><p class="acc-ah" style="margin-top:0">Votre portefeuille</p>
    <p class="acc-pfv"><b>${T.tot > 0 ? F0.format(Math.round(T.tot)) + " €" : "–"}</b><span>${F0.format(T.n)} ligne${T.n > 1 ? "s" : ""}</span></p>
    ${T.dayPct != null ? `<p class="acc-pfd">Aujourd'hui : <b class="${accCls(T.day)}">${T.day >= 0 ? "+" : "−"}${F0.format(Math.abs(Math.round(T.day)))} €</b> (${accPct(T.dayPct * 100)})</p>` : ""}
    ${T.gainPct != null ? `<p class="acc-pfd">Plus-value latente : <b class="${accCls(T.gain)}">${accPct(T.gainPct * 100)}</b></p>` : ""}
    <span class="acc-kl">Voir l'analyse →</span></div></a>`;
}
function accPourVousHTML(membre) {
  const fav = accFavorisHTML(), pf = accPortefeuilleHTML();
  if (!membre && !fav) return "";
  return `<section class="acc-sec" id="acc-pourvous">${accH("Votre suivi", membre ? "Vos favoris, votre portefeuille et votre semaine" : "Ce que vous suivez", membre ? ["/espace", "Mon espace"] : ["/favoris", "Mes favoris"])}
    <div class="acc-pv">${membre ? `<div id="homeesp" class="acc-esp"></div>` : ""}<div class="acc-pvg">${fav}${pf}</div></div></section>`;
}

/* ---------- Quatre accès directs : les actions que le visiteur vient faire ----------
   Section 4 du cahier de Romain : « le visiteur doit pouvoir choisir rapidement entre analyser une entreprise,
   comparer des ETF, étudier un portefeuille ou apprendre les bases ». */
const ACC_GO = [
  ["/entreprises", "Analyser une entreprise", "Ses comptes, face à la médiane de son secteur", "M12 20V10M6 20v-6M18 20V4"],
  ["/etf", "Comparer des ETF", "Contenu, frais et éligibilité au PEA", "M4 7h16M4 12h10M4 17h6"],
  ["/portefeuille", "Étudier un portefeuille", "Frais réels, doublons, concentration", "M3 7h18v12H3zM8 7V5h8v2"],
  ["/apprendre", "Apprendre les bases", "Trois niveaux, des cours courts et des quiz", "M4 6l8-3 8 3-8 3zM4 6v7c0 2 4 4 8 4s8-2 8-4V6"],
];
function accGoHTML() {
  return `<nav class="acc-go" aria-label="Accès rapides">${ACC_GO.map(([h, t, d, p]) => `<a href="${h}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg><span><b>${t}</b><small>${d}</small></span></a>`).join("")}</nav>`;
}

/* ====================================================================================
   4. La page
   ==================================================================================== */
const accH = (kick, titre, lien, id) => `<div class="acc-h"><div><p class="kick">${kick}</p><h2${id ? ` id="${id}"` : ""}>${titre}</h2></div>${lien ? `<a class="more" href="${lien[0]}">${lien[1]} →</a>` : ""}</div>`;
function accDateline(date) { // ligne de une : la date et quatre indices, comme la manchette d'un journal
  const ids = ["cac40", "stoxx50", "sp500", "dax"], rows = INDEX_INFO.filter(x => ids.includes(x[0])).map(([id, name]) => ({ id, name, p: PX["i:" + id] })).filter(r => r.p && r.p.chg != null);
  return `<div class="acc-date"><span class="acc-dd">${esc(date)}</span>${rows.length ? `<span class="acc-didx">${rows.map(r => `<a href="/indice/${r.id}">${esc(r.name)} <b class="${accCls(r.p.chg)}">${accPct(r.p.chg)}</b></a>`).join("")}<a class="acc-dall" href="/marches">Tous les marchés →</a></span>` : ""}</div>`;
}
function accMarchesHTML() { // 31/10 (Romain) : les marchés du jour en grand, avec les plus fortes hausses et baisses parmi les grandes entreprises
  const ids = ["cac40", "stoxx50", "sp500", "nasdaq", "dax"], rows = INDEX_INFO.filter(x => ids.includes(x[0])).map(([id, name]) => ({ id, name, p: PX["i:" + id] })).filter(r => r.p && r.p.chg != null).slice(0, 4);
  const grands = R.companies.filter(c => !c.missing && accTaille(c) >= 5e9).map(c => ({ c, p: pxOf(c) })).filter(x => x.p && x.p.chg != null && Math.abs(x.p.chg) < 40).sort((a, b) => b.p.chg - a.p.chg);
  const ligne = x => `<a class="acc-mv" href="/entreprise/${x.c.id}">${logo(x.c, 24)}<span class="acc-mvt"><b>${esc(x.c.name)}</b><small>${esc(secName(x.c))}</small></span><b class="acc-mvv ${accCls(x.p.chg)}">${accPct(x.p.chg)}</b></a>`;
  const hs = grands.slice(0, 5), bs = grands.slice(-5).reverse();
  return `<div class="acc-mk">${rows.length ? `<div class="acc-idx2">${rows.map(r => `<a href="/indice/${r.id}" class="acc-idc"><small>${esc(r.name)}</small><b class="${accCls(r.p.chg)}">${accPct(r.p.chg)}</b><span>${F0.format(r.p.p)} pts</span></a>`).join("")}</div>` : ""}
    ${hs.length ? `<div class="acc-mvs"><div><p class="acc-ah">Plus fortes hausses du jour</p>${hs.map(ligne).join("")}</div><div><p class="acc-ah">Plus fortes baisses du jour</p>${bs.map(ligne).join("")}</div></div><p class="acc-note">Parmi les entreprises de plus de 5 milliards d'euros suivies par le site, cours différés. Une variation d'un jour ne dit rien de la qualité d'une entreprise.</p>` : ""}</div>`;
}
async function accRapportPanneau() { // le rapport en exemple dans un panneau latéral, sans quitter l'accueil
  let pane = $("#acc-pane");
  if (!pane) { document.body.insertAdjacentHTML("beforeend", `<div id="acc-pane" class="acc-pane" role="dialog" aria-modal="true" aria-label="Un rapport de la semaine en exemple"><div class="acc-panev" data-acc-pane-close></div><div class="acc-panec"><div class="acc-paneh"><b>Le rapport de la semaine, en exemple</b><button type="button" class="acc-panex" data-acc-pane-close aria-label="Fermer">✕</button></div><div class="acc-paneb"><div class="empty">Calcul du rapport de cette semaine…</div></div></div></div>`); pane = $("#acc-pane");
    pane.addEventListener("click", e => { if (e.target.closest("[data-acc-pane-close]")) accRapportFermer(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && pane.classList.contains("on")) accRapportFermer(); }); }
  pane.classList.add("on"); document.documentElement.classList.add("acc-pane-on");
  const body = $(".acc-paneb", pane); if (body.dataset.pret) return;
  let b = null; try { const r = await fetch("/api/rapport-exemple"); b = r.ok ? await r.json() : null; } catch (e) { }
  if (!b || typeof synPageHTML !== "function") { body.innerHTML = `<p class="muted">Le rapport exemple n'a pas pu être calculé pour le moment. <a class="lnk" href="/rapport-exemple">Ouvrir la page</a></p>`; return; }
  await Promise.all([typeof acaLoad === "function" ? acaLoad() : null, typeof synContexte === "function" ? synContexte() : null, typeof loadFiches === "function" ? loadFiches() : null]);
  b = typeof synNormalise === "function" ? synNormalise(b) : b;
  body.innerHTML = `<p class="acc-sub">Calculé aujourd'hui pour un profil d'exemple (quatre favoris, un petit portefeuille PEA, deux secteurs). Le vôtre suit vos propres titres.</p><div id="synex">${synPageHTML(b, { premium: false })}</div><p style="margin:18px 0 0;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="btn" href="/espace">Créer mon rapport</a><a class="lnk" href="/rapport-exemple">Voir en pleine page</a></p>`;
  body.dataset.pret = "1"; if (typeof synIA === "function") synIA(b, document.getElementById("syn4-ia"), false);
}
function accRapportFermer() { const p = $("#acc-pane"); if (p) p.classList.remove("on"); document.documentElement.classList.remove("acc-pane-on"); }
function accCompteHTML(membre) { // 31/10 : pourquoi créer un espace, et le rapport en exemple ouvert dans un panneau
  if (membre) return "";
  return `<section class="acc-sec acc-cpt" id="acc-compte"><div class="acc-h3"><h2>Un espace gratuit, et le site travaille pour vous</h2></div>
    <div class="acc-cptg"><ul class="acc-cptl">
      <li><b>Vos favoris et votre portefeuille</b><span>Vos valeurs suivies en un clic, leur performance, leur répartition par secteur.</span></li>
      <li><b>Un rapport chaque semaine</b><span>Ce que vos entreprises ont publié, leurs cours, leurs dates à venir, les points d'attention.</span></li>
      <li><b>Un agenda rien qu'à vous</b><span>Résultats et dividendes de vos valeurs, portefeuille d'abord, favoris ensuite.</span></li>
      <li><b>Sans adresse revendue, sans conseil</b><span>Un e-mail, un mot de passe. Vous partez quand vous voulez.</span></li></ul>
      <div class="acc-cpta"><a class="btn" href="/espace">Créer mon espace</a><button type="button" class="acc-cptx" data-acc-rapport>Voir un rapport en exemple →</button></div></div></section>`;
}
const ACC_VOIES = [
  ["/apprendre", "Découvrir", "Trois choses avant d'investir, puis l'Académie."],
  ["/entreprises", "Explorer", "2 852 entreprises et 1 134 ETF, chacun face à son secteur."],
  ["/outils", "Analyser", "Comparer, simuler, vérifier : les outils."],
  ["/rapport-exemple", "Mon espace", "Vos favoris et, chaque semaine, un rapport sur vos titres."],
];
function accVoiesHTML() {
  return `<ol class="acc-voies" aria-label="Quatre entrées">${ACC_VOIES.map(([h, t, d], i) => `<li><a href="${h}"><span class="acc-vn">0${i + 1}</span><span class="acc-vt"><b>${t}</b><span>${d}</span></span><span class="acc-va" aria-hidden="true">→</span></a></li>`).join("")}</ol>`;
}
const ACC_EX_TOUS = [["lvmh", "LVMH"], ["totalenergies", "TotalEnergies"], ["apple", "Apple"], ["loreal", "L'Oréal"], ["microsoft", "Microsoft"], ["asml", "ASML"], ["sanofi", "Sanofi"], ["hermes", "Hermès"], ["alphabet", "Alphabet"], ["danone", "Danone"], ["airbus", "Airbus"], ["novo-nordisk", "Novo Nordisk"], ["amazon", "Amazon"], ["michelin", "Michelin"], ["bnp-paribas", "BNP Paribas"]];
const ACC_EX = (() => { // 31/10 (Romain) : l'exemple de l'accueil change chaque jour ; trois entreprises connues, tirées de la liste selon la date
  const j = Math.floor(Date.now() / 864e5), n = ACC_EX_TOUS.length, out = [];
  for (let i = 0; i < 3; i++) out.push(ACC_EX_TOUS[(j * 7 + i * 5) % n]);
  return out;
})();
function accCarteHTML(c) { // une fiche en carte : logo, cours du jour, points forts et à surveiller, sans texte
  const p = typeof pxOf === "function" ? pxOf(c) : PX["c:" + c.id], t = typeof rfTally === "function" ? rfTally(c, { ...c, cagr: null }) : null; // cours et devise de cotation (pxOf), points comptés comme sur la fiche (rfTally)
  return `<a class="acc-card" href="/entreprise/${c.id}">${logo(c, 36)}<span class="acc-cn"><b>${esc(c.name)}</b><small>${esc(secName(c))}</small></span>
    ${p && p.p != null ? `<span class="acc-cp"><b>${pxFmt(p.p, p.cur)}</b>${p.chg != null ? `<small class="${accCls(p.chg)}">${accPct(p.chg)}</small>` : ""}</span>` : ""}
    ${t ? `<span class="acc-ct"><i class="f">${t.fort}</i><i class="m">${t.moyen}</i><i class="v">${t.vig}</i><small>points forts · moyens · à surveiller</small></span>` : ""}</a>`;
}

// 30/10 (retour de Romain) : la page d'accueil s'organise par besoin, pas par rubrique ; chaque besoin mène droit à l'outil
const ACC_BESOINS = [
  ["Comprendre une entreprise", "Son métier, ses comptes, son verdict en trois mots.", "/entreprises"],
  ["Savoir si son prix est élevé", "Son PER face à la médiane du secteur, et ses concurrents côte à côte.", "/comparer"],
  ["Choisir un ETF", "Frais, éligibilité au PEA, ce qu'il contient vraiment.", "/etf"],
  ["Comprendre mon portefeuille", "Concentration, chevauchements entre ETF, frais cumulés.", "/portefeuille"],
  ["Suivre mes investissements", "Vos favoris et, chaque semaine, un rapport sur vos titres.", "/rapport-exemple"],
  ["Apprendre", "L'Académie : des leçons courtes, un exemple chiffré pour chacune.", "/academie"],
];
function accBesoinsHTML() {
  return `<section class="acc-sec acc-bes"><p class="acc-vh">Que voulez-vous faire ?</p><ul class="acc-besl">${ACC_BESOINS.map(([t, d, h]) => `<li><a href="${h}"><b>${t}</b><span>${d}</span><i aria-hidden="true">→</i></a></li>`).join("")}</ul></section>`;
}
function accExempleHTML(s, c) { // un vrai résultat du site, tel qu'il apparaît sur la fiche : verdict, trois jauges face au secteur
  const f = figuresOf(c), m = ratios(f), v = valo(s), md = MED[s.sector] || {}, mp = MEDPE[s.sector], bank = isBank(s);
  const vc = rfVerdictCourt(s, c);
  const row = (l, val, med, g) => g ? `<div class="acc-exr"><span class="acc-exk">${l}</span><b>${val}</b><small>médiane du secteur : ${med}</small>${g}</div>` : "";
  const lev = v2 => `${F1.format(v2)} an${v2 >= 2 ? "s" : ""} de résultat`;
  return `<a class="acc-ex" href="/entreprise/${s.id}"><span class="acc-exh">${logo(s, 34)}<span><b>${esc(s.name)}</b><small>${esc(secName(s))} · comptes ${esc(String(s.year))}, document officiel</small></span></span>
    ${vc ? `<p class="rf-vc acc-exv">${esc(vc)}</p>` : ""}
    ${!bank && m.marge != null ? row("Marge d'exploitation", pct(m.marge, 0, false), md.marge != null ? pct(md.marge, 0, false) : "–", rf6Jauge(s, "marge", false, m.marge)) : ""}
    ${!bank && m.lev != null && m.lev >= 0 ? row("Dette nette", lev(m.lev), md.lev != null ? lev(md.lev) : "–", rf6Jauge(s, "lev", true, m.lev)) : ""}
    ${v && v.pe ? row("Prix payé (PER)", `${F0.format(v.pe)} fois le résultat`, mp ? `${F0.format(mp)} fois` : "–", rf6Jauge(s, "pe", true, v.pe)) : ""}
    <span class="acc-exf">Voir la fiche complète →</span></a>`;
}
async function accMinis() { // 2.5 : sous la recherche, trois fiches en petit (logo, nom, verdict en trois mots), chargées sur leurs comptes
  const box = $("#acc-minis"); if (!box) return;
  const ids = ACC_EX.map(([id]) => id).filter(id => RBY[id] && !RBY[id].missing);
  const out = await Promise.all(ids.map(async id => { const s = RBY[id]; let c = FULL[id]; if (!c) { try { c = FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json(); } catch (e) { return ""; } }
    const vc = typeof rfVerdictCourt === "function" ? rfVerdictCourt(s, c) : ""; return vc ? `<a class="acc-mini" href="/entreprise/${id}">${logo(s, 28)}<span><b>${esc(s.name)}</b><small>${esc(vc)}</small></span></a>` : ""; }));
  if ($("#acc-minis")) $("#acc-minis").innerHTML = out.join("");
}
async function accExemple(id) { // charge les comptes de l'exemple et remplace l'attente
  const box = $("#acc-exb"), s = RBY[id]; if (!box || !s) return;
  try { const c = FULL[id] || (FULL[id] = await (await fetch(`/data/societes/${id}.json`)).json()); const h = accExempleHTML(s, c); if (h && $("#acc-exb")) $("#acc-exb").innerHTML = h; } catch (e) { }
}
/* ---------- Lot 3 (30/10, prompt de refonte) : l'accueil en quatre écrans de téléphone ----------
   Ordre exact : bandeau marchés · accroche + LA recherche + une ligne · la carte LVMH (trois jauges) · ce que les entreprises
   ont publié (4 cartes, sans onglets) · cette semaine (3 dates) · le rapport de la semaine (1 bloc, 1 bouton).
   Retiré de l'accueil (toujours sur sa page) : les trois promesses, « Que voulez-vous faire ? », le point du jour, les sujets,
   « D'où viennent les chiffres », « Voir aussi ». */
function accPubCarte(it) { // une annonce : entreprise, chiffre clé avec sa flèche, une ligne de lecture
  const co = RBY[it.id], f = (it.f || [])[0], { main } = accAnnTitre(it);
  let val = "", va = "", l = "";
  if (f) { const m = String(f[1]).match(/^(.*?)\s*\(([+−-]\s?[\d.,]+\s?%)([^)]*)\)\s*$/); val = m ? m[1] : f[1]; va = m ? m[2].replace("-", "−") : (/^[+−-]\s?[\d.,]+\s?%/.test(String(f[1])) ? String(f[1]) : ""); l = f[0]; }
  const fl = va ? `<em class="acc-pubfl ${/^\+/.test(va) ? "up" : "down"}">${/^\+/.test(va) ? "↑" : "↓"} ${esc(va)}</em>` : "";
  return `<a class="acc-pub" href="/entreprise/${co.id}?etape=change"><span class="acc-pubh">${logo(co, 28)}<b>${esc(co.name)}</b><small>${esc(dayLabel(it.d))}</small></span>
    ${f ? `<span class="acc-pubf"><small>${esc(l)}</small><b>${esc(val)}</b>${fl}</span>` : `<span class="acc-pubt">${esc(main)}</span>`}
    ${it.r && it.r.length ? `<span class="acc-publ"><i>Lecture</i> ${esc(it.r[0])}</span>` : f ? `<span class="acc-publ">${esc(main)}</span>` : ""}</a>`;
}
function accPubHTML() {
  const ch = accAnnChoix("une"); let L = ch.une.slice(0, 10); // 31/10 (Romain) : un bandeau qui glisse, les plus grandes entreprises d'abord
  if (L.length < 10) L = accUnique([...L, ...accAnnChoix("res").une, ...accAnnChoix("res").autres, ...ch.autres]).slice(0, 10);
  L.sort((a, b) => accTaille(RBY[b.id]) - accTaille(RBY[a.id]));
  return L.length ? `<div class="acc-pubs scroll-x" tabindex="0" aria-label="Annonces récentes, faites glisser">${L.map(accPubCarte).join("")}</div>` : `<p class="acc-vide">Aucune annonce chiffrée ces derniers jours.</p>`;
}
function accSemaineHTML() { // 31/10 : les sept prochains jours, six dates au plus, favoris puis grandes entreprises
  const fav = accFavIds(), evs = accProchains(7).sort((a, b) => (fav.has(b.id) - fav.has(a.id)) || accTaille(RBY[b.id]) - accTaille(RBY[a.id])).slice(0, 6).sort((a, b) => a.date.localeCompare(b.date));
  return evs.length ? `<ul class="acc-sem">${evs.map(e => `<li><b>${esc(accJourLong(e.date))}</b><a href="/entreprise/${e.id}?etape=change">${esc(RBY[e.id].name)}</a><span>${esc(e.label)}</span></li>`).join("")}</ul>` : `<p class="acc-vide">Aucune date annoncée dans les deux prochaines semaines.</p>`;
}
async function pageHome() {
  setTitle(""); setNav("home");
  document.documentElement.classList.add("acc-home");
  if (!$(".acc", app)) app.innerHTML = `<div class="acc"><section class="acc-une3"><h1>Comprenez une entreprise en 10 secondes.</h1></section></div>`; // affichage immédiat, même titre
  await Promise.all([PXP, loadAna()]);
  await accAttendre(accCharge(), 300);
  if (location.pathname !== "/") return;
  const membre = accMembre(), prem = typeof isPrem === "function" && isPrem(), pret = !!ACC.fil;
  ACC.secs = Object.entries(R.sectors).map(([k, name]) => ({ k, name, n: R.companies.filter(c => c.sector === k).length })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 12);
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date());
  app.innerHTML = `<div class="acc acc3">
    <div class="acc-date"><span class="acc-dd">${esc(date)}</span></div>
    <div class="acc-top"><section class="acc-une3">
      <h1>Comprenez une entreprise en 10 secondes.</h1>
      <div class="search big acc-search" data-search><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Apple, LVMH, MSCI World…" aria-label="Rechercher une entreprise ou un ETF" autocomplete="off"><div class="results"></div></div>
      <p class="acc-l1">${F0.format(R.companies.length)} entreprises · ${F0.format(ETF.list.length)} ETF · sans conseil</p>
      <div class="acc-minis" id="acc-minis" aria-label="Trois fiches en exemple"></div>
    </section>
    <section class="acc-demo"><p class="acc-vh">Ce que vous obtenez, pour chaque entreprise</p><div id="acc-exb" class="acc-exw"><p class="rf-no">Chargement de l'exemple…</p></div></section></div>
    <section class="acc-sec" id="acc-pub"><div class="acc-h3"><h2>Ce que les entreprises ont publié</h2><a class="lnk" href="/actualites">Toutes les annonces →</a></div>
      <div id="acc-pubw">${pret ? accPubHTML() : `<div class="acc-pubs acc-wait"><div class="acc-pub"></div><div class="acc-pub"></div><div class="acc-pub"></div><div class="acc-pub"></div></div>`}</div></section>
    <section class="acc-sec" id="acc-marches"><div class="acc-h3"><h2>Les marchés aujourd'hui</h2><a class="lnk" href="/marches">Tous les marchés →</a></div>${accMarchesHTML()}</section>
    <section class="acc-sec" id="acc-sem"><div class="acc-h3"><h2>À l'agenda ces 7 prochains jours</h2><a class="lnk" href="/agenda">Tout l'agenda →</a></div><p class="acc-sub">Résultats et dividendes attendus, vos favoris d'abord puis les plus grandes entreprises.</p><div id="acc-semw">${pret ? accSemaineHTML() : ""}</div></section>
    <section class="acc-sec" id="acc-decouvrir"><div class="acc-h3"><h2>À découvrir aujourd'hui</h2><a class="lnk" href="/decouvertes">Toutes les découvertes →</a></div><p class="acc-sub">Des entreprises moins connues, petites et moyennes, dont les comptes ressortent face à leur secteur. Une sélection qui change chaque jour.</p>${typeof outilsDecouverteHTML === "function" ? outilsDecouverteHTML(3) : ""}
      <div class="acc-explo"><p class="acc-ah">Explorer par secteur</p><div class="acc-secs scroll-x">${(ACC.secs || []).map(x => `<a href="/entreprises?secteur=${x.k}">${esc(x.name)} <small>${x.n}</small></a>`).join("")}</div></div></section>
    ${accCompteHTML(membre)}
    ${membre ? `<section class="acc-rap3"><div><p class="acc-vh">Chaque semaine</p><h2>Votre rapport de la semaine</h2><p>Ce que vos entreprises ont publié, leurs cours, leurs dates à venir, dans un seul courrier.</p></div><a class="btn" href="/espace">Mon rapport</a></section>` : ""}
  </div>`;
  ACC.prem = prem;
  accLier(membre);
  accExemple(ACC_EX[0][0]); accMinis();
  if (typeof bindSearch === "function") { try { bindSearch(app); } catch (e) { } }
  if (!pret) accCharge().then(() => { if (location.pathname !== "/") return; const a = $("#acc-pubw"), b = $("#acc-semw"); if (a) a.innerHTML = accPubHTML(); if (b) b.innerHTML = accSemaineHTML(); });
  moi().then(m => {
    if (location.pathname !== "/") return;
    try { localStorage.setItem("bilan.acc.membre", m.connecte ? "1" : "0"); } catch (e) { }
    if (!!m.connecte !== membre) return pageHome();
  });
}
(() => { // la barre de recherche du menu est masquée sur l'accueil (une seule barre visible) ; la classe suit la navigation
  const r0 = window.route; if (typeof r0 !== "function") return;
  window.route = function () { document.documentElement.classList.toggle("acc-home", location.pathname === "/"); return r0.apply(this, arguments); };
  document.documentElement.classList.toggle("acc-home", location.pathname === "/");
})();
document.head.insertAdjacentHTML("beforeend", `<style>
html.acc-home header .search[data-search]{visibility:hidden}
.acc-une3{padding:34px 0 10px;max-width:720px}.acc-une3 h1{font-family:var(--serif);font-weight:800;font-size:44px;line-height:1.05;letter-spacing:-.018em;margin:0 0 18px}
.acc-une3 .acc-search{margin:0}.acc-l1{margin:10px 0 0;font-size:14px;color:var(--grey)}
.acc-minis{margin:26px 0 0;border-top:1px solid var(--rule)}.acc-mini{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule);color:var(--ink);text-decoration:none}.acc-mini b{display:block;font-size:15px}.acc-mini small{display:block;font-size:13px;color:var(--grey)}.acc-mini:hover b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
@media (max-width:900px){.acc-minis{display:none}} /* sur téléphone, la carte LVMH suit directement la recherche */
.acc-top{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:20px 56px;align-items:start;margin:0 0 34px}.acc-demo{margin:26px 0 0}
.acc-h3{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding-top:12px;border-top:1px solid var(--ink)}.acc-h3 h2{font-family:var(--serif);font-weight:800;font-size:24px;margin:0}
.acc-pubs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.acc-pub{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border:1px solid var(--rule);border-radius:6px;background:#fff;color:var(--ink);text-decoration:none;min-height:150px}
.acc-pubh{display:flex;align-items:center;gap:8px}.acc-pubh b{font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.acc-pubh small{margin-left:auto;font-size:12px;color:var(--grey);white-space:nowrap}
.acc-pubf{display:flex;flex-direction:column}.acc-pubf small{font-size:12px;color:var(--grey)}.acc-pubf b{font-family:var(--mono);font-size:22px;line-height:1.1}.acc-pubfl{font-family:var(--mono);font-style:normal;font-size:13px;margin-top:2px}.acc-pubfl.up{color:var(--g)}.acc-pubfl.down{color:var(--o)}
.acc-pubt{font-weight:600;font-size:14.5px;line-height:1.35}.acc-publ{font-size:13px;line-height:1.4;color:var(--grey);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.acc-publ i{font-style:normal;font-weight:600;color:var(--ink)}
.acc-pub:hover .acc-pubh b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.acc-sem{list-style:none;margin:0;padding:0}.acc-sem li{display:grid;grid-template-columns:190px minmax(0,1fr);gap:2px 16px;padding:10px 0;border-bottom:1px solid var(--rule);font-size:14.5px}.acc-sem b{font-family:var(--mono);font-weight:500;font-size:13.5px;color:var(--grey)}.acc-sem a{color:var(--ink);font-weight:600;text-decoration:none}.acc-sem span{grid-column:2;font-size:13px;color:var(--grey)}
.acc-rap3{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;margin:34px 0 10px;padding:22px 24px;border:1px solid var(--rule);border-radius:6px;background:#fff}.acc-rap3 h2{font-family:var(--serif);font-weight:800;font-size:24px;margin:2px 0 6px}.acc-rap3 p{margin:0;font-size:14.5px;color:var(--grey);max-width:560px}
.acc3 .acc-sec{margin:0 0 30px}
@media (max-width:900px){.acc-pubs{grid-template-columns:repeat(2,minmax(0,1fr))}.acc-une3 h1{font-size:34px}.acc-top{grid-template-columns:minmax(0,1fr);gap:0}}
@media (max-width:600px){.acc-une3{padding:22px 0 8px}.acc-une3 h1{font-size:30px}.acc-pubs{grid-template-columns:minmax(0,1fr)}.acc-pub{min-height:0}.acc-sem li{grid-template-columns:minmax(0,1fr)}.acc-sem span{grid-column:1}.acc-rap3{padding:18px}.acc-demo{margin:20px 0 26px}}
</style>`);
function accEspace(membre) { // le rapport de la semaine (bloc « Mon espace »), une fois le « Voir plus » ouvert
  moi().then(m => {
    if (location.pathname !== "/") return;
    const el = $("#homeesp"); if (!el) return;
    if (m.connecte && typeof synAccueil === "function") return synAccueil(el, m);
    if (!m.connecte && typeof parAccueilVisiteur === "function") return parAccueilVisiteur(el);
  });
}
/* Le bloc « Voir plus » n'est construit qu'au clic : ses données (historique des comptes, cours de la semaine) ne sont pas chargées au démarrage */
function accPlusHTML(membre, prem, secs) {
  return `
    <section class="acc-sec" id="acc-decouvrir">${accH("À découvrir", "Une sélection pour aller plus loin", ["/decouvertes", "Toutes les découvertes"])}
      ${typeof outilsDecouverteHTML === "function" ? outilsDecouverteHTML(3) : ""}
      <div class="acc-explo"><p class="acc-ah">Explorer par secteur</p><div class="acc-secs scroll-x">${secs.map(x => `<a href="/entreprises?secteur=${x.k}">${esc(x.name)} <small>${x.n}</small></a>`).join("")}</div>
        <p class="acc-liens"><a class="lnk" href="/classements">Les classements</a><a class="lnk" href="/etf">Trouver un ETF</a><a class="lnk" href="/comparer">Comparer des entreprises</a><a class="lnk" href="/entreprises">Toutes les entreprises</a></p></div></section>

    <section class="acc-sec" id="acc-debuter">${accH("Débuter", "Vous ne savez pas par où commencer ?", ["/apprendre", "Tout pour apprendre"])}
      <div class="acc-steps">${[["/apprendre#etapes", "Les sept étapes", "Épargne de précaution, horizon, choix du compte, frais, pièges."], ["/academie", "Suivre les cours", "L'Académie : la Bourse, les placements, les frais, avec des quiz."], [`/entreprise/${ACC_EX[0][0]}`, "Lire une vraie fiche", `${ACC_EX[0][1]} : ses chiffres face à la médiane de son secteur.`], ["/pea-cto", "Choisir son compte", "PEA, compte-titres ou assurance-vie : ce qui reste après impôts."]].map(([h, t, d], i) => `<a href="${h}"><span class="acc-n">${i + 1}</span><span><b>${t}</b><small>${d}</small></span></a>`).join("")}</div>
      ${typeof commComparaisonHTML === "function" ? `<details class="panel homecomm acc-simu acc-det2"><summary><b>Livret A, inflation ou actions : ce que deviennent vos versements</b><span class="chev" aria-hidden="true"></span></summary><div class="pb">${commComparaisonHTML({ compact: true })}<p class="acc-note" style="margin:10px 0 0"><a class="lnk" href="/livret-a-ou-bourse">Le comparateur complet</a></p></div></details>` : ""}
      ${typeof commIdeesHTML === "function" ? `<details class="homecomm acc-idees acc-det2"><summary><b>Trois idées reçues, démontées</b><span class="chev" aria-hidden="true"></span></summary><div>${commIdeesHTML(3)}<p class="acc-note" style="margin:10px 0 0"><a class="lnk" href="/idees-recues">Les 12 idées reçues</a></p></div></details>` : ""}</section>

    ${membre ? "" : `<section class="acc-sec" id="acc-rapport">${accH("Mon espace · gratuit", "Votre rapport de la semaine, sur mesure", ["/espace", "Créer mon rapport"])}<div id="homeesp"></div></section>`}

    ${prem ? "" : `<a class="acc-prem" href="/premium"><span class="acc-pk">Premium</span><span class="acc-pt">Toute l'Académie, des alertes chaque soir, 12 semaines d'historique et un portefeuille sans limite.</span><span class="acc-pl">Découvrir →</span></a>`}
  `;
}
function accLier(membre) {
  if ($("#hia")) bindIaBox($("#hia"));
  const root = $(".acc"); if (!root) return;
  root.addEventListener("click", e => { if (e.target.closest("[data-acc-rapport]")) accRapportPanneau(); });
  const pl = $("#acc-plus"), plb = $("#acc-plusb");
  if (pl && plb) pl.onclick = () => { if (!plb.innerHTML) { plb.innerHTML = accPlusHTML(membre, ACC.prem, ACC.secs); accEspace(membre); } plb.hidden = false; pl.remove(); const dg = $("#acc-decouvrir .out-dg"); if (dg) dg.classList.add("scroll-x"); };
  root.addEventListener("click", e => {
    const q = e.target.closest("[data-iaq]"); if (q) return go("/demander?q=" + encodeURIComponent(q.dataset.iaq));
    const o = e.target.closest("[data-acc-open]"); if (o) return accOuvrir(o.dataset.accOpen, o);
    if (e.target.closest("[data-acc-close]")) { const id = ACC.ouvert; accOuvrir(id); const b = $(`.acc-sj [data-acc-open="${id}"]`) || $(`[data-acc-open="${id}"]`); if (b) b.focus({ preventScroll: false }); return; }
    const s = e.target.closest("[data-acc-scroll]"); if (s) { e.preventDefault(); const t = document.getElementById(s.dataset.accScroll); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const t = e.target.closest("[data-acc-ann]"); if (t) { ACC_ANN.f = t.dataset.accAnn; $$("[data-acc-ann]").forEach(b => { const on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); }); const bd = $("#acc-annb"); if (bd) { bd.classList.remove("acc-in"); bd.innerHTML = accAnnCorps(); void bd.offsetWidth; bd.classList.add("acc-in"); } }
  });
}

/* ---------- Style ---------- */
document.head.insertAdjacentHTML("beforeend", `<style>.acc-rapb{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px 18px;margin:22px 0 4px;padding:16px 20px;border:1px solid var(--ink);border-radius:14px;background:#fff;color:var(--ink);text-decoration:none}
.acc-rapb:hover{background:#FDFCF7}.acc-rapk{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--grey)}.acc-rapb b{font-size:16px}.acc-rapl{font-size:14px;font-weight:600;white-space:nowrap}
@media (max-width:760px){.acc-rapb{grid-template-columns:minmax(0,1fr)}.acc-rapl{white-space:normal}}</style>`);
document.head.insertAdjacentHTML("beforeend", `<style id="acc-css">
.acc{--accf:#0E6B4A;--acci:#2B5C9E;--acch:#A86A00;--accs:#7C3A8F}
.acc-hero{padding-bottom:6px}.acc-hero h1{margin-bottom:18px}
.acc-trust{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px}
.acc-trust a{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--grey);text-decoration:none}.acc-trust a:hover{color:var(--ink)}
.acc-trust svg{width:15px;height:15px;fill:none;stroke:var(--accf);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;flex:none}
.acc-go+.iabox,.acc-go+*{margin-top:18px}
@media (max-width:760px){
  .acc .acc-als>:nth-child(n+4){display:none}
  .acc .acc-ag .acc-agj:nth-child(n+3){display:none}
  .acc .iaex .chip:nth-child(n+3){display:none}
}
.acc-go{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:20px 0 0}
.acc-go a{display:flex;gap:10px;align-items:flex-start;padding:13px 14px;border:1px solid var(--rule);border-radius:12px;background:var(--panel);color:var(--ink);text-decoration:none;min-width:0;min-height:44px}
.acc-go a:hover{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.acc-go svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;margin-top:2px}
.acc-go span{display:flex;flex-direction:column;gap:2px;min-width:0}
.acc-go b{font-size:14.5px;font-weight:600;line-height:1.25}.acc-go small{font-size:12.5px;color:var(--grey);line-height:1.35}
.acc-plus{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:36px 0 0;padding:14px;min-height:48px;border:1px solid var(--ink);border-radius:999px;background:var(--panel);color:var(--ink);font:600 14.5px var(--sans);cursor:pointer}
.acc-plus:hover{background:var(--ink);color:#fff}
.acc-plus svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.acc-det2{border:1px solid var(--rule);border-radius:14px;background:var(--panel);margin-top:16px}
.acc-det2>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;cursor:pointer;list-style:none;min-height:48px;box-sizing:border-box}
.acc-det2>summary::-webkit-details-marker{display:none}
.acc-det2>summary b{font:600 16px var(--serif);font-weight:600}
.acc-det2>summary .chev{width:9px;height:9px;flex:none;border-right:1.6px solid var(--grey);border-bottom:1.6px solid var(--grey);transform:rotate(45deg) translateY(-2px)}
.acc-det2[open]>summary .chev{transform:rotate(225deg) translateY(-2px)}
.acc-det2>div{padding:0 18px 16px}
.acc-sec{margin:44px 0 0;scroll-margin-top:72px}
.acc-h{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 20px;margin:0 0 14px}
.acc-h h2{font-family:var(--serif);font-size:26px;line-height:1.15;margin:2px 0 0;letter-spacing:-.01em}.acc-h .kick{margin:0}.acc-h .more{white-space:nowrap}
.acc-tag{display:inline-flex;align-items:center;font:600 10.5px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;border-radius:5px;padding:4px 6px;white-space:nowrap;flex:none}
.acc-tf{background:var(--accf);color:#fff}.acc-ti{background:#E8EFF8;color:var(--acci)}.acc-ts{background:#F3EAF6;color:var(--accs)}
.acc-tag.acc-th{background:#FFF3D6;color:var(--acch);border:1px dashed #E2B65A;padding:3px 5px}
.acc-rep{background:var(--panel);border:1px solid var(--rule);border-radius:var(--radius,14px);padding:18px;box-shadow:0 1px 2px rgba(20,20,20,.03)}
.acc-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.acc-kpi{background:var(--soft);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-width:0;min-height:150px;box-sizing:border-box}
.acc-kh{display:flex;align-items:center;gap:8px;margin:0;font-size:12.5px;font-weight:600;color:var(--grey)}
.acc-kv{display:flex;align-items:baseline;gap:10px;margin:0}.acc-kv>b{font:600 30px/1 var(--mono);letter-spacing:-.03em}.acc-kv span{font-size:13px;color:var(--grey);line-height:1.35}.acc-kv span b{color:var(--ink)}
.acc-kv0{margin:0;font-size:13.5px}
.acc-kx{margin:0;font-size:13px;line-height:1.5;color:var(--grey)}.acc-kx a{color:var(--ink);font-weight:600;text-decoration:none}.acc-kx b{font-family:var(--mono)}
.acc-kl{margin-top:auto;font-size:13px;font-weight:600;color:var(--ink);text-decoration:none}.acc-kl:hover{text-decoration:underline}
.acc-idx{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.acc-idx a{display:flex;justify-content:space-between;align-items:baseline;gap:8px;background:var(--panel);border-radius:8px;padding:7px 10px;color:inherit;text-decoration:none;font-size:13px;min-width:0}
.acc-idx a span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acc-idx a b{font:600 13px var(--mono);white-space:nowrap}.acc-idx a:hover{box-shadow:inset 0 0 0 1px var(--ink)}
.acc-kul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:13px}.acc-kul a{font-weight:600;color:var(--ink);text-decoration:none}.acc-kul span{color:var(--grey)}
.acc-subh{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 16px;margin:22px 0 12px}
.acc-subh h3{font-family:var(--serif);font-size:20px;margin:0}
.acc-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 6px;margin:0;font-size:12px;color:var(--grey)}.acc-legend span{margin-right:8px}
.acc-sjs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.acc-sj{border:1px solid var(--rule);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;min-width:0;background:var(--panel);transition:border-color .15s,box-shadow .15s}
.acc-sj.on{border-color:var(--ink);box-shadow:0 0 0 1px var(--ink)}
.acc-theme{margin:0;font:600 11px var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--light)}
.acc-sj h4,.acc-deth h4{font-family:var(--serif);font-size:18px;line-height:1.25;margin:0}
.acc-l{padding:1px 0 1px 10px;border-left:3px solid var(--c)}
.acc-l p{margin:0;font-size:13.5px;line-height:1.55}.acc-l p>.acc-tag{margin-right:7px;vertical-align:1px}
.acc-lf{--c:var(--accf)}.acc-li{--c:var(--acci)}.acc-lh{--c:#E2B65A}.acc-ls{--c:var(--accs)}
.acc-lh p{color:#3D3A35}.acc-ls a,.acc-li a{color:var(--ink);font-weight:600}
em.acc-sup{font-style:normal;color:var(--up)}em.acc-sdn{font-style:normal;color:var(--down)}em.acc-smx{font-style:normal;color:var(--acch)}
.acc-more{margin-top:auto;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--ink);background:var(--panel);color:var(--ink);border-radius:99px;padding:6px 14px;font:600 13px var(--sans);cursor:pointer;transition:background .15s,color .15s}
.acc-more svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}
.acc-more:hover,.acc-more.on{background:var(--ink);color:#fff}.acc-more.on svg{transform:rotate(180deg)}
.acc-det{margin-top:12px;border:1px solid var(--ink);border-radius:12px;padding:16px 18px;background:var(--panel);animation:accIn .22s ease;scroll-margin-top:80px}
.acc-deth{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
.acc-x{border:0;background:var(--soft);border-radius:99px;width:34px;height:34px;font-size:20px;line-height:1;cursor:pointer;flex:none;color:var(--ink)}
.acc-detg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
.acc-detg .acc-l>.acc-tag{margin-bottom:8px;display:inline-flex}
.acc-detg ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.5}.acc-detg li{margin-bottom:6px}
.acc-imps{list-style:none;padding:0!important}.acc-imps>li{padding:10px 0;border-top:1px solid var(--rule);margin:0!important}.acc-imps>li:first-child{border-top:0;padding-top:0}.acc-imps p{margin:0 0 4px}
.acc-cos{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12.5px;color:var(--grey);margin-top:6px!important}
.acc-cos a{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--rule);border-radius:99px;padding:2px 9px 2px 3px;color:var(--ink);text-decoration:none;font-size:12.5px;font-weight:500}.acc-cos a:hover{border-color:var(--ink)}
.acc-srcs{font-size:12px;color:var(--grey);margin:6px 0 0!important;line-height:1.5}.acc-srcs a{color:var(--grey)}
.acc-press{list-style:none;padding:0!important}.acc-press li{font-size:13px}.acc-press a{color:var(--ink)}.acc-press small{color:var(--light)}
.acc-note{font-size:12px;color:var(--light);margin:10px 0 0;line-height:1.45}
.acc-autres{margin-top:16px}.acc-ah{font:600 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--light);margin:16px 0 8px}
.acc-chips{display:flex;flex-wrap:wrap;gap:8px}
.acc-chip{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;border:1px solid var(--rule);background:var(--panel);border-radius:10px;padding:7px 12px;font:500 13px var(--sans);color:var(--ink);cursor:pointer;max-width:100%;transition:border-color .15s}
.acc-chip small{font:600 10px var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--light)}.acc-chip:hover,.acc-chip.on{border-color:var(--ink)}
.acc-src{font-size:12px;color:var(--light);margin:16px 0 0;line-height:1.5}.acc-src a{color:var(--grey)}
.acc-wait .acc-kpi,.acc-wait .acc-sj{min-height:150px;background:linear-gradient(90deg,var(--soft),#F8F5EF,var(--soft));background-size:200% 100%;animation:accSh 1.2s linear infinite;border:0}.acc-wait .acc-sj{min-height:420px}
.acc-wait .acc-annm{min-height:560px}.acc-wait .acc-annside .panel{min-height:400px}
@keyframes accSh{to{background-position:-200% 0}}@keyframes accIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
/* Annonces */
.acc-annw{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start}
.acc-annm{margin:0}.acc-annside .panel{margin:0 0 16px}.acc-annside .ph h3{font-family:var(--serif);font-size:18px;margin:0}
.acc-tabs{display:flex;gap:4px;padding:10px 12px;border-bottom:1px solid var(--rule)}
.acc-tabs button{border:0;background:transparent;border-radius:99px;padding:7px 14px;font:600 13.5px var(--sans);color:var(--grey);cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.acc-tabs button.on{background:var(--ink);color:#fff}.acc-tabs button:not(.on):hover{background:var(--soft);color:var(--ink)}
.acc-annb{padding:16px 18px 4px}.acc-annb.acc-in{animation:accIn .2s ease}
.acc-anns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.acc-ann{border:1px solid var(--rule);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.acc-ann.fav{border-color:#9CC9B2;background:#F6FBF8}
.acc-annh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.acc-co{display:flex;align-items:center;gap:9px;color:inherit;text-decoration:none;min-width:0}.acc-co span{display:flex;flex-direction:column;min-width:0}.acc-co b{font-size:14.5px}.acc-co small{font-size:12px;color:var(--light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acc-cat{font-size:11.5px;font-weight:600;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);border-radius:99px;padding:2px 9px;white-space:nowrap;flex:none}
.acc-ann h4{font-size:16px;line-height:1.3;margin:0;font-weight:600}.acc-ori{margin:-4px 0 0;font-size:12.5px;color:var(--light);overflow-wrap:anywhere}
.acc-figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}
.acc-fig{background:var(--soft);border-radius:9px;padding:8px 10px;min-width:0}.acc-fig small{display:block;font-size:11.5px;color:var(--grey);line-height:1.3}
.acc-fig b{display:block;font:600 17px var(--mono);letter-spacing:-.02em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acc-fig em{display:block;font:600 11.5px var(--mono);font-style:normal;margin-top:1px}
.acc-fig em.up{color:var(--up)}.acc-fig em.down{color:var(--down)}
.acc-lec{margin:0;font-size:13px;line-height:1.5;display:flex;gap:8px;align-items:baseline;color:var(--grey)}
.acc-annf{margin:auto 0 0;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;font-size:12px;color:var(--light)}.acc-annf .ax-src{margin:0;font-size:12.5px}
.acc-als{display:flex;flex-direction:column}
.acc-al{display:flex;gap:10px;align-items:flex-start;padding:10px 6px;border-bottom:1px solid var(--soft);color:inherit;text-decoration:none;border-radius:8px}.acc-al:last-child{border-bottom:0}.acc-al:hover{background:var(--soft)}
.acc-al.fav b{color:var(--accf)}
.acc-alt{display:flex;flex-direction:column;gap:2px;min-width:0}.acc-alm{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}.acc-alm b{font-size:14px}.acc-alm small{font-size:12px;color:var(--light)}
.acc-alx{font-size:13.5px;color:var(--grey);overflow-wrap:anywhere}
.acc-vide{color:var(--grey);font-size:13.5px;margin:6px 0 14px}
.acc-ag{padding-top:6px}.acc-agj+.acc-agj{margin-top:10px}
.acc-agd{margin:0 0 4px;font:600 11px var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--light)}
.acc-age{display:flex;align-items:center;gap:9px;padding:6px 4px;border-radius:8px;color:inherit;text-decoration:none}.acc-age:hover{background:var(--soft)}
.acc-age span{display:flex;flex-direction:column;min-width:0}.acc-age b{font-size:13.5px}.acc-age small{font-size:12px;color:var(--grey);line-height:1.35}.acc-age.fav b{color:var(--accf)}
.acc-agm{display:block;font-size:12.5px;color:var(--grey);padding:2px 4px 0 35px}
.acc-press2{display:flex;flex-direction:column}.acc-press2 a{display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid var(--soft);color:inherit;text-decoration:none}.acc-press2 a:last-child{border-bottom:0}
.acc-press2 span{font-size:13.5px;font-weight:500;line-height:1.35;overflow-wrap:anywhere}.acc-press2 a:hover span{text-decoration:underline}.acc-press2 small{font-size:12px;color:var(--light)}
/* Pour vous */
.acc-pv{display:flex;flex-direction:column;gap:14px}.acc-esp:empty{display:none}.acc-esp .panel{margin:0}
.acc-pvg{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start}.acc-pvg .panel{margin:0}
.acc-fav .ph h3{font-family:var(--serif);font-size:18px;margin:0}
.acc-fr{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--soft);color:inherit;text-decoration:none;border-radius:8px}.acc-fr:hover{background:var(--soft)}
.acc-frn{display:flex;flex-direction:column;min-width:0;flex:1}.acc-frn b{font-size:14px}.acc-frn small{font-size:12px;color:var(--grey);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acc-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accf);margin-right:6px;vertical-align:1px}
.acc-frv{font:600 14px var(--mono);white-space:nowrap}
.acc-pfa{display:block;color:inherit;text-decoration:none;transition:border-color .15s}.acc-pfa:hover{border-color:var(--ink)}
.acc-pfv{display:flex;align-items:baseline;gap:10px;margin:6px 0}.acc-pfv b{font:600 26px var(--mono);letter-spacing:-.03em}.acc-pfv span{color:var(--grey);font-size:13px}
.acc-pfd{margin:2px 0;font-size:13.5px;color:var(--grey)}.acc-pfd b{font-family:var(--mono)}.acc-pf .acc-kl{display:inline-block;margin-top:10px}
/* Découvrir */
.acc-explo{margin-top:4px}.acc-secs{display:flex;flex-wrap:wrap;gap:8px}
.acc-secs a{border:1px solid var(--rule);background:var(--panel);border-radius:99px;padding:6px 12px;font-size:13.5px;color:var(--ink);text-decoration:none;white-space:nowrap}.acc-secs a:hover{border-color:var(--ink)}.acc-secs small{color:var(--light);font-family:var(--mono);margin-left:4px}
.acc-liens{display:flex;flex-wrap:wrap;gap:8px 20px;margin:16px 0 0;font-size:14px}
#acc-decouvrir .out-home{margin-bottom:14px}
/* Débuter */
.acc-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.acc-steps a{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--rule);background:var(--panel);border-radius:12px;padding:12px 14px;color:inherit;text-decoration:none;transition:border-color .15s}.acc-steps a:hover{border-color:var(--ink)}
.acc-steps span{display:flex;flex-direction:column;gap:2px}.acc-steps b{font-size:14.5px}.acc-steps small{font-size:12.5px;color:var(--grey);line-height:1.4}
.acc-n{flex:none;width:24px;height:24px;border-radius:50%;background:var(--ink);color:#fff;display:grid!important;place-items:center;font:600 12px var(--mono)}
.acc-simu .ph h3{font-family:var(--serif);font-size:18px;margin:0}
.acc-subh2{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:6px 0 10px}.acc-subh2 h3{margin:0;font:600 18px var(--serif)}
/* Premium */
.acc-prem{display:flex;align-items:center;gap:14px;margin:44px 0 10px;padding:14px 18px;background:var(--ink);color:#fff;border-radius:12px;text-decoration:none}
.acc-pk{font:600 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:#111;background:#D6F26B;border-radius:6px;padding:4px 8px;flex:none}
.acc-pt{flex:1;font-size:14px;color:#E6E2DA}.acc-pl{font-weight:600;white-space:nowrap}.acc-prem:hover .acc-pl{text-decoration:underline}
#acc-rapport #homeesp{min-height:300px}
@media (max-width:1040px){.acc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.acc-kpis>.acc-kpi:last-child{grid-column:1/-1}.acc-annw{grid-template-columns:minmax(0,1fr)}.acc-annside{display:grid;grid-template-columns:1fr 1fr;gap:16px}.acc-annside .panel{margin:0}.acc-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.acc-pvg{grid-template-columns:minmax(0,1fr)}}
@media (max-width:900px){.acc-sjs{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;margin:0 -18px;padding:0 18px 6px;scrollbar-width:thin}.acc-sjs>.acc-sj{flex:0 0 min(84%,420px);scroll-snap-align:start}.acc-detg{grid-template-columns:minmax(0,1fr)}}
@media (max-width:980px){.acc-go{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* Téléphone : l'accueil montre moins de lignes des longues listes (tout reste accessible par les liens
   « Toutes les annonces », « Agenda », « Toute la presse »). Mesure : 11,7 écrans avant la refonte. */
@media (max-width:760px){.acc-anns>.acc-ann:nth-child(n+4){display:none}.acc-als>.acc-al:nth-child(n+5){display:none}
  .acc-ag>.acc-agj:nth-child(n+4){display:none}.acc-press2>a:nth-child(n+4){display:none}.acc-secs>a:nth-child(n+9){display:none}}
@media (max-width:760px){.acc-go{gap:8px;margin-top:16px}.acc-go a{padding:11px 12px}.acc-go small{display:none}.acc-plus{margin-top:26px}.acc-sec{margin-top:34px}.acc-h{flex-wrap:wrap}.acc-h h2{font-size:22px}.acc-rep{padding:14px;border-radius:12px}.acc-kpis{grid-template-columns:repeat(3,86%);overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -14px;padding:0 14px 6px}.acc-kpi{min-height:0;scroll-snap-align:start}.acc-sjs{margin:0 -14px;padding:0 14px 6px}
  .acc-anns{grid-template-columns:minmax(0,1fr)}.acc-annb{padding:12px 12px 2px}.acc-annside{grid-template-columns:minmax(0,1fr)}.acc-tabs{padding:8px}
  .acc-anns .acc-ann:nth-child(n+3){display:none}.acc-chips{flex-wrap:nowrap;margin:0 -14px;padding:0 14px 4px}.acc-chip{flex:0 0 auto;max-width:260px;white-space:normal}
  #acc-decouvrir .out-dg{display:flex!important;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;margin:0 -16px;padding:0 16px 6px}#acc-decouvrir .out-dg>*{flex:0 0 84%;scroll-snap-align:start;min-width:0}
  .acc-det{padding:14px}.acc-prem{flex-wrap:wrap;gap:8px 12px}.acc-pt{flex-basis:100%;order:3;font-size:13.5px}.acc-trust{gap:4px 14px}.acc-wait .acc-sj{min-height:420px}}
@media (max-width:520px){.acc-steps{grid-template-columns:minmax(0,1fr)}.acc-steps small{display:none}.acc-steps a{align-items:center}}
@media (prefers-reduced-motion:reduce){.acc-det,.acc-annb.acc-in{animation:none}.acc-wait .acc-kpi,.acc-wait .acc-sj{animation:none}}
</style>`);

/* ====================================================================================
   5. Présentation « journal » de la une (30 octobre 2026)
   ==================================================================================== */
document.head.insertAdjacentHTML("beforeend", `<style>
.acc-date{display:flex;flex-wrap:wrap;gap:6px 22px;align-items:baseline;padding:10px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);font-size:13px;color:var(--grey)}
.acc-dd{font-weight:600;color:var(--ink)}.acc-dd::first-letter{text-transform:uppercase}
.acc-didx{display:flex;flex-wrap:wrap;gap:6px 18px;margin-left:auto}
.acc-didx a{color:var(--grey);text-decoration:none;white-space:nowrap}.acc-didx a b{font-family:var(--mono);font-weight:500;margin-left:4px}.acc-didx a:hover{color:var(--ink)}
.acc-dall{font-weight:600;color:var(--ink)!important}
.acc-une{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:32px 56px;padding:40px 0 36px;border-bottom:1px solid var(--rule);margin-bottom:28px}
.acc-une h1{font-family:var(--serif);font-weight:800;font-size:46px;line-height:1.04;letter-spacing:-.018em;margin:0 0 16px;max-width:700px}
.acc-une h1 em{font-style:normal}
.acc-lede{font-size:17px;line-height:1.55;color:var(--grey);margin:0 0 22px;max-width:640px}
.acc-search.search{max-width:640px;margin:0}.acc-search.search input{height:48px;font-size:15.5px}
.acc-exl{font-size:13.5px;color:var(--grey);margin:12px 0 0}.acc-exl a{color:var(--ink)}
.acc-vh{font-size:12.5px;font-weight:600;color:var(--grey);margin:0 0 6px;letter-spacing:0;text-transform:none}
.acc-voies{list-style:none;margin:0;padding:0;border-top:1px solid var(--ink)}
.acc-voies li{border-bottom:1px solid var(--rule)}
.acc-voies a{display:grid;grid-template-columns:34px minmax(0,1fr) 20px;gap:12px;align-items:baseline;padding:14px 0;color:var(--ink);text-decoration:none}
.acc-voies a:hover b,.acc-voies a:focus-visible b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.acc-vn{font-family:var(--mono);font-size:12px;color:var(--light)}
.acc-vt{display:flex;flex-direction:column;gap:3px;min-width:0}.acc-vt b{font-family:var(--serif);font-weight:800;font-size:19px;line-height:1.15}.acc-vt span{font-size:13.5px;line-height:1.45;color:var(--grey)}
.acc-va{color:var(--light);text-align:right}.acc-voies a:hover .acc-va{color:var(--ink)}
.acc-exw{border:1px solid var(--rule);background:#fff;border-radius:6px;padding:16px 18px}
.acc-ex{display:block;color:var(--ink);text-decoration:none}
.acc-exh{display:flex;gap:12px;align-items:center;margin-bottom:10px}.acc-exh b{display:block;font-size:17px}.acc-exh small{display:block;font-size:12px;color:var(--grey)}
.acc-exv{margin:0 0 12px;font-family:var(--serif);font-size:24px;line-height:1.1;font-weight:800}
.acc-exr{padding:10px 0;border-top:1px solid var(--rule)}.acc-exr .acc-exk{display:block;font-size:12.5px;color:var(--grey)}.acc-exr b{font-family:var(--mono);font-size:19px;display:block;margin:2px 0 0}.acc-exr b+small{display:block;font-size:12px;color:var(--grey)}
.acc-exr .rf6-jg small{display:block}
.acc-exf{display:block;margin-top:10px;font-weight:600;font-size:14px}.acc-ex:hover .acc-exf{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}
.acc-bes{margin:0 0 32px}.acc-besl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 28px;border-top:1px solid var(--ink)}
.acc-besl li{border-bottom:1px solid var(--rule)}.acc-besl a{display:grid;grid-template-columns:minmax(0,1fr) 20px;grid-template-areas:"t a" "d a";gap:2px 10px;padding:14px 0;color:var(--ink);text-decoration:none}
.acc-besl b{grid-area:t;font-size:16px}.acc-besl span{grid-area:d;font-size:13px;line-height:1.45;color:var(--grey)}.acc-besl i{grid-area:a;align-self:center;font-style:normal;color:var(--light)}
.acc-besl a:hover b,.acc-besl a:focus-visible b{text-decoration:underline;text-decoration-color:var(--lime);text-decoration-thickness:3px;text-underline-offset:3px}.acc-besl a:hover i{color:var(--ink)}
@media (max-width:900px){.acc-besl{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:900px){.acc-une{gap:14px}.acc-une-l{display:contents}.acc-une h1{order:1}.acc-lede{order:2}.acc-search{order:3}.acc-exl{order:4}.acc-une-r{order:5}.acc-av{order:6;margin-top:4px}}
@media (max-width:600px){.acc-besl{grid-template-columns:minmax(0,1fr)}.acc-exw{padding:14px}.acc-exv{font-size:21px}}
.acc .acc-h h2{font-size:26px}
.acc-rap2{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:28px 56px;padding:28px 0 32px;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:28px}
.acc-rap2 h2{font-family:var(--serif);font-weight:800;font-size:28px;line-height:1.1;letter-spacing:-.015em;margin:0 0 10px}
.acc-rap2-l p{font-size:15px;line-height:1.55;color:var(--grey);margin:0 0 18px;max-width:520px}
.acc-srcl{list-style:none;margin:0;padding:0}.acc-srcl li{font-size:13.5px;line-height:1.5;color:var(--grey);padding:8px 0;border-bottom:1px solid var(--rule)}.acc-srcl li:first-child{border-top:1px solid var(--rule)}.acc-srcl b{color:var(--ink);font-weight:600}
/* le point du jour : des colonnes et des filets, plus de boîtes teintées */
.acc .acc-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.acc .acc-kpi{background:transparent;border:0;border-radius:0;padding:16px 22px 16px 0;border-right:1px solid var(--rule)}.acc .acc-kpi+.acc-kpi{padding-left:22px}.acc .acc-kpi:last-child{border-right:0;padding-right:0}
.acc .acc-kh{font-size:13px;font-weight:600;color:var(--ink);margin:0 0 10px}.acc .acc-kh .acc-tag{display:none}
.acc .acc-idx a{background:transparent;border:0;border-bottom:1px solid var(--rule);border-radius:0;padding:5px 0}
.acc .acc-kv>b:first-child{font-family:var(--serif);font-weight:800;font-size:34px}
.acc .acc-subh h3{font-family:var(--serif);font-weight:800;font-size:22px}
.acc .acc-legend .acc-tag,.acc .acc-sj .acc-tag{background:transparent!important;border:0!important;padding:0!important;color:var(--grey)!important;font:600 12px/1.5 var(--sans)!important;letter-spacing:0!important;text-transform:none!important}
.acc .acc-sj .acc-tag::after{content:" ·";color:var(--light)}
.acc .acc-sjs{gap:0;border-top:1px solid var(--rule)}
.acc .acc-sj{background:transparent;border:0;border-radius:0;border-right:1px solid var(--rule);padding:18px 22px 18px 0}.acc .acc-sj+.acc-sj{padding-left:22px}.acc .acc-sj:last-child{border-right:0;padding-right:0}
.acc .acc-sj h4{font-size:19px;font-weight:700;line-height:1.15;letter-spacing:-.01em;margin:4px 0 12px}
.acc .acc-theme{font-size:12.5px;font-weight:600;color:var(--grey);letter-spacing:0;text-transform:none;font-family:var(--sans)}
.acc .acc-l{background:transparent;border:0;padding:0;margin:0 0 10px}.acc .acc-sj .acc-li,.acc .acc-sj .acc-lh{display:none}
.acc-av{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--ink)}
.acc-av li{display:flex;flex-direction:column;gap:4px;padding:12px 16px 4px 0;border-right:1px solid var(--rule)}.acc-av li+li{padding-left:16px}.acc-av li:last-child{border-right:0}.acc-av b{font-size:14.5px}.acc-av span{font-size:12.5px;line-height:1.5;color:var(--grey)}
@media (max-width:760px){.acc-av{grid-template-columns:minmax(0,1fr)}.acc-av li{border-right:0;border-bottom:1px solid var(--rule);padding:10px 0!important}.acc-av li:last-child{border-bottom:0}}
.acc-cards{margin:0 0 28px}.acc-cardl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.acc-card{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:14px 16px;border:1px solid var(--rule);border-radius:14px;background:#fff;color:var(--ink);text-decoration:none}.acc-card:hover{border-color:var(--ink)}
.acc-cn{display:flex;flex-direction:column}.acc-cn b{font-size:16px}.acc-cn small{font-size:12px;color:var(--grey)}
.acc-cp{display:flex;flex-direction:column;align-items:flex-end}.acc-cp b{font-family:var(--mono);font-weight:500;font-size:17px}.acc-cp small{font-family:var(--mono);font-size:12px}.acc-cp small.up{color:var(--g)}.acc-cp small.down{color:var(--down)}
.acc-ct{grid-column:1/-1;display:flex;align-items:center;gap:6px;padding-top:8px;border-top:1px solid var(--rule)}.acc-ct i{font-style:normal;font-family:var(--mono);font-size:13px;font-weight:600;min-width:26px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px}.acc-ct i.f{background:#E6F3EB;color:var(--g)}.acc-ct i.m{background:var(--soft);color:var(--grey)}.acc-ct i.v{background:#FBEBE2;color:var(--down)}.acc-ct small{font-size:11.5px;color:var(--light);margin-left:4px}
@media (max-width:760px){.acc-cardl{grid-template-columns:minmax(0,1fr)}}.acc .acc-l p{font-size:14px;line-height:1.55;color:var(--ink)}
.acc .acc-more{border-color:var(--rule)}
/* annonces : mêmes filets, plus de pavés teintés ni d'étiquettes en capitales */
.acc .acc-fig{background:transparent;border:0;border-top:1px solid var(--rule);border-radius:0;padding:8px 0 2px}
.acc .acc-fig small{font-family:var(--sans);font-size:12px;color:var(--grey);letter-spacing:0;text-transform:none}
.acc .acc-lec .acc-tag{background:transparent!important;border:0!important;padding:0!important;color:var(--ink)!important;font:600 12.5px/1.5 var(--sans)!important;letter-spacing:0!important;text-transform:none!important}
.acc .acc-agd{font:600 12.5px var(--sans);letter-spacing:0;text-transform:none;color:var(--grey)}.acc .acc-agd::first-letter{text-transform:uppercase}
.acc .acc-annm.panel,.acc .acc-annside .panel{box-shadow:none}
.acc .acc-rep{background:transparent;border:0;padding:0;box-shadow:none}
@media (max-width:900px){.acc-une,.acc-rap2{grid-template-columns:minmax(0,1fr);gap:26px}.acc-une h1{font-size:34px}.acc .acc-kpis,.acc .acc-sjs{grid-template-columns:minmax(0,1fr);display:grid;margin:0;padding:0;overflow:visible}.acc .acc-kpi,.acc .acc-sj{border-right:0;padding:16px 0!important;border-bottom:1px solid var(--rule)}.acc .acc-kpi:last-child,.acc .acc-sj:last-child{border-bottom:0}}
@media (max-width:600px){.acc-une{padding:26px 0 24px}.acc-une h1{font-size:30px}.acc-lede{font-size:15.5px}.acc-didx{margin-left:0}.acc-dall{display:none}.acc-rap2 h2{font-size:24px}}
</style>`);

document.head.insertAdjacentHTML("beforeend", `<style>
.acc-sub{margin:-6px 0 14px;font-size:14.5px;color:var(--grey);max-width:68ch}
.acc-pubs.scroll-x{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding:2px 2px 10px;margin:0 -2px;scrollbar-width:thin}.acc-pubs.scroll-x>.acc-pub{flex:0 0 250px;scroll-snap-align:start;min-width:0}
.acc-mk{display:grid;gap:18px}.acc-idx2{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.acc .acc-idc{display:flex;flex-direction:column;gap:2px;padding:16px 18px;border:1px solid var(--rule);border-radius:6px;background:#fff;color:var(--ink);text-decoration:none}.acc-idc small{font-size:13px;color:var(--grey)}.acc-idc b{font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.01em}.acc-idc span{font-size:13px;color:var(--grey);font-variant-numeric:tabular-nums}.acc-idc:hover{border-color:var(--ink)}
.acc-mvs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 32px}.acc-mv{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--rule);color:var(--ink);text-decoration:none}.acc-mv>.acc-mvt{flex:1;min-width:0;display:flex;flex-direction:column}.acc-mvt b{font-weight:600;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acc-mvt small{font-size:12.5px;color:var(--grey)}#acc-decouvrir .out-home>.ph,#acc-decouvrir .out-hs{display:none}#acc-decouvrir .out-home{border:0;background:transparent;padding:0}#acc-decouvrir .out-home>.pb{padding:0}.acc-mvv{font-variant-numeric:tabular-nums;font-size:16px;white-space:nowrap}.acc-mvv.up{color:var(--up)}.acc-mvv.down{color:var(--down)}.acc-mv:hover .acc-mvt b{text-decoration:underline}
.acc-cpt{padding:22px 28px 26px;border:1px solid var(--ink);border-radius:10px;background:#fff}.acc-cpt .acc-h3{border-top:0;padding-top:0;margin-top:0}.acc-cptg{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:24px 40px;align-items:center}.acc-cptl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 28px}.acc-cptl li{display:flex;flex-direction:column;gap:3px;padding-left:14px;border-left:3px solid var(--lime)}.acc-cptl b{font-size:15px}.acc-cptl span{font-size:13.5px;color:var(--grey);line-height:1.45}.acc-cpta{display:flex;flex-direction:column;gap:12px;align-items:flex-start}.acc-cptx{background:none;border:0;padding:0;color:var(--ink);font:600 14px var(--sans);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.acc-pane{position:fixed;inset:0;z-index:90;display:none}.acc-pane.on{display:block}.acc-panev{position:absolute;inset:0;background:rgba(20,18,15,.45)}.acc-panec{position:absolute;top:0;right:0;bottom:0;width:min(760px,100%);background:var(--page,#FBF8F1);box-shadow:-12px 0 40px rgba(0,0,0,.18);display:flex;flex-direction:column}.acc-paneh{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;border-bottom:1px solid var(--rule);background:#fff}.acc-paneh b{font-family:var(--serif);font-size:19px}.acc-panex{background:none;border:1px solid var(--rule);border-radius:999px;width:36px;height:36px;cursor:pointer;font-size:15px}.acc-paneb{overflow:auto;padding:18px 22px 40px}html.acc-pane-on{overflow:hidden}
@media (max-width:900px){.acc-idx2{grid-template-columns:repeat(2,minmax(0,1fr))}.acc-idc b{font-size:24px}.acc-mvs{grid-template-columns:minmax(0,1fr)}.acc-cptg{grid-template-columns:minmax(0,1fr)}.acc-cptl{grid-template-columns:minmax(0,1fr)}.acc-cpt{padding:18px}}
</style>`);
