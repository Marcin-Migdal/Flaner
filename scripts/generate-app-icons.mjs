#!/usr/bin/env node
/**
 * Renders the PNG app icons from packages/core/public/flaner-icon.svg (the single source).
 *   flaner-icon-{192,512}.png      manifest "any": the rounded tile as drawn
 *   flaner-maskable-{192,512}.png  manifest "maskable": full-bleed tile, glyph inside the 80% safe zone
 *   apple-touch-icon.png (180)     iOS: full-bleed tile (iOS rounds the corners itself)
 * Usage: npm run icons  (CHROMIUM_PATH=<chrome> when Playwright's own browser is not downloaded)
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../packages/core/public");
const source = readFileSync(join(PUBLIC, "flaner-icon.svg"), "utf8");

/** Square tile without corner radius, glyph scaled around the centre. */
const fullBleed = (scale) =>
  source
    .replace(/ rx="\d+"/, "")
    .replace('<g id="glyph">', `<g id="glyph" transform="translate(256 256) scale(${scale}) translate(-256 -256)">`);

const outputs = [
  { file: "flaner-icon-192.png", size: 192, svg: source },
  { file: "flaner-icon-512.png", size: 512, svg: source },
  { file: "flaner-maskable-192.png", size: 192, svg: fullBleed(0.74) },
  { file: "flaner-maskable-512.png", size: 512, svg: fullBleed(0.74) },
  { file: "apple-touch-icon.png", size: 180, svg: fullBleed(0.86) },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const { file, size, svg } of outputs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: join(PUBLIC, file), omitBackground: true });
    await page.close();
    console.log(`${file} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
