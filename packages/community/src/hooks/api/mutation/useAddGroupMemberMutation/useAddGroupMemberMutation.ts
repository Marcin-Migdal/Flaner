import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addGroupMember } from '../../../../api/groups';
import { reactQueryMeta } from "@flaner/shared/constants";
import { groupInvalidation } from "../../queryKeys";

export const useAddGroupMemberMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["addGroupMember"],
      mutationFn: async ({ groupId, userId }) => {
        await addGroupMember(groupId, userId, "member");
      },
      invalidates: groupInvalidation.addGroupMember,
      meta: reactQueryMeta.mutate,
    },
    options,
  );

export default useAddGroupMemberMutation;
