import { getFilteredDocuments, getCollectionData } from "@utils/helpers";
import { selectAuthorization } from "@slices/authorization-slice";
import { COLLECTIONS } from "@utils/enums";
import { firestoreApi } from "../api";

export type UserType = {
    avatarUrl: string;
    language: "en" | "pl";
    username: string;
    darkMode: boolean;
    uid: string;
    email: string;
};

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

                if (auth.authUser) return { data: users };
                return { data: users };
            },
            providesTags: ["Users"],
        }),
    }),
});

export const { useGetUsersByUsernameQuery } = usersApi;
