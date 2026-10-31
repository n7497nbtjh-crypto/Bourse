# Acquisition (5e passage, lot E, 31/10/2026)

Principe : faire venir des débutants par des réponses chiffrées, sans traceur tiers ni publicité payée.

## E1. Moteurs de recherche

- **Fiches** : titre « Action X : résultats, dividende et dette, expliqués » ; description avec les derniers chiffres publiés (année, chiffre d'affaires, marge d'exploitation, dette ou trésorerie nette) et la question « rentable, endettée, chère ? ». Calculée par le Worker (`descFiche`, `cf/src/worker.mjs`).
- **Données structurées** sur chaque fiche : FAQPage (existant, `data/faq_seo.mjs`), BreadcrumbList et Organization (nom, description, ISIN).
- **Pages de réponse** : liste dans `data/questions.json`, route `/question/<id>`, ajoutées au sitemap, liées depuis /classements. Classement calculé dans le navigateur sur les données du jour ; les chiffres marqués « à vérifier » sont écartés (`a.fiable`), les secteurs où l'indicateur n'a pas de sens aussi (`a.sauf`).
- **Mesure** : compteurs anonymes `src:moteur` (visite venue d'un moteur) par semaine, visibles sur /x et dans `/api/espace/mesures`. Pas de Search Console branchée par le site : Romain peut l'ajouter lui-même (vérification par fichier ou DNS), c'est gratuit.

| # | Question | État |
|---|---|---|
| 1 | Quelles entreprises françaises ont la meilleure marge ? | en ligne : /question/entreprises-francaises-meilleure-marge |
| 2 | Quelles actions françaises versent le plus gros dividende ? | en ligne : /question/plus-gros-dividendes-france |
| 3 | Quelles entreprises françaises n'ont pas de dette ? (en attente : la dette de certaines entreprises est mal relevée, Vinci par exemple) | à faire |
| 4 | Quelles sont les plus grosses entreprises françaises en Bourse ? | en ligne : /question/plus-grosses-entreprises-france-bourse |
| 5 | Quelles banques et financières européennes sont les plus rentables ? | en ligne : /question/finance-europeenne-plus-rentable |
| 6 | Quelles entreprises tech américaines grandissent le plus vite ? | en ligne : /question/tech-americaine-plus-forte-croissance |
| 7 | Le CAC 40 classé par marge | à faire |
| 8 | Les dividendes du CAC 40 en 2026 | à faire |
| 9 | Que contient un ETF MSCI World ? | à faire |
| 10 | MSCI World ou S&P 500 : quelles différences ? | à faire |
| 11 | LVMH, Hermès ou Kering : qui gagne le plus ? | à faire |
| 12 | TotalEnergies, Shell, BP : comparer les pétrolières | à faire |
| 13 | Airbus, Safran, Thales : l'aéronautique française comparée | à faire |
| 14 | BNP Paribas, Société Générale, Crédit Agricole : comparer les banques | à faire |
| 15 | Apple, Microsoft, Alphabet : comparer les géants | à faire |
| 16 | Les ETF éligibles au PEA les moins chers | à faire |
| 17 | Quels ETF S&P 500 sont éligibles au PEA ? | à faire |
| 18 | Les entreprises françaises qui relèvent leur dividende chaque année | à faire |
| 19 | La pharmacie européenne classée par marge | à faire |
| 20 | Le luxe européen classé par croissance | à faire |
| 21 | Les entreprises européennes de la défense en chiffres | à faire |
| 22 | Semi-conducteurs : qui a la meilleure marge ? | à faire |
| 23 | Les actions françaises au PER le plus bas, et pourquoi | à faire |
| 24 | Les dividendes des grandes entreprises allemandes | à faire |
| 25 | Les télécoms européens et leur dette | à faire |
| 26 | L'énergie européenne classée par dividende | à faire |
| 27 | Les résultats publiés cette semaine, chiffrés | à faire |
| 28 | PEA ou compte-titres : l'impôt sur un exemple chiffré | à faire |
| 29 | Livret A ou ETF sur 10 ans : ce qu'auraient donné 100 € par mois | à faire |
| 30 | Combien a perdu un MSCI World en 2008, et en combien de temps il est remonté | à faire |

Page retirée avant publication : « entreprises françaises sans dette ». La dette relevée est incomplète pour certaines entreprises (Vinci : 6,7 Md€ d'emprunts relevés pour 17,3 Md€ de trésorerie, donc une « trésorerie nette » fausse). À corriger dans `data/esef.mjs` avant de la publier.

## E2. X (page privée /x)

- Ouverte seulement avec la clé d'administration, saisie par Romain dans la page (gardée le temps de l'onglet, vérifiée par le Worker).
- Trois messages par jour, calculés sur les données : une entreprise face à la médiane de son secteur, un classement, une leçon. 270 caractères au plus (un lien compte pour 23). Liens `utm_source=x&utm_medium=social&utm_campaign=<type>-<date>`.
- Image 1200 × 675 par message, bouton « Copier le texte ». Rien n'est publié automatiquement : pas de clé X dans le site.

## E3. Vidéos verticales

Bouton « Suite verticale 1080 × 1920 » sur /x : trois images (l'accroche, le chiffre avec sa médiane, la suite sur le site), à monter dans CapCut ou l'éditeur de TikTok, Reels ou Shorts (3 × 3 secondes).

20 idées, toutes tirées de chiffres du site :
1. Sur 100 € de ventes, combien garde Hermès ? Et la médiane du luxe ?
2. Le dividende le plus élevé de France : pourquoi c'est souvent un piège.
3. Combien a perdu un MSCI World en 2008, et en combien de temps il est remonté.
4. 100 € par mois pendant 10 ans : Livret A ou ETF, avec les vrais chiffres.
5. PEA ou compte-titres : l'impôt sur 1 000 € de gain.
6. LVMH, Hermès, Kering : qui gagne le plus sur 100 € de ventes ?
7. Ce que contient vraiment un ETF « Monde » : la part des États-Unis.
8. La marge médiane d'une entreprise française : 7 %. Qui fait 6 fois mieux ?
9. Une entreprise sans dette, c'est forcément bien ?
10. Le PER expliqué en 3 images avec une vraie entreprise.
11. Pourquoi une banque n'a pas de « marge » : la rentabilité des capitaux propres.
12. La tech américaine qui grandit le plus vite cette année.
13. Ce qu'une entreprise a publié hier soir, en un chiffre.
14. Deux ETF S&P 500 : combien de lignes en double dans votre portefeuille ?
15. Les frais d'un courtier sur 10 ans : la différence en euros.
16. Le CAC 40 sans les dividendes : pourquoi la courbe ment.
17. Le DAX et le CAC 40 ne se comparent pas directement : la raison.
18. Ce qu'est une zone verte sur bilan. : au-dessus de la médiane du secteur.
19. Le dividende versé est-il tenable ? La part du bénéfice versée.
20. Votre portefeuille en un écran : la radiographie PEA.

Règle pour toutes : un chiffre, sa médiane, la source ; jamais « achetez », jamais de prédiction.

## E4. Tunnel mesuré sans traceur

Compteurs agrégés par semaine (table `compteurs`, aucune donnée personnelle) : pages vues (robots exclus), venues de moteurs ou de X, fiches ouvertes, « Suivre » touché, rapport exemple ouvert, comptes créés, rapports ouverts, aperçus d'alerte, page Premium vue, essais commencés, Premium en cours. Lecture : page /x ou `/api/espace/mesures` (champ `tunnel`).
