/* Module « monia » de bilan. : l'IA du site (voir docs/ia.md). Chargé en dernier.
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
    .then(j => { if (j && !j.disponible) MIA.coupee = j.site_epuise ? "site" : j.raison === "absente" ? "absente" : "visiteur"; miaMaj(); return j; });
}
const miaConnectee = () => !MIA.coupee; // nom gardé : « une IA répond » (les autres modules l'utilisent)
const miaNomModele = () => "l'IA de bilan.";
function miaDeconnecter() { } // plus rien à déconnecter : gardé pour les anciens appels

/* ---------- Appel de l'IA du site ---------- */
const miaNettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/, "").replace(/—/g, ",").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
async function miaAppel(tache, user, max = 600) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch("/api/ia/rediger", { method: "POST", credentials: "same-origin", signal: ctl.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ tache, user, max }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 || r.status === 503) { MIA.coupee = j.limite || "absente"; miaMaj(); return { coupee: true, message: j.message || "L'IA du site n'est pas disponible pour le moment." }; }
    if (!r.ok) return { message: "L'IA du site n'a pas pu répondre. Réessayez dans un moment." };
    const txt = miaNettoie(j.txt);
    return txt.length > 15 ? { txt, modele: j.modele } : { message: "L'IA a renvoyé une réponse vide. Réessayez." };
  } catch (e) { return { message: e && e.name === "AbortError" ? "L'IA met trop de temps à répondre. Réessayez." : "Le site est injoignable : vérifiez votre connexion." }; }
  finally { clearTimeout(t); }
}
// Sources jointes aux faits : la réponse doit citer celles qu'elle utilise (consigne « Sources : »).
const MIA_SOURCES = {
  assistant: ["Comptes annuels publiés par l'entreprise (ESEF ou SEC), exercice indiqué dans les faits", "Médianes du secteur calculées par bilan. sur ces comptes", "Cours de Bourse relevés par le site", "Annonces officielles (AMF, SEC) et agenda de l'entreprise"],
  comparaison: ["Comptes annuels publiés par les entreprises (ESEF ou SEC)", "Médianes du secteur calculées par bilan.", "Cours de Bourse relevés par le site"],
  veille: ["Cours de Bourse relevés par le site", "Annonces officielles (AMF, SEC)", "Agenda publié par les entreprises"],
  portefeuille: ["Vos lignes, enregistrées dans votre navigateur", "Cours de Bourse relevés par le site", "Compositions publiées par les émetteurs d'ETF", "Grilles tarifaires publiées par les courtiers"],
  bilan: ["Synthèse de la semaine calculée par bilan. à partir des cours", "Annonces officielles de la semaine (AMF, SEC)", "Agenda publié par les entreprises"],
  annonce: ["Annonce officielle publiée par l'entreprise", "Derniers comptes annuels publiés"],
  expliquer: ["Cours de l'Académie de bilan."],
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
  if (j && j.ia === "connectee") return `${j.sources ? `<p class="mia-src"><b>Sources</b> ${esc(j.sources)}</p>` : ""}<p class="iafoot">Rédigé par l'IA de bilan. (${esc(j.modele || "modèle ouvert")}, hébergé par Cloudflare) à partir des seules données du site. À vérifier ; ce n'est pas un conseil.</p>`;
  return "";
}
/** Quand l'IA ne peut pas rédiger : la réponse calculée reste, avec une ligne d'explication. */
function miaInvite(txt) {
  const why = MIA.coupee === "visiteur" ? "Vous avez atteint le nombre de questions à l'IA du site pour aujourd'hui ; elle revient demain."
    : MIA.coupee === "site" ? "L'IA du site a atteint sa limite gratuite pour aujourd'hui ; elle revient demain." : MIA.coupee === "absente" ? "L'IA du site n'est pas disponible pour le moment." : "";
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
  return `<span class="mia-off"><i></i>${MIA.coupee === "absente" ? "Réponses calculées" : "Réponses calculées (limite du jour atteinte)"}</span> <a href="/espace/ia">Pourquoi ?</a>`;
}
function miaMaj() { $$("[data-mia-etat]").forEach(el => el.innerHTML = miaEtatHTML()); }
miaEtat();

/* ---------- Page « Mon IA » (/espace/ia) : ce qu'est l'IA du site, ses limites ---------- */
async function miaPage(el) {
  const autonome = !el; if (autonome) { setTitle("L'IA du site"); setNav("esp"); el = app; }
  const tete = autonome ? `<p class="kick">Mon espace</p><h1 class="pagetitle">L'IA du site</h1><p class="pagesub">Gratuite, sans compte et sans clé. Elle répond à partir des chiffres et des sources du site.</p>` : "";
  el.innerHTML = `${tete}<div class="mia-grid"><section class="panel"><div class="ph"><h2>Comment elle répond</h2><span data-mia-etat class="mia-etat"></span></div><div class="pb">
      <ol class="mia-etapes"><li><b>D'abord, le calcul.</b> Recherches par critères, comparaisons, définitions, questions courantes sur une fiche : le site calcule la réponse dans votre navigateur, sans limite.</li>
        <li><b>Ensuite, la rédaction.</b> Pour une question libre, un modèle ouvert (Qwen3 ou Mistral Small), hébergé par Cloudflare, rédige la réponse à partir des seuls chiffres et sources du site, avec des consignes strictes : pas de conseil, pas de prévision, les incertitudes dites.</li>
        <li><b>Chaque réponse rédigée est signalée</b> et cite ses sources. Vérifiez-la : une IA peut se tromper.</li></ol>
      <p class="mia-prix" id="miareste">Pour rester gratuit, le site limite le nombre de questions rédigées par jour et par visiteur.</p>
      <ul class="mia-garanties"><li>Aucun compte, aucune clé à fournir.</li><li>Vos questions sont envoyées à Cloudflare, qui héberge déjà le site, pour être traitées ; elles ne servent pas à entraîner le modèle. Le site ne garde pas leur texte, seulement un compteur anonyme du jour.</li></ul>
    </div></section>
    <section class="panel"><div class="ph"><h2>Vous utilisez déjà ChatGPT ou Claude ?</h2></div><div class="pb"><p style="margin-top:0">Ajoutez bilan. à votre assistant : il pourra lire les données du site pour vous répondre.</p><a class="lnk" href="/connecteur">Utiliser bilan. dans ChatGPT ou Claude</a></div></section></div>`;
  miaMaj();
  const j = await miaEtat(), r = $("#miareste", el);
  if (r && j && j.plafond_visiteur) r.textContent = `Pour rester gratuit, le site limite les questions rédigées à ${j.plafond_visiteur} par jour et par visiteur. ${j.disponible ? `Il vous en reste ${j.reste_visiteur} aujourd'hui.` : j.site_epuise ? "La part gratuite du site est épuisée pour aujourd'hui : l'IA revient demain." : "Vous les avez utilisées aujourd'hui : l'IA revient demain."}`;
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
        qs: [`ETF ${cl ? cl.toLowerCase() : "monde"}${pea ? " éligibles au PEA" : " éligible PEA"} les moins chers`, "C'est quoi un ETF capitalisant ?", "Comment choisir un ETF ?", "Pourquoi les frais d'un ETF comptent ?"] };
    }
  } catch (e) { }
  return MIA_CTX0();
};
document.addEventListener("click", e => { if (e.target.closest("[data-miactx]") && typeof orcIaOpen === "function") orcIaOpen(); });
(() => {
  const bouton = t => `<button type="button" class="mia-ctx" data-miactx><span aria-hidden="true">✦</span> ${esc(t)}</button>`;
  const ent0 = window.pageEntreprises, etf0 = window.pageEtfs;
  if (typeof ent0 === "function") window.pageEntreprises = function () { const r = ent0.apply(this, arguments); const s = $(".pagesub", app); if (s && !$("[data-miactx]", app)) s.insertAdjacentHTML("beforeend", " " + bouton("Chercher par critères avec l'IA")); return r; };
  if (typeof etf0 === "function") window.pageEtfs = function () { const r = etf0.apply(this, arguments); const s = $(".pagesub", app); if (s && !$("[data-miactx]", app)) s.insertAdjacentHTML("beforeend", " " + bouton("Trouver un ETF avec l'IA")); return r; };
})();

document.head.insertAdjacentHTML("beforeend", `<style>
.mia-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:900px){.mia-grid{grid-template-columns:1fr}}
.mia-etapes{margin:0 0 16px;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:14.5px;line-height:1.5}
.mia-garanties{margin:16px 0 0;padding:12px 14px 12px 30px;border:1px solid var(--line);border-radius:12px;background:var(--page);font-size:13.5px;color:var(--grey);display:flex;flex-direction:column;gap:5px}
.mia-fs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 10px}
@media (max-width:620px){.mia-fs{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mia-f{display:flex;flex-direction:column;gap:1px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card);cursor:pointer;min-height:44px}
.mia-f input{position:absolute;opacity:0;pointer-events:none}.mia-f b{font-size:15px}.mia-f small{font-size:12px;color:var(--grey)}
.mia-f.on{border-color:var(--ink);box-shadow:0 0 0 1px var(--ink)}.mia-f:has(input:focus-visible){outline:2px solid var(--ink);outline-offset:2px}
.mia-prix{margin:0 0 14px;padding:9px 12px;border-radius:10px;background:var(--page);font-size:13px;color:var(--grey);line-height:1.45}
.mia-form{display:flex;gap:8px;flex-wrap:wrap}.mia-form input{flex:1 1 220px;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:15px;background:var(--card)}
.mia-sel{width:100%;min-height:44px;padding:0 10px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:15px;background:var(--card);margin:4px 0 12px}
.mia-mods{display:flex;flex-direction:column;gap:8px}
.mia-mod{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card);cursor:pointer}
.mia-mod.on{border-color:var(--ink);box-shadow:0 0 0 1px var(--ink)}
.mia-mod span{display:flex;flex-direction:column;min-width:0}.mia-mod small{color:var(--grey);font-size:12.5px}
.mia-mod em{font-style:normal;font-size:12.5px;color:var(--grey);text-align:right;max-width:150px}.mia-mod em.g{color:var(--g);font-weight:600}
@media (max-width:520px){.mia-mod{grid-template-columns:20px minmax(0,1fr)}.mia-mod em{grid-column:2;text-align:left;max-width:none}}
.mia-act{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:14px}
.mia-msg{margin:0 0 14px;padding:10px 14px;border-radius:12px;font-size:14px}.mia-msg.ok{background:#EAF4EE;color:var(--g)}.mia-msg.ko{background:#FBF0EA;color:#B4471F}
.mia-etat,.orcia-etat{font-size:12.5px}.mia-on,.mia-off{display:inline-flex;align-items:center;gap:6px;font-weight:600}
.mia-on i,.mia-off i{width:8px;height:8px;border-radius:50%;background:var(--g)}.mia-off i{background:var(--light)}.mia-off{color:var(--grey)}
.mia-etat a,.orcia-etat a{color:inherit;text-decoration:underline;margin-left:4px}
.mia-src{margin:8px 0 0;font-size:12.5px;color:var(--grey)}.mia-src b{font-weight:600;margin-right:4px;color:var(--ink)}
.mia-inv{margin:8px 0 0;font-size:13px;color:var(--grey)}.mia-inv span{color:var(--g)}.mia-inv a{color:inherit;text-decoration:underline}
.mia-ctx{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;padding:5px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);font:600 13px inherit;color:var(--ink);cursor:pointer;vertical-align:middle}
.mia-ctx span{color:var(--g)}.mia-ctx:hover{border-color:var(--ink)}
</style>`);
