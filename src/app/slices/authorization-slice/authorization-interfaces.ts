import { FormErrorsType } from "@marcin-migdal/m-component-library";
import { TFunction } from "i18next";

import { ISignInState } from "@pages/SignIn/sign-in-formik-config";
import { ISignUpState } from "@pages/SignUp/sign-up-formik-config";
import { LanguageType } from "i18n";

interface ProviderData {
  providerId: string;
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: any;
  photoURL: string;
}

interface StsTokenManager {
  refreshToken: string;
  accessToken: string;
  expirationTime: number;
}

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
export interface IAuthUserInitialState {
  authUser: AuthUserConfigType | null;
  isLoading: boolean;
  authFormErrors: FormErrorsType<ISignInState | ISignUpState>;
}

//! AsyncThunks payloads
//* SIGN IN
export type EmailSignInPayload = ISignInState;

//* SIGN UP
export type EmailSignUpPayload = ISignUpState & {
  language: LanguageType;
};

//* GOOGLE SIGN IN
export type GoogleSignInPayload = {
  language: LanguageType;
};

//! AsyncThunks error payload
export type IFirebaseError<T = unknown> = { code: string; message: string; formErrors: FormErrorsType<T> | {} };

//? Additional types
export type TranslateFunctionType = TFunction<[string, string], undefined>;
