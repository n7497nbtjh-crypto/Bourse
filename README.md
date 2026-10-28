# Repère : site d'information boursière pour débutants

Site pédagogique : fiches des grandes entreprises cotées à Paris (comptes expliqués, synthèse, actualité officielle, agenda), simulateurs, suivi de portefeuille, lexique.
Construit sur le modèle de Kartel Des Cartes : Cloudflare Pages en mode `_worker.js`, une page source unique, tests à 1440, 375 et 340 px. « Repère » est un nom provisoire.

## Sources de données (toutes gratuites)
| Donnée | Source | Comment |
| --- | --- | --- |
| Comptes annuels (chiffre d'affaires, marge, résultat, dette, dividende…) | Rapports ESEF via filings.xbrl.org, LEI via GLEIF | Collecte lancée à la main sur GitHub, une fois par an (`data/fetch_data.mjs`) |
| Actualité | Publications officielles AMF (info-financiere.gouv.fr), Licence Ouverte | En direct via `/api/amf` (`cf/src/amf.mjs`), 15 min de cache |
| Cours, graphique, PER, rendement, capitalisation | Modules gratuits TradingView | Chargés dans la page, mention « Cours fournis par TradingView » obligatoire |
| Agenda | Calendriers financiers officiels des sociétés | Saisi à la main dans `data/agenda.json`, avec la source |
| Simulations « sur le passé » | Séries fictives | L'historique réel des cours n'existe pas gratuitement avec droit de réutilisation |

À vérifier après la mise en ligne : `/api/amf?raw=1&limit=2` (noms de champs AMF) et le premier passage de la collecte (onglet Actions de GitHub).

## Contenu
- `cf/site/index.html` : tout le site (HTML, CSS, JS).
- `cf/site/calc.js` : calculs (simulations, TRI, perte maximale, volatilité, intérêts composés, PEA ou compte-titres).
- `cf/src/worker.mjs` : titre et description de chaque page (Google), flux AMF.
- `data/univers.mjs` : les 40 entreprises suivies (nom, code, ISIN, secteur). Ajouter une ligne pour en suivre une nouvelle.
- `data/esef.mjs` : lecture des rapports ESEF ; `data/fetch_data.mjs` : collecte ; `data/agenda.json` : agenda.
- `data/gen_demo.mjs` : séries fictives des simulateurs.
- `.github/workflows/donnees.yml` : collecte et fabrication du site prêt à déposer.
- `tests/` : `t_univers.mjs` (codes ISIN), `t_esef.mjs` (lecture des comptes, sur des exemples), `t_amf.mjs`, `t_calc.mjs`, `t_worker.mjs`, `audit.py` (toutes les pages, 3 largeurs).

## Mettre le site à jour (comme pour Kartel)
1. GitHub > dépôt Bourse > onglet Actions > « Mise à jour des données » > Run workflow.
2. Attendre la coche verte (environ 5 minutes), ouvrir l'exécution, section Artifacts : télécharger « repere-site ».
3. Glisser ce fichier dans Cloudflare Pages (nouveau déploiement), onglet ouvert jusqu'au bout.
Les comptes annuels ne changent qu'une fois par an : refaire la collecte après la saison des rapports annuels (avril). L'actualité AMF et les cours TradingView sont toujours à jour, sans rien faire.
Facultatif : GitHub > Settings > Secrets and variables > Actions > Variables > `CONTACT` = une adresse de contact (demandée par filings.xbrl.org).

## Reconstruire et tester en local
```
node build.mjs https://adresse-du-site
node tests/t_univers.mjs && NO_SLEEP=1 node tests/t_esef.mjs && node tests/t_amf.mjs && node tests/t_calc.mjs && node tests/t_worker.mjs
NO_SLEEP=1 node tests/fixtures/site_data.mjs && python3 tests/audit.py
```

## Taux fiscaux
`RATES` en haut du script de `index.html` : 31,4 % (prélèvement forfaitaire) et 18,6 % (prélèvements sociaux), taux 2026. À vérifier chaque année.
