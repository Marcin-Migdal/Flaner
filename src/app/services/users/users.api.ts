import { selectAuthorization } from "@slices/authorization-slice";
import { COLLECTIONS } from "@utils/enums";
import { getCollectionData, getFilteredDocuments, setDocumentSnapshot } from "@utils/helpers";
import { firestoreApi } from "../api";
import { UserType } from "./users.types";

export const usersApi = firestoreApi.injectEndpoints({
    endpoints: (build) => ({
        getUsersByUsername: build.query<UserType[], string>({
            async queryFn(username, api) {
                const auth = selectAuthorization(api.getState() as any);

                const snap = await getFilteredDocuments(COLLECTIONS.USERS, {
                    username: [
                        { field: "username", condition: ">=", searchValue: username },
                        { field: "username", condition: "<=", searchValue: username + "\uf8ff" },
                    ],
                });

                const users = getCollectionData<UserType>(snap);

                if (auth.authUser) return { data: users.filter((users) => users.uid !== auth.authUser?.uid) };
                return { data: users };
            },
            providesTags: ["Users"],
        }),
        sendFriendRequest: build.mutation<null, { currentUserUid: string; userUid: string }>({
            async queryFn(params) {
                const { currentUserUid, userUid } = params;

                if (!currentUserUid) return { error: "Current user does not exist" };

                const friendRequestUid: string = `${currentUserUid}_${userUid}`;

                setDocumentSnapshot(COLLECTIONS.FRIEND_REQUEST, friendRequestUid, {
                    senderUid: currentUserUid,
                    receiverUid: userUid,
                    status: "pending",
                });

                return { data: null };
            },
            invalidatesTags: ["Users"],
        }),
        getSentFriendRequestQuery: build.query<UserType[], string | undefined>({
            async queryFn(currentUserUid) {
                if (!currentUserUid) return { error: "Current user does not exist" };

                const snap = await getFilteredDocuments(COLLECTIONS.FRIEND_REQUEST, {
                    senderUid: [{ field: "senderUid", condition: "==", searchValue: currentUserUid }],
                });

                const friendRequests = getCollectionData<any>(snap);
                return { data: friendRequests };
            },
            providesTags: ["Friend_Requests"],
        }),
    }),
});

export const { useGetUsersByUsernameQuery, useSendFriendRequestMutation, useGetSentFriendRequestQueryQuery } = usersApi;
