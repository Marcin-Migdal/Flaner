export enum ErrorObjKeys {
  AUTH_INVALID_CREDENTIAL = "auth/invalid-credential",
  AUTH_USERNAME_ALREADY_IN_USE = "auth/username-already-in-use",
  AUTH_EMAIL_ALREADY_IN_USE = "auth/email-already-in-use",
  AUTH_TOO_MANY_REQUESTS = "auth/too-many-requests",

  USER_CURRENT_USER_UNAVAILABLE = "user/current-user-unavailable",

  UNKNOWN_ERROR_OCCURRED = "unknown_error-occurred",
}

export type IError = {
  message: string;
  fieldNames?: string | string[];
};

export const errorsObj: Record<ErrorObjKeys, IError> = {
  [ErrorObjKeys.AUTH_INVALID_CREDENTIAL]: {
    message: "Invalid credentials",
    fieldNames: ["email", "password"],
  },
  [ErrorObjKeys.AUTH_USERNAME_ALREADY_IN_USE]: {
    message: "Username already in use",
    fieldNames: "username",
  },
  [ErrorObjKeys.AUTH_EMAIL_ALREADY_IN_USE]: {
    message: "Email already in use",
    fieldNames: "email",
  },
  [ErrorObjKeys.AUTH_TOO_MANY_REQUESTS]: {
    message:
      "Access to this account has been temporarily disabled due to many failed login attempts. You can try again later.",
  },

  [ErrorObjKeys.USER_CURRENT_USER_UNAVAILABLE]: {
    message: "User is not available. Please check your internet connection or try again later.",
  },

  [ErrorObjKeys.UNKNOWN_ERROR_OCCURRED]: {
    message: "Error has occurred, please try again",
  },
};
