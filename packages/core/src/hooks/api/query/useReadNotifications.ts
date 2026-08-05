import { useAuth } from "@flaner/shared/context";
import { type AppInfiniteQueryOptions, type FirestorePageParam } from "@flaner/shared/types";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getReadNotificationsPage, type AppNotification } from "../../../api/notifications";
import { reactQueryMeta } from "@flaner/shared/constants";


export const getReadNotificationsQueryKeys = (userId: string) => ["readNotifications", userId];

type NotificationsResponse = {
  notifications: AppNotification[];
  nextCursor?: QueryDocumentSnapshot<AppNotification, DocumentData>;
};

export const useReadNotifications = (options?: AppInfiniteQueryOptions<NotificationsResponse, string[], never, FirestorePageParam<AppNotification>>) => {
  const { user } = useAuth();



  return useInfiniteQuery<
    NotificationsResponse,
    Error,
    InfiniteData<NotificationsResponse, FirestorePageParam<AppNotification>>,
    string[],
    FirestorePageParam<AppNotification>
  >({
      meta: reactQueryMeta.fetch,
    queryKey: getReadNotificationsQueryKeys(user?.uid ?? ""),
    queryFn: ({ pageParam }) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getReadNotificationsPage(user.uid, 15, pageParam);
    },
    initialPageParam: undefined,
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
