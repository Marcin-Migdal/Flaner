import { describe, it, expect } from "vitest";
import { getLoginSchema, getSignUpSchema } from "./auth-schema";

const t = (key: string) => key;

describe("auth-schema", () => {
  describe("getLoginSchema", () => {
    const schema = getLoginSchema(t);

    it("validates valid login data", () => {
      const result = schema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("fails on invalid email", () => {
      const result = schema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("validation.emailInvalid");
      }
    });

    it("fails on short password", () => {
      const result = schema.safeParse({
        email: "test@example.com",
        password: "123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("validation.passwordMin");
      }
    });
  });

  describe("getSignUpSchema", () => {
    const schema = getSignUpSchema(t);

    it("validates valid sign up data", () => {
      const result = schema.safeParse({
        username: "johndoe",
        email: "john@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("fails on short username", () => {
      const result = schema.safeParse({
        username: "ab",
        email: "john@example.com",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("validation.usernameMin");
      }
    });
  });
});
