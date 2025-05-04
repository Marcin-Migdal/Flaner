import { ThemeWrapper, ToastHandler, ToastsContainer } from "@marcin-migdal/m-component-library";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@hooks";
import { SerializedAuthUser } from "@services/Authorization";
import { UserType } from "@services/Users";
import { addToast, selectAuthorization, setAuthUser, setToastHandler } from "@slices";

import { FlanerApiError } from "@utils/error-classes";
import { fb } from "./firebase/firebase";
import router from "./pages/routing";
import { defaultThemeHue, flanerApiErrorsContent, FlanerApiErrorsContentKeys } from "./utils/constants";
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

      // Serializing signed-in user object, before saving it in redux store
      const serializedUser = toSerializable<SerializedAuthUser>(user);

      try {
        const userResponse = await retryDocumentRequest<UserType>(() =>
          getCollectionDocumentById(COLLECTIONS.USERS, serializedUser.uid)
        );

        if (!userResponse.exists()) {
          throw new FlanerApiError(FlanerApiErrorsContentKeys.USER_FAILED_TO_LOAD_PROFILE);
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
        if (error instanceof FlanerApiError) {
          dispatch(
            addToast({
              type: "failure",
              message: flanerApiErrorsContent[error.code as FlanerApiErrorsContentKeys].message,
            })
          );
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
