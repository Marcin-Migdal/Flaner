import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteSettlement } from "../../../../api/splits";

export type DeleteSettlementParams = {
  groupId: string;
  settlementId: string;
};

export const useDeleteSettlementMutation = (options?: UseMutationOptions<void, Error, DeleteSettlementParams>) =>
  useUserMutation<void, DeleteSettlementParams>(
    {
      mutationKey: ["deleteSettlement"],
      mutationFn: async ({ groupId, settlementId }, user) => {
        await deleteSettlement(groupId, settlementId, user.uid);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.settlementDeleteSuccess",
        errorMessageKey: "planning:toasts.splits.settlementDeleteError",
      },
    },
    options,
  );

export default useDeleteSettlementMutation;
