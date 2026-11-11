import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteSchedulerEvent } from "../../../../api/events";

export const useDeleteEventMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["deleteEvent"],
      mutationFn: async (eventId) => {
        await deleteSchedulerEvent(eventId);
      },
      meta: {
        successMessageKey: "planning:toasts.events.deleteSuccess",
        errorMessageKey: "planning:toasts.events.deleteError",
      },
    },
    options,
  );

export default useDeleteEventMutation;
