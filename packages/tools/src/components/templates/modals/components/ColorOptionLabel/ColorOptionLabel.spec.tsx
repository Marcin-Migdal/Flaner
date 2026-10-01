import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorOptionLabel } from "./ColorOptionLabel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("ColorOptionLabel", () => {
  it("renders color label with hex swatch", () => {
    const { container } = render(
      <ColorOptionLabel
        option={{ label: "Blue", value: "Blue", hex: "#0000ff" }}
        meta={{ context: "value" }}
      />
    );

    expect(screen.getByText("Blue")).toBeInTheDocument();
    const swatch = container.querySelector('div[style*="background-color: rgb(0, 0, 255)"]');
    expect(swatch).not.toBeNull();
  });

  it("calls onDelete with option id and value when delete is clicked in menu", async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();

    render(
      <ColorOptionLabel
        option={{ label: "Custom Green", value: "Green", id: "color-123", isCustom: true }}
        meta={{ context: "menu" }}
        onDelete={onDeleteMock}
      />
    );

    expect(screen.getByText("Custom Green")).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: "spooler.templates.deleteColorTooltip" });
    await user.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalledWith("color-123", "Green");
  });

  it("uses activeColorHex if option has no hex and label matches activeColorName", () => {
    const { container } = render(
      <ColorOptionLabel
        option={{ label: "ActiveRed", value: "ActiveRed" }}
        meta={{ context: "value" }}
        activeColorName="ActiveRed"
        activeColorHex="#ff0000"
      />
    );

    const swatch = container.querySelector('div[style*="background-color: rgb(255, 0, 0)"]');
    expect(swatch).not.toBeNull();
  });
});
