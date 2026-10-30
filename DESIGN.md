# DESIGN.md · bilan.

Direction : **un journal financier, pas un tableau de bord de trading**. Papier crème, titres en serif, chiffres en chasse fixe, une seule couleur vive (vert acide) pour ce qui se clique, et la couleur réservée au sens (favorable / à surveiller / hausse / baisse). Calme, dense sans être chargé, lisible par un débutant, précis pour un investisseur confirmé.

Décidé le 30 octobre 2026 à partir de la charte existante du site et des retours de Romain (« professionnel, inspirer confiance », « pas fatigant »). Aucune comparaison avec des sites réels via UXKIN (non connecté) : la direction s'appuie sur la charte en place et des références de presse économique papier.

## Couleurs (rôles)

| Jeton | Valeur | Rôle |
|---|---|---|
| `--page` | `#F8F5EE` | fond de page, papier crème |
| `--panel` | `#FFFFFF` | blocs de contenu (panneaux, cartes) |
| `--ink` | `#111214` | texte courant, titres, boutons principaux |
| `--grey` | `#55524C` | texte secondaire, étiquettes, légendes (contraste 7:1 sur blanc) |
| `--light` | `#6F6A63` | notes, sources, texte tertiaire (≥ 4,5:1 sur le papier crème ; relevé le 30/10, l'ancien #87827A ne tenait que 3,4:1) |
| `--rule` | `#E2DCCF` | filets, bordures de panneaux |
| `--soft` | `#F1ECE1` | fonds discrets (cellules de tableau, puces grises) |
| `--lime` | `#C6F432` | **seul accent** : soulignement des liens, surbrillance du titre d'accueil, bouton « demander à l'IA », focus clavier. Jamais comme fond de texte long. |
| `--g` | `#0E6B4A` | sens : favorable, point fort, hausse |
| `--o` | `#D94F2B` | sens : à surveiller, baisse |
| `--n` | `#B9B2A5` | sens : dans la moyenne, neutre |
| `--night` / `--night2` | `#0E1116` / `#161B22` | bandeau Premium et IA uniquement (un seul bloc sombre par page, au plus) |

Règles : pas de bleu, violet, ocre ou dégradé décoratif ; pas de titre coloré ; une pastille colorée n'existe que si elle porte un sens (vert/orange/gris). Fonds teintés pâles (`#E6F3EB` favorable, `#FBEBE2` à surveiller) réservés aux cellules de tableau et aux pastilles.

Pas de mode sombre.

## Typographie

- **Titres de page et de bloc (h1, h2)** : Fraunces, 800, interlettrage −0,015 em. h1 40/44 px (28 px sur téléphone), h2 de panneau 20 à 22 px.
- **Tout le reste** : IBM Plex Sans. Corps 14,5 px / 1,5 ; texte long 15 à 16 px ; sous-titres et h3 en Plex Sans 700, 15 à 17 px ; étiquettes 12 à 12,5 px, 600, gris, **sans capitales espacées**.
- **Chiffres** : IBM Plex Sans en chasse tabulaire (`font-variant-numeric: tabular-nums`, `--mono` pointe sur la même famille). Plus de police à chasse fixe pour les chiffres (30/10 : « +25 % » en Plex Mono faisait terminal). Une police à chasse fixe système (`--code`) reste pour les codes boursiers et les ISIN seulement.
- Échelle : 12 · 12,5 · 13,5 · 14,5 · 16 · 18 · 22 · 28 · 40.
- Lignes de 60 à 75 caractères pour le texte courant (`max-width:760px` sur les paragraphes longs).

## Espacement

Base 4 px : 4 · 8 · 12 · 16 · 22 · 32 · 48. Panneau : en-tête 14/22 px, corps 16/22 px (12/16 sur téléphone). Entre deux panneaux : 14 px. Largeur de contenu : 1240 px, gouttière 24 px.

## Forme et relief

- Rayons : 10 px (cartes internes, champs), 14 px (panneaux), 99 px (pastilles et boutons ronds).
- Une seule ombre : `0 1px 2px rgba(17,18,20,.04), 0 6px 24px -12px rgba(17,18,20,.10)`. Pas de relief sur les tableaux ni les lignes.
- Filets 1 px `--rule` ; pas de bordure colorée sauf le filet gauche vert/orange d'une carte de point d'analyse.

## Composants

- **Bouton principal** (`.btn`) : fond `--ink`, texte blanc, 40 px de haut, rayon 10 px ; survol : `#2A2D33` ; focus : anneau `--lime` 3 px ; désactivé : opacité 0,5.
- **Bouton secondaire** (`.linkbtn`) : texte encre souligné lime, sans fond. **Bouton discret** : texte gris, souligné au survol.
- **Lien dans le texte** : encre, soulignement lime 3 px, décalage 3 px.
- **Champ** : 42 px de haut, bordure `--rule`, rayon 10 px, focus : bordure encre + anneau lime.
- **Panneau** : blanc, bordure `--rule`, rayon 14 px, ombre unique ; en-tête = h2 serif + un lien à droite au plus.
- **Tableau** : en-tête gris 12 px Plex Sans, lignes alternées `--soft`, chiffres mono alignés à droite ; cellule colorée (fond pâle) seulement pour un sens.
- **Jauge** : barre 6 px dégradée orange → vert, trait médian, point blanc cerclé d'encre ; légende « sous / au-dessus de la médiane ».
- **Pastille** : 11,5 px, 600, fond pâle vert/orange/gris selon le sens ; grise quand elle n'en a pas.
- **Navigation** : quatre entrées (Découvrir, Explorer, Analyser, Mon espace), recherche au centre, Favoris et Premium à droite ; sur téléphone, un menu.
- **Pied de page** : quatre colonnes de liens en Plex Sans 13 px, mention « information, pas conseil » et sources.

## Images et icônes

Pas de photo. Logos des entreprises via leur favicon (24 à 40 px, rond, initiales en secours). Icônes : traits simples 1,5 px, encre, jamais d'emoji. Graphiques : une courbe encre ou verte sur fond blanc, grille `--rule`, étiquettes Plex Sans 11 à 12 px.

## Mise en œuvre

Les valeurs vivent dans `:root` de `cf/site/index.html` (bloc de la ligne 632) ; les modules utilisent les noms, jamais des valeurs brutes. Les corrections globales de police et de couleur sont dans `cf/site/m/design.js`, chargé en dernier.
