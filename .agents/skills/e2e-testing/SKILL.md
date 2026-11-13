---
name: e2e-testing
description: Guidelines and architectural standards for writing end-to-end (E2E) tests using Playwright in Flaner v2. Make sure to use this skill whenever you are writing E2E tests, automating user flows across Micro-Frontends, implementing Page Object Models (POM), testing mobile render stability, or configuring Playwright suites.
---

# E2E Testing Skill (Playwright)

This skill defines the official standards, architecture, and best practices for End-to-End (E2E) testing with Playwright in the Flaner v2 monorepo.

---

## 1. Architecture & Directory Layout

All E2E tests, configuration, and test utilities live strictly in the root `e2e/` directory (keeping `packages/*` clean and unpolluted):

```
e2e/
├── playwright.config.ts    # Projects per domain, emulators + dev servers as webServer
├── support/
│   ├── helpers/            # auth.ts (sign-in), emulator.ts (typed seeds / reads), viewport.ts
│   └── pages/              # Page objects (`*.page.ts`)
├── core/ community/ settings/ planning/ shopping/ tools/   # Specs per domain (= Playwright project)
├── mobile/                 # Dedicated mobile render stability & viewport tests
├── screens/                # Reference screenshots for the design system (`npm run design:screens`)
├── tsconfig.json           # `npx nx run e2e:typecheck` (Playwright itself strips types)
└── project.json            # Nx project: e2e, e2e:<project>, typecheck, lint
```

---

## 1a. Backend: Firebase Emulators Only (MANDATORY)

E2E never touches a real Firebase project. `e2e/playwright.config.ts` starts the Auth + Firestore emulators (`demo-flaner` project, rules loaded from `firestore.rules`) and `npm run dev` with `VITE_USE_EMULATORS=true`, which makes `packages/shared/src/firebase/firebase.ts` connect to `127.0.0.1:9099` / `127.0.0.1:8080`.

- **Requires JDK 21** on `JAVA_HOME` (emulators run on Java).
- Servers are **never reused**: stop any local `npm run dev` (it points at production) before `npm run e2e`.
- **No auth mocks.** Users are real emulator accounts:
  - `signInAsNewUser(page, overrides?)` (`e2e/support/helpers/auth.ts`) — creates a unique user and signs in through the real email/password form.
  - `createUser()` + `signIn(page, user)` — when a test needs several users (open each in its own `browser.newContext()`).
- **Seed, don't click, the preconditions.** `e2e/support/helpers/emulator.ts` writes docs with emulator admin access (bypasses rules). Drive through the UI only the flow under test.
  - One typed helper per collection: `createUser`, `seedProfile`, `seedFriendship`, `seedNotification`, `seedGroup`, `seedGroupMember`, `seedGroupInvitation`, `seedEvent`, `seedSplitGroup`, `seedTemplate`, `seedSpool`, `seedLookupMaterial`. Each builds the app's own document type from `packages/*/src/api/**/types.ts` (kept equal to the rules' Schema tables by `scripts/firestore-schema-check.mjs`), so a schema change fails `e2e:typecheck`. A new collection gets a new helper; the raw `seedDocument` stays private.
  - Reads: `readDocument(path)` returns the fields as plain values (`undefined` when the doc does not exist), `listDocumentIds(collection)` the ids. Assert with a typed partial, never on the REST JSON:
    ```typescript
    await expect.poll(() => readDocument(`events/${event.id}`))
      .toMatchObject({ finalizedSlotKey: key } satisfies Partial<SchedulerEvent>);
    ```
  - `uniqueId(prefix)` for ids / names that must not collide between parallel tests.
- **Isolation:** tests run in parallel against one emulator — always use unique users/groups (the helpers generate unique ids); never wipe the whole database mid-run.
- Multi-user flows (invitations, join requests, roles) belong in E2E — they are what exercises UI + code + security rules together (see `e2e/community/group-membership.spec.ts`).

---

## 2. Page Object Model (POM) Standard

Every view or MFE module tested in E2E must have a corresponding Page Object Model in `e2e/support/pages/` or alongside the domain specs.

### POM Rules:
1. **Specs talk in intents only**: no `page.locator` / `page.getBy*` / `page.keyboard` in spec files — every element and action lives in a page object (`e2e/support/pages/`). Specs may still navigate (`page.goto`) and assert on the URL. A flow used by two specs (e.g. the group invitations sheet) gets its own page object.
2. **Expose User Actions**: Provide semantic helper methods that mirror real user actions (e.g., `createGroup()`, `inviteUser()`, `markRemainingAsNo()`); expose locators only for what specs assert on.
3. **Semantic Locators**: Use accessible locators (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`), scoped to a landmark / dialog where a name repeats (`page.getByRole("main")`, `page.getByRole("dialog")`). `getByTestId` only where nothing has a role (the shopping placeholder). Check names with `await page.locator("body").ariaSnapshot()`.
4. **Wait on content, not on spinners**: `goto()` waits for the view's heading or main control, not for `Loading...` to disappear.

### Example POM:
```typescript
import { type Page, type Locator, expect } from "@playwright/test";

export class GroupsPage {
  readonly page: Page;
  readonly createGroupButton: Locator;
  readonly nameInput: Locator;
  readonly submitButton: Locator;
  readonly groupList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createGroupButton = page.getByRole("button", { name: /create group/i });
    this.nameInput = page.getByRole("textbox", { name: /group name/i });
    this.submitButton = page.getByRole("button", { name: /confirm/i });
    this.groupList = page.getByRole("list", { name: /groups/i });
  }

  async goto() {
    await this.page.goto("/community/groups");
  }

  async createNewGroup(name: string) {
    await this.createGroupButton.click();
    await this.nameInput.fill(name);
    await this.submitButton.click();
  }

  async expectGroupInList(name: string) {
    await expect(this.groupList.getByText(name)).toBeVisible();
  }
}
```

---

## 3. Testing Paths per View: Modular Scenarios

Do NOT write a single brittle 50-step mega-test that fails at step 2 and skips the rest. Break each view into focused, modular scenarios:

1. **Happy Path (Primary Flow)**:
   - Full canonical lifecycle (e.g., Navigate -> Create Item -> See on list -> Open Details -> Edit -> Delete).
2. **Validation & Errors**:
   - Submitting empty inputs, invalid formats (email, numbers), asserting that form errors are displayed and submission is blocked.
3. **Role Guards & Permissions**:
   - Verifying that restricted actions (e.g., Delete Group, Change Permissions) are hidden or disabled for non-owner accounts.
4. **Empty States**:
   - Verifying the empty state banner, informative text, and call-to-action button when no items exist.

---

## 4. Mobile Render Stability Testing (MANDATORY)

Every view must be verified on mobile viewports (`Pixel 7`, `iPhone 14`) for visual stability and responsive layout integrity.

### Mobile Stability Checklist:
1. **No Horizontal Overflow (Zero Horizontal Scroll):**
   - Assert that `scrollWidth <= innerWidth`:
     ```typescript
     const isOverflowing = await page.evaluate(() => {
       return document.documentElement.scrollWidth > window.innerWidth;
     });
     expect(isOverflowing).toBe(false);
     ```
2. **Mobile Navigation & Header:**
   - Verify that the bottom navigation bar / hamburger drawer renders correctly.
   - Verify header titles do not truncate awkwardly or overlap action icons.
3. **Touch Targets (a11y):**
   - Interactive elements (buttons, inputs, bottom navigation icons) must be at least 44x44px and comfortably tappable.
4. **Drawers & Modals on Mobile:**
   - Drawers/dialogs must stay within the viewport and allow dismiss by gesture or close button without trapping the user.

---

## 5. Locators Best Practices

- ✅ **Prefer Semantic Locators:**
  - `page.getByRole("button", { name: "Submit" })`
  - `page.getByLabel("Email Address")`
  - `page.getByRole("heading", { level: 1 })`
- ❌ **Avoid Brittle CSS / XPath** (in page objects too):
  - Never use: `page.locator(".flex > div:nth-child(2) > button")` or `page.locator("//div[3]/span")`.
  - Never rely on Tailwind utility class names (`page.locator(".bg-blue-500")`) as they can change during styling refactors.
  - Never rely on ui-components internals: `data-slot`, `data-sidebar`, `data-sonner-toast`, `data-state` (assert `aria-selected` / `aria-expanded` instead), lucide icon classes.

---

## 6. Selective Execution & CI (GitHub Actions)

CI lives in `.github/workflows/ci.yml` (runs on PRs to `develop` / `master`). The `E2E plan` job runs `scripts/e2e-affected.mjs <PR base sha>`, which combines `nx show projects --affected` with `git diff` to pick Playwright projects (defined per domain in `e2e/playwright.config.ts`):

- `core`, `shared`, `ui-components`, `test-utils` affected, or a change in `e2e/support`, e2e config, root config, lockfile or `.github/` → **full suite**.
- One MFE affected → that MFE's project + `core` + `mobile`.
- Change in `e2e/<project>/` → that project.
- Only `.agents/**` / `*.md` → E2E skipped.

Each selected project gets its own runner (`E2E (<project>)` matrix job: emulators + dev servers + `--project=<project>`, `setup` runs as a dependency), so the wall time is the slowest project (`community`), not the sum. On failure that project uploads `playwright-report-<project>`. The required check is the summary job **E2E (affected)**, because the matrix jobs exist only for affected projects. When adding a new MFE / Playwright project, update `MFES`, `ALL_PROJECTS` and the `e2e/<project>` regex in `scripts/e2e-affected.mjs`.

`e2e` also has `typecheck` and `lint` targets, run by the "Typecheck, lint" job (`nx affected`; `e2e` is affected by every MFE through `implicitDependencies`), so a seed that no longer matches a document type fails CI before any browser starts.

Locally, single projects: `npx nx run e2e:e2e:<project>` or `npx playwright test --config=e2e/playwright.config.ts --project=<project>`.
