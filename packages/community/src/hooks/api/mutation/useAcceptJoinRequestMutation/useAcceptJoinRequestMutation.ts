import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { acceptJoinRequest } from '../../../../api/groups';

export const useAcceptJoinRequestMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["acceptJoinRequest"],
      mutationFn: async ({ groupId, userId }, user) => {
        await acceptJoinRequest(groupId, userId, user.uid);
      },
      meta: {
        successMessageKey: "community:toasts.requestsSheet.acceptSuccess",
        errorMessageKey: "community:toasts.requestsSheet.error",
      },
    },
    options,
  );

export default useAcceptJoinRequestMutation;
