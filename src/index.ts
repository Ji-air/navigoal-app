# Navigoal — Initialisation du projet

## Lecture préalable

Avant d'agir, je pose le cadre de ce que je vais faire et dans quel ordre.

---

## Ce que je vais faire

### Périmètre de cette session
Initialisation de la base technique dans `app/`. Cette couche est préalable à tous les P0 — sans elle, aucun P0 ne peut être implémenté.

### Ce que j'initialise
1. Structure de dossiers `app/`
2. `package.json` avec les dépendances nécessaires
3. Configuration Vite (bundler React)
4. TypeScript (`tsconfig.json`)
5. Variables d'environnement (`.env.example`)
6. Routage web (React Router)
7. Client Supabase centralisé
8. Métadonnées Open Graph (`index.html`)
9. Point d'entrée (`main.tsx`) et racine (`App.tsx`)
10. Journal de session

### Ce que je ne fais pas encore
- P0-1 à P0-10 : traités session par session
- Composants UI, pages, logique métier
- Configuration Supabase côté dashboard (hors périmètre code)

### Ordre de génération
```
app/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .env.example
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── lib/
    │   └── supabase.ts
    └── router/
        └── index.tsx

_sessions/
└── 2025-01-01_init.md
```

Aucun écart par rapport aux instructions. Je procède.

---

## Génération des fichiers

### `app/package.json`

```json
{
  "name": "navigoal",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

**Choix justifiés :**
- `@supabase/supabase-js` : client officiel, auth magic link inclus
- `react-router-dom` v6 : routage déclaratif, compatible mobile
- `zustand` : gestion d'état minimale, sans boilerplate Redux, bien couvert par les corpus Claude Code
- Pas de librairie CSS à ce stade — introduite quand l'UI démarre

---

### `app/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    https: false, // HTTPS géré par le reverse proxy en production
  },
  build: {
    target: 'es2020', // Safari iOS 16+ et Chrome Android 110+ supportent ES2020
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Sépare les dépendances lourdes pour optimiser le chargement initial (P0-10)
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
```

**Note P0-10 :** Le découpage en chunks (`manualChunks`) évite un bundle monolithique. Le vendor React et le client Supabase sont mis en cache navigateur séparément après la première visite.

---

### `app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

### `app/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

### `app/.env.example`

```bash
# Supabase — clés publiques (non secrètes côté client)
# Copier ce fichier en .env.local et remplir les valeurs
# Ne jamais committer .env.local

VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon-publique

# Environnement
VITE_APP_ENV=development

# API sport externe (P0-8 — à configurer lors de l'implémentation)
# VITE_SPORT_API_KEY=
# VITE_SPORT_API_BASE_URL=
```

**Note sécurité :** Les variables `VITE_*` sont exposées côté client — c'est le comportement attendu pour l'URL Supabase et la clé `anon`. La sécurité des données est assurée par les Row Level Security policies côté Supabase, pas par la clé publique.

---

### `app/index.html`

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0a1628" />

    <!-- Métadonnées de base -->
    <title>Navigoal — La course du Mondial 2026</title>
    <meta
      name="description"
      content="Compose ton équipage, suis le Mondial 2026 et fais avancer ton bateau avec tes amis."
    />

    <!-- Open Graph — partage l