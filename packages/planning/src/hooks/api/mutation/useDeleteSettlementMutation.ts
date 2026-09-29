import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { deleteSettlement } from "../../../api/splits";
import { useInvalidateGroupSettlementsQuery } from "../query/useGetGroupSettlementsQuery";

export type DeleteSettlementParams = {
  groupId: string;
  settlementId: string;
};

export const useDeleteSettlementMutation = (options?: UseMutationOptions<void, Error, DeleteSettlementParams>) => {
  const { user } = useAuth();
  const invalidateGroupSettlements = useInvalidateGroupSettlementsQuery();

  return useMutation<void, Error, DeleteSettlementParams>({
    mutationFn: async ({ groupId, settlementId }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await deleteSettlement(groupId, settlementId, user.uid);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.settlementDeleteSuccess",
      errorMessageKey: "planning:toasts.splits.settlementDeleteError",
    },
    ...options,
    onSuccess: async (...args) => {
      await invalidateGroupSettlements(args[1].groupId);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteSettlementMutation;
