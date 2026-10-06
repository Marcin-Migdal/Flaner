import { describe, expect, it } from "vitest";
import { bambuFilaments } from "./bambuFilaments";

describe("bambuFilaments catalogue", () => {
  it("contains valid materials with types and colors", () => {
    expect(Array.isArray(bambuFilaments)).toBe(true);
    expect(bambuFilaments.length).toBeGreaterThan(0);

    const materialNames = bambuFilaments.map((m) => m.name);
    expect(materialNames).toContain("PLA");
    expect(materialNames).toContain("PETG");
    expect(materialNames).toContain("ABS");
  });

  it("ensures all colors have a name and valid hex code", () => {
    const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

    bambuFilaments.forEach((material) => {
      expect(material.name.trim().length).toBeGreaterThan(0);
      expect(material.types.length).toBeGreaterThan(0);

      material.types.forEach((type) => {
        expect(type.name.trim().length).toBeGreaterThan(0);
        expect(type.colors.length).toBeGreaterThan(0);

        type.colors.forEach((color) => {
          expect(color.name.trim().length).toBeGreaterThan(0);
          expect(color.hex).toMatch(hexRegex);
        });
      });
    });
  });
});
