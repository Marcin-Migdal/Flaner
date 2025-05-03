import { doc, getDoc, writeBatch } from "firebase/firestore";
import { v4 as uuid } from "uuid";

import { AuthUser } from "@slices/authorization-slice";
import { COLLECTIONS } from "@utils/enums";

import {
  addCollectionDocument,
  deleteCollectionDocument,
  getCollectionData,
  getCollectionFilteredDocuments,
  getDocumentReference,
  getRtkTags,
} from "@utils/helpers";

import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";
import { NotificationType, RawNotification } from "../Notifications";
import { Friendships, UserType } from "../users";
import { getFriendRequestUid } from "./friendRequests.helpers";
import { RawFriendRequest, ReceivedFriendRequest, SentFriendRequest } from "./friendRequests.types";

//! TODO commit
//! TODO change user api folder to capitalized
//! TODO commit
//! TODO refactor the rest of the endpoints to use the new error handling method
//! TODO check everything is working as expected
//! TODO commit & push
//! TODO check for "@/" imports

export const friendRequestsApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    sendFriendRequest: build.mutation<null, { senderUid: string; receiverUid: string }>({
      async queryFn(params) {
        try {
          const { senderUid, receiverUid } = params;

          if (!senderUid) {
            throw new Error("Error occurred while sending friend requests");
          }

          const friendRequestUid = getFriendRequestUid(senderUid, receiverUid);

          const payload: RawFriendRequest = {
            id: friendRequestUid,
            senderRef: getDocumentReference<UserType>(COLLECTIONS.USERS, senderUid),
            receiverRef: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
            status: "pending",
            sentAt: new Date().getTime(),
          };

          await addCollectionDocument(COLLECTIONS.FRIEND_REQUEST, friendRequestUid, payload);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while sending friend request" };
        }
      },
      invalidatesTags: (_result, error, arg) => {
        if (error) {
          return [];
        }
        return [
          { type: "Sent_Friend_Requests", id: "List" },
          { type: "Searched_Users", id: arg.receiverUid },
        ];
      },
    }),
    getSentFriendRequestQuery: build.query<SentFriendRequest[], string | undefined>({
      async queryFn(senderUid) {
        try {
          if (!senderUid) {
            throw new Error("Error occurred while loading friend requests");
          }

          const sentFriendRequestsSnap = await getCollectionFilteredDocuments<RawFriendRequest>(
            COLLECTIONS.FRIEND_REQUEST,
            {
              senderRef: [
                {
                  field: "senderRef",
                  condition: "==",
                  searchValue: getDocumentReference<UserType>(COLLECTIONS.USERS, senderUid),
                },
              ],
            }
          );

          const sentFriendRequestsWithUserData: SentFriendRequest[] = [];

          await Promise.all(
            getCollectionData(sentFriendRequestsSnap).map(async (request) => {
              const userSnap = await getDoc(request.receiverRef);

              if (!userSnap.exists()) {
                throw new Error("Error occurred while loading friend requests");
              }

              sentFriendRequestsWithUserData.push({
                id: request.id,
                status: request.status,
                sentAt: request.sentAt,
                senderUid: request.senderRef.id,
                receiverUser: userSnap.data(),
              });
            })
          );

          return { data: sentFriendRequestsWithUserData };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading friend requests" };
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Sent_Friend_Requests"),
    }),
    getReceivedFriendRequestQuery: build.query<ReceivedFriendRequest[], string | undefined>({
      async queryFn(receiverUid) {
        try {
          if (!receiverUid) {
            throw new Error("Error occurred while loading friend requests");
          }

          const receivedFriendRequestsSnap = await getCollectionFilteredDocuments<RawFriendRequest>(
            COLLECTIONS.FRIEND_REQUEST,
            {
              receiverRef: [
                {
                  field: "receiverRef",
                  condition: "==",
                  searchValue: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
                },
              ],
            }
          );

          const receivedFriendRequestsWithUserData: ReceivedFriendRequest[] = [];

          await Promise.all(
            getCollectionData(receivedFriendRequestsSnap).map(async (request) => {
              const userSnap = await getDoc(request.senderRef);

              if (!userSnap.exists()) {
                throw new Error("Error occurred while loading friend requests");
              }

              receivedFriendRequestsWithUserData.push({
                id: request.id,
                status: request.status,
                sentAt: request.sentAt,
                senderUser: userSnap.data(),
                receiverUid: request.receiverRef.id,
              });
            })
          );

          return { data: receivedFriendRequestsWithUserData };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while loading friend requests" };
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Received_Friend_Requests"),
    }),
    confirmFriendRequest: build.mutation<null, { friendRequest: ReceivedFriendRequest; currentUser: AuthUser }>({
      async queryFn(params) {
        try {
          const { friendRequest, currentUser } = params;

          const { uid: senderUid, username: senderUsername } = friendRequest.senderUser;
          const { uid: receiverUid, username: receiverUsername } = currentUser;

          const addReceiverFriendshipPayload: Friendships = {
            userRef: getDocumentReference<UserType>(COLLECTIONS.USERS, senderUid),
            username: senderUsername,
            createdAt: new Date().getTime(),
          };

          const addSenderFriendshipPayload: Friendships = {
            userRef: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
            username: receiverUsername,
            createdAt: new Date().getTime(),
          };

          const addNotificationPayload: RawNotification = {
            type: NotificationType.FRIEND_REQUEST_ACCEPT,
            createdAt: new Date().getTime(),
            content: `has accepted your friend request`,
            read: false,
            userRef: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
          };

          const batch = writeBatch(fb.firestore);

          batch.set(
            doc(fb.firestore, COLLECTIONS.USERS, receiverUid, COLLECTIONS.FRIENDSHIPS, senderUid),
            addReceiverFriendshipPayload
          );

          batch.set(
            doc(fb.firestore, COLLECTIONS.USERS, senderUid, COLLECTIONS.FRIENDSHIPS, receiverUid),
            addSenderFriendshipPayload
          );

          batch.set(
            doc(fb.firestore, COLLECTIONS.USERS, senderUid, COLLECTIONS.NOTIFICATIONS, uuid()),
            addNotificationPayload
          );

          batch.delete(doc(fb.firestore, COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(senderUid, receiverUid)));
          batch.delete(doc(fb.firestore, COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(receiverUid, senderUid)));

          await batch.commit();

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while confirming friend request" };
        }
      },
      invalidatesTags: (_result, error, arg) => {
        if (error) {
          return [];
        }
        return [
          { type: "Received_Friend_Requests", id: arg.friendRequest.id },
          { type: "Searched_Users", id: arg.friendRequest.senderUser.uid },
          { type: "Friends", id: "List" },
        ];
      },
    }),
    declineFriendRequest: build.mutation<null, { friendRequest: ReceivedFriendRequest; currentUserUid: string }>({
      async queryFn(params) {
        try {
          const { friendRequest, currentUserUid } = params;
          const senderUid = friendRequest.senderUser.uid;

          await deleteCollectionDocument(COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(senderUid, currentUserUid));

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while declining friend request" };
        }
      },
      invalidatesTags: (_result, error, arg) => {
        if (error) {
          return [];
        }
        return [{ type: "Received_Friend_Requests", id: arg.friendRequest.id }];
      },
    }),
    deleteFriendRequest: build.mutation<null, SentFriendRequest>({
      async queryFn(request) {
        try {
          await deleteCollectionDocument(COLLECTIONS.FRIEND_REQUEST, request.id);

          return { data: null };
        } catch (error) {
          if (error instanceof Error) {
            return { error: error.message };
          }
          return { error: "Error occurred while deleting a friend request" };
        }
      },
      invalidatesTags: (_result, error, arg) => {
        if (error) {
          return [];
        }
        return [
          { type: "Sent_Friend_Requests", id: arg.id },
          { type: "Searched_Users", id: arg.receiverUser.uid },
        ];
      },
    }),
  }),
});

export const {
  useSendFriendRequestMutation,
  useGetSentFriendRequestQueryQuery,
  useGetReceivedFriendRequestQueryQuery,
  useConfirmFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useDeleteFriendRequestMutation,
} = friendRequestsApi;
