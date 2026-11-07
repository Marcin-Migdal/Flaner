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

const srgbToLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const toLinearRgb = (value: string): Rgb => {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    return [0, 2, 4].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as Rgb;
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
    [role, "background", TEXT],
    [role, "card", TEXT],
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
