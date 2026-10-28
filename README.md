# Repère : site d'information boursière pour débutants

Site pédagogique : fiches des grandes entreprises cotées à Paris (comptes expliqués, synthèse, actualité officielle, agenda), simulateurs, suivi de portefeuille, lexique.
Construit sur le modèle de Kartel Des Cartes : Cloudflare Pages en mode `_worker.js`, une page source unique, tests à 1440, 375 et 340 px. « Repère » est un nom provisoire.

## Sources de données (toutes gratuites)
| Donnée | Source | Comment |
| --- | --- | --- |
| Comptes annuels (chiffre d'affaires, marge, résultat, dette, dividende…) | Rapports ESEF via filings.xbrl.org, LEI via GLEIF | Collecte chaque lundi par GitHub Actions (`data/fetch_data.mjs`) |
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
- `.github/workflows/donnees.yml` : collecte automatique chaque lundi.
- `tests/` : `t_univers.mjs` (codes ISIN), `t_esef.mjs` (lecture des comptes, sur des exemples), `t_amf.mjs`, `t_calc.mjs`, `t_worker.mjs`, `audit.py` (toutes les pages, 3 largeurs).

## Mise en place (une seule fois)
1. Créer un dépôt GitHub (privé possible) et y mettre ce dossier.
2. Dans Cloudflare : Workers & Pages > Créer > Pages > Connecter à Git > choisir le dépôt. Commande de build : aucune. Dossier de sortie : `cf/site`.
3. Dans GitHub : onglet Actions > « Mise à jour des données » > Run workflow. La collecte remplit `cf/site/data/` et Cloudflare republie le site.
4. Facultatif : GitHub > Settings > Secrets and variables > Actions > Variables > `CONTACT` = une adresse de contact (demandée par filings.xbrl.org pour un usage régulier).

## Reconstruire et tester en local
```
node build.mjs https://adresse-du-site
node tests/t_univers.mjs && NO_SLEEP=1 node tests/t_esef.mjs && node tests/t_amf.mjs && node tests/t_calc.mjs && node tests/t_worker.mjs
NO_SLEEP=1 node tests/fixtures/site_data.mjs && python3 tests/audit.py
```

## Taux fiscaux
`RATES` en haut du script de `index.html` : 31,4 % (prélèvement forfaitaire) et 18,6 % (prélèvements sociaux), taux 2026. À vérifier chaque année.
