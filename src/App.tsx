import { ToastHandler, ToastsContainer } from "@Marcin-Migdal/morti-component-library";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";

import { fb } from "@firebase/firebase";
import { useAppDispatch } from "@hooks/redux-hooks";
import router from "@pages/routing";
import { UserType } from "@services/users";
import { ISerializedAuthUser, addToast, setAuthUser, setToastHandler } from "@slices/index";
import { COLLECTIONS } from "@utils/enums";
import { getCollectionDocumentById, retryDocumentRequest, toSerializable } from "@utils/helpers";

function App() {
    const dispatch = useAppDispatch();

    const toastRef = useRef<ToastHandler>(null);

    const { t } = useTranslation("errors");

    useEffect(() => {
        if (toastRef.current) dispatch(setToastHandler(toastRef.current));
    }, []);

    useEffect(() => {
        const unSubscribe = onAuthStateChanged(fb.auth.auth, async (user) => {
            if (!user) {
                dispatch(setAuthUser(null));
                return;
            }

            if (!user.emailVerified) {
                return;
            }

            // Serializing signed-in user object, before sending it to the reducer
            const serializedUser = toSerializable<ISerializedAuthUser>(user);
            const { photoURL, ...otherProperties } = serializedUser;

            try {
                const userResponse = await retryDocumentRequest<UserType>(() =>
                    getCollectionDocumentById(COLLECTIONS.USERS, serializedUser.uid)
                );

                if (!userResponse.exists()) throw new Error("Error occurred while loading user profile, please refresh page");

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

    return (
        <>
            <ToastsContainer ref={toastRef} transformContent={t} />
            <RouterProvider router={router} />
        </>
    );
}

export default App;
