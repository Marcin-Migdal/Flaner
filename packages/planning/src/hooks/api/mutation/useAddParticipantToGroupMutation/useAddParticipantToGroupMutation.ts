import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addParticipantToGroup } from "../../../../api/splits";

export type AddParticipantToGroupParams = {
  groupId: string;
  participantId: string;
};

export const useAddParticipantToGroupMutation = (options?: UseMutationOptions<void, Error, AddParticipantToGroupParams>) =>
  useUserMutation<void, AddParticipantToGroupParams>(
    {
      mutationKey: ["addParticipantToGroup"],
      mutationFn: async ({ groupId, participantId }, user) => {
        await addParticipantToGroup(groupId, participantId, user);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.participantAddSuccess",
        errorMessageKey: "planning:toasts.splits.participantAddError",
      },
    },
    options,
  );

export default useAddParticipantToGroupMutation;
