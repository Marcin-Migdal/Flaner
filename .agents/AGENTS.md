# Flaner v2 AI Agent Global Rules

**HOW WORK FLOWS: MATTPOCOCK SKILLS FIRST**
- Planning and feature work run through the `mattpocock-skills` plugin. Routes (wayfinder / grill-with-docs → to-spec → to-tickets → implement) and the Flaner steps the skills don't cover: `.agents/workflows/01-feature-workflow.md`.
- A mattpocock skill the user invokes (`/wayfinder`, `/grill-with-docs`, `/to-spec`, `/to-tickets`, `/implement`, `/implement-spec`, `/prototype`, `/research`, `/tdd`, `/code-review`, `/diagnosing-bugs`, `/triage`, …) runs by its own `SKILL.md`; invoking it approves the file and tracker writes it defines.
- Where a skill is silent, the rules below and the project standards apply.
- Most of those skills can only be started by the user (`disable-model-invocation`): recommend the exact slash command instead of trying to invoke it.

**CRITICAL BEHAVIORAL RULE: GIT**
- NEVER stage, commit, stash or push on your own initiative. Exception: the git steps a user-invoked skill defines:
  - `/implement` commits its ticket to the current branch.
  - `/implement-spec` creates an integration branch, per-ticket worktrees and branches, merges them, and may open a draft PR.
  - `/prototype` and wayfinder research tickets commit to throwaway `prototype/*` / `research/*` branches (pushed, never merged).
- Guardrails for those steps:
  - Never commit on `develop` or `master`. Before `/implement` or `/implement-spec`, if the current branch is `develop` / `master`, first create `feature/<issue>-<slug>` from `develop`.
  - Never push to, merge into or force-push `develop` / `master`. PRs target `develop`.
  - Push a feature branch or open a PR only when the user asks or the skill defines it.
- Any other git command that modifies repository state or history requires an explicit request from the user or an agreement in the conversation.

**CRITICAL BEHAVIORAL RULE: PRE-MERGE MANUAL TEST**
- Day-to-day work on a feature branch runs against the emulators (`npm run dev:emulators`) — no deploys.
- The manual test runs AFTER the PR is opened and BEFORE it is merged — do not hold the PR back for it. The implementing agent writes the steps in the PR body (section below):
  - **Agent worked locally:** walk through the steps yourself in the browser and report the result on the PR.
  - **Agent worked in the cloud:** stop at the PR; a local session later runs the steps from the PR body in the browser.
- Where the manual test runs depends on the branch:
  - **`firestore.rules` / `firestore.indexes.json` unchanged:** a local manual test (`npm run dev:emulators` or `npm run dev`) counts as the final test. The emulators load the same rules and indexes that DEV runs, so a test on the Vercel Preview is not required. Exception: if the branch adds or changes a Firestore query, also test it on DEV — the emulator does not enforce composite indexes, so a missing entry in `firestore.indexes.json` fails only there.
  - **Changed:** GitHub → Actions → *Deploy Firestore* → *Run workflow* on the feature branch (deploys to DEV only), then test on the branch's Vercel Preview or with `npm run dev` (local `.env` → DEV).
- Every PR body has a section exactly titled `## Manual test (for the local session, before merge)`:
  - Point 1 says where to test (see above). Then the run commands, then numbered browser steps, each with the expected result.
  - **At most ~8 steps, chosen by risk:** the paths the change actually touches, one representative write per affected area, and any place the PR calls out as fragile or fixed. Not a tour of the whole app; no "repeat N times".
  - Long or repetitive scenarios (cross-window / multi-user sync, many CRUD variants) belong in E2E (`e2e/`, `e2e-testing` skill), not in the manual test.
  - Before writing this section, the implementing agent checks whether a scenario it wants tested by hand should instead be a new E2E spec or a change to an existing one. Covered by E2E → add or update the spec in the same PR, and leave the scenario out of the manual test.
- Details: `.agents/workflows/01-feature-workflow.md` (Phase 4) and the `firestore-rules-manager` skill, section 6.

**BACKLOG: GITHUB ISSUES**
- Future work lives in GitHub Issues of this repo. Labels and which template applies when: `docs/agents/issue-tracker.md` → *Flaner conventions*.
- Issues created by mattpocock skills (wayfinder map and tickets, `/to-spec` spec, `/to-tickets` tickets) use the skill's own template. `.github/ISSUE_TEMPLATE/task.yml` is for deferred work filed outside those skills.
- Whenever something is deferred ("later", out of scope, found while working on something else), propose an issue with full context (why, goal, files, acceptance criteria) and create it once the user agrees.
- When a task starts from an issue, read it first; reference it in the PR (`Closes #N`).

**PROJECT STANDARDS AND ARCHITECTURE**
When writing code, you must adhere to project standards. If you don't know them by heart for a given task, read these files before starting to code:
- `.agents/rules/02-project-standards.md` (Tech stack, i18n rules, TypeScript, Linter)
- `.agents/rules/03-package-structures.md` (Monorepo package structure, MFE rules)
- The `.agents/skills/` skill matching the area you touch (e.g. `api-query-layer`, `react-hook-form`, `firestore-rules-manager`).
These files and skills are this repo's coding standards: `/code-review` checks the Standards axis against them.

**WORKFLOWS & FEATURE DEVELOPMENT**
- New features and larger tasks are planned with the `mattpocock-skills` flow before any product code is written. Pick the route in `.agents/workflows/01-feature-workflow.md`; unsure which skill is next → `/ask-matt`.

**DEFAULT ACTIVE SKILLS: PONYTAIL & CAVEMAN**
- **ponytail**: Apply minimalist senior developer principles by default in every task. Enforce ruthless YAGNI, reach for the standard library or platform native features before adding dependencies/abstractions, aim for the shortest clean diff, and fix root cause over symptom.
- **caveman**: Apply terse, high-density communication by default in every response. Answer first, eliminate conversational filler, greetings, and repetitive recaps. Keep all technical facts, code, commands, paths, and numbers 100% exact. (Note: Project safety protocols remain fully respected. Text persisted outside chat — issues, specs, tickets, PR bodies, GLOSSARY, ADRs, docs — is written in normal prose.)

