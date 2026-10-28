// Repère : site statique + pages indexables (Cloudflare Pages, mode _worker.js).
// Le Worker renvoie index.html pour chaque page du site, avec le titre et la description propres à la page
// (Google lit ainsi un vrai titre pour chaque entreprise). Le reste (données, scripts) est servi tel quel.
// Plus tard : routes /api/* pour interroger le fournisseur de données. Sa clé (DATA_API_KEY) sera saisie
// par Romain dans Cloudflare > Variables et secrets, jamais dans le code.
import U, { SECTEURS } from "./index.gen.mjs";
const INDEX = U.map(c => ({ id: c.id, name: c.name, sector: SECTEURS[c.sector], desc: c.desc || "" })); // fiches non incluses
import amf from "./amf.mjs";
import communaute from "./communaute.mjs";
import presse from "./presse.mjs";

const SITE = "Repère";
const BASE_DESC = "Les chiffres clés des entreprises cotées, expliqués simplement, et des simulateurs pour comprendre l'investissement. Informations factuelles, sans conseil.";
const TOOLS = { epargne: "Simulateur d'épargne", interets: "Simulateur d'épargne", frais: "Frais des courtiers", "pea-cto": "Simulateur PEA ou compte-titres" };
const BY = Object.fromEntries(INDEX.map(c => [c.id, c]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function meta(path) {
  const p = path.replace(/\/+$/, "") || "/";
  const base = p.replace(/^(\/entreprise\/[a-z0-9-]+)\/(comptes|actualite|agenda|communaute|comprendre\/[a-z0-9-]+)$/, "$1");
  let m;
  if (p === "/") return { title: `${SITE} · La Bourse expliquée`, desc: BASE_DESC };
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
  if (p === "/mentions-legales") return { title: `Mentions légales · ${SITE}`, desc: BASE_DESC };
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/amf") return amf(request, U.filter(c => c.region === "FR").map(c => c.isin));
    if (url.pathname.startsWith("/api/communaute")) return communaute(request, env);
    if (url.pathname === "/api/presse") return presse(request, U);
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "Introuvable" }, { status: 404 });
    const info = meta(url.pathname);
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
    return new Response(html, { status: info ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
  },
};
