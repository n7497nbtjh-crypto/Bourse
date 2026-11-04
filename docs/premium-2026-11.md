# Premium : proposition du 4/11/2026 (à valider par Romain)

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
