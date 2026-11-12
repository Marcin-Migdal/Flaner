import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { unfinalizeSchedulerEvent } from "../../../../api/events";
import type { SchedulerEvent } from "../../../../api/events/types";

export type UnfinalizeEventParams = {
  event: SchedulerEvent;
};

export const useUnfinalizeEventMutation = (options?: UseMutationOptions<void, Error, UnfinalizeEventParams>) =>
  useUserMutation<void, UnfinalizeEventParams>(
    {
      mutationKey: ["unfinalizeEvent"],
      mutationFn: async ({ event }, user) => {
        await unfinalizeSchedulerEvent(event, user);
      },
      meta: {
        successMessageKey: "planning:toasts.events.unfinalizeSuccess",
        errorMessageKey: "planning:toasts.events.unfinalizeError",
      },
    },
    options,
  );

export default useUnfinalizeEventMutation;
