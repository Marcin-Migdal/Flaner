import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaterialOptionLabel } from "./MaterialOptionLabel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("MaterialOptionLabel", () => {
  it("renders material label", () => {
    render(
      <MaterialOptionLabel
        option={{ label: "PETG", value: "PETG" }}
        meta={{ context: "value" }}
      />
    );

    expect(screen.getByText("PETG")).toBeInTheDocument();
  });

  it("calls onDelete with option id and value when delete is clicked in menu", async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();

    render(
      <MaterialOptionLabel
        option={{ label: "Custom Mat", value: "Custom Mat", id: "mat-123", isCustom: true }}
        meta={{ context: "menu" }}
        onDelete={onDeleteMock}
      />
    );

    expect(screen.getByText("Custom Mat")).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: "spooler.templates.deleteMaterialTooltip" });
    await user.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalledWith("mat-123", "Custom Mat");
  });
});
