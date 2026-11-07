// État du site, chaque matin (7/11, maquette docs/maquettes/etat-du-site.html validée par Romain) : robots, actualité de la veille,
// fiches mises à jour après résultats, cohérence (contrôle des phrases de toutes les fiches, relecture des pages), site vu de l'extérieur,
// paiement, comptes, e-mails, IA. Lancé par .github/workflows/etat.yml ; le résultat est envoyé au serveur (POST /api/espace/etat,
// clé ADMIN_KEY) qui le garde 30 jours pour la page privée /espace/etat du propriétaire. Aucune clé n'est écrite nulle part.
//   node scripts/etat-site.mjs  → écrit /tmp/etat-site.json et l'affiche ; variables : GITHUB_TOKEN (robots), ADMIN_KEY (comptes), SITE
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const SITE = process.env.SITE || "https://enklair.com", ROOT = new URL("../", import.meta.url), D = p => new URL("cf/site/data/" + p, ROOT);
const J = p => { try { return JSON.parse(readFileSync(p, "utf8")); } catch (e) { return null; } };
const jourParis = t => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(t));
const auj = jourParis(Date.now()), hier = jourParis(Date.now() - 864e5);
const etat = { jour: auj, genere: Date.now(), robots: [], actu: {}, coherence: {}, exterieur: {}, services: {}, reste: [], points: [] };
const point = (niveau, texte) => etat.points.push({ niveau, texte });

/* ---------- Robots GitHub (dernier passage de chaque workflow) ---------- */
try {
  const repo = process.env.GITHUB_REPOSITORY || "n7497nbtjh-crypto/Bourse", tok = process.env.GITHUB_TOKEN;
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100`, { headers: { accept: "application/vnd.github+json", ...(tok ? { authorization: "Bearer " + tok } : {}), "user-agent": "enklair-etat" } });
  const runs = (await r.json()).workflow_runs || [], vus = new Set();
  for (const x of runs) { if (vus.has(x.name) || x.status !== "completed") continue; vus.add(x.name);
    const age = (Date.now() - Date.parse(x.updated_at)) / 36e5, ok = x.conclusion === "success";
    etat.robots.push({ nom: x.name, ok, quand: x.updated_at, age_h: Math.round(age), lien: x.html_url });
    if (!ok) point("rouge", `Robot « ${x.name} » en échec (${x.conclusion}).`); }
} catch (e) { etat.robots_erreur = String(e.message || e); }
// Robot des dates de presse : vide depuis quand ?
// Agenda : dates officielles + annoncées (robot de l'actualité) ; alerte si le fichier des dates annoncées n'a pas été mis à jour depuis 2 jours
const agAuto = J(D("agenda-auto.json")); etat.agenda = { annoncees: agAuto ? (agAuto.events || []).length : null, maj: agAuto && agAuto.updated, habituelles: ((J(D("agenda-habituel.json")) || {}).events || []).length };
if (!agAuto || !agAuto.updated || (Date.now() - Date.parse(agAuto.updated)) / 864e5 > 2) point("orange", `Dates de résultats annoncées : fichier non mis à jour depuis le ${agAuto && agAuto.updated || "?"} (robot de l'actualité).`);

/* ---------- Actualité de la veille ---------- */
{
  const etatActu = J(D("actu/etat.json")) || {}, parSource = {}, res = { total: 0, chiffres: 0, sans: [] }, dir = D("actu/c/");
  let total = 0; const majFiches = new Set(), resIds = new Set();
  if (existsSync(dir)) for (const f of readdirSync(dir)) { if (!f.endsWith(".json")) continue; const j = J(new URL(f, dir)); if (!j) continue;
    for (const a of j.o || []) { const d = String(a.d || "").slice(0, 10); if (d < hier) continue; total++; parSource[a.s || "?"] = (parSource[a.s || "?"] || 0) + 1;
      if (a.c === "resultats") { res.total++; resIds.add(f.slice(0, -5)); if (Array.isArray(a.f) && a.f.length) res.chiffres++; else if (res.sans.length < 30) res.sans.push({ id: f.slice(0, -5), titre: (a.tf || a.t || "").slice(0, 120), u: a.u }); } } }
  // Fiches mises à jour après résultats : la fiche (societes/<id>.json) porte une date de mise à jour ≥ la veille
  let maj = 0; for (const id of resIds) { const s = J(D(`societes/${id}.json`)); if (s && String(s.updated || "").slice(0, 10) >= hier) maj++; }
  etat.actu = { depuis: hier, total, par_source: parSource, sources_etat: etatActu, resultats: { total: res.total, avec_chiffres: res.chiffres, sans_chiffres: res.total - res.chiffres, entreprises: resIds.size, fiches_maj: maj, exemples_sans: res.sans.slice(0, 8) } };
  for (const [src, t] of Object.entries(etatActu)) { const age = (Date.now() - Date.parse(t)) / 36e5; if (age > 30) point("orange", `Source d'actualité « ${src} » : pas de passage depuis ${Math.round(age)} h.`); }
  if (res.total - res.chiffres > 0) point("gris", `${res.total - res.chiffres} résultats publiés hier sans chiffres extraits (communiqué sans tableau).`);
}

/* ---------- Cohérence : contrôles du dépôt (rapides) ---------- */
const run = (cmd, ms = 600e3) => { try { return { ok: true, out: execSync(cmd, { cwd: ROOT, timeout: ms, stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\n").slice(-3).join(" | ") }; } catch (e) { return { ok: false, out: String((e.stdout || "") + (e.stderr || "")).trim().split("\n").slice(-3).join(" | ") }; } };
etat.coherence.fiches = run("node scripts/check-fiches-tout.js");
etat.coherence.coherence = run("node scripts/check-coherence.js");
etat.coherence.sauts = run("node tests/t_coherence.mjs");
etat.coherence.pages = process.env.ETAT_PAGES === "0" ? { ok: true, out: "non lancé" } : run("node scripts/relire-pages.js");
for (const [k, v] of Object.entries(etat.coherence)) if (!v.ok) point("rouge", `Contrôle « ${k} » en échec : ${v.out.slice(0, 160)}`);
const averif = J(D("a-verifier.json")); if (averif && averif.items) etat.coherence.a_verifier = Object.keys(averif.items).length;

/* ---------- Le site vu de l'extérieur ---------- */
{
  const pages = ["/", "/entreprise/lvmh", "/entreprise/apple", "/etf/amundi-msci-world-pea", "/agenda", "/actualites", "/outils", "/premium", "/espace", "/rapport-exemple", "/portefeuille", "/apprendre"];
  const erreurs = []; let t0 = Date.now();
  for (const p of pages) { try { const r = await fetch(SITE + p, { redirect: "manual" }); if (r.status >= 400) erreurs.push(p + " : " + r.status); } catch (e) { erreurs.push(p + " : injoignable"); } }
  etat.exterieur.pages = { testees: pages.length, erreurs, duree_ms: Date.now() - t0 };
  if (erreurs.length) point("rouge", `Pages en erreur : ${erreurs.join(", ")}.`);
  // Le rapport d'exemple est recalculé ici, une fois par jour (clé ADMIN_KEY) ; les visiteurs reçoivent toujours la version gardée
  try { t0 = Date.now(); const r = await fetch(SITE + "/api/rapport-exemple", { headers: process.env.ADMIN_KEY ? { "x-admin-key": process.env.ADMIN_KEY } : {} }); const b = await r.json(); etat.exterieur.rapport_exemple = { ok: r.ok && !!b.lignes, duree_ms: Date.now() - t0, ia: Object.keys(b.ia_entreprises || {}).length, monde: b.monde ? b.monde.sujets.length : 0 };
    if (!b.monde) point("orange", "Rapport d'exemple : pas de sujets du monde (IA indisponible ou titres manquants)."); } catch (e) { etat.exterieur.rapport_exemple = { ok: false }; point("rouge", "Le rapport d'exemple ne répond pas."); }
  try { const r = await fetch(SITE + "/api/cours"); const j = await r.json(), it = j.items || {}; const sans = Object.values(it).filter(x => !(x && x.p > 0)).length; etat.exterieur.cours = { total: Object.keys(it).length, sans_cours: sans, maj: j.maj || j.date || null }; } catch (e) { etat.exterieur.cours = null; }
  try { const r = await fetch(SITE + "/api/ia/etat"); const j = await r.json(); etat.services.ia = { disponible: !!j.disponible, site_epuise: !!j.site_epuise }; if (!j.disponible) point("orange", "L'IA du site ne répond pas."); } catch (e) { etat.services.ia = null; }
  try { const r = await fetch(SITE + "/api/premium/offres"); const j = await r.json(); const liens = [j.mensuel, j.unique].filter(Boolean); let ok = 0;
    for (const u of liens) { try { const h = await fetch(u, { method: "HEAD", redirect: "manual" }); if (h.status < 400) ok++; } catch (e) { } }
    const merci = await fetch(SITE + "/premium/merci", { redirect: "manual" });
    etat.services.paiement = { liens: liens.length, liens_ok: ok, merci_ok: merci.status < 400, mail: !!j.mail };
    if (ok < liens.length) point("rouge", "Un lien de paiement Stripe ne répond plus."); if (!j.mail) point("rouge", "Aucun e-mail ne peut partir (service d'envoi non configuré)."); } catch (e) { etat.services.paiement = null; }
}

/* ---------- Comptes, Premium, robot de l'espace (mesures d'administration, clé ADMIN_KEY) ---------- */
if (process.env.ADMIN_KEY) { try { const r = await fetch(SITE + "/api/espace/mesures", { headers: { "x-admin-key": process.env.ADMIN_KEY } }); const m = await r.json();
  if (!m.error) etat.services.comptes = { total: m.comptes && m.comptes.total, crees_7j: m.comptes && m.comptes.crees_7j, actifs_7j: m.comptes && m.comptes.actifs_7j, premium: m.premium && m.premium.abonnes, attente: m.premium && m.premium.attente, ia: m.ia || null, robot: m.robot || null }; } catch (e) { } }

/* ---------- Reste à faire : la ligne « En attente de Romain » de CLAUDE.md ---------- */
try { const md = readFileSync(new URL("CLAUDE.md", ROOT), "utf8"), m = md.match(/## En attente de Romain\n([^\n]+)/); etat.reste = m ? m[1].split(/\s*;\s*/).map(x => x.trim().replace(/\.$/, "")).filter(Boolean).slice(0, 12) : []; } catch (e) { }

etat.feu = etat.points.some(p => p.niveau === "rouge") ? "rouge" : etat.points.some(p => p.niveau === "orange") ? "orange" : "vert";
writeFileSync("/tmp/etat-site.json", JSON.stringify(etat));
console.log(JSON.stringify({ feu: etat.feu, points: etat.points, robots: etat.robots.length, annonces: etat.actu.total, resultats: etat.actu.resultats }, null, 1));
