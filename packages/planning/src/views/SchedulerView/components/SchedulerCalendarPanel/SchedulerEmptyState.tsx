import { Plus } from "lucide-react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";

export const SchedulerEmptyState = () => {
  const { t } = usePlanningTranslations();

  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-brand">
          <Plus className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{t("hub.noEvents")}</h3>
        <p className="text-muted-foreground/80 leading-relaxed">{t("hub.emptyStateDesc")}</p>
      </div>
    </div>
  );
};
