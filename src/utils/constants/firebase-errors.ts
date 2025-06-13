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
    message: "auth.errors.invalidCredentials",
    fieldNames: ["email", "password"],
  },
  [FlanerApiErrorsContentKeys.AUTH_USERNAME_ALREADY_IN_USE]: {
    message: "auth.errors.usernameInUse",
    fieldNames: ["username"],
  },
  [FlanerApiErrorsContentKeys.AUTH_EMAIL_ALREADY_IN_USE]: {
    message: "auth.errors.emailInUse",
    fieldNames: ["email"],
  },
  [FlanerApiErrorsContentKeys.AUTH_TOO_MANY_REQUESTS]: {
    message: "auth.errors.tooManyAttempts",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_IN_FAILED]: {
    message: "errors.tryAgain",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_UP_FAILED]: {
    message: "errors.tryAgain",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_IN_WITH_GOOGLE_FAILED]: {
    message: "errors.tryAgain",
  },
  [FlanerApiErrorsContentKeys.AUTH_SIGN_OUT_FAILED]: {
    message: "errors.tryAgain",
  },

  [FlanerApiErrorsContentKeys.USER_CURRENT_USER_UNAVAILABLE]: {
    message: "errors.refreshPage",
  },
  [FlanerApiErrorsContentKeys.USER_FAILED_TO_LOAD_PROFILE]: {
    message: "errors.refreshPage",
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
    message: "friends.errors.sendingRequest",
  },
  [FlanerApiErrorsContentKeys.CONFIRM_FRIEND_REQUEST_ERROR]: {
    message: "friends.errors.confirmingRequest",
  },
  [FlanerApiErrorsContentKeys.DECLINE_FRIEND_REQUEST_ERROR]: {
    message: "friends.errors.decliningRequest",
  },

  [FlanerApiErrorsContentKeys.MARK_NOTIFICATION_AS_READ_ERROR]: {
    message: "errors.notifications.markingAsRead",
  },

  [FlanerApiErrorsContentKeys.UNKNOWN_ERROR_OCCURRED]: {
    message: "errors.tryAgain",
  },
};
