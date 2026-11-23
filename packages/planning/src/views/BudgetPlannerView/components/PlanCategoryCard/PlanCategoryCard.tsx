import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Badge, PlanProgressBar } from "@flaner/ui-components";
import type { BudgetCategoryType } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import type { PlanCard } from "../../../../utils/monthLedger";
import { PlanAmountField } from "../PlanAmountField";
import { planCategoryCardStyles as styles } from "./PlanCategoryCard.styles";

export type PlanCategoryCardProps = {
  card: PlanCard;
  type: BudgetCategoryType;
  mainCurrency: string;
  /** Sets (`amount`) or removes (`null`) the target of a category or subcategory. */
  onAmountChange: (categoryId: string, amount: number | null) => void;
  /** Opens the details sheet of a category or subcategory. */
  onOpen: (categoryId: string) => void;
  disabled?: boolean;
};

/**
 * One category of the plan: Spent → Limit with a bar in the category colour (danger when over), its subcategory lines
 * with a thin bar and an inline field. For income: Received → Planned income with a "Short of plan" tag.
 */
export const PlanCategoryCard = ({ card, type, mainCurrency, onAmountChange, onOpen, disabled }: PlanCategoryCardProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const { category } = card;
  const Icon = BUDGET_CATEGORY_ICON_COMPONENTS[category.icon];
  const isExpense = type === "expense";
  const spentLabel = t(isExpense ? "budget.planner.stats.spent" : "budget.planner.stats.received");
  const targetLabel = t(isExpense ? "budget.planner.stats.limit" : "budget.planner.stats.plannedIncome");
  const fieldLabel = (name: string) =>
    t(isExpense ? "budget.planner.limitFor" : "budget.planner.plannedIncomeFor", { name });
  const valueText = (value: number, max: number) =>
    t("budget.planner.valueText", { value: format(value, mainCurrency), max: format(max, mainCurrency) });
  const shortOfPlan = (spent: number, target: number) =>
    !isExpense && target > spent ? (
      <Badge variant="warning" shape="tag" className={styles.tag}>
        {t("budget.planner.shortOfPlan", { amount: format(target - spent, mainCurrency) })}
      </Badge>
    ) : null;

  return (
    <section className={styles.root} aria-label={category.name}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.nameButton}
          aria-label={t("budget.planner.openDetails", { name: category.name })}
          onClick={() => onOpen(category.id)}
        >
          <span className={cn(styles.tile, BUDGET_CATEGORY_COLOR_CLASSES[category.color])}>
            <Icon aria-hidden="true" />
          </span>
          <span className={styles.name}>{category.name}</span>
        </button>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{spentLabel}</span>
            <span className={cn(styles.statValue, isExpense && card.spent > card.limit && styles.over)}>
              {format(card.spent, mainCurrency)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel} aria-hidden="true">
              {targetLabel}
            </span>
            <PlanAmountField
              value={card.target}
              // A card without its own target shows what its lines add up to
              placeholder={card.target === null ? format(card.limit, mainCurrency) : undefined}
              label={fieldLabel(category.name)}
              disabled={disabled}
              onCommit={(amount) => onAmountChange(category.id, amount)}
            />
          </div>
        </div>
      </div>
      <PlanProgressBar
        value={card.spent}
        max={card.limit}
        color={category.color}
        overTone={isExpense ? "danger" : "none"}
        label={category.name}
        valueText={valueText(card.spent, card.limit)}
      />
      {card.target !== null && shortOfPlan(card.spent, card.target)}

      {card.lines.length > 0 && (
        <ul className={styles.lines}>
          {card.lines.map((line) => (
            <li key={line.subcategory.id} className={styles.line}>
              <div className={styles.lineHeader}>
                <button
                  type="button"
                  className={styles.lineButton}
                  aria-label={t("budget.planner.openDetails", { name: line.subcategory.name })}
                  onClick={() => onOpen(line.subcategory.id)}
                >
                  <span className={styles.subName}>{line.subcategory.name}</span>
                </button>
                <span className={cn(styles.lineSpent, isExpense && line.spent > line.target && styles.over)}>
                  {format(line.spent, mainCurrency)}
                </span>
                <PlanAmountField
                  value={line.target}
                  label={fieldLabel(line.subcategory.name)}
                  disabled={disabled}
                  onCommit={(amount) => onAmountChange(line.subcategory.id, amount)}
                />
              </div>
              <PlanProgressBar
                size="sm"
                value={line.spent}
                max={line.target}
                color={category.color}
                overTone={isExpense ? "danger" : "none"}
                label={line.subcategory.name}
                valueText={valueText(line.spent, line.target)}
              />
              {shortOfPlan(line.spent, line.target)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
