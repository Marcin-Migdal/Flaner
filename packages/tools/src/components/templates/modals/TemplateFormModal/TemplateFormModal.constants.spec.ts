import { describe, expect, it } from "vitest";
import { HEX_COLOR_REGEX } from "./TemplateFormModal.constants";

describe("TemplateFormModal.constants", () => {
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
