import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { deleteSchedulerEvent } from "../../../api/events";

export const useDeleteEventMutation = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await deleteSchedulerEvent(eventId);
    },
    meta: {
      successMessageKey: "planning:toasts.events.deleteSuccess",
      errorMessageKey: "planning:toasts.events.deleteError",
    },
    ...options,
    onSuccess: async (...args) => {
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteEventMutation;
