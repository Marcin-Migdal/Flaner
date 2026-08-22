import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateSchedulerEvent } from "../../../api/events";

export type FinalizeEventParams = {
  eventId: string;
  finalizedSlotIndex: number;
};

export const useFinalizeEventMutation = (
  options?: UseMutationOptions<void, Error, FinalizeEventParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, FinalizeEventParams>({
    mutationFn: async ({ eventId, finalizedSlotIndex }: FinalizeEventParams) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");

      await updateSchedulerEvent(eventId, {
        isFinalized: true,
        finalizedSlotIndex,
      });
    },
    meta: {
      successMessageKey: "planning:toasts.events.finalizeSuccess",
      errorMessageKey: "planning:toasts.events.finalizeError",
    },
    ...options,
    onSuccess: async (...args) => {
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useFinalizeEventMutation;
