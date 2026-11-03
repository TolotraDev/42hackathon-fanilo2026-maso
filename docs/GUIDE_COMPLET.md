# MASO — le guide complet, pas à pas

Ce guide accompagne quelqu'un qui découvre MASO. Il explique d'abord **les mots** utilisés dans l'application, puis fait suivre **un cas réel du début à la fin** : une rumeur signalée par le public, vérifiée par l'équipe, validée par le rédacteur en chef, publiée, puis consultée et vérifiée par le public. Il termine par **le reste de la plateforme** (veille, ressources, profil, administration, téléphone, hors connexion).

Durée du parcours complet : environ 1 h 30. Vous pouvez vous arrêter à la fin de n'importe quelle étape et reprendre plus tard.

---

## Sommaire

- [Partie A — Comprendre MASO](#partie-a--comprendre-maso)
- [Partie B — Se préparer](#partie-b--se-préparer)
- [Partie C — Le parcours complet, d'une rumeur à sa publication](#partie-c--le-parcours-complet-dune-rumeur-à-sa-publication)
- [Partie D — Le reste de la plateforme](#partie-d--le-reste-de-la-plateforme)
- [Partie E — Quand quelque chose ne marche pas](#partie-e--quand-quelque-chose-ne-marche-pas)

---

## Partie A — Comprendre MASO

### A.1 À quoi sert MASO ?

Une photo, une vidéo, un lien ou un message circule sur Facebook ou WhatsApp. Est-ce vrai ? MASO aide une rédaction à **le vérifier sérieusement**, à **documenter** chaque étape, à **faire valider** le résultat par un responsable, puis à **publier** un rapport que tout le monde peut lire, partager et contrôler.

### A.2 La règle d'or : la machine donne des indices, l'humain décide

MASO ne dit **jamais tout seul** « c'est vrai » ou « c'est faux ».
- Les outils donnent des **indices**, chacun avec sa **source**.
- Un **journaliste** rassemble les **preuves**.
- Un **fact-checker** propose un **verdict**.
- Un **rédacteur en chef** valide et publie.

Ce n'est pas une faiblesse : c'est ce qui rend le résultat fiable. Une machine peut se tromper sans le savoir.

### A.3 Les mots à connaître

| Mot | Ce que c'est | Exemple |
|---|---|---|
| **Signalement** | Un contenu douteux envoyé à MASO, souvent par le public, sans compte | Un lecteur envoie une photo « Antananarivo inondée ce matin » |
| **Code de suivi** | Le numéro remis à la personne qui signale, pour suivre l'avancée de la vérification | `A3F9K2M7QX` |
| **Alerte** | Un signalement ou un article repéré dans la **veille**, classé par niveau (faible, moyen, élevé) | 3 personnes signalent la même rumeur : le niveau monte |
| **Dossier** | Le classeur d'une vérification : tout ce qui concerne une rumeur y est rangé | Dossier « Photo d'inondation à Antananarivo » |
| **Affirmation** | La phrase précise que l'on vérifie | « Antananarivo est inondée ce matin » |
| **Preuve** | Un élément versé au dossier, numéroté P1, P2… | P1 : l'archive montrant la même photo en 2024 |
| **Source** | Un média, un site, une page ou une personne d'où vient une information. MASO lui donne un **score de fiabilité** sur 10 | « Info Flash Mada » : 3,5/10 |
| **Personne-ressource** | Un expert à contacter pour confirmer un fait | Un météorologue, un médecin, un statisticien |
| **Demande de confirmation** | Le suivi d'un contact pris avec une personne-ressource | « Envoyée », « Répondue », « Sans réponse » |
| **Indice** | Le résultat d'un test technique : **Aucun indice**, **Indice faible** ou **Indice à examiner**. Jamais une conclusion | Métadonnées absentes : aucun indice (c'est normal après WhatsApp) |
| **Synthèse « Ce que disent les indices »** | Le résumé en tête de chaque analyse : niveau de vigilance, vérifications déjà publiées par les médias, chaque indice avec sa source | « Vigilance élevée — Déjà vérifié par AFP Factuel : Faux » |
| **Niveau de vigilance** | Faut-il se méfier ? **Élevée**, **Modérée** ou **Aucun signal d'alerte**. Ce n'est pas un verdict | « Aucun signal d'alerte » ne veut pas dire « vrai » |
| **Empreinte (SHA-256)** | La « carte d'identité » unique d'un fichier. Un seul pixel changé, et l'empreinte change | Prouve que la preuve n'a pas été modifiée |
| **Empreinte visuelle (pHash)** | Reconnaît une image **qui ressemble** à une autre, même recompressée ou un peu recadrée | La photo repartagée sur WhatsApp est reconnue |
| **Métadonnées (EXIF)** | Informations cachées dans une photo : date, appareil, logiciel, position GPS | « Prise le 12/03/2024 avec un Samsung » |
| **Recherche inversée** | Chercher sur Internet où une image est déjà apparue (Google Lens, TinEye…) | Retrouver la première publication d'une photo |
| **Checklist** | Les 17 questions à se poser avant de conclure, en 5 blocs : origine, contexte, contenu, sources, contradictoire | « Qui a publié en premier ? » |
| **Verdict** | La conclusion, proposée par le fact-checker, avec un **niveau de confiance** (élevé, moyen, faible) | « Hors contexte », confiance élevée |
| **Rapport** | Le texte publié pour le public : résumé, explication, méthode, affirmations liées aux preuves | — |
| **Revue éditoriale** | L'écran où le rédacteur en chef relit le rapport et décide | Valider et publier, demander une correction… |
| **Signature numérique** | Un sceau posé sur le rapport au moment de la publication : toute modification ultérieure est détectée | — |
| **QR code** | Le carré à scanner avec un téléphone pour vérifier qu'un rapport ou un badge est authentique | — |
| **Portail public** | La partie du site accessible **sans compte** : rapports publiés, signaler, suivre, vérifier | — |
| **Badge de presse** | La carte d'identité numérique d'un journaliste, avec QR code, vérifiable par le public | « Badge valide, valable jusqu'au… » |

### A.4 Les 7 verdicts possibles

Chaque verdict est toujours **écrit en toutes lettres**, jamais seulement une couleur.

| Verdict | Signification |
|---|---|
| **Confirmé** | L'affirmation est exacte et étayée par des preuves. |
| **Plutôt vrai** | Exacte pour l'essentiel, avec des imprécisions mineures. |
| **Trompeur** | Contient des éléments exacts mais donne une impression fausse. |
| **Hors contexte** | Contenu authentique présenté avec une date, un lieu ou un sens qui ne sont pas les siens. |
| **Faux** | L'affirmation est contredite par les preuves. |
| **Contenu fabriqué** | Contenu créé ou modifié pour tromper, y compris par IA générative. |
| **Non vérifiable** | Les éléments disponibles ne permettent pas de conclure à ce jour. |

### A.5 Les rôles : qui fait quoi

| Rôle | Ce qu'il fait | Ce qu'il ne peut pas faire |
|---|---|---|
| **Public** (sans compte) | Lit les rapports, signale un contenu, suit son signalement, vérifie un rapport ou un badge | Rien d'autre |
| **Journaliste** | Prend en charge les signalements, crée les dossiers, analyse, rassemble preuves et sources, remplit la checklist | Proposer un verdict, publier |
| **Fact-checker** | Tout ce que fait le journaliste, plus : rédige le rapport et **propose le verdict** | Publier |
| **Rédacteur en chef** | Relit, demande des corrections, **valide et publie** | Valider un verdict qu'il a lui-même proposé |
| **Administrateur** | Crée les comptes, émet les badges, règle les paramètres, consulte le journal d'audit | Lire ou modifier les dossiers |

Ces règles sont vérifiées **par le serveur**, pas seulement par l'affichage : impossible de les contourner.

### A.6 Les étapes d'un dossier (statuts)

```
Nouveau → En analyse → À vérifier → À relire → Publié
              ▲            │            │
              │            │            ├→ Correction demandée (par le rédacteur en chef)
              │            │            ├→ En analyse (vérification complémentaire)
              │            │            └→ Classé (rejeté)
              │            └→ Correction demandée (« À refaire » du fact-checker, avec motif)
              └── le journaliste corrige puis renvoie
```

| Statut | Signification |
|---|---|
| **Nouveau** | Le dossier vient d'être créé |
| **En analyse** | Le journaliste relit le rapport d'analyse automatique et complète le dossier |
| **À vérifier** | Le journaliste a validé son rapport d'analyse : au tour du fact-checker |
| **En attente de réponse** | On attend la réponse d'une personne contactée |
| **À relire** | Le fact-checker a vérifié et proposé un verdict avec sa note : au tour du rédacteur en chef |
| **Correction demandée** | Le fact-checker (« À refaire ») ou le rédacteur en chef a renvoyé le dossier, avec un motif |
| **Validé** | Accepté, pas encore publié |
| **Publié** | Visible par tous sur le portail public, signé |
| **Classé** | Fermé sans publication |

Chaque changement de statut demande un **motif écrit** et reste dans l'**Historique** du dossier.

---

## Partie B — Se préparer

### B.1 Ouvrir MASO

- **En ligne** : ouvrez l'adresse du site (ex. `https://maso-xxx.vercel.app`) dans Chrome, Edge ou Firefox.
- **Sur le PC, en démonstration** : `npm run dev` puis http://localhost:5173. Sans Supabase configuré, l'écran de connexion propose des **comptes de démonstration** en un clic.

La première fois, trois écrans de présentation s'affichent : choisissez la langue (**FR**, **MG** ou **EN**), puis **Suivant** jusqu'à **Commencer**.

### B.2 Les comptes

Il faut quatre comptes pour jouer tous les rôles. En ligne, l'administrateur les crée (voir [D.6](#d6-administration-administrateur)) ; en démonstration, ils existent déjà (mot de passe `Maso2026!demo`).

| Rôle | Compte de démonstration |
|---|---|
| Journaliste | `journaliste@maso.demo` |
| Fact-checker | `factchecker@maso.demo` |
| Rédacteur en chef | `redaction@maso.demo` |
| Administrateur | `admin@maso.demo` |

**Changer de compte** : icône de déconnexion en haut à droite (ou **Profil → Se déconnecter**) → **confirmer**.

**Astuce** : gardez **une fenêtre de navigation privée** ouverte à côté (`Ctrl+Maj+N`) : c'est le **public**, sans compte.

### B.3 Les fichiers d'exemple

Ils sont dans le dossier `docs/exemples/` du projet. Copiez-les sur le bureau pour les retrouver facilement.

| Fichier | À quoi il sert dans ce guide |
|---|---|
| `1-photo-originale.jpg` | La photo « virale » à vérifier (avec ses métadonnées d'origine) |
| `2-photo-partagee-whatsapp.jpg` | La même photo, recompressée par WhatsApp (sans métadonnées) |
| `3-autre-photo.jpg` | Une photo sans rapport, pour comparer |
| `4-photo-retouchee.jpg` | Une photo retouchée localement |
| `5-image-generee-ia.jpg` | Une image dont les métadonnées déclarent un outil d'IA |
| `6-video-deux-plans.mp4` | Une courte vidéo montée en deux plans |
| `7-faux-fichier-image.jpg` | Un faux fichier (un texte renommé en `.jpg`) |
| `8-annuaire-import.csv` | Une liste de contacts à importer dans l'annuaire |

### B.4 Se repérer dans l'écran

- **Sur ordinateur** : le menu est à gauche (Accueil, Veille, Vérifier, Ressources, Rédiger, Dossiers, Portail public, Profil). En haut : la recherche, la **cloche des notifications**, la langue, le thème clair/sombre, la déconnexion.
- **Sur téléphone** : le menu est en bas, avec **Vérifier** au centre (bouton rond) ; le reste est dans le menu ☰ en haut à gauche.
- En bas du menu : **En ligne** ou **Hors ligne**, et le nombre de modifications en attente d'envoi.

---

## Partie C — Le parcours complet, d'une rumeur à sa publication

**Le scénario** : ce matin, une photo circule sur WhatsApp avec le message « URGENT : Antananarivo inondée ce matin, partagez ! ». Nous allons la suivre du signalement jusqu'au rapport publié.

### Étape 1 — Le public signale le contenu (fenêtre privée, sans compte)

**Pourquoi** : n'importe qui peut alerter les journalistes, sans créer de compte.

1. Ouvrez le site : la page d'accueil est le **portail public** (« Ne partagez que ce qui est vrai. »).
2. Cliquez **Signaler un contenu** (ou l'onglet **Signaler**).
3. **Image** : choisissez `1-photo-originale.jpg`.
   Son empreinte est calculée sur l'appareil avant l'envoi.
4. **Texte** : `URGENT : Antananarivo inondée ce matin, partagez !`
5. **Où l'avez-vous vu ?** : WhatsApp. **Région** : Analamanga.
6. **Contact** : facultatif (jamais publié). Laissez vide.
7. **Envoyer le signalement**.

✅ **Résultat** : « **Non vérifié à ce stade** — transmis aux journalistes ». Ce n'est pas un verdict : personne n'a encore vérifié.
- Quelques **premiers indices** s'affichent (ex. « Métadonnées présentes »).
- Un **code de suivi** apparaît : **notez-le** (bouton **Copier le code**).

**Testez aussi** :
- Renvoyez exactement le même texte : MASO répond « déjà été signalé », avec **le même code**. Les doublons sont regroupés et le compteur augmente.
- Onglet **Suivre** → collez le code → état **Reçu**.
- Envoyez `7-faux-fichier-image.jpg` : il est refusé (« Format non accepté »). MASO regarde le vrai contenu du fichier, pas seulement son nom.

### Étape 2 — Le journaliste prend en charge le signalement

**Pourquoi** : chaque signalement doit être examiné par un journaliste, qui ouvre un dossier.

1. Connectez-vous en **journaliste**. Vous arrivez sur l'**Accueil** (tableau de bord) :
   - **Mes dossiers en cours**, **Corrections demandées**, **En retard**, **Rapports publiés** : vos compteurs ;
   - **File de travail** : ce qui vous attend ;
   - **Signalements du public** : les signalements reçus ;
   - **Notifications** et **Raccourcis**.
2. La cloche 🔔 affiche un chiffre : « Nouveau signalement du public ».
3. Dans **Signalements du public**, sur le signalement d'inondation : **Prendre en charge : créer le dossier**.
4. Le formulaire est prérempli avec le texte et la région du signalement. Mettez un titre clair : `Photo d'inondation « à Antananarivo ce matin »`. *Affirmation à vérifier* : `Antananarivo est inondée ce matin`. **Créer le dossier**.

✅ **Résultat** : le dossier s'ouvre. La photo du signalement est déjà la preuve **P1**. Côté public, le suivi passe à **Pris en charge**.

### Étape 2 bis — Mettre en analyse : le rapport d'analyse automatique

**Pourquoi** : dès la mise en analyse, MASO passe chaque preuve aux mêmes outils que « Vérifier » et prépare un rapport d'indices, avec leurs sources.

1. À droite du dossier, **Faire avancer le dossier** → **Mettre en analyse** → motif `Image virale à vérifier` → **Confirmer**.
2. L'onglet **Analyse** s'ouvre tout seul. Chaque élément est analysé en direct :
   - **P1 — Image** : empreinte, déjà vue dans MASO, métadonnées, certificat C2PA, recompression, recherche inversée, indice IA ;
   - chaque **lien** du dossier : page, HTTPS, âge du domaine, hébergeur, archives, vérifications déjà publiées ;
   - **l'affirmation** elle-même : signaux de manipulation, affirmations vérifiables, chiffres.
3. Attendez la fin (le compteur « Analyses en cours » disparaît). Le **niveau de vigilance global** s'affiche.
4. Écrivez éventuellement une **note pour le fact-checker**, puis :
   - **Valider et envoyer au fact-checker** : le rapport est enregistré comme une **preuve** du dossier (par exemple **P3**, citable) et le dossier passe **À vérifier** ;
   - **Exporter en PDF** : le même rapport, en document.

✅ **Résultat** : le statut devient **À vérifier**. Les fact-checkers reçoivent la notification « Analyse à vérifier ».

> Si le fact-checker renvoie l'analyse (« À refaire »), le journaliste voit son **motif en rouge** en haut de l'onglet **Analyse**. Il complète, puis valide à nouveau.

### Étape 3 — Analyser l'image (Vérifier → Image)

**Pourquoi** : comprendre d'où vient l'image, si elle a été modifiée, et si elle a déjà circulé.

1. **Vérifier** → dans **Collez ou déposez un contenu**, glissez `1-photo-originale.jpg`.
   On peut aussi cliquer **Image**, ou coller une capture avec `Ctrl+V`.
2. Les étapes s'exécutent en direct. Chacune affiche son **indice**, l'**outil utilisé** et ses **limites** (lien « Limites et outil ») :

| Étape | Ce qu'elle fait | Comment lire le résultat |
|---|---|---|
| **Réception et empreinte** | Calcule l'empreinte SHA-256 et l'empreinte visuelle, vérifie que c'est bien une image | Sert de preuve d'intégrité |
| **Déjà vérifiée ?** | Cherche si cette image, ou une image très proche, est déjà dans MASO | « Déjà vue dans le dossier… » = **à examiner** |
| **Métadonnées** | Lit la date, l'appareil, le logiciel, le GPS cachés dans le fichier | Absentes = **normal** après Facebook/WhatsApp ; un logiciel de génération d'images = **alerte** ; une date dans le futur = suspect |
| **Provenance (Content Credentials)** | Lit le certificat d'origine (C2PA), quand l'appareil ou le logiciel en pose un | Rare ; s'il dit « généré par IA », c'est un signal fort |
| **Analyse de recompression** | Repère les zones recompressées différemment (retouche locale possible) | Bouton pour afficher la carte ; à interpréter avec prudence |
| **Recherche inversée** | Liens vers Google Lens, TinEye, Yandex, Bing | **L'étape la plus utile** : retrouver la première publication de l'image |
| **Indice de génération par IA** | Un modèle estime la probabilité que l'image soit générée par IA | Un pourcentage, **faillible** |

3. Lisez la carte **« Ce que disent les indices »** en haut : le niveau de vigilance, puis chaque indice avec sa source.
4. Faites la **recherche inversée** : ouvrez **Google Lens**, déposez l'image, et notez la date de la plus ancienne publication trouvée.
5. Remplissez la **checklist visuelle** (ombres, panneaux, météo, cohérence des lieux).
6. **Ajouter au dossier** → cochez le dossier « Photo d'inondation » → *Origine* : `Photo virale reçue sur WhatsApp` → **Ajouter au dossier**.

✅ La photo, son empreinte et toute l'analyse sont rangées dans le dossier. Le fichier original est conservé intact.

**Testez aussi** :
- `2-photo-partagee-whatsapp.jpg` : l'étape **Déjà vérifiée ?** la reconnaît (« image très proche ») alors que le fichier est différent.
- `5-image-generee-ia.jpg` : les métadonnées déclarent un outil de génération : **alerte**.
- `4-photo-retouchee.jpg` : regardez la carte de recompression.

### Étape 4 — Analyser un lien (Vérifier → coller un lien)

**Pourquoi** : savoir qui publie, depuis quand le site existe, et si l'information a déjà été vérifiée.

1. **Vérifier** → collez l'adresse d'un article de presse (ex. un article de RFI ou d'un site malgache) → **Analyser**.
2. Les étapes :

| Étape | Ce qu'elle fait |
|---|---|
| **Contenu de la page** | Lit le titre, la description, l'image et la **date de publication** de la page |
| **Connexion sécurisée (HTTPS)** | Le site chiffre-t-il la connexion ? |
| **Âge du domaine** | Date de création du site (un site créé il y a quelques semaines est suspect) |
| **Hébergeur** | Où le site est hébergé |
| **Annuaire des médias et sources** | Le site est-il connu de MASO, et avec quel score ? |
| **Vérifications existantes** | Des médias de vérification (AFP Factuel, Africa Check…) ont-ils déjà traité le sujet ? Avec leur note et leur lien |
| **Archive de la page** | Copie datée de la page (Wayback Machine) : **Archiver maintenant** garde une trace même si la page est supprimée |

3. Bouton **Analyser l'image de cette page** : l'image de l'article est téléchargée et analysée comme à l'étape 3, avec la recherche inversée déjà remplie.
4. **Ajouter au dossier** si le lien est utile comme preuve.

**Le cas Facebook** : collez le lien d'une publication Facebook. Souvent, Facebook bloque la lecture sans connexion. MASO affiche alors **« Contenu non lisible »** et la marche à suivre :
- enregistrer l'image (appui long → *Enregistrer*) puis l'importer ;
- ou copier le texte de la publication et le coller dans **Vérifier** ;
- noter le nom du compte et la date pour l'onglet **Sources** du dossier.

### Étape 5 — Analyser un texte (Vérifier → coller un message)

**Pourquoi** : repérer les techniques de manipulation et les affirmations précises à vérifier.

1. **Vérifier** → collez :
   ```
   URGENT !!! Partagez avant qu'il soit supprimé : l'inflation a atteint 25 % cette année à Madagascar selon le ministre Rakoto.
   ```
   → **Analyser**.
2. Ce que MASO montre :
   - **Signaux de manipulation** : *Urgence* (pousse à réagir vite), *Appel au partage*, *Ton alarmiste* (majuscules, « !!! »), *Chiffres non sourcés*, *Aucune source* ;
   - **Affirmations vérifiables**, avec le chiffre (25 %), les lieux, les dates et les personnes repérés ;
   - **Chiffres comparés aux statistiques** : le chiffre annoncé face à la statistique officielle (ici l'inflation), avec l'**écart en %** et la source ;
   - **Vérifications existantes** dans MASO et chez les médias.
3. Rien ne quitte le téléphone pour cette analyse : elle marche même **hors connexion**.

### Étape 6 — Analyser une vidéo (Vérifier → Vidéo)

1. **Vérifier** → **Vidéo** → `6-video-deux-plans.mp4`.
2. MASO affiche la durée, la résolution et le format, puis extrait les **images clés**, notamment à chaque **changement de plan** (signe d'un montage).
3. Touchez une image clé → **Analyser cette image** : elle passe dans l'analyse d'image, et vous pouvez lancer sa recherche inversée.

Pour une vidéo Facebook ou TikTok : enregistrez-la sur l'appareil, puis importez-la. MASO ne télécharge pas les vidéos des réseaux sociaux.

### Étape 7 — Construire le dossier (journaliste)

Ouvrez **Dossiers** → « Photo d'inondation ». En haut : le titre, l'affirmation, le **statut**, la **priorité**, l'**état de synchronisation** (« À jour » ou « En attente d'envoi »), et les boutons **Exporter en PDF** et **Copier en texte**.

| Onglet | À quoi il sert | À faire maintenant |
|---|---|---|
| **Résumé** | Titre, affirmation, catégorie, région, priorité, échéance, **personne attribuée** | *Attribué à* : le fact-checker → **Enregistrer** (il reçoit une notification) |
| **Preuves** | Toutes les preuves P1, P2…, avec comparaison côte à côte | *Adresse du lien* : une archive montrant la photo en 2024 ; *Origine* : `Archive : même photo publiée en 2024` → **Ajouter le lien** |
| **Sources** | Médias, sites, comptes liés au dossier, avec leur score | Rechercher la page qui a diffusé la rumeur → la lier |
| **Contacts** | Experts suggérés selon le sujet et la région, demandes de confirmation | Ouvrir un expert (ex. météorologue) → l'appeler ou lui écrire → suivre la demande |
| **Chiffres cités** | Chiffres de la rumeur comparés aux statistiques officielles | **Comparer un chiffre** si la rumeur en contient |
| **Checklist** | Les 17 questions | Voir ci-dessous |
| **Rapport** | Le texte qui sera publié | Étape 9 |
| **Historique** | Tous les changements de statut, avec motif, et les commentaires de l'équipe | Écrire un commentaire, mentionner un collègue avec **@** |

#### La checklist, question par question

Pour chaque question, choisissez **Fait**, **Non applicable**, ou laissez **À faire** en écrivant une **explication**. Un point **Fait** doit être lié à **au moins une preuve** (cochez P1, P2…), sinon MASO refuse : « Un point « fait » doit être lié à au moins une preuve ».

| Bloc | Questions |
|---|---|
| **Origine** | Qui a publié en premier ? · Quelle est la première date retrouvée ? · Le compte d'origine est-il identifiable et crédible ? · Le contenu a-t-il été repris ailleurs ? |
| **Contexte** | Le lieu et la date annoncés sont-ils confirmés (géolocalisation, météo, éléments visibles) ? · Existe-t-il une version plus ancienne ? · Le contenu correspond-il à l'événement ? |
| **Contenu** | L'analyse technique a-t-elle été faite ? · La recherche inversée a-t-elle été faite ? · Les chiffres ont-ils été comparés à une source officielle ? |
| **Sources** | Au moins deux sources indépendantes ? · Les sources ont-elles une connaissance directe des faits ? · Les conflits d'intérêts ont-ils été examinés ? · Les déclarations ont-elles été recoupées ? |
| **Contradictoire** | La personne ou l'institution concernée a-t-elle été contactée ? · Sa réponse est-elle conservée ? · Les éléments contraires ont-ils été examinés ? |

Exemple : « La recherche inversée a-t-elle été faite ? » → **Fait** → cocher la preuve de l'archive 2024 → **Enregistrer**. L'onglet affiche ensuite la progression (ex. **Checklist 5/17**).

#### Faire avancer le dossier

Panneau **Faire avancer le dossier** → **Mettre en analyse** → *Motif* : `Enquête lancée` → **Confirmer : En analyse**.

### Étape 8 — Tester le hors connexion (facultatif mais impressionnant)

**Pourquoi** : sur le terrain, le réseau coupe souvent.

1. Coupez le réseau : mode avion sur téléphone, ou sur ordinateur **F12 → Réseau → Hors ligne**.
2. Créez un dossier, ajoutez un commentaire, analysez une image et ajoutez-la au dossier, exportez en PDF.
   Tout fonctionne. Le badge indique **En attente d'envoi**.
3. Rétablissez le réseau : en quelques secondes, tout part au serveur, dans l'ordre et sans doublon. Le badge passe à **À jour**.

### Étape 9 — Le fact-checker vérifie, puis envoie au rédacteur en chef ou renvoie au journaliste

Déconnectez-vous et connectez-vous en **fact-checker**. La cloche signale « Analyse à vérifier ».

#### 9.0 Vérifier le rapport d'analyse du journaliste

Ouvrez le dossier : l'onglet **Analyse** montre le **rapport validé** (indices, sources, note du journaliste). Vérifiez-le en humain : preuves, sources, checklist.

- **Il manque quelque chose ?** Encadré **À refaire** → écrivez le motif, par exemple `Faites la recherche inversée et ajoutez la source de la première publication.` → **Renvoyer au journaliste**. Le dossier passe **Correction demandée** et le journaliste est prévenu avec ce motif.
- **C'est solide ?** Passez à **9.3 Proposer le verdict** : votre **justification** sert de **note pour le rédacteur en chef**. Rédiger le rapport public (9.1) est facultatif : MASO en propose un automatiquement au rédacteur en chef.

#### 9.1 Rédiger le rapport (onglet Rapport)

| Champ | Ce qu'on y met | Exemple |
|---|---|---|
| **Résumé** | La conclusion en une ou deux phrases | `La photo est ancienne : elle a été publiée en mars 2024.` |
| **Explication** | Le raisonnement complet | `La même photo circulait déjà en mars 2024 lors des inondations…` |
| **Méthode** | Comment on a vérifié | `Recherche inversée, archive Wayback, contact avec la météo nationale.` |
| **Affirmations du rapport** | Une phrase par fait établi, **chacune liée à au moins une preuve** | `La même photo a été publiée en 2024` → cocher **P1** |
| **Preuves montrées au public** | Ce qui peut être publié (pas de source confidentielle ni de données personnelles) | Cocher P1 et P2 |

**Testez la règle** : ajoutez une affirmation sans cocher de preuve. Le cadre devient rouge, « Affirmation non étayée ». La publication sera bloquée tant qu'elle reste ainsi.

**Enregistrer le brouillon**. Chaque enregistrement garde la version précédente : le rédacteur en chef pourra comparer.

#### 9.2 Se faire aider pour rédiger (Rédiger)

Menu **Rédiger** → *Dossier* : « Photo d'inondation » :
- **Format** : Brève radio (avec durée d'antenne estimée), Post réseau, Article court, Démenti ;
- **Insérer le modèle sans IA** : un texte prêt à compléter, rempli avec les éléments du dossier ;
- **Glossaire FR / MG** : les termes du fact-checking en français et en malgache ;
- **Assistant éditorial** (si un modèle d'IA est configuré) : **Rédiger**, **Angles**, **Titres**, **Questions**, **Contexte**.

L'assistant **n'utilise que le contenu du dossier** :
- chaque phrase cite sa preuve, par exemple **[P1]** ;
- toute phrase qui invente un chiffre, un nom ou un verdict est **retirée automatiquement** (« 1 phrase écartée par le contrôle ») ;
- chaque texte porte la mention « **Brouillon assisté par IA — à relire** ».

**Insérer dans le brouillon**, relire, corriger.

#### 9.3 Proposer le verdict

À droite (en bas sur téléphone), **Proposer un verdict** :
1. *Verdict* : **Hors contexte**. Sa définition s'affiche dessous.
2. *Niveau de confiance* : **Élevé**.
3. *Justification* : `La même photo a été publiée en 2024 [P1].`
4. **Conditions de soumission** : chaque ligne doit être verte.
   - une affirmation est écrite ;
   - une source est liée ;
   - au moins une preuve est citée : cochez **[P1]** ;
   - la checklist est complète ou justifiée.
5. **Soumettre au rédacteur en chef**.

✅ Le dossier passe **À relire**. Les rédacteurs en chef reçoivent une notification.

Un journaliste ne voit pas ce formulaire : proposer un verdict est le rôle du fact-checker.

### Étape 10 — Le rédacteur en chef relit et décide (revue éditoriale)

Connectez-vous en **rédacteur en chef**. L'**Accueil** affiche **À relire : 1** et la cloche « Rapport à relire ». Cliquez la notification.

L'écran **Revue éditoriale** montre :
- le verdict proposé, la confiance, qui l'a proposé, et la **note du fact-checker** ;
- s'il n'y a pas encore de rapport : le **rapport proposé automatiquement** (résumé, explication avec les indices marquants, méthode). **Utiliser ce rapport** l'enregistre tel quel ; **Le modifier** ouvre l'onglet **Rapport**, prérempli, où l'on peut aussi repartir d'un **Nouveau rapport vide** ;
- le **rapport d'analyse validé par le journaliste**, à déplier ;
- le **rapport**, avec chaque affirmation et ses preuves. Une affirmation **non étayée** est encadrée en rouge ;
- les **preuves** (celles marquées « Publique » seront visibles) ;
- les points de **checklist** encore ouverts et leur explication ;
- la **comparaison de versions** : ce qui a été ajouté (en vert) et retiré (en rouge) entre deux versions du rapport ;
- l'historique des **décisions**.

**La décision**, toujours avec un **commentaire obligatoire** :

| Décision | Effet |
|---|---|
| **Valider et publier** | Le rapport est **signé** et publié sur le portail **en un clic** |
| **Demander une correction** | Retour au fact-checker, qui corrige le rapport |
| **Demander une vérification complémentaire** | Retour en analyse : il manque des éléments |
| **Rejeter** | Dossier classé, sans publication |

**Faites le cycle complet** :
1. Choisissez **Demander une correction** → commentaire `Préciser la date` → **Demander la correction**.
2. En **fact-checker** : notification « Correction demandée » → **Rapport** → écrivez « mars 2024 » au lieu de « 2024 » → **Enregistrer le brouillon** → **Soumettre au rédacteur en chef**.
3. En **rédacteur en chef** : **Comparaison de versions** → le mot **mars** apparaît en vert.
4. **Valider et publier** → commentaire `Preuves solides` → **Valider, signer et publier**.

✅ « Rapport signé et publié ». Sur la page publique, chacun voit **« Publié et signé par … , rédacteur en chef »**. MASO affiche :
- un **numéro public** (ex. `MASO-2026-0001`) ;
- le **lien** de la page publique et un **QR code** ;
- les boutons de partage **WhatsApp / Facebook**.

Règles vérifiées par le serveur :
- un journaliste ou un fact-checker ne peut pas publier ;
- personne ne publie un verdict qu'il a proposé lui-même ;
- un rapport publié ne peut plus être modifié.

Seul moyen de le changer : **Ajouter une correction publique**, datée, et le rapport est **signé à nouveau**.

### Étape 11 — Le public lit, partage et vérifie (fenêtre privée)

1. **Portail public** : le rapport apparaît dans **Derniers rapports**. Testez la **recherche** (`inondation`) et les filtres (verdict, thème, région).
2. Ouvrez le rapport. On y lit :
   - le verdict **écrit** et l'affirmation vérifiée ;
   - le résumé et l'explication ;
   - **« Ce que nous avons vérifié »** : chaque phrase avec ses preuves **[P1]** cliquables ;
   - les **preuves**, avec leur empreinte, la **méthode**, la date, la rédaction et le nom du validateur ;
   - les **corrections** éventuelles.

   Aucune donnée interne n'y figure : ni la justification du fact-checker, ni les noms de l'équipe, ni les sources protégées.
3. **Partager** : l'aperçu tel qu'il apparaîtra sur Facebook/WhatsApp, les boutons **WhatsApp**, **Facebook**, **Copier le lien**, et **Télécharger en PDF**.
4. **Authenticité** : scannez le **QR code** avec un téléphone, ou cliquez **Vérifier maintenant**. ✅ **Rapport authentique** : le contenu n'a pas été modifié depuis sa signature.
   Un document modifié afficherait **Signature invalide**.
5. **Suivre** : collez le code de suivi de l'étape 1 → l'état est **Vérifié**, avec un lien vers le rapport.
6. **« Déjà vérifié »** : **Signaler** → envoyez `2-photo-partagee-whatsapp.jpg` (la photo recompressée). ✅ **Déjà vérifié**, avec la carte du rapport, marquée « Image très proche ».
   C'est l'intérêt de MASO : la prochaine personne qui reçoit cette photo a la réponse tout de suite.

### Étape 12 — Après la publication

- **Bibliothèque des rapports** (Dossiers → **Bibliothèque des rapports**, ou Ressources) : tous les rapports publiés, avec des filtres par mot-clé, verdict, langue, région, thème et dates, l'export **PDF** et le lien à copier.
- **Correction** : si une erreur est découverte, le rédacteur en chef ouvre la revue du dossier publié → **Ajouter une correction publique** → elle apparaît datée sur la page publique.
- **Journal d'audit** (administrateur) : chaque action est enregistrée (qui, quoi, quand, avant/après), sans possibilité d'effacer.

🎉 **Le parcours complet est terminé** : une rumeur signalée par le public est devenue un rapport vérifié, validé, signé, publié et reconnu automatiquement la fois suivante.

---

## Partie D — Le reste de la plateforme

### D.1 Veille (journaliste, fact-checker, rédacteur en chef)

**C'est quoi** : le fil des rumeurs à surveiller. Il regroupe les **signalements du public** et les articles des **flux RSS** des médias (un flux RSS est la liste automatique des derniers articles d'un site).

- Compteurs **Toutes / Élevé / Moyen / Faible**. Le niveau monte avec les mots-clés « urgents » et quand un même contenu est signalé plusieurs fois.
- Filtres : **Tout**, **Signalement**, **Médias (RSS)** ; par région.
- **Carte des alertes** par région de Madagascar, **Tendances** (mots qui reviennent).
- **Prendre en charge** sur une alerte : crée le dossier.
- **Actualiser** : recharge le fil. Avec l'**économie de données** activée, la veille ne se recharge plus seule.

**À tester** : signalez une rumeur depuis le portail avec la région *Atsinanana* → elle apparaît dans la veille et sur la carte.

### D.2 Ressources

| Rubrique | C'est quoi | À tester |
|---|---|---|
| **Personnes-ressources** | L'annuaire des experts. Recherche par nom, domaine, région, langue ; boutons **Appeler**, **WhatsApp**, **E-mail** ; favoris ; notes privées | Chercher « météo », ouvrir une fiche, ajouter aux favoris |
| **Annuaire des médias et sources** | Les médias et sites, avec un **score de fiabilité sur 10** calculé à partir de **8 critères** (identité, transparence, ancienneté, historique des corrections…), chacun justifié par écrit | Ouvrir une source et lire la justification de chaque critère |
| **Statistiques officielles** | Des indicateurs sourcés et datés (Banque mondiale…), avec graphiques et alerte « donnée ancienne » ; **Comparer à une affirmation** calcule l'écart | Comparer « inflation 25 % » à la donnée officielle |
| **Bibliothèque des rapports** | Les vérifications déjà publiées | Rechercher un rapport |

Les coordonnées des personnes sont protégées selon leur **consentement** (public, équipe, privé). Un invité ne voit que les personnes publiques, sans leurs coordonnées.

Le rédacteur en chef **valide** les nouvelles personnes proposées. Il peut **importer** une liste (`8-annuaire-import.csv`) depuis **Gérer l'annuaire**.

### D.3 Rédiger

Voir l'[étape 9.2](#92-se-faire-aider-pour-rédiger-rédiger). Le brouillon est enregistré automatiquement sur l'appareil, et le compteur indique le nombre de mots et, pour la radio, la durée d'antenne.

### D.4 Notifications (la cloche 🔔)

Vous êtes prévenu quand :
- un dossier vous est attribué ;
- un rapport est à relire ;
- une correction ou une vérification complémentaire est demandée ;
- un dossier est rejeté ou publié ;
- un collègue vous **mentionne** (@) dans un commentaire ;
- un nouveau **signalement du public** arrive.

Cliquer une notification ouvre le bon écran. **Tout marquer comme lu** vide le compteur.

### D.5 Profil

| Réglage | C'est quoi |
|---|---|
| **Langue** | FR, MG ou EN, pour toute l'interface |
| **Apparence** | Clair, Sombre ou Système |
| **Économie de données** | Moins de chargements automatiques, pour les connexions lentes ou chères |
| **Packs hors ligne** | Télécharge l'annuaire, les médias et les statistiques pour les consulter sans réseau |
| **Notifications sur l'appareil** | Alerte du téléphone même quand MASO est en arrière-plan |
| **Code PIN** | Code de 4 à 6 chiffres demandé à l'ouverture, et après 5 minutes en arrière-plan |
| **Badge de presse MASO** | Votre QR code d'identité, émis par l'administrateur |

**À tester, le code PIN** :
1. Activez-le, saisissez `2468` deux fois, puis **Enregistrer**.
2. Fermez et rouvrez le site : « **MASO est verrouillé** ».
3. Un mauvais code est refusé, avec le nombre d'essais restants ; `2468` ouvre l'application.

### D.6 Administration (administrateur)

| Écran | C'est quoi | À tester |
|---|---|---|
| **Utilisation** | Nombre de comptes actifs, suspendus, et par rôle | — |
| **Inviter un membre** | Créer un compte : **Invitation e-mail** (la personne choisit son mot de passe) ou **Mot de passe provisoire** (compte créé tout de suite) | Créer un journaliste avec un mot de passe provisoire, puis se connecter avec |
| **Membres** | Changer le rôle, **Suspendre** un compte (il ne voit plus rien) | Filtrer par rôle et par statut |
| **Émettre un badge / Révoquer le badge** | Badge de presse valable un an | Voir ci-dessous |
| **Paramètres et journal** → **Veille** | Flux RSS à surveiller, mots-clés des niveaux « élevé » et « moyen » | Ajouter le mot-clé `coupure` en niveau élevé |
| → **Modèles** | Les textes des modèles sans IA de Rédiger | Modifier le modèle Démenti |
| → **Glossaire** | Les termes FR / MG | Ajouter un terme |
| → **Journal** | Qui a fait quoi et quand, avec l'avant/après ; export CSV ; impossible à effacer | Cliquer une ligne pour voir le détail |
| → **Mentions** | Mentions légales et consentements | — |

**À tester, le badge de presse** :
1. **Administration** → ligne du journaliste → **Émettre un badge** → « Badge émis pour un an ».
2. Le journaliste ouvre **Profil** : son **badge avec QR code** et son code `MB-…` apparaissent.
3. Dans la fenêtre privée, **Portail → Vérifier un rapport** → saisissez le code `MB-…` (ou scannez le QR) → ✅ **Badge valide**, avec le nom, le rôle et la date de validité.
4. L'administrateur **Révoque le badge** → la page publique affiche **Badge révoqué**.
5. Un code inventé affiche **Badge inconnu**, avec un avertissement.

### D.7 Sur le téléphone

1. Ouvrez le site dans **Chrome** (Android) → menu **⋮** → **Installer l'application**.
   Sur iPhone, dans **Safari** : **Partager** → **Sur l'écran d'accueil**.
2. MASO s'ouvre comme une application, en plein écran.
3. **Android** : dans Facebook, WhatsApp ou la galerie → **Partager** → **MASO** → l'analyse s'ouvre directement, que ce soit une image, une vidéo, un lien ou un texte.
4. **iPhone** : copiez le lien ou enregistrez l'image, puis **Vérifier** → collez.

### D.8 Les langues

Toute l'interface existe en **français**, **malgache** et **anglais** : sélecteur en haut, ou dans **Profil**. Un rapport peut aussi être rédigé dans l'une des trois langues (champ *Langue* de l'onglet Rapport).

---

## Partie E — Quand quelque chose ne marche pas

| Ce que vous voyez | Ce que ça veut dire | Que faire |
|---|---|---|
| L'écran de connexion propose des « Comptes de démonstration » sur le site en ligne | Le site tourne sans base de données (mode démonstration) | Prévenir l'administrateur technique ([DEPLOIEMENT.md](DEPLOIEMENT.md)) |
| « Adresse e-mail ou mot de passe incorrect » | Le compte n'existe pas, ou le mot de passe est faux | Demander à l'administrateur de créer ou réinitialiser le compte ; **Mot de passe oublié ?** |
| « Service d'analyse indisponible » | Le serveur d'analyse dort (offre gratuite) ou n'est pas joignable | Attendre une minute et réessayer ; les analyses locales (empreinte, métadonnées, texte) continuent |
| « En attente de réseau » sur une étape | Pas de connexion | L'étape reprendra seule au retour du réseau |
| Badge **Erreur de synchronisation** sur un dossier | Le serveur a refusé une modification (ex. dossier validé entre-temps) | Lire le message, puis **Réessayer** ou **Abandonner les modifications en attente** |
| Bouton **Soumettre au rédacteur en chef** grisé | Une condition de soumission manque | Lire les lignes rouges sous le formulaire |
| Bouton **Valider, signer et publier** grisé | Affirmation non étayée, résumé vide, ou verdict proposé par vous-même | Lire les **Conditions de publication** en rouge |
| Une analyse affiche « non configuré » | La clé du service correspondant manque | Normal en démonstration ; voir [DEPLOIEMENT.md](DEPLOIEMENT.md) |
| Vous ne voyez pas un menu | Votre rôle n'y a pas accès | Voir le tableau des rôles ([A.5](#a5-les-rôles--qui-fait-quoi)) |

**Pour les curieux** : la touche **F12** → **Console** affiche des messages `[MASO]` qui décrivent l'état de l'application (version, base de données, service d'analyse) et la cause exacte d'une erreur.
