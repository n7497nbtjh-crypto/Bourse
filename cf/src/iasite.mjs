// L'IA du site (29 octobre 2026, à la demande de Romain : une IA sur le site, gratuite pour tous, sans clé ni compte).
// Cloudflare Workers AI, par la liaison AI du projet Pages : 10 000 « neurones » gratuits par jour et par compte
// (developers.cloudflare.com/workers-ai/platform/pricing, consulté le 29/10/2026). Le site s'arrête avant : plafond
// IA_NEURONES_JOUR (9 000 par défaut), compté dans la base D1. Au-delà, le site garde ses réponses calculées : aucun coût.
// Trois niveaux (business plan du 29/10/2026) : visiteur sans compte IA_QUESTIONS_JOUR (3 par jour, empreinte anonyme du jour),
// compte gratuit IA_QUESTIONS_COMPTE (10 par jour, par compte), Premium IA_QUESTIONS_PREMIUM (150 par jour, usage raisonnable).
// Budget mensuel IA_BUDGET_MOIS (euros, 0 par défaut) : à 0, le site reste dans la part gratuite du jour ; au-delà de 0, il peut
// dépasser jusqu'à ce budget (0,011 $ les 1 000 neurones), puis l'IA s'arrête pour les gratuits ; Premium continue.
// Les consignes sont celles du serveur (cf/src/consignes.mjs) : le navigateur choisit la tâche, pas le texte des consignes.
// Les questions partent chez Cloudflare (sous-traitant déjà utilisé pour l'hébergement) ; Workers AI ne s'en sert pas pour entraîner ses modèles.
import { CONSIGNES } from "./consignes.mjs";
import { visitor, visiteurSemaine, sessionCompte, premiumOf } from "./compte.mjs";

// Coût en neurones par million de jetons [entrée, sortie] (tarif Cloudflare d'octobre 2026). Le moins cher d'abord.
// 8/11 : la synthèse de presse (lue par beaucoup, écrite une fois par semaine et par entreprise) prend le plus grand modèle, plus fidèle en français
const MODELES_PRESSE = [["@cf/meta/llama-3.3-70b-instruct-fp8-fast", 26668, 204805, "Llama 3.3 70B"]];
const MODELES = [
  ["@cf/qwen/qwen3-30b-a3b-fp8", 4625, 30475, "Qwen3 30B"],
  ["@cf/mistralai/mistral-small-3.1-24b-instruct", 31876, 50488, "Mistral Small 3.1"],
];
const jour = () => new Date().toISOString().slice(0, 10); // les limites de Cloudflare repartent à 0 h UTC
// 4/11 puis 6/11 (décisions de Romain) : gratuit = 3 questions par semaine (avant : 5), avec ou sans compte ; Premium = 30 par jour, puis 50 (8/11, Romain).
// Compteur des gratuits sur la semaine (clé « S » + lundi, heure UTC), celui de Premium sur le jour.
const lundi = (t = Date.now()) => { const d = new Date(t); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
const periode = nv => nv === "premium" ? jour() : "S" + lundi();
const jetons = s => Math.ceil(String(s).length / 3.2);
const nettoie = t => String(t || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/g, "").replace(/—/g, ",").replace(/\*\*/g, "").trim();
const json = (o, status = 200) => Response.json(o, { status, headers: { "cache-control": "no-store" } });

let pret = false;
async function init(db) {
  if (pret || !db) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_neurones (jour TEXT PRIMARY KEY, n REAL NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_visiteurs (jour TEXT NOT NULL, h TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (jour, h))`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_cache (k TEXT PRIMARY KEY, txt TEXT NOT NULL, modele TEXT, at INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0)`).run(); // 5e passage (C) : réponses identiques servies sans rappeler le modèle (24 h)
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_niveaux (mois TEXT NOT NULL, niveau TEXT NOT NULL, n REAL NOT NULL, q INTEGER NOT NULL, PRIMARY KEY (mois, niveau))`).run(); // neurones et questions par niveau (visiteur, compte, premium) et par mois
  await db.prepare(`CREATE TABLE IF NOT EXISTS ia_trad (h TEXT PRIMARY KEY, fr TEXT NOT NULL, at INTEGER NOT NULL)`).run(); // 4/11 : titres d'annonces traduits, partagés par tous
  pret = true;
}
const NEURONES_GRATUITS_JOUR = 10000, NEURONES_PAR_EURO = 99000; // 1 € ≈ 1,09 $ ≈ 99 000 neurones à 0,011 $ les 1 000
// Qui pose la question : Premium, compte gratuit ou visiteur anonyme ; h = clé du compteur
async function niveau(request, env) {
  const p = await premiumOf(request, env).catch(() => null);
  const c = p ? null : await sessionCompte(request, env).catch(() => null);
  if (p) return { niveau: "premium", h: "p:" + String(p.token).slice(0, 24) };
  const v = await visiteurSemaine(request, env); // stable sur la semaine ; compté aussi avec un compte : se connecter ne redonne pas 5 questions
  if (c && c.id) return { niveau: "compte", h: ["c:" + c.id, v] };
  return { niveau: "visiteur", h: v };
}
// Les compteurs sont la garantie du coût nul : s'ils ne peuvent pas être lus, l'IA ne répond pas (erreur: true).
async function compteurs(env, h, per = jour()) {
  if (!env.DB) return { erreur: true, neurones: 0, questions: 0 };
  try {
    await init(env.DB);
    const a = await env.DB.prepare(`SELECT n FROM ia_neurones WHERE jour = ?`).bind(jour()).first();
    let b = null; for (const x of [].concat(h)) { const r = await env.DB.prepare(`SELECT n FROM ia_visiteurs WHERE jour = ? AND h = ?`).bind(per, x).first(); if (r && (!b || r.n > b.n)) b = r; }
    const m = await env.DB.prepare(`SELECT SUM(MAX(n - ?, 0)) AS p FROM ia_neurones WHERE jour LIKE ?`).bind(NEURONES_GRATUITS_JOUR, jour().slice(0, 7) + "%").first();
    return { neurones: (a && a.n) || 0, questions: (b && b.n) || 0, payes_mois: (m && m.p) || 0 };
  } catch (e) { return { erreur: true, neurones: 0, questions: 0, detail: String(e && e.message || e) }; }
}
async function compter(env, h, neurones, per = jour()) {
  if (!env.DB) return;
  await env.DB.prepare(`INSERT INTO ia_neurones (jour, n) VALUES (?, ?) ON CONFLICT (jour) DO UPDATE SET n = n + ?`).bind(jour(), neurones, neurones).run();
  for (const x of [].concat(h)) await env.DB.prepare(`INSERT INTO ia_visiteurs (jour, h, n) VALUES (?, ?, 1) ON CONFLICT (jour, h) DO UPDATE SET n = n + 1`).bind(per, x).run();
  if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM ia_visiteurs WHERE (jour NOT LIKE 'S%' AND jour < ?) OR (jour LIKE 'S%' AND jour < ?)`).bind(jour(), "S" + lundi(Date.now() - 14 * 864e5)).run();
}
const plafonds = env => ({ neurones: +env.IA_NEURONES_JOUR || 9000, budget: Math.max(0, +env.IA_BUDGET_MOIS || 0) * NEURONES_PAR_EURO,
  questions: { visiteur: +env.IA_GRATUIT_SEMAINE || 3, compte: +env.IA_GRATUIT_SEMAINE || 3, premium: +env.IA_PREMIUM_JOUR || 50 } }); // noms neufs : les anciennes variables (IA_QUESTIONS_JOUR…) sont ignorées
// Le site a-t-il encore de quoi répondre à un gratuit ? Dans la part gratuite du jour, ou dans le budget du mois.
const siteOk = (c, P, marge) => c.neurones + marge < P.neurones || (P.budget > 0 && c.payes_mois + marge < P.budget);

/** GET /api/ia/etat et POST /api/ia/rediger { tache, user, max }. */
async function empreinte(t) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(d)].slice(0, 16).map(x => x.toString(16).padStart(2, "0")).join(""); }
async function parNiveau(env, nv, neurones) { await env.DB.prepare(`INSERT INTO ia_niveaux (mois, niveau, n, q) VALUES (?, ?, ?, 1) ON CONFLICT (mois, niveau) DO UPDATE SET n = n + ?, q = q + 1`).bind(jour().slice(0, 7), nv, neurones, neurones).run(); }
export async function iaMesures(env) { // pour /api/espace/mesures : neurones et questions du mois par niveau, réponses servies par le cache, coût estimé au-delà de la part gratuite
  try { await init(env.DB); const m = jour().slice(0, 7);
    const L = (await env.DB.prepare(`SELECT niveau, n, q FROM ia_niveaux WHERE mois = ?`).bind(m).all()).results || [];
    const c = await env.DB.prepare(`SELECT COUNT(*) AS n, SUM(n) AS servis FROM ia_cache WHERE at > ?`).bind(Date.now() - 30 * 864e5).first();
    const p = await env.DB.prepare(`SELECT SUM(MAX(n - ?, 0)) AS p FROM ia_neurones WHERE jour LIKE ?`).bind(NEURONES_GRATUITS_JOUR, m + "%").first();
    return { mois: m, par_niveau: L, cache: { reponses: (c && c.n) || 0, servies_sans_modele: (c && c.servis) || 0 }, neurones_payants_mois: (p && p.p) || 0, cout_estime_eur: Math.round(((p && p.p) || 0) / NEURONES_PAR_EURO * 100) / 100 };
  } catch (e) { return { erreur: String(e && e.message || e) }; }
}
/** POST /api/ia/traduire { t: [titres en anglais] } → { fr: [titres en français ou null] }.
 * 4/11 (Romain : « corrige les actualités qui se mettent en anglais ») : titres des annonces officielles publiées en anglais
 * (Oslo, Nasdaq Nordic, FCA). Traduits une fois pour tous et gardés (table ia_trad) ; payés sur la même part gratuite du jour
 * que l'IA du site, sans entamer les questions des visiteurs ; au-delà du plafond, le titre reste en anglais. */
async function traduire(request, env) {
  if (request.method !== "POST") return json({ error: "Méthode non permise" }, 405);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible" }, 400); }
  const T = (Array.isArray(b && b.t) ? b.t : []).slice(0, 30).map(x => String(x || "").replace(/\s+/g, " ").trim().slice(0, 300));
  if (!T.length || !env.DB) return json({ fr: T.map(() => null) });
  await init(env.DB);
  const H = await Promise.all(T.map(t => empreinte("trad|" + t))), fr = T.map(() => null), manque = [];
  for (let i = 0; i < T.length; i++) { const r = await env.DB.prepare(`SELECT fr FROM ia_trad WHERE h = ?`).bind(H[i]).first().catch(() => null); if (r) fr[i] = r.fr; else if (T[i].length > 2) manque.push(i); }
  if (!manque.length || !env.AI) return json({ fr });
  const P = plafonds(env), c = await compteurs(env, "trad");
  if (c.erreur) return json({ fr });
  const [model, cin, cout] = MODELES.find(m => m[0].includes("mistral")) || MODELES[0];
  const user = manque.map((i, n) => `${n + 1}. ${T[i]}`).join("\n"), max = Math.min(900, 40 + manque.length * 45);
  const estime = (jetons(user) * cin + max * cout) / 1e6 + 30;
  if (!siteOk(c, P, estime)) return json({ fr });
  const sys = "Tu traduis en français des titres d'annonces officielles de sociétés cotées, écrits en anglais ou dans une langue nordique. Réponds uniquement par les traductions, une par ligne, numérotées comme les titres reçus (« 1. … »). Garde les noms de sociétés, les sigles et les montants tels quels. Style sobre et factuel, pas de point final, pas de tiret cadratin.";
  try {
    const out = await env.AI.run(model, { messages: [{ role: "system", content: sys }, { role: "user", content: user }], max_tokens: max, temperature: 0.1 });
    const raw = nettoie(out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content)));
    const u = out && out.usage, reel = u && u.prompt_tokens ? (u.prompt_tokens * cin + (u.completion_tokens || 0) * cout) / 1e6 : estime;
    await env.DB.prepare(`INSERT INTO ia_neurones (jour, n) VALUES (?, ?) ON CONFLICT (jour) DO UPDATE SET n = n + ?`).bind(jour(), reel, reel).run();
    const L = {}; for (const l of String(raw || "").split("\n")) { const m = l.match(/^\s*(\d+)[.)]\s*(.+)$/); if (m) L[+m[1]] = m[2].replace(/^[«"]\s*|\s*[»"]$/g, "").replace(/\.$/, "").trim(); }
    for (let n = 0; n < manque.length; n++) { const i = manque[n], t = L[n + 1];
      if (t && t.length > 2 && t.length < 400) { fr[i] = t; await env.DB.prepare(`INSERT OR REPLACE INTO ia_trad (h, fr, at) VALUES (?, ?, ?)`).bind(H[i], t, Date.now()).run(); } }
  } catch (e) { }
  return json({ fr });
}
/* 8/11 (Romain : « l'IA ne peut pas se baser uniquement sur le titre, elle doit analyser l'article ») : le texte d'un article de presse,
   lu à la demande (bouton « Expliquer »), pour que l'IA du site le résume. Garde-fous : seulement un article déjà listé par le site pour
   cette entreprise (data/actu), robots.txt du média respecté, texte gardé 7 jours (table ia_article), 6 000 caractères au plus. */
const UA_ART = "ENKLAIR (site d'information boursiere; +https://enklair.com)";
function robotsOk(txt, chemin) {
  let actif = false, dis = [], all = [], vu = false;
  for (const l0 of String(txt || "").split("\n")) { const l = l0.replace(/#.*/, "").trim(); if (!l) continue; const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (vu) { actif = false; vu = false; } actif = actif || v === "*" || /enklair/i.test(v); continue; }
    vu = true; if (!actif) continue;
    if (k === "disallow" && v) dis.push(v); if (k === "allow" && v) all.push(v); }
  const pre = r => { const re = new RegExp("^" + r.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")); return re.test(chemin) ? r.length : -1; };
  const d = Math.max(-1, ...dis.map(pre)), a = Math.max(-1, ...all.map(pre)); return d < 0 || a >= d;
}
function texteArticle(html) {
  const h = String(html || "").replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ");
  const art = (h.match(/<article[\s\S]*?<\/article>/i) || [h])[0];
  const ps = [...art.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;/g, "'").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim()).filter(p => p.length > 60);
  return ps.join("\n").slice(0, 6000);
}
async function article(request, env, url) {
  const k = url.searchParams.get("k") || "", u = url.searchParams.get("u") || "";
  if (!/^c:[a-z0-9-]+$/.test(k) || !/^https:\/\//.test(u)) return json({ error: "Article inconnu." }, 400);
  const id = k.slice(2);
  let connu = false;
  try { const r = await env.ASSETS.fetch(new Request(new URL(`/data/actu/c/${id}.json`, url.origin))); const j = r.ok ? await r.json() : {}; connu = [...(j.p || []), ...(j.o || [])].some(a => a && a.u === u); } catch (e) { }
  if (!connu) try { const r = await env.ASSETS.fetch(new Request(new URL("/data/actu/semaine.json", url.origin))); const j = r.ok ? await r.json() : {}; connu = ((j.items || {})[id] || []).some(a => a && a.u === u); } catch (e) { }
  if (!connu) return json({ error: "Cet article n'est pas dans l'actualité suivie par le site." }, 404);
  return json(await lireArticle(env, u));
}
async function lireArticle(env, u) {
  if (env.DB) try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ia_article (u TEXT PRIMARY KEY, txt TEXT, etat TEXT, at INTEGER)`).run();
    const c = await env.DB.prepare(`SELECT txt, etat, at FROM ia_article WHERE u = ?`).bind(u).first();
    if (c && Date.now() - c.at < 7 * 864e5) return { texte: c.txt || "", etat: c.etat }; } catch (e) { }
  const cible = new URL(u); let etat = "lu", texte = "";
  try { const rb = await fetch(cible.origin + "/robots.txt", { headers: { "user-agent": UA_ART }, signal: AbortSignal.timeout(5000) });
    if (rb.ok && !robotsOk(await rb.text(), cible.pathname + cible.search)) etat = "interdit"; } catch (e) { }
  if (etat === "lu") try { const r = await fetch(u, { headers: { "user-agent": UA_ART, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    texte = r.ok ? texteArticle(await r.text()) : ""; if (texte.length < 300) etat = "illisible"; } catch (e) { etat = "illisible"; }
  if (etat !== "lu") texte = "";
  if (env.DB) try { await env.DB.prepare(`INSERT OR REPLACE INTO ia_article (u, txt, etat, at) VALUES (?, ?, ?, ?)`).bind(u, texte, etat, Date.now()).run(); } catch (e) { }
  return { texte, etat };
}
/* 8/11 (Romain : « une synthèse des articles », « beaucoup de gens vont avoir Apple dans leur rapport ») : ce que dit la presse d'une entreprise
   sur une semaine (au plus 5 articles lus, robots.txt respecté), résumée par l'IA du site UNE fois par entreprise et par semaine, puis servie
   à tous (table ia_presse). Ne compte pas dans les questions des visiteurs ; reste dans la part gratuite du jour (iaJSON). */
/* Garde-fous : chaque nombre et chaque pays du résumé doit se trouver dans les articles (l'IA a écrit « en France » pour un article sur l'Espagne) */
const PAYS = { france: "\\bfran[cç]|frankreich|francia", espagne: "espa|spain|spagn|spanien", italie: "ital", allemagne: "german|deutsch|alleman", "royaume-uni": "royaume|united kingdom|britain|uk\\b|regno unito", "états-unis": "united states|u\\.s\\.|us\\b|usa|amér|americ|estados unidos|stati uniti|états", chine: "chin|china|cina", japon: "japan|japon|giappon", inde: "india|inde", canada: "canad", australie: "austral|tasman|\\baud\\b|a\\$", suisse: "suisse|switz|swiss|svizzera|schweiz", "pays-bas": "netherlands|pays-bas|dutch|nederland", belgique: "belg", brésil: "bra[sz]il", mexique: "mexi", corée: "kore|corée|corea" };
function presseFidele(txt, lus) { // garde les phrases dont chaque nombre et chaque pays se trouvent dans l'article cité (« selon … »), sinon dans l'un des articles
  const tous = lus.map(a => a.titre + " " + a.texte).join(" "), garde = [];
  const MOIS = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
  for (const par of String(txt).split("\n")) {
    const ok = [];
    for (const ph of par.split(/(?<=[.!?])\s+/)) {
      const cite = lus.filter(a => a.media && ph.toLowerCase().includes(String(a.media).toLowerCase().replace(/^www\./, "")));
      const src = (cite.length ? cite.map(a => a.titre + " " + a.texte).join(" ") : tous).toLowerCase(), srcT = tous.toLowerCase();
      const srcN = " " + src.replace(/(\d)[\s.,'\u202f\u00a0](?=\d)/g, "$1") + " ", srcD = src.replace(/[^0-9]/g, " ");
      let bon = true;
      const sansDates = ph.replace(new RegExp("\\b\\d{1,2}(er)?\\s+(" + MOIS + ")", "gi"), "").replace(/\b20[1-3]\d\b/g, "");
      for (const n of sansDates.match(/\d[\d\s.,\u202f\u00a0]*\d|\d/g) || []) { const d = n.replace(/[^0-9]/g, "").replace(/^0+/, "").replace(/(\d)0+$/, "$1"); if (d.length >= 2 && !srcN.includes(d) && !srcD.includes(d)) { bon = false; presseFidele.raison = "chiffre " + n; } }
      const t = ph.toLowerCase();
      for (const [p, re] of Object.entries(PAYS)) if (t.includes(p) && !new RegExp(re, "i").test(src) && !(cite.length === 0 && new RegExp(re, "i").test(srcT))) { bon = false; presseFidele.raison = "lieu " + p; }
      if (PRESSE_CONSEIL.test(ph)) { bon = false; presseFidele.raison = "conseil"; }
      if (bon) ok.push(ph);
    }
    if (ok.length) garde.push(ok.join(" "));
  }
  return garde.join("\n");
}
// 8/11 : homonymes (« Nov » pris pour le mois) et conseils glissés par la presse : synthèse refusée ou phrase retirée
// 8/11 (Romain : « un margen brut », « une marge brute ») : fautes connues du modèle corrigées à l'écriture et à la lecture du cache
function frCorrige(t) {
  return String(t || "")
    .replace(/\bmargen brut[oa]?\b/gi, "marge brute").replace(/\bmargen\b/gi, "marge")
    .replace(/\b(un|le|ce|du) marge\b/gi, (m, d) => ({ un: "une", le: "la", ce: "cette", du: "de la" })[d.toLowerCase()] + " marge")
    .replace(/\b(marges?(?: brutes?| nettes?| opérationnelles?)?)\s+(inférieur|supérieur|élevé|faible|stable|réduit|bas|haut)(s?)\b/gi, (m, n, a, pl) => n + " " + (a === "faible" || a === "stable" ? a : a.replace(/eur$/, "eure").replace(/é$/, "ée").replace(/t$/, "te").replace(/bas$/, "basse").replace(/haut$/, "haute")) + (/s$/.test(n) ? "s" : ""))
    .replace(/\bdes chips\b/g, "des puces").replace(/\bchips\b/g, "puces")
    .replace(/\s+%/g, "\u00a0%");
}
const PRESSE_HORS = /n'(a|ont) pas été mentionn|n'est pas mentionn|ne (mentionne|parle) pas de l'entreprise|aucun (des )?article(s)? ne (parle|mentionne|concerne)/i;
const PRESSE_CONSEIL = /conseill|recommand|à acheter|à vendre|stocks? to buy|rééquilibrer|investissements? sélectif/i;
async function synthesePresse(request, env, url) {
  const k = url.searchParams.get("k") || "", au = url.searchParams.get("au") || "";
  if (!/^c:[a-z0-9-]+$/.test(k) || !/^\d{4}-\d{2}-\d{2}$/.test(au)) return json({ error: "Demande illisible." }, 400);
  const id = k.slice(2), du = new Date(Date.parse(au + "T00:00:00Z") - 6 * 864e5).toISOString().slice(0, 10), cle = "v8|" + k + "|" + au;
  const samedi = Date.parse(au + "T21:00:00Z") - 2 * 864e5; // écrite après la clôture de Wall Street le vendredi (robot presse.yml) ou plus tard : gardée pour la semaine
  if (env.DB) try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ia_presse (cle TEXT PRIMARY KEY, txt TEXT, at INTEGER)`).run();
    const c = await env.DB.prepare(`SELECT txt, at FROM ia_presse WHERE cle = ?`).bind(cle).first();
    if (c && (c.at >= samedi || Date.now() - c.at < 12 * 36e5) && !PRESSE_HORS.test(c.txt) && !PRESSE_CONSEIL.test(c.txt)) { const o = JSON.parse(c.txt); o.clair = frCorrige(o.clair); return json(o); } } catch (e) { }
  let A = [];
  try { const r = await env.ASSETS.fetch(new Request(new URL(`/data/actu/c/${id}.json`, url.origin))); const j = r.ok ? await r.json() : {};
    A = (j.p || []).filter(a => a && a.u && /^https:\/\//.test(a.u) && String(a.d || "").slice(0, 10) >= du && String(a.d || "").slice(0, 10) <= au).slice(0, 7); } catch (e) { }
  if (A.length < 2) return json({ vide: true });
  const lus = [];
  for (const a of A) { const t = await lireArticle(env, a.u); lus.push({ n: lus.length + 1, media: a.s || new URL(a.u).hostname.replace(/^www\./, ""), date: String(a.d).slice(0, 10), titre: a.t || "", texte: (t.texte || "").slice(0, 1500) }); }
  const nom = url.searchParams.get("nom") || id;
  presseFidele.raison = "";
  const r = await iaJSON(env, "presse-sem10", CONSIGNES.presse_semaine, { entreprise: nom, semaine_du: du, au, articles: lus }, 520,
    x => (x && Array.isArray(x.paragraphes) && (x.clair = x.paragraphes.map(p => String(p).replace(/\bmargen brut[oa]?\b/gi, "marge brute").replace(/\bmargen\b/gi, "marge")).join("\n")), x && typeof x.clair === "string" && x.clair.length > 80 ? true : (presseFidele.raison = "forme " + JSON.stringify(x).slice(0, 120), false)) && !x.aucun && !/je ne suis pas|en tant qu|ce que je ne sais pas/i.test(x.clair) && !PRESSE_HORS.test(x.clair) && (x.clair = presseFidele(x.clair, lus)).length > 80 ? {
      clair: frCorrige(x.clair.replace(/—/g, ",")).replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1").replace(/\n{2,}/g, "\n").trim(),
      sujets: (Array.isArray(x.sujets) ? x.sujets : []).map(String).slice(0, 4),
      articles: (Array.isArray(x.articles) ? x.articles : []).map(Number).filter(n => n >= 1 && n <= lus.length) } : null, MODELES_PRESSE).catch(() => null);
  if (!r) return json({ indisponible: true, raison: presseFidele.raison || "" });
  const t = r.clair.toLowerCase(), nums = new Set(r.articles || []);
  lus.forEach(a => { if (t.includes(String(a.media).toLowerCase())) nums.add(a.n); });
  const pris = nums.size ? [...nums].sort((a, b) => a - b).map(n => A[n - 1]).filter(Boolean) : A;
  const out = { clair: r.clair, sujets: r.sujets, n: pris.length, sources: pris.map(a => ({ media: a.s || new URL(a.u).hostname.replace(/^www\./, ""), titre: a.t || "", u: a.u, date: String(a.d).slice(0, 10) })) };
  if (env.DB) try { await env.DB.prepare(`INSERT OR REPLACE INTO ia_presse (cle, txt, at) VALUES (?, ?, ?)`).bind(cle, JSON.stringify(out), Date.now()).run(); } catch (e) { }
  return json(out);
}
export async function iaSite(request, env) {
  const url = new URL(request.url), P = plafonds(env);
  if (url.pathname === "/api/ia/traduire") return traduire(request, env);
  if (url.pathname === "/api/ia/article") return article(request, env, url);
  if (url.pathname === "/api/ia/presse") return synthesePresse(request, env, url);
  const { niveau: nv, h } = await niveau(request, env), plafond = P.questions[nv], per = periode(nv);
  if (url.pathname === "/api/ia/etat") {
    if (!env.AI) return json({ disponible: false, raison: "absente", niveau: nv });
    const c = await compteurs(env, h, per);
    if (c.erreur) return json({ disponible: false, raison: "compteur", detail: c.detail, niveau: nv });
    const epuise = nv !== "premium" && !siteOk(c, P, 300);
    return json({ disponible: !epuise && c.questions < plafond, reste_visiteur: Math.max(0, plafond - c.questions), site_epuise: epuise, plafond_visiteur: plafond, niveau: nv, plafonds: P.questions, periode: nv === "premium" ? "jour" : "semaine", neurones_jour: Math.round(c.neurones), plafond_neurones_jour: P.neurones }); // 7/11 nuit : consommation du jour, pour la page État du site
  }
  if (url.pathname !== "/api/ia/rediger") return json({ error: "Introuvable" }, 404);
  if (request.method !== "POST") return json({ error: "Méthode non permise" }, 405);
  if (!env.AI) return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment." }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible" }, 400); }
  const sys = CONSIGNES[b && b.tache];
  if (!sys) return json({ error: "Tâche inconnue" }, 400);
  const user = String(b.user || "").slice(0, 9000), max = Math.min(Math.max(+b.max || 450, 150), 500); // 7/11 soir : contexte et réponse plus courts (coût de l'IA divisé par deux environ)
  if (user.length < 3) return json({ error: "Question vide" }, 400);
  const c = await compteurs(env, h, per);
  if (c.erreur) return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment (compteur illisible)." }, 503);
  if (c.questions >= plafond) return json({ limite: "visiteur", niveau: nv, message: nv === "premium" ? `Vous avez posé ${plafond} questions à l'IA aujourd'hui, la limite d'usage raisonnable. Elle revient demain.`
    : `Vous avez posé vos ${plafond} questions à l'IA de la semaine. Elles reviennent lundi ; avec Premium, vous en avez ${P.questions.premium} par jour. Les réponses calculées restent disponibles.` }, 429);
  const messages = [{ role: "system", content: sys }, { role: "user", content: user }];
  // Cache : même tâche, mêmes faits, même question → même réponse, sans coût ; la question compte quand même dans le quota du visiteur (pas de contournement)
  const k = await empreinte(b.tache + "|" + max + "|" + user);
  try { const hit = await env.DB.prepare(`SELECT txt, modele FROM ia_cache WHERE k = ? AND at > ?`).bind(k, Date.now() - 864e5).first();
    if (hit) { await compter(env, h, 0, per); await env.DB.prepare(`UPDATE ia_cache SET n = n + 1 WHERE k = ?`).bind(k).run(); await parNiveau(env, nv, 0); return json({ txt: hit.txt, modele: hit.modele, cache: true }); } } catch (e) { }
  for (const [model, cin, cout, nom] of modeles) {
    const estime = (jetons(sys + user) * cin + max * cout) / 1e6;
    if (nv !== "premium" && !siteOk(c, P, estime)) continue; // Premium passe toujours : son abonnement paie la réponse
    try {
      const msgs = model.includes("qwen3") ? [messages[0], { role: "user", content: user + "\n/no_think" }] : messages;
      const out = await env.AI.run(model, { messages: msgs, max_tokens: max, temperature: 0.2 });
      const raw = out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
      const txt = nettoie(raw && typeof raw === "object" ? JSON.stringify(raw) : raw);
      const u = out && out.usage, reel = u && u.prompt_tokens ? (u.prompt_tokens * cin + (u.completion_tokens || 0) * cout) / 1e6 : estime;
      try { await compter(env, h, reel, per); } catch (e) { return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment (compteur en panne)." }, 503); }
      if (txt.length > 15) { try { await env.DB.prepare(`INSERT OR REPLACE INTO ia_cache (k, txt, modele, at, n) VALUES (?, ?, ?, ?, 0)`).bind(k, txt, nom, Date.now()).run(); if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM ia_cache WHERE at < ?`).bind(Date.now() - 2 * 864e5).run(); /* le cache ne garde rien au-delà de 48 h */ await parNiveau(env, nv, reel); } catch (e) { } return json({ txt, modele: nom }); }
    } catch (e) { /* modèle suivant */ }
  }
  return json({ limite: "site", niveau: nv, message: P.budget > 0 ? "L'IA du site a atteint son budget du mois pour les visiteurs gratuits. Les réponses calculées restent disponibles ; Premium n'a pas cette limite." : "L'IA du site a atteint sa part gratuite pour aujourd'hui. Les réponses calculées restent disponibles, et l'IA revient demain." }, 429);
}

/* 6/11 (Romain : « les articles expliqués par l'IA, entreprise par entreprise ») : synthèse de la semaine d'une entreprise pour le rapport.
   Appelée par le serveur (cf/src/espace.mjs) quand le rapport est construit : pas de quota visiteur, mais comptée dans les neurones du jour.
   Même entreprise, mêmes annonces → même texte, servi par la table ia_syn (gardée 10 jours) : un seul appel pour tous les abonnés qui suivent l'entreprise. */
export async function syntheseEntreprise(env, faits) {
  // 6/11 soir : textes vagues refusés (« pourrait influencer… », « je ne suis pas sûr ») ; le rapport garde alors sa phrase calculée
  const r = await iaJSON(env, "syn4", CONSIGNES.semaine_entreprise, faits, 220, x => x && typeof x.clair === "string" && x.clair.length > 20 && !VAGUE.test(x.clair + " " + (x.change || "")) ? { clair: x.clair.replace(/—/g, ",").replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1"), change: String(x.change || "").replace(/—/g, ",") } : null);
  return r;
}
const VAGUE = /en raison de|gr(â|a)ce (à|a) (la|ses|son|cette) publication|performances variables|guidance|(montrent|confirm\w*) (une|sa|la)|pourrai(t|ent) (influencer|refl(é|e)ter|avoir des cons(é|e)quences)|(a|ont) pu influencer|en ligne avec (la tendance|le s&p|le cac|l.indice)|je ne suis pas s[uû]r|difficile d.(é|e)valuer|trop t(ô|o)t pour|il est difficile|impact (r(é|e)el|exact)|sans donn(é|e)es (significatives|chiffr)|n.indique pas de chiffres/i;
/* Appel de l'IA du site par le serveur, réponse JSON vérifiée par `valide` (qui renvoie l'objet gardé ou null).
   Même faits, même tâche → même réponse, servie par la table ia_syn (gardée 10 jours). Compté dans les neurones du jour, jamais au-delà de la part gratuite. */
export async function iaJSON(env, prefixe, sys, faits, max, valide, modeles = MODELES) {
  if (!env.AI || !env.DB || !sys) return null;
  const user = JSON.stringify(faits).slice(0, 14000), k = await empreinte(prefixe + "|" + user);
  try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ia_syn (k TEXT PRIMARY KEY, txt TEXT NOT NULL, modele TEXT, at INTEGER NOT NULL)`).run(); } catch (e) { return null; }
  try { const hit = await env.DB.prepare(`SELECT txt, modele FROM ia_syn WHERE k = ?`).bind(k).first(); if (hit) { const o = objDe(hit.txt); if (o && o._refus) return null; const x = valide(o); if (x) return { ...x, modele: hit.modele }; } } catch (e) { }
  const P = plafonds(env), c = await compteurs(env, "syn", jour());
  let repondu = false;
  if (c.erreur) return null;
  for (const [model, cin, cout, nom] of modeles) {
    const estime = (jetons(sys + user) * cin + max * cout) / 1e6;
    if (!siteOk(c, P, estime)) return null; // la part gratuite du jour est épuisée : le rapport garde ses phrases calculées
    try {
      const msgs = model.includes("qwen3") ? [{ role: "system", content: sys }, { role: "user", content: user + "\n/no_think" }] : [{ role: "system", content: sys }, { role: "user", content: user }];
      const out = await env.AI.run(model, { messages: msgs, max_tokens: max, temperature: 0.2 });
      const raw = out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
      const txt = nettoie(raw && typeof raw === "object" ? JSON.stringify(raw) : raw), x = valide(objDe(txt));
      const u = out && out.usage, reel = u && u.prompt_tokens ? (u.prompt_tokens * cin + (u.completion_tokens || 0) * cout) / 1e6 : estime;
      try { await env.DB.prepare(`INSERT INTO ia_neurones (jour, n) VALUES (?, ?) ON CONFLICT (jour) DO UPDATE SET n = n + ?`).bind(jour(), reel, reel).run(); } catch (e) { }
      repondu = true;
      if (!x) break; // réponse refusée : pas de second modèle (chaque appel compte dans la limite de Cloudflare), la phrase calculée s'affiche
      if (x) {
        try { await env.DB.prepare(`INSERT OR REPLACE INTO ia_syn (k, txt, modele, at) VALUES (?, ?, ?, ?)`).bind(k, JSON.stringify(x), nom, Date.now()).run(); if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM ia_syn WHERE at < ?`).bind(Date.now() - 10 * 864e5).run(); } catch (e) { }
        return { ...x, modele: nom };
      }
    } catch (e) { /* modèle suivant */ }
  }
  // Réponse refusée (texte creux, JSON illisible) : gardée comme refus pour ne pas repayer le même appel ; la phrase calculée s'affiche
  if (repondu) try { await env.DB.prepare(`INSERT OR REPLACE INTO ia_syn (k, txt, modele, at) VALUES (?, ?, ?, ?)`).bind(k, '{"_refus":1}', null, Date.now()).run(); } catch (e) { }
  return null;
}
const objDe = t => { if (!t) return null; const i = t.indexOf("{"), j = t.lastIndexOf("}"); if (i < 0 || j <= i) return null; const b = t.slice(i, j + 1); try { return JSON.parse(b); } catch (e) { try { return JSON.parse(b.replace(/\r?\n/g, " ")); } catch (e2) { return null; } } }; // 8/11 : un saut de ligne brut dans une chaîne rendait la réponse illisible
const jsonDe = t => { if (!t) return null; const i = t.indexOf("{"), j = t.lastIndexOf("}"); if (i < 0 || j <= i) return null; try { const o = JSON.parse(t.slice(i, j + 1)); return o && typeof o.clair === "string" ? o : null; } catch (e) { return null; } };
