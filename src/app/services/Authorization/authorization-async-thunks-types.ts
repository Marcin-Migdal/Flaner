import { LanguageType } from "@i18n";
import { SignInState, SignUpState } from "@utils/formik-configs";

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

export type SerializedAuthUser = {
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

export type EmailSignInPayload = SignInState;

export type EmailSignUpPayload = SignUpState & {
  language: LanguageType;
};

export type GoogleSignInPayload = {
  language: LanguageType;
};
