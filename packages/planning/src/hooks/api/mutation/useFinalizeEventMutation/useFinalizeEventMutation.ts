import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateSchedulerEvent } from "../../../../api/events";

export type FinalizeEventParams = {
  eventId: string;
  finalizedSlotIndex: number;
};

export const useFinalizeEventMutation = (options?: UseMutationOptions<void, Error, FinalizeEventParams>) =>
  useUserMutation<void, FinalizeEventParams>(
    {
      mutationKey: ["finalizeEvent"],
      mutationFn: async ({ eventId, finalizedSlotIndex }) => {
        await updateSchedulerEvent(eventId, {
          isFinalized: true,
          finalizedSlotIndex,
        });
      },
      meta: {
        successMessageKey: "planning:toasts.events.finalizeSuccess",
        errorMessageKey: "planning:toasts.events.finalizeError",
      },
    },
    options,
  );

export default useFinalizeEventMutation;
