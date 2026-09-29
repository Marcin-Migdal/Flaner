import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { addParticipantToGroup } from "../../../api/splits";

export type AddParticipantToGroupParams = {
  groupId: string;
  participantId: string;
};

export const useAddParticipantToGroupMutation = (
  options?: UseMutationOptions<void, Error, AddParticipantToGroupParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, AddParticipantToGroupParams>({
    mutationFn: async ({ groupId, participantId }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await addParticipantToGroup(groupId, participantId, user);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.participantAddSuccess",
      errorMessageKey: "planning:toasts.splits.participantAddError",
    },
    ...options,
  });
};

export default useAddParticipantToGroupMutation;
