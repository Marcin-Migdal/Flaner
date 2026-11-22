import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Button } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { CircleHelp, Trash2 } from "lucide-react";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../utils/budgetCategoryIcons";
import { resolveTransactionCategory, type LedgerDay } from "../../utils/monthLedger";
import { budgetTransactionListStyles as styles } from "./BudgetTransactionList.styles";

export type BudgetTransactionListProps = {
  /** Rows grouped by day, newest first (`buildMonthLedger(...).days`). */
  days: LedgerDay[];
  categories: BudgetCategoryTree;
  accounts: BudgetAccount[];
  mainCurrency: string;
  /** Shows a Delete action on every row. */
  onDelete?: (transaction: BudgetTransaction) => void;
  /** Disables the row actions (e.g. offline). */
  actionsDisabled?: boolean;
};

const signedAmount = (type: BudgetTransaction["type"], amount: number) => (type === "income" ? amount : -amount);

/** The Budget's transaction rows grouped by day, each day with its net. Shared by Transactions and the import preview. */
export const BudgetTransactionList = ({
  days,
  categories,
  accounts,
  mainCurrency,
  onDelete,
  actionsDisabled,
}: BudgetTransactionListProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" });
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const showAccount = accounts.length > 1;

  return (
    <div className={styles.root}>
      {days.map((day) => (
        <section key={day.date} className={styles.day} aria-label={dayFormat.format(parseISO(day.date))}>
          <header className={styles.dayHeader}>
            <h3 className={styles.dayDate}>{dayFormat.format(parseISO(day.date))}</h3>
            <span className={styles.dayNet}>{format(day.net, mainCurrency)}</span>
          </header>

          <ul className={styles.rows}>
            {day.transactions.map((transaction) => {
              const resolved = resolveTransactionCategory(categories, transaction);
              const Icon = resolved ? BUDGET_CATEGORY_ICON_COMPONENTS[resolved.category.icon] : CircleHelp;
              const categoryName = resolved
                ? (resolved.subcategory?.name ?? resolved.category.name)
                : t("budget.transactionList.uncategorized");
              const meta = [
                categoryName,
                showAccount ? accountNames.get(transaction.accountId) : null,
                transaction.description || null,
              ].filter(Boolean);
              const isIncome = transaction.type === "income";

              return (
                <li key={transaction.id} className={styles.row}>
                  <span className={styles.icon}>
                    <Icon
                      aria-hidden="true"
                      className={
                        resolved ? BUDGET_CATEGORY_COLOR_CLASSES[resolved.category.color] : styles.uncategorizedIcon
                      }
                    />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.payee}>{transaction.payee}</span>
                    <span className={styles.meta}>{meta.join(" · ")}</span>
                  </span>
                  <span className={styles.amounts}>
                    <span className={cn(styles.amount, isIncome && styles.income)}>
                      {format(signedAmount(transaction.type, transaction.amount), transaction.currency)}
                    </span>
                    {transaction.currency !== mainCurrency && (
                      <span className={styles.amountMain}>
                        {format(signedAmount(transaction.type, transaction.amountMain), mainCurrency)}
                      </span>
                    )}
                  </span>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.deleteButton}
                      disabled={actionsDisabled}
                      aria-label={t("budget.transactionList.delete", { payee: transaction.payee })}
                      onClick={() => onDelete(transaction)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
