import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Alert, AlertDescription, AlertTitle, Button } from "@flaner/ui-components";
import { Repeat } from "lucide-react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { MissingLimit } from "../../../../utils/plannerRecurring";
import { planMissingLimitBannersStyles as styles } from "./PlanMissingLimitBanners.styles";

export type PlanMissingLimitBannersProps = {
  missing: MissingLimit[];
  monthLabel: string;
  mainCurrency: string;
  /** Opens Add limit preset to the category and its expected recurring. */
  onCreate: (missing: MissingLimit) => void;
  /** Hides the banner in this month only. */
  onDismiss: (missing: MissingLimit) => void;
  disabled?: boolean;
};

/** A banner per recurring transaction due in a planned month on a category without a limit of its own. */
export const PlanMissingLimitBanners = ({
  missing,
  monthLabel,
  mainCurrency,
  onCreate,
  onDismiss,
  disabled,
}: PlanMissingLimitBannersProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();

  if (missing.length === 0) return null;
  return (
    <div className={styles.root}>
      {missing.map((item) => {
        const { payee, id } = item.planRecurring.recurring;
        const category = item.subcategory
          ? t("budget.planner.categoryPath", { category: item.category.name, subcategory: item.subcategory.name })
          : item.category.name;
        return (
          <Alert key={id} className={styles.banner}>
            <Repeat aria-hidden="true" />
            <AlertTitle>{t("budget.planner.banner.title", { payee, month: monthLabel })}</AlertTitle>
            <AlertDescription>
              {t("budget.planner.banner.description", {
                amount: format(item.planRecurring.expected, mainCurrency),
                category,
              })}
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  aria-label={t("budget.planner.banner.createFor", { payee })}
                  onClick={() => onCreate(item)}
                >
                  {t("budget.planner.banner.create")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  aria-label={t("budget.planner.banner.dismissFor", { payee })}
                  onClick={() => onDismiss(item)}
                >
                  {t("budget.planner.banner.dismiss")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};
