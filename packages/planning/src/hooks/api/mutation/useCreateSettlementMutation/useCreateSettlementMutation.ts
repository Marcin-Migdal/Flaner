import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { createSettlement, type CreateSettlementInput, type Settlement } from "../../../../api/splits";

export type CreateSettlementParams = {
  groupId: string;
  data: CreateSettlementInput;
};

export const useCreateSettlementMutation = (options?: UseMutationOptions<Settlement, Error, CreateSettlementParams>) =>
  useUserMutation<Settlement, CreateSettlementParams>(
    {
      mutationKey: ["createSettlement"],
      mutationFn: async ({ groupId, data }, user) => {
        return createSettlement(groupId, data, user);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.settlementCreateSuccess",
        errorMessageKey: "planning:toasts.splits.settlementCreateError",
      },
    },
    options,
  );

export default useCreateSettlementMutation;
