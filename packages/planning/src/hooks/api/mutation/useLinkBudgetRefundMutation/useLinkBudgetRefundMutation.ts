import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { linkBudgetRefund, type BudgetRefundLinkInput } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type Variables = BudgetRefundLinkInput;

/** Links a refund to a purchase or one of its split-offs. No success toast: the list shows the change. Errors are left to the caller. */
export const useLinkBudgetRefundMutation = (options?: UseMutationOptions<void, Error, Variables>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, Variables>(
    {
      mutationKey: ["linkBudgetRefund"],
      mutationFn: (input) => linkBudgetRefund(budget, input),
      invalidates: budgetInvalidation.linkedTransactionsChanged,
      meta: { skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
