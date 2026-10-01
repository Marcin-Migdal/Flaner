import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import { SpoolHistoryModal } from "./SpoolHistoryModal";
import type { FilamentSpool, SpoolPrint } from "../../../../api/spools";

const undoMutationMock = vi.fn();

const mockPrints: SpoolPrint[] = [
  {
    id: "print-1",
    usedWeight: 45,
    createdAt: Timestamp.fromMillis(1711800000000),
  },
  {
    id: "print-2",
    usedWeight: 20,
    createdAt: null,
  },
];

let queryState = {
  data: mockPrints,
  isLoading: false,
};

vi.mock("../../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string, opt?: Record<string, unknown>) => {
      if (opt?.weight) return `${key}:${opt.weight}`;
      return key;
    },
    i18n: { language: "en" },
  }),
  useGetSpoolPrintsQuery: () => queryState,
  useUndoLastPrintMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      undoMutationMock(vars);
      opts?.onSuccess?.();
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

describe("SpoolHistoryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState = {
      data: mockPrints,
      isLoading: false,
    };
  });

  it("renders print history entries including null timestamp fallback", () => {
    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        spool={mockSpool}
      />
    );

    expect(screen.getByText("Spool 1")).toBeInTheDocument();
    expect(screen.getByText("-45g")).toBeInTheDocument();
    expect(screen.getByText("-20g")).toBeInTheDocument();
  });

  it("renders loading text when isLoading is true", () => {
    queryState = {
      data: [],
      isLoading: true,
    };

    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        spool={mockSpool}
      />
    );

    expect(screen.getByText("spooler.spools.loadingHistory")).toBeInTheDocument();
  });

  it("renders empty history message when prints array is empty", () => {
    queryState = {
      data: [],
      isLoading: false,
    };

    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        spool={mockSpool}
      />
    );

    expect(screen.getByText("spooler.spools.noHistory")).toBeInTheDocument();
  });

  it("opens confirmation and triggers undo print mutation", async () => {
    const user = userEvent.setup();

    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        spool={mockSpool}
      />
    );

    const deletePrintButtons = screen.getAllByTitle("spooler.spools.undoLastPrint");
    await user.click(deletePrintButtons[0]);

    const confirmBtn = screen.getByRole("button", { name: "spooler.spools.undoLastPrint" });
    await user.click(confirmBtn);

    expect(undoMutationMock).toHaveBeenCalledWith({
      spoolId: "spool-1",
      printId: "print-1",
      usedWeight: 45,
    });
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={onClose}
        spool={mockSpool}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "spooler.common.close" });
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it("cancels confirmation popup when cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        spool={mockSpool}
      />
    );

    const deletePrintButtons = screen.getAllByTitle("spooler.spools.undoLastPrint");
    await user.click(deletePrintButtons[0]);

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);

    expect(undoMutationMock).not.toHaveBeenCalled();
  });

  it("calls onClose when modal is dismissed via Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SpoolHistoryModal
        isOpen={true}
        onClose={onClose}
        spool={mockSpool}
      />
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
