import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { requestJoinGroup } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";

export const useRequestJoinGroupMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["requestJoinGroup"],
      mutationFn: async (groupId, user) => {
        await requestJoinGroup(groupId, user.uid);
      },
      meta: reactQueryMeta.mutate,
    },
    options,
  );

export default useRequestJoinGroupMutation;
