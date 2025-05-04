export enum FlanerApiErrorsContentKeys {
  AUTH_INVALID_CREDENTIAL = "auth/invalid-credential",
  AUTH_USERNAME_ALREADY_IN_USE = "auth/username-already-in-use",
  AUTH_EMAIL_ALREADY_IN_USE = "auth/email-already-in-use",
  AUTH_TOO_MANY_REQUESTS = "auth/too-many-requests",
  AUTH_SIGN_IN_FAILED = "auth/sign-in-failed",
  AUTH_SIGN_UP_FAILED = "auth/sign-up-failed",
  AUTH_SIGN_OUT_FAILED = "auth/sign-out-failed",
  AUTH_SIGN_IN_WITH_GOOGLE_FAILED = "auth/sign-in-with-google-failed",

  USER_CURRENT_USER_UNAVAILABLE = "user/current-user-unavailable",
  USER_FAILED_TO_LOAD_PROFILE = "user/failed-to-load-profile",

  ENTITY_ALREADY_EXIST = "entity/already-exists",
  ENTITY_UNKNOWN_FETCH_ERROR = "entity/unknown-fetch-error",
  ENTITY_UNKNOWN_ADD_ERROR = "entity/unknown-add-error",
  ENTITY_UNKNOWN_EDIT_ERROR = "entity/unknown-edit-error",
  ENTITY_UNKNOWN_DELETE_ERROR = "entity/unknown-delete-error",

  SEND_FRIEND_REQUEST_ERROR = "friend-request/send-request-error",
  CONFIRM_FRIEND_REQUEST_ERROR = "friend-request/confirm-request-error",
  DECLINE_FRIEND_REQUEST_ERROR = "friend-request/decline-request-error",

  MARK_NOTIFICATION_AS_READ_ERROR = "notifications/marks-as-read",

  UNKNOWN_ERROR_OCCURRED = "unknown-error-occurred",
}

export type FlanerApiErrorContent = {
  message: string;
  fieldNames?: string[];
};

export const ENTITY_TEXT_INJECTION_POINTER = "${entity}";

export const flanerApiErrorsContent = {
  [FlanerApiErrorsContentKeys.AUTH_INVALID_CREDENTIAL]: {
    message: "Invalid credentials",
    fieldNames: ["email", "password"],
  },
  [FlanerApiErrorsContentKeys.AUTH_USERNAME_ALREADY_IN_USE]: {
    message: "Username already in use",
    fieldNames: ["username"],
  },
  [FlanerApiErrorsContentKeys.AUTH_EMAIL_ALREADY_IN_USE]: {
    message: "Email already in use",
    fieldNames: ["email"],
  },
  [FlanerApiErrorsContentKeys.AUTH_TOO_MANY_REQUESTS]: {
    message:
      "Access to this account has been temporarily disabled due to many failed login attempts. You can try again later.",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_IN_FAILED]: {
    message: "Error occurred while signing in",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_UP_FAILED]: {
    message: "Error occurred while signing up",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_IN_WITH_GOOGLE_FAILED]: {
    message: "Error occurred while signing in with Google",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_OUT_FAILED]: {
    message: "Error occurred while signing out",
  },

  [FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE]: {
    message: "User is not available. Please check your internet connection or try again later.",
  },
  [FlanerApiErrorsContentKeys.USER_FAILED_TO_LOAD_PROFILE]: {
    message: "Error occurred while loading user profile, please refresh page",
  },

  [FlanerApiErrorsContentKeys.ENTITY_ALREADY_EXIST]: {
    message: `${ENTITY_TEXT_INJECTION_POINTER} with this name already exists`,
    fieldNames: ["name"],
  },
  [FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_FETCH_ERROR]: {
    message: `Error occurred while fetching ${ENTITY_TEXT_INJECTION_POINTER}`,
  },
  [FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_ADD_ERROR]: {
    message: `Error occurred while adding ${ENTITY_TEXT_INJECTION_POINTER}`,
  },
  [FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_EDIT_ERROR]: {
    message: `Error occurred while editing ${ENTITY_TEXT_INJECTION_POINTER}`,
  },
  [FlanerApiErrorsContentKeys.ENTITY_UNKNOWN_DELETE_ERROR]: {
    message: `Error occurred while deleting ${ENTITY_TEXT_INJECTION_POINTER}`,
  },

  [FlanerApiErrorsContentKeys.SEND_FRIEND_REQUEST_ERROR]: {
    message: "Error has occurred while sending friend request",
  },
  [FlanerApiErrorsContentKeys.CONFIRM_FRIEND_REQUEST_ERROR]: {
    message: "Error has occurred while confirming friend request",
  },
  [FlanerApiErrorsContentKeys.DECLINE_FRIEND_REQUEST_ERROR]: {
    message: "Error has occurred while declining friend request",
  },

  [FlanerApiErrorsContentKeys.MARK_NOTIFICATION_AS_READ_ERROR]: {
    message: "Error has occurred when marking notifications as read",
  },

  [FlanerApiErrorsContentKeys.UNKNOWN_ERROR_OCCURRED]: {
    message: "Error has occurred, please try again",
  },
};
