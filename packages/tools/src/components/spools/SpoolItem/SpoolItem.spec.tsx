import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpoolItem } from "./SpoolItem";
import type { FilamentSpool } from "../../../api/spools";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSpool: FilamentSpool = {
  id: "spool-1",
  userId: "user-1",
  templateId: null,
  name: "My Spool",
  material: "PLA",
  type: "Basic",
  colorName: "Jade White",
  colorHex: "#ffffff",
  initialWeight: 1000,
  currentWeight: 750,
  isFinished: false,
};

describe("SpoolItem", () => {
  it("renders spool info and progress correctly", () => {
    render(
      <SpoolItem
        spool={mockSpool}
        onRecordPrint={vi.fn()}
        onEdit={vi.fn()}
        onMarkFinished={vi.fn()}
        onDelete={vi.fn()}
        onViewHistory={vi.fn()}
        onUndoLastPrint={vi.fn()}
      />
    );

    expect(screen.getByText("My Spool")).toBeInTheDocument();
    expect(screen.getByText("PLA Basic • Jade White")).toBeInTheDocument();
    expect(screen.getByText(/750g/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 1000g/)).toBeInTheDocument();
  });

  it("calls onRecordPrint and onUndoLastPrint on button clicks", async () => {
    const user = userEvent.setup();
    const onRecordPrint = vi.fn();
    const onUndoLastPrint = vi.fn();

    render(
      <SpoolItem
        spool={mockSpool}
        onRecordPrint={onRecordPrint}
        onEdit={vi.fn()}
        onMarkFinished={vi.fn()}
        onDelete={vi.fn()}
        onViewHistory={vi.fn()}
        onUndoLastPrint={onUndoLastPrint}
      />
    );

    const recordBtn = screen.getByTitle("spooler.spools.recordUsage");
    await user.click(recordBtn);
    expect(onRecordPrint).toHaveBeenCalledTimes(1);

    const undoBtn = screen.getByTitle("spooler.spools.undoLastPrint");
    await user.click(undoBtn);
    expect(onUndoLastPrint).toHaveBeenCalledTimes(1);
  });

  it("resolves custom hex color when provided", () => {
    const customSpool: FilamentSpool = {
      ...mockSpool,
      colorHex: "#123456",
    };

    const { container } = render(
      <SpoolItem
        spool={customSpool}
        onRecordPrint={vi.fn()}
        onEdit={vi.fn()}
        onMarkFinished={vi.fn()}
        onDelete={vi.fn()}
        onViewHistory={vi.fn()}
        onUndoLastPrint={vi.fn()}
      />
    );

    const colorCircle = container.querySelector('div[style*="background-color: rgb(18, 52, 86)"]');
    expect(colorCircle).not.toBeNull();
  });

  it("falls back to white for unknown material with white hex or missing hex", () => {
    const unknownSpool: FilamentSpool = {
      ...mockSpool,
      material: "CustomMat",
      type: "CustomType",
      colorName: "CustomColor",
      colorHex: "#ffffff",
    };

    const { container, rerender } = render(
      <SpoolItem
        spool={unknownSpool}
        onRecordPrint={vi.fn()}
        onEdit={vi.fn()}
        onMarkFinished={vi.fn()}
        onDelete={vi.fn()}
        onViewHistory={vi.fn()}
        onUndoLastPrint={vi.fn()}
      />
    );

    const whiteCircle = container.querySelector('div[style*="background-color: rgb(255, 255, 255)"]');
    expect(whiteCircle).not.toBeNull();

    rerender(
      <SpoolItem
        spool={{ ...unknownSpool, colorHex: "" }}
        onRecordPrint={vi.fn()}
        onEdit={vi.fn()}
        onMarkFinished={vi.fn()}
        onDelete={vi.fn()}
        onViewHistory={vi.fn()}
        onUndoLastPrint={vi.fn()}
      />
    );
    expect(container.querySelector('div[style*="background-color: rgb(255, 255, 255)"]')).not.toBeNull();
  });
});
