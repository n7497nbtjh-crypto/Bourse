/* Module « iacle » : l'IA du site sans dépendance payante (voir docs/ia.md).
   Chaîne de repli, de la plus sobre à la plus coûteuse :
     1. règles locales (ia.js : localCopilot, localAssist), instantanées et illimitées ;
     2. leçons de l'Académie (chercheLecons) ;
     3. IA installée sur l'appareil (WebLLM, index.html : LIA, liaAsk) si le visiteur l'a installée ;
     4. sa clé personnelle (BYOK) : appel direct du navigateur vers le service choisi, la clé ne quitte jamais le navigateur ;
     5. l'IA en ligne du site (/api/*), services gratuits d'abord, avec les quotas de compte.mjs.
   Les étapes 1 et 2 restent dans les appelants (iaRun, orcIaAsk, fiche). Ce module enveloppe iaFetch() :
   chaque appel à /api/assistant, /api/veille (bilan rédigé) ou /api/demande essaie 3 puis 4 avant 5.
   Réglages : page /espace/ia (« Mon IA »), accessible sans compte. */

const IAK_STORE = "bilan.ia_cle";
const IAK_FOURN = {
  groq: { nom: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", modele: "openai/gpt-oss-20b", lien: "https://console.groq.com/keys",
    note: "Offre gratuite d'environ 1 000 questions par jour. Très rapide." },
  mistral: { nom: "Mistral AI (France)", url: "https://api.mistral.ai/v1/chat/completions", modele: "mistral-small-latest", lien: "https://console.mistral.ai/api-keys",
    note: "Offre gratuite limitée à une requête par seconde. En gratuit, vos questions peuvent servir à entraîner leurs modèles." },
  gemini: { nom: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", modele: "gemini-flash-lite-latest", lien: "https://aistudio.google.com/apikey",
    note: "Offre gratuite. En gratuit, Google peut utiliser les échanges pour améliorer ses produits." },
  openrouter: { nom: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", modele: "openai/gpt-oss-20b:free", lien: "https://openrouter.ai/keys",
    note: "Donne accès à de nombreux modèles. Les modèles « :free » sont gratuits, 50 questions par jour." },
  ollama: { nom: "Ollama sur mon ordinateur", url: "http://localhost:11434/v1/chat/completions", modele: "qwen3:8b", sansCle: true, lien: "https://ollama.com/download",
    note: "Un modèle ouvert sur votre propre machine : rien ne sort de chez vous. Lancez Ollama avec OLLAMA_ORIGINS=" + location.origin + " pour autoriser le site." },
  autre: { nom: "Autre service compatible OpenAI", url: "", modele: "", lien: "",
    note: "Adresse complète du point d'accès « chat/completions », en https." },
};
const IAK = { prompts: null, avert: {} };

/* ---------- Stockage : session par défaut, appareil si le visiteur le demande ---------- */
function iakLire() {
  for (const st of ["localStorage", "sessionStorage"]) {
    try { const v = window[st].getItem(IAK_STORE); if (v) { const o = JSON.parse(v); if (o && o.url) return { ...o, garder: st === "localStorage" }; } } catch (e) { }
  }
  return null;
}
function iakEcrire(o) {
  iakEffacer();
  const v = JSON.stringify({ f: o.f, url: o.url, modele: o.modele, cle: o.cle || "", on: o.on !== false });
  try { (o.garder ? localStorage : sessionStorage).setItem(IAK_STORE, v); return true; } catch (e) { return false; }
}
function iakEffacer() { for (const st of ["localStorage", "sessionStorage"]) { try { window[st].removeItem(IAK_STORE); } catch (e) { } } }
/** Adresse acceptée : https, ou http seulement vers cet ordinateur (Ollama). Jamais l'adresse du site lui-même. */
function iakUrlOk(u) {
  try { const x = new URL(u); if (x.origin === location.origin) return false;
    return x.protocol === "https:" || (x.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(x.hostname)); } catch (e) { return false; }
}
const iakActive = () => { const c = iakLire(); return c && c.on && iakUrlOk(c.url) && (c.cle || (IAK_FOURN[c.f] || {}).sansCle) ? c : null; };
const iakNom = c => (IAK_FOURN[c.f] || {}).nom || (() => { try { return new URL(c.url).hostname; } catch (e) { return "service"; } })();

/* ---------- Appel direct du navigateur vers le service choisi (format OpenAI) ---------- */
async function iakAppel(c, messages, max_tokens = 500, json = false) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
  try {
    const h = { "content-type": "application/json" }; if (c.cle) h.authorization = "Bearer " + c.cle;
    const r = await fetch(c.url, { method: "POST", signal: ctl.signal, headers: h, credentials: "omit", referrerPolicy: "no-referrer",
      body: JSON.stringify({ model: c.modele, messages, max_tokens, temperature: 0.2, ...(json ? { response_format: { type: "json_object" } } : {}) }) });
    if (!r.ok) return { erreur: r.status };
    const j = await r.json(), raw = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    const txt = String(raw || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/, "").replace(/—/g, ",").replace(/\*\*/g, "").trim();
    return txt.length > 15 ? { txt } : { erreur: "vide" };
  } catch (e) { return { erreur: e && e.name === "AbortError" ? "délai" : "réseau" }; } finally { clearTimeout(t); }
}
function iakSignale(c, err) { // une seule fois par type d'erreur et par page
  const k = String(err); if (IAK.avert[k]) return; IAK.avert[k] = 1;
  const nom = esc(iakNom(c));
  const msg = err === 401 || err === 403 ? `Votre clé personnelle a été refusée par ${nom}.` : err === 429 ? `Votre limite chez ${nom} est atteinte pour le moment.`
    : err === "réseau" ? `${nom} ne répond pas depuis ce navigateur.` : `${nom} n'a pas pu répondre.`;
  if (typeof toast === "function") toast(`${msg} Le site prend le relais. <a href="/espace/ia">Mon IA</a>`);
}
async function iakPrompts() {
  if (IAK.prompts) return IAK.prompts;
  if (typeof LIA !== "undefined" && LIA.prompts) return IAK.prompts = LIA.prompts;
  try { IAK.prompts = await (await fetch("/data/prompts.json")).json(); } catch (e) { IAK.prompts = {}; }
  return IAK.prompts;
}

/* ---------- Ce que demande l'appel au serveur, traduit pour l'IA de l'appareil ou la clé personnelle ---------- */
function iakTache(url, opts) {
  if (!opts || String(opts.method || "GET").toUpperCase() !== "POST" || typeof opts.body !== "string") return null;
  const p = String(url).split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  let b; try { b = JSON.parse(opts.body); } catch (e) { return null; }
  if (p === "/api/assistant") { const q = String(b.question || "").replace(/\s+/g, " ").trim().slice(0, 300); if (q.length < 5) return null;
    const cmp = b.mode === "comparaison"; return { type: "texte", kind: cmp ? "comparaison" : "assistant", user: `Faits : ${JSON.stringify(b.faits || {}).slice(0, 9000)}\n\nQuestion : ${q}`, max: cmp ? 650 : 450, local: !cmp }; }
  if (p === "/api/veille") { const pf = b.type === "portefeuille"; return { type: "texte", kind: pf ? "portefeuille" : "veille", user: JSON.stringify(b.faits || {}).slice(0, 9000), max: 700, local: !pf }; }
  if (p === "/api/demande") { const q = String(b.question || "").trim().slice(0, 300); return q.length < 4 ? null : { type: "demande", q }; }
  return null;
}
async function iakRepondre(T) {
  const P = await iakPrompts();
  // 3. IA de l'appareil (les appelants du copilote, du portefeuille et de la comparaison l'ont déjà essayée)
  if (T.type === "texte" && T.local && typeof LIA !== "undefined" && LIA.eng && typeof liaAsk === "function") {
    const t = await liaAsk(T.kind, T.user, T.max); if (t) return { txt: t, ia: "appareil" };
  }
  // 4. Clé personnelle
  const c = iakActive(); if (!c) return null;
  if (T.type === "texte") {
    if (!P[T.kind]) return null;
    const r = await iakAppel(c, [{ role: "system", content: P[T.kind] }, { role: "user", content: T.user }], T.max);
    if (r.txt) return { txt: r.txt, ia: "cle", service: iakNom(c) };
    iakSignale(c, r.erreur); return null;
  }
  if (!P.demande) return null;
  const r = await iakAppel(c, [{ role: "system", content: P.demande }, { role: "user", content: T.q }], 500, true);
  if (!r.txt) { iakSignale(c, r.erreur); return null; }
  const a = typeof iaValide === "function" && typeof jsonFrom === "function" ? iaValide(jsonFrom(r.txt)) : null;
  if (!a) return null; // le serveur réessaiera avec sa propre consigne
  if (a.action === "repondre" && P.expliquer) { const x = await iakAppel(c, [{ role: "system", content: P.expliquer }, { role: "user", content: T.q }], 450); if (x.txt && x.txt.length > 40) a.texte = x.txt.slice(0, 2000); }
  return { ...a, ia: "cle", service: iakNom(c) };
}
const IAK_FETCH0 = window.iaFetch;
window.iaFetch = async function (url, opts = {}) {
  const T = iakTache(url, opts);
  if (T) { try { const r = await iakRepondre(T); if (r) return new Response(JSON.stringify(r), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } }); } catch (e) { } }
  return IAK_FETCH0(url, opts); // 5. IA en ligne du site, avec ses quotas
};
/** Mention de la source d'une réponse rédigée (pour les pieds de réponse). */
function iakSource(j) {
  if (j && j.ia === "cle") return `Rédigé par l'IA de votre clé personnelle (${esc(j.service || "service choisi")}), à partir des seules données du site. À vérifier ; ce n'est pas un conseil.`;
  if (j && j.ia === "appareil") return "Rédigé par l'IA installée sur votre appareil, à partir des seules données du site. À vérifier ; ce n'est pas un conseil.";
  return null;
}

/* ---------- Page « Mon IA » (/espace/ia) ---------- */
async function iakEtatServeur() { try { const r = await fetch("/api/ia/etat"); return r.ok ? await r.json() : null; } catch (e) { return null; } }
async function iakLimites() { try { const r = await fetch("/api/premium/offres"); return r.ok ? (await r.json()).limites : null; } catch (e) { return null; } }
function iakLimTxt(n) {
  const p = [[n("assistant"), "questions sur une fiche"], [n("demande"), "recherches libres"], [n("portefeuille"), "analyse de portefeuille"]].filter(([v]) => v != null).map(([v, l]) => `${v} ${l}`);
  return p.length ? ` Limite par jour en version gratuite : ${p.join(", ")}.` : "";
}
function iakChaineHTML(srv, lim) {
  const c = iakActive(), l = lim || {}, n = k => l[k] && l[k][0] != null ? l[k][0] : null;
  const lia = typeof LIA === "undefined" ? "off" : LIA.st;
  const et = [
    ["on", "Réponses calculées", "Recherches par critères, comparaisons, définitions et questions courantes sur une fiche : calculées dans votre navigateur à partir des comptes officiels.", "Toujours, sans limite"],
    ["on", "Cours de l'Académie", "Pour les questions de fond, les leçons rédigées et vérifiées qui y répondent.", "Toujours, sans limite"],
    [lia === "ready" ? "on" : lia === "unsupported" ? "na" : "off", "IA installée sur cet appareil", "Un modèle ouvert (Qwen, via WebLLM) qui tourne dans votre navigateur. Rien ne quitte votre appareil.", lia === "ready" ? "Active, sans limite" : lia === "loading" ? "Installation en cours" : lia === "unsupported" ? "Navigateur non compatible" : "Non installée"],
    [c ? "on" : "off", "Votre clé personnelle", "Votre propre compte chez un service d'IA. Les questions partent directement de votre navigateur vers ce service.", c ? "Active : " + esc(iakNom(c)) : "Non configurée"],
    [srv && srv.serveur ? "on" : srv ? "na" : "off", "IA en ligne du site", "Des services gratuits utilisés à tour de rôle par notre serveur, quand rien d'autre n'a pu répondre." + iakLimTxt(n),
      srv && srv.serveur ? "Active" : srv ? "Indisponible pour le moment" : "État inconnu"],
  ];
  return `<ol class="iak-ch">${et.map(([s, t, d, e], i) => `<li class="iak-${s}"><span class="iak-n">${i + 1}</span><div><b>${t}</b><p>${d}</p></div><span class="iak-st">${e}</span></li>`).join("")}</ol>
    <p class="note" style="margin:10px 0 0">Le site essaie ces étapes dans l'ordre et s'arrête à la première qui sait répondre. Sans aucune IA, toutes les pages, les chiffres et les réponses calculées restent disponibles.</p>`;
}
function iakFormHTML() {
  const c = iakLire() || { f: "groq", ...IAK_FOURN.groq, cle: "", garder: false, on: true }, F = IAK_FOURN[c.f] ? c.f : "autre";
  const masque = c.cle ? "•••• " + esc(c.cle.slice(-4)) : "";
  return `<form id="iakf" class="iak-f" autocomplete="off">
    <div class="iak-warn"><b>Avant de coller une clé</b><ul>
      <li>Votre clé reste dans ce navigateur. Elle n'est jamais envoyée aux serveurs de bilan.</li>
      <li>Le service choisi reçoit vos questions et les chiffres utiles (ceux de la fiche, ou de votre portefeuille si vous demandez son analyse). Lisez sa politique de confidentialité.</li>
      <li>Les éventuels frais sont facturés par ce service, selon votre compte chez lui. Préférez une offre gratuite ou une clé plafonnée.</li>
      <li>N'enregistrez pas de clé sur un ordinateur partagé. Vous pouvez la supprimer ici, et la révoquer à tout moment chez le service.</li></ul></div>
    <label>Service<select name="f">${Object.entries(IAK_FOURN).map(([k, v]) => `<option value="${k}"${k === F ? " selected" : ""}>${esc(v.nom)}</option>`).join("")}</select></label>
    <p class="iak-note" id="iaknote"></p>
    <label id="iakcle">Clé personnelle${masque ? ` <small class="light">(enregistrée : ${masque})</small>` : ""}<input type="password" name="cle" placeholder="${masque ? "Laisser vide pour garder la clé actuelle" : "Collez votre clé ici"}" autocomplete="off" spellcheck="false"></label>
    <details class="iak-adv"${F === "autre" ? " open" : ""}><summary>Options avancées</summary>
      <label>Adresse du service<input name="url" value="${esc(c.url || "")}" spellcheck="false" inputmode="url"></label>
      <label>Modèle<input name="modele" value="${esc(c.modele || "")}" spellcheck="false"></label></details>
    <label class="chk"><input type="checkbox" name="garder"${c.garder ? " checked" : ""}><span>Se souvenir de la clé sur cet appareil <small class="light">(sinon elle s'efface à la fermeture de l'onglet)</small></span></label>
    <div class="iak-act"><button class="btn" type="submit">Enregistrer et tester</button>${iakLire() ? `<button class="btn ghost" type="button" id="iakoff">${c.on === false ? "Réactiver" : "Mettre en pause"}</button><button class="linkbtn" type="button" id="iakdel">Supprimer la clé</button>` : ""}</div>
    <p class="iak-msg" id="iakmsg" role="status"></p></form>`;
}
function iakBind(root, rafraichir) {
  const f = $("#iakf", root); if (!f) return;
  const note = () => { const v = IAK_FOURN[f.f.value]; $("#iaknote", root).innerHTML = esc(v.note) + (v.lien ? ` <a class="lnk" href="${v.lien}" target="_blank" rel="noopener noreferrer">${v.sansCle ? "Télécharger" : "Obtenir une clé"} ↗</a>` : ""); $("#iakcle", root).hidden = !!v.sansCle; };
  f.f.onchange = () => { const v = IAK_FOURN[f.f.value]; if (v.url || f.f.value === "autre") { f.url.value = v.url; f.modele.value = v.modele; } if (f.f.value === "autre") $(".iak-adv", root).open = true; note(); };
  note();
  const msg = (t, ok) => { const m = $("#iakmsg", root); m.textContent = t; m.className = "iak-msg " + (ok ? "ok" : "ko"); };
  f.onsubmit = async e => {
    e.preventDefault();
    const old = iakLire(), v = IAK_FOURN[f.f.value], cle = f.cle.value.trim() || (old && old.f === f.f.value ? old.cle : "") || "";
    const c = { f: f.f.value, url: f.url.value.trim(), modele: f.modele.value.trim(), cle, garder: f.garder.checked, on: true };
    if (!iakUrlOk(c.url)) return msg("Adresse non acceptée : elle doit commencer par https:// (ou http://localhost pour Ollama).", false);
    if (!c.modele) return msg("Indiquez le nom du modèle (options avancées).", false);
    if (!v.sansCle && cle.length < 8) return msg("Collez votre clé personnelle.", false);
    if (/\s/.test(cle)) return msg("La clé contient des espaces : vérifiez le copier-coller.", false);
    msg("Test en cours…", true);
    const r = await iakAppel(c, [{ role: "user", content: "Réponds simplement : la connexion fonctionne bien." }], 30);
    if (!r.txt && r.erreur !== "vide") return msg(r.erreur === 401 || r.erreur === 403 ? "Clé refusée par le service. Rien n'a été enregistré." : r.erreur === 429 ? "Le service répond mais votre limite est atteinte. Réessayez plus tard." : r.erreur === "réseau" ? (v.sansCle ? "Ollama ne répond pas. Est-il lancé avec OLLAMA_ORIGINS=" + location.origin + " ?" : "Le service ne répond pas depuis ce navigateur. Rien n'a été enregistré.") : r.erreur === 404 ? "Modèle ou adresse introuvable chez le service." : "Le service a répondu par une erreur (" + r.erreur + ").", false);
    if (!iakEcrire(c)) return msg("Ce navigateur refuse l'enregistrement (navigation privée ?).", false);
    IAK.avert = {}; msg("C'est bon : votre clé fonctionne. Les questions passeront par " + iakNom(c) + " quand l'IA de l'appareil ne répond pas.", true);
    setTimeout(rafraichir, 1600);
  };
  const off = $("#iakoff", root); if (off) off.onclick = () => { const c = iakLire(); if (c) { c.on = c.on === false; iakEcrire(c); } rafraichir(); };
  const del = $("#iakdel", root); if (del) del.onclick = () => { iakEffacer(); rafraichir(); if (typeof toast === "function") toast("Clé supprimée de ce navigateur. Pensez à la révoquer chez le service si vous ne l'utilisez plus."); };
}
async function iakPage(el) {
  const autonome = !el;
  if (autonome) { setTitle("Mon IA"); setNav("esp"); el = app; }
  const [srv, lim] = await Promise.all([iakEtatServeur(), iakLimites()]);
  const draw = () => {
    el.innerHTML = `${autonome ? `<p class="kick">Mon espace</p><h1 class="pagetitle">Mon IA</h1><p class="pagesub">Comment le site répond à vos questions, et comment le rendre illimité sans payer d'abonnement.</p>` : ""}
      <div class="iak-grid"><section class="panel"><div class="ph"><h2>Qui répond à vos questions</h2></div><div class="pb">${iakChaineHTML(srv, lim)}
        <div style="margin-top:14px">${typeof liaBoxHTML === "function" ? liaBoxHTML() : ""}</div></div></section>
      <section class="panel"><div class="ph"><h2>Utiliser ma propre clé</h2><span class="light" style="font-size:12.5px">Facultatif</span></div><div class="pb">${iakFormHTML()}</div></section></div>`;
    iakBind(el, draw); if (typeof liaUI === "function") liaUI();
  };
  draw();
}
ROUTES_EXTRA.push([/^\/espace\/ia$/, async () => {
  const m = typeof moi === "function" ? await moi() : { connecte: false };
  if (!m || !m.connecte) return iakPage();
  await pageEspace("reglages"); // en-tête et onglets de Mon espace
  const nav = $(".esptabs"); if (!nav) return iakPage();
  setTitle("Mon IA · Mon espace"); $$("a", nav).forEach(a => a.classList.remove("on"));
  const a = nav.querySelector('a[href="/espace/ia"]'); if (a) { a.classList.add("on"); nav.scrollLeft = Math.max(0, a.offsetLeft - 16); }
  iakPage($("#espb"));
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

/* ---------- Section 6.1 : un seul point d'entrée IA, contextuel sur les listes ---------- */
const IAK_CTX0 = window.orcIaCtx;
if (typeof IAK_CTX0 === "function") window.orcIaCtx = function () {
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
  return IAK_CTX0();
};
function iakCtxBouton(texte) {
  return `<button type="button" class="iak-ctx" data-iakctx><span aria-hidden="true">✦</span> ${esc(texte)}</button>`;
}
document.addEventListener("click", e => { if (e.target.closest("[data-iakctx]") && typeof orcIaOpen === "function") orcIaOpen(); });
(() => {
  const ent0 = window.pageEntreprises, etf0 = window.pageEtfs;
  if (typeof ent0 === "function") window.pageEntreprises = function () { const r = ent0.apply(this, arguments); const s = $(".pagesub", app); if (s && !$("[data-iakctx]", app)) s.insertAdjacentHTML("beforeend", " " + iakCtxBouton("Chercher par critères avec l'IA")); return r; };
  if (typeof etf0 === "function") window.pageEtfs = function () { const r = etf0.apply(this, arguments); const s = $(".pagesub", app); if (s && !$("[data-iakctx]", app)) s.insertAdjacentHTML("beforeend", " " + iakCtxBouton("Trouver un ETF avec l'IA")); return r; };
})();
// Panneau de l'IA : lien vers les réglages, et source des réponses rédigées hors serveur
(() => {
  const go0 = () => { const ft = $("#orcia .orciaft"); if (ft && !ft.querySelector("a[href='/espace/ia']")) ft.insertAdjacentHTML("beforeend", ` <a href="/espace/ia">Réglages de l'IA</a>`); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(go0, 0)); else setTimeout(go0, 0);
})();

document.head.insertAdjacentHTML("beforeend", `<style>
.iak-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:900px){.iak-grid{grid-template-columns:1fr}}
.iak-ch{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.iak-ch li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.iak-ch li b{font-size:14.5px}.iak-ch li p{margin:2px 0 0;font-size:13px;color:var(--grey);line-height:1.45}
.iak-n{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:600 13px/1 inherit;background:var(--line);color:var(--ink)}
.iak-on .iak-n{background:var(--g);color:#fff}
.iak-st{font-size:12.5px;font-weight:600;text-align:right;max-width:170px;color:var(--grey)}.iak-on .iak-st{color:var(--g)}
@media (max-width:520px){.iak-ch li{grid-template-columns:26px minmax(0,1fr)}.iak-st{grid-column:2;text-align:left;max-width:none}}
.iak-f{display:flex;flex-direction:column;gap:12px}.iak-f label{display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:600}
.iak-f label.chk{flex-direction:row;align-items:flex-start;gap:8px;font-weight:400}.iak-f label.chk input{margin-top:3px}
.iak-f input:not([type=checkbox]),.iak-f select{height:42px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit;font-weight:400;background:#fff;min-width:0;width:100%;box-sizing:border-box}
.iak-warn{border:1px solid #E8C9A8;background:#FBF3EA;border-radius:12px;padding:10px 14px;font-size:13.5px}.iak-warn ul{margin:6px 0 0;padding-left:18px}.iak-warn li{margin:3px 0}
.iak-note{margin:-4px 0 0;font-size:13px;color:var(--grey)}
.iak-adv summary{cursor:pointer;font-size:13.5px;color:var(--grey)}.iak-adv[open] summary{margin-bottom:8px}.iak-adv label{margin-top:8px}
.iak-act{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.iak-msg{margin:0;font-size:13.5px;min-height:1.2em}.iak-msg.ok{color:var(--g)}.iak-msg.ko{color:#B4471F}
.iak-ctx{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;padding:5px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);font:600 13px inherit;color:var(--ink);cursor:pointer;vertical-align:middle}
.iak-ctx span{color:var(--g)}.iak-ctx:hover{border-color:var(--ink)}
.orciaft a{color:inherit;text-decoration:underline}
</style>`);
