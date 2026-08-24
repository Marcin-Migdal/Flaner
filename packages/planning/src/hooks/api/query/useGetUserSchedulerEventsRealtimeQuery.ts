import { reactQueryMeta } from "@flaner/shared/constants";
import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getUserSchedulerEvents, subscribeToUserSchedulerEvents, type SchedulerEvent } from "../../../api/events";

export const getUserSchedulerEventsRealtimeQueryKeys = (userId: string) => ["userSchedulerEventsRealtime", userId];

export const useGetUserSchedulerEventsRealtimeQuery = (
  options?: Omit<UseQueryOptions<SchedulerEvent[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getUserSchedulerEventsRealtimeQueryKeys(user?.uid ?? "");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserSchedulerEvents(user.uid, (events: SchedulerEvent[]) => {
      queryClient.setQueryData(getUserSchedulerEventsRealtimeQueryKeys(user.uid), events);
    });

    return () => unsubscribe();
  }, [user?.uid, queryClient]);

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
