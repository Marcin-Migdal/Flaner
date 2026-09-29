import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorPickerField } from "./ColorPickerField";

describe("ColorPickerField component", () => {
  it("renders with label, description, and default value", () => {
    render(
      <ColorPickerField
        label="Theme Color"
        description="Choose your brand color"
        value="#3b82f6"
      />
    );

    expect(screen.getByLabelText("Theme Color")).toHaveValue("#3b82f6");
    expect(screen.getByText("Choose your brand color")).toBeInTheDocument();
  });

  it("handles typing hex value manually", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <ColorPickerField
        label="Accent"
        onChange={onChangeMock}
      />
    );

    const input = screen.getByLabelText("Accent");
    await user.type(input, "#ff0000");

    expect(onChangeMock).toHaveBeenCalled();
  });

  it("selects color from presets", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();
    const onColorSelectMock = vi.fn();

    render(
      <ColorPickerField
        label="Color"
        presetColors={["#ff0000", "#00ff00", "#0000ff"]}
        onChange={onChangeMock}
        onColorSelect={onColorSelectMock}
      />
    );

    const redPreset = screen.getByRole("button", { name: "Color #ff0000" });
    await user.click(redPreset);

    expect(onChangeMock).toHaveBeenCalledWith("#ff0000");
    expect(onColorSelectMock).toHaveBeenCalledWith("#ff0000");
  });

  it("renders error state", () => {
    render(
      <ColorPickerField
        label="Color"
        error="Invalid hex code"
      />
    );

    expect(screen.getByText("Invalid hex code")).toBeInTheDocument();
  });

  it("disables inputs and presets when disabled={true}", () => {
    render(
      <ColorPickerField
        label="Color"
        presetColors={["#ffffff"]}
        disabled
      />
    );

    expect(screen.getByLabelText("Color")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pick color" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Color #ffffff" })).toBeDisabled();
  });
});
