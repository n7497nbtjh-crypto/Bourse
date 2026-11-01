# Refonte de la présentation (1/11/2026, prompt de Romain « éloigner le site de l'esthétique IA »)

Analyse faite sur le site en ligne, pages vues en 1440 px et 375 px. Mesures : nombre de blocs arrondis avec bordure (« cartes ») visibles.

| Page | Hauteur 1440 / 375 | Cartes 1440 / 375 | Mots |
|---|---|---|---|
| Accueil | 3 257 / 5 509 px | 25 / 31 | 666 |
| Fiche LVMH | 2 550 / 3 966 px | 16 / 29 | 462 |
| Marchés | 1 893 / 3 256 px | 2 / 7 | 493 |
| Comparer | 1 778 / 2 557 px | 6 / 10 | 376 |
| Apprendre | 1 870 / 2 440 px | 46 / 55 | 463 |
| Entreprises | 3 740 / 4 862 px | 121 / 43 | 1 312 |
| Premium | 2 468 / 3 833 px | 17 / 20 | 447 |

## Diagnostic d'ensemble
- **Ce qui fait « site généré par IA »** : tout est rangé dans des cartes blanches arrondies avec ombre (121 sur la liste des entreprises), boutons et pastilles en gélule partout, une icône générique devant chaque titre de section, sections de même poids les unes sous les autres, bouton flottant « Demander à l'IA » façon chatbot.
- **Ce qui est déjà solide et à garder** : papier crème, chiffres en chasse tabulaire, jauges face à la médiane, verdict en trois mots, tableau du comparateur, preuve au clic, données denses de la page Marchés.
- **Ce qui manque** : la promesse ne dit ni pour qui, ni ce qui distingue le site (les chiffres prouvés à la ligne du rapport officiel, la médiane du secteur, l'IA branchée sur ces chiffres).

## Plan priorisé (Où · Problème · Solution · Résultat)

### Lot 1 (fait le 1/11) : système visuel et accueil
1. **Partout · cartes et gélules.** Problème : la carte arrondie est le réflexe de mise en page des générateurs ; elle donne le même poids à tout. Solution : système « publication économique » : contenu posé sur le papier, séparé par des filets ; titres de section avec un filet épais au-dessus (rubrique) ; rayons 4 px (boutons, champs), 0 pour les panneaux ; plus d'ombre ; boutons rectangulaires. Résultat : une page qui se lit comme un journal financier, la hiérarchie vient de la typographie et des filets.
2. **Partout · icônes devant les titres.** Problème : décoratives, sans fonction. Solution : retirées des titres de section. Résultat : moins de bruit, titres plus nets.
3. **Accueil · promesse.** Problème : « Comprenez une entreprise en 10 secondes » ne dit ni pour qui ni pourquoi ici plutôt qu'ailleurs. Solution : promesse + trois preuves concrètes (comptes officiels, chaque chiffre relié à sa ligne du rapport, comparaison à la médiane du secteur) + les trois usages principaux en accès direct. Résultat : en un écran, le visiteur sait ce qu'est bilan., pour qui, et ce qui le distingue.
4. **Partout · IA.** Problème : bouton flottant de chatbot générique sur chaque page. Solution : bouton rendu discret (texte « Question ? »), l'IA reste proposée là où elle sert (fenêtre de preuve, rapport, comparateur). Résultat : l'IA devient un outil d'analyse, pas un gadget.

### Lot 2 (à valider) : fiche entreprise
5. **Fiche · en-tête.** Trois étages (identité, cours, verdict) dans des cartes séparées → une bande de tête unique : nom, cours, verdict, fiabilité, sur deux lignes.
6. **Fiche · « Tous les chiffres ».** Liste de plis-cartes avec bouton « Ouvrir » → tableau de synthèse (thème, chiffre clé, position dans le secteur) dont chaque ligne s'ouvre.
7. **Fiche · courbe du cours sur téléphone.** Grand espace vide pendant le chargement → hauteur réduite et repli sur les 5 ans de cours relevés par le site.

### Lot 3 (à valider) : listes et apprentissage
8. **Entreprises.** 121 cartes → tableau dense triable (nom, secteur, ventes, repères) comme Marchés.
9. **Apprendre.** 46 cartes → sommaire en liste numérotée par niveau.

### Lot 4 (à valider) : IA dans l'analyse
10. **Fiche et comparateur.** Boutons « Expliquer ce ratio » et « Expliquer l'écart » à côté des chiffres, réponses de l'IA du site fondées uniquement sur les chiffres affichés, avec la mention de ce qu'elle ne sait pas.
