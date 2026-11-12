import { useAuth } from "@flaner/shared/context";
import { requireUser } from "@flaner/shared/hooks";
import { type AppInfiniteQueryOptions, type FirestorePageParam } from "@flaner/shared/types";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getReadNotificationsPage, type AppNotification } from "../../../../api/notifications";
import { reactQueryMeta } from "@flaner/shared/constants";
import { notificationKeys } from "../../queryKeys";

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
    queryKey: notificationKeys.read(user?.uid ?? ""),
    queryFn: ({ pageParam }) => getReadNotificationsPage(requireUser(user).uid, 15, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};
