// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import { setupEmulator } from "@flaner/test-utils/emulator";
import type { FilamentSpool } from "../spools/types";
import type { FilamentTemplate, TemplateInput } from "./types";
import { addTemplate, deleteTemplate, editTemplate, fetchAssociatedSpools, fetchTemplates } from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const DENIED = { code: "permission-denied" };

const template = (overrides: Partial<FilamentTemplate> = {}): FilamentTemplate => ({
  id: "tpl-1",
  userId: "user-1",
  material: "PLA",
  type: "Basic",
  colorName: "Red",
  colorHex: "#d32f2f",
  defaultWeight: 1000,
  createdAt: 1,
  ...overrides,
});

const spool = (overrides: Partial<FilamentSpool> = {}): FilamentSpool => ({
  id: "spool-1",
  userId: "user-1",
  templateId: "tpl-1",
  name: "Red spool",
  initialWeight: 1000,
  currentWeight: 800,
  isFinished: false,
  finishedAt: null,
  createdAt: 1,
  material: "PLA",
  type: "Basic",
  colorName: "Red",
  colorHex: "#d32f2f",
  ...overrides,
});

const newData: TemplateInput = {
  material: "Nylon",
  type: "CF",
  colorName: "Snow",
  colorHex: "#ffffff",
  defaultWeight: 750,
};

describe("tools templates endpoints (emulator)", () => {
  it("fetchTemplates returns the user's templates, newest first", async () => {
    await seed({
      "templates/tpl-1": template({ id: "tpl-1", createdAt: 1 }),
      "templates/tpl-2": template({ id: "tpl-2", createdAt: 2 }),
      "templates/tpl-3": template({ id: "tpl-3", userId: "user-2" }),
    });
    await signInAs("user-1");

    expect((await fetchTemplates("user-1")).map((t) => t.id)).toEqual(["tpl-2", "tpl-1"]);
  });

  it("fetchTemplates denies another user's templates", async () => {
    await signInAs("user-1");

    await expect(fetchTemplates("user-2")).rejects.toMatchObject(DENIED);
  });

  it("addTemplate stores the template with its owner and a creation time", async () => {
    await signInAs("user-1");

    const id = await addTemplate("user-1", newData);

    expect(await read(`templates/${id}`)).toMatchObject({ ...newData, id, userId: "user-1", createdAt: expect.any(Number) });
  });

  describe("editTemplate", () => {
    beforeEach(async () => {
      await seed({ "templates/tpl-1": template(), "spools/spool-1": spool() });
      await signInAs("user-1");
    });

    it("updates only the template without propagate", async () => {
      await editTemplate("tpl-1", newData, false, "user-1");

      expect(await read("templates/tpl-1")).toMatchObject(newData);
      expect(await read("spools/spool-1")).toMatchObject({ material: "PLA", colorHex: "#d32f2f" });
    });

    it("copies the filament fields to the template's spools with propagate", async () => {
      await editTemplate("tpl-1", newData, true, "user-1");

      expect(await read("spools/spool-1")).toMatchObject({
        material: "Nylon",
        type: "CF",
        colorName: "Snow",
        colorHex: "#ffffff",
        currentWeight: 800,
      });
    });
  });

  describe("deleteTemplate", () => {
    beforeEach(async () => {
      await seed({
        "templates/tpl-1": template(),
        "spools/spool-1": spool(),
        "spools/spool-1/prints/print-1": { id: "print-1", usedWeight: 50, createdAt: 1 },
        "spools/spool-2": spool({ id: "spool-2", templateId: "tpl-2" }),
      });
      await signInAs("user-1");
    });

    it("detaches the template's spools when they are kept", async () => {
      await deleteTemplate("tpl-1", false, "user-1");

      expect(await read("templates/tpl-1")).toBeUndefined();
      expect(await read("spools/spool-1")).toMatchObject({ templateId: null });
      expect(await read("spools/spool-2")).toMatchObject({ templateId: "tpl-2" });
    });

    it("deletes the template's spools with their prints", async () => {
      await deleteTemplate("tpl-1", true, "user-1");

      expect(await read("templates/tpl-1")).toBeUndefined();
      expect(Object.keys(await list("spools"))).toEqual(["spool-2"]);
      expect(await list("spools/spool-1/prints")).toEqual({});
    });
  });

  it("fetchAssociatedSpools returns the spools made from the template", async () => {
    await seed({
      "spools/spool-1": spool(),
      "spools/spool-2": spool({ id: "spool-2", templateId: "tpl-2" }),
    });
    await signInAs("user-1");

    expect((await fetchAssociatedSpools("user-1", "tpl-1")).map((s) => s.id)).toEqual(["spool-1"]);
  });
});
