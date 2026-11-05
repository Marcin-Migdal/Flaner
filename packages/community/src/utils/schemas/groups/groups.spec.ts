import { describe, it, expect } from "vitest";
import { getGroupSchema } from "./groups";

// Identity translator: the schema must pass translated messages, so the keys show up as messages here
const schema = getGroupSchema((key) => key);

describe("getGroupSchema", () => {
  it("validates valid group creation payload", () => {
    const validData = {
      name: "Climbing Enthusiasts",
      description: "Outdoor and indoor climbing community.",
      type: "public" as const,
      requiresApproval: false,
    };

    expect(schema.safeParse(validData).success).toBe(true);
  });

  it("accepts string avatarUrl or File avatarUrl", () => {
    const base = { name: "Board Gamers", type: "private" as const, requiresApproval: true };

    expect(schema.safeParse({ ...base, avatarUrl: "https://example.com/avatar.jpg" }).success).toBe(true);
    expect(
      schema.safeParse({ ...base, avatarUrl: new File(["dummy"], "avatar.png", { type: "image/png" }) }).success,
    ).toBe(true);
  });

  it.each([
    ["names shorter than 3 characters", { name: "AB" }, "validation.groupNameMin"],
    ["names longer than 50 characters", { name: "A".repeat(51) }, "validation.groupNameMax"],
    ["descriptions longer than 255 characters", { name: "Valid Group Name", description: "A".repeat(256) }, "validation.descriptionMax"],
  ])("rejects %s with a translated message", (_label, fields, key) => {
    const result = schema.safeParse({ type: "public", requiresApproval: false, ...fields });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(key);
    }
  });

  it("rejects invalid type", () => {
    expect(schema.safeParse({ name: "Valid Group Name", type: "secret", requiresApproval: false }).success).toBe(false);
  });
});
