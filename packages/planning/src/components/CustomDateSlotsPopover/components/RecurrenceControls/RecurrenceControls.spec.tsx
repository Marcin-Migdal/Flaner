import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { RecurrenceControls } from "./RecurrenceControls";

describe("RecurrenceControls", () => {
  const defaultProps = {
    onBack: vi.fn(),
    frequency: 1,
    setFrequency: vi.fn(),
    unit: "week" as const,
    setUnit: vi.fn(),
    selectedWeekDays: [1],
    toggleWeekDay: vi.fn(),
    monthSubMode: "each" as const,
    setMonthSubMode: vi.fn(),
    selectedMonthDay: 1,
    setSelectedMonthDay: vi.fn(),
    monthOrdinal: "first" as const,
    setMonthOrdinal: vi.fn(),
    monthWeekday: "Monday" as const,
    setMonthWeekday: vi.fn(),
    monthWorkdayType: "first" as const,
    setMonthWorkdayType: vi.fn(),
    skipWeekends: false,
    setSkipWeekends: vi.fn(),
    createAsRange: false,
    setCreateAsRange: vi.fn(),
  };

  it("renders week subpanel and toggles weekday on click", async () => {
    const user = userEvent.setup();
    const toggleWeekDay = vi.fn();

    renderWithProviders(
      <RecurrenceControls {...defaultProps} unit="week" toggleWeekDay={toggleWeekDay} />,
    );

    const monBtn = screen.getByRole("button", { name: /customSlots.custom.daysOfWeek.mon/i });
    await user.click(monBtn);

    expect(toggleWeekDay).toHaveBeenCalledWith(1);
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    renderWithProviders(<RecurrenceControls {...defaultProps} onBack={onBack} />);

    const backBtn = screen.getByRole("button", { name: /customSlots.custom.back/i });
    await user.click(backBtn);

    expect(onBack).toHaveBeenCalled();
  });

  it("renders month tabs when unit is month", () => {
    renderWithProviders(<RecurrenceControls {...defaultProps} unit="month" />);

    expect(screen.getByRole("button", { name: /customSlots.custom.monthModes.each/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /customSlots.custom.monthModes.onThe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /customSlots.custom.monthModes.workday/i })).toBeInTheDocument();
  });
});
