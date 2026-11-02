# Prompt de reprise : ENKLAIR (rédigé le 2/11/2026, à compléter par Romain)

> À coller au début d'une nouvelle discussion. Le dépôt contient `CLAUDE.md` (règles de travail, interdits, où trouver quoi) : le lire en premier.

## 1. Le projet en une phrase
**ENKLAIR** (https://enklair.com) aide un débutant à comprendre n'importe quelle action cotée en 30 secondes. Chaque chiffre vient des comptes officiels, chaque chiffre est placé face à la **médiane de son secteur** avec un verdict visuel, et la source est toujours affichée. Le site donne de l'information, jamais de conseil. Il ne coûte rien à faire tourner.
Dépôt : `n7497nbtjh-crypto/Bourse` (dossier local `/home/claude/bourse`). Hébergement : Cloudflare Pages + Worker + D1, publié par GitHub Actions (`site.yml`, avec **wrangler 3.112.0** obligatoirement : la 3.114.0 publie un Worker cassé).

## 2. La vision (référence : la page d'accueil actuelle, `m/accueil4.js`, maquette `docs/maquettes/accueil-v12.html`)
- **Direction artistique v3 « Quotidien »** :
  - polices : Bricolage Grotesque pour les titres, Inter pour le texte ;
  - couleurs : fond blanc, jaune #FFE14D, contours noirs de 2 à 3 px, quelques étiquettes penchées ;
  - données : gros chiffres, jauges rouge / vert avec la médiane en trait noir.
  
  À utiliser **avec retenue** : de l'air, une hiérarchie nette, une seule mise en avant par écran.
- **« La jeunesse ne lit pas »** : le visuel d'abord (chiffre, jauge, verdict en deux mots), les phrases courtes, et le détail au clic. **Ne jamais répéter** une information ou un nom déjà visible à l'écran.
- **Professionnel, inspire confiance** : rien qui fasse « jouet », « bricolé » ou « IA ».
- **Une seule façon de faire chaque chose sur tout le site** : mêmes cartes, mêmes jauges, mêmes graphiques, mêmes pastilles, mêmes fenêtres.

## 3. Autocritique honnête de l'état actuel (Claude)

### Méthode : ce qui n'a pas marché
- **J'ai corrigé en surface au lieu de reconstruire.** La fiche entreprise est construite trois fois de suite :
  - `fiche.js` puis `fiche2.js` la fabriquent ;
  - `fiche3.js` la démonte et la recompose ;
  - des centaines de règles de style forcées la corrigent par-dessus.
  
  Résultat : chaque correction en casse une autre. J'ai aussi tourné en rond sur les mêmes remarques (petites jauges, répétitions, encadrés), et certaines retouches ont été pires que l'état précédent.
- **La feuille de style est surchargée.** `site.css` fait 447 ko, 4 250 lignes et compte **857 `!important`**. Les règles des versions successives s'empilent : ancienne DA crème, v3 « partout », puis les corrections du 2/11. `app.js` fait 447 ko. Il y a 34 modules dans `m/`, dont plusieurs qui « habillent » des pages anciennes au lieu de les remplacer : `v3pages.js`, `entreprises3.js`, `etf3.js`, `comparer3.js`, `fiche3.js`.
- **J'ai multiplié les allers-retours au lieu de valider une maquette complète** avant de coder, page par page.
- **J'ai mal anticipé la mise en ligne.** Pendant plusieurs heures, le site affiché n'était pas le dernier publié, et je ne l'ai vu qu'au signalement de Romain. Deux causes : wrangler 3.114.0 qui casse le Worker, et Cloudflare qui gardait scripts et styles 4 h en cache sur enklair.com. Les deux sont corrigés : versions figées, et `?v=` ajouté aux scripts.

### Le site, page par page (état au 2/11 au soir)
- **Accueil** : c'est la référence de la DA, et Romain l'aime. Bulle « Une question » retirée.
- **Fiche entreprise** (la page la plus importante) : fonctionnelle mais pas à la hauteur.
  - Les graphiques font « jouet » : barres épaisses, gros contours noirs.
  - Les explications sont trop courtes ou maladroites.
  - On parle de « médiane » partout sans jamais montrer concrètement de quoi il s'agit : quel secteur, combien d'entreprises, lesquelles.
  - Les logos s'affichent en 64 px dans un rond de 24 px, donc illisibles : il faut une meilleure source d'images ou un autre affichage.
  - La structure en chaîne (Ce qu'elle vend → Ce qu'elle en garde → Ce qu'il lui reste → Ce qu'elle reverse → Ce que ça coûte en Bourse) est validée dans le principe, mais pas encore dans son rendu.
- **Comparer** : cartes en classement, moins de répétitions. Restent un rendu cassé sur largeur moyenne (titre en colonne), un aspect encore « jouet », et des logos illisibles.
- **Entreprises, Marchés, Outils / simulateurs, Mon espace, Portefeuille, leçons de l'Académie, ETF, Actualité, Agenda, rapport de la semaine** : seulement « repeints », avec le bandeau jaune et les pastilles. Le contenu en dessous est l'ancien. **Aucune n'a été vraiment repensée dans la DA.**
- **Fenêtre « i »** (provenance) : réduite à six lignes (calcul, preuve, période, source, récupéré le, limite).

### Données et fiabilité (problèmes connus)
- Le lien « rapport officiel » ouvre maintenant la visionneuse filings.xbrl.org sur le chiffre exact. Il n'y a pas d'ancre pour les comptes américains (SEC) ni pour les paquets AMF (LVMH).
- Certaines entreprises ont des comptes incomplets (Brunello Cucinelli, Kering : PER « non calculable »).
- Des cours aberrants existent (Intel −28 % sur une séance) : ils sont écartés des images réseaux, mais pas encore signalés sur le site.
- Eulerpool (trimestriels Europe / Asie) est en panne depuis le 30/10. Marketstack attend le plan Basic. EODHD n'est actif que si Romain ajoute la clé.

## 4. Méthode de travail pour la suite (à respecter)
1. **Une page à la fois, dans cet ordre** : fiche entreprise, puis Comparer, Entreprises, Marchés, Outils, Mon espace / Portefeuille, Apprendre / leçons, ETF, Actualité / Agenda, rapport de la semaine.
2. Pour chaque page :
   1. **Maquette HTML complète** avec de vraies données (ordinateur + téléphone, dans `docs/maquettes/`), validée par Romain **avant** toute ligne de code.
   2. **Réécriture propre** dans un seul module qui lit directement les données. Pas de recomposition d'une ancienne page.
   3. **Suppression** de l'ancien code et des règles CSS devenues inutiles.
3. **Une petite bibliothèque de composants partagés**, faite une seule fois et réutilisée partout :
   - carte chiffre ;
   - jauge face à la médiane ;
   - graphique en colonnes (fin, sobre, médiane en pointillé) ;
   - classement de comparaison ;
   - pastilles ;
   - fenêtre « i » ;
   - pli.
   
   Elle a sa propre feuille de style, sans `!important`. Objectif : faire fondre `site.css` page après page.
4. **Avant chaque mise en ligne** : `python3 tests/audit.py`, les contrôles `scripts/check-*.js`, puis la vérification **sur enklair.com** que la nouvelle version est bien servie (en-tête `x-bilan-version`, une chaîne du nouveau code), avec une capture avant / après.
5. **Économiser les crédits** : pas d'agents, lectures ciblées, peu de captures. Annoncer le coût d'un gros chantier avant de le lancer.

## 5. Ce qu'il reste à faire autour du site
- **Domaine** :
  - enklair.com fonctionne ; www.enklair.com est ajouté par Romain (redirection vers enklair.com à vérifier depuis un navigateur) ;
  - l'ancienne adresse repere-bourse.pages.dev redirige les pages ;
  - à faire par Romain : déclarer le site dans Google Search Console avec le sitemap `https://enklair.com/sitemap.xml`.
- **Réseaux (enklair_)** :
  - fait : photo de profil, bannière X et bios fournies (`docs/reseaux/`) ;
  - robot `posts.yml` : images du jour à télécharger, rien n'est publié automatiquement ;
  - à décider : un rythme de publication, et un modèle d'images refait dans la nouvelle DA une fois la fiche validée.
- **Connecteur IA (MCP)** : `mcp/server.json` pointe vers enklair.com. Romain republie lui-même dans le registre (`mcp/PUBLIER.md`).
- **Juridique** : `docs/conformite.md` (pages légales à faire relire par un avocat, statut de Romain, mentions « information, pas conseil »).
- **Monétisation** : Premium est prêt, l'essai de 14 jours est fermé (`ESSAI_14J`). Stripe n'est branché que si Romain saisit ses clés.
- **International** : `docs/international.md` (prochain pays conseillé : Canada francophone, après la refonte).
- **Données** : relancer Eulerpool quand il revient ; décider EODHD / Marketstack (payants) ; trouver une meilleure source de logos.

## 6. Corrections et priorités de Romain
- **Continuer dans la DA de la page d'accueil**, partout : c'est la référence, pas un point de départ à réinterpréter.
- **Le visiteur doit comprendre tout de suite ce que le site lui apporte**, dès le premier écran de chaque page.
- **Peu de lecture, du visuel** : un chiffre, une jauge, un verdict. Le texte seulement là où il aide vraiment, court, et replié s'il est long.
- **De l'ergonomie entre les sections** : on doit savoir où l'on est, d'où l'on vient et où aller ensuite. La navigation d'une section à l'autre est évidente, sans retour en arrière ni chemins en double.
- **Un vrai sens dans la construction des fiches entreprises et des outils** : chaque page raconte une histoire dans un ordre logique. Pour une entreprise, ce qu'elle vend, puis ce qu'elle en garde, ce qu'il lui reste, ce qu'elle reverse et ce que ça coûte en Bourse. Chaque section découle de la précédente.
- **Recherche de cause** : expliquer le pourquoi, pas seulement le chiffre. Par exemple, pourquoi la marge est haute, pourquoi l'action est chère, ce qui fait bouger les résultats. Il faut relier chaque chiffre à sa cause et aux autres sections (« sa marge est haute parce que… », « elle est chère parce que le marché attend… »).
