import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpoolFormModal } from "./SpoolFormModal";
import type { FilamentSpool } from "../../../../api/spools";
import type { FilamentTemplate } from "../../../../api/templates";

const addMutationMock = vi.fn();
const editMutationMock = vi.fn();

vi.mock("../../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string) => key,
  }),
  useAddSpoolMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      addMutationMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
  useEditSpoolMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      editMutationMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
}));

const mockTemplates: FilamentTemplate[] = [
  {
    id: "tpl-1",
    userId: "user-1",
    material: "PLA",
    type: "Basic",
    colorName: "Jade White",
    colorHex: "#ffffff",
    defaultWeight: 1000,
  },
];

const mockInitialSpool: FilamentSpool = {
  id: "spool-1",
  userId: "user-1",
  name: "Existing Spool",
  templateId: "tpl-1",
  material: "PLA",
  type: "Basic",
  colorName: "Jade White",
  colorHex: "#ffffff",
  initialWeight: 1000,
  currentWeight: 800,
  isFinished: false,
};

describe("SpoolFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders add spool modal heading when no initialData is passed", () => {
    render(
      <SpoolFormModal
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
      />
    );

    expect(screen.getByRole("heading", { name: "spooler.spools.addSpool" })).toBeInTheDocument();
  });

  it("submits edited spool data when initialData is provided and form is submitted", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolFormModal
        isOpen={true}
        onClose={onClose}
        templates={mockTemplates}
        initialData={mockInitialSpool}
      />
    );

    expect(screen.getByRole("heading", { name: "spooler.spools.editSpool" })).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "spooler.spools.editSpool" });
    await user.click(submitBtn);

    expect(editMutationMock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("submits cloned spool data using add mutation when in clone mode", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolFormModal
        isOpen={true}
        onClose={onClose}
        templates={mockTemplates}
        initialData={mockInitialSpool}
        isCloneMode={true}
        cloneCarryoverUsage={120}
        clonePrevCurrentWeight={20}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "spooler.spools.addSpool" });
    await user.click(submitBtn);

    expect(addMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          initialWeight: 1000,
          currentWeight: 900, // 1000 - (120 - 20)
        }),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolFormModal
        isOpen={true}
        onClose={onClose}
        templates={mockTemplates}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("syncs currentWeight when initialWeight is changed on a new spool", () => {
    render(
      <SpoolFormModal
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
      />
    );

    const initialWeightInput = screen.getByLabelText("spooler.spools.initialWeight");
    const currentWeightInput = screen.getByLabelText("spooler.spools.currentWeight");

    fireEvent.change(initialWeightInput, { target: { value: "850" } });
    expect(currentWeightInput).toHaveValue(850);
  });

  it("auto-fills spool name and weights when choosing a template", async () => {
    const user = userEvent.setup();
    render(
      <SpoolFormModal
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
      />
    );

    const selectControl = document.body.querySelector(".react-select__control");
    expect(selectControl).toBeTruthy();
    if (selectControl) {
      await user.click(selectControl);
      const option = await screen.findByText(/PLA Basic/i);
      await user.click(option);

      expect(screen.getByLabelText("spooler.spools.spoolName")).toHaveValue("PLA Basic Jade White");
    }
  });

  it("triggers focus timer in clone mode and cleanups timer", () => {
    vi.useFakeTimers();
    const { rerender, unmount } = render(
      <SpoolFormModal
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
        initialData={mockInitialSpool}
        isCloneMode={false}
      />
    );

    rerender(
      <SpoolFormModal
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
        initialData={mockInitialSpool}
        isCloneMode={true}
      />
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    unmount();
    vi.useRealTimers();
  });

  it("calls onClose when modal is dismissed via Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolFormModal
        isOpen={true}
        onClose={onClose}
        templates={mockTemplates}
      />
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
