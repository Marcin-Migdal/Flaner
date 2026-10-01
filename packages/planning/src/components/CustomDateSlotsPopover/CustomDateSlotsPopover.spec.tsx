import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { CustomDateSlotsPopover } from "./CustomDateSlotsPopover";

describe("CustomDateSlotsPopover", () => {
  it("renders trigger button and opens popover on click", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();

    renderWithProviders(<CustomDateSlotsPopover onApply={handleApply} />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByText(/customSlots\.custom\.apply/i)).toBeInTheDocument();
  });

  it("calls onApply when apply button is clicked", async () => {
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
        unit: expect.any(String),
      }),
    );
  });

  it("navigates to custom recurrence view when custom preset is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CustomDateSlotsPopover />);

    const trigger = screen.getByTitle(/customSlots\.triggerTooltip/i);
    await user.click(trigger);

    const customButton = screen.getByText(/customSlots\.presets\.custom/i);
    await user.click(customButton);

    expect(screen.getByText(/customSlots\.custom\.title/i)).toBeInTheDocument();
  });
});
