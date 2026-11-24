import { useMoneyFormatter } from "@flaner/shared/hooks";
import { PlanProgressBar } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { PlannerMonth } from "../../../../utils/plannerMonth";
import { plannerMonthHeaderStyles as styles } from "./PlannerMonthHeader.styles";

export type PlannerMonthHeaderProps = { planner: PlannerMonth; mainCurrency: string };

/** The month at a glance: expenses Spent → Limit, income Received → Planned income, actual vs planned balance. */
export const PlannerMonthHeader = ({ planner, mainCurrency }: PlannerMonthHeaderProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const { expenses, income, totals, plannedBalance } = planner;
  const spentOfLimit = t("budget.planner.monthHeader.spentOfLimit", {
    spent: format(expenses.spent, mainCurrency),
    limit: format(expenses.planned, mainCurrency),
  });
  const receivedOfPlanned = t("budget.planner.monthHeader.receivedOfPlanned", {
    received: format(income.spent, mainCurrency),
    planned: format(income.planned, mainCurrency),
  });

  return (
    <section className={styles.root} aria-label={t("nav.budgetPlanner")}>
      <div className={styles.item}>
        <span className={styles.label}>{t("budget.planner.monthHeader.expenses")}</span>
        <span className={styles.value}>{spentOfLimit}</span>
        <PlanProgressBar
          value={expenses.spent}
          max={expenses.planned}
          color={1}
          label={t("budget.planner.monthHeader.expenses")}
          valueText={spentOfLimit}
        />
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{t("budget.planner.monthHeader.income")}</span>
        <span className={styles.value}>{receivedOfPlanned}</span>
        <PlanProgressBar
          value={income.spent}
          max={income.planned}
          color={3}
          overTone="none"
          label={t("budget.planner.monthHeader.income")}
          valueText={receivedOfPlanned}
        />
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{t("budget.planner.monthHeader.balance")}</span>
        <dl className={styles.balance}>
          <dt className={styles.muted}>{t("budget.planner.monthHeader.actual")}</dt>
          <dd className={styles.balanceValue}>{format(totals.balance, mainCurrency)}</dd>
          <dt className={styles.muted}>{t("budget.planner.monthHeader.planned")}</dt>
          <dd className={styles.balanceValue}>{format(plannedBalance, mainCurrency)}</dd>
        </dl>
      </div>
    </section>
  );
};
