import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthView } from "./MonthView";
import type { CalendarEvent } from "../../types";

let resizeCallback: ResizeObserverCallback | null = null;
globalThis.ResizeObserver = class {
  constructor(cb: ResizeObserverCallback) {
    resizeCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("../../../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.count) return `+${params.count} more`;
      return key;
    },
    i18n: { language: "pl" },
  }),
}));

describe("MonthView component", () => {
  const currentDate = new Date(2026, 4, 15); // May 2026

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders weekday headers and days grid", () => {
    render(<MonthView currentDate={currentDate} />);

    expect(screen.getByText("calendar.daysFull.mon")).toBeInTheDocument();
    expect(screen.getByText("calendar.daysFull.sun")).toBeInTheDocument();
  });

  it("renders event, handles hover and calls onEventClick", async () => {
    const user = userEvent.setup();
    const onEventClickMock = vi.fn();

    const events: CalendarEvent[] = [
      {
        id: "ev-1",
        title: "Team Retrospective",
        start: new Date(2026, 4, 15, 10, 0),
        end: new Date(2026, 4, 15, 11, 0),
        color: "#123456",
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

    // Hover
    fireEvent.mouseEnter(eventSegment);
    fireEvent.mouseLeave(eventSegment);

    await user.click(eventSegment);
    expect(onEventClickMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ev-1" }),
      expect.anything()
    );

    const removeBtn = eventSegment.closest("div")?.querySelector("button");
    if (removeBtn) {
      await user.click(removeBtn);
      expect(onEventClickMock).toHaveBeenCalledTimes(2);
    }
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

    const day15 = screen.getByText("15");
    await user.click(day15);

    expect(onDateChangeMock).toHaveBeenCalled();
  });

  it("handles range selection mode clicks, hovers, and clear buttons", async () => {
    const user = userEvent.setup();
    const onDateChangeMock = vi.fn();
    const day10 = new Date(2026, 4, 10);
    const day15 = new Date(2026, 4, 15);

    // 1. Initial click (no start date selected yet)
    const { rerender } = render(
      <MonthView
        currentDate={currentDate}
        selectionMode="range"
        selectedDate={undefined}
        onDateChange={onDateChangeMock}
      />
    );

    await user.click(screen.getByText("10"));
    expect(onDateChangeMock).toHaveBeenCalledWith([expect.any(Date)]);

    // 2. Start date selected: click after start
    rerender(
      <MonthView
        currentDate={currentDate}
        selectionMode="range"
        selectedDate={[day10]}
        onDateChange={onDateChangeMock}
      />
    );

    // Hovering day 12
    const cell12 = screen.getByText("12").closest("div");
    if (cell12) {
      fireEvent.mouseEnter(cell12);
      fireEvent.mouseLeave(cell12);
    }

    await user.click(screen.getByText("15"));
    expect(onDateChangeMock).toHaveBeenCalledWith([day10, expect.any(Date)]);

    // 3. Start date selected: click before start
    await user.click(screen.getByText("5"));
    expect(onDateChangeMock).toHaveBeenCalledWith([expect.any(Date), day10]);

    // 4. Clear start button
    rerender(
      <MonthView
        currentDate={currentDate}
        selectionMode="range"
        selectedDate={[day10, day15]}
        onDateChange={onDateChangeMock}
      />
    );

    const clearButtons = screen.getAllByRole("button");
    // Find the small clear buttons inside the day headers
    const clearStartBtn = clearButtons[0];
    await user.click(clearStartBtn);
    expect(onDateChangeMock).toHaveBeenCalledWith(null);

    // Clear end button
    const clearEndBtn = clearButtons[1];
    await user.click(clearEndBtn);
    expect(onDateChangeMock).toHaveBeenCalledWith([day10]);
  });

  it("ignores clicks on disabled dates and non-selection mode", async () => {
    const user = userEvent.setup();
    const onDateChangeMock = vi.fn();
    const disabledDay = new Date(2026, 4, 12);

    render(
      <MonthView
        currentDate={currentDate}
        selectionMode="single"
        disabledDates={{ dates: [disabledDay] }}
        onDateChange={onDateChangeMock}
      />
    );

    const day12 = screen.getByText("12");
    await user.click(day12);
    expect(onDateChangeMock).not.toHaveBeenCalled();
  });

  it("renders with custom renderEvent component and slot sizes", () => {
    const onEventClickMock = vi.fn();
    const events: CalendarEvent[] = [
      {
        id: "custom-ev",
        title: "Custom Event",
        start: new Date(2026, 4, 10),
        end: new Date(2026, 4, 12),
      },
    ];

    const { rerender } = render(
      <MonthView
        currentDate={currentDate}
        events={events}
        slotSize="sm"
        onEventClick={onEventClickMock}
        renderEvent={({ event, onClick, onMouseEnter, onMouseLeave }) => (
          <button
            type="button"
            data-testid="custom-event"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {event.title}
          </button>
        )}
      />
    );

    const customEl = screen.getAllByTestId("custom-event")[0];
    expect(customEl).toBeInTheDocument();
    fireEvent.mouseEnter(customEl);
    fireEvent.mouseLeave(customEl);
    fireEvent.click(customEl);
    expect(onEventClickMock).toHaveBeenCalled();

    rerender(
      <MonthView
        currentDate={currentDate}
        events={events}
        slotSize="lg"
      />
    );
  });

  it("handles hidden events popover and custom renderMoreEvents", async () => {
    const user = userEvent.setup();
    const onEventClickMock = vi.fn();
    const events: CalendarEvent[] = [
      { id: "e1", title: "Event One", start: new Date(2026, 4, 10), end: new Date(2026, 4, 10) },
      { id: "e2", title: "Event Two", start: new Date(2026, 4, 10), end: new Date(2026, 4, 10) },
      { id: "e3", title: "Event Three", start: new Date(2026, 4, 10), end: new Date(2026, 4, 10) },
    ];

    const { rerender } = render(
      <MonthView
        currentDate={currentDate}
        events={events}
        maxEventsPerDay={1}
        onEventClick={onEventClickMock}
      />
    );

    // "+2 more" button
    const moreBtn = screen.getByText("+2 more");
    expect(moreBtn).toBeInTheDocument();
    await user.click(moreBtn);

    // Popover content should open
    const popoverItem = screen.getByText("Event Two");
    expect(popoverItem).toBeInTheDocument();
    await user.click(popoverItem);
    expect(onEventClickMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e2" }),
      expect.anything()
    );

    // Custom renderMoreEvents
    rerender(
      <MonthView
        currentDate={currentDate}
        events={events}
        maxEventsPerDay={1}
        renderMoreEvents={(hidden) => <div data-testid="custom-more">{hidden.length} extra</div>}
      />
    );

    expect(screen.getByTestId("custom-more")).toHaveTextContent("2 extra");
  });

  it("handles ResizeObserver callback and updates maxEventsPerDay", () => {
    render(<MonthView currentDate={currentDate} />);

    if (resizeCallback) {
      const cb = resizeCallback;
      act(() => {
        cb(
          [{ contentRect: { height: 800 } }] as unknown as ResizeObserverEntry[],
          {} as ResizeObserver
        );
      });
    }
  });

  it("renders empty slot placeholder when an event occupies slot 1 while slot 0 is free", () => {
    const events: CalendarEvent[] = [
      { id: "eB", title: "Long Event", start: new Date(2026, 4, 10), end: new Date(2026, 4, 12) },
      { id: "eA", title: "Overlap Event", start: new Date(2026, 4, 9), end: new Date(2026, 4, 10) },
    ];

    render(
      <MonthView
        currentDate={currentDate}
        events={events}
        maxEventsPerDay={3}
      />
    );

    expect(screen.getByText("Long Event")).toBeInTheDocument();
    expect(screen.getByText("Overlap Event")).toBeInTheDocument();
  });
});

