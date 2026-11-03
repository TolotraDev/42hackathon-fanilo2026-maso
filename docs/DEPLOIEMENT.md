# Mettre MASO en ligne, étape par étape

Durée totale : environ 1 heure. Tout est gratuit.

À la fin :
- l'application est accessible à une adresse `https://….vercel.app` ;
- elle s'installe sur un téléphone et apparaît dans le menu **Partager** de Facebook et WhatsApp (Android) ;
- toutes les analyses fonctionnent : vérifications publiées, détecteur d'images IA, assistant de rédaction.

## Comment c'est organisé

```
Téléphone / navigateur
        │
        ▼
  VERCEL  (l'application : pages, boutons)        ← variables VITE_… (publiques)
        │                       │
        ▼                       ▼
  SUPABASE (comptes,       RENDER (service d'analyse Python)   ← les clés secrètes
  dossiers, rapports)            │
                                 ▼
                     Groq · Google Fact Check   (+ détecteur d'images IA intégré)
```

**Règle de sécurité** : les clés secrètes (Groq, Google) vont **uniquement** dans votre fichier `.env` local et dans **Render**.
- Jamais dans Vercel, jamais dans le code, jamais dans un message.
- Les variables `VITE_…` de Vercel sont visibles par tout visiteur du site. C'est normal : la clé « anon » de Supabase est faite pour cela, la sécurité vient des règles de la base.

## Ordre à respecter

| Étape | Quoi | Durée |
|---|---|---|
| 0 | Repartir de zéro (si un ancien déploiement existe) | 5 min |
| 1 | Créer les clés (Groq, Google) | 10 min |
| 2 | Tester les clés sur le PC | 5 min |
| 3 | Mettre le code à jour sur GitHub | 2 min |
| 4 | Service d'analyse sur Render | 10 min |
| 5 | Application sur Vercel | 10 min |
| 6 | Autoriser Vercel dans Render | 2 min |
| 7 | Autoriser Vercel dans Supabase | 5 min |
| 8 | Vérifier que tout marche | 5 min |
| 9 | Installer sur le téléphone | 2 min |

Gardez un fichier texte ouvert pendant toute la procédure : vous y noterez **l'adresse Render** (étape 4) et **l'adresse Vercel** (étape 5).

---

## Étape 0 — Repartir de zéro

À faire seulement si un ancien déploiement existe. Supabase n'est **pas** concerné : on garde le même projet et ses données.

1. **Vercel** :
   1. https://vercel.com → ouvrir le projet.
   2. **Settings** → tout en bas, **Delete Project** → taper le nom du projet → **Delete**.
2. **Render** :
   1. https://dashboard.render.com → ouvrir le service `maso-analyse`.
   2. **Settings** → tout en bas, **Delete Web Service** → confirmer.
   3. Menu de gauche **Blueprints** : si un blueprint `maso` existe, l'ouvrir → **Settings** → **Delete Blueprint**.
3. **Anciennes clés** :
   - Groq : https://console.groq.com/keys → icône corbeille à côté de l'ancienne clé ;
   - Google : https://console.cloud.google.com/apis/credentials → cocher l'ancienne clé → **Supprimer** ;
   - Hugging Face (si vous en aviez créé) : https://huggingface.co/settings/tokens → **⋯** à côté de chaque jeton → **Delete**.
4. **Sur le PC** : dans le fichier `.env` à la racine du projet, les lignes `LLM_API_KEY=`, `GOOGLE_FACTCHECK_API_KEY=`, `SIGHTENGINE_API_USER=`, `SIGHTENGINE_API_SECRET=` et `HF_TOKEN=` doivent être vides. Elles le sont déjà si vous partez de ce guide.

---

## Étape 1 — Créer les clés

Chaque clé n'est affichée **qu'une seule fois** : copiez-la aussitôt dans votre fichier texte.

### 1.1 Groq — assistant de rédaction

1. Ouvrir https://console.groq.com et se connecter (bouton **Sign in**, avec Google ou GitHub).
2. Menu de gauche **API Keys** → bouton **Create API Key**.
3. *Display name* : `maso` → **Submit**.
4. Copier la clé, qui commence par `gsk_…` → **Done**.

### 1.2 Google Fact Check — vérifications déjà publiées par les médias

1. Ouvrir https://console.cloud.google.com et se connecter avec un compte Google.
2. En haut à gauche, à côté de « Google Cloud », cliquer sur le **sélecteur de projet** → **Nouveau projet** → nom `maso` → **Créer**. Attendre la notification, puis **sélectionner** ce projet dans le même menu.
3. Ouvrir https://console.cloud.google.com/apis/library/factchecktools.googleapis.com → bouton **Activer**.
4. Ouvrir https://console.cloud.google.com/apis/credentials → **+ Créer des identifiants** → **Clé API**.
5. La clé s'affiche (commence par `AIza…`) : la copier.
6. Recommandé : dans la même fenêtre, **Modifier la clé** → *Restrictions relatives aux API* → **Restreindre la clé** → cocher **Fact Check Tools API** → **Enregistrer**. Même volée, la clé ne servira alors à rien d'autre.

Aucune carte bancaire n'est nécessaire pour cette API.

### 1.3 Détecteur d'images générées par IA — rien à créer

Le détecteur est **intégré au service d'analyse** : Render télécharge et prépare tout seul le modèle `Organika/sdxl-detector` pendant la construction (étape 4). Il n'y a ni compte, ni clé, ni crédit.

À noter :
- **Hugging Face (API)** est devenu payant : même un compte neuf répond « 402 : no remaining credits ». N'y créez rien.
- **Sightengine** reste possible si vous avez déjà un compte : renseignez `SIGHTENGINE_API_USER` et `SIGHTENGINE_API_SECRET`, il sera alors utilisé en priorité. Sinon, laissez ces variables vides.
- **Sur votre PC**, le modèle (354 Mo) n'est pas téléchargé par défaut. Pour l'avoir aussi en local : `npm run service:model`. C'est facultatif, la version en ligne n'en a pas besoin.

---

## Étape 2 — Tester les clés sur le PC

1. Ouvrir le fichier `.env` à la racine du projet (dans VS Code).
2. Remplir ces lignes, sans espace autour du `=` et sans guillemets :
   ```
   LLM_PROVIDER=groq
   GROQ_MODEL=openai/gpt-oss-120b
   LLM_API_KEY=gsk_…
   GOOGLE_FACTCHECK_API_KEY=AIza…
   HF_TOKEN=
   SIGHTENGINE_API_USER=
   SIGHTENGINE_API_SECRET=
   ```
   Si une ligne n'existe pas, l'ajouter. Enregistrer avec `Ctrl+S`.
3. Dans un terminal, à la racine du projet :
   ```bash
   npm run service:install
   npm run service:dev
   ```
   Laisser ce terminal ouvert.
4. Dans un **deuxième** terminal :
   ```bash
   npm run check:config
   ```
   ✅ Les lignes Google Fact Check et Groq doivent être vertes. Le détecteur d'images IA local apparaît en ⚪ « non téléchargé sur ce PC » : c'est normal. Une ligne ❌ indique exactement quoi corriger.

Le fichier `.env` n'est jamais envoyé sur GitHub (il est dans `.gitignore`).

---

## Étape 3 — Mettre le code à jour sur GitHub

Render et Vercel lisent le code sur GitHub, branche `dev`. Dans le terminal, sur votre branche `tolotra` :

```bash
git status
git add -A
git commit -m "chore : préparation du déploiement"
git push origin tolotra
git push origin tolotra:dev
```

Si `git status` indique « rien à valider », sautez le `add` et le `commit`. Lancez seulement les deux `push`.

---

## Étape 4 — Service d'analyse sur Render

1. Ouvrir https://render.com → **Get Started** → **GitHub** → autoriser Render.
2. Si Render demande à quels dépôts accéder, choisir **Only select repositories** → `42hackathon-fanilo2026-maso` → **Install**.
3. Dans le tableau de bord, **+ New** (en haut à droite) → **Blueprint**.
4. Choisir le dépôt `TolotraDev/42hackathon-fanilo2026-maso` → **Connect**.
5. *Blueprint Name* : `maso`. *Branch* : **dev**. Render lit le fichier `render.yaml` et affiche le service **maso-analyse**.
6. Render demande les variables marquées « à remplir ». Les saisir :

   | Variable | Valeur |
   |---|---|
   | `ALLOWED_ORIGINS` | `http://localhost:5173` pour l'instant (on mettra l'adresse Vercel à l'étape 6) |
   | `GOOGLE_FACTCHECK_API_KEY` | la clé `AIza…` |
   | `SIGHTENGINE_API_USER` | laisser **vide** |
   | `SIGHTENGINE_API_SECRET` | laisser **vide** |
   | `HF_TOKEN` | laisser **vide** |
   | `LLM_API_KEY` | la clé `gsk_…` |

   `LLM_PROVIDER=groq` et `GROQ_MODEL=openai/gpt-oss-120b` sont déjà remplies par le fichier.
7. **Deploy Blueprint**. La construction prend **10 à 15 minutes**, car elle télécharge et prépare le détecteur d'images IA. Dans **Logs**, la ligne `Modèle prêt : … (… Mo)` confirme qu'il est installé.
8. Menu de gauche → cliquer sur **maso-analyse**. Attendre l'état **Live** (vert) en haut.
9. Copier l'adresse affichée sous le nom du service, par exemple `https://maso-analyse.onrender.com` ou `https://maso-analyse-abcd.onrender.com`. **Notez-la : c'est l'adresse Render.**
10. Test : ouvrir `<adresse Render>/health` dans le navigateur. La réponse doit contenir :
    ```
    "status":"ok"  …  "ai_clue":true  "factcheck":true  "assistant":true
    ```
    Si l'une vaut `false`, la clé correspondante manque : **Environment** (menu de gauche) → corriger → **Save Changes**.

L'offre gratuite endort le service après 15 minutes sans visite. Le premier appel suivant prend environ 50 secondes. Avant une démonstration, ouvrez `/health` une fois pour le réveiller.

---

## Étape 5 — Application sur Vercel

1. Ouvrir https://vercel.com → **Sign Up** (ou **Log In**) → **Continue with GitHub**.
2. **Add New…** (en haut à droite) → **Project**.
3. Dans la liste *Import Git Repository*, trouver `42hackathon-fanilo2026-maso` → **Import**.
   S'il n'apparaît pas : **Adjust GitHub App Permissions** → autoriser ce dépôt.
4. Écran *Configure Project* :
   - *Project Name* : `maso`. L'adresse sera proche de `https://maso-xxx.vercel.app`.
   - *Framework Preset* : **Vite**, déjà détecté.
   - *Root Directory* : `./`, ne pas changer.
   - *Build and Output Settings* : ne rien changer (lus dans `vercel.json`).
5. Toujours sur cet écran, ouvrir **Environment Variables** et ajouter les 3 variables **avant** de déployer :

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | la valeur après `VITE_SUPABASE_URL=` dans votre `.env`, ex. `https://xxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | la valeur après `VITE_SUPABASE_ANON_KEY=` dans votre `.env` |
   | `VITE_ANALYSE_API_URL` | **l'adresse Render** de l'étape 4, **sans `/` à la fin** et sans `/health` |

   Pour chacune : taper le nom dans *Key*, coller la valeur dans *Value*, puis **Add**.
6. **Deploy**. Attendre 1 à 2 minutes : des confettis s'affichent.
7. **Continue to Dashboard** → copier l'adresse sous *Domains*, par exemple `https://maso-xxx.vercel.app`. **Notez-la : c'est l'adresse Vercel.**
8. Contrôle : **Settings** → **Git** → *Production Branch* doit être **dev**. Sinon, l'écrire et **Save**.

À retenir :
- **Modifier une variable** plus tard ne suffit pas. Il faut ensuite **Deployments** → **⋯** sur le premier de la liste → **Redeploy**.
- **Chaque `git push` sur `dev`** redéploie automatiquement Vercel et Render.

---

## Étape 6 — Autoriser Vercel dans Render

Sans cette étape, le site affiche « service d'analyse indisponible ».

1. Render → **maso-analyse** → menu de gauche **Environment**.
2. Ligne `ALLOWED_ORIGINS` → **Edit** → remplacer par **l'adresse Vercel**, exactement, sans `/` à la fin : `https://maso-xxx.vercel.app`.
   Pour garder aussi le développement local : `https://maso-xxx.vercel.app,http://localhost:5173`.
3. **Save Changes**. Render redémarre le service tout seul (1 à 2 minutes).

---

## Étape 7 — Autoriser Vercel dans Supabase

### 7.1 Adresses de connexion

Sans ce réglage, le lien magique, l'invitation et « mot de passe oublié » renvoient vers `localhost`.

1. https://supabase.com/dashboard → votre projet.
2. Menu de gauche **Authentication** → **URL Configuration**.
3. *Site URL* : **l'adresse Vercel** → **Save**.
4. *Redirect URLs* → **Add URL** → `https://maso-xxx.vercel.app/**` (avec `/**` à la fin) → **Save URLs**.

### 7.2 Fonction de création des comptes

Elle sert à l'écran **Administration → Inviter un membre**. À faire une seule fois, dans un terminal à la racine du projet :

```bash
npx supabase login
npx supabase link --project-ref <identifiant>
npx supabase functions deploy invite-user
```

- `npx supabase login` ouvre le navigateur : cliquer **Authorize**.
- `<identifiant>` est le mot entre `https://` et `.supabase.co` dans votre `VITE_SUPABASE_URL`, par exemple `kdrgduispofdcvzmbksf`. Si la commande demande le mot de passe de la base de données, appuyez simplement sur **Entrée** pour passer : il n'est pas nécessaire ici.
- Succès : `Deployed Functions on project … : invite-user`.

---

## Étape 8 — Vérifier que tout marche

### 8.1 Vérification automatique

Dans le terminal du PC :

```bash
npm run check:config -- https://maso-xxx.vercel.app
```

Toutes les lignes doivent être ✅. La commande vérifie :
- la version déployée ;
- Supabase intégré au site ;
- le service d'analyse joignable **et autorisé** pour le site ;
- un vrai appel au détecteur d'images IA et à l'assistant.

Une ligne ❌ dit précisément où corriger.

### 8.2 Dans le navigateur

1. Ouvrir l'adresse Vercel dans une **fenêtre de navigation privée** (`Ctrl+Maj+N`).
   Une ancienne version peut rester en mémoire dans une fenêtre normale.
2. Appuyer sur **F12** → onglet **Console**. On doit lire :
   ```
   [MASO] Version 0.1.0 · commit …
   [MASO] Supabase : https://xxxx.supabase.co
   [MASO] Supabase joignable.
   [MASO] Service d'analyse joignable, fonctions : {…}
   ```
   Une ligne **rouge** `[MASO] Mode démonstration` signifie que les variables Vercel manquent : refaire l'étape 5, points 5 et 6.
3. La page de connexion ne doit **pas** afficher le cadre « Comptes de démonstration ».
4. Se connecter avec un compte créé dans Supabase.
5. **Vérifier** → **Collez ou déposez un contenu** → coller le lien d'un article de presse → **Analyser**.
   ✅ Titre et image de l'article, carte « Ce que disent les indices ».

---

## Étape 9 — Installer sur le téléphone

**Android (Chrome)**
1. Ouvrir l'adresse Vercel → menu **⋮** → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
2. Dans Facebook, sur une publication → **Partager** → **Plus d'options** → **MASO** : l'analyse s'ouvre.
3. Pour une image : appui long → **Enregistrer**, puis depuis la galerie → **Partager** → **MASO**.

**iPhone (Safari)**
1. Ouvrir l'adresse Vercel → bouton **Partager** → **Sur l'écran d'accueil**.
2. Apple ne permet pas aux applications web d'apparaître dans le menu « Partager ». Copiez le lien ou enregistrez l'image, puis utilisez **Vérifier** → **Collez ou déposez un contenu**.

---

## En cas de problème

| Ce que vous voyez | Cause | Correction |
|---|---|---|
| Cadre « Comptes de démonstration » en ligne, console : `[MASO] Mode démonstration` | Site construit sans les variables Supabase | Vercel → Settings → Environment Variables (case **Production** cochée) → **Redeploy** |
| Vos changements n'apparaissent pas en ligne | Le déploiement n'est pas en production, ou c'est le cache du navigateur | Vercel → Deployments : le premier doit être **Ready** et **Production** ; tester en navigation privée |
| « Service d'analyse indisponible » | Render endormi, ou `ALLOWED_ORIGINS` sans l'adresse Vercel | Ouvrir `<adresse Render>/health`, attendre 1 min ; vérifier l'étape 6 |
| `check:config` : « Le service REFUSE les appels du site » | `ALLOWED_ORIGINS` différent de l'adresse du site (`/` en trop, `http` au lieu de `https`) | Render → Environment → corriger → Save Changes |
| Détecteur IA : « plus de crédit » / Hugging Face « 402 » | Hugging Face est payant, même pour un compte neuf | Vider `HF_TOKEN` dans Render : le détecteur intégré prend le relais |
| `check:config` : « modèle non préparé sur Render » | Le téléchargement du modèle a échoué pendant la construction | Render → **Manual Deploy** → **Clear build cache & deploy**, puis chercher « Modèle prêt » dans les Logs |
| Render redémarre en boucle, Logs : « Out of memory » | Le détecteur dépasse la mémoire du serveur gratuit | Render → Environment → ajouter `AI_LOCAL_DETECTOR` = `off` → Save (le reste fonctionne) |
| Détecteur IA : « jeton sans la permission » | Jeton Hugging Face de type « Read » | Jeton **Fine-grained** avec « Make calls to Inference Providers », ou passer à Sightengine |
| Sightengine : « Incorrect API user or secret » | Valeurs inversées ou incomplètes | API user = le nombre, API secret = la suite de caractères |
| Assistant : `assistant_unreachable` | Clé Groq invalide ou modèle retiré par Groq | `GROQ_MODEL=openai/gpt-oss-120b` dans Render ; `npm run check:config` liste les modèles disponibles |
| Connexion : « e-mail ou mot de passe incorrect » | Le compte n'existe pas dans **ce** projet Supabase | Supabase → Authentication → Users : créer le compte, ou l'inviter depuis Administration |
| Le lien magique ouvre `localhost` | Adresse du site non réglée dans Supabase | Étape 7.1 |
| « La fonction serveur nécessaire n'est pas déployée » | Fonction `invite-user` absente | Étape 7.2 |
| Page 404 en rechargeant une page | `vercel.json` absent du dépôt | Étape 3 puis redéployer |

## Après la mise en ligne

- **Mettre à jour** : un `git push origin tolotra:dev` redéploie automatiquement Vercel et Render.
- **Changer une clé** : la remplacer dans Render (**Environment** → **Save Changes**) et dans votre `.env`. Aucun redéploiement Vercel n'est nécessaire.
- **Changer une variable `VITE_…`** : Vercel → Settings → Environment Variables, puis **Redeploy**.
- **Après le hackathon** : recréez les clés et supprimez les anciennes, surtout si elles ont été partagées.
