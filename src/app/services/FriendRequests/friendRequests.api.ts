import { doc, getDoc, writeBatch } from "firebase/firestore";
import { v4 as uuid } from "uuid";

import { getRtkError } from "@services/helpers";
import { AuthUser } from "@slices/authorization-slice";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { COLLECTIONS } from "@utils/enums";
import { FlanerApiError } from "@utils/error-classes";

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
import { Friendships, UserType } from "../Users";
import { getFriendRequestUid } from "./friendRequests.helpers";
import { RawFriendRequest, ReceivedFriendRequest, SentFriendRequest } from "./friendRequests.types";

export const friendRequestsApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    sendFriendRequest: build.mutation<null, { currentUserUid: string; receiverUid: string }>({
      async queryFn({ currentUserUid, receiverUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const friendRequestUid = getFriendRequestUid(currentUserUid, receiverUid);

          const payload: RawFriendRequest = {
            id: friendRequestUid,
            senderRef: getDocumentReference<UserType>(COLLECTIONS.USERS, currentUserUid),
            receiverRef: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
            status: "pending",
            sentAt: new Date().getTime(),
          };

          await addCollectionDocument(COLLECTIONS.FRIEND_REQUEST, friendRequestUid, payload);

          return { data: null };
        } catch (error) {
          return getRtkError(error, { code: FlanerApiErrorsContentKeys.SEND_FRIEND_REQUEST_ERROR });
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
      async queryFn(currentUserUid) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const sentFriendRequestsSnap = await getCollectionFilteredDocuments<RawFriendRequest>(
            COLLECTIONS.FRIEND_REQUEST,
            {
              senderRef: [
                {
                  field: "senderRef",
                  condition: "==",
                  searchValue: getDocumentReference<UserType>(COLLECTIONS.USERS, currentUserUid),
                },
              ],
            }
          );

          const sentFriendRequestsWithUserData: SentFriendRequest[] = [];

          await Promise.all(
            getCollectionData(sentFriendRequestsSnap).map(async (request) => {
              const userSnap = await getDoc(request.receiverRef);

              if (!userSnap.exists()) {
                throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR, "sent friend requests");
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
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "sent friend requests",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Sent_Friend_Requests"),
    }),
    getReceivedFriendRequestQuery: build.query<ReceivedFriendRequest[], string | undefined>({
      async queryFn(currentUserUid) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const receivedFriendRequestsSnap = await getCollectionFilteredDocuments<RawFriendRequest>(
            COLLECTIONS.FRIEND_REQUEST,
            {
              receiverRef: [
                {
                  field: "receiverRef",
                  condition: "==",
                  searchValue: getDocumentReference<UserType>(COLLECTIONS.USERS, currentUserUid),
                },
              ],
            }
          );

          const receivedFriendRequestsWithUserData: ReceivedFriendRequest[] = [];

          await Promise.all(
            getCollectionData(receivedFriendRequestsSnap).map(async (request) => {
              const userSnap = await getDoc(request.senderRef);

              if (!userSnap.exists()) {
                throw new FlanerApiError(
                  FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
                  "received friend requests"
                );
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
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "received friend requests",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "id", "Received_Friend_Requests"),
    }),
    confirmFriendRequest: build.mutation<null, { friendRequest: ReceivedFriendRequest; currentUser: AuthUser }>({
      async queryFn({ friendRequest, currentUser }) {
        try {
          const { uid: senderUid, username: senderUsername } = friendRequest.senderUser;
          const { uid: currentUserUid, username: currentUserName } = currentUser;

          const addReceiverFriendshipPayload: Friendships = {
            userRef: getDocumentReference<UserType>(COLLECTIONS.USERS, senderUid),
            username: senderUsername,
            createdAt: new Date().getTime(),
          };

          const addSenderFriendshipPayload: Friendships = {
            userRef: getDocumentReference<UserType>(COLLECTIONS.USERS, currentUserUid),
            username: currentUserName,
            createdAt: new Date().getTime(),
          };

          const addNotificationPayload: RawNotification = {
            type: NotificationType.FRIEND_REQUEST_ACCEPT,
            createdAt: new Date().getTime(),
            content: `has accepted your friend request`,
            read: false,
            userRef: getDocumentReference<UserType>(COLLECTIONS.USERS, currentUserUid),
          };

          const batch = writeBatch(fb.firestore);

          batch.set(
            doc(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.FRIENDSHIPS, senderUid),
            addReceiverFriendshipPayload
          );

          batch.set(
            doc(fb.firestore, COLLECTIONS.USERS, senderUid, COLLECTIONS.FRIENDSHIPS, currentUserUid),
            addSenderFriendshipPayload
          );

          batch.set(
            doc(fb.firestore, COLLECTIONS.USERS, senderUid, COLLECTIONS.NOTIFICATIONS, uuid()),
            addNotificationPayload
          );

          batch.delete(doc(fb.firestore, COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(senderUid, currentUserUid)));
          batch.delete(doc(fb.firestore, COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(currentUserUid, senderUid)));

          await batch.commit();

          return { data: null };
        } catch (error) {
          return getRtkError(error, { code: FlanerApiErrorsContentKeys.CONFIRM_FRIEND_REQUEST_ERROR });
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
    declineFriendRequest: build.mutation<null, { friendRequest: ReceivedFriendRequest }>({
      async queryFn({ friendRequest }) {
        try {
          await deleteCollectionDocument(COLLECTIONS.FRIEND_REQUEST, friendRequest.id);

          return { data: null };
        } catch (error) {
          return getRtkError(error, { code: FlanerApiErrorsContentKeys.DECLINE_FRIEND_REQUEST_ERROR });
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
      async queryFn(sentFriendRequest) {
        try {
          await deleteCollectionDocument(COLLECTIONS.FRIEND_REQUEST, sentFriendRequest.id);

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR,
            entity: "sent friend request",
          });
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
