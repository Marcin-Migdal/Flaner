# Package Structures & Architecture Rules

The project is organized in a monorepo (NX). There are 3 base unique packages and a series of functional packages (Micro-frontends).

## 1. Base Packages Architecture

Each base package has a different responsibility and structure:

### `core` (Host App)
- The entry point for the entire application integrated via Module Federation.
- Contains host-specific configuration files: `mf.ts` (MF host), `sw.ts` (Service Worker).
- Contains root-level logic for: `routes` (main router combining MFEs), `i18n` (i18next initialization), and layouts for main pages (`pages`).
- The place for initializing global providers and handling the user session lifecycle (although AuthContext is defined in shared).

### `shared`
- Logic that is stateless from the perspective of a specific business domain and will be used by all MFEs and the host.
- Contents:
  - `constants` (global constants)
  - `context` (e.g., AuthContext)
  - `firebase` (database configuration and initialization)
  - `hooks`, `types`, `utils` - generic.

### `ui-components`
- The project's design system (the `components` directory).
- By design, these components are "dumb" - they accept props and call callbacks.
- Inside, there can also be custom UI hooks (`hooks`) that help handle repetitive visual interactions (e.g., modal handling, breakpoints, etc.).

## 2. Functional MFE Architecture

New packages implementing separate business domains (like the existing `community`, `settings`, or planned `shopping`, `scheduling`) **must always strictly adhere to the identical structure below**:

```
packages/<mfe-name>/src/
├── api/             # endpoints.ts (Firebase queries) and types.ts for API
├── components/      # Domain-specific components (that do not fit into global ui-components)
├── hooks/           # Client logic, TanStack Query hooks, mutations
├── pages/           # Routing views (*View.tsx)
├── utils/           # Domain helper scripts
├── App.tsx          # Main MFE wrapper (usually containing the Translation Provider and local Router)
├── bootstrap.tsx    # Entry file initializing the render for Module Federation
├── navigation.ts    # Types, URL constants for a given domain
└── routes.tsx       # Declaration of routes handled by this MFE
```

**IRONCLAD RULE FOR FUNCTIONAL MFEs:**
If, during your work, you find that you need to create a new directory inside a functional MFE (e.g., you need something that exists in `core`, but isn't in the standard layout), **ensure you maintain consistency**. If there is no explicit instruction or clear justification, model it after the 3 base packages (`core`, `shared`, `ui-components`). Any arbitrary deviations are strictly forbidden.
