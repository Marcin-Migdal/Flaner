import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { MonthTotals } from "../../../../utils/monthLedger";
import { budgetMonthTotalsStyles as styles } from "./BudgetMonthTotals.styles";

export type BudgetMonthTotalsProps = { totals: MonthTotals; mainCurrency: string };

/** The month's income, expenses and balance (month ledger totals). */
export const BudgetMonthTotals = ({ totals, mainCurrency }: BudgetMonthTotalsProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const items = [
    { key: "income", value: totals.income, className: styles.income },
    { key: "expenses", value: -totals.expenses, className: undefined },
    { key: "balance", value: totals.balance, className: undefined },
  ] as const;

  return (
    <dl className={styles.root}>
      {items.map((item) => (
        <div key={item.key} className={styles.item}>
          <dt className={styles.label}>{t(`budget.monthTotals.${item.key}`)}</dt>
          <dd className={cn(styles.value, item.className)}>{format(item.value, mainCurrency)}</dd>
        </div>
      ))}
    </dl>
  );
};
