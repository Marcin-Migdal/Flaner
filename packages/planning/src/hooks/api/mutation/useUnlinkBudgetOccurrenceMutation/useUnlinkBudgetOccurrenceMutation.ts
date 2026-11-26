import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { unlinkBudgetRecurringOccurrence, type BudgetRecurringRef } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

type UnlinkInput = { recurring: BudgetRecurringRef; dueDate: string };

/** Unlinks a paid occurrence; automatic matching never gives it that transaction again. Errors are left to the caller. */
export const useUnlinkBudgetOccurrenceMutation = (options?: UseMutationOptions<void, Error, UnlinkInput>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, UnlinkInput>(
    {
      mutationKey: ["unlinkBudgetRecurringOccurrence"],
      mutationFn: ({ recurring, dueDate }) => unlinkBudgetRecurringOccurrence(budget, recurring, dueDate),
      invalidates: budgetInvalidation.recurringChanged,
      meta: { skipErrorToast: true },
    },
    { networkMode: "always", ...options },
  );
};
