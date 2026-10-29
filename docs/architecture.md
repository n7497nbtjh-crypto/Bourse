# Architecture et coûts de bilan.

Mise à jour du 29 octobre 2026 (IA simplifiée). La partie 1 se lit sans connaissances techniques. La partie 2 sert à la personne qui maintient le site.

## Partie 1. L'essentiel

**Ce qu'est le site.** Une application web : elle s'ouvre dans n'importe quel navigateur, sur téléphone ou ordinateur, et peut s'installer sur l'écran d'accueil. Elle repose sur quatre briques.

| Brique | Rôle | Image simple |
|---|---|---|
| Cloudflare Pages | Héberge les pages et les données, au plus près du visiteur. | La vitrine |
| Worker Cloudflare | Répond à ce qui n'est pas un simple fichier : comptes, Premium, titres des pages pour Google, connecteur pour ChatGPT et Claude. | Le guichet |
| D1 | Base de données des comptes (favoris, portefeuille, bilans, alertes). | Le classeur |
| GitHub Actions | Robots qui collectent les données officielles, testent et mettent en ligne. | L'équipe de nuit |

**L'IA, en une phrase.** Le site calcule ses réponses dans le navigateur du visiteur, gratuitement et sans limite ; un visiteur qui veut des réponses rédigées obtient des réponses rédigées par l'IA du site (Cloudflare Workers AI, dans la part gratuite du jour, plafonnée). Le site ne paie aucune IA : il reste dans la part gratuite de Workers AI. Détails : `docs/ia.md`.

**Pourquoi c'est solide.**
- Les données changent au plus une fois par jour : elles sont calculées à l'avance et servies comme de simples fichiers. C'est rapide, gratuit et presque impossible à faire tomber.
- Aucun serveur à surveiller. Chaque mise en ligne est testée automatiquement, et la précédente se remet en un clic.
- Plus il y a de visiteurs, plus le travail se fait chez eux (calculs, IA) : le coût du site ne suit pas l'audience.

**Ce qui coûte, et combien.**

| Visiteurs actifs par mois | Coût mensuel |
|---|---|
| 100 | 0 € |
| 1 000 | 0 € |
| 10 000 | 0 € à 5 $ (offre Workers payante seulement si les pages les plus lourdes dépassent la limite de calcul gratuite) |
| 100 000 | environ 5 à 10 $ (offre Workers payante) |

Hors audience : un nom de domaine (une dizaine d'euros par an, facultatif) et, tant que le dépôt GitHub reste privé, environ 3 à 6 $ par mois de robots au-delà du forfait gratuit (gratuit si le dépôt devient public). Aucune licence de données : toutes les sources sont publiques et gratuites. **Aucune facture d'IA possible.**

**Services indispensables.** Cloudflare (Pages, Worker, D1) et GitHub. Remplaçables mais utiles : Stripe (Premium), Brevo, Resend ou Mailjet (e-mails). Plus aucun service d'IA côté site.

**Limites à surveiller.** 20 000 fichiers par site en gratuit (environ 11 600 aujourd'hui) ; 100 000 passages par jour par le Worker en gratuit (les fichiers de données n'en consomment pas).

---

## Partie 2. Détails techniques

### Carte du code
```
cf/site/index.html     page unique : HTML, CSS, routeur route(), helpers globaux
cf/site/ia.js          réponses calculées (localCopilot, localAssist, chercheLecons)
cf/site/calc.js        calculs financiers
cf/site/m/*.js         modules chargés après le script principal (ordre en bas d'index.html)
cf/site/m/orchestre.js panneau ✦ : le seul point d'entrée de l'IA (orcIaOpen, orcIaAsk)
cf/site/m/monia.js     L'IA du site côté navigateur (appels à /api/ia), iaRediger, miaCopilote, page /espace/ia
cf/src/*.mjs           Worker, assemblé par node build.mjs en cf/site/_worker.js
  worker.mjs           routes /api/*, meta() des pages ; anciennes routes d'IA → 410 (iaRetiree)
  consignes.mjs        consignes données à l'IA connectée (→ cf/site/data/prompts.json) + regles.mjs
  compte.mjs           Premium (Stripe), e-mails
  espace.mjs, synthese.mjs   Mon espace, bilan de la semaine (chiffres calculés)
  veille.mjs           bilan hebdomadaire des favoris par e-mail
  mcp.mjs              connecteur /mcp (« Utiliser bilan. dans ChatGPT ou Claude »)
data/*.mjs             scripts de collecte (.github/workflows/*.yml)
tests/                 tests node et Playwright
```

### Flux d'une visite
1. `/entreprise/lvmh` : le Worker renvoie `index.html` avec le titre et la description de la page.
2. Le navigateur charge les données (`/data/*`) directement depuis Pages, sans passer par le Worker.
3. Les modules `m/*.js` complètent le script principal, puis `route()` affiche la page.
4. Une question : réponse calculée dans le navigateur ; si le visiteur a connecté son IA, appel à `/api/ia/rediger` : le serveur (`cf/src/iasite.mjs`) appelle Workers AI dans la limite gratuite.

### Développer et tester
```
node build.mjs                                  # _worker.js, prompts.json, sitemap.xml (fichiers non commités)
npx wrangler@3.114.0 pages dev cf/site --d1 DB  # site local
node tests/t_calc.mjs && node tests/t_worker.mjs && node --no-warnings tests/t_compte.mjs
node --no-warnings tests/t_espace.mjs && node --no-warnings tests/t_synthese.mjs
python3 tests/audit.py     # toutes les pages, 3 largeurs : 0 problème attendu
python3 tests/t_ia.py      # réponses calculées : 100 % attendu
python3 tests/t_monia.py   # IA du site (serveur simulé) : réponses, limites du jour
```

### Mise en ligne
Un `git push` sur `main` qui touche le site lance `.github/workflows/site.yml` (construction, tests, `wrangler pages deploy`). Les données ont leurs propres robots (`donnees.yml`, `actu.yml`, `espace.yml`, `etf.yml`, `facteurs.yml`).

### Installation sur un nouveau compte Cloudflare
1. Workers & Pages > Pages > « Direct upload », projet `repere-bourse`.
2. D1 > créer une base ; projet Pages > Settings > Bindings : D1 nommée `DB`. Aucun binding d'IA.
3. Variables et secrets :

| Nom | Obligatoire | Rôle |
|---|---|---|
| `ADMIN_KEY` | Oui | Protège les tâches des robots. |
| `HASH_SALT` | Conseillé | Sel des identifiants anonymes. |
| `MAIL_FROM`, `BREVO_KEY`, `RESEND_KEY`, `MAILJET_KEY`, `MAILJET_SECRET` | Non | E-mails de Mon espace. |
| `STRIPE_SECRET`, `STRIPE_LINK_MENSUEL`, `STRIPE_LINK_UNIQUE`, `PRIX_MENSUEL`, `PRIX_UNIQUE` | Non | Premium. |
| `SITE_URL` | Non | Adresse publique dans les e-mails. |

La liaison `AI` (Workers AI) sert à l'IA du site : **à garder**. Les anciennes variables d'IA (`MISTRAL_KEY`, `GROQ_KEY`, `GEMINI_KEY`, `OPENROUTER_KEY`, `IA_SERVEUR`, `IA_WORKERS_AI`, `*_MODEL`) ne servent plus : Romain peut les supprimer dans Cloudflare. `IA_NEURONES_JOUR` et `IA_QUESTIONS_JOUR` (facultatives) règlent les plafonds.

4. GitHub > Secrets : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_KEY` ; variable `CONTACT`.
5. Nom de domaine : Pages > Custom domains, puis mettre `SITE_URL` à jour. Les visiteurs devront reconnecter leur IA (le stockage du navigateur dépend de l'adresse).
6. Retour arrière : Pages > Deployments > « Rollback ».

### Contraintes
- Un module `m/*.js` ne redéclare jamais avec `const`/`let` un nom d'`index.html` (voir `CHANTIERS.md`).
- Toute nouvelle page va dans `meta()` de `cf/src/worker.mjs`.
- Le conteneur des agents ne joint que GitHub et npm : les sites externes passent par la sonde (`sonde.yml`).

### Sources des prix (29 octobre 2026)
- Workers, D1 : https://developers.cloudflare.com/workers/platform/pricing/ (gratuit : 100 000 requêtes par jour, 10 ms de calcul ; payant : 5 $ par mois).
- Pages : https://developers.cloudflare.com/pages/platform/limits/ (20 000 fichiers en gratuit) ; fichiers statiques gratuits et illimités : https://developers.cloudflare.com/pages/functions/pricing/
- GitHub Actions : https://docs.github.com/en/billing/concepts/product-billing/github-actions
