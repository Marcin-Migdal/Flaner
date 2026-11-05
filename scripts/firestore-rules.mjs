// Compiles the Firestore rules spec (.agents/skills/firestore-rules-manager/docs/*.md) into firestore.rules.
// Usage: node scripts/firestore-rules.mjs [--check | --watch]
//   (no flag)  writes firestore.rules
//   --check    fails when firestore.rules differs from the spec (CI drift guard)
//   --watch    rebuilds on every spec change (the Firestore emulator hot-reloads the output)
//
// Spec format (see the firestore-rules-manager skill):
// - only ```rules fenced blocks are compiled; everything else is documentation,
// - `_global.md` is emitted first, then the other files alphabetically (other `_*.md` files hold no rules),
// - in a collection file the first block is the collection `match`; every further block is a subcollection
//   inserted at the `{{subcollections}}` line of the first block.
import { readdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = ".agents/skills/firestore-rules-manager/docs";
const OUTPUT = "firestore.rules";
const PLACEHOLDER = "{{subcollections}}";
const INDENT = "    ";

const HEADER = `// GENERATED FILE - DO NOT EDIT.
// Source: ${SPEC_DIR}/*.md (rebuild with \`npm run rules:build\`).
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {`;
const FOOTER = `  }
}`;

class SpecError extends Error {}

const fail = (message) => {
  throw new SpecError(message);
};

const readText = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

const dedent = (lines) => {
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(min).trimEnd());
};

const indent = (lines, prefix) => lines.map((line) => (line ? prefix + line : line));

const extractBlocks = (markdown, file) => {
  const blocks = [];
  let current = null;

  for (const line of markdown.split("\n")) {
    if (current === null && /^```rules\s*$/.test(line)) {
      current = [];
    } else if (current !== null && /^```\s*$/.test(line)) {
      blocks.push(dedent(current));
      current = null;
    } else if (current !== null) {
      current.push(line);
    }
  }

  if (current !== null) fail(`${file}: unclosed \`\`\`rules block`);
  return blocks.map((lines) => {
    while (lines.length && !lines[0]) lines.shift();
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines;
  });
};

const joinBlocks = (blocks) => blocks.flatMap((block, index) => (index === 0 ? block : ["", ...block]));

const compileFile = (file, blocks) => {
  const [root, ...subcollections] = blocks;
  const placeholderLines = root.filter((line) => line.trim() === PLACEHOLDER);

  blocks.forEach((block, index) => {
    if (block.some((line) => /\{\{.*\}\}/.test(line) && (index > 0 || line.trim() !== PLACEHOLDER))) {
      fail(`${file}: only the first block may contain a placeholder, and only ${PLACEHOLDER}`);
    }
  });

  if (file === "_global.md") {
    if (placeholderLines.length) fail(`${file}: helpers cannot contain ${PLACEHOLDER}`);
    return joinBlocks(blocks);
  }

  const collection = path.basename(file, ".md");
  if (!root.some((line) => line.startsWith(`match /${collection}/`))) {
    fail(`${file}: the first rules block must be \`match /${collection}/{...}\``);
  }
  if (placeholderLines.length > 1) fail(`${file}: ${PLACEHOLDER} used more than once`);
  if (subcollections.length && !placeholderLines.length) {
    fail(`${file}: subcollection blocks found but the first block has no ${PLACEHOLDER}`);
  }
  if (!subcollections.length && placeholderLines.length) {
    fail(`${file}: ${PLACEHOLDER} used but no subcollection blocks follow`);
  }

  return root.flatMap((line) =>
    line.trim() === PLACEHOLDER ? indent(joinBlocks(subcollections), line.match(/^ */)[0]) : [line],
  );
};

const compile = () => {
  const specDir = path.join(ROOT, SPEC_DIR);
  const files = readdirSync(specDir)
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) => (a === "_global.md" ? -1 : b === "_global.md" ? 1 : a.localeCompare(b)));

  if (files[0] !== "_global.md") fail(`${SPEC_DIR}/_global.md is missing`);

  const sections = files.flatMap((file) => {
    const blocks = extractBlocks(readText(path.join(specDir, file)), file);
    if (!blocks.length) {
      if (!file.startsWith("_")) fail(`${file}: no \`\`\`rules block`);
      return [];
    }
    return [compileFile(file, blocks)];
  });

  return [HEADER, ...indent(joinBlocks(sections), INDENT), FOOTER, ""].join("\n");
};

const output = path.join(ROOT, OUTPUT);

const readOutput = () => {
  try {
    return readText(output);
  } catch {
    return "";
  }
};

const build = () => {
  const compiled = compile();
  // Skip identical writes so the emulator only reloads on real changes
  if (readOutput() !== compiled) writeFileSync(output, compiled);
  console.log(`Wrote ${OUTPUT} from ${SPEC_DIR}.`);
};

const report = (error) => {
  if (!(error instanceof SpecError)) throw error;
  console.error(`firestore-rules: ${error.message}`);
};

if (process.argv.includes("--watch")) {
  let timer;
  const rebuild = () => {
    try {
      build();
    } catch (error) {
      report(error);
    }
  };
  rebuild();
  watch(path.join(ROOT, SPEC_DIR), () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 100);
  });
  console.log(`Watching ${SPEC_DIR} for changes...`);
} else {
  try {
    if (process.argv.includes("--check")) {
      if (readOutput() !== compile()) {
        fail(`${OUTPUT} is out of sync with ${SPEC_DIR}. Run \`npm run rules:build\` and commit the result.`);
      }
      console.log(`${OUTPUT} is up to date.`);
    } else {
      build();
    }
  } catch (error) {
    report(error);
    process.exit(1);
  }
}
