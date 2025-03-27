import { FormErrorsType } from "@marcin-migdal/m-component-library";
import { LanguageType } from "i18n";
import { TFunction } from "i18next";

import { SignInState } from "@utils/formik-configs/sign-in-formik-config";
import { SignUpState } from "@utils/formik-configs/sign-up-formik-config";

type ProviderData = {
  providerId: string;
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  photoURL: string;
};

type StsTokenManager = {
  refreshToken: string;
  accessToken: string;
  expirationTime: number;
};

//* Firebase user object, that is serializable
export type ISerializedAuthUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  isAnonymous: boolean;
  photoURL: string;
  providerData: ProviderData[];
  stsTokenManager: StsTokenManager;
  createdAt: string;
  lastLoginAt: string;
  apiKey: string;
  appName: string;
};

//* Authorization user type
export type AuthUserConfigType = Omit<ISerializedAuthUser, "photoURL" | "displayName"> & {
  username: string;
  avatarUrl: string;
  darkMode: boolean;
  language: LanguageType;
  themeColorHue: number;
};

//! Slice init state
export type AuthUserInitialState = {
  authUser: AuthUserConfigType | null;
  isLoading: boolean;
  authFormErrors: FormErrorsType<SignInState | SignUpState>;
};

//! AsyncThunks payloads
//* SIGN IN
export type EmailSignInPayload = SignInState;

//* SIGN UP
export type EmailSignUpPayload = SignUpState & {
  language: LanguageType;
};

//* GOOGLE SIGN IN
export type GoogleSignInPayload = {
  language: LanguageType;
};

//! AsyncThunks error payload
export type FirebaseError<T = unknown> = {
  code: string;
  message: string;
  formErrors: FormErrorsType<T>;
};

//? Additional types
export type TranslateFunctionType = TFunction<[string, string], undefined>;
