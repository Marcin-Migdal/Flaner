import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { createSettlement, type CreateSettlementInput, type Settlement } from "../../../api/splits";
import { useInvalidateGroupSettlementsQuery } from "../query/useGetGroupSettlementsQuery";

export type CreateSettlementParams = {
  groupId: string;
  data: CreateSettlementInput;
};

export const useCreateSettlementMutation = (
  options?: UseMutationOptions<Settlement, Error, CreateSettlementParams>,
) => {
  const { user } = useAuth();
  const invalidateGroupSettlements = useInvalidateGroupSettlementsQuery();

  return useMutation<Settlement, Error, CreateSettlementParams>({
    mutationFn: async ({ groupId, data }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return createSettlement(groupId, data, user);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.settlementCreateSuccess",
      errorMessageKey: "planning:toasts.splits.settlementCreateError",
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

export default useCreateSettlementMutation;
