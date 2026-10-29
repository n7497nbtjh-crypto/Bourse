# Architecture, déploiement et coûts de bilan.

Document de référence (29 octobre 2026). La première partie se lit sans connaissances techniques ; la seconde donne les détails pour la personne qui maintient le site. Les prix ont été vérifiés le 29 octobre 2026 sur les pages officielles citées en bas de page.

---

## Partie 1. L'essentiel, en clair

### Ce qu'est le site, techniquement

bilan. est une **application web** : un site qu'on ouvre dans n'importe quel navigateur, sur téléphone ou ordinateur, sans rien installer. Une fois la première page chargée, la navigation se fait dans le navigateur lui-même, sans recharger la page : c'est ce qu'on appelle une application d'une seule page (SPA, *single page application*). Le site peut aussi s'installer sur l'écran d'accueil d'un téléphone comme une application (PWA).

Il repose sur quatre briques :

| Brique | Rôle | Image simple |
|---|---|---|
| **Cloudflare Pages** | Héberge les fichiers du site (pages, scripts, données) et les distribue depuis le serveur le plus proche du visiteur. | La vitrine et l'entrepôt |
| **Worker Cloudflare** (`_worker.js`) | Petit programme qui répond aux demandes qui ne sont pas de simples fichiers : comptes, quotas, IA du serveur, titre de chaque page pour Google. | Le guichet |
| **D1** | Base de données (comptes, favoris, bilans de la semaine, quotas, réponses déjà rédigées). | Le classeur |
| **GitHub Actions** | Robots qui collectent les données officielles chaque jour, testent le site et le mettent en ligne. | L'équipe de nuit |

### Pourquoi une application web plutôt qu'autre chose

- **Plutôt qu'une application mobile (App Store, Google Play)** : pas de commission, pas de validation par Apple ou Google à chaque mise à jour, un seul code pour tous les appareils, et Google peut lire et référencer les fiches des entreprises. L'installation sur l'écran d'accueil reste possible (PWA).
- **Plutôt qu'un site classique avec un serveur qui fabrique chaque page** : les données des entreprises changent une fois par jour au plus. On les calcule donc à l'avance (robots GitHub) et on les sert comme de simples fichiers : c'est rapide, gratuit et presque impossible à faire tomber.
- **Plutôt qu'un outil « sans code » (Wix, Webflow, Bubble)** : ces outils ne savent pas lire les comptes officiels ESEF ou SEC, calculer des médianes de secteur sur 2 800 entreprises ou faire tourner une IA dans le navigateur. Ils facturent aussi à l'abonnement.

### Avantages et inconvénients

| | Avantages | Inconvénients |
|---|---|---|
| **Performance** | Fichiers servis depuis le réseau mondial de Cloudflare ; après le premier chargement, la navigation est instantanée ; les calculs (médianes, filtres, réponses de l'IA locale) se font dans le navigateur, sans attente réseau. | Le premier chargement est lourd : la page principale pèse environ 540 ko, plus les données. Sur un vieux téléphone en 4G faible, l'ouverture prend quelques secondes. |
| **Maintenance** | Aucun serveur à surveiller, à mettre à jour ou à redémarrer. Les robots tournent seuls. Chaque mise en ligne est testée automatiquement. | Le code du site tient dans un très gros fichier (`index.html`) complété par des modules (`cf/site/m/*.js`) qui se remplacent les uns les autres : il faut de la discipline pour s'y retrouver (voir `CHANTIERS.md`). |
| **Expérience utilisateur** | Navigation fluide, fonctionne hors ligne en partie, installable, IA instantanée pour les questions courantes. | Sans JavaScript, le site n'affiche presque rien. Les moteurs de recherche reçoivent un titre et une description par page, mais pas tout le contenu. |
| **Évolution** | Ajouter une page ou un outil se fait dans un module séparé ; ajouter une source de données se fait dans un script de collecte séparé. Tout reste gratuit jusqu'à plusieurs milliers d'utilisateurs actifs. | Le palier gratuit a des plafonds précis (voir « Coûts ») ; le plus proche est le nombre de fichiers du site (20 000 en gratuit, environ 11 600 aujourd'hui). |

### Services indispensables et services remplaçables

| Service | Indispensable ? | Remplaçable par | Remarque |
|---|---|---|---|
| Cloudflare Pages | Oui (hébergement) | Netlify, Vercel, GitHub Pages pour la partie fichiers | Le Worker et D1 sont propres à Cloudflare : changer d'hébergeur demande de réécrire le guichet. |
| Worker Cloudflare | Oui pour les comptes, quotas, titres des pages | Un petit serveur Node (Railway, Fly.io…) | Gratuit jusqu'à 100 000 requêtes par jour. |
| D1 | Oui pour Mon espace | SQLite ou PostgreSQL ailleurs | Sans D1, le site reste consultable mais sans comptes. |
| GitHub (dépôt et Actions) | Oui (code, collecte, mise en ligne) | GitLab CI, ou des tâches planifiées Cloudflare | |
| **Workers AI** | **Non, facultatif depuis ce lot** | Mistral, Groq, Gemini, OpenRouter (gratuits), IA de l'appareil, clé personnelle du visiteur | Désactivable par la variable `IA_WORKERS_AI=off`. Voir `docs/ia.md`. |
| Mistral, Groq, Gemini, OpenRouter | Non | Les uns par les autres | Utilisés à tour de rôle, offres gratuites. |
| Stripe (Premium) | Non | Lemon Squeezy, Paddle | Seulement si l'offre Premium est ouverte. |
| Brevo, Resend, Mailjet (e-mails) | Non | Les uns par les autres | Seulement pour les e-mails de Mon espace. |
| Nom de domaine propre | Non | L'adresse gratuite `repere-bourse.pages.dev` | Recommandé pour la confiance (environ une dizaine d'euros par an, selon l'extension et le registraire). |

### Coûts prévisibles

Hypothèses : un utilisateur actif ouvre le site une dizaine de fois par mois, ce qui fait environ 50 passages par le Worker (pages et appels aux API) et 3 rédactions par l'IA du serveur (les réponses identiques sont gardées en cache, et la plupart des questions reçoivent une réponse calculée sans IA).

| Utilisateurs actifs par mois | Requêtes Worker par jour | Rédactions IA serveur par jour | Coût mensuel estimé |
|---|---|---|---|
| **100** | environ 170 | environ 10 | **0 €** |
| **1 000** | environ 1 700 | environ 100 | **0 €** (plus environ 4 $ de GitHub Actions si le dépôt reste privé, voir ci-dessous) |
| **10 000** | environ 17 000 | environ 1 000 | **5 à 10 $** en régime normal (offre Workers payante conseillée pour lever la limite de 10 ms de calcul par requête) ; **jusqu'à environ 30 $** si l'on choisit de payer un service d'IA au lieu des offres gratuites |

Ce qui ne dépend pas du nombre d'utilisateurs :
- **GitHub Actions** : le dépôt est privé. GitHub offre 12 $ de calcul par mois (environ 2 000 minutes sur Linux à 0,006 $ la minute). La collecte quotidienne (environ 34 minutes), l'actualité 5 fois par jour en semaine (environ 12 minutes à chaque fois), Mon espace et les mises en ligne font environ 2 500 à 3 000 minutes par mois : **dépassement d'environ 3 à 6 $ par mois**. Trois solutions gratuites : rendre le dépôt public (les minutes deviennent gratuites et illimitées sur les machines standard), espacer l'actualité (3 passages par jour), ou alléger la collecte quotidienne.
- **Données** : toutes les sources sont gratuites (comptes ESEF via filings.xbrl.org, SEC EDGAR, AMF, cours différés, taux de la BCE). Aucune licence de données payante.
- **Nom de domaine** : facultatif, quelques euros par mois au plus.

Points de vigilance :
1. **Nombre de fichiers** : 20 000 au plus par site en gratuit (100 000 avec une offre payante Cloudflare). Le site en compte environ 11 600 (quatre fichiers par entreprise). Ajouter un nouveau fichier par entreprise rapprocherait de la limite : préférer regrouper.
2. **Temps de calcul du Worker** : 10 ms par requête en gratuit. Les pages simples passent largement ; les tâches lourdes (bilan de la semaine, connecteur MCP) peuvent dépasser à forte charge. L'offre payante (5 $ par mois) passe à 30 secondes.
3. **Requêtes Worker** : 100 000 par jour en gratuit. Les fichiers (`/data/*`, `/m/*`) ne passent pas par le Worker grâce à `_routes.json` : ils sont gratuits et illimités.
4. **IA** : aucune facture possible sans décision. Workers AI est plafonné à 10 000 neurones par jour (`IA_NEURONES_JOUR`), les services externes sont utilisés sur leurs offres gratuites.

---

## Partie 2. Détails techniques

### Carte du code

```
cf/site/index.html        page unique : HTML, CSS, routeur route(), helpers globaux
cf/site/ia.js             IA locale à base de règles (localCopilot, localAssist, chercheLecons)
cf/site/calc.js           calculs financiers (simulations, TRI, volatilité, PEA/CTO)
cf/site/m/*.js            modules chargés après le script principal (ordre fixé en bas d'index.html)
cf/site/m/iacle.js        clé personnelle (BYOK), chaîne de repli de l'IA, page /espace/ia
cf/site/data/**           données publiées (générées par les robots)
cf/site/_routes.json      chemins servis sans passer par le Worker
cf/src/*.mjs              Worker, assemblé par `node build.mjs` en cf/site/_worker.js
  worker.mjs              routes /api/*, titres et descriptions des pages (meta)
  llm.mjs                 rotation des services d'IA du serveur (rediger)
  ia.mjs, demande.mjs, actu.mjs   points d'accès qui utilisent l'IA
  compte.mjs              Premium, quotas journaliers (LIMITS), e-mails
  espace.mjs, synthese.mjs        Mon espace, bilan de la semaine
data/*.mjs                scripts de collecte (lancés par .github/workflows/*.yml)
tests/                    tests unitaires (node) et de pages (Playwright)
```

### Flux d'une visite

1. Le navigateur demande `/entreprise/lvmh`. Le Worker renvoie `index.html` avec le titre, la description et la FAQ structurée propres à LVMH (statut 200, ou 404 pour une page inconnue).
2. Le script principal charge les données (`/data/univers.json`, `/data/societes/lvmh.json`…) directement depuis Pages, sans passer par le Worker.
3. Les modules `m/*.js` remplacent ou enveloppent les fonctions du script principal, puis `route()` affiche la page.
4. Les appels `/api/*` (cours, comptes, IA) passent par le Worker, qui lit ou écrit dans D1.

### Procédure de déploiement de bout en bout

**Prérequis** : Node 22, Python 3.12 avec Playwright (`pip install playwright && playwright install chromium`), un compte GitHub, un compte Cloudflare (gratuit).

**1. Développement local**
```
git clone <dépôt> && cd Bourse
NO_SLEEP=1 node tests/fixtures/site_data.mjs   # données de test si cf/site/data est vide
node build.mjs                                  # assemble cf/site/_worker.js, prompts.json, sitemap.xml
npx wrangler@3.114.0 pages dev cf/site --d1 DB  # site local sur http://localhost:8788, base D1 locale, sans IA du serveur
```
Les fichiers générés (`cf/site/_worker.js`, `cf/site/sitemap.xml`, `cf/site/data/prompts.json`) ne se committent pas.

**2. Tests** (les mêmes que le robot de mise en ligne, plus les tests de pages)
```
node tests/t_calc.mjs && node tests/t_worker.mjs && node --no-warnings tests/t_compte.mjs && node --no-warnings tests/t_llm.mjs
python3 tests/audit.py        # toutes les pages, 3 largeurs : 0 problème attendu
python3 tests/t_ia.py         # pertinence de l'IA locale : 100 % attendu
python3 tests/t_iacle.py      # clé personnelle et point d'entrée IA unique
```

**3. Mise en ligne**
Un `git push` sur la branche `main` qui touche le site déclenche `.github/workflows/site.yml` : construction, tests, puis `wrangler pages deploy cf/site --project-name=repere-bourse`. Environ une minute. Les données sont rafraîchies par leurs propres robots (`donnees.yml` chaque matin, `actu.yml` 5 fois par jour en semaine, `espace.yml` chaque soir, `etf.yml` et `facteurs.yml` chaque mois).

**4. Première installation sur un nouveau compte Cloudflare**
1. Cloudflare > Workers & Pages > Créer > Pages > « Direct upload », nom `repere-bourse`.
2. Storage & Databases > D1 > Créer une base (par exemple `bilan`). Les tables se créent seules au premier appel.
3. Projet Pages > Settings > Bindings : ajouter **D1** avec le nom `DB`. Facultatif : **Workers AI** avec le nom `AI` (sert aussi à lire les PDF de l'AMF).
4. Projet Pages > Settings > Variables and secrets (type « Secret » pour les clés) :

| Nom | Obligatoire | Rôle |
|---|---|---|
| `ADMIN_KEY` | Oui | Protège les tâches des robots (`/api/espace/tache`, envois). Une longue chaîne aléatoire. |
| `HASH_SALT` | Conseillé | Sel des identifiants anonymes de quota. |
| `MISTRAL_KEY`, `GROQ_KEY`, `GEMINI_KEY`, `OPENROUTER_KEY` | Non | IA du serveur, offres gratuites (au moins une conseillée). |
| `IA_WORKERS_AI` | Non | `off` pour ne jamais utiliser Workers AI. |
| `IA_SERVEUR` | Non | `off` pour couper toute l'IA du serveur. |
| `IA_NEURONES_JOUR` | Non | Plafond Workers AI (10 000 par défaut, le palier gratuit). |
| `MISTRAL_MODEL`, `GROQ_MODEL`, `GEMINI_MODEL`, `OPENROUTER_MODEL` | Non | Changer de modèle sans toucher au code. |
| `MAIL_FROM`, `BREVO_KEY`, `RESEND_KEY`, `MAILJET_KEY`, `MAILJET_SECRET` | Non | E-mails de Mon espace. |
| `STRIPE_SECRET`, `STRIPE_LINK_MENSUEL`, `STRIPE_LINK_UNIQUE`, `PRIX_MENSUEL`, `PRIX_UNIQUE` | Non | Premium. |
| `SITE_URL` | Non | Adresse publique utilisée dans les e-mails. |

5. GitHub > Settings > Secrets and variables > Actions :
   - Secrets : `CLOUDFLARE_API_TOKEN` (jeton Cloudflare avec le droit « Cloudflare Pages : Edit »), `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_KEY` (la même que sur Cloudflare).
   - Variable : `CONTACT` (adresse e-mail exigée par la SEC et filings.xbrl.org dans l'en-tête des requêtes).
6. Lancer une fois « Mise à jour des données » puis « Mise en ligne du site » dans l'onglet Actions.

**5. Nom de domaine**
Projet Pages > Custom domains > ajouter le domaine. Si le domaine est géré par Cloudflare, tout est automatique ; sinon, ajouter l'enregistrement CNAME indiqué chez le registraire. Le certificat HTTPS est fourni gratuitement. Mettre ensuite `SITE_URL` à jour, puis relancer « Mise en ligne du site » pour régénérer `sitemap.xml`. Une clé personnelle d'IA déjà enregistrée par un visiteur reste liée à l'ancienne adresse (le stockage du navigateur dépend de l'adresse) : il devra la saisir à nouveau.

**6. Retour arrière**
Cloudflare > projet Pages > Deployments : chaque mise en ligne est conservée ; « Rollback » remet la précédente en un clic.

### Contraintes techniques à connaître

- Un module `m/*.js` ne doit jamais redéclarer avec `const`/`let` un nom déjà déclaré dans `index.html` (tout le module tomberait). Les règles complètes sont dans `CHANTIERS.md`.
- Toute nouvelle page doit être ajoutée dans `meta()` de `cf/src/worker.mjs`, sinon elle part avec un statut 404.
- Le conteneur de développement des agents ne joint que GitHub et npm : les lectures de sites externes passent par la sonde (`.github/workflows/sonde.yml`).

### Sources des prix (consultées le 29 octobre 2026)

- Workers, KV, D1 : https://developers.cloudflare.com/workers/platform/pricing/ (Workers gratuit : 100 000 requêtes par jour, 10 ms de calcul par requête ; payant : 5 $ par mois minimum, 10 millions de requêtes incluses puis 0,30 $ le million, 30 millions de ms de calcul puis 0,02 $ le million ; D1 gratuit : 5 millions de lignes lues et 100 000 écrites par jour, 5 Go ; D1 payant : 25 milliards de lignes lues et 50 millions écrites par mois inclus, puis 0,001 $ et 1 $ le million, stockage 0,75 $ le Go au-delà de 5 Go).
- Limites des Workers : https://developers.cloudflare.com/workers/platform/limits/ (gratuit : 50 sous-requêtes par appel ; payant : 30 s de calcul par défaut, jusqu'à 5 min).
- Pages : https://developers.cloudflare.com/pages/platform/limits/ (500 constructions par mois, 20 000 fichiers en gratuit, 100 000 en payant, 25 Mio par fichier, 100 domaines par projet) et https://developers.cloudflare.com/pages/functions/pricing/ (« requests to static assets are free and unlimited »).
- Workers AI : https://developers.cloudflare.com/workers-ai/platform/pricing/ (10 000 neurones gratuits par jour, puis 0,011 $ les 1 000 neurones) et https://developers.cloudflare.com/workers-ai/features/markdown-conversion/ (conversion en Markdown gratuite pour la plupart des formats).
- GitHub Actions : https://docs.github.com/en/billing/concepts/product-billing/github-actions (gratuit pour les dépôts publics ; dépôt privé avec GitHub Free : 12 $ de calcul inclus par mois ; Linux 2 cœurs 0,006 $ la minute).
- Durées réelles des robots : mesurées sur les 100 dernières exécutions du dépôt (API GitHub, 29 octobre 2026).
- IA externes : voir `docs/ia.md`.
