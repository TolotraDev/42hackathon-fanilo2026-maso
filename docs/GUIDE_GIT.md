# MASO — Guide Git de l'équipe

Équipe : **Tolotra (admin)**, Lorraine, Lucia, Joba.

## Les règles

1. **Seul Tolotra** pousse sur `dev` et `main`.
2. Chaque membre pousse **uniquement sur sa branche** : `tolotra`, `lorraine`, `lucia` ou `joba` (tout en minuscules).
3. Un module terminé → Tolotra le **combine dans `dev`**.
4. `main` ne reçoit que des **versions fonctionnelles**.
5. Avant de commencer un module, on **récupère `dev`** dans sa branche.
6. Chaque commit est **au nom de son auteur seul** (pas de ligne `Co-Authored-By`).

```
tolotra  ─┐
lorraine ─┤  Tolotra combine        Tolotra publie
lucia    ─┼──────────────► dev ──────────────────► main
joba     ─┘  (chaque module)   (version fonctionnelle)
```

| Ordre | Module | Qui | Branche |
|---|---|---|---|
| 1 | MOD-01 Socle front ✅ | Tolotra | `tolotra` |
| 2 | MOD-02 Backend et authentification | Lorraine | `lorraine` |
| 3 | MOD-03 Vérifier (image, lien) | Lucia | `lucia` |
| 4 | MOD-04 Ressources (annuaire, statistiques) | Joba | `joba` |
| 5 | MOD-05 Dossiers et hors connexion | Tolotra | `tolotra` |
| 6 | MOD-06 Revue et portail public | Lorraine | `lorraine` |
| 7 | MOD-07 IA, rédaction, veille | Lucia | `lucia` |
| 8 | MOD-08 Profil, badge, livraison | Joba | `joba` |

---

## Étape 1 — Tolotra : créer le dépôt (une seule fois)

### 1.1 Sur GitHub

**New repository** → nom : `42hackathon-fanilo2026-maso` → **Public** → ne cocher **aucune** case (pas de README, pas de .gitignore, pas de licence) → **Create repository**.

### 1.2 Sur le PC, dans le dossier du projet

```bash
cd chemin/vers/42hackathon-fanilo2026-maso

git init -b dev
git config user.name  "TANJONIAINA Tolotra"
git config user.email "e-mail-de-votre-compte-github"

git add .
git status                 # vérifier : pas de .env, pas de node_modules, pas de dist
git commit -m "feat(front): MOD-01 socle front, design system et navigation"
```

### 1.3 Créer les branches des membres

Elles partent toutes de `dev` et contiennent donc déjà le MOD-01 :

```bash
git branch tolotra
git branch lorraine
git branch lucia
git branch joba
git branch                 # affiche : dev, joba, lorraine, lucia, tolotra
```

`main` n'est **pas** créée maintenant : elle le sera à la première version fonctionnelle (étape 5).

### 1.4 Premier envoi sur GitHub

```bash
git remote add origin https://github.com/TolotraDev/42hackathon-fanilo2026-maso.git
git push -u origin dev tolotra lorraine lucia joba
```

Vérification : sur GitHub, le bouton des branches affiche les 5 branches.

### 1.5 Inviter les membres

GitHub → **Settings** → **Collaborators** → **Add people** → nom d'utilisateur GitHub de Lorraine, puis de Lucia, puis de Joba.
Chacun **accepte l'invitation** reçue par e-mail.

### 1.6 Protéger `dev` et `main`

GitHub → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset** :

| Champ | Valeur |
|---|---|
| Ruleset name | `admin-seulement` |
| Enforcement status | **Active** |
| Bypass list | **Add bypass** → **Repository admin** |
| Target branches | **Add target** → **Include by pattern** → `dev`, puis à nouveau → `main` |
| Règles à cocher | **Restrict updates**, **Restrict deletions**, **Block force pushes** |

→ **Create**. Les membres ne peuvent plus pousser sur `dev` ni sur `main`.

### 1.7 Prévenir Lorraine

> « MOD-01 est dans `dev`, tu peux commencer MOD-02 sur ta branche `lorraine`. »

---

## Étape 2 — Chaque membre : installation (une seule fois)

```bash
# Connexion à GitHub (installer d'abord GitHub CLI : https://cli.github.com)
gh auth login              # GitHub.com → HTTPS → Login with a web browser
gh auth setup-git

# Récupérer le projet
git clone https://github.com/TolotraDev/42hackathon-fanilo2026-maso.git
cd 42hackathon-fanilo2026-maso

# Signer ses commits à son nom
git config user.name  "Prénom NOM"
git config user.email "e-mail-de-son-compte-github"

# Aller sur sa branche et lancer l'application
git switch lorraine        # ou lucia, ou joba
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

---

## Étape 3 — Chaque membre : faire son module

À faire par le membre dont c'est le tour, Tolotra compris pour ses propres modules. Exemple avec `lorraine` :

```bash
# 1. Avant de commencer : récupérer le travail déjà combiné
git switch lorraine
git pull origin dev
npm install

# 2. Pendant le travail : commiter et pousser souvent
git add .
git commit -m "feat(auth): ajoute la page de connexion"
git push origin lorraine

# 3. À la fin : tout doit passer
npm run typecheck && npm test && npm run build
git push origin lorraine
```

Puis prévenir Tolotra : « MOD-02 terminé, poussé sur `lorraine` ». **Et s'arrêter** : on ne commence pas le module suivant.

---

## Étape 4 — Tolotra : combiner un module dans `dev`

Exemple pour le module de Lorraine :

```bash
git switch dev
git pull origin dev
git fetch origin
git merge origin/lorraine          # pour vos propres modules : git merge tolotra

npm install
npm run typecheck && npm test && npm run build
npm run dev                         # vérifier l'application sur mobile et web

git push origin dev
```

Puis prévenir le membre suivant.

**En cas de conflit** (`CONFLICT` affiché après `git merge`) :
1. `git status` liste les fichiers en conflit.
2. Ouvrir chacun dans VS Code et choisir *Accept Current*, *Accept Incoming* ou *Accept Both*.
3. Enregistrer, puis lancer `git add .` et `git commit`.
4. Pour tout annuler : `git merge --abort`.

---

## Étape 5 — Tolotra : publier une version fonctionnelle dans `main`

### La première fois

Quand l'application fonctionne de bout en bout :

```bash
git switch dev
git pull origin dev
git switch -c main                  # crée main à partir de dev
git push -u origin main
```

Puis GitHub → **Settings** → **General** → *Default branch* → **`main`**.

### Les fois suivantes

```bash
git switch main
git pull origin main
git merge dev
npm install && npm run typecheck && npm test && npm run build
git push origin main
```

Avant la deadline, `main` doit contenir la dernière version fonctionnelle.

---

## Problèmes fréquents

| Message | Solution |
|---|---|
| `push declined due to repository rule violations` | Vous avez poussé sur `dev` ou `main` : poussez sur votre branche |
| `rejected … (fetch first)` | `git pull origin <votre-branche>`, puis `git push origin <votre-branche>` |
| `Authentication failed` | `gh auth login` puis `gh auth setup-git` |
| `Your local changes would be overwritten` | D'abord `git add .` et `git commit -m "..."`, puis recommencer |
| `remote origin already exists` | `git remote set-url origin https://github.com/TolotraDev/42hackathon-fanilo2026-maso.git` |
| L'application ne démarre plus après un `pull` | `npm install` |
| Je ne sais plus sur quelle branche je suis | `git branch` (la branche actuelle est marquée d'une `*`) |

**Attention aux majuscules** : `lorraine` et `Lorraine` sont deux branches différentes pour Git. Toujours écrire en minuscules.
