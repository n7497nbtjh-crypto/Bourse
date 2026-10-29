// Métadonnées d'une fiche ETF (titre, description, FAQ structurée pour les moteurs de recherche), calculées à partir de /data/etf.json.
// Mêmes réponses factuelles que la fiche (cf/site/m/etf.js), sans conseil.
let CACHE = null, CACHE_AT = 0;
const nf = (v, d = 2) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
export async function etfMeta(id, env, url, SITE) {
  try {
    if (!CACHE || Date.now() - CACHE_AT > 10 * 60e3) { const r = await env.ASSETS.fetch(new Request(new URL("/data/etf.json", url))); CACHE = r.ok ? await r.json() : null; CACHE_AT = Date.now(); }
    const e = CACHE && (CACHE.list || []).find(x => x.id === id);
    if (!e) return null;
    const ter = e.ter != null ? nf(e.ter) + " %" : null, c = e.compo || {};
    const qa = [];
    qa.push([`${e.name} est-il éligible au PEA ?`, e.pea === true ? `Oui. ${e.issuer} indique que cet ETF est éligible au PEA.` : e.pea === false ? `Non. D'après ${e.issuer}, cet ETF n'est pas éligible au PEA : il s'achète dans un compte-titres.` : `L'émetteur ne l'indique pas sur les documents consultés.`]);
    if (ter) qa.push([`Quels sont les frais de ${e.name} ?`, `Ses frais courants sont de ${ter} par an, soit ${nf(e.ter * 10, 0)} € par an pour 1 000 € placés, auxquels s'ajoutent les frais de courtage.`]);
    if (c.n) qa.push([`Que contient ${e.name} ?`, `Il reproduit l'indice ${e.index}. Il contient ${Number(c.n).toLocaleString("fr-FR")} lignes${c.t10 ? ` ; les 10 plus grosses pèsent ${nf(c.t10, 0)} % du fonds` : ""}.`]);
    if (e.distribution) qa.push([`${e.name} est-il capitalisant ou distribuant ?`, e.distribution === "distribution" ? "Distribuant : les dividendes sont versés aux porteurs." : "Capitalisant : les dividendes sont réinvestis dans le fonds."]);
    const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
    return {
      title: `${e.name}${e.ticker ? ` (${e.ticker})` : ""} : composition, frais, PEA · ${SITE}`,
      desc: `${e.name}, ETF ${e.issuer} sur l'indice ${e.index || ""}. Frais courants ${ter || "non communiqués"} par an, ${e.pea === true ? "éligible au PEA" : "hors PEA"}, ${e.distribution === "distribution" ? "distribuant" : "capitalisant"}. Ce qu'il contient, ses 10 premières lignes, ses pays et secteurs, expliqués simplement.`,
      ld: JSON.stringify(ld).replace(/</g, "\\u003c"),
    };
  } catch (x) { return null; }
}
