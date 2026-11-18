# Research: which D3-based chart approach fits our design system? (#137)

Part of map #63 (Budget app: Transactions and Planner, MVP). Blocks #144 (budget app views).

## Question

Charts for the budget app must be D3-based: a pie / donut of spending by category where clicking a category shows its subcategories in the same chart, and a month-by-month bar chart of income and expenses. Compare D3 used directly vs D3-based React libraries (visx, nivo, others) on bundle size, React 19 compatibility, theming through our CSS tokens (light / dark), accessibility, animation of the drill-down, and sharing through Module Federation. Recommend one approach and where chart components live.

## What the repo already has

- **No chart library is installed.** No `package.json` in the repo lists `d3*`, `visx`, `nivo` or `recharts` (checked 2026-11-18).
- **Tokens are ready.** `packages/ui-components/src/theme/theme.css` defines `--chart-1..8` (OKLCH, separate light / dark values) and exposes them to Tailwind as `--color-chart-1..8`, plus `--color-chart-positive` / `--color-chart-negative` (= success / danger). `.agents/docs/design-system.md` D14 documents the palette, and `theme.spec.ts` asserts ≥ 3:1 contrast for chart colours in both themes.
- **Frame is ready.** `packages/ui-components/src/components/ChartContainer/` renders the card, title, actions and a legend from `chart-*` tokens and leaves the plot to `children`. Its doc comment already says chart libraries should read colours from `var(--chart-N)`.
- **Token lint.** `scripts/check-design-tokens.mjs` (`npm run lint:tokens`) forbids raw palette classes and arbitrary colour values (`[#…]`, `[oklch(…)]`) in classes, including `fill-*` / `stroke-*`. Token classes such as `fill-chart-3` pass.
- **Module Federation.** `vite.federation.ts` (`sharedFederationConfig`) shares React, React Router, react-hook-form, TanStack Query, i18next, `@flaner/shared/*`, Firebase and sonner as singletons. `@flaner/ui-components` is **not** shared: each MFE compiles it from source (`"main": "./src/index.ts"`), so whatever a remote imports from it is bundled and tree-shaken into that remote.
- **Motion.** Duration / easing tokens and a global `prefers-reduced-motion` rule exist (design-system.md D11).

## Options

### A. D3 modules directly, React owns the DOM

Use only the DOM-free D3 modules for maths (`d3-shape` for `pie()` / `arc()`, `d3-scale` for `scaleBand()` / `scaleLinear()`, `d3-interpolate` + `d3-timer` for the drill-down tween) and render plain JSX `<svg>`, `<path>`, `<rect>`, `<text>`. This is the pattern the D3 docs recommend for React: modules that don't touch the DOM (d3-scale, d3-array, d3-interpolate, d3-format) are used directly in JSX, while selection-based modules (d3-selection, d3-transition, d3-axis) "compete" with React's virtual DOM and need a ref + `useEffect` ([d3js.org, Getting started → D3 in React](https://d3js.org/getting-started)).

### B. visx (Airbnb)

Low-level React wrappers over D3 (`@visx/shape`, `@visx/scale`, `@visx/group`, …). v4.0.0 (11 Jun 2026) added React 19 to peer deps (`"react": "^18.0.0 || ^19.0.0"`), removed prop-types / lodash and moved to d3-shape v3 ([visx releases](https://github.com/airbnb/visx/releases), [`@visx/shape` package.json](https://raw.githubusercontent.com/airbnb/visx/master/packages/visx-shape/package.json)). The previous release was v3.12.0 on 7 Nov 2024, so there was a ~19-month gap with no release. visx has no animation of its own; `@visx/react-spring` needs `@react-spring/web` as a peer ([package.json](https://raw.githubusercontent.com/airbnb/visx/master/packages/visx-react-spring/package.json)).

### C. nivo

High-level, ready-made charts on D3 maths. `@nivo/pie` 0.99.0 peer `react ^16.14 || ^17 || ^18 || ^19` ([package.json](https://raw.githubusercontent.com/plouc/nivo/master/packages/pie/package.json)). `@nivo/core` pulls `@react-spring/web`, `d3-color`, `d3-scale`, `d3-scale-chromatic`, `d3-format`, `d3-time-format`, `lodash`, `react-virtualized-auto-sizer` ([package.json](https://raw.githubusercontent.com/plouc/nivo/master/packages/core/package.json)). Theming is a JS theme object; colours are JS strings.

### D. Recharts (for reference)

Recharts is **not** D3-rendered: it renders its own React SVG components and uses D3 only for maths through `victory-vendor` (which vendors d3-shape, d3-scale, d3-interpolate, d3-timer, d3-ease and their deps) ([recharts package.json](https://raw.githubusercontent.com/recharts/recharts/main/package.json), [victory-vendor README](https://raw.githubusercontent.com/FormidableLabs/victory/main/packages/victory-vendor/README.md)). 3.11.0 also depends on `@reduxjs/toolkit`, `react-redux` and `immer`. It is the library behind shadcn/ui's chart component (well known, not re-verified here). It is the heaviest option and the ticket asks for D3, so it is listed only to close the "others" question.

## Bundle size

Minified + gzip, whole package including its dependencies, from the bundlephobia API on 2026-11-18. These are **upper bounds**: with ESM tree-shaking only the imported functions remain.

| Package | Version | min+gzip |
|---|---|---|
| `d3-shape` | 3.2.1 | 8.5 kB |
| `d3-scale` (pulls d3-array, d3-format, d3-interpolate, d3-time, d3-time-format) | 4.0.3 | 17.6 kB |
| `d3-interpolate` | 3.0.2 | 7.1 kB |
| `d3-timer` | 3.0.2 | 0.9 kB |
| `d3-hierarchy` (not needed, see below) | 3.1.3 | 5.8 kB |
| `d3-transition` (not recommended, see below) | 3.0.2 | 10.9 kB |
| `@visx/shape` | 4.0.0 | 10.7 kB |
| `@visx/scale` | 4.0.0 | 17.5 kB |
| `@react-spring/web` (visx / nivo animation) | 10.1.2 | 20.3 kB |
| `@nivo/core` | 0.99.0 | 62.2 kB |
| `@nivo/pie` | 0.99.0 | 67.1 kB |
| `@nivo/bar` | 0.99.0 | 89.7 kB |
| `recharts` | 3.11.0 | 176.7 kB |

`d3-shape`, `d3-scale`, `d3-interpolate`, `d3-timer` and `d3-ease` declare `"sideEffects": false` and `"type": "module"`, so Vite / Rollup drops unused exports. `d3-transition` declares `"sideEffects": true` (it patches `selection.prototype`) and cannot be tree-shaken away once imported (package.json files read from jsDelivr, 2026-11-18). `@visx/shape` and `@visx/scale` are nearly the same size as `d3-shape` and `d3-scale` because they wrap them.

Estimate for option A (not measured, inferred from the table): `pie`, `arc`, `scaleBand`, `scaleLinear` + ticks, `interpolate`, `timer` should land around 15–25 kB gzip in the budget remote only.

## Comparison

| Criterion | A. D3 direct | B. visx 4 | C. nivo | D. Recharts |
|---|---|---|---|---|
| Rendered by | React (our JSX) | React (visx components) | React (nivo components) | React (Recharts components) |
| D3 role | maths (shape, scale, interpolate) | maths, wrapped | maths, wrapped | maths via victory-vendor |
| Size for our 2 charts | ~15–25 kB est. | similar + `@react-spring/web` 20 kB for animation | ~130–220 kB (core + pie + bar, upper bound) | ~177 kB |
| React 19 | Not applicable (no React peer) | Yes since v4.0.0 (Jun 2026) | Yes (peer `^19.0`) | Yes (peer `^19.0.0`) |
| Theming with `--chart-*` | `className="fill-chart-N"` or `style={{ fill: "var(--chart-N)" }}`; theme switch is pure CSS | Same as A (we pass props / classes) | JS theme object; colour strings can hold `var(--…)`, but derived colours (darker borders, inherited label colours) are computed in JS with d3-color, which cannot parse `var()` — **unverified**, needs a spike | Colours as props; shadcn uses `var(--chart-N)` |
| Accessibility | Full control: roles, labels, focus, keys | Full control (low-level) | Limited: built-in ARIA props, keyboard nav not documented for pie drill-down (**unverified**) | Partial `accessibilityLayer`; not tuned for drill-down (**unverified**) |
| Drill-down animation | d3-interpolate tween of start / end angles, keyed by category id | Needs react-spring or own tween (same as A) | react-spring transitions between data sets; drill-down is our state change, morph quality not verified | Built-in animation; same-chart drill-down morph not verified |
| MF sharing | Nothing to share: stateless modules bundled into the one remote that draws charts | Same | Same, but larger | Same, but largest |
| Maintenance risk | D3 v3 modules are stable; we own ~2 components | 19-month release gap before v4 | 0.x API, frequent breaking minors | Large dependency tree (Redux, immer) |

## Key techniques for option A

**D3 for maths, React for DOM.** `pie()` turns `[{ id, value }]` into angles, `arc()` turns angles into a path string, `scaleBand()` / `scaleLinear()` turn months and amounts into x / y. React renders the elements, so keys, events, ARIA attributes and i18n stay in normal JSX. Do not import `d3-selection` / `d3-transition`: they would fight React for the same nodes ([d3js.org](https://d3js.org/getting-started)) and `d3-transition` is not tree-shakeable.

**Colours through tokens.** Tailwind v4 generates `fill-*` and `stroke-*` utilities from `--color-*` theme variables, emitting `fill: var(--color-<name>)` ([Tailwind docs, fill](https://tailwindcss.com/docs/fill)). Because `--color-chart-N` points at `--chart-N`, which `theme.css` redefines for dark mode, `fill-chart-3` switches theme with no JS and passes `lint:tokens`. Keep a static class map like `chartSwatchVariants` in `ChartContainer.styles.ts` so Tailwind sees every class. Income / expense bars use `fill-chart-positive` / `fill-chart-negative`. Axis text and grid lines use the existing foreground / border tokens. Subcategories reuse the parent's colour with opacity steps, which is the sequential rule in design-system.md D14.

**Accessibility.**
- Wrap the SVG in `role="graphics-document"` (or `role="img"` for the bar chart) with an `aria-label` / `<title>` that states the chart's subject. Each donut segment is `role="graphics-symbol"` with an `aria-label` such as "Food, 1 240 PLN, 32%" ([WAI-ARIA Graphics Module, W3C Rec 2018](https://www.w3.org/TR/graphics-aria-1.0/)). Screen reader support for graphics roles varies (not tested here), so the fallback below matters.
- Segments that drill down are focusable (`tabIndex={0}`, roving focus with arrow keys), open on Enter / Space, and a visible "Back to all categories" button (not only a centre click) returns to the top level. Focus ring uses the existing `ring` token.
- The legend from `ChartContainer` and a visually hidden table (or a toggle to show the data as a table) carry the same numbers, so the chart is never the only way to read them. Colour is never the only signal: labels or the legend name each slice.

**Drill-down animation.** The data has two levels (category → subcategories), so `d3-hierarchy` / `partition()` is not needed: `pie()` runs on whichever level is selected. To morph in the same chart:
1. On click, the clicked category's arc expands to the full circle while siblings collapse to zero width.
2. The new level's subcategory arcs start inside the parent's old angle range and expand to their `pie()` angles.
3. Interpolate `{ startAngle, endAngle }` per arc id with `d3-interpolate`, driven by `d3-timer` (or `requestAnimationFrame`) and an easing from `d3-ease`, writing the path `d` through React state; duration from the `--duration-slow` token (300 ms).
4. Under `prefers-reduced-motion: reduce`, skip the tween and jump to the end state (the global CSS rule does not stop JS-driven tweens, so the hook must check `matchMedia`).
This is the same idea as D3's zoomable sunburst, which maps `partition()` output to angles and re-computes the arc domain on click ([d3-hierarchy partition](https://d3js.org/d3-hierarchy/partition)), reduced to two levels.

**Tree-shaking.** Import named functions from the individual modules (`import { arc, pie } from "d3-shape"`), never the `d3` umbrella package; add `@types/d3-shape`, `@types/d3-scale`, `@types/d3-interpolate`, `@types/d3-timer`, `@types/d3-ease` as dev deps.

## Module Federation

- **Do not add d3 to `sharedFederationConfig`.** D3 modules are stateless functions, so a single instance across remotes buys nothing, and shared dependencies are built for every possible consumer, so they are generally not tree-shaken. Module Federation 2 offers shared tree shaking only as an experimental feature, documented for Rspack ([MF docs, shared tree shaking](https://deploy-preview-4737--module-federation-docs.netlify.app/guide/advanced/shared-tree-shaking), [Rspack plugin, experimental](https://rspack.rs/plugins/tree-shaking-shared-plugin)). Whether `@module-federation/vite` supports it was not verified.
- Only the budget remote will draw charts in the MVP, so bundling d3 into it is the cheapest outcome. If a second remote adds charts later, it would carry its own ~15–25 kB copy; revisit sharing only then.
- Charts live in `@flaner/ui-components`, which each remote compiles from source, so the host and the other remotes do not pay for d3 unless they import a chart (assuming the `ui-components` barrel stays side-effect free; check the remote's build output once the first chart lands).

## Recommendation

**Use D3 directly (option A): `d3-shape`, `d3-scale`, `d3-interpolate`, `d3-timer`, `d3-ease`, with React rendering the SVG and colours coming from `fill-chart-*` / `stroke-*` token classes.**

Why:
- It is the smallest option (estimated 15–25 kB gzip vs ~130 kB+ for nivo and ~177 kB for Recharts) and adds no React peer dependency, so React 19 is a non-issue.
- Theming is pure CSS through tokens we already have; light / dark switch without JS and pass `lint:tokens`. nivo's JS-computed colours are a theming risk.
- Accessibility and the same-chart drill-down are custom anyway; no library offers the keyboard-accessible drill-down we need, and a low-level library (visx) gives no advantage over the D3 modules it wraps while adding react-spring for animation and a recent long release gap.
- Two charts is a small surface: two components plus one tween hook.

**Where components live:**
- `packages/ui-components/src/components/DonutChart/` and `packages/ui-components/src/components/BarChart/` (folder-per-unit, with `*.spec.tsx` and `*.stories.tsx` in light / dark and EN / PL). They are "dumb": they take data (`{ id, label, value, color }[]`), a value formatter, an accessible label and callbacks (`onSegmentSelect`, `onBack`), render inside `ChartContainer`, and own only the drill-down animation. The d3 dependencies go into `packages/ui-components/package.json`.
- The budget MFE owns the domain: mapping categories / subcategories and transactions to chart data, the drill-down state (which category is open), money formatting in the main currency and all i18n text. Post-MVP analyses (#148) can reuse the same components.

**Risks and open points:**
- Owning the drill-down tween and keyboard handling is real work; budget a spike for the donut before #144's designs are final.
- Screen-reader support for `graphics-*` roles was not tested; the hidden data table is the safety net.
- The 15–25 kB estimate and the "only the budget remote pays" claim should be confirmed with a build of the remote once the first chart exists.
- nivo's handling of `var()` colours and Recharts' accessibility layer were not tested, only reasoned about; they do not change the recommendation.
