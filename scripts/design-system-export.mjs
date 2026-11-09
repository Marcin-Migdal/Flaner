#!/usr/bin/env node
/**
 * Exports the Flaner design system from the repo into the file layout of a claude.ai
 * "Design System" artifact (#62): `.design-system/project/` → published by Claude Code.
 *
 * Sources (nothing is hand-copied):
 *   - tokens      packages/ui-components/src/theme/theme.css (+ Tailwind defaults the theme relies on)
 *   - README      .agents/skills/flaner-design/design-system/brand-book.md
 *   - cover       .agents/skills/flaner-design/design-system/cover.html
 *   - fonts       @fontsource-variable/geist (latin + latin-ext)
 *   - logo        packages/core/public/flaner-icon.png
 *   - screens     .design-system/screens/*.png from `npm run design:screens` (optional, kept across exports)
 *   - components  packages/ui-components (bundle via `.storybook/design-system.tsx`, React 19 as classic scripts,
 *                 one card per `*.stories.tsx`: preview + README from the brand-book table + .d.ts props);
 *                 every preview is rendered headless in both themes (Playwright) before anything is written
 *
 * Usage: npm run design:export   (then ask Claude Code to "re-sync the Flaner design system",
 * see the `flaner-design` skill). Tests: node --test scripts/design-system-export.test.mjs
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".design-system", "project");
const SCREENS = join(ROOT, ".design-system", "screens");
const THEME = "packages/ui-components/src/theme/theme.css";
const SKILL_DIR = ".agents/skills/flaner-design/design-system";
const FONT_DIR = "node_modules/@fontsource-variable/geist";
const FONT_FILES = ["geist-latin-wght-normal.woff2", "geist-latin-ext-wght-normal.woff2"];
const LOGO = "packages/core/public/flaner-icon.png";

const THEMES = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
];

// ---------------------------------------------------------------------------------------------
// Parsing theme.css
// ---------------------------------------------------------------------------------------------

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Body of the first top-level block whose selector matches exactly (`@theme`, `:root`, `.dark`, `@theme inline`). */
function block(css, selector) {
  const re = new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
  const match = re.exec(css);
  if (!match) return "";
  let depth = 1;
  let i = match.index + match[0].length;
  const start = i;
  for (; i < css.length && depth > 0; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
  }
  return css.slice(start, i - 1);
}

/** `--name: value;` declarations of a block, in source order. */
function declarations(body) {
  const map = new Map();
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) map.set(m[1], m[2].trim());
  return map;
}

export function parseTheme(source) {
  const css = stripComments(source);
  return {
    static: declarations(block(css, "@theme")),
    root: declarations(block(css, ":root")),
    dark: declarations(block(css, ".dark")),
    inline: declarations(block(css, "@theme inline")),
  };
}

// ---------------------------------------------------------------------------------------------
// Resolving values per theme
// ---------------------------------------------------------------------------------------------

function lookup(theme, name, themeId) {
  if (themeId === "dark" && theme.dark.has(name)) return theme.dark.get(name);
  return theme.root.get(name) ?? theme.static.get(name) ?? theme.inline.get(name);
}

const round = (n) => Number(n.toFixed(3));

/** Mixing a colour with `transparent` in OKLCH keeps the colour and scales its alpha. */
function withAlpha(color, percent) {
  const factor = percent / 100;
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (hex) {
    const alpha = (hex[2] ? parseInt(hex[2], 16) / 255 : 1) * factor;
    return `#${hex[1].toLowerCase()}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  }
  const oklch = /^oklch\(\s*([^/)]+?)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/.exec(color);
  if (oklch) {
    const alpha = oklch[2] === undefined ? 1 : Number(oklch[2]) / (oklch[3] ? 100 : 1);
    return `oklch(${oklch[1]} / ${round(alpha * factor * 100)}%)`;
  }
  throw new Error(`Cannot apply alpha to "${color}"`);
}

function resolvePercent(theme, expr, themeId) {
  const v = /^var\(--([\w-]+)\)$/.exec(expr.trim());
  const value = v ? lookup(theme, v[1], themeId) : expr;
  return Number.parseFloat(value);
}

/** Resolves `var()` chains and `color-mix(in oklch, X N%, transparent)` to a literal colour. */
export function resolveColor(theme, expr, themeId) {
  const value = expr.trim();
  const v = /^var\(--([\w-]+)\)$/.exec(value);
  if (v) {
    const next = lookup(theme, v[1], themeId);
    if (next === undefined) throw new Error(`Unknown variable --${v[1]}`);
    return resolveColor(theme, next, themeId);
  }
  const mix = /^color-mix\(\s*in oklch\s*,\s*(var\(--[\w-]+\)|[^,]+?)\s+(var\(--[\w-]+\)|[\d.]+%)\s*,\s*transparent\s*\)$/.exec(value);
  if (mix) return withAlpha(resolveColor(theme, mix[1], themeId), resolvePercent(theme, mix[2], themeId));
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value.toLowerCase();
  if (/^oklch\([^()]*\)$/.test(value)) return value;
  throw new Error(`Unsupported colour value "${value}"`);
}

/** Replaces every `color-mix(...)` / `var(--x)` inside a composite value (shadows) by its literal colour. */
function resolveInline(theme, expr, themeId) {
  return expr
    .replace(/color-mix\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (m) => resolveColor(theme, m, themeId))
    .replace(/var\(--([\w-]+)\)/g, (m) => resolveColor(theme, m, themeId));
}

const remToPx = (value) => {
  const rem = /^([\d.]+)rem$/.exec(value);
  return rem ? `${round(Number(rem[1]) * 16)}px` : value;
};

// ---------------------------------------------------------------------------------------------
// Usage notes (every token gets one — the Design System page and Claude Design read them)
// ---------------------------------------------------------------------------------------------

const COLOR_USAGE = {
  background: "Page background (`bg-background`). Body text in `foreground` on it.",
  foreground: "Default text on `background`, `card`, `popover`, `surface-*`.",
  card: "Raised panels: `Card`, list rows, form containers (`bg-card`).",
  "card-foreground": "Text on `card`.",
  popover: "Popovers, dropdown menus, sheets and dialogs.",
  "popover-foreground": "Text on `popover`.",
  "surface-subtle": "Section / container fill (`Card variant=subtle`, `ListItem variant=card`, empty states). Replaces `bg-white/5`.",
  "surface-raised": "Item inside a `surface-subtle` container (expense, settlement, debt rows).",
  "surface-hover": "Hover fill of rows, ghost buttons and menu items.",
  "surface-strong": "Pressed state, progress / slider tracks.",
  "surface-inverse": "Tooltips and other inverted chips.",
  "surface-inverse-foreground": "Text on `surface-inverse`.",
  "on-media": "Fixed white: text and icons on photos, user-chosen colours and slot pills. Never on `background`.",
  scrim: "Fixed black: modal / sheet backdrops (`bg-scrim/40`) and photo overlays.",
  primary: "Neutral primary button fill (shadcn `Button` default). Brand actions use `brand`.",
  "primary-foreground": "Text on `primary`.",
  secondary: "Secondary button fill.",
  "secondary-foreground": "Text on `secondary`.",
  muted: "Muted fills: tab list track, disabled-looking chips.",
  "muted-foreground": "Secondary text: descriptions, meta, placeholders, inactive icons (AA on every surface).",
  accent: "shadcn accent fill: hovered menu items, selected calendar day background.",
  "accent-foreground": "Text on `accent`.",
  border: "Default decorative border of cards, inputs containers, separators (`border-border`).",
  "border-subtle": "Hairline inside `surface-subtle` containers and between list rows (`divide-border-subtle`).",
  input: "Form field fill tint (`bg-input/30` in dark mode).",
  "input-border": "Form-control outline (≥ 3:1 vs. card and background, WCAG 1.4.11).",
  ring: "Focus ring (`focus-visible:ring-2 ring-ring`), ≥ 3:1 in both themes.",
  brand: "Flaner amber. Primary call-to-action fill, active nav, count badges, highlights. Text on it: `brand-foreground`.",
  "brand-dark": "End of the brand gradient (avatar fallbacks: `from-brand to-brand-dark`).",
  "brand-foreground": "Ink on `brand` fills (10:1). Never white on brand.",
  "brand-text": "Brand-coloured text and icons on `background` / `card` (dark amber in light mode, AA).",
  "brand-subtle": "Tinted brand background: icon tiles (`PageHeader`, `EmptyState`), selected rows.",
  "chart-positive": "Diverging data: positive balance (= `success`).",
  "chart-negative": "Diverging data: negative balance (= `danger`).",
  destructive: "shadcn alias of `danger` (destructive buttons, invalid fields).",
  "destructive-foreground": "Text on `destructive`.",
};

const STATUS = { success: "success / done / “yes”", warning: "warning / pending / “maybe”", danger: "error / destructive / “no”", info: "neutral information" };

function colorUsage(name) {
  if (COLOR_USAGE[name]) return COLOR_USAGE[name];
  const status = /^(success|warning|danger|info)(?:-(foreground|text|subtle))?$/.exec(name);
  if (status) {
    const meaning = STATUS[status[1]];
    return {
      undefined: `Solid ${meaning} fill (badges, active toggle). Text on it: \`${status[1]}-foreground\`.`,
      foreground: `Text and icons on a solid \`${status[1]}\` fill.`,
      text: `${meaning} text / icon on \`background\`, \`card\` or \`${status[1]}-subtle\` (AA).`,
      subtle: `Tinted ${meaning} background (alerts, status pills) with \`${status[1]}-text\` on it.`,
    }[status[2]];
  }
  const vote = /^vote-(yes|maybe|no)(?:-(\w+))?$/.exec(name);
  if (vote) return `Domain (planning votes): “${vote[1]}” ${vote[2] ?? "fill"} — alias of \`${{ yes: "success", maybe: "warning", no: "danger" }[vote[1]]}${vote[2] ? `-${vote[2]}` : ""}\`.`;
  if (name.startsWith("medal-")) return `Domain (planning ranking): ${name.slice(6)} medal text / icon (AA).`;
  if (/^chart-\d$/.test(name)) return `Categorical data-viz series ${name.slice(6)} (≥ 3:1 vs. background). Use in order.`;
  if (name.startsWith("event-")) return `Domain (scheduler): user-chosen event slot colour “${name.slice(6)}”; ink text on it.`;
  if (name.startsWith("sidebar")) return `shadcn sidebar role \`${name}\` (app shell navigation).`;
  if (name.startsWith("scrollbar")) return "Scrollbar thumb (global, set in theme.css).";
  throw new Error(`No usage note for colour token "${name}" — add one to COLOR_USAGE`);
}

const SHADOW_USAGE = {
  raised: "Cards and raised rows (`Card` default).",
  overlay: "Popovers, dropdowns, hovered interactive cards.",
  modal: "Dialogs and sheets.",
  edge: "Sticky first column of scrollable grids.",
  drawer: "Side panel / drawer edge.",
  "glow-brand": "Brand highlight around a selected / featured element.",
  "glow-warning": "Pending highlight (warning).",
  "glow-danger": "Error highlight (danger).",
  "dot-warning": "Glow of a small warning status dot.",
};

const RADIUS_USAGE = {
  xs: "Tiny marks (calendar dots, micro badges). Tailwind default.",
  sm: "Checkbox, small chips.",
  md: "Small buttons, menu items.",
  lg: "Inputs and buttons (`rounded-lg`).",
  xl: "List rows (`ListItem variant=card`), icon tiles, tab list.",
  "2xl": "Cards (`rounded-2xl`), empty states.",
  "3xl": "Sheets and modals (`rounded-3xl`).",
  "4xl": "Large hero surfaces (rare).",
  full: "Pills, avatars, count badges (`rounded-full`). Tailwind default.",
};

// Tailwind v4 defaults the theme builds on (not redefined in theme.css).
const TAILWIND_TEXT = [
  ["xs", "0.75rem", "1rem", "Helper text, small buttons."],
  ["sm", "0.875rem", "1.25rem", "Default UI body: list titles, inputs, buttons, descriptions."],
  ["base", "1rem", "1.5rem", "Long-form body."],
  ["lg", "1.125rem", "1.75rem", "Section and card titles, empty-state titles (semibold)."],
  ["xl", "1.25rem", "1.75rem", "Dialog titles."],
  ["2xl", "1.5rem", "2rem", "Page title on mobile (`PageHeader`: font-black, tracking-tight)."],
  ["3xl", "1.875rem", "2.25rem", "Page title from `sm` up (`PageHeader`)."],
];
const CUSTOM_TEXT_USAGE = {
  "5xs": "Dense calendar grid only.",
  "4xs": "Dense grids (availability grid, slot badges) only.",
  "3xs": "Counters, calendar micro-labels, “added <date>” meta.",
  "2xs": "Meta, captions, badges.",
};

const SPACING = [
  [1, "Icon-to-label gap inside chips."],
  [2, "Gap between buttons in a row; gap inside small groups."],
  [3, "Gap between list rows; `Card padding=sm`; `PageHeader` gap."],
  [4, "Card padding (`Card padding=md`), page side padding on mobile, grid gap."],
  [5, "Card padding from `sm` up."],
  [6, "Gap between page sections (`gap-6` / `space-y-6`), page padding from `sm` up."],
  [8, "Large section separation."],
  [10, "Empty state vertical padding (`EmptyState size=md`)."],
  [16, "Spacious empty states inside tabs."],
];

const TAILWIND_BREAKPOINTS = [
  ["sm", "640px", "Small tablets: two-column grids, larger page title."],
  ["md", "768px", "Tablets: friend / group grids switch to 2 columns."],
  ["lg", "1024px", "Laptops."],
];
const CUSTOM_BREAKPOINT_USAGE = {
  xs: "Large phones (≥ 360px).",
  desktop: "Desktop layout: side panels become columns.",
  split: "Split views (list + detail side by side).",
  calendar: "Planning calendar: full week grid.",
  wide: "Wide screens: extra calendar columns.",
};

// ---------------------------------------------------------------------------------------------
// tokens.json
// ---------------------------------------------------------------------------------------------

export function buildTokens(theme, { fonts = [], meta } = {}) {
  const perTheme = (fn) => Object.fromEntries(THEMES.map(({ id }) => [id, fn(id)]));

  const colors = [];
  for (const [key, expr] of theme.inline) {
    if (!key.startsWith("color-")) continue;
    const name = key.slice("color-".length);
    colors.push({ name, value: perTheme((id) => resolveColor(theme, expr, id)), usage: colorUsage(name) });
  }

  const shadows = [];
  for (const [key, expr] of theme.static) {
    if (!key.startsWith("shadow-")) continue;
    const name = key.slice("shadow-".length);
    const value = perTheme((id) => resolveInline(theme, expr, id));
    shadows.push({ name: key, value: value.light === value.dark ? value.light : value, usage: SHADOW_USAGE[name] ?? `Shadow \`${key}\`.` });
  }

  const base = Number.parseFloat(theme.root.get("radius")) * 16;
  const radius = [{ name: "radius-xs", value: "2px", usage: RADIUS_USAGE.xs }];
  for (const [key, expr] of theme.inline) {
    if (!key.startsWith("radius-")) continue;
    const factor = /\*\s*([\d.]+)/.exec(expr);
    const px = round(base * (factor ? Number(factor[1]) : 1));
    radius.push({ name: key, value: `${px}px`, usage: RADIUS_USAGE[key.slice(7)] });
  }
  radius.push({ name: "radius-full", value: "9999px", usage: RADIUS_USAGE.full });

  // Style names must not equal Tailwind utilities: tokens.css is unlayered and would override `font-*` utilities.
  const styles = [];
  for (const [key, size] of theme.static) {
    const m = /^text-(\w+)$/.exec(key);
    if (!m) continue;
    styles.push({ name: `type-${m[1]}`, fontSize: remToPx(size), lineHeight: remToPx(theme.static.get(`${key}--line-height`)), fontWeight: 400, usage: `\`${key}\` — ${CUSTOM_TEXT_USAGE[m[1]]}` });
  }
  styles.sort((a, b) => Number.parseFloat(a.fontSize) - Number.parseFloat(b.fontSize));
  for (const [name, size, lineHeight, usage] of TAILWIND_TEXT) {
    styles.push({ name: `type-${name}`, fontSize: remToPx(size), lineHeight: remToPx(lineHeight), fontWeight: 400, usage: `\`text-${name}\` — ${usage}` });
  }
  const sans = theme.static.get("font-sans");

  const breakpoints = [
    ...TAILWIND_BREAKPOINTS.map(([name, value, usage]) => ({ name: `breakpoint-${name}`, value, usage })),
    ...[...theme.static]
      .filter(([key]) => key.startsWith("breakpoint-"))
      .map(([key, value]) => ({ name: key, value, usage: CUSTOM_BREAKPOINT_USAGE[key.slice(11)] })),
  ].sort((a, b) => Number.parseFloat(a.value) - Number.parseFloat(b.value));

  return {
    name: "Flaner",
    version: 1,
    ...(meta ? { meta } : {}),
    color: { themes: THEMES, tokens: colors },
    type: {
      fonts: fonts.map(({ file }) => ({ family: "Geist Variable", file, weight: "100 900", style: "normal" })),
      families: { sans },
      groups: [
        {
          name: "Text",
          family: "sans",
          styles: [
            ...styles,
            { name: "type-page-title", fontSize: "30px", lineHeight: "36px", fontWeight: 900, letterSpacing: "-0.025em", usage: "`PageHeader` title (`text-2xl sm:text-3xl font-black tracking-tight`)." },
          ],
        },
      ],
    },
    spacing: { note: "Tailwind's 4px scale (`p-4` = 16px); no custom spacing tokens.", tokens: SPACING.map(([step, usage]) => ({ name: `space-${step}`, value: `${step * 4}px`, usage })) },
    radius: { tokens: radius },
    shadow: { tokens: shadows },
    breakpoint: { note: "Mobile-first: style for phones, then add `sm:` / `md:` / `desktop:` overrides.", tokens: breakpoints },
  };
}

// ---------------------------------------------------------------------------------------------
// tokens.css — laid out as the Design System page compiles it (the page never saves a code-synced system)
// ---------------------------------------------------------------------------------------------

export function buildTokensCss(tokens, fontFaces = []) {
  const [first, ...rest] = tokens.color.themes.map((t) => t.id);
  const themed = [...tokens.color.tokens, ...tokens.shadow.tokens];
  const valueFor = (token, id) => (typeof token.value === "string" ? token.value : token.value[id] ?? token.value[first]);
  const lines = [`/* ${tokens.name} — generated from tokens.json */`];

  lines.push(`:root, [data-theme="${first}"] {`);
  for (const t of themed) lines.push(`  --${t.name}: ${valueFor(t, first)};`);
  lines.push("}");
  for (const id of rest) {
    lines.push(`[data-theme="${id}"] {`);
    for (const t of themed) if (typeof t.value !== "string" && t.value[id] !== t.value[first]) lines.push(`  --${t.name}: ${t.value[id]};`);
    lines.push("}");
  }

  lines.push(":root {");
  for (const t of [...tokens.spacing.tokens, ...tokens.radius.tokens, ...tokens.breakpoint.tokens]) lines.push(`  --${t.name}: ${t.value};`);
  for (const [key, stack] of Object.entries(tokens.type.families)) lines.push(`  --font-${key}: ${stack};`);
  lines.push("}");

  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      const decl = [`font-family: var(--font-${s.family ?? group.family})`, `font-size: ${s.fontSize}`, `line-height: ${s.lineHeight}`, `font-weight: ${s.fontWeight}`];
      if (s.letterSpacing) decl.push(`letter-spacing: ${s.letterSpacing}`);
      lines.push(`.${s.name} { ${decl.join("; ")}; }`);
    }
  }
  lines.push(...fontFaces);
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------------------------
// Components — Storybook stories → bundle, previews, guidelines, types
// ---------------------------------------------------------------------------------------------

/** "Primitives/DropdownMenu" → "DropdownMenu", "Patterns/Page shell" → "PageShell" (same rule as `.storybook/design-system.tsx`). */
export const cardName = (title) =>
  (title.split("/").pop() ?? title)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

/** Title and story names of a CSF file; `null` for the Foundations stories (tokens are shown by the page itself). */
export function parseStories(source, file) {
  const title = /^\s*title:\s*"([^"]+)"/m.exec(source)?.[1];
  if (!title) throw new Error(`No meta title in ${file}`);
  if (title.startsWith("Foundations/")) return null;
  const stories = [...source.matchAll(/^export const (\w+)\s*[:=]/gm)].map((m) => m[1]);
  return { name: cardName(title), title, group: title.split("/")[0], file, stories };
}

/** Component → { need, notes } from the brand book's "Components" table; pattern → text from its "Patterns" list. */
export function parseComponentGuides(markdown) {
  const guides = new Map();
  const section = (heading) => markdown.split(/^## /m).find((s) => s.startsWith(heading)) ?? "";
  for (const row of section("Components").split("\n")) {
    const cells = row.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3 || cells[0] === "Need" || cells[0].startsWith("---")) continue;
    const [need, names, notes] = cells;
    for (const m of names.matchAll(/`(\w+)`/g)) if (!guides.has(m[1])) guides.set(m[1], { need, notes });
  }
  for (const m of section("Patterns").matchAll(/^- \*\*([^*]+)\*\*: (.+)$/gm)) guides.set(`pattern:${m[1]}`, { need: m[1], notes: m[2] });
  return guides;
}

const PATTERN_FOR = { PageShell: "Page", Form: "Forms" };

export function componentReadme(card, guides, { exported }) {
  const guide = card.group === "Patterns" ? guides.get(`pattern:${PATTERN_FOR[card.name]}`) : guides.get(card.name);
  if (!guide) throw new Error(`No brand-book entry for ${card.title} — add it to the Components table (or Patterns list) in brand-book.md`);
  const lines = [`# ${card.name}`, "", `${guide.need}.${guide.notes ? ` ${guide.notes}` : ""}`, ""];
  if (exported) {
    lines.push(`- Code: \`import { ${card.name} } from "@flaner/ui-components";\` — in a design: \`window.Flaner.${card.name}\` (React).`);
  } else {
    lines.push(`- Pattern composed from the components above; not a single export.`);
  }
  lines.push(`- Stories shown in the preview: ${card.stories.join(", ")} (\`packages/ui-components/${card.file}\`).`);
  lines.push("- Follow the brand book: tokens only, both themes, mobile-first.", "");
  return lines.join("\n");
}

/** README section an agent reads to load and mount the components (the page writes none for a code-synced system). */
export function consumingSection(components) {
  return [
    "",
    "## Consuming this system",
    "",
    "- Namespace: `window.Flaner` — every `@flaner/ui-components` export (React components, the same code as the app) plus `Flaner.Icon`.",
    "- On a Design canvas load, after `support.js`: `tokens.css`, then `components/bundle.css`, then `components/bundle.js`. Do not load `components/lib/*` — the canvas supplies React; those two files are React 19 for this system's own previews.",
    "- Mount: `<x-import component-from-global-scope=\"Flaner.Button\" variant=\"brand\">Create group</x-import>`; parts the same way (`Flaner.CardHeader`, `Flaner.TabsList`, `Flaner.TabsTrigger`). Props and their values: `components/<Name>/<Name>.d.ts` (all in `components/index.d.ts`), guidelines: `components/<Name>/README.md`.",
    "- Icons: `<x-import component-from-global-scope=\"Flaner.Icon\" name=\"Users\"></x-import>` — any lucide icon by its PascalCase name (`Users`, `UserMinus`, `Search`, `Inbox`, `Plus`); `class=\"size-4\"` / `size-5` / `size-6`.",
    "- Props that take a React node (`PageHeader` `icon` / `actions`, `ListItem` `leading` / `trailing`, `EmptyState` `icon` / `action`) are set from `renderVals()`: `icon: React.createElement(Flaner.Icon, { name: \"Users\" })` bound as `icon=\"{{icon}}\"`. Children go as element content (nested `x-import`s or markup).",
    "- Theme: light by default. A dark artboard wraps its content in `<div class=\"dark\" style=\"background: var(--background); color: var(--foreground)\">` — every token and component inside switches to dark.",
    "- Plain markup between components uses the tokens as CSS variables (`var(--card)`, `var(--muted-foreground)`, `var(--radius-2xl)`, `var(--shadow-raised)`); Tailwind utilities exist only where the components already use them, so do not rely on new utility classes.",
    "- Overlays (`Dialog`, `Sheet`, `ConfirmationPopup`) render open with `open=\"{{yes}}\"`; one per artboard.",
    `- Live components: ${components.map((name) => `\`${name}\``).join(", ")}.`,
    "",
  ].join("\n");
}

export function previewHtml(card) {
  return [
    `<!-- @dsCard group="${card.group}" -->`,
    "<!doctype html>",
    `<html><head><meta charset="utf-8"><title>${card.name} — preview</title></head>`,
    `<body><div id="root"></div><script>window.Flaner.renderStories(document.getElementById("root"), ${JSON.stringify(card.name)});</script></body></html>`,
    "",
  ].join("\n");
}

/**
 * Consumers inline the scripts: a literal `</script` or `<!--` would end or escape the element.
 * U+FFFD (minified string literals of CSS.escape / entity decoders) is refused by the artifact upload: escape it.
 */
export const inlineSafe = (js) => js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3C!--").replace(/\uFFFD/g, "\\uFFFD");

const BUILD = join(ROOT, ".design-system", "build");
const UI = join(ROOT, "packages/ui-components");

async function viteIife({ entry, outDir, fileName, name, globals = {}, plugins = [] }) {
  const { build } = await import("vite");
  await build({
    configFile: false,
    root: UI,
    logLevel: "warn",
    plugins,
    // CommonJS packages `require("react")`, which an IIFE cannot resolve: point them at the globals instead.
    resolve: {
      alias: [
        ...Object.entries(globals).map(([module, global]) => ({ find: new RegExp(`^${module}$`), replacement: globalShim(global) })),
        ...(globals.react ? [{ find: /^react\/jsx-(dev-)?runtime$/, replacement: jsxRuntimeShim() }] : []),
      ],
    },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir,
      emptyOutDir: false,
      minify: true,
      cssCodeSplit: false,
      lib: { entry, name, formats: ["iife"], fileName: () => fileName, cssFileName: "bundle" },
    },
  });
}

function globalShim(global) {
  mkdirSync(BUILD, { recursive: true });
  const file = join(BUILD, `global-${global}.cjs`);
  writeFileSync(file, `module.exports = window.${global};\n`);
  return file;
}

/**
 * Elements must come from the HOST React: the Design canvas supplies React 18, the system's previews React 19.
 * A bundled `react/jsx-runtime` (19) would tag elements React 18 cannot render, so JSX goes through `window.React.createElement`.
 */
function jsxRuntimeShim() {
  mkdirSync(BUILD, { recursive: true });
  const file = join(BUILD, "jsx-runtime.cjs");
  writeFileSync(
    file,
    [
      "const React = window.React;",
      "const jsx = (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key });",
      "module.exports = { Fragment: React.Fragment, jsx, jsxs: jsx, jsxDEV: jsx };",
      "",
    ].join("\n"),
  );
  return file;
}

/** React 19 has no UMD build: wrap it into classic scripts that set `window.React` / `window.ReactDOM`. */
async function buildLibraries(outDir) {
  mkdirSync(BUILD, { recursive: true });
  writeFileSync(join(BUILD, "react.mjs"), 'import * as React from "react";\nwindow.React = { ...React, default: React };\n');
  writeFileSync(
    join(BUILD, "react-dom.mjs"),
    'import * as ReactDOM from "react-dom";\nimport * as ReactDOMClient from "react-dom/client";\nwindow.ReactDOM = { ...ReactDOM, ...ReactDOMClient };\nwindow.ReactDOM.default = window.ReactDOM;\n',
  );
  await viteIife({ entry: join(BUILD, "react.mjs"), outDir, fileName: "react.js", name: "FlanerReactLib" });
  await viteIife({ entry: join(BUILD, "react-dom.mjs"), outDir, fileName: "react-dom.js", name: "FlanerReactDomLib", globals: { react: "React" } });
  const version = JSON.parse(readFileSync(join(ROOT, "node_modules/react/package.json"), "utf8")).version;
  return [
    { name: "react", version, global: "React", file: "components/lib/react.js" },
    { name: "react-dom", version, global: "ReactDOM", file: "components/lib/react-dom.js" },
  ];
}

async function buildBundle(outDir) {
  const { default: react } = await import("@vitejs/plugin-react");
  const { default: tailwindcss } = await import("@tailwindcss/vite");
  await viteIife({
    entry: join(UI, ".storybook/design-system.tsx"),
    outDir,
    fileName: "bundle.js",
    name: "Flaner",
    globals: { react: "React", "react-dom": "ReactDOM", "react-dom/client": "ReactDOM" },
    plugins: [react(), tailwindcss()],
  });
}

/** `.d.ts` of each card (its styles file first, for the CVA variant unions) — documentation for the page's props cards. */
function buildTypes(cards) {
  const typesDir = join(BUILD, "types");
  rmSync(typesDir, { recursive: true, force: true });
  execSync(`npx tsc -p packages/ui-components/tsconfig.lib.json --noEmit false --declaration --emitDeclarationOnly --declarationDir "${typesDir}" --tsBuildInfoFile "${join(BUILD, "types.tsbuildinfo")}"`, { cwd: ROOT, stdio: "inherit" });
  const clean = (dts) =>
    dts
      .split("\n")
      .filter((line) => !/^import |^export \{\};|^\/\/# sourceMappingURL/.test(line))
      .join("\n")
      .trim();
  const types = new Map();
  for (const card of cards) {
    // Declarations land under the common root of the program (`packages/`), since ui-components imports shared
    const base = card.file.replace(/\.stories\.tsx$/, "");
    const files = [`${base}.styles.d.ts`, `${base}.d.ts`].map((f) => join(typesDir, "ui-components", f)).filter((f) => existsSync(f));
    if (files.length) types.set(card.name, files.map((f) => clean(readFileSync(f, "utf8"))).join("\n\n"));
  }
  return types;
}

/** Renders every preview headless; returns the card names exported on `window.Flaner` and fails on errors or blank cards. */
async function renderCheck(cards, project, shotsDir) {
  const { chromium } = await import("@playwright/test");
  const read = (path) => readFileSync(join(project, path), "utf8");
  // CHROMIUM_PATH: a preinstalled Chromium when Playwright's own browser is not downloaded (e.g. cloud sessions)
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const exported = new Set();
  const problems = [];
  mkdirSync(shotsDir, { recursive: true });
  try {
    for (const card of cards) {
      for (const theme of THEMES.map((t) => t.id)) {
        const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
        await page.setContent(`<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`);
        // Fonts: bundle.css inlines Geist; file:// fonts from tokens.css would be blocked on about:blank
        await page.addStyleTag({ content: read("tokens.css").replace(/@font-face[^}]*\}/g, "") });
        await page.addStyleTag({ content: read("components/bundle.css") });
        for (const lib of ["components/lib/react.js", "components/lib/react-dom.js", "components/bundle.js"]) await page.addScriptTag({ content: read(lib) });
        if (await page.evaluate((name) => typeof window.Flaner?.[name] !== "undefined", card.name)) exported.add(card.name);
        await page.evaluate((name) => window.Flaner.renderStories(document.getElementById("root"), name), card.name);
        await page.waitForTimeout(400);
        const height = await page.evaluate(() => document.getElementById("root").getBoundingClientRect().height);
        if (errors.length) problems.push(`${card.name} (${theme}): ${errors[0]}`);
        else if (height < 40) problems.push(`${card.name} (${theme}): blank preview`);
        await page.screenshot({ path: join(shotsDir, `${card.name}-${theme}.png`), fullPage: true });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (problems.length) throw new Error(`Preview render check failed:\n  ${problems.join("\n  ")}`);
  return exported;
}

async function exportComponents() {
  const cards = readdirSync(join(UI, "src"), { recursive: true })
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => f.endsWith(".stories.tsx"))
    .sort()
    .map((f) => parseStories(readFileSync(join(UI, "src", f), "utf8"), `src/${f}`))
    .filter(Boolean);
  const guides = parseComponentGuides(readFileSync(join(ROOT, SKILL_DIR, "brand-book.md"), "utf8"));
  for (const card of cards) componentReadme(card, guides, { exported: false }); // fail fast on a missing brand-book entry

  const componentsDir = join(OUT, "components");
  const libraries = await buildLibraries(join(componentsDir, "lib"));
  await buildBundle(componentsDir);
  for (const file of ["lib/react.js", "lib/react-dom.js", "bundle.js"]) {
    const path = join(componentsDir, file);
    writeFileSync(path, inlineSafe(readFileSync(path, "utf8")));
  }

  const exported = await renderCheck(cards, OUT, join(BUILD, "check"));
  const header = { format: 4, namespace: "Flaner", components: cards.filter((c) => exported.has(c.name)).map((c) => ({ name: c.name })) };
  writeFileSync(join(componentsDir, "bundle.js"), `/* @ds-bundle: ${JSON.stringify(header)} */\n${readFileSync(join(componentsDir, "bundle.js"), "utf8")}`);

  writeFileSync(join(OUT, "README.md"), `${readFileSync(join(OUT, "README.md"), "utf8").trimEnd()}\n${consumingSection(header.components.map((c) => c.name))}`);

  const types = buildTypes(cards.filter((c) => exported.has(c.name)));
  writeFileSync(join(componentsDir, "index.d.ts"), `import type * as React from "react";\n\n${[...types.values()].join("\n\n")}\n`);
  for (const card of cards) {
    const dir = join(componentsDir, card.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "preview.html"), previewHtml(card));
    writeFileSync(join(dir, "README.md"), componentReadme(card, guides, { exported: exported.has(card.name) }));
    if (types.has(card.name)) writeFileSync(join(dir, `${card.name}.d.ts`), `import type * as React from "react";\n\n${types.get(card.name)}\n`);
  }
  return { cards, libraries, exported };
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function fontFaceFor(file) {
  const index = readFileSync(join(ROOT, FONT_DIR, "index.css"), "utf8");
  const rule = index.split("@font-face").find((r) => r.includes(`/${file}`));
  const range = rule && /unicode-range:\s*([^;]+);/.exec(rule);
  return `@font-face { font-family: "Geist Variable"; font-style: normal; font-display: swap; font-weight: 100 900; src: url("fonts/${file}") format("woff2-variations");${range ? ` unicode-range: ${range[1]};` : ""} }`;
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const theme = parseTheme(readFileSync(join(ROOT, THEME), "utf8"));
  // `.design-system/screens/` (npm run design:screens) survives a re-export; project/ and build/ are regenerated
  rmSync(OUT, { recursive: true, force: true });
  rmSync(BUILD, { recursive: true, force: true });
  for (const dir of ["fonts", "assets/Logos", "components/Cover"]) mkdirSync(join(OUT, dir), { recursive: true });

  for (const file of FONT_FILES) copyFileSync(join(ROOT, FONT_DIR, "files", file), join(OUT, "fonts", file));
  copyFileSync(join(ROOT, LOGO), join(OUT, "assets/Logos/flaner-icon.png"));
  writeFileSync(
    join(OUT, "assets/Logos/README.md"),
    "`flaner-icon.png` — PWA / home-screen icon (277×277, transparent). App icon only; its blue → violet gradient is not a UI colour. In the UI the mark is typographic (see the README, Logo).\n",
  );
  const screens = existsSync(SCREENS) ? readdirSync(SCREENS).filter((f) => f.endsWith(".png")) : [];
  if (screens.length) {
    mkdirSync(join(OUT, "assets/Screens"), { recursive: true });
    for (const file of screens) copyFileSync(join(SCREENS, file), join(OUT, "assets/Screens", file));
    writeFileSync(
      join(OUT, "assets/Screens/README.md"),
      "Screenshots of the running app (`npm run design:screens`, emulators with seeded data): `<view>-<theme>-<mobile|desktop>.png` at 390×844 and 1440×900. Reference for density, rhythm and the app shell — the tokens and components win where they differ.\n",
    );
  }
  copyFileSync(join(ROOT, SKILL_DIR, "brand-book.md"), join(OUT, "README.md"));
  copyFileSync(join(ROOT, SKILL_DIR, "cover.html"), join(OUT, "components/Cover/preview.html"));

  const meta = {
    source: "github",
    repo: "Marcin-Migdal/Flaner",
    ref: `${git("rev-parse --abbrev-ref HEAD")}@${git("rev-parse --short HEAD")}`,
    package: "packages/ui-components",
    paths: { tokens: [THEME], fonts: [FONT_DIR], assets: [LOGO], docs: [`${SKILL_DIR}/brand-book.md`, ".agents/docs/design-system.md"] },
    synced: new Date().toISOString().slice(0, 10),
  };
  const tokens = buildTokens(theme, { fonts: FONT_FILES.map((file) => ({ file: `fonts/${file}` })), meta });
  writeFileSync(join(OUT, "tokens.json"), `${JSON.stringify(tokens, null, 2)}\n`);
  writeFileSync(join(OUT, "tokens.css"), buildTokensCss(tokens, FONT_FILES.map(fontFaceFor)));

  const { cards, libraries, exported } = await exportComponents();
  writeFileSync(join(BUILD, "libraries.json"), `${JSON.stringify(libraries, null, 2)}\n`);

  console.log(`Design system exported to ${OUT}`);
  console.log(`  ${tokens.color.tokens.length} colours × ${THEMES.length} themes, ${cards.length} component cards (${exported.size} live exports), ref ${meta.ref}`);
  console.log(`  preview screenshots: ${join(BUILD, "check")}`);
  console.log('Next: ask Claude Code to "re-sync the Flaner design system" (flaner-design skill).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
