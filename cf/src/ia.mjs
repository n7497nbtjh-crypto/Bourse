// IA du site (Cloudflare Workers AI, offert dans le palier gratuit : aucun crédit Claude).
//  /api/resume?u=…    résumé en français d'un document officiel (communiqué AMF en PDF, dépôt SEC), gardé en base
//  /api/veille        bilan rédigé d'une liste d'entreprises suivies (données du site fournies par le navigateur)
//  /api/veille/inscription, /confirmer, /desinscrire : bilan hebdomadaire par e-mail (actif quand MAIL_FROM et un service d'envoi sont définis)
//  /api/veille/envoi, /alertes : envois groupés déclenchés par le robot (.github/workflows/mails.yml) avec ADMIN_KEY
//  /api/assistant      questions sur une fiche, réponses tirées des seules données transmises
import { quota, quotaError, sendMail, mailReady, mailCapacity, premiumOf, initCompte } from "./compte.mjs";
import { cours } from "./cours.mjs";
const MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
const MAX_JOUR = 110; // appels au modèle par jour sur tout le site (palier gratuit Workers AI : 10 000 neurones) ; à relever avec le palier payant
const HOSTS = /^(www\.sec\.gov|fr\.ftp\.opendatasoft\.com|www\.info-financiere\.gouv\.fr)$/;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS resumes (u TEXT PRIMARY KEY, txt TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ia_compte (jour TEXT PRIMARY KEY, n INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS veille (token TEXT PRIMARY KEY, email TEXT NOT NULL, ids TEXT NOT NULL, ok INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)`,
];
let ready = false;
async function init(db) { if (ready) return; for (const q of SCHEMA) await db.prepare(q).run(); ready = true; }
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const UA = "bilan (site pedagogique) contact@repere-bourse.pages.dev";

export function htmlText(html) {
  return String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&[a-z]+;/g, " ")
    .replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
async function budget(db, env = {}) { // compteur quotidien : true si on peut encore appeler le modèle aujourd'hui
  const jour = new Date().toISOString().slice(0, 10);
  const r = await db.prepare(`SELECT n FROM ia_compte WHERE jour = ?`).bind(jour).first();
  if (r && r.n >= (+env.IA_MAX_JOUR || MAX_JOUR)) return false;
  await db.prepare(`INSERT INTO ia_compte (jour, n) VALUES (?, 1) ON CONFLICT (jour) DO UPDATE SET n = n + 1`).bind(jour).run();
  return true;
}
async function docText(env, u) {
  const url = new URL(u);
  if (url.hostname === "www.sec.gov") { // dépôt SEC : la pièce jointe principale (communiqué EX-99.1) si elle existe
    let target = u;
    try { const idx = await (await fetch(u.replace(/[^/]+$/, "index.json"), { headers: { "user-agent": UA } })).json();
      const files = ((idx.directory || {}).item || []).filter(f => /\.htm/i.test(f.name) && !/index/i.test(f.name));
      const ex = files.find(f => /ex-?99[._-]?1|ex991|exhibit99/i.test(f.name)); if (ex) target = u.replace(/[^/]+$/, ex.name); } catch (e) { }
    const r = await fetch(target, { headers: { "user-agent": UA } }); if (!r.ok) throw new Error("document " + r.status);
    return htmlText(await r.text());
  }
  const r = await fetch(u); if (!r.ok) throw new Error("document " + r.status);
  const buf = await r.arrayBuffer(); if (buf.byteLength > 8e6) throw new Error("document trop lourd");
  const md = await env.AI.toMarkdown([{ name: "doc.pdf", blob: new Blob([buf], { type: "application/pdf" }) }]);
  return String((md[0] || {}).data || "");
}
// Rapports longs (10-Q, 10-K) : on saute la couverture et le sommaire pour aller à l'analyse de la direction (MD&A)
export function focus(t) {
  if (t.length < 30000) return t;
  const re = /management['’]s discussion and analysis/gi; let m, best = -1;
  while ((m = re.exec(t))) { const after = t.slice(m.index, m.index + 3000); if ((after.match(/%/g) || []).length >= 4 && /\$\s?\d/.test(after)) { best = m.index; break; } }
  return best >= 0 ? t.slice(best) : t;
}
const SYS = `Tu es un journaliste financier pédagogue qui écrit pour des personnes qui débutent en Bourse. Tu résumes en français un document officiel publié par une entreprise cotée.
Règles strictes :
- Utilise uniquement les informations et les chiffres présents dans le document. N'invente rien. Si un chiffre n'y figure pas, ne le donne pas.
- Écris 140 à 220 mots, en trois paragraphes courts, précédés exactement de ces titres sur leur propre ligne : « Ce qui est annoncé », « Ce que ça veut dire », « À surveiller ».
- Donne les chiffres clés avec leur période et leur évolution (par exemple : chiffre d'affaires du trimestre, résultat, prévisions, dividende, rachats d'actions). Montants en français (12,4 milliards d'euros ; +5 %).
- Explique simplement ce que signifient les termes techniques la première fois qu'ils apparaissent.
- Reste prudent et factuel : aucun conseil d'achat ou de vente, aucune prédiction sur le cours.
- Pas de tirets cadratins, pas de listes à puces, pas de formules creuses.`;
export async function resume(request, env) {
  if (!env || !env.DB || !env.AI) return json({ error: "Résumés indisponibles pour le moment." }, 503);
  const u = new URL(request.url).searchParams.get("u") || "";
  let url; try { url = new URL(u); } catch (e) { return json({ error: "Adresse invalide." }, 400); }
  if (!HOSTS.test(url.hostname)) return json({ error: "Source non prise en charge." }, 400);
  await init(env.DB);
  const hit = await env.DB.prepare(`SELECT txt, at FROM resumes WHERE u = ?`).bind(u).first();
  if (hit && !/ne (peux|peut) pas/i.test(hit.txt)) return json({ txt: hit.txt, at: hit.at, cache: true });
  const q = await quota(request, env, "resume"); if (!q.ok) return quotaError(q, "résumés détaillés");
  if (!(await budget(env.DB, env))) return json({ error: "Le site a atteint son nombre de résumés pour aujourd'hui. Ce document sera résumé demain." }, 429);
  try {
    const text = focus(await docText(env, u)).slice(0, 14000);
    if (text.length < 300) return json({ error: "Document trop court ou illisible." }, 422);
    const out = await env.AI.run(MODEL, { messages: [{ role: "system", content: SYS }, { role: "user", content: "Document :\n\n" + text }], max_tokens: 700, temperature: 0.2 });
    const txt = String(out.response || (out.result && out.result.response) || "").replace(/—/g, ",").trim();
    if (txt.length < 200 || /ne (peux|peut) pas|pas d'informations exploitables/i.test(txt)) throw new Error("le document ne contient pas de chiffres lisibles");
    await env.DB.prepare(`INSERT OR REPLACE INTO resumes (u, txt, at) VALUES (?, ?, ?)`).bind(u, txt, Date.now()).run();
    return json({ txt, at: Date.now() });
  } catch (e) { return json({ error: "Résumé impossible pour ce document : " + String(e.message || e).slice(0, 120) }, 502); }
}

// Bilan d'une liste : le navigateur envoie les faits (cours, variations, annonces, dates) ; l'IA rédige, sans rien ajouter.
const SYS_VEILLE = `Tu écris, en français, le bilan d'une liste d'entreprises suivies par un particulier qui débute en Bourse.
Tu reçois des faits en JSON (variations de cours, annonces récentes résumées, prochaines dates). Règles :
- N'utilise que ces faits. N'invente aucun chiffre, aucune explication de mouvement de cours qui ne figure pas dans les faits ; si la cause d'un mouvement n'est pas connue, dis-le.
- 150 à 250 mots, en quatre courts paragraphes titrés : « En résumé », « Ce qui a bougé », « Ce qui a été annoncé », « À venir ».
- Explique ce que veut dire un mouvement (par exemple : une baisse de 8 % en une semaine est importante pour une grande entreprise).
- Mets en garde, sans dramatiser, si une ligne concentre l'attention (forte baisse, résultats imminents).
- Aucun conseil d'achat ou de vente. Pas de tirets cadratins, pas de listes à puces.`;
const SYS_PF = `Tu commentes, en français, le portefeuille d'un particulier qui débute en Bourse. Tu reçois des faits en JSON (lignes, poids, plus-values, pays, premières expositions une fois les ETF ouverts, frais, remarques déjà calculées).
Règles :
- N'utilise que ces faits, n'invente aucun chiffre.
- 150 à 230 mots, en trois courts paragraphes titrés : « Ce qui ressort », « Points d'attention », « À suivre ».
- Explique simplement la diversification, la concentration, le poids d'un pays ou d'une devise, l'effet des frais, quand c'est pertinent.
- Aucun conseil d'achat ou de vente, aucune recommandation de ligne précise, aucune prédiction. Tu peux rappeler des repères généraux (par exemple : une action seule au-delà de 10 % du portefeuille augmente le risque).
- Pas de tirets cadratins, pas de listes à puces.`;
export async function veille(request, env) {
  if (!env || !env.DB || !env.AI) return json({ error: "Bilan indisponible pour le moment." }, 503);
  const path = new URL(request.url).pathname;
  await init(env.DB);
  if (path === "/api/veille" && request.method === "POST") {
    let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
    const faits = JSON.stringify(b.faits || {}).slice(0, 9000);
    const key = (b.type === "portefeuille" ? "pf:" : "veille:") + new Date().toISOString().slice(0, 10) + ":" + [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(faits)))].slice(0, 10).map(x => x.toString(16).padStart(2, "0")).join("");
    const hit = await env.DB.prepare(`SELECT txt FROM resumes WHERE u = ?`).bind(key).first();
    if (hit) return json({ txt: hit.txt, cache: true });
    const q = await quota(request, env, b.type === "portefeuille" ? "portefeuille" : "veille"); if (!q.ok) return quotaError(q, b.type === "portefeuille" ? "analyses de portefeuille" : "bilans rédigés");
    if (!(await budget(env.DB, env))) return json({ error: "Le site a atteint son nombre de bilans rédigés pour aujourd'hui : réessayez demain. Les chiffres restent à jour." }, 429);
    try {
      const out = await env.AI.run(MODEL, { messages: [{ role: "system", content: b.type === "portefeuille" ? SYS_PF : SYS_VEILLE }, { role: "user", content: faits }], max_tokens: 700, temperature: 0.2 });
      const txt = String(out.response || "").replace(/—/g, ",").trim();
      await env.DB.prepare(`INSERT OR REPLACE INTO resumes (u, txt, at) VALUES (?, ?, ?)`).bind(key, txt, Date.now()).run();
      return json({ txt });
    } catch (e) { return json({ error: "Bilan impossible pour le moment." }, 502); }
  }
  return mails(request, env, path);
}

/* ---------- Assistant de fiche : répond à une question à partir des seules données de la fiche ---------- */
const SYS_ASSIST = `Tu es l'assistant du site d'information boursière « bilan. », pour des personnes qui débutent. Tu réponds en français à une question sur une entreprise, en t'appuyant UNIQUEMENT sur les faits fournis en JSON (comptes annuels, comparaison au secteur, concurrents, cours, annonces récentes, agenda).
Règles :
- 60 à 160 mots, phrases courtes, termes techniques expliqués une fois.
- Si les faits ne permettent pas de répondre, dis-le simplement et indique quelle rubrique du site regarder.
- N'invente aucun chiffre ni aucune information. Cite les chiffres avec leur année.
- Aucun conseil d'achat ou de vente, aucune prédiction de cours, aucun objectif de prix. Si on te demande « faut-il acheter ? », explique les éléments à regarder (points forts, points de vigilance, prix par rapport aux bénéfices) sans trancher, et rappelle que ce n'est pas un conseil.
- Pas de listes à puces, pas de tirets cadratins.`;
export async function assistant(request, env) {
  if (!env || !env.DB || !env.AI) return json({ error: "L'assistant est indisponible pour le moment." }, 503);
  if (request.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  await init(env.DB);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
  const question = String(b.question || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (question.length < 5) return json({ error: "Posez une question un peu plus précise." }, 400);
  const faits = JSON.stringify(b.faits || {}).slice(0, 9000);
  const key = "assist:" + [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(question.toLowerCase() + "|" + faits)))].slice(0, 12).map(x => x.toString(16).padStart(2, "0")).join("");
  const hit = await env.DB.prepare(`SELECT txt FROM resumes WHERE u = ?`).bind(key).first();
  if (hit) return json({ txt: hit.txt, cache: true });
  const q = await quota(request, env, "assistant"); if (!q.ok) return quotaError(q, "questions à l'assistant");
  if (!(await budget(env.DB, env))) return json({ error: "L'assistant a atteint son nombre de réponses pour aujourd'hui. Réessayez demain." }, 429);
  try {
    const out = await env.AI.run(MODEL, { messages: [{ role: "system", content: SYS_ASSIST }, { role: "user", content: `Faits : ${faits}\n\nQuestion : ${question}` }], max_tokens: 450, temperature: 0.2 });
    const txt = String(out.response || "").replace(/—/g, ",").trim();
    if (txt.length < 20) throw new Error("vide");
    await env.DB.prepare(`INSERT OR REPLACE INTO resumes (u, txt, at) VALUES (?, ?, ?)`).bind(key, txt, Date.now()).run();
    return json({ txt, reste: q.max - q.used });
  } catch (e) { return json({ error: "L'assistant n'a pas pu répondre. Réessayez dans un instant." }, 502); }
}

/* ---------- Bilan hebdomadaire et alertes par e-mail ---------- */
const ALTERS = [`ALTER TABLE veille ADD COLUMN last_semaine INTEGER NOT NULL DEFAULT 0`, `ALTER TABLE veille ADD COLUMN last_alerte INTEGER NOT NULL DEFAULT 0`, `ALTER TABLE veille ADD COLUMN alertes INTEGER NOT NULL DEFAULT 1`];
let altered = false;
async function alter(db) { if (altered) return; for (const q of ALTERS) { try { await db.prepare(q).run(); } catch (e) { } } altered = true; }
const page = (msg) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bilan.</title><body style="background:#F8F5EE;font:16px/1.5 system-ui,sans-serif;color:#111"><div style="max-width:520px;margin:60px auto;padding:0 16px"><p style="font:900 28px Georgia,serif">bilan<span style="color:#0E6B4A">.</span></p><p>${msg}</p><p><a href="/favoris" style="color:#0E6B4A">Revenir au site</a></p></div>`, { headers: { "content-type": "text/html; charset=utf-8" } });
async function mails(request, env, path) {
  await alter(env.DB);
  const url = new URL(request.url);
  if (path === "/api/veille/inscription" && request.method === "POST") {
    if (!mailReady(env)) return json({ error: "L'envoi par e-mail n'est pas encore ouvert. Le bilan reste disponible ici, à tout moment." }, 503);
    let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
    const email = String(b.email || "").trim().toLowerCase(), p = await premiumOf(request, env);
    const ids = (Array.isArray(b.ids) ? b.ids : []).filter(x => /^[ce]:[a-z0-9-]{1,60}$/.test(x)).slice(0, p ? 40 : 10);
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(email) || !ids.length) return json({ error: "Adresse ou liste invalide." }, 400);
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM veille WHERE email = ? AND at > ?`).bind(email, Date.now() - 864e5).first();
    if (recent && recent.n >= 3) return json({ error: "Trop de demandes pour cette adresse aujourd'hui." }, 429);
    await env.DB.prepare(`DELETE FROM veille WHERE email = ? AND ok = 0`).bind(email).run();
    const token = crypto.randomUUID().replace(/-/g, "");
    await env.DB.prepare(`INSERT INTO veille (token, email, ids, ok, at, alertes) VALUES (?, ?, ?, 0, ?, ?)`).bind(token, email, JSON.stringify(ids), Date.now(), p ? 1 : 0).run();
    try { await sendMail(env, email, "Confirmez votre bilan hebdomadaire bilan.", `Bonjour,\n\nPour recevoir chaque samedi le bilan de votre liste (${ids.length} ligne${ids.length > 1 ? "s" : ""}), confirmez votre adresse en ouvrant ce lien :\n${url.origin}/api/veille/confirmer?t=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien ne sera envoyé.\n\nbilan. La Bourse, comptes à l'appui. Informations factuelles, sans conseil en investissement.`); }
    catch (e) { return json({ error: "L'e-mail de confirmation n'a pas pu partir aujourd'hui. Réessayez demain." }, 503); }
    return json({ ok: true });
  }
  if (path === "/api/veille/confirmer" || path === "/api/veille/desinscrire") {
    const t = (url.searchParams.get("t") || "").replace(/[^a-f0-9]/g, "");
    if (path.endsWith("confirmer")) { const r = await env.DB.prepare(`SELECT email FROM veille WHERE token = ?`).bind(t).first(); if (!r) return page("Lien expiré ou déjà utilisé.");
      await env.DB.prepare(`DELETE FROM veille WHERE email = ? AND ok = 1 AND token <> ?`).bind(r.email, t).run(); await env.DB.prepare(`UPDATE veille SET ok = 1 WHERE token = ?`).bind(t).run();
      return page("Adresse confirmée. Vous recevrez le bilan de votre liste chaque samedi matin. Chaque e-mail contient un lien pour vous désinscrire."); }
    await env.DB.prepare(`DELETE FROM veille WHERE token = ?`).bind(t).run();
    return page("C'est fait : vous ne recevrez plus d'e-mails de bilan. Votre adresse a été supprimée.");
  }
  // Envois groupés, déclenchés par le robot (GitHub) avec la clé d'administration
  if ((path === "/api/veille/envoi" || path === "/api/veille/alertes") && request.method === "POST") {
    if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) return json({ error: "Non autorisé." }, 403);
    if (!mailReady(env)) return json({ error: "Envoi non configuré." }, 503);
    const cap = Math.min(50, await mailCapacity(env)); if (!cap) return json({ envoyes: 0, reste: 0, info: "quota du jour atteint" });
    const data = await siteData(request, env), weekly = path.endsWith("envoi");
    const SEL = weekly ? `ok = 1 AND last_semaine < ?` : `ok = 1 AND alertes = 1 AND last_alerte < ?`, since = Date.now() - (weekly ? 5 * 864e5 : 12 * 36e5);
    const rows = (await env.DB.prepare(`SELECT * FROM veille WHERE ${SEL} LIMIT ?`).bind(since, weekly ? cap : 200).all()).results || [];
    let n = 0;
    for (const r of rows) {
      if (n >= cap) break;
      let ids = []; try { ids = JSON.parse(r.ids); } catch (e) { }
      const m = weekly ? digest(data, ids, url.origin, r.token) : alertes(data, ids, url.origin, r.token, r.last_alerte);
      if (!m) { if (!weekly) await env.DB.prepare(`UPDATE veille SET last_alerte = ? WHERE token = ?`).bind(Date.now(), r.token).run(); continue; }
      try { await sendMail(env, r.email, m.subject, m.text, m.html); n++; } catch (e) { break; }
      await env.DB.prepare(weekly ? `UPDATE veille SET last_semaine = ? WHERE token = ?` : `UPDATE veille SET last_alerte = ? WHERE token = ?`).bind(Date.now(), r.token).run();
    }
    const left = ((await env.DB.prepare(`SELECT COUNT(*) AS n FROM veille WHERE ${SEL}`).bind(since).first()) || {}).n || 0;
    return json({ envoyes: n, reste: left });
  }
  return json({ error: "Introuvable." }, 404);
}
async function siteData(request, env) {
  const get = async p => { try { return await (await env.ASSETS.fetch(new Request(new URL(p, request.url)))).json(); } catch (e) { return null; } };
  const [uni, etf, ana, ag, agAuto, sem] = await Promise.all([get("/data/univers.json"), get("/data/etf.json"), get("/data/actu-analyse.json"), get("/data/agenda.json"), get("/data/agenda-auto.json"), get("/data/semaine.json")]);
  let px = {}; try { px = (await (await cours(new Request(new URL("/api/cours", request.url)))).json()).items || {}; } catch (e) { }
  const names = {}; (uni && uni.companies || []).forEach(c => names["c:" + c.id] = c.name); (etf && etf.list || []).forEach(e => names["e:" + e.id] = e.name);
  return { names, px, sem: (sem && sem.items) || {}, ana: (ana && ana.items) || {}, ev: [...((ag && ag.events) || []), ...((agAuto && agAuto.events) || [])] };
}
const NF = (v, d = 2) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const sgnP = v => (v > 0 ? "+" : v < 0 ? "−" : "") + NF(Math.abs(v), 1) + " %";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function mailWrap(title, blocks, origin, token) {
  const text = `${title}\n\n${blocks.map(b => b.t).join("\n\n")}\n\nVoir sur le site : ${origin}/favoris\nSe désinscrire : ${origin}/api/veille/desinscrire?t=${token}\n\nbilan. La Bourse, comptes à l'appui. Informations factuelles, sans conseil en investissement. Les performances passées ne préjugent pas des performances futures.`;
  const html = `<div style="background:#F8F5EE;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#111214"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #E6E0D4;border-radius:14px;padding:24px">
    <p style="font:900 26px Georgia,serif;margin:0">bilan<span style="color:#0E6B4A">.</span></p><h1 style="font:800 20px Georgia,serif;margin:14px 0 6px">${esc(title)}</h1>
    ${blocks.map(b => b.h).join("")}
    <p style="margin:22px 0 0"><a href="${origin}/favoris" style="background:#111214;color:#fff;padding:10px 16px;border-radius:99px;text-decoration:none;font-weight:600">Voir ma liste sur le site</a></p>
    <p style="font-size:12px;color:#87827A;margin-top:22px">Informations factuelles, sans conseil en investissement. <a href="${origin}/api/veille/desinscrire?t=${token}" style="color:#87827A">Se désinscrire</a></p></div></div>`;
  return { text, html };
}
function digest(d, ids, origin, token) {
  const lines = ids.map(k => ({ k, name: d.names[k], p: d.px[k], w: d.sem[k] })).filter(x => x.name);
  if (!lines.length) return null;
  const mv = lines.filter(x => x.p && x.w).map(x => ({ ...x, ch: (x.p.p / x.w - 1) * 100 })).sort((a, b) => b.ch - a.ch);
  const since = Date.now() - 7 * 864e5, idset = new Set(ids.filter(k => k.startsWith("c:")).map(k => k.slice(2)));
  const news = Object.values(d.ana).filter(a => idset.has(a.id) && new Date(a.date) >= since && a.chiffres && a.chiffres.length).slice(0, 8);
  const today = new Date().toISOString().slice(0, 10), in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const ev = d.ev.filter(e => idset.has(e.id) && e.date >= today && e.date <= in14).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const blocks = [];
  if (mv.length) { const avg = mv.reduce((a, x) => a + x.ch, 0) / mv.length;
    blocks.push({ t: `CE QUI A BOUGÉ\nEn moyenne, vos actions ont évolué de ${sgnP(avg)} sur la semaine.\n${mv.map(x => `- ${x.name} : ${sgnP(x.ch)}`).join("\n")}${mv.some(x => Math.abs(x.ch) >= 8) ? "\nUne variation de plus de 8 % en une semaine est importante pour une grande entreprise : regardez son actualité." : ""}`,
      h: `<h2 style="font:700 16px Georgia,serif;margin:18px 0 6px">Ce qui a bougé</h2><p style="margin:0 0 8px">En moyenne, vos actions ont évolué de <b>${sgnP(avg)}</b> sur la semaine.</p><table style="width:100%;border-collapse:collapse">${mv.map(x => `<tr><td style="padding:5px 0;border-bottom:1px solid #EFEAE0">${esc(x.name)}</td><td style="padding:5px 0;border-bottom:1px solid #EFEAE0;text-align:right;font-family:monospace;color:${x.ch >= 0 ? "#0E6B4A" : "#B23A1E"}">${sgnP(x.ch)}</td></tr>`).join("")}</table>` }); }
  if (news.length) blocks.push({ t: `CE QUI A ÉTÉ ANNONCÉ\n${news.map(a => `- ${d.names["c:" + a.id]} (${a.date}) : ${a.type}. ${a.chiffres.map(c => c.join(" : ")).join(" ; ")}. ${(a.lecture || []).join(" ")}`).join("\n")}`,
    h: `<h2 style="font:700 16px Georgia,serif;margin:18px 0 6px">Ce qui a été annoncé</h2>${news.map(a => `<p style="margin:0 0 10px"><b>${esc(d.names["c:" + a.id])}</b> <span style="color:#87827A">· ${esc(a.date)} · ${esc(a.type)}</span><br>${a.chiffres.map(c => `${esc(c[0])} : <b>${esc(c[1])}</b>`).join(" · ")}<br><span style="color:#55524C">${esc((a.lecture || []).join(" "))}</span></p>`).join("")}` });
  if (ev.length) blocks.push({ t: `À VENIR\n${ev.map(e => `- ${e.date} : ${d.names["c:" + e.id]}, ${e.label}`).join("\n")}`, h: `<h2 style="font:700 16px Georgia,serif;margin:18px 0 6px">À venir</h2>${ev.map(e => `<p style="margin:0 0 6px"><b>${esc(e.date.split("-").reverse().join("/"))}</b> · ${esc(d.names["c:" + e.id])} : ${esc(e.label)}</p>`).join("")}` });
  if (!blocks.length) blocks.push({ t: "Semaine calme pour votre liste : pas d'annonce officielle ni de date importante.", h: `<p>Semaine calme pour votre liste : pas d'annonce officielle ni de date importante.</p>` });
  const w = mailWrap("Le bilan de votre liste", blocks, origin, token);
  return { subject: `Votre bilan de la semaine : ${mv.length ? `${sgnP(mv.reduce((a, x) => a + x.ch, 0) / mv.length)} en moyenne` : "ce qu'il faut savoir"}`, ...w };
}
function alertes(d, ids, origin, token, last) {
  const idset = new Set(ids.filter(k => k.startsWith("c:")).map(k => k.slice(2))), since = Math.max(last || 0, Date.now() - 2 * 864e5), out = [];
  Object.values(d.ana).filter(a => idset.has(a.id) && new Date(a.date + "T23:59:59Z") >= since && a.chiffres && a.chiffres.length).forEach(a => out.push(`${d.names["c:" + a.id]} : ${a.type}. ${a.chiffres.slice(0, 3).map(c => c.join(" : ")).join(" ; ")}.`));
  ids.forEach(k => { const p = d.px[k]; if (p && p.chg != null && Math.abs(p.chg) >= 5) out.push(`${d.names[k]} : ${sgnP(p.chg)} aujourd'hui. Un mouvement de cette taille suit souvent une annonce.`); });
  const tom = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  d.ev.filter(e => idset.has(e.id) && e.date === tom).forEach(e => out.push(`${d.names["c:" + e.id]} : demain, ${e.label}.`));
  if (!out.length) return null;
  const w = mailWrap("Alerte sur votre liste", [{ t: out.map(x => "- " + x).join("\n"), h: out.map(x => `<p style="margin:0 0 8px">${esc(x)}</p>`).join("") }], origin, token);
  return { subject: `Alerte bilan. : ${out[0].slice(0, 70)}`, ...w };
}
