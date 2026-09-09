import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@flaner/ui-components";
import type { FilamentSpool } from "../../../api/spools";
import { getQuickUsageSchema, type QuickUsageFormData } from "../../../utils/schemas";
import {
  useRecordSpoolUsageMutation,
  useGetStartupWasteQuery,
  useToolsTranslations,
} from "../../../hooks";

type QuickUsageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  spool: FilamentSpool;
  onFinished?: (spool: FilamentSpool, usage: number) => void;
};

export const QuickUsageModal: React.FC<QuickUsageModalProps> = ({
  isOpen,
  onClose,
  spool,
  onFinished,
}) => {
  const { t } = useToolsTranslations();
  const { data: startupWaste = 1.5 } = useGetStartupWasteQuery();

  const recordUsageMutation = useRecordSpoolUsageMutation({
    onSuccess: (result, variables) => {
      onClose();
      if (result.isFinished && onFinished) {
        onFinished(variables.spool, variables.usage);
      }
    },
  });

  const schema = useMemo(() => getQuickUsageSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickUsageFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      modelWeight: undefined,
    },
  });

  const watchModelWeight = watch("modelWeight") ?? 0;
  const totalWeight = watchModelWeight > 0 ? (watchModelWeight + startupWaste).toFixed(1) : "0";

  const handleClose = () => {
    reset({ modelWeight: undefined });
    onClose();
  };

  const onFormSubmit = (data: QuickUsageFormData) => {
    const totalUsage = data.modelWeight + startupWaste;
    recordUsageMutation.mutate({ spool, usage: totalUsage });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("spooler.spools.recordUsage")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground text-left">
            {t("spooler.spools.spoolLabel")}: <span className="font-semibold text-foreground">{spool.name}</span>{" "}
            <span className="text-xs text-muted-foreground font-normal">
              ({t("spooler.spools.remainingLabel", { weight: spool.currentWeight })})
            </span>
          </p>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 text-left">
              {t("spooler.spools.modelWeight")}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  {...register("modelWeight", { valueAsNumber: true })}
                  placeholder={t("spooler.spools.modelWeightPlaceholder")}
                  className="w-full h-10 rounded-xl border border-input bg-background pl-4 pr-36 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand select-none pointer-events-none">
                  {t("spooler.spools.startWasteBadge", { weight: startupWaste })}
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("spooler.spools.startWasteTooltip")}
                    className="size-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground cursor-help"
                  >
                    <HelpCircle className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{t("spooler.spools.startWasteTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {errors.modelWeight && (
              <p className="mt-1 text-xs text-destructive text-left">{errors.modelWeight.message}</p>
            )}
          </div>

          {watchModelWeight > 0 && (
            <div className="bg-card/60 border border-border/80 rounded-xl p-4 text-sm text-muted-foreground space-y-2 text-left">
              <div className="flex justify-between">
                <span>{t("spooler.spools.modelWeight")}:</span>
                <span className="font-medium text-foreground">{watchModelWeight} g</span>
              </div>
              <div className="flex justify-between">
                <span>{t("spooler.spools.startWasteDetail")}</span>
                <span className="font-medium text-foreground">+{startupWaste} g</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t("spooler.spools.totalSubtracted")}:</span>
                <span className="text-brand font-bold">{totalWeight} g</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("spooler.common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || recordUsageMutation.isPending}
            >
              {recordUsageMutation.isPending ? t("spooler.common.saving") : t("spooler.spools.recordPrint")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickUsageModal;
