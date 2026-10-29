/* Module « monia » de bilan. : « Connecter mon IA » (voir docs/ia.md). Chargé en dernier.
   - Sans connexion, le site répond avec ses réponses calculées (cf/site/ia.js, leçons de l'Académie, données) : gratuit et illimité.
   - « Connecter mon IA » (refonte du 29 octobre 2026, à la demande de Romain : plus d'intermédiaire) : le visiteur choisit
     ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google) ou Mistral, colle la clé d'accès créée chez cet éditeur, et le site
     appelle directement l'éditeur depuis son navigateur. Les quatre acceptent ces appels (en-têtes CORS vérifiés le 29/10/2026
     pour OpenAI, Anthropic et Mistral ; Gemini non vérifiable depuis l'environnement de travail).
     La clé reste dans ce navigateur (localStorage) : elle n'est envoyée qu'à l'éditeur choisi, jamais au site.
   - iaRediger(tâche, faits, { question }) : envoie la consigne (cf/src/consignes.mjs → /data/prompts.json), les faits
     calculés par le site et la question au modèle choisi. Sans IA connectée : { invite: true }, l'appelant garde la réponse calculée.
   Le site n'appelle aucun modèle lui-même et ne paie aucune IA. */

const MIA_CLE = "bilan.monia"; // { f: fournisseur, key, model, nom, at }
const MIA = { prompts: null, modeles: {}, memo: new Map() };
/* Les quatre éditeurs. cle : où créer la clé ; prix : ce que le visiteur doit savoir avant de choisir. */
const MIA_F = {
  openai: { nom: "ChatGPT", ed: "OpenAI", cle: "https://platform.openai.com/api-keys", forme: /^sk-[\w-]{20,}$/,
    prix: "Payant à l'usage : un crédit prépayé chez OpenAI (quelques centimes pour des dizaines de questions). L'abonnement ChatGPT Plus ne s'applique pas ici." },
  anthropic: { nom: "Claude", ed: "Anthropic", cle: "https://console.anthropic.com/settings/keys", forme: /^sk-ant-[\w-]{20,}$/,
    prix: "Payant à l'usage : un crédit prépayé chez Anthropic. L'abonnement Claude Pro ne s'applique pas ici." },
  gemini: { nom: "Gemini", ed: "Google", cle: "https://aistudio.google.com/app/apikey", forme: /^[\w-]{30,}$/,
    prix: "Offre gratuite avec un nombre de questions limité par jour, sans carte bancaire. Sur l'offre gratuite, Google peut utiliser les échanges pour améliorer ses produits." },
  mistral: { nom: "Mistral", ed: "Mistral AI", pays: "France", cle: "https://console.mistral.ai/api-keys", forme: /^[\w-]{20,}$/,
    prix: "Offre gratuite « Experiment » (numéro de téléphone demandé, pas de carte bancaire). Sur cette offre, Mistral peut utiliser les échanges pour entraîner ses modèles." },
};
const MIA_ORDRE = ["openai", "anthropic", "gemini", "mistral"];

/* ---------- Ce que garde le navigateur ---------- */
function miaLire() { try { const o = JSON.parse(localStorage.getItem(MIA_CLE) || "null"); return o && typeof o.key === "string" && o.key && MIA_F[o.f] ? o : null; } catch (e) { return null; } }
function miaEcrire(o) { try { localStorage.setItem(MIA_CLE, JSON.stringify(o)); return true; } catch (e) { return false; } }
function miaDeconnecter() { try { localStorage.removeItem(MIA_CLE); } catch (e) { } MIA.memo.clear(); miaMaj(); }
const miaConnectee = () => { const c = miaLire(); return !!(c && c.model); };
const miaNomModele = () => { const c = miaLire(); return c && c.model ? `${MIA_F[c.f].nom} · ${c.nom || c.model}` : null; };
function miaSess() { try { return sessionStorage; } catch (e) { return localStorage; } }

/* ---------- Liste des modèles de l'éditeur, lue avec la clé du visiteur (elle sert aussi à vérifier la clé) ----------
   Les noms de modèles changent souvent : le site ne les écrit pas en dur, il lit la liste de l'éditeur et garde
   les modèles de conversation généralistes. Par défaut : le plus rapide et le moins cher de la gamme. */
const MIA_EXCLU = /(audio|realtime|image|tts|transcribe|whisper|embed|moderation|search|codex|code|computer|vision|ocr|voxtral|pixtral|devstral|magistral|live|robotics|learnlm|aqa|instruct|-\d{4}-\d{2}-\d{2}|preview|exp\b|experimental|thinking|nano)/i;
function miaHeaders(c) {
  if (c.f === "anthropic") return { "x-api-key": c.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" };
  if (c.f === "gemini") return { "x-goog-api-key": c.key, "content-type": "application/json" };
  return { authorization: "Bearer " + c.key, "content-type": "application/json" };
}
const MIA_URL = { openai: "https://api.openai.com/v1", anthropic: "https://api.anthropic.com/v1", gemini: "https://generativelanguage.googleapis.com/v1beta", mistral: "https://api.mistral.ai/v1" };
const miaVer = id => (String(id).match(/\d+(\.\d+)?/g) || ["0"]).map(Number).reduce((a, n, i) => a + n / Math.pow(100, i), 0); // gemini-2.5-flash → 2.05
async function miaModeles(c) {
  const k = c.f + "|" + c.key.slice(-6); if (MIA.modeles[k]) return MIA.modeles[k];
  let r;
  try { r = await fetch(MIA_URL[c.f] + "/models" + (c.f === "anthropic" ? "?limit=50" : c.f === "gemini" ? "?pageSize=200" : ""), { headers: miaHeaders(c), credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(15000) }); }
  catch (e) { return { erreur: `${MIA_F[c.f].ed} est injoignable depuis ce navigateur. Vérifiez votre connexion, puis réessayez.` }; }
  if (r.status === 401 || r.status === 403 || r.status === 400) return { invalide: true, erreur: `${MIA_F[c.f].ed} refuse cette clé. Vérifiez que vous l'avez copiée en entier, sans espace.` };
  if (!r.ok) return { erreur: `${MIA_F[c.f].ed} n'a pas répondu correctement (code ${r.status}). Réessayez dans un moment.` };
  const j = await r.json().catch(() => ({}));
  let l = [];
  if (c.f === "gemini") l = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /^models\/gemini-/.test(m.name) && !MIA_EXCLU.test(m.name))
    .map(m => ({ id: m.name.replace(/^models\//, ""), nom: m.displayName || m.name.replace(/^models\//, ""), v: miaVer(m.name) }));
  else if (c.f === "anthropic") l = (j.data || []).filter(m => /^claude-/.test(m.id)).map(m => ({ id: m.id, nom: m.display_name || m.id, v: Date.parse(m.created_at) || 0 }));
  else if (c.f === "openai") l = (j.data || []).filter(m => /^gpt-\d/.test(m.id) && !MIA_EXCLU.test(m.id)).map(m => ({ id: m.id, nom: m.id.replace(/^gpt-/, "GPT-"), v: m.created || 0 }));
  else l = (j.data || []).filter(m => (!m.capabilities || m.capabilities.completion_chat) && !MIA_EXCLU.test(m.id) && /latest$/.test(m.id)).map(m => ({ id: m.id, nom: m.name || m.id, v: m.created || 0 }));
  const vus = new Set(); l = l.filter(m => !vus.has(m.id) && vus.add(m.id)).sort((a, b) => b.v - a.v).slice(0, 8);
  if (!l.length) return { erreur: `Aucun modèle de conversation trouvé sur ce compte ${MIA_F[c.f].ed}.` };
  const rapide = { openai: /mini/, anthropic: /haiku/, gemini: /flash(?!-lite)/, mistral: /small/ }[c.f];
  const def = l.find(m => rapide.test(m.id)) || l[0];
  return MIA.modeles[k] = { l, def };
}

/* ---------- Appel du modèle (navigateur → éditeur choisi) ---------- */
async function miaPrompts() {
  if (MIA.prompts) return MIA.prompts;
  try { MIA.prompts = await (await fetch("/data/prompts.json")).json(); } catch (e) { MIA.prompts = null; }
  return MIA.prompts || {};
}
const miaNettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/, "").replace(/—/g, ",").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
async function miaAppel(c, messages, max_tokens = 600) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 75000), F = MIA_F[c.f];
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n"), user = messages.filter(m => m.role !== "system");
  let url = MIA_URL[c.f] + "/chat/completions", body;
  if (c.f === "anthropic") { url = MIA_URL.anthropic + "/messages"; body = { model: c.model, system: sys, messages: user, max_tokens, temperature: 0.2 }; }
  else if (c.f === "gemini") { url = `${MIA_URL.gemini}/models/${encodeURIComponent(c.model)}:generateContent`;
    body = { systemInstruction: { parts: [{ text: sys }] }, contents: user.map(m => ({ role: "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: max_tokens * 4, temperature: 0.2 } }; }
  else if (c.f === "openai") body = { model: c.model, messages, max_completion_tokens: max_tokens * 4 }; // modèles récents : pas de température, et une marge pour leur réflexion
  else body = { model: c.model, messages, max_tokens, temperature: 0.2 };
  try {
    const r = await fetch(url, { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", signal: ctl.signal, headers: miaHeaders(c), body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    const detail = String((j.error && (j.error.message || j.error.type)) || (Array.isArray(j) && j[0] && j[0].error && j[0].error.message) || "").slice(0, 140);
    if (r.status === 401 || (r.status === 403 && c.f !== "gemini")) { miaDeconnecter(); return { message: `${F.ed} refuse votre clé : elle a été effacée de ce navigateur. Reconnectez votre IA dans « Mon IA ».` }; }
    if (r.status === 402 || /credit|quota|billing|insufficient/i.test(detail)) return { message: `Votre compte ${F.ed} n'a plus de crédit ou a atteint son quota. Rechargez-le chez ${F.ed}, ou connectez un autre éditeur dans « Mon IA ».` };
    if (r.status === 429) return { message: `Votre limite chez ${F.ed} est atteinte pour le moment. Réessayez dans quelques minutes.` };
    if (!r.ok) return { message: `${F.nom} n'a pas pu répondre${detail ? ` (${detail})` : ""}. Essayez un autre modèle dans « Mon IA ».` };
    const brut = c.f === "anthropic" ? (j.content || []).filter(b => b.type === "text").map(b => b.text).join("")
      : c.f === "gemini" ? (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.filter(p => !p.thought).map(p => p.text || "").join("")
      : (((j.choices || [])[0] || {}).message || {}).content || "";
    const txt = miaNettoie(brut);
    return txt.length > 15 ? { txt } : { message: "Le modèle a renvoyé une réponse vide. Réessayez ou choisissez un autre modèle." };
  } catch (e) { return { message: e && e.name === "AbortError" ? "Le modèle met trop de temps à répondre. Réessayez." : `${F.ed} est injoignable depuis ce navigateur.` }; }
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
/** Rédaction par l'IA connectée. Renvoie { txt, modele } ; { invite: true } sans IA connectée ; { error } si le modèle échoue. */
async function iaRediger(tache, faits, o = {}) {
  const c = miaLire(); if (!c || !c.model) return { invite: true };
  const P = await miaPrompts(), sys = P[tache]; if (!sys) return { error: "Consigne introuvable : rechargez la page." };
  const F = { ...(faits || {}), sources: [...((faits && faits.sources) || []), ...(MIA_SOURCES[tache] || [])], date_du_jour: (faits && faits.date_du_jour) || TODAY };
  const q = String(o.question || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const user = q ? `Faits : ${JSON.stringify(F).slice(0, 14000)}\n\nQuestion : ${q}` : JSON.stringify(F).slice(0, 14000);
  const cle = c.model + "|" + tache + "|" + user; if (MIA.memo.has(cle)) return MIA.memo.get(cle);
  const r = await miaAppel(c, [{ role: "system", content: sys }, { role: "user", content: user }], o.max || 700);
  let out = { error: r.message };
  if (r.txt) { // la ligne « Sources : » demandée par la consigne est affichée à part, sous la réponse
    const m = tache === "annonce" ? null : r.txt.match(/\n\s*Sources?\s*:\s*([^\n]+)\s*$/i);
    out = { txt: m ? r.txt.slice(0, m.index).trim() : r.txt, sources: m ? m[1].trim() : null, modele: `${MIA_F[c.f].nom} · ${c.nom || c.model}`, ia: "connectee" };
  }
  if (r.txt) MIA.memo.set(cle, out);
  return out;
}
/** Copilote : une question libre traduite en action (filtre, comparaison, fiche, ETF) ou expliquée. */
async function miaCopilote(q) {
  const c = miaLire(); if (!c || !c.model) return { invite: true };
  const P = await miaPrompts(); if (!P.demande) return { error: "Consigne introuvable : rechargez la page." };
  const r = await miaAppel(c, [{ role: "system", content: P.demande }, { role: "user", content: String(q).slice(0, 300) }], 500);
  if (!r.txt) return { error: r.message };
  const a = iaValide(jsonFrom(r.txt));
  if (!a) return { error: "Votre IA n'a pas su traduire cette question en recherche sur les données du site. Reformulez-la ou essayez un exemple." };
  if (a.action === "repondre") {
    try { await acaLoad(); } catch (e) { }
    const h = typeof chercheLecons === "function" ? chercheLecons(q, 3) : [];
    const x = await iaRediger("expliquer", { lecons_du_site: h.map(({ m, l }) => ({ titre: l.titre, lien: "/academie/" + m.id + "/" + l.id, resume: l.resume, a_retenir: l.a_retenir })),
      sources: h.flatMap(({ l }) => (l.sources || []).map(s => s.label)).slice(0, 6) }, { question: q, max: 550 });
    if (x.txt) a.texte = x.txt.slice(0, 2400);
  }
  return { ...a, ia: "connectee", modele: `${MIA_F[c.f].nom} · ${c.nom || c.model}` };
}

/* ---------- Petits morceaux d'interface ---------- */
/** Pied d'une réponse rédigée, ou invitation discrète à connecter son IA. */
function miaPied(j) {
  if (j && j.ia === "connectee") return `${j.sources ? `<p class="mia-src"><b>Sources</b> ${esc(j.sources)}</p>` : ""}<p class="iafoot">Rédigé par votre IA connectée (${esc(j.modele || "modèle choisi")}) à partir des seules données du site. À vérifier ; ce n'est pas un conseil.</p>`;
  return "";
}
function miaInvite(txt) { return `<p class="mia-inv"><span aria-hidden="true">✦</span> ${txt ? esc(txt) + " " : ""}<a href="/espace/ia">Connectez votre IA</a> pour une réponse rédigée.</p>`; }
/** Le bloc à afficher après une demande de rédaction : texte, invitation ou erreur. */
function miaRendu(j, defaut) {
  if (j && j.txt) return resumeHTML(j.txt) + miaPied(j);
  if (!j || j.invite) return miaInvite(defaut);
  return `<p class="muted" style="margin:6px 0">${esc(j.error || "Réponse indisponible.")}</p>`;
}
function miaEtatHTML() {
  const n = miaNomModele();
  return n ? `<span class="mia-on"><i></i>IA connectée : ${esc(n)}</span> <a href="/espace/ia">Changer</a>` : `<span class="mia-off"><i></i>Réponses calculées</span> <a href="/espace/ia">Connecter mon IA</a>`;
}
function miaMaj() { $$("[data-mia-etat]").forEach(el => el.innerHTML = miaEtatHTML()); }
addEventListener("storage", e => { if (e.key === MIA_CLE) { MIA.memo.clear(); miaMaj(); } });

/* ---------- Page « Mon IA » (/espace/ia, avec ou sans compte ; onglet dans Mon espace) ---------- */
let MIA_CHOIX = "mistral"; // éditeur sélectionné sur la page avant connexion
async function miaPage(el, retour) {
  const autonome = !el; if (autonome) { setTitle("Mon IA"); setNav("esp"); el = app; }
  const tete = autonome ? `<p class="kick">Mon espace</p><h1 class="pagetitle">Mon IA</h1><p class="pagesub">Le site répond toujours avec ses calculs, gratuitement et sans limite. Connectez votre propre IA pour obtenir en plus des réponses rédigées.</p>` : "";
  const c = miaLire();
  const msg = retour && retour.erreur ? `<p class="mia-msg ko">${esc(retour.erreur)}</p>` : retour && retour.ok ? `<p class="mia-msg ok">${esc(retour.ok)}</p>` : "";
  const calc = `<section class="panel"><div class="ph"><h2>Toujours disponible : les réponses calculées</h2></div><div class="pb"><p style="margin-top:0">Recherches par critères, comparaisons, définitions, questions courantes sur une fiche, leçons de l'Académie : le site calcule la réponse dans votre navigateur, à partir de ses données et de leurs sources.</p>
    <p class="muted" style="margin:0;font-size:13.5px">Vous utilisez déjà ChatGPT ou Claude ? <a class="lnk" href="/connecteur">Utilisez bilan. dans ChatGPT ou Claude</a>.</p></div></section>`;
  if (!c) {
    const F = MIA_F[MIA_CHOIX];
    el.innerHTML = `${tete}${msg}<div class="mia-grid"><section class="panel mia-cta"><div class="ph"><h2>Connecter mon IA</h2><span class="light" style="font-size:12.5px">Facultatif</span></div><div class="pb">
      <p class="fbt" style="margin-top:0">1. Choisissez votre IA</p>
      <div class="mia-fs" role="radiogroup" aria-label="Éditeur d'IA">${MIA_ORDRE.map(k => `<label class="mia-f${k === MIA_CHOIX ? " on" : ""}"><input type="radio" name="miaf" value="${k}"${k === MIA_CHOIX ? " checked" : ""}><b>${esc(MIA_F[k].nom)}</b><small>${esc(MIA_F[k].ed)}${MIA_F[k].pays ? " · " + esc(MIA_F[k].pays) : ""}</small></label>`).join("")}</div>
      <p class="mia-prix">${esc(F.prix)}</p>
      <p class="fbt">2. Créez une clé d'accès chez ${esc(F.ed)}</p>
      <p style="margin:0 0 4px;font-size:14.5px">Connectez-vous à votre compte ${esc(F.ed)}, créez une clé, puis copiez-la. <a class="lnk" href="${F.cle}" target="_blank" rel="noopener">Créer ma clé chez ${esc(F.ed)} ↗</a></p>
      <p class="fbt">3. Collez-la ici</p>
      <form class="mia-form" data-mia-form autocomplete="off"><input type="password" name="cle" placeholder="Votre clé ${esc(F.nom)}" aria-label="Clé d'accès ${esc(F.nom)}" spellcheck="false" autocomplete="off" required><button type="submit" class="btn">✦ Connecter</button></form>
      <ul class="mia-garanties"><li>La clé reste dans ce navigateur. Elle n'est envoyée qu'à ${esc(F.ed)}, jamais à bilan.</li><li>Vos questions et les données du site utiles à la réponse partent directement de votre navigateur vers ${esc(F.ed)}.</li><li>Déconnexion en un clic, ici même : la clé est alors effacée.</li></ul>
    </div></section>${calc}</div>`;
    return;
  }
  const F = MIA_F[c.f];
  el.innerHTML = `${tete}${msg}<div class="mia-grid"><section class="panel"><div class="ph"><h2>Votre IA : ${esc(F.nom)}</h2><span data-mia-etat class="mia-etat"></span></div><div class="pb">
      <label class="fbt" for="miamod" style="display:block;margin-top:0">Modèle utilisé pour les réponses rédigées</label>
      <div id="miamods"><p class="muted">Lecture des modèles de votre compte ${esc(F.ed)}…</p></div>
      <p class="mia-prix">${esc(F.prix)}</p>
      <div class="mia-act"><button type="button" class="linkbtn" data-mia-off>Déconnecter mon IA</button><a class="lnk" href="${F.cle}" target="_blank" rel="noopener">Gérer mes clés chez ${esc(F.ed)} ↗</a></div>
      <p class="note" style="margin:10px 0 0">La clé reste dans ce navigateur et n'est envoyée qu'à ${esc(F.ed)}. Sur un ordinateur partagé, déconnectez-vous après usage.</p></div></section>${calc}</div>`;
  miaMaj();
  const m = await miaModeles(c), box = $("#miamods", el); if (!box) return;
  if (m.invalide) { miaDeconnecter(); return miaPage(autonome ? null : el, { erreur: m.erreur }); }
  if (m.erreur) { box.innerHTML = `<p class="mia-msg ko" style="margin:0">${esc(m.erreur)}</p>`; return; }
  box.innerHTML = `<select id="miamod" class="mia-sel">${m.l.map(x => `<option value="${esc(x.id)}"${x.id === c.model ? " selected" : ""}>${esc(x.nom)}${x.id === m.def.id ? " (rapide, recommandé pour ce site)" : ""}</option>`).join("")}</select>`;
  $("#miamod", box).onchange = e => { const x = m.l.find(y => y.id === e.target.value), o = miaLire(); if (!x || !o) return; miaEcrire({ ...o, model: x.id, nom: x.nom }); MIA.memo.clear(); miaMaj(); toast(`Modèle choisi : ${esc(x.nom)}.`); };
}
async function miaConnecterCle(form) {
  const f = MIA_CHOIX, key = String(new FormData(form).get("cle") || "").replace(/\s+/g, "");
  const btn = form.querySelector("button"), el = form.closest("#espb") || null;
  if (!MIA_F[f].forme.test(key)) return miaPage(el, { erreur: `Ce texte ne ressemble pas à une clé ${MIA_F[f].nom}. Copiez la clé entière depuis ${MIA_F[f].ed}.` });
  if (btn) { btn.disabled = true; btn.textContent = "Vérification…"; }
  const m = await miaModeles({ f, key });
  if (m.erreur) return miaPage(el, { erreur: m.erreur });
  if (!miaEcrire({ f, key, model: m.def.id, nom: m.def.nom, at: Date.now() })) return miaPage(el, { erreur: "Votre navigateur bloque le stockage local : la connexion est impossible." });
  MIA.memo.clear(); miaMaj();
  miaPage(el, { ok: `${MIA_F[f].nom} est connecté. Vos questions recevront une réponse rédigée par ${m.def.nom}.` });
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-mia-off]")) { e.preventDefault(); miaDeconnecter(); toast("Votre IA est déconnectée : la clé a été effacée de ce navigateur."); if (location.pathname === "/espace/ia") route(); }
});
document.addEventListener("change", e => {
  const r = e.target.closest && e.target.closest('input[name="miaf"]'); if (!r) return;
  MIA_CHOIX = r.value; miaPage(r.closest("#espb") || null);
});
document.addEventListener("submit", e => { const f = e.target.closest && e.target.closest("[data-mia-form]"); if (!f) return; e.preventDefault(); miaConnecterCle(f); });
ROUTES_EXTRA.push([/^\/espace\/ia$/, async () => {
  const m = typeof moi === "function" ? await moi() : { connecte: false };
  if (!m || !m.connecte) return miaPage(null);
  await pageEspace("reglages"); // en-tête et onglets de Mon espace
  const nav = $(".esptabs"); if (!nav) return miaPage(null);
  setTitle("Mon IA · Mon espace"); $$("a", nav).forEach(a => a.classList.remove("on"));
  const a = nav.querySelector('a[href="/espace/ia"]'); if (a) { a.classList.add("on"); nav.scrollLeft = Math.max(0, a.offsetLeft - 16); }
  miaPage($("#espb"));
}]);
(() => { // onglet « Mon IA » dans Mon espace
  const esp0 = window.pageEspace; if (typeof esp0 !== "function") return;
  window.pageEspace = async function (onglet) {
    await esp0(onglet);
    const nav = $(".esptabs"); if (!nav || nav.querySelector('a[href="/espace/ia"]')) return;
    const r = nav.querySelector('a[href="/espace/reglages"]'); const html = `<a href="/espace/ia">Mon IA</a>`;
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
