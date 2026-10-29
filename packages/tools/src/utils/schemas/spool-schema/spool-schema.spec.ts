import { describe, it, expect } from "vitest";
import { getSpoolSchema } from "./spool-schema";

describe("spool-schema", () => {
  const t = (key: string) => `translated:${key}`;
  const schema = getSpoolSchema(t);

  it("validates valid spool data when currentWeight <= initialWeight", () => {
    const validData = {
      templateId: "tmpl-1",
      name: "Spool A",
      initialWeight: 1000,
      currentWeight: 800,
    };
    expect(schema.safeParse(validData).success).toBe(true);
  });

  it("rejects currentWeight > initialWeight with translated error", () => {
    const invalidData = {
      templateId: "tmpl-1",
      name: "Spool A",
      initialWeight: 1000,
      currentWeight: 1200,
    };
    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("translated:spooler.spools.validation.currentWeightMax");
    }
  });

  it("rejects empty templateId or name", () => {
    expect(schema.safeParse({ templateId: "", name: "Spool", initialWeight: 1000, currentWeight: 500 }).success).toBe(false);
    expect(schema.safeParse({ templateId: "tmpl", name: "", initialWeight: 1000, currentWeight: 500 }).success).toBe(false);
  });

  it("rejects negative weights", () => {
    expect(schema.safeParse({ templateId: "tmpl", name: "Spool", initialWeight: -10, currentWeight: -20 }).success).toBe(false);
    expect(schema.safeParse({ templateId: "tmpl", name: "Spool", initialWeight: 1000, currentWeight: -5 }).success).toBe(false);
  });
});
