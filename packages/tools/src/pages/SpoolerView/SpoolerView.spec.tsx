import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpoolerView } from "./SpoolerView";
import type { FilamentSpool } from "../../api/spools";
import type { FilamentTemplate } from "../../api/templates";

const mockSpools: FilamentSpool[] = [
  {
    id: "spool-1",
    userId: "user-1",
    templateId: "tmpl-1",
    name: "Spool Alpha",
    material: "PLA",
    type: "Basic",
    colorName: "Jade White",
    colorHex: "#ffffff",
    initialWeight: 1000,
    currentWeight: 750,
    isFinished: false,
  },
];

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

let currentTemplates: FilamentTemplate[] = mockTemplates;
let currentSpools: FilamentSpool[] = mockSpools;

vi.mock("../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string, opt?: Record<string, unknown>) => {
      if (opt?.weight) return `${key}:${opt.weight}`;
      return key;
    },
    i18n: { language: "en" },
  }),
  useGetSpoolsQuery: () => ({ data: currentSpools, isLoading: false }),
  useGetTemplatesQuery: () => ({ data: currentTemplates, isLoading: false }),
  useGetStartupWasteQuery: () => ({ data: 1.5, isLoading: false }),
  useUpdateStartupWasteMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkSpoolAsFinishedMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useUndoLastPrintMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSpoolMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useAddSpoolMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useEditSpoolMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRecordSpoolUsageMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useGetSpoolPrintsQuery: () => ({ data: [], isLoading: false }),
  useGetLookupMaterialsQuery: () => ({ data: [] }),
  useGetLookupTypesQuery: () => ({ data: [] }),
  useGetLookupColorsQuery: () => ({ data: [] }),
  useAddLookupMaterialMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLookupMaterialMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useAddLookupTypeMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLookupTypeMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useAddLookupColorMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLookupColorMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useAddTemplateMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useEditTemplateMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTemplateMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: { uid: "user-1" } }),
}));

describe("SpoolerView", () => {
  beforeEach(() => {
    currentTemplates = mockTemplates;
  });

  it("renders page header and stats correctly", () => {
    render(<SpoolerView />);

    expect(screen.getByRole("heading", { name: "spooler.title" })).toBeInTheDocument();
    expect(screen.getByText("750 g")).toBeInTheDocument();
    expect(screen.getByText("spooler.stats.activeSpools")).toBeInTheDocument();
  });

  it("opens settings modal when preferences button is clicked", async () => {
    const user = userEvent.setup();
    render(<SpoolerView />);

    const settingsBtn = screen.getByRole("button", { name: "spooler.settings.preferences" });
    await user.click(settingsBtn);

    expect(screen.getByRole("heading", { name: "spooler.settings.title" })).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);
  });

  it("switches to templates tab when tab trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<SpoolerView />);

    const templatesTabTrigger = screen.getByRole("tab", { name: /spooler\.tabs\.templates/i });
    await user.click(templatesTabTrigger);

    expect(screen.getByText("spooler.templates.title (1)")).toBeInTheDocument();
  });

  it("switches to templates tab when onNavigateToTemplates is triggered from SpoolsTab", async () => {
    currentTemplates = [];
    const user = userEvent.setup();
    render(<SpoolerView />);

    const createFirstBtn = screen.getByRole("button", { name: "spooler.tabs.templates" });
    await user.click(createFirstBtn);

    expect(screen.getByText("spooler.templates.title (0)")).toBeInTheDocument();
  });

  it("formats total weight in kg when >= 1000g and handles 0 weight", () => {
    currentSpools = [
      { ...mockSpools[0], id: "spool-1", currentWeight: 1500 },
      { ...mockSpools[0], id: "spool-2", currentWeight: 0 as unknown as number },
    ];
    render(<SpoolerView />);
    expect(screen.getByText("1.50 kg")).toBeInTheDocument();
    currentSpools = mockSpools;
  });
});
