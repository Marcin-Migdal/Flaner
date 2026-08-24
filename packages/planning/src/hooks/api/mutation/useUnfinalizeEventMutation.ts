import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { unfinalizeSchedulerEvent } from "../../../api/events";
import type { SchedulerEvent } from "../../../api/events/types";

export type UnfinalizeEventParams = {
  event: SchedulerEvent;
};

export const useUnfinalizeEventMutation = (
  options?: UseMutationOptions<void, Error, UnfinalizeEventParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, UnfinalizeEventParams>({
    mutationFn: async ({ event }: UnfinalizeEventParams) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");

      await unfinalizeSchedulerEvent(event, user);
    },
    meta: {
      successMessageKey: "planning:toasts.events.unfinalizeSuccess",
      errorMessageKey: "planning:toasts.events.unfinalizeError",
    },
    ...options,
    onSuccess: async (...args) => {
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUnfinalizeEventMutation;
