import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteBudgetAccount } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Deletes the account (id) with its transactions. Errors are left to the caller (No connection toast with Retry). */
export const useDeleteBudgetAccountMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, string>(
    {
      mutationKey: ["deleteBudgetAccount"],
      mutationFn: (accountId) => deleteBudgetAccount(budget, accountId),
      invalidates: budgetInvalidation.accountDeleted,
      meta: { successMessageKey: "planning:toasts.budget.accountDeleted", skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
