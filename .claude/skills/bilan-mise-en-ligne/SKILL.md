---
name: bilan-mise-en-ligne
description: Tester, committer et mettre en ligne une modification du site bilan. (Repère Bourse). À suivre avant chaque push sur main.
---

# Tester et mettre en ligne

## Tests
```
node build.mjs                    # construit _worker.js, prompts.json, sitemap.xml
node tests/t_coherence.mjs        # cohérence des comptes de toutes les fiches : « aucune erreur bloquante » attendu
python3 tests/audit.py            # toutes les pages, 3 largeurs : 0 problème, 0 erreur JS attendus
python3 tests/t_ia.py             # réponses calculées : 100 % attendu
node tests/t_worker.mjs           # + les tests t_*.mjs / t_*.py du périmètre touché
```

## Relecture des textes générés (obligatoire dès qu'on touche une fiche, m/fiche4.js ou m/composants.js)
```
node scripts/relire-fiches.js 120   # 0 faute attendue ; puis LIRE /tmp/relecture-fiches.txt (tous les modèles de phrases)
node scripts/relire-visuel.js 30 comparer   # si la page Comparer est touchée
node scripts/relire-pages.js        # TOUJOURS : 32 grandes pages × 2 tailles (texte coupé, bouton dont le texte touche le bord, icône sur un champ, débordement, boutons superposés), 0 problème attendu
node scripts/relire-visuel.js 60    # 0 problème attendu : textes superposés, texte sur une barre, hors du graphique, dépasse de l'écran (ordinateur + téléphone)
```
Les phrases des fiches sont calculées pour plus de 2 000 sociétés : une faute d'accord ou une phrase creuse se répète partout.
Relire chaque modèle avant de pousser : accords, sens, pas de redite du graphique ou du titre, pas de renvoi à une autre étape,
pas de comparaison aux rivales si le graphique ne les montre pas, « rivales » ou « secteur » selon la comparaison réelle.
Toute nouvelle faute trouvée à la main devient une règle dans `REGLES` de scripts/relire-fiches.js ; tout nouveau défaut visuel vu par Romain devient un contrôle dans scripts/relire-visuel.js (graphiques des fiches) ou scripts/relire-pages.js (toutes les pages).
Regarder vraiment les captures (390 px et 1440 px) : pas de NaN, pas de « undefined », pas de débordement horizontal.

## Committer
- Ne jamais committer les fichiers générés : `cf/site/_worker.js`, `cf/site/sitemap.xml`, `cf/site/data/prompts.json`, `cf/site/data/gf*.csv`, `cf/site/data/univers.json`.
  Les remettre avant de committer : `git checkout -- cf/site/_worker.js cf/site/sitemap.xml cf/site/data/prompts.json`.
- Message en français. Ajouter seulement les fichiers voulus (`git add <fichiers>`).

## Pousser
```
git fetch origin main:refs/remotes/origin/main && git rebase origin/main
git push origin HEAD:main
gh run list -w "Mise en ligne du site" -L 1      # attendre « completed success »
```
Le workflow `.github/workflows/site.yml` construit, teste et déploie sur Cloudflare Pages. Un fichier qui n'est pas dans ses `paths` ne déclenche pas la mise en ligne : la lancer avec `gh workflow run site.yml`.
Ensuite, contrôler la page en production (https://repere-bourse.pages.dev).

## Interdits
Pas de compte de test sur le site en production, pas d'e-mail envoyé, pas de manipulation de clés secrètes (elles se saisissent dans Cloudflare ou GitHub par le propriétaire).
