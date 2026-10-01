import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateFormModal } from "./TemplateFormModal";
import type { FilamentTemplate } from "../../../../api/templates";

const addMutationMock = vi.fn();
const editMutationMock = vi.fn();
const fetchAssociatedSpoolsMock = vi.fn();
const addLookupMaterialMock = vi.fn();
const deleteLookupMaterialMock = vi.fn();
const addLookupTypeMock = vi.fn();
const deleteLookupTypeMock = vi.fn();
const addLookupColorMock = vi.fn();
const deleteLookupColorMock = vi.fn();
const saveCustomColorHexMock = vi.fn();

let mockUserTemplates: FilamentTemplate[] = [];
let mockIsPending = false;

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    user: { uid: "user-123" },
  }),
}));

vi.mock("../../../../api/templates", () => ({
  fetchAssociatedSpools: (...args: unknown[]) => fetchAssociatedSpoolsMock(...args),
}));

vi.mock("../../../../hooks", () => ({
  useToolsTranslations: () => ({
    t: (key: string, opt?: Record<string, unknown>) => {
      if (opt?.name) return `${key}:${opt.name}`;
      return key;
    },
  }),
  useGetTemplatesQuery: () => ({ data: mockUserTemplates }),
  useGetLookupMaterialsQuery: () => ({
    data: [{ id: "mat-1", name: "CustomMat", userId: "user-123" }],
  }),
  useGetLookupTypesQuery: () => ({
    data: [{ id: "type-1", materialName: "CustomMat", name: "CustomType", userId: "user-123" }],
  }),
  useGetLookupColorsQuery: () => ({
    data: [
      {
        id: "color-1",
        materialName: "CustomMat",
        typeName: "CustomType",
        name: "CustomColor",
        hex: "#ff00ff",
        userId: "user-123",
      },
    ],
  }),
  useAddLookupMaterialMutation: () => ({
    mutate: addLookupMaterialMock,
    isPending: mockIsPending,
  }),
  useDeleteLookupMaterialMutation: () => ({
    mutate: deleteLookupMaterialMock,
    isPending: false,
  }),
  useAddLookupTypeMutation: () => ({
    mutate: addLookupTypeMock,
    isPending: false,
  }),
  useDeleteLookupTypeMutation: () => ({
    mutate: deleteLookupTypeMock,
    isPending: false,
  }),
  useAddLookupColorMutation: () => ({
    mutate: addLookupColorMock,
    isPending: false,
  }),
  useDeleteLookupColorMutation: () => ({
    mutate: deleteLookupColorMock,
    isPending: false,
  }),
  useAddTemplateMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      addMutationMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
  useEditTemplateMutation: (opts?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      editMutationMock(vars);
      opts?.onSuccess?.();
    },
    isPending: false,
  }),
}));

vi.mock("../hooks/useSyncLookups", () => ({
  useSyncLookups: vi.fn(),
}));

vi.mock("../hooks/useTemplateCustomColors", () => ({
  useTemplateCustomColors: (props: {
    onColorHexChange?: (hex: string) => void;
    onSaveLookupColor?: (data: {
      materialName: string;
      typeName: string;
      name: string;
      hex: string;
    }) => void;
  }) => ({
    customHexMap: { customcolor: "#ff00ff" },
    saveCustomColorHex: (...args: unknown[]) => {
      saveCustomColorHexMock(...args);
      const hex = typeof args[0] === "string" ? args[0] : "#ff00ff";
      props.onColorHexChange?.(hex);
      props.onSaveLookupColor?.({
        materialName: "CustomMat",
        typeName: "CustomType",
        name: "CustomColor",
        hex,
      });
    },
  }),
}));

const mockTemplate: FilamentTemplate = {
  id: "tmpl-1",
  userId: "user-1",
  material: "PLA",
  type: "Basic",
  colorName: "Jade White",
  colorHex: "#ffffff",
  defaultWeight: 1000,
};

describe("TemplateFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mockUserTemplates = [];
    fetchAssociatedSpoolsMock.mockResolvedValue([]);
  });

  it("renders add template modal title and closes on cancel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TemplateFormModal
        isOpen={true}
        onClose={onClose}
      />
    );

    expect(screen.getByRole("heading", { name: "spooler.templates.addTemplate" })).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders edit template modal title and submits changes without spools cascade", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TemplateFormModal
        isOpen={true}
        onClose={onClose}
        initialData={mockTemplate}
      />
    );

    expect(screen.getByRole("heading", { name: "spooler.templates.editTemplate" })).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.editTemplate" });
    await user.click(submitBtn);

    expect(fetchAssociatedSpoolsMock).toHaveBeenCalledWith("user-123", "tmpl-1");
    expect(editMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "tmpl-1",
        propagate: false,
      })
    );
  });

  it("opens cascade modal when template has associated spools and propagates changes when confirmed", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValueOnce([
      { id: "spool-1", name: "Spool 1" },
    ]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TemplateFormModal
        isOpen={true}
        onClose={onClose}
        initialData={mockTemplate}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.editTemplate" });
    await user.click(submitBtn);

    expect(fetchAssociatedSpoolsMock).toHaveBeenCalledWith("user-123", "tmpl-1");
    expect(await screen.findByText("spooler.templates.editCascadeTitle")).toBeInTheDocument();

    const updateAllBtn = screen.getByRole("button", { name: "spooler.templates.updateSpoolsConfirm" });
    await user.click(updateAllBtn);

    expect(editMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "tmpl-1",
        propagate: true,
      })
    );
  });

  it("opens cascade modal when template has associated spools and updates template only when cancelled", async () => {
    fetchAssociatedSpoolsMock.mockResolvedValueOnce([
      { id: "spool-1", name: "Spool 1" },
    ]);
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TemplateFormModal
        isOpen={true}
        onClose={onClose}
        initialData={mockTemplate}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.editTemplate" });
    await user.click(submitBtn);

    expect(await screen.findByText("spooler.templates.editCascadeTitle")).toBeInTheDocument();

    const updateOnlyBtn = screen.getByRole("button", { name: "spooler.templates.updateTemplateOnly" });
    await user.click(updateOnlyBtn);

    expect(editMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "tmpl-1",
        propagate: false,
      })
    );
  });

  it("displays duplicate error when saving template matching another existing template", async () => {
    mockUserTemplates = [
      {
        id: "tmpl-other",
        userId: "user-123",
        material: "PLA",
        type: "Basic",
        colorName: "Jade White",
        colorHex: "#ffffff",
        defaultWeight: 1000,
      },
    ];

    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={mockTemplate}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.editTemplate" });
    await user.click(submitBtn);

    expect(await screen.findByRole("alert")).toHaveTextContent("spooler.templates.validation.alreadyExists");
    expect(editMutationMock).not.toHaveBeenCalled();
  });

  it("allows deleting a custom lookup material", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const controls = document.body.querySelectorAll(".react-select__control");
    expect(controls.length).toBeGreaterThan(0);
    await user.click(controls[0]);

    const deleteBtn = await screen.findByTitle("spooler.templates.deleteMaterialTooltip");
    await user.click(deleteBtn);

    expect(screen.getByText("spooler.lookups.deleteMaterialTitle:CustomMat")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "spooler.common.delete" });
    await user.click(confirmBtn);

    expect(deleteLookupMaterialMock).toHaveBeenCalledWith({
      materialId: "mat-1",
      materialName: "CustomMat",
    });
  });

  it("allows deleting custom lookup type and custom lookup color", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const controls = document.body.querySelectorAll(".react-select__control");
    // 1. Select material first so type is enabled
    await user.click(controls[0]);
    const matOption = await screen.findByText("CustomMat");
    await user.click(matOption);

    // 2. Open type menu and delete custom type
    await user.click(controls[1]);
    const deleteTypeBtn = await screen.findByTitle("spooler.templates.deleteTypeTooltip");
    await user.click(deleteTypeBtn);

    expect(screen.getByText("spooler.lookups.deleteTypeTitle:CustomType")).toBeInTheDocument();
    const confirmTypeDelete = screen.getByRole("button", { name: "spooler.common.delete" });
    await user.click(confirmTypeDelete);

    expect(deleteLookupTypeMock).toHaveBeenCalledWith({
      typeId: "type-1",
      materialName: "CustomMat",
      typeName: "CustomType",
    });

    // 3. Select type so color is enabled
    await user.click(controls[1]);
    const typeOption = await screen.findByText("CustomType");
    await user.click(typeOption);

    // 4. Open color menu and delete custom color
    await user.click(controls[2]);
    const deleteColorBtn = await screen.findByTitle("spooler.templates.deleteColorTooltip");
    await user.click(deleteColorBtn);

    expect(screen.getByText("spooler.lookups.deleteColorTitle:CustomColor")).toBeInTheDocument();
    const confirmColorDelete = screen.getByRole("button", { name: "spooler.common.delete" });
    await user.click(confirmColorDelete);

    expect(deleteLookupColorMock).toHaveBeenCalledWith("color-1");
  });

  it("cancels delete lookup confirmation dialog", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const controls = document.body.querySelectorAll(".react-select__control");
    await user.click(controls[0]);
    const deleteBtn = await screen.findByTitle("spooler.templates.deleteMaterialTooltip");
    await user.click(deleteBtn);

    const cancelBtn = screen.getByRole("button", { name: "spooler.common.cancel" });
    await user.click(cancelBtn);

    expect(deleteLookupMaterialMock).not.toHaveBeenCalled();
    expect(screen.queryByText("spooler.lookups.deleteMaterialTitle:CustomMat")).not.toBeInTheDocument();
  });

  it("allows selecting options and submitting new template in add mode", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const controls = document.body.querySelectorAll(".react-select__control");

    // Select material
    await user.click(controls[0]);
    const matOption = await screen.findByText("CustomMat");
    await user.click(matOption);

    // Select type
    await user.click(controls[1]);
    const typeOption = await screen.findByText("CustomType");
    await user.click(typeOption);

    // Select color
    await user.click(controls[2]);
    const colorOption = await screen.findByText("CustomColor");
    await user.click(colorOption);

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "spooler.templates.saveTemplate" });
    await user.click(submitBtn);

    expect(addMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        material: "CustomMat",
        type: "CustomType",
        colorName: "CustomColor",
      })
    );
  });

  it("triggers mutations when creating brand new material, type, and color via Creatable selects", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const controls = document.body.querySelectorAll(".react-select__control");

    // Create new material
    const matInput = controls[0].querySelector("input");
    expect(matInput).not.toBeNull();
    if (matInput) {
      await user.type(matInput, "BrandNewMat");
      const createMatOption = await screen.findByText(/create "brandnewmat"/i);
      await user.click(createMatOption);
      expect(addLookupMaterialMock).toHaveBeenCalledWith({ name: "BrandNewMat" });
    }

    // Create new type
    const typeInput = controls[1].querySelector("input");
    expect(typeInput).not.toBeNull();
    if (typeInput) {
      await user.type(typeInput, "BrandNewType");
      const createTypeOption = await screen.findByText(/create "brandnewtype"/i);
      await user.click(createTypeOption);
      expect(addLookupTypeMock).toHaveBeenCalledWith({
        materialName: "BrandNewMat",
        name: "BrandNewType",
      });
    }

    // Create new color
    const colorInput = controls[2].querySelector("input");
    expect(colorInput).not.toBeNull();
    if (colorInput) {
      await user.type(colorInput, "BrandNewColor");
      const createColorOption = await screen.findByText(/create "brandnewcolor"/i);
      await user.click(createColorOption);
      expect(addLookupColorMock).toHaveBeenCalledWith({
        materialName: "BrandNewMat",
        typeName: "BrandNewType",
        name: "BrandNewColor",
        hex: "#ffffff",
      });
    }
  });

  it("resolves Bambu official color hex on initialData when colorHex is #ffffff", () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={{
          id: "tmpl-bambu",
          userId: "user-1",
          material: "PLA",
          type: "Basic",
          colorName: "Jade White",
          colorHex: "#ffffff",
          defaultWeight: 1000,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "spooler.templates.editTemplate" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
  });

  it("resets type and color when material changes", async () => {
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select CustomMat
    await user.click(controls[0]);
    const matOption = await screen.findByText("CustomMat");
    await user.click(matOption);

    // Select CustomType
    await user.click(controls[1]);
    const typeOption = await screen.findByText("CustomType");
    await user.click(typeOption);

    // Change Material to PLA
    await user.click(controls[0]);
    const plaOption = await screen.findByText("PLA");
    await user.click(plaOption);

    // Type input should now be empty / reset placeholder
    expect(controls[1]).toHaveTextContent("spooler.templates.selectType");
  });

  it("prevents form submit on Enter key in weight input", () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const weightInput = screen.getByLabelText("spooler.templates.defaultWeight");
    fireEvent.keyDown(weightInput, { key: "Enter" });

    expect(addMutationMock).not.toHaveBeenCalled();
  });

  it("resets color when type changes", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select CustomMat
    await user.click(controls[0]);
    await user.click(await screen.findByText("CustomMat"));

    // Select CustomType
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));

    // Select CustomColor
    await user.click(controls[2]);
    await user.click(await screen.findByText("CustomColor"));

    // Change Type by typing a new one
    const typeInput = controls[1].querySelector("input");
    expect(typeInput).not.toBeNull();
    if (typeInput) {
      await user.type(typeInput, "OtherType");
      const createOtherType = await screen.findByText(/create "othertype"/i);
      await user.click(createOtherType);
    }

    // Color select should now be reset to placeholder
    expect(controls[2]).toHaveTextContent("spooler.templates.selectColor");
  });

  it("clears selected fields when the currently active material, type, or color is deleted", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select CustomMat
    await user.click(controls[0]);
    await user.click(await screen.findByText("CustomMat"));

    // Select CustomType
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));

    // Select CustomColor
    await user.click(controls[2]);
    await user.click(await screen.findByText("CustomColor"));

    // 1. Delete the active color
    await user.click(controls[2]);
    const deleteColorBtn = await screen.findByTitle("spooler.templates.deleteColorTooltip");
    await user.click(deleteColorBtn);
    await user.click(screen.getByRole("button", { name: "spooler.common.delete" }));
    expect(controls[2]).toHaveTextContent("spooler.templates.selectColor");

    // Re-select color
    await user.click(controls[2]);
    await user.click(await screen.findByText("CustomColor"));

    // 2. Delete the active type
    await user.click(controls[1]);
    const deleteTypeBtn = await screen.findByTitle("spooler.templates.deleteTypeTooltip");
    await user.click(deleteTypeBtn);
    await user.click(screen.getByRole("button", { name: "spooler.common.delete" }));
    expect(controls[1]).toHaveTextContent("spooler.templates.selectType");

    // Re-select type
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));

    // 3. Delete the active material
    await user.click(controls[0]);
    const deleteMatBtn = await screen.findByTitle("spooler.templates.deleteMaterialTooltip");
    await user.click(deleteMatBtn);
    await user.click(screen.getByRole("button", { name: "spooler.common.delete" }));
    expect(controls[0]).toHaveTextContent("spooler.templates.selectMaterial");
  });

  it("handles official Bambu color selection and saving", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select PLA
    await user.click(controls[0]);
    await user.click(await screen.findByText("PLA"));

    // Select Basic
    await user.click(controls[1]);
    await user.click(await screen.findByText("Basic"));

    // Select Jade White
    await user.click(controls[2]);
    await user.click(await screen.findByText("Jade White"));

    // Submit Bambu template
    const submitBtn = screen.getByRole("button", { name: "spooler.templates.saveTemplate" });
    await user.click(submitBtn);

    expect(addMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        material: "PLA",
        type: "Basic",
        colorName: "Jade White",
        colorHex: "#f9f6f0",
      })
    );
  });

  it("logs validation warning when submitting empty form", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.saveTemplate" });
    await user.click(submitBtn);

    expect(warnSpy).toHaveBeenCalledWith("Template form validation errors:", expect.any(Object));
    warnSpy.mockRestore();
  });

  it("calls saveCustomColorHex on hex input blur and select", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select CustomMat, CustomType, CustomColor
    await user.click(controls[0]);
    await user.click(await screen.findByText("CustomMat"));
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));
    await user.click(controls[2]);
    await user.click(await screen.findByText("CustomColor"));

    const hexInput = screen.getByLabelText("spooler.templates.colorHex");
    await user.clear(hexInput);
    await user.type(hexInput, "#123456");
    fireEvent.blur(hexInput);

    expect(saveCustomColorHexMock).toHaveBeenCalledWith("#123456");
  });

  it("closes modal on Escape key when no subdialog is open", () => {
    const onClose = vi.fn();
    render(<TemplateFormModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("prevents closing main modal when subdialog is open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TemplateFormModal isOpen={true} onClose={onClose} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    await user.click(controls[0]);
    const deleteBtn = await screen.findByTitle("spooler.templates.deleteMaterialTooltip");
    await user.click(deleteBtn);

    // Subdialog is open now, try to press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("allows saving template with same name as its own initialData without duplicate error", async () => {
    mockUserTemplates = [mockTemplate];
    const user = userEvent.setup();
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={mockTemplate}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.editTemplate" });
    await user.click(submitBtn);

    expect(editMutationMock).toHaveBeenCalled();
  });

  it("resolves custom color hex from customHexMap when color is in map", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select CustomMat and CustomType
    await user.click(controls[0]);
    await user.click(await screen.findByText("CustomMat"));
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));

    // Select CustomColor
    const updatedControls = document.body.querySelectorAll(".react-select__control");
    await user.click(updatedControls[2]);
    const colorOpt = await screen.findByText("CustomColor");
    await user.click(colorOpt);

    // Submit and verify customcolor hex was resolved
    const submitBtn = screen.getByRole("button", { name: "spooler.templates.saveTemplate" });
    await user.click(submitBtn);

    expect(addMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        colorName: "CustomColor",
        colorHex: "#ff00ff",
      })
    );
  });

  it("triggers onColorSelect when preset color is chosen in ColorPickerField", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    // Select CustomMat, CustomType, CustomColor
    await user.click(controls[0]);
    await user.click(await screen.findByText("CustomMat"));
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));
    await user.click(controls[2]);
    await user.click(await screen.findByText("CustomColor"));

    // Click color picker trigger
    const pickColorBtn = screen.getByRole("button", { name: "Pick color" });
    await user.click(pickColorBtn);

    // Click a preset color, e.g. Color #ef4444
    const presetBtn = await screen.findByRole("button", { name: "Color #ef4444" });
    await user.click(presetBtn);

    expect(saveCustomColorHexMock).toHaveBeenCalledWith("#ef4444");
  });

  it("renders saving state when mutation is pending", () => {
    mockIsPending = true;
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "spooler.common.saving" })).toBeInTheDocument();
  });

  it("uses default fallback values when initialData has missing optional fields", () => {
    render(
      <TemplateFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={{
          id: "tmpl-sparse",
          userId: "user-1",
          material: "PETG",
          type: "Translucent",
          colorName: "Clear",
          colorHex: "",
          defaultWeight: 0,
        }}
      />
    );

    expect(screen.getByDisplayValue("975")).toBeInTheDocument();
  });

  it("falls back to #ffffff or customHexMap when custom color has invalid hex on submit", async () => {
    const user = userEvent.setup();
    render(<TemplateFormModal isOpen={true} onClose={vi.fn()} />);

    const controls = document.body.querySelectorAll(".react-select__control");
    await user.click(controls[0]);
    await user.click(await screen.findByText("CustomMat"));
    await user.click(controls[1]);
    await user.click(await screen.findByText("CustomType"));
    await user.click(controls[2]);
    await user.click(await screen.findByText("CustomColor"));

    const hexInput = screen.getByLabelText("spooler.templates.colorHex");
    await user.clear(hexInput);
    await user.type(hexInput, "invalid-hex-format");

    const submitBtn = screen.getByRole("button", { name: "spooler.templates.saveTemplate" });
    await user.click(submitBtn);

    expect(addMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        colorHex: "#ff00ff",
      })
    );
  });
});
