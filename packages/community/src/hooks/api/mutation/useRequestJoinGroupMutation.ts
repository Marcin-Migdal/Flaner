import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { requestJoinGroup } from "../../../api/groups";
import { useInvalidateGroupRequestsQuery } from "../query/useGetGroupRequestsQuery";
import { useInvalidateUserGroupRequestQuery } from "../query/useGetUserGroupRequestQuery";

export const useRequestJoinGroupMutation = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const { user } = useAuth();
  const invalidateRequests = useInvalidateGroupRequestsQuery();
  const invalidateUserGroupRequest = useInvalidateUserGroupRequestQuery();

  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      if (!user) throw new Error("Unauthenticated");
      await requestJoinGroup(groupId, user.uid);
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateRequests(args[1]);
      if (user) {
        invalidateUserGroupRequest(args[1]);
      }
      if (options?.onSuccess) {
        await (options.onSuccess as any)(...args);
      }
    },
  });
};

export default useRequestJoinGroupMutation;
