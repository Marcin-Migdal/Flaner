import React, { useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormSelect,
  FormTextField,
} from "@flaner/ui-components";
import type { FilamentSpool, SpoolInput } from "../../../api/spools";
import type { FilamentTemplate } from "../../../api/templates";
import { getSpoolSchema, type SpoolFormData } from "../../../utils/schemas";
import {
  useAddSpoolMutation,
  useEditSpoolMutation,
  useToolsTranslations,
} from "../../../hooks";

type SpoolFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  templates: FilamentTemplate[];
  initialData?: FilamentSpool | null;
  isCloneMode?: boolean;
  cloneCarryoverUsage?: number;
  clonePrevCurrentWeight?: number;
};

export const SpoolFormModal: React.FC<SpoolFormModalProps> = ({
  isOpen,
  onClose,
  templates,
  initialData,
  isCloneMode = false,
  cloneCarryoverUsage = 0,
  clonePrevCurrentWeight = 0,
}) => {
  const { t } = useToolsTranslations();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const defaultValues: SpoolFormData = useMemo(
    () => ({
      templateId: "",
      name: "",
      initialWeight: 975,
      currentWeight: 975,
    }),
    [],
  );

  const schema = useMemo(() => getSpoolSchema(t), [t]);

  const methods = useForm<SpoolFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { watch, setValue, reset, handleSubmit, formState } = methods;
  const watchTemplateId = watch("templateId");
  const prevTemplateIdRef = useRef<string>("");

  const handleClose = () => {
    reset(defaultValues);
    prevTemplateIdRef.current = "";
    prevInitialWeightRef.current = defaultValues.initialWeight;
    onClose();
  };

  const addSpoolMutation = useAddSpoolMutation({
    onSuccess: () => {
      handleClose();
    },
  });

  const editSpoolMutation = useEditSpoolMutation({
    onSuccess: () => {
      handleClose();
    },
  });

  // Trigger auto-focus in clone mode
  useEffect(() => {
    if (isOpen && isCloneMode && submitButtonRef.current) {
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, isCloneMode]);

  const watchInitialWeight = watch("initialWeight");
  const prevInitialWeightRef = useRef(watchInitialWeight);

  // Sync currentWeight when initialWeight changes for new spools
  useEffect(() => {
    if (!initialData && !isCloneMode && isOpen) {
      if (prevInitialWeightRef.current !== watchInitialWeight) {
        prevInitialWeightRef.current = watchInitialWeight;
        setValue("currentWeight", watchInitialWeight);
      }
    }
  }, [watchInitialWeight, initialData, isCloneMode, isOpen, setValue]);

  // Sync initialData when editing or cloning, and reset cleanly on open/close
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const carryover = isCloneMode
          ? Math.max(0, cloneCarryoverUsage - clonePrevCurrentWeight)
          : 0;
        const initialWeight = initialData.initialWeight;
        const currentWeight = isCloneMode
          ? parseFloat(Math.max(0, initialData.initialWeight - carryover).toFixed(2))
          : initialData.currentWeight;

        reset({
          templateId: initialData.templateId ?? "",
          name: initialData.name,
          initialWeight,
          currentWeight,
        });
        prevTemplateIdRef.current = initialData.templateId ?? "";
        prevInitialWeightRef.current = initialWeight;
      } else {
        reset(defaultValues);
        prevTemplateIdRef.current = "";
        prevInitialWeightRef.current = defaultValues.initialWeight;
      }
    } else {
      reset(defaultValues);
      prevTemplateIdRef.current = "";
    }
  }, [initialData, reset, isOpen, isCloneMode, cloneCarryoverUsage, clonePrevCurrentWeight, defaultValues]);

  // Auto-fill template values ONLY when choosing or changing template on new spool
  useEffect(() => {
    if (isOpen && !initialData && watchTemplateId && watchTemplateId !== prevTemplateIdRef.current) {
      prevTemplateIdRef.current = watchTemplateId;
      const selected = templates.find((tmpl) => tmpl.id === watchTemplateId);
      if (selected) {
        setValue("name", `${selected.material} ${selected.type} ${selected.colorName}`);
        setValue("initialWeight", selected.defaultWeight);
        setValue("currentWeight", selected.defaultWeight);
        prevInitialWeightRef.current = selected.defaultWeight;
      }
    }
  }, [watchTemplateId, setValue, templates, initialData, isOpen]);

  const onFormSubmit = (data: SpoolFormData) => {
    const selectedTemplate = templates.find((tmpl) => tmpl.id === data.templateId);
    const inputPayload: SpoolInput = {
      templateId: data.templateId,
      name: data.name,
      initialWeight: data.initialWeight,
      currentWeight: data.currentWeight,
    };

    if (initialData && !isCloneMode) {
      editSpoolMutation.mutate({
        spoolId: initialData.id,
        data: inputPayload,
        selectedTemplate,
      });
    } else {
      addSpoolMutation.mutate({
        data: inputPayload,
        selectedTemplate,
      });
    }
  };

  const templateOptions = useMemo(
    () =>
      templates.map((tmpl) => ({
        value: tmpl.id,
        label: `${tmpl.material} ${tmpl.type} • ${tmpl.colorName}`,
        colorHex: tmpl.colorHex,
      })),
    [templates],
  );

  const isPending = addSpoolMutation.isPending || editSpoolMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCloneMode
              ? t("spooler.spools.addSpool")
              : initialData
                ? t("spooler.spools.editSpool")
                : t("spooler.spools.addSpool")}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 pt-2">
            <FormSelect
              name="templateId"
              label={t("spooler.spools.selectTemplate")}
              placeholder={t("spooler.spools.selectTemplate")}
              options={templateOptions}
            />

            <FormTextField
              name="name"
              label={t("spooler.spools.spoolName")}
              placeholder={t("spooler.spools.spoolNamePlaceholder")}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormTextField
                name="initialWeight"
                label={t("spooler.spools.initialWeight")}
                type="number"
                step="any"
              />

              <FormTextField
                name="currentWeight"
                label={t("spooler.spools.currentWeight")}
                type="number"
                step="any"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                {t("spooler.common.cancel")}
              </Button>
              <Button
                ref={submitButtonRef}
                type="submit"
                disabled={isPending || formState.isSubmitting}
              >
                {isPending
                  ? t("spooler.common.saving")
                  : initialData && !isCloneMode
                  ? t("spooler.spools.editSpool")
                  : t("spooler.spools.addSpool")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default SpoolFormModal;
