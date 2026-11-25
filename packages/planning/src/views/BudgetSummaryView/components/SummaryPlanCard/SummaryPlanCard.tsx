import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Badge, buttonVariants, Card, CardFooter, CardHeader, CardTitle, PlanProgressBar } from "@flaner/ui-components";
import { TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { PlanProgress } from "../../../../utils/budgetSummary";
import { summaryPlanCardStyles as styles } from "./SummaryPlanCard.styles";

export type SummaryPlanCardProps = {
  progress: PlanProgress;
  mainCurrency: string;
  plannerHref: string;
};

/** Spent of the sum of limits, days left, exceeded limits and Outside the plan, with Open Planner. */
export const SummaryPlanCard = ({ progress, mainCurrency, plannerHref }: SummaryPlanCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const spentOfLimit = t("budget.summary.plan.spentOfLimit", {
    spent: format(progress.spent, mainCurrency),
    limit: format(progress.limit, mainCurrency),
  });
  const [firstExceeded] = progress.exceeded;

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
      <div className={styles.facts}>
        <span>
          {progress.daysLeft > 0
            ? t("budget.summary.plan.daysLeft", { count: progress.daysLeft })
            : t("budget.summary.plan.monthEnded")}
        </span>
        {firstExceeded && (
          <Badge variant="danger" shape="tag" className={styles.exceeded}>
            <TriangleAlert aria-hidden="true" />
            {t("budget.summary.plan.exceeded", {
              count: progress.exceeded.length,
              more: progress.exceeded.length - 1,
              name: firstExceeded.subcategory
                ? `${firstExceeded.category.name} / ${firstExceeded.subcategory.name}`
                : firstExceeded.category.name,
            })}
          </Badge>
        )}
        <span>{t("budget.summary.plan.outside", { amount: format(progress.outsideSpent, mainCurrency) })}</span>
      </div>
      <CardFooter>
        <Link to={plannerHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("budget.summary.plan.openPlanner")}
        </Link>
      </CardFooter>
    </Card>
  );
};
