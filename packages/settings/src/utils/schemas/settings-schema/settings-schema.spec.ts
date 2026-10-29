import { describe, it, expect } from "vitest";
import getSettingsSchema, { getSettingsSchema as namedGetSettingsSchema } from "./settings-schema";

describe("settings-schema", () => {
  const t = (key: string) => `translated:${key}`;
  const schema = getSettingsSchema(t);

  it("exports both default and named getSettingsSchema", () => {
    expect(getSettingsSchema).toBe(namedGetSettingsSchema);
  });

  it("validates valid settings with string avatar", () => {
    const validData = {
      username: "alice",
      language: "en" as const,
      darkMode: true,
      avatar: "https://example.com/avatar.jpg",
    };

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it("validates valid settings with File avatar", () => {
    const mockFile = new File(["dummy content"], "avatar.png", { type: "image/png" });
    const validData = {
      username: "bob123",
      language: "pl" as const,
      darkMode: false,
      avatar: mockFile,
    };

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates valid settings with null or omitted avatar", () => {
    const withNullAvatar = {
      username: "charlie",
      language: "pl" as const,
      darkMode: true,
      avatar: null,
    };
    expect(schema.safeParse(withNullAvatar).success).toBe(true);

    const withOmittedAvatar = {
      username: "charlie",
      language: "en" as const,
      darkMode: false,
    };
    expect(schema.safeParse(withOmittedAvatar).success).toBe(true);
  });

  it("fails when username is empty", () => {
    const invalidData = {
      username: "",
      language: "en" as const,
      darkMode: true,
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("username"));
      expect(issue?.message).toBe(t("validation.usernameRequired"));
    }
  });

  it("fails when username is less than 3 characters", () => {
    const invalidData = {
      username: "ab",
      language: "en" as const,
      darkMode: true,
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("username"));
      expect(issue?.message).toBe(t("validation.usernameMin"));
    }
  });

  it("fails when language is invalid", () => {
    const invalidData = {
      username: "validuser",
      language: "de",
      darkMode: true,
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when darkMode is not boolean", () => {
    const invalidData = {
      username: "validuser",
      language: "en" as const,
      darkMode: "yes",
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when avatar is invalid type (e.g. number)", () => {
    const invalidData = {
      username: "validuser",
      language: "en" as const,
      darkMode: true,
      avatar: 12345,
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
