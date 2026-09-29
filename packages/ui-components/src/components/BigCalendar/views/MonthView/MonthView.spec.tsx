import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthView } from "./MonthView";
import type { CalendarEvent } from "../../types";

vi.mock("../../../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("MonthView component", () => {
  const currentDate = new Date(2026, 4, 15); // May 2026

  it("renders weekday headers and days grid", () => {
    render(<MonthView currentDate={currentDate} />);

    expect(screen.getByText("calendar.daysFull.mon")).toBeInTheDocument();
    expect(screen.getByText("calendar.daysFull.sun")).toBeInTheDocument();
  });

  it("renders event and handles onEventClick", async () => {
    const user = userEvent.setup();
    const onEventClickMock = vi.fn();

    const events: CalendarEvent[] = [
      {
        id: "ev-1",
        title: "Team Retrospective",
        start: new Date(2026, 4, 15, 10, 0),
        end: new Date(2026, 4, 15, 11, 0),
      },
    ];

    render(
      <MonthView
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClickMock}
      />
    );

    const eventSegment = screen.getByText("Team Retrospective");
    expect(eventSegment).toBeInTheDocument();

    await user.click(eventSegment);
    expect(onEventClickMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ev-1" }),
      expect.anything()
    );
  });

  it("triggers onDateChange when day cell is clicked in single selection mode", async () => {
    const user = userEvent.setup();
    const onDateChangeMock = vi.fn();

    render(
      <MonthView
        currentDate={currentDate}
        selectionMode="single"
        selectedDate={currentDate}
        onDateChange={onDateChangeMock}
      />
    );

    // Click on the number 15
    const day15 = screen.getByText("15");
    await user.click(day15);

    expect(onDateChangeMock).toHaveBeenCalled();
  });
});
