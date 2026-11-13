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
| 2 | en cours : 2a fait (redirections, 9 modules de pages supprimés, tests adaptés) ; 2b à faire (code de base de ces pages dans app.js, parcours des leçons dans la recherche, outils.js, outils2.js, reco.js, communication.js, provenance.js, pays.js, données et CSS associés) | 13/11 | voir journal |
| 3 | à faire | | |
| 4 | à faire | | |
| 5 | à faire | | |
| 6 | à faire | | |
| 7 | à faire | | |
| 8 | à faire | | |
| 9 | à faire | | |
