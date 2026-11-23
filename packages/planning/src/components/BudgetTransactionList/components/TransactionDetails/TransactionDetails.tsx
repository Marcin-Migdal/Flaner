import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Button } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { transactionDetailsStyles as styles } from "./TransactionDetails.styles";

export type TransactionDetailsProps = {
  transaction: BudgetTransaction;
  accountName: string;
  mainCurrency: string;
  /** Shown above the details (e.g. the category picker and title on the phone). */
  children?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
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
  actionsDisabled,
}: TransactionDetailsProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "full" });
  const isForeign = transaction.currency !== mainCurrency;

  // The split-off lines (#178) join here: the transaction's own counted rest, then each split-off
  const amountSplit = isForeign
    ? t(transaction.rateOverridden ? "budget.transactionDetails.amountTyped" : "budget.transactionDetails.amountAtRate", {
        amount: format(transaction.amount, transaction.currency),
        amountMain: format(transaction.amountMain, mainCurrency),
        rate: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 6 }).format(transaction.rate),
        date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(parseISO(transaction.rateDate)),
      })
    : format(transaction.amount, transaction.currency);

  const details: [string, string][] = [
    [t("budget.transactionDetails.date"), dateFormat.format(parseISO(transaction.date))],
    [t("budget.transactionDetails.account"), accountName],
    [t("budget.transactionDetails.source"), transaction.sourceFile ?? t("budget.transactionDetails.manual")],
    [t("budget.transactionDetails.amount"), amountSplit],
  ];

  return (
    <div className={styles.root}>
      {children}
      <dl className={styles.list}>
        {details.map(([term, value]) => (
          <div key={term} className={styles.item}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
      {/* Make recurring, Link a refund and Exclude join these actions in later tickets */}
      {(onEdit || onDelete) && (
        <div className={styles.actions}>
          {onEdit && (
            <Button variant="outline" size="sm" disabled={actionsDisabled} onClick={onEdit}>
              <Pencil aria-hidden="true" />
              {t("budget.transactionDetails.edit")}
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" disabled={actionsDisabled} onClick={onDelete}>
              <Trash2 aria-hidden="true" />
              {t("budget.transactionDetails.delete")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
