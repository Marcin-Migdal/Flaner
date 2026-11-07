import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { createSchedulerEvent, getSlotKey, type SchedulerEvent, type VoteType } from "../../../../api/events";

export type CreateEventInput = Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt" | "creatorId"> & {
  autoVoteProposedDates?: boolean;
};

export const useCreateEventMutation = (
  options?: UseMutationOptions<SchedulerEvent, Error, CreateEventInput>,
) => {
  const { user } = useAuth();

  return useMutation<SchedulerEvent, Error, CreateEventInput>({
    mutationFn: async ({ autoVoteProposedDates, ...data }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");

      const creatorVote: VoteType = "yes";
      const votes = autoVoteProposedDates
        ? { [user.uid]: Object.fromEntries(data.proposedDates.map((slot) => [getSlotKey(slot), creatorVote])) }
        : undefined;

      return createSchedulerEvent(
        {
          ...data,
          ...(votes && { votes }),
          creatorId: user.uid,
        },
        user,
      );
    },
    meta: {
      successMessageKey: "planning:toasts.events.addSuccess",
      errorMessageKey: "planning:toasts.events.addError",
    },
    ...options,
    onSuccess: async (...args) => {
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useCreateEventMutation;
