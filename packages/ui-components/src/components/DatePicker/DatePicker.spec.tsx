import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./DatePicker";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => (key === "datePicker.selectDate" ? "Select date" : key),
    i18n: { language: "en" },
  }),
}));

describe("DatePicker component", () => {
  it("renders with placeholder when no date is selected", () => {
    render(<DatePicker label="Event date" description="Pick your arrival day" />);

    expect(screen.getByText("Event date")).toBeInTheDocument();
    expect(screen.getByText("Select date")).toBeInTheDocument();
    expect(screen.getByText("Pick your arrival day")).toBeInTheDocument();
  });

  it("renders formatted date when value is provided", () => {
    const testDate = new Date(2026, 4, 15); // May 15, 2026
    render(<DatePicker label="Deadline" value={testDate} dateFormat="yyyy-MM-dd" />);

    expect(screen.getByText("2026-05-15")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<DatePicker label="Deadline" error="Date must be in the future" />);
    expect(screen.getByText("Date must be in the future")).toBeInTheDocument();
  });

  it("opens popover calendar on click", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Schedule" />);

    const triggerBtn = screen.getByRole("button", { name: "Schedule" });
    await user.click(triggerBtn);

    // Popover content should open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables trigger button when disabled={true}", () => {
    render(<DatePicker label="Disabled date" disabled />);
    const triggerBtn = screen.getByRole("button", { name: "Disabled date" });
    expect(triggerBtn).toBeDisabled();
  });

  it("selects a date and invokes onChange with autoCloseOnSelect", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <DatePicker
        label="Schedule"
        onChange={onChangeMock}
        autoCloseOnSelect={true}
      />
    );

    const triggerBtn = screen.getByRole("button", { name: "Schedule" });
    await user.click(triggerBtn);

    const dayButtons = screen.getAllByRole("button");
    const day15 = dayButtons.find((btn) => btn.textContent?.trim() === "15");
    if (day15) {
      await user.click(day15);
    }

    expect(onChangeMock).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("selects a different date and calls onOpenChange in controlled open mode", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const onChangeMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <DatePicker
        label="Schedule"
        value={today}
        onChange={onChangeMock}
        autoCloseOnSelect={true}
        open={true}
        onOpenChange={onOpenChangeMock}
      />
    );

    const selectedBtn = document.querySelector<HTMLButtonElement>('[data-selected-single="true"]');
    const otherDayBtn = Array.from(document.querySelectorAll<HTMLButtonElement>("table button")).find(
      (b) => b !== selectedBtn && !b.disabled
    );

    expect(otherDayBtn).toBeDefined();
    if (otherDayBtn) {
      await user.click(otherDayBtn);
      expect(onChangeMock).toHaveBeenCalled();
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    }
  });

  it("closes popover when clicking the already selected date with autoCloseOnSelect={true}", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const onChangeMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <DatePicker
        label="Schedule"
        value={today}
        onChange={onChangeMock}
        autoCloseOnSelect={true}
        open={true}
        onOpenChange={onOpenChangeMock}
      />
    );

    const selectedBtn = document.querySelector<HTMLButtonElement>('[data-selected-single="true"]');
    expect(selectedBtn).not.toBeNull();
    if (selectedBtn) {
      await user.click(selectedBtn);
      expect(onChangeMock).not.toHaveBeenCalled();
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    }
  });

  it("does not close popover when clicking the already selected date with autoCloseOnSelect={false}", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const onChangeMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <DatePicker
        label="Schedule"
        value={today}
        onChange={onChangeMock}
        autoCloseOnSelect={false}
        open={true}
        onOpenChange={onOpenChangeMock}
      />
    );

    const selectedBtn = document.querySelector<HTMLButtonElement>('[data-selected-single="true"]');
    expect(selectedBtn).not.toBeNull();
    if (selectedBtn) {
      await user.click(selectedBtn);
      expect(onChangeMock).not.toHaveBeenCalled();
      expect(onOpenChangeMock).not.toHaveBeenCalled();
    }
  });
});


