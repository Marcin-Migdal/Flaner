import { CollectionReference, collection, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { v4 as uuid } from "uuid";

import { fb } from "@firebase/firebase";
import { AuthUserConfigType } from "@slices/authorization-slice";
import { COLLECTIONS } from "@utils/enums";
import { firestoreApi } from "../api";
import { getFriendRequestUid } from "./users-helpers";
import {
    Friendships,
    NotificationType,
    RawFriendRequest,
    ReceivedFriendRequest,
    SearchedUserType,
    SentFriendRequest,
    UserNotification,
    UserType,
} from "./users-types";

import {
    addCollectionDocument,
    deleteCollectionDocument,
    getCollectionData,
    getCollectionDocumentById,
    getCollectionFilteredDocuments,
    getDocumentReference,
} from "@utils/helpers";

export const usersApi = firestoreApi.injectEndpoints({
    endpoints: (build) => ({
        getUsersByUsername: build.query<UserType[], { username: string; currentUserUid: string | undefined }>({
            async queryFn(params) {
                try {
                    const { username, currentUserUid } = params;

                    if (!currentUserUid) throw new Error("Error occurred while loading users");

                    const snap = await getCollectionFilteredDocuments<UserType>(COLLECTIONS.USERS, {
                        username: [
                            { field: "username", condition: ">=", searchValue: username },
                            { field: "username", condition: "<=", searchValue: username + "\uf8ff" },
                        ],
                    });

                    return { data: getCollectionData(snap).filter((users) => users.uid !== currentUserUid) };
                } catch (error) {
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while loading users" };
                }
            },
            providesTags: ["Users"],
        }),
        getSearchUsers: build.query<SearchedUserType[], { username: string; currentUserUid: string | undefined }>({
            async queryFn(params) {
                try {
                    const { username, currentUserUid } = params;

                    if (!currentUserUid) throw new Error("Error occurred while loading users");

                    const usersSnapshot = await getCollectionFilteredDocuments<UserType>(COLLECTIONS.USERS, {
                        username: [
                            { field: "username", condition: ">=", searchValue: username },
                            { field: "username", condition: "<=", searchValue: username + "\uf8ff" },
                        ],
                    });

                    const users = getCollectionData(usersSnapshot).filter((users) => users.uid !== currentUserUid);

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
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while loading users" };
                }
            },
            providesTags: ["Users"],
        }),
        sendFriendRequest: build.mutation<null, { senderUid: string; receiverUid: string }>({
            async queryFn(params) {
                try {
                    const { senderUid, receiverUid } = params;

                    if (!senderUid) throw new Error("Error occurred while sending friend requests");

                    const friendRequestUid = getFriendRequestUid(senderUid, receiverUid);

                    const payload: RawFriendRequest = {
                        id: friendRequestUid,
                        senderRef: getDocumentReference<UserType>(COLLECTIONS.USERS, senderUid),
                        receiverRef: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
                        status: "pending",
                        sentAt: new Date().getTime(),
                    };

                    // TODO! catch does not work
                    addCollectionDocument(COLLECTIONS.FRIEND_REQUEST, friendRequestUid, payload);

                    return { data: null };
                } catch (error) {
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while sending friend request" };
                }
            },
            invalidatesTags: ["Friend_Requests", "Users"],
        }),
        getSentFriendRequestQuery: build.query<SentFriendRequest[], string | undefined>({
            async queryFn(senderUid) {
                try {
                    if (!senderUid) throw new Error("Error occurred while loading friend requests");

                    const sentFriendRequestsSnap = await getCollectionFilteredDocuments<RawFriendRequest>(COLLECTIONS.FRIEND_REQUEST, {
                        senderUid: [
                            {
                                field: "senderRef",
                                condition: "==",
                                searchValue: getDocumentReference<UserType>(COLLECTIONS.USERS, senderUid),
                            },
                        ],
                    });

                    const sentFriendRequestsWithUserData: SentFriendRequest[] = [];

                    await Promise.all(
                        getCollectionData(sentFriendRequestsSnap).map(async (request) => {
                            const userSnap = await getDoc(request.receiverRef);

                            if (!userSnap.exists()) throw new Error("Error occurred while loading friend requests");

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
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while loading friend requests" };
                }
            },
            providesTags: ["Friend_Requests"],
        }),
        getReceivedFriendRequestQuery: build.query<ReceivedFriendRequest[], string | undefined>({
            async queryFn(receiverUid) {
                try {
                    if (!receiverUid) throw new Error("Error occurred while loading friend requests");

                    const receivedFriendRequestsSnap = await getCollectionFilteredDocuments<RawFriendRequest>(COLLECTIONS.FRIEND_REQUEST, {
                        senderUid: [
                            {
                                field: "receiverRef",
                                condition: "==",
                                searchValue: getDocumentReference<UserType>(COLLECTIONS.USERS, receiverUid),
                            },
                        ],
                    });

                    const receivedFriendRequestsWithUserData: ReceivedFriendRequest[] = [];

                    await Promise.all(
                        getCollectionData(receivedFriendRequestsSnap).map(async (request) => {
                            const userSnap = await getDoc(request.senderRef);

                            if (!userSnap.exists()) throw new Error("Error occurred while loading friend requests");

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
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while loading friend requests" };
                }
            },
            providesTags: ["Friend_Requests"],
        }),
        getFriendsByUsername: build.query<UserType[], { currentUserUid: string | undefined; username: string }>({
            async queryFn(params) {
                try {
                    const { currentUserUid, username } = params;

                    if (!currentUserUid) throw new Error("Error occurred while loading friends");

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

                            if (!userSnap.exists()) throw new Error("Error occurred while loading friends");

                            userFriends.push(userSnap.data());
                        })
                    );

                    return { data: userFriends };
                } catch (error) {
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while loading friends" };
                }
            },
            providesTags: ["Friends"],
        }),
        confirmFriendRequest: build.mutation<null, { friendRequest: ReceivedFriendRequest; currentUser: AuthUserConfigType }>({
            async queryFn(params) {
                try {
                    const { friendRequest, currentUser } = params;

                    const { uid: senderUid, username: senderUsername } = friendRequest.senderUser;
                    const { uid: receiverUid, displayName: receiverUsername } = currentUser;

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

                    const addNotificationPayload: UserNotification = {
                        type: NotificationType.FRIEND_REQUEST_ACCEPT,
                        createdAt: new Date().getTime(),
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

                    batch.set(doc(fb.firestore, COLLECTIONS.USERS, senderUid, COLLECTIONS.NOTIFICATIONS, uuid()), addNotificationPayload);

                    batch.delete(doc(fb.firestore, COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(senderUid, receiverUid)));
                    batch.delete(doc(fb.firestore, COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(receiverUid, senderUid)));

                    await batch.commit();

                    return { data: null };
                } catch (error) {
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while confirming friend request" };
                }
            },
            invalidatesTags: ["Friend_Requests", "Friends", "Users"],
        }),
        declineFriendRequest: build.mutation<null, { friendRequest: ReceivedFriendRequest; currentUserUid: string }>({
            async queryFn(params) {
                try {
                    const { friendRequest, currentUserUid } = params;
                    const senderUid = friendRequest.senderUser.uid;

                    // TODO! does catch work?
                    await deleteCollectionDocument(COLLECTIONS.FRIEND_REQUEST, getFriendRequestUid(senderUid, currentUserUid));

                    return { data: null };
                } catch (error) {
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while declining friend request" };
                }
            },
            invalidatesTags: ["Friend_Requests", "Users"],
        }),
        deleteFriend: build.mutation<null, { friend: UserType; currentUser: AuthUserConfigType }>({
            async queryFn(params) {
                try {
                    const { friend, currentUser } = params;
                    const batch = writeBatch(fb.firestore);

                    batch.delete(doc(fb.firestore, COLLECTIONS.USERS, currentUser.uid, COLLECTIONS.FRIENDSHIPS, friend.uid));
                    batch.delete(doc(fb.firestore, COLLECTIONS.USERS, friend.uid, COLLECTIONS.FRIENDSHIPS, currentUser.uid));

                    await batch.commit();

                    return { data: null };
                } catch (error) {
                    if (error instanceof Error) return { error: error.message };
                    return { error: "Error occurred while deleting a friend" };
                }
            },
            invalidatesTags: ["Friends", "Users"],
        }),
    }),
});

export const {
    useGetUsersByUsernameQuery,
    useGetSearchUsersQuery,
    useSendFriendRequestMutation,
    useGetSentFriendRequestQueryQuery,
    useGetReceivedFriendRequestQueryQuery,
    useGetFriendsByUsernameQuery,
    useConfirmFriendRequestMutation,
    useDeclineFriendRequestMutation,
    useDeleteFriendMutation,
} = usersApi;
