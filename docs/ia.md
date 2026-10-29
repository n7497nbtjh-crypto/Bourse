# L'IA de bilan.

Décision du 29 octobre 2026 : simple, gratuite pour le site, utilisable par beaucoup de monde.

## En bref (pour Romain)

**1. Pour tout le monde, sans rien faire : les réponses calculées.** Recherches par critères, comparaisons, définitions, questions courantes sur une fiche (prix, dette, dividende, marge, concurrentes, risques, dates), leçons de l'Académie. Le site calcule la réponse dans le navigateur du visiteur, à partir des comptes officiels et de ses données. Gratuit, illimité, exact par construction. Test : `tests/t_ia.py`, 509 questions de débutants, 100 %.

**2. « Connecter mon IA » : un seul bouton, facultatif.** Le visiteur se connecte à son compte OpenRouter (création gratuite) et choisit un modèle dans une courte liste ; les modèles gratuits sont signalés (environ 50 questions par jour sur un compte gratuit). Ensuite, les fonctions qui rédigent lui répondent en texte : question libre, question sur une fiche, « Le métier expliqué », « Expliquer en clair » d'une annonce, explication d'une comparaison, commentaire de la semaine, bilan des favoris, analyse du portefeuille. Le modèle reçoit la question, les faits calculés par le site (médianes, analyse, sources) et nos règles d'objectivité et d'autocritique. Sa réponse est signalée et cite ses sources.
- La clé reste dans le navigateur du visiteur. Elle n'est jamais envoyée à bilan.
- Les appels partent directement du navigateur vers OpenRouter.
- Déconnexion en un clic (page « Mon IA »).
- Sans IA connectée, ces fonctions montrent la réponse calculée et une invitation discrète : « Connectez votre IA pour une réponse rédigée ».

**3. Pour ceux qui utilisent déjà ChatGPT ou Claude : le connecteur.** Page `/connecteur` (« Utiliser bilan. dans ChatGPT ou Claude ») : l'assistant du visiteur lit nos données par le protocole MCP (`/mcp`).

**Coût pour le site : 0 €, quel que soit le nombre de visiteurs.** Le site n'appelle et ne paie plus aucun modèle d'IA.

**Dans l'interface :** un seul point d'entrée, le bouton ✦ « Demander à l'IA » (panneau présent sur toutes les pages). En tête du panneau : « IA connectée : <modèle> » ou « Réponses calculées ».

**À faire par Romain (facultatif) :** dans Cloudflare, supprimer le binding `AI` et les variables `MISTRAL_KEY`, `GROQ_KEY`, `GEMINI_KEY`, `OPENROUTER_KEY`, `IA_*`, `*_MODEL`. Ils ne servent plus.

## Pour la maintenance

| Quoi | Où |
|---|---|
| Réponses calculées | `cf/site/ia.js` (`localCopilot`, `localAssist`, `chercheLecons`), `ficheFaits` (analyse.js, contexte.js) |
| Connexion OpenRouter, appel du modèle | `cf/site/m/monia.js` : `miaConnecter` (PKCE S256 vers `https://openrouter.ai/auth`), `miaRetour` (POST `https://openrouter.ai/api/v1/auth/keys`), `miaModeles` (`/api/v1/models`, filtré), `iaRediger(tâche, faits, { question })`, `miaCopilote(q)` |
| Consignes envoyées au modèle | `cf/src/consignes.mjs` + `cf/src/regles.mjs`, écrites par `build.mjs` dans `/data/prompts.json` (tâches : demande, expliquer, assistant, comparaison, veille, portefeuille, annonce, bilan) |
| Panneau ✦ | `cf/site/m/orchestre.js` (`orcIaOpen`, `orcIaAsk(q, { rediger })`) ; la fiche (`ficheDemander`) et les ETF y envoient leurs questions |
| Anciennes routes d'IA | `/api/assistant`, `/api/demande`, `/api/resume`, `/api/actu/clair`, `/api/ia/etat`, `POST /api/veille` : réponse 410 avec un message clair (`iaRetiree` dans `worker.mjs`) |
| Tests | `tests/t_ia.py` (réponses calculées), `tests/t_monia.py` (flux OpenRouter simulé, aucune clé envoyée au site) |

Stockage dans le navigateur : `localStorage["bilan.monia"]` = `{ key, model, nom, gratuit }` ; vérificateur PKCE dans `sessionStorage` le temps de l'aller-retour. Un modèle qui renvoie 401 déconnecte l'IA ; 402 et 429 donnent un message clair (crédit ou limite du jour).

Documentation officielle : https://openrouter.ai/docs/guides/overview/auth/oauth (consultée le 29 octobre 2026) ; limites des modèles gratuits : https://openrouter.ai/docs/api/reference/limits

## Ce qui a été retiré le 29 octobre 2026
IA installée sur l'appareil (WebLLM, Qwen) ; saisie de clé multi-fournisseurs (`m/iacle.js`) ; toute l'IA du serveur (`cf/src/llm.mjs`, `ia.mjs`, `demande.mjs`, `actu.mjs`, commentaire de la semaine par le serveur, rotation Mistral, Groq, Gemini, OpenRouter et Workers AI, compteur de neurones) ; quotas d'IA (`LIMITS`, `quota()` de `compte.mjs`) ; préchauffage `data/ia_prechauffe.mjs` et rédaction « En clair » par le robot de l'actualité ; résumé détaillé des PDF de l'AMF (il demandait Workers AI). Les textes « En clair » déjà publiés restent affichés.
