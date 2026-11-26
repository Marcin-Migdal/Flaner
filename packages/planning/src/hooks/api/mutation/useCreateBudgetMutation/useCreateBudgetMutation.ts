import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { createBudget, type CreateBudgetInput, type UnlockedBudget } from "../../../../api/budget";
import { budgetKeys } from "../../queryKeys";

/**
 * Budget onboarding: resolves with the unlocked budget, which the caller keeps in the Budget context.
 * The stored keys just written go straight into the cache (no refetch), so the Budget gate never sees the `null`
 * fetched before onboarding next to the new budget and can trust a fetched `null` as "budget reset elsewhere".
 */
export const useCreateBudgetMutation = (options?: UseMutationOptions<UnlockedBudget, Error, CreateBudgetInput>) => {
  const queryClient = useQueryClient();

  return useUserMutation<UnlockedBudget, CreateBudgetInput>(
    {
      mutationKey: ["createBudget"],
      mutationFn: async (input, { uid }) => {
        const { locked, ...budget } = await createBudget(uid, input);
        // A fetch started before the write could still land `null` over the new keys
        await queryClient.cancelQueries({ queryKey: budgetKeys.locked(uid) });
        queryClient.setQueryData(budgetKeys.locked(uid), locked);
        return budget;
      },
      meta: {
        successMessageKey: "planning:toasts.budget.setupSuccess",
        errorMessageKey: "planning:toasts.budget.setupError",
      },
    },
    options,
  );
};
