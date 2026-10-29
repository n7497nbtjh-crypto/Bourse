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

## Chantier « comparer » (module `cf/site/m/comparer.js`)
- Remplace `pageComparer()` (page /comparer) et `concurrentsHTML(s)` (étape « Concurrents » de la fiche, appelée par `etapesListe`).
  Agent « fiche » : ne pas redéclarer `concurrentsHTML` ; si `etapesListe` est refaite, garder `() => concurrentsHTML(s)` pour l'étape « concurrents ».
- Les anciennes `cmpTable`, `cmpCell`, `CMP_ROWS`, `compareSynth`, `profilsCompare` ne sont plus appelées (laissées dans index.html).
- Serveur : `/api/assistant` accepte `mode: "comparaison"` (consigne `SYS_CMP` de `cf/src/ia.mjs`, quota « assistant ») ;
  `prompts.json` gagne la clé `comparaison` (IA installée sur l'appareil) ; `meta()` du Worker nomme les entreprises d'un lien /comparer?ids=….

## Chantier « etf » (module `cf/site/m/etf.js`)
- Pages : `pageEtfs` (liste filtrable, état dans l'adresse : `/etf?q=&cat=&env=pea|cto&dist=&em=&fr=&tri=`) et `pageEtf` (fiche complète).
- `etfComp(e)` est redéfinie dans `m/etf.js` : elle lit `/data/etf/<e.id>.json` quand `e.compo` existe, sinon l'ancien fichier du fonds américain (`e.proxy`). Le portefeuille et le recouvrement l'utilisent tels quels.
- Collecte : `data/etf_collecte.mjs` (+ `etf_emetteurs.mjs`, `etf_lib.mjs`), workflow `.github/workflows/etf.yml` (mensuel, le 3). Sources : sites des émetteurs (Amundi, iShares/BlackRock France, SPDR, Invesco). `data/etf.mjs` exporte la liste choisie à la main (`CHOISIS`, identifiants stables) complétée par `data/etf_catalogue.json`.
- Champs ajoutés dans `etf.json` (les anciens ne changent pas) : `methode` (complète | échantillonnée | swap), `domicile`, `creation` (AAAA-MM-JJ), `cotations` [{place, ticker, devise}], `nomOfficiel`, `indexOfficiel`, `url` (fiche de l'émetteur), `src`, `couvert`, `levier`, `contrepartie`, `nIndex`, et `compo` = résumé { n (lignes), t10 (% des 10 premières), asOf, niveau, pays (nombre), p1 [pays, %], s1 [secteur, %] }. `pea` peut valoir `null` (non indiqué par l'émetteur).
- Format de `cf/site/data/etf/<id>.json` (transparence du portefeuille) :
  `{ id, isin, niveau: "fonds"|"indice"|"panier", source: { nom, url }, asOf, lines (nombre de lignes),
     top: [{ name, isin, pct, country (ISO 2), sector }] (15 au plus, % du fonds, titres seulement),
     countries: [[ISO2, %]], sectors: [[clé, %]] (clés : it, fin, sante, conso_disc, indus, comm, conso_base, energie, materiaux, services_pub, immo, liquidites, autre),
     isins: [[ISIN, %]] (lignes ≥ 0,003 %, pour la transparence et le chevauchement), via?: { id, name } (fonds physique dont on reprend la composition de l'indice) }`.
  `top`, `countries`, `isins`, `lines`, `asOf` gardent les noms de l'ancien format (fichiers des fonds américains, sans `niveau`).
- Ajout au portefeuille depuis la fiche : `pf2Load()` / `pf2Save()` (ligne `{ k: "e:<id>", m: 1000 }`). Si le stockage du portefeuille change, garder ces deux fonctions ou prévenir.
- Le Worker ajoute titre, description et FAQ structurée (FAQPage) des fiches ETF : `cf/src/etf_meta.mjs` (appelé dans `fetch` de `worker.mjs`).
## Actualité des entreprises (agent « actu »)
Collecte : `data/actu.mjs` (workflow `.github/workflows/actu.yml`, 5 fois par jour en semaine). Fichiers lisibles par tous les modules :
- `cf/site/data/actu/c/<id>.json` (un par entreprise suivie, même vide) : `{ id, o: [annonces 90 jours], p: [presse 30 jours] }`.
  Annonce : `{ k, d (ISO UTC), id, s (amf|sec|nasdaq|oslo|nsm), c (resultats|rapport|dividende|operation|dirigeants|assemblee|emission|contrat|incident|autre ; routinières : rachat|capital|initie|agenda), i (importance 0 à 3), tf (titre français du site), t (titre d'origine), u (lien source), l (langue), p (1 = information privilégiée), f ([[libellé, valeur]] chiffres), r ([phrases de lecture calculées]), x ({ c: « En clair », ch: « Ce que cela change » } rédigés par l'IA) }`.
  Article : `{ k, d, t, u, s (site), l, co? (autres entreprises citées) }`.
- `cf/site/data/actu/fil.json` : `{ maj, sources, jours, couverture, o: [annonces non routinières des 4 derniers jours], p: [presse 2 jours, avec id] }` ; `actu/j/<AAAA-MM-JJ>.json` : `{ d, o }`.
Côté navigateur (`cf/site/m/actu.js`) : `actuCo(id)` (promesse du fichier ci-dessus), `actuFicheCourt(el, s)`, `actuFicheDetail(el, s)`, `actuBandeau(el)`, `actuBandeauHTML()`, `presseBlock`, `newsBlock`.

## Tableaux (agent « tableaux », module `cf/site/m/tableaux.js`)
- Remplace `tabComptes` (onglet « Les chiffres en détail ») et `colChart` (tous les graphiques en colonnes par année du site :
  dernière année en noir, années précédentes en gris sable, valeurs affichées quand la place le permet, médiane en pointillés).
  Agent « fiche » : ne pas redéclarer ces deux fonctions ; pour un tableau d'années dans la fiche, utiliser les composants ci-dessous.
- Composants réutilisables (agents « comparer », « portefeuille », « etf » : servez-vous-en, ne les redéclarez pas) :
  - classe CSS `table.t.tbx` : en-têtes clairs, chiffres en police à chasse fixe, filets fins, ligne survolée, alternance `tr.z`,
    première colonne collante `th.lab` (avec `span.nm` et l'unité `span.u`), colonne mise en valeur `.last`, cases colorées `td.hu` (mieux) / `td.hd` (moins bien).
  - `tblxScrollBox(html, indication)` + `tblxBindScroll(racine)` : défilement horizontal avec ombre et indication « faites glisser ».
  - `tblxSortable(table)` : tri au clic sur `th[data-sk="<n° de colonne>"]`, valeurs lues dans `td[data-v]`.
  - `tblxSpark(valeurs, { w, h, q, med, label })` : mini-courbe SVG (point final vert si q > 0, orange si q < 0, médiane en pointillés).
  - `tblxArrow(dir, q, texte)` : flèche ↑ ↓ → colorée selon le sens de l'indicateur (une dette qui baisse est en vert).
  - `tblxRows(s, c)` : lignes des comptes avec unité, tendance, niveau (fort / moyen / vigilance), position vs médiane et phrase de lecture.
- Nouvelles notions dans `TERMS`/`ALL` (lexique) : `margenette`, `invest`, `conversion`, `divverses`.
- À signaler (agent « actu ») : sur /entreprise/apple/actualite, « exercice clos le NaN undefined 2025 » : pour les comptes SEC,
  `periodEnd` vaut juste l'année (« 2025 ») et `dLabel()` ne sait pas le lire (ligne ~167 de `m/actu.js`).
