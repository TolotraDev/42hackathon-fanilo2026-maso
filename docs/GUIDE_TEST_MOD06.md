# Tester le MOD-06 (Revue, publication, portail public) pas à pas

Durée : 30 minutes. C'est la fin du parcours :

**le fact-checker rédige le rapport → la rédactrice en chef le relit, demande une correction, puis le valide et le publie (signé) → le public le lit, le partage, vérifie son authenticité et signale de nouveaux contenus.**

Ce que vous allez constater :
- le portail ne donne **jamais** de verdict automatique ;
- seul le rédacteur en chef publie, et le serveur le vérifie.

---

## Étape 0 — Préparer (une fois)

1. Supabase → **SQL Editor** → coller `supabase/migrations/202611021800_publication.sql` → **Run** → `Success`.
   Ce script crée aussi l'espace de stockage privé `signalements` (visible dans **Storage**) et la clé de signature, générée dans la base (elle n'est dans aucun fichier).
2. `npm run dev` → http://localhost:5173
3. Deux fenêtres :
   - une fenêtre normale pour l'équipe ;
   - une **fenêtre de navigation privée** pour le public (sans compte).

Comptes : **Joba** (journaliste), **Lucia** (fact-checker), **Lorraine** (rédactrice en chef). Pour changer de compte : **Profil → Se déconnecter**.

Fichiers d'exemple (dans `docs/exemples/`) :
- `1-photo-originale.jpg` : la photo « virale » ;
- `2-photo-partagee-whatsapp.jpg` : la même photo, recompressée par WhatsApp.

---

## Partie 1 — Le journaliste prépare le dossier (Joba)

Après connexion, Joba arrive sur l'**Accueil** : c'est le tableau de bord du journaliste, avec *Mes dossiers en cours*, la *File de travail*, les *Signalements du public* et les *Raccourcis*.

Refaire la **partie 1 du guide MOD-05** sur *Photo d'inondation « à Antananarivo ce matin »* :
1. Attribuer le dossier à Lucia.
2. Ajouter le lien d'archive comme preuve **P1**.
3. Lier la source *Info Flash Mada*.
4. Traiter la checklist jusqu'à **17/17**.
5. Cliquer **Mettre en analyse**.

Puis **Vérifier → Image** → `1-photo-originale.jpg` → cocher le dossier → *Origine* : `Photo virale reçue sur WhatsApp` → **Ajouter au dossier**. La photo devient la preuve **P2**.

## Partie 2 — Le fact-checker rédige le rapport (Lucia)

1. La cloche en haut affiche un chiffre : **Notifications** → « Démo Journaliste vous a attribué un dossier ».
2. Ouvrir le dossier → onglet **Rapport** :
   - *Résumé* : `La photo est ancienne : elle a été publiée en 2024.`
   - *Explication* : `La même photo circulait déjà en mars 2024.`
   - *Méthode* : `Recherche inversée, archive Wayback.`
   - **Ajouter une affirmation** : `La même photo a été publiée en 2024` → cocher **P1**.
   - **Ajouter une affirmation** : `Aucune inondation n'a été signalée ce matin`, sans rien cocher.
     ✅ Le cadre devient rouge : « Affirmation non étayée ».
   - *Preuves montrées au public* : cocher P1 et P2 → **Enregistrer le brouillon**.
3. À droite, **Proposer un verdict** :
   - *Hors contexte*, confiance *Élevé* ;
   - justification avec **[P1]** coché ;
   - **Soumettre au rédacteur en chef**.

## Partie 3 — Revue éditoriale : correction demandée (Lorraine)

1. **Accueil** : l'indicateur **À relire** vaut 1. La cloche affiche « Rapport à relire » : cliquer dessus.
2. La page **Revue éditoriale** s'ouvre (W6) :
   - la 2ᵉ affirmation est en rouge, marquée **Affirmation non étayée** ;
   - à droite, dans *Conditions de publication*, une ligne est rouge et **Valider, signer et publier** est désactivé.
3. Choisir **Demander une correction**. Le bouton reste désactivé tant que le commentaire est vide.
4. Écrire `La deuxième affirmation doit être étayée.` → **Demander la correction**.
   ✅ « Correction demandée : le fact-checker est notifié. »

## Partie 4 — Le fact-checker corrige (Lucia)

1. **Notifications** : « Correction demandée par Démo Rédaction en chef ».
2. Onglet **Rapport** :
   - affirmation 2 : cocher **P1** ;
   - dans le *Résumé*, écrire `en mars 2024` au lieu de `en 2024` ;
   - **Enregistrer le brouillon**.
3. **Soumettre au rédacteur en chef**.

## Partie 5 — Validation, signature, publication en un clic (Lorraine)

1. Notification « Rapport à relire » → **Comparaison de versions** : le mot **mars** apparaît surligné en vert (ajouté).
2. *Valider et publier* (choisi par défaut) → commentaire `Preuves solides.` → **Valider, signer et publier**.
   - ✅ « Rapport signé et publié. » et **Publié : MASO-2026-0001**.
   - ✅ À droite : le lien public, le QR code, les boutons WhatsApp et Facebook, et le début de la signature.
3. Contrôle côté serveur :
   - essayer la même chose avec Joba : il n'a pas de formulaire de décision ;
   - dans Supabase, **Table Editor → reports**, la ligne a `status = published`, une `signature` et un `public_id`.

## Partie 6 — Le public (fenêtre de navigation privée, sans compte)

1. Ouvrir http://localhost:5173/portail : le rapport est listé. Essayer la recherche `inondation`, puis le filtre *Verdict : Faux* (aucun résultat).
2. Ouvrir le rapport. On y voit :
   - le verdict **écrit** ;
   - l'affirmation vérifiée ;
   - « Ce que nous avons vérifié », chaque phrase avec **[P1]** ;
   - les preuves P1 et P2 (empreinte SHA-256) ;
   - la méthode, la date, la rédaction ;
   - l'aperçu de partage, **Télécharger en PDF** et le QR code.

   Rien d'interne n'apparaît : ni la justification du fact-checker, ni son nom.
3. **Vérifier maintenant** (ou scanner le QR avec un téléphone sur le même réseau) : ✅ **Rapport authentique**.
4. Test de falsification, facultatif :
   - SQL Editor : `update reports set signed_payload = jsonb_set(signed_payload, '{verdict}', '"confirmed"') where public_id = 'MASO-2026-0001';`
   - Recharger la page : ✅ **Signature invalide**.
   - Remettre : même requête avec `'"out_of_context"'`.

## Partie 7 — Signaler sans compte

1. **Signaler** → choisir `2-photo-partagee-whatsapp.jpg`, *Où l'avez-vous vu ?* : WhatsApp → **Envoyer le signalement**.
   - ✅ **Déjà vérifié** et la carte du rapport, marquée « Image très proche » : la photo recompressée est reconnue.
   - Un **code de suivi** est affiché.
2. **Faire un autre signalement** → *Texte* : `Le riz serait en rupture dans tous les marchés de la capitale` → **Envoyer**.
   - ✅ « **Non vérifié à ce stade** » : transmis aux journalistes, sans verdict.
   - Noter le code.
3. Renvoyer exactement le même texte : ✅ « déjà été signalé… », avec le **même code**.
4. **Suivre** → coller le code → état **Reçu**.

## Partie 8 — Prise en charge et bibliothèque (Joba)

1. **Accueil → Signalements du public** : la rumeur du riz indique **2 signalements**.
2. **Prendre en charge : créer le dossier** → le formulaire est prérempli → **Créer le dossier**.
3. Dans la fenêtre privée, recharger le suivi : ✅ **Pris en charge**.
4. Faire de même avec le signalement de la photo : la photo envoyée par le public devient la preuve **P1** du nouveau dossier.
5. Onglet **Historique** :
   - écrire un commentaire ;
   - cliquer **@Démo Fact-checker** ;
   - **Commenter**.

   Lucia reçoit la notification « … vous a mentionné ».
6. **Dossiers → Bibliothèque des rapports** : filtres (mot-clé, verdict, langue, région, thème, dates), **PDF**, **Copier le lien**.

---

## Mode démonstration (sans Supabase)

Même parcours, sans serveur : tout reste dans le navigateur, et le portail lit les rapports publiés sur cet appareil.

La signature y est une empreinte SHA-256 (elle détecte une modification, mais sans clé secrète). Les signalements y restent également sur l'appareil.

## Ce qui reste pour plus tard

- **Veille** (fil d'alertes, carte, flux RSS) et **assistant éditorial** : MOD-07.
- **Badge QR du journaliste** (vérification dans le portail) : MOD-08.
- Vignette Facebook/WhatsApp personnalisée : nécessite un rendu côté serveur (voir les limites du README).
