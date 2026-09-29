import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { confirmSettlement, type Settlement } from "../../../api/splits";
import { useInvalidateGroupSettlementsQuery } from "../query/useGetGroupSettlementsQuery";

export type ConfirmSettlementParams = {
  groupId: string;
  settlementId: string;
  expectedVersion?: number;
};

export const useConfirmSettlementMutation = (
  options?: UseMutationOptions<Settlement, Error, ConfirmSettlementParams>,
) => {
  const { user } = useAuth();
  const invalidateGroupSettlements = useInvalidateGroupSettlementsQuery();

  return useMutation<Settlement, Error, ConfirmSettlementParams>({
    mutationFn: async ({ groupId, settlementId, expectedVersion }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return confirmSettlement(groupId, settlementId, user.uid, expectedVersion);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.settlementConfirmSuccess",
      errorMessageKey: "planning:toasts.splits.settlementConfirmError",
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

export default useConfirmSettlementMutation;
