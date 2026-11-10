import { reactQueryMeta } from "@flaner/shared/constants";
import { useRealtimeQueryData } from "@flaner/shared/hooks";
import { useAuth } from "@flaner/shared/context";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getUserSchedulerEvents, subscribeToUserSchedulerEvents, type SchedulerEvent } from "../../../../api/events";

export const getUserSchedulerEventsRealtimeQueryKeys = (userId: string) => ["userSchedulerEventsRealtime", userId];

export const useGetUserSchedulerEventsRealtimeQuery = (
  options?: Omit<UseQueryOptions<SchedulerEvent[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryKey = getUserSchedulerEventsRealtimeQueryKeys(user?.uid ?? "");

  useRealtimeQueryData(
    queryKey,
    (onUpdate, onError) => subscribeToUserSchedulerEvents(user?.uid ?? "", onUpdate, onError),
    !!user?.uid,
  );

  return useQuery<SchedulerEvent[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return getUserSchedulerEvents(user.uid);
    },
    enabled: !!user,
    staleTime: Infinity,
    ...options,
  });
};

export default useGetUserSchedulerEventsRealtimeQuery;
