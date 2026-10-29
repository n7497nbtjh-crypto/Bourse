/* =====================================================================================================
   Module « parcours » (cf/site/m/parcours.js), chargé après le script principal et après m/synthese.js.
   1. Apprendre : un seul point d'entrée, /apprendre, et un chemin clair.
        Par où commencer (/commencer) → L'Académie (/academie : l'essentiel en 3 étapes, le cours complet, la formation guidée)
        → Le lexique (/lexique) → Les outils pédagogiques (/apprendre#outils).
      L'ancien parcours « Premiers pas » (/debuter) faisait doublon avec l'Académie : il devient « L'essentiel en 3 étapes »,
      la version courte de l'Académie (/academie/express). Les anciennes adresses /debuter/… sont redirigées (ici et par le Worker, en 301).
   2. Le rapport de la semaine sur mesure : réglages gardés avec le compte (GET/POST /api/espace/rapport, cf/src/espace.mjs),
      assistant en 3 étapes au premier passage dans Mon espace, onglet « Mon rapport », aperçu sur l'accueil pour les visiteurs,
      ligne dans la page Premium. Les réglages sont appliqués par le serveur (cf/src/synthese.mjs, faitsSynthese) ; ici on n'affiche que ce qu'il renvoie.
   Les fonctions de m/synthese.js (pageEspace, espaceBilan, synCharger, synAccueil) sont enveloppées, pas réécrites.
   ===================================================================================================== */

/* ---------- Redirections des anciennes adresses (même règle que redirectionParcours dans cf/src/worker.mjs) ---------- */
function parRedirection(p) {
  const m = /^\/debuter(\/.*)?$/.exec(p || ""); if (m) return "/academie/express" + (m[1] || "");
  if (p === "/premiers-pas") return "/academie/express";
  return null;
}
const PAR_NIV_MODULE = { bases: "bourse", lire: "comptes", prix: "valorisation" };
const PAR_APPROFONDIR = { // leçon express → leçon complète de l'Académie
  "bases/action": "bourse/action", "bases/cours": "bourse/cours", "bases/etf-indice": "placements/etf", "bases/enveloppes": "placements/pea", "bases/frais": "frais-fiscalite/frais-courtage", "bases/risque": "bases/risque-rendement",
  "lire/chiffre-affaires": "comptes/compte-resultat", "lire/marge-exploitation": "comptes/compte-resultat", "lire/benefice-net": "comptes/compte-resultat", "lire/dette-nette": "comptes/bilan", "lire/free-cash-flow": "comptes/flux", "lire/dividende": "bourse/dividendes",
  "prix/capitalisation": "valorisation/valeur-entreprise", "prix/per": "valorisation/per", "prix/rendement-dividende": "valorisation/rendement-dividende", "prix/comparer": "comptes/mediane", "prix/prix-et-qualite": "valorisation/croissance-prix",
};

/* ---------- Styles ---------- */
document.head.insertAdjacentHTML("beforeend", `<style id="par-css">
.par-hero{padding:6px 0 18px}
.par-hero h1{margin:4px 0 6px}
.par-prog{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin:14px 0 0;font-size:13.5px;color:var(--grey)}
.par-prog b{color:var(--ink);font-weight:600}
.par-prog .btn{margin-left:auto}
.par-path{display:grid;gap:14px;margin:8px 0 18px;counter-reset:par}
.par-step{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px}
.par-step>.n{width:40px;height:40px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 17px var(--mono)}
.par-step h2{font-size:21px;margin:2px 0 4px}
.par-step>div>p{margin:0 0 10px;color:var(--grey);font-size:14.5px}
.par-cta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-top:10px}
.par-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.par-3>a{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:inherit;background:var(--paper,#FBF9F4);min-width:0}
.par-3>a:hover{border-color:var(--ink)}
.par-3>a small{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--light)}
.par-3>a b{font-size:15.5px}
.par-3>a span{font-size:13.5px;color:var(--grey)}
.par-3>a .feub{margin-top:auto}
.par-3>a.main{background:#fff;border-color:var(--ink);box-shadow:0 1px 0 var(--ink)}
.par-mods{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.par-mods a{font-size:13px;border:1px solid var(--line);border-radius:99px;padding:4px 10px;text-decoration:none;color:inherit;background:#fff}
.par-mods a.ok{border-color:var(--g);color:var(--g)}
.par-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.par-tools a{display:flex;flex-direction:column;gap:3px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:inherit;background:#fff;min-width:0}
.par-tools a:hover{border-color:var(--ink)}
.par-tools a b{font-size:15px}
.par-tools a span{font-size:13.5px;color:var(--grey)}
.par-tools a small{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--light)}
.par-ways{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 18px}
.par-ways a{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:14px;padding:14px 16px;text-decoration:none;color:inherit;background:#fff;min-width:0}
.par-ways a:hover{border-color:var(--ink)}
.par-ways a small{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--light)}
.par-ways a b{font-size:16.5px;font-family:var(--serif,inherit)}
.par-ways a span{font-size:13.5px;color:var(--grey)}
.par-ways a.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.par-deep{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;margin:12px 0 0;padding:10px 14px;border-radius:12px;background:var(--soft);font-size:14px}
@media (max-width:860px){.par-3,.par-tools,.par-ways{grid-template-columns:minmax(0,1fr)}.par-step{grid-template-columns:minmax(0,1fr);padding:14px}.par-step>.n{width:34px;height:34px;font-size:15px}.par-prog .btn{margin-left:0}}

/* Rapport sur mesure */
.par-wiz{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}
.par-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px}
.par-card h2{font-size:22px;margin:4px 0 4px}
.par-card>p.muted{margin:0 0 12px}
.par-dots{display:flex;gap:6px;margin:8px 0 0}
.par-dots i{flex:1;height:4px;border-radius:4px;background:var(--line)}
.par-dots i.on{background:var(--ink)}
.par-grp{border:0;margin:0 0 14px;padding:0;min-width:0}
.par-grp legend{font-weight:600;font-size:15px;margin:0 0 6px;padding:0}
.par-grp .hint{font-size:13px;color:var(--grey);margin:-2px 0 8px}
.par-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.par-opt{position:relative;display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;background:var(--paper,#FBF9F4);min-width:0}
.par-opt input{margin:3px 0 0;accent-color:var(--ink);flex:none}
.par-opt b{display:block;font-size:14.5px}
.par-opt span{display:block;font-size:13px;color:var(--grey)}
.par-opt:has(input:checked){border-color:var(--ink);background:#fff;box-shadow:inset 0 0 0 1px var(--ink)}
.par-opt.off{opacity:.55;cursor:not-allowed}
.par-chips{display:flex;flex-wrap:wrap;gap:6px}
.par-chips label{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:99px;padding:6px 11px;font-size:13.5px;cursor:pointer;background:#fff}
.par-chips input{position:absolute;opacity:0;pointer-events:none}
.par-chips label:has(input:checked){background:var(--ink);border-color:var(--ink);color:#fff}
.par-chips label.off{opacity:.45;cursor:not-allowed}
.par-chips label:has(input:focus-visible){outline:2px solid var(--g);outline-offset:2px}
.par-act{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px}
.par-act .sp{flex:1}
.par-msg{font-size:13.5px;margin:8px 0 0}
.par-msg.err{color:var(--down,#B4531A)}
.par-sum{position:sticky;top:76px}
.par-sum p.kick{margin:0 0 6px}
.par-sum ul{margin:0;padding:0;list-style:none;display:grid;gap:8px;font-size:14px}
.par-sum li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:6px}
.par-sum li i{font-style:normal;color:var(--g);font-weight:700}
.par-bar{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:9px 14px;margin:0 0 12px;background:#fff;font-size:13.5px}
.par-bar b{font-weight:600}
.par-bar span{color:var(--grey);min-width:0}
.par-sects{display:grid;gap:12px}
.par-sect{border:1px solid var(--line);border-radius:12px;padding:12px 14px;min-width:0}
.par-sect h3{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin:0 0 6px;font-size:16px}
.par-sect h3 b{font:700 20px var(--mono)}
.par-sect .meta{font-size:13px;color:var(--grey);margin:0 0 8px}
.par-split{display:flex;height:8px;border-radius:8px;overflow:hidden;background:var(--line);margin:0 0 10px}
.par-split i{display:block;height:100%}
.par-sect .two2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:13.5px}
.par-sect .two2 p{margin:0 0 3px;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--light)}
.par-sect .two2 a{display:flex;justify-content:space-between;gap:8px;text-decoration:none;color:inherit;padding:2px 0}
.par-sect .two2 a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.par-sect .two2 a:hover span{text-decoration:underline}
.par-lec{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between}
.par-lec p{margin:0}
.par-hidden{display:none!important}
@media (max-width:860px){.par-wiz{grid-template-columns:minmax(0,1fr)}.par-sum{position:static}.par-opts{grid-template-columns:minmax(0,1fr)}.par-sect .two2{grid-template-columns:minmax(0,1fr)}}

/* Accueil des visiteurs : aperçu d'un rapport */
.par-home{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:stretch}
.par-demo{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;min-width:0;position:relative}
.par-demo .tag{position:absolute;top:12px;right:12px;font:600 10.5px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--grey);border:1px dashed var(--light);border-radius:99px;padding:3px 8px}
.par-demo h3{margin:2px 0 10px;font-size:18px;padding-right:96px}
.par-demo .row{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line2,#EFEAE0);font-size:14px}
.par-demo .row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.par-demo .row b{font:600 14px var(--mono);text-align:right;min-width:62px}
.par-demo .sec{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--soft);font-size:13.5px}
.par-demo .psrc{font-size:12px;color:var(--grey);margin:10px 0 0}
.par-demo .ph0{height:12px;border-radius:6px;background:var(--line);display:block}
.par-pitch{background:var(--ink);color:#fff;border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:10px;min-width:0}
.par-pitch h3{margin:0;font-size:22px;color:#fff}
.par-pitch ul{margin:0;padding:0;list-style:none;display:grid;gap:8px;font-size:14.5px}
.par-pitch li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px}
.par-pitch li::before{content:"✓";color:#8FD3AE;font-weight:700}
.par-pitch .btn{align-self:flex-start;background:#fff;color:var(--ink);border-color:#fff}
.par-pitch small{color:#C9C4BA;font-size:12.5px}
@media (max-width:860px){.par-home{grid-template-columns:minmax(0,1fr)}.par-demo .row{grid-template-columns:24px minmax(0,1fr) auto}.par-demo .row svg{display:none}}
</style>`);

/* ---------- Petits outils ---------- */
const parSt = k => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } };
const parGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const parSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const parBar = (a, b) => `<div class="feub"><span class="f" style="width:${b ? Math.round(a / b * 100) : 0}%"></span></div>`;
let PAR_PARCOURS_P = null;
const parParcours = () => PARCOURS ? Promise.resolve(PARCOURS) : (PAR_PARCOURS_P = PAR_PARCOURS_P || fetch("/data/parcours.json").then(r => r.json()).then(j => (PARCOURS = j)).catch(() => null));
function parCrumbs(items) { return `<div class="crumbs"><a href="/apprendre">Apprendre</a>${items.map(([h, t]) => ` › ${h ? `<a href="${h}">${esc(t)}</a>` : esc(t)}`).join("")}</div>`; }

/* =====================================================================================================
   1. Apprendre
   ===================================================================================================== */
async function pageApprendre() {
  setTitle("Apprendre la Bourse"); setNav("aca");
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([acaLoad(), parParcours(), premStatus().catch(() => null)]);
  const st = typeof acaSt === "function" ? acaSt() : {}, ps = pState(), prof = parSt(typeof CKEY !== "undefined" ? CKEY : "bilan.profil");
  const mods = ACA ? ACA.modules : [], tot = mods.reduce((a, m) => a + m.lecons.length, 0), lus = mods.reduce((a, m) => a + m.lecons.filter(l => st[m.id + "/" + l.id]).length, 0);
  const N = (PARCOURS && PARCOURS.niveaux) || [], etot = N.reduce((a, n) => a + n.lecons.length, 0), elus = N.reduce((a, n) => a + n.lecons.filter(l => ps[n.id + "/" + l.id]).length, 0);
  const nq = Object.keys(prof).length, profOk = nq >= 5;
  const mins = mods.reduce((a, m) => a + m.lecons.reduce((b, l) => b + (l.duree_min || 5), 0), 0);
  // Prochaine étape conseillée : le profil, puis l'essentiel, puis le cours complet
  const nextE = N.flatMap(n => n.lecons.map(l => [n, l])).find(([n, l]) => !ps[n.id + "/" + l.id]);
  const nextA = mods.flatMap(m => m.lecons.map(l => [m, l])).find(([m, l]) => !st[m.id + "/" + l.id]);
  const reprise = !profOk ? ["/commencer#profil", "Commencer : trouver mon profil"] : nextE && elus < etot ? [`/academie/express/${nextE[0].id}/${nextE[1].id}`, `Reprendre : ${nextE[1].titre}`]
    : nextA ? [`/academie/${nextA[0].id}/${nextA[1].id}`, `Reprendre : ${nextA[1].titre}`] : ["/lexique", "Revoir le lexique"];
  const outils = [
    ["/livret-a-ou-bourse", "Comparer", "Livret A ou Bourse ?", "100 € par mois sur 10, 20 ou 30 ans, inflation comprise."],
    ["/idees-recues", "Comprendre", "Les idées reçues", "« La Bourse, c'est un casino » et les autres, chiffres et sources à l'appui."],
    ["/pea-cto", "Choisir", "PEA, compte-titres, assurance-vie", "Ce que chaque compte change à vos impôts."],
    ["/simulateurs/epargne", "Simuler", "Épargner chaque mois", "Ce que devient une somme placée tous les mois."],
    ["/simulateurs/frais", "Simuler", "Le coût des frais", "Courtage et frais de gestion sur 10, 20 ou 30 ans."],
    ["/simulateurs/pea-cto", "Simuler", "L'impôt selon le compte", "PEA ou compte-titres, avec vos montants."],
    ["/outils/si-javais", "Revoir le passé", "Et si j'avais investi…", "1 000 € placés il y a 1, 3 ou 5 ans, comparés au marché."],
    ["/outils/verifier", "Se protéger", "Vérifier une offre", "Un site ou un « conseiller » comparé aux listes noires de l'AMF."],
    ["/portefeuille", "S'entraîner", "Un portefeuille d'essai", "Composer un portefeuille fictif et voir ce qu'il contient vraiment."],
  ];
  const ess = typeof ESSENTIEL !== "undefined" && typeof ALL !== "undefined" ? ESSENTIEL.filter(k => ALL[k]) : [];
  app.innerHTML = `<div class="par-hero"><p class="kick">Apprendre</p><h1 class="pagetitle">Apprendre la Bourse, dans l'ordre.</h1>
      <p class="pagesub">Un seul chemin en quatre étapes : trouver son profil, suivre les cours, retrouver chaque mot, puis s'exercer avec de vrais chiffres. Tout est gratuit pour l'essentiel. Votre progression reste sur cet appareil.</p>
      <div class="par-prog"><span>Profil : <b>${profOk ? "trouvé" : nq ? `${nq} réponse${nq > 1 ? "s" : ""} sur 5` : "à faire"}</b></span><span>L'essentiel : <b>${elus} / ${etot} leçons</b></span><span>Cours complet : <b>${lus} / ${tot} leçons</b></span><a class="btn" href="${reprise[0]}">${esc(reprise[1])}</a></div></div>
    <div class="par-path">
      <section class="par-step" id="commencer"><span class="n">1</span><div><p class="kick">10 minutes</p><h2>Par où commencer</h2>
        <p>Les sept étapes à suivre dans l'ordre avant d'investir, et cinq questions pour savoir quel type d'investisseur vous êtes.</p>
        <div class="par-cta"><a class="btn${profOk ? " ghost" : ""}" href="/commencer">Le guide du nouvel investisseur</a><a class="more" href="/commencer#profil">${profOk ? "Revoir mon profil" : "Trouver mon profil en 5 questions"} →</a><a class="more" href="/commencer#faq">Questions fréquentes →</a></div></div></section>
      <section class="par-step" id="academie"><span class="n">2</span><div><p class="kick">À votre rythme</p><h2>L'Académie</h2>
        <p>Les cours, en trois formats. Commencez par l'essentiel si vous êtes pressé, approfondissez avec le cours complet.</p>
        <div class="par-3">
          <a class="${elus < etot ? "main" : ""}" href="/academie/express"><small>Version courte · ${etot} leçons de 3 min</small><b>L'essentiel en 3 étapes</b><span>Comprendre une action, lire une entreprise, juger son prix. Un quiz par étape.</span>${parBar(elus, etot)}</a>
          <a class="${elus >= etot ? "main" : ""}" href="/academie"><small>Cours complet · ${mods.length} modules · ${F0.format(Math.round(mins / 60))} h</small><b>Le cours de culture financière</b><span>L'argent, les placements, les comptes, les frais, la fiscalité et les pièges.</span>${parBar(lus, tot)}</a>
          ${ACA && ACA.formation ? `<a href="/academie/formation"><small>Formation guidée${isPrem() ? "" : " · Premium"}</small><b>${esc(ACA.formation.titre)}</b><span>Une étape par semaine, de l'épargne de précaution au premier ordre.</span></a>` : ""}</div>
        <div class="par-mods">${mods.map(m => { const d = m.lecons.filter(l => st[m.id + "/" + l.id]).length; return `<a href="/academie/${m.id}" class="${d === m.lecons.length ? "ok" : ""}">${d === m.lecons.length ? "✓ " : ""}${esc(m.titre)}</a>`; }).join("")}</div></div></section>
      <section class="par-step" id="lexique"><span class="n">3</span><div><p class="kick">À garder sous la main</p><h2>Le lexique</h2>
        <p>Chaque chiffre de la Bourse expliqué : ce que c'est, un exemple réel et à partir de quand c'est bon ou moins bon. Ces dix notions suffisent pour lire une fiche.</p>
        <div class="par-mods">${ess.map((k, i) => `<a href="/lexique#${k}">${i + 1}. ${esc(ALL[k].name)}</a>`).join("")}</div>
        <div class="par-cta"><a class="more" href="/lexique">Tout le lexique →</a></div></div></section>
      <section class="par-step" id="outils"><span class="n">4</span><div><p class="kick">Avec vos chiffres</p><h2>Les outils pédagogiques</h2>
        <p>Pour vérifier par vous-même ce que les cours expliquent. Les hypothèses sont toujours affichées.</p>
        <div class="par-tools">${outils.map(([h, k, t, d]) => `<a href="${h}"><small>${k}</small><b>${t}</b><span>${d}</span></a>`).join("")}</div></div></section>
    </div>
    <section class="panel"><div class="pb" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><b>Ensuite : passer à la pratique</b><div class="muted">Ouvrir une vraie fiche et comparer ses chiffres à la médiane de son secteur.</div></div><div style="display:flex;gap:16px;flex-wrap:wrap"><a class="more" href="/entreprises">Les entreprises →</a><a class="more" href="/etf">Les ETF →</a><a class="more" href="/methode">Méthode et sources →</a></div></div></section>
    <p class="note">Contenu pédagogique et général : il ne tient pas compte de votre situation et ne constitue pas un conseil en investissement.</p>`;
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
}

/* ---------- L'Académie : l'accueil présente les trois formats ---------- */
async function pageAcademie(mid, lid) {
  setTitle("L'Académie"); setNav("aca");
  if (mid === "express") return parExpress(lid);
  app.innerHTML = `<div class="empty">Chargement…</div>`;
  await Promise.all([acaLoad(), premStatus()]);
  if (!ACA) { app.innerHTML = `<div class="empty">Les cours n'ont pas pu être chargés.</div>`; return; }
  if (mid === "formation") return pageFormation();
  if (!mid) return acaAccueil();
  const [m, l] = acaFind(mid, lid); if (!m) return pageNotFound();
  if (lid === "quiz") return acaQuiz(m);
  if (lid && !l) return pageNotFound();
  return l ? acaLecon(m, l) : acaModule(m);
}
function parWays(on) {
  const ps = pState(), N = (PARCOURS && PARCOURS.niveaux) || [], etot = N.reduce((a, n) => a + n.lecons.length, 0), elus = N.reduce((a, n) => a + n.lecons.filter(l => ps[n.id + "/" + l.id]).length, 0);
  const st = acaSt(), tot = ACA ? ACA.modules.reduce((a, m) => a + m.lecons.length, 0) : 0, lus = ACA ? ACA.modules.reduce((a, m) => a + m.lecons.filter(l => st[m.id + "/" + l.id]).length, 0) : 0;
  return `<div class="par-ways">
    <a href="/academie/express" class="${on === "express" ? "on" : ""}"><small>Version courte${etot ? ` · ${elus} / ${etot} lues` : ""}</small><b>L'essentiel en 3 étapes</b><span>Des leçons de trois minutes et un quiz par étape.</span></a>
    <a href="/academie" class="${on === "cours" ? "on" : ""}"><small>Cours complet · ${lus} / ${tot} lues</small><b>Les ${ACA ? ACA.modules.length : 8} modules</b><span>Pour approfondir chaque sujet, avec des sources officielles.</span></a>
    ${ACA && ACA.formation ? `<a href="/academie/formation" class="${on === "formation" ? "on" : ""}"><small>Formation guidée${isPrem() ? "" : " · Premium"}</small><b>Six semaines, pas à pas</b><span>Construire son premier portefeuille, une étape par semaine.</span></a>` : ""}</div>`;
}
async function parAcaAccueilAsync() { await parParcours(); const w = $(".par-ways"); if (w) w.outerHTML = parWays("cours"); }
function acaAccueil() {
  const st = acaSt(), tot = ACA.modules.reduce((a, m) => a + m.lecons.length, 0), lus = ACA.modules.reduce((a, m) => a + acaProgress(m, st).d, 0), mins = ACA.modules.reduce((a, m) => a + m.lecons.reduce((b, l) => b + (l.duree_min || 5), 0), 0);
  const next = ACA.modules.flatMap(m => m.lecons.map(l => [m, l])).find(([m, l]) => !st[m.id + "/" + l.id]);
  app.innerHTML = `${parCrumbs([[null, "L'Académie"]])}<div class="acahero"><p class="kick">L'Académie bilan.</p><h1 class="pagetitle">La culture financière, de zéro.</h1>
      <p class="pagesub">${ACA.modules.length} modules, ${tot} leçons et des quiz pour comprendre l'argent, la Bourse et les placements, avec des exemples chiffrés et des sources officielles. Environ ${F0.format(mins / 60)} heures en tout, à votre rythme. Votre progression reste sur cet appareil.</p>
      <div class="acaprog"><div class="feub"><span class="f" style="width:${lus / tot * 100}%"></span></div><span>${lus} / ${tot} leçons lues</span>${(() => { const xp = acaXP(st), [nv, a, b] = acaNiveau(xp); return `<span class="acaxp"><b>${xp} points</b> · niveau ${nv}${b ? ` · encore ${b - xp} pour le suivant` : ""}</span>`; })()}${next ? `<a class="btn" href="/academie/${next[0].id}/${next[1].id}">${lus ? "Reprendre" : "Commencer"} : ${esc(next[1].titre)}</a>` : ""}</div></div>
    ${parWays("cours")}
    <h2 class="subh">Le cours complet</h2>
    <div class="acagrid">${ACA.modules.map((m, i) => { const p = acaProgress(m, st), lk = m.lecons.filter(l => l.premium).length;
      return `<a class="acacard" href="/academie/${m.id}"><div class="acatop"><span class="n">${i + 1}</span><span class="nv ${niveauCls(m.niveau)}">${esc(m.niveau || "")}</span></div><h3>${esc(m.titre)}</h3><p>${esc(m.intro)}</p>
        <div class="acameta"><span>${m.lecons.length} leçons · ${m.duree_min || m.lecons.reduce((a, l) => a + (l.duree_min || 5), 0)} min${lk && !isPrem() ? ` · ${lk} Premium` : ""}</span><span>${p.d}/${p.n}${p.q != null ? ` · quiz ${p.q}/${m.quiz.length}` : ""}</span></div><div class="feub"><span class="f" style="width:${p.d / p.n * 100}%"></span></div></a>`; }).join("")}</div>
    ${ACA.formation ? `<section class="panel formcard"><div class="pb"><div><p class="kick">Formation guidée${isPrem() ? "" : " · Premium"}</p><h2>${esc(ACA.formation.titre)}</h2><p>${esc(ACA.formation.intro)}</p></div><a class="btn" href="/academie/formation">${isPrem() ? "Suivre la formation" : "Découvrir la formation"}</a></div></section>` : ""}
    <p class="note">Contenu pédagogique et général : il ne tient pas compte de votre situation et ne constitue pas un conseil en investissement. Les chiffres (fiscalité, plafonds) sont ceux de 2026 et sont vérifiés à chaque mise à jour. <a class="lnk" href="/methode">Méthode et sources</a> · <a class="lnk" href="/apprendre">Tout pour apprendre</a></p>`;
  parAcaAccueilAsync();
}

/* ---------- L'essentiel en 3 étapes (ancien « Premiers pas », /debuter) ---------- */
function pageDebuter(niv, lec) { // anciennes adresses : redirigées vers l'Académie
  const u = parRedirection(location.pathname.replace(/\/+$/, "")) || "/academie/express";
  history.replaceState({}, "", u + location.search + location.hash);
  return parExpress(niv, lec);
}
async function parExpress(niv, lec) {
  setTitle("L'essentiel en 3 étapes · L'Académie"); setNav("aca");
  if (!PARCOURS) app.innerHTML = `<div class="empty">Chargement…</div>`;
  if (!(await parParcours())) { app.innerHTML = `<div class="empty">Le parcours n'a pas pu être chargé.</div>`; return; }
  acaLoad();
  const st = pState(), N = PARCOURS.niveaux, base = "/academie/express";
  if (!niv) {
    await acaLoad();
    app.innerHTML = `${parCrumbs([["/academie", "L'Académie"], [null, "L'essentiel en 3 étapes"]])}<h1 class="pagetitle">L'essentiel en 3 étapes</h1><p class="pagesub">La version courte de l'Académie. Trois étapes, dans l'ordre. Chaque leçon se lit en trois minutes, avec un exemple chiffré ; un quiz de six questions termine chaque étape. Votre progression reste sur cet appareil.</p>
      ${ACA ? parWays("express") : ""}
      <div class="trois" style="padding:0;margin-bottom:20px">${N.map((n, i) => { const done = n.lecons.filter(l => st[n.id + "/" + l.id]).length, q = st["quiz/" + n.id];
        return `<a class="carte" href="${base}/${n.id}" style="text-decoration:none;color:inherit;background:#fff"><div class="n">${i + 1}</div><h3>${esc(n.titre)}</h3><p>${esc(n.intro)}</p><p class="light" style="font-size:13px;margin-top:6px">${done} / ${n.lecons.length} leçons lues${q != null ? ` · quiz : ${q} / ${n.quiz.length}` : ""}</p>${parBar(done, n.lecons.length)}</a>`; }).join("")}</div>
      <section class="panel"><div class="pb" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><b>Ensuite : approfondir ou passer à la pratique</b><div class="muted">Le cours complet reprend chaque sujet en détail ; les fiches montrent les vrais chiffres.</div></div><div style="display:flex;gap:16px;flex-wrap:wrap"><a class="more" href="/academie">Le cours complet →</a><a class="more" href="/entreprises">Les entreprises →</a></div></div></section>`;
    return;
  }
  const n = N.find(x => x.id === niv); if (!n) return pageNotFound();
  const ni = N.indexOf(n), mod = PAR_NIV_MODULE[n.id];
  const side = `<nav class="lexnav" style="display:flex;flex-direction:column;gap:2px">${n.lecons.map((l, i) => `<a href="${base}/${n.id}/${l.id}" style="${l.id === lec ? "font-weight:700;color:var(--ink)" : ""}">${st[n.id + "/" + l.id] ? "✓ " : `${i + 1}. `}${esc(l.titre)}</a>`).join("")}<a href="${base}/${n.id}/quiz" style="${lec === "quiz" ? "font-weight:700;color:var(--ink)" : ""}">Quiz${st["quiz/" + n.id] != null ? ` (${st["quiz/" + n.id]} / ${n.quiz.length})` : ""}</a></nav>`;
  const head = parCrumbs([["/academie", "L'Académie"], [base, "L'essentiel"], [lec ? `${base}/${n.id}` : null, n.titre]]);
  const aside = `<aside><section class="panel"><div class="ph"><h2>${esc(n.titre)}</h2></div><div class="pb">${side}</div></section></aside>`;
  if (!lec) { // une étape : la liste de ses leçons
    app.innerHTML = head + `<div class="cols"><div><p class="kick">Étape ${ni + 1} sur ${N.length}</p><h1 class="pagetitle">${esc(n.titre)}</h1><p class="pagesub">${esc(n.intro)}</p>
      <section class="panel">${n.lecons.map((l, i) => `<a class="acal" href="${base}/${n.id}/${l.id}"><span class="n ${st[n.id + "/" + l.id] ? "ok" : ""}">${st[n.id + "/" + l.id] ? "✓" : i + 1}</span><span><b>${esc(l.titre)}</b><small class="light">${esc(l.resume)}</small></span><span class="light acam">3 min</span></a>`).join("")}
        <a class="acal quiz" href="${base}/${n.id}/quiz"><span class="n">?</span><span><b>Le quiz de l'étape</b><small class="light">${n.quiz.length} questions, avec l'explication de chaque réponse</small></span><span class="light acam">${st["quiz/" + n.id] != null ? `${st["quiz/" + n.id]}/${n.quiz.length}` : ""}</span></a></section>
      ${mod ? `<div class="par-deep"><span>Pour aller plus loin sur ce sujet : le module complet de l'Académie.</span><a class="more" href="/academie/${mod}">Approfondir →</a></div>` : ""}</div>${aside}</div>`;
    return;
  }
  if (lec === "quiz") {
    let i = 0, score = 0, ans = null;
    const draw = () => {
      const q = n.quiz[i];
      $("#qz").innerHTML = i >= n.quiz.length ? `<p class="lead">Score : <b>${score} / ${n.quiz.length}</b>. ${score >= 5 ? "Les notions de cette étape sont acquises." : score >= 3 ? "Une ou deux notions méritent d'être relues." : "Relire les leçons de cette étape vous aidera avant de passer à la suite."}</p>
          <div style="display:flex;gap:16px;flex-wrap:wrap"><button type="button" class="btn" id="qre">Recommencer</button>${N[ni + 1] ? `<a class="more" href="${base}/${N[ni + 1].id}">Étape suivante : ${esc(N[ni + 1].titre)} →</a>` : `<a class="more" href="/academie">Approfondir avec le cours complet →</a>`}</div>`
        : `<p class="kick">Question ${i + 1} sur ${n.quiz.length}</p><p class="lead" style="margin-top:4px">${esc(q.q)}</p>
          <div class="qopts">${q.options.map((o, k) => `<button type="button" class="qopt${ans != null ? (k === q.bonne ? " ok" : k === ans ? " ko" : "") : ""}" data-k="${k}" ${ans != null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
          ${ans != null ? `<p class="${ans === q.bonne ? "up" : "down"}" style="font-weight:600;margin:12px 0 2px">${ans === q.bonne ? "Bonne réponse." : "Ce n'est pas la bonne réponse."}</p><p style="margin:0 0 12px">${esc(q.explication)}</p><button type="button" class="btn" id="qnx">${i + 1 < n.quiz.length ? "Question suivante" : "Voir le score"}</button>` : ""}`;
      $$(".qopt", $("#qz")).forEach(b => b.onclick = () => { ans = +b.dataset.k; if (ans === q.bonne) score++; draw(); });
      const nx = $("#qnx"); if (nx) nx.onclick = () => { i++; ans = null; if (i >= n.quiz.length) { const s2 = pState(); s2["quiz/" + n.id] = score; pSave(s2); } draw(); };
      const re = $("#qre"); if (re) re.onclick = () => { i = 0; score = 0; ans = null; draw(); };
    };
    app.innerHTML = head + `<div class="cols"><div><h1 class="pagetitle">Quiz : ${esc(n.titre)}</h1><section class="panel"><div class="pb" id="qz"></div></section></div>${aside}</div>`;
    draw(); return;
  }
  const L = n.lecons.find(l => l.id === lec); if (!L) return pageNotFound();
  const li = n.lecons.indexOf(L), nextL = n.lecons[li + 1], deep = PAR_APPROFONDIR[n.id + "/" + L.id];
  st[n.id + "/" + L.id] = 1; pSave(st);
  const deepL = deep && ACA ? (() => { const [m0, l0] = deep.split("/"), mm = ACA.modules.find(x => x.id === m0), ll = mm && mm.lecons.find(x => x.id === l0); return ll ? [mm, ll] : null; })() : null;
  setTitle(L.titre + " · L'essentiel");
  app.innerHTML = head + `<div class="cols"><div>
      <p class="kick">Étape ${ni + 1} · leçon ${li + 1} sur ${n.lecons.length} · 3 min</p><h1 class="pagetitle">${esc(L.titre)}</h1><p class="pagesub">${esc(L.resume)}</p>
      <section class="panel"><div class="pb" style="font-size:15.5px;line-height:1.65">${L.paragraphes.map(p => `<p>${esc(p)}</p>`).join("")}
        <div class="calc" style="display:block;margin:14px 0"><span class="kick">Exemple</span><p style="margin:4px 0 0;color:var(--ink)">${esc(L.exemple)}</p></div>
        <p class="kick" style="margin-top:16px">À retenir</p><ul style="margin:4px 0 0;padding-left:18px">${L.a_retenir.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        ${L.voir ? `<p style="margin:14px 0 0"><a class="more" href="${esc(L.voir)}">Voir sur le site →</a></p>` : ""}</div></section>
      ${deep ? `<div class="par-deep"><span>Approfondir dans le cours complet${deepL ? ` : <b>${esc(deepL[1].titre)}</b>` : ""}</span><a class="more" href="/academie/${deep}">Lire la leçon complète →</a></div>` : ""}
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px">${li > 0 ? `<a class="more" href="${base}/${n.id}/${n.lecons[li - 1].id}">← ${esc(n.lecons[li - 1].titre)}</a>` : "<span></span>"}${nextL ? `<a class="more" href="${base}/${n.id}/${nextL.id}">${esc(nextL.titre)} →</a>` : `<a class="more" href="${base}/${n.id}/quiz">Faire le quiz de l'étape →</a>`}</div>
    </div>${aside}</div>`;
  scrollTo(0, 0);
}

/* ---------- Outils : la page ne mélange plus outils et cours (enveloppe : le module « outils » garde la main sur la page) ---------- */
(function () {
  const outils0 = window.pageOutils;
  window.pageOutils = function (t) {
    const r = outils0.apply(this, arguments);
    if (!t) {
      $$('#app .cards a[href="/commencer"], #app .cards a[href="/debuter"], #app .cards a[href="/academie/express"]').forEach(a => a.remove());
      $$("#app .cards .tnum").forEach((n, i) => { n.textContent = String(i + 1).padStart(2, "0"); });
      if (!$("#parout")) app.insertAdjacentHTML("beforeend", `<section class="panel" id="parout" style="margin-top:16px"><div class="pb" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><b>Vous débutez ?</b><div class="muted">Le guide, les cours et le lexique sont réunis dans Apprendre.</div></div><a class="more" href="/apprendre">Apprendre →</a></div></section>`);
    }
    return r;
  };
})();

/* ---------- Liens et fils d'Ariane : les pages d'apprentissage se rattachent à « Apprendre » ---------- */
const PAR_CRUMB_PAGES = { "/commencer": "Par où commencer", "/lexique": "Le lexique", "/idees-recues": "Les idées reçues", "/livret-a-ou-bourse": "Livret A ou Bourse" };
function parLiens(root) {
  if (!root) return;
  $$('a[href^="/debuter"]', root).forEach(a => { const u = parRedirection(a.getAttribute("href").split(/[?#]/)[0].replace(/\/+$/, "")); if (!u) return; a.setAttribute("href", u);
    if (/Premiers pas|parcours Premiers/i.test(a.textContent)) a.textContent = a.textContent.replace(/Le parcours Premiers pas|Premiers pas, avec quiz|Premiers pas/i, "L'essentiel en 3 étapes"); });
  $$('.crumbs a[href="/lexique"]', root).forEach(a => { if (a.textContent.trim() === "Apprendre") a.setAttribute("href", "/apprendre"); });
  const p = location.pathname.replace(/\/+$/, ""), t = PAR_CRUMB_PAGES[p];
  if (t && root === app && app.firstElementChild && !app.querySelector(":scope > .crumbs") && !app.querySelector(".empty")) app.insertAdjacentHTML("afterbegin", parCrumbs([[null, t]]));
  if (/^\/academie\/./.test(p) && !/^\/academie\/express/.test(p)) { const c = app.querySelector(":scope > .crumbs"); if (c && !c.querySelector('a[href="/apprendre"]')) c.insertAdjacentHTML("afterbegin", `<a href="/apprendre">Apprendre</a> › `); }
}
const PAR_OBS = new MutationObserver(() => { PAR_OBS.disconnect(); try { parLiens(app); } finally { PAR_OBS.observe(app, { childList: true, subtree: true }); } });
if (typeof app !== "undefined" && app) PAR_OBS.observe(app, { childList: true, subtree: true });

ROUTES_EXTRA.push([/^\/apprendre$/, () => pageApprendre()]);
ROUTES_EXTRA.push([/^\/academie\/express\/([a-z0-9-]+)\/([a-z0-9-]+)$/, (n, l) => { setNav("aca"); parExpress(n, l); }]);
ROUTES_EXTRA.push([/^\/premiers-pas$/, () => { history.replaceState({}, "", "/academie/express"); parExpress(); }]);
ROUTES_EXTRA.push([/^\/espace\/rapport$/, () => pageEspace("rapport")]);

/* =====================================================================================================
   2. Le rapport de la semaine, sur mesure
   ===================================================================================================== */
const PAR_SECTEURS = { conso: "Consommation", industrie: "Industrie", energie: "Énergie", sante: "Santé", tech: "Technologie", finance: "Banque et assurance", telecom: "Télécoms et médias", materiaux: "Matériaux", services: "Services aux collectivités", immo: "Immobilier" };
const PAR_INDICES = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", sp500: "S&P 500", nasdaq100: "Nasdaq 100", dax: "DAX", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
const PAR_SUJETS = [["resultats", "Résultats", "Chiffre d'affaires, résultats, rapports annuels"], ["dividendes", "Dividendes", "Annonces et dates de détachement"], ["actualite", "Actualité", "Opérations, dirigeants, assemblées, presse"], ["lecons", "Leçons", "La leçon de l'Académie liée à votre semaine"]];
const PAR_JOURS = [[6, "Le samedi matin", "La semaine complète, dès le lendemain de la clôture"], [0, "Le dimanche matin", "Pour la lire au calme"], [1, "Le lundi matin", "Avant l'ouverture des marchés"]];
const PAR_JOUR_TXT = { 6: "le samedi matin", 0: "le dimanche matin", 1: "le lundi matin" };
const PAR_PLUSTARD = "bilan.rapport.plustard";
const PAR_DEFAUT = { v: 1, favoris: true, portefeuille: true, secteurs: [], indices: ["cac40", "stoxx50", "sp500", "nasdaq100", "dax", "ftse100", "nikkei"], detail: "complet", sujets: { resultats: true, dividendes: true, actualite: true, lecons: true }, jour: 6, notif: true, configure: false };
let PAR_RAPPORT = null, PAR_LAST = null;
async function parRapportCharger(force) {
  if (PAR_RAPPORT && !force) return PAR_RAPPORT;
  try { const r = await fetch("/api/espace/rapport", { credentials: "same-origin" }); const j = await r.json(); if (j && j.rapport) { PAR_RAPPORT = j; return j; } } catch (e) { }
  return PAR_RAPPORT = { rapport: { ...PAR_DEFAUT, sujets: { ...PAR_DEFAUT.sujets } }, max_secteurs: 2, premium: false, horsligne: true };
}
const parNbFav = () => { try { return favs().length; } catch (e) { return 0; } };
const parNbPf = () => { try { return (pf2Load().l || []).length; } catch (e) { return 0; } };
const parPl = (n, s, p) => `${n} ${n > 1 ? (p || s + "s") : s}`;
function parResume(R, n) {
  const nf = n ? n.fav : parNbFav(), np = n ? n.pf : parNbPf();
  const src = [R.favoris ? parPl(nf, "favori") : null, R.portefeuille ? (np ? `votre portefeuille (${parPl(np, "ligne")})` : "votre portefeuille (vide pour l'instant)") : null, R.secteurs.length ? `${R.secteurs.length > 1 ? "les secteurs" : "le secteur"} ${R.secteurs.map(s => PAR_SECTEURS[s]).join(", ")}` : null].filter(Boolean);
  const suj = PAR_SUJETS.filter(([k]) => R.sujets[k]).map(([, t]) => t.toLowerCase());
  return [
    ["Contenu", src.length ? src.join(", ") : "aucune source choisie"],
    ["Repères", R.indices.length ? R.indices.map(i => PAR_INDICES[i]).join(", ") : "aucun indice"],
    ["Lecture", R.detail === "court" ? "version courte, environ 1 minute" : "version complète, avec le commentaire de l'IA"],
    ["Sujets", suj.length ? suj.join(", ") : "variations seulement"],
    ["Réception", `${PAR_JOUR_TXT[R.jour]}${R.notif ? ", avec une notification" : ", sans notification"}`],
  ];
}
function parResumeHTML(R) { return `<ul>${parResume(R).map(([k, v]) => `<li><i>✓</i><span><b>${k}</b> : ${esc(v)}</span></li>`).join("")}</ul>`; }
function parResumeCourt(R, n) { const r = parResume(R, n); return `${r[0][1]} · ${r[2][1]} · ${r[4][1]}`; }

// Les trois groupes de réglages (assistant : un par étape ; onglet « Mon rapport » : les trois)
function parGroupe(i, R, max) {
  const chk = (name, val, on, b, s, dis) => `<label class="par-opt${dis ? " off" : ""}"><input type="checkbox" name="${name}" value="${val}"${on ? " checked" : ""}${dis ? " disabled" : ""}><span><b>${b}</b><span>${s}</span></span></label>`;
  const rad = (name, val, on, b, s) => `<label class="par-opt"><input type="radio" name="${name}" value="${val}"${on ? " checked" : ""}><span><b>${b}</b><span>${s}</span></span></label>`;
  if (i === 0) return `<fieldset class="par-grp"><legend>Ce que suit le rapport</legend><div class="par-opts">
      ${chk("src", "favoris", R.favoris, "Mes favoris", parNbFav() ? `${parPl(parNbFav(), "entreprise ou ETF", "entreprises ou ETF")} aujourd'hui` : "Ajoutez-en avec « ☆ » sur chaque fiche")}
      ${chk("src", "portefeuille", R.portefeuille, "Mon portefeuille", parNbPf() ? `${parPl(parNbPf(), "ligne")}, avec le gain ou la perte en euros` : "Vide pour l'instant : ajoutez vos lignes dans Portefeuille")}</div></fieldset>
    <fieldset class="par-grp"><legend>Les secteurs que je suis</legend><p class="hint">La variation médiane de la semaine de toutes les entreprises du secteur suivies par le site, les plus fortes hausses et baisses. ${max >= 6 ? "Jusqu'à 6 secteurs." : `Jusqu'à ${max} secteurs, 6 avec <a class="lnk" href="/premium">Premium</a>.`}</p>
      <div class="par-chips">${Object.entries(PAR_SECTEURS).map(([k, t]) => `<label><input type="checkbox" name="sect" value="${k}"${R.secteurs.includes(k) ? " checked" : ""}>${t}</label>`).join("")}</div></fieldset>
    <fieldset class="par-grp"><legend>Les indices de repère</legend><p class="hint">Pour situer la semaine de vos valeurs.</p>
      <div class="par-chips">${Object.entries(PAR_INDICES).map(([k, t]) => `<label><input type="checkbox" name="idx" value="${k}"${R.indices.includes(k) ? " checked" : ""}>${t}</label>`).join("")}</div></fieldset>`;
  if (i === 1) return `<fieldset class="par-grp"><legend>Niveau de détail</legend><div class="par-opts">
      ${rad("detail", "court", R.detail === "court", "Court, environ 1 minute", "L'essentiel en trois phrases, les chiffres clés, trois actualités et trois dates.")}
      ${rad("detail", "complet", R.detail !== "court", "Complet, 2 à 3 minutes", "Tout, avec le commentaire rédigé par l'IA et ce que la semaine change, ligne par ligne.")}</div></fieldset>
    <fieldset class="par-grp"><legend>Les sujets qui m'intéressent</legend><p class="hint">Les variations de cours sont toujours là. Décochez ce que vous ne voulez pas lire.</p><div class="par-opts">
      ${PAR_SUJETS.map(([k, t, s]) => chk("suj", k, R.sujets[k], t, s)).join("")}</div></fieldset>`;
  return `<fieldset class="par-grp"><legend>Le jour où il est prêt</legend><div class="par-opts">
      ${PAR_JOURS.map(([v, t, s]) => rad("jour", v, R.jour === v, t, s)).join("")}</div></fieldset>
    <fieldset class="par-grp"><legend>Être prévenu</legend><div class="par-opts">
      ${chk("notif", "1", R.notif, "Une alerte quand il est prêt", "Dans vos alertes, et sur votre téléphone ou ordinateur si les notifications y sont activées.")}</div></fieldset>
    <div id="parpush"></div>`;
}
const PAR_TITRES = [["Que doit contenir votre rapport ?", "Choisissez ce que vous voulez suivre chaque semaine."], ["Que voulez-vous y lire ?", "La longueur et les sujets, selon le temps que vous avez."], ["Quand le recevoir ?", "Il se prépare tout seul ; vous choisissez le moment."]];
function parLire(form, R) { // lit les champs présents dans le formulaire (les autres gardent leur valeur)
  const x = { ...R, sujets: { ...R.sujets } }, has = n => form.querySelector(`[name="${n}"]`), vals = n => $$(`[name="${n}"]:checked`, form).map(i => i.value);
  if (has("src")) { const s = vals("src"); x.favoris = s.includes("favoris"); x.portefeuille = s.includes("portefeuille"); }
  if (has("sect")) x.secteurs = vals("sect");
  if (has("idx")) x.indices = vals("idx");
  if (has("detail")) x.detail = (vals("detail")[0] || "complet");
  if (has("suj")) { const s = vals("suj"); PAR_SUJETS.forEach(([k]) => x.sujets[k] = s.includes(k)); }
  if (has("jour")) x.jour = +(vals("jour")[0] ?? 6);
  if (has("notif")) x.notif = vals("notif").length > 0;
  return x;
}
function parLimiteSecteurs(form, max) {
  const boxes = $$('[name="sect"]', form); if (!boxes.length) return;
  const n = boxes.filter(b => b.checked).length;
  boxes.forEach(b => { b.disabled = !b.checked && n >= max; b.closest("label").classList.toggle("off", b.disabled); });
}
async function parEnregistrer(R, msgEl) {
  if (!R.favoris && !R.portefeuille && !R.secteurs.length) { if (msgEl) { msgEl.className = "par-msg err"; msgEl.textContent = "Choisissez au moins une source : vos favoris, votre portefeuille ou un secteur."; } return null; }
  const { v, favoris, portefeuille, secteurs, indices, detail, sujets, jour, notif } = R;
  const r = await post2("/api/espace/rapport", { v, favoris, portefeuille, secteurs, indices, detail, sujets, jour, notif, configure: true });
  if (r.error || !r.rapport) { if (msgEl) { msgEl.className = "par-msg err"; msgEl.textContent = r.error || "Enregistrement impossible pour le moment. Réessayez dans un instant."; } return null; }
  PAR_RAPPORT = { ...PAR_RAPPORT, ...r }; PAR_LAST = null;
  if (msgEl) { msgEl.className = "par-msg"; msgEl.textContent = r.limite || "Enregistré. Votre rapport suit ces réglages dès maintenant."; }
  return r;
}
function parPush(el) { if (el && typeof pwaPanneauPush === "function") { try { pwaPanneauPush(el); } catch (e) { } } }

/* ---------- Assistant en 3 étapes (premier passage dans Mon espace) ---------- */
function parAssistant(el, m, J, fin) {
  let i = 0, R = { ...J.rapport, sujets: { ...J.rapport.sujets } };
  const max = J.max_secteurs || 2;
  const draw = () => {
    el.innerHTML = `<div class="par-wiz"><form class="par-card" id="parwf" novalidate><p class="kick">Votre rapport sur mesure · étape ${i + 1} sur 3</p><h2>${PAR_TITRES[i][0]}</h2><p class="muted">${PAR_TITRES[i][1]}</p>
        <div class="par-dots" aria-hidden="true">${[0, 1, 2].map(k => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div><div style="height:14px"></div>
        ${parGroupe(i, R, max)}
        <div class="par-act">${i ? `<button type="button" class="btn ghost" id="parprev">Retour</button>` : `<button type="button" class="linkbtn" id="parlater">Plus tard</button>`}<span class="sp"></span><button class="btn" id="parnext">${i < 2 ? "Continuer" : "Créer mon rapport"}</button></div>
        <p class="par-msg" id="parmsg" aria-live="polite"></p></form>
      <aside class="par-card par-sum"><p class="kick">Votre rapport</p><div id="parsum">${parResumeHTML(R)}</div><p class="note" style="margin:10px 0 0">Modifiable à tout moment dans l'onglet « Mon rapport ». Information factuelle, sans conseil d'investissement.</p></aside></div>`;
    const f = $("#parwf");
    parLimiteSecteurs(f, max);
    f.onchange = () => { R = parLire(f, R); parLimiteSecteurs(f, max); $("#parsum").innerHTML = parResumeHTML(R); };
    const pv = $("#parprev"); if (pv) pv.onclick = () => { R = parLire(f, R); i--; draw(); };
    const lt = $("#parlater"); if (lt) lt.onclick = () => { parSet(PAR_PLUSTARD, String(Date.now())); fin(); };
    f.onsubmit = async e => { e.preventDefault(); R = parLire(f, R);
      if (i === 0 && !R.favoris && !R.portefeuille && !R.secteurs.length) { $("#parmsg").className = "par-msg err"; $("#parmsg").textContent = "Choisissez au moins une source : vos favoris, votre portefeuille ou un secteur."; return; }
      if (i < 2) { i++; draw(); el.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
      const b = $("#parnext"); b.disabled = true; b.textContent = "Enregistrement…";
      const r = await parEnregistrer(R, $("#parmsg")); if (!r) { b.disabled = false; b.textContent = "Créer mon rapport"; return; }
      toast("Votre rapport sur mesure est prêt."); fin(); };
    if (i === 2) parPush($("#parpush"));
  };
  draw();
}

/* ---------- Onglet « Mon rapport » ---------- */
async function parOngletRapport(el, m) {
  el.innerHTML = `<div class="empty">Chargement de vos réglages…</div>`;
  const J = await parRapportCharger(true); let R = { ...J.rapport, sujets: { ...J.rapport.sujets } }; const max = J.max_secteurs || 2;
  el.innerHTML = `<div class="par-wiz"><form class="par-card" id="parrf" novalidate><p class="kick">Mon rapport de la semaine</p><h2>Réglez votre rapport sur mesure</h2><p class="muted">Il se construit chaque semaine avec ces réglages, à partir des cours, des comptes et des annonces officielles.</p>
      ${[0, 1, 2].map(k => `<h3 class="subh" style="margin:16px 0 8px">${k + 1}. ${PAR_TITRES[k][0]}</h3>${parGroupe(k, R, max)}`).join("")}
      <div class="par-act"><button class="btn" id="parsave">Enregistrer</button><a class="more" href="/espace">Voir ma semaine →</a></div><p class="par-msg" id="parmsg" aria-live="polite"></p></form>
    <aside class="par-card par-sum"><p class="kick">En résumé</p><div id="parsum">${parResumeHTML(R)}</div>${J.premium ? "" : `<p class="note" style="margin:10px 0 0">Avec Premium : 6 secteurs suivis, 12 semaines d'historique et l'analyse de toutes vos lignes. <a class="lnk" href="/premium">Voir Premium</a></p>`}</aside></div>`;
  const f = $("#parrf"); parLimiteSecteurs(f, max);
  f.onchange = () => { R = parLire(f, R); parLimiteSecteurs(f, max); $("#parsum").innerHTML = parResumeHTML(R); $("#parmsg").textContent = ""; };
  f.onsubmit = async e => { e.preventDefault(); R = parLire(f, R); const b = $("#parsave"); b.disabled = true; const r = await parEnregistrer(R, $("#parmsg")); b.disabled = false; if (r) toast("Réglages enregistrés."); };
  parPush($("#parpush"));
}

/* ---------- Ce que la synthèse affiche selon les réglages ---------- */
function parSecteursHTML(b) {
  const S = (b.secteurs || []).filter(s => s && s.nom); if (!S.length) return "";
  const lig = x => `<a href="${synLien(x.k)}"><span>${esc(x.nom)}</span><b class="${synCls(x.variation_semaine_pct)}">${synPct(x.variation_semaine_pct)}</b></a>`;
  return `<section class="panel synsec" id="synsect"><div class="ph"><h2>Les secteurs que vous suivez</h2><a href="/espace/rapport">Modifier</a></div><div class="pb"><div class="par-sects">${S.map(s => {
    const t = s.n || 0, h = t ? Math.round(s.hausses / t * 100) : 0, ba = t ? Math.round(s.baisses / t * 100) : 0;
    return `<div class="par-sect"><h3><a class="lnk" href="/entreprises?secteur=${esc(s.id)}">${esc(s.nom)}</a>${s.mediane_pct != null ? `<b class="${synCls(s.mediane_pct)}">${synPct(s.mediane_pct)}</b>` : `<span class="muted" style="font-size:13px">cours indisponibles</span>`}</h3>
      ${t ? `<p class="meta">${t > 1 ? "Variation médiane de la semaine" : "Variation de la semaine"} · ${parPl(t, "entreprise suivie", "entreprises suivies")} par le site · ${s.hausses} en hausse, ${s.baisses} en baisse</p>
      <div class="par-split" role="img" aria-label="${s.hausses} en hausse, ${s.baisses} en baisse"><i style="width:${h}%;background:var(--up,#0E6B4A)"></i><i style="width:${100 - h - ba}%;background:var(--line)"></i><i style="width:${ba}%;background:var(--down,#B4531A)"></i></div>
      <div class="two2"><div><p>En tête</p>${(s.premieres || []).map(lig).join("")}</div>${(s.dernieres || []).length ? `<div><p>En queue</p>${s.dernieres.map(lig).join("")}</div>` : ""}</div>
      ${(s.vos_lignes || []).length ? `<p class="meta" style="margin:8px 0 0">Vos valeurs du secteur : ${s.vos_lignes.map(x => `${esc(x.nom)} ${x.variation_semaine_pct != null ? synPct(x.variation_semaine_pct) : ""}`).join(" · ")}</p>` : ""}` : `<p class="meta">Pas encore de cours de clôture pour ce secteur cette semaine.</p>`}</div>`; }).join("")}</div>
    <p class="synfoot">La médiane : la moitié des entreprises du secteur a fait mieux, l'autre moitié moins bien. Variation entre la clôture précédant la semaine et le dernier cours connu, dans la devise de cotation. Source des cours : Google Finance.</p></div></section>`;
}
function parLeconHTML(b) {
  if (typeof synLecon !== "function") return "";
  const a0 = (b.annonces || [])[0], L = (b.lignes || []).filter(l => l.variation_semaine_pct != null), fort = L.slice().sort((x, y) => Math.abs(y.variation_semaine_pct) - Math.abs(x.variation_semaine_pct))[0];
  const code = a0 && SYN_LECONS[a0.categorie] ? a0.categorie : fort && Math.abs(fort.variation_semaine_pct) >= 5 ? (fort.variation_semaine_pct < 0 ? "baisse" : "hausse") : (b.secteurs || []).length ? "mediane" : "indice";
  const l = synLecon(code); if (!l) return "";
  const pourquoi = { resultats: "Une de vos valeurs a publié ses résultats cette semaine.", ca: "Une de vos valeurs a publié son chiffre d'affaires.", dividende: "Un dividende a été annoncé dans votre liste.", ag: "Une assemblée générale est à l'ordre du jour.", baisse: "Une de vos valeurs a nettement baissé.", hausse: "Une de vos valeurs a nettement monté.", mediane: "Votre rapport compare des secteurs entiers.", indice: "Votre rapport compare vos valeurs aux indices." }[code] || "";
  return `<section class="panel synsec" id="synlec"><div class="ph"><h2>La leçon de la semaine</h2><a href="/academie">L'Académie</a></div><div class="pb par-lec"><p><b>${esc(l.titre)}</b><br><span class="muted">${esc(pourquoi)} Cinq minutes pour comprendre ce qui se passe.</span></p><a class="btn ghost" href="${l.href}">Lire la leçon</a></div></section>`;
}
function parAppliquer(el, b, J) {
  const R = (b && b.reglages) || (J && J.rapport) || PAR_DEFAUT, S = R.sujets || PAR_DEFAUT.sujets;
  const L = (b && b.lignes) || [], n = { fav: L.filter(l => l.favori).length, pf: L.filter(l => l.en_portefeuille).length }, jour = R.jour != null ? R.jour : 6;
  el.insertAdjacentHTML("afterbegin", `<div class="par-bar"><span><b>Votre rapport sur mesure</b> · ${esc(parResumeCourt({ ...PAR_DEFAUT, ...R, sujets: S, notif: J && J.rapport ? J.rapport.notif : true }, n))}</span><a class="more" href="/espace/rapport">Modifier mon rapport →</a></div>`);
  $$(".synnav a, .synnav button", el).forEach(x => { if (x.children.length === 0 && /chaque samedi/.test(x.textContent)) x.textContent = x.textContent.replace("chaque samedi", PAR_JOUR_TXT[jour]); });
  const sv = el.querySelector("#synvar"), sect = parSecteursHTML(b);
  if (sect) { if (sv) sv.insertAdjacentHTML("afterend", sect); const nav = el.querySelector(".synnav"); if (nav && !nav.querySelector('[data-synjump="synsect"]')) { const a = nav.querySelector('[data-synjump="synact"]'); if (a) a.insertAdjacentHTML("beforebegin", `<a href="#synsect" data-synjump="synsect">Secteurs</a>`); } }
  if (!S.lecons) $$(".synnav a[href^='/academie/']", el).forEach(a => a.remove());
  else { const lec = parLeconHTML(b), si = el.querySelector("#synint"); if (lec && si) si.insertAdjacentHTML("afterend", lec); }
  if (R.detail === "court") {
    const si = el.querySelector("#synint");
    if (si) { si.classList.add("par-hidden"); const j = el.querySelector('[data-synjump="synint"]'); if (j) j.remove();
      si.insertAdjacentHTML("beforebegin", `<section class="panel" id="parcourt"><div class="pb par-lec"><p><b>Version courte</b><br><span class="muted">Le détail ligne par ligne et le commentaire rédigé sont masqués.</span></p><button type="button" class="btn ghost" id="parplus">Afficher l'analyse complète</button></div></section>`);
      const pb = el.querySelector("#parplus"); if (pb) pb.onclick = () => { si.classList.remove("par-hidden"); el.querySelector("#parcourt").remove(); si.scrollIntoView({ behavior: "smooth", block: "start" }); }; }
  }
}
// Rapport des seuls secteurs (sans favoris ni portefeuille) : la synthèse de m/synthese.js n'a pas de ligne à montrer
function parSecteursSeuls(el, b) {
  const ess = typeof synEssentiel === "function" ? synEssentiel(b) : (b.essentiel || []);
  el.innerHTML = `<section class="synhero"><p class="kick"><span>Votre semaine en 2 minutes</span></p><h2>Semaine ${esc(String(b.semaine || "").replace(/^\d{4}-W/, ""))}${b.du && typeof synDuAu === "function" ? `, ${esc(synDuAu(b))}` : ""}</h2>
      ${ess.length ? `<ol class="synk">${ess.map(p => `<li>${synInsec(p)}</li>`).join("")}</ol>` : ""}</section>
    <div id="synvar"></div>
    ${b.texte && typeof synTexte === "function" ? `<section class="panel synsec" id="synint"><div class="ph"><h2>Le commentaire de la semaine</h2></div><div class="pb">${synTexte(b)}</div></section>` : ""}
    <section class="panel"><div class="pb par-lec"><p><b>Suivez aussi des entreprises précises</b><br><span class="muted">Ajoutez des favoris ou votre portefeuille à votre rapport pour lire leurs variations, leurs annonces et leurs dates.</span></p><a class="btn ghost" href="/espace/rapport">Modifier mon rapport</a></div></section>`;
}

/* ---------- Enveloppes des fonctions de m/synthese.js ---------- */
(function () {
  const charger0 = window.synCharger;
  if (typeof charger0 === "function") window.synCharger = async function (qs) { const b = await charger0(qs); if (b && !b.error) PAR_LAST = b; return b; };
  const bilan0 = window.espaceBilan;
  window.espaceBilan = async function (el, m) {
    const sem = new URLSearchParams(location.search).get("semaine");
    const J = await parRapportCharger();
    if (!sem && !J.horsligne && !J.rapport.configure && !parGet(PAR_PLUSTARD)) return parAssistant(el, m, J, () => window.espaceBilan(el, m));
    PAR_LAST = null;
    await bilan0(el, m);
    const b = PAR_LAST; if (!b || !el.isConnected) return;
    if (!(b.lignes || []).length && (b.secteurs || []).some(s => s.n)) { parSecteursSeuls(el, b); parAppliquer(el, b, J); return; }
    if (el.querySelector("#synvar")) parAppliquer(el, b, J);
    else if (!J.rapport.configure) el.insertAdjacentHTML("beforeend", `<div class="par-bar" style="margin-top:12px"><span><b>Votre rapport sur mesure</b> · choisissez ce qu'il suit : favoris, portefeuille ou secteurs entiers.</span><a class="more" href="/espace/rapport">Régler mon rapport →</a></div>`);
  };
  const espace0 = window.pageEspace;
  window.pageEspace = async function (onglet) {
    await espace0(onglet === "rapport" ? "reglages" : onglet);
    const nav = $(".esptabs"); if (!nav) return; // pas connecté : page de connexion
    if (!nav.querySelector('a[href="/espace/rapport"]')) { const a = nav.querySelector('a[href="/espace/bilan"], a[href="/espace"]') || nav.firstElementChild; if (a) a.insertAdjacentHTML("afterend", `<a href="/espace/rapport">Mon rapport</a>`); }
    if (onglet === "rapport") { setTitle("Mon rapport · Mon espace"); $$("a", nav).forEach(a => a.classList.toggle("on", a.getAttribute("href") === "/espace/rapport")); parOngletRapport($("#espb"), MOI); }
  };
  const accueil0 = window.synAccueil;
  if (typeof accueil0 === "function") window.synAccueil = async function (el, m) {
    await accueil0(el, m); const nav = el.querySelector(".synnav");
    if (nav) nav.insertAdjacentHTML("beforeend", `<a href="/espace/rapport">Régler mon rapport</a>`);
  };
})();

/* ---------- Accueil des visiteurs : un vrai rapport d'exemple et l'invitation à créer le sien ---------- */
let PAR_CS = undefined;
async function parCoursSemaine() { if (PAR_CS !== undefined) return PAR_CS; try { const r = await fetch("/data/cours-semaine.json"); PAR_CS = r.ok ? await r.json() : null; } catch (e) { PAR_CS = null; } if (PAR_CS && !(Array.isArray(PAR_CS.dates) && PAR_CS.items)) PAR_CS = null; return PAR_CS; }
const PAR_DEMO = ["lvmh", "totalenergies", "air-liquide"], PAR_DEMO_SECT = "energie";
function parVar5(cs, k) { // variation sur les 5 dernières séances connues
  const s = cs.items[k]; if (!s) return null; const pts = s.map((v, i) => [cs.dates[i], v]).filter(([, v]) => v > 0).slice(-6);
  if (pts.length < 2) return null; const pct = (pts[pts.length - 1][1] / pts[0][1] - 1) * 100; return Math.abs(pct) > 80 ? null : { pct: Math.round(pct * 100) / 100, serie: pts.map(p => p[1]), du: pts[0][0], au: pts[pts.length - 1][0] };
}
async function parDemoHTML() {
  const cs = await parCoursSemaine(), cos = PAR_DEMO.map(id => RBY[id]).filter(Boolean);
  const dl = d => { try { return dLabel(d); } catch (e) { return d; } };
  if (cs) {
    const rows = cos.map(c => [c, parVar5(cs, "c:" + c.id)]).filter(([, v]) => v);
    const sec = R.companies.filter(c => c.sector === PAR_DEMO_SECT).map(c => parVar5(cs, "c:" + c.id)).filter(Boolean).map(v => v.pct).sort((a, b) => a - b);
    const med = sec.length ? (sec.length % 2 ? sec[sec.length >> 1] : (sec[sec.length / 2 - 1] + sec[sec.length / 2]) / 2) : null;
    if (rows.length >= 2) {
      const du = rows[0][1].du, au = rows[0][1].au;
      return `<div class="par-demo"><span class="tag">Exemple réel</span><p class="kick">Aperçu d'un rapport</p><h3>Trois favoris et un secteur suivi</h3>
        ${rows.map(([c, v]) => `<a class="row" href="/entreprise/${c.id}" style="text-decoration:none;color:inherit">${logo(c, 26)}<span>${esc(c.name)}</span>${typeof synSpark === "function" ? synSpark(v.serie, 76, 24, "Cours de " + c.name) : ""}<b class="${synCls(v.pct)}">${synPct(v.pct)}</b></a>`).join("")}
        ${med != null ? `<div class="sec"><b>Secteur ${esc(PAR_SECTEURS[PAR_DEMO_SECT])}</b> : <b class="${synCls(med)}">${synPct(med)}</b> en médiane, sur ${sec.length} entreprises suivies par le site.</div>` : ""}
        <p class="psrc">Calculé avec les cours de clôture du ${esc(dl(du))} au ${esc(dl(au))} (Google Finance). Votre rapport ajoute les annonces officielles, les dates à venir et ce que cela change.</p></div>`;
    }
  }
  return `<div class="par-demo"><span class="tag">Aperçu</span><p class="kick">Votre rapport de la semaine</p><h3>Ce que vous y lirez</h3>
    ${[["Variations", "Vos favoris et votre portefeuille, comparés aux indices"], ["Secteurs", "La médiane de la semaine des secteurs que vous suivez"], ["Actualités", "Résultats, dividendes, annonces officielles, expliqués"], ["À venir", "Les dates des deux prochaines semaines"]].map(([t, d]) => `<p class="prow" style="margin:0;padding:7px 0;border-top:1px solid var(--line2,#EFEAE0);font-size:14px"><b>${t}</b> · <span class="muted">${d}</span></p>`).join("")}
    <p class="psrc">Toutes les données viennent des documents officiels et des cours de clôture, avec leurs sources.</p></div>`;
}
async function parAccueilVisiteur(el) {
  el.innerHTML = `<div class="par-home"><div class="par-demo"><p class="kick">Aperçu d'un rapport</p><span class="ph0" style="width:60%"></span><span class="ph0" style="width:90%;margin-top:10px"></span><span class="ph0" style="width:75%;margin-top:10px"></span></div>${parPitchHTML()}</div>`;
  const demo = await parDemoHTML(); if (!el.isConnected) return;
  const d = el.querySelector(".par-demo"); if (d) d.outerHTML = demo;
}
function parPitchHTML() {
  return `<div class="par-pitch"><p class="kick" style="color:#C9C4BA;margin:0">Gratuit · avec votre espace</p><h3>Créez votre rapport sur mesure</h3>
    <ul><li>Vos favoris, votre portefeuille et les secteurs que vous voulez suivre</li><li>Court (1 minute) ou complet, avec le commentaire de l'IA</li><li>Résultats, dividendes, actualité, leçons : vous choisissez les sujets</li><li>Prêt le samedi, le dimanche ou le lundi matin, avec une notification</li></ul>
    <a class="btn" href="/espace">Créer mon rapport</a><small>Trois questions pour le régler. Information factuelle, sans conseil d'investissement.</small></div>`;
}
(function () {
  const home0 = window.pageHome;
  window.pageHome = async function () {
    await home0.apply(this, arguments);
    const band = $("#homeesp") && $("#homeesp").closest(".band");
    const b3 = $$(".band").find(x => x.querySelector('.bandh a[href="/commencer"]'));
    if (b3) { const a = b3.querySelector('.bandh a[href="/commencer"]'); a.setAttribute("href", "/apprendre"); a.textContent = "Tout pour apprendre →"; }
    const m = await moi(); const el = $("#homeesp"); if (!el || m.connecte) return;
    if (band) { const h = band.querySelector(".bandh h2"); if (h) h.textContent = "Votre rapport de la semaine, sur mesure"; const l = band.querySelector(".bandh a.more"); if (l) l.textContent = "Créer mon rapport →"; }
    parAccueilVisiteur(el);
  };
})();

/* ---------- Premium : la personnalisation dans le tableau (prix inchangés) ---------- */
(function () {
  const prem0 = window.pagePremium;
  window.pagePremium = async function (sub) {
    await prem0.apply(this, arguments);
    if (sub === "merci") return;
    const tb = $(".ptab tbody"); if (!tb || tb.querySelector(".par-row")) return;
    const ref = [...tb.rows].find(r => /Bilan de la semaine/i.test(r.cells[0] && r.cells[0].textContent)) || tb.rows[2];
    const rows = [["Rapport de la semaine sur mesure : contenu, détail, sujets, jour de réception", "Oui", "Oui"], ["Secteurs entiers suivis dans le rapport", "2", "6"], ["Lignes analysées en détail dans le rapport", "3", "8"]];
    const html = rows.map(r => `<tr class="par-row">${r.map((c, i) => i === 2 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`).join("")}</tr>`).join("");
    if (ref) ref.insertAdjacentHTML("afterend", html); else tb.insertAdjacentHTML("beforeend", html);
    const offers = $(".offers"); if (offers && !$("#parprem")) offers.insertAdjacentHTML("afterend", `<section class="panel" id="parprem"><div class="pb par-lec"><p><b>Votre rapport de la semaine, sur mesure</b><br><span class="muted">Gratuit pour tous : vos favoris, votre portefeuille, deux secteurs, le niveau de détail, les sujets et le jour. Premium suit jusqu'à six secteurs, analyse huit lignes en détail et garde douze semaines d'historique.</span></p><a class="btn ghost" href="/espace/rapport">Régler mon rapport</a></div></section>`);
  };
})();
