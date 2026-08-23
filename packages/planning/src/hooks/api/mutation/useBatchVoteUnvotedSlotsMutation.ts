import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { batchVoteUnvotedSlots, type VoteType } from "../../../api/events";

export type BatchVoteUnvotedParams = {
  eventId: string;
  userId: string;
  fallbackVote?: VoteType;
};

export const useBatchVoteUnvotedSlotsMutation = (
  options?: UseMutationOptions<void, Error, BatchVoteUnvotedParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, BatchVoteUnvotedParams>({
    mutationFn: async ({ eventId, userId, fallbackVote = "no" }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await batchVoteUnvotedSlots(eventId, userId, fallbackVote);
    },
    meta: {
      errorMessageKey: "planning:toasts.events.voteError",
    },
    ...options,
    onSuccess: async (...args) => {
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useBatchVoteUnvotedSlotsMutation;
