import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { convertSplitGroupCurrency } from "../../../../api/splits";

export type ConvertSplitGroupCurrencyParams = {
  groupId: string;
  targetCurrency: string;
};

export const useConvertSplitGroupCurrencyMutation = (options?: UseMutationOptions<number, Error, ConvertSplitGroupCurrencyParams>) =>
  useUserMutation<number, ConvertSplitGroupCurrencyParams>(
    {
      mutationKey: ["convertSplitGroupCurrency"],
      mutationFn: async ({ groupId, targetCurrency }) => {
        return convertSplitGroupCurrency(groupId, targetCurrency);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.convertSuccess",
        errorMessageKey: "planning:toasts.splits.convertError",
      },
    },
    options,
  );

export default useConvertSplitGroupCurrencyMutation;
