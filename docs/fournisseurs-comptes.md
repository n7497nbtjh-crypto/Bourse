# Comptes des entreprises du monde entier : quel fournisseur ? (étude du 5/11/2026)

Besoin : comptes annuels (ventes, résultat, bénéfice, bilan) des sociétés qui manquent, **affichés sur un site public avec une offre payante**. La licence d'affichage public décide de tout : la plupart des offres bon marché sont « usage personnel » et interdisent d'afficher les chiffres sur un site.

Ce qui manque au 5/11 (univers de 2 852 sociétés) : **96 fiches sans comptes en Allemagne, 86 au Japon, 58 en Suisse**, 21 en Chine, 17 en Inde, 12 en France, 9 aux îles Caïmans, 7 en Finlande, 6 en Australie, 5 en Corée… et environ 130 fiches bloquées aux comptes 2024 (Belgique 26, Italie 24, Pologne 20…).

## Les offres, licence d'affichage comprise (prix publics, vérifiés le 5/11)

| Fournisseur | Prix avec droit d'affichage public | Monde entier ? | Remarque |
|---|---|---|---|
| **Eulerpool, offre Builder** | **990 $ par an** (99 $ par mois) | 85 000 sociétés, 130 pays | Afficher les données dans son produit est explicitement permis, sans mention obligatoire. |
| Twelve Data, offre Venture | 149 $ par mois (environ 1 480 $ par an) | Couverture des comptes hors États-Unis non précisée | Les offres individuelles interdisent tout usage pour une entreprise. |
| Tiingo | 200 $ par mois (startups) | Surtout les États-Unis | — |
| ROIC.AI Enterprise | 600 $ par mois (5 000 visiteurs par jour au plus) | Monde entier | Les offres à 29 $ et 89 $ n'ont pas de licence commerciale. |
| EODHD | Sur devis | Monde entier | Les offres à 59,99 $ et 99,99 $ par mois sont réservées à l'usage personnel. |
| FMP (Financial Modeling Prep) | Sur devis (accord d'affichage obligatoire) | Monde entier seulement sur l'offre la plus chère | — |
| Finnhub | 3 500 $ par mois pour les comptes mondiaux | Monde entier | Les offres à 50 $ par marché sont réservées à l'usage personnel. |
| Intrinio | 9 600 $ par an | États-Unis seulement | — |
| LSEG, FactSet, Bloomberg | De 30 000 $ à plus de 100 000 $ par an | Monde entier | — |

Écartés :
- **Marketstack** : uniquement des cours, pas de comptes.
- **EDINET** : ne fonctionne pas pour nous (décision de Romain).
- **Allemagne et Suisse** : aucune source officielle ouverte (aucun dépôt ESEF allemand sur filings.xbrl.org, pas d'ESEF en Suisse).
- **Contournement des sites qui refusent les robots** : refusé.

## Essai réel d'Eulerpool (5/11, clé gratuite d'évaluation déjà en place, robot « Test Eulerpool »)

Le service répond de nouveau ; il était en panne depuis le 30/10.

**Concordance avec les comptes officiels du site, exercice 2025 :**
- **ventes** : identiques pour LVMH (80 807), SAP (36 800), Microsoft (331 839) et Air Liquide (26 940) ;
- **bénéfice** : identique ou très proche (écarts de définition, par exemple la part du groupe).

**Comptes obtenus pour des fiches qui n'en ont pas :**
- Allianz, Mercedes-Benz, Nestlé, Lindt, Nintendo, Keyence ;
- Samsung (ventes 2025 : 333 606 milliards de wons), Reliance, TCS ;
- CATL, Kweichow Moutai, Hon Hai, SKF ;
- de 18 à 40 ans d'historique selon la société.

**Défauts relevés (à filtrer avant tout affichage) :**
- **Prévisions mêlées aux comptes** : des « exercices » 2027 à 2031 apparaissent. Il faut ne garder que les exercices clos, sinon une estimation passerait pour un chiffre publié (interdit).
- **Assureurs** : chiffres incohérents (AIA : ventes de 20 milliards en 2024, négatives en 2022). Banques et assurances seraient écartées.
- **Trimestres peu fiables** : doublons de dates (Microsoft, Keyence, TCS), un trimestre à 0 (LVMH), semestres présentés comme trimestres (Nestlé). Seuls les comptes annuels seraient utilisés.
- **Couverture incomplète** : BYD est introuvable.
- **Disponibilité** : une panne de plusieurs jours fin octobre. L'historisation mensuelle des comptes, déjà en place, limite le risque.

## Recommandation

**Eulerpool Builder, 990 $ par an (environ 860 €)**, utilisé seulement pour combler les trous :
- comptes annuels des fiches sans comptes officiels (Allemagne, Japon, Suisse, Chine, Inde, Corée) ;
- années manquantes des fiches bloquées en 2024.

Les sources officielles (ESEF, SEC, AMF, PDF) restent prioritaires partout où elles existent. Chaque chiffre Eulerpool serait :
- marqué comme tel sur la fiche ;
- contrôlé : exercice clos, bénéfice inférieur aux ventes, sauts d'une année à l'autre, recoupement avec l'officiel quand il existe.

**Avant de payer, Romain demande par écrit à Eulerpool** (le Builder couvre l'affichage, mais deux points ne sont pas écrits) :
1. Le site peut-il garder les chiffres annuels dans ses propres fichiers et les mettre à jour chaque semaine ? Leur page compte une « copie permanente » comme de la redistribution.
2. Que peut-on garder si l'abonnement s'arrête ?

**Alternative si la réponse ne convient pas : Twelve Data Venture (149 $ par mois)**, après un essai de couverture comme celui fait pour Eulerpool.

## Sources

- Eulerpool : eulerpool.com/financial-data-api/pricing et /licensing
- Twelve Data : twelvedata.com/pricing
- Tiingo : api.tiingo.com/products/fundamental-data-api
- ROIC.AI : roic.ai/blog (comparatifs, juin 2026)
- EODHD : eodhd.com/financial-apis/commercial-vs-personal-license-use
- FMP : site.financialmodelingprep.com/pricing-plans et terms-of-service
- Finnhub : finnhub.io/pricing-fundamental-data
- Intrinio : fitgap.com (prix public relevé)
- Essai : robot `.github/workflows/eulerpool-test.yml`, journal du 5/11 (paramètre `essais`, liste d'ISIN en JSON)
