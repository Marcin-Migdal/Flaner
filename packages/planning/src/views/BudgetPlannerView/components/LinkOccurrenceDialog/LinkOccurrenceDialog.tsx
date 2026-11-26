import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import type { BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { LinkCandidate } from "../../../../utils/plannerRecurring";
import { linkOccurrenceDialogStyles as styles } from "./LinkOccurrenceDialog.styles";

export type LinkOccurrenceDialogProps = {
  /** `null`: closed. */
  target: { payee: string; dueDate: string } | null;
  /** Nearest the due date first; already matched ones are shown disabled. */
  candidates: LinkCandidate[];
  mainCurrency: string;
  onLink: (transaction: BudgetTransaction) => void;
  onClose: () => void;
  disabled?: boolean;
};

/** Planner → Link: picks the month's transaction that paid an unpaid occurrence. */
export const LinkOccurrenceDialog = ({
  target,
  candidates,
  mainCurrency,
  onLink,
  onClose,
  disabled,
}: LinkOccurrenceDialogProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>{t("budget.planner.details.linkTitle", { payee: target?.payee ?? "" })}</DialogTitle>
          <DialogDescription>
            {target && t("budget.planner.details.linkDescription", { date: dayFormat.format(parseISO(target.dueDate)) })}
          </DialogDescription>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className={styles.empty}>{t("budget.planner.details.noCandidates")}</p>
        ) : (
          <ul className={styles.list}>
            {candidates.map(({ transaction, matched }) => (
              <li key={transaction.id} className={styles.item}>
                <span className={styles.main}>
                  <span className={styles.payee}>{transaction.payee}</span>
                  <span className={styles.meta}>
                    {[dayFormat.format(parseISO(transaction.date)), matched && t("budget.planner.details.alreadyMatched")]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className={styles.amount}>{format(transaction.amountMain, mainCurrency)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || matched}
                  aria-label={t("budget.planner.details.linkCandidate", {
                    payee: transaction.payee,
                    date: dayFormat.format(parseISO(transaction.date)),
                  })}
                  onClick={() => onLink(transaction)}
                >
                  {t("budget.planner.details.link")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose}>
            {t("budget.planner.details.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
