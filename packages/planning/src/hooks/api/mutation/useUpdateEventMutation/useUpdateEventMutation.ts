import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateSchedulerEvent, type SchedulerEventEdit } from "../../../../api/events";

export type UpdateEventParams = {
  eventId: string;
  data: SchedulerEventEdit;
};

export const useUpdateEventMutation = (options?: UseMutationOptions<void, Error, UpdateEventParams>) =>
  useUserMutation<void, UpdateEventParams>(
    {
      mutationKey: ["updateEvent"],
      mutationFn: async ({ eventId, data }) => {
        await updateSchedulerEvent(eventId, data);
      },
      meta: {
        successMessageKey: "planning:toasts.events.updateSuccess",
        errorMessageKey: "planning:toasts.events.updateError",
      },
    },
    options,
  );

export default useUpdateEventMutation;
