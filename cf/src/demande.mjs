// /api/demande : « Demander à bilan. ». Le modèle traduit la question en une action que le navigateur exécute
// sur les données du site (recherche d'entreprises par critères, comparaison, fiche, ETF) ou rédige une explication.
// Les résultats eux-mêmes sont calculés par le site, jamais inventés par le modèle.
import { rediger, jsonDe, DIAG } from "./llm.mjs";
import { REGLES } from "./regles.mjs";
import { quota, quotaError, json } from "./compte.mjs";
import { SECTEURS } from "./index.gen.mjs";

export const REPERES = `Repères exacts à respecter :
- ETF capitalisant : les dividendes reçus sont réinvestis automatiquement dans le fonds (rien n'est versé à l'épargnant). ETF distribuant : les dividendes sont versés à l'épargnant.
- PER (price earning ratio) : prix de l'action divisé par le bénéfice par action, ou valeur en Bourse divisée par le bénéfice annuel. Ne pas confondre avec le PER plan d'épargne retraite.
- PEA : actions européennes et ETF éligibles, versements plafonnés à 150 000 €, gains imposés à 18,6 % de prélèvements sociaux après 5 ans (2026). Compte-titres : tout titre, sans plafond, gains imposés à 31,4 % (flat tax 2026 : 12,8 % d'impôt + 18,6 % de prélèvements sociaux).
- Rendement d'un dividende : dividende annuel divisé par le cours. Marge d'exploitation : résultat d'exploitation divisé par le chiffre d'affaires.
- Médiane d'un secteur : la valeur du milieu, la moitié des entreprises fait mieux, l'autre moins bien.
- Un indice (CAC 40, S&P 500, MSCI World) est un panier d'entreprises ; un ETF permet d'acheter tout le panier en une fois.`;
const IND = ["croissance", "marge", "marge_nette", "rentabilite", "dette", "per", "rendement", "distribution", "variation_1an", "capitalisation", "taille"];
export const SYS = `Tu es le moteur de recherche du site d'information boursière « bilan. », destiné à des débutants. Tu transformes la question de l'utilisateur en UNE action JSON, sans aucun texte autour.

Actions possibles :
1. Chercher des entreprises selon des critères :
{"action":"filtre","titre":"phrase courte qui reformule la demande","secteur":null ou une clé de ${JSON.stringify(SECTEURS)},"region":null ou "FR" (France), "EU" (Europe hors France), "US" (États-Unis), "MONDE" (reste du monde),"pea":null ou true,"criteres":[{"indicateur":"…","condition":"sup_mediane"|"inf_mediane"|"sup"|"inf","valeur":nombre ou null}],"tri":{"indicateur":"…","ordre":"desc"|"asc"},"limite":10}
Indicateurs : croissance (hausse des ventes sur un an, en %), marge (marge d'exploitation, %), marge_nette (%), rentabilite (bénéfice / capitaux propres, %), dette (dette nette en années de résultat avant amortissements ; négative ou faible = peu endettée), per (prix de l'action / bénéfice), rendement (dividende / cours, %), distribution (part du bénéfice versée en dividende, %), variation_1an (évolution du cours sur un an, %), capitalisation (valeur en Bourse, milliards d'euros), taille (ventes annuelles, milliards d'euros).
« sup_mediane »/« inf_mediane » comparent à la médiane du secteur de chaque entreprise ; « sup »/« inf » utilisent "valeur" (pourcentages en nombre : 5 pour 5 %).
Exemples : « peu endettées » → {"indicateur":"dette","condition":"inf","valeur":1} ; « bon dividende » → {"indicateur":"rendement","condition":"sup","valeur":3} ; « pas chères » → {"indicateur":"per","condition":"inf_mediane","valeur":null} ; « très rentables » → {"indicateur":"marge","condition":"sup_mediane","valeur":null} ; « les plus grosses » → tri capitalisation desc.
2. Comparer des entreprises nommées : {"action":"comparer","noms":["LVMH","Hermès"]}
3. Ouvrir la fiche d'une entreprise ou d'un ETF nommé : {"action":"fiche","nom":"Apple"}
4. Chercher des ETF : {"action":"etf","titre":"…","categorie":null ou "actions-monde"|"actions-usa"|"actions-europe"|"actions-france"|"actions-emergents"|"actions-asie"|"dividendes"|"obligations"|"monetaire"|"theme"|"immobilier"|"matieres"|"facteurs","pea":null ou true}
5. Répondre à une question générale (définition, fonctionnement de la Bourse, fiscalité, méthode) : {"action":"repondre","texte":"réponse en français, 60 à 160 mots, vouvoiement, phrases courtes, un exemple chiffré si utile"}
Règles : ne recommande jamais d'acheter ou de vendre, ne prédis jamais un cours. Si on te demande « quoi acheter », choisis une action "filtre" ou "etf" qui aide à explorer, et un titre neutre (« Entreprises… » et non « Les meilleures actions »). Réponds uniquement avec le JSON.
${REPERES}
${REGLES}`;

export const SYS_EXPL = `Tu expliques la Bourse en français à une personne qui débute, pour le site « bilan. ». 80 à 170 mots, vouvoiement, phrases courtes, un exemple chiffré simple si utile. Sois exact : si tu n'es pas sûr d'un point, ne l'affirme pas. Aucun conseil d'achat ou de vente, aucune prédiction. Pas de listes à puces, pas de titres, pas de tirets cadratins.
${REPERES}
${REGLES}`;
const clean = s => String(s || "").replace(/\s+/g, " ").trim();
function valide(a) {
  if (!a || typeof a !== "object") return null;
  if (a.action === "filtre") {
    const crit = (Array.isArray(a.criteres) ? a.criteres : []).filter(c => c && IND.includes(c.indicateur) && ["sup_mediane", "inf_mediane", "sup", "inf"].includes(c.condition)).slice(0, 5)
      .map(c => ({ indicateur: c.indicateur, condition: c.condition, valeur: typeof c.valeur === "number" && isFinite(c.valeur) ? c.valeur : null }));
    const tri = a.tri && IND.includes(a.tri.indicateur) ? { indicateur: a.tri.indicateur, ordre: a.tri.ordre === "asc" ? "asc" : "desc" } : null;
    return { action: "filtre", titre: clean(a.titre).slice(0, 120), secteur: SECTEURS[a.secteur] ? a.secteur : null, region: ["FR", "EU", "US", "MONDE"].includes(a.region) ? a.region : null, pea: a.pea === true, criteres: crit, tri, limite: Math.min(30, Math.max(3, +a.limite || 12)) };
  }
  if (a.action === "comparer" && Array.isArray(a.noms)) return { action: "comparer", noms: a.noms.map(clean).filter(Boolean).slice(0, 5) };
  if (a.action === "fiche" && a.nom) return { action: "fiche", nom: clean(a.nom).slice(0, 80) };
  if (a.action === "etf") return { action: "etf", titre: clean(a.titre).slice(0, 120), categorie: /^[a-z-]{3,30}$/.test(a.categorie || "") ? a.categorie : null, pea: a.pea === true };
  if (a.action === "repondre" && clean(a.texte).length > 30) return { action: "repondre", texte: String(a.texte).replace(/—/g, ",").trim().slice(0, 2000) };
  return null;
}
export async function demande(request, env) {
  if (request.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Requête illisible." }, 400); }
  const q = clean(b.question).slice(0, 300);
  if (q.length < 4) return json({ error: "Écrivez une question un peu plus longue." }, 400);
  const key = "demande2:" + q.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöùûüç ]/g, "");
  if (env.DB) { try { const hit = await env.DB.prepare(`SELECT txt FROM resumes WHERE u = ?`).bind(key).first(); if (hit) return json({ ...JSON.parse(hit.txt), cache: true }); } catch (e) { } }
  const qq = await quota(request, env, "demande"); if (!qq.ok) return quotaError(qq, "questions à l'IA");
  const t = await rediger(env, { systeme: SYS, utilisateur: q, max_tokens: 500, temperature: 0.1, json: true, qualite: false });
  const a = valide(jsonDe(t));
  if (a && a.action === "repondre") { // les explications passent par le modèle le plus fiable
    const x = await rediger(env, { systeme: SYS_EXPL, utilisateur: q, max_tokens: 450, temperature: 0.2, qualite: true });
    if (x && x.length > 40) a.texte = x.replace(/—/g, ",").trim().slice(0, 2000);
  }
  if (!a) return json({ error: t ? "Je n'ai pas compris la demande. Essayez par exemple : « entreprises françaises peu endettées qui versent un dividende »." : "L'IA est très demandée en ce moment : réessayez dans quelques instants.", diag: DIAG.slice(-3) }, t ? 422 : 503);
  if (env.DB) { try { await env.DB.prepare(`INSERT OR REPLACE INTO resumes (u, txt, at) VALUES (?, ?, ?)`).bind(key, JSON.stringify(a), Date.now()).run(); } catch (e) { } }
  return json(a);
}
