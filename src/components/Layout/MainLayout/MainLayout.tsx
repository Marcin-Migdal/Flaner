import { onAuthStateChanged } from "firebase/auth";
import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { fb } from "@firebase/firebase";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import { UserType } from "@services/users";
import { ISerializedAuthUser, selectAuthorization, setAuthUser } from "@slices/authorization-slice";
import { addToast } from "@slices/toast-slice";
import { COLLECTIONS, PATH_CONSTRANTS } from "@utils/enums";
import { getCollectionDocumentById, toSerializable } from "@utils/helpers";
import { SpinnerPlaceholder } from "../../placeholders";
import { Header } from "./components/Header/Header";

export default function MainLayout() {
    const navigate = useNavigate();

    const { isLoading, authUser } = useAppSelector(selectAuthorization);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const unSubscribe = onAuthStateChanged(fb.auth.auth, async (user) => {
            if (!user) {
                dispatch(setAuthUser(null));
                return;
            }

            //Serializing signed in user object, before sending it to the reducer
            const serializedUser = toSerializable<ISerializedAuthUser>(user);
            const { photoURL, ...otherProperties } = serializedUser;

            try {
                const userResponse = await getCollectionDocumentById<UserType>(COLLECTIONS.USERS, serializedUser.uid);

                if (!userResponse.exists()) throw new Error("Error occurred while loading user profile");

                const userConfig = userResponse.data();

                dispatch(
                    setAuthUser({
                        ...otherProperties,
                        avatarUrl: userConfig?.avatarUrl || "",
                        language: userConfig?.language || "en",
                        darkMode: userConfig?.darkMode || true,
                    })
                );
            } catch (error) {
                if (error instanceof Error) {
                    dispatch(addToast({ type: "failure", message: error.message }));
                }
            }
        });

        return unSubscribe;
    }, []);

    useEffect(() => {
        // check fetching current users is finished
        if (!isLoading) {
            const pathname = window.location.pathname;

            // if user does not exist, and current page is not one of the auth pages, navigate to sign-in page
            if (authUser === null && pathname !== PATH_CONSTRANTS.SIGN_IN && PATH_CONSTRANTS.SIGN_UP !== pathname) {
                navigate(PATH_CONSTRANTS.SIGN_IN);
            }
            // if user does exist, and current page is one of the auth pages, navigate to home page
            else if (authUser && (PATH_CONSTRANTS.SIGN_IN === pathname || PATH_CONSTRANTS.SIGN_UP === pathname)) {
                navigate(PATH_CONSTRANTS.HOME);
            }
        }
    }, [authUser, isLoading]);

    return (
        <>
            {authUser && <Header />}
            <main style={!authUser ? { height: "100%" } : { height: "calc(100% - var(--header-height))" }}>
                <Suspense fallback={<SpinnerPlaceholder />}>
                    <Outlet />
                </Suspense>
            </main>
        </>
    );
}
