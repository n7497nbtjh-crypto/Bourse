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
  return `<div class="acc-kpi"><p class="acc-kh">${accTag("f", "Fait")} Les marchés ${jourSeance() === "aujourd'hui" ? "aujourd'hui" : "de " + jourSeance()}</p>
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
/* 4e passage (31/10, lot C) : icônes SVG des blocs et des secteurs ; titres qui disent la réponse ; rythme crème / blanc */
const ACC_I = { cal: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 13h3M8 16h6", ia: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5",
  pub: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5", mk: "M3 17l5-6 4 3 5-7 4 4", ag: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", dec: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z", sec: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", esp: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  conso: "M6 7h12l-1 12H7zM9 7a3 3 0 0 1 6 0", industrie: "M3 21V9l6 4V9l6 4V5h6v16z", energie: "M13 2L4 14h7l-1 8 9-12h-7z", sante: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z", tech: "M4 5h16v11H4zM9 20h6M12 16v4", finance: "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 20h20M12 3l9 7H3z", telecom: "M12 20V10M12 10a5 5 0 0 1 5-5M12 10a5 5 0 0 0-5-5M5 14a8 8 0 0 1 14 0", materiaux: "M12 3l9 6-9 6-9-6zM3 15l9 6 9-6", services: "M12 2v4M4.9 4.9l2.8 2.8M2 12h4M4.9 19.1l2.8-2.8M12 18v4M19.1 19.1l-2.8-2.8M22 12h-4M19.1 4.9l-2.8 2.8M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", immo: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6",
};
const accIc = k => `<svg class="acc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ACC_I[k] || ACC_I.sec}"/></svg>`;
function accSpark(vals, w = 64, h = 20) { // mini-courbe de la semaine (clôtures relevées chaque matin), sans axe
  const v = (vals || []).filter(x => x != null); if (v.length < 2) return "";
  const mn = Math.min(...v), mx = Math.max(...v), sp = mx - mn || 1, pts = v.map((x, i) => `${(i / (v.length - 1) * (w - 2) + 1).toFixed(1)},${(h - 2 - (x - mn) / sp * (h - 4)).toFixed(1)}`).join(" ");
  return `<svg class="acc-spk" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
let ACC_CS = null; // cours de la semaine (indices et entreprises), chargés une fois
async function accCoursSemaine() { if (ACC_CS !== null) return ACC_CS; try { const r = await fetch("/data/cours-semaine.json"); ACC_CS = r.ok ? await r.json() : false; } catch (e) { ACC_CS = false; } return ACC_CS; }
function accMarchesTitre() { const ids = ["cac40", "stoxx50", "sp500", "dax"], rows = ids.map(id => PX["i:" + id]).filter(p => p && p.chg != null); const j = jourSeance(), ouvert = j === "aujourd'hui", J = j.charAt(0).toUpperCase() + j.slice(1);
  if (!rows.length) return ouvert ? "Les marchés aujourd'hui" : `Les marchés, séance de ${j}`; const up = rows.filter(p => p.chg > 0).length; // 1/11 : le week-end, on nomme la dernière séance
  const sens = up === rows.length ? ["montent", "ont monté"] : up === 0 ? ["reculent", "ont reculé"] : up >= rows.length / 2 ? ["montent plutôt", "ont plutôt monté"] : ["reculent plutôt", "ont plutôt reculé"];
  return ouvert ? `Les marchés ${sens[0]} aujourd'hui` : `${J}, les marchés ${sens[1]}`; }
function accPubTitre() { const O = ((ACC.fil && ACC.fil.o) || []).filter(it => RBY[it.id] && it.i >= 1); if (!O.length) return "Ce que les entreprises ont publié"; const hier = new Date(Date.now() - 864e5).toISOString().slice(0, 10), n = new Set(O.filter(it => dayKey(it.d) === hier).map(it => it.id)).size; const n2 = new Set(O.filter(it => dayKey(it.d) === TODAY).map(it => it.id)).size; return n2 ? `${n2} entreprise${n2 > 1 ? "s ont" : " a"} publié aujourd'hui` : n ? `${n} entreprise${n > 1 ? "s ont" : " a"} publié hier` : "Ce que les entreprises ont publié"; }
function accMarchesHTML() { // 31/10 (Romain) : les marchés du jour en grand, avec les plus fortes hausses et baisses parmi les grandes entreprises
  const ids = ["cac40", "stoxx50", "sp500", "nasdaq", "dax"], rows = INDEX_INFO.filter(x => ids.includes(x[0])).map(([id, name]) => ({ id, name, p: PX["i:" + id] })).filter(r => r.p && r.p.chg != null).slice(0, 4);
  const grands = R.companies.filter(c => !c.missing && accTaille(c) >= 5e9).map(c => ({ c, p: pxOf(c) })).filter(x => x.p && x.p.chg != null && Math.abs(x.p.chg) < 40).sort((a, b) => b.p.chg - a.p.chg);
  const hs = grands.slice(0, 5), bs = grands.slice(-5).reverse(), vmax = Math.max(1, ...[...hs, ...bs].map(x => Math.abs(x.p.chg)));
  const ligne = x => `<a class="acc-mv" href="/entreprise/${x.c.id}">${logo(x.c, 24)}<span class="acc-mvt"><b>${esc(x.c.name)}</b></span><span class="acc-mvb ${accCls(x.p.chg)}"><i style="width:${(Math.abs(x.p.chg) / vmax * 100).toFixed(0)}%"></i></span><b class="acc-mvv ${accCls(x.p.chg)}">${accPct(x.p.chg)}</b></a>`; // barre proportionnelle à la variation
  const cs = ACC_CS && ACC_CS.items ? ACC_CS.items : {};
  return `<div class="acc-mk">${rows.length ? `<div class="acc-idx2">${rows.map(r => `<a href="/indice/${r.id}" class="acc-idc"><small>${esc(r.name)}</small><b class="${accCls(r.p.chg)}">${accPct(r.p.chg)}</b><span>${F0.format(r.p.p)} pts${cs["i:" + r.id] ? ` <span class="acc-spkw ${accCls(r.p.chg)}" title="Clôtures des 5 derniers jours de Bourse">${accSpark(jourSeance() === "aujourd'hui" ? [...cs["i:" + r.id], r.p.p] : cs["i:" + r.id])}<small class="acc-spk5">5 jours</small></span>` : ""}</span></a>`).join("")}</div>` : ""}
    ${hs.length ? `<div class="acc-mvs"><div><p class="acc-ah">Plus fortes hausses ${jourSeance() === "aujourd'hui" ? "du jour" : jourSeance()}</p>${hs.map(ligne).join("")}</div><div><p class="acc-ah">Plus fortes baisses ${jourSeance() === "aujourd'hui" ? "du jour" : jourSeance()}</p>${bs.map(ligne).join("")}</div></div><p class="acc-note">Variation sur la dernière séance, parmi les entreprises de plus de 5 milliards d'euros suivies par le site. Cours Google Finance différés${PXUP && PXUP !== "none" && /T\d/.test(PXUP) ? `, relevés le ${esc(new Date(PXUP).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }))} (heure de Paris)` : ""}. Une variation d'un jour ne dit rien de la qualité d'une entreprise.</p><details class="acc-pq"><summary>Pourquoi votre courtier affiche-t-il parfois un autre chiffre ?</summary><p>Le site compare deux clôtures à la Bourse d'origine de l'action (New York pour Intel, en dollars). Votre courtier montre souvent le titre coté ailleurs, par exemple en Allemagne et en euros, sur une place ouverte jusqu'à 22 h ou 23 h. Quand une entreprise publie ses résultats le soir, la chute ou la hausse commence donc la veille chez lui, et la variation « du jour » qu'il affiche est plus petite. Exemple : Intel a publié le jeudi 29 octobre après la clôture de New York ; sa baisse s'est faite en partie jeudi soir en Europe, puis vendredi à New York.</p></details>` : ""}</div>`;
}
async function accRapportPanneau() { // le rapport en exemple dans un panneau latéral, sans quitter l'accueil
  let pane = $("#acc-pane");
  if (!pane) { document.body.insertAdjacentHTML("beforeend", `<div id="acc-pane" class="acc-pane" role="dialog" aria-modal="true" aria-label="Un rapport de la semaine en exemple"><div class="acc-panev" data-acc-pane-close></div><div class="acc-panec"><div class="acc-paneh"><b>Le rapport de la semaine, en exemple</b><button type="button" class="acc-panex" data-acc-pane-close aria-label="Fermer">✕</button></div><div class="acc-paneb"><div class="empty">Calcul du rapport de cette semaine…</div></div></div></div>`); pane = $("#acc-pane");
    pane.addEventListener("click", e => { if (e.target.closest("[data-acc-pane-close]")) accRapportFermer(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && pane.classList.contains("on")) accRapportFermer(); }); }
  pane.classList.add("on"); document.documentElement.classList.add("acc-pane-on");
  const body = $(".acc-paneb", pane); if (body.dataset.pret) return;
  try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=rapport-exemple"); } catch (e) { }
  let b = null; try { const r = await fetch("/api/rapport-exemple"); b = r.ok ? await r.json() : null; } catch (e) { }
  if (!b || typeof synPageHTML !== "function") { body.innerHTML = `<p class="muted">Le rapport exemple n'a pas pu être calculé pour le moment. <a class="lnk" href="/rapport-exemple">Ouvrir la page</a></p>`; return; }
  await Promise.all([typeof acaLoad === "function" ? acaLoad() : null, typeof synContexte === "function" ? synContexte() : null, typeof loadFiches === "function" ? loadFiches() : null]);
  b = typeof synNormalise === "function" ? synNormalise(b) : b;
  body.innerHTML = `<p class="acc-sub">Calculé aujourd'hui pour un profil d'exemple (quatre favoris, un petit portefeuille PEA, deux secteurs). Le vôtre suit vos propres titres.</p><div id="synex">${synPageHTML(b, { premium: false })}</div><p style="margin:18px 0 0;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="btn" href="/espace">Créer mon rapport</a><a class="lnk" href="/rapport-exemple">Voir en pleine page</a></p>`;
  body.dataset.pret = "1"; if (typeof synIA === "function") synIA(b, document.getElementById("syn4-ia"), false);
}
function accRapportFermer() { const p = $("#acc-pane"); if (p) p.classList.remove("on"); document.documentElement.classList.remove("acc-pane-on"); }
function accCompteHTML(membre) { // 4e passage (lot C) : trois icônes, quatre mots chacune, puis le bouton
  if (membre) return "";
  return `<section class="acc-sec acc-cpt" id="acc-compte"><div class="acc-h3"><h2>${accIc("esp")}Vous n'avez rien à surveiller</h2></div>
    <p class="acc-sub">Entrez vos valeurs une fois : le site les suit pour vous, chaque semaine.</p>
    <div class="acc-cpt3"><div>${accIc("pub")}<b>Il lit les publications</b></div><div>${accIc("ag")}<b>Il tient votre agenda</b></div><div>${accIc("mk")}<b>Il fait votre rapport</b></div></div>
    <div class="acc-cpta"><a class="btn" href="/espace">Créer mon espace</a><a class="acc-cptx" href="/rapport-exemple">Voir un rapport en exemple →</a></div></section>`;
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
const ACC_EX_TOUS = [["lvmh", "LVMH"], ["apple", "Apple"], ["loreal", "L'Oréal"], ["microsoft", "Microsoft"], ["asml", "ASML"], ["sanofi", "Sanofi"], ["hermes", "Hermès"], ["alphabet", "Alphabet"], ["danone", "Danone"], ["novo-nordisk", "Novo Nordisk"], ["amazon", "Amazon"], ["michelin", "Michelin"], ["bnp-paribas", "BNP Paribas"]]; // 1/11 : TotalEnergies et Airbus retirés : leur résultat d'exploitation n'est pas publié sous la forme standard, l'exemple n'aurait pas de marge
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
  return L.length ? `<div class="acc-pubs scroll-x" tabindex="0" aria-label="Annonces récentes, faites glisser">${L.map(accPubCarte).join("")}</div><div class="acc-pubnav"><span class="acc-pubn">1/${L.length}</span><button type="button" data-acc-pubd="-1" aria-label="Précédente">←</button><button type="button" data-acc-pubd="1" aria-label="Suivante">→</button></div>` : `<p class="acc-vide">Aucune annonce chiffrée ces derniers jours.</p>`;
}
function accSemaineHTML() { // 4e passage (lot C) : frise des 7 prochains jours, une pastille par jour, les logos dessous ; favoris en premier, marqués ★
  const fav = accFavIds(), evs = accProchains(7), J = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const jours = []; for (let i = 0; i < 7; i++) { const d = addDays(TODAY, i); jours.push({ d, evs: evs.filter(e => e.date === d).sort((a, b) => (fav.has(b.id) - fav.has(a.id)) || accTaille(RBY[b.id]) - accTaille(RBY[a.id])) }); }
  if (!evs.length) return `<p class="acc-vide">Aucune date annoncée sur les sept prochains jours.</p>`;
  return `<div class="acc-frise" role="list">${jours.map(j => { const dt = new Date(j.d + "T12:00:00Z"), L = j.evs.slice(0, 6); return `<div class="acc-fj${L.length ? "" : " vide"}" role="listitem"><div class="acc-fjd"><small>${J[dt.getUTCDay()]}</small><b>${dt.getUTCDate()}</b></div>
      <div class="acc-fjl">${L.map(e => `<button type="button" class="acc-fje${fav.has(e.id) ? " fav" : ""}" data-acc-ev="${e.id}|${esc(e.label)}" title="${esc(RBY[e.id].name)} : ${esc(e.label)}" aria-label="${esc(RBY[e.id].name)} : ${esc(e.label)}">${logo(RBY[e.id], 30)}${fav.has(e.id) ? `<i>★</i>` : ""}</button>`).join("")}${j.evs.length > 6 ? `<a class="acc-fjm" href="/agenda">+${j.evs.length - 6}</a>` : ""}</div></div>`; }).join("")}</div>
    <p class="acc-fjx" id="acc-fjx" aria-live="polite">Touchez un logo pour voir l'événement.</p>`;
}
async function pageHome() {
  setTitle(""); setNav("home");
  document.documentElement.classList.add("acc-home");
  if (!$(".acc", app)) app.innerHTML = `<div class="acc"><section class="acc-une3"><h1>Comprenez une entreprise en 10 secondes.</h1></section></div>`; // affichage immédiat, même titre
  await PXP; // 1/11 : les analyses d'actualité (1,2 Mo) ne servent pas à l'accueil : chargées après l'affichage
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
    <nav class="acc-raccourcis scroll-x" aria-label="Sections de l'accueil"><a href="#acc-pub">Publications</a><a href="#acc-marches">Marchés</a><a href="#acc-sem">Agenda</a><a href="#acc-decouvrir">Découvertes</a><a href="#acc-secteurs">Secteurs</a></nav>
    <section class="acc-sec" id="acc-pub"><div class="acc-h3"><h2>${accIc("pub")}<span id="acc-pubt">${esc(accPubTitre())}</span></h2><a class="lnk" href="/actualites">Toutes les annonces →</a></div>
      <div id="acc-pubw">${pret ? accPubHTML() : `<div class="acc-pubs acc-wait"><div class="acc-pub"></div><div class="acc-pub"></div><div class="acc-pub"></div><div class="acc-pub"></div></div>`}</div></section>
    <section class="acc-sec acc-blanc" id="acc-marches"><div class="acc-h3"><h2>${accIc("mk")}${esc(accMarchesTitre())}</h2><a class="lnk" href="/marches">Tous les marchés →</a></div><div id="acc-mkw">${accMarchesHTML()}</div></section>
    <section class="acc-sec" id="acc-sem"><div class="acc-h3"><h2>${accIc("ag")}Les 7 prochains jours</h2><a class="lnk" href="/agenda">Tout l'agenda →</a></div><p class="acc-sub">Résultats et dividendes attendus : vos favoris ★ d'abord, puis les plus grandes entreprises.</p><div id="acc-semw">${pret ? accSemaineHTML() : ""}</div></section>
    <section class="acc-sec acc-blanc" id="acc-decouvrir"><div class="acc-h3"><h2>${accIc("dec")}Trois entreprises à découvrir</h2><a class="lnk" href="/decouvertes">Toutes les découvertes →</a></div><p class="acc-sub">Moins connues, petites et moyennes, et dont les comptes ressortent. La sélection change chaque jour.</p>${typeof outilsDecouverteHTML === "function" ? outilsDecouverteHTML(3) : ""}</section>
    <section class="acc-sec" id="acc-secteurs"><div class="acc-h3"><h2>${accIc("sec")}Explorer par secteur</h2><a class="lnk" href="/entreprises">Toutes les entreprises →</a></div><div class="acc-secg">${(ACC.secs || []).map(x => `<a href="/entreprises?secteur=${x.k}">${accIc(x.k)}<b>${esc(x.name)}</b><small>${x.n} entreprises</small></a>`).join("")}</div></section>
    ${accCompteHTML(membre)}
    ${membre ? `<section class="acc-rap3"><div><p class="acc-vh">Chaque semaine</p><h2>Votre rapport de la semaine</h2><p>Ce que vos entreprises ont publié, leurs cours, leurs dates à venir, dans un seul courrier.</p></div><a class="btn" href="/espace">Mon rapport</a></section>` : ""}
  </div>`;
  ACC.prem = prem;
  accLier(membre);
  accExemple(ACC_EX[0][0]); accMinis();
  if (typeof bindSearch === "function") { try { bindSearch(app); } catch (e) { } }
  if (!pret) accCharge().then(() => { if (location.pathname !== "/") return; const a = $("#acc-pubw"), b = $("#acc-semw"); if (a) a.innerHTML = accPubHTML(); if (b) b.innerHTML = accSemaineHTML(); const pt = $("#acc-pubt"); if (pt) pt.textContent = accPubTitre(); });
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
/* styles : voir site.css */
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
    <section class="acc-sec acc-blanc" id="acc-decouvrir">${accH("À découvrir", "Une sélection pour aller plus loin", ["/decouvertes", "Toutes les découvertes"])}
      ${typeof outilsDecouverteHTML === "function" ? outilsDecouverteHTML(3) : ""}
      <div class="acc-explo"><p class="acc-ah">Explorer par secteur</p><div class="acc-secs scroll-x">${secs.map(x => `<a href="/entreprises?secteur=${x.k}">${esc(x.name)} <small>${x.n}</small></a>`).join("")}</div>
        <p class="acc-liens"><a class="lnk" href="/classements">Les classements</a><a class="lnk" href="/etf">Trouver un ETF</a><a class="lnk" href="/comparer">Comparer des entreprises</a><a class="lnk" href="/entreprises">Toutes les entreprises</a></p></div></section>

    <section class="acc-sec" id="acc-debuter">${accH("Débuter", "Vous ne savez pas par où commencer ?", ["/apprendre", "Tout pour apprendre"])}
      <div class="acc-steps">${[["/apprendre#etapes", "Les sept étapes", "Épargne de précaution, horizon, choix du compte, frais, pièges."], ["/academie", "Suivre les cours", "L'Académie : la Bourse, les placements, les frais, avec des quiz."], [`/entreprise/${ACC_EX[0][0]}`, "Lire une vraie fiche", `${ACC_EX[0][1]} : ses chiffres face à la médiane de son secteur.`], ["/pea-cto", "Choisir son compte", "PEA, compte-titres ou assurance-vie : ce qui reste après impôts."]].map(([h, t, d], i) => `<a href="${h}"><span class="acc-n">${i + 1}</span><span><b>${t}</b><small>${d}</small></span></a>`).join("")}</div>
      ${typeof commComparaisonHTML === "function" ? `<details class="panel homecomm acc-simu acc-det2"><summary><b>Livret A, inflation ou actions : ce que deviennent vos versements</b><span class="chev" aria-hidden="true"></span></summary><div class="pb">${commComparaisonHTML({ compact: true })}<p class="acc-note" style="margin:10px 0 0"><a class="lnk" href="/livret-a-ou-bourse">Le comparateur complet</a></p></div></details>` : ""}
      ${typeof commIdeesHTML === "function" ? `<details class="homecomm acc-idees acc-det2"><summary><b>Trois idées reçues, démontées</b><span class="chev" aria-hidden="true"></span></summary><div>${commIdeesHTML(3)}<p class="acc-note" style="margin:10px 0 0"><a class="lnk" href="/idees-recues">Les 12 idées reçues</a></p></div></details>` : ""}</section>

    ${membre ? "" : `<section class="acc-sec" id="acc-rapport">${accH("Mon espace · gratuit", "Votre rapport de la semaine, sur mesure", ["/espace", "Créer mon rapport"])}<div id="homeesp"></div></section>`}

    ${prem ? "" : `<a class="acc-prem" href="/premium"><span class="acc-pk">Premium</span><span class="acc-pt">Toute l'Académie, des alertes chaque soir${typeof robotActif === "function" && robotActif("alertes") ? "" : " (bientôt)"}, 12 semaines d'historique et un portefeuille sans limite.</span><span class="acc-pl">Découvrir →</span></a>`}
  `;
}
function accLier(membre) {
  if ($("#hia")) bindIaBox($("#hia"));
  const root = $(".acc"); if (!root) return;
  root.addEventListener("click", e => { if (e.target.closest("[data-acc-rapport]")) { e.preventDefault(); go("/rapport-exemple"); } // 1/11 (Romain) : le rapport en exemple s'ouvre en pleine page
    const ev = e.target.closest("[data-acc-ev]"); if (ev) { const [id, lab] = ev.dataset.accEv.split("|"); const x = $("#acc-fjx"); $$(".acc-fje.on", root).forEach(b => b.classList.remove("on")); ev.classList.add("on"); if (x) x.innerHTML = `<b>${esc(RBY[id] ? RBY[id].name : id)}</b> : ${esc(lab)} · <a class="lnk" href="/entreprise/${id}/agenda">la fiche →</a>`; } });
  root.addEventListener("click", e => { const b = e.target.closest("[data-acc-pubd]"); if (!b) return; const sc = $(".acc-pubs", root), card = sc && sc.querySelector(".acc-pub"); if (sc && card) sc.scrollBy({ left: +b.dataset.accPubd * (card.getBoundingClientRect().width + 12), behavior: "smooth" }); });
  const sc0 = $(".acc-pubs", root); if (sc0) sc0.addEventListener("scroll", () => { const card = sc0.querySelector(".acc-pub"), n = sc0.querySelectorAll(".acc-pub").length, t = $(".acc-pubn", root); if (card && t) t.textContent = `${Math.min(n, Math.round(sc0.scrollLeft / (card.getBoundingClientRect().width + 12)) + 1)}/${n}`; }, { passive: true });
  accCoursSemaine().then(() => { const w = $("#acc-mkw"); if (w && ACC_CS) w.innerHTML = accMarchesHTML(); });
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
/* styles : voir site.css */
/* styles : voir site.css */

/* ====================================================================================
   5. Présentation « journal » de la une (30 octobre 2026)
   ==================================================================================== */
/* styles : voir site.css */

/* styles : voir site.css */

/* styles : voir site.css */
