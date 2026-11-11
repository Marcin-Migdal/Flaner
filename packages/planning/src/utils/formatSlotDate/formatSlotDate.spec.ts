import { enUS, pl } from "date-fns/locale";
import { formatSlotDate } from "./formatSlotDate";

describe("formatSlotDate", () => {
  it("formats a same-day slot with the year and weekday", () => {
    expect(formatSlotDate({ start: "2026-07-10", end: "2026-07-10" }, enUS)).toBe("10.07.2026 (Fri)");
  });

  it("formats a range within one year without the year", () => {
    expect(formatSlotDate({ start: "2026-07-10", end: "2026-07-12" }, enUS)).toBe("10.07 (Fri) - 12.07 (Sun)");
  });

  it("adds the years when the range crosses a year", () => {
    expect(formatSlotDate({ start: "2026-12-30", end: "2027-01-02" }, enUS)).toBe(
      "30.12.2026 (Wed) - 02.01.2027 (Sat)",
    );
  });

  it("drops the trailing dot of abbreviated weekdays", () => {
    expect(formatSlotDate({ start: "2026-07-10", end: "2026-07-10" }, pl)).toBe("10.07.2026 (pt)");
  });
});
