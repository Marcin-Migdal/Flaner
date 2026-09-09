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
import type { FilamentTemplate, TemplateInput } from "../../../api/templates";
import { fetchAssociatedSpools } from "../../../api/templates";
import { getTemplateSchema, type TemplateFormData } from "../../../utils/schemas";
import { mergeFilamentOptions } from "../../../utils/mergeFilamentOptions";
import { bambuFilaments } from "../../../utils/bambuFilaments";
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
} from "../../../hooks";
import { useAuth } from "@flaner/shared/context";
import { HEX_COLOR_REGEX } from "./TemplateFormModal.constants";
import type { DeleteLookupTarget, TemplateFormModalProps } from "./TemplateFormModal.types";
import { useTemplateCustomColors } from "./hooks/useTemplateCustomColors";
import { useSyncLookups } from "./hooks/useSyncLookups";
import {
  ColorOptionLabel,
  MaterialOptionLabel,
  TypeOptionLabel,
} from "./components";

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

  // One-time sync: migrate any custom filaments from existing templates to lookup collections
  useSyncLookups(user, userTemplates);

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
        let initialHex = initialData.colorHex;
        if (!initialHex || initialHex === "#ffffff") {
          const mat = bambuFilaments.find(
            (m) => m.name.toLowerCase() === initialData.material?.toLowerCase(),
          );
          const typ = mat?.types.find(
            (t) => t.name.toLowerCase() === initialData.type?.toLowerCase(),
          );
          const col = typ?.colors.find(
            (c) => c.name.toLowerCase() === initialData.colorName?.toLowerCase(),
          );
          if (col?.hex) {
            initialHex = col.hex;
          }
        }
        reset({
          material: initialData.material,
          type: initialData.type,
          colorName: initialData.colorName,
          colorHex: initialHex || "#ffffff",
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
    if (isOpen && prevMaterialRef.current !== undefined && prevMaterialRef.current !== watchMaterial) {
      prevMaterialRef.current = watchMaterial;
      prevTypeRef.current = "";
      prevColorNameRef.current = "";
      setValue("type", "");
      setValue("colorName", "");
      setValue("colorHex", "");
      clearErrors(["type", "colorName", "colorHex"]);
    }
  }, [watchMaterial, isOpen, setValue, clearErrors]);

  // Clear dependent child inputs (colorName, colorHex) when type changes on an open modal
  useEffect(() => {
    if (isOpen && prevTypeRef.current !== undefined && prevTypeRef.current !== watchType) {
      prevTypeRef.current = watchType;
      prevColorNameRef.current = "";
      setValue("colorName", "");
      setValue("colorHex", "");
      clearErrors(["colorName", "colorHex"]);
    }
  }, [watchType, isOpen, setValue, clearErrors]);

  const mergedFilaments = useMemo(() => {
    return mergeFilamentOptions(lookupMaterials, lookupTypes, lookupColors);
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
    const selected = mergedFilaments.find(
      (m) => m.name.toLowerCase() === watchMaterial?.toLowerCase(),
    );
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
    const selected = availableTypes.find(
      (typ) => typ.name.toLowerCase() === watchType.toLowerCase(),
    );
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

  // Determine if the currently selected or entered color is a custom color
  const isCustomColor = useMemo(() => {
    if (!watchColorName) return false;
    const lower = watchColorName.trim().toLowerCase();

    const inAvailable = availableColors.find((c) => c.name.toLowerCase() === lower);
    if (inAvailable) {
      return !!inAvailable.isCustom;
    }

    const isOfficialBambu = bambuFilaments.some(
      (m) =>
        m.name.toLowerCase() === watchMaterial?.toLowerCase() &&
        m.types.some(
          (typ) =>
            typ.name.toLowerCase() === watchType?.toLowerCase() &&
            typ.colors.some((col) => col.name.toLowerCase() === lower),
        ),
    );
    if (isOfficialBambu) {
      return false;
    }

    return true;
  }, [watchColorName, availableColors, watchMaterial, watchType]);

  const { customHexMap, saveCustomColorHex } = useTemplateCustomColors({
    userTemplates,
    lookupColors,
    isCustomColor,
    watchColorName,
    watchMaterial,
    watchType,
    onColorHexChange: (hex) => setValue("colorHex", hex),
    onSaveLookupColor: (data) => addLookupColorMutation.mutate(data),
  });

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

      const lower = watchColorName.trim().toLowerCase();

      // Check available colors first (both Bambu and custom colors in availableColors have hex)
      const matchingColor = availableColors.find(
        (c) => c.name.toLowerCase() === lower,
      );
      if (matchingColor && matchingColor.hex) {
        setValue("colorHex", matchingColor.hex);
        return;
      }

      // Check official Bambu catalog for predefined hex under current material & type
      const currentBambuMat = bambuFilaments.find(
        (m) => m.name.toLowerCase() === watchMaterial?.toLowerCase(),
      );
      const currentBambuType = currentBambuMat?.types.find(
        (typ) => typ.name.toLowerCase() === watchType?.toLowerCase(),
      );
      const official = currentBambuType?.colors.find(
        (c) => c.name.toLowerCase() === lower,
      );
      if (official) {
        setValue("colorHex", official.hex);
        return;
      }

      // If custom color, load saved custom hex if available, otherwise clear it
      if (customHexMap[lower]) {
        setValue("colorHex", customHexMap[lower]);
      } else {
        setValue("colorHex", "");
      }
    }
  }, [watchColorName, availableColors, isOpen, setValue, customHexMap, clearErrors, watchMaterial, watchType]);

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
    setValue("colorName", trimmed, { shouldValidate: true });
    setValue("colorHex", "");
    addLookupColorMutation.mutate({
      materialName: watchMaterial,
      typeName: watchType,
      name: trimmed,
      hex: "#ffffff",
    });
  };

  const handleConfirmDeleteLookup = () => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "material") {
      if (watchMaterial.toLowerCase() === deleteTarget.name.toLowerCase()) {
        setValue("material", "");
        setValue("type", "");
        setValue("colorName", "");
        setValue("colorHex", "");
        clearErrors(["material", "type", "colorName", "colorHex"]);
      }
      deleteLookupMaterialMutation.mutate({
        materialId: deleteTarget.id,
        materialName: deleteTarget.name,
      });
    } else if (deleteTarget.kind === "type") {
      if (watchType.toLowerCase() === deleteTarget.name.toLowerCase()) {
        setValue("type", "");
        setValue("colorName", "");
        setValue("colorHex", "");
        clearErrors(["type", "colorName", "colorHex"]);
      }
      deleteLookupTypeMutation.mutate({
        typeId: deleteTarget.id,
        materialName: deleteTarget.materialName,
        typeName: deleteTarget.name,
      });
    } else if (deleteTarget.kind === "color") {
      if (watchColorName.toLowerCase() === deleteTarget.name.toLowerCase()) {
        setValue("colorName", "");
        setValue("colorHex", "");
        clearErrors(["colorName", "colorHex"]);
      }
      deleteLookupColorMutation.mutate(deleteTarget.id);
    }

    handleCloseDeleteTarget();
  };


  const onFormSubmit = async (data: TemplateFormData) => {
    const isDuplicate = userTemplates.some((tpl) => {
      if (initialData && tpl.id === initialData.id) return false;
      return (
        tpl.material.trim().toLowerCase() === data.material.trim().toLowerCase() &&
        tpl.type.trim().toLowerCase() === data.type.trim().toLowerCase() &&
        tpl.colorName.trim().toLowerCase() === data.colorName.trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      setSubmitError(t("spooler.templates.validation.alreadyExists"));
      return;
    }
    setSubmitError(null);

    const lower = data.colorName.trim().toLowerCase();

    // Find color from availableColors or official Bambu catalog
    const matchingColor = availableColors.find(
      (c) => c.name.toLowerCase() === lower,
    );

    let resolvedHex = data.colorHex?.trim() || "";

    if (!isCustomColor) {
      // Official Bambu color: ALWAYS resolve from matchingColor or official Bambu catalog
      if (matchingColor?.hex) {
        resolvedHex = matchingColor.hex;
      } else {
        const currentBambuMat = bambuFilaments.find(
          (m) => m.name.toLowerCase() === data.material?.toLowerCase(),
        );
        const currentBambuType = currentBambuMat?.types.find(
          (typ) => typ.name.toLowerCase() === data.type?.toLowerCase(),
        );
        const official = currentBambuType?.colors.find(
          (c) => c.name.toLowerCase() === lower,
        );
        if (official?.hex) {
          resolvedHex = official.hex;
        }
      }
    } else {
      // Custom color: prioritize entered hex if valid, otherwise lookup in customHexMap, matchingColor, or fallback
      if (!HEX_COLOR_REGEX.test(resolvedHex)) {
        resolvedHex = customHexMap[lower] || matchingColor?.hex || "#ffffff";
      }
    }

    if (!resolvedHex || !HEX_COLOR_REGEX.test(resolvedHex)) {
      resolvedHex = "#ffffff";
    }

    const templateInput: TemplateInput = {
      material: data.material,
      type: data.type,
      colorName: data.colorName,
      colorHex: resolvedHex,
      defaultWeight: data.defaultWeight,
    };

    if (isCustomColor && data.colorName) {
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
                    onDelete={(id, name) =>
                      setDeleteTarget({
                        kind: "material",
                        id,
                        name,
                      })
                    }
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
                    onDelete={(id, materialName, name) =>
                      setDeleteTarget({
                        kind: "type",
                        id,
                        materialName,
                        name,
                      })
                    }
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
                    onDelete={(id, name) =>
                      setDeleteTarget({
                        kind: "color",
                        id,
                        name,
                      })
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
