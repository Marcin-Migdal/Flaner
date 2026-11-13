# Flaner v2 — Claude Code

Nx monorepo (npm workspaces): React 19 + Vite 8 + Module Federation, Firebase (Firestore + Auth), each app deployed separately to Vercel.

The single source of truth for AI rules and skills is `.agents/` (shared with Cursor / Antigravity). `.claude/skills` is a junction to `.agents/skills`, so the project skills are available directly in Claude Code. The junction is gitignored — after a fresh clone recreate it (PowerShell): `New-Item -ItemType Junction -Path .claude\skills -Target .agents\skills`.

## Packages
- `core` — MF host (routing, i18n, `mf.ts`, `sw.ts`)
- `shared` — api (user profiles `users/{uid}` + `usernames/{lower}`: the only code touching them), constants, context (Auth), firebase, hooks, types, utils (`@flaner/shared/*`)
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
- `npm run dev:wipe` — dry run / `-- --yes` deletes ALL Firestore data and Auth accounts on DEV (never PROD). Needs an Admin SDK key: `.agents/docs/admin-scripts.md` (also `scripts/backfill-usernames.mjs`)
- `npx nx run <pkg>:lint --fix` — lint only the touched packages (mandatory after changes)
- `npm run storybook` (localhost:6006) / `npm run storybook:build` — component catalogue of `ui-components` (light/dark + EN/PL toolbar, a11y panel); every component has a `*.stories.tsx` next to it
- `npm run design:export` — export tokens + brand book to `.design-system/` for the "Flaner" Design System artifact in Claude; then ask Claude Code to re-sync it (`flaner-design` skill); `npm run design:screens` — reference screenshots of real views for it (emulators, like E2E)
- `npm run icons` — render the PWA / iOS PNG icons from `packages/core/public/flaner-icon.svg` (the only icon source)
- `npm run lint:tokens` — design-token check (no raw colours / arbitrary sizes; `.agents/docs/design-system.md`); tokens live only in `packages/ui-components/src/theme/theme.css`
- `npx nx run <pkg>:typecheck`, `npm run typecheck`
- `npm test` / `npx vitest run --project <pkg>` — unit tests (Vitest)
- `npm run test:emulator` — endpoint specs (`*.emu.spec.ts`, excluded from `npm test`) on the Firestore + Auth emulators with the real rules (`setupEmulator()` from `@flaner/test-utils/emulator`); needs JDK 21 and free ports 8080 / 9099
- `npm run test:rules` — Firestore security rules tests (`firestore-tests/`) on the emulator; needs JDK 21 (`JAVA_HOME`)
- `npm run e2e` — Playwright (`e2e/`) against Firebase emulators; starts emulators + `npm run dev` itself, needs JDK 21 and free ports 4200–4205 / 8080 / 9099 (stop your own `npm run dev` / `dev:emulators` first)
- `npm run rules:build` / `npm run rules:check` / `npm run rules:build -- --watch` — compile `firestore.rules` from the spec in `.agents/skills/firestore-rules-manager/docs/` / fail on drift. Never edit `firestore.rules` by hand (see that skill).
- CI: `.github/workflows/ci.yml` on PRs to `develop`/`master` — parallel jobs "Typecheck, lint" (+ design tokens, Storybook build) and "Unit tests" (`nx affected`, `.nx/cache` cached), rules (`rules:check` + emulator tests), E2E with one runner per affected Playwright project (`scripts/e2e-affected.mjs`). Root config that targets read belongs in `nx.json` → `namedInputs.sharedGlobals`. Apps are built in GitHub Actions and uploaded to Vercel prebuilt via `.github/workflows/deploy-vercel.yml` (PR → Preview of affected apps; push to `develop` → all apps to the DEV domains; push to `master` → all apps to PROD); Vercel's own Git builds are off. Firestore rules/indexes deploy via `.github/workflows/deploy-firestore.yml` on push to `develop` (DEV) / `master` (PROD); a manual run on a feature branch deploys it to DEV only (final manual test before merge when rules / indexes change — see `AGENTS.md`).

## Agent skills

Feature work uses the `mattpocock-skills` Claude Code plugin (`grill-with-docs` → `to-spec` → `to-tickets` → `implement`). Install it once per machine: add marketplace `mattpocock` (GitHub `mattpocock/skills`) and enable `mattpocock-skills@mattpocock` in `~/.claude/settings.json` (`extraKnownMarketplaces` / `enabledPlugins`), then restart Claude.

### Issue tracker

GitHub Issues in `Marcin-Migdal/Flaner` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), alongside `area:*`/`type:*`/`priority:*`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Rules (imported)
@.agents/AGENTS.md
@.agents/rules/01-ai-protocol.md
@.agents/rules/02-project-standards.md
@.agents/rules/03-package-structures.md

Further context loaded on demand: `.agents/workflows/01-feature-workflow.md`, `.agents/docs/troubleshooting.md`, `.agents/docs/*`.
