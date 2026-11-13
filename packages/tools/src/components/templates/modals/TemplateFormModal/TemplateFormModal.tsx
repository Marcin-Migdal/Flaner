import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import {
  Button,
  ConfirmationPopup,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormColorPickerField,
  FormSelect,
  FormTextField,
} from "@flaner/ui-components";
import type { FilamentTemplate, TemplateInput } from "../../../../api/templates";
import { fetchAssociatedSpools } from "../../../../api/templates";
import { getTemplateSchema, type TemplateFormData } from "../../../../utils/schemas";
import {
  buildFilamentOptions,
  findCatalogColor,
  findCustomColorHex,
  isSameName,
  resolveColorHex,
} from "../../../../utils/filamentCatalog";
import {
  useAddLookupColorMutation,
  useAddLookupMaterialMutation,
  useAddLookupTypeMutation,
  useAddTemplateMutation,
  useDeleteLookupColorMutation,
  useDeleteLookupMaterialMutation,
  useDeleteLookupTypeMutation,
  useEditTemplateMutation,
  useGetLookupColorsQuery,
  useGetLookupMaterialsQuery,
  useGetLookupTypesQuery,
  useGetTemplatesQuery,
  useToolsTranslations,
} from "../../../../hooks";
import { useAuth } from "@flaner/shared/context";
import { HEX_COLOR_REGEX } from "./TemplateFormModal.constants";
import type { DeleteLookupTarget, TemplateFormModalProps } from "./TemplateFormModal.types";
import {
  ColorOptionLabel,
  MaterialOptionLabel,
  TypeOptionLabel,
} from "../components";

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { t } = useToolsTranslations();
  const { user } = useAuth();
  const [cascadeEditData, setCascadeEditData] = useState<{
    template: FilamentTemplate;
    newData: TemplateInput;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteLookupTarget | null>(null);
  const subDialogClosingRef = useRef(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: userTemplates = [] } = useGetTemplatesQuery();
  const { data: lookupMaterials = [] } = useGetLookupMaterialsQuery();
  const { data: lookupTypes = [] } = useGetLookupTypesQuery();
  const { data: lookupColors = [] } = useGetLookupColorsQuery();

  const addLookupMaterialMutation = useAddLookupMaterialMutation();
  const deleteLookupMaterialMutation = useDeleteLookupMaterialMutation();
  const addLookupTypeMutation = useAddLookupTypeMutation();
  const deleteLookupTypeMutation = useDeleteLookupTypeMutation();
  const addLookupColorMutation = useAddLookupColorMutation();
  const deleteLookupColorMutation = useDeleteLookupColorMutation();

  const defaultValues: TemplateFormData = useMemo(
    () => ({
      material: "",
      type: "",
      colorName: "",
      colorHex: "",
      defaultWeight: 975,
    }),
    [],
  );

  const schema = useMemo(() => getTemplateSchema(t), [t]);

  const methods = useForm<TemplateFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { watch, reset, setValue, handleSubmit, formState, clearErrors } = methods;
  const watchMaterial = watch("material");
  const prevMaterialRef = useRef<string>(watchMaterial);
  const watchType = watch("type");
  const prevTypeRef = useRef<string>(watchType);
  const watchColorName = watch("colorName");
  const prevColorNameRef = useRef<string>(watchColorName);
  const watchColorHex = watch("colorHex");

  const handleClose = () => {
    reset(defaultValues);
    prevMaterialRef.current = "";
    prevTypeRef.current = "";
    prevColorNameRef.current = "";
    setDeleteTarget(null);
    setSubmitError(null);
    onClose();
  };

  const handleCloseDeleteTarget = () => {
    subDialogClosingRef.current = true;
    setDeleteTarget(null);
    setTimeout(() => {
      subDialogClosingRef.current = false;
    }, 200);
  };

  const handleCloseCascadeEdit = (propagate: boolean) => {
    if (cascadeEditData) {
      subDialogClosingRef.current = true;
      editMutation.mutate({
        templateId: cascadeEditData.template.id,
        newData: cascadeEditData.newData,
        propagate,
      });
      setCascadeEditData(null);
      setTimeout(() => {
        subDialogClosingRef.current = false;
      }, 200);
    }
  };

  const addMutation = useAddTemplateMutation({
    onSuccess: () => {
      handleClose();
    },
  });

  const editMutation = useEditTemplateMutation({
    onSuccess: () => {
      setCascadeEditData(null);
      handleClose();
    },
  });

  useEffect(() => {
    setSubmitError(null);
    if (isOpen) {
      if (initialData) {
        reset({
          material: initialData.material,
          type: initialData.type,
          colorName: initialData.colorName,
          colorHex: resolveColorHex(initialData),
          defaultWeight: initialData.defaultWeight || 975,
        });
        prevMaterialRef.current = initialData.material;
        prevTypeRef.current = initialData.type;
        prevColorNameRef.current = initialData.colorName;
      } else {
        reset(defaultValues);
        prevMaterialRef.current = "";
        prevTypeRef.current = "";
        prevColorNameRef.current = "";
      }
    } else {
      reset(defaultValues);
      prevMaterialRef.current = "";
      prevTypeRef.current = "";
      prevColorNameRef.current = "";
    }
  }, [initialData, reset, isOpen, defaultValues]);

  // Clear modal submit error whenever key fields change
  useEffect(() => {
    setSubmitError(null);
  }, [watchMaterial, watchType, watchColorName]);

  // Clear dependent child inputs (type, colorName, colorHex) when material changes on an open modal
  useEffect(() => {
    if (isOpen && prevMaterialRef.current && watchMaterial && prevMaterialRef.current !== watchMaterial) {
      prevTypeRef.current = "";
      prevColorNameRef.current = "";
      setValue("type", "");
      setValue("colorName", "");
      setValue("colorHex", "");
      clearErrors(["type", "colorName", "colorHex"]);
    }
    prevMaterialRef.current = watchMaterial;
  }, [watchMaterial, isOpen, setValue, clearErrors]);

  // Clear dependent child inputs (colorName, colorHex) when type changes on an open modal
  useEffect(() => {
    if (isOpen && prevTypeRef.current && watchType && prevTypeRef.current !== watchType) {
      prevColorNameRef.current = "";
      setValue("colorName", "");
      setValue("colorHex", "");
      clearErrors(["colorName", "colorHex"]);
    }
    prevTypeRef.current = watchType;
  }, [watchType, isOpen, setValue, clearErrors]);

  const mergedFilaments = useMemo(() => {
    return buildFilamentOptions(lookupMaterials, lookupTypes, lookupColors);
  }, [lookupMaterials, lookupTypes, lookupColors]);

  const getTranslatedOption = useCallback(
    (prefix: "materials" | "types" | "colors", name: string): string => {
      const key = `spooler.filaments.${prefix}.${name}`;
      const translated = t(key);
      return translated !== key ? translated : name;
    },
    [t],
  );

  const materialOptions = useMemo(() => {
    return mergedFilaments.map((m) => ({
      value: m.name,
      label: getTranslatedOption("materials", m.name),
      id: m.id,
      isCustom: m.isCustom,
    }));
  }, [mergedFilaments, getTranslatedOption]);

  const availableTypes = useMemo(() => {
    const selected = mergedFilaments.find((m) => isSameName(m.name, watchMaterial));
    return selected ? selected.types : [];
  }, [mergedFilaments, watchMaterial]);

  const typeOptions = useMemo(() => {
    return availableTypes.map((typ) => ({
      value: typ.name,
      label: getTranslatedOption("types", typ.name),
      id: typ.id,
      isCustom: typ.isCustom,
      materialName: watchMaterial,
    }));
  }, [availableTypes, getTranslatedOption, watchMaterial]);

  // Custom types only offer colors specifically assigned to that material and type
  const availableColors = useMemo(() => {
    if (!watchMaterial || !watchType) return [];
    const selected = availableTypes.find((typ) => isSameName(typ.name, watchType));
    return selected ? selected.colors : [];
  }, [availableTypes, watchMaterial, watchType]);

  const colorOptions = useMemo(() => {
    return availableColors.map((c) => ({
      value: c.name,
      label: getTranslatedOption("colors", c.name),
      hex: c.hex,
      id: c.id,
      isCustom: c.isCustom,
      materialName: watchMaterial,
      typeName: watchType,
    }));
  }, [availableColors, getTranslatedOption, watchMaterial, watchType]);

  // Any colour that is not in the catalog for this material + type is custom (its hex is editable)
  const isCustomColor =
    Boolean(watchColorName) &&
    !findCatalogColor({ material: watchMaterial, type: watchType, colorName: watchColorName });

  const saveCustomColorHex = (newHex: string) => {
    const rawVal = newHex.trim();
    const formattedVal = rawVal.startsWith("#") ? rawVal : `#${rawVal}`;
    if (!HEX_COLOR_REGEX.test(formattedVal)) return;

    setValue("colorHex", formattedVal);
    if (isCustomColor && watchMaterial && watchType) {
      addLookupColorMutation.mutate({
        materialName: watchMaterial,
        typeName: watchType,
        name: watchColorName,
        hex: formattedVal,
      });
    }
  };

  // Sync colorHex when watchColorName changes
  useEffect(() => {
    if (!isOpen) return;

    if (prevColorNameRef.current !== watchColorName) {
      prevColorNameRef.current = watchColorName;

      if (!watchColorName) {
        setValue("colorHex", "");
        clearErrors("colorHex");
        return;
      }

      const filament = { material: watchMaterial, type: watchType, colorName: watchColorName };
      setValue(
        "colorHex",
        findCatalogColor(filament)?.hex ?? findCustomColorHex(filament, lookupColors, userTemplates) ?? "",
      );
    }
  }, [watchColorName, isOpen, setValue, clearErrors, watchMaterial, watchType, lookupColors, userTemplates]);

  const handleColorHexBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    saveCustomColorHex(e.target.value);
  };

  const handleColorSelect = (selectedHex: string) => {
    saveCustomColorHex(selectedHex);
  };

  // Immediate creation handlers for Creatable selects
  const handleCreateMaterial = (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setValue("material", trimmed, { shouldValidate: true });
    setValue("type", "");
    setValue("colorName", "");
    setValue("colorHex", "");
    clearErrors(["type", "colorName", "colorHex"]);
    addLookupMaterialMutation.mutate({ name: trimmed });
  };

  const handleCreateType = (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (!trimmed || !watchMaterial) return;
    setValue("type", trimmed, { shouldValidate: true });
    setValue("colorName", "");
    setValue("colorHex", "");
    clearErrors(["colorName", "colorHex"]);
    addLookupTypeMutation.mutate({
      materialName: watchMaterial,
      name: trimmed,
    });
  };

  const handleCreateColor = (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (!trimmed || !watchMaterial || !watchType) return;
    // The colour lookup is saved with its hex: when a hex is picked, or on submit
    setValue("colorName", trimmed, { shouldValidate: true });
    setValue("colorHex", "");
  };

  const handleConfirmDeleteLookup = () => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "material") {
      if (isSameName(watchMaterial, deleteTarget.name)) {
        setValue("material", "");
        setValue("type", "");
        setValue("colorName", "");
        setValue("colorHex", "");
        clearErrors(["material", "type", "colorName", "colorHex"]);
      }
      deleteLookupMaterialMutation.mutate({ materialName: deleteTarget.name });
    } else if (deleteTarget.kind === "type") {
      if (isSameName(watchType, deleteTarget.name)) {
        setValue("type", "");
        setValue("colorName", "");
        setValue("colorHex", "");
        clearErrors(["type", "colorName", "colorHex"]);
      }
      deleteLookupTypeMutation.mutate({ materialName: deleteTarget.materialName, typeName: deleteTarget.name });
    } else if (deleteTarget.kind === "color") {
      if (isSameName(watchColorName, deleteTarget.name)) {
        setValue("colorName", "");
        setValue("colorHex", "");
        clearErrors(["colorName", "colorHex"]);
      }
      deleteLookupColorMutation.mutate({
        materialName: deleteTarget.materialName,
        typeName: deleteTarget.typeName,
        name: deleteTarget.name,
      });
    }

    handleCloseDeleteTarget();
  };


  const onFormSubmit = async (data: TemplateFormData) => {
    const isDuplicate = userTemplates.some((tpl) => {
      if (initialData && tpl.id === initialData.id) return false;
      return (
        isSameName(tpl.material, data.material) &&
        isSameName(tpl.type, data.type) &&
        isSameName(tpl.colorName, data.colorName)
      );
    });

    if (isDuplicate) {
      setSubmitError(t("spooler.templates.validation.alreadyExists"));
      return;
    }
    setSubmitError(null);

    // Catalog colours always store the catalog hex; a custom colour keeps the entered hex (white included)
    const resolvedHex =
      findCatalogColor(data)?.hex ??
      (HEX_COLOR_REGEX.test(data.colorHex) ? data.colorHex : findCustomColorHex(data, lookupColors, userTemplates)) ??
      "#ffffff";

    const templateInput: TemplateInput = {
      material: data.material,
      type: data.type,
      colorName: data.colorName,
      colorHex: resolvedHex,
      defaultWeight: data.defaultWeight,
    };

    if (isCustomColor) {
      saveCustomColorHex(resolvedHex);
    }

    if (initialData && user) {
      const spools = await fetchAssociatedSpools(user.uid, initialData.id);
      if (spools.length > 0) {
        setCascadeEditData({
          template: initialData,
          newData: templateInput,
        });
        return;
      }
    }

    if (initialData) {
      editMutation.mutate({
        templateId: initialData.id,
        newData: templateInput,
        propagate: false,
      });
    } else {
      addMutation.mutate(templateInput);
    }
  };

  const isPending =
    addMutation.isPending ||
    editMutation.isPending ||
    addLookupMaterialMutation.isPending ||
    addLookupTypeMutation.isPending ||
    addLookupColorMutation.isPending;

  const isSubDialogOpen = Boolean(deleteTarget || cascadeEditData);

  const handleSelectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (isSubDialogOpen || subDialogClosingRef.current) {
              return;
            }
            handleClose();
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (isSubDialogOpen || subDialogClosingRef.current) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (isSubDialogOpen || subDialogClosingRef.current) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {initialData
                ? t("spooler.templates.editTemplate")
                : t("spooler.templates.addTemplate")}
            </DialogTitle>
          </DialogHeader>

          <FormProvider {...methods}>
            <form
              onSubmit={handleSubmit(onFormSubmit, (errors) => {
                console.warn("Template form validation errors:", errors);
              })}
              className="space-y-4 pt-2"
            >
              {submitError && (
                <div
                  role="alert"
                  className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <FormSelect
                name="material"
                label={t("spooler.templates.material")}
                placeholder={t("spooler.templates.selectMaterial")}
                options={materialOptions}
                formatOptionLabel={(option, meta) => (
                  <MaterialOptionLabel
                    option={option}
                    meta={meta}
                    onDelete={(_id, name) => setDeleteTarget({ kind: "material", name })}
                  />
                )}
                onKeyDown={handleSelectKeyDown}
                onCreateOption={handleCreateMaterial}
                creatable
              />

              <FormSelect
                name="type"
                label={t("spooler.templates.type")}
                placeholder={t("spooler.templates.selectType")}
                options={typeOptions}
                disabled={!watchMaterial}
                formatOptionLabel={(option, meta) => (
                  <TypeOptionLabel
                    option={option}
                    meta={meta}
                    materialName={watchMaterial}
                    onDelete={(_id, materialName, name) => setDeleteTarget({ kind: "type", materialName, name })}
                  />
                )}
                onKeyDown={handleSelectKeyDown}
                onCreateOption={handleCreateType}
                creatable
              />

              <FormSelect
                name="colorName"
                label={t("spooler.templates.color")}
                placeholder={t("spooler.templates.selectColor")}
                options={colorOptions}
                disabled={!watchType}
                formatOptionLabel={(option, meta) => (
                  <ColorOptionLabel
                    option={option}
                    meta={meta}
                    activeColorName={watchColorName}
                    activeColorHex={watchColorHex}
                    onDelete={(_id, name) =>
                      setDeleteTarget({ kind: "color", materialName: watchMaterial, typeName: watchType, name })
                    }
                  />
                )}
                onKeyDown={handleSelectKeyDown}
                onCreateOption={handleCreateColor}
                creatable
              />

              <FormColorPickerField
                name="colorHex"
                label={t("spooler.templates.colorHex")}
                disabled={!watchType || !isCustomColor}
                onBlur={handleColorHexBlur}
                onColorSelect={handleColorSelect}
              />

              <FormTextField
                name="defaultWeight"
                label={t("spooler.templates.defaultWeight")}
                type="number"
                step="any"
                onKeyDown={handleSelectKeyDown}
              />


              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  {t("spooler.common.cancel")}
                </Button>
                <Button type="submit" disabled={isPending || formState.isSubmitting}>
                  {isPending
                    ? t("spooler.common.saving")
                    : initialData
                      ? t("spooler.templates.editTemplate")
                      : t("spooler.templates.saveTemplate")}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {cascadeEditData && (
        <ConfirmationPopup
          open={!!cascadeEditData}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseCascadeEdit(false);
            }
          }}
          onConfirm={() => handleCloseCascadeEdit(true)}
          onCancel={() => handleCloseCascadeEdit(false)}
          title={t("spooler.templates.editCascadeTitle")}
          description={t("spooler.templates.editCascadeBody")}
          confirmLabel={t("spooler.templates.updateSpoolsConfirm")}
          cancelLabel={t("spooler.templates.updateTemplateOnly")}
          variant="primary"
          isConfirming={editMutation.isPending}
        />
      )}

      {deleteTarget && (
        <ConfirmationPopup
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseDeleteTarget();
            }
          }}
          title={
            deleteTarget.kind === "material"
              ? t("spooler.lookups.deleteMaterialTitle", { name: deleteTarget.name })
              : deleteTarget.kind === "type"
                ? t("spooler.lookups.deleteTypeTitle", { name: deleteTarget.name })
                : t("spooler.lookups.deleteColorTitle", { name: deleteTarget.name })
          }
          description={
            deleteTarget.kind === "material"
              ? t("spooler.lookups.deleteMaterialDesc")
              : deleteTarget.kind === "type"
                ? t("spooler.lookups.deleteTypeDesc")
                : t("spooler.lookups.deleteColorDesc")
          }
          confirmLabel={t("spooler.common.delete")}
          cancelLabel={t("spooler.common.cancel")}
          onConfirm={handleConfirmDeleteLookup}
          onCancel={handleCloseDeleteTarget}
          variant="destructive"
          isConfirming={
            deleteLookupMaterialMutation.isPending ||
            deleteLookupTypeMutation.isPending ||
            deleteLookupColorMutation.isPending
          }
        />
      )}
    </>
  );
};

export default TemplateFormModal;
