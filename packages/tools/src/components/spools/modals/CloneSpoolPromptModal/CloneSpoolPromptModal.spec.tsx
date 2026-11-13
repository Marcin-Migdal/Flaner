import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloneSpoolPromptModal } from "./CloneSpoolPromptModal";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("CloneSpoolPromptModal", () => {
  it("renders confirmation popup when open", () => {
    render(
      <CloneSpoolPromptModal
        isOpen={true}
        onClose={vi.fn()}
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
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "spooler.spools.cloneConfirm" });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CloneSpoolPromptModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "spooler.spools.cloneDismiss" });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
