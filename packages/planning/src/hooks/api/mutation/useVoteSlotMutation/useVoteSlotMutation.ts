import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { voteSchedulerEventSlot, type VoteType } from "../../../../api/events";

export type VoteSlotParams = {
  eventId: string;
  slotKey: string;
  userId: string;
  vote: VoteType | null;
};

export const useVoteSlotMutation = (options?: UseMutationOptions<void, Error, VoteSlotParams>) =>
  useUserMutation<void, VoteSlotParams>(
    {
      mutationKey: ["voteSlot"],
      mutationFn: async ({ eventId, slotKey, userId, vote }) => {
        await voteSchedulerEventSlot(eventId, slotKey, userId, vote);
      },
      meta: {
        errorMessageKey: "planning:toasts.events.voteError",
      },
    },
    options,
  );

export default useVoteSlotMutation;
