import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { enUS } from "date-fns/locale";
import { CalendarPreview } from "./CalendarPreview";

describe("CalendarPreview", () => {
  const selectedDate = new Date(2026, 5, 15);
  const calendarMonth = new Date(2026, 5, 1);
  const emptyClassification = {
    rangeStartDates: [],
    rangeMiddleDates: [],
    rangeEndDates: [],
    allSelectedDates: [],
  };

  it("renders calendar for given month", () => {
    render(
      <CalendarPreview
        selectedDates={[selectedDate]}
        rangeClassification={emptyClassification}
        calendarMonth={calendarMonth}
        onMonthChange={vi.fn()}
        locale={enUS}
        isInteractive={false}
      />,
    );

    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("triggers onDayClick when day is clicked in interactive mode", async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();

    render(
      <CalendarPreview
        selectedDates={[selectedDate]}
        rangeClassification={emptyClassification}
        calendarMonth={calendarMonth}
        onMonthChange={vi.fn()}
        locale={enUS}
        isInteractive={true}
        onDayClick={onDayClick}
      />,
    );

    const day15 = screen.getByRole("button", { name: /15th June 2026|June 15/i });
    await user.click(day15);

    expect(onDayClick).toHaveBeenCalled();
  });
});
