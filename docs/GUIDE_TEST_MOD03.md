# Tester le MOD-03 (Vérifier) pas à pas

Durée : 20 minutes. Tous les fichiers à utiliser sont fournis dans [docs/exemples/](exemples/). Ce sont des images de synthèse, sans personne réelle.

| Fichier | Ce qu'il représente |
|---|---|
| `1-photo-originale.jpg` | Photo « d'inondation » prise avec un téléphone Samsung, avec date et position GPS (Antananarivo) |
| `2-photo-partagee-whatsapp.jpg` | **La même photo** après partage sur WhatsApp : recadrée, recompressée, métadonnées effacées |
| `3-autre-photo.jpg` | Une photo différente |
| `4-photo-retouchee.jpg` | Photo passée dans Photoshop |
| `5-image-generee-ia.jpg` | Image qui déclare avoir été créée par Midjourney (IA) |
| `6-video-deux-plans.mp4` | Vidéo de 4 secondes avec un changement de plan |
| `7-faux-fichier-image.jpg` | Une page web renommée en `.jpg` (piège) |

---

## Étape 0 — Préparer (une fois)

1. **Terminal 1** — le service d'analyse :
   ```bash
   npm run service:dev
   ```
   Laisser ouvert. Il doit afficher `Uvicorn running on http://127.0.0.1:8000`.
2. **Terminal 2** — l'application :
   ```bash
   npm run dev
   ```
3. Ouvrir http://localhost:5173 et **se connecter avec un compte journaliste ou fact-checker** (Joba ou Lucia).

   > ⚠️ Le compte **admin** n'a pas accès à « Vérifier » : c'est voulu (l'admin gère les comptes, il ne vérifie pas les contenus).

4. Cliquer sur **Vérifier** (bouton rond en bas sur mobile, menu à gauche sur ordinateur).

✅ **Attendu** : en bas du hub, la carte **Service d'analyse** affiche **Connecté**, avec *Provenance C2PA : actif*, *Vidéo : actif*, *Lien : actif*, *Fact Check : non configuré*, *Indice IA : non configuré* (normal sans clés, voir la fin du guide).

❌ Si elle affiche **Indisponible** : le terminal 1 est arrêté, ou `VITE_ANALYSE_API_URL=http://localhost:8000` manque dans `.env` (relancer alors `npm run dev`).

---

## Test 1 — Analyser une photo originale

**Vérifier** → tuile **Image** → choisir `docs/exemples/1-photo-originale.jpg`.

Les 7 étapes s'affichent et se terminent en moins d'une seconde.

| Étape | Résultat attendu |
|---|---|
| 1. Réception et empreinte | *Terminée*, SHA-256 (64 caractères) et empreinte perceptuelle |
| 2. Déjà vérifiée ? | *Aucun indice* — « Aucune image identique ou proche dans la base MASO » |
| 3. Métadonnées | *Aucun indice* — Date **12 mars 2024, 08:15**, Appareil **Samsung SM-A145F**, GPS **-18.91444, 47.52194** + carte d'Antananarivo |
| 4. Provenance | *Aucun indice* — « Aucune information de provenance (Content Credentials)… » |
| 5. Recompression | *Terminée* avec un indice ; « Afficher la carte » montre la carte ELA |
| 6. Recherche inversée | 5 boutons : Google Lens, TinEye, Yandex, Bing, InVID-WeVerify |
| 7. Indice IA | *Indisponible* — « Indice IA non configuré sur le service d'analyse » |

Cliquer sur **Limites et outil** sous une étape : l'outil utilisé et les limites du test s'affichent.

## Test 2 — Ajouter la photo à un dossier

Toujours sur la page de la photo, carte **Ajouter au dossier** :
1. Onglet **Nouveau dossier**.
2. *Titre* : `Photo d'inondation à Antananarivo` — *Affirmation* : `Antananarivo inondée ce matin`.
3. *Origine* : `Page Facebook « Info Flash »`.
4. **Ajouter au dossier**.

✅ **Attendu** : « Preuve ajoutée au dossier « Photo d'inondation à Antananarivo » ».
Vérifier dans Supabase : **Table Editor → evidences** (une ligne avec sha256, phash, origin) et **Storage → evidences** (le fichier original).

## Test 3 — La même photo, après WhatsApp → reconnue

**Retour à Vérifier** → **Image** → `2-photo-partagee-whatsapp.jpg`.

| Étape | Résultat attendu |
|---|---|
| 2. Déjà vérifiée ? | **Indice à examiner** — « Cette image correspond à 1 preuve déjà enregistrée dans MASO », avec le dossier du test 2 |
| 3. Métadonnées | *Aucun indice* — « Aucune métadonnée. C'est le cas de presque toute image partagée sur WhatsApp ou Facebook : ce n'est pas une preuve de manipulation. » |

C'est le cœur de la démonstration : l'image a été recadrée et recompressée, son SHA-256 est différent, mais l'**empreinte perceptuelle** la retrouve.

## Test 4 — Une autre photo → non confondue

**Image** → `3-autre-photo.jpg` → étape 2 : *Aucun indice* — « Aucune image identique ou proche ».

## Test 5 — Photo retouchée

**Image** → `4-photo-retouchee.jpg` → étape 3 Métadonnées : **Indice faible** — « Le logiciel déclaré est un outil de retouche : Adobe Photoshop 25.0 (Windows). Une retouche n'est pas forcément une manipulation. »

## Test 6 — Image générée par IA

**Image** → `5-image-generee-ia.jpg` → étape 3 Métadonnées : **Indice à examiner** — « Le logiciel déclaré est un outil de génération d'images : Midjourney v6. »

## Test 7 — Faux fichier

**Image** → `7-faux-fichier-image.jpg` → étape 1 : « Ce fichier n'est pas une image reconnue (le type réel ne correspond pas) ». Aucune autre étape ne s'exécute.

## Test 8 — Vidéo

**Retour à Vérifier** → tuile **Vidéo** → `6-video-deux-plans.mp4`.

| Étape | Résultat attendu |
|---|---|
| 2. Informations techniques | Durée **4 s**, résolution **320×240**, codec **mpeg4**, 10 images/s, son : non |
| 3. Images clés | **4 images**, dont une marquée **Changement de plan** (à 2 s) |

Toucher une image clé → elle s'ouvre dans l'analyse d'image (avec recherche inversée).

## Test 9 — Analyser un lien

**Retour à Vérifier** → tuile **Lien** → saisir `www.example.com` → **Analyser**.

| Étape | Résultat attendu |
|---|---|
| 1. HTTPS | *Aucun indice* — « Le site accepte les connexions sécurisées » |
| 2. Âge du domaine | *Aucun indice* — « example.com a été créé il y a 11 4xx jours » (créé le 14 août 1995) |
| 3. Hébergeur | Adresse IP et hébergeur |
| 4. Annuaire des médias | « Ce site n'a pas encore de fiche dans l'annuaire MASO » |
| 5. Vérifications existantes | « Aucune vérification existante sur ce lien » |
| 6. Archive | « Dernière archive : … » **ou** « Service externe injoignable pour le moment » (archive.org limite parfois les requêtes : c'est signalé, rien n'est inventé) |

Essayer aussi un site d'actualité malgache que vous connaissez : un domaine créé il y a moins de 6 mois donne **Indice à examiner**.

## Test 10 — Une adresse interne est refusée (sécurité)

Saisir `http://127.0.0.1/` → **Analyser** → « Adresse refusée : MASO n'analyse pas les adresses de réseaux internes ou privés. »

## Test 11 — Fiche source

1. Analyser à nouveau `www.example.com` → **Créer la fiche source**.
2. *Identité claire* → **Défavorable**, puis **Enregistrer la fiche** sans justification → refusé : « Chaque critère évalué doit être justifié ».
3. Justification : `Aucune mention légale ni responsable de publication.`
4. *Ancienneté* → **Favorable** — justification : `Domaine créé en 1995 (RDAP).`
5. **Enregistrer la fiche** → score **5/10** (calculé par le serveur).
6. *Détails confidentiels* : `Contact du témoin : +261 34 00 000 00 (fictif)` → **Enregistrer les détails confidentiels**.
7. Analyser de nouveau `www.example.com` → étape 4 : « Fiche « example.com » : score de fiabilité 5/10 ».

Puis **se déconnecter et se connecter en rédactrice en chef** (Lorraine), rouvrir la fiche (même chemin) :
- **Marquer comme vérifiée** → badge « Vérifiée » ;
- **Afficher (consultation journalisée)** → le détail confidentiel apparaît ; dans Supabase, **Table Editor → audit_logs** contient une ligne `read_confidential`.

Avec le compte journaliste, le bouton « Marquer comme vérifiée » n'existe pas.

## Test 12 — Rechercher des vérifications existantes

**Vérifier** → champ du haut : `inondation` → **Rechercher des vérifications existantes** → le dossier du test 2 apparaît.

## Test 13 — Hors connexion

1. Ouvrir **Vérifier → Image** (sans choisir de fichier).
2. **F12** → onglet **Réseau** (Network) → choisir **Hors ligne** (Offline).
3. Choisir `1-photo-originale.jpg`.

✅ **Attendu** : empreinte, métadonnées et recompression se terminent ; *Déjà vérifiée ?* et *Provenance* affichent **En attente de réseau**. Remettre **Pas de limitation** (No throttling) ensuite.

## Ce qui ne se teste pas encore sur ordinateur

- **Partager depuis Facebook / WhatsApp vers MASO** : il faut l'application installée sur un téléphone, donc déployée en HTTPS (MOD-08).
- **Ajouter au dossier hors ligne** : arrive avec MOD-05.

---

## Les réglages du service, en clair

Le tableau du [README du service](../services/analyse/README.md) liste des réglages **facultatifs**. Sans eux, tout ce qui est décrit ci-dessus fonctionne.

| Réglage | En clair | Faut-il le faire ? |
|---|---|---|
| `ALLOWED_ORIGINS` | Les adresses de l'application autorisées à appeler le service. Déjà correct pour `localhost`. | Seulement au déploiement : ajouter l'adresse publique de l'application |
| `GOOGLE_FACTCHECK_API_KEY` | Clé gratuite Google pour chercher les vérifications déjà publiées par les fact-checkers du monde entier | Facultatif, utile pour la démo |
| `HF_TOKEN` | Jeton gratuit Hugging Face pour l'étape « Indice de génération par IA » | Facultatif |
| `AI_IMAGE_MODEL`, `MAX_IMAGE_MB`, `MAX_VIDEO_MB`, `REQUESTS_PER_MINUTE` | Modèle IA, tailles maximales, limite anti-abus | Non, les valeurs par défaut conviennent |

### Activer Google Fact Check (gratuit)

1. https://console.cloud.google.com → créer un projet (ex. `maso`).
2. **APIs et services → Bibliothèque** → chercher **Fact Check Tools API** → **Activer**.
3. **APIs et services → Identifiants → Créer des identifiants → Clé API** → copier la clé.
4. Dans le `.env` à la racine du projet : `GOOGLE_FACTCHECK_API_KEY=la-clé`.
5. Arrêter le terminal 1 (`Ctrl+C`) et relancer `npm run service:dev`.

Le hub affiche alors *Fact Check : actif* ; le test 12 trouve aussi des vérifications publiées en ligne (essayer des mots en anglais ou en français sur un sujet d'actualité).

### Activer l'indice IA (gratuit, expérimental)

1. https://huggingface.co → créer un compte → **Settings → Access Tokens → Create new token** (type *Read*) → copier.
2. Dans le `.env` : `HF_TOKEN=hf_…`
3. Relancer `npm run service:dev`.

> Cette étape n'a pas pu être testée sans jeton. Si le modèle n'est pas disponible chez Hugging Face, l'étape reste « Indisponible » sans rien bloquer.

Ces clés ne doivent **jamais** être commitées : `.env` est ignoré par Git.
