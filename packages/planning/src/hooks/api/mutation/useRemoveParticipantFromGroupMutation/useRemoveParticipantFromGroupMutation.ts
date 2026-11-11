import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { removeParticipantFromGroup } from "../../../../api/splits";

export type RemoveParticipantFromGroupParams = {
  groupId: string;
  participantId: string;
};

export const useRemoveParticipantFromGroupMutation = (options?: UseMutationOptions<void, Error, RemoveParticipantFromGroupParams>) =>
  useUserMutation<void, RemoveParticipantFromGroupParams>(
    {
      mutationKey: ["removeParticipantFromGroup"],
      mutationFn: async ({ groupId, participantId }) => {
        await removeParticipantFromGroup(groupId, participantId);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.participantRemoveSuccess",
        errorMessageKey: "planning:toasts.splits.participantRemoveError",
      },
    },
    options,
  );

export default useRemoveParticipantFromGroupMutation;
