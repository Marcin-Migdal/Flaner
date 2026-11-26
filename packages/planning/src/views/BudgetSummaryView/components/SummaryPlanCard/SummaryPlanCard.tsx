import { useMoneyFormatter } from "@flaner/shared/hooks";
import { buttonVariants, Card, CardFooter, CardHeader, CardTitle, PlanProgressBar } from "@flaner/ui-components";
import { TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { LimitProgress, PlanProgress } from "../../../../utils/budgetSummary";
import { summaryPlanCardStyles as styles } from "./SummaryPlanCard.styles";

export type SummaryPlanCardProps = {
  progress: PlanProgress;
  mainCurrency: string;
  plannerHref: string;
};

/**
 * The month's expenses against the sum of limits (as the Planner header), then each limit's spent of its limit with
 * exceeded ones flagged by an icon and "Over by …" (never colour alone); days left and Open Planner.
 */
export const SummaryPlanCard = ({ progress, mainCurrency, plannerHref }: SummaryPlanCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const spentOf = (spent: number, limit: number) =>
    t("budget.summary.plan.spentOfLimit", { spent: format(spent, mainCurrency), limit: format(limit, mainCurrency) });
  const spentOfLimit = spentOf(progress.spent, progress.limit);
  const nameOf = ({ category, subcategory }: LimitProgress) =>
    subcategory
      ? t("budget.summary.plan.subcategoryName", { category: category.name, subcategory: subcategory.name })
      : category.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budget.summary.plan.title")}</CardTitle>
      </CardHeader>
      {progress.limit > 0 ? (
        <>
          <div className={styles.amounts}>
            <span className={styles.value}>{spentOfLimit}</span>
            <span className={styles.percent}>{percent.format(progress.spent / progress.limit)}</span>
          </div>
          <PlanProgressBar
            value={progress.spent}
            max={progress.limit}
            color={1}
            label={t("budget.summary.plan.progressLabel")}
            valueText={spentOfLimit}
          />
        </>
      ) : (
        <p className={styles.empty}>{t("budget.summary.plan.noLimits")}</p>
      )}
      <p className={styles.days}>
        {progress.daysLeft > 0
          ? t("budget.summary.plan.daysLeft", { count: progress.daysLeft })
          : t("budget.summary.plan.monthEnded")}
      </p>
      {progress.limits.length > 0 && (
        <ul className={styles.limits} aria-label={t("budget.summary.plan.limitsLabel")}>
          {progress.limits.map((limit) => {
            const name = nameOf(limit);
            const value = spentOf(limit.spent, limit.limit);
            return (
              <li key={limit.id} className={styles.limit}>
                <div className={styles.limitHeader}>
                  <span className={styles.limitName}>{name}</span>
                  <span className={styles.limitValue}>{value}</span>
                </div>
                <PlanProgressBar
                  value={limit.spent}
                  max={limit.limit}
                  color={limit.category.color}
                  size="sm"
                  label={name}
                  valueText={value}
                />
                {limit.exceeded && (
                  <span className={styles.over}>
                    <TriangleAlert aria-hidden="true" />
                    {t("budget.summary.plan.over", { amount: format(limit.spent - limit.limit, mainCurrency) })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <CardFooter>
        <Link to={plannerHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("budget.summary.plan.openPlanner")}
        </Link>
      </CardFooter>
    </Card>
  );
};
