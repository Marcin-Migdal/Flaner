// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Rgb = [number, number, number];
type Tokens = Record<string, string>;

const css = readFileSync(resolve(__dirname, "theme.css"), "utf8");

const readBlock = (selector: string): Tokens => {
  const start = css.indexOf(`\n${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const tokens: Tokens = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
};

const light = readBlock(":root");
const dark = { ...light, ...readBlock(".dark") };

const resolveValue = (tokens: Tokens, value: string): string => {
  const reference = value.match(/^var\(--([\w-]+)\)$/);
  return reference ? resolveValue(tokens, tokens[reference[1]]) : value;
};

const toRgb = (channel: (index: number) => number): Rgb => [channel(0), channel(1), channel(2)];

const srgbToLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const toLinearRgb = (value: string): Rgb => {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    return toRgb((i) => srgbToLinear(parseInt(hex.slice(i * 2, i * 2 + 2), 16) / 255));
  }
  const oklch = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (!oklch) throw new Error(`Unsupported colour for contrast check: ${value}`);
  const [lightness, chroma, hue] = oklch.slice(1).map(Number);
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const linearToSrgb = (channel: number) => (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055);

/** `color-mix(in oklch, fill p%, transparent)` painted over `base`: browsers composite in gamma-encoded sRGB. */
const composite = (fill: Rgb, base: Rgb, alpha: number): Rgb =>
  toRgb((i) => srgbToLinear(alpha * linearToSrgb(fill[i]) + (1 - alpha) * linearToSrgb(base[i])));

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const contrast = (tokens: Tokens, first: string, second: string) => {
  const [high, low] = [first, second]
    .map((name) => luminance(toLinearRgb(resolveValue(tokens, tokens[name]))))
    .sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

const TEXT = 4.5;
const GRAPHIC = 3;

const pairs: [string, string, number][] = [
  ["foreground", "background", TEXT],
  ["muted-foreground", "background", TEXT],
  ["muted-foreground", "card", TEXT],
  ["brand-text", "background", TEXT],
  ["brand-text", "card", TEXT],
  ["brand-foreground", "brand", TEXT],
  ...["success", "warning", "danger", "info"].flatMap((role): [string, string, number][] => [
    [`${role}-text`, "background", TEXT],
    [`${role}-text`, "card", TEXT],
    [`${role}-foreground`, role, TEXT],
  ]),
  ...["medal-gold", "medal-silver", "medal-bronze"].map((medal): [string, string, number] => [medal, "background", TEXT]),
  ["ring", "background", GRAPHIC],
  ["input-border", "card", GRAPHIC],
  ["input-border", "background", GRAPHIC],
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((i): [string, string, number] => [`chart-${i}`, "background", GRAPHIC]),
];

describe("theme.css contrast (WCAG 2.2 AA)", () => {
  describe.each([
    ["light", light],
    ["dark", dark],
  ])("%s theme", (_, tokens) => {
    it.each(pairs)("%s on %s ≥ %d:1", (first, second, minimum) => {
      expect(contrast(tokens, first, second)).toBeGreaterThanOrEqual(minimum);
    });
  });
});

describe("event slot colours", () => {
  const keys = ["blue", "indigo", "violet", "purple", "fuchsia", "pink", "cyan", "sky", "teal", "slate"];

  it.each(keys)("light --event-%s keeps ink text ≥ 4.5:1", (key) => {
    expect(contrast(light, "foreground", `event-${key}`)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(keys)("--event-%s has a dark-mode value", (key) => {
    expect(dark[`event-${key}`]).not.toBe(light[`event-${key}`]);
  });
});

describe("status text on its own tint (Badge, banners)", () => {
  const color = (tokens: Tokens, name: string) => toLinearRgb(resolveValue(tokens, tokens[name]));

  describe.each([
    ["light", light, 0.12],
    ["dark", dark, 0.15],
  ])("%s theme", (_, tokens, mix) => {
    it.each(["success", "warning", "danger", "info"])("%s-text on %s-subtle ≥ 4.5:1", (role) => {
      for (const base of ["background", "card", "surface-subtle"].filter((name) => !tokens[name].includes("/"))) {
        const tint = composite(color(tokens, role), color(tokens, base), mix);
        const text = luminance(color(tokens, `${role}-text`));
        const [high, low] = [text, luminance(tint)].sort((x, y) => y - x);
        expect((high + 0.05) / (low + 0.05)).toBeGreaterThanOrEqual(TEXT);
      }
    });
  });
});
