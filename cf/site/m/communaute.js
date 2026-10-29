/* =====================================================================================================
   Module « communaute » (cf/site/m/communaute.js), chargé après m/parcours.js.
   Ce qui est réalisable avec l'architecture (D1, sans compte obligatoire, modération par ADMIN_KEY, pas de liens) :
   1. Analyses argumentées liées à une fiche : thèse, arguments, risques, horizon. Les chiffres de la fiche s'affichent tout seuls
      (calculés par le site au moment de l'affichage, jamais saisis par l'auteur). Votes « utile », réponses, signalement.
   2. Questions et réponses (inchangé côté serveur), avec la même mise en forme.
   3. Listes de suivi publiques : une liste de favoris partagée, avec les chiffres du site pour chaque ligne,
      copiable dans ses favoris ; retrait par l'auteur grâce à une clé gardée sur son appareil.
   4. Pronostics de résultats et portefeuilles partagés anonymement : repris tels quels.
   Les anciens messages libres (discussions, avis, idées) restent lisibles sur les fiches et dans /communaute?salon=….
   Remplace : pageCommunaute, tabCommu, chatBlock (bloc « Discussion » des fiches entreprise et ETF), qGuide.
   ===================================================================================================== */
const CMU_TABS = [["analyses", "Analyses"], ["questions", "Questions"], ["listes", "Listes de suivi"], ["pronostics", "Pronostics"]];
const CMU_HZ = { court: ["Court terme", "moins d'un an"], moyen: ["Moyen terme", "1 à 5 ans"], long: ["Long terme", "plus de 5 ans"] };
const CMU_CLES = "bilan.listes.cles";
const CMU_RAPPEL = "Contributions de visiteurs, non vérifiées par bilan. Ce ne sont pas des conseils en investissement : vérifiez toujours sur la fiche et dans les comptes officiels.";
const cmuMeta = m => { try { return m && m.meta ? JSON.parse(m.meta) : null; } catch (e) { return null; } };
const cmuDate = t => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const cmuNom = r => r.startsWith("etf-") ? (ETFBY[r.slice(4)] || {}).name : (RBY[r] || {}).name;
const cmuFiche = r => r.startsWith("etf-") ? `/etf/${r.slice(4)}` : `/entreprise/${r}`;
const cmuLogo = (r, s = 32) => r.startsWith("etf-") ? (ETFBY[r.slice(4)] ? logo({ name: ETFBY[r.slice(4)].issuer, domain: issuerDom(ETFBY[r.slice(4)]) }, s) : "") : (RBY[r] ? logo(RBY[r], s) : "");
const cmuSous = r => r.startsWith("etf-") ? (ETFBY[r.slice(4)] ? "ETF · " + (ETFBY[r.slice(4)].index || ETFBY[r.slice(4)].issuer) : "ETF") : (RBY[r] ? secName(RBY[r]) : "");
const cmuCles = () => { try { return JSON.parse(localStorage.getItem(CMU_CLES) || "{}") || {}; } catch (e) { return {}; } };
const cmuPost = (u, b) => fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

/* ---------- Les chiffres du site, cités automatiquement ---------- */
// Entreprise : 4 indicateurs de la fiche, comparés à la médiane du secteur. ETF : frais (médiane de sa catégorie), PEA, lignes, encours.
function cmuChiffres(room) {
  if (room.startsWith("etf-")) {
    const e = ETFBY[room.slice(4)]; if (!e) return null;
    const pairs = ETF.list.filter(x => x.categorie === e.categorie && x.ter != null).map(x => x.ter), mt = pairs.length >= 3 ? median(pairs) : null;
    const out = [];
    if (e.ter != null) out.push({ l: "Frais courants", v: nf(2).format(e.ter) + " %", m: mt != null ? nf(2).format(mt) + " %" : null, z: mt == null ? "" : e.ter < mt * 0.85 ? "up" : e.ter > mt * 1.15 ? "dn" : "" });
    if (e.pea != null) out.push({ l: "Éligible au PEA", v: e.pea ? "Oui" : "Non" });
    if (e.compo && e.compo.n) out.push({ l: "Lignes détenues", v: F0.format(e.compo.n) });
    if (e.encours) out.push({ l: "Encours", v: capFmt(e.encours * 1e6) });
    return out.length ? { k: "etf", items: out, src: `Données de l'émetteur (${esc(e.issuer)}) reprises sur la fiche de l'ETF.` } : null;
  }
  const c = RBY[room]; if (!c || c.missing) return null;
  const items = ["croissance", "marge", "dette", "per"].map(k => {
    const f = INDI[k]; let v = null; try { v = f[1](c); } catch (e) { } if (v == null || !isFinite(v)) return null;
    const m = medInd(c.sector, k), z = f[3] == null || m == null ? "" : (f[3] ? v < m * 0.85 : v > m * 1.15) ? "up" : (f[3] ? v > m * 1.15 : v < m * 0.85) ? "dn" : "";
    return { l: f[0], v: f[2](v), m: m != null ? f[2](m) : null, z };
  }).filter(Boolean);
  return items.length ? { k: "c", year: c.year, items, src: `Calculés par bilan. sur les comptes annuels ${c.year || ""} (ESEF ou SEC) et le cours différé, médiane du secteur ${esc(secName(c).toLowerCase())}.` } : null;
}
function cmuChiffresHTML(room, ex) {
  const C = cmuChiffres(room); if (!C) return "";
  const decal = C.k === "c" && ex && C.year && ex !== C.year ? ` L'analyse a été écrite avec les comptes ${ex} ; les chiffres affichés sont ceux de ${C.year}.` : "";
  return `<div class="cmu-fig"><p class="kick">Les chiffres de la fiche</p><div class="cmu-figs">${C.items.map(x => `<span class="cmu-f${x.z ? " " + x.z : ""}"><small>${esc(x.l)}</small><b>${esc(x.v)}</b>${x.m ? `<i>médiane ${esc(x.m)}</i>` : ""}</span>`).join("")}</div>
    <p class="cmu-fsrc">${C.src}${decal} Ajoutés automatiquement, pas par l'auteur.</p></div>`;
}

/* ---------- Une analyse ---------- */
function cmuAnalyseHTML(m, { court = false, fil = false } = {}) {
  const M = cmuMeta(m) || {}, hz = CMU_HZ[M.h], nom = cmuNom(m.room) || m.room, long = m.body.length > 360 && court;
  return `<article class="cmu-an" data-id="${m.id}">
    <header class="cmu-anh"><a class="cmu-co" href="${cmuFiche(m.room)}">${cmuLogo(m.room, 30)}<span><b>${esc(nom)}</b><small>${esc(cmuSous(m.room))}</small></span></a>${hz ? `<span class="cmu-hz" title="Horizon choisi par l'auteur">${hz[0]} <small>${hz[1]}</small></span>` : ""}</header>
    <h3 class="cmu-these">${fil ? "" : `<a href="/communaute?onglet=analyses&a=${m.id}">`}${esc(M.t || "")}${fil ? "" : "</a>"}</h3>
    <div class="cmu-arg${long ? " clamp" : ""}"><p class="kick">Arguments</p><p>${msgBody(m.body)}</p></div>${long ? `<button type="button" class="linkbtn cmu-plus">Lire la suite</button>` : ""}
    ${M.r ? `<div class="cmu-risk"><p class="kick">Risques identifiés par l'auteur</p><p>${msgBody(M.r)}</p></div>` : ""}
    ${cmuChiffresHTML(m.room, M.ex)}
    <div class="cmu-ft"><span class="light">${esc(m.pseudo)} · ${cmuDate(m.created)}</span><span class="cmu-acts"><button type="button" class="cmu-vote" data-a="aime" title="Cette analyse m'a été utile">Utile · ${m.likes || 0}</button>${fil ? "" : `<a class="linkbtn" href="/communaute?onglet=analyses&a=${m.id}">${m.n ? `${m.n} réponse${m.n > 1 ? "s" : ""}` : "Répondre"}</a>`}<button type="button" class="linkbtn light" data-a="signaler">Signaler</button></span></div>
  </article>`;
}
function cmuMsgHTML(m, showRoom) {
  return `<div class="cmu-msg" data-id="${m.id}"><div class="cmu-mh"><b>${esc(m.pseudo)}</b>${showRoom && cmuNom(m.room) ? `<a class="lnk" href="${cmuFiche(m.room)}">${esc(cmuNom(m.room))}</a>` : ""}<span class="light">${cmuDate(m.created)}</span></div>
    <p>${msgBody(m.body)}</p><div class="cmu-acts"><button type="button" class="cmu-vote" data-a="aime">Utile · ${m.likes || 0}</button><button type="button" class="linkbtn light" data-a="signaler">Signaler</button></div></div>`;
}
function cmuBindVotes(root) { // « Utile » et « Signaler », pour les messages et les analyses
  if (!root || root.dataset.cmuv) return; root.dataset.cmuv = "1";
  root.addEventListener("click", ev => {
    const p = ev.target.closest(".cmu-plus"); if (p) { const a = p.previousElementSibling; if (a) a.classList.remove("clamp"); p.remove(); return; }
    const b = ev.target.closest("button[data-a]"); if (!b || b.disabled) return; const card = b.closest("[data-id]"); if (!card) return;
    const L = b.dataset.a.startsWith("l"), id = +card.dataset.id;
    cmuPost(`/api/communaute/${b.dataset.a.replace(/^l-/, "liste/")}`, { id }).then(j => {
      if (j.error) return; b.disabled = true;
      if (/aime|utile/.test(b.dataset.a)) b.textContent = "Utile · " + ((parseInt(b.textContent.replace(/\D/g, ""), 10) || 0) + (j.deja ? 0 : 1)); else b.textContent = "Signalé";
    }).catch(() => { });
  });
}

/* ---------- Choisir une fiche (entreprise ou ETF) ---------- */
function cmuChoix(input, box, done) {
  const all = () => [...R.companies.filter(c => !c.missing).map(c => ({ r: c.id, name: c.name, sub: c.ticker, o: c })), ...ETF.list.map(e => ({ r: "etf-" + e.id, name: e.name, sub: "ETF " + (e.ticker || ""), o: { name: e.issuer, domain: issuerDom(e) } }))];
  let cur = [];
  const draw = () => { const q = norm(input.value); if (q.length < 2) { box.hidden = true; return; }
    cur = all().filter(x => norm(x.name).includes(q) || norm(x.sub) === q).slice(0, 6);
    box.innerHTML = cur.length ? cur.map((x, i) => `<button type="button" data-i="${i}">${logo(x.o, 22)}<span>${esc(x.name)}</span><small>${esc(x.sub)}</small></button>`).join("") : `<div class="mshint">Aucune entreprise ni aucun ETF de ce nom sur le site.</div>`; box.hidden = false; };
  input.addEventListener("input", draw);
  box.addEventListener("pointerdown", e => { const b = e.target.closest("button[data-i]"); if (!b) return; e.preventDefault(); const x = cur[+b.dataset.i]; input.value = x.name; box.hidden = true; done(x.r); });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && cur[0] && !box.hidden) { e.preventDefault(); input.value = cur[0].name; box.hidden = true; done(cur[0].r); } });
  input.addEventListener("blur", () => setTimeout(() => { box.hidden = true; }, 150));
}

/* ---------- Écrire une analyse ---------- */
function cmuFormHTML(room) {
  return `<form class="cmu-form" autocomplete="off" novalidate>
    <p class="cmu-rappel"><b>Avant d'écrire.</b> Une analyse explique ce que vous lisez dans les chiffres et ce qui pourrait vous donner tort. Pas de consigne d'achat ou de vente, pas de promesse de gain, pas de lien.</p>
    ${room ? `<input type="hidden" name="room" value="${esc(room)}">` : `<div class="field mwrap"><label for="cmu-q">Entreprise ou ETF</label><input id="cmu-q" name="q" placeholder="Tapez un nom : LVMH, Amundi PEA Monde…"><div class="msug" hidden></div><input type="hidden" name="room"></div>`}
    <div class="cmu-prev">${room ? cmuChiffresHTML(room) : ""}</div>
    <div class="field"><label for="cmu-t">Votre thèse, en une phrase</label><input id="cmu-t" name="these" maxlength="140" placeholder="Par exemple : la marge résiste malgré le recul des ventes"></div>
    <div class="field mwrap"><label for="cmu-b">Vos arguments <span class="light cmu-n" data-for="body">0 / 2 000</span></label><textarea id="cmu-b" name="body" rows="5" maxlength="2000" placeholder="Ce que vous observez dans les comptes, l'activité, le secteur. Tapez le nom d'une autre entreprise pour la citer."></textarea><div class="msug" hidden></div></div>
    <div class="field"><label for="cmu-r">Ce qui pourrait vous donner tort <span class="light cmu-n" data-for="risques">0 / 800</span></label><textarea id="cmu-r" name="risques" rows="3" maxlength="800" placeholder="Les risques : dette, concurrence, dépendance à un pays ou à un client, valorisation…"></textarea></div>
    <fieldset class="field cmu-hzs"><legend>Horizon</legend>${Object.entries(CMU_HZ).map(([k, [t, d]]) => `<label><input type="radio" name="horizon" value="${k}"><span><b>${t}</b><small>${d}</small></span></label>`).join("")}</fieldset>
    <div class="row2"><div class="field"><label for="cmu-p">Pseudo</label><input id="cmu-p" name="pseudo" maxlength="30" value="${esc(pseudoGet())}" placeholder="Votre pseudo"></div></div>
    <label class="cmu-ok"><input type="checkbox" name="ok"> Je présente une analyse personnelle, sans inciter à acheter ou à vendre.</label>
    <input name="website" class="hp" tabindex="-1" aria-hidden="true">
    <div class="cmu-send"><button class="btn" type="submit">Publier l'analyse</button><span class="muted cmsg"></span></div></form>`;
}
function cmuBindForm(root, room, done) {
  const form = $(".cmu-form", root), msg = $(".cmsg", form), picked = new Map();
  let fiche = room || "";
  if (!room) cmuChoix($("#cmu-q", form), $("#cmu-q", form).nextElementSibling, r => { fiche = r; form.room.value = r; $(".cmu-prev", form).innerHTML = cmuChiffresHTML(r); });
  mentionSuggest(form.body, form.body.nextElementSibling, picked);
  $$(".cmu-n", form).forEach(n => { const f = form[n.dataset.for], max = +f.maxLength; f.addEventListener("input", () => { n.textContent = `${F0.format(f.value.length)} / ${F0.format(max)}`; }); });
  form.onsubmit = ev => {
    ev.preventDefault();
    const fd = Object.fromEntries(new FormData(form)); fd.room = fiche;
    for (const [label, tok] of picked) fd.body = fd.body.split(label).join(tok);
    const err = !fiche ? "Choisissez l'entreprise ou l'ETF analysé." : (fd.these || "").trim().length < 10 ? "Écrivez votre thèse en une phrase (10 caractères au moins)." : (fd.body || "").trim().length < 80 ? "Développez vos arguments (80 caractères au moins)." : (fd.risques || "").trim().length < 30 ? "Décrivez au moins un risque (30 caractères au moins)." : !fd.horizon ? "Choisissez un horizon." : (fd.pseudo || "").trim().length < 2 ? "Choisissez un pseudo." : !fd.ok ? "Cochez la case de confirmation." : null;
    if (err) { msg.textContent = err; msg.classList.add("err"); return; }
    const C = cmuChiffres(fiche); if (C && C.year) fd.ex = C.year;
    delete fd.ok; delete fd.q; pseudoSet(fd.pseudo); msg.classList.remove("err"); msg.textContent = "Envoi…";
    cmuPost("/api/communaute", fd).then(j => { if (j.error) { msg.textContent = j.error; msg.classList.add("err"); return; } msg.textContent = "Publiée. Merci."; done && done(j.item); })
      .catch(() => { msg.textContent = "Envoi impossible pour le moment."; msg.classList.add("err"); });
  };
}

/* ---------- Page /communaute ---------- */
function pageCommunaute() {
  setTitle("Communauté"); setNav("com");
  const qs = new URLSearchParams(location.search), o = qs.get("onglet");
  const tab = o === "portefeuilles" ? "listes" : o === "discussions" ? "analyses" : CMU_TABS.some(t => t[0] === o) ? o : "analyses";
  app.innerHTML = `<header class="cmu-hero"><h1 class="pagetitle">Communauté</h1>
      <p class="pagesub">Des analyses argumentées sur les entreprises et les ETF du site, des questions de débutants et des listes de suivi partagées. Les chiffres cités viennent toujours du site, jamais des auteurs.</p>
      <p class="cmu-bandeau">${CMU_RAPPEL}</p></header>
    <nav class="qtabs cmu-tabs" aria-label="Communauté">${CMU_TABS.map(([k, n]) => `<a href="/communaute?onglet=${k}" class="${k === tab ? "on" : ""}"${k === tab ? ' aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
    <div id="ctb"><div class="empty">Chargement…</div></div>`;
  ({ analyses: cmuAnalyses, questions: commQuestions, listes: cmuListes, pronostics: commPronos })[tab]($("#ctb"), qs);
  if (o === "portefeuilles") setTimeout(() => { const t = $("#portefeuilles"); if (t) t.scrollIntoView({ block: "start" }); }, 400);
}
function cmuGuide() {
  return `<section class="panel"><div class="ph"><h2>Une bonne analyse</h2></div><div class="pb cmu-guide"><ol>
    <li><b>Une thèse</b> en une phrase : ce que vous pensez avoir compris.</li><li><b>Des arguments</b> vérifiables : ventes, marge, dette, secteur.</li>
    <li><b>Les risques</b> : ce qui pourrait vous donner tort. Obligatoire.</li><li><b>Un horizon</b> : court, moyen ou long terme.</li></ol>
    <p>Les chiffres de la fiche s'ajoutent tout seuls, avec la médiane du secteur. Les lecteurs votent « utile » : les analyses les mieux étayées passent devant.</p>
    <p class="muted">Pas de lien, pas de consigne d'achat ou de vente, pas de promesse de gain. Trois analyses par jour au plus. Un message signalé trois fois est masqué.</p></div></section>`;
}
function cmuAnalyses(el, qs) {
  const id = parseInt(qs.get("a") || "0", 10), salon = qs.get("salon") && qs.get("salon") !== "general" ? qs.get("salon") : "", tri = qs.get("tri") === "recentes" ? "recentes" : "utiles";
  if (id) return cmuFil(el, id);
  const q = (o) => { const p = new URLSearchParams({ onglet: "analyses", ...(salon ? { salon } : {}), tri, ...o }); return "/communaute?" + p; };
  el.innerHTML = `<div class="cols"><div>
      <div class="cmu-bar"><div class="chips cmu-tri"><a class="${tri === "utiles" ? "on" : ""}" href="${q({ tri: "utiles" })}">Les plus utiles</a><a class="${tri === "recentes" ? "on" : ""}" href="${q({ tri: "recentes" })}">Les plus récentes</a></div>
        ${salon ? `<span class="cmu-salon">${cmuLogo(salon, 20)}${esc(cmuNom(salon) || salon)} <a href="/communaute?onglet=analyses" aria-label="Voir toutes les analyses">×</a></span>` : ""}
        <button type="button" class="btn" id="cmu-ecrire">Écrire une analyse</button></div>
      <section class="panel cmu-new" id="cmu-new" hidden><div class="ph"><h2>Nouvelle analyse${salon ? ` sur ${esc(cmuNom(salon) || salon)}` : ""}</h2><button type="button" class="linkbtn" id="cmu-fermer">Fermer</button></div><div class="pb">${cmuFormHTML(salon)}</div></section>
      <div id="cmu-list"><div class="empty">Chargement…</div></div>
      ${salon ? `<div id="cmu-old"></div>` : ""}
    </div><aside>${cmuGuide()}</aside></div>`;
  const nw = $("#cmu-new");
  $("#cmu-ecrire").onclick = () => { nw.hidden = false; nw.scrollIntoView({ block: "start", behavior: "smooth" }); const f = $("#cmu-q") || $("#cmu-t"); if (f) f.focus({ preventScroll: true }); };
  $("#cmu-fermer").onclick = () => { nw.hidden = true; };
  cmuBindForm(nw, salon, item => go(`/communaute?onglet=analyses&a=${item.id}`));
  cmuBindVotes(el);
  fetch(`/api/communaute/analyses?${new URLSearchParams({ tri, ...(salon ? { room: salon } : {}) })}`).then(r => r.json()).then(j => {
    const L = (j.items || []).filter(m => cmuNom(m.room) && cmuMeta(m));
    $("#cmu-list").innerHTML = j.error ? `<div class="empty">${esc(j.error)}</div>` : L.length ? L.map(m => cmuAnalyseHTML(m, { court: true })).join("")
      : `<section class="panel"><div class="empty">Pas encore d'analyse${salon ? " sur " + esc(cmuNom(salon) || salon) : ""}. Lancez-vous : une thèse, vos arguments, les risques et un horizon. Les chiffres de la fiche s'ajoutent tout seuls.</div></section>`;
  }).catch(() => { $("#cmu-list").innerHTML = `<div class="empty">L'espace communauté n'est pas disponible pour le moment.</div>`; });
  if (salon) cmuAnciens($("#cmu-old"), salon);
}
function cmuFil(el, id) {
  el.innerHTML = `<div class="cols"><div id="fil"><div class="empty">Chargement…</div></div><aside>${cmuGuide()}</aside></div>`;
  const load = () => fetch(`/api/communaute/fil?id=${id}`).then(r => r.json()).then(j => {
    if (j.error || !j.question) { $("#fil").innerHTML = `<section class="panel"><div class="empty">${esc(j.error || "Message introuvable.")}</div></section>`; return; }
    const a = j.question, M = cmuMeta(a);
    if (!M) { history.replaceState({}, "", `/communaute?onglet=questions&q=${id}`); return commQuestions(el, new URLSearchParams({ q: id })); }
    setTitle((M.t || "Analyse") + " · Communauté");
    $("#fil").innerHTML = `<p style="margin:0 0 10px"><a class="more" href="/communaute?onglet=analyses">← Toutes les analyses</a></p>${cmuAnalyseHTML(a, { fil: true })}
      <section class="panel"><div class="ph"><h2>${j.answers.length ? `${j.answers.length} réponse${j.answers.length > 1 ? "s" : ""}` : "Pas encore de réponse"}</h2><span class="light" style="font-size:12.5px">Les plus utiles en premier</span></div>
        <div class="pb">${j.answers.map(x => cmuMsgHTML(x, false)).join("") || `<p class="muted" style="margin:0">Une question, un désaccord argumenté, un chiffre à vérifier ? Répondez.</p>`}</div></section>
      <section class="panel"><div class="ph"><h2>Répondre</h2></div><div class="pb" id="rep">${composeHTML("Votre réponse : un argument, une question, un chiffre à vérifier sur la fiche.", "Publier la réponse")}</div></section>`;
    bindCompose($("#rep"), { room: a.room, kind: "avis", parent: id }, load);
    cmuBindVotes($("#fil"));
  }).catch(() => { $("#fil").innerHTML = `<section class="panel"><div class="empty">Indisponible pour le moment.</div></section>`; });
  load();
}
function cmuAnciens(el, room, n) { // anciens messages libres d'un salon : lisibles, plus de nouveaux
  if (!el) return;
  fetch(`/api/communaute?room=${encodeURIComponent(room)}`).then(r => r.json()).then(j => {
    const L = (j.items || []).filter(m => !m.meta && m.parent == null && m.room !== "questions" && m.kind !== "question");
    if (!L.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<details class="cmu-old"><summary>Messages plus anciens (${L.length})</summary><p class="muted">Messages libres publiés avant les analyses argumentées. Ils restent lisibles ; les nouveaux échanges passent par les analyses et les questions.</p>${L.slice(0, n || 50).map(m => cmuMsgHTML(m, m.room !== room)).join("")}</details>`;
    cmuBindVotes(el);
  }).catch(() => { el.innerHTML = ""; });
}

/* ---------- Questions : même page, guide à jour ---------- */
function qGuide() {
  return `<section class="panel"><div class="ph"><h2>Comment ça marche</h2></div><div class="pb cmu-guide"><p style="margin-top:0">Posez une question sur une entreprise, un ETF ou un chiffre que vous ne comprenez pas. Les autres visiteurs répondent ; les réponses jugées utiles remontent en tête.</p>
    <p>Avant de demander, <a class="lnk" href="/apprendre">le parcours pour apprendre</a> et <a class="lnk" href="/lexique">le lexique</a> répondent peut-être déjà. Pour une question sur une fiche, <a class="lnk" href="/demander">l'assistant IA</a> répond tout de suite avec les chiffres du site.</p>
    <p class="muted" style="margin-bottom:0">Pas de liens, pas de conseils d'achat ou de vente, pas d'informations personnelles. Un message signalé trois fois est masqué.</p></div></section>`;
}

/* ---------- Listes de suivi publiques ---------- */
const cmuItems = l => { try { return JSON.parse(l.items || "[]").filter(k => keyName(k)); } catch (e) { return []; } };
function cmuListeCarte(l) {
  const it = cmuItems(l);
  return `<article class="cmu-li" data-id="${l.id}"><a class="cmu-lih" href="/communaute?onglet=listes&liste=${l.id}"><b>${esc(l.titre)}</b><span class="light">${it.length} ligne${it.length > 1 ? "s" : ""} · ${esc(l.pseudo)} · ${cmuDate(l.created)}</span></a>
    ${l.note ? `<p class="cmu-lin">${esc(l.note)}</p>` : ""}
    <div class="cmu-lic">${it.slice(0, 8).map(k => `<a class="chip" href="${keyHref(k)}">${keyLogo(k, 18)}${esc(keyName(k))}</a>`).join("")}${it.length > 8 ? `<span class="light">+${it.length - 8}</span>` : ""}</div>
    <div class="cmu-ft"><a class="more" href="/communaute?onglet=listes&liste=${l.id}">Voir la liste et ses chiffres →</a><span class="cmu-acts"><button type="button" class="cmu-vote" data-a="l-utile">Utile · ${l.likes || 0}</button><button type="button" class="linkbtn light" data-a="l-signaler">Signaler</button></span></div></article>`;
}
function cmuListeTable(it) {
  const cos = it.filter(k => k.startsWith("c:")), etfs = it.filter(k => k.startsWith("e:"));
  const cell = (c, k) => { const f = INDI[k]; let v = null; try { v = f[1](c); } catch (e) { } return tblxZoneCell(v, f[2], v == null ? null : medInd(c.sector, k), f[3], ["croissance", "marge"].includes(k) && medInd(c.sector, k) != null ? Math.max(2, Math.abs(medInd(c.sector, k)) * 0.2) : null); };
  return `${cos.length ? tblxScrollBox(`<table class="t tbx tbx-sort"><thead><tr><th class="l lab" scope="col" data-sk="0">Entreprise<i class="tbx-so"></i></th>${["croissance", "marge", "dette", "per"].map((k, i) => tblxTh(esc(INDI[k][0]), i + 1)).join("")}</tr></thead><tbody>
      ${cos.map((k, j) => { const c = RBY[k.slice(2)]; return `<tr class="${j % 2 ? "z" : ""}"><th scope="row" class="l lab" data-v="${esc(c.name)}"><a class="cell-co" href="/entreprise/${c.id}">${logo(c, 24)}<span><b>${esc(c.name)}</b><small class="light">${esc(secName(c))}</small></span></a></th>${c.missing ? `<td class="num light" colspan="4">comptes non disponibles</td>` : ["croissance", "marge", "dette", "per"].map(x => cell(c, x)).join("")}</tr>`; }).join("")}</tbody></table>`, "Faites glisser pour voir les colonnes") : ""}
    ${etfs.length ? `<div class="cmu-etfs">${etfs.map(k => { const e = ETFBY[k.slice(2)]; return `<a href="/etf/${e.id}">${keyLogo(k, 24)}<span><b>${esc(e.name)}</b><small class="light">${e.ter != null ? `frais ${nf(2).format(e.ter)} % par an` : ""}${e.pea ? " · PEA" : ""}</small></span></a>`; }).join("")}</div>` : ""}
    <p class="cmu-fsrc">Chiffres calculés par bilan. sur les derniers comptes annuels et le cours différé ; couleur : nettement mieux (vert) ou moins bien (orange) que la médiane du secteur. Ajoutés automatiquement, pas par l'auteur.</p>`;
}
function cmuListes(el, qs) {
  const id = parseInt(qs.get("liste") || "0", 10);
  if (id) return cmuListe(el, id);
  const tri = qs.get("tri") === "recentes" ? "recentes" : "utiles", mes = favs().filter(k => keyName(k));
  el.innerHTML = `<div class="cols"><div>
      <div class="cmu-bar"><div class="chips cmu-tri"><a class="${tri === "utiles" ? "on" : ""}" href="/communaute?onglet=listes">Les plus utiles</a><a class="${tri === "recentes" ? "on" : ""}" href="/communaute?onglet=listes&tri=recentes">Les plus récentes</a></div><button type="button" class="btn" id="cmu-partager">Partager ma liste</button></div>
      <section class="panel cmu-new" id="cmu-lnew" hidden><div class="ph"><h2>Partager une liste de suivi</h2><button type="button" class="linkbtn" id="cmu-lfermer">Fermer</button></div><div class="pb">
        <form class="cmu-form" id="cmu-lform" autocomplete="off" novalidate>
          <p class="cmu-rappel">Une liste dit ce que vous suivez et pourquoi, pas ce qu'il faut acheter. Les chiffres de chaque ligne s'ajoutent tout seuls.</p>
          <div class="field"><label for="cmu-lt">Titre</label><input id="cmu-lt" name="titre" maxlength="80" placeholder="Par exemple : les ETF monde éligibles au PEA"></div>
          <div class="field"><label for="cmu-ln">Pourquoi cette liste ? <span class="light">facultatif</span></label><textarea id="cmu-ln" name="note" rows="2" maxlength="400" placeholder="Ce que vous comparez, ce que vous surveillez."></textarea></div>
          <fieldset class="field"><legend>Les lignes <span class="light" id="cmu-lnb"></span></legend><div class="cmu-pick" id="cmu-pick">${mes.map(k => `<label><input type="checkbox" value="${k}" checked>${keyLogo(k, 18)}<span>${esc(keyName(k))}</span></label>`).join("")}</div>
            <div class="mwrap"><input id="cmu-ladd" placeholder="Ajouter une entreprise ou un ETF"><div class="msug" hidden></div></div>${mes.length ? "" : `<p class="muted" style="margin:6px 0 0;font-size:13px">Vos favoris apparaîtront ici. Vous pouvez aussi ajouter les lignes une par une.</p>`}</fieldset>
          <div class="row2"><div class="field"><label for="cmu-lp">Pseudo</label><input id="cmu-lp" name="pseudo" maxlength="30" value="${esc(pseudoGet())}" placeholder="Votre pseudo"></div></div>
          <input name="website" class="hp" tabindex="-1" aria-hidden="true">
          <div class="cmu-send"><button class="btn" type="submit">Publier la liste</button><span class="muted cmsg"></span></div></form></div></section>
      <div id="cmu-ll"><div class="empty">Chargement…</div></div>
      <section class="panel" id="portefeuilles"><div class="ph"><h2>Ce que détiennent les visiteurs</h2><span class="light" id="pfn" style="font-size:12.5px"></span></div><div class="pb" id="pfl"><div class="empty">Chargement…</div></div>
        <div class="src">Portefeuilles partagés anonymement depuis la page <a href="/portefeuille">Portefeuille</a> ces quatre derniers mois : seules les lignes et leur poids sont envoyés, jamais les montants. Ce que détiennent d'autres particuliers n'est pas une recommandation.</div></section>
    </div><aside><section class="panel"><div class="ph"><h2>À quoi ça sert</h2></div><div class="pb cmu-guide"><p style="margin-top:0">Une liste de suivi partagée montre ce qu'un autre visiteur surveille, avec les chiffres du site pour chaque ligne. Vous pouvez la copier dans vos favoris pour la suivre à votre tour.</p><p>Chaque liste a son adresse : vous pouvez l'envoyer à un proche.</p><p class="muted" style="margin-bottom:0">Seul l'appareil qui a publié une liste peut la retirer. Une liste signalée trois fois est masquée.</p></div></section></aside></div>`;
  const nw = $("#cmu-lnew"), form = $("#cmu-lform"), msg = $(".cmsg", form), pick = $("#cmu-pick");
  const nb = () => { const n = $$("input:checked", pick).length; $("#cmu-lnb").textContent = `${n} sélectionnée${n > 1 ? "s" : ""}, 2 à 30`; };
  nb(); pick.addEventListener("change", nb);
  cmuChoix($("#cmu-ladd"), $("#cmu-ladd").nextElementSibling, r => { const k = r.startsWith("etf-") ? "e:" + r.slice(4) : "c:" + r; $("#cmu-ladd").value = "";
    const ex = $(`input[value="${k}"]`, pick); if (ex) ex.checked = true; else pick.insertAdjacentHTML("beforeend", `<label><input type="checkbox" value="${k}" checked>${keyLogo(k, 18)}<span>${esc(keyName(k))}</span></label>`); nb(); });
  $("#cmu-partager").onclick = () => { nw.hidden = false; nw.scrollIntoView({ block: "start", behavior: "smooth" }); };
  $("#cmu-lfermer").onclick = () => { nw.hidden = true; };
  form.onsubmit = ev => {
    ev.preventDefault();
    const fd = Object.fromEntries(new FormData(form)); fd.items = $$("input:checked", pick).map(x => x.value);
    const err = (fd.titre || "").trim().length < 3 ? "Donnez un titre à votre liste." : fd.items.length < 2 ? "Choisissez au moins deux lignes." : fd.items.length > 30 ? "Trente lignes au plus." : (fd.pseudo || "").trim().length < 2 ? "Choisissez un pseudo." : null;
    if (err) { msg.textContent = err; msg.classList.add("err"); return; }
    pseudoSet(fd.pseudo); msg.classList.remove("err"); msg.textContent = "Envoi…";
    cmuPost("/api/communaute/liste", fd).then(j => { if (j.error) { msg.textContent = j.error; msg.classList.add("err"); return; }
      const c = cmuCles(); c[j.id] = j.cle; try { localStorage.setItem(CMU_CLES, JSON.stringify(c)); } catch (e) { } go(`/communaute?onglet=listes&liste=${j.id}`); })
      .catch(() => { msg.textContent = "Envoi impossible pour le moment."; msg.classList.add("err"); });
  };
  cmuBindVotes(el);
  fetch(`/api/communaute/listes?tri=${tri}`).then(r => r.json()).then(j => {
    const L = (j.items || []).filter(l => cmuItems(l).length);
    $("#cmu-ll").innerHTML = L.length ? L.map(cmuListeCarte).join("") : `<section class="panel"><div class="empty">Pas encore de liste partagée. Partagez la vôtre : vos favoris sont déjà prêts.</div></section>`;
  }).catch(() => { $("#cmu-ll").innerHTML = `<div class="empty">L'espace communauté n'est pas disponible pour le moment.</div>`; });
  fetch("/api/communaute/portefeuilles").then(r => r.json()).then(j => {
    $("#pfn").textContent = j.n ? `${j.n} portefeuille${j.n > 1 ? "s" : ""} partagé${j.n > 1 ? "s" : ""}` : "";
    const items = (j.items || []).filter(x => keyName(x.k));
    $("#pfl").innerHTML = items.length ? `${hbars(items.map(x => ({ label: keyName(x.k), v: x.part, href: keyHref(x.k), lg: keyLogo(x.k, 22) })), v => F0.format(v * 100) + " %")}<p class="note">Part des portefeuilles partagés qui contiennent la ligne.</p>` : `<div class="empty">Personne n'a encore partagé son portefeuille.</div>`;
  }).catch(() => { $("#pfl").innerHTML = `<div class="empty">Indisponible pour le moment.</div>`; });
}
function cmuListe(el, id) {
  el.innerHTML = `<div id="cmu-l1"><div class="empty">Chargement…</div></div>`;
  fetch(`/api/communaute/liste?id=${id}`).then(r => r.json()).then(j => {
    const box = $("#cmu-l1"); if (!box) return;
    if (j.error || !j.item) { box.innerHTML = `<p><a class="more" href="/communaute?onglet=listes">← Toutes les listes</a></p><section class="panel"><div class="empty">${esc(j.error || "Liste introuvable.")}</div></section>`; return; }
    const l = j.item, it = cmuItems(l), cle = cmuCles()[l.id], cos = it.filter(k => k.startsWith("c:")).map(k => k.slice(2));
    setTitle(l.titre + " · Liste de suivi");
    box.innerHTML = `<p style="margin:0 0 10px"><a class="more" href="/communaute?onglet=listes">← Toutes les listes</a></p>
      <article class="panel cmu-l1" data-id="${l.id}"><div class="pb"><p class="kick">Liste de suivi de ${esc(l.pseudo)} · ${cmuDate(l.created)}</p><h2 class="cmu-these">${esc(l.titre)}</h2>${l.note ? `<p>${esc(l.note)}</p>` : ""}
        <div class="cmu-lact"><button type="button" class="btn" id="cmu-copier">Ajouter les ${it.length} lignes à mes favoris</button>${cos.length >= 2 ? `<a class="btn ghost" href="/comparer?ids=${cos.slice(0, 4).join(",")}">Comparer${cos.length > 4 ? " les 4 premières" : ""}</a>` : ""}<button type="button" class="linkbtn" id="cmu-lien">Copier le lien</button>
          <span class="cmu-acts"><button type="button" class="cmu-vote" data-a="l-utile">Utile · ${l.likes || 0}</button><button type="button" class="linkbtn light" data-a="l-signaler">Signaler</button>${cle ? `<button type="button" class="linkbtn" id="cmu-retirer">Retirer ma liste</button>` : ""}</span></div>
        <span class="muted cmsg" id="cmu-lmsg"></span>
        ${cmuListeTable(it)}</div></article>`;
    cmuBindVotes(box);
    if (typeof tblxBindScroll === "function") tblxBindScroll(box);
    $("#cmu-copier").onclick = () => { const a = favs().slice(); let n = 0; it.forEach(k => { if (!a.includes(k)) { a.push(k); n++; } }); setFavs(a); $("#cmu-lmsg").textContent = n ? `${n} ligne${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} à vos favoris.` : "Toutes ces lignes sont déjà dans vos favoris."; };
    $("#cmu-lien").onclick = () => { const u = location.origin + `/communaute?onglet=listes&liste=${l.id}`; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { $("#cmu-lmsg").textContent = "Lien copié."; }).catch(() => { $("#cmu-lmsg").textContent = u; }); };
    const rt = $("#cmu-retirer"); if (rt) rt.onclick = () => cmuPost("/api/communaute/liste/retirer", { id: l.id, cle }).then(r => { if (r.error) { $("#cmu-lmsg").textContent = r.error; return; } const c = cmuCles(); delete c[l.id]; try { localStorage.setItem(CMU_CLES, JSON.stringify(c)); } catch (e) { } go("/communaute?onglet=listes"); });
  }).catch(() => { const b = $("#cmu-l1"); if (b) b.innerHTML = `<div class="empty">Indisponible pour le moment.</div>`; });
}

/* ---------- Le bloc « Discussion » des fiches (entreprise et ETF) ---------- */
function chatBlock(el, room, { compact = false } = {}) {
  if (!el) return;
  const nom = cmuNom(room) || roomName(room);
  el.innerHTML = `<div class="cmu-bloc${compact ? " compact" : ""}"><p class="cmu-rappel">${CMU_RAPPEL}</p><div class="cmu-bl"><div class="empty">Chargement…</div></div>
    <div class="cmu-blact"><button type="button" class="btn" data-cmu-ecrire>Écrire une analyse</button><a class="more" href="/communaute?onglet=questions">Poser une question →</a><a class="more" href="/communaute?onglet=analyses&salon=${esc(room)}">Toutes les analyses →</a></div>
    <div class="cmu-blf" hidden>${cmuFormHTML(room)}</div><div class="cmu-blo"></div></div>`;
  const list = $(".cmu-bl", el), fz = $(".cmu-blf", el);
  $("[data-cmu-ecrire]", el).onclick = () => { fz.hidden = !fz.hidden; if (!fz.hidden) { const t = $("[name=these]", fz); if (t) t.focus(); } };
  cmuBindForm(fz, room, () => { fz.hidden = true; load(); });
  cmuBindVotes(el);
  const load = () => fetch(`/api/communaute/analyses?room=${encodeURIComponent(room)}`).then(r => r.json()).then(j => {
    const L = (j.items || []).filter(m => cmuMeta(m));
    list.innerHTML = j.error ? `<div class="empty">${esc(j.error)}</div>` : L.length ? L.slice(0, compact ? 2 : 3).map(m => cmuAnalyseHTML(m, { court: true })).join("") + (L.length > (compact ? 2 : 3) ? `<p class="cmu-more"><a class="more" href="/communaute?onglet=analyses&salon=${esc(room)}">Les ${L.length} analyses sur ${esc(nom)} →</a></p>` : "")
      : `<p class="cmu-vide">Pas encore d'analyse sur ${esc(nom)}. Une thèse, vos arguments, les risques et un horizon : les chiffres de la fiche s'ajoutent tout seuls.</p>`;
  }).catch(() => { list.innerHTML = `<div class="empty">L'espace communauté n'est pas disponible pour le moment.</div>`; });
  load();
  cmuAnciens($(".cmu-blo", el), room, compact ? 5 : 20);
}
function tabCommu(s, c, el) {
  el.innerHTML = `<div class="cols cmu-fiche"><div><section class="panel"><div class="ph"><h2>Analyses des visiteurs sur ${esc(s.name)}</h2></div><div class="pb" id="chat"></div></section></div>
    <aside><section class="panel"><div class="ph"><h2>Avis des visiteurs</h2></div><div class="pb" id="avisb"></div></section></aside></div>`;
  chatBlock($("#chat", el), s.id); avisBlock($("#avisb", el), s.id, s.name);
}

document.head.insertAdjacentHTML("beforeend", `<style id="cmu-css">
.cmu-hero{margin:0 0 6px}
.cmu-bandeau{margin:12px 0 0;padding:9px 14px;border-radius:10px;background:#FFF8EC;border-left:3px solid #E59A3A;font-size:13.5px;line-height:1.45}
.cmu-tabs{margin:14px 0 16px;border-bottom:1px solid var(--line)}
.cmu-bar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin:0 0 12px}
.cmu-bar .btn{margin-left:auto}
.cmu-tri{display:flex;gap:6px;flex-wrap:wrap}
.cmu-tri a{border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-size:13.5px;text-decoration:none;color:inherit;background:#fff}
.cmu-tri a.on{background:var(--ink);border-color:var(--ink);color:#fff}
.cmu-salon{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--ink);border-radius:99px;padding:4px 6px 4px 8px;font-size:13.5px;background:#fff}
.cmu-salon a{text-decoration:none;color:var(--grey);font-size:16px;padding:0 4px}
.cmu-an{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:0 0 12px}
.cmu-bloc .cmu-an{border-radius:12px;padding:14px}
.cmu-anh{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center}
.cmu-co{display:inline-flex;gap:10px;align-items:center;text-decoration:none;color:inherit;min-width:0}
.cmu-co span{display:flex;flex-direction:column;min-width:0}.cmu-co b{font-size:14.5px}.cmu-co small{font-size:12px;color:var(--grey)}
.cmu-hz{font-size:12.5px;font-weight:600;border:1px solid var(--line);border-radius:99px;padding:3px 10px;background:var(--soft);white-space:nowrap}
.cmu-hz small{font-weight:400;color:var(--grey)}
.cmu-these{font-family:var(--serif,inherit);font-size:20px;line-height:1.25;margin:10px 0 8px}
.cmu-these a{color:inherit;text-decoration:none}.cmu-these a:hover{text-decoration:underline}
.cmu-arg p,.cmu-risk p{margin:0;line-height:1.55;font-size:14.5px;overflow-wrap:anywhere}
.cmu-arg .kick,.cmu-risk .kick,.cmu-fig .kick{margin:0 0 3px}
.cmu-arg.clamp p:last-child{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.cmu-plus{font-size:13px;margin-top:2px}
.cmu-risk{margin:10px 0 0;background:#FFF8EC;border-left:3px solid #E59A3A;border-radius:0 10px 10px 0;padding:8px 12px}
.cmu-risk .kick{color:#9A5B00}
.cmu-fig{margin:12px 0 0;border:1px solid var(--line2,#EFEAE0);border-radius:12px;padding:10px 12px;background:#FCFBF8}
.cmu-figs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.cmu-f{display:flex;flex-direction:column;gap:1px;min-width:0;border-left:3px solid var(--line);padding:2px 0 2px 8px}
.cmu-f small{font-size:11.5px;color:var(--grey);line-height:1.3}
.cmu-f b{font:600 15px var(--mono)}
.cmu-f i{font-style:normal;font-size:11.5px;color:var(--grey)}
.cmu-f.up{border-left-color:var(--g)}.cmu-f.up b{color:var(--g)}
.cmu-f.dn{border-left-color:#D9822B}.cmu-f.dn b{color:#A4521A}
.cmu-fsrc{margin:8px 0 0;font-size:12px;color:var(--grey);line-height:1.45}
.cmu-ft{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 14px;align-items:center;margin-top:12px;font-size:13px}
.cmu-acts{display:inline-flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
.cmu-vote{border:1px solid var(--g);color:var(--g);background:#fff;border-radius:99px;padding:4px 11px;font:600 12.5px var(--sans,inherit);cursor:pointer}
.cmu-vote:disabled{background:#E5F2EA;cursor:default}
.cmu-form{display:grid;gap:12px}
.cmu-form .field{margin:0;min-width:0}
.cmu-form label,.cmu-form legend{font-size:13.5px;font-weight:600}
.cmu-form input:not([type=radio]):not([type=checkbox]),.cmu-form textarea,.qform textarea,.qform input[name=pseudo]{width:100%;box-sizing:border-box;font:inherit;font-size:15px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:#fff;color:var(--ink)}
.cmu-form textarea,.qform textarea{resize:vertical;min-height:84px;line-height:1.5}
.cmu-form input:focus,.cmu-form textarea:focus,.qform textarea:focus{outline:2px solid var(--g);outline-offset:1px}
.cmu-n{font-weight:400;font-size:12px;float:right}
.cmu-rappel{margin:0;font-size:13px;color:var(--grey);line-height:1.5}
.cmu-hzs{border:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.cmu-hzs legend{margin-bottom:6px}
.cmu-hzs label{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;background:#fff;font-weight:400}
.cmu-hzs label:has(input:checked){border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.cmu-hzs input{accent-color:var(--ink);margin:3px 0 0}
.cmu-hzs span{display:flex;flex-direction:column}.cmu-hzs b{font-size:14px}.cmu-hzs small{font-size:12px;color:var(--grey)}
.cmu-ok{display:flex;gap:8px;align-items:flex-start;font-weight:400!important;font-size:13.5px}
.cmu-ok input{margin-top:3px;accent-color:var(--ink)}
.cmu-send{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.cmsg.err{color:#A4521A}
.cmu-guide ol{margin:0 0 10px;padding-left:18px;display:grid;gap:6px;font-size:14px;line-height:1.45}
.cmu-guide p{font-size:14px;line-height:1.55}
.cmu-old{margin:16px 0 0;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff}
.cmu-old summary{cursor:pointer;font-size:13.5px;font-weight:600}
.cmu-old>p{font-size:13px;margin:8px 0}
.cmu-bloc .cmu-rappel{margin:0 0 12px}
.cmu-blact{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:10px 0 0}
.cmu-blf{margin:14px 0 0;padding:14px 0 0;border-top:1px solid var(--line2,#EFEAE0)}
.cmu-vide{margin:0;font-size:14px;color:var(--grey)}
.cmu-more{margin:0;font-size:13.5px}
.cmu-li{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin:0 0 12px}
.cmu-lih{display:flex;flex-direction:column;gap:2px;text-decoration:none;color:inherit}
.cmu-lih b{font-family:var(--serif,inherit);font-size:18px}.cmu-lih span{font-size:12.5px}
.cmu-lin{margin:6px 0 0;font-size:14px;line-height:1.5}
.cmu-lic{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 0}
.cmu-lic .chip{display:inline-flex;align-items:center;gap:6px;margin:0}
.cmu-lact{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:12px 0 8px}
.cmu-lact .cmu-acts{margin-left:auto}
.cmu-etfs{display:grid;gap:8px;margin:12px 0 0}
.cmu-etfs a{display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:10px;padding:8px 10px}
.cmu-etfs span{display:flex;flex-direction:column}
.cmu-pick{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.cmu-pick label{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--line);border-radius:99px;padding:4px 10px 4px 6px;font-size:13px;font-weight:400;cursor:pointer;background:#fff}
.cmu-pick label:has(input:checked){border-color:var(--ink)}
.cmu-pick input{accent-color:var(--ink);margin:0}
.cmu-form .mwrap{position:relative}
#portefeuilles{scroll-margin-top:80px;margin-top:20px}
.cmu-bloc .cmu-co,.cmu-bloc .cmu-fig{display:none}
.cmu-bloc .cmu-these{margin-top:6px}
.cmu-l1 .cell-co{display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit}
.cmu-l1 .cell-co span{display:flex;flex-direction:column;min-width:0}
.cmu-msg{padding:10px 0;border-top:1px solid var(--line2,#EFEAE0)}
.cmu-msg:first-child{border-top:0;padding-top:0}
.cmu-mh{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;font-size:13.5px}
.cmu-msg p{margin:4px 0 6px;font-size:14.5px;line-height:1.5;overflow-wrap:anywhere}
.cmu-old .cmu-msg:first-of-type{border-top:1px solid var(--line2,#EFEAE0);padding-top:10px}
@media (max-width:860px){.cmu-figs{grid-template-columns:repeat(2,minmax(0,1fr))}.cmu-hzs{grid-template-columns:minmax(0,1fr)}.cmu-bar .btn{margin-left:0}.cmu-an{padding:14px}.cmu-these{font-size:18px}.cmu-lact .cmu-acts{margin-left:0}}
</style>`);
