# bilan. : stratégie 2027 (rédigée le 31/10/2026)

Document interne pour Romain. Chaque chiffre de marché a sa source en fin de document ; chaque hypothèse est écrite comme telle. Rien ici n'est une promesse de résultat.

## 1. Diagnostic

**Ce qui est solide**
- Le produit gratuit couvre beaucoup : environ 2 450 entreprises avec comptes, médianes de secteur, zones vertes et rouges, comparateur, ETF, PEA / compte-titres, Académie, rapport de la semaine, IA du site gratuite, connecteur pour Claude et ChatGPT.
- La preuve est la marque : chaque chiffre renvoie à son document officiel, les chiffres douteux sont marqués « à vérifier », 0 contradiction entre l'accueil et les fiches (contrôle automatique).
- Le coût fixe est très bas : Cloudflare (gratuit à ce jour), robots GitHub Actions, aucune IA payée.

**Ce qui est fragile**
- **Personne ne connaît le site.** Pas de trafic mesuré avant cette semaine (compteurs anonymes posés le 31/10). Tout le reste dépend de ce point.
- **Qualité des données hors États-Unis.** Les comptes européens viennent des rapports ESEF ; certains postes sont mal relevés. Exemple trouvé le 31/10 : la dette de Vinci (6,7 Md€ relevés pour 17,3 Md€ de trésorerie, donc une « trésorerie nette » qui n'existe pas). Un seul cas de ce genre vu par un connaisseur peut ruiner la confiance.
- **Un seul développeur, une seule personne.** Chaque robot en panne (Eulerpool en 502 depuis le 30/10) se voit sur le site.
- **Le Premium n'a pas encore de preuve d'usage.** Aucun abonné à ce jour ; l'essai de 14 jours est prêt mais fermé.
- **Cadre juridique non validé** : information ou recommandation personnalisée (voir `docs/conformite.md`).

## 2. Positionnement

**Une phrase** : bilan. est le site où un débutant comprend une entreprise cotée en deux minutes, chiffres officiels à l'appui, comparée à la médiane de son secteur, sans qu'on lui vende rien.

**Pour qui** : les nouveaux investisseurs français, souvent jeunes, qui ouvrent un PEA ou achètent des ETF. Le marché existe et grandit :
- 7,29 millions de PEA fin 2025, et plus de 705 000 ouverts dans l'année 2025 (+19 %) (Banque de France, via pea.fr).
- 359 000 particuliers ont acheté des ETF au 3e trimestre 2025, dont 79 000 pour la première fois (AMF, tableau de bord n°20).
- L'âge moyen des investisseurs en ETF est passé de 41 à 38 ans entre fin 2024 et fin 2025 (AMF, rapporté par la presse).

**Face aux sites existants** : les sites d'analyse boursière vendent des abonnements de 24 à 49 € par mois (offres d'entrée et intermédiaires) et jusqu'à environ 200 à 250 € par mois pour les offres expertes ; ils visent des investisseurs déjà formés et donnent des avis ou des portefeuilles conseillés. bilan. reste à 4,90 € par mois ou 39 € par an, ne donne aucun avis d'achat, et explique. Ce n'est pas le même client : on ne cherche pas à prendre leurs abonnés, on cherche ceux qui n'oseraient pas y aller.

**Ce qu'on ne fera pas** : conseil, portefeuilles modèles, signaux d'achat, « top 5 à acheter », publicité de courtiers payée au clic, revente de données.

## 3. Développer, reporter, abandonner

| Développer (2027) | Reporter | Abandonner |
|---|---|---|
| Fiabilité des comptes européens (dette, trésorerie, marges) : contrôle automatique « à vérifier » étendu à la dette | Application mobile native (la PWA suffit) | Toute idée de conseil ou de sélection proposée à la personne |
| Pages de réponse (30 listées, 5 en ligne) : 5 de plus par mois | Communauté avancée (messages, réputation) : modération coûteuse | Données payantes multiples (un seul fournisseur payant au maximum) |
| Rapport de la semaine et alertes : la raison de revenir | Couverture Asie complète | Scraping de sites tiers |
| Connecteur pour Claude et ChatGPT : se faire citer par les IA | Traduction en anglais | Publicité display |
| X et vidéos verticales à partir de /x (15 minutes par jour) | Version entreprises / écoles | |

## 4. Modèle économique

### Hypothèses (toutes à remplacer par les mesures réelles dès qu'elles existent)
- Prix inchangés : 4,90 € par mois, 39 € pour 12 mois (paiement unique). Prix affichés TTC ; calcul en hors taxe avec une TVA de 20 % (hypothèse prudente : la franchise de TVA peut s'appliquer au début, à vérifier avec un comptable).
- Trois scénarios selon la part d'abonnés annuels et la durée moyenne d'un abonnement mensuel :
  - prudent : 40 % annuels, les mensuels paient 7 mois en moyenne ;
  - central : 60 % annuels, 9 mois ;
  - haut : 70 % annuels, 11 mois.
- Frais Stripe : 1,5 % + 0,25 € par paiement par carte européenne standard ; plus 0,7 % sur les abonnements récurrents (Stripe Billing). Les cartes premium et hors Europe coûtent plus : non comptées, marge d'erreur.
- Cloudflare : plan Workers Paid à 5 $ par mois (compté même s'il n'est pas encore nécessaire). IA du site : 10 000 Neurons gratuits par jour, puis 0,011 $ les 1 000 Neurons. Hypothèse d'usage : 30 questions rédigées par abonné et par mois, 1 500 Neurons par question. **C'est l'hypothèse la plus incertaine** : le compteur réel est dans `/api/espace/mesures` (champ `ia`).
- Coûts fixes annuels supposés : nom de domaine 15 €, médiateur de la consommation 120 €, part d'une consultation d'avocat 300 €. Aucun salaire, aucune donnée payante (EODHD ou Marketstack s'ajouteraient : prix à confirmer).
- Résultat avant cotisations sociales et impôt sur le revenu.

### Résultats (euros par an, arrondis)

| Abonnés | Scénario | Encaissé TTC | Hors taxe | Stripe | Cloudflare et IA | Reste avant cotisations |
|---|---|---|---|---|---|---|
| 500 | prudent | 18 100 | 15 100 | 900 | 2 750 | 11 000 |
| 500 | central | 20 500 | 17 100 | 900 | 2 750 | 13 000 |
| 500 | haut | 21 700 | 18 100 | 900 | 2 750 | 14 000 |
| 1 000 | prudent | 36 200 | 30 200 | 1 800 | 5 500 | 22 400 |
| 1 000 | central | 41 000 | 34 200 | 1 800 | 5 500 | 26 500 |
| 1 000 | haut | 43 500 | 36 200 | 1 800 | 5 500 | 28 500 |
| 5 000 | prudent | 180 900 | 150 800 | 9 200 | 27 300 | 113 800 |
| 5 000 | central | 205 200 | 171 000 | 8 900 | 27 300 | 134 300 |
| 5 000 | haut | 217 400 | 181 100 | 8 800 | 27 300 | 144 500 |
| 10 000 | prudent | 361 800 | 301 500 | 18 400 | 54 700 | 228 000 |
| 10 000 | central | 410 400 | 342 000 | 17 900 | 54 700 | 269 000 |
| 10 000 | haut | 434 700 | 362 300 | 17 700 | 54 700 | 289 500 |

**Lecture** : le poste qui compte n'est ni Stripe ni l'hébergement, c'est l'IA si elle est très utilisée. Deux leviers sans toucher au prix : le cache des réponses (posé le 31/10) et les réponses calculées sans modèle. Au-delà de 5 000 abonnés, il faut aussi une aide (support, modération) : non comptée.

**Combien de visiteurs pour 500 abonnés ?** Hypothèse à vérifier : 1 à 2 % des visiteurs réguliers paient. Il faudrait donc de l'ordre de 25 000 à 50 000 visiteurs réguliers. C'est le vrai chantier de 2027.

## 5. Feuille de route sur 12 mois

| Période | Objectif mesurable | Travaux |
|---|---|---|
| Nov.-déc. 2026 | Mentions légales complètes, médiateur, essai ouvert ; 1 000 visites par semaine | Identité éditeur, avocat (une consultation), `ESSAI_14J=1`, 3 messages X par jour, 5 pages de réponse de plus |
| Janv.-mars 2027 | Dette et trésorerie fiables sur les 300 plus grosses entreprises ; 30 pages de réponse en ligne | Contrôle automatique de la dette, correction de `data/esef.mjs`, Search Console |
| Avr.-juin 2027 | 100 abonnés payants ; rapport ouvert par 40 % des comptes | Alertes plus fines, vidéos verticales hebdomadaires, connecteur MCP présenté aux annuaires des assistants |
| Juil.-sept. 2027 | 300 abonnés ; taux de résiliation mensuel mesuré | Saison des résultats semestriels : pages « ce qui a été publié », comparaisons sectorielles |
| Oct.-déc. 2027 | 500 abonnés ; décision sur la suite (rester seul ou s'entourer) | Bilan d'un an, révision des prix seulement si les mesures le justifient |

## 6. Cinq risques

1. **Juridique** : être requalifié en conseil (recommandation personnalisée). Parade : avis d'avocat avant d'ouvrir l'essai à grande échelle ; garder la radiographie du portefeuille descriptive ; aucune recommandation.
2. **Chiffre faux visible** (type dette de Vinci). Parade : contrôles automatiques avant chaque mise en ligne, « à vérifier » plutôt qu'un chiffre sûr, bouton « Signaler une erreur ».
3. **Dépendance à Cloudflare et à ses règles gratuites** : depuis juillet 2026, certains modèles d'IA exigent le plan payant (les deux modèles du site, Mistral Small 3.1 et Qwen3 30B, ne sont pas dans cette liste au 31/10). Parade : surveiller la liste, prévoir 5 $ par mois, garder les réponses calculées sans IA.
4. **Sources de données qui ferment** (Eulerpool en panne, robots dépendants d'API gratuites). Parade : une source payante unique en secours (EODHD prêt), historisation mensuelle des comptes (en place).
5. **Visibilité nulle** : un bon site que personne ne trouve. Parade : 15 minutes par jour sur /x, pages de réponse, connecteur pour les IA, mesure chaque semaine du tunnel.

## 7. Les 30 prochains jours

1. Remplir l'identité de l'éditeur et choisir un médiateur (Romain).
2. Prendre rendez-vous avec un avocat sur la question « information ou recommandation » (Romain).
3. Corriger la dette mal relevée (Vinci et cas semblables) et ajouter un contrôle automatique (site).
4. Publier chaque jour les 3 messages de /x et noter ce qui fait venir des visiteurs (Romain, 15 minutes).
5. Mettre en ligne 5 pages de réponse de plus, en commençant par « dividendes du CAC 40 » une fois la liste exacte du CAC 40 en données (site).
6. Ouvrir l'essai de 14 jours (`ESSAI_14J=1`) quand les points 1 et 2 sont faits (Romain).
7. Relire le tunnel chaque lundi sur /x ; décider à J+30 de ce qu'on arrête.

## Sources
- Banque de France, STAT INFO PEA 2025 (avril 2026), chiffres repris par pea.fr : https://pea.fr/analyses/statistiques-pea/ et https://www.banque-france.fr/fr/statistiques/epargne/plan-depargne-en-actions-2025
- AMF, tableau de bord des investisseurs particuliers actifs n°20, octobre 2025 : https://www.amf-france.org/sites/institutionnel/files/private/2025-10/tb-suivi-evolution-investisseurs_n20_-octobre.pdf
- Âge moyen des investisseurs (AMF, rapporté) : https://www.broker-forex.fr/forum/viewtopic.php?id=7622
- Prix des abonnements d'un site d'analyse boursière (24 à 49 €, offre experte 199 à 249 € par mois selon la date) : https://www.detective-banque.fr/bourse/zonebourse-avis/ et https://letraderdudimanche.com/avis-zonebourse
- Frais Stripe en Europe : https://sellfy.com/fr/outils/calculateur-de-frais-stripe/ ; Stripe Billing 0,7 % : https://stripe.com/ch/billing/pricing
- Cloudflare Workers et Workers AI : https://developers.cloudflare.com/workers-ai/platform/pricing et https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
