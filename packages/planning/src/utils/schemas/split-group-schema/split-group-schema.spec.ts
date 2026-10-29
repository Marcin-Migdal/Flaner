import { describe, expect, it } from "vitest";
import { getSplitGroupSchema } from "./split-group-schema";

describe("getSplitGroupSchema", () => {
  const t = (key: string) => key;

  const validGroupData = {
    name: "Summer Vacation 2026",
    description: "Trip expenses",
    defaultCurrency: "EUR",
    participants: ["userA", "userB"],
    simplifyDebts: true,
  };

  it("validates valid group creation data", () => {
    const createSchema = getSplitGroupSchema(t, "create");
    const result = createSchema.safeParse(validGroupData);
    expect(result.success).toBe(true);
  });

  it("fails in create mode when fewer than 2 participants are provided", () => {
    const createSchema = getSplitGroupSchema(t, "create");
    const result = createSchema.safeParse({
      ...validGroupData,
      participants: ["userA"],
    });
    expect(result.success).toBe(false);
  });

  it("allows 1 or fewer participants in edit mode", () => {
    const editSchema = getSplitGroupSchema(t, "edit");
    const result = editSchema.safeParse({
      ...validGroupData,
      participants: ["userA"],
    });
    expect(result.success).toBe(true);
  });

  it("fails if name is empty or exceeds 60 characters", () => {
    const schema = getSplitGroupSchema(t, "create");
    expect(schema.safeParse({ ...validGroupData, name: "" }).success).toBe(false);
    expect(schema.safeParse({ ...validGroupData, name: "a".repeat(61) }).success).toBe(false);
  });
});
