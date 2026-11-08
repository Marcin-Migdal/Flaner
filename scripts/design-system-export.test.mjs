// Run: node --test scripts/design-system-export.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildTokens, buildTokensCss, parseTheme, resolveColor } from "./design-system-export.mjs";

const fixture = `
@theme {
  --font-sans: "Geist Variable", sans-serif;
  --text-2xs: 0.6875rem;
  --text-2xs--line-height: 1rem;
  --breakpoint-desktop: 1080px;
  --shadow-glow-brand: 0 0 15px -3px color-mix(in oklch, var(--p-brand) 15%, transparent);
  --shadow-glow-danger: 0 0 10px color-mix(in oklch, var(--danger) 30%, transparent);
}
:root {
  /* primitives */
  --p-brand: #EDAD5E;
  --p-white: oklch(1 0 0);
  --background: oklch(0.95 0.007 80);
  --card: var(--p-white);
  --danger: oklch(0.52 0.19 25);
  --brand-subtle: color-mix(in oklch, var(--p-brand) 15%, transparent);
  --status-subtle-mix: 12%;
  --radius: 0.625rem;
}
.dark {
  --background: oklch(0.145 0 0);
  --card: oklch(1 0 0 / 5%);
  --danger: oklch(0.7 0.19 22);
  --status-subtle-mix: 15%;
}
@theme inline {
  --color-background: var(--background);
  --color-card: var(--card);
  --color-brand-subtle: var(--brand-subtle);
  --color-danger: var(--danger);
  --color-danger-subtle: color-mix(in oklch, var(--danger) var(--status-subtle-mix), transparent);
  --color-on-media: var(--p-white);
  --radius-lg: var(--radius);
  --radius-2xl: calc(var(--radius) * 1.8);
}
@layer base { * { --ignored: red; } }
`;

const theme = parseTheme(fixture);

test("resolves var() chains per theme, dark falling back to :root", () => {
  assert.equal(resolveColor(theme, "var(--card)", "light"), "oklch(1 0 0)");
  assert.equal(resolveColor(theme, "var(--card)", "dark"), "oklch(1 0 0 / 5%)");
  assert.equal(resolveColor(theme, "var(--color-on-media)", "dark"), "oklch(1 0 0)");
});

test("turns color-mix with transparent into the colour with alpha", () => {
  assert.equal(resolveColor(theme, "var(--brand-subtle)", "light"), "#edad5e26");
  assert.equal(resolveColor(theme, "var(--color-danger-subtle)", "light"), "oklch(0.52 0.19 25 / 12%)");
  assert.equal(resolveColor(theme, "var(--color-danger-subtle)", "dark"), "oklch(0.7 0.19 22 / 15%)");
  assert.equal(resolveColor(theme, "color-mix(in oklch, var(--card) 50%, transparent)", "dark"), "oklch(1 0 0 / 2.5%)");
});

test("builds list-shaped tokens with light first and a usage note on each", () => {
  const tokens = buildTokens(theme);
  assert.deepEqual(tokens.color.themes.map((t) => t.id), ["light", "dark"]);
  assert.deepEqual(tokens.color.tokens.map((t) => t.name), ["background", "card", "brand-subtle", "danger", "danger-subtle", "on-media"]);
  assert.deepEqual(tokens.color.tokens[0].value, { light: "oklch(0.95 0.007 80)", dark: "oklch(0.145 0 0)" });
  for (const family of [tokens.color, tokens.radius, tokens.shadow, tokens.spacing, tokens.breakpoint]) {
    for (const token of family.tokens) assert.ok(token.usage, `missing usage: ${token.name}`);
  }
});

test("computes radii, type styles, shadows and breakpoints", () => {
  const tokens = buildTokens(theme);
  assert.deepEqual(tokens.radius.tokens.map((t) => [t.name, t.value]), [["radius-xs", "2px"], ["radius-lg", "10px"], ["radius-2xl", "18px"], ["radius-full", "9999px"]]);
  assert.deepEqual(tokens.type.groups[0].styles[0], { name: "text-2xs", fontSize: "11px", lineHeight: "16px", fontWeight: 400, usage: "Meta, captions, badges." });
  const glow = tokens.shadow.tokens.find((t) => t.name === "shadow-glow-danger");
  assert.deepEqual(glow.value, { light: "0 0 10px oklch(0.52 0.19 25 / 30%)", dark: "0 0 10px oklch(0.7 0.19 22 / 30%)" });
  assert.equal(tokens.shadow.tokens.find((t) => t.name === "shadow-glow-brand").value, "0 0 15px -3px #edad5e26");
  assert.ok(tokens.breakpoint.tokens.some((t) => t.name === "breakpoint-desktop" && t.value === "1080px"));
});

test("fails loudly on a colour token without a usage note", () => {
  const unknown = parseTheme(":root { --x: #000000; }\n@theme inline { --color-mystery: var(--x); }");
  assert.throws(() => buildTokens(unknown), /No usage note/);
});

test("tokens.css declares the first theme on :root and only overrides in later themes", () => {
  const css = buildTokensCss(buildTokens(theme));
  assert.match(css, /^\/\* Flaner — generated from tokens.json \*\//);
  assert.match(css, /:root, \[data-theme="light"\] \{\n {2}--background: oklch\(0\.95 0\.007 80\);/);
  assert.match(css, /\[data-theme="dark"\] \{[^}]*--card: oklch\(1 0 0 \/ 5%\);/);
  assert.doesNotMatch(css.split('[data-theme="dark"]')[1], /--on-media/);
});

test("the real theme.css exports without errors", () => {
  const real = parseTheme(readFileSync(new URL("../packages/ui-components/src/theme/theme.css", import.meta.url), "utf8"));
  const tokens = buildTokens(real);
  assert.ok(tokens.color.tokens.length > 80);
  for (const t of tokens.color.tokens) {
    for (const value of Object.values(t.value)) assert.match(value, /^(#[0-9a-f]{6,8}|oklch\([^()]+\))$/, t.name);
  }
});
