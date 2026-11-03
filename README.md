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
- [x] MOD-03 — Vérifier : hub, analyse image et analyse de lien
  - **Analyse d'image** en étapes affichées en direct : empreinte SHA-256 et perceptuelle, « déjà vue ? » dans la base (retrouve une photo recadrée ou recompressée), métadonnées (appareil, date, GPS sur carte), provenance C2PA, analyse de recompression (ELA) avec carte, recherche inversée (5 moteurs), indice IA, checklist visuelle
  - Chaque résultat est un **indice qualifié** (aucun indice / faible / à examiner) avec ses limites et l'outil utilisé — jamais un verdict
  - **Vidéo** : informations techniques et images clés (changements de plan), chacune analysable comme une image
  - **Lien** : HTTPS, âge du domaine (RDAP), hébergeur, annuaire des médias, vérifications existantes, archive Wayback (consultation et archivage)
  - **Fiche source** : 8 critères notés et justifiés par un humain, score calculé par le serveur, mention « vérifiée » réservée au rédacteur en chef, détails confidentiels à consultation journalisée
  - **Ajouter au dossier** : original stocké intact avec son empreinte et l'analyse complète
  - **Partage depuis le téléphone** : MASO apparaît dans le menu « Partager » (Facebook, WhatsApp, galerie)
  - Hors ligne : empreintes, métadonnées et recompression continuent ; les étapes serveur affichent « en attente de réseau »
- [x] MOD-04 — Ressources : annuaire, statistiques et données de démo
  - **Annuaire des personnes-ressources** : recherche par nom, domaine, région, langue, organisation ; boutons Appeler / WhatsApp / E-mail ; favoris et notes privées ; demandes de confirmation suivies par dossier
  - Coordonnées protégées selon la visibilité consentie (publique, équipe, privée), propositions validées par le rédacteur en chef, revalidation tous les 6 mois, **droit de retrait** (coordonnées effacées, y compris du journal d'audit), import CSV
  - **Statistiques officielles** sourcées et datées avec graphiques, alerte « donnée ancienne », **Comparer à une affirmation** (écart en %) avec ajout au dossier, import Banque mondiale, saisie manuelle et CSV
  - **Annuaire des médias et sources** (scores de fiabilité, import CSV)
  - Données de démonstration : personnes et sources fictives, statistiques réelles (Banque mondiale), 3 cas de démonstration ; consultables hors ligne
- [x] MOD-05 — Dossiers, checklist, verdict et hors connexion
  - **Mes dossiers** (liste filtrable) et **file de vérification en colonnes** par statut ; état de synchronisation visible par dossier
  - **Dossier** en 8 onglets : résumé, preuves (comparaison côte à côte), sources, contacts (experts suggérés), chiffres cités, **checklist guidée** (17 questions du cahier des charges), rapport (brouillon), historique et commentaires
  - **Verdict** proposé par le fact-checker : bloqué (côté interface **et** serveur) sans affirmation, sans source, sans preuve citée ou avec une checklist non justifiée ; validation par un autre rédacteur en chef
  - **Hors connexion** : base locale (IndexedDB), créer, modifier, ajouter une preuve (avec son fichier) et exporter **sans réseau** ; synchronisation automatique au retour du réseau, dans l'ordre, sans doublon ; refus du serveur signalés, jamais perdus
  - **Export PDF** et **copie en texte**, sur l'appareil
- [x] MOD-06 — Revue éditoriale, publication et portail public
  - **Rapport** : affirmations liées aux preuves (une affirmation sans preuve bloque la publication), preuves publiables choisies, versions conservées à chaque modification
  - **Revue éditoriale** (rédacteur en chef) : affirmations non étayées en évidence, comparaison de versions mot à mot, décisions *Valider et publier*, *Demander une correction*, *Demander une vérification complémentaire*, *Rejeter*, commentaire obligatoire ; seul le rédacteur en chef publie, et jamais un verdict qu'il a proposé (vérifié par le serveur)
  - **Signature numérique** du rapport par le serveur (HMAC-SHA-256, clé générée dans la base), numéro public `MASO-AAAA-NNNN`, corrections publiques datées et signées à nouveau
  - **Portail public sans compte** : derniers rapports, recherche (mot-clé, verdict, thème, région), page rapport (affirmation, verdict, explication, preuves, méthode, corrections), partage WhatsApp / Facebook avec aperçu, PDF, **QR de vérification** (contenu modifié détecté)
  - **Signaler sans compte** : image, lien ou texte ; « **Déjà vérifié** » si le fichier, une image très proche ou le lien est connu, sinon indices simples et « Non vérifié à ce stade » (jamais de verdict automatique) ; **code de suivi** ; anti-abus (10 envois par heure et par adresse, 5 Mo, formats image, doublons regroupés, champ piège)
  - **Tableau de bord par rôle**, **bibliothèque des rapports** (filtres, PDF, lien), **notifications** (attribution, relecture, correction, publication, mention @, signalement du public), prise en charge d'un signalement en un clic
- [ ] MOD-07 — IA « zéro invention » : texte, assistant éditorial, veille
- [ ] MOD-08 — Profil, badge QR, paramètres, audit, tests et livraison

## Stack technique

React · TypeScript · Vite · Tailwind CSS · vite-plugin-pwa · react-i18next (FR / MG / EN) · React Router · lucide-react
Supabase : PostgreSQL, Auth, RLS, Storage, Edge Functions (Deno) · tests pgTAP
Analyses : exifr, Web Crypto, Canvas (navigateur) · Recharts · API Banque mondiale · service Python FastAPI : c2pa-python, PyAV (FFmpeg), RDAP, Wayback Machine, Google Fact Check
Hors connexion : Dexie (IndexedDB), service worker Workbox · Export : jsPDF.

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

### Service d'analyse (provenance, vidéo, lien)

```bash
npm run service:install   # une fois (Python 3.11+, FFmpeg inutile)
npm run service:dev       # http://localhost:8000 — puis VITE_ANALYSE_API_URL=http://localhost:8000 dans .env
npm run service:test
```

Détails et déploiement : [services/analyse/README.md](services/analyse/README.md). Sans ce service, les analyses locales fonctionnent et les autres étapes sont signalées « indisponibles ».

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
Les mêmes comptes de démonstration existent en base (mot de passe `Maso2026!demo`), ainsi que les données de démonstration (`supabase/demo/donnees_demo.sql`).

## Démo

Liens, captures (`screenshots/`) et vidéo : à compléter en MOD-08.

## Limites connues & pistes

- L'écran **Veille** affiche encore des **données de démonstration fictives** (`src/data/demo/alerts.ts`) : il sera branché sur les signalements et les flux avec MOD-07.
- Les détails des sources confidentielles sont isolés et accessibles uniquement par fonction journalisée, mais **pas encore chiffrés** en base (prévu avec Supabase Vault).
- Le lien magique et l'invitation par e-mail dépendent d'un serveur d'envoi d'e-mails (SMTP) configuré dans Supabase.
- **Indice IA** et **Google Fact Check** nécessitent des clés (`HF_TOKEN`, `GOOGLE_FACTCHECK_API_KEY`) : sans elles, ces étapes sont signalées « non configurées ».
- L'archivage Wayback Machine est soumis aux limites d'archive.org (refus temporaires signalés comme tels).
- L'empreinte perceptuelle est calculée dans le navigateur (et non avec `imagehash` côté serveur comme prévu au cahier des charges) pour fonctionner hors ligne.
- Synchronisation : en cas de modifications concurrentes, la dernière enregistrée l'emporte ; un refus du serveur est signalé et conservé.
- L'entrée « Texte » du hub arrive avec MOD-07.
- Signature des rapports : HMAC calculé par la base (clé secrète en base). Elle prouve que le contenu n'a pas été modifié depuis la publication, mais se vérifie en ligne via le portail (pas de clé publique hors ligne).
- Aperçu de partage : la page affiche l'aperçu et les boutons, mais Facebook et WhatsApp lisent les balises d'une page générée côté serveur ; sans rendu serveur, leur vignette reste générique.
- Anti-abus du signalement public : limite par adresse IP, taille, formats, doublons et champ piège ; pas de CAPTCHA externe (aucun service tiers ajouté).
- Notifications : actualisées toutes les minutes et à chaque modification (pas de notification push quand l'application est fermée).
- Les traductions malgaches doivent être relues par un locuteur natif.
- Données de démonstration : personnes et sources fictives (numéros `+261 00…` inexistants, e-mails `@example.org`) ; statistiques réelles de la Banque mondiale (WDI).
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
- [Tester le MOD-03 pas à pas](docs/GUIDE_TEST_MOD03.md) (fichiers d'exemple dans `docs/exemples/`)
- [Tester le MOD-04 pas à pas](docs/GUIDE_TEST_MOD04.md)
- [Tester le MOD-05 pas à pas](docs/GUIDE_TEST_MOD05.md)
- [Tester le MOD-06 pas à pas](docs/GUIDE_TEST_MOD06.md)
- [Conventions](docs/CONVENTIONS.md)
- [Charte graphique](docs/DESIGN.md)

Licence des sources tierces : polices Montserrat et Inter (SIL Open Font License), icônes Lucide (ISC).
