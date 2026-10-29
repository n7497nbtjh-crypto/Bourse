---
name: bilan-sonde
description: Lire un site externe (émetteur d'ETF, AMF, Wikidata, flux RSS, API) depuis un environnement sans accès réseau, ou ajouter une collecte de données régulière au site bilan.
---

# Sonde réseau et collectes

L'environnement de développement ne joint souvent que GitHub et npm/pip. Pour lire un site externe, on passe par GitHub Actions.

## Sonde ponctuelle
1. Écrire `data/sonde/<nom>.mjs` (Node, `fetch`, écrit ses résultats dans le dossier passé en `SORTIE` ou en argument).
   User-Agent honnête : « bilan-site (contact via GitHub n7497nbtjh-crypto/Bourse) ». Respecter robots.txt et un débit raisonnable.
2. `git push origin HEAD:refs/heads/agent/<nom>`
3. `gh workflow run sonde.yml --ref agent/<nom> -f script=data/sonde/<nom>.mjs -f sortie=data/sonde/out/<nom> -f minutes=50`
4. Suivre : `gh run list -w Sonde -L 3` ; récupérer : `gh run download <id> -n sonde -D <dossier>`.

## Collecte régulière
Un script `data/<nom>.mjs` et un workflow à part `.github/workflows/<nom>.yml` (planifié, commit des données avec une boucle `git pull --rebase` + push). Ne pas toucher `donnees.yml` pour un nouveau besoin.

## Sources
Sources gratuites et officielles d'abord (AMF, ESEF, SEC EDGAR, émetteurs d'ETF, Wikidata). Interdit : Boursorama, Yahoo, Zonebourse, eBay, Vinted, PSA, Cardmarket, et tout contournement d'anti-robot.
