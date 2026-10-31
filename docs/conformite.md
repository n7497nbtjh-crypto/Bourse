# Conformité de bilan. (état au 31/10/2026)

Ce document sépare ce qui est **en place et vérifiable** de ce qui **demande l'avis d'un avocat ou une décision de Romain**. Il ne remplace pas un conseil juridique.

## 1. En place (vérifiable sur le site)

| Sujet | Où | Ce qui est fait |
|---|---|---|
| Mentions légales | /mentions-legales | Hébergeur (Cloudflare), prestataires (Stripe, Workers AI), nature du site, sources des données. |
| CGV | /cgv | Deux formules (4,90 €/mois, 39 € pour 12 mois sans renouvellement), essai 14 jours sans carte, limites du connecteur, rétractation 14 jours et règle du contenu numérique fourni immédiatement (accord exprès + renoncement), résiliation en ligne. |
| Résiliation aussi simple que l'abonnement | Page Premium, bouton « Gérer ou résilier mon abonnement » (portail Stripe) | Disponible depuis tout appareil où l'accès est actif. |
| RGPD : registre simplifié | /confidentialite | Données, finalité, base légale, durée pour : Mon espace, IA du site, abonnement, essai, protection contre les abus, mesure de fréquentation. Droits (accès, effacement, portabilité, réclamation CNIL). |
| Durées de conservation appliquées par le code | `cf/src/espace.mjs` (tâche quotidienne) | Sessions 60 j, alertes 90 j, rapports 26 semaines, e-mail d'essai 12 mois, compteurs 2 ans, cache IA 48 h. Suppression de l'espace : tout est effacé (compte, portefeuille, rapports, alertes, adresse du connecteur). |
| Cookies | /confidentialite | Un seul cookie (`bilan_s`, session, HttpOnly, Secure, SameSite=Lax), strictement nécessaire : pas de bandeau requis (lignes directrices CNIL). Aucun traceur tiers. |
| Mesure d'audience | `compterEvt` | Compteurs agrégés par semaine, sans IP, sans cookie, sans identifiant. |
| Pas de conseil | Partout | Aucune recommandation d'achat ou de vente, aucune prédiction, aucun « profil + titres proposés ». Mention courte en pied de page et sur chaque fiche. |

## 2. À trancher avec un avocat

1. **Information ou recommandation personnalisée ?** Le site donne des chiffres, des médianes et des zones vertes / rouges sur des entreprises. La frontière entre information générale et « recommandation personnalisée » (au sens de MIF 2 et du Code monétaire et financier) doit être confirmée, en particulier pour :
   - la radiographie du portefeuille (risque, concentration, PEA) : elle décrit, elle ne propose rien, mais elle porte sur la situation de la personne ;
   - les réponses de l'IA du site à une question libre (« dois-je vendre ? » est refusé, mais une formulation détournée reste possible).
2. **Statut CIF** : faut-il un statut (conseiller en investissements financiers, ORIAS) si Premium est payant ? À ce jour le site n'en a pas et ne doit rien conseiller.
3. **Mentions de risque** : formulation exacte attendue par l'AMF pour un site d'information grand public (perte en capital, performances passées).
4. **Données de marché** : licences des sources (SEC : domaine public ; Eurostat, BCE ; widget TradingView avec mention) à revoir si le site devient payant à grande échelle.
5. **Transfert hors UE** : Cloudflare et Stripe sont américains ; vérifier l'adhésion au Data Privacy Framework et les clauses contractuelles types dans leurs contrats.

## 3. À faire par Romain (le site ne peut pas l'inventer)

- Identité de l'éditeur dans les mentions légales : nom, statut (micro-entreprise ?), SIRET, adresse, e-mail de contact. Champs entre crochets dans `data/legal.json`, liste dans `a_faire`.
- **Médiateur de la consommation** : obligatoire dès qu'on vend à des particuliers. Adhérer à un médiateur agréé (liste sur economie.gouv.fr) et inscrire son nom et son adresse dans les CGV.
- CGV section 8 (garanties et responsabilité) : relire les crochets restants.
- Stripe : activer le portail client avec la résiliation en un clic ; vérifier que la case « j'accepte l'exécution immédiate et renonce à mon droit de rétractation » est bien demandée au paiement.
- Essai 14 jours : mettre `ESSAI_14J=1` dans Cloudflare quand vous voulez l'ouvrir.
