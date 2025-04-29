import { ThemeWrapper, ToastHandler, ToastsContainer } from "@marcin-migdal/m-component-library";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";
import { UserType } from "./app/services/users";
import { ISerializedAuthUser, addToast, selectAuthorization, setAuthUser, setToastHandler } from "./app/slices";
import { fb } from "./firebase/firebase";
import { useAppDispatch, useAppSelector } from "./hooks";
import router from "./pages/routing";
import { defaultThemeHue } from "./utils/constants/theme-hue";
import { COLLECTIONS } from "./utils/enums";
import { getCollectionDocumentById, retryDocumentRequest, toSerializable } from "./utils/helpers";

function App() {
  const dispatch = useAppDispatch();
  const { authUser } = useAppSelector(selectAuthorization);

  const toastRef = useRef<ToastHandler>(null);

  const { t, i18n } = useTranslation("errors");

  useEffect(() => {
    if (toastRef.current) {
      dispatch(setToastHandler(toastRef.current));
    }
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

      try {
        const userResponse = await retryDocumentRequest<UserType>(() =>
          getCollectionDocumentById(COLLECTIONS.USERS, serializedUser.uid)
        );

        if (!userResponse.exists()) {
          throw new Error("Error occurred while loading user profile, please refresh page");
        }

        const userConfig = userResponse.data();

        userConfig.language !== i18n.language && i18n.changeLanguage(userConfig.language);

        dispatch(
          setAuthUser({
            ...serializedUser,
            username: userConfig.username,
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
    <ThemeWrapper
      hue={authUser?.themeColorHue || defaultThemeHue}
      darkMode={authUser?.darkMode === undefined ? true : authUser.darkMode}
    >
      <>
        <ToastsContainer ref={toastRef} transformContent={t} />
        <RouterProvider router={router} />
      </>
    </ThemeWrapper>
  );
}

export default App;
