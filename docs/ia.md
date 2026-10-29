# L'IA de bilan. : étude et architecture retenue

Document du 29 octobre 2026. Réponse à la section 2.2 du cahier des charges : « une alternative économique à l'IA actuelle, sans licence ni abonnement obligatoire ».

## En bref

- **La plupart des réponses du site ne demandent pas de modèle d'IA.** Elles sont calculées dans le navigateur à partir des comptes officiels (règles locales) ou tirées des cours de l'Académie. Le test `tests/t_ia.py` le mesure : sur 509 questions de débutants, toutes reçoivent le traitement attendu, et seule une quinzaine de questions vraiment libres sont volontairement confiées à un modèle ; toutes les autres sont résolues sans appel au serveur.
- **Le modèle de langue ne sert qu'à rédiger** des textes à partir de chiffres déjà calculés : commentaire de la semaine, explication d'une annonce, réponse à une question libre. Si aucun modèle n'est disponible, le site reste complet : les chiffres, verdicts et phrases calculées sont affichés.
- **Architecture retenue (hybride, sans dépendance payante)** : règles locales → leçons → IA installée sur l'appareil (WebLLM) → clé personnelle du visiteur (BYOK, facultative) → IA du serveur sur des offres gratuites (Mistral, Groq, Gemini, OpenRouter), avec quotas. **Workers AI devient facultatif** (`IA_WORKERS_AI=off`).
- **Coût : 0 € par mois** jusqu'à environ 10 000 utilisateurs actifs, grâce au cache des réponses et aux offres gratuites. Aucune facture ne peut partir sans décision : Workers AI est plafonné au palier gratuit par défaut.

## 1. Ce que fait l'IA du serveur aujourd'hui (audit du code)

| Point d'accès | Fichier | Quand | Ce que fait le modèle | Faisable sans IA ? | Quota gratuit par jour (Premium) |
|---|---|---|---|---|---|
| `/api/demande` | `cf/src/demande.mjs` | Copilote « Demander à bilan. », seulement si les règles locales, les leçons et l'IA de l'appareil n'ont rien trouvé | Traduit une question libre en action (filtre, comparaison, fiche, ETF) ; deuxième appel pour rédiger une explication | **Oui en grande partie** : `localCopilot` (ia.js) couvre les recherches par secteur, pays, dette, dividende, prix, comparaisons et définitions | 10 (200) |
| `/api/assistant` | `cf/src/ia.mjs` | Question sur une fiche quand `localAssist` ne sait pas répondre ; « Approfondir » d'une comparaison | Rédige 60 à 230 mots à partir des faits de la fiche envoyés par le navigateur | **En partie** : 20 intentions courantes (prix, dette, dividende, marge, risques, concurrents…) sont calculées localement | 5 (100) |
| `/api/veille` | `cf/src/ia.mjs` | Bilan rédigé d'une liste de favoris, analyse rédigée du portefeuille | Commente des faits calculés (variations, poids, diversification) | **Oui** pour les chiffres et alertes (déjà calculés) ; le modèle n'ajoute que la prose | 1 (20) chacun |
| `/api/resume` | `cf/src/ia.mjs` | Bouton « Lire le résumé détaillé » d'un document AMF ou SEC | Lit le document (PDF converti par Workers AI `toMarkdown`) et le résume | **Non** : résumer un texte long demande un modèle. Les chiffres clés de l'annonce sont déjà extraits sans IA par le robot | 3 (100) |
| `/api/actu/clair` | `cf/src/actu.mjs` | Robot de l'actualité (clé `ADMIN_KEY`) et, à la demande, un visiteur | « En clair » et « Ce que cela change » d'une annonce importante, à partir des chiffres extraits | **En partie** : les phrases de lecture `r` sont calculées sans IA | partagé avec `resume` |
| Synthèse de la semaine | `cf/src/espace.mjs`, `synthese.mjs` | Une fois par semaine et par compte (4 essais au plus) | Commentaire de 3 phrases sur des faits calculés | **Oui** : les 3 phrases « l'essentiel » sont déjà calculées sans IA ; le commentaire est un plus | aucun (robot) |

Toutes les réponses identiques sont gardées dans la table `resumes` de D1 : la même question sur la même fiche ne coûte qu'une fois pour tout le site.

**Limites constatées avant ce lot** : `ia.mjs` refusait de répondre si Workers AI n'était pas branché, même quand Mistral ou Groq l'étaient ; un quota était consommé même quand aucune IA ne pouvait répondre ; le visiteur n'avait aucun moyen d'utiliser son propre compte d'IA.

## 2. Les cinq options comparées

Prix par million de jetons (un jeton fait environ 3 à 4 caractères en français ; une question sur une fiche représente environ 3 000 jetons envoyés et 500 reçus).

### 2.1 IA locale

**a. Dans le navigateur du visiteur (WebLLM, déjà présent)** : un modèle ouvert Qwen (0,8 milliard de paramètres sur téléphone, 2 milliards sur ordinateur) s'installe une fois (environ 0,6 à 1,5 Go) et tourne sur la carte graphique via WebGPU.
- Coût réel : 0 € pour le site, tout est calculé chez le visiteur.
- Performance : quelques secondes par réponse sur un ordinateur récent ; qualité correcte pour classer une demande, plus fragile pour rédiger.
- Confidentialité : excellente, rien ne quitte l'appareil.
- Déploiement : déjà fait.
- Limites : navigateur compatible WebGPU nécessaire, téléchargement initial lourd, téléphones modestes trop lents.
- Évolutivité : parfaite, le coût ne croît pas avec le nombre d'utilisateurs.

**b. Sur le matériel de Romain (Ollama)** : un modèle de 7 à 14 milliards de paramètres sur un ordinateur personnel, exposé au site par un tunnel.
- Coût réel : pas de licence, mais l'électricité d'une machine allumée en permanence (de l'ordre de 10 à 20 € par mois pour une machine de bureau avec carte graphique allumée jour et nuit, selon sa consommation) et l'usure du matériel.
- Performance : bonne avec une carte graphique récente, mais une seule machine sert tout le monde : files d'attente dès quelques utilisateurs simultanés.
- Confidentialité : très bonne (rien ne part chez un tiers).
- Déploiement : délicat (tunnel, sécurité, mises à jour, coupures de courant ou de box).
- Limites : disponibilité liée à la maison de Romain.
- Évolutivité : faible.
- **Usage retenu** : Ollama reste utile **pour Romain lui-même et pour les visiteurs avancés**, via l'écran « Mon IA » (préréglage « Ollama sur mon ordinateur »). Pas comme serveur du site.

### 2.2 BYOK (chaque utilisateur apporte sa clé)

Le visiteur colle sa clé d'un service compatible OpenAI dans « Mon IA ». Les questions partent directement de son navigateur vers ce service.
- Coût réel pour le site : 0 €. Pour le visiteur : 0 € avec une offre gratuite (Groq, Gemini, Mistral, OpenRouter « :free »), sinon quelques centimes par mois.
- Performance : celle du service choisi (très rapide chez Groq).
- Confidentialité : la clé reste dans le navigateur (session par défaut, appareil si le visiteur le demande) ; le service choisi voit les questions et les faits envoyés.
- Déploiement : fait dans ce lot (`cf/site/m/iacle.js`). **Vérifié par une sonde réseau le 29 octobre 2026 : Mistral, Groq, OpenRouter, Gemini, OpenAI, Cerebras et DeepSeek autorisent les appels directs depuis le site (CORS).**
- Limites : réservé aux visiteurs à l'aise avec la notion de clé ; une clé stockée dans le navigateur peut être lue par une extension malveillante (avertissement affiché).
- Évolutivité : parfaite.

### 2.3 IA open source auto-hébergée sur un serveur loué

- Coût réel : un serveur avec carte graphique se loue à l'heure ou au mois, de quelques dizaines à plusieurs centaines d'euros par mois selon la carte ; un serveur sans carte graphique (quelques euros par mois) fait tourner un petit modèle, mais à quelques mots par seconde.
- Performance, confidentialité : bonnes avec un vrai GPU.
- Déploiement : lourd (serveur, sécurité, mises à jour, surveillance).
- Verdict : **pas maintenant**. À reconsidérer seulement au-delà de plusieurs dizaines de milliers de rédactions par jour, où le prix fixe deviendrait plus intéressant que l'usage.

### 2.4 API externes économiques (vérifié le 29 octobre 2026)

| Service | Offre gratuite | Prix payant (entrée / sortie, par million de jetons) | Remarques |
|---|---|---|---|
| **Mistral AI** (France) | 1 requête par seconde, 500 000 jetons par minute, 1 milliard de jetons par mois | Mistral Small 4 : 0,15 $ / 0,60 $ ; Ministral 8B : 0,15 $ / 0,15 $ ; Ministral 3B : 0,10 $ / 0,10 $ | En gratuit, les données peuvent servir à l'entraînement : n'envoyer que des données publiques. |
| **Groq** | gpt-oss-20b : 30 requêtes par minute, 1 000 par jour, 200 000 jetons par jour | gpt-oss-20b : 0,075 $ / 0,30 $ ; gpt-oss-120b : 0,15 $ / 0,60 $ | Llama 3.1 8B et 3.3 70B réservés aux entreprises depuis le 26 août 2026. Très rapide. |
| **Google Gemini** (AI Studio) | Gratuit, limites par projet affichées dans AI Studio | Gemini 3.5 Flash-Lite : 0,30 $ / 2,50 $ ; Gemini 3.8 Flash : 0,75 $ / 3,75 $ jusqu'au 31 décembre 2026, puis 1,50 $ / 7,50 $ | En gratuit, Google utilise les échanges pour améliorer ses produits. |
| **OpenRouter** | Modèles « :free » : 20 requêtes par minute, 50 par jour (1 000 après 10 $ de crédits achetés) | Selon le modèle choisi | Un seul compte pour de nombreux modèles. |
| **Cloudflare Workers AI** | 10 000 neurones par jour | 0,011 $ les 1 000 neurones ; qwen3-30b : 0,051 $ / 0,335 $ ; gpt-oss-20b : 0,20 $ / 0,30 $ ; Mistral Small 3.1 : 0,351 $ / 0,555 $ | Déjà branché ; payant seulement avec l'offre Workers payante. Désormais facultatif. |

Coût d'une question sur une fiche (3 000 jetons envoyés, 500 reçus), si l'on payait : Groq gpt-oss-20b environ 0,0004 $, Mistral Small 4 environ 0,0008 $, Workers AI qwen3-30b environ 0,0003 $.

### 2.5 Architecture hybride (retenue)

Combiner ce qui est gratuit, du plus sobre au plus coûteux, et s'arrêter dès qu'une étape sait répondre.

## 3. Comparaison sur les six critères

| | Coût réel | Performance | Confidentialité | Déploiement | Limites | Évolutivité |
|---|---|---|---|---|---|---|
| Règles locales et leçons | 0 € | Instantané | Totale | Fait | Questions prévues seulement | Parfaite |
| IA de l'appareil (WebLLM) | 0 € | Moyenne | Totale | Fait | WebGPU, 1 Go à télécharger | Parfaite |
| Ollama chez Romain | Électricité | Bonne pour 1 personne | Très bonne | Délicat | Une seule machine | Faible |
| BYOK | 0 € pour le site | Selon le service | Bonne (clé locale) | Fait | Visiteurs avertis | Parfaite |
| Serveur GPU loué | Élevé, fixe | Bonne | Très bonne | Lourd | Maintenance | Moyenne |
| API gratuites (serveur) | 0 € dans les limites | Bonne | Moyenne (offres gratuites) | Fait | Plafonds journaliers | Bonne avec cache |
| Workers AI | 0 € puis à l'usage | Bonne | Bonne | Fait | 10 000 neurones par jour | Bonne |

## 4. Architecture mise en œuvre

```
Question du visiteur
  1. Règles locales (cf/site/ia.js)          instantané, illimité, dans le navigateur
  2. Leçons de l'Académie (chercheLecons)     questions de fond
  3. IA de l'appareil (WebLLM, LIA)           si le visiteur l'a installée
  4. Clé personnelle (BYOK, m/iacle.js)       si le visiteur en a enregistré une
  5. IA du serveur (/api/*, cf/src/llm.mjs)   Mistral → Groq → Gemini → OpenRouter → Workers AI (facultatif)
                                              avec cache D1 et quotas journaliers (compte.mjs, LIMITS)
Rien n'a répondu : chiffres, verdicts calculés et leçons restent affichés.
```

**Côté navigateur (`cf/site/m/iacle.js`)**
- `iaFetch()` est enveloppée : tout appel à `/api/assistant`, `/api/veille` (bilan rédigé) ou `/api/demande` essaie d'abord l'IA de l'appareil (si elle n'a pas déjà été essayée par l'appelant), puis la clé personnelle, puis le serveur. Les consignes sont les mêmes qu'au serveur (`/data/prompts.json`, généré par `build.mjs` à partir de `ia.mjs` et `demande.mjs`), et une action proposée par le modèle passe par le même contrôle (`iaValide`).
- La clé n'est envoyée qu'à l'adresse du service choisi (en-tête `Authorization`), jamais au site : l'appel part avec `credentials: "omit"` et sans référent. Le test `tests/t_iacle.py` inspecte toutes les requêtes vers le site pour le vérifier.
- Adresses acceptées : `https://` ou `http://localhost` (Ollama). Clé gardée pour la session par défaut, sur l'appareil seulement si le visiteur coche la case.
- Si la clé est refusée, épuisée ou injoignable, un message s'affiche une fois et le serveur prend le relais.
- Page « Mon IA » (`/espace/ia`, avec ou sans compte ; onglet dans Mon espace) : la chaîne en 5 étapes avec l'état de chacune, l'installation de l'IA de l'appareil, le formulaire de clé avec avertissements, test, pause et suppression.

**Côté serveur (`cf/src/llm.mjs`)**
- Rotation : Mistral, Groq, Gemini, OpenRouter, puis Workers AI. Chaque service n'est utilisé que si sa clé est définie.
- `IA_WORKERS_AI=off` : Workers AI n'est jamais appelé. `IA_SERVEUR=off` : aucune IA du serveur. `IA_NEURONES_JOUR` : plafond Workers AI (10 000 par défaut).
- `ia.mjs`, `demande.mjs`, `actu.mjs` ne dépendent plus de Workers AI : ils répondent avec n'importe quel service configuré, et renvoient un 503 clair sans consommer de quota quand aucun ne l'est.
- `GET /api/ia/etat` : noms des services actifs (jamais de clé), pour l'écran « Mon IA ».
- Workers AI reste utile pour une seule chose sans équivalent gratuit simple : convertir les PDF de l'AMF en texte (`toMarkdown`, gratuit pour la plupart des formats). Sans lui, les résumés de PDF sont indisponibles ; ceux des dépôts SEC (HTML) fonctionnent.

### Actions manuelles conseillées (Romain)

1. Créer une clé gratuite Mistral (console.mistral.ai) et une clé gratuite Groq (console.groq.com), les ajouter comme secrets `MISTRAL_KEY` et `GROQ_KEY` dans Cloudflare Pages. Facultatif : `GEMINI_KEY` (aistudio.google.com).
2. Si l'on veut se passer de Workers AI pour la rédaction : variable `IA_WORKERS_AI=off`. **Attention** : le 29 octobre 2026, `/api/ia/etat` en production indique `["workers-ai"]` seulement. Ajouter d'abord au moins une clé gratuite (étape 1), sinon l'IA du serveur s'éteint (le site reste utilisable, sans rédaction en ligne).
3. Ne pas passer à l'offre Workers payante pour l'IA : ce n'est pas nécessaire.

## 5. Coûts mensuels estimés de l'IA

| Utilisateurs actifs par mois | Rédactions serveur par jour (après cache) | Coût avec l'architecture retenue | Si l'on payait tout (Groq gpt-oss-20b) |
|---|---|---|---|
| 100 | environ 10 | 0 € | moins de 0,20 $ |
| 1 000 | environ 100 | 0 € | environ 1 $ |
| 10 000 | environ 1 000 | 0 € (Mistral gratuit : 1 000 rédactions de 3 500 jetons font environ 105 millions de jetons par mois, loin du milliard) | environ 11 $ |

Au-delà, la croissance est absorbée d'abord par les étapes 1 à 4, qui ne coûtent rien au site. Le seul risque est un changement des offres gratuites ; la rotation entre quatre fournisseurs et le repli sur les réponses calculées le couvrent.

## Sources (consultées le 29 octobre 2026)

- Mistral, limites de l'offre gratuite : https://help.mistral.ai/en/articles/225174-what-are-the-limits-of-the-free-tier
- Mistral, prix des modèles (relevé du 25 octobre 2026) : https://www.aipricing.guru/mistral-ai-pricing/ ; page officielle : https://mistral.ai/pricing
- Groq, limites gratuites : https://console.groq.com/docs/rate-limits ; prix : https://console.groq.com/docs/models ; retrait de Llama du libre-service : https://www.usagepricing.com/blueprint/activity/groq-2026-08-26-llama-enterprise-only
- Gemini, prix et utilisation des données : https://ai.google.dev/gemini-api/docs/pricing ; limites : https://ai.google.dev/gemini-api/docs/rate-limits
- OpenRouter, limites des modèles gratuits : https://openrouter.ai/docs/api/reference/limits
- Workers AI : https://developers.cloudflare.com/workers-ai/platform/pricing/ ; conversion en Markdown : https://developers.cloudflare.com/workers-ai/features/markdown-conversion/
- Ollama, origines autorisées (`OLLAMA_ORIGINS`) : https://docs.ollama.com/faq
- Appels directs depuis le navigateur : sonde `data/sonde/archi.mjs` (requêtes OPTIONS et POST sans clé depuis l'origine du site, 29 octobre 2026).
