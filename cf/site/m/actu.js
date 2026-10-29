/* Module « actu » de bilan. : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).
   Données : /data/actu/fil.json (fil récent), /data/actu/c/<id>.json (une entreprise, 90 jours), /data/actu/j/<jour>.json (un jour).
   Fonctions fournies aux autres modules : actuFicheCourt(el, s), actuFicheDetail(el, s), actuBandeau(el), actuBandeauHTML(),
   presseBlock(el, opts), newsBlock(el, opts), actuCo(id) (promesse des données d'une entreprise). */
const ACTU_CAT = {
  resultats: { l: "Résultats", c: "#1E6FD9", why: "L'entreprise publie ses ventes et ses bénéfices de la période. C'est en général l'annonce qui fait le plus bouger le cours." },
  rapport: { l: "Rapport annuel", c: "#5B4FC4", why: "Le document complet de l'année : comptes audités, risques, rémunérations. C'est la source des chiffres du site." },
  dividende: { l: "Dividende", c: "#1E8A52", why: "Montant et dates du dividende. Pour le recevoir, il faut détenir l'action la veille de la date de détachement." },
  operation: { l: "Acquisition, OPA", c: "#C2410C", why: "Achat, vente ou rapprochement d'entreprises. À regarder : le prix payé et son financement (trésorerie, dette, nouvelles actions)." },
  dirigeants: { l: "Direction", c: "#7C3A8F", why: "Changement à la tête de l'entreprise ou au conseil d'administration. Un départ soudain du directeur général est suivi de près." },
  assemblee: { l: "Assemblée", c: "#8A6D1E", why: "Les actionnaires votent les comptes, le dividende et les administrateurs. Chaque actionnaire peut voter." },
  emission: { l: "Émission, financement", c: "#0E7490", why: "L'entreprise lève de l'argent : nouvelles actions (la part de chaque actionnaire baisse) ou emprunt (la dette augmente)." },
  contrat: { l: "Contrat", c: "#3F6212", why: "Un contrat ou une commande que l'entreprise juge important pour son activité." },
  incident: { l: "Incident", c: "#B42318", why: "L'entreprise signale un incident important, par exemple une attaque informatique." },
  rachat: { l: "Rachat d'actions", c: "#8A857D", routine: 1, why: "L'entreprise rachète ses propres actions. Déclaration obligatoire, souvent hebdomadaire : rarement une nouvelle en soi." },
  capital: { l: "Actionnariat", c: "#8A857D", routine: 1, why: "Nombre d'actions, droits de vote ou franchissement de seuil par un actionnaire. Publication obligatoire, rarement importante." },
  initie: { l: "Dirigeant", c: "#8A857D", routine: 1, why: "Un dirigeant a acheté ou vendu des actions de l'entreprise. Publication obligatoire." },
  agenda: { l: "Calendrier", c: "#8A857D", routine: 1, why: "Date d'une prochaine publication ou d'une présentation aux investisseurs." },
  autre: { l: "Communiqué", c: "#5F5B55", why: "Communiqué officiel de l'entreprise." },
};
const ACTU_SRC = { amf: "AMF", sec: "SEC", nasdaq: "Nasdaq Nordic", oslo: "Oslo Børs", nsm: "FCA (NSM)" };
const ACTU_LANG = { en: "en anglais", sv: "en suédois", fi: "en finnois", da: "en danois", no: "en norvégien", de: "en allemand", es: "en espagnol", it: "en italien", nl: "en néerlandais", is: "en islandais" };
const ACTU_TYPES = [["imp", "L'essentiel"], ["resultats", "Résultats"], ["dividende", "Dividendes"], ["operation", "Acquisitions, OPA"], ["dirigeants", "Direction"], ["assemblee", "Assemblées"], ["emission", "Émissions"], ["tout", "Tout"]];
const ACTU_ZONES = [["tout", "Toutes les zones"], ["fav", "Mes favoris"], ["FR", "France"], ["EU", "Europe"], ["US", "États-Unis"], ["MONDE", "Reste du monde"]];
const ACTU_MEM = {};
document.head.insertAdjacentHTML("beforeend", `<style>
.ax-it{display:flex;gap:12px;padding:13px 0;border-bottom:1px solid var(--soft)}.ax-it:last-child{border-bottom:0}
.ax-b{min-width:0;flex:1}.ax-m{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12.5px;color:var(--light)}
.ax-m .nco{font-weight:600;color:var(--ink);font-size:13.5px}.ax-chip{font-size:11.5px;font-weight:600;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);border-radius:99px;padding:1px 8px;white-space:nowrap}
.ax-imp{font-size:11px;font-weight:600;color:#B42318;border:1px solid color-mix(in srgb,#B42318 35%,transparent);border-radius:99px;padding:0 7px}
.ax-tf{display:block;font-weight:600;font-size:15px;margin-top:3px;line-height:1.35}.ax-t{display:block;font-size:12.5px;color:var(--grey);margin-top:2px;overflow-wrap:anywhere}
.ax-fig{display:flex;flex-wrap:wrap;gap:6px 18px;margin:8px 0 4px}.ax-fig span{display:flex;flex-direction:column;min-width:0}.ax-fig small{font-size:11.5px;color:var(--light)}.ax-fig b{font-family:var(--mono);font-size:14px}
.ax-cl{margin:8px 0 2px;padding:9px 12px;border-left:3px solid var(--c,#1E6FD9);background:color-mix(in srgb,var(--c,#1E6FD9) 6%,transparent);border-radius:0 8px 8px 0;font-size:13.5px}
.ax-cl p{margin:2px 0 6px}.ax-cl p:last-of-type{margin-bottom:2px}.ax-cl b{font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--grey)}.ax-cl small{display:block;color:var(--light);font-size:11.5px}
.ax-cl ul{margin:2px 0;padding-left:18px}.ax-src{display:inline-block;margin-top:6px;font-size:12.5px}
.ax-why{font-size:12.5px;color:var(--grey);margin:4px 0 0}
.ax-day{font-size:12px;font-weight:600;color:var(--grey);text-transform:uppercase;letter-spacing:.04em;padding:14px 0 6px;border-bottom:1px solid var(--soft)}.ax-day:first-child{padding-top:2px}
.ax-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 18px}.ax-tile{border:1px solid var(--rule);border-radius:10px;padding:10px 12px;min-width:0}
.ax-tile b{display:block;font-family:var(--mono);font-size:21px;line-height:1.2}.ax-tile span{display:block;font-size:12.5px;color:var(--grey)}.ax-tile small{display:block;font-size:11.5px;color:var(--light);margin-top:2px}
.ax-tile.up b{color:var(--up,#1E8A52)}.ax-tile.dn b{color:var(--down,#B42318)}
.ax-bar{display:flex;flex-direction:column;gap:10px;padding:12px 16px;border-bottom:1px solid var(--rule)}.ax-bar .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.ax-bar .chips::-webkit-scrollbar{display:none}.ax-bar .chips button{white-space:nowrap}
.ax-row{display:flex;gap:10px;flex-wrap:wrap}.ax-row select,.ax-row input{min-width:0;flex:1 1 180px;max-width:320px;border:1px solid var(--rule);border-radius:8px;padding:7px 10px;font:inherit;font-size:13.5px;background:var(--bg,#fff);color:inherit}
.ax-more{display:block;margin:14px auto 4px}.ax-empty{padding:18px 4px;color:var(--grey);font-size:13.5px}
.ax-pr{display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid var(--soft)}.ax-pr:last-child{border-bottom:0}.ax-pr .pt{font-weight:500;font-size:14px;overflow-wrap:anywhere}.ax-pr .pm{font-size:12px;color:var(--light)}
.ax-sources{font-size:12.5px;color:var(--grey);line-height:1.6}.ax-sources b{color:var(--ink)}
.ax-side .ax-it{padding:10px 0}.ax-side .ax-tf{font-size:14px}.ax-side .ax-cap{font-size:12px;font-weight:600;color:var(--grey);text-transform:uppercase;letter-spacing:.04em;margin:4px 0 2px}
.ax-band{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:20px}
@media (max-width:900px){.ax-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.ax-band{grid-template-columns:minmax(0,1fr)}}
</style>`);

/* ---------- Chargement (avec délai maximal : jamais de « Chargement… » sans fin) ---------- */
// Titres de presse collectés avec des entités HTML (&#xE9;…) : décodés une fois, au chargement (le collecteur data/actu.mjs les décode désormais lui-même)
const actuDec = s => typeof s !== "string" || s.indexOf("&") < 0 ? s : s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&(amp|quot|apos|nbsp);/g, (m, k) => ({ amp: "&", quot: '"', apos: "'", nbsp: " " }[k]));
function actuDecodeTitres(j) { if (j && Array.isArray(j.p)) j.p.forEach(a => { if (a) a.t = actuDec(a.t); }); return j; }
function actuGet(u, ms = 8000) {
  if (ACTU_MEM[u]) return ACTU_MEM[u];
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), ms);
  const p = fetch(u, ctl ? { signal: ctl.signal } : {}).then(r => r.ok ? r.json() : null).then(actuDecodeTitres).catch(() => null).finally(() => clearTimeout(t));
  ACTU_MEM[u] = p; p.then(j => { if (!j) delete ACTU_MEM[u]; });
  return p;
}
function actuFil() { return actuGet("/data/actu/fil.json").then(j => j || { o: [], p: [], sources: [], jours: [] }); }
function actuCo(id) { return actuGet(`/data/actu/c/${encodeURIComponent(id)}.json`).then(j => j || { id, o: [], p: [] }); }
const actuJour = d => actuGet(`/data/actu/j/${d}.json`).then(j => (j && j.o) || []);

/* ---------- Rendu d'une annonce ---------- */
function actuSrcLink(it) {
  const s = ACTU_SRC[it.s] || "source officielle", lg = it.l && it.l !== "fr" && ACTU_LANG[it.l] ? `, ${ACTU_LANG[it.l]}` : "", pdf = /\.pdf($|\?)/i.test(it.u) ? ", PDF" : "";
  return `<a class="lnk ax-src" href="${esc(it.u)}" target="_blank" rel="noopener">Lire l'annonce (${esc(s)}${lg}${pdf})</a>`;
}
function actuItemHTML(it, { showCo = true, detail = true } = {}) {
  const C = ACTU_CAT[it.c] || ACTU_CAT.autre, co = RBY[it.id];
  const figs = it.f && it.f.length ? `<div class="ax-fig">${it.f.slice(0, detail ? 5 : 3).map(([l, v]) => `<span><small>${esc(l)}</small><b>${esc(v)}</b></span>`).join("")}</div>` : "";
  let clair = "";
  if (detail && it.x && it.x.c) clair = `<div class="ax-cl" style="--c:${C.c}"><b>En clair</b><p>${esc(it.x.c)}</p>${it.x.ch ? `<b>Ce que cela change pour l'entreprise</b><p>${esc(it.x.ch)}</p>` : ""}<small>Rédigé par une IA à partir de l'annonce et des chiffres ci-dessus. La source fait foi.</small></div>`;
  else if (detail && it.r && it.r.length) clair = `<div class="ax-cl" style="--c:${C.c}"><b>En clair</b><ul>${it.r.map(x => `<li>${esc(x)}</li>`).join("")}</ul><small>Calculé par le site à partir des chiffres de l'annonce.</small></div>`;
  const gen = !it.tf || /^(Communiqué|Information importante)$/.test(it.tf), main = gen && it.t ? it.t : (it.tf || C.l), sub = !gen && it.t && it.t !== it.tf ? it.t : "";
  return `<div class="ax-it">${showCo ? (co ? `<a href="/entreprise/${co.id}/actualite" class="nlogo" aria-hidden="true" tabindex="-1">${logo(co, 36)}</a>` : "") : ""}
    <div class="ax-b"><div class="ax-m">${showCo && co ? `<a class="nco" href="/entreprise/${co.id}/actualite">${esc(co.name)}</a>` : ""}<span class="ax-chip" style="--c:${C.c}" title="${esc(C.why)}">${C.l}</span>${it.p ? `<span class="ax-imp" title="Information privilégiée : un fait susceptible d'influencer le cours, que l'entreprise doit publier sans délai">Info. privilégiée</span>` : ""}<span>${hhmm(it.d) || dShort(it.d)}</span></div>
      <span class="ax-tf">${esc(main)}</span>${sub ? `<span class="ax-t">${esc(sub)}</span>` : ""}
      ${figs}${clair}${detail && !(it.x && it.x.c) && it.i >= 2 && !C.routine ? `<button type="button" class="iabtn" data-clair="${esc(it.id)}|${esc(it.k)}">✦ Expliquer en clair</button><div class="iabox"></div>` : ""}${actuSrcLink(it)}</div></div>`;
}
function actuListHTML(items, opts = {}) {
  if (!items.length) return `<div class="ax-empty">${opts.vide || "Aucune annonce pour ce choix."}</div>`;
  let out = "", last = "";
  for (const it of items) {
    if (opts.days !== false) { const dk = dayKey(it.d); if (dk !== last) { out += `<div class="ax-day">${esc(dayLabel(it.d))}</div>`; last = dk; } }
    out += actuItemHTML(it, opts);
  }
  return `<div class="ax-list">${out}</div>`;
}
const actuImp = it => !(ACTU_CAT[it.c] || {}).routine && it.i >= 1;
const actuType = (it, f) => f === "tout" ? true : f === "imp" ? actuImp(it) : f === "operation" ? it.c === "operation" || it.c === "contrat" : it.c === f;

/* ---------- Presse ---------- */
function presseHTML(items, max = 8) {
  const dec = x => String(x || "").replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
  const L = (items || []).map(a => ({ t: dec(a.t || a.title), u: a.u || a.url, s: a.s || a.site || "", d: a.d || a.date || "", l: a.l || (a.lang === "French" ? "fr" : a.lang === "English" ? "en" : "") })).filter(a => a.t && a.u);
  if (!L.length) return `<div class="ax-empty" style="padding:6px 0">Aucun article récent repéré dans les médias suivis.</div>`;
  return `<div class="press">${L.slice(0, max).map(a => `<a class="ax-pr" href="${esc(a.u)}" target="_blank" rel="noopener nofollow"><span class="pt">${esc(a.t)}</span><span class="pm">${esc(String(a.s).replace(/^www\./, ""))}${a.l ? ` · ${esc(a.l.toUpperCase())}` : ""}${a.d ? ` · ${dShort(a.d)}` : ""}</span></a>`).join("")}</div>`;
}
const ACTU_PNOTE = `<p class="note" style="margin-top:6px">Titres repérés par le site dans des médias reconnus (index ouvert GDELT, flux de BBC News). L'article se lit chez l'éditeur ; le site n'en reprend pas le texte.</p>`;
function presseBlock(el, { id = null, sujet = null, max = 8 } = {}) {
  if (!el) return;
  el.innerHTML = `<div class="muted" style="font-size:13px">Chargement…</div>`;
  const fin = L => { el.innerHTML = presseHTML(L, max) + (L.length ? ACTU_PNOTE : ""); };
  const secours = () => { // la route du serveur (GDELT en direct), avec délai maximal
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
    return fetch(`/api/presse?${id ? "id=" + encodeURIComponent(id) : "sujet=" + sujet}`, { signal: ctl.signal }).then(r => r.ok ? r.json() : { items: [] }).then(j => j.items || []).catch(() => []).finally(() => clearTimeout(t));
  };
  let collecte = false; // le fichier de l'entreprise existe : la collecte est passée, inutile d'interroger GDELT en direct
  const p = id ? actuGet(`/data/actu/c/${encodeURIComponent(id)}.json`).then(j => { collecte = !!j; return (j && j.p) || []; }) : actuFil().then(j => (j.p || []).filter(a => sujet === "monde" ? a.l !== "fr" : a.l === "fr" || sujet !== "marches"));
  p.then(L => L.length || collecte ? L : secours()).then(fin).catch(() => fin([]));
}

/* ---------- Bloc d'annonces réutilisable (compatible avec les appels existants) ---------- */
function newsBlock(target, { src = "FR", params = "", id = null, limit = 100, max = 40, showCo = true, filters = true, f = "imp" } = {}) {
  if (!target) return;
  if (!id) { const m = String(params).match(/isin=([A-Z0-9]{12})/); if (m) { const c = R.companies.find(x => x.isin === m[1]); if (c) id = c.id; } }
  target.innerHTML = `${filters ? `<div class="chips nfil">${ACTU_TYPES.map(([k, l]) => `<button type="button" data-f="${k}" class="${k === f ? "on" : ""}">${l}</button>`).join("")}</div>` : ""}<div class="nlist"><div class="ax-empty">Chargement…</div></div>`;
  const list = $(".nlist", target);
  const p = id ? actuCo(id).then(j => j.o || []) : actuFil().then(j => (j.o || []).filter(it => { const c = RBY[it.id]; if (!c) return false; return /suivies|^$/.test(params) && src !== "US" ? c.region === "FR" || !params : src === "US" ? c.region === "US" : true; }));
  p.then(items => {
    const draw = () => { const L = items.filter(it => actuType(it, f)); list.innerHTML = actuListHTML((L.length || f !== "imp" ? L : items).slice(0, max), { showCo, detail: !!filters, vide: "Aucune annonce officielle repérée ces 90 derniers jours dans les sources suivies." }); };
    draw();
    if (filters) $(".nfil", target).onclick = e => { const b = e.target.closest("button"); if (!b) return; f = b.dataset.f; $$(".nfil button", target).forEach(x => x.classList.toggle("on", x === b)); draw(); };
  }).catch(() => { list.innerHTML = `<div class="ax-empty">Les annonces ne sont pas disponibles pour le moment.</div>`; });
}
function amfBlock(target, params, limit) { newsBlock(target, { params: "", max: limit || 5, filters: false }); }

/* ---------- Fiche entreprise : bloc court (colonne latérale) et onglet détaillé ---------- */
function actuFicheCourt(el, s, { max = 4 } = {}) {
  if (!el || !s) return;
  el.innerHTML = `<div class="ax-side"><div class="ax-empty" style="padding:6px 0">Chargement…</div></div>`;
  actuCo(s.id).then(j => {
    const o = (j.o || []).filter(actuImp).slice(0, max), p = (j.p || []).slice(0, 3);
    el.innerHTML = `<div class="ax-side">${o.length ? `<div class="ax-cap">Annonces officielles</div>${actuListHTML(o, { showCo: false, detail: false, days: false })}` : ""}
      ${p.length ? `<div class="ax-cap" style="margin-top:8px">Dans la presse</div>${presseHTML(p, 3)}` : ""}
      ${!o.length && !p.length ? `<div class="ax-empty" style="padding:6px 0">Pas d'annonce ni d'article repéré ces dernières semaines.${eventsOf(s.id).some(e => e.date >= TODAY) ? " Les prochaines dates sont dans l'agenda." : ""}</div>` : ""}
      ${el.closest("#actus") ? "" : `<a class="more" href="/entreprise/${s.id}/actualite">Toutes les actualités →</a>`}</div>`;
  });
}
function actuFicheDetail(el, s) {
  if (!el || !s) return;
  el.innerHTML = `<section class="panel"><div class="ph"><h2>Annonces officielles</h2><span class="light" id="ax-n" style="font-size:12.5px"></span></div><div class="pb" id="ax-o"><div class="ax-empty">Chargement…</div></div><div class="src" id="ax-os"></div></section>
    <section class="panel"><div class="ph"><h2>Dans la presse</h2><span class="light" style="font-size:12.5px">30 derniers jours</span></div><div class="pb" id="ax-p"></div></section>`;
  actuCo(s.id).then(j => {
    const o = j.o || [], srcs = [...new Set(o.map(x => ACTU_SRC[x.s]).filter(Boolean))];
    $("#ax-n").textContent = o.length ? `${o.length} sur 90 jours` : "";
    $("#ax-os").innerHTML = srcs.length ? `Source : ${esc(srcs.join(", "))}. Titres et chiffres d'origine, classement et lecture par le site.` : "";
    const box = $("#ax-o");
    if (!o.length) { actuSecours(box, s); }
    else {
      let f = o.some(actuImp) ? "imp" : "tout", n = 15;
      const draw = () => { const L = o.filter(it => actuType(it, f)); box.innerHTML = `<div class="chips nfil scroll-x" style="flex-wrap:nowrap">${ACTU_TYPES.filter(([k]) => k === "imp" || k === "tout" || o.some(it => actuType(it, k))).map(([k, l]) => `<button type="button" data-f="${k}" class="${k === f ? "on" : ""}">${l}</button>`).join("")}</div>
        ${actuListHTML(L.slice(0, n), { showCo: false, vide: "Aucune annonce de ce type ces 90 derniers jours." })}${L.length > n ? `<button type="button" class="btn ghost ax-more" data-more>Afficher plus (${L.length - n})</button>` : ""}`; };
      draw();
      box.onclick = e => { const b = e.target.closest(".nfil button"); if (b) { f = b.dataset.f; n = 15; draw(); return; } if (e.target.closest("[data-more]")) { n += 20; draw(); } };
    }
    const p = j.p || [];
    if (p.length) $("#ax-p").innerHTML = presseHTML(p, 20) + ACTU_PNOTE; else presseBlock($("#ax-p"), { id: s.id, max: 15 });
  });
}
// Aucune annonce collectée : dernières publications officielles connues (comptes annuels) et lien vers l'entreprise
function actuSecours(box, s) {
  const lien = typeof officielLink === "function" ? officielLink(s) : null;
  box.innerHTML = `<div class="ax-empty">Aucune annonce repérée ces 90 derniers jours dans les sources suivies (AMF, SEC, Nasdaq Nordic, Oslo Børs, FCA).</div>`;
  if (s.region === "FR" && typeof loadAmf === "function") loadAmf("&isin=" + s.isin, 30).then(L => { if (L.length) box.innerHTML = newsHTML(L, { showCo: false, max: 15 }); }).catch(() => { });
  actuGet(`/data/societes/${s.id}.json`).then(c => {
    const src = c && (c.sources || []).slice(-3).reverse();
    const lignes = (src || []).filter(x => x.report || x.json).map(x => `<li>Comptes annuels de l'exercice clos le ${esc((d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? dLabel(d) : d || "?")(String(x.periodEnd || "").slice(0, 10)))} : <a class="lnk" href="${esc(x.report || x.json)}" target="_blank" rel="noopener">document officiel</a></li>`);
    if (lignes.length || lien) box.insertAdjacentHTML("beforeend", `<div style="margin-top:6px"><div class="ax-cap" style="font-size:12px;font-weight:600;color:var(--grey);text-transform:uppercase;letter-spacing:.04em">Dernières publications officielles connues</div><ul style="margin:6px 0 0;padding-left:18px;font-size:13.5px">${lignes.join("")}${lien ? `<li>Communiqués de l'entreprise : <a class="lnk" href="${esc(lien)}" target="_blank" rel="noopener">site officiel</a></li>` : ""}</ul></div>`);
  });
}

/* ---------- Accueil : « Ce qui se passe dans les entreprises » ---------- */
function actuBandeauHTML() {
  setTimeout(() => $$("[data-actu-band]").forEach(el => { if (!el.dataset.ok) actuBandeau(el); }), 0);
  return `<div data-actu-band><div class="ax-empty">Chargement…</div></div>`;
}
function actuBandeau(el) {
  if (!el) return; el.dataset.ok = "1";
  actuFil().then(j => {
    const fav = new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
    const o = (j.o || []).filter(it => it.i >= 3 && RBY[it.id]);
    const mine = o.filter(it => fav.has(it.id)), L = (mine.length >= 3 ? mine : o).slice(0, 5);
    const p = (j.p || []).filter(a => RBY[a.id] && (fav.size ? fav.has(a.id) : true)).slice(0, 5);
    el.innerHTML = `<div class="ax-band"><section class="panel"><div class="ph"><h2>${mine.length >= 3 ? "Annonces de vos favoris" : "Dernières annonces importantes"}</h2><a href="/actualites">Toutes</a></div><div class="pb">${actuListHTML(L, { detail: false, days: false, vide: "Aucune annonce importante ces derniers jours." })}</div></section>
      <section class="panel"><div class="ph"><h2>Dans la presse</h2><a href="/actualites?vue=presse">Toute la presse</a></div><div class="pb">${presseHTML(p.length ? p : (j.p || []).slice(0, 5), 5)}</div></section></div>`;
  });
}

/* ---------- Page /actualites ---------- */
function actuStats(L) { // « Les chiffres à retenir », calculés sur les annonces affichées
  const res = L.filter(x => x.c === "resultats"), g = [];
  for (const x of res) { const v = (x.f || []).find(([l]) => /^(Ventes|Chiffre d'affaires)/.test(l)); const m = v && v[1].match(/\(([+−-])(\d+(?:,\d+)?) %\)/); if (m) g.push((m[1] === "+" ? 1 : -1) * parseFloat(m[2].replace(",", "."))); }
  const up = g.filter(v => v > 0).length, med = g.length ? median(g) : null;
  return [
    [F0.format(L.length), "annonces", "sur la période affichée"],
    [F0.format(res.length), "publications de résultats", `${new Set(res.map(x => x.id)).size} entreprises`],
    g.length >= 3 ? [`${Math.round(up / g.length * 100)} %`, "ont des ventes en hausse", `médiane ${med > 0 ? "+" : ""}${F1.format(med)} % sur un an (${g.length} annonces chiffrées)`, up / g.length >= 0.5 ? "up" : "dn"] : [F0.format(L.filter(x => x.c === "dividende").length), "annonces de dividende", "montants et dates"],
    [F0.format(L.filter(x => x.c === "operation").length + L.filter(x => x.c === "dirigeants" && x.i >= 3).length), "acquisitions, OPA ou changements de dirigeant", "à lire en priorité"],
  ];
}
function pageActus() {
  setTitle("Actualité des entreprises"); setNav("news");
  const q = new URLSearchParams(location.search), old = q.get("src");
  const st = { zone: q.get("zone") || (old === "us" ? "US" : old === "fr" || old === "toutes" ? "FR" : "tout"), type: q.get("type") || "imp", sect: q.get("secteur") || "", vue: q.get("vue") || (old === "monde" || old === "une" ? "presse" : "annonces"), qq: "", n: 40, jours: 0 };
  if (!ACTU_ZONES.some(z => z[0] === st.zone)) st.zone = "tout"; if (!ACTU_TYPES.some(t => t[0] === st.type)) st.type = "imp";
  app.innerHTML = `<h1 class="pagetitle">Actualité des entreprises</h1><p class="pagesub">Les annonces officielles des entreprises suivies, classées, chiffrées et expliquées, et les titres de la presse. Les dates à venir sont dans l'<a class="lnk" href="/agenda">agenda</a>.</p>
    <div id="ax-tiles"></div>
    <section class="panel"><div class="filters" id="ax-vue"><button type="button" data-v="annonces">Annonces officielles</button><button type="button" data-v="presse">Dans la presse</button></div>
      <div class="ax-bar"><div class="chips scroll-x" id="ax-zone">${ACTU_ZONES.map(([k, l]) => `<button type="button" data-z="${k}">${l}</button>`).join("")}</div>
        <div class="chips scroll-x" id="ax-type">${ACTU_TYPES.map(([k, l]) => `<button type="button" data-t="${k}">${l}</button>`).join("")}</div>
        <div class="ax-row"><select id="ax-sect" aria-label="Secteur"><option value="">Tous les secteurs</option>${Object.entries(R.sectors).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select><input id="ax-q" type="search" placeholder="Filtrer par entreprise" aria-label="Filtrer par entreprise"></div></div>
      <div class="pb" id="ax-feed"><div class="ax-empty">Chargement…</div></div><div class="src" id="ax-srcs"></div></section>`;
  $("#ax-sect").value = st.sect;
  let FIL = null, EXTRA = [];
  const fav = () => new Set(favs().filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const keep = (id) => { const c = RBY[id]; if (!c) return false; if (st.zone === "fav" && !fav().has(id)) return false; if (st.zone === "EU" && !(c.region === "EU" || c.region === "FR")) return false; if (/^(FR|US|MONDE)$/.test(st.zone) && c.region !== st.zone) return false; if (st.sect && c.sector !== st.sect) return false; if (st.qq && !norm(c.name).includes(norm(st.qq))) return false; return true; };
  const url = () => { const u = new URLSearchParams(); if (st.zone !== "tout") u.set("zone", st.zone); if (st.type !== "imp") u.set("type", st.type); if (st.sect) u.set("secteur", st.sect); if (st.vue !== "annonces") u.set("vue", st.vue); history.replaceState({}, "", "/actualites" + (u.toString() ? "?" + u : "")); };
  const draw = () => {
    $$("#ax-vue button").forEach(b => b.classList.toggle("on", b.dataset.v === st.vue)); $$("#ax-zone button").forEach(b => b.classList.toggle("on", b.dataset.z === st.zone)); $$("#ax-type button").forEach(b => b.classList.toggle("on", b.dataset.t === st.type));
    $("#ax-type").style.display = st.vue === "presse" ? "none" : "";
    url(); if (!FIL) return;
    const feed = $("#ax-feed");
    if (st.zone === "fav" && !fav().size) { feed.innerHTML = `<div class="ax-empty">Vous ne suivez encore aucune entreprise. Ajoutez-en depuis leur fiche avec le bouton « Ajouter aux favoris ».</div>`; $("#ax-tiles").innerHTML = ""; return; }
    if (st.vue === "presse") {
      const P = (FIL.p || []).filter(a => keep(a.id));
      feed.innerHTML = P.length ? `<div class="press">${P.slice(0, st.n).map(a => `<a class="ax-pr" href="${esc(a.u)}" target="_blank" rel="noopener nofollow"><span class="pm"><b style="color:var(--ink)">${esc(RBY[a.id].name)}</b> · ${hhmm(a.d) || dShort(a.d)}</span><span class="pt">${esc(a.t)}</span><span class="pm">${esc(a.s)}${a.l ? " · " + esc(a.l.toUpperCase()) : ""}</span></a>`).join("")}</div>${P.length > st.n ? `<button type="button" class="btn ghost ax-more" data-more>Afficher plus</button>` : ""}${ACTU_PNOTE}` : `<div class="ax-empty">Aucun titre de presse récent pour ce choix.</div>`;
      $("#ax-tiles").innerHTML = ""; return;
    }
    const all = [...(FIL.o || []), ...EXTRA].filter(it => keep(it.id) && actuType(it, st.type));
    const tiles = actuStats(all);
    $("#ax-tiles").innerHTML = `<p class="kick" style="margin:0 0 8px">Les chiffres à retenir</p><div class="ax-tiles">${tiles.map(([v, l, s, c]) => `<div class="ax-tile ${c || ""}"><b>${v}</b><span>${esc(l)}</span><small>${esc(s)}</small></div>`).join("")}</div>`;
    const more = all.length > st.n || st.jours < (FIL.jours || []).length;
    feed.innerHTML = actuListHTML(all.slice(0, st.n), { vide: "Aucune annonce pour ce choix sur les derniers jours." }) + (more ? `<button type="button" class="btn ghost ax-more" data-more>Afficher plus</button>` : "");
  };
  const loadMore = async () => {
    const shown = [...(FIL.o || []), ...EXTRA].filter(it => keep(it.id) && actuType(it, st.type)).length;
    if (shown > st.n) { st.n += 40; draw(); return; }
    const have = new Set([...(FIL.o || []), ...EXTRA].map(x => day(x.d)));
    const next = (FIL.jours || []).filter(d => !have.has(d) || d < [...have].sort()[0]).slice(0, 3);
    st.jours += 3; st.n += 40;
    for (const d of next) { const L = await actuJour(d); const ks = new Set([...(FIL.o || []), ...EXTRA].map(x => x.k)); EXTRA.push(...L.filter(x => !ks.has(x.k))); }
    EXTRA.sort((a, b) => b.d.localeCompare(a.d)); draw();
  };
  const day = d => String(d).slice(0, 10);
  $("#ax-vue").onclick = e => { const b = e.target.closest("button"); if (b) { st.vue = b.dataset.v; st.n = 40; draw(); } };
  $("#ax-zone").onclick = e => { const b = e.target.closest("button"); if (b) { st.zone = b.dataset.z; st.n = 40; draw(); } };
  $("#ax-type").onclick = e => { const b = e.target.closest("button"); if (b) { st.type = b.dataset.t; st.n = 40; draw(); } };
  $("#ax-sect").onchange = e => { st.sect = e.target.value; st.n = 40; draw(); };
  let tq = null; $("#ax-q").oninput = e => { clearTimeout(tq); tq = setTimeout(() => { st.qq = e.target.value.trim(); st.n = 40; draw(); }, 250); };
  $("#ax-feed").onclick = e => { if (e.target.closest("[data-more]")) { if (st.vue === "presse") { st.n += 40; draw(); } else loadMore(); } };
  draw();
  actuFil().then(j => {
    FIL = j; draw();
    const S = j.sources || [];
    $("#ax-srcs").innerHTML = S.length ? `<div class="ax-sources">Mis à jour ${j.maj ? `le ${esc(dLabel(j.maj.slice(0, 10)))} à ${esc(hhmm(j.maj))}` : ""}. Sources : ${S.map(x => `<a class="lnk" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.nom)}</a>${x.at ? ` (${esc(hhmm(x.at) || dShort(x.at))})` : ""}`).join(", ")}. Titres et liens d'origine ; classement, chiffres et explications calculés par le site, sans conseil d'investissement.</div>` : "";
  });
}

// « Expliquer en clair » : rédigé par l'IA connectée du visiteur (m/monia.js) à partir des faits de l'annonce ; sinon, les phrases calculées restent affichées.
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-clair]"); if (!b) return; e.preventDefault();
  const [id, k] = b.dataset.clair.split("|"), box = b.nextElementSibling;
  if (!miaConnectee()) { b.remove(); box.outerHTML = miaInvite(); return; }
  b.disabled = true; b.textContent = "Rédaction en cours…";
  const co = RBY[id], it = ((await actuCo(id)).o || []).find(x => x.k === k);
  if (!it) { b.remove(); box.outerHTML = `<p class="ax-why">Annonce introuvable : rechargez la page.</p>`; return; }
  const f = co && co.ca != null ? { ventes_millions: co.ca, devise: co.currency } : null;
  const j = await iaRediger("annonce", { entreprise: co ? co.name : id, secteur: co ? secName(co) : null, activite: co && co.fiche ? co.fiche.fait : co ? co.desc : null, type: it.tf, titre_officiel: it.t, date: String(it.d).slice(0, 10), chiffres: it.f || [], lecture_calculee: it.r || [], dernier_exercice: f, lien: it.u }, { max: 420 });
  b.remove();
  const x = j.txt ? jsonFrom(j.txt) : null;
  box.outerHTML = x && x.clair ? `<div class="ax-cl"><b>En clair</b><p>${esc(x.clair)}</p>${x.change ? `<b>Ce que cela change pour l'entreprise</b><p>${esc(x.change)}</p>` : ""}<small>Rédigé par l'IA de bilan. (${esc(j.modele)}) à partir de l'annonce. La source fait foi.</small></div>`
    : j.txt ? `<div class="ax-cl"><b>En clair</b>${resumeHTML(j.txt)}<small>Rédigé par l'IA de bilan. (${esc(j.modele)}) à partir de l'annonce. La source fait foi.</small></div>` : `<p class="ax-why">${esc(j.error || "Explication indisponible pour le moment.")}</p>`;
});
