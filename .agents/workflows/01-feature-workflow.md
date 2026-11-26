# Feature Development Workflow (mattpocock-skills)

Feature work runs through the `mattpocock-skills` plugin. Each skill's own `SKILL.md` is the source of truth for how it works. This file only says which route to take and adds the Flaner steps the skills don't cover (Flaner skills, lint, Firestore rules, PR, manual test). Unsure which skill is next → `/ask-matt`.

## Pick a route

| Situation | Route |
| --- | --- |
| Large effort with open questions, more than one session even to plan (e.g. a new app) | `/wayfinder` → `/to-spec #<map>` → `/to-tickets` → `/implement #N` per ticket |
| Clear feature: the plan fits one session, the build spans several | `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement #N` per ticket |
| Small change, one session | `/grill-with-docs` → `/implement` |
| Bug | `/diagnosing-bugs`, then fix test-first with `/tdd` |
| Issue filed by someone else | `/triage` |

## Phase 1: Plan (decisions only, no product code)

1. **Wayfinder route:** the feature issue becomes the map (`wayfinder:map`); its decision tickets are research (AFK), grilling and prototype (HITL), task. One ticket per session, research excepted.
2. **Domain docs:** grilling writes terms to `GLOSSARY.md` and hard-to-reverse decisions to `docs/adr/` as they settle (`docs/agents/domain.md`).
3. **Flaner skills for decisions in their area:** `firebase-data-modeling` and `firestore-rules-manager` (data model, rules, indexes), `module-federation` (MFE placement), `translations`, `dataviz` (charts), `nx-workspace` (new package).
4. **UI design is a decision, settled before implementation** (`flaner-design` skill):
   - Wayfinder route: a `wayfinder:prototype` ticket resolved with a Claude Design brief and Design artifact, linked from the ticket.
   - Grill route: after `/to-spec`, before `/to-tickets`; the design is linked from the spec.
   - `/prototype` (logic branch) answers state or flow questions, e.g. an import wizard. Its UI branch is for comparing throwaway variants in code, not a replacement for the design.
   - `/implement` never chooses a UI variant itself: an open UI question goes back to Phase 1.

## Phase 2: Spec and tickets

1. `/to-spec`, then `/to-tickets` in the same context window (no `/clear` or compact between them).
2. Labels and templates: `docs/agents/issue-tracker.md` → *Flaner conventions*.
3. A Firestore change lands in the first ticket that needs it, as part of the vertical slice: rules spec, `npm run rules:build`, rules tests (`firestore-rules-manager`).
4. A ticket that adds or changes a Firestore query says so in its acceptance criteria (it needs a DEV check, Phase 4).

## Phase 3: Implement

1. **Branch:** `feature/<issue>-<slug>` from `develop`; never commit on `develop` / `master` (`.agents/AGENTS.md` → GIT). Default: one feature branch and one PR per spec, its tickets committed one after another.
2. **One ticket per session:** `/implement #N`, then `/clear`. For parallel tickets use `/implement-spec`, never two `/implement` sessions in one checkout. Parallel tickets in the cloud (one session, branch and PR each): `cloud-batch` skill.
3. The skill drives `/tdd` at the agreed seams, typechecks, runs the tests, runs `/code-review` and commits. Flaner additions before its commit:
   - `npx nx run <pkg>:lint --fix` on every touched package.
   - `npm run lint:tokens` when UI changed.
   - `npm run rules:check` and `npm run test:rules` when the rules spec changed.
   - Test placement and style: `unit-testing` (folder-per-unit), `e2e-testing`.
4. `/implement` does not close tickets: the PR closes them (`Closes #N`).

## Phase 4: PR and pre-merge manual test

1. Before the PR, run what CI runs: `npx nx affected -t typecheck lint test --base=origin/develop --head=HEAD`.
2. Open the PR to `develop` when the user asks (or as the draft PR of `/implement-spec`). Body: the `/pr` template, then `Closes #N` for every ticket and the spec, then the section `## Manual test (for the local session, before merge)` (`.agents/AGENTS.md` → PRE-MERGE MANUAL TEST).
3. Don't wait for the manual test before opening the PR. It runs after the PR is opened and before merge: by the implementing agent if it worked locally, otherwise by a local session from the PR body (`manual-test` skill).
   - If the branch does not change `firestore.rules` / `firestore.indexes.json`: a local test (`npm run dev:emulators` or `npm run dev`) is enough, because the emulators run the same rules and indexes as DEV. Exception: a new or changed Firestore query must also be tested on DEV, because the emulator does not enforce composite indexes.
   - If it does: GitHub → Actions → *Deploy Firestore* → *Run workflow* on the feature branch (DEV only), then test on the branch's Vercel Preview or with `npm run dev` (local `.env` → DEV).
   - If the branch is abandoned after a DEV deploy, run the workflow on `develop` to restore DEV.
   - The Vercel Preview of `core` loads every MFE from its DEV alias (`flaner-<mfe>-dev.vercel.app`, `VITE_MFE_*_URL`), not from the same branch. Changes inside an MFE are therefore invisible on the host Preview: test them locally (`npm run dev:emulators` / `npm run dev`). A branch that changes only `core` / `shared` can be tested on the Preview (#54).
4. After the merge, `/retro` is optional: it proposes fixes to the agent setup (rules, checks, docs).
