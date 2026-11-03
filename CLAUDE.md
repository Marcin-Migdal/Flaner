# Flaner v2 — Claude Code

Nx monorepo (npm workspaces): React 19 + Vite 8 + Module Federation, Firebase (Firestore + Auth), each app deployed separately to Vercel.

The single source of truth for AI rules and skills is `.agents/` (shared with Cursor / Antigravity). `.claude/skills` is a junction to `.agents/skills`, so the project skills are available directly in Claude Code. The junction is gitignored — after a fresh clone recreate it (PowerShell): `New-Item -ItemType Junction -Path .claude\skills -Target .agents\skills`.

## Packages
- `core` — MF host (routing, i18n, `mf.ts`, `sw.ts`)
- `shared` — constants, context (Auth), firebase, hooks, types, utils (`@flaner/shared/*`)
- `ui-components` — design system (shadcn + CVA) (`@flaner/ui-components`)
- `test-utils` — `renderWithProviders`, factories (`@flaner/test-utils`)
- MFEs: `community`, `planning`, `settings`, `shopping`, `tools` (Spooler)

## Environments
- **PROD**: branch `master` → `flaner.vercel.app`, Firebase `flaner-v2` (`--project prod`).
- **DEV**: branch `develop` → `flaner-dev.vercel.app` (remotes `flaner-<mfe>-dev.vercel.app`), Firebase `flaner-v2-dev` (`--project dev`). All Vercel Preview deployments and local `.env` use DEV.
- Flow: `feature/*` → PR to `develop` → PR `develop` → `master`. Details: `vercel-project-setup` skill.

## Commands
- `npm run dev` — all dev servers (host at `localhost:4200`) against the real DEV Firebase (local `.env`)
- `npm run dev:emulators` — dev servers + Auth/Firestore emulators + rules compiler in watch mode (no deploys; data kept in `.emulator-data/`). Default mode for feature work
- `npx nx run <pkg>:lint --fix` — lint only the touched packages (mandatory after changes)
- `npx nx run <pkg>:typecheck`, `npm run typecheck`
- `npm test` / `npx vitest run --project <pkg>` — unit tests (Vitest)
- `npm run test:rules` — Firestore security rules tests (`firestore-tests/`) on the emulator; needs JDK 21 (`JAVA_HOME`)
- `npm run e2e` — Playwright (`e2e/`) against Firebase emulators; starts emulators + `npm run dev` itself, needs JDK 21 and free ports 4200–4205 / 8080 / 9099 (stop your own `npm run dev` / `dev:emulators` first)
- `npm run rules:build` / `npm run rules:check` / `npm run rules:build -- --watch` — compile `firestore.rules` from the spec in `.agents/skills/firestore-rules-manager/docs/` / fail on drift. Never edit `firestore.rules` by hand (see that skill).
- CI: `.github/workflows/ci.yml` on PRs to `develop`/`master` — typecheck, lint, unit, rules (`rules:check` + emulator tests), affected E2E (`scripts/e2e-affected.mjs`). Apps deploy on Vercel; Firestore rules/indexes deploy via `.github/workflows/deploy-firestore.yml` on push to `develop` (DEV) / `master` (PROD); a manual run on a feature branch deploys it to DEV only (final manual test before merge — see `AGENTS.md`).

## Rules (imported)
@.agents/AGENTS.md
@.agents/rules/01-ai-protocol.md
@.agents/rules/02-project-standards.md
@.agents/rules/03-package-structures.md

Further context loaded on demand: `.agents/workflows/01-feature-workflow.md`, `.agents/docs/troubleshooting.md`, `.agents/docs/*`.
