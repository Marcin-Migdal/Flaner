import { ConfirmationPopup, EmptyState, LoadingFallback } from "@flaner/ui-components";
import { Repeat } from "lucide-react";
import { useState } from "react";
import type { BudgetRecurring } from "../../../../api/budget";
import { BudgetRecurringList } from "../../../../components/BudgetRecurringList";
import { RecurringRuleDialog } from "../../../../components/RecurringRuleDialog";
import { useDeleteBudgetRecurringMutation, useStopBudgetRecurringMutation } from "../../../../hooks/api/mutation";
import {
  useGetBudgetAccountsQuery,
  useGetBudgetCategoriesQuery,
  useGetBudgetProfileQuery,
  useGetBudgetRecurringQuery,
} from "../../../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { useIsOnline } from "../../../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";

type PendingAction = { kind: "stop" | "delete"; recurring: BudgetRecurring };

/** Transactions → Recurring (`#recurring`): the list with Edit rule, Stop and Delete. */
export const BudgetRecurringTab = () => {
  const { t } = usePlanningTranslations();
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();
  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const categories = useGetBudgetCategoriesQuery();
  const recurring = useGetBudgetRecurringQuery();
  const [editing, setEditing] = useState<BudgetRecurring | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const { mutateAsync: stopRecurring, isPending: isStopping } = useStopBudgetRecurringMutation();
  const { mutateAsync: deleteRecurring, isPending: isDeleting } = useDeleteBudgetRecurringMutation();

  const confirm = async (action: PendingAction) => {
    try {
      await (action.kind === "stop" ? stopRecurring(action.recurring) : deleteRecurring(action.recurring));
      setPending(null);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, {
          retry: () => void confirm(action),
          fallbackKey: action.kind === "stop" ? "toasts.budget.saveError" : "toasts.budget.deleteError",
        });
      }
    }
  };

  if (recurring.isPending || profile.isPending || accounts.isPending || categories.isPending) return <LoadingFallback />;
  if (!recurring.data || !profile.data || !accounts.data || !categories.data) {
    return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
  }
  if (recurring.data.length === 0) {
    return (
      <EmptyState
        icon={<Repeat aria-hidden="true" />}
        title={t("budget.recurring.empty.title")}
        description={t("budget.recurring.empty.description")}
      />
    );
  }

  return (
    <>
      <BudgetRecurringList
        recurring={recurring.data}
        categories={categories.data}
        accounts={accounts.data}
        mainCurrency={profile.data.mainCurrency}
        actionsDisabled={!isOnline}
        onEditRule={(item) => {
          setEditing(item);
          setIsRuleDialogOpen(true);
        }}
        onStop={(item) => setPending({ kind: "stop", recurring: item })}
        onDelete={(item) => setPending({ kind: "delete", recurring: item })}
      />

      <RecurringRuleDialog
        open={isRuleDialogOpen}
        onOpenChange={setIsRuleDialogOpen}
        recurring={editing}
        saveDisabled={!isOnline}
      />

      <ConfirmationPopup
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? t(`budget.recurring.${pending.kind}Confirm.title`) : ""}
        description={pending ? t(`budget.recurring.${pending.kind}Confirm.description`, { payee: pending.recurring.payee }) : undefined}
        confirmLabel={pending ? t(`budget.recurring.${pending.kind}Confirm.confirm`) : ""}
        variant={pending?.kind === "delete" ? "destructive" : "primary"}
        isConfirming={isStopping || isDeleting}
        onConfirm={() => pending && void confirm(pending)}
      />
    </>
  );
};
