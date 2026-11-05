import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { acceptJoinRequest } from '../../../../api/groups';

import { useInvalidateGroupMembersQuery } from "../../query/useGetGroupMembersQuery";
import { useInvalidateGroupRequestsQuery } from "../../query/useGetGroupRequestsQuery";

export const useAcceptJoinRequestMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>
) => {
  const { user } = useAuth();
  const invalidateMembers = useInvalidateGroupMembersQuery();
  const invalidateRequests = useInvalidateGroupRequestsQuery();


  return useMutation<void, Error, { groupId: string; userId: string }>({
    mutationFn: async ({ groupId, userId }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await acceptJoinRequest(groupId, userId, user.uid);
    },
    meta: {
      successMessageKey: "community:toasts.requestsSheet.acceptSuccess",
      errorMessageKey: "community:toasts.requestsSheet.error",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateMembers(args[1].groupId);
      invalidateRequests(args[1].groupId);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAcceptJoinRequestMutation;
