import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Badge, Button, buttonVariants } from "@flaner/ui-components";
import { CircleHelp, Plus } from "lucide-react";
import { Link } from "react-router";
import type { BudgetCategoryType } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import type { OutsideRow } from "../../../../utils/plannerMonth";
import { planOutsideListStyles as styles } from "./PlanOutsideList.styles";

export type PlanOutsideListProps = {
  rows: OutsideRow[];
  type: BudgetCategoryType;
  mainCurrency: string;
  /** Where Uncategorized is reviewed (the month in Transactions). */
  transactionsHref: string;
  /** Add limit / planned income, preset to the row's category and its amount so far. */
  onAdd: (row: OutsideRow & { id: string }) => void;
  onOpen: (categoryId: string) => void;
  disabled?: boolean;
};

const hasCategory = (row: OutsideRow): row is OutsideRow & { id: string } => row.id !== null;

/** Spending (or income) without a target of its own, each with Add limit; Uncategorized links to Transactions. */
export const PlanOutsideList = ({
  rows,
  type,
  mainCurrency,
  transactionsHref,
  onAdd,
  onOpen,
  disabled,
}: PlanOutsideListProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const isExpense = type === "expense";

  return (
    <ul className={styles.root} aria-label={isExpense ? t("budget.planner.sections.outside") : undefined}>
      {rows.map((row) => {
        if (!hasCategory(row) || !row.category) {
          return (
            <li key="uncategorized" className={styles.row}>
              <span className={styles.name}>
                <span className={cn(styles.tile, styles.uncategorizedTile)}>
                  <CircleHelp aria-hidden="true" />
                </span>
                <span className={styles.label}>{t("budget.planner.uncategorized")}</span>
              </span>
              <span className={styles.spent}>{format(row.spent, mainCurrency)}</span>
              {/* Not `Button asChild`: Slot needs a single child and Button adds its busy spinner slot */}
              <Link to={transactionsHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {t("budget.planner.reviewInTransactions")}
              </Link>
            </li>
          );
        }

        const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[row.category.icon];
        const name = row.subcategory?.name ?? row.category.name;
        return (
          <li key={row.id} className={styles.row}>
            <button
              type="button"
              className={styles.nameButton}
              aria-label={t("budget.planner.openDetails", { name })}
              onClick={() => onOpen(row.id)}
            >
              <span className={cn(styles.tile, BUDGET_CATEGORY_COLOR_CLASSES[row.category.color])}>
                <Icon aria-hidden="true" />
              </span>
              <span className={styles.label}>
                {row.subcategory && <span className={styles.parent}>{row.category.name} / </span>}
                {name}
              </span>
            </button>
            {!isExpense && (
              <Badge variant="neutral" shape="tag" size="sm">
                {t("budget.planner.outsideTag")}
              </Badge>
            )}
            <span className={styles.spent}>{format(row.spent, mainCurrency)}</span>
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => onAdd(row)}>
              <Plus aria-hidden="true" />
              {t(isExpense ? "budget.planner.addLimit" : "budget.planner.addPlannedIncome")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
};
