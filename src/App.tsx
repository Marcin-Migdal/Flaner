import { ThemeWrapper, ToastHandler, ToastsContainer } from "@marcin-migdal/m-component-library";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";

import { fb } from "@firebase/firebase";
import { useAppDispatch, useAppSelector } from "@hooks/redux-hooks";
import router from "@pages/routing";
import { UserType } from "@services/users";
import { ISerializedAuthUser, addToast, selectAuthorization, setAuthUser, setToastHandler } from "@slices/index";
import { defaultThemeHue } from "@utils/constants/theme-hue";
import { COLLECTIONS } from "@utils/enums";
import { getCollectionDocumentById, retryDocumentRequest, toSerializable } from "@utils/helpers";

//! fix scss variables
//! test sign in, sign up and sign out
//! is toast and alert working properly

//! rest of the pages (details will be planned when I will come to this point)

//! implement hot fix on library side
//! implement library fixes on flaner side

function App() {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const toastRef = useRef<ToastHandler>(null);

  const { t, i18n } = useTranslation("errors");

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

        userConfig.language !== i18n.language && i18n.changeLanguage(userConfig.language);

        dispatch(
          setAuthUser({
            ...otherProperties,
            avatarUrl: userConfig.avatarUrl,
            language: userConfig.language,
            darkMode: userConfig.darkMode,
            themeColorHue: userConfig.themeColorHue,
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
    <ThemeWrapper hue={authUser?.themeColorHue || defaultThemeHue} darkMode>
      <>
        <ToastsContainer ref={toastRef} transformToastsContent={t} />
        <RouterProvider router={router} />
      </>
    </ThemeWrapper>
  );
}

export default App;
