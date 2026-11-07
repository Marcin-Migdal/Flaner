import { EmptyState } from "@flaner/ui-components";
import { Plus } from "lucide-react";
import { usePlanningTranslations } from "../../../../../../hooks/usePlanningTranslations";

export const SchedulerEmptyState = () => {
  const { t } = usePlanningTranslations();

  return (
    <EmptyState
      className="flex-1"
      icon={<Plus />}
      title={t("hub.noEvents")}
      description={t("hub.emptyStateDesc")}
    />
  );
};

export default SchedulerEmptyState;
