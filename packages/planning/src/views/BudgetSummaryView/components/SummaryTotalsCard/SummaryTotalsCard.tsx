import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Card, CardHeader, CardTitle } from "@flaner/ui-components";
import { ArrowDownRight, ArrowUpRight, Equal, type LucideIcon } from "lucide-react";
import { signedAmount, type MonthTotals } from "../../../../utils/monthLedger";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { summaryTotalsCardStyles as styles } from "./SummaryTotalsCard.styles";

type Direction = "up" | "down" | "same";

const ARROWS: Record<Direction, LucideIcon> = { up: ArrowUpRight, down: ArrowDownRight, same: Equal };

const directionOf = (change: number): Direction => (change > 0 ? "up" : change < 0 ? "down" : "same");

type TotalRow = { key: keyof MonthTotals; value: number; change: number; className?: string };

export type SummaryTotalsCardProps = {
  totals: MonthTotals;
  /** `totals` minus the previous month's. */
  change: MonthTotals;
  /** The previous month's name, e.g. "October". */
  previousMonthLabel: string;
  mainCurrency: string;
};

/** Income, expenses and balance of the month, each with its change against the previous month (arrow + amount). */
export const SummaryTotalsCard = ({ totals, change, previousMonthLabel, mainCurrency }: SummaryTotalsCardProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const rows: TotalRow[] = [
    { key: "income", value: totals.income, change: change.income, className: styles.income },
    { key: "expenses", value: signedAmount("expense", totals.expenses), change: change.expenses },
    { key: "balance", value: totals.balance, change: change.balance },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budget.summary.totals.title")}</CardTitle>
      </CardHeader>
      <dl className={styles.list}>
        {rows.map((row) => {
          const direction = directionOf(row.change);
          const Arrow = ARROWS[direction];
          return (
            <div key={row.key} className={styles.row}>
              <dt className={styles.label}>{t(`budget.summary.totals.${row.key}`)}</dt>
              <dd className={cn(styles.value, row.className)}>{format(row.value, mainCurrency)}</dd>
              <dd className={styles.change}>
                <Arrow aria-hidden="true" />
                {t(`budget.summary.totals.${direction}`, {
                  amount: format(Math.abs(row.change), mainCurrency),
                  month: previousMonthLabel,
                })}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
};
