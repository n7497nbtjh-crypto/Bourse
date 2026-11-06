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
const MODELES = [
  ["@cf/qwen/qwen3-30b-a3b-fp8", 4625, 30475, "Qwen3 30B"],
  ["@cf/mistralai/mistral-small-3.1-24b-instruct", 31876, 50488, "Mistral Small 3.1"],
];
const jour = () => new Date().toISOString().slice(0, 10); // les limites de Cloudflare repartent à 0 h UTC
// 4/11 puis 6/11 (décisions de Romain) : gratuit = 3 questions par semaine (avant : 5), avec ou sans compte ; Premium = 30 par jour.
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
  questions: { visiteur: +env.IA_GRATUIT_SEMAINE || 3, compte: +env.IA_GRATUIT_SEMAINE || 3, premium: +env.IA_PREMIUM_JOUR || 30 } }); // noms neufs : les anciennes variables (IA_QUESTIONS_JOUR…) sont ignorées
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
export async function iaSite(request, env) {
  const url = new URL(request.url), P = plafonds(env);
  if (url.pathname === "/api/ia/traduire") return traduire(request, env);
  const { niveau: nv, h } = await niveau(request, env), plafond = P.questions[nv], per = periode(nv);
  if (url.pathname === "/api/ia/etat") {
    if (!env.AI) return json({ disponible: false, raison: "absente", niveau: nv });
    const c = await compteurs(env, h, per);
    if (c.erreur) return json({ disponible: false, raison: "compteur", detail: c.detail, niveau: nv });
    const epuise = nv !== "premium" && !siteOk(c, P, 300);
    return json({ disponible: !epuise && c.questions < plafond, reste_visiteur: Math.max(0, plafond - c.questions), site_epuise: epuise, plafond_visiteur: plafond, niveau: nv, plafonds: P.questions, periode: nv === "premium" ? "jour" : "semaine" });
  }
  if (url.pathname !== "/api/ia/rediger") return json({ error: "Introuvable" }, 404);
  if (request.method !== "POST") return json({ error: "Méthode non permise" }, 405);
  if (!env.AI) return json({ indisponible: true, message: "L'IA du site n'est pas disponible pour le moment." }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible" }, 400); }
  const sys = CONSIGNES[b && b.tache];
  if (!sys) return json({ error: "Tâche inconnue" }, 400);
  const user = String(b.user || "").slice(0, 15000), max = Math.min(Math.max(+b.max || 600, 200), 900);
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
  for (const [model, cin, cout, nom] of MODELES) {
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
  const r = await iaJSON(env, "syn2", CONSIGNES.semaine_entreprise, faits, 360, x => x && typeof x.clair === "string" && x.clair.length > 20 && !VAGUE.test(x.clair + " " + (x.change || "")) ? { clair: x.clair.replace(/—/g, ","), change: String(x.change || "").replace(/—/g, ",") } : null);
  return r;
}
const VAGUE = /pourrai(t|ent) (influencer|refl(é|e)ter|avoir des cons(é|e)quences)|(a|ont) pu influencer|en ligne avec (la tendance|le s&p|le cac|l.indice)|je ne suis pas s[uû]r|difficile d.(é|e)valuer|trop t(ô|o)t pour|il est difficile|impact (r(é|e)el|exact)|sans donn(é|e)es (significatives|chiffr)|n.indique pas de chiffres/i;
/* Appel de l'IA du site par le serveur, réponse JSON vérifiée par `valide` (qui renvoie l'objet gardé ou null).
   Même faits, même tâche → même réponse, servie par la table ia_syn (gardée 10 jours). Compté dans les neurones du jour, jamais au-delà de la part gratuite. */
export async function iaJSON(env, prefixe, sys, faits, max, valide) {
  if (!env.AI || !env.DB || !sys) return null;
  const user = JSON.stringify(faits).slice(0, 14000), k = await empreinte(prefixe + "|" + user);
  try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ia_syn (k TEXT PRIMARY KEY, txt TEXT NOT NULL, modele TEXT, at INTEGER NOT NULL)`).run(); } catch (e) { return null; }
  try { const hit = await env.DB.prepare(`SELECT txt, modele FROM ia_syn WHERE k = ?`).bind(k).first(); if (hit) { const o = objDe(hit.txt); if (o && o._refus) return null; const x = valide(o); if (x) return { ...x, modele: hit.modele }; } } catch (e) { }
  const P = plafonds(env), c = await compteurs(env, "syn", jour());
  let repondu = false;
  if (c.erreur) return null;
  for (const [model, cin, cout, nom] of MODELES) {
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
const objDe = t => { if (!t) return null; const i = t.indexOf("{"), j = t.lastIndexOf("}"); if (i < 0 || j <= i) return null; try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; } };
const jsonDe = t => { if (!t) return null; const i = t.indexOf("{"), j = t.lastIndexOf("}"); if (i < 0 || j <= i) return null; try { const o = JSON.parse(t.slice(i, j + 1)); return o && typeof o.clair === "string" ? o : null; } catch (e) { return null; } };
