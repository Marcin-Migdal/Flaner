# Project Standards & Global Rules

This file defines the absolute technological foundations for the Flaner v2 project. These rules are always active and must not be broken.

## Technology Stack
1. **Framework:** React 19 + Vite 8 + TypeScript (~5.9). We write in Strict Mode.
2. **Styling:** TailwindCSS 4 (use Tailwind utility classes), Radix UI (for accessibility), and Lucide React (for icons). Use `clsx` for conditional class manipulation.
3. **Forms:** Always use `react-hook-form` integrated with `zod` validation.
4. **State Management & API:** For server communication and data caching, use exclusively **TanStack Query** (React Query). Local component state is handled via built-in React hooks. If global client-side state is strictly necessary, use React Context. The backend is Firebase.
5. **Routing:** We use React Router v8.
6. **Architecture:** Monorepo built on NX with Module Federation (MFE) enabled. Applications are divided into the host app (`core`), shared packages (`shared`, `ui-components`), and functional Micro-Frontends (`community`, `settings`, etc.).

## Translations (i18n)
- **Rule 0:** NEVER hardcode user-facing text (in JSX, alerts, toasts, etc.) directly in the code.
- We use `i18next` with the `useTranslation()` hook or custom hooks (e.g., `useCommunityTranslations()`).
- Always update the `*.json` locale files with the appropriate keys for each supported language after adding text.
- 🚨 **NO IN-CODE FALLBACKS ALLOWED:** Never define a default text using a logical operator in the hook call.
  - **BAD APPROACH:** `t("auth.login") || "Log in"`
  - **GOOD APPROACH:** `t("auth.login")` and ensuring the `locales` file contains this key.

## Tools and Scripts (NX)
- Linter Execution: To save time, run the linter dynamically **ONLY on modified projects (packages)**.
- For example, if you edited code in the `community` package, run:
  `npx nx run community:lint --fix`
- **Always run the linter for modified packages immediately after writing/changing code in them.** Ensure that any errors detected by ESLint are fixed immediately.
