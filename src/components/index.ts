# Analyse avant action

## Observations à signaler

**1. Animations "spécifiées" — source incomplète**
Le prompt demande d'ajouter "les animations spécifiées" mais aucun bloc `ANIMATIONS.md` ou liste d'animations n'est présent dans le contexte fourni. Les seules spécifications disponibles sont dans `DIRECTION_ARTISTIQUE.md` :
- "Animation de déploiement du panneau fixtures douce et fluide"
- "Compte à rebours sans nervosité"
- "Atténuation des modales (arrière-plan assombri)"
- "Lent et organique" (principe général)
- "Transitions entre onglets bottom bar (peut être instantané)" (alléageable)

Je travaille **exclusivement depuis ces sources**. Aucune animation inventée.

**2. Composants existants non fournis**
Les fichiers `ng-button.js`, `ng-nation-slot.js`, etc. ne sont pas dans le contexte. Je produis les **patches d'animation uniquement** (méthode CSS + JS minimale), sous forme de sections clairement délimitées à insérer dans chaque composant. Je ne réécris pas la structure.

**3. Format de sortie demandé : `index.ts`**
Le barrel d'export ne porte pas les animations. Je produis `index.ts` comme demandé, et les patches d'animation comme fichiers compagnons `*.animation.css` — injectables dans chaque composant sans toucher à sa structure.

**4. Tokens d'animation disponibles (depuis tokens.css de la session précédente)**
```
--transition-touch:  150ms ease
--transition-panel:  300ms ease
--transition-slow:   500ms ease
```
Ces trois valeurs couvrent l'ensemble des cas spécifiés.

---

## Animations retenues — inventaire strict

| ID | Composant | Déclencheur | Ce qu'elle montre | Durée | Rôle |
|---|---|---|---|---|---|
| A1 | `ng-bottom-sheet` | `open` → `closed` | Déploiement vertical du panneau fixtures | `--transition-panel` 300ms | Fonctionnel |
| A2 | `ng-bottom-sheet` | `open` → `closed` | Atténuation overlay (fond assombri) | `--transition-panel` 300ms | Fonctionnel |
| A3 | `ng-countdown` | tick toutes les secondes | Remplacement de valeur sans saut | `--transition-slow` 500ms | Fonctionnel |
| A4 | `ng-button` | `:active` (toucher) | Feedback tactile (compression légère) | `--transition-touch` 150ms | Fonctionnel |
| A5 | `ng-nation-slot` | `:active` (toucher) | Feedback tactile | `--transition-touch` 150ms | Fonctionnel |
| A6 | `ng-match-card` | `:active` (toucher) | Feedback tactile | `--transition-touch` 150ms | Fonctionnel |
| A7 | `ng-bottom-bar` | changement d'onglet | Transition instantanée (alléageable DA) | `0ms` | Fonctionnel |

**Animations exclues (non spécifiées) :** pulse, shimmer, skeleton loader, bounce, parallaxe illustration, rotation d'icônes, progress bar animée.

---

## Fichiers produits

```
app/src/components/
├── animations.css           ← keyframes partagées + classes utilitaires
├── ng-bottom-sheet.js       ← patch A1 + A2 (section délimitée)
├── ng-countdown.js          ← patch A3 (section délimitée)
├── ng-button.js             ← patch A4 (section délimitée)
├── ng-nation-slot.js        ← patch A5 (section délimitée)
├── ng-match-card.js         ← patch A6 (section délimitée)
└── index.ts                 ← barrel d'export mis à jour
```

---

### `app/src/components/animations.css`

```css
/* =============================================================
   Navigoal — Animations partagées
   Source : DIRECTION_ARTISTIQUE.md (sections Mouvement + Éléments porteurs)
   Règle : aucun effet non spécifié. Performance mobile prioritaire.
   Tous les timings depuis tokens.css.
   ============================================================= */

/* ── Respect des préférences système ──────────────────────────
   Désactivation des transitions pour utilisateurs sensibles au mouvement.
   Maintenu en tête de fichier — priorité absolue.
   ─────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration:   0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration:  0.01ms !important;
  }
}

/* ── A1 — Déploiement bottom sheet ────────────────────────────
   Déclencheur : attribut [open] sur ng-bottom-sheet
   Ce qu'elle montre : le panneau monte depuis le bas, fluide
   Durée : --transition-panel (300ms ease)
   Rôle : fonctionnel — l'utilisateur comprend que le panneau
          vient du bas et peut y retourner
   ─────────────────────────────────────────────────────────── */
@keyframes ng-sheet-enter {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes ng-sheet-exit {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

/* ── A2 — Atténuation overlay ─────────────────────────────────
   Déclencheur : attribut [open] sur ng-bottom-sheet
   Ce qu'elle montre : fond assombri progressif (pas opaque)
   Durée : --transition-panel (300ms ease)
   Rôle : fonctionnel — délimite le focus sans masquer l'illustration
   ─────────────────────────────────────────────────────────── */
@keyframes ng-overlay-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes ng-overlay-exit {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ── A3 — Compte à rebours (tick) ─────────────────────────────
   Déclencheur : changement de valeur numérique (toutes les secondes)
   Ce qu'elle montre : la valeur ancienne sort vers le haut,
                       la nouvelle entre depuis le bas — sans saut
   Durée : --transition-slow (500ms ease)
   Rôle : fonctionnel — confirme que le compte avance,
          "sans nervosité" (DA)
   Note : chaque chiffre est un élément indépendant.
          L'animation ne joue que sur le chiffre qui change.
   ─────────────────────────────────────────────────────────── */
@keyframes ng-digit-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-40%);
  }
}

@keyframes ng-digit-enter {
  from {
    opacity: 0;
    transform: translateY(40%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/*