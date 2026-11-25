import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Button } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { Eye, EyeOff, Pencil, Repeat, Split, Trash2, Undo2, Unlink } from "lucide-react";
import type { ReactNode } from "react";
import type { BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { linkRefOf, splitRest } from "../../../../utils/splitOffs";
import type { TransactionSplitActions } from "../../types";
import { transactionDetailsStyles as styles } from "./TransactionDetails.styles";

export type TransactionDetailsProps = {
  transaction: BudgetTransaction;
  accountName: string;
  mainCurrency: string;
  /** Shown above the details (e.g. the category picker and title on the phone). */
  children?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Split off, Link a refund, Exclude / Restore (Unlink for a linked refund). */
  splitActions?: TransactionSplitActions;
  /** Make recurring (only on a transaction that does not belong to a recurring transaction yet). */
  onMakeRecurring?: () => void;
  actionsDisabled?: boolean;
};

/** An expanded row: date, account, source file, how the amount splits, and the row's actions. */
export const TransactionDetails = ({
  transaction,
  accountName,
  mainCurrency,
  children,
  onEdit,
  onDelete,
  splitActions,
  onMakeRecurring,
  actionsDisabled,
}: TransactionDetailsProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "full" });
  const isForeign = transaction.currency !== mainCurrency;

  const amountSplit = isForeign
    ? t(transaction.rateOverridden ? "budget.transactionDetails.amountTyped" : "budget.transactionDetails.amountAtRate", {
        amount: format(transaction.amount, transaction.currency),
        amountMain: format(transaction.amountMain, mainCurrency),
        rate: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 6 }).format(transaction.rate),
        date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(parseISO(transaction.rateDate)),
      })
    : format(transaction.amount, transaction.currency);

  // [term, value, value class]: only the date is capitalised (a weekday name); a file name is shown as is
  const details: [string, string, string?][] = [
    [t("budget.transactionDetails.date"), dateFormat.format(parseISO(transaction.date)), styles.dateValue],
    [t("budget.transactionDetails.account"), accountName],
    [t("budget.transactionDetails.source"), transaction.sourceFile ?? t("budget.transactionDetails.manual")],
    [t("budget.transactionDetails.amount"), amountSplit],
  ];
  // A split transaction: what it counts itself (its split-offs are listed as rows under it)
  if (transaction.splitOffs?.length) {
    details.push([t("budget.transactionDetails.rest"), format(splitRest(transaction), transaction.currency)]);
  }
  if (transaction.refundOf) {
    details.push([t("budget.transactionDetails.refund"), t("budget.transactionDetails.refundLinked")]);
  }

  const { refundOf } = transaction;
  const canLinkRefund = transaction.type === "expense" && !transaction.excluded;
  const hasActions = !!(onEdit || onDelete || onMakeRecurring || splitActions);

  return (
    <div className={styles.root}>
      {children}
      <dl className={styles.list}>
        {details.map(([term, value, valueClass]) => (
          <div key={term} className={styles.item}>
            <dt className={styles.term}>{term}</dt>
            <dd className={cn(styles.value, valueClass)}>{value}</dd>
          </div>
        ))}
      </dl>
      {hasActions && (
        <div className={styles.actions}>
          {onEdit && (
            <Button type="button" variant="outline" size="sm" disabled={actionsDisabled} onClick={onEdit}>
              <Pencil aria-hidden="true" />
              {t("budget.transactionDetails.edit")}
            </Button>
          )}
          {splitActions && !refundOf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionsDisabled}
              onClick={() => splitActions.onSplitOff(transaction)}
            >
              <Split aria-hidden="true" />
              {t("budget.splitOff.action")}
            </Button>
          )}
          {splitActions && canLinkRefund && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionsDisabled}
              onClick={() => splitActions.onLinkRefund(transaction)}
            >
              <Undo2 aria-hidden="true" />
              {t("budget.refundLink.action")}
            </Button>
          )}
          {splitActions &&
            (refundOf ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionsDisabled}
                onClick={() => splitActions.onUnlinkRefund(linkRefOf(transaction))}
              >
                <Unlink aria-hidden="true" />
                {t("budget.refundLink.unlink")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionsDisabled}
                onClick={() => splitActions.onToggleExcluded(transaction)}
              >
                {transaction.excluded ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {t(transaction.excluded ? "budget.exclusion.restore" : "budget.exclusion.exclude")}
              </Button>
            ))}
          {onMakeRecurring && (
            <Button type="button" variant="outline" size="sm" disabled={actionsDisabled} onClick={onMakeRecurring}>
              <Repeat aria-hidden="true" />
              {t("budget.transactionDetails.makeRecurring")}
            </Button>
          )}
          {onDelete && (
            <Button type="button" variant="destructive" size="sm" disabled={actionsDisabled} onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              {t("budget.transactionDetails.delete")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
