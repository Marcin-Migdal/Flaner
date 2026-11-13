import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@flaner/ui-components";
import { QuickUsageModal } from "./QuickUsageModal";
import type { FilamentSpool, RecordUsageInput, RecordUsageResult } from "../../../../api/spools";

const mutateMock = vi.fn();

let mockIsFinished = false;

let mockRecordIsPending = false;

// What the transaction read: the stored spool, which may differ from the snapshot the modal was opened with
const runOutResult = (isFinished: boolean): RecordUsageResult => ({
  spool: { ...mockSpool, currentWeight: isFinished ? 0 : 100, isFinished },
  carryover: isFinished ? 120 : 0,
});

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
  useRecordSpoolUsageMutation: (opts?: { onSuccess?: (result: RecordUsageResult) => void }) => ({
    mutate: (vars: RecordUsageInput) => {
      mutateMock(vars);
      opts?.onSuccess?.(runOutResult(mockIsFinished));
    },
    isPending: mockRecordIsPending,
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
      spoolId: "spool-1",
      usage: 11.5, // 10 + 1.5 startup waste
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("hands the transaction result to onRunOut when the print empties the spool", async () => {
    mockIsFinished = true;
    const user = userEvent.setup();
    const onRunOut = vi.fn();
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={onClose}
          spool={mockSpool}
          onRunOut={onRunOut}
        />
      </TooltipProvider>
    );

    const input = screen.getByPlaceholderText("spooler.spools.modelWeightPlaceholder");
    await user.type(input, "500");

    const submitBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(submitBtn);

    expect(onRunOut).toHaveBeenCalledWith(runOutResult(true));
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

  it("displays validation error message when submitting invalid weight", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={vi.fn()}
          spool={mockSpool}
        />
      </TooltipProvider>
    );

    const submitBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(submitBtn);

    expect(await screen.findByText("spooler.spools.validation.usagePositive")).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("shows saving text when recordUsageMutation is pending", () => {
    mockRecordIsPending = true;
    render(
      <TooltipProvider>
        <QuickUsageModal
          isOpen={true}
          onClose={vi.fn()}
          spool={mockSpool}
        />
      </TooltipProvider>
    );

    expect(screen.getByRole("button", { name: "spooler.common.saving" })).toBeInTheDocument();
    mockRecordIsPending = false;
  });
});
