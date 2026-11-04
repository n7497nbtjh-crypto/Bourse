/* Module « monia » d'ENKLAIR : l'IA du site (voir docs/ia.md). Chargé en dernier.
   - Pour tout le monde, d'abord : les réponses calculées (cf/site/ia.js, leçons de l'Académie, données). Gratuites, illimitées.
   - Pour les questions libres et les textes rédigés : l'IA du site (29 octobre 2026, demande de Romain : sur le site, gratuite,
     sans compte ni clé). Le navigateur envoie la tâche, les faits calculés et la question à /api/ia/rediger ; le serveur
     (cf/src/iasite.mjs) y ajoute ses consignes et appelle un modèle ouvert sur Cloudflare Workers AI, dans la limite gratuite
     du jour. Plafond par visiteur ; au-delà, ou si le site a épuisé sa part gratuite, la réponse calculée reste affichée.
   - iaRediger(tâche, faits, { question }) → { txt, sources, modele, ia } ; { invite: true, message } si l'IA n'est pas disponible. */

const MIA = { memo: new Map(), etat: null, coupee: null };
try { localStorage.removeItem("bilan.monia"); } catch (e) { } // clé d'une ancienne connexion (OpenRouter, puis clé personnelle) : effacée
/* ---------- Disponibilité (GET /api/ia/etat, une fois par page) ---------- */
function miaEtat() {
  if (MIA.etat) return MIA.etat;
  return MIA.etat = fetch("/api/ia/etat", { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).catch(() => null)
    .then(j => { if (j) MIA.niveau = j.niveau || "visiteur"; if (j && !j.disponible) MIA.coupee = j.site_epuise ? "site" : j.raison === "absente" ? "absente" : "visiteur"; miaMaj(); return j; });
}
const miaConnectee = () => !MIA.coupee; // nom gardé : « une IA répond » (les autres modules l'utilisent)
const miaNomModele = () => "l'IA d'ENKLAIR";
 // plus rien à déconnecter : gardé pour les anciens appels

/* ---------- Appel de l'IA du site ---------- */
const miaNettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/, "").replace(/—/g, ",").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
async function miaAppel(tache, user, max = 600) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch("/api/ia/rediger", { method: "POST", credentials: "same-origin", signal: ctl.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ tache, user, max }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 || r.status === 503) { MIA.coupee = j.limite || "absente"; if (j.niveau) MIA.niveau = j.niveau; miaMaj(); return { coupee: true, message: j.message || "L'IA du site n'est pas disponible pour le moment." }; }
    if (!r.ok) return { message: "L'IA du site n'a pas pu répondre. Réessayez dans un moment." };
    const txt = miaNettoie(j.txt);
    return txt.length > 15 ? { txt, modele: j.modele } : { message: "L'IA a renvoyé une réponse vide. Réessayez." };
  } catch (e) { return { message: e && e.name === "AbortError" ? "L'IA met trop de temps à répondre. Réessayez." : "Le site est injoignable : vérifiez votre connexion." }; }
  finally { clearTimeout(t); }
}
// Sources jointes aux faits : la réponse doit citer celles qu'elle utilise (consigne « Sources : »).
const MIA_SOURCES = {
  assistant: ["Comptes annuels publiés par l'entreprise (ESEF ou SEC), exercice indiqué dans les faits", "Médianes du secteur calculées par ENKLAIR sur ces comptes", "Cours de Bourse relevés par le site", "Annonces officielles (AMF, SEC) et agenda de l'entreprise"],
  comparaison: ["Comptes annuels publiés par les entreprises (ESEF ou SEC)", "Médianes du secteur calculées par ENKLAIR", "Cours de Bourse relevés par le site"],
  veille: ["Cours de Bourse relevés par le site", "Annonces officielles (AMF, SEC)", "Agenda publié par les entreprises"],
  portefeuille: ["Vos lignes, enregistrées dans votre navigateur", "Cours de Bourse relevés par le site", "Compositions publiées par les émetteurs d'ETF", "Grilles tarifaires publiées par les courtiers"],
  bilan: ["Synthèse de la semaine calculée par ENKLAIR à partir des cours", "Annonces officielles de la semaine (AMF, SEC)", "Agenda publié par les entreprises"],
  annonce: ["Annonce officielle publiée par l'entreprise", "Derniers comptes annuels publiés"],
  expliquer: ["Cours de l'Académie d'ENKLAIR"],
};
/** Rédaction par l'IA du site. Renvoie { txt, sources, modele } ; { invite: true, message } si l'IA n'est pas disponible ; { error } si elle échoue. */
async function iaRediger(tache, faits, o = {}) {
  if (MIA.coupee) return { invite: true };
  const F = { ...(faits || {}), sources: [...((faits && faits.sources) || []), ...(MIA_SOURCES[tache] || [])], date_du_jour: (faits && faits.date_du_jour) || TODAY };
  const q = String(o.question || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const user = q ? `Faits : ${JSON.stringify(F).slice(0, 14000)}\n\nQuestion : ${q}` : JSON.stringify(F).slice(0, 14000);
  const cle = tache + "|" + user; if (MIA.memo.has(cle)) return MIA.memo.get(cle);
  const r = await miaAppel(tache, user, o.max || 700);
  if (r.coupee) return { invite: true, message: r.message };
  let out = { error: r.message };
  if (r.txt) { // la ligne « Sources : » demandée par la consigne est affichée à part, sous la réponse
    const m = tache === "annonce" ? null : r.txt.match(/\n\s*Sources?\s*:\s*([^\n]+)\s*$/i);
    out = { txt: m ? r.txt.slice(0, m.index).trim() : r.txt, sources: m ? m[1].trim() : null, modele: r.modele, ia: "connectee" };
    MIA.memo.set(cle, out);
  }
  return out;
}
/** Copilote : une question libre traduite en action (filtre, comparaison, fiche, ETF) ou expliquée. */
async function miaCopilote(q) {
  if (MIA.coupee) return { invite: true };
  const r = await miaAppel("demande", String(q).slice(0, 300), 500);
  if (r.coupee) return { invite: true, message: r.message };
  if (!r.txt) return { error: r.message };
  const a = iaValide(jsonFrom(r.txt));
  if (!a) return { error: "L'IA du site n'a pas su traduire cette question en recherche sur les données du site. Reformulez-la ou essayez un exemple." };
  if (a.action === "repondre") {
    try { await acaLoad(); } catch (e) { }
    const h = typeof chercheLecons === "function" ? chercheLecons(q, 3) : [];
    const x = await iaRediger("expliquer", { lecons_du_site: h.map(({ m, l }) => ({ titre: l.titre, lien: "/academie/" + m.id + "/" + l.id, resume: l.resume, a_retenir: l.a_retenir })),
      sources: h.flatMap(({ l }) => (l.sources || []).map(s => s.label)).slice(0, 6) }, { question: q, max: 550 });
    if (x.txt) a.texte = x.txt.slice(0, 2400);
  }
  return { ...a, ia: "connectee", modele: r.modele };
}

/* ---------- Petits morceaux d'interface ---------- */
/** Pied d'une réponse rédigée. */
function miaPied(j) {
  if (j && j.ia === "connectee") return `${j.sources ? `<p class="mia-src"><b>Sources</b> ${esc(j.sources)}</p>` : ""}<p class="iafoot">Rédigé par l'IA d'ENKLAIR (${esc(j.modele || "modèle ouvert")}, hébergé par Cloudflare) à partir des seules données du site. À vérifier ; ce n'est pas un conseil.</p>`;
  return "";
}
/** Quand l'IA ne peut pas rédiger : la réponse calculée reste, avec une ligne d'explication. */
function miaSuite() { // la marche suivante : compte gratuit, puis Premium
  if (MIA.niveau === "premium") return "";
  return ` Avec <a href="/premium">Premium</a>, 30 questions par jour.`; // 4/11 : même limite avec ou sans compte
}
function miaInvite(txt) {
  const why = MIA.coupee === "visiteur" ? (MIA.niveau === "premium" ? "Vous avez posé vos 30 questions du jour ; elles reviennent demain." : "Vous avez posé vos 5 questions à l'IA de la semaine ; elles reviennent lundi.") + miaSuite()
    : MIA.coupee === "site" ? "L'IA du site a atteint sa part gratuite pour aujourd'hui ; elle revient demain." + (MIA.niveau === "premium" ? "" : ` <a href="/premium">Premium</a> n'a pas cette limite.`)
    : MIA.coupee === "absente" ? "L'IA du site n'est pas disponible pour le moment." : "";
  return why ? `<p class="mia-inv"><span aria-hidden="true">✦</span> ${txt ? esc(txt) + " " : ""}${why}</p>` : "";
}
/** Le bloc à afficher après une demande de rédaction : texte, explication ou erreur. */
function miaRendu(j, defaut) {
  if (j && j.txt) return resumeHTML(j.txt) + miaPied(j);
  if (!j || j.invite) return miaInvite(defaut);
  return `<p class="muted" style="margin:6px 0">${esc(j.error || "Réponse indisponible.")}</p>`;
}
function miaEtatHTML() {
  if (!MIA.coupee) return `<span class="mia-on"><i></i>IA du site : gratuite</span> <a href="/espace/ia">En savoir plus</a>`;
  return `<span class="mia-off"><i></i>${MIA.coupee === "absente" ? "Réponses calculées" : (MIA.coupee === "site" || MIA.niveau === "premium" ? "Réponses calculées (limite du jour atteinte)" : "Réponses calculées (questions de la semaine utilisées)")}</span> <a href="/espace/ia">Pourquoi ?</a>`;
}
function miaMaj() { $$("[data-mia-etat]").forEach(el => el.innerHTML = miaEtatHTML()); }
miaEtat();

/* ---------- Page « Mon IA » (/espace/ia) : ce qu'est l'IA du site, ses limites ---------- */
async function miaPage(el) {
  const autonome = !el; if (autonome) { setTitle("L'IA du site"); setNav("esp"); el = app; }
  const tete = autonome ? `<p class="kick">Mon espace</p><h1 class="pagetitle">L'IA du site</h1><p class="pagesub">Gratuite, sans compte et sans clé. Elle répond à partir des chiffres et des sources du site.</p>` : "";
  const champ = `<form class="mia-ask" id="miaask"><input type="search" name="q" placeholder="Posez une question : « La dette de TotalEnergies est-elle un problème ? »" aria-label="Votre question" autocomplete="off" maxlength="300"><button type="submit" class="btn">Demander</button></form>
    <div class="chips mia-ex">${["Pourquoi la marge de LVMH est-elle plus haute que celle de Kering ?", "Que pense le marché d'Apple ?", "Quelles entreprises françaises versent le plus de dividendes ?"].map(q => `<button type="button" class="chip" data-miaq="${esc(q)}">${esc(q)}</button>`).join("")}</div>`;
  el.innerHTML = `${tete}${champ}<div class="mia-grid"><section class="panel"><div class="ph"><h2>Comment elle répond</h2><span data-mia-etat class="mia-etat"></span></div><div class="pb">
      <ol class="mia-etapes"><li><b>D'abord, le calcul.</b> Recherches par critères, comparaisons, définitions, questions courantes sur une fiche : le site calcule la réponse dans votre navigateur, sans limite.</li>
        <li><b>Ensuite, la rédaction.</b> Pour une question libre, un modèle ouvert (Qwen3 ou Mistral Small), hébergé par Cloudflare, rédige la réponse à partir des seuls chiffres et sources du site, avec des consignes strictes : pas de conseil, pas de prévision, les incertitudes dites.</li>
        <li><b>Chaque réponse rédigée est signalée</b> et cite ses sources. Vérifiez-la : une IA peut se tromper.</li></ol>
      <p class="mia-prix" id="miareste">L'IA du site répond à 5 questions par semaine en gratuit, avec ou sans compte, et à 30 questions par jour avec Premium.</p>
      <ul class="mia-garanties"><li>Aucun compte, aucune clé à fournir.</li><li>Vos questions sont envoyées à Cloudflare, qui héberge déjà le site, pour être traitées ; elles ne servent pas à entraîner le modèle. Le site ne garde pas leur texte, seulement un compteur anonyme.</li></ul>
    </div></section>
    <section class="panel"><div class="ph"><h2>Vous utilisez déjà ChatGPT ou Claude ?</h2></div><div class="pb"><p style="margin-top:0">Ajoutez ENKLAIR à votre assistant : il pourra lire les données du site pour vous répondre.</p><a class="lnk" href="/connecteur">Utiliser ENKLAIR dans ChatGPT ou Claude</a></div></section></div>`;
  miaMaj();
  const poser = q => { if (typeof orcIaOpen !== "function") return; orcIaOpen(); orcIaAsk(q, { rediger: true }); };
  const fm = $("#miaask", el); if (fm) fm.onsubmit = e => { e.preventDefault(); const q = fm.q.value.trim(); if (q.length >= 3) poser(q); };
  $$("[data-miaq]", el).forEach(b => b.onclick = () => poser(b.dataset.miaq));
  const j = await miaEtat(), r = $("#miareste", el);
  if (r && j && j.plafonds) { const Q = j.plafonds, nv = { visiteur: "sans compte", compte: "avec votre compte gratuit", premium: "avec Premium" }[j.niveau] || "";
    r.innerHTML = `L'IA du site répond à ${Q.visiteur} questions par semaine en gratuit, avec ou sans compte, et à ${Q.premium} questions par jour avec <a class="lnk" href="/premium">Premium</a>. Vous êtes ${esc(nv)} : ${j.disponible ? `il vous en reste ${j.reste_visiteur} ${j.periode === "jour" ? "aujourd'hui" : "cette semaine"}.` : j.site_epuise ? "la part gratuite du site est épuisée pour aujourd'hui, l'IA revient demain." : j.periode === "jour" ? "vous les avez utilisées aujourd'hui, l'IA revient demain." : "vous les avez utilisées cette semaine, elles reviennent lundi."}`; }
}
ROUTES_EXTRA.push([/^\/espace\/ia$/, async () => {
  const m = typeof moi === "function" ? await moi() : { connecte: false };
  if (!m || !m.connecte) return miaPage(null);
  await pageEspace("reglages"); // en-tête et onglets de Mon espace
  const nav = $(".esptabs"); if (!nav) return miaPage(null);
  setTitle("L'IA du site · Mon espace"); $$("a", nav).forEach(a => a.classList.remove("on"));
  const a = nav.querySelector('a[href="/espace/ia"]'); if (a) { a.classList.add("on"); nav.scrollLeft = Math.max(0, a.offsetLeft - 16); }
  miaPage($("#espb"));
}]);
(() => { // onglet « Mon IA » dans Mon espace
  const esp0 = window.pageEspace; if (typeof esp0 !== "function") return;
  window.pageEspace = async function (onglet) {
    await esp0(onglet);
    const nav = $(".esptabs"); if (!nav || nav.querySelector('a[href="/espace/ia"]')) return;
    const r = nav.querySelector('a[href="/espace/reglages"]'); const html = `<a href="/espace/ia">L'IA du site</a>`;
    if (r) r.insertAdjacentHTML("beforebegin", html); else nav.insertAdjacentHTML("beforeend", html);
  };
})();

/* ---------- Un seul point d'entrée : le panneau ✦, contextuel sur les listes ---------- */
const MIA_CTX0 = window.orcIaCtx;
if (typeof MIA_CTX0 === "function") window.orcIaCtx = function () {
  const p = location.pathname;
  try {
    if (p === "/entreprises" && typeof listState !== "undefined") {
      const sec = listState.sector !== "all" ? secName({ sector: listState.sector }) : null, reg = listState.region !== "all" ? (R.regions[listState.region] || null) : null;
      const l = R.companies.filter(c => !c.missing && (listState.region === "all" || c.region === listState.region) && (listState.sector === "all" || c.sector === listState.sector));
      const top = [...l].sort((a, b) => (caEur(b) || 0) - (caEur(a) || 0)).slice(0, 2);
      const ou = [sec ? `du secteur ${sec.toLowerCase()}` : "", reg ? (/^(France|Europe)$/.test(reg) ? `en ${reg}` : reg === "États-Unis" ? "aux États-Unis" : `(${reg})`) : ""].filter(Boolean).join(" ");
      return { type: "gen", label: ["Les entreprises", sec, reg].filter(Boolean).join(" · "),
        qs: [`Entreprises ${ou || ""} peu endettées qui versent un dividende`.replace(/\s+/g, " "), `Entreprises ${ou || ""} les plus rentables`.replace(/\s+/g, " "), ...(top.length === 2 ? [`Compare ${top[0].name} et ${top[1].name}`] : []), "C'est quoi la marge nette ?"] };
    }
    if (p === "/etf") {
      const u = new URLSearchParams(location.search), cat = u.get("cat"), pea = u.get("env") === "pea", cl = cat && typeof ECAT !== "undefined" && ECAT[cat] ? ECAT[cat] : null;
      return { type: "gen", label: ["Les ETF", cl, pea ? "PEA" : null].filter(Boolean).join(" · "),
        qs: [`ETF ${cl ? cl.toLowerCase() : "monde"}${typeof frSeul === "function" && !frSeul() ? "" : pea ? " éligibles au PEA" : " éligible PEA"} les moins chers`, "C'est quoi un ETF capitalisant ?", "Comment choisir un ETF ?", "Pourquoi les frais d'un ETF comptent ?"] };
    }
  } catch (e) { }
  return MIA_CTX0();
};
document.addEventListener("click", e => { if (e.target.closest("[data-miactx]") && typeof orcIaOpen === "function") orcIaOpen(); });
(() => {
  const bouton = t => `<button type="button" class="mia-ctx" data-miactx><span aria-hidden="true">✦</span> ${esc(t)}</button>`;
  const ent0 = window.pageEntreprises;
  if (typeof ent0 === "function") window.pageEntreprises = function () { const r = ent0.apply(this, arguments); const s = $(".pagesub", app); if (s && !$("[data-miactx]", app)) s.insertAdjacentHTML("beforeend", " " + bouton("Chercher par critères avec l'IA")); return r; };
})();

/* styles : voir site.css */

/* styles : voir site.css */
