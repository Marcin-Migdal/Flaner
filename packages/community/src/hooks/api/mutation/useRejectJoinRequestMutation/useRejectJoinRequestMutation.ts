import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { rejectJoinRequest } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";

export const useRejectJoinRequestMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["rejectJoinRequest"],
      mutationFn: async ({ groupId, userId }, user) => {
        await rejectJoinRequest(groupId, userId, user.uid);
      },
      meta: reactQueryMeta.mutate,
    },
    options,
  );

export default useRejectJoinRequestMutation;
