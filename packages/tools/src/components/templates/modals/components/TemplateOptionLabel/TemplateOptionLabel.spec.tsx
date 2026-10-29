import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateOptionLabel } from "./TemplateOptionLabel";

describe("TemplateOptionLabel", () => {
  it("renders basic option label without custom badge", () => {
    render(
      <TemplateOptionLabel
        option={{ label: "PLA", value: "PLA" }}
        meta={{ context: "value" }}
        customLabel="Custom"
      />
    );

    expect(screen.getByText("PLA")).toBeInTheDocument();
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("renders custom badge and delete button in menu context when option is custom", async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();

    render(
      <TemplateOptionLabel
        option={{ label: "CustomMat", value: "CustomMat", isCustom: true, id: "m1" }}
        meta={{ context: "menu" }}
        customLabel="Custom"
        deleteTooltip="Delete material"
        onDelete={onDeleteMock}
      />
    );

    expect(screen.getByText("CustomMat")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: "Delete material" });
    await user.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("renders color swatch preview when displayHex is provided", () => {
    const { container } = render(
      <TemplateOptionLabel
        option={{ label: "Red", value: "Red" }}
        meta={{ context: "value" }}
        customLabel="Custom"
        displayHex="#ff0000"
      />
    );

    const swatch = container.querySelector('div[style*="background-color: rgb(255, 0, 0)"]');
    expect(swatch).not.toBeNull();
  });
});
