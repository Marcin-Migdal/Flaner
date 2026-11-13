import { requireUser, useRealtimeQuery, type RealtimeQueryOptions } from "@flaner/shared/hooks";
import { useAuth } from "@flaner/shared/context";
import { getUserSchedulerEvents, subscribeToUserSchedulerEvents, type SchedulerEvent } from "../../../../api/events";
import { eventKeys } from "../../queryKeys";

export const useGetUserSchedulerEventsRealtimeQuery = (options?: RealtimeQueryOptions<SchedulerEvent[]>) => {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  return useRealtimeQuery(
    {
      queryKey: eventKeys.userEvents(uid),
      queryFn: () => getUserSchedulerEvents(requireUser(user).uid),
      subscribe: (onUpdate, onError) => subscribeToUserSchedulerEvents(uid, onUpdate, onError),
      enabled: !!user,
    },
    options,
  );
};
