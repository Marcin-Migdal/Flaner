import { useMoneyFormatter } from "@flaner/shared/hooks";
import { fromMinorUnits, toMinorUnits } from "@flaner/shared/utils";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FormMoneyInput,
  LoadingFallback,
  MoneyInput,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format as formatDate, parseISO } from "date-fns";
import { useEffect } from "react";
import { FormProvider, useController, useForm, useWatch } from "react-hook-form";
import type { BudgetAccount, BudgetSplitOff, BudgetTransaction } from "../../api/budget";
import { useLinkBudgetRefundMutation } from "../../hooks/api/mutation";
import { useGetBudgetTransactionsRangeQuery } from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { monthOfDate } from "../../utils/monthLedger";
import { getBudgetRefundLinkSchema, type BudgetRefundLinkFormData } from "../../utils/schemas";
import { refundAmountFor, refundCandidates, refundRoom } from "../../utils/splitOffs";
import { refundLinkDialogStyles as styles } from "./RefundLinkDialog.styles";

/** How many months after the purchase's month refunds are looked for. */
export const REFUND_SEARCH_MONTHS = 6;

export type RefundLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: BudgetTransaction;
  /** Links the refund to this split-off of the purchase instead of the purchase's rest. */
  splitOff?: BudgetSplitOff | null;
  accounts: BudgetAccount[];
  /** Disables saving (e.g. offline). */
  saveDisabled?: boolean;
};

/**
 * Link a refund: picks an incoming transaction (not excluded, not linked, dated on or after the purchase, smaller
 * than what is left) from the purchase's month and the next `REFUND_SEARCH_MONTHS`. In another currency the split-off
 * amount is converted through main-currency amounts, prefilled and editable.
 */
export const RefundLinkDialog = ({ open, onOpenChange, purchase, splitOff, accounts, saveDisabled }: RefundLinkDialogProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const showWriteError = useBudgetWriteErrorToast();
  const { mutateAsync: linkRefund, isPending } = useLinkBudgetRefundMutation();

  const from = monthOfDate(purchase.date);
  const to = formatDate(addMonths(parseISO(purchase.date), REFUND_SEARCH_MONTHS), "yyyy-MM");
  const transactions = useGetBudgetTransactionsRangeQuery({ from, to }, { enabled: open });
  const hiddenAccountIds = new Set(accounts.filter((account) => account.hidden).map((account) => account.id));
  const candidates = refundCandidates(purchase, splitOff?.id, transactions.data ?? [])
    .filter((candidate) => !hiddenAccountIds.has(candidate.accountId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });

  const room = refundRoom(purchase, splitOff?.id);
  const methods = useForm<BudgetRefundLinkFormData>({
    resolver: zodResolver(getBudgetRefundLinkSchema(t, room)),
    defaultValues: { refundId: "", amount: undefined },
  });
  const { control, reset, setValue, handleSubmit } = methods;
  const { field: refundField, fieldState: refundState } = useController({ control, name: "refundId" });
  const amount = useWatch({ control, name: "amount" });
  const picked = candidates.find((candidate) => candidate.id === refundField.value);
  const isCrossCurrency = !!picked && picked.currency !== purchase.currency;

  useEffect(() => {
    if (open) reset({ refundId: "", amount: undefined });
  }, [open, reset]);

  const pick = (refund: BudgetTransaction) => {
    refundField.onChange(refund.id);
    setValue("amount", fromMinorUnits(refundAmountFor(purchase, refund)), { shouldValidate: true });
  };

  const onSubmit = async (data: BudgetRefundLinkFormData) => {
    const refund = candidates.find((candidate) => candidate.id === data.refundId);
    if (!refund) return;
    const input = { purchase, splitOffId: splitOff?.id, refund, amount: toMinorUnits(data.amount) };
    try {
      await linkRefund(input);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void handleSubmit(onSubmit)(), fallbackKey: "toasts.budget.saveError" });
      }
    }
  };

  const renderCandidates = () => {
    if (transactions.isPending) return <LoadingFallback />;
    if (transactions.isError) return <p className={styles.error}>{t("errors.fetchError", { ns: "common" })}</p>;
    if (candidates.length === 0) return <p className={styles.empty}>{t("budget.refundLink.noCandidates")}</p>;
    return (
      <div role="radiogroup" aria-label={t("budget.refundLink.candidates")} className={styles.candidates}>
        {candidates.map((candidate) => (
          <label key={candidate.id} className={styles.candidate}>
            <input
              type="radio"
              name={refundField.name}
              className={styles.radio}
              checked={refundField.value === candidate.id}
              onChange={() => pick(candidate)}
            />
            <span className={styles.candidateBody}>
              <span className={styles.candidatePayee}>{candidate.payee}</span>
              <span className={styles.candidateMeta}>
                {[dateFormat.format(parseISO(candidate.date)), accountNames.get(candidate.accountId), candidate.description || null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className={styles.candidateAmount}>{format(candidate.amount, candidate.currency)}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t("budget.refundLink.title")}</DialogTitle>
          <DialogDescription>
            {t("budget.refundLink.description", {
              payee: splitOff?.note || purchase.payee,
              amount: format(room, purchase.currency),
            })}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
              {renderCandidates()}
              {refundState.error && <p className={styles.error}>{refundState.error.message}</p>}
              {picked &&
                (isCrossCurrency ? (
                  <FormMoneyInput
                    amountName="amount"
                    label={t("budget.refundLink.amount", { currency: purchase.currency })}
                    currencyLabel={t("budget.transactionForm.currency")}
                    currency={purchase.currency}
                    currencyDisabled
                    description={t("budget.refundLink.converted", { amount: format(picked.amount, picked.currency) })}
                  />
                ) : (
                  // Same currency: the refund's own amount, as is (read-only, not a `disabled` form field)
                  <MoneyInput
                    label={t("budget.refundLink.amount", { currency: purchase.currency })}
                    currencyLabel={t("budget.transactionForm.currency")}
                    currency={purchase.currency}
                    value={amount ?? ""}
                    readOnly
                    disabled
                    currencyDisabled
                    error={methods.formState.errors.amount?.message}
                  />
                ))}
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.transactionForm.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled || !picked}>
                {t("budget.refundLink.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
