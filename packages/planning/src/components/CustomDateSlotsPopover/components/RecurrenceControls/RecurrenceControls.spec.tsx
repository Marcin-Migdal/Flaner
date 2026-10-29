import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
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

  it("renders month tabs when unit is month and handles submode changes", async () => {
    const user = userEvent.setup();
    const setMonthSubMode = vi.fn();

    renderWithProviders(
      <RecurrenceControls {...defaultProps} unit="month" setMonthSubMode={setMonthSubMode} />,
    );

    const onTheBtn = screen.getByRole("button", { name: /customSlots.custom.monthModes.onThe/i });
    await user.click(onTheBtn);
    expect(setMonthSubMode).toHaveBeenCalledWith("onThe");

    const workdayBtn = screen.getByRole("button", { name: /customSlots.custom.monthModes.workday/i });
    await user.click(workdayBtn);
    expect(setMonthSubMode).toHaveBeenCalledWith("workday");

    const eachBtn = screen.getByRole("button", { name: /customSlots.custom.monthModes.each/i });
    await user.click(eachBtn);
    expect(setMonthSubMode).toHaveBeenCalledWith("each");
  });

  it("handles day selection in each month submode", async () => {
    const user = userEvent.setup();
    const setSelectedMonthDay = vi.fn();

    renderWithProviders(
      <RecurrenceControls
        {...defaultProps}
        unit="month"
        monthSubMode="each"
        setSelectedMonthDay={setSelectedMonthDay}
      />,
    );

    const day15Btn = screen.getByRole("button", { name: "15" });
    await user.click(day15Btn);
    expect(setSelectedMonthDay).toHaveBeenCalledWith(15);

    const lastDayBtn = screen.getByRole("button", { name: /customSlots.custom.lastDay/i });
    await user.click(lastDayBtn);
    expect(setSelectedMonthDay).toHaveBeenCalledWith("last");
  });

  it("handles frequency input and plural unit labels", async () => {
    const setFrequency = vi.fn();

    const { rerender } = renderWithProviders(
      <RecurrenceControls {...defaultProps} frequency={1} setFrequency={setFrequency} />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3" } });
    expect(setFrequency).toHaveBeenCalledWith(3);

    fireEvent.change(input, { target: { value: "" } });
    expect(setFrequency).toHaveBeenCalledWith(1);

    // Test with frequency > 1 to render plural labels
    rerender(<RecurrenceControls {...defaultProps} frequency={2} setFrequency={setFrequency} />);
    expect(screen.getByText(/customSlots.custom.units.weeks/i)).toBeInTheDocument();
  });

  it("handles unit selection via Select component", async () => {
    const user = userEvent.setup();
    const setUnit = vi.fn();

    renderWithProviders(<RecurrenceControls {...defaultProps} unit="week" setUnit={setUnit} />);

    // Click select control to open dropdown
    const unitControl = screen.getByText(/customSlots.custom.units.week/i);
    await user.click(unitControl);

    const monthOption = await screen.findByText(/customSlots.custom.units.month/i);
    await user.click(monthOption);

    expect(setUnit).toHaveBeenCalledWith("month");
  });

  it("handles onThe month submode Selects", async () => {
    const user = userEvent.setup();
    const setMonthOrdinal = vi.fn();
    const setMonthWeekday = vi.fn();

    renderWithProviders(
      <RecurrenceControls
        {...defaultProps}
        unit="month"
        monthSubMode="onThe"
        setMonthOrdinal={setMonthOrdinal}
        setMonthWeekday={setMonthWeekday}
      />,
    );

    // Ordinal select
    const ordinalControl = screen.getByText(/customSlots.custom.ordinals.first/i);
    await user.click(ordinalControl);
    const secondOption = await screen.findByText(/customSlots.custom.ordinals.second/i);
    await user.click(secondOption);
    expect(setMonthOrdinal).toHaveBeenCalledWith("second");

    // Weekday select
    const weekdayControl = screen.getByText(/customSlots.custom.daysOfWeekFull.mon/i);
    await user.click(weekdayControl);
    const tueOption = await screen.findByText(/customSlots.custom.daysOfWeekFull.tue/i);
    await user.click(tueOption);
    expect(setMonthWeekday).toHaveBeenCalledWith("Tuesday");
  });

  it("handles workday month submode Select", async () => {
    const user = userEvent.setup();
    const setMonthWorkdayType = vi.fn();

    renderWithProviders(
      <RecurrenceControls
        {...defaultProps}
        unit="month"
        monthSubMode="workday"
        setMonthWorkdayType={setMonthWorkdayType}
      />,
    );

    const workdayControl = screen.getByText(/customSlots.custom.workdays.first/i);
    await user.click(workdayControl);
    const lastOption = await screen.findByText(/customSlots.custom.workdays.last/i);
    await user.click(lastOption);
    expect(setMonthWorkdayType).toHaveBeenCalledWith("last");
  });

  it("toggles skipWeekends and createAsRange", async () => {
    const user = userEvent.setup();
    const setSkipWeekends = vi.fn();
    const setCreateAsRange = vi.fn();

    renderWithProviders(
      <RecurrenceControls
        {...defaultProps}
        unit="day"
        setSkipWeekends={setSkipWeekends}
        setCreateAsRange={setCreateAsRange}
      />,
    );

    const skipCheckbox = screen.getByLabelText(/customSlots.custom.skipWeekends/i);
    await user.click(skipCheckbox);
    expect(setSkipWeekends).toHaveBeenCalledWith(true);

    const rangeSwitch = screen.getByLabelText(/customSlots.custom.createAsRange/i);
    await user.click(rangeSwitch);
    expect(setCreateAsRange).toHaveBeenCalledWith(true);
  });
});
