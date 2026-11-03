# Tester les MOD-07 et MOD-08 pas à pas

Durée : 40 minutes. Ces deux modules complètent MASO.

**MOD-07 — IA « zéro invention », texte, veille**
- analyser un message qui circule ;
- surveiller les rumeurs (veille) ;
- rédiger avec des modèles, et avec un assistant IA qui n'invente rien.

**MOD-08 — Profil, badges, paramètres**
- profil et code PIN ;
- badge de presse vérifiable par le public ;
- paramètres et journal d'audit.

Ce que vous allez constater :
- aucune IA ne donne de verdict ;
- sans modèle d'IA, l'application fonctionne quand même : l'assistant se masque et les modèles sans IA restent utilisables.

---

## Étape 0 — Préparer (une fois)

1. **Base** : Supabase → **SQL Editor** → coller `supabase/migrations/202611031000_parametres_badges.sql` → **Run** → `Success`.
   C'est le n° 11 de [CONFIGURATION_SUPABASE.md](CONFIGURATION_SUPABASE.md).
2. **Service d'analyse** : relancer l'installation, qui ajoute `defusedxml` pour lire les flux RSS en sécurité :
   ```bash
   npm run service:install
   npm run service:dev
   ```
   Contrôle : http://localhost:8000/health affiche `"veille": true`.
3. **Application** : `npm run dev` → http://localhost:5173
4. Deux fenêtres :
   - une fenêtre normale pour l'équipe ;
   - une **fenêtre de navigation privée** pour le public (sans compte).

Comptes : **Joba** (journaliste), **Lucia** (fact-checker), **Lorraine** (rédactrice en chef), **Admin**. Pour changer de compte : **Se déconnecter**, puis confirmer. La fenêtre de confirmation rappelle que le code PIN et la session enregistrés sur l'appareil seront effacés.

### L'assistant IA (facultatif)
Il lui faut un modèle d'IA joignable par le service d'analyse. Sans modèle, il est simplement masqué : c'est un comportement voulu, testé en partie 3.

Pour le voir fonctionner, choisir **une** des deux options dans le fichier `.env` à la racine, puis relancer `npm run service:dev` :

| Option | Réglage dans `.env` |
|---|---|
| **Groq** (gratuit, en ligne) | créer une clé sur https://console.groq.com → `LLM_PROVIDER=groq` et `LLM_API_KEY=<votre clé>` |
| **Ollama** (local, sans Internet) | installer Ollama, puis `ollama pull llama3.1` → `LLM_PROVIDER=ollama` |

Contrôle : http://localhost:8000/health affiche `"assistant": true`.

---

## Partie 1 — Le public : nouvelle page d'accueil (fenêtre privée)

1. Ouvrir http://localhost:5173 sans être connecté : le **portail public** s'affiche, avec le titre « Ne partagez que ce qui est vrai. », « Comment ça marche » et les derniers rapports.
2. **Signaler** :
   - *Texte* : `URGENT : coupure d'eau totale à Toamasina pendant 10 jours, partagez vite !`
   - *Région* : **Atsinanana**
   - **Envoyer le signalement** → « Non vérifié à ce stade » et un code de suivi.

## Partie 2 — Analyse de texte (Joba)

1. **Vérifier → Texte**. Coller :
   ```
   URGENT !!! Partagez avant qu'il soit supprimé : l'inflation a atteint 25 % cette année à Madagascar, selon le ministre Rakoto à Antananarivo, depuis le 12 octobre 2026.
   ```
   puis **Analyser**.
2. ✅ **Signaux de manipulation** : *Urgence*, *Appel au partage*, *Ton alarmiste* (majuscules et « !!! »), *Chiffres non sourcés*.
3. ✅ **Affirmations vérifiables** :
   - le chiffre (25 %) ;
   - la date (12 octobre 2026) ;
   - les lieux (Madagascar, Antananarivo) ;
   - la personne (Rakoto).
4. ✅ **Chiffres comparés aux statistiques** : « Annoncé : 25 · officiel : … (année) · écart … % ». C'est l'indicateur *Inflation* des données de démonstration.
5. ✅ La phrase « Ce sont des pistes de vérification, pas un verdict » est toujours affichée.
6. Couper le réseau (**F12 → Réseau → Hors ligne**) puis relancer **Analyser** : l'analyse fonctionne aussi, car elle tourne sur l'appareil.

## Partie 3 — Rédiger : modèles sans IA, glossaire, assistant (Joba)

1. **Rédiger** → *Dossier* : *Photo d'inondation « à Antananarivo ce matin »*.
2. Format **Démenti** → **Insérer le modèle sans IA**. ✅ Un texte prêt à compléter apparaît, où {claim}, {title} et {verdict} sont remplacés par les éléments du dossier.
3. Essayer **Brève radio** : le compteur affiche « ≈ … s à l'antenne ».
4. **Glossaire FR / MG** : chercher `rumeur` → ✅ la traduction malgache s'affiche.
5. **Assistant éditorial** :
   - **sans modèle** : ✅ le cadre de l'assistant n'apparaît pas, et tout le reste de la page fonctionne ;
   - **avec un modèle** (voir l'étape 0), sur un dossier qui a des preuves (par exemple celui préparé dans le guide MOD-06) :
     1. cliquer **Rédiger**, **Titres** ou **Questions** ;
     2. ✅ chaque phrase cite ses extraits (**[P1]**, **[S1]**…) ;
     3. ✅ la mention « **Brouillon assisté par IA — à relire** » est présente ;
     4. ✅ si le modèle invente un chiffre, un nom ou un verdict, la phrase est retirée : « 1 phrase écartée par le contrôle (chiffre absent des extraits) » ;
     5. **Insérer dans le brouillon**.
   - Un dossier vide affiche : « l'assistant n'a rien sur quoi s'appuyer ».

## Partie 4 — Veille (Joba)

1. **Veille** :
   - ✅ le signalement de Toamasina apparaît, avec son niveau ;
   - les compteurs **Toutes / Élevé / Moyen / Faible** sont affichés ;
   - la carte place l'alerte sur la région **Atsinanana**.
2. Filtre **Médias (RSS)** : les articles des flux configurés s'affichent. Il faut Internet et le service d'analyse ; sinon le message « Flux RSS indisponibles » apparaît, sans erreur.
3. **Tendances** : les mots-clés récurrents apparaissent.
4. Sur la carte du signalement, cliquer **Prendre en charge** → le dossier est créé (formulaire prérempli → **Créer le dossier**).
5. Dans la fenêtre privée, **Suivre** → coller le code → ✅ **Pris en charge**.

## Partie 5 — Profil (Joba)

1. **Profil** :
   - langue FR / MG / EN ;
   - apparence Clair / Sombre / Système ;
   - **Économie de données** : une fois activée, la veille ne se recharge plus seule ; on clique **Actualiser** ;
   - **Packs hors ligne** → **Télécharger les packs** : l'annuaire et les statistiques sont lisibles sans réseau.
2. **Notifications sur l'appareil** : activer → le navigateur demande l'autorisation.
3. **Code PIN** :
   1. activer l'interrupteur ;
   2. saisir `2468` dans les deux champs → **Enregistrer** → « Code PIN enregistré sur cet appareil » ;
   3. fermer l'onglet, puis rouvrir http://localhost:5173 → ✅ « **MASO est verrouillé** » ;
   4. saisir `1111` → ✅ « Code incorrect. Encore … essais. » ;
   5. saisir `2468` → ✅ l'application s'ouvre.

   Le code est demandé à l'ouverture et après 5 minutes en arrière-plan.

## Partie 6 — Badge de presse (Admin, Joba, public)

1. **Admin → Administration** → ligne *Démo Journaliste* → **Émettre un badge** → ✅ « Badge émis pour un an ».
2. **Joba → Profil** (recharger la page) → ✅ « Badge de presse MASO » avec un QR code et un code `MB-…`.
3. Fenêtre privée : scanner le QR avec un téléphone, ou **Vérifier un rapport** → saisir le code `MB-…` → ✅ **Badge valide**, avec le nom, le rôle, la rédaction et la date de validité.
4. Admin → **Révoquer le badge** → recharger la page publique → ✅ **Badge révoqué**.
5. Saisir `MB-FAUX-0000` → ✅ **Badge inconnu** et un avertissement.

Contrôle côté serveur : un journaliste ne peut pas s'émettre de badge, car seul l'administrateur appelle `admin_issue_badge`.

## Partie 7 — Paramètres et journal d'audit (Admin)

**Administration → Paramètres et journal** :

1. **Veille** :
   - ajouter un flux RSS (une adresse par ligne, 10 au maximum) ;
   - ajouter le mot-clé `coupure` en « niveau élevé » ;
   - **Enregistrer** → « Paramètres enregistrés ».

   Un nouveau signalement contenant « coupure » arrive alors en niveau **Élevé** dans la veille. Un même contenu signalé 3 fois monte aussi d'un niveau.
2. **Modèles** : modifier le texte du *Démenti* → **Enregistrer** → il est utilisé dans Rédiger. **Revenir aux modèles d'origine** les rétablit.
3. **Glossaire** : **Ajouter un terme** (Français / Malagasy) → il apparaît dans Rédiger.
4. **Journal** :
   - ✅ chaque action est listée : qui, quoi (création, modification, suppression), sur quel élément, quand ;
   - cliquer une ligne pour voir **avant / après** ;
   - filtres par élément, action et dates ;
   - **Exporter (CSV)**.

   On y retrouve l'émission du badge et le changement des paramètres. Le journal est en ajout seul : personne ne peut le modifier.
5. **Mentions** : le texte des mentions légales et des consentements.

---

## Mode démonstration (sans Supabase)

Les parties 1 à 5 fonctionnent aussi en mode démonstration. Deux différences :
- le **journal d'audit** est tenu par le serveur, et n'existe donc pas en mode démonstration (un message le signale) ;
- les badges sont enregistrés sur l'appareil : la vérification publique ne marche que dans le même navigateur.

## Ce qui reste pour la livraison

- **Déploiement** (Vercel + Supabase + Render), **captures** dans `screenshots/` et **vidéo de secours** : voir MOD-08 dans [MODULES.md](MODULES.md).
- Les traductions malgaches doivent être relues par un locuteur natif.
