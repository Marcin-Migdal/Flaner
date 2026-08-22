import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { voteSchedulerEventSlot, type VoteType } from "../../../api/events";

export type VoteSlotParams = {
  eventId: string;
  slotIndex: number;
  userId: string;
  vote: VoteType | null;
};

export const useVoteSlotMutation = (
  options?: UseMutationOptions<void, Error, VoteSlotParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, VoteSlotParams>({
    mutationFn: async ({ eventId, slotIndex, userId, vote }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await voteSchedulerEventSlot(eventId, slotIndex, userId, vote);
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

export default useVoteSlotMutation;
