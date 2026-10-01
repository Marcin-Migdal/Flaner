import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpoolerSettingsModal } from "./SpoolerSettingsModal";

const updateMutationMock = vi.fn();

vi.mock("../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string) => key,
  }),
  useGetStartupWasteQuery: () => ({
    data: 1.5,
    isLoading: false,
  }),
  useUpdateStartupWasteMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (val: number) => {
      updateMutationMock(val);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
}));

describe("SpoolerSettingsModal", () => {
  it("renders settings modal with current startup waste", () => {
    render(
      <SpoolerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "spooler.settings.title" })).toBeInTheDocument();
    const input = screen.getByLabelText("spooler.settings.startupWasteLabel");
    expect(input).toHaveValue(1.5);
  });

  it("submits updated startup waste value when changed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolerSettingsModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const input = screen.getByLabelText("spooler.settings.startupWasteLabel");
    fireEvent.change(input, { target: { value: "2.5" } });

    const saveBtn = screen.getByRole("button", { name: "spooler.common.save" });
    await user.click(saveBtn);

    expect(updateMutationMock).toHaveBeenCalledWith(2.5);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolerSettingsModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when modal is dismissed via Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolerSettingsModal
        isOpen={true}
        onClose={onClose}
      />
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
