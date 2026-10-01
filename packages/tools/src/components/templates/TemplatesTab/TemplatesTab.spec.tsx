import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatesTab } from "./TemplatesTab";
import type { FilamentTemplate } from "../../../api/templates";

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

vi.mock("../modals/DeleteTemplateModal", () => ({
  DeleteTemplateModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog">
        <h2>Delete Modal</h2>
        <button onClick={onClose}>Close Delete Modal</button>
      </div>
    ) : null,
}));

vi.mock("../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string) => key,
  }),
  useGetTemplatesQuery: () => ({ data: mockTemplates }),
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

describe("TemplatesTab", () => {
  it("renders templates list", () => {
    render(
      <TemplatesTab
        templates={mockTemplates}
        isLoading={false}
      />
    );

    expect(screen.getByText("PLA Basic")).toBeInTheDocument();
    expect(screen.getByText("Jade White • 1000g")).toBeInTheDocument();
  });

  it("renders loading spinner when isLoading is true", () => {
    const { container } = render(
      <TemplatesTab
        templates={[]}
        isLoading={true}
      />
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders empty state when templates is empty", () => {
    render(
      <TemplatesTab
        templates={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText("spooler.templates.noTemplates")).toBeInTheDocument();
  });

  it("opens add template modal and closes it", async () => {
    const user = userEvent.setup();

    render(
      <TemplatesTab
        templates={mockTemplates}
        isLoading={false}
      />
    );

    const addBtn = screen.getByRole("button", { name: "spooler.templates.addTemplate" });
    await user.click(addBtn);

    expect(screen.getByRole("heading", { name: "spooler.templates.addTemplate" })).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);
  });

  it("opens edit template modal via dropdown menu and closes it", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TemplatesTab
        templates={mockTemplates}
        isLoading={false}
      />
    );

    const menuTrigger = container.querySelector("button[aria-haspopup='menu']");
    expect(menuTrigger).toBeTruthy();
    if (menuTrigger) await user.click(menuTrigger);

    const editItem = await screen.findByText("spooler.templates.editTemplate");
    await user.click(editItem);

    expect(screen.getByRole("heading", { name: "spooler.templates.editTemplate" })).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);
  });

  it("opens delete template modal via dropdown menu and closes it", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TemplatesTab
        templates={mockTemplates}
        isLoading={false}
      />
    );

    const menuTrigger = container.querySelector("button[aria-haspopup='menu']");
    expect(menuTrigger).toBeTruthy();
    if (menuTrigger) await user.click(menuTrigger);

    const deleteItem = await screen.findByText("spooler.templates.deleteTemplate");
    await user.click(deleteItem);

    expect(screen.getByText("Delete Modal")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close Delete Modal" });
    await user.click(closeBtn);

    expect(screen.queryByText("Delete Modal")).not.toBeInTheDocument();
  });
});
