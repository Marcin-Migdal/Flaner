import { useIsMobile, useMoneyFormatter } from "@flaner/shared/hooks";
import { cn, fromMinorUnits, toMinorUnits } from "@flaner/shared/utils";
import { Badge, Button, ShadcnCheckbox } from "@flaner/ui-components";
import { ChevronDown, CircleHelp, Repeat } from "lucide-react";
import { useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { BudgetCategoryTree, BudgetTransaction, BudgetTransactionPatch } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import { resolveTransactionCategory, signedAmount } from "../../../../utils/monthLedger";
import { amountPatch, categoryPatch } from "../../../../utils/transactionEdits";
import { CategoryPicker } from "../../../CategoryPicker";
import { InlineEdit } from "../InlineEdit";
import { TransactionDetails } from "../TransactionDetails";
import { transactionRowStyles as styles } from "./TransactionRow.styles";

const LONG_PRESS_MS = 500;

export type SelectMode = "toggle" | "range";

export type TransactionRowProps = {
  transaction: BudgetTransaction;
  categories: BudgetCategoryTree;
  /** The categorization rule's suggestion, marked in the category picker. */
  suggestedCategoryId?: string | null;
  accountName: string;
  showAccount: boolean;
  mainCurrency: string;
  expanded: boolean;
  /** Without it the row does not expand (e.g. the import preview). */
  onToggleExpanded?: () => void;
  /** Rows can be selected (Ctrl / Shift click, long-press on the phone). */
  selectable: boolean;
  selected: boolean;
  /** Some row is selected: rows show a checkbox, and a tap on the phone selects instead of expanding. */
  selectionMode: boolean;
  onSelect: (mode: SelectMode) => void;
  /** Saves an inline edit (payee, title, amount, category, confirm). */
  onUpdate?: (patch: BudgetTransactionPatch) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actionsDisabled?: boolean;
  /** Greyed out (e.g. a pending card hold in the import preview). */
  muted?: boolean;
  /** Belongs to a recurring transaction: shows the recurring marker. */
  recurring?: boolean;
  onMakeRecurring?: () => void;
  /** Extra content before the row's icon, after its amounts, and on a full-width line below it. */
  start?: ReactNode;
  end?: ReactNode;
  footer?: ReactNode;
};

const parseAmount = (text: string) => Number(text.replace(/\s/g, "").replace(",", "."));

export const TransactionRow = ({
  transaction,
  categories,
  suggestedCategoryId,
  accountName,
  showAccount,
  mainCurrency,
  expanded,
  onToggleExpanded,
  selectable,
  selected,
  selectionMode,
  onSelect,
  onUpdate,
  onEdit,
  onDelete,
  actionsDisabled,
  muted,
  recurring,
  onMakeRecurring,
  start,
  end,
  footer,
}: TransactionRowProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const isMobile = useIsMobile();
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const { payee, type, currency } = transaction;
  const resolved = resolveTransactionCategory(categories, transaction);
  const categoryName = resolved
    ? (resolved.subcategory?.name ?? resolved.category.name)
    : t("budget.transactionList.uncategorized");
  const isIncome = type === "income";
  // Inline fields only while writes are possible (not offline)
  const update = actionsDisabled ? undefined : onUpdate;
  const amountText = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(fromMinorUnits(transaction.amount));

  const Icon = resolved ? BUDGET_CATEGORY_ICON_COMPONENTS[resolved.category.icon] : CircleHelp;
  const staticIcon = (
    <span className={styles.icon}>
      <Icon
        aria-hidden="true"
        className={resolved ? BUDGET_CATEGORY_COLOR_CLASSES[resolved.category.color] : styles.uncategorizedIcon}
      />
      {resolved && !transaction.confirmed && (
        <span className={styles.unconfirmedMark}>
          <span aria-hidden="true">?</span>
          <span className="sr-only">{t("budget.transactionList.unconfirmed")}</span>
        </span>
      )}
    </span>
  );
  const categoryPicker = onUpdate && (
    <CategoryPicker
      variant="inline"
      tree={categories}
      type={type}
      value={transaction.categoryId}
      confirmed={transaction.confirmed}
      suggestedId={suggestedCategoryId}
      disabled={actionsDisabled}
      aria-label={t("budget.transactionList.category", { payee })}
      onChange={(categoryId) => onUpdate(categoryPatch(categoryId))}
      onConfirm={() => onUpdate({ confirmed: true })}
    />
  );

  const excludedBadge = transaction.excluded && (
    <Badge variant="neutral" size="sm">
      {t("budget.transactionList.excluded")}
    </Badge>
  );
  const recurringMark = recurring && (
    <span className={styles.recurringMark}>
      <Repeat aria-hidden="true" />
      <span className="sr-only">{t("budget.transactionList.recurring")}</span>
    </span>
  );
  const amountMain = currency !== mainCurrency && (
    <span className={styles.amountMain}>{format(signedAmount(type, transaction.amountMain), mainCurrency)}</span>
  );
  const details = expanded && (
    <TransactionDetails
      transaction={transaction}
      accountName={accountName}
      mainCurrency={mainCurrency}
      onEdit={onEdit}
      onDelete={onDelete}
      onMakeRecurring={onMakeRecurring}
      actionsDisabled={actionsDisabled}
    >
      {isMobile && categoryPicker}
    </TransactionDetails>
  );
  // Desktop: always there for keyboard users (shown on hover / focus); phone: once something is selected
  const checkbox = selectable && (selectionMode || !isMobile) && (
    <ShadcnCheckbox
      className={cn(styles.checkbox, !selectionMode && styles.checkboxIdle)}
      checked={selected}
      onCheckedChange={() => onSelect("toggle")}
      onClick={(event) => event.stopPropagation()}
      aria-label={t("budget.transactionList.select", { payee })}
    />
  );
  const rowClass = cn(
    styles.row,
    selected && styles.selected,
    (transaction.excluded || muted) && styles.excluded,
  );
  const footerLine = footer && <div className={styles.footer}>{footer}</div>;

  if (isMobile) {
    const clearPress = () => window.clearTimeout(pressTimer.current);
    const activate = () => {
      if (selectable && selectionMode) onSelect("toggle");
      else onToggleExpanded?.();
    };
    const summaryContent = (
      <>
        {staticIcon}
        <span className={styles.body}>
          <span className={styles.payee}>{payee}</span>
          <span className={styles.meta}>
            {[categoryName, showAccount ? accountName : null, transaction.description || null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className={styles.amounts}>
          <span className={cn(styles.amount, isIncome && styles.income)}>
            {format(signedAmount(type, transaction.amount), currency)}
          </span>
          {amountMain}
          {excludedBadge}
          {recurringMark}
        </span>
      </>
    );

    return (
      <li className={rowClass}>
        {/* Beside, not inside, the row button: an interactive control cannot nest in another */}
        <div className={styles.mobileLine}>
          {start}
          {checkbox}
          {selectable || onToggleExpanded ? (
            <div
              role="button"
              tabIndex={0}
              aria-expanded={onToggleExpanded ? expanded : undefined}
              className={cn(styles.summary, styles.mobileSummary)}
              onPointerDown={() => {
                if (!selectable) return;
                longPressed.current = false;
                pressTimer.current = window.setTimeout(() => {
                  longPressed.current = true;
                  onSelect("toggle");
                }, LONG_PRESS_MS);
              }}
              onPointerUp={clearPress}
              onPointerLeave={clearPress}
              onPointerCancel={clearPress}
              onContextMenu={(event) => selectable && event.preventDefault()}
              onClick={() => {
                // The click that ends a long-press already selected the row
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                activate();
              }}
              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                activate();
              }}
            >
              {summaryContent}
            </div>
          ) : (
            <div className={cn(styles.staticSummary, styles.mobileSummary)}>{summaryContent}</div>
          )}
          {end}
        </div>
        {footerLine}
        {details}
      </li>
    );
  }

  const onSummaryClick = (event: MouseEvent<HTMLDivElement>) => {
    // Clicks in the category list (portaled outside the row) bubble here through React
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
    if (selectable && (event.ctrlKey || event.metaKey || event.shiftKey)) {
      event.preventDefault();
      onSelect(event.shiftKey ? "range" : "toggle");
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, button, [data-row-control]")) return;
    onToggleExpanded?.();
  };

  return (
    <li className={rowClass}>
      {/* Mouse shortcuts only: the keyboard expands with the chevron button and selects with the checkbox */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={cn(styles.summary, !onToggleExpanded && !selectable && styles.staticCursor)} onClick={onSummaryClick}>
        {start}
        {checkbox}
        {categoryPicker ? (
          <span className={styles.category} data-row-control>
            {categoryPicker}
          </span>
        ) : (
          staticIcon
        )}
        <span className={styles.body}>
          {update ? (
            <>
              <InlineEdit
                value={payee}
                className={styles.payeeInput}
                aria-label={t("budget.transactionList.payee", { payee })}
                onCommit={(next) => {
                  if (!next) return false;
                  update({ payee: next });
                  return true;
                }}
              />
              <InlineEdit
                value={transaction.description}
                className={styles.metaInput}
                placeholder={t("budget.transactionList.addDescription")}
                aria-label={t("budget.transactionList.description", { payee })}
                onCommit={(next) => {
                  update({ description: next });
                  return true;
                }}
              />
            </>
          ) : (
            <>
              <span className={styles.payee}>{payee}</span>
              {transaction.description && <span className={styles.meta}>{transaction.description}</span>}
            </>
          )}
          {(showAccount || !categoryPicker) && (
            <span className={styles.meta}>
              {[categoryPicker ? null : categoryName, showAccount ? accountName : null].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        {recurringMark}
        {excludedBadge}
        <span className={styles.amounts}>
          {update ? (
            <span className={cn(styles.amountEdit, isIncome && styles.income)}>
              <span aria-hidden="true">{isIncome ? "+" : "−"}</span>
              <InlineEdit
                value={amountText}
                inputMode="decimal"
                className={styles.amountInput}
                aria-label={t("budget.transactionList.amount", { payee })}
                onCommit={(next) => {
                  const amount = toMinorUnits(parseAmount(next));
                  if (!Number.isFinite(amount) || amount <= 0) return false;
                  update(amountPatch(transaction, amount));
                  return true;
                }}
              />
              <span className={styles.currency}>{currency}</span>
            </span>
          ) : (
            <span className={cn(styles.amount, isIncome && styles.income)}>
              {format(signedAmount(type, transaction.amount), currency)}
            </span>
          )}
          {amountMain}
        </span>
        {end}
        {onToggleExpanded && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={styles.expandButton}
            aria-expanded={expanded}
            aria-label={t("budget.transactionList.details", { payee })}
            onClick={onToggleExpanded}
          >
            <ChevronDown aria-hidden="true" className={cn(styles.chevron, expanded && styles.chevronOpen)} />
          </Button>
        )}
      </div>
      {footerLine}
      {details}
    </li>
  );
};
