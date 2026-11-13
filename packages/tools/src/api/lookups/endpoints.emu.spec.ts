// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import type { LookupColor, LookupMaterial, LookupType } from "./types";
import {
  addLookupColor,
  addLookupMaterial,
  addLookupType,
  deleteLookupColor,
  deleteLookupMaterial,
  deleteLookupType,
  fetchLookupColors,
  fetchLookupMaterials,
  fetchLookupTypes,
} from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const DENIED = { code: "permission-denied" };

const material = (id: string, name: string, userId = "user-1"): LookupMaterial => ({ id, userId, name, createdAt: 1 });

const type = (id: string, materialName: string, name: string, userId = "user-1"): LookupType => ({
  id,
  userId,
  materialName,
  name,
  createdAt: 1,
});

const color = (id: string, materialName: string, typeName: string, name: string, hex = "#123456"): LookupColor => ({
  id,
  userId: "user-1",
  materialName,
  typeName,
  name,
  hex,
  createdAt: 1,
});

/** The ids left in a collection. */
const ids = async (collectionPath: string) => Object.keys(await list(collectionPath)).sort();

describe("tools lookups endpoints (emulator)", () => {
  describe("fetch", () => {
    it("returns only the signed-in user's lookups", async () => {
      await seed({
        "lookup_materials/m-1": material("m-1", "Nylon"),
        "lookup_materials/m-2": material("m-2", "Wood", "user-2"),
        "lookup_types/t-1": type("t-1", "Nylon", "CF"),
        "lookup_colors/c-1": color("c-1", "Nylon", "CF", "Black"),
      });
      await signInAs("user-1");

      expect((await fetchLookupMaterials("user-1")).map((m) => m.name)).toEqual(["Nylon"]);
      expect((await fetchLookupTypes("user-1")).map((t) => t.name)).toEqual(["CF"]);
      expect((await fetchLookupColors("user-1")).map((c) => c.name)).toEqual(["Black"]);
    });

    it("denies reading another user's lookups", async () => {
      await signInAs("user-1");

      await expect(fetchLookupMaterials("user-2")).rejects.toMatchObject(DENIED);
    });
  });

  describe("add", () => {
    it("addLookupMaterial stores a trimmed name and reuses it whatever the case", async () => {
      await signInAs("user-1");

      const id = await addLookupMaterial("user-1", { name: "  Nylon " });
      const again = await addLookupMaterial("user-1", { name: "NYLON" });

      expect(again).toBe(id);
      expect(await ids("lookup_materials")).toEqual([id]);
      expect(await read(`lookup_materials/${id}`)).toMatchObject({ id, userId: "user-1", name: "Nylon" });
    });

    it("addLookupType is unique within its material, case-insensitive", async () => {
      await signInAs("user-1");

      const id = await addLookupType("user-1", { materialName: "Nylon", name: "CF" });
      expect(await addLookupType("user-1", { materialName: "nylon", name: "cf" })).toBe(id);
      const other = await addLookupType("user-1", { materialName: "PLA", name: "CF" });

      expect(other).not.toBe(id);
      expect(await read(`lookup_types/${id}`)).toMatchObject({ materialName: "Nylon", name: "CF" });
    });

    it("addLookupColor keeps same-name colours of different materials apart", async () => {
      await signInAs("user-1");

      const pla = await addLookupColor("user-1", { materialName: "PLA", typeName: "Galaxy", name: "Red", hex: "#ff00ff" });
      const petg = await addLookupColor("user-1", { materialName: "PETG", typeName: "Galaxy", name: "Red", hex: "#00ff00" });

      expect(petg).not.toBe(pla);
      expect(await read(`lookup_colors/${pla}`)).toMatchObject({ materialName: "PLA", hex: "#ff00ff" });
      expect(await read(`lookup_colors/${petg}`)).toMatchObject({ materialName: "PETG", hex: "#00ff00" });
    });

    it("addLookupColor updates the hex of an existing colour (white included)", async () => {
      await seed({ "lookup_colors/c-1": color("c-1", "PLA", "Galaxy", "Snow", "#eeeeee") });
      await signInAs("user-1");

      const id = await addLookupColor("user-1", { materialName: "pla", typeName: "galaxy", name: "snow", hex: "#ffffff" });

      expect(id).toBe("c-1");
      expect(await ids("lookup_colors")).toEqual(["c-1"]);
      expect(await read("lookup_colors/c-1")).toMatchObject({ name: "Snow", hex: "#ffffff" });
    });

    it("denies adding a lookup for another user", async () => {
      await signInAs("user-1");

      await expect(addLookupMaterial("user-2", { name: "Nylon" })).rejects.toMatchObject(DENIED);
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await seed({
        // "nylon" is a case-duplicate written before lookups were case-insensitive
        "lookup_materials/m-1": material("m-1", "Nylon"),
        "lookup_materials/m-2": material("m-2", "nylon"),
        "lookup_materials/m-3": material("m-3", "Wood"),
        "lookup_types/t-1": type("t-1", "Nylon", "CF"),
        "lookup_types/t-2": type("t-2", "NYLON", "cf"),
        "lookup_types/t-3": type("t-3", "Nylon", "Matte"),
        "lookup_types/t-4": type("t-4", "Wood", "CF"),
        "lookup_colors/c-1": color("c-1", "Nylon", "CF", "Black"),
        "lookup_colors/c-2": color("c-2", "nylon", "Cf", "black"),
        "lookup_colors/c-3": color("c-3", "Nylon", "Matte", "Black"),
        "lookup_colors/c-4": color("c-4", "Wood", "CF", "Black"),
        // Another user's lookups with the same names are never touched
        "lookup_materials/x-1": material("x-1", "Nylon", "user-2"),
        "lookup_types/x-2": type("x-2", "Nylon", "CF", "user-2"),
      });
      await signInAs("user-1");
    });

    it("deleteLookupMaterial removes every case-variant of the material with its types and colours", async () => {
      await deleteLookupMaterial("user-1", "NYLON");

      expect(await ids("lookup_materials")).toEqual(["m-3", "x-1"]);
      expect(await ids("lookup_types")).toEqual(["t-4", "x-2"]);
      expect(await ids("lookup_colors")).toEqual(["c-4"]);
    });

    it("deleteLookupType removes the type within its material and its colours only", async () => {
      await deleteLookupType("user-1", "Nylon", "CF");

      expect(await ids("lookup_materials")).toEqual(["m-1", "m-2", "m-3", "x-1"]);
      expect(await ids("lookup_types")).toEqual(["t-3", "t-4", "x-2"]);
      expect(await ids("lookup_colors")).toEqual(["c-3", "c-4"]);
    });

    it("deleteLookupColor removes the colour within its material + type only", async () => {
      await deleteLookupColor("user-1", "Nylon", "CF", "Black");

      expect(await ids("lookup_colors")).toEqual(["c-3", "c-4"]);
    });

    it("a deleted material stays deleted when it is read back", async () => {
      await deleteLookupMaterial("user-1", "Nylon");

      expect((await fetchLookupMaterials("user-1")).map((m) => m.name)).toEqual(["Wood"]);
    });
  });
});
