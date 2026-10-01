import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { convertSplitGroupCurrency } from "../../../../api/splits";
import { useInvalidateGroupExpensesQuery } from "../../query/useGetGroupExpensesQuery";
import { useInvalidateGroupSettlementsQuery } from "../../query/useGetGroupSettlementsQuery";

export type ConvertSplitGroupCurrencyParams = {
  groupId: string;
  targetCurrency: string;
};

export const useConvertSplitGroupCurrencyMutation = (
  options?: UseMutationOptions<number, Error, ConvertSplitGroupCurrencyParams>,
) => {
  const { user } = useAuth();
  const invalidateGroupExpenses = useInvalidateGroupExpensesQuery();
  const invalidateGroupSettlements = useInvalidateGroupSettlementsQuery();

  return useMutation<number, Error, ConvertSplitGroupCurrencyParams>({
    mutationFn: async ({ groupId, targetCurrency }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return convertSplitGroupCurrency(groupId, targetCurrency);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.convertSuccess",
      errorMessageKey: "planning:toasts.splits.convertError",
    },
    ...options,
    onSuccess: async (...args) => {
      await Promise.all([invalidateGroupExpenses(args[1].groupId), invalidateGroupSettlements(args[1].groupId)]);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useConvertSplitGroupCurrencyMutation;
