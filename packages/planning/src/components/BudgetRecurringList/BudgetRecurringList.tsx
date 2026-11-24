import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Badge, Button } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { ChevronDown, CircleHelp, CircleStop, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  BUDGET_CATEGORY_TYPES,
  type BudgetAccount,
  type BudgetCategoryTree,
  type BudgetRecurring,
} from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { useRepeatRuleText } from "../../hooks/useRepeatRuleText";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../utils/budgetCategoryIcons";
import { monthOfDate, resolveTransactionCategory, signedAmount } from "../../utils/monthLedger";
import {
  expectedAmount,
  monthAmountMain,
  monthStatus,
  nextDueDate,
  recurringOccurrences,
  type OccurrenceStatus,
} from "../../utils/recurringTransactions";
import { shiftDay, todayDay } from "../../utils/repeatRules";
import { budgetRecurringListStyles as styles } from "./BudgetRecurringList.styles";

/** How far back an expanded row lists occurrences. */
const HISTORY_DAYS = 365;

const STATUS_BADGES: Record<OccurrenceStatus, "success" | "info" | "warning"> = {
  paid: "success",
  upcoming: "info",
  overdue: "warning",
};

export type BudgetRecurringListProps = {
  recurring: BudgetRecurring[];
  categories: BudgetCategoryTree;
  accounts: BudgetAccount[];
  mainCurrency: string;
  onEditRule?: (recurring: BudgetRecurring) => void;
  onStop?: (recurring: BudgetRecurring) => void;
  onDelete?: (recurring: BudgetRecurring) => void;
  /** Disables the actions (e.g. offline). */
  actionsDisabled?: boolean;
  /** `YYYY-MM-DD`; today by default (statuses and the monthly sum are for its month). */
  today?: string;
};

/** The Recurring tab: recurring transactions grouped Expenses / Income with this month's sum and status. */
export const BudgetRecurringList = ({
  recurring,
  categories,
  accounts,
  mainCurrency,
  onEditRule,
  onStop,
  onDelete,
  actionsDisabled,
  today = todayDay(),
}: BudgetRecurringListProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format: formatMoney } = useMoneyFormatter();
  const describeRule = useRepeatRuleText();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const month = monthOfDate(today);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short", year: "numeric" });
  const formatDay = (day: string) => dateFormat.format(parseISO(day));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const showAccount = accounts.length > 1;

  const statusBadge = (status: OccurrenceStatus | null) =>
    status && (
      <Badge variant={STATUS_BADGES[status]} size="sm">
        {t(`budget.recurring.status.${status}`)}
      </Badge>
    );

  const renderRow = (item: BudgetRecurring) => {
    const resolved = resolveTransactionCategory(categories, item);
    const Icon = resolved ? BUDGET_CATEGORY_ICON_COMPONENTS[resolved.category.icon] : CircleHelp;
    const categoryName = resolved
      ? (resolved.subcategory?.name ?? resolved.category.name)
      : t("budget.transactionList.uncategorized");
    const nextDue = nextDueDate(item, today);
    const nextText = nextDue ? t("budget.recurring.next", { date: formatDay(nextDue) }) : t("budget.recurring.ended");
    const expected = expectedAmount(item);
    const expanded = expandedId === item.id;
    const detailsId = `recurring-${item.id}`;

    return (
      <li key={item.id}>
        <button
          type="button"
          className={styles.summary}
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpandedId(expanded ? null : item.id)}
        >
          <span className={styles.icon}>
            <Icon
              aria-hidden="true"
              className={resolved ? BUDGET_CATEGORY_COLOR_CLASSES[resolved.category.color] : styles.uncategorizedIcon}
            />
          </span>
          <span className={styles.body}>
            <span className={styles.payee}>{item.payee}</span>
            <span className={styles.meta}>
              {[categoryName, describeRule(item.rule), showAccount ? accountNames.get(item.accountId) : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className={styles.nextMobile}>{nextText}</span>
          </span>
          <span className={styles.next}>{nextText}</span>
          <span className={styles.amounts}>
            <span className={cn(styles.amount, item.type === "income" && styles.income)}>
              {formatMoney(signedAmount(item.type, expected.amount), item.currency)}
            </span>
            {statusBadge(monthStatus(item, month, today))}
          </span>
          <ChevronDown aria-hidden="true" className={cn(styles.chevron, expanded && styles.chevronOpen)} />
        </button>

        {expanded && (
          <div id={detailsId} className={styles.details}>
            <p className={styles.occurrencesTitle}>{t("budget.recurring.occurrences")}</p>
            <ul className={styles.occurrences}>
              {recurringOccurrences(item, { from: shiftDay(today, -HISTORY_DAYS), to: nextDue ?? today }, today).map(
                ({ dueDate, status, match }) => (
                  <li key={dueDate} className={styles.occurrence}>
                    <span className={styles.occurrenceDate}>{formatDay(dueDate)}</span>
                    {match && (
                      <span className={styles.occurrenceMatch}>
                        {t("budget.recurring.matched", {
                          amount: formatMoney(signedAmount(item.type, match.amount), item.currency),
                          date: formatDay(match.date),
                        })}
                      </span>
                    )}
                    {statusBadge(status)}
                  </li>
                ),
              )}
            </ul>
            <div className={styles.actions}>
              {onEditRule && (
                <Button type="button" variant="outline" size="sm" disabled={actionsDisabled} onClick={() => onEditRule(item)}>
                  <Pencil aria-hidden="true" />
                  {t("budget.recurring.editRule")}
                </Button>
              )}
              {onStop && nextDue && (
                <Button type="button" variant="outline" size="sm" disabled={actionsDisabled} onClick={() => onStop(item)}>
                  <CircleStop aria-hidden="true" />
                  {t("budget.recurring.stop")}
                </Button>
              )}
              {onDelete && (
                <Button type="button" variant="destructive" size="sm" disabled={actionsDisabled} onClick={() => onDelete(item)}>
                  <Trash2 aria-hidden="true" />
                  {t("budget.recurring.delete")}
                </Button>
              )}
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={styles.root}>
      {BUDGET_CATEGORY_TYPES.map((type) => {
        const group = recurring.filter((item) => item.type === type);
        if (group.length === 0) return null;
        const sum = group.reduce((total, item) => total + monthAmountMain(item, month, today), 0);
        return (
          <section key={type} className={styles.group} aria-label={t(`budget.recurring.groups.${type}`)}>
            <header className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>{t(`budget.recurring.groups.${type}`)}</h3>
              <span className={styles.groupSum}>
                {t("budget.recurring.monthlySum", { amount: formatMoney(signedAmount(type, sum), mainCurrency) })}
              </span>
            </header>
            <ul className={styles.rows}>{group.map(renderRow)}</ul>
          </section>
        );
      })}
    </div>
  );
};
