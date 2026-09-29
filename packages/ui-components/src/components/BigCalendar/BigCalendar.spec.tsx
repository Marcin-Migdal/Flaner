import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BigCalendar } from "./BigCalendar";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

describe("BigCalendar component", () => {
  it("renders default month view with header", () => {
    render(<BigCalendar view="month" />);

    expect(screen.getByText("calendar.daysFull.mon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "calendar.today" })).toBeInTheDocument();
  });

  it("renders WeekView and DayView when view prop changes", () => {
    const { rerender } = render(<BigCalendar view="week" />);
    expect(screen.getByText("Week View (TBD)")).toBeInTheDocument();

    rerender(<BigCalendar view="day" />);
    expect(screen.getByText("Day View (TBD)")).toBeInTheDocument();
  });

  it("renders custom view when specified in customViews", () => {
    const customViews = {
      agenda: {
        label: "Agenda",
        render: () => <div data-testid="custom-agenda">Custom Agenda View</div>,
      },
    };

    render(<BigCalendar view="agenda" customViews={customViews} />);

    expect(screen.getByTestId("custom-agenda")).toBeInTheDocument();
  });

  it("handles prev, next, and today navigation", async () => {
    const user = userEvent.setup();
    render(<BigCalendar view="month" />);

    const buttons = screen.getAllByRole("button");
    const prevBtn = buttons[0];
    const nextBtn = buttons[2];

    await user.click(nextBtn);
    await user.click(prevBtn);
    await user.click(screen.getByRole("button", { name: "calendar.today" }));

    expect(screen.getByText("calendar.daysFull.mon")).toBeInTheDocument();
  });
});
