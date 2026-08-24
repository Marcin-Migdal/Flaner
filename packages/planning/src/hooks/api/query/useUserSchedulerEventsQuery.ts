import { reactQueryMeta } from "@flaner/shared/constants";
import { useAuth } from "@flaner/shared/context";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { getUserSchedulerEvents } from "../../../api/events/endpoints";
import type { SchedulerEvent } from "../../../api/events/types";

export const getUserSchedulerEventsQueryKeys = (userId?: string) => ["events", "user", userId];

export const useUserSchedulerEventsQuery = (
  options?: Omit<UseQueryOptions<SchedulerEvent[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<SchedulerEvent[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getUserSchedulerEventsQueryKeys(user?.uid ?? ""),
    queryFn: () => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return getUserSchedulerEvents(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateUserSchedulerEventsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getUserSchedulerEventsQueryKeys(user?.uid) });
};
