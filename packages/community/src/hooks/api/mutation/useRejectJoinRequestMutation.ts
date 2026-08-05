import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { rejectJoinRequest } from '../../../api/groups';
import { useInvalidateGroupRequestsQuery } from "../query/useGetGroupRequestsQuery";
import { reactQueryMeta } from "@flaner/shared/constants";


export const useRejectJoinRequestMutation = (
  options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>
) => {
  const invalidateRequests = useInvalidateGroupRequestsQuery();



  return useMutation<void, Error, { groupId: string; userId: string }>({
    meta: reactQueryMeta.mutate,
    mutationFn: async ({ groupId, userId }) => {
      await rejectJoinRequest(groupId, userId);
    },
    ...options,
    onSuccess: async (...args) => {
      const [_data, variables] = args;
      invalidateRequests(variables.groupId);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useRejectJoinRequestMutation;
