import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { requestJoinGroup } from '../../../api/groups';
import { useInvalidateGroupRequestsQuery } from "../query/useGetGroupRequestsQuery";
import { useInvalidateUserGroupRequestQuery } from "../query/useGetUserGroupRequestQuery";
import { reactQueryMeta } from "@flaner/shared/constants";


export const useRequestJoinGroupMutation = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const { user } = useAuth();
  const invalidateRequests = useInvalidateGroupRequestsQuery();
  const invalidateUserGroupRequest = useInvalidateUserGroupRequestQuery();



  return useMutation<void, Error, string>({
    meta: reactQueryMeta.mutate,
    mutationFn: async (groupId) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await requestJoinGroup(groupId, user.uid);
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateRequests(args[1]);
      if (user) {
        invalidateUserGroupRequest(args[1]);
      }
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useRequestJoinGroupMutation;
