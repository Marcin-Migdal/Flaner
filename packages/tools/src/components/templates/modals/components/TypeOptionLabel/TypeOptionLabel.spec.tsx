import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TypeOptionLabel } from "./TypeOptionLabel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("TypeOptionLabel", () => {
  it("renders type label", () => {
    render(
      <TypeOptionLabel
        option={{ label: "Matte", value: "Matte" }}
        meta={{ context: "value" }}
      />
    );

    expect(screen.getByText("Matte")).toBeInTheDocument();
  });

  it("calls onDelete with option id, materialName, and value when delete is clicked in menu", async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();

    render(
      <TypeOptionLabel
        option={{ label: "Silk", value: "Silk", id: "type-123", isCustom: true, materialName: "PLA" }}
        meta={{ context: "menu" }}
        onDelete={onDeleteMock}
      />
    );

    expect(screen.getByText("Silk")).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: "spooler.templates.deleteTypeTooltip" });
    await user.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalledWith("type-123", "PLA", "Silk");
  });

  it("falls back to materialName prop if option.materialName is undefined", async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();

    render(
      <TypeOptionLabel
        option={{ label: "Silk", value: "Silk", id: "type-123", isCustom: true }}
        meta={{ context: "menu" }}
        materialName="PETG"
        onDelete={onDeleteMock}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: "spooler.templates.deleteTypeTooltip" });
    await user.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalledWith("type-123", "PETG", "Silk");
  });
});
