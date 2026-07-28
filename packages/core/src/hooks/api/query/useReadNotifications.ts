import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner-v2/shared";
import { getReadNotificationsPage } from "../../../api/notifications";

export const getReadNotificationsQueryKeys = (userId: string) => ["readNotifications", userId];

export const useReadNotifications = (options?: any) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: getReadNotificationsQueryKeys(user?.uid ?? ""),
    queryFn: ({ pageParam }) => getReadNotificationsPage(user!.uid, 15, pageParam as any),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

export const useInvalidateReadNotificationsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getReadNotificationsQueryKeys(user?.uid ?? "") });
};
