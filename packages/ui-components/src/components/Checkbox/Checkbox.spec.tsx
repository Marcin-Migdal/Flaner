import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox component", () => {
  it("renders with label and description", () => {
    render(
      <Checkbox
        label="Accept Terms"
        description="Read the terms before proceeding"
      />
    );

    expect(screen.getByRole("checkbox", { name: /accept terms/i })).toBeInTheDocument();
    expect(screen.getByText(/read the terms before proceeding/i)).toBeInTheDocument();
  });

  it("calls onCheckedChange when clicked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox
        label="Subscribe to newsletter"
        onCheckedChange={onCheckedChange}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /subscribe to newsletter/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders error message when error prop is passed", () => {
    render(
      <Checkbox
        label="Accept policy"
        error="This field is required"
      />
    );

    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("does not trigger change when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox
        label="Disabled Option"
        disabled
        onCheckedChange={onCheckedChange}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /disabled option/i });
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
