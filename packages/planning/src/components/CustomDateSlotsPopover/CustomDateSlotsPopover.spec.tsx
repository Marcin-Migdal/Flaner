import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { CustomDateSlotsPopover } from "./CustomDateSlotsPopover";

let isMobileMock = false;
vi.mock("@flaner/shared/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/hooks")>();
  return {
    ...actual,
    useIsMobile: () => isMobileMock,
  };
});

describe("CustomDateSlotsPopover", () => {
  beforeEach(() => {
    isMobileMock = false;
  });

  it("renders trigger button and opens popover on click, and handles cancel", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByText(/customSlots\.custom\.apply/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /customSlots\.custom\.cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/customSlots\.custom\.apply/i)).not.toBeInTheDocument();
    });
  });

  it("renders custom trigger button when provided", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CustomDateSlotsPopover trigger={<button type="button">Custom Trigger</button>} />,
    );

    const trigger = screen.getByRole("button", { name: "Custom Trigger" });
    await user.click(trigger);

    expect(screen.getByText(/customSlots\.custom\.apply/i)).toBeInTheDocument();
  });

  it("calls onApply when apply button is clicked with preset configuration", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();

    renderWithProviders(<CustomDateSlotsPopover onApply={handleApply} />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    const applyButton = screen.getByRole("button", { name: /customSlots\.custom\.apply/i });
    await user.click(applyButton);

    expect(handleApply).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: 1,
        unit: "week",
      }),
    );
  });

  it("handles switching between presets (daily, weekdays, weekly, weekends, monthly)", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    // Switch to weekdays (selects multiple days)
    const weekdaysBtn = screen.getByRole("button", { name: /customSlots\.presets\.weekdays/i });
    await user.click(weekdaysBtn);

    // Switch back to weekly (resets selectedWeekDays to 1 element)
    const weeklyBtn = screen.getByRole("button", { name: /customSlots\.presets\.weeklyWithDay/i });
    await user.click(weeklyBtn);

    // Switch to weekends
    const weekendsBtn = screen.getByRole("button", { name: /customSlots\.presets\.weekends/i });
    await user.click(weekendsBtn);

    // Switch to daily
    const dailyBtn = screen.getByRole("button", { name: /customSlots\.presets\.daily/i });
    await user.click(dailyBtn);

    // Switch to monthly
    const monthlyBtn = screen.getByRole("button", { name: /customSlots\.presets\.monthlyWithDay/i });
    await user.click(monthlyBtn);

    expect(screen.getByRole("button", { name: /customSlots\.presets\.monthlyWithDay/i })).toBeInTheDocument();
  });

  it("handles calendar day clicks in interactive weekly and monthly modes", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    // In default weekly mode: clicking a calendar day updates weekly day
    const dayBtn = document.querySelector<HTMLButtonElement>("button[data-day]");
    if (dayBtn) {
      await user.click(dayBtn);
    }

    // Switch to monthly mode and click a calendar day
    const monthlyBtn = screen.getByRole("button", { name: /customSlots\.presets\.monthlyWithDay/i });
    await user.click(monthlyBtn);

    const dayBtns = document.querySelectorAll<HTMLButtonElement>("button[data-day]");
    if (dayBtns.length > 1) {
      await user.click(dayBtns[1]);
    }
  });

  it("handles custom recurrence mode: navigation, weekday toggle, range creation, and apply", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();

    renderWithProviders(<CustomDateSlotsPopover onApply={handleApply} />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    // Navigate to custom view
    const customButton = screen.getByText(/customSlots\.presets\.custom/i);
    await user.click(customButton);
    expect(screen.getByText(/customSlots\.custom\.title/i)).toBeInTheDocument();

    // Test back button
    const backBtn = screen.getByRole("button", { name: /customSlots\.custom\.back/i });
    await user.click(backBtn);
    expect(screen.getByText(/customSlots\.presets\.custom/i)).toBeInTheDocument();

    // Return to custom view with freshly queried button
    const customButtonAgain = screen.getByText(/customSlots\.presets\.custom/i);
    await user.click(customButtonAgain);

    // Toggle weekdays (adding and removing days)
    const tueBtn = await screen.findByRole("button", { name: /customSlots\.custom\.daysOfWeek\.tue/i });
    await user.click(tueBtn); // Add Tuesday
    await user.click(tueBtn); // Remove Tuesday

    // Enable createAsRange switch (creates multi-day ranges exercising classifyDateSlots)
    const rangeSwitch = screen.getByLabelText(/customSlots\.custom\.createAsRange/i);
    await user.click(rangeSwitch);

    // Apply custom config
    const applyButton = screen.getByRole("button", { name: /customSlots\.custom\.apply/i });
    await user.click(applyButton);

    expect(handleApply).toHaveBeenCalledWith(
      expect.objectContaining({
        createAsRange: true,
      }),
    );
  });

  it("handles start and end date changes via DatePicker inputs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    // Find datepicker triggers inside PresetSelector
    const dateButtons = screen.getAllByRole("button").filter((b) => /\d{2}\.\d{2}\.\d{4}/.test(b.textContent || ""));
    expect(dateButtons.length).toBe(2);

    // Click start date trigger to open its calendar
    await user.click(dateButtons[0]);

    // Click an unselected day in the opened start date picker table
    const startCalendar = document.querySelector('[data-mode="single"]');
    expect(startCalendar).toBeInTheDocument();

    const startDays = Array.from(startCalendar?.querySelectorAll<HTMLButtonElement>("button") || []).filter(
      (b) => !b.disabled && b.textContent?.trim() !== "",
    );
    if (startDays.length > 5) {
      await user.click(startDays[5]);
    }

    // Now end date picker should open automatically or we click end date trigger
    await user.click(dateButtons[1]);
    const endCalendar = document.querySelector('[data-mode="single"]');
    const endDays = Array.from(endCalendar?.querySelectorAll<HTMLButtonElement>("button") || []).filter(
      (b) => !b.disabled && b.textContent?.trim() !== "",
    );
    if (endDays.length > 8) {
      await user.click(endDays[8]);
    }
  });

  it("handles custom mode with consecutive days, last day reset, and createAsRange to produce ranges", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();
    renderWithProviders(<CustomDateSlotsPopover onApply={handleApply} />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    // First go to custom mode, set month mode to 'each' and select 'last' day
    const customButton = screen.getByText(/customSlots\.presets\.custom/i);
    await user.click(customButton);

    // In week mode, select Friday and Saturday and enable createAsRange (hits dayDiff === 1)
    const friBtn = screen.getByRole("button", { name: /customSlots\.custom\.daysOfWeek\.fri/i });
    const satBtn = screen.getByRole("button", { name: /customSlots\.custom\.daysOfWeek\.sat/i });
    await user.click(friBtn);
    await user.click(satBtn);

    const rangeSwitch = screen.getByLabelText(/customSlots\.custom\.createAsRange/i);
    await user.click(rangeSwitch);

    // Switch unit to day (creates 30-day slot hitting dayDiff > 1 and rangeMiddleDates)
    const unitControl = screen.getByText(/customSlots\.custom\.units\.week/i);
    await user.click(unitControl);
    const dayOption = await screen.findByText(/customSlots\.custom\.units\.day/i);
    await user.click(dayOption);

    // Now switch unit to month and test last day reset
    const unitControl2 = screen.getByText(/customSlots\.custom\.units\.day/i);
    await user.click(unitControl2);
    const monthOption = await screen.findByText(/customSlots\.custom\.units\.month/i);
    await user.click(monthOption);

    // Click 'last day' in month days grid
    const lastDayBtn = screen.getByRole("button", { name: /customSlots\.custom\.lastDay/i });
    await user.click(lastDayBtn);

    // Go back to presets
    const backBtn = screen.getByRole("button", { name: /customSlots\.custom\.back/i });
    await user.click(backBtn);

    // Click 'monthly' preset -> this triggers typeof selectedMonthDay !== "number" -> resets to currentDayOfMonth!
    const monthlyBtn = screen.getByRole("button", { name: /customSlots\.presets\.monthlyWithDay/i });
    await user.click(monthlyBtn);

    // Apply
    const applyButton = screen.getByRole("button", { name: /customSlots\.custom\.apply/i });
    await user.click(applyButton);

    expect(handleApply).toHaveBeenCalled();
  });

  it("handles mobile dialog rendering and switching to custom mode when isMobile is true", async () => {
    const user = userEvent.setup();
    isMobileMock = true;

    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Switch to custom mode while in mobile dialog
    const customButton = screen.getByText(/customSlots\.presets\.custom/i);
    await user.click(customButton);
    expect(screen.getByLabelText(/customSlots\.custom\.createAsRange/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /customSlots\.custom\.cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("handles deselecting all weekdays and returning to presets", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    const customButton = screen.getByText(/customSlots\.presets\.custom/i);
    await user.click(customButton);

    // Unselect the currently selected weekday buttons
    const dayButtons = screen.getAllByRole("button", { name: /customSlots\.custom\.daysOfWeek\./i });
    for (const btn of dayButtons) {
      if (btn.getAttribute("data-state") === "on" || btn.getAttribute("aria-pressed") === "true" || btn.className.includes("bg-brand")) {
        await user.click(btn);
      }
    }

    // Go back to presets
    const backBtn = screen.getByRole("button", { name: /customSlots\.custom\.back/i });
    await user.click(backBtn);

    expect(screen.getByText(/customSlots\.presets\.weeklyWithDay/i)).toBeInTheDocument();
  });
});

