import { describe, it, expect } from "vitest";
import { createGroupSchema, updateGroupSchema } from "./groups";

describe("groups validation schemas", () => {
  describe("createGroupSchema", () => {
    it("validates valid group creation payload", () => {
      const validData = {
        name: "Climbing Enthusiasts",
        description: "Outdoor and indoor climbing community.",
        type: "public" as const,
        requiresApproval: false,
      };

      const result = createGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts string avatarUrl or File avatarUrl", () => {
      const withStringAvatar = {
        name: "Board Gamers",
        type: "private" as const,
        requiresApproval: true,
        avatarUrl: "https://example.com/avatar.jpg",
      };
      expect(createGroupSchema.safeParse(withStringAvatar).success).toBe(true);

      const withFileAvatar = {
        name: "Board Gamers",
        type: "private" as const,
        requiresApproval: true,
        avatarUrl: new File(["dummy"], "avatar.png", { type: "image/png" }),
      };
      expect(createGroupSchema.safeParse(withFileAvatar).success).toBe(true);
    });

    it("rejects names shorter than 3 characters", () => {
      const invalidData = {
        name: "AB",
        type: "public" as const,
        requiresApproval: false,
      };

      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("form.errors.minLength");
      }
    });

    it("rejects names longer than 50 characters", () => {
      const invalidData = {
        name: "A".repeat(51),
        type: "public" as const,
        requiresApproval: false,
      };

      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("form.errors.maxLength");
      }
    });

    it("rejects description longer than 255 characters", () => {
      const invalidData = {
        name: "Valid Group Name",
        description: "A".repeat(256),
        type: "public" as const,
        requiresApproval: false,
      };

      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("form.errors.maxLength");
      }
    });

    it("rejects invalid type", () => {
      const invalidData = {
        name: "Valid Group Name",
        type: "secret",
        requiresApproval: false,
      };

      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateGroupSchema", () => {
    it("is identical to createGroupSchema", () => {
      expect(updateGroupSchema).toBe(createGroupSchema);
    });
  });
});
