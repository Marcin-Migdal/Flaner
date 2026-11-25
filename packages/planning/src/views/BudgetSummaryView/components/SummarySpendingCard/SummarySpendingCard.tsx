import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import {
  ChartContainer,
  DonutChart,
  RankedList,
  type DonutChartSegment,
  type RankedListItem,
} from "@flaner/ui-components";
import { CircleEllipsis, CircleHelp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { BudgetMonth, ChartColorIndex } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import type { SpendingBreakdown, SpendingCategory } from "../../../../utils/budgetSummary";
import { transactionsHref } from "../../summaryHrefs";
import { summarySpendingCardStyles as styles } from "./SummarySpendingCard.styles";

const OTHERS_ID = "others";

export type SummarySpendingCardProps = {
  breakdown: SpendingBreakdown;
  month: BudgetMonth;
  monthLabel: string;
  mainCurrency: string;
};

const PALETTE: ChartColorIndex[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** A subcategory's colour: steps from its category's colour through the palette. */
const stepColor = (color: ChartColorIndex, step: number): ChartColorIndex =>
  PALETTE[(color - 1 + step) % PALETTE.length] ?? color;

/**
 * Spending by category: the donut (top 7 + Others) next to its ranked list. A category (slice or row) drills into its
 * subcategories; a subcategory, a category without any, Uncategorized or Others opens its transactions.
 */
export const SummarySpendingCard = ({ breakdown, month, monthLabel, mainCurrency }: SummarySpendingCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const navigate = useNavigate();
  const [drilledId, setDrilledId] = useState<string | null>(null);
  const formatValue = (value: number) => format(value, mainCurrency);

  // Segment id → the category filter its transactions open with
  const targets = new Map<string, string[]>();
  const labelOf = (item: SpendingCategory) => item.category?.name ?? t("budget.summary.spending.uncategorized");

  const segments: DonutChartSegment[] = breakdown.top.map((item) => {
    targets.set(item.id, [item.id]);
    const { category } = item;
    const drillable = item.parts.some((part) => part.subcategory);
    return {
      id: item.id,
      label: labelOf(item),
      value: item.amount,
      color: category?.color ?? "muted",
      children:
        category && drillable
          ? item.parts.map((part, index) => {
              // The category's own spending gets an id of its own, apart from the parent slice
              const id = part.subcategory ? part.id : `${part.id}:self`;
              targets.set(id, [part.id]);
              return {
                id,
                label: part.subcategory?.name ?? t("budget.summary.spending.onCategory", { name: category.name }),
                value: part.amount,
                color: stepColor(category.color, index),
              };
            })
          : undefined,
    };
  });
  if (breakdown.others.length > 0) {
    targets.set(
      OTHERS_ID,
      breakdown.others.map((item) => item.id),
    );
    segments.push({
      id: OTHERS_ID,
      label: t("budget.summary.spending.others"),
      value: breakdown.othersAmount,
      color: "muted",
    });
  }

  const drilled = segments.find((segment) => segment.id === drilledId && segment.children);
  const openTransactions = (id: string) => {
    const categoryIds = targets.get(id);
    if (categoryIds) void navigate(transactionsHref(month, { direction: "expense", categoryIds }));
  };
  const select = (id: string) => {
    const segment = segments.find((candidate) => candidate.id === id);
    if (!drilled && segment?.children) setDrilledId(id);
    else openTransactions(id);
  };

  const categoryIcon = (id: string) => {
    const item = breakdown.top.find((candidate) => candidate.id === id);
    if (!item?.category) {
      // Others and Uncategorized: a dashed tile
      const Icon = id === OTHERS_ID ? CircleEllipsis : CircleHelp;
      return (
        <span className={cn(styles.tile, styles.uncategorizedTile)}>
          <Icon aria-hidden="true" />
        </span>
      );
    }
    const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[item.category.icon];
    return (
      <span className={cn(styles.tile, BUDGET_CATEGORY_COLOR_CLASSES[item.category.color])}>
        <Icon aria-hidden="true" />
      </span>
    );
  };

  const listItems: RankedListItem[] = drilled?.children
    ? drilled.children.map(({ id, label, value, color }) => ({ id, label, value, color }))
    : segments.map(({ id, label, value, color }) => ({
        id,
        label:
          id === OTHERS_ID
            ? t("budget.summary.spending.othersOf", {
                names: new Intl.ListFormat(i18n.language, { type: "unit" }).format(breakdown.others.map(labelOf)),
              })
            : label,
        value,
        color,
        icon: categoryIcon(id),
      }));

  return (
    <ChartContainer
      title={t("budget.summary.spending.title")}
      description={
        drilled
          ? t("budget.summary.spending.drilledDescription", { month: monthLabel, category: drilled.label })
          : monthLabel
      }
    >
      {segments.length === 0 ? (
        <p className={styles.empty}>{t("budget.summary.spending.empty")}</p>
      ) : (
        <div className={styles.body}>
          <DonutChart
            className={styles.donut}
            label={t("budget.summary.spending.chartLabel", { month: monthLabel })}
            segments={segments}
            formatValue={formatValue}
            drilledId={drilled?.id ?? null}
            onDrillChange={setDrilledId}
            onSegmentSelect={(segment) => openTransactions(segment.id)}
            totalLabel={t("budget.summary.spending.spent")}
            backLabel={t("budget.summary.spending.allCategories")}
          />
          <RankedList
            label={drilled ? drilled.label : t("budget.summary.spending.listLabel")}
            items={listItems}
            formatValue={formatValue}
            onSelect={select}
          />
        </div>
      )}
    </ChartContainer>
  );
};
