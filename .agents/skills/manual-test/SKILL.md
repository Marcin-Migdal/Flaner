---
name: manual-test
description: Run the pre-merge manual test of one or more Flaner PRs in the built-in browser and report the result on each PR. Use whenever the user asks to test a PR or an issue by hand — "testuj PR 200", "testuj manualnie <PR link>", "możesz testować 172", "sprawdź DEV dla #194", "poprawione, przetestuj jeszcze raz", "testuj #198 i #199" — or pastes a PR link to check before merge, even if they don't say "manual test". Local sessions only.
---

# Manual test of a PR

The implementing session (usually a cloud one) writes `## Manual test (for the local session, before merge)` in its PR body and stops. This skill is the local half: run those steps in the built-in browser, check what the ticket asks for, and post the result on the PR so the implementing session can fix it there. You test and report; you never fix the PR's code — the comment is the hand-off.

Cloud session (no browser pane)? Stop and say the test must run locally.

Reply to the user in Polish; PR comments, issues and anything persisted stay in English.

## 0. Pick the mode

From the user's words:

| Mode | Trigger | Scope |
|---|---|---|
| **full** | first test of a PR | PR steps + uncovered ticket ACs |
| **retest** | "poprawione", "wleciały poprawki" | only the points from the last result comment + what the fix diff touches |
| **dev** | rules / indexes / spec docs changed, or a new / changed Firestore query | full or retest, then the DEV part (§2b) |
| **batch** | more than one PR or issue given | §5 |
| **lean** | "mało tokenów", "oszczędnie" | combine with any mode: no screenshots, one read per step, terse comment |

Retest trusts the user: they say it is fixed, you check it — don't go looking for whether the fix has landed.

## 1. Read

- Issue number instead of a PR? `gh pr list --state open --search "Closes #N" --json number,headRefName`. No PR → tell the user it doesn't exist yet.
- `gh pr view N --json title,headRefName,headRefOid,body,files,mergeable` → the Manual test section, the changed files.
- `gh pr checks N` → red typecheck / build / unit: say so before testing (the fix may change what you'd test), then test anyway unless the user says wait.
- The ticket(s) from `Closes #N` (`gh issue view`): compare their acceptance criteria / spec stories with the PR steps and add the uncovered ones to the run as cheap checks. A requirement the PR steps skipped once turned out to be a real bug (PR #200) — this is why.
- Changed `firestore.rules`, `firestore.indexes.json`, `.agents/skills/firestore-rules-manager/docs/*`, or a new query in `api/` → **dev** mode is needed.
- Retest: the last `## Manual test result` comment on the PR and `git diff <tested-sha>..HEAD --stat`.

## 2. Prepare

- Note the current branch (you go back to it at the end). Uncommitted changes → stop and ask.
- `git fetch -q origin <head> && git switch <head>` (create it tracking origin if missing); retest: `git pull -q --ff-only`. `package-lock.json` changed → `npm install`.
- PR touches only `packages/ui-components` → test the stories: `preview_start {name: "storybook"}`, skip the rest of this section. Also check the PR body names the Design System artifact version (AGENTS.md → DESIGN SYSTEM ARTIFACT).

### 2a. Emulators (default)

- `preview_start {name: "dev-emulators"}` (reuse it if already running; HMR picks up the branch switch).
- Fresh account every run — `.emulator-data/` keeps old data that would skew the result:
  `npx --no-install tsx .agents/skills/manual-test/scripts/seed-user.mts manual-<pr> [en|pl]` → prints email + password (test values, not secrets).
- Other data (friendships, groups, budget docs…): seed it through the emulator, not the UI — the `seed*` helpers in `e2e/support/helpers/emulator.ts`, or REST with `Authorization: Bearer owner` on `http://127.0.0.1:8080/v1/projects/demo-flaner/databases/(default)/documents/...`. Clicking data together through the UI is the most expensive way to get it.
- Sign in at `http://localhost:4200/login` with the seeded account.

### 2b. DEV

The emulators don't enforce composite indexes, so rules / index / query changes are only proven on DEV.

- `gh workflow run deploy-firestore.yml --ref <branch>`, then `gh run watch <id> --exit-status` in the background. A new index can take a few minutes to build after the run succeeds.
- Meanwhile `preview_start {name: "dev"}` (local `.env` → `flaner-v2-dev`).
- Ask the user to sign in in the browser pane and wait for "Zalogowany". Never type a password. Every DEV account is a test account — no cleanup needed (`npm run dev:wipe` exists for that).
- Retest: re-run the deploy only if the fix diff touches rules / indexes / spec docs.

## 3. Run

- **Scope by risk**: the paths the change touches, one representative write per area, the spots the PR calls fragile or fixed. Long PR section → pick a subset and say which steps you skipped and why. No "repeat N times", no tour of the app.
- **Read, don't look**: read state as text (`javascript_tool`, `get_page_text`, `find`) and click by text or ref. Screenshot only when the layout itself is what's being tested (mobile overflow, truncation), at `scale: 0.6`.
- **Page helpers**: paste this once per page load (in-app navigation keeps it; `navigate` resets it) instead of re-defining waits in every call. Poll for the state you need — fixed 10 s sleeps burn time and tokens.

  ```js
  window.mt = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    async until(fn, ms = 10000) { const t = Date.now(); for (;;) { const v = fn(); if (v) return v; if (Date.now() - t > ms) throw new Error("timeout"); await mt.sleep(200); } },
    text: (sel = "main") => document.querySelector(sel)?.innerText ?? "",
    waitText: (s, sel) => mt.until(() => mt.text(sel).includes(s)),
    el: (s, sel = "button,a,[role=tab],[role=menuitem],[role=option]") => [...document.querySelectorAll(sel)].find((e) => e.offsetParent && (e.innerText.trim() === s || e.getAttribute("aria-label") === s)),
    click: async (s, sel) => (await mt.until(() => mt.el(s, sel))).click(),
    go: (p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); },
  };
  ```
- **File upload** (the pane has no file chooser): build a `File` from the fixture's text in `javascript_tool` and set it on the `<input type=file>` through a `DataTransfer`, then dispatch `change`. Say in the comment that you did this.
- **Mobile**: `resize_window` 390×844 (+ `colorScheme: "dark"` when relevant), check `document.documentElement.scrollWidth <= 390`; reset to `preset: "desktop"` afterwards.
- **i18n**: switch the language once and search the visible text for raw keys (`/\b[a-z]+:[a-zA-Z.]+\b/`) and leftover English — that's how the hardcoded "Toggle Sidebar" was found.
- **Console**: one `read_console_messages {onlyErrors: true}` at the end.
- Per step record ✅ / ⚠️ / ❌ with the observed value ("shows −PLN 600.00"), not "works".
- **Spec deviation that looks intentional** (the PR step describes it, but the spec says otherwise): don't file it as a bug. Ask the user, quoting spec point vs. PR behaviour, and write their decision into the comment.

## 4. Report

### Where bugs go

| Bug | Goes to |
|---|---|
| Caused by this PR / the issue it implements | this PR's comment — the implementing session fixes it here |
| Not caused by this PR, small and cheap to fix | this PR's comment too — fixed in passing |
| Not caused by this PR **and** large | a separate issue (`.github/ISSUE_TEMPLATE/task.yml`, full context) — propose it, create once the user agrees |

To tell "caused by this PR" apart, check the same spot on `develop` (`git grep <x> origin/develop`, or one read after `git switch develop`).

### PR comment

`gh pr comment N --body-file <scratchpad file>`:

```markdown
## Manual test result — <passed | passed, fixes needed | failed | decision needed>

<Where: emulators / DEV (Deploy Firestore run <link>), branch at `<short sha>`, account (fresh emulator user, EN UI).>

1. <step> → <observed>. ✅
2. <step> → <observed>. ⚠️ see below
…

**Fixes needed (this PR):**
1. <what happens, where (file:line if known), how to reproduce, suggested fix>

**Decision:** <spec point vs. behaviour, the user's call>

**Not checked:** <what and why>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Retest comment: `## Retest result — …`, only the re-checked points. Fixes found while the user already decided something → a short follow-up comment, not an edit of the old one.

### Chat (Polish, short)

Verdict per PR — **gotowe do merge** / **poprawki w PR** / **do decyzji** — then what fails in one line each, and the comment link. When fixes are needed: "napisz sesji implementującej, że ma komentarz w PR".

## 5. Batch (several PRs)

Batch pays off when the PRs share views or flows: setup (server, seed, deploy, DEV sign-in) runs once, shared flows run once, and you also catch how the PRs behave together before they all land on `develop`.

1. **Decide**: compare `files` of the PRs. Little overlap → test them one after another on the same running server and account instead, and say so in one line.
2. **Merge**: `git switch -c test/batch-<n1>-<n2>… origin/develop`, then `git merge --no-edit origin/<head>` for each. Conflicts:
   - `firestore.rules` → never by hand: merge the spec docs in `.agents/skills/firestore-rules-manager/docs/`, then `npm run rules:build`.
   - large or costly → stop and tell the user batching doesn't pay off here; fall back to one by one.
3. **DEV** (if any PR needs it): `git push -u origin test/batch-…`, run *Deploy Firestore* on that ref (§2b).
4. **Plan**: merge the PRs' steps + uncovered ACs into one plan that runs every shared flow once. Tag each step with its PR(s). No ~8-step cap here — the goal is no flow twice, not a short list. Show the plan to the user in a few lines, then run it.
5. **Attribute**: a failing step whose cause is unclear → check that one point on the single PR branch. A bug that only appears when PRs are combined → note it in each involved PR's comment.
6. **Report**: one comment per PR, only its own steps and bugs (the implementing session reads only its PR). Mention "tested together with #x, #y on a merged branch".
7. **Retest**: fixes land on the PR branches → `git merge` them into the existing batch branch again, check only the fixed points.
8. **Clean up** — always, also when the batch was abandoned: `git push origin --delete test/batch-…` (if pushed) and `git branch -D test/batch-…`.

## 6. Clean up

- Viewport back to desktop.
- `git switch <branch you started on>`; delete the local PR branches you created for the test (`git branch -D`), never anything you didn't create.
- Leave the dev server running — the next PR reuses it.
