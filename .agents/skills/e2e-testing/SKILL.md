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
├── config/                 # Base playwright.config.ts, project definitions
├── support/                # Shared fixtures, global setup, auth state, POM base classes
├── core/                   # Host app shell, top-level navigation, and authentication flows
├── community/              # Community MFE user journeys (Groups, members, posts)
├── settings/               # Settings MFE user journeys (Profile, preferences, theme)
├── mobile/                 # Dedicated mobile render stability & viewport tests
└── project.json            # Nx project definition connecting E2E to monorepo targets
```

---

## 2. Page Object Model (POM) Standard

Every view or MFE module tested in E2E must have a corresponding Page Object Model in `e2e/support/pages/` or alongside the domain specs.

### POM Rules:
1. **Encapsulate Locators**: Do not scatter `page.locator(...)` calls inside test files.
2. **Expose User Actions**: Provide semantic helper methods that mirror real user actions (e.g., `createGroup()`, `openSettings()`, `fillProfileForm()`).
3. **Semantic Locators**: Use accessible locators (`page.getByRole`, `page.getByLabel`, `page.getByPlaceholder`).

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
- ❌ **Avoid Brittle CSS / XPath:**
  - Never use: `page.locator(".flex > div:nth-child(2) > button")` or `page.locator("//div[3]/span")`.
  - Never rely on Tailwind utility class names (`page.locator(".bg-blue-500")`) as they can change during styling refactors.

---

## 6. Selective Execution & CI Integration (Nx Affected)

To keep CI execution fast:
1. **Projects Configuration in `playwright.config.ts`**:
   Projects are defined per domain (`core`, `community`, `settings`, `mobile`):
   ```typescript
   projects: [
     { name: "core", testDir: "./e2e/core" },
     { name: "community", testDir: "./e2e/community" },
     { name: "settings", testDir: "./e2e/settings" },
     { name: "mobile", testDir: "./e2e/mobile" },
   ]
   ```
2. **Targeted Execution in GitHub Actions:**
   - Run tests for an impacted MFE: `npx playwright test --project=community`
   - Run mobile tests: `npx playwright test --project=mobile`
   - Run all E2E tests: `npx playwright test`
