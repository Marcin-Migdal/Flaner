import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { confirmSettlement, type Settlement } from "../../../../api/splits";

export type ConfirmSettlementParams = {
  groupId: string;
  settlementId: string;
  expectedVersion?: number;
};

export const useConfirmSettlementMutation = (options?: UseMutationOptions<Settlement, Error, ConfirmSettlementParams>) =>
  useUserMutation<Settlement, ConfirmSettlementParams>(
    {
      mutationKey: ["confirmSettlement"],
      mutationFn: async ({ groupId, settlementId, expectedVersion }, user) => {
        return confirmSettlement(groupId, settlementId, user.uid, expectedVersion);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.settlementConfirmSuccess",
        errorMessageKey: "planning:toasts.splits.settlementConfirmError",
      },
    },
    options,
  );

export default useConfirmSettlementMutation;
