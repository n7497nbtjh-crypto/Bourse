# L'IA de bilan.

Décision du 29 octobre 2026 : simple, gratuite pour le site, utilisable par beaucoup de monde.

## En bref (pour Romain)

**1. Pour tout le monde, sans rien faire : les réponses calculées.** Recherches par critères, comparaisons, définitions, questions courantes sur une fiche (prix, dette, dividende, marge, concurrentes, risques, dates), leçons de l'Académie. Le site calcule la réponse dans le navigateur du visiteur, à partir des comptes officiels et de ses données. Gratuit, illimité, exact par construction. Test : `tests/t_ia.py`, 509 questions de débutants, 100 %.

**2. L'IA du site, pour les questions libres et les textes rédigés : gratuite, sans compte ni clé (29 octobre 2026, 18 h 30, demande de Romain : « l'utilisation de l'IA doit se faire sur le site et gratuitement »).** Le navigateur envoie la tâche, les faits calculés par le site et la question à `/api/ia/rediger` ; le serveur (`cf/src/iasite.mjs`) y ajoute ses propres consignes (`cf/src/consignes.mjs`) et appelle un modèle ouvert sur **Cloudflare Workers AI** par la liaison `AI` du projet Pages : Qwen3 30B d'abord (environ 40 neurones par réponse), Mistral Small 3.1 ensuite. Fonctions concernées : question libre, question sur une fiche, « Le métier expliqué », « Expliquer en clair » d'une annonce, explication d'une comparaison, commentaire de la semaine, bilan des favoris, analyse du portefeuille. La réponse est signalée (« Rédigé par l'IA de bilan. ») et cite ses sources.
- **Coût : 0 €.** Workers AI offre 10 000 neurones par jour (tarif consulté le 29/10/2026). Le site s'arrête avant : `IA_NEURONES_JOUR` (9 000 par défaut), compté dans D1 (`ia_neurones`). Au-delà, plus aucun appel : la réponse calculée reste, avec une ligne « l'IA revient demain ».
- **Par visiteur :** `IA_QUESTIONS_JOUR` (25 par défaut), sur l'empreinte anonyme du jour (`visitor()` de `compte.mjs`, jamais l'adresse IP en clair), table `ia_visiteurs` vidée chaque jour.
- Écartés après vérification (29/10/2026) : offre gratuite de Gemini (interdite pour des utilisateurs de l'EEE par les conditions de Google), offre « Experiment » de Mistral (prévue pour l'évaluation, pas la production), connexion par clé ou par abonnement (refusée par Romain ; « Se connecter avec ChatGPT » réservé à des partenaires choisis par OpenAI, abonnements Claude interdits dans les outils tiers).
- Les questions partent chez Cloudflare (déjà hébergeur du site) ; Workers AI ne les utilise pas pour entraîner ses modèles. Le site ne garde pas leur texte.

**3. Pour ceux qui utilisent déjà ChatGPT ou Claude : le connecteur.** Page `/connecteur` (« Utiliser bilan. dans ChatGPT ou Claude ») : l'assistant du visiteur lit nos données par le protocole MCP (`/mcp`).

**Coût pour le site : 0 €.** L'IA du site reste dans la part gratuite quotidienne de Workers AI (plafond compté par le site).

**Dans l'interface :** un seul point d'entrée, le bouton ✦ « Demander à l'IA » (panneau présent sur toutes les pages). En tête du panneau : « IA connectée : <modèle> » ou « Réponses calculées ».

**À faire par Romain :** dans Cloudflare (projet Pages, Réglages, Liaisons), **garder la liaison `AI`** (Workers AI) : l'IA du site en a besoin. Les variables `MISTRAL_KEY`, `GROQ_KEY`, `GEMINI_KEY`, `OPENROUTER_KEY`, `IA_SERVEUR`, `IA_WORKERS_AI` et `*_MODEL` ne servent plus et peuvent être supprimées. Facultatif : `IA_NEURONES_JOUR`, `IA_QUESTIONS_JOUR` pour changer les plafonds.

## Pour la maintenance

| Quoi | Où |
|---|---|
| Réponses calculées | `cf/site/ia.js` (`localCopilot`, `localAssist`, `chercheLecons`), `ficheFaits` (analyse.js, contexte.js) |
| IA du site | serveur : `cf/src/iasite.mjs` (`/api/ia/etat`, `/api/ia/rediger`, plafonds, modèles) ; navigateur : `cf/site/m/monia.js` (`miaEtat`, `miaAppel`, `iaRediger(tâche, faits, { question })`, `miaCopilote(q)`, page `/espace/ia`) |
| Consignes envoyées au modèle | `cf/src/consignes.mjs` + `cf/src/regles.mjs`, écrites par `build.mjs` dans `/data/prompts.json` (tâches : demande, expliquer, assistant, comparaison, veille, portefeuille, annonce, bilan) |
| Panneau ✦ | `cf/site/m/orchestre.js` (`orcIaOpen`, `orcIaAsk(q, { rediger })`) ; la fiche (`ficheDemander`) et les ETF y envoient leurs questions |
| Anciennes routes d'IA | `/api/assistant`, `/api/demande`, `/api/resume`, `/api/actu/clair`, `/api/ia/etat`, `POST /api/veille` : réponse 410 avec un message clair (`iaRetiree` dans `worker.mjs`) |
| Tests | `tests/t_ia.py` (réponses calculées), `tests/t_monia.py` (IA du site simulée : réponses, limites, aucune consigne dans le navigateur), `tests/t_compte.mjs` (serveur : Workers AI simulé, plafonds) |

Rien n'est gardé dans le navigateur. Une ancienne clé (`localStorage["bilan.monia"]`, connexions OpenRouter ou par clé) est effacée au chargement.

## Ce qui a été retiré le 29 octobre 2026
IA installée sur l'appareil (WebLLM, Qwen) ; saisie de clé multi-fournisseurs (`m/iacle.js`) ; toute l'IA du serveur (`cf/src/llm.mjs`, `ia.mjs`, `demande.mjs`, `actu.mjs`, commentaire de la semaine par le serveur, rotation Mistral, Groq, Gemini, OpenRouter et Workers AI, compteur de neurones) ; quotas d'IA (`LIMITS`, `quota()` de `compte.mjs`) ; préchauffage `data/ia_prechauffe.mjs` et rédaction « En clair » par le robot de l'actualité ; résumé détaillé des PDF de l'AMF (il demandait Workers AI). Les textes « En clair » déjà publiés restent affichés.
