---
name: unit-testing
description: Guidelines and architectural standards for writing unit and integration tests using Vitest, React Testing Library, and TanStack Query in Flaner v2. Make sure to use this skill whenever you are writing unit tests, testing hooks, testing forms or UI components, creating mock factories, or setting up test suites.
---

# Unit & Integration Testing Skill

This skill defines the official standards, patterns, and conventions for unit and integration testing across all packages in the Flaner v2 monorepo.

---

## 1. Core Stack & Philosophy

- **Test Runner:** **Vitest** (shares Vite's pipeline, ESM resolution, and TypeScript config).
- **DOM / Component Testing:** **React Testing Library (RTL)** with `@testing-library/user-event` and `@testing-library/jest-dom`.
- **Test Environment:** `jsdom`.
- **Test Philosophy:** Test user behavior and visible outcomes, NOT implementation details. A test should verify what the user sees, clicks, and inputs, as well as the side effects (API calls, route changes, UI updates).

---

## 2. File Organization & Colocation (Folder-per-Unit Standard)

- **Mandatory Folder-per-Unit Rule:** Every unit (component, page, hook, schema, util) that has a test file (`*.spec.ts` / `*.spec.tsx`) **MUST have its own dedicated folder** named after the unit.
- Never keep loose pairs of `MyUnit.tsx` and `MyUnit.spec.tsx` flat in a parent directory.
- The unit folder aggregates:
  1. Main implementation: `MyUnit.tsx` / `MyUnit.ts`
  2. Test specification: `MyUnit.spec.tsx` / `MyUnit.spec.ts`
  3. Styles (if applicable): `MyUnit.styles.ts`
  4. Barrel export: `index.ts` (re-exporting `MyUnit` to maintain seamless imports)
- Naming convention:
  - Pure TypeScript/functions/utils: `*.spec.ts` (e.g., `formatDate.spec.ts`)
  - React components / hooks: `*.spec.tsx` (e.g., `Button.spec.tsx`, `useGroupQuery.spec.tsx`)
- Example directory structure:
  ```
  packages/ui-components/src/components/Button/
  ├── Button.tsx
  ├── Button.styles.ts
  ├── Button.spec.tsx
  └── index.ts
  ```

---

## 3. Test Structure: The AAA Pattern

Every test case must clearly follow the **Arrange-Act-Assert** pattern:

```typescript
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { CreateGroupDialog } from "./CreateGroupDialog";

describe("CreateGroupDialog", () => {
  it("submits the form with valid group name", async () => {
    // 1. Arrange
    const user = userEvent.setup();
    const onSubmitMock = vi.fn();
    renderWithProviders(<CreateGroupDialog onSubmit={onSubmitMock} />);

    // 2. Act
    const input = screen.getByRole("textbox", { name: /group name/i });
    await user.type(input, "Planowicze");
    
    const submitBtn = screen.getByRole("button", { name: /create/i });
    await user.click(submitBtn);

    // 3. Assert
    expect(onSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Planowicze" })
    );
  });
});
```

---

## 4. Query & Selector Priorities (Accessibility First)

Always prefer accessible queries that mirror how real users or screen readers interact with the UI:

1. **`getByRole`** (Primary choice):
   - `screen.getByRole("button", { name: /save/i })`
   - `screen.getByRole("heading", { level: 2, name: /members/i })`
   - `screen.getByRole("textbox", { name: /email/i })`
2. **`getByLabelText`**:
   - For form inputs connected with `<label>` tags: `screen.getByLabelText(/password/i)`
3. **`getByPlaceholderText`**:
   - Only when a visible label is deliberately absent: `screen.getByPlaceholderText(/search groups/i)`
4. **`getByText`**:
   - For static non-interactive text: `screen.getByText(/no items found/i)`
5. 🚨 **`getByTestId` (LAST RESORT ONLY):**
   - Strictly forbidden for elements that have a semantic role or visible text. Only permissible for complex SVG canvases or invisible tracking wrappers.

---

## 5. User Interaction Rules

- **Always use `@testing-library/user-event`**:
  ```typescript
  const user = userEvent.setup();
  await user.click(button);
  await user.type(input, "Hello");
  ```
- 🚨 **Avoid `fireEvent`**: `fireEvent` dispatches raw synthetic DOM events and ignores real browser mechanics like focus, hover, keydown sequence, and element disablement.

---

## 6. Data Mocking Strategy: `@flaner/test-utils`

### A. Mocking Firebase / Database Layer
- **Rule 0:** NEVER try to mock Firestore's internal WebChannel/protobuf transport or use `msw` for Firestore client SDK calls.
- In Flaner v2, all database queries are isolated in `src/api/<domain>/endpoints.ts`.
- **In Unit & Component Integration tests, mock the typed functions in `endpoints.ts`**:
  ```typescript
  import * as groupsApi from "@/api/groups/endpoints";
  import { createMockGroup } from "@flaner/test-utils";

  vi.spyOn(groupsApi, "fetchGroups").mockResolvedValue([
    createMockGroup({ id: "group-1", name: "Alpha Team" }),
  ]);
  ```

### B. Typed Mock Factories (Zero `as any`)
- Always use typed factory functions from `@flaner/test-utils` (or domain-specific test helpers):
  ```typescript
  // In @flaner/test-utils:
  export const createMockUser = (overrides?: Partial<UserProfile>): UserProfile => ({
    uid: "test-user-123",
    email: "tester@flaner.app",
    displayName: "Test User",
    photoURL: "https://flaner.app/avatar.png",
    createdAt: 1700000000000,
    ...overrides,
  });
  ```
- 🚨 **Strictly Forbidden:** Never use type casting shortcuts like `const user = { name: "Bob" } as any;`.

---

## 7. Context & Wrappers: `renderWithProviders`

When testing components that rely on TanStack Query, routing, or translations, wrap the render with `renderWithProviders`:

```typescript
import { renderWithProviders } from "@flaner/test-utils";

renderWithProviders(<MyComponent />, {
  // Optional route path:
  initialRoute: "/groups/123",
  // Optional pre-configured QueryClient or overrides
});
```

The standard `renderWithProviders` must ensure:
1. `QueryClient`: configured with `queries: { retry: false, gcTime: 0 }` so failures fail immediately and cache is not leaked between tests.
2. `MemoryRouter`: provides isolated URL state.
3. `I18nextProvider`: initialized with mock or real locale keys, preventing `react-i18next` missing translation warnings in tests.

---

## 8. Anti-Patterns & Strict Prohibitions

1. ❌ **No `as any` or `as unknown`** in test files or mock data.
2. ❌ **No testing internal state**: Avoid checking `wrapper.state()` or verifying private hook variables; assert on the rendered DOM output or callbacks.
3. ❌ **No arbitrary timers or `sleep()`**: Use `waitFor(() => expect(...))` from RTL for asserting asynchronous state changes.
4. ❌ **No shared mutable state**: Re-initialize test data in `beforeEach()` and ensure `vi.clearAllMocks()` runs between tests.

---

## 9. Monorepo TSConfig & IDE Custom Matchers Setup

When working across multiple packages and MFEs in the monorepo, follow these TypeScript configuration rules:

1. **Include `../../vitest.setup.ts` in every package `tsconfig.json`:**
   ```json
   "include": ["src", "../../vitest.setup.ts"]
   ```
   *Why:* Jest-DOM type augmentations (like `toBeInTheDocument`) are declared in `vitest.setup.ts`. If this file is outside the package's `include`, the language server will produce `Property 'toBeInTheDocument' does not exist on type 'Assertion<HTMLElement>' (ts 2339)`.

2. **TypeScript `types` Array Does NOT Merge Across `extends`:**
   If a package defines `compilerOptions.types`, it replaces the array in `tsconfig.base.json`. Always ensure `"@testing-library/jest-dom/vitest"` is present in any explicit `types` list.

3. **No `references` to non-composite configs:**
   Never add `"references": [{ "path": "./tsconfig.lib.json" }]` to `tsconfig.spec.json` unless the target config has `"composite": true`. Vitest and Vite do direct source resolution, making project references unnecessary and prone to `TS6306` errors.

---

## 10. Performance, Vitest Pool & Troubleshooting (`JavaScript heap out of memory`)

### A. Pool Configuration (`pool: 'threads'` & `node` environment)
- **Fast Execution on Windows:** In `vitest.base.ts`, Vitest is configured with `pool: 'threads'` to utilize Node worker threads instead of process forking (`forks`). This eliminates process creation and NTFS file-locking overhead on Windows, reducing test duration by ~40%.
- **Lightweight Environments:** All schemas (`**/schemas/**`) and pure utility modules (`packages/*/src/utils/**` except `cropImage` which needs canvas) run under `environment: 'node'` via `environmentMatchGlobs` in `vitest.base.ts`. Pure logic does not instantiate JSDOM, booting in 0-2 ms instead of 150-200 ms.

### B. Troubleshooting: `JavaScript heap out of memory` (OOM)
If test suites grow into thousands of tests and Node throws an Out-Of-Memory error:
`FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`

Follow these immediate remediation steps:
1. **Fallback to Process Isolation (`pool: 'forks'`):**
   In `vitest.base.ts`, switch `pool: 'threads'` to `pool: 'forks'`. In `forks` mode, each test worker runs in an independent operating system process whose memory is 100% reclaimed by the OS immediately upon completion.
2. **Increase V8 Heap Size:**
   Run tests with expanded heap allocation:
   `NODE_OPTIONS="--max-old-space-size=4096" npm test`
3. **Limit Max Concurrency:**
   Limit simultaneous worker threads in `vitest.base.ts` by setting `maxWorkers: 8` or via CLI:
   `npm test -- --maxWorkers=8`


