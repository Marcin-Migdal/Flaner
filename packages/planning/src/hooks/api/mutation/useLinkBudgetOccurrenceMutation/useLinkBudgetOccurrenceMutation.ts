import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import {
  linkBudgetRecurringOccurrence,
  type BudgetOccurrenceLinkInput,
  type BudgetRecurringRef,
} from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type LinkInput = BudgetOccurrenceLinkInput & { recurring: BudgetRecurringRef };

/** Links an unpaid occurrence to a transaction by hand. Errors are left to the caller. */
export const useLinkBudgetOccurrenceMutation = (options?: UseMutationOptions<void, Error, LinkInput>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, LinkInput>(
    {
      mutationKey: ["linkBudgetRecurringOccurrence"],
      mutationFn: ({ recurring, ...input }) => linkBudgetRecurringOccurrence(budget, recurring, input),
      invalidates: budgetInvalidation.recurringChanged,
      meta: { skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
