import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@flaner/ui-components";
import { QuickUsageModal } from "./QuickUsageModal";
import type { FilamentSpool } from "../../../../api/spools";

const mutateMock = vi.fn();

let mockIsFinished = false;

vi.mock("../../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string, opt?: Record<string, unknown>) => {
      if (opt?.weight) return `${key}:${opt.weight}`;
      return key;
    },
  }),
  useGetStartupWasteQuery: () => ({
    data: 1.5,
    isLoading: false,
  }),
  useRecordSpoolUsageMutation: (opts?: { onSuccess?: (result: { isFinished: boolean }, variables: { spool: FilamentSpool; usage: number }) => void }) => ({
    mutate: (vars: { spool: FilamentSpool; usage: number }) => {
      mutateMock(vars);
      opts?.onSuccess?.({ isFinished: mockIsFinished }, vars);
    },
    isPending: false,
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
  currentWeight: 500,
  isFinished: false,
};

describe("QuickUsageModal", () => {
  it("renders spool details and form inputs", () => {
    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={vi.fn()}
          spool={mockSpool}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Spool 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("spooler.spools.modelWeightPlaceholder")).toBeInTheDocument();
  });

  it("submits usage and calls mutate with modelWeight + startupWaste", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={onClose}
          spool={mockSpool}
        />
      </TooltipProvider>
    );

    const input = screen.getByPlaceholderText("spooler.spools.modelWeightPlaceholder");
    await user.type(input, "10");

    const submitBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(submitBtn);

    expect(mutateMock).toHaveBeenCalledWith({
      spool: mockSpool,
      usage: 11.5, // 10 + 1.5 startup waste
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("triggers onFinished when recordUsageMutation returns isFinished: true", async () => {
    mockIsFinished = true;
    const user = userEvent.setup();
    const onFinished = vi.fn();
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={onClose}
          spool={mockSpool}
          onFinished={onFinished}
        />
      </TooltipProvider>
    );

    const input = screen.getByPlaceholderText("spooler.spools.modelWeightPlaceholder");
    await user.type(input, "500");

    const submitBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(submitBtn);

    expect(onFinished).toHaveBeenCalledWith(mockSpool, 501.5);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when modal is dismissed via Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={onClose}
          spool={mockSpool}
        />
      </TooltipProvider>
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
