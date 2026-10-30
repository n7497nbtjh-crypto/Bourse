// bilan. : site statique + pages indexables (Cloudflare Pages, mode _worker.js).
// Le Worker renvoie index.html pour chaque page du site, avec le titre et la description propres à la page
// (Google lit ainsi un vrai titre pour chaque entreprise). Le reste (données, scripts) est servi tel quel.
// Plus tard : routes /api/* pour interroger le fournisseur de données. Sa clé (DATA_API_KEY) sera saisie
// par Romain dans Cloudflare > Variables et secrets, jamais dans le code.
import U, { SECTEURS } from "./index.gen.mjs";
const INDEX = U.map(c => ({ id: c.id, name: c.name, sector: SECTEURS[c.sector], desc: c.desc || "" })); // fiches non incluses
import amf from "./amf.mjs";
import communaute from "./communaute.mjs";
import presse from "./presse.mjs";
import { cours } from "./cours.mjs";
import { veille } from "./veille.mjs";
import { premium } from "./compte.mjs";
import { espace, rapportExemple } from "./espace.mjs";
import { signaler } from "./signaler.mjs";
import { push, pousser } from "./push.mjs";
import { mcp } from "./mcp.mjs";
import { tete, VERSION, SECURITE } from "./pwa.mjs";
import { etfMeta } from "./etf_meta.mjs";
import { iaSite } from "./iasite.mjs";

const SITE = "bilan.";
const BASE_DESC = "Les chiffres clés des entreprises cotées, expliqués simplement, et des simulateurs pour comprendre l'investissement. Informations factuelles, sans conseil.";
const TOOLS = { epargne: "Simulateur d'épargne", interets: "Simulateur d'épargne", frais: "Frais des courtiers", "pea-cto": "Simulateur PEA ou compte-titres" };
const BY = Object.fromEntries(INDEX.map(c => [c.id, c]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function meta(path, q = null) {
  const p = path.replace(/\/+$/, "") || "/";
  const base = p.replace(/^(\/entreprise\/[a-z0-9-]+)\/(comptes|actualite|agenda|communaute|comprendre\/[a-z0-9-]+)$/, "$1");
  let m;
  if (p === "/" || p === "/aller") return { title: `${SITE} · La Bourse, comptes à l'appui`, desc: BASE_DESC };
  if ((m = base.match(/^\/entreprise\/([a-z0-9-]+)$/))) {
    const c = BY[m[1]];
    if (!c) return null;
    return { title: `${c.name} : cours, comptes et actualité · ${SITE}`, desc: `${c.name} (${c.sector}). ${c.desc} Cours de l'action, chiffre d'affaires, marge, résultat, dette et dividende tirés des rapports annuels, publications officielles AMF. Chaque chiffre est expliqué.` };
  }
  if ((m = p.match(/^\/simulateurs(?:\/([a-z-]+))?$/))) {
    const t = TOOLS[m[1] || "epargne"] || TOOLS.epargne;
    if (!t) return null;
    return { title: `${t} · ${SITE}`, desc: "Simulateur d'épargne : versements mensuels, frais réels du courtier et du fonds, impôt PEA ou compte-titres 2026, trois scénarios tirés de l'histoire. Hypothèses et limites affichées, sans conseil." };
  }
  if (p === "/entreprises") return { title: `Les entreprises · ${SITE}`, desc: "Les grandes entreprises de France, d'Europe et des États-Unis : ce qu'elles font, leurs comptes et leurs points forts et faibles, expliqués simplement." };
  if (p === "/actualites") return { title: `Actualité des entreprises · ${SITE}`, desc: "Résultats, dividendes, acquisitions et changements de dirigeants des entreprises suivies en France, en Europe et aux États-Unis : annonces officielles classées, chiffrées et expliquées, et titres de la presse." };
  if (p === "/agenda") return { title: `Agenda financier · ${SITE}`, desc: "Dates des résultats, assemblées générales et dividendes des entreprises cotées, avec l'heure de publication quand la société l'annonce, et les chiffres publiés ces derniers jours." };
  if (p === "/hier") return { title: `Ce qui s'est passé hier : les résultats publiés · ${SITE}`, desc: "Les résultats publiés la veille par les entreprises suivies : chiffre d'affaires, résultat, prévisions de la direction et lecture calculée, d'après les communiqués officiels." };
  if (p === "/outils/recouvrement") return { title: `Mes ETF se recouvrent-ils ? · ${SITE}`, desc: "Positions communes et poids réellement en double entre 2 à 4 ETF, concentration du portefeuille combiné, secteurs, pays et devises, d'après les compositions officielles." };
  if (p === "/outils/si-javais") return { title: `Et si j'avais investi ? · ${SITE}`, desc: "Ce que serait devenue une somme placée il y a 1, 3 ou 5 ans dans une action ou un ETF, comparée à un indice, au Livret A et à la hausse des prix. Cours réels et sources affichées." };
  if (p === "/portefeuille") return { title: `Portefeuille · ${SITE}`, desc: "Suivez la performance réelle de vos placements ou entraînez-vous avec un portefeuille virtuel." };
  if (p === "/etf") return { title: `Les ETF expliqués · ${SITE}`, desc: "Les fonds indiciels les plus utilisés en France : ce qu'ils contiennent, leurs frais, leur éligibilité au PEA, leur composition par pays et par entreprise." };
  if (/^\/etf\/[a-z0-9-]+$/.test(p)) return { title: `ETF : composition, frais et explications · ${SITE}`, desc: "Ce que contient ce fonds indiciel, ses frais, sa composition par pays et ses principales lignes, expliqués simplement." };
  if (p === "/communaute") return { title: `Communauté · ${SITE}`, desc: "Analyses argumentées des visiteurs sur les entreprises et les ETF, avec les chiffres du site, questions de débutants et listes de suivi partagées. Aucun message n'est un conseil en investissement." };
  if (p === "/lexique") return { title: `Lexique · ${SITE}`, desc: "PER, rendement, marge, dette, volatilité : chaque chiffre de la Bourse expliqué simplement, avec ses limites." };
  if (p === "/espace" || p.startsWith("/espace/")) return { title: `Mon espace · ${SITE}`, desc: "Votre semaine en 2 minutes : variations, annonces et dates à venir de ce que vous suivez, vos alertes et vos listes, sur tous vos appareils." };
  if (p === "/favoris") return { title: `Mes favoris · ${SITE}`, desc: "Les entreprises et ETF que vous suivez : chiffres clés, prochaines dates et presse." };
  if (p === "/comparer") { // lien partagé : le titre nomme les entreprises comparées
    const cos = String((q && q.get("ids")) || "").split(",").map(id => BY[id]).filter(Boolean).slice(0, 5);
    if (cos.length >= 2) { const n = cos.map(c => c.name), l = n.slice(0, -1).join(", ") + " et " + n.at(-1);
      return { title: `${l} : la comparaison · ${SITE}`, desc: `${l} comparées critère par critère : taille, croissance, rentabilité, solidité financière, prix en Bourse et dividende, face à la médiane de leur secteur. Chiffres tirés des comptes officiels, sans conseil.` }; }
    return { title: `Comparer des entreprises · ${SITE}`, desc: "Le verdict d'abord, critère par critère : taille, croissance, rentabilité, solidité, prix en Bourse et dividende de plusieurs entreprises, face à la médiane de leur secteur." };
  }
  if (p === "/pea-cto") return { title: `PEA, compte-titres ou assurance-vie : lequel choisir · ${SITE}`, desc: "Ce qu'on peut acheter dans chaque compte, les plafonds et l'impôt sur les gains en 2026, avec un exemple chiffré." };
  if (p === "/dividendes") return { title: `Dividendes : calendrier, rendements et simulateur · ${SITE}`, desc: "Les prochaines dates de détachement et de paiement, les plus hauts rendements avec leur garde-fou, les dividendes relevés chaque année et ce que vous toucheriez en PEA ou compte-titres." };
  if (p === "/classements") return { title: `Classements des entreprises · ${SITE}`, desc: "Les entreprises qui cumulent le plus de points forts, restent en tête de leur secteur, augmentent leurs ventes ou relèvent leur dividende chaque année, calculées sur leurs comptes officiels." };
  if (p === "/decouvertes") return { title: `Découvertes du jour · ${SITE}`, desc: "Chaque jour, des petites et moyennes entreprises d'Europe et du monde, et des ETF éligibles au PEA : activité, chiffres, valorisation, catalyseurs et risques, sources à l'appui. Sans conseil d'achat." };
  if (p === "/rapport-exemple") return { title: `Un rapport de la semaine, en exemple · ${SITE}`, desc: "Le vrai rapport hebdomadaire de bilan., calculé avec les chiffres de cette semaine pour un profil fictif : variations, annonces, dates à venir, et ce que vous pouvez y régler." };
  if (p === "/repartitions") return { title: `Répartitions types et listes par critères · ${SITE}`, desc: "Des exemples de répartition entre actions, obligations et placements sans risque de perte, expliqués avec leurs limites, et des listes d'ETF et d'entreprises triées sur les critères que vous choisissez. Information pédagogique, pas un conseil." };
  if (p === "/plan") return { title: `Plan du site · ${SITE}`, desc: "Toutes les pages de bilan., rangées en quatre rubriques : Découvrir, Explorer, Analyser et Mon espace." };
  if (p === "/apprendre") return { title: `Apprendre la Bourse, dans l'ordre · ${SITE}`, desc: "Le chemin pour apprendre : par où commencer, les cours de l'Académie (l'essentiel en 3 étapes et le cours complet), le lexique et les outils pédagogiques, gratuits." };
  if (p.startsWith("/academie/express")) return { title: `L'essentiel en 3 étapes · L'Académie · ${SITE}`, desc: "La version courte de l'Académie : comprendre une action, lire les comptes d'une entreprise et juger son prix, en leçons de trois minutes avec quiz." };
  if (p.startsWith("/debuter")) return { title: `Premiers pas en Bourse · ${SITE}`, desc: "Un parcours en trois étapes pour comprendre les actions, lire les comptes d'une entreprise et juger son prix, avec des quiz." };
  if (p.startsWith("/outils")) return { title: `Outils · ${SITE}`, desc: "Radiographie de portefeuille, comparaison d'entreprises, recouvrement de deux ETF, simulateurs d'épargne et de frais." };
  const IDXN = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", dax: "DAX", sp500: "S&P 500", nasdaq100: "Nasdaq 100", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
  { const mi = p.match(/^\/indice\/([a-z0-9]+)$/); if (mi && IDXN[mi[1]]) return { title: `${IDXN[mi[1]]} : ce qu'il contient et comment y investir · ${SITE}`, desc: `Le ${IDXN[mi[1]]} expliqué simplement : sa règle de calcul, ses plus grandes entreprises, et les ETF qui le reproduisent, classés par frais.` }; }
  if (p === "/marches") return { title: `Les marchés aujourd'hui · ${SITE}`, desc: "Les grands indices et les plus fortes hausses et baisses du jour, expliquées." };
  if (p === "/idees-recues") return { title: `Les idées reçues sur la Bourse · ${SITE}`, desc: "« La Bourse, c'est un casino », « il faut beaucoup d'argent », « le Livret A suffit » : 12 idées reçues vérifiées avec des chiffres officiels et sourcés, et leurs nuances honnêtes." };
  if (p === "/livret-a-ou-bourse") return { title: `Livret A ou Bourse : 100 € par mois sur 10, 20 ou 30 ans · ${SITE}`, desc: "Ce qu'auraient donné 100 € par mois sur un Livret A ou en actions du monde entier, comparé à l'inflation. Chiffres historiques Banque de France, Insee et MSCI, année par année. Pas une promesse." };
  if (p === "/pourquoi-bilan") return { title: `Ce que bilan. fait que les autres ne font pas · ${SITE}`, desc: "Comptes officiels expliqués avec la médiane du secteur, IA qui calcule et cite ses sources, PEA et fiscalité française, liste noire AMF, sans publicité ni conseil. Avec un tableau comparatif honnête." };
  if (p === "/methode") return { title: `Méthode, sources et IA · ${SITE}`, desc: "D'où viennent les chiffres du site, comment ils sont jugés par rapport à la médiane du secteur, et les règles données à l'IA pour rester factuelle et sans biais." };
  if (p.startsWith("/academie")) return { title: `L'Académie : cours de culture financière · ${SITE}`, desc: "Des cours gratuits pour comprendre l'argent, la Bourse et les placements en France : épargne, PEA, ETF, comptes des entreprises, frais, fiscalité, pièges. Avec quiz et exemples chiffrés." };
  if (p === "/demander") return { title: `Demandez à bilan. : la recherche d'entreprises par l'IA · ${SITE}`, desc: "Décrivez ce que vous cherchez avec vos mots : l'IA le traduit en critères et les applique aux comptes de plus de 1 000 entreprises et 97 ETF. Sans conseil en investissement." };
  if (p.startsWith("/espace")) return { title: `Mon espace · ${SITE}`, desc: "Le bilan de la semaine de vos entreprises, commenté par l'IA, vos alertes, vos favoris et votre portefeuille sur tous vos appareils." };
  if (p === "/commencer") return { title: `Par où commencer en Bourse : le guide du nouvel investisseur · ${SITE}`, desc: "Épargne de précaution, horizon, choix du compte, diversification, frais, pièges à éviter : sept étapes dans l'ordre et un questionnaire pour trouver votre profil. Sans conseil personnalisé." };
  if (p === "/premium" || p === "/premium/merci") return { title: `Premium · ${SITE}`, desc: "Plus de questions à l'assistant IA, de résumés détaillés et de bilans rédigés, des alertes par e-mail sur vos entreprises. Le site reste gratuit pour l'essentiel." };
  if (p === "/espace/ia") return { title: `Mon IA · ${SITE}`, desc: "Les réponses calculées du site, gratuites et sans limite, et l'IA du site pour les questions libres : gratuite, sans compte ni clé." };
  if (p === "/connecteur") return { title: `Utiliser bilan. dans ChatGPT ou Claude · ${SITE}`, desc: "Ajoutez bilan. à Claude ou à ChatGPT : l'assistant lit les comptes officiels de plus de 1 000 entreprises, la médiane de leur secteur, l'éligibilité au PEA, les ETF et l'agenda, sources à l'appui. Gratuit, en lecture seule, sans conseil." };
  if (p === "/mentions-legales") return { title: `Mentions légales · ${SITE}`, desc: BASE_DESC };
  if (p === "/cgv") return { title: `Conditions générales de vente · ${SITE}`, desc: BASE_DESC };
  if (p === "/confidentialite") return { title: `Politique de confidentialité · ${SITE}`, desc: BASE_DESC };
  if (p === "/avertissement") return { title: `Avertissement sur les risques · ${SITE}`, desc: BASE_DESC };
  return null;
}

// Anciennes adresses de l'apprentissage, fusionnées dans l'Académie (même règle que parRedirection dans cf/site/m/parcours.js)
export function redirectionParcours(p) {
  const m = /^\/debuter\/(.+)$/.exec(p || ""); if (m) return "/academie/express/" + m[1];
  if (p === "/simulateurs/passe") return "/outils/si-javais"; // affichait le simulateur d'épargne sans le dire (audit P2-6)
  if (p === "/pour-moi") return "/repartitions"; // « Pistes pour vous » remplacé par les répartitions types, sans personnalisation (audit P0-6)
  // Lot 2 (30/10) : quatre portes ; les anciennes pages d'entrée sont fusionnées dans /apprendre (les leçons gardent leur adresse)
  if (p === "/commencer") return "/apprendre";
  const mf = /^(\/entreprise\/[a-z0-9-]+)\/(comptes|actualite|agenda|communaute|comprendre\/[a-z0-9-]+)\/?$/.exec(p); // lot 4 : la fiche est une seule page
  if (mf) return mf[1] + (mf[2] === "comptes" ? "#tous-les-chiffres" : mf[2] === "communaute" ? "#rf-sources" : /^comprendre/.test(mf[2]) ? "#tous-les-chiffres" : "#rf-agenda");
  if (p === "/academie" || p === "/academie/" || p === "/academie/express" || p === "/academie/express/") return "/apprendre";
  if (p === "/debuter" || p === "/premiers-pas") return "/apprendre";
  return null;
}
// Anciennes routes de l'IA du serveur (retirée le 29 octobre 2026) : le site ne paie et n'appelle plus aucun modèle.
// Les réponses calculées restent dans le navigateur ; la rédaction passe par l'IA que le visiteur connecte (docs/ia.md).
const IA_RETIREE = /^\/api\/(assistant|demande|resume|actu\/clair)\/?$/;
export const iaRetiree = () => Response.json({ error: "Cette adresse n'est plus utilisée. L'IA du site répond dans le panneau ✦ « Demander à l'IA »", ia_serveur: false }, { status: 410, headers: { "cache-control": "no-store" } });
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/amf") return amf(request, U.filter(c => c.region === "FR").map(c => c.isin));
    if (url.pathname.startsWith("/api/communaute")) return communaute(request, env);
    if (url.pathname === "/api/presse") return presse(request, U);
    if (url.pathname === "/api/cours") return cours(request, ctx, env);
    if (IA_RETIREE.test(url.pathname)) return iaRetiree();
    if (url.pathname.startsWith("/api/ia/")) return iaSite(request, env); // l'IA du site (Workers AI, gratuite, plafonnée)
    if (url.pathname.startsWith("/api/veille")) return veille(request, env);
    if (url.pathname === "/api/signaler") return signaler(request, env);
    if (url.pathname.startsWith("/api/premium")) return premium(request, env);
    if (url.pathname === "/api/espace/tache") return tacheEtPush(request, env, url);
    if (url.pathname.startsWith("/api/espace")) return espace(request, env);
    if (url.pathname === "/api/rapport-exemple") return rapportExemple(request, env);
    if (url.pathname.startsWith("/api/push/")) return push(request, env);
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") return mcp(request, env, ctx);
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Introuvable" }, { status: 404 });
    const redir = redirectionParcours(url.pathname.replace(/\/+$/, ""));
    if (redir) { const [rp, rh] = redir.split("#"); return Response.redirect(url.origin + rp + url.search + (rh ? "#" + rh : ""), 301); }
    let info = meta(url.pathname, url.searchParams);
    const etfId = (url.pathname.match(/^\/etf\/([a-z0-9-]+)\/?$/) || [])[1];
    if (etfId) info = await etfMeta(etfId, env, url, SITE) || info;
    if (!info) {
      // Fichier existant (données, scripts) ou vraie page 404
      const r = await env.ASSETS.fetch(request);
      if (r.status !== 404 && !(r.headers.get("content-type") || "").includes("text/html")) return r;
      if (url.pathname.match(/\.[a-z0-9]+$/i)) return new Response("Introuvable", { status: 404 });
    }
    const page = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    let html = await page.text();
    const t = info || { title: `Page introuvable · ${SITE}`, desc: BASE_DESC };
    const fq = info && url.pathname.replace(/\/+$/, "").match(/^\/entreprise\/([a-z0-9-]+)$/);
    if (fq) { // questions fréquentes de la fiche (JSON-LD FAQPage), fichier fabriqué par data/faq_seo.mjs
      try { const r = await env.ASSETS.fetch(new Request(new URL(`/data/faq/${fq[1]}.json`, url))); if (r.ok && (r.headers.get("content-type") || "").includes("json")) { const ld = (await r.text()).replace(/</g, "\\u003c"); html = html.replace("</head>", `<script type="application/ld+json">${ld}</script>\n</head>`); } } catch (e) { }
    }
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(t.desc)}">\n<link rel="canonical" href="${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}">${t.ld ? `\n<script type="application/ld+json">${t.ld}</script>` : ""}`);
    html = html.replace('<div class="wrap" id="app"></div>', `<div class="wrap" id="app">${await rendu(t, fq, env, url)}</div>`);
    html = tete(html, { title: t.title, desc: t.desc, url, statut: info ? 200 : 404 });
    return new Response(html, { status: info ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate", "x-bilan-version": VERSION, ...SECURITE } });
  },
};


/* Contenu servi dans la page même (30/10/2026) : sans JavaScript (robots d'indexation, navigateur qui bloque les scripts,
   fichier de données en panne), la page n'est plus blanche. Le titre, la description et, pour une entreprise, ses chiffres
   du dernier exercice. Masqué dès que le site s'affiche (classe « js » posée en tête de page), donc sans saut visible. */
const fmtM = (v, cur) => { if (v == null || !isFinite(v)) return null; const a = Math.abs(v); const t = a >= 1000 ? (v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Md" : v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " M"; return t + " " + (cur === "EUR" ? "€" : cur === "USD" ? "$" : cur || ""); };
async function rendu(t, fq, env, url) {
  let corps = "";
  if (fq) {
    try {
      const r = await env.ASSETS.fetch(new Request(new URL(`/data/societes/${fq[1]}.json`, url)));
      if (r.ok && (r.headers.get("content-type") || "").includes("json")) {
        const c = await r.json(), f = c.fin || {}, n = (c.years || []).length - 1, y = c.years ? c.years[n] : null, L = [];
        const v = k => Array.isArray(f[k]) ? f[k][n] : null;
        if (y != null) {
          if (v("ca") != null) L.push(["Chiffre d'affaires", fmtM(v("ca"), c.currency)]);
          if (v("ebit") != null) L.push(["Résultat d'exploitation", fmtM(v("ebit"), c.currency)]);
          if (v("net") != null) L.push(["Résultat net", fmtM(v("net"), c.currency)]);
          if (v("netDebt") != null) L.push([v("netDebt") < 0 ? "Trésorerie nette" : "Dette nette", fmtM(Math.abs(v("netDebt")), c.currency)]);
          if (v("divPaid") != null) L.push(["Dividendes versés", fmtM(v("divPaid"), c.currency)]);
          corps = `<h2>Comptes de l'exercice ${esc(String(y))}</h2><ul>${L.map(([k, x]) => `<li>${esc(k)} : ${esc(x)}</li>`).join("")}</ul><p>Source : comptes annuels officiels (${c.cik ? "SEC" : "ESEF"}).</p>`;
        }
      }
    } catch (e) { }
  }
  return `<div class="ssr"><h1>${esc(t.title.replace(/ · .*$/, ""))}</h1><p>${esc(t.desc)}</p>${corps}<p class="ssr-js">Le site a besoin de JavaScript pour afficher l'analyse complète, les graphiques et les comparaisons. S'il ne s'affiche pas, rechargez la page.</p></div>`;
}

// Tâche du soir (.github/workflows/espace.yml) : alertes et bilans de l'espace, puis notifications push des appareils abonnés.
// Les envois partent dans un appel où l'espace n'a plus de compte à traiter (limite de sous-requêtes par appel) ;
// tant qu'il en reste, « reste » vaut au moins 1 et le robot rappelle la tâche.
async function tacheEtPush(request, env, url) {
  const r = await espace(request, env);
  if (r.status !== 200) return r;
  const j = await r.json();
  let p;
  try { p = await pousser(env, { origin: url.origin, budget: j.traites ? 0 : 30 }); } catch (e) { p = { erreur: String(e && e.message || e) }; }
  return Response.json({ ...j, push: p, reste: (j.reste || 0) + (p && p.reste ? 1 : 0) }, { headers: { "cache-control": "no-store" } });
}
