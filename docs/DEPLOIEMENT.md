# Mettre MASO en ligne

Durée : environ 45 minutes. Tout est gratuit :
- **Supabase** (déjà configuré) : la base de données ;
- **Render** : le service d'analyse Python ;
- **Vercel** : l'application.

Une fois en ligne, MASO s'installe sur le téléphone. Il apparaît alors dans le menu **Partager** de Facebook, WhatsApp et de la galerie.

Les fichiers de configuration sont déjà dans le dépôt :
- `vercel.json` : l'application ;
- `render.yaml` : le service d'analyse ;
- `services/analyse/Dockerfile` : l'image du service d'analyse.

Avant de commencer, poussez la dernière version sur GitHub. Vercel et Render lisent le dépôt.

---

## Étape 1 — Les clés gratuites (15 min)

À coller plus tard dans Render (étape 2). Gardez-les pour vous : ne les mettez jamais dans le code ni dans un message.

| Pour quoi | Où la créer | Variable |
|---|---|---|
| **Assistant IA** (rédaction) | https://console.groq.com → *API Keys* → *Create API Key* | `LLM_API_KEY` (avec `LLM_PROVIDER=groq`) |
| **Vérifications déjà publiées** par les médias (AFP Factuel, Africa Check…) | https://console.cloud.google.com → créer un projet → *API et services* → *Bibliothèque* → activer **Fact Check Tools API** → *Identifiants* → *Créer des identifiants* → *Clé API* | `GOOGLE_FACTCHECK_API_KEY` |
| **Détecteur d'images générées par IA** | https://huggingface.co → *Settings* → *Access Tokens* → *Create new token* → onglet **Fine-grained** → cocher **Make calls to Inference Providers** → *Create token* (un jeton de type « Read » ne suffit pas) | `HF_TOKEN` |

Pour tester en local d'abord :
1. Ajoutez ces 4 lignes dans le fichier `.env` à la racine (`LLM_PROVIDER=groq` remplace `ollama`).
2. Lancez :
   ```bash
   npm run check:config
   npm run service:dev
   ```

`npm run check:config` doit afficher ✅ pour chaque clé.

## Étape 2 — Le service d'analyse sur Render (10 min)

1. https://render.com → se connecter avec GitHub.
2. **New** → **Blueprint** → choisir le dépôt `42hackathon-fanilo2026-maso` → Render lit `render.yaml`.
3. Remplir les variables demandées :
   - `ALLOWED_ORIGINS` : l'adresse Vercel de l'étape 3, par exemple `https://maso-xxx.vercel.app`. Mettez provisoirement `http://localhost:5173` et revenez après l'étape 3.
   - `GOOGLE_FACTCHECK_API_KEY`, `HF_TOKEN`, `LLM_API_KEY` : les clés de l'étape 1.
4. **Apply**. Après le déploiement (5 à 10 minutes), ouvrez `https://maso-analyse.onrender.com/health`. La réponse doit contenir `"status":"ok"`, ainsi que `"assistant": true`, `"factcheck": true` et `"ai_clue": true`.

Sur l'offre gratuite, le service s'endort après 15 minutes sans visite. La première analyse suivante prend environ 50 secondes ; l'application affiche alors « service indisponible » puis réessaie. Avant une démonstration, ouvrez `/health` une fois pour le réveiller.

## Étape 3 — L'application sur Vercel (10 min)

1. https://vercel.com → se connecter avec GitHub → **Add New** → **Project** → importer le dépôt. Vercel lit `vercel.json`.
2. **Environment Variables** :

   | Variable | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | la même que dans votre `.env` |
   | `VITE_SUPABASE_ANON_KEY` | la même que dans votre `.env` |
   | `VITE_ANALYSE_API_URL` | l'adresse Render, ex. `https://maso-analyse.onrender.com` (sans `/` final) |

3. **Deploy** → noter l'adresse obtenue, ex. `https://maso-xxx.vercel.app`.
4. Retour sur Render → *maso-analyse* → *Environment* → `ALLOWED_ORIGINS` = cette adresse → **Save** (redémarrage automatique).

## Étape 4 — Supabase : autoriser la nouvelle adresse (5 min)

1. Tableau de bord Supabase → **Authentication** → **URL Configuration** :
   - *Site URL* : `https://maso-xxx.vercel.app` ;
   - *Redirect URLs* : ajouter `https://maso-xxx.vercel.app/**`.

   Le lien magique, l'invitation et le mot de passe oublié renvoient alors vers l'application en ligne.
2. Fonction de création de comptes, une fois, depuis le dossier du projet :
   ```bash
   npx supabase login
   npx supabase link --project-ref <identifiant du projet, visible dans l'adresse Supabase>
   npx supabase functions deploy invite-user
   ```

## Étape 5 — Sur le téléphone (2 min)

1. Ouvrir `https://maso-xxx.vercel.app` dans **Chrome** (Android) ou **Safari** (iPhone).
2. Menu → **Installer l'application** (iPhone : *Partager* → *Sur l'écran d'accueil*).
3. Dans Facebook, sur une publication :
   - **Partager** → **Plus** (ou *Copier le lien*) → **MASO** : l'analyse s'ouvre directement ;
   - pour une image, appui long → *Enregistrer* → la partager vers MASO depuis la galerie.

Le menu « Partager » vers MASO fonctionne sur Android. Sur iPhone, Apple ne le permet pas pour les applications web : collez le lien ou importez l'image depuis **Vérifier**.

## Vérifier que tout marche

Sur l'application en ligne, **Vérifier** → **Collez ou déposez un contenu** :

| Ce que vous collez | Résultat attendu |
|---|---|
| Le lien d'un article de presse | Titre, image et date lus ; **Analyser l'image de cette page** ; synthèse « Ce que disent les indices » |
| L'adresse d'une image (clic droit → *Copier l'adresse de l'image*) | Analyse complète de l'image, recherche inversée préremplie, vérifications publiées sur la même image |
| Le lien d'une publication Facebook privée | « Contenu non lisible » et la marche à suivre (enregistrer l'image, copier le texte) |
| Un message reçu sur WhatsApp | Signaux de manipulation, affirmations, chiffres comparés aux statistiques, vérifications existantes |

En cas de souci, lancez `npm run check:config` sur le PC : chaque ligne ❌ dit quoi corriger.
