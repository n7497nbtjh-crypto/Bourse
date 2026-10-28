// IA du site (Cloudflare Workers AI, offert dans le palier gratuit : aucun crédit Claude).
//  /api/resume?u=…    résumé en français d'un document officiel (communiqué AMF en PDF, dépôt SEC), gardé en base
//  /api/veille        bilan rédigé d'une liste d'entreprises suivies (données du site fournies par le navigateur)
//  /api/veille/inscription, /confirmer, /envoi : bilan hebdomadaire par e-mail (actif quand RESEND_KEY, MAIL_FROM et ADMIN_KEY sont définis)
const MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
const MAX_JOUR = 60; // nombre de nouveaux résumés par jour, pour rester dans le palier gratuit
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
async function budget(db) { // compteur quotidien : true si on peut encore appeler le modèle aujourd'hui
  const jour = new Date().toISOString().slice(0, 10);
  const r = await db.prepare(`SELECT n FROM ia_compte WHERE jour = ?`).bind(jour).first();
  if (r && r.n >= MAX_JOUR) return false;
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
  if (hit) return json({ txt: hit.txt, at: hit.at, cache: true });
  if (!(await budget(env.DB))) return json({ error: "Le quota de résumés du jour est atteint. Ce document sera résumé demain." }, 429);
  try {
    const text = (await docText(env, u)).slice(0, 14000);
    if (text.length < 300) return json({ error: "Document trop court ou illisible." }, 422);
    const out = await env.AI.run(MODEL, { messages: [{ role: "system", content: SYS }, { role: "user", content: "Document :\n\n" + text }], max_tokens: 700, temperature: 0.2 });
    const txt = String(out.response || (out.result && out.result.response) || "").replace(/—/g, ",").trim();
    if (txt.length < 80) throw new Error("réponse vide");
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
    if (!(await budget(env.DB))) return json({ error: "Le quota du jour est atteint : le bilan rédigé sera disponible demain. Les chiffres ci-dessous restent à jour." }, 429);
    try {
      const out = await env.AI.run(MODEL, { messages: [{ role: "system", content: b.type === "portefeuille" ? SYS_PF : SYS_VEILLE }, { role: "user", content: faits }], max_tokens: 700, temperature: 0.2 });
      const txt = String(out.response || "").replace(/—/g, ",").trim();
      await env.DB.prepare(`INSERT OR REPLACE INTO resumes (u, txt, at) VALUES (?, ?, ?)`).bind(key, txt, Date.now()).run();
      return json({ txt });
    } catch (e) { return json({ error: "Bilan impossible pour le moment." }, 502); }
  }
  // Envoi par e-mail : désactivé tant que le service d'envoi n'est pas configuré
  const mailOn = env.RESEND_KEY && env.MAIL_FROM && env.ADMIN_KEY;
  if (path === "/api/veille/inscription" && request.method === "POST") {
    if (!mailOn) return json({ error: "L'envoi par e-mail n'est pas encore ouvert. Le bilan reste disponible ici, à tout moment." }, 503);
    let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
    const email = String(b.email || "").trim().toLowerCase(), ids = (Array.isArray(b.ids) ? b.ids : []).filter(x => /^[ce]:[a-z0-9-]{1,60}$/.test(x)).slice(0, 30);
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(email) || !ids.length) return json({ error: "Adresse ou liste invalide." }, 400);
    const token = crypto.randomUUID().replace(/-/g, "");
    await env.DB.prepare(`INSERT INTO veille (token, email, ids, ok, at) VALUES (?, ?, ?, 0, ?)`).bind(token, email, JSON.stringify(ids), Date.now()).run();
    const base = new URL(request.url).origin;
    await sendMail(env, email, "Confirmez votre bilan hebdomadaire bilan.", `Bonjour,\n\nPour recevoir chaque semaine le bilan de votre liste (${ids.length} lignes), confirmez votre adresse :\n${base}/api/veille/confirmer?t=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nbilan. La Bourse, comptes à l'appui. Informations factuelles, sans conseil.`);
    return json({ ok: true });
  }
  if (path === "/api/veille/confirmer" || path === "/api/veille/desinscrire") {
    const t = new URL(request.url).searchParams.get("t") || "";
    if (path.endsWith("confirmer")) await env.DB.prepare(`UPDATE veille SET ok = 1 WHERE token = ?`).bind(t).run();
    else await env.DB.prepare(`DELETE FROM veille WHERE token = ?`).bind(t).run();
    return new Response(`<!doctype html><meta charset="utf-8"><title>bilan.</title><p style="font:16px sans-serif;max-width:520px;margin:60px auto">${path.endsWith("confirmer") ? "Adresse confirmée : vous recevrez le bilan de votre liste chaque semaine." : "Vous ne recevrez plus le bilan hebdomadaire. Votre adresse a été supprimée."} <a href="/favoris">Revenir au site</a></p>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return json({ error: "Introuvable." }, 404);
}
async function sendMail(env, to, subject, text) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + env.RESEND_KEY, "content-type": "application/json" }, body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }) });
  if (!r.ok) throw new Error("envoi " + r.status);
}
