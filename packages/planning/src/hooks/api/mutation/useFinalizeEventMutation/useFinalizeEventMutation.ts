import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { finalizeSchedulerEvent } from "../../../../api/events";

export type FinalizeEventParams = {
  eventId: string;
  /** `getSlotKey` of the winning slot */
  slotKey: string;
};

export const useFinalizeEventMutation = (options?: UseMutationOptions<void, Error, FinalizeEventParams>) =>
  useUserMutation<void, FinalizeEventParams>(
    {
      mutationKey: ["finalizeEvent"],
      mutationFn: ({ eventId, slotKey }) => finalizeSchedulerEvent(eventId, slotKey),
      meta: {
        successMessageKey: "planning:toasts.events.finalizeSuccess",
        errorMessageKey: "planning:toasts.events.finalizeError",
      },
    },
    options,
  );

export default useFinalizeEventMutation;
