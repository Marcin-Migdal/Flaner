import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateSchedulerEvent, type SchedulerEvent } from "../../../api/events";

export type UpdateEventParams = {
  eventId: string;
  data: Partial<Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt">>;
};

export const useUpdateEventMutation = (
  options?: UseMutationOptions<void, Error, UpdateEventParams>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, UpdateEventParams>({
    mutationFn: async ({ eventId, data }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await updateSchedulerEvent(eventId, data);
    },
    meta: {
      successMessageKey: "planning:toasts.events.updateSuccess",
      errorMessageKey: "planning:toasts.events.updateError",
    },
    ...options,
    onSuccess: async (...args) => {
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useUpdateEventMutation;
