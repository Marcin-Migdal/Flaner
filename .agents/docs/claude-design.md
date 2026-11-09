# Claude Design for Flaner — research & setup

Issue: #62. Status: **pilot under review** — tokens, brand book, cover, logo, live components (from Storybook) and reference screens synced; pilot design of Friends: https://claude.ai/artifact/Ssoj85MptreneBK9PVeVUQ How to use it day to day: `flaner-design` skill.

## 1. What Claude offers (checked 2026-11-08)

| Option | What it is | Decision |
|---|---|---|
| **Design System artifact type** (claude.ai) | A private artifact holding `project/README.md` (brand book every agent reads first), `tokens.json` (colours per theme, type, spacing, radius, shadows, extra families), `fonts/`, `assets/<Group>/` (uploads), optional `components/bundle.js` + `bundle.css` + per-component `preview.html` / `README.md`, and a cover. Design and Slides artifacts pick a design system and build with it. Claude Code creates and updates it with the `Artifact` tool. | **Use.** Our design system: https://claude.ai/artifact/MFJQyjzKsoUq3oDSsU5Wxx |
| **Design artifact type** (claude.ai) | Canvas with artboards (screens, mockups) built against a chosen design system. Claude Code can create it (`Artifact` quickstart `intent: "design"`) and read it back to implement. | **Use** for every new view (`create-functionality` Stage 4b). |
| `DesignSync` tool + `/design-sync` skill (Claude Code) | Incremental upload of a local component library into a **standalone claude.ai/design** design-system project. | **Skip.** Standalone claude.ai/design closes on 2026-12-14 ("Claude Design now lives in Claude"); the tool refuses projects that moved. `/design-sync` is not available in our sessions. |
| Standalone claude.ai/design | Old home of Claude Design. | **Skip** — closing. |
| CI auto-publish | A pipeline republishing the artifact on every merge. | **Skip.** Publishing needs a signed-in Claude session (`Artifact` tool); no API token flow. Re-sync is one command plus one request to Claude Code (skill §4). |
| Hand-written token copy | Retyping values into the artifact page. | **Skip.** Drifts; `tokens.json` is generated from `theme.css`. |

## 2. What Claude Design reads

1. `README.md` — the brand book. Imperative rules that name tokens and components. Ours: `.agents/skills/flaner-design/design-system/brand-book.md` (one source for Claude Design and Claude Code).
2. `tokens.json` — list-shaped tokens with a `usage` note each (the page shows them; designs use them as CSS variables via the generated `tokens.css`). Values must be literal: `var()` / `color-mix()` are dropped, so the export resolves them per theme (`color-mix(in oklch, X N%, transparent)` → X with N% alpha).
3. Fonts (real files), logo (upload), cover.
4. Components: live previews need ONE classic IIFE bundle on `window.<Namespace>` plus React. The type ships React 18; `@flaner/ui-components` needs React 19, which has no UMD build → the export wraps React 19 into `components/lib/react.js` / `react-dom.js` (CommonJS `require("react")` inside packages is pointed at `window.React` by an alias shim). Props come from `components/index.d.ts` (tsc declarations, CVA variants expanded).
6. **A Design canvas supplies React 18** and tells its agent to skip the system's own React files. The bundle therefore never ships React: `react` / `react-dom` resolve to `window.React` / `window.ReactDOM`, and JSX goes through a `jsx-runtime` shim over `window.React.createElement`, so elements belong to whichever React hosts them (18 on a canvas, 19 in the system's previews). Every card was checked on React 18.3.1 too.
7. The page writes the README's "Consuming this system" section only when someone saves, which never happens for a code-synced system — so the export appends it: namespace, what to load on a canvas, `x-import` usage, `Flaner.Icon`, dark artboards (`class="dark"` wrapper), node props from `renderVals()`.
5. Screenshots of real views (`assets/Screens/`) help it match the app's density and rhythm; code wins over screenshots when they disagree.

## 3. Our pipeline

```
theme.css ─┐
brand-book.md, cover.html ─┼─ npm run design:export ─→ .design-system/project/ ─→ Claude Code (Artifact publish) ─→ "Flaner" Design System
@fontsource-variable/geist, flaner-icon.svg ─┘
```

- `scripts/design-system-export.mjs` (+ `scripts/design-system-export.test.mjs`, run in CI). It fails when a colour token has no usage note, when a story's component has no brand-book entry, or when a preview errors / renders blank (Playwright, both themes).
- Components: `packages/ui-components/.storybook/design-system.tsx` is the bundle entry — the library plus every story composed with `composeStories`; `renderStories(el, name)` draws one card. One card per `*.stories.tsx` (Foundations skipped: the page shows tokens itself).
- The artifact's index has `"editing": "code"`: its page is read-only, every change goes through the repo. Re-sync procedure: `flaner-design` skill §4.
- Mapping of Tailwind / theme names: colour tokens drop the `--color-` prefix (`bg-surface-subtle` → `surface-subtle`); `text-*`, `radius-*`, `shadow-*`, `breakpoint-*`, `space-N` (= Tailwind `p-N`) keep the Tailwind name, so a design's token names translate 1:1 into utilities.

## 4. Limits

- Light theme first (the page inherits a missing theme value from the first one).
- Motion tokens are not a family in the artifact; durations and easing live in the brand book.
- Tailwind defaults the theme does not redefine (`text-xs…3xl`, `sm/md/lg` breakpoints, `radius-xs`, `radius-full`, spacing) are listed in the export script — keep them in step with Tailwind upgrades.
- Previews run on the artifact's origin: only pinned CDN scripts and the system's own files load.
- The artifact is private; share it from its page (Share menu) if someone else designs with it.

## 5. Gotchas found while building it

- Type styles must not be named like Tailwind utilities (`text-sm`): `tokens.css` is unlayered and beats `@layer utilities`, so `.text-3xl { font-weight: 400 }` silently cancelled `font-black`. They are `type-<size>`.
- The upload refuses files containing U+FFFD; minified `CSS.escape` / entity decoders contain it literally → the export escapes it (`\uFFFD`), together with `</script` and `<!--`.
- `.d.ts` is not a served extension: publish with `contentType: "text/plain"`.
- Composed stories in a flex column stretch inline components; each story is wrapped in a block `div`, as in Storybook's canvas.

## 6. Reference screens

`npm run design:screens` (`e2e/playwright.screens.config.ts`, specs in `e2e/screens/*.screens.ts`) starts the emulators and dev servers like E2E, seeds data with the E2E helpers and saves `<view>-<theme>-<mobile|desktop>.png` (390×844, 1440×900) to `.design-system/screens/`. The next `npm run design:export` copies them to `assets/Screens/`; upload them as assets when re-syncing. Not part of `npm run e2e` or CI. Add a spec per view worth showing to Claude Design.

## 7. Pilot (Friends)

Brief written with the `flaner-design` template, design built on a Design canvas with the Flaner system installed and real components mounted (`PageHeader`, `Tabs`, `IconTextField`, `Card` + `ListItem`, `Avatar`, `Button`, `Badge`, `EmptyState`, `Flaner.Icon`): phone light / dark / empty, desktop light / dark with the app shell. Compare with `assets/Screens/friends-*` (the running app).

Findings, both fixed in #62:
- The brand book promised avatar initials on the brand gradient, but `Avatar`'s fallback was neutral and 7 places in the app added the gradient by hand → `Avatar variant="brand"` (styles the fallback through its slot), adopted everywhere (community, `Profile`).
- The app listed friends as hand-made row cards in a 2-column grid, with a hand-made empty state and a spinner → Friends now uses the patterns: `ListItem` rows in a subtle `Card`, `EmptyState`, `Skeleton` rows, a busy `Button` while removing.

## 8. Changelog
- 2026-11-08 — research; Design System artifact created; export of tokens, brand book, fonts, logo, cover; `flaner-design` skill; `create-functionality` brief + design → code steps.
- 2026-11-09 — components from Storybook: live bundle, 37 cards (preview + guideline + props), render check; type styles renamed `type-*`; React 18 compatibility (jsx-runtime shim), `Flaner.Icon`, generated "Consuming" section; reference screens (`design:screens`); pilot design of Friends.
