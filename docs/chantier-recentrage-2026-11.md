# Chantier « recentrage » (décidé par Romain le 13/11/2026)

Feuille de route à suivre pas à pas. À relire au début de chaque session avant de toucher au code.

## Pourquoi
Romain, 13/11 : « on fait trop de choses, il vaut mieux se concentrer sur moins de robots et plus efficace », « il faut alléger massivement, supprimer complètement du code ».
Le site se recentre sur : présentation et ergonomie, fiches, classements, comparatifs, actualités expliquées par l'IA, agenda. Maquette validée à faire évoluer : `docs/maquettes/menu-outils-v1.html`.

## Ce qui reste
- **Menu** : Actualités · Entreprises · ETF · Outils. À droite : Mon espace, Premium. Plus de rubrique « Apprendre ».
- **Outils, seul endroit où ils apparaissent** (rien dans l'agenda, l'accueil ou ailleurs) : Classements, Comparer des entreprises, Comparer deux ETF, Agenda des résultats, Calendrier des dividendes, Lexique. Idées reçues : supprimée (réponse de Romain, 13/11).
- **Fiches** entreprises et ETF (le lexique sert toujours aux définitions au clic).
- **IA, trois usages seulement** : 1) sujets « Le monde » de l'actualité (serveur, toutes les 3 heures) ; 2) résumé de la presse d'une entreprise dans le fil d'actualité ; 3) explication d'une annonce officielle.
- **Mon espace** : compte, favoris, réglages, abonnement.

## Ce qui est supprimé du code
- Réponses de Romain du 13/11 : aucun abonné payant ; tout supprimer (portefeuille, rapport, alertes, connecteur, export) ; Idées reçues supprimée ; PEA ou compte-titres supprimée ; « Pourquoi ENKLAIR » supprimée ; **« Les marchés du jour » gardée** (Romain, 13/11 : « justement la première fait le cœur de ce sur quoi on va se concentrer »).
- Apprendre (`apprendre4.js`, `apprendre5.js`, `parcours.js`), PEA ou compte-titres (`pays.js` : garder seulement ce dont les fiches ont besoin).
- Outils : simulateur d'épargne, coût des frais, Et si j'avais investi, Vérifier une offre, répartition (`simulateur4.js`, `sijavais4.js`, `verifier4.js`, `repart4.js`, `outils.js`, `outils2.js`, `outils2_calc.js` : garder les calculs utilisés par Comparer deux ETF).
- Pronostics et communauté (`communaute.js`, `cf/src/communaute.mjs`), « Ce qui s'est passé hier ».
- Portefeuille et radiographie (`portefeuille.js`, `portefeuille4/5/6.js`).
- Rapport de la semaine (`rapport8.js`, `synthese.js`, exemple figé), alertes de cours (`cf/src/push.mjs`, tâche du soir d'`espace.mjs`), connecteur (`cf/src/mcp.mjs`), export CSV.
- IA : panneau ✦ « Demander à l'IA » (`orchestre.js`, copilote de `monia.js`), bouton de question de la fiche, questions du comparateur, bilan des favoris (veille), commentaire du portefeuille et du rapport.

## Pièges repérés avant de commencer
- **Les sujets « Le monde » passent par le code du rapport** : `mondeDe` (cf/src/rapport8.mjs) et `faitsSynthese` (cf/src/synthese.mjs). Avant de supprimer le rapport, sortir ce qui sert à l'actualité dans un module à part (`cf/src/monde.mjs`), le tester, puis seulement supprimer le reste.
- **`iaRediger` vit dans `monia.js`** avec le copilote : garder l'appel, retirer le panneau.
- **Chaque module redéclare des fonctions d'app.js** : avant de supprimer une fonction, `grep -n "function NOM\|NOM(" cf/site/app.js cf/site/m/*.js`.
- **Adresses supprimées** : pas de lien mort. Le serveur renvoie les anciennes adresses vers la page la plus proche (/outils ou l'accueil) ; plan du site, `sitemap`, `llms.txt` et `meta()` de worker.mjs mis à jour.
- **Base de données** : aucune table supprimée (comptes, favoris, abonnements). Les tables inutiles restent en place, sans code qui les lise.
- **Abonnés payants** : s'il y en a, ne rien retirer de ce qu'ils ont payé sans que Romain les ait prévenus. Les pages légales (CGV) décrivent le contenu du Premium : à mettre à jour par Romain.
- **Robots** : ils fusionnent avec `-X theirs`. Ne pas supprimer un fichier de données pendant qu'un robot tourne ; arrêter le robot d'abord.

## Outil : le code mort
`node scripts/code-mort.js` liste les fonctions et constantes que plus rien n'appelle (`--noms` pour le détail, `--supprimer` pour les retirer). Il est prudent : un nom est gardé dès que le mot apparaît quelque part dans du code vivant, même dans une chaîne. Il retire aussi les anciennes versions d'une fonction redéclarée par un module chargé plus tard, sauf si un script chargé entre les deux la capture. Méthode : couper d'abord les points d'entrée d'une page (routeur, `ROUTES_EXTRA`, liens), puis lancer l'outil jusqu'à zéro, puis `node --check`, build, relecture et audit.

## Méthode (à chaque étape)
1. Une étape = un sujet = un commit, pour pouvoir revenir sur une seule étape.
2. Avant de supprimer : lister ce qui appelle le code (grep), supprimer, `node --check`, `node build.mjs` puis `git checkout -q cf/site/data/gf*.csv`.
3. Tests : `node scripts/check-doublons.js`, `node scripts/check-coherence.js`, `node tests/t_coherence.mjs`, `node scripts/relire-pages.js` ; serveur modifié : `npx esbuild cf/src/worker.mjs --bundle --format=esm --outfile=/tmp/w.js`. Retirer ou adapter les tests des fonctions supprimées (ne jamais garder un test qui passe « à vide »).
4. Vérifier à l'écran (390 et 1440 px) les pages qui restent : accueil, une fiche, actualité, chaque outil, Premium, Mon espace.
5. Montrer une capture à Romain, en quelques lignes, puis passer à l'étape suivante.
6. Ne jamais dire « terminé » sans l'avoir testé en ligne après le déploiement.

## Étapes
0. **Filet de sécurité** : point de retour = commit `fb7f6ff4` (l'étiquette git `avant-recentrage-2026-11-13` existe en local seulement, l'envoi d'étiquettes est refusé) ; relevé de départ (lignes de code, nombre de pages, de robots, poids du site) pour mesurer le résultat.
1. **Menu et onglet Outils** (visible, sans suppression) : `nav.js`, nouvelle page Outils d'après la maquette, liens vers les outils retirés de l'accueil, de l'agenda et des fiches.
2. **Pages simples supprimées** : Apprendre, PEA ou compte-titres, simulateurs, Et si j'avais investi, Vérifier une offre, répartition, pronostics, « hier ». Redirections en place.
3. **IA réduite à trois usages** : panneau ✦, questions de la fiche et du comparateur, veille. `consignes.mjs` et `docs/ia.md` nettoyés.
4. **Actualité détachée du rapport** : `cf/src/monde.mjs`, tests, vérification en ligne de `/api/monde`.
5. **Portefeuille, rapport, alertes, connecteur, export supprimés** ; page Premium et Mon espace réécrits pour l'offre recentrée (prix : décision de Romain, lien Stripe créé par lui).
6. **Serveur** : routes mortes retirées de `worker.mjs`, `espace.mjs` allégé.
7. **Robots** : arrêt de ceux qui ne servent plus (à décider un par un en lisant ce qu'ils alimentent : `espace.yml`, `rapports-site.yml`, `posts.yml`, `og.yml`, `outils2.yml`, `facteurs.yml`…). Les robots gardés (comptes, cours, actualité, agenda, logos, ETF, État, Réveil) sont listés dans la page État.
8. **Grand nettoyage** : CSS mort de `site.css` et `composants.css`, tests, `tests/audit.py`, `CLAUDE.md`, `docs/architecture.md`, `docs/premium-2026-11.md`.
9. **Relecture complète** (compétence `bilan-mise-en-ligne`, toutes les fiches en deux tailles) et bilan chiffré avant / après pour Romain.

## Après le chantier
- Actualité : sources françaises et européennes, classement par importance pour un lecteur français.
- Classements : capitalisations fausses à corriger (AngloGold Ashanti, Gold Fields, Turkcell, H World, ZTO Express relevées le 13/11).
- Horloge extérieure à GitHub pour les robots (Cloudflare), jeton à créer par Romain.

## Suivi
| Étape | État | Date | Commit |
|---|---|---|---|
| 0 | fait | 13/11 | fb7f6ff4 ; départ : 57 modules (2,14 Mo avec app.js), CSS 548 Ko, serveur 21 fichiers (908 Ko), 24 robots, 59 tests, 36 routes |
| 1 | fait (menu et page Outils ; liens vers les outils ailleurs : retirés au fil des étapes 2 à 5) | 13/11 | voir journal |
| 2 | fait : pages supprimées, redirections, code de base retiré par l'outil `scripts/code-mort.js` (271 déclarations, 269 Ko), données et robot des outils supprimés. Restent liés aux étapes 3 et 5 : leçons citées par `ia.js`, `mcp.mjs` et le rendu serveur (`academie.json`, `commencer.json`, `parcours.json`) | 13/11 | voir journal |
| 3 | fait côté navigateur : panneau ✦, page « Demander », page « L'IA du site », questions de la fiche, de la fiche ETF et du comparateur, bilan des favoris, suggestion de la recherche. `ia.js` passe de 153 à 14 Ko. Reste pour l'étape 6 : consignes et routes du serveur devenues inutiles. À déplacer à l'étape 5 : `iaFicheContexte` (rapport8.js) sert à l'explication des annonces. Quatrième usage découvert : la traduction des annonces étrangères (`/api/ia/traduire`), gardée avec l'explication des annonces | 13/11 | voir journal |
| 4 | fait : `cf/src/monde.mjs` (choix des titres, IA, fusion des sujets, `/api/monde`) et `cf/src/semaine.mjs` (calendrier et variation de la semaine), tous deux indépendants du rapport ; `tests/t_monde.mjs` ajouté à la mise en ligne. `rapport8.mjs` et `synthese.mjs` les importent en attendant leur suppression (étape 5) | 13/11 | voir journal |
| 5 | fait : navigateur (portefeuille, rapport, alertes, connecteur, export, idées reçues ; Premium à formule unique 19 € par an ; Mon espace réduit au compte ; robot `espace.yml` supprimé) puis serveur avec l'étape 6 | 13/11 | 52962780 puis voir journal |
| 6 | fait : supprimés `rapport8.mjs`, `synthese.mjs`, `mcp.mjs`, `push.mjs`, `communaute.mjs`, `veille.mjs`, `amf.mjs`, `demo-index.mjs` ; `espace.mjs` 75 → 35 Ko (compte, favoris, mesures, état du site) ; consignes réduites aux trois usages (27 → 8 Ko) ; routes retirées : /mcp, /api/push, /api/communaute, /api/veille, /api/amf, /api/ia/presse, /api/rapport-exemple, /api/espace/{tache,bilan,rapport,notifs,preferences,reco,mcp} ; `clotures` (robot des cours) déplacé dans `semaine.mjs`. Outils : `scripts/code-mort-serveur.js`, `scripts/noms-non-declares.js`. Restent en base D1, non lus : tables `bilans`, `notifs`, `mcp_cles`, `veille`, colonnes portefeuille et profil (à purger par Romain s'il le souhaite) | 13/11 | voir journal |
| 7 | fait : 24 → 20 robots. Supprimés : `espace.yml` (étape 5), `outils2.yml` (étape 2), `cours.yml` (Marketstack : écrivait chaque jour un fichier vide que rien ne lisait, et republiait le site), `posts.yml` (images du jour pour les réseaux, jamais publiées). `rapports-site.yml` : de 4 fois par jour à une fois par semaine. `donnees.yml` : relevé des opérations des dirigeants retiré (plus affiché). Gardés : donnees, actu, etf, etf-hist, logos, ancres, trim-eu, esef-sites, eulerpool, facteurs, wikidata, og, etat, reveil, site, rapports-site ; outils à la main : sonde, diag, amf-docs, eulerpool-test | 13/11 | voir journal |
| 8 | fait : CSS 549 → 280 Ko (3 825 sélecteurs morts retirés par `scripts/css-mort-tout.js`, 102 captures comparées point par point avant et après) ; restes de l'Académie et des courtiers retirés du navigateur, du serveur et de `build.mjs` (données `academie*.json`, `commencer.json`, `parcours.json`, `courtiers.json` supprimées) ; titres de pages et redirections du serveur nettoyés ; tests des fonctions disparues supprimés (39 fichiers) ; CLAUDE.md, `docs/architecture.md`, `docs/ia.md`, `docs/premium-2026-11.md` et la consigne `bilan-module` mis à jour | 13/11 | voir journal |
| 9 | fait : relecture visuelle de toutes les fiches (6 592 pages, 3 296 fiches en deux tailles, 0 problème), 3 296 fiches calculées (0 problème), audit 96 pages en trois tailles (0 problème, 0 erreur JS), relecture 44 pages, 102 captures identiques avant et après le ménage du CSS. **Avant → après** : code du navigateur 2,14 Mo → 1,03 Mo ; modules 57 → 41 ; CSS 549 → 280 Ko ; serveur environ 418 → 155 Ko (20 → 14 fichiers) ; robots 24 → 20 ; tests 59 → 39 fichiers | 13/11 | voir journal |
