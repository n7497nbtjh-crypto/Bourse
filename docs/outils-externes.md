# Outils complémentaires : Railway, Agent Skills, Graphify, 21st MCP, Strix

Étude du 29 octobre 2026 (section 10 du cahier des charges). Chaque produit a été identifié par recherche web avant d'être évalué, car plusieurs noms désignent des choses différentes. Règle appliquée : un outil n'est adopté que s'il apporte un bénéfice mesurable à bilan. et justifie la complexité qu'il ajoute.

## Synthèse

| Outil | Ce que c'est | Verdict |
|---|---|---|
| **Railway** | Hébergeur de serveurs et bases de données, payé à l'usage | **Pas maintenant.** Utile seulement si un jour un service doit tourner en continu hors Cloudflare. |
| **Agent Skills** | Format ouvert (dossier avec `SKILL.md`) pour donner des procédures à un agent IA de développement | **Maintenant, a minima.** Gratuit, sans effet sur le site ; formalise les règles de `CHANTIERS.md`. |
| **Graphify** | Outil libre qui transforme le code en graphe de connaissances interrogeable par un agent | **Plus tard, à l'essai.** Intéressant pour s'y retrouver dans `index.html` et les modules ; aucun effet sur le site. |
| **21st MCP** (21st.dev Magic) | Serveur MCP qui génère des composants React/Tailwind dans l'éditeur | **Pas du tout.** Le site n'utilise ni React ni Tailwind. |
| **Strix** | Agents IA libres de test d'intrusion (sécurité) | **Plus tard, une fois**, sur une copie du site, avant l'ouverture du Premium à grande échelle. |

Aucun de ces outils n'est nécessaire pour faire fonctionner le site. Aucun n'est ajouté au code dans ce lot.

---

## Railway

**Ce que c'est** : une plateforme d'hébergement (railway.com) qui fait tourner des conteneurs, des bases PostgreSQL, Redis, etc., à partir d'un dépôt GitHub. Facturation à l'usage. Le nom ne désigne pas autre chose dans ce domaine (à ne pas confondre avec les « railways » de programmation fonctionnelle).

- **Problème qu'il pourrait résoudre ici** : héberger un programme qui doit tourner en continu ou longtemps (par exemple un modèle d'IA ouvert, une collecte de plus de quelques minutes, une base PostgreSQL). Aujourd'hui, ces besoins sont couverts par Cloudflare (Worker, D1) et GitHub Actions.
- **Avantages** : très simple à déployer depuis GitHub, bases de données en un clic, journaux lisibles.
- **Limites** : pas de réseau de distribution mondial comme Cloudflare ; un serveur qui tourne en permanence coûte même sans visiteurs ; pas de carte graphique adaptée à l'IA à petit prix.
- **Coût** : offre gratuite avec 1 $ de crédit par mois ; Hobby 5 $ par mois (5 $ d'usage inclus) ; Pro 20 $ par mois (20 $ inclus). Au-delà : 10 $ par Go de mémoire et par mois, 20 $ par processeur virtuel et par mois, 0,05 $ par Go sortant, 0,15 $ par Go de disque et par mois. Un petit serveur Node de 0,5 Go tient dans l'offre Hobby ; un modèle d'IA de 8 milliards de paramètres demanderait au moins 8 Go de mémoire, soit environ 80 $ par mois en mémoire seule.
- **Impact sur l'architecture** : ajoute un deuxième hébergeur, un deuxième lieu de secrets et une latence entre Cloudflare et Railway.
- **Risques** : dépendance supplémentaire, facture variable, double maintenance.
- **Verdict : pas maintenant.** À reconsidérer seulement si un besoin réel de serveur permanent apparaît (par exemple une collecte qui dépasse les limites de GitHub Actions).

Sources : https://docs.railway.com/pricing/plans

## Agent Skills

**Ce que c'est** : un format ouvert, créé par Anthropic puis publié comme standard (agentskills.io), pour donner à un agent IA (Claude Code, et d'autres outils compatibles) des compétences sous forme de dossiers : un fichier `SKILL.md` (nom, description, instructions), plus des scripts ou documents facultatifs. L'agent ne lit les instructions complètes que lorsque la tâche correspond (« divulgation progressive »). Ce n'est pas un logiciel à installer sur le site.

- **Problème qu'il pourrait résoudre ici** : le site est construit par des agents IA qui travaillent en parallèle, avec des règles précises (modules `m/*.js`, pas de `const` sur un nom existant, fichiers générés à ne pas committer, sonde réseau, tests à lancer, ton des textes). Ces règles sont aujourd'hui dans `CHANTIERS.md` et répétées dans chaque consigne. Des compétences comme « ajouter un module », « ajouter une source de données », « vérifier une page » les rendraient automatiques et identiques pour tous les agents.
- **Avantages** : gratuit, simples fichiers texte versionnés dans le dépôt, aucune dépendance, réutilisable par plusieurs outils.
- **Limites** : n'apporte rien aux visiteurs directement ; une compétence mal tenue à jour induit les agents en erreur.
- **Coût** : 0 €.
- **Impact sur l'architecture** : aucun sur le site ; un dossier `.claude/skills/` dans le dépôt.
- **Risques** : très faibles.
- **Verdict : maintenant, a minima** : deux ou trois compétences qui reprennent `CHANTIERS.md` et la procédure de test de `docs/architecture.md`.

Sources : https://agentskills.io/

## Graphify

**Ce que c'est** : outil libre (Graphify-Labs/graphify, licences Apache 2.0 et MIT) qui transforme un dépôt de code, sa documentation et ses schémas en graphe de connaissances, interrogeable par un assistant de code (`/graphify`). Le code est analysé localement par tree-sitter, sans IA et sans rien envoyer ; seuls les documents (PDF, images) passent par un modèle. Il existe aussi une offre payante « Graphify Cloud » (essai de 14 jours). Le nom désigne aussi d'anciens outils de création de graphiques sans rapport.

- **Problème qu'il pourrait résoudre ici** : `index.html` fait environ 540 ko et plusieurs modules redéfinissent ou enveloppent les mêmes fonctions (`pageEntreprises`, `iaFetch`, `pageEspace`…). Savoir « quelle définition gagne » demande aujourd'hui des recherches manuelles (`grep`). Un graphe des fonctions et de leurs appels réduirait les erreurs de modification.
- **Avantages** : gratuit pour le code, fonctionne hors ligne, compatible avec Claude Code et une vingtaine d'assistants.
- **Limites** : analyse statique : les remplacements de fonctions à l'exécution (`window.f = function…`) risquent d'être mal compris ; il faut regénérer le graphe après chaque grosse modification.
- **Coût** : 0 € pour le code (Python 3.10 ou plus) ; coût du modèle de l'assistant pour les documents.
- **Impact sur l'architecture** : aucun sur le site ; un outil de développement.
- **Risques** : faibles ; ne rien envoyer de confidentiel dans la passe « documents ».
- **Verdict : plus tard, à l'essai** sur une copie du dépôt, et à garder seulement s'il répond correctement à « quelle définition de `pageEspace` est utilisée ? ».

Sources : https://github.com/Graphify-Labs/graphify

## 21st MCP (21st.dev Magic MCP)

**Ce que c'est** : un serveur MCP de 21st.dev (`npx @21st-dev/magic`) qui, depuis un éditeur (Cursor, Claude Code, VS Code…), génère des composants d'interface à partir d'une description, et donne accès à la bibliothèque de composants de 21st.dev. Les composants sont en React et TypeScript, avec shadcn/ui, Tailwind CSS et Radix. La génération se fait sur les serveurs de 21st.dev, avec une clé.

- **Problème qu'il pourrait résoudre ici** : accélérer la création d'éléments d'interface.
- **Avantages** : composants modernes et soignés, rapides à obtenir.
- **Limites** : bilan. n'utilise ni React, ni Tailwind, ni étape de compilation : chaque composant devrait être réécrit en HTML et CSS simples, avec les couleurs et typographies du site. Le style « bibliothèque de composants » s'éloigne de l'identité sobre du site.
- **Coût** : gratuit avec 2 copies de composant par jour ; Builder 6 $ par mois (facturé à l'année), Builder + IA à partir de 15 $ par mois (500 crédits d'IA), Team 7,50 $ par personne et par mois.
- **Impact sur l'architecture** : introduire React et Tailwind voudrait dire réécrire le site et ajouter une compilation. Utilisé seulement comme source d'inspiration, il n'a aucun impact.
- **Risques** : incohérence visuelle, dépendance à un service en ligne pour l'interface, licences des composants à vérifier.
- **Verdict : pas du tout** pour ce site.

Sources : https://21st.dev/pricing ; https://mcp.directory/blog/21st-dev-magic-mcp-complete-guide-2026

## Strix

**Ce que c'est** : Strix (usestrix/strix, licence Apache 2.0) est un ensemble d'agents IA libres qui testent la sécurité d'une application comme le ferait un attaquant : ils l'utilisent réellement (navigateur, proxy HTTP, terminal) et prouvent chaque faille par un exemple d'exploitation. Il faut Docker et une clé d'un service d'IA (OpenAI, Anthropic, Google, ou un modèle local via Ollama). Une offre gérée (Strix Cloud) et une offre entreprise existent. D'autres projets portent le même nom (outils réseau, bibliothèques) : il s'agit ici de celui-là.

- **Problème qu'il pourrait résoudre ici** : le Worker gère des comptes (mots de passe, sessions), un paiement (Stripe), des quotas et une communauté (messages publics). Une faille (contournement de quota, injection, fuite de données d'un compte) nuirait directement à la confiance, qui est le mot d'ordre du site.
- **Avantages** : trouve des failles réelles plutôt que théoriques ; peut tourner dans GitHub Actions.
- **Limites** : consomme beaucoup de jetons d'IA par analyse ; peut créer des comptes, publier des messages ou déclencher des envois : **interdit sur le site en production** (règle du projet). À lancer uniquement sur une copie locale (`wrangler pages dev`) ou un déploiement de test.
- **Coût** : logiciel gratuit ; le coût réel est celui du modèle d'IA utilisé pendant l'analyse (variable, de quelques euros à plusieurs dizaines selon la durée et le modèle ; nul avec un modèle local, mais moins efficace).
- **Impact sur l'architecture** : aucun sur le site ; un environnement de test séparé à prévoir.
- **Risques** : actions destructrices si on le pointe sur la production ; faux sentiment de sécurité si on l'utilise une seule fois.
- **Verdict : plus tard, une fois**, sur une copie du site, avant d'ouvrir Premium ou Mon espace à grande échelle ; puis après chaque changement important des comptes ou des paiements.

Sources : https://github.com/usestrix/strix ; https://docs.strix.ai/
