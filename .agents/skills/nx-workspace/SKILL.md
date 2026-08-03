---
name: nx-workspace
description: Guide for navigating and executing commands in the NX Monorepo workspace. Make sure to use this skill whenever you need to run builds, tests, linters, or start development servers, or when you are creating new packages within the monorepo structure.
---

# NX Workspace Skill

This project uses NX to manage the monorepo. All scripts in `package.json` are wrapped around NX commands.

## 1. Running Commands for Specific Packages
Do NOT use standard `npm run X` unless it's a global script. To target a specific package (e.g., `community`), use NX directly via `npx`.

- **Linting a specific package:**
  `npx nx run community:lint --fix`
- **Building a specific package:**
  `npx nx run community:build`
- **Serving a specific package (dev server):**
  `npx nx run community:serve`

## 2. Running Commands for Multiple/All Packages
- `npm run dev` or `npx nx run-many -t serve` -> Starts all dev servers.
- `npm run lint` or `npx nx run-many -t lint` -> Lints all packages.
- `npx nx run-many -t lint --projects=core,shared` -> Lints only `core` and `shared`.

## 3. Dynamic Linting Rule
As defined in the project standards, **always** run the linter dynamically only on the packages you modified.
For instance, if you edited `packages/core/src/App.tsx` and `packages/shared/src/utils/format.ts`:
```bash
npx nx run-many -t lint --projects=core,shared --fix
```
