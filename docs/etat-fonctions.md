# État des fonctions : annoncé contre réel

Audit du 31 octobre 2026 (5e passage, A0). Chaque fonction promise sur le site a été **testée** sur le site en ligne (https://repere-bourse.pages.dev), pas supposée. Une ligne par fonction. Les preuves sont indiquées (réponse de l'API, journal de robot, code).

Classes : **opérationnelle** · **partielle** · **annoncée mais pas disponible** · **manquante**.

| Fonction promise | Où c'est promis | État | Preuve | Ce qui a été fait |
|---|---|---|---|---|
| Fiches entreprise (verdict, 5 jauges, médiane du secteur, « Tous les chiffres ») | Accueil, Marchés | **opérationnelle** | 2 852 fiches, `check-contradictions` à 0 | rien |
| Fiches ETF (composition, frais, PEA) | Marchés | **opérationnelle** | 1 134 ETF, page `/etf` | rien |
| Comparateur à 3 (5 en Premium) | Outils | **opérationnelle** | `/comparer?ids=lvmh,kering,hermes` | rien |
| Classements, découvertes, secteurs | Accueil | **opérationnelle** | `/classements`, `/decouvertes` | rien |
| Exemple de fiche sur l'accueil (« Ce que vous obtenez ») | Accueil | **partielle** (lent) | « Chargement de l'exemple… » encore affiché après 2,5 s sur téléphone, rempli après 8 s | à surveiller (E1, vitesse) |
| Logos des entreprises | partout | **partielle** | 33 logos sur 2 852 ; journal du robot (run 41184365749) : chaque appel Wikidata en délai dépassé | A1 : nouveau robot `logos.yml`, pastille à la couleur du secteur en attendant |
| Mon espace : compte, favoris, portefeuille, agenda personnel | /espace | **opérationnelle** | `/api/espace/moi` répond ; création, connexion, code de secours (pas d'e-mail nécessaire) | rien |
| Rapport de la semaine (compte gratuit) | /espace, accueil | **partielle** | la semaine en cours est calculée à l'ouverture de la page (`assurerBilan`) : OK ; **l'historique des semaines et la notification « votre rapport est prêt » dépendent du robot `espace.yml`, qui n'a jamais tourné** : journal des runs 41178501799, 41105522769 : « ADMIN_KEY absent : rien à faire. » | le secret `ADMIN_KEY` doit être ajouté dans GitHub (même valeur que dans Cloudflare) par Romain ; le site le détecte seul (voir ligne suivante) |
| Alertes du soir (annonce, mouvement > 5 %, résultats du lendemain) | /espace, Premium, accueil | **opérationnelle depuis le 31/10 au soir** (ADMIN_KEY posé par Romain dans Cloudflare et GitHub ; run 41240329893 : `{"traites":0,"reste":0,…,"mode":"alertes"}`) ; avant : **annoncée mais pas disponible** | même robot, jamais exécuté (`ADMIN_KEY` absent dans GitHub) | marquée « (bientôt) » sur /espace, /premium et l'accueil **tant que le robot n'a pas tourné une première fois** : le Worker enregistre chaque passage réel (table `etat`), `/api/espace/moi` renvoie `robot.alertes`, le site retire « bientôt » tout seul |
| Notifications sur l'appareil (push) | Réglages de l'espace | **partielle** | `/api/push/cle` répond (clé VAPID) : l'abonnement marche ; l'envoi (`pousser`) est déclenché par le même robot, donc rien n'a jamais été envoyé | même cause : `ADMIN_KEY` |
| E-mail « votre rapport est prêt » | Réglages, /espace/rapport | **annoncée mais pas disponible** | `/api/premium/offres` → `mail: false` (aucun service d'envoi configuré) | déjà marqué « bientôt disponible » sur /espace/rapport ; rien de plus |
| Rapport exemple public | Accueil, /espace | **opérationnelle** | `/api/rapport-exemple` → semaine 2026-W44, calculé | rien |
| Premium : paiement mensuel et annuel | /premium | **annoncée mais pas disponible** (dit honnêtement) | `/api/premium/offres` → `mensuel: null, unique: null` ; la page affiche « Ouverture prochaine » | rien (lot C : essai 14 jours à préparer, Romain configure Stripe) |
| Premium : liste d'attente « Prévenez-moi » | /premium | **opérationnelle** | `POST /api/premium/attente` écrit en base, sans e-mail | rien |
| Premium : « Code perdu ? » (renvoi du code par e-mail) | /premium | **annoncée mais pas disponible** | dépend de l'envoi d'e-mail (`mail: false`) ; l'API répond 503 avec un message clair | message déjà en place ; à revoir avec Stripe (lot C) |
| Premium : résiliation en ligne (portail Stripe) | /premium, CGV | **annoncée mais pas disponible** | `/api/premium/portail` sans `STRIPE_SECRET` | sans objet tant que Premium n'est pas ouvert ; lot D vérifie le texte des CGV |
| IA du site (questions libres, 3 par jour, Workers AI) | ✦ partout, /espace/ia, /demander | **opérationnelle** | `/api/ia/etat` → `disponible: true`, plafonds 3 / 10 / 150 ; `check-ia` 12/12 | rien (B4 : 20 questions) |
| Réponses calculées (recherche par critères, « pourquoi ») | ✦, /demander | **opérationnelle** | `tests/t_ia.py` 100 % | rien (B4 : pastilles modifiables) |
| Connecteur MCP pour ChatGPT et Claude | /connecteur | **opérationnelle** | `POST /mcp initialize` → protocole 2025-11-25 ; `tools/list` → 9 outils | rien (lot C : page `/ia/connecter` à trois étapes) |
| Import de fichiers de courtiers (Trade Republic, BoursoBank, Degiro, Fortuneo, CSV) | /portefeuille | **opérationnelle** | code `pf3` et fixtures `tests/fixtures/portefeuille` | rien |
| Export du portefeuille | /portefeuille | **opérationnelle** | bouton « Exporter » (CSV du site) | rien |
| Académie : 8 modules, 55 leçons, formation guidée de 6 semaines | /apprendre, Premium | **opérationnelle** | `cf/site/data/academie.json` : 8 modules, 55 leçons, 6 semaines (8 à 13 étapes chacune) | rien (A6 : page Apprendre sous 2 800 px) |
| Outils : simulateurs (épargne, frais, PEA/CTO, « et si j'avais »), recouvrement d'ETF, vérifier une offre (listes AMF) | /outils | **opérationnelle** | pages de `tests/audit.py` à 0 problème | rien |
| Communauté (avis, listes, discussions) | /communaute | **opérationnelle** | `/api/communaute` répond | rien |
| Cours différés, mini-courbes de la semaine | Accueil, fiches | **opérationnelle** | `/api/cours` ; `cours-semaine.json` | A5 : étiquette « 5 jours » |
| Comptes trimestriels (« Depuis la clôture ») | Fiches | **partielle** | SEC seulement (`data/sec_trim.mjs`) ; Europe et Asie : Eulerpool en panne (502 depuis le 30/10) ; Samsung, Hyundai, TCS, Aramco, ICBC sans comptes | A7 : import EODHD prêt sans la clé |
| Mentions légales, CGV, confidentialité, avertissement | pied de page | **opérationnelle** (texte à vérifier) | pages en ligne | lot D : médiateur, rétractation, résiliation |

## Ce que Romain doit faire lui-même (clés et secrets, jamais manipulés par l'agent)

1. **`ADMIN_KEY` dans GitHub** (Settings > Secrets and variables > Actions > Secrets), même valeur que dans Cloudflare : le soir même, le robot `espace.yml` prépare les alertes (17 h 43 UTC) ; le samedi, les rapports. Le site retire « (bientôt) » tout seul après le premier passage.
2. Un service d'envoi d'e-mails (`MAIL_FROM` + `BREVO_KEY` ou `RESEND_KEY` dans Cloudflare) pour « votre rapport est prêt » et « code perdu ».
3. Stripe (`STRIPE_SECRET`, liens de paiement) à l'ouverture de Premium (lot C).

## Méthode

Pages lues sur téléphone (375 px) : accueil, /premium, /espace, /espace/rapport, /espace/ia, /outils, /apprendre, /portefeuille, /connecteur, pages légales. API appelées : `/api/premium/offres`, `/api/premium/statut`, `/api/espace/moi`, `/api/rapport-exemple`, `/api/push/cle`, `/api/ia/etat`, `/mcp` (initialize, tools/list). Journaux lus : `espace.yml` (2 derniers runs), `donnees.yml` (run 41184365749, logos).
