import { FormErrorsType } from "@Marcin-Migdal/morti-component-library";
import { TFunction } from "i18next";

import { ISignUpState } from "@pages/SignUp/sign-up-formik-config";
import { ISignInState } from "@pages/SignIn/sign-in-formik-config";

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
export interface IUser {
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
}

//* Authorization user type
export type UserType = IUser | null;

//! Slice init state
export interface IAuthUserInitialState {
    authUser: UserType;
    isLoading: boolean;
    authFormErrors: FormErrorsType<ISignInState | ISignUpState>;
}

//! AsyncThunks payloads
//* SIGN IN
export type EmailSignInPayload = ISignInState & {
    t: TranslateFunctionType;
};

//* SIGN UP
export type EmailSignUpPayload = ISignUpState & {
    language: LanguageTypes;
    t: TranslateFunctionType;
};

//* SIGN OUT
export type SignOutPayload = {
    language: LanguageTypes;
    t: TranslateFunctionType;
};

//* GOOGLE SIGN IN
export type GoogleSignInPayload = {
    language: LanguageTypes;
    t: TranslateFunctionType;
};

//! AsyncThunks error payload
export type IFirebaseError<T = unknown> = { code: string; message: string; formErrors: FormErrorsType<T> | {} };

//? Additional types
export type TranslateFunctionType = TFunction<[string, string], undefined>;
type LanguageTypes = "pl" | "en";
