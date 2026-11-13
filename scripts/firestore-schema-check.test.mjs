// Run: node --test scripts/firestore-schema-check.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSection, parseSpec } from "./firestore-schema-check.mjs";

const SPEC = `# things/{thingId}

## Schema
| Field | Type | Required |
| --- | --- | --- |
| \`id\` | string | ✓ |
| \`name\` / \`nameLower\` | string | ✓ |

**TS type:** \`packages/x/src/types.ts#Thing\` (derived: \`label\`)

## Rules
\`\`\`rules
match /things/{thingId} {
  allow create: if request.resource.data.keys().hasOnly(['id', 'name', 'nameLower']) &&
    request.resource.data.get('votes', {}).keys().hasOnly([request.auth.uid]);
  {{subcollections}}
}
\`\`\`

## Subcollection: parts

### Schema
| Field | Type | Required |
| --- | --- | --- |
| \`partId\` | string | ✓ |

### Rules
\`\`\`rules
match /parts/{partId} {
  allow create: if request.resource.data.keys().hasOnly(['partId', 'extra']);
}
\`\`\`
`;

test("parses fields, TS type, derived fields and record-level hasOnly lists per section", () => {
  const [things, parts] = parseSpec(SPEC, "things");
  assert.deepEqual(things, {
    name: "things",
    fields: ["id", "name", "nameLower"],
    tsType: { file: "packages/x/src/types.ts", name: "Thing" },
    derived: ["label"],
    hasOnly: [["id", "name", "nameLower"]],
  });
  assert.equal(parts.name, "things/parts");
  assert.deepEqual(parts.fields, ["partId"]);
  assert.deepEqual(parts.hasOnly, [["partId", "extra"]]);
});

test("accepts a section that matches its TS type (derived fields ignored)", () => {
  const [things] = parseSpec(SPEC, "things");
  assert.deepEqual(checkSection(things, ["id", "name", "nameLower", "label"]), []);
});

test("reports fields missing on either side", () => {
  const [things] = parseSpec(SPEC, "things");
  assert.deepEqual(checkSection(things, ["id", "name", "color"]), [
    "things: in the Schema table but not in the TS type: nameLower",
    "things: in the TS type but not in the Schema table: color",
  ]);
});

test("reports a hasOnly list that differs from the Schema table and a missing TS type", () => {
  const [, parts] = parseSpec(SPEC, "things");
  assert.deepEqual(checkSection(parts, null), [
    "things/parts: Schema table but no `**TS type:**` line",
    "things/parts: hasOnly([partId, extra]) differs from the Schema table (partId)",
  ]);
});
