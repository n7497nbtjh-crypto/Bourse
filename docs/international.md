# Internationaliser ENKLAIR : où en est-on, et dans quel ordre continuer

Écrit le 2/11/2026. Les montants viennent des sources citées et sont datés. Ils sont à revérifier avant chaque mise en ligne.

## Déjà en place
- **Europe francophone** (France, Belgique, Suisse, Luxembourg). Le visiteur choisit son pays en haut d'« Apprendre » et de l'Académie, et le choix est mémorisé. Les leçons propres à la France sont remplacées par celles du pays. Les deux outils fiscaux sont adaptés.
- **Depuis le 2/11**, un visiteur qui arrive de Belgique, de Suisse ou du Luxembourg voit directement les leçons de son pays. Le pays est lu par Cloudflare, dans la requête. Rien n'est enregistré, et un choix fait à la main reste prioritaire.
- **Les fiches entreprises sont déjà internationales** : 2 456 entreprises de plus de 30 pays, comptes en devise d'origine, comparaison à la médiane du secteur.

## Pourquoi c'est faisable sans changer de métier
En Europe, le « conseil en investissement » au sens de MiFID II désigne une **recommandation personnalisée** faite à un client. Les informations générales et les recommandations générales n'en font pas partie (ESMA, Supervisory Briefing du 11/07/2023, ESMA35-43-3861). Le site reste donc dans l'information, à une condition : ne jamais proposer de titres en fonction d'un profil. C'est déjà la règle du site. Elle reste la règle dans chaque pays ajouté. Faire relire cette règle par l'avocat prévu dans `docs/conformite.md` avant d'ouvrir un pays hors de l'Union européenne.

## Ordre proposé, du moins cher au plus cher

### 1. Canada francophone (Québec) : le meilleur rapport effort / public
Même langue et même public de débutants. Il faut cependant y écrire les comptes propres au pays :
- **CELI** : plafond annuel de 7 000 $ en 2026, comme en 2024 et 2025 (Agence du revenu du Canada) ;
- **REER** : 18 % du revenu gagné, plafonné à 33 810 $ en 2026 et 35 390 $ en 2027 (ARC, tableau des plafonds).

Fait le 4/11 (avec l'Allemagne, l'Italie et l'Espagne). Travail prévu : 4 ou 5 leçons propres au Canada dans `academie-pays.json` (réserve, CELI, REER, fiscalité, arnaques avec l'AMF du Québec), un simulateur CELI / REER simplifié, et le Canada ajouté au choix du pays. La liste des entreprises contient déjà des sociétés canadiennes, en CAD. Coût estimé : une session de travail.

### 2. Afrique francophone : à étudier, pas tout de suite
- **Maroc** : sur les actions cotées, les plus-values des particuliers sont imposées à 15 % (20 % pour les non cotées). Les dividendes de sociétés marocaines sont aussi imposés à 15 % (sources : cabinets marocains, CGI 2026 ; à confirmer sur le site de la DGI).
- Le site ne suit presque aucune entreprise de la Bourse de Casablanca ni de la BRVM (Afrique de l'Ouest). Il faudrait d'abord des données fiables sur ces entreprises. Sans comptes officiels lisibles, la promesse du site (« chaque chiffre est prouvé ») ne tient pas.

### 3. Version anglaise : le plus gros chantier
- Il faudrait traduire l'interface, les textes des fiches et l'Académie (72 leçons), réécrire la fiscalité de chaque pays (ISA au Royaume-Uni, IRA et 401(k) aux États-Unis…), et prévoir des adresses `/en/…` avec balises `hreflang`.
- L'IA du site répond déjà en anglais si on lui écrit en anglais. Les données (comptes, médianes) n'ont pas de langue.
- C'est à envisager seulement quand le public francophone sera installé.

## À faire chaque année
- Revoir les montants de chaque pays en janvier. Ils sont listés dans `cf/site/data/academie-pays.json`, avec leur source dans chaque leçon.
- Belgique : plafonds indexés.
- Luxembourg : un délai de 12 mois au lieu de 6 est annoncé pour 2027 sur les plus-values.

## Sources
- ESMA, *Supervisory briefing on understanding the definition of advice under MiFID II*, 11/07/2023 : https://www.esma.europa.eu/sites/default/files/2023-07/ESMA35-43-3861_Supervisory_briefing_on_understanding_the_definition_of_advice_under_MiFID_II.pdf
- Agence du revenu du Canada, plafond CELI 2026 : https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/compte-epargne-libre-impot/cotiser/calculer-droits.html
- Agence du revenu du Canada, plafonds REER : https://www.canada.ca/fr/agence-revenu/services/impot/administrateurs-regimes-enregistres/fesp/plafonds-cd-reer-rpdb-celi-mgap.html
- Maroc, profits sur valeurs mobilières (15 % actions cotées) : https://upsilon-consulting.com/profit-cession-valeurs-mobilieres-maroc/ (à confirmer sur le site de la DGI : https://www.tax.gov.ma)
