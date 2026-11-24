import { useMoneyFormatter } from "@flaner/shared/hooks";
import { parseISO } from "date-fns";
import { useRef, useState, type ReactNode } from "react";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction, BudgetTransactionPatch } from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import type { LedgerDay } from "../../utils/monthLedger";
import { TransactionRow, type SelectMode } from "./components/TransactionRow";
import { budgetTransactionListStyles as styles } from "./BudgetTransactionList.styles";

export type BudgetTransactionListProps = {
  /** Rows grouped by day, newest first (`groupTransactionsByDay` / `buildMonthLedger(...).days`). */
  days: LedgerDay[];
  categories: BudgetCategoryTree;
  accounts: BudgetAccount[];
  mainCurrency: string;
  /** Delete action in the expanded row. */
  onDelete?: (transaction: BudgetTransaction) => void;
  /** Disables the row actions and inline edits (e.g. offline). */
  actionsDisabled?: boolean;
  /**
   * Saves an inline edit: on desktop payee, title and amount are fields in the row; on both the category picker
   * changes and confirms the category. Without it rows are read-only.
   */
  onUpdate?: (transaction: BudgetTransaction, patch: BudgetTransactionPatch) => void;
  /** Edit action in the expanded row (every field). */
  onEdit?: (transaction: BudgetTransaction) => void;
  /**
   * Selected transaction ids. With `onSelectionChange`, rows are selected by Ctrl / ⌘ + click (toggle),
   * Shift + click (range from the last toggled row) or a long-press on the phone; once any row is selected,
   * rows show a checkbox and a tap on the phone toggles the row.
   */
  selectedIds?: ReadonlySet<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Rows expand (chevron on desktop, tap on the phone) into their details and actions. */
  expandable?: boolean;
  /** Content before a row's icon (e.g. the import preview's checkbox). */
  renderRowStart?: (transaction: BudgetTransaction) => ReactNode;
  /** Content after a row's amounts (e.g. the import preview's status and edit action). */
  renderRowEnd?: (transaction: BudgetTransaction) => ReactNode;
  /** A second line under a row, full width (e.g. the import preview's status on narrow screens). */
  renderRowFooter?: (transaction: BudgetTransaction) => ReactNode;
  /** Greys a row out (e.g. a pending card hold in the import preview). */
  isRowMuted?: (transaction: BudgetTransaction) => boolean;
};

/** The Budget's transaction rows grouped by day, each day with its net. Shared by Transactions and the import preview. */
export const BudgetTransactionList = ({
  days,
  categories,
  accounts,
  mainCurrency,
  onDelete,
  actionsDisabled,
  onUpdate,
  onEdit,
  selectedIds,
  onSelectionChange,
  expandable = false,
  renderRowStart,
  renderRowEnd,
  renderRowFooter,
  isRowMuted,
}: BudgetTransactionListProps) => {
  const { i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectionAnchor = useRef<string | null>(null);

  const dayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" });
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const showAccount = accounts.length > 1;
  const selectable = !!selectedIds && !!onSelectionChange;
  const selectionMode = selectable && selectedIds.size > 0;

  const select = (id: string, mode: SelectMode) => {
    if (!selectedIds || !onSelectionChange) return;
    const next = new Set(selectedIds);
    const order = days.flatMap((day) => day.transactions.map((transaction) => transaction.id));
    const anchor = selectionAnchor.current ? order.indexOf(selectionAnchor.current) : -1;

    if (mode === "range" && anchor !== -1) {
      const target = order.indexOf(id);
      order.slice(Math.min(anchor, target), Math.max(anchor, target) + 1).forEach((rowId) => next.add(rowId));
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
      selectionAnchor.current = id;
    }
    onSelectionChange(next);
  };

  return (
    <div className={styles.root}>
      {days.map((day) => (
        <section key={day.date} className={styles.day} aria-label={dayFormat.format(parseISO(day.date))}>
          <header className={styles.dayHeader}>
            <h3 className={styles.dayDate}>{dayFormat.format(parseISO(day.date))}</h3>
            <span className={styles.dayNet}>{format(day.net, mainCurrency)}</span>
          </header>

          <ul className={styles.rows}>
            {day.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                accountName={accountNames.get(transaction.accountId) ?? ""}
                showAccount={showAccount}
                mainCurrency={mainCurrency}
                expanded={expandable && expandedId === transaction.id}
                onToggleExpanded={
                  expandable
                    ? () => setExpandedId((id) => (id === transaction.id ? null : transaction.id))
                    : undefined
                }
                selectable={selectable}
                selected={!!selectedIds?.has(transaction.id)}
                selectionMode={selectionMode}
                onSelect={(mode) => select(transaction.id, mode)}
                onUpdate={onUpdate && ((patch) => onUpdate(transaction, patch))}
                onEdit={onEdit && (() => onEdit(transaction))}
                onDelete={onDelete && (() => onDelete(transaction))}
                actionsDisabled={actionsDisabled}
                muted={!!isRowMuted?.(transaction)}
                start={renderRowStart?.(transaction)}
                end={renderRowEnd?.(transaction)}
                footer={renderRowFooter?.(transaction)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
