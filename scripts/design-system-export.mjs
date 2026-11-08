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
 *
 * Usage: npm run design:export   (then ask Claude Code to "re-sync the Flaner design system",
 * see the `flaner-design` skill). Tests: node --test scripts/design-system-export.test.mjs
 */
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".design-system", "project");
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

  const styles = [];
  for (const [key, size] of theme.static) {
    const m = /^text-(\w+)$/.exec(key);
    if (!m) continue;
    styles.push({ name: key, fontSize: remToPx(size), lineHeight: remToPx(theme.static.get(`${key}--line-height`)), fontWeight: 400, usage: CUSTOM_TEXT_USAGE[m[1]] });
  }
  styles.sort((a, b) => Number.parseFloat(a.fontSize) - Number.parseFloat(b.fontSize));
  for (const [name, size, lineHeight, usage] of TAILWIND_TEXT) {
    styles.push({ name: `text-${name}`, fontSize: remToPx(size), lineHeight: remToPx(lineHeight), fontWeight: 400, usage });
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
            { name: "page-title", fontSize: "30px", lineHeight: "36px", fontWeight: 900, letterSpacing: "-0.025em", usage: "`PageHeader` title (`text-2xl sm:text-3xl font-black tracking-tight`)." },
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

function main() {
  const theme = parseTheme(readFileSync(join(ROOT, THEME), "utf8"));
  rmSync(OUT, { recursive: true, force: true });
  for (const dir of ["fonts", "assets/Logos", "components/Cover"]) mkdirSync(join(OUT, dir), { recursive: true });

  for (const file of FONT_FILES) copyFileSync(join(ROOT, FONT_DIR, "files", file), join(OUT, "fonts", file));
  copyFileSync(join(ROOT, LOGO), join(OUT, "assets/Logos/flaner-icon.png"));
  writeFileSync(
    join(OUT, "assets/Logos/README.md"),
    "`flaner-icon.png` — PWA / home-screen icon (277×277, transparent). App icon only; its blue → violet gradient is not a UI colour. In the UI the mark is typographic (see the README, Logo).\n",
  );
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

  console.log(`Design system exported to ${OUT} (${tokens.color.tokens.length} colours × ${THEMES.length} themes, ref ${meta.ref}).`);
  console.log('Next: ask Claude Code to "re-sync the Flaner design system" (flaner-design skill).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
