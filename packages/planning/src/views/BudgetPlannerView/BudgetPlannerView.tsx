import { PageHeader } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";

export const BudgetPlannerView = () => {
  const { t } = usePlanningTranslations();

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-6">
      <PageHeader title={t("nav.budgetPlanner")} />
    </div>
  );
};

export default BudgetPlannerView;
