import { describe, expect, it } from "vitest";
import type { LookupColor } from "../../api/lookups";
import {
  buildFilamentOptions,
  findCatalogColor,
  findCustomColorHex,
  isSameName,
  normalizeName,
  resolveColorHex,
} from "./filamentCatalog";

const lookupColor = (overrides: Partial<LookupColor>): LookupColor => ({
  id: "c-1",
  userId: "user-1",
  materialName: "PLA",
  typeName: "Galaxy",
  name: "Red",
  hex: "#ff00ff",
  ...overrides,
});

describe("filamentCatalog", () => {
  describe("names", () => {
    it("compares names trimmed and case-insensitive", () => {
      expect(normalizeName("  Silk Gold ")).toBe("silk gold");
      expect(isSameName("PLA", " pla")).toBe(true);
      expect(isSameName("PLA", "PETG")).toBe(false);
    });
  });

  describe("findCatalogColor", () => {
    it("finds a colour within its material and type, any case", () => {
      expect(findCatalogColor({ material: "pla", type: "BASIC", colorName: "red" })?.hex).toBe("#d32f2f");
    });

    it("scopes the colour by material and type", () => {
      expect(findCatalogColor({ material: "PETG", type: "Basic", colorName: "Red" })?.hex).toBe("#dc2626");
      expect(findCatalogColor({ material: "PLA", type: "Matte", colorName: "Red" })).toBeUndefined();
      expect(findCatalogColor({ material: "Nylon", type: "Basic", colorName: "Red" })).toBeUndefined();
    });
  });

  describe("resolveColorHex", () => {
    it("uses the catalog hex for a catalog colour, whatever is stored", () => {
      expect(resolveColorHex({ material: "PLA", type: "Basic", colorName: "Red", colorHex: "#ffffff" })).toBe("#d32f2f");
    });

    it("keeps the stored hex of a custom colour, white included", () => {
      expect(resolveColorHex({ material: "PLA", type: "Basic", colorName: "Snow", colorHex: "#ffffff" })).toBe("#ffffff");
    });
  });

  describe("findCustomColorHex", () => {
    const filament = { material: "PETG", type: "Galaxy", colorName: "Red" };

    it("does not take a same-name colour of another material", () => {
      expect(findCustomColorHex(filament, [lookupColor({ materialName: "PLA" })], [])).toBeUndefined();
    });

    it("prefers the colour lookup over a template", () => {
      const lookups = [lookupColor({ materialName: "petg", typeName: "galaxy", name: "RED", hex: "#00ff00" })];
      const templates = [{ ...filament, colorHex: "#0000ff" }];

      expect(findCustomColorHex(filament, lookups, templates)).toBe("#00ff00");
    });

    it("falls back to a template with the same material + type + colour", () => {
      expect(findCustomColorHex(filament, [], [{ ...filament, colorHex: "#0000ff" }])).toBe("#0000ff");
    });
  });

  describe("buildFilamentOptions", () => {
    it("returns the catalog without lookups", () => {
      const pla = buildFilamentOptions([], [], []).find((m) => m.name === "PLA");

      expect(pla?.isCustom).toBeUndefined();
      expect(pla?.types.find((t) => t.name === "Basic")?.colors.length).toBeGreaterThan(0);
    });

    it("adds custom lookups as custom nodes with their ids", () => {
      const [nylon] = buildFilamentOptions(
        [{ id: "m-1", userId: "user-1", name: "Nylon" }],
        [{ id: "t-1", userId: "user-1", materialName: "nylon", name: "CF" }],
        [lookupColor({ id: "c-1", materialName: "NYLON", typeName: "cf", name: "Black", hex: "#111111" })],
      ).filter((m) => m.isCustom);

      expect(nylon).toMatchObject({ id: "m-1", name: "Nylon", isCustom: true });
      expect(nylon.types).toEqual([
        { id: "t-1", name: "CF", isCustom: true, colors: [{ id: "c-1", name: "Black", hex: "#111111", isCustom: true }] },
      ]);
    });

    it("merges case-duplicate lookups into one node", () => {
      const custom = buildFilamentOptions(
        [
          { id: "m-1", userId: "user-1", name: "Nylon" },
          { id: "m-2", userId: "user-1", name: "nylon" },
        ],
        [],
        [],
      ).filter((m) => m.isCustom);

      expect(custom).toHaveLength(1);
    });

    it("keeps the catalog hex when a lookup matches a catalog colour", () => {
      const options = buildFilamentOptions([], [], [lookupColor({ materialName: "PLA", typeName: "Basic", name: "Red" })]);
      const red = options
        .find((m) => m.name === "PLA")
        ?.types.find((t) => t.name === "Basic")
        ?.colors.find((c) => c.name === "Red");

      expect(red).toEqual({ id: "c-1", name: "Red", hex: "#d32f2f" });
    });

    it("does not change the catalog itself", () => {
      buildFilamentOptions([{ id: "m-1", userId: "user-1", name: "PLA" }], [], []);

      expect(buildFilamentOptions([], [], []).find((m) => m.name === "PLA")?.id).toBeUndefined();
    });
  });
});
