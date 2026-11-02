# MASO — Module d'Authentification et de Source Originale

> Aider les journalistes de Madagascar à vérifier un contenu suspect, documenter la vérification et publier un rapport fiable — sur mobile, sur le web, même sans connexion.

Hackathon FANILO 2026 · 42 Antananarivo · Dépôt `42hackathon-fanilo2026-maso`

## Problème & solution

**Problème.** Photos anciennes présentées comme récentes, vidéos d'un autre pays, chiffres truqués, contenus générés par IA : à Madagascar, ces contenus circulent sur Facebook, WhatsApp et TikTok, en malgache et en français. Les journalistes ont des outils dispersés et en anglais, peu d'accès aux experts et aux chiffres officiels, une connexion instable et aucune traçabilité de leurs vérifications.

**Solution.** MASO est une PWA mobile installable et une plateforme web, avec la même interface, qui permet de :
recevoir un contenu suspect (partage depuis le téléphone, signalement public, veille) → l'analyser (empreinte, métadonnées, recompression, recherche inversée, lien) → documenter un dossier (preuves, sources, experts, chiffres officiels, checklist) → proposer un verdict humain → faire valider par le rédacteur en chef → publier un rapport public partageable.

Principe : **l'outil fournit des indices, les professionnels décident.** Aucune IA ne rend de verdict et l'assistant de rédaction ne peut rien inventer.

## Fonctionnalités réalisées

Avancement par module : voir [docs/MODULES.md](docs/MODULES.md#avancement).

- [x] MOD-01 — Socle front, design system et navigation (mobile + web)
  - Même interface sur mobile (barre du bas avec bouton central *Vérifier*) et sur web (barre latérale), selon la charte de la maquette
  - 6 espaces : Veille, Vérifier, Ressources, Rédiger, Dossiers, Profil — avec recherche dans l'en-tête
  - Interface en français, malgache et anglais ; mode clair / sombre / système
  - PWA installable, indicateur et bandeau hors connexion, brouillon de l'éditeur conservé sur l'appareil
  - Échelle des 7 verdicts et 8 statuts de dossier, toujours écrits en texte
- [ ] MOD-02 — Backend Supabase, authentification, rôles et audit
- [ ] MOD-03 — Vérifier : hub, analyse image et analyse de lien
- [ ] MOD-04 — Ressources : annuaire, statistiques et données de démo
- [ ] MOD-05 — Dossiers, checklist, verdict et hors connexion
- [ ] MOD-06 — Revue éditoriale, publication et portail public
- [ ] MOD-07 — IA « zéro invention » : texte, assistant éditorial, veille
- [ ] MOD-08 — Profil, badge QR, paramètres, audit, tests et livraison

## Stack technique

React · TypeScript · Vite · Tailwind CSS · vite-plugin-pwa · react-i18next (FR / MG / EN) · React Router · lucide-react
Prévu par les modules suivants : Supabase (PostgreSQL, Auth, RLS, Storage) · Dexie (IndexedDB) · FastAPI (Python) · Recharts · Leaflet · jsPDF.

## Installation & lancement

Prérequis : Node.js ≥ 20 et npm.

```bash
git clone <url-du-depot> 42hackathon-fanilo2026-maso
cd 42hackathon-fanilo2026-maso
cp .env.example .env      # remplir les valeurs si nécessaire
npm install
npm run dev               # http://localhost:5173
```

Autres commandes : `npm run build` (build PWA), `npm run preview` (tester le build), `npm test`, `npm run typecheck`.

Pour tester sur téléphone dans le même réseau : `npm run dev -- --host`, puis ouvrir l'adresse affichée.

## Démo

Liens, captures (`screenshots/`) et vidéo : à compléter en MOD-08.

## Limites connues & pistes

- Les écrans affichent pour l'instant des **données de démonstration fictives** (`src/data/demo/`), remplacées module par module.
- Feuille de route après le hackathon : voir [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md#19-feuille-de-route).

## Équipe & outils IA utilisés

| Membre | Rôle | Modules |
|---|---|---|
| Tolotra (admin) | Front PWA | MOD-01, MOD-05 |
| Lorraine | Backend | MOD-02, MOD-06 |
| Lucia | Vérification et veille | MOD-03, MOD-07 |
| Joba | Produit et contenu | MOD-04, MOD-08 |

Outils d'IA utilisés pour le développement : Claude Code (Anthropic) — génération et relecture de code, documentation.

## Documentation

- [Cahier des charges](docs/CAHIER_DES_CHARGES.md)
- [Modules et répartition](docs/MODULES.md)
- [Guide Git](docs/GUIDE_GIT.md)
- [Conventions](docs/CONVENTIONS.md)
- [Charte graphique](docs/DESIGN.md)

Licence des sources tierces : polices Montserrat et Inter (SIL Open Font License), icônes Lucide (ISC).
