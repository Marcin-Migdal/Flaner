import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { createRef } from "react";
import { PresetSelector } from "./PresetSelector";

describe("PresetSelector", () => {
  const defaultProps = {
    selectedPreset: "daily" as const,
    onSelectPreset: vi.fn(),
    onOpenCustom: vi.fn(),
    weeklyDayName: "Monday",
    monthlyDayNumber: 15,
    startDate: new Date(2026, 5, 1),
    endDate: new Date(2026, 5, 30),
    startDateOpen: false,
    endDateOpen: false,
    onStartDateChange: vi.fn(),
    onEndDateChange: vi.fn(),
    setStartDateOpen: vi.fn(),
    setEndDateOpen: vi.fn(),
    endDateRef: createRef<HTMLButtonElement>(),
  };

  it("renders presets and calls onSelectPreset when clicked", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();

    renderWithProviders(
      <PresetSelector {...defaultProps} onSelectPreset={onSelectPreset} />,
    );

    const dailyBtn = screen.getByRole("button", { name: /customSlots.presets.daily/i });
    await user.click(dailyBtn);
    expect(onSelectPreset).toHaveBeenCalledWith("daily");

    const weeklyBtn = screen.getByRole("button", { name: /customSlots.presets.weeklyWithDay/i });
    await user.click(weeklyBtn);
    expect(onSelectPreset).toHaveBeenCalledWith("weekly");

    const monthlyBtn = screen.getByRole("button", { name: /customSlots.presets.monthlyWithDay/i });
    await user.click(monthlyBtn);
    expect(onSelectPreset).toHaveBeenCalledWith("monthly");

    const weekdaysBtn = screen.getByRole("button", { name: /customSlots.presets.weekdays/i });
    await user.click(weekdaysBtn);
    expect(onSelectPreset).toHaveBeenCalledWith("weekdays");

    const weekendsBtn = screen.getByRole("button", { name: /customSlots.presets.weekends/i });
    await user.click(weekendsBtn);
    expect(onSelectPreset).toHaveBeenCalledWith("weekends");
  });

  it("calls onOpenCustom when custom button is clicked and shows active indicators", async () => {
    const user = userEvent.setup();
    const onOpenCustom = vi.fn();

    const { rerender } = renderWithProviders(
      <PresetSelector {...defaultProps} selectedPreset="custom" onOpenCustom={onOpenCustom} />,
    );

    const customBtn = screen.getByRole("button", { name: /customSlots.presets.custom/i });
    await user.click(customBtn);
    expect(onOpenCustom).toHaveBeenCalled();

    // Verify active check icon renders for each preset type
    const presets = ["daily", "weekly", "monthly", "weekdays", "weekends"] as const;
    for (const preset of presets) {
      rerender(<PresetSelector {...defaultProps} selectedPreset={preset} />);
      expect(document.querySelector("svg.text-brand")).toBeInTheDocument();
    }
  });

  it("handles getOrdinalSuffix across languages and numbers", () => {
    const numbers = [1, 2, 3, 4, 11, 21, 22, 23, 24];
    for (const n of numbers) {
      const { unmount } = renderWithProviders(
        <PresetSelector {...defaultProps} monthlyDayNumber={n} />,
      );
      unmount();
    }

    // Polish suffix
    const plI18n = createTestI18n();
    plI18n.changeLanguage("pl");
    const { unmount: unmountPl } = renderWithProviders(
      <PresetSelector {...defaultProps} monthlyDayNumber={5} />,
      { i18nInstance: plI18n },
    );
    unmountPl();

    // French suffix: 1er and 2e
    const frI18n = createTestI18n();
    frI18n.changeLanguage("fr");
    const { unmount: unmountFr1 } = renderWithProviders(
      <PresetSelector {...defaultProps} monthlyDayNumber={1} />,
      { i18nInstance: frI18n },
    );
    unmountFr1();

    const { unmount: unmountFr2 } = renderWithProviders(
      <PresetSelector {...defaultProps} monthlyDayNumber={2} />,
      { i18nInstance: frI18n },
    );
    unmountFr2();
  });

  it("triggers datepicker change and open callbacks", async () => {
    const user = userEvent.setup();
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const setStartDateOpen = vi.fn();
    const setEndDateOpen = vi.fn();

    renderWithProviders(
      <PresetSelector
        {...defaultProps}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        setStartDateOpen={setStartDateOpen}
        setEndDateOpen={setEndDateOpen}
      />,
    );

    const buttons = screen.getAllByRole("button");
    // Find the datepicker trigger buttons (which display formatted date)
    const dateButtons = buttons.filter((b) => b.textContent?.includes("2026"));
    expect(dateButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(dateButtons[0]);
    expect(setStartDateOpen).toHaveBeenCalledWith(true);

    await user.click(dateButtons[1]);
    expect(setEndDateOpen).toHaveBeenCalledWith(true);
  });
});
