import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BigCalendarHeader } from "./BigCalendarHeader";

vi.mock("../../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => {
      if (key === "calendar.today") return "Today";
      if (key === "calendar.views.month") return "Month";
      if (key === "calendar.views.week") return "Week";
      return key;
    },
    i18n: { language: "en" },
  }),
}));

describe("BigCalendarHeader component", () => {
  const currentDate = new Date(2026, 4, 15); // May 2026

  it("renders formatted title and calls prev, next, today callbacks", async () => {
    const user = userEvent.setup();
    const onPrevMock = vi.fn();
    const onNextMock = vi.fn();
    const onTodayMock = vi.fn();

    render(
      <BigCalendarHeader
        currentDate={currentDate}
        view="month"
        onPrev={onPrevMock}
        onNext={onNextMock}
        onToday={onTodayMock}
      />
    );

    expect(screen.getByText(/May 2026/i)).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    // buttons: prev, today, next
    await user.click(buttons[0]); // prev
    expect(onPrevMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onTodayMock).toHaveBeenCalledTimes(1);

    await user.click(buttons[2]); // next
    expect(onNextMock).toHaveBeenCalledTimes(1);
  });

  it("switches views when view switcher button is clicked", async () => {
    const user = userEvent.setup();
    const onViewChangeMock = vi.fn();

    render(
      <BigCalendarHeader
        currentDate={currentDate}
        view="month"
        views={["month", "week"]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        onViewChange={onViewChangeMock}
      />
    );

    const weekBtn = screen.getByRole("button", { name: /week/i });
    await user.click(weekBtn);

    expect(onViewChangeMock).toHaveBeenCalledWith("week");
  });

  it("handles week view, day view, customViews, and extra header content", () => {
    // Week view with custom right content and custom views
    const { unmount } = render(
      <BigCalendarHeader
        currentDate={currentDate}
        view="week"
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        headerButtonContent={<span>Extra Header Btn</span>}
        headerRightContent={<span>Extra Right Content</span>}
        customViews={{
          timeline: { label: "Timeline", component: () => null },
        }}
      />
    );

    expect(screen.getByText("Extra Header Btn")).toBeInTheDocument();
    expect(screen.getByText("Extra Right Content")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    unmount();

    // Day view with hideViewSwitcher and default resolvedViews when onViewChange is provided
    render(
      <BigCalendarHeader
        currentDate={currentDate}
        view="day"
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        onViewChange={vi.fn()}
        hideViewSwitcher
      />
    );

    // Title should format as full day
    expect(screen.getByText(/May 2026/i)).toBeInTheDocument();
  });
});
