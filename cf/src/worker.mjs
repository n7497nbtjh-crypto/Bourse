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
import { resume, veille, assistant } from "./ia.mjs";
import { premium } from "./compte.mjs";
import { espace } from "./espace.mjs";
import { demande } from "./demande.mjs";
import { signaler } from "./signaler.mjs";

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
    return { title: `${t} · ${SITE}`, desc: "Simulez l'évolution d'un placement, avec les hypothèses affichées. Outil pédagogique, sans conseil." };
  }
  if (p === "/entreprises") return { title: `Les entreprises · ${SITE}`, desc: "Les grandes entreprises de France, d'Europe et des États-Unis : ce qu'elles font, leurs comptes et leurs points forts et faibles, expliqués simplement." };
  if (p === "/actualites") return { title: `Actualité des entreprises · ${SITE}`, desc: "Résultats, dividendes, assemblées générales et publications officielles déposées auprès de l'AMF." };
  if (p === "/agenda") return { title: `Agenda financier · ${SITE}`, desc: "Dates des résultats, assemblées générales et dividendes des entreprises cotées." };
  if (p === "/portefeuille") return { title: `Portefeuille · ${SITE}`, desc: "Suivez la performance réelle de vos placements ou entraînez-vous avec un portefeuille virtuel." };
  if (p === "/etf") return { title: `Les ETF expliqués · ${SITE}`, desc: "Les fonds indiciels les plus utilisés en France : ce qu'ils contiennent, leurs frais, leur éligibilité au PEA, leur composition par pays et par entreprise." };
  if (/^\/etf\/[a-z0-9-]+$/.test(p)) return { title: `ETF : composition, frais et explications · ${SITE}`, desc: "Ce que contient ce fonds indiciel, ses frais, sa composition par pays et ses principales lignes, expliqués simplement." };
  if (p === "/communaute") return { title: `Communauté · ${SITE}`, desc: "Échangez des idées et des questions sur les entreprises et la Bourse avec les autres visiteurs. Aucun message n'est un conseil en investissement." };
  if (p === "/lexique") return { title: `Lexique · ${SITE}`, desc: "PER, rendement, marge, dette, volatilité : chaque chiffre de la Bourse expliqué simplement, avec ses limites." };
  if (p === "/espace" || p.startsWith("/espace/")) return { title: `Mon espace · ${SITE}`, desc: "Votre bilan de la semaine, vos notifications et vos listes, sur tous vos appareils." };
  if (p === "/favoris") return { title: `Mes favoris · ${SITE}`, desc: "Les entreprises et ETF que vous suivez : chiffres clés, prochaines dates et presse." };
  if (p === "/comparer") { // lien partagé : le titre nomme les entreprises comparées
    const cos = String((q && q.get("ids")) || "").split(",").map(id => BY[id]).filter(Boolean).slice(0, 5);
    if (cos.length >= 2) { const n = cos.map(c => c.name), l = n.slice(0, -1).join(", ") + " et " + n.at(-1);
      return { title: `${l} : la comparaison · ${SITE}`, desc: `${l} comparées critère par critère : taille, croissance, rentabilité, solidité financière, prix en Bourse et dividende, face à la médiane de leur secteur. Chiffres tirés des comptes officiels, sans conseil.` }; }
    return { title: `Comparer des entreprises · ${SITE}`, desc: "Le verdict d'abord, critère par critère : taille, croissance, rentabilité, solidité, prix en Bourse et dividende de plusieurs entreprises, face à la médiane de leur secteur." };
  }
  if (p === "/pea-cto") return { title: `PEA, compte-titres ou assurance-vie : lequel choisir · ${SITE}`, desc: "Ce qu'on peut acheter dans chaque compte, les plafonds et l'impôt sur les gains en 2026, avec un exemple chiffré." };
  if (p === "/dividendes") return { title: `Calendrier des dividendes · ${SITE}`, desc: "Les prochaines dates de détachement et de paiement des dividendes, avec leur source, à ajouter à votre agenda." };
  if (p.startsWith("/debuter")) return { title: `Premiers pas en Bourse · ${SITE}`, desc: "Un parcours en trois étapes pour comprendre les actions, lire les comptes d'une entreprise et juger son prix, avec des quiz." };
  if (p.startsWith("/outils")) return { title: `Outils · ${SITE}`, desc: "Radiographie de portefeuille, comparaison d'entreprises, recouvrement de deux ETF, simulateurs d'épargne et de frais." };
  const IDXN = { cac40: "CAC 40", stoxx50: "Euro Stoxx 50", dax: "DAX", sp500: "S&P 500", nasdaq100: "Nasdaq 100", ftse100: "FTSE 100", nikkei: "Nikkei 225" };
  { const mi = p.match(/^\/indice\/([a-z0-9]+)$/); if (mi && IDXN[mi[1]]) return { title: `${IDXN[mi[1]]} : ce qu'il contient et comment y investir · ${SITE}`, desc: `Le ${IDXN[mi[1]]} expliqué simplement : sa règle de calcul, ses plus grandes entreprises, et les ETF qui le reproduisent, classés par frais.` }; }
  if (p === "/marches") return { title: `Les marchés aujourd'hui · ${SITE}`, desc: "Les grands indices et les plus fortes hausses et baisses du jour, expliquées." };
  if (p === "/methode") return { title: `Méthode, sources et IA · ${SITE}`, desc: "D'où viennent les chiffres du site, comment ils sont jugés par rapport à la médiane du secteur, et les règles données à l'IA pour rester factuelle et sans biais." };
  if (p.startsWith("/academie")) return { title: `L'Académie : cours de culture financière · ${SITE}`, desc: "Des cours gratuits pour comprendre l'argent, la Bourse et les placements en France : épargne, PEA, ETF, comptes des entreprises, frais, fiscalité, pièges. Avec quiz et exemples chiffrés." };
  if (p === "/demander") return { title: `Demandez à bilan. : la recherche d'entreprises par l'IA · ${SITE}`, desc: "Décrivez ce que vous cherchez avec vos mots : l'IA le traduit en critères et les applique aux comptes de plus de 1 000 entreprises et 97 ETF. Sans conseil en investissement." };
  if (p.startsWith("/espace")) return { title: `Mon espace · ${SITE}`, desc: "Le bilan de la semaine de vos entreprises, commenté par l'IA, vos alertes, vos favoris et votre portefeuille sur tous vos appareils." };
  if (p === "/commencer") return { title: `Par où commencer en Bourse : le guide du nouvel investisseur · ${SITE}`, desc: "Épargne de précaution, horizon, choix du compte, diversification, frais, pièges à éviter : sept étapes dans l'ordre et un questionnaire pour trouver votre profil. Sans conseil personnalisé." };
  if (p === "/premium" || p === "/premium/merci") return { title: `Premium · ${SITE}`, desc: "Plus de questions à l'assistant IA, de résumés détaillés et de bilans rédigés, des alertes par e-mail sur vos entreprises. Le site reste gratuit pour l'essentiel." };
  if (p === "/mentions-legales") return { title: `Mentions légales · ${SITE}`, desc: BASE_DESC };
  if (p === "/cgv") return { title: `Conditions générales de vente · ${SITE}`, desc: BASE_DESC };
  if (p === "/confidentialite") return { title: `Politique de confidentialité · ${SITE}`, desc: BASE_DESC };
  if (p === "/avertissement") return { title: `Avertissement sur les risques · ${SITE}`, desc: BASE_DESC };
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/amf") return amf(request, U.filter(c => c.region === "FR").map(c => c.isin));
    if (url.pathname.startsWith("/api/communaute")) return communaute(request, env);
    if (url.pathname === "/api/presse") return presse(request, U);
    if (url.pathname === "/api/cours") return cours(request, ctx);
    if (url.pathname === "/api/resume") return resume(request, env);
    if (url.pathname.startsWith("/api/veille")) return veille(request, env);
    if (url.pathname === "/api/assistant") return assistant(request, env);
    if (url.pathname === "/api/demande") return demande(request, env);
    if (url.pathname === "/api/signaler") return signaler(request, env);
    if (url.pathname.startsWith("/api/premium")) return premium(request, env);
    if (url.pathname.startsWith("/api/espace")) return espace(request, env);
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Introuvable" }, { status: 404 });
    const info = meta(url.pathname, url.searchParams);
    if (!info) {
      // Fichier existant (données, scripts) ou vraie page 404
      const r = await env.ASSETS.fetch(request);
      if (r.status !== 404 && !(r.headers.get("content-type") || "").includes("text/html")) return r;
      if (url.pathname.match(/\.[a-z0-9]+$/i)) return new Response("Introuvable", { status: 404 });
    }
    const page = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    let html = await page.text();
    const t = info || { title: `Page introuvable · ${SITE}`, desc: BASE_DESC };
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(t.desc)}">\n<link rel="canonical" href="${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}">`);
    return new Response(html, { status: info ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
  },
};
