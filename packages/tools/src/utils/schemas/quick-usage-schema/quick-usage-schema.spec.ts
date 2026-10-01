import { describe, it, expect } from "vitest";
import { getQuickUsageSchema } from "./quick-usage-schema";

describe("quick-usage-schema", () => {
  const t = (key: string) => `translated:${key}`;
  const schema = getQuickUsageSchema(t);

  it("validates positive modelWeight", () => {
    const validData = { modelWeight: 50 };
    const result = schema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it("rejects zero or negative modelWeight with translation", () => {
    const zeroResult = schema.safeParse({ modelWeight: 0 });
    expect(zeroResult.success).toBe(false);
    if (!zeroResult.success) {
      expect(zeroResult.error.issues[0].message).toBe("translated:spooler.spools.validation.usagePositive");
    }

    const negativeResult = schema.safeParse({ modelWeight: -10 });
    expect(negativeResult.success).toBe(false);
  });
});
