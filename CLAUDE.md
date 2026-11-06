# ENKLAIR

Site d'information boursière pour débutants : factuel, sans conseil d'investissement, sources affichées.
**https://enklair.com** (ancienne adresse repere-bourse.pages.dev redirigée ; réseaux : enklair_). Cloudflare Pages + Worker + D1, déployé par GitHub Actions (dépôt `n7497nbtjh-crypto/Bourse`).
Propriétaire : Romain. Répondre en français, simplement, sans jargon technique inutile.
**Détail de chaque changement, par date : `docs/journal.md`** (chercher avec `grep -n`, ne pas tout lire).

## Façon de travailler (règles de Romain)
- **Économiser les crédits** : pas d'agents sauf demande explicite ; un sujet à la fois, le plus visible d'abord ; dire le coût avant une tâche longue ; lectures ciblées (`grep -n`, `sed -n`), jamais `site.css`, `composants.css` ni `app.js` en entier ; peu de captures.
- **Maquette avant de coder** tout changement visible important (fichier HTML dans `docs/maquettes/`, vrais chiffres), puis l'installer quand Romain dit ok.
- **Montrer le résultat** (capture), en quelques lignes, puis demander la suite.
- **Ne jamais dire « terminé » sans l'avoir testé.** Ne rien inventer (chiffres, sources, résultats). Un saut de chiffre n'est pas une erreur tant qu'une source ne le dit pas (Micron ×3,6 en 2026 était vrai).

## Ce que Romain veut
- Professionnel, inspirer confiance ; clair, visuel, pas de pavés, rien de « bricolé » ni qui fasse « IA ». « La jeunesse ne lit pas » : chiffre, jauge, pastille, verdict en deux mots ; le détail au clic. Ne rien retirer : rendre compréhensible.
- Il adore les **médianes du secteur / des rivales** et les **zones vertes / rouges**. Expliquer pour un débutant sans le prendre pour un enfant.
- Direction artistique (`DESIGN.md`) : Bricolage Grotesque + Inter, fond blanc, jaune #FFE14D, contours noirs, étiquettes penchées, bandeau jaune en tête de page. Pas de fond crème.
- Coût nul : IA du site = Cloudflare Workers AI (part gratuite), pas de clé ni de compte d'IA.

## Interdits
- Aucun conseil d'investissement ni prédiction ; aucune liste de titres proposée selon un profil.
- Jamais « chère », « bon marché », « prix élevé » : dire « PER plus haut / plus bas », « le marché y croit / doute / est partagé ». (PER en vert / rouge face à la médiane : décision de Romain du 5/11, contre l'avis donné ; à faire valider par un avocat.)
- Pas de scraping de Boursorama, Yahoo, Zonebourse ; **jamais de contournement anti-robot** (Romain l'a demandé, refusé) ; respecter robots.txt. **api.nasdaq.com interdit les robots** : `data/dividendes_us.mjs` l'utilise encore (signalé, à remplacer). TradingView autorisé (widget gratuit, mention de licence).
- Ne jamais manipuler de clé secrète (Stripe, ADMIN_KEY, tokens) ; pas de compte de test en production ; pas d'e-mail envoyé.
- Une donnée ancienne ou estimée ne doit jamais passer pour actuelle.
- Jamais de concurrent nommé sur le site (6/11, Romain) ; comparer à des types de services.
- Pas de tiret cadratin dans les textes du site ; vouvoiement.
- Japon : ne plus proposer EDINET. Clé gratuite Eulerpool : accord écrit demandé par Romain (usage commercial).

## Où est quoi (pages, toutes en « v4 »)
Script principal `cf/site/app.js` (routes, données, recherche, Premium, Mon espace). Chaque page a son module dans `cf/site/m/`, chargé après et qui remplace la fonction d'app.js :
- Fiche entreprise `fiche4.js` (+ `annee4.js` « Ses derniers trimestres », `fiche-commun.js`) ; sur téléphone, cartes fermées (`f4Mobile`). Composants partagés `composants.js` (`ekEtape`, `ekPoints`, `ekColonnes`, `EK_DEF` définitions…).
- Accueil `accueil4.js` · Entreprises `entreprises3.js` · Comparer `comparer4.js` (5 comparaisons par semaine en gratuit) · ETF `etf4.js`, liste `etfs4.js` · Marchés `marches4.js` · Actualité `actu4.js` (données `actu.js`) · Agenda `agenda4.js` · Dividendes `dividendes4.js` · Classements `classements4.js` · Découverte de la semaine `decouverte.js` · Apprendre `apprendre5.js` · Idées reçues `idees4.js` · Lexique `lexique4.js` · Outils `outils4.js`, `simulateur4.js`, `sijavais4.js`, `verifier4.js`, `recouv4.js`, `repart4.js` (calculs dans `outils.js`, `outils2.js`) · Premium `premium5.js` (version du 5/11 ; 6/11 soir : **aucun concurrent nommé**, comparatif avec des types de services, aussi sur /pourquoi-bilan ; /premium/merci reste dans app.js) · Menu `nav.js` (cinq rubriques depuis le 6/11 : Communauté ajoutée) · Portefeuille `portefeuille4.js` (couche sur `portefeuille.js`) · Rapport de la semaine `rapport8.js` (`synPageV8`, 6/11 soir, maquette `docs/maquettes/rapport-semaine-v6.html` ; serveur `cf/src/rapport8.mjs` : rivales, monde, radiographie, achats programmés ; outils et bouton « Expliquer » dans `synthese.js`) · Pays et PEA `pays.js` (PEA montré seulement en France) · Bandeau des autres pages `v3pages.js`.
- CSS : `cf/site/composants.css` pour tout le nouveau (classes `ek-` et préfixes de page) ; `cf/site/site.css` = ancien style, encore utilisé en partie (règles `!important` : `#app h1` impose sa taille, les boutons de `#app` sont arrondis ; viser plus précis ou utiliser des liens `<a>`).
- Serveur `cf/src/` (worker.mjs, cours.mjs, espace.mjs alertes et rapport, iasite.mjs, mcp.mjs connecteur, quota.mjs, compte.mjs).
- Données : robots `data/*.mjs` lancés par `.github/workflows/` (donnees.yml chaque jour : comptes SEC/ESEF, cours, index ; eulerpool.yml le mardi ; actu.yml ; etf.yml ; rapports-site.yml ; logos.yml…). Fiches dans `cf/site/data/societes/<id>.json`, index `societes.json`. Univers : `data/univers.mjs` + `data/lots/*.mjs`. Rivales : `data/concurrents.json` (à la main, prioritaire) + `data/concurrents_auto.json` (5/11, `node data/rivales_auto.mjs` : même code SEC `data/sic.json` — rempli par `data/sic.mjs` via le robot Sonde, la SEC refuse un en-tête sans contact —, même branche Wikidata, mots du métier communs ; à relancer après l'ajout d'entreprises), fusionnés par build.mjs. 3 005 fiches sur 3 338 face à au moins 3 rivales le 5/11 (1 343 avant).
- Chiffres faux connus : `data/corrections.json` (retirés à chaque relecture) ; sauts réels vérifiés : `data/sauts-verifies.json`.
- Docs : `docs/architecture.md`, `docs/ia.md`, `docs/conformite.md` (à faire par Romain et un avocat), `docs/premium-2026-11.md` (gratuit / Premium), `docs/fournisseurs-comptes.md`, `docs/reste-a-faire.md`, `docs/strategie-2027.md`.

## Gratuit / Premium (décision de Romain : une fonction est gratuite en entier ou Premium)
Gratuit (6/11) : 5 fiches complètes par jour (en-tête et 5 repères toujours ouverts ; favoris, Premium et robots non comptés : `f4Quota` de fiche4.js), actualité, agenda, outils, Apprendre, portefeuille, Comparer (3 par semaine), IA du site 3 questions par semaine. Premium (39 €/an, 4,90 €/mois) : toutes les fiches, rang dans le secteur, rapport de la semaine, alertes (chute de plus de 5 %, e-mail si un service est configuré), connecteur MCP, classements, radiographie du portefeuille, export CSV, IA 30 questions par jour. **Paiement Stripe branché le 5/11** (deux liens de paiement : mensuel 4,90 € et un an 39 € ; retour vers /premium/merci?session_id=… ; clé restreinte : sessions Checkout et abonnements en lecture, portail client en écriture ; portail client activé, annulation en fin de période). **Espace obligatoire avant de payer** : sans connexion, « Choisir cette formule » mène à /espace?payer=mensuel|unique, puis `moi()` (app.js) envoie vers le lien Stripe avec `prefilled_email` ; un code Premium du navigateur est rattaché au compte par `moi()` (/api/espace/premium). Résiliation : bouton « Gérer ou résilier mon abonnement » de la page Premium (portail Stripe). **E-mails (Brevo) pas encore branchés.**

## Avant de pousser (compétence `bilan-mise-en-ligne`)
`node build.mjs` puis `git checkout -q cf/site/data/gf*.csv` (ne jamais committer gf*.csv à la main) ; `node scripts/check-doublons.js`, `node scripts/check-coherence.js`, `node tests/t_coherence.mjs` ; fiche : `node scripts/check-fiches-tout.js` (les 3 300 fiches, 40 s) et **`node scripts/relire-visuel.js 0 tout`** (toutes les fiches en deux tailles, 10 min ; Romain : « vérifie toutes les pages, pas un échantillon »), `node scripts/relire-fiches.js 40` (0 problème attendu, lire le rapport) ; pages : `node scripts/relire-pages.js` ; serveur modifié : `npx esbuild cf/src/worker.mjs --bundle --format=esm --outfile=/tmp/w.js` ; puis une seule fois `timeout 590 python3 tests/audit.py` (0 problème). Captures locales : `scripts/_site.js` (`ouvrir`, `aller`). Pousser : `git pull -q --rebase --autostash origin main && git push -q origin HEAD:main`.

## Devises (5/11 soir, décision de Romain)
Sur la fiche, tout montant hors euro est converti en euros au taux BCE du jour et marqué « * » (`f4Md`, `f4Par`, `f4Cols` de fiche4.js) ; une seule note sous les repères (`.ek-fx`) ; cours de l'action dans sa devise avec « ≈ … €* » discret ; « sur 100 € » pour les rapports (sans devise). Plus jamais de « (≈ … €) » en ligne. Les tableaux de « Tous les chiffres » restent dans la devise des comptes.

## Pièges connus
- **Ne jamais ajouter un commentaire `//` au milieu d'une ligne de code** : il a coupé du code cinq fois. Vérifier `node --check` et un vrai passage.
- Les robots fusionnent avec `-X theirs` : ne pas corriger un cache ou l'index pendant qu'un robot tourne. `data/index_reparer.mjs` remet les sociétés qu'un robot ancien aurait effacées.
- Limite Cloudflare Pages : 20 000 fichiers (17 128 le 5/11 ; FAQ en 256 paquets). Prochains candidats : `data/wd`, `data/actu/c`.
- En JavaScript `null <= 0` vaut vrai.
- `cf/site/data/etf.json` est regénéré depuis `data/etf_catalogue.json`.
- Playwright figé en 1.64 dans les robots (la 1.65 a été publiée incomplète le 5/11).
- Wrangler 3.112.0 (la 3.114.0 publiait un Worker cassé). Clés du navigateur préfixées `bilan.` (ne pas renommer).
- Entreprises sans comptes : masquées du site (`SANS_COMPTES`), elles reviennent seules quand leurs comptes arrivent.

## En attente de Romain
Brevo (clé) ; un vrai paiement d'essai de bout en bout, puis remboursement ; accord écrit d'Eulerpool ; avocat (pages légales, couleurs du PER) ; remplacer le calendrier Nasdaq des dividendes ; réparer les feuilles Google 3 et 4 (aucun cours calculé) ; publier sur les réseaux (images du robot `posts.yml`).
