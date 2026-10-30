# Signaler une faille de sécurité

Si vous découvrez une faille sur le site bilan. (repere-bourse.pages.dev) ou dans ce dépôt,
merci de la signaler en privé plutôt que dans une issue publique :

- par le formulaire de signalement du site (page « Signaler »), en indiquant « sécurité » ;
- ou par l'onglet « Security » de ce dépôt GitHub (« Report a vulnerability »).

Merci de ne pas exploiter la faille au-delà de ce qui est nécessaire pour la démontrer,
de ne pas accéder aux données d'autres personnes et de ne pas perturber le service.
Une réponse est donnée sous quelques jours ; la correction est publiée dans ce dépôt.

## Ce qui est en place

- Aucune clé secrète dans le dépôt : Stripe, Cloudflare, services d'e-mail et clé
  d'administration sont des secrets GitHub ou des variables Cloudflare.
- Paiements : Stripe uniquement (liens de paiement et portail client) ; le site ne voit
  jamais de numéro de carte ; chaque activation vérifie la session auprès de Stripe.
- Comptes : mots de passe dérivés par PBKDF2-SHA256 (100 000 tours, sel aléatoire),
  session en cookie HttpOnly, Secure, SameSite=Lax ; tentatives limitées par adresse et par compte.
- En-têtes : Content-Security-Policy, HSTS, X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy.
- Requêtes SQL (D1) toujours paramétrées.
- Routes d'administration protégées par une clé comparée à temps constant.
