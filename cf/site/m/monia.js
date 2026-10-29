/* Module « monia » de bilan. : « Connecter mon IA » (voir docs/ia.md). Chargé en dernier.
   - Sans connexion, le site répond avec ses réponses calculées (cf/site/ia.js, leçons de l'Académie, données) : gratuit et illimité.
   - « Connecter mon IA » : connexion au compte OpenRouter du visiteur (OAuth PKCE), choix d'un modèle dans une courte liste.
     La clé obtenue reste dans ce navigateur (localStorage) : elle n'est envoyée qu'à openrouter.ai, jamais au site.
   - iaRediger(tâche, faits, { question }) : envoie la consigne (cf/src/consignes.mjs → /data/prompts.json), les faits
     calculés par le site et la question au modèle choisi. Sans IA connectée : { invite: true }, l'appelant garde la réponse calculée.
   Le site n'appelle aucun modèle lui-même et ne paie aucune IA. */

const MIA_OR = "https://openrouter.ai";
const MIA_CLE = "bilan.monia"; // { key, model, nom, gratuit, at }
const MIA_PKCE = "bilan.monia.pkce";
const MIA = { prompts: null, modeles: null, memo: new Map() };

/* ---------- Ce que garde le navigateur ---------- */
function miaLire() { try { const o = JSON.parse(localStorage.getItem(MIA_CLE) || "null"); return o && typeof o.key === "string" && o.key ? o : null; } catch (e) { return null; } }
function miaEcrire(o) { try { localStorage.setItem(MIA_CLE, JSON.stringify(o)); return true; } catch (e) { return false; } }
function miaDeconnecter() { try { localStorage.removeItem(MIA_CLE); } catch (e) { } MIA.memo.clear(); miaMaj(); }
const miaConnectee = () => { const c = miaLire(); return !!(c && c.model); };
const miaNomModele = () => { const c = miaLire(); return c && c.model ? (c.nom || c.model) : null; };
function miaSess() { try { return sessionStorage; } catch (e) { return localStorage; } }

/* ---------- Connexion OpenRouter (OAuth PKCE, https://openrouter.ai/docs/guides/overview/auth/oauth) ---------- */
const miaB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function miaConnecter() {
  const verif = miaB64(crypto.getRandomValues(new Uint8Array(32))), etat = miaB64(crypto.getRandomValues(new Uint8Array(12)));
  const defi = miaB64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verif)));
  try { miaSess().setItem(MIA_PKCE, JSON.stringify({ verif, etat, at: Date.now() })); } catch (e) { toast("Votre navigateur bloque le stockage local : la connexion est impossible."); return; }
  const cb = location.origin + "/espace/ia";
  location.assign(`${MIA_OR}/auth?callback_url=${encodeURIComponent(cb)}&code_challenge=${defi}&code_challenge_method=S256&state=${etat}&key_label=${encodeURIComponent("bilan. (" + location.host + ")")}`);
}
/** Retour d'OpenRouter sur /espace/ia?code=… : échange du code contre la clé, directement entre le navigateur et OpenRouter. */
async function miaRetour() {
  const u = new URLSearchParams(location.search), code = u.get("code"); if (!code) return null;
  history.replaceState({}, "", "/espace/ia"); // le code ne reste pas dans l'adresse
  let p = null; try { p = JSON.parse(miaSess().getItem(MIA_PKCE) || "null"); miaSess().removeItem(MIA_PKCE); } catch (e) { }
  if (!p || !p.verif || Date.now() - p.at > 15 * 60e3) return { erreur: "La connexion a expiré. Recommencez avec le bouton « Connecter mon IA »." };
  if (u.get("state") && u.get("state") !== p.etat) return { erreur: "La réponse d'OpenRouter ne correspond pas à votre demande. Recommencez." };
  try {
    const r = await fetch(MIA_OR + "/api/v1/auth/keys", { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, code_verifier: p.verif, code_challenge_method: "S256" }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.key) return { erreur: r.status === 403 ? "OpenRouter a refusé le code (expiré ou déjà utilisé). Recommencez." : "OpenRouter n'a pas pu finaliser la connexion. Réessayez dans un instant." };
    const avant = miaLire() || {};
    miaEcrire({ key: j.key, model: avant.model || null, nom: avant.nom || null, gratuit: avant.gratuit || false, at: Date.now() });
    return { ok: true };
  } catch (e) { return { erreur: "OpenRouter est injoignable depuis ce navigateur. Vérifiez votre connexion." }; }
}

/* ---------- Choix du modèle : courte liste tirée de l'API publique /api/v1/models ---------- */
// Éditeurs connus, dans l'ordre d'affichage ; modèles spécialisés (code, image, son, sécurité), trop petits, en lot ou « qui réfléchissent » écartés.
const MIA_EDITEURS = [["mistralai/", "Mistral AI"], ["google/", "Google"], ["meta-llama/", "Meta"], ["deepseek/", "DeepSeek"], ["nvidia/", "NVIDIA"], ["qwen/", "Qwen"], ["openai/", "OpenAI"], ["microsoft/", "Microsoft"], ["anthropic/", "Anthropic"]];
const MIA_EXCLU = /(vision|-vl\b|omni|embed|guard|cod(e|er|estral)|audio|voxtral|image|tts|whisper|ocr|math|research|online|search|sonar|nano|tiny|\b[0-4](\.\d)?b\b|:batch|:extended|:thinking|:beta|reasoning|preview|exp\b|safety|moderation|uncensored|roleplay)/i;
const MIA_SECOURS = [ // si la liste en ligne ne répond pas (relevé du 29 octobre 2026 par la sonde data/sonde/ia-simple.mjs)
  { id: "google/gemma-4-31b-it:free", nom: "Gemma 4 31B", editeur: "Google", gratuit: true },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", nom: "Nemotron 3 Ultra", editeur: "NVIDIA", gratuit: true },
  { id: "mistralai/mistral-small-3.2-24b-instruct", nom: "Mistral Small 3.2 24B", editeur: "Mistral AI", gratuit: false, cout: 0.033 },
  { id: "deepseek/deepseek-v4-flash", nom: "DeepSeek V4 Flash", editeur: "DeepSeek", gratuit: false, cout: 0.036 },
];
function miaTrier(data) {
  const ok = (data || []).filter(m => m && typeof m.id === "string" && !MIA_EXCLU.test(m.id) && (m.context_length || 0) >= 32000
    && (!m.architecture || ((m.architecture.output_modalities || ["text"]).join() === "text" && (m.architecture.input_modalities || ["text"]).includes("text"))));
  const ed = m => MIA_EDITEURS.find(([p]) => m.id.startsWith(p));
  const prix = m => { const p = m.pricing || {}; return (+p.prompt || 0) * 3000 + (+p.completion || 0) * 500; }; // une question : environ 3 000 jetons envoyés, 500 reçus
  const nom = m => String(m.name || m.id).replace(/^[^:]{2,30}:\s*/, "").replace(/\s*\(free\)\s*$/i, "").trim();
  const gr = [], pa = [];
  for (const [p, n] of MIA_EDITEURS) {
    const l = ok.filter(m => m.id.startsWith(p)).sort((a, b) => (b.created || 0) - (a.created || 0));
    const g = l.find(m => /:free$/.test(m.id) || prix(m) === 0); if (g) gr.push({ id: g.id, nom: nom(g), editeur: n, gratuit: true });
    const c = l.find(m => !/:free$/.test(m.id) && prix(m) > 0 && prix(m) < 0.0008); if (c) pa.push({ id: c.id, nom: nom(c), editeur: n, gratuit: false, cout: prix(c) * 100 }); // moins de 0,08 $ les 100 questions
  }
  return [...gr.slice(0, 4), ...pa.slice(0, 4)].filter(m => ed(m));
}
async function miaModeles() {
  if (MIA.modeles) return MIA.modeles;
  try {
    const r = await fetch(MIA_OR + "/api/v1/models", { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(12000) });
    const l = miaTrier((await r.json()).data); if (l.length >= 2) return MIA.modeles = { l, secours: false };
  } catch (e) { }
  return MIA.modeles = { l: MIA_SECOURS, secours: true };
}
async function miaQuota(c) { // questions gratuites du jour sur le compte OpenRouter (champ documenté de GET /api/v1/key)
  try { const r = await fetch(MIA_OR + "/api/v1/key", { credentials: "omit", referrerPolicy: "no-referrer", headers: { authorization: "Bearer " + c.key } });
    if (r.status === 401) return { invalide: true };
    const d = ((await r.json()) || {}).data || {}; return { gratuit: d.free_model_daily_requests || null, libre: d.is_free_tier }; } catch (e) { return null; }
}

/* ---------- Appel du modèle (navigateur → OpenRouter) ---------- */
async function miaPrompts() {
  if (MIA.prompts) return MIA.prompts;
  try { MIA.prompts = await (await fetch("/data/prompts.json")).json(); } catch (e) { MIA.prompts = null; }
  return MIA.prompts || {};
}
const miaNettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/, "").replace(/—/g, ",").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
async function miaAppel(c, messages, max_tokens = 600) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 75000);
  try {
    const r = await fetch(MIA_OR + "/api/v1/chat/completions", { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", signal: ctl.signal,
      headers: { authorization: "Bearer " + c.key, "content-type": "application/json", "HTTP-Referer": location.origin, "X-Title": "bilan." },
      body: JSON.stringify({ model: c.model, messages, max_tokens, temperature: 0.2 }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { miaDeconnecter(); return { message: "Votre connexion OpenRouter n'est plus valable : reconnectez votre IA." }; }
    if (r.status === 402) return { message: "Votre compte OpenRouter n'a plus de crédit pour ce modèle. Choisissez un modèle gratuit dans « Mon IA »." };
    if (r.status === 429) return { message: "Votre limite chez OpenRouter est atteinte pour le moment (les modèles gratuits sont limités par jour). Réessayez plus tard ou choisissez un autre modèle." };
    if (!r.ok) return { message: `Le modèle choisi n'a pas pu répondre${j.error && j.error.message ? ` (${String(j.error.message).slice(0, 120)})` : ""}. Essayez un autre modèle dans « Mon IA ».` };
    const txt = miaNettoie(((j.choices || [])[0] || {}).message ? j.choices[0].message.content : "");
    return txt.length > 15 ? { txt } : { message: "Le modèle a renvoyé une réponse vide. Réessayez ou choisissez un autre modèle." };
  } catch (e) { return { message: e && e.name === "AbortError" ? "Le modèle met trop de temps à répondre. Réessayez." : "OpenRouter est injoignable depuis ce navigateur." }; }
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
    out = { txt: m ? r.txt.slice(0, m.index).trim() : r.txt, sources: m ? m[1].trim() : null, modele: c.nom || c.model, ia: "connectee" };
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
  return { ...a, ia: "connectee", modele: c.nom || c.model };
}

/* ---------- Petits morceaux d'interface ---------- */
/** Pied d'une réponse rédigée, ou invitation discrète à connecter son IA. */
function miaPied(j) {
  if (j && j.ia === "connectee") return `${j.sources ? `<p class="mia-src"><b>Sources</b> ${esc(j.sources)}</p>` : ""}<p class="iafoot">Rédigé par votre IA connectée (${esc(j.modele || "modèle choisi")}, via OpenRouter) à partir des seules données du site. À vérifier ; ce n'est pas un conseil.</p>`;
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
async function miaPage(el, retour) {
  const autonome = !el; if (autonome) { setTitle("Mon IA"); setNav("esp"); el = app; }
  const tete = autonome ? `<p class="kick">Mon espace</p><h1 class="pagetitle">Mon IA</h1><p class="pagesub">Le site répond toujours avec ses calculs, gratuitement et sans limite. Connectez votre propre IA pour obtenir en plus des réponses rédigées.</p>` : "";
  const c = miaLire();
  const msg = retour && retour.erreur ? `<p class="mia-msg ko">${esc(retour.erreur)}</p>` : retour && retour.ok ? `<p class="mia-msg ok">Votre compte OpenRouter est connecté. Choisissez maintenant un modèle.</p>` : "";
  const calc = `<section class="panel"><div class="ph"><h2>Toujours disponible : les réponses calculées</h2></div><div class="pb"><p style="margin-top:0">Recherches par critères, comparaisons, définitions, questions courantes sur une fiche, leçons de l'Académie : le site calcule la réponse dans votre navigateur, à partir des comptes officiels et de ses données. Rien à installer, aucune limite.</p>
    <p class="muted" style="margin:0;font-size:13.5px">Vous utilisez déjà ChatGPT ou Claude ? <a class="lnk" href="/connecteur">Utilisez bilan. dans ChatGPT ou Claude</a>.</p></div></section>`;
  if (!c) {
    el.innerHTML = `${tete}${msg}<div class="mia-grid"><section class="panel mia-cta"><div class="ph"><h2>Connecter mon IA</h2><span class="light" style="font-size:12.5px">Facultatif · gratuit</span></div><div class="pb">
      <ol class="mia-etapes"><li>Vous vous connectez à votre compte <b>OpenRouter</b> (service qui donne accès à de nombreux modèles d'IA, dont des modèles gratuits). La création du compte est gratuite.</li>
        <li>Vous choisissez un modèle dans une courte liste. Les modèles gratuits sont signalés.</li>
        <li>Vos questions reçoivent une réponse rédigée, appuyée sur les chiffres et les sources du site.</li></ol>
      <button type="button" class="btn" data-mia-connect>✦ Connecter mon IA</button>
      <ul class="mia-garanties"><li>La clé d'accès reste dans ce navigateur. Elle n'est jamais envoyée à bilan.</li><li>Vos questions et les données du site utiles à la réponse partent directement de votre navigateur vers OpenRouter et le modèle choisi.</li><li>Déconnexion en un clic, ici même.</li></ul>
    </div></section>${calc}</div>`;
    return;
  }
  el.innerHTML = `${tete}${msg}<div class="mia-grid"><section class="panel"><div class="ph"><h2>Votre IA</h2><span data-mia-etat class="mia-etat"></span></div><div class="pb">
      <p class="fbt" style="margin-top:0">Modèle utilisé pour les réponses rédigées</p><div id="miamods" class="mia-mods"><p class="muted">Chargement de la liste des modèles…</p></div>
      <p class="muted" id="miaquota" style="font-size:13px;margin:10px 0 0"></p>
      <div class="mia-act"><button type="button" class="linkbtn" data-mia-off>Déconnecter mon IA</button><a class="lnk" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">Gérer mes clés chez OpenRouter</a></div>
      <p class="note" style="margin:10px 0 0">La clé reste dans ce navigateur et n'est envoyée qu'à OpenRouter. Sur un ordinateur partagé, déconnectez-vous après usage.</p></div></section>${calc}</div>`;
  miaMaj();
  const { l, secours } = await miaModeles(), cur = miaLire();
  const box = $("#miamods", el); if (!box) return;
  box.innerHTML = l.map(m => `<label class="mia-mod${cur && cur.model === m.id ? " on" : ""}"><input type="radio" name="miamod" value="${esc(m.id)}"${cur && cur.model === m.id ? " checked" : ""}><span><b>${esc(m.nom)}</b><small>${esc(m.editeur)}</small></span><em class="${m.gratuit ? "g" : ""}">${m.gratuit ? "Gratuit" : m.cout != null ? `environ ${m.cout < 0.01 ? "moins de 0,01" : F2.format(m.cout)} $ les 100 questions` : "Payant"}</em></label>`).join("")
    + `<p class="note" style="margin:6px 0 0">${secours ? "Liste de secours : la liste en ligne d'OpenRouter n'a pas répondu. " : "Liste tirée d'OpenRouter, filtrée sur des modèles généralistes d'éditeurs connus. "}Les modèles gratuits sont limités par OpenRouter (de l'ordre de 50 questions par jour sur un compte gratuit). Les modèles payants utilisent le crédit de votre compte OpenRouter.</p>`;
  box.onchange = e => { const m = l.find(x => x.id === e.target.value); const o = miaLire(); if (!m || !o) return; miaEcrire({ ...o, model: m.id, nom: m.nom, gratuit: m.gratuit }); MIA.memo.clear();
    $$(".mia-mod", box).forEach(x => x.classList.toggle("on", x.contains(e.target))); miaMaj(); toast(`IA connectée : ${esc(m.nom)}.`); };
  if (cur && !cur.model && l[0]) { const m = l[0]; miaEcrire({ ...cur, model: m.id, nom: m.nom, gratuit: m.gratuit }); const r = $(`input[value="${CSS.escape(m.id)}"]`, box); if (r) { r.checked = true; r.closest(".mia-mod").classList.add("on"); } miaMaj(); }
  const q = await miaQuota(cur), qe = $("#miaquota", el);
  if (q && q.invalide) { miaDeconnecter(); return miaPage(autonome ? null : el, { erreur: "La clé n'est plus valable chez OpenRouter : reconnectez votre IA." }); }
  if (qe && q && q.gratuit && q.gratuit.limit) qe.textContent = `Questions aux modèles gratuits aujourd'hui : ${q.gratuit.used ?? 0} sur ${q.gratuit.limit}.`;
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-mia-connect]")) { e.preventDefault(); miaConnecter(); }
  if (e.target.closest("[data-mia-off]")) { e.preventDefault(); miaDeconnecter(); toast("Votre IA est déconnectée : la clé a été effacée de ce navigateur."); if (location.pathname === "/espace/ia") route(); }
});
ROUTES_EXTRA.push([/^\/espace\/ia$/, async () => {
  const retour = await miaRetour();
  const m = typeof moi === "function" ? await moi() : { connecte: false };
  if (!m || !m.connecte) return miaPage(null, retour);
  await pageEspace("reglages"); // en-tête et onglets de Mon espace
  const nav = $(".esptabs"); if (!nav) return miaPage(null, retour);
  setTitle("Mon IA · Mon espace"); $$("a", nav).forEach(a => a.classList.remove("on"));
  const a = nav.querySelector('a[href="/espace/ia"]'); if (a) { a.classList.add("on"); nav.scrollLeft = Math.max(0, a.offsetLeft - 16); }
  miaPage($("#espb"), retour);
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
