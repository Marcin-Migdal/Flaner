import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { resetBudget } from "../../../../api/budget";
import { forgetBudget } from "../../../../utils/budgetDevice";
import { budgetKeys } from "../../queryKeys";

/**
 * Reset budget: deletes every budget document of the user and makes this device forget it. On success the cache
 * says "no keys", so the Budget gate shows onboarding as soon as the caller drops the unlocked budget.
 */
export const useResetBudgetMutation = (options?: UseMutationOptions<void, Error, void>) => {
  const queryClient = useQueryClient();

  return useUserMutation<void, void>(
    {
      mutationKey: ["resetBudget"],
      mutationFn: async (_, { uid }) => {
        await resetBudget(uid);
        // Storage blocked: a leftover record is dropped by its `keyId` check on the next visit
        await forgetBudget(uid).catch(() => undefined);
        const lockedKey = budgetKeys.locked(uid);
        queryClient.removeQueries({
          queryKey: budgetKeys.all,
          predicate: ({ queryKey }) => queryKey.join() !== lockedKey.join(),
        });
        queryClient.setQueryData(lockedKey, null);
      },
      meta: {
        successMessageKey: "planning:toasts.budget.resetSuccess",
        errorMessageKey: "planning:toasts.budget.resetError",
      },
    },
    options,
  );
};
