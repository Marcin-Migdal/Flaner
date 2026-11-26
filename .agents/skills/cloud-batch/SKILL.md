---
name: cloud-batch
description: Start a batch of Flaner tickets as parallel cloud sessions — one `/mattpocock-skills:implement <N>` session per issue, each on its own feature branch and PR to develop, with conflict notes between overlapping tickets. Use whenever the user asks to start several issues at once or in the cloud — "odpal batch", "odpal #175 #179 #182 w chmurze", "zrób resztę ticketów ze speca", "start the remaining tickets", "orchestrate spec #167" — even if they don't say "batch". Local desktop sessions only (needs start_session).
---

# Cloud batch of tickets

You start the implementing sessions; you never implement ticket code yourself.

Reply to the user in Polish, tersely. Anything persisted (issue / PR comments, prompts to sessions, commits) stays in English. `.agents/AGENTS.md` applies: never push or merge `develop` / `master`; the user merges PRs.

## 1. Pick the batch

- The user names the issues → take them.
- The user names a spec (e.g. "reszta ze speca #167") → its open child tickets without open blockers (`docs/agents/issue-tracker.md` → *Count open blockers*). Blocked ones wait for the next batch; say which.
- Read each ticket: `gh issue view <N> --json title,body`. Note per ticket:
  - the areas it touches (views, ledgers / shared modules, types, locale files, import wizard…);
  - whether it likely changes Firestore rules / schema / indexes or adds a query;
  - checks its ACs demand (emulator spec, E2E spec).
- **Overlap map**: pair tickets that touch the same module. Those pairs get a conflict note telling both sessions to keep changes additive (new functions / fields; no renames or reshaped exports).

## 2. Confirm, then start

Say the plan in 2–3 lines (tickets, overlaps). The user's request to start is the go-ahead — don't wait for another yes.

`mark_chapter` with a short batch title, then one `start_session` per ticket, all in one message:

- `target: "cloud"`, `initiation: "user_asked"`, `context: "fresh"`, `name: "<area>-<N>-<slug>"`.
- `background` (shared by all): the spec / parent issue, what is already merged, that the batch runs in parallel sessions with one branch and PR each, that a local orchestrator tests the PRs and the user merges, the git guardrails, English persisted / Polish chat.
- `prompt` (per ticket):

```
/mattpocock-skills:implement <N>

Notes:
- Branch `feature/<N>-<slug>` from `develop` (start from latest `origin/develop`).
- Parallel sessions on the same spec: <#M (what it touches)>, … <EXPECT CONFLICTS in <module> with #M: keep changes strictly additive — add, don't rename or reshape existing exports.>
- Required checks before PR: `npx nx affected -t typecheck lint test --base=origin/develop`. <If rules / schema spec / `hasOnly` / indexes change: also `npm run rules:check`, `npm run test:rules`, `npm run test:emulator`.> <Ticket-specific: emulator spec / E2E project to run.> If JDK 21 is missing in the cloud, say so explicitly in the PR body and the report.
- Push and open a PR to `develop` with `Closes #<N>` and the section `## Manual test (for the local session, before merge)` per `.agents/AGENTS.md`. If `gh` auth fails, use GitHub MCP tools.
- Do NOT run the manual test; a local session does it.
- Reply to the user in Polish and end with a section "Report for the orchestrator" (PR number, branch, what was done, checks run and results, rules/indexes changed yes/no, known risks / conflicts with the parallel tickets).
```

Then one line: started, and you won't hear when they finish — the user pastes the reports or gives PR numbers.

## 3. After the start

This skill ends here. Cloud sessions never report back and cannot start a local one: the user starts the manual test of each ready PR in a local session (`manual-test` skill) and talks to the cloud sessions through PR comments.
