import { describe, it, expect } from "vitest";
import { getSettingsSchema } from "./settings-schema";

describe("settings-schema", () => {
  const schema = getSettingsSchema((key) => key);

  it("validates valid startupWaste between 0 and 100", () => {
    expect(schema.safeParse({ startupWaste: 0 }).success).toBe(true);
    expect(schema.safeParse({ startupWaste: 15 }).success).toBe(true);
    expect(schema.safeParse({ startupWaste: 100 }).success).toBe(true);
  });

  it("rejects startupWaste below 0 or above 100", () => {
    expect(schema.safeParse({ startupWaste: -1 }).success).toBe(false);
    expect(schema.safeParse({ startupWaste: 101 }).success).toBe(false);
  });

  it("uses a translation key for a missing or out-of-range value (#106)", () => {
    for (const startupWaste of [undefined, -1, 101]) {
      expect(schema.safeParse({ startupWaste }).error?.issues[0].message).toBe("spooler.settings.startupWasteRange");
    }
  });
});
