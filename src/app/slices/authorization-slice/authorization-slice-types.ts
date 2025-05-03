import { FormErrors } from "@marcin-migdal/m-component-library";

import { LanguageType } from "@i18n";
import { SerializedAuthUser } from "@services/Authorization";
import { SignInState, SignUpState } from "@utils/formik-configs";

export type AuthUser = Omit<SerializedAuthUser, "photoURL" | "displayName"> & {
  username: string;
  avatarUrl: string;
  darkMode: boolean;
  language: LanguageType;
  themeColorHue: number;
};

export type AuthorizationInitialState = {
  authUser: AuthUser | null;
  isLoading: boolean;
  authFormErrors: FormErrors<SignInState | SignUpState>;
};
