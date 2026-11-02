# MASO — Liste des modules et répartition

> Équipe de 4 personnes (Tolotra — admin, Lorraine, Lucia, Joba) · 8 modules · 2 modules par membre.
> Les modules se font **dans l'ordre**, **un seul à la fois**, chacun sur la branche de son responsable.
> Tolotra (admin) fusionne chaque module terminé dans `dev` ; `main` ne reçoit que des versions fonctionnelles.
> Le workflow Git détaillé est dans [GUIDE_GIT.md](GUIDE_GIT.md).

## Vue d'ensemble

| Ordre | Module | Responsable | Branche | Priorité | Écrans / besoins | Dépend de |
|---|---|---|---|---|---|---|
| 1 | **MOD-01** Socle front, design system et navigation | Tolotra — Front | `tolotra` | P0 | Shell M/W, i18n, PWA · besoins 4, 5 | — |
| 2 | **MOD-02** Backend Supabase, authentification, rôles et audit | Lorraine — Backend | `lorraine` | P0 | M1, W1, W12 (comptes) · besoins 5 | MOD-01 |
| 3 | **MOD-03** Vérifier : hub, analyse image et analyse de lien | Lucia — Vérification | `lucia` | P0 | M3, M4, M5, M7 · besoins 1, 2 | MOD-02 |
| 4 | **MOD-04** Ressources : annuaire, statistiques et données de démo | Joba — Produit | `joba` | P1 | M8, M9, M10, W8, W9, W10 · besoins 7, 8 | MOD-02 |
| 5 | **MOD-05** Dossiers, checklist, verdict et hors connexion | Tolotra — Front | `tolotra` | P0 | M12, M13, W4, W5 · besoins 1, 6 | MOD-03 |
| 6 | **MOD-06** Revue éditoriale, publication et portail public | Lorraine — Backend | `lorraine` | P0/P1 | W6, W0, W7, W2 · besoins 1, 3 | MOD-05 |
| 7 | **MOD-07** IA « zéro invention » : texte, assistant éditorial, veille | Lucia — Vérification | `lucia` | P1/P2 | M6, M11, W11, M2, W3 · besoins 3, 4, 9 | MOD-05 |
| 8 | **MOD-08** Profil, badge QR, paramètres, audit, tests et livraison | Joba — Produit | `joba` | P0/P2 | M14, W12 (badges), W13 · README, démo | MOD-06, MOD-07 |

La répartition suit les profils du cahier des charges (section 16) : Dev 1 Front PWA, Dev 2 Backend, Dev 3 Vérification et veille, Profil 4 Produit et contenu.

Parallélisme possible : une fois MOD-02 fusionné dans `dev`, **MOD-03 et MOD-04 peuvent avancer en même temps**. De même, une fois MOD-05 fusionné, **MOD-06 et MOD-07 peuvent avancer en même temps**. Pour tout le reste, attendre que le module précédent soit dans `dev`.

```
MOD-01 ─► MOD-02 ─┬─► MOD-03 ─► MOD-05 ─┬─► MOD-06 ─┐
                  └─► MOD-04 ───────────┘   MOD-07 ─┴─► MOD-08
```

---

## MOD-01 — Socle front, design system et navigation

**Responsable** : Tolotra (Front) · **Branche** : `tolotra` · **Priorité** : P0

Objectif : une base de code unique React + TypeScript qui s'affiche **pareil sur mobile et sur web**, selon la charte de la maquette ([DESIGN.md](DESIGN.md)).

Livrables :
- Projet Vite + React + TypeScript + Tailwind, scripts `dev`, `build`, `test`, `typecheck`.
- Design system : couleurs, typographies (Montserrat / Inter), mode clair et sombre, composants UI de base (`Button`, `Card`, `Badge`, `Input`, `SegmentedControl`, `ProgressBar`, `ListRow`, `PageHeader`, `VerdictBadge`, `CaseStatusBadge`).
- Coque responsive :
  - **Mobile** : en-tête bleu marine (menu, titre en capitales, recherche, paramètres), barre de navigation en bas avec bouton central rond.
  - **Web** (≥ 1024 px) : barre latérale bleu marine + barre supérieure, même contenu en cartes.
- Navigation entre les 5 espaces de la maquette : **Veille, Vérifier, Ressources, Rédiger, Dossiers**, plus **Profil**.
- Pages d'accueil de chaque espace, au rendu fidèle à la maquette, avec des données de démonstration clairement isolées dans `src/data/demo/` (remplacées par les modules suivants).
- i18n FR / MG / EN (react-i18next) avec sélecteur de langue mémorisé.
- PWA installable (manifeste MASO, icônes, service worker de base), indicateur en ligne / hors ligne.
- Types du domaine partagés (`src/types/domain.ts`) : rôles, statuts de dossier, verdicts, niveaux de confiance, statuts de checklist — contrat commun pour tous les modules.
- Tests : parité des clés de traduction entre les 3 langues, libellés des verdicts.

Critères d'acceptation :
- `npm install && npm run dev` lance l'application ; `npm run build` et `npm test` passent.
- Même rendu sur téléphone (360 px) et sur ordinateur, sans défilement horizontal.
- Toutes les chaînes visibles passent par i18n, dans les 3 langues.
- Le verdict et le statut sont toujours écrits en texte (jamais seulement une couleur).

---

## MOD-02 — Backend Supabase, authentification, rôles et audit

**Responsable** : Lorraine (Backend) · **Branche** : `lorraine` · **Priorité** : P0

Livrables :
- Dossier `supabase/` : migrations SQL de toutes les entités de la section 14 (utilisateurs/profils, rédactions, alertes, dossiers, preuves, analyses, sources, personnes-ressources, demandes de confirmation, indicateurs, checklist, rapports, décisions, suggestions IA, commentaires, glossaire, journal d'audit).
- Politiques **RLS** par rôle (matrice de la section 3), journal d'audit en **ajout seul** (triggers), bucket de stockage **privé** pour les preuves.
- Règles serveur : personne ne valide son propre travail ; changement de statut horodaté et motivé (fonction SQL / RPC `change_case_status`).
- Client Supabase front (`src/lib/supabase.ts`), contexte d'authentification, garde de routes par rôle.
- Écrans **M1 / W1** : connexion e-mail + mot de passe et lien magique, mot de passe oublié, onboarding 3 écrans, choix de la langue, mode invité.
- Écran **W12** (P0 comptes) : liste des utilisateurs, invitation, changement de rôle, suspension.
- Jeu de comptes de démo (un par rôle) via script de seed, **sans données réelles**.
- Tests sur les règles de droits (au moins : un journaliste ne peut pas publier ; personne ne valide son propre rapport).

Critères d'acceptation : connexion fonctionnelle par rôle ; la navigation s'adapte au rôle ; session conservée hors ligne après la première connexion ; aucune clé dans le code (`.env.example` à jour).

---

## MOD-03 — Vérifier : hub, analyse image et analyse de lien

**Responsable** : Lucia (Vérification) · **Branche** : `lucia` · **Priorité** : P0 (vidéo P1)

Livrables :
- **M3** Hub Vérifier : entrées image, vidéo, lien, texte ; prise de vue / import ; **Web Share Target** (recevoir depuis Facebook / WhatsApp / galerie) ; rattacher à un dossier ou en créer un.
- **M4** Analyse image en étapes affichées en direct : SHA-256 (Web Crypto), métadonnées (exifr) avec explication de l'absence, ELA (Canvas) avec carte, liens de recherche inversée (Google Lens, TinEye, Yandex, Bing, InVID-WeVerify), checklist visuelle, *Ajouter au dossier*. Étapes locales fonctionnelles hors ligne.
- Service Python **FastAPI** dans `services/analyse/` : pHash « déjà vu ? », C2PA, RDAP, Wayback, Google Fact Check, ffprobe + images clés vidéo (P1), indice IA (avec nom, version, confiance, avertissement).
- **M5** Analyse de lien : âge du domaine, HTTPS, hébergeur, présence dans l'annuaire des médias, vérifications existantes, archive Wayback enregistrée comme preuve.
- **M7** Fiche source : score de fiabilité par critère, chaque critère justifié par un humain.
- Chaque résultat est un indice qualifié (*aucun indice / indice faible / indice à examiner*) avec ses limites en langage simple.

Critères d'acceptation : analyse image standard < 15 s ; aucune étape « vrai / faux » automatique ; fonctionnement dégradé propre si le service Python est indisponible.

---

## MOD-04 — Ressources : annuaire, statistiques et données de démo

**Responsable** : Joba (Produit) · **Branche** : `joba` · **Priorité** : P1

Livrables :
- **M8 / M9** Annuaire des personnes-ressources : recherche, filtres (domaine, région, langue, organisation), favoris, fiche avec boutons Appeler / WhatsApp / E-mail selon la visibilité consentie, notes privées, demande de confirmation.
- **W9** Gestion de l'annuaire : création, modification, import CSV, consentement, visibilité, validation périodique, actif / inactif.
- **W8** Annuaire des médias et sources : création, import CSV, critères du score.
- **M10 / W10** Statistiques : indicateurs par thème avec valeur, année, source, lien, date de mise à jour, graphique (Recharts) ; mode *Comparer à une affirmation* ; alerte « donnée ancienne » ; import Banque mondiale ou CSV.
- **Données de démonstration** (fictives ou publiques, jamais de données personnelles réelles) : annuaire, indicateurs officiels sourcés et datés, 3 cas de démo (cas principal « inondation hors contexte », chiffre truqué, vidéo d'un autre pays).
- Relecture et complétion des traductions **malgaches** de l'interface.

Critères d'acceptation : aucun chiffre sans source ni date ; un expert trouvé en quelques secondes ; annuaire consultable hors ligne (pack).

---

## MOD-05 — Dossiers, checklist, verdict et hors connexion

**Responsable** : Tolotra (Front) · **Branche** : `tolotra` · **Priorité** : P0

Livrables :
- **M12** Mes dossiers : liste filtrable (statut, priorité, échéance, recherche), indicateur de synchronisation par dossier.
- **M13** Dossier : onglets résumé · preuves · sources · contacts · chiffres cités · checklist · rapport · historique.
- Checklist guidée (section 11.2) avec états, explication, preuve liée, auteur, date.
- Verdict proposé (échelle 11.1) + confiance + justification liée aux preuves ; soumission bloquée sans affirmation, sans source ou checklist incomplète non justifiée.
- **W4** File de vérification en colonnes par statut, **W5** poste d'analyse grand écran.
- **Hors connexion** : Dexie (IndexedDB), file de synchronisation avec reprise, état visible (à jour / en attente).
- **Export PDF** côté client (jsPDF ou pdf-lib), copie en texte.

Critères d'acceptation : créer, éditer et exporter un dossier sans réseau ; synchronisation automatique au retour du réseau.

---

## MOD-06 — Revue éditoriale, publication et portail public

**Responsable** : Lorraine (Backend) · **Branche** : `lorraine` · **Priorité** : P0 (portail) / P1

Livrables :
- **W6** Revue éditoriale : rapport avec affirmations liées aux preuves, affirmations non étayées en évidence, comparaison de versions ; décisions *Valider et publier*, *Demander une correction*, *Demander une vérification complémentaire*, *Rejeter* (commentaire obligatoire).
- **Signature numérique** du rapport validé (fonction serveur) ; publication en un clic.
- **W0** Portail public : derniers rapports, recherche, page rapport avec aperçu de partage Facebook / WhatsApp, signalement sans compte avec code de suivi, « Déjà vérifié » par empreinte ou lien, vérification d'un rapport par QR ; anti-abus (débit, taille, déduplication).
- **W7** Bibliothèque des rapports ; **W2** tableau de bord par rôle ; notifications.

Critères d'acceptation : seul le rédacteur en chef publie (vérifié côté serveur) ; jamais de verdict automatique sur le portail.

---

## MOD-07 — IA « zéro invention » : texte, assistant éditorial, veille

**Responsable** : Lucia (Vérification) · **Branche** : `lucia` · **Priorité** : P1 / P2

Livrables :
- Interface **`LLMProvider`** avec deux implémentations (API gratuite Gemini/Groq + Ollama local).
- Contrôle « zéro invention » côté serveur (section 10) : extraits numérotés [P1] [S2] [C3] [R4] [K5], citation obligatoire, vérification des nombres / dates / noms, abstention, aucun verdict, journalisation ; **tests automatisés** de ce contrôle.
- **M6** Analyse de texte : affirmations, entités, chiffres, signaux de manipulation (locaux), rapprochement avec les statistiques.
- **M11 / W11** Assistant éditorial : formats (brève radio ~45 s, post, article, démenti), langues, mention « Brouillon assisté par IA — à relire », modèles sans IA, glossaire FR/MG.
- **M2 / W3** Veille (P2) : flux RSS, signalements, regroupement par mots-clés, niveaux, carte par région (Leaflet), *Prendre en charge*.

Critères d'acceptation : une phrase sans preuve est écartée automatiquement ; l'assistant se masque proprement sans modèle.

---

## MOD-08 — Profil, badge QR, paramètres, audit, tests et livraison

**Responsable** : Joba (Produit) · **Branche** : `joba` · **Priorité** : P0 / P2

Livrables :
- **M14** Profil et paramètres : langue, mode économie de données, packs hors ligne, notifications, code PIN, déconnexion.
- Badge QR du journaliste (génération, révocation dans **W12**, vérification publique dans W0).
- **W13** Paramètres et journal d'audit : glossaire, modèles, niveaux d'alerte, sources de veille, consultation du journal (qui, quoi, quand, avant/après).
- Recette complète du parcours de démo (section 17) sur téléphone et en hors connexion.
- Livraison : README final (fonctionnalités réalisées, limites, outils d'IA utilisés), captures dans `screenshots/`, vidéo de secours, déploiement (Vercel + Supabase + Render).

Critères d'acceptation : checklist finale du Standard de livraison 42 Antananarivo cochée entièrement.

---

## Avancement

| Module | Responsable | État | Intégré dans `dev` | Intégré dans `main` |
|---|---|---|---|---|
| MOD-01 | Tolotra | Terminé (branche `tolotra`) | Non | Non |
| MOD-02 | Lorraine | Terminé | Non | Non |
| MOD-03 | Lucia | À faire | Non | Non |
| MOD-04 | Joba | À faire | Non | Non |
| MOD-05 | Tolotra | À faire | Non | Non |
| MOD-06 | Lorraine | À faire | Non | Non |
| MOD-07 | Lucia | À faire | Non | Non |
| MOD-08 | Joba | À faire | Non | Non |
