import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch component", () => {
  it("renders with label and description", () => {
    render(<Switch label="Dark Mode" description="Enable dark theme" />);

    expect(screen.getByLabelText(/dark mode/i)).toBeInTheDocument();
    expect(screen.getByText(/enable dark theme/i)).toBeInTheDocument();
  });

  it("handles toggling checked state", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(<Switch label="Notifications" onChange={onChangeMock} />);

    const switchInput = screen.getByLabelText(/notifications/i);
    expect(switchInput).not.toBeChecked();

    await user.click(switchInput);
    expect(onChangeMock).toHaveBeenCalled();
  });

  it("renders validation error when error prop is passed", () => {
    render(<Switch label="Agree" error="You must accept" />);
    expect(screen.getByText("You must accept")).toBeInTheDocument();
  });

  it("respects disabled state", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(<Switch label="Disabled Switch" disabled onChange={onChangeMock} />);

    const switchInput = screen.getByLabelText(/disabled switch/i);
    expect(switchInput).toBeDisabled();

    await user.click(switchInput);
    expect(onChangeMock).not.toHaveBeenCalled();
  });
});
