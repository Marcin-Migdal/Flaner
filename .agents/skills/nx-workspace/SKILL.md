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

## 4. CI (GitHub Actions)
`.github/workflows/ci.yml` runs on every PR to `develop` / `master`. Every job installs through `.github/actions/setup` (`node_modules` cached on `.node-version` + `package-lock.json`; `npm ci` only on a miss). Parallel jobs:
- **Typecheck, lint**: `npm run lint:tokens`, then `npx nx affected -t typecheck lint build-storybook --base=<PR base sha>` (`fetch-depth: 0`)
- **Unit tests**: `npx nx affected -t test`
- Both restore the Nx cache (`actions/cache`, per job): `NX_CACHE_DIRECTORY=.nx/cache` (Nx 23 defaults to `~/.nx/<hash>/cache`, outside the repo) plus `.nx/workspace-data/*.db` (without the task records a restored cache still misses), so a re-push to the same PR skips unchanged tasks. Task hashes include root config through `nx.json` → `namedInputs.sharedGlobals` (`tsconfig.base.json`, `tsconfig.json`, `vitest.base.ts`, `vite.federation.ts`, `.node-version`): add any new root file that targets read there, or the cache can return a stale result. `typecheck` has `"cache": true` in each `project.json` (`targetDefaults` does not apply it).
- App builds are not in `ci.yml`: `deploy-vercel.yml` builds every affected app (required check **Deploy result**, `vercel-project-setup` skill).
- `rules`: `npm run rules:check` (generated `firestore.rules` matches the spec; schema tables match the TS types), `tsc -p firestore-tests`, `npm run test:rules` (Firestore emulator, Temurin 21)
- E2E: one runner per affected Playwright project — `scripts/e2e-affected.mjs` (details in `e2e-testing` skill §6)
- `nx.json` → `defaultBase: "develop"`, so locally `npx nx affected -t typecheck lint test build` compares with `develop`.

`.github/workflows/deploy-firestore.yml` deploys Firestore rules and indexes on push to `develop` (DEV) / `master` (PROD), and on a manual run of a feature branch (DEV only) — see the `firestore-rules-manager` skill, sections 6–7.

Before pushing, run the same commands locally for touched packages. `NX_DAEMON=false` in CI.
