import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloneSpoolPromptModal } from "./CloneSpoolPromptModal";
import type { FilamentSpool } from "../../../../api/spools";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockSpool: FilamentSpool = {
  id: "spool-1",
  userId: "user-1",
  templateId: null,
  name: "Spool 1",
  material: "PLA",
  type: "Basic",
  colorName: "White",
  colorHex: "#ffffff",
  initialWeight: 1000,
  currentWeight: 0,
  isFinished: true,
};

describe("CloneSpoolPromptModal", () => {
  it("renders nothing if spool is null", () => {
    const { container } = render(
      <CloneSpoolPromptModal
        isOpen={true}
        onClose={vi.fn()}
        spool={null}
        onConfirm={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders confirmation popup when open and spool provided", () => {
    render(
      <CloneSpoolPromptModal
        isOpen={true}
        onClose={vi.fn()}
        spool={mockSpool}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("spooler.spools.emptyTriggerTitle")).toBeInTheDocument();
  });

  it("calls onConfirm and onClose when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <CloneSpoolPromptModal
        isOpen={true}
        onClose={onClose}
        spool={mockSpool}
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "spooler.spools.cloneConfirm" });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(mockSpool);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CloneSpoolPromptModal
        isOpen={true}
        onClose={onClose}
        spool={mockSpool}
        onConfirm={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "spooler.spools.cloneDismiss" });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
