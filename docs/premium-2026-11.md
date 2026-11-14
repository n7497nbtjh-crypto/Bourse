# Premium : proposition du 4/11/2026

## État au 13 novembre 2026 (après le recentrage)

**Une seule formule : 19 € par an, en un seul paiement, sans renouvellement.** Plus de formule mensuelle (décision de Romain du 13/11).

| | Gratuit | Premium |
|---|---|---|
| Fiches entreprises complètes | 5 par semaine (14/11) | sans limite |
| Rang dans le secteur, classements | non | oui |
| Comparer jusqu'à 5 entreprises | 3 par semaine | sans limite |
| Actualité expliquée, ETF, agenda, dividendes, lexique | oui | oui |

La navigation reste gratuite. Le rapport de la semaine, les alertes, la radiographie du portefeuille, le connecteur et l'export ont été supprimés.

Le bouton de paiement n'est ouvert que si le serveur déclare le prix affiché (`PRIX_UNIQUE` commence par « 19 ») : tant que le lien Stripe est l'ancien, la page affiche « bientôt ouvert » et un formulaire d'attente. À faire par Romain : lien de paiement Stripe à 19 € (paiement unique), variables `STRIPE_LINK_UNIQUE` et `PRIX_UNIQUE` du Worker, CGV, identité du vendeur.

---

> **Ce qui suit date d'avant le recentrage du 13/11 et n'est gardé que pour l'histoire : plusieurs fonctions décrites n'existent plus.**

**Décision de Romain (4/11 après-midi)** : pas d'essai, pas de garantie. Premium = les nouveaux services ET les limites levées. Fait le 4/11 : alertes sur 3 valeurs sans Premium (robot `cf/src/espace.mjs`, `ALERTES_GRATUIT`), alertes Premium dividende (`dernierJourDiv`) et plus haut / plus bas sur un an, bouton « Être prévenu » sur la fiche (`f4Alerte`, fiche4.js), détail de quatre blocs du portefeuille réservé (`pf4Verrou`, portefeuille4.js ; l'exemple reste ouvert), page Premium réécrite (trois services, ancres #alertes #portefeuille #donnees, essai masqué).

## Constat
- Premium aujourd'hui = des limites levées : portefeuille de 10 lignes, comparer 3 entreprises, 3 questions à l'IA par jour, 20 appels du connecteur, rapport de la semaine court, 5 premières places des classements floutées.
- Personne ne paie pour une limite levée sur un site qu'il découvre. On paie pour un service qu'on ne veut plus perdre.
- Le paiement n'est pas branché : `STRIPE_SECRET`, `STRIPE_LINK_MENSUEL`, `STRIPE_LINK_UNIQUE` absents → liste d'attente seulement ; essai 14 jours fermé (`ESSAI_14J` ≠ 1).

## Positionnement
- Gratuit : **comprendre** une entreprise ou un ETF (fiches, verdicts, médianes, leçons, outils). Rien de ce qui existe n'est retiré.
- Premium : **« ENKLAIR suit vos placements à votre place. »** Le site travaille pour vous chaque jour, même quand vous ne venez pas.

## Trois piliers
1. **Vos valeurs surveillées** (alertes factuelles, jamais « achetez / vendez ») : résultats publiés (avec le verdict qui change ou non), dividende annoncé avec la dernière date pour acheter, repère qui passe du vert au rouge face à la médiane, plus haut ou plus bas sur un an, mise en garde de l'AMF. Gratuit : 3 valeurs. Premium : sans limite, par e-mail ou notification. La base existe (table `notifs`, robot `espace.mjs`).
2. **La radiographie du portefeuille** : chaque ligne face à la médiane de son secteur, vraie concentration à travers les ETF, recouvrement, frais payés par an en euros, calendrier personnel des dividendes, « ce qui a changé cette semaine », 12 semaines d'historique.
3. **Toutes les données** : classements complets, recherche par critères sans limite, historique 10 ans et trimestres, export CSV / Excel, comparer 5, IA et connecteur sans limite.

## Le mettre en avant (aux bons moments, sans bandeau partout)
- Fiche : bouton « Être prévenu quand X publie ses résultats » à côté de « L'année en cours ».
- Portefeuille : un vrai chiffre montré en clair (ex. « 34 % de votre argent dépend de 3 entreprises »), le détail ensuite réservé.
- Classements : les 5 premières places restent floutées (déjà le cas).
- Page Premium : un exemple réel de rapport de la semaine et d'alerte, avant le prix.

## Décisions qui reviennent à Romain
- Prix : garder 39 € par an / 4,90 € par mois, ou un prix de lancement (par exemple 29 € la première année pour les 500 premiers).
- Essai de 14 jours sans carte (passer `ESSAI_14J` à 1).
- Garantie « remboursé sans question sous 30 jours ».
- Ce qui passe de gratuit à Premium : proposition = seulement les nouveautés (alertes au-delà de 3 valeurs, radiographie détaillée) ; rien n'est retiré du gratuit actuel.

## À faire par Romain avant d'ouvrir
- Créer les liens de paiement Stripe et saisir les secrets dans Cloudflare.
- Faire relire les conditions d'abonnement par un avocat (`docs/conformite.md`).

## Ordre de travail proposé (après accord)
1. Alertes « Être prévenu » sur la fiche (3 gratuites) : le plus visible.
2. Radiographie du portefeuille : chiffre en clair + détail Premium.
3. Page Premium réécrite autour de ces deux services.
