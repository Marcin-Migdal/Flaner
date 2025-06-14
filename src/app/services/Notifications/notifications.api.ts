import { collection, CollectionReference, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";

import { COLLECTIONS } from "@utils/enums";
import { getCollectionDataWithId, getRtkTags } from "@utils/helpers";

import { getRtkError } from "@services/helpers";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { FlanerApiError } from "@utils/error-classes";
import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";
import { Notification, NotificationType, RawNotification } from "./notifications.types";

export const notificationsApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getUnreadNotificationsCount: build.query<number, { currentUserUid: string | undefined }>({
      async queryFn({ currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const userNotificationsSnapshot = await getDocs(
            query(
              collection(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.NOTIFICATIONS),
              where("read", "==", false)
            ) as CollectionReference<RawNotification, RawNotification>
          );

          return { data: userNotificationsSnapshot.size };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            "notifications count"
          );
          return getRtkError(error, fallbackError);
        }
      },
      providesTags: ["Unread-Notifications-Count"],
    }),
    getUnreadNotifications: build.query<Notification[], { currentUserUid: string | undefined }>({
      async queryFn({ currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const unreadNotificationsSnapshot = await getDocs(
            query(
              collection(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.NOTIFICATIONS),
              where("read", "==", false)
            ) as CollectionReference<RawNotification, RawNotification>
          );

          const notifications: Notification[] = [];

          await Promise.all(
            getCollectionDataWithId(unreadNotificationsSnapshot).map(async (notification) => {
              switch (notification.type) {
                case NotificationType.FRIEND_REQUEST_ACCEPT: {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { userRef, ...otherNotificationProperties } = notification;
                  const userSnap = await getDoc(notification.userRef);

                  if (!userSnap.exists()) {
                    throw new FlanerApiError(
                      FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
                      "unread notifications"
                    );
                  }

                  const { avatarUrl, uid, username } = userSnap.data();

                  notifications.push({
                    ...otherNotificationProperties,
                    receivedFrom: { avatarUrl, uid, name: username },
                  });

                  break;
                }
                default:
                  notifications.push(notification);
                  break;
              }
            })
          );

          return { data: notifications };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            "unread notifications"
          );
          return getRtkError(error, fallbackError);
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Unread-Notifications"),
    }),
    getAllNotifications: build.query<Notification[], { currentUserUid: string | undefined }>({
      async queryFn({ currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const allNotificationsSnapshot = await getDocs(
            query(
              collection(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.NOTIFICATIONS)
            ) as CollectionReference<RawNotification, RawNotification>
          );

          const notifications: Notification[] = [];

          await Promise.all(
            getCollectionDataWithId(allNotificationsSnapshot).map(async (notification) => {
              switch (notification.type) {
                case NotificationType.FRIEND_REQUEST_ACCEPT: {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { userRef, ...otherNotificationProperties } = notification;
                  const userSnap = await getDoc(notification.userRef);

                  if (!userSnap.exists()) {
                    throw new FlanerApiError(
                      FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
                      "all notifications"
                    );
                  }

                  const { avatarUrl, uid, username } = userSnap.data();

                  notifications.push({
                    ...otherNotificationProperties,
                    receivedFrom: { avatarUrl, uid, name: username },
                  });

                  break;
                }
                default:
                  notifications.push(notification);
                  break;
              }
            })
          );

          return { data: notifications };
        } catch (error) {
          const fallbackError = new FlanerApiError(
            FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            "all notifications"
          );
          return getRtkError(error, fallbackError);
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "All-Notifications"),
    }),
    updateReadNotification: build.mutation<null, { currentUserUid: string }>({
      async queryFn({ currentUserUid }) {
        try {
          const unreadNotificationsSnapshot = await getDocs(
            query(
              collection(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.NOTIFICATIONS),
              where("read", "==", false)
            ) as CollectionReference<RawNotification, RawNotification>
          );

          const batch = writeBatch(fb.firestore);

          getCollectionDataWithId(unreadNotificationsSnapshot).forEach(({ id, ...otherProperties }) => {
            batch.update(doc(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.NOTIFICATIONS, id), {
              ...otherProperties,
              read: true,
            });
          });

          await batch.commit();

          return { data: null };
        } catch (error) {
          const fallbackError = new FlanerApiError(FlanerApiErrorsContentKeys.MARK_NOTIFICATION_AS_READ_ERROR);
          return getRtkError(error, fallbackError);
        }
      },
      invalidatesTags: (_result, error) => {
        if (error) {
          return [];
        }
        return ["Unread-Notifications-Count", { type: "Unread-Notifications", id: "List" }];
      },
    }),
  }),
});

export const {
  useGetUnreadNotificationsCountQuery,
  useGetUnreadNotificationsQuery,
  useGetAllNotificationsQuery,
  useUpdateReadNotificationMutation,
} = notificationsApi;
