import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@flaner/ui-components";
import { SpoolsTab } from "./SpoolsTab";
import type { FilamentTemplate } from "../../../api/templates";
import type { FilamentSpool } from "../../../api/spools";

const mockSpools: FilamentSpool[] = [
  {
    id: "spool-1",
    userId: "user-1",
    templateId: null,
    name: "Spool Alpha",
    material: "PLA",
    type: "Basic",
    colorName: "Jade White",
    colorHex: "#ffffff",
    initialWeight: 1000,
    currentWeight: 750,
    isFinished: false,
  },
  {
    id: "spool-2",
    userId: "user-1",
    templateId: null,
    name: "Spool Beta",
    material: "PETG",
    type: "HF",
    colorName: "Black",
    colorHex: "#000000",
    initialWeight: 1000,
    currentWeight: 0,
    isFinished: true,
  },
];

let queryState = {
  data: mockSpools,
  isLoading: false,
};

const markAsFinishedMutateMock = vi.fn();
const undoLastPrintMutateMock = vi.fn();
const deleteSpoolMutateMock = vi.fn();
const addSpoolMutateMock = vi.fn();
const editSpoolMutateMock = vi.fn();

let mockRecordUsageSuccessIsFinished = false;

vi.mock("../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string, opt?: Record<string, unknown>) => {
      if (opt?.weight) return `${key}:${opt.weight}`;
      return key;
    },
    i18n: { language: "en" },
  }),
  useGetSpoolsQuery: () => queryState,
  useMarkSpoolAsFinishedMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      markAsFinishedMutateMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
  useUndoLastPrintMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      undoLastPrintMutateMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
  useDeleteSpoolMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      deleteSpoolMutateMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
  useAddSpoolMutation: () => ({ mutate: addSpoolMutateMock, isPending: false }),
  useEditSpoolMutation: () => ({ mutate: editSpoolMutateMock, isPending: false }),
  useGetStartupWasteQuery: () => ({ data: 1.5, isLoading: false }),
  useRecordSpoolUsageMutation: (opts?: {
    onSuccess?: (result: { isFinished: boolean; spoolId: string }, vars: unknown) => void;
  }) => ({
    mutate: (vars: unknown) => {
      opts?.onSuccess?.(
        { isFinished: mockRecordUsageSuccessIsFinished, spoolId: "spool-1" },
        vars,
      );
    },
    isPending: false,
  }),
  useGetSpoolPrintsQuery: () => ({ data: [], isLoading: false }),
}));

const mockTemplates: FilamentTemplate[] = [
  {
    id: "tmpl-1",
    userId: "user-1",
    material: "PLA",
    type: "Basic",
    colorName: "Jade White",
    colorHex: "#ffffff",
    defaultWeight: 1000,
  },
];

const renderWithTooltip = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe("SpoolsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState = {
      data: mockSpools,
      isLoading: false,
    };
  });

  it("renders active and finished spools", () => {
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    expect(screen.getByText("Spool Alpha")).toBeInTheDocument();
    expect(screen.getByText("Spool Beta")).toBeInTheDocument();
  });

  it("prompts to create template first when templates array is empty", async () => {
    const user = userEvent.setup();
    const onNavigateToTemplates = vi.fn();

    renderWithTooltip(
      <SpoolsTab
        templates={[]}
        onNavigateToTemplates={onNavigateToTemplates}
      />
    );

    expect(screen.getByText("spooler.spools.createTemplateFirst")).toBeInTheDocument();

    const navigateBtn = screen.getByRole("button", { name: "spooler.tabs.templates" });
    await user.click(navigateBtn);

    expect(onNavigateToTemplates).toHaveBeenCalledTimes(1);
  });

  it("renders loading spinner when spools are loading", () => {
    queryState = {
      data: [],
      isLoading: true,
    };

    const { container } = renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders empty state messages when there are no active or finished spools", () => {
    queryState = {
      data: [],
      isLoading: false,
    };

    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    expect(screen.getByText("spooler.spools.noActiveSpools")).toBeInTheDocument();
    expect(screen.getByText("spooler.spools.noFinishedSpools")).toBeInTheDocument();
  });

  it("opens add spool modal when clicking add spool button", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: "spooler.spools.addSpool" });
    await user.click(addBtn);

    expect(screen.getByRole("heading", { name: "spooler.spools.addSpool" })).toBeInTheDocument();
  });

  it("opens QuickUsageModal when clicking record print on active spool", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const recordBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(recordBtn);

    expect(screen.getByRole("heading", { name: "spooler.spools.recordUsage" })).toBeInTheDocument();
  });

  it("opens edit modal when clicking edit in dropdown on active spool", async () => {
    const user = userEvent.setup();
    const { container } = renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const moreBtn = container.querySelector("button[aria-haspopup='menu']");
    expect(moreBtn).toBeTruthy();
    if (moreBtn) await user.click(moreBtn);

    const editMenuItem = await screen.findByText("spooler.spools.editSpool");
    await user.click(editMenuItem);

    expect(screen.getByRole("heading", { name: "spooler.spools.editSpool" })).toBeInTheDocument();
  });

  it("opens confirmation and triggers mark as finished on active spool", async () => {
    const user = userEvent.setup();
    const { container } = renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const moreBtn = container.querySelector("button[aria-haspopup='menu']");
    expect(moreBtn).toBeTruthy();
    if (moreBtn) await user.click(moreBtn);

    const finishMenuItem = await screen.findByText("spooler.spools.markFinished");
    await user.click(finishMenuItem);

    const confirmBtn = screen.getByRole("button", { name: "spooler.spools.markFinished" });
    await user.click(confirmBtn);

    expect(markAsFinishedMutateMock).toHaveBeenCalledWith("spool-1");
  });

  it("opens confirmation and triggers delete on active spool", async () => {
    const user = userEvent.setup();
    const { container } = renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const moreBtn = container.querySelector("button[aria-haspopup='menu']");
    expect(moreBtn).toBeTruthy();
    if (moreBtn) await user.click(moreBtn);

    const deleteMenuItem = await screen.findByText("spooler.spools.deleteSpool");
    await user.click(deleteMenuItem);

    const confirmBtn = screen.getByRole("button", { name: "spooler.spools.deleteSpool" });
    await user.click(confirmBtn);

    expect(deleteSpoolMutateMock).toHaveBeenCalledWith("spool-1");
  });

  it("opens history modal when clicking view history in dropdown", async () => {
    const user = userEvent.setup();
    const { container } = renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const moreBtn = container.querySelector("button[aria-haspopup='menu']");
    expect(moreBtn).toBeTruthy();
    if (moreBtn) await user.click(moreBtn);

    const historyMenuItem = await screen.findByText("spooler.spools.printHistory");
    await user.click(historyMenuItem);

    expect(screen.getByRole("heading", { name: "spooler.spools.printHistory" })).toBeInTheDocument();
  });

  it("opens confirmation and triggers undo last print", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const undoBtn = screen.getByTitle("spooler.spools.undoLastPrint");
    await user.click(undoBtn);

    const confirmBtn = screen.getByRole("button", { name: "spooler.spools.undoLastPrint" });
    await user.click(confirmBtn);

    expect(undoLastPrintMutateMock).toHaveBeenCalledWith({ spoolId: "spool-1" });
  });

  it("handles finished spool actions (clone, delete, view history)", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    // Clone finished spool (button has text "spooler.spools.clone")
    const cloneBtn = screen.getByText("spooler.spools.clone");
    await user.click(cloneBtn);
    expect(screen.getByRole("heading", { name: "spooler.spools.addSpool" })).toBeInTheDocument();

    // Close form
    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);

    // Delete finished spool
    const finishedDeleteButtons = screen.getAllByTitle("spooler.spools.deleteSpool");
    const finishedDeleteBtn = finishedDeleteButtons[finishedDeleteButtons.length - 1];
    await user.click(finishedDeleteBtn);

    const confirmDeleteBtn = screen.getByRole("button", { name: "spooler.spools.deleteSpool" });
    await user.click(confirmDeleteBtn);
    expect(deleteSpoolMutateMock).toHaveBeenCalledWith("spool-2");
  });

  it("handles view history and close on finished spool", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const finishedHistoryButtons = screen.getAllByTitle("spooler.spools.printHistory");
    const finishedHistoryBtn = finishedHistoryButtons[finishedHistoryButtons.length - 1];
    await user.click(finishedHistoryBtn);

    expect(screen.getByRole("heading", { name: "spooler.spools.printHistory" })).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "spooler.common.close" });
    await user.click(closeBtn);
  });

  it("handles cancelling quick usage and closing history", async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const recordBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(recordBtn);

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);
  });

  it("handles cancelling confirmation popups (delete, undo, manual finish)", async () => {
    const user = userEvent.setup();
    const { container } = renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    // Cancel undo popup
    const undoBtn = screen.getByTitle("spooler.spools.undoLastPrint");
    await user.click(undoBtn);
    const cancelUndoBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelUndoBtn);

    // Cancel delete popup
    const moreBtn = container.querySelector("button[aria-haspopup='menu']");
    if (moreBtn) await user.click(moreBtn);
    const deleteMenuItem = await screen.findByText("spooler.spools.deleteSpool");
    await user.click(deleteMenuItem);
    const cancelDeleteBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelDeleteBtn);

    // Cancel manual finish popup
    if (moreBtn) await user.click(moreBtn);
    const finishMenuItem = await screen.findByText("spooler.spools.markFinished");
    await user.click(finishMenuItem);
    const cancelFinishBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelFinishBtn);
  });

  it("opens clone prompt when quick usage finishes spool, handles confirm and clone form", async () => {
    mockRecordUsageSuccessIsFinished = true;
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const recordBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(recordBtn);

    const input = screen.getByPlaceholderText("spooler.spools.modelWeightPlaceholder");
    await user.type(input, "500");

    const submitRecordBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(submitRecordBtn);

    // Clone prompt is now open
    expect(screen.getByRole("heading", { name: "spooler.spools.emptyTriggerTitle" })).toBeInTheDocument();

    const cloneConfirmBtn = screen.getByRole("button", { name: "spooler.spools.cloneConfirm" });
    await user.click(cloneConfirmBtn);

    // SpoolFormModal should now be open in clone mode
    expect(screen.getByRole("heading", { name: "spooler.spools.addSpool" })).toBeInTheDocument();

    const cancelFormBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelFormBtn);
    mockRecordUsageSuccessIsFinished = false;
  });

  it("closes clone prompt when cancel is clicked in CloneSpoolPromptModal", async () => {
    mockRecordUsageSuccessIsFinished = true;
    const user = userEvent.setup();
    renderWithTooltip(
      <SpoolsTab
        templates={mockTemplates}
        onNavigateToTemplates={vi.fn()}
      />
    );

    const recordBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(recordBtn);

    const input = screen.getByPlaceholderText("spooler.spools.modelWeightPlaceholder");
    await user.type(input, "500");

    const submitRecordBtn = screen.getByRole("button", { name: "spooler.spools.recordPrint" });
    await user.click(submitRecordBtn);

    expect(screen.getByRole("heading", { name: "spooler.spools.emptyTriggerTitle" })).toBeInTheDocument();

    const cancelPromptBtn = screen.getByRole("button", { name: "spooler.spools.cloneDismiss" });
    await user.click(cancelPromptBtn);

    expect(screen.queryByRole("heading", { name: "spooler.spools.emptyTriggerTitle" })).not.toBeInTheDocument();
    mockRecordUsageSuccessIsFinished = false;
  });
});
