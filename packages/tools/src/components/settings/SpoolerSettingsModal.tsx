import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormTextField,
} from "@flaner/ui-components";
import { getSettingsSchema, type SettingsFormData } from "../../utils/schemas";
import {
  useGetStartupWasteQuery,
  useUpdateStartupWasteMutation,
  useToolsTranslations,
} from "../../hooks";

type SpoolerSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SpoolerSettingsModal: React.FC<SpoolerSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useToolsTranslations();
  const { data: startupWaste = 1.5, isLoading } = useGetStartupWasteQuery();

  const updateMutation = useUpdateStartupWasteMutation({
    onSuccess: () => {
      onClose();
    },
  });

  const methods = useForm<SettingsFormData>({
    resolver: zodResolver(getSettingsSchema()),
    defaultValues: {
      startupWaste: 1.5,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (startupWaste !== undefined) {
      reset({ startupWaste });
    }
  }, [startupWaste, reset]);

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data.startupWaste);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5 text-brand" />
            {t("spooler.settings.title")}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormTextField
              name="startupWaste"
              label={t("spooler.settings.startupWasteLabel")}
              description={t("spooler.settings.startupWasteDesc")}
              type="number"
              step="0.05"
              disabled={isLoading}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("spooler.common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending || !isDirty}
              >
                {updateMutation.isPending ? t("spooler.common.saving") : t("spooler.common.save")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default SpoolerSettingsModal;
