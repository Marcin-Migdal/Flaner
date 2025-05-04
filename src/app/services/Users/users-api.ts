import { collection, CollectionReference, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";

import { AuthUser } from "@slices/authorization-slice";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { COLLECTIONS } from "@utils/enums";
import { FlanerApiError } from "@utils/error-classes";

import {
  editCollectionDocument,
  getCollectionData,
  getCollectionDocumentById,
  getCollectionFilteredDocuments,
  getRtkTags,
} from "@utils/helpers";

import { getRtkError } from "@services/helpers";
import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";
import { getFriendRequestUid, RawFriendRequest } from "../FriendRequests";
import { EditUserRequest, Friendships, SearchedUserType, UserType } from "./users-types";

export const usersApi = firestoreApi.injectEndpoints({
  endpoints: (build) => ({
    getUsersByUsername: build.query<UserType[], { username: string; currentUserUid: string | undefined }>({
      async queryFn({ username, currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const snap = await getCollectionFilteredDocuments<UserType>(COLLECTIONS.USERS, {
            username: [
              { field: "username", condition: ">=", searchValue: username },
              { field: "username", condition: "<=", searchValue: username + "\uf8ff" },
            ],
          });

          return { data: getCollectionData(snap).filter((users) => users.uid !== currentUserUid) };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "users",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "uid", "Searched_Users"),
    }),
    getSearchUsers: build.query<SearchedUserType[], { username: string; currentUserUid: string | undefined }>({
      async queryFn({ username, currentUserUid }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const usersSnapshot = await getCollectionFilteredDocuments<UserType>(COLLECTIONS.USERS, {
            username: [
              { field: "username", condition: ">=", searchValue: username },
              { field: "username", condition: "<=", searchValue: username + "\uf8ff" },
            ],
          });

          const users = getCollectionData(usersSnapshot).filter((user) => user.uid !== currentUserUid);

          const mappedUsers: SearchedUserType[] = [];

          await Promise.all(
            users.map(async (user) => {
              const friendshipSnap = await getDoc(
                doc(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.FRIENDSHIPS, user.uid)
              );

              const friendRequestSnap = await getCollectionDocumentById<RawFriendRequest>(
                COLLECTIONS.FRIEND_REQUEST,
                getFriendRequestUid(currentUserUid, user.uid)
              );

              mappedUsers.push({
                ...user,
                isFriend: friendshipSnap.exists(),
                invited: friendRequestSnap.exists(),
              });
            })
          );

          return { data: mappedUsers };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "users",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "uid", "Searched_Users"),
    }),

    getFriendsByUsername: build.query<UserType[], { currentUserUid: string | undefined; username: string }>({
      async queryFn({ currentUserUid, username }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          const userFriendshipsSnapshot = await getDocs(
            query(
              collection(fb.firestore, COLLECTIONS.USERS, currentUserUid, COLLECTIONS.FRIENDSHIPS),
              where("username", ">=", username),
              where("username", "<=", username + "\uf8ff")
            ) as CollectionReference<Friendships, Friendships>
          );

          const userFriends: UserType[] = [];

          await Promise.all(
            getCollectionData(userFriendshipsSnapshot).map(async (friendship) => {
              const userSnap = await getDoc(friendship.userRef);

              if (!userSnap.exists()) {
                throw new FlanerApiError(FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR, "friends");
              }

              userFriends.push(userSnap.data());
            })
          );

          return { data: userFriends };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR,
            entity: "friends",
          });
        }
      },
      providesTags: (result) => getRtkTags(result, "uid", "Friends"),
    }),

    deleteFriend: build.mutation<null, { friend: UserType; currentUser: AuthUser }>({
      async queryFn({ friend, currentUser }) {
        try {
          const batch = writeBatch(fb.firestore);

          batch.delete(doc(fb.firestore, COLLECTIONS.USERS, currentUser.uid, COLLECTIONS.FRIENDSHIPS, friend.uid));
          batch.delete(doc(fb.firestore, COLLECTIONS.USERS, friend.uid, COLLECTIONS.FRIENDSHIPS, currentUser.uid));

          await batch.commit();

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR,
            entity: "friend",
          });
        }
      },
      invalidatesTags: (_result, error, arg) => {
        if (error) {
          return [];
        }
        return [
          { type: "Friends", id: arg.friend.uid },
          { type: "Searched_Users", id: arg.friend.uid },
        ];
      },
    }),

    editUser: build.mutation<null, EditUserRequest>({
      async queryFn({ currentUserUid, ...payload }) {
        try {
          if (!currentUserUid) {
            throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE);
          }

          await editCollectionDocument(COLLECTIONS.USERS, currentUserUid, payload);

          return { data: null };
        } catch (error) {
          return getRtkError(error, {
            code: FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_EDIT_ERROR,
            entity: "friend",
          });
        }
      },
      invalidatesTags: (_result, error) => {
        if (error) {
          return [];
        }
        return [];
      },
    }),
  }),
});

export const {
  useGetUsersByUsernameQuery,
  useGetSearchUsersQuery,
  useGetFriendsByUsernameQuery,
  useDeleteFriendMutation,
  useEditUserMutation,
} = usersApi;
