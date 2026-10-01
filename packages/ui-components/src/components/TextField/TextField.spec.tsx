import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "./TextField";

describe("TextField component", () => {
  it("renders with label and description", () => {
    render(
      <TextField
        label="Username"
        description="Choose a unique handle"
      />
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a unique handle/i)).toBeInTheDocument();
  });

  it("allows user to type text into input", async () => {
    const user = userEvent.setup();
    render(<TextField label="Email" type="email" />);

    const input = screen.getByLabelText(/email/i);
    await user.type(input, "marcin@flaner.app");

    expect(input).toHaveValue("marcin@flaner.app");
  });

  it("displays validation error when error prop is passed", () => {
    render(
      <TextField
        label="Password"
        type="password"
        error="Password must be at least 8 characters"
      />
    );

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("renders increment and decrement buttons for type='number'", async () => {
    const user = userEvent.setup();
    render(
      <TextField
        label="Quantity"
        type="number"
        defaultValue={5}
        step={1}
      />
    );

    const input = screen.getByLabelText(/quantity/i);
    expect(input).toHaveValue(5);

    const incrementBtn = screen.getByRole("button", { name: /increment/i });
    const decrementBtn = screen.getByRole("button", { name: /decrement/i });

    await user.click(incrementBtn);
    expect(input).toHaveValue(6);

    await user.click(decrementBtn);
    expect(input).toHaveValue(5);
  });

  it("respects min and max bounds when stepping", async () => {
    const user = userEvent.setup();
    render(
      <TextField
        label="Score"
        type="number"
        defaultValue={10}
        min={1}
        max={10}
      />
    );

    const input = screen.getByLabelText(/score/i);
    const incrementBtn = screen.getByRole("button", { name: /increment/i });

    // Already at max: should not exceed 10
    await user.click(incrementBtn);
    expect(input).toHaveValue(10);
  });

  it("calls custom onStep handler when provided", async () => {
    const user = userEvent.setup();
    const onStepMock = vi.fn();

    render(
      <TextField
        label="Custom Step"
        type="number"
        defaultValue={2}
        onStep={onStepMock}
      />
    );

    const incrementBtn = screen.getByRole("button", { name: /increment/i });
    await user.click(incrementBtn);

    expect(onStepMock).toHaveBeenCalledWith(1, 3);
  });

  it("disables input and buttons when disabled prop is true", () => {
    render(
      <TextField
        label="Disabled Field"
        type="number"
        disabled
      />
    );

    const input = screen.getByLabelText(/disabled field/i);
    expect(input).toBeDisabled();

    const incrementBtn = screen.getByRole("button", { name: /increment/i });
    const decrementBtn = screen.getByRole("button", { name: /decrement/i });
    expect(incrementBtn).toBeDisabled();
    expect(decrementBtn).toBeDisabled();
  });
});
