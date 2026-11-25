import { useMoneyFormatter } from "@flaner/shared/hooks";
import { BarChart, ChartContainer, type BarChartGroup, type BarChartSeries } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import type { BudgetMonth } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { MonthlyTotals } from "../../../../utils/budgetSummary";
import { summaryBarsCardStyles as styles } from "./SummaryBarsCard.styles";

export type SummaryBarsCardProps = {
  /** Oldest first, ending on `month`. */
  months: MonthlyTotals[];
  month: BudgetMonth;
  monthLabel: string;
  mainCurrency: string;
};

/** Income vs expenses for the 12 months ending on the chosen month, the chosen month highlighted. */
export const SummaryBarsCard = ({ months, month, monthLabel, mainCurrency }: SummaryBarsCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const shortMonth = new Intl.DateTimeFormat(i18n.language, { month: "short" });
  const series: BarChartSeries[] = [
    { id: "income", label: t("budget.summary.bars.income"), color: 2 },
    { id: "expenses", label: t("budget.summary.bars.expenses"), color: 1 },
  ];
  const groups: BarChartGroup[] = months.map(({ month: barMonth, totals }) => ({
    id: barMonth,
    label: shortMonth.format(parseISO(`${barMonth}-01`)),
    values: { income: totals.income, expenses: totals.expenses },
  }));
  const chosen = months.find((row) => row.month === month)?.totals;

  return (
    <ChartContainer
      title={t("budget.summary.bars.title")}
      description={
        chosen &&
        t("budget.summary.bars.description", {
          month: monthLabel,
          income: format(chosen.income, mainCurrency),
          expenses: format(chosen.expenses, mainCurrency),
        })
      }
      legend={series}
      bodyClassName={styles.body}
    >
      <BarChart
        label={t("budget.summary.bars.chartLabel", { month: monthLabel })}
        groups={groups}
        series={series}
        formatValue={(value) => format(value, mainCurrency)}
        highlightedId={month}
      />
    </ChartContainer>
  );
};
