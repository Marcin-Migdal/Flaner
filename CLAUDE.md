# Flaner v2 — Claude Code

Nx monorepo (npm workspaces): React 19 + Vite 8 + Module Federation, Firebase (Firestore + Auth), each app deployed separately to Vercel.

The single source of truth for AI rules and skills is `.agents/` (shared with Cursor / Antigravity). `.claude/skills` is a junction to `.agents/skills`, so the project skills are available directly in Claude Code. The junction is gitignored — after a fresh clone recreate it (PowerShell): `New-Item -ItemType Junction -Path .claude\skills -Target .agents\skills`.

## Packages
- `core` — MF host (routing, i18n, `mf.ts`, `sw.ts`)
- `shared` — constants, context (Auth), firebase, hooks, types, utils (`@flaner/shared/*`)
- `ui-components` — design system (shadcn + CVA) (`@flaner/ui-components`)
- `test-utils` — `renderWithProviders`, factories (`@flaner/test-utils`)
- MFEs: `community`, `planning`, `settings`, `shopping`, `tools` (Spooler)

## Commands
- `npm run dev` — all dev servers (host at `localhost:4200`)
- `npx nx run <pkg>:lint --fix` — lint only the touched packages (mandatory after changes)
- `npx nx run <pkg>:typecheck`, `npm run typecheck`
- `npm test` / `npx vitest run --project <pkg>` — unit tests (Vitest)
- `npm run e2e` — Playwright (`e2e/`, starts `npm run dev` itself)
- Firestore rules/indexes: source in `.agents/skills/firestore-rules-manager/docs/`, deployed via CLI (see that skill)

## Rules (imported)
@.agents/AGENTS.md
@.agents/rules/01-ai-protocol.md
@.agents/rules/02-project-standards.md
@.agents/rules/03-package-structures.md

Further context loaded on demand: `.agents/workflows/01-feature-workflow.md`, `.agents/docs/troubleshooting.md`, `.agents/docs/*`.
