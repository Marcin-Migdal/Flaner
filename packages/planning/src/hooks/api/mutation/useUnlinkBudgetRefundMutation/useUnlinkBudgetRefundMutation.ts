import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { unlinkBudgetRefund, type BudgetLinkRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type Variables = BudgetLinkRef;

/** Unlinks a refund (given where the refund is stored). No success toast: the list shows the change. Errors are left to the caller. */
export const useUnlinkBudgetRefundMutation = (options?: UseMutationOptions<void, Error, Variables>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, Variables>(
    {
      mutationKey: ["unlinkBudgetRefund"],
      mutationFn: (refund) => unlinkBudgetRefund(budget, refund),
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
