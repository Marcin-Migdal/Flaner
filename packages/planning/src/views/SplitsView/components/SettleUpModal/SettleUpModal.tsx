import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FormDatePicker,
  FormSelect,
  FormTextField,
  type SelectOption,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, type DefaultValues } from "react-hook-form";
import { useAuth } from "@flaner/shared/context";
import { toast } from "@flaner/shared/utils";
import type { SettlementStatus, SplitGroup } from "../../../../api/splits";
import { useCreateSettlementMutation } from "../../../../hooks/api/mutation";
import { useCurrencyOptions } from "../../../../hooks/useCurrencyOptions";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { DEFAULT_CURRENCY, fromMinorUnits, toMinorUnits } from "../../../../utils/money";
import { getCreateSettlementSchema, type CreateSettlementFormData } from "../../../../utils/schemas";
import { getOutstandingDebtAmount } from "../../../../utils/splitBalances";
import { settleUpModalStyles as styles } from "./SettleUpModal.styles";

export type SettleUpDraft = {
  payerId: string;
  receiverId: string;
  /** Suggested amount in minor units. */
  amount?: number;
  currency?: string;
  status?: SettlementStatus;
};

const buildDefaultValues = (draft: SettleUpDraft | null, defaultCurrency: string): DefaultValues<CreateSettlementFormData> => ({
  payerId: draft?.payerId ?? "",
  receiverId: draft?.receiverId ?? "",
  amount: draft?.amount !== undefined ? fromMinorUnits(draft.amount) : undefined,
  currency: draft?.currency ?? defaultCurrency,
  date: new Date(),
  note: "",
});

export type SettleUpModalProps = {
  draft: SettleUpDraft | null;
  onClose: () => void;
  group: SplitGroup;
  members: SplitGroupMember[];
};

export const SettleUpModal = ({ draft, onClose, group, members }: SettleUpModalProps) => {
  const { user } = useAuth();
  const { t } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const defaultCurrency = group.lastUsedCurrency || group.defaultCurrency || DEFAULT_CURRENCY;
  const { mutateAsync: createSettlement, isPending } = useCreateSettlementMutation();
  const [openedVersion, setOpenedVersion] = useState<number | null>(null);
  const wasOpenRef = useRef(false);

  const methods = useForm<CreateSettlementFormData>({
    resolver: zodResolver(getCreateSettlementSchema(t)),
    defaultValues: buildDefaultValues(draft, defaultCurrency),
  });

  const currentVersion = group.version ?? 0;
  const isStale = openedVersion !== null && currentVersion !== openedVersion;

  useEffect(() => {
    if (draft) {
      methods.reset(buildDefaultValues(draft, defaultCurrency));
    }
  }, [draft, defaultCurrency, methods]);

  useEffect(() => {
    const isOpen = draft !== null;
    if (isOpen && !wasOpenRef.current) {
      setOpenedVersion(group.version ?? 0);
    } else if (!isOpen && wasOpenRef.current) {
      setOpenedVersion(null);
    }
    wasOpenRef.current = isOpen;
  }, [draft, group.version]);

  const watchedPayerId = methods.watch("payerId");
  const watchedReceiverId = methods.watch("receiverId");
  const watchedCurrency = methods.watch("currency");

  const currentMaxDebt = useMemo(() => {
    if (!watchedPayerId || !watchedReceiverId || !watchedCurrency) return 0;
    return getOutstandingDebtAmount(group, watchedPayerId, watchedReceiverId, watchedCurrency);
  }, [group, watchedPayerId, watchedReceiverId, watchedCurrency]);

  const handleRefreshAmount = () => {
    if (currentMaxDebt > 0) {
      methods.setValue("amount", fromMinorUnits(currentMaxDebt), { shouldValidate: true });
    }
    setOpenedVersion(currentVersion);
  };

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.isCurrentUser ? t("splits.you") : member.name,
      })),
    [members, t],
  );

  const onSubmit = async (data: CreateSettlementFormData) => {
    const minorAmount = toMinorUnits(data.amount);
    const maxDebt = getOutstandingDebtAmount(group, data.payerId, data.receiverId, data.currency);
    if (maxDebt <= 0) {
      toast.attention(t("planning:errors.noOutstandingDebtToSettle"));
      return;
    }
    if (minorAmount > maxDebt) {
      methods.setError("amount", {
        type: "manual",
        message: t("planning:errors.settlementAmountExceedsDebt"),
      });
      return;
    }

    const status: SettlementStatus =
      draft?.status ??
      (data.payerId === user?.uid && data.receiverId !== user?.uid ? "pending" : "confirmed");

    await createSettlement(
      {
        groupId: group.id,
        data: {
          payerId: data.payerId,
          receiverId: data.receiverId,
          amount: minorAmount,
          currency: data.currency,
          date: format(data.date, "yyyy-MM-dd"),
          note: data.note.trim(),
          status,
          expectedVersion: openedVersion ?? undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t("splits.settleModal.title")}</DialogTitle>
          <DialogDescription>{t("splits.settleModal.description")}</DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className={styles.body}>
              {isStale && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                    <span className="truncate">{t("splits.settleModal.staleWarning")}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshAmount}
                    className="h-7 px-2.5 text-xs shrink-0 cursor-pointer border-amber-500/30 hover:bg-amber-500/20 text-amber-300"
                  >
                    <RotateCcw className="size-3 mr-1" />
                    {t("splits.settleModal.refreshAmount")}
                  </Button>
                </div>
              )}

              <div className={styles.grid}>
                <FormSelect
                  name="payerId"
                  label={t("splits.fields.payer")}
                  options={memberOptions}
                  isSearchable={memberOptions.length > 8}
                />
                <FormSelect
                  name="receiverId"
                  label={t("splits.fields.receiver")}
                  options={memberOptions}
                  isSearchable={memberOptions.length > 8}
                />
              </div>
              <div className={styles.amountRow}>
                <FormTextField
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  label={t("splits.fields.amount")}
                  placeholder="0.00"
                />
                <FormSelect
                  name="currency"
                  label={t("splits.fields.currency")}
                  options={currencyOptions}
                  formatOptionLabel={(option: SelectOption, { context }) =>
                    context === "value" ? option.value : option.label
                  }
                />
              </div>
              <FormDatePicker name="date" label={t("splits.fields.date")} />
              <FormTextField name="note" label={t("splits.fields.note")} placeholder={t("splits.fields.note")} />
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                {t("splits.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending}>
                {t("splits.actions.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
