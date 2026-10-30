# bilan. (Repère Bourse)

Site d'information boursière pour débutants : factuel, sans conseil d'investissement, sources affichées.
En ligne : https://repere-bourse.pages.dev (Cloudflare Pages + Worker + D1, déployé par GitHub Actions).
Propriétaire : Romain. Répondre en français, simplement, sans jargon technique inutile.

## Façon de travailler (règles de Romain, à respecter dans chaque session)
- **Économiser les crédits.** Le 28-29 octobre 2026, une dizaine d'agents lancés en parallèle ont consommé environ 40 € pour des résultats jugés décevants. Donc :
  - pas d'agents (sous-agents, Task, Agent) sauf si Romain le demande explicitement ;
  - un seul sujet à la fois, le plus visible d'abord ; pas de chantier de plusieurs heures ;
  - avant une tâche longue ou coûteuse, dire ce qu'elle coûtera et demander ;
  - lectures ciblées (`grep -n`, `sed -n`), jamais relire `cf/site/index.html` (540 ko) en entier ;
  - peu de captures d'écran ; `python3 tests/audit.py` (long) une seule fois, juste avant de pousser.
- **Montrer le résultat** : une capture avant/après de ce qui a changé, en quelques lignes, puis demander la suite.
- **Ne jamais dire « terminé » sans l'avoir testé.** Ne rien inventer (chiffres, sources, résultats de tests).

## Ce que Romain veut pour le site
- Mot d'ordre : **professionnel, inspirer confiance**. Clair, ordonné, visuel, pas de pavés de texte, rien de « bricolé », rien qui fasse « IA ».
- Il **n'aime pas la présentation actuelle** du site et des fiches entreprises (29/10/2026). Sujets connus : deux rangées d'onglets superposées sur la fiche, indicateurs noyés dans du texte, colonne de droite vide, page longue où tout a le même poids, graphiques trop gros ou amateurs.
- Son cahier d'audit fait référence : `docs/audit-2026-10.md` (plan P0/P1/P2). Navigation voulue : Découvrir / Explorer / Analyser / Mon espace. Accueil plus court, actions principales en premier.
- Verdict d'abord, détail ensuite (« approfondir » au clic). Ne pas retirer d'information : la rendre plus compréhensible.
- Il adore les **médianes du secteur** et les **zones vertes / rouges**. Toujours expliquer et interpréter pour un débutant, sans le prendre pour un enfant.
- Direction artistique : `DESIGN.md` fait référence (papier crème, Fraunces pour h1/h2 seulement, Plex Sans partout ailleurs, chiffres en chasse tabulaire sans police mono (30/10), vert acide seul accent, couleur seulement quand elle a un sens, aucune capitale espacée, pas de petites courbes décoratives).
- **« La jeunesse ne lit pas »** (30/10) : capter l'attention par le visuel. Chiffre, jauge, pastille et verdict en deux mots visibles ; les phrases d'explication repliées (« Pourquoi ? », « Le détail »). Rien n'est retiré, tout reste au clic.
- Favoris bien visibles. Concurrents affichés avec comparaison. PEA / compte-titres expliqués.
- Simplicité et coût nul : aucune IA payée par le site. Réponses calculées pour tous ; pour les questions libres, l'IA du site (Cloudflare Workers AI, part gratuite quotidienne, plafonnée par le site et par visiteur), sans compte ni clé ; connecteur MCP. Romain ne veut ni clé, ni connexion à un compte d'IA, ni intermédiaire. Pas de services payants multiples.

## Interdits
- Aucun conseil d'investissement ni prédiction ; pas de profil + titres proposés à la personne (« Pistes pour vous » reformulé sans personnalisation).
- TradingView autorisé depuis le 29/10/2026 (décision de Romain) : widget gratuit et bibliothèque Lightweight Charts, avec la mention prévue par leur licence. Pas de scraping de Boursorama, Yahoo, Zonebourse. Pas de contournement anti-robot.
- Ne jamais manipuler de clé secrète (Stripe, ADMIN_KEY, tokens) : Romain les saisit lui-même. Pas de compte de test en production, pas d'e-mail envoyé.
- Une donnée ancienne ou estimée ne doit jamais passer pour actuelle ou publiée.
- Pas de tiret cadratin dans les textes du site ; vouvoiement.

## Où trouver quoi
- `docs/architecture.md` (fonctionnement et coûts), `docs/ia.md` (IA), `docs/audit-2026-10.md` (audit et plan).
- Compétences du dépôt (`.claude/skills/`) : `bilan-module` (modifier le site), `bilan-mise-en-ligne` (tester et déployer), `bilan-sonde` (lire un site externe, collectes).
- Refonte du 30/10 (prompt de Romain, lots 1 à 6) : quatre portes (Apprendre, Marchés, Outils, Mon espace), accueil en quatre écrans, fiche en une seule page (niveau 1 puis « Tous les chiffres » en plis), script principal dans `cf/site/app.js` (sorti de index.html). Contrôles : `node scripts/check-coherence.js` (accueil ↔ fiches), `node scripts/check-doublons.js` (verdict une fois, zéro onglet), `node scripts/check-ia.js` (10 questions contre le site en ligne, après déploiement).
- `CHANTIERS.md` : contrats entre modules (fonctions partagées, formats des fichiers de données).
- Données (30/10) : `tests/t_coherence.mjs` (cohérence de toutes les fiches, à lancer avant chaque mise en ligne) ; `data/sec_trim.mjs` écrit les trimestres SEC dans `cf/site/data/trim/<id>.json` (affichés dans « Depuis la clôture » sur la fiche) ; Eulerpool (trimestriels Europe/Asie) en panne 502 depuis le 30/10 matin, test prêt dans `.github/workflows/eulerpool-test.yml` ; Marketstack attend le plan Basic.
- Rapport de la semaine : `synPageHTML` dans `m/synthese.js` (grands chiffres, actualité avec le contexte de `contexte.json`, lecture de l'IA du site via la tâche « bilan », simulations du portefeuille, valeurs en liste dépliable).
