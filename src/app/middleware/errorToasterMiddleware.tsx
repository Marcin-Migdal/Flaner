import { Middleware, isRejectedWithValue } from "@reduxjs/toolkit";

import { FirebaseApiError } from "@services/Authorization";
import { addToast } from "@slices/toast-slice";
import { ErrorObjKeys, errorsObj } from "@utils/constants/firebase-errors";
import { getRejectValue } from "@utils/helpers";

export const errorIntersectMiddleware: Middleware = (api) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload;

    let error: FirebaseApiError<unknown> = {
      message: errorsObj[ErrorObjKeys.UNKNOWN_ERROR_OCCURRED].message,
      formErrors: {},
    };

    if (typeof payload === "object" && payload !== null) {
      if ("code" in payload && typeof payload.code === "string") {
        error = getRejectValue(payload.code);
      } else if ("message" in payload && typeof payload.message === "string") {
        error.message = payload.message;
      }
    }

    api.dispatch(addToast({ type: "failure", message: error.message }));

    return next({ ...action, payload: error });
  }

  return next(action);
};
