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
// Nombres à l'anglaise recopiés d'un communiqué (« 201.196 millions ») : remis à la française (« 201,2 millions »).
function miaNombres(t) {
  return String(t).replace(/\b(\d{1,3}(?:,\d{3})+|\d+)\.(\d+)(?=\s*(?:millions?|milliards?|Md|M|%|€|\$|dollars?|euros?)\b|\s*[%€$])/g, (m, a, b) => { const n = Number(a.replace(/,/g, "") + "." + b); return Number.isFinite(n) ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: n >= 100 ? 1 : 2 }).format(n) : m; });
}
async function iaRediger(tache, faits, o = {}) {
  if (MIA.coupee) return { invite: true };
  const F = { ...(faits || {}), sources: [...((faits && faits.sources) || []), ...(MIA_SOURCES[tache] || [])], date_du_jour: (faits && faits.date_du_jour) || TODAY };
  const q = String(o.question || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const user = q ? `Faits : ${JSON.stringify(F).slice(0, 14000)}\n\nQuestion : ${q}` : JSON.stringify(F).slice(0, 14000);
  const cle = tache + "|" + user; if (MIA.memo.has(cle)) return MIA.memo.get(cle);
  const r = await miaAppel(tache, user, o.max || 700);
  if (r.coupee) return { invite: true, message: r.message };
  let out = { error: r.message };
  if (r.txt) r.txt = miaNombres(r.txt);
  if (r.txt) { // la ligne « Sources : » demandée par la consigne est affichée à part, sous la réponse
    const m = tache === "annonce" ? null : r.txt.match(/\n\s*Sources?\s*:\s*([^\n]+)\s*$/i);
    out = { txt: m ? r.txt.slice(0, m.index).trim() : r.txt, sources: m ? m[1].trim() : null, modele: r.modele, ia: "connectee" };
    MIA.memo.set(cle, out);
  }
  return out;
}
/** Copilote : une question libre traduite en action (filtre, comparaison, fiche, ETF) ou expliquée. */

/* ---------- Petits morceaux d'interface ---------- */
/** Pied d'une réponse rédigée. */
/** Quand l'IA ne peut pas rédiger : la réponse calculée reste, avec une ligne d'explication. */
function miaSuite() { // la marche suivante : compte gratuit, puis Premium
  if (MIA.niveau === "premium") return "";
  return ` Avec <a href="/premium">Premium</a>, 50 questions par jour.`; // 4/11 : même limite avec ou sans compte
}
function miaInvite(txt) {
  const why = MIA.coupee === "visiteur" ? (MIA.niveau === "premium" ? "Vous avez posé vos 50 questions du jour ; elles reviennent demain." : "Vous avez posé vos 5 questions à l'IA de la semaine ; elles reviennent lundi.") + miaSuite()
    : MIA.coupee === "site" ? "L'IA du site a atteint sa part gratuite pour aujourd'hui ; elle revient demain." + (MIA.niveau === "premium" ? "" : ` <a href="/premium">Premium</a> n'a pas cette limite.`)
    : MIA.coupee === "absente" ? "L'IA du site n'est pas disponible pour le moment." : "";
  return why ? `<p class="mia-inv"><span aria-hidden="true">✦</span> ${txt ? esc(txt) + " " : ""}${why}</p>` : "";
}
/** Le bloc à afficher après une demande de rédaction : texte, explication ou erreur. */
function miaEtatHTML() {
  if (!MIA.coupee) return `<span class="mia-on"><i></i>IA du site : gratuite</span>`;
  return `<span class="mia-off"><i></i>${MIA.coupee === "absente" ? "Réponses calculées" : (MIA.coupee === "site" || MIA.niveau === "premium" ? "Réponses calculées (limite du jour atteinte)" : "Réponses calculées (questions de la semaine utilisées)")}</span>`;
}
function miaMaj() { $$("[data-mia-etat]").forEach(el => el.innerHTML = miaEtatHTML()); }
miaEtat();

/* ---------- Page « Mon IA » (/espace/ia) : ce qu'est l'IA du site, ses limites ---------- */
