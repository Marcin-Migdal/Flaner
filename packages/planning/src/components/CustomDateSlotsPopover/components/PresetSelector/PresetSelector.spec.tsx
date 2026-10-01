import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
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

    const weeklyBtn = screen.getByRole("button", { name: /customSlots.presets.weeklyWithDay/i });
    await user.click(weeklyBtn);

    expect(onSelectPreset).toHaveBeenCalledWith("weekly");
  });

  it("calls onOpenCustom when custom button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenCustom = vi.fn();

    renderWithProviders(
      <PresetSelector {...defaultProps} onOpenCustom={onOpenCustom} />,
    );

    const customBtn = screen.getByRole("button", { name: /customSlots.presets.custom/i });
    await user.click(customBtn);

    expect(onOpenCustom).toHaveBeenCalled();
  });
});
