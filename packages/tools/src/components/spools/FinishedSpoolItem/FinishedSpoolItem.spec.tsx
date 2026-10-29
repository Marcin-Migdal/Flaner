import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinishedSpoolItem } from "./FinishedSpoolItem";
import type { FilamentSpool } from "../../../api/spools";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSpool: FilamentSpool = {
  id: "spool-fin-1",
  userId: "user-1",
  templateId: null,
  name: "Empty Spool",
  material: "PETG",
  type: "HF",
  colorName: "Black",
  colorHex: "#000000",
  initialWeight: 1000,
  currentWeight: 0,
  isFinished: true,
};

describe("FinishedSpoolItem", () => {
  it("renders finished spool details", () => {
    render(
      <FinishedSpoolItem
        spool={mockSpool}
        onClone={vi.fn()}
        onDelete={vi.fn()}
        onViewHistory={vi.fn()}
      />
    );

    expect(screen.getByText("Empty Spool")).toBeInTheDocument();
    expect(screen.getByText("PETG HF • spooler.spools.empty")).toBeInTheDocument();
  });

  it("calls onViewHistory, onClone, and onDelete when buttons are clicked", async () => {
    const user = userEvent.setup();
    const onViewHistory = vi.fn();
    const onClone = vi.fn();
    const onDelete = vi.fn();

    render(
      <FinishedSpoolItem
        spool={mockSpool}
        onClone={onClone}
        onDelete={onDelete}
        onViewHistory={onViewHistory}
      />
    );

    const historyBtn = screen.getByTitle("spooler.spools.printHistory");
    await user.click(historyBtn);
    expect(onViewHistory).toHaveBeenCalledTimes(1);

    const cloneBtn = screen.getByTitle("spooler.spools.addSpool");
    await user.click(cloneBtn);
    expect(onClone).toHaveBeenCalledTimes(1);

    const deleteBtn = screen.getByTitle("spooler.spools.deleteSpool");
    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
