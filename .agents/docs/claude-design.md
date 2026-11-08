# Claude Design for Flaner — research & setup

Issue: #62. Status: **in progress** — tokens, brand book, cover and logo synced; components and view screenshots follow once Storybook lands. How to use it day to day: `flaner-design` skill.

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
4. Components: live previews need ONE classic IIFE bundle on `window.<Namespace>` plus React. The type ships React 18; `@flaner/ui-components` needs React 19, which has no UMD build → React 19 must be bundled into `components/lib/`. Without a bundle, Claude Design draws components from the README table and the tokens.
5. Screenshots of real views (`assets/Screens/`) help it match the app's density and rhythm; code wins over screenshots when they disagree.

## 3. Our pipeline

```
theme.css ─┐
brand-book.md, cover.html ─┼─ npm run design:export ─→ .design-system/project/ ─→ Claude Code (Artifact publish) ─→ "Flaner" Design System
@fontsource-variable/geist, flaner-icon.png ─┘
```

- `scripts/design-system-export.mjs` (+ `scripts/design-system-export.test.mjs`, run in CI). It fails when a colour token has no usage note, so a new token in `theme.css` forces a note in the script.
- The artifact's index has `"editing": "code"`: its page is read-only, every change goes through the repo. Re-sync procedure: `flaner-design` skill §4.
- Mapping of Tailwind / theme names: colour tokens drop the `--color-` prefix (`bg-surface-subtle` → `surface-subtle`); `text-*`, `radius-*`, `shadow-*`, `breakpoint-*`, `space-N` (= Tailwind `p-N`) keep the Tailwind name, so a design's token names translate 1:1 into utilities.

## 4. Limits

- Light theme first (the page inherits a missing theme value from the first one).
- Motion tokens are not a family in the artifact; durations and easing live in the brand book.
- Tailwind defaults the theme does not redefine (`text-xs…3xl`, `sm/md/lg` breakpoints, `radius-xs`, `radius-full`, spacing) are listed in the export script — keep them in step with Tailwind upgrades.
- Previews run on the artifact's origin: only pinned CDN scripts and the system's own files load.
- The artifact is private; share it from its page (Share menu) if someone else designs with it.

## 5. Follow-up (after Storybook, #62 continued)

1. Component bundle: Vite IIFE build of `@flaner/ui-components` + compiled `bundle.css` (Tailwind over `theme.css`, `.dark` toggled from the preview's `data-theme`), React 19 + ReactDOM in `components/lib/`.
2. `components/<Comp>/preview.html` + `README.md` generated from `*.stories.tsx` (default args + key variants; group = story title's first segment).
3. Screenshots of key views (Playwright on emulators with seeded data; light/dark × 390px/1440px) → `assets/Screens/`.
4. Pilot: design the Friends view with the setup, compare with the running app, iterate until it looks like Flaner.

## 6. Changelog
- 2026-11-08 — research; Design System artifact created; export of tokens, brand book, fonts, logo, cover; `flaner-design` skill; `create-functionality` brief + design → code steps.
