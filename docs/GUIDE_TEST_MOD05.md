# Tester le MOD-05 (Dossiers) pas à pas

Durée : 25 minutes. C'est le module qui relie tout : l'image analysée (MOD-03), l'expert contacté et le chiffre comparé (MOD-04) se retrouvent dans un **dossier**. On y suit la checklist du cahier des charges, puis :

**le journaliste prépare → le fact-checker propose un verdict → le rédacteur en chef valide.**

Le tout fonctionne **sans réseau** : les modifications restent sur l'appareil et partent seules au retour de la connexion.

---

## Étape 0 — Préparer (une fois)

1. Supabase → **SQL Editor** → coller `supabase/migrations/202611021700_dossiers.sql` → **Run** → `Success`.
   Ce script ajoute aussi la checklist aux dossiers déjà existants (les 3 cas de démonstration).
2. `npm run dev` → http://localhost:5173

Comptes : **Joba** (journaliste), **Lucia** (fact-checker), **Lorraine** (rédactrice en chef). Pour passer d'un compte à l'autre : **Profil → Se déconnecter**.

---

## Partie 1 — Le journaliste prépare le dossier (Joba)

**Dossiers** :
- les 3 cas de démonstration s'affichent, chacun avec **À jour** (état de synchronisation) ;
- le bouton **Colonnes** montre la file de vérification, une colonne par statut ; **Liste** revient à la liste.

Ouvrir **Photo d'inondation « à Antananarivo ce matin »**. L'onglet **Checklist** indique **0/17** : ce sont les 17 questions du cahier des charges.

1. **Résumé** → *Attribué à* : **Lucia — Fact-checker** → **Enregistrer** → « Enregistré ». C'est ainsi qu'on soumet le dossier au fact-checker.
2. **Preuves** → *Adresse du lien* : `https://web.archive.org/web/2024/https://exemple.org/inondation-2024`, *Origine* : `Archive : même photo publiée en 2024` → **Ajouter le lien** → la preuve **[P1]** apparaît.
   On peut aussi analyser une image dans **Vérifier** puis cliquer **Ajouter au dossier** : elle arrive ici, avec son analyse.
3. **Sources** → rechercher `Info` → cliquer **Info Flash Mada (fictif)** → la source est liée.
4. **Checklist** :
   - *La recherche inversée a-t-elle été faite ?* → **Fait** → **Enregistrer** → refusé : « Un point « fait » doit être lié à au moins une preuve » ;
   - cocher **P1** → **Enregistrer** → la checklist passe à **1/17** ;
   - pour les autres points : choisir **Non applicable**, ou laisser **À faire** et écrire une **explication** (ex. « Auteur injoignable »), puis **Enregistrer**. Viser **17/17**.
5. Panneau **Faire avancer le dossier** → **Mettre en analyse** → motif `Enquête lancée` → **Confirmer : En analyse**.

Il n'y a pas de formulaire de verdict pour le journaliste : c'est le rôle du fact-checker.

## Partie 2 — Le fact-checker propose un verdict (Lucia)

Ouvrir le même dossier. À droite (en bas sur mobile), le formulaire **Proposer un verdict** :
1. *Verdict* : **Hors contexte** (sa définition s'affiche dessous) — *Niveau de confiance* : **Élevé**.
2. *Justification* : `La même photo a été publiée en 2024 [P1]. Aucune inondation signalée ce matin.`
3. Regarder **Conditions de soumission** : la ligne « Au moins une preuve est citée dans la justification » est rouge, et le bouton est désactivé.
4. Cocher **[P1]** → toutes les conditions passent au vert → **Soumettre au rédacteur en chef**.
5. ✅ Le dossier passe à **À relire** et le verdict s'affiche : *Hors contexte*, *Niveau de confiance : Élevé*, *Preuves citées : P1*.

Le serveur revérifie ces conditions : impossible de les contourner.

## Partie 3 — Hors ligne (Joba)

1. Ouvrir **Dossiers**, puis couper le réseau : **F12 → Réseau → Hors ligne** (ou mode avion sur téléphone).
2. **Nouveau dossier** → « Hors ligne : le dossier sera créé sur l'appareil… » → titre `Rumeur de pénurie de riz`, affirmation au choix → **Créer le dossier**.
   ✅ Badge **En attente d'envoi** ; en bas de la barre latérale (ou en haut sur mobile) : « En ligne · 1 en attente », qui devient « Hors ligne · … ».
3. **Historique** → écrire un commentaire → **Commenter** : il apparaît tout de suite.
4. **Vérifier → Image** → choisir `docs/exemples/1-photo-originale.jpg` → **Ajouter au dossier** → choisir *Rumeur de pénurie de riz* → « … Hors ligne : elle sera envoyée au retour du réseau ».
5. Revenir au dossier → **Exporter en PDF** : le PDF se télécharge, sans réseau. **Copier en texte**, puis coller dans un message : tout le dossier y est.
6. Rétablir le réseau (**Pas de limitation**) → en quelques secondes, le badge passe à **À jour**.
   Dans Supabase, **Table Editor → cases** contient le nouveau dossier ; **evidences** contient la photo et **Storage → evidences** son fichier.

## Partie 4 — Le rédacteur en chef valide (Lorraine)

Ouvrir *Photo d'inondation…* → **Valider** → motif `Preuves suffisantes` → **Confirmer : Validé**.
- Le dossier devient **non modifiable** (« Dossier validé ou classé »).
- Si Lorraine avait proposé le verdict elle-même, le bouton *Valider* n'existerait pas : personne ne valide son propre travail.
- La publication (signature, portail public) arrive avec MOD-06.

## Partie 5 (facultative) — Un conflit, sans perte silencieuse

1. Joba, **hors ligne**, modifie le titre d'un dossier.
2. Pendant ce temps, Lorraine **valide** ce dossier.
3. Joba revient en ligne : le dossier affiche **Erreur de synchronisation** et le message « Le serveur a refusé une modification… Ce dossier est validé ». Deux choix : **Réessayer** ou **Abandonner les modifications en attente**, qui rétablit la version du serveur.

---

## Ce qui reste pour plus tard

- **Revue éditoriale, signature du rapport et publication sur le portail public** : MOD-06. L'onglet **Rapport** permet déjà d'écrire le brouillon.
- **Mentions @ dans les commentaires et notifications** : MOD-06.
- **Conflits** : la règle est « le dernier enregistrement l'emporte ». Un refus du serveur, lui, n'est jamais perdu en silence.
