import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteTemplateModal } from "./DeleteTemplateModal";
import type { FilamentTemplate } from "../../../../api/templates";

const { deleteMutationMock, fetchAssociatedSpoolsMock } = vi.hoisted(() => ({
  deleteMutationMock: vi.fn(),
  fetchAssociatedSpoolsMock: vi.fn(),
}));

const mockUser = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock("../../../../api/templates", () => ({
  fetchAssociatedSpools: (...args: unknown[]) => fetchAssociatedSpoolsMock(...args),
}));

vi.mock("../../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string) => key,
  }),
  useDeleteTemplateMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      deleteMutationMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
}));

const mockTemplate: FilamentTemplate = {
  id: "tmpl-1",
  userId: "user-1",
  material: "PLA",
  type: "Basic",
  colorName: "White",
  colorHex: "#ffffff",
  defaultWeight: 1000,
};

describe("DeleteTemplateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAssociatedSpoolsMock.mockResolvedValue([]);
  });

  it("renders null if template is null", () => {
    const { container } = render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        template={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders simple confirmation when template has no associated spools", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={onClose}
        template={mockTemplate}
      />
    );

    const deleteBtn = await screen.findByRole("button", { name: "spooler.templates.deleteTemplate" });
    await waitFor(() => expect(deleteBtn).toBeEnabled());
    await user.click(deleteBtn);

    expect(deleteMutationMock).toHaveBeenCalledWith({
      templateId: "tmpl-1",
      deleteSpools: false,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders cascade dialog when template has associated spools", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValue([{ id: "spool-1" }]);
    const user = userEvent.setup();

    render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        template={mockTemplate}
      />
    );

    const deleteWithSpoolsBtn = await screen.findByRole("button", { name: "spooler.templates.deleteWithSpools" });
    await waitFor(() => expect(deleteWithSpoolsBtn).toBeEnabled());
    await user.click(deleteWithSpoolsBtn);

    expect(deleteMutationMock).toHaveBeenCalledWith({
      templateId: "tmpl-1",
      deleteSpools: true,
    });
  });

  it("handles keepSpools and cancel button clicks in cascade dialog", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValue([{ id: "spool-1" }]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={onClose}
        template={mockTemplate}
      />
    );

    const keepSpoolsBtn = await screen.findByRole("button", { name: "spooler.templates.keepSpools" });
    await user.click(keepSpoolsBtn);
    expect(deleteMutationMock).toHaveBeenCalledWith({
      templateId: "tmpl-1",
      deleteSpools: false,
    });

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles error when fetchAssociatedSpools rejects", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchAssociatedSpoolsMock.mockRejectedValueOnce(new Error("Network fail"));

    render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        template={mockTemplate}
      />
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });
    errorSpy.mockRestore();
  });

  it("calls onClose when simple dialog is dismissed via Escape key", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={onClose}
        template={mockTemplate}
      />
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cascade dialog is dismissed via Escape key", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValue([{ id: "spool-1" }]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DeleteTemplateModal
        isOpen={true}
        onClose={onClose}
        template={mockTemplate}
      />
    );

    await screen.findByRole("button", { name: "spooler.templates.deleteWithSpools" });
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
