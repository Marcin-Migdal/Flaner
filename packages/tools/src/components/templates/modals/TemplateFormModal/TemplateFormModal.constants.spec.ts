import { describe, expect, it } from "vitest";
import {
  CUSTOM_COLOR_HEX_STORAGE_KEY,
  HEX_COLOR_REGEX,
} from "./TemplateFormModal.constants";

describe("TemplateFormModal.constants", () => {
  it("defines constant storage key for custom color hexes", () => {
    expect(CUSTOM_COLOR_HEX_STORAGE_KEY).toBe("flaner_custom_color_hexes");
  });

  it("validates hex color strings accurately", () => {
    expect(HEX_COLOR_REGEX.test("#fff")).toBe(true);
    expect(HEX_COLOR_REGEX.test("#123456")).toBe(true);
    expect(HEX_COLOR_REGEX.test("#A1B2C3")).toBe(true);

    expect(HEX_COLOR_REGEX.test("123456")).toBe(false);
    expect(HEX_COLOR_REGEX.test("#12")).toBe(false);
    expect(HEX_COLOR_REGEX.test("#1234567")).toBe(false);
    expect(HEX_COLOR_REGEX.test("#gggggg")).toBe(false);
  });
});
