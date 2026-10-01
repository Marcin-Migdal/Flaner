import { describe, it, expect } from "vitest";
import { getTemplateSchema } from "./template-schema";

describe("template-schema", () => {
  const t = (key: string) => `translated:${key}`;
  const schema = getTemplateSchema(t);

  it("validates valid template and prefixes hex with # if omitted", () => {
    const data = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "ff0000",
      defaultWeight: 1000,
    };
    const result = schema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.colorHex).toBe("#ff0000");
    }
  });

  it("defaults colorHex to #ffffff when empty", () => {
    const data = {
      material: "PLA",
      type: "Basic",
      colorName: "White",
      colorHex: "",
      defaultWeight: 1000,
    };
    const result = schema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.colorHex).toBe("#ffffff");
    }
  });

  it("rejects empty material, type, or colorName", () => {
    expect(
      schema.safeParse({ material: "", type: "Basic", colorName: "Red", colorHex: "#ff0000", defaultWeight: 1000 }).success
    ).toBe(false);
    expect(
      schema.safeParse({ material: "PLA", type: "", colorName: "Red", colorHex: "#ff0000", defaultWeight: 1000 }).success
    ).toBe(false);
    expect(
      schema.safeParse({ material: "PLA", type: "Basic", colorName: "", colorHex: "#ff0000", defaultWeight: 1000 }).success
    ).toBe(false);
  });
});
