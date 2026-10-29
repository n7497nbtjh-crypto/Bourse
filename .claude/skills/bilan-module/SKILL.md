---
name: bilan-module
description: Ajouter ou modifier une page, une section ou une fonction du site bilan. (Repère Bourse) côté navigateur. À lire avant toute modification de cf/site/index.html ou de cf/site/m/*.js.
---

# Modifier le site côté navigateur

## Où mettre le code
- `cf/site/index.html` : page unique (routeur `route()`, helpers globaux `$`, `$$`, `esc`, `logo`, `pct`, `F0/F1/F2`, `RBY`, `ETFBY`…). On n'y fait que de petites retouches ciblées.
- `cf/site/m/<nom>.js` : un module par chantier, chargé après le script principal (ordre des balises `<script src="/m/…">` en bas d'index.html). Le dernier chargé est `monia.js`.
- Pour remplacer une fonction : la redéclarer avec `function nom() {}` dans un module. Avant, trouver TOUTES ses définitions :
  `grep -n "function NOM\|NOM = " cf/site/index.html cf/site/m/*.js` et modifier la dernière chargée.
- Jamais `const` / `let` pour un nom déjà déclaré ailleurs (SyntaxError : tout le module tombe). Préfixer les nouvelles constantes par le nom du module.
- CSS : l'injecter depuis le module (`document.head.insertAdjacentHTML("beforeend", "<style>…</style>")`).

## Nouvelle page
1. `ROUTES_EXTRA.push([/^\/ma-page$/, () => pageMaPage()]);` (les groupes capturés passent en arguments).
2. Ajouter la page dans `meta()` de `cf/src/worker.mjs` (sinon statut 404 et pas de titre pour Google).
3. Ajouter la route à la liste de `tests/audit.py`.

## IA
Le site n'appelle aucun modèle côté serveur. Réponse calculée d'abord ; rédaction seulement via l'IA connectée du visiteur :
`iaRediger(tâche, faits, { question })` ou `miaCopilote(q)` (module `monia.js`). Point d'entrée unique : le panneau ✦ (`orcIaOpen`).

## Règles de contenu
- Français, vouvoiement, phrases courtes, pas de tiret cadratin, pas de jargon sans explication.
- Aucun conseil d'achat ou de vente, aucune prédiction. Aucun chiffre, article, cours ou image inventé : chaque donnée a une source affichée et une date ; une donnée ancienne est signalée comme telle.
- Pas de lien vers TradingView. Pas de clé ni de secret dans le code du navigateur.
- Professionnel et sobre : verdict d'abord, détails ensuite ; médiane du secteur et zones vert / gris / orange.

## Vérifier
Lancer la procédure de la compétence `bilan-mise-en-ligne` (build, tests, captures à 390 et 1440 px).
