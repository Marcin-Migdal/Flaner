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
});
