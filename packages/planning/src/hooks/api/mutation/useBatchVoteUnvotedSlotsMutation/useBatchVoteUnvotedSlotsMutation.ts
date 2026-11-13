import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { batchVoteUnvotedSlots, type VoteType } from "../../../../api/events";

export type BatchVoteUnvotedParams = {
  eventId: string;
  userId: string;
  fallbackVote?: VoteType;
};

export const useBatchVoteUnvotedSlotsMutation = (options?: UseMutationOptions<void, Error, BatchVoteUnvotedParams>) =>
  useUserMutation<void, BatchVoteUnvotedParams>(
    {
      mutationKey: ["batchVoteUnvotedSlots"],
      mutationFn: async ({ eventId, userId, fallbackVote = "no" }) => {
        await batchVoteUnvotedSlots(eventId, userId, fallbackVote);
      },
      meta: {
        errorMessageKey: "planning:toasts.events.voteError",
      },
    },
    options,
  );

export default useBatchVoteUnvotedSlotsMutation;
