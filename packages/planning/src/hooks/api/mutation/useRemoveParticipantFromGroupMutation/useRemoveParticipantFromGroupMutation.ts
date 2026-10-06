import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { removeParticipantFromGroup } from "../../../../api/splits";

export type RemoveParticipantFromGroupParams = {
  groupId: string;
  participantId: string;
};

export const useRemoveParticipantFromGroupMutation = (
  options?: UseMutationOptions<void, Error, RemoveParticipantFromGroupParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, RemoveParticipantFromGroupParams>({
    mutationFn: async ({ groupId, participantId }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await removeParticipantFromGroup(groupId, participantId);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.participantRemoveSuccess",
      errorMessageKey: "planning:toasts.splits.participantRemoveError",
    },
    ...options,
  });
};

export default useRemoveParticipantFromGroupMutation;
