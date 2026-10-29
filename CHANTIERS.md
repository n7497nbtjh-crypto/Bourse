# Chantiers en parallèle (nuit du 28 au 29 octobre 2026)

Règles communes à tous les agents :
- Chaque chantier a son module `cf/site/m/<nom>.js`, chargé après le script principal de `index.html`.
  On y redéclare avec `function` les fonctions à remplacer (jamais `const`/`let` pour un nom déjà déclaré dans index.html,
  sinon tout le module plante). Les nouvelles constantes sont préfixées par le nom du module (ex. `ETF_`, `PF_`).
- On ne modifie `cf/site/index.html` qu'en dernier recours et par petites retouches ciblées (le coordinateur fusionne).
- Fichiers générés à ne pas committer : `cf/site/_worker.js`, `cf/site/sitemap.xml`, `cf/site/data/prompts.json`
  (la mise en ligne reconstruit tout avec `node build.mjs`).
- Accès réseau : le conteneur ne joint que GitHub et les registres npm/pip. Pour lire un site externe,
  pousser sa branche puis lancer la sonde : `gh workflow run sonde.yml --ref <branche> -f script=data/sonde/<nom>.mjs -f sortie=data/sonde/out/<nom>`,
  suivre avec `gh run list -w Sonde`, récupérer avec `gh run download <id> -n sonde -D <dossier>`.
- Collecte régulière : un script `data/<nom>.mjs` et un workflow à part `.github/workflows/<nom>.yml` (ne pas toucher `donnees.yml`).
- Tests : `node build.mjs`, `python3 tests/audit.py` (0 problème attendu à 3 largeurs), tests du module.
- Interdits : pas de clés secrètes, pas de scraping de Boursorama, Yahoo, Zonebourse, eBay, Vinted, PSA, Cardmarket ;
  pas de contournement anti-robot ; jamais d'article, de cours ou de chiffre inventé ; aucun conseil d'investissement.

## Nouvelles routes
Un module ajoute une page sans toucher à `route()` : `ROUTES_EXTRA.push([/^\/connecteur$/, () => pageConnecteur()]);`
(les groupes capturés sont passés en arguments). Pour une route existante, redéclarer plutôt sa fonction `page…`.
Côté serveur, ajouter la page dans `meta()` de cf/src/worker.mjs (sinon le HTML part avec un statut 404).
