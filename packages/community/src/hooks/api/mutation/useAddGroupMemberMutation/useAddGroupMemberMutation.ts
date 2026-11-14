import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addGroupMember } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";

export const useAddGroupMemberMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["addGroupMember"],
      mutationFn: async ({ groupId, userId }) => {
        await addGroupMember(groupId, userId, "member");
      },
      meta: reactQueryMeta.mutate,
    },
    options,
  );

export default useAddGroupMemberMutation;
