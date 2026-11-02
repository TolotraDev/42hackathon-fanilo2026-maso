# MASO — Conventions de nommage et de code

Conventions communes aux 4 membres, conformes au Standard de livraison 42 Antananarivo.

## Dépôt et structure

```
42hackathon-fanilo2026-maso/
├── README.md            # présentation pour le jury (trame du standard)
├── .env.example         # variables d'environnement, SANS valeurs
├── .gitignore
├── docs/                # cahier des charges, modules, workflow, conventions, design
│   └── references/      # documents d'origine (PDF, maquette)
├── public/              # fichiers statiques (icônes PWA, favicon)
├── screenshots/         # captures pour le README et le jury
├── src/                 # application front (PWA mobile + web)
│   ├── app/             # point d'entrée, routeur, fournisseurs globaux
│   ├── components/
│   │   ├── layout/      # coque : en-tête, navigation, barre latérale
│   │   └── ui/          # composants génériques du design system
│   ├── data/demo/       # données de démonstration (fictives) — à remplacer
│   ├── features/        # un dossier par espace fonctionnel (veille, verifier, …)
│   ├── hooks/           # hooks React partagés
│   ├── i18n/            # configuration et traductions fr / mg / en
│   ├── lib/             # utilitaires sans React (clients, helpers)
│   ├── styles/          # CSS global et jetons du thème
│   └── types/           # types TypeScript partagés du domaine
├── supabase/            # migrations SQL, RLS, seed, fonctions serveur, tests pgTAP (supabase/tests/)
├── services/analyse/    # (MOD-03) service Python FastAPI
└── tests/               # tests automatisés (Vitest ; pytest pour le service)
```

## Nommage du code (TypeScript / React)

| Élément | Convention | Exemple |
|---|---|---|
| Composant React (fichier et nom) | PascalCase | `VerdictBadge.tsx`, `AppShell.tsx` |
| Page d'un espace | `<Nom>Page.tsx` dans `src/features/<espace>/` | `src/features/veille/VeillePage.tsx` |
| Hook | camelCase préfixé `use` | `useOnlineStatus.ts` |
| Utilitaire / module non React | camelCase | `cn.ts`, `supabase.ts` |
| Dossier | minuscules, kebab-case | `features/verifier`, `data/demo` |
| Type / interface | PascalCase | `CaseStatus`, `Verdict` |
| Constante globale | UPPER_SNAKE_CASE | `CASE_STATUSES` |
| Valeur d'énumération du domaine | snake_case en anglais (stable en base) | `in_analysis`, `out_of_context` |
| Clé de traduction | `espace.element` en camelCase ; pour une valeur du domaine, la valeur elle-même | `nav.verifier`, `verdict.out_of_context` |
| Test | `<sujet>.test.ts` dans `tests/` | `tests/i18n.test.ts` |
| Variable d'environnement front | préfixe `VITE_` | `VITE_SUPABASE_URL` |

Règles :
- **Aucun texte visible écrit en dur** : tout passe par `t('...')` et existe en `fr`, `mg` et `en`.
- **Aucune couleur en dur** dans les composants : utiliser les classes du thème (`bg-navy`, `text-cobalt`, …), voir [DESIGN.md](DESIGN.md).
- Un verdict ou un statut est **toujours écrit en texte**, jamais seulement une couleur (`VerdictBadge`, `CaseStatusBadge`).
- TypeScript strict, pas de `any`.
- Les données de démo restent dans `src/data/demo/` et ne sont jamais importées par le code serveur.

## Nommage côté Python (MOD-03)

Modules et fonctions en `snake_case`, classes en `PascalCase`, fichier d'entrée `services/analyse/main.py`.

## Nommage côté base de données (MOD-02)

Tables au pluriel en `snake_case` anglais (`cases`, `evidences`, `audit_logs`), colonnes en `snake_case`, migrations `supabase/migrations/AAAAMMJJHHMM_description.sql`.

## Branches

`main`, `dev`, `tolotra`, `lorraine`, `lucia`, `joba` — voir [GUIDE_GIT.md](GUIDE_GIT.md).

## Messages de commit

Format : `type(portée): description à l'indicatif, en français`

| Type | Usage |
|---|---|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `docs` | documentation |
| `style` | mise en forme, design (sans changement de logique) |
| `refactor` | réorganisation du code |
| `test` | ajout ou modification de tests |
| `chore` | configuration, dépendances |
| `merge` / `release` | intégration dans `dev` / `main` (Tolotra uniquement) |

Exemples : `feat(verifier): ajoute l'analyse ELA`, `docs(readme): décrit l'installation`.
Petits commits réguliers, dès la première heure.
