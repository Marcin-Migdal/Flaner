import { describe, it, expect } from "vitest";
import { mergeFilamentOptions } from "./mergeFilamentOptions";

describe("mergeFilamentOptions", () => {
  it("returns base Bambu filaments when lookup arrays are empty", () => {
    const result = mergeFilamentOptions([], [], []);

    expect(result.length).toBeGreaterThan(0);
    const pla = result.find((m) => m.name.toLowerCase() === "pla");
    expect(pla).toBeDefined();
    expect(pla?.types.length).toBeGreaterThan(0);
  });

  it("merges custom materials, types, and colors", () => {
    const lookupMaterials = [
      { id: "mat-1", userId: "user-1", name: "CustomMat" },
    ];
    const lookupTypes = [
      { id: "type-1", userId: "user-1", materialName: "CustomMat", name: "SpecialType" },
    ];
    const lookupColors = [
      {
        id: "color-1",
        userId: "user-1",
        materialName: "CustomMat",
        typeName: "SpecialType",
        name: "Neon Green",
        hex: "#00ff00",
      },
    ];

    const result = mergeFilamentOptions(lookupMaterials, lookupTypes, lookupColors);

    const customMat = result.find((m) => m.name === "CustomMat");
    expect(customMat).toBeDefined();
    expect(customMat?.id).toBe("mat-1");
    expect(customMat?.isCustom).toBe(true);

    const customType = customMat?.types.find((t) => t.name === "SpecialType");
    expect(customType).toBeDefined();
    expect(customType?.id).toBe("type-1");
    expect(customType?.isCustom).toBe(true);

    const customColor = customType?.colors.find((c) => c.name === "Neon Green");
    expect(customColor).toBeDefined();
    expect(customColor?.id).toBe("color-1");
    expect(customColor?.hex).toBe("#00ff00");
    expect(customColor?.isCustom).toBe(true);
  });

  it("assigns IDs to official Bambu materials, types, and colors when matched", () => {
    const lookupMaterials = [{ id: "official-mat-id", userId: "user-1", name: "PLA" }];
    const lookupTypes = [
      { id: "official-type-id", userId: "user-1", materialName: "PLA", name: "Basic" },
    ];
    const lookupColors = [
      {
        id: "official-color-id",
        userId: "user-1",
        materialName: "PLA",
        typeName: "Basic",
        name: "Black",
        hex: "#111111",
      },
    ];

    const result = mergeFilamentOptions(lookupMaterials, lookupTypes, lookupColors);

    const pla = result.find((m) => m.name.toLowerCase() === "pla");
    expect(pla?.id).toBe("official-mat-id");

    const plaBasic = pla?.types.find((t) => t.name.toLowerCase() === "basic");
    expect(plaBasic?.id).toBe("official-type-id");
  });

  it("handles lookupColors when material and type do not already exist in merged list", () => {
    const lookupColors = [
      {
        id: "col-orphan",
        userId: "user-1",
        materialName: "BrandNewMaterial",
        typeName: "BrandNewType",
        name: "Neon Glow",
        hex: "#ffff00",
      },
    ];

    const result = mergeFilamentOptions([], [], lookupColors);
    const mat = result.find((m) => m.name === "BrandNewMaterial");
    expect(mat).toBeDefined();
    expect(mat?.isCustom).toBe(true);
    const type = mat?.types.find((t) => t.name === "BrandNewType");
    expect(type).toBeDefined();
    expect(type?.isCustom).toBe(true);
    const col = type?.colors.find((c) => c.name === "Neon Glow");
    expect(col).toBeDefined();
    expect(col?.id).toBe("col-orphan");
  });

  it("marks color as custom if it exists in type but is not in official bambu list", () => {
    const lookupTypes = [
      { id: "type-pla-custom", userId: "user-1", materialName: "PLA", name: "CustomType" },
    ];
    // First, let's create a custom type under PLA with a color
    const lookupColors = [
      {
        id: "col-1",
        userId: "user-1",
        materialName: "PLA",
        typeName: "CustomType",
        name: "CustomColor",
        hex: "#123456",
      },
      // Second lookup with same color name to trigger the 'else' branch where colorNode exists
      {
        id: "col-1-updated",
        userId: "user-1",
        materialName: "PLA",
        typeName: "CustomType",
        name: "CustomColor",
        hex: "#654321",
      },
    ];

    const result = mergeFilamentOptions([], lookupTypes, lookupColors);
    const pla = result.find((m) => m.name.toLowerCase() === "pla");
    const customType = pla?.types.find((t) => t.name === "CustomType");
    const color = customType?.colors.find((c) => c.name === "CustomColor");
    expect(color?.id).toBe("col-1-updated");
    expect(color?.hex).toBe("#654321");
    expect(color?.isCustom).toBe(true);
  });

  it("handles lookupTypes when material does not already exist in merged list", () => {
    const lookupTypes = [
      { id: "type-new", userId: "user-1", materialName: "UnknownMat", name: "TypeA" },
    ];
    const result = mergeFilamentOptions([], lookupTypes, []);
    const mat = result.find((m) => m.name === "UnknownMat");
    expect(mat).toBeDefined();
    expect(mat?.isCustom).toBe(true);
  });

  it("marks type as custom if it exists in material but is not in official bambu list", () => {
    const lookupTypes = [
      { id: "type-1", userId: "user-1", materialName: "PLA", name: "CustomTypeX" },
      { id: "type-1-dup", userId: "user-1", materialName: "PLA", name: "CustomTypeX" },
    ];
    const result = mergeFilamentOptions([], lookupTypes, []);
    const pla = result.find((m) => m.name.toLowerCase() === "pla");
    const typ = pla?.types.find((t) => t.name === "CustomTypeX");
    expect(typ?.id).toBe("type-1-dup");
    expect(typ?.isCustom).toBe(true);
  });
});
