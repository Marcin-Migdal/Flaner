// Fails when a collection's fields differ between the rules spec and its TypeScript type (#93).
// Run: npm run rules:check (after the compiler drift guard).
//
// For every (sub)collection section of `.agents/skills/firestore-rules-manager/docs/<collection>.md`:
// - the fields of its Schema table == the top-level properties of the TS type named by its `**TS type:**` line
//   (minus the fields listed as `(derived: …)`: set on read, never stored),
// - every `request.resource.data.keys().hasOnly([...])` in its ```rules block == the Schema table fields,
// - a section with a Schema table must have a `**TS type:**` line.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = ".agents/skills/firestore-rules-manager/docs";

const backticked = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
const sameSet = (a, b) => a.length === b.length && a.every((item) => b.includes(item));
const diff = (a, b) => a.filter((item) => !b.includes(item));

/** Splits a collection spec into sections: the collection itself and each `## Subcollection: <name>`. */
export const parseSpec = (markdown, collection) => {
  const sections = [];
  let section = null;
  let inSchema = false;
  let rules = null;

  const start = (name) => {
    section = { name, fields: null, tsType: null, derived: [], hasOnly: [] };
    sections.push(section);
  };
  start(collection);

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    if (rules !== null) {
      if (/^```\s*$/.test(line)) {
        const text = rules.join("\n");
        for (const [, list] of text.matchAll(/request\.resource\.data\.keys\(\)\.hasOnly\(\[([^\]]*)\]\)/g)) {
          section.hasOnly.push([...list.matchAll(/'([^']+)'/g)].map((match) => match[1]));
        }
        rules = null;
      } else {
        rules.push(line);
      }
      continue;
    }
    if (/^```rules\s*$/.test(line)) {
      rules = [];
      continue;
    }

    const subcollection = line.match(/^## Subcollection: (\S+)/);
    if (subcollection) start(`${collection}/${subcollection[1]}`);
    if (line.startsWith("#")) inSchema = /^#+ Schema\s*$/.test(line);

    const tsType = line.match(/^\*\*TS type:\*\* `([^`#]+)#(\w+)`(?:\s*\(derived: (.+)\))?/);
    if (tsType) {
      section.tsType = { file: tsType[1], name: tsType[2] };
      section.derived = tsType[3] ? backticked(tsType[3]) : [];
    } else if (inSchema && line.startsWith("|")) {
      const firstCell = line.split("|")[1];
      if (/^\s*-+\s*$/.test(firstCell) || /^\s*Field\s*$/.test(firstCell)) continue;
      section.fields = [...(section.fields ?? []), ...backticked(firstCell)];
    }
  }
  return sections;
};

/** Problems of one section, given the property names of its TS type (null when the section has no TS type). */
export const checkSection = (section, tsFields) => {
  const problems = [];
  const { name, fields, derived, hasOnly } = section;

  if (fields && !section.tsType) problems.push(`${name}: Schema table but no \`**TS type:**\` line`);
  if (fields && tsFields) {
    const stored = diff(tsFields, derived);
    const missingInTs = diff(fields, stored);
    const missingInSpec = diff(stored, fields);
    if (missingInTs.length) problems.push(`${name}: in the Schema table but not in the TS type: ${missingInTs.join(", ")}`);
    if (missingInSpec.length) problems.push(`${name}: in the TS type but not in the Schema table: ${missingInSpec.join(", ")}`);
  }
  for (const list of hasOnly) {
    if (!fields) problems.push(`${name}: hasOnly([...]) but no Schema table`);
    else if (!sameSet(list, fields)) {
      problems.push(`${name}: hasOnly([${list.join(", ")}]) differs from the Schema table (${fields.join(", ")})`);
    }
  }
  return problems;
};

const readTsFields = (sections) => {
  const files = [...new Set(sections.flatMap(({ tsType }) => (tsType ? [path.join(ROOT, tsType.file)] : [])))];
  const config = ts.readConfigFile(path.join(ROOT, "tsconfig.base.json"), ts.sys.readFile).config;
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);
  const program = ts.createProgram(files, { ...options, noEmit: true });
  const checker = program.getTypeChecker();

  return (tsType) => {
    const source = program.getSourceFile(path.join(ROOT, tsType.file));
    if (!source) return { error: `${tsType.file} not found` };
    const symbol = checker.getExportsOfModule(checker.getSymbolAtLocation(source)).find((s) => s.name === tsType.name);
    if (!symbol) return { error: `${tsType.file} does not export ${tsType.name}` };
    return { fields: checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol)).map((p) => p.name) };
  };
};

const main = () => {
  const specDir = path.join(ROOT, SPEC_DIR);
  const sections = readdirSync(specDir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .sort()
    .flatMap((file) => parseSpec(readFileSync(path.join(specDir, file), "utf8"), path.basename(file, ".md")));
  const fieldsOf = readTsFields(sections);

  const problems = sections.flatMap((section) => {
    if (!section.tsType) return checkSection(section, null);
    const { fields, error } = fieldsOf(section.tsType);
    return error ? [`${section.name}: ${error}`] : checkSection(section, fields);
  });

  if (problems.length) {
    console.error(`firestore-schema-check: ${problems.length} problem(s) in ${SPEC_DIR}:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Firestore schema tables match the TS types (${sections.filter((s) => s.tsType).length} collections).`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
