// Fails when component code bypasses the design tokens (#61).
// Run: npm run lint:tokens. Spec: .agents/docs/design-system.md (D17).
// Escape hatch for a deliberate exception: put `design-tokens-ignore` in a comment on the line.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAW_HUES =
  "zinc|neutral|gray|slate|stone|red|green|emerald|amber|orange|yellow|blue|sky|indigo|violet|purple|pink|rose|teal|cyan|lime|fuchsia|white|black";
const COLOR_UTILITIES =
  "bg|text|border|border-[trblxy]|ring|ring-offset|from|to|via|fill|stroke|shadow|outline|divide|accent|caret|decoration|placeholder";

export const RULES = [
  {
    id: "raw-color",
    message: "raw Tailwind palette colour — use a semantic token (bg-surface-subtle, text-success-text, text-on-media…)",
    pattern: new RegExp(`(?<![\\w-])(?:${COLOR_UTILITIES})-(?:${RAW_HUES})(?:-\\d{2,3})?(?![\\w-])`),
  },
  {
    id: "arbitrary-color",
    message: "arbitrary colour value in a class — add or use a token in theme.css",
    pattern: /\[[^\]\s"]*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\()/,
  },
  {
    id: "arbitrary-font-size",
    message: "arbitrary font size — use text-5xs…text-3xl",
    pattern: /(?<![\w-])text-\[\d/,
    allowInPrimitives: true,
  },
  {
    id: "arbitrary-shadow",
    message: "arbitrary shadow — use shadow-raised / -overlay / -modal / -edge / -drawer / -glow-*",
    pattern: /(?<![\w-])shadow-\[/,
    allowInPrimitives: true,
  },
  {
    id: "arbitrary-z-index",
    message: "arbitrary z-index — use the numeric scale (z-0, z-10, z-20, z-50, z-70, z-100)",
    pattern: /(?<![\w-])z-\[/,
    allowInPrimitives: true,
  },
  {
    id: "arbitrary-breakpoint",
    message: "arbitrary breakpoint — use xs / sm / md / lg / desktop / split / calendar / wide",
    pattern: /(?:min|max)-\[\d+px\]:/,
    allowInPrimitives: true,
  },
];

// shadcn primitives keep their stock sizing; colour rules still apply to them.
const PRIMITIVES_DIR = `${sep}components${sep}ui${sep}`;
const IGNORE_MARKER = "design-tokens-ignore";

export function checkSource(source, { isPrimitive = false } = {}) {
  const problems = [];
  source.split("\n").forEach((text, index) => {
    if (text.includes(IGNORE_MARKER)) return;
    for (const rule of RULES) {
      if (isPrimitive && rule.allowInPrimitives) continue;
      const match = text.match(rule.pattern);
      if (match) problems.push({ line: index + 1, rule: rule.id, match: match[0], message: rule.message });
    }
  });
  return problems;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(tsx?|mts)$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name)) yield path;
  }
}

function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const packagesDir = join(root, "packages");
  let count = 0;

  for (const pkg of readdirSync(packagesDir)) {
    const srcDir = join(packagesDir, pkg, "src");
    if (!existsSync(srcDir)) continue;
    for (const file of walk(srcDir)) {
      const problems = checkSource(readFileSync(file, "utf8"), { isPrimitive: file.includes(PRIMITIVES_DIR) });
      for (const problem of problems) {
        console.error(`${relative(root, file)}:${problem.line}  ${problem.rule}  "${problem.match}"  ${problem.message}`);
      }
      count += problems.length;
    }
  }

  if (count > 0) {
    console.error(`\n✖ ${count} design-token violation(s). See .agents/docs/design-system.md`);
    process.exit(1);
  }
  console.log("✔ No design-token violations.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
