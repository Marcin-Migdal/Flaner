---
name: module-federation
description: Architecture guide for Module Federation with Vite (@module-federation/vite). Make sure to use this skill whenever you need to expose a new component, hook, or page from a micro-frontend (MFE), import a remote module into the host app, or configure the mf.ts or vite.config.ts files for federation.
---

# Module Federation Skill

This project uses `@module-federation/vite` to share code across micro-frontends (MFEs).

## 1. Exposing Modules (in a Remote MFE)
When you build a new view or component in an MFE (e.g., `community`) that needs to be consumed by the host or another MFE, you must export it in the `vite.config.ts` or `vite.federation.ts` under the `exposes` object.

**Example in `packages/community/vite.config.ts`:**
```typescript
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'community',
      filename: 'remoteEntry.js',
      exposes: {
        './CommunityView': './src/pages/CommunityView.tsx',
        './useCommunityTranslations': './src/hooks/useCommunityTranslations.ts',
      },
      shared: ['react', 'react-dom', 'react-router']
    })
  ]
})
```

## 2. Consuming Modules (in the Host `core`)
To use an exposed module from an MFE inside the host app, import it using the `remoteName/modulePath` syntax.
Because these are loaded asynchronously over the network, you often need `React.lazy()` for components.

**Example in `packages/core/src/routes/index.tsx`:**
```typescript
import React, { Suspense } from 'react';

// 'community' is the name defined in the remote's vite config
const CommunityView = React.lazy(() => import('community/CommunityView'));

export const AppRoutes = () => (
  <Suspense fallback={<div>Loading Community...</div>}>
    <CommunityView />
  </Suspense>
);
```

## Rules
- Always use `React.lazy()` and `<Suspense>` when importing remote React components.
- **CRITICAL: Always use `React.lazy()` for all View/Page components in MFE `routes.tsx`**: Never statically import views inside `routes.tsx`. Because `navigation.ts` generates navigation items from `routes.tsx` and is exposed to the Host (`core`), static imports will bundle the entire MFE (all views, calendars, modals, heavy libs) into the navigation chunk, causing network timeouts and broken navigation on production.
- Make sure that dependencies used across MFEs (like `react`, `react-router`, `zod`, `@tanstack/react-query`) are properly listed in the `shared` array in both host and remote federation configs.
