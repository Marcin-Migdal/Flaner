import { PageHeader } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";

export const BudgetSummaryView = () => {
  const { t } = usePlanningTranslations();

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-6">
      <PageHeader title={t("nav.budgetSummary")} />
    </div>
  );
};

export default BudgetSummaryView;
