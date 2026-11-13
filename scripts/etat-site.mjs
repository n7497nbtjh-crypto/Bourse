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

/* ---------- Logos (9/11 : 925 entreprises sans logo et un robot « au vert » qui ne traitait plus rien) ---------- */
try { const L = (J(new URL("cf/site/logos/index.json", ROOT)) || {}).l || {}, U = (J(D("univers-min.json")) || {}).companies || [], dg = (J(new URL("data/diagnostic.json", ROOT)) || {}).logos || {};
  const avec = U.filter(c => L[c.id] && L[c.id].f).length, sans = U.length - avec, revoir = U.filter(c => !(L[c.id] && L[c.id].f) && !(L[c.id] && L[c.id].v3)).length;
  etat.logos = { entreprises: U.length, avec, sans, a_revoir: revoir, robot_jour: dg.date || null, robot_traitees: dg.traitees ?? null, robot_ecrits: dg.ecrits ?? null };
  if (U.length && sans / U.length > 0.1) point("orange", `${sans} entreprises sur ${U.length} sont affichées sans logo (${Math.round(100 * sans / U.length)} %).`);
  if (revoir > 0 && dg.traitees === 0) point("rouge", `Le robot des logos n'a traité aucune entreprise à sa dernière nuit alors que ${revoir} attendent un essai.`);
} catch (e) { etat.logos = null; }

/* ---------- Robots GitHub (dernier passage de chaque workflow) ---------- */
try {
  const repo = process.env.GITHUB_REPOSITORY || "n7497nbtjh-crypto/Bourse", tok = process.env.GITHUB_TOKEN;
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100`, { headers: { accept: "application/vnd.github+json", ...(tok ? { authorization: "Bearer " + tok } : {}), "user-agent": "enklair-etat" } });
  const runs = (await r.json()).workflow_runs || [], vus = new Set();
  for (const x of runs) { const cle = x.workflow_id || x.path || x.name; if (vus.has(cle) || x.status !== "completed") continue; vus.add(cle); // 8/11 : par robot (un passage raté au fichier illisible portait le nom du fichier et restait « en échec »)
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
  const pages = ["/", "/entreprise/lvmh", "/entreprise/apple", "/etf/amundi-msci-world-pea", "/agenda", "/actualites", "/premium", "/espace", "/classements", "/comparer"];
  const erreurs = []; let t0 = Date.now();
  for (const p of pages) { try { const r = await fetch(SITE + p, { redirect: "manual" }); if (r.status >= 400) erreurs.push(p + " : " + r.status); } catch (e) { erreurs.push(p + " : injoignable"); } }
  etat.exterieur.pages = { testees: pages.length, erreurs, duree_ms: Date.now() - t0 };
  if (erreurs.length) point("rouge", `Pages en erreur : ${erreurs.join(", ")}.`);
  // Le rapport d'exemple est recalculé ici, une fois par jour (clé ADMIN_KEY) ; les visiteurs reçoivent toujours la version gardée
  try { t0 = Date.now(); const r = await fetch(SITE + "/data/rapport-exemple.json"); const b = await r.json(); etat.exterieur.rapport_exemple = { ok: r.ok && !!b.lignes, duree_ms: Date.now() - t0, ia: Object.keys(b.ia_entreprises || {}).length, monde: b.monde ? b.monde.sujets.length : 0 };
    if (!b.monde) point("orange", "Rapport d'exemple : pas de sujets du monde (IA indisponible ou titres manquants)."); } catch (e) { etat.exterieur.rapport_exemple = { ok: false }; point("rouge", "Le rapport d'exemple ne répond pas."); }
  try { const r = await fetch(SITE + "/api/cours"); const j = await r.json(), it = j.items || {}; const sans = Object.values(it).filter(x => !(x && x.p > 0)).length; etat.exterieur.cours = { total: Object.keys(it).length, sans_cours: sans, maj: j.maj || j.date || null }; } catch (e) { etat.exterieur.cours = null; }
  try { const r = await fetch(SITE + "/api/ia/etat"); const j = await r.json(); etat.services.ia = { disponible: !!j.disponible, site_epuise: !!j.site_epuise, neurones_jour: j.neurones_jour ?? null, plafond: j.plafond_neurones_jour ?? null }; } catch (e) { etat.services.ia = { disponible: false }; }
  // 9/11 : vrai essai de l'IA par le chemin des questions des visiteurs (avant, seul le compteur était lu : la page disait « disponible » pendant une panne de deux jours)
  try { const r = await fetch(SITE + "/api/ia/sante"), t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { }
    const test = j ? { ok: !!j.ok, ms: j.ms ?? null, modele: j.modele || null, raison: j.raison || null } : { ok: false, raison: `le serveur a planté (HTTP ${r.status}${/error code: (\d+)/.test(t) ? ", erreur Cloudflare " + t.match(/error code: (\d+)/)[1] : ""})` };
    etat.services.ia = { ...(etat.services.ia || {}), test, disponible: test.ok };
    if (!test.ok) point("rouge", `L'IA du site ne répond pas aux visiteurs : ${test.raison}.`); }
  catch (e) { etat.services.ia = { ...(etat.services.ia || {}), test: { ok: false, raison: "injoignable" }, disponible: false }; point("rouge", "L'IA du site est injoignable."); }
  try { const r = await fetch(SITE + "/api/premium/offres"); const j = await r.json(); const liens = [j.mensuel, j.unique].filter(Boolean); let ok = 0;
    for (const u of liens) { try { const h = await fetch(u, { method: "HEAD", redirect: "manual" }); if (h.status < 400) ok++; } catch (e) { } }
    const merci = await fetch(SITE + "/premium/merci", { redirect: "manual" });
    etat.services.paiement = { liens: liens.length, liens_ok: ok, merci_ok: merci.status < 400, mail: !!j.mail };
    if (ok < liens.length) point("rouge", "Un lien de paiement Stripe ne répond plus."); if (!j.mail) point("rouge", "Aucun e-mail ne peut partir (service d'envoi non configuré)."); } catch (e) { etat.services.paiement = null; }
}

/* ---------- Cours (7/11) : feuilles Google, cours passés, ETF ---------- */
// Découvertes du 7/11 : Google limite GOOGLEFINANCE (une feuille fermée n'est recalculée qu'en partie) ; les cours passés
// (« Et si j'avais investi ») ne viennent plus que de la feuille 1 ; les ETF sont valorisés par la valeur liquidative de l'émetteur.
try {
  const { COURS_CSVS, parseCours } = await import("../data/cours_config.mjs");
  const feuilles = [];
  // 7/11 nuit : pour chaque feuille, les valeurs qu'on lui confie (gfN.csv), et le relevé horaire du script Google (onglet « releve »)
  const confie = n => { try { return readFileSync(D(n === 1 ? "gf.csv" : `gf${n}.csv`), "utf8").trim().split("\n").slice(1).map(l => l.split(",")[0]).filter(Boolean); } catch (e) { return []; } };
  for (const [i, u] of COURS_CSVS.entries()) { try { const t = await (await fetch(u + "&t=" + Date.now())).text(), lignes = t.split("\n").length - 2, p = parseCours(t), v = Object.values(p);
    const f = { n: i + 1, lignes, cours: v.length, passes: v.filter(o => o.p1y != null).length, confiees: confie(i + 1).length, script: null };
    try { const h = await (await fetch(u.replace(/pub\?output=csv$/, "pubhtml"))).text(), g = (h.match(/name:\s*"releve"[^}]*?gid:\s*"(\d+)"/) || [])[1];
      if (!g) f.script = { installe: false };
      else { const tr = await (await fetch(u.replace(/pub\?output=csv$/, `pub?gid=${g}&single=true&output=csv&t=${Date.now()}`))).text(), m = (tr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/) || [])[0];
        f.script = { installe: true, quand: m || null, age_h: m ? Math.round((Date.now() - Date.parse(m)) / 36e5) : null, cours: Object.keys(parseCours(tr)).length }; } } catch (e) { }
    feuilles.push(f); } catch (e) { feuilles.push({ n: i + 1, erreur: String(e.message || e) }); } }
  const c = J(D("cours.json")) || {}, it = c.items || {}, E = Object.entries(it), act = E.filter(([k]) => k.startsWith("c:")), etf = E.filter(([k]) => k.startsWith("e:"));
  let hist = 0; try { hist = readdirSync(D("etf-hist/")).filter(f => f.endsWith(".json")).length; } catch (e) { }
  const ref = J(new URL("data/cours_ref.json", ROOT)) || {}, refAge = ref.date ? Math.round((Date.now() - Date.parse(ref.date)) / 864e5) : null;
  // 7/11 nuit (Romain : « que chaque entreprise ait son cours ») : chaque entreprise montrée sur le site a-t-elle un cours, et sa devise ?
  const soc = (J(D("societes.json")) || {}).companies || [], vis = soc.filter(x => !(x.missing || x.year == null || Date.now() >= Date.UTC(x.year + 2, 6, 1)));
  const ouF = {}; for (let n = 1; n <= COURS_CSVS.length; n++) for (const id of confie(n)) ouF[id] = n;
  const sans = vis.filter(x => !(it["c:" + x.id] && it["c:" + x.id].p > 0)).map(x => ({ id: x.id, nom: x.name, region: x.region, feuille: ouF["c:" + x.id] || null, symbole: x.tv || x.ticker || null }));
  const sansDev = vis.filter(x => it["c:" + x.id] && it["c:" + x.id].p > 0 && !it["c:" + x.id].cur).map(x => ({ id: x.id, nom: x.name, symbole: (it["c:" + x.id] || {}).s || null }));
  const sansVl = (J(new URL("data/etf_sans_vl.json", ROOT)) || []);
  const fr = n => { try { const j = J(D(n)); return j && (j.updated || j.maj || j.date) || null; } catch (e) { return null; } };
  etat.fraicheur = { cours: c.updated || null, cours_semaine: fr("cours-semaine.json"), change_bce: fr("fx-semaine.json"), etf: fr("etf.json"), actualite: fr("actu/semaine.json"), agenda: fr("agenda-habituel-proche.json"), societes: soc.length ? fr("societes.json") : null };
  for (const [k, d] of Object.entries(etat.fraicheur)) { if (!d) continue; const age = (Date.now() - Date.parse(String(d).length === 10 ? d + "T18:00:00Z" : d)) / 864e5; if (age > (k === "etf" ? 8 : 3)) point("orange", `Données « ${k.replace("_", " ")} » du ${String(d).slice(0, 10)} : plus mises à jour depuis ${Math.floor(age)} jours.`); }
  etat.couverture = { visibles: vis.length, avec_cours: vis.length - sans.length, sans: sans.slice(0, 120), sans_total: sans.length, sans_devise: sansDev.slice(0, 60), sans_devise_total: sansDev.length, etf_sans_vl: (sansVl.ids || []).length };
  if (sans.length) point(sans.length > vis.length * 0.02 ? "orange" : "gris", `${sans.length} entreprise${sans.length > 1 ? "s" : ""} montrée${sans.length > 1 ? "s" : ""} sur le site sans cours aujourd'hui (liste dans « Les cours »).`);
  if (sansDev.length) point("orange", `${sansDev.length} cours sans devise : le site ne peut pas les convertir en euros (liste dans « Les cours »).`);
  for (const f of feuilles) if (f.confiees && f.script && !f.script.installe) point("orange", `Feuille Google ${f.n} : aucun relevé du script trouvé (script pas encore installé, ou onglet « releve » non publié). Dans la feuille : Extensions › Apps Script › exécuter « installer ».`);
    else if (f.confiees && f.script && f.script.age_h > 26) point("orange", `Feuille Google ${f.n} : dernier relevé du script il y a ${f.script.age_h} h.`);
  etat.cours = { maj: c.updated, feuilles, actions: act.length, actions_sans_cours: act.filter(([, o]) => !(o && o.p > 0)).length, actions_1an: act.filter(([, o]) => o && o.p1y > 0).length,
    etf: etf.length, etf_vl: etf.filter(([, o]) => o && o.vl).length, etf_historique: hist, memoire: ref.date || null, controle: c.controle || null };
  // 10/11 (Romain : cours restés au 7 novembre trois jours sans alerte) : le fichier publié doit dater du dernier jour de Bourse.
  { const jourOuvre = d => { d = new Date(d); do d.setUTCDate(d.getUTCDate() - 1); while ([0, 6].includes(d.getUTCDay())); return d.toISOString().slice(0, 10); };
    const attendu = jourOuvre(Date.now()), maj = String(c.updated || "").slice(0, 10);
    if (!maj) point("rouge", "Cours : le fichier publié n'a pas de date.");
    else if (maj < attendu) point("rouge", `Cours non mis à jour depuis le ${maj} : le site affiche des cours anciens (dernier jour de Bourse attendu : ${attendu}). Voir le robot « Mise à jour des données ».`); }
  // 7/11 : contrôle du robot des cours (copie ancienne servie par Google, voir data/cours_fetch.mjs)
  for (const k of c.controle || []) if (!/à jour|relue|relevé/.test(k.etat)) point(/non écrite|non lue/.test(k.etat) ? "rouge" : "orange", `Cours du ${c.updated}, feuille ${k.feuille} : ${k.etat}${k.etat === "copie du site" ? " (Google a servi une copie ancienne de la feuille)" : ""}.`);
  for (const f of feuilles) { if (f.erreur) point("rouge", `Feuille Google ${f.n} illisible : ${f.erreur}`); else if (f.lignes > 50 && f.cours / f.lignes < 0.5 && f.n < 4) point("orange", `Feuille Google ${f.n} : ${f.cours} cours sur ${f.lignes} lignes (Google limite GOOGLEFINANCE ; ouvrir la feuille dans un navigateur la fait recalculer).`); }
  const f1 = feuilles[0]; if (f1 && !f1.erreur && f1.cours > 0 && f1.passes / f1.cours < 0.5) point("orange", `Cours passés (Et si j'avais investi) : seulement ${f1.passes} sur ${f1.cours} dans la feuille 1 ; le site garde les derniers connus 45 jours au plus, datés (mémoire du ${ref.date || "?"}).`);
  if (act.length && act.filter(([, o]) => o && o.p1y > 0).length / act.length < 0.6) point("orange", `Actions avec un cours d'il y a 1 an : ${act.filter(([, o]) => o && o.p1y > 0).length} sur ${act.length}.`);
} catch (e) { etat.cours = { erreur: String(e.message || e) }; }

/* ---------- Comptes, Premium, robot de l'espace (mesures d'administration, clé ADMIN_KEY) ---------- */
if (process.env.ADMIN_KEY) { try { const r = await fetch(SITE + "/api/espace/mesures", { headers: { "x-admin-key": process.env.ADMIN_KEY } }); const m = await r.json();
  if (!m.error) etat.services.comptes = { total: m.comptes && m.comptes.total, crees_7j: m.comptes && m.comptes.crees_7j, actifs_7j: m.comptes && m.comptes.actifs_7j, premium: m.premium && m.premium.abonnes, attente: m.premium && m.premium.attente, ia: m.ia || null, robot: m.robot || null }; } catch (e) { } }

/* ---------- Reste à faire : la ligne « En attente de Romain » de CLAUDE.md ---------- */
try { const md = readFileSync(new URL("CLAUDE.md", ROOT), "utf8"), m = md.match(/## En attente de Romain\n([^\n]+)/); etat.reste = m ? m[1].split(/\s*;\s*/).map(x => x.trim().replace(/\.$/, "")).filter(Boolean).slice(0, 12) : []; } catch (e) { }

etat.feu = etat.points.some(p => p.niveau === "rouge") ? "rouge" : etat.points.some(p => p.niveau === "orange") ? "orange" : "vert";
writeFileSync("/tmp/etat-site.json", JSON.stringify(etat));
console.log(JSON.stringify({ feu: etat.feu, points: etat.points, robots: etat.robots.length, annonces: etat.actu.total, resultats: etat.actu.resultats }, null, 1));
