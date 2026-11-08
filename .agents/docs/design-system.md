# Flaner Design System — Research, Audit & Decisions

Issue: #61. Status: **implemented** (decisions approved 2026-11-07). Theme source: `packages/ui-components/src/theme/theme.css`. The component catalogue (Storybook) is a separate, follow-up PR.

> Sections 1–3 are the research and the decision record. Section 4 onwards describes the system as implemented — when it disagrees with an earlier decision, section 4+ wins (deviations are listed in §8).

---

## 1. Research — what a production-ready design system contains

| System | Takeaway for Flaner |
|---|---|
| **Material 3** | Three token tiers: *reference* (raw palette) → *system* (semantic roles: `primary`, `on-primary`, `surface`, `surface-container-*`, `error`) → *component*. Every fill colour has a paired `on-*` foreground. Elevation = tonal surface steps, not only shadows. Motion = named duration/easing tokens. |
| **Radix Themes / Radix Colors** | 12-step scales per hue with a fixed meaning per step (1–2 backgrounds, 3–5 interactive fills, 6–8 borders, 9–10 solid, 11–12 text). Dark scale is a separate, tuned scale — not an inversion. |
| **shadcn/ui** (our base) | CSS variables `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--radius`; every surface has a `*-foreground` pair. Easy to extend in Tailwind v4 via `@theme inline`. |
| **Atlassian** | Token names describe *role + property + emphasis* (`color.background.success.bold`, `color.text.subtlest`). Lint rule bans raw colours in code. Elevation tokens `surface`, `surface.raised`, `surface.overlay`. |
| **Shopify Polaris** | Strict token-only styling enforced by stylelint; documented patterns (empty state, page header, index list, skeleton page) are as important as components. |
| **GOV.UK** | Accessibility as a hard requirement (WCAG 2.2 AA), visible focus state with a distinctive focus ring, patterns documented with *when to use / when not to use*. |

**What every mature system has (checklist):**
1. **Token tiers** — primitive → semantic → (optional) component/domain. Components consume only semantic tokens.
2. **Colour** — light + dark tuned separately; every fill has an `*-foreground`; status roles (success / warning / danger / info) with *solid* and *subtle* variants; contrast ≥ 4.5:1 for text, ≥ 3:1 for UI graphics and focus.
3. **Typography scale** — named sizes with paired line-heights, limited weights.
4. **Spacing, radius, elevation, motion** — small named scales; `prefers-reduced-motion` respected.
5. **Iconography** — one icon set, fixed sizes, stroke width.
6. **Data-viz palette** — categorical (distinguishable, ≥ 3:1 vs. background), sequential, diverging; separate light/dark values.
7. **States** — hover / active / focus-visible / disabled / loading / error / empty, documented per component.
8. **Patterns** — page shell, page header, list, empty state, skeleton, sheet vs. modal.
9. **Responsive rules** — mobile-first, named breakpoints.
10. **Docs + catalogue** — every component visible in one place, with variants and states.
11. **Enforcement** — lint/grep check against raw values; versioning/changelog (for us: the git history of `theme.css` + this doc is enough).

---

## 2. Audit of the current state (2026-11-07)

### 2.1 Theme sources
- Tokens in `packages/core/src/index.css` (`@theme` + shadcn `:root` / `.dark`).
- **1:1 copies** of `brand` + `vote-*` in `packages/planning/src/index.css` and `packages/tools/src/index.css`. Every MFE imports its own `index.css` in `bootstrap.tsx`; in the host all of them are loaded at once, so rules from different files override each other (e.g. scrollbars).
- `community`, `settings`, `shopping` have only `@import "tailwindcss"` + `@source` — standalone they render without brand tokens.

### 2.2 Bugs found
| # | Finding | Impact |
|---|---|---|
| B1 | `--font-sans` declared twice: `"Outfit","Inter"` in `@theme`, `'Geist Variable'` in `@theme inline` (the latter wins). | Dead, misleading declaration. Effective font = Geist. |
| B2 | Scrollbar colours hardcoded to dark zinc (`#09090b`, `#27272a`, `#3f3f46`) in core, applied in light mode too; planning overrides with `rgba(255,255,255,.15)` → invisible on light background. | Wrong scrollbar in light mode. |
| B3 | `text-brand-foreground` (9 uses) and `text-destructive-foreground` (1 use) **have no token** → class generates nothing. | Text on brand fills inherits a random colour. |
| B4 | `.dark --sidebar-primary` is shadcn's default blue (`oklch(0.488 0.243 264)`). | Off-brand leftover. |
| B5 | `--chart-1..5` are greys (no chroma). | Unusable for charts (expenses app). |
| B6 | `bg-white/5`, `border-white/5|10` (≈80 uses) used as "subtle surface" — invisible in light mode. | Light-mode regressions. |

### 2.3 Contrast (WCAG 2.2) — current tokens
| Pair | Ratio | AA |
|---|---|---|
| `text-brand` (#edad5e) on light background | **1.78** | ❌ (text) |
| `text-brand` on dark background | 10.12 | ✅ |
| white text on `bg-brand` | **1.96** | ❌ |
| near-black text on `bg-brand` | 10.02 | ✅ |
| white text on `vote-yes` / `vote-maybe` (active vote button) | **2.98 / 2.90** | ❌ |
| `vote-no` on dark background | 4.20 | ❌ (text) |
| `destructive` text on light background | 4.34 | ❌ (just under 4.5) |
| `muted-foreground` light / dark | 9.13 / 7.63 | ✅ |
| `border` vs. white card (light) | 1.58 | ⚠️ decorative only — OK for borders, not for input outlines (3:1 needed for inputs) |

Conclusion: dark mode is mostly fine; **light mode fails** for every brand/status *text* usage.

### 2.4 Hardcoded values (grep, `packages/*/src`, without specs)
| Kind | Count | Where |
|---|---|---|
| Hex colours | 109 | mostly **data** (filament colours `bambuFilaments.ts` 58, colour-picker presets 14, event colours 10, Google logo 4) — legitimate; ~10 real styling hexes (`[#141416]`, `[#18181b]`, `[#151515]`, `SlotEventComponent`) |
| Raw Tailwind palette classes | 355 | `white` 126, `amber` 75, `emerald` 64, `zinc` 32, `rose` 24, `red` 10… — planning 39 files, ui-components 15, community 11, core 5, tools 3, settings 1 |
| Arbitrary font sizes | 106 | `text-[11px]` 39, `text-[10px]` 37, `text-[9px]` 12, `text-[8px]`/`[8.5px]`/`[9.5px]`/`[10.5px]`/`[12px]`/`[13px]`/`[0.8rem]` |
| Arbitrary shadows | 9 | `shadow-[...rgba(...)]`, `shadow-amber`, `shadow-brand` |
| Arbitrary radii | 3 | `rounded-[3px]`, `rounded-[4px]` |
| Arbitrary breakpoints | 125 | `min-[1438px]` 73 (planning calendar), `max-[1079px]`/`min-[1080px]` 37, `min-[1200px]` 12, `min-[1284px]` 2, `min-[360px]` 1 |
| Arbitrary z-index | 9 | `z-[50]`, `z-[70]`, `z-[100]`, `z-[1]` |
| Other `-[Npx]` (sizes, widths) | ~350 | mostly layout (widths of panels, calendar cells) — **out of scope** except where a token exists |

Semantic meaning of raw colours in use: `emerald` = success / "yes", `amber` = warning / brand-ish highlight, `rose`/`red` = danger / "no", `white/N` = subtle overlay surface, `zinc-950/900` = dark surfaces / ink on brand.

### 2.5 Components & patterns
- shadcn primitives (`components/ui`): accordion, alert, attachment, avatar, button, calendar, checkbox, dialog, dropdown-menu, field, input, label, popover, separator, sheet, sidebar, tabs, textarea, toaster, tooltip.
- Flaner components: form inputs (TextField, Select, DatePicker, MoneyInput, Switch, ColorPicker, ImagePicker…), Avatar, BigCalendar, ConfirmationPopup, Profile, SearchBar, LoadingFallback.
- Repeated hand-made patterns in MFEs: **card** surface (`rounded-2xl border bg-card…`, 23 files), **empty state** (≥ 10 variants, one named `SchedulerEmptyState`), **page header** with `<h1>` (8 views, each styled differently), **skeleton** rows (`animate-pulse`, 10 files), **count badge** (`bg-brand text-[10px] rounded-full`, several).

---

## 3. Decisions for Flaner (adopt / skip)

### Adopt
| # | Decision |
|---|---|
| D1 | **One theme source**: `packages/ui-components/src/theme/theme.css` (tokens, `@custom-variant dark`, base layer, scrollbars, font import). `core` and every MFE `index.css` = `@import "tailwindcss"` + `@import` of the theme + own `@source` lines. No MFE defines tokens. |
| D2 | **Token tiers**: (1) *primitive* — raw OKLCH values in `:root` / `.dark` (private, prefixed `--p-*`, never used in components); (2) *semantic* — shadcn roles + Flaner additions, exposed to Tailwind via `@theme inline`; (3) *domain* — `vote-*` (and future domain sets) defined **only as aliases** of semantic tokens. |
| D3 | **Every fill has a `-foreground`**: add `brand-foreground`, `destructive-foreground`, status foregrounds. Fixes B3. |
| D4 | **Status roles** `success`, `warning`, `danger` (= alias of `destructive`), `info`, each with `DEFAULT` (solid fill), `-foreground` (text on fill), `-subtle` (tinted background), `-text` (AA text on background). Light/dark tuned separately. |
| D5 | **Brand split**: `brand` (fill, unchanged #edad5e look), `brand-foreground` (ink on brand), `brand-text` (AA text on background: dark amber in light mode, brand in dark mode), `brand-subtle`. `brand-light` / `brand-dark` removed (2 uses → `brand-subtle` / hover via `/90`). |
| D6 | **Surfaces**: replace `white/N` overlays with semantic `surface-subtle` / `border-subtle` that work in both themes (fixes B6). Elevation = `card` (raised) → `popover` (overlay) + shadow tokens. |
| D7 | **Typography scale**: keep Tailwind `text-xs…text-3xl`; add two named micro sizes `text-2xs` (11px) and `text-3xs` (10px) to absorb the 106 arbitrary sizes. Sizes < 10px are banned (≤ 9px → `text-3xs`). Weights: 400 / 500 / 600 / 700 (+800 only for display headings). Font: **Geist Variable** only (fixes B1). |
| D8 | **Spacing**: Tailwind's 4px scale as-is (no custom tokens — YAGNI). |
| D9 | **Radius**: keep `--radius` (0.625rem) + derived `sm…4xl`. Documented use: inputs/buttons `rounded-lg`, cards `rounded-2xl`, sheets/modals `rounded-3xl`, pills/avatars `rounded-full`. Arbitrary radii → nearest token. |
| D10 | **Elevation**: shadow tokens `shadow-raised` (cards), `shadow-overlay` (popovers/dropdowns), `shadow-modal` (dialogs/sheets), `shadow-glow-brand` (focus/highlight). Arbitrary `shadow-[...]` removed. |
| D11 | **Motion**: `--duration-fast` 150ms (hover, toggles), `--duration-base` 200ms (popovers, tabs), `--duration-slow` 300ms (sheets, modals); `--ease-standard` / `--ease-emphasized`. Global `prefers-reduced-motion` rule disables non-essential animation. Existing `duration-100/500` → nearest token. |
| D12 | **Breakpoints**: Tailwind defaults + named `--breakpoint-desktop: 1080px` (replaces `min-[1080px]`/`max-[1079px]`/`min-[1200px]`) and `--breakpoint-wide: 1440px` (replaces `min-[1438px]`, `min-[1284px]`). |
| D13 | **Z-index**: named layers `z-base`(0) `z-raised`(10) `z-sticky`(20) `z-overlay`(50) `z-toast`(100). |
| D14 | **Data-viz palette**: `--chart-1..8` categorical (OKLCH, hues 65 / 240 / 155 / 20 / 300 / 195 / 110 / 340; L≈0.60 light, L≈0.74 dark; all ≥ 3:1 vs. background in both themes), plus `--chart-positive` / `--chart-negative` (= success / danger) for diverging values (balances). Sequential = one hue with opacity steps (no extra tokens). Fixes B5. |
| D15 | **Focus**: one visible focus ring `ring-2 ring-ring` with `--ring` ≥ 3:1 vs. background in both themes; `--ring` moves to a brand-tinted value. |
| D16 | **Icons**: lucide only; sizes `size-4` (inline), `size-5` (buttons/nav), `size-6` (empty states / headers); default stroke. |
| D17 | **Enforcement**: `scripts/check-design-tokens.mjs` (CI + `npm run lint:tokens`) fails on raw palette classes, hex/rgb inside class strings, `text-[Npx]`, `shadow-[…]`, `z-[N]`, arbitrary breakpoints. Allowlist: data files (filament colours, colour presets, event colours, `GoogleIcon`), `components/ui/*` shadcn primitives. |
| D18 | **Data colours stay data**: user-chosen colours (events, spools, colour picker presets) remain hex values in TS — they are content, not styling. |

### Skip (YAGNI)
- Component-tier tokens (`--button-bg` etc.) — CVA variants over semantic tokens are enough.
- Custom spacing scale, custom 12-step colour scales per hue.
- Design-token build pipeline (Style Dictionary / JSON → CSS). CSS is the single source; the follow-up "export to Claude" issue can read `theme.css` + this doc.
- High-contrast theme, RTL, density modes.
- Versioning beyond git history + changelog section in this doc.

---

## 4. Token specification (target)

### 4.1 Colour — semantic roles
| Token (Tailwind name) | Light | Dark | Notes |
|---|---|---|---|
| `background` / `foreground` | warm neutral `oklch(0.95 0.007 80)` / `oklch(0.16 0.01 80)` | `oklch(0.145 0 0)` / `oklch(0.985 0 0)` | unchanged |
| `card`, `popover` (+ `-foreground`) | white | `oklch(0.205 0 0)` | unchanged |
| `surface-subtle` | `oklch(0.925 0.008 80)` | `oklch(1 0 0 / 5%)` | section / container fill; replaces `bg-white/5` |
| `surface-raised` | white | `oklch(1 0 0 / 5%)` | item inside a `surface-subtle` container (expense, settlement, debt rows) — light needs an opaque lift because opaque fills do not stack like the dark alphas |
| `border` / `border-subtle` | `oklch(0.85 0.008 80)` / `oklch(0.9 0.006 80)` | `oklch(1 0 0 / 10%)` / `oklch(1 0 0 / 5%)` | decorative borders |
| `input` / `input-border` | `oklch(0.85 0.008 80)` / `oklch(0.62 0.01 80)` | `oklch(1 0 0 / 15%)` / `oklch(0.52 0 0)` | `input` = shadcn field fill tint (`bg-input/30`); `input-border` = form-control outline ≥ 3:1 vs. card and background (WCAG 1.4.11) — was 1.58 light / ≈1.9 dark |
| `primary`, `secondary`, `muted`, `accent` (+ `-foreground`) | unchanged | unchanged | shadcn roles |
| `brand` / `brand-dark` / `brand-foreground` | `#edad5e` / `#c98d3c` / `oklch(0.16 0.01 80)` | same | ink on brand 10:1; `brand-dark` = gradient end |
| `brand-text` | `oklch(0.52 0.12 65)` (5.2:1) | `#edad5e` (10:1) | brand-coloured text/icons |
| `brand-subtle` | `oklch(0.795 0.12 70 / 15%)` | same | tinted backgrounds |
| `success` / `warning` / `danger` / `info` (solid) | `oklch(0.5 0.15 155)` / `oklch(0.53 0.15 60)` / `oklch(0.52 0.19 25)` / `oklch(0.52 0.15 245)` | `oklch(0.75 0.16 155)` / `oklch(0.78 0.15 70)` / `oklch(0.7 0.19 22)` / `oklch(0.75 0.13 240)` | fills (badges, active vote) |
| `*-foreground` | white (≥ 5:1) | ink (≥ 8:1) | text on solid |
| `*-text` | same as solid (≥ 5:1 on bg) | same as solid (≥ 8:1) | status text on background |
| `*-subtle` | solid / 12% | solid / 15% | tinted backgrounds |
| `surface-hover` / `surface-strong` | `oklch(0.9 0.009 80)` / `oklch(0.86 0.01 80)` | white / 10% / 15% | hover, pressed, tracks |
| `surface-inverse` (+ `-foreground`) | near-black | near-white | tooltips |
| `on-media` / `scrim` | white / black | same | text on photos, user-chosen colours and slot pills / modal backdrops (`bg-scrim/10`) |
| `medal-gold|silver|bronze` | AA text colours | AA text colours | domain tier (ranking) |
| `--event-blue|indigo|violet|purple|fuchsia|pink|cyan|sky|teal|slate` | `oklch(0.72 C H)` softened, ink text ≥ 7:1 | Tailwind 500 hexes (teal 600) | domain tier (scheduler slots). Firestore stores only the key (`proposedDates[].color = "blue"`); `getSlotColorValue(key)` in `planning/src/utils/slotColors` returns `var(--event-<key>)`, so slots follow the theme switch |
| `destructive` | alias of `danger` | alias of `danger` | shadcn compatibility |
| `vote-yes|maybe|no` (+ `-foreground`, `-subtle`, `-text`, `-border`) | alias of `success` / `warning` / `danger` | alias | domain tier; `-hover` dropped (use `/90`), `-tint` renamed `-subtle` |
| `ring` | `oklch(0.52 0.12 65)` | `#edad5e` | focus, ≥ 3:1 |
| `chart-1..8`, `chart-positive|negative` | see D14 | see D14 | data-viz |

Exact values are verified by `packages/ui-components/src/theme/theme.spec.ts`, which parses `theme.css` and asserts AA for text pairs (4.5:1) and graphics / focus / inputs / charts (3:1) in both themes (64 checks).

**Forced-dark surfaces:** an element that must stay dark regardless of the theme can carry the `dark` class, so every token inside resolves to its dark value. (Scheduler slot pills used this until the theme-aware `--event-*` colours replaced it.)

### 4.2 Typography
| Token | Size / line-height | Use |
|---|---|---|
| `text-5xs` | 8px / 10px | dense calendar grid only |
| `text-4xs` | 9px / 12px | dense grids (availability grid, slot badges) only |
| `text-3xs` | 10px / 14px | counters, calendar micro-labels |
| `text-2xs` | 11px / 16px | meta, captions, badges |
| `text-xs` | 12px / 16px | helper text |
| `text-sm` | 14px / 20px | body (default UI) |
| `text-base` | 16px / 24px | long-form body |
| `text-lg`…`text-3xl` | Tailwind | headings (`PageHeader` = `text-2xl sm:text-3xl`, section = `text-lg`) |

### 4.3 Other scales
Spacing — Tailwind 4px scale. Radius — D9 (`rounded-[3px]` → `rounded-xs`).

| Scale | Tokens |
|---|---|
| Elevation | `shadow-raised` (cards), `shadow-overlay` (popovers), `shadow-modal` (dialogs), `shadow-edge` (sticky grid column), `shadow-drawer` (side panel), `shadow-glow-brand` / `-glow-warning` / `-glow-danger` / `-dot-warning` (highlights); Tailwind `shadow-xs…2xl` stay allowed |
| Motion | `duration-150` (hover, toggles), `duration-200` (popovers, tabs), `duration-300` (sheets, modals); `ease-standard`, `ease-emphasized`; global `prefers-reduced-motion` rule |
| Breakpoints | Tailwind `sm` / `md` / `lg` + `xs` 360px, `desktop` 1080px, `split` 1200px, `calendar` 1284px, `wide` 1440px |
| Z-index | Tailwind numeric scale: `z-0`, `z-1`, `z-10`, `z-20`, `z-40`, `z-50`, `z-70` (popover over popover), `z-100` (slot hover toolbar) |

---

## 5. Components & patterns to add (PR1)

All in `packages/ui-components/src/components/<Name>/` (folder-per-unit, CVA, `*.styles.ts`, spec, `index.ts`), exported from `@flaner/ui-components`.

| Component | Why (evidence) |
|---|---|
| `Card` (+ `CardHeader`, `CardContent`, `CardFooter`) — shadcn `card` + variants `default` / `subtle` / `interactive` | 23 hand-made card surfaces |
| `EmptyState` — icon, title, description, action slot | ≥ 10 hand-made empty states |
| `PageHeader` — title, description, actions slot, back link | 8 views with ad-hoc `<h1>` |
| `ListItem` — leading (avatar/icon), title, meta, trailing actions; `interactive` variant | friend/group/member/expense/spool rows |
| `Skeleton` — shadcn `skeleton` | 10 files with `animate-pulse` divs |
| `Badge` — shadcn `badge` + `brand` / `success` / `warning` / `danger` / `count` variants | counters, statuses |
| `Stepper` — steps with current/complete states | needed by upcoming wizard flows (recurring expenses, packing) |
| `ChartContainer` — card frame + title + legend driven by `chart-*` tokens; renders children (no chart library in PR1) | expenses app (D3) |

Existing: `Tabs`, `Toaster`, `Tooltip`, `Sheet`, `Dialog` stay; their usage rules (sheet vs. modal) are documented in §6.

---

## 6. Patterns (usage rules)

- **Page shell**: `ShellLayout` (core) → view root `max-w-screen-2xl mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6` → `PageHeader` → content.
- **Sheet vs. modal**: `Sheet` for browsing/managing a collection or secondary context (members, invitations, filters on mobile); `Dialog` for a focused, short task that must be completed or cancelled (create, confirm, settle up). Destructive confirm = `ConfirmationPopup`.
- **List**: `ListItem` inside a `Card` or bare with `divide-y divide-border-subtle`; empty → `EmptyState`; loading → 3× `Skeleton` rows of the same height.
- **States**: hover `bg-surface-subtle` or `/90` on solid fills; focus-visible `ring-2 ring-ring`; disabled `opacity-50 pointer-events-none`; loading = `Skeleton` (content) or spinner in button (action); error = `Alert` (block) or `FieldError` (field).
- **Responsive**: mobile-first; single DOM tree (see `component-styling` §3.2); `desktop` breakpoint switches side panels to columns.

---

## 7. Implementation plan (PR1, after approval)

1. `packages/ui-components/src/styles/theme.css` + `theme.spec.ts` (contrast assertions); wire into `core` and all MFE `index.css`; remove copies (D1, D2).
2. Semantic tokens + fixes B1–B6, D3–D5, D10–D15.
3. Migrate hardcoded values package by package (ui-components → core → community → settings → tools → planning → shopping), `lint --fix` + `typecheck` after each.
4. New components (§5) with specs; adopt them in the views where the hand-made patterns live (only where it is a straight replacement — no redesigns).
5. `scripts/check-design-tokens.mjs` + `npm run lint:tokens` + CI step (D17).
6. Update skills `component-styling`, `shadcn-ui-components`, `frontend-design` (token rules, new components, ban list).
7. Testing: unit (`npm test`), `npm run typecheck`, lint, `npm run e2e`; Playwright screenshot tests of key views (home, friends, groups, scheduler, splits, spooler, settings) × light/dark × mobile/desktop; manual visual pass confirmed by the user.

Status: all steps done in PR1. Adopted in views: `PageHeader` (Friends, Groups, MFE tiles, Spooler), `EmptyState` (scheduler, MFE tiles), `Badge` (invitation / request / notification counts). Wider adoption of `Card` / `ListItem` / `Skeleton` happens when those views are next touched.

**PR2 (follow-up):** Storybook catalogue for `ui-components` (stories for every component, light/dark toggle, a11y addon).

---

## 8. Deviations from the decision list
- **D7** — two extra micro sizes `text-4xs` (9px) / `text-5xs` (8px) for dense grids; banning them would have broken calendar cell heights.
- **D11** — durations use Tailwind's numeric `duration-150/200/300` (v4 has no duration theme namespace); only easing is tokenised.
- **D12** — breakpoints keep today's values (`desktop` 1080, `split` 1200, `calendar` 1284, `wide` 1440, `xs` 360) instead of collapsing them to two, to avoid layout regressions.
- **D13** — no named z-index layers (v4 has no z-index theme namespace); arbitrary `z-[N]` became the numeric scale.
- **D5** — `brand-dark` kept (gradient end); `brand-light` removed.
- **D9** — `rounded-[4px]` stays in the stock shadcn checkbox (primitives keep their sizing).

## 9. Changelog
- 2026-11-07 — initial research, audit and decision list (#61).
- 2026-11-07 — implemented: theme source, semantic tokens, migration of all packages, new components, `lint:tokens` in CI, contrast spec, skills updated (#61).
- 2026-11-08 — visual pass feedback: slightly deeper light background, `surface-raised` for rows inside sections (Splits), participant cards match the active split card, scheduler slot colours stored as keys with light/dark `--event-*` tokens.
