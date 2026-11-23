import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { setMainBudgetAccount } from "../../../../api/budget";
import { useUnlockedBudget } from "../../../../context/BudgetContext";
import { budgetInvalidation } from "../../queryKeys";

/** Makes the account (id) the main one. Errors are left to the caller (No connection toast with Retry). */
export const useSetMainBudgetAccountMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const budget = useUnlockedBudget();

  return useUserMutation<void, string>(
    {
      mutationKey: ["setMainBudgetAccount"],
      mutationFn: (accountId) => setMainBudgetAccount(budget, accountId),
      invalidates: budgetInvalidation.profileChanged,
      meta: { successMessageKey: "planning:toasts.budget.mainAccountChanged", skipErrorToast: true },
    },
    // Fails at once offline instead of waiting paused for the connection
    { networkMode: "always", ...options },
  );
};
