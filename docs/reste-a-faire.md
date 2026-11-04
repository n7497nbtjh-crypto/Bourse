# Ce qu'il reste à faire (4 novembre 2026)

## Mise à jour du 4/11 après-midi
- **Comptes 2025 des sociétés étrangères cotées à New York** : FAIT. 44 fiches passées à 2025 (TSMC, Shinhan, KB, Woori, Posco, KEPCO, SK Telecom, KT, LG Display, UMC, Chunghwa, Petrobras, Itaú, América Movil, Femsa, Cemex…). Restent en retard parmi les 300 (hors SEC) : BHP, Sobi, Orlen, PKO, NAB, UniCredit, Intesa, Enel (hors SEC). Prochains chantiers proposés : actualité européenne en anglais, Corée (OpenDART) et Japon (EDINET) avec une clé créée par Romain, grandes allemandes par leur rapport officiel.
- **Premium** : fait (voir `docs/premium-2026-11.md`). Reste à Romain : liens Stripe et clés, avocat pour les conditions d'abonnement.
- **Pages /question** : 11 en ligne (5 ajoutées). Écartées pour l'instant : luxe (le mot « luxe » ramène Aperam et Pluxee), Allemagne (aucun rendement lu), télécoms et dette (dette mal relevée pour certaines sociétés).
- **Xtrackers** : le site ne donne ses chiffres (frais, encours, indice) qu'après une page d'accès à accepter, et son répertoire de données est interdit aux robots (robots.txt : /etfdata/). Pas collecté. **WisdomTree** refuse les robots (403). **VanEck** : site injoignable depuis l'environnement, délai de 25 s demandé entre deux pages. **Vanguard** (fr.vanguard) autorise les robots, mais seul le site professionnel existe en France : les 127 pages d'ETF passent aussi par une page de déclarations à confirmer, et les chiffres arrivent par un service de données interne chargé par la page. Mêmes limites qu'Xtrackers : à ne faire qu'avec une source officielle ouverte (fiche PDF par ISIN, comme HSBC) si on en trouve une. Logos Xtrackers, VanEck, Franklin, WisdomTree : non récupérés pour les mêmes raisons.


Bilan de la nuit du 3 au 4 novembre, puis les six chantiers demandés par Romain, chacun avec une décision proposée, les étapes et ce que ça coûte. Les chiffres viennent des sources citées en bas ; à revérifier avant de les mettre sur le site.

## Fait cette nuit

- **Style** : les dernières pages qui détonnaient sont alignées : la Communauté a des onglets en pastilles, et le bandeau de « Demander » prend toute la largeur. Les autres pages secondaires avaient déjà le bandeau jaune et les cartes à contour noir. Les 55 leçons de l'Académie ne sont pas refaites, puisqu'elles ne sont plus mises en avant.
- **Fiches entreprises** : deux erreurs de collecte corrigées à la source. Un rapport publié dans une autre devise ne se mélange plus aux autres : Genmab affichait −84 % de ventes en 2023 parce que 2022 était en couronnes danoises et 2023 en dollars. Un rapport ancien sur un autre périmètre (activité vendue, nouvelle présentation) n'est plus collé aux années récentes. Cela touche par exemple Bolloré 2022, OCI 2022, Aker 2022, Société Générale 2021 et Asseco Poland 2019. Les 22 fiches « à vérifier » qui ne viennent pas de la SEC ont été relues ; le robot appliquera la règle aux autres au fil de ses passages.
- **Textes** : un nouveau contrôle relit 49 pages. Il cherche les tirets cadratins, le tutoiement, la ponctuation, les mots répétés et les mots inconnus du dictionnaire. Une seule vraie faute trouvée et corrigée : « médianedu secteur » dans Comparer. Deux points restent :
  - les mentions légales contiennent encore des cases à remplir (« SIREN », « SIRET », nom) : c'est à Romain de le faire, voir `docs/conformite.md` ;
  - certains titres d'annonces officielles s'affichent en anglais dans l'Actualité (exemple : Pandox).
- **Ménage** : le code de l'ancienne fiche et d'autres fonctions inutilisées ont été retirés (app.js passe de 426 à 374 ko), ainsi que 22 règles CSS mortes. Tous les contrôles et l'audit complet sont passés avant la mise en ligne.

## 1. Réseaux sociaux (enklair_ sur X, Instagram, TikTok)

**Décision proposée** : un seul format, répété chaque jour de Bourse : « un chiffre, sa médiane, la source ». Les images sont déjà fabriquées chaque jour par le robot `posts.yml` (à télécharger dans GitHub, rien n'est publié tout seul). Les 20 idées de vidéos de `docs/acquisition.md` (E3) restent la réserve.

Étapes :
1. Romain publie à la main, 15 minutes par jour, avec un lien suivi (`utm_source`) vers la fiche concernée.
2. Chaque lundi, il regarde sur la page privée /x quels messages ont fait venir des visiteurs. Au bout d'un mois, on garde les deux formats qui marchent et on arrête le reste.
3. Ensuite seulement, une vidéo verticale par semaine (trois images de 3 secondes, montées dans CapCut).

Coût : nul en argent, 15 minutes par jour. Interdits rappelés : jamais « achetez », jamais de prédiction.

## 2. Stratégie publicitaire

**Décision proposée** : pas de publicité payante tant que le site n'a pas 1 000 visites par semaine sans pub et que le tunnel (visite, puis compte, puis Premium) n'est pas mesuré. Sinon, on paie pour des visiteurs dont on ne sait pas ce qu'ils deviennent.

Ensuite, dans l'ordre :
1. **Google** : la Search Console, et cinq pages de réponse de plus par mois (`/question/…`, liste dans `data/questions.json`).
2. **Assistants IA** : le connecteur MCP inscrit dans les annuaires (`mcp/PUBLIER.md`, à faire par Romain). C'est la différence d'ENKLAIR : votre IA lit les comptes officiels.
3. **Un premier test payant**, seulement quand le tunnel est mesuré : 50 € de publicité TikTok ou Meta sur la meilleure vidéo du mois, vers une seule page. On arrête si le coût par compte créé dépasse ce que rapporte un abonné.

Avant toute pub sur la Bourse : l'avis d'un avocat sur la frontière information / recommandation (voir `docs/strategie-2027.md`, risque 1). Les règles de publicité financière de l'AMF et des plateformes s'appliquent.

## 3. Leçons pour le Canada, l'Allemagne, l'Italie et l'Espagne : FAIT (4/11)

Aucun de ces pays n'a de PEA : chacun a désormais ses leçons (épargne de précaution, comptes, impôt, arnaques, quiz), dans `cf/site/data/academie-pays.json`, et son calcul simplifié de l'impôt sur `/simulateurs/pea-cto` (`PAYS_FISC` de `m/pays.js`). Le pays est détecté automatiquement (Cloudflare) ou choisi en bas de page.
- Canada : CELI (7 000 $ en 2026), REER (18 % du revenu, 33 810 $ au plus), gain en capital imposé à 50 %, AMF du Québec.
- Allemagne : Depot et Sparplan, forfait de 1 000 €, 26,375 %, exonération partielle de 30 % des ETF d'actions, Vorabpauschale (taux de base 3,20 % en 2026), BaFin.
- Italie : 26 % (12,5 % titres d'État), PIR (40 000 € par an, 200 000 € au total, cinq ans), droit de timbre 0,20 %, taxe de 0,20 % sur les actions italiennes depuis 2026, CONSOB.
- Espagne : barème de l'épargne de 19 % à 30 %, traspaso des fonds (pas des ETF), plan de pension 1 500 €, CNMV.
Les leçons sont en français : pour toucher les habitants de ces pays au-delà des francophones, il faudra traduire le site (`docs/international.md`). Montants à revoir chaque année.

## 4. Les cours de Bourse

Aujourd'hui, une feuille Google remplie par la fonction GOOGLEFINANCE donne des cours en différé d'environ 20 minutes, sans clé et sans frais. Le widget TradingView affiche les graphiques. Ça fonctionne, mais c'est fragile : Google peut limiter la feuille, et il n'y a pas d'historique propre.

**Décision proposée** : garder la feuille Google, et ajouter une seule source payante en secours, en choisissant Marketstack Basic plutôt qu'EODHD.
- **Marketstack Basic** : 9,99 $ par mois, 10 000 requêtes par mois, fin de journée et 10 ans d'historique, utilisation commerciale permise. C'est l'abonnement déjà prévu (`data/marketstack.mjs`). Il suffit d'un cours de clôture par entreprise et par jour, regroupé en requêtes par lots.
- **EODHD** : 19,99 $ par mois pour les cours mondiaux, mais l'offre standard est pour un **usage personnel**. Pour un site avec un abonnement payant, il faut un contrat commercial sur devis. Le code est prêt (`data/eodhd.mjs`), mais pas la licence.

Romain prend l'abonnement et saisit lui-même la clé dans GitHub (jamais par le site). Coût : environ 10 $ par mois.

## 5. Plus d'entreprises et d'ETF (HSBC notamment)

**ETF HSBC : FAIT (4/11)**, 38 ETF HSBC au catalogue (fiches officielles en français). Reste : leur performance (pas d'historique officiel lu), le logo HSBC, et Xtrackers, Vanguard, VanEck.

Note d'origine : aucun n'était suivi le 4/11 au matin. Le site lit iShares, Amundi, Invesco et SPDR, plus quelques fonds d'autres émetteurs. Vérifié cette nuit : HSBC publie une fiche officielle en PDF par fonds, accessible par son ISIN (frais, encours, indice, date de création, politique de dividende). On peut donc faire un lecteur HSBC comme pour les autres émetteurs (`data/etf_emetteurs.mjs`, lecture du PDF avec pdftotext). Une contrainte : leur fichier robots.txt demande d'espacer fortement les visites. Le lecteur doit donc tourner lentement (quelques fiches par passage du robot, chaque semaine), et la liste des fonds viendra de leur prospectus. Coût : une session, sans frais. Même méthode pour Xtrackers, Vanguard et VanEck, dont la performance manque déjà.

**Entreprises** : 48 des 300 plus grosses n'ont pas de comptes (surtout en Asie : Samsung, TSMC 2025, Reliance, ICBC…), et 13 ont des comptes de plus de 15 mois.
- Pour l'Italie et la Pologne, ce n'est pas un défaut du site : filings.xbrl.org n'a pas encore les rapports 2025 d'Intesa, UniCredit, Enel ou Orlen (vérifié cette nuit).
- **Décision proposée** : les comptes de ces entreprises ne viendront que d'une source payante de données fondamentales. EODHD Fundamentals coûte 59,99 $ par mois, avec le même problème de licence commerciale. À ne prendre que si les mesures montrent que ces fiches sont demandées.
- En attendant, la fiche affiche honnêtement « comptes pas encore relevés ».

## 6. Les actualités en direct dans la fiche : FAIT en grande partie (4/11)

Fait : section « L'année en cours » de la fiche (trimestres de l'année, face aux années précédentes) pour 1 164 sociétés américaines (SEC) ; France : robot `trim-eu.yml`, 12 sociétés confirmées, 3 affichées (Bouygues, Haulotte, Assystem), le nombre montera avec les publications. Reste : le bénéfice des sociétés européennes (seulement semestriel), les autres pays d'Europe (Oslo, Nasdaq Nordic, Londres).

Texte d'origine :

Le site lit déjà les annonces officielles : AMF, SEC, Oslo, Nasdaq Nordic et FCA, avec leurs chiffres extraits (`data/actu_analyse.mjs`). Il lit aussi les trimestres SEC des sociétés américaines. Mais le verdict de la fiche ne s'appuie que sur les derniers comptes annuels.

**Décision proposée**, en trois marches :
1. **Sur la fiche, un bloc « Depuis les derniers comptes »** en haut de l'étape concernée : la dernière annonce de résultats, avec ses chiffres face au même trimestre de l'an dernier, la date et la source. Ces chiffres existent déjà dans `actu-analyse.json`. Ils sont affichés à côté du verdict annuel, sans le modifier, et clairement datés.
2. **Les quatre derniers trimestres cumulés** pour les sociétés américaines (SEC, déjà relevés). La croissance et la marge « sur 12 mois glissants » sont montrées à côté du chiffre annuel, en le disant.
3. **Pour l'Europe**, les résultats semestriels publiés au format ESEF sont rares. On peut lire les chiffres dans les communiqués officiels déjà collectés, comme pour les dividendes européens. C'est fiable seulement si le chiffre est relu ; affichage « publié le … dans le communiqué » avec le lien.

Règle à garder : un chiffre trimestriel ou tiré d'un communiqué ne remplace jamais un chiffre audité. Il est daté, sourcé et présenté comme tel. Coût : marche 1 en une session ; marches 2 et 3 en une session chacune.

## Sources (consultées le 4/11/2026)

- Allemagne : Abgeltungsteuer et Sparer-Pauschbetrag 2026, steuerschroeder.de (rechtsstand juillet 2026) et § 20 et § 32d EStG.
- Italie : imposition à 26 % et PIR, money.it et fiscoinvestimenti.it (mises à jour 2026).
- Espagne : base del ahorro 2026, raisin.com/es-es (mai 2026) et awaketrader.com (tranche à 30 % en 2026).
- EODHD : eodhd.com/pricing (offres et usage personnel).
- Marketstack : marketstack.com/pricing.
- HSBC : fiche officielle PDF par ISIN sur assetmanagement.hsbc.fr, et robots.txt du même site.
