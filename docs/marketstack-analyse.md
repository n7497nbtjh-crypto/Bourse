# Faut-il passer à Marketstack ? (analyse du 6/11/2026)

## Ce qui manque aujourd'hui (mesuré sur `cf/site/data/cours.json` du 5/11)

| | Total | Sans cours | Sans variation sur 1 an |
|---|---|---|---|
| Entreprises | 3 403 | 191 (100 aux États-Unis, 69 en Europe, 19 ailleurs, 3 en France) | 121 de plus |
| ETF | 1 174 | 65 (dont les 38 HSBC et les 13 Xtrackers) | presque tous dans les feuilles, mais la performance officielle vient des émetteurs (`etf-hist`) |

Les cours viennent des feuilles Google (GOOGLEFINANCE, différé d'environ 20 minutes) et, pour les ETF Amundi, iShares, SPDR et Invesco, de la valeur liquidative officielle. Les feuilles 1, 2 et une bonne partie de la 3 répondent ; la 4 ne rend rien.

## Ce que Marketstack apporterait

- Un cours de clôture daté pour la plupart des 191 entreprises sans cours et des ETF HSBC et Xtrackers.
- Un historique propre (courbe sur un an) : `data/marketstack.mjs` est prêt et la correspondance des symboles est déjà faite (3 431 titres sur 4 029 trouvés, `data/marketstack_map.json`).
- Une licence claire : l'offre Basic permet l'usage commercial.

## Le point qui change le calcul

Marketstack indique que **chaque titre consulté compte pour une requête**, même quand plusieurs symboles sont demandés ensemble (FAQ de marketstack.com). Notre code supposait l'inverse (« 1 requête par lot de 100 symboles »).

- Basic : 9,99 $ par mois, 10 000 requêtes par mois.
- Tout le site chaque jour : environ 4 000 titres × 22 jours = 88 000 requêtes par mois. **Basic ne suffit pas** ; il faudrait Professional (49,99 $ par mois, 100 000 requêtes).
- Seulement les trous (environ 260 titres sans cours ou sans variation sur 1 an) : 260 × 22 = 5 700 requêtes par mois, plus l'historique initial. **Basic suffit.**

## Recommandation

1. **Pas d'urgence** : 94 % des entreprises ont déjà un cours, et les ETF les plus détenus ont leur valeur liquidative officielle.
2. Si Romain veut combler les trous : prendre **Basic (9,99 $ par mois)** et ne l'utiliser **que pour les titres sans cours** (le robot lirait `cours.json` et ne demanderait que ceux-là). Le changement dans `data/marketstack.mjs` est petit : filtrer la liste et plafonner à 300 requêtes par jour.
3. Ne pas remplacer les feuilles Google par Marketstack : à l'échelle du site entier, ce serait 50 $ par mois.
4. Avant de payer : faire un essai avec la clé gratuite (100 requêtes) pour vérifier sur 20 titres sans cours (Oslo, Copenhague, Dublin) que Marketstack les a bien, et vérifier le décompte réel des requêtes dans le tableau de bord.

Sources : marketstack.com/pricing et marketstack.com/contact (FAQ « Each time the API is used to look up data for one specific stock ticker, one API request is consumed »), consultés le 6/11/2026.
