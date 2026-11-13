// Run: node --test scripts/check-design-tokens.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSource } from "./check-design-tokens.mjs";

const rules = (source, options) => checkSource(source, options).map((problem) => problem.rule);

test("accepts semantic tokens", () => {
  assert.deepEqual(
    rules('className="bg-surface-subtle text-success-text border-border-subtle text-2xs shadow-raised z-50 desktop:flex"'),
    [],
  );
});

test("does not confuse font weights or whitespace utilities with colours", () => {
  assert.deepEqual(rules('className="font-black whitespace-nowrap text-on-media bg-scrim/40"'), []);
});

test("flags raw palette colours, with variants and opacity", () => {
  assert.deepEqual(rules('className="hover:bg-white/5"'), ["raw-color"]);
  assert.deepEqual(rules('className="text-emerald-500"'), ["raw-color"]);
  assert.deepEqual(rules('className="dark:border-zinc-800"'), ["raw-color"]);
});

test("flags arbitrary colours, sizes, shadows, z-index and breakpoints", () => {
  assert.deepEqual(rules('className="bg-[#141416]"'), ["arbitrary-color"]);
  assert.deepEqual(rules('className="text-[11px]"'), ["arbitrary-font-size"]);
  assert.deepEqual(rules('className="shadow-[0_0_8px_rgba(0,0,0,0.5)]"'), ["arbitrary-color", "arbitrary-shadow"]);
  assert.deepEqual(rules('className="z-[60]"'), ["arbitrary-z-index"]);
  assert.deepEqual(rules('className="min-[1438px]:flex"'), ["arbitrary-breakpoint"]);
});

test("allows stock sizing in shadcn primitives but still checks colours", () => {
  assert.deepEqual(rules('className="text-[0.8rem] bg-zinc-900"', { isPrimitive: true }), ["raw-color"]);
});

test("skips lines with the ignore marker", () => {
  assert.deepEqual(rules('className="bg-white" // design-tokens-ignore: print stylesheet'), []);
});
