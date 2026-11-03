# Tester le MOD-04 (Ressources) pas à pas

Durée : 20 minutes. Le module répond à deux questions de journaliste :
- **« Qui peut me confirmer ou démentir ça ? »** → l'annuaire des personnes-ressources ;
- **« Ce chiffre qui circule est-il vrai ? »** → les statistiques officielles et le mode *Comparer à une affirmation*.

Les personnes et les sources des données de démonstration sont **fictives**. Leurs numéros (`+261 00 …`) n'existent pas et leurs e-mails (`@example.org`) n'arrivent nulle part : on peut cliquer sans risque.
Les **statistiques sont réelles** (Banque mondiale, Madagascar), avec leur source et leur date.

---

## Étape 0 — Préparer Supabase (une fois)

Dans Supabase → **SQL Editor** → **New query**, coller puis **Run**, dans cet ordre :

1. `supabase/migrations/202611021600_ressources.sql` (la base du module) → `Success. No rows returned`
2. `supabase/demo/donnees_demo.sql` (les données de démonstration) → `Success`

Le second script peut être relancé sans créer de doublons. Il ajoute 10 personnes, 3 sources, 82 valeurs statistiques et les **3 cas de démonstration** du cahier des charges.

Puis `npm run dev` et ouvrir http://localhost:5173.

| Compte à utiliser | Pour tester |
|---|---|
| Joba (journaliste) ou Lucia (fact-checker) | Annuaire, fiches, statistiques |
| Lorraine (rédactrice en chef) | Validation, coordonnées privées, droit de retrait |
| Tolotra (admin) | Gestion de l'annuaire et des sources |
| *Continuer sans compte* | Mode invité |

---

## Test 1 — Trouver un expert en quelques secondes

Connecté en **journaliste** → **Ressources**.

1. La liste affiche **10 contacts**.
2. Taper `cyclone` dans *Rechercher un nom, une organisation, un domaine…* → **2 contacts** : Hery Rakotomalala (climatologue) et Voahangy Andriamanana (porte-parole).
3. Effacer, puis choisir **Région → Boeny** → **1 contact** : Haingo Rabemananjara.

## Test 2 — Contacter en un geste

Ouvrir **Hery Rakotomalala** :
- trois gros boutons : **Appeler**, **WhatsApp**, **E-mail**. Sur téléphone, *Appeler* ouvre le composeur et *WhatsApp* ouvre WhatsApp ;
- *Visibilité : Équipe*, *Dernière validation : il y a 30 jours*.

Ouvrir **Rivo Andrianarisoa** → « Coordonnées non communiquées : la personne a choisi une visibilité privée ». Ses coordonnées sont protégées, même pour un journaliste.

## Test 3 — Favori et note privée

Sur la fiche de Hery :
1. Toucher l'**étoile** → elle devient jaune.
2. *Note privée* : `Joignable le matin avant 9 h.` → **Enregistrer**.
3. Recharger la page (`F5`) : l'étoile et la note sont toujours là.
4. Retour aux ressources → cocher **Mes favoris seulement** → seul Hery reste.

Avec un autre compte, la note et l'étoile n'apparaissent pas : elles sont personnelles.

## Test 4 — Demande de confirmation liée à un dossier

Sur la fiche de Hery, carte **Demandes de confirmation** :
1. *Dossier concerné* : **Photo d'inondation « à Antananarivo ce matin »** — *Canal* : **WhatsApp** → **Nouvelle demande**.
2. Dans la demande créée : *Statut* → **Réponse reçue** ; *Réponse obtenue* : `Aucune inondation à Antananarivo ce matin selon le service météo.` → **Mettre à jour la demande**.
3. Recharger : la demande garde son statut et sa réponse.

## Test 5 — Proposer une personne (journaliste)

Ressources → **Proposer une personne** :
1. *Nom complet* : `Rado Proposé` — *Fonction* : `Hydrologue` — *Domaines* : `inondations, climat`.
2. **Envoyer la proposition** sans cocher l'accord → « L'accord de la personne est obligatoire ».
3. Cocher *La personne a donné son accord…* → **Envoyer la proposition** → « Proposition envoyée : elle apparaîtra dans l'annuaire après validation ».
4. Rado Proposé **n'apparaît pas encore** dans la liste.

## Test 6 — Statistiques officielles

Ressources → **Statistiques officielles** :
- chaque carte affiche la valeur, l'année, un **graphique d'évolution**, la **source cliquable** et sa date de mise à jour. Exemple : *Population totale* **32 740 678 habitants**, *Année 2025*, *Banque mondiale*, *mise à jour le 8 oct. 2026* ;
- *Taux d'alphabétisation des adultes* et *Pauvreté* affichent **Donnée ancienne** (2021) : MASO prévient avant qu'on cite un chiffre périmé ;
- les boutons du haut filtrent par thème : *Santé*, *Élections*…

## Test 7 — Comparer un chiffre qui circule (le cœur du module)

Carte **Comparer à une affirmation** (en haut sur mobile, à droite sur ordinateur) :
1. *Indicateur officiel* : **Population totale**.
2. *Chiffre annoncé* : `40 000 000`.
3. ✅ « Le chiffre annoncé (40 000 000) est **supérieur de 22,2 %** à la donnée officielle : 32 740 678 habitants (Banque mondiale…, 2025) ».
4. Dans **Ajouter au dossier**, choisir *Bilan chiffré du cyclone diffusé sur WhatsApp* → **Ajouter au dossier** → « Preuve ajoutée au dossier ».
   Dans Supabase, **Table Editor → evidences** contient une ligne de type `analysis`, avec le chiffre, la source et l'écart.

Essayer aussi *Accès à l'électricité* avec `80` → « supérieur de 88,2 % ».

## Test 8 — Ajouter un chiffre

Carte **Saisie manuelle** (journaliste) :
1. Thème **Santé**, nom `Cas de paludisme déclarés (exemple)`, valeur `1 234`, année `2025`, source `Exemple de test`, date de mise à jour `01/12/2025`.
2. **Enregistrer l'indicateur** → la carte apparaît avec **Non validée**.
   Sans source ou sans date, l'enregistrement est refusé : aucun chiffre sans source ni date.

Carte **Importer depuis la Banque mondiale** → *Population totale* → **Importer** → « 0 élément ajouté » : les années déjà présentes ne sont jamais dupliquées.

## Test 9 — Le rédacteur en chef valide (Lorraine)

Se déconnecter → se connecter en **rédactrice en chef** → **Ressources** → **Gérer l'annuaire** :
1. *Rado Proposé* est **À valider** → **Valider** → « Fiche validée ».
2. *Nirina Randrianasolo* est **À revalider** : sa fiche date de 240 jours. **Revalider** confirme que ses coordonnées sont toujours exactes.
3. Carte **Importer des personnes (CSV)** → **Choisir un fichier CSV** → `docs/exemples/8-annuaire-import.csv` → aperçu « **1 ligne valide, 1 refusée** », car la seconde personne n'a pas donné son accord → **Importer 1 ligne** → *Rado Import* apparaît.
4. Ouvrir **Rivo Andrianarisoa** : en rédactrice en chef, ses coordonnées privées sont visibles.
5. Ouvrir **Andry Rasolofo** → **Droit de retrait** → confirmer → sa fiche passe à **Retirée** et ses coordonnées sont effacées. Dans **Table Editor → resource_people**, `phone` et `email` sont vides.
6. **Statistiques officielles** → sur *Cas de paludisme déclarés (exemple)*, **Valider** → la mention « Non validée » disparaît.

De retour en journaliste : Andry Rasolofo a disparu, Rado Proposé est visible.

## Test 10 — Annuaire des médias et sources

Ressources → **Annuaire des médias et sources** : 3 sources fictives avec leur score — *Info Flash Mada* **0/10**, *Vaovao Mafana* **2,5/10**, *Radio Fanilo* **8,8/10**.
Ouvrir *Info Flash Mada* : chaque critère est justifié (« Aucune mention légale… »). C'est la même fiche que celle du MOD-03.
Le compte **admin** a aussi accès à cet annuaire, comme le prévoit le cahier des charges.

## Test 11 — Mode invité

Se déconnecter → **Continuer sans compte** :
- Ressources → seulement **2 contacts** (ceux qui ont accepté une visibilité *Publique*), et **aucune coordonnée** sur leur fiche ;
- Statistiques officielles : consultables ;
- Annuaire des sources : fermé.

## Test 12 — Hors connexion

Connecté en journaliste, ouvrir **Ressources** puis **Statistiques officielles** (l'appareil enregistre une copie).
**F12 → Réseau → Hors ligne**, puis rouvrir les deux pages : elles s'affichent avec « **Version enregistrée sur l'appareil le …** ».

---

## Ce qui reste pour plus tard

- **Suggestions d'experts selon la catégorie du dossier** : arrivent avec les dossiers (MOD-05).
- **Bibliothèque des rapports** (marquée « Bientôt ») : MOD-06.
- **Traductions malgaches** : rédigées pour ce module, elles doivent être relues par un locuteur natif de l'équipe.
