import { describe, expect, it } from "vitest";
import { generateCustomDateSlots } from "./generateCustomDateSlots";
import type { CustomSlotsConfig } from "../../components/CustomDateSlotsPopover/CustomDateSlotsPopover";

describe("generateCustomDateSlots", () => {
  const baseConfig: CustomSlotsConfig = {
    startDate: "2026-06-01", // Monday
    endDate: "2026-06-05", // Friday
    unit: "day",
    frequency: 1,
    skipWeekends: false,
    createAsRange: false,
    selectedWeekDays: [1, 2, 3, 4, 5],
    monthSubMode: "each",
    selectedMonthDay: 1,
    monthOrdinal: "first",
    monthWeekday: "Monday",
    monthWorkdayType: "first",
  };

  it("returns empty array if start date is after end date", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-10",
      endDate: "2026-06-05",
    });
    expect(slots).toEqual([]);
  });

  it("generates daily slots within interval", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      unit: "day",
      frequency: 1,
    });
    expect(slots).toHaveLength(3);
  });

  it("skips weekends when skipWeekends is enabled", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-05", // Friday
      endDate: "2026-06-08", // Monday
      unit: "day",
      frequency: 1,
      skipWeekends: true,
    });
    // Should have Friday (June 5) and Monday (June 8), skipping Sat & Sun
    expect(slots).toHaveLength(2);
  });

  it("merges consecutive days when createAsRange is true", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      createAsRange: true,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getDate()).toBe(1);
    expect(slots[0].end.getDate()).toBe(3);
  });

  it("generates weekly slots based on selected weekdays", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01", // Mon
      endDate: "2026-06-07", // Sun
      unit: "week",
      frequency: 1,
      selectedWeekDays: [1, 3], // Mon, Wed
    });
    expect(slots).toHaveLength(2);
  });

  it("generates monthly slots for specific day of month", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      unit: "month",
      frequency: 1,
      monthSubMode: "each",
      selectedMonthDay: 15,
    });
    expect(slots).toHaveLength(3); // June 15, July 15, Aug 15
  });

  it("generates monthly slots for last day of month", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-08-01",
      unit: "month",
      frequency: 1,
      monthSubMode: "each",
      selectedMonthDay: "last",
    });
    expect(slots).toHaveLength(2); // June 30, July 31
  });

  it("generates monthly slots for 'onThe' weekday ordinal", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-07-31",
      unit: "month",
      frequency: 1,
      monthSubMode: "onThe",
      monthOrdinal: "first",
      monthWeekday: "Friday",
    });
    expect(slots).toHaveLength(2);
  });

  it("generates monthly slots for 'workday' mode", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-07-31",
      unit: "month",
      frequency: 1,
      monthSubMode: "workday",
      monthWorkdayType: "first",
    });
    expect(slots).toHaveLength(2);
  });

  it("generates monthly slots for other month ordinals", () => {
    for (const ordinal of ["second", "third", "fourth", "fifth", "last"] as const) {
      const slots = generateCustomDateSlots({
        ...baseConfig,
        startDate: "2026-05-01",
        endDate: "2026-05-31",
        unit: "month",
        frequency: 1,
        monthSubMode: "onThe",
        monthOrdinal: ordinal,
        monthWeekday: "Friday",
      });
      expect(Array.isArray(slots)).toBe(true);
    }
  });

  it("generates monthly slots for 'workday' mode with 'last' workday", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      unit: "month",
      frequency: 1,
      monthSubMode: "workday",
      monthWorkdayType: "last",
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].start.getDate()).toBe(30);
  });

  it("merges non-consecutive day ranges when createAsRange is true", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      unit: "week",
      frequency: 1,
      selectedWeekDays: [1, 5],
      createAsRange: true,
    });
    expect(slots.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty array when no days match interval", () => {
    const slots = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-06-02",
      unit: "month",
      frequency: 1,
      monthSubMode: "each",
      selectedMonthDay: 15,
    });
    expect(slots).toEqual([]);
  });

  it("filters out targetDay when it falls before startDate or after endDate", () => {
    // First Monday is June 1st, but startDate is June 15th
    const slotsOnThe = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-15",
      endDate: "2026-06-30",
      unit: "month",
      frequency: 1,
      monthSubMode: "onThe",
      monthOrdinal: "first",
      monthWeekday: "Monday",
    });
    expect(slotsOnThe).toEqual([]);

    // First workday is June 1st, but startDate is June 15th
    const slotsWorkday = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-15",
      endDate: "2026-06-30",
      unit: "month",
      frequency: 1,
      monthSubMode: "workday",
      monthWorkdayType: "first",
    });
    expect(slotsWorkday).toEqual([]);

    // Last workday is June 30th, but endDate is June 20th
    const slotsWorkdayEnd = generateCustomDateSlots({
      ...baseConfig,
      startDate: "2026-06-01",
      endDate: "2026-06-20",
      unit: "month",
      frequency: 1,
      monthSubMode: "workday",
      monthWorkdayType: "last",
    });
    expect(slotsWorkdayEnd).toEqual([]);
  });
});
