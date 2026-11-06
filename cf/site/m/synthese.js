/* Module « synthese » d'ENKLAIR : chargé après le script principal de index.html.
   Les fonctions déclarées ici remplacent celles du même nom (déclarations function, jamais const/let pour un nom existant).

   « Votre semaine en 2 minutes » : la synthèse hebdomadaire de ce que la personne suit (favoris et portefeuille),
   en tête de Mon espace (remplace espaceBilan) et sur l'accueil d'un membre connecté (synAccueil, appelée par pageHome).
   Les chiffres viennent du serveur (/api/espace/bilan, calculés par cf/src/synthese.mjs) ; l'interprétation est calculée
   ici avec les connaissances du site (médianes du secteur, points forts et de vigilance des comptes, Académie). */

/* styles : voir site.css */

/* ---------- Petits outils ---------- */
const SYN_CAT = { opa: "Offre publique", resultats: "Résultats", ca: "Chiffre d'affaires", dividende: "Dividende", operation: "Opération", dirigeants: "Dirigeants", ag: "Assemblée", capital: "Capital", communique: "Communiqué", financement: "Financement", incident: "Incident", initie: "Dirigeants", agenda: "Calendrier", presse: "Presse" };
const SYN_MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const SYN_JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const SYN_LECONS = { // situation → leçon de l'Académie (module/leçon)
  resultats: ["comptes", "compte-resultat"], ca: ["comptes", "compte-resultat"], dividende: ["bourse", "dividendes"], ag: ["bourse", "action"],
  baisse: ["psychologie", "aversion-pertes"], hausse: ["psychologie", "recence-troupeau"], indice: ["bourse", "indices"], per: ["valorisation", "per"],
  ligne: ["portefeuille", "concentration"], top3: ["portefeuille", "concentration"], frais: ["frais-fiscalite", "frais-courants"], pea: ["placements", "pea"], mediane: ["comptes", "mediane"],
};
function synPct(v, d = 1) { if (v == null || !isFinite(v)) return "–"; const r = Math.round(v * 10 ** d) / 10 ** d; return (r > 0 ? "+" : r < 0 ? "−" : "") + nf(d).format(Math.abs(r)) + " %"; }
function synEur(v, sign = true) { return v == null || !isFinite(v) ? "–" : (sign ? (v > 0 ? "+" : v < 0 ? "−" : "") : "") + F0.format(Math.abs(Math.round(v))) + " €"; }
function synInsec(t) { return esc(t).replace(/ ([%€])/g, "&nbsp;$1").replace(/(\d) (Md€|M€|pts?)/g, "$1&nbsp;$2"); } // pas de retour à la ligne avant % ou €
function synCls(v) { const r = Math.round((v || 0) * 10) / 10; return r > 0 ? "up" : r < 0 ? "down" : "muted"; }
function synJour(iso) { const d = new Date(iso + "T12:00:00Z"); return `${SYN_JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; }
function synDuAu(b) {
  if (!b.du || !b.au) return "";
  const a = new Date(b.du + "T12:00:00Z"), z = new Date(b.au + "T12:00:00Z"), M = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const j = d => d.getUTCDate() === 1 ? "1er" : String(d.getUTCDate());
  return a.getUTCMonth() === z.getUTCMonth() ? `du ${j(a)} au ${j(z)} ${M[z.getUTCMonth()]}` : `du ${j(a)} ${M[a.getUTCMonth()]} au ${j(z)} ${M[z.getUTCMonth()]}`;
}
function synLien(k) { return (k.startsWith("e:") ? "/etf/" : "/entreprise/") + k.slice(2); }
function synObj(k) { return k.startsWith("c:") ? RBY[k.slice(2)] : ETFBY[k.slice(2)]; }
function synLogo(k, s = 32) { const o = synObj(k); if (!o) return ""; return k.startsWith("c:") ? logo(o, s) : logo({ name: o.issuer || o.name, domain: typeof issuerDom === "function" ? issuerDom(o) : null }, s); }
// Mini-graphique de la semaine : la ligne pointillée est le cours de départ.
function synSpark(serie, w = 88, h = 26, label = "") {
  const s = (serie || []).filter(v => v != null && isFinite(v)); if (s.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const mn = Math.min(...s), mx = Math.max(...s), r = mx - mn || 1, X = i => 2 + i * (w - 6) / (s.length - 1), Y = v => 3 + (h - 6) * (1 - (v - mn) / r);
  const col = s[s.length - 1] >= s[0] ? "var(--up)" : "var(--down)", pts = s.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label || "Évolution sur la semaine")}"><line x1="2" x2="${w - 2}" y1="${Y(s[0]).toFixed(1)}" y2="${Y(s[0]).toFixed(1)}" stroke="var(--light)" stroke-width="1" stroke-dasharray="2 3"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(s.length - 1).toFixed(1)}" cy="${Y(s[s.length - 1]).toFixed(1)}" r="2.6" fill="${col}"/></svg>`;
}
function synLecon(code) {
  const x = SYN_LECONS[code]; if (!x || typeof ACA === "undefined" || !ACA) return null;
  const m = ACA.modules.find(m => m.id === x[0]), l = m && m.lecons.find(l => l.id === x[1]);
  return l ? { href: `/academie/${m.id}/${l.id}`, titre: l.titre } : null;
}

/* ---------- Interprétation : ce que la semaine change, au regard des connaissances du site ---------- */
// Repère d'un indicateur des comptes par rapport à la médiane du secteur (zone verte ou rouge, écart de plus de 10 %).
function synRepere(c, k) {
  if (!c || typeof INDI === "undefined" || !INDI[k] || typeof medInd !== "function") return null;
  let v, med; try { v = INDI[k][1](c); med = medInd(c.sector, k); } catch (e) { return null; }
  if (v == null || med == null || !isFinite(v) || !isFinite(med)) return null;
  const [label, , fmt, lowGood] = INDI[k], ecart = med !== 0 ? (v - med) / Math.abs(med) : 0;
  const zone = lowGood == null || Math.abs(ecart) < 0.1 ? "" : (lowGood ? v < med : v > med) ? "vert" : "rouge";
  const qual = k === "per" ? (zone === "vert" ? " (moins cher que la plupart de ses concurrents au regard de ses bénéfices)" : zone === "rouge" ? " (plus cher que la plupart de ses concurrents au regard de ses bénéfices)" : " (dans la moyenne)")
    : zone === "vert" ? " (mieux que la plupart de ses concurrents)" : zone === "rouge" ? " (moins bien que la plupart de ses concurrents)" : " (dans la moyenne)";
  const txt = `${label} : ${fmt(v)}, contre ${fmt(med)} pour la médiane de son secteur${qual}.`;
  return { zone, txt };
}
function synFacteurs(c) { // facteurs publiés par le module « analyse » (atouts, risques), s'il est chargé
  if (typeof analyseFaitsIA !== "function" || !c) return [];
  try {
    const r = analyseFaitsIA(c, c) || {}, out = [];
    const pick = (arr, z) => (Array.isArray(arr) ? arr : []).slice(0, 2).forEach(x => { const t = typeof x === "string" ? x : x && (x.texte || x.titre || x.label); if (t) out.push({ zone: z, txt: String(t) }); });
    pick(r.atouts, "vert"); pick(r.risques, "rouge");
    return out.slice(0, 3);
  } catch (e) { return []; }
}
function synPoints(l, b) {
  const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, e = l.k.startsWith("e:") ? ETFBY[l.k.slice(2)] : null, pts = [], v = l.variation_semaine_pct;
  let lec = null;
  if (v != null) {
    const a = Math.abs(v), grand = c && (valo(c) || {}).capE > 10e9;
    pts.push({ zone: "", txt: a >= 8 ? `Un mouvement de ${synPct(v)} en une semaine est très important${grand ? " pour une entreprise de cette taille" : ""}.` : a >= 4 ? `Un mouvement de ${synPct(v)} en une semaine est notable${e ? " pour un ETF" : grand ? " pour une grande entreprise" : ""}.` : `Un mouvement de ${synPct(v)} sur la semaine reste dans l'ordinaire${e ? " pour un ETF" : " pour une action"}.` });
    if (l.indice && l.ecart_pts != null) pts.push({ zone: "", txt: `${l.ecart_pts >= 0 ? "C'est " + nf(1).format(Math.abs(l.ecart_pts)) + " point" + (Math.abs(l.ecart_pts) >= 2 ? "s" : "") + " de mieux" : "C'est " + nf(1).format(Math.abs(l.ecart_pts)) + " point" + (Math.abs(l.ecart_pts) >= 2 ? "s" : "") + " de moins"} que le ${l.indice.nom} (${synPct(l.indice.pct)}) : ${Math.abs(l.ecart_pts) >= 3 ? "le mouvement est propre à " + (e ? "cet ETF" : "l'entreprise") + " plus qu'au marché." : "le mouvement suit surtout celui du marché."}` });
    lec = a >= 5 ? (v < 0 ? "baisse" : "hausse") : l.indice ? "indice" : null;
  }
  const ann = (b.annonces || []).filter(a => a.k === l.k).sort((x, y) => y.poids - x.poids)[0];
  if (ann) { pts.push({ zone: "", txt: `Publié cette semaine : ${ann.titre || ann.type || SYN_CAT[ann.categorie] || "une annonce"}${(ann.chiffres || []).length ? " (" + ann.chiffres.slice(0, 2).map(x => x.join(" : ")).join(", ") + ")" : ""}. ${v != null && Math.abs(v) >= 4 ? "Un cours qui bouge la semaine d'une publication ne prouve pas que l'un explique l'autre." : ""}` }); lec = SYN_LECONS[ann.categorie] ? ann.categorie : lec; }
  if (c && !c.missing) {
    const ks = ann && /dividende/.test(ann.categorie) ? ["rendement", "distribution", "dette"] : v != null && Math.abs(v) >= 5 ? ["per", "marge", "dette"] : ["marge", "croissance", "dette"];
    ks.map(k => synRepere(c, k)).filter(Boolean).slice(0, 2).forEach(r => pts.push(r));
    synFacteurs(c).forEach(x => pts.push(x));
    const t = typeof quick === "function" ? quick(c) : null;
    if (t && (t.fort || t.vig)) pts.push({ zone: t.vig > t.fort ? "rouge" : t.fort > t.vig ? "vert" : "", txt: `Sur ses derniers comptes, le site relève ${tallyTxt(t)}. La semaine en Bourse ne change pas ces chiffres : ils changeront aux prochains résultats.` });
  }
  if (e && e.ter != null) pts.push({ zone: e.ter <= 0.2 ? "vert" : e.ter > 0.4 ? "rouge" : "", txt: `Frais courants : ${pct(e.ter / 100, 2, false)} par an${e.ter <= 0.2 ? ", parmi les plus bas" : e.ter > 0.4 ? ", plus que la plupart des ETF de même catégorie" : ""}.` });
  const lecon = synLecon(lec || "mediane");
  return { pts, lecon, c, e, ann };
}
// Les lignes qui méritent un commentaire : plus forts mouvements, publications, lignes lourdes du portefeuille.
/* ---------- Rendu ---------- */
function synAgendaHTML(b) {
  const pfk = new Set((b.lignes || []).filter(l => l.portefeuille).map(l => l.k));
  const E = (b.a_venir || []).slice().sort((x, y) => (pfk.has(y.k) - pfk.has(x.k)) || String(x.date).localeCompare(String(y.date)));
  if (!E.length) return `<p class="muted" style="margin:0">Aucune date de résultats, de dividende ou d'assemblée annoncée pour vos valeurs dans les deux prochaines semaines. <a class="lnk" href="/agenda">Voir l'agenda complet</a>.</p>`;
  return `${E.map((e, i) => { const d = new Date(e.date + "T12:00:00Z");
    return `<div class="synev"><span class="d"><small>${SYN_JOURS[d.getUTCDay()]}</small><b>${d.getUTCDate()}</b><small>${SYN_MOIS[d.getUTCMonth()]}</small></span><span class="w"><b><a href="${esc(e.lien || "/entreprise/" + e.id + "/agenda")}">${esc(e.nom || "")}</a>${pfk.has(e.k) ? ` <span class="syn4-pill">portefeuille</span>` : ""}</b><span>${esc(e.label || "")}</span></span><button type="button" data-synics="${i}" aria-label="Ajouter ${esc(e.nom || "")} à mon agenda">+ Agenda</button></div>`; }).join("")}
    <div class="synnav" style="border:0;padding-top:6px;margin-top:6px"><button type="button" data-synics="all">Tout ajouter à mon agenda (.ics)</button><a href="/agenda">Agenda complet</a></div>
    <p class="synfoot">Le fichier .ics s'ouvre dans Google Agenda, Apple Calendrier ou Outlook. Rien n'est envoyé.</p>`;
}
function synAlertesHTML(b) {
  const pf = b.portefeuille; if (!pf || !(pf.alertes || []).length && !(pf.levees || []).length) return "";
  const ord = { nouveau: 0, hausse: 1, baisse: 1, stable: 2, null: 3 }, A = pf.alertes.slice().sort((x, y) => (ord[x.evol] ?? 3) - (ord[y.evol] ?? 3));
  const ev = a => a.evol === "nouveau" ? `<span class="synevol">Nouveau</span>` : a.evol === "hausse" || a.evol === "baisse" ? `<span class="synevol">${a.evol === "hausse" ? "En hausse" : "En baisse"}${a.avant != null ? ` : ${nf(a.code === "frais" ? 2 : 0).format(a.avant)} → ${nf(a.code === "frais" ? 2 : 0).format(a.valeur)}${a.code === "frais" ? " %" : " %"}` : ""}</span>` : a.evol === "stable" ? `<span class="synevol st">Inchangé</span>` : "";
  return `<div class="syncard"><h3>Votre portefeuille</h3>${A.map(a => { const l = synLecon(a.code); return `<div class="synal ${esc(a.niveau || "")}"><div><b>${esc(a.texte)}</b>${ev(a)}<p>${esc(a.pourquoi || "")}${l ? ` <a class="lnk" href="${l.href}">${esc(l.titre)} →</a>` : ""}</p></div></div>`; }).join("")}
    ${(pf.levees || []).map(a => `<div class="synal fort"><div><b>${esc(a.texte || "Une alerte de la semaine dernière")}</b><span class="synevol ok">Levée</span><p>Ce point de la semaine dernière ne se vérifie plus.</p></div></div>`).join("")}
    <p class="synfoot">Repères de diversification généraux, calculés sur vos lignes. Ce ne sont pas des conseils personnalisés.</p></div>`;
}
function synTexte(b) {
  if (b.texte) return `<div class="iares">${resumeHTML(b.texte)}<p class="iafoot">Commentaire rédigé par une IA à partir des seuls chiffres de cette page. Ce n'est pas un conseil.</p></div>`;
  const t = typeof bilanLocal === "function" ? bilanLocal(b) : "";
  return `<div class="iares" id="syniab">${t ? `${resumeHTML(t)}<p class="iafoot">Résumé calculé à partir de vos chiffres.</p>` : ""}${synIaBouton(b)}</div>`;
}
/* Commentaire de la semaine : rédigé à la demande par l'IA connectée du visiteur (m/monia.js), à partir des faits de la synthèse. */
let SYN_IA_B = null;
function synIaBouton(b) {
  SYN_IA_B = b;
  return miaConnectee() ? `<button type="button" class="fapp" data-syn-ia>✦ Commenter ma semaine avec l'IA</button>` : miaInvite();
}
function synIaFaits(c) { // mêmes faits que l'ancien commentaire du serveur : tous calculés par le site
  const L = c.lignes || [];
  return { semaine: c.semaine, periode: c.partiel && c.depuis ? "depuis le " + c.depuis : "semaine complète", moyenne_semaine_pct: c.moyenne, nombre_de_lignes: L.length, hausses: c.hausses, baisses: c.baisses,
    essentiel_calcule: c.essentiel || [], indices: (c.indices || []).map(i => ({ indice: i.nom, variation_semaine_pct: i.pct })),
    portefeuille: c.portefeuille ? { valeur_eur: c.portefeuille.valeur_eur, variation_semaine_eur: c.portefeuille.var_eur, variation_semaine_pct: c.portefeuille.var_pct,
      alertes: (c.portefeuille.alertes || []).filter(a => a.niveau !== "fort").map(a => ({ alerte: a.texte, evolution: a.evol })) } : null,
    lignes: L.filter(l => l.variation_semaine_pct != null).slice(0, 25).map(l => ({ nom: l.nom, variation_semaine_pct: l.variation_semaine_pct, indice_de_reference: l.indice ? l.indice.nom : null, ecart_avec_indice_points: l.ecart_pts, dans_le_portefeuille: !!l.en_portefeuille })),
    annonces: (c.annonces || []).slice(0, 8).map(a => ({ entreprise: a.nom, date: a.date, type: a.type, chiffres: a.chiffres, en_clair: a.resume })),
    a_venir: (c.a_venir || []).slice(0, 6).map(e => ({ entreprise: e.nom, date: e.date, evenement: e.label })),
    secteurs_suivis: (c.secteurs || []).filter(x => x.n).map(x => ({ secteur: x.nom, variation_mediane_semaine_pct: x.mediane_pct, entreprises: x.n, hausses: x.hausses, baisses: x.baisses })) };
}
document.addEventListener("click", async e => {
  const bt = e.target.closest("[data-syn-ia]"); if (!bt || !SYN_IA_B) return;
  bt.disabled = true; bt.textContent = "L'IA rédige le commentaire…";
  const j = await iaRediger("bilan", synIaFaits(SYN_IA_B), { max: 650 });
  bt.outerHTML = j.txt ? `<div class="synia">${resumeHTML(j.txt)}${miaPied(j)}</div>` : miaRendu(j);
});
function synEssentiel(b) {
  if ((b.essentiel || []).length) return b.essentiel;
  const L = (b.lignes || []).filter(l => l.variation_semaine_pct != null).sort((x, y) => y.variation_semaine_pct - x.variation_semaine_pct), E = [];
  if (L.length) E.push(`Vos valeurs suivies ont évolué de ${synPct(b.moyenne)} en moyenne sur la semaine.`);
  if (L.length > 1) E.push(`La plus forte hausse : ${L[0].nom} (${synPct(L[0].variation_semaine_pct)}). La plus forte baisse : ${L[L.length - 1].nom} (${synPct(L[L.length - 1].variation_semaine_pct)}).`);
  if ((b.a_venir || []).length) E.push(`À venir : ${b.a_venir[0].nom}, ${b.a_venir[0].label || ""}, le ${dLabel(b.a_venir[0].date)}.`);
  return E;
}
function synIcs(b, which) {
  const E = (b.a_venir || []).filter(e => e.id || (e.k || "").startsWith("c:")).map(e => ({ id: e.id || e.k.slice(2), date: e.date, label: e.label || e.type || "", source: e.source || "" }));
  const list = which === "all" ? E : [E[+which]].filter(Boolean); if (!list.length) return;
  const a = document.createElement("a"); a.href = URL.createObjectURL(icsFile(list, "Mes rendez-vous (ENKLAIR)")); a.download = list.length > 1 ? "bilan-semaine.ics" : `bilan-${list[0].id}.ics`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); // lien hors de la page : le routeur ne l'intercepte pas
  toast(list.length > 1 ? `${list.length} dates ajoutées au fichier d'agenda.` : "Date ajoutée au fichier d'agenda.");
}
/* ---------- Contexte : les sujets d'actualité du site qui touchent les valeurs du rapport ---------- */
let SYN_CTX = undefined;
async function synContexte() { if (SYN_CTX !== undefined) return SYN_CTX; try { const r = await fetch("/data/contexte.json"); SYN_CTX = r.ok ? await r.json() : null; } catch (e) { SYN_CTX = null; } return SYN_CTX; }
const SYN_SENS = { "+": ["plutôt favorable", "up"], "-": ["plutôt défavorable", "dn"], "±": ["à double tranchant", "mx"] };
function synSujets(b) { // sujets du contexte dont au moins un impact vise une valeur du rapport
  const ctx = SYN_CTX; if (!ctx || !ctx.sujets || typeof ctxCible !== "function" || typeof ctxProfil !== "function") return [];
  const cos = (b.lignes || []).filter(l => l.k.startsWith("c:")).map(l => RBY[l.k.slice(2)]).filter(c => c && !c.missing);
  const out = [];
  for (const sj of ctx.sujets) { if (sj.fin && sj.fin < TODAY) continue;
    const touches = [];
    for (const im of sj.impacts || []) for (const c of cos) { let ok = false; try { ok = ctxCible(im.cible, ctxProfil(c, FULL[c.id] || null)); } catch (e) { } if (ok && !touches.some(t => t.c === c)) touches.push({ c, im }); }
    if (touches.length) out.push({ sj, touches });
  }
  return out.sort((x, y) => y.touches.length - x.touches.length).slice(0, 3);
}
function synFaitsIA(b, sujets) { // les faits transmis à l'IA du site : rien d'autre que ce que la page affiche
  const r1 = v => v == null ? null : Math.round(v * 10) / 10, r0 = v => v == null ? null : Math.round(v);
  const f = { semaine: b.semaine, du: b.du, au: b.au, portefeuille: b.portefeuille && b.portefeuille.var_pct != null ? { variation_pct: r1(b.portefeuille.var_pct), variation_eur: r0(b.portefeuille.var_eur) } : null, indices: (b.indices || []).map(i => ({ nom: i.nom, pct: r1(i.pct) })),
    valeurs: (b.lignes || []).map(l => ({ nom: l.nom, variation_semaine_pct: r1(l.variation_semaine_pct), indice: l.indice ? { nom: l.indice.nom, pct: r1(l.indice.pct) } : null, poids_portefeuille_pct: l.portefeuille ? r0(l.portefeuille.poids_pct) : null })),
    annonces: (b.annonces || []).filter(a => a.origine !== "presse").slice(0, 8).map(a => ({ valeur: a.nom || a.k, titre: a.titre, date: a.date, lecture: (a.lecture || []).join(" "), chiffres: a.chiffres })),
    contexte: sujets.map(({ sj, touches }) => ({ sujet: sj.titre, fait: (sj.faits || []).slice(-1)[0], concerne: touches.map(t => `${t.c.name} (${(SYN_SENS[t.im.sens] || SYN_SENS["±"])[0]}) : ${t.im.mecanisme}`) })),
    a_venir: (b.a_venir || []).slice(0, 6).map(e => ({ valeur: e.nom || e.k, quoi: e.label, date: e.date })),
    secteurs: (b.secteurs || []).map(x => ({ secteur: x.nom, mediane_semaine_pct: x.mediane_pct, n: x.n })),
    sources: ["Cours de Bourse relevés par le site (différés)", "Annonces officielles (AMF, SEC) lues par le site", "Sujets d'actualité vérifiés à la main par le site", "Agenda publié par les entreprises"] };
  return JSON.stringify(f);
}
async function synIA(b, el, auto) { // le commentaire de l'IA du site, une fois par semaine et par navigateur
  if (!el || typeof miaAppel !== "function") return;
  const sig = "bilan.ia." + (b.semaine || "") + "." + ((b.lignes || []).map(l => l.k).join(",")).length;
  let cache = null; try { cache = JSON.parse(sessionStorage.getItem(sig) || "null"); } catch (e) { }
  const rendre = txt => { el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><div class="syn4-iat">${esc(txt).replace(/\n{2,}/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>")}</div><p class="syn4-ias">Rédigée à partir des seuls faits de cette page. Information, pas conseil.</p>`; };
  if (cache && cache.txt) return rendre(cache.txt);
  const lancer = async () => {
    el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><p class="muted">Rédaction en cours…</p>`;
    const r = await miaAppel("bilan", synFaitsIA(b, synSujets(b)), 700);
    if (r && r.txt) { try { sessionStorage.setItem(sig, JSON.stringify({ txt: r.txt })); } catch (e) { } rendre(r.txt); }
    else el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><p class="muted">${esc((r && r.message) || "Indisponible pour le moment.")}</p>`;
  };
  if (auto) return lancer();
  el.innerHTML = `<p class="syn4-iak">La lecture de l'IA du site</p><p class="muted" style="margin:0 0 8px">Deux ou trois paragraphes qui relient ces faits entre eux, rédigés à la demande par l'IA du site (compte dans vos questions du jour).</p><button type="button" class="btn" id="syn4-iab">Lire le commentaire de l'IA</button>`;
  const btn = el.querySelector("#syn4-iab"); if (btn) btn.onclick = lancer;
}

let SYN_ANN = []; // annonces affichées, pour le bouton « Expliquer » (31/10, Romain : l'IA explique l'annonce, à la place de « Lire la publication »)
document.addEventListener("click", async e => {
  const btn = e.target.closest("[data-syn-exp]"); if (!btn) return;
  const a = SYN_ANN[+btn.dataset.synExp], box = (btn.closest("li, .s7-pt, .s8-it, .s9-li, .s9-une") && btn.closest("li, .s7-pt, .s8-it, .s9-li, .s9-une").querySelector(".syn4-cl")) || btn.closest("article").querySelector(".syn4-cl"); if (!a || !box) return;
  btn.disabled = true; btn.textContent = "Rédaction en cours…";
  const co = a.k && a.k.startsWith("c:") ? RBY[a.k.slice(2)] : null, f = co && co.ca != null ? { ventes_millions: co.ca, devise: co.currency } : null;
  let j; try { j = await iaRediger("annonce", { ...(typeof iaFicheContexte === "function" && (co && co.id) ? await iaFicheContexte(co && co.id) : {}), entreprise: a.nom || (co && co.name), secteur: co ? secName(co) : null, activite: co && co.fiche ? co.fiche.fait : co ? co.desc : null, type: SYN_CAT[a.categorie] || a.type, titre_officiel: a.titre, date: a.date, chiffres: a.chiffres || [], lecture_calculee: a.lecture || [], dernier_exercice: f, lien: a.source }, { max: 420 }); } catch (err) { j = { error: "L'IA est indisponible pour le moment." }; }
  btn.remove();
  const x = j.txt && typeof jsonFrom === "function" ? jsonFrom(j.txt) : null;
  box.innerHTML = x && x.clair ? `<div class="ax-cl"><b>En clair</b><p>${esc(x.clair)}</p>${x.change ? `<b>Ce que cela change pour l'entreprise</b><p>${esc(x.change)}</p>` : ""}<small>Rédigé par l'IA d'ENKLAIR (${esc(j.modele || "")}) à partir de l'annonce. La source fait foi.</small></div>`
    : j.txt ? `<div class="ax-cl"><b>En clair</b>${resumeHTML(j.txt)}<small>Rédigé par l'IA d'ENKLAIR à partir de l'annonce. La source fait foi.</small></div>` : `<p class="muted">${esc(j.error || "Explication indisponible pour le moment.")}</p>`;
});
function synSecteursHTML(b) { // 31/10 (Romain) : la répartition du portefeuille par secteur, en camembert, à côté des valeurs
  const L = (b.lignes || []).filter(l => l.portefeuille && l.portefeuille.poids_pct != null); if (L.length < 2) return "";
  const G = {}; L.forEach(l => { const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, k = l.type === "etf" ? "ETF" : c ? secName(c) : "Autre"; G[k] = (G[k] || 0) + l.portefeuille.poids_pct; });
  const parts = Object.entries(G).sort((x, y) => y[1] - x[1]), tot = parts.reduce((a, [, v]) => a + v, 0) || 1;
  const teintes = ["#1F1D1A", "#4A4640", "#79746C", "#A8A299", "#CBC5BA", "#E3DED5", "#F0ECE4"]; // une seule teinte, du foncé au clair, dans l'ordre des poids
  let acc = 0; const R = 46, C = 2 * Math.PI * R;
  const arcs = parts.map(([k, v], i) => { const f = v / tot, d = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${teintes[Math.min(i, teintes.length - 1)]}" stroke-width="20" stroke-dasharray="${(C * f - 2).toFixed(2)} ${(C - C * f + 2).toFixed(2)}" stroke-dashoffset="${(-C * acc).toFixed(2)}" transform="rotate(-90 60 60)"><title>${esc(k)} : ${nf(0).format(f * 100)} %</title></circle>`; acc += f; return d; }).join("");
  const plus = parts[0], lecture = parts.length === 1 ? "" : plus[1] / tot > 0.5 ? `Plus de la moitié du portefeuille est dans un seul secteur (${plus[0]}) : ce qui arrive à ce secteur pèse sur l'ensemble.` : parts.length >= 4 ? `Quatre secteurs ou plus : les hausses et les baisses d'un secteur se compensent en partie.` : `Le portefeuille repose sur ${parts.length} secteur${parts.length > 1 ? "s" : ""}.`;
  return `<div class="syn4-rep"><svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Répartition du portefeuille par secteur">${arcs}</svg>
    <div class="syn4-repl"><p class="syn4-iak">Répartition par secteur</p><ul>${parts.map(([k, v], i) => `<li><i style="background:${teintes[Math.min(i, teintes.length - 1)]}"></i><span>${esc(k)}</span><b>${nf(0).format(v / tot * 100)} %</b></li>`).join("")}</ul>${lecture ? `<p class="syn4-ias">${esc(lecture)} Repère général de diversification, pas un conseil.</p>` : ""}</div></div>`;
}
function synFavorisHTML(b) { // 31/10 : la performance de vos favoris (hors portefeuille) sur la semaine, et pourquoi chaque valeur a bougé
  const F = (b.lignes || []).filter(l => !l.portefeuille && l.variation_semaine_pct != null); if (!F.length) return "";
  const moy = F.reduce((a, l) => a + l.variation_semaine_pct, 0) / F.length, h = F.filter(l => l.variation_semaine_pct > 0).length, idx = (b.indices || [])[0];
  return `<div class="syn4-tuiles syn4-fav"><div class="syn4-t"><small>Vos favoris, en moyenne</small><b class="${synCls(moy)}">${synPct(moy)}</b><span>${h} sur ${F.length} en hausse cette semaine</span></div>${idx ? `<div class="syn4-t"><small>${esc(idx.nom)}, pour comparer</small><b class="${synCls(idx.pct)}">${synPct(idx.pct)}</b></div>` : ""}</div>`;
}
function synPourquoi(l, A, b) { // une raison factuelle du mouvement : annonce officielle, secteur entier, ou simple marché
  const v = l.variation_semaine_pct; if (v == null) return "";
  if (A.length) return `${v > 0 ? "Monte" : v < 0 ? "Baisse" : "Stable"} la semaine de sa publication « ${A[0].titre || SYN_CAT[A[0].categorie] || "annonce"} ».`;
  const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, sec = c && (b.secteurs || []).find(x => x.nom === secName(c) && x.mediane_pct != null);
  if (sec && Math.abs(sec.mediane_pct) >= 1 && Math.sign(sec.mediane_pct) === Math.sign(v)) return `Tout son secteur ${sec.mediane_pct > 0 ? "monte" : "baisse"} (médiane ${synPct(sec.mediane_pct)}) : mouvement d'ensemble, pas propre à l'entreprise.`;
  if (l.indice && l.ecart_pts != null && Math.abs(l.ecart_pts) < 1.5) return `Suit son marché (${l.indice.nom} ${synPct(l.indice.pct)}) : pas de publication officielle cette semaine.`;
  return `Pas de publication officielle cette semaine : le mouvement vient du marché, pas d'une nouvelle de l'entreprise.`;
}
function synIdeeHTML(b) { // 31/10 : une piste à découvrir, factuelle : une entreprise du jour dans un secteur absent de la liste
  if (typeof outDayPicks !== "function" || typeof outDecCard !== "function") return ""; if (typeof outCSS === "function") outCSS(); if (typeof recoCSS === "function") recoCSS();
  const secs = new Set((b.lignes || []).map(l => { const c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null; return c ? c.sector : null; }).filter(Boolean));
  let picks = []; try { picks = outDayPicks(TODAY, 6); } catch (e) { return ""; }
  const x = picks.find(p => p && p.c && !secs.has(p.c.sector)) || picks[0]; if (!x) return "";
  return `<section class="syn4-sec"><h2>Une entreprise à découvrir</h2><p class="syn4-ias" style="margin:0 0 10px">Tirée des découvertes du jour, dans un secteur ${secs.has(x.c.sector) ? "que vous suivez déjà" : "absent de votre liste"}. Une information, pas une recommandation.</p><div class="out-dg syn4-idee">${outDecCard(x, false)}</div></section>`;
}
/* 5e passage (C) : Premium se montre au moment du besoin. L'alerte du soir floutée (une vraie publication de vos valeurs, ses chiffres
   masqués) et les semaines d'historique au-delà de la limite gratuite, grisées. Rien d'inventé : sans publication chiffrée, pas d'aperçu. */
function synApercuAlerte(b, m) {
  if (m && m.premium) return "";
  const a = (b.annonces || []).filter(x => x.origine !== "presse" && (x.chiffres || []).length).sort((x, y) => String(y.date).localeCompare(String(x.date)))[0]; if (!a) return "";
  const nom = a.nom || (synObj(a.k) || {}).name || "", n = Math.min(3, a.chiffres.length);
  setTimeout(() => { try { navigator.sendBeacon && navigator.sendBeacon("/api/compteur?e=apercu-alerte"); } catch (e) { } }, 0);
  return `<a class="syn4-apa" href="/premium#prem-p1"><span class="syn4-apk">Alerte du soir · Premium</span><b>${esc(nom)} a publié le ${esc(synJour(a.date))} : ${n} chiffre${n > 1 ? "s" : ""}</b><span class="syn4-apf" aria-hidden="true">${a.chiffres.slice(0, 3).map(([l, v]) => `<span>${esc(l)} <b>${esc(String(v))}</b></span>`).join("")}</span><span class="syn4-apl">Recevoir ces alertes le soir même →</span></a>`;
}
function synSemaines(b, m) {
  const H = (b.historique || []).filter(h => h && (h.portefeuille_pct != null || h.moyenne != null)); if (!H.length) return "";
  const lim = m && m.premium ? 12 : 2, L = H.slice(0, 12);
  return `<div class="syn4-sem"><p class="syn4-semt">Vos semaines précédentes</p><div class="syn4-semr">${L.map((h, i) => { const v = h.portefeuille_pct ?? h.moyenne, gris = i >= lim; return `<span class="${gris ? "gris" : ""}" title="${gris ? "Avec Premium : 12 semaines d'historique" : `Semaine ${esc(String(h.semaine).slice(-2))} : ${synPct(v)}`}"><small>S${esc(String(h.semaine).slice(-2))}</small><b class="${gris ? "" : synCls(v)}">${gris ? "··" : synPct(v)}</b></span>`; }).join("")}</div>${H.length > lim && !(m && m.premium) ? `<p class="note"><a class="lnk" href="/premium">Premium</a> garde 12 semaines.</p>` : ""}</div>`;
}
function synPageHTML(b, m) {
  SYN_ANN = [];
  // 30/10 (Romain) : capter l'attention par le visuel, moins de texte ; l'actualité interprétée et son contexte ; le portefeuille simulé ; les valeurs en liste compacte
  const ess = synEssentiel(b), sem = String(b.semaine || "").replace(/^\d{4}-W/, ""), pf = b.portefeuille;
  const statut = b.en_cours === false || b.provisoire === false ? "Synthèse définitive" : "Semaine en cours, mise à jour à chaque visite";
  const jour = iso => { const d = new Date(iso + "T12:00:00Z"); return `${SYN_JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; };
  const anglais = t => /\b(the|and|of|billion|million|quarter|year|growth|guidance)\b/i.test(String(t || ""));
  const generique = t => /^(Une information publiée par l'entreprise|La publication des ventes de la période|Document déposé)/.test(String(t || ""));
  // 1. En un coup d'œil : trois ou quatre grands chiffres
  // 5e passage (B2) : quatre chiffres, pas plus : mon portefeuille, mes favoris, l'indice, mon secteur principal ; le reste derrière « Le détail »
  const tuiles = [], favs = (b.lignes || []).filter(l => l.favori && !l.en_portefeuille && l.variation_semaine_pct != null), favMoy = favs.length ? favs.reduce((a, l) => a + l.variation_semaine_pct, 0) / favs.length : null;
  if (pf && pf.var_pct != null) tuiles.push(`<div class="syn4-t syn4-tp"><small>Mon portefeuille</small><b class="${synCls(pf.var_pct)}">${synPct(pf.var_pct)}</b>${pf.var_eur != null ? `<span>${synEur(pf.var_eur)} cette semaine</span>` : ""}</div>`);
  if (favMoy != null) tuiles.push(`<div class="syn4-t"><small>Mes favoris</small><b class="${synCls(favMoy)}">${synPct(favMoy)}</b><span>${favs.length} valeur${favs.length > 1 ? "s" : ""}, en moyenne</span></div>`);
  const idx0 = (b.indices || [])[0]; if (idx0) tuiles.push(`<div class="syn4-t"><small>${esc(idx0.nom)}</small><b class="${synCls(idx0.pct)}">${synPct(idx0.pct)}</b><span>l'indice, pour comparer</span></div>`);
  const secPrincipal = (() => { const lourde = pf && pf.plus_lourde && synObj(pf.plus_lourde.k); const sk = lourde && lourde.sector; return (b.secteurs || []).find(x => x.id === sk) || (b.secteurs || [])[0]; })();
  if (secPrincipal && secPrincipal.mediane_pct != null) tuiles.push(`<div class="syn4-t"><small>${esc(secPrincipal.nom)}</small><b class="${synCls(secPrincipal.mediane_pct)}">${synPct(secPrincipal.mediane_pct)}</b><span>médiane du secteur</span></div>`);
  for (const i of (b.indices || []).slice(1)) { if (tuiles.length >= 4) break; if (tuiles.some(t => t.includes(`<small>${esc(i.nom)}</small>`))) continue; tuiles.push(`<div class="syn4-t"><small>${esc(i.nom)}</small><b class="${synCls(i.pct)}">${synPct(i.pct)}</b></div>`); } // complète à 4 avec les autres indices
  // « Ce que ça change pour vous » : le poids de la valeur dans le portefeuille, en mots ; jamais « achetez » ni « vendez »
  const poidsDe = k => { const l = (b.lignes || []).find(x => x.k === k); return l && l.portefeuille && l.portefeuille.poids_pct != null ? l.portefeuille.poids_pct : null; };
  const part = p => p >= 60 ? "près des deux tiers" : p >= 45 ? "environ la moitié" : p >= 30 ? "environ un tiers" : p >= 20 ? "environ un cinquième" : p >= 10 ? "environ un dixième" : `une petite part (${nf(0).format(p)} %)`;
  const pourVous = a => { const p = poidsDe(a.k), nom = a.nom || (synObj(a.k) || {}).name || ""; const quoi = a.categorie === "resultats" ? "ses résultats comptent" : /dividende/.test(a.categorie || "") ? "ce dividende compte" : /chiffre|vente/i.test(a.categorie + " " + (a.titre || "")) ? "ces ventes comptent" : "ce communiqué compte";
    if (p != null && pf) return `${quoi.replace(/^ses |^ce |^ces /, m => m[0].toUpperCase() + m.slice(1)).replace("comptent", "pèsent").replace("compte", "pèse")} ${part(p)} de votre semaine (${nf(0).format(p)} % de votre portefeuille).`;
    return `Dans vos favoris, pas dans votre portefeuille : aucun effet sur votre argent.`; };
  const ROUT0 = new Set(["rachat", "capital", "initie", "agenda", "autre"]), vus0 = new Set();
  const evs = (b.annonces || []).filter(a => a.origine !== "presse" && !ROUT0.has(a.categorie)).sort((x, y) => (poidsDe(y.k) || 0) - (poidsDe(x.k) || 0) || y.poids - x.poids).filter(a => !vus0.has(a.k) && vus0.add(a.k)).slice(0, 3); // une entreprise au plus une fois, la plus lourde dans le portefeuille d'abord
  const evHTML = evs.map(a => `<li class="syn4-ev"><a href="${a.lien || synLien(a.k)}">${synLogo(a.k, 26)}<span><b>${esc(a.nom || (synObj(a.k) || {}).name || "")}</b> <span class="syn4-pill">${esc(SYN_CAT[a.categorie] || a.type || "Annonce")}</span><small>${esc(jour(a.date))}</small></span></a><p>${esc(pourVous(a))}</p></li>`).join("");
  const next = (b.a_venir || [])[0], nextHTML = next ? `<p class="syn4-next"><b>${esc(jour(next.date))}</b> : ${esc(next.nom)}, ${esc((next.label || next.type || "").toLowerCase())}${poidsDe(next.k) != null ? ` (${nf(0).format(poidsDe(next.k))} % de votre portefeuille)` : ""}.</p>` : "";
  const cp = b.compare, cmpHTML = cp ? `<p class="syn4-cmp">Depuis lundi dernier : ${cp.publications ? `${cp.publications} publication${cp.publications > 1 ? "s" : ""}` : "aucune publication"}, ${cp.dividendes ? `${cp.dividendes} dividende${cp.dividendes > 1 ? "s" : ""} annoncé${cp.dividendes > 1 ? "s" : ""}` : "aucun dividende annoncé"}, ${cp.alertes_nouvelles ? `${cp.alertes_nouvelles} alerte${cp.alertes_nouvelles > 1 ? "s" : ""} nouvelle${cp.alertes_nouvelles > 1 ? "s" : ""}` : "aucune alerte nouvelle"}${cp.precedente && cp.precedente.portefeuille_pct != null && pf && pf.var_pct != null ? `. Semaine d'avant : ${synPct(cp.precedente.portefeuille_pct)} (portefeuille)` : cp.precedente && cp.precedente.moyenne != null ? `. Semaine d'avant : ${synPct(cp.precedente.moyenne)} (vos valeurs, en moyenne)` : ""}.</p>` : "";
  // 2. L'actualité qui touche vos valeurs : annonces lues + sujets du contexte
  const ROUT = new Set(["rachat", "capital", "initie", "agenda", "autre"]), seen = new Set();
  const annonces = (b.annonces || []).filter(a => a.origine !== "presse" && !ROUT.has(a.categorie) && !seen.has(a.k + a.titre) && seen.add(a.k + a.titre)).sort((x, y) => y.poids - x.poids).map(a => {
    const lec = (a.lecture || []).filter(t => t && t !== a.resume && !generique(t)).join(" "), ch = (a.chiffres || []).slice(0, 3);
    const corps = lec || (a.resume && !anglais(a.resume) && !generique(a.resume) ? a.resume : "");
    if (!corps && !ch.length && a.categorie !== "resultats") return "";
    return `<article class="syn4-ann"><div class="syn4-annh">${synLogo(a.k, 26)}<a href="${synLien(a.k)}"><b>${esc(a.nom || synObj(a.k) && synObj(a.k).name || "")}</b></a><span class="syn4-pill">${esc(SYN_CAT[a.categorie] || a.type || "Annonce")}</span><small>${esc(jour(a.date))}</small></div>
      <p class="syn4-annt">${esc(a.titre || "")}</p>
      ${ch.length ? `<div class="syn4-ch">${ch.map(([l, v]) => `<span><small>${esc(l)}</small><b>${esc(String(v))}</b></span>`).join("")}</div>` : ""}
      ${corps ? `<p class="syn4-lec">${esc(corps)}</p>` : `<p class="syn4-lec muted">Chiffres pas encore relevés par le site ; ses indicateurs restent ceux du dernier exercice clos.</p>`}
      <div class="syn4-acts">${miaConnectee() ? `<button type="button" class="syn4-exp" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer</button>` : ""}${a.source ? `<a class="lnk" href="${esc(a.source)}" target="_blank" rel="noopener">La publication</a>` : ""}</div><div class="syn4-cl"></div></article>`;
  }).filter(Boolean).slice(0, 4);
  const sujets = synSujets(b).map(({ sj, touches }) => `<article class="syn4-sj"><p class="syn4-theme">${esc(sj.theme)}</p><h4>${esc(sj.titre)}</h4><p class="syn4-fait">${esc((sj.faits || []).slice(-1)[0] || "")}</p>
      <ul class="syn4-touch">${(() => { const G = []; touches.forEach(t => { const g = G.find(x => x.im === t.im); if (g) g.cs.push(t.c); else G.push({ im: t.im, cs: [t.c] }); }); return G.slice(0, 4).map(g => { const [l, c] = SYN_SENS[g.im.sens] || SYN_SENS["±"]; return `<li>${g.cs.map(x => `<a href="/entreprise/${x.id}">${esc(x.name)}</a>`).join(", ")} <em class="syn4-s${c}">${l}</em><span>${esc(accPhraseCourte(g.im.mecanisme))}</span></li>`; }).join(""); })()}</ul></article>`);
  // 3. Votre portefeuille : variation, simulation et concentration
  let pfHTML = "";
  if (pf && pf.var_pct != null) {
    const mise = 1000, apres = mise * (1 + pf.var_pct / 100);
    const grosse = (b.lignes || []).filter(l => l.portefeuille && l.portefeuille.poids_pct != null).sort((x, y) => y.portefeuille.poids_pct - x.portefeuille.poids_pct)[0];
    const sim = [`<div class="syn4-sim"><small>1 000 € placés comme votre portefeuille au début de la semaine</small><b>${nf(0).format(Math.round(apres))} €</b><span>soit ${synEur(apres - mise)}</span></div>`];
    if (grosse) sim.push(`<div class="syn4-sim"><small>Si ${esc(grosse.nom)} (${nf(0).format(grosse.portefeuille.poids_pct)} % du portefeuille) baissait de 30 %</small><b class="dn">${synPct(-0.3 * grosse.portefeuille.poids_pct, 0)}</b><span>sur l'ensemble, toutes choses égales par ailleurs</span></div>`);
    const total = pf.valeur_eur || (pf.var_eur != null && pf.var_pct ? pf.var_eur / pf.var_pct * 100 : null);
    if (total) sim.push(`<div class="syn4-sim"><small>Si tout le marché baissait de 10 %</small><b class="dn">${synEur(-0.1 * total)}</b><span>environ, sur ${nf(0).format(Math.round(total))} € : un portefeuille d'actions suit le marché à court terme</span></div>`);
    pfHTML = `${synSecteursHTML(b)}<div class="syn4-sims">${sim.join("")}</div>${synAlertesHTML(b).replace('<h3>Votre portefeuille</h3>', "")}<p class="syn4-ias">Simulations arithmétiques sur vos lignes, pas des prévisions. Information, pas conseil.</p>`;
  }
  // 4. Vos valeurs : une ligne par valeur, le détail au clic
  const L = (b.lignes || []).slice().sort((x, y) => Math.abs(y.variation_semaine_pct ?? 0) - Math.abs(x.variation_semaine_pct ?? 0));
  const vmax = Math.max(1, ...L.map(l => Math.abs(l.variation_semaine_pct || 0))); // 31/10 (Romain) : une barre par valeur, la variation se lit d'un coup d'œil
  const lignes = L.map(l => {
    const v = l.variation_semaine_pct, c = l.k.startsWith("c:") ? RBY[l.k.slice(2)] : null, A = (b.annonces || []).filter(a => a.k === l.k && a.origine !== "presse" && !ROUT.has(a.categorie));
    const ev = A[0] ? SYN_CAT[A[0].categorie] || A[0].type || "Annonce" : "", nx = (b.a_venir || []).find(e => e.k === l.k);
    const { pts } = synPoints(l, b), rep = pts.find(p => p.zone && !/^Publié cette semaine|^Un mouvement|^C'est /.test(p.txt));
    return `<details class="syn4-l"><summary><span class="syn4-ln">${synLogo(l.k, 26)}<span><b>${esc(l.nom)}</b><small>${l.type === "etf" ? "ETF" : c ? esc(secName(c)) : ""}${l.portefeuille ? ` · ${nf(0).format(l.portefeuille.poids_pct)} %` : ""}</small></span></span>
        <span class="syn4-lv ${v == null ? "na" : synCls(v)}">${v == null ? "–" : synPct(v)}<i class="syn4-bar"><i style="width:${v == null ? 0 : (Math.abs(v) / vmax * 100).toFixed(0)}%"></i></i></span><span class="syn4-li">${l.indice && l.ecart_pts != null ? `${l.ecart_pts > 0 ? "+" : l.ecart_pts < 0 ? "−" : ""}${nf(1).format(Math.abs(l.ecart_pts))} pt vs ${esc(l.indice.nom)}` : ""}</span>
        <span class="syn4-le">${ev ? `<span class="syn4-pill">${esc(ev)}</span>` : ""}${nx ? `<small>${esc(jour(nx.date))} : ${esc(nx.label)}</small>` : ""}</span><span class="syn4-why">${esc(synPourquoi(l, A, b))}</span></summary>
      <div class="syn4-ld">${A.slice(0, 2).map(a => `<p><b>${esc(a.titre || a.type)}</b> <small>${esc(jour(a.date))}</small>${(a.lecture || []).filter(t => !generique(t)).length ? `<br>${esc((a.lecture || []).filter(t => !generique(t)).join(" "))}` : ""}${a.source ? ` <a class="lnk" href="${esc(a.source)}" target="_blank" rel="noopener">Lire</a>` : ""}</p>`).join("")}
        ${rep ? `<p class="${rep.zone}">${c ? "Sur ses comptes : " : ""}${esc(rep.txt).replace(/(^|[\s(:])-(\d)/g, "$1−$2")}</p>` : ""}
        <p><a class="lnk" href="${synLien(l.k)}">Ouvrir la fiche →</a></p></div></details>`;
  }).join("");
  const sect = (b.secteurs || []).filter(x => x.n).map(x => `<div class="syn4-t"><small>${esc(x.nom)}</small><b class="${synCls(x.mediane_pct)}">${synPct(x.mediane_pct)}</b><span>médiane de ${x.n} entreprises</span></div>`);
  return `<div class="syn4">
    <header class="syn4-head"><p class="syn4-mast"><b>ENKLAIR</b><span>hebdo</span><i>n° ${esc(sem)}</i></p><p class="syn4-date" title="${esc(statut)}${b.du ? ` · ${esc(synDuAu(b))}` : ""}">Semaine ${esc(sem)}${b.du && b.au ? ` · ${esc(SYN_MOIS[new Date(b.du + "T12:00:00Z").getUTCMonth()] === SYN_MOIS[new Date(b.au + "T12:00:00Z").getUTCMonth()] ? synDuAu(b) : `${new Date(b.du + "T12:00:00Z").getUTCDate()} ${SYN_MOIS[new Date(b.du + "T12:00:00Z").getUTCMonth()]} → ${new Date(b.au + "T12:00:00Z").getUTCDate() === 1 ? "1er" : new Date(b.au + "T12:00:00Z").getUTCDate()} ${SYN_MOIS[new Date(b.au + "T12:00:00Z").getUTCMonth()]}`)}` : ""}${b.genere ? ` · chiffres du ${esc(new Date(b.genere).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}` : ""}</p>
      ${tuiles.length ? `<div class="syn4-tuiles syn4-4">${tuiles.slice(0, 4).join("")}</div>` : ""}
      ${evHTML ? `<ol class="syn4-evs">${evHTML}</ol>` : ess.length ? `<ol class="synk syn4-ess">${ess.slice(0, 3).map(p => `<li>${synInsec(p)}</li>`).join("")}</ol>` : ""}
      ${nextHTML}${cmpHTML}</header>
    ${synApercuAlerte(b, m)}
    <details class="syn4-detail" id="syn-detail"><summary><b>Le détail</b><span>vos valeurs une par une, ce qu'elles ont publié, votre portefeuille, l'agenda</span></summary>
    ${ess.length && evHTML ? `<ol class="synk syn4-ess">${ess.map(p => `<li>${synInsec(p)}</li>`).join("")}</ol>` : ""}
    ${synSemaines(b, m)}
    <section class="syn4-sec"><h2>Vos valeurs cette semaine</h2>${synFavorisHTML(b)}<div class="syn4-ls">${lignes || `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille pour les suivre ici.</p>`}</div><p class="syn4-ias">Touchez une valeur pour le détail. Barre : l'ampleur du mouvement par rapport à la plus forte variation de votre liste.</p></section>
    <section class="syn4-sec"><h2>Ce qu'elles ont publié</h2>
      ${annonces.length ? `<div class="syn4-anns">${annonces.join("")}</div>` : `<p class="muted">Aucune publication officielle de vos valeurs cette semaine.</p>`}
      ${sujets.length ? `<details class="syn4-ctx"><summary><b>Le contexte qui les touche</b><span>${sujets.length} sujet${sujets.length > 1 ? "s" : ""} : ${esc(synSujets(b).map(x => x.sj.titre).slice(0, 3).join(" · "))}</span></summary><div class="syn4-sjs">${sujets.join("")}</div></details>` : ""}
</section>
    ${pfHTML ? `<section class="syn4-sec"><h2>Votre portefeuille</h2>${pfHTML}</section>` : ""}
    <section class="syn4-sec"><h2>À venir sur deux semaines</h2><p class="syn4-ias" style="margin:0 0 10px">Votre portefeuille d'abord, vos favoris ensuite.</p>${synAgendaHTML(b)}</section>
    ${synIdeeHTML(b)}
    ${sect.length ? `<section class="syn4-sec"><h2>Les secteurs que vous suivez</h2><div class="syn4-tuiles">${sect.join("")}</div></section>` : ""}
    <p class="synfoot">Variations entre la clôture précédant la semaine et le dernier cours connu (différé), dans la devise de cotation. Annonces : documents officiels (AMF, SEC) lus par le site. Information, pas conseil.</p>
    </details>
  </div>`;
}
const accPhraseCourte = t => { const m = String(t || "").match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(t || "")).trim(); };

async function synCharger(qs) {
  try { const r = await fetch("/api/espace/bilan" + qs, { credentials: "same-origin" }); return synNormalise(await r.json()); } catch (e) { return { error: "Synthèse indisponible pour le moment." }; }
}

function synNormalise(b) { // bilans enregistrés avant la synthèse (format précédent) : mêmes champs de base
  if (!b || b.error) return b || { error: "Synthèse indisponible pour le moment." };
  const kOf = x => x.k || (x.id ? "c:" + x.id : "");
  b.lignes = (b.lignes || []).filter(l => l && l.k).map(l => ({ type: l.k.startsWith("e:") ? "etf" : "action", favori: !l.en_portefeuille, ...l }));
  b.annonces = (b.annonces || []).map(a => ({ ...a, k: kOf(a) })).filter(a => a.k);
  b.a_venir = (b.a_venir || []).map(e => ({ ...e, k: kOf(e), id: e.id || (kOf(e).startsWith("c:") ? kOf(e).slice(2) : "") })).filter(e => e.k);
  return b;
}

/* ---------- Mon espace : la synthèse remplace l'ancien bilan ---------- */
async function espaceBilan(el, m) {
  el.innerHTML = `<div class="empty">Préparation de votre semaine…</div>`;
  const sem = new URLSearchParams(location.search).get("semaine") || "";
  const [b] = await Promise.all([synCharger(sem ? "?semaine=" + encodeURIComponent(sem) : ""), typeof PXP !== "undefined" ? PXP : null, typeof acaLoad === "function" ? acaLoad() : null, synContexte(), typeof loadFiches === "function" ? loadFiches() : null]);
  if (b.error) { el.innerHTML = `<section class="panel"><div class="pb">${esc(b.error)} <a class="lnk" href="/espace">Revenir à la semaine en cours</a></div></section>`; return; }
  if (b.vide || !(b.lignes || []).length) { el.innerHTML = `<section class="synhero"><p class="kick">Votre semaine en 2 minutes</p><h2>Votre synthèse se construit avec ce que vous suivez</h2><p style="margin:0 0 12px">Ajoutez des entreprises ou des ETF à vos favoris (bouton « ☆ Ajouter aux favoris » de chaque fiche) ou à votre portefeuille. Chaque semaine, vous retrouverez ici leurs variations, leurs annonces, les dates à venir et ce que cela change.</p><div class="synnav" style="border:0;padding:0;margin:0"><a class="pri" href="/entreprises">Parcourir les entreprises</a><a href="/etf">Les ETF</a><a href="/portefeuille">Mon portefeuille</a></div></section>`; return; }
  el.innerHTML = synPageHTML(b, m);
  synIA(b, document.getElementById("syn4-ia"), true);
  if (/^#syn(var|act|av|int)$/.test(location.hash)) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 60); }
  el.onclick = e => {
    const i = e.target.closest("[data-synics]"); if (i) { synIcs(b, i.dataset.synics); return; }
    const j = e.target.closest("[data-synjump]"); if (j) { const t = document.getElementById(j.dataset.synjump); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } }
  };
}

/* ---------- Accueil d'un membre connecté (appelée par pageHome) ---------- */
async function synAccueil(el, m) {
  el.innerHTML = `<section class="panel"><div class="pb"><p class="muted" style="margin:0">Préparation de votre semaine…</p></div></section>`;
  const b = await synCharger("?apercu=1");
  if (!el.isConnected) return;
  if (b.error || b.vide || !(b.lignes || []).length) {
    el.innerHTML = `<section class="panel"><div class="pb espteaser"><div><b>Votre semaine en 2 minutes vous attend dans votre espace.</b><div class="muted">Ajoutez des entreprises ou des ETF à vos favoris : chaque semaine, leurs variations, leurs annonces et les dates à venir, résumées pour vous.${m.nonlus ? ` ${m.nonlus} alerte${m.nonlus > 1 ? "s" : ""} non lue${m.nonlus > 1 ? "s" : ""}.` : ""}</div></div><a class="btn" href="/espace">Ouvrir mon espace</a></div></section>`; return;
  }
  const L = (b.lignes || []).filter(l => l.variation_semaine_pct != null), pf = b.portefeuille, best = L[0], worst = L.length > 1 ? L[L.length - 1] : null, ess = synEssentiel(b);
  const kp = [pf && pf.var_pct != null ? `<a class="synkpi" href="/portefeuille"><small>Mon portefeuille</small><b class="${synCls(pf.var_eur)}">${synEur(pf.var_eur)}</b><span>${synPct(pf.var_pct)} sur la semaine</span></a>` : L.length ? `<div class="synkpi"><small>Moyenne de vos valeurs</small><b class="${synCls(b.moyenne)}">${synPct(b.moyenne)}</b><span>${b.hausses || 0} en hausse · ${b.baisses || 0} en baisse</span></div>` : "",
    best ? `<a class="synkpi" href="${synLien(best.k)}"><small>Plus forte hausse</small><b class="${synCls(best.variation_semaine_pct)}">${synPct(best.variation_semaine_pct)}</b><span>${esc(best.nom)}</span></a>` : "",
    worst ? `<a class="synkpi" href="${synLien(worst.k)}"><small>Plus forte baisse</small><b class="${synCls(worst.variation_semaine_pct)}">${synPct(worst.variation_semaine_pct)}</b><span>${esc(worst.nom)}</span></a>` : ""].filter(Boolean);
  el.innerHTML = `<section class="panel"><div class="pb synhome"><div><p class="kick">Votre semaine en 2 minutes · semaine ${esc(String(b.semaine || "").replace(/^\d{4}-W/, ""))}</p>
      ${ess.length ? `<ol class="synk" style="margin-top:8px">${ess.map(p => `<li>${synInsec(p)}</li>`).join("")}</ol>` : ""}
      <div class="synnav" style="border:0;padding-top:4px"><a class="pri" href="/espace">Lire ma semaine (${b.lecture_min || 2} min)</a>${(b.annonces || []).length ? `<a href="/espace#synact">${b.annonces.length} actualité${b.annonces.length > 1 ? "s" : ""}</a>` : ""}${(b.a_venir || []).length ? `<a href="/espace#synav">${b.a_venir.length} date${b.a_venir.length > 1 ? "s" : ""} à venir</a>` : ""}${m.nonlus ? `<a href="/espace/alertes">${m.nonlus} alerte${m.nonlus > 1 ? "s" : ""}</a>` : ""}</div></div>
      ${kp.length ? `<div class="kp">${kp.join("")}</div>` : ""}</div></section>`;
}


/* ---------- Mon espace : même page, onglet renommé « Ma semaine » ---------- */
async function pageEspace(onglet) {
  setTitle("Mon espace"); setNav("esp");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  const m = await moi(true);
  if (!m.connecte) return espaceConnexion();
  onglet = onglet || "bilan";
  const tabs = [["bilan", "Rapport de la semaine"], ["alertes", `Alertes${m.nonlus ? ` <span class="espn2">${m.nonlus}</span>` : ""}`], ["favoris", "Mes favoris"], ["portefeuille", "Mon portefeuille"], ["reglages", "Réglages"]];
  // 5e passage (B2) : en-tête compact (l'adresse est dans Réglages ; Premium en lien discret) pour que le rapport tienne dans le premier écran
  app.innerHTML = `<div class="esphead esphead2"><div><p class="kick">Mon espace${m.premium ? " · Premium" : ` · <a class="lnk" href="/premium">passer à Premium</a>`}</p><h1 class="pagetitle" style="margin:2px 0 0">${onglet === "alertes" ? "Ce que vos valeurs ont annoncé" : onglet === "reglages" ? "Votre compte et vos réglages" : "Votre semaine"}</h1>${onglet === "reglages" ? `<p class="muted" style="margin:2px 0 0">${esc(m.email)}</p>` : ""}</div>${m.premium ? `<div class="esp-abo">${m.plan === "mensuel" ? `<button type="button" class="btn" id="espportail">Gérer ou résilier mon abonnement</button>` : m.premium_jusqu_au ? `<span class="muted">Premium jusqu'au ${new Date(m.premium_jusqu_au).toLocaleDateString("fr-FR")}</span>` : ""}<span class="muted" id="espportm"></span></div>` : ""}</div>
    <nav class="esptabs scroll-x">${tabs.map(([k, l]) => `<a href="${k === "favoris" ? "/favoris" : k === "portefeuille" ? "/portefeuille" : "/espace/" + k}" class="${k === onglet ? "on" : ""}">${l}</a>`).join("")}</nav><div id="espb"></div>`;
  const PB = $("#espportail"); if (PB) PB.onclick = async () => { PB.disabled = true; const pm = $("#espportm"); // 5/11 : résiliation depuis Mon espace (portail client Stripe)
    try { const j = await (await (typeof iaFetch === "function" ? iaFetch : fetch)("/api/premium/portail")).json(); if (j.url) { location.href = j.url; return; } pm.textContent = j.error || "Le portail n'a pas pu s'ouvrir."; } catch (e) { pm.textContent = "Le site est injoignable : réessayez."; } PB.disabled = false; };
  const el = $("#espb");
  if (!m.premium && (onglet === "bilan" || onglet === "alertes") && typeof espacePremiumSeul === "function") return espacePremiumSeul(el, onglet); // 4/11 : réservés à Premium
  if (onglet === "bilan") return espaceBilan(el, m);
  if (onglet === "alertes") return espaceAlertes(el, m);
  return espaceReglages(el, m);
}

/* ---------- Le rapport exemple, public (30/10/2026) ----------
   Le vrai rapport de la semaine, calculé ce jour avec les chiffres du site, pour un profil fictif. En tête : ce qui est suivi
   dans cet exemple et ce que chacun peut régler dans le sien. Rien n'est enregistré. */
const SYN_EX_REG = [
  ["Ce qu'il suit", "Vos favoris, votre portefeuille, ou les deux. Ici : quatre favoris et un petit portefeuille."],
  ["Les secteurs", "Jusqu'à six secteurs suivis, avec leur médiane de la semaine. Ici : énergie et technologie."],
  ["Les indices", "Les indices de référence affichés en face de vos lignes. Ici : CAC 40, Euro Stoxx 50 et S&P 500."],
  ["Les sujets", "Résultats, dividendes, actualité, leçons : vous gardez ceux qui vous intéressent."],
  ["Le jour d'envoi", "Samedi, dimanche ou lundi matin, par e-mail ou dans votre espace. Le rapport se met à jour pendant la semaine."],
];
async function pageRapportExemple() {
  setTitle("Un rapport de la semaine, en exemple"); if (typeof setNav === "function") setNav("espace");
  app.innerHTML = `<div class="crumbs"><a href="/espace">Mon espace</a> › Rapport exemple</div><div class="empty">Calcul du rapport de cette semaine…</div>`;
  let b = null; try { const r = await fetch("/api/rapport-exemple"); b = r.ok ? await r.json() : null; } catch (e) { }
  if (!b) { app.innerHTML = `<section class="panel"><div class="pb">Le rapport exemple n'a pas pu être calculé pour le moment. <a class="lnk" href="/espace">Créer mon rapport</a></div></section>`; return; }
  await Promise.all([typeof PXP !== "undefined" ? PXP : null, typeof acaLoad === "function" ? acaLoad() : null, synContexte(), typeof loadFiches === "function" ? loadFiches() : null]);
  b = synNormalise(b);
  // 4/11 (Romain) : rapport exemple plus clair ; le rapport fait partie de Premium (plus de « Gratuit » ici)
  const prem = typeof isPrem === "function" && isPrem();
  app.innerHTML = `<div class="ek ek-page rx4"><section class="ek-hero rx4-hero"><div class="mc-crumb"><a href="/espace">Mon espace</a> › Rapport exemple</div><span class="mc-stk">Premium · exemple</span>
      <h1 class="ag4-t">Votre semaine en 2 minutes.</h1>
      <p class="mc-sub">Un vrai rapport, calculé aujourd'hui avec les chiffres du site pour un profil d'exemple : quatre favoris et un petit portefeuille. Le vôtre suit vos valeurs, et arrive chaque samedi.</p>
      <div class="rx4-plan">${[["1", "Toute l'actualité de vos entreprises", "résultats, accords, rachats, presse"], ["2", "Ce qui a fait bouger le portefeuille", "ce que chaque ligne a apporté, en euros"], ["3", "Le contexte", "ce qui touche leurs secteurs"], ["4", "À venir", "les dates des deux prochaines semaines"]].map(([n, t, d]) => `<div><i>${n}</i><b>${t}</b><span>${d}</span></div>`).join("")}</div>
      ${prem ? "" : `<a class="ek-btn dk rx4-cta" href="/premium">Recevoir le mien chaque semaine avec Premium</a>`}</section>
    <div id="synex">${synPageHTML(b, { premium: false })}</div>
    <section class="ek-sec"><span class="ek-stk2 b">Le vôtre</span><h2>Ce que vous réglez dans votre rapport.</h2><div class="rx4-reg">${SYN_EX_REG.map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>
      ${prem ? `<a class="ek-btn dk" href="/espace/rapport">Régler mon rapport</a>` : `<a class="ek-btn dk" href="/premium">Recevoir mon rapport avec Premium</a>`}</section></div>`;
  synIA(b, document.getElementById("syn4-ia"), false);
  const ex = document.getElementById("synex"); if (ex) ex.onclick = e => { const i = e.target.closest("[data-synics]"); if (i) { synIcs(b, i.dataset.synics); return; } const j = e.target.closest("[data-synjump]"); if (j) { const t = document.getElementById(j.dataset.synjump); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } } };
}
ROUTES_EXTRA.push([/^\/rapport-exemple\/?$/, () => pageRapportExemple()]);
/* styles : voir site.css */

/* 30/10 (Romain) : plus de mini-courbes dans le rapport ; la variation de la semaine en grand, en première colonne après le nom */
/* styles : voir site.css */
/* styles : voir site.css */

/* styles : voir site.css */

/* styles : voir site.css */

/* ====== 1/11 (Romain : « le rapport d'exemple est nullissime ») : rapport refait, dans un ordre fixe et concret ======
   1. La semaine en trois chiffres (portefeuille, favoris, indice) et l'écart avec l'indice, en une ligne calculée.
   2. Pourquoi chaque valeur a bougé : la variation, l'annonce de la semaine qui va avec (et son chiffre), sinon le marché ; l'effet en euros.
   3. L'actualité de vos entreprises : chaque annonce officielle, ses chiffres, « Expliquer » (IA du site) et la source.
   4. La lecture de l'IA du site (à la demande).  5. Vos favoris.  6. L'agenda des deux semaines.  7. Les points de vigilance du portefeuille.
   Aucune phrase générique : chaque ligne vient des données de la semaine. */
function synPageV5(b, m) {
  SYN_ANN = [];
  const sem = String(b.semaine || "").replace(/^\d{4}-W/, ""), pf = b.portefeuille, L = b.lignes || [];
  const jour = iso => { const d = new Date(iso + "T12:00:00Z"); return `${SYN_JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; };
  const ROUT = new Set(["rachat", "capital", "initie", "agenda", "autre"]);
  const annDe = k => (b.annonces || []).filter(a => a.k === k && a.origine !== "presse" && !ROUT.has(a.categorie));
  const idx0 = (b.indices || [])[0];
  // 1. trois chiffres
  const favs = L.filter(l => l.favori && l.variation_semaine_pct != null), favMoy = favs.length ? favs.reduce((a, l) => a + l.variation_semaine_pct, 0) / favs.length : null;
  const T = [];
  if (pf && pf.var_pct != null) T.push(`<div class="s5-t s5-tp"><small>Mon portefeuille</small><b>${synPct(pf.var_pct)}</b><span>${synEur(pf.var_eur)}${pf.valeur_eur ? ` · ${F0.format(Math.round(pf.valeur_eur))} € au total` : ""}</span></div>`);
  if (favMoy != null) T.push(`<div class="s5-t"><small>Mes favoris</small><b class="${synCls(favMoy)}">${synPct(favMoy)}</b><span>moyenne de ${favs.length} valeur${favs.length > 1 ? "s" : ""}</span></div>`);
  if (idx0) T.push(`<div class="s5-t"><small>${esc(idx0.nom)}</small><b class="${synCls(idx0.pct)}">${synPct(idx0.pct)}</b><span>pour comparer</span></div>`);
  const ref = pf && pf.var_pct != null ? pf.var_pct : favMoy, ecart = ref != null && idx0 && idx0.pct != null ? ref - idx0.pct : null;
  const verdict = ecart == null ? "" : `<p class="s5-vs">${pf && pf.var_pct != null ? "Votre portefeuille" : "Vos favoris"} ${Math.abs(ecart) < 0.3 ? `a fait comme le ${esc(idx0.nom)}` : `fait <b class="${ecart > 0 ? "up" : "down"}">${ecart > 0 ? "+" : "−"}${nf(1).format(Math.abs(ecart))} point${Math.abs(ecart) >= 2 ? "s" : ""}</b> ${ecart > 0 ? "de mieux" : "de moins"} que le ${esc(idx0.nom)}`} cette semaine.</p>`;
  // 2. pourquoi ça a bougé
  const Ls = L.filter(l => l.variation_semaine_pct != null).sort((x, y) => (!!y.portefeuille - !!x.portefeuille) || Math.abs(y.variation_semaine_pct) - Math.abs(x.variation_semaine_pct));
  const vmax = Math.max(1, ...Ls.map(l => Math.abs(l.variation_semaine_pct)));
  const raison = l => { const a = annDe(l.k)[0];
    if (a) { const ch = (a.chiffres || [])[0]; return `<span class="s5-pill">${esc(SYN_CAT[a.categorie] || a.type || "Annonce")}</span> ${esc(jour(a.date))}${ch ? ` · ${esc(ch[0])} ${esc(String(ch[1]))}` : ""}`; }
    if (l.indice && l.indice.pct != null && l.ecart_pts != null) return Math.abs(l.ecart_pts) < 1.5 ? `Sans annonce : a suivi le ${esc(l.indice.nom)} (${synPct(l.indice.pct)})` : `Sans annonce officielle : ${l.ecart_pts > 0 ? "a fait mieux" : "a fait moins bien"} que le ${esc(l.indice.nom)} (${synPct(l.indice.pct)})`;
    return "Sans annonce officielle cette semaine"; };
  const rows = Ls.map(l => { const v = l.variation_semaine_pct, w = Math.round(Math.abs(v) / vmax * 100), e = l.portefeuille && l.portefeuille.var_eur != null ? synEur(l.portefeuille.var_eur) : "";
    return `<a class="s5-r" href="${synLien(l.k)}">${synLogo(l.k, 34)}<span class="s5-rn"><b>${esc(l.nom)}</b><small>${raison(l)}</small></span><span class="s5-rv"><b class="${synCls(v)}">${synPct(v)}</b><i class="s5-bar ${synCls(v)}"><em style="width:${w}%"></em></i>${e ? `<small>${e} · ${nf(0).format(l.portefeuille.poids_pct)} % du portefeuille</small>` : `<small>${l.favori ? "favori" : ""}</small>`}</span></a>`; }).join("");
  // 3. l'actualité de vos entreprises
  const vus = new Set(), poidsDe = k => { const l = L.find(x => x.k === k); return l && l.portefeuille ? l.portefeuille.poids_pct : 0; };
  const anns = (b.annonces || []).filter(a => a.origine !== "presse" && !ROUT.has(a.categorie) && !vus.has(a.k + a.titre) && vus.add(a.k + a.titre)).sort((x, y) => poidsDe(y.k) - poidsDe(x.k) || y.poids - x.poids).slice(0, 6);
  // 4/11 (Romain : « clair et compréhensible, mettre en avant les actualités ») : les annonces chiffrées ou expliquées en cartes,
  // les simples dépôts de documents en lignes courtes ; « Expliquer » devient « En savoir plus », discret.
  const lecDe = a => (a.lecture || []).filter(t => t && !/^(Une information publiée|La publication des ventes|Document déposé)/.test(t)).join(" ");
  const annR = anns.filter(a => (a.chiffres || []).length || lecDe(a)), annC = anns.filter(a => !((a.chiffres || []).length || lecDe(a)));
  const annCourt = annC.map(a => `<a class="s5-ac" href="${esc(a.source || synLien(a.k))}"${a.source ? ' target="_blank" rel="noopener"' : ""}>${synLogo(a.k, 26)}<span><b>${esc(a.nom || (synObj(a.k) || {}).name || "")}</b> ${esc(a.titre || SYN_CAT[a.categorie] || "Publication")}</span><small>${esc(jour(a.date))}</small></a>`).join("");
  const annHTML = annR.map(a => { const ch = (a.chiffres || []).slice(0, 3), i = SYN_ANN.push(a) - 1, lec = lecDe(a);
    return `<article class="s5-a"><div class="s5-ah">${synLogo(a.k, 30)}<b>${esc(a.nom || (synObj(a.k) || {}).name || "")}</b><span class="s5-pill">${esc(SYN_CAT[a.categorie] || a.type || "Annonce")}</span><small>${esc(jour(a.date))}</small></div>
      <p class="s5-at">${esc(a.titre || "")}</p>${ch.length ? `<div class="s5-ch">${ch.map(([l, v]) => `<span><small>${esc(l)}</small><b>${esc(String(v))}</b></span>`).join("")}</div>` : ""}${lec ? `<p class="s5-al"><b>Ce que ça veut dire :</b> ${esc(lec)}</p>` : ""}
      <div class="s5-aa"><button type="button" class="s5-exp s5-exp2" data-syn-exp="${i}">✦ En savoir plus</button>${a.source ? `<a class="lnk" href="${esc(a.source)}" target="_blank" rel="noopener">Le document (${esc(a.source_nom || "source")})</a>` : ""}</div><div class="syn4-cl"></div></article>`; }).join("");
  // 5. favoris
  const fl = L.filter(l => l.favori).map(l => { const nx = (b.a_venir || []).find(e => e.k === l.k);
    return `<a class="s5-f" href="${synLien(l.k)}">${synLogo(l.k, 26)}<b>${esc(l.nom)}</b><span>${l.cours != null ? `${nf(2).format(l.cours)} ${esc(l.devise === "EUR" ? "€" : l.devise || "")}` : ""}</span><b class="${synCls(l.variation_semaine_pct)}">${synPct(l.variation_semaine_pct)}</b><small>${nx ? `${esc(jour(nx.date))} : ${esc((nx.type || "").toLowerCase())}` : ""}</small></a>`; }).join("");
  return `<div class="syn4 s5">
    <header class="s5-head"><p class="syn4-mast"><b>ENKLAIR</b><span>hebdo</span><i>n° ${esc(sem)}</i></p><p class="s5-date">${b.du ? esc(synDuAu(b)) : ""}${b.en_cours === false ? " · semaine close" : " · semaine en cours, mise à jour à chaque visite"}</p>
      <div class="s5-ts">${T.join("")}</div>${verdict}</header>
    <section class="s5-s"><h2><i>1</i>Ce que vos entreprises ont publié</h2>${annHTML || annCourt ? `${annHTML ? `<div class="s5-as">${annHTML}</div>` : ""}${annCourt ? `<div class="s5-acs"><p class="s5-acst">${annHTML ? "Autres publications" : "Publications de la semaine"}</p>${annCourt}</div>` : ""}` : `<p class="muted">Aucune publication officielle de vos entreprises cette semaine.</p>`}</section>
    <section class="s5-s"><h2><i>2</i>Vos valeurs cette semaine</h2><div class="s5-rs">${rows || `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille.</p>`}</div></section>
    <section class="s5-s"><h2><i>3</i>À venir sur deux semaines</h2>${synAgendaHTML(b)}</section>
    ${pf ? `<section class="s5-s"><h2><i>4</i>Points de vigilance du portefeuille</h2>${synAlertesHTML(b).replace("<h3>Votre portefeuille</h3>", "") || `<p class="muted">Rien à signaler.</p>`}</section>` : ""}
    <section class="s5-s" id="syn4-ia"></section>
    <p class="synfoot">Variations entre la clôture précédant la semaine et le dernier cours connu (différé), dans la devise de cotation. Annonces : documents officiels (AMF, SEC). Information, pas conseil.</p>
  </div>`;
}
synPageHTML = synPageV5;

/* ====== 5/11 (maquette validée docs/maquettes/rapport-semaine-v1.html, Romain : « bien mieux qu'avant ») : rapport v6 ======
   Ordre : en-tête jaune (ce que le portefeuille a gagné ou perdu, quatre cases), toute l'actualité de chaque entreprise (portefeuille
   d'abord, favoris ensuite : résultats, accords, rachats, emprunts, presse ; articles de recommandation écartés ; titres étrangers
   traduits par axTraduire), ce que chaque ligne a apporté en euros, le contexte de leurs secteurs, ce qui arrive. Vrai rapport et exemple. */
const SYN6_T = { resultats: ["Résultats", "t-res"], dividende: ["Dividende", "t-div"], dividendes: ["Dividende", "t-div"], rachat: ["Rachat d'actions", "t-rach"], operation: ["Accord", "t-acc"], contrat: ["Contrat", "t-acc"],
  dirigeants: ["Direction", "t-dir"], emission: ["Emprunt", "t-obl"], capital: ["Actionnaires", "t-rach"], initie: ["Achat d'un dirigeant", "t-dir"], assemblee: ["Assemblée", "t-rach"], agenda: ["Agenda", "t-rach"], presse: ["Presse", "t-pr"] };
const SYN6_RECO = /\b(buy|sell|kaufen|verkaufen|stuft|kursziel|price target|objectif de cours|on ach[eè]te ou on vend|upgrade|downgrade|outperform|underperform|surperform|sous-perform|better buy|set you up|should you|is it time)\b|\?$/i;
const SYN6_LG = { zh: "chinois", en: "anglais", de: "allemand", es: "espagnol", it: "italien", nl: "néerlandais", sv: "suédois", da: "danois", no: "norvégien", pt: "portugais" };
function synPageV6(b, m) {
  SYN_ANN = [];
  const pf = b.portefeuille, L = (b.lignes || []).slice(), sem = String(b.semaine || "").replace(/^\d{4}-W/, "");
  const jr = iso => { const d = new Date(iso + "T12:00:00Z"); return `${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; };
  const lng = t => /[àâçéèêëîïôûùüÿœ]|\b(le|la|les|des|du|une|et|pour|avec|sur)\b/i.test(t) ? "fr" : /\b(der|die|das|und|mit|für|Aktie)\b/.test(t) ? "de" : /\b(el|los|las|con|para|y)\b/.test(t) ? "es" : /\b(il|della|per|con|e)\b/.test(t) && /zion|zza|tà\b/.test(t) ? "it" : "en";
  const vide = a => a.origine !== "presse" && !(a.chiffres || []).length && ["communique", "autre", "capital", "agenda"].includes(a.categorie) && !/rachat/i.test(a.titre || "");
  const ann = (b.annonces || []).filter(a => !(a.origine === "presse" && SYN6_RECO.test(a.titre || "")) && !vide(a));
  const deK = k => ann.filter(a => a.k === k).sort((x, y) => (x.origine === "presse") - (y.origine === "presse") || String(y.date).localeCompare(x.date)).slice(0, 5);
  const item = a => { const [lab, cl] = SYN6_T[a.categorie] || (a.origine === "presse" ? SYN6_T.presse : ["Annonce", "t-rach"]), ch = (a.chiffres || []).slice(0, 3);
    const gen = t => /^(Une information publiée|La publication des ventes|Document déposé)/.test(t || "");
    const lec = (a.lecture || []).filter(t => t && !gen(t)).join(" ") || (a.origine !== "presse" && !gen(a.resume) ? a.resume || "" : "");
    const pr = a.origine === "presse", lg = pr ? lng(a.titre || "") : "fr";
    return `<li><span class="s6-tg ${cl}">${esc(lab)}</span><div><p class="s6-it"${pr && lg !== "fr" ? ` data-tr="${lg}"` : ""}>${esc(a.titre || a.type || "")}</p>
      ${ch.map(([l, v]) => `<span class="s6-ch"><small>${esc(l)}</small><b>${esc(String(v))}</b></span>`).join("")}${lec ? `<p class="s6-il">${esc(lec)}</p>` : ""}
      <p class="s6-is">${esc(jr(a.date))} · ${a.source ? `<a href="${esc(a.source)}" target="_blank" rel="noopener">${esc(pr ? a.site || "presse" : a.source_nom || "communiqué officiel")} ↗</a>` : esc(a.source_nom || "")}</p></div></li>`; };
  const carte = l => { const A = deK(l.k), v = l.variation_semaine_pct, etf = l.k.startsWith("e:"), poids = l.portefeuille && l.portefeuille.poids_pct;
    const sous = [etf ? "ETF" : "", poids != null ? `${F0.format(Math.round(poids))} % du portefeuille` : ""].filter(Boolean).join(" · ");
    return `<article class="s6-co"><header>${synLogo(l.k, 38)}<div><a href="${synLien(l.k)}"><b>${esc(l.nom)}</b></a>${sous ? `<small>${esc(sous)}</small>` : ""}</div>${v != null ? `<span class="s6-pv ${v < 0 ? "dn" : ""}">${synPct(v)}</span>` : ""}</header>
      ${A.length ? `<ul>${A.map(item).join("")}</ul>` : `<p class="s6-vide">${etf ? "Rien de publié cette semaine. Un ETF ne publie pas de résultats : son cours suit les entreprises qu'il contient." : "Rien de publié cette semaine."}</p>`}</article>`; };
  const nbA = (k) => deK(k).length;
  const lp = L.filter(l => l.portefeuille).sort((x, y) => nbA(y.k) - nbA(x.k) || (y.portefeuille.poids_pct || 0) - (x.portefeuille.poids_pct || 0));
  const lf = L.filter(l => !l.portefeuille).sort((x, y) => nbA(y.k) - nbA(x.k));
  const nb = L.reduce((t, l) => t + nbA(l.k), 0), nbRes = ann.filter(a => a.categorie === "resultats" && L.some(l => l.k === a.k)).length;
  const avecV = L.filter(l => l.variation_semaine_pct != null), best = avecV.slice().sort((x, y) => y.variation_semaine_pct - x.variation_semaine_pct)[0], worst = avecV.slice().sort((x, y) => x.variation_semaine_pct - y.variation_semaine_pct)[0];
  const nx = (b.a_venir || [])[0];
  const g = pf && pf.var_eur != null ? pf.var_eur : null;
  const titre = g != null ? `Votre portefeuille a ${g >= 0 ? "gagné" : "perdu"} ${F0.format(Math.abs(Math.round(g)))}&nbsp;€ cette semaine.` : best ? `Cette semaine, ${esc(best.nom)} a le plus bougé parmi vos valeurs.` : "Votre semaine en Bourse.";
  const sousT = [g != null ? `${synPct(pf.var_pct)} sur ${F0.format(Math.round(pf.valeur_eur - g))} €.` : "", nb ? `${nb} nouvelle${nb > 1 ? "s" : ""} sur vos ${L.length} valeurs${nbRes ? `, dont ${nbRes} publication${nbRes > 1 ? "s" : ""} de résultats` : ""}.` : ""].filter(Boolean).join(" ");
  const tiles = [pf && pf.valeur_eur ? `<div><small>Valeur du portefeuille</small><b>${F0.format(Math.round(pf.valeur_eur))} €</b><span>${pf.lignes || lp.length} ligne${(pf.lignes || lp.length) > 1 ? "s" : ""}</span></div>` : "",
    best ? `<div><small>La plus forte hausse</small><b class="${synCls(best.variation_semaine_pct)}">${synPct(best.variation_semaine_pct)}</b><span>${esc(best.nom)}</span></div>` : "",
    worst && worst !== best ? `<div><small>La plus forte baisse</small><b class="${synCls(worst.variation_semaine_pct)}">${synPct(worst.variation_semaine_pct)}</b><span>${esc(worst.nom)}</span></div>` : "",
    nx ? `<div><small>À venir</small><b>${esc(jr(nx.date))}</b><span>${esc(nx.nom || "")} : ${esc(String(nx.label || "").toLowerCase())}</span></div>` : ""].filter(Boolean);
  // ce que chaque ligne a apporté, en euros
  const Lc = lp.filter(l => l.portefeuille.var_eur != null).sort((x, y) => y.portefeuille.var_eur - x.portefeuille.var_eur), mx = Math.max(1, ...Lc.map(l => Math.abs(l.portefeuille.var_eur)));
  const contrib = Lc.map(l => { const e = l.portefeuille.var_eur; return `<div class="s6-cb"><span class="s6-cbn">${synLogo(l.k, 30)}<span>${esc(l.nom)}</span><small>${F0.format(Math.round(l.portefeuille.poids_pct || 0))} %</small></span><span class="s6-cbz"><i class="${e < 0 ? "dn" : "up"}" style="width:${(Math.abs(e) / mx * 50).toFixed(1)}%"></i></span><b class="${synCls(e)}">${synEur(e)}</b><small class="s6-cbv">${synPct(l.variation_semaine_pct)}</small></div>`; }).join("");
  // contexte
  const SENS = { "+": ["+", "s-p"], "-": ["−", "s-m"], "±": ["±", "s-pm"] };
  const ctx = synSujets(b).slice(0, 3).map(({ sj, touches }) => `<div><small>${esc(sj.theme)}</small><h4>${esc(sj.titre)}</h4><p>${esc((sj.faits || []).slice(-1)[0] || "")}</p><div class="s6-qui">${touches.slice(0, 4).map(t => { const [sg, cl] = SENS[t.im.sens] || SENS["±"]; return `<span class="${cl}" title="${esc(t.im.mecanisme || "")}">${sg} ${esc(t.c.name)}</span>`; }).join("")}</div></div>`).join("");
  // à venir
  const ag = (b.a_venir || []).map(e => `<div><span class="s6-dt">${esc(jr(e.date))}</span>${synLogo(e.k, 34)}<b>${esc(e.nom || "")} : ${esc(String(e.label || "").replace(/^./, c => c.toLowerCase()))}</b><em>${L.find(l => l.k === e.k && l.portefeuille) ? "Portefeuille" : "Favori"}</em></div>`).join("");
  setTimeout(() => { if (typeof axTraduire === "function") axTraduire(); }, 50);
  return `<div class="s6">
    <section class="s6-hero"><p class="s6-mast"><b>ENKLAIR</b><span>Votre rapport · ${b.du ? esc(synDuAu(b)) : "semaine " + esc(sem)}${b.en_cours ? " (en cours)" : ""}</span></p>
      <h1>${titre}</h1>${sousT ? `<p class="s6-sub">${sousT}</p>` : ""}${tiles.length ? `<div class="s6-tiles">${tiles.join("")}</div>` : ""}</section>
    <section class="s6-sec"><span class="s6-stk b">L'actualité</span><h2>Ce qui s'est passé pour vos entreprises.</h2>
      ${lp.length ? `<p class="s6-sub2">Dans votre portefeuille</p><div class="s6-cos">${lp.map(carte).join("")}</div>` : ""}
      ${lf.length ? `<p class="s6-sub2">Dans vos favoris</p><div class="s6-cos">${lf.map(carte).join("")}</div>` : ""}
      ${!L.length ? `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille pour les suivre ici.</p>` : ""}</section>
    ${contrib ? `<section class="s6-sec"><span class="s6-stk p">Votre portefeuille</span><h2>Ce qui l'a fait bouger.</h2><div class="s6-pfw"><div class="s6-pfk"><small>${g >= 0 ? "Gain" : "Perte"} de la semaine</small><b class="${synCls(g)}">${synEur(g)}</b><small>${synPct(pf.var_pct)} · valeur ${F0.format(Math.round(pf.valeur_eur))} €</small></div>
      <div class="s6-cbs"><h3>Ce que chaque ligne a apporté, en euros</h3>${contrib}<p class="s6-ias">Gain de la ligne = nombre de parts × variation du cours sur la semaine. Une petite ligne qui monte beaucoup peut moins compter qu'une grosse ligne qui monte un peu.</p></div></div>
      ${synAlertesHTML(b).replace("<h3>Votre portefeuille</h3>", "")}</section>` : ""}
    ${ctx ? `<section class="s6-sec"><span class="s6-stk v">Le contexte</span><h2>Ce qui touche leurs secteurs en ce moment.</h2><div class="s6-ctx">${ctx}</div></section>` : ""}
    <section class="s6-sec"><span class="s6-stk">À venir</span><h2>Ce qui arrive pour vos valeurs.</h2>${ag ? `<div class="s6-ag">${ag}</div><p class="s6-agn"><button type="button" class="s6-ics" data-synics="all">Tout ajouter à mon agenda (.ics)</button><a href="/agenda">Agenda complet →</a></p>` : `<p class="muted">Aucune date annoncée pour vos valeurs dans les deux prochaines semaines.</p>`}</section>
    <section class="s5-s" id="syn4-ia"></section>
    <p class="synfoot">Variations entre la clôture précédant la semaine et le dernier cours connu (différé), dans la devise de cotation. Annonces : documents officiels (AMF, SEC, bourses nordiques et de Londres). Presse : articles relevés par le site, titres traduits quand ils ne sont pas en français ; les articles qui disent d'acheter ou de vendre sont écartés. Information, pas conseil.</p>
  </div>`;
}
synPageHTML = synPageV6;

/* ---------- Rapport de la semaine v7 (5/11 nuit, maquette validée docs/maquettes/rapport-semaine-v2.html) ----------
   Toute la largeur ; « À retenir » dans le bandeau ; une rangée par entreprise (annonces sur deux colonnes, presse regroupée,
   entreprises sans nouvelle en une ligne discrète) ; portefeuille et agenda côte à côte ; contexte. Mêmes données que v6. */
function synLangue(t) { // 5/11 : « Apple inquieta al mercado por la… » était pris pour du français (« la »)
  const s = " " + String(t || "").toLowerCase() + " ", n = re => (s.match(re) || []).length;
  if (/[\u4e00-\u9fff]/.test(s)) return "zh";
  const fr = n(/ (le|les|des|du|une|un|et|pour|avec|sur|est|au|aux|dans|qui|de|la|son|sa|ses|en|à|ce) /g) + (/[àâçèêëîïôûœ]/.test(s.replace(/hermès|l'oréal|société générale|nestlé|hennes/g, "")) ? 2 : 0);
  const es = n(/ (el|los|las|del|por|para|con|y|una|que|al|sobre) /g) + (/[ñáíóú¿¡]/.test(s) ? 2 : 0);
  const de = n(/ (der|die|das|und|mit|für|aktie|von) /g) + (/[äöüß]/.test(s) ? 2 : 0);
  const it = n(/ (il|della|delle|per|con|di|che|gli) /g);
  const en = n(/ (the|and|of|in|on|to|its|from|by|at|with|for|is|are|as) /g); // 6/11 : « The Birkin fund cashing in on the Hermès… » passait pour du français (accent du nom)
  const best = Object.entries({ fr, es, de, it, en }).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 2 && best[0] !== "en" ? best[0] : "en";
}
const SYN7_DOT = { "t-res": "#E0B400", "t-div": "#00A06B", "t-rach": "#8A8A80", "t-acc": "#8B5CF6", "t-dir": "#F08C2E", "t-obl": "#F08C2E", "t-pr": "#4C7BF2" };
function s7Exp(a) { return `<button type="button" class="s7-exp" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer avec l'IA</button><div class="syn4-cl"></div>`; } // 6/11 : l'IA explique chaque annonce (comme dans les versions précédentes)
if (!window.LOGO_COUL) fetch("/data/logo-couleurs.json").then(r => r.json()).then(j => { window.LOGO_COUL = j; }).catch(() => { window.LOGO_COUL = {}; });
function synPageV7(b, m) {
  SYN_ANN = [];
  const pf = b.portefeuille, L = (b.lignes || []).slice(), sem = String(b.semaine || "").replace(/^\d{4}-W/, "");
  const jr = iso => { const d = new Date(iso + "T12:00:00Z"); return `${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${SYN_MOIS[d.getUTCMonth()]}`; };
  const vide = a => a.origine !== "presse" && !(a.chiffres || []).length && ["communique", "autre", "capital", "agenda"].includes(a.categorie) && !/rachat/i.test(a.titre || "");
  const ann = (b.annonces || []).filter(a => !(a.origine === "presse" && SYN6_RECO.test(a.titre || "")) && !vide(a));
  const deK = k => ann.filter(a => a.k === k).sort((x, y) => String(y.date).localeCompare(x.date));
  const gen = t => /^(Une information publiée|La publication des ventes|Document déposé)/.test(t || "");
  const src = a => a.source ? `<a href="${esc(a.source)}" target="_blank" rel="noopener">${esc(a.origine === "presse" ? a.site || "presse" : a.source_nom || "communiqué officiel")} ↗</a>` : esc(a.source_nom || "");
  const titreP = a => { const lg = synLangue(a.titre); return `<span${lg !== "fr" ? ` data-tr="${lg}"` : ""}>${esc(a.titre || "")}</span>`; };
  // 6/11 (maquette rapport-entreprises-v3, validée) : une carte par entreprise, à sa couleur (tirée de son logo), et ses nouvelles en lignes alignées
  const TYC = { "t-res": "res", "t-div": "div", "t-rach": "rach", "t-acc": "acc", "t-dir": "dir", "t-obl": "obl", "t-pr": "pr" };
  const ligne = a => { const pr = a.origine === "presse", rach = !pr && /^rachat d.actions$/i.test((a.titre || "").trim()), [lab, cl] = pr ? SYN6_T.presse : rach ? SYN6_T.rachat : SYN6_T[a.categorie] || ["Annonce", "t-rach"], ch = (a.chiffres || []).slice(0, 3);
    const lec = pr ? "" : (a.lecture || []).filter(t => t && !gen(t)).join(" ") || (!gen(a.resume) ? a.resume || "" : "");
    const tit = pr ? titreP(a) : esc(rach || (a.categorie === "rachat" && (!a.titre || a.titre === lab)) ? "Déclaration des actions rachetées par la société" : a.titre || a.type || lab);
    const chs = ch.map(([l, v]) => { const m = String(v).match(/^(.*?)\s*\(([+−-][^)]*?)(?: sur un an)?\)$/); return `<span class="s8-ch"><small>${esc(l)}</small><b>${esc(m ? m[1] : String(v))}</b>${m ? `<em class="${/^[−-]/.test(m[2]) ? "dn" : "up"}">${esc(m[2])}</em>` : ""}</span>`; }).join("");
    return `<div class="s8-it"><span class="s8-dt">${esc(jr(a.date))}</span><span class="s8-ty ${TYC[cl] || "rach"}"><i></i>${esc(lab)}</span><div class="s8-tx"><p class="s8-tt">${tit}</p>${chs ? `<div class="s8-chs">${chs}</div>` : ""}${lec ? `<p class="s8-lec">${esc(lec)}</p>` : ""}</div>
      <div class="s8-ac">${a.source ? `<a class="s8-src" href="${esc(a.source)}" target="_blank" rel="noopener">${esc(pr ? String(a.site || "presse").replace(/^www\./, "") : a.source_nom || "Source")} ↗</a>` : ""}<button type="button" class="s8-ia" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer</button></div><div class="syn4-cl s8-exp"></div></div>`; };
  const coul = k => { const c = k.startsWith("c:") && typeof LOGOS !== "undefined" && LOGOS[k.slice(2)] && LOGOS[k.slice(2)].f && window.LOGO_COUL ? LOGO_COUL[LOGOS[k.slice(2)].f.replace(/\.png$/, "")] : null; return c || null; };
  const PAL = ["#3B5BFF", "#E0457B", "#00A06B", "#F08C2E", "#8B5CF6", "#0EA5B7", "#C2410C", "#4D7C0F"];
  const teinte = k => coul(k) || PAL[[...k].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0) % PAL.length];
  // 6/11 (maquette rapport-semaine-v4, validée) : un « dossier » par entreprise, à sa couleur : courbe de la semaine, phrase factuelle,
  // le fait de la semaine en tête (résultats du trimestre d'abord, puis un fait sur l'entreprise), le reste en liste, le réglementaire en une ligne
  const spark = (serie, c, w, h) => { const v = (serie || []).filter(x => x != null); if (v.length < 2) return ""; const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
    const pts = v.map((x, i) => [i * w / (v.length - 1), h - 3 - (x - lo) / r * (h - 6)]), p = pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ");
    return `<svg class="s9-sp" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polygon points="0,${h} ${p} ${w},${h}" fill="${c}" opacity=".1"/><polyline points="${p}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${(pts.at(-1)[0] - 2).toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="3.2" fill="${c}"/></svg>`; };
  const reglem = a => a.origine !== "presse" && (/^rachat d.actions$/i.test((a.titre || "").trim()) || a.categorie === "rachat" || a.categorie === "capital" || /droits de vote/i.test(a.titre || ""));
  const FAIT = /\b(sign|accord|agreement|contrat|contract|acqui|rachète|lance|launch|met en service|ouvre|opens|partenariat|partnership|nomm|appoint|production|usine|plant)/i, OPIN = /\?|recommand|conseil|aktie|should you|buy|sell|could|top \d|meilleures? actions/i;
  const chips = a => (a.chiffres || []).slice(0, 3).map(([l, v]) => { const m = String(v).match(/^(.*?)\s*\(([+−-][^)]*?)(?: sur un an)?\)$/); return `<div class="s9-fig"><small>${esc(l)}</small><b>${esc(m ? m[1] : String(v))}</b>${m ? `<em class="${/^[−-]/.test(m[2]) ? "dn" : "up"}">${esc(m[2])} sur un an</em>` : ""}</div>`; }).join("");
  const srcA = a => a.source ? `<a class="s9-src" href="${esc(a.source)}" target="_blank" rel="noopener">${esc(a.origine === "presse" ? String(a.site || "presse").replace(/^www\./, "") : a.source_nom || "Source")} ↗</a>` : "";
  const titreA = a => { const pr = a.origine === "presse"; if (pr) return titreP(a); const lab = (SYN6_T[a.categorie] || ["Annonce"])[0]; return esc(a.titre && a.titre !== "Résultats" ? a.titre : a.categorie === "resultats" ? ((a.chiffres || []).some(q => /trimestre/.test(q[0])) ? "Résultats du trimestre" : "Résultats publiés") : a.titre || a.type || lab); };
  let numD = 0;
  const rangee = (l, grp) => { const A = deK(l.k); if (!A.length) return "";
    const reg = A.filter(reglem), reste = A.filter(a => !reglem(a)), c = teinte(l.k);
    const res = reste.filter(a => a.categorie === "resultats" && (a.chiffres || []).length).sort((x, y) => (!(x.chiffres || []).some(q => /trimestre/.test(q[0]))) - (!(y.chiffres || []).some(q => /trimestre/.test(q[0])))); // le trimestre (la nouvelle) avant le rapport annuel
    const offc = reste.filter(a => a.origine !== "presse" && (a.chiffres || []).length), pr = reste.filter(a => a.origine === "presse").sort((x, y) => (FAIT.test(y.titre || "") - FAIT.test(x.titre || "")) || (OPIN.test(x.titre || "") - OPIN.test(y.titre || "")));
    const lead = res[0] || offc[0] || reste.find(a => a.origine !== "presse") || pr[0] || null, autres = reste.filter(a => a !== lead).slice(0, 5);
    const v = l.variation_semaine_pct, etf = l.k.startsWith("e:"), poids = l.portefeuille && l.portefeuille.poids_pct;
    const meta = [etf ? "ETF" : "", poids != null ? `${F0.format(Math.round(poids))} % de votre portefeuille` : l.portefeuille ? "Dans votre portefeuille" : "Dans vos favoris"].filter(Boolean).join(" · ");
    const pairs = grp.filter(x => x.variation_semaine_pct != null && x.k.startsWith("c:")), qui = l.portefeuille ? "de votre portefeuille" : "de vos favoris";
    const rang = pairs.length > 1 && v != null ? (v === Math.max(...pairs.map(x => x.variation_semaine_pct)) && v > 0 ? `Meilleure semaine ${qui}` : v === Math.min(...pairs.map(x => x.variation_semaine_pct)) && v < 0 ? `Plus forte baisse ${qui}` : "") : "";
    const nres = A.filter(a => a.categorie === "resultats").length, npr = A.filter(a => a.origine === "presse").length;
    const deck = [rang, [nres ? "résultats publiés" : "", npr ? `${npr} article${npr > 1 ? "s" : ""} de presse` : ""].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    const ind = l.indice && l.ecart_pts != null ? `<div class="s9-vs"><small>${esc(l.indice.nom)} ${synPct(l.indice.pct)}</small><b class="${l.ecart_pts > 0 ? "up" : "dn"}">${l.ecart_pts > 0 ? "+" : "−"}${F1.format(Math.abs(l.ecart_pts))} pts</b><small>${l.ecart_pts > 0 ? "de mieux que l'indice" : "de moins que l'indice"}</small></div>` : "";
    let h = `<article class="s9-dos" style="--c:${c}"><div class="s9-bd"></div><header class="s9-h"><span class="s9-n">${String(++numD).padStart(2, "0")}</span>${synLogo(l.k, 52)}
      <div class="s9-id"><a href="${synLien(l.k)}"><b>${esc(l.nom)}</b></a><small>${esc(meta)}</small>${deck ? `<p class="s9-deck">${esc(deck)}</p>` : ""}</div>
      <div class="s9-perf">${spark(l.serie, c, 140, 42)}${v != null ? `<div><b class="${v < 0 ? "dn" : "up"}">${synPct(v)}</b><small>sur la semaine</small></div>` : ""}${ind}</div></header>`;
    // 6/11 (Romain) : synthèse de l'IA du site en tête du dossier, rédigée sur le serveur (ia_entreprises) ; les annonces et articles restent dessous, repliés, avec leurs liens
    const ia = b.ia_entreprises && b.ia_entreprises[l.k];
    if (ia && ia.clair) { const nA = reste.length;
      h += `<section class="s9-syn"><p class="s9-k">✦ Sa semaine, en clair</p><p class="s9-syn-t">${esc(ia.clair)}</p>${ia.change ? `<p class="s9-syn-c"><b>Ce que cela peut changer</b> ${esc(ia.change)}</p>` : ""}<p class="s9-syn-s">Rédigé par l'IA d'ENKLAIR${ia.modele ? ` (${esc(ia.modele)})` : ""} à partir des ${nA} ${nA > 1 ? "annonces et articles" : "annonce ou article"} ci-dessous. Les sources font foi.</p></section>`;
      h += `<details class="s9-src"><summary>Voir ${nA > 1 ? `les ${nA} annonces et articles` : "l'annonce"} en entier →</summary>`; }
    if (lead) { const pr1 = lead.origine === "presse", lec = pr1 ? "" : (lead.lecture || []).filter(t => t && !gen(t)).slice(0, 2).join(" ");
      const kick = `${lead.categorie === "resultats" ? "Le fait de la semaine" : "À lire cette semaine"} · ${pr1 ? "Presse" : (SYN6_T[lead.categorie] || ["Annonce"])[0]} · ${jr(lead.date)}`;
      const ch = chips(lead);
      h += `<section class="s9-une"><p class="s9-k">${esc(kick)}</p><p class="s9-t" role="heading" aria-level="4">${titreA(lead)}</p>${ch ? `<div class="s9-figs">${ch}</div>` : ""}${lec ? `<p class="s9-lec">${esc(lec)}</p>` : ""}
        <div class="s9-act">${srcA(lead)}<button type="button" class="s9-ia" data-syn-exp="${SYN_ANN.push(lead) - 1}">✦ Expliquer</button></div><div class="syn4-cl s9-exp"></div></section>`; }
    if (autres.length) h += `<section class="s9-aussi"><p class="s9-sub">Aussi cette semaine</p>${autres.map(a => { const pr1 = a.origine === "presse", lab = pr1 ? "Presse" : (SYN6_T[a.categorie] || ["Annonce"])[0], ch = pr1 ? "" : chips(a);
      return `<div class="s9-li"><time>${esc(jr(a.date))}</time><span class="s9-ty ${pr1 ? "pr" : a.categorie === "resultats" ? "res" : "of"}">${esc(lab)}</span><div class="s9-tx"><p>${titreA(a)}</p>${ch ? `<div class="s9-figs s9-mini">${ch}</div>` : ""}</div>${srcA(a)}<button type="button" class="s9-ia s9-m" data-syn-exp="${SYN_ANN.push(a) - 1}">✦ Expliquer</button><div class="syn4-cl s9-exp"></div></div>`; }).join("")}</section>`;
    if (ia && ia.clair) h += `</details>`;
    if (reg.length) h += `<p class="s9-reg">Publications réglementaires : ${reg.map(a => `${esc(/rachat/i.test(a.titre || "") || a.categorie === "rachat" ? "rachat d'actions" : (a.titre || "communiqué").replace(/^./, x => x.toLowerCase()))} (${esc(jr(a.date))})`).join(" · ")}</p>`;
    return h + `</article>`; };
  const calmes = arr => { const c = arr.filter(l => !deK(l.k).length); return c.length ? `<p class="s9-sub s9-sc">Sans nouvelle cette semaine</p><table class="s9-ct">${c.map(l => { const v = l.variation_semaine_pct, poids = l.portefeuille && l.portefeuille.poids_pct;
    return `<tr><td class="s9-cl"><a href="${synLien(l.k)}">${synLogo(l.k, 34)}<span><b>${esc(l.nom)}</b><small>${esc((poids != null ? `${F0.format(Math.round(poids))} % du portefeuille` : l.portefeuille ? "Portefeuille" : "Favori") + " · aucune annonce")}</small></span></a></td><td class="s9-cs">${spark(l.serie, teinte(l.k), 84, 26)}</td><td class="s9-cp ${v < 0 ? "dn" : "up"}">${v != null ? synPct(v) : "–"}</td></tr>`; }).join("")}</table>` : ""; };
  const nbA = k => deK(k).length;
  const lp = L.filter(l => l.portefeuille).sort((x, y) => nbA(y.k) - nbA(x.k) || (y.portefeuille.poids_pct || 0) - (x.portefeuille.poids_pct || 0));
  const lf = L.filter(l => !l.portefeuille).sort((x, y) => nbA(y.k) - nbA(x.k));
  const nb = L.reduce((t, l) => t + nbA(l.k), 0);
  const avecV = L.filter(l => l.variation_semaine_pct != null), best = avecV.slice().sort((x, y) => y.variation_semaine_pct - x.variation_semaine_pct)[0], worst = avecV.slice().sort((x, y) => x.variation_semaine_pct - y.variation_semaine_pct)[0];
  const g = pf && pf.var_eur != null ? pf.var_eur : null;
  // À retenir : les annonces chiffrées de la semaine (portefeuille d'abord), puis la plus forte baisse
  const nomDe = k => (L.find(l => l.k === k) || {}).nom || "";
  const chif = ann.filter(a => a.origine !== "presse" && (a.chiffres || []).length && L.some(l => l.k === a.k)).sort((x, y) => (!!L.find(l => l.k === y.k).portefeuille) - (!!L.find(l => l.k === x.k).portefeuille) || (y.categorie === "resultats") - (x.categorie === "resultats"));
  const vus = new Set(), ret = [];
  for (const a of chif) { if (vus.has(a.k) || ret.length >= 2) continue; vus.add(a.k); const [l, v] = a.chiffres[0], v2 = a.chiffres[1];
    const fv = String(v), par = fv.match(/^(.*?)\s*\((.+)\)$/);
    ret.push({ k: a.k, nom: nomDe(a.k), lab: l, fig: par ? par[1] : fv, txt: par ? par[2] : v2 ? `${v2[0]} : ${v2[1]}` : (SYN6_T[a.categorie] || ["Annonce"])[0], cl: "" }); }
  if (worst && worst.variation_semaine_pct < 0 && !vus.has(worst.k)) ret.push({ k: worst.k, nom: worst.nom, lab: "Sur la semaine", fig: synPct(worst.variation_semaine_pct), txt: "La plus forte baisse de vos valeurs cette semaine.", cl: "dn" });
  if (ret.length < 3 && best && best.variation_semaine_pct > 0 && !ret.some(r => r.k === best.k)) ret.push({ k: best.k, nom: best.nom, lab: "Sur la semaine", fig: synPct(best.variation_semaine_pct), txt: "La plus forte hausse de vos valeurs cette semaine.", cl: "up" });
  const retenir = ret.slice(0, 3).map(r => `<a class="s7-rt" href="${synLien(r.k)}"><span class="s7-rt-h">${synLogo(r.k, 32)}<b>${esc(r.nom)}</b></span><small>${esc(r.lab)}</small><span class="s7-rt-f ${r.cl}">${esc(r.fig)}</span><span class="s7-rt-t">${esc(r.txt)}</span></a>`).join("");
  const titre = g != null ? `Votre portefeuille a ${g >= 0 ? "gagné" : "perdu"} <em class="${g >= 0 ? "up" : "dn"}">${F0.format(Math.abs(Math.round(g)))}&nbsp;€</em> cette semaine.` : best ? `Cette semaine, ${esc(best.nom)} a le plus bougé parmi vos valeurs.` : "Votre semaine en Bourse.";
  const sousT = g != null ? `${synPct(pf.var_pct)} sur ${F0.format(Math.round(pf.valeur_eur - g))} €. Il vaut ${F0.format(Math.round(pf.valeur_eur))} € ${b.au && !b.en_cours ? "au " + esc(jr(b.au)).replace(/\.$/, "") : "aujourd'hui"}.` : "";
  const kp = [nb ? `${nb} nouvelle${nb > 1 ? "s" : ""} sur vos ${L.length} valeurs` : "", best ? `▲ <b>${esc(best.nom)}</b> ${synPct(best.variation_semaine_pct)}` : "", worst && worst !== best ? `▼ <b>${esc(worst.nom)}</b> ${synPct(worst.variation_semaine_pct)}` : ""].filter(Boolean);
  const Lc = lp.filter(l => l.portefeuille.var_eur != null).sort((x, y) => y.portefeuille.var_eur - x.portefeuille.var_eur), mx = Math.max(1, ...Lc.map(l => Math.abs(l.portefeuille.var_eur)));
  const contrib = Lc.map(l => { const e = l.portefeuille.var_eur; return `<div class="s7-cb"><span class="s7-cbn">${synLogo(l.k, 28)}<span>${esc(l.nom)}</span></span><span class="s7-cbz"><i class="${e < 0 ? "dn" : "up"}" style="width:${(Math.abs(e) / mx * 50).toFixed(1)}%"></i></span><b class="${e < 0 ? "dn" : "up"}">${synEur(e)}</b></div>`; }).join("");
  const SENS = { "+": ["+", "s-p"], "-": ["−", "s-m"], "±": ["±", "s-pm"] };
  const ctx = synSujets(b).slice(0, 3).map(({ sj, touches }) => `<div><small>${esc(sj.theme)}</small><h4>${esc(sj.titre)}</h4><p>${esc((sj.faits || []).slice(-1)[0] || "")}</p><div class="s7-qui">${touches.slice(0, 4).map(t => { const [sg, cl] = SENS[t.im.sens] || SENS["±"]; return `<span class="${cl}" title="${esc(t.im.mecanisme || "")}">${sg} ${esc(t.c.name)}</span>`; }).join("")}</div></div>`).join("");
  const ag = (b.a_venir || []).slice(0, 8).map(e => { const d = new Date(e.date + "T12:00:00Z"); return `<div class="s7-ag1"><span class="s7-dt">${d.getUTCDate()}<small>${SYN_MOIS[d.getUTCMonth()]}</small></span>${synLogo(e.k, 32)}<p>${esc(e.nom || "")} : ${esc(String(e.label || "").replace(/^./, c => c.toLowerCase()))}<small>${L.find(l => l.k === e.k && l.portefeuille) ? "Portefeuille" : "Favori"}</small></p></div>`; }).join("");
  const alertes = synAlertesHTML(b).replace("<h3>Votre portefeuille</h3>", "");
  setTimeout(() => { if (typeof axTraduire === "function") axTraduire(); }, 50);
  return `<div class="s7">
    <section class="s7-hero"><p class="s7-mast"><b>ENKLAIR</b><span>Votre rapport · ${b.du ? esc(synDuAu(b)) : "semaine " + esc(sem)}${b.en_cours ? " (en cours)" : ""}</span></p>
      <div class="s7-hg"><div><h1>${titre}</h1>${sousT ? `<p class="s7-sub">${sousT}</p>` : ""}${kp.length ? `<div class="s7-kpis">${kp.map(k => `<span>${k}</span>`).join("")}</div>` : ""}</div>
      ${retenir ? `<div class="s7-rts"><small>À retenir</small><div class="s7-rtg">${retenir}</div></div>` : ""}</div></section>
    <section class="s7-sec"><span class="s7-stk b">L'actualité</span><h2>Ce qui s'est passé pour vos entreprises.</h2>
      ${lp.length ? `<p class="s7-grp">Dans votre portefeuille</p>${lp.map(l => rangee(l, lp)).join("")}${calmes(lp)}` : ""}
      ${lf.length ? `<p class="s7-grp">Dans vos favoris</p>${lf.map(l => rangee(l, lf)).join("")}${calmes(lf)}` : ""}
      ${!L.length ? `<p class="muted">Ajoutez des favoris ou des lignes de portefeuille pour les suivre ici.</p>` : ""}</section>
    <section class="s7-sec s7-duo">
      ${contrib ? `<div><span class="s7-stk p">Votre portefeuille</span><h2>Ce qui l'a fait bouger.</h2><div class="s7-box"><h3>Ce que chaque ligne a apporté</h3>${contrib}<p class="s7-ias">Gain de la ligne = nombre de parts × variation du cours sur la semaine.</p>${alertes}</div></div>` : ""}
      <div><span class="s7-stk">À venir</span><h2>Vos prochaines dates.</h2><div class="s7-box">${ag || `<p class="muted">Aucune date annoncée pour vos valeurs dans les deux prochaines semaines.</p>`}${ag ? `<p class="s7-agn"><button type="button" class="s6-ics" data-synics="all">＋ Ajouter à mon agenda (.ics)</button><a href="/agenda">Agenda complet →</a></p>` : ""}</div></div></section>
    ${ctx ? `<section class="s7-sec"><span class="s7-stk v">Le contexte</span><h2>Ce qui touche leurs secteurs.</h2><div class="s7-ctx">${ctx}</div></section>` : ""}
    <section class="s5-s" id="syn4-ia"></section>
    <p class="synfoot">Variations entre la clôture précédant la semaine et le dernier cours connu (différé), dans la devise de cotation. Annonces : documents officiels (AMF, SEC, bourses nordiques et de Londres). Presse : articles relevés par le site, titres traduits quand ils ne sont pas en français ; les articles qui disent d'acheter ou de vendre sont écartés. Information, pas conseil.</p>
  </div>`;
}
synPageHTML = synPageV7;
