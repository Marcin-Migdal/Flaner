import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { createSchedulerEvent, type SchedulerEvent } from "../../../api/events";

export type CreateEventInput = Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt" | "creatorId">;

export const useCreateEventMutation = (
  options?: UseMutationOptions<SchedulerEvent, Error, CreateEventInput>,
) => {
  const { user } = useAuth();

  return useMutation<SchedulerEvent, Error, CreateEventInput>({
    mutationFn: async (data) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return createSchedulerEvent(
        {
          ...data,
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
