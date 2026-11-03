# MASO — Configurer Supabase (pas à pas)

Sans Supabase, MASO tourne en **mode démonstration** : comptes fictifs, données stockées uniquement sur l'appareil.
Ce guide branche l'application sur une **vraie base Supabase en ligne** (offre gratuite), accessible depuis un téléphone pour la démo.

Durée : environ 20 minutes. Il faut seulement un navigateur ; le terminal n'est nécessaire qu'à l'étape 7.

---

## Étape 1 — Créer le projet Supabase

1. Aller sur **https://supabase.com** → **Start your project** → se connecter avec GitHub.
2. **New project** :
   - *Organization* : celle proposée (ou en créer une : `maso`)
   - *Project name* : `maso`
   - *Database password* : cliquer **Generate a password**, puis **le noter** (gestionnaire de mots de passe). Il ne va **jamais** dans le code.
   - *Region* : la plus proche de Madagascar parmi celles proposées (une région Europe convient)
   - *Plan* : **Free**
3. **Create new project** → attendre 1 à 2 minutes que le projet soit prêt.

## Étape 2 — Créer la base de données (copier-coller dans l'éditeur SQL)

Dans le menu de gauche : **SQL Editor** → **New query**.

Pour **chacun des fichiers ci-dessous, dans cet ordre** : ouvrir le fichier dans VS Code, tout copier (`Ctrl+A`, `Ctrl+C`), coller dans l'éditeur SQL, cliquer **Run**. Le message attendu est `Success. No rows returned`.

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `supabase/migrations/202611021400_schema.sql` | Tables |
| 2 | `supabase/migrations/202611021401_functions_triggers.sql` | Audit, création automatique des profils |
| 3 | `supabase/migrations/202611021402_rls.sql` | Droits par rôle |
| 4 | `supabase/migrations/202611021403_workflow.sql` | Workflow des dossiers, administration |
| 5 | `supabase/migrations/202611021404_storage.sql` | Stockage privé des preuves |
| 6 | `supabase/migrations/202611021500_verification.sql` | Images déjà vues, fiches sources (MOD-03) |
| 7 | `supabase/migrations/202611021600_ressources.sql` | Annuaire, favoris et notes, statistiques (MOD-04) |
| 8 | `supabase/demo/donnees_demo.sql` | **Données de démonstration** (facultatif, relançable sans doublons) |
| 9 | `supabase/migrations/202611021700_dossiers.sql` | Checklist guidée, règles de soumission du verdict, création hors ligne (MOD-05) |
| 10 | `supabase/migrations/202611021800_publication.sql` | Revue éditoriale, signature et publication, portail public, signalements, notifications (MOD-06) |
| 11 | `supabase/migrations/202611031000_parametres_badges.sql` | Paramètres (veille, modèles, mentions), badges QR des journalistes (MOD-07, MOD-08) |
| 12 | `supabase/migrations/202611031100_statut_a_verifier.sql` | Nouveau statut « À vérifier ». **À exécuter seul**, dans sa propre requête, avant le n° 13 |
| 13 | `supabase/migrations/202611031101_circuit_verification.sql` | Circuit journaliste → fact-checker → rédacteur en chef (« À refaire » avec motif, notifications) |
| 14 | `supabase/migrations/202611031200_medias_publics.sql` | Photos, vidéos et liens montrés dans le rapport public (obligatoires pour publier) ; seuls les fichiers publiés sont lisibles par tous |

> Projet déjà configuré lors d'un module précédent : n'exécuter **que les nouveaux fichiers** (ex. le n° 6 pour MOD-03).
> Les n° 12 et 13 se lancent **dans deux requêtes séparées** (Run, puis New query) : PostgreSQL n'accepte pas d'utiliser un nouveau statut dans la même requête que celle qui le crée.
> Ne **pas** exécuter `supabase/seed.sql` sur le projet en ligne : il sert uniquement à la base locale.
> En cas d'erreur, ne pas relancer le même fichier : noter le message d'erreur et le transmettre à Lorraine.

Vérification : menu **Table Editor** → les tables `profiles`, `cases`, `audit_logs`, etc. apparaissent.

## Étape 3 — Régler l'authentification

Menu **Authentication** :

1. **Sign In / Providers** (ou **Providers**) :
   - **Email** : activé
   - **Allow new users to sign up** : **désactivé** (les comptes sont créés par l'administrateur)
   - **Confirm email** : activé
2. **URL Configuration** :
   - *Site URL* : `http://localhost:5173`
   - *Redirect URLs* → **Add URL** : `http://localhost:5173/**`
   - Plus tard, après le déploiement : ajouter aussi l'adresse publique (ex. `https://maso.vercel.app/**`) et la mettre en *Site URL*.

## Étape 4 — Brancher l'application

1. Menu **Project Settings** (roue dentée) → **API Keys** (ou **Data API**). Copier :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`) — l'adresse **seule**, sans rien après `.co` (pas de `/rest/v1/`)
   - la clé **publishable** (`sb_publishable_…`) ou, à défaut, la clé **anon public**
   - **Ne jamais copier** la clé `service_role` / `secret` dans le front ni dans Git.
2. Dans le dossier du projet, ouvrir `.env` (le créer avec `cp .env.example .env` s'il n'existe pas) :

   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxx
   ```

3. Relancer l'application : arrêter `npm run dev` (`Ctrl+C`), puis `npm run dev`.
   L'encadré « Mode démonstration » disparaît de l'écran de connexion et l'onglet **Lien magique** apparaît : l'application utilise Supabase.

## Étape 5 — Créer les comptes de l'équipe

Menu **Authentication** → **Users** → **Add user** → **Create new user** :
- *Email* et *Password* de la personne
- cocher **Auto Confirm User**
- **Create user**

Le faire pour les 4 membres. Chaque compte est créé avec le rôle `journalist` par défaut.

Ensuite, **SQL Editor** → **New query** → adapter les adresses puis **Run** :

```sql
-- Rédaction de l'équipe
insert into public.newsrooms (name, type, region) values ('Rédaction MASO', 'online', 'Analamanga');

-- Noms et rôles (adapter les adresses e-mail)
update public.profiles set full_name = 'Tolotra',  role = 'admin'           where email = 'tolotra@exemple.com';
update public.profiles set full_name = 'Lorraine', role = 'editor_in_chief' where email = 'lorraine@exemple.com';
update public.profiles set full_name = 'Lucia',    role = 'fact_checker'    where email = 'lucia@exemple.com';
update public.profiles set full_name = 'Joba',     role = 'journalist'      where email = 'joba@exemple.com';
update public.profiles set newsroom_id = (select id from public.newsrooms limit 1);

-- Vérification
select email, full_name, role, active from public.profiles order by role;
```

Rôles possibles : `journalist`, `fact_checker`, `editor_in_chief`, `admin`.
Les rôles ne sont changés ici qu'**une seule fois** : ensuite, l'administrateur les gère depuis l'écran **Administration** de l'application.

## Étape 6 — Tester (checklist avant de pousser)

`npm run dev` → http://localhost:5173

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Se connecter avec le compte **admin** | Arrive sur **Administration**, voit les 4 membres |
| 2 | Changer le rôle de Joba en *Fact-checker* | « Compte mis à jour » ; visible dans Table Editor → `profiles` |
| 3 | Suspendre Joba, se déconnecter, se connecter avec Joba | « Ce compte est suspendu » |
| 4 | Réactiver Joba (depuis le compte admin) | Joba peut de nouveau se connecter |
| 5 | Se connecter en **journaliste** | Arrive sur **Veille**, pas d'onglet Administration ; `/admin` renvoie à la Veille |
| 6 | Mauvais mot de passe | « Adresse e-mail ou mot de passe incorrect » |
| 7 | Couper le Wi-Fi, recharger la page | Toujours connecté, bandeau « Vous êtes hors ligne » |
| 8 | **Continuer sans compte** | Accès à Ressources et Profil uniquement |
| 9 | Table Editor → `audit_logs` | Les changements de rôle et de statut y apparaissent |

Les tests 10 et 11 ci-dessous dépendent de l'envoi d'e-mails (voir l'encadré).

| # | Test | Résultat attendu |
|---|---|---|
| 10 | **Lien magique** avec votre adresse | E-mail reçu → le lien connecte directement |
| 11 | **Mot de passe oublié** | E-mail reçu → page « Nouveau mot de passe » |

> **Envoi d'e-mails** : le service d'e-mail intégré à Supabase est limité (quelques e-mails par heure, et en pratique réservé aux adresses des membres de l'organisation Supabase). Pour le hackathon : créer les comptes à la main (étape 5) suffit. Pour envoyer de vrais e-mails à n'importe qui : **Authentication → Emails → SMTP Settings** et brancher un service d'envoi (Brevo, Resend…).

## Étape 7 — Invitation depuis l'application (fonction serveur)

Le bouton **Envoyer l'invitation** de l'écran Administration appelle une fonction serveur, `invite-user`, qu'il faut déployer une fois. Deux possibilités :

**A. Depuis le site (sans terminal)**
Menu **Edge Functions** → **Deploy a new function** → **Via Editor** → nom : `invite-user` → remplacer le code par le contenu de `supabase/functions/invite-user/index.ts` → **Deploy function**.

**B. Depuis le terminal**

```bash
npx supabase login                                   # ouvre le navigateur
npx supabase link --project-ref abcdefgh             # « abcdefgh » = début de votre Project URL
npx supabase functions deploy invite-user
```

Les clés nécessaires (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`…) sont fournies automatiquement par Supabase à la fonction : il n'y a rien à copier.
Test : depuis le compte admin, inviter une adresse → elle apparaît dans **Authentication → Users** et dans la liste des membres. (La réception de l'e-mail dépend de l'encadré ci-dessus.)

---

## Option : Supabase en local (Lorraine, pour développer)

Prérequis : Docker Desktop lancé.

```bash
npm run db:start      # démarre Supabase sur le PC, crée la base ET les 4 comptes de démonstration
```

Copier *API URL* et *anon key* affichés dans `.env`, puis relancer `npm run dev`.
- Comptes : `journaliste@maso.demo`, `factchecker@maso.demo`, `redaction@maso.demo`, `admin@maso.demo` — mot de passe `Maso2026!demo`
- E-mails (lien magique, invitation) : http://localhost:54324
- Interface d'administration de la base : http://localhost:54323
- Tests des droits : `npm run test:db`
- Arrêter : `npx supabase stop`
