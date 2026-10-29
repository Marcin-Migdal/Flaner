import { describe, expect, it } from "vitest";
import { getCreateSettlementSchema } from "./create-settlement-schema";

describe("getCreateSettlementSchema", () => {
  const t = (key: string) => key;
  const schema = getCreateSettlementSchema(t);

  const validSettlement = {
    payerId: "userA",
    receiverId: "userB",
    amount: 50.25,
    currency: "PLN",
    date: new Date(),
    note: "Settling up for pizza",
  };

  it("validates valid settlement", () => {
    const result = schema.safeParse(validSettlement);
    expect(result.success).toBe(true);
  });

  it("fails if payer and receiver are the same person", () => {
    const result = schema.safeParse({
      ...validSettlement,
      receiverId: "userA",
    });
    expect(result.success).toBe(false);
  });

  it("fails if amount is non-positive or has more than 2 decimals", () => {
    expect(schema.safeParse({ ...validSettlement, amount: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...validSettlement, amount: -10 }).success).toBe(false);
    expect(schema.safeParse({ ...validSettlement, amount: 10.123 }).success).toBe(false);
  });

  it("fails if note exceeds 120 characters", () => {
    const result = schema.safeParse({
      ...validSettlement,
      note: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });
});
