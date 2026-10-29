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
- « Approfondir avec l'IA » : `iaRediger("comparaison", faits, { question })` (IA connectée du visiteur, voir « IA ») ;
  `meta()` du Worker nomme les entreprises d'un lien /comparer?ids=….

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
  - Tri sans code : ajouter la classe `tbx-sort` à la table, `th[data-sk="<n° de colonne>"]` (ou `tblxTh(libellé, n)`), valeurs dans `td[data-v]`.
  - `tblxZoneCell(v, fmt, médiane, plusBasEstMieux, écart)` : case colorée vert / gris / orange par rapport à la médiane du secteur.
  - Remplace aussi `pageEntreprises` (vue tableau), `cellInd`, `filtreHTML` (copilote), `pageAgenda`, `simFrais`.
  - `tblxSpark(valeurs, { w, h, q, med, label })` : mini-courbe SVG (point final vert si q > 0, orange si q < 0, médiane en pointillés).
  - `tblxArrow(dir, q, texte)` : flèche ↑ ↓ → colorée selon le sens de l'indicateur (une dette qui baisse est en vert).
  - `tblxRows(s, c)` : lignes des comptes avec unité, tendance, niveau (fort / moyen / vigilance), position vs médiane et phrase de lecture.
- Nouvelles notions dans `TERMS`/`ALL` (lexique) : `margenette`, `invest`, `conversion`, `divverses`.
- À signaler (agent « actu ») : sur /entreprise/apple/actualite, « exercice clos le NaN undefined 2025 » : pour les comptes SEC,
  `periodEnd` vaut juste l'année (« 2025 ») et `dLabel()` ne sait pas le lire (ligne ~167 de `m/actu.js`).

## Synthèse de la semaine (agent « synthese », module `cf/site/m/synthese.js`)
« Votre semaine en 2 minutes » en tête de Mon espace (`espaceBilan` et `pageEspace` redéclarées) et sur l'accueil d'un membre connecté (`synAccueil(el, moi)`, appelée par `pageHome`).
- Faits calculés côté serveur par `cf/src/synthese.mjs` (`faitsSynthese`, sans dépendance), stockés dans la table `bilans` (une ligne par compte et par semaine ISO, `v: 2`).
  `GET /api/espace/bilan[?semaine=2026-W44][&apercu=1]` : `{ v, semaine, du, au, lignes: [{ k, nom, type, variation_semaine_pct, serie, du, partiel, indice: { id, nom, pct }, ecart_pts, favori, en_portefeuille, portefeuille: { valeur_eur, poids_pct, var_eur } }],
  moyenne, meilleure, pire, hausses, baisses, indices, portefeuille: { valeur_eur, var_eur, var_pct, serie, vs, alertes: [{ code, niveau, valeur, texte, pourquoi, evol }], levees },
  annonces: [{ k, nom, date, categorie, categorie_label, poids, titre, resume, change, chiffres, source, source_nom, origine: officiel|presse, lien }], a_venir, essentiel: [3 phrases], lecture_min, texte, historique }`.
  `apercu=1` : version accueil. Le serveur ne rédige plus de commentaire : `texte` n'existe que pour les anciens bilans ; le commentaire se rédige
  dans le navigateur avec l'IA connectée (bouton « Commenter ma semaine avec mon IA », `synIaFaits` + `iaRediger("bilan", …)`).
- Cours : `cf/site/data/cours-semaine.json` `{ dates: [clôtures], items: { "c:id": [cours…] } }`, écrit par `data/cours_fetch.mjs` (la copie du matin = clôture de la séance précédente).
- Actualités lues dans `cf/site/data/actu/c/<id>.json` (agent « actu ») et `actu-analyse.json`, dédoublonnées par lien source.
- Notifications : `syntheseNotif(env, compteId)` (export de `cf/src/espace.mjs`) renvoie `{ titre, resume, lien, semaine }` de la dernière synthèse ;
  la notification « bilan » du samedi porte « Votre semaine en 2 minutes est prête. » + la première phrase, reprise par `message()` de `cf/src/push.mjs`.
- Bouton d'abonnement : si le module « pwa » définit `pwaNotifBouton({ sujet, texte })` (renvoie du HTML), il est affiché dans la barre d'actions de la synthèse.
- Tests : `node tests/t_synthese.mjs`, `python3 tests/t_synthese_ui.py [--shots dossier]` (maquette `tests/synthese_maquette.mjs`).

## Présentation de la fiche (agent « fiche2 », module `cf/site/m/fiche2.js`, chargé après fiche, comparer, tableaux et analyse)
- Redéclare `companyHeader`, `ficheSommaire`, `pageCompany`, `etapesBind`, `ficheGraphBox`, `ficheGraphique`, `concurrentsHTML`
  (contenu repris de fiche.js / comparer.js) ; enveloppe `ficheMetierHTML` et `ficheAnalyse` (texte complété, rien de retiré).
  Agents « fiche » et « comparer » : vos changements sur ces fonctions doivent être reportés dans fiche2.js (ou prévenir).
- En-tête de la vue d'ensemble : courbe du cours (`#tvchart.f2-tv`, widget `tvChart` chargé en différé par `requestIdleCallback`)
  à côté de « En bref », profil dans le secteur en dessous avec un vrai titre. Un seul graphique par page : l'étape « Son prix » renvoie à l'en-tête.
- Onglets de la fiche : `nav.qtabs.f2tabs` hors de l'en-tête, en segments, collants (top 57 px ; 52 px sur mobile) ; étapes `#etapes` collées dessous (124 px / 110 px).
- Taille dans le secteur cliquable partout (`[data-f2-rang="<id>"]`) : fenêtre `#f2dlg` = classement du secteur par les ventes en euros
  (ou la capitalisation sans comptes), bouton « Comparer avec » ses voisines de rang (/comparer, limite gratuite respectée).
- Concurrents : logos `.f2-lgd` à la place des points, couloirs anti-chevauchement calculés en pixels (`fiche2Lanes`).
## Parcours : Apprendre et rapport sur mesure (agent « parcours », module `cf/site/m/parcours.js`, chargé en dernier)
- Apprendre : point d'entrée unique `/apprendre` (1. Par où commencer → 2. L'Académie → 3. Lexique → 4. Outils pédagogiques, ancre `#outils`).
  Menu « Apprendre » (ordinateur et mobile) : Vue d'ensemble, Par où commencer, L'Académie, Le lexique, Outils pédagogiques ; « Vérifier une offre » passe dans « Outils ».
- L'ancien parcours « Premiers pas » (`/debuter`, `data/parcours.json`) devient « L'essentiel en 3 étapes », version courte de l'Académie :
  `/academie/express[/<étape>[/<leçon>|/quiz]]` (progression inchangée : `pState()`). `/debuter/…` et `/premiers-pas` sont redirigés
  (301 par le Worker : `redirectionParcours` de `cf/src/worker.mjs` ; dans le navigateur : `parRedirection`, `pageDebuter` redéclarée). Sitemap à jour.
- Redéclarées dans le module : `pageAcademie`, `acaAccueil`, `pageDebuter`, `pageOutils` (la page Outils ne liste plus les cours).
  Les liens `/debuter` restants sont réécrits à l'affichage et les pages d'apprentissage reçoivent un fil d'Ariane « Apprendre ».
- Rapport de la semaine sur mesure : réglages dans `donnees.profil.rapport` (`GET/POST /api/espace/rapport`, POST = remplacement complet ;
  format et contrôle : `normaliseRapport` / `validerRapport` de `cf/src/synthese.mjs`) :
  `{ v: 1, favoris, portefeuille, secteurs: [clé de secteur] (2 sans Premium, 6 avec), indices: [id], detail: "court"|"complet",
     sujets: { resultats, dividendes, actualite, lecons }, jour: 6|0|1, notif, configure }`.
  `faitsSynthese(d, { favoris, pf, rapport })` les applique ; la synthèse gagne `secteurs` (médiane de la semaine par secteur suivi) et `reglages`.
  Version courte : pas de commentaire rédigé, 3 actualités et 3 dates. Jour : le robot (`espace.yml`, `quoi=jour` samedi, dimanche, lundi 6 h 17 UTC)
  ne prépare le rapport que des comptes dont c'est le jour ; le lundi, il porte sur la semaine écoulée (`/espace?semaine=…`). `notif: false` : pas d'alerte « bilan ».
- Navigateur : `pageEspace`, `espaceBilan`, `synCharger`, `synAccueil`, `pageHome`, `pagePremium` sont ENVELOPPÉES (`window.x = …` qui appelle l'original) :
  agent « synthese », vos redéclarations restent prises en compte. Onglet « Mon rapport » (`/espace/rapport`), assistant en 3 étapes au premier passage
  (« Plus tard » : `localStorage["bilan.rapport.plustard"]`), aperçu de rapport calculé avec `/data/cours-semaine.json` sur l'accueil des visiteurs.
- Tests : `node tests/t_espace.mjs`, `node tests/t_synthese.mjs`, `node tests/t_worker.mjs`, `python3 tests/t_parcours.py [--shots dossier]`.
## Contexte (agent « contexte », module `cf/site/m/contexte.js`, chargé en dernier)
- Données écrites à la main et sourcées : `data/contexte.mjs` → `cf/site/data/contexte.json` (`node data/contexte.mjs`).
  `evenements` (grands événements par année civile, sens +/-/0, cible secteurs/mots-clés/pays, sources) et
  `sujets` (actualité vérifiée : `maj`, `fin` = date de fin de pertinence, faits datés, impacts par cible avec mécanisme au conditionnel).
  Revérifier les sujets et repousser `fin` à chaque mise à jour ; un sujet expiré n'est plus affiché.
- Enveloppe (window.f = function…, sans redéclarer) : `etapesListe` (ajoute « Ce qui explique ces chiffres » à l'étape « Ses comptes »
  et « L'actualité qui la concerne » à « L'essentiel », ou à « Son métier » sans comptes), `analyseForcesFaiblesses` (points `actu_*` et `ctx_evol`
  dans `contexte`), `ficheFaits` (`actualite_qui_la_concerne`, `evolution_pluriannuelle`, `fiabilite_des_donnees`), `localAssist`, `localCopilot`.
- Fonctions publiques : `contexteChiffresHTML(s, c)`, `contexteActuHTML(s, c)`, `contexteSujets(s, c)`. Tests : `python3 tests/t_contexte.py [--shots dossier]`.
## Refonte des fiches entreprise et ETF (agent « refonte-fiche », vague du 29 octobre 13 h 30)
- Une seule définition par fonction : `ficheSommaire(s, c)`, `companyHeader`, `pageCompany`, `tabBref`, `etapesListe`, `etapesBind`,
  `ficheRetenirHTML`, `concurrentsHTML` sont dans `m/fiche2.js` (supprimées de `m/fiche.js` et `m/comparer.js`) ; `tabComptes` dans `m/tableaux.js`.
  `m/contexte.js` n'enveloppe plus `etapesListe` : la fiche appelle `contexteActuHTML` (étape « Actualité ») et `contexteChiffresHTML(s, c, true)`
  (thème « Croissance » de l'onglet des chiffres, sections 2 à 4 repliées dans `details.ctx-more`).
- Vue d'ensemble : en-tête compact (identité, cours) puis courbe + « En bref » (situation en mots, atouts et points à surveiller = titres de
  `analyseForcesFaiblesses`, 3 prochaines dates). Étapes : L'essentiel (tuiles cliquables vers `/entreprise/:id/comptes#rf-<thème>` + analyse),
  Son métier, Concurrents (tableau côte à côte `.rf-ctab`, atouts et faiblesses de chacune, « Sa place dans le secteur » = ancien bandeau de profil),
  Actualité, Questions. Colonne latérale : dernières annonces seulement. Les anciens liens `?etape=comptes|prix|dividende` ouvrent l'onglet des chiffres.
- Onglet « Les chiffres en détail » : ce qui a le plus changé sur un an, « À lire ensemble », puis un bloc par thème (`#rf-croissance`, `#rf-rentabilite`,
  `#rf-bilan`, `#rf-flux`, `#rf-valorisation` = `prixHTML`, `#rf-dividende` = `dividendeHTML`), tableau complet replié (`#rf-tout`), sources.
- Fiche ETF (`pageEtf`, `ETF_bref` dans `m/etf.js`) : même hiérarchie (courbe + « En bref », puis composition, frais, risques, questions ;
  caractéristiques, émetteur, ETF proches, avis et discussion dans la colonne latérale). Une seule liste de questions (`#efaq`) + champ vers `orcIaAsk`.
## Accueil (agent « accueil », module `cf/site/m/accueil.js`, chargé après orchestre.js)
- Redéclare `pageHome` (remplace aussi l'enveloppe de parcours.js : `parAccueilVisiteur` et `synAccueil` sont appelés ici dans `#homeesp`).
  Ordre : question à l'IA → « Le point du jour » (synthèse de l'actualité) → Pour vous (membre : semaine + favoris + portefeuille) →
  Annonces des entreprises → (visiteur avec favoris : Pour vous) → À découvrir (`outilsDecouverteHTML`, secteurs) → Débuter (simulateur, idées reçues)
  → rapport sur mesure (visiteurs) → Premium sur une ligne. Plus de classements d'entreprises ni d'ETF sur l'accueil (ils sont dans /classements et /etf).
- Le point du jour : `contexte.json` (sujets non expirés, ordre éditorial), `actu/fil.json`, `PX` (indices, `moversData`), `AG` (agenda).
  Chaque sujet sépare Fait (dernier fait daté), Interprétation (qui est concerné et dans quel sens), Hypothèse (mécanisme au conditionnel),
  À surveiller (dates à venir des entreprises visées, calculées avec `ctxProfil`/`ctxCible` de contexte.js). « Approfondir » déplie `#acc-det`
  (tous les faits, sources, presse repérée par les mots-clés du sujet, impacts avec le nombre d'entreprises suivies concernées).
- Simulateur Livret A (communication.js) : mise à jour sur place (`commMaj`) avec animation des courbes, de l'échelle et des montants ;
  curseur continu (`step="any"`, année = entier le plus proche, calage au lâcher), flèches = une année. `commSimule` inchangé.
- `main` a désormais `min-height: calc(100vh - 56px)` (index.html) : le pied de page ne saute plus au chargement (CLS).

## Recommandations, classements et découvertes (agent « reco », module `cf/site/m/reco.js`, chargé juste avant orchestre.js)
- Page `/pour-moi` (« Pistes pour vous ») : questionnaire de 11 questions (les 5 de /commencer, même clé `bilan.profil`, + perte, liquidite, objectif,
  capital, versement, enveloppe), répartition indicative en fourchettes, points de vigilance du portefeuille (`pf3Rows`/`pf3Look` lus, jamais modifiés),
  ETF, entreprises et secteurs à étudier, retours par piste (pertinente / trop risquée / redondante / inadaptée) qui modifient les pistes suivantes.
- Calculs purs dans l'objet `RECO` (tests : `node tests/t_reco.mjs`) ; page testée par `python3 tests/t_reco.py [--shots dossier]`.
- Pour l'accueil et Mon espace : `recoAccueilHTML()` / `recoEspaceHTML()` (= `recoCompactHTML({ titre })`) renvoient le bloc tout de suite, à placer par leurs auteurs.
- Éligibilité au PEA, une seule règle pour tout le site : `peaOk(c)` de index.html appelle `recoPeaOk(c)` (siège UE/EEE d'après l'ISIN, recoupé avec
  Wikidata via `cf/site/data/pea.json` fabriqué par `data/pea.mjs` au build ; foncières SIIC/SIR/SOCIMI/REIT exclues ; « à vérifier » = `null`).
  Détail et motif : `recoPeaInfo(c)` ; ETF : `RECO.peaEtf(e)` (champ `pea` de l'émetteur, exposition gardée à part).
- Compte : `POST /api/espace/reco` `{ reponses, retours }` fusionné dans `donnees.profil` (réponses au premier niveau, `profil.reco.retours`) ; `GET` idem.
- `m/outils.js` : classements en aperçu (3 premières places floutées sans nom dans la page, places 4 à 15 visibles, 50 avec Premium : c'est un aperçu,
  les données restent publiques sur les fiches) ; découvertes refaites (6 cases : petite valeur PEA, Europe, hors Europe, rendement, croissance,
  redressement ; pas de grandes capitalisations ; 2 ETF éligibles PEA ; activité, chiffres, valorisation, catalyseurs sourcés, risques).
- À signaler (agent « etf ») : dans `etf.json`, des ETF MSCI EMU (zone euro) sont rangés en `actions-emergents` ; `recoEtfSuspect(e)` les écarte des pistes.

## Apprendre, idées reçues et communauté (agent « apprendre2 », vague du 29 octobre 13 h 30)
- Apprendre (`m/parcours.js`) : `PAR_NIVEAUX` range tout en 3 niveaux (fondamentaux, lire une entreprise, juger le prix et construire).
  Chaque niveau = parcours court (`/academie/express/<niveau>`, progression `pState`) + « Approfondir » (modules du cours complet, `acaSt`).
  `/apprendre` (niveaux, idée reçue mise en avant, lexique, outils repliés dans `#outils`), `/academie` (programme complet par niveau), `/academie/express` (les 3 niveaux).
  `acaLecon` est enveloppée : une leçon citée par une idée reçue affiche « Vrai ou faux ? » en fin de page.
- Idées reçues (`m/communication.js`) : chaque entrée de `commIdees()` a `mythe`, `credible`, `faits` + `viz` (données), `nuance`, `exemple`, `retenir`, `src`, `liens`.
  Carte « vrai ou faux » : `commIdeeCarte(x, i, { seule })`, réponses dans `localStorage["bilan.idees"]`, `commIdeeSeuleHTML()` pour Apprendre et l'Académie. `commIdeesHTML(n)` (accueil) garde sa signature.
- Communauté (`m/communaute.js`, chargé après parcours.js) : redéclare `pageCommunaute`, `tabCommu`, `chatBlock` (bloc des fiches entreprise et ETF), `qGuide`.
  Onglets : Analyses (thèse, arguments, risques, horizon ; chiffres de la fiche recalculés à l'affichage), Questions, Listes de suivi (+ portefeuilles partagés), Pronostics.
  Anciennes adresses : `?onglet=discussions&salon=x` → analyses de la fiche + anciens messages ; `?onglet=portefeuilles` → Listes de suivi.
  Serveur (`cf/src/communaute.mjs`) : colonne `messages.meta` (JSON `{ t, r, h, ex }`), `GET /api/communaute/analyses?room=&tri=utiles|recentes`,
  table `listes` (`POST /api/communaute/liste` → `{ id, cle }`, `GET /listes`, `GET /liste?id=`, `POST /liste/utile|signaler|retirer`), `masquer` accepte `{ type: "liste" }`.
  Garde-fous : pas de liens, refus des consignes d'achat ou de vente et des promesses de gain (`CONSIGNE`), 3 analyses et 3 listes par jour, masquage après 3 signalements.
- Tests : `node tests/t_communaute.mjs`, `python3 tests/t_communaute_ui.py [--shots dossier]`, `python3 tests/t_parcours.py`.


## IA (agent « ia-simple », décision de Romain du 29 octobre 15 h, module `cf/site/m/monia.js`, chargé en dernier)
Trois niveaux, rien d'autre. Détails : `docs/ia.md`.
1. Réponses calculées pour tous (`cf/site/ia.js`, leçons, données) : gratuit, illimité. Test : `tests/t_ia.py` (100 %).
2. « Connecter mon IA » (OpenRouter, OAuth PKCE) : la clé reste dans `localStorage["bilan.monia"]`, appels directs navigateur → openrouter.ai.
   API pour les modules : `iaRediger(tâche, faits, { question, max })` → `{ txt, sources, modele }` | `{ invite: true }` (pas d'IA connectée) | `{ error }` ;
   `miaCopilote(q)` (action du copilote validée par `iaValide`) ; `miaConnectee()`, `miaNomModele()` ; interface : `miaRendu(j)`, `miaPied(j)`, `miaInvite(texte)`, `miaEtatHTML()`.
   Tâches (consignes dans `cf/src/consignes.mjs` → `/data/prompts.json`) : demande, expliquer, assistant, comparaison, veille, portefeuille, annonce, bilan.
   Toujours afficher d'abord la réponse calculée ; sans IA connectée, `miaInvite()` (discret). Test : `tests/t_monia.py` (OpenRouter simulé).
3. Connecteur MCP `/mcp`, page `/connecteur` « Utiliser bilan. dans ChatGPT ou Claude ».
- Un seul point d'entrée dans l'interface : le panneau ✦ de `m/orchestre.js` (`orcIaOpen()`, `orcIaAsk(q, { rediger })`). Les questions de la fiche
  (`ficheDemander`), des ETF et des listes y sont envoyées ; pas d'autre boîte de dialogue d'IA.
- Le serveur n'appelle aucun modèle : plus de `llm.mjs`, `ia.mjs`, `demande.mjs`, `actu.mjs`, binding `AI`, variables `IA_*`, quotas d'IA.
  Les anciennes routes (`/api/assistant`, `/api/demande`, `/api/resume`, `/api/actu/clair`, `/api/ia/etat`, `POST /api/veille`) répondent 410.
- Interdit : ajouter un appel à un modèle d'IA côté serveur ou une clé d'IA du site.
## Outils, simulateur, agenda et « hier » (agent « outils2 », vague du 29 octobre 13 h 30, module `cf/site/m/outils2.js`)
- Chargé avant orchestre.js, avec `m/outils2_calc.js` (calculs purs `O2C`, testés par `node tests/t_outils2.mjs`). Une seule définition par fonction :
  `pageAgenda`, `pageSim`, `outilSiJavais`, `outilRecouvrement` sont dans outils2.js (supprimées d'index.html et de m/tableaux.js ; `simEpargne`, `simFrais`, `simPeaCto` n'existent plus).
- /simulateurs (et /simulateurs/epargne|frais|pea-cto, qui ouvrent la même page à la bonne section) : versements, grille réelle du courtier (plan programmé si `plan` dans courtiers),
  frais courants (médiane des ETF monde PEA), change, revente, impôt 2026 (`RATES`), scénarios prudent/central/favorable = 10e centile, médiane, 90e centile des périodes
  de N ans du MSCI World en euros (`COMM_MW` de communication.js). Paramètres dans l'adresse (?ini=&men=&ans=&env=&bk=…).
- /outils/recouvrement?a=&b=&c=&d=&w=60,30,10 : 2 à 4 ETF (`etfComp`), poids identique (somme des minimums), inclusion, concentration (Herfindahl), secteurs, pays, devises.
- /outils/si-javais?k=&vs=&m=&ans=&bk= : une courbe (`O2_courbe`, axe de temps, infobulle, légende cliquable) avec cours relevés (p5y/p3y/p1y/p), dividendes publiés
  (historique.json), indice, Livret A et inflation. Séries de référence : `cf/site/data/hist-ref.json` (Insee IPC base 2025 série 011814630, BCE moyennes mensuelles,
  taux du Livret A) écrit par `data/outils2_hist.mjs`, workflow `.github/workflows/outils2.yml` (lundi).
- Agenda : heures vérifiées à la main dans `data/agenda/heures.mjs` (pub / cal / moment / conf, fuseau IANA, source), recopiées par build.mjs dans `agenda.json` (champ `h`).
  Sans heure : « Heure non communiquée ». Section « Publié ces derniers jours » : chiffres des annonces officielles (`actuCo`).
- /hier (menu Marchés) : `pageHier`, annonces `resultats` du jour ouvré précédent (actu/j/*.json, heure de Paris), regroupées par entreprise, lecture `O2_lecture`
  (chiffres classés, prévisions et extraits de actu-analyse.json, positifs/négatifs/risques, pas de synthèse avec moins de 2 évolutions), bouton IA = `iaRediger("annonce", …)` (IA connectée du visiteur, sinon `miaInvite`).
  Tests : `python3 tests/t_outils2.py [--shots dossier]`.


## Provenance des chiffres (module `cf/site/m/provenance.js`, chargé juste avant `monia.js`)
- Registre unique des indicateurs : `PROV_IND[clé] = { nom, formule, unite, nature (publie | calcule | estime | marche | emetteur), src (comptes | cours | mixte | etf | etfcompo), limite }`.
  Les clés reprennent celles des lignes de `tblxRows` (ca, g, marge, net, roe, roce, fcf, payout…) ; `provKey(k)` accepte aussi les clés d'`INDI` et du lexique (`PROV_ALIAS`).
  Tout nouvel indicateur affiché doit y être ajouté (formule en clair, nature, limites).
- Bouton « i » : `provBtn(clé, ids, libellé)` avec `ids` = `"c:<id>"`, `"e:<id>"` ou plusieurs séparés par des virgules (comparateur) ; vide = en-tête d'un tableau de nombreuses entreprises.
  La bulle (même `#pop` que les définitions) donne nature, formule, devise, période et date de clôture, document source, date de récupération, cours (date du relevé), change BCE, limites.
  Elle s'ouvre au clic ou au toucher, au survol (souris) et au focus clavier ; le clic est capturé : ni tri de colonne ni lien de tuile.
- Fraîcheur : `provComptesVieux(c, s)` (bandeau quand le dernier exercice a plus de 15 mois), `provCours(p)` (`vieux` au-delà de 3 jours ouvrés sans relevé),
  `valo()` redéfinie : PER, rendement et VE/EBITDA ne sont plus calculés avec des comptes de plus de 15 mois (`v.vieux`).
- Ratios ajoutés : `provRoce`, `provEvEbitda`, `provRdtFcf` (+ `INDI.roce`, `INDI.ev_ebitda`, `INDI.rendement_fcf`, notions `roce`, `evebitda`, `rdtfcf` du lexique). Tests : `node tests/t_provenance.mjs`, `python3 tests/t_provenance.py`.
- Données : `societes.json` gagne `clos` (date de clôture), `maj` (date de lecture du document) et `dpsE` (dividende par action estimé) ; `etf.json` : `releve` par fonds et `updated` = date du catalogue des émetteurs ;
  `etf/<id>.json` : `releve` ; `/api/cours` : `d` (date du fichier) pour un titre absent de la feuille. Ces champs apparaissent au prochain passage des robots ; le site fonctionne sans eux (« date de récupération non conservée »).
- « Vérifier une offre » (`outilVerifier`) : recherche sur le nom et le site seulement (plus sur la catégorie), domaine d'une adresse ou d'un e-mail reconnu ;
  trois issues : correspondance trouvée, recherche insuffisante (moins de 4 caractères, mots génériques, plus de 40 entrées), aucune correspondance (jamais présentée comme un gage de fiabilité).

## Calculs et données (agent « donnees », vague « audit » du 29 octobre, module `cf/site/m/donnees.js`, chargé juste avant orchestre.js)
Chantier A du plan de `docs/audit-2026-10.md` : P0-1, P0-2, P1-8 à P1-12 (côté données), P2-1. Aucun affichage ici : ce module ne fait que des calculs
et expose des champs que les modules d'affichage utilisent pour dire d'où vient chaque chiffre (agent « provenance »).

**Changement de format des données collectées** (`data/fetch_data.mjs`, `summary()`, collecte version 4). Les champs existants sont inchangés ; nouveaux champs :
- `fyEnd` (« MM-JJ », date de clôture), `yearPrev` (exercice précédent **réellement présent**), `ageMois` (mois depuis la clôture), `stale` (vrai au-delà de 15 mois), `norme` (`"IFRS"` ou `"US GAAP"`).
- `dps` ne contient plus que le dividende **publié** ; l'estimation est dans `dpsEst` (comme dans les fiches détaillées depuis toujours). Avant, `dps = dps ?? dpsEst` fondait les deux.
- `netDebtBaux` (dette nette, dettes locatives comprises), `leases` (dettes locatives IFRS 16), `capex` (investissements, plus supprimé après le calcul du flux disponible).
- Fiches détaillées (`cf/site/data/societes/<id>.json`) : `tags.net`, `tags.debt`, `tags.norme` (une entrée par exercice, étiquette réellement retenue) et `fin.tax`, `fin.pretax`.
- Les fichiers déjà en ligne restent lisibles : le module détecte l'ancien format (absence de la clé `stale`) et répond « nature inconnue » au lieu d'affirmer « publié ».

**Fonctions de `index.html` redéclarées** (ne pas les redéfinir ailleurs) : `ratios`, `computeMedians`, `medInd`, `valo`, `computePE`, `figuresOf`.
`INDI.taille` est remplacé (taux BCE) et trois entrées sont ajoutées : `ev_ebitda`, `rendement_fcf`, `cours_valeur_comptable`.

**À appeler depuis un module d'affichage**
- `donAge(c)` → `{ year, fyEnd, mois, stale, connue, approx }`. `stale` = comptes de plus de 15 mois. `connue:false` = on ne sait pas (ancien format sans date de clôture).
- `donDps(c)` → `{ v, nature: "publie" | "estime" | "inconnue" | null }`. À afficher : « estimé » quand `nature === "estime"`.
- `donDette(c)` → `{ v, baux, leases, def, norme }` : `def` dit ce qui entre dans la dette nette, `baux` la version dettes locatives comprises.
- `donMed(secteur)` → `{ n, nPerime, annees: [min, max] }` : effectif de la médiane, nombre d'entreprises écartées pour comptes anciens, exercices couverts.
  `donMedInd(secteur, indicateur, region)` : même médiane limitée à une région.
- `donCroissance(s)` → `{ g1, multi, ans, verif }` : `g1` seulement si les deux exercices se suivent ; sinon `multi` sur `ans` années.
- `donInd(c)` → `{ evEbitda, fcfYield, pb, evBaux, notes }` : indicateurs **calculés**, `notes` donne la formule et ses limites.
- `valo(c)` rend en plus `perime`, `ageMois`, `peIndispo` / `yldIndispo` (`"comptes-anciens"`) et `yldNature`
  (`"verses"` = dividendes versés ÷ capitalisation, `"dps-publie"`, `"dps-estime"`, `"dps-inconnue"`).
- `ratios(s)` rend en plus `gMulti`, `gAns`, `gVerif`, `ngMulti`, `ngAns`, `levBaux`.
- `figuresOf(c)` rend en plus `yearPrev`, `consecutif`, `cagr3`, `cagr5` (`{ v, de, a, ans }`, seulement sur exercices consécutifs), `capex`, `leases`, `netDebtBaux`,
  `dpsNature`, `tagNet`, `tagDette`, `norme`, `stale`, `ageMois`.

**Règles tenues ici**
- Les entreprises aux comptes périmés n'entrent plus dans les médianes de secteur, dans la médiane de PER, ni dans les classements : `donRetenue(c)` est le filtre.
- Pour elles, `valo()` ne rend plus de PER ni de rendement (un cours de 2026 rapporté à un bénéfice de 2014 ne veut rien dire) ; la capitalisation du jour reste disponible.
- Les montants en euros passent par les taux de référence de la BCE (`cf/site/data/fx.json`), recopiés dans `FXE` par `donFxSync()` : `caEur()` et `toEur()` s'en servent sans changement.
- ETF : `pea` peut maintenant valoir `null` dans `etf.json` (« l'émetteur ne le dit pas »), à ne jamais afficher comme « Non » (`data/etf.mjs`, `propreCat`).

Tests : `node tests/t_donnees.mjs` (71 vérifications, dont les formules recoupées avec les comptes collectés de LVMH, Apple et Microsoft), `node tests/t_sec.mjs`, `NO_SLEEP=1 node tests/t_esef.mjs`.
