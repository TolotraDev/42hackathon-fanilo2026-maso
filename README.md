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
- [x] MOD-02 — Backend Supabase, authentification, rôles et audit
  - Base PostgreSQL complète (17 entités du cahier des charges), droits par rôle appliqués côté serveur (RLS)
  - Workflow des dossiers contrôlé par la base : changement de statut motivé et historisé, **personne ne valide son propre travail**, seul le rédacteur en chef publie
  - Journal d'audit en ajout seul, sources confidentielles accessibles uniquement par fonction journalisée, stockage privé des preuves
  - Connexion par mot de passe ou lien magique, mot de passe oublié, présentation en 3 écrans, mode invité, session conservée hors ligne
  - Navigation adaptée au rôle ; écran Administration : invitation, changement de rôle, suspension, statistiques d'usage
  - **Mode démonstration** sans backend : 4 comptes fictifs (un par rôle) quand Supabase n'est pas configuré
- [ ] MOD-03 — Vérifier : hub, analyse image et analyse de lien
- [ ] MOD-04 — Ressources : annuaire, statistiques et données de démo
- [ ] MOD-05 — Dossiers, checklist, verdict et hors connexion
- [ ] MOD-06 — Revue éditoriale, publication et portail public
- [ ] MOD-07 — IA « zéro invention » : texte, assistant éditorial, veille
- [ ] MOD-08 — Profil, badge QR, paramètres, audit, tests et livraison

## Stack technique

React · TypeScript · Vite · Tailwind CSS · vite-plugin-pwa · react-i18next (FR / MG / EN) · React Router · lucide-react
Supabase : PostgreSQL, Auth, RLS, Storage, Edge Functions (Deno) · tests pgTAP
Prévu par les modules suivants : Dexie (IndexedDB) · FastAPI (Python) · Recharts · Leaflet · jsPDF.

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

### Mode démonstration (sans backend)

Si `VITE_SUPABASE_URL` est vide dans `.env`, l'application fonctionne seule avec des comptes fictifs stockés sur l'appareil. Mot de passe commun : `Maso2026!demo`.

| Compte | Rôle |
|---|---|
| `journaliste@maso.demo` | Journaliste |
| `factchecker@maso.demo` | Fact-checker |
| `redaction@maso.demo` | Rédacteur en chef |
| `admin@maso.demo` | Administrateur |

### Avec Supabase

Guide pas à pas (projet en ligne ou local) : [docs/CONFIGURATION_SUPABASE.md](docs/CONFIGURATION_SUPABASE.md).

En local :

Prérequis supplémentaire : Docker.

```bash
npm run db:start          # démarre Supabase en local, applique supabase/migrations et supabase/seed.sql
                          # → copier « API URL » et « anon key » affichés dans .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
npm run test:db           # tests des règles de droits (pgTAP)
npm run db:reset          # réinitialise la base (migrations + comptes de démonstration)
npx supabase functions serve invite-user   # invitation des membres (écran Administration)
```

Les e-mails (lien magique, mot de passe oublié, invitation) arrivent dans la boîte de test Supabase : http://localhost:54324.
Les mêmes comptes de démonstration existent en base (mot de passe `Maso2026!demo`).

## Démo

Liens, captures (`screenshots/`) et vidéo : à compléter en MOD-08.

## Limites connues & pistes

- Les écrans métier (veille, dossiers, ressources) affichent encore des **données de démonstration fictives** (`src/data/demo/`), remplacées module par module.
- Les détails des sources confidentielles sont isolés et accessibles uniquement par fonction journalisée, mais **pas encore chiffrés** en base (prévu avec Supabase Vault).
- Le parcours de connexion avec un vrai serveur Supabase (lien magique, invitation par e-mail) n'a pas encore été testé de bout en bout ; les règles de droits SQL et le mode démonstration, eux, sont testés.
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
- [Configurer Supabase](docs/CONFIGURATION_SUPABASE.md)
- [Conventions](docs/CONVENTIONS.md)
- [Charte graphique](docs/DESIGN.md)

Licence des sources tierces : polices Montserrat et Inter (SIL Open Font License), icônes Lucide (ISC).
