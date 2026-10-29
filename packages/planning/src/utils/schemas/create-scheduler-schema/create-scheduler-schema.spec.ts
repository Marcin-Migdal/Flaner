import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { getCreateSchedulerSchema } from "./create-scheduler-schema";

describe("getCreateSchedulerSchema", () => {
  const t = (key: string) => key;
  const schema = getCreateSchedulerSchema(t);

  const now = new Date();
  const validEvent = {
    name: "Summer Trip",
    description: "Trip planning",
    endDate: addDays(now, 5),
    participants: ["u1", "u2"],
    proposedDates: [
      { start: addDays(now, 10), end: addDays(now, 12), color: "#ff0000" },
    ],
  };

  it("validates valid scheduler event", () => {
    const result = schema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("fails if name is missing", () => {
    const result = schema.safeParse({ ...validEvent, name: "" });
    expect(result.success).toBe(false);
  });

  it("fails if proposedDates is empty", () => {
    const result = schema.safeParse({ ...validEvent, proposedDates: [] });
    expect(result.success).toBe(false);
  });

  it("fails if endDate is in the past", () => {
    const result = schema.safeParse({
      ...validEvent,
      endDate: addDays(now, -2),
    });
    expect(result.success).toBe(false);
  });

  it("fails if proposed date is in the past", () => {
    const result = schema.safeParse({
      ...validEvent,
      proposedDates: [
        { start: addDays(now, -1), end: addDays(now, 2), color: "#ff0000" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("fails if proposed dates have duplicates", () => {
    const dateSlot = { start: addDays(now, 10), end: addDays(now, 12), color: "#ff0000" };
    const result = schema.safeParse({
      ...validEvent,
      proposedDates: [dateSlot, { ...dateSlot }],
    });
    expect(result.success).toBe(false);
  });

  it("fails if endDate is after the earliest proposed date", () => {
    const result = schema.safeParse({
      ...validEvent,
      endDate: addDays(now, 15),
      proposedDates: [
        { start: addDays(now, 10), end: addDays(now, 12), color: "#ff0000" },
      ],
    });
    expect(result.success).toBe(false);
  });
});
