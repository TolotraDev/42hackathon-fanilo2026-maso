# MASO — Charte graphique

Tirée de la maquette mobile fournie ([references/charte-graphique-mobile.jpeg](references/charte-graphique-mobile.jpeg)).
**Le web reprend exactement la même charte** : mêmes couleurs, mêmes typographies, mêmes cartes, mêmes badges. Seule la navigation change de place selon la largeur d'écran.

## Couleurs

| Jeton (classe Tailwind) | Valeur | Usage |
|---|---|---|
| `navy` | `#0A2F4F` | Bleu marine : en-tête mobile, barre latérale web, titres |
| `cobalt` | `#1976D2` | Bleu cobalt : boutons principaux, bouton central, éléments actifs, liens |
| `canvas` | `#F3F5F8` | Fond des écrans (blanc cassé) |
| `surface` | `#FFFFFF` | Cartes |
| `line` | `#E1E6EC` | Gris clair : bordures, séparateurs, fonds de champs |
| `ink` / `ink-muted` | `#14212E` / `#5B6B7B` | Texte principal / secondaire |
| `success` | `#2E9E5B` | Vrai / Confirmé / Publié |
| `danger` | `#D64545` | Faux / Urgent |
| `warning` | `#E3A21A` | Douteux / En validation |

Les valeurs sont définies une seule fois dans [src/styles/index.css](../src/styles/index.css) (variables CSS), avec une variante **mode sombre** (exigence d'accessibilité du cahier des charges).

## Typographie

- **Montserrat** (700–800) : titres d'écran en capitales (`FLUX D'ACTUALITÉS`), titres de section — classe `font-display`.
- **Inter** (400–600) : texte courant, listes, champs — police par défaut.

## Composants (dans `src/components/ui/`)

| Composant | Rôle dans la maquette |
|---|---|
| `Card` | Cartes blanches arrondies (actualités, résultats, dossiers) |
| `Button` | Bouton bleu cobalt pleine largeur (« Vérifier ») |
| `Badge` | Étiquettes « Urgent », « En cours », « En validation », « Publié » |
| `VerdictBadge` | Libellé + couleur d'un verdict (toujours écrit) |
| `CaseStatusBadge` | Libellé + couleur d'un statut de dossier |
| `SegmentedControl` | Onglets « Actives / Projets » |
| `ProgressBar` | Progression d'une enquête |
| `ListRow` | Lignes cliquables avec icône et chevron (Ressources) |
| `Input` / `Textarea` | Champs gris clair arrondis |

## Mise en page

| | Mobile (< 1024 px) | Web (≥ 1024 px) |
|---|---|---|
| Navigation | Barre en bas : Veille · Vérifier · **bouton central rond** · Ressources · Dossiers | Barre latérale bleu marine avec les 6 espaces |
| En-tête | Bandeau bleu marine : menu, titre en capitales, recherche, paramètres | Barre supérieure claire : titre, recherche, langue, thème, connexion |
| Contenu | Une colonne de cartes | Même cartes, grille 2–3 colonnes selon la page |
| Bouton central | Signaler une rumeur / nouvelle vérification | Bouton « Signaler » en haut de la barre latérale |

Icônes : [lucide-react](https://lucide.dev) (mégaphone, coche, loupe, liste, stylo, presse-papiers, mallette — comme le jeu d'icônes de la maquette).
