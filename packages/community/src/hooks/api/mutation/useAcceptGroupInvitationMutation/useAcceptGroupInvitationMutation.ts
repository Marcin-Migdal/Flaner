import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { acceptGroupInvitation } from '../../../../api/groups';
import { groupInvalidation } from "../../queryKeys";

export const useAcceptGroupInvitationMutation = (options?: UseMutationOptions<void, Error, { groupId: string; userId: string }>) =>
  useUserMutation<void, { groupId: string; userId: string }>(
    {
      mutationKey: ["acceptGroupInvitation"],
      mutationFn: ({ groupId, userId }) => acceptGroupInvitation(groupId, userId),
      invalidates: groupInvalidation.acceptGroupInvitation,
      meta: {
        successMessageKey: "community:toasts.groupInvitations.acceptSuccess",
        errorMessageKey: "community:toasts.groupInvitations.acceptError"
      },
    },
    options,
  );

export default useAcceptGroupInvitationMutation;
